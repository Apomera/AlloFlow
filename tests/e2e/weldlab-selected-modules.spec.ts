import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-selected-modules');
const harness = new GlHarness({
  toolId: 'weldLab', toolFile: 'stem_lab/stem_tool_weldlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], appStyles: true, layout: 'document',
});
test.describe.configure({ retries: 0, timeout: 120_000 });
test.use({ video: 'off' });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: any, width: number, state: object) {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { weldLab: state }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: 'html,body{height:auto;background:#f8fafc}#wrap{width:100%;height:auto;display:block}' });
}
async function audit(page: any, name: string, selector: string) {
  const result = await page.evaluate(async (selector: string) => {
    const violations = await (window as any).axe.run(document.querySelector(selector), {
      runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'nested-interactive'] },
    });
    return { overflow: document.documentElement.scrollWidth - innerWidth,
      violations: violations.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) })) };
  }, selector);
  writeFileSync(resolve(output, name + '.json'), JSON.stringify(result, null, 2));
  expect(result.overflow).toBeLessThanOrEqual(1);
  expect(result.violations).toEqual([]);
}

for (const width of [1280, 390]) {
  test(`Process Sleuth evidence scene is synchronized and accessible at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await mount(page, width, { view: 'processSleuth', psIdx: 4, psShown: [4] });
    const scene = page.locator('[data-sleuth-scene]');
    const pin = page.locator('[data-sleuth-hotspot="3"]');
    const phrase = page.locator('[data-sleuth-phrase="3"]');
    await expect(scene).toBeVisible();
    await pin.click();
    await expect(phrase).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-sleuth-evidence="3"]')).toContainText('budget');
    await phrase.click();
    await expect(pin).toHaveAttribute('aria-pressed', 'false');
    await pin.press('Space');
    await expect(phrase).toHaveAttribute('aria-pressed', 'true');
    await scene.screenshot({ path: resolve(output, `sleuth-${width}.png`) });
    await audit(page, `sleuth-${width}`, '#wrap');
    await page.getByRole('button', { name: /^Done marking/ }).click();
    await expect(pin).toBeDisabled();
    await page.getByRole('radio', { name: 'MIG (GMAW)', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__toolData.weldLab.psScore)).toBe(1);
    expect(errors).toEqual([]);
  });

  test(`Welding Math drawings retain givens and solution gating at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await mount(page, width, { view: 'mathBlueprint', mb_mode: 'practice', sym2_m_seed: 83 });
    for (const kind of ['plateWeight', 'square', 'filler']) {
      const visual = page.locator(`[data-weld-math-visual="${kind}"]`);
      await expect(visual).toHaveAttribute('data-weld-math-reveal', 'hidden');
      await expect(visual.getByRole('img')).toBeVisible();
      await visual.screenshot({ path: resolve(output, `math-${kind}-${width}.png`) });
      await audit(page, `math-${kind}-${width}`, `[data-sym2-math="${kind}"]`);
    }
    const filler = page.locator('[data-sym2-math="filler"]');
    await expect(filler.getByRole('button', { name: 'Show the worked solution', exact: true })).toHaveCount(0);
    await filler.getByRole('textbox', { name: 'Your answer', exact: true }).fill('0');
    await filler.getByRole('button', { name: 'Check answer', exact: true }).click();
    await expect(filler.locator('[data-weld-math-visual]')).toHaveAttribute('data-weld-math-reveal', 'hidden');
    await filler.getByRole('button', { name: 'Show the worked solution', exact: true }).click();
    await expect(filler.locator('[data-weld-math-visual]')).toHaveAttribute('data-weld-math-reveal', 'shown');
    await expect(filler.locator('[data-weld-math-worked-values]')).toBeVisible();
    await filler.getByRole('button', { name: /^New numbers/ }).click();
    await expect(filler.locator('[data-weld-math-visual]')).toHaveAttribute('data-weld-math-reveal', 'hidden');
    expect(errors).toEqual([]);
  });

  test(`Consumable specimens and cost figures update at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await mount(page, width, { view: 'consumables', cons_mode: 'browse', cons_sect: 'decoder', tech2_cons_code: 'E71T-1C' });
    const specimen = page.locator('[data-cons-specimen]');
    await expect(specimen).toContainText('Flux fill');
    await specimen.screenshot({ path: resolve(output, `consumable-${width}.png`) });
    await audit(page, `consumable-${width}`, '#tech2-dec-result');
    await page.getByRole('button', { name: /Cost economics/ }).click();
    const section = page.locator('[data-cons-cost-section]');
    const original = Number(await section.getAttribute('data-leg-in'));
    await page.getByRole('slider').first().press('End');
    await expect.poll(async () => Number(await section.getAttribute('data-leg-in'))).toBeGreaterThan(original);
    const visuals = page.locator('[data-cons-cost-visuals]');
    await visuals.screenshot({ path: resolve(output, `cost-${width}.png`) });
    await audit(page, `cost-${width}`, '[data-cons-cost-visuals]');
    expect(errors).toEqual([]);
  });
}

for (const [index, thickness] of [[2, 0.5], [3, 0.075]]) {
  test(`Diagnose transfers its ${thickness} inch coupon without clamping`, async ({ page }) => {
    await mount(page, 390, { view: 'defectDiagnose', dd2Idx: index, dd2Ans: true, dd2Shown: [index],
      bl_view: 'helmet', arc_handsOn: true, arc_run: [3, 25, 4, 24], bl_process: 'oxy', bl_material: 'aluminum' });
    await page.getByRole('button', { name: /Open the Bead Lab/ }).click();
    await expect(page.getByRole('heading', { name: 'Weld Bead Lab', exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as any).__toolData.weldLab.bl_thickness)).toBe(thickness);
    await expect(page.getByRole('radio', { name: 'Steady (auto)', exact: true })).toBeChecked();
    const actual = await page.locator('.weldlab-setup summary').textContent();
    expect(actual).toContain(thickness === 0.5 ? '1/2"' : '0.075"');
    await page.getByRole('heading', { name: 'Weld Bead Lab', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: resolve(output, `transferred-${thickness}.png`) });
  });
}

test('Selected evidence and new diagrams remain readable in the host contrast theme', async ({ page }) => {
  async function contrast() {
    await page.evaluate(() => {
      document.body.classList.add('theme-contrast');
      (window as any).__ctx.isContrast = true;
      (window as any).__ctx.theme = 'contrast';
      (window as any).__rerender();
    });
  }
  await mount(page, 390, { view: 'processSleuth', psIdx: 4, psShown: [4] });
  await contrast();
  const pin = page.locator('[data-sleuth-hotspot="3"]');
  await pin.click();
  await expect(pin).toHaveAttribute('aria-pressed', 'true');
  await audit(page, 'sleuth-contrast', '[data-sleuth-scene]');
  await page.locator('[data-sleuth-scene]').screenshot({ path: resolve(output, 'sleuth-contrast.png') });
  await harness.destroy(page);
  await mount(page, 390, { view: 'mathBlueprint', mb_mode: 'practice', sym2_m_seed: 83 });
  await contrast();
  for (const kind of ['plateWeight', 'square', 'filler']) await audit(page, `math-${kind}-contrast`, `[data-weld-math-visual="${kind}"]`);
  await harness.destroy(page);
  await mount(page, 390, { view: 'consumables', cons_mode: 'browse', cons_sect: 'cost' });
  await contrast();
  await audit(page, 'cost-contrast', '[data-cons-cost-visuals]');
  await page.locator('[data-cons-cost-visuals]').screenshot({ path: resolve(output, 'cost-contrast.png') });
});
