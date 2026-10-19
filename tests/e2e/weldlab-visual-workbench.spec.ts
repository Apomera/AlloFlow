import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-visual-refresh');
const harness = new GlHarness({
  toolId: 'weldLab', toolFile: 'stem_lab/stem_tool_weldlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 1280, height: 900,
});
test.describe.configure({ mode: 'serial', retries: 0, timeout: 120_000 });
test.use({ video: 'off' });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: any, state: object) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { weldLab: state }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: 'html,body{background:#f8fafc;height:auto}#wrap{width:100%;height:auto;display:block}' });
}

for (const width of [1280, 390]) {
  test(`stage, controls and comparison remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await mount(page, { view: 'beadLab' });
    await expect(page.locator('.weldlab-stage canvas')).toBeVisible();
    const placement = await page.evaluate(() => {
      const rect = (selector: string) => {
        const r = document.querySelector(selector)!.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, bottom: r.bottom };
      };
      return { stage: rect('.weldlab-stage'), controls: rect('.weldlab-controls'),
        canvas: rect('.weldlab-stage canvas'), overflow: document.documentElement.scrollWidth - innerWidth,
        stageFirst: !!(document.querySelector('.weldlab-stage')!.compareDocumentPosition(document.querySelector('.weldlab-controls')!) & Node.DOCUMENT_POSITION_FOLLOWING) };
    });
    expect(placement.canvas.y).toBeLessThan(width < 600 ? 360 : 250);
    expect(placement.overflow).toBeLessThanOrEqual(1);
    expect(placement.stageFirst).toBe(true);
    if (width > 1000) expect(placement.controls.x).toBeGreaterThan(placement.stage.x + placement.stage.width);
    else expect(placement.controls.y).toBeGreaterThanOrEqual(placement.stage.bottom - 1);
    await page.screenshot({ path: resolve(output, `workbench-${width}.png`) });
    await page.getByRole('button', { name: '📌 Pin this bead', exact: true }).click();
    const speed = page.getByRole('slider', { name: 'Travel Speed', exact: true });
    await speed.press('Home');
    for (let i = 0; i < 6; i++) await speed.press('ArrowRight');
    const comparison = page.locator('[data-arc-visual-compare]');
    await expect(comparison).toBeVisible();
    await expect(comparison.getByRole('img')).toHaveCount(2);
    await expect(page.locator('[data-arc-compare]')).toContainText('One variable changed');
    await comparison.screenshot({ path: resolve(output, `comparison-${width}.png`) });
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('#wrap'), {
        runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'nested-interactive'] },
      });
      return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }));
    });
    writeFileSync(resolve(output, `checks-${width}.json`), JSON.stringify({ placement, errors, violations }, null, 2));
    expect(errors).toEqual([]);
    expect(violations).toEqual([]);
    await page.locator('.weldlab-setup summary').click();
    await page.getByRole('radio', { name: 'TIG', exact: true }).click();
    await expect(page.locator('.weldlab-setup summary')).toContainText('TIG');
  });

  test(`home visual previews and portfolio fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mount(page, { view: 'menu' });
    await page.screenshot({ path: resolve(output, `home-${width}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await expect(page.getByRole('heading', { name: 'WeldLab', exact: true })).toBeVisible();
    await page.locator('[data-weld-portfolio] summary').click();
    await expect(page.locator('[data-weld-portfolio-tile="bead"]')).toBeVisible();
    await page.locator('[data-weld-portfolio] summary').click();
    await page.getByRole('radio', { name: 'All modules', exact: true }).click();
    await page.screenshot({ path: resolve(output, `modules-${width}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

test('workbench adapts to a narrow app column inside a wide browser', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await mount(page, { view: 'beadLab' });
  await page.addStyleTag({ content: '#wrap{width:760px;max-width:100%}' });
  await page.waitForFunction(() => {
    const stage = document.querySelector('.weldlab-stage')!.getBoundingClientRect();
    const controls = document.querySelector('.weldlab-controls')!.getBoundingClientRect();
    return controls.top >= stage.bottom;
  });
  const placement = await page.evaluate(() => {
    const stage = document.querySelector('.weldlab-stage')!.getBoundingClientRect();
    const controls = document.querySelector('.weldlab-controls')!.getBoundingClientRect();
    return { stageWidth: stage.width, stageBottom: stage.bottom, controlsTop: controls.top };
  });
  expect(placement.stageWidth).toBeGreaterThan(650);
  expect(placement.controlsTop).toBeGreaterThanOrEqual(placement.stageBottom);
});

test('recorded bead stays consistent in 3D and helmet inspection', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const run = Array.from({ length: 32 }, (_, i) => i < 12 ? 6 : i < 22 ? 22 : 10);
  await mount(page, { view: 'beadLab', arc_handsOn: true, arc_run: run, arc_runHand: true, bl_view: '3d' });
  await expect(page.getByRole('img', { name: /^3D welding scene/ })).toBeVisible();
  await expect.poll(async () => (await harness.glScene(page))?.visibleMeshes || 0).toBeGreaterThan(10);
  const score = await page.locator('[data-arc-verdict]').textContent();
  await page.screenshot({ path: resolve(output, 'recorded-3d.png') });
  await page.getByRole('tab', { name: 'Helmet POV', exact: true }).click();
  await expect(page.locator('[data-arc-verdict]')).toHaveText(score!);
  await page.screenshot({ path: resolve(output, 'recorded-helmet.png') });
});
