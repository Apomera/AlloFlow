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
    const hasOwn = Object.prototype.hasOwnProperty;
    const MAX_SAVED_CRED_CHARS = 4096;
    const MAX_BOARD_ITEMS = 500;
    const MAX_ITEM_TEXT_CHARS = 2000;
    const MAX_NOTE_CHARS = 1000;
    const ALLOWED_STATUSES = { 'held': 1, 'approved': 1, 'hidden': 1 };

    function stripCtrl(value) {
        return String(value == null ? '' : value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
    }

    function safeJsonParse(raw, maxChars) {
        if (typeof raw !== 'string' || !raw) return null;
        if (maxChars && raw.length > maxChars) return null;
        try {
            return JSON.parse(raw, function (key, val) {
                return (key === '__proto__' || key === 'constructor' || key === 'prototype') ? undefined : val;
            });
        } catch (_) {
            return null;
        }
    }

    function finiteNum(value, fallback) {
        return (typeof value === 'number' && Number.isFinite(value)) ? value : fallback;
    }

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
        return hasOwn.call(REASONS, key) ? REASONS[key] : 'error';
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
        if (!summary || typeof summary !== 'object' || summary.ok === false) return null;
        const items = Array.isArray(summary.items) ? summary.items.slice(0, MAX_BOARD_ITEMS) : [];
        return {
            config: {
                activityId: stripCtrl(summary.activityId || '').slice(0, 128),
                type: 'question_board',
                prompt: stripCtrl(summary.prompt || '').slice(0, 1000),
                revealPolicy: stripCtrl(summary.revealPolicy || 'auto_publish').slice(0, 64),
                minParticipants: finiteNum(summary.minParticipants, 3),
                itemsPerStudent: finiteNum(summary.itemsPerStudent, 5),
                boardCap: finiteNum(summary.boardCap, 400),
                expiresAt: stripCtrl(summary.expiresAt || '').slice(0, 64)
            },
            items: items.filter(function (it) { return it && typeof it === 'object'; }).map(function (it) {
                const rawStatus = it.status === 'pending' ? 'held' : String(it.status || 'held');
                const safeStatus = hasOwn.call(ALLOWED_STATUSES, rawStatus) ? rawStatus : 'held';
                return {
                    id: stripCtrl(it.id || '').slice(0, 128),
                    uid: stripCtrl(it.uid || '').slice(0, 128),
                    displayName: it.displayName ? stripCtrl(it.displayName).slice(0, 64) : '',
                    text: stripCtrl(it.text || '').slice(0, MAX_ITEM_TEXT_CHARS),
                    // 'pending' is the mailbox's word for the contract's 'held'.
                    // Translating at the boundary is the adapter's job; the
                    // storage vocabulary must not leak into the view.
                    status: safeStatus,
                    answered: (it.answered && typeof it.answered === 'object' && !Array.isArray(it.answered))
                        ? Object.assign(
                            {},
                            typeof it.answered.at === 'number' && Number.isFinite(it.answered.at) ? { at: it.answered.at } : {},
                            typeof it.answered.by === 'string' && it.answered.by ? { by: stripCtrl(it.answered.by).slice(0, 64) } : {},
                            typeof it.answered.note === 'string' && it.answered.note ? { note: stripCtrl(it.answered.note).slice(0, MAX_NOTE_CHARS) } : {},
                            typeof it.answered.resourceId === 'string' && it.answered.resourceId ? { resourceId: stripCtrl(it.answered.resourceId).slice(0, 128) } : {}
                        )
                        : (it.answered === true),
                    createdAt: finiteNum(it.createdAt, 0)
                };
            }),
            version: finiteNum(summary.version, 0),
            updatedAt: finiteNum(summary.updatedAt, 0),
            participantCount: finiteNum(summary.participantCount, 0)
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

        const url = stripCtrl(opts.url || '').trim();
        const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url);
        const safeScheme = /^https:\/\/[^\s]+$|^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/[^\s]*)?$/i.test(url);
        if (!url || /^\/\//.test(url) || (hasScheme && !safeScheme)) {
            throw new Error('createMailboxTransport rejected unsafe URL scheme');
        }
        const packId = String(opts.packId || '');
        const activityId = String(opts.activityId || '');
        const admin = String(opts.admin || '');
        const packSecret = String(opts.packSecret || '');
        const isTeacher = !!opts.isTeacher;
        const learnerScope = String(
            opts.storageKeyScope ||
            (typeof globalThis !== 'undefined' && typeof globalThis.__alloActiveLearnerKey === 'string' ? globalThis.__alloActiveLearnerKey : '') ||
            ''
        ).trim().slice(0, 64);
        let storage = opts.storage || null;
        if (!learnerScope && typeof globalThis !== 'undefined' && globalThis.__alloQrStudentMode) {
            try {
                if (typeof window !== 'undefined' && window.localStorage && storage === window.localStorage) {
                    storage = window.sessionStorage || null;
                }
            } catch (_) {
                storage = null;
            }
        }
        const storageKey = learnerScope
            ? ('allo_question_board_v1:' + learnerScope + ':' + packId + ':' + activityId)
            : ('allo_question_board_v1:' + packId + ':' + activityId);

        let credential = null;
        let joinPromise = null;
        let displayName = stripCtrl(opts.displayName || '').slice(0, 40);

        function validCred(value) {
            return !!(value && typeof value === 'object'
                && typeof value.uid === 'string' && value.uid.length > 0 && value.uid.length <= 200
                && typeof value.pt === 'string' && value.pt.length > 0 && value.pt.length <= 512);
        }

        function readSaved() {
            if (!storage) return null;
            try {
                const raw = storage.getItem(storageKey);
                const saved = safeJsonParse(raw, MAX_SAVED_CRED_CHARS);
                return validCred(saved) ? { uid: saved.uid, pt: saved.pt } : null;
            } catch (e) { return null; }
        }

        function remember(next) {
            if (!validCred(next)) return null;
            credential = { uid: next.uid, pt: next.pt };
            if (storage) { try { storage.setItem(storageKey, JSON.stringify(credential)); } catch (e) {} }
            return credential;
        }

        function forget() {
            credential = null;
            joinPromise = null;
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
            if (validCred(credential)) return credential;
            const saved = readSaved();
            if (saved) { credential = saved; return saved; }
            if (joinPromise) return joinPromise;
            joinPromise = (async function () {
                const joined = await call(url, {
                    a: 'joinactivity', id: packId, k: packSecret, aid: activityId
                });
                if (!joined || joined.ok === false || !validCred(joined)) {
                    const err = new Error('join-failed');
                    err.code = String((joined && joined.e) || 'denied');
                    throw err;
                }
                return remember({ uid: joined.uid, pt: joined.pt });
            })();
            try {
                return await joinPromise;
            } finally {
                joinPromise = null;
            }
        }

        // A stale token survives a pack re-key or a cleared server cache and
        // reads as 'denied'. Re-joining once is the difference between a
        // recoverable hiccup and a student locked out of their own board.
        async function withCredential(build) {
            let cred = await ensureCredential();
            try {
                const res = await call(url, build(cred));
                if (res && res.ok === false && String(res.e || '').includes('denied')) {
                    forget();
                    cred = await ensureCredential();
                    return call(url, build(cred));
                }
                return res;
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

            setDisplayName(next) { displayName = stripCtrl(next || '').slice(0, 40); },

            /** Clears the cached participant credential on shared devices and joins fresh. */
            async startFresh() {
                if (isTeacher) return { ok: false, reason: 'host-cannot-post', code: '', transport: false };
                forget();
                displayName = '';
                try {
                    await ensureCredential();
                    return this.load();
                } catch (e) {
                    const isJoinRefusal = e && e.message === 'join-failed';
                    return refusal((e && e.code) || (isJoinRefusal ? 'denied' : 'unreachable'), !isJoinRefusal);
                }
            },

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
                const trimmed = stripCtrl(text || '').trim().slice(0, MAX_ITEM_TEXT_CHARS);
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
                const rawStatus = String(status || '');
                const wireStatus = rawStatus === 'held' ? 'pending' : rawStatus;
                if (wireStatus !== 'pending' && wireStatus !== 'approved' && wireStatus !== 'hidden') {
                    return refusal('error', false);
                }
                try {
                    const result = await call(url, {
                        a: 'moderateactivity', admin: admin, id: packId, aid: activityId,
                        uid: String(authorUid || ''), itemId: String(itemId || ''),
                        // The view speaks the contract's vocabulary; the wire
                        // speaks the mailbox's.
                        status: wireStatus
                    });
                    if (!result || result.ok === false) return refusal((result && result.e) || 'error', false);
                    return { ok: true, version: finiteNum(result.version, 0) };
                } catch (e) {
                    return refusal((e && e.code) || 'unreachable', true);
                }
            },

            /**
             * Host-only. The mark a sticky note cannot make (spec §2.3): this
             * is what turns a wall of questions into a record of which ones the
             * unit actually answered.
             */
            async setAnswered(authorUid, itemId, answered, note, resourceId) {
                if (!isTeacher || !admin) return { ok: false, reason: 'host-only', code: '', transport: false };
                try {
                    const payload = {
                        a: 'moderateactivity', admin: admin, id: packId, aid: activityId,
                        uid: String(authorUid || ''), itemId: String(itemId || ''),
                        answered: answered === true
                    };
                    if (answered === true && note) payload.note = stripCtrl(note).slice(0, MAX_NOTE_CHARS);
                    if (answered === true && resourceId) payload.resourceId = stripCtrl(resourceId).slice(0, 128);
                    const result = await call(url, payload);
                    if (!result || result.ok === false) return refusal((result && result.e) || 'error', false);
                    return { ok: true, version: finiteNum(result.version, 0) };
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
