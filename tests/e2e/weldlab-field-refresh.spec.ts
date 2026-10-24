import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-field-refresh');
const harness = new GlHarness({ toolId: 'weldLab', toolFile: 'stem_lab/stem_tool_weldlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], appStyles: true, layout: 'document' });
test.describe.configure({ retries: 0, timeout: 120_000 });
test.use({ video: 'off' });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: any, width: number, state: object, contrast = false) {
  await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' });
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
    const audit = await (window as any).axe.run(document.querySelector(selector), { runOnly: { type: 'rule',
      values: ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'nested-interactive'] } });
    return { overflow: document.documentElement.scrollWidth - innerWidth, overflowNodes: [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1 && !el.closest('[data-noise-chart-scroll],.overflow-x-auto,.preview-bar')).slice(0, 12).map(el => ({ tag: el.tagName, className: el.getAttribute('class'), right: el.getBoundingClientRect().right })), violations: audit.violations.map((v: any) => ({ id: v.id,
      nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) })) };
  }, selector);
  writeFileSync(resolve(output, name + '.json'), JSON.stringify(result, null, 2));
  expect(result.overflow).toBeLessThanOrEqual(1); expect(result.violations).toEqual([]);
}



for (const width of [1280, 390]) {
  test('Qualification path follows the two authored retry loops at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await mount(page, width, { view: 'codes', insp2_codesTab: 'flow', insp2_sortAnswers: { 0: 1 }, insp2_clauseAnswers: { 0: 2 } });
    const saved = await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab));
    for (const [from, to] of [[3, 1], [7, 6]]) {
      await page.locator('[data-codes-flow-step="' + from + '"]').click();
      await page.locator('[data-codes-flow-route="retry"]').focus(); await page.keyboard.press('Space');
      await expect(page.locator('[data-codes-flow-connection]')).toHaveAttribute('data-from', String(from));
      await expect(page.locator('[data-codes-flow-connection]')).toHaveAttribute('data-to', String(to));
      await expect(page.locator('[data-codes-flow-edge="' + from + ':' + to + '"]')).toHaveAttribute('data-highlight', 'true');
      await page.locator('[data-codes-flow-next]').click();
      await expect(page.locator('[data-codes-workflow]')).toHaveAttribute('data-step', String(to));
      await expect(page.locator('[data-codes-flow-node="' + to + '"]')).toHaveAttribute('data-selected', 'true');
    }
    await page.locator('[data-codes-flow-next]').click();
    await expect(page.locator('[data-codes-workflow]')).toHaveAttribute('data-step', '7');
    await page.locator('[data-codes-flow-route="forward"]').click(); await page.locator('[data-codes-flow-next]').click();
    await expect(page.locator('[data-codes-workflow]')).toHaveAttribute('data-step', '8');
    await expect(page.locator('[data-codes-flow-next]')).toBeDisabled();
    await expect(page.locator('[data-codes-flow-reading]')).toContainText('WPQ:');
    await page.locator('[data-codes-flow-prev]').click();
    await expect(page.locator('[data-codes-workflow]')).toHaveAttribute('data-step', '7');
    await page.locator('[data-codes-flow-route="retry"]').click();
    await page.locator('[data-codes-flow-all] summary').click();
    await inspect(page, 'workflow-' + width, '[data-codes-workflow]');
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab))).toBe(saved); expect(errors).toEqual([]);
  });
  test('Orbital head position is geometric exploration and preserves pipe work at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await mount(page, width, { view: 'pipeWelding', pipe_sect: 'orbital', pipe2_stack: ['root', 'hot', 'fill'], pipe2_dir: 'uphill' });
    const saved = await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab));
    await page.locator('[data-pipe-orbital-stage="program"]').click();
    await expect(page.locator('[data-pipe-orbital-fields]')).toBeVisible();
    await page.locator('[data-pipe-orbital-stage="observe"]').focus(); await page.keyboard.press('Space');
    const points: { x: number; y: number }[] = [];
    for (const stop of [0, 90, 180, 270, 360]) {
      await page.locator('[data-pipe-orbital-stop="' + stop + '"]').click();
      await expect(page.locator('[data-pipe-orbital]')).toHaveAttribute('data-angle', String(stop));
      await expect(page.locator('[data-pipe-orbital-torch]')).toHaveAttribute('data-angle', String(stop));
      points.push(await page.locator('[data-pipe-orbital-torch]').evaluate((el: any) => ({ x: Number(el.dataset.x), y: Number(el.dataset.y) })));
    }
    expect(points[0].x).toBeCloseTo(points[4].x, 6); expect(points[0].y).toBeCloseTo(points[4].y, 6);
    expect(Math.abs(points[1].x - points[3].x)).toBeGreaterThan(50); expect(Math.abs(points[0].y - points[2].y)).toBeGreaterThan(50);
    await page.locator('[data-pipe-orbital-angle]').fill('308');
    const calloutGap = await page.evaluate(() => { const a = document.querySelector('[data-pipe-orbital-marker="1"] circle')!, b = document.querySelector('[data-pipe-orbital-marker="3"] circle')!; const n = (el: Element, key: string) => Number(el.getAttribute(key)); return Math.hypot(n(a, 'cx') - n(b, 'cx'), n(a, 'cy') - n(b, 'cy')) - n(a, 'r') - n(b, 'r'); });
    expect(calloutGap).toBeGreaterThan(0);
    await page.locator('[data-pipe-orbital-angle]').fill('135');
    await expect(page.locator('[data-pipe-orbital]')).toHaveAttribute('data-angle', '135');
    await inspect(page, 'orbital-' + width, '[data-pipe-orbital]');
    await page.locator('[data-pipe-orbital-stage="record"]').click();
    await expect(page.locator('[data-pipe-orbital-fields]')).toBeVisible();
    await page.locator('[data-pipe-orbital-stage="observe"]').click();
    await expect(page.locator('[data-pipe-orbital-angle]')).toHaveValue('135');
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab))).toBe(saved); expect(errors).toEqual([]);
  });
  test('Stainless grain-boundary comparison shows the authored mechanism at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await mount(page, width, { view: 'metallurgy', met_sect: 'stainless', met2_cdPicks: { 0: 1 } });
    const saved = await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab));
    await expect(page.locator('[data-met-sens-carbide]')).toHaveCount(0);
    await page.locator('[data-met-sens-stage="carbides"]').click();
    expect(await page.locator('[data-met-sens-carbide]').count()).toBeGreaterThan(0);
    await expect(page.locator('[data-met-sens-attack]')).toHaveCount(0);
    await page.locator('[data-met-sens-stage="attack"]').focus(); await page.keyboard.press('Space');
    await page.locator('[data-met-sens-compare]').click();
    await expect(page.locator('[data-met-sens-scene="reference"]')).toHaveAttribute('data-stage', 'available');
    await expect(page.locator('[data-met-sens-scene="selected"]')).toHaveAttribute('data-stage', 'attack');
    expect(await page.locator('[data-met-sens-scene="selected"] [data-met-sens-attack]').count()).toBeGreaterThan(0);
    await expect(page.locator('[data-met-sens-scene="reference"] [data-met-sens-carbide]')).toHaveCount(0);
    const viewBoxes = await page.locator('[data-met-sens-diagram]').evaluateAll((els: any[]) => els.map(el => el.getAttribute('viewBox')));
    expect(viewBoxes).toHaveLength(2); expect(viewBoxes[0]).toBe(viewBoxes[1]);
    await inspect(page, 'stainless-' + width, '[data-met-sensitization]');
    await page.locator('[data-met-sens-stage="available"]').click();
    await expect(page.locator('[data-met-sens-scene]')).toHaveCount(1);
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab))).toBe(saved); expect(errors).toEqual([]);
  });
}
test('Path, head and grain-boundary controls remain readable in high contrast', async ({ page }) => {
  for (const [name, state, selector] of [
    ['workflow', { view: 'codes', insp2_codesTab: 'flow' }, '[data-codes-workflow]'],
    ['orbital', { view: 'pipeWelding', pipe_sect: 'orbital' }, '[data-pipe-orbital]'],
    ['stainless', { view: 'metallurgy', met_sect: 'stainless' }, '[data-met-sensitization]']
  ] as const) {
    await mount(page, 390, state, true);
    if (name === 'workflow') { await page.locator('[data-codes-flow-step="3"]').click(); await page.locator('[data-codes-flow-route="retry"]').click(); }
    if (name === 'orbital') { await page.locator('[data-pipe-orbital-stage="observe"]').click(); await page.locator('[data-pipe-orbital-angle]').fill('135'); }
    if (name === 'stainless') { await page.locator('[data-met-sens-stage="attack"]').click(); await page.locator('[data-met-sens-compare]').click(); }
    await inspect(page, name + '-contrast', selector);
  }
});
test('Local preview routes expose qualification, orbital and stainless lessons', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('http://127.0.0.1:8741/tmp/weld-review/index.html?pass=field#workflow');
  await expect(page.locator('[data-codes-workflow]')).toBeVisible();
  await page.getByRole('button', { name: 'Orbital weld head', exact: true }).click();
  await expect(page.locator('[data-pipe-orbital]')).toBeVisible();
  await page.getByRole('button', { name: 'Stainless boundaries', exact: true }).click();
  await expect(page.locator('[data-met-sensitization]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
