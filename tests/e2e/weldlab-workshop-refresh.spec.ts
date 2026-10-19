import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-workshop-refresh');
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
  test(`Crack microscope follows the authored evidence without answering the case at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await mount(page, width, { view: 'metallurgy', met_sect: 'cracking', met2_cdIdx: 0 });
    const saved = await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab));
    await page.locator('[data-met-crack-part="2"]').click(); await page.locator('[data-met-crack-view="detail"]').click();
    await expect(page.locator('[data-met-crack-evidence]')).toHaveAttribute('data-part', '2');
    await expect(page.locator('[data-met-crack-evidence]')).toHaveAttribute('data-view', 'detail');
    await page.locator('[data-met-crack-part="3"]').focus(); await page.keyboard.press('Space');
    await page.locator('[data-met-crack-view="context"]').click();
    await expect(page.locator('[data-met-crack-focus]')).toHaveAttribute('data-x', '121');
    await expect(page.locator('[data-met-crack-focus]')).toHaveAttribute('data-y', '74');
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);
    await inspect(page, `crack-context-${width}`, '[data-met-crack-evidence]');
    const observation = await page.locator('[data-met-crack-evidence]').innerHTML();
    await page.getByRole('radiogroup', { name: 'Which cracking mechanism is it?', exact: true }).getByRole('radio').first().click();
    expect(await page.locator('[data-met-crack-evidence]').innerHTML()).toBe(observation);
    expect(await page.evaluate(() => (window as any).__toolData.weldLab.met2_cdPicks[0])).toBe(0);
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next case →', exact: true }).click();
    await expect(page.locator('[data-met-crack-evidence]')).toHaveAttribute('data-met-crack-evidence', 'decay');
    await page.locator('[data-met-crack-view="detail"]').click();
    await expect(page.locator('[data-met-crack-sketch]')).toHaveAttribute('viewBox', '49 46 143 70');
    await expect(page.locator('[data-met-crack-when]')).toHaveAttribute('data-met-crack-when', 'service');
    await inspect(page, `crack-detail-${width}`, '[data-met-crack-evidence]');
    expect(errors).toEqual([]);
  });
}
test('Crack evidence controls and cropped observation remain readable in contrast', async ({ page }) => {
  await mount(page, 390, { view: 'metallurgy', met_sect: 'cracking', met2_cdIdx: 2 }, true);
  await page.locator('[data-met-crack-view="detail"]').click();
  await inspect(page, 'crack-contrast', '[data-met-crack-evidence]');
});

for (const width of [1280, 390]) {
  test(`Shade workbench assigns exact boundaries to the existing table bands at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await mount(page, width, { view: 'ppeSafety', ps_view: 'shade', safe2_shProc: 'gmaw', safe2_shAmps: 150, ps_score: 3, ps_picks: { 1: 2 } });
    const records = await page.evaluate(() => JSON.stringify({ score: (window as any).__toolData.weldLab.ps_score, picks: (window as any).__toolData.weldLab.ps_picks }));
    await expect(page.locator('[data-ppe-shade-workbench]')).toHaveAttribute('data-suggested', '11');
    await page.locator('[data-ppe-shade-edge][data-boundary="160"]').click();
    await expect(page.locator('[data-ppe-shade-workbench]')).toHaveAttribute('data-value', '150');
    for (const [offset, value, shade] of [[-1, 159, 11], [0, 160, 11], [1, 161, 12]]) {
      await page.locator(`[data-ppe-shade-boundary-step="${offset}"]`).click();
      await expect(page.locator('[data-ppe-shade-workbench]')).toHaveAttribute('data-value', String(value));
      await expect(page.locator('[data-ppe-shade-workbench]')).toHaveAttribute('data-suggested', String(shade));
      await expect(page.getByRole('slider', { name: 'Arc current', exact: true })).toHaveValue(String(value));
    }
    await inspect(page, `shade-current-${width}`, '[data-ppe-shade-workbench]');
    if (width === 390) {
      const scroll = page.locator('[data-ppe-shade-scroll]'); await scroll.focus(); await page.keyboard.press('ArrowRight');
      expect(await scroll.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
    }
    await page.getByRole('radiogroup', { name: 'Welding or cutting process', exact: true }).getByRole('radio', { name: /Gas.*welding/ }).click();
    await page.locator('[data-ppe-shade-edge][data-boundary="0.125"]').click();
    await page.locator('[data-ppe-shade-boundary-step="1"]').click();
    await expect(page.getByRole('slider', { name: 'Plate thickness', exact: true })).toHaveValue('0.126');
    const expected = await page.evaluate(() => (window as any).__WeldLabCore.safe2ShadeFor('ofw', 0.126));
    await expect(page.locator('[data-ppe-shade-workbench]')).toHaveAttribute('data-minimum', String(expected.min));
    await inspect(page, `shade-gas-${width}`, '[data-ppe-shade-workbench]');
    expect(await page.evaluate(() => JSON.stringify({ score: (window as any).__toolData.weldLab.ps_score, picks: (window as any).__toolData.weldLab.ps_picks }))).toBe(records);
    expect(errors).toEqual([]);
  });

  test(`Consumable cost lens probes exact common-rate comparisons without editing saved inputs at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await mount(page, width, { view: 'consumables', cons_sect: 'cost', tech2_cons_proc: 'gmaw_spray', tech2_cons_leg: 0.3125, tech2_cons_rate: 60 });
    await page.locator('[data-cons-rate-peer]').selectOption('fcaw');
    const saved = await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab));
    const delta = async () => Number(await page.locator('[data-cons-rate-delta]').getAttribute('data-difference'));
    await page.locator('[data-cons-rate-probe]').fill('20'); expect(await delta()).toBeGreaterThan(0);
    await page.locator('[data-cons-rate-probe]').fill('150'); expect(await delta()).toBeLessThan(0);
    for (const metric of ['filler', 'labor', 'total']) {
      await page.locator(`[data-cons-rate-metric="${metric}"]`).click();
      const expected = await page.evaluate((metric: string) => {
        const core = (window as any).__WeldLabCore.tech2; return core.costPerFoot('fcaw', 0.3125, 150)[metric] - core.costPerFoot('gmaw_spray', 0.3125, 150)[metric];
      }, metric);
      expect(await delta()).toBeCloseTo(expected, 12);
    }
    await inspect(page, `consumables-${width}`, '[data-cons-rate-lens]');
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);
    await page.locator('[data-cons-rate-follow]').click();
    await expect(page.locator('[data-cons-rate-lens]')).toHaveAttribute('data-probe-rate', '60');
    await page.getByRole('slider', { name: 'Fillet leg size', exact: true }).fill('0.5');
    await expect(page.locator('[data-cons-rate-lens]')).toHaveAttribute('data-leg', '0.5');
    expect(errors).toEqual([]);
  });

  test(`Wet and dry workshop follows the shared depth and keeps the prediction gate at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await mount(page, width, { view: 'underwater', uw_view: 'pressure', uw_depth: 66, uw_tech: 'wet', uw_probe_time: 3 });
    await expect(page.locator('[data-uw-workshop]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Skip the prediction', exact: true }).click();
    await expect(page.locator('[data-uw-workshop-method]')).toHaveCount(2);
    const bubbleAt66 = Number(await page.locator('[data-uw-workshop-bubble]').getAttribute('rx'));
    const saved = await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab));
    for (const station of ['water', 'boundary', 'arc', 'bead']) {
      await page.locator(`[data-uw-workshop-station="${station}"]`).click();
      await expect(page.locator('[data-uw-workshop]')).toHaveAttribute('data-station', station);
      for (const method of ['wet', 'dry']) await expect(page.locator(`[data-uw-workshop-reading="${method}"]`)).toHaveAttribute('data-station', station);
    }
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);
    await page.locator('[data-uw-workshop-station="boundary"]').click();
    await page.getByRole('slider', { name: 'Depth', exact: true }).fill('200');
    const pressure = await page.evaluate(() => (window as any).__WeldLabCore.tech2.pressureAtm(200));
    expect(Number(await page.locator('[data-uw-workshop-depth]').getAttribute('data-pressure-atm'))).toBeCloseTo(pressure, 12);
    const expected = await page.evaluate(() => (window as any).__WeldLabCore.tech2.bubbleScale(200));
    expect(Number(await page.locator('[data-uw-workshop-bubble-reading]').getAttribute('data-width-ratio'))).toBeCloseTo(expected, 12);
    expect(Number(await page.locator('[data-uw-workshop-bubble]').getAttribute('rx'))).toBeLessThan(bubbleAt66);
    await inspect(page, `underwater-${width}`, '[data-uw-workshop]');
    await page.getByRole('radiogroup', { name: 'Underwater welding technique', exact: true }).getByRole('radio', { name: /Hyperbaric \(dry\)/ }).click();
    await page.locator('[data-uw-workshop-compare="selected"]').click();
    await expect(page.locator('[data-uw-workshop-scene]')).toHaveCount(1);
    await expect(page.locator('[data-uw-workshop-scene]')).toHaveAttribute('data-uw-workshop-scene', 'dry');
    expect(await page.evaluate(() => (window as any).__toolData.weldLab.uw_probe_time)).toBe(3);
    expect(errors).toEqual([]);
  });
}

test('Shade, cost and wet/dry controls preserve contrast and selected states', async ({ page }) => {
  for (const [name, state, selector] of [
    ['shade', { view: 'ppeSafety', ps_view: 'shade', safe2_shProc: 'gmaw', safe2_shAmps: 150 }, '[data-ppe-shade-workbench]'],
    ['consumables', { view: 'consumables', cons_sect: 'cost', tech2_cons_proc: 'gmaw_spray' }, '[data-cons-rate-lens]'],
    ['underwater', { view: 'underwater', uw_view: 'pressure', uw_depth: 66, uw_tech: 'wet', tech2_uw_pred: 'skip' }, '[data-uw-workshop]'],
  ] as const) {
    await mount(page, 390, state, true);
    if (name === 'shade') await page.locator('[data-ppe-shade-boundary-step="1"]').click();
    if (name === 'consumables') await page.locator('[data-cons-rate-metric="labor"]').click();
    if (name === 'underwater') await page.locator('[data-uw-workshop-station="arc"]').click();
    await inspect(page, name + '-contrast', selector); await harness.destroy(page);
  }
});

test('Local preview exposes the four workshop improvements on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('http://127.0.0.1:8741/tmp/weld-review/index.html?pass=workshop#shade');
  await expect(page.locator('[data-ppe-shade-workbench]')).toBeVisible();
  await page.getByRole('button', { name: 'Wet and dry', exact: true }).click(); await expect(page.locator('[data-uw-workshop]')).toBeVisible();
  await page.getByRole('button', { name: 'Cost comparison', exact: true }).click(); await expect(page.locator('[data-cons-rate-lens]')).toBeVisible();
  await page.getByRole('button', { name: 'Crack evidence', exact: true }).click(); await expect(page.locator('[data-met-crack-evidence]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

