import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const goals = { first_climb: ['climb'], first_flight: ['climb', 'steady', 'landing'],
  cross_country: ['heading', 'arrival', 'landing'], mountain_flying: ['climb', 'steady', 'landing'],
  energy_management: ['glide', 'climb'], world_tour: ['airport_1', 'airport_2', 'airport_3', 'airport_4', 'airport_5'] };
const challenge = (id = 'energy_management', patch = {}) => ({ version: 1, id, status: 'active',
  objectives: Object.fromEntries(goals[id].map(key => [key, false])), elapsedSeconds: 60, airborneSeconds: 40,
  peakAGL: 1000, wasAirborne: true, streakSeconds: 0, arrivals: [],
  ...(id === 'world_tour' ? { tourTimingValid: true, tourElapsedSeconds: 120 } : {}), ...patch });
const flight = (result = challenge(), patch = {}) => ({ attemptId: 'latest-challenge',
  aircraftId: 'cessna172', activityId: result ? result.id : 'energy_management', challenge: result,
  investigation: false, startedAirborne: false, approachAirportId: result?.id === 'world_tour' ? 'kpwm' : null,
  endedAt: '2026-10-21T12:00:00.000Z', samples: [], reflection: 'Explain the control decision with saved evidence.', ...patch });
let api, tool, root, host, latest, writes, xp, errors;
const journal = () => host.querySelector('[aria-label="Flight practice journal"]');
const panel = () => journal().querySelector('[data-flight-challenge-comparison]');
const summary = scope => panel().querySelector('[data-flight-challenge-summary="' + scope + '"]');
const paired = key => panel().querySelector('[data-challenge-paired-objective="' + key + '"]');
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
    const [data, update] = React.useState({ flightSim: { view: 'debrief', lastDebrief: flight(),
      flightPracticeHistory: [flight(challenge(), { attemptId: 'earlier-challenge', reflection: 'Earlier explanation.' })],
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

describe('Sky School saved challenge evidence comparison', () => {
  it.each(Object.keys(goals))('pairs the canonical objectives of matching %s attempts without adding performance scores', id => {
    const comparison = api.flightChallengeComparison(flight(challenge(id)), flight(challenge(id), { attemptId: 'earlier' }));
    expect(comparison).toMatchObject({ comparable: true, reason: 'matching' });
    expect(comparison.objectives.map(goal => goal.key)).toEqual(goals[id]);
    expect(comparison.objectives.every(goal => goal.latest === false && goal.earlier === false)).toBe(true);
    expect(comparison).not.toHaveProperty('deltas');
  });
  it('uses canonical observed goals rather than a saved status or premature landing marker', () => {
    const comparison = api.flightChallengeComparison(flight(challenge('first_flight', { status: 'complete', objectives: { landing: true } })),
      flight(challenge('first_flight', { objectives: { climb: true, steady: true, landing: true } })));
    expect(comparison.latest.result.status).toBe('active');
    expect(comparison.objectives.find(goal => goal.key === 'landing')).toMatchObject({ earlier: true, latest: false });
  });
  it('keeps absent whole challenge evidence unknown rather than converting it to incomplete objectives', () => {
    const comparison = api.flightChallengeComparison(flight(challenge()), flight(null));
    expect(comparison).toMatchObject({ comparable: false, reason: 'unknown', earlier: { result: null } });
    expect(comparison.objectives).toEqual([]);
    expect(comparison.earlier.objectives.map(goal => goal.observed)).toEqual([null, null]);
    expect(comparison.latest.objectives.map(goal => goal.observed)).toEqual([false, false]);
  });
  it('keeps different exercises, aircraft, launch modes, unknown context and approach airports separate', () => {
    for (const earlier of [flight(challenge('first_climb')), flight(challenge(), { aircraftId: 'sr71' }),
      flight(challenge(), { startedAirborne: true }), flight(challenge(), { startedAirborne: null })]) {
      const comparison = api.flightChallengeComparison(flight(challenge()), earlier);
      expect(comparison.comparable).toBe(false); expect(comparison.objectives).toEqual([]);
    }
    const tour = api.flightChallengeComparison(flight(challenge('world_tour')), flight(challenge('world_tour'), { approachAirportId: 'kjfk' }));
    expect(tour).toMatchObject({ comparable: false, reason: 'airport', objectives: [] });
    expect(api.flightChallengeComparison({ aircraftId: 'cessna172', activityId: 'free_flight', samples: [] }, null)).toBeNull();
  });
  it('retains each own canonical glide snapshot and actual airport identities without mutating saved evidence', () => {
    const current = flight(challenge('energy_management', { glideSnapshot: { altitude: 4321.5, airspeed: 95.5 }, objectives: { glide: true } }));
    const earlier = flight(challenge('energy_management', { glideSnapshot: { altitude: 5100, airspeed: 105 }, objectives: { glide: true, climb: true } }));
    const saved = JSON.stringify([current, earlier]);
    const comparison = api.flightChallengeComparison(current, earlier);
    expect(comparison.latest.result.glideSnapshot).toEqual({ altitude: 4321.5, airspeed: 95.5 });
    expect(comparison.earlier.result.glideSnapshot).toEqual({ altitude: 5100, airspeed: 105 });
    comparison.latest.result.glideSnapshot.altitude = 9999;
    expect(JSON.stringify([current, earlier])).toBe(saved);
    const tour = api.flightChallengeComparison(flight(challenge('world_tour', { arrivals: ['kjfk', 'kjfk', 'unknown'] })),
      flight(challenge('world_tour', { arrivals: ['kpwm'] })));
    expect(tour.objectives[0]).toMatchObject({ earlier: true, latest: true, earlierAirportId: 'kpwm', latestAirportId: 'kjfk' });
    expect(tour.latest.result.arrivals).toEqual(['kjfk']);
  });
  it('shows both glide snapshots alongside observed and incomplete goals without exposing actions in saved evidence', async () => {
    await mount({ lastDebrief: flight(challenge('energy_management', { objectives: { glide: true, climb: true }, glideSnapshot: { altitude: 4321.5, airspeed: 95.5 } })),
      flightPracticeHistory: [flight(challenge('energy_management', { objectives: { glide: true }, glideSnapshot: { altitude: 5100, airspeed: 105 } }), { attemptId: 'earlier' })] });
    expect(panel().dataset.challengeComparable).toBe('true');
    expect(paired('glide').textContent).toContain('Earlier: done');
    expect(paired('climb').textContent).toContain('Earlier: incomplete');
    expect(paired('climb').textContent).toContain('Latest: done');
    expect(summary('earlier').querySelector('[data-challenge-glide-snapshot]').textContent).toContain('5,100 ft at 105 kts');
    expect(summary('latest').querySelector('[data-challenge-glide-snapshot]').textContent).toContain('4,321.5 ft at 95.5 kts');
    expect(panel().querySelector('button, select, textarea, input')).toBeNull();
    expect(writes).toHaveLength(0); expect(xp).toHaveLength(0);
  });
  it('shows separate checklists for unmatched challenge contexts and keeps their objective meanings', async () => {
    await mount({ lastDebrief: flight(challenge('energy_management', { objectives: { glide: true } })),
      flightPracticeHistory: [flight(challenge('first_climb', { objectives: { climb: true } }), { attemptId: 'earlier' })] });
    expect(panel().dataset.challengeComparable).toBe('false');
    expect(panel().querySelector('[data-challenge-paired-objectives]')).toBeNull();
    expect(summary('earlier').dataset.flightChallengeId).toBe('first_climb');
    expect(summary('earlier').textContent).toContain('Reach 1,000 ft MSL. · done');
    expect(summary('latest').textContent).toContain('At idle power, descend');
    expect(summary('latest').querySelector('[data-challenge-review-objective="climb"]').textContent).toContain('incomplete');
  });
  it('shows actual tour arrivals in each own evidence column instead of treating ordinal goals as shared airports', async () => {
    await mount({ lastDebrief: flight(challenge('world_tour', { arrivals: ['kjfk', 'kord'] })),
      flightPracticeHistory: [flight(challenge('world_tour', { arrivals: ['kpwm'] }), { attemptId: 'earlier' })] });
    expect(panel().dataset.challengeComparable).toBe('true');
    expect(summary('earlier').querySelectorAll('[data-challenge-review-airport]')).toHaveLength(1);
    expect(summary('earlier').querySelector('[data-challenge-review-airport]').dataset.challengeReviewAirport).toBe('kpwm');
    expect(summary('latest').querySelectorAll('[data-challenge-review-airport]')).toHaveLength(2);
    expect(paired('airport_1').textContent).toContain('Earlier: done · PWM');
    expect(paired('airport_1').textContent).toContain('Latest: done · JFK');
    expect(paired('airport_2').textContent).toContain('Earlier: incomplete');
    expect(panel().querySelector('#challenge-next-airport, button, textarea')).toBeNull();
  });
  it('renders unavailable saved results and snapshots as unknown, separately from incomplete goals', async () => {
    await mount({ lastDebrief: flight(challenge()), flightPracticeHistory: [flight(null, { attemptId: 'unknown' })] });
    expect(panel().dataset.challengeComparable).toBe('false');
    expect(summary('earlier').querySelector('[data-challenge-review-status]').textContent).toBe('Not recorded');
    expect(summary('earlier').querySelector('[data-challenge-review-objective="glide"]').textContent).toContain('Not recorded');
    expect(summary('latest').querySelector('[data-challenge-review-objective="glide"]').textContent).toContain('incomplete');
    expect(summary('earlier').querySelector('[data-challenge-glide-snapshot] p').textContent).toBe('Not recorded');
    expect(summary('latest').querySelector('[data-challenge-glide-snapshot] p').textContent).toBe('Not recorded');
    expect(panel().querySelector('[data-challenge-paired-objectives]')).toBeNull();
  });
  it('retains earlier challenge evidence when the latest exercise is regular free flight', async () => {
    await mount({ lastDebrief: flight(null, { activityId: 'free_flight' }), flightPracticeHistory: [flight(challenge('first_climb'), { attemptId: 'earlier' })] });
    expect(summary('earlier').dataset.flightChallengeId).toBe('first_climb');
    expect(summary('latest')).toBeNull();
    expect(panel().dataset.challengeComparable).toBe('false');
  });
  it('switches saved evidence and reloads without overwriting explanations, journal observations, controls or credit', async () => {
    const history = [flight(challenge('energy_management', { glideSnapshot: { altitude: 5000, airspeed: 100 } }), { attemptId: 'energy-earlier', reflection: 'Earlier glide explanation.' }),
      flight(challenge('world_tour', { arrivals: ['kpwm'] }), { attemptId: 'tour-earlier', reflection: 'Earlier tour explanation.' })];
    await mount({ flightPracticeHistory: history });
    const originalLatest = JSON.stringify(latest.lastDebrief), originalHistory = JSON.stringify(latest.flightPracticeHistory);
    await choose(1); expect(summary('earlier').dataset.flightChallengeId).toBe('world_tour');
    expect(journal().textContent).toContain('Earlier tour explanation.');
    await choose(0); expect(summary('earlier').dataset.flightChallengeId).toBe('energy_management');
    expect(journal().textContent).toContain('Earlier glide explanation.');
    const saved = JSON.parse(JSON.stringify(latest)); await mount(saved);
    expect(summary('earlier').dataset.flightChallengeId).toBe('energy_management');
    expect(latest.debriefHistoryIndex).toBe(0);
    expect(JSON.stringify(latest.lastDebrief)).toBe(originalLatest); expect(JSON.stringify(latest.flightPracticeHistory)).toBe(originalHistory);
    expect(host.querySelector('#challenge-reflection').value).toBe('Explain the control decision with saved evidence.');
    expect(latest.debriefSampleIndex).toBe(2); expect(latest.debriefCompareIndex).toBe(1);
    expect(latest.totalFlightTime).toBe(900); expect(xp).toHaveLength(0);
    expect(writes.every(patch => Object.keys(patch).every(key => ['debriefHistoryIndex', 'debriefHistorySampleIndex'].includes(key)))).toBe(true);
  });
});
