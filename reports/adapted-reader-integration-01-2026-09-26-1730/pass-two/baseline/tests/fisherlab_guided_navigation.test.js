import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_fisherlab.js', 'fisherLab'); });
describe('Fisher Lab guided navigation', () => {
  it('requires a prediction, a controlled comparison, a chart observation and all reflection fields', () => {
    const c = window.__FisherLabCore;
    let j = c.createCoreNavigationJourney();
    expect(c.advanceCoreNavigationJourney(j)).toBe(j);
    j = c.advanceCoreNavigationJourney({ ...j, prediction: 'Slower means longer' });
    expect(j.step).toBe(1);
    expect(c.advanceCoreNavigationJourney(j)).toBe(j);
    j = c.captureCoreNavigationTrial(j);
    j = c.captureCoreNavigationTrial({ ...j, model: { distance: 2, speed: 2 } });
    expect(j.trials.map(t => t.minutes)).toEqual([30, 60]);
    j = c.advanceCoreNavigationJourney(j);
    expect(j.step).toBe(2);
    expect(c.advanceCoreNavigationJourney(j)).toBe(j);
    j = c.advanceCoreNavigationJourney({ ...j, observation: 'A route may require a stop.', chartLabel: 'Maine' });
    expect(j.step).toBe(3);
    expect(c.advanceCoreNavigationJourney(j, { claim: 'x', evidence: 'x', next: ' ' })).toBe(j);
    j = c.advanceCoreNavigationJourney(j, { claim: 'Longer', evidence: '30 vs 60', next: 'Check current' });
    expect(j.step).toBe(4);
    expect(c.advanceCoreNavigationJourney(j)).toBe(j);
  });
  it('captures detached trials and rejects duplicate or confounded comparisons and invalid inputs', () => {
    const c = window.__FisherLabCore;
    const initial = c.createCoreNavigationJourney();
    expect(c.captureCoreNavigationTrial(initial)).toBe(initial);
    let j = c.captureCoreNavigationTrial({ ...initial, step: 1 });
    expect(j.trials).toHaveLength(1);
    expect(c.captureCoreNavigationTrial(j)).toBe(j);
    for (const model of [{ distance: 3, speed: 2 }, { distance: 2, speed: 0 }, { distance: NaN, speed: 2 }, { distance: 2, speed: Infinity }, { distance: '2', speed: 2 }]) {
      const candidate = { ...j, model };
      expect(c.captureCoreNavigationTrial(candidate)).toBe(candidate);
    }
    j.model.speed = 8;
    expect(j.trials[0].speed).toBe(4);
    j = c.captureCoreNavigationTrial(j);
    expect(j.trials[1].minutes).toBe(15);
    expect(c.captureCoreNavigationTrial(j)).toBe(j);
    expect(initial.trials).toEqual([]);
    const invalid = { ...j, trials: [{ distance: 2, speed: 4 }, { distance: 3, speed: 2 }] };
    expect(c.advanceCoreNavigationJourney(invalid)).toBe(invalid);
  });
  it('appends traceable model evidence without overwriting, duplicating or truncating student writing', () => {
    const c = window.__FisherLabCore;
    let j = c.captureCoreNavigationTrial({ ...c.createCoreNavigationJourney(), step: 1 });
    j = c.captureCoreNavigationTrial({ ...j, model: { distance: 2, speed: 2 } });
    j = { ...j, observation: 'Check traffic before departure.', chartLabel: 'Portland' };
    const added = c.appendCoreNavigationEvidence('My own reasoning.', j);
    expect(added.ok).toBe(true);
    expect(added.value).toMatch(/^My own reasoning./);
    expect(added.value).toContain('Navigation model (no current or stops)');
    expect(added.value).toContain('30 min');
    expect(added.value).toContain('60 min');
    expect(added.value).toContain('Chart observation (Portland)');
    expect(c.appendCoreNavigationEvidence(added.value, j)).toEqual(added);
    expect(c.appendCoreNavigationEvidence('x'.repeat(590), j)).toEqual({ ok: false, value: 'x'.repeat(590) });
    expect(c.appendCoreNavigationEvidence('Keep me', c.createCoreNavigationJourney())).toEqual({ ok: false, value: 'Keep me' });
    expect(j).not.toHaveProperty('score');
  });
});
