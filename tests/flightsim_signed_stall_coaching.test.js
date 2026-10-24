import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const hooks = () => window.__testHooks.flightSim;
let FS, tool, host, root, callback, wallTime, errors, texts, paintedTexts, physicsSnapshot, step;
let coarsePointer, translations, translationCalls;
const flight = patch => ({ lat: 43.646, lon: -70.309, altitude: 5000, fieldElev: 76,
  speed: 160, vsi: 0, heading: 0, onGround: false, aoa: 0, stalling: false,
  lowAirspeed: false, hitCeiling: false, ...patch });
const input = patch => ({ throttle: 0.4, pitch: 0, bank: 0, yawRate: 0, brake: 0, flaps: 0, ...patch });
const stallPose = angle => flight({ vsi: -160 * Math.sin(angle * Math.PI / 180) });
const drawn = () => texts.join(' ');
const live = () => document.getElementById('skyschool-a11y-live').textContent;
const announcementKeys = () => translationCalls.filter(key => /\.announce_stall_warning(?:_|$)/.test(key));

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab();
  window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  physicsSnapshot = Object.getOwnPropertyDescriptors(FS.Physics);
  callback = null; wallTime = 1000; texts = []; paintedTexts = [];
  coarsePointer = false; translations = {}; translationCalls = [];
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('matchMedia', vi.fn(query => ({
    matches: query === '(hover: none) and (pointer: coarse)' && coarsePointer,
    media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  })));
  const gfx = new Proxy({
    fillText(text, x, y) {
      texts.push(String(text));
      paintedTexts.push({ text: String(text), x, y, width: Array.from(String(text)).length * 6,
        font: this.font, textAlign: this.textAlign, textBaseline: this.textBaseline });
    },
    measureText: text => ({ width: Array.from(String(text)).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }, {
    get(target, key) { return key in target ? target[key] : () => {}; },
    set(target, key, value) { target[key] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(gfx);
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', vi.fn(next => { if (next.name === 'loop') callback = next; return 1; }));
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

async function mount({ touch = false, challenge = false, details = false, width = 390, height = 640, thirdPerson } = {}) {
  coarsePointer = touch;
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', railCollapsed: true, flightDetails: details, thirdPerson,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.map(item => [item.id, true])) } });
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      t: (key, fallback) => { translationCalls.push(key); return translations[key] ?? fallback ?? key; },
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, value) => setData(old => ({ ...old, [id]: { ...old[id], ...value } })) }));
  }
  await act(async () => root.render(React.createElement(App)));
  const departure = host.querySelector('button[aria-label="Free Flight from Portland, ME"]');
  expect(departure).toBeTruthy();
  await act(async () => departure.click());
  if (challenge) await act(async () => hooks().startFlightChallenge('first_flight', 'kpwm'));
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: width });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: height });
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width, height, right: width, bottom: height });
  }
  const dock = host.querySelector('[data-flightsim-hud-dock]');
  for (const [key, value] of Object.entries({ offsetLeft: 8, offsetTop: 62, offsetWidth: 215, offsetHeight: 64 })) {
    Object.defineProperty(dock, key, { configurable: true, value });
  }
  Object.assign(hooks().getWeatherRef().current, { type: 'clear', wind: 0, turbulence: 0 });
  // Natural signed-stall cases call through to the actual point-mass model.
  // Only missing/inconsistent sensor and retained-warning cases hold a pose.
  step = vi.spyOn(FS.Physics, 'step');
  await frame(flight(), input());
  translationCalls.length = 0;
}
async function frame(state, controls) {
  if (state) Object.assign(hooks().flightRef.current, state);
  if (controls) Object.assign(hooks().controlsRef.current, controls);
  texts.length = 0; paintedTexts.length = 0; wallTime += 100;
  expect(callback).toBeTypeOf('function');
  await act(async () => callback());
  await act(async () => vi.advanceTimersByTimeAsync(60));
  expect(errors).not.toHaveBeenCalled();
}
function holdPose() {
  step.mockImplementation(state => ({ ...state,
    forces: { lift: FS.Physics.WEIGHT, weight: FS.Physics.WEIGHT, drag: 0, thrust: 0 } }));
}
function touch(canvas, type, identifier, y) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'changedTouches', { value: [{ identifier, clientX: 195, clientY: y }] });
  canvas.dispatchEvent(event);
}

describe('measured signed stall direction', () => {
  it.each([[15, 'down'], [20, 'down'], [-15, 'up'], [-20, 'up']])('matches the teaching polar at %s degrees', (aoa, direction) => {
    expect(FS.Physics.aerodynamicState(aoa).state).toBe('stall');
    expect(FS.getFlightStallPitchDirection(flight({ stalling: true, aoa }))).toBe(direction);
  });

  it.each([undefined, null, NaN, Infinity, -Infinity, 0, '-20', '20', 14.99, -14.99])('does not invent a direction from %s', aoa => {
    expect(FS.getFlightStallPitchDirection(flight({ stalling: true, aoa }))).toBe('unknown');
  });

  it('does not create stall guidance from ground state or unstalled negative AoA', () => {
    expect(FS.getFlightStallPitchDirection(flight({ stalling: true, aoa: -20, onGround: true }))).toBeNull();
    expect(FS.getFlightStallPitchDirection(flight({ stalling: false, aoa: -20 }))).toBeNull();
    expect(FS.getFlightStallPitchDirection(null)).toBeNull();
  });
});

describe('urgent stall warning instrument clearance', () => {
  const decks = [
    { width: 280, height: 320, mapX: 176, mapSize: 64 },
    { width: 320, height: 568, mapX: 216, mapSize: 64 },
    { width: 390, height: 640, mapX: 286, mapSize: 64 },
    { width: 390, height: 844, mapX: 286, mapSize: 64 },
    { width: 599, height: 390, mapX: 495, mapSize: 64 },
    { width: 600, height: 320, mapX: 460, mapSize: 90 },
    { width: 700, height: 390, mapX: 560, mapSize: 90 },
    { width: 1365, height: 900, mapX: 1225, mapSize: 90 },
  ];

  it('keeps the full warning minimap rim below the urgent band and inside the deck in either view', () => {
    for (const deck of decks) for (const chase of [false, true]) {
      const normal = FS.getFlightInstrumentLayout(deck.width, deck.height, chase);
      const warning = FS.getFlightInstrumentLayout(deck.width, deck.height, chase, true);
      // drawMiniMapEnhanced paints a radius+2 circle with a 4 px stroke:
      // the complete rim extends 4 px beyond the nominal map bounds.
      const rim = { left: warning.map.x - 4, top: warning.map.y - 4,
        right: warning.map.x + warning.map.size + 4, bottom: warning.map.y + warning.map.size + 4 };
      expect(rim.top).toBeGreaterThan(60); // Urgent warning occupies y=32..60.
      expect(rim.left).toBeGreaterThanOrEqual(0);
      expect(rim.right).toBeLessThanOrEqual(deck.width);
      expect(rim.bottom).toBeLessThanOrEqual(deck.height);
      expect(warning.map.x).toBe(normal.map.x); expect(warning.map.size).toBe(normal.map.size);
      expect(normal.map.y).toBe(38); expect(warning.map.y).toBe(66);
      // A short deck may move the full-size VSI to make room for the warning
      // map. Check both painted rims, rather than requiring their normal and
      // warning coordinates to be identical even when those rims collide.
      const mapCenter = { x: warning.map.x + warning.map.size / 2, y: warning.map.y + warning.map.size / 2 };
      const vsiRim = warning.vsi.r + 1; // drawGauge's 2 px outer stroke.
      expect(Math.hypot(mapCenter.x - warning.vsi.x, mapCenter.y - warning.vsi.y)
        - (warning.map.size / 2 + 4) - vsiRim).toBeGreaterThanOrEqual(4);
      expect(warning.vsi.x - vsiRim).toBeGreaterThanOrEqual(0);
      expect(warning.vsi.x + vsiRim).toBeLessThanOrEqual(deck.width);
      expect(warning.vsi.y - vsiRim).toBeGreaterThanOrEqual(60);
      expect(warning.vsi.y + vsiRim).toBeLessThanOrEqual(deck.height);
      expect(warning.vsi.r).toBe(normal.vsi.r); expect(warning.vsi.r).toBeGreaterThanOrEqual(25);
      expect(warning.horizon.r).toBeGreaterThanOrEqual(48);
      expect(warning.speed.w).toBeGreaterThanOrEqual(44); expect(warning.altitude.w).toBeGreaterThanOrEqual(55);
    }
  });

  it('preserves the established normal minimap geometry after warning layouts in either view', () => {
    for (const deck of decks) for (const chase of [false, true]) {
      FS.getFlightInstrumentLayout(deck.width, deck.height, chase, true);
      const normal = FS.getFlightInstrumentLayout(deck.width, deck.height, chase);
      expect(normal.map).toEqual({ x: deck.mapX, y: 38, size: deck.mapSize });
      expect(FS.getFlightInstrumentLayout(deck.width, deck.height, chase, false)).toEqual(normal);
    }
  });
});

describe('signed in-flight stall coaching', () => {
  it('yields training ATIS to complete stall coaching on a short phone and restores it after gaining height', async () => {
    await mount({ touch: true, details: true, width: 390, height: 480, thirdPerson: false }); holdPose();
    const dock = host.querySelector('[data-flightsim-hud-dock]');
    for (const [key, value] of Object.entries({ offsetLeft: 8, offsetTop: 62, offsetWidth: 374, offsetHeight: 29 })) {
      Object.defineProperty(dock, key, { configurable: true, value });
    }
    const pose = flight({ stalling: true, aoa: 20, altitude: 2000 });
    const coaching = '🚨 STALL! Drag DOWN from the middle to lower the nose, then UP on the right edge for power!';
    await frame(pose, input());
    expect(drawn()).toContain(coaching);
    expect(drawn()).not.toContain('TRAINING ATIS');
    expect(hooks().flightRef.current).toMatchObject({ stalling: true, aoa: 20, altitude: 2000 });
    for (const canvas of host.querySelectorAll('canvas')) {
      Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 640 });
      canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 390, height: 640, right: 390, bottom: 640 });
    }
    await frame(pose, input());
    expect(drawn()).toContain(coaching);
    expect(drawn()).toContain('TRAINING ATIS');
    expect(hooks().flightRef.current).toMatchObject({ stalling: true, aoa: 20, altitude: 2000 });
  });

  it.each([20, -20].flatMap(aoa => [
    [aoa, { x: 10, y: 66, w: 202, h: 66 }],
    [aoa, { x: 8, y: 62, w: 682, h: 29 }],
  ]))('keeps the complete %s-degree stall coaching clear of the short landscape dock %j and instruments', async (aoa, dockBox) => {
    const width = 698, height = 308;
    await mount({ touch: true, width, height, thirdPerson: true });
    const dock = host.querySelector('[data-flightsim-hud-dock]');
    for (const [key, value] of Object.entries({ offsetLeft: dockBox.x, offsetTop: dockBox.y, offsetWidth: dockBox.w, offsetHeight: dockBox.h })) {
      Object.defineProperty(dock, key, { configurable: true, value });
    }
    await frame(stallPose(aoa), input());
    expect(hooks().flightRef.current.stalling).toBe(true);
    const start = paintedTexts.findIndex(row => row.text.startsWith('🚨 STALL!'));
    expect(start).toBeGreaterThanOrEqual(0);
    const rows = [paintedTexts[start]];
    for (let index = start + 1; index < paintedTexts.length; index++) {
      const row = paintedTexts[index], previous = rows.at(-1);
      if (row.font !== rows[0].font || row.x !== rows[0].x || row.y !== previous.y + 13) break;
      rows.push(row);
    }
    const expected = aoa > 0
      ? '🚨 STALL! Drag DOWN from the middle to lower the nose, then UP on the right edge for power!'
      : '🚨 STALL! AoA is negative: gently drag UP from the middle to bring it toward zero. Use the right edge for power as needed.';
    expect(rows.map(row => row.text).join(' ').replace(/\s+/g, ' ').trim()).toBe(expected);
    const layout = FS.getFlightInstrumentLayout(width, height, true, true), map = layout.map, horizon = layout.horizon;
    const reserved = [dockBox, { x: map.x - 4, y: map.y - 4, w: map.size + 8, h: map.size + 8 },
      { x: horizon.x - horizon.r, y: horizon.y - horizon.r, w: horizon.r * 2, h: horizon.r * 2 }];
    for (const row of rows) {
      expect(row.font).toBe('10px system-ui'); expect(row.textAlign).toBe('center'); expect(row.textBaseline).toBe('alphabetic');
      // A full 10 px glyph height plus 3 px descender allowance, rather than
      // merely requiring the alphabetic baseline to be inside the canvas.
      const box = { x: row.x - row.width / 2, y: row.y - 10, w: row.width, h: 13 };
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.w).toBeLessThanOrEqual(width);
      expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.h).toBeLessThanOrEqual(height);
      for (const other of reserved) expect(box.x < other.x + other.w && box.x + box.w > other.x
        && box.y < other.y + other.h && box.y + box.h > other.y).toBe(false);
    }
  });

  it.each([
    [480, true, false],
    [640, true, true],
    [480, false, true],
  ])('paints compact wind details at height %s with stall %s only when clear of the VSI (%s)', async (height, stalling, visible) => {
    await mount({ details: true, width: 390, height, thirdPerson: false }); holdPose();
    Object.assign(hooks().getWeatherRef().current, { wind: 12, windDir: 123 });
    await frame(flight({ stalling, aoa: stalling ? 20 : 0 }), input());
    // These exact strings are emitted by the actual wind instrument painter;
    // the host's selected weather and the measured flight pose stay unchanged.
    expect(texts.includes('123°')).toBe(visible);
    expect(texts.includes('12kt')).toBe(visible);
    expect(hooks().getWeatherRef().current).toMatchObject({ wind: 12, windDir: 123 });
    expect(hooks().flightRef.current.stalling).toBe(stalling);
  });

  it.each([[15.2, false], [-15.2, false], [15.2, true], [-15.2, true]])('coaches the real %s-degree stall in touch mode %s', async (aoa, touchMode) => {
    await mount({ touch: touchMode });
    await frame(stallPose(aoa), input());
    expect(step).toHaveBeenCalled();
    expect(hooks().flightRef.current.stalling).toBe(true);
    expect(hooks().flightRef.current.aoa).toBeCloseTo(aoa, 6);
    expect(drawn()).toContain('⚠️ STALL — BRING AoA TOWARD ZERO');
    if (aoa < 0) {
      expect(drawn()).toContain(touchMode ? 'drag UP from the middle' : 'press W');
      expect(drawn()).toContain('AoA is negative');
      expect(drawn()).not.toContain('Push S');
      expect(drawn()).not.toContain('Drag DOWN from the middle');
      expect(live()).toContain('Angle of attack is negative');
      expect(live()).toContain('raise the nose');
      expect(live()).not.toContain('nose down');
    } else {
      expect(drawn()).toContain(touchMode ? 'Drag DOWN from the middle' : 'Push S');
      expect(live()).toContain('Push nose down');
    }
  });

  it.each([false, true])('gives honest direction-unknown guidance in touch mode %s', async touchMode => {
    await mount({ touch: touchMode }); holdPose();
    await frame(flight({ stalling: true, aoa: null }), input());
    expect(drawn()).toContain('Direction is unavailable');
    expect(drawn()).not.toContain('Push S');
    expect(drawn()).not.toContain('press W');
    expect(drawn()).not.toMatch(/drag (?:UP|DOWN) from the middle/i);
    expect(live()).toContain('Its direction is unavailable');
    expect(live()).not.toMatch(/nose (?:up|down)|raise the nose|lower the nose/i);
  });

  it('corrects a spoken direction change without repeating the same warning every frame', async () => {
    await mount(); holdPose();
    await frame(flight({ stalling: true, aoa: 20 }), input());
    expect(live()).toContain('Push nose down');
    expect(announcementKeys()).toHaveLength(1);
    await frame();
    expect(announcementKeys()).toHaveLength(1);
    await frame(flight({ stalling: true, aoa: -20 }));
    expect(live()).toContain('raise the nose');
    expect(announcementKeys()).toHaveLength(2);
    await frame();
    expect(announcementKeys()).toHaveLength(2);
    await frame(flight({ stalling: false, aoa: 0 }));
    await frame(flight({ stalling: true, aoa: -20 }));
    expect(announcementKeys()).toHaveLength(3);
    expect(live()).toContain('raise the nose');
  });

  it('replaces unknown spoken advice when a signed measurement becomes available', async () => {
    await mount(); holdPose();
    await frame(flight({ stalling: true, aoa: null }), input());
    expect(live()).toContain('Its direction is unavailable');
    await frame(flight({ stalling: true, aoa: -20 }));
    expect(live()).toContain('raise the nose');
    expect(live()).not.toContain('direction is unavailable');
    expect(announcementKeys()).toHaveLength(2);
  });

  it.each([20, -20])('the coached keyboard input moves measured %s-degree AoA toward zero', async aoa => {
    await mount(); await frame(stallPose(aoa), input());
    const cockpit = host.querySelector('canvas[role="application"]');
    cockpit.focus();
    const key = aoa < 0 ? 'w' : 's';
    await act(async () => cockpit.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));
    // Reset only the path so the commanded pitch change can be compared at
    // the same airspeed and path angle, rather than crediting a path change.
    await frame(stallPose(aoa));
    await act(async () => cockpit.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true })));
    expect(Math.sign(hooks().controlsRef.current.pitch)).toBe(aoa < 0 ? 1 : -1);
    expect(Math.abs(hooks().flightRef.current.aoa)).toBeLessThan(Math.abs(aoa));
    expect(hooks().controlsRef.current.throttle).toBe(0.4);
  });

  it.each([20, -20])('the coached center drag moves measured %s-degree AoA toward zero', async aoa => {
    await mount({ touch: true }); await frame(stallPose(aoa), input());
    const cockpit = host.querySelector('canvas[role="application"]');
    await act(async () => {
      touch(cockpit, 'touchstart', 1, 320);
      touch(cockpit, 'touchmove', 1, aoa < 0 ? 300 : 340);
    });
    await frame(stallPose(aoa));
    expect(Math.sign(hooks().controlsRef.current.pitch)).toBe(aoa < 0 ? 1 : -1);
    expect(Math.abs(hooks().flightRef.current.aoa)).toBeLessThan(Math.abs(aoa));
    expect(hooks().controlsRef.current.throttle).toBe(0.4);
  });

  it.each([false, true])('immediately updates the challenge panel for positive, negative, and normal AoA in touch mode %s', async touchMode => {
    await mount({ touch: touchMode, challenge: true });
    await frame(stallPose(20), input());
    const panel = () => host.querySelector('section[aria-label="Flight challenge"]');
    expect(panel()).toBeTruthy();
    expect(panel().textContent).toContain(touchMode ? 'Drag DOWN from the middle' : 'Push S');
    expect(panel().textContent).not.toContain('AoA is negative');
    await frame(stallPose(-20), input());
    expect(panel().textContent).toContain('AoA is negative');
    expect(panel().textContent).toContain(touchMode ? 'drag UP from the middle' : 'press W');
    expect(panel().textContent).not.toContain('Push S');
    expect(panel().textContent).not.toContain('Drag DOWN from the middle');
    await frame(stallPose(-5), input());
    expect(hooks().flightRef.current.stalling).toBe(false);
    expect(panel().textContent).not.toContain('STALL!');
    expect(panel().textContent).not.toContain('AoA is negative');
    expect(panel().textContent).toContain('Level the wings');
  });

  it.each([false, true])('localizes negative hints, the urgent HUD, and spoken advice for touch %s', async touchMode => {
    translations[`stem.flightsim.hint_${touchMode ? 't' : 'k'}_stall_negative`] = 'ANGLE NÉGATIF : cabrez doucement.';
    translations['stem.flightsim.hud_stall_warning'] = 'DÉCROCHAGE — rapprochez l’incidence de zéro';
    translations['stem.flightsim.announce_stall_warning_negative'] = 'Incidence négative. Cabrez doucement pour la rapprocher de zéro.';
    await mount({ touch: touchMode }); await frame(stallPose(-20), input());
    expect(drawn()).toContain('ANGLE NÉGATIF : cabrez doucement.');
    expect(drawn()).toContain('DÉCROCHAGE — rapprochez l’incidence de zéro');
    expect(live()).toBe('Incidence négative. Cabrez doucement pour la rapprocher de zéro.');
  });

  it('keeps normal negative-AoA flight free of a fabricated stall action', async () => {
    await mount(); await frame(stallPose(-5), input());
    expect(hooks().flightRef.current.stalling).toBe(false);
    expect(drawn()).not.toContain('STALL!');
    expect(announcementKeys()).toEqual([]);
  });
});
