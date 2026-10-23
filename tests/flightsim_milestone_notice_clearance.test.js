import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const hooks = () => window.__testHooks.flightSim;
let FS, tool, host, root, nextFrame, wallTime, commands, path, errors, physicsSnapshot, latest, translations;
const cruise = patch => ({ lat: 0, lon: 0, altitude: 35000, fieldElev: 0, speed: 800,
  vsi: 0, heading: 0, onGround: false, aoa: 5, stalling: false, lowAirspeed: false,
  hitCeiling: false, ...patch });
const input = patch => ({ throttle: 0.5, pitch: 0, bank: 0, yawRate: 0, brake: 0, flaps: 0, ...patch });
const milestoneTitles = ['Liftoff', '100 knots', '5,000 ft', '10,000 ft', 'Flight Level 180', '30,000 ft'];
const rect = (x, y, w, h) => ({ x, y, w, h, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h });
const overlaps = (a, b, gap = 0) => a.x < b.x + b.w + gap && a.x + a.w + gap > b.x
  && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab();
  window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  physicsSnapshot = Object.getOwnPropertyDescriptors(FS.Physics);
  commands = []; path = []; nextFrame = null; wallTime = 1000; translations = {};
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const gfx = new Proxy({
    beginPath() { path = []; },
    roundRect(...args) { path.push({ method: 'roundRect', args }); },
    arc(...args) { path.push({ method: 'arc', args }); },
    fill() { commands.push({ method: 'fill', fill: this.fillStyle,
      path: path.map(item => ({ ...item, args: [...item.args] })) }); },
    fillRect(x, y, w, h) { commands.push({ method: 'fillRect', x, y, w, h, fill: this.fillStyle }); },
    fillText(text, x, y) { commands.push({ method: 'fillText', text: String(text), x, y,
      font: this.font, baseline: this.textBaseline, align: this.textAlign }); },
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

async function mount({ width = 1280, height = 1000, chase = false, patch = {} } = {}) {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', thirdPerson: chase,
      railCollapsed: true, flightDetails: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.map(item => [item.id, true])), ...patch } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      t: (key, fallback) => translations[key] ?? fallback ?? key,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, value) => setData(old => ({ ...old, [id]: { ...old[id], ...value } })) }));
  }
  await act(async () => root.render(React.createElement(App)));
  const departure = host.querySelector('button[aria-label="Free Flight from Portland, ME"]');
  expect(departure).toBeTruthy(); await act(async () => departure.click());
  sizeCanvases(width, height);
  const dock = host.querySelector('[data-flightsim-hud-dock]');
  for (const [key, value] of Object.entries({ offsetLeft: 10, offsetTop: 66, offsetWidth: 144, offsetHeight: 64 })) {
    Object.defineProperty(dock, key, { configurable: true, value });
  }
  Object.assign(hooks().getWeatherRef().current, { type: 'clear', wind: 0, turbulence: 0 });
  // Hold only motion. Production event recording, cue arbitration, painter,
  // live notes and finish serialization all run on each actual loop frame.
  vi.spyOn(FS.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: FS.Physics.WEIGHT, weight: FS.Physics.WEIGHT, drag: 0, thrust: 0 } }));
  hooks().timeRef.current = 12;
}
function sizeCanvases(width, height) {
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: width });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: height });
    canvas.getBoundingClientRect = () => rect(0, 0, width, height);
  }
}
async function frame(state, controls = input()) {
  if (state) Object.assign(hooks().flightRef.current, state);
  Object.assign(hooks().controlsRef.current, controls);
  commands.length = 0; path = []; wallTime += 100;
  expect(nextFrame).toBeTypeOf('function'); await act(async () => nextFrame());
  expect(errors).not.toHaveBeenCalled();
}
const texts = () => commands.filter(item => item.method === 'fillText').map(item => item.text);
const cards = () => commands.filter(item => item.method === 'fill' && item.fill === 'rgba(2,6,23,0.85)')
  .flatMap(item => item.path.filter(part => part.method === 'roundRect').map(part => rect(...part.args)));
function expectNoFactStrips() {
  expect(texts().filter(text => /LIFTOFF!|100 knots!|5,000 ft!|10,000 ft!|Flight Level 180!|30,000 ft —|single observation does not establish/.test(text))).toEqual([]);
}
async function expand() {
  const button = host.querySelector('button[aria-label="Expand the flight deck controls"]');
  expect(button).toBeTruthy(); await act(async () => button.click());
}
async function finish() {
  if (host.querySelector('button[aria-label="Expand the flight deck controls"]')) await expand();
  const exit = [...host.querySelectorAll('button')].find(button => /Exit$/.test(button.textContent));
  expect(exit).toBeTruthy(); await act(async () => exit.click());
  expect(latest.view).toBe('debrief'); return latest.lastDebrief;
}
function expectCardClear(card, width, height, chase, dock = null) {
  expect(card.x - 0.5).toBeGreaterThanOrEqual(0);
  expect(card.y - 0.5).toBeGreaterThanOrEqual(60);
  expect(card.x + card.w + 0.5).toBeLessThanOrEqual(width);
  expect(card.y + card.h + 0.5).toBeLessThanOrEqual(height);
  const layout = FS.getFlightInstrumentLayout(width, height, chase, false);
  for (const [name, box] of Object.entries({ heading: layout.heading, speed: layout.speed, altitude: layout.altitude })) {
    expect(overlaps(card, box, 4), 'notice must clear painted ' + name).toBe(false);
  }
  const circles = [{ x: layout.map.x + layout.map.size / 2, y: layout.map.y + layout.map.size / 2, r: layout.map.size / 2 + 4 },
    { ...layout.vsi, r: layout.vsi.r + 1 }, { ...layout.horizon, r: layout.horizon.r + 1 }];
  for (const circle of circles) {
    const closestX = Math.max(card.x, Math.min(card.x + card.w, circle.x));
    const closestY = Math.max(card.y, Math.min(card.y + card.h, circle.y));
    expect(Math.hypot(closestX - circle.x, closestY - circle.y) - circle.r,
      'notice must clear complete instrument rims').toBeGreaterThanOrEqual(4);
  }
  if (dock) expect(overlaps(card, dock, 4), 'notice must clear measured painted controls').toBe(false);
}

describe('one milestone notice with complete durable flight notes', () => {
  it.each([false, true])('replaces six simultaneous full-fact strips with one readable title in details mode, chase=%s', async chase => {
    await mount({ chase }); await frame(cruise());
    expectNoFactStrips(); expect(cards()).toHaveLength(1);
    expect(texts().filter(text => milestoneTitles.includes(text))).toEqual(['30,000 ft']);
    expectCardClear(cards()[0], 1280, 1000, chase);
    await expand();
    const notes = host.querySelector('[data-flight-notes-scope="live"]');
    expect([...notes.querySelectorAll('strong')].map(item => item.textContent)).toEqual(milestoneTitles);
    const messages = [...notes.querySelectorAll('p')].map(item => item.textContent);
    expect(messages).toHaveLength(6);
    expect(messages.join(' ')).toContain('flying faster does not make more lift');
    expect(messages.join(' ')).toContain('14 CFR 91.211');
    const db = await finish();
    expect(db.flightNotes).toEqual(milestoneTitles.map((title, index) => ({ title, message: messages[index] })));
    const saved = host.querySelector('[data-flight-notes-scope="latest"]');
    expect(saved).toBeTruthy();
    for (const message of messages) expect(saved.textContent).toContain(message);
  });

  it('gives an observed normal-flow transition priority without promoting it to sustained recovery', async () => {
    await mount(); await frame(cruise({ stalling: true, aoa: -20 }));
    expectNoFactStrips(); expect(cards()).toHaveLength(0);
    await frame(cruise());
    expectNoFactStrips(); expect(cards()).toHaveLength(1);
    expect(texts()).toContain('Normal airflow restored');
    expect(texts()).not.toContain('30,000 ft');
    const db = await finish();
    expect(db.flightNotes.filter(note => note.title === 'Normal airflow restored')).toEqual([
      { title: 'Normal airflow restored', message: 'The wing is no longer stalled at this moment. A single observation does not establish sustained recovery.' },
    ]);
  });

  it('expires the cosmetic title without duplicating or removing saved milestone facts', async () => {
    await mount(); await frame(cruise()); expect(cards()).toHaveLength(1);
    hooks().timeRef.current += 7;
    await frame(cruise()); expect(cards()).toHaveLength(0); expectNoFactStrips();
    const db = await finish(); expect(db.flightNotes.map(note => note.title)).toEqual(milestoneTitles);
  });
});

describe('milestone titles yield to higher-priority guidance in details mode', () => {
  it.each([
    ['stall', { stalling: true, aoa: 20 }, '⚠️ STALL — BRING AoA TOWARD ZERO'],
    ['low airspeed', { lowAirspeed: true }, 'LOW AIRSPEED — monitor lift and angle of attack'],
    ['ceiling', { hitCeiling: true }, '⚠️ PART 107 CEILING — 400 ft IS A LEGAL LIMIT, NOT A LIMIT OF THE DRONE'],
  ])('keeps first and held %s guidance unobscured while retaining discoveries', async (_name, patch, warning) => {
    await mount();
    for (let held = 0; held < 2; held++) {
      await frame(cruise(patch)); expect(texts()).toContain(warning);
      expectNoFactStrips(); expect(cards()).toHaveLength(0);
    }
    const db = await finish(); expect(db.flightNotes.map(note => note.title)).toEqual(milestoneTitles);
  });

  it('keeps a first and held rotation instruction ahead of the 100-knot milestone', async () => {
    await mount();
    for (let held = 0; held < 2; held++) {
      await frame(cruise({ onGround: true, altitude: 0, speed: 200 }), input({ throttle: 1 }));
      expect(texts()).toContain('ROTATE — pitch up (W)'); expectNoFactStrips(); expect(cards()).toHaveLength(0);
    }
    const db = await finish(); expect(db.flightNotes.map(note => note.title)).toEqual(['100 knots']);
  });

  it('keeps low-and-sinking corrective advice clear of a fresh liftoff milestone', async () => {
    await mount();
    for (let held = 0; held < 2; held++) {
      await frame(cruise({ altitude: 300, vsi: -10, speed: 140 }), input({ throttle: 0.1 }));
      expect(texts().join(' ')).toContain('Low and sinking: add power');
      expectNoFactStrips(); expect(cards()).toHaveLength(0);
    }
    const db = await finish(); expect(db.flightNotes.some(note => note.title === 'Liftoff')).toBe(true);
  });

  it('records the speed milestone while the real takeoff tutorial owns the lesson', async () => {
    await mount({ patch: { takeoffTutorialDismissed: false } });
    await frame(cruise({ onGround: true, altitude: 0, speed: 200 }), input({ throttle: 1 }));
    expect(host.querySelector('.skyschool-tutorial-card')).toBeTruthy();
    expect(host.querySelector('[data-flight-current-cue]').textContent).toBeTruthy();
    expectNoFactStrips(); expect(cards()).toHaveLength(0);
    const db = await finish(); expect(db.flightNotes.map(note => note.title)).toEqual(['100 knots']);
  });

  it.each([false, true])('keeps a naturally recorded approach transmission ahead of fresh milestones, chase=%s', async chase => {
    await mount({ chase });
    const airport = FS.WAYPOINTS.find(item => item.id === 'kpwm'), runway = FS.getFlightRunway(airport), end = runway.ends[0];
    const position = FS.getFlightRunwayPosition(runway, 0, end.thresholdAlongFt - end.sign * 0.65 * 6076.12, 264);
    const final = cruise({ ...position, fieldElev: airport.alt, heading: end.headingDeg, speed: 110, vsi: -4 });
    for (let held = 0; held < 2; held++) {
      await frame(final, input({ throttle: 0.6 }));
      expect(hooks().flightRef.current._atcLog.filter(item => item.tag === 'final')).toHaveLength(1);
      expect(texts().join(' ')).toContain('Approach; monitor descent and wind.');
      expectNoFactStrips(); expect(cards()).toHaveLength(0);
    }
    const db = await finish(); expect(db.flightNotes.some(note => note.title === 'Liftoff')).toBe(true);
  });
});

describe('shared event titles retain priority without replaying old milestones', () => {
  async function expectFreshNoticeAfterWindow(state, seconds) {
    hooks().timeRef.current += seconds;
    await frame(state);
    // The original six notes have expired. Ending another detail window must
    // not give them new display timestamps or turn them into a replay queue.
    expect(cards()).toHaveLength(0); expectNoFactStrips();
    await frame({ ...state, stalling: true, aoa: 20 });
    await frame({ ...state, stalling: false, aoa: 5 });
    expect(cards()).toHaveLength(1); expect(texts()).toContain('Normal airflow restored');
    const db = await finish();
    expect(db.flightNotes.map(note => note.title)).toEqual([...milestoneTitles, 'Normal airflow restored']);
    expect(db.flightNotes[1].message).toContain('flying faster does not make more lift');
    return db;
  }

  it('gives a naturally discovered place the single title while preserving its full fact in the flight record', async () => {
    await mount();
    const state = cruise({ lat: 43.646, lon: -70.309, fieldElev: 76 });
    await frame(state);
    expect(texts()).toContain('Discovered: Portland');
    expect(texts().join(' ')).not.toContain('birthplace of Henry Wadsworth Longfellow');
    expect(cards()).toHaveLength(1); expectNoFactStrips();
    expect(texts()).not.toContain('30,000 ft');
    await frame(state); expect(cards()).toHaveLength(1);
    const db = await expectFreshNoticeAfterWindow(state, 8.1);
    expect(db.discoveredPlaces.some(place => place.name === 'Portland' && place.fact.includes('Longfellow'))).toBe(true);
  });

  it('gives a production-earned achievement the single title without resetting milestone lifetime', async () => {
    // A valid saved airport history can be recognized on the next flight.
    // Drive the actual badge checker; no popup ref or achievement is seeded.
    const earnedBadges = Object.fromEntries(FS.ACHIEVEMENTS.filter(item => item.id !== 'airports_3').map(item => [item.id, true]));
    await mount({ patch: { earnedBadges, visitedAirports: ['kpwm', 'kjfk', 'kord'] } });
    await frame(cruise());
    expect(latest.earnedBadges.airports_3).toBe(true);
    expect(texts()).not.toContain('🏆 ACHIEVEMENT UNLOCKED');
    expect(texts()).toContain('✈️ Frequent Flyer');
    expect(cards()).toHaveLength(1); expectNoFactStrips();
    expect(texts()).not.toContain('30,000 ft');
    await frame(cruise()); expect(cards()).toHaveLength(1);
    await expectFreshNoticeAfterWindow(cruise(), 6.1);
    expect(latest.earnedBadges.airports_3).toBe(true);
  });

  it('keeps a weather briefing selected through the real controls ahead of fresh milestones', async () => {
    await mount(); await expand();
    const weather = [...host.querySelectorAll('button')].find(button => button.textContent.startsWith('🌤️ '));
    expect(weather).toBeTruthy(); await act(async () => weather.click());
    expect(latest.weatherLesson).toBeTruthy();
    const collapse = host.querySelector('button[aria-label="Collapse the flight deck controls"]');
    expect(collapse).toBeTruthy(); await act(async () => collapse.click());
    hooks().timeRef.current = 1;
    await frame(cruise());
    expect(texts()).toContain('🌤️ WEATHER BRIEFING');
    expect(cards()).toHaveLength(0); expectNoFactStrips();
    await frame(cruise()); expect(cards()).toHaveLength(0);
    await expectFreshNoticeAfterWindow(cruise(), 8.1);
  });

  it('pauses a live milestone while native Help is open and resumes its original lifetime', async () => {
    await mount(); await frame(cruise()); expect(cards()).toHaveLength(1);
    const help = host.querySelector('button[aria-label="Controls and help"]');
    expect(help).toBeTruthy(); await act(async () => help.click());
    expect(host.querySelector('[data-flightsim-help]')).toBeTruthy();
    const stoppedTime = hooks().timeRef.current;
    await frame(cruise()); expect(hooks().timeRef.current).toBe(stoppedTime);
    expect(cards()).toHaveLength(0); expectNoFactStrips();
    const close = host.querySelector('#skyschool-close-help');
    expect(close).toBeTruthy(); await act(async () => close.click());
    expect(host.querySelector('[data-flightsim-help]')).toBeNull();
    await frame(cruise()); expect(cards()).toHaveLength(1);
    hooks().timeRef.current += 7;
    await frame(cruise()); expect(cards()).toHaveLength(0);
    const db = await finish(); expect(db.flightNotes.map(note => note.title)).toEqual(milestoneTitles);
  });
});

describe('bounded notice painting at instrument and measured-control edges', () => {
  it.each([390, 566, 598, 600, 698, 818].flatMap(width => [false, true].map(chase => [width, chase])))(
    'yields an unsafe brief title on a short canvas without losing notes, width=%s chase=%s', async (width, chase) => {
      await mount({ width, height: 308, chase }); await frame(cruise());
      expectNoFactStrips(); expect(cards().length).toBeLessThanOrEqual(1);
      for (const card of cards()) expectCardClear(card, width, 308, chase);
      const db = await finish(); expect(db.flightNotes.map(note => note.title)).toEqual(milestoneTitles);
    });

  it('yields to the visible painted command rail, then returns only while the original notice is still current', async () => {
    await mount({ width: 390, height: 620, chase: true });
    const dock = host.querySelector('[data-flightsim-hud-dock]'), nav = host.querySelector('[data-flightsim-command-rail]');
    const obstruction = rect(10, 66, 300, 130);
    dock.getBoundingClientRect = () => obstruction; nav.getBoundingClientRect = () => obstruction;
    Object.defineProperty(dock, 'clientWidth', { configurable: true, value: obstruction.w });
    Object.defineProperty(dock, 'clientHeight', { configurable: true, value: obstruction.h });
    await frame(cruise()); expectNoFactStrips(); expect(cards()).toHaveLength(0);
    const smallDock = rect(10, 66, 120, 64);
    dock.getBoundingClientRect = () => smallDock; nav.getBoundingClientRect = () => smallDock;
    Object.defineProperty(dock, 'clientWidth', { configurable: true, value: smallDock.w });
    Object.defineProperty(dock, 'clientHeight', { configurable: true, value: smallDock.h });
    await frame(cruise()); expect(cards()).toHaveLength(1); expectCardClear(cards()[0], 390, 620, true, smallDock);
    hooks().timeRef.current += 7; await frame(cruise()); expect(cards()).toHaveLength(0);
    const db = await finish(); expect(db.flightNotes.map(note => note.title)).toEqual(milestoneTitles);
  });
});

describe('translated milestone titles remain complete or defer to Flight notes', () => {
  it.each([
    'Dreißigtausend Fuß erreicht — Beobachte die kühlere Luft und vergleiche die Bedingungen für den Reiseflug',
    '高高度での飛行を観察し空気の密度と気温および航空機の変化を比較しましょう'.repeat(3),
  ])('wraps a complete long title within its readable card', async title => {
    translations['stem.flightsim.notice_alt30000'] = title;
    await mount({ chase: true }); await frame(cruise()); expectNoFactStrips(); expect(cards()).toHaveLength(1);
    const card = cards()[0]; expectCardClear(card, 1280, 1000, true);
    const rows = commands.filter(item => item.method === 'fillText' && item.x >= card.x && item.x <= card.x + card.w
      && item.y >= card.y && item.y <= card.y + card.h && item.font === 'bold 12px system-ui');
    expect(rows.length).toBeGreaterThan(1);
    expect(rows.map(item => item.text).join('').replace(/\s/g, '')).toBe(title.replace(/\s/g, ''));
    for (const row of rows) {
      expect(Array.from(row.text).length * 6).toBeLessThanOrEqual(card.w - 24);
      expect(row.baseline).toBe('alphabetic');
    }
    const db = await finish(); expect(db.flightNotes.at(-1).title).toBe(title);
  });

  it('defers a long translated title when its measured rows would reach primary instruments', async () => {
    const title = 'Beobachtung der Reiseflughöhe mit vollständiger wissenschaftlicher Erläuterung '.repeat(2).trim();
    translations['stem.flightsim.notice_alt30000'] = title;
    await mount({ width: 390, height: 500 }); await frame(cruise());
    expectNoFactStrips(); expect(cards()).toHaveLength(0);
    const db = await finish(); expect(db.flightNotes.at(-1).title).toBe(title);
    expect(db.flightNotes.at(-1).message).toContain('30,000 ft — jet cruise territory!');
  });
});
