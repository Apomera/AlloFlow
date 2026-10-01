// Golden-master / characterization tests for the document remediation pipeline's
// SCORING + RELIABILITY math.
//
// WHY: doc_pipeline_source.jsx is an ~18.6k-line file with no headless entry point,
// so its scoring logic cannot yet be imported directly. Per the repo convention
// (see tests/README.md and translation_pipeline.test.js) we MIRROR the pure
// functions here and pin known-input -> known-output values. This is the seed of a
// golden master: any refactor that silently changes how a document is scored will
// trip these assertions.
//
// MIRROR DISCIPLINE: the functions below are copied from doc_pipeline_source.jsx.
// If you change a scoring formula in the source, update the mirror here and re-run.
// Source line references are given per function (as of 2026-05-28).
//
// Once the pipeline is decoupled behind its createDocPipeline deps adapter, replace
// these mirrors with direct imports so the test exercises the real code path.

import { describe, it, expect } from 'vitest';

// ── Mirror of the severity rubric + pass-factor (doc_pipeline_source.jsx:3787-3918) ──
// deduction = critical*15 + serious*10 + moderate*5 + minor*2
// passRatio  = passCount / (passCount + issueCount)
// pf         = 1 - (passRatio * 0.4)            // passing checks offset deductions, capped at 40%
// score      = max(0, 100 - round(rawDed * pf))
function computeRubricScore({ critical = 0, serious = 0, moderate = 0, minor = 0, passCount = 0 }) {
  const rawDed = critical * 15 + serious * 10 + moderate * 5 + minor * 2;
  const issueCount = critical + serious + moderate + minor;
  const passRatio = passCount > 0 ? passCount / (passCount + issueCount) : 0;
  const pf = 1 - (passRatio * 0.4);
  return Math.max(0, 100 - Math.round(rawDed * pf));
}

// ── Mirror of the auditor score-validation override (doc_pipeline_source.jsx:3919) ──
// If an auditor's self-reported score diverges from the rubric recompute by > 12, override it.
function reconcileScore(reported, calculated) {
  if (typeof reported === 'number' && Math.abs(reported - calculated) > 12) return calculated;
  return reported;
}

// ── Mirror of the triangulation reliability heuristics (doc_pipeline_source.jsx:3925-3972) ──
function computeReliability(scores) {
  const n = scores.length;
  if (n === 0) throw new Error('no scores');
  const rawMean = scores.reduce((a, b) => a + b, 0) / n;
  const rawSD = n > 1 ? Math.sqrt(scores.reduce((s, v) => s + Math.pow(v - rawMean, 2), 0) / (n - 1)) : 0;
  const scoreSEM = n > 1 ? Math.round((rawSD / Math.sqrt(n)) * 10) / 10 : 0;
  const ci95 = [
    Math.max(0, Math.round(rawMean - 1.96 * (rawSD / Math.sqrt(n)))),
    Math.min(100, Math.round(rawMean + 1.96 * (rawSD / Math.sqrt(n)))),
  ];
  // "Auditor Agreement (heuristic index)" — custom 1 - (SD/50), NOT a real ICC.
  const icc = rawSD === 0 ? 1 : Math.round(Math.max(0, 1 - (rawSD / 50)) * 100) / 100;
  const reliability = icc >= 0.9 ? 'excellent' : icc >= 0.75 ? 'good' : icc >= 0.5 ? 'moderate' : 'variable';
  // "Auditor Agreement (consistency heuristic)" — CV-based + weighted-pairwise hybrid, n>=3 only.
  let cronbachAlpha = null;
  if (n >= 3) {
    const cv = rawMean > 0 ? rawSD / rawMean : 1;
    const cvAlpha = Math.max(0, Math.min(0.99, 1 - (cv * 5)));
    let pairSum = 0, totalPairs = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        totalPairs++;
        pairSum += Math.max(0, 1 - (Math.abs(scores[i] - scores[j]) / 20));
      }
    }
    const pairAlpha = totalPairs > 0 ? pairSum / totalPairs : 1;
    const combined = (cvAlpha + pairAlpha) / 2;
    cronbachAlpha = rawSD === 0 ? 1 : Math.round(Math.min(0.99, combined) * 100) / 100;
  }
  return { mean: Math.round(rawMean), scoreSEM, ci95, icc, reliability, cronbachAlpha };
}

// ── Mirror of the 50/50 AI+axe composite blend (doc_pipeline_source.jsx:5233, 4119) ──
function blendScore(ai, axe) {
  return Math.round((ai + axe) / 2);
}

describe('rubric score (severity weights + pass-factor)', () => {
  it('clean document with passes scores 100', () => {
    expect(computeRubricScore({ passCount: 10 })).toBe(100);
  });

  it('single critical issue, no passes, deducts exactly 15', () => {
    expect(computeRubricScore({ critical: 1 })).toBe(85);
  });

  it('one of each severity, no passes, deducts 15+10+5+2 = 32', () => {
    expect(computeRubricScore({ critical: 1, serious: 1, moderate: 1, minor: 1 })).toBe(68);
  });

  it('pass-factor offsets deductions: 2 critical with 18 passes -> 81 (not 70)', () => {
    // issueCount=2, passRatio=18/20=0.9, pf=1-0.36=0.64, ded=round(30*0.64)=19 -> 81
    expect(computeRubricScore({ critical: 2, passCount: 18 })).toBe(81);
  });

  it('never returns below 0', () => {
    expect(computeRubricScore({ critical: 10 })).toBe(0);
  });
});

describe('auditor score-validation override (>12 point divergence)', () => {
  it('keeps the reported score when within 12 points of the rubric recompute', () => {
    expect(reconcileScore(80, 75)).toBe(80);
  });
  it('overrides the reported score when it diverges by more than 12 points', () => {
    expect(reconcileScore(90, 70)).toBe(70);
  });
  it('treats exactly 12 points of divergence as within tolerance (keeps reported)', () => {
    expect(reconcileScore(82, 70)).toBe(82);
  });
});

describe('triangulation reliability heuristics', () => {
  it('perfect agreement: SD 0 -> agreement index 1.0, excellent', () => {
    const r = computeReliability([80, 80, 80]);
    expect(r.icc).toBe(1);
    expect(r.scoreSEM).toBe(0);
    expect(r.reliability).toBe('excellent');
    expect(r.mean).toBe(80);
  });

  it('spread of 70/80/90: SD 10 -> agreement 0.8 (good), SEM 5.8, CI [69,91]', () => {
    const r = computeReliability([70, 80, 90]);
    expect(r.icc).toBe(0.8);
    expect(r.reliability).toBe('good');
    expect(r.scoreSEM).toBe(5.8);
    expect(r.ci95).toEqual([69, 91]);
    expect(r.cronbachAlpha).toBe(0.35);
  });

  it('single auditor: SD 0, no Cronbach-like value (n<3)', () => {
    const r = computeReliability([85]);
    expect(r.icc).toBe(1);
    expect(r.scoreSEM).toBe(0);
    expect(r.cronbachAlpha).toBeNull();
    expect(r.ci95).toEqual([85, 85]);
  });

  it('wide disagreement is flagged as variable, not excellent', () => {
    // [40,90]: SD ~35.36 -> 1-(35.36/50)=0.29 -> variable
    const r = computeReliability([40, 90]);
    expect(r.reliability).toBe('variable');
    expect(r.icc).toBeLessThan(0.5);
  });
});

describe('50/50 AI + axe composite blend', () => {
  it('blends two equal-weight scores', () => {
    expect(blendScore(90, 70)).toBe(80);
  });
  it('rounds half up (JS Math.round)', () => {
    expect(blendScore(100, 61)).toBe(81); // 80.5 -> 81
  });
  it('surfaces the masking case: clean structure (100) + weak semantics (60) still reads 80', () => {
    // This is exactly why the report now shows the split: a reassuring 80 composite
    // can hide a semantic score of 60. If this assertion ever changes, the split-score
    // presentation rationale changed too.
    expect(blendScore(100, 60)).toBe(80);
  });
});
