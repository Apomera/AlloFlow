import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', hasTouch: true, trace: { mode: 'retain-on-failure', screenshots: false, snapshots: true } });
test.describe.configure({ timeout: 240_000, retries: 0 });
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js', width: 1100, height: 1000,
  layout: 'document', appStyles: true, extraScripts: ['node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type Model = { version: number; latA: number; lonA: number; latB: number; lonB: number; selected: string; fraction: number; view: number };
const initial: Model = { version: 1, latA: 45, lonA: -60, latB: 30, lonB: 60, selected: 'B', fraction: 50, view: 0 };
const root = '[data-raptor-geodesic-study]', current = '[data-geodesic-condition="current"]', rad = Math.PI / 180;
const wrap = (value: number) => ((value + 180) % 360 + 360) % 360 - 180;
async function mount(page: Page, geodesicStudy?: any) {
  await page.setViewportSize({ width: 1280, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { raptorHunt: { activeSection: 'migration', geodesicStudy, xp: 0 } }, undefined, { expectCanvas: false });
  await expect(page.locator(root)).toBeVisible();
}
async function replace(page: Page, model: any) {
  await page.evaluate(value => (window as any).__ctx.setToolData((old: any) => ({ ...old, raptorHunt: { ...old.raptorHunt, geodesicStudy: value } })), model);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function range(page: Page, key: string, value: number) {
  await page.locator('#rh-geodesic-' + key).evaluate((node: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(node, String(next));
    node.dispatchEvent(new Event('input', { bubbles: true })); node.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-geodesic-' + key)).toHaveValue(String(value === 180 && (key === 'view' || key.startsWith('lon')) ? -180 : value));
}
async function coords(page: Page, key = 'current') { return (await page.locator('[data-geodesic-condition="' + key + '"]').getAttribute('data-geodesic-coordinates'))!.split(',').map(Number); }
function physical(model: Model) { return [model.latA, model.lonA, model.latB, model.lonB]; }

// Independent spherical navigation: Haversine central angle and a destination
// from the initial compass bearing. Production uses cross/dot atan2 and a
// tangent basis in Cartesian coordinates. No production helper is imported.
function oracle(model: Model) {
  const p = model.latA * rad, q = model.latB * rad, delta = (model.lonB - model.lonA) * rad;
  const haversine = Math.sin((q - p) / 2) ** 2 + Math.cos(p) * Math.cos(q) * Math.sin(delta / 2) ** 2;
  const angle = 2 * Math.atan2(Math.sqrt(Math.max(0, haversine)), Math.sqrt(Math.max(0, 1 - haversine)));
  const antipodal = Math.abs(model.latA + model.latB) < 1e-9 && Math.abs(Math.abs(wrap(model.lonB - model.lonA)) - 180) < 1e-9;
  const coincident = model.latA === model.latB && wrap(model.lonB - model.lonA) === 0;
  const bearing = Math.atan2(Math.sin(delta) * Math.cos(q), Math.cos(p) * Math.sin(q) - Math.sin(p) * Math.cos(q) * Math.cos(delta));
  function at(fraction: number) {
    if (antipodal) return null;
    if (coincident || fraction === 0) return { lat: model.latA, lon: wrap(model.lonA) };
    if (fraction === 1) return { lat: model.latB, lon: wrap(model.lonB) };
    const step = angle * fraction;
    const lat = Math.asin(Math.max(-1, Math.min(1, Math.sin(p) * Math.cos(step) + Math.cos(p) * Math.sin(step) * Math.cos(bearing)))) / rad;
    const lon = model.lonA + Math.atan2(Math.sin(bearing) * Math.sin(step) * Math.cos(p), Math.cos(step) - Math.sin(p) * Math.sin(lat * rad)) / rad;
    return { lat, lon: Math.abs(Math.abs(wrap(lon)) - 180) < 1e-8 ? -180 : wrap(lon) };
  }
  const points = antipodal ? [] : Array.from({ length: 121 }, (_, index) => at(index / 120)!);
  const project = (point: { lat: number; lon: number }) => {
    const lat = point.lat * rad, lon = (point.lon - model.view) * rad, tilt = 20 * rad;
    return { x: 360 + 190 * Math.cos(lat) * Math.sin(lon), y: 242 - 190 * (Math.sin(lat) * Math.cos(tilt) - Math.cos(lat) * Math.cos(lon) * Math.sin(tilt)), depth: Math.sin(lat) * Math.sin(tilt) + Math.cos(lat) * Math.cos(lon) * Math.cos(tilt) };
  };
  const map = (point: { lat: number; lon: number }) => ({ x: 50 + (point.lon + 180) * 620 / 360, y: 70 + (90 - point.lat) * 310 / 180 });
  const groups: { x: number; y: number }[][] = []; let group: { x: number; y: number }[] = [];
  for (const point of points) {
    if (Math.abs(Math.abs(point.lat) - 90) < 1e-6) { if (group.length > 1) groups.push(group); group = []; continue; }
    const mapped = map(point);
    if (group.length && Math.abs(mapped.x - group[group.length - 1].x) > 310) { if (group.length > 1) groups.push(group); group = []; }
    group.push(mapped);
  }
  if (group.length > 1) groups.push(group);
  return { angle: antipodal ? Math.PI : coincident ? 0 : angle, antipodal, coincident, at, points, project, map, groups };
}
async function drawing(page: Page, key = 'current'): Promise<any> {
  return page.locator('[data-geodesic-condition="' + key + '"]').evaluate(condition => {
    const globe = condition.querySelector('[data-geodesic-globe]')!, map = condition.querySelector('[data-geodesic-map]')!, section = condition.querySelector('[data-geodesic-section]')!;
    const scalar = (node: any, key: string) => node[key].baseVal.value;
    const circle = (node: any) => node ? { x: scalar(node, 'cx'), y: scalar(node, 'cy') } : null;
    const endpoints = (parent: Element) => ['A', 'B'].map(id => { const path = parent.querySelector<SVGPathElement>('[data-geodesic-glyph="' + id + '"]')!, point = path.getPointAtLength(0); return { x: point.x, y: point.y + (id === 'A' ? 13 : 14) }; });
    const points = (node: SVGPolylineElement) => Array.from({ length: node.points.numberOfItems }, (_, index) => { const point = node.points.getItem(index); return { x: point.x, y: point.y }; });
    const arc = section.querySelector<SVGPolylineElement>('[data-geodesic-section-arc]'), chord = section.querySelector<SVGLineElement>('[data-geodesic-chord]')!;
    return { kind: condition.getAttribute('data-geodesic-kind'), readings: Object.fromEntries([...condition.querySelectorAll('[data-geodesic-reading]')].map(node => [node.getAttribute('data-geodesic-reading'), node.textContent])),
      globe: { endpoints: endpoints(globe), probe: circle(globe.querySelector('[data-geodesic-globe-probe]')), segments: [...globe.querySelectorAll<SVGLineElement>('[data-geodesic-globe-segment]')].map(node => ({ id: Number(node.getAttribute('data-geodesic-globe-segment')), a: { x: scalar(node, 'x1'), y: scalar(node, 'y1') }, b: { x: scalar(node, 'x2'), y: scalar(node, 'y2') }, back: node.getAttribute('data-geodesic-back') === 'true', dash: node.getAttribute('stroke-dasharray'), opacity: Number(node.getAttribute('opacity')) })).sort((a, b) => a.id - b.id) },
      map: { endpoints: endpoints(map), probe: circle(map.querySelector('[data-geodesic-map-probe]')), groups: [...map.querySelectorAll<SVGPolylineElement>('[data-geodesic-map-arc]')].map(points) },
      section: { a: { x: scalar(chord, 'x1'), y: scalar(chord, 'y1') }, b: { x: scalar(chord, 'x2'), y: scalar(chord, 'y2') }, arc: arc ? points(arc) : null, arcLength: arc ? arc.getTotalLength() : null, chordLength: chord.getTotalLength(), probe: circle(section.querySelector('[data-geodesic-section-probe]')) } };
  });
}
function assertDrawing(actual: any, model: Model) {
  const expected = oracle(model), errors: unknown[] = [];
  function near(name: string, value: number, target: number, tolerance = .0003) { if (!Number.isFinite(value) || Math.abs(value - target) > tolerance) errors.push({ name, actual: value, expected: target, tolerance }); }
  function point(name: string, value: any, target: any) { if (!value || !target) { if (value !== target) errors.push({ name, actual: value, expected: target }); return; } near(name + '.x', value.x, target.x); near(name + '.y', value.y, target.y); }
  const expectedKind = expected.antipodal ? 'antipodal' : expected.coincident ? 'coincident' : 'unique';
  if (actual.kind !== expectedKind) errors.push({ kind: actual.kind, expectedKind });
  near('angle', parseFloat(actual.readings.angle), expected.angle / rad, .00006); near('surface length', Number(actual.readings.arc), expected.angle, .00006); near('chord', Number(actual.readings.chord), 2 * Math.sin(expected.angle / 2), .00006);
  for (const [index, id] of ['A', 'B'].entries()) {
    const position = { lat: model[('lat' + id) as keyof Model] as number, lon: model[('lon' + id) as keyof Model] as number };
    point('globe endpoint ' + id, actual.globe.endpoints[index], expected.project(position)); point('map endpoint ' + id, actual.map.endpoints[index], expected.map(position));
  }
  if (actual.globe.segments.length !== (expected.antipodal ? 0 : 120)) errors.push({ segments: actual.globe.segments.length });
  actual.globe.segments.forEach((segment: any, index: number) => {
    const a = expected.project(expected.points[index]), b = expected.project(expected.points[index + 1]); point('globe segment ' + index + ' A', segment.a, a); point('globe segment ' + index + ' B', segment.b, b);
    const back = a.depth + b.depth < 0; if (segment.back !== back || back && !segment.dash || !back && segment.dash) errors.push({ segment: index, back, actual: segment });
  });
  if (actual.map.groups.length !== expected.groups.length) errors.push({ mapGroups: actual.map.groups.length, expected: expected.groups.length });
  actual.map.groups.forEach((group: any[], index: number) => { const target = expected.groups[index]; if (!target || target.length !== group.length) { errors.push({ mapGroup: index, length: group.length, expected: target?.length }); return; } group.forEach((item, number) => point('map group ' + index + ':' + number, item, target[number])); });
  const half = expected.angle / 2, pa = { x: 360 - 116 * Math.sin(half), y: 179 - 116 * Math.cos(half) }, pb = { x: 360 + 116 * Math.sin(half), y: pa.y };
  point('section A', actual.section.a, pa); point('section B', actual.section.b, pb); near('native chord length', actual.section.chordLength, 232 * Math.sin(half));
  const probe = expected.at(model.fraction / 100);
  if (expected.antipodal) {
    for (const [name, value] of [['globe', actual.globe.probe], ['map', actual.map.probe], ['section', actual.section.probe], ['section arc', actual.section.arc], ['section arc length', actual.section.arcLength]]) if (value !== null) errors.push({ antipodal: name, value });
    if (actual.readings.travel !== 'No unique arc' || actual.readings.latitude !== 'Undefined' || actual.readings.longitude !== 'Undefined') errors.push({ antipodalReadings: actual.readings });
  } else {
    point('globe probe', actual.globe.probe, expected.project(probe!)); point('map probe', actual.map.probe, Math.abs(Math.abs(probe!.lat) - 90) < 1e-6 ? null : expected.map(probe!));
    const theta = (model.fraction / 100 - .5) * expected.angle; point('section probe', actual.section.probe, { x: 360 + 116 * Math.sin(theta), y: 179 - 116 * Math.cos(theta) });
    near('native surface polyline length', actual.section.arcLength, 116 * expected.angle, .03); near('arc inspector reading', Number(actual.readings.travel), expected.angle * model.fraction / 100, .00006); near('inspected latitude', parseFloat(actual.readings.latitude), probe!.lat, .00006);
    if (Math.abs(Math.abs(probe!.lat) - 90) < 1e-6) { if (actual.readings.longitude !== 'Undefined at pole') errors.push({ polarLongitude: actual.readings.longitude }); }
    else near('inspected longitude', parseFloat(actual.readings.longitude), wrap(probe!.lon), .00006);
  }
  expect(errors).toEqual([]);
}
async function labelErrors(page: Page, minimumFont = 11) {
  return page.locator(root + ' svg').evaluateAll((nodes, minimum) => {
    const errors: unknown[] = [];
    nodes.forEach((svg, diagram) => {
      const texts = [...svg.querySelectorAll<SVGTextElement>('text')].map(text => { const box = text.getBBox(), view = text.ownerSVGElement!.viewBox.baseVal, matrix = text.getScreenCTM()!; return { text: text.textContent, left: box.x, right: box.x + box.width, top: box.y, bottom: box.y + box.height, width: view.width, height: view.height, font: parseFloat(getComputedStyle(text).fontSize) * Math.hypot(matrix.a, matrix.b) }; });
      texts.forEach((text, index) => {
        if (text.left < -.1 || text.right > text.width + .1 || text.top < -.1 || text.bottom > text.height + .1 || text.font < minimum) errors.push({ diagram, bound: text });
        texts.slice(index + 1).forEach(other => { const width = Math.min(text.right, other.right) - Math.max(text.left, other.left), height = Math.min(text.bottom, other.bottom) - Math.max(text.top, other.top); if (width > .25 && height > .25) errors.push({ diagram, first: text.text, second: other.text, width, height }); });
      });
    }); return errors;
  }, minimumFont);
}
async function endpointScreen(page: Page, id: string, lat: number, lon: number) {
  const node = page.locator(current + ' [data-geodesic-map-endpoint="' + id + '"]'); await node.scrollIntoViewIfNeeded();
  return node.evaluate((group, target) => { const svg = (group as SVGGElement).ownerSVGElement!, matrix = svg.getScreenCTM()!, point = svg.createSVGPoint(), path = group.querySelector<SVGPathElement>('[data-geodesic-glyph]')!, first = path.getPointAtLength(0); point.x = first.x; point.y = first.y + (target.id === 'A' ? 13 : 14); const start = point.matrixTransform(matrix); point.x = 50 + (target.lon + 180) * 620 / 360; point.y = 70 + (90 - target.lat) * 310 / 180; const end = point.matrixTransform(matrix); return { start: { x: start.x, y: start.y }, end: { x: end.x, y: end.y } }; }, { id, lat, lon });
}
async function touchDrag(page: Page, id: string, lat: number, lon: number, cancel = false, second = false) {
  const points = await endpointScreen(page, id, lat, lon), cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...points.start, id: 1 }] });
    if (second) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...points.start, id: 1 }, { x: points.start.x + 40, y: points.start.y + 15, id: 2 }] });
    for (let index = 1; index <= 5; index++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: points.start.x + (points.end.x - points.start.x) * index / 5, y: points.start.y + (points.end.y - points.start.y) * index / 5, id: 1 }, ...(second ? [{ x: points.start.x + 40, y: points.start.y + 15, id: 2 }] : [])] });
    await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
  } finally { await cdp.detach(); }
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

test('native spherical arcs and chords agree with independent Haversine navigation through the seam, polar inspector, coincident and antipodal boundaries', async ({ page }) => {
  await mount(page);
  const designs = [initial, { ...initial, latA: 0, lonA: 0, latB: 0, lonB: 90 }, { ...initial, latA: 55, lonA: 170, latB: 55, lonB: -170 }, { ...initial, latA: 25, lonA: 20, latB: 25, lonB: 21 }, { ...initial, latA: 20, lonA: 0, latB: -20, lonB: 179 }, { ...initial, latA: 35, lonA: -45, latB: -35, lonB: 135 }, { ...initial, latA: 7, lonA: -180, latB: 7, lonB: -180 }, { ...initial, latA: 75, lonA: -90, latB: 75, lonB: 90 }, { ...initial, latA: -75, lonA: -180, latB: 75, lonB: 0 }, { ...initial, latA: -75, lonA: -175, latB: 75, lonB: 10 }];
  for (const design of designs) for (const fraction of [0, 25, 50, 100]) {
    const model = { ...design, fraction, view: fraction === 25 ? -160 : fraction === 100 ? 150 : 0 }; await replace(page, model); await expect(page.locator(current)).toHaveAttribute('data-geodesic-coordinates', physical(model).join(',')); assertDrawing(await drawing(page), model);
  }
  await replace(page, { ...initial, latA: 35, lonA: -45, latB: -35, lonB: 135 }); await expect(page.locator(current + ' [data-geodesic-boundary]')).toContainText('Infinitely many semicircles');
  const model = { ...initial, latA: 0, lonA: -60, latB: 30, lonB: 60 }; await replace(page, model); const points = await endpointScreen(page, 'A', 55, -120); await page.mouse.move(points.start.x, points.start.y); await page.mouse.down(); await page.mouse.move(points.end.x, points.end.y, { steps: 8 }); await page.mouse.up(); await expect(page.locator(current)).toHaveAttribute('data-geodesic-coordinates', '55,-120,30,60'); assertDrawing(await drawing(page), { ...model, latA: 55, lonA: -120, selected: 'A' });
  // The selected A hit target must remain reachable under B's overlapping
  // target, including exact coincidence. This is a real native mouse drag.
  for (const endpointB of [{ latB: 20, lonB: 10 }, { latB: 21, lonB: 12 }]) {
    const overlapping = { ...initial, latA: 20, lonA: 10, ...endpointB }; await replace(page, overlapping); await page.locator('[data-geodesic-select="A"]').click();
    const target = await endpointScreen(page, 'A', 35, -30); await page.mouse.move(target.start.x, target.start.y); await page.mouse.down(); await page.mouse.move(target.end.x, target.end.y, { steps: 8 }); await page.mouse.up();
    await expect(page.locator(current)).toHaveAttribute('data-geodesic-coordinates', [35, -30, endpointB.latB, endpointB.lonB].join(',')); assertDrawing(await drawing(page), { ...overlapping, latA: 35, lonA: -30, selected: 'A' });
  }
  expect(await labelErrors(page)).toEqual([]);
});

test('full endpoint pins, exact sphere symmetries and normalized host writes preserve shared inspection and old migration references without progress awards', async ({ page }) => {
  await mount(page); const pin = page.locator('[data-geodesic-pin]'); await pin.click(); await range(page, 'fraction', 35); await range(page, 'view', 30); await range(page, 'latB', -20); await range(page, 'lonB', 150);
  const shared = { ...initial, fraction: 35, view: 30 }; assertDrawing(await drawing(page, 'pinned'), shared); assertDrawing(await drawing(page), { ...shared, latB: -20, lonB: 150 });
  for (const [kind, physicalValues] of [['rotate', [45, -30, 30, 90]], ['reflect', [-45, -60, -30, 60]], ['swap', [30, 60, 45, -60]]] as const) {
    await page.locator('[data-geodesic-experiment="' + kind + '"]').click(); expect(await coords(page)).toEqual(physicalValues); expect(await coords(page, 'pinned')).toEqual(physical(initial)); const [latA, lonA, latB, lonB] = physicalValues; assertDrawing(await drawing(page), { ...shared, latA, lonA, latB, lonB });
  }
  await page.locator('[data-geodesic-select="A"]').click(); await page.locator('[data-geodesic-experiment="rotate"]').click(); await expect(page.locator('[data-geodesic-select="A"]')).toHaveAttribute('aria-pressed', 'true');
  const stable = await drawing(page); await page.evaluate(() => (window as any).__ctx.setToolData((old: any) => ({ ...old, unrelatedRound23: 'kept', raptorHunt: { ...old.raptorHunt, unrelatedRound23: 'kept' } }))); expect(await drawing(page)).toEqual(stable); expect(await coords(page, 'pinned')).toEqual(physical(initial));
  await expect(page.getByText('🧭 Migration: 5 Million Birds, 5 Major Flyways', { exact: true })).toBeVisible(); await page.getByText('🧭 Migration: 5 Million Birds, 5 Major Flyways', { exact: true }).scrollIntoViewIfNeeded(); expect(await drawing(page)).toEqual(stable);
  await page.locator('[data-geodesic-answer="geometry"]').click(); await expect(page.locator('.rh-geodesic-feedback')).toContainText('Correct.'); await page.locator('[data-geodesic-reset]').click(); expect(await coords(page)).toEqual(physical(initial)); expect(await coords(page, 'pinned')).toEqual(physical(initial)); await expect(page.locator('#rh-geodesic-fraction')).toHaveValue('35'); await expect(page.locator('#rh-geodesic-view')).toHaveValue('30'); await expect(page.locator('.rh-geodesic-feedback')).toHaveCount(0);
  await replace(page, { version: 1, latA: Infinity, lonA: '10', latB: -999, lonB: 180, selected: 'bad', fraction: NaN, view: 999 }); expect(await coords(page)).toEqual([45, -60, -75, -180]); await expect(page.locator('#rh-geodesic-fraction')).toHaveValue('50'); await expect(page.locator('#rh-geodesic-view')).toHaveValue('-180'); await expect(page.locator('[data-geodesic-select="B"]')).toHaveAttribute('aria-pressed', 'true');
  await replace(page, { version: 1, latA: 14.49, lonA: 14.51, latB: -14.51, lonB: -14.49, selected: 'A', fraction: -1, view: -999 }); expect(await coords(page)).toEqual([14, 15, -15, -14]); await expect(page.locator('#rh-geodesic-fraction')).toHaveValue('0'); await expect(page.locator('#rh-geodesic-view')).toHaveValue('-180');
  await page.locator('[data-geodesic-clear]').click(); await expect(pin).toBeFocused(); await expect(page.locator('[data-geodesic-condition="pinned"]')).toHaveCount(0);
  await page.evaluate(() => { const sparse: any[] = Array(8); (sparse as any).version = 1; (window as any).__ctx.setToolData((old: any) => ({ ...old, raptorHunt: { ...old.raptorHunt, geodesicStudy: sparse } })); }); await expect(page.locator(current)).toHaveAttribute('data-geodesic-coordinates', physical(initial).join(','));
  await range(page, 'latB', 12); const saved = await page.evaluate(() => (window as any).__toolData.raptorHunt.geodesicStudy); expect(saved).toEqual({ ...initial, latB: 12 }); const host = await page.evaluate(() => (window as any).__toolData); expect(host.raptorHunt.xp).toBe(0); expect(host.unrelatedRound23).toBe('kept'); expect(host.raptorHunt.unrelatedRound23).toBe('kept');
  await harness.destroy(page); await mount(page, saved); expect(await coords(page)).toEqual([45, -60, 12, 60]); await expect(page.locator('[data-geodesic-condition="pinned"]')).toHaveCount(0); await replace(page, { ...initial, version: 99, latA: 0 }); expect(await coords(page)).toEqual(physical(initial));
});

async function lostCaptureHover(page: Page) {
  const before = await coords(page), endpoint = page.locator(current + ' [data-geodesic-map-endpoint="B"]');
  const points = await endpointScreen(page, 'B', before[2], wrap(before[3] + 5));
  await endpoint.evaluate(node => { node.removeAttribute('data-geodesic-test-capture'); node.removeAttribute('data-geodesic-test-lost'); node.addEventListener('gotpointercapture', event => node.setAttribute('data-geodesic-test-capture', String((event as PointerEvent).pointerId)), { once: true }); node.addEventListener('lostpointercapture', event => node.setAttribute('data-geodesic-test-lost', String((event as PointerEvent).pointerId)), { once: true }); });
  await page.mouse.move(points.start.x, points.start.y); await page.mouse.down(); await page.mouse.move(points.start.x + .05, points.start.y); await expect(endpoint).toHaveAttribute('data-geodesic-test-capture', /^\d+$/); const pointer = Number(await endpoint.getAttribute('data-geodesic-test-capture'));
  await endpoint.evaluate((node, id) => (node as SVGGElement).releasePointerCapture(id), pointer); await page.mouse.move(points.start.x + .1, points.start.y); await expect(endpoint).toHaveAttribute('data-geodesic-test-lost', String(pointer));
  await page.mouse.move(1, 1); await page.mouse.up(); await page.mouse.move(points.end.x, points.end.y); await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); expect(await coords(page)).toEqual(before);
}

test('actual touch endpoint drags, seam wrapping, two-contact and cancel guards, native keys and readable fixed labels pass eight axe rules at three host widths', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await page.setViewportSize({ width: layout.viewport, height: 1000 }); await page.locator('#wrap').evaluate((node: HTMLElement, width) => { node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.setAttribute('data-stem-tool-shell', 'true'); }, layout.host); await replace(page, initial);
    if (await page.locator('[data-geodesic-condition="pinned"]').count()) await page.locator('[data-geodesic-clear]').click();
    await touchDrag(page, 'B', -45, 120); await expect(page.locator(current)).toHaveAttribute('data-geodesic-coordinates', '45,-60,-45,120'); assertDrawing(await drawing(page), { ...initial, latB: -45, lonB: 120 });
    await touchDrag(page, 'B', 90, 180); await expect(page.locator(current)).toHaveAttribute('data-geodesic-coordinates', '45,-60,75,-180');
    await replace(page, initial); await touchDrag(page, 'B', -30, 120, false, true); expect(await coords(page)).toEqual(physical(initial));
    await touchDrag(page, 'B', 0, 90, true); await expect(page.locator(current)).toHaveAttribute('data-geodesic-coordinates', '45,-60,0,90'); const cancelled = await coords(page); await page.mouse.move(1, 1); expect(await coords(page)).toEqual(cancelled);
    const endpoint = page.locator(current + ' [data-geodesic-map-endpoint="B"]'); await endpoint.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowUp'); await expect(page.locator(current)).toHaveAttribute('data-geodesic-coordinates', '45,-60,5,5'); await expect(endpoint).toBeFocused(); await page.keyboard.press('Enter'); await expect(endpoint).toBeFocused();
    await page.locator('#rh-geodesic-latB').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(page.locator('#rh-geodesic-latB')).toHaveValue('-74'); await expect(page.locator('#rh-geodesic-latB')).toBeFocused();
    await replace(page, initial); await lostCaptureHover(page); const pin = page.locator('[data-geodesic-pin]'); await pin.focus(); await page.keyboard.press('Enter'); await expect(pin).toBeFocused(); await range(page, 'fraction', 35); const rotate = page.locator('[data-geodesic-experiment="rotate"]'); await rotate.focus(); await page.keyboard.press('Enter'); await expect(rotate).toBeFocused(); expect(await coords(page)).toEqual([45, -30, 30, 90]); expect(await coords(page, 'pinned')).toEqual(physical(initial));
    for (const button of ['[data-geodesic-select="A"]', '[data-geodesic-select="B"]', '[data-geodesic-answer="geometry"]']) { const target = page.locator(button); await target.tap(); const box = (await target.boundingBox())!; expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44); }
    for (const handle of await page.locator(current + ' [data-geodesic-map-endpoint]').all()) { const box = (await handle.boundingBox())!; expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44); }
    await expect(page.locator('.rh-geodesic-feedback')).toContainText('Correct.');
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of [root, '.rh-geodesic-controls', '.rh-geodesic-comparison', current, '[data-geodesic-condition="pinned"]', '.rh-geodesic-evidence', '.rh-geodesic-model']) { const node = page.locator(selector), box = (await node.boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width).toBeLessThanOrEqual(host.x + host.width + 1); expect(await node.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1); }
    expect(await labelErrors(page)).toEqual([]);
    const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-raptor-geodesic-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } })).violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) }))); expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});
