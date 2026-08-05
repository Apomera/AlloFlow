// Phase 4 — export, capacity, and the closed-board state.
//
// The export test that matters is the unanswered list: that is the only
// artifact here a physical board cannot produce, and it is the thing a teacher
// carries into next year's planning.

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
  activityId: ID, type: 'question_board', prompt: 'What do you wonder about ecosystems?',
  minParticipants: 3, itemsPerStudent: 2, boardCap: 50
}, over || {}));

const HOST = { uid: 'T-1', role: 'host' };
const S1 = { uid: 'S-1', role: 'participant', displayName: 'Ada' };

const board = (over) => Object.assign({
  config: cfg(),
  items: [
    { id: 'Q1', uid: 'S-1', displayName: 'Ada', text: 'Why do wolves matter?', status: 'approved', answered: false },
    { id: 'Q2', uid: 'S-2', displayName: 'Ben', text: 'What eats algae?', status: 'approved',
      answered: { at: 1, note: 'Covered Tuesday' } },
    { id: 'Q3', uid: 'S-3', displayName: 'Cal', text: 'Held one', status: 'held', answered: false }
  ]
}, over || {});

describe('export is a record of what the unit did NOT answer', () => {
  it('leads with the counts a teacher needs', () => {
    const out = V.exportBoardRecord(C, board());
    expect(out.stats).toEqual({ total: 2, answered: 1, open: 1, students: 2, includedNames: true });
    expect(out.markdown).toContain('2 questions from 2 students · 1 answered · 1 still open');
  });

  it('lists the still-open questions, which is the point', () => {
    const md = V.exportBoardRecord(C, board()).markdown;
    const openSection = md.slice(md.indexOf('## Still open'), md.indexOf('## Answered'));
    expect(openSection).toContain('Why do wolves matter?');
    expect(openSection).not.toContain('What eats algae?');
  });

  it('carries the answer note alongside the answered question', () => {
    const md = V.exportBoardRecord(C, board()).markdown;
    expect(md).toContain('- What eats algae? — Ben');
    expect(md).toContain('  - Covered Tuesday');
  });

  it('excludes questions that were never approved', () => {
    expect(V.exportBoardRecord(C, board()).markdown).not.toContain('Held one');
  });

  it('says so plainly when everything was answered', () => {
    const done = board({ items: [
      { id: 'A', uid: 'S-1', text: 'q', status: 'approved', answered: { at: 1 } }
    ] });
    expect(V.exportBoardRecord(C, done).markdown).toContain('every question was answered');
  });

  it('includes names by default, since the board is not anonymous', () => {
    expect(V.exportBoardRecord(C, board()).markdown).toContain('— Ada');
  });

  it('strips names on request, for a record leaving the classroom', () => {
    const out = V.exportBoardRecord(C, board(), { includeNames: false });
    expect(out.markdown).not.toContain('Ada');
    expect(out.markdown).not.toContain('Ben');
    expect(out.markdown).toContain('Why do wolves matter?');
    expect(out.stats.includedNames).toBe(false);
  });

  it('survives an empty board without producing a broken document', () => {
    const md = V.exportBoardRecord(C, board({ items: [] })).markdown;
    expect(md).toContain('0 questions');
    expect(md).toContain('_None yet._');
  });
});

describe('capacity reports both ceilings, not just the obvious one', () => {
  it('is not full on a fresh board', () => {
    const cap = V.boardCapacity(C, board());
    expect(cap.full).toBe(false);
    expect(cap.cap).toBe(50);
  });

  it('fills by item count', () => {
    const items = [];
    for (let i = 0; i < 5; i++) items.push({ id: 'Q' + i, uid: 'S-1', text: 'q', status: 'approved' });
    const cap = V.boardCapacity(C, { config: cfg({ boardCap: 5 }), items });
    expect(cap.full).toBe(true);
    expect(cap.limitedBy).toBe('count');
  });

  it('fills by BYTES even when the item count is nowhere near the cap', () => {
    // The 85KB ceiling is the constraint that surprises people (spec §3).
    const items = [];
    for (let i = 0; i < 400; i++) {
      items.push({ id: 'Q' + i, uid: 'S-' + i, displayName: 'Student ' + i, status: 'approved',
        answered: false, createdAt: 1, text: 'x'.repeat(200) });
    }
    const cap = V.boardCapacity(C, { config: cfg({ boardCap: 5000 }), items });
    expect(cap.full).toBe(true);
    expect(cap.limitedBy).toBe('bytes');
    expect(cap.used).toBeLessThan(cap.cap);      // count alone would have said "fine"
  });

  it('warns before it is full, not only after', () => {
    const items = [];
    for (let i = 0; i < 9; i++) items.push({ id: 'Q' + i, uid: 'S-1', text: 'q', status: 'approved' });
    const cap = V.boardCapacity(C, { config: cfg({ boardCap: 10 }), items });
    expect(cap.nearFull).toBe(true);
    expect(cap.full).toBe(false);
  });
});

describe('a disabled composer always says why', () => {
  const full = () => {
    const items = [];
    for (let i = 0; i < 5; i++) items.push({ id: 'Q' + i, uid: 'S-9', text: 'q', status: 'approved' });
    return { config: cfg({ boardCap: 5 }), items };
  };

  it('distinguishes board-full from your-own-cap from closed', () => {
    expect(V.postingBlockReason(C, full(), S1, V.boardCapacity(C, full()))).toBe('board-full');

    const mineFull = board({ items: [
      { id: 'A', uid: 'S-1', text: 'a', status: 'approved' },
      { id: 'B', uid: 'S-1', text: 'b', status: 'approved' }
    ] });
    expect(V.postingBlockReason(C, mineFull, S1, V.boardCapacity(C, mineFull))).toBe('own-cap');

    const closed = board({ config: cfg({ expiresAt: new Date(Date.now() - 6e4).toISOString() }) });
    expect(V.postingBlockReason(C, closed, S1, V.boardCapacity(C, closed))).toBe('closed');
  });

  it('returns null when the student can actually post', () => {
    expect(V.postingBlockReason(C, board(), S1, V.boardCapacity(C, board()))).toBeNull();
  });

  it('tells the student the board is full rather than blaming their own limit', () => {
    const html = renderToStaticMarkup(V.QuestionBoardStudent({ contract: C, board: full(), actor: S1 }));
    expect(html).toContain('This board is full');
    expect(html).not.toContain('all your questions');
  });

  it('stops canPost when the BOARD is full even if the student has room', () => {
    const vm = V.buildBoardViewModel(C, full(), S1, {});
    expect(vm.remaining).toBeGreaterThan(0);   // the student personally has room
    expect(vm.canPost).toBe(false);            // but the board does not
  });
});

describe('a closed board reads as a record, not a broken surface', () => {
  const closed = () => board({ config: cfg({ expiresAt: new Date(Date.now() - 6e4).toISOString() }) });

  it('tells the teacher it is now a record', () => {
    const html = renderToStaticMarkup(V.QuestionBoardTeacher({ contract: C, board: closed(), actor: HOST }));
    expect(html).toContain('It is a record now');
  });

  it('still shows the questions after closing', () => {
    const html = renderToStaticMarkup(V.QuestionBoardTeacher({ contract: C, board: closed(), actor: HOST }));
    expect(html).toContain('Why do wolves matter?');
  });

  it('still exports after closing', () => {
    expect(V.exportBoardRecord(C, closed()).stats.total).toBe(2);
  });
});

describe('the modules are actually registered to ship and load', () => {
  const read = (p) => require('node:fs').readFileSync(resolve(process.cwd(), p), 'utf8');

  it('both modules are build-managed, so the deploy guards cover them', () => {
    const build = read('build.js');
    expect(build).toContain("filename: 'question_board_contract_module.js'");
    expect(build).toContain("filename: 'question_board_view_module.js'");
  });

  it('both are loaded by BOTH ANTI copies', () => {
    for (const p of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      const anti = read(p);
      expect(anti, p).toContain("loadModule('QuestionBoardContract'");
      expect(anti, p).toContain("loadModule('QuestionBoardView'");
    }
  });

  it('the loadModule name matches the AlloModules key it sets', () => {
    // Violating this makes every load false-alarm as a failure, per the
    // loadModule contract — the name is the registry key, not a label.
    const pairs = [
      ['question_board_contract_module.js', 'QuestionBoardContract'],
      ['question_board_view_module.js', 'QuestionBoardView']
    ];
    for (const [file, name] of pairs) {
      expect(read(file)).toContain('root.AlloModules.' + name + ' =');
      expect(read('AlloFlowANTI.txt')).toContain("loadModule('" + name + "'");
    }
  });
});

describe('the teacher is warned about capacity before students hit it', () => {
  it('shows a full-board notice', () => {
    const items = [];
    for (let i = 0; i < 5; i++) items.push({ id: 'Q' + i, uid: 'S-1', text: 'q', status: 'approved' });
    const html = renderToStaticMarkup(V.QuestionBoardTeacher({
      contract: C, board: { config: cfg({ boardCap: 5 }), items }, actor: HOST
    }));
    expect(html).toContain('This board is full');
    expect(html).toContain('start a board for the next unit');
  });

  it('says nothing on a board with plenty of room', () => {
    const html = renderToStaticMarkup(V.QuestionBoardTeacher({ contract: C, board: board(), actor: HOST }));
    expect(html).not.toContain('nearly full');
    expect(html).not.toContain('This board is full');
  });
});
