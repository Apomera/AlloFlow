import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 150_000 });
const report = process.env.MIGRATION_REPORT_DIR ? join(process.env.MIGRATION_REPORT_DIR, 'round6') : join(process.cwd(), 'reports/migration-deep-review-round6-2026-10-18');
const axeSource = readFileSync(join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8');
const harness = new GlHarness({
  toolFile: process.env.MIG_TOOL_FILE || 'stem_lab/stem_tool_migration.js', toolId: 'migration',
  width: 1100, height: 900, layout: 'document', appStyles: true,
  probes: `var vp=document.createElement('meta');vp.name='viewport';vp.content='width=device-width,initial-scale=1';document.head.appendChild(vp);document.querySelector('#wrap').style.width='min(100vw,1100px)';document.body.style.fontFamily='system-ui,sans-serif';document.body.style.background='#f8fafc';`
});

test.beforeAll(async () => { await mkdir(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function frames(page: Page, count = 4) {
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
  await frames(page, 2);
}

async function sceneState(page: Page) {
  return page.evaluate(() => {
    const record = (window as any).__glCanvas()?.rec;
    const scene = record?.scene, camera = record?.camera, THREE = (window as any).THREE;
    const flock = scene?.getObjectByName('migration-flock');
    if (!flock || !camera) throw new Error('The submitted scene and camera are unavailable');
    const bird = flock.children.find((part: any) => part.visible);
    const point = new THREE.Vector3();
    let modelExtent = 0;
    const parts: any[] = [];
    bird.updateMatrixWorld(true);
    bird.traverse((part: any) => {
      const positions = part.geometry?.attributes?.position;
      if (!positions) return;
      for (let index = 0; index < positions.count; index++) {
        point.fromBufferAttribute(positions, index).applyMatrix4(part.matrixWorld).project(camera);
        modelExtent = Math.max(modelExtent, Math.abs(point.x), Math.abs(point.y));
      }
      if (/migration-(bird-(neck|head|bill)|goose-chinstrap|crane-crown|tern-(tail-streamer|cap))$/.test(part.name)) {
        parts.push({ name: part.name, vertices: positions.count, finite: Array.from(positions.array).every(Number.isFinite),
          geometry: part.geometry.uuid, material: part.material.uuid, color: part.material.color?.getHexString(),
          position: part.position.toArray(), scale: part.scale.toArray() });
      }
    });
    return { camera: camera.position.toArray(), modelExtent, parts,
      selected: flock.children.indexOf(bird), visible: flock.children.filter((part: any) => part.visible).length,
      saved: { yaw: (window as any).__toolData.migration.flightStudyYaw,
        pitch: (window as any).__toolData.migration.flightStudyPitch } };
  });
}

async function openObservation(page: Page) {
  const root = page.locator('[data-study-observation]');
  if (!(await root.evaluate(el => (el as HTMLDetailsElement).open))) await root.locator(':scope > summary').click();
  await expect(page.getByRole('textbox', { name: 'My observation', exact: true })).toBeVisible();
}

async function twoObservations(page: Page) {
  await openObservation(page);
  await page.locator('[data-study-viewpoint="profile"]').click();
  await page.getByRole('textbox', { name: 'My observation', exact: true }).fill('The goose has a continuous curved neck and a bill in front of its head.');
  await page.getByRole('button', { name: 'Record observation', exact: true }).click();
  await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption('monarch');
  await page.locator('[data-study-viewpoint="above"]').click();
  await openObservation(page);
  await page.getByRole('textbox', { name: 'My observation', exact: true }).fill('The Monarch has two patterned wing pairs and antennae rather than a bill.');
  await page.getByRole('button', { name: 'Record observation', exact: true }).click();
  const comparison = page.locator('[data-study-comparison]');
  if (!(await comparison.evaluate(el => (el as HTMLDetailsElement).open))) await comparison.locator(':scope > summary').click();
  await page.getByRole('combobox', { name: 'First recorded observation', exact: true }).selectOption('canada_goose:head');
  await page.getByRole('combobox', { name: 'Second recorded observation', exact: true }).selectOption('monarch:whole-wing');
  return comparison;
}

test('Migration direct Study drag previews the actual camera, commits on release, cancels safely and leaves buttons usable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(page, { flightStudyBird: 4, flightShowAnatomy: true });
  const stage = page.locator('.migration-flight-stage');
  await stage.scrollIntoViewIfNeeded();
  const box = await stage.boundingBox(); if (!box) throw new Error('Study stage is missing');
  const x = box.x + box.width * 0.5, y = box.y + box.height * 0.55;
  const before = await sceneState(page);
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + 80, y - 35, { steps: 5 }); await frames(page);
  const preview = await sceneState(page);
  expect(preview.camera).not.toEqual(before.camera);
  expect(preview.saved).toEqual(before.saved);
  await page.mouse.move(box.x + box.width + 16, y, { steps: 3 });
  await page.mouse.up(); await frames(page);
  const committed = await sceneState(page);
  expect(committed.saved).not.toEqual(before.saved);
  expect(committed.selected).toBe(4); expect(committed.visible).toBe(1);
  expect(Math.abs(committed.saved.yaw % 5)).toBe(0); expect(Math.abs(committed.saved.pitch % 5)).toBe(0);
  await expect(page.getByRole('slider', { name: 'Study angle in degrees', exact: true })).toHaveValue(String(committed.saved.yaw));

  await stage.evaluate(el => el.addEventListener('pointerdown', (event: Event) => {
    (window as any).__studyPointerId = (event as PointerEvent).pointerId;
  }, { once: true }));
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x - 70, y + 20, { steps: 4 }); await frames(page);
  expect((await sceneState(page)).camera).not.toEqual(committed.camera);
  const pointerId = await page.evaluate(() => (window as any).__studyPointerId);
  await stage.dispatchEvent('pointercancel', { pointerId, pointerType: 'mouse', isPrimary: true });
  await page.mouse.up(); await frames(page);
  const cancelled = await sceneState(page);
  expect(cancelled.saved).toEqual(committed.saved);
  cancelled.camera.forEach((value: number, index: number) => expect(value).toBeCloseTo(committed.camera[index], 5));
  await stage.getByRole('button', { name: 'Airflow', exact: true }).click();
  expect((await sceneState(page)).saved).toEqual(committed.saved);
  await expect(stage.getByRole('button', { name: 'Airflow', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await writeFile(join(report, 'desktop-direct-orbit.json'), JSON.stringify({ before, preview, committed, cancelled }, null, 2));
  await stage.screenshot({ path: join(report, 'desktop-direct-orbit.png') });
});

test('Migration curved necks, species markings and paired tern tail feathers are real geometry with safe Study framing', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(page, { flightStudyZoom: 1 });
  const result: any[] = [];
  for (const species of ['canada_goose', 'sandhill_crane', 'arctic_tern']) {
    await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption(species);
    await page.locator('[data-study-viewpoint="profile"]').click(); await frames(page);
    const profile = await sceneState(page);
    expect(profile.visible).toBe(1); expect(profile.modelExtent).toBeGreaterThan(0.2); expect(profile.modelExtent).toBeLessThan(0.98);
    expect(profile.parts.filter(part => part.name === 'migration-bird-neck')).toHaveLength(1);
    expect(profile.parts.find(part => part.name === 'migration-bird-neck')?.vertices).toBeGreaterThan(40);
    expect(profile.parts.every(part => part.finite)).toBe(true);
    if (species === 'canada_goose') expect(profile.parts.filter(part => part.name === 'migration-goose-chinstrap')).toHaveLength(1);
    if (species === 'sandhill_crane') expect(profile.parts.filter(part => part.name === 'migration-crane-crown')).toHaveLength(1);
    if (species === 'arctic_tern') {
      const streamers = profile.parts.filter(part => part.name === 'migration-tern-tail-streamer');
      expect(streamers).toHaveLength(2);
      expect(streamers[0].geometry).toBe(streamers[1].geometry); expect(streamers[0].material).toBe(streamers[1].material);
      expect(Math.sign(streamers[0].scale[0])).not.toBe(Math.sign(streamers[1].scale[0]));
      await page.locator('[data-study-viewpoint="above"]').click(); await frames(page);
      const above = await sceneState(page); expect(above.modelExtent).toBeLessThan(0.98);
      result.push({ species, profile, above });
    } else result.push({ species, profile });
    await page.locator('.migration-flight-stage').screenshot({ path: join(report, `desktop-${species}-shape.png`) });
  }
  await writeFile(join(report, 'desktop-species-geometry.json'), JSON.stringify(result, null, 2));
});

test('Migration recorded observations compare species and export only saved evidence with safe HTML', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const notebook = { variable: 'wind', prediction: 'Retain my flight prediction', trials: [] };
  await mount(page, { flightInvestigation: notebook });
  const comparison = await twoObservations(page);
  const table = page.getByRole('table', { name: 'Recorded observation comparison', exact: true });
  await expect(table).toContainText('Canada Goose'); await expect(table).toContainText('Monarch');
  await expect(table).toContainText('continuous curved neck'); await expect(table).toContainText('two patterned wing pairs');
  expect(await table.evaluate(el => getComputedStyle(el).display)).toBe('block');
  await expect(table.getByRole('row')).toHaveCount(3);
  await expect(table.getByRole('columnheader')).toHaveCount(3);
  expect(await table.getByRole('cell').first().evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThan(200);
  await expect(table.locator('.migration-study-comparison-cell-label').first()).toBeVisible();
  const claim = 'Both have wings; the goose has a bill. <script>do not execute</script>';
  await page.getByRole('textbox', { name: 'My observation comparison', exact: true }).fill(claim);
  await page.getByRole('button', { name: 'Record comparison', exact: true }).click();
  await expect(page.locator('[data-study-saved-comparison]')).toContainText(claim);
  await page.getByRole('textbox', { name: 'My observation comparison', exact: true }).fill('UNRECORDED_COMPARISON_DRAFT');
  await page.getByRole('textbox', { name: 'My observation', exact: true }).fill('UNRECORDED_OBSERVATION_DRAFT');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download observation notebook (HTML)', exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path(); if (!path) throw new Error('Observation download is missing');
  const html = await readFile(path, 'utf8');
  expect(html).toContain('continuous curved neck'); expect(html).toContain('two patterned wing pairs');
  expect(html).toContain('&lt;script&gt;do not execute&lt;/script&gt;'); expect(html).not.toContain('<script>do not execute</script>');
  expect(html).not.toContain('UNRECORDED_COMPARISON_DRAFT'); expect(html).not.toContain('UNRECORDED_OBSERVATION_DRAFT');
  const data = await page.evaluate(() => (window as any).__toolData.migration);
  expect(data.flightInvestigation).toEqual(notebook);
  expect(data.flightStudyObservations.comparison.saved.claim).toBe(claim);
  expect(data.flightStudyObservations.comparison.saved.first.yaw).toBe(90);
  expect(data.flightStudyObservations.comparison.saved.second.pitch).toBe(60);
  await writeFile(join(report, 'recorded-observation-notebook.html'), html);
  await page.addScriptTag({ content: axeSource });
  const desktopViolations = await comparison.evaluate(async el => (await (window as any).axe.run(el, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })));
  expect(desktopViolations).toEqual([]);
  await table.scrollIntoViewIfNeeded();
  const panel = page.locator('.migration-flight-controls');
  await panel.screenshot({ path: join(report, 'desktop-observation-comparison.png') });
  await writeFile(join(report, 'desktop-comparison-layout.json'), JSON.stringify(await panel.evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height, viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, panelScrollTop: el.scrollTop }; }), null, 2));
  const exported = await page.context().newPage();
  await exported.setContent(html);
  await expect(exported.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await exported.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await exported.screenshot({ path: join(report, 'desktop-exported-notebook.png'), fullPage: true });
  await exported.close();
});

for (const dark of [false, true]) test.describe(`Migration phone ${dark ? 'dark' : 'light'} round6`, () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Direct touch orbit and recorded comparison remain readable and accessible', async ({ page }) => {
    await mount(page, { flightShowAnatomy: true });
    if (dark) await page.evaluate(() => {
      (window as any).__ctx.isDark = true; (window as any).__ctx.theme = 'dark';
      document.documentElement.classList.add('dark'); document.body.style.background = '#0f172a';
      (window as any).__rerender();
    });
    const stage = page.locator('.migration-flight-stage'); await stage.scrollIntoViewIfNeeded();
    const box = await stage.boundingBox(); if (!box) throw new Error('Phone Study stage is missing');
    const x = box.x + box.width * 0.5, y = box.y + box.height * 0.55;
    const before = await sceneState(page), scrollBefore = await page.evaluate(() => scrollY);
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 60, y: y - 25, id: 1 }] });
    await frames(page);
    expect((await sceneState(page)).camera).not.toEqual(before.camera);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach(); await frames(page);
    const touched = await sceneState(page);
    expect(touched.saved).not.toEqual(before.saved);
    expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
    expect(touched.modelExtent).toBeLessThan(0.98);
    const comparison = await twoObservations(page);
    await page.getByRole('textbox', { name: 'My observation comparison', exact: true }).fill('Both have wing pairs, while their body shapes and visible head parts differ.');
    await page.getByRole('button', { name: 'Record comparison', exact: true }).click();
    await expect(page.locator('[data-study-saved-comparison]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download observation notebook (HTML)', exact: true })).toBeEnabled();
    await page.addScriptTag({ content: axeSource });
    const scan = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        violations: result.violations.map((violation: any) => ({ id: violation.id, nodes: violation.nodes.map((node: any) => ({ target: node.target, summary: node.failureSummary })) })),
        errors: (window as any).__events.errors };
    });
    const name = `mobile-${dark ? 'dark' : 'light'}`;
    await writeFile(join(report, `${name}-direct-study-review.json`), JSON.stringify({ ...scan, before, touched }, null, 2));
    await comparison.screenshot({ path: join(report, `${name}-observation-comparison.png`) });
    await page.screenshot({ path: join(report, `${name}-study-workflow.png`), fullPage: true });
    expect(scan.viewport).toBe(390); expect(scan.scrollWidth).toBeLessThanOrEqual(scan.viewport);
    expect(scan.violations).toEqual([]); expect(scan.errors).toEqual([]);
  });
});
