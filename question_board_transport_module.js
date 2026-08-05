/**
 * question_board_transport_module.js — the PRODUCTION mailbox transport for a
 * Driving Questions Board.
 *
 * Everything before this was a contract and two test doubles. This is the piece
 * that actually talks to apps_script/session_mailbox/Code.gs, so it is the
 * first code in the feature a student's question can travel through.
 *
 * Three deliberate choices:
 *
 * 1. The network call is INJECTED (`options.call`). The app passes
 *    _alloMailboxCallWithRetry; the tests pass a function that dispatches
 *    straight into a real Code.gs sandbox. That is what lets this module be
 *    verified against the actual server rather than against a mock of it.
 *
 * 2. It returns CONTRACT-shaped boards — `{ config, items }` — not the wire
 *    payload. question_board_view_module.js and the contract's visibleItemsFor
 *    then consume the same shape regardless of which transport produced it,
 *    which is the whole point of the provider contract (spec §10.3).
 *
 * 3. Server error codes are translated to the contract's reasons ONCE, here.
 *    A surface that has to know the mailbox's vocabulary is a surface that
 *    cannot be pointed at Firestore later.
 *
 * The server remains the authority. Nothing here is a permission check: the
 * caps and visibility rules re-derived on the client exist to explain a refusal
 * before it happens, never to grant anything.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AlloModules = root.AlloModules || {};
        root.AlloModules.QuestionBoardTransport = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const VERSION = '1.0.0';

    // Server code → contract reason. Anything unlisted surfaces as 'error',
    // which the UI renders as a generic retry rather than inventing a cause.
    const REASONS = {
        'denied': 'denied',
        'expired': 'expired',
        'item-cap': 'item-cap',
        'board-full': 'board-full',
        'board-bytes': 'board-full',        // a byte-full board IS a full board
        'activity-full': 'participant-cap',
        'bad-term': 'empty-text',
        'no-activity': 'no-board',
        'no-response': 'not-found',
        'not-admin': 'host-only',
        'rate-limited': 'rate-limited',
        'busy': 'busy'
    };

    function reasonFor(code) {
        const key = String(code || '');
        return REASONS[key] || (key ? 'error' : 'error');
    }

    /**
     * The mailbox returns { ok:false, e:'...' } for refusals and THROWS for
     * transport failures. Both are refusals from a caller's point of view, so
     * both become one shape. Swallowing the difference would be wrong — a
     * thrown error keeps `transport: true` so the UI can say "check the
     * connection" instead of "the board is full".
     */
    function refusal(code, transport) {
        return { ok: false, reason: reasonFor(code), code: String(code || ''), transport: !!transport };
    }

    /**
     * Turn a server board summary into the contract's board shape.
     *
     * The server sends a flat visible-item list already filtered for this
     * actor; it does NOT send the held items a peer may not see. That is the
     * mailbox's central advantage over Firestore-on-Canvas (spec §10.4b) and
     * this function must not paper over it by re-adding anything.
     */
    function boardFromSummary(summary) {
        if (!summary || summary.ok === false) return null;
        const items = Array.isArray(summary.items) ? summary.items : [];
        return {
            config: {
                activityId: summary.activityId || '',
                type: 'question_board',
                prompt: summary.prompt || '',
                revealPolicy: summary.revealPolicy || 'auto_publish',
                minParticipants: summary.minParticipants || 3,
                itemsPerStudent: summary.itemsPerStudent || 0,
                boardCap: summary.boardCap || 0,
                expiresAt: summary.expiresAt || ''
            },
            items: items.map(function (it) {
                return {
                    id: String(it.id || ''),
                    uid: String(it.uid || ''),
                    displayName: it.displayName ? String(it.displayName) : '',
                    text: String(it.text || ''),
                    // 'pending' is the mailbox's word for the contract's 'held'.
                    // Translating at the boundary is the adapter's job; the
                    // storage vocabulary must not leak into the view.
                    status: it.status === 'pending' ? 'held' : (it.status || 'held'),
                    answered: it.answered || false,
                    createdAt: it.createdAt || 0
                };
            }),
            version: summary.version || 0,
            updatedAt: summary.updatedAt || 0,
            participantCount: summary.participantCount || 0
        };
    }

    /**
     * @param {object} options
     *   call        async (url, payload) => result; throws on transport failure
     *   url         the Apps Script exec URL
     *   packId      PK-... assignment pack
     *   activityId  AC-... board
     *   admin       teacher admin secret (host only; absent for students)
     *   packSecret  the pack key a student needs to join
     *   isTeacher   host or participant
     *   storage     localStorage-like; optional, for credential reuse
     *   displayName the name the student wants on their questions; optional
     */
    function createMailboxTransport(options) {
        const opts = options || {};
        const call = opts.call;
        if (typeof call !== 'function') throw new Error('createMailboxTransport requires options.call');

        const url = String(opts.url || '');
        const packId = String(opts.packId || '');
        const activityId = String(opts.activityId || '');
        const admin = String(opts.admin || '');
        const packSecret = String(opts.packSecret || '');
        const isTeacher = !!opts.isTeacher;
        const storage = opts.storage || null;
        const storageKey = 'allo_question_board_v1:' + packId + ':' + activityId;

        let credential = null;
        let displayName = String(opts.displayName || '').slice(0, 40);

        function readSaved() {
            if (!storage) return null;
            try {
                const saved = JSON.parse(storage.getItem(storageKey) || 'null');
                return (saved && saved.uid && saved.pt) ? saved : null;
            } catch (e) { return null; }
        }

        function remember(next) {
            credential = next;
            if (storage) { try { storage.setItem(storageKey, JSON.stringify(next)); } catch (e) {} }
            return next;
        }

        function forget() {
            credential = null;
            if (storage) { try { storage.removeItem(storageKey); } catch (e) {} }
        }

        /**
         * A participant identity is a pseudonymous uid plus a signed token. It
         * is cached because re-joining on every poll would mint a new uid and
         * orphan the student's own questions — they would stop being able to
         * see their own held items.
         */
        async function ensureCredential() {
            if (isTeacher) return null;
            if (credential && credential.uid && credential.pt) return credential;
            const saved = readSaved();
            if (saved) { credential = saved; return saved; }
            const joined = await call(url, {
                a: 'joinactivity', id: packId, k: packSecret, aid: activityId
            });
            if (!joined || joined.ok === false) {
                const err = new Error('join-failed');
                err.code = String((joined && joined.e) || 'denied');
                throw err;
            }
            return remember({ uid: joined.uid, pt: joined.pt });
        }

        // A stale token survives a pack re-key or a cleared server cache and
        // reads as 'denied'. Re-joining once is the difference between a
        // recoverable hiccup and a student locked out of their own board.
        async function withCredential(build) {
            let cred = await ensureCredential();
            try {
                return await call(url, build(cred));
            } catch (e) {
                if (!String((e && e.code) || '').includes('denied')) throw e;
                forget();
                cred = await ensureCredential();
                return call(url, build(cred));
            }
        }

        return {
            VERSION: VERSION,
            transport: 'mailbox',
            isTeacher: isTeacher,
            get uid() { return isTeacher ? '' : ((credential && credential.uid) || ''); },

            setDisplayName(next) { displayName = String(next || '').slice(0, 40); },

            /** The actor object the contract and both views expect. */
            actor() {
                return isTeacher
                    ? { uid: 'host', role: 'host' }
                    : { uid: (credential && credential.uid) || '', role: 'participant', displayName: displayName };
            },

            /** Current board state, already filtered for whoever is asking. */
            async load() {
                try {
                    let result;
                    if (isTeacher) {
                        result = await call(url, {
                            a: 'getactivityadmin', admin: admin, id: packId, aid: activityId
                        });
                    } else {
                        result = await withCredential(function (cred) {
                            return {
                                a: 'getactivitysummary', id: packId, aid: activityId,
                                uid: cred.uid, pt: cred.pt
                            };
                        });
                    }
                    if (!result || result.ok === false) return refusal((result && result.e) || 'error', false);
                    return { ok: true, board: boardFromSummary(result) };
                } catch (e) {
                    return refusal((e && e.code) || 'unreachable', true);
                }
            },

            /**
             * Post one question. Returns the refreshed board on success, so a
             * caller never has to guess what the server did with it — under
             * teacher_review the item comes back held, and the student sees
             * their own question exactly as the server stored it.
             */
            async addItem(text) {
                if (isTeacher) return { ok: false, reason: 'host-cannot-post', code: '', transport: false };
                const trimmed = String(text || '').trim();
                if (!trimmed) return { ok: false, reason: 'empty-text', code: '', transport: false };
                try {
                    const result = await withCredential(function (cred) {
                        const payload = {
                            a: 'activityupsert', id: packId, aid: activityId,
                            uid: cred.uid, pt: cred.pt, term: trimmed
                        };
                        if (displayName) payload.nm = displayName;
                        return payload;
                    });
                    if (!result || result.ok === false) return refusal((result && result.e) || 'error', false);
                    return { ok: true, board: boardFromSummary(result) };
                } catch (e) {
                    return refusal((e && e.code) || 'unreachable', true);
                }
            },

            /**
             * Host-only. `uid` is the item's AUTHOR, which the server needs to
             * find the row the item lives in. Refusing locally when there is no
             * admin secret is a courtesy, not the enforcement — the server
             * rejects a non-admin moderate call regardless.
             */
            async setStatus(authorUid, itemId, status) {
                if (!isTeacher || !admin) return { ok: false, reason: 'host-only', code: '', transport: false };
                try {
                    const result = await call(url, {
                        a: 'moderateactivity', admin: admin, id: packId, aid: activityId,
                        uid: String(authorUid || ''), itemId: String(itemId || ''),
                        // The view speaks the contract's vocabulary; the wire
                        // speaks the mailbox's.
                        status: status === 'held' ? 'pending' : String(status || '')
                    });
                    if (!result || result.ok === false) return refusal((result && result.e) || 'error', false);
                    return { ok: true, version: result.version || 0 };
                } catch (e) {
                    return refusal((e && e.code) || 'unreachable', true);
                }
            },

            /**
             * Host-only. The mark a sticky note cannot make (spec §2.3): this
             * is what turns a wall of questions into a record of which ones the
             * unit actually answered.
             */
            async setAnswered(authorUid, itemId, answered, note) {
                if (!isTeacher || !admin) return { ok: false, reason: 'host-only', code: '', transport: false };
                try {
                    const payload = {
                        a: 'moderateactivity', admin: admin, id: packId, aid: activityId,
                        uid: String(authorUid || ''), itemId: String(itemId || ''),
                        answered: answered === true
                    };
                    if (answered === true && note) payload.note = String(note);
                    const result = await call(url, payload);
                    if (!result || result.ok === false) return refusal((result && result.e) || 'error', false);
                    return { ok: true, version: result.version || 0 };
                } catch (e) {
                    return refusal((e && e.code) || 'unreachable', true);
                }
            }
        };
    }

    return {
        VERSION: VERSION,
        REASONS: REASONS,
        reasonFor: reasonFor,
        boardFromSummary: boardFromSummary,
        createMailboxTransport: createMailboxTransport
    };
}));
