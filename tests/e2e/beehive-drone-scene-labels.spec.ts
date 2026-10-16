import { test, expect, Page, Locator } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true, layout: 'document',
  width: 1100, height: 1000, probes: 'window.__testHooks={};' });
const artifacts = path.resolve(process.env.BEE_DRONE_CUES_ARTIFACTS || '.codex-artifacts/bee-drone-cues-2026-10-15');
test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(async () => { fs.mkdirSync(artifacts, { recursive: true }); await harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

type Rect = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };
type Label = Rect & { id: string; text: string; detail?: string; anchorX: number; anchorY: number; hidden: boolean; moved: boolean; leader: boolean; leaderPath: Point[] };
type Marker = Point & { id: string; kind: string; visible: boolean };
type CueLayout = { bounds: { left: number; top: number; right: number; bottom: number }; labels: Label[]; markers: Marker[]; reserved: Rect[] };
type DrawnText = Point & { text: string; font: string; align: string; width: number };
type Stroke = { points: Point[]; width: number; color: string };
type Frame = { serial: number; text: DrawnText[]; strokes: Stroke[] };
const field = (page: Page) => page.locator('#beehive-drone-playfield');
const viewport = (page: Page) => field(page).locator('[data-flight-viewport]');
const camera = (page: Page) => page.locator('[data-flight-camera-toggle]');
const basePose = { x: 0, y: 30, z: -180, yaw: 0, pitch: 0, roll: 0, vx: 0, vy: 0, vz: -2,
  speed: 2, phase: 'flight', reachedLaunch: true, reachedDca: false, reachedQueen: false,
  energy: 100, timer: 120, stallWarning: false, trainingActive: false, trainingComplete: false, wind: { x: 0, z: 0, phase: 0 },
  windNow: { x: 0, z: 0 }, nearestObstacle: null, nearestTraffic: null, obstacles: [], birds: [], drones: [], flowers: [], thermals: [], nearQueens: [] };
async function settle(page: Page) {
  await page.evaluate(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
}
async function keyboard(page: Page, control: Locator, key = 'Enter') {
  await control.focus(); await expect(control).toBeFocused(); await page.keyboard.press(key);
}
async function mount(page: Page, fallback = true) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(fallback => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    if (fallback) w.StemLab.ensureThree = () => Promise.reject(new Error('Scene label tests exercise the supported graphics fallback'));
    const after = w.THREE.Scene.prototype.onAfterRender;
    w.THREE.Scene.prototype.onAfterRender = function (renderer: any, scene: any, currentCamera: any) {
      if (renderer.domElement.hasAttribute('data-beehive-drone-webgl')) { w.__cueCamera = currentCamera; w.__cueWorld = scene; }
      if (typeof after === 'function') return after.call(this, renderer, scene, currentCamera);
    };
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'drone', tutorialDone: true,
      soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: true,
      day: 0, workers: 30000, honey: 80, queenHealth: 100, morale: 90, varroaLevel: 2,
      actionPoints: 2, activeEvent: null, missionBriefOpen: false, journeyOpen: false,
      notebookOpen: false, showBadges: false,
      drone: { active: false, pacing: 'live', scenario: 'clear', routePlan: 'balanced', courseSeed: 20260908,
        graphicsMode: 'eco', cameraMode: 'cockpit', custom: { retained: 'Saved flight metadata.' } },
      notebook: { drone: { prediction: 'Keep my flight prediction.', evidence: 'Keep my flight evidence.', explanation: 'Keep my explanation.' },
        beekeeper: { evidence: 'Keep my colony evidence.' }, synthesis: 'Keep my synthesis.', custom: { retained: 'Notebook metadata.' } },
      journal: [{ day: 0, text: 'Keep my recorded observation.' }], custom: { retained: 'Colony metadata.' },
    }, otherTool: { retained: true } }));
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, fallback);
  await expect(field(page)).toHaveAttribute('data-beehive-stage', 'drone-briefing'); await expect(field(page)).toBeVisible();
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-reduced-motion', 'true');
  await expect(field(page).locator('[data-flight-start-behavior]')).toContainText('Starts paused for your reduced-motion preference');
  await settle(page); await keyboard(page, page.locator('[data-flight-launch="easy"]'));
  const canvas = page.locator('[data-beehive-drone-canvas]');
  await expect(canvas).toHaveAttribute('data-flight-renderer', fallback ? 'canvas-2d-fallback' : 'three-webgl');
  if (!fallback) await expect(canvas).toHaveAttribute('data-flight-frame-health', 'verified', { timeout: 45000 });
  await expect(field(page)).toHaveAttribute('data-flight-state', 'paused'); await settle(page);
  await canvas.evaluate((node: HTMLCanvasElement) => {
    const w = window as any, c = node.getContext('2d')!;
    w.__cueMountedCanvas = node; w.__cueMountedState = w.__testHooks.beehive.droneStateRef.current;
    w.__cueMountedWorld = w.__cueWorld; w.__cueFrame = { serial: 0, text: [], strokes: [] };
    const clear = c.clearRect.bind(c), text = c.fillText.bind(c), begin = c.beginPath.bind(c), move = c.moveTo.bind(c), line = c.lineTo.bind(c), stroke = c.stroke.bind(c);
    let points: Point[] = [];
    const screen = (x: number, y: number) => {
      const matrix = c.getTransform(), scaleX = node.width / node.clientWidth, scaleY = node.height / node.clientHeight;
      return { x: (matrix.a * x + matrix.c * y + matrix.e) / scaleX, y: (matrix.b * x + matrix.d * y + matrix.f) / scaleY };
    };
    c.clearRect = function (...args: Parameters<typeof c.clearRect>) {
      w.__cueFrame = { serial: w.__cueFrame.serial + 1, text: [], strokes: [] }; points = []; return clear(...args);
    };
    c.fillText = function (...args: Parameters<typeof c.fillText>) {
      const [value, x, y] = args;
      w.__cueFrame.text.push({ text: String(value), ...screen(x, y), font: c.font, align: c.textAlign, width: c.measureText(String(value)).width });
      return text(...args);
    };
    c.beginPath = function () { points = []; return begin(); };
    c.moveTo = function (x: number, y: number) { points.push(screen(x, y)); return move(x, y); };
    c.lineTo = function (x: number, y: number) { points.push(screen(x, y)); return line(x, y); };
    c.stroke = function (...args: any[]) {
      if (points.length >= 2) w.__cueFrame.strokes.push({ points: points.map(point => ({ ...point })), width: c.lineWidth, color: String(c.strokeStyle) });
      return (stroke as any)(...args);
    };
  });
}
async function flight(page: Page) {
  return page.evaluate(() => {
    const s = (window as any).__testHooks.beehive.droneStateRef.current, result: Record<string, unknown> = {};
    for (const key of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'yaw', 'pitch', 'roll', 'speed', 'energy', 'timer', 'phase', 'paused',
      'score', 'distance', 'randomState', 'simulationClock', 'decisionCount', 'decisionLog', 'telemetry', 'reachedLaunch', 'reachedDca',
      'reachedQueen', 'nectarCollected', 'routeMarkersPassed', 'stallWarning', 'nearQueens', 'obstacles', 'birds', 'drones', 'flowers', 'thermals', 'wind', 'windNow']) result[key] = s[key];
    return JSON.parse(JSON.stringify(result));
  });
}
async function savedWork(page: Page) {
  return page.evaluate(() => {
    const result = JSON.parse(JSON.stringify((window as any).__toolData));
    delete result.beehive.drone.cameraMode; delete result.beehive.drone.detailedHud;
    return result;
  });
}
async function identity(page: Page, webgl = false) {
  expect(await page.evaluate(webgl => {
    const w = window as any;
    return w.__cueMountedCanvas === document.querySelector('[data-beehive-drone-canvas]') && w.__cueMountedState === w.__testHooks.beehive.droneStateRef.current && (!webgl || w.__cueWorld === w.__cueMountedWorld);
  }, webgl)).toBe(true);
}
async function refresh(page: Page, patch?: Record<string, unknown>) {
  if (patch) await page.evaluate(patch => Object.assign((window as any).__testHooks.beehive.droneStateRef.current, patch), patch);
  const held = await flight(page), before = await page.evaluate(() => (window as any).__cueFrame.serial);
  await keyboard(page, camera(page)); await keyboard(page, camera(page));
  await expect.poll(() => page.evaluate(() => (window as any).__cueFrame.serial)).toBeGreaterThan(before);
  await settle(page); expect(await flight(page)).toEqual(held); return held;
}
async function setCamera(page: Page, mode: 'cockpit' | 'chase') {
  if ((await camera(page).getAttribute('aria-pressed') === 'true') !== (mode === 'chase')) await keyboard(page, camera(page));
  await expect(camera(page)).toHaveAttribute('aria-pressed', mode === 'chase' ? 'true' : 'false'); await settle(page);
}
async function setHud(page: Page, detailed: boolean) {
  if ((await field(page).getAttribute('data-flight-hud') === 'detailed') !== detailed) {
    const comfort = page.locator('[data-flight-comfort-details]');
    if (!(await comfort.evaluate((node: HTMLDetailsElement) => node.open))) await keyboard(page, comfort.locator(':scope > summary'));
    await keyboard(page, page.locator('[data-flight-hud-toggle]'));
  }
  await expect(field(page)).toHaveAttribute('data-flight-hud', detailed ? 'detailed' : 'clear'); await settle(page);
}
async function snapshot(page: Page): Promise<{ layout: CueLayout; frame: Frame; width: number; height: number }> {
  return page.evaluate(() => {
    const w = window as any, canvas = document.querySelector('[data-beehive-drone-canvas]') as HTMLCanvasElement;
    return JSON.parse(JSON.stringify({ layout: w.__testHooks.beehive.droneSceneCueLayout, frame: w.__cueFrame, width: canvas.clientWidth, height: canvas.clientHeight }));
  });
}
function separated(a: Rect, b: Rect, gap = 5) {
  return a.x + a.width + gap <= b.x + .05 || b.x + b.width + gap <= a.x + .05 || a.y + a.height + gap <= b.y + .05 || b.y + b.height + gap <= a.y + .05;
}
function near(a: Point, b: Point, tolerance = .15) { return Math.hypot(a.x - b.x, a.y - b.y) < tolerance; }
function contains(rect: Rect, point: Point) { return point.x >= rect.x - .05 && point.x <= rect.x + rect.width + .05 && point.y >= rect.y - .05 && point.y <= rect.y + rect.height + .05; }
function crossesInterior(a: Point, b: Point, rect: Rect) {
  const left = rect.x + .05, right = rect.x + rect.width - .05, top = rect.y + .05, bottom = rect.y + rect.height - .05;
  let enter = 0, exit = 1;
  for (const [origin, delta, minimum, maximum] of [[a.x, b.x - a.x, left, right], [a.y, b.y - a.y, top, bottom]]) {
    if (Math.abs(delta) < 1e-10) { if (origin <= minimum || origin >= maximum) return false; }
    else {
      const first = (minimum - origin) / delta, second = (maximum - origin) / delta;
      enter = Math.max(enter, Math.min(first, second)); exit = Math.min(exit, Math.max(first, second));
      if (enter >= exit) return false;
    }
  }
  return enter < exit;
}
function markerRectangle(rect: Rect, markers: Marker[]) {
  return markers.some(marker => {
    const radius = marker.kind === 'target' ? 16 : marker.kind === 'heading' ? 7 : 12;
    return (marker.visible || marker.kind === 'edge') && Math.abs(rect.x - (marker.x - radius)) < .05 && Math.abs(rect.y - (marker.y - radius)) < .05 && Math.abs(rect.width - radius * 2) < .05 && Math.abs(rect.height - radius * 2) < .05;
  });
}
function checkLayout(current: Awaited<ReturnType<typeof snapshot>>) {
  const { layout, frame } = current; expect(layout).toBeTruthy(); expect(layout.labels.length).toBeGreaterThan(0);
  const shown = layout.labels.filter(label => !label.hidden);
  for (const label of shown) {
    expect(Number.isFinite(label.x + label.y + label.width + label.height), label.id).toBe(true);
    expect(label.x, label.id).toBeGreaterThanOrEqual(layout.bounds.left - .05);
    expect(label.y, label.id).toBeGreaterThanOrEqual(layout.bounds.top - .05);
    expect(label.x + label.width, label.id).toBeLessThanOrEqual(layout.bounds.right + .05);
    expect(label.y + label.height, label.id).toBeLessThanOrEqual(layout.bounds.bottom + .05);
    expect(label.height, label.id).toBe(label.detail ? 40 : 22);
    for (const reserved of layout.reserved) expect(separated(label, reserved), label.id + ' overlaps a reserved area').toBe(true);
    const actual = frame.text.find(text => text.text === label.text && near(text, { x: label.x + label.width / 2, y: label.y + 15 }));
    expect(actual, label.id + ': rendered primary text').toBeTruthy(); expect(actual!.align).toBe('center');
    expect(Number(actual!.font.match(/([\d.]+)px/)?.[1]), label.id).toBe(12);
    expect(actual!.width + 16, label.id).toBeLessThanOrEqual(label.width + .05);
    if (label.detail) {
      const detail = frame.text.find(text => text.text === label.detail && near(text, { x: label.x + label.width / 2, y: label.y + 31 }));
      expect(detail, label.id + ': rendered range').toBeTruthy(); expect(Number(detail!.font.match(/([\d.]+)px/)?.[1]), label.id).toBe(11);
      expect(detail!.width + 16, label.id).toBeLessThanOrEqual(label.width + .05);
    }
    if (label.leader) {
      expect(label.moved, label.id).toBe(true); expect(label.leaderPath.length, label.id).toBeGreaterThanOrEqual(2);
      const anchor = { x: label.anchorX, y: label.anchorY };
      expect(near(label.leaderPath[0], anchor), label.id + ': leader starts at its true anchor').toBe(true);
      expect(contains(label, label.leaderPath.at(-1)!), label.id + ': leader reaches its own plaque').toBe(true);
      const leaders = frame.strokes.filter(stroke => stroke.points.length === label.leaderPath.length && stroke.points.every((point, index) => near(point, label.leaderPath[index])));
      expect(leaders.some(stroke => stroke.width === 1), label.id + ': colored leader').toBe(true);
      expect(leaders.some(stroke => stroke.width === 3), label.id + ': dark leader under-stroke').toBe(true);
      const obstacles = [...shown.filter(other => other.id !== label.id), ...layout.reserved.filter(rect => !(markerRectangle(rect, layout.markers) && contains(rect, anchor)))];
      for (let index = 1; index < label.leaderPath.length; index++) {
        for (const obstacle of obstacles) expect(crossesInterior(label.leaderPath[index - 1], label.leaderPath[index], obstacle), label.id + ': leader crosses another caption or reserved area').toBe(false);
      }
    } else {
      expect(label.leaderPath, label.id + ': no unsafe connector is drawn').toEqual([]);
    }
  }
  for (let a = 0; a < shown.length; a++) for (let b = a + 1; b < shown.length; b++) expect(separated(shown[a], shown[b]), shown[a].id + ' overlaps ' + shown[b].id).toBe(true);
  for (const label of layout.labels.filter(label => label.hidden)) {
    if (!shown.some(other => other.text === label.text)) expect(frame.text.some(text => text.text === label.text), label.id + ': hidden text must not be drawn').toBe(false);
  }
  for (const marker of layout.markers.filter(marker => marker.kind === 'target' && marker.visible)) {
    const bracket = frame.strokes.find(stroke => {
      if (Math.abs(stroke.width - 1.6) > .001 || stroke.points.length !== 8) return false;
      const xs = stroke.points.map(point => point.x), ys = stroke.points.map(point => point.y);
      return near({ x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }, marker);
    });
    if (!bracket) fs.writeFileSync(path.join(artifacts, 'scene-label-bracket-failure-' + marker.id.replace(/[^a-z0-9-]/gi, '_') + '.json'), JSON.stringify({ marker, ...current }, null, 2));
    expect(bracket, marker.id + ': actual bracket remains at its projected anchor').toBeTruthy();
  }
  return shown;
}
async function capture(page: Page, name: string, current: Awaited<ReturnType<typeof snapshot>>) {
  await viewport(page).screenshot({ path: path.join(artifacts, 'preview-drone-scene-labels-' + name + '.png'), animations: 'disabled', timeout: 120000 });
  fs.writeFileSync(path.join(artifacts, 'scene-labels-' + name + '.json'), JSON.stringify(current, null, 2));
}
async function fallbackDcaAnchor(page: Page) {
  const current = await snapshot(page), marker = current.layout.markers.find(item => item.id === 'dca');
  expect(marker).toBeTruthy(); expect(marker!.visible).toBe(true);
  expect(marker!.x).toBeCloseTo(current.width / 2, 4);
  expect(marker!.y).toBeCloseTo(current.height / 2 - (115 - 30) / (600 - 180) * 300, 4);
}

test('Scene labels separate overlapping DCA and optional-guide captions in paused fallback flight', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  const held = await refresh(page, basePose), saved = await savedWork(page); let displaced = false;
  for (const size of [{ name: 'wide', width: 1100 }, { name: 'mobile', width: 320 }]) {
    await page.setViewportSize({ width: size.width, height: 1000 });
    for (const view of ['cockpit', 'chase'] as const) {
      await setCamera(page, view); await refresh(page);
      const current = await snapshot(page), shown = checkLayout(current);
      expect(shown.map(label => label.id)).toContain('dca'); expect(shown.map(label => label.id)).toContain('guide-2');
      if (size.name === 'mobile') {
        expect(shown.find(label => label.id === 'guide-2')!.moved).toBe(true);
        expect(current.height).toBe(440);
        for (const id of ['heading', 'motion']) expect(current.layout.markers.find(marker => marker.id === id)).toMatchObject({ visible: true, x: current.width / 2, y: 220 });
        expect(shown.some(label => label.text === 'HEADING + MOTION')).toBe(true);
      }
      displaced ||= shown.some(label => label.moved && label.leader);
      expect(current.layout.bounds).toMatchObject({ left: 8, top: 8, right: current.width - 8, bottom: current.height - 8 });
      await fallbackDcaAnchor(page);
      const stable = JSON.parse(JSON.stringify(current.layout)); await page.waitForTimeout(300); await refresh(page);
      expect((await snapshot(page)).layout).toEqual(stable);
      expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(saved); await identity(page);
      await capture(page, 'fallback-' + size.name + '-' + view, await snapshot(page));
    }
  }
  expect(displaced).toBe(true);
  await setHud(page, true); await refresh(page); const detailed = await snapshot(page);
  checkLayout(detailed); expect(detailed.layout.bounds.top).toBe(84); expect(detailed.layout.bounds.bottom).toBe(detailed.height - 96);
  expect(detailed.layout.reserved.length).toBeGreaterThan(0); await fallbackDcaAnchor(page);
  expect(detailed.layout.labels.find(label => label.id === 'guide-2')?.hidden).toBe(true);
  expect(detailed.layout.markers.find(marker => marker.id === 'guide-2')).toMatchObject({ kind: 'frame', visible: true });
  await capture(page, 'fallback-mobile-detailed', detailed);
  expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(saved); expect(errors).toEqual([]);
});

async function webglAnchor(page: Page, id: string, point: { x: number; y: number; z: number }) {
  const spatial = !['heading', 'motion'].includes(id);
  const expected = await page.evaluate(({ point, spatial }) => {
    const w = window as any, canvas = document.querySelector('[data-beehive-drone-canvas]') as HTMLCanvasElement, state = w.__testHooks.beehive.droneStateRef.current;
    const vector = new w.THREE.Vector3(point.x, point.y, point.z), depth = -vector.clone().applyMatrix4(w.__cueCamera.matrixWorldInverse).z, projected = vector.project(w.__cueCamera);
    const width = canvas.clientWidth, height = canvas.clientHeight, x = (projected.x + 1) * width / 2, y = (1 - projected.y) * height / 2;
    const detailed = document.getElementById('beehive-drone-playfield')!.getAttribute('data-flight-hud') === 'detailed', side = spatial ? 34 : 28;
    const visible = depth > 1 && x > side && x < width - side && y > (detailed ? 96 : side) && y < height - (detailed ? 92 : side);
    const bearing = Math.atan2(point.x - state.x, -(point.z - state.z)) - state.yaw, radius = Math.max(44, Math.min(width / 2 - 30, height / 2 - 72));
    return { depth, visible, projected: { x, y }, edge: { x: width / 2 + Math.sin(bearing) * radius, y: height / 2 - Math.cos(bearing) * radius } };
  }, { point, spatial });
  const marker = (await snapshot(page)).layout.markers.find(item => item.id === id);
  if (!spatial && expected.depth <= 1) { expect(marker, id + ': behind-camera direction has no invented projection').toBeUndefined(); return; }
  expect(marker, id).toBeTruthy(); expect(marker!.visible, id).toBe(expected.visible);
  const position = spatial && !expected.visible ? expected.edge : expected.projected;
  expect(marker!.kind, id).toBe(spatial ? (expected.visible ? 'target' : 'edge') : id);
  expect(Math.abs(marker!.x - position.x), id).toBeLessThan(1); expect(Math.abs(marker!.y - position.y), id).toBeLessThan(1);
}
async function approachGeometry(page: Page) {
  return page.evaluate(() => {
    const w = window as any, volume = w.__cueWorld.getObjectByName('drone-dca-entry-volume'), center = new w.THREE.Vector3(); volume.getWorldPosition(center);
    return { volume: { position: center.toArray(), radius: volume.geometry.parameters.radiusTop, height: volume.geometry.parameters.height },
      frames: [1, 2, 3].map(index => { const guide = w.__cueWorld.getObjectByName('drone-approach-guide-' + index); return { position: guide.position.toArray(), scale: guide.scale.toArray(), visible: guide.visible }; }) };
  });
}

test('Scene label layout keeps WebGL target and motion anchors on their true projections across cameras and sizes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page, false);
  const held = await refresh(page, basePose), saved = await savedWork(page), geometry = await approachGeometry(page);
  expect(geometry.volume).toEqual({ position: [0, 115, -600], radius: 72, height: 30 });
  expect(geometry.frames.map(frame => frame.position)).toEqual([[0, 100, -140], [0, 100, -300], [0, 100, -460]]);
  for (const size of [{ name: 'wide', width: 1100 }, { name: 'mobile', width: 320 }]) {
    await page.setViewportSize({ width: size.width, height: 1000 });
    for (const view of ['cockpit', 'chase'] as const) {
      await setCamera(page, view); await refresh(page); const current = await snapshot(page); checkLayout(current);
      await webglAnchor(page, 'dca', { x: 0, y: 115, z: -600 });
      await webglAnchor(page, 'heading', { x: 0, y: 30, z: -192 });
      await webglAnchor(page, 'motion', { x: 0, y: 30, z: -192 });
      expect(await approachGeometry(page)).toEqual(geometry); expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(saved); await identity(page, true);
      await capture(page, 'webgl-' + size.name + '-' + view, current);
    }
  }
  const queen = { x: 20, y: 65, z: -480, caught: false }, queenHeld = await refresh(page, { reachedDca: true, phase: 'congregation', nearQueens: [queen] });
  const queenLayout = await snapshot(page), shown = checkLayout(queenLayout);
  expect(shown.map(label => label.id)).toContain('queen-0'); expect(shown.some(label => label.id === 'dca')).toBe(false);
  await webglAnchor(page, 'queen-0', queen);
  expect((await approachGeometry(page)).frames.every(frame => !frame.visible)).toBe(true);
  await capture(page, 'webgl-mobile-queen', queenLayout); await page.waitForTimeout(250);
  expect(await flight(page)).toEqual(queenHeld); expect(await savedWork(page)).toEqual(saved); await identity(page, true);
  const complete = await refresh(page, { phase: 'mating', reachedQueen: true, nearQueens: [{ ...queen, caught: true }] });
  const completion = await snapshot(page); expect(completion.layout.labels).toEqual([]);
  expect(completion.frame.text.some(text => text.text === 'QUEEN CUE REACHED')).toBe(true);
  expect(completion.frame.text.some(text => /^(DCA VOLUME|QUEEN SIGNAL|GUIDE \d|HEADING|MOTION$)/.test(text.text))).toBe(false);
  await page.waitForTimeout(250); expect(await flight(page)).toEqual(complete); expect(await savedWork(page)).toEqual(saved); await identity(page, true); expect(errors).toEqual([]);
});

test('Crowded scene labels retain hazards and targets while offscreen and stationary cues remain truthful', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await page.setViewportSize({ width: 320, height: 1000 }); await mount(page);
  const sightlineY = 30 + (115 - 30) * 70 / 420;
  const crowded = await refresh(page, { ...basePose,
    birds: [{ x: 0, y: sightlineY, z: -250, vx: 0, vy: 0, vz: 0, wingPhase: 0 }],
    drones: [{ x: 0, y: sightlineY, z: -250, vx: 0, vy: 0, vz: 0 }],
    obstacles: [{ x: 0, z: -260, h: 60, type: 'tree' }] });
  const saved = await savedWork(page), current = await snapshot(page), shown = checkLayout(current);
  expect(shown.map(label => label.id)).toEqual(expect.arrayContaining(['dca', 'bird', 'traffic', 'obstacle']));
  await fallbackDcaAnchor(page); await capture(page, 'fallback-mobile-crowded', current);
  for (const label of shown.filter(label => ['bird', 'traffic'].includes(label.id))) {
    expect(label.anchorX).toBeCloseTo(current.width / 2, 4);
    expect(label.anchorY).toBeCloseTo(current.height / 2 - (115 - 30) / 420 * 300, 4);
  }
  await setHud(page, true); await refresh(page); const detailed = await snapshot(page); checkLayout(detailed);
  for (const label of detailed.layout.labels.filter(label => label.hidden && label.id.startsWith('guide-'))) {
    expect(detailed.frame.text.some(text => text.text === label.text)).toBe(false);
  }
  await capture(page, 'fallback-mobile-crowded-detailed', detailed);
  expect(await flight(page)).toEqual(crowded); expect(await savedWork(page)).toEqual(saved);

  const warningsHeld = await refresh(page, { y: 20, vy: -1, stallWarning: true });
  for (const detailedHud of [true, false]) {
    await setHud(page, detailedHud); await refresh(page); const activeWarnings = await snapshot(page), captions = checkLayout(activeWarnings);
    await expect(page.locator('[data-flight-condition="ground"]')).toBeVisible();
    await expect(page.locator('[data-flight-condition="climb"]')).toBeVisible();
    await expect(page.locator('[data-flight-conditions-context]')).toHaveText('Paused readings · plan before resuming.');
    expect(activeWarnings.frame.text.some(text => text.text === '▲ PULL UP ▲' || text.text === 'SLOW CLIMB - COMPARE ALTITUDE')).toBe(false);
    // Paused inspection keeps the readable conditions above the scene and releases
    // the central warning areas for target labels. HUD instrument areas still apply.
    expect(activeWarnings.layout.reserved.some(region => region.x === activeWarnings.width / 2 - 113 && region.y === activeWarnings.height / 2 + 33)).toBe(false);
    expect(activeWarnings.layout.reserved.some(region => region.y === activeWarnings.height / 2 - 48 && region.height === 24)).toBe(false);
    for (const region of activeWarnings.layout.reserved) {
      for (const caption of captions) expect(separated(caption, region), caption.id + ': overlaps a reserved region').toBe(true);
    }
    await capture(page, 'fallback-mobile-warnings-' + (detailedHud ? 'detailed' : 'clear'), activeWarnings);
    expect(await flight(page)).toEqual(warningsHeld); expect(await savedWork(page)).toEqual(saved);
  }
  await setHud(page, false);

  const stationary = await refresh(page, { ...basePose, vx: 0, vy: 0, vz: 0, yaw: Math.PI });
  const rear = await snapshot(page); checkLayout(rear);
  const target = rear.layout.markers.find(marker => marker.id === 'dca'); expect(target).toBeTruthy();
  expect(target).toMatchObject({ kind: 'edge', visible: false });
  expect(rear.layout.labels.filter(label => !label.hidden).map(label => label.id)).toContain('dca');
  expect(rear.frame.text.some(text => text.text === 'MOTION')).toBe(false);
  expect(await page.evaluate(() => (window as any).__testHooks.beehive.droneStateRef.current.flightPathCue)).toMatchObject({ moving: false, motion: null });
  await capture(page, 'fallback-mobile-rearward-stationary', rear);
  await page.waitForTimeout(250); expect(await flight(page)).toEqual(stationary); expect(await savedWork(page)).toEqual(saved); await identity(page); expect(errors).toEqual([]);
});
