import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, frameCallback;
const hooks = () => window.__testHooks.flightSim;
const note = (title = 'Stable approach') => ({ title, message: 'Small pitch changes held a steady descent.' });
const place = (name = 'Casco Bay') => ({ name, country: 'United States', fact: 'Coastal islands provide visible navigation landmarks.' });
const flight = patch => ({ attemptId: 'latest', aircraftId: 'cessna172', activityId: 'free_flight',
  startedAirborne: false, investigation: false, samples: [], flightNotes: [], discoveredPlaces: [], reflection: '', ...patch });
const journal = () => host.querySelector('[aria-label="Flight practice journal"]');
const notes = scope => host.querySelector(`[data-flight-notes-scope="${scope}"]`);

async function mount(seed = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'debrief', lastDebrief: flight(), railCollapsed: true, ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function chooseEarlier(index) {
  const select = journal().querySelector('#debrief-earlier-flight');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, String(index));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
    { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null; frameCallback = null;
  delete window.__RR_TEST_EXPORTS__; delete window.__testHooks;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('flight milestone and discovery journal records', () => {
  it('retains detached historical explanations and facts through repeated archive normalization', () => {
    const saved = flight({ flightNotes: [note()], discoveredPlaces: [place()], reflection: 'I used the coast as a landmark.' });
    const normalized = api.normalizeFlightPracticeRecord(saved);
    expect(normalized.flightNotes).toEqual([note()]); expect(normalized.discoveredPlaces).toEqual([place()]);
    expect(normalized.flightNotes[0]).not.toBe(saved.flightNotes[0]);
    expect(normalized.discoveredPlaces[0]).not.toBe(saved.discoveredPlaces[0]);
    const archived = api.archiveFlightPractice([], saved);
    expect(api.normalizeFlightPracticeHistory(archived)[0]).toMatchObject({ flightNotes: [note()], discoveredPlaces: [place()] });
    saved.flightNotes[0].message = 'Changed later'; saved.discoveredPlaces[0].fact = 'Changed later';
    expect(archived[0].flightNotes[0].message).toBe(note().message);
    expect(archived[0].discoveredPlaces[0].fact).toBe(place().fact);
  });

  it('whitelists own text records while leaving malformed saved values untouched', () => {
    const validNote = { ...note(), nested: { secret: true } }, validPlace = { ...place(), country: { bad: true }, nested: { secret: true } };
    const saved = flight({ flightNotes: [null, false, [], { title: 'Only a title' }, Object.create(note()), validNote],
      discoveredPlaces: [null, false, [], { name: 'Only a name' }, Object.create(place()), validPlace] });
    const normalized = api.normalizeFlightPracticeRecord(saved);
    expect(normalized.flightNotes).toEqual([note()]);
    expect(normalized.discoveredPlaces).toEqual([{ ...place(), country: '' }]);
    expect(validNote.nested).toEqual({ secret: true }); expect(validPlace.country).toEqual({ bad: true });
    expect(saved.flightNotes).toHaveLength(6); expect(saved.discoveredPlaces).toHaveLength(6);
  });

  it('bounds the retained counts and text without expanding nested save data', () => {
    const saved = flight({ flightNotes: Array.from({ length: 600 }, () => ({ title: 'T'.repeat(500), message: 'M'.repeat(5000), extra: [1, 2] })),
      discoveredPlaces: Array.from({ length: 600 }, () => ({ name: 'N'.repeat(500), fact: 'F'.repeat(5000), country: 'C'.repeat(500), extra: [3] })) });
    const normalized = api.normalizeFlightPracticeRecord(saved);
    expect(normalized.flightNotes).toHaveLength(64); expect(normalized.discoveredPlaces).toHaveLength(128);
    expect(normalized.flightNotes[0].title).toHaveLength(200); expect(normalized.flightNotes[0].message).toHaveLength(2000);
    expect(normalized.discoveredPlaces[0].name).toHaveLength(160); expect(normalized.discoveredPlaces[0].fact).toHaveLength(4000);
    expect(normalized.discoveredPlaces[0].country).toHaveLength(120);
    expect(normalized.flightNotes[0]).not.toHaveProperty('extra'); expect(normalized.discoveredPlaces[0]).not.toHaveProperty('extra');
    expect(saved.flightNotes).toHaveLength(600); expect(saved.flightNotes[0].message).toHaveLength(5000);
  });

  it('keeps legacy records valid without inventing notes or discoveries', () => {
    for (const malformed of [undefined, null, false, 'notes', { title: 'x' }, 4]) {
      const normalized = api.normalizeFlightPracticeRecord(flight({ flightNotes: malformed, discoveredPlaces: malformed }));
      expect(normalized.flightNotes).toEqual([]); expect(normalized.discoveredPlaces).toEqual([]);
    }
    expect(api.normalizeFlightMilestoneNotes([{ title: ' ', message: 'Text' }])).toEqual([]);
    expect(api.normalizeFlightDiscoveredPlaces([{ name: 'Place', fact: '\n ' }])).toEqual([]);
  });

  it('shows each selected earlier flight’s own notes and discoveries after reload', async () => {
    const earlierA = flight({ attemptId: 'earlier-a', flightNotes: [note('Earlier climb')], discoveredPlaces: [place('Earlier coast')] });
    const earlierB = flight({ attemptId: 'earlier-b', flightNotes: [note('Earlier approach')], discoveredPlaces: [place('Earlier valley')] });
    await mount({ lastDebrief: flight({ flightNotes: [note('Latest flight')], discoveredPlaces: [place('Latest city')] }), flightPracticeHistory: [earlierA, earlierB] });
    expect(notes('earlier').textContent).toContain('Earlier approach'); expect(notes('earlier').textContent).toContain('Earlier valley');
    expect(notes('earlier').textContent).not.toContain('Latest flight');
    await chooseEarlier(0);
    expect(notes('earlier').textContent).toContain('Earlier climb'); expect(notes('earlier').textContent).toContain('Earlier coast');
    expect(notes('earlier').textContent).not.toContain('Earlier valley');
    const saved = structuredClone(latest); await mount(saved);
    expect(notes('earlier').textContent).toContain('Earlier climb');
    expect(notes('latest').textContent).toContain('Latest flight');
    expect(latest.flightPracticeHistory).toEqual(saved.flightPracticeHistory);
  });

  it('archives the preceding flight’s notes when another flight finishes', async () => {
    const saved = flight({ flightNotes: [note('Saved lift observation')], discoveredPlaces: [place('Saved headland')] });
    await mount({ lastDebrief: saved });
    await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === '🛫 Fly Again').click());
    expect(latest.view).toBe('flying'); hooks().keysRef.current.escape = true;
    await act(async () => frameCallback());
    expect(latest.view).toBe('debrief');
    expect(latest.flightPracticeHistory[0]).toMatchObject({ flightNotes: [note('Saved lift observation')], discoveredPlaces: [place('Saved headland')] });
    expect(notes('earlier').textContent).toContain('Saved lift observation');
    expect(notes('earlier').textContent).toContain('Saved headland');
    expect(latest.lastDebrief.flightNotes).toEqual([]); expect(latest.lastDebrief.discoveredPlaces).toEqual([]);
  });

  it('keeps malformed legacy notes from rendering arbitrary objects or claiming observations', async () => {
    await mount({ lastDebrief: flight({ flightNotes: [null, { title: 'Invalid', message: {} }, note('Valid latest note')],
      discoveredPlaces: [null, { name: 'Invalid', fact: {} }, { ...place('Valid latest place'), country: {} }] }),
      flightPracticeHistory: [flight({ attemptId: 'legacy-earlier', flightNotes: 'not a list', discoveredPlaces: { name: 'Wrong shape' } })] });
    expect(notes('latest').textContent).toContain('Valid latest note'); expect(notes('latest').textContent).toContain('Valid latest place');
    expect(notes('latest').textContent).not.toMatch(/Invalid|\[object Object\]/);
    expect(notes('earlier')).toBeNull();
  });
});
