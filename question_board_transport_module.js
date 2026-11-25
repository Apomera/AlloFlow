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
    const validRoot = !!(root && (typeof root === 'object' || typeof root === 'function'));
    if (typeof module === 'object' && module && module.exports) {
        module.exports = factory();
    } else if (validRoot) {
        if (!root.AlloModules || typeof root.AlloModules !== 'object') root.AlloModules = {};
        root.AlloModules.QuestionBoardTransport = factory();
    }
}((typeof window !== 'undefined' && window && (typeof window === 'object' || typeof window === 'function')) ? window
    : ((typeof self !== 'undefined' && self && (typeof self === 'object' || typeof self === 'function')) ? self
        : ((typeof globalThis !== 'undefined' && globalThis && typeof globalThis === 'object') ? globalThis : null)), function () {
    'use strict';

    const VERSION = '1.0.0';
    const hasOwn = Object.prototype.hasOwnProperty;
    const MAX_SAVED_CRED_CHARS = 4096;
    const MAX_BOARD_ITEMS = 500;
    const MAX_ITEM_TEXT_CHARS = 2000;
    const MAX_NOTE_CHARS = 1000;
    const ALLOWED_STATUSES = Object.freeze({ 'held': 1, 'approved': 1, 'hidden': 1 });

    function toStr(value) {
        if (value == null || typeof value === 'symbol') return '';
        try { return String(value); } catch (_) { return ''; }
    }

    function stripCtrl(value) {
        return toStr(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '');
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

    function parseTsMs(value) {
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
        if (typeof value === 'string' && value.trim()) {
            const parsed = Date.parse(value.trim());
            if (Number.isFinite(parsed) && parsed >= 0) return parsed;
        }
        return NaN;
    }

    // Server code → contract reason. Anything unlisted surfaces as 'error',
    // which the UI renders as a generic retry rather than inventing a cause.
    const REASONS = Object.freeze({
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
    });

    function reasonFor(code) {
        const key = toStr(code);
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
        return { ok: false, reason: reasonFor(code), code: toStr(code), transport: !!transport };
    }

    /**
     * Turn a server board summary into the contract's board shape.
     *
     * The server sends a flat visible-item list already filtered for this
     * actor; it does NOT send the held items a peer may not see. That is the
     * mailbox's central advantage over Firestore-on-Canvas (spec §10.4b) and
     * this function must not paper over it by re-adding anything.
     */
    function nonNegNum(value, fallback, minVal) {
        const n = finiteNum(value, fallback);
        const floor = typeof minVal === 'number' ? minVal : 0;
        return n >= floor ? n : fallback;
    }

    function nonNegInt(value, fallback, minVal) {
        const n = nonNegNum(value, fallback, minVal);
        return Math.floor(n);
    }

    function normalizeExpiresAt(raw) {
        if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
            try { return new Date(raw).toISOString(); } catch (_) { return ''; }
        }
        return stripCtrl(raw || '').slice(0, 64);
    }

    function boardFromSummary(summary) {
        if (!summary || typeof summary !== 'object' || Array.isArray(summary) || summary.ok === false) return null;
        const items = Array.isArray(summary.items) ? summary.items.slice(0, MAX_BOARD_ITEMS) : [];
        const rawPolicy = stripCtrl(summary.revealPolicy || 'auto_publish').trim();
        return {
            config: {
                activityId: stripCtrl(summary.activityId || '').slice(0, 128),
                type: 'question_board',
                prompt: stripCtrl(summary.prompt || '').slice(0, 1000),
                revealPolicy: rawPolicy === 'teacher_review' ? 'teacher_review' : 'auto_publish',
                minParticipants: nonNegInt(summary.minParticipants, 3, 1),
                itemsPerStudent: nonNegInt(summary.itemsPerStudent, 5, 1),
                boardCap: nonNegInt(summary.boardCap, 400, 1),
                expiresAt: normalizeExpiresAt(summary.expiresAt)
            },
            items: items.filter(function (it) { return it && typeof it === 'object' && !Array.isArray(it); }).map(function (it) {
                const rawStatus = it.status === 'pending' ? 'held' : (toStr(it.status) || 'held');
                const safeStatus = hasOwn.call(ALLOWED_STATUSES, rawStatus) ? rawStatus : 'held';
                const ansAt = (it.answered && typeof it.answered === 'object' && !Array.isArray(it.answered)) ? parseTsMs(it.answered.at) : NaN;
                const createdTs = parseTsMs(it.createdAt);
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
                            Number.isFinite(ansAt) ? { at: ansAt } : {},
                            typeof it.answered.by === 'string' && it.answered.by ? { by: stripCtrl(it.answered.by).slice(0, 64) } : {},
                            typeof it.answered.note === 'string' && it.answered.note ? { note: stripCtrl(it.answered.note).slice(0, MAX_NOTE_CHARS) } : {},
                            typeof it.answered.resourceId === 'string' && it.answered.resourceId ? { resourceId: stripCtrl(it.answered.resourceId).slice(0, 128) } : {}
                        )
                        : (it.answered === true),
                    createdAt: Number.isFinite(createdTs) ? createdTs : 0
                };
            }),
            version: nonNegInt(summary.version, 0, 0),
            updatedAt: nonNegNum(summary.updatedAt, 0, 0),
            participantCount: nonNegInt(summary.participantCount, 0, 0)
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

        if (typeof opts.url !== 'string') {
            throw new Error('createMailboxTransport rejected unsafe URL scheme');
        }
        const rawUrl = opts.url.trim();
        const url = stripCtrl(rawUrl).trim();
        const hasControlOrSpace = /[\s\\\u0000-\u0020\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/.test(rawUrl);
        const collapsedForScheme = rawUrl.replace(/[\u0000-\u0020\u007f]+/g, '');
        const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(collapsedForScheme);
        const safeScheme = /^https:\/\/[^\/\s@\\]+(?:\/[^\s\\]*)?$|^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/[^\s\\]*)?$/i.test(url);
        if (!url || hasControlOrSpace || /^\/\//.test(url) || (hasScheme && !safeScheme)) {
            throw new Error('createMailboxTransport rejected unsafe URL scheme');
        }
        const packId = stripCtrl(opts.packId || '');
        const activityId = stripCtrl(opts.activityId || '');
        const admin = toStr(opts.admin);
        const packSecret = toStr(opts.packSecret);
        const isTeacher = !!opts.isTeacher;
        const winObj = (typeof window !== 'undefined' && window && (typeof window === 'object' || typeof window === 'function')) ? window : null;
        const gObj = (typeof globalThis !== 'undefined' && globalThis && typeof globalThis === 'object') ? globalThis : null;
        const activeKey = (winObj && typeof winObj.__alloActiveLearnerKey === 'string' && winObj.__alloActiveLearnerKey)
            ? winObj.__alloActiveLearnerKey
            : ((gObj && typeof gObj.__alloActiveLearnerKey === 'string') ? gObj.__alloActiveLearnerKey : '');
        const learnerScope = stripCtrl(opts.storageKeyScope || activeKey || '').trim().slice(0, 64);
        let storage = opts.storage || null;
        const qrOrStudent = !!((winObj && (winObj.__alloQrStudentMode || winObj.__alloStudentView === true))
            || (gObj && (gObj.__alloQrStudentMode || gObj.__alloStudentView === true)));
        if (!learnerScope && qrOrStudent) {
            try {
                if (winObj && winObj.localStorage && storage === winObj.localStorage) {
                    storage = winObj.sessionStorage || null;
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
        let joinGen = 0;
        let displayName = stripCtrl(opts.displayName || '').slice(0, 40);

        function validCred(value) {
            return !!(value && typeof value === 'object' && !Array.isArray(value)
                && hasOwn.call(value, 'uid') && hasOwn.call(value, 'pt')
                && typeof value.uid === 'string' && value.uid.length > 0 && value.uid.length <= 200 && !/[\u0000-\u001f\u007f]/.test(value.uid)
                && typeof value.pt === 'string' && value.pt.length > 0 && value.pt.length <= 512 && !/[\u0000-\u001f\u007f]/.test(value.pt));
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
            joinGen += 1;
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
            const myGen = joinGen;
            const pending = (async function () {
                const joined = await call(url, {
                    a: 'joinactivity', id: packId, k: packSecret, aid: activityId
                });
                if (!joined || joined.ok === false || !validCred(joined)) {
                    const err = new Error('join-failed');
                    err.code = toStr(joined && joined.e) || 'denied';
                    throw err;
                }
                const next = { uid: joined.uid, pt: joined.pt };
                if (myGen !== joinGen) return next;
                return remember(next);
            })();
            joinPromise = pending;
            try {
                return await pending;
            } finally {
                if (joinPromise === pending) joinPromise = null;
            }
        }

        // A stale token survives a pack re-key or a cleared server cache and
        // reads as 'denied'. Re-joining once is the difference between a
        // recoverable hiccup and a student locked out of their own board.
        async function withCredential(build) {
            let cred = await ensureCredential();
            const genAtStart = joinGen;
            try {
                const res = await call(url, build(cred));
                if (res && res.ok === false && toStr(res.e).includes('denied')) {
                    if (genAtStart !== joinGen) return res;
                    forget();
                    cred = await ensureCredential();
                    return call(url, build(cred));
                }
                return res;
            } catch (e) {
                if (!toStr(e && e.code).includes('denied')) throw e;
                if (genAtStart !== joinGen) throw e;
                forget();
                cred = await ensureCredential();
                return call(url, build(cred));
            }
        }

        async function loadBoard() {
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
                const board = boardFromSummary(result);
                if (!board) return refusal('error', false);
                return { ok: true, board: board };
            } catch (e) {
                const isJoinRefusal = !!(e && e.message === 'join-failed');
                return refusal((e && e.code) || (isJoinRefusal ? 'denied' : 'unreachable'), !isJoinRefusal);
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
                    return loadBoard();
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
            load: loadBoard,

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
                    const board = boardFromSummary(result);
                    if (!board) return refusal('error', false);
                    return { ok: true, board: board };
                } catch (e) {
                    const isJoinRefusal = !!(e && e.message === 'join-failed');
                    return refusal((e && e.code) || (isJoinRefusal ? 'denied' : 'unreachable'), !isJoinRefusal);
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
                const cleanUid = stripCtrl(authorUid || '').trim().slice(0, 128);
                const cleanItemId = stripCtrl(itemId || '').trim().slice(0, 128);
                if (!cleanUid || !cleanItemId) return refusal('error', false);
                const rawStatus = toStr(status);
                const wireStatus = rawStatus === 'held' ? 'pending' : rawStatus;
                if (wireStatus !== 'pending' && wireStatus !== 'approved' && wireStatus !== 'hidden') {
                    return refusal('error', false);
                }
                try {
                    const result = await call(url, {
                        a: 'moderateactivity', admin: admin, id: packId, aid: activityId,
                        uid: cleanUid, itemId: cleanItemId,
                        // The view speaks the contract's vocabulary; the wire
                        // speaks the mailbox's.
                        status: wireStatus
                    });
                    if (!result || result.ok === false) return refusal((result && result.e) || 'error', false);
                    return { ok: true, version: nonNegNum(result.version, 0, 0) };
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
                const cleanUid = stripCtrl(authorUid || '').trim().slice(0, 128);
                const cleanItemId = stripCtrl(itemId || '').trim().slice(0, 128);
                if (!cleanUid || !cleanItemId) return refusal('error', false);
                try {
                    const payload = {
                        a: 'moderateactivity', admin: admin, id: packId, aid: activityId,
                        uid: cleanUid, itemId: cleanItemId,
                        answered: answered === true
                    };
                    if (answered === true && note) payload.note = stripCtrl(note).slice(0, MAX_NOTE_CHARS);
                    if (answered === true && resourceId) payload.resourceId = stripCtrl(resourceId).slice(0, 128);
                    const result = await call(url, payload);
                    if (!result || result.ok === false) return refusal((result && result.e) || 'error', false);
                    return { ok: true, version: nonNegNum(result.version, 0, 0) };
                } catch (e) {
                    return refusal((e && e.code) || 'unreachable', true);
                }
            }
        };
    }

    return Object.freeze({
        VERSION: VERSION,
        REASONS: REASONS,
        reasonFor: reasonFor,
        boardFromSummary: boardFromSummary,
        createMailboxTransport: createMailboxTransport
    });
}));
