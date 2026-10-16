import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const hooks = () => window.__testHooks.flightSim;
let FS, tool, host, reactRoot, latest, frameCallback, errors, texts, paintedRects, wallTime, physicsSnapshot;
const flight = patch => ({ speed: 120, altitude: 76, fieldElev: 76, vsi: 0, heading: 0,
  lat: 43.646, lon: -70.309, onGround: true, aoa: 0,
  stalling: false, lowAirspeed: false, hitCeiling: false, ...patch });
const input = patch => ({ throttle: 0.7, pitch: 0, bank: 0, yawRate: 0, brake: 0, flaps: 0, ...patch });

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab();
  window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  physicsSnapshot = Object.getOwnPropertyDescriptors(FS.Physics);
  texts = []; paintedRects = []; wallTime = 1000;
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

async function mountFlight(patch = {}, W = 1280, H = 720) {
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const context = new Proxy({
    fillText(text) { texts.push(String(text)); },
    roundRect(...args) { paintedRects.push({ args, fill: context.fillStyle }); },
    measureText: text => ({ width: Array.from(String(text)).length * 6 }),
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
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, value) => setData(old => ({ ...old, [id]: { ...old[id], ...value } })) }));
  }
  await act(async () => reactRoot.render(React.createElement(App)));
  await act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: W });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: H });
  }
  const dock = host.querySelector('[data-flightsim-hud-dock]');
  for (const [key, value] of Object.entries({ offsetLeft: 8, offsetTop: 62, offsetWidth: 215, offsetHeight: 64 })) {
    Object.defineProperty(dock, key, { configurable: true, value });
  }
  Object.assign(hooks().getWeatherRef().current, { wind: 0, turbulence: 0 });
  // Hold position while exercising production event recording, cue prediction,
  // painting, and saved notes. The flight physics has separate behavior suites.
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
async function clickLabel(label) {
  const button = host.querySelector(`button[aria-label="${label}"]`);
  expect(button).toBeTruthy();
  await act(async () => button.click());
}
const briefTitles = () => texts.filter(text => text === 'Liftoff' || text.startsWith('Discovered:'));
const flareLabels = () => texts.filter(text => text.startsWith('FLARE'));

describe('production cockpit guidance priority', () => {
  it.each([[375, 667], [1280, 720]])('keeps a naturally recorded liftoff note clear of first and held climb coaching at %s by %s', async (W, H) => {
    await mountFlight({}, W, H);
    // Let the airport's real geography discovery expire before this takeoff.
    hooks().timeRef.current = 1;
    await frame(flight({ speed: 0 }), input({ throttle: 0 }));
    hooks().timeRef.current = 10;
    expect(hooks().flightRef.current._callouts?.climb || 0).toBe(0);
    await frame(flight({ onGround: false, altitude: 126, vsi: 6 }), input());
    const cueTime = hooks().flightRef.current._callouts.climb;
    expect(cueTime).toBeGreaterThan(0);
    expect(texts).toContain('POSITIVE RATE');
    expect(briefTitles()).toEqual([]);
    await frame();
    expect(hooks().flightRef.current._callouts.climb).toBe(cueTime);
    expect(texts).toContain('POSITIVE RATE');
    expect(briefTitles()).toEqual([]);

    await clickLabel('Expand the flight deck controls');
    const notes = host.querySelector('[data-flight-notes]');
    expect([...notes.querySelectorAll('strong')].filter(item => item.textContent === 'Liftoff')).toHaveLength(1);
    expect(notes.textContent).toContain('Lift just exceeded weight');
    await clickLabel('Collapse the flight deck controls');
    hooks().timeRef.current = cueTime + 2.3;
    await frame();
    expect(texts).not.toContain('POSITIVE RATE');
    expect(briefTitles()).toEqual(['Liftoff']);
    expect(hooks().flightRef.current._callouts.climb).toBe(cueTime);

    await clickLabel('Expand the flight deck controls');
    const exit = [...host.querySelectorAll('button')].find(button => /Exit$/.test(button.textContent));
    expect(exit).toBeTruthy();
    await act(async () => exit.click());
    expect(latest.lastDebrief.flightNotes.filter(note => note.title === 'Liftoff')).toHaveLength(1);
  });

  it('keeps first and held climb coaching below a measured phone flight deck', async () => {
    await mountFlight({}, 375, 619);
    const dock = host.querySelector('[data-flightsim-hud-dock]');
    Object.defineProperty(dock, 'offsetTop', { configurable: true, value: 70 });
    Object.defineProperty(dock, 'offsetHeight', { configurable: true, value: 60 });
    hooks().timeRef.current = 10;
    // Record a real takeoff transmission and geography discovery before climb.
    await frame(flight({ speed: 25 / 0.5924838 }), input());
    expect(hooks().flightRef.current._atcLog.filter(item => item.tag === 'takeoff')).toHaveLength(1);
    expect(texts.some(text => text.startsWith('PWM training radio:'))).toBe(true);

    await frame(flight({ onGround: false, altitude: 126, vsi: 6 }), input());
    const cueTime = hooks().flightRef.current._callouts.climb;
    expect(cueTime).toBeGreaterThan(0);
    const assertClimbClearance = () => {
      expect(texts).toContain('POSITIVE RATE');
      const coaching = paintedRects.filter(rect => rect.args[3] === 54 && rect.fill === 'rgba(2,6,23,0.75)');
      expect(coaching.length).toBeGreaterThan(0);
      for (const rect of coaching) expect(rect.args[1]).toBeGreaterThanOrEqual(dock.offsetTop + dock.offsetHeight + 8);
      expect(briefTitles()).toEqual([]);
      // Radio may relocate into free space; verify its painted rows clear the
      // coaching panel rather than requiring the transmission to disappear.
      const radioRows = paintedRects.filter(rect => rect.fill === 'rgba(6,12,30,0.86)');
      for (const radio of radioRows) for (const cue of coaching) {
        expect(radio.args[1] + radio.args[3] + 8 <= cue.args[1]
          || cue.args[1] + cue.args[3] + 8 <= radio.args[1]).toBe(true);
      }
      expect(hooks().flightRef.current._atcLog.filter(item => item.tag === 'takeoff')).toHaveLength(1);
      expect(hooks().flightRef.current._callouts.climb).toBe(cueTime);
    };
    assertClimbClearance();
    await frame(); assertClimbClearance();
  });

  it.each([['airspeed', 'AIRSPEED BUILDING'], ['vr', 'ROTATE — pitch up (W)']])('holds a real nearby discovery behind the first and held %s cue', async (phase, expectedCue) => {
    await mountFlight({}, 375, 667);
    hooks().timeRef.current = 10;
    const vrKts = Math.round(FS.Physics.stallSpeed(76) * 0.5924838 * 1.1);
    const cueKts = phase === 'airspeed' ? Math.round(vrKts * 0.82) + 1 : vrKts + 1;
    expect(hooks().flightRef.current._callouts?.[phase] || 0).toBe(0);
    await frame(flight({ speed: cueKts / 0.5924838 }), input({ throttle: 1 }));
    const cueTime = hooks().flightRef.current._callouts[phase];
    expect(cueTime).toBeGreaterThan(0);
    expect(texts).toContain(expectedCue);
    expect(briefTitles()).toEqual([]);
    await frame();
    expect(texts).toContain(expectedCue);
    expect(briefTitles()).toEqual([]);
    expect(hooks().flightRef.current._callouts[phase]).toBe(cueTime);

    hooks().timeRef.current = cueTime + 2.3;
    await frame();
    expect(texts).not.toContain(expectedCue);
    expect(briefTitles()).toContain('Discovered: Portland');
    await clickLabel('Expand the flight deck controls');
    expect(host.querySelector('[data-flight-notes]').textContent).toContain('birthplace of Henry Wadsworth Longfellow');
  });

  it.each([[375, 667], [1280, 720]])('keeps a naturally recorded approach radio clear of brief discoveries and liftoff notes at %s by %s', async (W, H) => {
    await mountFlight({}, W, H);
    const airport = FS.WAYPOINTS.find(item => item.id === 'kpwm');
    const runway = FS.getFlightRunway(airport);
    const end = runway.ends[0];
    const position = FS.getFlightRunwayPosition(runway, 0,
      end.thresholdAlongFt - end.sign * 0.65 * 6076.12, 264);
    hooks().timeRef.current = 10;
    // Record the real final-approach transmission and nearby geography. No
    // radio log, discovery, or milestone is preseeded for this regression.
    await frame(flight({ ...position, fieldElev: airport.alt, heading: end.headingDeg,
      speed: 110, vsi: -4, onGround: false }), input({ throttle: 0.6 }));
    const assertRadioPriority = () => {
      const radio = hooks().flightRef.current._atcLog.filter(item => item.tag === 'final');
      expect(radio).toHaveLength(1);
      expect(radio[0].msg).toBe('PWM training radio: Approach; monitor descent and wind.');
      const firstLine = texts.findIndex(text => text.startsWith('PWM training radio:'));
      expect(firstLine).toBeGreaterThanOrEqual(0);
      expect(texts.slice(firstLine, firstLine + 2).join(' ')).toContain(radio[0].msg);
      expect(briefTitles()).toEqual([]);
      expect(texts).not.toContain('POSITIVE RATE');
      expect(texts).not.toContain('AIRSPEED BUILDING');
      expect(texts.some(text => text.startsWith('ROTATE'))).toBe(false);
      expect(hooks().flightRef.current._callouts?.climb || 0).toBe(0);
    };
    assertRadioPriority();
    await frame(); assertRadioPriority();

    await clickLabel('Expand the flight deck controls');
    const notes = host.querySelector('[data-flight-notes]');
    expect(notes).toBeTruthy();
    expect([...notes.querySelectorAll('strong')].filter(item => item.textContent === 'Liftoff')).toHaveLength(1);
    expect(notes.textContent).toContain('Lift just exceeded weight');
    expect(notes.textContent).toContain('Portland');
    expect(notes.textContent).toContain('birthplace of Henry Wadsworth Longfellow');
  });

  it('keeps brief discoveries available during ordinary taxi rather than reserving a nonexistent takeoff cue', async () => {
    await mountFlight(); hooks().timeRef.current = 10;
    await frame(flight({ speed: 12 / 0.5924838 }), input({ throttle: 0.3 }));
    expect(texts).not.toContain('AIRSPEED BUILDING');
    expect(texts).not.toContain('ROTATE — pitch up (W)');
    expect(briefTitles()).toContain('Discovered: Portland');
  });
});

describe('aircraft-appropriate flare coaching', () => {
  const final = patch => {
    const airport = FS.WAYPOINTS.find(item => item.id === 'kpwm');
    const runway = FS.getFlightRunway(airport);
    const end = runway.ends[0];
    const position = FS.getFlightRunwayPosition(runway, 0, end.thresholdAlongFt - end.sign * 500, 20);
    return flight({ ...position, fieldElev: airport.alt, heading: end.headingDeg,
      onGround: false, vsi: -2, speed: 120, ...patch });
  };

  it('retains the flare prompt for an ordinary descending fixed-wing arrival', async () => {
    await mountFlight(); hooks().timeRef.current = 10;
    await frame(final(), input());
    expect(flareLabels()).toEqual(['FLARE — ease back on W']);
  });

  it.each(['isHelicopter', 'isDrone'])('omits fixed-wing flare instructions for %s', async kind => {
    const aircraft = FS.AIRCRAFT.find(item => item[kind]);
    expect(aircraft).toBeTruthy();
    await mountFlight({ aircraft: aircraft.id }); hooks().timeRef.current = 10;
    await frame(final({ rotorForwardFps: 120 }), input());
    expect(flareLabels()).toEqual([]);
  });

  it('lets stall recovery own the guidance instead of also asking for nose-up flare input', async () => {
    await mountFlight(); hooks().timeRef.current = 10;
    await frame(final({ stalling: true, aoa: 20 }), input({ pitch: 20 }));
    expect(texts).toContain('⚠️ STALL — REDUCE ANGLE OF ATTACK');
    expect(texts.join(' ')).toContain('Push S to lower nose');
    expect(flareLabels()).toEqual([]);
  });

  it('omits the flare prompt while the low-airspeed advisory is active', async () => {
    await mountFlight(); hooks().timeRef.current = 10;
    await frame(final({ lowAirspeed: true }), input());
    expect(texts).toContain('LOW AIRSPEED — monitor lift and angle of attack');
    expect(flareLabels()).toEqual([]);
  });
});
