import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type Settings = { step: number; gauge: number; toe: number };
const initial: Settings = { step: 1.5, gauge: .75, toe: 10 }, root = '[data-birdlab-trackway-study]';
async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((element: HTMLElement, width) => { element.style.width = width + 'px'; element.style.maxWidth = '100%'; element.setAttribute('data-stem-tool-shell', 'true'); }, host);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'tracksSign', blXp: 0, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100); await expect(page.locator(root)).toBeVisible();
}
async function settings(page: Page, model: Settings) {
  for (const [name, value] of Object.entries(model)) await page.locator('#birdlab-trackway-' + name).fill(String(value));
}
async function physical(page: Page, key = 'current') {
  return page.locator('[data-trackway-condition="' + key + '"]').evaluate(node => ({ species: node.getAttribute('data-species'), step: Number(node.getAttribute('data-step')), gauge: Number(node.getAttribute('data-gauge')), toe: Number(node.getAttribute('data-toe')) }));
}
async function drawing(page: Page, key = 'current'): Promise<any> {
  return page.locator('[data-trackway-map="' + key + '"]').evaluate((element, condition) => {
    const svg = element as SVGSVGElement;
    const point = (node: SVGGraphicsElement, x: number, y: number) => {
      const matrix = svg.getScreenCTM()!.inverse().multiply(node.getScreenCTM()!);
      const p = new DOMPoint(x, y).matrixTransform(matrix); return [p.x, p.y];
    };
    const line = (node: SVGLineElement) => [point(node, node.x1.baseVal.value, node.y1.baseVal.value), point(node, node.x2.baseVal.value, node.y2.baseVal.value)];
    return { viewBox: svg.getAttribute('viewBox'),
      contacts: [...svg.querySelectorAll('[data-trackway-contact]')].map(node => {
        const group = node as SVGGElement, heel = group.querySelector(':scope > circle:last-of-type') as SVGCircleElement;
        const foot = group.querySelector('[data-trackway-foot]') as SVGGElement;
        return { id: group.getAttribute('data-trackway-contact'), side: group.getAttribute('data-side'), selected: group.getAttribute('data-selected'), heel: point(heel, 0, 0),
          toes: [...foot.querySelectorAll('[data-track-toe]')].map(n => line(n as SVGLineElement)),
          claws: [...foot.querySelectorAll('[data-track-claw]')].map(n => line(n as SVGLineElement)),
          webs: [...foot.querySelectorAll('[data-track-web]')].map(n => ({ d: n.getAttribute('d'), fill: getComputedStyle(n).fill })),
          contour: foot.querySelector('[data-trackway-contour]')?.getAttribute('data-trackway-contour') };
      }),
      rulers: Object.fromEntries(['step', 'stride', 'diagonal', 'gauge'].map(kind => {
        const node = svg.querySelector('[data-trackway-measure="' + condition + ':' + kind + '"]') as SVGLineElement | null; return [kind, node ? line(node) : null];
      })),
      facing: svg.querySelector('[data-trackway-facing]') ? line(svg.querySelector('[data-trackway-facing]') as SVGLineElement) : null,
      readings: Object.fromEntries(['step', 'stride', 'diagonal', 'gauge'].map(kind => [kind, Number(svg.closest('figure')!.querySelector('[data-trackway-value="' + condition + ':' + kind + '"]')!.textContent!.split(' ')[0])])) };
  }, key);
}
function near(actual: number, expected: number, tolerance = 1e-5) { expect(Math.abs(actual - expected)).toBeLessThan(tolerance); }
function distance(a: number[], b: number[]) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
function verify(d: any, model: Settings, selected = 1, guides = true) {
  expect(d.viewBox).toBe('0 0 760 430'); expect(d.contacts).toHaveLength(4);
  const heels = d.contacts.map((c: any) => c.heel);
  for (let index = 0; index < 4; index++) {
    const contact = d.contacts[index], sign = index % 2 ? 1 : -1;
    expect(contact.side).toBe(index % 2 ? 'R' : 'L'); expect(contact.selected).toBe(String(index === selected));
    near(contact.heel[0], 110 + 54 * index * model.step); near(contact.heel[1], 220 + sign * 27 * model.gauge);
    expect(contact.toes).toHaveLength(4 - (contact.contour === 'piping' || contact.contour === 'mallard' ? 1 : 0));
    // The actual central toe, rather than a copied transform string, establishes
    // where this print points after rotation and reflection.
    const middle = contact.toes[1], direction = [middle[1][0] - middle[0][0], middle[1][1] - middle[0][1]], magnitude = Math.hypot(...direction);
    near(direction[0] / magnitude, Math.cos(model.toe * Math.PI / 180));
    near(direction[1] / magnitude, sign * Math.sin(model.toe * Math.PI / 180));
  }
  // Every corresponding painted toe/claw endpoint reflects across the trail
  // midline after removing heel translation, including the intrinsic contour.
  for (const kind of ['toes', 'claws']) for (let p = 0; p < d.contacts[0][kind].length; p++) for (let end = 0; end < 2; end++) {
    const a = d.contacts[0][kind][p][end], b = d.contacts[1][kind][p][end];
    near(a[0] - heels[0][0], b[0] - heels[1][0]); near(a[1] - heels[0][1], -(b[1] - heels[1][1]));
    for (let axis = 0; axis < 2; axis++) near(d.contacts[2][kind][p][end][axis] - heels[2][axis], a[axis] - heels[0][axis]);
  }
  const observed = { step: (heels[1][0] - heels[0][0]) / 54, stride: distance(heels[2], heels[0]) / 54, diagonal: distance(heels[1], heels[0]) / 54, gauge: Math.abs(heels[1][1] - heels[0][1]) / 54 };
  for (const kind of ['step', 'stride', 'diagonal', 'gauge'] as const) near(d.readings[kind], observed[kind], .00501);
  near(observed.stride, 2 * observed.step);
  if (!guides) { expect(Object.values(d.rulers)).toEqual([null, null, null, null]); expect(d.facing).toBeNull(); return; }
  near(distance(...d.rulers.step), observed.step * 54); near(distance(...d.rulers.stride), observed.stride * 54);
  near(distance(...d.rulers.diagonal), observed.diagonal * 54); near(distance(...d.rulers.gauge), observed.gauge * 54);
  for (let axis = 0; axis < 2; axis++) { near(d.rulers.diagonal[0][axis], heels[0][axis]); near(d.rulers.diagonal[1][axis], heels[1][axis]); near(d.facing[0][axis], heels[selected][axis]); }
  near(distance(...d.facing), 54);
}
async function check(page: Page, model: Settings, key = 'current', selected = 1, guides = true) {
  await expect.poll(async () => { const d = await drawing(page, key); return Math.abs(d.contacts[0].heel[1] - (220 - 27 * model.gauge)); }).toBeLessThan(1e-5);
  const d = await drawing(page, key); verify(d, model, selected, guides); return d;
}

test('native heel geometry, transformed toe directions, mirrored contours and distinct step/stride rulers agree on one normalized scale', async ({ page }) => {
  await mount(page); const before = await check(page, initial);
  for (const model of [{ step: .75, gauge: 0, toe: 0 }, { step: 3, gauge: 1.5, toe: 30 }, { step: 1.25, gauge: 1, toe: -30 }, initial]) {
    await settings(page, model); await check(page, model);
  }
  await page.locator('#birdlab-trackway-toe').fill('-30'); const rotated = await check(page, { ...initial, toe: -30 });
  expect(rotated.contacts.map((c: any) => c.heel)).toEqual(before.contacts.map((c: any) => c.heel)); expect(rotated.readings).toEqual(before.readings);
  await page.getByRole('button', { name: 'Mallard', exact: true }).click(); await check(page, { ...initial, toe: -30 });
  const webbed = await drawing(page); expect(webbed.contacts.every((c: any) => c.webs.length === 1)).toBe(true);
  expect(new Set(webbed.contacts.map((c: any) => c.webs[0].d)).size).toBe(1);
  await page.locator('[data-trackway-guides]').uncheck(); await check(page, { ...initial, toe: -30 }, 'current', 1, false);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('full species pins and exact bounded changes survive unavailable footprints, species browsing and host writes without progress awards', async ({ page }) => {
  await mount(page); const progress = await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab));
  await page.locator('[data-trackway-pin]').click(); const pin = await physical(page, 'pinned');
  await page.getByRole('button', { name: 'Mallard', exact: true }).click(); await settings(page, { step: .75, gauge: 1.25, toe: -25 });
  await page.locator('#birdlab-trackway-contact').selectOption('3'); await page.locator('[data-trackway-guides]').uncheck();
  expect((await physical(page)).species).toBe('mallard'); expect(await physical(page, 'pinned')).toEqual(pin);
  await page.locator('[data-trackway-experiment="step"]').click();
  await expect(page.getByRole('heading', { level: 2, name: 'Wild Turkey', exact: true })).toBeVisible();
  expect(await page.locator('[data-track-figure] svg[data-track]').getAttribute('data-track')).toBe('wildturkey');
  expect(await physical(page)).toEqual({ species: 'wildturkey', step: 3, gauge: .75, toe: 10 });
  await check(page, { ...initial, step: 3 }, 'current', 3, false); await check(page, initial, 'pinned', 3, false);
  for (const name of ['Belted Kingfisher', 'Hummingbirds', 'Osprey']) {
    await page.getByRole('button', { name, exact: true }).click(); await expect(page.locator('[data-trackway-unavailable]')).toContainText(name);
    await expect(page.locator('[data-trackway-condition="current"]')).toHaveCount(0); expect(await physical(page, 'pinned')).toEqual(pin);
    await expect(page.locator('[data-trackway-pin]')).toBeDisabled();
  }
  await page.locator('[data-trackway-experiment="straight"]').click(); expect(await physical(page)).toEqual({ ...pin, toe: 0 });
  await check(page, { ...initial, toe: 0 }, 'current', 3, false);
  await page.locator('[data-trackway-experiment="gauge"]').click(); expect(await physical(page)).toEqual({ ...pin, gauge: 1.5 });
  await check(page, { ...initial, gauge: 1.5 }, 'current', 3, false); expect(await physical(page, 'pinned')).toEqual(pin);
  await page.evaluate(() => (window as any).__ctx.update('birdLab', 'blXp', 17)); await expect.poll(() => page.evaluate(() => (window as any).__toolData.birdLab.blXp)).toBe(17);
  expect(await physical(page, 'pinned')).toEqual(pin); await expect(page.locator('#birdlab-trackway-contact')).toHaveValue('3'); await expect(page.locator('[data-trackway-guides]')).not.toBeChecked();
  await settings(page, { step: 3, gauge: 1.5, toe: 0 }); await page.locator('[data-trackway-pin]').click();
  for (const kind of ['step', 'gauge', 'straight']) await expect(page.locator('[data-trackway-experiment="' + kind + '"]')).toBeDisabled();
  await page.locator('#birdlab-trackway-gauge').fill('0'); await page.locator('[data-trackway-pin]').click(); await expect(page.locator('[data-trackway-experiment="gauge"]')).toBeDisabled();
  await page.locator('[data-trackway-answer="limits"]').click(); await expect(page.locator('.birdlab-trackway-feedback')).toContainText('no contact times');
  await page.locator('[data-trackway-reset]').click(); await expect(page.locator('.birdlab-trackway-feedback')).toHaveCount(0); expect(await physical(page)).toEqual({ species: 'wildturkey', ...initial });
  await page.locator('[data-trackway-clear]').click(); await expect(page.locator('#birdlab-trackway-contact')).toBeFocused(); await expect(page.locator('[data-trackway-condition="pinned"]')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify({ ...(window as any).__toolData.birdLab, blXp: 0 }))).toBe(progress);
  expect(await page.evaluate(() => (window as any).__toolData.birdLab.blXp)).toBe(17); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('trackway controls and shared comparisons remain keyboard readable at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); await page.locator('[data-trackway-reset]').click(); await page.locator('[data-trackway-guides]').check();
    await page.locator('[data-trackway-pin]').click();
    const step = page.locator('#birdlab-trackway-step'); await step.focus(); await page.keyboard.press('ArrowRight'); await expect(step).toBeFocused(); await expect(step).toHaveValue('1.75');
    const selector = page.locator('#birdlab-trackway-contact'); await selector.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await expect(selector).toBeFocused(); await expect(selector).toHaveValue('1');
    const action = page.locator('[data-trackway-experiment="step"]'); await action.focus(); await page.keyboard.press('Enter'); await expect(action).toBeFocused();
    await check(page, { ...initial, step: 3 }); await check(page, initial, 'pinned');
    const interpretation = page.locator('[data-trackway-answer="limits"]'); await interpretation.focus(); await page.keyboard.press('Enter'); await expect(interpretation).toBeFocused();
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of [root, '.birdlab-trackway-controls', '.birdlab-trackway-comparison', '[data-trackway-condition="current"]', '[data-trackway-condition="pinned"]', '.birdlab-trackway-source']) {
      const node = page.locator(selector), box = (await node.boundingBox())!; expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1); expect(await node.evaluate(el => el.scrollWidth - el.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    const currentWidth = await page.locator('[data-trackway-map="current"]').evaluate(n => n.getBoundingClientRect().width), frozenWidth = await page.locator('[data-trackway-map="pinned"]').evaluate(n => n.getBoundingClientRect().width);
    near(currentWidth, frozenWidth, 1);
    const bounds = await page.locator(root + ' svg text').evaluateAll(nodes => nodes.map(node => { const text = node as SVGTextElement, box = text.getBBox(), svg = text.ownerSVGElement!, matrix = text.getScreenCTM(); return { text: text.textContent, x: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height, width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height, font: parseFloat(getComputedStyle(text).fontSize) * Math.hypot(matrix!.a, matrix!.b) }; }));
    for (const box of bounds) { expect(box.x, box.text!).toBeGreaterThanOrEqual(0); expect(box.right, box.text!).toBeLessThanOrEqual(box.width); expect(box.top, box.text!).toBeGreaterThanOrEqual(0); expect(box.bottom, box.text!).toBeLessThanOrEqual(box.height); expect(box.font, box.text!).toBeGreaterThanOrEqual(11); }
    const violations = await page.evaluate(async () => { const result = await (window as any).axe.run(document.querySelector('[data-birdlab-trackway-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } }); return result.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })); });
    expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.locator('[data-trackway-clear]').click(); await expect(selector).toBeFocused();
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
