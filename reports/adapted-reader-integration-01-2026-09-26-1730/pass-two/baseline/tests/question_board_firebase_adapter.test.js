// Phase 1b — the Firebase path, run against the SAME conformance suite as 1a.
//
// HONEST SCOPE. There is no @firebase/rules-unit-testing in this repo and no
// emulator here, so these tests cannot execute firestore.rules as Firestore
// would. What they do instead:
//
//   1. `rulesOracle` below is an executable MIRROR of the board rules — the
//      same predicates, hand-transcribed. An in-memory Firestore double routes
//      every read and write through it, so the conformance suite exercises the
//      rules' LOGIC even though it cannot exercise the rules ENGINE.
//   2. Structural pins assert the real .rules file still contains each predicate
//      the oracle mirrors, so the two cannot drift silently.
//
// That is genuinely weaker than emulator verification and is recorded as such
// in the spec. Before this ships, the rules need one emulator run. The value
// here is that the DESIGN is proven correct and identical to the mailbox's.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
let C, RULES;

beforeAll(() => {
  C = require(resolve(process.cwd(), 'question_board_contract_module.js'));
  RULES = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');
});

// ── Executable mirror of the firestore.rules board block ────────────────────
const rulesOracle = {
  canReadItem(auth, board, item) {
    if (!auth) return false;
    if (board.hostId === auth.uid) return true;          // isHost()
    if (item.uid === auth.uid) return true;              // isOwn()
    return item.status === 'approved';                   // held hidden from peers
  },
  canCreateItem(auth, board, next, now) {
    if (!auth) return false;
    if (!(board.expiresAt && board.expiresAt > now)) return false;      // boardOpen()
    if (next.uid !== auth.uid) return false;                            // not forgeable
    if (typeof next.text !== 'string') return false;
    if (next.text.length === 0 || next.text.length > 200) return false;
    if (next.answered !== false) return false;
    const required = board.revealPolicy === 'auto_publish' ? 'approved' : 'pending';
    return next.status === required;                                    // no self-approval
  },
  canUpdateItem(auth, board) {
    return !!auth && board.hostId === auth.uid;                         // host-only
  }
};

// ── In-memory Firestore double: every access goes through the oracle ────────
function createFirestoreDouble() {
  const boards = new Map();
  const items = new Map();   // boardId -> Map(itemId -> doc)
  let seq = 0;
  return {
    createBoard(boardId, doc) { boards.set(boardId, doc); items.set(boardId, new Map()); },
    board(boardId) { return boards.get(boardId); },
    /** Mirrors a participant's TWO constrained queries, merged (see the rules note). */
    query(boardId, auth, mode) {
      const board = boards.get(boardId);
      const all = [...items.get(boardId).values()];
      if (mode === 'host') {
        if (board.hostId !== auth.uid) throw new Error('permission-denied: unconstrained list');
        return all;
      }
      const approved = all.filter((d) => d.status === 'approved');
      const own = all.filter((d) => d.uid === auth.uid);
      const merged = new Map();
      approved.concat(own).forEach((d) => merged.set(d.id, d));
      // Every returned doc must independently pass the read rule.
      return [...merged.values()].filter((d) => rulesOracle.canReadItem(auth, board, d));
    },
    create(boardId, auth, doc, now) {
      const board = boards.get(boardId);
      if (!rulesOracle.canCreateItem(auth, board, doc, now)) return { ok: false, reason: 'permission-denied' };
      const id = 'I-' + (++seq);
      items.get(boardId).set(id, Object.assign({ id }, doc));
      return { ok: true, id };
    },
    update(boardId, auth, itemId, patch) {
      const board = boards.get(boardId);
      if (!rulesOracle.canUpdateItem(auth, board)) return { ok: false, reason: 'permission-denied' };
      const doc = items.get(boardId).get(itemId);
      if (!doc) return { ok: false, reason: 'no-item' };
      Object.assign(doc, patch);
      return { ok: true };
    },
    all(boardId) { return [...items.get(boardId).values()]; }
  };
}

// ── The contract-shaped Firebase adapter ────────────────────────────────────
function firebaseAdapter(C) {
  const db = createFirestoreDouble();
  let n = 0;
  const HOST = 'T-host';
  return {
    createBoard(config) {
      const boardId = 'B-' + (++n);
      db.createBoard(boardId, {
        hostId: HOST,
        revealPolicy: config.revealPolicy,
        minParticipants: config.minParticipants,
        itemsPerStudent: config.itemsPerStudent,
        boardCap: config.boardCap,
        expiresAt: config.expiresAt ? Date.parse(config.expiresAt) : Date.now() + 30 * 864e5
      });
      return { boardId, config };
    },
    snapshot(ref) {
      return { config: ref.config, items: db.all(ref.boardId).map(toContract) };
    },
    listVisible(ref, actor) {
      const auth = { uid: actor.role === 'host' ? HOST : actor.uid };
      const rows = db.query(ref.boardId, auth, actor.role === 'host' ? 'host' : 'participant').map(toContract);
      // K_ANONYMITY_FLOOR is NOT expressible in Firestore rules (see the test
      // below). Applied here in the adapter so behaviour matches the mailbox;
      // recorded as advisory-only on this transport.
      if (actor.role === 'host') return rows;
      const authors = new Set(db.all(ref.boardId).map((d) => d.uid));
      if (authors.size >= ref.config.minParticipants) return rows;
      return rows.filter((r) => r.uid === actor.uid);
    },
    addItem(ref, actor, payload) {
      const auth = { uid: actor.role === 'host' ? HOST : actor.uid };
      if (payload.uid && payload.uid !== actor.uid) return { ok: false, reason: 'forged-authorship' };
      const text = C.sanitizeText(payload.text, C.LIMITS.ITEM_CHARS);
      if (!text) return { ok: false, reason: 'empty-text' };
      // Caps are NOT rules-enforceable without a maintained counter; the adapter
      // applies them so the two transports behave alike (see the asymmetry test).
      const mine = db.all(ref.boardId).filter((d) => d.uid === actor.uid).length;
      if (mine >= ref.config.itemsPerStudent) return { ok: false, reason: 'item-cap' };
      if (db.all(ref.boardId).length >= ref.config.boardCap) return { ok: false, reason: 'board-full' };
      const board = db.board(ref.boardId);
      const status = payload.status === 'held'
        ? (board.revealPolicy === 'auto_publish' ? 'approved' : 'pending')
        : (board.revealPolicy === 'auto_publish' ? 'approved' : 'pending');
      const res = db.create(ref.boardId, auth, {
        uid: actor.uid, text, status, answered: false, createdAt: Date.now()
      }, Date.now());
      if (!res.ok) return { ok: false, reason: res.reason === 'permission-denied' ? 'expired' : res.reason };
      // The suite marks a deliberately-held item; on a rules-gated transport a
      // participant cannot self-hold, so the HOST performs it, which is exactly
      // what teacher_review means.
      if (payload.status === 'held' && board.revealPolicy === 'auto_publish') {
        db.update(ref.boardId, { uid: HOST }, res.id, { status: 'pending' });
      }
      return { ok: true, id: res.id };
    },
    setStatus(ref, actor, itemId, status) {
      const auth = { uid: actor.role === 'host' ? HOST : actor.uid };
      const res = db.update(ref.boardId, auth, itemId, { status: status === 'approved' ? 'approved' : 'pending' });
      return res.ok ? res : { ok: false, reason: 'host-only' };
    }
  };
  function toContract(d) {
    return { id: d.id, uid: d.uid, text: d.text, answered: d.answered, createdAt: d.createdAt,
             status: d.status === 'pending' ? 'held' : d.status };
  }
}

describe('the Firebase path passes the shared conformance suite', () => {
  it('satisfies every invariant', () => {
    const report = C.runConformanceSuite(firebaseAdapter(C));
    expect(report.results.filter((r) => !r.ok).map((r) => r.invariant + ': ' + r.detail)).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('reaches the same visibility answer as the contract', () => {
    const board = { hostId: 'T-host', revealPolicy: 'auto_publish', expiresAt: Date.now() + 1e6 };
    const items = [
      { id: 'A', uid: 'S-1', text: 'a', status: 'approved' },
      { id: 'B', uid: 'S-1', text: 'b', status: 'pending' },
      { id: 'C', uid: 'S-2', text: 'c', status: 'approved' },
      { id: 'D', uid: 'S-3', text: 'd', status: 'pending' }
    ];
    const auth = { uid: 'S-1' };
    const viaRules = items.filter((i) => rulesOracle.canReadItem(auth, board, i)).map((i) => i.id);
    const viaContract = C.visibleItemsFor({ uid: 'S-1', role: 'participant' }, {
      config: { minParticipants: 3 },
      items: items.map((i) => Object.assign({}, i, { status: i.status === 'pending' ? 'held' : i.status }))
    }).map((i) => i.id);
    expect(viaRules.sort()).toEqual(viaContract.sort());
    expect(viaRules.sort()).toEqual(['A', 'B', 'C']);
  });
});

describe('the rules oracle mirrors what firestore.rules actually says', () => {
  it('gates item reads on host, own, or approved', () => {
    expect(RULES).toContain('allow get, list: if isHost() || isOwn() || resource.data.status == "approved";');
  });

  it('binds authorship to the caller and forbids self-approval', () => {
    expect(RULES).toContain('request.resource.data.uid == request.auth.uid');
    expect(RULES).toContain('board().revealPolicy == "auto_publish" ? "approved" : "pending"');
  });

  it('keeps status and answered host-only, and blocks participant edits', () => {
    expect(RULES).toContain('allow update, delete: if isHost();');
  });

  it('closes writes after expiry', () => {
    expect(RULES).toContain('board().expiresAt > request.time');
  });

  it('puts items in a subcollection, which is the whole point (spec §10.2)', () => {
    expect(RULES).toContain('match /public/data/boards/{boardId}');
    expect(RULES).toContain('match /items/{itemId}');
    const boardsIdx = RULES.indexOf('match /public/data/boards/{boardId}');
    const itemsIdx = RULES.indexOf('match /items/{itemId}', boardsIdx);
    expect(itemsIdx).toBeGreaterThan(boardsIdx);
  });

  it('rejects an unconstrained participant list, forcing the two-query merge', () => {
    const db = createFirestoreDouble();
    db.createBoard('B', { hostId: 'T', revealPolicy: 'auto_publish', expiresAt: Date.now() + 1e6 });
    expect(() => db.query('B', { uid: 'S-1' }, 'host')).toThrow(/permission-denied/);
  });
});

describe('the oracle is not vacuous', () => {
  const board = { hostId: 'T', revealPolicy: 'teacher_review', expiresAt: Date.now() + 1e6 };

  it('denies a peer reading a pending item', () => {
    expect(rulesOracle.canReadItem({ uid: 'S-2' }, board, { uid: 'S-1', status: 'pending' })).toBe(false);
  });
  it('denies a forged uid on create', () => {
    expect(rulesOracle.canCreateItem({ uid: 'S-1' }, board,
      { uid: 'S-2', text: 'x', answered: false, status: 'pending' }, Date.now())).toBe(false);
  });
  it('denies self-approval onto a teacher_review board', () => {
    expect(rulesOracle.canCreateItem({ uid: 'S-1' }, board,
      { uid: 'S-1', text: 'x', answered: false, status: 'approved' }, Date.now())).toBe(false);
  });
  it('denies a participant changing status', () => {
    expect(rulesOracle.canUpdateItem({ uid: 'S-1' }, board)).toBe(false);
    expect(rulesOracle.canUpdateItem({ uid: 'T' }, board)).toBe(true);
  });
  it('denies writes after expiry', () => {
    const closed = Object.assign({}, board, { expiresAt: Date.now() - 1000 });
    expect(rulesOracle.canCreateItem({ uid: 'S-1' }, closed,
      { uid: 'S-1', text: 'x', answered: false, status: 'pending' }, Date.now())).toBe(false);
  });
});

describe('KNOWN ASYMMETRY, recorded rather than hidden', () => {
  it('documents that caps and the k-anonymity floor are not rules-enforceable', () => {
    // Firestore rules cannot count sibling documents, so itemsPerStudent,
    // boardCap and minParticipants cannot be enforced below the client without
    // a maintained counter (itself forgeable) or a Cloud Function mediating
    // writes. On the mailbox these ARE server-enforced. The adapter applies them
    // so behaviour matches, but on this transport they are advisory.
    for (const notInRules of ['itemsPerStudent', 'boardCap', 'minParticipants']) {
      const boardBlock = RULES.slice(RULES.indexOf('Driving Questions Boards'));
      expect(boardBlock).not.toContain(notInRules);
    }
  });

  it('still enforces the invariants that DO matter most, below the client', () => {
    // The safety-critical ones — held content hidden, authorship, host-only
    // status, expiry — are all genuinely in the rules.
    const boardBlock = RULES.slice(RULES.indexOf('Driving Questions Boards'));
    expect(boardBlock).toContain('isOwn()');
    expect(boardBlock).toContain('request.auth.uid');
    expect(boardBlock).toContain('request.time');
  });
});
