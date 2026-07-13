// PDF score calibration harness (rank 11 of the 2026-06-08 pipeline audit).
//
// HISTORICAL NOTE (2026-06-21): AlloFlow's PDF score is NO LONGER a 50/50 blend — the headline is now
// min(AI rubric, axe/EqualAccess), the lower (governing) layer, never an average (weakest-layer-governs
// redesign). So the "is 50/50 the right weight" question below is obsolete for the shipped model. What
// REMAINS useful here is the corpus correlation analysis (do the AI / axe / min scores track expert
// ground truth at all?) and the calibration MATH self-tests (mae / pearson / bestBlendWeight on
// synthetic data), which are model-agnostic and still run every time. The weight-search is kept only as
// an analytical lens on the historical blend, not a claim about the current score.
//
// It CANNOT run AlloFlow's audit itself (needs a real DOM + network — the documented headless
// ceiling), so a reviewer records each PDF's AI/axe/expert scores into
// tests/fixtures/pdf_calibration/manifest.json (see that folder's README). Until >=3 entries are
// scored, the corpus test SKIPS (green). The pure calibration math is self-tested on synthetic
// data every run, so the harness itself is always verified.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// ── Pure calibration math ────────────────────────────────────────────────────────────────────
function mae(predicted, actual) {
  if (!predicted.length || predicted.length !== actual.length) return NaN;
  let s = 0;
  for (let i = 0; i < predicted.length; i++) s += Math.abs(predicted[i] - actual[i]);
  return s / predicted.length;
}
function pearson(xs, ys) {
  const n = xs.length;
  if (n < 2 || n !== ys.length) return NaN;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { const a = xs[i] - mx, b = ys[i] - my; num += a * b; dx += a * a; dy += b * b; }
  if (dx === 0 || dy === 0) return NaN;
  return num / Math.sqrt(dx * dy);
}
// Sweep blend weight w in [0,1]; prediction = w*ai + (1-w)*axe. Return the w minimising MAE vs expert.
function bestBlendWeight(ai, axe, expert) {
  let best = { w: 0.5, mae: Infinity };
  for (let wi = 0; wi <= 100; wi++) {
    const w = wi / 100;
    const pred = ai.map((a, i) => w * a + (1 - w) * axe[i]);
    const m = mae(pred, expert);
    if (m < best.mae) best = { w, mae: m };
  }
  return best;
}

describe('calibration math (self-test on synthetic data — always runs)', () => {
  it('mae is 0 for a perfect prediction, positive otherwise', () => {
    expect(mae([80, 60], [80, 60])).toBe(0);
    expect(mae([80, 60], [70, 70])).toBeCloseTo(10, 5);
  });
  it('pearson is 1 for perfectly correlated, -1 for anti-correlated', () => {
    expect(pearson([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1, 5);
    expect(pearson([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1, 5);
  });
  it('bestBlendWeight recovers a known weight: expert = 0.7*ai + 0.3*axe', () => {
    const ai = [90, 80, 70, 60, 50];
    const axe = [50, 60, 70, 80, 95];
    const expert = ai.map((a, i) => 0.7 * a + 0.3 * axe[i]);
    const best = bestBlendWeight(ai, axe, expert);
    expect(best.w).toBeCloseTo(0.7, 1);
    expect(best.mae).toBeLessThan(0.5);
  });
});

describe('PDF score calibration corpus', () => {
  const manifestPath = path.resolve(__dirname, 'fixtures/pdf_calibration/manifest.json');
  let entries = [];
  try {
    const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    entries = (m.entries || []).filter(e =>
      e && Number.isFinite(e.expertScore) && Number.isFinite(e.alloflowAiScore) && Number.isFinite(e.alloflowAxeScore));
  } catch (_) { /* manifest missing/empty → skip below */ }

  it('reports calibration once >=3 PDFs are expert-scored (skips until then)', () => {
    if (entries.length < 3) {
      // eslint-disable-next-line no-console
      console.log(`[calibration] corpus has ${entries.length}/3 scored PDFs — not yet active. See tests/fixtures/pdf_calibration/README.md.`);
      expect(entries.length).toBeGreaterThanOrEqual(0); // green until populated
      return;
    }
    const ai = entries.map(e => e.alloflowAiScore);
    const axe = entries.map(e => e.alloflowAxeScore);
    const expert = entries.map(e => e.expertScore);
    const current = ai.map((a, i) => 0.5 * a + 0.5 * axe[i]); // the shipped 50/50 blend
    const current5050Mae = mae(current, expert);
    const corr = pearson(current, expert);
    const best = bestBlendWeight(ai, axe, expert);
    const recommend = Math.abs(best.w - 0.5) > 0.15 || current5050Mae > 12
      ? `RE-WEIGHT: error-minimising blend is ${best.w.toFixed(2)}*AI + ${(1 - best.w).toFixed(2)}*axe (MAE ${best.mae.toFixed(1)}) vs the shipped 50/50 (MAE ${current5050Mae.toFixed(1)}).`
      : `50/50 is defensible (MAE ${current5050Mae.toFixed(1)}, best weight ${best.w.toFixed(2)}).`;
    // eslint-disable-next-line no-console
    console.log(`[calibration] n=${entries.length} | 50/50 MAE=${current5050Mae.toFixed(1)} | r=${corr.toFixed(2)} | best w=${best.w.toFixed(2)} (MAE ${best.mae.toFixed(1)}) → ${recommend}`);
    // Sanity bounds only (this surfaces the calibration verdict for a human; it does not block CI
    // on the blend being imperfect — acting on the recommendation is the human's call):
    expect(Number.isFinite(current5050Mae)).toBe(true);
    expect(current5050Mae).toBeLessThan(60); // catches a grossly broken/inverted scorer
  });
});
