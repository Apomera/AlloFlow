// WHAT COUNTS AS CORRECT.
//
// Word Sounds writes every response into one history stream, and several
// things downstream read that stream as if every row were a graded item:
// getEffectiveDifficulty's auto mode, the low-accuracy text scaffold, and the
// teacher-facing accuracy bar. Two kinds of row do not belong in an accuracy:
//
//   1. practiceOnly rows. Letter Trace coaches until the formation score
//      passes and never marks a response wrong, so it writes correct:true
//      every time. Pooled, a tracing block reads as a child getting
//      everything right.
//   2. Rows the child only got right on the retry. The row has carried
//      `attempts` since the grading tests landed (1 = first presentation) but
//      nothing weighted it, so "right on the second try, every time" read as
//      100%.
//
// Both defects pushed the SAME direction: they made a struggling child look
// secure, and adapted difficulty upward for them. These tests drive the real
// component and assert the difficulty the module derives, because that is the
// consequence a child actually feels.
//
// The row records `difficulty: getEffectiveDifficulty()` at answer time, which
// is what makes the decision observable from outside a 1,400-line closure.

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

function makeSpies() {
  const rec = { history: [] };
  const applyUpdater = (u, prev) => (typeof u === 'function' ? u(prev) : u);
  return {
    rec,
    props: {
      setWordSoundsHistory: (u) => rec.history.push(applyUpdater(u, [])),
      setWordSoundsScore: () => {},
      setWordSoundsFeedback: () => {},
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

async function tapNumber(host, n) {
  const tile = host.querySelector(`[role="button"][aria-label="Number ${n}"]`);
  if (!tile) throw new Error(`number tile ${n} not found`);
  await act(async () => {
    tile.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));
  });
}

/** Seeds n history rows. `word` is deliberately not "cat" so the seed cannot
 *  disturb the session queue, which skips words already answered correctly. */
const rows = (n, extra) =>
  Array.from({ length: n }, (_, i) => ({
    timestamp: 1000 + i,
    word: 'seedword',
    correct: true,
    attempts: 1,
    activity: 'counting',
    ...extra,
  }));

/** Answers "cat" correctly (3 phonemes) and returns the row that produced. */
async function answerAndReadRow(seedHistory) {
  const { rec, props } = makeSpies();
  const host = mount({
    ...studentProps('counting', []),
    ...props,
    wordSoundsDifficulty: 'auto',
    wordSoundsHistory: seedHistory,
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
  await tapNumber(host, 3);
  const written = rec.history.flat().filter(Boolean);
  expect(written.length, 'the answer should have produced exactly one row').toBe(1);
  return written[0];
}

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

describe('adaptive difficulty: which rows are allowed to drive it', () => {
  // CONTROL. Without this the two tests below could pass for the wrong reason
  // — a seed that never reaches getEffectiveDifficulty at all would also
  // produce "easy". Ten genuine first-try successes must reach "hard".
  it('ten first-try successes adapt the child upward', async () => {
    const row = await answerAndReadRow(rows(10));
    expect(row.difficulty, 'a child who is right first time should be moved up').toBe('hard');
  });

  it('a block of Letter Trace practice does not adapt the child upward', async () => {
    // Letter Trace never marks an answer wrong, so these ten rows say nothing
    // about how the child is doing. Excluded, there is no graded signal left,
    // and the module falls back to its cautious default.
    const row = await answerAndReadRow(
      rows(10, { activity: 'letter_tracing', practiceOnly: true }),
    );
    expect(row.difficulty, 'practice rows must not read as mastery').toBe('easy');
  });

  it('rows written before the flag existed are still excluded', async () => {
    // Back-compat: a saved project from before practiceOnly is recognised by
    // its activity id, so reopening it does not resurrect the inflated stream.
    const row = await answerAndReadRow(rows(10, { activity: 'letter_tracing' }));
    expect(row.difficulty, 'legacy tracing rows must be excluded by activity').toBe('easy');
  });

  it('right-only-on-the-retry does not read as mastery', async () => {
    // Ten items, all eventually correct, every one of them needing a second
    // presentation. Weighted at half credit that is 50%, which is not a child
    // ready for harder words — before this it read as a flat 100%.
    const row = await answerAndReadRow(rows(10, { attempts: 2 }));
    expect(row.difficulty, 'a retry is not a first-try success').toBe('easy');
  });

  it('a mixed record lands between the two extremes', async () => {
    // Seven first-try + three retries = (7 + 1.5) / 10 = 85%. That is the
    // "hard" boundary, so a single further retry should drop it to medium —
    // pinning that the weighting is graded, not a cliff.
    const atBoundary = await answerAndReadRow([...rows(7), ...rows(3, { attempts: 2 })]);
    expect(atBoundary.difficulty).toBe('hard');
    const justBelow = await answerAndReadRow([...rows(6), ...rows(4, { attempts: 2 })]);
    expect(justBelow.difficulty, '80% weighted should be medium, not hard').toBe('medium');
  });
});

describe('history rows carry their own provenance', () => {
  it('a graded activity does not stamp practiceOnly', async () => {
    const row = await answerAndReadRow([]);
    expect(row.practiceOnly, 'counting items can be wrong, so they are graded').toBeUndefined();
    expect(row.activity).toBe('counting');
  });

  it('the non-graded set is declared once and contains Letter Trace', () => {
    // Letter Trace is driven by canvas stroke capture, which jsdom cannot
    // produce, so its stamping is pinned at the source. The behavioural half
    // is covered above: whatever carries the flag is excluded.
    const src = readFileSync(resolve(process.cwd(), 'word_sounds_module.js'), 'utf8');
    expect(src).toMatch(/const WS_NON_GRADED_ACTIVITIES = new Set\(\["letter_tracing"\]\)/);
    expect(src, 'the history writer must stamp the flag')
      .toMatch(/WS_NON_GRADED_ACTIVITIES\.has\(wordSoundsActivity\)\s*\?\s*\{ practiceOnly: true \}/);
    expect(src, 'Letter Trace still resolves to correct — that is the design')
      .toMatch(/checkAnswer\("correct", "correct", \{ formationScore \}\)/);
  });

  it('the low-accuracy text scaffold reads graded rows only', () => {
    // A child missing everything, who then does a tracing block, must still
    // get the scaffold offered — the tracing rows used to mask the miss rate.
    const src = readFileSync(resolve(process.cwd(), 'word_sounds_module.js'), 'utf8');
    const idx = src.indexOf('const recentAccuracy');
    expect(idx, 'scaffold trigger not found').toBeGreaterThan(0);
    expect(src.slice(Math.max(0, idx - 400), idx))
      .toMatch(/\.filter\(wsIsGradedRow\)/);
  });
});

describe('the teacher-facing accuracy uses the same rule', () => {
  const teacherSrc = () =>
    readFileSync(resolve(process.cwd(), 'teacher_source.jsx'), 'utf8');

  it('excludes practice rows from the accuracy but not from the volume', () => {
    const src = teacherSrc();
    expect(src, 'accuracy must be computed over graded rows')
      .toMatch(/const wsAccuracy = wsGradedTotal > 0/);
    expect(src, '"Words Practiced" is a volume and keeps the full count')
      .toMatch(/const wsTotal = wordSoundsHistory\.length;/);
    expect(src, 'graded filter must cover both the flag and the legacy activity id')
      .toMatch(/h\.practiceOnly !== true && h\.activity !== 'letter_tracing'/);
  });

  it('reports first-try accuracy alongside the overall figure', () => {
    const src = teacherSrc();
    expect(src).toMatch(/wsFirstTryCorrect = wsGraded\.filter\(h => h\.correct && \(h\.attempts \|\| 1\) === 1\)/);
    expect(src, 'both numbers should be visible — the gap is the signal')
      .toMatch(/learner\.ws_first_try_accuracy/);
  });

  it('the built module carries the change', () => {
    // teacher_module.js is generated from teacher_source.jsx; a source-only
    // edit ships nothing.
    const built = readFileSync(resolve(process.cwd(), 'teacher_module.js'), 'utf8');
    expect(built, 'run: node _build_teacher_module.js').toMatch(/wsFirstTryAccuracy/);
  });

  it('the new labels are registered, so they cannot render blank', () => {
    // The host t() returns undefined on a missing key, which is how blank
    // labels have shipped before.
    const ui = readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8');
    expect(ui).toMatch(/"ws_first_try_accuracy":/);
    expect(ui).toMatch(/"ws_practice_only_note":/);
  });
});
