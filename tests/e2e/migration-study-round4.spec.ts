import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

// These checks inspect the camera and scene actually submitted by the tool.
// Parent runs this file with the other migration checks in one browser worker.
test.describe.configure({ mode: 'serial', retries: 0, timeout: 150_000 });
const report = process.env.MIGRATION_REPORT_DIR ? join(process.env.MIGRATION_REPORT_DIR, 'round4') : join(process.cwd(), 'reports/migration-deep-review-round4-2026-10-18');
const axeSource = readFileSync(join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8');
const harness = new GlHarness({
  toolFile: process.env.MIG_TOOL_FILE || 'stem_lab/stem_tool_migration.js', toolId: 'migration',
  width: 1100, height: 900, layout: 'document', appStyles: true,
  probes: `var vp=document.createElement('meta');vp.name='viewport';vp.content='width=device-width,initial-scale=1';document.head.appendChild(vp);document.querySelector('#wrap').style.width='min(100vw,1100px)';document.body.style.fontFamily='system-ui,sans-serif';document.body.style.background='#f8fafc';`
});

test.beforeAll(async () => { await mkdir(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function frames(page: Page, count = 3) {
  const start = await page.evaluate(() => (window as any).__glScene()?.renders || 0);
  await page.waitForFunction(({ start, count }) => ((window as any).__glScene()?.renders || 0) >= start + count,
    { start, count }, { timeout: 60_000 });
}

async function mount(page: Page, seed: Record<string, unknown> = {}) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { migration: { tab: 'flight3d', flightCamera: 'study', flightPaused: true, ...seed } },
    'document.querySelector(".migration-flight-stage")?.getAttribute("data-flight-ready")==="true"');
  expect(await harness.glScene(page)).toMatchObject({ hasScene: true });
  await page.evaluate(() => {
    const record = (window as any).__glCanvas()?.rec;
    const previous = record.scene.onBeforeRender;
    record.scene.onBeforeRender = function(renderer: any, scene: any, camera: any, ...rest: any[]) {
      record.camera = camera;
      if (previous) previous.call(this, renderer, scene, camera, ...rest);
    };
  });
  await frames(page, 2);
}

async function sceneView(page: Page) {
  return page.evaluate(() => {
    const record = (window as any).__glCanvas()?.rec;
    const scene = record?.scene, camera = record?.camera, THREE = (window as any).THREE;
    const flock = scene?.getObjectByName('migration-flock');
    if (!flock || !camera) return null;
    const bird = flock.children.find((candidate: any) => candidate.visible);
    const target = new THREE.Vector3(); bird.getWorldPosition(target);
    const offset = camera.position.clone().sub(target).normalize();
    const facing = new THREE.Vector3(); camera.getWorldDirection(facing);
    const targetAngle = facing.angleTo(target.clone().sub(camera.position).normalize());
    // Project the drawn model vertices. A world-aligned Box3 creates imaginary
    // corners beyond a long bill/wing silhouette when the view is oblique.
    let maxNdc = 0, minDepth = Infinity, maxDepth = -Infinity;
    const projected = new THREE.Vector3();
    bird.updateMatrixWorld(true);
    bird.traverse((part: any) => {
      const positions = part.geometry?.attributes?.position;
      if (!positions) return;
      for (let vertex = 0; vertex < positions.count; vertex++) {
        projected.fromBufferAttribute(positions, vertex).applyMatrix4(part.matrixWorld).project(camera);
        maxNdc = Math.max(maxNdc, Math.abs(projected.x), Math.abs(projected.y));
        minDepth = Math.min(minDepth, projected.z); maxDepth = Math.max(maxDepth, projected.z);
      }
    });
    function shown(object: any) { for (let cursor = object; cursor; cursor = cursor.parent) if (!cursor.visible) return false; return !!object; }
    const markers = scene.getObjectByName('migration-anatomy-markers');
    const anatomy = scene.getObjectByName('migration-anatomy-callouts');
    const anatomyPositions = anatomy?.geometry?.attributes?.position?.array;
    const anatomyDrawCount = anatomy?.geometry?.drawRange?.count || 0;
    const anatomySignature = anatomyPositions && Number.isFinite(anatomyDrawCount)
      ? Array.from(anatomyPositions.slice(0, anatomyDrawCount * 3), (coordinate: any) => Math.round(coordinate * 1e6)).join(',')
      : '';
    const rocks = scene.getObjectByName('migration-riverbank-rocks');
    return {
      selected: flock.children.indexOf(bird), visible: flock.children.filter((candidate: any) => candidate.visible).length,
      camera: camera.position.toArray(), target: target.toArray(), offset: offset.toArray(), targetAngle,
      maxNdc, minDepth, maxDepth, radius: bird.userData.studyRadius,
      wing: bird.userData.wings[0].rotation.z, flapAmount: bird.userData.flapAmount,
      markers: { visible: shown(markers), count: markers?.children.length || 0,
        names: (markers?.children || []).map((marker: any) => marker.name),
        numbers: (markers?.children || []).map((marker: any) => marker.userData.markerNumber),
        ids: (markers?.children || []).map((marker: any) => marker.userData.anatomyId),
        positions: (markers?.children || []).map((marker: any) => { const point = new THREE.Vector3(); marker.getWorldPosition(point); return point.toArray(); }) },
      anatomyVisible: shown(anatomy), anatomySignature,
      routeVisible: shown(scene.getObjectByName('migration-route-overlay')),
      sceneryVisible: shown(rocks)
    };
  });
}

async function studyHudClearance(page: Page) {
  return page.evaluate(() => {
    const record = (window as any).__glCanvas()?.rec;
    const scene = record?.scene, camera = record?.camera, THREE = (window as any).THREE;
    const stage = document.querySelector('.migration-flight-stage');
    const canvas = stage?.querySelector('canvas');
    if (!stage || !canvas || !scene || !camera) throw new Error('Submitted Study scene is unavailable');
    const viewport = canvas.getBoundingClientRect();
    function screenPoint(world: any) {
      const projected = world.clone().project(camera);
      return { x: viewport.left + (projected.x + 1) * viewport.width / 2,
        y: viewport.top + (1 - projected.y) * viewport.height / 2, depth: projected.z };
    }
    const hud = Array.from(stage.querySelectorAll('.migration-scene-tools button,.migration-flight-badge,.migration-flight-route')).flatMap(element => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height || getComputedStyle(element).visibility === 'hidden') return [];
      return [{ name: element.classList.contains('migration-flight-route') ? 'Route card'
        : element.classList.contains('migration-flight-badge') ? 'Species badge' : element.textContent?.trim() || 'Scene button',
      left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }];
    });
    const root = scene.getObjectByName('migration-anatomy-markers');
    const markers = (root?.visible ? root.children : []).filter((marker: any) => marker.visible).map((marker: any) => {
      const world = new THREE.Vector3(); marker.getWorldPosition(world);
      return { number: marker.userData.markerNumber, ...screenPoint(world) };
    });
    const markerOverlaps: unknown[] = [];
    for (const marker of markers) for (const panel of hud) {
      const dx = marker.x - Math.max(panel.left, Math.min(panel.right, marker.x));
      const dy = marker.y - Math.max(panel.top, Math.min(panel.bottom, marker.y));
      if (dx * dx + dy * dy <= 16 * 16) markerOverlaps.push({ marker: marker.number, panel: panel.name });
    }
    // Read actual submitted mesh vertices; a world-axis bounding box can cover
    // empty corners and cannot establish whether the model overlaps this HUD.
    const flock = scene.getObjectByName('migration-flock');
    const bird = flock?.children.find((candidate: any) => candidate.visible);
    const route = hud.find(panel => panel.name === 'Route card');
    const routeOverlapVertices: unknown[] = [];
    let vertexCount = 0;
    bird?.traverse((object: any) => {
      if (!object.isMesh || !object.visible) return;
      const positions = object.geometry?.attributes?.position;
      if (!positions) return;
      for (let index = 0; index < positions.count; index++) {
        const world = new THREE.Vector3().fromBufferAttribute(positions, index).applyMatrix4(object.matrixWorld);
        const point = screenPoint(world); vertexCount++;
        if (route && point.depth >= -1 && point.depth <= 1 && point.x >= route.left && point.x <= route.right
          && point.y >= route.top && point.y <= route.bottom) routeOverlapVertices.push({ mesh: object.name || object.type, vertex: index, ...point });
      }
    });
    return { viewport: { width: viewport.width, height: viewport.height }, hud, markers,
      markerRadius: 16, markerOverlaps, vertexCount, routeOverlapVertices };
  });
}

const presets = [
  { id: 'front', yaw: 180, pitch: 10 },
  { id: 'profile', yaw: 90, pitch: 10 },
  { id: 'above', yaw: 0, pitch: 60 }
];

async function inspectPresets(page: Page) {
  const measurements: unknown[] = [];
  for (const species of ['ruby_hummingbird', 'arctic_tern']) {
    await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption(species);
    for (const preset of presets) {
      const button = page.locator(`[data-study-viewpoint="${preset.id}"]`);
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('slider', { name: 'Study zoom percent', exact: true })).toHaveValue('100');
      await frames(page);
      const state = await sceneView(page);
      expect(state?.visible).toBe(1);
      expect(state?.targetAngle).toBeLessThan(0.025);
      const yaw = preset.yaw * Math.PI / 180, pitch = preset.pitch * Math.PI / 180;
      const expected = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
      state?.offset.forEach((coordinate: number, axis: number) => expect(coordinate).toBeCloseTo(expected[axis], 3));
      expect(state?.radius).toBeGreaterThan(0);
      expect(state?.maxNdc).toBeLessThan(0.98);
      expect(state?.maxNdc).toBeGreaterThan(0.2);
      expect(state?.minDepth).toBeGreaterThan(-1);
      expect(state?.maxDepth).toBeLessThan(1);
      expect(state?.routeVisible).toBe(false);
      expect(state?.sceneryVisible).toBe(false);
      measurements.push({ species, preset: preset.id, state });
    }
  }
  return measurements;
}

async function openChallenges(page: Page) {
  const root = page.locator('[data-migration-flight-challenges]');
  if (!(await root.evaluate(el => (el as HTMLDetailsElement).open))) await root.locator(':scope > summary').click();
  return root;
}

async function completeEvidenceReview(page: Page) {
  const root = await openChallenges(page);
  await root.locator('[data-flight-challenge="wind"]').click();
  const step = (id: string) => root.locator(`[data-mission-progress-step="${id}"]`);
  const prediction = root.getByRole('textbox', { name: 'My prediction: which control will I change, and why?', exact: true });
  const explanation = root.getByRole('textbox', { name: 'My explanation: what numbers or route changes support my claim?', exact: true });
  await prediction.fill('A tailwind should improve forward progress while Monarch airspeed stays fixed in this model.');
  await root.locator('[data-flight-challenge-action="load"]').click();
  const wind = page.getByRole('slider', { name: /Along-route wind in meters per second/ });
  await wind.fill('0');
  await root.locator('[data-flight-challenge-action="check"]').click();
  await expect(step('prediction')).toHaveAttribute('data-recorded', 'true');
  await expect(step('attempt')).toHaveAttribute('data-recorded', 'true');
  await expect(step('model')).toHaveAttribute('data-recorded', 'false');
  await expect(step('evidence')).toHaveAttribute('data-recorded', 'false');
  await wind.fill('4');
  await explanation.fill('Ground speed changed from 0 to 21 mph at +4 m/s. This is evidence from a fixed-airspeed teaching model, with no gusts or fatigue.');
  await expect(root.locator('[data-flight-challenge-feedback]')).toHaveAttribute('data-model-condition', 'met');
  // A live match and an unsaved explanation cannot claim saved evidence.
  await expect(step('model')).toHaveAttribute('data-recorded', 'false');
  await expect(step('evidence')).toHaveAttribute('data-recorded', 'false');
  await root.locator('[data-flight-challenge-action="check"]').click();
  for (const id of ['prediction', 'attempt', 'model', 'evidence']) await expect(step(id)).toHaveAttribute('data-recorded', 'true');
  await expect(root.locator('[data-flight-challenge="wind"]')).toHaveAttribute('data-evidence-steps', '4');
  const history = root.locator('[data-flight-challenge-history]');
  if (!(await history.evaluate(el => (el as HTMLDetailsElement).open))) await history.locator(':scope > summary').click();
  const comparisons = root.getByRole('region', { name: 'Saved challenge attempt comparisons', exact: true });
  await expect(comparisons).toBeVisible();
  await expect(comparisons.locator('caption')).toContainText('Saved flight comparisons');
  await expect(comparisons.getByRole('columnheader')).toHaveCount(5);
  await expect(comparisons.locator('[data-flight-challenge-review]')).toHaveCount(2);
  const matching = comparisons.locator('[data-flight-challenge-review="2"]');
  await expect(matching).toHaveAttribute('data-latest-model-match', 'true');
  await expect(matching).toContainText('Latest model match');
  await expect(matching).toContainText('Wind: -15 → +4 m/s');
  await expect(matching).toContainText('Explanation recorded');
  await expect(matching).toContainText('ungraded');
  return root;
}

test('Migration Study presets fit the submitted small and wide models and return focus to the scene', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(page, { flightStudyBird: 2, flightShowRoute: true });
  const evidence = await inspectPresets(page);
  await page.getByRole('button', { name: 'Focus 3D scene', exact: true }).click();
  await expect(page.locator('#migration-flight-stage')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('slider', { name: 'Study angle in degrees', exact: true })).toHaveValue('10');
  await page.getByRole('button', { name: 'Chase', exact: true }).click();
  await frames(page);
  expect((await sceneView(page))?.routeVisible).toBe(true);
  expect((await sceneView(page))?.sceneryVisible).toBe(true);
  await page.getByRole('button', { name: 'Study', exact: true }).click();
  await frames(page);
  await writeFile(join(report, 'desktop-study-fit.json'), JSON.stringify(evidence, null, 2));
  await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-study-fit.png') });
});

test('Migration numbered anatomy markers follow the chosen bird and rapid steps retain every wing advance', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(page, { flightStudyBird: 0, flightWingStep: 0, flightShowAnatomy: true });
  const before = await sceneView(page);
  expect(before?.markers).toMatchObject({ visible: true, count: 4, numbers: [1, 2, 3, 4], ids: ['head', 'inner-wing', 'primaries', 'tail'] });
  expect(before?.markers.names).toEqual([1, 2, 3, 4].map(number => `migration-anatomy-marker-${number}`));
  const step = page.getByRole('button', { name: 'Step wingbeat', exact: true });
  // Two native click events in one task leave no animation frame between them.
  await step.evaluate((element: HTMLButtonElement) => { element.click(); element.click(); });
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.migration.flightWingStep)).toBe(2);
  await frames(page);
  const stepped = await sceneView(page);
  expect(stepped?.wing).toBeCloseTo(stepped!.flapAmount, 5);
  expect(stepped?.markers.count).toBe(4);
  expect(stepped?.markers.positions).toEqual(before?.markers.positions);
  expect(stepped?.anatomySignature).not.toBe(before?.anatomySignature);
  expect(stepped?.target).toEqual(before?.target);
  await page.getByRole('combobox', { name: 'Study individual', exact: true }).selectOption('6');
  await frames(page);
  expect((await sceneView(page))?.selected).toBe(6);
  expect((await sceneView(page))?.markers.positions).not.toEqual(stepped?.markers.positions);
  await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-numbered-anatomy.png') });
  await page.getByRole('checkbox', { name: 'Show bird anatomy', exact: true }).uncheck();
  await frames(page);
  expect((await sceneView(page))?.markers.visible).toBe(false);
  expect((await sceneView(page))?.anatomyVisible).toBe(false);
  await page.getByRole('checkbox', { name: 'Show bird anatomy', exact: true }).check();
  await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption('monarch');
  await frames(page);
  expect((await sceneView(page))?.markers.visible).toBe(false);
  expect((await sceneView(page))?.anatomyVisible).toBe(false);
});

test('Migration playback tab order, recorded evidence progress, motion preferences and context-loss feedback remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(page);
  await page.getByRole('link', { name: /Start a flight investigation/ }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Resume flight', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Toggle fullscreen for the 3D migration flight deck', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('combobox', { name: '3D migration focus species', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Resume flight', exact: true }).click();
  await expect(page.locator('#migration-flight-stage')).toHaveAttribute('data-motion-reduced', 'true');
  await expect(page.locator('[data-flight-motion-note]')).toBeVisible();
  await expect(page.locator('.migration-flight-route-label')).toContainText('Motion reduced');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('#migration-flight-stage')).toHaveAttribute('data-motion-reduced', 'false');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('#migration-flight-stage')).toHaveAttribute('data-motion-reduced', 'true');
  await completeEvidenceReview(page);
  await page.screenshot({ path: join(report, 'desktop-flight-comparison-review.png'), fullPage: true });
  // Dispatch the actual canvas event without calling loseContext on the GPU.
  await page.locator('.migration-flight-stage canvas').evaluate(element => element.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(page.locator('#migration-flight-stage')).toHaveAttribute('data-flight-error', 'true');
  await expect(page.locator('.migration-flight-stage-status')).toBeVisible();
  await expect(page.locator('.migration-flight-stage-status')).toContainText('Switch tabs and return');
});

for (const dark of [false, true]) test.describe(`Migration phone ${dark ? 'dark' : 'light'} round4`, () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Study fit and saved evidence review stay accessible on a narrow viewport', async ({ page }) => {
    await mount(page, { flightShowAnatomy: true });
    if (dark) await page.evaluate(() => {
      (window as any).__ctx.isDark = true; (window as any).__ctx.theme = 'dark';
      document.documentElement.classList.add('dark'); document.body.style.background = '#0f172a';
      (window as any).__rerender();
    });
    const evidence = await inspectPresets(page);
    const name = `mobile-${dark ? 'dark' : 'light'}`;
    expect((await sceneView(page))?.markers.visible).toBe(true);
    const clearance = await studyHudClearance(page);
    await writeFile(join(report, `${name}-study-clearance.json`), JSON.stringify(clearance, null, 2));
    expect(clearance.markers).toHaveLength(4);
    expect(clearance.hud.map(panel => panel.name)).toEqual(expect.arrayContaining(['Study view', 'Airflow', 'Species badge', 'Route card']));
    expect(clearance.markerOverlaps).toEqual([]);
    expect(clearance.vertexCount).toBeGreaterThan(100);
    expect(clearance.routeOverlapVertices).toEqual([]);
    await page.locator('.migration-flight-stage').screenshot({ path: join(report, `${name}-study-fit.png`) });
    const challenge = await completeEvidenceReview(page);
    await page.addScriptTag({ content: axeSource });
    const result = await page.evaluate(async () => {
      const scan = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        violations: scan.violations.map((violation: any) => ({ id: violation.id, nodes: violation.nodes.map((node: any) => ({ target: node.target, summary: node.failureSummary })) })),
        errors: (window as any).__events.errors };
    });
    await writeFile(join(report, `${name}-review.json`), JSON.stringify({ ...result, fit: evidence, clearance }, null, 2));
    await challenge.screenshot({ path: join(report, `${name}-comparison-review.png`) });
    expect(result.viewport).toBe(390);
    expect(result.scrollWidth).toBeLessThanOrEqual(result.viewport);
    expect(result.violations).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});
