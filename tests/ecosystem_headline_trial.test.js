// Root copies this file to tests/ after integrating the snippets/API hooks.
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_ecosystem.js', 'ecosystem'); api = window.StemLab.ecosystemFoodWeb; });
const pose = (x, extra = {}) => ({ active: true, x, z: 0, state: 'Exploring', ...extra });
const encounter = { before: 0, after: 4, actor: { id: 'foxes', index: 0 }, cue: { id: 'rabbits', index: 0 } };
const frames = (gaps = [2, 3, 2.5, 3.5, 4]) => gaps.map(gap => ({ foxes: [pose(0)], rabbits: [pose(gap)] }));
function sighting(trial) { return { branch: 'baseline', actorIndex: 0, cueId: 'rabbits', cueIndex: 0, state: trial.series[2].actor.state, before: { step: trial.before, state: trial.series[0].actor.state }, after: { step: trial.after, state: trial.series.at(-1).actor.state } }; }
function data() {
  const f = frames(), trial = api.headlineTrial(f, encounter), raw = { version: 1, branch: 'baseline', trial, pins: [1, 2, 3], sorts: ['supports', 'challenges', 'supports'], firstSorts: ['supports', 'supports', 'supports'], verdict: 'challenged', firstVerdict: 'supported', reflection: 'The endpoints rose, but one adjacent interval became smaller.' };
  return { f, trial, raw, parent: sighting(trial) };
}

describe('a headline tested by frozen fixed-pair evidence', () => {
  it('keeps every actual contiguous same-time position/gap for one fixed pair without using prior decision distances', () => {
    const f = frames(); f[0].foxes[0].preyDistance = 99; const original = JSON.stringify(f), trial = api.headlineTrial(f, encounter);
    expect(trial.series.map(point => point.step)).toEqual([0, 1, 2, 3, 4]); expect(trial.series.map(point => point.gap)).toEqual([2, 3, 2.5, 3.5, 4]); expect(trial.direction).toBe('increased');
    expect(trial.series[0].actor.x).toBe(0); trial.series[0].cue.x = 999; expect(JSON.stringify(f)).toBe(original);
  });

  it('requires a complete bounded short window and rejects inactive/missing/non-finite/self pairs', () => {
    for (const mutate of [f => { f[2].foxes[0].active = false; }, f => { f[2].rabbits[0].z = NaN; }, f => { f[2] = null; }]) { const f = frames(); mutate(f); expect(api.headlineTrial(f, encounter)).toBeNull(); }
    expect(api.headlineTrial(frames(), { ...encounter, after: 2 })).toBeNull(); expect(api.headlineTrial(frames(), { ...encounter, after: 5 })).toBeNull(); expect(api.headlineTrial(frames(), { ...encounter, cue: encounter.actor })).toBeNull();
    const long = frames(Array.from({ length: 62 }, (_, k) => k + 1)); expect(api.headlineTrial(long, { ...encounter, after: 61 })).toBeNull(); expect(api.headlineTrial(long, { ...encounter, after: 60 }).series).toHaveLength(61);
    expect(api.headlineTrial(frames([2, 2.5, 3, 2.5, 2]), encounter)).toBeNull();
  });

  it('finds a genuine counterexample hidden by a larger endpoint gap and does not equate three supporting cards with proof', () => {
    const trial = api.headlineTrial(frames(), encounter), check = api.headlineCheck(trial, [1, 3, 4], ['supports', 'supports', 'supports'], null, 'supported');
    expect(check.matches).toBe(3); expect(check.challengeSteps).toEqual([2]); expect(check.expected).toBe('challenged'); expect(check.verdictCorrect).toBe(false); expect(check.intervalCount).toBe(4); expect(check.supportCount).toBe(3);
    const interval = api.headlineInterval(trial, 2); expect(interval).toMatchObject({ delta: -.5, classification: 'challenges', start: { step: 1, gap: 3 }, end: { step: 2, gap: 2.5 } });
  });

  it('supports every-step claims only after auditing the full recorded window and treats an unchanged step as a challenge to strict wording', () => {
    const increasing = api.headlineTrial(frames([1, 2, 3, 4, 5]), encounter), a = api.headlineCheck(increasing, [1, 2, 3], ['supports', 'supports', 'supports'], null, 'supported'); expect(a.expected).toBe('supported'); expect(a.challengeSteps).toEqual([]);
    const decreasing = api.headlineTrial(frames([5, 4, 3, 2, 1]), encounter); expect(decreasing.direction).toBe('decreased'); expect(api.headlineInterval(decreasing, 2).classification).toBe('supports');
    const flat = api.headlineTrial(frames([1, 2, 2, 3, 4]), encounter); expect(api.headlineInterval(flat, 2).classification).toBe('challenges');
    const tiny = api.headlineTrial(frames([1, 2, 2 + 1e-10, 3, 4]), encounter); expect(api.headlineInterval(tiny, 2).classification).toBe('challenges');
  });

  it('requires three distinct valid pinned intervals and explicit binary classifications, preserving unknown separately', () => {
    const { trial } = data();
    for (const pins of [[1, 1, 2], [0, 1, 2], [1, 2, 5], [1, 2], ['1', 2, 3]]) expect(api.headlineCheck(trial, pins, ['supports', 'supports', 'supports'], null, 'supported')).toBeNull();
    for (const sorts of [['supports', '', 'supports'], ['supports', null, 'supports'], ['supports', 'neutral', 'supports'], [true, false, true], []]) expect(api.headlineCheck(trial, [1, 2, 3], sorts, null, 'unsure')).toBeNull();
    expect(api.headlineCheck(trial, [1, 2, 3], ['supports', 'challenges', 'supports'], null, 'unsure').verdictCorrect).toBeNull();
  });

  it('keeps first and revised sorting/verdict evidence detached instead of replacing original commitments', () => {
    const { trial, raw } = data(), original = JSON.stringify(raw), checked = api.headlineCheck(trial, raw.pins, raw.sorts, raw.firstSorts, raw.verdict);
    expect(checked.matches).toBe(3); expect(checked.firstMatches).toBe(2); expect(checked.verdictCorrect).toBe(true);
    checked.cards[0].start.actor.x = 100; expect(JSON.stringify(raw)).toBe(original);
    const record = api.headlineRecord(raw, sighting(trial), 'foxes', 2); expect(record).toEqual(raw); record.firstSorts[0] = 'challenges'; record.trial.series[0].actor.x = 100; expect(JSON.stringify(raw)).toBe(original);
  });

  it('binds optional saved evidence to the parent sighting identities, branch, exact window, endpoint states and revealed note-step state', () => {
    const { raw, parent } = data();
    for (const mutate of [p => { p.branch = 'experiment'; }, p => { p.actorIndex = 1; }, p => { p.cueId = 'voles'; }, p => { p.before.step = 1; }, p => { p.after.state = 'Resting'; }, p => { p.state = 'Pouncing'; }]) { const p = structuredClone(parent); mutate(p); expect(api.headlineRecord(raw, p, 'foxes', 2)).toBeNull(); }
    for (const mutate of [r => { r.firstVerdict = ''; }, r => { r.firstSorts[0] = null; }, r => { r.trial.direction = 'decreased'; }, r => { r.trial.series[2].gap += .1; }, r => { r.trial.series[2].actor.index = 1; }, r => { r.trial.series[2].cue.x = Infinity; }]) { const r = structuredClone(raw); mutate(r); expect(api.headlineRecord(r, parent, 'foxes', 2)).toBeNull(); }
  });

  it('preserves valid frozen historical samples while refusing active restoration when any recorded position/state or pair/window differs', () => {
    const { f, raw, parent } = data(); expect(api.headlineMatches(raw, f, encounter)).toBe(true);
    for (const mutate of [f => { f[2].rabbits[0].x += 1e-10; }, f => { f[2].foxes[0].state = 'Resting'; }, f => { f[2].rabbits[0].active = false; }]) { const altered = structuredClone(f); mutate(altered); expect(api.headlineMatches(raw, altered, encounter)).toBe(false); }
    const historical = structuredClone(raw); historical.trial.series[2].actor.x += .1; historical.trial.series[2].cue.x += .1; expect(api.headlineRecord(historical, parent, 'foxes', 2)).toBeTruthy(); expect(api.headlineMatches(historical, f, encounter)).toBe(false);
  });

  it('uses genuine short listening and spacing encounters and preserves the population run while freezing the whole pair series', () => {
    const config = { enabled: { voles: false, owls: false, caterpillars: false, bluetits: false }, initial: { rabbits: 90, foxes: 6 }, capacity: 160, cover: 10, event: 'none' }, pair = api.compare(config), population = JSON.stringify(pair), f = api.behaviorTimeline(config, pair.baseline);
    const original = JSON.stringify(f); for (const kind of ['listening', 'spacing']) { const e = api.encounters(f, config).find(e => e.kind === kind), trial = api.headlineTrial(f, e); expect(trial).toBeTruthy(); expect(trial.series).toHaveLength(e.after - e.before + 1); expect(api.headlineInterval(trial, e.before + 1)).toBeTruthy(); }
    expect(JSON.stringify(pair)).toBe(population); expect(JSON.stringify(f)).toBe(original);
  });

  it('round-trips exact series, pinned intervals, first/latest sorting and verdicts through saved sighting JSON while dropping only corrupt optional evidence', () => {
    const config = { enabled: { voles: false, owls: false }, initial: { rabbits: 90, foxes: 6 }, cover: 10, event: 'none' }, pair = api.compare(config), f = api.behaviorTimeline(config, pair.baseline), e = api.encounters(f, config).find(e => e.kind === 'listening'), trial = api.headlineTrial(f, e);
    const pins = [e.before + 1, e.before + 2, e.before + 3], sorts = pins.map(step => api.headlineInterval(trial, step).classification), evidence = { version: 1, branch: 'baseline', trial, pins, sorts, firstSorts: ['supports', 'supports', 'supports'], verdict: 'challenged', firstVerdict: 'supported', reflection: 'A counterexample challenges the every-step headline, without establishing a capture.' };
    const sight = { version: 1, kind: e.kind, branch: 'baseline', actorIndex: e.actor.index, cueId: e.cue.id, cueIndex: e.cue.index, state: f[e.step][e.actor.id][e.actor.index].state, decisionDistance: f[e.step][e.actor.id][e.actor.index].listenCue.distance, before: { step: e.before, state: f[e.before][e.actor.id][e.actor.index].state }, after: { step: e.after, state: f[e.after][e.actor.id][e.actor.index].state }, forecast: e.expected, limitation: 'The gap does not prove capture.', runPrediction: 'Original ecological prediction.', headline: evidence };
    const note = api.capture(config, pair, e.step, e.actor.id, 'Original action prediction', 'Original field explanation', 1, null, sight); expect(note.sighting.headline).toEqual(evidence); expect(api.notebook([note])[0]).toEqual(note);
    const text = api.notebookText([note]), line = text.split('\n').find(line => line.startsWith('Frozen headline-trial evidence (JSON): ')); expect(JSON.parse(line.slice('Frozen headline-trial evidence (JSON): '.length))).toEqual(evidence); expect(text).toContain('Original ecological prediction.'); expect(note.prediction).toBe('Original action prediction');
    const bad = structuredClone(note); bad.sighting.headline.trial.series[1].gap += 1; const kept = api.notebook([bad])[0]; expect(kept.sighting).toBeTruthy(); expect(kept.sighting).not.toHaveProperty('headline'); expect(kept.baseline).toEqual(note.baseline); expect(kept.prediction).toBe(note.prediction);
  });
});
