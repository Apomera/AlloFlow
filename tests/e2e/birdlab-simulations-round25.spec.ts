import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', hasTouch: true, trace: { mode: 'retain-on-failure', screenshots: false, snapshots: true } });
test.describe.configure({ retries: 0, timeout: 180_000 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type Model = { conductance: number; capacity: number; flow: 'counter' | 'parallel' };
type Drawing = { hot: number[][]; cold: number[][]; area: number[][]; probe: number[]; gap: number[]; hotPoint: number[]; coldPoint: number[]; channelProbe: number[]; strips: { kind: string; box: number[][]; color: string }[]; arrows: { width: number; opacity: number; start: number[]; end: number[] }[]; directions: { kind: string; start: number[]; end: number[] }[]; readings: Record<string, string>; status: string };
const root = '[data-birdlab-heat-study]';
const defaults: Model = { conductance: 3, capacity: 2, flow: 'counter' };
const near = (actual: number, expected: number, tolerance = 5e-5) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);

async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((node: HTMLElement, width) => { node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.setAttribute('data-stem-tool-shell', 'true'); }, host);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'thermo', blXp: 0, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100); await expect(page.locator(root)).toBeVisible();
}
async function physical(page: Page, id = 'current'): Promise<Model> {
  return page.locator('[data-heat-condition="' + id + '"]').evaluate(node => ({ conductance: Number(node.getAttribute('data-heat-conductance')), capacity: Number(node.getAttribute('data-heat-capacity')), flow: node.getAttribute('data-heat-flow') as Model['flow'] }));
}
async function settings(page: Page, model: Model) {
  await page.locator('#birdlab-heat-conductance').fill(String(model.conductance)); await page.locator('#birdlab-heat-capacity').fill(String(model.capacity)); await page.locator('[data-heat-flow-button="' + model.flow + '"]').click(); await expect.poll(() => physical(page)).toEqual(model);
}

// Independent steady energy-balance oracle. RK4 integrates the two stream
// ODEs. Counterflow is a boundary-value problem: shooting solves its unknown
// cold outlet from the actual cold inlet at the opposite end. No production
// effectiveness or profile formula is called or repeated here.
function oracle(m: Model) {
  const steps = 1600, h = 1 / steps, coupling = m.conductance / m.capacity;
  function derivative(p: number[]) { const transfer = coupling * (p[0] - p[1]); return [-transfer, (m.flow === 'counter' ? -1 : 1) * transfer]; }
  function step(p: number[], interval: number) {
    const a = derivative(p), b = derivative(p.map((v, j) => v + interval * a[j] / 2)), c = derivative(p.map((v, j) => v + interval * b[j] / 2)), d = derivative(p.map((v, j) => v + interval * c[j]));
    return p.map((v, j) => v + interval * (a[j] + 2 * b[j] + 2 * c[j] + d[j]) / 6);
  }
  function integrate(coldStart: number) {
    let p = [40, coldStart]; const samples: number[][] = [p.slice()], all: number[][] = [p.slice()];
    for (let i = 1; i <= steps; i++) {
      p = step(p, h); all.push(p.slice()); if (i % 20 === 0) samples.push(p.slice());
    }
    return { samples, all, end: p };
  }
  let result = integrate(5);
  if (m.flow === 'counter') { const other = integrate(40), coldStart = 5 + (5 - result.end[1]) * 35 / (other.end[1] - result.end[1]); result = integrate(coldStart); }
  const q = m.capacity * (result.samples[0][0] - result.end[0]), coldGain = m.capacity * (m.flow === 'counter' ? result.samples[0][1] - result.end[1] : result.end[1] - result.samples[0][1]);
  let integral = 0; result.all.forEach((p, i) => { integral += (i === 0 || i === steps ? 1 : i % 2 ? 4 : 2) * m.conductance * (p[0] - p[1]); }); integral /= 3 * steps;
  near(q, coldGain, 1e-7); near(q, integral, 1e-5);
  return { samples: result.samples, q, effectiveness: q / (35 * m.capacity), at: (x: number) => { const i = Math.min(steps, Math.floor(x * steps)); return step(result.all[i], x - i / steps); } };
}

async function drawing(page: Page, id = 'current'): Promise<Drawing> {
  return page.locator('[data-heat-condition="' + id + '"]').evaluate(node => {
    function coordinate(element: SVGGraphicsElement, x: number, y: number) { const matrix = element.ownerSVGElement!.getScreenCTM()!.inverse().multiply(element.getScreenCTM()!), p = new DOMPoint(x, y).matrixTransform(matrix); return [p.x, p.y]; }
    function points(selector: string) {
      const e = node.querySelector(selector) as SVGPolylineElement; return Array.from({ length: e.points.numberOfItems }, (_, i) => { const p = e.points.getItem(i); return coordinate(e, p.x, p.y); });
    }
    function line(selector: string) { const e = node.querySelector(selector) as SVGLineElement; return [...coordinate(e, e.x1.baseVal.value, e.y1.baseVal.value), ...coordinate(e, e.x2.baseVal.value, e.y2.baseVal.value)]; }
    function circle(selector: string) { const e = node.querySelector(selector) as SVGCircleElement; return coordinate(e, e.cx.baseVal.value, e.cy.baseVal.value); }
    function pathEnds(e: SVGPathElement, distance: number) { const a = e.getPointAtLength(0), b = e.getPointAtLength(distance); return { start: coordinate(e, a.x, a.y), end: coordinate(e, b.x, b.y) }; }
    return {
      hot: points('[data-heat-hot]'), cold: points('[data-heat-cold]'), area: points('[data-heat-gap-area]'), probe: line('[data-heat-probe-line]'), gap: line('[data-heat-gap-probe]'), hotPoint: circle('[data-heat-hot-point]'), coldPoint: circle('[data-heat-cold-point]'), channelProbe: line('[data-heat-channel-probe]'),
      strips: Array.from(node.querySelectorAll('[data-heat-strip]')).map(node => { const e = node as SVGRectElement, x = e.x.baseVal.value, y = e.y.baseVal.value; return { kind: e.getAttribute('data-heat-strip')!, box: [coordinate(e, x, y), coordinate(e, x + e.width.baseVal.value, y + e.height.baseVal.value)], color: getComputedStyle(e).fill }; }),
      arrows: Array.from(node.querySelectorAll('[data-heat-transfer]')).map(node => { const e = node as SVGPathElement; return { width: parseFloat(getComputedStyle(e).strokeWidth), opacity: Number(getComputedStyle(e).opacity), ...pathEnds(e, 39) }; }),
      directions: Array.from(node.querySelectorAll('[data-heat-direction]')).map(node => { const e = node as SVGPathElement; return { kind: e.getAttribute('data-heat-direction')!, ...pathEnds(e, 38) }; }),
      readings: Object.fromEntries(Array.from(node.querySelectorAll('[data-heat-reading]')).map(n => [n.getAttribute('data-heat-reading')!.split(':')[1], n.textContent!])), status: node.querySelector('[data-heat-status]')!.textContent!
    };
  });
}
function verify(d: Drawing, m: Model, position: number) {
  const result = oracle(m), violations: string[] = [], close = (a: number, b: number, label: string, tolerance = 5e-5) => { if (!(Math.abs(a - b) <= tolerance)) violations.push(label + ': ' + a + ' / ' + b); };
  expect(d.hot).toHaveLength(81); expect(d.cold).toHaveLength(81); expect(d.area).toHaveLength(162); expect(d.strips).toHaveLength(96); expect(d.arrows).toHaveLength(3); expect(d.directions).toHaveLength(6);
  result.samples.forEach((t, i) => { for (const [j, curve] of [d.hot, d.cold].entries()) { close((curve[i][0] - 80) / 480, i / 80, 'profile x ' + i); close((350 - curve[i][1]) * 45 / 240, t[j], 'profile temperature ' + j + ':' + i); close(d.area[j === 0 ? i : 161 - i][0], curve[i][0], 'filled gap x'); close(d.area[j === 0 ? i : 161 - i][1], curve[i][1], 'filled gap temperature'); } if (t[0] + 1e-7 < t[1]) violations.push('local temperature crossing'); });
  d.strips.forEach((strip, i) => { const index = Math.floor(i / 2), channel = strip.kind === 'hot' ? 0 : 1, temperature = result.at((index + .5) / 48)[channel], f = (temperature - 5) / 35, expected = [67 + 145 * f, 126 - 37 * f, 150 - 102 * f], actual = strip.color.match(/[\d.]+/g)!.map(Number); close(strip.box[0][0], 80 + 10 * index, 'strip x'); close(strip.box[0][1], channel ? 248 : 112, 'strip y'); close(strip.box[1][0] - strip.box[0][0], 10, 'strip width'); close(strip.box[1][1] - strip.box[0][1], 36, 'strip height'); expected.forEach((v, j) => close(actual[j], Math.round(v), 'fixed palette ' + i + ':' + j, 1)); });
  const at = result.at(position), x = 80 + 480 * position;
  close(d.probe[0], x, 'probe x'); close(d.probe[2], x, 'probe end x'); close(d.channelProbe[0], x, 'channel x'); close(d.channelProbe[2], x, 'channel end x');
  [d.hotPoint, d.coldPoint].forEach((p, i) => { close(p[0], x, 'point x'); close((350 - p[1]) * 45 / 240, at[i], 'point temperature', .001); close(d.gap[i * 2], x, 'gap x'); close(d.gap[i * 2 + 1], p[1], 'gap endpoint'); });
  d.arrows.forEach((a, i) => { const x = [150, 320, 490][i], t = result.at((x - 80) / 480), transfer = m.conductance * (t[0] - t[1]); close(a.start[0], x, 'heat arrow x'); close(a.start[1], 165, 'heat arrow start'); close(a.end[1], 204, 'heat arrow down'); close(a.width, 2 + Math.min(5, transfer / 20), 'heat width', .001); expect(a.opacity).toBe(m.conductance === 0 ? 0 : 1); });
  d.directions.forEach(a => { close(a.end[0] - a.start[0], a.kind === 'cold' && m.flow === 'counter' ? -38 : 38, 'flow direction'); close(a.end[1], a.start[1], 'flow horizontal'); });
  close(parseFloat(d.readings.hot), at[0], 'hot reading', .006); close(parseFloat(d.readings.cold), at[1], 'cold reading', .006); close(parseFloat(d.readings.gap), at[0] - at[1], 'gap reading', .006); close(parseFloat(d.readings.rate), result.q, 'heat reading', .00501); close(parseFloat(d.readings.effectiveness), result.effectiveness * 100, 'effectiveness reading', .00501); close(parseFloat(d.readings.local), m.conductance * (at[0] - at[1]), 'local heat reading', .012);
  expect(violations).toEqual([]);
}
async function check(page: Page, m: Model, position: number, id = 'current') { await expect(page.locator(root)).toHaveAttribute('data-heat-position', String(position)); verify(await drawing(page, id), m, position); }
async function handlePoints(page: Page, target: number) {
  const graph = page.locator('[data-heat-graph="current"]'); await graph.scrollIntoViewIfNeeded();
  return graph.evaluate((node, value) => { const svg = node as SVGSVGElement, grip = svg.querySelector('[data-heat-grip]') as SVGCircleElement, matrix = svg.getScreenCTM()!, a = new DOMPoint(grip.cx.baseVal.value, grip.cy.baseVal.value).matrixTransform(matrix), b = new DOMPoint(80 + 480 * value, 495).matrixTransform(matrix); return { start: { x: a.x, y: a.y }, end: { x: b.x, y: b.y } }; }, target);
}
async function mouseDrag(page: Page, target: number) { const p = await handlePoints(page, target); await page.mouse.move(p.start.x, p.start.y); await page.mouse.down(); await page.mouse.move(p.end.x, p.end.y, { steps: 5 }); await page.mouse.up(); }
async function touchDrag(page: Page, target: number, cancel = false) {
  const p = await handlePoints(page, target), cdp = await page.context().newCDPSession(page);
  try { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p.start, id: 1 }] }); for (let i = 1; i <= 5; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.start.x + (p.end.x - p.start.x) * i / 5, y: p.start.y, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] }); } finally { await cdp.detach(); }
}
async function multiTouch(page: Page) {
  const p = await handlePoints(page, .8), before = await page.locator('#birdlab-heat-position').inputValue(), cdp = await page.context().newCDPSession(page);
  try { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p.start, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p.start, id: 1 }, { x: p.start.x + 100, y: p.start.y - 80, id: 2 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...p.end, id: 1 }, { x: p.start.x + 125, y: p.start.y - 80, id: 2 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); } finally { await cdp.detach(); }
  await expect(page.locator('#birdlab-heat-position')).toHaveValue(before);
}
async function releaseCapture(page: Page) {
  const p = await handlePoints(page, .25), handle = page.locator('[data-heat-handle]'); await handle.evaluate(node => { node.addEventListener('gotpointercapture', e => { (window as any).__heatPointer = (e as PointerEvent).pointerId; }, { once: true }); });
  await page.mouse.move(p.start.x, p.start.y); await page.mouse.down(); await page.mouse.move(p.end.x, p.end.y, { steps: 2 }); await expect.poll(() => page.evaluate(() => (window as any).__heatPointer)).toBeTruthy(); await handle.evaluate(node => node.releasePointerCapture((window as any).__heatPointer)); await page.mouse.move(p.end.x + 2, p.end.y); await page.mouse.move(1, 1); await page.mouse.up(); const before = await page.locator('#birdlab-heat-position').inputValue(); const hover = await handlePoints(page, .7); await page.mouse.move(hover.start.x, hover.start.y); await page.mouse.move(hover.end.x, hover.end.y, { steps: 3 }); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); await expect(page.locator('#birdlab-heat-position')).toHaveValue(before);
}

test('native channel fills, local heat arrows and temperature profiles obey independent RK4 energy balances and counterflow boundary shooting', async ({ page }) => {
  await mount(page); await check(page, defaults, .5);
  for (const model of [defaults, { conductance: 0, capacity: 1, flow: 'counter' }, { conductance: 0, capacity: 4, flow: 'parallel' }, { conductance: 8, capacity: 1, flow: 'counter' }, { conductance: 8, capacity: 1, flow: 'parallel' }, { conductance: .25, capacity: 4, flow: 'counter' }, { conductance: 5.75, capacity: 2.75, flow: 'parallel' }, { conductance: 1.25, capacity: 3.25, flow: 'counter' }] as Model[]) {
    await settings(page, model); for (const position of [0, .2, .5, .77, 1]) { await page.locator('#birdlab-heat-position').fill(String(position)); await check(page, model, position); }
  }
  await settings(page, defaults); await mouseDrag(page, .68); await check(page, defaults, .68); await mouseDrag(page, -.1); await check(page, defaults, 0); await mouseDrag(page, 1.1); await check(page, defaults, 1);
  const temperatures = oracle(defaults).samples; expect(temperatures[0][1]).toBeGreaterThan(temperatures[80][0]); expect(temperatures.every(t => t[0] > t[1])).toBe(true);
  await expect(page.locator('[data-birdlab-thermo-workbench]')).toHaveCount(1); await page.getByRole('button', { name: 'Separated vessels', exact: true }).click(); await check(page, defaults, 1); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('complete exchanger freezes and exact experiments preserve the shared spatial probe across context writes and leave learner progress alone', async ({ page }) => {
  await mount(page); const progress = await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab)), frozen: Model = { conductance: 3.5, capacity: 1.75, flow: 'parallel' };
  await settings(page, frozen); await page.locator('[data-heat-pin]').click(); await page.locator('#birdlab-heat-position').fill('0.73');
  for (const [kind, expected] of [['conductance', { ...frozen, conductance: 7 }], ['capacity', { ...frozen, capacity: 3.5 }], ['flow', { ...frozen, flow: 'counter' }]] as [string, Model][]) {
    await settings(page, { conductance: 8, capacity: 4, flow: 'counter' }); await page.locator('[data-heat-experiment="' + kind + '"]').click(); expect(await physical(page)).toEqual(expected); expect(await physical(page, 'pinned')).toEqual(frozen); await check(page, expected, .73); await check(page, frozen, .73, 'pinned');
  }
  await page.getByRole('button', { name: 'Nearby vessels', exact: true }).click(); await page.locator('[data-thermo-step="3"]').click(); await check(page, frozen, .73, 'pinned'); await page.evaluate(() => (window as any).__ctx.update('birdLab', 'blXp', 17)); await expect.poll(() => page.evaluate(() => (window as any).__toolData.birdLab.blXp)).toBe(17); await check(page, frozen, .73, 'pinned');
  await settings(page, { conductance: 4.25, capacity: 2.25, flow: 'counter' }); await page.locator('[data-heat-pin]').click(); await expect(page.locator('[data-heat-experiment="conductance"]')).toBeDisabled(); await expect(page.locator('[data-heat-experiment="capacity"]')).toBeDisabled(); await expect(page.locator('[data-heat-experiment="flow"]')).toBeEnabled();
  await page.locator('[data-heat-answer="cross"]').click(); await expect(page.locator('.birdlab-heat-feedback')).toContainText('one x'); await page.locator('[data-heat-answer="ends"]').click(); await expect(page.locator('.birdlab-heat-feedback')).toContainText('At every shared position');
  await page.locator('[data-heat-reset]').click(); expect(await physical(page)).toEqual(defaults); await check(page, defaults, .73); await expect(page.locator('.birdlab-heat-feedback')).toHaveCount(0); expect(await physical(page, 'pinned')).toEqual({ conductance: 4.25, capacity: 2.25, flow: 'counter' }); await page.locator('[data-heat-clear]').click(); await expect(page.locator('#birdlab-heat-position')).toBeFocused(); await expect(page.locator('[data-heat-condition="pinned"]')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify({ ...(window as any).__toolData.birdLab, blXp: 0 }))).toBe(progress); await page.getByRole('button', { name: '← Menu', exact: true }).first().click(); await expect(page.locator(root)).toHaveCount(0); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('real touch, lost capture, multipointer suppression and keyboard inspect linked temperatures in three hosts with native labels and eight accessibility rules', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); await page.locator('[data-heat-reset]').click(); await page.locator('#birdlab-heat-position').fill('0.5'); await page.locator('[data-heat-pin]').click();
    await touchDrag(page, .75); await check(page, defaults, .75); await check(page, defaults, .75, 'pinned'); await touchDrag(page, .35, true); await touchDrag(page, .65); await check(page, defaults, .65); await page.locator('#birdlab-heat-position').fill('0.5'); await multiTouch(page); await releaseCapture(page); await touchDrag(page, .4); await check(page, defaults, .4);
    const handle = page.locator('[data-heat-handle]'); await handle.focus(); await page.keyboard.press('Home'); await check(page, defaults, 0); await expect(page.locator('[data-heat-nudge="back"]')).toBeDisabled(); await page.keyboard.press('End'); await check(page, defaults, 1); await expect(page.locator('[data-heat-nudge="next"]')).toBeDisabled(); await page.keyboard.press('ArrowLeft'); await check(page, defaults, .99); await expect(handle).toBeFocused(); await page.locator('[data-heat-nudge="back"]').tap(); await check(page, defaults, .98);
    const reverse = page.locator('[data-heat-experiment="flow"]'); await reverse.focus(); await page.keyboard.press('Enter'); await expect(reverse).toBeFocused(); await check(page, { ...defaults, flow: 'parallel' }, .98); await check(page, defaults, .98, 'pinned');
    const labels = await page.locator(root + ' svg').evaluateAll(nodes => {
      const failures: string[] = []; for (const node of nodes) { const svg = node as SVGSVGElement, name = svg.getAttribute('data-heat-channels') || svg.getAttribute('data-heat-graph'), labels = Array.from(svg.querySelectorAll('text')).map(node => { const e = node as SVGTextElement, b = e.getBBox(), matrix = e.getScreenCTM()!; return { text: e.textContent!, left: b.x, top: b.y, right: b.x + b.width, bottom: b.y + b.height, font: parseFloat(getComputedStyle(e).fontSize) * Math.hypot(matrix.a, matrix.b) }; });
        for (const label of labels) if (!(label.left >= -.01 && label.top >= -.01 && label.right <= svg.viewBox.baseVal.width + .01 && label.bottom <= svg.viewBox.baseVal.height + .01 && label.font >= 11)) failures.push(name + ': bounds/font ' + JSON.stringify(label));
        for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) { const a = labels[i], b = labels[j]; if (Math.min(a.right, b.right) > Math.max(a.left, b.left) + .01 && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + .01) failures.push(name + ': overlap ' + a.text + ' / ' + b.text); }
      } return failures;
    }); expect(labels).toEqual([]);
    const host = (await page.locator('#wrap').boundingBox())!; for (const selector of [root, '.birdlab-heat-controls', '[data-heat-condition="current"]', '[data-heat-condition="pinned"]', '.birdlab-heat-notes']) { const node = page.locator(selector), b = (await node.boundingBox())!; expect(b.x).toBeGreaterThanOrEqual(host.x - 1); expect(b.x + b.width).toBeLessThanOrEqual(host.x + host.width + 1); expect(await node.evaluate(n => n.scrollWidth - n.clientWidth)).toBeLessThanOrEqual(1); }
    for (const kind of ['channels', 'graph']) { const widths = await page.locator('[data-heat-' + kind + ']').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().width)); near(widths[0], widths[1], 1); }
    for (const selector of ['[data-heat-hit]', '[data-heat-nudge]', '.birdlab-heat-control input']) for (const control of await page.locator(selector).all()) { const b = (await control.boundingBox())!; expect(b.width).toBeGreaterThanOrEqual(44); expect(b.height).toBeGreaterThanOrEqual(44); }
    const violations = await page.evaluate(async () => { const result = await (window as any).axe.run(document.querySelector('[data-birdlab-heat-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } }); return result.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })); }); expect(violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1); await page.locator('[data-heat-clear]').click(); await expect(page.locator('#birdlab-heat-position')).toBeFocused();
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
