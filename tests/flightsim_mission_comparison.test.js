import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, root, host, latest, writes, xp, errors;
const mission = (id = 'drone_survey', patch = {}) => ({ missionId: id,
  mode: id === 'coastal_rescue' ? 'rescue' : id === 'drone_powerline' ? 'powerline' : 'aerial',
  launchLat: 43.646, launchLon: -70.309, elapsedSeconds: 60,
  completed: false, returned: false, battery: 80, batteryExhausted: false,
  recovered: false, recoveredAtSeconds: null,
  targets: [{ name: 'First target', lat: 43.65, lon: -70.30, captured: false },
    ...(id === 'coastal_rescue' ? [] : [{ name: 'Second target', lat: 43.64, lon: -70.31, captured: false }])], ...patch });
const completed = (id = 'drone_survey', patch = {}) => {
  const saved = mission(id);
  return mission(id, { targets: saved.targets.map(target => ({ ...target, captured: true })),
    completed: true, returned: true, completedAtSeconds: 50,
    ...(id === 'coastal_rescue' ? { recovered: true, recoveredAtSeconds: 12 } : {}), ...patch });
};
const flight = (savedMission = mission(), patch = {}) => ({ attemptId: 'latest-mission',
  aircraftId: savedMission.missionId === 'coastal_rescue' ? 'rescue_heli' : 'drone',
  activityId: savedMission.missionId, investigation: false, startedAirborne: false,
  endedAt: '2026-10-21T12:00:00.000Z', mission: savedMission, samples: [],
  reflection: 'Reserve time for the return landing.', ...patch });
const journal = () => host.querySelector('[aria-label="Flight practice journal"]');
const panel = () => journal().querySelector('[data-flight-mission-comparison]');
const metric = name => panel().querySelector('[data-mission-compare-metric="' + name + '"]');
async function choose(index) {
  const select = journal().querySelector('#debrief-earlier-flight');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, String(index));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function mount(seed = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, update] = React.useState({ flightSim: { view: 'debrief', lastDebrief: flight(completed()),
      flightPracticeHistory: [flight(mission(), { attemptId: 'earlier-mission', reflection: 'Earlier approach explanation.' })],
      debriefHistoryIndex: 0, debriefSampleIndex: 2, debriefCompareIndex: 1, totalFlightTime: 900, ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: update, awardXP: (...args) => xp.push(args),
      update: (id, key, value) => { writes.push({ [key]: value }); update(old => ({ ...old, [id]: { ...old[id], [key]: value } })); },
      updateMulti: (id, patch) => { writes.push(patch); update(old => ({ ...old, [id]: { ...old[id], ...patch } })); },
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
  { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  writes = []; xp = []; errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Sky School outcome-specific mission comparison', () => {
  it('pairs exact matching target locations and objective evidence rather than mutable captured counters or names', () => {
    const previous = mission(), current = mission();
    current.targets[0] = { ...current.targets[0], name: 'Renamed target', captured: true };
    current.capturedCount = 999; previous.capturedCount = 888;
    const comparison = api.flightMissionComparison(flight(current), flight(previous));
    expect(comparison).toMatchObject({ comparable: true, reason: 'matching', deltas: { capturedCount: 1, battery: null, completedAtSeconds: null } });
    expect(comparison.targets).toMatchObject([{ lat: 43.65, lon: -70.30, earlier: false, latest: true }, { earlier: false, latest: false }]);
    expect(comparison.latest.capturedCount).toBe(1); expect(comparison.earlier.capturedCount).toBe(0);
  });
  it.each(['drone_survey', 'drone_powerline', 'coastal_rescue'])('compares recorded completion time only for two completed %s missions', id => {
    const comparison = api.flightMissionComparison(flight(completed(id, { completedAtSeconds: 30, battery: 90 })),
      flight(completed(id, { completedAtSeconds: 50, battery: 80 })));
    expect(comparison.comparable).toBe(true); expect(comparison.deltas.completedAtSeconds).toBe(-20);
    expect(comparison.deltas.battery).toBe(id === 'coastal_rescue' ? null : 10);
  });
  it('does not subtract partial, depleted or unknown battery/time evidence from a completed mission', () => {
    for (const earlier of [mission(), mission('drone_survey', { battery: 0, batteryExhausted: true }),
      mission('drone_survey', { completed: true, returned: true, completedAtSeconds: 30 })]) {
      const comparison = api.flightMissionComparison(flight(completed()), flight(earlier));
      expect(comparison.comparable).toBe(true);
      expect(comparison.deltas.battery).toBeNull(); expect(comparison.deltas.completedAtSeconds).toBeNull();
    }
  });
  it('keeps unknown target, recovery and return flags distinct from recorded false values', () => {
    const earlier = mission('coastal_rescue', { recovered: null, returned: null,
      targets: [{ name: 'Survivor', lat: 43.65, lon: -70.30, captured: null }] });
    const comparison = api.flightMissionComparison(flight(mission('coastal_rescue')), flight(earlier));
    expect(comparison.earlier).toMatchObject({ recovered: null, returned: null });
    expect(comparison.latest).toMatchObject({ recovered: false, returned: false });
    expect(comparison.targets[0]).toMatchObject({ earlier: null, latest: false });
    expect(comparison.deltas.capturedCount).toBeNull();
  });
  it('does not pair targets or calculate changes across changed launch, target, mode, aircraft or missing context', () => {
    const current = flight(completed());
    const movedTarget = mission(); movedTarget.targets[0].lat += .001;
    for (const earlier of [flight(mission('drone_survey', { launchLat: 44 })), flight(movedTarget),
      flight(mission('drone_powerline')), flight(mission(), { aircraftId: 'cessna172' }), flight(mission(), { mission: null })]) {
      const comparison = api.flightMissionComparison(current, earlier);
      expect(comparison.comparable).toBe(false); expect(comparison.targets).toEqual([]);
      expect(Object.values(comparison.deltas)).toEqual([null, null, null]);
    }
    expect(api.flightMissionComparison(current, { aircraftId: 'cessna172', activityId: 'free_flight', samples: [] })).toBeNull();
  });
  it('retains interruption and detached mission observations without changing either saved record', () => {
    const current = flight(mission('drone_survey', { interrupted: true })), previous = flight(completed());
    const original = JSON.stringify([current, previous]);
    const comparison = api.flightMissionComparison(current, previous);
    expect(comparison.latest.interrupted).toBe(true); expect(comparison.deltas.completedAtSeconds).toBeNull();
    comparison.latest.targets[0].captured = true;
    expect(JSON.stringify([current, previous])).toBe(original);
  });
  it('shows target, battery, landing and completion-time pairs in the journal instead of fixed-wing milestone comparisons', async () => {
    await mount({ lastDebrief: flight(completed('drone_survey', { completedAtSeconds: 30, battery: 90 })),
      flightPracticeHistory: [flight(completed('drone_survey', { completedAtSeconds: 50, battery: 80 }), { attemptId: 'earlier' })] });
    expect(panel().dataset.missionComparable).toBe('true');
    expect(metric('targets').textContent).toContain('Targets captured: 2 of 2.');
    expect(metric('battery').textContent).toContain('Earlier: Battery remaining: 80%');
    expect(metric('battery').textContent).toContain('Latest: Battery remaining: 90%');
    expect(metric('return').textContent).toContain('Return landing at base recorded: done.');
    expect(metric('time').textContent).toContain('Change: -20 s');
    expect(panel().querySelectorAll('[data-mission-compare-target]')).toHaveLength(2);
    expect(journal().textContent).not.toContain('Longest steady-flight hold');
    expect(journal().textContent).not.toContain('Time with stall observed');
    expect(writes).toHaveLength(0); expect(xp).toHaveLength(0);
  });
  it('shows rescued, unreturned and interrupted evidence without declaring completion or faster elapsed practice', async () => {
    const current = mission('coastal_rescue', { recovered: true, recoveredAtSeconds: 12, interrupted: true,
      elapsedSeconds: 25, targets: [{ name: 'Survivor', lat: 43.65, lon: -70.30, captured: true }] });
    await mount({ lastDebrief: flight(current), flightPracticeHistory: [flight(completed('coastal_rescue'), { attemptId: 'earlier' })] });
    expect(metric('recovery').textContent).toContain('Latest: Survivor recovery recorded: done.');
    expect(metric('return').textContent).toContain('Latest: Return landing at base recorded: incomplete.');
    expect(metric('time').textContent).toContain('Latest: Total mission time: 25 seconds');
    expect(metric('time').textContent).toContain('Change: Not calculated');
    expect(panel().querySelector('[data-mission-comparison-interrupted="latest"]').textContent).toContain('Latest: This practice was interrupted.');
    expect(metric('outcome').textContent).toContain('Latest: Mission ended before all completion evidence was recorded.');
  });
  it('labels missing evidence separately from incomplete objectives and avoids matching moved targets', async () => {
    const earlier = mission('coastal_rescue', { recovered: null, returned: null,
      targets: [{ name: 'Survivor', lat: 43.65, lon: -70.30, captured: null }] });
    await mount({ lastDebrief: flight(mission('coastal_rescue')), flightPracticeHistory: [flight(earlier, { attemptId: 'earlier' })] });
    expect(metric('recovery').textContent).toContain('Earlier: Survivor recovery recorded: Not recorded.');
    expect(metric('recovery').textContent).toContain('Latest: Survivor recovery recorded: incomplete.');
    expect(panel().querySelector('[data-mission-compare-target]').textContent).toContain('Earlier: Not recorded · Latest: incomplete');
    const moved = mission('coastal_rescue'); moved.targets[0].lat += .001;
    await mount({ lastDebrief: flight(mission('coastal_rescue')), flightPracticeHistory: [flight(moved, { attemptId: 'moved' })] });
    expect(panel().dataset.missionComparable).toBe('false');
    expect(panel().querySelectorAll('[data-mission-compare-target]')).toHaveLength(0);
    expect(metric('time').textContent).toContain('Change: Not calculated');
  });
  it('shows unknown battery and mission duration without attaching measurement units', async () => {
    await mount({ flightPracticeHistory: [flight(mission('drone_survey', { battery: null, elapsedSeconds: null }), { attemptId: 'unknown-measurements' })] });
    expect(metric('battery').textContent).toContain('Earlier: Not recorded');
    expect(metric('time').textContent).toContain('Earlier: Not recorded');
    expect(panel().textContent).not.toContain('Not recorded%');
    expect(panel().textContent).not.toContain('Not recorded seconds');
  });
  it('switches retained mission reviews and reloads without changing explanations, history, controls or credit', async () => {
    const history = [flight(mission(), { attemptId: 'survey-earlier', reflection: 'Survey explanation.' }),
      flight(mission('drone_powerline'), { attemptId: 'powerline-earlier', reflection: 'Powerline explanation.' })];
    await mount({ flightPracticeHistory: history }); const originalLatest = JSON.stringify(latest.lastDebrief), originalHistory = JSON.stringify(latest.flightPracticeHistory);
    await choose(1); expect(panel()).toBeNull(); expect(journal().textContent).toContain('Powerline explanation.');
    await choose(0); expect(panel()).toBeTruthy(); expect(journal().textContent).toContain('Survey explanation.');
    const saved = JSON.parse(JSON.stringify(latest)); await mount(saved);
    expect(panel()).toBeTruthy(); expect(latest.debriefHistoryIndex).toBe(0);
    expect(JSON.stringify(latest.lastDebrief)).toBe(originalLatest); expect(JSON.stringify(latest.flightPracticeHistory)).toBe(originalHistory);
    expect(latest.debriefSampleIndex).toBe(2); expect(latest.debriefCompareIndex).toBe(1);
    expect(latest.totalFlightTime).toBe(900); expect(xp).toHaveLength(0);
  });
});
