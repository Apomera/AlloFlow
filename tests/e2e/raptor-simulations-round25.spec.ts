import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', hasTouch: true, trace: { mode: 'retain-on-failure', screenshots: false, snapshots: true } });
test.describe.configure({ timeout: 240_000, retries: 0 });
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js', width: 1100, height: 1000,
  layout: 'document', appStyles: true, extraScripts: ['node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type Model = { version: number; eye: number; target: number; roofA: number; roofB: number; roofC: number; probe: number };
const initial: Model = { version: 1, eye: 12, target: 58, roofA: 20, roofB: 38, roofC: 42, probe: 50 };
const root = '[data-raptor-skyline-study]', current = '[data-sky-condition="current"]';
const footprints = [[25, 35, 'roofA', 'A'], [50, 60, 'roofB', 'B'], [75, 85, 'roofC', 'C']] as const;
const physical = (value: Model) => [value.eye, value.target, value.roofA, value.roofB, value.roofC];
const height = (value: Model, x: number) => (1 - x / 100) * value.eye + x / 100 * value.target;
const project = (x: number, y: number) => ({ x: 60 + 4.8 * x, y: 540 - 4.8 * y });
const number = (value: number) => String(Number(value.toFixed(3)));
async function settle(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function mount(page: Page, skylineStudy?: any) {
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { raptorHunt: { activeSection: 'urban', skylineStudy, xp: 0 } }, undefined, { expectCanvas: false });
  await expect(page.locator(root)).toBeVisible();
}
async function replace(page: Page, value: any) { await page.evaluate(model => (window as any).__ctx.setToolData((old: any) => ({ ...old, raptorHunt: { ...old.raptorHunt, skylineStudy: model } })), value); await settle(page); }
async function range(page: Page, key: string, value: number) {
  await page.locator('#rh-sky-' + key).evaluate((node: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(node, String(next));
    node.dispatchEvent(new Event('input', { bubbles: true })); node.dispatchEvent(new Event('change', { bubbles: true }));
  }, value); await expect(page.locator('#rh-sky-' + key)).toHaveValue(String(value));
}
async function design(page: Page, key = 'current') { return (await page.locator('[data-sky-condition="' + key + '"]').getAttribute('data-sky-design'))!.split(',').map(Number); }

// Independent general slab clipping of a finite segment against an axis-aligned
// solid rectangle. Production uses slope-specific clearance tests instead.
function clip(a: { x: number; y: number }, b: { x: number; y: number }, box: { x: number; y: number; width: number; height: number }, nativeUncertainty = 0) {
  let enter = 0, exit = 1;
  for (const [start, delta, low, high] of [[a.x, b.x - a.x, box.x, box.x + box.width], [a.y, b.y - a.y, box.y, box.y + box.height]]) {
    if (delta === 0) { if (start < low - nativeUncertainty || start > high + nativeUncertainty) return null; continue; }
    const t = [(low - start) / delta, (high - start) / delta].sort((a, b) => a - b); enter = Math.max(enter, t[0]); exit = Math.min(exit, t[1]);
    if (enter > exit) {
      if ((enter - exit) * Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) > nativeUncertainty) return null;
      enter = exit = (enter + exit) / 2;
    }
  }
  return { a: { x: a.x + (b.x - a.x) * enter, y: a.y + (b.y - a.y) * enter }, b: { x: a.x + (b.x - a.x) * exit, y: a.y + (b.y - a.y) * exit } };
}
function oracle(value: Model) {
  return footprints.map(([lo, hi, key, id]) => ({ id, hit: clip({ x: 0, y: value.eye }, { x: 100, y: value.target }, { x: lo, y: 0, width: hi - lo, height: value[key] }) }));
}
async function drawing(page: Page, key = 'current'): Promise<any> {
  return page.locator('[data-sky-condition="' + key + '"]').evaluate(condition => {
    const scene = condition.querySelector('[data-sky-scene]')!, graph = condition.querySelector('[data-sky-clearance]')!;
    const scalar = (node: any, key: string) => node[key].baseVal.value;
    const point = (node: any) => node ? ({ x: scalar(node, 'cx'), y: scalar(node, 'cy') }) : null;
    const line = (node: any) => ({ a: { x: scalar(node, 'x1'), y: scalar(node, 'y1') }, b: { x: scalar(node, 'x2'), y: scalar(node, 'y2') } });
    return { readings: Object.fromEntries([...condition.querySelectorAll('[data-sky-reading]')].map(node => [node.getAttribute('data-sky-reading'), node.textContent])),
      ray: line(scene.querySelector('[data-sky-ray]')), probe: point(scene.querySelector('[data-sky-probe]')), first: point(scene.querySelector('[data-sky-first-hit]')),
      buildings: [...scene.querySelectorAll('[data-sky-building]')].map(node => ({ id: node.getAttribute('data-sky-building'), x: scalar(node, 'x'), y: scalar(node, 'y'), width: scalar(node, 'width'), height: scalar(node, 'height') })),
      hits: [...scene.querySelectorAll('[data-sky-blocked]')].map(node => ({ id: node.getAttribute('data-sky-blocked'), ...line(node) })),
      profiles: [...graph.querySelectorAll('[data-sky-profile]')].map(node => ({ id: node.getAttribute('data-sky-profile'), ...line(node) })),
      sceneProbe: line(scene.querySelector('[data-sky-probe-line]')), graphProbe: line(graph.querySelector('[data-sky-clearance-probe]')) };
  });
}
function drawingErrors(actual: any, value: Model, name = '') {
  const errors: unknown[] = [], expected = oracle(value), blocked = expected.filter(item => item.hit), local = footprints.find(([lo, hi]) => value.probe >= lo && value.probe <= hi);
  const near = (field: string, a: number, b: number, tolerance = .0001) => { if (!Number.isFinite(a) || Math.abs(a - b) > tolerance) errors.push({ name, value, field, actual: a, expected: b }); };
  const point = (field: string, a: any, b: any) => { if (!a || !b) { if (a !== b) errors.push({ name, value, field, actual: a, expected: b }); return; } near(field + '.x', a.x, b.x); near(field + '.y', a.y, b.y); };
  point('ray.a', actual.ray.a, project(0, value.eye)); point('ray.b', actual.ray.b, project(100, value.target)); point('probe', actual.probe, project(value.probe, height(value, value.probe)));
  point('first', actual.first, blocked.length ? project(blocked[0].hit!.a.x, blocked[0].hit!.a.y) : null);
  for (const [index, [lo, hi, key, id]] of footprints.entries()) {
    const box = actual.buildings[index], profile = actual.profiles[index]; near(id + '.x', box.x, project(lo, 0).x); near(id + '.y', box.y, project(0, value[key]).y); near(id + '.width', box.width, (hi - lo) * 4.8); near(id + '.height', box.height, value[key] * 4.8);
    point(id + '.profile.a', profile.a, { x: project(lo, 0).x, y: 260 - 2 * (height(value, lo) - value[key]) }); point(id + '.profile.b', profile.b, { x: project(hi, 0).x, y: 260 - 2 * (height(value, hi) - value[key]) });
    // A second check clips the actual native SVG line against its actual native
    // rectangle, including edge and zero-length contact. No data interval is trusted.
    // SVGAnimatedLength stores these coordinates as float32. At our largest
    // coordinate (600), one ULP is about 6e-5 drawing units; an exact model
    // tangent can become a representational miss. Membership uncertainty is
    // bounded to 1e-4 drawing units here only; the model oracle remains strict.
    const nativeHit = clip(actual.ray.a, actual.ray.b, box, .0001), drawn = actual.hits.find((hit: any) => hit.id === id);
    if (!nativeHit) { if (drawn) errors.push({ field: id + '.nativeExtraHit', drawn }); }
    else { if (!drawn) errors.push({ field: id + '.nativeMissingHit', nativeHit }); else { point(id + '.native.a', drawn.a, nativeHit.a); point(id + '.native.b', drawn.b, nativeHit.b); } }
  }
  if (actual.hits.map((hit: any) => hit.id).join() !== blocked.map(item => item.id).join()) errors.push({ field: 'hitIds', actual: actual.hits, expected: blocked });
  for (const item of blocked) { const hit = actual.hits.find((hit: any) => hit.id === item.id); if (hit) { point(item.id + '.hit.a', hit.a, project(item.hit!.a.x, item.hit!.a.y)); point(item.id + '.hit.b', hit.b, project(item.hit!.b.x, item.hit!.b.y)); } }
  near('sceneProbe.x', actual.sceneProbe.a.x, project(value.probe, 0).x); near('graphProbe.x', actual.graphProbe.a.x, project(value.probe, 0).x);
  const readings = { first: blocked.length ? number(blocked[0].hit!.a.x) + ' m' : 'No contact', height: number(height(value, value.probe)) + ' m', local: local ? 'Building ' + local[3] : 'Open gap', clearance: local ? number(height(value, value.probe) - value[local[2]]) + ' m' : 'No roof here' };
  if (JSON.stringify(actual.readings) !== JSON.stringify(readings)) errors.push({ field: 'readings', actual: actual.readings, expected: readings });
  return errors;
}
async function labelErrors(page: Page) {
  return page.locator(root + ' svg').evaluateAll(nodes => {
    const errors: unknown[] = [];
    nodes.forEach((svg, diagram) => {
      const texts = [...svg.querySelectorAll<SVGTextElement>('text')].map(text => { const box = text.getBBox(), view = text.ownerSVGElement!.viewBox.baseVal, matrix = text.getScreenCTM()!; return { text: text.textContent, left: box.x, right: box.x + box.width, top: box.y, bottom: box.y + box.height, width: view.width, height: view.height, font: parseFloat(getComputedStyle(text).fontSize) * Math.hypot(matrix.a, matrix.b) }; });
      texts.forEach((text, index) => { if (text.left < -.1 || text.right > text.width + .1 || text.top < -.1 || text.bottom > text.height + .1 || text.font < 11) errors.push({ diagram, bound: text }); texts.slice(index + 1).forEach(other => { const width = Math.min(text.right, other.right) - Math.max(text.left, other.left), height = Math.min(text.bottom, other.bottom) - Math.max(text.top, other.top); if (width > .25 && height > .25) errors.push({ diagram, first: text.text, second: other.text, width, height }); }); });
    }); return errors;
  });
}
async function screen(page: Page, key: string, value: number) {
  const handle = page.locator(current + ' [data-sky-handle="' + key + '"]'); await handle.scrollIntoViewIfNeeded();
  return handle.evaluate((group, value) => { const svg = (group as SVGGElement).ownerSVGElement!, matrix = svg.getScreenCTM()!, center = group.querySelector<SVGCircleElement>('[data-sky-handle-center]')!, p = svg.createSVGPoint(); p.x = center.cx.baseVal.value; p.y = center.cy.baseVal.value; const start = p.matrixTransform(matrix); if (group.getAttribute('data-sky-handle') === 'probe') p.x = 60 + 4.8 * value; else p.y = 540 - 4.8 * value; const end = p.matrixTransform(matrix); return { start: { x: start.x, y: start.y }, end: { x: end.x, y: end.y } }; }, value);
}
async function mouseDrag(page: Page, key: string, value: number) { const p = await screen(page, key, value); await page.mouse.move(p.start.x, p.start.y); await page.mouse.down(); await page.mouse.move(p.end.x, p.end.y, { steps: 8 }); await page.mouse.up(); await settle(page); }
async function touchDrag(page: Page, key: string, value: number, cancel = false, second = false) {
  const p = await screen(page, key, value), cdp = await page.context().newCDPSession(page);
  try { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p.start, id: 1 }] }); if (second) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p.start, id: 1 }, { x: p.start.x - 30, y: p.start.y + 10, id: 2 }] });
    for (let i = 1; i <= 5; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.start.x + (p.end.x - p.start.x) * i / 5, y: p.start.y + (p.end.y - p.start.y) * i / 5, id: 1 }, ...(second ? [{ x: p.start.x - 30, y: p.start.y + 10, id: 2 }] : [])] });
    await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
  } finally { await cdp.detach(); } await settle(page);
}

test('native city rectangles, all solid intersection intervals and signed profiles agree with independent segment clipping through slopes, edges, tangencies and bounds', async ({ page }) => {
  await mount(page); const errors: unknown[] = [];
  for (const eye of [2, 12, 30]) for (const target of [5, 30, 85]) for (const roofs of [[5, 5, 5], [20, 38, 42], [60, 60, 60]]) {
    const value = { ...initial, eye, target, roofA: roofs[0], roofB: roofs[1], roofC: roofs[2], probe: target === 30 ? 35 : 77.5 }; await replace(page, value); errors.push(...drawingErrors(await drawing(page), value));
  }
  for (const value of [{ ...initial, eye: 10, target: 50, roofA: 20, roofB: 5, roofC: 5, probe: 25 }, { ...initial, eye: 30, target: 10, roofA: 23, roofB: 5, roofC: 5, probe: 35 }, { ...initial, eye: 20, target: 20, roofA: 20, roofB: 5, roofC: 5, probe: 35 }, { ...initial, probe: 0 }, { ...initial, probe: 100 }]) { await replace(page, value); errors.push(...drawingErrors(await drawing(page), value)); }
  expect(errors).toEqual([]); await replace(page, initial); await mouseDrag(page, 'roofB', 52); await mouseDrag(page, 'target', 70); await mouseDrag(page, 'probe', 62.5); expect(await design(page)).toEqual([12, 70, 20, 52, 42]); expect(drawingErrors(await drawing(page), { ...initial, target: 70, roofB: 52, probe: 62.5 })).toEqual([]); expect(await labelErrors(page)).toEqual([]);
});

test('complete skyline pins, exact translation and target experiments, host persistence and a bounded optional probe sweep preserve the original urban cards', async ({ page }) => {
  await mount(page); await page.locator('[data-sky-pin]').click(); await range(page, 'probe', 77.5); await range(page, 'eye', 25); await range(page, 'roofA', 55);
  expect(drawingErrors(await drawing(page, 'pinned'), { ...initial, probe: 77.5 })).toEqual([]);
  for (const [kind, value] of [['raise', { ...initial, eye: 17, target: 63, roofA: 25, roofB: 43, roofC: 47 }], ['target', { ...initial, target: 68 }], ['restore', initial], ['raise', { ...initial, eye: 17, target: 63, roofA: 25, roofB: 43, roofC: 47 }]] as const) { await page.locator('[data-sky-experiment="' + kind + '"]').click(); expect(await design(page)).toEqual(physical(value)); expect(await design(page, 'pinned')).toEqual(physical(initial)); expect(drawingErrors(await drawing(page), { ...value, probe: 77.5 })).toEqual([]); }
  const before = await drawing(page); await page.evaluate(() => (window as any).__ctx.setToolData((old: any) => ({ ...old, unrelatedRound25: 'kept', raptorHunt: { ...old.raptorHunt, unrelatedRound25: 'kept' } }))); expect(await drawing(page)).toEqual(before); await expect(page.getByRole('tab', { name: /Challenges/ })).toBeVisible(); await page.getByRole('tab', { name: /Challenges/ }).click(); expect(await drawing(page)).toEqual(before);
  await page.locator('[data-sky-answer="no"]').click(); await expect(page.locator('.rh-sky-feedback')).toContainText('Correct.'); await page.locator('[data-sky-reset]').click(); expect(await design(page)).toEqual(physical(initial)); await expect(page.locator('#rh-sky-probe')).toHaveValue('77.5'); expect(await design(page, 'pinned')).toEqual(physical(initial)); await expect(page.locator('.rh-sky-feedback')).toHaveCount(0);
  await replace(page, { ...initial, eye: 25, target: 75, roofA: 55 }); await page.locator('[data-sky-pin]').click(); await expect(page.locator('[data-sky-experiment="raise"]')).toBeEnabled(); await expect(page.locator('[data-sky-experiment="target"]')).toBeEnabled(); await page.locator('[data-sky-experiment="target"]').click(); expect(await design(page)).toEqual([25, 85, 55, 38, 42]); await range(page, 'eye', 26); await page.locator('[data-sky-pin]').click(); await expect(page.locator('[data-sky-experiment="raise"]')).toBeDisabled(); await expect(page.locator('[data-sky-experiment="target"]')).toBeDisabled();
  await replace(page, { version: 1, eye: Infinity, target: '20', roofA: NaN }); expect(await design(page)).toEqual(physical(initial)); await replace(page, { version: 1, eye: -999, target: 999, roofA: -5, roofB: 999, roofC: 22.6, probe: 99.74 }); expect(await design(page)).toEqual([2, 85, 5, 60, 23]); await expect(page.locator('#rh-sky-probe')).toHaveValue('99.5'); await replace(page, { ...initial, version: 99 }); expect(await design(page)).toEqual(physical(initial)); await page.locator('[data-sky-clear]').click(); await expect(page.locator('[data-sky-pin]')).toBeFocused();
  await page.evaluate(() => { const sparse: any[] = Array(7); (sparse as any).version = 1; (window as any).__ctx.setToolData((old: any) => ({ ...old, raptorHunt: { ...old.raptorHunt, skylineStudy: sparse } })); }); expect(await design(page)).toEqual(physical(initial)); await range(page, 'roofC', 45); const saved = await page.evaluate(() => (window as any).__toolData.raptorHunt.skylineStudy); expect(saved).toEqual({ ...initial, roofC: 45 }); const host = await page.evaluate(() => (window as any).__toolData); expect(host.raptorHunt.xp).toBe(0); expect(host.unrelatedRound25).toBe('kept'); expect(host.raptorHunt.unrelatedRound25).toBe('kept');
  await harness.destroy(page); await mount(page, saved); expect(await design(page)).toEqual([12, 58, 20, 38, 45]); await expect(page.locator('[data-sky-condition="pinned"]')).toHaveCount(0); await page.locator('[data-sky-play]').click(); await expect(page.locator(root)).toHaveAttribute('data-sky-playing', 'false'); await expect(page.locator('#rh-sky-probe')).toHaveValue('50');
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await range(page, 'probe', 97); await page.locator('[data-sky-play]').click(); await expect(page.locator(root)).toHaveAttribute('data-sky-playing', 'false'); await expect(page.locator('#rh-sky-probe')).toHaveValue('100'); await page.locator('[data-sky-play]').click(); await expect(page.locator(root)).toHaveAttribute('data-sky-playing', 'true'); await range(page, 'eye', 20); await expect(page.locator(root)).toHaveAttribute('data-sky-playing', 'false'); const stopped = await page.locator('#rh-sky-probe').inputValue(); await settle(page); await expect(page.locator('#rh-sky-probe')).toHaveValue(stopped);
  await page.evaluate(() => { const w = window as any, track = { raf: window.requestAnimationFrame.bind(window), cancel: window.cancelAnimationFrame.bind(window), pending: new Set<number>(), scheduled: 0, cancelled: 0, hidden: Object.getOwnPropertyDescriptor(document, 'hidden') }; w.__skyLifecycle = track; window.requestAnimationFrame = callback => { const owned = callback.name === 'tick', id = track.raf(time => { track.pending.delete(id); callback(time); }); if (owned) { track.pending.add(id); track.scheduled++; } return id; }; window.cancelAnimationFrame = id => { if (track.pending.delete(id)) track.cancelled++; track.cancel(id); }; });
  try {
    await range(page, 'probe', 10); await page.locator('[data-sky-play]').click(); await expect.poll(() => page.evaluate(() => (window as any).__skyLifecycle.pending.size)).toBe(1); await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(page.locator(root)).toHaveAttribute('data-sky-playing', 'false'); await expect.poll(() => page.evaluate(() => (window as any).__skyLifecycle.pending.size)).toBe(0); const reduced = await page.locator('#rh-sky-probe').inputValue(); await settle(page); await expect(page.locator('#rh-sky-probe')).toHaveValue(reduced);
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await range(page, 'probe', 10); await page.locator('[data-sky-play]').click(); await expect(page.locator(root)).toHaveAttribute('data-sky-playing', 'true');
    // Controlled visibility event, not a claim that headless Chrome or the OS hid.
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); }); await expect(page.locator(root)).toHaveAttribute('data-sky-playing', 'false'); await expect.poll(() => page.evaluate(() => (window as any).__skyLifecycle.pending.size)).toBe(0); const hidden = await page.locator('#rh-sky-probe').inputValue(); await settle(page); await expect(page.locator('#rh-sky-probe')).toHaveValue(hidden);
    await page.evaluate(() => { const track = (window as any).__skyLifecycle; if (track.hidden) Object.defineProperty(document, 'hidden', track.hidden); else delete (document as any).hidden; }); await range(page, 'probe', 10); await page.locator('[data-sky-play]').click(); await expect.poll(() => page.evaluate(() => (window as any).__skyLifecycle.pending.size)).toBe(1); await page.evaluate(() => (window as any).__ctx.setToolData((old: any) => ({ ...old, raptorHunt: { ...old.raptorHunt, activeSection: 'hub' } }))); await expect(page.locator(root)).toHaveCount(0); await expect.poll(() => page.evaluate(() => (window as any).__skyLifecycle.pending.size)).toBe(0); const scheduled = await page.evaluate(() => (window as any).__skyLifecycle.scheduled); await settle(page); expect(await page.evaluate(() => (window as any).__skyLifecycle.scheduled)).toBe(scheduled); expect(await page.evaluate(() => (window as any).__skyLifecycle.cancelled)).toBeGreaterThanOrEqual(3);
  } finally { await page.evaluate(() => { const w = window as any, track = w.__skyLifecycle; window.requestAnimationFrame = track.raf; window.cancelAnimationFrame = track.cancel; if (track.hidden) Object.defineProperty(document, 'hidden', track.hidden); else delete (document as any).hidden; delete w.__skyLifecycle; }); }
});

async function lostCaptureHover(page: Page) {
  const before = await design(page), group = page.locator(current + ' [data-sky-handle="roofB"]'), p = await screen(page, 'roofB', before[3] + 1);
  await group.evaluate(node => { node.removeAttribute('data-sky-test-capture'); node.removeAttribute('data-sky-test-lost'); node.addEventListener('gotpointercapture', event => node.setAttribute('data-sky-test-capture', String((event as PointerEvent).pointerId)), { once: true }); node.addEventListener('lostpointercapture', event => node.setAttribute('data-sky-test-lost', String((event as PointerEvent).pointerId)), { once: true }); });
  await page.mouse.move(p.start.x, p.start.y); await page.mouse.down(); await page.mouse.move(p.start.x + .05, p.start.y); await expect(group).toHaveAttribute('data-sky-test-capture', /^\d+$/); const pointer = Number(await group.getAttribute('data-sky-test-capture')); await group.evaluate((node, id) => (node as SVGGElement).releasePointerCapture(id), pointer); await page.mouse.move(p.start.x + .1, p.start.y); await expect(group).toHaveAttribute('data-sky-test-lost', String(pointer)); await page.mouse.move(1, 1); await page.mouse.up(); await page.mouse.move(p.end.x, p.end.y); await settle(page); expect(await design(page)).toEqual(before);
}
test('real touch height and probe drags, cancellation, secondary contacts, capture loss, keyboard and strict labels pass eight axe rules at three host widths', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await page.setViewportSize({ width: layout.viewport, height: 1000 }); await page.locator('#wrap').evaluate((node: HTMLElement, width) => { node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.setAttribute('data-stem-tool-shell', 'true'); }, layout.host); await replace(page, initial); if (await page.locator('[data-sky-condition="pinned"]').count()) await page.locator('[data-sky-clear]').click();
    await touchDrag(page, 'eye', 25); await touchDrag(page, 'target', 80); await touchDrag(page, 'roofA', 35); await touchDrag(page, 'roofB', 50); await touchDrag(page, 'roofC', 55); await touchDrag(page, 'probe', 77.5); expect(await design(page)).toEqual([25, 80, 35, 50, 55]); expect(drawingErrors(await drawing(page), { ...initial, eye: 25, target: 80, roofA: 35, roofB: 50, roofC: 55, probe: 77.5 })).toEqual([]);
    await replace(page, initial); await touchDrag(page, 'roofB', 55, false, true); expect(await design(page)).toEqual(physical(initial)); await touchDrag(page, 'probe', 75, false, true); await expect(page.locator('#rh-sky-probe')).toHaveValue('50'); await touchDrag(page, 'roofB', 50, true); expect(await design(page)).toEqual([12, 58, 20, 50, 42]); const cancelled = await design(page); await page.mouse.move(1, 1); const hover = await screen(page, 'roofB', 60); await page.mouse.move(hover.end.x, hover.end.y); await settle(page); expect(await design(page)).toEqual(cancelled); await lostCaptureHover(page);
    for (const [key, lo, hi] of [['eye', 2, 30], ['target', 5, 85], ['roofA', 5, 60], ['roofB', 5, 60], ['roofC', 5, 60], ['probe', 0, 100]] as const) { const handle = page.locator(current + ' [data-sky-handle="' + key + '"]'), step = key === 'probe' ? .5 : 1; await handle.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(page.locator('#rh-sky-' + key)).toHaveValue(String(lo + step)); await expect(handle).toBeFocused(); await page.keyboard.press('End'); await page.keyboard.press('ArrowLeft'); await expect(page.locator('#rh-sky-' + key)).toHaveValue(String(hi - step)); }
    await page.locator('#rh-sky-eye').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(page.locator('#rh-sky-eye')).toHaveValue('3'); await replace(page, initial); const pin = page.locator('[data-sky-pin]'); await pin.focus(); await page.keyboard.press('Enter'); await expect(pin).toBeFocused(); await range(page, 'probe', 77.5); const raise = page.locator('[data-sky-experiment="raise"]'); await raise.focus(); await page.keyboard.press('Enter'); await expect(raise).toBeFocused(); expect(await design(page)).toEqual([17, 63, 25, 43, 47]); await page.locator('[data-sky-answer="no"]').tap(); await expect(page.locator('.rh-sky-feedback')).toContainText('Correct.');
    for (const bounds of [{ eye: 2, target: 5, roofA: 5, roofB: 5, roofC: 5, probe: 0 }, { eye: 30, target: 85, roofA: 60, roofB: 60, roofC: 60, probe: 100 }]) { await replace(page, { ...initial, ...bounds }); const targetErrors = await page.locator(root + ' button,' + root + ' input,' + current + ' [data-sky-handle]').evaluateAll(nodes => nodes.flatMap(node => { const b = node.getBoundingClientRect(); return b.width < 44 || b.height < 44 ? [{ name: node.getAttribute('aria-label') || node.textContent, width: b.width, height: b.height }] : []; })); expect(targetErrors).toEqual([]); expect(await labelErrors(page)).toEqual([]); }
    await replace(page, initial); const host = (await page.locator('#wrap').boundingBox())!, overflowErrors: unknown[] = []; for (const selector of [root, '.rh-sky-controls', '.rh-sky-comparison', current, '[data-sky-condition="pinned"]', '.rh-sky-evidence', '.rh-sky-model']) { const node = page.locator(selector), b = (await node.boundingBox())!, overflow = await node.evaluate(element => element.scrollWidth - element.clientWidth); if (b.x < host.x - 1 || b.x + b.width > host.x + host.width + 1 || overflow > 1) overflowErrors.push({ selector, b, host, overflow }); } expect(overflowErrors).toEqual([]); expect(await labelErrors(page)).toEqual([]);
    const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-raptor-skyline-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } })).violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) }))); expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});
