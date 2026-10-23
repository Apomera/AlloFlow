import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const hooks = () => window.__testHooks.flightSim;
let FS, tool, host, root, nextFrame, wallTime, commands, path, errors, physicsSnapshot;

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab();
  window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  physicsSnapshot = Object.getOwnPropertyDescriptors(FS.Physics);
  commands = []; path = []; nextFrame = null; wallTime = 1000;
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const gfx = new Proxy({
    beginPath() { path = []; },
    arc(...args) { path.push({ method: 'arc', args }); },
    stroke() { commands.push({ method: 'stroke', path: path.map(item => ({ ...item, args: [...item.args] })),
      stroke: this.strokeStyle, lineWidth: this.lineWidth }); },
    fillText(text, x, y) { commands.push({ method: 'fillText', text: String(text), x, y,
      font: this.font, textAlign: this.textAlign, textBaseline: this.textBaseline }); },
    measureText: text => ({ width: Array.from(String(text)).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }, {
    get(target, key) { return key in target ? target[key] : () => {}; },
    set(target, key, value) { target[key] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(gfx);
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { if (callback.name === 'loop') nextFrame = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); host = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  for (const key of Reflect.ownKeys(FS.Physics)) if (!Object.hasOwn(physicsSnapshot, key)) delete FS.Physics[key];
  Object.defineProperties(FS.Physics, physicsSnapshot);
  delete window.__RR_TEST_EXPORTS__; delete window.__testHooks;
  vi.useRealTimers();
});

const mapCircle = layout => ({ x: layout.map.x + layout.map.size / 2,
  y: layout.map.y + layout.map.size / 2, r: layout.map.size / 2 + 4 });
// The map's radius+2 outer stroke is 4 px wide. The VSI's 2 px outer
// stroke extends 1 px beyond its nominal radius. Test the painted edges.
const vsiCircle = layout => ({ ...layout.vsi, r: layout.vsi.r + 1 });
const gap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
const circleRectGap = (circle, rect) => Math.hypot(
  circle.x - Math.max(rect.x, Math.min(rect.x + rect.w, circle.x)),
  circle.y - Math.max(rect.y, Math.min(rect.y + rect.h, circle.y))) - circle.r;

function expectClear(width, height, chase, stalling, layout, paintedMap = mapCircle(layout), paintedVsi = vsiCircle(layout)) {
  const context = `${width}×${height}, ${chase ? 'chase' : 'cockpit'}, stall=${stalling}`;
  expect(gap(paintedMap, paintedVsi), 'minimap/VSI painted-edge clearance: ' + context).toBeGreaterThanOrEqual(4);
  for (const [name, circle] of [['minimap', paintedMap], ['VSI', paintedVsi]]) {
    expect(circle.x - circle.r, name + ' left: ' + context).toBeGreaterThanOrEqual(0);
    expect(circle.y - circle.r, name + ' top: ' + context).toBeGreaterThanOrEqual(0);
    expect(circle.x + circle.r, name + ' right: ' + context).toBeLessThanOrEqual(width);
    expect(circle.y + circle.r, name + ' bottom: ' + context).toBeLessThanOrEqual(height);
    if (stalling) expect(circle.y - circle.r, name + ' must clear the urgent band: ' + context).toBeGreaterThanOrEqual(60);
  }
  expect(gap(paintedVsi, { ...layout.horizon, r: layout.horizon.r + 1 }), 'VSI/attitude clearance: ' + context).toBeGreaterThanOrEqual(4);
  for (const [name, rect] of [['heading', layout.heading], ['airspeed', layout.speed], ['altitude', layout.altitude]]) {
    expect(circleRectGap(paintedVsi, rect), 'VSI/' + name + ' clearance: ' + context).toBeGreaterThanOrEqual(0);
  }
  expect(layout.vsi.r, 'VSI must retain readable digits').toBeGreaterThanOrEqual(25);
  expect(layout.map.size, 'map must retain usable chart area').toBeGreaterThanOrEqual(64);
  expect(layout.horizon.r).toBeGreaterThanOrEqual(48);
  expect(layout.speed.w).toBeGreaterThanOrEqual(44);
  expect(layout.altitude.w).toBeGreaterThanOrEqual(55);
}

describe('short flight canvas minimap and vertical-speed clearance', () => {
  // The production preview uses a two-pixel frame and an 82-pixel shell:
  // 568×390 produces 566×308; 600×390 produces 598×308, while 602×390
  // crosses the 600 px instrument layout split.
  it.each([566, 598, 599, 600, 601, 698, 818])('keeps readable painted boundaries separate at canvas width %s', width => {
    for (const height of [308, 318]) for (const chase of [false, true]) for (const stalling of [false, true]) {
      expectClear(width, height, chase, stalling, FS.getFlightInstrumentLayout(width, height, chase, stalling));
    }
  });

  it('preserves established geometry when a 500 px canvas already has clearance', () => {
    for (const width of [280, 320, 390, 566, 598, 599, 600, 601, 800, 1280]) {
      for (const chase of [false, true]) for (const stalling of [false, true]) {
        const layout = FS.getFlightInstrumentLayout(width, 500, chase, stalling);
        const compact = width < 600, base = 500 - (chase ? 16 : 58);
        expect(layout.vsi).toEqual({ x: compact ? width - 39.5 : width / 2 + 180,
          y: compact ? base - 210 : base - 85, r: compact ? 25 : 30 });
        expect(layout.map).toEqual({ x: compact ? width - 104 : width - 140,
          y: stalling ? 66 : 38, size: compact ? 64 : 90 });
        expectClear(width, 500, chase, stalling, layout);
      }
    }
  });
});

async function mount(width, height, chase, { details = false } = {}) {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', thirdPerson: chase, railCollapsed: true, flightDetails: details,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.map(item => [item.id, true])) } });
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, value) => setData(old => ({ ...old, [id]: { ...old[id], ...value } })) }));
  }
  await act(async () => root.render(React.createElement(App)));
  const departure = host.querySelector('button[aria-label="Free Flight from Portland, ME"]');
  expect(departure).toBeTruthy(); await act(async () => departure.click());
  sizeCanvases(width, height);
  // Measured collapsed bounded-landscape rail geometry. This fixture does
  // not claim jsdom evaluates CSS or test physical pointer hit targets.
  const dock = host.querySelector('[data-flightsim-hud-dock]');
  for (const [key, value] of Object.entries({ offsetLeft: 88, offsetTop: 62, offsetWidth: 144, offsetHeight: 68 })) {
    Object.defineProperty(dock, key, { configurable: true, value });
  }
  Object.assign(hooks().getWeatherRef().current, { type: 'clear', wind: 0, turbulence: 0 });
  vi.spyOn(FS.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: FS.Physics.WEIGHT, weight: FS.Physics.WEIGHT, drag: 0, thrust: 0 } }));
}
function sizeCanvases(width, height) {
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: width });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: height });
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width, height, right: width, bottom: height });
  }
}
async function paint(width, height, chase, stalling) {
  Object.assign(hooks().flightRef.current, { lat: 43.646, lon: -70.309, altitude: 5000, fieldElev: 76,
    speed: 160, vsi: -30, heading: 0, onGround: false, aoa: stalling ? 20 : 8, stalling,
    lowAirspeed: false, hitCeiling: false });
  Object.assign(hooks().controlsRef.current, { throttle: 0.4, pitch: 0, bank: 0, yawRate: 0, brake: 0, flaps: 0 });
  commands.length = 0; path = []; wallTime += 100;
  expect(nextFrame).toBeTypeOf('function');
  await act(async () => nextFrame()); await act(async () => vi.advanceTimersByTimeAsync(60));
  expect(errors).not.toHaveBeenCalled();
  const layout = FS.getFlightInstrumentLayout(width, height, chase, stalling);
  const strokes = commands.filter(item => item.method === 'stroke');
  const fullCircle = item => item.path.find(part => part.method === 'arc' && part.args[3] === 0 && part.args[4] === Math.PI * 2);
  const mapRim = strokes.find(item => item.stroke === 'rgba(2,6,23,0.92)' && item.lineWidth === 4 && fullCircle(item));
  expect(mapRim, 'the actual minimap outer rim must be painted').toBeTruthy();
  const mapArc = fullCircle(mapRim).args;
  const vsiRim = strokes.find(item => item.stroke === '#f97316' && item.lineWidth === 2 && fullCircle(item)
    && fullCircle(item).args[2] >= 25);
  expect(vsiRim, 'the actual descending VSI outer rim must be painted').toBeTruthy();
  const vsiArc = fullCircle(vsiRim).args;
  expect(vsiArc.slice(0, 3)).toEqual([layout.vsi.x, layout.vsi.y, layout.vsi.r]);
  expect(mapArc.slice(0, 3)).toEqual([layout.map.x + layout.map.size / 2,
    layout.map.y + layout.map.size / 2, layout.map.size / 2 + 2]);
  const paintedMap = { x: mapArc[0], y: mapArc[1], r: mapArc[2] + mapRim.lineWidth / 2 };
  const paintedVsi = { x: vsiArc[0], y: vsiArc[1], r: vsiArc[2] + vsiRim.lineWidth / 2 };
  expectClear(width, height, chase, stalling, layout, paintedMap, paintedVsi);
  const digits = commands.find(item => item.method === 'fillText' && item.text === '1800'
    && item.x === paintedVsi.x && item.y === paintedVsi.y - 2);
  expect(digits, 'the vertical speed value must still be painted').toBeTruthy();
  expect(parseFloat(digits.font.replace(/^bold\s+/, ''))).toBeGreaterThanOrEqual(13);
  for (const [text, offset] of [['DN', 0.35], ['FPM', 0.55]]) {
    expect(commands.some(item => item.method === 'fillText' && item.text === text
      && item.x === paintedVsi.x && item.y === paintedVsi.y + layout.vsi.r * offset)).toBe(true);
  }
  expect(hooks().flightRef.current).toMatchObject({ stalling, vsi: -30, aoa: stalling ? 20 : 8 });
  return layout;
}

describe('actual short-canvas instrument painters', () => {
  it.each([566, 598, 600].flatMap(width => [false, true].flatMap(chase => [false, true].map(stalling => [width, chase, stalling]))))(
    'paints the full map and readable VSI without overlap at width%s, chase%s, stall%s', async (width, chase, stalling) => {
      await mount(width, 308, chase); await paint(width, 308, chase, stalling);
    });

  it('yields compact full wind details to the altitude tape even when the relocated VSI has horizontal clearance', async () => {
    await mount(598, 308, true, { details: true });
    Object.assign(hooks().getWeatherRef().current, { wind: 12, windDir: 123 });
    const layout = await paint(598, 308, true, true);
    const windBox = { x: layout.map.x + layout.map.size / 2 - 22.5,
      y: layout.map.y + layout.map.size + 32 - 22.5, w: 45, h: 57 };
    expect(circleRectGap(vsiCircle(layout), windBox)).toBeGreaterThanOrEqual(4);
    expect(windBox.x < layout.altitude.x + layout.altitude.w && windBox.x + windBox.w > layout.altitude.x
      && windBox.y < layout.altitude.y + layout.altitude.h && windBox.y + windBox.h > layout.altitude.y).toBe(true);
    expect(commands.some(item => item.method === 'fillText' && item.text === '123°')).toBe(false);
    expect(hooks().flightRef.current).toMatchObject({ stalling: true, aoa: 20 });
  });

  it('restores the established VSI position after resizing a short cockpit to 500 px and preserves warning clearance', async () => {
    await mount(598, 308, false);
    const short = await paint(598, 308, false, true);
    sizeCanvases(598, 500);
    const tall = await paint(598, 500, false, true);
    expect(tall.vsi).toEqual({ x: 558.5, y: 232, r: 25 });
    expect(short.vsi).not.toEqual(tall.vsi);
    sizeCanvases(598, 308);
    expect((await paint(598, 308, false, true)).vsi).toEqual(short.vsi);
  });

  it.each([[600, false, false], [818, true, true]])(
    'paints optional wind at short width%s, chase%s only when it clears the VSI (%s), and restores it on a taller canvas',
    async (width, chase, visible) => {
      await mount(width, 308, chase);
      Object.assign(hooks().getWeatherRef().current, { wind: 12, windDir: 123 });
      await paint(width, 308, chase, true);
      expect(commands.some(item => item.method === 'fillText' && item.text === '123°')).toBe(visible);
      sizeCanvases(width, 500);
      await paint(width, 500, chase, true);
      expect(commands.some(item => item.method === 'fillText' && item.text === '123°')).toBe(true);
    });
});
