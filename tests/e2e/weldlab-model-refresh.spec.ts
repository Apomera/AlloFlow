import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-model-refresh');
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
const positionState = { view: 'jointCatalog', jc_tab: 'butt', proc2_pos: '6G', proc2_jqOn: false, proc2_jqBest: 3 };
const coolingState = { view: 'metallurgy', met_sect: 'haz', met2_hazMat: 'steel', met2_hazH: 16, met2_hazTh: .25, met2_hazT0F: 70, met2_hazPred: 2 };
const postureState = { view: 'safetyHealth', sh_mode: 'browse', sh_sect: 'ergonomics', sh_audit: { ventilation: 'no' } };

for (const width of [1280, 390]) {
  test('Groove and fillet positions share local native controls at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, positionState);
    const panel = page.locator('[data-joint-position-pair]');
    await expect(panel).not.toHaveAttribute('open', '');
    const original = await page.locator('[data-proc2="pos-6G"]').evaluate(el => el.outerHTML);
    const before = await saved(page);
    await panel.locator('summary').focus(); await page.keyboard.press('Enter');
    await expect(panel).toHaveAttribute('open', '');
    for (const digit of ['1', '2', '3', '4']) {
      await page.locator('[data-joint-position-option="' + digit + '"]').click();
      await expect(panel).toHaveAttribute('data-joint-position-pair', digit);
      for (const side of ['G', 'F']) {
        const card = panel.locator('[data-joint-position-card="' + side + '"]');
        await expect(card).toHaveAttribute('data-code', digit + side);
        await expect(card.locator('[data-proc2="pos-' + digit + side + '"]')).toBeVisible();
        await expect(card.locator('[data-joint-position-description]')).not.toBeEmpty();
      }
      expect((await page.locator('[data-joint-position-option="' + digit + '"]').boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await panel.locator('[data-joint-position-digit="4"]').focus(); await page.keyboard.press('ArrowLeft');
    await expect(panel).toHaveAttribute('data-joint-position-pair', '3');
    expect(await saved(page)).toBe(before);
    expect(await page.locator('[data-proc2="pos-6G"]').evaluate(el => el.outerHTML)).toBe(original);
    await inspect(page, 'position-pairs-' + width, '[data-joint-position-pair]'); expect(errors).toEqual([]);
  });

  test('Cooling thickness probe follows the original t8/5 model at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, coolingState);
    const panel = page.locator('[data-t85-sweep]');
    await expect(panel).not.toHaveAttribute('open', '');
    const before = await saved(page);
    await panel.locator('summary').focus(); await page.keyboard.press('Enter');
    const expected = await page.evaluate(() => {
      const c = (window as any).__WeldLabCore;
      return [.125, .25, .5, 1, 2].map(thickness => ({ thickness, ...c.met2T85(16 / 25.4, thickness * 25.4, (70 - 32) * 5 / 9) }));
    });
    const yMaximum = await number(panel, 'data-y-max');
    const curve = await panel.locator('[data-t85-curve]').getAttribute('points');
    for (const point of expected) {
      await range(panel.locator('[data-t85-probe]'), point.thickness);
      expect(await number(panel, 'data-probe-in')).toBeCloseTo(point.thickness, 10);
      expect(await number(panel, 'data-time-s')).toBeCloseTo(point.t85, 10);
      expect(await number(panel.locator('[data-t85-reading="probe"]'), 'data-value')).toBeCloseTo(point.t85, 10);
      expect(await number(panel.locator('[data-t85-reading="plateau"]'), 'data-value')).toBeCloseTo(point.t3, 10);
      expect(await number(panel.locator('[data-t85-marker]'), 'cx')).toBeCloseTo(96 + (point.thickness - .125) / 1.875 * 576, 8);
      expect(await number(panel.locator('[data-t85-marker]'), 'cy')).toBeCloseTo(280 - point.t85 / yMaximum * 240, 8);
      expect(await number(panel, 'data-y-max')).toBe(yMaximum);
      expect(await panel.locator('[data-t85-curve]').getAttribute('points')).toBe(curve);
      await expect(panel.locator('[data-t85-regime]')).toContainText(point.regime === '2d' ? '2-D' : '3-D');
    }
    await panel.locator('[data-t85-set="thin"]').click();
    await panel.locator('[data-t85-probe]').focus(); await page.keyboard.press('ArrowRight');
    expect(Number(await panel.locator('[data-t85-probe]').inputValue())).toBeGreaterThan(.125);
    expect(await number(panel, 'data-probe-in')).toBeGreaterThan(.125);
    await panel.locator('[data-t85-set="transition"]').click();
    await expect(panel.locator('[data-t85-plot]')).toBeVisible();
    await expect(panel.locator('[data-t85-transition]')).toBeAttached();
    expect(await number(panel.locator('[data-t85-transition]'), 'y2') - await number(panel.locator('[data-t85-transition]'), 'y1')).toBe(240);
    expect(await number(panel, 'data-probe-in')).toBeCloseTo(await number(panel, 'data-transition-in'), 10);
    expect(await number(panel, 'data-time-s')).toBeCloseTo(await number(panel.locator('[data-t85-reading="plateau"]'), 'data-value'), 10);
    const labels = await panel.locator('[data-t85-plot]').evaluate((svg: SVGSVGElement) => {
      const width = svg.getBoundingClientRect().width;
      return [...svg.querySelectorAll('text')].map(text => {
        const box = text.getBBox(); return { left: box.x, right: box.x + box.width, top: box.y, bottom: box.y + box.height,
          fontSize: parseFloat(getComputedStyle(text).fontSize) * width / 720 };
      });
    });
    for (const label of labels) {
      expect(label.left).toBeGreaterThanOrEqual(0); expect(label.right).toBeLessThanOrEqual(720);
      expect(label.top).toBeGreaterThanOrEqual(0); expect(label.bottom).toBeLessThanOrEqual(360);
      expect(label.fontSize).toBeGreaterThanOrEqual(10);
    }
    expect(await saved(page)).toBe(before);
    await inspect(page, 'cooling-thickness-' + width, '[data-t85-sweep]'); expect(errors).toEqual([]);
  });

  test('Posture study links all five arrangements to complete original notes at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, postureState);
    const panel = page.locator('[data-posture-study]'), before = await saved(page);
    const shapes: string[] = [];
    for (const [index, id] of ['overhead', 'vertical', 'pipe', 'confined', 'flat'].entries()) {
      await panel.locator('[data-posture-select]').selectOption(String(index));
      await expect(panel).toHaveAttribute('data-posture-study', id);
      await expect(panel.locator('[data-posture-diagram]')).toHaveAttribute('data-posture-diagram', id);
      for (const field of ['name', 'risk', 'mitigate']) await expect(panel.locator('[data-posture-' + field + ']')).not.toBeEmpty();
      shapes.push(await panel.locator('[data-posture-worker]').evaluate(el => [...el.querySelectorAll('path')].map(path => path.getAttribute('d')).join('|')));
    }
    expect(new Set(shapes).size).toBe(5);
    await expect(panel.locator('[data-posture-next]')).toBeDisabled();
    await panel.locator('[data-posture-prev]').click(); await expect(panel).toHaveAttribute('data-index', '3');
    await panel.locator('[data-posture-select]').focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    await expect(panel).toHaveAttribute('data-index', '4');
    await page.keyboard.press('ArrowUp'); await page.keyboard.press('Enter'); await expect(panel).toHaveAttribute('data-index', '3');
    for (const control of await panel.locator('button,select').all()) expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await saved(page)).toBe(before);
    await inspect(page, 'posture-study-' + width, '[data-posture-study]'); expect(errors).toEqual([]);
  });
}

test('Model explorers remain readable in high contrast', async ({ page }) => {
  for (const [name, state, selector] of [
    ['position-pairs', positionState, '[data-joint-position-pair]'],
    ['cooling-thickness', coolingState, '[data-t85-sweep]'],
    ['posture-study', postureState, '[data-posture-study]'],
  ] as const) {
    await mount(page, 390, state, true);
    const panel = page.locator(selector);
    if (name !== 'posture-study') await panel.locator('summary').click();
    if (name === 'posture-study') await panel.locator('[data-posture-select]').selectOption('2');
    await inspect(page, name + '-contrast', selector);
  }
});

test('Local preview shortcuts open the three new study tools', async ({ page }) => {
  const url = process.env.WELDLAB_PREVIEW_URL; test.skip(!url, 'Local preview is opt-in.');
  await page.setViewportSize({ width: 390, height: 900 }); await page.goto(url!);
  await page.waitForFunction(() => Boolean((document.getElementById('preview-app-css') as HTMLLinkElement)?.sheet));
  await page.locator('[data-joint-position-pair] summary').click();
  await expect(page.locator('[data-joint-position-cards]')).toBeVisible();
  await page.getByRole('button', { name: 'Cooling thickness', exact: true }).click();
  await page.locator('[data-t85-sweep] summary').click(); await expect(page.locator('[data-t85-plot]')).toBeVisible();
  await page.getByRole('button', { name: 'Posture study', exact: true }).click();
  await expect(page.locator('[data-posture-study]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
