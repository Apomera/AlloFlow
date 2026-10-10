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
  const canvas = { getContext: () => null, isConnected: true, parentElement: { parentElement: controls }, addEventListener() {}, removeEventListener() {}, _dockRealMode: orbital };
  const initialize = buildSimulator({}, (report) => reports.push(report), null, null, (message) => announcements.push(message), (key, fallback) => fallback, (str, values) => str.replace(/\{(\w+)\}/g, (match, key) => values?.[key] ?? match), false);
  initialize(canvas);
  canvas._dockSetTimeScale(timeScale);
  let clock = 0;
  callback(clock);
  cleanups.push(() => canvas._dockCleanup());
  return {
    canvas, state: canvas._dockState, reports, hud, announcements,
    advance(seconds, fps = 60) {
      const frames = Math.round(seconds * fps);
      for (let frame = 0; frame < frames; frame++) { clock += 1000 / fps; callback(clock); }
    },
    gap(milliseconds) { clock += milliseconds; callback(clock); },
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
    expect(sim.state.t - forecast.endpoint.time).toBeGreaterThanOrEqual(0);
    expect(sim.state.t - forecast.endpoint.time).toBeLessThan(1 / 60);
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
});
