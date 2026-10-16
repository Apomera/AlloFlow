import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
});
const rects = layout => [
  { name: 'heading', x: layout.heading.x, y: layout.heading.y, w: layout.heading.w, h: layout.heading.h },
  { name: 'map', x: layout.map.x - 4, y: layout.map.y - 4, w: layout.map.size + 8, h: layout.map.size + 8 },
  { name: 'temperature', x: layout.auxiliary.x - 28, y: layout.auxiliary.y - 15, w: 56, h: 30 },
  { name: 'timer', x: layout.auxiliary.x - 28, y: layout.auxiliary.y - 42, w: 56, h: 22 },
  { name: 'weather', x: layout.atis.x, y: layout.atis.y, w: layout.atis.w, h: layout.atis.h },
  { name: 'speed', x: layout.speed.x, y: layout.speed.y, w: layout.speed.w, h: layout.speed.h + 12 },
  { name: 'altitude', x: layout.altitude.x, y: layout.altitude.y, w: layout.altitude.w, h: layout.altitude.h + 12 },
  { name: 'attitude', x: layout.horizon.x - layout.horizon.r, y: layout.horizon.y - layout.horizon.r - 5, w: layout.horizon.r * 2, h: layout.horizon.r * 2 + 5 },
  { name: 'VSI', x: layout.vsi.x - layout.vsi.r, y: layout.vsi.y - layout.vsi.r, w: layout.vsi.r * 2, h: layout.vsi.r * 2 },
  { name: 'G-force', x: layout.gForce.x, y: layout.gForce.y, w: 40, h: 30 },
];
describe('SkySchool readable cockpit instruments', () => {
  it.each([280, 320, 390, 599, 600, 800, 1280, 1920])('keeps all instruments visible and separate at %i CSS pixels', width => {
    for (const chase of [false, true]) {
      const height = 500;
      const layout = api.getFlightInstrumentLayout(width, height, chase);
      const instruments = rects(layout);
      for (const item of instruments) {
        expect(item.x, item.name).toBeGreaterThanOrEqual(0);
        expect(item.y, item.name).toBeGreaterThanOrEqual(0);
        expect(item.x + item.w, item.name).toBeLessThanOrEqual(width);
        expect(item.y + item.h, item.name).toBeLessThanOrEqual(height);
      }
      for (let first = 0; first < instruments.length; first++) {
        for (let second = first + 1; second < instruments.length; second++) {
          const a = instruments[first], b = instruments[second];
          const overlap = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
          expect(overlap, a.name + ' overlaps ' + b.name + ' in ' + (chase ? 'chase' : 'cockpit')).toBe(false);
        }
      }
      expect(layout.speed.w).toBeGreaterThanOrEqual(44);
      expect(layout.altitude.w).toBeGreaterThanOrEqual(55);
      expect(layout.horizon.r).toBeGreaterThanOrEqual(48);
      expect(layout.vsi.r).toBeGreaterThanOrEqual(25);
    }
  });
  it('reserves the same cockpit shelf below every primary flight instrument', () => {
    const cockpit = api.getFlightInstrumentLayout(320, 640, false);
    const chase = api.getFlightInstrumentLayout(320, 640, true);
    expect(chase.base - cockpit.base).toBe(42);
    for (const name of ['horizon', 'speed', 'altitude', 'vsi', 'gForce']) {
      expect(chase[name].x).toBe(cockpit[name].x);
      expect(chase[name].y - cockpit[name].y).toBe(42);
    }
  });
});
describe('SkySchool elapsed-time visual response', () => {
  it.each([0.8, 0.88])('settles identically at 30, 60, and 144 Hz with retention %f', retention => {
    const response = rate => {
      let value = 0;
      for (let frame = 0; frame < rate; frame++) value += (1 - value) * api.frameResponseBlend(retention, 1 / rate);
      return value;
    };
    expect(response(30)).toBeCloseTo(response(60), 12);
    expect(response(144)).toBeCloseTo(response(60), 12);
    expect(response(60)).toBeCloseTo(1 - Math.pow(retention, 60), 12);
  });
  it('holds camera and horizon response during a paused repaint', () => {
    expect(api.frameResponseBlend(0.8, 0)).toBe(0);
    expect(api.frameResponseBlend(0.88, 0)).toBe(0);
  });
});

let mountedRoot, mountedHost;
afterEach(async () => {
  if (mountedRoot) await React.act(async () => mountedRoot.unmount());
  mountedRoot = null; mountedHost?.remove(); mountedHost = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
});
async function drawFlight(width, chase, parked = false, altitudeOffset = parked ? 0 : 5 + Math.tan(3 * Math.PI / 180) * (1.5 * 6076.12 + 1000), config = {}) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.__testHooks = {};
  delete window.THREE;
  const commands = [];
  const context = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  }, { get: (target, property) => property in target ? target[property] : (...args) => commands.push({ method: property, args, stroke: context.strokeStyle, fill: context.fillStyle }),
    set: (target, property, value) => { target[property] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(performance, 'now').mockReturnValue(1000);
  let frame;
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frame = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  mountedHost = document.createElement('div'); document.body.appendChild(mountedHost);
  mountedRoot = ReactDOMClient.createRoot(mountedHost);
  const tool = window.StemLab._registry.flightSim;
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', thirdPerson: chase, takeoffTutorialDismissed: true, railCollapsed: true } });
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await React.act(async () => mountedRoot.render(React.createElement(App)));
  await React.act(async () => window.__testHooks.flightSim.startFlightChallenge('energy_management'));
  const canvas = mountedHost.querySelector('canvas[role="application"]');
  Object.defineProperty(canvas, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(canvas, 'clientHeight', { value: 500, configurable: true });
  const hooks = window.__testHooks.flightSim;
  const airport = api.WAYPOINTS[0];
  const runway = api.getFlightRunway(airport), end = runway.ends[0];
  const position = api.getFlightRunwayPosition(runway, 0, end.thresholdAlongFt - end.sign * (parked ? -150 : 1.5 * 6076.12));
  hooks.flightRef.current = { ...hooks.flightRef.current, ...position,
    altitude: airport.alt + altitudeOffset, fieldElev: airport.alt, speed: parked ? 0 : 140,
    heading: end.headingDeg, vsi: 0, onGround: parked, ...config.state };
  hooks.controlsRef.current = { throttle: 0.4, pitch: 0, bank: parked ? 25 : 0, flaps: 0, brake: 0, ...config.controls };
  expect(frame).toBeTypeOf('function');
  await React.act(async () => frame());
  return commands;
}
describe('SkySchool painted flight cues', () => {
  it.each([[320, false], [320, true], [800, false], [800, true]])('aligns approach needles with attitude and paints a visible VSI at width%i, chase%s', async (width, chase) => {
    const commands = await drawFlight(width, chase);
    const layout = api.getFlightInstrumentLayout(width, 500, chase);
    expect(commands.some(c => c.method === 'arc' && c.args[0] === layout.vsi.x && c.args[1] === layout.vsi.y && c.args[2] === layout.vsi.r)).toBe(true);
    expect(commands.some(c => c.method === 'translate' && c.args[0] === layout.horizon.x && c.args[1] === layout.horizon.y)).toBe(true);
    const starts = commands.filter(c => c.method === 'moveTo' && c.stroke === '#a855f7');
    const ends = commands.filter(c => c.method === 'lineTo' && c.stroke === '#a855f7');
    // On short phones the auxiliary stack yields if its measured top would
    // enter the 216px throttle/engine band; full-size decks retain the cluster.
    const auxiliaryFits = !layout.compact || layout.auxiliary.y - 42 >= 216;
    const oat = commands.filter(c => c.method === 'fillText' && String(c.args[0]).includes('°C OAT'));
    expect(oat).toHaveLength(auxiliaryFits ? 1 : 0);
    if (auxiliaryFits) expect(oat[0].args.slice(1)).toEqual([layout.auxiliary.x, layout.auxiliary.y + 2]);
    const runway = api.getFlightRunway(api.WAYPOINTS[0]);
    expect(commands.some(c => c.method === 'fillText' && c.args[0] === 'APP ' + runway.airport.code + ' ' + runway.ends[0].designator)).toBe(true);
    expect(starts).toHaveLength(2); expect(ends).toHaveLength(2);
    expect((starts[0].args[1] + ends[0].args[1]) / 2).toBeCloseTo(layout.horizon.y, 8);
    expect((starts[1].args[0] + ends[1].args[0]) / 2).toBeCloseTo(layout.horizon.x, 8);
  });
  it('paints the airport world before the cockpit instruments in Canvas mode', async () => {
    const commands = await drawFlight(800, false, true);
    const layout = api.getFlightInstrumentLayout(800, 500, false);
    const airportSurface = commands.findIndex(c => c.method === 'fill' && c.fill === '#30343b');
    const attitude = commands.findIndex(c => c.method === 'translate' && c.args[0] === layout.horizon.x && c.args[1] === layout.horizon.y);
    expect(airportSurface).toBeGreaterThanOrEqual(0);
    expect(attitude).toBeGreaterThan(airportSurface);
  });
  it('paints the parked chase aircraft above the airport and below the instruments', async () => {
    const commands = await drawFlight(800, true, true);
    const layout = api.getFlightInstrumentLayout(800, 500, true);
    const airportSurface = commands.findIndex(c => c.method === 'fill' && c.fill === '#30343b');
    const aircraft = commands.findIndex(c => c.method === 'translate' && c.args[0] === 400 && c.args[1] === 300);
    const attitude = commands.findIndex(c => c.method === 'translate' && c.args[0] === layout.horizon.x && c.args[1] === layout.horizon.y);
    expect(airportSurface).toBeGreaterThanOrEqual(0);
    expect(aircraft).toBeGreaterThan(airportSurface);
    expect(attitude).toBeGreaterThan(aircraft);
  });
  it.each([[320, 0], [800, 5000], [320, 20000]])('keeps altitude labels legible at width%i and altitude offset%i', async (width, offset) => {
    const commands = await drawFlight(width, false, offset === 0, offset);
    const tape = api.getFlightInstrumentLayout(width, 500, false).altitude;
    const labels = commands.filter(c => c.method === 'fillText' && c.args[1] === tape.x + 14 && /^\d+(\.\d+K)?$/.test(String(c.args[0])));
    expect(labels.length).toBeGreaterThan(1);
    const positions = labels.map(c => c.args[2]).sort((a, b) => a - b);
    for (let i = 0; i < positions.length; i++) {
      expect(positions[i] - 9).toBeGreaterThanOrEqual(tape.y);
      expect(positions[i]).toBeLessThanOrEqual(tape.y + tape.h);
      if (i) expect(positions[i] - positions[i - 1]).toBeGreaterThanOrEqual(31);
    }
  });
  it.each([[320, -30], [320, 30], [800, -30], [800, 30]])('fills the attitude sky and ground completely at width%i and pitch%i', async (width, pitch) => {
    const commands = await drawFlight(width, false, false, 300, { controls: { pitch } });
    const horizon = api.getFlightInstrumentLayout(width, 500, false).horizon;
    const start = commands.findIndex(c => c.method === 'translate' && c.args[0] === horizon.x && c.args[1] === horizon.y);
    const stop = commands.findIndex((c, i) => i > start && c.method === 'restore');
    const backgrounds = commands.slice(start, stop).filter(c => c.method === 'fillRect' && ['#1e40af', '#65a30d'].includes(c.fill));
    for (const y of [-horizon.r + 1, 0, horizon.r - 1]) {
      const covering = backgrounds.filter(c => c.args[0] <= 0 && c.args[0] + c.args[2] >= 0 && c.args[1] <= y && c.args[1] + c.args[3] >= y);
      expect(covering.length, 'Missing background at ' + y).toBeGreaterThan(0);
      expect(covering.at(-1).fill).toBe(y >= pitch * 2 ? '#65a30d' : '#1e40af');
    }
  });
  it('keeps the parked attitude indicator level while ailerons are deflected', async () => {
    const commands = await drawFlight(320, false, true);
    const layout = api.getFlightInstrumentLayout(320, 500, false);
    const horizonStart = commands.findIndex(c => c.method === 'translate' && c.args[0] === layout.horizon.x && c.args[1] === layout.horizon.y);
    expect(horizonStart).toBeGreaterThanOrEqual(0);
    expect(commands[horizonStart + 1].method).toBe('rotate');
    expect(Math.abs(commands[horizonStart + 1].args[0])).toBe(0);
  });
});

describe('SkySchool complete readable flight hints', () => {
  it.each(['STALL! Push S to lower the nose, then add power with Shift.', '速度を確認してゆっくり機首を上げてください'])('wraps every character of %s within its card', text => {
    const measure = value => Array.from(value).length * 6;
    const lines = api.wrapFlightHint(text, measure, 100);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join('').replace(/\s/g, '')).toBe(text.replace(/\s/g, ''));
    for (const line of lines) expect(measure(line)).toBeLessThanOrEqual(100);
  });
});
