// Phase 3 — the teacher surface: create, moderate, mark answered.
//
// The assertions worth having here are about the open/answered split, because
// that bookkeeping is the entire reason this feature beats a physical board,
// and about host-only-ness, because a teacher panel that renders for a student
// would leak every held question at once.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
let C, V, renderToStaticMarkup;

beforeAll(() => {
  C = require(resolve(process.cwd(), 'question_board_contract_module.js'));
  const webRequire = createRequire(resolve(process.cwd(), 'desktop/web-app/package.json'));
  globalThis.React = webRequire('react');
  renderToStaticMarkup = webRequire('react-dom/server').renderToStaticMarkup;
  V = require(resolve(process.cwd(), 'question_board_view_module.js'));
});

const ID = 'AC-0123abcd-0123-4567-89ab-0123456789ab';
const cfg = (over) => C.normalizeBoardConfig(Object.assign({
  activityId: ID, type: 'question_board',
  prompt: 'What do you wonder about ecosystems?',
  minParticipants: 3, itemsPerStudent: 2, boardCap: 50
}, over || {}));

const HOST = { uid: 'T-1', role: 'host', displayName: 'Teacher' };
const S1 = { uid: 'S-1', role: 'participant', displayName: 'Ada' };

const board = (over) => Object.assign({
  config: cfg(),
  items: [
    { id: 'Q1', uid: 'S-1', displayName: 'Ada', text: 'Why do wolves matter?', status: 'approved', answered: false },
    { id: 'Q2', uid: 'S-2', displayName: 'Ben', text: 'What eats algae?', status: 'approved',
      answered: { at: 1, note: 'We covered this Tuesday' } },
    { id: 'Q3', uid: 'S-3', displayName: 'Cal', text: 'Held one', status: 'held', answered: false }
  ]
}, over || {});

describe('creating a board tells the teacher what is wrong', () => {
  it('rejects an empty driving question with a reason, not a null', () => {
    const r = V.validateNewBoard(C, { activityId: ID, prompt: '   ' });
    expect(r.config).toBeNull();
    expect(r.errors.prompt).toMatch(/driving question/i);
  });

  it('rejects a nonsense end date', () => {
    const r = V.validateNewBoard(C, { activityId: ID, prompt: 'p', expiresAt: 'next Tuesday-ish' });
    expect(r.errors.expiresAt).toBeTruthy();
  });

  it('rejects zero questions per student', () => {
    const r = V.validateNewBoard(C, { activityId: ID, prompt: 'p', itemsPerStudent: 0 });
    expect(r.errors.itemsPerStudent).toBeTruthy();
  });

  it('produces a contract-valid config for a good draft', () => {
    const r = V.validateNewBoard(C, { activityId: ID, prompt: 'What do you wonder?', itemsPerStudent: 3 });
    expect(r.errors).toEqual({});
    expect(r.config.type).toBe('question_board');
    expect(r.config.itemsPerStudent).toBe(3);
    expect(r.config.revealPolicy).toBe('auto_publish');
  });

  it('does not report a caller bug as a teacher form error on the prompt', () => {
    const r = V.validateNewBoard(C, { activityId: 'not-a-uuid', prompt: 'fine prompt' });
    expect(r.config).toBeNull();
    expect(r.errors.prompt).toBeUndefined();
    expect(r.errors.activityId).toBeTruthy();
  });
});

describe('the open/answered split — the reason this beats a sticky note', () => {
  it('separates review queue, open, and answered', () => {
    const vm = V.buildTeacherViewModel(C, board(), HOST, {});
    expect(vm.needsReview.map((i) => i.id)).toEqual(['Q3']);
    expect(vm.open.map((i) => i.id)).toEqual(['Q1']);
    expect(vm.answered.map((i) => i.id)).toEqual(['Q2']);
  });

  it('reports the number a teacher actually acts on at the end of a unit', () => {
    expect(V.buildTeacherViewModel(C, board(), HOST, {}).unansweredCount).toBe(1);
  });

  it('counts distinct students who posted, not questions', () => {
    expect(V.buildTeacherViewModel(C, board(), HOST, {}).participantCount).toBe(3);
  });

  it('an answered question leaves the open list and keeps its note', () => {
    const vm = V.buildTeacherViewModel(C, board(), HOST, {});
    expect(vm.open.map((i) => i.id)).not.toContain('Q2');
    expect(vm.answered[0].answered.note).toBe('We covered this Tuesday');
  });
});

describe('host-only, defended in depth', () => {
  it('gives a student no items at all through the teacher model', () => {
    const vm = V.buildTeacherViewModel(C, board(), S1, {});
    expect(vm.isHost).toBe(false);
    expect(vm.needsReview).toEqual([]);
    expect(vm.open).toEqual([]);
    expect(vm.answered).toEqual([]);
  });

  it('renders a refusal rather than an empty panel if mounted for a student', () => {
    const html = renderToStaticMarkup(V.QuestionBoardTeacher({ contract: C, board: board(), actor: S1 }));
    expect(html).toContain('role="alert"');
    expect(html).toContain('Only the teacher');
    expect(html).not.toContain('Held one');       // the held question must not leak
  });

  it('shows the host every item including held ones', () => {
    const html = renderToStaticMarkup(V.QuestionBoardTeacher({ contract: C, board: board(), actor: HOST }));
    expect(html).toContain('Held one');
    expect(html).toContain('Why do wolves matter?');
  });
});

describe('moderation and answering are real controls', () => {
  it('offers approve and hide on a queued question', () => {
    const html = renderToStaticMarkup(V.QuestionBoardTeacher({ contract: C, board: board(), actor: HOST }));
    expect(html).toContain('Show to class');
    expect(html).toContain('Keep hidden');
  });

  it('offers mark-answered on open questions and reopen on answered ones', () => {
    const html = renderToStaticMarkup(V.QuestionBoardTeacher({ contract: C, board: board(), actor: HOST }));
    expect(html).toContain('Mark answered');
    expect(html).toContain('Reopen');
  });

  it('uses buttons, never a div with a role', () => {
    const html = renderToStaticMarkup(V.QuestionBoardTeacher({ contract: C, board: board(), actor: HOST }));
    expect(html).toContain('<button');
    expect(html).not.toMatch(/<div[^>]*role="button"/);
  });

  it('wires the callbacks to the right item', () => {
    const seen = [];
    const row = V.ReviewRow({ item: { id: 'Q3', text: 'x' }, onApprove: (i) => seen.push('approve:' + i.id) });
    // The handler is on the element props; invoke it the way React would.
    const approveBtn = row.props.children[1].props.children[0];
    approveBtn.props.onClick();
    expect(seen).toEqual(['approve:Q3']);
  });

  it('toggles answered in the direction the item is NOT currently in', () => {
    const calls = [];
    const openRow = V.AnswerRow({ item: { id: 'A', text: 'x', answered: false }, onToggleAnswered: (i, next) => calls.push(next) });
    openRow.props.children[1].props.onClick();
    const doneRow = V.AnswerRow({ item: { id: 'B', text: 'y', answered: { at: 1 } }, onToggleAnswered: (i, next) => calls.push(next) });
    doneRow.props.children[1].props.onClick();
    expect(calls).toEqual([true, false]);
  });
});

describe('the teacher sees the same honesty notice as the student (§10.4b)', () => {
  it('warns on Canvas Firestore with teacher_review', () => {
    const b = board({ config: cfg({ revealPolicy: 'teacher_review' }) });
    const html = renderToStaticMarkup(V.QuestionBoardTeacher({ contract: C, board: b, actor: HOST, transport: 'firestore-canvas' }));
    expect(html).toContain('tidiness rather than privacy');
  });

  it('states it plainly on the mailbox', () => {
    const b = board({ config: cfg({ revealPolicy: 'teacher_review' }) });
    const html = renderToStaticMarkup(V.QuestionBoardTeacher({ contract: C, board: b, actor: HOST, transport: 'mailbox' }));
    expect(html).toContain('held for your review');
    expect(html).not.toContain('tidiness rather than privacy');
  });
});

describe('an empty board says what to do next', () => {
  it('tells the teacher to share the code rather than showing nothing', () => {
    const html = renderToStaticMarkup(V.QuestionBoardTeacher({ contract: C, board: board({ items: [] }), actor: HOST }));
    expect(html).toContain('Share the board code');
  });
});
