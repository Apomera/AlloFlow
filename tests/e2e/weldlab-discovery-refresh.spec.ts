import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-discovery-refresh');
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
  test(`Paid-hour workbench computes exact distance, factor and pass effects at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, { view: 'mathBlueprint', mb_mode: 'browse', mb_sect: 'estimate', sym2_m_score: 4, sym2_m_tries: 8 });
    const saved = await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab));
    await page.locator('[data-math-hour-process]').selectOption('1');
    await page.locator('[data-math-hour-travel]').fill('25'); await page.locator('[data-math-hour-factor]').fill('100');
    await page.locator('[data-math-hour-passes="6"]').click();
    await expect(page.locator('[data-math-hour-value="arc"]')).toHaveAttribute('data-value', '125');
    await expect(page.locator('[data-math-hour-value="deposited"]')).toHaveAttribute('data-value', '125');
    expect(Number(await page.locator('[data-math-hour-value="finished"]').getAttribute('data-value'))).toBeCloseTo(125 / 6, 12);
    await expect(page.locator('[data-math-hour-bar="arc"]')).toHaveAttribute('width', '600');
    await page.locator('[data-math-hour-factor]').focus(); await page.keyboard.press('ArrowLeft');
    await expect(page.locator('[data-math-paid-hour]')).toHaveAttribute('data-factor', '0.99');
    await inspect(page, `math-${width}`, '[data-math-paid-hour]');
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);
    await page.locator('[data-math-hour-reset]').click();
    await expect(page.locator('[data-math-paid-hour]')).toHaveAttribute('data-travel', '20');
    await expect(page.locator('[data-math-paid-hour]')).toHaveAttribute('data-passes', '1');
    expect(errors).toEqual([]);
  });
}

test('Paid-hour controls and values remain readable in contrast', async ({ page }) => {
  await mount(page, 390, { view: 'mathBlueprint', mb_mode: 'browse', mb_sect: 'estimate' }, true);
  await page.locator('[data-math-hour-passes="3"]').click();
  const colors = await page.locator('[data-math-hour-passes="3"]').evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, ink: getComputedStyle(el).color }));
  expect(colors).toEqual({ bg: 'rgb(255, 255, 0)', ink: 'rgb(0, 0, 0)' });
  await inspect(page, 'math-contrast', '[data-math-paid-hour]');
});

const composition = { C: 0.2, Mn: 1.2, Cr: 0.5, Mo: 0.2, V: 0.1, Ni: 0.3, Cu: 0.15 };
const noiseRows = [{ db: 100, h: 1 }, { db: 85, h: 6 }, { db: 75, h: 2 }];
for (const width of [1280, 390]) {
  test(`Alloy contribution visuals follow the composition and prediction gate at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, { view: 'metallurgy', met_sect: 'ce', met_ce_comp: composition });
    await expect(page.locator('[data-met-ce-workbench]')).toHaveCount(0);
    await page.getByRole('radiogroup', { name: 'Your CE band prediction', exact: true }).getByRole('radio', { name: /^HIGH/ }).click();
    expect(Number(await page.locator('[data-met-ce-workbench]').getAttribute('data-ce-total'))).toBeCloseTo(0.59, 12);
    const tally = await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab.met2_ceTally));
    const scale = await page.locator('[data-met-ce-workbench]').getAttribute('data-scale-max');
    for (const [term, expected] of [['c', 0.2], ['mn', 0.2], ['cr', 0.16], ['ni', 0.03]] as const) {
      await page.locator(`[data-met-ce-term="${term}"]`).click();
      expect(Number(await page.locator('[data-met-ce-term-detail]').getAttribute('data-contribution'))).toBeCloseTo(expected, 12);
      await expect(page.locator('[data-met-ce-workbench]')).toHaveAttribute('data-scale-max', scale!);
    }
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab.met2_ceTally))).toBe(tally);
    await inspect(page, `metallurgy-${width}`, '[data-met-ce-workbench]');
    await page.getByRole('spinbutton', { name: 'Manganese weight percent', exact: true }).fill('1.8');
    await expect(page.locator('[data-met-ce-workbench]')).toHaveCount(0);
    await expect(page.getByRole('radiogroup', { name: 'Your CE band prediction', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test(`Noise journey accumulates both existing dose models at the same time at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, { view: 'safetyHealth', sh_sect: 'noise', sh_mode: 'browse', safe2_noise: noiseRows, sh_audit: { lev: 'yes' }, safe2_hoc: { quieter: 1 } });
    const saved = await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab));
    await page.locator('[data-noise-probe]').fill('4');
    for (const std of ['osha', 'niosh']) {
      const expected = await page.evaluate((std: string) => (window as any).__WeldLabCore.safe2NoiseDose([{ db: 100, h: 1 }, { db: 85, h: 3 }, { db: 75, h: 0 }], std).dose, std);
      expect(Number(await page.locator('[data-noise-cumulative]').getAttribute(`data-${std}-dose`))).toBeCloseTo(expected, 10);
      expect(Number(await page.locator(`[data-noise-current-dose="${std}"]`).getAttribute('data-dose'))).toBeCloseTo(expected, 10);
    }
    await page.locator('[data-noise-task="2"]').click();
    await expect(page.locator('[data-noise-journey]')).toHaveAttribute('data-noise-elapsed', '9');
    await expect(page.locator('[data-noise-contribution="niosh"]')).toHaveAttribute('data-full-dose', '0');
    await page.locator('[data-noise-probe]').fill('4');
    await inspect(page, `noise-${width}`, '[data-noise-journey]');
    if (width === 390) {
      const graph = page.locator('[data-noise-timeline]').locator('..');
      expect(await graph.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
      await graph.focus(); await page.keyboard.press('ArrowRight');
    }
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);
    expect(errors).toEqual([]);
  });

  test(`Robot job scenes support evidence notes without committing an assignment at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, { view: 'robotic', rob_sect: 'sorter' });
    await expect(page.locator('[data-rob-job-explanation]')).toHaveCount(0);
    await page.locator('[data-rob-job-pick="4"]').click(); await page.locator('[data-rob-job-lens="fit"]').click();
    await expect(page.locator('[data-rob-job-fact]')).toContainText('1 mm');
    await page.locator('[data-rob-job-note]').click();
    await expect(page.locator('[data-rob-job-reason="fit"]')).toHaveCount(1);
    await page.locator('[data-rob-job-pick="0"]').click();
    await expect(page.locator('[data-rob-job-notes-count]')).toHaveAttribute('data-rob-job-notes-count', '0');
    await page.locator('[data-rob-job-pick="4"]').click();
    await expect(page.locator('[data-rob-job-notes-count]')).toHaveAttribute('data-rob-job-notes-count', '1');
    await inspect(page, `robotics-${width}`, '[data-rob-job-discovery]');
    await page.locator('[data-rob-job-choice-link]').click();
    await expect(page.locator('[data-rob-sort-card="4"] [role="radio"]').first()).toBeFocused();
    expect(await page.evaluate(() => Object.keys((window as any).__toolData.weldLab.tech2_rob_sort || {}).length)).toBe(0);
    await page.locator('[data-rob-sort-card="4"]').getByRole('radio', { name: /Manual welder/ }).click();
    await expect(page.locator('[data-rob-job-explanation]')).toBeVisible();
    expect(await page.evaluate(() => (window as any).__toolData.weldLab.tech2_rob_sort[4])).toBe('manual');
    await page.locator('[data-rob-job-pick="0"]').click(); await expect(page.locator('[data-rob-job-explanation]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('Contribution, noise and job-evidence controls retain contrast and selection', async ({ page }) => {
  for (const [name, state, selector] of [
    ['metallurgy', { view: 'metallurgy', met_sect: 'ce', met2_ceFree: true, met_ce_comp: composition }, '[data-met-ce-workbench]'],
    ['noise', { view: 'safetyHealth', sh_sect: 'noise', sh_mode: 'browse', safe2_noise: noiseRows }, '[data-noise-journey]'],
    ['robotics', { view: 'robotic', rob_sect: 'sorter' }, '[data-rob-job-discovery]'],
  ] as const) {
    await mount(page, 390, state, true);
    if (name === 'metallurgy') await page.locator('[data-met-ce-term="mn"]').click();
    if (name === 'noise') await page.locator('[data-noise-task="1"]').click();
    if (name === 'robotics') { await page.locator('[data-rob-job-lens="fit"]').click(); await page.locator('[data-rob-job-note]').click(); }
    await inspect(page, name + '-contrast', selector); await harness.destroy(page);
  }
});

test('Local preview exposes the new discovery workbenches on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('http://127.0.0.1:8741/tmp/weld-review/index.html?pass=discovery#math');
  await expect(page.locator('[data-math-paid-hour]')).toBeVisible();
  await page.getByRole('button', { name: 'Alloy contributions', exact: true }).click(); await expect(page.locator('[data-met-ce-workbench]')).toBeVisible();
  await page.getByRole('button', { name: 'Noise journey', exact: true }).click(); await expect(page.locator('[data-noise-journey]')).toBeVisible();
  await page.getByRole('button', { name: 'Job evidence', exact: true }).click(); await expect(page.locator('[data-rob-job-discovery]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
