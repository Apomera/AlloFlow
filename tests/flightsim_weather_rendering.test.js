import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_flightsim.js', 'utf8');
const weatherStart = source.indexOf('      var drawWeatherEffects = function(');
const weatherEnd = source.indexOf('      // The fallback uses the same fixed airport axis', weatherStart);
if (weatherStart < 0 || weatherEnd < 0) throw new Error('Production weather closure was not found');
const weatherClosure = source.slice(weatherStart, weatherEnd);
const stormStart = source.indexOf('      var drawDistantStorms = function(');
const stormEnd = source.indexOf('      // ── Draw terrain perspective ──', stormStart);
if (stormStart < 0 || stormEnd < 0) throw new Error('Production distant-storm closure was not found');
const stormClosure = source.slice(stormStart, stormEnd);
const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, reactRoot, frameCallback, wallTime, errors, commands, renderer, resize;
const WIDTH = 640, HEIGHT = 480;
const rgba = text => /^rgba\(([^)]+)\)$/.exec(text)?.[1].split(',').map(Number);
const legacyDawn = 12 - Math.acos(0.2) * 12 / Math.PI;
const boundaries = [5, 6, legacyDawn, 24 - legacyDawn, 18, 19];
const wrappedDelta = (a, b, width = WIDTH) => ((b - a + width * 1.5) % width) - width / 2;
const luma = color => color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722;

beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
});
afterEach(async () => {
  if (reactRoot) await React.act(async () => reactRoot.unmount());
  reactRoot = null; host?.remove(); host = null; frameCallback = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  delete window.THREE; delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
});

function drawingContext(target, canvas = null) {
  let path = [];
  const saved = [];
  const context = new Proxy({
    globalAlpha: 1, globalCompositeOperation: 'source-over',
    save() { saved.push({ fillStyle: context.fillStyle, strokeStyle: context.strokeStyle,
      lineWidth: context.lineWidth, globalAlpha: context.globalAlpha, globalCompositeOperation: context.globalCompositeOperation }); },
    restore() { Object.assign(context, saved.pop() || {}); },
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: (...args) => ({ kind: 'linear', args, stops: [], addColorStop(offset, color) { this.stops.push([offset, color]); } }),
    createRadialGradient: (...args) => ({ kind: 'radial', args, stops: [], addColorStop(offset, color) { this.stops.push([offset, color]); } }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    beginPath() { path = []; },
    moveTo(...args) { path.push({ method: 'moveTo', args }); },
    lineTo(...args) { path.push({ method: 'lineTo', args }); },
    arc(...args) { path.push({ method: 'arc', args }); },
    ellipse(...args) { path.push({ method: 'ellipse', args }); },
    fill() { target.push({ method: 'fill', path: [...path], fill: context.fillStyle, alpha: context.globalAlpha, canvas }); },
    stroke() { target.push({ method: 'stroke', path: [...path], stroke: context.strokeStyle,
      width: context.lineWidth, alpha: context.globalAlpha, canvas }); },
  }, {
    get: (object, property) => property in object ? object[property] : (...args) => target.push({ method: property, args,
      fill: context.fillStyle, stroke: context.strokeStyle, width: context.lineWidth, alpha: context.globalAlpha, canvas }),
    set: (object, property, value) => { object[property] = value; return true; },
  });
  return context;
}

function drawWeather({ windDir = 90, heading = 0, wind = 30, time = 1, hour = 12,
  type = 'stormy', visibility = 0.4, speed = 85, altitude = 1000,
  reducedMotion = false, thirdPerson = false, bank = 0, pitch = 0, view, conditions } = {}) {
  const wx = conditions || { type, visibility, windDir, wind, turbulence: 0 };
  const state = { lon: 0, lat: 43, altitude, heading, speed };
  const result = [];
  const frame = api.getFlightLightingFrame(hour);
  const rawBrightness = Math.max(0, Math.cos((hour - 12) / 12 * Math.PI));
  const dayNight = { solarHour: hour, brightness: frame.brightness,
    isNight: rawBrightness < 0.2, isDusk: rawBrightness >= 0.2 && rawBrightness < 0.4 };
  // Execute the production closure, preserving its actual Canvas drawing commands.
  // The solar helper is the exported production helper, not a copied weather model.
  const draw = runInNewContext(weatherClosure + '\n drawWeatherEffects;', {
    weatherRef: { current: wx }, getFlightLightingFrame: api.getFlightLightingFrame,
    getFlightCelestialFrame: api.getFlightCelestialFrame, skyReducedMotion: { current: reducedMotion },
    getFlightPrecipitationFrame: api.getFlightPrecipitationFrame,
    getFlightRainVelocity: api.getFlightRainVelocity, getFlightLightningPulse: api.getFlightLightningPulse,
    getDayNight: () => dayNight, Math, Number,
  });
  draw(drawingContext(result), WIDTH, HEIGHT, 220, time, state, dayNight,
    { view: view || api.getFlightViewBasis(heading, pitch, bank), thirdPerson });
  return result;
}
const line = command => command.method === 'stroke' && command.path.length === 2
  && command.path[0].method === 'moveTo' && command.path[1].method === 'lineTo';
const background = result => result.filter(command => line(command) && command.width === 1);
const foreground = result => result.filter(command => line(command) && command.width === 1.25);
const strokeVector = command => [command.path[1].args[0] - command.path[0].args[0], command.path[1].args[1] - command.path[0].args[1]];
const haze = result => result.find(command => command.method === 'fillRect' && typeof command.fill === 'string'
  && command.args[0] === 0 && command.args[1] === 0 && command.args[2] === WIDTH && command.args[3] === HEIGHT);
const curtain = result => result.find(command => command.method === 'fillRect' && command.fill?.kind === 'linear'
  && command.fill.stops.some(([, color]) => color.startsWith('rgba(115,145,175,')));
const droplets = result => result.filter(command => command.method === 'fill'
  && command.path.length === 1 && command.path[0].method === 'ellipse' && command.path[0].args[2] === 2
  && typeof command.fill === 'string' && command.fill.startsWith('rgba(180,210,240,'));
const frost = result => result.filter(command => command.method === 'fillRect'
  && typeof command.fill === 'string' && command.fill.startsWith('rgba(200,220,240,'));
const flashes = result => result.filter(command => command.method === 'fillRect'
  && command.args[0] === 0 && command.args[1] === 0 && command.args[2] >= WIDTH && command.args[3] >= HEIGHT
  && typeof command.fill === 'string' && command.fill.startsWith('rgba(255,255,255,') && rgba(command.fill)?.[3] > 0);
const bolts = result => result.filter(command => command.method === 'stroke' && typeof command.stroke === 'string'
  && command.stroke.startsWith('rgba(200,220,255,'));
const lightningPeak = 2 + 14 * 49297 / 233280;
const paintSnapshot = result => JSON.parse(JSON.stringify(result));

function rainMotion(options, selector = background, delta = 0.01) {
  const a = selector(drawWeather(options)), b = selector(drawWeather({ ...options, time: (options.time ?? 1) + delta }));
  expect(a.length).toBeGreaterThan(0); expect(b).toHaveLength(a.length);
  return a.map((command, index) => ({ command,
    vx: wrappedDelta(command.path[0].args[0], b[index].path[0].args[0]) / delta,
    vy: wrappedDelta(command.path[0].args[1], b[index].path[0].args[1], HEIGHT) / delta }));
}

describe('SkySchool weather motion follows cockpit wind', () => {
  it.each([{ windDir: 90, sign: -1 }, { windDir: 270, sign: 1 }])(
    'moves rain away from a wind from $windDir degrees', ({ windDir, sign }) => {
      for (const { command, vx, vy } of rainMotion({ windDir })) {
        expect(Math.sign(vx)).toBe(sign); expect(vx).toBeCloseTo(sign * 150, 8);
        expect(vy).toBeCloseTo(900, 8); expect(Math.sign(strokeVector(command)[0])).toBe(sign);
      }
    });
  it('reverses the apparent crosswind when the pilot turns the cockpit through 180 degrees', () => {
    const forward = rainMotion({ windDir: 90, heading: 0 });
    const reverse = rainMotion({ windDir: 90, heading: 180 });
    expect(forward).toHaveLength(reverse.length);
    for (let index = 0; index < forward.length; index++) {
      expect(reverse[index].vx).toBeCloseTo(-forward[index].vx, 8);
      expect(reverse[index].vy).toBeCloseTo(forward[index].vy, 8);
      expect(strokeVector(reverse[index].command)[0]).toBeCloseTo(-strokeVector(forward[index].command)[0], 8);
    }
  });
  it.each(['stormy', 'overcast'])('keeps %s precipitation vertical in calm wind', type => {
    for (const selector of type === 'stormy' ? [background, foreground] : [background]) {
      for (const { command, vx, vy } of rainMotion({ type, wind: 0 }, selector)) {
        expect(vx).toBeCloseTo(0, 10); expect(vy).toBeGreaterThan(0);
        expect(strokeVector(command)[0]).toBeCloseTo(0, 10);
      }
    }
  });
  it.each([{ type: 'stormy', windDir: 90 }, { type: 'stormy', windDir: 270 },
    { type: 'overcast', windDir: 90 }, { type: 'overcast', windDir: 270 }])(
    'aligns particle travel and stroke slope for $type wind from $windDir', options => {
      const groups = options.type === 'stormy' ? [background, foreground] : [background];
      for (const selector of groups) for (const { command, vx, vy } of rainMotion(options, selector)) {
        const [dx, dy] = strokeVector(command);
        expect(dy).toBeGreaterThan(0);
        expect(dx / dy).toBeCloseTo(vx / vy, 8);
      }
      const bg = rainMotion(options)[0];
      expect(Math.abs(bg.vx)).toBeCloseTo(options.type === 'stormy' ? 150 : 90, 8);
      if (options.type === 'stormy') {
        const fg = rainMotion(options, foreground)[0];
        expect(fg.vx).toBeCloseTo(bg.vx * 1.8, 8); expect(fg.vy).toBeCloseTo(1300, 8);
      }
    });
  it('wraps negative rain motion through the left edge without losing or reversing particles', () => {
    const time = WIDTH / 150 - 0.005;
    const before = background(drawWeather({ windDir: 90, time }));
    const after = background(drawWeather({ windDir: 90, time: time + 0.01 }));
    expect(before).toHaveLength(80); expect(after).toHaveLength(80);
    expect(before[0].path[0].args[0]).toBeLessThan(1);
    expect(after[0].path[0].args[0]).toBeGreaterThan(WIDTH - 1);
    for (const rain of [...before, ...after]) {
      expect(rain.path[0].args[0]).toBeGreaterThanOrEqual(0);
      expect(rain.path[0].args[0]).toBeLessThan(WIDTH);
    }
    expect(wrappedDelta(before[0].path[0].args[0], after[0].path[0].args[0])).toBeCloseTo(-1.5, 8);
  });
  it.each([{ windDir: 90, sign: 1 }, { windDir: 270, sign: -1 }])(
    'aligns foreground droplet tilt with wind from $windDir', ({ windDir, sign }) => {
      const drops = droplets(drawWeather({ windDir })); expect(drops).toHaveLength(15);
      for (const drop of drops) {
        const angle = drop.path[0].args[4];
        expect(Math.sign(angle)).toBe(sign);
        expect(angle).toBeCloseTo(Math.atan2(sign * 150, 900), 10);
      }
    });
  it('projects gravity through bank and pitch, keeping streaks aligned with particles even when inverted', () => {
    for (const { bank, pitch } of [{ bank: -35, pitch: 20 }, { bank: 35, pitch: -20 }, { bank: 90, pitch: 0 }, { bank: 135, pitch: 15 }]) {
      const view = api.getFlightViewBasis(0, pitch, bank);
      for (const [selector, gravity] of [[background, 900], [foreground, 1300]]) {
        // A world-down vector projects onto the actual view's right/up axes.
        // This expected direction does not call the production rain helper.
        const expected = [-gravity * view.right.y, gravity * view.up.y];
        for (const { command, vx, vy } of rainMotion({ bank, pitch, wind: 0 }, selector)) {
          expect(vx).toBeCloseTo(expected[0], 7); expect(vy).toBeCloseTo(expected[1], 7);
          const [dx, dy] = strokeVector(command), cross = dx * vy - dy * vx;
          expect(Math.abs(cross)).toBeLessThan(1e-6); expect(dx * vx + dy * vy).toBeGreaterThan(0);
          expect(command.path[0].args[0]).toBeGreaterThanOrEqual(0); expect(command.path[0].args[0]).toBeLessThan(WIDTH);
          expect(command.path[0].args[1]).toBeGreaterThanOrEqual(0); expect(command.path[0].args[1]).toBeLessThan(HEIGHT);
        }
      }
      const dropsA = droplets(drawWeather({ bank, pitch, wind: 0, time: 1 }));
      const dropsB = droplets(drawWeather({ bank, pitch, wind: 0, time: 1.01 }));
      expect(dropsA).toHaveLength(15); expect(dropsB).toHaveLength(dropsA.length);
      for (let index = 0; index < dropsA.length; index++) {
        const a = dropsA[index].path[0].args, b = dropsB[index].path[0].args;
        const vx = wrappedDelta(a[0], b[0]) / 0.01, vy = wrappedDelta(a[1], b[1], HEIGHT) / 0.01;
        const longAxis = [-Math.sin(a[4]), Math.cos(a[4])];
        expect(Math.hypot(vx, vy)).toBeGreaterThan(0);
        expect((vx * longAxis[0] + vy * longAxis[1]) / Math.hypot(vx, vy)).toBeCloseTo(1, 9);
      }
    }
  });
  it('moves windshield droplets continuously across the former one-third-second teleport boundary', () => {
    const before = droplets(drawWeather({ time: 1 / 3 - 0.0001 }));
    const after = droplets(drawWeather({ time: 1 / 3 + 0.0001 }));
    expect(before).toHaveLength(15); expect(after).toHaveLength(before.length);
    for (let index = 0; index < before.length; index++) {
      const a = before[index].path[0].args, b = after[index].path[0].args;
      expect(Math.abs(wrappedDelta(a[0], b[0]))).toBeLessThan(1);
      expect(Math.abs(wrappedDelta(a[1], b[1], HEIGHT))).toBeLessThan(1);
      expect(a[4]).toBeCloseTo(b[4], 12);
    }
  });
});

describe('SkySchool precipitation volume and viewing mode', () => {
  it.each([{ type: 'overcast', base: 6000, top: 12000 }, { type: 'stormy', base: 12000, top: 25000 }])(
    'fades %s rain and curtain to zero above its weather volume', ({ type, base, top }) => {
      const low = drawWeather({ type, altitude: base }), middle = drawWeather({ type, altitude: (base + top) / 2 });
      const high = drawWeather({ type, altitude: top + 1, time: lightningPeak });
      const rainAlpha = result => rgba(background(result)[0]?.stroke || 'rgba(0,0,0,0)')[3];
      expect(rainAlpha(low)).toBeGreaterThan(0); expect(rainAlpha(middle)).toBeGreaterThan(0);
      expect(rainAlpha(middle)).toBeLessThan(rainAlpha(low));
      expect(curtain(low)).toBeTruthy(); expect(curtain(middle)).toBeTruthy();
      expect(rgba(curtain(middle).fill.stops.at(-1)[1])[3]).toBeLessThan(rgba(curtain(low).fill.stops.at(-1)[1])[3]);
      for (const selector of [background, foreground, droplets, frost, flashes, bolts]) expect(selector(high)).toHaveLength(0);
      expect(curtain(high)).toBeUndefined(); expect(haze(high)).toBeTruthy();
      for (const altitude of [base, top]) {
        const a = drawWeather({ type, altitude: altitude - 0.01 }), b = drawWeather({ type, altitude: altitude + 0.01 });
        expect(Math.abs(rainAlpha(a) - rainAlpha(b))).toBeLessThan(0.0001);
      }
    });
  it('removes the abrupt visibility-haze jump at 5000 feet', () => {
    const low = rgba(haze(drawWeather({ altitude: 4999.99 })).fill)[3];
    const high = rgba(haze(drawWeather({ altitude: 5000.01 })).fill)[3];
    expect(low).toBeGreaterThanOrEqual(high); expect(Math.abs(low - high)).toBeLessThan(0.00001);
    expect(rgba(haze(drawWeather({ altitude: 1000 })).fill)[3]).toBeGreaterThan(rgba(haze(drawWeather({ altitude: 10000 })).fill)[3]);
  });
  it('keeps rain in chase view while excluding windshield droplets and frost', () => {
    const cockpit = drawWeather({ altitude: 15000 }), chase = drawWeather({ altitude: 15000, thirdPerson: true });
    expect(droplets(cockpit).length).toBeGreaterThan(0); expect(frost(cockpit).length).toBeGreaterThan(0);
    expect(droplets(chase)).toHaveLength(0); expect(frost(chase)).toHaveLength(0);
    expect(background(chase).length).toBeGreaterThan(0); expect(curtain(chase)).toBeTruthy(); expect(haze(chase)).toBeTruthy();
  });
  it('suppresses moving rain and a verified lightning peak under reduced motion while retaining static weather', () => {
    expect(api.getFlightLightningPulse(lightningPeak)).toBeGreaterThan(0.99);
    const live = drawWeather({ altitude: 15000, time: lightningPeak });
    expect(flashes(live)).toHaveLength(1); expect(bolts(live)).toHaveLength(1);
    expect(rgba(flashes(live)[0].fill)[3]).toBeGreaterThan(0); expect(rgba(flashes(live)[0].fill)[3]).toBeLessThanOrEqual(0.08);
    const still = drawWeather({ altitude: 15000, time: lightningPeak, reducedMotion: true });
    for (const selector of [background, foreground, droplets, flashes, bolts]) expect(selector(still)).toHaveLength(0);
    expect(haze(still)).toBeTruthy(); expect(curtain(still)).toBeTruthy(); expect(frost(still)).toHaveLength(3);
    expect(paintSnapshot(drawWeather({ altitude: 15000, time: lightningPeak + 100, reducedMotion: true }))).toEqual(paintSnapshot(still));
    const chase = drawWeather({ altitude: 15000, time: lightningPeak, reducedMotion: true, thirdPerson: true });
    expect(frost(chase)).toHaveLength(0); expect(curtain(chase)).toBeTruthy(); expect(haze(chase)).toBeTruthy();
  });
  it('repaints a held weather time identically without mutating the weather inputs', () => {
    const options = { altitude: 15000, time: lightningPeak, windDir: 90, bank: 35, pitch: -10 };
    const before = drawWeather(options), after = drawWeather(options);
    expect(paintSnapshot(after)).toEqual(paintSnapshot(before)); expect(background(before).length).toBeGreaterThan(0); expect(flashes(before)).toHaveLength(1);
    const conditions = { type: 'overcast', visibility: 0.7, windDir: 90, wind: 10, turbulence: 0 }, saved = { ...conditions };
    drawWeather({ conditions, time: 22 }); expect(conditions).toEqual(saved);
  });
  it('holds distant storm cells and their rain shafts still under reduced motion with no internal flash', () => {
    function distant(time, reducedMotion) {
      const result = [];
      const draw = runInNewContext(stormClosure + '\n drawDistantStorms;', { Math, Number, skyReducedMotion: { current: reducedMotion } });
      draw(drawingContext(result), WIDTH, HEIGHT, 220, { lat: 45, lon: 0, altitude: 8000 }, time, { isNight: false, solarHour: 12 });
      return result;
    }
    const still = distant(0, true);
    expect(still.some(command => command.method === 'fill' && command.fill === 'rgba(220,220,225,0.55)')).toBe(true);
    expect(still.some(command => command.method === 'stroke' && command.stroke === 'rgba(80,90,110,1)')).toBe(true);
    for (const time of [60, 123, 999]) {
      const result = distant(time, true); expect(result).toEqual(still);
      expect(result.some(command => command.fill === 'rgba(255,255,230,0.6)' || command.stroke === 'rgba(255,255,255,0.9)')).toBe(false);
    }
    expect(distant(60, false)).not.toEqual(distant(0, false));
    const liveFlash = distant(31.75, false);
    expect(liveFlash.some(command => command.fill === 'rgba(255,255,230,0.6)')).toBe(true);
    expect(liveFlash.some(command => command.stroke === 'rgba(255,255,255,0.9)')).toBe(true);
    expect(distant(31.75, true)).toEqual(still);
  });
});

describe('SkySchool weather exposure follows continuous daylight', () => {
  it('keeps nighttime haze dark without changing the visibility opacity', () => {
    const day = rgba(haze(drawWeather({ hour: 12 })).fill), night = rgba(haze(drawWeather({ hour: 0 })).fill);
    expect(day.slice(0, 3)).toEqual([180, 190, 200]);
    expect(night.slice(0, 3)).toEqual([26, 38, 56]);
    expect(night[3]).toBeCloseTo(day[3], 12); expect(day[3]).toBeGreaterThan(0);
    expect(luma(night)).toBeLessThan(luma(day) * 0.25);
  });
  it('dims distant rain, foreground rain, droplets, and the rain curtain together at night', () => {
    const day = drawWeather({ hour: 12 }), night = drawWeather({ hour: 0 });
    for (const selector of [background, foreground]) {
      const a = selector(day), b = selector(night); expect(b).toHaveLength(a.length);
      for (let index = 0; index < a.length; index++) {
        expect(rgba(b[index].stroke)[3]).toBeCloseTo(rgba(a[index].stroke)[3] * 0.24, 12);
        expect(rgba(b[index].stroke)[3]).toBeGreaterThan(0);
      }
    }
    expect(droplets(night)).toHaveLength(15);
    expect(rgba(droplets(night)[0].fill)[3]).toBeCloseTo(rgba(droplets(day)[0].fill)[3] * 0.24, 12);
    const a = curtain(day), b = curtain(night); expect(a).toBeTruthy(); expect(b).toBeTruthy();
    expect(rgba(b.fill.stops.at(-1)[1])[3]).toBeCloseTo(rgba(a.fill.stops.at(-1)[1])[3] * 0.24, 12);
  });
  it.each(boundaries)('has no weather illumination jump around solar hour %s', hour => {
    const a = drawWeather({ hour: hour - 0.00001 }), b = drawWeather({ hour: hour + 0.00001 });
    const colorsA = [rgba(haze(a).fill), rgba(background(a)[0].stroke), rgba(foreground(a)[0].stroke),
      rgba(droplets(a)[0].fill), rgba(curtain(a).fill.stops.at(-1)[1])];
    const colorsB = [rgba(haze(b).fill), rgba(background(b)[0].stroke), rgba(foreground(b)[0].stroke),
      rgba(droplets(b)[0].fill), rgba(curtain(b).fill.stops.at(-1)[1])];
    for (let index = 0; index < colorsA.length; index++) {
      expect(colorsA[index]).toHaveLength(4); expect(colorsB[index]).toHaveLength(4);
      for (let channel = 0; channel < 4; channel++) expect(Math.abs(colorsA[index][channel] - colorsB[index][channel])).toBeLessThan(0.01);
    }
  });
  it('leaves clear weather free of a haze wash or precipitation', () => {
    const result = drawWeather({ type: 'clear', visibility: 1, hour: 12 });
    expect(haze(result)).toBeUndefined(); expect(background(result)).toHaveLength(0);
    expect(foreground(result)).toHaveLength(0); expect(droplets(result)).toHaveLength(0);
    expect(curtain(result)).toBeUndefined();
  });
});

function setSolarHour(hooks, hour) {
  hooks.timeRef.current = ((hour - 12 - hooks.flightRef.current.lon / 15 + 48) % 24) * 100;
}
async function mountFlight(webgl, { thirdPerson = false, reducedMotion = false, altitude = 76,
  speed = 0, bank = 0, pitch = 0, paused = false } = {}) {
  commands = []; wallTime = 1000; frameCallback = null; resize = false;
  const contexts = new WeakMap();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function() {
    if (!contexts.has(this)) contexts.set(this, drawingContext(commands, this));
    return contexts.get(this);
  });
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('AlloPostFXEnabled', false);
  vi.stubGlobal('matchMedia', query => ({ media: query, matches: reducedMotion && query.includes('prefers-reduced-motion'),
    addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  renderer = { domElement: {}, shadowMap: {}, capabilities: { getMaxAnisotropy: () => 1 },
    setSize() {}, setPixelRatio() {}, dispose() {}, getContext: () => ({ isContextLost: () => false }),
    render: vi.fn((scene, camera) => { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }) };
  if (webgl) window.THREE = { ...Three, WebGLRenderer: function() { return renderer; } };
  host = document.createElement('div'); document.body.appendChild(host); reactRoot = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', thirdPerson, flightDetails: false,
      railCollapsed: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])) } });
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await React.act(async () => reactRoot.render(React.createElement(App)));
  await React.act(async () => window.__testHooks.flightSim.startFlightChallenge('first_flight'));
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { value: 1280, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 720, configurable: true });
  }
  const hooks = window.__testHooks.flightSim;
  Object.assign(hooks.getWeatherRef().current, { wind: 0, windDir: 90, turbulence: 0, visibility: 0.4, type: 'stormy' });
  Object.assign(hooks.flightRef.current, { altitude, fieldElev: 76, onGround: altitude <= 76, speed, bank });
  Object.assign(hooks.controlsRef.current, { throttle: 0, pitch, bank });
  hooks.pausedRef.current = paused;
  // Keep physics deterministic while actual production RAF, camera, weather, and HUD render.
  vi.spyOn(api.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: api.Physics.WEIGHT, weight: api.Physics.WEIGHT, drag: 0, thrust: 0 } }));
  return hooks;
}
async function draw({ repaint = false } = {}) {
  if (repaint) {
    resize = !resize;
    for (const canvas of host.querySelectorAll('canvas')) Object.defineProperty(canvas, 'clientWidth', {
      value: resize ? 1282 : 1280, configurable: true,
    });
  }
  commands.length = 0; wallTime += 16;
  expect(frameCallback).toBeTypeOf('function');
  await React.act(async () => frameCallback());
  expect(errors).not.toHaveBeenCalled();
  return commands.filter(command => command.canvas && host.contains(command.canvas));
}

describe('SkySchool cockpit remains above the weather layer', () => {
  it.each([{ webgl: false, hour: 12 }, { webgl: false, hour: 0 },
    { webgl: true, hour: 12 }, { webgl: true, hour: 0 }])(
    'paints weather before cockpit instruments with WebGL $webgl at hour $hour', async ({ webgl, hour }) => {
      const hooks = await mountFlight(webgl); setSolarHour(hooks, hour);
      const result = await draw();
      if (webgl) expect(renderer.render).toHaveBeenCalled();
      else expect(renderer.render).not.toHaveBeenCalled();
      const instrument = result.findIndex(command => command.method === 'fillText' && command.args[0] === 'IAS');
      expect(instrument).toBeGreaterThan(0);
      const frame = api.getFlightLightingFrame(((hooks.flightRef.current.lon / 15 + 12 + hooks.timeRef.current * 0.01) % 24 + 24) % 24);
      const light = 0.24 + frame.daylight * 0.76;
      const rain = background(result).filter(command => typeof command.stroke === 'string'
        && command.stroke.startsWith('rgba(150,180,220,'));
      expect(rain).toHaveLength(80);
      for (const command of rain) {
        expect(rgba(command.stroke)[3]).toBeCloseTo(0.35 * light, 10);
        expect(result.indexOf(command)).toBeLessThan(instrument);
      }
      const wash = result.find(command => command.method === 'fillRect' && command.args[0] === 0 && command.args[1] === 0
        && command.args[2] === 1280 && command.args[3] === 720 && typeof command.fill === 'string'
        && rgba(command.fill)?.[3] > 0.3 && rgba(command.fill)?.[3] < 0.4);
      expect(wash).toBeTruthy();
      const observed = rgba(wash.fill);
      for (let channel = 0; channel < 3; channel++) {
        const night = [26, 38, 56][channel], day = [180, 190, 200][channel];
        expect(observed[channel]).toBeCloseTo(night + (day - night) * frame.daylight, 8);
      }
      expect(result.indexOf(wash)).toBeLessThan(instrument);
      // Other optical weather paint also precedes the IAS plate, not just the haze wash.
      const nearRain = foreground(result).filter(command => typeof command.stroke === 'string'
        && command.stroke.startsWith('rgba(205,225,245,'));
      expect(nearRain).toHaveLength(20);
      for (const command of nearRain) expect(result.indexOf(command)).toBeLessThan(instrument);
      const rainCurtain = curtain(result); expect(rainCurtain).toBeTruthy();
      expect(result.indexOf(rainCurtain)).toBeLessThan(instrument);
    });
  it.each([{ webgl: false, thirdPerson: false }, { webgl: false, thirdPerson: true },
    { webgl: true, thirdPerson: false }, { webgl: true, thirdPerson: true }])(
    'uses the actual banked view and keeps glass effects in the cockpit with WebGL $webgl and chase $thirdPerson', async ({ webgl, thirdPerson }) => {
      const hooks = await mountFlight(webgl, { thirdPerson, altitude: 15000, speed: 85, bank: 35, pitch: 15, paused: true });
      hooks.timeRef.current = lightningPeak; const result = await draw({ repaint: true });
      const rain = background(result).filter(command => typeof command.stroke === 'string' && command.stroke.startsWith('rgba(150,180,220,'));
      expect(rain.length).toBeGreaterThan(0); expect(curtain(result)).toBeTruthy(); expect(flashes(result)).toHaveLength(1);
      expect(droplets(result)).toHaveLength(thirdPerson ? 0 : 15); expect(frost(result)).toHaveLength(thirdPerson ? 0 : 3);
      const [dx, dy] = strokeVector(rain[0]); expect(Math.abs(dx)).toBeGreaterThan(0.01);
      if (webgl) {
        expect(renderer.render).toHaveBeenCalled(); const [, camera] = renderer.render.mock.calls.at(-1);
        const matrix = camera.matrixWorld.elements, projectedGravity = [-matrix[1], matrix[5]];
        const cosine = (dx * projectedGravity[0] + dy * projectedGravity[1]) / (Math.hypot(dx, dy) * Math.hypot(...projectedGravity));
        expect(cosine).toBeCloseTo(1, 10);
      } else expect(renderer.render).not.toHaveBeenCalled();
      const instrument = result.findIndex(command => command.method === 'fillText' && command.args[0] === 'IAS');
      expect(instrument).toBeGreaterThan(0);
      for (const command of [...rain, ...droplets(result), ...frost(result), ...flashes(result), curtain(result)]) {
        expect(result.indexOf(command)).toBeLessThan(instrument);
      }
    });
  it.each([false, true])('holds paused reduced-motion weather stable with WebGL %s, including a scheduled flash peak', async webgl => {
    const hooks = await mountFlight(webgl, { reducedMotion: true, altitude: 15000, speed: 85, paused: true });
    hooks.timeRef.current = lightningPeak;
    const weatherPaint = result => {
      const farRain = background(result).filter(command => typeof command.stroke === 'string' && command.stroke.startsWith('rgba(150,180,220,'));
      expect(farRain).toHaveLength(0); expect(foreground(result).filter(command => typeof command.stroke === 'string'
        && command.stroke.startsWith('rgba(205,225,245,'))).toHaveLength(0);
      expect(droplets(result)).toHaveLength(0); expect(flashes(result)).toHaveLength(0); expect(bolts(result)).toHaveLength(0);
      expect(frost(result)).toHaveLength(3); expect(curtain(result)).toBeTruthy();
      const wash = result.find(command => command.method === 'fillRect' && typeof command.fill === 'string'
        && command.args[0] === 0 && command.args[1] === 0 && command.args[3] === 720
        && rgba(command.fill)?.[3] > 0.2 && rgba(command.fill)?.[3] < 0.4);
      expect(wash).toBeTruthy();
      return [wash.fill, ...curtain(result).fill.stops.map(([, color]) => color), ...frost(result).map(command => command.fill)];
    };
    const first = weatherPaint(await draw({ repaint: true }));
    const time = hooks.timeRef.current, state = JSON.stringify(hooks.flightRef.current), renders = renderer.render.mock.calls.length;
    await draw(); expect(renderer.render.mock.calls.length).toBe(renders);
    expect(hooks.timeRef.current).toBe(time); expect(JSON.stringify(hooks.flightRef.current)).toBe(state);
    expect(weatherPaint(await draw({ repaint: true }))).toEqual(first);
    expect(hooks.timeRef.current).toBe(time); expect(JSON.stringify(hooks.flightRef.current)).toBe(state);
  });
});
