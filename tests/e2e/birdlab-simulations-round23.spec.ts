import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', hasTouch: true });
test.describe.configure({ retries: 0, timeout: 180_000 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type Model = { amplitude: number; wavelength: number; crest: number; observer: number };
type Drawing = { spatial: number[][]; trace: number[][]; water: number[][]; point: number[]; tracePoint: number[]; positionLine: number[]; timeLine: number[]; startLine: number[]; readings: Record<string, string> };
const defaults: Model = { amplitude: 1, wavelength: 8, crest: 1, observer: 0 };
const root = '[data-birdlab-wave-study]';
const near = (actual: number, expected: number, tolerance = 1e-5) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((node: HTMLElement, width) => { node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.setAttribute('data-stem-tool-shell', 'true'); }, host);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'seabirds', blXp: 0, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100); await expect(page.locator(root)).toBeVisible();
}
async function physical(page: Page, id = 'current'): Promise<Model> {
  return page.locator('[data-wave-condition="' + id + '"]').evaluate(node => Object.fromEntries(['amplitude', 'wavelength', 'crest', 'observer'].map(key => [key, Number(node.getAttribute('data-wave-' + key))])) as Model);
}
async function settings(page: Page, model: Model) {
  for (const [key, value] of Object.entries(model)) await page.locator('#birdlab-wave-' + key).fill(String(value));
  await expect.poll(() => physical(page)).toEqual(model);
}
async function shared(page: Page, station: number, time: number) {
  await page.locator('#birdlab-wave-station').fill(String(station)); await page.locator('#birdlab-wave-time').fill(String(time));
}
// Independent phase rotation of the initial profile, rather than calling or
// copying the production traveling-coordinate function.
function sea(m: Model, x: number, t: number) {
  const phase = 2 * Math.PI * x / m.wavelength, rotation = 2 * Math.PI * m.crest * t / m.wavelength;
  return m.amplitude * (Math.sin(phase) * Math.cos(rotation) - Math.cos(phase) * Math.sin(rotation));
}
async function drawing(page: Page, id = 'current'): Promise<Drawing> {
  return page.locator('[data-wave-condition="' + id + '"]').evaluate(node => {
    function coordinates(selector: string) {
      const element = node.querySelector(selector) as SVGGraphicsElement, svg = element.ownerSVGElement!, relative = svg.getScreenCTM()!.inverse().multiply(element.getScreenCTM()!);
      function convert(x: number, y: number) { const p = new DOMPoint(x, y).matrixTransform(relative); return [p.x, p.y]; }
      if (element.tagName.toLowerCase() === 'polyline' || element.tagName.toLowerCase() === 'polygon') { const points = (element as SVGPolylineElement).points; return Array.from({ length: points.numberOfItems }, (_, i) => { const p = points.getItem(i); return convert(p.x, p.y); }); }
      if (element.tagName.toLowerCase() === 'circle') { const c = element as SVGCircleElement; return convert(c.cx.baseVal.value, c.cy.baseVal.value); }
      const line = element as SVGLineElement; return [...convert(line.x1.baseVal.value, line.y1.baseVal.value), ...convert(line.x2.baseVal.value, line.y2.baseVal.value)];
    }
    return { spatial: coordinates('[data-wave-profile]'), trace: coordinates('[data-wave-time-profile]'), water: coordinates('[data-wave-water]'), point: coordinates('[data-wave-observer-point]'), tracePoint: coordinates('[data-wave-trace-point]'), positionLine: coordinates('[data-wave-position-guide]'), timeLine: coordinates('[data-wave-time-guide]'), startLine: coordinates('[data-wave-start-guide]'), readings: Object.fromEntries(Array.from(node.querySelectorAll('[data-wave-reading]')).map(n => [n.getAttribute('data-wave-reading')!.split(':')[1], n.textContent!])) } as Drawing;
  });
}
function verify(d: Drawing, model: Model, station: number, time: number) {
  expect(d.spatial).toHaveLength(321); expect(d.trace).toHaveLength(321); expect(d.water).toHaveLength(323);
  const violations: string[] = [];
  const close = (a: number, b: number, label: string, tolerance = 4e-5) => { if (!(Math.abs(a - b) <= tolerance)) violations.push(label + ': ' + a + ' / ' + b); };
  for (let i = 0; i <= 320; i++) {
    const x = 40 * i / 320, t = 8 * i / 320;
    close(d.spatial[i][0], 50 + 12.5 * x, 'space x ' + i); close(d.spatial[i][1], 180 - 30 * sea(model, x, time), 'space z ' + i);
    close(d.trace[i][0], 50 + 62.5 * t, 'trace t ' + i); close(d.trace[i][1], 150 - 30 * sea(model, station + model.observer * t, t), 'trace z ' + i);
    close(d.water[i][0], d.spatial[i][0], 'water x ' + i); close(d.water[i][1], d.spatial[i][1], 'water z ' + i);
  }
  expect(violations).toEqual([]);
  // Inverse screen matrices introduce double-precision rounding at exact footer corners.
  [[550, 258], [50, 258]].forEach((point, index) => point.forEach((value, axis) => near(d.water[d.water.length - 2 + index][axis], value, 1e-10)));
  const x = station + model.observer * time, z = sea(model, x, time);
  near((d.point[0] - 50) / 12.5, x); near((180 - d.point[1]) / 30, z);
  near((d.tracePoint[0] - 50) / 62.5, time); near((150 - d.tracePoint[1]) / 30, z);
  near(d.positionLine[0], d.point[0], 4e-5); near(d.positionLine[2], d.point[0], 4e-5);
  near(d.timeLine[0], d.tracePoint[0], 4e-5); near(d.timeLine[2], d.tracePoint[0], 4e-5);
  near((d.startLine[0] - 50) / 12.5, station); near((d.startLine[2] - 50) / 12.5, station);
  const period = model.crest === model.observer ? null : Math.abs(model.wavelength / (model.observer - model.crest));
  near(parseFloat(d.readings.position), x, .00501); near(parseFloat(d.readings.height), z, .00501);
  near(parseFloat(d.readings.frequency), period ? 1 / period : 0, .00501);
  if (period) near(parseFloat(d.readings.period), period, .00501); else { expect(d.readings.period).toBe('No changing phase'); const ys = d.trace.map(p => p[1]); near(Math.max(...ys) - Math.min(...ys), 0, 4e-5); }
  expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(40);
}
async function check(page: Page, model: Model, station: number, time: number, id = 'current') {
  await expect.poll(async () => { const d = await drawing(page, id); return Math.abs((d.tracePoint[0] - 50) / 62.5 - time) < 1e-5 && Math.abs((d.startLine[0] - 50) / 12.5 - station) < 1e-5; }).toBe(true);
  verify(await drawing(page, id), model, station, time);
}
async function handlePoints(page: Page, kind: 'station' | 'time', value: number) {
  const svg = page.locator(kind === 'station' ? '[data-wave-space="current"]' : '[data-wave-trace="current"]'); await svg.scrollIntoViewIfNeeded();
  return svg.evaluate((node, options) => { const svg = node as SVGSVGElement, grip = svg.querySelector('[data-wave-grip="' + options.kind + '"]') as SVGCircleElement, matrix = svg.getScreenCTM()!, a = new DOMPoint(grip.cx.baseVal.value, grip.cy.baseVal.value).matrixTransform(matrix), b = new DOMPoint(50 + (options.kind === 'station' ? 12.5 : 62.5) * options.value, grip.cy.baseVal.value).matrixTransform(matrix); return { start: { x: a.x, y: a.y }, end: { x: b.x, y: b.y } }; }, { kind, value });
}
async function mouseDrag(page: Page, kind: 'station' | 'time', value: number) {
  const p = await handlePoints(page, kind, value); await page.mouse.move(p.start.x, p.start.y); await page.mouse.down(); await page.mouse.move(p.end.x, p.end.y, { steps: 5 }); await page.mouse.up();
}
async function touchDrag(page: Page, kind: 'station' | 'time', value: number, cancel = false) {
  const p = await handlePoints(page, kind, value), cdp = await page.context().newCDPSession(page);
  try { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p.start, id: 1 }] }); for (let i = 1; i <= 5; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.start.x + (p.end.x - p.start.x) * i / 5, y: p.start.y + (p.end.y - p.start.y) * i / 5, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] }); } finally { await cdp.detach(); }
}
async function releaseCapture(page: Page) {
  const p = await handlePoints(page, 'station', 20.25), handle = page.locator('[data-wave-handle="station"]');
  await handle.evaluate(node => { node.addEventListener('gotpointercapture', e => { (window as any).__wavePointer = (e as PointerEvent).pointerId; }, { once: true }); });
  await page.mouse.move(p.start.x, p.start.y); await page.mouse.down(); await page.mouse.move(p.end.x, p.end.y, { steps: 2 });
  await expect.poll(() => page.evaluate(() => (window as any).__wavePointer)).toBeTruthy();
  await handle.evaluate(node => node.releasePointerCapture((window as any).__wavePointer)); await page.mouse.move(p.end.x + 2, p.end.y);
  await page.mouse.move(1, 1); await page.mouse.up(); const before = await page.locator('#birdlab-wave-station').inputValue();
  const hover = await handlePoints(page, 'station', 24); await page.mouse.move(hover.start.x, hover.start.y); await page.mouse.move(hover.end.x, hover.end.y, { steps: 3 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); await expect(page.locator('#birdlab-wave-station')).toHaveValue(before);
}

test('native space and time curves obey independent phase rotation, exact co-moving phase and full-bound observer paths with direct inspection', async ({ page }) => {
  await mount(page); await check(page, defaults, 20, 0);
  const cases: Model[] = [defaults, { amplitude: .5, wavelength: 4, crest: .5, observer: -1.5 }, { amplitude: 2, wavelength: 16, crest: 1.5, observer: 1.5 }, { amplitude: 2, wavelength: 4, crest: 1.5, observer: -1.5 }, { amplitude: 1.25, wavelength: 7.5, crest: .75, observer: 1.5 }, { amplitude: .75, wavelength: 13.5, crest: 1.25, observer: -.25 }];
  for (const model of cases) { await settings(page, model); for (const station of [12, 28]) for (const time of [0, 2.1, 8]) { await shared(page, station, time); await check(page, model, station, time); } }
  await settings(page, defaults); await shared(page, 20, 0); await mouseDrag(page, 'time', 3.2); await expect(page.locator('#birdlab-wave-time')).toHaveValue('3.2'); await check(page, defaults, 20, 3.2);
  await mouseDrag(page, 'station', 24.5); await expect(page.locator('#birdlab-wave-station')).toHaveValue('24.5'); await check(page, defaults, 24.5, 3.2);
  await mouseDrag(page, 'station', 9); await expect(page.locator('#birdlab-wave-station')).toHaveValue('12'); await mouseDrag(page, 'station', 31); await expect(page.locator('#birdlab-wave-station')).toHaveValue('28');
  await expect(page.locator('[data-seabird-plate]')).toHaveCount(1); await expect(page.getByRole('button', { name: 'Atlantic Puffin', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('complete frozen wave and observer, exact restored experiments and shared inspection survive species and host writes; sweep lifecycle awards no progress', async ({ page }) => {
  await mount(page); const progress = await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab));
  const frozen = { amplitude: .75, wavelength: 6.5, crest: .75, observer: -.5 }; await settings(page, frozen); await page.locator('[data-wave-pin]').click(); await shared(page, 23.25, 4.3);
  for (const [kind, expected] of [['amplitude', { ...frozen, amplitude: 1.5 }], ['wavelength', { ...frozen, wavelength: 13 }], ['follow', { ...frozen, observer: .75 }]] as const) {
    await settings(page, { amplitude: 2, wavelength: 16, crest: 1.5, observer: 1.5 }); await page.locator('[data-wave-experiment="' + kind + '"]').click(); expect(await physical(page)).toEqual(expected); expect(await physical(page, 'pinned')).toEqual(frozen); await check(page, expected, 23.25, 4.3); await check(page, frozen, 23.25, 4.3, 'pinned');
  }
  await shared(page, 12, 8); await check(page, { ...frozen, observer: .75 }, 12, 8); await check(page, frozen, 12, 8, 'pinned');
  await page.getByRole('button', { name: 'Razorbill', exact: true }).click(); expect(await physical(page, 'pinned')).toEqual(frozen); await check(page, { ...frozen, observer: .75 }, 12, 8);
  await page.evaluate(() => (window as any).__ctx.update('birdLab', 'blXp', 17)); await expect.poll(() => page.evaluate(() => (window as any).__toolData.birdLab.blXp)).toBe(17); await check(page, frozen, 12, 8, 'pinned');
  await settings(page, { amplitude: 1.25, wavelength: 8.5, crest: 1.25, observer: -1.5 }); await page.locator('[data-wave-pin]').click(); await expect(page.locator('[data-wave-experiment="amplitude"]')).toBeDisabled(); await expect(page.locator('[data-wave-experiment="wavelength"]')).toBeDisabled();
  await page.locator('[data-wave-answer="crest"]').click(); await expect(page.locator('.birdlab-wave-feedback')).toContainText('no force'); await page.locator('[data-wave-answer="phase"]').click(); await expect(page.locator('.birdlab-wave-feedback')).toContainText('not a buoyancy or flight result');
  await page.locator('[data-wave-reset]').click(); expect(await physical(page)).toEqual(defaults); await expect(page.locator('.birdlab-wave-feedback')).toHaveCount(0); await check(page, defaults, 12, 8); expect(await physical(page, 'pinned')).toEqual({ amplitude: 1.25, wavelength: 8.5, crest: 1.25, observer: -1.5 });
  await expect(page.locator('[data-wave-play]')).toBeDisabled(); await page.emulateMedia({ reducedMotion: 'no-preference' }); await expect(page.locator('[data-wave-play]')).toBeEnabled(); await page.locator('[data-wave-play]').click(); await expect.poll(() => page.locator(root).getAttribute('data-wave-time')).not.toBe('0'); await expect(page.locator(root)).toHaveAttribute('data-wave-playing', 'true');
  await page.locator('#birdlab-wave-observer').fill('0.5'); await expect(page.locator(root)).toHaveAttribute('data-wave-playing', 'false'); const paused = Number(await page.locator(root).getAttribute('data-wave-time')); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); near(Number(await page.locator(root).getAttribute('data-wave-time')), paused);
  await shared(page, 12, 7.9); await page.locator('[data-wave-play]').click(); await expect(page.locator(root)).toHaveAttribute('data-wave-playing', 'false'); await check(page, { ...defaults, observer: .5 }, 12, 8);
  await shared(page, 12, 0); await page.locator('[data-wave-play]').click(); await expect(page.locator(root)).toHaveAttribute('data-wave-playing', 'true'); await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(page.locator(root)).toHaveAttribute('data-wave-playing', 'false'); await expect(page.locator('[data-wave-play]')).toBeDisabled();
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.locator('[data-wave-play]').click(); await expect(page.locator(root)).toHaveAttribute('data-wave-playing', 'true'); await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }); await expect(page.locator(root)).toHaveAttribute('data-wave-playing', 'false'); await page.evaluate(() => { delete (document as any).hidden; });
  await page.locator('[data-wave-clear]').click(); await expect(page.locator('#birdlab-wave-time')).toBeFocused(); await expect(page.locator('[data-wave-condition="pinned"]')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify({ ...(window as any).__toolData.birdLab, blXp: 0 }))).toBe(progress);
  await page.getByRole('button', { name: '← Menu', exact: true }).first().click(); await expect(page.locator(root)).toHaveCount(0); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('touch drag, cancelled and lost capture, keyboard and disjoint native labels remain operable across three hosts with eight accessibility rules', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); await page.locator('[data-wave-reset]').click(); await shared(page, 20, 0); await page.locator('[data-wave-pin]').click();
    await touchDrag(page, 'time', 5.6); await expect(page.locator('#birdlab-wave-time')).toHaveValue('5.6'); await touchDrag(page, 'station', 25.5); await expect(page.locator('#birdlab-wave-station')).toHaveValue('25.5'); await check(page, defaults, 25.5, 5.6); await check(page, defaults, 25.5, 5.6, 'pinned');
    await touchDrag(page, 'station', 22.5, true); await touchDrag(page, 'station', 24.25); await expect(page.locator('#birdlab-wave-station')).toHaveValue('24.25'); await check(page, defaults, 24.25, 5.6);
    await shared(page, 20, 0); await releaseCapture(page);
    const time = page.locator('[data-wave-handle="time"]'), station = page.locator('[data-wave-handle="station"]'); await time.focus(); await page.keyboard.press('ArrowRight'); await expect(time).toBeFocused(); await expect(page.locator('#birdlab-wave-time')).toHaveValue('0.1'); await page.keyboard.press('End'); await expect(page.locator('#birdlab-wave-time')).toHaveValue('8'); await expect(page.locator('[data-wave-nudge="next"]')).toBeDisabled(); await page.keyboard.press('Home'); await expect(page.locator('#birdlab-wave-time')).toHaveValue('0'); await expect(page.locator('[data-wave-nudge="back"]')).toBeDisabled();
    await station.focus(); await page.keyboard.press('Home'); await expect(page.locator('#birdlab-wave-station')).toHaveValue('12'); await page.keyboard.press('End'); await expect(page.locator('#birdlab-wave-station')).toHaveValue('28'); await page.keyboard.press('ArrowLeft'); await expect(page.locator('#birdlab-wave-station')).toHaveValue('27.75'); await expect(station).toBeFocused();
    await page.locator('[data-wave-nudge="next"]').tap(); await check(page, defaults, 27.75, .1); const experiment = page.locator('[data-wave-experiment="follow"]'); await experiment.focus(); await page.keyboard.press('Enter'); await expect(experiment).toBeFocused(); await check(page, { ...defaults, observer: 1 }, 27.75, .1); await check(page, defaults, 27.75, .1, 'pinned');
    const labelViolations = await page.locator(root + ' svg').evaluateAll(nodes => {
      const failures: string[] = [];
      for (const node of nodes) { const svg = node as SVGSVGElement, name = svg.getAttribute('data-wave-space') || svg.getAttribute('data-wave-trace'), labels = Array.from(svg.querySelectorAll('text')).map(n => { const text = n as SVGTextElement, b = text.getBBox(), m = text.getScreenCTM()!; return { text: text.textContent!, left: b.x, top: b.y, right: b.x + b.width, bottom: b.y + b.height, font: parseFloat(getComputedStyle(text).fontSize) * Math.hypot(m.a, m.b) }; });
        for (const label of labels) if (!(label.left >= 0 && label.top >= 0 && label.right <= svg.viewBox.baseVal.width && label.bottom <= svg.viewBox.baseVal.height && label.font >= 11)) failures.push(name + ': out of bounds/small ' + JSON.stringify(label));
        for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) { const a = labels[i], b = labels[j]; if (Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)) failures.push(name + ': overlap ' + a.text + ' / ' + b.text); }
      } return failures;
    }); expect(labelViolations).toEqual([]);
    const host = (await page.locator('#wrap').boundingBox())!; for (const selector of [root, '.birdlab-wave-controls', '[data-wave-condition="current"]', '[data-wave-condition="pinned"]', '.birdlab-wave-notes']) { const node = page.locator(selector), b = (await node.boundingBox())!; expect(b.x).toBeGreaterThanOrEqual(host.x - 1); expect(b.x + b.width).toBeLessThanOrEqual(host.x + host.width + 1); expect(await node.evaluate(n => n.scrollWidth - n.clientWidth)).toBeLessThanOrEqual(1); }
    for (const kind of ['space', 'trace']) { const widths = await page.locator('[data-wave-' + kind + ']').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().width)); near(widths[0], widths[1], 1); }
    for (const selector of ['[data-wave-hit]', '[data-wave-nudge]', '.birdlab-wave-control input']) for (const control of await page.locator(selector).all()) { const b = (await control.boundingBox())!; expect(b.width).toBeGreaterThanOrEqual(44); expect(b.height).toBeGreaterThanOrEqual(44); }
    const violations = await page.evaluate(async () => { const result = await (window as any).axe.run(document.querySelector('[data-birdlab-wave-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } }); return result.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })); }); expect(violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1); await page.locator('[data-wave-clear]').click(); await expect(page.locator('#birdlab-wave-time')).toBeFocused();
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
