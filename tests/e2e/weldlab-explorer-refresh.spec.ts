import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-explorer-refresh');
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

for (const width of [1280, 390]) {
  test(`Symbol run distinguishes length, pitch and gap at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, { view: 'symbolsReader', sr_view: 'library' });
    await page.locator('[data-symbol-run-measure="gap"]').click();
    await expect(page.locator('[data-symbol-run-dimension]')).toHaveAttribute('data-from-in', '2');
    await expect(page.locator('[data-symbol-run-dimension]')).toHaveAttribute('data-to-in', '6');
    await page.locator('[data-symbol-run-probe]').fill('3');
    await expect(page.locator('[data-symbol-probe-reading]')).toHaveAttribute('data-symbol-probe-reading', 'gap');
    await page.locator('[data-symbol-run-probe]').focus(); await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-symbol-probe-reading]')).toHaveAttribute('data-position-in', '3.25');
    await page.getByRole('radio', { name: 'Both sides', exact: false }).click();
    await expect(page.locator('[data-symbol-run-bead]')).toHaveCount(6);
    await page.locator('[data-symbol-run-example="3-12"]').click();
    await expect(page.locator('[data-symbol-run-value="gap"]')).toHaveText('9 in');
    await expect(page.locator('[data-symbol-probe-reading]')).toHaveAttribute('data-position-in', '0');
    await inspect(page, `symbols-${width}`, '[data-symbol-run]');
    expect(errors).toEqual([]);
  });

  test(`Process cutaways compare the same role and swap without losing job data at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, { view: 'processCompare', proc2_guess: { 0: 'tig' } });
    await page.locator('[data-proc-compare-toggle]').click();
    await page.locator('[data-proc-focus="metal"]').click();
    await expect(page.locator('[data-proc-pair-card="primary"]')).toHaveAttribute('data-highlight-part', '2');
    await expect(page.locator('[data-proc-pair-card="reference"]')).toHaveAttribute('data-highlight-part', '5');
    await inspect(page, `process-metal-${width}`, '[data-proc-paired-explorer]');
    await page.locator('[data-proc-reference]').selectOption('spot');
    await page.locator('[data-proc-focus="shield"]').click();
    await expect(page.locator('[data-proc-pair-card="reference"]')).toHaveAttribute('data-highlight-part', '5');
    await page.locator('[data-proc-pair-swap]').click();
    await expect(page.locator('[data-proc-pair-card="primary"]')).toHaveAttribute('data-process', 'spot');
    await expect(page.locator('[data-proc-pair-card="reference"]')).toHaveAttribute('data-process', 'mig');
    expect(await page.evaluate(() => (window as any).__toolData.weldLab.proc2_guess)).toEqual({ 0: 'tig' });
    await inspect(page, `process-spot-${width}`, '[data-proc-paired-explorer]');
    expect(errors).toEqual([]);
  });

  test(`Joint assembly separates, fits and reveals the five configurations at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    const assertFraming = async () => {
      const outside = await page.locator('[data-joint-explorer-diagram]').evaluate((svg: SVGSVGElement) => {
        const v = svg.viewBox.baseVal, inverse = svg.getScreenCTM()!.inverse();
        return [...svg.querySelectorAll<SVGGraphicsElement>('[data-joint-explorer-part]')].filter(el => {
          const b = el.getBBox(), matrix = inverse.multiply(el.getScreenCTM()!);
          return [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].some(([x, y]) => {
            const p = new DOMPoint(x, y).matrixTransform(matrix);
            return p.x < v.x + 1 || p.y < v.y + 1 || p.x > v.x + v.width - 1 || p.y > v.y + v.height - 1;
          });
        }).length;
      });
      expect(outside).toBe(0);
    };
    await mount(page, width, { view: 'jointCatalog', proc2_prep: 'u' });
    await page.locator('[data-joint-stage="separate"]').click();
    await expect(page.locator('[data-joint-explorer]')).toHaveAttribute('data-joint-assembly', 'separate');
    await assertFraming();
    await page.locator('[data-joint-focus="plateB"]').click();
    await page.locator('[data-joint-stage="fit"]').click();
    await expect(page.locator('[data-joint-explorer-part="weld"]')).toHaveCount(0);
    await page.locator('[data-joint-stage="weld"]').click();
    await page.locator('[data-joint-focus="weld"]').click();
    await page.getByRole('radiogroup', { name: 'Edge preparation', exact: true }).getByRole('radio', { name: 'J-groove', exact: false }).click();
    await expect(page.locator('[data-joint-explorer]')).toHaveAttribute('data-joint-explorer-prep', 'j');
    for (const joint of ['butt', 'lap', 'tjoint', 'corner', 'edge']) {
      await page.locator('#proc2-tab-' + joint).click();
      await expect(page.locator('[data-joint-explorer]')).toHaveAttribute('data-joint-explorer', joint);
      await expect(page.locator('[data-joint-explorer-highlight]')).toHaveAttribute('data-joint-explorer-highlight', 'weld');
      expect(await page.locator('[data-joint-explorer-part="weld"]').count()).toBeGreaterThan(0);
      await assertFraming();
      await inspect(page, `joint-${joint}-${width}`, '[data-joint-explorer]');
    }
    await page.getByRole('button', { name: '🎯 Start Quiz', exact: true }).click();
    await expect(page.locator('[data-joint-explorer]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test(`Career milestones follow authored ages, pay and the highlighted timeline at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, { view: 'careerStories', cs_mode: 'browse', cs_sel: 1, car2_reflect: 'My existing question.' });
    await page.locator('[data-career-milestone-next]').click();
    await expect(page.locator('[data-career-milestone]')).toHaveAttribute('data-stage-kind', 'school');
    await expect(page.locator('[data-career-milestone-pay]')).toHaveText('unpaid');
    await expect(page.locator('[data-career-timeline-highlight]')).toHaveAttribute('data-career-timeline-highlight', '1');
    await inspect(page, `career-school-${width}`, '[data-career-milestone]');
    await page.locator('[data-career-milestone-next]').click();
    await expect(page.locator('[data-career-milestone-next]')).toBeDisabled();
    await expect(page.locator('[data-career-milestone]')).toHaveAttribute('data-stage-kind', 'weld');
    await page.locator('[data-career-milestone-reflect]').click();
    await expect(page.locator('#car2-reflect')).toBeFocused();
    await expect(page.locator('#car2-reflect')).toHaveValue('My existing question.');
    await page.getByRole('button', { name: /^Mike H.,/ }).click();
    await page.locator('[data-career-milestone-pick="1"]').click();
    await expect(page.locator('[data-career-milestone]')).toHaveAttribute('data-stage-kind', 'teach');
    await page.getByRole('button', { name: /^Sarah K.,/ }).click();
    await expect(page.locator('[data-career-milestone]')).toHaveAttribute('data-stage-index', '2');
    await inspect(page, `career-weld-${width}`, '[data-career-milestone]');
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

test('New explorer activities retain contrast and visible selection', async ({ page }) => {
  for (const [name, state, selector] of [
    ['symbols', { view: 'symbolsReader', sr_view: 'library' }, '[data-symbol-run]'],
    ['process', { view: 'processCompare' }, '[data-proc-paired-explorer]'],
    ['joints', { view: 'jointCatalog', jc_tab: 'tjoint' }, '[data-joint-explorer]'],
    ['stories', { view: 'careerStories', cs_mode: 'browse', cs_sel: 1, cs_milestones: { sarah: 1 } }, '[data-career-milestone]'],
  ] as const) {
    await mount(page, 390, state, true);
    if (name === 'process') await page.locator('[data-proc-compare-toggle]').click();
    if (name === 'joints') { await page.locator('[data-joint-stage="weld"]').click(); await page.locator('[data-joint-focus="weld"]').click(); }
    if (name === 'stories') {
      const active = await page.locator('[data-career-milestone-pick="1"]').evaluate((el: Element) => ({ color: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor }));
      const inactive = await page.locator('[data-career-milestone-pick="0"]').evaluate((el: Element) => ({ color: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor }));
      expect(active).not.toEqual(inactive);
    }
    await inspect(page, name + '-contrast', selector);
    await harness.destroy(page);
  }
});

test('Local preview reaches the four explorer activities', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(harness.url + '/tmp/weld-review/index.html?pass=explorers#symbols');
  await expect(page.locator('[data-symbol-run]')).toBeVisible();
  for (const [label, selector] of [['Process cutaways', '[data-proc-paired-explorer]'], ['Joint assembly', '[data-joint-explorer]'], ['Career milestones', '[data-career-milestone]']]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    if (label === 'Process cutaways') await page.locator('[data-proc-compare-toggle]').click();
    await expect(page.locator(selector)).toBeVisible();
  }
  expect(errors).toEqual([]);
});

