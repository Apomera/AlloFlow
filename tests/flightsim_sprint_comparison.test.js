import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, writes, errors, awardXP, celebrate;
const route = (id = 'americas') => api.SPRINT_ROUTES.find(item => item.id === id);
const country = place => api.GEO_PLACES.find(item => item.name === place).country;
const answer = (index, patch = {}, id = 'americas') => {
  const place = route(id).places[index];
  return { place, answer: place, expected: place, ...patch };
};
const outcome = (results = [], patch = {}) => ({ version: 1, routeId: 'americas', status: 'ended', elapsedSeconds: 35, results, ...patch });
const sample = (t = 0, patch = {}) => ({ t, lat: 43.646, lon: -70.309, alt: 35000, spd: 1800,
  hdg: 90, agl: 34900, onGround: false, stalling: false, lowAirspeed: false, ...patch });
const record = (patch = {}) => ({ attemptId: 'latest-sprint', aircraftId: 'sr71', aircraft: 'SR-71 Blackbird',
  activityId: 'geography_sprint', sprintRouteId: 'americas', startedAirborne: true, investigation: false,
  endedAt: '2026-10-21T12:00:00.000Z', flightTime: 35, airborneSeconds: 35,
  bestStableSeconds: 0, stallSeconds: 0, landings: 0, reflection: 'Latest explanation.',
  samples: [sample(0), sample(2), sample(4)], sprint: outcome([answer(1), answer(2), answer(3)]), ...patch });
const previous = (patch = {}) => record({ attemptId: 'earlier-sprint', reflection: 'Earlier explanation.',
  endedAt: '2026-10-20T12:00:00.000Z', ...patch });
function differingAttempts() {
  const first = route().places[1], second = route().places[2];
  return {
    current: record({ sprint: outcome([
      answer(1, { answer: country(first), expected: country(first) }),
      answer(2, { answer: 'Another place' }), answer(3, { answer: 'SKIPPED' }),
    ]) }),
    earlier: previous({ sprint: outcome([
      answer(1), answer(2, { answer: 'SKIPPED', expected: country(second) }), answer(3),
    ]) }),
  };
}
const journal = () => host.querySelector('[aria-label="Flight practice journal"]');
const comparison = () => journal().querySelector('[data-flight-sprint-comparison]');
const stop = place => [...comparison().querySelectorAll('[data-sprint-comparison-stop]')].find(item => item.getAttribute('data-sprint-comparison-stop') === place);
const side = (place, which) => stop(place).querySelector('[data-sprint-comparison-side="' + which + '"]');
async function change(control, value) {
  expect(control).toBeTruthy();
  const prototype = control.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLSelectElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(control, String(value));
    control.dispatchEvent(new Event(control.tagName === 'INPUT' ? 'input' : 'change', { bubbles: true }));
  });
}
async function mount(seed = {}, t) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'debrief', lastDebrief: record(),
      flightPracticeHistory: [previous()], debriefSampleIndex: 2, debriefCompareIndex: 1, ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData, ...(t ? { t } : {}), awardXP, celebrate,
      update: (id, key, value) => { writes.push({ [key]: value }); setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })); },
      updateMulti: (id, patch) => { writes.push(patch); setData(old => ({ ...old, [id]: { ...old[id], ...patch } })); },
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
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  writes = []; awardXP = vi.fn(); celebrate = vi.fn(); errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Sky School route response comparison evidence', () => {
  it('aligns every authored question stop in route order, excluding departure and unreached guesses', () => {
    const { current, earlier } = differingAttempts();
    const result = api.flightSprintComparison(current, earlier);
    expect(result).toMatchObject({ comparable: true, reason: 'matching',
      current: { routeId: 'americas', outcomeKnown: true }, previous: { routeId: 'americas', outcomeKnown: true } });
    expect(result.stops.map(item => item.place)).toEqual(route().places.slice(1));
    expect(result.stops.map(item => item.current.state)).toEqual(['correct', 'incorrect', 'skipped', 'unrecorded', 'unrecorded', 'unrecorded', 'unrecorded']);
    expect(result.stops.map(item => item.previous.state)).toEqual(['correct', 'skipped', 'correct', 'unrecorded', 'unrecorded', 'unrecorded', 'unrecorded']);
  });

  it('keeps each attempt’s own expected answer when the same stop asked for place or country', () => {
    const { current, earlier } = differingAttempts(), place = route().places[1];
    const first = api.flightSprintComparison(current, earlier).stops[0];
    expect(first.current).toEqual({ state: 'correct', answer: country(place), expected: country(place), correct: true });
    expect(first.previous).toEqual({ state: 'correct', answer: place, expected: place, correct: true });
    expect(first).not.toHaveProperty('delta'); expect(first).not.toHaveProperty('improved');
  });

  it('distinguishes a recorded skip, an unrecorded stop and a missing native outcome', () => {
    const current = record({ sprint: outcome([answer(1, { answer: 'SKIPPED' })]) });
    const result = api.flightSprintComparison(current, previous({ sprint: null }));
    expect(result).toMatchObject({ comparable: false, reason: 'unknown', previous: { outcomeKnown: false } });
    expect(result.stops[0].current).toMatchObject({ state: 'skipped', answer: 'SKIPPED', correct: false });
    expect(result.stops[1].current).toEqual({ state: 'unrecorded', answer: null, expected: null, correct: null });
    expect(result.stops.every(item => item.previous.state === 'unknown' && item.previous.expected === null)).toBe(true);
  });

  it('treats an empty valid outcome as unrecorded without treating its stops as wrong or skipped', () => {
    const result = api.flightSprintComparison(record({ sprint: outcome() }), previous({ sprint: outcome() }));
    expect(result.comparable).toBe(true);
    expect(result.stops.every(item => item.current.state === 'unrecorded' && item.previous.state === 'unrecorded')).toBe(true);
  });

  it('does not align different routes, even when they contain a shared city', () => {
    const result = api.flightSprintComparison(record({ sprintRouteId: 'world', sprint: outcome([], { routeId: 'world' }) }),
      previous({ sprintRouteId: 'capitals', sprint: outcome([], { routeId: 'capitals' }) }));
    expect(result).toMatchObject({ comparable: false, reason: 'route', stops: [],
      current: { routeId: 'world' }, previous: { routeId: 'capitals' } });
    expect(result).not.toHaveProperty('deltas'); expect(result).not.toHaveProperty('elapsedSeconds');
    expect(result).not.toHaveProperty('score');
  });

  it('keeps unknown route metadata unknown and refuses an outcome for another authored route', () => {
    const unknown = api.flightSprintComparison(record({ sprintRouteId: 'not-a-route' }), previous());
    expect(unknown).toMatchObject({ comparable: false, reason: 'unknown', stops: [],
      current: { routeId: null, routeName: null, outcomeKnown: false } });
    const mismatch = api.flightSprintComparison(record({ sprint: outcome([], { routeId: 'europe' }) }), previous());
    expect(mismatch).toMatchObject({ comparable: false, reason: 'unknown', current: { outcomeKnown: false } });
    expect(mismatch.stops.every(item => item.current.state === 'unknown')).toBe(true);
  });

  it.each(['free_flight', 'coastal_rescue', 'drone_survey'])('declines a sprint/%s pair in both directions', activityId => {
    expect(api.flightSprintComparison(record(), previous({ activityId }))).toBeNull();
    expect(api.flightSprintComparison(record({ activityId }), previous())).toBeNull();
  });

  it('uses canonical responses rather than claimed correctness and leaves source evidence untouched', () => {
    const current = record({ sprint: outcome([answer(1, { answer: 'Wrong', correct: true }), answer(2, { correct: false }),
      answer(3, { answer: 'SKIPPED', correct: true })], { score: 900, total: 0, bestStreak: 999 }) });
    const earlier = previous(), before = JSON.stringify([current, earlier]);
    const result = api.flightSprintComparison(current, earlier);
    expect(result.stops.slice(0, 3).map(item => item.current.state)).toEqual(['incorrect', 'correct', 'skipped']);
    expect(JSON.stringify([current, earlier])).toBe(before);
    result.stops[0].current.answer = 'Changed detached result';
    expect(JSON.stringify([current, earlier])).toBe(before);
  });
});

describe('Sky School native sprint journal comparison', () => {
  it('presents readable earlier/latest response status and each expected response without a performance delta', async () => {
    const { current, earlier } = differingAttempts();
    await mount({ lastDebrief: current, flightPracticeHistory: [earlier] });
    const first = route().places[1], second = route().places[2], third = route().places[3];
    expect(comparison().getAttribute('data-sprint-comparison-reason')).toBe('matching');
    expect([...comparison().querySelectorAll('[data-sprint-comparison-stop]')].map(item => item.getAttribute('data-sprint-comparison-stop'))).toEqual(route().places.slice(1));
    expect(side(first, 'earlier').textContent).toContain('Earlier: Correct');
    expect(side(first, 'earlier').textContent).toContain('Your answer: ' + first + '. Correct answer: ' + first + '.');
    expect(side(first, 'latest').textContent).toContain('Latest: Correct');
    expect(side(first, 'latest').textContent).toContain('Your answer: ' + country(first) + '. Correct answer: ' + country(first) + '.');
    expect(side(second, 'latest').textContent).toContain('Latest: Incorrect');
    expect(side(second, 'earlier').textContent).toContain('Your answer: Skipped. Correct answer: ' + country(second) + '.');
    expect(side(third, 'latest').getAttribute('data-sprint-response-state')).toBe('skipped');
    expect(side(route().places[4], 'latest').textContent).toBe('Latest: Not recorded');
    expect(journal().querySelector('[data-flight-comparison-metrics]')).toBeNull();
    expect(comparison().textContent).not.toMatch(/improv|better|faster|grade|score:|Change:|\d+\s*s(?:econds)?\b/i);
    expect(comparison().textContent).toContain('does not measure aircraft performance');
  });

  it('shows missing native evidence without borrowing the other attempt’s answers', async () => {
    await mount({ lastDebrief: record({ sprint: null }), flightPracticeHistory: [previous()] });
    expect(comparison().getAttribute('data-sprint-comparison-reason')).toBe('unknown');
    for (const place of route().places.slice(1)) {
      expect(side(place, 'latest').getAttribute('data-sprint-response-state')).toBe('unknown');
      expect(side(place, 'latest').textContent).toBe('Latest: Not recorded');
    }
    expect(side(route().places[1], 'earlier').textContent).toContain('Correct answer: ' + route().places[1]);
  });

  it('shows both route identities but no aligned response rows for different routes', async () => {
    await mount({ lastDebrief: record({ sprintRouteId: 'europe', sprint: outcome([], { routeId: 'europe' }) }) });
    expect(comparison().getAttribute('data-sprint-comparison-reason')).toBe('route');
    expect(comparison().textContent).toContain('Latest: ' + route('europe').name);
    expect(comparison().textContent).toContain('Earlier: ' + route().name);
    expect(comparison().querySelectorAll('[data-sprint-comparison-stop]')).toHaveLength(0);
    expect(comparison().textContent).toContain('Change: Not calculated');
    expect(journal().querySelector('[data-flight-comparison-metrics]')).toBeNull();
  });

  it.each(['latest', 'earlier'])('keeps separate native summaries for a mixed sprint/free-flight pair with the sprint %s', async which => {
    const free = record({ attemptId: 'ordinary-free-flight', activityId: 'free_flight', aircraftId: 'cessna172', startedAirborne: false });
    await mount(which === 'latest' ? { flightPracticeHistory: [free] } : { lastDebrief: free });
    expect(comparison()).toBeNull(); expect(journal().querySelector('[data-flight-comparison-metrics]')).toBeNull();
    expect(host.querySelector('[data-flight-sprint-summary="' + which + '"]')).toBeTruthy();
  });

  it('changes the selected attempt, retains native evidence and reflections, and restores the review after remount', async () => {
    const { current, earlier } = differingAttempts();
    const second = previous({ attemptId: 'second-earlier-sprint', reflection: 'Second earlier explanation.', sprint: outcome([answer(1, { answer: 'Wrong second response' })]) });
    await mount({ lastDebrief: current, flightPracticeHistory: [earlier, second], debriefHistoryIndex: 0, debriefHistorySampleIndex: 2 });
    const original = JSON.stringify([latest.lastDebrief, latest.flightPracticeHistory]);
    const select = journal().querySelector('#debrief-earlier-flight'); select.focus();
    await change(select, 1);
    expect(document.activeElement).toBe(select); expect(latest.debriefHistoryIndex).toBe(1);
    expect(latest.debriefHistorySampleIndex).toBe(0); expect(latest.debriefSampleIndex).toBe(2); expect(latest.debriefCompareIndex).toBe(1);
    expect(side(route().places[1], 'earlier').textContent).toContain('Wrong second response');
    expect(side(route().places[1], 'latest').textContent).toContain(country(route().places[1]));
    expect(journal().textContent).toContain(second.reflection);
    expect(host.querySelector('#debrief-evidence-explanation').value).toBe(current.reflection);
    expect(JSON.stringify([latest.lastDebrief, latest.flightPracticeHistory])).toBe(original);
    await change(journal().querySelector('#debrief-earlier-time'), 2);
    const saved = JSON.parse(JSON.stringify(latest)); await mount(saved);
    expect(journal().querySelector('#debrief-earlier-flight').value).toBe('1');
    expect(journal().querySelector('#debrief-earlier-time').value).toBe('2');
    expect(side(route().places[1], 'earlier').textContent).toContain('Wrong second response');
    expect(latest.lastDebrief).toEqual(saved.lastDebrief); expect(latest.flightPracticeHistory).toEqual(saved.flightPracticeHistory);
    expect(host.querySelector('#debrief-evidence-explanation').value).toBe(current.reflection);
    expect(awardXP).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled();
    expect(writes.every(patch => Object.keys(patch).every(key => ['debriefHistoryIndex', 'debriefHistorySampleIndex'].includes(key)))).toBe(true);
  });

  it('reuses localized readable statuses, response feedback, and side labels without translating saved evidence', async () => {
    const { current, earlier } = differingAttempts(), place = route().places[1];
    const labels = { 'common.correct': 'Correcte', 'common.incorrect': 'Incorrecte',
      'stem.flightsim.geoq_skipped': 'Ignorée', 'stem.flightsim.evidence_not_recorded': 'Non enregistrée',
      'stem.flightsim.journal_earlier_value': 'Avant : {value}', 'stem.flightsim.journal_latest_value': 'Après : {value}',
      'stem.flightsim.geoq_answer_feedback': 'Réponse : {answer}. Attendue : {expected}.' };
    await mount({ lastDebrief: current, flightPracticeHistory: [earlier] }, (key, fallback) => labels[key] || fallback);
    expect(side(place, 'earlier').textContent).toContain('Avant : Correcte');
    expect(side(place, 'latest').textContent).toContain('Après : Correcte');
    expect(side(route().places[2], 'latest').textContent).toContain('Après : Incorrecte');
    expect(side(route().places[3], 'latest').textContent).toContain('Réponse : Ignorée. Attendue : ' + route().places[3]);
    expect(side(route().places[4], 'latest').textContent).toBe('Après : Non enregistrée');
    expect(latest.lastDebrief.sprint.results[0].answer).toBe(country(place));
    expect(latest.flightPracticeHistory[0].sprint.results[0].answer).toBe(place);
  });
});
