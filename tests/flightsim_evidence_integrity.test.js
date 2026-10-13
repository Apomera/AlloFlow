import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let FS, tool, root, host, canvasRecords;
const row = (time = 0, patch = {}) => ({ t: time, lat: 43.646, lon: -70.309,
  alt: 5000, spd: 110, hdg: 90, agl: 4924, fpm: 0, aoa: 8,
  pitch: 0, bank: 0, throttle: 0.6, onGround: false, stalling: false, lowAirspeed: false, ...patch });
const state = aoa => ({ speed: 110 / 0.5924838, altitude: 5000,
  fieldElev: 76, vsi: 0, heading: 90, lat: 43.646, lon: -70.309,
  aoa, onGround: false, stalling: Math.abs(aoa) >= 15, lowAirspeed: false });

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
}
const explorer = () => host.querySelector('[aria-label="Flight evidence explorer"]');

function drawingContext() {
  let path = [];
  return new Proxy({
    strokes: [], fills: [],
    setTransform: vi.fn(), fillRect: vi.fn(),
    clearRect() { this.strokes = []; this.fills = []; this.fillText.mockClear(); },
    measureText: text => ({ width: String(text).length * 6 }),
    fillText: vi.fn(), setLineDash: vi.fn(),
    beginPath() { path = []; },
    moveTo(x, y) { path.push({ type: 'move', x, y }); },
    lineTo(x, y) { path.push({ type: 'line', x, y }); },
    arc(x, y, radius) { path.push({ type: 'arc', x, y, radius }); },
    closePath() { path.push({ type: 'close' }); },
    stroke() { this.strokes.push({ style: this.strokeStyle, points: structuredClone(path) }); },
    fill() { this.fills.push({ style: this.fillStyle, points: structuredClone(path) }); },
  }, { get: (target, key) => key in target ? target[key] : () => {} });
}

beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  canvasRecords = new WeakMap();
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function() {
    return this.tagName === 'CANVAS' ? 500 : 0;
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function() {
    if (!canvasRecords.has(this)) canvasRecords.set(this, drawingContext());
    return canvasRecords.get(this);
  });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); host = null;
  delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('SkySchool precise and chronological recorded evidence', () => {
  it.each([11.96, -11.96, 14.96, -14.96, 15.04])('preserves a measured AoA of %s without moving it across a flow boundary', aoa => {
    const sample = FS.flightEvidenceSample(state(aoa), {}, 2);
    expect(sample.aoa).toBe(aoa);
    expect(FS.Physics.aerodynamicState(sample.aoa).state).toBe(FS.Physics.aerodynamicState(aoa).state);
    expect(FS.normalizeFlightEvidence([sample])[0].aoa).toBe(aoa);
  });

  it('can find a normal-flow observation just below the warning boundary after a recorded stall', () => {
    const samples = [FS.flightEvidenceSample(state(16), {}, 0), FS.flightEvidenceSample(state(11.96), {}, 2)];
    expect(FS.flightEvidenceEvents(samples)).toEqual([
      { kind: 'stall', index: 0, referenceIndex: null },
      { kind: 'normal_after_stall', index: 1, referenceIndex: 0 },
    ]);
  });

  it('leaves unavailable, nonfinite, and rotor-aircraft AoA unknown', () => {
    for (const aoa of [undefined, null, NaN, Infinity, '11.96']) {
      expect(FS.flightEvidenceSample(state(aoa), {}, 2).aoa).toBeNull();
    }
    for (const capability of ['isHelicopter', 'isDrone']) {
      expect(FS.flightEvidenceSample(state(11.96), {}, 2, { [capability]: true }).aoa).toBeNull();
    }
  });

  it('retains the newest 500 valid timestamps after sorting an unsorted saved record', () => {
    const saved = Array.from({ length: 550 }, (_, index) => row(index * 2)).reverse();
    const original = structuredClone(saved);
    const normalized = FS.normalizeFlightEvidence(saved);
    expect(normalized).toHaveLength(500);
    expect(normalized[0].t).toBe(100);
    expect(normalized.at(-1).t).toBe(1098);
    expect(saved).toEqual(original);
  });

  it('does not let invalid tail rows evict usable earlier observations', () => {
    const saved = [...Array.from({ length: 500 }, (_, index) => row(index * 2)),
      ...Array.from({ length: 600 }, () => ({ t: 5000, alt: NaN }))];
    const normalized = FS.normalizeFlightEvidence(saved);
    expect(normalized).toHaveLength(500);
    expect(normalized[0].t).toBe(0);
    expect(normalized.at(-1).t).toBe(998);
  });

  it('uses the last valid row at each duplicate time and ignores an invalid later duplicate', () => {
    const saved = [row(2, { alt: 1000 }), row(0), row(2, { alt: 1200, aoa: 11.96 }), row(2, { alt: NaN })];
    expect(FS.normalizeFlightEvidence(saved)).toEqual([
      FS.normalizeFlightEvidence([saved[1]])[0],
      FS.normalizeFlightEvidence([saved[2]])[0],
    ]);
    expect(saved[0].alt).toBe(1000);
  });

  it('exports the saved angle before display rounding', () => {
    const csv = FS.flightEvidenceCsv([FS.flightEvidenceSample(state(11.96), {}, 2)]).split('\n');
    expect(csv[1].split(',')[8]).toBe('11.96');
  });
});

describe('SkySchool flight chart gaps', () => {
  it('sorts valid points into segments and breaks only gaps longer than four seconds', () => {
    const samples = [row(30), row(2), row(6), row(0), row(10.1), row(12.1), row(2), { t: 9, alt: NaN }];
    expect(FS.flightEvidenceSegments(samples).map(segment => segment.map(sample => sample.t)))
      .toEqual([[0, 2, 6], [10.1, 12.1], [30]]);
  });

  it('handles empty records and single retained moments without inventing a connecting line', () => {
    expect(FS.flightEvidenceSegments(null)).toEqual([]);
    expect(FS.flightEvidenceSegments([{ t: 0, alt: NaN }])).toEqual([]);
    expect(FS.flightEvidenceSegments([row(9)])).toEqual([[FS.normalizeFlightEvidence([row(9)])[0]]]);
  });

  it('draws both chart series as separate segments and explains unavailable intervals', async () => {
    await mount([row(0), row(2), row(20), row(22), row(50)]);
    const plot = explorer().querySelector('svg');
    for (const series of ['altitude', 'airspeed']) {
      const segments = [...plot.querySelectorAll('polyline[data-evidence-series="' + series + '"]')];
      expect(segments).toHaveLength(3);
      expect(segments.map(line => line.getAttribute('points').trim().split(' ').length)).toEqual([2, 2, 1]);
      expect(plot.querySelectorAll('circle[data-evidence-series="' + series + '"]')).toHaveLength(1);
    }
    expect(explorer().querySelector('[data-evidence-gap-note]').textContent).toContain('2 gaps');
    expect(explorer().textContent).toContain('conditions between those points were not recorded');
  });

  it('does not claim missing intervals for observations within the declared gap threshold', async () => {
    await mount([row(0), row(2), row(6)]);
    expect(explorer().querySelector('[data-evidence-gap-note]')).toBeNull();
    expect(explorer().querySelectorAll('polyline[data-evidence-series="altitude"]')).toHaveLength(1);
  });

  it('keeps the SVG, table, and observation selector usable when both legacy Canvas contexts are unavailable', async () => {
    HTMLCanvasElement.prototype.getContext.mockReturnValue(null);
    await mount([row(0), row(2), row(20), row(22), row(50, { alt: 6000 })]);
    expect(host.querySelectorAll('canvas')).toHaveLength(2);
    expect(explorer().querySelectorAll('polyline[data-evidence-series="altitude"]')).toHaveLength(3);
    expect(explorer().querySelectorAll('table tbody tr')).toHaveLength(5);
    const slider = explorer().querySelector('#debrief-observation-time');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, '4');
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(explorer().textContent).toContain('Observation 5 of 5 · 0:50.0');
    const altitude = [...explorer().querySelectorAll('dt')].find(item => item.textContent === 'Altitude · ft MSL');
    expect(altitude.parentElement.querySelector('dd').textContent).toBe('6,000 ft');
    const tableRegion = explorer().querySelector('[aria-label="Current flight observations"]');
    tableRegion.focus();
    expect(document.activeElement).toBe(tableRegion);
  });

  it('uses timestamp spacing and separate legacy Canvas trace and fill paths across missing intervals', async () => {
    await mount([
      row(0, { lon: -70.4, lat: 43.6, alt: 1000, spd: 100 }),
      row(2, { lon: -70.39, lat: 43.61, alt: 1100, spd: 101 }),
      row(20, { lon: -70.2, lat: 43.8, alt: 1400, spd: 102 }),
      row(22, { lon: -70.19, lat: 43.81, alt: 1500, spd: 103 }),
      row(50, { lon: -70, lat: 44, alt: 2000, spd: 110 }),
    ]);
    const canvases = [...host.querySelectorAll('canvas')];
    const mapContext = canvasRecords.get(canvases[0]);
    const profileContext = canvasRecords.get(canvases[1]);
    const mapTraces = mapContext.strokes.filter(trace => trace.style === '#4ade80');
    expect(mapTraces.map(trace => trace.points.map(point => point.type))).toEqual([
      ['move', 'line'], ['move', 'line'], ['move'],
    ]);
    expect(mapTraces[0].points[1].x).toBeLessThan(mapTraces[1].points[0].x);
    const pathXs = trace => trace.points.filter(point => point.type === 'move' || point.type === 'line').map(point => point.x);
    for (const style of ['#60a5fa', '#fbbf24']) {
      const traces = profileContext.strokes.filter(trace => trace.style === style);
      expect(traces.map(pathXs)).toEqual([[0, 20], [200, 220]]);
      const isolated = profileContext.fills.filter(fill => fill.style === style);
      expect(isolated).toHaveLength(1);
      expect(isolated[0].points).toEqual([expect.objectContaining({ type: 'arc', x: 500 })]);
    }
    const altitudeAreas = profileContext.fills.filter(fill => fill.style === 'rgba(96,165,250,0.15)');
    expect(altitudeAreas.map(pathXs)).toEqual([[0, 0, 20, 20], [200, 200, 220, 220]]);
    expect(mapContext.fillText.mock.calls.some(([text]) => text === '5 saved points · 0–50 s')).toBe(true);
    expect(mapContext.fillText.mock.calls.some(([text]) => String(text).includes('16 min'))).toBe(false);
  });

  it('marks rounded angle displays as approximate and keeps the raw angle available', async () => {
    await mount([row(0, { aoa: 11.96 })]);
    const label = [...explorer().querySelectorAll('dt')].find(item => item.textContent === 'Angle of attack');
    const value = label.parentElement.querySelector('dd');
    expect(value.textContent).toBe('≈12°');
    expect(value.querySelector('[title]').getAttribute('title')).toBe('11.96°');
    const tableAngle = explorer().querySelector('table tbody tr').children[4];
    expect(tableAngle.textContent).toBe('≈12°');
    expect(tableAngle.querySelector('[title]').getAttribute('title')).toBe('11.96°');
    expect(explorer().textContent).toContain('flow states and exported angles use the saved angle before rounding');
  });

  it('marks a rounded angle difference and exposes the saved subtraction', async () => {
    await mount([row(0, { aoa: 20 }), row(2, { aoa: 11.96 })]);
    const slider = explorer().querySelector('#debrief-observation-time');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, '1');
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const comparison = explorer().querySelector('[data-evidence-comparison]');
    expect(comparison.textContent).toContain('angle of attack ≈-8°');
    expect(Number(comparison.getAttribute('title').slice(0, -1))).toBe(11.96 - 20);
  });
});
