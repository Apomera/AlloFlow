import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', hasTouch: true, trace: { mode: 'retain-on-failure', screenshots: false, snapshots: true } });
test.describe.configure({ timeout: 240_000, retries: 0 });
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js', width: 1100, height: 1000,
  layout: 'document', appStyles: true, extraScripts: ['node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type Model = { version: number; speed: number; bank: number; time: number };
const initial: Model = { version: 1, speed: 12, bank: 30, time: 2 };
const root = '[data-raptor-bank-study]', current = '[data-bank-condition="current"]', rad = Math.PI / 180;
async function mount(page: Page, bankTurnStudy?: any) {
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { raptorHunt: { activeSection: 'flight_dynamics', bankTurnStudy, xp: 0 } }, undefined, { expectCanvas: false });
  await expect(page.locator(root)).toBeVisible();
}
async function settle(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function replace(page: Page, value: any) {
  await page.evaluate(model => (window as any).__ctx.setToolData((old: any) => ({ ...old, raptorHunt: { ...old.raptorHunt, bankTurnStudy: model } })), value); await settle(page);
}
async function range(page: Page, key: string, value: number) {
  await page.locator('#rh-bank-' + key).evaluate((node: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(node, String(next));
    node.dispatchEvent(new Event('input', { bubbles: true })); node.dispatchEvent(new Event('change', { bubbles: true }));
  }, value); await expect(page.locator('#rh-bank-' + key)).toHaveValue(String(value));
}
async function design(page: Page, key = 'current') { return (await page.locator('[data-bank-condition="' + key + '"]').getAttribute('data-bank-design'))!.split(',').map(Number); }

// Independent force balance and numerical trajectory integration. Production
// uses tan and a closed-form half-angle displacement. Here lift is solved from
// vertical equilibrium, its horizontal component gives angular velocity, and
// Simpson quadrature integrates the two instantaneous velocity components.
function oracle(value: Model) {
  const c = Math.cos(value.bank * rad), s = Math.sin(value.bank * rad), lift = 1 / c, side = lift * s, rate = 9.81 * side / value.speed;
  function at(time: number) {
    const divisions = 256, dt = time / divisions; let right = 0, forward = 0;
    for (let index = 0; index <= divisions; index++) { const weight = index === 0 || index === divisions ? 1 : index % 2 ? 4 : 2, heading = rate * dt * index; right += weight * value.speed * Math.sin(heading); forward += weight * value.speed * Math.cos(heading); }
    return { x: right * dt / 3, y: forward * dt / 3, heading: rate * time };
  }
  return { lift, side, rate, radius: s === 0 ? null : value.speed ** 2 * c / (9.81 * Math.abs(s)), at };
}
const projected = (point: { x: number; y: number }) => ({ x: 300 + point.x * 1.92, y: 300 - point.y * 1.92 });
async function drawing(page: Page, key = 'current'): Promise<any> {
  return page.locator('[data-bank-condition="' + key + '"]').evaluate(condition => {
    const force = condition.querySelector('[data-bank-forces]')!, plan = condition.querySelector('[data-bank-plan]')!;
    const scalar = (node: any, key: string) => node[key].baseVal.value;
    const point = (node: any) => ({ x: scalar(node, 'cx'), y: scalar(node, 'cy') });
    const line = (node: any) => ({ a: { x: scalar(node, 'x1'), y: scalar(node, 'y1') }, b: { x: scalar(node, 'x2'), y: scalar(node, 'y2') }, markerEnd: node.getAttribute('marker-end') });
    const polyline = (node: SVGPolylineElement) => Array.from({ length: node.points.numberOfItems }, (_, index) => { const point = node.points.getItem(index); return { x: point.x, y: point.y }; });
    const wing = force.querySelector<SVGPathElement>('[data-bank-wing]')!, wingStart = wing.getPointAtLength(0), wingEnd = wing.getPointAtLength(wing.getTotalLength()), route = plan.querySelector<SVGPolylineElement>('[data-bank-route]')!, travel = plan.querySelector<SVGPolylineElement>('[data-bank-travel]')!;
    return { readings: Object.fromEntries([...condition.querySelectorAll('[data-bank-reading]')].map(node => [node.getAttribute('data-bank-reading'), node.textContent])),
      forces: Object.fromEntries([...force.querySelectorAll('[data-bank-force]')].map(node => [node.getAttribute('data-bank-force'), line(node)])),
      wing: { a: { x: wingStart.x, y: wingStart.y }, b: { x: wingEnd.x, y: wingEnd.y } },
      route: polyline(route), travel: polyline(travel), routeLength: route.getTotalLength(), travelLength: travel.getTotalLength(),
      probe: point(plan.querySelector('[data-bank-probe]')), heading: line(plan.querySelector('[data-bank-heading]')),
      time: point(plan.querySelector('[data-bank-handle-center="time"],[data-bank-frozen-time]')) };
  });
}
function drawingErrors(actual: any, value: Model, name = '') {
  const expected = oracle(value), errors: unknown[] = [];
  const near = (field: string, actual: number, target: number, tolerance = .00009) => { if (!Number.isFinite(actual) || Math.abs(actual - target) > tolerance) errors.push({ model: value, name, field, actual, target, tolerance }); };
  const point = (field: string, actual: any, target: { x: number; y: number }) => { if (!actual) { errors.push({ field, actual, target }); return; } near(field + '.x', actual.x, target.x); near(field + '.y', actual.y, target.y); };
  const position = expected.at(value.time), center = { x: 300, y: 300 };
  for (const [field, target] of [['lift', expected.lift], ['vertical', 1], ['side', expected.side], ['rate', expected.rate / rad], ['distance', value.speed * value.time], ['right', position.x], ['forward', position.y]] as const) near('reading.' + field, Number(actual.readings[field]), target, .00051);
  if (expected.radius === null) { if (actual.readings.radius !== 'Straight path') errors.push({ radius: actual.readings.radius }); }
  else near('reading.radius', Number(actual.readings.radius), expected.radius, .00051);
  for (const [id, end] of [['weight', { x: 300, y: 420 }], ['vertical', { x: 300, y: 180 }], ['side', { x: 300 + expected.side * 120, y: 300 }], ['lift', { x: 300 + expected.side * 120, y: 180 }]] as const) { point('force.' + id + '.a', actual.forces[id]?.a, center); point('force.' + id + '.b', actual.forces[id]?.b, end); }
  if (expected.side === 0 ? actual.forces.side.markerEnd !== null : !actual.forces.side.markerEnd) errors.push({ model: value, field: 'side force directional marker', actual: actual.forces.side.markerEnd, expected: expected.side === 0 ? null : 'a directional marker' });
  point('wing.a', actual.wing.a, { x: 300 - 130 * Math.cos(value.bank * rad), y: 300 - 130 * Math.sin(value.bank * rad) }); point('wing.b', actual.wing.b, { x: 300 + 130 * Math.cos(value.bank * rad), y: 300 + 130 * Math.sin(value.bank * rad) });
  if (actual.route.length !== 161 || actual.travel.length !== 81) errors.push({ lengths: [actual.route.length, actual.travel.length] });
  actual.route.forEach((item: any, index: number) => point('route.' + index, item, projected(expected.at(index * 4 / 160)))); actual.travel.forEach((item: any, index: number) => point('travel.' + index, item, projected(expected.at(index * value.time / 80))));
  const probe = projected(position); point('probe', actual.probe, probe); point('heading.a', actual.heading.a, probe); point('heading.b', actual.heading.b, { x: probe.x + 26 * Math.sin(position.heading), y: probe.y - 26 * Math.cos(position.heading) }); point('time', actual.time, { x: 90 + 105 * value.time, y: 650 });
  // Polyline length is a drawing approximation. At the tightest allowed turn,
  // 160 full-route chords differ by <0.006 drawing units; the 80 inspected
  // chords differ by <0.024 at the longest, tightest allowed inspection.
  near('native route length', actual.routeLength, value.speed * 4 * 1.92, .015); near('native inspected length', actual.travelLength, value.speed * value.time * 1.92, .025);
  for (const [index, item] of actual.route.entries()) if (item.x < 60 || item.x > 540 || item.y < 60 || item.y > 540) errors.push({ offscale: index, item });
  return errors;
}
async function labelErrors(page: Page) {
  return page.locator(root + ' svg').evaluateAll(nodes => {
    const errors: unknown[] = [];
    nodes.forEach((svg, diagram) => {
      const texts = [...svg.querySelectorAll<SVGTextElement>('text')].map(text => { const box = text.getBBox(), view = text.ownerSVGElement!.viewBox.baseVal, matrix = text.getScreenCTM()!; return { text: text.textContent, left: box.x, right: box.x + box.width, top: box.y, bottom: box.y + box.height, width: view.width, height: view.height, font: parseFloat(getComputedStyle(text).fontSize) * Math.hypot(matrix.a, matrix.b) }; });
      texts.forEach((text, index) => {
        if (text.left < -.1 || text.right > text.width + .1 || text.top < -.1 || text.bottom > text.height + .1 || text.font < 11) errors.push({ diagram, bound: text });
        texts.slice(index + 1).forEach(other => { const width = Math.min(text.right, other.right) - Math.max(text.left, other.left), height = Math.min(text.bottom, other.bottom) - Math.max(text.top, other.top); if (width > .25 && height > .25) errors.push({ diagram, first: text.text, second: other.text, width, height }); });
      });
    }); return errors;
  });
}
async function screen(page: Page, kind: string, value: number) {
  const handle = page.locator(current + ' [data-bank-handle="' + kind + '"]'); await handle.scrollIntoViewIfNeeded();
  return handle.evaluate((group, value) => { const svg = (group as SVGGElement).ownerSVGElement!, matrix = svg.getScreenCTM()!, circle = group.querySelector<SVGCircleElement>('[data-bank-handle-center]')!, point = svg.createSVGPoint(); point.x = circle.cx.baseVal.value; point.y = circle.cy.baseVal.value; const start = point.matrixTransform(matrix), kind = group.getAttribute('data-bank-handle'); point.x = kind === 'bank' ? 300 + 130 * Math.cos(value * Math.PI / 180) : 90 + 105 * value; point.y = kind === 'bank' ? 300 + 130 * Math.sin(value * Math.PI / 180) : 650; const end = point.matrixTransform(matrix); return { start: { x: start.x, y: start.y }, end: { x: end.x, y: end.y } }; }, value);
}
async function mouseDrag(page: Page, kind: string, value: number) { const points = await screen(page, kind, value); await page.mouse.move(points.start.x, points.start.y); await page.mouse.down(); await page.mouse.move(points.end.x, points.end.y, { steps: 8 }); await page.mouse.up(); await settle(page); }
async function touchDrag(page: Page, kind: string, value: number, cancel = false, second = false) {
  const points = await screen(page, kind, value), cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...points.start, id: 1 }] });
    if (second) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...points.start, id: 1 }, { x: points.start.x - 35, y: points.start.y + 10, id: 2 }] });
    for (let index = 1; index <= 5; index++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: points.start.x + (points.end.x - points.start.x) * index / 5, y: points.start.y + (points.end.y - points.start.y) * index / 5, id: 1 }, ...(second ? [{ x: points.start.x - 35, y: points.start.y + 10, id: 2 }] : [])] });
    await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
  } finally { await cdp.detach(); } await settle(page);
}

test('bank force balance and native path traces agree with independently integrated velocity through both directions, straight flight and all bounds', async ({ page }) => {
  await mount(page); const errors: unknown[] = [];
  for (const speed of [10, 12, 30]) for (const bank of [-60, -30, -1, 0, 1, 30, 60]) {
    const value = { ...initial, speed, bank, time: bank === -60 ? 0 : bank === 30 ? 1.35 : 4 }; await replace(page, value); errors.push(...drawingErrors(await drawing(page), value));
  }
  expect(errors).toEqual([]); await replace(page, initial); await mouseDrag(page, 'bank', -45); await expect(page.locator(current)).toHaveAttribute('data-bank-design', '12,-45'); await mouseDrag(page, 'time', 3.25); await expect(page.locator('#rh-bank-time')).toHaveValue('3.25'); expect(drawingErrors(await drawing(page), { ...initial, bank: -45, time: 3.25 })).toEqual([]); expect(await labelErrors(page)).toEqual([]);
});

test('full speed and bank pins, exact mirrored and double-speed turns, normalized host writes and bounded optional sweep preserve inspection and old theater', async ({ page }) => {
  await mount(page); await page.locator('[data-bank-pin]').click(); await range(page, 'time', 3.25); await range(page, 'speed', 20); await range(page, 'bank', -40);
  expect(drawingErrors(await drawing(page, 'pinned'), { ...initial, time: 3.25 })).toEqual([]); expect(drawingErrors(await drawing(page), { ...initial, speed: 20, bank: -40, time: 3.25 })).toEqual([]);
  for (const [kind, values] of [['mirror', [12, -30]], ['double', [24, 30]], ['level', [12, 0]], ['double', [24, 30]]] as const) {
    await page.locator('[data-bank-experiment="' + kind + '"]').click(); expect(await design(page)).toEqual(values); expect(await design(page, 'pinned')).toEqual([12, 30]); expect(drawingErrors(await drawing(page), { ...initial, speed: values[0], bank: values[1], time: 3.25 })).toEqual([]);
  }
  const stable = await drawing(page); await page.evaluate(() => (window as any).__ctx.setToolData((old: any) => ({ ...old, unrelatedRound24: 'kept', raptorHunt: { ...old.raptorHunt, unrelatedRound24: 'kept' } }))); expect(await drawing(page)).toEqual(stable); expect(await design(page, 'pinned')).toEqual([12, 30]); await expect(page.locator('.rh-air-title')).toHaveText('Airflow Theater'); await page.locator('[data-flight-mode-control]').nth(1).click(); expect(await drawing(page)).toEqual(stable);
  await page.locator('[data-bank-answer="assumption"]').click(); await expect(page.locator('.rh-bank-feedback')).toContainText('Correct.'); await page.locator('[data-bank-reset]').click(); expect(await design(page)).toEqual([12, 30]); expect(await design(page, 'pinned')).toEqual([12, 30]); await expect(page.locator('#rh-bank-time')).toHaveValue('3.25'); await expect(page.locator('.rh-bank-feedback')).toHaveCount(0);
  await range(page, 'speed', 15); await page.locator('[data-bank-pin]').click(); await expect(page.locator('[data-bank-experiment="double"]')).toBeEnabled(); await page.locator('[data-bank-experiment="double"]').click(); expect(await design(page)).toEqual([30, 30]); await range(page, 'speed', 15.5); await page.locator('[data-bank-pin]').click(); await expect(page.locator('[data-bank-experiment="double"]')).toBeDisabled();
  await replace(page, { version: 1, speed: Infinity, bank: '20', time: NaN }); expect(await design(page)).toEqual([12, 30]); await expect(page.locator('#rh-bank-time')).toHaveValue('2'); await replace(page, { version: 1, speed: -999, bank: 999, time: 999 }); expect(await design(page)).toEqual([10, 60]); await expect(page.locator('#rh-bank-time')).toHaveValue('4'); await replace(page, { version: 1, speed: 16.74, bank: -14.51, time: 1.374 }); expect(await design(page)).toEqual([16.5, -15]); await expect(page.locator('#rh-bank-time')).toHaveValue('1.35');
  await replace(page, { ...initial, version: 99 }); expect(await design(page)).toEqual([12, 30]); await page.locator('[data-bank-clear]').click(); await expect(page.locator('[data-bank-pin]')).toBeFocused(); await expect(page.locator('[data-bank-condition="pinned"]')).toHaveCount(0);
  await page.evaluate(() => { const sparse: any[] = Array(7); (sparse as any).version = 1; (window as any).__ctx.setToolData((old: any) => ({ ...old, raptorHunt: { ...old.raptorHunt, bankTurnStudy: sparse } })); }); expect(await design(page)).toEqual([12, 30]); await range(page, 'speed', 18); const saved = await page.evaluate(() => (window as any).__toolData.raptorHunt.bankTurnStudy); expect(saved).toEqual({ ...initial, speed: 18 }); const host = await page.evaluate(() => (window as any).__toolData); expect(host.raptorHunt.xp).toBe(0); expect(host.unrelatedRound24).toBe('kept'); expect(host.raptorHunt.unrelatedRound24).toBe('kept');
  await harness.destroy(page); await mount(page, saved); expect(await design(page)).toEqual([18, 30]); await expect(page.locator('[data-bank-condition="pinned"]')).toHaveCount(0);
  await page.locator('[data-bank-play]').click(); await expect(page.locator(root)).toHaveAttribute('data-bank-playing', 'false'); await expect(page.locator('#rh-bank-time')).toHaveValue('2');
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await range(page, 'time', 3.8); await page.locator('[data-bank-play]').click(); await expect(page.locator(root)).toHaveAttribute('data-bank-playing', 'false'); await expect(page.locator('#rh-bank-time')).toHaveValue('4');
  await page.locator('[data-bank-play]').click(); await expect(page.locator(root)).toHaveAttribute('data-bank-playing', 'true'); await range(page, 'bank', -20); await expect(page.locator(root)).toHaveAttribute('data-bank-playing', 'false'); const stopped = await page.locator('#rh-bank-time').inputValue(); await settle(page); await expect(page.locator('#rh-bank-time')).toHaveValue(stopped); await page.emulateMedia({ reducedMotion: 'reduce' });
  // Track only this workbench's named tick callback; ordinary harness/React
  // frames still run through the unchanged native scheduler. No clock, state,
  // or time advance is mocked, and actual host navigation unmounts the study.
  await page.evaluate(() => {
    const w = window as any, track = { raf: window.requestAnimationFrame.bind(window), cancel: window.cancelAnimationFrame.bind(window), pending: new Set<number>(), scheduled: 0, cancelled: 0, hidden: Object.getOwnPropertyDescriptor(document, 'hidden') }; w.__bankLifecycle = track;
    window.requestAnimationFrame = callback => { const owned = callback.name === 'tick', id = track.raf(time => { track.pending.delete(id); callback(time); }); if (owned) { track.pending.add(id); track.scheduled++; } return id; };
    window.cancelAnimationFrame = id => { if (track.pending.delete(id)) track.cancelled++; track.cancel(id); };
  });
  try {
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await range(page, 'time', .5); await page.locator('[data-bank-play]').click(); await expect(page.locator(root)).toHaveAttribute('data-bank-playing', 'true'); await expect.poll(() => page.evaluate(() => (window as any).__bankLifecycle.pending.size)).toBe(1);
    await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(page.locator(root)).toHaveAttribute('data-bank-playing', 'false'); await expect.poll(() => page.evaluate(() => (window as any).__bankLifecycle.pending.size)).toBe(0); const reducedStop = await page.locator('#rh-bank-time').inputValue(); await settle(page); await expect(page.locator('#rh-bank-time')).toHaveValue(reducedStop);
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await range(page, 'time', .5); await page.locator('[data-bank-play]').click(); await expect(page.locator(root)).toHaveAttribute('data-bank-playing', 'true');
    // Controlled visibility lifecycle event. This checks the handler without
    // claiming a headless browser tab or the operating system was hidden.
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await expect(page.locator(root)).toHaveAttribute('data-bank-playing', 'false'); await expect.poll(() => page.evaluate(() => (window as any).__bankLifecycle.pending.size)).toBe(0); const hiddenStop = await page.locator('#rh-bank-time').inputValue(); await settle(page); await expect(page.locator('#rh-bank-time')).toHaveValue(hiddenStop);
    await page.evaluate(() => { const track = (window as any).__bankLifecycle; if (track.hidden) Object.defineProperty(document, 'hidden', track.hidden); else delete (document as any).hidden; });
    await range(page, 'time', .5); await page.locator('[data-bank-play]').click(); await expect(page.locator(root)).toHaveAttribute('data-bank-playing', 'true'); await expect.poll(() => page.evaluate(() => (window as any).__bankLifecycle.pending.size)).toBe(1);
    await page.evaluate(() => (window as any).__ctx.setToolData((old: any) => ({ ...old, raptorHunt: { ...old.raptorHunt, activeSection: 'hub' } }))); await expect(page.locator(root)).toHaveCount(0); await expect.poll(() => page.evaluate(() => (window as any).__bankLifecycle.pending.size)).toBe(0); const scheduled = await page.evaluate(() => (window as any).__bankLifecycle.scheduled); await settle(page); expect(await page.evaluate(() => (window as any).__bankLifecycle.scheduled)).toBe(scheduled); expect(await page.evaluate(() => (window as any).__bankLifecycle.cancelled)).toBeGreaterThanOrEqual(3);
  } finally {
    await page.evaluate(() => { const w = window as any, track = w.__bankLifecycle; window.requestAnimationFrame = track.raf; window.cancelAnimationFrame = track.cancel; if (track.hidden) Object.defineProperty(document, 'hidden', track.hidden); else delete (document as any).hidden; delete w.__bankLifecycle; });
  }
});

async function lostCaptureHover(page: Page) {
  const before = await design(page), handle = page.locator(current + ' [data-bank-handle="bank"]'), points = await screen(page, 'bank', before[1] + 1);
  await handle.evaluate(node => { node.removeAttribute('data-bank-test-capture'); node.removeAttribute('data-bank-test-lost'); node.addEventListener('gotpointercapture', event => node.setAttribute('data-bank-test-capture', String((event as PointerEvent).pointerId)), { once: true }); node.addEventListener('lostpointercapture', event => node.setAttribute('data-bank-test-lost', String((event as PointerEvent).pointerId)), { once: true }); });
  await page.mouse.move(points.start.x, points.start.y); await page.mouse.down(); await page.mouse.move(points.start.x + .05, points.start.y); await expect(handle).toHaveAttribute('data-bank-test-capture', /^\d+$/); const pointer = Number(await handle.getAttribute('data-bank-test-capture')); await handle.evaluate((node, id) => (node as SVGGElement).releasePointerCapture(id), pointer); await page.mouse.move(points.start.x + .1, points.start.y); await expect(handle).toHaveAttribute('data-bank-test-lost', String(pointer)); await page.mouse.move(1, 1); await page.mouse.up(); await page.mouse.move(points.end.x, points.end.y); await settle(page); expect(await design(page)).toEqual(before);
}

test('real touch bank and time drags, secondary contact and capture guards, native keyboard and every label pair pass eight axe rules at three host widths', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await page.setViewportSize({ width: layout.viewport, height: 1000 }); await page.locator('#wrap').evaluate((node: HTMLElement, width) => { node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.setAttribute('data-stem-tool-shell', 'true'); }, layout.host); await replace(page, initial); if (await page.locator('[data-bank-condition="pinned"]').count()) await page.locator('[data-bank-clear]').click();
    await touchDrag(page, 'bank', -45); await expect(page.locator(current)).toHaveAttribute('data-bank-design', '12,-45'); await touchDrag(page, 'time', 3.25); await expect(page.locator('#rh-bank-time')).toHaveValue('3.25'); expect(drawingErrors(await drawing(page), { ...initial, bank: -45, time: 3.25 })).toEqual([]);
    await replace(page, initial); await touchDrag(page, 'bank', -40, false, true); expect(await design(page)).toEqual([12, 30]); await touchDrag(page, 'time', 3, false, true); await expect(page.locator('#rh-bank-time')).toHaveValue('2');
    await touchDrag(page, 'bank', -20, true); expect(await design(page)).toEqual([12, -20]); await page.mouse.move(1, 1); expect(await design(page)).toEqual([12, -20]); await lostCaptureHover(page);
    const bank = page.locator(current + ' [data-bank-handle="bank"]'); await bank.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(page.locator('#rh-bank-bank')).toHaveValue('-59'); await expect(bank).toBeFocused(); await page.keyboard.press('End'); await page.keyboard.press('ArrowLeft'); await expect(page.locator('#rh-bank-bank')).toHaveValue('59');
    const time = page.locator(current + ' [data-bank-handle="time"]'); await time.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(page.locator('#rh-bank-time')).toHaveValue('0.05'); await expect(time).toBeFocused(); await page.locator('#rh-bank-speed').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(page.locator('#rh-bank-speed')).toHaveValue('10.5');
    await replace(page, initial); const pin = page.locator('[data-bank-pin]'); await pin.focus(); await page.keyboard.press('Enter'); await expect(pin).toBeFocused(); await range(page, 'time', 3.25); const mirror = page.locator('[data-bank-experiment="mirror"]'); await mirror.focus(); await page.keyboard.press('Enter'); await expect(mirror).toBeFocused(); expect(await design(page)).toEqual([12, -30]); expect(await design(page, 'pinned')).toEqual([12, 30]); await page.locator('[data-bank-answer="assumption"]').tap(); await expect(page.locator('.rh-bank-feedback')).toContainText('Correct.');
    const sizeErrors = await page.locator(root + ' button,' + root + ' input,' + current + ' [data-bank-handle]').evaluateAll(nodes => nodes.flatMap(node => { const box = node.getBoundingClientRect(); return box.width < 44 || box.height < 44 ? [{ name: node.getAttribute('aria-label') || node.textContent, width: box.width, height: box.height }] : []; })); expect(sizeErrors).toEqual([]);
    const host = (await page.locator('#wrap').boundingBox())!, overflowErrors: unknown[] = []; for (const selector of [root, '.rh-bank-controls', '.rh-bank-comparison', current, '[data-bank-condition="pinned"]', '.rh-bank-evidence', '.rh-bank-model']) { const node = page.locator(selector), box = (await node.boundingBox())!, overflow = await node.evaluate(element => element.scrollWidth - element.clientWidth); if (box.x < host.x - 1 || box.x + box.width > host.x + host.width + 1 || overflow > 1) overflowErrors.push({ selector, box, host, overflow }); } expect(overflowErrors).toEqual([]); expect(await labelErrors(page)).toEqual([]);
    const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-raptor-bank-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } })).violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) }))); expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});
