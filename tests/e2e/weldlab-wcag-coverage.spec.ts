import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-wcag-coverage');
const harness = new GlHarness({
  toolId: 'weldLab', toolFile: 'stem_lab/stem_tool_weldlab.js',
  preScripts: ['stem_lab/stem_lab_module.js', 'app_styles_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], appStyles: true, layout: 'document',
  probes: `(function () {
    var original = THREE.PerspectiveCamera.prototype.lookAt;
    THREE.PerspectiveCamera.prototype.lookAt = function () {
      window.__wcagCamera = this;
      return original.apply(this, arguments);
    };
  })();`
});

test.describe.configure({ timeout: 180_000, retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, width: number, state: object, contrast = false, motion: 'reduce' | 'no-preference' = 'reduce') {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: motion, forcedColors: 'none' });
  await harness.mount(page, { weldLab: state }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const host = document.createElement('div'); host.id = 'wcag-host-styles'; document.body.append(host);
    const w = window as any;
    w.ReactDOM.render(w.React.createElement(w.AlloModules.AppStyles.AppStyles), host);
  });
  await page.addStyleTag({ content: 'html,body{height:auto;background:#f8fafc}#wrap{width:100%;height:auto;display:block}' });
  await page.locator('#wrap').evaluate((el: HTMLElement) => {
    el.style.width = '100%'; el.style.height = 'auto'; el.style.display = 'block';
  });
  await page.waitForFunction(() => Math.abs(document.getElementById('wrap')!.getBoundingClientRect().width - innerWidth) < 1);
  if (contrast) await page.evaluate(() => {
    document.body.classList.add('theme-contrast');
    Object.assign((window as any).__ctx, { isContrast: true, theme: 'contrast' });
    (window as any).__rerender();
  });
  await page.waitForTimeout(250);
}

async function enter(page: Page, control: Locator) { await control.focus(); await page.keyboard.press('Enter'); }
async function focusVisible(page: Page, control: Locator) {
  await expect(control).toBeFocused();
  const box = await control.boundingBox();
  expect(box).toBeTruthy(); expect(box!.y).toBeLessThan(900); expect(box!.y + box!.height).toBeGreaterThan(0);
  const outline = await control.evaluate((el: HTMLElement) => ({ width: parseFloat(getComputedStyle(el).outlineWidth), style: getComputedStyle(el).outlineStyle }));
  expect(outline.width).toBeGreaterThanOrEqual(2); expect(outline.style).not.toBe('none');
}
async function state(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.weldLab))); }
async function audit(page: Page, name: string) {
  await page.waitForTimeout(250);
  const result = await page.evaluate(async () => {
    const axe = (window as any).axe; axe.reset();
    const r = await axe.run(document.getElementById('wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
    const detail = (v: any) => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map((n: any) => ({ target: n.target, html: n.html, summary: n.failureSummary, checks: [...n.any, ...n.all, ...n.none].map((c: any) => ({ id: c.id, message: c.message, data: c.data })) })) });
    return { overflow: document.documentElement.scrollWidth - innerWidth, violations: r.violations.map(detail), incomplete: r.incomplete.map(detail) };
  });
  writeFileSync(resolve(output, name + '.json'), JSON.stringify(result, null, 2));
  expect(result.overflow).toBeLessThanOrEqual(1); expect(result.violations).toEqual([]);
}

const composition = { C: .1, Mn: 0, Cr: 0, Mo: 0, V: 0, Ni: 0, Cu: 0 };
for (const width of [1280, 320]) {
  test('Pipe checks require activation and recover focus at ' + width + 'px', async ({ page }) => {
    await mount(page, width, { view: 'pipeWelding', pipe_sect: 'positions', pipe2_pos: '6GR', pipe2_hour: 6 });
    await enter(page, page.locator('[data-pipe-check-start]'));
    const clock = page.locator('[data-pipe-clock]');
    const hour = (n: number) => clock.getByRole('radio', { name: n + " o'clock", exact: true });
    await focusVisible(page, hour(1));
    expect(await clock.getAttribute('aria-describedby')).toBe('pipe2-check-prompt');
    await page.keyboard.press('ArrowRight'); await expect(hour(2)).toBeFocused();
    expect(await state(page)).toMatchObject({ pipe2_chal: 0, pipe2_hour: 1 });
    for (const n of [6, 9, 12]) await enter(page, hour(n));
    await expect(page.locator('#allo-live-weldlab')).toContainText('All three found');
    await enter(page, page.getByRole('button', { name: '↺ Reset', exact: true }));
    await focusVisible(page, page.locator('[data-pipe-check-start]'));
    await enter(page, page.locator('[data-pipe-check-start]'));
    await enter(page, page.getByRole('button', { name: 'Stop the check', exact: true }));
    await focusVisible(page, page.locator('[data-pipe-check-start]'));
    await audit(page, 'pipe-clock-' + width);
    await mount(page, width, { view: 'pipeWelding', pipe_sect: 'passes', pipe2_wall: .218, pipe2_stack: [] });
    await enter(page, page.getByRole('button', { name: '＋ Fill', exact: true }));
    await expect(page.locator('#allo-live-weldlab')).toContainText('Start at the bottom');
    for (const label of ['＋ Root', '＋ Hot pass', '＋ Cap']) await enter(page, page.getByRole('button', { name: label, exact: true }));
    await focusVisible(page, page.locator('[data-pipe-stack-complete]'));
    await expect(page.locator('[data-pipe-stack-complete]')).toContainText('Joint complete: 3 passes');
    await audit(page, 'pipe-pass-completion-' + width);
  });

  test('Metallurgy predictions and cases retain keyboard context at ' + width + 'px', async ({ page }) => {
    await mount(page, width, { view: 'metallurgy', met_sect: 'ce', met_ce_comp: composition });
    const choices = page.getByRole('radiogroup', { name: 'Your CE band prediction' }).getByRole('radio');
    await choices.first().focus(); await page.keyboard.press('ArrowRight');
    await expect(choices.nth(1)).toBeFocused(); expect((await state(page)).met2_cePred).toBeUndefined();
    expect((await state(page)).met2_ceTally).toBeUndefined();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('radiogroup', { name: 'Your CE band prediction' })).toHaveCount(0);
    await expect(page.locator(':focus')).toContainText('You predicted');
    expect((await state(page)).met2_ceTally.n).toBe(1);
    await audit(page, 'ce-graded-' + width);
    await mount(page, width, { view: 'metallurgy', met_sect: 'ce', met_ce_comp: composition });
    await enter(page, page.getByRole('button', { name: 'Skip the prediction and show the CE live', exact: true }));
    await enter(page, page.getByRole('button', { name: 'Turn the prediction step back on', exact: true }));
    await focusVisible(page, page.getByRole('radiogroup', { name: 'Your CE band prediction' }).getByRole('radio').first());
    await mount(page, width, { view: 'metallurgy', met_sect: 'haz', met2_hazH: 16, met2_hazPredH0: 16 });
    await enter(page, page.getByRole('radiogroup', { name: 'Your heat-input prediction' }).getByRole('radio').nth(2));
    await expect(page.locator(':focus')).toContainText('Locked in: C');
    const heat = page.locator('#met2-haz-h'); await heat.focus(); await page.keyboard.press('End');
    await enter(page, page.getByRole('button', { name: '↺ Reset my prediction', exact: true }));
    await focusVisible(page, page.getByRole('radiogroup', { name: 'Your heat-input prediction' }).getByRole('radio').first());
    await expect(heat).toBeDisabled(); await audit(page, 'haz-reset-' + width);
    await mount(page, width, { view: 'metallurgy', met_sect: 'cracking', met2_cdIdx: 0 });
    await enter(page, page.getByRole('button', { name: 'Next case →', exact: true }));
    await focusVisible(page, page.locator('[data-met-crack-case="1"]'));
    await expect(page.locator('[data-met-crack-case="1"]')).toHaveAccessibleDescription(/Case 2 of 6/);
    await enter(page, page.getByRole('button', { name: '↺ Reset cases and score', exact: true }));
    await focusVisible(page, page.locator('[data-met-crack-case="0"]')); await audit(page, 'crack-reset-' + width);
  });
}

test('Robot labels, inspection legend and native gauge remain usable', async ({ page }) => {
  await mount(page, 320, { view: 'robotic', rob_sect: 'pendant', tech2_rob_prog: [{ x: 4, y: 6, m: 'J', w: false }] });
  await enter(page, page.getByRole('button', { name: 'Joint: Point 1: switch move type', exact: true }));
  await expect(page.getByRole('button', { name: 'Linear: Point 1: switch move type', exact: true })).toHaveText('Linear');
  const grid = page.locator('[role="application"][aria-describedby="tech2-rob-help"]'); await grid.focus();
  const before = await state(page), label = await grid.getAttribute('aria-label');
  // Dispatching cancelable synthetic events verifies the application handler's
  // pass-through. It does not simulate the browser's own zoom or AT shortcuts.
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
    const canceled = await grid.evaluate((el, mod) => !el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', [mod]: true, bubbles: true, cancelable: true })), modifier);
    expect(canceled).toBe(false); expect(await state(page)).toEqual(before);
  }
  await page.keyboard.press('ArrowRight'); expect(await grid.getAttribute('aria-label')).not.toBe(label);
  await mount(page, 320, { view: 'inspection', insp_sect: 'bench' });
  const gauge = page.locator('svg[role="slider"]'); await gauge.focus();
  await page.keyboard.press('Control+ArrowRight'); await expect(gauge).toHaveAttribute('aria-valuenow', '0');
  await page.keyboard.press('ArrowRight'); await expect(gauge).toHaveAttribute('aria-valuenow', '0.25');
  await page.keyboard.press('Shift+ArrowRight'); await expect(gauge).toHaveAttribute('aria-valuenow', '1.25');
  await page.keyboard.press('Tab'); await expect(gauge).not.toBeFocused();
  await mount(page, 320, { view: 'inspection', insp_sect: 'visual' });
  await expect(page.getByRole('group', { name: 'Diagram legend', exact: true })).toContainText('Yellow outline');
  await audit(page, 'inspection-legend-320');
});

test('3D camera preserves modified zoom shortcuts and retains ordinary zoom controls', async ({ page }) => {
  await mount(page, 960, { view: 'beadLab', bl_view: '3d' });
  const scene = page.locator('canvas[aria-label^="3D welding scene."]');
  await expect(scene).toBeVisible();
  await page.waitForFunction(() => !!(window as any).__wcagCamera);
  const camera = () => page.evaluate(() => (window as any).__wcagCamera.position.toArray());
  const original = await camera();
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
    for (const key of ['+', '-']) {
      expect(await scene.evaluate((el, data) => !el.dispatchEvent(new KeyboardEvent('keydown', { ...data, bubbles: true, cancelable: true })), { key, [modifier]: true })).toBe(false);
      expect(await camera()).toEqual(original);
    }
    expect(await scene.evaluate((el, mod) => !el.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, [mod]: true, bubbles: true, cancelable: true })), modifier)).toBe(false);
    expect(await camera()).toEqual(original);
  }
  await scene.focus(); await page.keyboard.press('+'); expect(await camera()).not.toEqual(original);
  const keyZoom = await camera();
  expect(await scene.evaluate(el => !el.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true })))).toBe(true);
  expect(await camera()).not.toEqual(keyZoom);
  await enter(page, page.getByRole('button', { name: 'Reset camera to default angle', exact: true }));
  const reset = await camera(); for (let i = 0; i < 3; i++) expect(reset[i]).toBeCloseTo(original[i], 6);
  await expect(page.getByRole('group', { name: '3D scene camera controls', exact: true }).getByRole('button')).toHaveCount(7);
  const contexts = await harness.glContexts(page); expect(contexts.some(c => c.createdBy === 'page' && c.draws > 0)).toBe(true);
});

test('Ordinary-motion hands-on pass and Live Run recover keyboard focus', async ({ page }) => {
  await mount(page, 960, { view: 'beadLab', arc_handsOn: true, arc_handSpeed: 30, arc_run: [] }, false, 'no-preference');
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(false);
  const plate = page.locator('canvas[tabindex="0"]'); await plate.focus(); await page.keyboard.press('ArrowDown');
  await expect(page.locator('#allo-live-weldlab')).toHaveText('Hand speed 29.0 in/min.');
  const hold = page.getByRole('button', { name: 'Hold to weld at the hand speed', exact: true });
  await hold.focus(); await page.keyboard.down('Enter');
  try { await expect(hold).toBeDisabled({ timeout: 25_000 }); } finally { await page.keyboard.up('Enter'); }
  await focusVisible(page, page.getByRole('button', { name: '↺ New plate', exact: true }));
  await expect(page.locator('#allo-live-weldlab')).toContainText('Pass complete. Uniformity');
  expect((await state(page)).arc_run.length).toBeGreaterThan(0);
  await mount(page, 960, { view: 'speedChallenge' }, false, 'no-preference');
  await enter(page, page.getByRole('button', { name: /Strike the arc/ }));
  const zone = page.locator('[role="group"][tabindex="0"]'); await focusVisible(page, zone);
  await page.keyboard.press('ArrowRight'); await expect(page.locator('#allo-live-weldlab')).toContainText('Travel speed');
  // Run the actual canvas/RAF state machine; stopping after several seconds
  // supplies real recorded slices for review without waiting for a full pass.
  await page.waitForTimeout(4500);
  await enter(page, page.getByRole('button', { name: /Stop run/ }));
  await focusVisible(page, page.getByRole('heading', { name: /After-action review/ }));
  await expect(page.getByRole('slider', { name: 'Inspect the bead at', exact: true })).toBeVisible();
  await enter(page, page.locator('[data-run-pin]')); await focusVisible(page, page.locator('[data-run-clear-pin]'));
  await enter(page, page.locator('[data-run-clear-pin]')); await focusVisible(page, page.locator('[data-run-pin]'));
  await expect(page.locator('#allo-live-weldlab')).toHaveText('Pinned slice cleared.');
  await audit(page, 'live-run-review');
});

test('Text spacing is applied and new task layouts reflow at 320px', async ({ page }) => {
  const fixtures = [
    { name: 'pipe-clock', state: { view: 'pipeWelding', pipe_sect: 'positions', pipe2_chal: 0 } },
    { name: 'ce-choices', state: { view: 'metallurgy', met_sect: 'ce', met_ce_comp: composition } },
    { name: 'crack-story', state: { view: 'metallurgy', met_sect: 'cracking', met2_cdIdx: 5 } },
    { name: 'hands-on', state: { view: 'beadLab', arc_handsOn: true } },
    { name: 'inspection-gauge', state: { view: 'inspection', insp_sect: 'bench' } }
  ];
  for (const f of fixtures) {
    await mount(page, 320, f.state);
    await page.addStyleTag({ content: '#wrap#wrap [data-weld-view],#wrap#wrap [data-weld-view] *{letter-spacing:.12em!important;word-spacing:.16em!important;line-height:1.5!important}#wrap#wrap [data-weld-view] p{margin-bottom:2em!important}' });
    const applied = await page.locator('[data-weld-view] p').first().evaluate((el: HTMLElement) => {
      const s = getComputedStyle(el), size = parseFloat(s.fontSize);
      return { letter: parseFloat(s.letterSpacing) / size, word: parseFloat(s.wordSpacing) / size, line: parseFloat(s.lineHeight) / size, paragraph: parseFloat(s.marginBottom) / size };
    });
    expect(applied.letter).toBeCloseTo(.12, 3); expect(applied.word).toBeCloseTo(.16, 3);
    expect(applied.line).toBeCloseTo(1.5, 3); expect(applied.paragraph).toBeCloseTo(2, 3);
    await audit(page, 'spacing-' + f.name + '-320');
    await page.locator('[data-weld-view]').screenshot({ path: resolve(output, 'spacing-' + f.name + '-320.png') });
  }
});

test('HAZ zone widths are keyboard-scrollable at 320px in high contrast', async ({ page }) => {
  await mount(page, 320, { view: 'metallurgy', met_sect: 'haz', met2_hazH: 16 }, true);
  const region = page.getByRole('region', { name: 'Zone widths at these settings (distance past the fusion line)', exact: true });
  expect(await region.evaluate(el => el.scrollWidth - el.clientWidth)).toBeGreaterThan(0);
  await region.focus(); await page.keyboard.press('Shift+Tab'); await expect(region).not.toBeFocused();
  await page.keyboard.press('Tab'); await focusVisible(page, region);
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => region.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  await region.screenshot({ path: resolve(output, 'haz-zone-table-320-contrast.png') });
  await page.keyboard.press('Tab'); await expect(region).not.toBeFocused();
  await audit(page, 'haz-zone-table-320-contrast');
});

test('Forced colors preserves native and custom control focus', async ({ page }) => {
  const fixtures = [
    { name: 'pipe', state: { view: 'pipeWelding', pipe_sect: 'positions' }, selector: '[data-pipe-clock] [role="radio"][aria-checked="true"]' },
    { name: 'ce', state: { view: 'metallurgy', met_sect: 'ce', met_ce_comp: composition }, selector: '[aria-label="Your CE band prediction"] [role="radio"]' },
    { name: 'gauge', state: { view: 'inspection', insp_sect: 'bench' }, selector: 'svg[role="slider"]' },
    { name: 'run', state: { view: 'speedChallenge' }, selector: '[role="group"][tabindex="0"]' }
  ];
  for (const f of fixtures) {
    await mount(page, 320, f.state); await page.emulateMedia({ forcedColors: 'active' });
    expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);
    const target = page.locator(f.selector).first(); await target.focus(); await page.keyboard.press('Shift+Tab'); await target.focus();
    await focusVisible(page, target);
    await target.screenshot({ path: resolve(output, 'forced-colors-' + f.name + '-320.png') });
    await page.keyboard.press('Tab'); await expect(target).not.toBeFocused();
    await audit(page, 'forced-colors-' + f.name + '-320');
  }
});
