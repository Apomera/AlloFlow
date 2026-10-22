import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, root, host, latest;
const summary = scope => host.querySelector(`[data-flight-sprint-summary="${scope}"]`);
const rows = scope => [...summary(scope).querySelectorAll('[data-sprint-journal-stop]')];
const route = () => api.SPRINT_ROUTES.find(item => item.id === 'americas');
const stops = () => route().places.slice(1);
function responses() {
  const places = stops();
  return [
    { place: places[0], answer: places[0], expected: places[0] },
    { place: places[1], answer: 'Another city', expected: places[1] },
    { place: places[3], answer: 'SKIPPED', expected: places[3] },
    { place: places[4], answer: places[4], expected: places[4] },
  ];
}
function record(results = responses(), extra = {}) {
  return { attemptId: 'sprint-current', endedAt: '2026-10-20T14:00:00.000Z',
    aircraftId: 'sr71', aircraft: 'SR-71 Blackbird', startedAirborne: true,
    activityId: 'geography_sprint', sprintRouteId: 'americas',
    flightTime: 90, sessionTime: 90, airborneSeconds: 90,
    bestStableSeconds: 0, stallSeconds: 0, lowAirspeedSeconds: 0,
    peakAGL: 35000, landings: 0, bestLanding: null, maxAlt: 35000,
    maxSpeed: 1800, distance: 50, airports: 0, discovered: 0, badges: 0,
    investigation: false, reflection: '', samples: [],
    sprint: { routeId: 'americas', status: 'ended', elapsedSeconds: 90, results },
    ...extra };
}
async function mount(seed = {}) {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'debrief', lastDebrief: record(), ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await act(async () => root.render(React.createElement(App)));
}
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Sky School complete saved sprint route review', () => {
  it.each(['latest', 'earlier'])('shows every stop in canonical order in the %s journal without inventing missing answers', async scope => {
    const flight = record();
    const before = structuredClone(flight);
    await mount(scope === 'latest' ? { lastDebrief: flight } : {
      lastDebrief: record([], { attemptId: 'sprint-later' }), flightPracticeHistory: [flight],
    });
    const items = rows(scope);
    expect(items.map(item => item.dataset.sprintJournalStop)).toEqual(stops());
    expect(items.map(item => item.dataset.sprintJournalState)).toEqual([
      'correct', 'incorrect', 'unrecorded', 'skipped', 'correct', 'unrecorded', 'unrecorded',
    ]);
    expect(items[0].textContent).toContain(`Your answer: ${stops()[0]}. Correct answer: ${stops()[0]}.`);
    expect(items[1].textContent).toContain(`Your answer: Another city. Correct answer: ${stops()[1]}.`);
    expect(items[3].textContent).toContain('Skipped');
    expect(items[3].textContent).not.toContain('SKIPPED');
    for (const index of [2, 3, 5, 6]) {
      expect(items[index].querySelector('p')).toBeNull();
      expect(items[index].textContent).not.toContain('Your answer:');
    }
    for (const index of [2, 5, 6]) {
      expect(items[index].textContent).toContain('Not recorded');
      expect(items[index].textContent).not.toMatch(/[✓✗]/);
    }
    expect(summary(scope).textContent).toContain('Score: 2/7');
    expect(summary(scope).textContent).toContain('Streak: 1');
    const retained = scope === 'latest' ? latest.lastDebrief : latest.flightPracticeHistory[0];
    expect(retained).toEqual(before);
    expect(api.normalizeFlightSprintRecord(retained.sprint)).toMatchObject({ score: 2, streak: 1, bestStreak: 1 });
    expect(retained.sprint.results).toHaveLength(4);
  });

  it('shows an empty attempt as unrecorded stops while preserving zero observed responses', async () => {
    await mount({ lastDebrief: record([]) });
    expect(rows('latest')).toHaveLength(stops().length);
    expect(rows('latest').every(item => item.dataset.sprintJournalState === 'unrecorded')).toBe(true);
    expect(summary('latest').textContent).toContain('Score: 0/7');
    expect(summary('latest').textContent).not.toContain('Your answer:');
    expect(summary('latest').textContent).not.toContain('Skipped');
    expect(latest.lastDebrief.sprint.results).toEqual([]);
  });

  it('treats discarded foreign, duplicate and invalid answer records as missing rather than adding route stops', async () => {
    await mount({ lastDebrief: record([
      { place: stops()[0], answer: stops()[0], expected: stops()[0] },
      { place: stops()[0], answer: 'Duplicate answer', expected: stops()[0] },
      { place: 'Foreign stop', answer: 'Forged answer', expected: 'Foreign stop' },
      { place: stops()[1], answer: 'Forged answer', expected: 'Not a valid answer' },
    ]) });
    expect(rows('latest').map(item => item.dataset.sprintJournalStop)).toEqual(stops());
    expect(rows('latest')[0].dataset.sprintJournalState).toBe('correct');
    expect(rows('latest').slice(1).every(item => item.dataset.sprintJournalState === 'unrecorded')).toBe(true);
    expect(summary('latest').textContent).not.toMatch(/Foreign stop|Duplicate answer|Forged answer/);
    expect(summary('latest').textContent).toContain('Score: 1/7');
  });

  it('uses each known route rather than reusing the current Americas stop list', async () => {
    for (const current of api.SPRINT_ROUTES) {
      await mount({ lastDebrief: record([], { sprintRouteId: current.id,
        sprint: { routeId: current.id, status: 'ended', elapsedSeconds: 0, results: [] } }) });
      expect(rows('latest').map(item => item.dataset.sprintJournalStop)).toEqual(current.places.slice(1));
      await act(async () => root.unmount()); root = null; host.remove(); host = null;
    }
  });

  it('does not guess a route when saved sprint context is unknown or mismatched', async () => {
    await mount({ lastDebrief: record([], { sprintRouteId: 'unknown-route' }) });
    expect(rows('latest')).toEqual([]);
    expect(summary('latest').textContent).toContain('Not recorded');
    expect(summary('latest').textContent).not.toContain('Your answer:');
  });
});
