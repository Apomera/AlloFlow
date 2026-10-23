import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

test.use({ video: 'off', trace: 'off', hasTouch: true });
test.describe.configure({ retries: 0, timeout: 180_000 });
const report = resolve('reports/avian-simulations-round30-2026-10-22/chorus');
const root = '[data-birdlab-chorus-study]', timeline = '[data-chorus-timeline]';
const voices = ['robin', 'chickadee', 'redwingBlackbird', 'bluejay'];
const eligibility = [[0], [0, 1, 2], [0, 1, 2, 3], [1, 3]];
// Independent authored fixtures in INTEGER twentieths of a second. Membership
// and clipping do not repeat the production floating-point interval helpers.
const score = [
  [[8, 32], [64, 88], [136, 160], [200, 224]],
  [[20, 30], [44, 56], [100, 112], [168, 180]],
  [[56, 80], [120, 146], [194, 214]],
  [[36, 48], [96, 116], [174, 192], [226, 238]],
];
type Condition = { phase: number; singer: string; time: number; offsets: Record<string, number> };
const initial = (): Condition => ({ phase: 1, singer: 'robin', time: 0, offsets: Object.fromEntries(voices.map(v => [v, 0])) });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1280, height: 1000, appStyles: true, layout: 'document' });
const rules = ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'];
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
const near = (a: number, b: number, epsilon = 1e-4) => expect(Math.abs(a - b), `${a} ≈ ${b}`).toBeLessThanOrEqual(epsilon);

function windows(c: Condition) {
  return eligibility[c.phase].flatMap(v => score[v].flatMap(([a, b], index) => {
    const shift = Math.round(c.offsets[voices[v]] * 20), start = Math.max(0, a + shift), end = Math.min(240, b + shift);
    return end > start ? [{ voice: voices[v], index, start, end }] : [];
  }));
}
function active(c: Condition) {
  const tick = Math.round(c.time * 20), ids = new Set(windows(c).filter(w => tick >= w.start && tick < w.end).map(w => w.voice));
  return voices.filter(v => ids.has(v));
}
function boundaries(c: Condition) { return [...new Set([0, 240, ...windows(c).flatMap(w => [w.start, w.end])])].sort((a, b) => a - b); }

async function sizing(page: Page, viewport = 1280, host = 1100) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((node: HTMLElement, width) => { node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.setAttribute('data-stem-tool-shell', 'true'); }, host);
}
async function mount(page: Page) {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.stack || e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'dawnChorus', blXp: 23, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await sizing(page); await expect(page.locator(root)).toBeVisible(); return errors;
}
async function condition(page: Page, id = 'current'): Promise<Condition> {
  return page.locator(`[data-chorus-condition=${id}]`).evaluate(n => ({ phase: Number(n.getAttribute('data-chorus-phase')), singer: n.getAttribute('data-chorus-singer')!, time: Number(n.getAttribute('data-chorus-time')), offsets: JSON.parse(n.getAttribute('data-chorus-offsets')!) }));
}
async function settings(page: Page, c: Condition) {
  await page.locator('#birdlab-dawn-phase').fill(String(c.phase));
  for (const voice of voices) { await page.locator(`[data-chorus-voice-choice=${voice}]`).click(); await page.locator('#birdlab-chorus-offset').fill(String(c.offsets[voice])); }
  await page.locator(`[data-chorus-voice-choice=${c.singer}]`).click(); await page.locator('#birdlab-chorus-time').fill(String(c.time));
}
async function verify(page: Page, c: Condition, id = 'current', rectangles = false) {
  await expect.poll(() => condition(page, id)).toEqual(c);
  const state = await page.locator(`[data-chorus-condition=${id}]`).evaluate(n => ({ active: JSON.parse(n.getAttribute('data-chorus-active')!), count: Number(n.getAttribute('data-chorus-count')) }));
  expect(state.active).toEqual(active(c)); expect(state.count).toBe(active(c).length);
  const cursor = await page.locator(`[data-chorus-cursor=${id}]`).evaluate((n: SVGLineElement) => ({ x1: n.x1.baseVal.value, x2: n.x2.baseVal.value }));
  near(cursor.x1, 80 + 50 * c.time); near(cursor.x2, cursor.x1);
  if (rectangles) {
    const drawn = await page.locator(`[data-chorus-phrase=${id}]`).evaluateAll(nodes => nodes.map(node => {
      const n = node as SVGRectElement, svg = n.ownerSVGElement!, matrix = svg.getScreenCTM()!.inverse().multiply(n.getScreenCTM()!), p = new DOMPoint(n.x.baseVal.value, n.y.baseVal.value).matrixTransform(matrix), q = new DOMPoint(n.x.baseVal.value + n.width.baseVal.value, n.y.baseVal.value + n.height.baseVal.value).matrixTransform(matrix);
      return { voice: n.getAttribute('data-chorus-voice')!, index: Number(n.getAttribute('data-chorus-index')), x: p.x, right: q.x, height: q.y - p.y, opacity: Number(getComputedStyle(n).opacity), fill: getComputedStyle(n).fill };
    }));
    const expected = windows(c); expect(drawn).toHaveLength(expected.length);
    for (const w of expected) {
      const d = drawn.find(d => d.voice === w.voice && d.index === w.index); expect(d, JSON.stringify(w)).toBeTruthy();
      near(d!.x, 80 + 2.5 * w.start); near(d!.right, 80 + 2.5 * w.end); near(d!.height, id === 'current' ? 20 : 14);
      if (id === 'current') near(d!.opacity, Math.round(c.time * 20) >= w.start && Math.round(c.time * 20) < w.end ? 1 : .56);
    }
    expect(new Set(drawn.map(d => d.fill)).size).toBeLessThanOrEqual(1);
  }
  if (id === 'current') {
    const lanes = await page.locator('[data-chorus-lane]').evaluateAll(nodes => nodes.map(n => ({ voice: n.getAttribute('data-chorus-lane'), eligible: n.getAttribute('data-chorus-eligible'), now: n.getAttribute('data-chorus-now'), selected: n.getAttribute('data-chorus-selected') })));
    expect(lanes).toHaveLength(4);
    for (const [i, voice] of voices.entries()) expect(lanes.find(l => l.voice === voice)).toEqual({ voice, eligible: String(eligibility[c.phase].includes(i)), now: String(active(c).includes(voice)), selected: String(c.singer === voice) });
  }
  return { ...c, active: active(c), windows: windows(c) };
}
async function rewards(page: Page) { return page.evaluate(() => { const d = (window as any).__toolData.birdLab; return { xp: d.blXp, badges: d.blBadges, lifeList: d.blLifeList }; }); }
async function clean(page: Page, errors: string[]) { expect(errors).toEqual([]); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]); }
async function point(page: Page, time: number) {
  await page.locator(timeline).scrollIntoViewIfNeeded();
  return page.locator(timeline).evaluate((n: SVGSVGElement, time) => { const p = new DOMPoint(80 + 50 * time, 397).matrixTransform(n.getScreenCTM()!); return { x: p.x, y: p.y }; }, time);
}
async function touchGesture(page: Page, target: number, kind = 'normal') {
  const saved = await condition(page), start = await point(page, saved.time), end = await point(page, target), cdp = await page.context().newCDPSession(page);
  await page.locator(timeline).evaluate(n => n.addEventListener('pointerdown', e => { (window as any).__chorusNativeId = (e as PointerEvent).pointerId; }, { once: true, capture: true }));
  const first = { id: 71, ...start, radiusX: 1, radiusY: 1, force: .5 };
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
    const moved = { ...first, ...end }; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [moved] });
    if (kind === 'cancel') await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    else {
      if (kind === 'lost') await page.locator(timeline).evaluate((n: SVGSVGElement) => n.releasePointerCapture((window as any).__chorusNativeId));
      if (kind === 'multi') { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [moved, { ...moved, id: 72, x: moved.x + 12, y: moved.y - 12 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [moved] }); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
  } finally { await cdp.detach(); }
  await verify(page, kind === 'normal' ? { ...saved, time: target } : saved);
}
async function capture(page: Page, file: string) {
  const node = page.locator(root); await node.evaluate(n => n.scrollIntoView({ block: 'start', behavior: 'instant' }));
  const clip = await node.evaluate(n => { const b = n.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height, scale: 1 }; });
  const cdp = await page.context().newCDPSession(page);
  try { const result = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip }), bytes = Buffer.from(result.data, 'base64'), png = readPng(bytes); near(png.width, clip.width, 1); near(png.height, clip.height, 1); writeFileSync(resolve(report, file), bytes); return { file, clip, dimensions: { width: png.width, height: png.height } }; }
  finally { await cdp.detach(); }
}
async function manualRaf(page: Page) {
  await page.addInitScript(() => {
    let now = 0, next = 0; const pending = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = callback => { const id = ++next; pending.set(id, callback); return id; };
    window.cancelAnimationFrame = id => { pending.delete(id); };
    (window as any).__chorusRaf = { pending: () => pending.size, async step(frames: number) { const sizes = []; for (let i = 0; i < frames; i++) { now += 100; const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(cb => cb(now)); await new Promise(r => setTimeout(r, 0)); sizes.push(pending.size); } return sizes; } };
  });
}
async function pending(page: Page, count: number) { await expect.poll(() => page.evaluate(() => (window as any).__chorusRaf.pending())).toBe(count); }

test('native phrase rectangles and half-open membership match an independent integer score through clipping and every morning phase', async ({ page }) => {
  const errors = await mount(page), evidence = [];
  const designs: Condition[] = [initial(), { ...initial(), phase: 0, offsets: { robin: -2, chickadee: 0, redwingBlackbird: 0, bluejay: 0 } }, { ...initial(), phase: 2 }, { phase: 2, singer: 'bluejay', time: 0, offsets: { robin: 1, chickadee: -2, redwingBlackbird: -1.1, bluejay: 2 } }, { phase: 3, singer: 'chickadee', time: 0, offsets: { robin: -2, chickadee: .7, redwingBlackbird: 2, bluejay: -1 } }];
  for (const design of designs) {
    await settings(page, design); evidence.push(await verify(page, design, 'current', true));
    const edges = boundaries(design), times = [...new Set([...edges, ...edges.slice(1).map((e, i) => Math.floor((e + edges[i]) / 2))])];
    for (const tick of times) { const c = { ...design, time: tick / 20 }; await page.locator('#birdlab-chorus-time').fill(String(c.time)); await verify(page, c); }
    await page.locator('#birdlab-chorus-time').fill('0');
    for (const tick of edges.slice(1)) { await page.locator('[data-chorus-boundary=next]').click(); await verify(page, { ...design, time: tick / 20 }); }
    await expect(page.locator('[data-chorus-boundary=next]')).toBeDisabled();
    for (const tick of edges.slice(0, -1).reverse()) { await page.locator('[data-chorus-boundary=previous]').click(); await verify(page, { ...design, time: tick / 20 }); }
    await expect(page.locator('[data-chorus-boundary=previous]')).toBeDisabled();
  }
  await clean(page, errors); writeFileSync(resolve(report, 'geometry.json'), JSON.stringify({ designs: evidence, halfOpenEndpointsAndMidpoints: true, integerOracle: true, errors }, null, 2));
});

test('a frozen chorus retains all lane offsets, selection, phase and cursor through host writes and complete restoration', async ({ page }) => {
  const errors = await mount(page), before = await rewards(page);
  const saved: Condition = { phase: 2, singer: 'redwingBlackbird', time: 6.25, offsets: { robin: -1, chickadee: .7, redwingBlackbird: 1, bluejay: 2 } };
  await settings(page, saved); await page.locator('[data-chorus-pin]').click(); await verify(page, saved, 'pinned', true);
  const changed: Condition = { phase: 3, singer: 'bluejay', time: 9.5, offsets: { robin: 2, chickadee: -2, redwingBlackbird: -1, bluejay: -1 } };
  await settings(page, changed); await verify(page, changed, 'current', true); await verify(page, saved, 'pinned', true);
  await page.locator('[data-chorus-experiment=later]').click(); await verify(page, { ...changed, offsets: { ...changed.offsets, bluejay: 0 } });
  await page.locator('[data-chorus-experiment=earlier]').click(); await verify(page, changed);
  await page.locator('[data-chorus-experiment=recenter]').click(); const centered = { ...changed, offsets: { ...changed.offsets, bluejay: 0 } }; await verify(page, centered);
  await page.evaluate(() => { const w = window as any; w.__toolData.birdLab.qaChorusHost = 'preserved'; w.__rerender(); });
  await verify(page, centered); await verify(page, saved, 'pinned', true);
  await page.locator('[data-chorus-restore]').click(); await verify(page, saved, 'current', true); await expect(page.locator('#birdlab-dawn-phase')).toHaveValue('2'); await expect(page.locator('[data-dawn-singer=redwingBlackbird]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-dawn-singer=robin]').click(); await verify(page, { ...saved, singer: 'robin' });
  await page.locator('[data-chorus-clear]').click(); await expect(page.locator('[data-chorus-pin]')).toBeFocused(); await expect(page.locator('[data-chorus-condition=pinned]')).toHaveCount(0); await expect(page.locator('[data-chorus-phrase=pinned]')).toHaveCount(0); await expect(page.locator('[data-chorus-cursor=pinned]')).toHaveCount(0); await expect(page.locator('[data-chorus-restore]')).toBeDisabled();
  expect(await rewards(page)).toEqual(before); expect(await page.evaluate(() => (window as any).__toolData.birdLab.qaChorusHost)).toBe('preserved'); await clean(page, errors);
  writeFileSync(resolve(report, 'comparison.json'), JSON.stringify({ saved, changed, completeRestore: true, noProgressWrites: true, errors }, null, 2));
});

test('native drags, touch cancellation, keyboard, responsive labels and one bounded animation remain usable without hidden work', async ({ page }) => {
  await manualRaf(page); const errors = await mount(page), before = await rewards(page), evidence = [], captures = [];
  for (const size of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, size.viewport, size.host); await settings(page, { ...initial(), phase: 2, time: 2 }); await page.locator('[data-chorus-pin]').click();
    const start = await point(page, 2), end = await point(page, 7.25); await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 3 }); await page.mouse.up(); await verify(page, { ...initial(), phase: 2, time: 7.25 });
    await touchGesture(page, 4.5); for (const kind of ['cancel', 'lost', 'multi']) await touchGesture(page, 9, kind);
    for (const selector of [timeline, '#birdlab-chorus-time']) { const node = page.locator(selector); await node.focus(); await page.keyboard.press('Home'); await expect(page.locator('#birdlab-chorus-time')).toHaveValue('0'); await page.keyboard.press('End'); await page.keyboard.press('ArrowLeft'); await expect(page.locator('#birdlab-chorus-time')).toHaveValue('11.95'); await expect(node).toBeFocused(); }
    await page.locator(timeline).focus(); await page.keyboard.press('Shift+ArrowLeft'); await expect(page.locator('#birdlab-chorus-time')).toHaveValue('10.95');
    const labels = await page.locator(timeline).evaluate((svg: SVGSVGElement) => {
      const box = svg.viewBox.baseVal, labels = [...svg.querySelectorAll('text')].map(n => { const b = n.getBBox(), matrix = n.getScreenCTM()!, m = svg.getScreenCTM()!.inverse().multiply(matrix), a = new DOMPoint(b.x, b.y).matrixTransform(m), z = new DOMPoint(b.x + b.width, b.y + b.height).matrixTransform(m); return { text: n.textContent, left: a.x, top: a.y, right: z.x, bottom: z.y, font: parseFloat(getComputedStyle(n).fontSize) * Math.hypot(matrix.a, matrix.b) }; });
      const errors = labels.flatMap(l => l.left < -.01 || l.top < -.01 || l.right > box.width + .01 || l.bottom > box.height + .01 || l.font < 11 ? [l] : []);
      for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) { const a = labels[i], b = labels[j]; if (Math.min(a.right, b.right) > Math.max(a.left, b.left) + .01 && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + .01) errors.push(a); }
      return errors;
    }); expect(labels).toEqual([]);
    for (const node of await page.locator(root + ' button, ' + root + ' input').all()) { const b = (await node.boundingBox())!; expect(b.width).toBeGreaterThanOrEqual(44); expect(b.height).toBeGreaterThanOrEqual(44); }
    expect(await page.locator(root).evaluate(n => n.scrollWidth - n.clientWidth)).toBeLessThanOrEqual(1); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const violations = await page.evaluate(async rules => (await (window as any).axe.run(document.querySelector('[data-birdlab-chorus-study]'), { runOnly: { type: 'rule', values: rules } })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })), rules); expect(violations).toEqual([]);
    evidence.push({ ...size, labels, violations, mouse: true, nativeTouch: true, cancelRestores: true, lostCaptureRestores: true, multiContactRestores: true, keyboard: true });
  }
  for (const viewport of [1280, 390]) { await sizing(page, viewport, viewport === 1280 ? 1100 : 390); await settings(page, { ...initial(), phase: 2, time: 3.5 }); await page.locator('[data-chorus-pin]').click(); await page.locator('#birdlab-chorus-offset').fill('1'); await page.locator('#birdlab-chorus-time').fill('4'); captures.push(await capture(page, 'chorus-' + viewport + '.png')); }
  const play = page.locator('[data-chorus-play]'), lifecycle = []; await expect(play).toBeDisabled(); await pending(page, 0);
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await expect(play).toBeEnabled();
  async function start() { await play.click(); await expect(page.locator(root)).toHaveAttribute('data-chorus-playing', 'true'); await pending(page, 1); }
  async function step(n: number) { return page.evaluate(n => (window as any).__chorusRaf.step(n), n); }
  async function stopped(reason: string) { await expect(page.locator(root)).toHaveAttribute('data-chorus-playing', 'false'); await pending(page, 0); const c = await condition(page); await step(3); await verify(page, c); lifecycle.push({ reason, pending: 0, condition: c }); }
  await start(); const sizes = await step(122); expect(sizes.every((n: number) => n <= 1)).toBe(true); await expect(page.locator('#birdlab-chorus-time')).toHaveValue('12'); await stopped('complete 12-second endpoint');
  await start(); await step(4); await page.locator('#birdlab-chorus-time').fill('5'); await stopped('manual time edit');
  await start(); await step(4); await page.locator('#birdlab-chorus-offset').fill('-1'); await stopped('offset edit');
  await start(); await step(4); await page.locator('[data-chorus-pin]').click(); await stopped('freeze');
  await start(); await step(4); await page.locator('#birdlab-dawn-phase').fill('3'); await stopped('parent phase edit');
  await start(); await step(4); await page.locator('[data-dawn-singer=bluejay]').click(); await stopped('parent singer edit');
  await start(); await step(4); await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(play).toBeDisabled(); await stopped('reduced motion');
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await start(); await step(4); await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); }); await stopped('hidden document'); await page.evaluate(() => { Reflect.deleteProperty(document, 'hidden'); document.dispatchEvent(new Event('visibilitychange')); }); await pending(page, 0);
  await start(); await step(4); await page.getByRole('button', { name: '← Menu', exact: true }).first().click(); await expect(page.locator(root)).toHaveCount(0); await pending(page, 0); await step(4); lifecycle.push({ reason: 'unmount', pending: 0 });
  expect(await rewards(page)).toEqual(before); await clean(page, errors); writeFileSync(resolve(report, 'interactions.json'), JSON.stringify({ hosts: evidence, captures, lifecycle, errors }, null, 2));
});

test('the existing morning phases, singer controls and call-trainer route retain their original behavior', async ({ page }) => {
  const errors = await mount(page), before = await rewards(page), frames: string[] = [];
  await sizing(page, 390, 390); const bench = page.locator('[data-birdlab-dawn-workbench]'), phase = page.locator('#birdlab-dawn-phase');
  await phase.focus(); await page.keyboard.press('Home');
  for (let index = 0; index < 4; index++) {
    if (index) await page.keyboard.press('ArrowRight'); await expect(phase).toHaveValue(String(index)); await expect(bench).toHaveAttribute('data-dawn-phase', String(index));
    frames.push(await bench.evaluate(n => JSON.stringify({ sky: [...n.querySelectorAll('[data-dawn-sky] stop')].map(s => s.getAttribute('stop-color')), voices: [...n.querySelectorAll('[data-dawn-singing]')].map(s => s.getAttribute('data-dawn-singing')) })));
  }
  expect(new Set(frames).size).toBe(4);
  for (const singer of await page.locator('button[data-dawn-singer]').all()) { await singer.focus(); await page.keyboard.press('Enter'); await expect(singer).toHaveAttribute('aria-pressed', 'true'); await expect(singer).toBeFocused(); await expect(phase).toHaveValue('3'); }
  await page.evaluate(() => { const w = window as any; w.__toolData.birdLab.qaExistingChorus = true; w.__rerender(); }); await expect(phase).toHaveValue('3'); await expect(page.locator('[data-dawn-singer=bluejay]')).toHaveAttribute('aria-pressed', 'true');
  expect(await rewards(page)).toEqual(before); await bench.getByRole('button', { name: 'Explore the Bird Call Trainer', exact: true }).click(); await expect(bench).toHaveCount(0); await expect(page.locator('#wrap h1')).toBeVisible(); expect(await page.evaluate(() => (window as any).__toolData.birdLab.view)).toBe('calls'); await clean(page, errors);
});
