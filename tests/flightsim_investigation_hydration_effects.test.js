import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, errors, awardXP, translations;
const inquiry = (owner, patch = {}) => api.stallInvestigationRecord({
  phase: 'experiment', prediction: 'angle', hypothesis: owner + ' current prediction',
  startingIdea: { version: 1, status: 'committed', prediction: 'speed', hypothesis: owner + ' original prediction' },
  airspeed: 130, altitude: 5000, aoa: 8,
  observations: [{ trialNumber: 41, airspeed: 130, altitude: 5000, aoa: 8 },
    { trialNumber: 42, airspeed: 130, altitude: 5000, aoa: 20 },
    { trialNumber: 43, airspeed: 80, altitude: 5000, aoa: 20 }],
  explanation: owner + ' explanation remains intact', transferChoice: 'stall', transferAnswer: 'stall',
  transferAttempts: 2, completedAt: '2026-10-22T12:00:00.000Z', ...patch,
});
const flight = () => ({ status: 'active', sawStall: true, recovered: false, recoverySeconds: 2,
  samples: [{ time: 1, airspeed: 95, altitude: 4990, aoa: 20 }, { time: 3, airspeed: 100, altitude: 4700, aoa: 8 }] });
const clone = value => JSON.parse(JSON.stringify(value));
const reopenedCalls = () => translations.filter(key => key === 'stem.flightsim.guided_flight_reopened_announcement');

async function mount(seed, incoming) {
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: seed, otherTool: { writing: 'Keep unrelated writing' } });
    latest = data.flightSim;
    // The real host declares its hydration effect before rendering the plugin.
    // This queues authoritative B before the stale A plugin effects execute,
    // while dataRef still describes the render that produced those A effects.
    React.useEffect(() => {
      if (incoming) setData(previous => ({ ...previous, flightSim: { ...previous.flightSim, ...incoming } }));
    }, []);
    return tool.render(makeCtx({ toolData: data, setToolData: setData, awardXP,
      t: (key, fallback) => { translations.push(key); return fallback ?? key; },
      update: (id, key, value) => setData(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
const base = () => ({ view: 'stallHunt', aircraft: 'cessna172', selectedChallenge: null,
  stallInvestigation: inquiry('A'), stallPreparedComparison: null, hostMarker: 'A',
  takeoffTutorialDismissed: true, landingTutorialDismissed: true, totalFlightTime: 900,
  lastDebrief: { attemptId: 'earlier-review', reflection: 'Keep the previous flight explanation.' },
  flightPracticeHistory: [], earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])) });

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  errors = vi.spyOn(console, 'error').mockImplementation(() => {}); awardXP = vi.fn(); translations = [];
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); expect(awardXP).not.toHaveBeenCalled();
  delete window.__RR_TEST_EXPORTS__; delete window.__testHooks;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School investigation effects behind incoming host hydration', () => {
  it('preserves B valid preparation when A invalid-preparation cleanup runs after B was queued', async () => {
    const seed = { ...base(), stallPreparedComparison: { version: 999 } };
    const source = inquiry('B'), target = api.prepareStallComparisonTrial(source.observations[0], 'angle');
    const record = api.stallInvestigationRecord({ ...source, airspeed: target.airspeed, altitude: target.altitude, aoa: target.aoa });
    const prepared = api.prepareStallComparisonContext(source, 0, 'angle');
    expect(api.stallPreparedComparisonContext(prepared, record)).toEqual(prepared);
    const incoming = { stallInvestigation: record, stallPreparedComparison: prepared, hostMarker: 'B authoritative hydration' };
    await mount(seed, incoming);
    expect(latest).toEqual(clone({ ...seed, ...incoming }));
    expect(host.querySelector('[data-stall-prepared-comparison]')).toBeTruthy();
    expect(reopenedCalls()).toHaveLength(0);
  });

  it('still clears an invalid preparation for the current owner without hydration', async () => {
    const seed = { ...base(), stallPreparedComparison: { version: 999 } };
    await mount(seed);
    expect(latest).toEqual({ ...seed, stallPreparedComparison: null });
    expect(reopenedCalls()).toHaveLength(0);
  });

  it('preserves B investigation when A interrupted-flight recovery runs after B was queued', async () => {
    const seed = { ...base(), view: 'flying', selectedChallenge: 'stall_investigation',
      stallInvestigation: inquiry('A', { phase: 'transfer', flight: flight() }) };
    const incoming = { view: 'stallHunt', selectedChallenge: null, stallInvestigation: inquiry('B', { phase: 'explain', flight: null }),
      stallPreparedComparison: null, hostMarker: 'B authoritative hydration' };
    await mount(seed, incoming);
    expect(latest).toEqual(clone({ ...seed, ...incoming }));
    expect(reopenedCalls()).toHaveLength(0);
    expect(window.__testHooks.flightSim.flyingRef.current).toBe(false);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('still recovers current-owner guided evidence once without hydration', async () => {
    const record = inquiry('A', { phase: 'transfer', flight: flight() });
    const seed = { ...base(), view: 'flying', selectedChallenge: 'stall_investigation', stallInvestigation: record };
    await mount(seed);
    expect(latest.view).toBe('stallHunt'); expect(latest.selectedChallenge).toBeNull();
    expect(latest.stallInvestigation).toEqual({ ...record, flight: { ...record.flight, status: 'interrupted' } });
    expect(latest.lastDebrief).toEqual(seed.lastDebrief); expect(latest.totalFlightTime).toBe(900);
    expect(reopenedCalls()).toHaveLength(1); expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('recovers current-owner guided evidence after invalid preparation cleanup commits first', async () => {
    const record = inquiry('A', { phase: 'transfer', flight: flight() });
    const seed = { ...base(), view: 'flying', selectedChallenge: 'stall_investigation', stallInvestigation: record,
      stallPreparedComparison: { version: 999 } };
    await mount(seed);
    expect(latest.stallPreparedComparison).toBeNull();
    expect(latest.view).toBe('stallHunt'); expect(latest.selectedChallenge).toBeNull();
    expect(latest.stallInvestigation).toEqual({ ...record, flight: { ...record.flight, status: 'interrupted' } });
    expect(latest.lastDebrief).toEqual(seed.lastDebrief); expect(latest.totalFlightTime).toBe(900);
    expect(reopenedCalls()).toHaveLength(1); expect(requestAnimationFrame).not.toHaveBeenCalled();
  });
});
