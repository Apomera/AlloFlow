import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_ecosystem.js', 'ecosystem'); api = window.StemLab.ecosystemFoodWeb; });
const rabbit = (x, state = 'Grazing', extra = {}) => ({ active: true, x, z: 0, altitude: 0.025, state, foodAvailable: true, directAlarm: false, socialCue: null, refugeCue: null, spacingCue: null, spacingCooldown: 0, ...extra });
function fixture(alternative = false) {
  const before = { rabbits: [rabbit(0.6), rabbit(0.9, alternative ? 'Grazing' : 'Resting'), rabbit(0)] }, after = structuredClone(before);
  after.rabbits[2].state = 'Giving space'; after.rabbits[2].spacingCue = { id: 'rabbits', index: 0, age: 0, duration: 10, decisionDistance: 0.6 };
  return { frames: [before, after], encounter: { kind: 'spacing', actor: { id: 'rabbits', index: 2 }, cue: { id: 'rabbits', index: 0 }, start: 1, end: 1, before: 0, after: 1, step: 1 } };
}
function context(alternative = false) { const f = fixture(alternative); return api.spacingProbeCase(f.frames, f.encounter); }
function sighting() { return { kind: 'spacing', actorIndex: 2, cueIndex: 0, before: { step: 0 }, after: { step: 1 } }; }
function probe(alternative = false) { return { version: 1, trial: api.spacingProbeRun(context(alternative), 'distance', 1.5), prediction: 'stop', firstPrediction: 'continue', reflection: 'Only one cue input changed; this is not a modified trajectory.' }; }
function actualNote() {
  const config = { enabled: { voles: false, owls: false, caterpillars: false, bluetits: false }, initial: { rabbits: 90, foxes: 6 }, capacity: 160, cover: 10, event: 'none' }, pair = api.compare(config), frames = api.behaviorTimeline(config, pair.baseline), encounter = api.encounters(frames, config).find(e => e.kind === 'spacing');
  expect(encounter).toBeTruthy(); const c = api.spacingProbeCase(frames, encounter); expect(c).toBeTruthy();
  const p = frames[encounter.step].rabbits[encounter.actor.index], rawProbe = { version: 1, trial: api.spacingProbeRun(c, 'feeding', false), prediction: 'stop', firstPrediction: 'unsure', reflection: 'I tested the neighbor action only.' };
  const raw = { version: 1, kind: 'spacing', branch: 'baseline', actorIndex: encounter.actor.index, cueId: 'rabbits', cueIndex: encounter.cue.index, state: p.state, decisionDistance: p.spacingCue.decisionDistance, before: { step: encounter.before, state: frames[encounter.before].rabbits[encounter.actor.index].state }, after: { step: encounter.after, state: frames[encounter.after].rabbits[encounter.actor.index].state }, forecast: 'avoid', limitation: 'No biomass conclusion from this scene.', probe: rawProbe };
  return { config, pair, frames, encounter, raw, rawProbe, note: api.capture(config, pair, encounter.step, 'rabbits', 'My original wildlife forecast.', 'Observed spacing.', 1, null, raw) };
}

describe('controlled test of one recorded neighbor cue', () => {
  it('extracts an actual starting decision with detached original previous-frame inputs', () => {
    const f = fixture(), before = JSON.stringify(f), c = api.spacingProbeCase(f.frames, f.encounter);
    expect(c).toMatchObject({ version: 1, id: 'spacing-probe:2:0:1', step: 1, actorIndex: 2, cueIndex: 0, recorded: { state: 'Giving space', sourceIndex: 0, decisionDistance: 0.6 } });
    expect(c.input.rabbits[2].state).toBe('Grazing'); c.input.rabbits[0].x = 99; expect(JSON.stringify(f)).toBe(before); expect(context().input.rabbits[0].x).toBe(0.6);
  });

  it('changes only the selected neighbor distance or action and holds all other inputs fixed', () => {
    const c = context(), before = JSON.stringify(c), near = api.spacingProbeRun(c, 'distance', 0.3), far = api.spacingProbeRun(c, 'distance', 1.5), resting = api.spacingProbeRun(c, 'feeding', false);
    expect(near.outcome).toBe('continue'); expect(near.modified).toEqual({ state: 'Giving space', sourceIndex: 0, decisionDistance: 0.3 });
    expect(far.outcome).toBe('stop'); expect(far.modified).toEqual({ state: 'Grazing', sourceIndex: null, decisionDistance: null });
    expect(resting.outcome).toBe('stop'); expect(resting.modifiedInput.rabbits[0].state).toBe('Resting'); expect(resting.modifiedInput.rabbits[0].foodAvailable).toBe(true);
    for (const trial of [near, far, resting]) { expect(trial.modifiedInput.rabbits[1]).toEqual(c.input.rabbits[1]); expect(trial.modifiedInput.rabbits[2]).toEqual(c.input.rabbits[2]); expect(trial.modifiedInput.food).toBe(c.input.food); expect(trial.original).toEqual(c.recorded); }
    const expected = structuredClone(c.input); expected.rabbits[0].x = 1.5; expect(far.modifiedInput).toEqual(expected); expect(JSON.stringify(c)).toBe(before);
  });

  it('preserves another eligible neighbor instead of forcing a no-response result', () => {
    for (const [variable, value] of [['distance', 1.5], ['feeding', false]]) {
      const trial = api.spacingProbeRun(context(true), variable, value);
      expect(trial.outcome).toBe('switch'); expect(trial.modified).toEqual({ state: 'Giving space', sourceIndex: 1, decisionDistance: 0.9 });
    }
    expect(api.spacingProbeRun(context(), 'feeding', true)).toMatchObject({outcome:'continue',control:true});
    expect(api.spacingProbeRun(context(), 'distance', 0.6)).toMatchObject({outcome:'continue',control:true});
    expect(api.spacingProbeRun(context(), 'distance', 1.5).control).toBe(false);
  });

  it('uses the original bearing and handles coincident input positions without a non-finite direction', () => {
    const f = fixture(); f.frames[0].rabbits[0].x = 0; f.frames[0].rabbits[0].z = 0.6;
    const c = api.spacingProbeCase(f.frames, f.encounter), moved = api.spacingProbeRun(c, 'distance', 2);
    expect(moved.modifiedInput.rabbits[0].x).toBe(0); expect(moved.modifiedInput.rabbits[0].z).toBe(2);
    f.frames[0].rabbits[0].z = 0; f.frames[1].rabbits[2].spacingCue.decisionDistance = 0;
    const coincident = api.spacingProbeRun(api.spacingProbeCase(f.frames, f.encounter), 'distance', 1.2);
    expect([coincident.modifiedInput.rabbits[0].x, coincident.modifiedInput.rabbits[0].z]).toEqual([1.2, 0]);
  });

  it('requires a fresh actual onset and rejects missing, corrupt or mismatched recordings', () => {
    for (const mutate of [f => { f.encounter.kind = 'fox'; }, f => { f.encounter.actor.id = 'foxes'; }, f => { f.encounter.cue.id = 'voles'; }, f => { f.frames[1].rabbits[2].active = false; }, f => { f.frames[1].rabbits[2].spacingCue.age = 1; }, f => { f.frames[1].rabbits[2].spacingCue.index = 1; }, f => { f.frames[0].rabbits[2].spacingCue = {}; }, f => { f.frames[0].rabbits[0].x = NaN; }, f => { f.frames[0].rabbits[0].state = 'Resting'; }, f => { f.frames[1].rabbits[2].spacingCue.decisionDistance = 0.5; }, f => { f.frames[0] = null; }]) {
      const f = fixture(); mutate(f); expect(api.spacingProbeCase(f.frames, f.encounter)).toBeNull();
    }
    for (const frames of [null, {}, 'bad', []]) expect(api.spacingProbeCase(frames, fixture().encounter)).toBeNull();
  });

  it('rejects malformed frozen inputs, invalid manipulation values and altered factual outputs', () => {
    for (const [variable, value] of [['bad', 1], ['distance', -1], ['distance', 2.5001], ['distance', NaN], ['distance', '1'], ['feeding', 0], ['feeding', 'false']]) expect(api.spacingProbeRun(context(), variable, value)).toBeNull();
    for (const mutate of [c => { c.actorIndex = 0; }, c => { c.cueIndex = 2; }, c => { c.step = 0; }, c => { c.input.count = 0; }, c => { c.input.rabbits[0].x = Infinity; }, c => { c.input.rabbits[0].social = null; }, c => { c.input.rabbits[2].cooldown = 2; }, c => { c.recorded.state = 'Grazing'; }, c => { c.recorded.sourceIndex = 1; }, c => { c.recorded.decisionDistance = 999; }]) { const c = context(); mutate(c); expect(api.spacingProbeRun(c, 'distance', 1)).toBeNull(); }
    // The existing rule decrements cooldown before testing; one remaining
    // sample expires here, while the two-sample mutation above still blocks.
    const expiring=context();expiring.input.rabbits[2].cooldown=1;expect(api.spacingProbeRun(expiring,'distance',1).original.state).toBe('Giving space');
  });

  it('recomputes saved outputs, rejects tampering and retains first versus revised bench predictions', () => {
    const raw = probe(), original = JSON.stringify(raw), saved = api.spacingProbeRecord(raw, sighting(), 'rabbits'); expect(saved).toEqual(raw);
    saved.trial.modifiedInput.rabbits[0].x = 99; saved.firstPrediction = 'switch'; expect(JSON.stringify(raw)).toBe(original);
    for (const mutate of [p => { p.firstPrediction = ''; }, p => { p.prediction = 'bad'; }, p => { p.trial.outcome = 'continue'; }, p => { p.trial.modified.state = 'Giving space'; }, p => { p.trial.modified.sourceIndex = 0; }, p => { p.trial.original.decisionDistance = 0.5; }, p => { p.trial.modifiedInput.rabbits[0].x = 2; }, p => { p.trial.context.actorIndex = 1; }]) { const p = probe(); mutate(p); expect(api.spacingProbeRecord(p, sighting(), 'rabbits')).toBeNull(); }
    expect(api.spacingProbeRecord(probe(), { ...sighting(), kind: 'escape' }, 'rabbits')).toBeNull(); expect(api.spacingProbeRecord(probe(), sighting(), 'foxes')).toBeNull(); expect(api.spacingProbeRecord(probe(), { ...sighting(), after: { step: 0 } }, 'rabbits')).toBeNull();
    for(const changed of [{before:null},{after:null},{before:{}},{after:{}},{before:{step:0.5}},{after:{step:Infinity}}])expect(api.spacingProbeRecord(probe(),{...sighting(),...changed},'rabbits')).toBeNull();
  });

  it('round-trips the bench separately from the original wildlife forecast and drops only invalid optional evidence', () => {
    const { note, rawProbe } = actualNote(); expect(note.sighting.probe).toEqual(rawProbe); expect(note.sighting.forecast).toBe('avoid');
    const restored = api.notebook([note]); expect(restored[0].sighting.probe).toEqual(rawProbe); expect(restored[0].prediction).toBe('My original wildlife forecast.');
    const text = api.notebookText(restored); expect(text).toContain('Cue test bench:'); expect(text).toContain('First bench prediction:'); expect(text).toContain('not recorded animal positions'); expect(text).toContain(note.prediction);
    const originalInputs=text.split('\n').find(line=>line.startsWith('Frozen original rule inputs (JSON): '));
    const testedInputs=text.split('\n').find(line=>line.startsWith('Frozen tested rule inputs (JSON): '));
    expect(JSON.parse(originalInputs.slice('Frozen original rule inputs (JSON): '.length))).toEqual(rawProbe.trial.context.input);
    expect(JSON.parse(testedInputs.slice('Frozen tested rule inputs (JSON): '.length))).toEqual(rawProbe.trial.modifiedInput);
    const invalid = structuredClone(note); invalid.sighting.probe.trial.modified.state = 'Pouncing'; const validNote = api.notebook([invalid])[0];
    expect(validNote.sighting).not.toHaveProperty('probe'); expect(validNote.sighting.forecast).toBe('avoid'); expect(validNote.baseline).toEqual(note.baseline); expect(validNote.experiment).toEqual(note.experiment);
  });

  it('reproduces actual recorded rule results without mutating frames, notes or population outcomes', () => {
    const { config, pair, frames, encounter } = actualNote(), original = JSON.stringify({ pair, frames }), c = api.spacingProbeCase(frames, encounter), a = api.spacingProbeRun(c, 'distance', 1.5), b = api.spacingProbeRun(c, 'distance', 1.5);
    const control=api.spacingProbeRun(c,'distance',c.recorded.decisionDistance);expect(control.modifiedInput).toEqual(c.input);expect(control.modified).toEqual(control.original);expect(control.control).toBe(true);
    expect(a).toEqual(b); a.modifiedInput.rabbits[0].x = 99; a.modified.state = 'Changed'; expect(api.spacingProbeRun(c, 'distance', 1.5)).toEqual(b);
    expect(JSON.stringify({ pair, frames })).toBe(original); expect(api.compare(config)).toEqual(pair);
  });
});
