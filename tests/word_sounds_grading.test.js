// GRADING CONTRACT.
//
// checkAnswer is ~1,400 lines and is the single place a child's response
// becomes a score, a history row, and (in probe mode) assessment data a
// teacher may tier an intervention on. Until now nothing exercised it: of the
// Word Sounds test files only two dispatched a click and none asserted a
// grade. That gap is what let the view-remount defect live undetected.
//
// These tests drive REAL answers through the mounted component and assert what
// comes out the other side: the score, the history row, and the practice-mode
// retry gate (one free retry before an item is finalised) versus probe mode
// (first answer is final — a retry would corrupt the measure).

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setupWordSounds } from './helpers/word_sounds_harness.js';
import { studentProps, installCanvasStub } from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React, ReactDOMClient, act, WordSoundsModal;
const mounted = [];

/** Collects everything checkAnswer pushes outward. */
function makeSpies() {
  const rec = { score: [], history: [], feedback: [], probe: [] };
  const applyUpdater = (u, prev) => (typeof u === 'function' ? u(prev) : u);
  return {
    rec,
    props: {
      wordSoundsScore: { correct: 0, total: 0, streak: 0 },
      setWordSoundsScore: (u) => rec.score.push(applyUpdater(u, { correct: 0, total: 0, streak: 0 })),
      setWordSoundsHistory: (u) => rec.history.push(applyUpdater(u, [])),
      setWordSoundsFeedback: (u) => rec.feedback.push(applyUpdater(u, null)),
      onProbeComplete: (p) => rec.probe.push(p),
    },
  };
}

function mount(props) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(React.createElement(WordSoundsModal, props)); });
  mounted.push({ host, root });
  return host;
}

const numberTile = (host, n) =>
  host.querySelector(`[role="button"][aria-label="Number ${n}"]`);

async function tapNumber(host, n) {
  const tile = numberTile(host, n);
  if (!tile) throw new Error(`number tile ${n} not found`);
  await act(async () => {
    tile.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));
  });
}

const lastFeedback = (rec) => rec.feedback.filter(Boolean).slice(-1)[0] || null;
const positive = (fb) => !!fb && (fb.isCorrect === true || fb.type === 'correct' || fb.type === 'success');

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  installCanvasStub();
  ({ WordSoundsModal } = setupWordSounds());
});

afterEach(() => {
  while (mounted.length) {
    const { host, root } = mounted.pop();
    try { act(() => { root.unmount(); }); } catch (_) { /* already gone */ }
    host.remove();
  }
});

// "cat" has 3 phonemes, so 3 is correct and 5 is wrong.
describe('sound counting: practice mode', () => {
  it('a correct answer scores and records a correct history row', async () => {
    const { rec, props } = makeSpies();
    const host = mount({ ...studentProps('counting', []), ...props });
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });

    await tapNumber(host, 3);

    expect(positive(lastFeedback(rec)), 'expected positive feedback for the right answer').toBe(true);
    const rows = rec.history.flat().filter(Boolean);
    expect(rows.length, 'a correct answer must record exactly one history row').toBe(1);
    expect(rows[0].correct).toBe(true);
    expect(String(rows[0].word).toLowerCase()).toBe('cat');
    expect(rows[0].activity).toBe('counting');
  });

  it('the first wrong answer offers a retry instead of finalising the item', async () => {
    const { rec, props } = makeSpies();
    const host = mount({ ...studentProps('counting', []), ...props });
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });

    await tapNumber(host, 5);

    expect(positive(lastFeedback(rec)), 'a wrong answer must not read as correct').toBe(false);
    expect(rec.history.flat().filter(Boolean).length,
      'the first wrong answer is a retry, not a scored item').toBe(0);
  });

  it('the second wrong answer finalises the item as incorrect', async () => {
    const { rec, props } = makeSpies();
    const host = mount({ ...studentProps('counting', []), ...props });
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });

    await tapNumber(host, 5);
    await tapNumber(host, 5);

    const rows = rec.history.flat().filter(Boolean);
    expect(rows.length, 'the retry is spent — this item must now be recorded').toBe(1);
    expect(rows[0].correct).toBe(false);
  });

  it('a correct answer after one miss is recorded, and NOT as a first-try success', async () => {
    const { rec, props } = makeSpies();
    const host = mount({ ...studentProps('counting', []), ...props });
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });

    await tapNumber(host, 5); // miss, retry offered
    await tapNumber(host, 3); // correct on the retry

    const rows = rec.history.flat().filter(Boolean);
    expect(rows.length).toBe(1);
    expect(rows[0].correct).toBe(true);
    // The retry MUST be visible in the row. Without it, getEffectiveDifficulty's
    // auto mode, phoneme mastery and the teacher accuracy panels all read a
    // second-attempt success as a first-try one and adapt upward for a child who
    // is actually struggling. 2 = one retry (same base as sessionWordResults,
    // whose recap chips render "(2×)").
    expect(rows[0].attempts, 'history row must carry the presentation count').toBe(2);
  });

  it('a first-try success records attempts: 1', async () => {
    const { rec, props } = makeSpies();
    const host = mount({ ...studentProps('counting', []), ...props });
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });

    await tapNumber(host, 3);

    const rows = rec.history.flat().filter(Boolean);
    expect(rows[0].attempts).toBe(1);
  });

  it('history and the session recap agree on what "attempts" means', async () => {
    // Two fields called `attempts` are written a few lines apart in checkAnswer.
    // If their bases ever diverge, a teacher reading one surface sees a
    // different retry count than the other for the same response.
    const src = readFileSync(resolve(process.cwd(), 'word_sounds_module.js'), 'utf8');
    const historyField = /_historyEntry = \{[\s\S]*?attempts: attempts \+ 1,/.test(src);
    const recapField = /sessionWordResults\.current\.push\(\{[\s\S]*?attempts: attempts \+ 1,/.test(src);
    expect(historyField, 'history row should record attempts + 1').toBe(true);
    expect(recapField, 'session recap should record attempts + 1').toBe(true);
  });
});

describe('sound counting: probe mode', () => {
  it('a wrong answer is final — probes must not grant a retry', async () => {
    const { rec, props } = makeSpies();
    const host = mount({
      ...studentProps('counting', []),
      ...props,
      isProbeMode: true,
      probeGradeLevel: 'K',
    });
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });

    await tapNumber(host, 5);

    const rows = rec.history.flat().filter(Boolean);
    expect(rows.length, 'a probe item must be scored on the first response').toBe(1);
    expect(rows[0].correct).toBe(false);
  });
});

describe('probe timing integrity', () => {
  it('a timed probe cannot be backgrounded', async () => {
    // The loading card can appear BETWEEN items mid-probe, and the probe clock
    // is wall-clock — it keeps counting while minimized. Offering "Run in
    // Background" there lets a teacher inflate elapsed time and depress the
    // items/min they may tier a child on.
    const src = readFileSync(resolve(process.cwd(), 'word_sounds_module.js'), 'utf8');
    const idx = src.indexOf('word_sounds.run_in_background');
    expect(idx, 'run_in_background affordance not found').toBeGreaterThan(0);
    const block = src.slice(Math.max(0, idx - 900), idx);
    expect(block, 'the background button must be gated behind !isProbeMode')
      .toMatch(/!isProbeMode &&/);
  });

  it('probe mode still suppresses per-item celebrations', () => {
    // Same principle, already established in checkAnswer: nothing that eats
    // probe time or pays out XP a probe deliberately never awards.
    const src = readFileSync(resolve(process.cwd(), 'word_sounds_module.js'), 'utf8');
    expect(src).toMatch(/if \(!disableAnimations && !isProbeMode\) \{/);
  });
});
