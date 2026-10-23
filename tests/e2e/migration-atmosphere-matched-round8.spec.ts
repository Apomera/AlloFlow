import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ retries: 0, timeout: 180_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round8-2026-10-18');
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

async function theme(page: Page, dark: boolean) {
  await page.evaluate(dark => {
    (window as any).__ctx.isDark = dark; (window as any).__ctx.theme = dark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', dark);
    document.body.style.background = dark ? '#0f172a' : '#f8fafc';
    (window as any).__rerender();
  }, dark);
  await frames(page);
}

async function atmosphere(page: Page) {
  return page.evaluate(() => {
    const record = (window as any).__glCanvas()?.rec;
    const scene = record?.scene, camera = record?.camera, THREE = (window as any).THREE;
    if (!scene || !camera) throw new Error('Submitted scene and camera are unavailable');
    scene.updateMatrixWorld(true);
    const shown = (node: any) => { if (!node) return false; for (let part = node; part; part = part.parent) if (!part.visible) return false; return true; };
    const stars = scene.getObjectByName('migration-night-stars');
    const positions = stars?.geometry?.attributes?.position, colors = stars?.geometry?.attributes?.color;
    let inView = 0;
    const projected = new THREE.Vector3();
    if (positions) for (let index = 0; index < positions.count; index++) {
      projected.fromBufferAttribute(positions, index).applyMatrix4(stars.matrixWorld).project(camera);
      if (Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 && projected.z > -1 && projected.z < 1) inView++;
    }
    const image = stars?.material?.map?.image;
    let sprite: any = null;
    if (image?.getContext) {
      const context = image.getContext('2d');
      const alpha = (x: number, y: number) => context.getImageData(x, y, 1, 1).data[3];
      sprite = { width: image.width, height: image.height, center: alpha(Math.floor(image.width / 2), Math.floor(image.height / 2)),
        corner: alpha(0, 0), outer: alpha(Math.floor(image.width / 2), 0) };
    }
    const clouds: any[] = [];
    scene.traverse((group: any) => {
      if (group.name !== 'migration-cumulus-cloud') return;
      const lobes = group.getObjectByName('migration-cloud-lobes');
      const matrix = new THREE.Matrix4(), transforms: number[][] = [];
      if (lobes) for (let index = 0; index < lobes.count; index++) { lobes.getMatrixAt(index, matrix); transforms.push(matrix.elements.slice()); }
      clouds.push({ uuid: group.uuid, visible: shown(group), position: group.position.toArray(),
        lobes: lobes && { type: lobes.type, instanced: lobes.isInstancedMesh === true, count: lobes.count, baseCount: lobes.userData.baseCount, crownCount: lobes.userData.crownCount,
          geometry: lobes.geometry.uuid, material: lobes.material.uuid, vertices: lobes.geometry.attributes.position.count,
          finite: Array.from(lobes.geometry.attributes.position.array).every(Number.isFinite) && transforms.every(row => row.every(Number.isFinite)),
          color: lobes.material.color.getHexString(), opacity: lobes.material.opacity, transparent: lobes.material.transparent, transforms } });
    });
    return { scene: scene.uuid, fog: scene.fog?.color.getHexString(),
      stars: stars && { uuid: stars.uuid, type: stars.type, visible: shown(stars), geometry: stars.geometry.uuid,
        material: stars.material.uuid, count: positions?.count, colors: colors?.count,
        finite: !!positions && Array.from(positions.array).every(Number.isFinite) && !!colors && Array.from(colors.array).every(Number.isFinite),
        positions: positions ? Array.from(positions.array) : [], colorValues: colors ? Array.from(colors.array) : [],
        inView, sprite, sizeAttenuation: stars.material.sizeAttenuation, depthWrite: stars.material.depthWrite }, clouds };
  });
}

async function study(page: Page) {
  return page.evaluate(() => {
    const record = (window as any).__glCanvas()?.rec;
    const scene = record?.scene, camera = record?.camera, THREE = (window as any).THREE;
    const flock = scene?.getObjectByName('migration-flock');
    if (!flock || !camera) throw new Error('Submitted Study scene and camera are unavailable');
    scene.updateMatrixWorld(true);
    const bird = flock.children.find((part: any) => part.visible);
    if (!bird) throw new Error('The selected model is unavailable');
    const target = bird.getWorldPosition(new THREE.Vector3());
    const offset = camera.position.clone().sub(target).normalize();
    const point = new THREE.Vector3(); let extent = 0, minDepth = Infinity, maxDepth = -Infinity;
    bird.traverse((part: any) => {
      const positions = part.geometry?.attributes?.position;
      if (!positions) return;
      for (let index = 0; index < positions.count; index++) {
        point.fromBufferAttribute(positions, index).applyMatrix4(part.matrixWorld).project(camera);
        extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y)); minDepth = Math.min(minDepth, point.z); maxDepth = Math.max(maxDepth, point.z);
      }
    });
    const data = (window as any).__toolData.migration;
    return { selected: flock.children.indexOf(bird), visible: flock.children.filter((part: any) => part.visible).length,
      camera: camera.position.toArray(), offset: offset.toArray(), extent, minDepth, maxDepth,
      wings: bird.userData.wings.map((wing: any) => wing.rotation.z),
      pose: { speciesId: data.flightSpecies || 'canada_goose', region: data.flightStudyRegion || 'head',
        bird: data.flightStudyBird || 0, yaw: data.flightStudyYaw, pitch: data.flightStudyPitch,
        zoom: data.flightStudyZoom || 1, step: data.flightWingStep || 0, paused: data.flightPaused, camera: data.flightCamera },
      data: JSON.parse(JSON.stringify(data)) };
  });
}

function evidenceSeed() {
  const firstKey = 'canada_goose:primaries', secondKey = 'arctic_tern:head';
  const first = { speciesId: 'canada_goose', region: 'primaries', note: 'Goose outer feathers spread beyond the inner wing.',
    bird: 4, yaw: 65, pitch: 25, zoom: 1.4, wingStep: 3, paused: false, motionReduced: false };
  const second = { speciesId: 'arctic_tern', region: 'head', note: 'Tern has a thin red bill ahead of its pale face and dark cap.',
    bird: 1, yaw: -30, pitch: 50, zoom: 0.7, wingStep: 7, paused: true, motionReduced: true };
  const observations = { drafts: { [firstKey]: 'Unsaved goose follow-up.', [secondKey]: 'Unsaved tern follow-up.', 'monarch:whole-wing': 'Keep the insect draft.' },
    records: { [firstKey]: first, [secondKey]: second }, feedback: null,
    comparison: { firstKey, secondKey, draft: 'Unsaved claim edits.', feedback: '', saved: { firstKey, secondKey, first, second,
      claim: 'Both have bills; feather and head outlines are visible in different recorded views.' } } };
  return { flightSpecies: 'canada_goose', flightStudyRegion: 'primaries', flightStudyBird: 4,
    flightStudyYaw: 65, flightStudyPitch: 25, flightStudyZoom: 1.4, flightWingStep: 3,
    flightFormation: 'v', flightWind: 13, flightSeason: 'spring', flightShowAnatomy: true,
    flightStudyObservations: observations,
    flightInvestigation: { variable: 'wind', prediction: 'Keep my unrelated wind prediction.', trials: [] } };
}

async function openComparison(page: Page) {
  const observation = page.locator('[data-study-observation]');
  if (!(await observation.evaluate(el => (el as HTMLDetailsElement).open))) await observation.locator(':scope > summary').click();
  const comparison = page.locator('[data-study-comparison]');
  if (!(await comparison.evaluate(el => (el as HTMLDetailsElement).open))) await comparison.locator(':scope > summary').click();
  return comparison;
}

async function matched(page: Page, source: 'first' | 'second', viewpoint: 'profile' | 'above', touch = false) {
  await openComparison(page);
  const saved = page.locator('[data-study-matched-comparison="saved"]');
  const panel = await saved.count() ? saved : page.locator('[data-study-matched-comparison="selected"]');
  await panel.getByRole('combobox', { name: 'Matched comparison view', exact: true }).selectOption(viewpoint);
  const button = panel.locator(`[data-study-matched="${source}"]`);
  if (touch) await button.tap(); else { await button.focus(); await page.keyboard.press('Enter'); }
  await frames(page);
  const state = await study(page);
  const yaw = viewpoint === 'profile' ? 90 : 0, pitch = viewpoint === 'profile' ? 10 : 60;
  expect(state.pose).toMatchObject({ speciesId: source === 'first' ? 'canada_goose' : 'arctic_tern',
    region: source === 'first' ? 'primaries' : 'head', bird: source === 'first' ? 4 : 1,
    yaw, pitch, zoom: 1, step: 0, paused: true, camera: 'study' });
  expect(state.visible).toBe(1); expect(state.selected).toBe(source === 'first' ? 4 : 1);
  expect(state.extent).toBeGreaterThan(0.2); expect(state.extent).toBeLessThan(0.98);
  expect(state.minDepth).toBeGreaterThan(-1); expect(state.maxDepth).toBeLessThan(1);
  state.wings.forEach((rotation: number) => expect(Math.abs(rotation)).toBeLessThan(0.00001));
  const angle = yaw * Math.PI / 180, elevation = pitch * Math.PI / 180;
  const expectedOffset = [Math.sin(angle) * Math.cos(elevation), Math.sin(elevation), Math.cos(angle) * Math.cos(elevation)];
  state.offset.forEach((coordinate: number, axis: number) => expect(coordinate).toBeCloseTo(expectedOffset[axis], 3));
  await expect(page.locator('#migration-flight-stage')).toBeFocused();
  return state;
}

test('Migration night stars are round submitted Points, stable through theme changes and hidden in Study', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(page, { flightCamera: 'chase' });
  const day = await atmosphere(page);
  expect(day.stars).toMatchObject({ type: 'Points', count: 1100, colors: 1100, finite: true, visible: false, sizeAttenuation: false, depthWrite: false });
  expect(day.stars?.sprite?.center).toBeGreaterThan(200);
  expect(day.stars?.sprite?.corner).toBe(0); expect(day.stars?.sprite?.outer).toBeLessThan(20);
  await theme(page, true);
  const night = await atmosphere(page);
  expect(night.stars?.visible).toBe(true); expect(night.stars?.inView).toBeGreaterThan(10);
  expect(night.fog).not.toBe(day.fog);
  expect(night.stars?.positions).toEqual(day.stars?.positions);
  const stage = page.locator('.migration-flight-stage'); await stage.scrollIntoViewIfNeeded();
  await stage.screenshot({ path: join(report, 'desktop-round-star-night.png') });
  const box = await stage.boundingBox(); if (!box) throw new Error('Night scene bounds are missing');
  await page.screenshot({ path: join(report, 'desktop-round-star-sky-detail.png'), clip: { x: box.x + 4, y: box.y + 80, width: box.width - 8, height: Math.min(180, box.height / 3) } });
  await page.getByRole('button', { name: 'Study', exact: true }).click(); await frames(page);
  const isolated = await atmosphere(page);
  expect(isolated.stars?.visible).toBe(false); expect(isolated.clouds.every((cloud: any) => !cloud.visible)).toBe(true);
  await page.getByRole('button', { name: 'Chase', exact: true }).click(); await frames(page);
  await theme(page, false); await theme(page, true);
  const restored = await atmosphere(page);
  expect(restored.scene).toBe(day.scene);
  expect(restored.stars?.uuid).toBe(day.stars?.uuid);
  expect(restored.stars?.geometry).toBe(day.stars?.geometry); expect(restored.stars?.material).toBe(day.stars?.material);
  expect(restored.stars?.visible).toBe(true); expect(restored.stars?.positions).toEqual(day.stars?.positions);
  expect(restored.stars?.colorValues).toEqual(day.stars?.colorValues);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await writeFile(join(report, 'desktop-star-review.json'), JSON.stringify({ day, night, isolated, restored }, null, 2));
});

test('Migration pooled cumulus render asymmetric crowns, drift during flight and freeze for pause and Reduce motion', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(page, { flightCamera: 'chase' });
  const initial = await atmosphere(page);
  expect(initial.clouds).toHaveLength(14);
  expect(new Set(initial.clouds.map((cloud: any) => cloud.lobes.geometry)).size).toBe(1);
  expect(new Set(initial.clouds.map((cloud: any) => cloud.lobes.material)).size).toBe(1);
  for (const cloud of initial.clouds) {
    expect(cloud.visible).toBe(true); expect(cloud.lobes.instanced).toBe(true);
    expect(cloud.lobes.finite).toBe(true); expect(cloud.lobes.vertices).toBeGreaterThan(80);
    expect(cloud.lobes.baseCount).toBe(3); expect(cloud.lobes.crownCount).toBeGreaterThanOrEqual(4);
    expect(cloud.lobes.count).toBe(cloud.lobes.baseCount + cloud.lobes.crownCount);
    expect(cloud.lobes.transparent).toBe(false);
    const bases = cloud.lobes.transforms.slice(0, cloud.lobes.baseCount), crowns = cloud.lobes.transforms.slice(cloud.lobes.baseCount);
    expect(Math.max(...crowns.map((matrix: number[]) => matrix[13]))).toBeGreaterThan(Math.max(...bases.map((matrix: number[]) => matrix[13])));
    expect(new Set(crowns.map((matrix: number[]) => matrix[0].toFixed(3))).size).toBeGreaterThan(1);
  }
  const stage = page.locator('.migration-flight-stage'); await stage.screenshot({ path: join(report, 'desktop-cumulus-day.png') });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: 'Resume flight', exact: true }).click(); await frames(page, 12);
  const moving = await atmosphere(page);
  expect(moving.clouds.map((cloud: any) => cloud.position)).not.toEqual(initial.clouds.map((cloud: any) => cloud.position));
  await page.getByRole('button', { name: 'Pause flight', exact: true }).click(); await frames(page);
  const paused = await atmosphere(page); await frames(page, 8); const still = await atmosphere(page);
  expect(still.clouds.map((cloud: any) => cloud.position)).toEqual(paused.clouds.map((cloud: any) => cloud.position));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Resume flight', exact: true }).click(); await frames(page);
  const reduced = await atmosphere(page); await frames(page, 8); const reducedStill = await atmosphere(page);
  expect(reducedStill.clouds.map((cloud: any) => cloud.position)).toEqual(reduced.clouds.map((cloud: any) => cloud.position));
  await theme(page, true); const night = await atmosphere(page);
  expect(night.clouds[0].lobes.color).not.toBe(initial.clouds[0].lobes.color);
  expect(night.clouds.map((cloud: any) => cloud.lobes.geometry)).toEqual(initial.clouds.map((cloud: any) => cloud.lobes.geometry));
  await stage.screenshot({ path: join(report, 'desktop-cumulus-night.png') });
  await page.getByRole('button', { name: 'Study', exact: true }).click(); await frames(page);
  expect((await atmosphere(page)).clouds.every((cloud: any) => !cloud.visible)).toBe(true);
  await page.getByRole('button', { name: 'Chase', exact: true }).click(); await frames(page);
  expect((await atmosphere(page)).clouds.every((cloud: any) => cloud.visible)).toBe(true);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await writeFile(join(report, 'desktop-cumulus-review.json'), JSON.stringify({ initial, moving, paused, still, reduced, reducedStill, night }, null, 2));
});

test('Migration matched comparison standardizes actual views and wing phase while preserving originals, drafts and other investigations', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const seed: any = evidenceSeed(); seed.flightStudyObservations.comparison.saved = null;
  await mount(page, seed);
  const beforeClaim = await study(page), comparisons: any[] = [];
  await openComparison(page);
  await expect(page.getByRole('combobox', { name: 'Matched comparison view', exact: true })).toHaveValue('profile');
  await expect(page.locator('[data-study-matched-source]')).toHaveAttribute('data-study-matched-source', 'selected');
  const previewFirst = await matched(page, 'first', 'profile');
  const previewSecond = await matched(page, 'second', 'profile');
  expect(previewFirst.data.flightStudyObservations).toEqual(beforeClaim.data.flightStudyObservations);
  expect(previewSecond.data.flightStudyObservations).toEqual(beforeClaim.data.flightStudyObservations);
  expect(previewSecond.data.flightStudyObservations.comparison.saved).toBeNull();
  await openComparison(page);
  await page.getByRole('button', { name: 'Record comparison', exact: true }).click();
  await expect(page.locator('[data-study-matched-comparison="saved"] [data-study-matched-source]')).toHaveAttribute('data-study-matched-source', 'saved');
  await page.getByRole('textbox', { name: 'My observation comparison', exact: true }).fill('Unsaved claim edits after recording.');
  const before = await study(page);
  expect(before.data.flightStudyObservations.comparison.saved.first).toEqual(beforeClaim.data.flightStudyObservations.records['canada_goose:primaries']);
  expect(before.data.flightStudyObservations.comparison.saved.second).toEqual(beforeClaim.data.flightStudyObservations.records['arctic_tern:head']);
  for (const source of ['first', 'second', 'first', 'second'] as const) {
    const view = await matched(page, source, 'profile'); comparisons.push({ source, viewpoint: 'profile', view });
    expect(view.data.flightStudyObservations).toEqual(before.data.flightStudyObservations);
    expect(view.data.flightInvestigation).toEqual(before.data.flightInvestigation);
    expect(view.data.flightFormation).toBe('v'); expect(view.data.flightWind).toBe(13); expect(view.data.flightSeason).toBe('spring');
  }
  for (const source of ['first', 'second'] as const) comparisons.push({ source, viewpoint: 'above', view: await matched(page, source, 'above') });
  await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption('canada_goose');
  await page.locator('[data-study-region="primaries"]').click(); await openComparison(page);
  await page.getByRole('button', { name: 'Remove recorded observation', exact: true }).click();
  await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption('arctic_tern');
  await page.locator('[data-study-region="head"]').click(); await openComparison(page);
  await page.getByRole('button', { name: 'Remove recorded observation', exact: true }).click();
  await openComparison(page);
  await expect(page.locator('[data-study-comparison-source-state]')).toHaveAttribute('data-study-comparison-source-state', 'changed');
  const absent = await study(page); expect(Object.keys(absent.data.flightStudyObservations.records)).toHaveLength(0);
  const firstRemoved = await matched(page, 'first', 'above');
  const secondRemoved = await matched(page, 'second', 'above');
  for (const view of [firstRemoved, secondRemoved]) {
    expect(Object.keys(view.data.flightStudyObservations.records)).toHaveLength(0);
    expect(view.data.flightStudyObservations.drafts).toEqual(before.data.flightStudyObservations.drafts);
    expect(view.data.flightStudyObservations.comparison.saved).toEqual(before.data.flightStudyObservations.comparison.saved);
    expect(view.data.flightStudyObservations.comparison.draft).toBe(before.data.flightStudyObservations.comparison.draft);
    expect(view.data.flightInvestigation).toEqual(before.data.flightInvestigation);
  }
  await expect(page.getByRole('textbox', { name: 'Shape and motion observation', exact: true })).toHaveValue('Unsaved tern follow-up.');
  await expect(page.locator('[data-study-revisit-status]')).not.toHaveText('');
  await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-matched-tern-above.png') });
  await page.locator('.migration-flight-controls').screenshot({ path: join(report, 'desktop-matched-comparison-workflow.png') });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await writeFile(join(report, 'desktop-matched-review.json'), JSON.stringify({ beforeClaim, previewFirst, previewSecond, before, comparisons, absent, firstRemoved, secondRemoved }, null, 2));
});

for (const dark of [false, true]) test.describe(`Migration phone ${dark ? 'dark' : 'light'} round8`, () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Matched source views remain fitted, preserve evidence and expose accessible controls on a narrow viewport', async ({ page }) => {
    await mount(page, evidenceSeed()); if (dark) await theme(page, true);
    const before = await study(page), first = await matched(page, 'first', 'profile', true);
    const second = await matched(page, 'second', 'profile', true);
    const above = await matched(page, 'first', 'above', true);
    for (const view of [first, second, above]) {
      expect(view.data.flightStudyObservations).toEqual(before.data.flightStudyObservations);
      expect(view.data.flightInvestigation).toEqual(before.data.flightInvestigation);
      expect(view.data.flightFormation).toBe('v'); expect(view.data.flightWind).toBe(13); expect(view.data.flightSeason).toBe('spring');
    }
    await expect(page.locator('[data-study-revisit-status]')).not.toHaveText('');
    await page.addScriptTag({ content: axeSource });
    const scan = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        violations: result.violations.map((violation: any) => ({ id: violation.id, nodes: violation.nodes.map((node: any) => ({ target: node.target, summary: node.failureSummary })) })),
        errors: (window as any).__events.errors };
    });
    const name = `mobile-${dark ? 'dark' : 'light'}`;
    await page.locator('.migration-flight-stage').screenshot({ path: join(report, `${name}-matched-study.png`) });
    await page.locator('[data-study-comparison]').screenshot({ path: join(report, `${name}-matched-comparison.png`) });
    await writeFile(join(report, `${name}-matched-review.json`), JSON.stringify({ ...scan, before, first, second, above }, null, 2));
    expect(scan.viewport).toBe(390); expect(scan.scrollWidth).toBeLessThanOrEqual(scan.viewport);
    expect(scan.violations).toEqual([]); expect(scan.errors).toEqual([]);
  });
});
