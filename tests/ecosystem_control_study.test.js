// Copy into tests/ after root integrates the snippets and API exports.
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_ecosystem.js', 'ecosystem'); api = window.StemLab.ecosystemFoodWeb; });
const config = { event: 'remove', target: 'foxes', eventStep: 80 };
const before = { step: 40, time: 4, baseline: 50.1234567890123, experiment: 50.1234567890123 };
const after = { step: 160, time: 16, baseline: 60.1234567890123, experiment: 85.2634567890123 };
const estimates = { baseline: 10, experiment: 35.1, extra: 25.1 };
function fixture() {
  const evidence = api.controlEvidence(config, 'rabbits', before, after);
  const raw = { version: 1, configKey: JSON.stringify(api.normalize(config)), focus: 'rabbits', before: { ...before }, after: { ...after }, estimates: { ...estimates }, firstEstimates: { baseline: 0, experiment: 0, extra: 0 }, reflection: 'The baseline also changed. I subtracted that background change.', runPrediction: 'Removing foxes may change rabbits indirectly.' };
  return { evidence, raw };
}

describe('frozen quantitative controlled comparison', () => {
  it('captures the exact original biomass values at one shared modeled time without mutating either branch', () => {
    const pair = api.compare(config), original = JSON.stringify(pair), sample = api.controlSample(pair, config, 'rabbits', 40);
    expect(sample).toEqual({ step: 40, time: 4, baseline: pair.baseline[40].values.rabbits, experiment: pair.experiment[40].values.rabbits });
    sample.baseline = 999; expect(JSON.stringify(pair)).toBe(original);
    for (const step of [-1, .5, 241, NaN, '40', null]) expect(api.controlSample(pair, config, 'rabbits', step)).toBeNull();
    expect(api.controlSample(pair, { ...config, event: 'none' }, 'rabbits', 40)).toBeNull();
    expect(api.controlSample(pair, { ...config, enabled: { rabbits: false } }, 'rabbits', 40)).toBeNull();
    expect(api.controlSample(pair, config, 'invented', 40)).toBeNull();
  });

  it('requires strictly before and at-or-after the disturbance and a shared deterministic pre-event value', () => {
    expect(api.controlEvidence(config, 'rabbits', before, { ...after, step: 80, time: 8 })).toBeTruthy();
    for (const mutate of [p => { p.before.step = 80; p.before.time = 8; }, p => { p.after.step = 79; p.after.time = 7.9; }, p => { p.before.time = 4.1; }, p => { p.before.experiment += .1; }, p => { p.after.baseline = -1; }, p => { p.after.experiment = Infinity; }, p => { p.before.baseline = '50'; }, p => { p.after.step = 160.5; }]) {
      const p = { before: { ...before }, after: { ...after } }; mutate(p); expect(api.controlEvidence(config, 'rabbits', p.before, p.after)).toBeNull();
    }
    expect(api.controlEvidence({ event: 'none' }, 'rabbits', before, after)).toBeNull();
    expect(api.controlEvidence(config, 'unknown', before, after)).toBeNull();
  });

  it('subtracts background change rather than mistaking the experiment’s before/after rise for its extra modeled change', () => {
    const { evidence } = fixture();
    expect(evidence.changes.baseline).toBe(10); expect(evidence.changes.experiment).toBeCloseTo(35.14, 12); expect(evidence.changes.extra).toBeCloseTo(25.14, 12);
    const { before: a, after: b } = evidence; a.baseline = 999; b.experiment = 999; expect(before.baseline).toBe(50.1234567890123); expect(after.experiment).toBe(85.2634567890123);
  });

  it('distinguishes negative extra change from a declining experiment and preserves exact nonzero values below display precision', () => {
    const evidence = api.controlEvidence(config, 'rabbits', { ...before, baseline: 10, experiment: 10 }, { ...after, baseline: 20, experiment: 15 });
    expect(evidence.changes).toEqual({ baseline: 10, experiment: 5, extra: -5 });
    const tiny = api.controlEvidence(config, 'rabbits', { ...before, baseline: .001, experiment: .001 }, { ...after, baseline: .004, experiment: .003 });
    expect(tiny.before.baseline).toBe(.001); expect(tiny.changes.extra).toBe(-.001); expect(api.controlCheck(tiny, { baseline: 0, experiment: 0, extra: 0 }).matches).toBe(3);
  });

  it('requires three explicit finite estimates, allowing real zero and preserving separate first/latest commitments', () => {
    const { evidence } = fixture();
    for (const mutate of [a => { a.baseline = null; }, a => { a.extra = ''; }, a => { a.experiment = '35.1'; }, a => { a.extra = NaN; }, a => { a.extra = evidence.extent + .1; }]) { const a = { ...estimates }; mutate(a); expect(api.controlCheck(evidence, a)).toBeNull(); }
    const first = { baseline: 0, experiment: 0, extra: 0 }, checked = api.controlCheck(evidence, estimates, first);
    expect(checked).toMatchObject({ matches: 3, firstMatches: 0, total: 3 }); expect(checked.rows[2].value).toBe(evidence.changes.extra); expect(checked.rows[2].rounded).toBe(25.1);
    const original = JSON.stringify({ first, estimates }); checked.rows[0].estimate = 999; expect(JSON.stringify({ first, estimates })).toBe(original);
  });

  it('binds saved metadata to configuration, focus, after-time and the parent note’s exact saved after-values', () => {
    const { raw } = fixture(), savedAfter = { baseline: after.baseline, experiment: after.experiment };
    expect(api.controlRecord(raw, config, 160, 'rabbits', savedAfter)).toEqual(raw);
    expect(api.controlRecord(raw, config, 159, 'rabbits', savedAfter)).toBeNull(); expect(api.controlRecord(raw, config, 160, 'foxes', savedAfter)).toBeNull(); expect(api.controlRecord(raw, { ...config, cover: 80 }, 160, 'rabbits', savedAfter)).toBeNull();
    for (const key of ['baseline', 'experiment']) { const bad = structuredClone(raw); bad.after[key] += .0000000001; expect(api.controlRecord(bad, config, 160, 'rabbits', savedAfter)).toBeNull(); }
    const bad = structuredClone(raw); bad.before.baseline += .1; expect(api.controlRecord(bad, config, 160, 'rabbits', savedAfter)).toBeNull();
  });

  it('keeps old frozen values valid without recomputing them but refuses interactive restoration when any actual paired value or configuration differs', () => {
    const pair = api.compare(config), a = api.controlSample(pair, config, 'rabbits', 40), b = api.controlSample(pair, config, 'rabbits', 160), evidence = api.controlEvidence(config, 'rabbits', a, b);
    const raw = { ...fixture().raw, before: a, after: b, estimates: { ...evidence.changes }, firstEstimates: { ...evidence.changes } };
    expect(api.controlMatches(raw, config, pair, 'rabbits')).toBe(true);
    for (const branch of ['baseline', 'experiment']) for (const step of [40, 160]) { const altered = structuredClone(pair); altered[branch][step].values.rabbits += 1e-10; expect(api.controlMatches(raw, config, altered, 'rabbits')).toBe(false); }
    expect(api.controlMatches(raw, { ...config, eventStep: 90 }, pair, 'rabbits')).toBe(false);
    const historical = structuredClone(raw); historical.before.baseline += .125; historical.before.experiment += .125;
    expect(api.controlRecord(historical, config, 160, 'rabbits', b)).toBeTruthy(); expect(api.controlMatches(historical, config, pair, 'rabbits')).toBe(false);
  });

  it('round-trips exact evidence, first/latest estimates and the original ecological prediction through capture, notebook normalization and JSON export', () => {
    const pair = api.compare(config), a = api.controlSample(pair, config, 'rabbits', 40), b = api.controlSample(pair, config, 'rabbits', 160), evidence = api.controlEvidence(config, 'rabbits', a, b);
    const raw = { ...fixture().raw, before: a, after: b, estimates: { ...evidence.changes }, firstEstimates: { baseline: 0, experiment: 0, extra: 0 } };
    const note = api.capture(config, pair, 160, 'rabbits', 'My first controlled-comparison estimates were zero.', raw.reflection, 1, null, null, null, null, raw);
    expect(note.controlStudy).toEqual(raw); expect(api.notebook([note])[0]).toEqual(note); expect(note.controlStudy.runPrediction).toBe(raw.runPrediction); expect(note.prediction).not.toBe(raw.runPrediction);
    const text = api.notebookText([note]), line = text.split('\n').find(line => line.startsWith('Frozen controlled-comparison evidence (JSON): '));
    expect(JSON.parse(line.slice('Frozen controlled-comparison evidence (JSON): '.length))).toEqual(raw); expect(text).toContain('Extra modeled change = experiment change minus baseline change.'); expect(text).toContain(raw.runPrediction);
    const beforeNote = JSON.stringify(note); raw.before.baseline = 999; raw.estimates.extra = 999; expect(JSON.stringify(note)).toBe(beforeNote);
  });

  it('drops only contradictory optional evidence while preserving the saved population samples and legacy notes', () => {
    const pair = api.compare(config), a = api.controlSample(pair, config, 'rabbits', 40), b = api.controlSample(pair, config, 'rabbits', 160), e = api.controlEvidence(config, 'rabbits', a, b), raw = { ...fixture().raw, before: a, after: b, estimates: e.changes, firstEstimates: e.changes };
    const note = api.capture(config, pair, 160, 'rabbits', 'prediction', 'reflection', 1, null, null, null, null, raw), bad = structuredClone(note); bad.controlStudy.after.experiment += 1;
    const restored = api.notebook([bad])[0]; expect(restored).not.toHaveProperty('controlStudy'); expect(restored.baseline).toEqual(note.baseline); expect(restored.experiment).toEqual(note.experiment); expect(restored.prediction).toBe('prediction');
    const legacy = structuredClone(note); delete legacy.controlStudy; expect(api.notebook([legacy])[0]).toEqual(legacy);
  });
});
