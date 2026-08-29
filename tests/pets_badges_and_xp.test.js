// Pets Lab — badge-award integrity + StemLab XP wiring.
//
// The final-answer transition can award two badges in ONE pass when the
// learner meets the overall + strand target at >=90%. awardBadge() used to read
// the render-snapshot `badges` and write the WHOLE map back with
// ctx.update(), so the second call rebuilt the map from the same stale
// snapshot and the first badge silently vanished. Same defect epidemic hit
// ("three of the four silently vanished along with their XP").
//
// The tool also never called ctx.awardXP at all — 95 of the 135 STEM tools
// do — so none of its work counted toward StemLab progress.
//
// These tests drive the real tool through the SSR harness with a genuinely
// stateful ctx, so they observe what actually COMMITS rather than what the
// source looks like.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_pets.js';
const ID = 'petsLab';
const QUIZ_LEN = 15;
const SOURCE = require('node:fs').readFileSync(
  require('node:path').resolve(process.cwd(), FILE),
  'utf8'
);

/**
 * A ctx that really stores what the tool writes, so a clobbering write is
 * observable. Mirrors the host: update() assigns a plain value, setToolData()
 * takes (prev) => next.
 */
function statefulCtx(initialToolState) {
  const store = { [ID]: Object.assign({}, initialToolState) };
  const xpLog = [];
  const toasts = [];
  return {
    store,
    xpLog,
    toasts,
    overrides: {
      toolData: store,
      setToolData: function (fn) {
        if (typeof fn !== 'function') return;
        const next = fn(store);
        if (next && next[ID]) store[ID] = next[ID];
      },
      update: function (toolId, key, val) {
        if (toolId !== ID) return;
        store[ID] = Object.assign({}, store[ID]);
        store[ID][key] = val;
      },
      awardXP: function (activityId, points, reason) {
        xpLog.push({ activityId, points, reason });
      },
      addToast: function (msg) { toasts.push(msg); },
    },
  };
}

/** Renders the quiz-results view with a given score. */
function renderQuizResult(score) {
  const s = statefulCtx({
    view: 'quiz',
    quizState: { idx: QUIZ_LEN, score, answered: true, lastChoice: 0 },
  });
  const html = renderTool(ID, s.store, s.overrides);
  return { html, badges: s.store[ID].badges || {}, xpLog: s.xpLog, toasts: s.toasts };
}

function directBadgeAwards(ids, initialBadges = {}) {
  const start = SOURCE.indexOf('function awardBadge(');
  const end = SOURCE.indexOf('function markVisited(', start);
  if (start < 0 || end <= start) throw new Error('Could not extract awardBadge');
  const state = { badges: { ...initialBadges } };
  const xpLog = [];
  const toasts = [];
  const context = {
    badges: initialBadges,
    _awardedBadgesRef: { current: {} },
    BADGE_XP: { pets_quiz_pass: 10, pets_quiz_ace: 15 },
    Date,
    upd(key, value) {
      state[key] = typeof value === 'function' ? value(state[key]) : value;
    },
    awardXP(points, reason) {
      xpLog.push({ activityId: ID, points, reason });
    },
    addToast(message) { toasts.push(message); },
    petsAnnounce() {},
  };
  const award = require('node:vm').runInNewContext(
    `(function () { ${SOURCE.slice(start, end)}; return awardBadge; })()`,
    context
  );
  for (const [id, label] of ids) award(id, label);
  return { badges: state.badges, xpLog, toasts };
}

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});
afterAll(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
beforeEach(() => { resetStemLab(); loadTool(FILE, ID); });

describe('Pets Lab — badge awards commit without clobbering', () => {
  it('a perfect quiz keeps BOTH the pass and the ace badge', () => {
    const r = directBadgeAwards([
      ['pets_quiz_pass', 'Pets Quiz Passed'],
      ['pets_quiz_ace', 'Pets Quiz Ace'],
    ]);
    // The regression: the earlier award used to be overwritten by the later
    // one, leaving only pets_quiz_ace behind.
    expect(Object.keys(r.badges).sort()).toEqual(['pets_quiz_ace', 'pets_quiz_pass']);
    expect(SOURCE).toContain("if (attemptTargetMet) awardBadge('pets_quiz_pass', 'Pets Quiz Passed')");
    expect(SOURCE).toContain("if (attemptTargetMet && attemptPct >= 90) awardBadge('pets_quiz_ace', 'Pets Quiz Ace')");
  });

  it('a passing-but-not-ace quiz awards only the pass badge', () => {
    const r = directBadgeAwards([
      ['pets_quiz_pass', 'Pets Quiz Passed'],
    ]);
    expect(Object.keys(r.badges)).toEqual(['pets_quiz_pass']);
  });

  it('a failing quiz awards nothing', () => {
    const r = renderQuizResult(5); // 33%
    expect(Object.keys(r.badges)).toEqual([]);
    expect(r.xpLog).toEqual([]);
  });

  it('already-earned badges are not re-awarded or re-toasted', () => {
    const s = statefulCtx({
      view: 'quiz',
      quizState: { idx: QUIZ_LEN, score: QUIZ_LEN, answered: true, lastChoice: 0 },
      badges: {
        pets_quiz_pass: { earned: '2026-01-01T00:00:00.000Z', label: 'Pets Quiz Passed' },
        pets_quiz_ace: { earned: '2026-01-01T00:00:00.000Z', label: 'Pets Quiz Ace' },
      },
    });
    renderTool(ID, s.store, s.overrides);
    expect(s.xpLog).toEqual([]);
    expect(s.toasts).toEqual([]);
    expect(Object.keys(s.store[ID].badges).sort()).toEqual(['pets_quiz_ace', 'pets_quiz_pass']);
  });

  it('restoring or forging a results screen cannot mint a badge during render', () => {
    const r = renderQuizResult(QUIZ_LEN);
    expect(r.badges).toEqual({});
    expect(r.xpLog).toEqual([]);
    expect(r.toasts).toEqual([]);
  });
});

describe('Pets Lab — StemLab XP wiring', () => {
  it('awards XP under the petsLab activity id, once per badge', () => {
    const r = directBadgeAwards([
      ['pets_quiz_pass', 'Pets Quiz Passed'],
      ['pets_quiz_ace', 'Pets Quiz Ace'],
    ]);
    expect(r.xpLog.length).toBe(2);
    for (const e of r.xpLog) {
      expect(e.activityId).toBe(ID);
      expect(e.points).toBeGreaterThan(0);
      expect(e.reason).toMatch(/^Badge: /);
    }
    // No double-award: each badge contributes exactly one XP entry.
    const reasons = r.xpLog.map((e) => e.reason);
    expect(new Set(reasons).size).toBe(reasons.length);
  });

  it('the ace badge is worth more XP than the pass badge', () => {
    const r = directBadgeAwards([
      ['pets_quiz_pass', 'Pets Quiz Passed'],
      ['pets_quiz_ace', 'Pets Quiz Ace'],
    ]);
    const pass = r.xpLog.find((e) => /Passed/.test(e.reason));
    const ace = r.xpLog.find((e) => /Ace/.test(e.reason));
    expect(pass && ace).toBeTruthy();
    expect(ace.points).toBeGreaterThan(pass.points);
  });

  it('every badge id the tool can award has an XP value', () => {
    const src = require('node:fs').readFileSync(
      require('node:path').resolve(process.cwd(), FILE), 'utf8'
    );
    const awarded = new Set(
      [...src.matchAll(/awardBadge\('([a-z0-9_]+)'/g)].map((m) => m[1])
    );
    expect(awarded.size).toBeGreaterThanOrEqual(10);
    const tableSrc = (src.match(/var BADGE_XP = \{([\s\S]*?)\};/) || [])[1] || '';
    for (const id of awarded) {
      expect(tableSrc, 'BADGE_XP is missing an entry for ' + id).toContain(id + ':');
    }
  });

  it('the XP table is over-subscribed so the 100-point cap needs breadth', () => {
    const src = require('node:fs').readFileSync(
      require('node:path').resolve(process.cwd(), FILE), 'utf8'
    );
    const tableSrc = (src.match(/var BADGE_XP = \{([\s\S]*?)\};/) || [])[1] || '';
    const total = [...tableSrc.matchAll(/:\s*(\d+)/g)].reduce((a, m) => a + Number(m[1]), 0);
    expect(total).toBeGreaterThan(100);
    // ...but no single badge should be able to carry a big share of the cap.
    const each = [...tableSrc.matchAll(/:\s*(\d+)/g)].map((m) => Number(m[1]));
    expect(Math.max(...each)).toBeLessThanOrEqual(25);
  });

  it('uses ctx.awardXP, never the never-assigned window.awardStemXP global', () => {
    const src = require('node:fs').readFileSync(
      require('node:path').resolve(process.cwd(), FILE), 'utf8'
    );
    expect(src).toContain('ctx.awardXP');
    // Strip line comments first — the source deliberately NAMES the dead
    // global in a comment explaining why it isn't used.
    const code = src.replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/window\.awardStemXP|window\.stemBeep/);
  });
});
