import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', hasTouch: true });
test.describe.configure({ retries: 0, timeout: 180_000 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type Model = { level: number; bench: number; width: number };
type Point = { value: number[]; error: number[] };
const defaults: Model = { level: .5, bench: 1, width: 4 }, root = '[data-birdlab-tide-study]';
const near = (actual: number, expected: number, bound = 0) => expect(Math.abs(actual - expected)).toBeLessThan(Math.max(1e-5, bound + 1e-8));
const pointNear = (actual: Point, expected: number[]) => { for (let axis = 0; axis < 2; axis++) near(actual.value[axis], expected[axis], actual.error[axis]); };
async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((node: HTMLElement, width) => { node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.setAttribute('data-stem-tool-shell', 'true'); }, host);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'shorebirds', blXp: 0, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100); await expect(page.locator(root)).toBeVisible();
}
async function physical(page: Page, id = 'current'): Promise<Model> {
  return page.locator('[data-tide-condition="' + id + '"]').evaluate(node => Object.fromEntries(['level', 'bench', 'width'].map(name => [name, Number(node.getAttribute('data-tide-' + name))])) as Model);
}
async function settings(page: Page, model: Model) {
  for (const [name, value] of Object.entries(model)) await page.locator('#birdlab-tide-' + name).fill(String(value));
  await expect.poll(() => physical(page)).toEqual(model);
}
// Independent segment clipping/integration: no production height-case branches.
function oracle(model: Model, probe: number) {
  const vertices = [[0, -2], [(10 - model.width) / 2, model.bench], [(10 + model.width) / 2, model.bench], [10, 4]];
  let wet = 0, dry = 0, at = 0, waterArea = 0, height = NaN; const contacts: number[] = [];
  for (let i = 0; i < 3; i++) {
    const [a, b] = [vertices[i], vertices[i + 1]], dx = b[0] - a[0], dz = b[1] - a[1];
    if (probe >= a[0] && probe <= b[0]) height = a[1] + dz * (probe - a[0]) / dx;
    if (!dz) {
      if (a[1] === model.level) { at += dx; contacts.push(a[0], b[0]); }
      else if (a[1] < model.level) { wet += dx; waterArea += dx * (model.level - a[1]); }
      else dry += dx;
    } else {
      const fraction = Math.max(0, Math.min(1, (model.level - a[1]) / dz)), covered = dx * fraction;
      wet += covered; dry += dx - covered;
      waterArea += covered * ((model.level - a[1]) + Math.max(0, model.level - b[1])) / 2;
      if (model.level >= a[1] && model.level <= b[1]) contacts.push(a[0] + dx * (model.level - a[1]) / dz);
    }
  }
  const gap = model.level - height;
  return { vertices, wet, dry, at, waterArea, height, depth: Math.max(0, gap), clearance: Math.max(0, -gap), contact: contacts.length ? [Math.min(...contacts), Math.max(...contacts)] : null, state: Math.abs(gap) < 1e-9 ? 'At water level' : gap > 0 ? 'Below water level' : 'Above water level' };
}
async function drawing(page: Page, id = 'current'): Promise<any> {
  return page.locator('[data-tide-condition="' + id + '"]').evaluate((element, name) => {
    const section = element.querySelector('[data-tide-section]') as SVGSVGElement, strip = element.querySelector('[data-tide-strip]') as SVGSVGElement;
    const inputError = (native: number, source: number) => Math.abs(native - source) + 4 * Number.EPSILON * Math.max(1, Math.abs(source));
    const relative = (node: SVGGraphicsElement, svg: SVGSVGElement) => svg.getScreenCTM()!.inverse().multiply(node.getScreenCTM()!);
    function point(node: SVGGraphicsElement, svg: SVGSVGElement, x: number, y: number, ex: number, ey: number): Point {
      const m = relative(node, svg), p = new DOMPoint(x, y).matrixTransform(m);
      return { value: [p.x, p.y], error: [Math.abs(m.a) * ex + Math.abs(m.c) * ey, Math.abs(m.b) * ex + Math.abs(m.d) * ey] };
    }
    function length(node: SVGGraphicsElement, attr: string) { const native = (node as any)[attr].baseVal.value; return { native, error: inputError(native, Number(node.getAttribute(attr))) }; }
    function anchors(node: SVGPolygonElement | SVGPolylineElement | null, svg: SVGSVGElement) {
      if (!node) return null;
      const raw = node.getAttribute('points')!.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)!.map(Number);
      return Array.from({ length: node.points.numberOfItems }, (_, i) => { const p = node.points.getItem(i); return point(node, svg, p.x, p.y, inputError(p.x, raw[2 * i]), inputError(p.y, raw[2 * i + 1])); });
    }
    function line(node: SVGLineElement | null, svg: SVGSVGElement) {
      if (!node) return null;
      return [1, 2].map(i => { const x = length(node, 'x' + i), y = length(node, 'y' + i); return point(node, svg, x.native, y.native, x.error, y.error); });
    }
    function circle(node: SVGCircleElement | null, svg: SVGSVGElement) {
      if (!node) return null; const x = length(node, 'cx'), y = length(node, 'cy'); return point(node, svg, x.native, y.native, x.error, y.error);
    }
    function band(kind: string) {
      const node = strip.querySelector('[data-tide-band="' + name + ':' + kind + '"]') as SVGRectElement, x = length(node, 'x'), y = length(node, 'y'), width = length(node, 'width'), height = length(node, 'height');
      return { start: point(node, strip, x.native, y.native, x.error, y.error), end: point(node, strip, x.native + width.native, y.native + height.native, x.error + width.error, y.error + height.error), width: width.native, widthError: width.error };
    }
    const contact = section.querySelector('[data-tide-contact]');
    return { views: [section.getAttribute('viewBox'), strip.getAttribute('viewBox')], profile: anchors(section.querySelector('[data-tide-profile]'), section), water: anchors(section.querySelector('[data-tide-water]'), section), drySurface: anchors(section.querySelector('[data-tide-dry-surface]'), section),
      surface: line(section.querySelector('[data-tide-water-surface]'), section), guide: line(section.querySelector('[data-tide-level-guide]'), section), gap: line(section.querySelector('[data-tide-gap]'), section), probeLine: line(section.querySelector('[data-tide-probe-line]'), section), probe: circle(section.querySelector('[data-tide-probe-point]'), section),
      contact: contact ? { line: line(contact.querySelector('line'), section), points: Array.from(contact.querySelectorAll('circle')).map(node => circle(node as SVGCircleElement, section)) } : null,
      stripProbe: line(strip.querySelector('[data-tide-strip-probe]'), strip), bands: Object.fromEntries(['wet', 'at', 'dry'].map(kind => [kind, band(kind)])),
      grips: name === 'current' ? Object.fromEntries(['level', 'probe'].map(kind => [kind, circle(section.querySelector('[data-tide-grip="' + kind + '"]'), section)])) : null,
      readings: Object.fromEntries(['wet', 'at', 'dry', 'height', 'depth', 'clearance', 'state'].map(kind => [kind, element.querySelector('[data-tide-value="' + name + ':' + kind + '"]')!.textContent!])) };
  }, id);
}
function physicalPoint(point: Point): Point { return { value: [(point.value[0] - 80) / 50, (360 - point.value[1]) / 50], error: point.error.map(n => n / 50) }; }
function groundHeight(vertices: number[][], x: number) {
  x = Math.max(0, Math.min(10, x));
  const i = Math.max(0, Math.min(2, vertices.findIndex((v, index) => index > 0 && x <= v[0]) - 1)), a = vertices[i], b = vertices[i + 1];
  return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
}
function polygonArea(points: Point[]) {
  let signed = 0, error = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length], [x, z] = a.value, [u, v] = b.value, [ex, ez] = a.error, [eu, ev] = b.error;
    signed += x * v - z * u; error += Math.abs(x) * ev + Math.abs(v) * ex + ex * ev + Math.abs(z) * eu + Math.abs(u) * ez + ez * eu;
  }
  return { value: Math.abs(signed) / 2, error: error / 2 };
}
function verify(d: any, model: Model, probe: number) {
  const expected = oracle(model, probe); expect(d.views).toEqual(['0 0 700 650', '0 0 700 250']);
  expect(d.profile).toHaveLength(4); for (let i = 0; i < 4; i++) pointNear(physicalPoint(d.profile[i]), expected.vertices[i]);
  pointNear(physicalPoint(d.probe), [probe, expected.height]); pointNear(physicalPoint(d.gap[0]), [probe, model.level]); pointNear(physicalPoint(d.gap[1]), [probe, expected.height]);
  pointNear(d.probeLine[0], [80 + 50 * probe, 110]); pointNear(d.probeLine[1], [80 + 50 * probe, 570]);
  pointNear(d.stripProbe[0], [80 + 50 * probe, 65]); pointNear(d.stripProbe[1], [80 + 50 * probe, 174]);
  pointNear(physicalPoint(d.guide[0]), [0, model.level]); pointNear(physicalPoint(d.guide[1]), [11.4, model.level]);
  pointNear(physicalPoint(d.surface[0]), [0, model.level]); pointNear(physicalPoint(d.surface[1]), [expected.wet, model.level]);
  if (d.grips) { pointNear(d.grips.level, [650, 360 - 50 * model.level]); pointNear(d.grips.probe, [80 + 50 * probe, 590]); }
  let position = 0;
  for (const kind of ['wet', 'at', 'dry'] as const) {
    const band = d.bands[kind]; near(band.width / 50, expected[kind], band.widthError / 50); pointNear(band.start, [80 + 50 * position, 78]); position += expected[kind]; pointNear(band.end, [80 + 50 * position, 164]); near(parseFloat(d.readings[kind]), band.width / 50, .00501);
  }
  near(position, 10); near(['wet', 'at', 'dry'].reduce((sum, kind) => sum + d.bands[kind].width / 50, 0), 10, ['wet', 'at', 'dry'].reduce((sum, kind) => sum + d.bands[kind].widthError / 50, 0));
  if (expected.contact) {
    expect(d.contact).not.toBeNull(); pointNear(physicalPoint(d.contact.line[0]), [expected.contact[0], model.level]); pointNear(physicalPoint(d.contact.line[1]), [expected.contact[1], model.level]);
    expect(d.contact.points).toHaveLength(expected.contact[0] === expected.contact[1] ? 1 : 2);
    pointNear(physicalPoint(d.contact.points[0]), [expected.contact[0], model.level]); if (d.contact.points.length === 2) pointNear(physicalPoint(d.contact.points[1]), [expected.contact[1], model.level]);
  } else expect(d.contact).toBeNull();
  if (model.level <= -2) expect(d.water).toBeNull(); else {
    const water = d.water.map(physicalPoint) as Point[], area = polygonArea(water); near(area.value, expected.waterArea, area.error);
    pointNear(water[0], [0, model.level]); pointNear(water[1], [expected.wet, model.level]);
    for (let i = 2; i < water.length; i++) { const point = water[i]; expect(point.value[0]).toBeGreaterThanOrEqual(-point.error[0] - 1e-8); expect(point.value[0]).toBeLessThanOrEqual(expected.wet + point.error[0] + 1e-8); near(point.value[1], groundHeight(expected.vertices, point.value[0]), point.error[1] + 3 * point.error[0]); expect(point.value[0]).toBeLessThanOrEqual(water[i - 1].value[0] + point.error[0] + water[i - 1].error[0] + 1e-8); }
    pointNear(water[water.length - 1], [0, -2]);
  }
  if (expected.dry === 0) expect(d.drySurface).toBeNull(); else {
    const dry = d.drySurface.map(physicalPoint) as Point[]; pointNear(dry[0], [10 - expected.dry, groundHeight(expected.vertices, 10 - expected.dry)]); pointNear(dry[dry.length - 1], [10, 4]);
    for (const point of dry) near(point.value[1], groundHeight(expected.vertices, point.value[0]), point.error[1] + 3 * point.error[0]);
  }
  for (const kind of ['height', 'depth', 'clearance'] as const) near(parseFloat(d.readings[kind]), expected[kind], .00501);
  expect(d.readings.state).toBe(expected.state);
}
async function check(page: Page, model: Model, probe: number, id = 'current') {
  // Wait for native rendered coordinates, not just React data attributes.
  await expect.poll(async () => { const d = await drawing(page, id), expected = oracle(model, probe), point = physicalPoint(d.probe); return Math.abs(point.value[0] - probe) < 1e-4 && Math.abs(point.value[1] - expected.height) < 1e-4 && Math.abs(d.bands.wet.width / 50 - expected.wet) < 1e-4; }).toBe(true);
  verify(await drawing(page, id), model, probe);
}
async function dragTo(page: Page, kind: 'level' | 'probe', value: number) {
  const svg = page.locator('[data-tide-section="current"]'); await svg.scrollIntoViewIfNeeded();
  const points = await svg.evaluate((node, desired) => { const svg = node as SVGSVGElement, grip = svg.querySelector('[data-tide-grip="' + desired.kind + '"]') as SVGCircleElement, start = new DOMPoint(grip.cx.baseVal.value, grip.cy.baseVal.value).matrixTransform(svg.getScreenCTM()!), end = new DOMPoint(desired.kind === 'level' ? 650 : 80 + 50 * desired.value, desired.kind === 'level' ? 360 - 50 * desired.value : 590).matrixTransform(svg.getScreenCTM()!); return { start: [start.x, start.y], end: [end.x, end.y] }; }, { kind, value });
  await page.mouse.move(points.start[0], points.start[1]); await page.mouse.down(); await page.mouse.move(points.end[0], points.end[1], { steps: 5 }); await page.mouse.up();
}
async function touchDragTo(page: Page, kind: 'level' | 'probe', value: number) {
  const svg = page.locator('[data-tide-section="current"]'); await svg.scrollIntoViewIfNeeded();
  const points = await svg.evaluate((node, desired) => { const svg = node as SVGSVGElement, grip = svg.querySelector('[data-tide-grip="' + desired.kind + '"]') as SVGCircleElement, matrix = svg.getScreenCTM()!, start = new DOMPoint(grip.cx.baseVal.value, grip.cy.baseVal.value).matrixTransform(matrix), end = new DOMPoint(desired.kind === 'level' ? 650 : 80 + 50 * desired.value, desired.kind === 'level' ? 360 - 50 * desired.value : 590).matrixTransform(matrix); return { start: { x: start.x, y: start.y }, end: { x: end.x, y: end.y } }; }, { kind, value });
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...points.start, id: 1 }] });
    for (let step = 1; step <= 5; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: points.start.x + (points.end.x - points.start.x) * step / 5, y: points.start.y + (points.end.y - points.start.y) * step / 5, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally { await cdp.detach(); }
}

test('native clipped water area, profile intersections and plan bands distinguish slopes, a full at-level terrace and complete exposure bounds with direct drag', async ({ page }) => {
  await mount(page); await check(page, defaults, 5);
  const cases = [{ bench: -1, width: 2, levels: [-2.5, -2, -1.25, -1, -.75, 4, 4.5] }, { bench: 3, width: 6, levels: [-2.5, -2, 2.75, 3, 3.25, 4, 4.5] }, { bench: .25, width: 3.5, levels: [-1.75, .25, .5] }];
  for (const state of cases) for (const level of state.levels) {
    const model = { level, bench: state.bench, width: state.width }; await settings(page, model);
    for (const probe of [0, 1.25, 5, 8.75, 10]) { await page.locator('#birdlab-tide-probe').fill(String(probe)); await check(page, model, probe); }
  }
  await settings(page, defaults); await page.locator('#birdlab-tide-probe').fill('5'); await check(page, defaults, 5);
  await dragTo(page, 'level', 1); await expect.poll(() => physical(page)).toEqual({ ...defaults, level: 1 }); await check(page, { ...defaults, level: 1 }, 5);
  await dragTo(page, 'probe', 4.25); await expect(page.locator('#birdlab-tide-probe')).toHaveValue('4.25'); await check(page, { ...defaults, level: 1 }, 4.25);
  await dragTo(page, 'level', 5.25); await expect.poll(() => physical(page)).toEqual({ ...defaults, level: 4.5 }); await check(page, { ...defaults, level: 4.5 }, 4.25);
  await dragTo(page, 'level', -3.5); await expect.poll(() => physical(page)).toEqual({ ...defaults, level: -2.5 }); await check(page, { ...defaults, level: -2.5 }, 4.25);
  await dragTo(page, 'probe', 12); await expect(page.locator('#birdlab-tide-probe')).toHaveValue('10'); await check(page, { ...defaults, level: -2.5 }, 10); await expect(page.locator('[data-tide-nudge="right"]')).toBeDisabled();
  await expect(page.locator('svg[viewBox="0 0 130 116"]')).toHaveCount(1); await expect(page.getByRole('button', { name: 'Sanderling', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('complete pinned beach and level, exact experiments and shared probe survive species and host writes without progress awards', async ({ page }) => {
  await mount(page); const progress = await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab));
  const frozen = { level: 1.25, bench: 1, width: 2.5 }; await settings(page, frozen); await page.locator('[data-tide-pin]').click(); await page.locator('#birdlab-tide-probe').fill('7.75');
  await settings(page, { level: 3.5, bench: -.5, width: 5.5 });
  for (const [kind, expected] of [['lower', { ...frozen, level: .75 }], ['raise', { ...frozen, bench: 1.5 }], ['widen', { ...frozen, width: 5 }]] as const) {
    await page.locator('[data-tide-experiment="' + kind + '"]').click(); expect(await physical(page)).toEqual(expected); expect(await physical(page, 'pinned')).toEqual(frozen); await expect(page.locator('#birdlab-tide-probe')).toHaveValue('7.75'); await check(page, expected, 7.75); await check(page, frozen, 7.75, 'pinned');
  }
  await page.getByRole('button', { name: 'Sanderling', exact: true }).click(); await expect(page.getByRole('heading', { name: '🦴 Sanderling', exact: true })).toBeVisible(); expect(await physical(page)).toEqual({ ...frozen, width: 5 }); expect(await physical(page, 'pinned')).toEqual(frozen);
  await page.evaluate(() => (window as any).__ctx.update('birdLab', 'blXp', 17)); await expect.poll(() => page.evaluate(() => (window as any).__toolData.birdLab.blXp)).toBe(17); await check(page, { ...frozen, width: 5 }, 7.75); await check(page, frozen, 7.75, 'pinned');
  await page.locator('[data-tide-preset="match"]').click(); await check(page, { ...frozen, width: 5, level: frozen.bench }, 7.75); expect(await physical(page, 'pinned')).toEqual(frozen);
  for (const [kind, level] of [['lower', -2.5], ['upper', 4.5]] as const) { await page.locator('[data-tide-preset="' + kind + '"]').click(); await check(page, { ...frozen, width: 5, level }, 7.75); }
  await settings(page, { level: -2.25, bench: 2.75, width: 3.5 }); await page.locator('[data-tide-pin]').click(); for (const kind of ['lower', 'raise', 'widen']) await expect(page.locator('[data-tide-experiment="' + kind + '"]')).toBeDisabled();
  await page.locator('[data-tide-answer="same"]').click(); await expect(page.locator('.birdlab-tide-feedback')).toContainText('Beach shape matters'); await page.locator('[data-tide-answer="shape"]').click(); await expect(page.locator('.birdlab-tide-feedback')).toContainText('Exposure alone does not establish food');
  await page.locator('[data-tide-reset]').click(); expect(await physical(page)).toEqual(defaults); expect(await physical(page, 'pinned')).toEqual({ level: -2.25, bench: 2.75, width: 3.5 }); await expect(page.locator('#birdlab-tide-probe')).toHaveValue('7.75'); await expect(page.locator('.birdlab-tide-feedback')).toHaveCount(0); await check(page, defaults, 7.75);
  await page.locator('[data-tide-clear]').click(); await expect(page.locator('#birdlab-tide-probe')).toBeFocused(); await expect(page.locator('[data-tide-condition="pinned"]')).toHaveCount(0); await expect(page.locator('[data-tide-clear]')).toBeDisabled();
  expect(await page.evaluate(() => JSON.stringify({ ...(window as any).__toolData.birdLab, blXp: 0 }))).toBe(progress); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('native handles, touch controls and both conditions keep readable disjoint labels at plateau and extreme levels across three hosts and eight accessibility rules', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); await page.locator('[data-tide-reset]').click(); await page.locator('#birdlab-tide-probe').fill('5'); await page.locator('[data-tide-pin]').click();
    const level = page.locator('#birdlab-tide-level'); await level.focus(); await page.keyboard.press('ArrowRight'); await expect(level).toBeFocused(); await expect(level).toHaveValue('0.75');
    const waterHandle = page.locator('[data-tide-handle="level"]'); await waterHandle.focus(); await page.keyboard.press('ArrowUp'); await expect(waterHandle).toBeFocused(); await check(page, { ...defaults, level: 1 }, 5);
    const probeHandle = page.locator('[data-tide-handle="probe"]'); await probeHandle.focus(); await page.keyboard.press('ArrowRight'); await expect(probeHandle).toBeFocused(); await check(page, { ...defaults, level: 1 }, 5.25);
    await page.locator('[data-tide-nudge="left"]').tap(); await check(page, { ...defaults, level: 1 }, 5);
    const experiment = page.locator('[data-tide-experiment="lower"]'); await experiment.focus(); await page.keyboard.press('Enter'); await expect(experiment).toBeFocused(); await check(page, { ...defaults, level: 0 }, 5); await check(page, defaults, 5, 'pinned');
    await touchDragTo(page, 'level', 2.25); await expect(level).toHaveValue('2.25'); await check(page, { ...defaults, level: 2.25 }, 5); await check(page, defaults, 5, 'pinned');
    await touchDragTo(page, 'probe', 7.75); await expect(page.locator('#birdlab-tide-probe')).toHaveValue('7.75'); await check(page, { ...defaults, level: 2.25 }, 7.75); await check(page, defaults, 7.75, 'pinned');
    for (const value of [-2.5, 1, 4.5]) {
      await level.fill(String(value)); await page.locator('#birdlab-tide-probe').fill(value < 0 ? '0' : '10'); await check(page, { ...defaults, level: value }, value < 0 ? 0 : 10);
      const labels = await page.locator(root + ' svg').evaluateAll(nodes => nodes.map(node => { const svg = node as SVGSVGElement; return { name: svg.getAttribute('data-tide-section') || svg.getAttribute('data-tide-strip'), section: svg.hasAttribute('data-tide-section'), labels: Array.from(svg.querySelectorAll('text')).map(node => { const text = node as SVGTextElement, b = text.getBBox(), m = text.getScreenCTM()!; return { text: text.textContent!, left: b.x, top: b.y, right: b.x + b.width, bottom: b.y + b.height, width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height, font: parseFloat(getComputedStyle(text).fontSize) * Math.hypot(m.a, m.b) }; }) }; }));
      for (const diagram of labels) {
        expect(diagram.labels).toHaveLength(diagram.section ? 13 : 8);
        for (const label of diagram.labels) { expect(label.left, label.text).toBeGreaterThanOrEqual(0); expect(label.top, label.text).toBeGreaterThanOrEqual(0); expect(label.right, label.text).toBeLessThanOrEqual(label.width); expect(label.bottom, label.text).toBeLessThanOrEqual(label.height); expect(label.font, label.text).toBeGreaterThanOrEqual(11); }
        for (let i = 0; i < diagram.labels.length; i++) for (let j = i + 1; j < diagram.labels.length; j++) { const a = diagram.labels[i], b = diagram.labels[j]; expect(Math.min(a.right, b.right) <= Math.max(a.left, b.left) || Math.min(a.bottom, b.bottom) <= Math.max(a.top, b.top), diagram.name + ': ' + a.text + ' / ' + b.text).toBe(true); }
      }
    }
    await waterHandle.focus(); await page.keyboard.press('Home'); await expect(level).toHaveValue('-2.5'); await page.keyboard.press('End'); await expect(level).toHaveValue('4.5'); await expect(waterHandle).toBeFocused();
    await probeHandle.focus(); await page.keyboard.press('Home'); await expect(page.locator('#birdlab-tide-probe')).toHaveValue('0'); await expect(page.locator('[data-tide-nudge="left"]')).toBeDisabled(); await page.keyboard.press('End'); await expect(page.locator('#birdlab-tide-probe')).toHaveValue('10'); await expect(page.locator('[data-tide-nudge="right"]')).toBeDisabled();
    const answer = page.locator('[data-tide-answer="shape"]'); await answer.focus(); await page.keyboard.press('Enter'); await expect(answer).toBeFocused();
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of [root, '.birdlab-tide-controls', '[data-tide-condition="current"]', '[data-tide-condition="pinned"]', '.birdlab-tide-notes']) { const node = page.locator(selector), box = (await node.boundingBox())!; expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1); expect(await node.evaluate(n => n.scrollWidth - n.clientWidth), selector).toBeLessThanOrEqual(1); }
    for (const kind of ['section', 'strip']) { const widths = await page.locator('[data-tide-' + kind + ']').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().width)); near(widths[0], widths[1], 1); }
    for (const selector of ['[data-tide-nudge]', '[data-tide-hit]']) for (const node of await page.locator(selector).all()) { const box = (await node.boundingBox())!; expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44); }
    const violations = await page.evaluate(async () => { const result = await (window as any).axe.run(document.querySelector('[data-birdlab-tide-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } }); return result.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })); });
    expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1); await page.locator('[data-tide-clear]').click(); await expect(page.locator('#birdlab-tide-probe')).toBeFocused();
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
