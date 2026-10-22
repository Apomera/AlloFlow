import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 180_000 });
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  width: 1100, height: 1000, layout: 'document', appStyles: true, extraScripts: ['node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, trackingSampling?: any, trackingMethod = 0) {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { raptorHunt: { activeSection: 'tracking', trackingSampling, trackingMethod, xp: 0 } }, undefined, { expectCanvas: false });
  await expect(page.locator('[data-raptor-tracking-study]')).toBeVisible();
}
async function range(page: Page, name: string, value: number) {
  await page.locator('#rh-tracking-' + name).evaluate((element: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-tracking-' + name)).toHaveValue(String(value));
}
function position(time: number) {
  return { x: .4 + 13 * time / 150, y: 2 + .75 * Math.sin(Math.PI * time / 10) + .35 * Math.sin(Math.PI * time / 6) };
}
function schedule(interval: number, offset: number, gap: boolean) {
  const times = [0];
  for (let time = offset === 0 ? interval : offset; time < 60; time += interval) times.push(time);
  times.push(60);
  const omitted = gap ? times.splice(Math.floor(times.length / 2), 1)[0] : null;
  return { times, omitted };
}
function joinedDistance(times: number[]) {
  return times.slice(1).reduce((total, time, index) => {
    const before = position(times[index]), after = position(time);
    return total + Math.hypot(after.x - before.x, after.y - before.y);
  }, 0);
}
function arcLength() {
  // Independent integration of the analytic derivative, not the production polyline sum.
  const steps = 6000, delta = 60 / steps;
  function speed(time: number) {
    const north = .75 * Math.PI / 10 * Math.cos(Math.PI * time / 10) + .35 * Math.PI / 6 * Math.cos(Math.PI * time / 6);
    return Math.hypot(13 / 150, north);
  }
  let sum = speed(0) + speed(60);
  for (let index = 1; index < steps; index++) sum += (index % 2 ? 4 : 2) * speed(index * delta);
  return sum * delta / 3;
}
async function nativeMap(page: Page, name = 'current'): Promise<any> {
  return page.locator('[data-tracking-map="' + name + '"]').evaluate(element => {
    const coordinates = (node: SVGPolylineElement | null) => node ? Array.from({ length: node.points.numberOfItems }, (_, i) => {
      const point = node.points.getItem(i); return [point.x, point.y];
    }) : [];
    const join = element.querySelector('[data-tracking-joins]') as SVGPolylineElement;
    const reference = element.querySelector('[data-tracking-reference]') as SVGPolylineElement | null;
    const selected = element.querySelector('[data-tracking-selected]') as SVGCircleElement;
    const gap = element.querySelector('[data-tracking-gap]') as SVGLineElement | null;
    return { joined: coordinates(join), joinLength: join.getTotalLength(), reference: coordinates(reference), referenceLength: reference?.getTotalLength(),
      selected: [selected.cx.baseVal.value, selected.cy.baseVal.value],
      fixes: [...element.querySelectorAll('[data-tracking-fix]')].map(node => {
        const circle = node as SVGCircleElement;
        return { time: Number(circle.getAttribute('data-fix-time')), x: circle.cx.baseVal.value, y: circle.cy.baseVal.value };
      }), gap: gap ? [gap.x1.baseVal.value, gap.y1.baseVal.value, gap.x2.baseVal.value, gap.y2.baseVal.value] : null };
  });
}
function expectPoint(actual: number[], time: number) {
  const point = position(time);
  expect(actual[0]).toBeCloseTo(60 + point.x * 80, 4);
  expect(actual[1]).toBeCloseTo(390 - point.y * 80, 4);
}

test('native reference, retained fixes, missing-fix joins, timeline and distances agree with independently derived sampling geometry', async ({ page }) => {
  await mount(page);
  const root = page.locator('[data-raptor-tracking-study]'), initial = await nativeMap(page);
  expect(initial.reference).toHaveLength(1201);
  for (let i = 0; i < initial.reference.length; i++) expectPoint(initial.reference[i], i / 20);
  const integrated = arcLength(), referenceLength = Number(await root.getAttribute('data-tracking-reference-km'));
  expect(referenceLength).toBeLessThan(integrated);
  expect(integrated - referenceLength).toBeLessThan(.003);
  expect(initial.referenceLength / 80).toBeCloseTo(referenceLength, 3);
  for (const interval of [5, 10, 20]) for (const offset of [0, Math.floor(interval / 2), interval - 1]) for (const gap of [false, true]) {
    await page.locator('#rh-tracking-interval').selectOption(String(interval));
    await range(page, 'offset', offset);
    const toggle = page.locator('[data-tracking-gap-toggle]');
    if (await toggle.getAttribute('aria-pressed') !== String(gap)) await toggle.click();
    const expected = schedule(interval, offset, gap), native = await nativeMap(page);
    expect(native.fixes.map((fix: any) => fix.time)).toEqual(expected.times);
    expect(native.joined).toHaveLength(expected.times.length);
    for (let i = 0; i < expected.times.length; i++) {
      expectPoint(native.joined[i], expected.times[i]);
      expectPoint([native.fixes[i].x, native.fixes[i].y], expected.times[i]);
    }
    const distance = joinedDistance(expected.times);
    expect(Number(await root.getAttribute('data-tracking-join-km'))).toBeCloseTo(distance, 10);
    expect(native.joinLength / 80).toBeCloseTo(distance, 3);
    await expect(page.locator('[data-tracking-reading="joined"]')).toHaveText(distance.toFixed(2) + ' km');
    await expect(page.locator('[data-tracking-reading="ratio"]')).toHaveText((100 * distance / referenceLength).toFixed(1) + '%');
    expect(distance).toBeLessThanOrEqual(referenceLength + 1e-8);
    const markers = await page.locator('[data-tracking-time-marker]').evaluateAll(nodes => nodes.map(node => (node as SVGCircleElement).cx.baseVal.value));
    expect(markers).toHaveLength(expected.times.length);
    for (let i = 0; i < markers.length; i++) expect(markers[i]).toBeCloseTo(60 + expected.times[i] / 60 * 520, 4);
    if (expected.omitted != null) {
      await expect(page.locator('[data-tracking-gap-note]')).toContainText(expected.omitted + ' min');
      const preceding = expected.times.filter(time => time < expected.omitted!).at(-1)!;
      const following = expected.times.find(time => time > expected.omitted!)!;
      expectPoint(native.gap.slice(0, 2), preceding); expectPoint(native.gap.slice(2), following);
      await expect(page.locator('[data-tracking-omitted-time]')).toHaveAttribute('data-tracking-omitted-time', String(expected.omitted));
    } else { expect(native.gap).toBeNull(); await expect(page.locator('[data-tracking-omitted-time]')).toHaveCount(0); }
    await page.locator('[data-tracking-last]').click();
    expectPoint((await nativeMap(page)).selected, 60);
    await expect(page.locator('[data-tracking-selected-time]')).toHaveText('60 min');
  }
  await page.getByText('Read the model and research context').click();
  await expect(root).toContainText('1,200 short segments');
  await expect(root).toContainText('more frequent fixes do not automatically');
  await expect(root).toContainText('not a recorded raptor track');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('frozen schedules retain geometry and selection while current settings persist and the evidence feedback keeps claims bounded', async ({ page }) => {
  await mount(page);
  await range(page, 'selected', 3);
  await page.locator('[data-tracking-pin]').click();
  const frozen = await page.locator('[data-tracking-map="pinned"]').innerHTML();
  expectPoint((await nativeMap(page, 'pinned')).selected, 15);
  await page.locator('#rh-tracking-interval').selectOption('20');
  await range(page, 'offset', 7);
  await page.locator('[data-tracking-gap-toggle]').click();
  await page.locator('[data-tracking-last]').click();
  await page.locator('[data-tracking-reference-toggle]').click();
  await page.locator('[data-tracking-guides-toggle]').click();
  expect(await page.locator('[data-tracking-map="pinned"]').innerHTML()).toBe(frozen);
  await expect(page.locator('[data-tracking-reference="current"]')).toHaveCount(0);
  await expect(page.locator('[data-tracking-grid="current"]')).toHaveCount(0);
  await expect(page.locator('[data-tracking-reference="pinned"]')).toHaveCount(1);
  await expect(page.locator('[data-tracking-grid="pinned"]')).toHaveCount(1);
  const expected = schedule(20, 7, true), difference = joinedDistance(expected.times) - joinedDistance(schedule(5, 0, false).times);
  await expect(page.locator('[data-tracking-comparison-difference]')).toHaveText('Current − pinned: ' + (difference >= 0 ? '+' : '−') + Math.abs(difference).toFixed(2) + ' km');
  const settings = await page.evaluate(() => (window as any).__toolData.raptorHunt.trackingSampling);
  expect(settings).toEqual({ version: 1, interval: 20, offset: 7, gap: true, reveal: false, guides: false, selected: expected.times.length - 1 });
  await page.locator('[data-tracking-answer="effort"]').click();
  await expect(page.locator('.rh-tracking-feedback')).toContainText('cannot reveal every movement');
  await page.locator('[data-tracking-answer="lower"]').click();
  await expect(page.locator('.rh-tracking-feedback')).toContainText('The shortest distance between two exact positions');
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, trackingMethod: 1 } })));
  expect(await page.locator('[data-tracking-map="pinned"]').innerHTML()).toBe(frozen);
  expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.xp)).toBe(0);
  await page.locator('[data-tracking-pin]').click();
  expect(await page.locator('[data-tracking-map="pinned"]').innerHTML()).not.toBe(frozen);
  await page.locator('[data-tracking-clear-pin]').click();
  await expect(page.locator('[data-tracking-map="pinned"]')).toHaveCount(0);
  await page.locator('[data-tracking-pin]').click();
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, activeSection: 'hub' } })));
  await expect(page.locator('[data-raptor-tracking-study]')).toHaveCount(0);
  await page.evaluate(() => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, raptorHunt: { ...previous.raptorHunt, activeSection: 'tracking' } })));
  await expect(page.locator('#rh-tracking-interval')).toHaveValue('20');
  await expect(page.locator('#rh-tracking-offset')).toHaveValue('7');
  await expect(page.locator('[data-tracking-selected-time]')).toHaveText('60 min');
  await expect(page.locator('[data-tracking-map="pinned"]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('malformed saved inputs remain bounded and manual controls support keyboard access without overflow at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page, { version: 1, interval: 99, offset: -123, selected: 999, gap: 'yes', reveal: false, guides: false }, -999);
  await expect(page.locator('#rh-tracking-interval')).toHaveValue('5');
  await expect(page.locator('#rh-tracking-offset')).toHaveValue('0');
  await expect(page.locator('#rh-tracking-selected')).toHaveValue('12');
  await expect(page.locator('[data-tracking-gap-toggle]')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-tracking-reset]').click();
  const root = page.locator('[data-raptor-tracking-study]'), before = await root.innerHTML();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(await root.innerHTML()).toBe(before);
  await page.locator('[data-tracking-pin]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-tracking-map="pinned"]')).toHaveCount(1);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await page.setViewportSize({ width: layout.viewport, height: 1000 });
    await page.locator('#wrap').evaluate((element: HTMLElement, width) => { element.style.width = width + 'px'; element.style.maxWidth = '100%'; }, layout.host);
    await page.locator('#rh-tracking-offset').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
    await expect(page.locator('#rh-tracking-offset')).toHaveValue('1'); await expect(page.locator('#rh-tracking-offset')).toBeFocused();
    await page.locator('#rh-tracking-selected').focus(); await page.keyboard.press('End');
    await expect(page.locator('[data-tracking-selected-time]')).toHaveText('60 min');
    await expect(page.locator('#rh-tracking-selected')).toBeFocused();
    await page.locator('[data-tracking-reference-toggle]').focus(); await page.keyboard.press('Enter');
    await expect(page.locator('[data-tracking-reference="current"]')).toHaveCount(0);
    await page.keyboard.press('Enter'); await expect(page.locator('[data-tracking-reference="current"]')).toHaveCount(1);
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of ['[data-raptor-tracking-study]', '[data-tracking-map="current"]', '.rh-tracking-controls', '.rh-tracking-stats', '[data-tracking-timeline]', '.rh-tracking-compare', '[data-tracking-map="pinned"]', '[data-tracking-map="comparison"]', '.rh-tracking-evidence']) {
      const element = page.locator(selector), box = (await element.boundingBox())!;
      expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await element.evaluate(node => node.scrollWidth - node.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    expect(await page.evaluate(async () => {
      const report = await (window as any).axe.run(document.querySelector('[data-raptor-tracking-study]'), { runOnly: { type: 'rule', values: ['color-contrast','button-name','select-name','label','aria-valid-attr-value','aria-required-children','aria-required-parent','nested-interactive'] } });
      return report.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
    })).toEqual([]);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
