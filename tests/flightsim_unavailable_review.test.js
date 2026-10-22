import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, root, host, latest, setSaved, writes, xp, errors, downloads;
const row = (t = 0, patch = {}) => ({ t, lat: 43.646, lon: -70.309, alt: 1200, spd: 90, hdg: 90,
  agl: 1124, fpm: 0, aoa: 8, pitch: 0, bank: 0, throttle: .6, onGround: false, stalling: false, lowAirspeed: false, ...patch });
const flight = (patch = {}) => ({ attemptId: 'earlier-one', aircraftId: 'cessna172', activityId: 'free_flight',
  investigation: false, startedAirborne: false, flightTime: 30, sessionTime: 30, airborneSeconds: 30,
  reflection: 'Earlier explanation stays with its flight.', samples: [row(0), row(2, { aoa: 18, stalling: true, pitch: 10 }), row(4)],
  landings: 1, bestLanding: 120, touchdownAirportId: 'kpwm', ...patch });
const copy = value => JSON.parse(JSON.stringify(value));
const unavailable = () => host.querySelector('[data-flight-debrief-unavailable]');
const journal = () => host.querySelector('[aria-label="Flight practice journal"]');
function handler(node, event = 'onChange') { expect(node).toBeTruthy(); return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][event]; }
async function click(node) { expect(node).toBeTruthy(); await act(async () => node.click()); }
async function change(node, value) {
  expect(node).toBeTruthy(); const prototype = node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
async function mount(seed = {}, t) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, update] = React.useState({ flightSim: { view: 'debrief', aircraft: 'cessna172', lastDebrief: null,
      totalFlightTime: 900, debriefSampleIndex: 2, debriefCompareIndex: 1, debriefHistoryIndex: 0, debriefHistorySampleIndex: 0, ...seed } });
    latest = data.flightSim; setSaved = patch => update(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: update, ...(t ? { t } : {}), awardXP: (...args) => xp.push(args),
      update: (id, key, value) => { writes.push({ [key]: value }); update(old => ({ ...old, [id]: { ...old[id], [key]: value } })); },
      updateMulti: (id, patch) => { writes.push(patch); update(old => ({ ...old, [id]: { ...old[id], ...patch } })); },
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
function captureDownloads() {
  vi.stubGlobal('Blob', class { constructor(parts, options) { this.text = parts.join(''); this.type = options.type; } });
  const blobs = [];
  vi.stubGlobal('URL', { createObjectURL: blob => { blobs.push(blob); return 'blob:unavailable-' + blobs.length; }, revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { downloads.push({ name: this.download, blob: blobs.at(-1) }); });
}
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
  { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  writes = []; xp = []; downloads = []; errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Sky School unavailable saved flight review', () => {
  it.each([undefined, null, false, 0, '', true, [], {}, 'unreadable', { reflection: 'Unowned text.' }])('shows useful navigation instead of a loading trap or unsavable editor for %j', async saved => {
    await mount({ lastDebrief: saved });
    expect(unavailable()).toBeTruthy();
    expect(unavailable().querySelector('h2').textContent).toBe('Saved flight review unavailable');
    expect(unavailable().querySelector('[role="status"]').textContent).toContain('missing or cannot be read');
    expect(host.textContent).not.toContain('Loading SkySchool');
    expect(host.querySelector('textarea, [data-flight-log-status], [data-flight-stat], [data-flight-debrief-study]')).toBeNull();
    expect(host.querySelector('[data-flight-unavailable-menu]')).toBeTruthy(); expect(journal()).toBeNull();
    expect(latest.lastDebrief).toBe(saved); expect(writes).toHaveLength(0); expect(xp).toHaveLength(0);
  });
  it.each([{ aircraftId: 'cessna172' }, { flightTime: 0 }, { samples: [] }])('keeps valid sparse legacy reviews supported: %j', async saved => {
    await mount({ lastDebrief: saved });
    expect(unavailable()).toBeNull(); expect(host.querySelector('#debrief-evidence-explanation')).toBeTruthy();
    expect(latest.lastDebrief).toEqual(saved); expect(writes).toHaveLength(0);
  });
  it('does not migrate exercise-keyed notes into a wholly invalid latest record just because it contains a challenge object', async () => {
    const invalid = { challenge: api.createFlightChallenge('first_flight', {}) };
    await mount({ lastDebrief: invalid, challengeReflections: { first_flight: 'A legacy exercise note without a valid review owner.' } });
    expect(unavailable()).toBeTruthy(); expect(latest.lastDebrief).toEqual(invalid);
    expect(Object.prototype.hasOwnProperty.call(latest.lastDebrief, 'reflection')).toBe(false);
    expect(writes).toHaveLength(0);
  });
  it('browses retained earlier observations and exports their real evidence with JSON latest:null', async () => {
    const history = [flight(), flight({ attemptId: 'earlier-two', reflection: 'Second flight explanation.' })], invalid = { reflection: 'Do not create a new review from me.' };
    await mount({ lastDebrief: invalid, flightPracticeHistory: history }); captureDownloads();
    expect(journal()).toBeTruthy(); expect(journal().querySelector('[data-flight-comparison-metrics]')).toBeNull();
    expect(journal().querySelector('[data-flight-mission-comparison], [data-flight-challenge-comparison], [data-flight-sprint-comparison]')).toBeNull();
    expect(journal().querySelector('label[for="debrief-earlier-flight"]').textContent).toBe('Earlier recorded observations');
    await change(host.querySelector('#debrief-earlier-recorded-event'), 1);
    expect(host.querySelector('[data-earlier-observation-details]').textContent).toContain('Airborne; no stall');
    expect(host.querySelector('[data-flight-control-comparison="earlier"]')).toBeTruthy();
    await change(host.querySelector('#debrief-earlier-flight'), 1);
    expect(journal().textContent).toContain('Second flight explanation.');
    await click(host.querySelector('[data-flight-journal-export]'));
    const exported = JSON.parse(downloads[0].blob.text);
    expect(exported.latest).toBeNull(); expect(exported.earlier.map(record => record.attemptId)).toEqual(['earlier-one', 'earlier-two']);
    const csv = [...journal().querySelectorAll('button')].find(button => button.textContent.includes('Download earlier observations'));
    await click(csv); expect(downloads[1].blob.text).toBe(api.flightEvidenceCsv(history[1].samples, history[1]));
    expect(latest.lastDebrief).toEqual(invalid); expect(latest.flightPracticeHistory).toEqual(history);
    expect(latest.debriefSampleIndex).toBe(2); expect(latest.debriefCompareIndex).toBe(1); expect(latest.totalFlightTime).toBe(900);
    expect(host.querySelector('textarea')).toBeNull(); expect(xp).toHaveLength(0);
  });
  it('keeps earlier challenge and mission results read-only when there is no latest review to compare', async () => {
    const challenge = api.createFlightChallenge('energy_management', {}); challenge.objectives.glide = true;
    challenge.glideSnapshot = { altitude: 5000, airspeed: 110 };
    const first = flight({ attemptId: 'challenge', activityId: challenge.id, startedAirborne: true, challenge });
    const second = flight({ attemptId: 'mission', aircraftId: 'drone', activityId: 'drone_survey', mission: {
      missionId: 'drone_survey', mode: 'aerial', launchLat: 43, launchLon: -70, targets: [{ name: 'Photo target', lat: 43.1, lon: -70, captured: false }], elapsedSeconds: 12, battery: 80, completed: false, returned: false } });
    await mount({ flightPracticeHistory: [first, second] });
    expect(host.querySelector('[data-flight-challenge-summary="earlier"]').textContent).toContain('Glide snapshot: 5,000 ft at 110 kts');
    expect(journal().querySelector('textarea, [data-flight-debrief-study], #challenge-next-airport')).toBeNull();
    await change(host.querySelector('#debrief-earlier-flight'), 1);
    expect(host.querySelector('[data-flight-mission-summary="earlier"]').textContent).toContain('Photo target');
    expect(host.querySelector('[data-flight-mission-comparison]')).toBeNull(); expect(latest.lastDebrief).toBeNull();
  });
  it('uses native Menu navigation and permits a deliberate fresh flight without replacing or repairing raw invalid evidence', async () => {
    const invalid = { reflection: 'Unowned explanation.' }; await mount({ lastDebrief: invalid });
    await click(host.querySelector('[data-flight-unavailable-menu]'));
    expect(latest.view).toBe('menu'); expect(latest.lastDebrief).toEqual(invalid);
    await click(host.querySelector('[aria-label="Free Flight from Portland, ME"]'));
    expect(latest.view).toBe('flying'); expect(latest.flightPractice.record.activityId).toBe('free_flight');
    expect(latest.lastDebrief).toEqual(invalid); expect(latest.totalFlightTime).toBe(900); expect(xp).toHaveLength(0);
  });
  it('naturally replaces unavailable UI when a valid review arrives through late host hydration', async () => {
    await mount({ flightPracticeHistory: [flight()] }); const valid = flight({ attemptId: 'hydrated-latest', reflection: 'A valid hydrated explanation.' });
    await act(async () => setSaved({ lastDebrief: valid }));
    expect(unavailable()).toBeNull(); expect(host.querySelector('#debrief-evidence-explanation').value).toBe(valid.reflection);
    expect(host.querySelector('[data-flight-comparison-metrics]')).toBeTruthy(); expect(latest.lastDebrief).toEqual(valid);
    expect(writes).toHaveLength(0); expect(xp).toHaveLength(0);
  });
  it('rejects retained unavailable navigation handlers after a valid review is hydrated', async () => {
    await mount({ flightPracticeHistory: [flight(), flight({ attemptId: 'other' })] });
    const menu = handler(host.querySelector('[data-flight-unavailable-menu]'), 'onClick');
    const select = handler(host.querySelector('#debrief-earlier-flight')), range = handler(host.querySelector('#debrief-earlier-time'));
    const next = handler(host.querySelector('[data-earlier-observation-step="next"]'), 'onClick');
    const valid = flight({ attemptId: 'hydrated' }); await act(async () => setSaved({ lastDebrief: valid, debriefHistoryIndex: 1, debriefHistorySampleIndex: 1 }));
    await act(async () => { select({ target: { value: '0' } }); range({ target: { value: '2' } }); next(); menu(); });
    expect(latest.view).toBe('debrief'); expect(latest.lastDebrief).toEqual(valid);
    expect(latest.debriefHistoryIndex).toBe(1); expect(latest.debriefHistorySampleIndex).toBe(1); expect(writes).toHaveLength(0);
  });
  it('guards actual queued host hydration before old unavailable controls can change its view or evidence selection', async () => {
    await mount({ flightPracticeHistory: [flight(), flight({ attemptId: 'other' })] });
    const menu = handler(host.querySelector('[data-flight-unavailable-menu]'), 'onClick');
    const select = handler(host.querySelector('#debrief-earlier-flight')), range = handler(host.querySelector('#debrief-earlier-time'));
    const valid = flight({ attemptId: 'pending-valid' });
    await act(async () => {
      setSaved({ lastDebrief: valid, debriefHistoryIndex: 1, debriefHistorySampleIndex: 1 });
      select({ target: { value: '0' } }); range({ target: { value: '2' } }); menu();
    });
    expect(latest.view).toBe('debrief'); expect(latest.lastDebrief).toEqual(valid);
    expect(latest.debriefHistoryIndex).toBe(1); expect(latest.debriefHistorySampleIndex).toBe(1);
  });
  it('does not apply a former earlier attempt sample callback after another retained attempt is selected', async () => {
    await mount({ flightPracticeHistory: [flight(), flight({ attemptId: 'other' })] });
    const range = handler(host.querySelector('#debrief-earlier-time')), select = handler(host.querySelector('#debrief-earlier-flight'));
    await act(async () => { select({ target: { value: '1' } }); range({ target: { value: '2' } }); });
    expect(latest.debriefHistoryIndex).toBe(1); expect(latest.debriefHistorySampleIndex).toBe(0);
    await change(host.querySelector('#debrief-earlier-time'), 2); expect(latest.debriefHistorySampleIndex).toBe(2);
  });
  it('does not let an old unavailable callback change a replacement history and preserves records through remount', async () => {
    await mount({ flightPracticeHistory: [flight()] }); const range = handler(host.querySelector('#debrief-earlier-time'));
    const replacement = [flight({ attemptId: 'new-earlier', reflection: 'A different saved earlier flight.' })];
    await act(async () => { setSaved({ flightPracticeHistory: replacement, debriefHistorySampleIndex: 1 }); range({ target: { value: '2' } }); });
    expect(latest.debriefHistorySampleIndex).toBe(1); expect(latest.flightPracticeHistory).toEqual(replacement);
    const saved = copy(latest); await mount(saved); expect(unavailable()).toBeTruthy();
    expect(journal().textContent).toContain('A different saved earlier flight.'); expect(latest.flightPracticeHistory).toEqual(replacement);
  });
  it('uses the explicit unavailable title/body translation keys without introducing a loading or writable fallback', async () => {
    const dictionary = { 'stem.flightsim.debrief_unavailable_title': 'Título de revisión no disponible',
      'stem.flightsim.debrief_unavailable_body': 'La revisión guardada no está disponible.' };
    await mount({}, (key, fallback) => dictionary[key] || fallback);
    expect(unavailable().querySelector('h2').textContent).toBe(dictionary['stem.flightsim.debrief_unavailable_title']);
    expect(unavailable().querySelector('[role="status"]').textContent).toBe(dictionary['stem.flightsim.debrief_unavailable_body']);
    expect(host.querySelector('textarea')).toBeNull();
  });
});
