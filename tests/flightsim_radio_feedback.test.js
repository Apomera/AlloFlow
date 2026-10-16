import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let FS, tool, host, reactRoot, latest, setData, frameCallback, errors, texts, rects, wallTime, physicsSnapshot;
const hooks = () => window.__testHooks.flightSim;
const state = (patch = {}) => ({ speed: 0, altitude: 76, fieldElev: 76, vsi: 0, heading: 0,
  lat: 43.646, lon: -70.309, onGround: true, ...patch });
const controls = (patch = {}) => ({ throttle: 0, pitch: 0, bank: 0, yawRate: 0, brake: 0, flaps: 0, ...patch });
const measure = text => Array.from(String(text)).reduce((width, character) => width + (/[^\x00-\x7F]/.test(character) ? 11 : /[MW]/.test(character) ? 9 : 5.2), 0);
const entry = (msg, t = 10) => ({ msg, t, field: 'PWM' });
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab();
  window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); FS = window.__RR_TEST_EXPORTS__.flightSim;
  physicsSnapshot = Object.getOwnPropertyDescriptors(FS.Physics);
  texts = []; rects = []; wallTime = 1000;
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

function radioEvents(patch = {}, input = {}, options = {}) {
  return FS.getFlightRadioEvents(state(patch), controls(input), options.aircraft || {},
    options.airport === null ? null : FS.WAYPOINTS.find(item => item.id === 'kpwm'),
    options.distance ?? 0, options.landing || {}, options.time ?? 10);
}

describe('radio phase evidence', () => {
  it('requires a selected field within two nautical miles', () => {
    for (const distance of [-1, NaN, Infinity, 2.001, 20]) {
      expect(radioEvents({ _ignitionTime: 1 }, {}, { distance })).toEqual([]);
    }
    expect(radioEvents({ _ignitionTime: 1 }, {}, { airport: null })).toEqual([]);
    expect(radioEvents({ _ignitionTime: 1 }, {}, { distance: 2 })).toEqual(['start']);
  });
  it('requires takeoff power and released brakes rather than rollout speed alone', () => {
    const rollout = { speed: 25 / 0.5924838 };
    expect(radioEvents(rollout)).toEqual([]);
    expect(radioEvents(rollout, { throttle: 1, brake: 1 })).toEqual([]);
    expect(radioEvents(rollout, { throttle: 0.49 })).toEqual([]);
    expect(radioEvents(rollout, { throttle: 0.5 })).toEqual(['takeoff']);
    expect(radioEvents(rollout, { throttle: 1 }, { aircraft: { isHelicopter: true } })).toEqual([]);
    expect(radioEvents(rollout, { throttle: 1 }, { aircraft: { isDrone: true } })).toEqual([]);
  });
  it('distinguishes climb, descent, and rotor phases without a descending departure cue', () => {
    expect(radioEvents({ onGround: false, altitude: 626, vsi: 5 })).toEqual(['departure']);
    expect(radioEvents({ onGround: false, altitude: 626, vsi: -5 })).toEqual([]);
    expect(radioEvents({ onGround: false, altitude: 376, vsi: -5 })).toEqual(['final']);
    expect(radioEvents({ onGround: false, altitude: 1576, vsi: -5 })).toEqual(['entry']);
    expect(radioEvents({ onGround: false, altitude: 376, vsi: -5 }, {}, { aircraft: { isDrone: true } })).toEqual([]);
  });
  it('requires a scored contact at the same airport and accepts a touchdown at time zero', () => {
    const contact = { scored: true, airportVicinity: true, touchdownAirportId: 'kpwm', touchdownTime: 0 };
    expect(radioEvents({}, {}, { landing: contact, time: 0 })).toEqual(['contact']);
    for (const patch of [{ scored: false }, { airportVicinity: false }, { touchdownAirportId: 'kden' }, { touchdownTime: NaN }, { touchdownTime: 1 }]) {
      expect(radioEvents({}, {}, { landing: { ...contact, ...patch }, time: 0 })).toEqual([]);
    }
    expect(radioEvents({}, {}, { landing: contact, time: 3 })).toEqual([]);
    expect(radioEvents({ onGround: false }, {}, { landing: contact, time: 0 })).toEqual([]);
  });
});

describe('measured radio panel', () => {
  it('chooses one latest fresh entry by default and at most four in More Info without mutation', () => {
    const original = Object.freeze([entry('third', 8), entry('first', 2), entry('fourth', 9), entry('second', 4), entry('latest', 10)]);
    expect(FS.getFlightRadioEntries(original, 10, false).map(row => row.msg)).toEqual(['latest']);
    expect(FS.getFlightRadioEntries(original, 10, true).map(row => row.msg)).toEqual(['second', 'third', 'fourth', 'latest']);
    expect(original.map(row => row.msg)).toEqual(['third', 'first', 'fourth', 'second', 'latest']);
  });
  it('rejects invalid, empty, future, and expired transmissions while keeping a time-zero message', () => {
    const messages = [entry('time zero', 0), entry('expired', -3), entry('future', 11), { msg: 'bad', t: NaN }, entry('  ', 10), null];
    expect(FS.getFlightRadioEntries(messages, 10, true).map(row => row.msg)).toEqual(['time zero']);
    expect(FS.getFlightRadioEntries(messages, 12, false).map(row => row.msg)).toEqual(['future']);
    expect(FS.getFlightRadioEntries(messages, NaN, true)).toEqual([]);
    expect(FS.getFlightRadioEntries(null, 10, true)).toEqual([]);
  });
  it.each([[320, 844], [375, 667], [1280, 720]])('fits long localized text within %s by %s and clears primary instruments', (W, H) => {
    const dock = { x: 8, y: 62, w: 215, h: 64 };
    const panel = FS.getFlightRadioPanel(W, H, [entry('PWM training radio: WWWWWW飛行安全確認してください超長文字列 '.repeat(8))], 10, { dock }, measure);
    expect(panel).not.toBeNull(); expect(panel.rows).toHaveLength(1);
    expect(panel.rows[0].lines.length).toBeLessThanOrEqual(2);
    expect(panel.rows[0].lines.at(-1)).toMatch(/…$/);
    for (const line of panel.rows[0].lines) expect(measure(line)).toBeLessThanOrEqual(panel.w - 32 + 1e-8);
    expect(panel.x).toBeGreaterThanOrEqual(8); expect(panel.x + panel.w).toBeLessThanOrEqual(W - 48);
    expect(panel.y + panel.h).toBeLessThanOrEqual(H / 2 - 44);
    const instruments = FS.getFlightInstrumentLayout(W, H, false);
    for (const obstacle of [dock, instruments.speed, instruments.altitude,
      { x: instruments.map.x, y: instruments.map.y, w: instruments.map.size, h: instruments.map.size },
      { x: W - 48, y: 0, w: 48, h: 216 }]) expect(overlaps(panel, obstacle)).toBe(false);
  });
  it('shows history only with More Info and reduces it when a phone mission leaves room for one entry', () => {
    const messages = [1, 2, 3, 4].map((n, i) => entry('Radio message ' + n, 7 + i));
    const wide = FS.getFlightRadioPanel(1280, 720, messages, 10, { details: true }, measure);
    expect(wide.rows).toHaveLength(4);
    const compact = FS.getFlightRadioPanel(320, 844, messages, 10,
      { details: true, mission: true, dock: { x: 8, y: 62, w: 215, h: 64 } }, measure);
    expect(compact.rows.length).toBeLessThan(4);
    expect(compact.rows.at(-1).entry.msg).toBe('Radio message 4');
    const mission = FS.getFlightMissionStripLayout(320, 844, { x: 8, y: 62, w: 215, h: 64 });
    expect(overlaps(compact, mission)).toBe(false);
    expect(FS.getFlightRadioPanel(1280, 720, messages, 10, {}, measure).rows).toHaveLength(1);
  });
  it('reserves contact cards, wind and ATIS in the detailed cockpit', () => {
    const panel = FS.getFlightRadioPanel(1280, 720, [entry('PWM radio contact')], 10,
      { details: true, contact: true, wind: true }, measure);
    expect(panel).not.toBeNull();
    const instruments = FS.getFlightInstrumentLayout(1280, 720, false);
    for (const obstacle of [instruments.atis, instruments.navigation,
      { x: 500, y: 216, w: 280, h: 80 }, { x: 1162, y: 137, w: 46, h: 58 }]) {
      expect(overlaps(panel, obstacle)).toBe(false);
    }
  });
  it('yields to a critical warning, tutorial, help, expanded dock, or short landscape with no safe slot', () => {
    const message = [entry('PWM training radio: Taxi slowly; check wind and brakes.')];
    for (const option of [{ critical: true }, { tutorial: true }, { blocked: true }, { contact: true }, { mission: true },
      { dock: { x: 8, y: 62, w: 1264, h: 400 } }, { reserved: [{ x: 0, y: 88, w: 1280, h: 632 }] }]) {
      expect(FS.getFlightRadioPanel(1280, 720, message, 10, option, measure)).toBeNull();
    }
    expect(FS.getFlightRadioPanel(600, 360, message, 10, {}, measure)).toBeNull();
    expect(FS.getFlightRadioPanel(NaN, 720, message, 10, {}, measure)).toBeNull();
  });
  it('fades with simulation time and disappears at twelve seconds', () => {
    const message = [entry('PWM training radio', 0)];
    expect(FS.getFlightRadioPanel(1280, 720, message, 8, {}, measure).rows[0].alpha).toBe(1);
    expect(FS.getFlightRadioPanel(1280, 720, message, 10, {}, measure).rows[0].alpha).toBe(0.5);
    expect(FS.getFlightRadioPanel(1280, 720, message, 12, {}, measure)).toBeNull();
  });
});

async function mountFlight(patch = {}, W = 1280, H = 720) {
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const context = new Proxy({ fillText(text, x, y, maxWidth) { texts.push({ text: String(text), x, y, maxWidth, font: this.font }); },
    roundRect(x, y, w, h, radius) { rects.push({ x, y, w, h, radius, font: this.font }); },
    measureText: text => ({ width: measure(text) }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} })
  }, { get(target, key) { return key in target ? target[key] : () => {}; }, set(target, key, value) { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { if (callback.name === 'loop') frameCallback = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div'); document.body.appendChild(host); reactRoot = ReactDOMClient.createRoot(host);
  function App() {
    const [data, updateData] = React.useState({ flightSim: { view: 'menu', railCollapsed: true,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.map(item => [item.id, true])), ...patch } });
    latest = data.flightSim; setData = updateData;
    return tool.render(makeCtx({ toolData: data, setToolData: updateData,
      update: (id, key, value) => updateData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, value) => updateData(old => ({ ...old, [id]: { ...old[id], ...value } })) }));
  }
  await act(async () => reactRoot.render(React.createElement(App)));
  await act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
  resize(W, H);
  const dock = host.querySelector('[data-flightsim-hud-dock]');
  for (const [key, value] of Object.entries({ offsetLeft: 8, offsetTop: 62, offsetWidth: 215, offsetHeight: 64 })) {
    Object.defineProperty(dock, key, { configurable: true, value });
  }
  Object.assign(hooks().flightRef.current, state()); Object.assign(hooks().controlsRef.current, controls());
  Object.assign(hooks().getWeatherRef().current, { wind: 0, turbulence: 0 }); hooks().timeRef.current = 10;
}
function resize(W, H = 720) {
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: W });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: H });
  }
}
async function frame() {
  texts.length = 0; rects.length = 0; wallTime += 100; expect(frameCallback).toBeTypeOf('function');
  await act(async () => frameCallback()); expect(errors).not.toHaveBeenCalled();
}
function seedRadio(messages) { hooks().flightRef.current._atcLog = messages; }
const recordedRadio = () => texts.filter(item => item.font === '10px system-ui' && /RADIO|training radio|Ground contact recorded/.test(item.text));

describe('contextual radio in the production frame loop', () => {
  it('paints only the latest transmission by default and exposes history through More Info', async () => {
    await mountFlight(); seedRadio([entry('RADIO first', 7), entry('RADIO second', 8), entry('RADIO latest', 10)]);
    await frame(); expect(recordedRadio().map(item => item.text)).toEqual(['RADIO latest']);
    await act(async () => setData(old => ({ ...old, flightSim: { ...old.flightSim, flightDetails: true } })));
    await frame(); expect(recordedRadio().map(item => item.text)).toEqual(['RADIO first', 'RADIO second', 'RADIO latest']);
  });
  it('fits phone radio lines before the power column and outside the folded command dock', async () => {
    await mountFlight({}, 320, 844); seedRadio([entry('RADIO WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW '.repeat(5))]);
    await frame(); const painted = recordedRadio(); expect(painted.length).toBeGreaterThan(0);
    for (const text of painted) {
      expect(text.font).toBe('10px system-ui'); expect(text.x).toBeGreaterThanOrEqual(24);
      expect(text.x + measure(text.text)).toBeLessThanOrEqual(320 - 48);
      expect(text.y).toBeGreaterThanOrEqual(134); expect(text.y).toBeLessThan(216);
    }
  });
  it.each([[0, false], [1, true]])('keeps idle or braked rollout out of takeoff radio (%s power, brakes %s)', async (throttle, brake) => {
    await mountFlight(); Object.assign(hooks().flightRef.current, state({ speed: 25 / 0.5924838 }));
    Object.assign(hooks().controlsRef.current, controls({ throttle })); if (brake) hooks().keysRef.current.x = true;
    await frame(); expect(hooks().flightRef.current._atcLog.some(item => item.tag === 'takeoff')).toBe(false);
  });
  it('records one powered takeoff cue without claiming an operational clearance', async () => {
    await mountFlight(); Object.assign(hooks().flightRef.current, state({ speed: 25 / 0.5924838 }));
    Object.assign(hooks().controlsRef.current, controls({ throttle: 1 })); await frame(); await frame();
    const log = hooks().flightRef.current._atcLog.filter(item => item.tag === 'takeoff');
    expect(log).toHaveLength(1); expect(log[0].msg).toContain('training radio'); expect(log[0].msg).toContain('Takeoff roll');
    expect(log[0].msg).not.toMatch(/cleared|clearance/i);
  });
  it.each([['airspeed', 'AIRSPEED BUILDING'], ['vr', 'ROTATE — pitch up (W)']])('keeps phone radio clear of the first and held %s coaching cue', async (phase, cue) => {
    await mountFlight({}, 375, 667);
    const vrKts = Math.round(FS.Physics.stallSpeed(76) * 0.5924838 * 1.1);
    const cueKts = phase === 'airspeed' ? Math.round(vrKts * 0.82) + 1 : vrKts + 1;
    Object.assign(hooks().flightRef.current, state({ speed: cueKts / 0.5924838 }));
    Object.assign(hooks().controlsRef.current, controls({ throttle: 1 }));
    seedRadio([entry('RADIO fresh takeoff cue')]);
    expect(hooks().flightRef.current._callouts?.[phase] || 0).toBe(0);
    const assertClear = () => {
      const coaching = texts.find(item => item.font === 'bold 20px system-ui' && item.text === cue);
      expect(coaching).toBeDefined();
      const cards = rects.filter(box => box.font === 'bold 20px system-ui' && box.y === 667 * 0.25 - 28 && box.h === 54);
      expect(cards).toHaveLength(2); // Filled card and its outline share the fitted bounds.
      for (const card of cards) {
        expect(card.x).toBeGreaterThanOrEqual(8); expect(card.x + card.w).toBeLessThanOrEqual(375 - 56);
        expect(card.w).toBeLessThanOrEqual(375 - 64);
        expect(coaching.x).toBeCloseTo(card.x + card.w / 2);
        expect(coaching.maxWidth).toBeGreaterThan(0); expect(coaching.maxWidth).toBeLessThanOrEqual(card.w - 40);
        expect(coaching.x - coaching.maxWidth / 2).toBeGreaterThanOrEqual(card.x + 20 - 1e-8);
        expect(coaching.x + coaching.maxWidth / 2).toBeLessThanOrEqual(card.x + card.w - 20 + 1e-8);
      }
      const painted = recordedRadio(); expect(painted.length).toBeGreaterThan(0);
      for (const text of painted) {
        expect(text.x + measure(text.text)).toBeLessThanOrEqual(375 - 48);
        expect(text.y - 3).toBeGreaterThanOrEqual(667 * 0.25 - 28 + 54 + 8);
      }
    };
    await frame(); assertClear();
    const cueTime = hooks().flightRef.current._callouts[phase]; expect(cueTime).toBeGreaterThan(0);
    await frame(); assertClear(); expect(hooks().flightRef.current._callouts[phase]).toBe(cueTime);
  });
  it('does not display nearby-field messages outside the airport vicinity', async () => {
    await mountFlight(); Object.assign(hooks().flightRef.current, state({ lat: 43.75, _ignitionTime: 1 }));
    seedRadio([entry('RADIO off-field')]); await frame(); expect(recordedRadio()).toEqual([]);
    expect(hooks().flightRef.current._atcLog).toHaveLength(1);
  });
  it('records airport contact after the real impact and avoids praising a hard landing', async () => {
    await mountFlight(); Object.assign(hooks().getLandingRef().current, { wasAirborne: true, peakAGL: 150, scored: false });
    Object.assign(hooks().flightRef.current, state({ altitude: 76.01, speed: 80, vsi: -8, onGround: false }));
    await frame(); expect(hooks().getLandingRef().current.scored).toBe(true); await frame();
    const contact = hooks().flightRef.current._atcLog.filter(item => item.tag === 'contact');
    expect(contact).toHaveLength(1); expect(contact[0].msg).toContain('Ground contact recorded');
    expect(contact[0].msg).not.toMatch(/nice|smooth|cleared|runway at/i);
    await frame(); expect(hooks().flightRef.current._atcLog.filter(item => item.tag === 'contact')).toHaveLength(1);
  });
  it('does not manufacture touchdown radio from an unscored floor state', async () => {
    await mountFlight(); Object.assign(hooks().getLandingRef().current, { scored: false, touchdownTime: 10, airportVicinity: true, touchdownAirportId: 'kpwm' });
    await frame(); expect(hooks().flightRef.current._atcLog.some(item => item.tag === 'contact')).toBe(false);
  });
  it('yields the windscreen to a real stall warning and the takeoff tutorial', async () => {
    await mountFlight(); seedRadio([entry('RADIO warning competitor')]);
    Object.assign(hooks().flightRef.current, state({ onGround: false, altitude: 1200, speed: 100, vsi: -40 }));
    Object.assign(hooks().controlsRef.current, controls({ pitch: 15 })); await frame();
    expect(hooks().flightRef.current.stalling).toBe(true); expect(recordedRadio()).toEqual([]);
    Object.assign(hooks().flightRef.current, state()); Object.assign(hooks().controlsRef.current, controls());
    await act(async () => setData(old => ({ ...old, flightSim: { ...old.flightSim, takeoffTutorialDismissed: false } })));
    await frame(); expect(host.querySelector('.skyschool-tutorial-card')).not.toBeNull(); expect(recordedRadio()).toEqual([]);
  });
  it('keeps the same transmission during paused repaint and expires by simulation time', async () => {
    await mountFlight(); seedRadio([entry('RADIO paused')]); await frame();
    const logTime = hooks().flightRef.current._atcLog[0].t; hooks().pausedRef.current = true; const pausedTime = hooks().timeRef.current;
    await frame(); expect(recordedRadio().map(item => item.text)).toEqual(['RADIO paused']); await frame(); expect(texts).toHaveLength(0);
    resize(1260); await frame(); expect(hooks().timeRef.current).toBe(pausedTime); expect(recordedRadio().map(item => item.text)).toEqual(['RADIO paused']);
    expect(hooks().flightRef.current._atcLog[0].t).toBe(logTime);
    hooks().pausedRef.current = false; hooks().timeRef.current = logTime + 12; await frame(); expect(recordedRadio()).toEqual([]);
  });
});
