import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ retries: 0, timeout: 120_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round26-2026-10-21');
const axeSource = readFileSync(join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8');
if (process.env.STEM_GL_SUBSTITUTE || process.env.MIG_TOOL_FILE) throw new Error('Canonical identity checks reject source substitutions');
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_migration.js', toolId: 'migration',
  width: 1100, height: 900, layout: 'document', appStyles: true,
  probes: `var viewport=document.createElement('meta');viewport.name='viewport';viewport.content='width=device-width,initial-scale=1';document.head.appendChild(viewport);document.querySelector('#wrap').style.width='min(100vw,1100px)';document.body.style.fontFamily='system-ui,sans-serif';document.body.style.background='#f8fafc';`
});
const failures = new WeakMap<Page, string[]>();
test.beforeAll(async () => { await mkdir(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([harness.destroy(page), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Round26 scene cleanup exceeded 20 seconds')), 20_000);
    })]);
  } finally { if (timer) clearTimeout(timer); }
});

const stage = (page: Page) => page.locator('.migration-flight-stage');
const context = (page: Page) => page.locator('#migration-study-current-context');
const note = (page: Page) => page.getByRole('textbox', { name: 'Shape and motion observation', exact: true });
const cycle = (page: Page, index: number) => page.getByRole('button', { name: 'Cycle position ' + (index + 1) + ' of 8', exact: true });
const viewpoint = (page: Page, id: string) => page.locator('[data-study-viewpoint="' + id + '"]');
const checkedCue = (page: Page) => context(page).locator('[data-study-checked-comparison]');
async function frames(page: Page) {
  const before = await page.evaluate(() => (window as any).__glScene()?.renders || 0);
  await page.waitForFunction(before => ((window as any).__glScene()?.renders || 0) >= before + 2, before, { timeout: 20_000 });
}
async function activate(page: Page, locator: Locator, touch = false) {
  if (touch) await locator.tap();
  else { await locator.focus(); await page.keyboard.press('Enter'); }
  await frames(page);
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.migration)));
}
function work(data: any) {
  return Object.fromEntries(['flightStudyObservations', 'flightInvestigation', 'flightChallenges', 'inquiry', 'aiExplorerText'].map(key => [key, data[key]]));
}
function learnerSeed(id: string, region: string) {
  const key = id + ':' + region;
  return {
    flightStudyObservations: { drafts: { [key]: 'My prediction before observing ' + id + '.' },
      records: { [key]: { speciesId: id, region, note: 'Keep my earlier recorded evidence.', bird: 0,
        yaw: 90, pitch: 10, zoom: 1, wingStep: 4, paused: true, motionReduced: true } },
      comparison: { draft: 'Keep my own comparison claim.' } },
    flightInvestigation: { variable: 'wind', prediction: 'Keep my wind prediction.', trials: [], evidence: 'Keep my wind evidence.' },
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Keep my challenge prediction.', notes: 'Keep my reasoning.', attempts: [] } } },
    inquiry: { hypothesis: 'Keep my migration hypothesis.', explanation: 'Keep my explanation.', trials: [] },
    aiExplorerText: 'Keep my migration research.'
  };
}
async function setTheme(page: Page, dark: boolean) {
  await page.evaluate(dark => {
    const w = window as any; w.__ctx.isDark = dark; w.__ctx.theme = dark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', dark);
    document.body.style.background = dark ? '#0f172a' : '#f8fafc'; w.__rerender();
  }, dark);
  await frames(page);
}
async function mount(page: Page, id: string, region: string, dark: boolean) {
  page.setDefaultTimeout(20_000); page.setDefaultNavigationTimeout(30_000);
  const errors: string[] = []; failures.set(page, errors);
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('crash', () => errors.push('Browser page crashed'));
  page.on('console', message => { if (message.type() === 'error' && /WebGL|shader|context lost|THREE\.WebGLRenderer/i.test(message.text())) errors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { migration: { tab: 'flight3d', flightCamera: 'chase', flightPaused: true,
    flightSpecies: id, flightShowWingtipPath: true, flightShowAnatomy: id !== 'monarch',
    flightStudyRegion: region, flightStudyObservationOpen: true, flightWingStep: 13,
    flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1, ...learnerSeed(id, region) } },
    'document.querySelector(".migration-flight-stage")?.getAttribute("data-flight-ready")==="true"');
  await page.evaluate(() => {
    const w = window as any, record = w.__glCanvas()?.rec, original = record.scene.onBeforeRender;
    record.scene.onBeforeRender = function(renderer: any, scene: any, camera: any, ...rest: any[]) {
      record.camera = camera; record.renderer = renderer;
      if (original) original.call(this, renderer, scene, camera, ...rest);
    };
  });
  await setTheme(page, dark);
  expect(await harness.glScene(page)).toMatchObject({ hasScene: true });
  expect((await harness.glContexts(page)).some(item => item.createdBy === 'page' && item.type === 'webgl2' && !item.lost && item.draws > 0)).toBe(true);
}

async function renderState(page: Page) {
  return page.evaluate(() => {
    const w = window as any, rec = w.__glCanvas()?.rec, scene = rec?.scene, camera = rec?.camera, THREE = w.THREE;
    if (!scene || !camera || !rec.canvas) throw new Error('Rendered lighting scene unavailable');
    scene.updateMatrixWorld(true);
    const hemi = scene.getObjectByName('migration-flight-hemisphere');
    const key = scene.getObjectByName('migration-flight-key-light');
    const rim = scene.getObjectByName('migration-flight-rim-light');
    const flock = scene.getObjectByName('migration-flock'), data = w.__toolData.migration;
    if (!hemi?.isHemisphereLight || !key?.isDirectionalLight || !rim?.isDirectionalLight || !flock) throw new Error('Expected three original named lights');
    const bird = flock.children[Math.max(0, Math.min(flock.children.length - 1, Number(data.flightStudyBird) || 0))];
    const target = bird.getWorldPosition(new THREE.Vector3());
    const axes = [0, 1, 2].map(column => new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, column).normalize());
    const identityMap = w.__identity26Ids || (w.__identity26Ids = new WeakMap());
    const identity = (object: object) => { if (!identityMap.has(object)) identityMap.set(object, w.__identity26Next = (w.__identity26Next || 0) + 1); return identityMap.get(object); };
    const countLights: string[] = [], sceneResources = new Set<string>(), birdResources = new Set<string>();
    const birdColors = new Map<string, number>(); const geometryBuffers = new Map<string, number[]>();
    scene.traverse((node: any) => {
      if (node.isLight) countLights.push(node.uuid);
      if (node.geometry) sceneResources.add(node.geometry.uuid);
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        if (material) { sceneResources.add(material.uuid); if (material.map) sceneResources.add(material.map.uuid); }
      }
    });
    bird.traverse((node: any) => {
      if (node.geometry) {
        birdResources.add(node.geometry.uuid);
        const attribute = node.geometry.attributes.position;
        if (attribute) geometryBuffers.set(node.geometry.uuid, [identity(attribute), identity(attribute.array)]);
      }
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material) {
        birdResources.add(material.uuid); if (material.color) birdColors.set(material.uuid, material.color.getHex());
      }
    });
    const directional = (light: any) => {
      light.updateWorldMatrix(true, false); light.target.updateWorldMatrix(true, false);
      const position = light.getWorldPosition(new THREE.Vector3()), point = light.target.getWorldPosition(new THREE.Vector3());
      const delta = position.clone().sub(target), direction = position.clone().sub(point).normalize();
      return { uuid: light.uuid, targetUuid: light.target.uuid, color: light.color.getHex(), intensity: light.intensity,
        position: light.position.toArray(), worldPosition: position.toArray(), target: light.target.position.toArray(), worldTarget: point.toArray(),
        cameraOffset: axes.map(axis => delta.dot(axis)), cameraDirection: axes.map(axis => direction.dot(axis)),
        shadow: { object: identity(light.shadow), camera: identity(light.shadow.camera), mapSize: light.shadow.mapSize.toArray(), castShadow: light.castShadow,
          map: light.shadow.map?.texture?.uuid || null } };
    };

    // Inspect the real geometry used by both mirrored primary meshes. These
    // checks read positions/normals/indices; they do not trust feature metadata.
    const primaryMeshes = bird.userData.primaries || [];
    const primary = primaryMeshes.map((mesh: any) => {
      const geometry = mesh.geometry, positions = geometry.attributes.position, normals = geometry.attributes.normal;
      const colors = geometry.attributes.color, indices = geometry.index;
      const p = Array.from(positions.array) as number[], n = Array.from(normals.array) as number[];
      const c = Array.from(colors.array) as number[], ix = Array.from(indices.array) as number[];
      const ridges: any[] = [], triangleAreas: number[] = [], triangleFacing: number[] = [], normalLengths: number[] = [];
      for (let feather = 0; feather < 5; feather++) {
        const offset = feather * 7 * 3, baseY = p[offset + 1], baseZ = p[offset + 2];
        const shoulderY = p[offset + 2 * 3 + 1], shoulderZ = p[offset + 2 * 3 + 2];
        ridges.push([5, 6].map(vertex => {
          const index = offset + vertex * 3;
          const edgeY = baseY + (shoulderY - baseY) * (p[index + 2] - baseZ) / (shoulderZ - baseZ);
          return { position: p.slice(index, index + 3), lift: p[index + 1] - edgeY };
        }));
      }
      for (let vertex = 0; vertex < normals.count; vertex++) normalLengths.push(Math.hypot(...n.slice(vertex * 3, vertex * 3 + 3)));
      for (let index = 0; index < ix.length; index += 3) {
        const a = ix[index] * 3, b = ix[index + 1] * 3, c = ix[index + 2] * 3;
        const u = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]];
        const v = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]];
        const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        triangleAreas.push(Math.hypot(...cross) / 2); triangleFacing.push(cross[1]);
      }
      return { name: mesh.name, geometry: geometry.uuid, material: mesh.material.uuid, scaleX: mesh.scale.x,
        vertices: positions.count, normalCount: normals.count, indexCount: indices.count,
        positions: p, normals: n, colors: c, indices: ix, ridges,
        triangleAreas, triangleFacing, normalLengths,
        identities: [identity(positions), identity(positions.array), identity(normals), identity(normals.array), identity(colors), identity(colors.array), identity(indices), identity(indices.array)] };
    });
    const path = scene.getObjectByName('migration-wingtip-path'), marked = scene.getObjectByName('migration-marked-wing-pose');
    const markedPositions = marked?.geometry?.attributes.position;
    const markedCount = marked?.geometry?.drawRange.count || 0;
    const rect = rec.canvas.getBoundingClientRect();
    const joints = [...(bird.userData.wings || []), ...(bird.userData.wrists || []), ...(bird.userData.primaries || [])].filter(Boolean);
    return {
      primary, studyRadius: bird.userData.studyRadius,
      path: { available: path?.userData.available, buildVersion: path?.userData.buildVersion, sampleCount: path?.userData.sampleCount },
      marked: { captured: marked?.userData.captured, capturedPhase: marked?.userData.capturedPhase, capacity: marked?.userData.capacity, vertexCount: marked?.userData.vertexCount,
        drawCount: markedCount, finite: markedPositions ? Array.from(markedPositions.array).slice(0, markedCount * 3).every(Number.isFinite) : false },
      lights: { hemi: { uuid: hemi.uuid, color: hemi.color.getHex(), ground: hemi.groundColor.getHex(), intensity: hemi.intensity, position: hemi.position.toArray() },
        key: directional(key), rim: directional(rim), count: countLights.length, identities: countLights.sort() },
      target: target.toArray(), axes: axes.map(axis => axis.toArray()),
      pool: { scene: [...sceneResources].sort(), bird: [...birdResources].sort(), buffers: [...geometryBuffers].sort(), materialColors: [...birdColors].sort() },
      pose: { species: data.flightSpecies, source: bird.uuid, phase: bird.userData.lastRenderedWingPhase,
        body: bird.matrixWorld.elements.slice(), flock: flock.matrixWorld.elements.slice(), allBodies: flock.children.map((node: any) => node.matrixWorld.elements.slice()),
        joints: joints.map((node: any) => node.quaternion.toArray()), serial: Number(data.flightWingStep) || 0, paused: data.flightPaused === true },
      view: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), matrix: camera.matrixWorld.elements.slice(), projection: camera.projectionMatrix.elements.slice() },
      canvas: { width: rect.width, height: rect.height }, errors: w.__events.errors
    };
  });
}
const themeValues = (dark: boolean) => dark
  ? { hemi: [0x415a86, 0x10161f, .26], key: [0xcddcff, .42], rim: [0x6f8ec6, .20] }
  : { hemi: [0xcfe6f5, 0x2f4a2c, .72], key: [0xfff2d0, 1.05], rim: [0x9fd0ec, .42] };
function expectCorridor(state: any, dark: boolean) {
  const theme = themeValues(dark);
  expect([state.lights.hemi.color, state.lights.hemi.ground, state.lights.hemi.intensity]).toEqual(theme.hemi);
  expect([state.lights.key.color, state.lights.key.intensity]).toEqual(theme.key);
  expect([state.lights.rim.color, state.lights.rim.intensity]).toEqual(theme.rim);
  expect(state.lights.key.position).toEqual([-28, 34, 18]); expect(state.lights.rim.position).toEqual([22, 12, -40]);
  expect(state.lights.key.target).toEqual([0, 0, 0]); expect(state.lights.rim.target).toEqual([0, 0, 0]);
  expect(state.lights.count).toBe(3); expect(state.errors).toEqual([]);
}
function expectStudy(state: any) {
  expect([state.lights.hemi.color, state.lights.hemi.ground, state.lights.hemi.intensity]).toEqual([0xe4ecf0, 0x46515c, .62]);
  expect([state.lights.key.color, state.lights.key.intensity]).toEqual([0xfff5e8, .82]);
  expect([state.lights.rim.color, state.lights.rim.intensity]).toEqual([0xc6d8e5, .34]);
  for (const [light, offset] of [[state.lights.key, [-4, 5, 7]], [state.lights.rim, [5, 2, -4]]] as const) {
    for (let index = 0; index < 3; index++) { expect(light.cameraOffset[index]).toBeCloseTo(offset[index], 6); expect(light.worldTarget[index]).toBeCloseTo(state.target[index], 6); }
    const length = Math.hypot(...offset);
    for (let index = 0; index < 3; index++) expect(light.cameraDirection[index]).toBeCloseTo(offset[index] / length, 6);
    expect([...light.position, ...light.worldPosition, ...light.worldTarget, ...light.cameraDirection].every(Number.isFinite)).toBe(true);
  }
  expect(state.lights.count).toBe(3); expect(state.pose.serial).toBe(13); expect(state.pose.paused).toBe(true); expect(state.errors).toEqual([]);
}
function expectFixedPool(state: any, reference: any) {
  expect(state.pool).toEqual(reference.pool); expect(state.lights.identities).toEqual(reference.lights.identities);
  for (const id of ['key', 'rim']) {
    expect(state.lights[id].uuid).toBe(reference.lights[id].uuid); expect(state.lights[id].targetUuid).toBe(reference.lights[id].targetUuid);
    expect(state.lights[id].shadow).toEqual(reference.lights[id].shadow);
  }
  expect(state.lights.hemi.uuid).toBe(reference.lights.hemi.uuid);
}
async function capture(page: Page, name: string) { await stage(page).screenshot({ path: join(report, name + '.png') }); }
async function toggleStudy(page: Page, touch: boolean) {
  await activate(page, stage(page).getByRole('button', { name: 'Study view', exact: true }), touch);
}

const review = (page: Page) => context(page).locator('[data-study-action="review-marked-comparison"]');
const comparison = (page: Page) => page.locator('#migration-marked-comparison-controls');
const comparisonCheck = (page: Page) => comparison(page).locator('[data-marked-pose-action="check"]');
const continueNote = (page: Page) => comparison(page).locator('[data-study-scene-action="continue-comparison-note"]');
async function selection(page: Page) {
  return note(page).evaluate((element: HTMLTextAreaElement) => [element.selectionStart, element.selectionEnd, element.selectionDirection]);
}
function expectPrimary(state: any, insect: boolean) {
  if (insect) { expect(state.primary).toEqual([]); return; }
  expect(state.primary).toHaveLength(2);
  expect(state.primary[0].geometry).toBe(state.primary[1].geometry);
  expect(state.primary[0].material).toBe(state.primary[1].material);
  expect(state.primary[0].identities).toEqual(state.primary[1].identities);
  expect(state.primary.map((side: any) => side.scaleX)).toEqual([-1, 1]);
  for (const mesh of state.primary) {
    expect(mesh.name).toBe('migration-primary-feathers');
    expect(mesh.vertices).toBe(35); expect(mesh.normalCount).toBe(35); expect(mesh.indexCount).toBe(105);
    expect([...mesh.positions, ...mesh.normals, ...mesh.colors].every(Number.isFinite)).toBe(true);
    expect(mesh.colors.every((value: number) => value >= 0 && value <= 1)).toBe(true);
    expect(mesh.indices.every((value: number) => Number.isInteger(value) && value >= 0 && value < mesh.vertices)).toBe(true);
    expect(mesh.triangleAreas).toHaveLength(35);
    expect(Math.min(...mesh.triangleAreas)).toBeGreaterThan(1e-6);
    expect(Math.max(...mesh.triangleFacing)).toBeLessThan(-1e-6);
    expect(Math.min(...mesh.normalLengths)).toBeGreaterThan(.9999);
    expect(Math.max(...mesh.normalLengths)).toBeLessThan(1.0001);
    for (const feather of mesh.ridges) for (const ridge of feather) {
      expect(ridge.lift).toBeGreaterThan(.02); expect(ridge.lift).toBeLessThan(.04);
    }
  }
}
function expectSceneFixed(state: any, reference: any) {
  expectFixedPool(state, reference);
  expect(state.primary).toEqual(reference.primary);
  expect(state.studyRadius).toBe(reference.studyRadius);
}

const strip = (page: Page) => page.locator('[data-scene-study-actions="true"]');
const breakdown = (page: Page) => comparison(page).locator('[data-marked-comparison-breakdown]');
const viewRow = (page: Page) => breakdown(page).locator('[data-marked-comparison-variable="view"]');
const wingRow = (page: Page) => breakdown(page).locator('[data-marked-comparison-variable="wing"]');
const baselineMonarch = JSON.parse(readFileSync(join(process.cwd(),
  'reports/migration-deep-review-round25-2026-10-21/mobile-dark-monarch-primary-relief.json'), 'utf8')).views.find((entry: any) => entry.id === 'above').state;
const formatView = (prefix: string, view: any) => prefix + ': ' + view.yaw + '° / ' + view.pitch + '° · ' + Math.round(view.zoom * 100) + '%';

async function expectBreakdown(page: Page, kind: string, marked: any, current: any) {
  await expect(breakdown(page)).toHaveAttribute('data-marked-comparison-breakdown', kind);
  const viewResult = kind === 'view-only' || kind === 'both' ? 'changed' : 'matches';
  const wingResult = kind === 'wing-only' || kind === 'both' ? 'changed' : 'matches';
  await expect(viewRow(page)).toHaveAttribute('data-comparison-result', viewResult);
  await expect(wingRow(page)).toHaveAttribute('data-comparison-result', wingResult);
  await expect(viewRow(page).locator('dt')).toHaveText('Selected view settings');
  await expect(viewRow(page).locator('[data-marked-comparison-order="true"]')).toHaveText('Study angle / elevation · zoom');
  await expect(wingRow(page).locator('dt')).toHaveText('Wing-cycle position');
  await expect(viewRow(page).locator('[data-marked-comparison-result="view"]')).toHaveText(viewResult === 'changed' ? 'Changed' : 'Matches');
  await expect(wingRow(page).locator('[data-marked-comparison-result="wing"]')).toHaveText(wingResult === 'changed' ? 'Changed' : 'Matches');
  await expect(viewRow(page).locator('[data-marked-comparison-value="marked-view"]')).toHaveText(formatView('Marked', marked));
  await expect(viewRow(page).locator('[data-marked-comparison-value="current-view"]')).toHaveText(formatView('Current', current));
  await expect(breakdown(page).locator('input,button,textarea,select')).toHaveCount(0);
  const layout = await breakdown(page).evaluate(element => {
    const r = element.getBoundingClientRect();
    return { width: r.width, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth,
      rows: Array.from(element.querySelectorAll('[data-marked-comparison-variable]')).map(row => {
        const box = row.getBoundingClientRect();
        return { width: box.width, scrollWidth: row.scrollWidth, clientWidth: row.clientWidth };
      }), text: element.textContent };
  });
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
  for (const row of layout.rows) expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
  return layout;
}

async function checkedState(page: Page, kind: string, marked: any, current: any, touch: boolean) {
  const before = await saved(page), beforeScene = await renderState(page);
  await activate(page, comparisonCheck(page), touch);
  const layout = await expectBreakdown(page, kind, marked, current);
  expect(await saved(page)).toEqual(before);
  const afterScene = await renderState(page);
  expect(afterScene.pose).toEqual(beforeScene.pose); expect(afterScene.view).toEqual(beforeScene.view);
  expectSceneFixed(afterScene, beforeScene);
  return { kind, marked, current, layout, before, beforeScene, afterScene };
}

async function identityLayout(page: Page, id: string, name: string, cycleIndex: number | null) {
  await expect(stage(page).locator('.migration-flight-badge')).toHaveCount(0);
  await expect(strip(page)).toBeVisible();
  await expect(strip(page).locator('[data-scene-study-species="' + id + '"]')).toContainText(name);
  await expect(strip(page).locator('[data-scene-study-individual="0"]')).toContainText(id === 'canada_goose' ? 'Lead bird isolated for study' : 'Individual 1');
  await expect(strip(page).locator('[data-scene-study-cycle]')).toHaveAttribute('data-scene-study-cycle', cycleIndex === null ? 'none' : String(cycleIndex));
  const layout = await page.evaluate(() => {
    const scene = document.querySelector('.migration-flight-stage')!, strip = document.querySelector('[data-scene-study-actions="true"]')!;
    const route = scene.querySelector('.migration-flight-route')!, tools = scene.querySelector('.migration-scene-tools')!;
    const rect = (node: Element) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    return { stage: rect(scene), strip: rect(strip), route: rect(route), tools: rect(tools), viewportWidth: innerWidth,
      stripClientWidth: strip.clientWidth, stripScrollWidth: strip.scrollWidth,
      buttons: Array.from(strip.querySelectorAll('button')).map(rect), badgeCount: scene.querySelectorAll('.migration-flight-badge').length };
  });
  expect(layout.strip.y).toBeGreaterThanOrEqual(layout.stage.bottom - 1);
  expect(layout.strip.width).toBeLessThanOrEqual(layout.stage.width + 1);
  expect(layout.stripScrollWidth).toBeLessThanOrEqual(layout.stripClientWidth);
  expect(layout.route.bottom).toBeLessThanOrEqual(layout.stage.bottom + 1);
  expect(layout.route.bottom).toBeGreaterThanOrEqual(layout.stage.bottom - 25);
  expect(layout.tools.right).toBeLessThanOrEqual(layout.stage.right + 1);
  for (const button of layout.buttons) expect(button.height).toBeGreaterThanOrEqual(44);
  return layout;
}

async function learningFlow(page: Page, touch: boolean, stem: string) {
  const markedView = { yaw: 35, pitch: 15, zoom: 1 }, frontView = { yaw: 180, pitch: 10, zoom: 1 };
  await expect(breakdown(page)).toHaveCount(0);
  await activate(page, cycle(page, 2), touch);
  await activate(page, comparison(page).locator('[data-marked-pose-action="mark"]'), touch);
  const field = await note(page).elementHandle();
  await note(page).focus();
  await note(page).evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(4, 17, 'backward'));
  const caret = await selection(page), text = await note(page).inputValue(), beforeNavigation = await saved(page);
  const beforeScene = await renderState(page);
  // Review only navigates. Check remains an explicit second activation.
  await activate(page, review(page), touch);
  await expect(comparisonCheck(page)).toBeFocused();
  await expect(breakdown(page)).toHaveCount(0); await expect(checkedCue(page)).toHaveCount(0);
  expect(await saved(page)).toEqual(beforeNavigation);
  const results: any[] = [];
  results.push(await checkedState(page, 'same', markedView, markedView, touch));
  await activate(page, continueNote(page), touch);
  await expect(note(page)).toBeFocused(); expect(await selection(page)).toEqual(caret);
  expect(await field!.evaluate(element => element === document.querySelector('#migration-study-observation-note'))).toBe(true);
  await expect(note(page)).toHaveValue(text); expect(await saved(page)).toEqual(beforeNavigation);

  await activate(page, viewpoint(page, 'front'), touch);
  await expect(breakdown(page)).toHaveCount(0);
  results.push(await checkedState(page, 'view-only', markedView, frontView, touch));

  await activate(page, page.getByRole('button', { name: 'Reset study view', exact: true }), touch);
  await expect(breakdown(page)).toHaveCount(0);
  await activate(page, page.locator('[data-scene-study-action="opposite"]'), touch);
  results.push(await checkedState(page, 'wing-only', markedView, markedView, touch));

  await activate(page, viewpoint(page, 'front'), touch);
  await expect(breakdown(page)).toHaveCount(0);
  results.push(await checkedState(page, 'both', markedView, frontView, touch));
  await breakdown(page).screenshot({ path: join(report, stem + '-checked-breakdown.png') });
  const checkedData = await saved(page);
  await activate(page, continueNote(page), touch);
  await expect(note(page)).toBeFocused(); expect(await selection(page)).toEqual(caret);
  await expect(note(page)).toHaveValue(text); expect(await saved(page)).toEqual(checkedData);
  expect(work(checkedData)).toEqual(work(beforeNavigation));
  if (touch) await context(page).screenshot({ path: join(report, stem + '-comparison-note-return.png') });

  await activate(page, comparison(page).locator('[data-marked-pose-action="clear"]'), touch);
  await expect(breakdown(page)).toHaveCount(0);
  // Align the reference pose with round25's cycle7 model views.
  await activate(page, comparison(page).locator('[data-marked-pose-action="mark"]'), touch);
  const afterScene = await renderState(page);
  expectSceneFixed(afterScene, beforeScene);
  return { results, caret, text, beforeNavigation, checkedData, after: await saved(page), beforeScene, afterScene,
    navigationRequiredExplicitCheck: true, draftAndRecordPreserved: true };
}

async function noActivitiesLayout(page: Page, id: string, name: string, touch: boolean, stem: string) {
  // A manual step explicitly leaves numbered-position selection before guides
  // are hidden, so this check observes layout rather than cancelling a cycle intent.
  await activate(page, page.getByRole('button', { name: 'Step wingbeat', exact: true }), touch);
  const before = await saved(page), beforeScene = await renderState(page);
  await page.getByRole('checkbox', { name: 'Show wingtip path', exact: true }).uncheck();
  await frames(page);
  const observation = page.locator('[data-study-observation]');
  await activate(page, observation.locator('summary'), touch);
  await expect(observation).toHaveJSProperty('open', false);
  await expect(strip(page).locator('.migration-study-scene-buttons')).toHaveCount(0);
  const layout = await identityLayout(page, id, name, null);
  const after = await saved(page), afterScene = await renderState(page);
  expect(after.flightShowWingtipPath).toBe(false); expect(after.flightStudyObservationOpen).toBe(false);
  expect(work(after)).toEqual(work(before)); expect(afterScene.pose).toEqual(beforeScene.pose);
  expect(afterScene.view).toEqual(beforeScene.view); expectSceneFixed(afterScene, beforeScene);
  if (id === 'peregrine') await strip(page).screenshot({ path: join(report, stem + '-identity-activities-off.png') });
  return { before, after, beforeScene, afterScene, layout };
}

async function fullscreenFallbackLayout(page: Page) {
  const before = await saved(page), beforeScene = await renderState(page), deck = page.locator('.migration-flight-deck');
  let initial: any, scrolled: any;
  try {
    // Exercise the supported in-page fallback layout, without claiming OS fullscreen.
    await deck.evaluate(element => {
      element.setAttribute('data-allo-fullscreen-active', 'true');
      (element.querySelector('.migration-flight-view') as HTMLElement).scrollTop = 0;
    });
    await frames(page);
    await page.waitForFunction(() => Math.abs(document.querySelector('.migration-flight-stage')!.getBoundingClientRect().height - innerHeight) < 1);
    initial = await deck.evaluate(element => {
      const view = element.querySelector('.migration-flight-view') as HTMLElement;
      const scene = element.querySelector('.migration-flight-stage')!, footer = element.querySelector('[data-scene-study-actions="true"]')!;
      const rect = (node: Element) => { const r = node.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
      return { deck: rect(element), view: rect(view), stage: rect(scene), strip: rect(footer), viewportHeight: innerHeight,
        scrollHeight: view.scrollHeight, clientHeight: view.clientHeight, overflowY: getComputedStyle(view).overflowY };
    });
    expect(initial.deck.height).toBeCloseTo(initial.viewportHeight, 1);
    expect(initial.stage.height).toBeCloseTo(initial.viewportHeight, 1);
    expect(initial.scrollHeight).toBeGreaterThan(initial.clientHeight);
    expect(initial.overflowY).toBe('auto');
    await deck.evaluate(element => { const view = element.querySelector('.migration-flight-view') as HTMLElement; view.scrollTop = view.scrollHeight; });
    await frames(page);
    scrolled = await deck.evaluate(element => {
      const view = element.querySelector('.migration-flight-view') as HTMLElement, footer = element.querySelector('[data-scene-study-actions="true"]')!;
      const rect = (node: Element) => { const r = node.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
      return { view: rect(view), strip: rect(footer), scrollTop: view.scrollTop };
    });
    expect(scrolled.scrollTop).toBeGreaterThan(0);
    expect(scrolled.strip.top).toBeGreaterThanOrEqual(scrolled.view.top - 1);
    expect(scrolled.strip.bottom).toBeLessThanOrEqual(scrolled.view.bottom + 1);
    await strip(page).screenshot({ path: join(report, 'desktop-goose-identity-fullscreen-fallback.png') });
    expect(await saved(page)).toEqual(before);
  } finally {
    await deck.evaluate(element => {
      element.removeAttribute('data-allo-fullscreen-active');
      (element.querySelector('.migration-flight-view') as HTMLElement).scrollTop = 0;
    });
    await frames(page);
  }
  await page.waitForFunction(() => Math.abs(document.querySelector('.migration-flight-stage')!.getBoundingClientRect().height - 678) < 1);
  const afterScene = await renderState(page);
  expect(afterScene.pose).toEqual(beforeScene.pose); expect(afterScene.view).toEqual(beforeScene.view);
  expectSceneFixed(afterScene, beforeScene); expect(await saved(page)).toEqual(before);
  return { mode: 'in-page fullscreen fallback layout', initial, scrolled, beforeScene, afterScene };
}

async function formerlyCoveredWing(page: Page) {
  return page.evaluate(() => {
    const w = window as any, rec = w.__glCanvas()?.rec, scene = rec?.scene, camera = rec?.camera, THREE = w.THREE;
    const flock = scene.getObjectByName('migration-flock'), bird = flock.children[0];
    const rect = rec.canvas.getBoundingClientRect();
    const points: number[][] = [];
    bird.traverse((part: any) => {
      if (part.name !== 'migration-monarch-forewing' || !part.geometry?.attributes.position) return;
      const positions = part.geometry.attributes.position;
      const point = new THREE.Vector3();
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(part.matrixWorld).project(camera);
        if (point.z < -1 || point.z > 1) continue;
        const x = (point.x + 1) * rect.width / 2, y = (1 - point.y) * rect.height / 2;
        if (x >= 12 && x <= 217 && y >= 12 && y <= 84) points.push([x, y, point.z]);
      }
    });
    return { formerBadgeCssRectangle: { left: 12, top: 12, right: 217, bottom: 84 }, projectedForewingPoints: points,
      inCanvasBadgeCount: document.querySelector('.migration-flight-stage')!.querySelectorAll('.migration-flight-badge').length };
  });
}

async function identityFlow(page: Page, id: string, name: string, region: string, dark: boolean, touch: boolean) {
  const stem = touch ? 'mobile-' + (dark ? 'dark-monarch' : 'light-peregrine') : 'desktop-goose';
  await mount(page, id, region, dark);
  await expect(stage(page).locator('.migration-flight-badge')).toHaveCount(1);
  await expect(strip(page)).toHaveCount(0);
  const corridor = await renderState(page), initialData = await saved(page);
  expectCorridor(corridor, dark);
  await toggleStudy(page, touch);
  const initialStudy = await renderState(page);
  expectStudy(initialStudy); expectSceneFixed(initialStudy, corridor); expect(initialStudy.pose).toEqual(corridor.pose);
  const initialLayout = await identityLayout(page, id, name, null);
  const learning = await learningFlow(page, touch, stem);
  await activate(page, viewpoint(page, 'above'), touch);
  const above = await renderState(page);
  expectStudy(above); expectSceneFixed(above, corridor); expectPrimary(above, id === 'monarch');
  const aboveLayout = await identityLayout(page, id, name, 6);
  await capture(page, id === 'monarch' ? 'mobile-dark-monarch-matched-above' : stem + '-study-above');
  if (id !== 'peregrine') await strip(page).screenshot({ path: join(report, stem + '-study-identity.png') });
  let matchedBaseline: any = null;
  if (id === 'monarch') {
    // The baseline is JSON: it stores IEEE-754 -0 as0. Serialize the live
    // snapshot the same way; all other finite numeric values remain exact.
    const serializedAbove = JSON.parse(JSON.stringify(above));
    for (const key of ['body', 'flock', 'allBodies', 'joints', 'phase', 'serial', 'paused']) expect(serializedAbove.pose[key]).toEqual(baselineMonarch.pose[key]);
    expect(serializedAbove.view).toEqual(baselineMonarch.view); expect(above.canvas).toEqual(baselineMonarch.canvas);
    for (const light of ['key', 'rim']) for (const key of ['color', 'intensity', 'worldPosition', 'worldTarget', 'cameraOffset', 'cameraDirection']) expect(serializedAbove.lights[light][key]).toEqual(baselineMonarch.lights[light][key]);
    const coverage = await formerlyCoveredWing(page);
    expect(coverage.projectedForewingPoints.length).toBeGreaterThan(0);
    expect(coverage.inCanvasBadgeCount).toBe(0);
    matchedBaseline = { source: 'round25 verified views.above state', above, coverage };
  }
  const activitiesOff = await noActivitiesLayout(page, id, name, touch, stem);
  const fullscreen = touch ? null : await fullscreenFallbackLayout(page);
  const beforeCamera = await saved(page), beforeCameraScene = await renderState(page);
  await toggleStudy(page, touch);
  await expect(stage(page).locator('.migration-flight-badge')).toHaveCount(1); await expect(strip(page)).toHaveCount(0);
  await toggleStudy(page, touch);
  await identityLayout(page, id, name, null);
  const finalStudy = await renderState(page), finalData = await saved(page);
  expect(finalData).toEqual(beforeCamera);
  expect(finalStudy.pose).toEqual(beforeCameraScene.pose); expect(finalStudy.view).toEqual(beforeCameraScene.view);
  expectSceneFixed(finalStudy, corridor); expect(work(finalData)).toEqual(work(initialData));
  await page.addScriptTag({ content: axeSource });
  const accessibility = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, errors: (window as any).__events.errors,
      violations: result.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) })) };
  });
  expect(accessibility.scrollWidth).toBe(accessibility.width); expect(accessibility.violations).toEqual([]);
  expect(accessibility.errors).toEqual([]); expect(failures.get(page)).toEqual([]);
  await writeFile(join(report, stem + '-study-identity.json'), JSON.stringify({ initialData, corridor, initialStudy, initialLayout,
    learning, above, aboveLayout, matchedBaseline, activitiesOff, fullscreen, finalStudy, finalData, accessibility }, null, 2));
}

test('Keyboard learners inspect an unobstructed Study canvas and separate the two checked comparison variables', async ({ page }) => {
  await identityFlow(page, 'canada_goose', 'Canada Goose', 'primaries', false, false);
});
test.describe('Migration Study identity phone light Peregrine round26', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Touch learners retain species context with activities closed and read the explicit two-axis comparison', async ({ page }) => {
    await identityFlow(page, 'peregrine', 'Peregrine Falcon', 'primaries', false, true);
  });
});
test.describe('Migration Study identity phone dark Monarch round26', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Touch learners see the formerly covered forewing at the same camera and return to their own whole-insect note', async ({ page }) => {
    await identityFlow(page, 'monarch', 'Monarch Butterfly', 'whole-wing', true, true);
  });
});
