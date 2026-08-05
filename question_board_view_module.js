/*
 * AlloFlow Driving Questions Board — student surface (Phase 2).
 *
 * Hand-authored React.createElement rather than a source.jsx/builder pair: this
 * module has no JSX-heavy layout and staying builder-free keeps it directly
 * requireable by tests.
 *
 * Three decisions carried in from the spec, each recorded where it applies:
 *
 *  - §9.1 — the annotation suite's NoteBubble is NOT reused. Its two expensive
 *    capabilities (keyboard drag, inline editing) are both out of scope here:
 *    a board has no canvas, and a participant cannot edit after posting because
 *    approved text must not be swappable. Only the palette is borrowed, and it
 *    now carries MEANING (open vs answered) instead of author decoration.
 *
 *  - §10.4b — on Canvas the Firestore rules are inert, so a teacher_review
 *    board there cannot actually keep held questions out of a determined
 *    participant's reach. The view refuses to render a promise the transport
 *    cannot keep; it says what is true instead. See moderationNotice().
 *
 *  - Visibility is never recomputed here. buildBoardViewModel delegates to the
 *    contract's visibleItemsFor, so the UI cannot drift from the two backends.
 */
(function registerQuestionBoardView(root, factory) {
    const api = factory(root || (typeof globalThis !== 'undefined' ? globalThis : {}));
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) {
        root.AlloModules = root.AlloModules || {};
        root.AlloModules.QuestionBoardView = api;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function createQuestionBoardView(root) {
    'use strict';

    function React() {
        return (root && root.React) || (typeof globalThis !== 'undefined' && globalThis.React) || null;
    }
    const h = function () {
        const R = React();
        if (!R) return null;
        return R.createElement.apply(R, arguments);
    };

    // Borrowed from annotation_suite NOTE_COLORS — already contrast-checked —
    // but re-keyed by MEANING. A board's colour answers "has this been dealt
    // with?", which is the question a sticky note cannot answer for you.
    const STATE_COLORS = {
        open:     { fill: '#fef9c3', border: '#facc15', text: '#713f12', label: 'Open' },
        answered: { fill: '#dcfce7', border: '#4ade80', text: '#14532d', label: 'Answered' },
        pending:  { fill: '#dbeafe', border: '#60a5fa', text: '#1e3a8a', label: 'Waiting for your teacher' }
    };

    // Never call a bare t(): a free t() is a ReferenceError inside a CDN module,
    // and a single-arg t() renders "undefined" on a miss. Always key + fallback.
    function translator(props) {
        const t = props && props.t;
        return function (key, fallback) {
            if (typeof t !== 'function') return fallback;
            try {
                const value = t(key, fallback);
                return (typeof value === 'string' && value && value !== key) ? value : fallback;
            } catch (e) { return fallback; }
        };
    }

    function itemState(item) {
        if (item && item.answered) return 'answered';
        if (item && item.status !== 'approved') return 'pending';
        return 'open';
    }

    /**
     * Says what is TRUE about moderation on this transport, rather than what we
     * wish were true. On Canvas the rules are inert (§10.4b), so a
     * teacher_review board is a UI convention, not a security boundary, and the
     * teacher deserves to know that before relying on it.
     */
    function moderationNotice(config, transport) {
        if (!config || config.revealPolicy !== 'teacher_review') return null;
        if (transport === 'firestore-canvas') {
            return {
                tone: 'warning',
                text: 'Questions are held for your review before classmates see them in this view. '
                    + 'On this connection that is a display rule, not a database one, so treat it as '
                    + 'tidiness rather than privacy. Use the Class Mailbox connection if you need held '
                    + 'questions genuinely restricted.'
            };
        }
        return { tone: 'info', text: 'Questions are held for your review before classmates see them.' };
    }

    /**
     * Pure view model. Everything the surface renders is derived here so it can
     * be tested without a DOM, and so visibility comes from ONE place.
     */
    function buildBoardViewModel(contract, board, actor, options) {
        const opts = options || {};
        const config = (board && board.config) || {};
        const visible = contract.visibleItemsFor(actor, board) || [];
        const isHost = actor && actor.role === 'host';
        const mine = visible.filter(function (i) { return i.uid === (actor && actor.uid); });
        const peers = visible.filter(function (i) { return i.uid !== (actor && actor.uid); });
        const perStudent = config.itemsPerStudent || 0;
        const expired = contract.isExpired(board);
        const capacity = boardCapacity(contract, board);

        const allItems = (board && board.items) || [];
        const authors = {};
        allItems.forEach(function (i) { if (i && i.uid) authors[i.uid] = true; });
        const authorCount = Object.keys(authors).length;
        const floor = config.minParticipants || 3;

        return {
            prompt: config.prompt || '',
            isHost: !!isHost,
            expired: expired,
            canPost: !expired && !isHost && mine.length < perStudent && !capacity.full,
            remaining: Math.max(0, perStudent - mine.length),
            myItems: mine,
            peerItems: peers,
            openCount: visible.filter(function (i) { return itemState(i) === 'open'; }).length,
            answeredCount: visible.filter(function (i) { return itemState(i) === 'answered'; }).length,
            // Below the floor a student sees only their own questions. Say so,
            // rather than letting the board look mysteriously empty.
            floorPending: !isHost && authorCount < floor,
            floorNeeds: Math.max(0, floor - authorCount),
            capacity: capacity,
            // A disabled composer with no explanation reads as a broken app.
            blockReason: postingBlockReason(contract, board, actor, capacity),
            moderation: moderationNotice(config, opts.transport)
        };
    }

    // A static card. Not draggable, not editable — see the header note.
    function QuestionCard(props) {
        const item = props.item || {};
        const state = itemState(item);
        const palette = STATE_COLORS[state];
        const tr = translator(props);
        const isOwn = !!props.isOwn;
        return h('li', {
            key: item.id,
            className: 'rounded-lg border p-3 text-sm',
            style: { background: palette.fill, borderColor: palette.border, color: palette.text },
            // The state is colour-coded, so it must also be readable without
            // colour — the label goes in the accessible name, not just the swatch.
            'aria-label': (isOwn ? tr('question_board.yours', 'Your question') : tr('question_board.classmate', 'Classmate question'))
                + ': ' + (item.text || '') + '. ' + palette.label + '.'
        }, [
            h('p', { key: 'text', className: 'font-medium' }, item.text || ''),
            h('p', { key: 'meta', className: 'mt-1 text-xs opacity-80' }, [
                h('span', { key: 'state' }, palette.label),
                isOwn ? h('span', { key: 'own' }, ' · ' + tr('question_board.yours', 'Your question')) : null,
                (!isOwn && item.displayName) ? h('span', { key: 'who' }, ' · ' + item.displayName) : null
            ]),
            (item.answered && item.answered.note)
                ? h('p', { key: 'answer', className: 'mt-2 text-xs' }, item.answered.note)
                : null
        ]);
    }

    function QuestionBoardStudent(props) {
        const R = React();
        if (!R) return null;
        const contract = props.contract;
        const tr = translator(props);
        const vm = buildBoardViewModel(contract, props.board, props.actor, { transport: props.transport });
        const draft = props.draft || '';

        const submit = function () {
            if (!vm.canPost) return;
            const text = String(draft).trim();
            if (!text) return;
            if (typeof props.onPost === 'function') props.onPost(text);
        };

        return h('section', { className: 'space-y-3', 'aria-label': tr('question_board.title', 'Driving questions board') }, [
            h('h2', { key: 'prompt', className: 'text-base font-bold' }, vm.prompt),

            vm.moderation ? h('p', {
                key: 'moderation',
                role: 'note',
                className: vm.moderation.tone === 'warning'
                    ? 'rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900'
                    : 'rounded border border-slate-300 bg-slate-50 p-2 text-xs text-slate-700'
            }, vm.moderation.text) : null,

            vm.expired ? h('p', {
                key: 'closed', role: 'status',
                className: 'rounded border border-slate-300 bg-slate-50 p-2 text-xs text-slate-700'
            }, tr('question_board.closed', 'This board is closed. You can still read the questions.')) : null,

            // Composer. A real <button>, never a div with role+tabIndex — those
            // are keyboard-dead, and an aria-label on a role-less div is dropped.
            (!vm.isHost && !vm.expired) ? h('div', { key: 'composer', className: 'space-y-1' }, [
                h('label', { key: 'label', className: 'block text-xs font-medium', htmlFor: 'allo-qb-input' },
                    tr('question_board.ask', 'What do you wonder?')),
                h('textarea', {
                    key: 'input',
                    id: 'allo-qb-input',
                    value: draft,
                    rows: 2,
                    maxLength: contract.LIMITS.ITEM_CHARS,
                    disabled: !vm.canPost,
                    onChange: function (e) { if (typeof props.onDraft === 'function') props.onDraft(e.target.value); },
                    className: 'w-full rounded border p-2 text-sm'
                }),
                h('div', { key: 'row', className: 'flex items-center justify-between' }, [
                    h('span', { key: 'left', className: 'text-xs opacity-70' },
                        vm.canPost
                            ? tr('question_board.remaining', 'Questions you can still add') + ': ' + vm.remaining
                            : (vm.blockReason === 'board-full'
                                ? tr('question_board.board_full', 'This board is full. Ask your teacher to start a new one.')
                                : vm.blockReason === 'closed'
                                    ? tr('question_board.closed_short', 'This board is closed.')
                                    : tr('question_board.cap', 'You have added all your questions for this board.'))),
                    h('button', {
                        key: 'post', type: 'button', onClick: submit, disabled: !vm.canPost || !String(draft).trim(),
                        className: 'rounded bg-indigo-700 px-3 py-1 text-sm font-bold text-white disabled:opacity-50'
                    }, tr('question_board.post', 'Add my question'))
                ])
            ]) : null,

            h('p', { key: 'counts', role: 'status', className: 'text-xs opacity-70' },
                vm.openCount + ' ' + tr('question_board.open', 'open') + ' · '
                + vm.answeredCount + ' ' + tr('question_board.answered', 'answered')),

            vm.myItems.length ? h('ul', { key: 'mine', className: 'space-y-2' },
                vm.myItems.map(function (item) { return QuestionCard({ item: item, isOwn: true, t: props.t }); })) : null,

            // An empty-looking board is confusing; name the reason.
            vm.floorPending ? h('p', {
                key: 'floor', role: 'status', className: 'text-xs opacity-70'
            }, tr('question_board.floor', 'Classmates’ questions appear once a few more people have posted.')) : null,

            vm.peerItems.length ? h('ul', { key: 'peers', className: 'space-y-2' },
                vm.peerItems.map(function (item) { return QuestionCard({ item: item, isOwn: false, t: props.t }); })) : null
        ]);
    }


    // ── Phase 4: capacity, expiry, export ───────────────────────────────────

    /**
     * How full is this board? Two independent ceilings — the item count the
     * teacher chose, and the 85KB document limit that is the dominant design
     * constraint (spec §3). The byte one is the one that surprises people, so
     * it is reported rather than left to fail at submit time.
     */
    function boardCapacity(contract, board) {
        const items = (board && board.items) || [];
        const cap = ((board && board.config) || {}).boardCap || 0;
        const bytes = contract.estimateBoardBytes(board);
        const byteCap = contract.LIMITS.DOC_BYTES;
        const byCount = cap ? items.length / cap : 0;
        const byBytes = byteCap ? bytes / byteCap : 0;
        const worst = Math.max(byCount, byBytes);
        return {
            used: items.length,
            cap: cap,
            bytes: bytes,
            byteCap: byteCap,
            fraction: worst,
            // "Full" means the NEXT post would be refused, by either ceiling.
            full: (cap > 0 && items.length >= cap) || bytes >= byteCap,
            nearFull: worst >= 0.85 && worst < 1,
            limitedBy: byBytes >= byCount ? 'bytes' : 'count'
        };
    }

    /**
     * The export a teacher actually wants: what the class asked, and what the
     * unit never got to. The unanswered list is the point — it is the only
     * artifact here a physical board cannot produce.
     *
     * Names are INCLUDED by default. The board is not anonymous (spec §8.1),
     * the teacher already sees who asked what, and a planning record without
     * names loses the ability to follow up with a particular student. Pass
     * includeNames:false when the record is leaving the classroom.
     */
    function exportBoardRecord(contract, board, options) {
        const opts = options || {};
        const includeNames = opts.includeNames !== false;
        const config = (board && board.config) || {};
        const items = ((board && board.items) || []).filter(function (i) { return i && i.status === 'approved'; });
        const answered = items.filter(function (i) { return !!i.answered; });
        const open = items.filter(function (i) { return !i.answered; });
        const who = function (i) { return (includeNames && i.displayName) ? ' — ' + i.displayName : ''; };

        const lines = [];
        lines.push('# ' + (config.prompt || 'Driving questions board'));
        lines.push('');
        lines.push(String(items.length) + ' questions from ' + countAuthors(items) + ' students · '
            + String(answered.length) + ' answered · ' + String(open.length) + ' still open');
        if (config.expiresAt) lines.push('Board closed: ' + config.expiresAt);
        lines.push('');
        lines.push('## Still open');
        if (!open.length) lines.push('_None — every question was answered._');
        open.forEach(function (i) { lines.push('- ' + i.text + who(i)); });
        lines.push('');
        lines.push('## Answered');
        if (!answered.length) lines.push('_None yet._');
        answered.forEach(function (i) {
            lines.push('- ' + i.text + who(i));
            if (i.answered && i.answered.note) lines.push('  - ' + i.answered.note);
        });

        return {
            markdown: lines.join('\n') + '\n',
            stats: {
                total: items.length,
                answered: answered.length,
                open: open.length,
                students: countAuthors(items),
                includedNames: includeNames
            }
        };
    }

    function countAuthors(items) {
        const seen = {};
        (items || []).forEach(function (i) { if (i && i.uid) seen[i.uid] = true; });
        return Object.keys(seen).length;
    }

    /** What to tell a student who cannot post right now, and why. */
    function postingBlockReason(contract, board, actor, capacity) {
        if (contract.isExpired(board)) return 'closed';
        if (capacity && capacity.full) return 'board-full';
        const config = (board && board.config) || {};
        const mine = ((board && board.items) || []).filter(function (i) { return i && i.uid === (actor && actor.uid); });
        if (mine.length >= (config.itemsPerStudent || 0)) return 'own-cap';
        return null;
    }
    // ── Phase 3: teacher surface ────────────────────────────────────────────

    /**
     * Validates a board the teacher is composing. Returns {config} or {errors},
     * never a half-valid config — normalizeBoardConfig returns null for anything
     * unusable, which is useless for telling a teacher WHAT is wrong, so the
     * field-level reasons are produced here and the contract still has the final say.
     */
    function validateNewBoard(contract, draft) {
        const d = draft || {};
        const errors = {};
        const prompt = contract.sanitizeText(d.prompt, contract.LIMITS.PROMPT_CHARS);
        if (!prompt) errors.prompt = 'Give the board a driving question.';
        const per = parseInt(d.itemsPerStudent, 10);
        if (d.itemsPerStudent != null && (!isFinite(per) || per < 1)) {
            errors.itemsPerStudent = 'Each student needs at least one question.';
        }
        if (d.expiresAt && isNaN(Date.parse(d.expiresAt))) errors.expiresAt = 'That end date is not a real date.';
        if (Object.keys(errors).length) return { errors: errors, config: null };
        const config = contract.normalizeBoardConfig({
            activityId: d.activityId,
            type: 'question_board',
            prompt: prompt,
            revealPolicy: d.revealPolicy,
            minParticipants: d.minParticipants,
            itemsPerStudent: d.itemsPerStudent,
            boardCap: d.boardCap,
            expiresAt: d.expiresAt
        });
        // A null here means the activityId was malformed — a caller bug, not a
        // teacher one, so it must not be reported as a form error.
        if (!config) return { errors: { activityId: 'This board could not be created. Try again.' }, config: null };
        return { errors: {}, config: config };
    }

    /**
     * The teacher view model. The open/answered split is the point of the whole
     * feature — it is the bookkeeping a physical board cannot do — so it is
     * computed here rather than left to the component.
     */
    function buildTeacherViewModel(contract, board, actor, options) {
        const opts = options || {};
        const config = (board && board.config) || {};
        const isHost = !!(actor && actor.role === 'host');
        // Host visibility still comes from the contract, so the teacher panel
        // cannot invent a different answer from the student one.
        const all = isHost ? (contract.visibleItemsFor(actor, board) || []) : [];
        const needsReview = all.filter(function (i) { return i.status !== 'approved'; });
        const approved = all.filter(function (i) { return i.status === 'approved'; });
        const answered = approved.filter(function (i) { return !!i.answered; });
        const open = approved.filter(function (i) { return !i.answered; });
        const authors = {};
        all.forEach(function (i) { if (i && i.uid) authors[i.uid] = true; });
        return {
            isHost: isHost,
            prompt: config.prompt || '',
            expired: contract.isExpired(board),
            needsReview: needsReview,
            open: open,
            answered: answered,
            total: all.length,
            participantCount: Object.keys(authors).length,
            // The number a teacher actually acts on at the end of a unit.
            unansweredCount: open.length,
            capacity: boardCapacity(contract, board),
            moderation: moderationNotice(config, opts.transport),
            reviewMode: config.revealPolicy === 'teacher_review'
        };
    }

    function ReviewRow(props) {
        const item = props.item || {};
        const tr = translator(props);
        return h('li', {
            key: item.id,
            className: 'flex items-start justify-between gap-2 rounded border border-slate-300 bg-white p-2 text-sm'
        }, [
            h('div', { key: 'text' }, [
                h('p', { key: 'q' }, item.text || ''),
                h('p', { key: 'who', className: 'text-xs opacity-70' }, item.displayName || '')
            ]),
            h('div', { key: 'actions', className: 'flex shrink-0 gap-1' }, [
                h('button', {
                    key: 'approve', type: 'button',
                    onClick: function () { if (props.onApprove) props.onApprove(item); },
                    className: 'rounded bg-emerald-700 px-2 py-1 text-xs font-bold text-white'
                }, tr('question_board.approve', 'Show to class')),
                h('button', {
                    key: 'hide', type: 'button',
                    onClick: function () { if (props.onHide) props.onHide(item); },
                    className: 'rounded border border-slate-400 px-2 py-1 text-xs font-bold'
                }, tr('question_board.hide', 'Keep hidden'))
            ])
        ]);
    }

    function AnswerRow(props) {
        const item = props.item || {};
        const tr = translator(props);
        const done = !!item.answered;
        const palette = STATE_COLORS[done ? 'answered' : 'open'];
        return h('li', {
            key: item.id,
            className: 'flex items-start justify-between gap-2 rounded border p-2 text-sm',
            style: { background: palette.fill, borderColor: palette.border, color: palette.text },
            'aria-label': (item.text || '') + '. ' + palette.label + '.'
        }, [
            h('div', { key: 'text' }, [
                h('p', { key: 'q' }, item.text || ''),
                (done && item.answered.note)
                    ? h('p', { key: 'note', className: 'mt-1 text-xs' }, item.answered.note)
                    : null
            ]),
            h('button', {
                key: 'toggle', type: 'button',
                onClick: function () { if (props.onToggleAnswered) props.onToggleAnswered(item, !done); },
                className: 'shrink-0 rounded border px-2 py-1 text-xs font-bold',
                style: { borderColor: palette.border }
            }, done ? tr('question_board.reopen', 'Reopen') : tr('question_board.mark_answered', 'Mark answered'))
        ]);
    }

    function QuestionBoardTeacher(props) {
        const R = React();
        if (!R) return null;
        const contract = props.contract;
        const tr = translator(props);
        const vm = buildTeacherViewModel(contract, props.board, props.actor, { transport: props.transport });

        // Defence in depth: the contract already refuses non-host moderation and
        // both backends enforce it, but a teacher panel rendered for a student
        // would be a bug worth failing loudly rather than rendering empty.
        if (!vm.isHost) {
            return h('p', { role: 'alert', className: 'text-sm' },
                tr('question_board.host_only', 'Only the teacher who created this board can review it.'));
        }

        return h('section', { className: 'space-y-3', 'aria-label': tr('question_board.teacher_title', 'Driving questions board — teacher view') }, [
            h('h2', { key: 'prompt', className: 'text-base font-bold' }, vm.prompt),

            vm.moderation ? h('p', {
                key: 'moderation', role: 'note',
                className: vm.moderation.tone === 'warning'
                    ? 'rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900'
                    : 'rounded border border-slate-300 bg-slate-50 p-2 text-xs text-slate-700'
            }, vm.moderation.text) : null,

            vm.expired ? h('p', {
                key: 'closed', role: 'status',
                className: 'rounded border border-slate-300 bg-slate-50 p-2 text-xs text-slate-700'
            }, tr('question_board.closed_teacher', 'This board is closed. It is a record now — students cannot add to it.')) : null,

            (vm.capacity.full || vm.capacity.nearFull) ? h('p', {
                key: 'capacity', role: 'status',
                className: vm.capacity.full
                    ? 'rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900'
                    : 'rounded border border-slate-300 bg-slate-50 p-2 text-xs text-slate-700'
            }, vm.capacity.full
                ? tr('question_board.full_teacher', 'This board is full — students cannot add more. Mark questions answered or start a board for the next unit.')
                : tr('question_board.nearly_full', 'This board is nearly full.')) : null,

            // The headline number: what the unit has NOT answered yet.
            h('p', { key: 'counts', role: 'status', className: 'text-sm' },
                vm.unansweredCount + ' ' + tr('question_board.still_open', 'still open') + ' · '
                + vm.answered.length + ' ' + tr('question_board.answered', 'answered') + ' · '
                + vm.participantCount + ' ' + tr('question_board.students_posted', 'students posted')),

            vm.needsReview.length ? h('div', { key: 'queue' }, [
                h('h3', { key: 'h', className: 'text-sm font-bold' },
                    tr('question_board.queue', 'Waiting for you') + ' (' + vm.needsReview.length + ')'),
                h('ul', { key: 'list', className: 'mt-1 space-y-1' }, vm.needsReview.map(function (item) {
                    return ReviewRow({ item: item, t: props.t, onApprove: props.onApprove, onHide: props.onHide });
                }))
            ]) : null,

            vm.open.length ? h('div', { key: 'open' }, [
                h('h3', { key: 'h', className: 'text-sm font-bold' }, tr('question_board.open_heading', 'Open questions')),
                h('ul', { key: 'list', className: 'mt-1 space-y-1' }, vm.open.map(function (item) {
                    return AnswerRow({ item: item, t: props.t, onToggleAnswered: props.onToggleAnswered });
                }))
            ]) : null,

            vm.answered.length ? h('div', { key: 'answered' }, [
                h('h3', { key: 'h', className: 'text-sm font-bold' }, tr('question_board.answered_heading', 'Answered')),
                h('ul', { key: 'list', className: 'mt-1 space-y-1' }, vm.answered.map(function (item) {
                    return AnswerRow({ item: item, t: props.t, onToggleAnswered: props.onToggleAnswered });
                }))
            ]) : null,

            (!vm.total) ? h('p', { key: 'empty', className: 'text-sm opacity-70' },
                tr('question_board.empty', 'No questions yet. Share the board code with your class.')) : null
        ]);
    }
    return {
        VERSION: 1,
        STATE_COLORS,
        itemState,
        moderationNotice,
        buildBoardViewModel,
        QuestionCard,
        QuestionBoardStudent,
        boardCapacity,
        exportBoardRecord,
        postingBlockReason,
        validateNewBoard,
        buildTeacherViewModel,
        ReviewRow,
        AnswerRow,
        QuestionBoardTeacher
    };
});
