import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Machine verification for the Ratio Lab. Every challenge answer is
// re-derived from its own scenario; the helper math is checked against
// independent computation. (The audit found zero defects — this suite
// exists so that stays true.)

const sourcePath = 'stem_lab/stem_tool_ratios.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_ratios.js';
const src = fs.readFileSync(sourcePath, 'utf8');

function extractScope(startMarker, endMarker, returns) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start);
  expect(start, startMarker).toBeGreaterThan(-1);
  expect(end, endMarker + ' bounds ' + startMarker).toBeGreaterThan(start);
  // The slice ends just before registerTool but includes the tool's own
  // `root.RatioLabPure = {...}` pure-helpers export — hand it a dummy root.
  // eslint-disable-next-line no-new-func
  return new Function('root', src.slice(start, end) + '\nreturn { ' + returns.join(', ') + ' };')({});
}

const lab = extractScope('var MODES = [', "window.StemLab.registerTool('ratioLab'", [
  'CHALLENGES', 'gcd', 'roundTo', 'formatNumber', 'clamp', 'nearlyEqual',
  'percentTapeModel', 'percentTapeSummary', 'pairsShareUnitRate',
  'challengeIsCorrect', 'normalizeAnswer', 'parsePairInput', 'analyzeProportionalPairs'
]);

beforeEach(() => {
  resetStemLab();
  loadTool(sourcePath, 'ratioLab');
});

describe('challenge answer keys', () => {
  const byId = {};
  for (const mode of Object.keys(lab.CHALLENGES)) {
    for (const ch of lab.CHALLENGES[mode]) byId[ch.id] = ch;
  }

  it('ratio table answers re-derive from their scenarios', () => {
    expect(byId['ratio-paint'].answer).toBe((20 / 5) * 3);
    const g = lab.gcd(18, 24);
    expect(byId['ratio-simplify'].answers).toContain(18 / g + ':' + 24 / g);
    expect(byId['ratio-scale'].answer).toBe(4 * 6);
  });

  it('double number line answers re-derive from unit rates', () => {
    expect(byId['line-tickets'].answer).toBe((15 / 5) * 8);
    expect(byId['line-running'].answer).toBe((18 / 3) * 7);
    expect(byId['line-batches'].answer).toBe((5 / 2) * 6);
  });

  it('unit-rate comparisons pick the truly cheaper/faster option', () => {
    expect(3.6 / 12).toBeCloseTo(0.30, 10);
    expect(5.4 / 20).toBeCloseTo(0.27, 10);
    expect(byId['unit-snacks'].answers).toContain('b');
    expect(byId['unit-speed'].answer).toBe(180 / 3);
    expect(84 / 6).toBe(14);
    expect(105 / 7).toBe(15);
    expect(byId['unit-printing'].answers).toContain('b');
  });

  it('percent trio: part, rate, and whole', () => {
    expect(byId['percent-part'].answer).toBe(0.35 * 240);
    expect(byId['percent-rate'].answer).toBe((45 / 180) * 100);
    expect(byId['percent-whole'].answer).toBe(30 / 0.2);
  });

  it('proportionality judgments agree with the rate analysis the tool itself uses', () => {
    const propYes = [{ x: 1, y: 3 }, { x: 2, y: 6 }, { x: 4, y: 12 }];
    const propNo = [{ x: 1, y: 4 }, { x: 2, y: 8 }, { x: 3, y: 13 }];
    expect(propYes.every((p) => lab.pairsShareUnitRate(propYes[0], p))).toBe(true);
    expect(propNo.every((p) => lab.pairsShareUnitRate(propNo[0], p))).toBe(false);
    expect(byId['prop-yes-table'].answers).toContain('yes');
    expect(byId['prop-no-table'].answers).toContain('no');
    expect(lab.pairsShareUnitRate({ x: 2, y: 7 }, { x: 4, y: 14 })).toBe(true);
    expect(byId['prop-origin'].answers).toContain('yes');
  });

  it('every challenge has a hint and an explanation', () => {
    for (const id of Object.keys(byId)) {
      expect(byId[id].hint, id).toBeTruthy();
      expect(byId[id].explain, id).toBeTruthy();
    }
  });
});

describe('answer grading', () => {
  const numericCh = { answer: 24 };
  const listCh = { answers: ['b', 'option b'] };

  it('accepts numeric answers with currency/percent symbols and commas', () => {
    expect(lab.challengeIsCorrect(numericCh, '24')).toBe(true);
    expect(lab.challengeIsCorrect(numericCh, '$24')).toBe(true);
    expect(lab.challengeIsCorrect(numericCh, ' 24 ')).toBe(true);
    expect(lab.challengeIsCorrect(numericCh, '25')).toBe(false);
    expect(lab.challengeIsCorrect(numericCh, '')).toBe(false);
  });

  it('list answers are case- and whitespace-insensitive', () => {
    expect(lab.challengeIsCorrect(listCh, 'B')).toBe(true);
    expect(lab.challengeIsCorrect(listCh, '  Option   B ')).toBe(true);
    expect(lab.challengeIsCorrect(listCh, 'a')).toBe(false);
  });
});

describe('numeric helpers', () => {
  it('gcd, clamp, roundTo, and formatNumber behave', () => {
    expect(lab.gcd(18, 24)).toBe(6);
    expect(lab.gcd(7, 0)).toBe(7);
    expect(lab.gcd(0, 0)).toBe(1);
    expect(lab.clamp(15, 0, 10)).toBe(10);
    expect(lab.roundTo(2.675, 2)).toBe(2.68);
    expect(lab.formatNumber(-0.0000001)).toBe('0');
  });

  it('percent tape model decomposes 250% into wholes plus remainder', () => {
    const model = lab.percentTapeModel(250, 6);
    expect(model.wholeCount).toBe(2);
    expect(model.remainderPercent).toBe(50);
    expect(model.tapes.length).toBe(3);
    expect(lab.percentTapeSummary(model)).toContain('2 complete wholes');
    const exact = lab.percentTapeModel(100, 6);
    expect(exact.wholeCount).toBe(1);
    expect(exact.remainderPercent).toBe(0);
    expect(lab.percentTapeModel(0, 6).tapes.length).toBe(1);
  });

  it('pair parsing surfaces row-level errors and gates the analysis', () => {
    const bad = lab.parsePairInput('1,2', '3');
    expect(bad.complete).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(0);
    const good = lab.parsePairInput('1, 2, 4', '3, 6, 12');
    expect(good.complete).toBe(true);
    expect(good.pairs.length).toBe(3);
    const analysis = lab.analyzeProportionalPairs(good);
    expect(analysis.valid).toBe(true);
    expect(analysis.proportional).toBe(true);
    expect(analysis.constant).toBe(3);
  });
});

describe('render and deployment', () => {
  it('renders the ratio lab shell', () => {
    const html = renderTool('ratioLab', {});
    expect(html.length).toBeGreaterThan(1000);
  });

  it('public mirror is byte-identical to the root copy', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(src);
  });
});
