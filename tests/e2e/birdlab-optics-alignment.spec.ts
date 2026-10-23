import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

test.use({ video: 'off', hasTouch: true, trace: { mode: 'retain-on-failure', screenshots: false, snapshots: true } });
test.describe.configure({ retries: 0, timeout: 180_000, mode: 'serial' });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document' });
const report = resolve('reports/avian-simulations-round29-2026-10-22/optics');
const rules = ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'];
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type Condition = { magnification: number; objective: number; pupil: number; offset: number };
const defaults: Condition = { magnification: 8, objective: 42, pupil: 3, offset: 0 };
const root = '[data-birdlab-pupil-study]';
// Native SVGAnimatedLength values expose Float32 coordinates: at this fixed
// 760-unit drawing scale their quantization can exceed 1e-5. Area/fraction
// checks retain their stricter explicit independent-oracle tolerances below.
const near = (actual: number, expected: number, tolerance = 1e-4) => expect(Math.abs(actual - expected), `${actual} should be within ${tolerance} of ${expected}`).toBeLessThanOrEqual(tolerance);

// Independent area oracle: integrate the shared vertical chord of the two disks.
// This does not call or repeat the production circle-segment/acos formula. The
// split at the common-chord x coordinate removes its only interior cusp.
function overlap(m: Condition, signedOffset = m.offset) {
  const beam = m.objective / m.magnification / 2, eye = m.pupil / 2, d = Math.abs(signedOffset);
  if (d >= beam + eye) return 0;
  if (d <= Math.abs(beam - eye)) return Math.PI * Math.min(beam, eye) ** 2;
  const left = Math.max(-beam, d - eye), right = Math.min(beam, d + eye);
  const height = (x: number) => 2 * Math.min(Math.sqrt(Math.max(0, beam * beam - x * x)), Math.sqrt(Math.max(0, eye * eye - (x - d) ** 2)));
  function integrate(a: number, b: number) {
    const middle = (a + b) / 2, fa = height(a), fm = height(middle), fb = height(b), initial = (b - a) * (fa + 4 * fm + fb) / 6;
    function adaptive(a: number, b: number, fa: number, fm: number, fb: number, previous: number, epsilon: number, depth: number): number {
      const mid = (a + b) / 2, fl = height((a + mid) / 2), fr = height((mid + b) / 2), l = (mid - a) * (fa + 4 * fl + fm) / 6, r = (b - mid) * (fm + 4 * fr + fb) / 6, difference = l + r - previous;
      if (!depth || Math.abs(difference) <= 15 * epsilon) return l + r + difference / 15;
      return adaptive(a, mid, fa, fl, fm, l, epsilon / 2, depth - 1) + adaptive(mid, b, fm, fr, fb, r, epsilon / 2, depth - 1);
    }
    return adaptive(a, b, fa, fm, fb, initial, 1e-9, 24);
  }
  const split = (d * d + beam * beam - eye * eye) / (2 * d);
  return split > left && split < right ? integrate(left, split) + integrate(split, right) : integrate(left, right);
}

async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((node: HTMLElement, width) => { node.style.width = width + 'px'; node.style.maxWidth = '100%'; node.setAttribute('data-stem-tool-shell', 'true'); }, host);
}

async function mount(page: Page) {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'optics', blXp: 23, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100);
  await expect(page.locator(root)).toBeVisible();
  return errors;
}

async function settings(page: Page, m: Condition) {
  await page.locator('#birdlab-optics-mag').fill(String(m.magnification));
  await page.locator('#birdlab-optics-objective').fill(String(m.objective));
  await page.getByRole('button', { name: m.pupil === 6 ? 'Low light · 6 mm' : 'Daylight · 3 mm', exact: true }).click();
  await page.locator('#birdlab-pupil-offset').fill(String(m.offset));
}

async function physical(page: Page, id = 'current'): Promise<Condition> {
  return page.locator('[data-pupil-condition="' + id + '"]').evaluate(node => ({
    magnification: Number(node.getAttribute('data-pupil-magnification')), objective: Number(node.getAttribute('data-pupil-objective')),
    pupil: Number(node.getAttribute('data-pupil-pupil')), offset: Number(node.getAttribute('data-pupil-offset'))
  }));
}

async function checkPhysical(page: Page, condition: Condition, id = 'current') {
  await expect.poll(() => physical(page, id)).toEqual(condition);
}

async function rewards(page: Page) {
  return page.evaluate(() => { const value = (window as any).__toolData.birdLab; return { xp: value.blXp, badges: value.blBadges, lifeList: value.blLifeList }; });
}

async function capture(page: Page, selector: string, file: string) {
  const node = page.locator(selector); await node.evaluate(el => el.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' }));
  const clip = await node.evaluate(el => { const b = el.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height, scale: 1 }; });
  const cdp = await page.context().newCDPSession(page);
  let dimensions = { width: 0, height: 0 };
  try {
    const result = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip }), bytes = Buffer.from(result.data, 'base64'), png = readPng(bytes);
    dimensions = { width: png.width, height: png.height }; near(png.width, clip.width, 2); near(png.height, clip.height, 2);
    writeFileSync(resolve(report, file), bytes);
  }
  finally { await cdp.detach(); }
  return { file, clip, dimensions };
}

async function drawing(page: Page, id = 'current') {
  return page.locator('[data-pupil-condition="' + id + '"]').evaluate((node, id) => {
    const svg = node.querySelector('[data-pupil-disks]') as SVGSVGElement;
    function circle(selector: string) {
      const e = svg.querySelector(selector) as SVGCircleElement, matrix = svg.getScreenCTM()!.inverse().multiply(e.getScreenCTM()!);
      const center = new DOMPoint(e.cx.baseVal.value, e.cy.baseVal.value).matrixTransform(matrix), edgeX = new DOMPoint(e.cx.baseVal.value + e.r.baseVal.value, e.cy.baseVal.value).matrixTransform(matrix), edgeY = new DOMPoint(e.cx.baseVal.value, e.cy.baseVal.value + e.r.baseVal.value).matrixTransform(matrix);
      return { center: [center.x, center.y], radiusX: Math.hypot(edgeX.x - center.x, edgeX.y - center.y), radiusY: Math.hypot(edgeY.x - center.x, edgeY.y - center.y), fill: getComputedStyle(e).fill, stroke: getComputedStyle(e).stroke };
    }
    const painted = svg.querySelector('[data-pupil-overlap]') as SVGCircleElement, clipReference = painted.getAttribute('clip-path') || getComputedStyle(painted).clipPath, clipId = /#([^)'"\s]+)/.exec(clipReference)?.[1], clip = clipId ? document.getElementById(clipId) : null, clipped = clip?.querySelector('[data-pupil-eye-clip]') as SVGCircleElement | null;
    return {
      id, beam: circle('[data-pupil-beam]'), eye: circle('[data-pupil-eye]'), admitted: circle('[data-pupil-overlap]'), handle: id === 'current' ? circle('[data-pupil-handle]') : null,
      clip: { reference: clipReference, units: clip?.getAttribute('clipPathUnits') || 'userSpaceOnUse', x: clipped?.cx.baseVal.value, y: clipped?.cy.baseVal.value, r: clipped?.r.baseVal.value, transform: clipped?.getAttribute('transform') || '', parentTransform: clip?.getAttribute('transform') || '' },
      area: Number(node.getAttribute('data-pupil-area')), fraction: Number(node.getAttribute('data-pupil-admitted')), eyeFill: Number(node.getAttribute('data-pupil-eye-fill')),
      svg: { width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height }, text: node.textContent
    };
  }, id);
}

async function graph(page: Page) {
  return page.locator('[data-pupil-graph]').evaluate(node => {
    const svg = node as SVGSVGElement;
    function coordinate(e: SVGGraphicsElement, x: number, y: number) { const p = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM()!.inverse().multiply(e.getScreenCTM()!)); return [p.x, p.y]; }
    return {
      width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height,
      curves: Object.fromEntries(Array.from(svg.querySelectorAll('[data-pupil-curve]')).map(node => { const p = node as SVGPolylineElement; return [p.getAttribute('data-pupil-curve')!, Array.from({ length: p.points.numberOfItems }, (_, i) => { const point = p.points.getItem(i); return coordinate(p, point.x, point.y); })]; })),
      probes: Object.fromEntries(Array.from(svg.querySelectorAll('[data-pupil-probe]')).map(node => { const c = node as SVGCircleElement; return [c.getAttribute('data-pupil-probe')!, coordinate(c, c.cx.baseVal.value, c.cy.baseVal.value)]; }))
    };
  });
}

async function verify(page: Page, m: Condition, id = 'current', verifyCurve = false) {
  await checkPhysical(page, m, id); const d = await drawing(page, id), rb = m.objective / m.magnification / 2, re = m.pupil / 2, area = overlap(m), fraction = area / (Math.PI * rb * rb), eyeFill = area / (Math.PI * re * re);
  expect(d.svg).toEqual({ width: 760, height: 420 }); near(d.area, area, 2e-7); near(d.fraction, fraction, 1e-7); near(d.eyeFill, eyeFill, 1e-7);
  for (const disk of [d.beam, d.admitted]) { near(disk.center[0], 380); near(disk.center[1], 210); near(disk.radiusX, rb * 16); near(disk.radiusY, rb * 16); }
  near(d.eye.center[0], 380 + m.offset * 16); near(d.eye.center[1], 210); near(d.eye.radiusX, re * 16); near(d.eye.radiusY, re * 16); expect(d.eye.stroke).not.toBe('none');
  expect(d.clip.reference).toContain('#'); expect(d.clip.units).toBe('userSpaceOnUse'); near(d.clip.x!, d.eye.center[0]); near(d.clip.y!, d.eye.center[1]); near(d.clip.r!, re * 16); expect(d.clip.transform).toBe(''); expect(d.clip.parentTransform).toBe('');
  expect(d.admitted.fill).not.toBe('none'); expect(d.admitted.fill).not.toBe('rgba(0, 0, 0, 0)');
  if (id === 'current') { near(d.handle!.center[0], d.eye.center[0]); near(d.handle!.center[1], d.eye.center[1]); }
  const g = await graph(page); expect(g.width).toBe(760); expect(g.height).toBe(320); near(g.probes[id][0], 60 + (m.offset + 12) / 24 * 640, .0001); near(g.probes[id][1], 250 - fraction * 200, .0001);
  if (verifyCurve) {
    expect(g.curves[id]).toHaveLength(241); const failures: string[] = [];
    g.curves[id].forEach((point, i) => { const x = 60 + 640 * i / 240, value = overlap(m, -12 + i / 10) / (Math.PI * rb * rb), y = 250 - 200 * value; if (Math.abs(point[0] - x) > .0001 || Math.abs(point[1] - y) > .0001) failures.push(`${i}: native(${point.join(',')}) versus quadrature(${x},${y})`); });
    expect(failures).toEqual([]);
    for (let i = 0; i <= 120; i++) near(g.curves[id][i][1], g.curves[id][240 - i][1], .0001);
    for (let i = 121; i <= 240; i++) expect(g.curves[id][i][1] + .0001).toBeGreaterThanOrEqual(g.curves[id][i - 1][1]);
  }
  return { condition: m, area: d.area, admitted: d.fraction, eyeFill: d.eyeFill, clip: d.clip, curveChecked: verifyCurve };
}

async function points(page: Page, offset: number, kind: 'disks' | 'graph' = 'disks') {
  const target = kind === 'disks' ? '[data-pupil-disks="current"]' : '[data-pupil-graph]';
  await page.locator(target).scrollIntoViewIfNeeded();
  return page.locator(target).evaluate((node, p) => {
    const svg = node as SVGSVGElement, handle = svg.querySelector(p.kind === 'disks' ? '[data-pupil-handle]' : '[data-pupil-graph-handle]') as SVGCircleElement, matrix = svg.getScreenCTM()!, start = new DOMPoint(handle.cx.baseVal.value, handle.cy.baseVal.value).matrixTransform(matrix), end = new DOMPoint(p.kind === 'disks' ? 380 + 16 * p.offset : 60 + (p.offset + 12) / 24 * 640, p.kind === 'disks' ? 210 : handle.cy.baseVal.value).matrixTransform(matrix);
    return { start: { x: start.x, y: start.y }, end: { x: end.x, y: end.y } };
  }, { offset, kind });
}

async function mouseDrag(page: Page, offset: number, kind: 'disks' | 'graph' = 'disks') {
  const p = await points(page, offset, kind); await page.mouse.move(p.start.x, p.start.y); await page.mouse.down(); await page.mouse.move(p.end.x, p.end.y, { steps: 5 }); await page.mouse.up();
}

async function touchDrag(page: Page, offset: number, cancel = false, kind: 'disks' | 'graph' = 'disks') {
  const p = await points(page, offset, kind), cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p.start, id: 1 }] });
    for (let i = 1; i <= 5; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.start.x + (p.end.x - p.start.x) * i / 5, y: p.start.y + (p.end.y - p.start.y) * i / 5, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
  } finally { await cdp.detach(); }
}

async function multiTouch(page: Page) {
  const before = await physical(page), p = await points(page, -7), cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p.start, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.start.x + 12, y: p.start.y, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.start.x + 12, y: p.start.y, id: 1 }, { x: p.start.x + 60, y: p.start.y - 40, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...p.end, id: 1 }, { x: p.start.x + 90, y: p.start.y - 40, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally { await cdp.detach(); }
  await checkPhysical(page, before);
}

async function lostCapture(page: Page) {
  const before = await physical(page), p = await points(page, 6), svg = page.locator('[data-pupil-disks="current"]');
  await svg.evaluate(node => { node.addEventListener('gotpointercapture', event => { (window as any).__pupilPointer = (event as PointerEvent).pointerId; }, { once: true }); });
  await page.mouse.move(p.start.x, p.start.y); await page.mouse.down(); await page.mouse.move(p.end.x, p.end.y, { steps: 3 });
  await expect.poll(() => page.evaluate(() => (window as any).__pupilPointer)).toBeTruthy();
  await svg.evaluate(node => node.releasePointerCapture((window as any).__pupilPointer)); await page.mouse.move(p.end.x + 2, p.end.y); await page.mouse.up(); await checkPhysical(page, before);
  const hover = await points(page, -2); await page.mouse.move(hover.start.x, hover.start.y); await page.mouse.move(hover.end.x, hover.end.y, { steps: 3 }); await checkPhysical(page, before);
}

async function installManualRaf(page: Page) {
  await page.addInitScript(() => {
    let now = 0, next = 0; const pending = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = callback => { const id = ++next; pending.set(id, callback); return id; };
    window.cancelAnimationFrame = id => { pending.delete(id); };
    (window as any).__alignmentRaf = {
      pending: () => pending.size,
      async step(frames: number, duration = 100) {
        const sizes: number[] = [];
        for (let i = 0; i < frames; i++) {
          now += duration; const callbacks = Array.from(pending.values()); pending.clear();
          callbacks.forEach(callback => callback(now));
          // Allow the real React effect lifecycle to settle between frames.
          await new Promise(resolve => setTimeout(resolve, 0)); sizes.push(pending.size);
        }
        return sizes;
      }
    };
  });
}

async function pendingRaf(page: Page, expected: number) {
  await expect.poll(() => page.evaluate(() => (window as any).__alignmentRaf.pending())).toBe(expected);
}

async function stepRaf(page: Page, frames: number, expectedPending: number) {
  const sizes = await page.evaluate(frames => (window as any).__alignmentRaf.step(frames), frames);
  expect(sizes.every((size: number) => size === expectedPending)).toBe(true);
  return sizes;
}

async function sweepLifecycle(page: Page) {
  const toggle = page.locator('[data-pupil-sweep]'), evidence: any[] = [];
  await expect(toggle).toBeDisabled(); await expect(page.locator(root)).toHaveAttribute('data-pupil-sweeping', 'false'); await pendingRaf(page, 0);
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await expect(toggle).toBeEnabled(); await pendingRaf(page, 0);
  const frozen = await physical(page, 'pinned');
  async function start() { await toggle.click(); await expect(page.locator(root)).toHaveAttribute('data-pupil-sweeping', 'true'); await expect(page.locator('#birdlab-pupil-offset')).toHaveValue('-12'); await pendingRaf(page, 1); await stepRaf(page, 1, 1); }
  async function stopped(reason: string) {
    await expect(page.locator(root)).toHaveAttribute('data-pupil-sweeping', 'false'); await pendingRaf(page, 0); const condition = await physical(page); await stepRaf(page, 3, 0); await checkPhysical(page, condition); evidence.push({ reason, condition, pending: 0 });
  }
  await start(); const firstHalf = await stepRaf(page, 30, 1); await expect(page.locator('#birdlab-pupil-offset')).toHaveValue('0');
  const secondHalf: number[] = await page.evaluate(() => (window as any).__alignmentRaf.step(30)); expect(secondHalf.slice(0, -1).every(size => size === 1)).toBe(true); expect(secondHalf.at(-1)).toBe(0);
  await expect(page.locator('#birdlab-pupil-offset')).toHaveValue('12'); await stopped('bounded six-second endpoint'); await checkPhysical(page, frozen, 'pinned');
  evidence.push({ reason: 'single queued RAF during complete six-second sweep', firstHalf, secondHalf, midpoint: 0, endpoint: 12 });

  await start(); await stepRaf(page, 5, 1); await page.locator('#birdlab-pupil-offset').fill('2.1'); await stopped('manual offset edit');
  await start(); await stepRaf(page, 5, 1); await page.locator('[data-pupil-pin]').click(); await stopped('freeze'); await checkPhysical(page, await physical(page), 'pinned');
  await start(); await stepRaf(page, 5, 1); await page.locator('#birdlab-optics-mag').fill('10'); await stopped('linked magnification edit');

  await start(); await stepRaf(page, 5, 1); await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(toggle).toBeDisabled(); await stopped('reduced-motion preference');
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await expect(toggle).toBeEnabled(); await pendingRaf(page, 0);
  await start(); await stepRaf(page, 5, 1);
  // Drive the visibility lifecycle directly; positions, rendering and RAF remain
  // the real application. Returning visible must not restart the display aid.
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await stopped('document-hidden lifecycle'); await page.evaluate(() => { Reflect.deleteProperty(document, 'hidden'); document.dispatchEvent(new Event('visibilitychange')); }); await pendingRaf(page, 0);
  await start(); await stepRaf(page, 5, 1); await page.getByRole('button', { name: '← Menu', exact: true }).first().click(); await expect(page.locator(root)).toHaveCount(0); await pendingRaf(page, 0); await stepRaf(page, 5, 0);
  evidence.push({ reason: 'unmount', pending: 0, automaticRestart: false });
  return evidence;
}

test('native circle clips, admitted areas and every fixed-scale curve sample agree with independent vertical-chord quadrature', async ({ page }) => {
  const errors = await mount(page), evidence: any[] = [];
  await verify(page, defaults, 'current', true);
  // Includes equal disks, both containment directions, exact internal/external
  // tangency, partial lenses, opposite signs and the complete slider range.
  for (const configuration of [
    { magnification: 8, objective: 40, pupil: 3 },
    { magnification: 8, objective: 24, pupil: 3 },
    { magnification: 4, objective: 48, pupil: 6 },
    { magnification: 12, objective: 24, pupil: 6 },
    { magnification: 12, objective: 50, pupil: 3 }
  ]) {
    const m = { ...configuration, offset: 0 }; await settings(page, m); evidence.push(await verify(page, m, 'current', true));
    for (const offset of [-12, -4, -3, -2, -1, .1, 1, 2, 3, 4, 8, 12]) { await page.locator('#birdlab-pupil-offset').fill(String(offset)); evidence.push(await verify(page, { ...m, offset })); }
  }
  await settings(page, { magnification: 8, objective: 40, pupil: 3, offset: 4 }); near((await drawing(page)).area, 0);
  await page.locator('#birdlab-pupil-offset').fill('1'); near((await drawing(page)).area, Math.PI * 1.5 ** 2, 1e-7);
  await page.locator('#birdlab-pupil-offset').fill('0'); const contained = await drawing(page); near(contained.eyeFill, 1); expect(contained.fraction).toBeLessThan(1);
  await settings(page, { magnification: 12, objective: 24, pupil: 6, offset: 0 }); const insideEye = await drawing(page); near(insideEye.fraction, 1); expect(insideEye.eyeFill).toBeLessThan(1);
  // The pre-existing woodland window continues to show magnification alone.
  expect(await page.locator('[data-optics-zoom]').getAttribute('data-optics-zoom')).toBe('12');
  expect(errors).toEqual([]); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  writeFileSync(resolve(report, 'geometry.json'), JSON.stringify({ cases: evidence, errors, oracle: 'Independent adaptive integration of shared vertical chords; every native 241-point curve checked in six configurations.' }, null, 2));
});

test('full frozen alignment retains every optical setting through host writes and restores it without awarding learner progress', async ({ page }) => {
  const errors = await mount(page), before = await rewards(page), pinned: Condition = { magnification: 8, objective: 42, pupil: 6, offset: 3 }, changed: Condition = { magnification: 10, objective: 25, pupil: 3, offset: -2 };
  await expect(page.locator('[data-pupil-clear]')).toBeDisabled(); await expect(page.locator('[data-pupil-experiment="restore"]')).toBeDisabled();
  await settings(page, pinned); await page.locator('[data-pupil-pin]').click(); const saved = await verify(page, pinned, 'pinned', true);
  await settings(page, changed); await verify(page, changed, 'current', true); await verify(page, pinned, 'pinned', true);
  await page.locator('[data-pupil-experiment="mirror"]').click(); await verify(page, { ...changed, offset: 2 }); await checkPhysical(page, pinned, 'pinned');
  await page.locator('[data-pupil-experiment="recenter"]').click(); await verify(page, { ...changed, offset: 0 });
  await page.evaluate(() => { const w = window as any; w.__toolData.birdLab.qaAlignmentWrite = 'kept'; w.__rerender(); });
  await verify(page, { ...changed, offset: 0 }); await verify(page, pinned, 'pinned', true);
  await page.locator('[data-pupil-experiment="restore"]').click(); await verify(page, pinned); await expect(page.locator('#birdlab-optics-mag')).toHaveValue('8'); await expect(page.locator('#birdlab-optics-objective')).toHaveValue('42'); await expect(page.getByRole('button', { name: 'Low light · 6 mm', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-pupil-experiment="match"]').click(); await verify(page, { ...pinned, objective: 48 }); await verify(page, pinned, 'pinned');
  await settings(page, { magnification: 12, objective: 42, pupil: 6, offset: -3 }); await expect(page.locator('[data-pupil-experiment="match"]')).toBeDisabled();
  await settings(page, { magnification: 4, objective: 20, pupil: 3, offset: -3 }); await expect(page.locator('[data-pupil-experiment="match"]')).toBeDisabled();
  await page.locator('[data-pupil-reset]').click(); await verify(page, { magnification: 4, objective: 20, pupil: 3, offset: 0 }); await verify(page, pinned, 'pinned');
  await page.locator('[data-pupil-pin]').click(); const replacement = { magnification: 4, objective: 20, pupil: 3, offset: 0 }; await verify(page, replacement, 'pinned', true);
  await page.locator('[data-pupil-clear]').click(); await expect(page.locator('[data-pupil-pin]')).toBeFocused(); await expect(page.locator('[data-pupil-condition="pinned"]')).toHaveCount(0); await expect(page.locator('[data-pupil-curve="pinned"]')).toHaveCount(0); await expect(page.locator('[data-pupil-probe="pinned"]')).toHaveCount(0);
  await expect(page.locator('[data-pupil-experiment="restore"]')).toBeDisabled(); expect(await rewards(page)).toEqual(before);
  expect(await page.evaluate(() => (window as any).__toolData.birdLab.qaAlignmentWrite)).toBe('kept');
  await page.getByRole('button', { name: '← Menu', exact: true }).first().click(); await expect(page.locator(root)).toHaveCount(0);
  expect(errors).toEqual([]); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  writeFileSync(resolve(report, 'comparison.json'), JSON.stringify({ saved, replacement, progress: before, errors, completeRestore: true, contextRetained: true }, null, 2));
});

test('real pointer and touch transactions, keyboard alignment and native labels remain usable in three hosts with scoped accessibility checks', async ({ page }) => {
  await installManualRaf(page);
  const errors = await mount(page), evidence: any[] = [], captures: any[] = [], before = await rewards(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); await settings(page, defaults); await page.locator('[data-pupil-pin]').click();
    await mouseDrag(page, 2.5); await verify(page, { ...defaults, offset: 2.5 });
    await mouseDrag(page, -3.4, 'graph'); await verify(page, { ...defaults, offset: -3.4 });
    await touchDrag(page, 3.2); await verify(page, { ...defaults, offset: 3.2 });
    await touchDrag(page, -5, true); await verify(page, { ...defaults, offset: 3.2 });
    await touchDrag(page, -1.7, false, 'graph'); await verify(page, { ...defaults, offset: -1.7 });
    await multiTouch(page); await lostCapture(page); await touchDrag(page, 1.4); await verify(page, { ...defaults, offset: 1.4 });
    for (const selector of ['[data-pupil-disks="current"]', '[data-pupil-graph]', '#birdlab-pupil-offset']) {
      const control = page.locator(selector); await control.focus(); await page.keyboard.press('Home'); await verify(page, { ...defaults, offset: -12 }); await page.keyboard.press('End'); await verify(page, { ...defaults, offset: 12 }); await page.keyboard.press('ArrowLeft'); await verify(page, { ...defaults, offset: 11.9 }); await expect(control).toBeFocused();
    }
    const labels = await page.locator(root + ' svg').evaluateAll(nodes => {
      const failures: string[] = [];
      for (const node of nodes) {
        const svg = node as SVGSVGElement, box = svg.viewBox.baseVal, name = svg.getAttribute('data-pupil-disks') || 'curve', labels = Array.from(svg.querySelectorAll('text')).filter(n => getComputedStyle(n).display !== 'none').map(node => { const e = node as SVGTextElement, b = e.getBBox(), matrix = e.getScreenCTM()!, native = svg.getScreenCTM()!.inverse().multiply(matrix), start = new DOMPoint(b.x, b.y).matrixTransform(native), end = new DOMPoint(b.x + b.width, b.y + b.height).matrixTransform(native); return { text: e.textContent!, left: start.x, top: start.y, right: end.x, bottom: end.y, font: parseFloat(getComputedStyle(e).fontSize) * Math.hypot(matrix.a, matrix.b) }; });
        for (const label of labels) if (!(label.left >= -.01 && label.top >= -.01 && label.right <= box.width + .01 && label.bottom <= box.height + .01 && label.font >= 11)) failures.push(name + ': bounds/font ' + JSON.stringify(label));
        for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) { const a = labels[i], b = labels[j]; if (Math.min(a.right, b.right) > Math.max(a.left, b.left) + .01 && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + .01) failures.push(name + ': text overlap ' + a.text + ' / ' + b.text); }
      }
      return failures;
    }); expect(labels).toEqual([]);
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const node of await page.locator(root + ', ' + root + ' [data-pupil-condition], ' + root + ' [data-pupil-graph]').all()) { const b = (await node.boundingBox())!; expect(b.x).toBeGreaterThanOrEqual(host.x - 1); expect(b.x + b.width).toBeLessThanOrEqual(host.x + host.width + 1); expect(await node.evaluate(n => n.scrollWidth - n.clientWidth)).toBeLessThanOrEqual(1); }
    const widths = await page.locator('[data-pupil-disks]').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().width)); expect(widths).toHaveLength(2); near(widths[0], widths[1], 1);
    for (const node of await page.locator(root + ' button, ' + root + ' input').all()) { const b = (await node.boundingBox())!; expect(b.height).toBeGreaterThanOrEqual(44); expect(b.width).toBeGreaterThanOrEqual(44); }
    const violations = await page.evaluate(async rules => (await (window as any).axe.run(document.querySelector('[data-birdlab-pupil-study]'), { runOnly: { type: 'rule', values: rules } })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })), rules);
    expect(violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    evidence.push({ ...layout, accessibilityRules: rules, violations, nativeLabelChecks: labels, mouse: true, touch: true, pointerCancelRestores: true, lostCaptureRestores: true, multiContactRestores: true, keyboard: true, overflow: 0 });
  }
  for (const viewport of [1280, 390]) {
    await sizing(page, viewport, viewport === 1280 ? 1100 : 390); await settings(page, { magnification: 8, objective: 42, pupil: 6, offset: 0 }); await page.locator('[data-pupil-pin]').click(); await page.locator('#birdlab-pupil-offset').fill('3'); await verify(page, { magnification: 8, objective: 42, pupil: 6, offset: 3 });
    captures.push(await capture(page, root, 'alignment-' + viewport + '.png'));
  }
  const sweep = await sweepLifecycle(page);
  expect(await rewards(page)).toEqual(before); expect(errors).toEqual([]); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  writeFileSync(resolve(report, 'interactions.json'), JSON.stringify({ cases: evidence, captures, sweep, errors }, null, 2));
});
