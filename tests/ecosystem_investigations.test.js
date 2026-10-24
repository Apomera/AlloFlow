import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let api;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_ecosystem.js', 'ecosystem');
  api = window.StemLab.ecosystemFoodWeb;
});
const clone = value => JSON.parse(JSON.stringify(value));

describe('guided food-web investigation evidence', () => {
  it('provides four independent case definitions with normalized setups and three reasoning steps', () => {
    expect(api.investigations).toEqual(['cascade', 'refuge', 'insects', 'soil']);
    for (const id of api.investigations) {
      const study = api.investigation(id);
      expect(study.id).toBe(id);
      expect(study.config).toEqual(api.normalize(study.config));
      expect(study.pathway).toHaveLength(3);
      expect(Object.keys(study.prompts)).toEqual(['before', 'event', 'after']);
      expect(study.limitation.length).toBeGreaterThan(30);
      const original = clone(study);
      study.config.initial.plants = 0;
      study.pathway[0].detail = 'changed';
      expect(api.investigation(id)).toEqual(original);
    }
  });

  it.each(['cascade', 'refuge', 'insects', 'soil'])('%s distinguishes the immediate event from the delayed response using exact paired values', id => {
    const study = api.investigation(id), pair = api.compare(study.config);
    const checkpoints = api.investigationEvidence(id, pair, study.config);
    expect(checkpoints.map(point => point.id)).toEqual(['before', 'event', 'after']);
    expect(checkpoints.map(point => point.step)).toEqual([79, 80, 240]);
    expect(checkpoints.map(point => point.time)).toEqual([7.9, 8, 24]);
    expect(checkpoints.slice(0, 2).map(point => point.direction)).toEqual(['same', 'same']);
    expect(checkpoints[2].direction).not.toBe('same');
    for (const point of checkpoints) {
      expect(point.baseline).toBe(pair.baseline[point.step].values[study.focus]);
      expect(point.experiment).toBe(pair.experiment[point.step].values[study.focus]);
      expect(point.delta).toBe(point.experiment - point.baseline);
      expect(point.prompt).toBe(study.prompts[point.id]);
      expect(point.direction).toBe(point.delta === 0 ? 'same' : point.delta > 0 ? 'higher' : 'lower');
    }
  });

  it('checks each event mechanism without assigning its direct effect to the investigated group', () => {
    const cascade = api.investigation('cascade'), foxes = api.compare(cascade.config);
    expect(foxes.experiment[80].values.foxes).toBe(0);
    expect(foxes.experiment[80].values.plants).toBe(foxes.baseline[80].values.plants);
    const refuge = api.investigation('refuge'), cover = api.compare(refuge.config);
    expect(cover.baseline[80].cover).toBe(10);
    expect(cover.experiment[80].cover).toBe(50);
    expect(cover.experiment[80].values).toEqual(cover.baseline[80].values);
    const insects = api.investigation('insects'), birds = api.compare(insects.config);
    expect(birds.experiment[80].values.caterpillars).toBe(birds.baseline[80].values.caterpillars * 0.2);
    expect(birds.experiment[80].values.bluetits).toBe(birds.baseline[80].values.bluetits);
    const soil = api.investigation('soil'), nutrients = api.compare(soil.config);
    expect(nutrients.experiment[80].soil.decomposers).toBeCloseTo(nutrients.baseline[80].soil.decomposers * 0.2, 12);
    expect(nutrients.experiment[80].soil.detritus).toBeGreaterThan(nutrients.baseline[80].soil.detritus);
    expect(nutrients.experiment[80].soil.nutrients).toBe(nutrients.baseline[80].soil.nutrients);
    expect(nutrients.experiment[80].values).toEqual(nutrients.baseline[80].values);
  });

  it('rejects unsupported case IDs and changed experimental setups', () => {
    const study = api.investigation('cascade'), pair = api.compare(study.config);
    for (const id of ['unknown', 'constructor', '__proto__', null, undefined]) {
      expect(api.investigation(id)).toBeNull();
      expect(api.investigationEvidence(id, pair, study.config)).toBeNull();
    }
    const changes = [
      { capacity: 180 }, { cover: 10 }, { eventStep: 90 }, { target: 'rabbits' }, { event: 'reduce' },
      { initial: { ...study.config.initial, plants: 100 } },
      { enabled: { ...study.config.enabled, owls: false } },
      { soil: { ...study.config.soil, enabled: true } }
    ];
    for (const change of changes) expect(api.investigationEvidence('cascade', pair, { ...study.config, ...change })).toBeNull();
    for (const invalid of [null, undefined, [], 'cascade']) expect(api.investigationEvidence('cascade', pair, invalid)).toBeNull();
  });

  it('rejects incomplete, nonfinite, negative, mistimed and sparse sample pairs', () => {
    const study = api.investigation('cascade'), pair = api.compare(study.config);
    const mutations = [
      p => p.baseline.pop(),
      p => { delete p.experiment[20]; },
      p => { p.baseline[20].time = 99; },
      p => { p.experiment[80].step = 81; },
      p => { p.experiment[240].values.plants = Infinity; },
      p => { p.baseline[80].values.plants = NaN; },
      p => { p.experiment[10].values.owls = -1; },
      p => { delete p.experiment[40].values.voles; },
      p => { p.baseline[30].capacity = 0; },
      p => { p.experiment[80].cover = 90; }
    ];
    for (const mutate of mutations) { const invalid = clone(pair); mutate(invalid); expect(api.investigationEvidence('cascade', invalid, study.config)).toBeNull(); }
    for (const invalid of [null, {}, { baseline: [], experiment: [] }]) expect(api.investigationEvidence('cascade', invalid, study.config)).toBeNull();
    const soil = api.investigation('soil'), soilPair = api.compare(soil.config);
    delete soilPair.baseline[79].soil;
    expect(api.investigationEvidence('soil', soilPair, soil.config)).toBeNull();
    const poisonedSoil = api.compare(soil.config);
    poisonedSoil.experiment[80].soil.nutrients = NaN;
    expect(api.investigationEvidence('soil', poisonedSoil, soil.config)).toBeNull();
  });

  it('preserves inputs and does not round a small nonzero difference to same', () => {
    const study = api.investigation('cascade'), pair = api.compare(study.config);
    pair.experiment[240].values.plants = pair.baseline[240].values.plants + 1e-10;
    const originalPair = clone(pair), originalStudy = clone(study);
    const evidence = api.investigationEvidence('cascade', pair, study.config);
    expect(evidence[2].direction).toBe('higher');
    expect(evidence[2].delta).toBeGreaterThan(0);
    expect(evidence[2].delta).toBeLessThan(0.00001);
    evidence[0].baseline = 999;
    expect(pair).toEqual(originalPair);
    expect(study).toEqual(originalStudy);
  });
});

describe('investigation context in saved field evidence', () => {
  function observation(caseId = 'cascade', forecast = 'lower', id = 1) {
    const study = api.investigation(caseId), pair = api.compare(study.config);
    return api.capture(study.config, pair, 240, study.focus, 'Prediction reason.', 'Evidence explanation.', id,
      { id: caseId, forecast, limitation: 'Check field observations before generalizing.' });
  }

  it.each(['cascade', 'refuge', 'insects', 'soil'])('%s keeps investigation metadata and original numerical evidence through serialization', caseId => {
    const note = observation(caseId);
    note.experiment.values.plants = 1.234e-9;
    const restored = api.notebook(clone([note]));
    expect(restored).toEqual([note]);
    expect(restored[0].experiment.values.plants).toBe(1.234e-9);
    restored[0].investigation.limitation = 'Changed';
    restored[0].config.initial.plants = 0;
    expect(note.investigation.limitation).toBe('Check field observations before generalizing.');
    expect(note.config.initial.plants).toBe(110);
  });

  it('copies a committed forecast and model limit independently for each evidence checkpoint', () => {
    const study = api.investigation('refuge'), pair = api.compare(study.config);
    const context = { id: 'refuge', forecast: 'unsure', limitation: 'Shelter quality could differ.' };
    const notes = [79, 80, 240].map((step, index) => api.capture(study.config, pair, step, study.focus, 'My reason', 'My explanation', index + 1, context));
    context.forecast = 'higher'; context.limitation = 'Changed after saving';
    notes[0].investigation.forecast = 'same';
    expect(notes[1].investigation).toEqual({ id: 'refuge', forecast: 'unsure', limitation: 'Shelter quality could differ.' });
    expect(notes[2].investigation).toEqual(notes[1].investigation);
    expect(api.notebook(clone(notes))).toEqual(notes);
  });

  it('preserves legacy observations and drops invalid metadata without discarding valid paired evidence', () => {
    const note = observation();
    const legacy = clone(note); delete legacy.investigation;
    expect(api.notebook([legacy])).toEqual([legacy]);
    const contexts = [
      null, {}, { id: 'unknown', forecast: 'lower' }, { id: '__proto__', forecast: 'lower' },
      { id: 'cascade', forecast: 'correct' }, { id: 'refuge', forecast: 'lower' },
      { id: 'cascade', forecast: null }, { id: 'cascade', forecast: [] }
    ];
    for (const context of contexts) {
      const candidate = clone(note); candidate.investigation = context;
      const restored = api.notebook([candidate]);
      expect(restored).toHaveLength(1);
      expect(restored[0]).toEqual(legacy);
    }
    const altered = clone(note); altered.config.capacity = 180;
    const restored = api.notebook([altered]);
    expect(restored).toHaveLength(1);
    expect(restored[0]).not.toHaveProperty('investigation');
    expect(restored[0].experiment).toEqual(note.experiment);
  });

  it('accepts only supported forecasts and bounds optional context text', () => {
    for (const forecast of ['higher', 'lower', 'same', 'unsure']) expect(api.notebook([observation('cascade', forecast)])[0].investigation.forecast).toBe(forecast);
    const note = observation();
    note.investigation.limitation = 'x'.repeat(1800);
    expect(api.notebook([note])[0].investigation.limitation).toHaveLength(1200);
    note.investigation.limitation = { unexpected: 'object' };
    expect(api.notebook([note])[0].investigation.limitation).toBe('');
  });

  it('exports the investigation question, committed forecast, model limit and original evidence as plain text', () => {
    const note = observation('insects', 'unsure');
    note.investigation.limitation = '<strong>Check other foods.</strong>\nMeasure caterpillars.';
    note.experiment.values.bluetits = 3.21e-10;
    const original = clone(note), study = api.investigation('insects');
    const output = api.notebookText([note]);
    expect(output).toContain('Investigation: ' + study.title);
    expect(output).toContain('Question: ' + study.question);
    expect(output).toContain('Prediction for Blue tits at time 24 compared with baseline: unsure');
    expect(output).toContain('Model limit: ' + note.investigation.limitation);
    expect(output).toContain('3.2100000e-10');
    expect(output).toContain('Prediction reason.');
    expect(output).toContain('Evidence explanation.');
    expect(note).toEqual(original);
  });
});
