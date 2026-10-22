import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, host, root, latest;
const flight = (patch = {}) => ({ attemptId: 'latest-flight', aircraftId: 'cessna172', aircraft: 'Cessna 172 Skyhawk',
  activityId: 'free_flight', investigation: false, startedAirborne: false,
  flightTime: 30, airborneSeconds: 30, bestStableSeconds: 15, stallSeconds: 0, lowAirspeedSeconds: 0,
  peakAGL: 1000, landings: 1, bestLanding: 180, distance: 2, maxAlt: 5000, maxSpeed: 110,
  airports: 1, discovered: 0, badges: 0, samples: [], reflection: '', ...patch });
async function mount(record, history = []) {
  if (root) await act(async () => root.unmount());
  host?.remove(); host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'debrief', lastDebrief: record, flightPracticeHistory: history } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
function stat(label) {
  const tile = [...host.querySelectorAll('[data-flight-stat]')].find(node => node.dataset.flightStat === label);
  expect(tile, label).toBeTruthy(); return tile.children[1].textContent;
}

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  const canvas = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
    { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvas);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School latest and earlier debrief consistency', () => {
  it('keeps missing measurements unknown instead of turning an old log into measured zeroes', async () => {
    const saved = { aircraftId: 'cessna172', reflection: 'An older flight with no summary measurements.' };
    await mount(saved);
    for (const label of ['Flight Time', 'Distance', 'Max Altitude', 'Max Speed', 'Airports', 'Places Found', 'Achievements']) {
      expect(stat(label)).toBe('Not recorded');
    }
    expect(host.textContent).not.toMatch(/NaN|Infinity|undefined|null/);
    expect(host.querySelector('[data-flight-debrief-headline]')).toBeNull();
    expect(host.querySelector('#debrief-evidence-explanation').value).toBe(saved.reflection);
    expect(latest.lastDebrief).toEqual(saved);
    await mount(JSON.parse(JSON.stringify(latest.lastDebrief)));
    expect(stat('Max Altitude')).toBe('Not recorded');
  });

  it('rejects malformed, coerced, out-of-range, and nonfinite measurements in the latest summary', async () => {
    const saved = flight({ flightTime: '30', distance: true, maxAlt: Infinity, maxSpeed: -1,
      airports: '3', discovered: NaN, badges: 100001, bestLanding: '100', airborneSeconds: '30',
      bestStableSeconds: '15', landings: '1' });
    await mount(saved);
    for (const label of ['Flight Time', 'Distance', 'Max Altitude', 'Max Speed', 'Airports', 'Places Found', 'Achievements']) {
      expect(stat(label)).toBe('Not recorded');
    }
    expect(stat('Best Landing')).toBe('—');
    expect(host.textContent).not.toContain('Butter landing');
    expect(host.textContent).toContain('0 of 3 practice milestones observed');
    expect(latest.lastDebrief.airports).toBe('3');
    expect(Number.isNaN(latest.lastDebrief.discovered)).toBe(true);
  });

  it('does not announce or praise a touchdown when the same saved log records zero landings', async () => {
    const saved = flight({ landings: 0, bestLanding: 0, newLandingBest: true });
    await mount(saved, [{ ...saved, attemptId: 'earlier-flight' }]);
    expect(stat('Best Landing')).toBe('—');
    expect(host.textContent).toContain('No landing recorded');
    expect(host.textContent).not.toMatch(/Butter landing|softest landing|touched down|Great landing/);
    const comparison = host.querySelector('[aria-label="Flight practice journal"]');
    expect(comparison.textContent).toContain('Earlier: No touchdown recorded');
    expect(comparison.textContent).toContain('Latest: No touchdown recorded');
    expect(latest.lastDebrief.bestLanding).toBe(0);
  });

  it('preserves actual recorded zeroes and a valid below-sea-level maximum altitude', async () => {
    await mount(flight({ flightTime: 0, airborneSeconds: 0, bestStableSeconds: 0, peakAGL: 0,
      landings: 0, bestLanding: null, distance: 0, maxAlt: -250, maxSpeed: 0, airports: 0, discovered: 0, badges: 0 }));
    expect(stat('Flight Time')).toBe('0:00');
    expect(stat('Distance')).toBe('0 nm');
    expect(stat('Max Altitude')).toBe('-250 ft');
    expect(stat('Max Speed')).toBe('0 kts');
    expect(stat('Airports')).toBe('0');
    expect(stat('Places Found')).toBe('0');
    expect(stat('Achievements')).toMatch(/^0\/\d+$/);
  });

  it('does not invent a missing maximum altitude in an otherwise recorded distance headline', async () => {
    const saved = flight(); delete saved.maxAlt;
    await mount(saved);
    expect(stat('Distance')).toBe('2 nm');
    expect(stat('Max Altitude')).toBe('Not recorded');
    expect(host.querySelector('[data-flight-debrief-headline]')).toBeTruthy();
    expect(host.querySelector('[data-flight-debrief-headline]').textContent).not.toContain('climbed to');
    await mount({ ...saved, landings: 0, bestLanding: null });
    expect(host.querySelector('[data-flight-debrief-headline]')).toBeNull();
  });

  it('preserves valid current statistics, flight notes, explanations, and landing celebrations', async () => {
    const saved = flight({ newLandingBest: true, reflection: 'I reduced the descent rate before contact.',
      flightNotes: [{ title: 'Stable approach', message: 'I held a constant glide path.' }] });
    await mount(saved);
    expect(stat('Flight Time')).toBe('0:30');
    expect(stat('Distance')).toBe('2 nm');
    expect(stat('Max Altitude')).toBe('5,000 ft');
    expect(stat('Max Speed')).toBe('110 kts');
    expect(stat('Best Landing')).toBe('180 fpm');
    expect(host.textContent).toContain('Your softest landing yet!');
    expect(host.textContent).toContain('Stable approach');
    expect(host.textContent).toContain('I held a constant glide path.');
    expect(host.querySelector('#debrief-evidence-explanation').value).toBe(saved.reflection);
    expect(latest.lastDebrief).toEqual(saved);
  });
});
