import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ retries: 0, timeout: 180_000 });
const report = join(process.cwd(), 'reports/migration-deep-review-round7-2026-10-18');
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
  await harness.mount(page, { migration: { tab: 'flight3d', flightCamera: 'study', flightPaused: true,
    flightStudyYaw: 35, flightStudyPitch: 15, ...seed } },
    'document.querySelector(".migration-flight-stage")?.getAttribute("data-flight-ready")==="true"');
  expect(await harness.glScene(page)).toMatchObject({ hasScene: true });
  await page.evaluate(() => {
    const record = (window as any).__glCanvas()?.rec;
    const original = record.scene.onBeforeRender;
    record.scene.onBeforeRender = function(renderer: any, scene: any, camera: any, ...rest: any[]) {
      record.camera = camera;
      if (original) original.call(this, renderer, scene, camera, ...rest);
    };
  });
  await frames(page);
}

async function darkTheme(page: Page) {
  await page.evaluate(() => {
    (window as any).__ctx.isDark = true; (window as any).__ctx.theme = 'dark';
    document.documentElement.classList.add('dark'); document.body.style.background = '#0f172a';
    (window as any).__rerender();
  });
  await frames(page);
}

async function state(page: Page) {
  return page.evaluate(() => {
    const record = (window as any).__glCanvas()?.rec;
    const scene = record?.scene, camera = record?.camera, THREE = (window as any).THREE;
    const flock = scene?.getObjectByName('migration-flock');
    if (!flock || !camera) throw new Error('The submitted migration scene and camera are unavailable');
    const visible = (node: any) => { for (let part = node; part; part = part.parent) if (!part.visible) return false; return true; };
    const canvas = (window as any).__glCanvas()?.el;
    const box = canvas.getBoundingClientRect();
    scene.updateMatrixWorld(true);
    const markerRoot = scene.getObjectByName('migration-anatomy-markers');
    const markers = (markerRoot?.children || []).map((marker: any) => {
      const point = marker.getWorldPosition(new THREE.Vector3()).project(camera);
      return { id: marker.userData.anatomyId, visible: visible(marker), focused: marker.userData.focused,
        x: box.x + (point.x + 1) * box.width / 2, y: box.y + (1 - point.y) * box.height / 2 };
    });
    const ridges: any[] = [];
    scene.traverse((part: any) => {
      if (part.name !== 'migration-rock-ridges' && part.name !== 'migration-snow-ridges') return;
      const positions = part.geometry?.attributes?.position, colors = part.geometry?.attributes?.color;
      let minY = Infinity, maxY = -Infinity;
      if (positions) for (let index = 0; index < positions.count; index++) { minY = Math.min(minY, positions.getY(index)); maxY = Math.max(maxY, positions.getY(index)); }
      const matrix = new THREE.Matrix4(), instances: number[][] = [];
      for (let index = 0; index < part.count; index++) { part.getMatrixAt(index, matrix); instances.push(matrix.elements.slice()); }
      ridges.push({ name: part.name, parent: part.parent.uuid, count: part.count, visible: visible(part),
        geometry: part.geometry.type, positions: positions?.count, indices: part.geometry.index?.count,
        colors: colors?.count, finite: !!positions && Array.from(positions.array).every(Number.isFinite) && !!colors && Array.from(colors.array).every(Number.isFinite),
        minY, maxY, instances, vertexColors: part.material.vertexColors, materialColor: part.material.color?.getHexString() });
    });
    const bird = flock.children.find((part: any) => part.visible);
    const data = (window as any).__toolData.migration;
    return { camera: camera.position.toArray(), markers, ridges,
      visibleBirds: flock.children.filter((part: any) => part.visible).length, selectedBird: flock.children.indexOf(bird),
      wings: bird?.userData.wings.map((wing: any) => wing.rotation.toArray().slice(0, 3)),
      pose: { speciesId: data.flightSpecies || 'canada_goose', region: data.flightStudyRegion || 'head',
        bird: data.flightStudyBird || 0, yaw: data.flightStudyYaw, pitch: data.flightStudyPitch,
        zoom: data.flightStudyZoom || 1, wingStep: data.flightWingStep || 0, paused: data.flightPaused,
        camera: data.flightCamera },
      observations: JSON.parse(JSON.stringify(data.flightStudyObservations || {})) };
  });
}

async function marker(page: Page, id: string) {
  const stage = page.locator('.migration-flight-stage');
  await stage.scrollIntoViewIfNeeded(); await frames(page);
  const hit = (await state(page)).markers.find((item: any) => item.id === id);
  if (!hit || !hit.visible) throw new Error(`Visible marker ${id} is missing`);
  return hit;
}

async function openObservation(page: Page) {
  const details = page.locator('[data-study-observation]');
  if (!(await details.evaluate(el => (el as HTMLDetailsElement).open))) await details.locator(':scope > summary').click();
  return details;
}

async function openComparison(page: Page) {
  await openObservation(page);
  const details = page.locator('[data-study-comparison]');
  if (!(await details.evaluate(el => (el as HTMLDetailsElement).open))) await details.locator(':scope > summary').click();
  return details;
}

function restoredPose(record: any) {
  return { speciesId: record.speciesId, region: record.region === 'whole-wing' ? 'head' : record.region,
    bird: record.bird, yaw: record.yaw, pitch: record.pitch, zoom: record.zoom,
    wingStep: record.wingStep, paused: true, camera: 'study' };
}

test('Migration connected mountain ridges render finite grounded terrain, isolate in Study, and return in day and night views', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(page, { flightCamera: 'chase', flightShowRoute: true });
  const chase = await state(page);
  expect(chase.ridges.length).toBeGreaterThanOrEqual(4);
  const tiles = new Map<string, any[]>();
  for (const ridge of chase.ridges) {
    expect(ridge.geometry).toBe('BufferGeometry'); expect(ridge.positions).toBe(441); expect(ridge.indices).toBe(2400);
    expect(ridge.colors).toBe(ridge.positions); expect(ridge.finite).toBe(true); expect(ridge.vertexColors).toBe(true);
    expect(ridge.minY).toBeCloseTo(-0.5, 5); expect(ridge.maxY).toBeCloseTo(0.5, 5);
    expect(ridge.visible).toBe(true);
    tiles.set(ridge.parent, [...(tiles.get(ridge.parent) || []), ridge]);
  }
  for (const siblings of tiles.values()) expect(siblings.reduce((sum, ridge) => sum + ridge.count, 0)).toBe(6);
  const stage = page.locator('.migration-flight-stage');
  await stage.screenshot({ path: join(report, 'desktop-connected-ridges-chase.png') });
  await page.getByRole('button', { name: 'Aerial', exact: true }).click(); await frames(page);
  await stage.screenshot({ path: join(report, 'desktop-connected-ridges-aerial.png') });
  await page.getByRole('button', { name: 'Study', exact: true }).click(); await frames(page);
  const study = await state(page);
  expect(study.ridges.every((ridge: any) => !ridge.visible)).toBe(true); expect(study.visibleBirds).toBe(1);
  await page.getByRole('button', { name: 'Chase', exact: true }).click(); await frames(page);
  const restored = await state(page);
  expect(restored.ridges.map((ridge: any) => ridge.instances)).toEqual(chase.ridges.map((ridge: any) => ridge.instances));
  expect(restored.ridges.every((ridge: any) => ridge.visible)).toBe(true);
  await darkTheme(page);
  await stage.screenshot({ path: join(report, 'desktop-connected-ridges-night.png') });
  await writeFile(join(report, 'desktop-ridge-review.json'), JSON.stringify({ chase, study, restored, night: await state(page) }, null, 2));
});

test('Migration direct anatomy markers select the visible part, while drag, cancel, hidden layers and Monarchs cannot mis-select', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(page, { flightShowAnatomy: true });
  const head = await marker(page, 'head'), before = await state(page);
  await page.mouse.click(head.x, head.y); await frames(page);
  await expect(page.locator('[data-study-observation]')).toHaveAttribute('open', '');
  await expect(page.locator('[data-study-region="head"]')).toHaveAttribute('aria-pressed', 'true');
  expect((await state(page)).pose).toEqual(before.pose);
  const primary = await marker(page, 'primaries');
  await page.mouse.click(primary.x, primary.y); await frames(page);
  expect((await state(page)).pose.region).toBe('primaries');
  await expect(page.locator("[data-migration-id=\"migration-study-observation-part\"]")).toHaveText('Primary feathers');
  await expect(page.locator('[data-study-region="primaries"]')).toHaveAttribute('aria-pressed', 'true');
  expect((await state(page)).markers.find((item: any) => item.id === 'primaries')?.focused).toBe(true);

  const tail = await marker(page, 'tail');
  await page.mouse.move(tail.x, tail.y); await page.mouse.down();
  await page.mouse.move(tail.x + 55, tail.y - 20, { steps: 4 }); await page.mouse.up(); await frames(page);
  const dragged = await state(page);
  expect(dragged.pose.region).toBe('primaries'); expect(dragged.pose.yaw).not.toBe(before.pose.yaw);
  const stage = page.locator('.migration-flight-stage');
  await stage.evaluate(el => el.addEventListener('pointerdown', (event: Event) => { (window as any).__round7Pointer = (event as PointerEvent).pointerId; }, { once: true }));
  const cancelledTail = await marker(page, 'tail');
  await page.mouse.move(cancelledTail.x, cancelledTail.y); await page.mouse.down();
  await stage.dispatchEvent('pointercancel', { pointerId: await page.evaluate(() => (window as any).__round7Pointer), pointerType: 'mouse', isPrimary: true });
  await page.mouse.up(); await frames(page);
  expect((await state(page)).pose.region).toBe('primaries');

  await page.getByRole('checkbox', { name: 'Show bird anatomy', exact: true }).uncheck(); await frames(page);
  await stage.scrollIntoViewIfNeeded();
  const hidden = (await state(page)).markers.find((item: any) => item.id === 'tail');
  expect(hidden?.visible).toBe(false);
  if (hidden) await page.mouse.click(hidden.x, hidden.y);
  expect((await state(page)).pose.region).toBe('primaries');
  await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption('monarch'); await frames(page);
  expect((await state(page)).markers.every((item: any) => !item.visible)).toBe(true);
  await stage.scrollIntoViewIfNeeded();
  const monarch = await state(page), absent = monarch.markers.find((item: any) => item.id === 'tail');
  if (absent) await page.mouse.click(absent.x, absent.y);
  expect((await state(page)).pose.region).toBe('primaries');
  await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption('canada_goose');
  await page.getByRole('checkbox', { name: 'Show bird anatomy', exact: true }).check(); await frames(page);
  await stage.screenshot({ path: join(report, 'desktop-direct-anatomy-selection.png') });
  await writeFile(join(report, 'desktop-marker-review.json'), JSON.stringify({ before, dragged, final: await state(page) }, null, 2));
});

test('Migration keyboard revisit restores paused views and saved comparison sources without overwriting recorded evidence or drafts', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(page, { flightStudyBird: 4, flightStudyYaw: 65, flightStudyPitch: 25, flightStudyZoom: 1.1,
    flightWingStep: 2, flightStudyRegion: 'primaries', flightShowAnatomy: true });
  await openObservation(page);
  const input = page.getByRole('textbox', { name: 'My observation', exact: true });
  await input.fill('Recorded goose: the outer feathers spread beyond the inner wing.');
  await page.getByRole('button', { name: 'Record observation', exact: true }).click();
  const gooseRecord = (await state(page)).observations.records['canada_goose:primaries'];
  await page.locator('[data-study-viewpoint="above"]').click();
  await page.getByRole('combobox', { name: 'Study individual', exact: true }).selectOption('1');
  await page.getByRole('button', { name: 'Step wingbeat', exact: true }).click();
  await input.fill('UNRECORDED goose draft must survive revisiting.');
  const currentRevisit = page.locator('[data-study-revisit="observation"]');
  await currentRevisit.focus(); await page.keyboard.press('Enter'); await frames(page);
  const firstRevisit = await state(page);
  expect(firstRevisit.pose).toEqual(restoredPose(gooseRecord));
  expect(firstRevisit.observations.records['canada_goose:primaries']).toEqual(gooseRecord);
  await expect(input).toHaveValue('UNRECORDED goose draft must survive revisiting.');
  await expect(page.locator('[data-study-revisit-status]')).not.toHaveText('');

  await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption('monarch');
  await page.locator('[data-study-viewpoint="above"]').click();
  await page.getByRole('button', { name: 'Step wingbeat', exact: true }).click();
  await openObservation(page);
  await input.fill('Recorded Monarch: patterned wings move together around the small body.');
  await page.getByRole('button', { name: 'Record observation', exact: true }).click();
  await openComparison(page);
  await page.getByRole('combobox', { name: 'First recorded observation', exact: true }).selectOption('canada_goose:primaries');
  await page.getByRole('combobox', { name: 'Second recorded observation', exact: true }).selectOption('monarch:whole-wing');
  const claim = page.getByRole('textbox', { name: 'My observation comparison', exact: true });
  await claim.fill('Feathers separate at the goose wingtip; the Monarch has broad patterned wings.');
  await page.getByRole('button', { name: 'Record comparison', exact: true }).click();
  const saved = (await state(page)).observations.comparison.saved;
  await claim.fill('UNRECORDED comparison draft must survive revisiting.');
  await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption('canada_goose');
  await openObservation(page);
  await page.getByRole('button', { name: 'Remove recorded observation', exact: true }).click();
  await openComparison(page);
  await expect(page.locator('[data-study-comparison-source-state]')).toHaveAttribute('data-study-comparison-source-state', 'changed');
  const comparisonFirst = page.locator('[data-study-revisit="comparison-first"]');
  await comparisonFirst.focus(); await page.keyboard.press('Enter'); await frames(page);
  const replayedFirst = await state(page);
  expect(replayedFirst.pose).toEqual(restoredPose(saved.first));
  expect(replayedFirst.observations.records['canada_goose:primaries']).toBeUndefined();
  expect(replayedFirst.observations.comparison.saved).toEqual(saved);
  await expect(input).toHaveValue('UNRECORDED goose draft must survive revisiting.');
  await expect(claim).toHaveValue('UNRECORDED comparison draft must survive revisiting.');
  await page.locator('[data-study-revisit="comparison-second"]').focus(); await page.keyboard.press('Space'); await frames(page);
  const replayedSecond = await state(page);
  expect(replayedSecond.pose).toEqual(restoredPose(saved.second));
  expect(replayedSecond.visibleBirds).toBe(1); expect(replayedSecond.observations.comparison.saved).toEqual(saved);
  await page.getByRole('button', { name: 'Step wingbeat', exact: true }).click(); await frames(page);
  expect((await state(page)).wings).not.toEqual(replayedSecond.wings);
  await openComparison(page);
  await page.locator('[data-study-revisit="comparison-second"]').click(); await frames(page);
  expect((await state(page)).wings).toEqual(replayedSecond.wings);
  await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-revisited-monarch.png') });
  await page.locator('.migration-flight-controls').screenshot({ path: join(report, 'desktop-revisit-learning-workflow.png') });
  await writeFile(join(report, 'desktop-revisit-review.json'), JSON.stringify({ gooseRecord, firstRevisit, saved, replayedFirst, replayedSecond, final: await state(page) }, null, 2));
});

for (const dark of [false, true]) test.describe(`Migration phone ${dark ? 'dark' : 'light'} round7`, () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Native touch anatomy selection and recorded view revisit remain readable, stable and accessible', async ({ page }) => {
    await mount(page, { flightShowAnatomy: true });
    if (dark) await darkTheme(page);
    const stage = page.locator('.migration-flight-stage');
    const tail = await marker(page, 'tail'), scrollBefore = await page.evaluate(() => scrollY);
    await page.touchscreen.tap(tail.x, tail.y); await frames(page);
    expect((await state(page)).pose.region).toBe('tail');
    expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
    await expect(page.locator('[data-study-region="tail"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-study-observation]')).toHaveAttribute('open', '');
    const note = page.getByRole('textbox', { name: 'My observation', exact: true });
    await note.fill('The tail extends behind the body and changes its outline between viewpoints.');
    await page.getByRole('button', { name: 'Record observation', exact: true }).click();
    const recorded = (await state(page)).observations.records['canada_goose:tail'];
    await page.locator('[data-study-viewpoint="profile"]').click();
    await page.getByRole('button', { name: 'Step wingbeat', exact: true }).click();
    await note.fill('My unrecorded follow-up stays in this draft.');
    await page.locator('[data-study-revisit="observation"]').tap(); await frames(page);
    const revisited = await state(page);
    expect(revisited.pose).toEqual(restoredPose(recorded));
    expect(revisited.observations.records['canada_goose:tail']).toEqual(recorded);
    await expect(note).toHaveValue('My unrecorded follow-up stays in this draft.');
    await stage.scrollIntoViewIfNeeded();
    const untouchedRegion = revisited.pose.region, head = await marker(page, 'head');
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: head.x, y: head.y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: head.x + 35, y: head.y + 15, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach(); await frames(page);
    const orbited = await state(page);
    expect(orbited.pose.region).toBe(untouchedRegion); expect(orbited.pose.yaw).not.toBe(revisited.pose.yaw);
    await page.addScriptTag({ content: axeSource });
    const scan = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        violations: result.violations.map((violation: any) => ({ id: violation.id, nodes: violation.nodes.map((node: any) => ({ target: node.target, summary: node.failureSummary })) })),
        errors: (window as any).__events.errors };
    });
    const name = `mobile-${dark ? 'dark' : 'light'}`;
    await writeFile(join(report, `${name}-revisit-review.json`), JSON.stringify({ ...scan, recorded, revisited, orbited }, null, 2));
    await stage.screenshot({ path: join(report, `${name}-direct-anatomy.png`) });
    await page.locator('[data-study-observation]').screenshot({ path: join(report, `${name}-revisit-observation.png`) });
    expect(scan.viewport).toBe(390); expect(scan.scrollWidth).toBeLessThanOrEqual(scan.viewport);
    expect(scan.violations).toEqual([]); expect(scan.errors).toEqual([]);
  });
});
