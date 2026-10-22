import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, root, host, latest, frameCallback, wallTime, writes, xp, errors, downloads;
const hooks = () => window.__testHooks.flightSim;
const copy = value => JSON.parse(JSON.stringify(value));
const row = (t = 0) => ({ t, lat: 43.646, lon: -70.309, alt: 1200, spd: 90, hdg: 90,
  agl: 1124, fpm: 0, aoa: 8, pitch: 0, bank: 0, throttle: .6, onGround: false, stalling: false, lowAirspeed: false });
const flight = (patch = {}) => ({ attemptId: 'touchdown-current', aircraftId: 'cessna172', activityId: 'free_flight',
  investigation: false, startedAirborne: false, sessionTime: 30, flightTime: 20, airborneSeconds: 20,
  landings: 1, bestLanding: 120, touchdownAirportId: 'kpwm', samples: [row(0), row(2)],
  reflection: 'Use the recorded touchdown context.', endedAt: '2026-10-21T12:00:00.000Z', ...patch });
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
  writes = []; xp = []; downloads = []; errors = vi.spyOn(console, 'error').mockImplementation(() => {});
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
      takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])), ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: update, awardXP: (...args) => xp.push(args),
      update: (id, key, value) => { writes.push({ [key]: value }); update(old => ({ ...old, [id]: { ...old[id], [key]: value } })); },
      updateMulti: (id, patch) => { writes.push(patch); update(old => ({ ...old, [id]: { ...old[id], ...patch } })); },
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function click(node) { expect(node).toBeTruthy(); await act(async () => node.click()); }
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.includes(text));
async function start() {
  await click(host.querySelector('[aria-label="Free Flight from Portland, ME"]'));
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 1280 });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 720 });
  }
  Object.assign(hooks().getWeatherRef().current, { wind: 0, turbulence: 0, type: 'clear' });
}
async function frame() { wallTime += 100; expect(frameCallback).toBeTypeOf('function'); await act(async () => frameCallback()); }
function holdPhysics() {
  vi.spyOn(api.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: api.Physics.WEIGHT, weight: api.Physics.WEIGHT, thrust: 0, drag: 0 } }));
}
async function land(fpm, airportId = 'kpwm', crossFt = 0) {
  const airport = api.WAYPOINTS.find(item => item.id === airportId), runway = api.getFlightRunway(airport);
  const position = api.getFlightRunwayPosition(runway, crossFt, 0);
  Object.assign(hooks().flightRef.current, position, { altitude: airport.alt + 200, fieldElev: airport.alt,
    heading: runway.headingDeg, speed: 180, vsi: 0, onGround: false, stalling: false, lowAirspeed: false, groundContact: null });
  await frame();
  Object.assign(hooks().flightRef.current, position, { altitude: airport.alt, fieldElev: airport.alt,
    speed: 80, vsi: 0, onGround: true, groundContact: { vsi: -fpm / 60, speed: 80 } });
  await frame(); expect(hooks().getLandingRef().current.scored).toBe(true);
}
async function finish() { hooks().keysRef.current.escape = true; await frame(); expect(latest.view).toBe('debrief'); }
function captureDownloads() {
  vi.stubGlobal('Blob', class { constructor(parts, options) { this.text = parts.join(''); this.type = options.type; } });
  const blobs = [];
  vi.stubGlobal('URL', { createObjectURL: blob => { blobs.push(blob); return 'blob:touchdown-' + blobs.length; }, revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { downloads.push({ name: this.download, blob: blobs.at(-1) }); });
}

describe('Sky School best-touchdown journal context', () => {
  it('preserves exact known own airport identity with a recorded best touchdown, including zero and legacy unknown landing counts', () => {
    expect(api.normalizeFlightPracticeRecord(flight()).touchdownAirportId).toBe('kpwm');
    expect(api.normalizeFlightPracticeRecord(flight({ bestLanding: 0 })).touchdownAirportId).toBe('kpwm');
    const legacy = { aircraft: 'Cessna 172 Skyhawk', bestLanding: 140, touchdownAirportId: 'kden', samples: [] };
    expect(api.normalizeFlightPracticeRecord(legacy)).toMatchObject({ bestLanding: 140, landings: null, touchdownAirportId: 'kden' });
  });
  it.each([null, undefined, '', 'PWM', 'KPWM', 'removed', '__proto__', { id: 'kpwm' }, ['kpwm'], 1])('keeps invalid or unavailable airport IDs unknown: %j', id => {
    expect(api.normalizeFlightPracticeRecord(flight({ touchdownAirportId: id })).touchdownAirportId).toBeNull();
  });
  it('rejects inherited location claims and does not infer an airport from an approach, samples or other flight fields', () => {
    const inherited = Object.assign(Object.create({ touchdownAirportId: 'kpwm' }), flight()); delete inherited.touchdownAirportId;
    expect(api.normalizeFlightPracticeRecord(inherited).touchdownAirportId).toBeNull();
    const saved = flight({ touchdownAirportId: undefined, approachAirportId: 'kpwm', touchdownLat: 43.646, touchdownLon: -70.309, bestLandingAirportId: 'kpwm' });
    expect(api.normalizeFlightPracticeRecord(saved).touchdownAirportId).toBeNull();
  });
  it('clears location when the record has no usable best-touchdown evidence', () => {
    for (const patch of [{ landings: 0 }, { bestLanding: null }, { bestLanding: NaN }, { bestLanding: -1 }, { bestLanding: '120' }]) {
      expect(api.normalizeFlightPracticeRecord(flight(patch)).touchdownAirportId).toBeNull();
    }
  });
  it('keeps each attempt own best-touchdown location in canonical archive and detached complete journal exports', () => {
    const latestRecord = flight({ attemptId: 'newest', bestLanding: 90, touchdownAirportId: 'kden' });
    const previous = flight({ attemptId: 'previous', bestLanding: 120, touchdownAirportId: 'kpwm' });
    const before = copy([latestRecord, previous]);
    const history = api.archiveFlightPractice([], previous);
    const exported = api.createFlightPracticeJournalExport({ lastDebrief: latestRecord, flightPracticeHistory: history }, '2026-10-21T13:00:00.000Z');
    expect(history[0]).toMatchObject({ bestLanding: 120, touchdownAirportId: 'kpwm' });
    expect(exported.latest).toMatchObject({ bestLanding: 90, touchdownAirportId: 'kden' });
    expect(exported.earlier[0]).toMatchObject({ bestLanding: 120, touchdownAirportId: 'kpwm' });
    exported.earlier[0].touchdownAirportId = 'kjfk'; exported.latest.samples[0].alt = 9000;
    expect([latestRecord, previous]).toEqual(before); expect(history[0].touchdownAirportId).toBe('kpwm');
  });
  it('preserves a recorded location in a standard interruption checkpoint without fabricating unknown locations', () => {
    const make = record => ({ version: 1, attemptId: record.attemptId, recordedAt: '2026-10-21T12:00:00.000Z', record });
    const recovered = api.recoverFlightPracticeCheckpoint(make(flight()));
    expect(recovered).toMatchObject({ interrupted: true, bestLanding: 120, touchdownAirportId: 'kpwm' });
    expect(api.recoverFlightPracticeCheckpoint(make(flight({ touchdownAirportId: null }))).touchdownAirportId).toBeNull();
  });
  it('adds explicitly flight-level location context only for a verified record while keeping all telemetry columns unchanged', () => {
    const saved = flight(), plain = api.flightEvidenceCsv(saved.samples).split('\n'), withContext = api.flightEvidenceCsv(saved.samples, saved).split('\n');
    expect(withContext[0]).toBe(plain[0] + ',FlightBestTouchdownAirportId');
    expect(withContext.slice(1)).toEqual(plain.slice(1).map(line => line + ',kpwm'));
    expect(api.flightEvidenceCsv(saved.samples, flight({ touchdownAirportId: null }))).toBe(plain.join('\n'));
    expect(api.flightEvidenceCsv(saved.samples, flight({ touchdownAirportId: 'kden', landings: 0 }))).toBe(plain.join('\n'));
    expect(api.flightEvidenceCsv(saved.samples, { touchdownAirportId: 'kpwm' })).toBe(plain.join('\n'));
    expect(api.flightEvidenceCsv([], saved)).toBe(plain[0] + ',FlightBestTouchdownAirportId');
  });
  it('native finish, archive, reload and current/earlier downloads keep the airport tied to each attempt best touchdown', async () => {
    await mount(); await start(); holdPhysics();
    await land(120, 'kpwm'); await land(260, 'kden'); await finish();
    expect(latest.lastDebrief).toMatchObject({ landings: 2, bestLanding: 120, touchdownAirportId: 'kpwm' });
    expect(host.querySelector('[data-flight-debrief-headline]').textContent).toContain('Portland Intl Jetport');
    const firstAttempt = latest.lastDebrief.attemptId;
    await click(button('Fly Again'));
    await land(90, 'kden'); await finish();
    expect(latest.lastDebrief).toMatchObject({ bestLanding: 90, touchdownAirportId: 'kden' });
    expect(latest.flightPracticeHistory.at(-1)).toMatchObject({ attemptId: firstAttempt, bestLanding: 120, touchdownAirportId: 'kpwm' });
    const saved = copy(latest), xpBefore = xp.length; await mount(saved); captureDownloads();
    expect(host.querySelector('[data-flight-debrief-headline]').textContent).toContain('Denver International');
    await click(host.querySelector('[data-flight-journal-export]'));
    const exported = JSON.parse(downloads[0].blob.text);
    expect(exported.latest.touchdownAirportId).toBe('kden'); expect(exported.earlier.at(-1).touchdownAirportId).toBe('kpwm');
    await click(button('Download earlier observations (CSV)')); await click(button('Export Flight Data (CSV)'));
    expect(downloads[1].blob.text.split('\n')[0]).toContain('FlightBestTouchdownAirportId');
    expect(downloads[1].blob.text.split('\n').slice(1).every(line => line.endsWith(',kpwm'))).toBe(true);
    expect(downloads[2].blob.text.split('\n').slice(1).every(line => line.endsWith(',kden'))).toBe(true);
    expect(latest).toEqual(saved); expect(xp).toHaveLength(xpBefore);
  });
  it('keeps an off-airport best touchdown unknown after a later airport landing and exports no inferred location', async () => {
    await mount(); await start(); holdPhysics();
    await land(80, 'kpwm', 20000); await land(180, 'kden'); await finish();
    expect(latest.lastDebrief).toMatchObject({ landings: 2, bestLanding: 80, touchdownAirportId: null });
    expect(api.normalizeFlightPracticeRecord(latest.lastDebrief).touchdownAirportId).toBeNull();
    expect(host.querySelector('[data-flight-debrief-headline]').textContent).toContain('You touched down at 80 fpm.');
    expect(host.querySelector('[data-flight-debrief-headline]').textContent).not.toContain('Denver');
    captureDownloads(); await click(button('Export Flight Data (CSV)'));
    expect(downloads[0].blob.text).not.toContain('FlightBestTouchdownAirportId');
  });
  it('persists a native best-touchdown airport in the next evidence checkpoint and retains it through actual remount recovery', async () => {
    await mount({ totalFlightTime: 900 }); await start(); holdPhysics(); await land(120, 'kpwm');
    hooks().timeRef.current = 3; await frame();
    expect(latest.flightPractice.record).toMatchObject({ bestLanding: 120, touchdownAirportId: 'kpwm', landings: 1 });
    const saved = copy(latest), calls = api.Physics.step.mock.calls.length, xpBefore = xp.length;
    await mount(saved);
    expect(latest.view).toBe('debrief'); expect(latest.lastDebrief).toMatchObject({ interrupted: true, bestLanding: 120, touchdownAirportId: 'kpwm' });
    expect(host.querySelector('[data-flight-debrief-headline]').textContent).toContain('Portland Intl Jetport');
    expect(api.Physics.step.mock.calls.length).toBe(calls); expect(latest.totalFlightTime).toBe(900); expect(xp).toHaveLength(xpBefore);
  });
  it('shows a valid raw legacy airport in the existing headline without rewriting the save and clears invalid raw claims canonically', async () => {
    const legacy = { aircraft: 'Cessna 172 Skyhawk', bestLanding: 140, touchdownAirportId: 'kpwm', samples: [row(0)] };
    await mount({ view: 'debrief', lastDebrief: legacy });
    expect(host.querySelector('[data-flight-debrief-headline]').textContent).toContain('Portland Intl Jetport');
    expect(latest.lastDebrief).toEqual(legacy); expect(writes).toHaveLength(0);
    await mount({ view: 'debrief', lastDebrief: { ...legacy, touchdownAirportId: 'removed' } });
    expect(host.querySelector('[data-flight-debrief-headline]').textContent).toBe('You touched down at 140 fpm.');
    expect(writes).toHaveLength(0); expect(xp).toHaveLength(0);
  });
});
