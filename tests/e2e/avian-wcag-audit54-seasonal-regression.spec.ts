import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

test.use({ video: 'off', trace: 'off', hasTouch: true });
test.describe.configure({ timeout: 180_000, retries: 0 });
const root = '[data-raptor-seasonal-study]', graph = '[data-climate-timing-chart]';
const report = resolve('reports/avian-simulations-round54-wcag-2026-10-24/seasonal-regression');
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js', extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document' });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
async function size(page: Page, width = 1280, host = 1100) {
  await page.setViewportSize({ width, height: 1000 }); await page.locator('#wrap').evaluate((n: HTMLElement, w) => { n.style.width = w + 'px'; n.style.maxWidth = '100%'; n.setAttribute('data-stem-tool-shell', 'true'); }, host);
}
async function mount(page: Page) {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { raptorHunt: { activeSection: 'climate', climateExperiment: { preyShift: 0, demandShift: 0 }, xp: 23 } }, undefined, { expectCanvas: false }); await size(page); await expect(page.locator(root)).toBeVisible(); return errors;
}
async function peaks(page: Page, prey: number, demand: number) { await page.locator('#rh-climate-preyShift').fill(String(prey)); await page.locator('#rh-climate-demandShift').fill(String(demand)); }
async function reading(page: Page, label = 'current') {
  return page.locator(`[data-seasonal-reading=${label}]`).evaluate(n => ({ prey: Number(n.getAttribute('data-seasonal-prey')), demand: Number(n.getAttribute('data-seasonal-demand')), day: Number(n.getAttribute('data-seasonal-day')) }));
}
const profile = (day: number, peak: number) => Math.exp(-.5 * ((day - peak) / 8) ** 2);
const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 7);
async function verify(page: Page, saved = false) {
  const settings = await reading(page, saved ? 'saved' : 'current');
  for (const id of ['prey', 'demand'] as const) {
    const selector = saved ? `[data-seasonal-saved-curve=${id}]` : `[data-climate-curve=${id}]`;
    const points = await page.locator(selector).evaluate(n => [...n.getAttribute('d')!.matchAll(/[ML]([-\d.e+]+) ([-\d.e+]+)/g)].map(m => [Number(m[1]), Number(m[2])]));
    expect(points).toHaveLength(85);
    points.forEach(([x, y], index) => { const day = index - 42; near((x - 76) * 84 / 608 - 42, day); near((320 - y) / 240, profile(day, settings[id])); });
    await expect(page.locator(`[data-seasonal-reading=${saved ? 'saved' : 'current'}] [data-seasonal-level=${id}]`)).toHaveText(id + ' ' + profile(settings.day, settings[id]).toFixed(3));
  }
  if (!saved) {
    const marker = await page.locator('[data-seasonal-probe-point=prey]').evaluate(n => [Number(n.getAttribute('cx')), Number(n.getAttribute('cy'))]);
    near((marker[0] - 76) * 84 / 608 - 42, settings.day); near((320 - marker[1]) / 240, profile(settings.day, settings.prey));
  }
  return settings;
}
async function chartPoint(page: Page, day: number) {
  return page.locator(graph).evaluate((n: SVGSVGElement, day) => { const p = n.createSVGPoint(); p.x = 76 + (day + 42) * 608 / 84; p.y = 220; const q = p.matrixTransform(n.getScreenCTM()!); return { x: q.x, y: q.y }; }, day);
}
async function gesture(page: Page, from: number, to: number, kind = 'mouse') {
  await page.locator(graph).scrollIntoViewIfNeeded(); const start = await chartPoint(page, from), end = await chartPoint(page, to);
  if (kind === 'mouse') { await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 4 }); await page.mouse.up(); return; }
  await page.locator(graph).evaluate(n => n.addEventListener('pointerdown', e => { (window as any).seasonalPointer = (e as PointerEvent).pointerId; }, { once: true }));
  const cdp = await page.context().newCDPSession(page), initial = { id: 11, ...start, radiusX: 1, radiusY: 1, force: .5 }, moved = { ...initial, ...end };
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [initial] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [moved] });
    if (kind === 'cancel') await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    else {
      if (kind === 'lost' || kind === 'lost-end') {
        const capture = await page.locator(graph).evaluate(n => { const id = (window as any).seasonalPointer, before = n.hasPointerCapture(id); n.releasePointerCapture(id); return { id, before, after: n.hasPointerCapture(id) }; });
        expect(capture.before).toBe(true); expect(capture.after).toBe(false);
        if (kind === 'lost') await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...moved, x: moved.x + 1 }] });
      }
      if (kind === 'multi') await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [moved, { id: 12, x: 5, y: 5, radiusX: 1, radiusY: 1, force: .5 }] });
      if (kind === 'escape') await page.keyboard.press('Escape');
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
  } finally { await cdp.detach(); }
}

test('seasonal curves, same-day readings and complete saved timing stay consistent with existing controls', async ({ page }) => {
  const errors = await mount(page), cases: any[] = [];
  for (const [prey, demand] of [[0, 0], [-21, 21], [16, -12], [-14, -10]]) {
    await peaks(page, prey, demand);
    for (const day of [-42, -14, 0, 17, 42]) {
      await page.locator('[data-seasonal-mode=day]').click(); await gesture(page, day, day);
      cases.push(await verify(page));
    }
  }
  await peaks(page, -14, -10); await page.locator('[data-seasonal-pin]').click();
  const pin = await reading(page), savedPaths = await page.locator('[data-seasonal-saved-curve]').evaluateAll(nodes => nodes.map(n => n.getAttribute('d')));
  await page.locator('[data-seasonal-shift="7"]').click(); expect(await reading(page)).toEqual({ prey: -7, demand: -3, day: pin.day });
  await verify(page, true); expect((await reading(page)).demand - (await reading(page)).prey).toBe(pin.demand - pin.prey);
  await page.locator('[data-seasonal-mode=day]').click(); await page.locator(graph).focus(); await page.keyboard.press('Home');
  expect((await reading(page, 'saved')).day).toBe(-42); await verify(page, true);
  expect(await page.locator('[data-seasonal-saved-curve]').evaluateAll(nodes => nodes.map(n => n.getAttribute('d')))).toEqual(savedPaths);
  await page.getByRole('button', { name: 'Weather records', exact: true }).click();
  await page.evaluate(() => { (window as any).__ctx.props.seasonalProbe = 1; (window as any).__rerender(); });
  await expect(page.locator('[data-seasonal-saved-curve]')).toHaveCount(2);
  await page.locator('[data-seasonal-restore]').click(); expect(await reading(page)).toEqual(pin); await verify(page);
  await expect(page.locator('[data-climate-evidence]')).toHaveAttribute('data-climate-evidence', 'weather');
  await peaks(page, 21, -21); await expect(page.locator('[data-seasonal-shift="7"]')).toBeDisabled(); await expect(page.locator('[data-seasonal-shift="-7"]')).toBeDisabled();
  await page.getByRole('button', { name: 'Aligned reference', exact: true }).click(); expect((await reading(page)).prey).toBe(0); expect((await reading(page)).demand).toBe(0);
  await page.locator('[data-seasonal-clear]').click(); await expect(page.locator('[data-seasonal-pin]')).toBeFocused(); await expect(page.locator('[data-seasonal-saved-curve]')).toHaveCount(0);
  const stored = await page.evaluate(() => (window as any).__toolData.raptorHunt); expect(stored.xp).toBe(23); expect(stored.climateExperiment).toEqual({ preyShift: 0, demandShift: 0 });
  expect(errors).toEqual([]); writeFileSync(resolve(report, 'seasonal-geometry.json'), JSON.stringify({ cases, pin, errors }, null, 2));
});

test('mouse, touch cancellation, keyboard and responsive chart remain accessible', async ({ page }) => {
  const errors = await mount(page), cases: any[] = [];
  for (const [width, host] of [[1280, 1100], [1280, 500], [390, 390]]) {
    await size(page, width, host); await peaks(page, -4, 8);
    await page.locator('[data-seasonal-mode=prey]').click(); await gesture(page, -4, -16); expect((await reading(page)).prey).toBe(-16); expect((await reading(page)).demand).toBe(8);
    await page.locator('[data-seasonal-mode=demand]').click(); await gesture(page, 8, 18, 'touch'); expect((await reading(page)).demand).toBe(18);
    for (const kind of ['cancel', 'lost', 'lost-end', 'multi', 'escape']) { const before = await reading(page); await gesture(page, 18, -17, kind); expect(await reading(page), kind).toEqual(before); }
    await page.locator(graph).focus(); await page.keyboard.press('Home'); expect((await reading(page)).demand).toBe(-21);
    await page.keyboard.press('Shift+ArrowRight'); expect((await reading(page)).demand).toBe(-14); await page.keyboard.press('End'); expect((await reading(page)).demand).toBe(21);
    await page.locator('[data-seasonal-mode=day]').click(); await gesture(page, 0, 12, 'touch'); expect((await reading(page)).day).toBe(12); await verify(page);
    await page.locator('[data-seasonal-pin]').click(); await peaks(page, -8, 16);
    await expect(page.locator('[data-seasonal-axis-label]')).toBeVisible();
    const checks = await page.evaluate(async root => {
      const node = document.querySelector(root)!;
      return { violations: (await (window as any).axe.run(node, { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })),
        overflow: document.querySelector('#wrap')!.scrollWidth - document.querySelector('#wrap')!.clientWidth,
        targets: [...node.querySelectorAll('button')].map(n => { const r = n.getBoundingClientRect(); return [r.width, r.height]; }),
        text: [...node.querySelectorAll('svg text')].map(n => { const text = n as SVGGraphicsElement, box = text.getBBox(), m = text.getScreenCTM()!; return { font: parseFloat(getComputedStyle(text).fontSize) * Math.hypot(m.a, m.b), bottom: box.y + box.height, right: box.x + box.width }; }) };
    }, root);
    expect(checks.violations).toEqual([]); expect(checks.overflow).toBeLessThanOrEqual(1);
    checks.targets.forEach(b => { expect(b[0]).toBeGreaterThanOrEqual(44); expect(b[1]).toBeGreaterThanOrEqual(44); });
    checks.text.forEach(t => { expect(t.font).toBeGreaterThanOrEqual(10.5); expect(t.bottom).toBeLessThanOrEqual(440); expect(t.right).toBeLessThanOrEqual(760); });
    if (host !== 500) {
      await page.setViewportSize({ width, height: 3200 });
      await page.evaluate(async root => { await document.fonts.ready; const node = document.querySelector(root)!; for (let p = node.parentElement; p; p = p.parentElement) p.scrollTop = 0; window.scrollTo(0, 0); node.scrollIntoView({ block: 'center', behavior: 'instant' }); await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))); }, root);
      const box = (await page.locator(root).boundingBox())!; expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual(3200);
      const bytes = await page.locator(root).screenshot({ animations: 'disabled', scale: 'css' }), png = readPng(bytes);
      expect(Math.abs(png.width - box.width)).toBeLessThanOrEqual(2); expect(Math.abs(png.height - box.height)).toBeLessThanOrEqual(2);
      writeFileSync(resolve(report, 'seasonal-' + width + '.png'), bytes); await page.setViewportSize({ width, height: 1000 });
    }
    cases.push({ width, host, checks });
  }
  expect(errors).toEqual([]); writeFileSync(resolve(report, 'seasonal-interactions.json'), JSON.stringify({ cases, errors }, null, 2));
});
