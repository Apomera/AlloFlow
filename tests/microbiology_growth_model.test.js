import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let growth;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
  growth = window.__MicrobiologyCore.growth;
});

function optimum(id, oxygen) {
  const profile = growth.profiles[id];
  return { profile: id, tempC: profile.temp[1], pH: profile.pH[1], oxygen: oxygen ?? (id === 'methanogen' ? 0 : 100) };
}

describe('Microbiology growth model', () => {
  it('uses the same inoculum, capacity and maximum rate for every profile', () => {
    const runs = Object.keys(growth.profiles).map(id => growth.simulate(optimum(id)));
    expect(runs).toHaveLength(4);
    for (const run of runs) {
      expect(run.initialPopulation).toBe(5);
      expect(run.capacity).toBe(100);
      expect(run.score).toBe(1);
      expect(run.ratePerHour).toBe(0.4);
      expect(run.lagHours).toBe(2);
      expect(run.points).toEqual(runs[0].points);
    }
  });

  it('produces deterministic hourly samples with a lag and a bounded growth curve', () => {
    const conditions = optimum('ecoli');
    const run = growth.simulate(conditions);
    expect(run).toEqual(growth.simulate(conditions));
    expect(run.points.map(point => point.hour)).toEqual(Array.from({ length: 25 }, (_, hour) => hour));
    expect(run.points.slice(0, 3).map(point => point.population)).toEqual([5, 5, 5]);
    expect(run.points[3].population).toBeGreaterThan(5);
    expect(run.finalPopulation).toBe(run.points[24].population);
    expect(run.finalPopulation).toBeGreaterThan(99);
    expect(run.finalPopulation).toBeLessThan(100);
    expect(conditions).toEqual(optimum('ecoli'));
  });

  it('remains finite, monotone and bounded throughout the supported environment', () => {
    for (const id of Object.keys(growth.profiles)) {
      for (const tempC of [0, 20, 37, 50, 70, 90]) {
        for (const pH of [3, 5.5, 7, 7.5, 10]) {
          for (const oxygen of [0, 5, 50, 100]) {
            const run = growth.simulate({ profile: id, tempC, pH, oxygen });
            expect(run.score).toBeGreaterThanOrEqual(0);
            expect(run.score).toBeLessThanOrEqual(1);
            expect(run.lagHours).toBeGreaterThanOrEqual(2);
            expect(run.lagHours).toBeLessThanOrEqual(8);
            let previous = 5;
            for (const point of run.points) {
              expect(Number.isFinite(point.population)).toBe(true);
              expect(point.population).toBeGreaterThanOrEqual(previous);
              expect(point.population).toBeLessThanOrEqual(100);
              previous = point.population;
            }
          }
        }
      }
    }
  });

  it('requires oxygen for the obligate aerobe and separates no growth from death', () => {
    const absent = growth.simulate(optimum('thermus', 0));
    expect(absent.factors.oxygen).toBe(0);
    expect(absent.score).toBe(0);
    expect(absent.points.every(point => point.population === 5)).toBe(true);
    const available = growth.simulate(optimum('thermus', 100));
    expect(available.finalPopulation).toBeGreaterThan(absent.finalPopulation);
  });

  it('models oxygen responses by metabolism rather than one shared response', () => {
    const without = growth.simulate(optimum('ecoli', 0));
    const withOxygen = growth.simulate(optimum('ecoli', 100));
    expect(without.finalPopulation).toBeGreaterThan(5);
    expect(withOxygen.finalPopulation).toBeGreaterThan(without.finalPopulation);
    expect(growth.simulate(optimum('lactobacillus', 0)).points).toEqual(growth.simulate(optimum('lactobacillus', 100)).points);
    const anaerobic = growth.simulate(optimum('methanogen', 0));
    const limited = growth.simulate(optimum('methanogen', 5));
    const suppressed = growth.simulate(optimum('methanogen', 10));
    expect(anaerobic.finalPopulation).toBeGreaterThan(limited.finalPopulation);
    expect(limited.finalPopulation).toBeGreaterThan(5);
    expect(suppressed.finalPopulation).toBe(5);
    expect(growth.simulate(optimum('methanogen', 100)).finalPopulation).toBe(5);
  });

  it('gives peak response at each profile optimum and no increase at the envelope edges', () => {
    for (const id of Object.keys(growth.profiles)) {
      const profile = growth.profiles[id];
      const best = optimum(id);
      for (const key of ['tempC', 'pH']) {
        const bounds = key === 'tempC' ? profile.temp : profile.pH;
        for (const endpoint of [bounds[0], bounds[2]]) {
          const run = growth.simulate({ ...best, [key]: endpoint });
          expect(run.factors[key]).toBe(0);
          expect(run.finalPopulation).toBe(5);
        }
        const halfway = growth.simulate({ ...best, [key]: (bounds[0] + bounds[1]) / 2 });
        expect(halfway.factors[key]).toBeCloseTo(0.5);
        expect(halfway.finalPopulation).toBeLessThan(growth.simulate(best).finalPopulation);
      }
    }
  });

  it('combines environmental factors and lengthens lag when response is reduced', () => {
    const full = growth.simulate(optimum('ecoli'));
    const limited = growth.simulate({ ...optimum('ecoli'), tempC: 22.5, pH: 5.75, oxygen: 0 });
    expect(limited.factors).toEqual({ tempC: 0.5, pH: 0.5, oxygen: 0.65 });
    expect(limited.score).toBeCloseTo(0.1625);
    expect(limited.lagHours).toBeGreaterThan(full.lagHours);
    expect(limited.ratePerHour).toBeLessThan(full.ratePerHour);
    expect(limited.points.filter(point => point.hour <= limited.lagHours).every(point => point.population === 5)).toBe(true);
  });

  it('normalizes malformed inputs without coercing strings, booleans or nonfinite numbers', () => {
    expect(growth.normalizeConditions(null)).toEqual({ profile: 'ecoli', tempC: 37, pH: 7, oxygen: 50 });
    expect(growth.normalizeConditions({ profile: '__proto__', tempC: Infinity, pH: '5.5', oxygen: false }))
      .toEqual({ profile: 'ecoli', tempC: 37, pH: 7, oxygen: 50 });
    expect(growth.normalizeConditions({ profile: 'thermus', tempC: NaN, pH: {}, oxygen: null }))
      .toEqual({ profile: 'thermus', tempC: 70, pH: 7.5, oxygen: 50 });
    expect(growth.normalizeConditions({ tempC: -1000, pH: 1000, oxygen: 1000 }))
      .toEqual({ profile: 'ecoli', tempC: 0, pH: 10, oxygen: 100 });
    expect(growth.normalizeConditions({ tempC: 1000, pH: -1000, oxygen: -1000 }))
      .toEqual({ profile: 'ecoli', tempC: 90, pH: 3, oxygen: 0 });
    expect(Object.isFrozen(growth.normalizeConditions(optimum('ecoli')))).toBe(true);
    expect(Object.isFrozen(growth.profiles.ecoli.temp)).toBe(true);
  });
});

describe('Microbiology control and trial comparisons', () => {
  it('distinguishes unchanged, single-variable and confounded designs', () => {
    const control = optimum('ecoli');
    expect(growth.compare(control, control)).toMatchObject({ changed: [], design: 'none', outcome: 'similar', difference: 0 });
    expect(growth.compare(control, { ...control, tempC: 30 })).toMatchObject({ changed: ['tempC'], design: 'single', outcome: 'lower' });
    expect(growth.compare(control, { ...control, tempC: 30, pH: 6 })).toMatchObject({ changed: ['tempC', 'pH'], design: 'confounded' });
    expect(growth.compare(control, { ...control, profile: 'lactobacillus' })).toMatchObject({ changed: ['profile'], design: 'single' });
    expect(growth.compare(control, optimum('thermus'))).toMatchObject({ changed: ['profile', 'tempC', 'pH'], design: 'confounded' });
  });

  it('classifies the signed difference at 24 hours with an explicit tolerance', () => {
    const control = optimum('ecoli', 0);
    const trial = optimum('ecoli', 100);
    const higher = growth.compare(control, trial);
    const lower = growth.compare(trial, control);
    expect(higher.outcome).toBe('higher');
    expect(lower.outcome).toBe('lower');
    expect(higher.difference).toBeCloseTo(-lower.difference);
    expect(higher.difference).toBe(higher.trial.finalPopulation - higher.control.finalPopulation);
    const nearlyEqual = growth.compare(trial, { ...trial, pH: 6.99 });
    expect(Math.abs(nearlyEqual.difference)).toBeLessThan(growth.similarThreshold);
    expect(nearlyEqual.outcome).toBe('similar');
  });

  it('does not mistake no change in outcome for no change in experimental conditions', () => {
    const control = optimum('thermus', 0);
    const result = growth.compare(control, { ...control, tempC: 60 });
    expect(result).toMatchObject({ changed: ['tempC'], design: 'single', outcome: 'similar', difference: 0 });
    expect(result.control.finalPopulation).toBe(5);
    expect(result.trial.finalPopulation).toBe(5);
  });
});

describe('Microbiology persisted investigation notebook', () => {
  it('recovers a valid empty notebook from malformed data', () => {
    const empty = { control: null, trials: [], selectedId: null, prediction: '', hypothesis: '', explanation: '', nextId: 1, sweepVariable: 'tempC', sweep: null };
    expect(growth.normalizeNotebook(null)).toEqual(empty);
    expect(growth.normalizeNotebook({ control: [], trials: {}, selectedId: NaN, prediction: {}, hypothesis: {}, explanation: false, nextId: Infinity })).toEqual(empty);
  });

  it('keeps twelve recent records and preserves each trial control independently', () => {
    const control = optimum('ecoli');
    const trials = Array.from({ length: 15 }, (_, index) => ({
      id: index + 1, control: { ...control }, conditions: { ...control, tempC: index + 20 },
      prediction: 'lower', hypothesis: 'Temperature changes growth.', explanation: ''
    }));
    const input = { control, trials, selectedId: 15, nextId: 16 };
    const notebook = growth.normalizeNotebook(input);
    expect(notebook.trials).toHaveLength(12);
    expect(notebook.trials.map(trial => trial.id)).toEqual(Array.from({ length: 12 }, (_, i) => i + 4));
    expect(notebook.selectedId).toBe(15);
    expect(notebook.nextId).toBe(16);
    control.tempC = 90;
    trials[14].control.pH = 3;
    trials[14].conditions.tempC = 90;
    expect(notebook.control.tempC).toBe(37);
    expect(notebook.trials[11].control.pH).toBe(7);
    expect(notebook.trials[11].conditions.tempC).toBe(34);
    const changedBaseline = growth.normalizeNotebook({ ...notebook, control: optimum('thermus') });
    expect(changedBaseline.control.profile).toBe('thermus');
    expect(changedBaseline.trials[11].control.profile).toBe('ecoli');
    expect(Object.isFrozen(notebook.trials[11].control)).toBe(true);
    expect(Object.isFrozen(notebook.trials[11].conditions)).toBe(true);
    expect(Object.isFrozen(notebook.trials[11])).toBe(true);
  });

  it('drops unusable records, repairs duplicate IDs and removes stale selection', () => {
    const conditions = optimum('ecoli');
    const notebook = growth.normalizeNotebook({
      trials: [null, 7, [], { id: 1 }, { id: 4, conditions }, { id: 4, conditions }, { id: -1, conditions }],
      selectedId: 42, nextId: 2
    });
    expect(notebook.trials).toHaveLength(3);
    expect(new Set(notebook.trials.map(trial => trial.id)).size).toBe(3);
    expect(notebook.selectedId).toBe(null);
    expect(notebook.nextId).toBeGreaterThan(Math.max(...notebook.trials.map(trial => trial.id)));
    expect(notebook.trials.every(trial => trial.control === null)).toBe(true);
    expect(growth.normalizeNotebook(notebook)).toEqual(notebook);
  });

  it('bounds user text and prediction fields while retaining ordinary text literally', () => {
    const notebook = growth.normalizeNotebook({
      prediction: 'higher', hypothesis: '\u0000' + 'h'.repeat(1000), explanation: 'e'.repeat(2000),
      trials: [{ id: 1, conditions: optimum('ecoli'), prediction: 'invalid', hypothesis: '<b>my claim</b>', explanation: { text: 'wrong type' } }]
    });
    expect(notebook.prediction).toBe('higher');
    expect(notebook.hypothesis).toBe('h'.repeat(600));
    expect(notebook.explanation).toBe('e'.repeat(1200));
    expect(notebook.trials[0]).toMatchObject({ prediction: '', hypothesis: '<b>my claim</b>', explanation: '' });
    expect(growth.normalizeNotebook({ prediction: 'unsure' }).prediction).toBe('unsure');
  });

  it('round-trips the notebook as JSON without changing comparisons or saved predictions', () => {
    const control = optimum('ecoli', 100);
    const notebook = growth.normalizeNotebook({ control, trials: [{ id: 1, control, conditions: optimum('ecoli', 0), prediction: 'lower', hypothesis: 'A prediction', explanation: 'The result' }], selectedId: 1 });
    const restored = growth.normalizeNotebook(JSON.parse(JSON.stringify(notebook)));
    expect(restored).toEqual(notebook);
    expect(growth.compare(restored.trials[0].control, restored.trials[0].conditions))
      .toEqual(growth.compare(notebook.trials[0].control, notebook.trials[0].conditions));
  });

  it('exports paired conditions and protects quoted text and spreadsheet formulas', () => {
    const control = optimum('thermus', 100);
    const trial = { id: 1, control, conditions: optimum('thermus', 0), prediction: 'lower', hypothesis: '=SUM(A1:A2)', explanation: 'No growth, "not death"\nEvidence stays separate.' };
    const csv = growth.csv({ trials: [trial] });
    expect(csv).toContain('"control_oxygen_availability_0_100"');
    expect(csv).toContain('"thermus","70","7.5","100","thermus","70","7.5","0"');
    expect(csv).toContain('"oxygen","single","lower","lower"');
    expect(csv).toContain('"\'=SUM(A1:A2)"');
    expect(csv).toContain('"No growth, ""not death""\nEvidence stays separate."');
    expect(csv).toContain('Illustrative deterministic model');
    expect(csv).toContain('no death modeled.');
    expect(growth.csv([trial])).toBe(csv);
    expect(growth.csv({ trials: [{ id: 2, conditions: optimum('ecoli'), hypothesis: '\t@SUM(A1)' }] })).toContain('"\'\t@SUM(A1)"');
  });
});

describe('Microbiology controlled variable sweeps', () => {
  it('changes exactly the selected environment variable across consistent sample sets', () => {
    for (const profile of Object.keys(growth.profiles)) {
      for (const variable of ['tempC', 'pH', 'oxygen']) {
        const conditions = optimum(profile);
        const result = growth.sweep(conditions, variable);
        expect(result.variable).toBe(variable);
        expect(result.points.map(point => point.value)).toEqual(growth.sweepSteps[variable]);
        expect(result.points.length).toBeGreaterThanOrEqual(7);
        expect(result.points.length).toBeLessThanOrEqual(10);
        for (const point of result.points) {
          for (const field of ['profile', 'tempC', 'pH', 'oxygen']) {
            expect(point.conditions[field]).toBe(field === variable ? point.value : conditions[field]);
          }
          const simulation = growth.simulate(point.conditions);
          expect(point.finalPopulation).toBe(simulation.finalPopulation);
          expect(point.score).toBe(simulation.score);
          expect(point.lagHours).toBe(simulation.lagHours);
          expect(simulation.initialPopulation).toBe(5);
          expect(simulation.capacity).toBe(100);
        }
        expect(result).toEqual(growth.sweep(conditions, variable));
      }
    }
  });

  it('identifies highest sampled values without assuming endpoints are optima', () => {
    expect(growth.sweep(optimum('ecoli'), 'tempC').bestValues).toEqual([37]);
    expect(growth.sweep(optimum('thermus'), 'tempC').bestValues).toEqual([70]);
    expect(growth.sweep(optimum('lactobacillus'), 'pH').bestValues).toEqual([5.5]);
    expect(growth.sweep(optimum('methanogen'), 'oxygen').bestValues).toEqual([0]);
    const result = growth.sweep(optimum('ecoli'), 'tempC');
    expect(result.minimum).toBe(5);
    expect(result.maximum).toBe(Math.max(...result.points.map(point => point.finalPopulation)));
  });

  it('preserves flat responses when the profile is insensitive or another condition blocks growth', () => {
    const insensitive = growth.sweep(optimum('lactobacillus'), 'oxygen');
    expect(insensitive.bestValues).toEqual(growth.sweepSteps.oxygen);
    expect(insensitive.minimum).toBe(insensitive.maximum);
    const blocked = growth.sweep(optimum('thermus', 0), 'tempC');
    expect(blocked.minimum).toBe(5);
    expect(blocked.maximum).toBe(5);
    expect(blocked.bestValues).toEqual(growth.sweepSteps.tempC);
    expect(blocked.points.every(point => point.score === 0)).toBe(true);
  });

  it('normalizes unsafe values and returns immutable snapshots independent of input edits', () => {
    const source = optimum('ecoli');
    const result = growth.sweep(source, '__proto__');
    expect(result.variable).toBe('tempC');
    source.pH = 3;
    expect(result.conditions.pH).toBe(7);
    expect(result.points.every(point => point.conditions.pH === 7)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.points)).toBe(true);
    expect(Object.isFrozen(result.points[0].conditions)).toBe(true);
    expect(Object.isFrozen(growth.sweepSteps.tempC)).toBe(true);
    expect(growth.sweep({ profile: '__proto__', tempC: Infinity, oxygen: NaN }, []).points.every(point => Number.isFinite(point.finalPopulation))).toBe(true);
  });

  it('round-trips sweep snapshots without discarding controls, trials or the next identifier', () => {
    const source = optimum('thermus');
    const trial = { id: 4, control: optimum('ecoli'), conditions: optimum('ecoli', 0), prediction: 'lower', hypothesis: 'Saved', explanation: 'Evidence' };
    const notebook = growth.normalizeNotebook({ control: optimum('ecoli'), trials: [trial], selectedId: 4, nextId: 10, sweepVariable: 'oxygen', sweep: { variable: 'pH', conditions: source, points: [{ fabricated: true }] } });
    source.tempC = 0;
    expect(notebook.sweep).toEqual({ variable: 'pH', conditions: optimum('thermus') });
    expect(notebook).toMatchObject({ selectedId: 4, nextId: 10, sweepVariable: 'oxygen', control: optimum('ecoli') });
    expect(notebook.trials[0]).toEqual(trial);
    expect(Object.isFrozen(notebook.sweep)).toBe(true);
    const restored = growth.normalizeNotebook(JSON.parse(JSON.stringify(notebook)));
    expect(restored).toEqual(notebook);
    expect(growth.sweep(restored.sweep.conditions, restored.sweep.variable)).toEqual(growth.sweep(notebook.sweep.conditions, notebook.sweep.variable));
    for (const sweep of [[], {}, { variable: '__proto__', conditions: {} }, { variable: 'pH', conditions: [] }]) {
      expect(growth.normalizeNotebook({ sweep, sweepVariable: '__proto__' })).toMatchObject({ sweep: null, sweepVariable: 'tempC' });
    }
  });
});

describe('Microbiology saved-run review', () => {
  it('reveals earlier differences while preserving the original hour-24 prediction outcome', () => {
    const control = optimum('ecoli');
    const conditions = { ...control, tempC: 35 };
    const input = { trials: [{ id: 5, control, conditions, prediction: 'similar', explanation: 'Saved reasoning' }] };
    const before = JSON.parse(JSON.stringify(input));
    const early = growth.reviewNotebook(input, 6);
    const final = growth.reviewNotebook(input, 24);
    expect(early.hour).toBe(6);
    expect(final.hour).toBe(24);
    expect(early.rows[0].outcome).toBe('similar');
    expect(early.rows[0].prediction).toBe('similar');
    expect(Math.abs(early.rows[0].inspected.difference)).toBeGreaterThan(2);
    expect(Math.abs(final.rows[0].inspected.difference)).toBeLessThanOrEqual(2);
    expect(early.rows[0].difference).toBe(final.rows[0].difference);
    expect(early.rows[0].controlPopulation).toBe(final.rows[0].controlPopulation);
    expect(early.rows[0].trialPopulation).toBe(final.rows[0].trialPopulation);
    expect(final.rows[0].inspected).toEqual({
      controlPopulation: final.rows[0].controlPopulation,
      trialPopulation: final.rows[0].trialPopulation,
      difference: final.rows[0].difference,
    });
    expect(Object.isFrozen(early.rows[0].inspected)).toBe(true);
    expect(input).toEqual(before);
  });

  it('inspects each original control at the selected hour and keeps missing controls unavailable', () => {
    const conditions = optimum('ecoli');
    const trials = [
      { id: 2, control: conditions, conditions: { ...conditions, oxygen: 0 } },
      { id: 7, control: { ...conditions, oxygen: 0 }, conditions },
      { id: 9, conditions },
    ];
    for (const hour of [0, 6, 12, 24]) {
      const review = growth.reviewNotebook({ control: optimum('thermus'), trials }, hour);
      for (const [index, trial] of trials.entries()) {
        const expectedControl = trial.control ? growth.simulate(trial.control).points[hour].population : null;
        const expectedTrial = growth.simulate(trial.conditions).points[hour].population;
        expect(review.rows[index].inspected).toEqual({
          controlPopulation: expectedControl, trialPopulation: expectedTrial,
          difference: expectedControl === null ? null : expectedTrial - expectedControl,
        });
      }
      expect(review.rows[2]).toMatchObject({ outcome: null, difference: null, controlPopulation: null });
    }
    expect(growth.reviewNotebook({ trials }, 0).rows[0].inspected).toEqual({ controlPopulation: 5, trialPopulation: 5, difference: 0 });
  });

  it('normalizes restored inspection hours with finite numeric bounds and a final-hour default', () => {
    for (const value of [undefined, null, '6', true, {}, [], NaN, Infinity, -Infinity]) {
      expect(growth.reviewNotebook({}, value).hour).toBe(24);
    }
    for (const [value, expected] of [[-12, 0], [36, 24], [6.49, 6], [6.5, 7], [0, 0]]) {
      expect(growth.reviewNotebook({}, value).hour).toBe(expected);
    }
  });

  it('compares each trial against its own saved control regardless of the current control', () => {
    const first = { id: 2, control: optimum('ecoli', 100), conditions: optimum('ecoli', 0), prediction: 'lower' };
    const second = { id: 9, control: optimum('ecoli', 0), conditions: optimum('ecoli', 100), prediction: 'unsure' };
    const review = growth.reviewNotebook({ control: optimum('thermus'), trials: [first, second] });
    expect(review).toMatchObject({ hasDifferentControls: true, sameControl: false, controlGroupCount: 2, missingControls: 0 });
    expect(review.rows.map(row => row.id)).toEqual([2, 9]);
    for (const [index, trial] of [first, second].entries()) {
      const expected = growth.compare(trial.control, trial.conditions);
      expect(review.rows[index]).toMatchObject({
        id: trial.id, prediction: trial.prediction, conditions: trial.conditions, control: trial.control,
        outcome: expected.outcome, changed: expected.changed, design: expected.design, difference: expected.difference,
        controlPopulation: expected.control.finalPopulation, trialPopulation: expected.trial.finalPopulation
      });
    }
    expect(review.rows[0].difference).toBeCloseTo(-review.rows[1].difference);
    expect(review.rows[1].prediction).toBe('unsure');
  });

  it('recognizes shared controls by conditions rather than coincidentally equal outcomes', () => {
    const control = optimum('ecoli');
    const trials = [1, 3].map(id => ({ id, control: { ...control }, conditions: optimum('ecoli', 0) }));
    expect(growth.reviewNotebook({ trials })).toMatchObject({ sameControl: true, hasDifferentControls: false, controlGroupCount: 1 });
    trials[1].control = optimum('thermus');
    expect(growth.simulate(trials[1].control).finalPopulation).toBe(growth.simulate(control).finalPopulation);
    expect(growth.reviewNotebook({ trials })).toMatchObject({ sameControl: false, hasDifferentControls: true, controlGroupCount: 2 });
  });

  it('does not invent comparisons or zero-valued evidence for missing controls', () => {
    const conditions = optimum('ecoli');
    const review = growth.reviewNotebook({ control: conditions, trials: [{ id: 7, conditions, prediction: 'invalid' }] });
    expect(review).toMatchObject({ controlGroupCount: 0, missingControls: 1, sameControl: false, hasDifferentControls: false });
    expect(review.rows[0]).toMatchObject({ id: 7, control: null, controlPopulation: null, outcome: null, difference: null, design: null, prediction: '', changed: [] });
    expect(review.rows[0].trialPopulation).toBe(growth.simulate(conditions).finalPopulation);
    expect(growth.reviewNotebook(null).rows).toEqual([]);
  });

  it('keeps remaining trial identities after removal and returns an immutable review', () => {
    const input = { trials: [2, 6, 11].map(id => ({ id, control: optimum('ecoli'), conditions: optimum('ecoli', 0), prediction: 'lower' })) };
    const original = growth.reviewNotebook(input);
    input.trials.splice(1, 1);
    const changed = growth.reviewNotebook(input);
    expect(changed.rows.map(row => row.id)).toEqual([2, 11]);
    expect(original.rows.map(row => row.id)).toEqual([2, 6, 11]);
    expect(Object.isFrozen(changed)).toBe(true);
    expect(Object.isFrozen(changed.rows)).toBe(true);
    expect(Object.isFrozen(changed.rows[0].control)).toBe(true);
    expect(Object.isFrozen(changed.rows[0].changed)).toBe(true);
  });
});
