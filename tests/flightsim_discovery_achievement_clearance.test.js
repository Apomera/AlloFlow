import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const hooks = () => window.__testHooks.flightSim;
let FS, tool, host, root, nextFrame, wallTime, commands, path, errors, physicsSnapshot, latest, translations, badgeWrites, toasts, awards, setHost;
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
  badgeWrites = []; toasts = []; awards = []; commands = []; path = []; nextFrame = null; wallTime = 1000; translations = {};
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const gfx = new Proxy({
    beginPath() { path = []; },
    roundRect(...args) { path.push({ method: 'roundRect', args }); },
    arc(...args) { path.push({ method: 'arc', args }); },
    moveTo(...args) { if (this.strokeStyle === 'rgba(230,240,255,0.55)') path.push({ method: 'moveTo', args }); },
    lineTo(...args) { if (this.strokeStyle === 'rgba(230,240,255,0.55)') path.push({ method: 'lineTo', args }); },
    stroke() {
      if (this.strokeStyle === 'rgba(230,240,255,0.55)') commands.push({ method: 'projectedLadderStroke',
        lineWidth: this.lineWidth, path: path.map(item => ({ ...item, args: [...item.args] })) });
    },
    fill() { commands.push({ method: 'fill', fill: this.fillStyle,
      path: path.map(item => ({ ...item, args: [...item.args] })) }); },
    fillRect(x, y, w, h) { commands.push({ method: 'fillRect', x, y, w, h, fill: this.fillStyle }); },
    fillText(text, x, y) { commands.push({ method: 'fillText', text: String(text), x, y,
      font: this.font, fill: this.fillStyle, baseline: this.textBaseline, align: this.textAlign }); },
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

async function mount({ width = 1280, height = 1000, chase = false, details = true, badge = false, patch = {} } = {}) {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', thirdPerson: chase,
      railCollapsed: true, flightDetails: details, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.filter(item => !badge || item.id !== 'airports_3').map(item => [item.id, true])), ...(badge ? { visitedAirports: ['kpwm', 'kjfk', 'kord'] } : {}), ...patch } });
    latest = data.flightSim; setHost = setData;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      addToast: (...args) => toasts.push(args), awardXP: (...args) => awards.push(args),
      t: (key, fallback) => translations[key] ?? fallback ?? key,
      update: (id, key, value) => { if (key === 'earnedBadges') badgeWrites.push(value); setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })); },
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

const portland = patch => cruise({ lat: 43.646, lon: -70.309, fieldElev: 76, ...patch });
const discoveryTitle = 'Discovered: Portland';
const achievementTitle = '✈️ Frequent Flyer';
function expectNoLegacyPopups() {
  expect(texts()).not.toContain('🏆 ACHIEVEMENT UNLOCKED');
  expect(texts().some(text => text.includes('DISCOVERED:'))).toBe(false);
  expect(texts().some(text => text.includes('birthplace of Henry Wadsworth Longfellow'))).toBe(false);
  const detailed = commands.filter(item => item.method === 'fill'
    && ['rgba(15,23,42,0.92)', 'rgba(0,0,0,0.85)'].includes(item.fill))
    .flatMap(item => item.path.filter(part => part.method === 'roundRect').map(part => part.args))
    .filter(args => (args[2] === 280 && args[3] === 50) || args[2] === 520);
  expect(detailed).toEqual([]);
}
function expectSingleSafeNotice(width = 1280, height = 1000, chase = false) {
  expectNoLegacyPopups(); expect(cards().length).toBeLessThanOrEqual(1);
  for (const card of cards()) {
    expectCardClear(card, width, height, chase);
    expectClearOfProjectedLadder(card);
  }
}
const projectedLadderTexts = () => commands.filter(item => item.method === 'fillText'
  && item.font === 'bold 9px monospace' && item.fill === 'rgba(230,240,255,0.75)');
function expectClearOfProjectedLadder(card) {
  for (const label of projectedLadderTexts()) {
    const width = Array.from(label.text).length * 6;
    expect(overlaps(card, rect(label.x - width / 2, label.y - 4.5, width, 9), 4),
      'optional notice must clear actually painted pitch numeral ' + label.text).toBe(false);
  }
  const safe = { left: card.x - 4, right: card.x + card.w + 4, top: card.y - 4, bottom: card.y + card.h + 4 };
  // Clip actual painted rung segments against the notice rectangle. Bounds
  // come from the Canvas calls, never the component's private reservation list.
  function crosses(from, to, halfStroke) {
    const dx = to[0] - from[0], dy = to[1] - from[1];
    let start = 0, end = 1;
    for (const [p, q] of [[-dx, from[0] - safe.left + halfStroke], [dx, safe.right - from[0] + halfStroke],
      [-dy, from[1] - safe.top + halfStroke], [dy, safe.bottom - from[1] + halfStroke]]) {
      if (p === 0) { if (q < 0) return false; continue; }
      const ratio = q / p;
      if (p < 0) start = Math.max(start, ratio); else end = Math.min(end, ratio);
      if (start > end) return false;
    }
    return true;
  }
  for (const stroke of commands.filter(item => item.method === 'projectedLadderStroke')) {
    let point = null;
    for (const part of stroke.path) {
      if (part.method === 'moveTo') point = part.args;
      else if (part.method === 'lineTo' && point) {
        expect(crosses(point, part.args, stroke.lineWidth / 2), 'optional notice must clear an actually painted pitch rung').toBe(false);
        point = part.args;
      }
    }
  }
}
function expectNoOptionalNotice() { expectNoLegacyPopups(); expect(cards()).toHaveLength(0); }
async function patchHost(patch) {
  await act(async () => setHost(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } })));
}
async function expectDurableDiscovery() {
  await expand();
  const notes = host.querySelector('[data-flight-notes-scope="live"]');
  expect(notes.textContent).toContain('Portland · United States');
  const fact = [...notes.querySelectorAll('p')].find(item => item.textContent.includes('birthplace of Henry Wadsworth Longfellow')).textContent;
  const db = await finish();
  expect(db.discoveredPlaces.filter(item => item.name === 'Portland')).toEqual([
    expect.objectContaining({ name: 'Portland', country: 'United States', fact }),
  ]);
  expect(host.querySelector('[data-flight-notes-scope="latest"]').textContent).toContain(fact);
  return db;
}

describe('discovery and achievement share one bounded optional notice', () => {
  it.each([false, true].flatMap(details => [false, true].map(chase => [details, chase])))(
    'coalesces natural discovery, earned badge and six milestones while retaining all work, details=%s chase=%s', async (details, chase) => {
      await mount({ details, chase, badge: true }); await frame(portland());
      expectSingleSafeNotice(1280, 1000, chase); expect(cards()).toHaveLength(1);
      expect(texts()).toContain(achievementTitle);
      expect(texts()).not.toContain(discoveryTitle);
      expect(latest.earnedBadges.airports_3).toBe(true);
      const db = await expectDurableDiscovery();
      expect(db.flightNotes.map(note => note.title)).toEqual(milestoneTitles);
    });

  it.each([390, 566, 598, 600, 698, 818].flatMap(width => [false, true].flatMap(chase => ['discovery', 'achievement'].map(kind => [width, chase, kind]))))(
    'paints safely or yields on the real short canvas, width=%s chase=%s kind=%s', async (width, chase, kind) => {
      await mount({ width, height: 308, chase, badge: kind === 'achievement' });
      await frame(kind === 'discovery' ? portland() : cruise());
      expectSingleSafeNotice(width, 308, chase);
      const db = await finish();
      if (kind === 'discovery') expect(db.discoveredPlaces.some(place => place.name === 'Portland')).toBe(true);
      else expect(latest.earnedBadges.airports_3).toBe(true);
    });

  it('awards a production-earned badge once while its popup yields and expires', async () => {
    await mount({ badge: true });
    for (let held = 0; held < 3; held++) {
      await frame(portland({ stalling: true, aoa: 20 })); expectNoOptionalNotice();
    }
    expect(badgeWrites).toHaveLength(1);
    expect(badgeWrites[0].airports_3).toBe(true);
    expect(toasts.filter(([message]) => message.includes('Badge earned: Frequent Flyer'))).toHaveLength(1);
    expect(awards.filter(([id, xp, reason]) => id === 'flightSim' && xp === 10 && reason === 'SkySchool badge: Frequent Flyer')).toHaveLength(1);
    hooks().timeRef.current += 9;
    await frame(portland());
    // A fresh normal-flow observation may appear, but expired badges never replay.
    expect(texts()).not.toContain(achievementTitle); expectNoLegacyPopups();
    await frame(portland()); expect(badgeWrites).toHaveLength(1);
    const db = await expectDurableDiscovery(); expect(db.badges).toBe(FS.ACHIEVEMENTS.length);
  });
});

describe('optional discovery and achievement yield to flight guidance', () => {
  it.each([false, true].flatMap(chase => [
    ['stall', { stalling: true, aoa: 20 }, '⚠️ STALL — BRING AoA TOWARD ZERO'],
    ['low airspeed', { lowAirspeed: true }, 'LOW AIRSPEED — monitor lift and angle of attack'],
    ['ceiling', { hitCeiling: true }, '⚠️ PART 107 CEILING — 400 ft IS A LEGAL LIMIT, NOT A LIMIT OF THE DRONE'],
  ].map(item => [chase, ...item])))(
    'preserves first and held %s %s guidance', async (chase, _kind, patch, warning) => {
      await mount({ chase, badge: true });
      for (let held = 0; held < 2; held++) {
        await frame(portland(patch)); expect(texts()).toContain(warning); expectNoOptionalNotice();
      }
      expect(latest.earnedBadges.airports_3).toBe(true); await expectDurableDiscovery();
    });

  it('keeps low-and-sinking corrective advice clear when a place and badge are discovered', async () => {
    await mount({ badge: true });
    for (let held = 0; held < 2; held++) {
      await frame(portland({ altitude: 300, vsi: -10, speed: 140 }), input({ throttle: 0.1 }));
      expect(texts().join(' ')).toContain('Low and sinking: add power'); expectNoOptionalNotice();
    }
    await expectDurableDiscovery();
  });

  it('keeps first and held rotation coaching clear of concurrent optional events', async () => {
    await mount({ badge: true });
    for (let held = 0; held < 2; held++) {
      await frame(portland({ onGround: true, altitude: 76, speed: 200 }), input({ throttle: 1 }));
      expect(texts()).toContain('ROTATE — pitch up (W)'); expectNoOptionalNotice();
    }
    await expectDurableDiscovery();
  });

  it('lets the actual takeoff tutorial own the lesson without losing a discovery or award', async () => {
    await mount({ badge: true, patch: { takeoffTutorialDismissed: false } });
    await frame(portland({ onGround: true, altitude: 76, speed: 200 }), input({ throttle: 1 }));
    expect(host.querySelector('.skyschool-tutorial-card')).toBeTruthy();
    expectNoOptionalNotice(); expect(latest.earnedBadges.airports_3).toBe(true);
    await expectDurableDiscovery();
  });

  it.each([false, true])('keeps naturally recorded approach radio clear, chase=%s', async chase => {
    await mount({ chase, badge: true });
    const airport = FS.WAYPOINTS.find(item => item.id === 'kpwm'), runway = FS.getFlightRunway(airport), end = runway.ends[0];
    const position = FS.getFlightRunwayPosition(runway, 0, end.thresholdAlongFt - end.sign * 0.65 * 6076.12, 264);
    const final = cruise({ ...position, fieldElev: airport.alt, heading: end.headingDeg, speed: 110, vsi: -4 });
    for (let held = 0; held < 2; held++) {
      await frame(final, input({ throttle: 0.6 }));
      expect(hooks().flightRef.current._atcLog.filter(item => item.tag === 'final')).toHaveLength(1);
      expect(texts().join(' ')).toContain('Approach; monitor descent and wind.'); expectNoOptionalNotice();
    }
    await expectDurableDiscovery();
  });

  it.each([false, true])('keeps actual ground-contact feedback ahead of new place and badge events, chase=%s', async chase => {
    await mount({ chase }); await frame(cruise({ altitude: 1000, vsi: -4, speed: 100 }));
    const withoutAirportBadge = Object.fromEntries(FS.ACHIEVEMENTS.filter(item => item.id !== 'airports_3').map(item => [item.id, true]));
    await patchHost({ earnedBadges: withoutAirportBadge, visitedAirports: ['kpwm', 'kjfk', 'kord'] });
    const contact = portland({ onGround: true, altitude: 76, speed: 80, vsi: 0, groundContact: { vsi: -2, speed: 100 } });
    for (let held = 0; held < 2; held++) {
      await frame(contact); expect(hooks().getLandingRef().current.scored).toBe(true);
      expect(texts().join(' ')).toContain('fpm'); expectNoOptionalNotice();
    }
    const db = await expectDurableDiscovery(); expect(db.landings).toBe(1);
    expect(latest.earnedBadges.airports_3).toBe(true);
  });

  it.each([
    ['rescue', { active: true, survivorLat: 43.7, survivorLon: -70.1, recovered: false, hoistTime: 0 }],
    ['survey', { active: true, battery: 100, launchLat: 43.646, launchLon: -70.309, photos: [{ lat: 43.7, lon: -70.1, captured: false, name: 'Survey target' }], capturedCount: 0 }],
  ])('keeps the active %s mission ahead of concurrent optional notices', async (kind, mission) => {
    await mount({ badge: true }); await patchHost({ [kind]: mission });
    for (let held = 0; held < 2; held++) { await frame(portland()); expectNoOptionalNotice(); }
    expect(latest.earnedBadges.airports_3).toBe(true); await expectDurableDiscovery();
  });

  it('hides a live discovery and earned badge behind native Help while preserving their original clocks', async () => {
    await mount({ badge: true }); await frame(portland()); expect(cards()).toHaveLength(1);
    const help = host.querySelector('button[aria-label="Controls and help"]');
    await act(async () => help.click()); expect(host.querySelector('[data-flightsim-help]')).toBeTruthy();
    const stoppedTime = hooks().timeRef.current;
    await frame(portland()); expect(hooks().timeRef.current).toBe(stoppedTime); expectNoOptionalNotice();
    await act(async () => host.querySelector('#skyschool-close-help').click());
    await frame(portland()); expectSingleSafeNotice(); expect(cards()).toHaveLength(1);
    hooks().timeRef.current += 9; await frame(portland()); expectNoOptionalNotice();
    expect(badgeWrites).toHaveLength(1); await expectDurableDiscovery();
  });

  it('does not carry an unexpired earned badge into the next real native flight', async () => {
    await mount({ badge: true }); await frame(cruise());
    expect(texts()).toContain(achievementTitle); expect(badgeWrites).toHaveLength(1);
    await finish();
    const menu = [...host.querySelectorAll('button')].find(button => button.textContent.includes('Back to Menu'));
    expect(menu).toBeTruthy(); await act(async () => menu.click());
    const departure = host.querySelector('button[aria-label="Free Flight from Portland, ME"]');
    expect(departure).toBeTruthy(); await act(async () => departure.click());
    sizeCanvases(1280, 1000);
    // Deliberately overlap simulation clocks. The badge belonged to the
    // previous flight and must not reappear when this flight reaches t=12.
    hooks().timeRef.current = 12;
    await frame(cruise()); expectSingleSafeNotice();
    expect(texts()).not.toContain(achievementTitle); expect(badgeWrites).toHaveLength(1);
    expect(latest.earnedBadges.airports_3).toBe(true); await finish();
  });
});

describe('readable translated notices and original expiry', () => {
  it.each([
    ['badge', 'Drei unterschiedliche Flughäfen besucht und neue Perspektiven auf den regionalen Luftverkehr gewonnen'],
    ['badge', '三つの異なる空港を訪問して地域の航空交通を観察し安全な離着陸を振り返りましょう'.repeat(2)],
    ['discovery', 'Entdeckt: Portland — Beobachte die Küste und entdecke die Geschichte dieser Hafenstadt'],
    ['discovery', '新しい港町を発見しました海岸線と地域の歴史を観察し学びを振り返りましょう'.repeat(2)],
  ])('wraps the complete %s title at full readable size and retains full facts', async (kind, title) => {
    if (kind === 'badge') translations['stem.flightsim.airports_3_name'] = title;
    else translations['stem.flightsim.notice_discovery'] = title;
    await mount({ height: 720, badge: kind === 'badge', chase: true }); await frame(kind === 'discovery' ? portland() : cruise());
    expectSingleSafeNotice(1280, 720, true); expect(cards()).toHaveLength(1);
    const card = cards()[0];
    const rows = commands.filter(item => item.method === 'fillText' && item.x >= card.x && item.x <= card.x + card.w
      && item.y >= card.y && item.y <= card.y + card.h && item.font === 'bold 12px system-ui');
    const expected = kind === 'badge' ? '✈️ ' + title : title;
    expect(rows.map(item => item.text).join('').replace(/\s/g, '')).toBe(expected.replace(/\s/g, ''));
    expect(rows.length).toBeGreaterThan(1);
    for (const row of rows) {
      expect(Array.from(row.text).length * 6).toBeLessThanOrEqual(card.w - 24);
      expect(row.baseline).toBe('alphabetic');
    }
    if (kind === 'discovery') await expectDurableDiscovery();
    else {
      expect(toasts.some(([message]) => message.includes(title))).toBe(true);
      await finish(); expect(latest.earnedBadges.airports_3).toBe(true);
    }
  });

  it.each(['badge', 'discovery'])('defers a long %s title when projected cockpit pitch numerals own its lane', async kind => {
    const title = 'Eine vollständige neue Beobachtung zum regionalen Luftverkehr mit zusätzlichen Informationen für unsere sichere weitere Flugreise';
    translations[kind === 'badge' ? 'stem.flightsim.airports_3_name' : 'stem.flightsim.notice_discovery'] = title;
    await mount({ height: 720, badge: kind === 'badge' }); await frame(kind === 'discovery' ? portland() : cruise());
    const twentieth = projectedLadderTexts().filter(item => item.text === '20');
    expect(twentieth.length).toBeGreaterThan(0);
    expect(twentieth.some(item => overlaps(rect(460, 142, 360, 64), rect(item.x - 6, item.y - 6, 12, 12), 4)),
      'the real projected 20-degree numeral must reach the would-be long-card clearance lane').toBe(true);
    expectNoOptionalNotice();
    if (kind === 'discovery') await expectDurableDiscovery();
    else { await finish(); expect(latest.earnedBadges.airports_3).toBe(true); }
  });

  it.each([-25, 0, 25])('keeps translated notice paint clear of actual banked cockpit rung strokes, bank=%s', async bank => {
    translations['stem.flightsim.airports_3_name'] = 'Entdeckung einer neuen regionalen Flugverbindung und ihrer sicheren Anflugmöglichkeiten';
    await mount({ badge: true }); await frame(cruise(), input({ bank }));
    expect(projectedLadderTexts().length).toBeGreaterThan(0);
    expect(commands.some(item => item.method === 'projectedLadderStroke')).toBe(true);
    expectSingleSafeNotice();
    await finish(); expect(latest.earnedBadges.airports_3).toBe(true);
  });

  it.each(['discovery', 'badge'])('defers an over-tall translated %s title without clipping or losing its record', async kind => {
    const title = 'Lange vollständige Erklärung zu dieser besonderen neuen Beobachtung '.repeat(8).trim();
    translations[kind === 'badge' ? 'stem.flightsim.airports_3_name' : 'stem.flightsim.notice_discovery'] = title;
    await mount({ width: 390, height: 500, badge: kind === 'badge' });
    await frame(kind === 'discovery' ? portland() : cruise()); expectNoOptionalNotice();
    if (kind === 'discovery') await expectDurableDiscovery();
    else { await finish(); expect(latest.earnedBadges.airports_3).toBe(true); }
  });

  it.each([['discovery', 8], ['badge', 5]])('keeps the original %s lifetime after a blocked frame and never replays it', async (kind, seconds) => {
    await mount({ badge: kind === 'badge' });
    const pose = kind === 'discovery' ? portland() : cruise();
    await frame(pose); const beganAt = hooks().timeRef.current;
    expectSingleSafeNotice(); expect(cards()).toHaveLength(1);
    await patchHost({ showHelp: true }); await frame(pose); expectNoOptionalNotice();
    hooks().timeRef.current = beganAt + seconds + 0.01;
    await patchHost({ showHelp: false }); await frame(pose); expectNoOptionalNotice();
    sizeCanvases(1365, 900); await frame(pose); expectNoOptionalNotice();
    if (kind === 'discovery') await expectDurableDiscovery();
    else { await finish(); expect(latest.earnedBadges.airports_3).toBe(true); expect(badgeWrites).toHaveLength(1); }
  });

  it('yields to the measured painted command rail and resumes only while the original events are current', async () => {
    await mount({ width: 390, height: 620, badge: true, chase: true });
    const dock = host.querySelector('[data-flightsim-hud-dock]'), nav = host.querySelector('[data-flightsim-command-rail]');
    const obstruction = rect(10, 66, 300, 130);
    dock.getBoundingClientRect = () => obstruction; nav.getBoundingClientRect = () => obstruction;
    Object.defineProperty(dock, 'clientWidth', { configurable: true, value: obstruction.w });
    Object.defineProperty(dock, 'clientHeight', { configurable: true, value: obstruction.h });
    await frame(portland()); expectNoOptionalNotice();
    const smallDock = rect(10, 66, 120, 64);
    dock.getBoundingClientRect = () => smallDock; nav.getBoundingClientRect = () => smallDock;
    Object.defineProperty(dock, 'clientWidth', { configurable: true, value: smallDock.w });
    Object.defineProperty(dock, 'clientHeight', { configurable: true, value: smallDock.h });
    await frame(portland()); expect(cards()).toHaveLength(1); expectNoLegacyPopups();
    expectCardClear(cards()[0], 390, 620, true, smallDock);
    hooks().timeRef.current += 9; await frame(portland()); expectNoOptionalNotice();
    expect(badgeWrites).toHaveLength(1); await expectDurableDiscovery();
  });
});


