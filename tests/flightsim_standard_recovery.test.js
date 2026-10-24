import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, root, host, latest, updateSaved, frameCallback, wallTime, writes, xp, errors;
const hooks = () => window.__testHooks.flightSim;
const ids = ['first_climb', 'first_flight', 'cross_country', 'mountain_flying', 'energy_management', 'world_tour'];
const row = (t = 2, patch = {}) => ({ t, lat: 43.646, lon: -70.309, alt: 1200, spd: 90, hdg: 90,
  agl: 1124, fpm: 300, aoa: 8, pitch: 3, bank: 0, throttle: .7, onGround: false, stalling: false, lowAirspeed: false, ...patch });
const practice = (patch = {}) => ({ attemptId: 'interrupted-standard', aircraftId: 'cessna172', activityId: 'free_flight',
  investigation: false, startedAirborne: false, sessionTime: 12, flightTime: 10, airborneSeconds: 10,
  bestStableSeconds: 4, peakAGL: 1124, stallSeconds: 0, lowAirspeedSeconds: 0, landings: 0, bestLanding: null,
  distance: 1, maxAlt: 1200, maxSpeed: 90, airports: 0, discovered: 0, samples: [row()],
  flightNotes: [{ title: 'Recorded climb', message: 'The flight reached 1,200 ft.' }],
  discoveredPlaces: [], reflection: '', ...patch });
const checkpoint = (record = practice(), patch = {}) => ({ version: 1, attemptId: record.attemptId,
  recordedAt: '2026-10-21T12:00:00.000Z', record, ...patch });
const earlier = (id = 'earlier-flight') => practice({ attemptId: id, reflection: 'Preserve my earlier explanation.', endedAt: '2026-10-20T12:00:00.000Z' });
const checkpointWrites = () => writes.filter(patch => patch.flightPractice != null);
const copy = value => JSON.parse(JSON.stringify(value));
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }) },
  { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  wallTime = 1000; vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  writes = []; xp = []; errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); delete window.__RR_TEST_EXPORTS__; delete window.__testHooks;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
async function mount(seed = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); frameCallback = null;
  function App() {
    const [data, update] = React.useState({ flightSim: { view: 'menu', aircraft: 'cessna172', railCollapsed: true,
      menuSections: { challenges: true, sprints: true }, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])), ...seed } });
    latest = data.flightSim;
    updateSaved = patch => update(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: update, awardXP: (...args) => xp.push(args),
      update: (id, key, value) => { writes.push({ [key]: value }); update(old => ({ ...old, [id]: { ...old[id], [key]: value } })); },
      updateMulti: (id, patch) => { writes.push(patch); update(old => ({ ...old, [id]: { ...old[id], ...patch } })); },
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function launch(id) {
  const button = id ? host.querySelector('[data-flight-challenge-id="' + id + '"]') : host.querySelector('[aria-label="Free Flight from Portland, ME"]');
  expect(button).toBeTruthy(); await act(async () => button.click());
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 1280 });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 720 });
  }
}
async function frame() {
  wallTime += 100; expect(frameCallback).toBeTypeOf('function'); await act(async () => frameCallback());
}
async function finish() { hooks().keysRef.current.escape = true; await frame(); }

describe('Sky School standard flight interruption evidence', () => {
  it('keeps bounded canonical observations and summaries detached from pose, controls, account badges and reflection', () => {
    const saved = checkpoint(practice({ samples: [row(2), row(0), row(2, { pitch: -3 }), { t: 3, alt: NaN }],
      flightNotes: [{ title: 'Recorded note', message: 'Use this evidence.' }], badges: 999, reflection: 'not an inflight reflection',
      controls: { throttle: 1 }, pose: { speed: 999 } }));
    saved.controls = { bank: 90 };
    const normalized = api.normalizeFlightPracticeCheckpoint(saved);
    expect(normalized.record.samples.map(point => point.t)).toEqual([0, 2]);
    expect(normalized.record.samples[1].pitch).toBe(-3);
    expect(normalized.record).toMatchObject({ badges: null, reflection: '', endedAt: null, startedAirborne: false, bestStableSeconds: 4 });
    expect(normalized).not.toHaveProperty('controls'); expect(normalized.record).not.toHaveProperty('controls'); expect(normalized.record).not.toHaveProperty('pose');
    saved.record.samples[0].pitch = 99; saved.record.flightNotes[0].message = 'changed';
    expect(normalized.record.samples[1].pitch).toBe(-3); expect(normalized.record.flightNotes[0].message).toBe('Use this evidence.');
    const bounded = api.normalizeFlightPracticeCheckpoint(checkpoint(practice({ sessionTime: 1000, samples: Array.from({ length: 510 }, (_, i) => row(i)) })));
    expect(bounded.record.samples).toHaveLength(500); expect(bounded.record.samples[0].t).toBe(10);
  });
  it('rejects invalid identities, unsupported or contradictory context, missing clocks and impossible sample times', () => {
    const valid = checkpoint();
    const energy = api.createFlightChallenge('energy_management', {});
    for (const saved of [null, [], 'bad', Object.create(valid), checkpoint(practice(), { version: 2 }), checkpoint(practice(), { attemptId: '../x' }),
      checkpoint(practice(), { attemptId: 'different-valid-envelope-id' }),
      ...[{ aircraftId: 'invented' }, { activityId: 'geography_sprint' }, { activityId: 'drone_survey' },
        { investigation: true }, { startedAirborne: null }, { sessionTime: null }, { samples: [row(30)] }, { mission: {} }, { sprint: {} },
        { activityId: 'energy_management', challenge: energy, startedAirborne: false },
        { activityId: 'free_flight', challenge: energy, startedAirborne: true },
        { activityId: 'energy_management', challenge: energy, startedAirborne: true, aircraftId: 'drone' },
        { activityId: 'world_tour', challenge: api.createFlightChallenge('world_tour', {}), startedAirborne: true, approachAirportId: 'removed' }]
        .map(patch => checkpoint(practice(patch)))]) expect(api.normalizeFlightPracticeCheckpoint(saved)).toBeNull();
  });
  it('retains interruption, unknown telemetry and measured zero in normalized journal/history/export records', () => {
    const saved = checkpoint(practice({ samples: [row(2, { pitch: null, throttle: 0 })] }));
    const recovered = api.recoverFlightPracticeCheckpoint(saved);
    expect(recovered).toMatchObject({ interrupted: true, endedAt: saved.recordedAt, samples: [{ pitch: null, throttle: 0 }] });
    expect(api.normalizeFlightPracticeRecord(recovered).interrupted).toBe(true);
    expect(api.normalizeFlightPracticeHistory([recovered])[0].interrupted).toBe(true);
    const exported = api.createFlightPracticeJournalExport({ lastDebrief: recovered, flightPracticeHistory: [recovered] }, saved.recordedAt);
    expect(exported.latest.interrupted).toBe(true); expect(exported.earlier[0].interrupted).toBe(true);
  });
  it.each(ids)('initializes a genuine %s checkpoint with its own stable identity and native launch context', async id => {
    await mount({ aircraft: 'sr71' }); await launch(id);
    expect(latest.flightPractice).toMatchObject({ version: 1, record: { aircraftId: 'cessna172', activityId: id,
      investigation: false, startedAirborne: ['cross_country', 'energy_management', 'world_tour'].includes(id), sessionTime: 0,
      samples: [], challenge: { id, status: 'active' } } });
    expect(latest.flightPractice.attemptId).toMatch(/^flight_/);
    expect(latest.flightPractice.record.attemptId).toBe(latest.flightPractice.attemptId);
    expect(latest.flightPractice.record.approachAirportId).toBe(id === 'world_tour' ? 'kpwm' : null);
  });
  it('records native free-flight observations on the existing recorder cadence and restores them after serialized remount', async () => {
    await mount({ totalFlightTime: 900, lastDebrief: earlier() }); await launch();
    expect(latest.flightPractice.record).toMatchObject({ aircraftId: 'cessna172', activityId: 'free_flight', startedAirborne: false });
    await frame(); const count = checkpointWrites().length;
    await frame(); expect(checkpointWrites()).toHaveLength(count);
    hooks().timeRef.current = 3; Object.assign(hooks().controlsRef.current, { pitch: -3, bank: 2, throttle: .7 });
    await frame(); expect(latest.flightPractice.record.samples.length).toBeGreaterThanOrEqual(2);
    const liveControls = hooks().controlsRef.current;
    expect(latest.flightPractice.record.samples.at(-1)).toMatchObject({
      pitch: Math.round(liveControls.pitch * 10) / 10, bank: Math.round(liveControls.bank * 10) / 10,
      throttle: Math.round(liveControls.throttle * 100) / 100 });
    expect(latest.flightPractice.record.samples.at(-1).pitch).toBeLessThan(0);
    expect(latest.flightPractice.record.samples.at(-1).bank).toBeGreaterThan(0);
    const saved = copy(latest), captured = copy(latest.flightPractice.record), physics = vi.spyOn(api.Physics, 'step'), xpBefore = xp.length;
    await mount(saved);
    expect(latest.view).toBe('debrief'); expect(latest.flightPractice).toBeNull();
    expect(latest.lastDebrief).toMatchObject({ attemptId: saved.flightPractice.attemptId, interrupted: true, samples: captured.samples,
      aircraftId: captured.aircraftId, sessionTime: captured.sessionTime });
    expect(latest.flightPracticeHistory.at(-1).reflection).toBe('Preserve my earlier explanation.');
    expect(host.querySelector('[data-flight-interrupted="latest"]').textContent).toContain('aircraft position and controls were not resumed');
    expect(host.querySelector('[data-flight-log-status="interrupted"]').textContent).toBe('interrupted');
    expect(hooks().flyingRef.current).toBe(false); expect(physics).not.toHaveBeenCalled();
    expect(latest.totalFlightTime).toBe(900); expect(xp).toHaveLength(xpBefore);
  });
  it('does not add checkpoints while paused or when a frame records no new observation', async () => {
    await mount(); await launch(); await frame();
    const before = copy(latest.flightPractice), count = checkpointWrites().length;
    hooks().pausedRef.current = true;
    for (let i = 0; i < 3; i++) await frame();
    expect(latest.flightPractice).toEqual(before); expect(checkpointWrites()).toHaveLength(count);
    hooks().pausedRef.current = false; await frame(); expect(checkpointWrites()).toHaveLength(count);
  });
  it('saves a challenge objective and completion before the next two-second observation without replaying completion on reload', async () => {
    await mount({ totalFlightTime: 900, lastDebrief: earlier() }); await launch('first_climb'); await frame();
    const sampleCount = latest.flightPractice.record.samples.length;
    hooks().timeRef.current = 1;
    Object.assign(hooks().flightRef.current, { altitude: 1200, fieldElev: 76, onGround: false, vsi: 2, speed: 100 });
    await act(async () => hooks().evaluateFlightChallenge(.1));
    expect(latest.flightPractice.record.challenge).toMatchObject({ status: 'complete', objectives: { climb: true } });
    expect(latest.flightPractice.record.samples).toHaveLength(sampleCount);
    expect(latest.flightPractice.record.sessionTime).toBe(1);
    const saved = copy(latest), xpBefore = xp.length, completed = copy(latest.challengeCompleted), bests = copy(latest.personalBests);
    await mount(saved);
    expect(latest.lastDebrief.challenge).toMatchObject({ id: 'first_climb', status: 'complete', objectives: { climb: true } });
    expect(latest.challengeResults.first_climb.interrupted).toBe(true);
    expect(latest.challengeCompleted).toEqual(completed); expect(latest.personalBests).toEqual(bests);
    expect(latest.totalFlightTime).toBe(900); expect(xp).toHaveLength(xpBefore);
  });
  it('keeps a recovered challenge glide snapshot and objective available without creating completion markers', async () => {
    const challenge = api.createFlightChallenge('energy_management', {});
    challenge.objectives.glide = true; challenge.glideSnapshot = { altitude: 5000, airspeed: 110 };
    await mount({ view: 'flying', flightPractice: checkpoint(practice({ activityId: challenge.id, startedAirborne: true, challenge })),
      flightChallenge: challenge, selectedChallenge: challenge.id, challengeCompleted: {}, personalBests: {}, totalFlightTime: 77 });
    expect(latest.view).toBe('debrief');
    expect(latest.lastDebrief.challenge.glideSnapshot).toEqual({ altitude: 5000, airspeed: 110 });
    expect(host.querySelector('[aria-label="Challenge result"]').textContent).toContain('Glide snapshot: 5,000 ft at 110 kts');
    expect(latest.challengeCompleted).toEqual({}); expect(latest.personalBests).toEqual({});
    expect(latest.totalFlightTime).toBe(77); expect(xp).toHaveLength(0);
  });
  it('recovers once after late host hydration and retains previous review history across another reload', async () => {
    await mount({ view: 'flying', totalFlightTime: 900, lastDebrief: earlier() });
    expect(latest.view).toBe('menu');
    await act(async () => updateSaved({ flightPractice: checkpoint() }));
    expect(latest.view).toBe('debrief'); expect(latest.flightPracticeHistory).toHaveLength(1);
    expect(latest.flightPracticeHistory[0].attemptId).toBe('earlier-flight');
    const saved = copy(latest); await mount(saved);
    expect(latest.lastDebrief.attemptId).toBe('interrupted-standard'); expect(latest.flightPracticeHistory).toHaveLength(1);
    expect(latest.totalFlightTime).toBe(900); expect(xp).toHaveLength(0);
  });
  it('does not overwrite an already recovered latest review, its edited explanation or selected evidence', async () => {
    const recovered = api.recoverFlightPracticeCheckpoint(checkpoint()); recovered.reflection = 'My edited interrupted-flight explanation.';
    await mount({ view: 'menu', flightPractice: checkpoint(), lastDebrief: recovered, flightPracticeHistory: [earlier()],
      debriefSampleIndex: 7, debriefCompareIndex: 4, debriefHistoryIndex: 0, debriefHistorySampleIndex: 2 });
    expect(latest.view).toBe('debrief'); expect(latest.lastDebrief.reflection).toBe(recovered.reflection);
    expect(latest.flightPracticeHistory).toHaveLength(1);
    expect(latest.debriefSampleIndex).toBe(7); expect(latest.debriefCompareIndex).toBe(4);
    expect(latest.debriefHistoryIndex).toBe(0); expect(latest.debriefHistorySampleIndex).toBe(2);
    expect(latest.flightPractice).toBeNull();
  });
  it('does not promote a stale already-archived checkpoint over a newer review', async () => {
    const recovered = api.recoverFlightPracticeCheckpoint(checkpoint()), newest = earlier('newest-flight');
    await mount({ view: 'flying', flightPractice: checkpoint(), lastDebrief: newest, flightPracticeHistory: [recovered] });
    expect(latest.view).toBe('menu'); expect(latest.lastDebrief).toEqual(newest);
    expect(latest.flightPracticeHistory).toHaveLength(1); expect(latest.flightPractice).toBeNull();
    await act(async () => host.querySelectorAll('button').forEach(button => { if (button.textContent === 'Review flight journal') button.click(); }));
    expect(host.querySelector('[data-flight-interrupted="earlier"]')).toBeTruthy();
  });
  it('clears a corrupt checkpoint without fabricating a debrief or altering prior evidence and account state', async () => {
    const before = earlier();
    await mount({ view: 'flying', lastDebrief: before, flightPractice: checkpoint(practice({ activityId: 'invented' })),
      totalFlightTime: 900, challengeCompleted: {}, surveysCompleted: 4, rescuesCompleted: 3 });
    expect(latest.view).toBe('menu'); expect(latest.lastDebrief).toEqual(before); expect(latest.flightPractice).toBeNull();
    expect(latest.totalFlightTime).toBe(900); expect(latest.surveysCompleted).toBe(4); expect(latest.rescuesCompleted).toBe(3);
    expect(latest.challengeCompleted).toEqual({}); expect(xp).toHaveLength(0);
  });
  it('normal finish clears the checkpoint and a completed reload never recovers or recredits that flight', async () => {
    await mount({ totalFlightTime: 900, lastDebrief: earlier() }); await launch(); await frame();
    const attempt = latest.flightPractice.attemptId;
    hooks().getLogRef().current.airborneSeconds = 12; await finish();
    expect(latest.view).toBe('debrief'); expect(latest.flightPractice).toBeNull();
    expect(latest.lastDebrief.attemptId).toBe(attempt); expect(latest.lastDebrief.interrupted).toBeUndefined();
    expect(latest.totalFlightTime).toBe(912);
    const saved = copy(latest), xpBefore = xp.length; await mount(saved);
    expect(latest.totalFlightTime).toBe(912); expect(latest.lastDebrief.attemptId).toBe(attempt);
    expect(latest.flightPracticeHistory).toHaveLength(1); expect(xp).toHaveLength(xpBefore);
    expect(host.querySelector('[data-flight-interrupted="latest"]')).toBeNull();
    expect(host.querySelector('[data-flight-log-status="complete"]').textContent).toBe('Pilot log complete');
  });
  it('a deliberate fresh flight replaces its checkpoint and dedicated mission/sprint launches clear it', async () => {
    await mount(); await launch(); const first = latest.flightPractice.attemptId; await finish();
    const again = [...host.querySelectorAll('button')].find(button => button.textContent.includes('Fly Again'));
    expect(again).toBeTruthy(); await act(async () => again.click());
    expect(latest.flightPractice.attemptId).not.toBe(first); expect(latest.flightPractice.record.samples).toEqual([]);
    await finish();
    await act(async () => updateSaved({ view: 'menu' }));
    const rescue = host.querySelector('[data-flight-challenge-id="coastal_rescue"]');
    await act(async () => rescue.click()); expect(latest.flightPractice).toBeNull(); expect(latest.flightMission).toBeTruthy();
    await finish(); await act(async () => updateSaved({ view: 'menu' }));
    const sprint = [...host.querySelectorAll('button')].find(button => button.textContent.includes(api.SPRINT_ROUTES[0].name));
    expect(sprint).toBeTruthy(); await act(async () => sprint.click());
    expect(latest.flightPractice).toBeNull(); expect(latest.flightSprint).toBeTruthy();
  });
});
