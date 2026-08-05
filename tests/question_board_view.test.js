// Phase 2 — the student surface.
//
// Split deliberately: the view MODEL is pure and tested directly, the rendered
// output is checked as static markup. That keeps the accessibility and honesty
// assertions cheap enough to be worth having, without a jsdom mount.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
let C, V, React, renderToStaticMarkup;

beforeAll(() => {
  C = require(resolve(process.cwd(), 'question_board_contract_module.js'));
  // React lives in the web-app workspace, not at the repo root — same harness
  // trick the existing react-dom mount tests use.
  const webRequire = createRequire(resolve(process.cwd(), 'desktop/web-app/package.json'));
  React = webRequire('react');
  globalThis.React = React;
  renderToStaticMarkup = webRequire('react-dom/server').renderToStaticMarkup;
  V = require(resolve(process.cwd(), 'question_board_view_module.js'));
});

const cfg = (over) => C.normalizeBoardConfig(Object.assign({
  activityId: 'AC-0123abcd-0123-4567-89ab-0123456789ab',
  type: 'question_board',
  prompt: 'What do you wonder about ecosystems?',
  minParticipants: 3, itemsPerStudent: 2, boardCap: 50
}, over || {}));

const S1 = { uid: 'S-1', role: 'participant', displayName: 'Ada' };
const HOST = { uid: 'T-1', role: 'host', displayName: 'Teacher' };

const board = (over) => Object.assign({
  config: cfg(),
  items: [
    { id: 'Q1', uid: 'S-1', text: 'Why do wolves matter?', status: 'approved', answered: false },
    { id: 'Q2', uid: 'S-2', text: 'What eats algae?', status: 'approved', answered: false, displayName: 'Ben' },
    { id: 'Q3', uid: 'S-3', text: 'Held one', status: 'held', answered: false }
  ]
}, over || {});

describe('the view never recomputes visibility', () => {
  it('shows a participant exactly what the contract shows', () => {
    const vm = V.buildBoardViewModel(C, board(), S1, {});
    const shown = vm.myItems.concat(vm.peerItems).map((i) => i.id).sort();
    const contract = C.visibleItemsFor(S1, board()).map((i) => i.id).sort();
    expect(shown).toEqual(contract);
    expect(shown).not.toContain('Q3');       // a peer's held question stays hidden
  });

  it('separates own from peers rather than mixing them', () => {
    const vm = V.buildBoardViewModel(C, board(), S1, {});
    expect(vm.myItems.map((i) => i.id)).toEqual(['Q1']);
    expect(vm.peerItems.map((i) => i.id)).toEqual(['Q2']);
  });
});

describe('posting limits are surfaced, not just enforced', () => {
  it('counts down the remaining questions', () => {
    const vm = V.buildBoardViewModel(C, board(), S1, {});
    expect(vm.remaining).toBe(1);            // itemsPerStudent 2, one already posted
    expect(vm.canPost).toBe(true);
  });

  it('closes posting at the cap', () => {
    const full = board({ items: [
      { id: 'A', uid: 'S-1', text: 'a', status: 'approved' },
      { id: 'B', uid: 'S-1', text: 'b', status: 'approved' }
    ] });
    const vm = V.buildBoardViewModel(C, full, S1, {});
    expect(vm.canPost).toBe(false);
    expect(vm.remaining).toBe(0);
  });

  it('closes posting after expiry but keeps the board readable', () => {
    const closed = board({ config: cfg({ expiresAt: new Date(Date.now() - 6e4).toISOString() }) });
    const vm = V.buildBoardViewModel(C, closed, S1, {});
    expect(vm.expired).toBe(true);
    expect(vm.canPost).toBe(false);
    expect(vm.myItems.length).toBeGreaterThan(0);
  });

  it('never offers the host a composer', () => {
    expect(V.buildBoardViewModel(C, board(), HOST, {}).canPost).toBe(false);
  });
});

describe('an empty-looking board explains itself', () => {
  it('names the k-anonymity floor instead of just showing nothing', () => {
    const thin = board({ items: [{ id: 'A', uid: 'S-1', text: 'a', status: 'approved' }] });
    const vm = V.buildBoardViewModel(C, thin, S1, {});
    expect(vm.floorPending).toBe(true);
    expect(vm.floorNeeds).toBe(2);
    const html = renderToStaticMarkup(V.QuestionBoardStudent({ contract: C, board: thin, actor: S1 }));
    expect(html).toContain('once a few more people have posted');
  });

  it('does not nag the host with it', () => {
    const thin = board({ items: [{ id: 'A', uid: 'S-1', text: 'a', status: 'approved' }] });
    expect(V.buildBoardViewModel(C, thin, HOST, {}).floorPending).toBe(false);
  });
});

describe('colour carries meaning, and never carries it alone', () => {
  it('maps state to the three palettes', () => {
    expect(V.itemState({ status: 'approved', answered: false })).toBe('open');
    expect(V.itemState({ status: 'approved', answered: { at: 1 } })).toBe('answered');
    expect(V.itemState({ status: 'held', answered: false })).toBe('pending');
  });

  it('puts the state in the accessible name, not only the swatch', () => {
    const html = renderToStaticMarkup(V.QuestionCard({ item: board().items[0], isOwn: true }));
    expect(html).toContain('aria-label');
    expect(html).toContain('Open');
    expect(html).toContain('Your question');
  });

  it('shows an answered question with its answer note', () => {
    const answered = { id: 'X', uid: 'S-1', text: 'q', status: 'approved', answered: { at: 1, note: 'We covered this Tuesday' } };
    const html = renderToStaticMarkup(V.QuestionCard({ item: answered, isOwn: true }));
    expect(html).toContain('Answered');
    expect(html).toContain('We covered this Tuesday');
  });
});

describe('§10.4b — the surface refuses to promise what the transport cannot keep', () => {
  it('warns honestly when teacher_review runs on Canvas Firestore', () => {
    const notice = V.moderationNotice(cfg({ revealPolicy: 'teacher_review' }), 'firestore-canvas');
    expect(notice.tone).toBe('warning');
    expect(notice.text).toContain('not a database one');
    expect(notice.text).toContain('Class Mailbox');
  });

  it('states it plainly on a transport that DOES enforce it', () => {
    const notice = V.moderationNotice(cfg({ revealPolicy: 'teacher_review' }), 'mailbox');
    expect(notice.tone).toBe('info');
    expect(notice.text).not.toContain('not a database one');
  });

  it('says nothing at all on an auto_publish board', () => {
    expect(V.moderationNotice(cfg({ revealPolicy: 'auto_publish' }), 'firestore-canvas')).toBeNull();
  });

  it('renders the warning where a teacher will see it', () => {
    const b = board({ config: cfg({ revealPolicy: 'teacher_review' }) });
    const html = renderToStaticMarkup(V.QuestionBoardStudent({ contract: C, board: b, actor: S1, transport: 'firestore-canvas' }));
    expect(html).toContain('tidiness rather than privacy');
  });
});

describe('controls are real controls', () => {
  it('uses a button element, not a div with a role', () => {
    const html = renderToStaticMarkup(V.QuestionBoardStudent({ contract: C, board: board(), actor: S1 }));
    expect(html).toContain('<button');
    expect(html).not.toMatch(/<div[^>]*role="button"/);
  });

  it('labels the composer with a real label bound to the field', () => {
    const html = renderToStaticMarkup(V.QuestionBoardStudent({ contract: C, board: board(), actor: S1 }));
    expect(html).toContain('for="allo-qb-input"');
    expect(html).toContain('id="allo-qb-input"');
  });

  it('caps input at the contract length rather than trusting the server to trim', () => {
    const html = renderToStaticMarkup(V.QuestionBoardStudent({ contract: C, board: board(), actor: S1 }));
    // React's SSR casing for this attribute varies by version; assert the
    // constraint is present rather than pinning the spelling.
    expect(html).toMatch(new RegExp('maxlength="' + C.LIMITS.ITEM_CHARS + '"', 'i'));
  });

  it('disables the composer once the student is at their cap', () => {
    const full = board({ items: [
      { id: 'A', uid: 'S-1', text: 'a', status: 'approved' },
      { id: 'B', uid: 'S-1', text: 'b', status: 'approved' }
    ] });
    const html = renderToStaticMarkup(V.QuestionBoardStudent({ contract: C, board: full, actor: S1 }));
    expect(html).toContain('disabled');
    expect(html).toContain('all your questions');
  });
});

describe('translator safety (the free-t() crash class)', () => {
  it('never calls a bare t and falls back when the key is missing', () => {
    const src = require('node:fs').readFileSync(resolve(process.cwd(), 'question_board_view_module.js'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    // every call site must go through the guarded translator
    expect(code).not.toMatch(/[^.\w]t\('/);
    const html = renderToStaticMarkup(V.QuestionBoardStudent({
      contract: C, board: board(), actor: S1, t: (k) => k   // a t() that echoes keys
    }));
    expect(html).not.toContain('question_board.post');       // key echoed => fallback used
    expect(html).toContain('Add my question');
  });

  it('survives a t() that throws', () => {
    const html = renderToStaticMarkup(V.QuestionBoardStudent({
      contract: C, board: board(), actor: S1, t: () => { throw new Error('boom'); }
    }));
    expect(html).toContain('Add my question');
  });
});
