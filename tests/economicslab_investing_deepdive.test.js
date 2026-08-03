import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_economicslab.js');
const source = fs.readFileSync(sourcePath, 'utf8');

// The Investing Deep-Dives block lives between its banner comment and the
// entrepreneur tab. Slice it so the pins below can't match unrelated code.
const start = source.indexOf('Investing Deep-Dives');
const end = source.indexOf("econTab === 'entrepreneur'", Math.max(start, 0));
const slice = source.slice(start, end);

describe('Economics Lab investing deep-dives', () => {
  it('slices the deep-dives block', () => {
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
  });

  it('renders deterministically — no Math.random in the render path', () => {
    // The Monte Carlo fan runs during render. Math.random would repaint a
    // different chart on every keystroke; only the seeded LCG is allowed.
    expect(slice).not.toContain('Math.random');
    expect(slice).toContain('16807');
  });

  it('keeps the risk visualizer premise: all three sequences share the same arithmetic mean', () => {
    const pairs = [...slice.matchAll(/rvMk\((-?[\d.]+),\s*(-?[\d.]+)\)/g)]
      .map((m) => [Number(m[1]), Number(m[2])]);
    expect(pairs.length).toBe(3);
    for (const [a, b] of pairs) {
      expect((a + b) / 2).toBeCloseTo(7, 10);
    }
  });

  it('demonstrates volatility drag: steady beats mix beats wild geometrically', () => {
    const pairs = [...slice.matchAll(/rvMk\((-?[\d.]+),\s*(-?[\d.]+)\)/g)]
      .map((m) => [Number(m[1]), Number(m[2])]);
    const growth = pairs.map(([a, b]) => (1 + a / 100) * (1 + b / 100));
    const [steady, wild, mix] = growth;
    expect(steady).toBeGreaterThan(mix);
    expect(mix).toBeGreaterThan(wild);
  });

  it('carries the not-a-prediction disclaimer alongside the return assumptions', () => {
    expect(slice).toContain('iv_disclaimer');
    expect(slice).toContain('Not a prediction and not financial advice');
  });

  it('withdraws before growth in retire mode — the sequence-risk mechanism', () => {
    // mcStep must subtract spending BEFORE applying the year's return. If the
    // order flips, early crashes stop being deadlier than late ones and the
    // whole retirement demo teaches the wrong thing.
    const stepStart = slice.indexOf('var mcStep');
    expect(stepStart).toBeGreaterThan(-1);
    const stepBody = slice.slice(stepStart, slice.indexOf('};', stepStart));
    const withdrawAt = stepBody.indexOf('val - mcSpend');
    const growAt = stepBody.indexOf('* (1 + r)');
    expect(withdrawAt).toBeGreaterThan(-1);
    expect(growAt).toBeGreaterThan(withdrawAt);
  });

  it('applies the fund fee to the mean return, not the volatility', () => {
    expect(slice).toContain('ivMean - mcFee');
    expect(slice).not.toContain('ivVol - mcFee');
  });

  it('registers the new finance glossary concepts', () => {
    const financeCount = [...source.matchAll(/category: 'finance'/g)].length;
    expect(financeCount).toBeGreaterThanOrEqual(7);
    for (const id of ['assetAllocation', 'rebalancing', 'expenseRatio', 'sequenceRisk']) {
      expect(source).toContain(`id: '${id}'`);
    }
  });

  it('wires the deep-dive achievements to real state flags', () => {
    expect(source).toMatch(/if \(d\.paQuizDone\) econAchievements\.push/);
    expect(source).toMatch(/if \(d\.mcRanRetire\) econAchievements\.push/);
  });
});
