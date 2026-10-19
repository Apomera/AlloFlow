import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-remaining-refresh');
const harness = new GlHarness({ toolId: 'weldLab', toolFile: 'stem_lab/stem_tool_weldlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], appStyles: true, layout: 'document' });
const entry = { foundCount: 2, classifiedCount: 1, missCount: 0, sampleIds: ['sampleA'] };
const catalog = { porosity: entry, lackOfFusion: entry };
test.describe.configure({ retries: 0, timeout: 120_000 });
test.use({ video: 'off' });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: any, width: number, state: object, contrast = false) {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { weldLab: state }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: 'html,body{height:auto;background:#f8fafc}#wrap{width:100%;height:auto;display:block}' });
  if (contrast) await page.evaluate(() => {
    document.body.classList.add('theme-contrast');
    (window as any).__ctx.isContrast = true; (window as any).__ctx.theme = 'contrast'; (window as any).__rerender();
  });
}
async function inspect(page: any, name: string, selector: string) {
  await expect(page.locator(selector)).toBeVisible();
  await page.locator(selector).screenshot({ path: resolve(output, name + '.png') });
  const result = await page.evaluate(async (selector: string) => {
    const a = await (window as any).axe.run(document.querySelector(selector), {
      runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'nested-interactive'] } });
    return { overflow: document.documentElement.scrollWidth - innerWidth,
      violations: a.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) })) };
  }, selector);
  writeFileSync(resolve(output, name + '.json'), JSON.stringify(result, null, 2));
  expect(result.overflow).toBeLessThanOrEqual(1); expect(result.violations).toEqual([]);
}

for (const width of [1280, 390]) {
  test(`Maine route choices unlock the same modeled timeline at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, { view: 'maineEcosystem' });
    await page.locator('[data-maine-route-node="emcc_boatyard"]').click();
    await expect(page.locator('[data-maine-network]')).toHaveAttribute('data-maine-network', 'emcc_boatyard');
    const expected = await page.evaluate(() => (window as any).__WeldLabCore.car2RoadTotals('emcc', null, null).total);
    expect(Number(await page.locator('[data-maine-entry-total]').getAttribute('data-maine-entry-total'))).toBe(expected);
    await inspect(page, `maine-routes-${width}`, '[data-maine-network]');
    await page.locator('[data-maine-open-route]').click();
    await expect(page.locator('[data-maine-timeline]')).toHaveAttribute('data-available-years', '2');
    await expect(page.locator('[data-maine-year-node="4"]')).toBeDisabled();
    await page.getByRole('radiogroup', { name: /^Decision 1/ }).getByRole('radio', { name: /Stay on this track/ }).click();
    await expect(page.locator('[data-maine-timeline]')).toHaveAttribute('data-available-years', '4');
    await page.getByRole('radiogroup', { name: /^Decision 2/ }).getByRole('radio', { name: /Take CWI prep/ }).click();
    await expect(page.locator('[data-maine-timeline]')).toHaveAttribute('data-available-years', '8');
    await page.locator('[data-maine-year-node="4"]').click();
    const pay = await page.evaluate(() => (window as any).__WeldLabCore.car2RoadTotals('emcc', 'stay', 'cwi').years[4]);
    expect(Number(await page.locator('[data-maine-year-detail]').getAttribute('data-year-pay'))).toBe(pay);
    await inspect(page, `maine-timeline-${width}`, '[data-maine-timeline]');
    expect(errors).toEqual([]);
  });

  test(`Shop stations and checklist share observations at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, { view: 'safetyHealth', sh_mode: 'audit' });
    await page.locator('[data-shop-answer="lev:yes"]').click();
    await expect(page.locator('[data-audit-answer="lev:yes"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-shop-control="lev"]')).toHaveAttribute('data-state', 'yes');
    await page.locator('[data-audit-answer="lev:no"]').click();
    await expect(page.locator('[data-shop-answer="lev:no"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-shop-answer="lev:yes"]').click();
    await page.locator('[data-shop-answer="papr:na"]').click();
    await page.locator('[data-shop-hotspot="electrical"]').click();
    await expect(page.locator('[data-shop-station-panel]')).toHaveAttribute('data-shop-station-panel', 'electrical');
    await page.locator('[data-shop-answer="cables_inspected:yes"]').click();
    await expect(page.locator('[data-shop-lead-route]')).toHaveAttribute('data-shop-lead-route', 'reported-inspected');
    const detail = page.locator('[data-shop-station-detail="electrical"]');
    await expect(detail).toBeVisible();
    expect(await detail.locator('use').evaluate((use: SVGGraphicsElement) => use.getBBox().width)).toBeGreaterThan(200);
    await detail.screenshot({ path: resolve(output, `shop-station-${width}.png`) });
    await expect(page.locator('[data-shop-progress]')).toHaveAttribute('data-shop-progress', '3');
    await page.locator('[data-shop-scene]').screenshot({ path: resolve(output, `shop-scene-${width}.png`) });
    await inspect(page, `shop-${width}`, '[data-shop-inspection]');
    expect(errors).toEqual([]);
  });

  test(`Specimen atlas compares unlocked views and hides references during recall at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, { view: 'defectCatalog', defectCatalog: catalog });
    await page.locator('[data-catalog-mode="compare"]').click();
    await expect(page.locator('[data-catalog-specimen]')).toHaveCount(2);
    await page.locator('[data-catalog-loupe="detail"]').click();
    await expect(page.locator('[data-catalog-atlas]')).toHaveAttribute('data-catalog-zoom', 'detail');
    await expect(page.locator('[data-catalog-section] canvas')).toHaveCount(2);
    await inspect(page, `catalog-${width}`, '[data-catalog-atlas]');
    await page.getByRole('button', { name: /Start a 2-card review/ }).click();
    await expect(page.locator('[data-catalog-atlas]')).toHaveCount(0);
    await expect(page.locator('[data-catalog-review-active]')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test(`WPS field selection links the form and physical setup at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, { view: 'codes', insp2_codesTab: 'flow' });
    for (const field of ['joint', 'filler', 'gas', 'preheat', 'elec', 'travel', 'pqr', 'pwht', 'pos', 'base', 'process']) {
      await page.locator('[data-wps-field-select]').selectOption(field);
      await expect(page.locator(`[data-wps-form-field="${field}"]`)).toHaveAttribute('aria-checked', 'true');
      await expect(page.locator('[data-wps-workbench-scene]')).toHaveAttribute('data-wps-workbench-scene', field);
    }
    await page.locator('[data-wps-form-field="joint"]').click();
    await expect(page.locator('[data-wps-field-select]')).toHaveValue('joint');
    await expect(page.locator('[data-wps-field-value]')).toContainText('Single-V groove');
    await inspect(page, `wps-${width}`, '[data-wps-workbench]');
    expect(errors).toEqual([]);
  });
}

test('Remaining-module visuals retain contrast and readable controls', async ({ page }) => {
  const states = [
    ['maine', { view: 'maineEcosystem' }, '[data-maine-network]'],
    ['shop', { view: 'safetyHealth', sh_mode: 'audit', sh_audit: { lev: 'yes', papr: 'na' } }, '[data-shop-inspection]'],
    ['catalog', { view: 'defectCatalog', defectCatalog: catalog }, '[data-catalog-atlas]'],
    ['wps', { view: 'codes', insp2_codesTab: 'flow', insp2_wpsField: 'gas' }, '[data-wps-workbench]'],
  ] as const;
  for (const [name, state, selector] of states) {
    await mount(page, 390, state, true);
    await inspect(page, name + '-contrast', selector);
    await harness.destroy(page);
  }
});

test('Local preview links the four new activities', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(harness.url + '/tmp/weld-review/index.html?pass=remaining#maine');
  await expect(page.locator('[data-maine-network]')).toBeVisible();
  for (const [label, selector] of [['Shop inspection', '[data-shop-inspection]'], ['Specimen atlas', '[data-catalog-atlas]'], ['WPS workbench', '[data-wps-workbench]']]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator(selector)).toBeVisible();
  }
  expect(errors).toEqual([]);
});
