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

        const allItems = (board && board.items) || [];
        const authors = {};
        allItems.forEach(function (i) { if (i && i.uid) authors[i.uid] = true; });
        const authorCount = Object.keys(authors).length;
        const floor = config.minParticipants || 3;

        return {
            prompt: config.prompt || '',
            isHost: !!isHost,
            expired: expired,
            canPost: !expired && !isHost && mine.length < perStudent,
            remaining: Math.max(0, perStudent - mine.length),
            myItems: mine,
            peerItems: peers,
            openCount: visible.filter(function (i) { return itemState(i) === 'open'; }).length,
            answeredCount: visible.filter(function (i) { return itemState(i) === 'answered'; }).length,
            // Below the floor a student sees only their own questions. Say so,
            // rather than letting the board look mysteriously empty.
            floorPending: !isHost && authorCount < floor,
            floorNeeds: Math.max(0, floor - authorCount),
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
                            : tr('question_board.cap', 'You have added all your questions for this board.')),
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

    return {
        VERSION: 1,
        STATE_COLORS,
        itemState,
        moderationNotice,
        buildBoardViewModel,
        QuestionCard,
        QuestionBoardStudent
    };
});
