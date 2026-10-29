import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const reactionSource = source.slice(source.indexOf('  function issEvaReaction('), source.indexOf('  function issMomentumTrial('));
const reaction = new Function(reactionSource + '\nreturn issEvaReaction;')();
const begin = source.indexOf('      function dockingCanvasRef(cv) {');
const end = source.indexOf('      // ── EVA repair minigame', begin);
const buildSimulator = new Function('d', 'upd', 'addToast', 'awardXP', 'announceToSR', '__alloT', '__alloFill', '_prefersReducedMotion', source.slice(begin, end) + '\nreturn dockingCanvasRef;');
let cleanups = [];

function flight({ orbital = false, timeScale = 1 } = {}) {
  let callback;
  vi.stubGlobal('requestAnimationFrame', (fn) => { callback = fn; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  const reports = [], announcements = [];
  const hud = { textContent: '' };
  const controls = { querySelector: (selector) => selector === '[data-dock-hud]' ? hud : null };
  const listeners = new Map();
  const canvas = {
    getContext: () => null, isConnected: true, parentElement: { parentElement: controls },
    getBoundingClientRect: () => ({ left: 13, top: 23, width: 640, height: 360 }),
    addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(callback); },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
    _dockRealMode: orbital,
  };
  const initialize = buildSimulator({}, (report) => reports.push(report), null, null, (message) => announcements.push(message), (key, fallback) => fallback, (str, values) => str.replace(/\{(\w+)\}/g, (match, key) => values?.[key] ?? match), false);
  initialize(canvas);
  canvas._dockSetTimeScale(timeScale);
  let clock = 0;
  callback(clock);
  cleanups.push(() => canvas._dockCleanup());
  return {
    canvas, state: canvas._dockState, reports, hud, announcements,
    emit(type, event = {}) { for (const listener of listeners.get(type) || []) listener({ type, target: canvas, currentTarget: canvas, preventDefault() {}, ...event }); },
    advance(seconds, fps = 60) {
      const frames = Math.round(seconds * fps);
      for (let frame = 0; frame < frames; frame++) { clock += 1000 / fps; callback(clock); }
    },
    gap(milliseconds) { clock += milliseconds; callback(clock); },
  };
}

function rangePointerFixture(sim, rect = { left: 17, top: 23, width: 640, height: 184 }) {
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), captured = new Set();
  target.getBoundingClientRect = () => rect;
  target.focus = vi.fn();
  target.setPointerCapture = vi.fn(id => captured.add(id));
  target.hasPointerCapture = id => captured.has(id);
  target.releasePointerCapture = vi.fn(id => captured.delete(id));
  return {
    target, captured,
    x(fraction) { const geometry = sim.canvas._dockRangeTimeline(rect.width); return rect.left + (geometry.left + (geometry.right - geometry.left) * fraction) / geometry.width * rect.width; },
    send(phase, props = {}) {
      const event = { currentTarget: target, button: 0, buttons: phase === 'up' ? 0 : 1, isPrimary: true, pointerId: 301, clientX: this.x(.25), preventDefault: vi.fn(), ...props };
      sim.canvas._dockRangePointer(event, phase); return event;
    },
  };
}

afterEach(() => { cleanups.forEach((fn) => fn()); cleanups = []; vi.unstubAllGlobals(); });

describe('space station docking physics', () => {
  it('preserves inertial coasting without consuming propellant', () => {
    const sim = flight();
    sim.advance(10);
    expect(sim.state.x).toBeCloseTo(26, 9);
    expect(sim.state.y).toBeCloseTo(-180, 8);
    expect(sim.state.vy).toBe(1);
    expect(sim.state.propellant).toBe(80);
    expect(sim.state.t).toBeCloseTo(10, 8);
  });

  it('produces the same trajectory at 30 Hz and 144 Hz', () => {
    const slow = flight({ orbital: true });
    slow.canvas._dockSetThrust('up', true);
    slow.advance(20, 30);
    const state = { ...slow.state };
    const fast = flight({ orbital: true });
    fast.canvas._dockSetThrust('up', true);
    fast.advance(20, 144);
    for (const key of ['x', 'y', 'vx', 'vy', 'propellant', 't']) expect(fast.state[key]).toBeCloseTo(state[key], 8);
  });

  it('matches the analytic unforced Clohessy-Wiltshire solution', () => {
    const sim = flight({ orbital: true });
    sim.advance(60);
    const n = Math.sqrt(3.986004418e14 / (6791000 ** 3));
    const c = Math.cos(n * 60), s = Math.sin(n * 60);
    expect(sim.state.x).toBeCloseTo((4 - 3 * c) * 26 + 2 / n * (1 - c), 6);
    expect(sim.state.y).toBeCloseTo(6 * (s - n * 60) * 26 - 190 + (4 * s - 3 * n * 60) / n, 6);
    expect(sim.state.vx).toBeCloseTo(3 * n * s * 26 + 2 * s, 6);
    expect(sim.state.vy).toBeCloseTo(6 * n * (c - 1) * 26 + 4 * c - 3, 6);
  });

  it('burns propellant according to thrust and specific impulse', () => {
    const sim = flight();
    sim.canvas._dockSetThrust('fwd', true);
    sim.advance(10);
    const used = 400 * 10 / (220 * 9.80665);
    expect(sim.state.propellant).toBeCloseTo(80 - used, 7);
    expect(sim.state.vy - 1).toBeCloseTo(220 * 9.80665 * Math.log(8080 / (8080 - used)), 7);
  });

  it('accounts for two axes and limits thrust to available propellant', () => {
    const sim = flight();
    sim.state.propellant = .0001;
    sim.canvas._dockSetThrust('fwd', true);
    sim.canvas._dockSetThrust('up', true);
    sim.advance(1);
    expect(sim.state.propellant).toBe(0);
    expect(sim.state.fuel).toBe(0);
    expect(sim.state.vx).toBeGreaterThan(0);
    expect(sim.state.vx).toBeLessThan(.0001);
    const speed = sim.state.vy;
    sim.advance(1);
    expect(sim.state.vy).toBe(speed);
  });

  it('makes precision thrust one quarter of normal thrust', () => {
    const sim = flight();
    sim.canvas._dockSetPrecision();
    sim.canvas._dockSetThrust('fwd', true);
    sim.advance(10);
    expect(80 - sim.state.propellant).toBeCloseTo(100 * 10 / (220 * 9.80665), 7);
  });

  it('withholds a stopping margin when positive fuel cannot cancel the closing velocity', () => {
    const sim = flight();
    sim.state.propellant = .001;
    sim.state.fuel = .001 / 80 * 100;
    sim.canvas._dockSetTimeScale(1);
    expect(sim.hud.textContent).toContain('stopping margin unavailable (insufficient propellant)');
    expect(sim.hud.textContent).toContain('remaining RCS Δv 0.000 m/s');
    expect(sim.hud.textContent).not.toMatch(/Infinity|NaN/);
  });

  it('uses the rocket-equation reserve to distinguish achievable and unachievable braking', () => {
    const sim = flight();
    // The initial approach is 1 m/s. Straddle the independently calculated
    // propellant requirement while leaving distance and thrust unchanged.
    const requiredFuel = 8000 * Math.expm1(1 / (220 * 9.80665));
    for (const fraction of [.95, 1.05]) {
      sim.state.propellant = requiredFuel * fraction;
      sim.state.fuel = sim.state.propellant / 80 * 100;
      sim.canvas._dockSetTimeScale(1);
      const reserve = 220 * 9.80665 * Math.log((8000 + sim.state.propellant) / 8000);
      expect(sim.hud.textContent).toContain('remaining RCS Δv ' + reserve.toFixed(3) + ' m/s');
      if (fraction < 1) expect(sim.hud.textContent).toContain('stopping margin unavailable (insufficient propellant)');
      else expect(sim.hud.textContent).toMatch(/stopping margin \d+\.\d m \(estimate\)/);
    }
  });

  it('budgets both fixed thruster axes when cancelling diagonal motion', () => {
    const sim = flight();
    sim.state.vx = .7;
    sim.state.vy = .7;
    sim.state.propellant = 8000 * Math.expm1(1.1 / (220 * 9.80665));
    sim.state.fuel = sim.state.propellant / 80 * 100;
    // A 1.1 m/s reserve exceeds the 0.990 m/s vector speed but cannot supply
    // the 0.7 + 0.7 m/s impulse demanded by the two perpendicular thrusters.
    expect(Math.hypot(sim.state.vx, sim.state.vy)).toBeLessThan(1.1);
    sim.canvas._dockSetTimeScale(1);
    expect(sim.hud.textContent).toContain('remaining RCS Δv 1.100 m/s');
    expect(sim.hud.textContent).toContain('stopping margin unavailable (insufficient propellant)');
  });

  it('keeps precision-mode fuel capability distinct from its longer stopping distance', () => {
    const sim = flight();
    const readMargin = () => Number(sim.hud.textContent.match(/stopping margin (-?\d+\.\d) m/)[1]);
    const range = Math.hypot(26, -190);
    const distance = 1 / (2 * (400 / 8080));
    const reserveText = 'remaining RCS Δv ' + (220 * 9.80665 * Math.log(8080 / 8000)).toFixed(3) + ' m/s';
    expect(readMargin()).toBeCloseTo(range - distance - 5, 1);
    expect(sim.hud.textContent).toContain(reserveText);
    sim.canvas._dockSetPrecision();
    expect(readMargin()).toBeCloseTo(range - distance * 4 - 5, 1);
    expect(sim.hud.textContent).toContain(reserveText);
    sim.state.propellant = 0;
    sim.state.fuel = 0;
    sim.canvas._dockSetTimeScale(1);
    expect(sim.hud.textContent).toContain('stopping margin unavailable (no propellant)');
    expect(sim.hud.textContent).not.toMatch(/Infinity|NaN/);
  });

  it('holds velocity using real fuel and allows manual override', () => {
    const sim = flight();
    sim.canvas._dockSetDamp();
    sim.advance(30);
    expect(sim.state.vy).toBeLessThan(.01);
    expect(sim.state.propellant).toBeLessThan(80);
    sim.canvas._dockSetThrust('fwd', true);
    expect(sim.state.damp).toBe(false);
  });

  it('pauses and skips suspended browser time', () => {
    const sim = flight();
    sim.canvas._dockTogglePause();
    sim.advance(3);
    expect(sim.state.t).toBe(0);
    sim.canvas._dockTogglePause();
    sim.gap(10000);
    expect(sim.state.t).toBe(0);
    sim.advance(1);
    expect(sim.state.t).toBeCloseTo(1, 8);
  });

  it('accelerates only the clock and returns to real time near the port', () => {
    const sim = flight({ timeScale: 8 });
    sim.advance(1);
    expect(sim.state.t).toBeCloseTo(8, 8);
    sim.state.x = 0; sim.state.y = -30;
    sim.advance(1);
    expect(sim.state.t).toBeCloseTo(9, 8);
  });

  it('captures slow centered contact and rejects fast or off-axis contact', () => {
    for (const [x, speed, result] of [[0, .3, 'docked'], [0, 1.2, 'bonk'], [4, .3, 'bonk']]) {
      const sim = flight();
      sim.state.x = x; sim.state.y = -5.01; sim.state.vy = speed;
      sim.advance(.5);
      expect(sim.state.overResult).toBe(result);
      expect(sim.state.y).toBe(-5);
      expect(sim.reports).toHaveLength(1);
    }
  });

  it('accumulates completed runs and wins across retries without duplicating a result', () => {
    const sim = flight();
    for (const [index, speed] of [.3, 1.2, .3].entries()) {
      if (index) sim.canvas._dockReset(false);
      sim.state.x = 0; sim.state.y = -5.01; sim.state.vy = speed;
      sim.advance(.5);
      expect(sim.reports).toHaveLength(index + 1);
      expect(sim.reports.at(-1).dockRuns).toBe(index + 1);
      expect(sim.reports.at(-1).dockWins).toBe(index === 2 ? 2 : 1);
      sim.advance(1);
      expect(sim.reports).toHaveLength(index + 1);
    }
  });

  it('forecasts unpowered motion without spending fuel, moving the vehicle, or firing rate hold', () => {
    const sim = flight();
    sim.canvas._dockSetDamp();
    sim.canvas._dockSetHorizon(30);
    const before = JSON.stringify(sim.state);
    const forecast = sim.canvas._dockForecast();
    expect(forecast.endpoint).toMatchObject({ x: 26, y: -160, vx: 0, vy: 1, time: 30 });
    expect(forecast.terminal).toBeNull();
    expect(JSON.stringify(sim.state)).toBe(before);
    expect(sim.reports).toHaveLength(0);
  });

  it('matches the live orbital coast over the selected window', () => {
    const sim = flight({ orbital: true });
    sim.canvas._dockSetHorizon(120);
    const endpoint = sim.canvas._dockForecast().endpoint;
    sim.advance(120);
    for (const key of ['x', 'y', 'vx', 'vy']) expect(endpoint[key]).toBeCloseTo(sim.state[key], 6);
    expect(endpoint.time).toBe(120);
  });

  it.each([[1, .3, true], [2.5, .3, false], [-2.5, .3, false], [0, .6, true], [0, .61, false]])(
    'stops a forecast at first contact and applies the live capture limits (offset %s, speed %s)', (x, vy, capture) => {
      const sim = flight();
      Object.assign(sim.state, { x, y: -5.37, vx: 0, vy });
      const forecast = sim.canvas._dockForecast();
      expect(forecast.terminal).toBe('contact');
      expect(forecast.endpoint.y).toBe(-5);
      expect(forecast.endpoint.time).toBeCloseTo(.37 / vy, 6);
      expect(forecast.points.at(-1)).toBe(forecast.endpoint);
      expect(forecast.capture).toBe(capture);
      sim.advance(2);
      expect(sim.state.overResult).toBe(capture ? 'docked' : 'bonk');
      expect(forecast.speed).toBeCloseTo(Math.hypot(sim.state.vx, sim.state.vy), 8);
    }
  );

  it('resolves an orbital contact forecast to the same position and speed as live flight', () => {
    const sim = flight({ orbital: true });
    sim.canvas._dockSetScenario('final');
    sim.canvas._dockSetHorizon(120);
    const forecast = sim.canvas._dockForecast();
    expect(forecast.capture).toBe(true);
    sim.canvas._dockTogglePause();
    sim.advance(forecast.endpoint.time + .1);
    expect(sim.state.overResult).toBe('docked');
    expect(sim.state.x).toBeCloseTo(forecast.endpoint.x, 5);
    expect(Math.hypot(sim.state.vx, sim.state.vy)).toBeCloseTo(forecast.speed, 6);
    // Live flight now ends within the tick at physical contact. The forecast
    // uses coarser RK4 knots and a finite event bracket; neither time is
    // required to be later than the other within that numerical tolerance.
    expect(Math.abs(sim.state.t - forecast.endpoint.time)).toBeLessThan(1e-6);
  });

  it('distinguishes a short forecast window from a later collision', () => {
    const sim = flight();
    Object.assign(sim.state, { x: 4, y: -25, vx: 0, vy: .3 });
    sim.canvas._dockSetHorizon(30);
    expect(sim.canvas._dockForecast().terminal).toBeNull();
    sim.canvas._dockSetHorizon(120);
    expect(sim.canvas._dockForecast()).toMatchObject({ terminal: 'contact', capture: false, offset: 4 });
    sim.canvas._dockSetHorizon(30);
    expect(sim.canvas._dockForecast().endpoint.time).toBe(30);
  });

  it('stops at the approach-zone boundary and cannot capture behind the station', () => {
    const sim = flight();
    Object.assign(sim.state, { x: 400, y: -30, vx: 1, vy: 0 });
    const exit = sim.canvas._dockForecast();
    expect(exit.terminal).toBe('exit');
    expect(exit.range).toBeCloseTo(420, 6);
    expect(exit.endpoint.time).toBeCloseTo(Math.sqrt(420 ** 2 - 30 ** 2) - 400, 6);
    Object.assign(sim.state, { x: 80, y: -10, vx: 0, vy: 1 });
    const pass = sim.canvas._dockForecast();
    expect(pass.planeCrossing.time).toBeCloseTo(5, 6);
    expect(pass.terminal).toBe('exit');
    expect(pass.endpoint.y).toBeCloseTo(35, 6);
    expect(pass.capture).toBe(false);
    Object.assign(sim.state, { x: 0, y: 5, vx: 0, vy: -.3 });
    expect(sim.canvas._dockForecast().capture).toBe(false);
  });

  it('opens a practice start paused with full fuel and clear controls', () => {
    const sim = flight();
    sim.canvas._dockSetThrust('fwd', true);
    sim.advance(2);
    sim.canvas._dockSetScenario('drift');
    expect(sim.state).toMatchObject({ scenario: 'drift', x: 8, y: -50, vx: .15, vy: .65, t: 0, paused: true, propellant: 80, fuel: 100, deltaV: 0, damp: false });
    expect(Object.values(sim.state.thrust).some(Boolean)).toBe(false);
    const before = JSON.stringify(sim.state);
    sim.advance(3);
    expect(JSON.stringify(sim.state)).toBe(before);
    expect(sim.reports).toHaveLength(0);
    sim.canvas._dockReset(false);
    expect(sim.state).toMatchObject({ scenario: 'drift', x: 8, y: -50, paused: false });
  });

  it('announces the actual practice range, then only gates crossed during flight', () => {
    const sim = flight();
    sim.canvas._dockSetScenario('final');
    expect(sim.announcements).toHaveLength(1);
    expect(sim.announcements[0]).toContain('Final approach. Range 25.0 meters');
    expect(sim.announcements[0]).toContain('Paused.');
    expect(sim.announcements.join(' ')).not.toContain('100 meters to the port');
    expect(sim.announcements.join(' ')).not.toContain('Final approach, 40 meters');
    sim.canvas._dockTogglePause();
    sim.advance(50);
    expect(sim.announcements.filter(message => message.includes('Capture corridor, 15 meters'))).toHaveLength(1);
    sim.advance(5);
    expect(sim.announcements.filter(message => message.includes('Capture corridor, 15 meters'))).toHaveLength(1);
  });

  it('ignores malformed practice controls and invalidates the forecast when orbital physics changes', () => {
    const sim = flight();
    const before = JSON.stringify(sim.state);
    for (const value of ['bad', NaN, Infinity, 0, 600]) sim.canvas._dockSetHorizon(value);
    for (const value of ['bad', '__proto__', 'constructor']) sim.canvas._dockSetScenario(value);
    expect(JSON.stringify(sim.state)).toBe(before);
    const free = sim.canvas._dockForecast().endpoint;
    sim.canvas._dockReset(true);
    expect(sim.canvas._dockForecast().endpoint.x).toBeGreaterThan(free.x);
  });

  it('clears the future trajectory when a run has ended', () => {
    const sim = flight();
    Object.assign(sim.state, { x: 0, y: -5.01, vx: 0, vy: .3 });
    expect(sim.canvas._dockForecast().capture).toBe(true);
    sim.advance(.5);
    const forecast = sim.canvas._dockForecast();
    expect(forecast.terminal).toBe('complete');
    expect(forecast.endpoint.time).toBe(0);
    expect(forecast.points).toHaveLength(1);
  });

  it('samples arbitrary inertial coast times with physical readouts and exact initial and endpoint states', () => {
    const sim = flight();
    Object.assign(sim.state, { x: -18, y: -190, vx: .13, vy: .7 });
    sim.canvas._dockSetHorizon(120);
    const initial = { x: sim.state.x, y: sim.state.y, vx: sim.state.vx, vy: sim.state.vy, time: 0 };
    const before = JSON.stringify(sim.state), forecast = sim.canvas._dockForecast();
    for (const time of [0, .125, 1.999, 2, 2.375, 17.123456789, 89.625, 120]) {
      const sample = sim.canvas._dockForecastSample(time), x = initial.x + initial.vx * time, y = initial.y + initial.vy * time;
      expect(sample.time).toBe(time);
      expect(sample.x).toBeCloseTo(x, 10); expect(sample.y).toBeCloseTo(y, 10);
      expect(sample.vx).toBe(initial.vx); expect(sample.vy).toBe(initial.vy);
      expect(sample.range).toBeCloseTo(Math.hypot(x, y), 10);
      expect(sample.offset).toBeCloseTo(Math.abs(x), 10);
      expect(sample.speed).toBeCloseTo(Math.hypot(initial.vx, initial.vy), 12);
      expect(sample.closing).toBeCloseTo(-(x * initial.vx + y * initial.vy) / Math.hypot(x, y), 10);
    }
    expect(sim.canvas._dockForecastSample(-1)).toMatchObject(initial);
    expect(sim.canvas._dockForecastSample(1e6)).toMatchObject(forecast.endpoint);
    expect(sim.canvas._dockForecastSample(' 17.125 ')).toEqual(sim.canvas._dockForecastSample(17.125));
    for (const invalid of [undefined, null, false, true, [], {}, '', '  ', 'bad', NaN, Infinity, -Infinity]) expect(sim.canvas._dockForecastSample(invalid)).toMatchObject(forecast.endpoint);
    expect(JSON.stringify(sim.state)).toBe(before);
  });

  it('matches independent HCW solutions at intermediate forecast times instead of interpolating orbital knots', () => {
    const sim = flight({ orbital: true });
    const initial = { x: 18.5, y: -190, vx: -.12, vy: .7 };
    Object.assign(sim.state, initial); sim.canvas._dockSetHorizon(120);
    const n = Math.sqrt(3.986004418e14 / (6791000 ** 3)), before = JSON.stringify(sim.state);
    for (const time of [.125, 1.999, 2.375, 17.123456789, 59.25, 119.875]) {
      const c = Math.cos(n * time), sn = Math.sin(n * time), sample = sim.canvas._dockForecastSample(time);
      const expected = {
        x: (4 - 3 * c) * initial.x + sn / n * initial.vx + 2 * (1 - c) / n * initial.vy,
        y: 6 * (sn - n * time) * initial.x + initial.y - 2 * (1 - c) / n * initial.vx + (4 * sn - 3 * n * time) / n * initial.vy,
        vx: 3 * n * sn * initial.x + c * initial.vx + 2 * sn * initial.vy,
        vy: 6 * n * (c - 1) * initial.x - 2 * sn * initial.vx + (4 * c - 3) * initial.vy,
      };
      expect(sample.time).toBe(time);
      for (const key of ['x', 'y', 'vx', 'vy']) expect(sample[key]).toBeCloseTo(expected[key], 7);
      expect(sample.range).toBeCloseTo(Math.hypot(expected.x, expected.y), 7);
      expect(sample.speed).toBeCloseTo(Math.hypot(expected.vx, expected.vy), 7);
    }
    expect(JSON.stringify(sim.state)).toBe(before);
  });

  it('clamps coast inspection to exact first-contact and zone-exit endpoints without predicting beyond a terminal event', () => {
    const sim = flight(); sim.canvas._dockSetHorizon(120);
    for (const setup of [
      { x: .6, y: -5.37, vx: 0, vy: .3, terminal: 'contact' },
      { x: 400, y: -30, vx: 1, vy: 0, terminal: 'exit' },
      { x: 80, y: -10, vx: 0, vy: 1, terminal: 'exit' },
    ]) {
      Object.assign(sim.state, { x: setup.x, y: setup.y, vx: setup.vx, vy: setup.vy });
      const forecast = sim.canvas._dockForecast(), end = forecast.endpoint, before = JSON.stringify(sim.state);
      expect(forecast.terminal).toBe(setup.terminal);
      expect(sim.canvas._dockForecastSample(end.time)).toMatchObject(end);
      expect(sim.canvas._dockForecastSample(end.time + 100)).toMatchObject(end);
      const half = sim.canvas._dockForecastSample(end.time / 2);
      expect(half.x).toBeCloseTo(setup.x + setup.vx * half.time, 9);
      expect(half.y).toBeCloseTo(setup.y + setup.vy * half.time, 9);
      expect(half.time).toBeLessThan(end.time);
      sim.canvas._dockSetForecastTime(120);
      expect(sim.canvas._dockForecastInspection().time).toBe(end.time);
      expect(JSON.stringify(sim.state)).toBe(before);
    }
  });

  it('keeps the forecast-time selector outside live state and preserves pause, thrust, rate hold and fuel controls', () => {
    const sim = flight();
    for (const mode of ['running', 'thrust', 'hold', 'paused']) {
      if (mode === 'thrust') sim.canvas._dockSetThrust('fwd', true);
      if (mode === 'hold') sim.canvas._dockSetDamp();
      if (mode === 'paused') sim.canvas._dockTogglePause();
      const before = JSON.stringify(sim.state), reports = sim.reports.length;
      for (const value of [0, 7.125, ' 12.375 ', -5, 1e6, 'end']) {
        sim.canvas._dockSetForecastTime(value);
        const inspection = sim.canvas._dockForecastInspection();
        expect(inspection.followingEnd).toBe(value === 'end');
        expect(inspection.time).toBe(value === 'end' ? inspection.duration : Math.max(0, Math.min(inspection.duration, Number(value))));
        expect(JSON.stringify(sim.state)).toBe(before);
      }
      sim.canvas._dockSetForecastTime(7.125);
      const selected = sim.canvas._dockForecastInspection();
      for (const invalid of [undefined, null, false, true, [], {}, '', '  ', 'bad', 'END', NaN, Infinity, -Infinity]) {
        sim.canvas._dockSetForecastTime(invalid);
        expect(sim.canvas._dockForecastInspection()).toEqual(selected);
        expect(JSON.stringify(sim.state)).toBe(before);
      }
      expect(sim.reports).toHaveLength(reports);
    }
  });

  it('retains a fixed forecast offset as live flight changes, clamps horizon changes and restores endpoint following on practice reset', () => {
    const sim = flight();
    expect(sim.canvas._dockForecastInspection()).toMatchObject({ time: 60, duration: 60, followingEnd: true });
    sim.canvas._dockSetForecastTime(12.345); sim.advance(5);
    let inspection = sim.canvas._dockForecastInspection();
    expect(inspection.time).toBe(12.345); expect(inspection.followingEnd).toBe(false);
    expect(inspection.y).toBeCloseTo(sim.state.y + sim.state.vy * 12.345, 10);
    const live = { x: sim.state.x, y: sim.state.y, vx: sim.state.vx, vy: sim.state.vy };
    Object.assign(sim.state, { x: 0, y: -5.5, vx: 0, vy: 1 });
    inspection = sim.canvas._dockForecastInspection();
    expect(inspection.time).toBe(inspection.duration); expect(inspection.duration).toBeCloseTo(.5, 7); expect(inspection.followingEnd).toBe(false);
    Object.assign(sim.state, live);
    expect(sim.canvas._dockForecastInspection().time).toBe(12.345);
    sim.canvas._dockSetHorizon(120); sim.canvas._dockSetForecastTime(90); sim.canvas._dockSetHorizon(30);
    expect(sim.canvas._dockForecastInspection()).toMatchObject({ time: 30, duration: 30, followingEnd: false });
    sim.canvas._dockSetHorizon(120);
    expect(sim.canvas._dockForecastInspection().time).toBe(30);
    sim.canvas._dockSetForecastTime('end');
    expect(sim.canvas._dockForecastInspection()).toMatchObject({ time: 120, duration: 120, followingEnd: true });
    sim.canvas._dockSetForecastTime(0); sim.canvas._dockReset(false);
    inspection = sim.canvas._dockForecastInspection();
    expect(inspection.followingEnd).toBe(true); expect(inspection.time).toBe(inspection.duration);
    sim.canvas._dockSetForecastTime(7); sim.canvas._dockSetScenario('final');
    inspection = sim.canvas._dockForecastInspection();
    expect(inspection.followingEnd).toBe(true); expect(inspection.time).toBe(inspection.duration); expect(sim.state.paused).toBe(true);
  });

  it('places equal-time forecast ticks strictly inside the flight and collapses completed runs to the current state', () => {
    const sim = flight();
    for (const horizon of [30, 60, 120]) {
      sim.canvas._dockSetHorizon(horizon);
      const inspection = sim.canvas._dockForecastInspection(), interval = horizon / 6;
      expect(inspection.interval).toBe(interval);
      expect(inspection.ticks.map(point => point.time)).toEqual([1, 2, 3, 4, 5].map(i => i * interval));
      for (const point of inspection.ticks) expect(point).toEqual(sim.canvas._dockForecastSample(point.time));
    }
    Object.assign(sim.state, { x: 0, y: -25, vx: 0, vy: .3 });
    let inspection = sim.canvas._dockForecastInspection();
    expect(inspection.ticks.map(point => point.time)).toEqual([20, 40, 60]);
    expect(inspection.ticks.every(point => point.time > 0 && point.time < inspection.duration)).toBe(true);
    Object.assign(sim.state, { x: 0, y: -5.01, vx: 0, vy: .3 });
    sim.canvas._dockSetForecastTime(5); sim.advance(.5);
    expect(sim.state.over).toBe(true);
    const before = JSON.stringify(sim.state);
    inspection = sim.canvas._dockForecastInspection();
    expect(inspection.duration).toBe(0); expect(inspection.time).toBe(0); expect(inspection.ticks).toEqual([]);
    for (const time of [0, -1, 100, NaN]) {
      const sample = sim.canvas._dockForecastSample(time);
      expect(sample).toMatchObject({ x: sim.state.x, y: sim.state.y, vx: sim.state.vx, vy: sim.state.vy, time: 0 });
      for (const key of ['range', 'offset', 'speed', 'closing']) expect(Number.isFinite(sample[key])).toBe(true);
    }
    sim.canvas._dockSetForecastTime('end'); expect(sim.canvas._dockForecastInspection().followingEnd).toBe(true);
    expect(JSON.stringify(sim.state)).toBe(before);
  });

  it.each([.25, .5, 1, 2])('delivers a %s-second pulse using the real propellant budget and rocket equation', (seconds) => {
    const sim = flight({ timeScale: 8 });
    sim.canvas._dockSetPulseSeconds(seconds);
    sim.canvas._dockManeuver('fwd');
    const fuel = 400 * seconds / (220 * 9.80665);
    const deltaV = 220 * 9.80665 * Math.log(8080 / (8080 - fuel));
    expect(sim.state.t).toBeCloseTo(seconds, 10);
    expect(sim.state.propellant).toBeCloseTo(80 - fuel, 10);
    expect(sim.state.vy - 1).toBeCloseTo(deltaV, 9);
    expect(sim.state.lastManeuver.thrustDeltaV).toBeCloseTo(deltaV, 9);
    expect(sim.state.lastManeuver.usedFuel).toBeCloseTo(fuel, 10);
    expect(sim.state.paused).toBe(true);
    expect(Object.values(sim.state.thrust).some(Boolean)).toBe(false);
    const after = JSON.stringify(sim.state);
    sim.advance(10);
    expect(JSON.stringify(sim.state)).toBe(after);
  });

  it.each(['back', 'up', 'down', 'fwd'])('matches a held orbital burn when stepping the %s thruster', (direction) => {
    const held = flight({ orbital: true });
    held.canvas._dockSetThrust(direction, true);
    held.advance(1);
    const pulse = flight({ orbital: true });
    pulse.canvas._dockSetPulseSeconds(1);
    pulse.canvas._dockManeuver(direction);
    for (const key of ['x', 'y', 'vx', 'vy', 'propellant', 'deltaV', 't']) expect(pulse.state[key]).toBeCloseTo(held.state[key], 9);
  });

  it('uses quarter-strength precision pulses and releases other controls before a coast step', () => {
    const sim = flight({ orbital: true });
    sim.canvas._dockSetPrecision();
    sim.canvas._dockSetPulseSeconds(1);
    sim.canvas._dockManeuver('fwd');
    expect(sim.state.lastManeuver.usedFuel).toBeCloseTo(100 / (220 * 9.80665), 10);
    const propellant = sim.state.propellant;
    sim.canvas._dockSetDamp();
    sim.canvas._dockManeuver('coast');
    expect(sim.state.lastManeuver.seconds).toBeCloseTo(5, 9);
    expect(sim.state.lastManeuver.usedFuel).toBe(0);
    expect(sim.state.lastManeuver.thrustDeltaV).toBe(0);
    expect(sim.state.lastManeuver.dvx).toBeGreaterThan(0);
    expect(sim.state.propellant).toBe(propellant);
    expect(sim.state.damp).toBe(false);
    expect(sim.state.paused).toBe(true);
    expect(Object.values(sim.state.thrust).some(Boolean)).toBe(false);
  });

  it('limits a nearly empty pulse to its actual reserve and permits unpowered stepping afterward', () => {
    const sim = flight();
    sim.state.propellant = .0001;
    sim.state.fuel = .0001 / 80 * 100;
    sim.canvas._dockManeuver('fwd');
    expect(sim.state.propellant).toBe(0);
    expect(sim.state.lastManeuver.usedFuel).toBe(.0001);
    expect(sim.state.lastManeuver.thrustDeltaV).toBeCloseTo(220 * 9.80665 * Math.log1p(.0001 / 8000), 10);
    const empty = JSON.stringify(sim.state);
    sim.canvas._dockManeuver('up');
    expect(JSON.stringify(sim.state)).toBe(empty);
    sim.canvas._dockManeuver('coast');
    expect(sim.state.t).toBeCloseTo(5.5, 9);
    expect(sim.state.lastManeuver.usedFuel).toBe(0);
  });

  it('ends a step at contact without extra ticks or duplicate completion reports', () => {
    const sim = flight();
    Object.assign(sim.state, { x: 0, y: -5.01, vx: 0, vy: .3 });
    sim.canvas._dockManeuver('fwd');
    expect(sim.state.overResult).toBe('docked');
    expect(sim.state.lastManeuver.seconds).toBeLessThan(.5);
    expect(sim.state.lastManeuver.seconds).toBeCloseTo(sim.state.t, 10);
    const end = JSON.stringify(sim.state);
    sim.canvas._dockManeuver('coast');
    sim.canvas._dockManeuver('fwd');
    expect(JSON.stringify(sim.state)).toBe(end);
    expect(sim.reports).toHaveLength(1);
  });

  it('records the actual sub-tick coast contact time in flight, maneuver and debrief', () => {
    const sim = flight();
    Object.assign(sim.state, { x: 0, y: -5.001, vx: 0, vy: .3 });
    const forecast = sim.canvas._dockForecast();
    sim.canvas._dockManeuver('coast');
    expect(sim.state.overResult).toBe('docked');
    expect(sim.state.t).toBeCloseTo(.001 / .3, 11);
    expect(sim.state.t).toBeLessThan(1 / 60);
    expect(sim.state.t).toBeCloseTo(forecast.endpoint.time, 6);
    expect(sim.state.lastManeuver.seconds).toBe(sim.state.t);
    expect(sim.reports[0].dockDebrief.elapsed).toBe(sim.state.t);
    expect(sim.state.propellant).toBe(80);
    expect(sim.state.deltaV).toBe(0);
    expect(sim.reports).toHaveLength(1);
  });

  it('charges a powered contact only for thrust delivered before the physical event', () => {
    const sim = flight();
    const exhaust = 220 * 9.80665, rate = 400 / exhaust, mass = 8080, targetTime = .01;
    // Independently integrate the variable-mass rocket velocity over 10 ms.
    const slices = 1000, dt = targetTime / slices;
    let distance = 0;
    for (let i = 0; i < slices; i++) distance += (.3 - exhaust * Math.log1p(-rate * ((i + .5) * dt) / mass)) * dt;
    Object.assign(sim.state, { x: 0, y: -5 - distance, vx: 0, vy: .3 });
    sim.canvas._dockManeuver('fwd');
    expect(sim.state.overResult).toBe('docked');
    expect(sim.state.t).toBeCloseTo(targetTime, 10);
    const used = rate * sim.state.t, delta = -exhaust * Math.log1p(-used / mass);
    expect(80 - sim.state.propellant).toBeCloseTo(used, 11);
    expect(sim.state.lastManeuver.usedFuel).toBeCloseTo(used, 11);
    expect(sim.state.deltaV).toBeCloseTo(delta, 11);
    expect(sim.state.vy).toBeCloseTo(.3 + delta, 10);
    expect(sim.reports[0].dockDebrief.propellantUsed).toBeCloseTo(used, 11);
    expect(sim.reports[0].dockDebrief.elapsed).toBe(sim.state.t);
    const terminal = JSON.stringify(sim.state);
    sim.advance(2);
    expect(JSON.stringify(sim.state)).toBe(terminal);
    expect(sim.reports).toHaveLength(1);
  });

  it('burns the last propellant first and then coasts for the remainder of its tick', () => {
    const sim = flight(), reserve = .001, exhaust = 220 * 9.80665, rate = 400 / exhaust;
    const burnTime = reserve / rate, initialMass = 8000 + reserve, pulse = .25;
    Object.assign(sim.state, { x: 0, y: -190, vx: 0, vy: 0, propellant: reserve, fuel: reserve / 80 * 100 });
    sim.canvas._dockSetPulseSeconds(pulse);
    sim.canvas._dockManeuver('fwd');
    const delta = exhaust * Math.log1p(reserve / 8000);
    const poweredDistance = exhaust * (burnTime - 8000 / rate * Math.log1p(reserve / 8000));
    expect(burnTime).toBeLessThan(1 / 60);
    expect(sim.state.t).toBeCloseTo(pulse, 12);
    expect(sim.state.vy).toBeCloseTo(delta, 12);
    expect(sim.state.y).toBeCloseTo(-190 + poweredDistance + delta * (pulse - burnTime), 9);
    expect(sim.state.propellant).toBe(0);
    expect(sim.state.over).toBe(false);
    expect(sim.state.lastManeuver.usedFuel).toBe(reserve);
    expect(sim.state.deltaV).toBeCloseTo(delta, 12);
    expect(sim.state.firing).toEqual({});
  });

  it('continues fuel-free slow motion inside the zone and announces depletion once', () => {
    const sim = flight({ orbital: true });
    Object.assign(sim.state, { x: 26, y: -190, vx: 0, vy: .01, propellant: 0, fuel: 0 });
    const expected = sim.canvas._dockForecastSample(10);
    sim.advance(10);
    expect(sim.state.over).toBe(false);
    expect(sim.state.t).toBeCloseTo(10, 9);
    for (const key of ['x', 'y', 'vx', 'vy']) expect(sim.state[key]).toBeCloseTo(expected[key], 8);
    expect(sim.state.propellant).toBe(0);
    expect(sim.reports).toHaveLength(0);
    expect(sim.hud.textContent).toContain('Propellant depleted: unpowered flight continues');
    expect(sim.announcements.filter(message => message.startsWith('Propellant depleted.'))).toHaveLength(1);
    sim.advance(2);
    expect(sim.announcements.filter(message => message.startsWith('Propellant depleted.'))).toHaveLength(1);
  });

  it.each([
    { x: 419.999, y: 0, vx: .3, vy: 0 },
    { x: 100, y: 34.999, vx: 0, vy: .3 }
  ])('ends at the first sub-tick approach-zone exit: %j', initial => {
    const sim = flight();
    Object.assign(sim.state, initial);
    const forecast = sim.canvas._dockForecast();
    sim.canvas._dockManeuver('coast');
    expect(sim.state.overResult).toBe('drift');
    expect(sim.state.t).toBeCloseTo(.001 / .3, 10);
    expect(sim.state.t).toBeCloseTo(forecast.endpoint.time, 6);
    expect(sim.state.lastManeuver.seconds).toBe(sim.state.t);
    expect(sim.reports[0].dockDebrief.elapsed).toBe(sim.state.t);
    expect(sim.state.propellant).toBe(80);
    expect(sim.reports).toHaveLength(1);
  });

  it('matches orbital coast forecast contact and never evolves an already-exited state', () => {
    const sim = flight({ orbital: true });
    Object.assign(sim.state, { x: .6, y: -5.001, vx: -.015, vy: .24 });
    const forecast = sim.canvas._dockForecast();
    sim.canvas._dockManeuver('coast');
    expect(sim.state.overResult).toBe('docked');
    expect(sim.state.t).toBeCloseTo(forecast.endpoint.time, 6);
    for (const key of ['x', 'y', 'vx', 'vy']) expect(sim.state[key]).toBeCloseTo(forecast.endpoint[key], 7);
    sim.canvas._dockReset(true);
    Object.assign(sim.state, { x: 421, y: 0, vx: .2, vy: 0 });
    sim.canvas._dockManeuver('fwd');
    expect(sim.state.t).toBe(0);
    expect(sim.state.propellant).toBe(80);
    expect(sim.state.deltaV).toBe(0);
    expect(sim.state).toMatchObject({ x: 421, y: 0, vx: .2, vy: 0, overResult: 'drift' });
    expect(sim.reports).toHaveLength(2);
  });

  it('ignores invalid or hidden-page commands and clears step feedback when resuming or resetting', () => {
    const sim = flight();
    const before = JSON.stringify(sim.state);
    for (const value of ['bad', '__proto__', 'constructor']) sim.canvas._dockManeuver(value);
    for (const value of ['bad', -1, 0, Infinity, NaN]) sim.canvas._dockSetPulseSeconds(value);
    sim.canvas._dockSetCamera('bad');
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    sim.canvas._dockManeuver('fwd');
    expect(JSON.stringify(sim.state)).toBe(before);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    sim.canvas._dockManeuver('coast');
    sim.canvas._dockTogglePause();
    expect(sim.state.lastManeuver).toBeNull();
    sim.canvas._dockManeuver('coast');
    sim.canvas._dockSetScenario('final');
    expect(sim.state.lastManeuver).toBeNull();
  });

  it('fits the full coast path and port isotropically while keeping selection and existing camera modes independent', () => {
    const sim = flight({ orbital: true });
    sim.canvas._dockSetHorizon(120);
    const approach = sim.canvas._dockViewSnapshot();
    sim.canvas._dockSetCamera('wide'); const wide = sim.canvas._dockViewSnapshot();
    expect(wide.ox).toBe(550); expect(wide.oy).toBe(208); expect(wide.scale).toBe(Math.min(1.35, approach.scale));
    sim.canvas._dockSetCamera('forecast'); const before = JSON.stringify(sim.state);
    function checkFit() {
      const view = sim.canvas._dockViewSnapshot(), forecast = sim.canvas._dockForecast();
      const points = [...forecast.points, { x: -2.5, y: -5 }, { x: 2.5, y: -5 }, { x: 0, y: 0 }];
      const along = points.map(point => view.ox + point.y * view.scale), radial = points.map(point => view.oy - point.x * view.scale);
      expect(view.scale).toBeGreaterThan(0); expect(view.scale).toBeLessThanOrEqual(14);
      expect(Math.min(...along)).toBeGreaterThanOrEqual(48 - 1e-10); expect(Math.max(...along)).toBeLessThanOrEqual(560 + 1e-10);
      expect(Math.min(...radial)).toBeGreaterThanOrEqual(150 - 1e-10); expect(Math.max(...radial)).toBeLessThanOrEqual(296 + 1e-10);
      expect((Math.min(...along) + Math.max(...along)) / 2).toBeCloseTo(304, 10);
      expect((Math.min(...radial) + Math.max(...radial)) / 2).toBeCloseTo(223, 10);
      expect(view.portX).toBeCloseTo(view.ox - 5 * view.scale, 10);
      expect((view.ox + 10 * view.scale) - view.ox).toBeCloseTo(view.oy - (view.oy - 10 * view.scale), 10);
      return view;
    }
    const fit = checkFit();
    for (const time of [0, 17.125, 60, 'end']) { sim.canvas._dockSetForecastTime(time); expect(checkFit()).toEqual(fit); }
    expect(JSON.stringify(sim.state)).toBe(before);
    sim.canvas._dockSetCamera('wide'); expect(sim.canvas._dockViewSnapshot()).toEqual(wide);
    sim.canvas._dockSetCamera('approach'); expect(sim.canvas._dockViewSnapshot()).toEqual(approach);
    sim.canvas._dockSetCamera('forecast');
    for (const state of [{ x: .6, y: -25, vx: -.015, vy: .24 }, { x: -120, y: -180, vx: 1.5, vy: .3 }, { x: 400, y: -30, vx: 1, vy: 0 }, { x: 0, y: -5.01, vx: 0, vy: .3 }]) { Object.assign(sim.state, state); checkFit(); }
  });

  it('hit-tests forecast knots and segment interiors in CSS pixels with a fixed tolerance and earliest stationary tie', () => {
    const sim = flight(); sim.canvas._dockSetCamera('forecast'); sim.canvas._dockSetForecastTime(12.125);
    const before = JSON.stringify(sim.state), inspection = sim.canvas._dockForecastInspection(), forecast = sim.canvas._dockForecast(), view = sim.canvas._dockViewSnapshot();
    for (const rect of [{ left: 13, top: 23, width: 640, height: 360 }, { left: -7, top: 41, width: 320, height: 180 }, { left: 17, top: 11, width: 320, height: 360 }]) {
      const screen = point => ({ x: rect.left + (view.ox + point.y * view.scale) / 640 * rect.width, y: rect.top + (view.oy - point.x * view.scale) / 360 * rect.height });
      for (const point of [forecast.points[0], forecast.points[3], forecast.endpoint]) {
        const pos = screen(point), hit = sim.canvas._dockForecastHitTest(pos.x, pos.y, rect);
        expect(hit).not.toBeNull(); expect(hit.time).toBeCloseTo(point.time, 9); expect(hit.distance).toBeCloseTo(0, 9);
      }
      const a = forecast.points[7], b = forecast.points[8], weight = .37, pos = screen({ x: a.x + (b.x - a.x) * weight, y: a.y + (b.y - a.y) * weight });
      const inside = sim.canvas._dockForecastHitTest(pos.x, pos.y, rect);
      expect(inside.time).toBeCloseTo(a.time + (b.time - a.time) * weight, 9); expect(inside.distance).toBeCloseTo(0, 9);
      const near = sim.canvas._dockForecastHitTest(pos.x, pos.y + 23.5, rect);
      expect(near).not.toBeNull(); expect(near.distance).toBeCloseTo(23.5, 8); expect(near.time).toBeCloseTo(inside.time, 8);
      expect(sim.canvas._dockForecastHitTest(pos.x, pos.y + 24.5, rect)).toBeNull();
    }
    expect(JSON.stringify(sim.state)).toBe(before); expect(sim.canvas._dockForecastInspection()).toEqual(inspection);
    Object.assign(sim.state, { x: 0, y: -40, vx: 0, vy: 0 });
    const stationary = sim.canvas._dockViewSnapshot(), rect = { left: 0, top: 0, width: 640, height: 360 };
    expect(sim.canvas._dockForecastHitTest(stationary.ox - 40 * stationary.scale, stationary.oy, rect)).toEqual({ time: 0, distance: 0 });
  });

  it('rejects malformed, out-of-plot and completed forecast hits without changing the inspected time or live flight', () => {
    const sim = flight(); sim.canvas._dockSetCamera('forecast'); sim.canvas._dockSetForecastTime(17.125);
    const rect = { left: 13, top: 23, width: 640, height: 360 }, view = sim.canvas._dockViewSnapshot(), px = rect.left + view.ox + sim.state.y * view.scale, py = rect.top + view.oy - sim.state.x * view.scale;
    const before = JSON.stringify(sim.state), selected = sim.canvas._dockForecastInspection();
    for (const bounds of [null, undefined, {}, { ...rect, width: 0 }, { ...rect, width: -1 }, { ...rect, height: 0 }, { ...rect, height: -1 }, { ...rect, left: NaN }, { ...rect, top: Infinity }, { ...rect, width: Infinity }, { ...rect, height: NaN }]) expect(sim.canvas._dockForecastHitTest(px, py, bounds)).toBeNull();
    for (const value of [undefined, null, NaN, Infinity, -Infinity, '20', [], {}]) { expect(sim.canvas._dockForecastHitTest(value, py, rect)).toBeNull(); expect(sim.canvas._dockForecastHitTest(px, value, rect)).toBeNull(); }
    for (const [x, y] of [[14, 200], [626, 200], [200, 124], [200, 323]]) expect(sim.canvas._dockForecastHitTest(rect.left + x, rect.top + y, rect)).toBeNull();
    expect(JSON.stringify(sim.state)).toBe(before); expect(sim.canvas._dockForecastInspection()).toEqual(selected);
    Object.assign(sim.state, { x: -30, y: -20, vx: 0, vy: .1 }); sim.canvas._dockSetCamera('wide');
    const obscured = sim.canvas._dockForecastSample(10), wide = sim.canvas._dockViewSnapshot();
    const hiddenX = wide.ox + obscured.y * wide.scale, hiddenY = wide.oy - obscured.x * wide.scale;
    expect(hiddenX).toBeGreaterThanOrEqual(462); expect(hiddenX).toBeLessThanOrEqual(626);
    expect(hiddenY).toBeGreaterThanOrEqual(232); expect(hiddenY).toBeLessThanOrEqual(334);
    const beforeOccludedHit = JSON.stringify(sim.state), selectedBeforeOccludedHit = sim.canvas._dockForecastInspection();
    expect(sim.canvas._dockForecastHitTest(rect.left + hiddenX, rect.top + hiddenY, rect)).toBeNull();
    expect(JSON.stringify(sim.state)).toBe(beforeOccludedHit); expect(sim.canvas._dockForecastInspection()).toEqual(selectedBeforeOccludedHit);
    sim.canvas._dockSetCamera('forecast');
    Object.assign(sim.state, { x: 0, y: -5.01, vx: 0, vy: .3 });
    const terminal = sim.canvas._dockForecast().endpoint, terminalView = sim.canvas._dockViewSnapshot();
    const terminalHit = sim.canvas._dockForecastHitTest(rect.left + terminalView.ox + terminal.y * terminalView.scale, rect.top + terminalView.oy - terminal.x * terminalView.scale, rect);
    expect(terminalHit.time).toBeCloseTo(terminal.time, 9); expect(terminalHit.distance).toBeCloseTo(0, 9);
    sim.advance(.5);
    const ended = JSON.stringify(sim.state), endView = sim.canvas._dockViewSnapshot();
    expect(sim.canvas._dockForecastHitTest(rect.left + endView.ox + sim.state.y * endView.scale, rect.top + endView.oy - sim.state.x * endView.scale, rect)).toBeNull();
    expect(JSON.stringify(sim.state)).toBe(ended);
  });

  it('selects a coast instant by primary unmodified canvas click while preserving live controls and removes the listener on cleanup', () => {
    const sim = flight(); sim.canvas._dockSetCamera('forecast');
    const rect = { left: 31, top: 19, width: 480, height: 270 }; sim.canvas.getBoundingClientRect = () => rect;
    function clickPoint(time) { const point = sim.canvas._dockForecastSample(time), view = sim.canvas._dockViewSnapshot(); return { clientX: rect.left + (view.ox + point.y * view.scale) / 640 * rect.width, clientY: rect.top + (view.oy - point.x * view.scale) / 360 * rect.height }; }
    for (const mode of ['running', 'thrust', 'hold', 'paused']) {
      if (mode === 'thrust') sim.canvas._dockSetThrust('fwd', true);
      if (mode === 'hold') sim.canvas._dockSetDamp();
      if (mode === 'paused') sim.canvas._dockTogglePause();
      sim.canvas._dockSetForecastTime('end'); const before = JSON.stringify(sim.state), end = sim.canvas._dockForecastInspection();
      for (const invalid of [{ button: 2 }, { button: 1 }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { metaKey: true }]) {
        sim.emit('click', { button: 0, isPrimary: true, ...clickPoint(18), ...invalid });
        expect(sim.canvas._dockForecastInspection()).toEqual(end); expect(JSON.stringify(sim.state)).toBe(before);
      }
      // Chromium native mouse/touch clicks can report isPrimary=false.
      sim.emit('click', { button: 0, isPrimary: false, ...clickPoint(18) });
      expect(sim.canvas._dockForecastInspection().time).toBeCloseTo(18, 8); expect(sim.canvas._dockForecastInspection().followingEnd).toBe(false); expect(JSON.stringify(sim.state)).toBe(before);
      sim.emit('click', { button: 0, clientX: rect.left, clientY: rect.top });
      expect(sim.canvas._dockForecastInspection().time).toBeCloseTo(18, 8); expect(JSON.stringify(sim.state)).toBe(before);
    }
    const selected = sim.canvas._dockForecastInspection(); sim.canvas._dockCleanup();
    sim.emit('click', { button: 0, isPrimary: true, ...clickPoint(30) }); expect(sim.canvas._dockForecastInspection()).toEqual(selected);
  });

  it('finds the analytic closest range of an unpowered off-axis flyby and starts that practice paused', () => {
    const sim = flight(); sim.canvas._dockSetScenario('flyby'); sim.canvas._dockSetHorizon(120);
    expect(sim.state).toMatchObject({ scenario: 'flyby', x: 85, y: -55, vx: -.1, vy: 1.2, paused: true, propellant: 80, fuel: 100 });
    const before = JSON.stringify(sim.state), expectedTime = -(85 * -.1 + -55 * 1.2) / (.1 ** 2 + 1.2 ** 2), closest = sim.canvas._dockClosestApproach();
    expect(closest.boundary).toBe('interior'); expect(closest.time).toBeCloseTo(expectedTime, 7);
    expect(closest.x).toBeCloseTo(85 - .1 * expectedTime, 8); expect(closest.y).toBeCloseTo(-55 + 1.2 * expectedTime, 8);
    expect(closest.range).toBeCloseTo(Math.hypot(85 - .1 * expectedTime, -55 + 1.2 * expectedTime), 8);
    expect(closest.offset).toBeCloseTo(Math.abs(closest.x), 10); expect(closest.speed).toBeCloseTo(Math.hypot(.1, 1.2), 10); expect(closest.closing).toBeCloseTo(0, 8);
    expect(closest.time).toBeGreaterThan(sim.canvas._dockForecast().planeCrossing.time);
    expect(sim.canvas._dockForecast().capture).toBe(false); expect(JSON.stringify(sim.state)).toBe(before);
  });

  it('chooses the earliest time for a flat or receding coast and the exact horizon endpoint when range is still shrinking', () => {
    const sim = flight(); sim.canvas._dockSetHorizon(30);
    for (const setup of [
      { x: 20, y: -40, vx: .2, vy: -.4 },
      { x: 10, y: -40, vx: 0, vy: 0 },
    ]) {
      Object.assign(sim.state, setup); const closest = sim.canvas._dockClosestApproach();
      expect(closest).toMatchObject({ ...setup, time: 0, boundary: 'now' });
      expect(closest.range).toBeCloseTo(Math.hypot(setup.x, setup.y), 12);
    }
    Object.assign(sim.state, { x: 26, y: -190, vx: 0, vy: 1 });
    const end = sim.canvas._dockForecast().endpoint, closest = sim.canvas._dockClosestApproach();
    expect(closest).toMatchObject({ ...end, boundary: 'end' }); expect(closest.time).toBe(30); expect(closest.closing).toBeGreaterThan(0);
  });

  it('limits closest-approach searches to exact first-contact or approach-zone-exit events', () => {
    const sim = flight(); sim.canvas._dockSetHorizon(120);
    for (const setup of [
      { x: .6, y: -25, vx: -.015, vy: .24, terminal: 'contact' },
      { x: 400, y: -10, vx: -1, vy: 1, terminal: 'exit' },
    ]) {
      Object.assign(sim.state, { x: setup.x, y: setup.y, vx: setup.vx, vy: setup.vy });
      const forecast = sim.canvas._dockForecast(), closest = sim.canvas._dockClosestApproach();
      const unconstrained = -(setup.x * setup.vx + setup.y * setup.vy) / (setup.vx ** 2 + setup.vy ** 2);
      expect(forecast.terminal).toBe(setup.terminal); expect(unconstrained).toBeGreaterThan(forecast.endpoint.time);
      expect(closest.boundary).toBe('end'); expect(closest).toMatchObject(forecast.endpoint); expect(closest.range).toBe(forecast.range);
      expect(closest.time).toBeLessThan(120); expect(closest.closing).toBeGreaterThan(0);
    }
  });

  it('matches an independent analytic HCW minimum between forecast knots', () => {
    const sim = flight({ orbital: true }); sim.canvas._dockSetScenario('flyby'); sim.canvas._dockSetHorizon(120);
    const initial = { x: sim.state.x, y: sim.state.y, vx: sim.state.vx, vy: sim.state.vy }, n = Math.sqrt(3.986004418e14 / (6791000 ** 3));
    function analytic(time) {
      const c = Math.cos(n * time), sn = Math.sin(n * time);
      const x = (4 - 3 * c) * initial.x + sn / n * initial.vx + 2 * (1 - c) / n * initial.vy;
      const y = 6 * (sn - n * time) * initial.x + initial.y - 2 * (1 - c) / n * initial.vx + (4 * sn - 3 * n * time) / n * initial.vy;
      return { x, y, range: Math.hypot(x, y) };
    }
    const duration = sim.canvas._dockForecast().endpoint.time, grid = Array.from({ length: 2001 }, (_, i) => ({ time: duration * i / 2000, ...analytic(duration * i / 2000) }));
    let best = 0; for (let i = 1; i < grid.length; i++) if (grid[i].range < grid[best].range) best = i;
    expect(best).toBeGreaterThan(0); expect(best).toBeLessThan(2000);
    let low = grid[best - 1].time, high = grid[best + 1].time;
    for (let i = 0; i < 60; i++) { const a = low + (high - low) / 3, b = high - (high - low) / 3; if (analytic(a).range <= analytic(b).range) high = b; else low = a; }
    const expectedTime = (low + high) / 2, expected = analytic(expectedTime), closest = sim.canvas._dockClosestApproach();
    expect(closest.boundary).toBe('interior'); expect(closest.time).toBeCloseTo(expectedTime, 4);
    expect(closest.x).toBeCloseTo(expected.x, 5); expect(closest.y).toBeCloseTo(expected.y, 5); expect(closest.range).toBeCloseTo(expected.range, 7);
    expect(closest.closing).toBeCloseTo(0, 7);
    expect(Math.abs(closest.time / 2 - Math.round(closest.time / 2))).toBeGreaterThan(.01);
  });

  it('keeps closest-range queries deterministic and read-only while invalidating predictions after state, horizon and practice changes', () => {
    const sim = flight(); sim.canvas._dockSetScenario('flyby'); sim.canvas._dockSetHorizon(120);
    const before = JSON.stringify(sim.state), first = sim.canvas._dockClosestApproach();
    expect(sim.canvas._dockClosestApproach()).toEqual(first); sim.canvas._dockSetForecastTime(7.125); expect(sim.canvas._dockClosestApproach()).toEqual(first); expect(JSON.stringify(sim.state)).toBe(before);
    sim.canvas._dockSetHorizon(30); const short = sim.canvas._dockClosestApproach();
    expect(short).toMatchObject({ time: 30, boundary: 'end' }); expect(short.range).toBeGreaterThan(first.range);
    sim.canvas._dockSetHorizon(120); expect(sim.canvas._dockClosestApproach()).toEqual(first);
    sim.state.vx = -.5; const changed = sim.canvas._dockClosestApproach();
    expect(changed.time).not.toBe(first.time); expect(changed.range).not.toBe(first.range);
    sim.canvas._dockSetScenario('rendezvous'); const reset = sim.canvas._dockClosestApproach();
    expect(reset).toMatchObject({ time: 120, x: 26, y: -70, boundary: 'end' });
    sim.canvas._dockReset(true); const orbital = sim.canvas._dockClosestApproach();
    expect(orbital.range).not.toBe(reset.range); expect(orbital.x).not.toBe(reset.x);
  });

  it('inspects the exact closest instant in the fitted camera without disturbing flight controls and does nothing after completion', () => {
    const sim = flight(); sim.canvas._dockSetScenario('flyby'); sim.canvas._dockTogglePause();
    for (const mode of ['running', 'thrust', 'hold', 'paused']) {
      if (mode === 'thrust') sim.canvas._dockSetThrust('fwd', true);
      if (mode === 'hold') sim.canvas._dockSetDamp();
      if (mode === 'paused') sim.canvas._dockTogglePause();
      sim.canvas._dockSetCamera('wide'); sim.canvas._dockSetForecastTime('end');
      const before = JSON.parse(JSON.stringify(sim.state)), closest = sim.canvas._dockClosestApproach(), reports = sim.reports.length;
      sim.canvas._dockInspectClosest(); const inspected = sim.canvas._dockForecastInspection();
      expect(inspected.time).toBe(closest.time); expect(inspected.followingEnd).toBe(false);
      expect(JSON.parse(JSON.stringify(sim.state))).toEqual({ ...before, camera: 'forecast' }); expect(sim.reports).toHaveLength(reports);
    }
    sim.canvas._dockReset(false, 'final', false); Object.assign(sim.state, { x: 0, y: -5.01, vx: 0, vy: .3 }); sim.advance(.5);
    expect(sim.state.over).toBe(true); sim.canvas._dockSetCamera('wide'); sim.canvas._dockSetForecastTime('end');
    const ended = JSON.stringify(sim.state), selected = sim.canvas._dockForecastInspection(), closest = sim.canvas._dockClosestApproach();
    expect(closest).toMatchObject({ x: sim.state.x, y: sim.state.y, vx: sim.state.vx, vy: sim.state.vy, time: 0, boundary: 'now' });
    sim.canvas._dockInspectClosest(); expect(JSON.stringify(sim.state)).toBe(ended); expect(sim.canvas._dockForecastInspection()).toEqual(selected);
  });

  it('plots range against exact forecast time on stable zero-anchored axes with the selected and closest samples included', () => {
    const sim = flight({ orbital: true }); sim.canvas._dockSetScenario('flyby'); sim.canvas._dockSetHorizon(120); sim.canvas._dockSetForecastTime(17.125);
    const before = JSON.stringify(sim.state), forecast = sim.canvas._dockForecast(), closest = sim.canvas._dockClosestApproach();
    for (const [width, expectedWidth] of [[undefined, 640], [NaN, 640], [Infinity, 640], ['320', 640], [null, 640], [-10, 240], [180, 240], [320, 320], [640, 640], [2000, 1600]]) {
      const geometry = sim.canvas._dockRangeTimeline(width);
      expect(geometry).toMatchObject({ width: expectedWidth, height: 184, left: 50, right: expectedWidth - 18, top: 22, bottom: 142, duration: forecast.endpoint.time });
      expect(Number.isFinite(geometry.rangeMax)).toBe(true); expect(geometry.rangeMax).toBeGreaterThan(0);
      expect(geometry.rangeMax).toBeGreaterThanOrEqual(Math.max(...forecast.points.map(point => Math.hypot(point.x, point.y))));
      const times = geometry.points.map(point => point.time); expect(times).toEqual([...times].sort((a, b) => a - b)); expect(new Set(times).size).toBe(times.length);
      for (const point of forecast.points) expect(times).toContain(point.time);
      expect(times).toContain(17.125); expect(times).toContain(closest.time);
      for (const point of geometry.points) {
        expect(point.range).toBe(sim.canvas._dockForecastSample(point.time).range);
        expect(point.px).toBeCloseTo(geometry.left + point.time / geometry.duration * (geometry.right - geometry.left), 10);
        expect(point.py).toBeCloseTo(geometry.bottom - point.range / geometry.rangeMax * (geometry.bottom - geometry.top), 10);
        expect(point.py).toBeGreaterThanOrEqual(geometry.top - 1e-10); expect(point.py).toBeLessThanOrEqual(geometry.bottom);
      }
      expect(geometry.selected).toMatchObject(sim.canvas._dockForecastSample(17.125)); expect(geometry.closest).toMatchObject(closest);
      expect(geometry.points[0].px).toBe(geometry.left); expect(geometry.points.at(-1).px).toBe(geometry.right);
    }
    const bounds = sim.canvas._dockRangeTimeline(640);
    for (const time of [0, 17.125, closest.time, 'end']) {
      sim.canvas._dockSetForecastTime(time); const changed = sim.canvas._dockRangeTimeline(640);
      for (const key of ['left', 'right', 'top', 'bottom', 'duration', 'rangeMax']) expect(changed[key]).toBe(bounds[key]);
      expect(changed.selected.time).toBe(sim.canvas._dockForecastInspection().time);
    }
    expect(JSON.stringify(sim.state)).toBe(before);
  });

  it('maps CSS positions to the timeline time including scaled viewBox extremes, endpoint clamps and invalid input rejection', () => {
    const sim = flight(); sim.canvas._dockSetHorizon(120); sim.canvas._dockSetForecastTime(17.125);
    const before = JSON.stringify(sim.state), inspection = sim.canvas._dockForecastInspection();
    for (const width of [120, 320, 640, 2000]) {
      const rect = { left: 17, width }, geometry = sim.canvas._dockRangeTimeline(width);
      const clientX = fraction => rect.left + (geometry.left + (geometry.right - geometry.left) * fraction) / geometry.width * width;
      for (const fraction of [0, .123456789, .5, 1]) expect(sim.canvas._dockRangeTimeAt(clientX(fraction), rect)).toBeCloseTo(geometry.duration * fraction, 9);
      expect(sim.canvas._dockRangeTimeAt(clientX(-1), rect)).toBe(0); expect(sim.canvas._dockRangeTimeAt(clientX(2), rect)).toBe(geometry.duration);
    }
    const valid = { left: 17, width: 640 };
    for (const rect of [null, undefined, {}, { left: NaN, width: 640 }, { left: Infinity, width: 640 }, { left: 17, width: 0 }, { left: 17, width: -1 }, { left: 17, width: Infinity }, { left: 17, width: NaN }]) expect(sim.canvas._dockRangeTimeAt(150, rect)).toBeNull();
    for (const x of [undefined, null, NaN, Infinity, -Infinity, '150', [], {}]) expect(sim.canvas._dockRangeTimeAt(x, valid)).toBeNull();
    expect(JSON.stringify(sim.state)).toBe(before); expect(sim.canvas._dockForecastInspection()).toEqual(inspection);
  });

  it('collapses a completed range timeline to one finite current-state point and disables time selection', () => {
    const sim = flight(); Object.assign(sim.state, { x: 0, y: -5.01, vx: 0, vy: .3 }); sim.advance(.5);
    expect(sim.state.over).toBe(true); const before = JSON.stringify(sim.state), selected = sim.canvas._dockForecastInspection(), geometry = sim.canvas._dockRangeTimeline(390);
    expect(geometry.duration).toBe(0); expect(geometry.points).toHaveLength(1); expect(geometry.points[0].time).toBe(0); expect(geometry.points[0].range).toBe(Math.hypot(sim.state.x, sim.state.y));
    for (const point of [geometry.points[0], geometry.selected, geometry.closest]) { expect(Number.isFinite(point.px)).toBe(true); expect(Number.isFinite(point.py)).toBe(true); expect(point.time).toBe(0); }
    expect(sim.canvas._dockRangeTimeAt(200, { left: 0, width: 390 })).toBeNull();
    const pointer = rangePointerFixture(sim); pointer.send('down'); expect(pointer.captured.size).toBe(0);
    expect(JSON.stringify(sim.state)).toBe(before); expect(sim.canvas._dockForecastInspection()).toEqual(selected);
  });

  it('captures timeline selection through pointer-up without changing the live clock, fuel or active flight controls', () => {
    const sim = flight(); const pointer = rangePointerFixture(sim, { left: 17, top: 23, width: 320, height: 184 });
    for (const mode of ['running', 'thrust', 'hold', 'paused']) {
      if (mode === 'thrust') sim.canvas._dockSetThrust('fwd', true);
      if (mode === 'hold') sim.canvas._dockSetDamp();
      if (mode === 'paused') sim.canvas._dockTogglePause();
      sim.canvas._dockSetForecastTime('end'); const before = JSON.stringify(sim.state), duration = sim.canvas._dockForecastInspection().duration;
      for (const invalid of [{ button: 2 }, { button: 1 }, { isPrimary: false }, { ctrlKey: true }, { altKey: true }, { shiftKey: true }, { metaKey: true }]) { pointer.send('down', invalid); expect(pointer.captured.size).toBe(0); expect(sim.canvas._dockForecastInspection().followingEnd).toBe(true); }
      const down = pointer.send('down', { clientX: pointer.x(.25) }); expect(down.preventDefault).toHaveBeenCalled(); expect(pointer.target.focus).toHaveBeenCalledWith({ preventScroll: true }); expect(pointer.captured.has(301)).toBe(true); expect(sim.canvas._dockForecastInspection().time).toBeCloseTo(duration / 4, 10);
      pointer.send('down', { pointerId: 302, clientX: pointer.x(.9) }); pointer.send('move', { pointerId: 302, clientX: pointer.x(.9) }); expect(sim.canvas._dockForecastInspection().time).toBeCloseTo(duration / 4, 10);
      pointer.send('move', { clientX: pointer.x(.5), clientY: -1e6 }); expect(sim.canvas._dockForecastInspection().time).toBeCloseTo(duration / 2, 10);
      pointer.send('up', { clientX: pointer.x(.75) }); expect(sim.canvas._dockForecastInspection().time).toBeCloseTo(duration * .75, 10); expect(pointer.captured.size).toBe(0); expect(sim.canvas._dockForecastInspection().followingEnd).toBe(false);
      pointer.send('move', { clientX: pointer.x(0) }); expect(sim.canvas._dockForecastInspection().time).toBeCloseTo(duration * .75, 10); expect(JSON.stringify(sim.state)).toBe(before);
    }
  });

  it('cancels timeline gestures without a final seek and clears capture when forecast controls invalidate the drag', () => {
    const sim = flight(), pointer = rangePointerFixture(sim);
    for (const phase of ['cancel', 'lost', 'blur']) {
      pointer.send('down', { clientX: pointer.x(.25) }); const selected = sim.canvas._dockForecastInspection().time;
      if (phase === 'lost') pointer.captured.delete(301);
      pointer.send(phase, { clientX: pointer.x(.9) }); expect(pointer.captured.size).toBe(0); expect(sim.canvas._dockForecastInspection().time).toBe(selected);
      pointer.send('move', { clientX: pointer.x(.8) }); expect(sim.canvas._dockForecastInspection().time).toBe(selected);
    }
    pointer.send('down', { clientX: pointer.x(.3) }); const selected = sim.canvas._dockForecastInspection().time;
    pointer.send('move', { buttons: 0, pointerType: 'mouse', clientX: pointer.x(.8) }); expect(pointer.captured.size).toBe(0); expect(sim.canvas._dockForecastInspection().time).toBe(selected);
    pointer.send('down'); sim.canvas._dockSetForecastTime('end'); expect(pointer.captured.size).toBe(0); pointer.send('move', { clientX: pointer.x(0) }); expect(sim.canvas._dockForecastInspection().followingEnd).toBe(true);
    pointer.send('down'); sim.canvas._dockInspectClosest(); expect(pointer.captured.size).toBe(0); const closest = sim.canvas._dockForecastInspection(); pointer.send('move', { clientX: pointer.x(0) }); expect(sim.canvas._dockForecastInspection()).toEqual(closest);
    pointer.send('down'); sim.canvas._dockSetHorizon(30); expect(pointer.captured.size).toBe(0); const shortened = sim.canvas._dockForecastInspection(); pointer.send('move', { clientX: pointer.x(0) }); expect(sim.canvas._dockForecastInspection()).toEqual(shortened);
    pointer.send('down'); sim.canvas._dockReset(false); expect(pointer.captured.size).toBe(0); expect(sim.canvas._dockForecastInspection().followingEnd).toBe(true); pointer.send('up', { clientX: pointer.x(0) }); expect(sim.canvas._dockForecastInspection().followingEnd).toBe(true);
  });

  it('pins an immutable coast snapshot and saves, replaces or clears it without changing live flight or preview preferences', () => {
    const sim = flight(); sim.canvas._dockSetThrust('fwd', true); sim.advance(2); sim.canvas._dockSetCamera('wide'); sim.canvas._dockSetForecastTime(12.125);
    const before = JSON.stringify(sim.state), selected = sim.canvas._dockForecastInspection(), forecast = JSON.parse(JSON.stringify(sim.canvas._dockForecast()));
    sim.canvas._dockSaveCoast(); const saved = sim.canvas._dockCoastReference();
    expect(saved.epoch).toBe(sim.state.t); expect(saved.mode).toBe(false); expect(typeof saved.status).toBe('string'); expect(saved.status.length).toBeGreaterThan(0); expect(saved.forecast).toEqual(forecast);
    expect(JSON.stringify(sim.state)).toBe(before); expect(sim.canvas._dockForecastInspection()).toEqual(selected);
    const comparison = sim.canvas._dockCoastComparison(); expect(comparison).toMatchObject({ active: true, available: true, epoch: saved.epoch, deltaRange: 0, deltaSpeed: 0, deltaClosing: 0 }); expect(comparison.reference).toEqual(comparison.current);
    const original = JSON.parse(JSON.stringify(saved)); saved.epoch = -999; saved.status = 'changed'; saved.forecast.points[0].x = 999; saved.forecast.endpoint.y = 999; saved.forecast.points.push({ time: 999 });
    expect(sim.canvas._dockCoastReference()).toEqual(original);
    sim.advance(1); const nextState = JSON.stringify(sim.state), nextSelection = sim.canvas._dockForecastInspection(); sim.canvas._dockSaveCoast();
    const replaced = sim.canvas._dockCoastReference(); expect(replaced.epoch).toBe(sim.state.t); expect(replaced.epoch).toBeGreaterThan(original.epoch); expect(replaced.forecast).not.toEqual(original.forecast); expect(JSON.stringify(sim.state)).toBe(nextState); expect(sim.canvas._dockForecastInspection()).toEqual(nextSelection);
    sim.canvas._dockClearCoast(); expect(sim.canvas._dockCoastReference()).toBeNull(); expect(sim.canvas._dockCoastComparison()).toMatchObject({ active: false, available: false, reference: null, deltaRange: null, deltaSpeed: null, deltaClosing: null, epoch: null, sharedStart: null, sharedEnd: null }); expect(JSON.stringify(sim.state)).toBe(nextState); expect(sim.canvas._dockForecastInspection()).toEqual(nextSelection);
  });

  it('compares inertial and orbital coasts at the same mission time after the live forecast epoch advances', () => {
    for (const orbital of [false, true]) {
      const sim = flight({ orbital }); sim.canvas._dockSetHorizon(120); sim.canvas._dockSaveCoast(); const saved = sim.canvas._dockCoastReference(); sim.advance(5); sim.canvas._dockSetForecastTime(17.125);
      const before = JSON.stringify(sim.state), comparison = sim.canvas._dockCoastComparison(), time = sim.state.t + 17.125;
      expect(comparison.active).toBe(true); expect(comparison.available).toBe(true); expect(comparison.missionTime).toBe(time); expect(comparison.current.time).toBe(17.125); expect(comparison.reference.time).toBeCloseTo(time - saved.epoch, 11);
      const n = Math.sqrt(3.986004418e14 / (6791000 ** 3)), c = Math.cos(n * time), sn = Math.sin(n * time);
      const expected = orbital ? { x: (4 - 3 * c) * 26 + 2 * (1 - c) / n, y: 6 * (sn - n * time) * 26 - 190 + (4 * sn - 3 * n * time) / n } : { x: 26, y: -190 + time };
      for (const point of [comparison.current, comparison.reference]) { expect(point.x).toBeCloseTo(expected.x, 6); expect(point.y).toBeCloseTo(expected.y, 6); expect(point.range).toBeCloseTo(Math.hypot(expected.x, expected.y), 6); }
      expect(comparison.deltaRange).toBeCloseTo(0, 6); expect(comparison.deltaSpeed).toBeCloseTo(0, 7); expect(comparison.deltaClosing).toBeCloseTo(0, 7); expect(comparison.sharedStart).toBe(0); expect(comparison.sharedEnd).toBeCloseTo(saved.epoch + saved.forecast.endpoint.time - sim.state.t, 10);
      expect(JSON.stringify(sim.state)).toBe(before); expect(sim.canvas._dockCoastReference()).toEqual(saved);
    }
  });

  it('compares a fuel-consuming pulse against the pinned unpowered coast using the saved epoch rather than equal look-ahead offsets', () => {
    const sim = flight(); sim.canvas._dockManeuver('coast'); sim.canvas._dockSaveCoast(); const saved = sim.canvas._dockCoastReference(), fuel = sim.state.propellant;
    sim.canvas._dockSetForecastTime(20); sim.canvas._dockSetPulseSeconds(.5); sim.canvas._dockManeuver('fwd');
    expect(sim.state.propellant).toBeLessThan(fuel); const before = JSON.stringify(sim.state), comparison = sim.canvas._dockCoastComparison(), referenceTime = sim.state.t + 20 - saved.epoch, start = saved.forecast.points[0];
    const expectedReference = Math.hypot(start.x + start.vx * referenceTime, start.y + start.vy * referenceTime), expectedCurrent = Math.hypot(sim.state.x + sim.state.vx * 20, sim.state.y + sim.state.vy * 20);
    expect(comparison.reference.time).toBeCloseTo(referenceTime, 11); expect(comparison.reference.range).toBeCloseTo(expectedReference, 9); expect(comparison.current.range).toBeCloseTo(expectedCurrent, 9);
    expect(comparison.deltaRange).toBeCloseTo(expectedCurrent - expectedReference, 9); expect(comparison.deltaRange).toBeLessThan(0); expect(comparison.deltaSpeed).toBeCloseTo(Math.hypot(sim.state.vx, sim.state.vy) - Math.hypot(start.vx, start.vy), 10); expect(comparison.deltaSpeed).toBeGreaterThan(0); expect(comparison.deltaClosing).toBeCloseTo(comparison.current.closing - comparison.reference.closing, 12);
    expect(JSON.stringify(sim.state)).toBe(before); expect(sim.canvas._dockCoastReference()).toEqual(saved);
  });

  it('clips pinned coasts to shared horizons and their own terminal events and retains inclusive zero-width overlap without extrapolation', () => {
    const sim = flight(); sim.canvas._dockSetScenario('final'); sim.canvas._dockSetHorizon(120); sim.canvas._dockSaveCoast(); const saved = sim.canvas._dockCoastReference();
    expect(saved.forecast.terminal).toBe('contact'); sim.canvas._dockSetHorizon(30);
    let comparison = sim.canvas._dockCoastComparison(), timeline = sim.canvas._dockRangeTimeline(640);
    expect(comparison.sharedEnd).toBe(30); expect(timeline.referenceEnd.time).toBe(30); expect(timeline.referencePoints.at(-1).time).toBe(30); expect(sim.canvas._dockCoastReference()).toEqual(saved);
    sim.canvas._dockSetHorizon(120); sim.state.vy = -.1; sim.canvas._dockSetForecastTime(100); comparison = sim.canvas._dockCoastComparison(); timeline = sim.canvas._dockRangeTimeline(640);
    expect(comparison).toMatchObject({ active: true, available: false, reference: null, deltaRange: null, deltaSpeed: null, deltaClosing: null }); expect(comparison.sharedEnd).toBe(saved.forecast.endpoint.time); expect(timeline.duration).toBe(120); expect(timeline.referenceSelected).toBeNull(); expect(timeline.referenceEnd.time).toBe(saved.forecast.endpoint.time); expect(timeline.referencePoints.every(point => point.time <= saved.forecast.endpoint.time)).toBe(true);
    sim.canvas._dockSetScenario('rendezvous'); sim.canvas._dockSetHorizon(30); sim.canvas._dockSaveCoast(); sim.canvas._dockTogglePause(); sim.advance(30); sim.state.t = 30; sim.canvas._dockSetForecastTime(0);
    comparison = sim.canvas._dockCoastComparison(); timeline = sim.canvas._dockRangeTimeline(640);
    expect(comparison).toMatchObject({ active: true, available: true, sharedStart: 0, sharedEnd: 0 }); expect(comparison.reference.time).toBe(30); expect(timeline.referencePoints).toHaveLength(1); expect(timeline.referenceEnd.time).toBe(0); expect(timeline.referenceSelected).not.toBeNull();
    sim.canvas._dockSetForecastTime(1e-9); expect(sim.canvas._dockCoastComparison().available).toBe(true); expect(sim.canvas._dockCoastComparison().reference.time).toBe(30);
    sim.canvas._dockSetForecastTime(1e-6); expect(sim.canvas._dockCoastComparison().available).toBe(false);
    sim.advance(1); sim.canvas._dockSetForecastTime(0); comparison = sim.canvas._dockCoastComparison(); timeline = sim.canvas._dockRangeTimeline(640);
    expect(comparison).toMatchObject({ active: true, available: false, sharedStart: null, sharedEnd: null, reference: null }); expect(timeline.referencePoints).toEqual([]); expect(timeline.referenceEnd).toBeNull(); expect(timeline.referenceSelected).toBeNull();
  });

  it('projects only the visible saved path on the current look-ahead axis and fits both paths without stretching axes during inspection', () => {
    const sim = flight(); sim.canvas._dockSaveCoast(); const saved = sim.canvas._dockCoastReference(); sim.advance(5); Object.assign(sim.state, { x: -130, y: -30, vx: 1, vy: 0 }); sim.canvas._dockSetCamera('forecast'); sim.canvas._dockSetForecastTime(17.125);
    const before = JSON.stringify(sim.state), current = sim.canvas._dockForecast(), geometry = sim.canvas._dockRangeTimeline(640), comparison = sim.canvas._dockCoastComparison(), view = sim.canvas._dockViewSnapshot();
    expect(geometry.duration).toBe(current.endpoint.time); expect(geometry.referencePoints[0].time).toBe(0); expect(geometry.referencePoints.at(-1).time).toBeCloseTo(60 - sim.state.t, 10); expect(geometry.referenceEnd).toEqual(geometry.referencePoints.at(-1));
    for (const point of geometry.referencePoints) {
      const relative = sim.state.t + point.time - saved.epoch, expected = Math.hypot(26, -190 + relative);
      expect(point.range).toBeCloseTo(expected, 9); expect(point.px).toBeCloseTo(geometry.left + point.time / geometry.duration * (geometry.right - geometry.left), 10); expect(point.py).toBeCloseTo(geometry.bottom - point.range / geometry.rangeMax * (geometry.bottom - geometry.top), 10);
      expect(geometry.rangeMax).toBeGreaterThanOrEqual(point.range);
      const px = view.ox + (-190 + relative) * view.scale, py = view.oy - 26 * view.scale; expect(px).toBeGreaterThanOrEqual(48 - 1e-9); expect(px).toBeLessThanOrEqual(560 + 1e-9); expect(py).toBeGreaterThanOrEqual(150 - 1e-9); expect(py).toBeLessThanOrEqual(296 + 1e-9);
    }
    expect(geometry.referenceSelected.range).toBe(comparison.reference.range); expect(geometry.referenceSelected.px).toBe(geometry.selected.px);
    for (const point of current.points) { const px = view.ox + point.y * view.scale, py = view.oy - point.x * view.scale; expect(px).toBeGreaterThanOrEqual(48 - 1e-9); expect(px).toBeLessThanOrEqual(560 + 1e-9); expect(py).toBeGreaterThanOrEqual(150 - 1e-9); expect(py).toBeLessThanOrEqual(296 + 1e-9); }
    for (const time of [0, 17.125, comparison.sharedEnd, 'end']) { sim.canvas._dockSetForecastTime(time); const changed = sim.canvas._dockRangeTimeline(640); expect(changed.rangeMax).toBe(geometry.rangeMax); expect(changed.duration).toBe(geometry.duration); expect(sim.canvas._dockViewSnapshot()).toEqual(view); }
    expect(JSON.stringify(sim.state)).toBe(before);
  });

  it('inspects the last shared instant without changing camera or flight, cancels dragging, and clears references on resets while completed saves do nothing', () => {
    const sim = flight(); sim.canvas._dockSaveCoast(); sim.advance(5); sim.canvas._dockSetCamera('wide'); sim.canvas._dockSetForecastTime('end');
    const pointer = rangePointerFixture(sim); pointer.send('down'); expect(pointer.captured.size).toBe(1); const before = JSON.stringify(sim.state), shared = sim.canvas._dockCoastComparison().sharedEnd;
    sim.canvas._dockInspectSharedCoast(); expect(pointer.captured.size).toBe(0); expect(sim.canvas._dockForecastInspection().time).toBe(shared); expect(sim.canvas._dockForecastInspection().followingEnd).toBe(false); expect(sim.canvas._dockCoastComparison().available).toBe(true); expect(JSON.stringify(sim.state)).toBe(before); pointer.send('move', { clientX: pointer.x(0) }); expect(sim.canvas._dockForecastInspection().time).toBe(shared);
    for (const reset of [() => sim.canvas._dockSetScenario('drift'), () => sim.canvas._dockReset(false), () => sim.canvas._dockReset(true)]) { sim.canvas._dockSaveCoast(); expect(sim.canvas._dockCoastReference()).not.toBeNull(); reset(); expect(sim.canvas._dockCoastReference()).toBeNull(); expect(sim.canvas._dockCoastComparison().active).toBe(false); }
    sim.canvas._dockReset(false, 'final', false); sim.canvas._dockSaveCoast(); const saved = sim.canvas._dockCoastReference(); Object.assign(sim.state, { x: 0, y: -5.01, vx: 0, vy: .3 }); sim.advance(.5); expect(sim.state.over).toBe(true);
    const ended = JSON.stringify(sim.state), selected = sim.canvas._dockForecastInspection(); sim.canvas._dockSaveCoast(); sim.canvas._dockInspectSharedCoast(); expect(sim.canvas._dockCoastReference()).toEqual(saved); expect(JSON.stringify(sim.state)).toBe(ended); expect(sim.canvas._dockForecastInspection()).toEqual(selected);
  });

  it('projects physical signed closing rate through the flyby minimum and keeps boundary minima distinct from a turning point', () => {
    const sim = flight(); sim.canvas._dockSetScenario('flyby'); sim.canvas._dockSetHorizon(120); sim.canvas._dockSetTimelineMetric('closing');
    const closest = sim.canvas._dockClosestApproach(), times = [0, closest.time, sim.canvas._dockForecast().endpoint.time];
    for (const [index, time] of times.entries()) {
      sim.canvas._dockSetForecastTime(time); const geometry = sim.canvas._dockRangeTimeline(640), sample = geometry.selected;
      const expected = -(sample.x * sample.vx + sample.y * sample.vy) / Math.hypot(sample.x, sample.y);
      expect(geometry.metric).toBe('closing'); expect(sample.closing).toBeCloseTo(expected, 12); expect(sample.value).toBe(sample.closing);
      expect(sample.py).toBeCloseTo(geometry.bottom - (sample.value - geometry.valueMin) / (geometry.valueMax - geometry.valueMin) * (geometry.bottom - geometry.top), 12);
      if (index === 0) { expect(sample.closing).toBeGreaterThan(0); expect(sample.py).toBeLessThan(geometry.zeroY); }
      else if (index === 1) { expect(sample.closing).toBeCloseTo(0, 7); expect(sample.py).toBeCloseTo(geometry.zeroY, 5); }
      else { expect(sample.closing).toBeLessThan(0); expect(sample.py).toBeGreaterThan(geometry.zeroY); }
    }
    const h = .001, time = 30, before = sim.canvas._dockForecastSample(time - h), after = sim.canvas._dockForecastSample(time + h);
    expect(sim.canvas._dockForecastSample(time).closing).toBeCloseTo(-(after.range - before.range) / (2 * h), 7);
    sim.canvas._dockSetScenario('rendezvous'); sim.canvas._dockSetHorizon(30); let geometry = sim.canvas._dockRangeTimeline(640);
    expect(geometry.closest.boundary).toBe('end'); expect(geometry.closest.closing).toBeGreaterThan(0); expect(geometry.closest.value).toBe(geometry.closest.closing); expect(geometry.closest.py).toBeLessThan(geometry.zeroY);
    Object.assign(sim.state, { x: 20, y: -40, vx: .2, vy: -.4 }); geometry = sim.canvas._dockRangeTimeline(640);
    expect(geometry.closest.boundary).toBe('now'); expect(geometry.closest.closing).toBeLessThan(0); expect(geometry.closest.py).toBeGreaterThan(geometry.zeroY);
  });

  it('bounds dense inertial and orbital closing-rate samples symmetrically without shifting axes during scrubbing', () => {
    for (const orbital of [false, true]) {
      const sim = flight({ orbital }); sim.canvas._dockSetTimelineMetric('closing'); sim.canvas._dockSetHorizon(120);
      for (const scenario of ['rendezvous', 'final', 'drift', 'flyby']) {
        sim.canvas._dockSetScenario(scenario); const geometry = sim.canvas._dockRangeTimeline(390), duration = geometry.duration, before = JSON.stringify(sim.state);
        expect(geometry.valueMin).toBe(-geometry.valueMax); expect(geometry.valueMax).toBeGreaterThanOrEqual(.05); expect(Number.isFinite(geometry.valueMax)).toBe(true); expect(geometry.zeroY).toBe((geometry.top + geometry.bottom) / 2);
        for (let index = 0; index <= 240; index++) {
          const sample = sim.canvas._dockForecastSample(duration * index / 240);
          expect(sample.closing).toBeGreaterThanOrEqual(geometry.valueMin - 1e-10); expect(sample.closing).toBeLessThanOrEqual(geometry.valueMax + 1e-10);
          expect(Math.abs(sample.closing)).toBeLessThanOrEqual(sample.speed + 1e-12);
        }
        for (const time of [0, duration * .123456789, duration / 2, 'end']) {
          sim.canvas._dockSetForecastTime(time); const changed = sim.canvas._dockRangeTimeline(390);
          expect(changed.valueMin).toBe(geometry.valueMin); expect(changed.valueMax).toBe(geometry.valueMax); expect(changed.zeroY).toBe(geometry.zeroY);
          for (const point of changed.points) { expect(point.closing).toBe(sim.canvas._dockForecastSample(point.time).closing); expect(point.value).toBe(point.closing); expect(point.py).toBeGreaterThanOrEqual(changed.top - 1e-10); expect(point.py).toBeLessThanOrEqual(changed.bottom + 1e-10); }
        }
        expect(JSON.stringify(sim.state)).toBe(before);
      }
    }
  });

  it('projects current and saved closing rates at matching mission times and includes both visible coasts in the fixed bounds', () => {
    for (const orbital of [false, true]) {
      const sim = flight({ orbital }); sim.canvas._dockSetScenario('flyby'); sim.canvas._dockSetHorizon(120); sim.canvas._dockSaveCoast(); const saved = sim.canvas._dockCoastReference(); sim.canvas._dockSetPulseSeconds(2); sim.canvas._dockManeuver('fwd'); sim.canvas._dockSetTimelineMetric('closing');
      const sharedEnd = sim.canvas._dockCoastComparison().sharedEnd, original = sim.canvas._dockRangeTimeline(640), before = JSON.stringify(sim.state);
      for (let index = 0; index <= 80; index++) {
        sim.canvas._dockSetForecastTime(sharedEnd * index / 80); const comparison = sim.canvas._dockCoastComparison(), geometry = sim.canvas._dockRangeTimeline(640);
        expect(comparison.available).toBe(true); expect(comparison.deltaClosing).toBeCloseTo(comparison.current.closing - comparison.reference.closing, 12); expect(geometry.valueMin).toBe(original.valueMin); expect(geometry.valueMax).toBe(original.valueMax);
        expect(geometry.referenceSelected.px).toBe(geometry.selected.px);
        for (const point of [geometry.selected, geometry.referenceSelected, geometry.referenceEnd]) {
          const closing = point.range > 0 ? -(point.x * point.vx + point.y * point.vy) / point.range : 0;
          expect(point.closing).toBeCloseTo(closing, 12); expect(point.value).toBe(point.closing); expect(point.value).toBeGreaterThanOrEqual(geometry.valueMin - 1e-10); expect(point.value).toBeLessThanOrEqual(geometry.valueMax + 1e-10);
          expect(point.py).toBeCloseTo(geometry.bottom - (point.value - geometry.valueMin) / (geometry.valueMax - geometry.valueMin) * (geometry.bottom - geometry.top), 11);
        }
        for (const point of geometry.referencePoints) { expect(point.value).toBe(point.closing); expect(point.py).toBeGreaterThanOrEqual(geometry.top - 1e-10); expect(point.py).toBeLessThanOrEqual(geometry.bottom + 1e-10); }
      }
      expect(sim.canvas._dockCoastReference()).toEqual(saved); expect(JSON.stringify(sim.state)).toBe(before);
    }
  });

  it('treats timeline metric as a view preference that cancels capture and preserves live controls, selected time, camera and saved coast', () => {
    const sim = flight(); expect(sim.canvas._dockTimelineMetric()).toBe('range'); sim.canvas._dockSaveCoast(); sim.canvas._dockSetCamera('wide'); sim.canvas._dockSetThrust('fwd', true); sim.canvas._dockSetForecastTime(17.125);
    const saved = sim.canvas._dockCoastReference(), before = JSON.stringify(sim.state), inspection = sim.canvas._dockForecastInspection(), comparison = sim.canvas._dockCoastComparison();
    for (const metric of ['closing', 'range', 'closing']) {
      sim.canvas._dockSetTimelineMetric(metric); const geometry = sim.canvas._dockRangeTimeline(640);
      expect(sim.canvas._dockTimelineMetric()).toBe(metric); expect(geometry.metric).toBe(metric); expect(JSON.stringify(sim.state)).toBe(before); expect(sim.canvas._dockForecastInspection()).toEqual(inspection); expect(sim.canvas._dockCoastReference()).toEqual(saved); expect(sim.canvas._dockCoastComparison()).toEqual(comparison);
      if (metric === 'range') { expect(geometry.valueMin).toBe(0); expect(geometry.valueMax).toBe(geometry.rangeMax); expect(geometry.zeroY).toBe(geometry.bottom); for (const point of [...geometry.points, ...geometry.referencePoints, geometry.selected, geometry.closest, geometry.referenceSelected, geometry.referenceEnd]) expect(point.value).toBe(point.range); }
    }
    const geometry = sim.canvas._dockRangeTimeline(640);
    for (const invalid of [undefined, null, false, true, 0, 1, [], {}, 'CLOSING', 'speed', '']) { sim.canvas._dockSetTimelineMetric(invalid); expect(sim.canvas._dockTimelineMetric()).toBe('closing'); expect(sim.canvas._dockRangeTimeline(640)).toEqual(geometry); expect(JSON.stringify(sim.state)).toBe(before); }
    const pointer = rangePointerFixture(sim); pointer.send('down'); expect(pointer.captured.size).toBe(1); const selected = sim.canvas._dockForecastInspection(); sim.canvas._dockSetTimelineMetric('range'); expect(pointer.captured.size).toBe(0); pointer.send('move', { clientX: pointer.x(0) }); expect(sim.canvas._dockForecastInspection()).toEqual(selected);
    sim.canvas._dockSetTimelineMetric('closing'); sim.canvas._dockSetHorizon(30); expect(sim.canvas._dockTimelineMetric()).toBe('closing'); sim.canvas._dockSetScenario('final'); expect(sim.canvas._dockTimelineMetric()).toBe('closing'); sim.canvas._dockReset(true); expect(sim.canvas._dockTimelineMetric()).toBe('closing');
  });

  it('keeps zero-speed, zero-range and completed closing-rate timelines finite with a visible signed axis', () => {
    const sim = flight(); sim.canvas._dockSetTimelineMetric('closing');
    for (const state of [{ x: 10, y: -40, vx: 0, vy: 0 }, { x: 0, y: 0, vx: 0, vy: 0 }]) {
      Object.assign(sim.state, state); const geometry = sim.canvas._dockRangeTimeline(640);
      expect(geometry.valueMax).toBeGreaterThanOrEqual(.05); expect(geometry.valueMin).toBe(-geometry.valueMax); expect(Number.isFinite(geometry.zeroY)).toBe(true);
      for (const point of [...geometry.points, geometry.selected, geometry.closest]) { expect(Math.abs(point.closing)).toBe(0); expect(Math.abs(point.value)).toBe(0); expect(point.py).toBe(geometry.zeroY); expect(Number.isFinite(point.px)).toBe(true); }
      expect(sim.canvas._dockCoastComparison().deltaClosing).toBeNull();
    }
    Object.assign(sim.state, { x: 0, y: -5.01, vx: 0, vy: .3 }); sim.advance(.5); expect(sim.state.over).toBe(true); const before = JSON.stringify(sim.state), geometry = sim.canvas._dockRangeTimeline(390);
    expect(geometry.duration).toBe(0); expect(geometry.points).toHaveLength(1); expect(geometry.closest.boundary).toBe('now'); expect(geometry.selected.closing).toBeCloseTo(.3, 12);
    for (const point of [geometry.points[0], geometry.selected, geometry.closest]) { expect(Number.isFinite(point.value)).toBe(true); expect(Number.isFinite(point.py)).toBe(true); expect(point.py).toBeGreaterThanOrEqual(geometry.top - 1e-10); expect(point.py).toBeLessThanOrEqual(geometry.bottom + 1e-10); }
    expect(JSON.stringify(sim.state)).toBe(before);
  });

  it('maps radial and along-track velocity onto equal physical axes with exact selected and closest samples', () => {
    const sim = flight({ orbital: true }); sim.canvas._dockSetScenario('flyby'); sim.canvas._dockSetHorizon(120); sim.canvas._dockSetForecastTime(17.125);
    const before = JSON.stringify(sim.state), forecast = sim.canvas._dockForecast(), closest = sim.canvas._dockClosestApproach();
    for (const [width, expectedWidth] of [[undefined, 640], [NaN, 640], [Infinity, 640], [null, 640], ['390', 640], [0, 640], [-1, 640], [1, 1], [100, 100], [208, 208], [390, 390], [640, 640], [1800, 1800]]) {
      const map = sim.canvas._dockVelocityMap(width), radius = Math.min(90, Math.max(1, (expectedWidth - 96) / 2));
      expect(map).toMatchObject({ width: expectedWidth, height: 260, cx: expectedWidth / 2, cy: 128, radius, duration: forecast.endpoint.time }); expect(map.scale).toBe(map.radius / map.limit); expect(map.limit).toBeGreaterThanOrEqual(.05); expect(map.pickable).toBe(true);
      expect(map.pickPoints.map(point => point.time)).toEqual(forecast.points.map(point => point.time));
      const times = map.points.map(point => point.time); expect(times).toEqual([...times].sort((a, b) => a - b)); expect(new Set(times).size).toBe(times.length); expect(times).toContain(17.125); expect(times).toContain(closest.time);
      for (const point of [...map.points, ...map.pickPoints, map.selected, map.closest]) {
        const sample = sim.canvas._dockForecastSample(point.time); expect(point).toMatchObject(sample);
        expect(point.px).toBeCloseTo(map.cx + sample.vy * map.scale, 11); expect(point.py).toBeCloseTo(map.cy - sample.vx * map.scale, 11); expect(point.speed).toBeCloseTo(Math.hypot(sample.vx, sample.vy), 12);
      }
      expect(map.closest.boundary).toBe(closest.boundary); expect(map.closest.closing).toBeCloseTo(0, 7); expect(map.closest.speed).toBeGreaterThan(.5); expect(Math.hypot(map.closest.px - map.cx, map.closest.py - map.cy)).toBeGreaterThan(0);
    }
    expect(JSON.stringify(sim.state)).toBe(before);
    sim.canvas._dockReset(false); Object.assign(sim.state, { x: 0, y: -100, vx: -.3, vy: -.4 }); const map = sim.canvas._dockVelocityMap(640);
    expect(map.selected.px).toBeLessThan(map.cx); expect(map.selected.py).toBeGreaterThan(map.cy); expect((map.cx - map.selected.px) / .4).toBeCloseTo((map.selected.py - map.cy) / .3, 10);
  });

  it('keeps velocity-map bounds stable across inspection and contains dense orbital and inertial coast samples', () => {
    for (const orbital of [false, true]) {
      const sim = flight({ orbital }); sim.canvas._dockSetHorizon(120);
      for (const scenario of ['rendezvous', 'final', 'drift', 'flyby']) {
        sim.canvas._dockSetScenario(scenario); sim.canvas._dockSetForecastTime(17.125); const map = sim.canvas._dockVelocityMap(390), before = JSON.stringify(sim.state);
        for (let i = 0; i <= 180; i++) {
          const sample = sim.canvas._dockForecastSample(map.duration * i / 180), px = map.cx + sample.vy * map.scale, py = map.cy - sample.vx * map.scale;
          expect(sample.speed).toBeLessThanOrEqual(map.limit + 1e-10); expect(px).toBeGreaterThanOrEqual(map.left - 1e-10); expect(px).toBeLessThanOrEqual(map.right + 1e-10); expect(py).toBeGreaterThanOrEqual(map.top - 1e-10); expect(py).toBeLessThanOrEqual(map.bottom + 1e-10);
        }
        for (const time of [0, map.duration * .37125, 'end']) {
          sim.canvas._dockSetForecastTime(time); const changed = sim.canvas._dockVelocityMap(390);
          for (const key of ['width', 'height', 'cx', 'cy', 'radius', 'left', 'right', 'top', 'bottom', 'limit', 'scale', 'duration', 'pickable']) expect(changed[key]).toBe(map[key]);
          expect(changed.pickPoints).toEqual(map.pickPoints); expect(changed.selected.time).toBe(sim.canvas._dockForecastInspection().time);
        }
        expect(JSON.stringify(sim.state)).toBe(before);
      }
    }
  });

  it('projects the visible saved velocity coast at the same mission time after a pulse and hides expired reference samples', () => {
    const sim = flight({ orbital: true }); sim.canvas._dockSetScenario('flyby'); sim.canvas._dockSetHorizon(120); sim.canvas._dockSaveCoast(); const saved = sim.canvas._dockCoastReference(); sim.canvas._dockSetPulseSeconds(2); sim.canvas._dockManeuver('fwd'); sim.canvas._dockSetForecastTime(17.125);
    const before = JSON.stringify(sim.state), comparison = sim.canvas._dockCoastComparison(), map = sim.canvas._dockVelocityMap(640);
    expect(map.referenceSelected).not.toBeNull(); expect(map.referenceSelected.time).toBe(map.selected.time); expect(map.referenceSelected.savedTime).toBe(comparison.reference.time);
    for (const key of ['x', 'y', 'vx', 'vy', 'range', 'speed', 'closing']) expect(map.referenceSelected[key]).toBe(comparison.reference[key]);
    expect(map.referencePoints.some(point => point.time === 17.125)).toBe(true);
    for (const point of map.referencePoints) {
      expect(point.savedTime).toBeCloseTo(sim.state.t + point.time - saved.epoch, 10); expect(point.savedTime).toBeGreaterThanOrEqual(0); expect(point.savedTime).toBeLessThanOrEqual(saved.forecast.endpoint.time);
      expect(point.px).toBeCloseTo(map.cx + point.vy * map.scale, 11); expect(point.py).toBeCloseTo(map.cy - point.vx * map.scale, 11); expect(point.speed).toBeLessThanOrEqual(map.limit + 1e-10);
    }
    expect(map.selected.speed - map.referenceSelected.speed).toBeCloseTo(comparison.deltaSpeed, 12);
    sim.canvas._dockSetForecastTime('end'); const end = sim.canvas._dockVelocityMap(640); expect(!!end.referenceSelected).toBe(sim.canvas._dockCoastComparison().available); expect(end.limit).toBe(map.limit); expect(end.scale).toBe(map.scale); expect(JSON.stringify(sim.state)).toBe(before); expect(sim.canvas._dockCoastReference()).toEqual(saved);
    sim.state.t = saved.epoch + saved.forecast.endpoint.time + 1; sim.canvas._dockSetForecastTime(0); const expired = sim.canvas._dockVelocityMap(640); expect(expired.referencePoints).toEqual([]); expect(expired.referenceSelected).toBeNull();
  });

  it('hit-tests only the base velocity polyline in CSS pixels and rejects malformed, distant and out-of-plot picks', () => {
    const sim = flight({ orbital: true }); sim.canvas._dockSetHorizon(120); sim.canvas._dockSetForecastTime(17.125);
    const before = JSON.stringify(sim.state), selected = sim.canvas._dockForecastInspection();
    for (const rect of [{ left: 13, top: 23, width: 640, height: 260 }, { left: -7, top: 41, width: 320, height: 260 }, { left: 17, top: 11, width: 208, height: 130 }, { left: 31, top: 19, width: 1800, height: 260 }]) {
      const map = sim.canvas._dockVelocityMap(rect.width), css = point => ({ x: rect.left + point.px / map.width * rect.width, y: rect.top + point.py / map.height * rect.height });
      for (const point of [map.pickPoints[0], map.pickPoints[7], map.pickPoints.at(-1)]) { const pos = css(point), hit = sim.canvas._dockVelocityHitTest(pos.x, pos.y, rect); expect(hit).not.toBeNull(); expect(hit.time).toBeCloseTo(point.time, 6); expect(hit.distance).toBeCloseTo(0, 8); }
      const a = map.pickPoints[17], b = map.pickPoints[18], f = .37125, pos = css({ px: a.px + (b.px - a.px) * f, py: a.py + (b.py - a.py) * f }), hit = sim.canvas._dockVelocityHitTest(pos.x, pos.y, rect);
      expect(hit.time).toBeCloseTo(a.time + (b.time - a.time) * f, 6); expect(hit.distance).toBeCloseTo(0, 8);
      for (const logical of [{ px: map.left - 1, py: map.cy }, { px: map.right + 1, py: map.cy }, { px: map.cx, py: map.top - 1 }, { px: map.cx, py: map.bottom + 1 }, { px: map.left + 1, py: map.bottom - 1 }]) { const pos = css(logical); expect(sim.canvas._dockVelocityHitTest(pos.x, pos.y, rect)).toBeNull(); }
    }
    const rect = { left: 13, top: 23, width: 640, height: 260 }, map = sim.canvas._dockVelocityMap(640), pos = map.pickPoints[0], x = rect.left + pos.px, y = rect.top + pos.py;
    const near = sim.canvas._dockVelocityHitTest(x + 17.5, y, rect); expect(near).not.toBeNull(); expect(near.time).toBe(0); expect(near.distance).toBeCloseTo(17.5, 9); expect(sim.canvas._dockVelocityHitTest(x + 18.5, y, rect)).toBeNull();
    for (const bounds of [undefined, null, {}, { ...rect, width: 0 }, { ...rect, height: 0 }, { ...rect, width: -1 }, { ...rect, height: Infinity }, { ...rect, left: NaN }, { ...rect, top: Infinity }]) expect(sim.canvas._dockVelocityHitTest(x, y, bounds)).toBeNull();
    for (const value of [undefined, null, '20', false, NaN, Infinity, -Infinity, [], {}]) { expect(sim.canvas._dockVelocityHitTest(value, y, rect)).toBeNull(); expect(sim.canvas._dockVelocityHitTest(x, value, rect)).toBeNull(); }
    expect(JSON.stringify(sim.state)).toBe(before); expect(sim.canvas._dockForecastInspection()).toEqual(selected);
  });

  it('accepts unmodified native velocity-map clicks while preserving flight controls, camera and the saved coast', () => {
    const sim = flight({ orbital: true }); sim.canvas._dockSaveCoast(); sim.canvas._dockSetCamera('wide'); const saved = sim.canvas._dockCoastReference(), rect = { left: 31, top: 19, width: 480, height: 260 }, target = { getBoundingClientRect: () => rect };
    function pick(time, props = {}) { const map = sim.canvas._dockVelocityMap(rect.width), point = map.pickPoints.find(point => point.time === time); sim.canvas._dockVelocityPick({ currentTarget: target, button: 0, isPrimary: false, clientX: rect.left + point.px / map.width * rect.width, clientY: rect.top + point.py / map.height * rect.height, preventDefault() {}, ...props }); }
    for (const mode of ['running', 'thrust', 'hold', 'paused']) {
      if (mode === 'thrust') sim.canvas._dockSetThrust('fwd', true); if (mode === 'hold') sim.canvas._dockSetDamp(); if (mode === 'paused') sim.canvas._dockTogglePause();
      sim.canvas._dockSetForecastTime('end'); const before = JSON.stringify(sim.state), selected = sim.canvas._dockForecastInspection();
      for (const invalid of [{ button: 2 }, { button: 1 }, { ctrlKey: true }, { altKey: true }, { shiftKey: true }, { metaKey: true }]) { pick(18, invalid); expect(sim.canvas._dockForecastInspection()).toEqual(selected); expect(JSON.stringify(sim.state)).toBe(before); }
      pick(18); expect(sim.canvas._dockForecastInspection().time).toBeCloseTo(18, 6); expect(sim.canvas._dockForecastInspection().followingEnd).toBe(false); expect(JSON.stringify(sim.state)).toBe(before); expect(sim.canvas._dockCoastReference()).toEqual(saved);
    }
  });

  it('keeps constant-velocity and completed maps finite without jumping the selected time and preserves the component preference', () => {
    const sim = flight(); expect(sim.canvas._dockVelocityComponents()).toBe(true); sim.canvas._dockSaveCoast(); sim.canvas._dockSetForecastTime(17.125); const before = JSON.stringify(sim.state), selected = sim.canvas._dockForecastInspection(), saved = sim.canvas._dockCoastReference();
    for (const enabled of [false, true, false]) { sim.canvas._dockSetVelocityComponents(enabled); expect(sim.canvas._dockVelocityComponents()).toBe(enabled); expect(JSON.stringify(sim.state)).toBe(before); expect(sim.canvas._dockForecastInspection()).toEqual(selected); expect(sim.canvas._dockCoastReference()).toEqual(saved); }
    for (const invalid of [undefined, null, 0, 1, 'true', 'false', [], {}]) { sim.canvas._dockSetVelocityComponents(invalid); expect(sim.canvas._dockVelocityComponents()).toBe(false); }
    const rect = { left: 0, top: 0, width: 640, height: 260 }, map = sim.canvas._dockVelocityMap(640); expect(map.duration).toBeGreaterThan(0); expect(map.pickable).toBe(false);
    expect(sim.canvas._dockVelocityHitTest(map.selected.px, map.selected.py, rect)).toBeNull(); sim.canvas._dockVelocityPick({ currentTarget: { getBoundingClientRect: () => rect }, button: 0, clientX: map.selected.px, clientY: map.selected.py, preventDefault() {} }); expect(sim.canvas._dockForecastInspection()).toEqual(selected);
    sim.canvas._dockSetHorizon(30); expect(sim.canvas._dockVelocityComponents()).toBe(false); sim.canvas._dockSetScenario('final'); expect(sim.canvas._dockVelocityComponents()).toBe(false); sim.canvas._dockReset(false); expect(sim.canvas._dockVelocityComponents()).toBe(false);
    Object.assign(sim.state, { x: 0, y: -5.01, vx: 0, vy: .3 }); sim.advance(.5); expect(sim.state.over).toBe(true); const ended = JSON.stringify(sim.state), end = sim.canvas._dockVelocityMap(390); expect(end.duration).toBe(0); expect(end.pickable).toBe(false); expect(end.points).toHaveLength(1);
    for (const point of [end.selected, end.closest, ...end.points]) { expect(Number.isFinite(point.px)).toBe(true); expect(Number.isFinite(point.py)).toBe(true); expect(Number.isFinite(point.speed)).toBe(true); }
    expect(sim.canvas._dockVelocityHitTest(end.selected.px, end.selected.py, { left: 0, top: 0, width: 390, height: 260 })).toBeNull(); expect(JSON.stringify(sim.state)).toBe(ended);
  });

  it('enlarges close approach without moving the vehicle or changing the collision geometry', () => {
    const sim = flight();
    sim.canvas._dockSetScenario('final');
    const before = JSON.stringify(sim.state);
    const close = sim.canvas._dockViewSnapshot();
    sim.canvas._dockSetCamera('wide');
    const wide = sim.canvas._dockViewSnapshot();
    expect(close.scale).toBeGreaterThan(wide.scale * 5);
    expect(close.portX).toBeCloseTo(close.ox - 5 * close.scale, 10);
    sim.canvas._dockSetCamera('approach');
    expect(JSON.stringify(sim.state)).toBe(before);
    for (const [x, y] of [[26, -190], [.6, -25], [0, -5], [80, -50], [-200, -100], [0, 34]]) {
      Object.assign(sim.state, { x, y });
      const view = sim.canvas._dockViewSnapshot();
      expect(view.ox + y * view.scale).toBeGreaterThanOrEqual(30);
      expect(view.ox + y * view.scale).toBeLessThan(625);
      expect(view.oy - x * view.scale).toBeGreaterThanOrEqual(122);
      expect(view.oy - x * view.scale).toBeLessThanOrEqual(294);
    }
  });
});

describe('space station EVA mechanics and resource budget', () => {
  function eva(seed) {
    const start = source.indexOf('      var EVA_RAILS =');
    const finish = source.indexOf('      function renderEvaRouteVisual()', start);
    const compile = new Function('d', 'upd', '__alloT', 'addToast', 'awardXP', reactionSource + source.slice(start, finish) + '\nreturn { clip: evaClip, move: evaMove, torque: evaTorque };');
    const data = { eva: { pos: 6, tetherA: 6, tetherB: 6, freeTether: 'A', o2: 50, bolts: 0, done: false, started: true, log: [], ...seed } };
    const reward = vi.fn();
    return {
      get state() { return data.eva; }, reward,
      act(action) { compile(data, (patch) => Object.assign(data, patch), (key, fallback) => fallback, null, reward)[action](); },
    };
  }

  it('requires a rigid restraint to torque the worksite fixture', () => {
    const sim = eva({ footRestraint: false, toolTorque: 18 });
    sim.act('torque');
    expect(sim.state.bolts).toBe(0);
    expect(sim.state.log.join(' ')).toContain('16.1°/s');
    expect(sim.state.o2).toBe(48);
    expect(sim.reward).not.toHaveBeenCalled();
  });

  it('accepts the teaching torque band and rejects under- and over-torque', () => {
    for (const [torque, bolts] of [[6, 0], [18, 1], [30, 0]]) {
      const sim = eva({ toolTorque: torque });
      sim.act('torque');
      expect(sim.state.bolts).toBe(bolts);
    }
  });

  it('uses the selected rotational inertia in worksite reaction feedback', () => {
    const sim = eva({ footRestraint: false, toolTorque: 18, bodyInertia: 64 });
    sim.act('torque');
    expect(sim.state.log.join(' ')).toContain('8.1°/s');
    expect(sim.state.bolts).toBe(0);
  });

  it('restores a finite default torque when saved torque is malformed', () => {
    for (const toolTorque of ['corrupt', Infinity, NaN]) {
      const sim = eva({ toolTorque, footRestraint: false });
      sim.act('torque');
      expect(sim.state.bolts).toBe(0);
      expect(sim.state.log.join(' ')).toContain('16.1°/s');
      expect(sim.state.log.join(' ')).not.toContain('NaN');
    }
  });

  it('cannot award completion when the last bolt exhausts suit resources', () => {
    const sim = eva({ bolts: 3, o2: 4 });
    sim.act('torque');
    expect(sim.state.done).toBe(true);
    expect(sim.state.o2).toBe(0);
    expect(sim.state.failMsg).toContain('exhausted');
    expect(sim.state.bolts).toBe(3);
    expect(sim.reward).not.toHaveBeenCalled();
  });

  it('aborts resource exhaustion during a tether action as well as worksite actions', () => {
    const sim = eva({ pos: 0, tetherA: 0, tetherB: 0, o2: 1 });
    sim.act('clip');
    expect(sim.state.done).toBe(true);
    expect(sim.state.o2).toBe(0);
    expect(sim.state.failMsg).toContain('exhausted');
  });
});

describe('space station timed EVA torque response', () => {
  it('accelerates from rest during the pulse with the opposite reaction sign', () => {
    const start = reaction({ braced: false }, 0);
    const pulse = reaction({ braced: false }, 0.25);
    expect(start.omega).toBe(0);
    expect(start.angle).toBe(0);
    expect(pulse.omega).toBeCloseTo(-18 / 32 * 0.25, 12);
    expect(pulse.angle).toBeCloseTo(-0.5 * 18 / 32 * 0.25 ** 2, 12);
    expect(pulse.netTorque).toBe(-18);
    expect(pulse.angularMomentum).toBeCloseTo(-18 * 0.25, 12);
  });

  it('preserves spin and angular momentum after torque cuts off', () => {
    const cutoff = reaction({ braced: false }, 0.5);
    const coast = reaction({ braced: false }, 2.5);
    expect(cutoff.netTorque).toBe(0);
    expect(coast.netTorque).toBe(0);
    expect(coast.omega).toBe(cutoff.omega);
    expect(coast.angularMomentum).toBe(cutoff.angularMomentum);
    expect(coast.energy).toBe(cutoff.energy);
    expect(coast.angle - cutoff.angle).toBeCloseTo(cutoff.omega * 2, 12);
    expect(coast.phase).toBe('complete');
  });

  it('keeps angle and angular speed continuous across torque cutoff', () => {
    const cutoff = reaction({ torque: 30, inertia: 16, braced: false }, 0.5);
    for (const time of [0.5 - 1e-9, 0.5 + 1e-9]) {
      const near = reaction({ torque: 30, inertia: 16, braced: false }, time);
      expect(near.angle).toBeCloseTo(cutoff.angle, 7);
      expect(near.omega).toBeCloseTo(cutoff.omega, 7);
    }
  });

  it('gives the same angular impulse but less spin to greater rotational inertia', () => {
    const compact = reaction({ inertia: 16, braced: false }, 2.5);
    const extended = reaction({ inertia: 64, braced: false }, 2.5);
    expect(extended.angularMomentum).toBe(compact.angularMomentum);
    expect(compact.omega).toBe(extended.omega * 4);
    expect(compact.angle).toBe(extended.angle * 4);
    expect(compact.energy).toBeCloseTo(18 * Math.abs(reaction({ inertia: 16, braced: false }, 0.5).angle), 12);
  });

  it('uses the restraint reaction to keep the astronaut at rest throughout a trial', () => {
    for (const time of [0, 0.2, 0.5, 2.5]) {
      const held = reaction({ torque: 30, inertia: 16, braced: true }, time);
      for (const key of ['angle', 'omega', 'angularMomentum', 'netTorque', 'energy']) expect(held[key]).toBe(0);
    }
  });

  it('clamps malformed restored settings and time to finite model values', () => {
    const bad = reaction({ torque: 'broken', inertia: Infinity }, NaN);
    expect(bad.torque).toBe(18);
    expect(bad.inertia).toBe(32);
    expect(bad.time).toBe(0);
    const late = reaction({ torque: 100, inertia: -2, braced: false }, 100);
    expect(late.torque).toBe(30);
    expect(late.inertia).toBe(16);
    expect(late.time).toBe(2.5);
    for (const key of ['angle', 'omega', 'angularMomentum', 'netTorque', 'energy']) expect(Number.isFinite(late[key])).toBe(true);
  });

  it.each([16, 32, 64])('stops spin with equal opposite angular impulses at inertia %s without restoring orientation', inertia => {
    const settings = { torque: 18, inertia, braced: false, counterRatio: 1 };
    const firstCutoff = reaction(settings, .5), counterStart = reaction(settings, 1.5);
    const stopped = reaction(settings, 2), later = reaction(settings, 2.5);
    expect(counterStart.omega).toBe(firstCutoff.omega);
    expect(counterStart.angle - firstCutoff.angle).toBeCloseTo(firstCutoff.omega, 12);
    expect(counterStart.phase).toBe('counterpulse');
    expect(counterStart.netTorque).toBe(18);
    expect(stopped.omega).toBe(0);
    expect(stopped.angularMomentum).toBe(0);
    expect(stopped.netTorque).toBe(0);
    expect(stopped.energy).toBe(0);
    expect(stopped.angle).toBeCloseTo(-18 / inertia * .75, 12);
    expect(later.angle).toBeCloseTo(stopped.angle, 12);
    expect(later.omega).toBe(0);
  });

  it.each([.5, 1.5, 2])('leaves the physically correct residual spin for counterpulse ratio %s', counterRatio => {
    const settings = { torque: 24, inertia: 40, braced: false, counterRatio };
    const cutoff = reaction(settings, 2), coast = reaction(settings, 2.5);
    const impulse = -.5 * 24 + .5 * 24 * counterRatio;
    expect(cutoff.angularMomentum).toBeCloseTo(impulse, 12);
    expect(cutoff.omega).toBeCloseTo(impulse / 40, 12);
    expect(Math.sign(cutoff.omega)).toBe(Math.sign(counterRatio - 1));
    expect(coast.angle - cutoff.angle).toBeCloseTo(cutoff.omega * .5, 12);
    expect(coast.energy).toBe(cutoff.energy);
    expect(coast.netTorque).toBe(0);
  });

  it('obeys work-energy and torque derivatives while braking through zero into reverse spin', () => {
    const settings = { torque: 30, inertia: 16, braced: false, counterRatio: 2 };
    const start = reaction(settings, 1.5), zero = reaction(settings, 1.75), end = reaction(settings, 2);
    expect(zero.energy).toBe(0);
    expect(zero.omega).toBe(0);
    expect(zero.netTorque).toBe(60);
    expect(start.energy).toBeCloseTo(end.energy, 12);
    expect(zero.energy - start.energy).toBeCloseTo(60 * (zero.angle - start.angle), 12);
    expect(end.energy - zero.energy).toBeCloseTo(60 * (end.angle - zero.angle), 12);
    expect(reaction({ torque: 19, inertia: 36, braced: false, counterRatio: 1.5 }, 2).angularMomentum).toBe(4.75);
    for (const time of [.2, .8, 1.6, 1.9, 2.3]) {
      const before = reaction(settings, time - 1e-5), now = reaction(settings, time), after = reaction(settings, time + 1e-5);
      expect((after.angle - before.angle) / 2e-5).toBeCloseTo(now.omega, 8);
      expect((after.angularMomentum - before.angularMomentum) / 2e-5).toBeCloseTo(now.netTorque, 7);
    }
  });

  it('keeps orientation and angular velocity continuous at all three torque transitions', () => {
    const settings = { torque: 30, inertia: 16, braced: false, counterRatio: 1.5 };
    for (const time of [.5, 1.5, 2]) {
      const exact = reaction(settings, time);
      for (const nearby of [time - 1e-9, time + 1e-9]) {
        const state = reaction(settings, nearby);
        expect(state.angle).toBeCloseTo(exact.angle, 7);
        expect(state.omega).toBeCloseTo(exact.omega, 7);
      }
    }
  });

  it('transfers both tool reactions into a locked restraint and bounds restored counterpulse settings', () => {
    for (const time of [.2, 1.5, 1.8, 2.5]) {
      const held = reaction({ braced: true, counterRatio: 2 }, time);
      for (const key of ['angle', 'omega', 'angularMomentum', 'netTorque', 'energy']) expect(held[key]).toBe(0);
    }
    expect(reaction({ counterRatio: 'broken' }, 2).counterRatio).toBe(0);
    expect(reaction({ counterRatio: Infinity }, 2).counterRatio).toBe(0);
    expect(reaction({ counterRatio: -1 }, 2).counterRatio).toBe(0);
    expect(reaction({ counterRatio: 99 }, 2).counterRatio).toBe(2);
  });
});
