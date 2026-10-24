import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

test.use({ video: 'off', trace: 'off', hasTouch: true });
test.describe.configure({ retries: 0, timeout: 180_000 });
const root = '[data-raptor-wing-design]', board = '[data-wing-design-board]';
const report = resolve('reports/avian-simulations-round30-2026-10-22/raptor');
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js', extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1280, height: 1000, appStyles: true, layout: 'document' });
const rules = ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'];
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
type Design = { mass: number; wingspan: number; wingArea: number };
const defaults: Design = { mass: 1, wingspan: 1.2, wingArea: .25 };
const near = (a: number, b: number, epsilon = 1e-5) => expect(Math.abs(a - b), `${a} ≈ ${b}`).toBeLessThanOrEqual(epsilon);
const range = (field: string) => `[id="rh-panel-predictor"] input[aria-label="${{ mass: 'Body mass kg', wingspan: 'Wingspan m', wingArea: 'Wing area m²' }[field]}"]`;
async function sizing(page: Page, viewport = 1280, host = 1100) { await page.setViewportSize({ width: viewport, height: 1000 }); await page.locator('#wrap').evaluate((n: HTMLElement, width) => { n.style.width = width + 'px'; n.style.maxWidth = '100%'; n.setAttribute('data-stem-tool-shell', 'true'); }, host); }
async function mount(page: Page) {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.stack || e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await harness.mount(page, { raptorHunt: { activeSection: 'predictor' } }, undefined, { expectCanvas: false }); await sizing(page); await expect(page.locator(root)).toBeVisible(); return errors;
}
async function settings(page: Page, d: Design) { await page.getByRole('button', { name: 'Design from sliders', exact: true }).click(); for (const field of ['mass', 'wingspan', 'wingArea']) await page.locator(range(field)).fill(String(d[field as keyof Design])); }
async function physical(page: Page, id = 'current') {
  return page.locator(`[data-wing-design-condition=${id}]`).evaluate(n => ({ mass: Number(n.getAttribute('data-wing-design-mass')), wingspan: Number(n.getAttribute('data-wing-design-span')), wingArea: Number(n.getAttribute('data-wing-design-area')), loading: Number(n.getAttribute('data-wing-design-loading')), aspect: Number(n.getAttribute('data-wing-design-aspect')), mode: n.getAttribute('data-wing-design-mode'), parts: JSON.parse(n.getAttribute('data-wing-design-parts')!) }));
}
async function geometry(page: Page, id = 'current') {
  return page.locator(`[data-wing-design-polygon=${id}]`).evaluateAll(nodes => nodes.map(node => {
    const n = node as SVGPolygonElement, svg = n.ownerSVGElement!, native = svg.getScreenCTM()!.inverse().multiply(n.getScreenCTM()!), ctm = svg.getScreenCTM()!;
    const points = [...Array(n.points.numberOfItems)].map((_, i) => { const p = n.points.getItem(i), q = new DOMPoint(p.x, p.y).matrixTransform(native); return [q.x, q.y]; });
    const area = Math.abs(points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
    return { side: n.getAttribute('data-wing-design-side'), points, area, sx: Math.hypot(ctm.a, ctm.b), sy: Math.hypot(ctm.c, ctm.d), viewWidth: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height, stroke: getComputedStyle(n).stroke, dash: getComputedStyle(n).strokeDasharray };
  }));
}
async function verify(page: Page, d: Design, id = 'current') {
  await expect.poll(async () => { const p = await physical(page, id); return { mass: p.mass, wingspan: p.wingspan, wingArea: p.wingArea }; }).toEqual(d);
  const state = await physical(page, id), polys = await geometry(page, id); expect(polys).toHaveLength(2); expect(polys.map(p => p.side)).toEqual(['left', 'right']);
  near(polys.reduce((sum, p) => sum + p.area, 0) / 40000, d.wingArea);
  const points = polys.flatMap(p => p.points), xs = points.map(p => p[0]); near((Math.max(...xs) - Math.min(...xs)) / 200, d.wingspan); near(state.loading, d.mass / d.wingArea); near(state.aspect, d.wingspan ** 2 / d.wingArea);
  for (const polygon of polys) { near(polygon.sx, polygon.sy, 1e-8); expect(polygon.viewWidth).toBe(760); for (const p of polygon.points) { expect(p[0]).toBeGreaterThanOrEqual(0); expect(p[0]).toBeLessThanOrEqual(760); expect(p[1]).toBeGreaterThanOrEqual(0); expect(p[1]).toBeLessThanOrEqual(polygon.height); } }
  return { design: d, state, polygons: polys };
}
async function clean(page: Page, errors: string[]) { expect(errors).toEqual([]); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]); }
async function drag(page: Page, handle: string, delta: number, kind = 'mouse') {
  const node = page.locator(`[data-wing-design-handle=${handle}]`); await node.scrollIntoViewIfNeeded(); const before = await physical(page), b = (await node.boundingBox())!, start = { x: b.x + b.width / 2, y: b.y + b.height / 2 }, scale = (await geometry(page))[0].sx;
  const distance = handle === 'span' ? delta * 100 * scale : delta / (.6 * before.wingspan) * 100 * scale;
  const end = { x: start.x + (handle === 'span' ? distance : 0), y: start.y + (handle === 'area' ? distance : 0) };
  if (kind === 'mouse') { await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 4 }); await page.mouse.up(); }
  else {
    await node.evaluate(n => n.addEventListener('pointerdown', e => { (window as any).__wingNativeId = (e as PointerEvent).pointerId; }, { once: true, capture: true }));
    const cdp = await page.context().newCDPSession(page), first = { id: 81, ...start, radiusX: 1, radiusY: 1, force: .5 }, moved = { ...first, ...end };
    try {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [moved] });
      if (kind === 'cancel') await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      else {
        if (kind === 'lost') await node.evaluate(n => n.releasePointerCapture((window as any).__wingNativeId));
        if (kind === 'multi') { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [moved, { ...moved, id: 82, x: moved.x + 14, y: moved.y - 14 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [moved] }); }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      }
    } finally { await cdp.detach(); }
  }
  const expected = { mass: before.mass, wingspan: before.wingspan, wingArea: before.wingArea };
  if (kind === 'mouse' || kind === 'touch') expected[handle === 'span' ? 'wingspan' : 'wingArea'] = Number((expected[handle === 'span' ? 'wingspan' : 'wingArea'] + delta).toFixed(6));
  await verify(page, expected);
}
async function capture(page: Page, file: string) {
  const originalViewport = page.viewportSize()!;
  // Keep the complete panel inside the real viewport. Raptor's desktop scroll
  // shell otherwise clips its heading during beyond-viewport screenshots.
  await page.setViewportSize({ width: originalViewport.width, height: 3200 });
  await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))); });
  await page.locator(root).evaluate(n => { for (let parent = n.parentElement; parent; parent = parent.parentElement) parent.scrollTop = 0; window.scrollTo(0, 0); n.scrollIntoView({ block: 'center', behavior: 'instant' }); });
  await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  const bounds = (await page.locator(root).boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(0); expect(bounds.y + bounds.height).toBeLessThanOrEqual(3200);
  const bytes = await page.locator(root).screenshot({ animations: 'disabled', scale: 'css' }), png = readPng(bytes);
  const clip = await page.locator(root).evaluate(n => { const b = n.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height, scale: 1 }; });
  // Element capture rounds both clip edges outwards to whole device pixels.
  // Two fractional edges can add less than two pixels to the CSS extent.
  near(png.width, clip.width, 2); near(png.height, clip.height, 2); writeFileSync(resolve(report, file), bytes); await page.setViewportSize(originalViewport); return { file, method: 'native element screenshot inside 3200px viewport', clip, dimensions: { width: png.width, height: png.height } };
}

test('native polygons conserve selected span and total area across the design range, precise presets and Frankenraptor', async ({ page }) => {
  const errors = await mount(page), evidence = [], initialScale = (await geometry(page))[0].sx;
  for (const d of [defaults, { mass: .1, wingspan: .5, wingArea: .02 }, { mass: 10, wingspan: .5, wingArea: 1 }, { mass: 3, wingspan: 3, wingArea: .02 }, { mass: 7.5, wingspan: 3, wingArea: 1 }, { mass: .95, wingspan: 1.05, wingArea: .108 }]) {
    await settings(page, d); evidence.push(await verify(page, d)); near((await geometry(page))[0].sx, initialScale, .001); for (const field of ['mass', 'wingspan', 'wingArea']) await expect(page.locator(range(field))).toHaveValue(String(d[field as keyof Design]));
  }
  await page.getByRole('button', { name: 'Load Peregrine dimensions', exact: true }).click(); evidence.push(await verify(page, { mass: .95, wingspan: 1.05, wingArea: .108 })); await expect(page.locator(range('wingArea'))).toHaveValue('0.108');
  await page.getByRole('button', { name: 'Load Harpy Eagle dimensions', exact: true }).click(); evidence.push(await verify(page, { mass: 7.5, wingspan: 2.05, wingArea: .75 }));
  await page.getByRole('button', { name: 'Frankenraptor: blend 2 species', exact: true }).click(); await page.getByRole('combobox', { name: 'Wings species', exact: true }).selectOption('condor'); await page.getByRole('combobox', { name: 'Body species', exact: true }).selectOption('harpyEagle');
  evidence.push(await verify(page, { mass: 7.5, wingspan: 2.9, wingArea: 1.2 })); await expect(page.locator('[data-wing-design-handle=span]')).toBeDisabled(); await expect(page.locator('[data-wing-design-copy]')).toBeDisabled();
  await page.getByRole('combobox', { name: 'Wings species', exact: true }).selectOption('peregrine'); await expect(page.locator('[data-wing-design-copy]')).toBeEnabled(); await page.locator('[data-wing-design-copy]').click(); await verify(page, { mass: 7.5, wingspan: 1.05, wingArea: .108 }); expect((await physical(page)).mode).toBe('design');
  await clean(page, errors); writeFileSync(resolve(report, 'geometry.json'), JSON.stringify({ cases: evidence, oracle: 'Native polygon shoelace area and affine-transformed extrema; 200 SVG units per metre on both axes.', errors }, null, 2));
});

test('full frozen designs preserve source context and exact one-variable experiments across host updates', async ({ page }) => {
  const errors = await mount(page); await settings(page, defaults); await page.locator('[data-wing-design-pin]').click(); const saved = await verify(page, defaults, 'pinned');
  await settings(page, { mass: 2, wingspan: 2, wingArea: .6 }); await verify(page, defaults, 'pinned');
  await page.locator('[data-wing-design-experiment=span]').click(); await verify(page, { ...defaults, wingspan: 1.45 }); await verify(page, defaults, 'pinned');
  await page.locator('[data-wing-design-experiment=mass]').click(); await verify(page, { ...defaults, mass: 1.5 }); const live = await geometry(page), frozen = await geometry(page, 'pinned'); expect(live.map(p => p.points)).toEqual(frozen.map(p => p.points));
  await page.evaluate(() => { const w = window as any; w.__toolData.raptorHunt.qaWingBoard = 'kept'; w.__rerender(); }); await verify(page, { ...defaults, mass: 1.5 }); await verify(page, defaults, 'pinned');
  await page.locator('[data-wing-design-restore]').click(); await verify(page, defaults);
  await page.getByRole('button', { name: 'Frankenraptor: blend 2 species', exact: true }).click(); await page.getByRole('combobox', { name: 'Wings species', exact: true }).selectOption('condor'); await page.getByRole('combobox', { name: 'Body species', exact: true }).selectOption('harpyEagle'); await page.locator('[data-wing-design-pin]').click(); const combination = await verify(page, { mass: 7.5, wingspan: 2.9, wingArea: 1.2 }, 'pinned');
  await expect(page.locator('[data-wing-design-experiment=span]')).toBeDisabled(); await expect(page.locator('[data-wing-design-experiment=mass]')).toBeDisabled();
  await settings(page, defaults); await page.locator('[data-wing-design-restore]').click(); await verify(page, { mass: 7.5, wingspan: 2.9, wingArea: 1.2 }); expect((await physical(page)).mode).toBe('franken'); await expect(page.getByRole('combobox', { name: 'Wings species', exact: true })).toHaveValue('condor'); await expect(page.getByRole('combobox', { name: 'Body species', exact: true })).toHaveValue('harpyEagle');
  await page.locator('[data-wing-design-clear]').click(); await expect(page.locator('[data-wing-design-pin]')).toBeFocused(); await expect(page.locator('[data-wing-design-condition=pinned]')).toHaveCount(0); await expect(page.locator('[data-wing-design-polygon=pinned]')).toHaveCount(0); await expect(page.locator('[data-wing-design-restore]')).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.qaWingBoard)).toBe('kept'); await clean(page, errors); writeFileSync(resolve(report, 'comparison.json'), JSON.stringify({ saved, combination, exactExperiments: true, massOnlyOutlineInvariant: true, completeSourceRestore: true, errors }, null, 2));
});

test('native rulers support mouse, touch cancellation and keyboard in three hosts with readable accessible controls', async ({ page }) => {
  const errors = await mount(page), evidence = [], captures = [];
  for (const size of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 560 }]) {
    await sizing(page, size.viewport, size.host); await settings(page, defaults); await page.locator('[data-wing-design-pin]').click();
    await drag(page, 'span', .3); await drag(page, 'area', .06); await drag(page, 'span', -.2, 'touch'); await drag(page, 'area', -.03, 'touch');
    for (const kind of ['cancel', 'lost', 'multi']) { await drag(page, 'span', .2, kind); await drag(page, 'area', .03, kind); }
    const span = page.locator('[data-wing-design-handle=span]'), area = page.locator('[data-wing-design-handle=area]');
    await span.focus(); await page.keyboard.press('End'); near((await physical(page)).wingspan, 3); await page.keyboard.press('Home'); near((await physical(page)).wingspan, .5); await page.keyboard.press('Shift+ArrowRight'); near((await physical(page)).wingspan, .6); await expect(span).toBeFocused();
    await area.focus(); await page.keyboard.press('End'); near((await physical(page)).wingArea, 1); await page.keyboard.press('Home'); near((await physical(page)).wingArea, .02); await page.keyboard.press('ArrowUp'); near((await physical(page)).wingArea, .021); await expect(area).toBeFocused();
    await settings(page, defaults); await page.locator('[data-wing-design-experiment=span]').click();
    for (const node of await page.locator(root + ' button').all()) { const b = (await node.boundingBox())!; expect(b.height).toBeGreaterThanOrEqual(44); expect(b.width).toBeGreaterThanOrEqual(44); }
    const host = (await page.locator('#wrap').boundingBox())!, b = (await page.locator(root).boundingBox())!; expect(b.x).toBeGreaterThanOrEqual(host.x - 1); expect(b.x + b.width).toBeLessThanOrEqual(host.x + host.width + 1);
    expect(await page.locator(root).evaluate(n => n.scrollWidth - n.clientWidth)).toBeLessThanOrEqual(1); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const violations = await page.evaluate(async rules => (await (window as any).axe.run(document.querySelector('[data-raptor-wing-design]'), { runOnly: { type: 'rule', values: rules } })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })), rules); expect(violations).toEqual([]);
    evidence.push({ ...size, violations, mouse: true, nativeTouch: true, cancellationRestores: true, lossRestores: true, multitouchRestores: true, keyboard: true });
  }
  for (const viewport of [1280, 390]) { await sizing(page, viewport, viewport === 1280 ? 1100 : 390); await settings(page, { mass: 1.15, wingspan: 1.3, wingArea: .31 }); await page.locator('[data-wing-design-pin]').click(); await page.locator('[data-wing-design-experiment=span]').click(); await verify(page, { mass: 1.15, wingspan: 1.55, wingArea: .31 }); captures.push(await capture(page, 'wing-board-' + viewport + '.png')); }
  await page.evaluate(() => { const w = window as any; w.__toolData.raptorHunt.activeSection = 'hub'; w.__rerender(); }); await expect(page.locator(root)).toHaveCount(0); await clean(page, errors); writeFileSync(resolve(report, 'interactions.json'), JSON.stringify({ hosts: evidence, captures, teardown: true, errors }, null, 2));
});
