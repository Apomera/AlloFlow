import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_treelab.js',
  toolId: 'treeLab',
  preScripts: ['stem_lab/stem_lab_module.js'],
  appStyles: true,
  width: 1180,
  height: 1000,
  extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'],
});

test.describe.configure({ timeout: 300_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: import('@playwright/test').Page) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.treeLab, null, { timeout: 30000 });
  await page.evaluate(() => {
    const E = (window as any).__alloTreeLabEngine;
    const sp = E.speciesById('oak');
    let tree = E.newTree('oak');
    const env = { tempC: 22, light: 0.85, co2ppm: 420, soilWater: 0.75 };
    const alloc = { leaf: 0.3, root: 0.2, wood: 0.35, repro: 0.05, store: 0.1 };
    for (let i = 0; i < 25 && tree.alive; i += 1) tree = E.simulateYear(tree, sp, env, alloc);
    (window as any).__mount({ treeLab: {
      view: 'grow', bandOverride: 'g68', speciesId: 'oak', tree,
      tempC: 22, light: 0.85, co2ppm: 420, soilWater: 0.75, alloc,
    } });
  });
  await page.waitForSelector('#wrap canvas', { timeout: 30000 });
  await page.waitForTimeout(700);
}

const phase = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as any).__toolData?.treeLab?.experiment?.phase || 'idle');

test('completes Predict → Run → Explain and preserves controlled A/B snapshots', async ({ page }) => {
  await mount(page);

  await page.getByRole('button', { name: 'Explore freely', exact: true }).click();
  await page.getByRole('button', { name: /Start investigation/ }).click();
  await expect.poll(() => phase(page)).toBe('predict');

  await page.getByRole('slider', { name: /Soil water/i }).fill('0.3');
  await page.getByLabel(/Which factor will limit growth most often/i).selectOption('water');
  await page.getByLabel(/What will happen to the tree/i).selectOption('struggle');
  await page.getByLabel(/Why do you think so/i).fill('Low soil water should close stomata and reduce carbon gain.');
  await page.getByRole('button', { name: /Lock prediction/ }).click();
  await expect.poll(() => phase(page)).toBe('ready');

  await expect(page.getByRole('button', { name: /Play$/ })).toBeDisabled();
  await expect(page.getByRole('slider', { name: /Soil water/i })).toBeDisabled();
  const locked = await page.evaluate(() => {
    const d = (window as any).__toolData.treeLab;
    return {
      startAge: d.experiment.baseline.tree.age,
      treatmentWater: d.experiment.treatment.env.soilWater,
      snapshot: JSON.stringify(d.experiment.baseline.tree),
    };
  });
  expect(locked.treatmentWater).toBeCloseTo(0.3, 6);

  await page.getByRole('button', { name: /Run trial/ }).click();
  await expect.poll(() => phase(page)).toBe('explain');
  const observed = await page.evaluate(() => {
    const d = (window as any).__toolData.treeLab;
    return {
      years: d.experiment.result.summary.yearsCompleted,
      requested: d.experiment.result.summary.requestedYears,
      endAge: d.tree.age,
      baseline: JSON.stringify(d.experiment.baseline.tree),
      finite: Object.values(d.experiment.result.summary)
        .filter((v: unknown) => typeof v === 'number').every((v: unknown) => Number.isFinite(v)),
    };
  });
  expect(observed.years).toBe(observed.requested);
  expect(observed.endAge).toBe(locked.startAge + observed.years);
  expect(observed.baseline).toBe(locked.snapshot);
  expect(observed.finite).toBe(true);

  await page.getByLabel(/Explain what caused the result/i)
    .fill('Water limited stomatal opening, which reduced the carbon available for growth.');
  await page.getByRole('button', { name: /^A .*Save trial$/ }).click();
  const aBefore = await page.evaluate(() => JSON.stringify((window as any).__toolData.treeLab.experimentTrials.A));
  expect(aBefore).toContain('"speciesId":"oak"');

  await page.getByRole('button', { name: 'Prepare Trial B from A' }).click();
  await expect.poll(() => phase(page)).toBe('predict');
  const restored = await page.evaluate(() => {
    const d = (window as any).__toolData.treeLab;
    return {
      live: JSON.stringify(d.tree),
      baseline: JSON.stringify(d.experiment.baseline.tree),
      a: JSON.stringify(d.experimentTrials.A),
    };
  });
  expect(restored.live).toBe(restored.baseline);
  expect(restored.a).toBe(aBefore);

  await page.getByRole('slider', { name: /Soil water/i }).fill('0.8');
  await page.getByLabel(/Which factor will limit growth most often/i).selectOption('light');
  await page.getByLabel(/What will happen to the tree/i).selectOption('thrive');
  await page.getByRole('button', { name: /Lock prediction/ }).click();
  await page.getByRole('button', { name: /Run trial/ }).click();
  await expect.poll(() => phase(page)).toBe('explain');
  await page.getByRole('button', { name: /^B .*Save trial$/ }).click();

  const notebook = await page.evaluate(() => {
    const d = (window as any).__toolData.treeLab;
    return {
      a: JSON.stringify(d.experimentTrials.A),
      b: JSON.stringify(d.experimentTrials.B),
      sameStart: JSON.stringify(d.experimentTrials.A.baseline.tree) ===
        JSON.stringify(d.experimentTrials.B.baseline.tree),
      serializable: !!JSON.parse(JSON.stringify(d.experimentTrials)).A,
    };
  });
  expect(notebook.a).toBe(aBefore);
  expect(notebook.b).not.toBe(notebook.a);
  expect(notebook.sameStart).toBe(true);
  expect(notebook.serializable).toBe(true);
  await expect(page.getByText(/Controlled pair:/)).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();

  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run('#wrap', { resultTypes: ['violations'] });
    return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.length }));
  });
  expect(violations).toEqual([]);
});

test('uses two columns on a wide screen and a no-overflow stack on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await mount(page);
  const wide = await page.evaluate(() => {
    const workbench = document.querySelector('.allo-tree-workbench') as HTMLElement;
    const scene = document.querySelector('.allo-tree-workbench-scene') as HTMLElement;
    const controls = document.querySelector('.allo-tree-workbench-controls') as HTMLElement;
    const sr = scene.getBoundingClientRect();
    const cr = controls.getBoundingClientRect();
    const missionTop = document.querySelector('.allo-tree-workbench-mission')!.getBoundingClientRect().top;
    return { missionTop, columns: getComputedStyle(workbench).gridTemplateColumns, sticky:
      getComputedStyle(document.querySelector('.allo-tree-workbench-sticky') as HTMLElement).position,
      sceneRight: sr.right, controlsLeft: cr.left, sceneTop: sr.top, controlsTop: cr.top };
  });
  expect(wide.columns.trim().split(/\s+/).length).toBe(2);
  expect(wide.sticky).toBe('sticky');
  expect(wide.sceneRight).toBeLessThanOrEqual(wide.controlsLeft + 2);
  expect(Math.abs(wide.sceneTop - wide.missionTop)).toBeLessThan(3);

  await page.setViewportSize({ width: 600, height: 900 });
  await page.evaluate(() => {
    // The GL harness pins #wrap to its desktop mount width. Resize that host too,
    // or the test would measure 580 px of deliberate harness overflow.
    const wrap = document.getElementById('wrap') as HTMLElement;
    wrap.style.width = '100vw';
    window.dispatchEvent(new Event('resize'));
  });
  await page.waitForTimeout(350);
  const mobile = await page.evaluate(() => {
    const workbench = document.querySelector('.allo-tree-workbench') as HTMLElement;
    const scene = document.querySelector('.allo-tree-workbench-scene') as HTMLElement;
    const controls = document.querySelector('.allo-tree-workbench-controls') as HTMLElement;
    const viewer = document.querySelector('.allo-tree-workbench-scene [role="img"]') as HTMLElement;
    const firstField = document.querySelector('.allo-tree-hero-field') as HTMLElement;
    const label = firstField.querySelector('label')!.getBoundingClientRect();
    const select = firstField.querySelector('select')!.getBoundingClientRect();
    const sr = scene.getBoundingClientRect();
    const cr = controls.getBoundingClientRect();
    return {
      columns: getComputedStyle(workbench).gridTemplateColumns,
      sticky: getComputedStyle(document.querySelector('.allo-tree-workbench-sticky') as HTMLElement).position,
      sceneBottom: sr.bottom, controlsTop: cr.top, viewerHeight: viewer.getBoundingClientRect().height,
      labelBottom: label.bottom, selectTop: select.top,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(mobile.columns.trim().split(/\s+/).length).toBe(1);
  expect(mobile.sticky).toBe('static');
  expect(mobile.controlsTop).toBeGreaterThanOrEqual(mobile.sceneBottom - 2);
  expect(mobile.viewerHeight).toBeGreaterThanOrEqual(280);
  expect(mobile.viewerHeight).toBeLessThanOrEqual(431);
  expect(mobile.selectTop).toBeGreaterThanOrEqual(mobile.labelBottom - 1);
  expect(mobile.overflow).toBeLessThanOrEqual(1);
});