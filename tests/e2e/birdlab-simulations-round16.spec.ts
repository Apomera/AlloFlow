import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ mode: 'default', retries: 0, timeout: 180_000 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => { await harness.destroy(page); });

type Model = { threshold: number; active: boolean[] };
const points = [[8, 50], [26, 20], [26, 50], [26, 80], [46, 12], [46, 38], [46, 64], [46, 90], [68, 25], [68, 52], [68, 79], [92, 50]];
const letters = 'ABCDEFGHIJKL', root = '[data-birdlab-connectivity-study]';
const condition = (key = 'current') => '[data-connect-condition="' + key + '"]';
const defaults = (): Model => ({ threshold: 30, active: points.map(() => true) });
async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((element: HTMLElement, width) => {
    element.style.width = width + 'px'; element.style.maxWidth = '100%'; element.setAttribute('data-stem-tool-shell', 'true');
  }, host);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'habitatsDeep', blXp: 0, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100); await expect(page.locator(root)).toBeVisible();
}
async function settings(page: Page, state: Model) {
  await page.locator('#birdlab-connect-threshold').fill(String(state.threshold));
  for (let index = 1; index < 11; index++) await page.locator('#birdlab-connect-patch-' + letters[index]).setChecked(state.active[index]);
}
// Independent all-pairs dynamic programming, rather than the runtime's
// single-source greedy algorithm. No chosen route is assumed when ties exist.
function oracle(state: Model) {
  const pairs: { a: number; b: number; length: number; allowed: boolean }[] = [];
  const distances = points.map((_, i) => points.map((__, j) => i === j ? 0 : Infinity));
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) {
    const length = Math.hypot(points[j][0] - points[i][0], points[j][1] - points[i][1]);
    const allowed = state.active[i] && state.active[j] && length <= state.threshold;
    pairs.push({ a: i, b: j, length, allowed }); if (allowed) distances[i][j] = distances[j][i] = length;
  }
  for (let k = 0; k < 12; k++) for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) distances[i][j] = Math.min(distances[i][j], distances[i][k] + distances[k][j]);
  return { pairs, distance: distances[0][11], reachable: distances[0].map(Number.isFinite) };
}
function near(actual: number, expected: number, tolerance = 1e-4) { expect(Math.abs(actual - expected)).toBeLessThan(tolerance); }
const x = (index: number) => 70 + points[index][0] * 5;
const y = (index: number) => 70 + points[index][1] * 5;
async function physical(page: Page, key = 'current') {
  return page.locator(condition(key)).evaluate(element => ({ threshold: element.getAttribute('data-connect-threshold'), active: element.getAttribute('data-connect-active'),
    reached: element.getAttribute('data-connect-reachable'), route: element.getAttribute('data-connect-route'), distance: element.getAttribute('data-connect-distance'),
    edges: [...element.querySelectorAll('[data-connect-edge]')].map(line => [line.getAttribute('data-connect-edge'), line.getAttribute('data-connect-length'), line.getAttribute('data-connect-feasible')]),
    legs: [...element.querySelectorAll('[data-connect-leg]')].map(node => [node.getAttribute('data-connect-leg'), node.getAttribute('data-connect-cumulative')]) }));
}
async function checkNative(page: Page, state: Model, key = 'current', inspect = 2, links = true) {
  const expected = oracle(state), snapshot = await physical(page, key), target = page.locator(condition(key));
  expect(snapshot.threshold).toBe(String(state.threshold)); expect(snapshot.active).toBe(state.active.map(value => value ? '1' : '0').join(''));
  expect(snapshot.reached).toBe(expected.reachable.map(value => value ? '1' : '0').join('')); expect(snapshot.edges).toHaveLength(66);
  const route = (snapshot.route || '').split('').map(letter => letters.indexOf(letter));
  if (!Number.isFinite(expected.distance)) { expect(route).toEqual([]); expect(snapshot.distance).toBe('none'); }
  else {
    expect(route[0]).toBe(0); expect(route[route.length - 1]).toBe(11); expect(new Set(route).size).toBe(route.length);
    let length = 0;
    for (let i = 1; i < route.length; i++) {
      const pair = expected.pairs.find(pair => pair.a === Math.min(route[i - 1], route[i]) && pair.b === Math.max(route[i - 1], route[i]))!;
      expect(pair.allowed).toBe(true); length += pair.length;
      expect(snapshot.legs[i - 1][0]).toBe(letters[route[i - 1]] + letters[route[i]]); near(Number(snapshot.legs[i - 1][1]), length, 1e-8);
    }
    near(length, expected.distance, 1e-8); near(Number(snapshot.distance), expected.distance, 1e-8);
    await expect(target.locator('[data-connect-reading="distance"]')).toHaveText(expected.distance.toFixed(2) + ' units');
  }
  const native = await target.evaluate(element => {
    const svg = element.querySelector('svg') as SVGSVGElement, radius = element.querySelector('[data-connect-radius]') as SVGCircleElement;
    function line(node: Element) { const l = node as SVGLineElement; return { name: l.getAttribute('data-connect-edge') || l.getAttribute('data-connect-route-edge'),
      endpoints: [l.x1.baseVal.value, l.y1.baseVal.value, l.x2.baseVal.value, l.y2.baseVal.value], stroke: getComputedStyle(l).stroke,
      feasible: l.getAttribute('data-connect-feasible'), length: l.getAttribute('data-connect-length') }; }
    return { viewBox: svg.getAttribute('viewBox'), edges: [...element.querySelectorAll('[data-connect-edge]')].map(line), route: [...element.querySelectorAll('[data-connect-route-edge]')].map(line),
      centers: [...element.querySelectorAll('[data-connect-center]')].map(node => { const circle = node as SVGCircleElement; return [circle.cx.baseVal.value, circle.cy.baseVal.value]; }),
      radius: [radius.cx.baseVal.value, radius.cy.baseVal.value, radius.r.baseVal.value],
      neighbors: element.querySelector('[data-connect-inspector]')!.getAttribute('data-connect-neighbors') };
  });
  expect(native.viewBox).toBe('0 0 640 640'); expect(native.centers).toHaveLength(12);
  for (let index = 0; index < 12; index++) { near(native.centers[index][0], x(index)); near(native.centers[index][1], y(index)); }
  // Both axes map one authored unit to precisely five SVG units.
  near((native.centers[2][0] - native.centers[0][0]) / 18, 5); near((native.centers[2][1] - native.centers[1][1]) / 30, 5);
  for (let index = 0; index < 66; index++) {
    const pair = expected.pairs[index], edge = native.edges[index];
    expect(edge.name).toBe(letters[pair.a] + letters[pair.b]); near(Number(edge.length), pair.length, 1e-10); expect(edge.feasible).toBe(String(pair.allowed));
    [x(pair.a), y(pair.a), x(pair.b), y(pair.b)].forEach((value, coordinate) => near(edge.endpoints[coordinate], value));
  }
  expect(native.route).toHaveLength(Math.max(0, route.length - 1));
  for (let index = 0; index < native.route.length; index++) [x(route[index]), y(route[index]), x(route[index + 1]), y(route[index + 1])].forEach((value, coordinate) => near(native.route[index].endpoints[coordinate], value));
  [x(inspect), y(inspect), state.threshold * 5].forEach((value, index) => near(native.radius[index], value));
  const neighbors = expected.pairs.filter(pair => pair.allowed && (pair.a === inspect || pair.b === inspect)).map(pair => pair.a === inspect ? pair.b : pair.a).sort((a, b) => a - b);
  expect(native.neighbors).toBe(neighbors.map(index => letters[index]).join(''));
  await expect(target.locator('[data-connect-reading="reachable"]')).toHaveText(expected.reachable.filter(Boolean).length + ' / ' + state.active.filter(Boolean).length);
  await expect(target.locator('[data-connect-reading="hops"]')).toHaveText(route.length ? String(route.length - 1) : '—');
  // Shared application CSS can briefly transition SVG geometry/stroke. Poll
  // native geometry and paint against the same exact independent expectations;
  // serialized attributes alone do not establish the browser's painted state.
  await expect.poll(async () => target.evaluate((element, input) => {
    const failures: string[] = [];
    function inspectLine(line: SVGLineElement, a: number[], b: number[], painted: boolean, name: string) {
      const css = getComputedStyle(line);
      // Chromium can reject geometry queries on an unpainted SVG line. Its
      // native endpoint attributes are checked above for all 66 links; only
      // currently painted links have a rendered length and stroke to probe.
      if (!painted) { if (css.stroke !== 'none') failures.push(name + ': unwanted paint'); return; }
      if (css.stroke === 'none') { failures.push(name + ': waiting for paint'); return; }
      const length = line.getTotalLength(), start = line.getPointAtLength(0), end = line.getPointAtLength(length);
      if (Math.abs(start.x - a[0]) > .001 || Math.abs(start.y - a[1]) > .001 || Math.abs(end.x - b[0]) > .001 || Math.abs(end.y - b[1]) > .001) failures.push(name + ': native endpoints');
      if (Math.abs(length - Math.hypot(b[0] - a[0], b[1] - a[1])) > .001) failures.push(name + ': native length');
      if (!line.isPointInStroke(new DOMPoint((a[0] + b[0]) / 2, (a[1] + b[1]) / 2))) failures.push(name + ': paint');
    }
    input.pairs.forEach(pair => { const name = input.letters[pair.a] + input.letters[pair.b], line = element.querySelector('[data-connect-edge="' + name + '"]') as SVGLineElement;
      inspectLine(line, [70 + 5 * input.points[pair.a][0], 70 + 5 * input.points[pair.a][1]], [70 + 5 * input.points[pair.b][0], 70 + 5 * input.points[pair.b][1]], pair.allowed && input.links, name); });
    input.route.slice(1).forEach((index, step) => { const prior = input.route[step], name = input.letters[prior] + input.letters[index];
      inspectLine(element.querySelector('[data-connect-route-edge="' + name + '"]') as SVGLineElement, [70 + 5 * input.points[prior][0], 70 + 5 * input.points[prior][1]], [70 + 5 * input.points[index][0], 70 + 5 * input.points[index][1]], true, 'route:' + name); });
    const radius = element.querySelector('[data-connect-radius]') as SVGCircleElement, point = radius.getPointAtLength(0);
    if (Math.abs(point.x - (70 + 5 * input.points[input.inspect][0] + input.threshold * 5)) > .001 || Math.abs(point.y - (70 + 5 * input.points[input.inspect][1])) > .001) failures.push('native radius');
    return failures;
  }, { pairs: expected.pairs, points, letters, route, links, inspect, threshold: state.threshold }), { timeout: 2000, intervals: [16, 32, 64, 128] }).toEqual([]);
  return { expected, snapshot };
}

test('all 66 native links, equal axes, reachable components and geometric shortest routes agree with independent all-pairs distances', async ({ page }) => {
  await mount(page); const progress = await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab));
  const states: Model[] = [5, 18, 25, 26, 27, 30, 36, 52, 70].map(threshold => ({ ...defaults(), threshold }));
  for (const threshold of [30, 36, 70]) { const state = defaults(); state.threshold = threshold; state.active[2] = false; states.push(state); }
  const chain = defaults(); chain.active = points.map((_, index) => [0, 2, 6, 9, 11].includes(index)); states.push(chain);
  for (const state of states) { await settings(page, state); await checkNative(page, state); }
  await settings(page, { ...defaults(), threshold: 18 });
  await expect(page.locator(condition() + ' [data-connect-edge="AC"]')).toHaveAttribute('data-connect-feasible', 'true');
  await expect(page.locator(condition() + ' [data-connect-edge="BC"]')).toHaveAttribute('data-connect-feasible', 'false');
  await settings(page, defaults()); await page.locator('#birdlab-connect-inspect').selectOption('0'); await checkNative(page, defaults(), 'current', 0);
  await page.locator('#birdlab-connect-links').uncheck(); await checkNative(page, defaults(), 'current', 0, false);
  await expect(page.locator('[data-connect-link-details] tbody tr')).toHaveCount(66);
  await expect(page.locator('.birdlab-connect-model')).toContainText('arbitrary model-distance units');
  await expect(page.locator('.birdlab-connect-model')).toContainText('not represent habitat corridors');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab))).toBe(progress);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('pins retain the complete graph, single-factor actions start from the pin, and inspection, habitat browsing and host writes preserve physical state', async ({ page }) => {
  await mount(page); const progress = await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab));
  const original = defaults(); await page.locator('[data-connect-pin]').click(); const frozen = await physical(page, 'pinned');
  await expect(page.locator('[data-connect-experiment="restore-c"]')).toBeDisabled();
  const removed = defaults(); removed.active[2] = false;
  await page.locator('[data-connect-experiment="remove-c"]').click(); await checkNative(page, removed);
  expect((await physical(page)).route).toBe(''); expect(await physical(page, 'pinned')).toEqual(frozen);
  await page.locator('[data-connect-experiment="longer"]').click(); await checkNative(page, { ...original, threshold: 36 });
  await expect(page.locator('#birdlab-connect-patch-C')).toBeChecked(); // starts from the pin, not the previous removal
  await page.locator('[data-connect-experiment="shorter"]').click(); await checkNative(page, { ...original, threshold: 24 });
  await settings(page, removed); await page.locator('[data-connect-pin]').click(); const disconnectedPin = await physical(page, 'pinned');
  await expect(page.locator('[data-connect-experiment="remove-c"]')).toBeDisabled(); await expect(page.locator('[data-connect-experiment="restore-c"]')).toBeEnabled();
  await page.locator('[data-connect-experiment="longer"]').click(); const restoredRoute = { ...removed, threshold: 36 }; await checkNative(page, restoredRoute);
  await page.locator('#birdlab-connect-inspect').selectOption('11'); await page.locator('#birdlab-connect-links').uncheck();
  await checkNative(page, restoredRoute, 'current', 11, false); await checkNative(page, removed, 'pinned', 11, false);
  expect(await physical(page, 'pinned')).toEqual(disconnectedPin);
  await page.locator('[data-connect-experiment="restore-c"]').click(); await checkNative(page, defaults(), 'current', 11, false);
  await page.locator('[data-connect-answer="context"]').click(); await expect(page.locator('.birdlab-connect-feedback')).toContainText('Yes.');
  await page.locator('[data-connect-reset]').click(); await checkNative(page, defaults(), 'current', 11, false);
  await expect(page.locator('.birdlab-connect-feedback')).toHaveCount(0); await expect(page.locator('#birdlab-connect-inspect')).toHaveValue('11');
  expect(await physical(page, 'pinned')).toEqual(disconnectedPin); await expect(page.locator('[data-habitat-button]')).toHaveCount(12);
  await page.locator('[data-habitat-button="4"]').click(); const current = await physical(page); expect(await physical(page, 'pinned')).toEqual(disconnectedPin);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab))).toBe(progress);
  await page.evaluate(() => (window as any).__ctx.update('birdLab', 'blXp', 17));
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.birdLab.blXp)).toBe(17);
  expect(await physical(page)).toEqual(current); expect(await physical(page, 'pinned')).toEqual(disconnectedPin); await expect(page.locator('#birdlab-connect-inspect')).toHaveValue('11');
  await settings(page, { ...defaults(), threshold: 70 }); await page.locator('[data-connect-pin]').click(); await expect(page.locator('[data-connect-experiment="longer"]')).toBeDisabled();
  await settings(page, { ...defaults(), threshold: 5 }); await page.locator('[data-connect-pin]').click(); await expect(page.locator('[data-connect-experiment="shorter"]')).toBeDisabled();
  await page.locator('[data-connect-clear]').click(); await expect(page.locator(condition('pinned'))).toHaveCount(0);
  await expect(page.locator('#birdlab-connect-patch-A')).toBeDisabled(); await expect(page.locator('#birdlab-connect-patch-L')).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__toolData.birdLab.blXp)).toBe(17); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('native controls, link ledgers and frozen maps remain keyboard readable and contained at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); await page.locator('[data-connect-reset]').click();
    const range = page.locator('#birdlab-connect-threshold'); await range.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowLeft'); await expect(range).toHaveValue('5');
    await page.keyboard.press('ArrowRight'); await expect(range).toHaveValue('6'); await expect(range).toBeFocused();
    await page.keyboard.press('End'); await page.keyboard.press('ArrowRight'); await expect(range).toHaveValue('70');
    const patch = page.locator('#birdlab-connect-patch-C'); await patch.focus(); await page.keyboard.press('Space'); await expect(patch).not.toBeChecked(); await expect(patch).toBeFocused();
    await page.locator('[data-connect-reset]').click();
    const pin = page.locator('[data-connect-pin]'); await pin.focus(); await page.keyboard.press('Enter'); await expect(pin).toBeFocused();
    const select = page.locator('#birdlab-connect-inspect'); await select.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await expect(select).toHaveValue('1'); await expect(select).toBeFocused();
    const links = page.locator('#birdlab-connect-links'); await links.check(); await links.focus(); await page.keyboard.press('Space'); await expect(links).not.toBeChecked(); await expect(links).toBeFocused();
    for (const selector of ['[data-connect-route-details]', '[data-connect-link-details]']) {
      const details = page.locator(condition() + ' ' + selector), summary = details.locator('summary');
      if (await details.getAttribute('open') !== null) await summary.click(); await summary.focus(); await page.keyboard.press('Enter'); await expect(details).toHaveAttribute('open', ''); await expect(summary).toBeFocused();
    }
    await expect(page.locator(condition() + ' tbody tr')).toHaveCount(66);
    const answer = page.locator('[data-connect-answer="context"]'); await answer.focus(); await page.keyboard.press('Enter'); await expect(answer).toBeFocused(); await expect(page.locator('.birdlab-connect-feedback')).toContainText('Yes.');
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of [root, condition(), condition('pinned'), '.birdlab-connect-controls', '.birdlab-connect-patches', '.birdlab-connect-comparison', '.birdlab-connect-evidence', '.birdlab-connect-model']) {
      const node = page.locator(selector), box = (await node.boundingBox())!; expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await node.evaluate(element => element.scrollWidth - element.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    for (const key of ['current', 'pinned']) expect((await page.locator('[data-connect-map="' + key + '"]').boundingBox())!.width).toBeGreaterThan(280);
    const columns = await page.locator('.birdlab-connect-conditions').evaluate(element => [...element.children].map(node => ({ top: node.getBoundingClientRect().top, left: node.getBoundingClientRect().left })));
    if (layout.host <= 500) { expect(columns[1].top).toBeGreaterThan(columns[0].top); expect(columns[1].left).toBeCloseTo(columns[0].left, 1); } else expect(columns[1].top).toBeCloseTo(columns[0].top, 1);
    const textBounds = await page.locator(root).evaluate(element => [...element.querySelectorAll('svg text')].map(node => {
      const text = node as SVGTextElement, box = text.getBBox(), svg = text.ownerSVGElement!; return { text: text.textContent, x: box.x, right: box.x + box.width, top: box.y, bottom: box.y + box.height, width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height, size: parseFloat(getComputedStyle(text).fontSize) * svg.getBoundingClientRect().width / svg.viewBox.baseVal.width };
    }));
    for (const text of textBounds) { expect(text.x, text.text || '').toBeGreaterThanOrEqual(0); expect(text.right, text.text || '').toBeLessThanOrEqual(text.width); expect(text.top, text.text || '').toBeGreaterThanOrEqual(0); expect(text.bottom, text.text || '').toBeLessThanOrEqual(text.height); expect(text.size, text.text || '').toBeGreaterThanOrEqual(11); }
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('[data-birdlab-connectivity-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } });
      return result.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) }));
    }); expect(violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
