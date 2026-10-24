import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 150_000 });
const report = join(process.cwd(), 'reports/migration-deep-review-round5-2026-10-18');
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
  await harness.mount(page, { migration: { tab: 'flight3d', flightCamera: 'study', flightPaused: true, ...seed } },
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

async function geometry(page: Page) {
  return page.evaluate(() => {
    const record = (window as any).__glCanvas()?.rec;
    const scene = record?.scene, camera = record?.camera, THREE = (window as any).THREE;
    const flock = scene?.getObjectByName('migration-flock');
    if (!flock || !camera) throw new Error('Submitted migration scene is unavailable');
    const bird = flock.children.find((candidate: any) => candidate.visible);
    const point = new THREE.Vector3();
    let modelExtent = 0;
    const namedParts: string[] = [], lobes: any[] = [];
    bird.updateMatrixWorld(true);
    bird.traverse((part: any) => {
      if (part.name) namedParts.push(part.name);
      const positions = part.geometry?.attributes?.position;
      if (!positions) return;
      for (let index = 0; index < positions.count; index++) {
        point.fromBufferAttribute(positions, index).applyMatrix4(part.matrixWorld).project(camera);
        modelExtent = Math.max(modelExtent, Math.abs(point.x), Math.abs(point.y));
      }
      if (/migration-monarch-(forewing|hindwing)$/.test(part.name)) {
        const colors = part.geometry?.attributes?.color;
        const uniqueColors = new Set<string>();
        if (colors) for (let index = 0; index < colors.count; index++) {
          uniqueColors.add([colors.getX(index), colors.getY(index), colors.getZ(index)].map(v => Math.round(v * 255)).join(','));
        }
        lobes.push({ name: part.name, side: part.userData.side, scaleX: part.scale.x,
          vertices: positions.count, colors: uniqueColors.size,
          finite: Array.from(positions.array).every(Number.isFinite),
          vertexColors: part.material.vertexColors });
      }
    });
    const markers = scene.getObjectByName('migration-anatomy-markers');
    const markerBounds = (markers?.visible ? markers.children : []).map((marker: any) => {
      let left = Infinity, right = -Infinity, top = -Infinity, bottom = Infinity;
      marker.traverse((part: any) => {
        const positions = part.geometry?.attributes?.position;
        if (!positions || !part.visible) return;
        for (let ancestor = part.parent; ancestor && ancestor !== markers; ancestor = ancestor.parent) if (!ancestor.visible) return;
        for (let index = 0; index < positions.count; index++) {
          point.fromBufferAttribute(positions, index).applyMatrix4(part.matrixWorld).project(camera);
          left = Math.min(left, point.x); right = Math.max(right, point.x);
          top = Math.max(top, point.y); bottom = Math.min(bottom, point.y);
        }
      });
      return { number: marker.userData.markerNumber, focused: marker.userData.focused === true,
        focusRing: marker.getObjectByName('migration-anatomy-focus-ring')?.visible === true, left, right, top, bottom };
    });
    const anatomy = scene.getObjectByName('migration-anatomy-callouts');
    return { visible: flock.children.filter((candidate: any) => candidate.visible).length,
      selected: flock.children.indexOf(bird), radius: bird.userData.studyRadius, modelExtent, namedParts, lobes,
      markerBounds, anatomy: { visible: anatomy?.visible || false, selected: anatomy?.userData.selectedAnatomyId || null },
      markersSelected: markers?.userData.selectedAnatomyId || null };
  });
}

async function observe(page: Page, region: string, note: string) {
  await page.locator(`[data-study-region="${region}"]`).click();
  const input = page.getByRole('textbox', { name: 'Shape and motion observation', exact: true });
  await expect(input).toBeVisible();
  await input.fill(note);
  await page.getByRole('button', { name: 'Record observation', exact: true }).click();
  await expect(page.locator('[data-study-observation-status]')).toContainText(/recorded|saved/i);
}

test('Migration Monarch has paired patterned forewings and hindwings with a distinct insect body', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(page, { flightSpecies: 'monarch', flightShowAnatomy: true });
  const state = await geometry(page);
  expect(state.visible).toBe(1);
  expect(state.namedParts).toEqual(expect.arrayContaining([
    'migration-monarch-head', 'migration-monarch-thorax', 'migration-monarch-abdomen', 'migration-monarch-antennae'
  ]));
  expect(state.lobes).toHaveLength(4);
  expect(state.lobes.filter(lobe => lobe.name.endsWith('forewing'))).toHaveLength(2);
  expect(state.lobes.filter(lobe => lobe.name.endsWith('hindwing'))).toHaveLength(2);
  for (const lobe of state.lobes) {
    expect(lobe.vertices).toBeGreaterThan(100);
    expect(lobe.colors).toBeGreaterThan(3);
    expect(lobe.vertexColors).toBe(true);
    expect(lobe.finite).toBe(true);
  }
  expect(state.modelExtent).toBeGreaterThan(0.2);
  expect(state.modelExtent).toBeLessThan(0.98);
  expect(state.markerBounds).toEqual([]);
  expect(state.anatomy.visible).toBe(false);
  await writeFile(join(report, 'desktop-monarch-geometry.json'), JSON.stringify(state, null, 2));
  await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-monarch-patterned-wings.png') });
  await page.locator('[data-study-viewpoint="above"]').click();
  await frames(page);
  expect((await geometry(page)).modelExtent).toBeLessThan(0.98);
  await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-monarch-from-above.png') });
});

test('Migration chosen anatomical region is reflected in the submitted scene and markers stay inside high-zoom Study view', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(page, { flightShowAnatomy: true });
  await page.getByRole('combobox', { name: 'Study individual', exact: true }).selectOption('6');
  await page.getByRole('slider', { name: 'Study zoom percent', exact: true }).fill('160');
  await page.locator('[data-study-region="primaries"]').click();
  await expect(page.locator('[data-study-region="primaries"]')).toHaveAttribute('aria-pressed', 'true');
  await frames(page);
  const state = await geometry(page);
  expect(state.selected).toBe(6);
  expect(state.anatomy.visible).toBe(true);
  expect(state.anatomy.selected || state.markersSelected).toBe('primaries');
  expect(state.markerBounds).toHaveLength(4);
  expect(state.markerBounds.filter(marker => marker.focused && marker.focusRing).map(marker => marker.number)).toEqual([3]);
  expect(state.markerBounds.filter(marker => marker.focusRing)).toHaveLength(1);
  for (const bounds of state.markerBounds) {
    expect(bounds.left).toBeGreaterThan(-0.99); expect(bounds.right).toBeLessThan(0.99);
    expect(bounds.bottom).toBeGreaterThan(-0.99); expect(bounds.top).toBeLessThan(0.99);
  }
  await writeFile(join(report, 'desktop-focused-anatomy.json'), JSON.stringify(state, null, 2));
  await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-focused-anatomy.png') });
});

test('Migration observation records preserve species, region and viewpoint while retaining the flight investigation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const notebook = { variable: 'wind', prediction: 'My original flight prediction', trials: [] };
  const missions = { selected: 'wind' };
  await mount(page, { flightStudyBird: 2, flightWind: 8, flightInvestigation: notebook, flightChallenges: missions });
  await page.locator('[data-study-viewpoint="profile"]').click();
  await observe(page, 'head', 'The long bill stays aligned with the body while the wings change angle.');
  await page.getByRole('button', { name: 'Step wingbeat', exact: true }).click();
  await observe(page, 'primaries', 'The outer feathers rotate after the inner wing in this stylized wing cycle.');
  const beforeSwitch = await page.evaluate(() => (window as any).__toolData.migration);
  const records = Object.values(beforeSwitch.flightStudyObservations.records) as any[];
  expect(records).toHaveLength(2);
  expect(records.map(record => record.region)).toEqual(expect.arrayContaining(['head', 'primaries']));
  for (const record of records) {
    expect(record.speciesId).toBe('canada_goose'); expect(record.bird).toBe(2);
    expect(record.yaw).toBe(90); expect(record.pitch).toBe(10);
    expect(record.paused).toBe(true);
  }
  expect(records.find(record => record.region === 'primaries').wingStep).toBe(1);
  expect(beforeSwitch.flightWind).toBe(8);
  expect(beforeSwitch.flightInvestigation).toEqual(notebook);
  expect(beforeSwitch.flightChallenges).toEqual(missions);
  await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption('monarch');
  const disclosure = page.getByRole('group', { name: 'Shape and motion observations', exact: true });
  // Native details are exposed as groups; query the named disclosure directly.
  await expect(disclosure).toContainText('Whole-insect wing motion');
  await expect(page.locator('[data-study-region]')).toHaveCount(0);
  const input = page.getByRole('textbox', { name: 'Shape and motion observation', exact: true });
  await expect(input).toHaveValue('');
  await input.fill('Both patterned wing pairs move together in the insect model.');
  await page.getByRole('button', { name: 'Record observation', exact: true }).click();
  await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption('canada_goose');
  await page.locator('[data-study-region="head"]').click();
  await expect(input).toHaveValue('The long bill stays aligned with the body while the wings change angle.');
  await page.getByRole('button', { name: 'Remove recorded observation', exact: true }).click();
  const after = await page.evaluate(() => (window as any).__toolData.migration);
  expect(Object.values(after.flightStudyObservations.records)).toHaveLength(2);
  expect(after.flightStudyObservations.drafts['canada_goose:head']).toContain('long bill');
  expect(after.flightInvestigation).toEqual(notebook);
  expect(after.flightChallenges).toEqual(missions);
  await page.screenshot({ path: join(report, 'desktop-observation-workflow.png'), fullPage: true });
});

for (const dark of [false, true]) test.describe(`Migration phone ${dark ? 'dark' : 'light'} round5`, () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Magnified anatomy and the observation activity remain readable and accessible', async ({ page }) => {
    await mount(page, { flightShowAnatomy: true });
    if (dark) await page.evaluate(() => {
      (window as any).__ctx.isDark = true; (window as any).__ctx.theme = 'dark';
      document.documentElement.classList.add('dark'); document.body.style.background = '#0f172a';
      (window as any).__rerender();
    });
    await page.getByRole('slider', { name: 'Study zoom percent', exact: true }).fill('160');
    await observe(page, 'primaries', 'I see separate outer feathers move after the inner wing.');
    await frames(page);
    const state = await geometry(page);
    expect(state.markerBounds).toHaveLength(4);
    for (const bounds of state.markerBounds) {
      expect(bounds.left).toBeGreaterThan(-0.99); expect(bounds.right).toBeLessThan(0.99);
      expect(bounds.bottom).toBeGreaterThan(-0.99); expect(bounds.top).toBeLessThan(0.99);
    }
    await page.addScriptTag({ content: axeSource });
    const result = await page.evaluate(async () => {
      const scan = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        violations: scan.violations.map((violation: any) => ({ id: violation.id, nodes: violation.nodes.map((node: any) => ({ target: node.target, summary: node.failureSummary })) })),
        errors: (window as any).__events.errors };
    });
    const name = `mobile-${dark ? 'dark' : 'light'}`;
    await writeFile(join(report, `${name}-observation-review.json`), JSON.stringify({ ...result, scene: state }, null, 2));
    await page.locator('.migration-flight-stage').screenshot({ path: join(report, `${name}-focused-anatomy.png`) });
    await page.screenshot({ path: join(report, `${name}-observation-workflow.png`), fullPage: true });
    expect(result.viewport).toBe(390);
    expect(result.scrollWidth).toBeLessThanOrEqual(result.viewport);
    expect(result.violations).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});
