import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-sequence-refresh');
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
    const audit = await (window as any).axe.run(document.querySelector(selector), { runOnly: { type: 'rule',
      values: ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'nested-interactive'] } });
    return { overflow: document.documentElement.scrollWidth - innerWidth,
      overflowNodes: [...document.querySelectorAll('body *')].filter(el => el instanceof HTMLElement && el.getBoundingClientRect().right > innerWidth + 1 && !el.closest('.overflow-x-auto,.preview-bar')).slice(0, 12).map(el => ({ tag: el.tagName, right: el.getBoundingClientRect().right })),
      violations: audit.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) })) };
  }, selector);
  writeFileSync(resolve(output, name + '.json'), JSON.stringify(result, null, 2));
  expect(result.overflow).toBeLessThanOrEqual(1); expect(result.overflowNodes).toEqual([]); expect(result.violations).toEqual([]);
}
const saved = (page: any) => page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab));
const number = async (node: any, attr: string) => Number(await node.getAttribute(attr));
async function range(input: any, value: number) {
  await input.evaluate((element: HTMLInputElement, value: number) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
const planState = { view: 'ppeSafety', ps_view: 'floor', safe2_plan: null, safe2_scPick: { 1: 2 } };
const rtState = { view: 'inspection', insp_sect: 'ndt', insp2_ndtMode: 'choose', insp2_ndtDemo: 'rt', insp2_rtAngle: 25 };
const bidState = { view: 'mathBlueprint', mb_mode: 'browse', mb_sect: 'estimate', sym2_m_seed: 12345, sym2_m_rounds: {}, sym2_m_score: 4, sym2_m_tries: 8 };
const bidProblem = (page: any) => page.locator('[data-sym2-math="bid"]');
async function revealBid(page: any) {
  const problem = bidProblem(page); await problem.locator('#sym2-m-in-bid').fill('0');
  await problem.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(problem.locator('[data-bid-rate]')).toHaveCount(0);
  await problem.getByRole('button', { name: 'Show the worked solution', exact: true }).click();
}
for (const width of [1280, 390]) {
  test('Plan ruler follows exact selection, nudging and live dragging at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, planState); const panel = page.locator('[data-plan-ruler]');
    const before = await saved(page), toggle = panel.locator('[data-plan-ruler-toggle]');
    await expect(page.locator('[data-plan-ruler-overlay]')).toHaveCount(0);
    await toggle.focus(); await page.keyboard.press('Space');
    const points = await page.evaluate(() => (window as any).__WeldLabCore.SAFE2_PLAN_START);
    const choices = page.getByRole('radiogroup', { name: 'Pick an item to move', exact: true }).getByRole('radio');
    let index = 0;
    for (const [id, point] of Object.entries(points) as [string, any][]) {
      await choices.nth(index++).click(); await expect(panel).toHaveAttribute('data-plan-ruler', id);
      expect(await number(panel, 'data-distance')).toBeCloseTo(Math.hypot(point.x - 30, point.y - 28), 10);
      const line = page.locator('[data-plan-ruler-direct]');
      expect(await number(line, 'x1')).toBe(150); expect(await number(line, 'y1')).toBe(140);
      expect(await number(line, 'x2')).toBe(point.x * 5); expect(await number(line, 'y2')).toBe(point.y * 5);
    }
    expect(await saved(page)).toBe(before); await choices.first().click();
    await page.getByRole('button', { name: 'Move right 5 ft', exact: true }).click();
    await expect(panel).toHaveAttribute('data-x', '53');
    const svg = page.locator('svg[viewBox="0 0 500 300"]'); await svg.scrollIntoViewIfNeeded();
    const box = (await svg.boundingBox())!;
    await page.mouse.move(box.x + box.width * .53, box.y + box.height * .2); await page.mouse.down();
    await page.mouse.move(box.x + box.width * .70, box.y + box.height * 34 / 60, { steps: 4 });
    await expect(panel).toHaveAttribute('data-x', '70'); await expect(panel).toHaveAttribute('data-y', '34');
    expect(await page.evaluate(() => (window as any).__toolData.weldLab.safe2_plan.cardboard.x)).toBe(53);
    await page.mouse.up(); expect(await page.evaluate(() => (window as any).__toolData.weldLab.safe2_plan.cardboard.x)).toBe(70);
    await expect(page.getByText(/of 8 rules met/)).toHaveCount(0);
    expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await inspect(page, 'plan-ruler-' + width, '[data-plan-ruler-workspace]'); expect(errors).toEqual([]);
  });

  test('Two RT angles preserve geometry, model readings and saved work at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, rtState); const panel = page.locator('[data-rt-angle-pair]'), before = await saved(page);
    const original = await page.locator('svg[aria-label^="RT demo:"]').evaluate(el => el.outerHTML);
    await expect(panel).not.toHaveAttribute('open', ''); await panel.locator('summary').focus(); await page.keyboard.press('Enter');
    for (const angle of [0, 5, 10, 45, 90]) {
      await range(panel.locator('[data-rt-angle-probe="a"]'), angle);
      const path = await page.evaluate(angle => (window as any).__WeldLabCore.insp2RtPath(angle, .25, .004), angle);
      const card = panel.locator('[data-rt-angle-reading="a"]');
      expect(await number(card, 'data-path')).toBeCloseTo(path, 10); expect(await number(card, 'data-share')).toBeCloseTo(path / .5, 10);
      const film = card.locator('svg rect').nth(3); expect(await number(film, 'fill-opacity')).toBeCloseTo(Math.min(1, path / .5 / .1), 10);
    }
    await panel.locator('[data-rt-angle-current="b"]').click(); await expect(panel.locator('[data-rt-angle-reading="b"]')).toHaveAttribute('data-angle', '25');
    await panel.locator('[data-rt-angle-probe="a"]').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
    await expect(panel.locator('[data-rt-angle-reading="a"]')).toHaveAttribute('data-angle', '1');
    await range(panel.locator('[data-rt-angle-probe="a"]'), 0); await range(panel.locator('[data-rt-angle-probe="b"]'), 45);
    expect(await saved(page)).toBe(before); expect(await page.locator('svg[aria-label^="RT demo:"]').evaluate(el => el.outerHTML)).toBe(original);
    for (const svg of await panel.locator('svg').all()) {
      const label = await svg.locator('text').evaluate((el: SVGTextElement) => { const b = el.getBBox(); return { right: b.x + b.width, bottom: b.y + b.height, size: parseFloat(getComputedStyle(el).fontSize) * el.ownerSVGElement!.getBoundingClientRect().width / 320 }; });
      expect(label.right).toBeLessThanOrEqual(320); expect(label.bottom).toBeLessThanOrEqual(220); expect(label.size).toBeGreaterThanOrEqual(10);
    }
    await inspect(page, 'rt-angles-' + width, '[data-rt-angle-pair]'); expect(errors).toEqual([]);
  });

  test('Bid rate comparison follows the revealed three-term problem at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); await mount(page, width, bidState);
    await expect(page.locator('[data-bid-rate]')).toHaveCount(0); await revealBid(page);
    const panel = page.locator('[data-bid-rate]'); await expect(panel).not.toHaveAttribute('open', '');
    await panel.locator('summary').focus(); await page.keyboard.press('Enter'); const before = await saved(page);
    const expected = await page.evaluate(() => { const c = (window as any).__WeldLabCore.sym2; return c.gen('bid', c.mixSeed(12345, c.KINDS.indexOf('bid'), 0)); });
    const p = expected.p, maximum = p.hours * 95 + p.materials + p.overhead;
    for (const rate of [65, 70, 75, 80, 85, 90, 95]) {
      await range(panel.locator('[data-bid-rate-probe]'), rate);
      expect(await number(panel, 'data-total')).toBe(p.hours * rate + p.materials + p.overhead);
      expect(await number(panel, 'data-delta')).toBe(p.hours * (rate - p.rate));
      const card = panel.locator('[data-bid-rate-card="candidate"]'), bar = card.locator('[data-bid-rate-bar]');
      const barWidth = await bar.evaluate(el => el.clientWidth);
      for (const [id, amount] of [['labor', p.hours * rate], ['materials', p.materials], ['overhead', p.overhead]] as const) {
        const segment = bar.locator('[data-bid-rate-segment="' + id + '"]');
        expect((await segment.boundingBox())!.width).toBeCloseTo(amount / maximum * barWidth, 0);
        expect(await number(card.locator('[data-bid-rate-term="' + id + '"]'), 'data-value')).toBe(amount);
      }
    }
    await panel.locator('[data-bid-rate-set="low"]').click(); await panel.locator('input').focus(); await page.keyboard.press('ArrowRight');
    await expect(panel).toHaveAttribute('data-rate', '70'); expect(await saved(page)).toBe(before);
    await bidProblem(page).getByRole('button', { name: 'New numbers', exact: true }).click(); await expect(panel).toHaveCount(0);
    const next = await page.evaluate(() => { const c = (window as any).__WeldLabCore.sym2; return c.gen('bid', c.mixSeed(12345, c.KINDS.indexOf('bid'), 1)); });
    await bidProblem(page).locator('input').fill(String(next.answer)); await bidProblem(page).getByRole('button', { name: 'Check answer', exact: true }).click();
    await expect(panel).toHaveAttribute('data-rate', String(next.p.rate)); await panel.locator('summary').click(); await panel.locator('[data-bid-rate-set="high"]').click();
    await inspect(page, 'bid-rates-' + width, '[data-bid-rate]'); expect(errors).toEqual([]);
  });
}

test('Measurement tools remain readable in high contrast', async ({ page }) => {
  for (const [name, state, selector] of [['plan-ruler', planState, '[data-plan-ruler-workspace]'], ['rt-angles', rtState, '[data-rt-angle-pair]'], ['bid-rates', bidState, '[data-bid-rate]']] as const) {
    await mount(page, 390, state, true);
    if (name === 'plan-ruler') await page.locator('[data-plan-ruler-toggle]').click();
    if (name === 'bid-rates') await revealBid(page);
    if (name !== 'plan-ruler') await page.locator(selector).locator('summary').click();
    await inspect(page, name + '-contrast', selector);
  }
});

test('Local review shortcuts reach all three enhanced modules', async ({ page }) => {
  const url = process.env.WELDLAB_PREVIEW_URL; test.skip(!url, 'Local preview is opt-in.');
  await page.setViewportSize({ width: 390, height: 900 }); await page.goto(url!);
  await page.waitForFunction(() => Boolean((document.getElementById('preview-app-css') as HTMLLinkElement)?.sheet));
  await page.locator('[data-plan-ruler-toggle]').click(); await expect(page.locator('[data-plan-ruler-overlay]')).toBeAttached();
  await page.getByRole('button', { name: 'RT angle comparison', exact: true }).click(); await page.locator('[data-rt-angle-pair] summary').click();
  await expect(page.locator('[data-rt-angle-probe="a"]')).toBeVisible();
  await page.getByRole('button', { name: 'Bid rate comparison', exact: true }).click(); await revealBid(page);
  await page.locator('[data-bid-rate] summary').click(); await expect(page.locator('[data-bid-rate-probe]')).toBeVisible();
});
