import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-depth-refresh');
const harness = new GlHarness({
  toolId: 'weldLab', toolFile: 'stem_lab/stem_tool_weldlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], appStyles: true, layout: 'document',
});
const program = [
  { x: 4, y: 6, m: 'J', w: false }, { x: 12, y: 6, m: 'L', w: true },
  { x: 12, y: 1, m: 'J', w: false }, { x: 1, y: 1, m: 'J', w: false },
];

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
    (window as any).__ctx.isContrast = true;
    (window as any).__ctx.theme = 'contrast';
    (window as any).__rerender();
  });
}
async function captureAndAudit(page: any, name: string, selector: string) {
  const region = page.locator(selector);
  await expect(region).toBeVisible();
  await region.screenshot({ path: resolve(output, name + '.png') });
  const result = await page.evaluate(async (selector: string) => {
    const result = await (window as any).axe.run(document.querySelector(selector), {
      runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'nested-interactive'] },
    });
    return { overflow: document.documentElement.scrollWidth - innerWidth,
      violations: result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) })) };
  }, selector);
  writeFileSync(resolve(output, name + '.json'), JSON.stringify(result, null, 2));
  expect(result.overflow).toBeLessThanOrEqual(1);
  expect(result.violations).toEqual([]);
}

for (const width of [1280, 390]) {
  test(`HAZ probe and microstructure lenses agree at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await mount(page, width, { view: 'metallurgy', met_sect: 'haz', met2_hazPred: 2 });
    const lens = page.locator('[data-met-microstructure]');
    const marker = page.locator('[data-met-haz-probe-marker]');
    for (const zone of ['cg', 'fg', 'ic', 'sc', 'bm', 'fz']) {
      await page.locator(`[data-met-zone-jump="${zone}"]`).click();
      await expect(lens).toHaveAttribute('data-met-microstructure', zone);
      await expect(marker).toHaveAttribute('data-zone', zone);
      const probe = Number(await lens.getAttribute('data-probe-mm'));
      expect(Number(await marker.getAttribute('data-distance-mm'))).toBeCloseTo(probe, 8);
      await expect(page.locator(`[data-met-zone-jump="${zone}"]`)).toHaveAttribute('aria-pressed', 'true');
    }
    await page.locator('[data-met-zone-jump="cg"]').click();
    await expect(lens.locator('[data-met-micro-lens]')).toHaveCount(2);
    await captureAndAudit(page, `metallurgy-${width}`, '[data-met-microstructure]');
    await page.locator('[data-met-haz-cross-section]').screenshot({ path: resolve(output, `haz-probe-${width}.png`) });
    expect(errors).toEqual([]);
  });

  test(`Coupon journey keeps orientation and bend result coherent at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await mount(page, width, { view: 'qualPrep', qp_view: 'bend', pipe2_bend: 'face', pipe2_flaw: 4 });
    const journey = page.locator('[data-pipe2-journey-stage]');
    for (const stage of ['coupon', 'orient', 'bend']) {
      await page.locator(`[data-pipe2-journey-step="${stage}"]`).click();
      await expect(journey).toHaveAttribute('data-pipe2-journey-stage', stage);
    }
    await expect(journey.locator('[data-pipe2-neutral-axis]')).toHaveCount(1);
    await expect(page.locator('[data-pipe2-bend-result]')).toHaveAttribute('data-pipe2-bend-result', 'accept');
    await captureAndAudit(page, `qualification-${width}`, '[data-pipe2-journey-stage]');
    const types = page.getByRole('radiogroup', { name: /bend/i }).first();
    await types.getByRole('radio', { name: /root/i }).click();
    await expect(journey).toHaveAttribute('data-pipe2-journey-type', 'root');
    await expect(journey).toHaveAttribute('data-pipe2-journey-stage', 'bend');
    await expect(page.locator('[data-pipe2-outside-label="root"]')).toBeVisible();
    const flaw = page.getByRole('slider');
    await flaw.press('End');
    await expect(page.locator('[data-pipe2-bend-result]')).toHaveAttribute('data-pipe2-bend-result', 'reject');
    await flaw.press('Home');
    await expect(journey.locator('[data-pipe2-journey-opening]')).toHaveCount(0);
    await expect(page.locator('[data-pipe2-bend-result]')).toHaveAttribute('data-pipe2-bend-result', 'accept');
    expect(errors).toEqual([]);
  });

  test(`Robot inspector scrubs model paths without grading at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await mount(page, width, { view: 'robotic', rob_sect: 'pendant', tech2_rob_prog: program });
    const inspector = page.locator('[data-robot-inspector]');
    await page.locator('[data-robot-inspect-select]').selectOption('1');
    const progress = page.locator('[data-robot-inspect-progress]');
    await progress.press('End');
    await expect(page.locator('[data-robot-inspect-arc]')).toHaveAttribute('data-robot-inspect-arc', 'on');
    await expect(page.locator('[data-robot-inspect-mode]')).toHaveAttribute('data-robot-inspect-mode', 'L');
    expect(Number(await page.locator('[data-robot-inspect-position]').getAttribute('data-x-mm'))).toBeCloseTo(60, 8);
    expect(Number(await page.locator('[data-robot-inspect-position]').getAttribute('data-y-mm'))).toBeCloseTo(30, 8);
    await expect(page.locator('[data-robot-inspect-issues]')).toHaveCount(0);
    if (await page.locator('[data-robot-inspect-open]').textContent() === 'Show selected move') await page.locator('[data-robot-inspect-open]').click();
    await expect(page.locator('[data-robot-torch][data-source="inspection"]')).toHaveCount(1);
    await captureAndAudit(page, `robotics-${width}`, '[data-robot-inspector]');
    await page.locator('[data-robot-workcell]').screenshot({ path: resolve(output, `robot-cell-${width}.png`) });
    await progress.press('Home');
    expect(Number(await page.locator('[data-robot-inspect-position]').getAttribute('data-x-mm'))).toBeCloseTo(20, 8);
    await page.getByRole('button', { name: /Run program/ }).click();
    await expect(page.getByText('✓ Weld complete: seam fully covered, no faults.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Load the next part 5 mm off/ }).click();
    await expect(page.getByText('✓ Weld complete: seam fully covered, no faults.', { exact: true })).toHaveCount(0);
    await expect(page.locator('[data-robot-inspect-issues]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('New learning visuals remain readable in the contrast theme', async ({ page }) => {
  await mount(page, 390, { view: 'metallurgy', met_sect: 'haz', met2_hazPred: 2 }, true);
  await page.locator('[data-met-zone-jump="ic"]').click();
  await captureAndAudit(page, 'metallurgy-contrast', '[data-met-microstructure]');
  await harness.destroy(page);
  await mount(page, 390, { view: 'qualPrep', qp_view: 'bend' }, true);
  await page.locator('[data-pipe2-journey-step="bend"]').click();
  await captureAndAudit(page, 'qualification-contrast', '[data-pipe2-journey-stage]');
  await harness.destroy(page);
  await mount(page, 390, { view: 'robotic', rob_sect: 'pendant', tech2_rob_prog: program }, true);
  await page.locator('[data-robot-inspect-select]').selectOption('1');
  await captureAndAudit(page, 'robotics-contrast', '[data-robot-inspector]');
});

test('Local preview opens the enhanced modules without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(harness.url + '/tmp/weld-review/index.html#qualification');
  await expect(page.locator('[data-pipe2-journey-stage]')).toBeVisible();
  await page.getByRole('button', { name: 'HAZ Explorer', exact: true }).click();
  await expect(page.locator('[data-met-microstructure]')).toBeVisible();
  await page.getByRole('button', { name: 'Robot workcell', exact: true }).click();
  await expect(page.locator('[data-robot-inspector]')).toBeVisible();
  expect(errors).toEqual([]);
});
