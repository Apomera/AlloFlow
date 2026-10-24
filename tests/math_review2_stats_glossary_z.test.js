// Stats Lab math review 2 (2026-10-19): the glossary's z-score entry said
// z = +/-2 is "roughly the 5th/95th percentile". Phi(2) = .9772, so +/-2 is the
// 2.3rd/97.7th percentile; the 5th/95th percentiles are z = +/-1.645 and the
// middle 95% is +/-1.96. The glossary is plain English inside the tool (no
// translation key), so the fix is the text itself.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC_PATH = process.env.MATH_REVIEW2_STATS_SRC || 'stem_lab/stem_tool_statslab.js';

function erf(x) {
  const ax = Math.abs(x);
  let s = 0, term = ax;
  for (let n = 0; n < 400; n++) { s += term / (2 * n + 1); term *= -ax * ax / (n + 1); if (Math.abs(term) < 1e-17) break; }
  const v = 2 / Math.sqrt(Math.PI) * s;
  return x < 0 ? -v : v;
}
const Phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

beforeEach(() => {
  resetStemLab();
  loadTool(SRC_PATH, 'statsLab');
});

function zGlossaryText() {
  const a = [10, 12, 14, 9, 15, 13, 11], b = [8, 9, 10, 7, 12, 10, 9];
  const r = window.__StatsLabCore.wilcoxonSignedRank(a, b);
  expect(Number.isFinite(r.z)).toBe(true);
  const html = renderTool('statsLab', {
    statsLab: {
      mode: 'results', testsRun: 1, selectedTest: 'wilcoxonSignedRank', lastTestType: 'wilcoxonSignedRank',
      lastResult: r, twoColData: { aLabel: 'Before', bLabel: 'After', a, b }, showGlossary: true,
    },
  });
  const entry = html.match(/z-score[\s\S]*?A standardized score[\s\S]*?(?=<\/div>)/);
  expect(entry, 'the z glossary entry is shown').not.toBeNull();
  return entry[0];
}

describe('glossary: z-score percentiles', () => {
  it('the percentiles in the text are the normal-curve values', () => {
    expect(Phi(1.645)).toBeCloseTo(0.95, 3);
    expect(Phi(1.96)).toBeCloseTo(0.975, 3);
    expect(Phi(2)).toBeCloseTo(0.977, 3);
    expect(Phi(-2)).toBeCloseTo(0.023, 3);
  });

  it('pairs 5th/95th with +/-1.645 and +/-2 with 2.3rd/97.7th', () => {
    const text = zGlossaryText();
    expect(/±2 is roughly the 5th\/95th/.test(text), text).toBe(false);
    expect(/±1\.645 marks the 5th\/95th percentiles/.test(text), text).toBe(true);
    expect(/±1\.96 bounds the middle 95%/.test(text), text).toBe(true);
    expect(/±2 is about the 2\.3rd\/97\.7th percentile/.test(text), text).toBe(true);
  });
});
