// Pets Lab — progression reachability + duplicated-data guards.
//
// Two failure classes this tool has already demonstrated once each:
//
//  1. UNREACHABLE GOALS. The care sim shipped with a flat $500 budget that
//     made the best rabbit week impossible, and the Pet Picker shipped a CDC
//     rule pinned behind an input that could never satisfy it. Both looked
//     fine in review; both needed the numbers actually run. So every scored
//     goal here is checked against the real data for whether a student can
//     actually get there.
//
//  2. DUPLICATED DATA DRIFTING. The body-language signal list exists TWICE —
//     once as the quiz source in renderBodyLang, once re-derived in
//     renderDecoderMastery — and mastery is keyed on `species + '|' + signal`
//     from the FIRST while the progress view reads the SECOND. They agree
//     today. Nothing was stopping them diverging, and the day they do, a
//     student's decoded signals silently stop appearing in their log while
//     the badge counts them. Same shape as the three-copies traps elsewhere
//     in this repo.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(
  path.resolve(process.cwd(), 'stem_lab/stem_tool_pets.js'),
  'utf8'
);

// The signal lists reference the theme object for colours.
const T = new Proxy({}, { get: () => '#888888' });

function arrayAfter(marker, from = 0) {
  const start = SRC.indexOf(marker, from);
  if (start < 0) throw new Error('could not find ' + marker);
  const open = SRC.indexOf('[', start);
  let depth = 0, i = open;
  for (; i < SRC.length; i++) {
    if (SRC[i] === '[') depth++;
    else if (SRC[i] === ']') { depth--; if (depth === 0) { i++; break; } }
  }
  // eslint-disable-next-line no-eval
  return eval('(' + SRC.slice(open, i) + ')');
}

const QUIZ_SETS = arrayAfter('var sets = [', SRC.indexOf('function renderBodyLang'));
const MASTERY_SETS = arrayAfter('var sets = [', SRC.indexOf('function renderDecoderMastery'));
const TR_MOMENTS = arrayAfter('var TR_MOMENTS = [');

const signalKeys = (sets) =>
  sets.flatMap((s) => s.items.map((it) => s.species + '|' + it.signal));

describe('body-language signal list — the two copies must agree', () => {
  it('mastery keys written by the quiz are all readable by the progress view', () => {
    // The quiz writes decoderMastery[species|signal]; the mastery view looks
    // each one up from its own copy. Anything only in the quiz is a signal a
    // student can decode and never see credited.
    const fromQuiz = signalKeys(QUIZ_SETS);
    const fromView = new Set(signalKeys(MASTERY_SETS));
    const orphaned = fromQuiz.filter((k) => !fromView.has(k));
    expect(orphaned, 'decodable signals that the progress view cannot display').toEqual([]);
  });

  it('the progress view lists nothing the quiz cannot award', () => {
    const fromQuiz = new Set(signalKeys(QUIZ_SETS));
    const unreachable = signalKeys(MASTERY_SETS).filter((k) => !fromQuiz.has(k));
    expect(unreachable, 'signals shown as goals that no quiz question can grant').toEqual([]);
  });

  it('species labels match exactly, emoji included', () => {
    // The key is built by string concatenation, so a changed emoji or a
    // stray space silently orphans an entire species' progress.
    expect(MASTERY_SETS.map((s) => s.species)).toEqual(QUIZ_SETS.map((s) => s.species));
  });
});

describe('decoder mastery — the advertised total is the real one', () => {
  const total = signalKeys(QUIZ_SETS).length;

  it('the hardcoded "/ 27" matches the actual signal count', () => {
    // Shown in the header, the celebration overlay and the mastery view. If
    // the list grows and these do not, 100% becomes unreachable.
    expect(total).toBe(27);
    const hardcoded = [...SRC.matchAll(/\/ 27\b|>= 27\b|' \/ 27'/g)].length;
    expect(hardcoded, 'the /27 totals disappeared — did the count move?').toBeGreaterThan(0);
  });

  it('the all-signals badge threshold equals the number of signals', () => {
    const m = SRC.match(/uniqueCount >= (\d+)\) awardBadge\('pets_decoder_all'/);
    expect(m, 'the master-decoder badge threshold is gone').toBeTruthy();
    expect(Number(m[1]), 'master-decoder badge is unreachable').toBeLessThanOrEqual(total);
  });

  it('progressive decoder thresholds are all attainable and ordered', () => {
    const thresholds = [...SRC.matchAll(/uniqueCount >= (\d+)\) awardBadge\('pets_decoder/g)]
      .map((m) => Number(m[1]));
    expect(thresholds.length).toBeGreaterThanOrEqual(3);
    for (const t of thresholds) expect(t).toBeLessThanOrEqual(total);
    const sorted = [...thresholds].sort((a, b) => a - b);
    expect(thresholds, 'decoder badge thresholds are out of order').toEqual(sorted);
  });
});

describe('trainer sim — the badge is winnable', () => {
  // Best available delta per moment type, read off the shipped model.
  const BEST = { target: 0.10, almost: 0.06, wrong: 0.02 };

  function bestRun() {
    let prob = 0.20;   // startTrSim seeds these
    let trust = 1.00;
    for (const m of TR_MOMENTS) prob = Math.max(0, Math.min(1, prob + BEST[m.type]));
    return { prob: Math.round(prob * 100), trust: Math.round(trust * 100) };
  }

  it('seeds the run from the values the sim actually starts with', () => {
    expect(SRC).toMatch(/prob: 0\.20, trust: 1\.00/);
  });

  it('perfect play clears both badge thresholds', () => {
    const m = SRC.match(/finalScore >= (\d+) && trustScore >= (\d+)\) awardBadge\('pets_trainer'/);
    expect(m, 'trainer badge gate is gone').toBeTruthy();
    const needProb = Number(m[1]);
    const needTrust = Number(m[2]);
    const best = bestRun();
    expect(best.prob, 'no sequence of choices can reach the trainer badge').toBeGreaterThanOrEqual(needProb);
    expect(best.trust).toBeGreaterThanOrEqual(needTrust);
  });

  it('but perfect play is required to be near the top — the badge is not free', () => {
    // Choosing the worst option every round must fail, or the gate is theatre.
    const WORST = { target: -0.12, almost: 0.00, wrong: -0.15 };
    let prob = 0.20;
    for (const m of TR_MOMENTS) prob = Math.max(0, Math.min(1, prob + WORST[m.type]));
    expect(Math.round(prob * 100)).toBeLessThan(70);
  });

  it('punishing the correct behaviour is the worst thing you can do to it', () => {
    // The pedagogy rests on this ordering: correcting a target ("poisoning
    // the cue") must cost more than any other response to a target.
    const targetBlock = SRC.slice(
      SRC.indexOf("if (moment.type === 'target')"),
      SRC.indexOf("} else if (moment.type === 'almost')")
    );
    const deltas = [...targetBlock.matchAll(/dProb = ([+-][\d.]+)/g)].map((m) => Number(m[1]));
    expect(deltas.length).toBeGreaterThanOrEqual(4);
    const correctDelta = Number((targetBlock.match(/rxn === 'correct'\) \{ dProb = ([+-][\d.]+)/) || [])[1]);
    expect(correctDelta).toBe(Math.min(...deltas));
    // ...and it must be the only target response that also costs trust.
    expect(targetBlock).toMatch(/rxn === 'correct'\) \{ dProb = [+-][\d.]+; dTrust = -[\d.]+/);
  });
});

describe('every scored goal in the tool is reachable', () => {
  it('no badge threshold exceeds what its own scale allows', () => {
    // Percentage gates must sit within 0-100; a >100 threshold would be a
    // silently unwinnable goal of exactly the kind this tool shipped twice.
    const pctGates = [...SRC.matchAll(/(finalScore|trustScore|pct|probPct) >= (\d+)/g)]
      .map((m) => Number(m[2]));
    expect(pctGates.length).toBeGreaterThan(0);
    for (const g of pctGates) expect(g).toBeLessThanOrEqual(100);
  });

  it('module-explorer thresholds fit inside the menu', () => {
    const tiles = (SRC.match(/\{ id: '[a-zA-Z]+',\s+icon:/g) || []).length;
    const gates = [...SRC.matchAll(/count >= (\d+)\) awardBadge\('pets_(explorer|pro)'/g)]
      .map((m) => Number(m[1]));
    expect(gates.length).toBe(2);
    for (const g of gates) expect(g).toBeLessThanOrEqual(tiles);
  });
});
