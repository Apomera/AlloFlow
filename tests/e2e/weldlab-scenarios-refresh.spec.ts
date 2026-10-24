import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-scenarios-refresh');
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

const diagnosisState = { view: 'defectDiagnose', dd2Idx: 1, dd2Shown: [1], dd2Ans: false, dd2Score: 0, dd2Rounds: 0 };
for (const width of [1280, 390]) {
  test(`Repair candidate stays behind submission and transfers only applied values at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await mount(page, width, diagnosisState);
    await expect(page.locator('[data-repair-probe]')).toHaveCount(0);
    await page.getByRole('radiogroup', { name: 'Pick the root cause', exact: true }).getByRole('radio', { name: /Heat too high/ }).click();
    await page.getByRole('radiogroup', { name: 'Pick an optional second cause', exact: true }).getByRole('radio', { name: /Travel too fast/ }).click();
    await page.getByRole('button', { name: 'Submit diagnosis', exact: true }).click();
    const scored = await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab));
    await page.locator('[data-repair-candidate]').fill('220');
    await page.locator('[data-repair-candidate]').focus(); await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-repair-probe]')).toHaveAttribute('data-value', '225');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('[data-repair-preview]')).toHaveAttribute('data-cleared', 'true');
    await expect(page.locator('[data-repair-probe]')).toHaveAttribute('data-live-value', '280');
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab))).toBe(scored);
    await inspect(page, `diagnose-${width}`, '[data-repair-probe]');
    await page.locator('[data-repair-apply]').click();
    await expect(page.getByRole('slider', { name: 'Amperage', exact: true })).toHaveValue('220');
    expect(await page.evaluate(() => (window as any).__toolData.weldLab.dh2_diag[2].fixed)).toBe(true);
    await page.getByRole('button', { name: /Open the Bead Lab/ }).click();
    expect(await page.evaluate(() => {
      const d = (window as any).__toolData.weldLab; return { view: d.view, A: d.bl_A, V: d.bl_V, TS: d.bl_TS, th: d.bl_thickness, score: d.dd2Score, rounds: d.dd2Rounds };
    })).toEqual({ view: 'beadLab', A: 220, V: 28, TS: 20, th: 0.25, score: 1, rounds: 1 });
    expect(errors).toEqual([]);
  });
}
test('Repair candidate controls and plot remain readable in contrast', async ({ page }) => {
  await mount(page, 390, { ...diagnosisState, dd2Ans: true, dd2Pick: 'heatHigh', dh2_ddSec: 'travelFast' }, true);
  await page.locator('[data-repair-axis="TS"]').click(); await page.locator('[data-repair-candidate]').fill('3');
  await expect(page.locator('[data-repair-preview]')).toHaveAttribute('data-target-index', '0');
  await expect(page.locator('[data-repair-preview]')).toHaveAttribute('data-cleared', 'false');
  await expect(page.locator('[data-repair-defect="burnthrough"]')).toBeVisible();
  await inspect(page, 'diagnose-contrast', '[data-repair-probe]');
});

for (const width of [1280, 390]) {
  test(`Qualification cells trace per-test coverage and keep scenario comparisons gated at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await mount(page, width, { view: 'qualPrep', qp_view: 'matrix', pipe2_qtest: 'plate3G' });
    await page.locator('[data-qp-cell="pipeGroove:V"]').click();
    await expect(page.locator('[data-qp-coverage-inspector="matrix"]')).toHaveAttribute('data-state', 'large');
    await expect(page.locator('[data-qp-coverage-inspector="matrix"]')).toContainText('24 in.');
    const combined = page.getByRole('radiogroup', { name: 'Qualification test position', exact: true }).getByRole('radio', { name: '3G + 4G', exact: true });
    await combined.click(); await expect(combined).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('[data-qp-provenance-test]')).toHaveCount(2);
    await page.locator('[data-qp-cell="plateGroove:OH"]').click();
    await expect(page.locator('[data-qp-coverage-inspector="matrix"]')).toHaveAttribute('data-position', 'OH');
    await expect(page.locator('[data-qp-provenance-test="plate3G"]')).toHaveAttribute('data-state', 'no');
    await expect(page.locator('[data-qp-provenance-test="plate4G"]')).toHaveAttribute('data-state', 'yes');
    await inspect(page, `qualification-matrix-${width}`, '[data-qp-coverage-inspector="matrix"]');
    await expect(page.locator('[data-qp-job-inspector]')).toHaveCount(0);
    await page.getByRole('radiogroup', { name: 'Choose the qualification test', exact: true }).getByRole('radio').first().click();
    await expect(page.locator('[data-qp-coverage-inspector="scenario"]')).toHaveAttribute('data-required', '4');
    await expect(page.locator('[data-qp-coverage-inspector="scenario"]')).toHaveAttribute('data-covered', '2');
    const answers = await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab.pipe2_scn));
    await page.locator('[data-qp-job-source="key"]').click();
    await expect(page.locator('[data-qp-coverage-inspector="scenario"]')).toHaveAttribute('data-covered', '4');
    await page.locator('[data-qp-job-cell="plateGroove:OH"]').click();
    await inspect(page, `qualification-job-${width}`, '[data-qp-job-inspector]');
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab.pipe2_scn))).toBe(answers);
    expect(errors).toEqual([]);
  });

  test(`Procedure reference and proposal share scales without revealing or altering the first call at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await mount(page, width, { view: 'codes', insp2_codesTab: 'sort', insp2_sortIdx: 2 });
    const bench = page.locator('[data-codes-change-bench]');
    await page.locator('[data-codes-change-view="reference"]').click(); await expect(page.locator('[data-codes-change-side]')).toHaveCount(1);
    await page.locator('[data-codes-change-view="proposal"]').click(); await expect(page.locator('[data-codes-proposal]')).toBeVisible();
    await page.locator('[data-codes-change-view="compare"]').click();
    const reference = page.locator('[data-codes-reference] [data-codes-thickness]'), proposal = page.locator('[data-codes-proposal] [data-codes-thickness]');
    expect(Number(await proposal.getAttribute('height')) / Number(await reference.getAttribute('height'))).toBeCloseTo(4, 12);
    expect(await page.evaluate(() => Object.keys((window as any).__toolData.weldLab.insp2_sort || {}).length)).toBe(0);
    const before = await bench.innerHTML();
    await inspect(page, `codes-thickness-${width}`, '[data-codes-change-bench]');
    await page.getByRole('radiogroup', { name: 'Sort this change', exact: true }).getByRole('radio').nth(1).click();
    expect(await bench.innerHTML()).toBe(before);
    const answers = await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab.insp2_sort));
    await page.locator('[data-codes-change-view="reference"]').click();
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab.insp2_sort))).toBe(answers);
    await page.getByRole('button', { name: 'Next ➡️', exact: true }).click(); await page.locator('[data-codes-change-view="compare"]').click();
    await expect(page.locator('[data-codes-reference] [data-codes-argon-share]')).toHaveAttribute('data-codes-argon-share', '75');
    await expect(page.locator('[data-codes-proposal] [data-codes-argon-share]')).toHaveCount(0);
    await inspect(page, `codes-gas-${width}`, '[data-codes-change-bench]');
    expect(errors).toEqual([]);
  });

  test(`Pipe travel links exact unfolded progress with the inspected clock point at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await mount(page, width, { view: 'pipeWelding', pipe_sect: 'updown', pipe2_dir: 'uphill' });
    await page.getByRole('slider', { name: 'Joint travel progress', exact: true }).fill('25');
    await expect(page.locator('[data-pipe-travel-track="0"]')).toHaveAttribute('data-progress', '0.5');
    await expect(page.locator('[data-pipe-travel-track="1"]')).toHaveAttribute('data-state', 'waiting');
    await page.locator('[data-pipe-travel-half="1"]').click();
    await expect(page.locator('[data-pipe-travel-clock-point]')).toHaveAttribute('data-degrees', '180');
    await page.getByRole('button', { name: 'Seek 3 o’clock on half 2', exact: true }).click();
    await expect(page.locator('[data-pipe-travel-bench]')).toHaveAttribute('data-time', '0.75');
    await expect(page.locator('[data-pipe-travel-clock-point]')).toHaveAttribute('data-degrees', '90');
    await expect(page.locator('[data-pipe-travel-reading]')).toHaveAttribute('data-nearest-hour', '3');
    await inspect(page, `pipe-uphill-${width}`, '[data-pipe-travel-bench]');
    await page.locator('svg:has([data-pipe-travel-clock-point])').screenshot({ path: resolve(output, `pipe-clock-${width}.png`) });
    await page.getByRole('radiogroup', { name: 'Travel direction', exact: true }).getByRole('radio', { name: /Downhill pipeline/ }).click();
    await page.getByRole('slider', { name: 'Joint travel progress', exact: true }).fill('25');
    for (const [half, degrees] of [[0, 45], [1, 315]]) {
      await expect(page.locator(`[data-pipe-travel-point="${half}"]`)).toHaveAttribute('data-degrees', String(degrees));
    }
    await expect(page.locator('[data-pipe-travel-clock-point]')).toHaveAttribute('data-degrees', '315');
    await expect(page.locator('[data-pipe-travel-bench]')).toHaveAttribute('data-playing', 'false');
    await inspect(page, `pipe-downhill-${width}`, '[data-pipe-travel-bench]');
    expect(errors).toEqual([]);
  });
}

test('Coverage, procedure and pipe controls remain readable in contrast', async ({ page }) => {
  for (const [name, state, selector] of [
    ['qualification', { view: 'qualPrep', qp_view: 'matrix', pipe2_qtest: 'plate3G+plate4G', pipe2_scnidx: 5, pipe2_scn: { 5: 0 } }, '[data-qp-job-inspector]'],
    ['codes', { view: 'codes', insp2_codesTab: 'sort', insp2_sortIdx: 2 }, '[data-codes-change-bench]'],
    ['pipe', { view: 'pipeWelding', pipe_sect: 'updown', pipe2_dir: 'uphill' }, '[data-pipe-travel-bench]'],
  ] as const) {
    await mount(page, 390, state, true);
    if (name === 'qualification') { await page.locator('[data-qp-job-source="key"]').click(); await page.locator('[data-qp-job-cell="tyk:OH"]').click(); }
    if (name === 'codes') await page.locator('[data-codes-change-view="proposal"]').click();
    if (name === 'pipe') { await page.locator('[data-pipe-travel-half="1"]').click(); await page.getByRole('slider', { name: 'Joint travel progress', exact: true }).fill('75'); }
    await inspect(page, name + '-contrast', selector); await harness.destroy(page);
  }
});

test('Local preview reaches the four scenario explorers on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('http://127.0.0.1:8741/tmp/weld-review/index.html?pass=scenarios#repair');
  await expect(page.locator('[data-repair-probe]')).toBeVisible();
  await page.getByRole('button', { name: 'Coverage inspector', exact: true }).click(); await expect(page.locator('[data-qp-coverage-inspector="matrix"]')).toBeVisible();
  await page.getByRole('button', { name: 'Procedure changes', exact: true }).click(); await expect(page.locator('[data-codes-change-bench]')).toBeVisible();
  await page.getByRole('button', { name: 'Pipe travel', exact: true }).click(); await expect(page.locator('[data-pipe-travel-bench]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

