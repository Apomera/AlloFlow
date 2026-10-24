import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_ecosystem.js', 'ecosystem'); api = window.StemLab.ecosystemFoodWeb; });
const contacts = [[true, true, true, true], [true, false, false, true], [false, false, false, false], [false, true, true, false], [true, true, true, true]];
function fixture() {
  const frames = contacts.map((flags, step) => ({ foxes: [{ active: true, state: step === 2 ? 'Pouncing' : 'Stalking', x: step / 10, z: 1, yaw: 0.2, footPlants: flags.map((planted, k) => ({ x: step / 10 + k / 100, z: 1 + k / 10, planted, held: planted && step === 4 })) }] }));
  const study = { id: 'foxes:0:pounce:0:2:4', species: 'foxes', index: 0, kind: 'pounce', sequence: true, samples: [0, 2, 4].map(step => ({ step, value: step === 2 ? 0.3 : 0, supportFeet: contacts[step].filter(Boolean).length, hindContact: contacts[step][0], foreContact: contacts[step][1], pawAngle: 0 })) };
  return { frames, study };
}
function data() { const f = fixture(), plan = api.footfallPlan(f.frames, f.study), grid = plan.samples.map(s => s.feet.map(f => f.planted)); return { ...f, plan, grid }; }
function rawRecord() { const { study, plan, grid } = data(), firstGrid = structuredClone(grid); firstGrid[0][0] = false; return { version: 1, studyId: study.id, samples: plan.samples, grid, firstGrid, prediction: 'clear', firstPrediction: 'supported', reflection: 'The first and last samples have support; the middle checkpoint is all clear.' }; }
function movement(study = fixture().study) { return { version: 1, branch: 'baseline', index: 0, studyId: study.id, kind: 'pounce', samples: study.samples, order: [1, 0, 2] }; }
function actualNote() {
  const config = { event: 'none' }, pair = api.compare(config), frames = api.behaviorTimeline(config, pair.baseline), study = api.motionStudy(frames, 'rabbits', 0), plan = api.footfallPlan(frames, study);
  expect(study).toBeTruthy(); expect(plan).toBeTruthy(); const grid = plan.samples.map(s => s.feet.map(f => f.planted)), firstGrid = structuredClone(grid); firstGrid[0][0] = !firstGrid[0][0];
  const evidence = api.movementEvidence(study, 'baseline', { checked: true, order: [0, 1, 2], firstOrder: [1, 0, 2], reflection: 'My original movement explanation.' });
  const footfall = { version: 1, studyId: study.id, samples: plan.samples, grid, firstGrid, prediction: 'clear', firstPrediction: 'supported', reflection: 'Only these three checkpoints are classified.' }, rawMovement = { ...evidence.movement, footfall };
  return { config, pair, frames, study, plan, evidence, footfall, note: api.capture(config, pair, evidence.step, study.species, evidence.prediction, evidence.explanation, 1, null, null, rawMovement) };
}

describe('recorded four-paw footfall strip', () => {
  it('keeps the three exact movement checkpoints and anatomical paw-slot order', () => {
    const { frames, study } = fixture(), original = JSON.stringify({ frames, study }), plan = api.footfallPlan(frames, study);
    expect(plan).toMatchObject({ id: `${study.id}:footfall`, studyId: study.id, species: 'foxes', index: 0, elapsed: 0.4 }); expect(plan.samples.map(s => s.step)).toEqual([0, 2, 4]);
    expect(plan.samples[0].feet.map(f => f.id)).toEqual(['left-hind', 'left-fore', 'right-hind', 'right-fore']); expect(plan.samples.map(s => s.supportCount)).toEqual([4, 0, 4]);
    expect(plan.samples[0].feet.map(f => [f.x, f.z])).toEqual(frames[0].foxes[0].footPlants.map(f => [f.x, f.z]));
    plan.samples[0].feet[0].x = 999; plan.samples[0].body.x = 999; expect(JSON.stringify({ frames, study })).toBe(original);
  });

  it('requires complete live recorded contacts throughout the movement window', () => {
    for (const mutate of [f => { f.study.species = 'voles'; }, f => { f.study.index = 16; }, f => { f.study.sequence = false; }, f => { f.study.samples[1].step = 0; }, f => { f.study.samples[2].step = 5; }, f => { f.frames[1].foxes[0].active = false; }, f => { f.frames[1].foxes[0].footPlants.pop(); }, f => { f.frames[2].foxes[0].footPlants[0].planted = 0; }, f => { f.frames[2].foxes[0].footPlants[0].held = true; }, f => { f.frames[1].foxes[0].footPlants[0].x = NaN; }, f => { f.frames[1].foxes[0].yaw = Infinity; }, f => { f.frames[1] = null; }]) { const f = fixture(); mutate(f); expect(api.footfallPlan(f.frames, f.study)).toBeNull(); }
    for (const frames of [null, {}, [], 'bad']) expect(api.footfallPlan(frames, fixture().study)).toBeNull();
  });

  it('does not interpret unknown marks as clear and preserves first versus revised grids', () => {
    const { plan, grid } = data(), first = structuredClone(grid); first[0][0] = false;
    const check = api.footfallCheck(plan, grid, first); expect(check).toMatchObject({ total: 12, matches: 12, firstMatches: 11, allClear: [1], prediction: 'clear', elapsed: 0.4 });
    expect(check.samples.map(s => s.learnerCount)).toEqual([4, 0, 4]); expect(check.samples.map(s => s.supportCount)).toEqual([4, 0, 4]);
    for (const mutate of [g => { g[0][0] = null; }, g => { g[0][0] = 'false'; }, g => { g[0].pop(); }, g => { g.pop(); }]) { const g = structuredClone(grid); mutate(g); expect(api.footfallCheck(plan, g)).toBeNull(); }
    const original = JSON.stringify({ plan, grid, first }); check.samples[0].correct[0] = false; expect(JSON.stringify({ plan, grid, first })).toBe(original);
  });

  it('requires all four paws clear rather than equating a single lifted paw with no support', () => {
    const f = fixture(); f.frames[2].foxes[0].footPlants[0].planted = true; const plan = api.footfallPlan(f.frames, f.study), grid = plan.samples.map(s => s.feet.map(f => f.planted)), check = api.footfallCheck(plan, grid);
    expect(check.prediction).toBe('supported'); expect(check.allClear).toEqual([]); expect(check.samples[1].supportCount).toBe(1); expect(check.firstMatches).toBeNull();
  });

  it('normalizes exact world contacts, initial marks, revised marks and separate support predictions', () => {
    const raw = rawRecord(), original = JSON.stringify(raw), saved = api.footfallRecord(raw, movement(), 'foxes'); expect(saved).toEqual(raw);
    saved.samples[0].feet[0].x = 999; saved.firstGrid[0][0] = true; saved.grid[0][0] = false; expect(JSON.stringify(raw)).toBe(original);
    const long = rawRecord(); long.reflection = 'x'.repeat(1500); expect(api.footfallRecord(long, movement(), 'foxes').reflection.length).toBe(1200);
  });

  it('rejects identity, step, contact-count and left-paw contradictions with the parent movement record', () => {
    for (const mutate of [r => { r.version = 2; }, r => { r.studyId = 'wrong'; }, r => { r.prediction = ''; }, r => { r.firstPrediction = 'flying'; }, r => { r.grid[0][0] = null; }, r => { r.firstGrid = []; }, r => { r.samples[0].step = 1; }, r => { r.samples[0].feet[0].id = 'right-hind'; }, r => { r.samples[0].feet[0].x = NaN; }, r => { r.samples[1].feet[0].held = true; }, r => { r.samples[0].feet[0].planted = false; }]) { const r = rawRecord(); mutate(r); expect(api.footfallRecord(r, movement(), 'foxes')).toBeNull(); }
    const p = movement(); p.samples[0].hindContact = false; expect(api.footfallRecord(rawRecord(), p, 'foxes')).toBeNull();
    const q = movement(); q.samples[0].foreContact = false; expect(api.footfallRecord(rawRecord(), q, 'foxes')).toBeNull();
    expect(api.footfallRecord(rawRecord(), movement(), 'voles')).toBeNull(); expect(api.footfallRecord(rawRecord(), null, 'foxes')).toBeNull();
  });

  it('round-trips the strip without replacing the original movement sequence prediction', () => {
    const { note, footfall, evidence } = actualNote(), restored = api.notebook([note]); expect(note.movement.footfall).toEqual(footfall); expect(restored[0].movement.footfall).toEqual(footfall);
    expect(restored[0].prediction).toBe(evidence.prediction); expect(restored[0].movement.order).toEqual([1, 0, 2]);
    expect(restored[0].movement.latestOrder).toEqual([0, 1, 2]); expect(restored[0].movement.reflection).toBe('My original movement explanation.');
    const text = api.notebookText(restored); expect(text).toContain('First footfall prediction:'); expect(text).toContain('Latest contact grid:'); expect(text).toContain('Footfall checkpoint 3'); expect(text).toContain('Three sparse checkpoints'); expect(text).toContain(evidence.prediction);
    const frozen=text.split('\n').find(line=>line.startsWith('Frozen footfall evidence (JSON): '));
    expect(JSON.parse(frozen.slice('Frozen footfall evidence (JSON): '.length))).toEqual(footfall);
  });

  it('drops only invalid optional footfall evidence while preserving the movement and saved populations', () => {
    const { note } = actualNote(), bad = structuredClone(note); bad.movement.footfall.samples[0].feet[0].planted = !bad.movement.footfall.samples[0].feet[0].planted;
    const normalized = api.notebook([bad])[0]; expect(normalized.movement).toBeTruthy(); expect(normalized.movement).not.toHaveProperty('footfall'); expect(normalized.movement.order).toEqual(note.movement.order); expect(normalized.prediction).toBe(note.prediction); expect(normalized.baseline).toEqual(note.baseline); expect(normalized.experiment).toEqual(note.experiment);
    const legacy = structuredClone(note); delete legacy.movement.footfall; delete legacy.movement.latestOrder; delete legacy.movement.reflection; expect(api.notebook([legacy])[0]).toEqual(legacy);
    for (const latestOrder of [[0, 0, 2], [0, 1], ['0', 1, 2], [0, 1, Infinity]]) { const invalid = structuredClone(note); invalid.movement.latestOrder = latestOrder; const kept = api.notebook([invalid])[0]; expect(kept.movement).not.toHaveProperty('latestOrder'); expect(kept.movement.order).toEqual(note.movement.order); expect(kept.movement.footfall).toEqual(note.movement.footfall); }
  });

  it('matches actual fox and rabbit recorded rigs without modifying movement or population data', () => {
    const config = { event: 'none' }, pair = api.compare(config), frames = api.behaviorTimeline(config, pair.baseline), before = JSON.stringify({ pair, frames });
    for (const species of ['foxes', 'rabbits']) { const study = api.motionStudy(frames, species, 0), plan = api.footfallPlan(frames, study); expect(plan).toBeTruthy();
      for (const [k, sample] of plan.samples.entries()) { const feet = frames[sample.step][species][0].footPlants; expect(sample.feet.map(f => f.planted)).toEqual(feet.map(f => f.planted)); expect(sample.supportCount).toBe(study.samples[k].supportFeet); expect(sample.feet[0].planted).toBe(study.samples[k].hindContact); expect(sample.feet[1].planted).toBe(study.samples[k].foreContact); }
      expect(api.footfallCheck(plan, plan.samples.map(s => s.feet.map(f => f.planted))).matches).toBe(12);
    }
    expect(JSON.stringify({ pair, frames })).toBe(before);
  });
});
