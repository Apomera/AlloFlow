import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let FS, tool, root, host, canvasRecords, waypointLength;
const flightState = lon => ({ altitude: 5000, fieldElev: 0, speed: 110 / 0.5924838,
  lat: 1, lon, heading: 90, vsi: 0, aoa: 5, onGround: false, stalling: false, lowAirspeed: false });
const row = (t, lon, patch = {}) => ({ t, lat: 1, lon, alt: 5000, spd: 110, hdg: 90, ...patch });

function context() {
  let path = [];
  return new Proxy({ strokes: [], fills: [], fillText: vi.fn(),
    setTransform() {}, fillRect() {}, measureText: text => ({ width: String(text).length * 6 }),
    clearRect() { this.strokes = []; this.fills = []; this.fillText.mockClear(); },
    beginPath() { path = []; },
    moveTo(x, y) { path.push({ type: 'move', x, y }); },
    lineTo(x, y) { path.push({ type: 'line', x, y }); },
    arc(x, y, radius) { path.push({ type: 'arc', x, y, radius }); },
    stroke() { this.strokes.push({ style: this.strokeStyle, points: structuredClone(path) }); },
    fill() { this.fills.push({ style: this.fillStyle, points: structuredClone(path) }); },
  }, { get: (target, key) => key === 'then' ? undefined : key in target ? target[key] : () => {} });
}

async function mount(samples) {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'debrief', lastDebrief: {
      aircraftId: 'cessna172', aircraft: 'Cessna 172 Skyhawk', airborneSeconds: 30,
      flightTime: 30, peakAGL: 1000, bestStableSeconds: 15, landings: 0,
      bestLanding: null, stallSeconds: 0, samples,
    } } });
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
  return canvasRecords.get(host.querySelector('canvas'));
}

beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); FS = window.__RR_TEST_EXPORTS__.flightSim;
  waypointLength = FS.WAYPOINTS.length; canvasRecords = new WeakMap();
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function() {
    return this.tagName === 'CANVAS' ? 500 : 0;
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function() {
    if (!canvasRecords.has(this)) canvasRecords.set(this, context());
    return canvasRecords.get(this);
  });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); host = null;
  if (FS) FS.WAYPOINTS.length = waypointLength;
  delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('SkySchool dateline evidence continuity', () => {
  it.each([
    ['eastbound', [179.99, 180.01], [179.99, -179.99]],
    ['westbound', [-179.99, -180.01], [-179.99, 179.99]],
  ])('retains and exports both actual %s capture observations after crossing the dateline', (direction, longitudes, expected) => {
    const states = longitudes.map(flightState), original = structuredClone(states);
    const samples = states.map((state, index) => FS.flightEvidenceSample(state, { pitch: 0, bank: 0, throttle: 0.6 }, index * 2));
    const normalized = FS.normalizeFlightEvidence(samples);
    expect(normalized).toHaveLength(2);
    normalized.forEach((sample, index) => expect(sample.lon).toBeCloseTo(expected[index], 9));
    const csvRows = FS.flightEvidenceCsv(samples).split('\n');
    expect(csvRows).toHaveLength(3);
    expect(csvRows.slice(1).map(line => Number(line.split(',')[2]))).toEqual(expected);
    expect(states).toEqual(original);
    // The two nearby places are one short crossing, not a lost observation.
    expect(FS.haversineNm(normalized[0].lat, normalized[0].lon, normalized[1].lat, normalized[1].lon)).toBeLessThan(1.3);
  });

  it.each([[180, -180], [-180, -180], [540, -180], [-540, -180], [720.25, 0.25], [-720.25, -0.25]])
    ('captures the canonical equivalent of longitude %s', (longitude, expected) => {
      expect(FS.flightEvidenceSample(flightState(longitude), {}, 0).lon).toBe(expected);
    });

  it('preserves ordinary coordinates and still rejects nonfinite capture and malformed saved coordinates', () => {
    const ordinary = flightState(-70.309);
    expect(FS.flightEvidenceSample(ordinary, {}, 0).lon).toBe(ordinary.lon);
    for (const lon of [NaN, Infinity, -Infinity, '180', null]) {
      expect(FS.flightEvidenceSample(flightState(lon), {}, 0)).toBeNull();
    }
    expect(FS.normalizeFlightEvidence([row(0, 180.01), row(2, -180.01), row(4, NaN), row(6, 0, { lat: 91 })])).toEqual([]);
  });

  it.each([
    ['eastbound', [179.98, 179.99, -180, -179.99, -179.98], [179.98, 179.99, 180, 180.01, 180.02]],
    ['westbound', [-179.98, -179.99, 180, 179.99, 179.98], [-179.98, -179.99, -180, -180.01, -180.02]],
  ])('projects a %s track along the short arc while preserving saved signed longitudes', (direction, longitudes, expected) => {
    const saved = longitudes.map((lon, index) => row(index * 2, lon));
    const original = structuredClone(saved), track = FS.getFlightEvidenceMapTrack(saved);
    expect(track.points).toHaveLength(5);
    track.points.forEach((point, index) => expect(point.mapLon).toBeCloseTo(expected[index], 9));
    expect(track.points.map(point => point.lon)).toEqual(longitudes);
    expect(track.segments.map(segment => segment.length)).toEqual([5]);
    expect(saved).toEqual(original);
  });

  it('keeps missing intervals separate, sorts valid rows, and does not retain invalid observations in map projection', () => {
    const track = FS.getFlightEvidenceMapTrack([row(22, -179.98), row(2, -179.99), row(0, 179.99), row(20, 180), row(3, 999)]);
    expect(track.points.map(point => point.t)).toEqual([0, 2, 20, 22]);
    expect(track.segments.map(segment => segment.map(point => point.t))).toEqual([[0, 2], [20, 22]]);
    track.points.forEach((point, index) => expect(point.mapLon).toBeCloseTo([179.99, 180.01, 180, 180.02][index], 9));
    expect(FS.getFlightEvidenceMapTrack(null)).toEqual({ points: [], segments: [] });
  });

  it.each([
    ['eastbound', [179.98, 179.99, -180, -179.99, -179.98], 1],
    ['westbound', [-179.98, -179.99, 180, 179.99, 179.98], -1],
  ])('renders the actual %s debrief trace as small continuous local steps', async (direction, longitudes, sign) => {
    const map = await mount(longitudes.map((lon, index) => row(index * 2, lon)));
    const traces = map.strokes.filter(trace => trace.style === '#4ade80');
    expect(traces).toHaveLength(1);
    expect(traces[0].points.map(point => point.type)).toEqual(['move', 'line', 'line', 'line', 'line']);
    const points = traces[0].points;
    const xs = points.map(point => point.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(25);
    for (let index = 1; index < points.length; index++) {
      expect((points[index].x - points[index - 1].x) * sign).toBeGreaterThan(0);
      expect(Math.abs(points[index].x - points[index - 1].x)).toBeLessThan(8);
    }
    const endpoints = map.fills.filter(fill => ['#22d3ee', '#ef4444'].includes(fill.style));
    expect(endpoints.map(fill => fill.points[0].x)).toEqual([points[0].x, points.at(-1).x]);
    expect(host.querySelector('[aria-label="Flight evidence explorer"]').querySelectorAll('table tbody tr')).toHaveLength(5);
  });

  it('draws a nearby waypoint across the dateline in the same local map window and omits a distant meridian', async () => {
    FS.WAYPOINTS.push({ id: 'dateline_test', name: 'Dateline test', code: 'DATE', lat: 1, lon: -179.95, alt: 0 },
      { id: 'meridian_test', name: 'Distant meridian', code: 'FAR', lat: 1, lon: 0, alt: 0 });
    const map = await mount([179.9, 179.95, 180, -179.95, -179.9].map((lon, index) => row(index * 2, lon)));
    const labels = map.fillText.mock.calls;
    expect(labels.some(([text]) => text === 'DATE')).toBe(true);
    expect(labels.some(([text]) => text === 'FAR')).toBe(false);
    const label = labels.find(([text]) => text === 'DATE');
    expect(label[1]).toBeGreaterThan(250); expect(label[1]).toBeLessThan(300);
  });

  it('retains the actual map gap policy across the dateline instead of inventing a bridge', async () => {
    const map = await mount([row(0, 179.98), row(2, 179.99), row(20, -179.99), row(22, -179.98), row(50, -179.97)]);
    const traces = map.strokes.filter(trace => trace.style === '#4ade80');
    expect(traces.map(trace => trace.points.map(point => point.type))).toEqual([
      ['move', 'line'], ['move', 'line'], ['move'],
    ]);
    expect(traces.every(trace => trace.points.every(point => point.x > 220 && point.x < 280))).toBe(true);
    expect(host.querySelector('[data-evidence-gap-note]').textContent).toContain('2 gaps');
  });
});
