import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-experiments-refresh');
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


async function matcherModel(page: any) {
  const result = await page.evaluate(() => {
    const core = (window as any).__WeldLabCore.proc, job = core.normJob((window as any).__toolData.weldLab.proc2_job);
    const expected = core.rank(job), rows = [...document.querySelectorAll('[data-proc-ledger-row]')].map((el: any) => ({ id: el.dataset.procLedgerRow, score: Number(el.dataset.score), out: el.dataset.out === 'true' }));
    const selected = document.querySelector('[data-proc-ledger]')!.getAttribute('data-proc-ledger');
    const factors = [...document.querySelectorAll('[data-proc-ledger-factor]')].map((el: any) => ({ factor: el.dataset.procLedgerFactor, choice: el.dataset.choice, points: el.dataset.points }));
    const scaleErrors = [...document.querySelectorAll('[data-proc-ledger-score-bar],[data-proc-ledger-factor-bar]')].map((bar: any) => { const svg = bar.ownerSVGElement; return Math.abs(bar.getBoundingClientRect().width - Math.abs(Number(bar.dataset.value)) / Number(svg.dataset.limit) * 142 / 300 * svg.getBoundingClientRect().width); });
    return { scaleErrors, expected: expected.map((r: any) => ({ id: r.id, score: r.score, out: r.out })), rows, factors, expectedFactors: core.FACTOR_KEYS.map((f: string) => ({ factor: f, choice: job[f], points: core.cell(f, job[f], selected).d === null ? 'out' : String(core.cell(f, job[f], selected).d) })) };
  });
  expect(result.rows).toEqual(result.expected); expect(result.factors).toEqual(result.expectedFactors); expect(Math.max(0, ...result.scaleErrors)).toBeLessThan(1);
}
for (const width of [1280, 390]) {
  test('Process ledger explains exact ranked contributions at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await mount(page, width, { view: 'processCompare', proc2_guess: { g1: 0 } });
    await matcherModel(page);
    const saved = await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab));
    await page.locator('[data-proc-ledger-pick="mig"]').focus(); await page.keyboard.press('Space');
    await expect(page.locator('[data-proc-ledger]')).toHaveAttribute('data-proc-ledger', 'mig');
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);
    for (const preset of ['Windy steel erection', 'Car-body line', 'Cast-iron field repair']) {
      await page.getByRole('button', { name: preset, exact: true }).click(); await matcherModel(page);
      await expect(page.locator('[data-proc-ledger]')).toHaveAttribute('data-proc-ledger', 'mig');
    }
    await page.getByRole('button', { name: 'Food-service stainless', exact: true }).click();
    await page.locator('[data-proc-ledger-pick="stick"]').click(); await matcherModel(page);
    await expect(page.locator('[data-proc-ledger-row="stick"]')).toHaveAttribute('data-out', 'true');
    await expect(page.locator('[data-proc-ledger-breakdown="stick"]')).toBeVisible();
    await inspect(page, 'process-ledger-' + width, '[data-proc-ledger]');
    expect(await page.evaluate(() => (window as any).__toolData.weldLab.proc2_guess)).toEqual({ g1: 0 });
    expect(errors).toEqual([]);
  });
  test('Tolerance window includes exact limits on a fixed ruler at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await mount(page, width, { view: 'mathBlueprint', mb_mode: 'browse', mb_sect: 'measure' });
    const saved = await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab));
    await page.locator('[data-math-tolerance-probe]').fill('23999');
    await expect(page.locator('[data-math-tolerance]')).toHaveAttribute('data-inside', 'true');
    await page.locator('[data-math-tolerance-mode="unilateral"]').click();
    await expect(page.locator('[data-math-tolerance]')).toHaveAttribute('data-inside', 'false');
    for (const [mode, lower, upper] of [['bilateral', 23970, 24030], ['unilateral', 24000, 24020]] as const) {
      await page.locator('[data-math-tolerance-mode="' + mode + '"]').click();
      for (const [edge, value] of [['lower', lower], ['upper', upper]] as const) {
        await page.locator('[data-math-tolerance-edge="' + edge + '"]').click();
        for (const step of [-1, 0, 1]) {
          const probe = value + step;
          await page.locator('[data-math-tolerance-step="' + step + '"]').click();
          await expect(page.locator('[data-math-tolerance]')).toHaveAttribute('data-probe-thou', String(probe));
          await expect(page.locator('[data-math-tolerance]')).toHaveAttribute('data-inside', String(probe >= lower && probe <= upper));
          await expect(page.locator('[data-math-tolerance-marker]')).toHaveAttribute('x1', String(20 + (probe - 23950) * 6));
        }
      }
    }
    await inspect(page, 'tolerance-' + width, '[data-math-tolerance]');
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab))).toBe(saved); expect(errors).toEqual([]);
  });
  test('Eddy current stages preserve causal order and local exploration at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await mount(page, width, { view: 'inspection', insp_sect: 'et' });
    const saved = await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab));
    for (const [i, stage] of ['coil', 'currents', 'discontinuity', 'instrument'].entries()) {
      await page.locator('[data-et-stage="' + stage + '"]').focus(); await page.keyboard.press('Space');
      await expect(page.locator('[data-et-explorer]')).toHaveAttribute('data-stage', String(i));
      await expect(page.locator('[data-et-schematic]')).toHaveAttribute('data-et-schematic', stage);
      await expect(page.locator('[data-et-caption]')).toHaveAttribute('data-et-caption', stage);
      await expect(page.locator('[data-et-current-paths]')).toHaveAttribute('data-et-current-paths', i === 0 ? 'not-yet-shown' : i === 1 ? 'circular' : 'disrupted');
      await expect(page.locator('[data-et-instrument-glyph]')).toHaveAttribute('data-et-instrument-glyph', i === 3 ? 'changed' : 'inactive');
    }
    await inspect(page, 'eddy-current-' + width, '[data-et-explorer]');
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab))).toBe(saved); expect(errors).toEqual([]);
  });
}
test('Three new lessons remain readable with high contrast at phone width', async ({ page }) => {
  for (const [name, state, selector] of [
    ['process-ledger', { view: 'processCompare' }, '[data-proc-ledger]'],
    ['tolerance', { view: 'mathBlueprint', mb_mode: 'browse', mb_sect: 'measure' }, '[data-math-tolerance]'],
    ['eddy-current', { view: 'inspection', insp_sect: 'et' }, '[data-et-explorer]']
  ] as const) {
    await mount(page, 390, state, true);
    if (name === 'process-ledger') for (const summary of await page.locator('[data-proc-ledger-prose] summary').all()) await summary.click();
    if (name === 'tolerance') { await page.locator('[data-math-tolerance-mode="unilateral"]').click(); await page.locator('[data-math-tolerance-probe]').fill('23999'); }
    if (name === 'eddy-current') await page.locator('[data-et-stage="instrument"]').click();
    await inspect(page, name + '-contrast', selector);
  }
});
test('Local preview routes expose the three enhanced lessons', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('http://127.0.0.1:8741/tmp/weld-review/index.html?pass=experiments#eddy');
  await expect(page.locator('[data-et-explorer]')).toBeVisible();
  await page.getByRole('button', { name: 'Tolerance window', exact: true }).click();
  await expect(page.locator('[data-math-tolerance]')).toBeVisible();
  await page.getByRole('button', { name: 'Process score ledger', exact: true }).click();
  await expect(page.locator('[data-proc-ledger]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
