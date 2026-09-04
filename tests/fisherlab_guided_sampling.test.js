import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_fisherlab.js', 'fisherLab'); });
describe('Fisher Lab guided sampling', () => {
  it('pools counts rather than averaging percentages for unequal samples', () => {
    const model = window.__FisherLabCore.getCoreSamplingModel;
    expect(model({ secondSample: false, secondTotal: 20 })).toMatchObject({ target: 8, total: 10, percent: 80, bTotal: 0 });
    expect(model({ secondSample: true, secondTotal: 10 })).toMatchObject({ target: 10, total: 20, percent: 50 });
    expect(model({ secondSample: true, secondTotal: 20 })).toMatchObject({ target: 12, total: 30, percent: 40, bTarget: 4 });
    for (const secondTotal of [5, 10, 15, 20, 25, 30]) {
      const r = model({ secondSample: true, secondTotal });
      expect(r.percent).toBeCloseTo((8 + secondTotal / 5) / (10 + secondTotal) * 100);
    }
    for (const invalid of [null, {}, { secondSample: 1, secondTotal: 10 }, { secondSample: true, secondTotal: 0 }, { secondSample: true, secondTotal: 12 }, { secondSample: true, secondTotal: '10' }]) expect(model(invalid)).toBeNull();
  });
  it('captures A alone then A+B, prevents skips, and retains detached model snapshots', () => {
    const c = window.__FisherLabCore;
    let j = c.createCoreSamplingJourney();
    expect(c.captureCoreSamplingTrial(j)).toBe(j);
    expect(c.advanceCoreSamplingJourney(j)).toBe(j);
    j = c.advanceCoreSamplingJourney({ ...j, prediction: 'Adding B lowers the pooled percentage.' });
    const wrongFirst = { ...j, model: { secondSample: true, secondTotal: 10 } };
    expect(c.captureCoreSamplingTrial(wrongFirst)).toBe(wrongFirst);
    j = c.captureCoreSamplingTrial(j);
    expect(c.captureCoreSamplingTrial(j)).toBe(j);
    expect(c.advanceCoreSamplingJourney(j)).toBe(j);
    j = c.captureCoreSamplingTrial({ ...j, model: { secondSample: true, secondTotal: 20 } });
    expect(j.trials.map(t => t.percent)).toEqual([80, 40]);
    j.model.secondTotal = 30;
    expect(j.trials[1].bTotal).toBe(20);
    expect(c.captureCoreSamplingTrial(j)).toBe(j);
    j = c.advanceCoreSamplingJourney(j);
    expect(j.step).toBe(2);
    expect(c.advanceCoreSamplingJourney(j)).toBe(j);
    j = c.advanceCoreSamplingJourney({ ...j, observation: 'No records yet. Sample at several sites.', chartLabel: 'Maine' });
    expect(j.step).toBe(3);
    expect(c.advanceCoreSamplingJourney(j, { claim: 'x', evidence: 'x', next: '' })).toBe(j);
    j = c.advanceCoreSamplingJourney(j, { claim: 'x', evidence: 'x', next: 'x' });
    expect(j.step).toBe(4);
    expect(c.advanceCoreSamplingJourney(j)).toBe(j);
  });
  it('preserves existing reflection and distinguishes model counts from journal and population evidence', () => {
    const c = window.__FisherLabCore;
    let j = c.captureCoreSamplingTrial({ ...c.createCoreSamplingJourney(), step: 1 });
    j = c.captureCoreSamplingTrial({ ...j, model: { secondSample: true, secondTotal: 20 } });
    j = { ...j, observation: 'I need more sites.', chartLabel: 'All waters' };
    const result = c.appendCoreSamplingEvidence('My reasoning.', j);
    expect(result.ok).toBe(true);
    expect(result.value).toContain('My reasoning.');
    expect(result.value).toContain('spot B = 4/20');
    expect(result.value).toContain('pooled = 12/30 = 40%');
    expect(result.value).toContain('not journal records or a regional population estimate');
    expect(result.value).toContain('Journal reflection (All waters)');
    expect(c.appendCoreSamplingEvidence(result.value, j)).toEqual(result);
    expect(c.appendCoreSamplingEvidence('x'.repeat(590), j)).toEqual({ ok: false, value: 'x'.repeat(590) });
    expect(c.appendCoreSamplingEvidence('Keep', c.createCoreSamplingJourney())).toEqual({ ok: false, value: 'Keep' });
  });
});
