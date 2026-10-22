import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, api, host, root, latest, xp;
const date = '2026-10-18T01:02:03.000Z';
const hooks = () => window.__testHooks.flightSim;
const firstFlight = objectives => ({ version: 1, id: 'first_flight', elapsedSeconds: 44, objectives });
const done = id => host.querySelector(`[data-flight-start-step="${id}"]`).dataset.done;

async function mount(seed = {}) {
  if (root) await act(async () => root.unmount());
  host?.remove();
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', menuSections: { challenges: true }, ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      awardXP: (...args) => xp.push(args),
      update: (id, key, value) => setData(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab();
  window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim; xp = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); host = null;
  delete window.__RR_TEST_EXPORTS__; delete window.__testHooks;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School saved challenge progress', () => {
  it('retains known own timestamps and exact legacy true markers without mutating saves', () => {
    const saved = Object.assign(Object.create({ first_climb: true }), {
      first_flight: date, mountain_flying: true, cross_country: 'false', energy_management: {}, retired: date,
    });
    expect(api.normalizeFlightChallengeCompletions(saved)).toEqual({ first_flight: date, mountain_flying: true });
    expect(saved.cross_country).toBe('false');
    expect(saved.retired).toBe(date);
    expect(Object.hasOwn(saved, 'first_climb')).toBe(false);
  });

  it('rejects malformed containers and non-completion values', () => {
    for (const saved of [null, undefined, 'first_flight', ['first_flight'], 1]) {
      expect(api.normalizeFlightChallengeCompletions(saved)).toEqual({});
      expect(api.normalizeFlightChallengeResults(saved)).toEqual({});
    }
    for (const value of [false, 1, 'true', 'false', 'not a date', '2026-10-18', {}, [], Infinity]) {
      expect(api.hasFlightChallengeCompletion('first_flight', { first_flight: value })).toBe(false);
    }
    expect(api.hasFlightChallengeCompletion('retired', { retired: true })).toBe(false);
  });

  it('rejects impossible calendar dates and clock values while preserving leap days and ISO offsets', () => {
    for (const value of ['2026-02-31T01:02:03.000Z', '2025-02-29T01:02:03.000Z', '1900-02-29T01:02:03.000Z',
      '2026-04-31T01:02:03+02:00', '2026-10-18T24:00:00Z', '2026-10-18T01:60:03Z',
      '2026-10-18T01:02:60Z', '2026-10-18T01:02:03+24:00', '2026-10-18T01:02:03+02:60']) {
      expect(api.hasFlightChallengeCompletion('first_flight', { first_flight: value }), value).toBe(false);
      expect(api.normalizeFlightChallenge({ ...firstFlight({ climb: true, steady: true, landing: true }), completedAt: value }).completedAt).toBeNull();
    }
    for (const value of ['2024-02-29T01:02:03.000Z', '2000-02-29T01:02:03Z', '2026-10-18T03:02:03+02:00', '2026-10-17T21:32:03.12-03:30']) {
      expect(api.normalizeFlightChallengeCompletions({ first_flight: value }), value).toEqual({ first_flight: value });
    }
  });

  it('derives completion from recorded objectives rather than a saved status label', () => {
    const incomplete = firstFlight({ climb: true, steady: false, landing: true });
    incomplete.status = 'complete';
    expect(api.hasFlightChallengeCompletion('first_flight', null, { first_flight: incomplete })).toBe(false);
    const complete = firstFlight({ climb: true, steady: true, landing: true });
    complete.status = 'active';
    expect(api.hasFlightChallengeCompletion('first_flight', null, { first_flight: complete })).toBe(true);
    expect(api.normalizeFlightChallengeResults({ first_flight: incomplete }).first_flight.objectives.landing).toBe(false);
    expect(incomplete.objectives.landing).toBe(true);
  });

  it('ignores inherited objectives, inherited results and records stored under another exercise', () => {
    const inheritedObjectives = firstFlight(Object.create({ climb: true, steady: true, landing: true }));
    expect(api.hasFlightChallengeCompletion('first_flight', null, { first_flight: inheritedObjectives })).toBe(false);
    const complete = firstFlight({ climb: true, steady: true, landing: true });
    expect(api.normalizeFlightChallengeResults(Object.create({ first_flight: complete }))).toEqual({});
    expect(api.normalizeFlightChallengeResults({ first_climb: complete })).toEqual({});
    expect(api.normalizeFlightChallenge(Object.create(complete))).toBeNull();
    const arrayRecord = Object.assign([], complete);
    expect(api.normalizeFlightChallenge(arrayRecord)).toBeNull();
  });

  it('keeps bounded tour evidence and supported interruption metadata', () => {
    const saved = { world_tour: { version: 1, id: 'world_tour', status: 'complete',
      arrivals: ['kpwm', 'kpwm', 'unknown', 'kjfk'], interrupted: true, endedAt: date } };
    const normalized = api.normalizeFlightChallengeResults(saved).world_tour;
    expect(normalized).toMatchObject({ status: 'active', arrivals: ['kpwm', 'kjfk'], interrupted: true, endedAt: date });
    expect(api.hasFlightChallengeCompletion('world_tour', null, saved)).toBe(false);
    expect(saved.world_tour.arrivals).toHaveLength(4);
  });

  it('keeps Start Here actionable when saved markers or status claims have no supporting evidence', async () => {
    await mount({ challengeCompleted: { first_climb: 'false', first_flight: {} },
      challengeResults: { first_climb: { version: 1, id: 'first_climb', status: 'complete', objectives: {} },
        first_flight: { ...firstFlight({ climb: true, steady: false, landing: true }), status: 'complete' } } });
    expect(done('first_climb')).toBe('false');
    expect(done('first_flight')).toBe('false');
    const card = host.querySelector('[data-flight-challenge-id="first_flight"]');
    expect(card.textContent).toContain('Saved evidence: 1/3 objectives.');
    expect(card.textContent).not.toContain('all objectives observed');
  });

  it.each([true, date])('preserves established completion after an incomplete retry (marker: %s)', async marker => {
    await mount({ challengeCompleted: { first_flight: marker },
      challengeResults: { first_flight: firstFlight({ climb: true }) } });
    expect(done('first_climb')).toBe('true');
    expect(done('first_flight')).toBe('true');
    expect(host.querySelector('[data-flight-challenge-id="first_flight"]').textContent).toContain('1/3 objectives');
  });

  it('does not attach a mismatched result to a menu card or skip the warm-up', async () => {
    await mount({ challengeResults: { first_climb: firstFlight({ climb: true, steady: true, landing: true }) } });
    expect(done('first_climb')).toBe('false');
    expect(host.querySelector('[data-flight-challenge-id="first_climb"]').textContent).not.toContain('Last attempt');
  });

  it('continues valid tour arrivals even when an old saved status incorrectly says complete', async () => {
    await mount({ challengeResults: { world_tour: { version: 1, id: 'world_tour', status: 'complete', arrivals: ['kpwm'],
      elapsedSeconds: 11, tourElapsedSeconds: 11, tourTimingValid: true } } });
    await act(async () => hooks().startFlightChallenge('world_tour'));
    expect(hooks().getFlightChallengeRef().current).toMatchObject({ status: 'active', arrivals: ['kpwm'], tourElapsedSeconds: 11 });
    expect(latest.challengeApproachAirport).not.toBe('kpwm');
  });

  it('recovers real objective completion and canonical durable records without replaying rewards', async () => {
    const prior = { version: 1, id: 'first_climb', objectives: { climb: true }, completedAt: date };
    await mount({ view: 'flying', selectedChallenge: 'first_flight',
      flightChallenge: { ...firstFlight({ climb: true, steady: true, landing: true }), completedAt: 'invalid' },
      challengeCompleted: { first_climb: true, first_flight: 'false', retired: true },
      challengeResults: { first_climb: prior, retired: { status: 'complete' }, world_tour: 'invalid' },
      quizReviewFilter: 'missed' });
    expect(latest.view).toBe('menu');
    expect(latest.challengeCompleted).toEqual({ first_climb: true, first_flight: new Date().toISOString() });
    expect(Object.keys(latest.challengeResults).sort()).toEqual(['first_climb', 'first_flight']);
    expect(latest.challengeResults.first_flight).toMatchObject({ status: 'complete', interrupted: true });
    expect(latest.personalBests.challenges.first_flight).toBe(44);
    expect(latest.quizReviewFilter).toBe('missed');
    expect(xp).toEqual([]);
    await mount(JSON.parse(JSON.stringify(latest)));
    expect(done('first_flight')).toBe('true');
    expect(xp).toEqual([]);
  });
});
