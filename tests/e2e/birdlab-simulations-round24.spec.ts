import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', hasTouch: true, trace: { mode: 'retain-on-failure', screenshots: false, snapshots: true } });
test.describe.configure({ retries: 0, timeout: 180_000 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type Model = { mass: number; width: number; height: number; density: number };
type Drawing = { body: number[][]; wet: number[][]; curve: number[][]; waterline: number[]; weight: number[]; probe: number[]; support: number[]; equilibrium: number[] | null; neutral: number[] | null; readings: Record<string, string>; status: string };
const defaults: Model = { mass: 1.5, width: .15, height: .1, density: 1000 };
const root = '[data-birdlab-float-study]';
const near = (actual: number, expected: number, tolerance = 5e-5) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((node: HTMLElement, width) => { node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.setAttribute('data-stem-tool-shell', 'true'); }, host);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'waterfowl', blXp: 0, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100); await expect(page.locator(root)).toBeVisible();
}
async function physical(page: Page, id = 'current'): Promise<Model> {
  return page.locator('[data-float-condition="' + id + '"]').evaluate(node => Object.fromEntries(['mass', 'width', 'height', 'density'].map(key => [key, Number(node.getAttribute('data-float-' + key))])) as Model);
}
async function settings(page: Page, model: Model) {
  for (const [key, value] of Object.entries(model)) await page.locator('#birdlab-float-' + key).fill(String(value));
  await expect.poll(() => physical(page)).toEqual(model);
}
// Independent polygon clipping and shoelace area. This does not call the
// production depth/min function or trust its SVG dimensions/readout metadata.
function wetSection(model: Model, draft: number) {
  const polygon = [[0, -draft], [model.width, -draft], [model.width, model.height - draft], [0, model.height - draft]], clipped: number[][] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length], ai = a[1] <= 0, bi = b[1] <= 0;
    if (ai) clipped.push(a);
    if (ai !== bi) { const t = -a[1] / (b[1] - a[1]); clipped.push([a[0] + t * (b[0] - a[0]), 0]); }
  }
  let area = 0; for (let i = 0; i < clipped.length; i++) { const a = clipped[i], b = clipped[(i + 1) % clipped.length]; area += a[0] * b[1] - b[0] * a[1]; }
  return Math.abs(area) / 2;
}
async function drawing(page: Page, id = 'current'): Promise<Drawing> {
  return page.locator('[data-float-condition="' + id + '"]').evaluate(node => {
    function coordinates(selector: string) {
      const element = node.querySelector(selector) as SVGGraphicsElement; if (!element) return null;
      const svg = element.ownerSVGElement!, matrix = svg.getScreenCTM()!.inverse().multiply(element.getScreenCTM()!);
      function convert(x: number, y: number) { const p = new DOMPoint(x, y).matrixTransform(matrix); return [p.x, p.y]; }
      const tag = element.tagName.toLowerCase();
      if (tag === 'polyline') { const p = (element as SVGPolylineElement).points; return Array.from({ length: p.numberOfItems }, (_, i) => { const q = p.getItem(i); return convert(q.x, q.y); }); }
      if (tag === 'rect') { const r = element as SVGRectElement, x = r.x.baseVal.value, y = r.y.baseVal.value, w = r.width.baseVal.value, h = r.height.baseVal.value; return [convert(x, y), convert(x + w, y), convert(x + w, y + h), convert(x, y + h)]; }
      if (tag === 'circle') { const c = element as SVGCircleElement; return convert(c.cx.baseVal.value, c.cy.baseVal.value); }
      const l = element as SVGLineElement; return [...convert(l.x1.baseVal.value, l.y1.baseVal.value), ...convert(l.x2.baseVal.value, l.y2.baseVal.value)];
    }
    return { body: coordinates('[data-float-body]'), wet: coordinates('[data-float-displaced]') || [], curve: coordinates('[data-float-support]'), waterline: coordinates('[data-float-waterline]'), weight: coordinates('[data-float-weight]'), probe: coordinates('[data-float-probe-line]'), support: coordinates('[data-float-support-point]'), equilibrium: coordinates('[data-float-equilibrium]'), neutral: coordinates('[data-float-neutral]'), readings: Object.fromEntries(Array.from(node.querySelectorAll('[data-float-reading]')).map(n => [n.getAttribute('data-float-reading')!.split(':')[1], n.textContent!])), status: node.querySelector('[data-float-status]')!.textContent! } as Drawing;
  });
}
function verify(d: Drawing, m: Model, draft: number) {
  const area = wetSection(m, draft), force = 9.81 * m.density * .2 * area, weight = m.mass * 9.81, capacity = wetSection(m, .2) * .2 * m.density, violations: string[] = [];
  const close = (a: number, b: number, label: string, tolerance = 5e-5) => { if (!(Math.abs(a - b) <= tolerance)) violations.push(label + ': ' + a + ' / ' + b); };
  const left = 320 - 600 * m.width, top = 240 + 1200 * (draft - m.height), bottom = 240 + 1200 * draft;
  [[left, top], [left + 1200 * m.width, top], [left + 1200 * m.width, bottom], [left, bottom]].forEach((p, i) => p.forEach((v, a) => close(d.body[i][a], v, 'body ' + i + ':' + a)));
  if (draft === 0) expect(d.wet).toEqual([]); else {
    expect(d.wet).toHaveLength(4);
    // Compare native filled area with the independently clipped physical area.
    close((d.wet[1][0] - d.wet[0][0]) * (d.wet[3][1] - d.wet[0][1]) / (1200 * 1200), area, 'wet area', 1e-7);
    close(d.wet[0][0], left, 'wet left'); close(d.wet[2][1], bottom, 'wet bottom');
    close(d.wet[0][1], Math.max(240, top), 'wet top');
    for (const p of d.wet) if (p[1] < 240 - 5e-5 || p[1] < top - 5e-5 || p[1] > bottom + 5e-5) violations.push('water fill escapes body/water half-plane');
  }
  expect(d.curve).toHaveLength(81);
  d.curve.forEach((p, i) => { const depth = .2 * i / 80, buoyancy = 9.81 * m.density * .2 * wetSection(m, depth); close((p[0] - 80) / 2400, depth, 'curve depth ' + i); close((380 - p[1]) * 120 / 280, buoyancy, 'curve force ' + i); });
  close(d.waterline[1], 240, 'water level'); close(d.waterline[3], 240, 'water level end');
  close((380 - d.weight[1]) * 120 / 280, weight, 'weight'); close(d.weight[1], d.weight[3], 'constant weight');
  close((d.probe[0] - 80) / 2400, draft, 'shared probe'); close((d.support[0] - 80) / 2400, draft, 'support point depth'); close((380 - d.support[1]) * 120 / 280, force, 'support point force');
  if (m.mass <= capacity + 1e-9) { expect(d.equilibrium).not.toBeNull(); const first = m.mass / (m.density * .2 * m.width); close((d.equilibrium![0] - 80) / 2400, first, 'first balance'); close((380 - d.equilibrium![1]) * 120 / 280, weight, 'balance force'); near(parseFloat(d.readings.draft), first, .000501); }
  else { expect(d.equilibrium).toBeNull(); expect(d.readings.draft).toBe('Outside available volume'); }
  if (Math.abs(m.mass - capacity) < 1e-9) { expect(d.neutral).not.toBeNull(); close((d.neutral![0] - 80) / 2400, m.height, 'neutral start'); close(d.neutral![2], 560, 'neutral right bound'); close((380 - d.neutral![1]) * 120 / 280, weight, 'neutral force'); close(d.neutral![1], d.neutral![3], 'neutral constant'); } else expect(d.neutral).toBeNull();
  near(parseFloat(d.readings.volume), .2 * area * 1000, .000501); near(parseFloat(d.readings.force), force, .00501); near(parseFloat(d.readings.net), force - weight, .00501);
  expect(violations).toEqual([]);
}
async function check(page: Page, model: Model, draft: number, id = 'current') {
  await expect(page.locator(root)).toHaveAttribute('data-float-draft', String(draft)); verify(await drawing(page, id), model, draft);
}
async function handlePoints(page: Page, value: number) {
  const svg = page.locator('[data-float-force="current"]'); await svg.scrollIntoViewIfNeeded();
  return svg.evaluate((node, target) => { const svg = node as SVGSVGElement, grip = svg.querySelector('[data-float-grip]') as SVGCircleElement, matrix = svg.getScreenCTM()!, a = new DOMPoint(grip.cx.baseVal.value, grip.cy.baseVal.value).matrixTransform(matrix), b = new DOMPoint(80 + 2400 * target, 495).matrixTransform(matrix); return { start: { x: a.x, y: a.y }, end: { x: b.x, y: b.y } }; }, value);
}
async function mouseDrag(page: Page, value: number) {
  const p = await handlePoints(page, value); await page.mouse.move(p.start.x, p.start.y); await page.mouse.down(); await page.mouse.move(p.end.x, p.end.y, { steps: 5 }); await page.mouse.up();
}
async function touchDrag(page: Page, value: number, cancel = false) {
  const p = await handlePoints(page, value), cdp = await page.context().newCDPSession(page);
  try { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p.start, id: 1 }] }); for (let i = 1; i <= 5; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.start.x + (p.end.x - p.start.x) * i / 5, y: p.start.y, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] }); } finally { await cdp.detach(); }
}
async function releaseCapture(page: Page) {
  const p = await handlePoints(page, .055), handle = page.locator('[data-float-handle]');
  await handle.evaluate(node => { node.addEventListener('gotpointercapture', e => { (window as any).__floatPointer = (e as PointerEvent).pointerId; }, { once: true }); });
  await page.mouse.move(p.start.x, p.start.y); await page.mouse.down(); await page.mouse.move(p.end.x, p.end.y, { steps: 2 }); await expect.poll(() => page.evaluate(() => (window as any).__floatPointer)).toBeTruthy();
  await handle.evaluate(node => node.releasePointerCapture((window as any).__floatPointer)); await page.mouse.move(p.end.x + 2, p.end.y); await page.mouse.move(1, 1); await page.mouse.up(); const before = await page.locator('#birdlab-float-draft').inputValue();
  const hover = await handlePoints(page, .075); await page.mouse.move(hover.start.x, hover.start.y); await page.mouse.move(hover.end.x, hover.end.y, { steps: 3 }); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); await expect(page.locator('#birdlab-float-draft')).toHaveValue(before);
}
async function multiTouch(page: Page) {
  const p = await handlePoints(page, .08), cdp = await page.context().newCDPSession(page), before = await page.locator('#birdlab-float-draft').inputValue();
  try { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p.start, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p.start, id: 1 }, { x: p.start.x + 100, y: p.start.y - 80, id: 2 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...p.end, id: 1 }, { x: p.start.x + 130, y: p.start.y - 80, id: 2 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); } finally { await cdp.detach(); }
  await expect(page.locator('#birdlab-float-draft')).toHaveValue(before);
}

test('native displaced section, force curve and balance agree with independent polygon clipping through partial, neutral and insufficient-volume cases', async ({ page }) => {
  await mount(page); await check(page, defaults, .05);
  const models: Model[] = [defaults, { mass: 8, width: .1, height: .05, density: 800 }, { mass: .5, width: .3, height: .15, density: 1200 }, { mass: 2, width: .1, height: .1, density: 1000 }, { mass: 3, width: .15, height: .1, density: 1000 }, { mass: 6, width: .2, height: .15, density: 1000 }, { mass: 1.75, width: .125, height: .075, density: 875 }, { mass: 5.5, width: .275, height: .125, density: 1100 }];
  for (const model of models) { await settings(page, model); for (const depth of [0, .005, .05, .075, .1, .15, .2]) { await page.locator('#birdlab-float-draft').fill(String(depth)); await check(page, model, depth); } }
  await settings(page, { mass: 6, width: .2, height: .15, density: 1000 }); await page.locator('#birdlab-float-draft').fill('0.2'); await expect(page.locator('[data-float-status="current"]')).toContainText('Neutral when fully submerged'); near(parseFloat((await drawing(page)).readings.net), 0, .00501);
  await settings(page, defaults); await mouseDrag(page, .12); await check(page, defaults, .12); await mouseDrag(page, -.02); await check(page, defaults, 0); await mouseDrag(page, .23); await check(page, defaults, .2);
  await expect(page.locator('[data-waterfowl-plate]')).toHaveCount(1); await expect(page.getByRole('button', { name: 'Mallard', exact: true })).toBeVisible(); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('complete physical pins, exact restored experiments and a shared imposed draft survive species and host writes without progress', async ({ page }) => {
  await mount(page); const progress = await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab)); const frozen = { mass: 2, width: .125, height: .075, density: 900 };
  await settings(page, frozen); await page.locator('[data-float-pin]').click(); await page.locator('#birdlab-float-draft').fill('0.11');
  for (const [kind, expected] of [['mass', { ...frozen, mass: 4 }], ['width', { ...frozen, width: .25 }], ['density', { ...frozen, density: 1100 }]] as const) {
    await settings(page, { mass: 8, width: .3, height: .15, density: 1200 }); await page.locator('[data-float-experiment="' + kind + '"]').click(); expect(await physical(page)).toEqual(expected); expect(await physical(page, 'pinned')).toEqual(frozen); await check(page, expected, .11); await check(page, frozen, .11, 'pinned');
  }
  await page.getByRole('button', { name: 'Common Eider', exact: true }).click(); await check(page, frozen, .11, 'pinned'); await page.evaluate(() => (window as any).__ctx.update('birdLab', 'blXp', 17)); await expect.poll(() => page.evaluate(() => (window as any).__toolData.birdLab.blXp)).toBe(17); await check(page, frozen, .11, 'pinned');
  await settings(page, { mass: 4.25, width: .175, height: .15, density: 1025 }); await page.locator('[data-float-pin]').click(); for (const kind of ['mass', 'width', 'density']) await expect(page.locator('[data-float-experiment="' + kind + '"]')).toBeDisabled();
  await page.locator('[data-float-answer="depth"]').click(); await expect(page.locator('.birdlab-float-feedback')).toContainText('cannot add displaced volume'); await page.locator('[data-float-answer="volume"]').click(); await expect(page.locator('.birdlab-float-feedback')).toContainText('does not predict how a living bird dives');
  await page.locator('[data-float-reset]').click(); expect(await physical(page)).toEqual(defaults); await expect(page.locator('.birdlab-float-feedback')).toHaveCount(0); await check(page, defaults, .11); expect(await physical(page, 'pinned')).toEqual({ mass: 4.25, width: .175, height: .15, density: 1025 });
  await page.locator('[data-float-clear]').click(); await expect(page.locator('#birdlab-float-draft')).toBeFocused(); await expect(page.locator('[data-float-condition="pinned"]')).toHaveCount(0); expect(await page.evaluate(() => JSON.stringify({ ...(window as any).__toolData.birdLab, blXp: 0 }))).toBe(progress);
  await page.getByRole('button', { name: '← Menu', exact: true }).first().click(); await expect(page.locator(root)).toHaveCount(0); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('real touch, multipointer suppression, cancelled and lost capture, keyboard and native labels work in three hosts with eight accessibility rules', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); await page.locator('[data-float-reset]').click(); await page.locator('#birdlab-float-draft').fill('0.05'); await page.locator('[data-float-pin]').click();
    await touchDrag(page, .125); await check(page, defaults, .125); await check(page, defaults, .125, 'pinned'); await touchDrag(page, .075, true); await touchDrag(page, .105); await check(page, defaults, .105);
    await page.locator('#birdlab-float-draft').fill('0.05'); await multiTouch(page); await releaseCapture(page); await touchDrag(page, .09); await check(page, defaults, .09);
    const handle = page.locator('[data-float-handle]'); await handle.focus(); await page.keyboard.press('Home'); await check(page, defaults, 0); await expect(page.locator('[data-float-nudge="back"]')).toBeDisabled(); await page.keyboard.press('End'); await check(page, defaults, .2); await expect(page.locator('[data-float-nudge="next"]')).toBeDisabled(); await page.keyboard.press('ArrowLeft'); await check(page, defaults, .195); await expect(handle).toBeFocused(); await page.locator('[data-float-nudge="back"]').tap(); await check(page, defaults, .19);
    const experiment = page.locator('[data-float-experiment="width"]'); await experiment.focus(); await page.keyboard.press('Enter'); await expect(experiment).toBeFocused(); await check(page, { ...defaults, width: .3 }, .19); await check(page, defaults, .19, 'pinned');
    const labelViolations = await page.locator(root + ' svg').evaluateAll(nodes => {
      const failures: string[] = [];
      for (const node of nodes) { const svg = node as SVGSVGElement, name = svg.getAttribute('data-float-cutaway') || svg.getAttribute('data-float-force'), labels = Array.from(svg.querySelectorAll('text')).map(n => { const text = n as SVGTextElement, b = text.getBBox(), m = text.getScreenCTM()!; return { text: text.textContent!, left: b.x, top: b.y, right: b.x + b.width, bottom: b.y + b.height, font: parseFloat(getComputedStyle(text).fontSize) * Math.hypot(m.a, m.b) }; });
        for (const label of labels) if (!(label.left >= -.01 && label.top >= -.01 && label.right <= svg.viewBox.baseVal.width + .01 && label.bottom <= svg.viewBox.baseVal.height + .01 && label.font >= 11)) failures.push(name + ': bounds/font ' + JSON.stringify(label));
        for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) { const a = labels[i], b = labels[j]; if (Math.min(a.right, b.right) > Math.max(a.left, b.left) + .01 && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + .01) failures.push(name + ': overlap ' + a.text + ' / ' + b.text); }
      } return failures;
    }); expect(labelViolations).toEqual([]);
    const host = (await page.locator('#wrap').boundingBox())!; for (const selector of [root, '.birdlab-float-controls', '[data-float-condition="current"]', '[data-float-condition="pinned"]', '.birdlab-float-notes']) { const node = page.locator(selector), b = (await node.boundingBox())!; expect(b.x).toBeGreaterThanOrEqual(host.x - 1); expect(b.x + b.width).toBeLessThanOrEqual(host.x + host.width + 1); expect(await node.evaluate(n => n.scrollWidth - n.clientWidth)).toBeLessThanOrEqual(1); }
    for (const kind of ['cutaway', 'force']) { const widths = await page.locator('[data-float-' + kind + ']').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().width)); near(widths[0], widths[1], 1); }
    for (const selector of ['[data-float-hit]', '[data-float-nudge]', '.birdlab-float-control input']) for (const control of await page.locator(selector).all()) { const b = (await control.boundingBox())!; expect(b.width).toBeGreaterThanOrEqual(44); expect(b.height).toBeGreaterThanOrEqual(44); }
    const violations = await page.evaluate(async () => { const result = await (window as any).axe.run(document.querySelector('[data-birdlab-float-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } }); return result.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })); }); expect(violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1); await page.locator('[data-float-clear]').click(); await expect(page.locator('#birdlab-float-draft')).toBeFocused();
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
