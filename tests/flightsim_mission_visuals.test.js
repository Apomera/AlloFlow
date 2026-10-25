import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const api = () => window.__RR_TEST_EXPORTS__.flightSim;
const hooks = () => window.__testHooks.flightSim;
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
let host, root, setData, latest, commands, context, frameCallback, wallTime, errors, path;

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  window.__testHooks = {};
  delete window.THREE;
  loadTool(process.env.SKYSCHOOL_MISSION_VISUALS_SOURCE || 'stem_lab/stem_tool_flightsim.js', 'flightSim');
  commands = [];
  frameCallback = null;
  wallTime = 1000;
  path = null;
  context = new Proxy({
    measureText(text) { return { width: String(text).length * (parseFloat(this.font?.match(/(\d+(?:\.\d+)?)px/)?.[1]) || 10) * 0.6 }; },
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    beginPath() { path = null; },
    roundRect(...args) { path = { x: args[0], y: args[1], w: args[2], h: args[3] }; },
  }, {
    get(target, property) {
      return property in target ? target[property] : (...args) => commands.push({ method: property, args,
        box: path && { ...path }, fill: context.fillStyle, stroke: context.strokeStyle,
        font: context.font, align: context.textAlign });
    },
    set(target, property, value) { target[property] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  host?.remove(); host = null;
  delete window.__RR_TEST_EXPORTS__; delete window.__testHooks;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

function expectProjection(actual, expected) {
  expect(actual).not.toBeNull();
  for (const axis of ['x', 'y', 'depth']) expect(actual[axis]).toBeCloseTo(expected[axis], 7);
}

describe('Mission sites share the scenery camera projection', () => {
  it.each([
    { heading: 0, pitch: 12, bank: 35 },
    { heading: 90, pitch: -8, bank: -30 },
    { heading: 180, pitch: 5, bank: -45 },
    { heading: 270, pitch: -15, bank: 20 },
  ])('projects actual world height at heading $heading / pitch $pitch / bank $bank', pose => {
    const radians = pose.heading * Math.PI / 180;
    const state = { lat: 40, lon: -70, altitude: 1000 };
    const distance = 7296;
    const target = { lat: state.lat + Math.cos(radians) * distance / 364800,
      lon: state.lon + Math.sin(radians) * distance / (364800 * Math.cos(state.lat * Math.PI / 180)), altitude: 700 };
    const view = api().getFlightViewBasis(pose.heading, pose.pitch, pose.bank);
    const expected = api().projectFlightDirection({ x: Math.sin(radians) * distance, y: -300,
      z: -Math.cos(radians) * distance }, view, 1280, 720);
    expectProjection(api().projectFlightTarget(state, target, view, 1280, 720), expected);
  });

  it('places a ground site below the horizon while a site at aircraft height stays level', () => {
    const state = { lat: 0, lon: 0, altitude: 1000 };
    const view = api().getFlightViewBasis(0, 0, 0);
    const ground = api().projectFlightTarget(state, { lat: 0.01, lon: 0, altitude: 0 }, view, 1280, 720);
    const level = api().projectFlightTarget(state, { lat: 0.01, lon: 0, altitude: 1000 }, view, 1280, 720);
    expect(level.y).toBeCloseTo(360, 9);
    expect(ground.y).toBeGreaterThan(level.y);
    expect(ground.x).toBeCloseTo(640, 9);
  });

  it('accounts for the chase camera position when a nearby site has visible parallax', () => {
    const state = { lat: 0, lon: 0, altitude: 100 };
    const target = { lat: 100 / 364800, lon: 0, altitude: 100 };
    const view = { ...api().getFlightViewBasis(0, 0, 0), offset: { x: -60, y: 30, z: 120 } };
    const expected = api().projectFlightDirection({ x: 60, y: -30, z: -220 }, view, 320, 763);
    const actual = api().projectFlightTarget(state, target, view, 320, 763);
    expectProjection(actual, expected);
    expect(actual.x).toBeGreaterThan(160);
    expect(actual.y).toBeGreaterThan(381.5);
    const cockpit = api().projectFlightTarget(state, target, api().getFlightViewBasis(0, 0, 0), 320, 763);
    expect(cockpit.x).toBeCloseTo(160, 9);
    expect(cockpit.y).toBeCloseTo(381.5, 9);
  });

  it('uses the scenery origin latitude for east-west scale when the camera supplies it', () => {
    const state = { lat: 0, lon: 0, altitude: 100 };
    const target = { lat: 0.01, lon: 0.01, altitude: 100 };
    const view = { ...api().getFlightViewBasis(0, 0, 0), originLat: 60 };
    expectProjection(api().projectFlightTarget(state, target, view, 1280, 720),
      api().projectFlightDirection({ x: 1824, y: 0, z: -3648 }, view, 1280, 720));
    const aircraftScale = api().projectFlightTarget(state, target, api().getFlightViewBasis(0, 0, 0), 1280, 720);
    expect(api().projectFlightTarget(state, target, view, 1280, 720).x).toBeLessThan(aircraftScale.x);
  });

  it.each([
    [179.999, -179.999, 90],
    [-179.999, 179.999, 270],
  ])('takes the short dateline crossing from longitude %s to %s', (from, to, heading) => {
    const state = { lat: 0, lon: from, altitude: 100 };
    const target = { lat: 0, lon: to, altitude: 100 };
    const projected = api().projectFlightTarget(state, target, api().getFlightViewBasis(heading, 0, 0), 1280, 720);
    expect(projected).not.toBeNull();
    expect(projected.x).toBeCloseTo(640, 7);
    expect(projected.y).toBeCloseTo(360, 7);
    expect(projected.depth).toBeCloseTo(729.6, 5);
  });

  it.each([
    ['aircraft latitude', { lat: NaN }, {}],
    ['aircraft longitude', { lon: Infinity }, {}],
    ['aircraft altitude', { altitude: undefined }, {}],
    ['target latitude', {}, { lat: undefined }],
    ['target longitude', {}, { lon: NaN }],
    ['target altitude', {}, { altitude: Infinity }],
  ])('omits a target with invalid %s', (_label, statePatch, targetPatch) => {
    const state = { lat: 0, lon: 0, altitude: 100, ...statePatch };
    const target = { lat: 0.01, lon: 0, altitude: 0, ...targetPatch };
    expect(api().projectFlightTarget(state, target, api().getFlightViewBasis(0, 0, 0), 1280, 720)).toBeNull();
  });

  it('omits targets behind the camera and degenerate sites at the camera position', () => {
    const state = { lat: 0, lon: 0, altitude: 100 };
    const view = api().getFlightViewBasis(0, 0, 0);
    expect(api().projectFlightTarget(state, { lat: -0.01, lon: 0, altitude: 0 }, view, 1280, 720)).toBeNull();
    expect(api().projectFlightTarget(state, { ...state }, view, 1280, 720)).toBeNull();
  });
});

describe('Compact mission strips leave flight references clear', () => {
  it.each([
    [1280, 720, false], [1280, 720, true],
    [320, 763, false], [320, 763, true],
    [320, 620, false], [320, 620, true],
  ])('clears the nose and primary instruments at %sx%s with chase %s', (width, height, chase) => {
    const strip = api().getFlightMissionStripLayout(width, height);
    expect(strip).not.toBeNull();
    expect(strip.x).toBeGreaterThanOrEqual(12);
    expect(strip.x + strip.w).toBeLessThanOrEqual(width - 12);
    expect(strip.x + strip.w / 2).toBe(width / 2);
    const instruments = api().getFlightInstrumentLayout(width, height, chase);
    const references = [instruments.speed, instruments.altitude,
      { x: width - 42, y: 162, w: 42, h: 48 }, // rotor power gauge and its readout
      { x: width / 2 - 18, y: height / 2 - 18, w: 36, h: 36 },
      { x: instruments.horizon.x - instruments.horizon.r, y: instruments.horizon.y - instruments.horizon.r,
        w: instruments.horizon.r * 2, h: instruments.horizon.r * 2 },
      { x: instruments.vsi.x - instruments.vsi.r, y: instruments.vsi.y - instruments.vsi.r,
        w: instruments.vsi.r * 2, h: instruments.vsi.r * 2 }];
    for (const reference of references) expect(overlaps(strip, reference)).toBe(false);
    expect(strip.y + strip.h + 12).toBeLessThanOrEqual(height / 2 - 18);
  });

  it('omits the strip in short landscapes instead of covering the nose', () => {
    expect(api().getFlightMissionStripLayout(844, 390)).toBeNull();
  });

  it('omits a strip covered by the expanded phone deck but keeps a clear folded deck', () => {
    expect(api().getFlightMissionStripLayout(320, 763, { x: 8, y: 62, w: 215, h: 64 })).not.toBeNull();
    expect(api().getFlightMissionStripLayout(320, 763, { x: 8, y: 62, w: 304, h: 330 })).toBeNull();
  });
});

const pose = { lat: 0, lon: 0, altitude: 50, fieldElev: 0, speed: 0, vsi: 0,
  heading: 0, onGround: false, stalling: false, lowAirspeed: false, hitCeiling: false };
const photos = [
  { name: 'Near site', lat: 0.01, lon: 0, captured: false },
  { name: 'Far site', lat: 0.02, lon: 0.002, captured: false },
  { name: 'Recorded site', lat: 0.005, lon: 0, captured: true },
];
const rescue = () => ({ active: true, survivorLat: 0.01, survivorLon: 0, startedAt: 1,
  hoistTime: 0, recovered: false, completed: false });
const survey = () => ({ active: true, launchLat: 0, launchLon: 0, mode: 'aerial',
  photos: photos.map(photo => ({ ...photo })), capturedCount: 1, captureProgress: 0, battery: 100 });
const texts = () => commands.filter(command => command.method === 'fillText').map(command => String(command.args[0]));
const strips = () => commands.filter(command => command.method === 'fill' && command.fill === 'rgba(2,6,23,0.9)' && command.box?.h === 64);
const button = label => [...host.querySelectorAll('button')].find(node => node.textContent === label);

async function mountMission(kind) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, updateData] = React.useState({ flightSim: { view: 'menu', aircraft: kind === 'rescue' ? 'rescue_heli' : 'drone',
      railCollapsed: true, thirdPerson: false, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      menuSections: { challenges: true },
      earnedBadges: Object.fromEntries(api().ACHIEVEMENTS.map(achievement => [achievement.id, true])),
    } });
    setData = updateData;
    latest = data.flightSim;
    return window.StemLab._registry.flightSim.render(makeCtx({ toolData: data, setToolData: updateData,
      update: (id, key, value) => updateData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => updateData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
  const missionId = kind === 'rescue' ? 'coastal_rescue' : 'drone_survey';
  await act(async () => host.querySelector('[data-flight-challenge-id="' + missionId + '"]').click());
  if (kind === 'survey') await act(async () => button('✓ I Understand — Begin Flight').click());
  await patchData({ [kind]: kind === 'rescue' ? rescue() : survey() });
  vi.spyOn(api().Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { normal: api().Physics.WEIGHT, lift: api().Physics.WEIGHT, weight: api().Physics.WEIGHT, thrust: 0, drag: 0 } }));
  Object.assign(hooks().getWeatherRef().current, { wind: 0, turbulence: 0 });
}

async function patchData(patch) {
  await act(async () => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } })));
}

async function paint(state = pose, width = 320, height = 763, expandedDock = false) {
  Object.assign(hooks().flightRef.current, state);
  Object.assign(hooks().controlsRef.current, { pitch: 0, bank: 0, yawRate: 0, throttle: 0.5 });
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: width });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: height });
  }
  const dock = host.querySelector('[data-flightsim-hud-dock]');
  for (const [property, value] of Object.entries({ offsetLeft: 8, offsetTop: 62,
    offsetWidth: expandedDock ? width - 16 : 215, offsetHeight: expandedDock ? 330 : 64 })) {
    Object.defineProperty(dock, property, { configurable: true, value });
  }
  commands.length = 0;
  wallTime += 100;
  expect(frameCallback).toBeTypeOf('function');
  await act(async () => frameCallback());
  expect(errors).not.toHaveBeenCalled();
}

async function toggleDetails() {
  await act(async () => host.querySelector('button[aria-label="Expand the flight deck controls"]').click());
  await act(async () => button('More information').click());
  await act(async () => host.querySelector('button[aria-label="Collapse the flight deck controls"]').click());
}

describe('Painted mission HUD disclosure', () => {
  it.each(['rescue', 'survey'])('keeps the default %s HUD to one compact panel and one action', async kind => {
    await mountMission(kind);
    await paint();
    expect(strips()).toHaveLength(1);
    const box = strips()[0].box;
    const inPanel = commands.filter(command => command.method === 'fillText'
      && command.args[1] >= box.x && command.args[1] <= box.x + box.w
      && command.args[2] > box.y && command.args[2] < box.y + box.h);
    const actions = inPanel.filter(command => command.font === '11px system-ui');
    expect(actions).toHaveLength(1);
    expect(texts().some(text => /DISTRESS BEACON|DRONE TELEMETRY|HOLD POSITION — HOIST|📸 CAPTURING/.test(text))).toBe(false);
  });

  it('restores rescue telemetry through More information and folds it back away', async () => {
    await mountMission('rescue');
    await toggleDetails();
    expect(latest.flightDetails).toBe(true);
    await paint();
    expect(strips()).toHaveLength(0);
    expect(texts().some(text => text.includes('DISTRESS BEACON'))).toBe(true);
    expect(texts().some(text => text.startsWith('TGT '))).toBe(true);
    await toggleDetails();
    await paint();
    expect(strips()).toHaveLength(1);
    expect(texts().some(text => text.includes('DISTRESS BEACON'))).toBe(false);
  });

  it('shows only the nearest unrecorded survey marker until More information restores the pattern', async () => {
    await mountMission('survey');
    await paint();
    expect(texts()).toContain('Near site');
    expect(texts()).not.toContain('Far site');
    expect(texts()).not.toContain('Recorded site');
    expect(commands.some(command => command.method === 'setLineDash' && command.args[0]?.join() === '6,4')).toBe(false);
    await toggleDetails();
    await paint();
    expect(texts()).toContain('Near site');
    expect(texts()).toContain('Far site');
    expect(texts()).not.toContain('Recorded site');
    expect(texts()).toContain('🛸 DRONE TELEMETRY');
    expect(commands.some(command => command.method === 'setLineDash' && command.args[0]?.join() === '6,4')).toBe(true);
  });

  it('puts active hoist progress inside the strip instead of a second center panel', async () => {
    await mountMission('rescue');
    await patchData({ rescue: { ...rescue(), survivorLat: 0, survivorLon: 0 } });
    await paint(); await paint(); await paint();
    expect(strips()).toHaveLength(1);
    const box = strips()[0].box;
    const bars = commands.filter(command => command.method === 'fillRect'
      && command.args[0] === box.x + 10 && command.args[1] === box.y + 55 && command.args[3] === 3);
    expect(bars).toHaveLength(2);
    expect(bars[1].args[2]).toBeGreaterThan(0);
    expect(texts().some(text => text.includes('HOLD POSITION — HOIST IN PROGRESS'))).toBe(false);
  });

  it.each(['tutorial', 'expanded deck'])('hides the strip while the %s occupies its space', async obstruction => {
    await mountMission('survey');
    if (obstruction === 'tutorial') await patchData({ takeoffTutorialDismissed: false });
    else await act(async () => host.querySelector('button[aria-label="Expand the flight deck controls"]').click());
    await paint(pose, 320, 763, obstruction === 'expanded deck');
    expect(strips()).toHaveLength(0);
    if (obstruction === 'tutorial') expect(host.querySelector('[data-flight-current-cue]')).toBeTruthy();
    else expect(latest.railCollapsed).toBe(false);
  });
});
