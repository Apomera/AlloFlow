/*
 * AlloFlow Driving Questions Board — transport-neutral contract.
 *
 * Phase 0 of DRIVING_QUESTIONS_BOARD_SPEC.md. This module deliberately contains
 * NO transport: no Firestore, no mailbox, no network, no storage. It is the one
 * place the rules of a board are written down, so the two adapters that will
 * enforce them (Apps Script server-side filtering, and firestore.rules document
 * gating) have a single reference to conform to rather than two independent
 * reimplementations that drift.
 *
 * The load-bearing idea: visibility is a PURE FUNCTION here (visibleItemsFor).
 * The mailbox computes its summary server-side and Firestore gates whole
 * documents — completely different mechanisms — but both must produce exactly
 * what this function produces. runConformanceSuite() is what proves it.
 *
 * See spec §10.2 (why the physical layouts must differ) and §10.3 (the
 * invariant list this file makes executable).
 */
(function registerQuestionBoardContract(root, factory) {
    const api = factory(root || (typeof globalThis !== 'undefined' ? globalThis : {}));
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) {
        root.AlloModules = root.AlloModules || {};
        root.AlloModules.QuestionBoardContract = api;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function createQuestionBoardContract() {
    'use strict';

    const VERSION = 1;

    // ── Limits ──────────────────────────────────────────────────────────────
    // Deliberately the MAILBOX's limits, not Firestore's. Spec §10 design rule 1:
    // a board built to the tighter ceiling runs unmodified on both transports;
    // the reverse silently breaks. Sources are apps_script/session_mailbox/Code.gs.
    const LIMITS = {
        DOC_BYTES: 85 * 1024,      // MAX_DOC_CHARS
        PATCH_FIELDS: 60,          // MAX_PATCH_FIELDS
        PARTICIPANTS: 250,         // MAX_ACTIVITY_PARTICIPANTS
        PARTICIPANT_WRITES_PER_MIN: 120,
        BOARDS_PER_ASSIGNMENT: 8,  // MAX_ASSIGNMENT_ACTIVITIES
        PROMPT_CHARS: 240,         // matches the existing activity prompt clamp
        ITEM_CHARS: 200,
        ANSWER_NOTE_CHARS: 240,
        ITEMS_PER_STUDENT_MAX: 10
    };

    // ── The authoritative invariant list (spec §10.3) ───────────────────────
    // Both adapters cite these ids. The conformance suite asserts every one.
    const INVARIANTS = [
        { id: 'HELD_HIDDEN_FROM_PEERS', statement: 'An item that is not approved is never readable by another participant.' },
        { id: 'OWN_ALWAYS_VISIBLE', statement: 'An author can always read their own item, whatever its status.' },
        { id: 'HOST_SEES_ALL', statement: 'The host can read every item, whatever its status.' },
        { id: 'STATUS_IS_HOST_ONLY', statement: 'Only the host may write status or answered.' },
        { id: 'AUTHORSHIP_NOT_FORGEABLE', statement: 'A participant may only create items attributed to their own uid.' },
        { id: 'ITEM_CAP_PER_STUDENT', statement: 'A participant cannot exceed itemsPerStudent items on a board.' },
        { id: 'PARTICIPANT_CAP', statement: 'A board cannot exceed LIMITS.PARTICIPANTS distinct authors.' },
        { id: 'BOARD_CAP', statement: 'A board rejects writes that would push it past its byte ceiling.' },
        { id: 'K_ANONYMITY_FLOOR', statement: 'Peer items stay hidden until minParticipants distinct authors have posted; own items are exempt.' },
        { id: 'EXPIRY_IS_READ_ONLY', statement: 'After expiresAt a board accepts no new items and no edits, but remains readable.' },
        { id: 'TEXT_IS_SANITIZED', statement: 'Stored item text has control characters stripped and is clamped to LIMITS.ITEM_CHARS.' }
    ];

    // ── Sanitizers ──────────────────────────────────────────────────────────
    // Mirrors the Apps Script normalizer so both transports store byte-identical
    // text: strip control chars, collapse whitespace, trim, clamp.
    function sanitizeText(raw, maxChars) {
        return String(raw == null ? '' : raw)
            .replace(/[\u0000-\u001f\u007f]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, maxChars);
    }

    function clampInt(value, min, max, fallback) {
        const n = parseInt(value, 10);
        if (!isFinite(n)) return fallback;
        return Math.max(min, Math.min(max, n));
    }

    // ── Config ──────────────────────────────────────────────────────────────
    // Returns null for an unusable config, matching normalizeAssignmentActivityConfig's
    // contract (Code.gs:919) so the mailbox adapter can delegate to this directly.
    function normalizeBoardConfig(raw) {
        let source = raw;
        if (typeof source === 'string') {
            try { source = JSON.parse(source); } catch (e) { return null; }
        }
        if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
        if (source.type !== 'question_board') return null;

        const activityId = String(source.activityId || '');
        if (!/^AC-[0-9a-f-]{36}$/i.test(activityId)) return null;

        const prompt = sanitizeText(source.prompt, LIMITS.PROMPT_CHARS);
        if (!prompt) return null;

        return {
            v: VERSION,
            activityId,
            type: 'question_board',
            delivery: 'shared_async',
            prompt,
            // teacher_review remains the escape hatch; auto_publish is the intended
            // default for boards (spec §8.2) because a review queue kills liveness.
            revealPolicy: source.revealPolicy === 'teacher_review' ? 'teacher_review' : 'auto_publish',
            minParticipants: clampInt(source.minParticipants, 3, 10, 3),
            itemsPerStudent: clampInt(source.itemsPerStudent, 1, LIMITS.ITEMS_PER_STUDENT_MAX, 5),
            boardCap: clampInt(source.boardCap, 1, 5000, 400),
            expiresAt: String(source.expiresAt || '')
        };
    }

    // ── Actors ──────────────────────────────────────────────────────────────
    // Identity is INHERITED from the codename system, not invented here
    // (spec §8.1). A board is not anonymous: uid identifies, displayName is the
    // nickname peers see.
    function normalizeActor(raw) {
        const uid = String((raw && raw.uid) || '').trim();
        if (!uid) return null;
        return {
            uid,
            role: (raw && raw.role) === 'host' ? 'host' : 'participant',
            displayName: sanitizeText((raw && raw.displayName) || '', 60)
        };
    }

    const isHost = (actor) => !!actor && actor.role === 'host';

    // ── Visibility: the single reference both adapters must match ───────────
    function distinctAuthorCount(items) {
        const seen = new Set();
        (items || []).forEach((it) => { if (it && it.uid) seen.add(it.uid); });
        return seen.size;
    }

    /**
     * The authoritative answer to "what may this actor see?".
     *
     * The mailbox satisfies this by computing its summary server-side; Firestore
     * satisfies it with per-document rules over an items subcollection. Different
     * mechanisms, identical output — that equality is what runConformanceSuite
     * checks, and it is the whole anti-drift strategy.
     */
    function visibleItemsFor(actor, board) {
        const a = normalizeActor(actor);
        const items = (board && Array.isArray(board.items)) ? board.items : [];
        if (!a) return [];
        if (isHost(a)) return items.slice();                          // HOST_SEES_ALL

        const config = (board && board.config) || {};
        const floor = clampInt(config.minParticipants, 3, 10, 3);
        const floorMet = distinctAuthorCount(items) >= floor;          // K_ANONYMITY_FLOOR

        return items.filter((it) => {
            if (!it) return false;
            if (it.uid === a.uid) return true;                         // OWN_ALWAYS_VISIBLE
            if (!floorMet) return false;
            return it.status === 'approved';                           // HELD_HIDDEN_FROM_PEERS
        });
    }

    // ── Authorization ───────────────────────────────────────────────────────
    // op: 'create' | 'setStatus' | 'setAnswered' | 'configure'
    // Returns { ok: true } or { ok: false, reason, invariant }.
    function authorize(actor, op, board, payload) {
        const a = normalizeActor(actor);
        if (!a) return { ok: false, reason: 'no-actor', invariant: 'AUTHORSHIP_NOT_FORGEABLE' };

        const config = (board && board.config) || {};
        const items = (board && Array.isArray(board.items)) ? board.items : [];

        if (op === 'setStatus' || op === 'setAnswered' || op === 'configure') {
            if (!isHost(a)) return { ok: false, reason: 'host-only', invariant: 'STATUS_IS_HOST_ONLY' };
            return { ok: true };
        }

        if (op !== 'create') return { ok: false, reason: 'unknown-op', invariant: null };

        // Expiry closes writes for everyone, host included: a board past its unit
        // is a record, not a surface (spec §8.4).
        if (isExpired(board)) return { ok: false, reason: 'expired', invariant: 'EXPIRY_IS_READ_ONLY' };

        const claimedUid = String((payload && payload.uid) || a.uid);
        if (!isHost(a) && claimedUid !== a.uid) {
            return { ok: false, reason: 'forged-authorship', invariant: 'AUTHORSHIP_NOT_FORGEABLE' };
        }

        const mine = items.filter((it) => it && it.uid === claimedUid).length;
        const perStudent = clampInt(config.itemsPerStudent, 1, LIMITS.ITEMS_PER_STUDENT_MAX, 5);
        if (mine >= perStudent) return { ok: false, reason: 'item-cap', invariant: 'ITEM_CAP_PER_STUDENT' };

        const authors = new Set(items.map((it) => it && it.uid).filter(Boolean));
        if (!authors.has(claimedUid) && authors.size >= LIMITS.PARTICIPANTS) {
            return { ok: false, reason: 'participant-cap', invariant: 'PARTICIPANT_CAP' };
        }

        const cap = clampInt(config.boardCap, 1, 5000, 400);
        if (items.length >= cap) return { ok: false, reason: 'board-full', invariant: 'BOARD_CAP' };
        if (estimateBoardBytes(board) >= LIMITS.DOC_BYTES) {
            return { ok: false, reason: 'board-bytes', invariant: 'BOARD_CAP' };
        }

        return { ok: true };
    }

    function isExpired(board) {
        const at = board && board.config && board.config.expiresAt;
        if (!at) return false;
        const t = Date.parse(at);
        return isFinite(t) && Date.now() > t;
    }

    // ── Items ───────────────────────────────────────────────────────────────
    function normalizeItem(raw, actor) {
        const a = normalizeActor(actor);
        const text = sanitizeText(raw && raw.text, LIMITS.ITEM_CHARS);   // TEXT_IS_SANITIZED
        if (!text || !a) return null;
        return {
            id: String((raw && raw.id) || ''),
            uid: a.uid,
            displayName: a.displayName,
            text,
            // auto_publish is the intended default (spec §8.2); teacher_review holds.
            // The AI pre-screen sits in FRONT of this, in the adapter, and may pass
            // 'held' explicitly for anything it flags.
            status: raw && raw.status === 'held' ? 'held' : 'approved',
            answered: false,
            createdAt: Number((raw && raw.createdAt) || Date.now())
        };
    }

    function markAnswered(item, patch) {
        const note = sanitizeText(patch && patch.note, LIMITS.ANSWER_NOTE_CHARS);
        return Object.assign({}, item, {
            answered: {
                at: Number((patch && patch.at) || Date.now()),
                note: note || undefined,
                resourceId: (patch && patch.resourceId) ? String(patch.resourceId) : undefined
            }
        });
    }

    // Byte estimate for the 85KB ceiling. Deliberately measures the serialized
    // form rather than guessing per-item, because spec §11 asks for a measured
    // budget rather than an estimated one.
    function estimateBoardBytes(board) {
        try {
            const payload = JSON.stringify({
                config: (board && board.config) || {},
                items: (board && board.items) || []
            });
            return (typeof Buffer !== 'undefined')
                ? Buffer.byteLength(payload, 'utf8')
                : new TextEncoder().encode(payload).length;
        } catch (e) { return Number.MAX_SAFE_INTEGER; }
    }

    // ── Conformance suite ───────────────────────────────────────────────────
    /**
     * Runs every invariant against an adapter. Both the mailbox adapter (Phase 1a)
     * and the Firebase adapter (Phase 1b) must pass this identical suite — that is
     * the only real defence against the two enforcement paths drifting (spec §10.3).
     *
     * The adapter must expose:
     *   createBoard(config) -> boardRef
     *   addItem(boardRef, actor, {text, status?, uid?}) -> {ok, reason?}
     *   setStatus(boardRef, actor, itemId, status) -> {ok, reason?}
     *   listVisible(boardRef, actor) -> [item]
     *   snapshot(boardRef) -> {config, items}
     */
    function runConformanceSuite(adapter, options) {
        const opts = options || {};
        const results = [];
        const record = (invariant, ok, detail) => results.push({ invariant, ok: !!ok, detail: detail || '' });

        const cfg = normalizeBoardConfig(Object.assign({
            activityId: 'AC-' + '0123abcd-0123-4567-89ab-0123456789ab'.slice(0, 36),
            type: 'question_board',
            prompt: 'What do you wonder about ecosystems?',
            minParticipants: 3,
            itemsPerStudent: 2,
            boardCap: 50
        }, opts.config || {}));

        const host = { uid: 'T-host', role: 'host', displayName: 'Teacher' };
        const s1 = { uid: 'S-1', role: 'participant', displayName: 'Ada' };
        const s2 = { uid: 'S-2', role: 'participant', displayName: 'Ben' };
        const s3 = { uid: 'S-3', role: 'participant', displayName: 'Cal' };

        const board = adapter.createBoard(cfg);
        adapter.addItem(board, s1, { text: 'Why do wolves matter?' });
        adapter.addItem(board, s2, { text: 'What eats algae?' });
        adapter.addItem(board, s3, { text: 'Held question', status: 'held' });

        // HELD_HIDDEN_FROM_PEERS + OWN_ALWAYS_VISIBLE
        const s1See = adapter.listVisible(board, s1).map((i) => i.text);
        record('HELD_HIDDEN_FROM_PEERS', s1See.indexOf('Held question') === -1, s1See.join(' | '));
        const s3See = adapter.listVisible(board, s3).map((i) => i.text);
        record('OWN_ALWAYS_VISIBLE', s3See.indexOf('Held question') !== -1, s3See.join(' | '));

        // HOST_SEES_ALL
        record('HOST_SEES_ALL', adapter.listVisible(board, host).length === adapter.snapshot(board).items.length);

        // STATUS_IS_HOST_ONLY
        const heldItem = adapter.snapshot(board).items.filter((i) => i.status === 'held')[0];
        const peerStatus = adapter.setStatus(board, s1, heldItem && heldItem.id, 'approved');
        record('STATUS_IS_HOST_ONLY', peerStatus && peerStatus.ok === false, peerStatus && peerStatus.reason);

        // AUTHORSHIP_NOT_FORGEABLE
        const forged = adapter.addItem(board, s1, { text: 'Not mine', uid: 'S-2' });
        record('AUTHORSHIP_NOT_FORGEABLE', forged && forged.ok === false, forged && forged.reason);

        // ITEM_CAP_PER_STUDENT (itemsPerStudent: 2 - s1 already has one)
        adapter.addItem(board, s1, { text: 'Second question' });
        const over = adapter.addItem(board, s1, { text: 'Third question' });
        record('ITEM_CAP_PER_STUDENT', over && over.ok === false, over && over.reason);

        // TEXT_IS_SANITIZED
        adapter.addItem(board, s2, { text: 'line\u0009break \u0000 collapsed' });
        const dirty = adapter.snapshot(board).items.filter((i) => i.uid === 'S-2').pop();
        record('TEXT_IS_SANITIZED',
            !!dirty && !/[\u0000-\u001f\u007f]/.test(dirty.text) && dirty.text.indexOf('  ') === -1,
            dirty && dirty.text);

        // K_ANONYMITY_FLOOR — a fresh board below the floor hides peers, not self
        const board2 = adapter.createBoard(normalizeBoardConfig(Object.assign({}, cfg, { minParticipants: 3 })));
        adapter.addItem(board2, s1, { text: 'First in' });
        adapter.addItem(board2, s2, { text: 'Second in' });
        const belowFloor = adapter.listVisible(board2, s1).map((i) => i.text);
        record('K_ANONYMITY_FLOOR',
            belowFloor.indexOf('Second in') === -1 && belowFloor.indexOf('First in') !== -1,
            belowFloor.join(' | '));

        // EXPIRY_IS_READ_ONLY
        const expiredCfg = normalizeBoardConfig(Object.assign({}, cfg, { expiresAt: new Date(Date.now() - 60000).toISOString() }));
        const board3 = adapter.createBoard(expiredCfg);
        const afterExpiry = adapter.addItem(board3, s1, { text: 'Too late' });
        record('EXPIRY_IS_READ_ONLY', afterExpiry && afterExpiry.ok === false, afterExpiry && afterExpiry.reason);

        // BOARD_CAP / PARTICIPANT_CAP are asserted structurally: authorize() owns
        // them, and every adapter routes writes through it. A transport that
        // enforces them differently fails the shared authorize() check below.
        const capBoard = { config: Object.assign({}, cfg, { boardCap: 1 }), items: [{ uid: 'S-9', text: 'x', status: 'approved' }] };
        record('BOARD_CAP', authorize(s1, 'create', capBoard, { text: 'y' }).ok === false);
        const many = []; for (let i = 0; i < LIMITS.PARTICIPANTS; i++) many.push({ uid: 'U-' + i, text: 'q', status: 'approved' });
        record('PARTICIPANT_CAP', authorize(s1, 'create', { config: cfg, items: many }, { text: 'y' }).ok === false);

        const covered = new Set(results.map((r) => r.invariant));
        INVARIANTS.forEach((inv) => { if (!covered.has(inv.id)) record(inv.id, false, 'NOT COVERED BY SUITE'); });

        return { ok: results.every((r) => r.ok), results };
    }

    // ── Reference adapter ───────────────────────────────────────────────────
    // In-memory, no transport. Exists so the conformance suite is self-testing
    // before either real backend exists, and so Phase 1a/1b have a known-good
    // implementation to diff their behaviour against.
    function createReferenceAdapter() {
        return {
            createBoard(config) { return { config, items: [] }; },
            snapshot(board) { return { config: board.config, items: board.items.slice() }; },
            listVisible(board, actor) { return visibleItemsFor(actor, board); },
            addItem(board, actor, payload) {
                const verdict = authorize(actor, 'create', board, payload);
                if (!verdict.ok) return verdict;
                const item = normalizeItem(payload, actor);
                if (!item) return { ok: false, reason: 'empty-text' };
                item.id = 'Q-' + (board.items.length + 1);
                board.items.push(item);
                return { ok: true, id: item.id };
            },
            setStatus(board, actor, itemId, status) {
                const verdict = authorize(actor, 'setStatus', board, null);
                if (!verdict.ok) return verdict;
                const item = board.items.filter((i) => i.id === itemId)[0];
                if (!item) return { ok: false, reason: 'no-item' };
                item.status = status === 'approved' ? 'approved' : (status === 'rejected' ? 'rejected' : 'held');
                return { ok: true };
            }
        };
    }

    return {
        VERSION,
        LIMITS,
        INVARIANTS,
        sanitizeText,
        normalizeBoardConfig,
        normalizeActor,
        normalizeItem,
        markAnswered,
        visibleItemsFor,
        authorize,
        isExpired,
        estimateBoardBytes,
        runConformanceSuite,
        createReferenceAdapter
    };
});
