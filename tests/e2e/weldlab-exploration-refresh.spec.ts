import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-exploration-refresh');
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

const menuState = { view: 'menu', menu_mode: 'path', insp2_clause: { 0: 1 } };
const program = [{ x: 4, y: 6, m: 'J', w: false }, { x: 12, y: 6, m: 'L', w: true }, { x: 1, y: 2, m: 'J', w: false }];
const robotState = { view: 'robotic', rob_sect: 'pendant', tech2_rob_prog: program };
const clauseState = { view: 'codes', insp2_codesTab: 'clause', insp2_clauseIdx: 0, insp2_clause: {} };

async function openRobot(page: any) {
  await page.locator('[data-robot-inspect-select]').selectOption('2');
  await page.locator('[data-robot-reference-toggle]').click();
}
async function answerClause(page: any) {
  await page.getByRole('radiogroup', { name: 'Pick the clause', exact: true }).getByRole('radio').nth(1).click();
}
async function prepareMenu(page: any) {
  await page.locator('[data-weld-module-unit]').selectOption('drawing');
}
for (const width of [1280, 390]) {
  test('Module finder searches authored metadata and intersects learning units at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, menuState); const before = await saved(page);
    const query = page.locator('[data-weld-module-query]'), unit = page.locator('[data-weld-module-unit]');
    await query.fill('  HEAT   input   calculator  ');
    await expect(page.locator('[data-weld-module-result]')).toHaveCount(1);
    await expect(page.locator('[data-weld-module-result="heatInput"]')).toBeVisible();
    await unit.selectOption('drawing'); await expect(page.locator('[data-weld-module-empty]')).toBeVisible();
    await expect(page.locator('[data-weld-module-result]')).toHaveCount(0);
    await page.locator('[data-weld-module-clear]').click();
    await expect(query).toHaveValue(''); await expect(unit).toHaveValue('all');
    await expect(page.locator('[data-weld-module-results]')).toHaveCount(0);
    await prepareMenu(page);
    expect(await page.locator('[data-weld-module-result]').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-weld-module-result')))).toEqual(['jointCatalog', 'symbolsReader', 'mathBlueprint']);
    expect(await saved(page)).toBe(before);
    await query.focus(); await page.keyboard.type('blueprint'); await expect(page.locator('[data-weld-module-result="mathBlueprint"]')).toBeVisible();
    await query.fill('');
    expect((await query.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect((await unit.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await inspect(page, 'module-finder-' + width, '[data-weld-module-workspace]');
    await page.locator('[data-weld-module-result="mathBlueprint"] button').click();
    expect(await page.evaluate(() => (window as any).__toolData.weldLab.view)).toBe('mathBlueprint'); expect(errors).toEqual([]);
  });

  test('Joint references show exact sampled and chord geometry without revealing faults at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, robotState); const before = await saved(page);
    await expect(page.locator('[data-robot-reference-toggle]')).toBeDisabled();
    await openRobot(page);
    const layer = page.locator('[data-robot-reference-layer]'), chord = layer.locator('[data-robot-reference-chord]');
    const segment = await page.evaluate(program => (window as any).__WeldLabCore.tech2.checkProgram(program, {}).segments[2], program);
    for (const [attr, value] of [['x1', segment.a.x], ['y1', segment.a.y], ['x2', segment.b.x], ['y2', segment.b.y]] as const) expect(await number(chord, attr)).toBe(8 + (value + .5) * 24);
    const expected = segment.path.map((p: any, i: number) => (i ? 'L ' : 'M ') + (8 + (p.x + .5) * 24).toFixed(1) + ' ' + (8 + (p.y + .5) * 24).toFixed(1)).join(' ');
    await expect(layer.locator('[data-robot-reference-bow]')).toHaveAttribute('d', expected);
    expect(segment.bad).toBe('collision'); expect(await layer.getAttribute('stroke')).not.toBe('#f87171');
    await expect(page.locator('[data-robot-inspect-issues]')).toHaveCount(0);
    await expect(page.getByText('The program needs work.', { exact: true })).toHaveCount(0);
    expect(await saved(page)).toBe(before);
    await page.locator('[data-robot-reference-toggle]').focus(); await page.keyboard.press('Space'); await expect(layer).toHaveCount(0);
    await page.keyboard.press('Space'); await expect(layer).toBeAttached();
    await page.locator('[data-robot-inspect-select]').selectOption('1'); await expect(page.locator('[data-robot-reference-toggle]')).toHaveCount(0);
    await page.locator('[data-robot-inspect-select]').selectOption('2');
    const scene = page.locator('[data-robot-workcell]').locator('..').locator('..');
    await scene.evaluate(el => el.setAttribute('data-robot-reference-workspace', 'true'));
    await inspect(page, 'joint-reference-' + width, '[data-robot-reference-workspace]'); expect(errors).toEqual([]);
  });

  test('Answered clause lookup follows selected sections and keeps saved answers intact at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await mount(page, width, clauseState); await expect(page.locator('[data-clause-trace]')).toHaveCount(0);
    await answerClause(page); const before = await saved(page), panel = page.locator('[data-clause-trace]');
    await expect(panel).toBeVisible();
    for (const num of [4, 5, 6, 7, 8, 9, 10, 11]) {
      await panel.locator('[data-clause-trace-tab="' + num + '"]').click();
      await expect(panel.locator('[data-clause-trace-tab="' + num + '"]')).toHaveAttribute('aria-pressed', 'true');
      await expect(panel.locator('[data-clause-trace-number]')).toContainText(String(num));
      expect(await panel.locator('[data-clause-trace-body]').innerText()).not.toBe('');
    }
    expect(await saved(page)).toBe(before);
    await panel.locator('[data-clause-trace-tab="8"]').focus(); await page.keyboard.press('Enter');
    await expect(panel.locator('[data-clause-trace-title]')).toHaveText('Inspection');
    const drawingLabels = await panel.locator('[data-clause-trace-drawing] text').evaluateAll(nodes => nodes.map((el: SVGTextElement) => { const b=el.getBBox(); return { right:b.x+b.width, bottom:b.y+b.height, size:parseFloat(getComputedStyle(el).fontSize)*el.ownerSVGElement!.getBoundingClientRect().width/620 }; }));
    for (const label of drawingLabels) { expect(label.right).toBeLessThanOrEqual(620); expect(label.bottom).toBeLessThanOrEqual(360); expect(label.size).toBeGreaterThanOrEqual(10); }
    await inspect(page, 'clause-trace-' + width, '[data-clause-trace]');
    await page.getByRole('button', { name: /Next task/ }).click(); await expect(panel).toHaveCount(0); expect(errors).toEqual([]);
  });
}

test('New exploration controls remain readable in high contrast', async ({ page }) => {
  for (const [name, state, selector] of [['module-finder', menuState, '[data-weld-module-workspace]'], ['joint-reference', robotState, '[data-robot-reference-workspace]'], ['clause-trace', clauseState, '[data-clause-trace]']] as const) {
    await mount(page, 390, state, true);
    if (name === 'module-finder') await prepareMenu(page);
    if (name === 'joint-reference') { await openRobot(page); await page.locator('[data-robot-workcell]').locator('..').locator('..').evaluate(el => el.setAttribute('data-robot-reference-workspace', 'true')); }
    if (name === 'clause-trace') await answerClause(page);
    await inspect(page, name + '-contrast', selector);
  }
});

test('Local preview opens all three exploration improvements', async ({ page }) => {
  const url = process.env.WELDLAB_PREVIEW_URL; test.skip(!url, 'Local preview is opt-in.');
  await page.setViewportSize({ width: 390, height: 900 }); await page.goto(url!);
  await page.waitForFunction(() => Boolean((document.getElementById('preview-app-css') as HTMLLinkElement)?.sheet));
  await prepareMenu(page); await expect(page.locator('[data-weld-module-result]')).toHaveCount(3);
  await page.getByRole('button', { name: 'Joint move references', exact: true }).click(); await openRobot(page);
  await expect(page.locator('[data-robot-reference-layer]')).toBeAttached();
  await page.getByRole('button', { name: 'Clause lookup', exact: true }).click(); await answerClause(page);
  await expect(page.locator('[data-clause-trace]')).toBeVisible();
});
