import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-practice-refresh');
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

async function recordPass(page: any) {
  await page.evaluate(() => {
    const w = window as any;
    let callbacks: Array<{ id: number, fn: FrameRequestCallback }> = [], id = 0, time = performance.now();
    w.requestAnimationFrame = (fn: FrameRequestCallback) => { callbacks.push({ id: ++id, fn }); return id; };
    w.cancelAnimationFrame = (key: number) => { callbacks = callbacks.filter(item => item.id !== key); };
    w.__advanceRecordedPass = (count: number) => {
      for (let i = 0; i < count; i++) { time += 100; const next = callbacks; callbacks = []; next.forEach(item => item.fn(time)); }
    };
  });
  await page.getByRole('button', { name: /Strike the arc/ }).click();
  await page.evaluate(() => (window as any).__advanceRecordedPass(1000));
  await expect(page.locator('[data-run-compare]')).toBeVisible();
}

for (const width of [1280, 390]) {
  test(`Recorded pass comparison preserves slices and score at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, { view: 'speedChallenge' });
    await expect(page.locator('[data-run-compare]')).toHaveCount(0);
    await recordPass(page);
    await page.getByRole('slider', { name: 'Inspect the bead at', exact: true }).fill('0');
    await page.locator('[data-run-pin]').click();
    const best = await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab.speedBest));
    const max = await page.getByRole('slider', { name: 'Inspect the bead at', exact: true }).getAttribute('max');
    await page.getByRole('slider', { name: 'Inspect the bead at', exact: true }).fill(max!);
    await expect(page.locator('[data-run-pair-slice="reference"]')).toHaveAttribute('data-thickness', '0.25');
    await expect(page.locator('[data-run-pair-slice="current"]')).toHaveAttribute('data-thickness', '0.125');
    const reference = Number(await page.locator('[data-run-pair-slice="reference"]').getAttribute('data-penetration'));
    const current = Number(await page.locator('[data-run-pair-slice="current"]').getAttribute('data-penetration'));
    expect(Number(await page.locator('[data-run-pair-delta="pen"]').getAttribute('data-value'))).toBeCloseTo(current - reference, 10);
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab.speedBest))).toBe(best);
    await inspect(page, `run-${width}`, '[data-run-compare]');
    await page.locator('[data-run-clear-pin]').click();
    await expect(page.locator('[data-run-pair-slice]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test(`Pathways age probe links every route to the existing earnings model at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, { view: 'careerPaths', cp_view: 'earnings', car2_pred: { a25: 'apprentice', a35: 'college', shown: true } });
    await page.locator('[data-car2-age-stop="18"]').click();
    for (const route of ['apprentice', 'college', 'degree']) {
      await expect(page.locator(`[data-car2-age-route="${route}"] [data-car2-probe-value="cumulative"]`)).toHaveAttribute('data-value', '0');
    }
    await page.locator('[data-car2-age-stop="35"]').click();
    await page.getByRole('slider', { name: 'Starting wage', exact: true }).fill('40');
    const expected = await page.evaluate(() => {
      const w = window as any, model = w.__WeldLabCore.car2EarnAll(w.__toolData.weldLab.car2_earn);
      return Object.fromEntries(['apprentice', 'college', 'degree'].map(id => [id, w.__WeldLabCore.car2CumAt(model[id], 35)]));
    });
    for (const route of ['apprentice', 'college', 'degree']) {
      expect(Number(await page.locator(`[data-car2-age-route="${route}"] [data-car2-probe-value="cumulative"]`).getAttribute('data-value'))).toBeCloseTo(expected[route], 8);
      await expect(page.locator(`[data-car2-age-mark="${route}"]`)).toHaveAttribute('data-age', '35');
    }
    await inspect(page, `pathways-control-${width}`, '[data-car2-age-probe]');
    await inspect(page, `pathways-readings-${width}`, '[data-car2-age-readings]');
    await page.locator('[data-car2-age-chart]').screenshot({ path: resolve(output, `pathways-chart-${width}.png`) });
    expect(errors).toEqual([]);
  });

  test(`NDT specimen connects known internal flaws, access and method status at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, { view: 'inspection', insp_sect: 'ndt', insp2_ndtMode: 'choose', insp2_ndtFlaw: 'porosity', insp2_ndtMat: 'ss304', insp2_ndtAccess: 'one' });
    await page.locator('[data-inspection-view="surface"]').click();
    await expect(page.locator('[data-inspection-specimen-flaw]')).toHaveAttribute('data-visible', 'false');
    await page.locator('[data-inspection-view="section"]').click();
    await expect(page.locator('[data-inspection-specimen-flaw] circle')).toHaveCount(3);
    for (const method of ['pt', 'ut', 'rt', 'mt']) {
      await page.locator(`[data-inspection-method="${method}"]`).click();
      const result = await page.evaluate((method: string) => (window as any).__WeldLabCore.insp2NdtRank('ss304', 'porosity', 'one')[method], method);
      await expect(page.locator('[data-inspection-method-result]')).toHaveAttribute('data-status', result.s);
      await expect(page.locator('[data-inspection-method-result]')).toHaveAttribute('data-reason', result.c);
    }
    await page.getByRole('radiogroup', { name: 'Pick a method demo', exact: true }).getByRole('radio', { name: /^UT:/ }).click();
    await expect(page.locator('[data-inspection-specimen]')).toHaveAttribute('data-inspection-specimen', 'ut');
    await expect(page.locator('[data-inspection-reverse-access]')).toHaveAttribute('data-inspection-reverse-access', 'blocked');
    await inspect(page, `inspection-${width}`, '[data-inspection-specimen]');
    expect(errors).toEqual([]);
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

async function probeHunt(page: any, id: string, sample = 'sampleA') {
  const canvas = page.locator('[aria-roledescription="inspection surface"] canvas');
  const point = await canvas.evaluate((canvas: HTMLCanvasElement, arg: { id: string, sample: string }) => {
    const core = (window as any).__WeldLabCore, c = canvas as any;
    const geometry = core.DH_SAMPLE_GEOM[arg.sample], mark = geometry.marks.find((m: any) => m.id === arg.id);
    const W = c._logicalW || canvas.width, H = c._logicalH || canvas.height;
    const at = core.dhToPx(core.dhFrame(geometry, W, H), mark.u, mark.v), rect = canvas.getBoundingClientRect();
    return { x: at.x / W * rect.width, y: at.y / H * rect.height };
  }, { id, sample });
  await canvas.click({ position: point });
}
async function classifyHunt(page: any, cls: string) {
  const index = await page.evaluate((cls: string) => {
    const types = (window as any).__WeldLabCore.DH_DEFECT_TYPES;
    return cls === 'ok' ? types.length : types.indexOf(cls);
  }, cls);
  await page.getByRole('radiogroup', { name: 'Classify the selected spot', exact: true }).getByRole('radio').nth(index).click();
  await page.getByRole('button', { name: /^Confirm classification/ }).click();
}
async function cutHunt(page: any, u: string) {
  const open = page.getByRole('button', { name: /Open the cutting tools/ });
  if (await open.count()) await open.click();
  await page.getByRole('slider', { name: 'Cut position', exact: true }).fill(u);
  await page.getByRole('button', { name: /Cut here/ }).click();
}

for (const width of [1280, 390]) {
  test(`Defect Hunt reviews only committed evidence and retains the locating cut at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, { view: 'defectHunt' });
    await expect(page.locator('[data-hunt-review]')).toHaveAttribute('data-hunt-review', 'empty');
    await probeHunt(page, 'A1');
    await expect(page.locator('[data-hunt-review]')).toHaveAttribute('data-hunt-review', 'empty');
    await classifyHunt(page, 'porosity');
    await probeHunt(page, 'A5'); await classifyHunt(page, 'undercut');
    await expect(page.locator('[data-hunt-review-truth]')).toHaveAttribute('data-hunt-review-truth', 'ok');
    await expect(page.locator('[data-hunt-review-first-call]')).toHaveAttribute('data-hunt-review-first-call', 'undercut');
    const catalog = await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab.defectCatalog));
    await page.locator('[data-hunt-review-pick="A1"]').click();
    await page.locator('[data-hunt-review-view="lighting"]').click();
    await expect(page.locator('[data-hunt-review-light]')).toHaveCount(2);
    await expect(page.locator('[data-hunt-review-map]')).toHaveAttribute('data-hunt-review-map', 'A1,A5');
    await inspect(page, `hunt-lighting-${width}`, '[data-hunt-review]');
    await page.getByRole('button', { name: /Reveal all/ }).click();
    await expect(page.locator('[data-hunt-review-pick]')).toHaveCount(2);
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weldLab.defectCatalog))).toBe(catalog);
    await harness.destroy(page);
    await mount(page, width, { view: 'defectHunt', dh_sampleIdx: 1 });
    await cutHunt(page, '0.14');
    const index = await page.evaluate(() => {
      const core = (window as any).__WeldLabCore;
      return core.dhSectionMarks(core.DH_SAMPLE_GEOM.sampleB, 0.14).findIndex((m: any) => m.id === 'B1');
    });
    await page.locator('[aria-label="Features in this section"] button').nth(index).click();
    await cutHunt(page, '0.75');
    await classifyHunt(page, 'lackOfFusion');
    await expect(page.locator('[data-hunt-review-section]')).toHaveAttribute('data-hunt-review-section', '0.14');
    await inspect(page, `hunt-section-${width}`, '[data-hunt-review]');
    expect(errors).toEqual([]);
  });
}

test('Practice modules retain contrast and visible selection', async ({ page }) => {
  for (const [name, state, selector] of [
    ['run', { view: 'speedChallenge' }, '[data-run-compare]'],
    ['pathways', { view: 'careerPaths', cp_view: 'earnings', car2_pred: { a25: 'apprentice', a35: 'college', shown: true } }, '[data-car2-age-readings]'],
    ['inspection', { view: 'inspection', insp_sect: 'ndt', insp2_ndtMode: 'choose' }, '[data-inspection-specimen]'],
    ['hunt', { view: 'defectHunt' }, '[data-hunt-review]'],
  ] as const) {
    await mount(page, 390, state, true);
    if (name === 'run') {
      await recordPass(page); await page.getByRole('slider', { name: 'Inspect the bead at', exact: true }).fill('0'); await page.locator('[data-run-pin]').click();
      const max = await page.getByRole('slider', { name: 'Inspect the bead at', exact: true }).getAttribute('max');
      await page.getByRole('slider', { name: 'Inspect the bead at', exact: true }).fill(max!);
    }
    if (name === 'hunt') {
      await probeHunt(page, 'A1'); await classifyHunt(page, 'porosity');
      await probeHunt(page, 'A5'); await classifyHunt(page, 'ok');
      await page.locator('[data-hunt-review-view="lighting"]').click();
      const active = await page.locator('[data-hunt-review-pick="A5"]').evaluate(el => getComputedStyle(el).backgroundColor);
      const inactive = await page.locator('[data-hunt-review-pick="A1"]').evaluate(el => getComputedStyle(el).backgroundColor);
      expect(active).not.toBe(inactive);
    }
    await inspect(page, name + '-contrast', selector);
    if (name === 'pathways') await inspect(page, 'pathways-control-contrast', '[data-car2-age-probe]');
    await harness.destroy(page);
  }
});

test('Local preview reaches the four new practice modules on a phone', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(harness.url + '/tmp/weld-review/index.html?pass=practice#inspection');
  await expect(page.locator('[data-inspection-specimen]')).toBeVisible();
  for (const [label, selector] of [['Career age probe', '[data-car2-age-probe]'], ['Evidence notebook', '[data-hunt-review]'], ['Live pass', 'input[aria-label="Travel speed"]']]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator(selector)).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

