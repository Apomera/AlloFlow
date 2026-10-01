// PD Phase-1 hardening — answer-position-bias guard, learner-name persistence,
// and the draft-run accessibility gate.
//
// Background: the seed PD quizzes shipped with correctIndex [1,2,3,1] twice
// over and nothing shuffled at render, so correct answers never appeared at
// position 0 (the answers-at-B bias class). The fix presents options in a
// deterministic per-device order while all storage/scoring stays in the
// module's canonical index space. Separately, PdGenerate's "Preview / run"
// bypassed the accessibility preflight that approved catalog content must
// pass (startModule); pdDraftRunReadiness closes that hole.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(MODULES_DIR, 'react'));

const SRC = readFileSync(resolve(process.cwd(), 'catalog_module.js'), 'utf8');
const PD_CORE_SRC = readFileSync(resolve(process.cwd(), 'pd_core_module.js'), 'utf8');
const SEED = JSON.parse(readFileSync(resolve(process.cwd(), 'catalog/pd/approved/udl-representation-quickstart.json'), 'utf8'));

function freshStorage() {
  const store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    key: (i) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
  };
}

beforeAll(() => {
  if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
      currentScript: { src: 'https://example.test/catalog_module.js' },
      createElement: () => ({}),
      head: { appendChild() {} },
      body: { appendChild() {}, removeChild() {} },
    };
  }
});

// Fresh evaluation per call with an ISOLATED localStorage so salt/name state
// never leaks between tests. Returns { CC, win }.
function load(opts = {}) {
  const win = { React, AlloModules: {}, ...(opts.win || {}) };
  const storage = freshStorage();
  if (opts.salt) storage.setItem('alloflow_pd_quiz_salt_v1', opts.salt);
  // The module body references bare `localStorage`; shadow it per-evaluation.
  // eslint-disable-next-line no-new-func
  new Function('window', 'localStorage', 'module', PD_CORE_SRC)(win, storage, { exports: {} });
  // eslint-disable-next-line no-new-func
  new Function('window', 'localStorage', SRC)(win, storage);
  return { CC: win.AlloModules.CommunityCatalog, win, storage };
}

describe('pdQuizOptionOrder (answer-position-bias guard)', () => {
  it('always returns a permutation of 0..n-1', () => {
    const { CC } = load({ salt: '12345' });
    const t = CC._pdTesting;
    for (let n = 1; n <= 6; n++) {
      const order = t.pdQuizOptionOrder('quiz-x', 0, n);
      expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i));
    }
  });

  it('is deterministic for a fixed salt and varies across questions/activities', () => {
    const { CC } = load({ salt: '12345' });
    const t = CC._pdTesting;
    const a = t.pdQuizOptionOrder('quiz-representation', 0, 4);
    const b = t.pdQuizOptionOrder('quiz-representation', 0, 4);
    expect(a).toEqual(b); // options must never jump between renders
    // Across many questions the permutation cannot be uniformly natural —
    // that would mean the guard is inert.
    let nonNatural = 0;
    for (let qi = 0; qi < 12; qi++) {
      const o = t.pdQuizOptionOrder('quiz-representation', qi, 4);
      if (o.some((v, i) => v !== i)) nonNatural++;
    }
    expect(nonNatural).toBeGreaterThan(0);
  });

  it('puts every position in reach: over many questions, canonical index 1 is NOT pinned to display slot 1', () => {
    // The bias tell this guards against: seed quizzes keyed [1,2,3,1] and a
    // natural-order renderer showing position 1 as correct most of the time.
    const { CC } = load({ salt: '9973' });
    const t = CC._pdTesting;
    const slotsForIndex1 = new Set();
    for (let qi = 0; qi < 24; qi++) {
      const o = t.pdQuizOptionOrder('quiz-any', qi, 4);
      slotsForIndex1.add(o.indexOf(1));
    }
    expect(slotsForIndex1.size).toBeGreaterThan(1);
  });

  it('honors the natural-order escape hatch (tests / screen-reader debugging)', () => {
    const { CC } = load({ salt: '12345', win: { __alloPdQuizNaturalOrder: true } });
    expect(CC._pdTesting.pdQuizOptionOrder('quiz-x', 3, 4)).toEqual([0, 1, 2, 3]);
  });

  it('storage-less environments still get a valid, stable order', () => {
    const win = { React, AlloModules: {} };
    const throwing = { getItem() { throw new Error('nope'); }, setItem() { throw new Error('nope'); }, removeItem() {} };
    new Function('window', 'localStorage', 'module', PD_CORE_SRC)(win, throwing, { exports: {} });
    new Function('window', 'localStorage', SRC)(win, throwing);
    const t = win.AlloModules.CommunityCatalog._pdTesting;
    const a = t.pdQuizOptionOrder('quiz-x', 0, 4);
    expect([...a].sort((x, y) => x - y)).toEqual([0, 1, 2, 3]);
    expect(t.pdQuizOptionOrder('quiz-x', 0, 4)).toEqual(a);
  });
});

describe('learner-name persistence', () => {
  it('save/load round-trips, trims, and caps at 80 chars', () => {
    const { CC } = load();
    const t = CC._pdTesting;
    t.savePdLearnerName('  Aaron P.  ');
    expect(t.loadPdLearnerName()).toBe('Aaron P.');
    t.savePdLearnerName('x'.repeat(200));
    expect(t.loadPdLearnerName().length).toBe(80);
  });

  it('clearing: an empty name removes the stored value', () => {
    const { CC } = load();
    const t = CC._pdTesting;
    t.savePdLearnerName('Someone');
    t.savePdLearnerName('   ');
    expect(t.loadPdLearnerName()).toBe('');
  });

  it('pdEffectiveLearner: host prop wins; stored name is the fallback; else null', () => {
    const { CC } = load();
    const t = CC._pdTesting;
    expect(t.pdEffectiveLearner(null)).toBe(null);
    t.savePdLearnerName('Stored Name');
    expect(t.pdEffectiveLearner(null)).toEqual({ name: 'Stored Name' });
    expect(t.pdEffectiveLearner({ name: 'Prop Name' })).toEqual({ name: 'Prop Name' });
  });
});

describe('pdDraftRunReadiness (PdGenerate preview gate)', () => {
  it('passes the approved seed module', () => {
    const { CC } = load();
    expect(CC._pdTesting.pdDraftRunReadiness(SEED)).toEqual({ ok: true });
  });

  it('blocks a draft with an accessibility-authoring failure (video without captions)', () => {
    const { CC } = load();
    const bad = JSON.parse(JSON.stringify(SEED));
    bad.sections.push({
      title: 'Watch',
      activities: [{ id: 'video-1', type: 'video', title: 'Clip', content: { url: 'https://example.test/clip.mp4' }, gate: { kind: 'none' } }],
    });
    const res = CC._pdTesting.pdDraftRunReadiness(bad);
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/accessibility-authoring fixes/);
  });

  it('fails closed when the PD engine is absent', () => {
    const win = { React, AlloModules: {} };
    const storage = freshStorage();
    new Function('window', 'localStorage', SRC)(win, storage); // no PdCore loaded
    const res = win.AlloModules.CommunityCatalog._pdTesting.pdDraftRunReadiness(SEED);
    expect(res.ok).toBe(false);
  });
});

describe('generator prompt bias guidance', () => {
  it('instructs the model to spread correctIndex across positions', () => {
    // The render shuffle is the real fix; this is the belt to it. Pin the
    // instruction so a prompt rewrite cannot silently drop it.
    expect(SRC).toMatch(/Spread correctIndex across positions 0-3/);
  });
});
