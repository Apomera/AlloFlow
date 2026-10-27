import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ retries: 0, timeout: 120_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round25-2026-10-21');
const axeSource = readFileSync(join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8');
if (process.env.STEM_GL_SUBSTITUTE || process.env.MIG_TOOL_FILE) throw new Error('Canonical relief checks reject source substitutions');
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
      timer = setTimeout(() => reject(new Error('Round25 scene cleanup exceeded 20 seconds')), 20_000);
    })]);
  } finally { if (timer) clearTimeout(timer); }
});

const stage = (page: Page) => page.locator('.migration-flight-stage');
const context = (page: Page) => page.locator("[data-migration-id=\"migration-study-current-context\"]");
const note = (page: Page) => page.getByRole('textbox', { name: 'My observation', exact: true });
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
    const identityMap = w.__relief25Ids || (w.__relief25Ids = new WeakMap());
    const identity = (object: object) => { if (!identityMap.has(object)) identityMap.set(object, w.__relief25Next = (w.__relief25Next || 0) + 1); return identityMap.get(object); };
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
const comparison = (page: Page) => page.locator("[data-migration-id=\"migration-marked-comparison-controls\"]");
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
async function comparisonRoundTrip(page: Page, touch: boolean, stem: string) {
  await expect(review(page)).toHaveCount(0);
  await activate(page, cycle(page, 2), touch);
  await activate(page, comparison(page).locator('[data-marked-pose-action="mark"]'), touch);
  await activate(page, page.locator('[data-scene-study-action="opposite"]'), touch);
  await expect(review(page)).toBeVisible();
  await expect(checkedCue(page)).toHaveCount(0);

  const field = await note(page).elementHandle();
  await note(page).focus();
  await note(page).evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(4, 17, 'backward'));
  const caret = await selection(page), beforeText = await note(page).inputValue();
  const before = await saved(page), beforeScene = await renderState(page);
  const cardState = () => comparison(page).locator('[data-marked-comparison-check]');
  await expect(cardState()).toHaveCount(0);

  // Enter/tap here navigates only. A second explicit activation is required to
  // perform the existing comparison check, even though focus moves onto it.
  await activate(page, review(page), touch);
  await expect(comparisonCheck(page)).toBeFocused();
  await expect(cardState()).toHaveCount(0); await expect(checkedCue(page)).toHaveCount(0);
  expect(await saved(page)).toEqual(before);
  const navigated = await renderState(page);
  expect(navigated.pose).toEqual(beforeScene.pose); expect(navigated.view).toEqual(beforeScene.view);
  expectSceneFixed(navigated, beforeScene); expect(await selection(page)).toEqual(caret);
  await activate(page, comparisonCheck(page), touch);
  await expect(checkedCue(page)).toHaveAttribute('data-study-checked-comparison', 'wing-only');
  await expect(continueNote(page)).toBeVisible();
  await activate(page, continueNote(page), touch);
  await expect(note(page)).toBeFocused();
  expect(await field!.evaluate(element => element === document.querySelector("[data-migration-id=\"migration-study-observation-note\"]"))).toBe(true);
  expect(await selection(page)).toEqual(caret); await expect(note(page)).toHaveValue(beforeText);
  expect(await saved(page)).toEqual(before);
  const returned = await renderState(page);
  expect(returned.pose).toEqual(beforeScene.pose); expect(returned.view).toEqual(beforeScene.view);
  expectSceneFixed(returned, beforeScene);
  await context(page).screenshot({ path: join(report, stem + '-comparison-note-return.png') });

  // A changed view invalidates the old result while the review route remains
  // useful. Navigation must not silently renew that result.
  await activate(page, viewpoint(page, 'front'), touch);
  await expect(checkedCue(page)).toHaveCount(0); await expect(review(page)).toBeVisible();
  const beforeRecheck = await saved(page);
  await activate(page, review(page), touch);
  await expect(comparisonCheck(page)).toBeFocused();
  await expect(checkedCue(page)).toHaveCount(0); expect(await saved(page)).toEqual(beforeRecheck);
  await activate(page, comparisonCheck(page), touch);
  await expect(checkedCue(page)).toHaveAttribute('data-study-checked-comparison', 'both');
  await activate(page, continueNote(page), touch);
  await expect(note(page)).toBeFocused(); expect(await selection(page)).toEqual(caret);
  await expect(note(page)).toHaveValue(beforeText);
  expect(await saved(page)).toEqual(beforeRecheck);

  await activate(page, comparison(page).locator('[data-marked-pose-action="clear"]'), touch);
  await expect(review(page)).toHaveCount(0); await expect(checkedCue(page)).toHaveCount(0);
  expect(work(await saved(page))).toEqual(work(before));
  await activate(page, comparison(page).locator('[data-marked-pose-action="mark"]'), touch);
  await expect(review(page)).toBeVisible();
  return { before, beforeText, selection: caret, navigated, returned, beforeRecheck, after: await saved(page),
    reviewTarget: 'existing Check what changed button', navigationDidNotCheck: true, draftAndRecordPreserved: true };
}

async function reliefFlow(page: Page, id: string, region: string, dark: boolean, touch: boolean) {
  const stem = touch ? 'mobile-' + (dark ? 'dark-monarch' : 'light-peregrine') : 'desktop-goose';
  await mount(page, id, region, dark);
  const corridor = await renderState(page); expectCorridor(corridor, dark); expectPrimary(corridor, id === 'monarch');
  const initialData = await saved(page);
  await toggleStudy(page, touch);
  await expect(stage(page)).toHaveAttribute('data-study-view', 'true');
  const initialStudy = await renderState(page);
  expectStudy(initialStudy); expectSceneFixed(initialStudy, corridor);
  expect(initialStudy.pose).toEqual(corridor.pose);
  expect(initialStudy.path.available).toBe(true); expect(initialStudy.path.buildVersion).toBeGreaterThan(0);
  expect(initialStudy.path.sampleCount).toBe(64);
  expect(work(await saved(page))).toEqual(work(initialData));
  const learning = await comparisonRoundTrip(page, touch, stem);
  const fixed = await renderState(page);
  expect(fixed.marked.captured).toBe(true); expect(fixed.marked.vertexCount).toBeGreaterThan(0);
  expect(fixed.marked.drawCount).toBe(fixed.marked.vertexCount);
  expect(fixed.marked.drawCount).toBeLessThanOrEqual(fixed.marked.capacity); expect(fixed.marked.finite).toBe(true);
  const views: any[] = [];
  for (const view of ['front', 'profile', 'above']) {
    await activate(page, viewpoint(page, view), touch);
    const state = await renderState(page); expectStudy(state); expectPrimary(state, id === 'monarch'); expectSceneFixed(state, corridor);
    expect(state.pose).toEqual(fixed.pose);
    if (id !== 'monarch' || view !== 'front') await capture(page, stem + '-primary-relief-' + view);
    views.push({ id: view, state });
  }
  let matchedPhone: any = null;
  if (!touch) {
    await activate(page, page.getByRole('button', { name: 'Reset study view', exact: true }));
    await activate(page, cycle(page, 2));
    const followLeft = page.getByRole('button', { name: 'Individual’s left: solid path', exact: true });
    if (await followLeft.getAttribute('aria-pressed') !== 'true') await activate(page, followLeft);
    await activate(page, page.locator('[data-study-region="primaries"]'));
    // The visual baseline marked cycle3; recapture that same reference after
    // the learning flow has intentionally changed and replaced the mark.
    await activate(page, comparison(page).locator('[data-marked-pose-action="mark"]'));
    const beforeResize = await saved(page);
    await setTheme(page, true); await page.setViewportSize({ width: 390, height: 844 }); await frames(page);
    matchedPhone = await renderState(page);
    expectStudy(matchedPhone); expectPrimary(matchedPhone, false); expectSceneFixed(matchedPhone, corridor);
    expect(matchedPhone.canvas).toEqual({ width: 388, height: 390 });
    expect(matchedPhone.marked.capturedPhase).toBeCloseTo(matchedPhone.pose.phase, 10);
    expect((await saved(page)).flightStudyYaw).toBe(35); expect((await saved(page)).flightStudyPitch).toBe(15);
    expect((await saved(page)).flightStudyZoom).toBe(1); expect(await saved(page)).toEqual(beforeResize);
    await capture(page, 'mobile-dark-goose-matched-baseline');
    await page.setViewportSize({ width: 1440, height: 1000 }); await setTheme(page, dark); await frames(page);
  }
  if (id === 'monarch') {
    await expect(context(page).locator('[data-study-context-region]')).toHaveAttribute('data-study-context-region', 'whole-wing');
    await expect(page.locator('[data-study-anatomy-focus]')).toHaveCount(0);
    await expect(note(page)).toHaveValue('My prediction before observing monarch.');
  }
  const finalStudy = await renderState(page), finalData = await saved(page);
  expectSceneFixed(finalStudy, corridor); expectPrimary(finalStudy, id === 'monarch');
  expect(work(finalData)).toEqual(work(initialData));
  await page.addScriptTag({ content: axeSource });
  const accessibility = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, errors: (window as any).__events.errors,
      violations: result.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) })) };
  });
  expect(accessibility.scrollWidth).toBe(accessibility.width); expect(accessibility.violations).toEqual([]);
  expect(accessibility.errors).toEqual([]); expect(failures.get(page)).toEqual([]);
  await writeFile(join(report, stem + '-primary-relief.json'), JSON.stringify({ initialData, corridor, initialStudy, learning, views,
    matchedPhone, finalStudy, finalData, accessibility }, null, 2));
}

test('Keyboard learners inspect primary relief and explicitly check comparisons before returning to their own note', async ({ page }) => {
  await reliefFlow(page, 'canada_goose', 'primaries', false, false);
});
test.describe('Migration primary relief phone light Peregrine round25', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Touch learners inspect mirrored feather relief and navigate comparison controls without changing their evidence', async ({ page }) => {
    await reliefFlow(page, 'peregrine', 'primaries', false, true);
  });
});
test.describe('Migration comparison navigation phone dark Monarch round25', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Touch learners review an explicit whole-insect comparison and return to the same authored note', async ({ page }) => {
    await reliefFlow(page, 'monarch', 'whole-wing', true, true);
  });
});
