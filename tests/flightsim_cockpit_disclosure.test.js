import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const helpers = () => window.__RR_TEST_EXPORTS__.flightSim;
const hooks = () => window.__testHooks.flightSim;
let tool, host, root, latest, widthDescriptor, patchSaved, painted, frameCallback, wallTime, paintErrors;

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  window.__testHooks = {};
  tool = loadTool(process.env.SKYSCHOOL_DISCLOSURE_SOURCE || 'stem_lab/stem_tool_flightsim.js', 'flightSim');
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  host?.remove();
  host = null;
  delete window.__RR_TEST_EXPORTS__;
  delete window.__testHooks;
  if (widthDescriptor) Object.defineProperty(window, 'innerWidth', widthDescriptor);
  widthDescriptor = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Flight coaching selects the immediate action', () => {
  const state = { onGround: false, altitude: 6000, fieldElev: 5500, vsi: 0, speed: 100, stalling: false };
  const controls = { throttle: 0.5, pitch: 0 };
  const hint = (s = {}, c = {}, aircraft = {}, vr = 55, ground = 5500, ias = 60) =>
    helpers().getFlightHintKind({ ...state, ...s }, { ...controls, ...c }, aircraft, vr, ground, ias);

  it('prioritizes reducing angle of attack in a low-altitude stall', () => {
    expect(hint({ stalling: true, altitude: 5600, vsi: -10 }, { throttle: 0.1 })).toBe('stall');
  });

  it('does not issue an airborne stall instruction while parked', () => {
    expect(hint({ onGround: true, stalling: true }, { throttle: 0.5 }, {}, 55, 5500, 20)).toBeNull();
  });

  it('uses height above terrain at a high-elevation airport', () => {
    expect(hint({ altitude: 5650, vsi: -10 }, { throttle: 0.1 }, {}, 55, 5500)).toBe('low');
  });

  it('does not mistake low MSL altitude for low height above the supplied terrain', () => {
    expect(hint({ altitude: 450, vsi: -10 }, { throttle: 0.1 }, {}, 55, -200)).toBeNull();
  });

  it.each([
    ['at least 500 ft above terrain', { altitude: 6000, vsi: -10 }, { throttle: 0.1 }],
    ['a shallow descent', { altitude: 5600, vsi: -5 }, { throttle: 0.1 }],
    ['sufficient power', { altitude: 5600, vsi: -10 }, { throttle: 0.3 }],
    ['ground contact', { onGround: true, altitude: 5500, vsi: -10 }, { throttle: 0.1 }],
  ])('omits the low-altitude instruction with %s', (_label, s, c) => {
    expect(hint(s, c, {}, 55, 5500, 20)).toBeNull();
  });

  it('offers fixed-wing power guidance only at low ground speed and idle power', () => {
    expect(hint({ onGround: true }, { throttle: 0 }, {}, 55, 5500, 0)).toBe('takeoff');
    expect(hint({ onGround: true }, { throttle: 0.1 }, {}, 55, 5500, 0)).toBeNull();
    expect(hint({ onGround: true }, { throttle: 0 }, {}, 55, 5500, 10)).toBeNull();
  });

  it.each([{ isHelicopter: true }, { isDrone: true }])('offers a vertical departure instruction for %j', aircraft => {
    expect(hint({ onGround: true }, { throttle: 0 }, aircraft, null, 5500, 0)).toBe('rotor-start');
    expect(hint({ onGround: true }, { throttle: 0.8 }, aircraft, null, 5500, 60)).toBeNull();
  });

  it('uses indicated airspeed for the rotation cue', () => {
    expect(hint({ onGround: true, speed: 300 }, { throttle: 0.8, pitch: 0 }, {}, 55, 5500, 54)).toBe('rotate');
    expect(hint({ onGround: true, speed: 300 }, { throttle: 0.8, pitch: 0 }, {}, 55, 5500, 45)).toBeNull();
  });

  it.each([
    ['below the cue range', { onGround: true }, { pitch: 0 }, 50],
    ['above the cue range', { onGround: true }, { pitch: 0 }, 70],
    ['already rotating', { onGround: true }, { pitch: 1 }, 60],
    ['airborne', { onGround: false }, { pitch: 0 }, 60],
  ])('does not repeat the rotation cue when %s', (_label, s, c, ias) => {
    expect(hint(s, c, {}, 55, 5500, ias)).toBeNull();
  });

  it('leaves ordinary cruise free of a persistent coaching paragraph', () => {
    expect(hint({ altitude: 10000, vsi: 0 }, { throttle: 0.6 }, {}, 55, 0, 110)).toBeNull();
  });
});

describe('Flight notices share one transient slot', () => {
  const pick = (notices, time = 10) => helpers().getFlightNotice(notices, time);

  it('returns no notice when there is no recorded event', () => {
    expect(pick([])).toBeNull();
  });

  it('accepts an event recorded at the start of the flight', () => {
    const event = { id: 'departure', time: 0 };
    expect(pick([event], 0)).toBe(event);
  });

  it('chooses the latest event at equal priority', () => {
    const older = { id: 'takeoff', time: 8 }, newer = { id: 'speed', time: 9 };
    expect(pick([newer, older])).toBe(newer);
  });

  it('lets a higher-priority event own the slot without stacking a later fact', () => {
    const relevant = { id: 'recovery', time: 8, priority: 3 };
    const fact = { id: 'discovery', time: 9, priority: 1 };
    expect(pick([fact, relevant])).toBe(relevant);
  });

  it('treats omitted priority as the default level', () => {
    const ordinary = { id: 'milestone', time: 9 };
    const important = { id: 'achievement', time: 8, priority: 1 };
    expect(pick([ordinary, important])).toBe(important);
  });

  it('expires the default-duration event at six seconds', () => {
    const event = { id: 'takeoff', time: 4 };
    expect(pick([event], 9.99)).toBe(event);
    expect(pick([event], 10)).toBeNull();
  });

  it('honors a supplied duration', () => {
    const event = { id: 'fact', time: 2, duration: 9 };
    expect(pick([event], 10)).toBe(event);
    expect(pick([event], 11)).toBeNull();
  });

  it('ignores future, expired, and invalid timestamps even at higher priority', () => {
    const visible = { id: 'visible', time: 9, priority: 0 };
    expect(pick([
      { id: 'future', time: 11, priority: 50 },
      { id: 'expired', time: 0, priority: 50 },
      { id: 'invalid', time: NaN, priority: 50 },
      { id: 'infinite', time: Infinity, priority: 50 },
      { id: 'missing', priority: 50 },
      visible,
    ])).toBe(visible);
  });

  it('does not mutate the retained flight notes or reorder their history', () => {
    const first = Object.freeze({ id: 'first', time: 8 });
    const second = Object.freeze({ id: 'second', time: 9 });
    const history = Object.freeze([first, second]);
    expect(pick(history)).toBe(second);
    expect(history).toEqual([first, second]);
  });
});

async function mount(seed = {}, launch = true) {
  vi.useFakeTimers();
  widthDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  painted = [];
  frameCallback = null;
  wallTime = 1000;
  paintErrors = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  const context = new Proxy({
    fillText(text, x, y) { painted.push({ text: String(text), x, y, font: this.font }); },
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }, {
    get(target, property) { return property in target ? target[property] : () => {}; },
    set(target, property, value) { target[property] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => {
    if (callback.name === 'loop') frameCallback = callback;
    return 1;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', ...seed } });
    latest = data.flightSim;
    patchSaved = patch => setData(previous => ({ ...previous, flightSim: { ...previous.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
  if (launch) await act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
}
async function paintFrame(state = {}, controls = {}, viewport = {}) {
  Object.assign(hooks().flightRef.current, state);
  Object.assign(hooks().controlsRef.current, controls);
  Object.assign(hooks().getWeatherRef().current, { wind: 0, turbulence: 0 });
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: viewport.width || 1280 });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: viewport.height || 720 });
  }
  painted.length = 0;
  wallTime += 100;
  expect(frameCallback).toBeTypeOf('function');
  await act(async () => frameCallback());
  expect(paintErrors).not.toHaveBeenCalled();
  return painted;
}

const buttons = selector => [...host.querySelectorAll(selector || 'button')];
const hidden = element => element.hidden || element.style.display === 'none';
async function click(element) {
  expect(element).toBeTruthy();
  await act(async () => element.click());
}

describe('Cockpit progressive disclosure', () => {
  it('launches a desktop flight with a folded deck and reachable pause and help', async () => {
    await mount();
    expect(latest.railCollapsed).toBe(true);
    expect(host.querySelector('[data-flightsim-command-rail]').getAttribute('data-rail-open')).toBe('false');
    expect(buttons('button[aria-label="Pause flight"]')).toHaveLength(1);
    expect(buttons('button[aria-label="Controls and help"]')).toHaveLength(1);
    expect(hidden(host.querySelector('.skyschool-status-rail'))).toBe(true);
  });

  it('preserves an explicitly expanded deck preference', async () => {
    await mount({ railCollapsed: false });
    expect(latest.railCollapsed).toBe(false);
    expect(host.querySelector('[data-flightsim-command-rail]').getAttribute('data-rail-open')).toBe('true');
    expect(hidden(host.querySelector('.skyschool-status-rail'))).toBe(false);
    expect(buttons('button[aria-label="Pause flight"]')).toHaveLength(1);
  });

  it('can pause and resume without expanding the deck', async () => {
    await mount();
    await click(host.querySelector('button[aria-label="Pause flight"]'));
    expect(hooks().pausedRef.current).toBe(true);
    expect(latest.railCollapsed).toBe(true);
    await click(host.querySelector('button[aria-label="Resume flight"]'));
    expect(hooks().pausedRef.current).toBe(false);
    expect(latest.railCollapsed).toBe(true);
  });

  it('opens the paused controls reference directly from the folded deck', async () => {
    await mount();
    await click(host.querySelector('button[aria-label="Controls and help"]'));
    expect(host.querySelector('[data-flightsim-help]')).toBeTruthy();
    expect(hooks().pausedRef.current).toBe(true);
    await click(buttons().find(element => element.textContent === 'Close help'));
    expect(host.querySelector('[data-flightsim-help]')).toBeNull();
    expect(hooks().pausedRef.current).toBe(false);
    expect(document.activeElement).toBe(host.querySelector('canvas[role="application"]'));
  });

  it('keeps the complete departure walkthrough available without displaying all steps by default', async () => {
    await mount();
    const walkthrough = host.querySelector('details[data-flight-walkthrough]');
    expect(walkthrough).toBeTruthy();
    expect(walkthrough.open).toBe(false);
    expect(walkthrough.querySelector('summary')).toBeTruthy();
    expect(walkthrough.querySelectorAll('ol li').length).toBeGreaterThanOrEqual(4);
    expect(walkthrough.textContent).toContain('Shift');
    expect(walkthrough.textContent).toContain('rotation speed');
  });

  it('allows optional information to be turned on from the expanded deck', async () => {
    await mount({ railCollapsed: false });
    const toggle = buttons().find(element => /More information/i.test(element.textContent));
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    await click(toggle);
    expect(latest.flightDetails).toBe(true);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    await click(toggle);
    expect(latest.flightDetails).toBe(false);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });

  it('keeps the challenge checklist folded during flight and open in its debrief', async () => {
    // Departures belong to menu/lesson/review controls; a running free flight
    // deliberately rejects a later retained launch action.
    await mount({}, false);
    expect(latest.view).toBe('menu');
    await act(async () => hooks().startFlightChallenge('first_climb'));
    expect(latest.view).toBe('flying');
    expect(latest.selectedChallenge).toBe('first_climb');
    const flightChallenge = host.querySelector('section[aria-label="Flight challenge"]');
    expect(flightChallenge).toBeTruthy();
    const checklist = [...flightChallenge.querySelectorAll('details')].find(element => element.querySelector('summary')?.textContent === 'Objective checklist');
    expect(checklist).toBeTruthy();
    expect(checklist.open).toBe(false);
    await click(buttons().find(element => element.textContent === 'End challenge'));
    expect(latest.view).toBe('debrief');
    const result = host.querySelector('section[aria-label="Challenge result"]');
    const reviewChecklist = [...result.querySelectorAll('details')].find(element => element.querySelector('summary')?.textContent === 'Objective checklist');
    expect(reviewChecklist.open).toBe(true);
  });
});


// Hold the physical state while exercising the real frame's event selection,
// painting, React refresh, and saved debrief. Physics has its own behavior suites.
function holdFlightState() {
  const physics = helpers().Physics;
  vi.spyOn(physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: physics.WEIGHT, weight: physics.WEIGHT, drag: 0, thrust: 0 },
  }));
}
async function mountQuiet(seed = {}) {
  await mount({ takeoffTutorialDismissed: true, landingTutorialDismissed: true,
    earnedBadges: Object.fromEntries(helpers().ACHIEVEMENTS.map(achievement => [achievement.id, true])),
    ...seed,
  });
  holdFlightState();
}
// 240 ft/s is about 142 kt true, 103 kt indicated at 19,000 ft: every milestone at once.
const cruise = { lat: 40, lon: -40, altitude: 19000, fieldElev: 0, speed: 240, vsi: 0,
  heading: 90, onGround: false, stalling: false, lowAirspeed: false, hitCeiling: false };
const levelControls = { throttle: 0.6, pitch: 0, bank: 0, flaps: 0, brake: 0 };
const milestoneTitles = ['Liftoff', '100 knots', '5,000 ft', '10,000 ft', 'Flight Level 180'];
const paintedText = () => painted.map(command => command.text);

describe('Mounted cockpit information priority and retained evidence', () => {
  it('paints one brief title when several milestones happen together and retains every full note', async () => {
    await mountQuiet({ railCollapsed: false });
    await paintFrame(cruise, levelControls);
    const texts = paintedText();
    expect(texts.filter(text => milestoneTitles.includes(text))).toEqual(['Flight Level 180']);
    expect(texts.some(text => /Lift just exceeded weight|A knot =|required minimum flight crew|standard pressure/.test(text))).toBe(false);
    const notes = host.querySelector('[data-flight-notes]');
    expect(notes).toBeTruthy();
    expect(notes.open).toBe(false);
    expect([...notes.querySelectorAll('strong')].map(element => element.textContent)).toEqual(milestoneTitles);
    expect(notes.textContent).toContain('A knot = 1 nautical mile per hour');
    expect(notes.textContent).toContain('14 CFR 91.211');
  });

  it('keeps one brief milestone title and retains full explanations when more information is selected', async () => {
    await mountQuiet({ railCollapsed: false });
    await paintFrame(cruise, levelControls);
    expect(paintedText().some(text => text.includes('required minimum flight crew'))).toBe(false);
    await click(buttons().find(element => /More information/i.test(element.textContent)));
    await paintFrame(cruise, levelControls);
    expect(paintedText().some(text => text.includes('Lift just exceeded weight'))).toBe(false);
    expect(paintedText().some(text => text.includes('required minimum flight crew'))).toBe(false);
    expect(paintedText().filter(text => milestoneTitles.includes(text))).toEqual(['Flight Level 180']);
    const notes = host.querySelector('[data-flight-notes]');
    expect(notes).toBeTruthy();
    expect(notes.open).toBe(false);
    expect([...notes.querySelectorAll('strong')].map(element => element.textContent)).toEqual(milestoneTitles);
    expect(notes.textContent).toContain('Lift just exceeded weight');
    expect(notes.textContent).toContain('A knot = 1 nautical mile per hour');
    expect(notes.textContent).toContain('required minimum flight crew');
    expect(notes.textContent).toContain('14 CFR 91.211');
  });

  it('keeps the stall warning and recovery action visible while suppressing noncritical notices', async () => {
    await mountQuiet();
    await paintFrame(cruise, levelControls);
    expect(paintedText()).toContain('Flight Level 180');
    await paintFrame({ ...cruise, stalling: true, aoa: helpers().Physics.CRITICAL_AOA + 2 }, { ...levelControls, pitch: 20 });
    const texts = paintedText();
    expect(texts).toContain('⚠️ STALL — BRING AoA TOWARD ZERO');
    expect(texts.join(' ')).toContain('Push S to lower nose');
    expect(texts.some(text => milestoneTitles.includes(text))).toBe(false);
    expect(texts.some(text => /Lift just exceeded weight|Discovered:/.test(text))).toBe(false);
  });

  it('keeps quiet discoveries available in Flight notes and saves their complete facts in the debrief', async () => {
    await mountQuiet();
    const place = helpers().GEO_PLACES.find(item => item.name === 'Washington D.C.');
    expect(place).toBeTruthy();
    await paintFrame({ ...cruise, lat: place.lat, lon: place.lon, altitude: 6000 }, levelControls);
    expect(paintedText().join(' ')).toContain('Discovered: Washington D.C.');
    expect(paintedText().join(' ')).not.toContain(place.fact);
    await click(host.querySelector('button[aria-label="Expand the flight deck controls"]'));
    const flightNotes = host.querySelector('[data-flight-notes]');
    expect(flightNotes.open).toBe(false);
    expect(flightNotes.textContent).toContain(place.fact);
    await click(buttons().find(element => /Exit$/.test(element.textContent)));
    expect(latest.view).toBe('debrief');
    expect(latest.lastDebrief.discoveredPlaces).toContainEqual(place);
    expect(latest.lastDebrief.flightNotes.find(note => note.title === 'Liftoff').message).toContain('Lift just exceeded weight');
    expect(host.querySelector('[data-flight-notes]').textContent).toContain(place.fact);
  });

  it('advances the single departure cue with power and indicated airspeed, and clears it while the deck is expanded', async () => {
    await mount();
    holdFlightState();
    expect(host.querySelector('[data-flight-current-cue]').textContent).toContain('Hold SHIFT');
    const parked = { ...hooks().flightRef.current, onGround: true, speed: 30, vsi: 0,
      stalling: false, lowAirspeed: false, hitCeiling: false };
    await paintFrame(parked, { ...levelControls, throttle: 0.8 });
    expect(latest.tutorialCue).toBe('roll');
    expect(host.querySelector('[data-flight-current-cue]').textContent).toContain('Build airspeed');
    const aircraft = helpers().AIRCRAFT.find(item => item.id === 'cessna172');
    const rotation = helpers().aircraftVrKts(aircraft);
    await paintFrame({ ...parked, speed: (rotation + 2) / 0.5924838 }, { ...levelControls, throttle: 0.8 });
    expect(latest.tutorialCue).toBe('rotate');
    expect(host.querySelector('[data-flight-current-cue]').textContent).toContain('Press W');
    expect(host.querySelector('[data-flight-walkthrough]').open).toBe(false);
    await click(host.querySelector('button[aria-label="Expand the flight deck controls"]'));
    expect(host.querySelector('[data-flight-current-cue]')).toBeNull();
    expect(host.querySelector('.skyschool-tutorial-card')).toBeNull();
    await click(host.querySelector('button[aria-label="Collapse the flight deck controls"]'));
    expect(host.querySelector('[data-flight-current-cue]').textContent).toContain('Press W');
  });

  it('records a milestone at time zero once across paused resize repaints', async () => {
    await mountQuiet({ railCollapsed: false });
    await click(host.querySelector('button[aria-label="Pause flight"]'));
    hooks().timeRef.current = 0;
    const state = { ...cruise, altitude: 6000 };
    await paintFrame(state, levelControls);
    const before = [...host.querySelector('[data-flight-notes]').querySelectorAll('strong')].map(element => element.textContent);
    expect(before).toEqual(['Liftoff', '100 knots', '5,000 ft']);
    expect(hooks().timeRef.current).toBe(0);
    await paintFrame(state, levelControls, { width: 1279 });
    const after = [...host.querySelector('[data-flight-notes]').querySelectorAll('strong')].map(element => element.textContent);
    expect(after).toEqual(before);
    expect(hooks().timeRef.current).toBe(0);
  });
});
