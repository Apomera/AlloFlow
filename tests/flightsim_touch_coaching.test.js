import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const hooks = () => window.__testHooks.flightSim;
let FS, tool, host, reactRoot, frameCallback, errors, texts, paintedRects, wallTime;
let physicsSnapshot, coarsePointer, translations, context;
const flight = patch => ({ speed: 120, altitude: 76, fieldElev: 76, vsi: 0, heading: 0,
  lat: 43.646, lon: -70.309, onGround: true, aoa: 0,
  stalling: false, lowAirspeed: false, hitCeiling: false, ...patch });
const input = patch => ({ throttle: 0.7, pitch: 0, bank: 0, yawRate: 0, brake: 0, flaps: 0, ...patch });
const fontSize = font => Number(String(font).match(/(\d+(?:\.\d+)?)px/)?.[1] || 10);
const measure = (text, font) => Array.from(String(text)).length * fontSize(font) * 0.58;
const painted = color => texts.filter(item => item.fill === color);
const paintedText = color => painted(color).map(item => item.text).join(' ');

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab();
  window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  physicsSnapshot = Object.getOwnPropertyDescriptors(FS.Physics);
  texts = []; paintedRects = []; wallTime = 1000;
  coarsePointer = false; translations = {};
  vi.stubGlobal('matchMedia', vi.fn(query => ({
    matches: query === '(hover: none) and (pointer: coarse)' && coarsePointer,
    media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  })));
});
afterEach(async () => {
  if (reactRoot) await act(async () => reactRoot.unmount());
  reactRoot = null; host?.remove(); host = null; frameCallback = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  for (const key of Reflect.ownKeys(FS.Physics)) if (!Object.hasOwn(physicsSnapshot, key)) delete FS.Physics[key];
  Object.defineProperties(FS.Physics, physicsSnapshot);
  delete window.__RR_TEST_EXPORTS__; delete window.__testHooks;
  vi.useRealTimers();
});

async function mountFlight({ touch = false, width = 390, height = 640, ...patch } = {}) {
  coarsePointer = touch;
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  context = new Proxy({
    fillText(text, x, y, ...extra) {
      texts.push({ text: String(text), x, y, extra, font: context.font, fill: context.fillStyle });
    },
    roundRect(...args) { paintedRects.push({ args, fill: context.fillStyle }); },
    measureText: text => ({ width: measure(text, context.font) }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }, {
    get(target, key) { return key in target ? target[key] : () => {}; },
    set(target, key, value) { target[key] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => {
    if (callback.name === 'loop') frameCallback = callback;
    return 1;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div'); document.body.appendChild(host);
  reactRoot = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', railCollapsed: true,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.map(item => [item.id, true])), ...patch } });
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      t: (key, fallback) => translations[key] ?? fallback ?? key,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, value) => setData(old => ({ ...old, [id]: { ...old[id], ...value } })) }));
  }
  await act(async () => reactRoot.render(React.createElement(App)));
  const departure = host.querySelector('button[aria-label="Free Flight from Portland, ME"]');
  expect(departure).toBeTruthy();
  await act(async () => departure.click());
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: width });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: height });
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width, height, right: width, bottom: height });
  }
  const dock = host.querySelector('[data-flightsim-hud-dock]');
  for (const [key, value] of Object.entries({ offsetLeft: 8, offsetTop: 62, offsetWidth: 215, offsetHeight: 64 })) {
    Object.defineProperty(dock, key, { configurable: true, value });
  }
  Object.assign(hooks().getWeatherRef().current, { wind: 0, turbulence: 0 });
  // Hold the pose while production guidance, event gates, translation, and
  // drawing run. Physics and natural touchdown have separate behavior suites.
  vi.spyOn(FS.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: FS.Physics.WEIGHT, weight: FS.Physics.WEIGHT, drag: 0, thrust: 0 } }));
}
async function frame(state, controls) {
  if (state) Object.assign(hooks().flightRef.current, state);
  if (controls) Object.assign(hooks().controlsRef.current, controls);
  texts.length = 0; paintedRects.length = 0; wallTime += 100;
  expect(frameCallback).toBeTypeOf('function');
  await act(async () => frameCallback());
  expect(errors).not.toHaveBeenCalled();
}
async function rotate() {
  hooks().timeRef.current = 10;
  const vr = Math.round(FS.Physics.stallSpeed(76) * 0.5924838 * 1.1);
  await frame(flight({ speed: (vr + 1) / 0.5924838 }), input({ throttle: 1 }));
}
function final(patch = {}, agl = 20) {
  const airport = FS.WAYPOINTS.find(item => item.id === 'kpwm');
  const runway = FS.getFlightRunway(airport);
  const end = runway.ends[0];
  const position = FS.getFlightRunwayPosition(runway, 0, end.thresholdAlongFt - end.sign * 500, agl);
  return flight({ ...position, fieldElev: airport.alt, heading: end.headingDeg,
    onGround: false, vsi: -2, speed: 120, ...patch });
}
function touch(canvas, type, identifier, x, y) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'changedTouches', { value: [{ identifier, clientX: x, clientY: y }] });
  canvas.dispatchEvent(event);
}
const modes = [[false, 390, 640], [false, 1280, 720], [true, 390, 640], [true, 1280, 720]];

describe('input-aware takeoff and flare coaching', () => {
  it.each(modes)('uses the real input mode for first and held rotation (touch %s, %s by %s)', async (touch, width, height) => {
    await mountFlight({ touch, width, height });
    await rotate();
    const expected = touch ? 'ROTATE — drag up from center' : 'ROTATE — pitch up (W)';
    const cueTime = hooks().flightRef.current._callouts.vr;
    expect(cueTime).toBeGreaterThan(0);
    expect(paintedText('#fbbf24')).toContain(expected);
    if (touch) expect(paintedText('#fbbf24')).not.toContain('(W)');
    await frame();
    expect(paintedText('#fbbf24')).toContain(expected);
    expect(hooks().flightRef.current._callouts.vr).toBe(cueTime);
  });

  it.each([false, true])('updates a held rotation cue after input mode changes from touch %s', async touch => {
    await mountFlight({ touch }); await rotate();
    const cueTime = hooks().flightRef.current._callouts.vr;
    coarsePointer = !touch;
    await frame();
    expect(paintedText('#fbbf24')).toContain(touch ? 'ROTATE — pitch up (W)' : 'ROTATE — drag up from center');
    expect(hooks().flightRef.current._callouts.vr).toBe(cueTime);
  });

  it.each([false, true])('uses the translated rotation key on both frames for touch %s', async touch => {
    const translated = touch ? 'DÉCOLLAGE — glissez vers le haut' : 'DÉCOLLAGE — cabrez (W)';
    translations[`stem.flightsim.${touch ? 'hud_rotate_touch' : 'hud_rotate_keys'}`] = translated;
    await mountFlight({ touch }); await rotate();
    expect(paintedText('#fbbf24')).toContain(translated);
    await frame();
    expect(paintedText('#fbbf24')).toContain(translated);
  });

  it('wraps a translated phone rotation cue inside its reserved plate without squeezing the text', async () => {
    const translated = 'DÉCOLLAGE — faites glisser doucement vers le haut depuis le centre';
    translations['stem.flightsim.hud_rotate_touch'] = translated;
    await mountFlight({ touch: true }); await rotate();
    const plate = paintedRects.find(item => item.fill === 'rgba(2,6,23,0.75)' && item.args[3] === 54);
    expect(plate).toBeTruthy();
    const [x, y, width, height] = plate.args;
    const lines = painted('#fbbf24').filter(item => item.y >= y && item.y <= y + height);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.map(item => item.text).join(' ')).toBe(translated);
    for (const line of lines) {
      const halfWidth = measure(line.text, line.font) / 2;
      expect(line.extra).toEqual([]);
      expect(line.x - halfWidth).toBeGreaterThanOrEqual(x + 11);
      expect(line.x + halfWidth).toBeLessThanOrEqual(x + width - 11);
      expect(line.y - fontSize(line.font) / 2).toBeGreaterThanOrEqual(y + 2);
      expect(line.y + fontSize(line.font) / 2).toBeLessThanOrEqual(y + height - 2);
    }
  });

  it.each(modes)('uses the real input mode on runway flare (touch %s, %s by %s)', async (touch, width, height) => {
    await mountFlight({ touch, width, height }); hooks().timeRef.current = 10;
    await frame(final(), input());
    expect(paintedText('#a7f3d0')).toContain(touch ? 'FLARE — drag up from center' : 'FLARE — ease back on W');
    if (touch) expect(paintedText('#a7f3d0')).not.toContain(' on W');
  });

  it('wraps translated touch flare text in its phone plate without clipping or changing the condition', async () => {
    const translated = 'ARRONDI — glissez doucement vers le haut depuis le centre';
    translations['stem.flightsim.hud_flare_touch'] = translated;
    await mountFlight({ touch: true }); hooks().timeRef.current = 10;
    await frame(final(), input());
    const lines = painted('#a7f3d0');
    expect(lines.map(item => item.text).join(' ')).toBe(translated);
    expect(lines.length).toBeGreaterThan(1);
    const plate = paintedRects.find(item => item.fill === 'rgba(6,78,59,0.9)');
    expect(plate).toBeTruthy();
    const [x, y, width, height] = plate.args;
    for (const line of lines) {
      expect(line.extra).toEqual([]);
      expect(line.x - measure(line.text, line.font) / 2).toBeGreaterThanOrEqual(x + 7);
      expect(line.x + measure(line.text, line.font) / 2).toBeLessThanOrEqual(x + width - 7);
      expect(line.y - fontSize(line.font) / 2).toBeGreaterThanOrEqual(y + 4);
      expect(line.y + fontSize(line.font) / 2).toBeLessThanOrEqual(y + height - 4);
    }
  });

  it.each(['isHelicopter', 'isDrone'])('does not introduce fixed-wing rotation or flare for %s on touch', async kind => {
    const aircraft = FS.AIRCRAFT.find(item => item[kind]);
    expect(aircraft).toBeTruthy();
    await mountFlight({ touch: true, aircraft: aircraft.id }); await rotate();
    expect(texts.some(item => item.text.includes('ROTATE'))).toBe(false);
    await frame(final({ rotorForwardFps: 120 }), input());
    expect(texts.some(item => item.text.includes('FLARE'))).toBe(false);
  });

  it.each([{ stalling: true, aoa: 20 }, { lowAirspeed: true }])('preserves recovery priority over touch flare for %j', async warning => {
    await mountFlight({ touch: true }); hooks().timeRef.current = 10;
    await frame(final(warning), input());
    expect(paintedText('#a7f3d0')).not.toContain('FLARE');
    expect(texts.some(item => /STALL|LOW AIRSPEED/.test(item.text))).toBe(true);
  });

  it('the coached center upward drag raises pitch, while right-edge downward drag reduces power', async () => {
    await mountFlight({ touch: true });
    const canvas = host.querySelector('canvas[role="application"]');
    expect(canvas).toBeTruthy();
    Object.assign(hooks().controlsRef.current, input({ throttle: 0.7 }));
    await act(async () => {
      touch(canvas, 'touchstart', 1, 195, 320);
      touch(canvas, 'touchmove', 1, 195, 300);
    });
    expect(hooks().controlsRef.current.pitch).toBeGreaterThan(0);
    expect(hooks().controlsRef.current.bank).toBe(0);
    await act(async () => {
      touch(canvas, 'touchstart', 2, 380, 320);
      touch(canvas, 'touchmove', 2, 380, 400);
    });
    expect(hooks().controlsRef.current.throttle).toBeCloseTo(0.3);
  });
});

describe('input-aware native landing walkthrough', () => {
  it.each(modes)('keeps the walkthrough consistent with actual controls (touch %s, %s by %s)', async (touch, width, height) => {
    await mountFlight({ touch, width, height, landingTutorialDismissed: false });
    hooks().timeRef.current = 10;
    await frame(final({}, 264), input());
    const walkthrough = host.querySelector('[data-flight-walkthrough]');
    expect(walkthrough).toBeTruthy();
    await act(async () => walkthrough.querySelector('summary').click());
    expect(walkthrough.open).toBe(true);
    const power = walkthrough.querySelector('[data-flight-landing-power]');
    const flare = walkthrough.querySelector('[data-flight-landing-flare]');
    expect(power.textContent).toContain('~30%');
    expect(flare.textContent).toContain('~10 ft');
    expect(flare.textContent).toContain('200 fpm');
    if (touch) {
      expect(power.textContent).toContain('Drag down along the right edge');
      expect(flare.textContent).toContain('drag gently up from center');
      expect(power.querySelector('kbd')).toBeNull();
      expect(flare.querySelector('kbd')).toBeNull();
      expect(flare.textContent).toContain('less than 200 fpm');
    } else {
      expect(power.querySelector('kbd').textContent).toBe('−');
      expect(flare.querySelector('kbd').textContent).toBe('W');
      expect(power.textContent).toContain('Hold');
      expect(flare.textContent).toContain('gently pull');
    }
    expect(walkthrough.textContent).toContain('3° descent');
    expect(walkthrough.textContent).toContain('1.3 × stall speed');
    expect(walkthrough.querySelectorAll('ol > li')).toHaveLength(4);
    expect(errors).not.toHaveBeenCalled();
  });

  it('renders both complete translated touch steps without assembling English keyboard fragments', async () => {
    translations['stem.flightsim.landing_touch_power'] = 'Glissez vers le bas sur le bord droit pour réduire la puissance à ~30 %.';
    translations['stem.flightsim.landing_touch_flare'] = 'À ~10 ft, glissez doucement vers le haut au centre. Visez moins de 200 fpm.';
    await mountFlight({ touch: true, landingTutorialDismissed: false });
    await frame(final({}, 264), input());
    const power = host.querySelector('[data-flight-landing-power]');
    const flare = host.querySelector('[data-flight-landing-flare]');
    expect(power.textContent).toContain(translations['stem.flightsim.landing_touch_power']);
    expect(flare.textContent).toContain(translations['stem.flightsim.landing_touch_flare']);
    expect(power.textContent).not.toContain('Hold');
    expect(flare.textContent).not.toContain('gently pull');
    expect(power.querySelector('kbd')).toBeNull();
    expect(flare.querySelector('kbd')).toBeNull();
  });
});
