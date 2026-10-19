import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-next-refresh');
const harness = new GlHarness({ toolId: 'weldLab', toolFile: 'stem_lab/stem_tool_weldlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], appStyles: true, layout: 'document' });
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
  test(`Heat Input follows energy and responds to keyboard and settings at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, { view: 'heatInput', hi3_progress: 50, hi_TS: 12 });
    const energy = page.locator('[data-hi-energy-balance]');
    expect(Number(await energy.getAttribute('data-gross'))).toBeCloseTo(9.9, 8);
    await page.locator('[data-hi-distance-control]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-hi-distance]')).toHaveText('0.51 in / 1.00 in');
    await page.locator('[data-hi-stop="100"]').click();
    await expect(page.locator('[data-hi-energy-value="time"]')).toHaveText('5.00 s');
    await page.getByRole('slider', { name: 'Travel Speed', exact: true }).fill('24');
    await expect(page.locator('[data-hi-energy-value="time"]')).toHaveText('2.50 s');
    expect(Number(await energy.getAttribute('data-gross'))).toBeCloseTo(9.9, 8);
    await page.getByRole('radio', { name: 'TIG / GTAW', exact: true }).click();
    expect(Number(await energy.getAttribute('data-delivered'))).toBeCloseTo(9.9 * 0.7, 8);
    await inspect(page, `heat-${width}`, '[data-hi-energy-run]');
    expect(errors).toEqual([]);
  });

  test(`Pipe passes can be inspected without rebuilding the stack at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, { view: 'pipeWelding', pipe_sect: 'passes', pipe2_wall: 0.432, pipe2_stack: ['root', 'hot', 'fill', 'fill'] });
    await page.locator('[data-pipe-pass-node="0"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-pipe-pass-detail]')).toHaveAttribute('data-pass-type', 'root');
    await expect(page.locator('[data-pipe-groove-bead="0"]')).toHaveAttribute('data-selected', 'true');
    await expect(page.locator('[data-pipe-groove-bead="3"]')).toHaveAttribute('opacity', '0.3');
    expect(await page.evaluate(() => (window as any).__toolData.weldLab.pipe2_stack)).toEqual(['root', 'hot', 'fill', 'fill']);
    await page.getByRole('button', { name: '＋ Fill', exact: true }).click();
    await expect(page.locator('[data-pipe-pass-node]')).toHaveCount(5);
    await expect(page.locator('[data-pipe-pass-detail]')).toHaveAttribute('data-pipe-pass-detail', '4');
    await page.getByRole('button', { name: '↶ Undo', exact: true }).click();
    await expect(page.locator('[data-pipe-pass-node]')).toHaveCount(4);
    await page.locator('[data-pipe-pass-node="2"]').click();
    await page.locator('[data-pipe-zoom="close"]').click();
    await expect(page.locator('[data-pipe-groove]')).toHaveAttribute('data-pipe-groove-view', 'close');
    await page.locator('[data-pipe-groove]').screenshot({ path: resolve(output, `pipe-groove-${width}.png`) });
    await inspect(page, `pipe-${width}`, '[data-pipe-pass-inspector]');
    expect(errors).toEqual([]);
  });

  test(`PPE scenes expose given facts and preserve first-answer locking at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, { view: 'ppeSafety', ps_view: 'scenarios' });
    for (let i = 1; i <= 7; i++) {
      await page.getByRole('button', { name: 'Scenario ' + i, exact: true }).click();
      await page.locator('[data-ppe-case-detail="2"]').click();
      await expect(page.locator('[data-ppe-case-scene]')).toHaveAttribute('data-ppe-case-scene', 'sc' + i);
      await expect(page.locator('[data-ppe-case-scene]')).toHaveAttribute('data-ppe-case-focus', '2');
      await expect(page.locator('[data-ppe-case-fact]')).not.toBeEmpty();
      await inspect(page, `ppe-case-${i}-${width}`, '[data-ppe-case-scene]');
    }
    expect(await page.evaluate(() => (window as any).__toolData.weldLab.safe2_scPick)).toBeUndefined();
    await page.getByRole('button', { name: 'Scenario 1', exact: true }).click();
    await expect(page.locator('[data-ppe-case-scene]')).toHaveAttribute('data-ppe-case-focus', '2');
    const choices = page.getByRole('radiogroup', { name: 'Response choices', exact: true }).getByRole('radio');
    await choices.nth(0).click();
    const pick = await page.evaluate(() => (window as any).__toolData.weldLab.safe2_scPick);
    await expect(choices.nth(1)).toHaveAttribute('aria-disabled', 'true');
    await choices.nth(1).click({ force: true });
    expect(await page.evaluate(() => (window as any).__toolData.weldLab.safe2_scPick)).toEqual(pick);
    expect(errors).toEqual([]);
  });

  test(`Underwater cooling probe follows exact curves and prediction gates at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, { view: 'underwater', uw_view: 'pressure', uw_depth: 30 });
    await expect(page.locator('[data-uw-cooling-probe]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Skip the prediction', exact: true }).click();
    await expect(page.locator('[data-uw-cooling-probe]')).toBeVisible();
    await page.locator('[data-uw-probe-jump="wet:500"]').click();
    expect(Number(await page.locator('[data-uw-probe-reading="wet"]').getAttribute('data-temperature-c'))).toBeCloseTo(500, 8);
    await expect(page.locator('[data-uw-probe-card="wet"]')).toHaveAttribute('data-band', 't85');
    await page.locator('[data-uw-probe-time]').fill('3');
    await page.getByRole('slider', { name: 'Depth', exact: true }).fill('150');
    await expect(page.locator('[data-uw-cooling-probe]')).toHaveAttribute('data-uw-cooling-probe', '3');
    const expected = await page.evaluate(() => {
      const tech = (window as any).__WeldLabCore.tech2;
      return tech.coolTemp(tech.coolingMultiple('wet', 150), 3);
    });
    expect(Number(await page.locator('[data-uw-probe-reading="wet"]').getAttribute('data-temperature-c'))).toBeCloseTo(expected, 8);
    await inspect(page, `underwater-${width}`, '[data-uw-cooling-probe]');
    await page.locator('[data-uw-cooling-graph]').screenshot({ path: resolve(output, `underwater-graph-${width}.png`) });
    expect(errors).toEqual([]);
  });
}

test('New manual activities retain contrast and labelled controls', async ({ page }) => {
  for (const [name, state, selector] of [
    ['heat', { view: 'heatInput', hi3_progress: 37 }, '[data-hi-energy-run]'],
    ['pipe', { view: 'pipeWelding', pipe_sect: 'passes', pipe2_stack: ['root', 'hot', 'fill', 'fill'] }, '[data-pipe-pass-inspector]'],
    ['ppe', { view: 'ppeSafety', ps_view: 'scenarios', safe2_scIdx: 6 }, '[data-ppe-case-scene]'],
    ['underwater', { view: 'underwater', uw_view: 'pressure', tech2_uw_pred: 'skip' }, '[data-uw-cooling-probe]'],
  ] as const) {
    await mount(page, 390, state, true);
    await inspect(page, name + '-contrast', selector);
    await harness.destroy(page);
  }
});

test('Local preview reaches the four new activities', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(harness.url + '/tmp/weld-review/index.html?pass=next#heat');
  await expect(page.locator('[data-hi-energy-run]')).toBeVisible();
  for (const [label, selector] of [['Pipe layers', '[data-pipe-pass-inspector]'], ['Hazard cases', '[data-ppe-case-scene]'], ['Cooling probe', '[data-uw-probe-time]']]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    if (label === 'Cooling probe') await page.getByRole('button', { name: 'Skip the prediction', exact: true }).click();
    await expect(page.locator(selector)).toBeVisible();
  }
  expect(errors).toEqual([]);
});
