import { test, expect, type Page, type Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ mode: 'default', retries: 0, timeout: 180_000 });
const harness = new GlHarness({
  toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  extraScripts: ['node_modules/axe-core/axe.min.js'],
  width: 1100, height: 960, appStyles: true, layout: 'document',
  probes: `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.round5Raptor={scene,camera,renderer};return render(scene,camera);};return renderer;};})();`,
});
const captures = resolve('reports/avian-simulations-round5-2026-10-18/final');
test.beforeAll(async () => { mkdirSync(captures, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function sizing(page: Page, viewport: number, host = viewport) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.evaluate(width => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    wrap.style.width = width + 'px'; wrap.style.maxWidth = '100%';
    wrap.setAttribute('data-stem-tool-shell', 'true');
  }, host);
}
async function audit(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeVisible();
  const violations = await page.evaluate(async selector => {
    const report = await (window as any).axe.run(document.querySelector(selector), {
      runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] },
    });
    return report.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
  }, selector);
  expect(violations).toEqual([]);
}
async function contained(page: Page, element: Locator) {
  const host = await page.locator('#wrap').boundingBox(), box = await element.boundingBox();
  expect(box).not.toBeNull(); expect(host).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(host!.x - 1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(host!.x + host!.width + 1);
  expect(await element.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
}
async function command(page: Page, action: string, value?: unknown) {
  await page.locator('[data-raptor-canvas]').evaluate((canvas: any, input) => canvas._rhCommand(input.action, input.value), { action, value });
}
async function snapshot(page: Page): Promise<any> {
  return page.locator('[data-raptor-canvas]').evaluate((canvas: any) => canvas._rhSnapshot());
}
async function step(page: Page, frames = 1, ms = 25) {
  await page.evaluate(({ frames, ms }) => { for (let i = 0; i < frames; i++) (window as any).round5Step(ms); }, { frames, ms });
}
async function mountFlight(page: Page, reduced = false) {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await page.addInitScript(() => {
    let time = 1000, next = 1, seed = 731;
    const callbacks = new Map<number, FrameRequestCallback>();
    Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    performance.now = () => time;
    window.requestAnimationFrame = callback => { const id = next++; callbacks.set(id, callback); return id; };
    window.cancelAnimationFrame = id => { callbacks.delete(id); };
    (window as any).round5Step = (ms: number) => { time += ms; const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(callback => callback(time)); };
    // Observe the real canvas draw commands, preserving every native operation.
    const prototype = CanvasRenderingContext2D.prototype as any;
    for (const name of ['clearRect', 'beginPath', 'moveTo', 'lineTo', 'stroke']) {
      const original = prototype[name];
      prototype[name] = function (...args: any[]) {
        if (this.canvas.hasAttribute('data-raptor-motion-map')) {
          if (name === 'clearRect') (window as any).round5MapPaths = [];
          if (name === 'beginPath') this.round5Path = [];
          if (name === 'moveTo' || name === 'lineTo') (this.round5Path ||= []).push(args.slice(0, 2));
          if (name === 'stroke') ((window as any).round5MapPaths ||= []).push({ color: this.strokeStyle, width: this.lineWidth, points: (this.round5Path || []).slice() });
        }
        return original.apply(this, args);
      };
    }
  });
  // Readiness uses timer polling because this spec deliberately owns RAF.
  // A RAF-polled wait cannot make progress until round5Step is available.
  await page.goto(`${harness.base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.raptorHunt, undefined, { polling: 100, timeout: 30_000 });
  await page.evaluate(() => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    wrap.style.width = '1100px'; wrap.style.maxWidth = '100%'; wrap.setAttribute('data-stem-tool-shell', 'true');
    (window as any).__mount({ raptorHunt: { activeSection: 'hunt', selectedSpecies: 'redTail', activeMission: 'open',
      flightSession: { speciesId: 'redTail', missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: 'low' } });
  });
  await page.waitForFunction(() => !!(document.querySelector('[data-raptor-canvas]') as any)?._rhSnapshot, undefined, { polling: 100, timeout: 30_000 });
  await sizing(page, 1280, 1100);
  await command(page, 'environment', { windSpeed: 8, windDir: Math.PI / 2 });
  await step(page, 6);
}
function frozen(before: any, after: any) {
  for (const key of ['motionTimeMs', 'calories', 'stamina', 'missionCatches', 'practiceTrailScore', 'practiceTrailBestScore', 'raptorPosition', 'motionTrack', 'motionVectors']) {
    expect(after[key], key).toEqual(before[key]);
  }
}

test('motion arrows and north-up map depict the actual simulated displacement on one shared scale', async ({ page }) => {
  await mountFlight(page);
  const toggle = page.getByRole('button', { name: 'Show horizontal motion lens', exact: true });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click(); await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await step(page, 24);
  const before = await snapshot(page); await step(page); const after = await snapshot(page);
  expect(after.motionLensVisible).toBe(true);
  expect(after.motionTrack.length).toBeGreaterThan(2);
  expect(after.motionConstrained).toBe(false);
  const dt = (after.motionTimeMs - before.motionTimeMs) / 1000;
  expect(dt).toBeGreaterThan(0);
  for (const axis of ['x', 'z']) {
    expect(after.motionVectors.ground[axis]).toBeCloseTo((after.raptorPosition[axis] - before.raptorPosition[axis]) / dt, 5);
    expect(after.motionVectors.ground[axis]).toBeCloseTo(after.motionVectors.air[axis] + after.motionVectors.wind[axis], 7);
    expect(after.motionTrack.at(-1)[axis]).toBeCloseTo(after.raptorPosition[axis], 7);
  }
  await command(page, 'pause');
  const paused = await snapshot(page);
  const rendered = await page.evaluate(() => {
    const w = window as any, review = w.round5Raptor, group = review.scene.getObjectByName('raptor-horizontal-motion-lens');
    group.updateMatrixWorld(true);
    return { visible: group.visible, position: group.position.toArray(), shaders: review.renderer.info.programs.every((p: any) => !p.diagnostics || p.diagnostics.runnable),
      arrows: ['air', 'wind', 'ground'].map(kind => { const arrow = group.getObjectByName('raptor-motion-' + kind); return { kind, visible: arrow.visible, position: arrow.position.toArray(),
        direction: new w.THREE.Vector3(0, 1, 0).applyQuaternion(arrow.quaternion).toArray(), length: arrow.line.scale.y + arrow.cone.scale.y }; }), paths: w.round5MapPaths };
  });
  expect(rendered.visible).toBe(true); expect(rendered.shaders).toBe(true);
  expect(rendered.position[0]).toBeCloseTo(paused.raptorPosition.x, 7);
  expect(rendered.position[2]).toBeCloseTo(paused.raptorPosition.z, 7);
  for (const arrow of rendered.arrows) {
    const vector = paused.motionVectors[arrow.kind], magnitude = Math.hypot(vector.x, vector.z);
    expect(arrow.visible).toBe(true);
    expect(arrow.direction[0]).toBeCloseTo(vector.x / magnitude, 6);
    expect(arrow.direction[2]).toBeCloseTo(vector.z / magnitude, 6);
    expect(arrow.length).toBeCloseTo(magnitude * paused.motionArrowScale, 5);
  }
  const scale = 210 / paused.motionMapRange;
  const trace = rendered.paths.find((path: any) => path.color === '#c2d1d9');
  expect(trace.points).toHaveLength(paused.motionTrack.length);
  for (let i = 0; i < trace.points.length; i++) {
    expect(trace.points[i][0]).toBeCloseTo(210 + (paused.motionTrack[i].x - paused.raptorPosition.x) * scale, 6);
    expect(trace.points[i][1]).toBeCloseTo(140 + (paused.motionTrack[i].z - paused.raptorPosition.z) * scale, 6);
  }
  const air = rendered.paths.find((path: any) => path.color === '#67e8f9' && Math.abs(path.width - 2.6) < .01);
  const wind = rendered.paths.find((path: any) => path.color === '#fcd34d' && Math.abs(path.width - 2.6) < .01);
  const ground = rendered.paths.find((path: any) => path.color === '#c4b5fd' && Math.abs(path.width - 2.6) < .01);
  expect(air.points[0]).toEqual([210, 140]); expect(wind.points[0]).toEqual(air.points[1]);
  expect(wind.points[1][0]).toBeCloseTo(ground.points[1][0], 6);
  expect(wind.points[1][1]).toBeCloseTo(ground.points[1][1], 6);
  const nativeRender = await page.evaluate(() => {
    const renderer = (window as any).round5Raptor.renderer;
    return { ownsCanvas: renderer.domElement === document.querySelector('[data-raptor-canvas]') && renderer.domElement.isConnected,
      liveContext: !renderer.getContext().isContextLost(), calls: renderer.info.render.calls,
      shaders: renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable) };
  });
  expect(nativeRender).toMatchObject({ ownsCanvas: true, liveContext: true, shaders: true }); expect(nativeRender.calls).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('paused motion lens survives scenic/study presentation and stays usable in phone and embedded layouts', async ({ page }) => {
  await mountFlight(page, true);
  await command(page, 'motionLens', true); await step(page, 8); await command(page, 'pause');
  const before = await snapshot(page), panel = page.locator('[data-raptor-motion-lens]');
  await expect(panel).toBeVisible();
  await command(page, 'scenic', true); await expect(panel).toBeHidden();
  expect((await snapshot(page)).motionLensEnabled).toBe(true);
  await command(page, 'scenic', false); await expect(panel).toBeVisible();
  await command(page, 'study'); await expect(panel).toBeHidden();
  await page.locator('.rh-study-close').click(); await expect(panel).toBeVisible();
  await step(page, 1, 60_000); frozen(before, await snapshot(page));
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host); await step(page);
    await contained(page, panel); await contained(page, panel.locator('[data-raptor-motion-map]'));
    if (layout.host <= 500) {
      await expect.poll(async () => (await panel.locator('[data-raptor-motion-map]').boundingBox())!.width).toBeGreaterThan(300);
      const map = await panel.locator('[data-raptor-motion-map]').boundingBox(), heading = await panel.locator('h3').boundingBox();
      expect(heading!.y).toBeGreaterThanOrEqual(map!.y + map!.height);
    }
    expect(await panel.locator('.rh-motion-readouts dd').evaluateAll(elements => elements.every(element => element.scrollWidth <= element.clientWidth + 1))).toBe(true);
    await audit(page, '[data-raptor-motion-lens]');
    frozen(before, await snapshot(page));
  }
  await page.getByRole('button', { name: 'Show horizontal motion lens', exact: true }).focus();
  await page.keyboard.press('Space'); await expect(panel).toBeHidden();
  await page.getByRole('button', { name: 'Show horizontal motion lens', exact: true }).focus();
  await page.keyboard.press('Space'); await expect(panel).toBeVisible();
  frozen(before, await snapshot(page));
  await command(page, 'pause'); await step(page, 3);
  expect((await snapshot(page)).motionTimeMs).toBeGreaterThan(before.motionTimeMs);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

async function mountStoop(page: Page, species = 'peregrine') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { raptorHunt: { activeSection: 'stoop', selectedSpecies: species } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100);
  await expect(page.locator('[data-raptor-stoop-inspector]')).toBeVisible();
}
async function fallSample(page: Page) {
  return page.locator('[data-raptor-stoop-inspector]').evaluate(element => {
    const data = (element as HTMLElement).dataset;
    const bird = element.querySelector('[data-stoop-bird]') as SVGGraphicsElement;
    return { index: Number(data.sampleIndex), time: Number(data.time), altitude: Number(data.altitude), speed: Number(data.speed), drag: Number(data.dragRatio),
      end: data.windowEnd, birdY: bird.transform.baseVal.consolidate()!.matrix.f };
  });
}
async function progress(page: Page) {
  return page.evaluate(() => Object.fromEntries(Object.entries((window as any).__toolData.raptorHunt).filter(([key]) => !['stoopInspectFraction', 'stoopSimVars'].includes(key))));
}
async function plottedSampleMatches(page: Page, index: number) {
  const geometry = await page.locator('[data-raptor-fall-curve]').evaluate((element, index) => {
    const cursor = element.querySelector('[data-stoop-chart-cursor]')!;
    const circles = [...cursor.querySelectorAll('circle')].map(circle => [circle.cx.baseVal.value, circle.cy.baseVal.value]);
    const paths = ['#f97316', '#ef4444'].map(color => {
      const numbers = element.querySelector(`path[stroke="${color}"]`)!.getAttribute('d')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      return numbers.slice(index * 2, index * 2 + 2);
    });
    return { circles, paths, x: (cursor.querySelector('line') as SVGLineElement).x1.baseVal.value };
  }, index);
  for (let curve = 0; curve < 2; curve++) for (let axis = 0; axis < 2; axis++) {
    expect(Math.abs(geometry.circles[curve][axis] - geometry.paths[curve][axis])).toBeLessThan(.06);
  }
  expect(geometry.x).toBeCloseTo(geometry.circles[0][0], 6);
}

test('manual Stoop inspection links plotted time, altitude and speed and distinguishes the observation window from impact', async ({ page }) => {
  await mountStoop(page);
  const inspector = page.locator('[data-raptor-stoop-inspector]'), slider = page.getByRole('slider', { name: 'Inspect fall time', exact: true });
  const unchanged = await progress(page);
  const areaInput = page.getByRole('slider', { name: 'Frontal cross-section area in square meters', exact: true });
  expect(Number(await areaInput.inputValue())).toBe(.0065);
  await expect(areaInput.locator('..')).toContainText('0.00650');
  await page.getByRole('slider', { name: 'Altitude m', exact: true }).press('End');
  await inspector.getByRole('button', { name: 'Start', exact: true }).click();
  const start = await fallSample(page);
  expect(start.time).toBe(0); expect(start.speed).toBe(0); expect(start.altitude).toBe(2000); expect(start.drag).toBe(0);
  await plottedSampleMatches(page, start.index);
  await inspector.getByRole('button', { name: 'Halfway', exact: true }).click();
  const half = await fallSample(page);
  expect(half.time).toBeGreaterThan(5); expect(half.time).toBeLessThan(7);
  expect(half.altitude).toBeLessThan(start.altitude); expect(half.speed).toBeGreaterThan(0); expect(half.birdY).toBeGreaterThan(start.birdY);
  const parameters = await page.evaluate(() => {
    const value = (label: string) => Number((document.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement).value);
    return { mass: value('Mass in kilograms'), cd: value('Drag coefficient'), area: value('Frontal cross-section area in square meters') };
  });
  // Independent closed-form quadratic-drag solution checks the sampled model,
  // allowing the small integration error from its explicit 0.05-second steps.
  const terminal = Math.sqrt(2 * parameters.mass * 9.81 / (1.225 * parameters.cd * parameters.area));
  const expectedSpeed = terminal * Math.tanh(9.81 * half.time / terminal);
  const expectedAltitude = 2000 - terminal ** 2 / 9.81 * Math.log(Math.cosh(9.81 * half.time / terminal));
  expect(Math.abs(half.speed - expectedSpeed)).toBeLessThan(.6);
  expect(Math.abs(half.altitude - expectedAltitude)).toBeLessThan(2);
  expect(half.drag).toBeCloseTo((half.speed / terminal) ** 2, 7);
  await plottedSampleMatches(page, half.index);
  await expect(page.locator('[data-stoop-chart-cursor]')).toHaveAttribute('data-time', String(half.time));
  await expect(slider).toHaveAttribute('aria-valuetext', `${half.time.toFixed(2)} s · ${half.altitude.toFixed(1)} m · ${half.speed.toFixed(1)} m/s`);
  await inspector.getByRole('button', { name: 'Last sample', exact: true }).click();
  const last = await fallSample(page);
  expect(last.time).toBeGreaterThan(half.time); expect(last.altitude).toBeGreaterThan(0); expect(last.end).toBe('aloft');
  expect(last.speed).toBeGreaterThan(half.speed); expect(last.birdY).toBeGreaterThan(half.birdY);
  await plottedSampleMatches(page, last.index);
  await expect(inspector.locator('[data-stoop-window-note]')).toContainText(/12|window/i);
  await expect(inspector.locator('[data-stoop-window-note]')).not.toContainText('ground comes before');
  await page.waitForTimeout(250); expect(await fallSample(page)).toEqual(last);
  await page.getByRole('slider', { name: 'Altitude m', exact: true }).press('Home');
  expect((await fallSample(page)).end).toBe('ground');
  const max = Number(await slider.getAttribute('max')); expect(Number(await slider.inputValue())).toBe(max);
  await page.getByRole('slider', { name: 'Mass in kilograms', exact: true }).press('End');
  await page.getByRole('button', { name: 'Load active species presets', exact: true }).click();
  expect(Number(await page.getByRole('slider', { name: 'Mass in kilograms', exact: true }).inputValue())).toBeLessThan(8);
  expect(Number(await page.getByRole('slider', { name: 'Altitude m', exact: true }).inputValue())).toBe(600);
  expect(Number(await slider.inputValue())).toBe(Number(await slider.getAttribute('max')));
  expect(await progress(page)).toEqual(unchanged);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  // Small and large species once fell outside the sliders' representable
  // values. The visible inputs must describe the same model as the samples.
  for (const preset of [{ id: 'peregrine', mass: .95, area: .00648 }, { id: 'kestrel', mass: .12, area: .00234 }, { id: 'condor', mass: 9.5, area: .072 }]) {
    await harness.destroy(page); await mountStoop(page, preset.id);
    await page.getByRole('button', { name: 'Load active species presets', exact: true }).click();
    const massInput = page.getByRole('slider', { name: 'Mass in kilograms', exact: true });
    const presetArea = page.getByRole('slider', { name: 'Frontal cross-section area in square meters', exact: true });
    expect(Number(await massInput.inputValue()), `${preset.id} mass must not round or clamp`).toBe(preset.mass);
    expect(Number(await presetArea.inputValue()), `${preset.id} area must not round or clamp`).toBe(preset.area);
    await expect(massInput.locator('..')).toContainText(preset.mass.toFixed(2));
    await expect(presetArea.locator('..')).toContainText(preset.area.toFixed(5));
    expect(await massInput.evaluate((element: HTMLInputElement) => element.validity.valid)).toBe(true);
    expect(await presetArea.evaluate((element: HTMLInputElement) => element.validity.valid)).toBe(true);
    expect(Number(await page.getByRole('slider', { name: 'Drag coefficient', exact: true }).inputValue())).toBe(.18);
    await page.getByRole('slider', { name: 'Altitude m', exact: true }).press('End');
    await page.locator('[data-raptor-stoop-inspector]').getByRole('button', { name: 'Halfway', exact: true }).click();
    const sample = await fallSample(page), limit = Math.sqrt(2 * preset.mass * 9.81 / (1.225 * .18 * preset.area));
    expect(Math.abs(sample.speed - limit * Math.tanh(9.81 * sample.time / limit)), preset.id).toBeLessThan(.6);
    expect(Math.abs(sample.altitude - (2000 - limit ** 2 / 9.81 * Math.log(Math.cosh(9.81 * sample.time / limit)))), preset.id).toBeLessThan(2);
    expect(sample.drag).toBeCloseTo((sample.speed / limit) ** 2, 7);
    await plottedSampleMatches(page, sample.index);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  }
});

test('Stoop scrubbing stays keyboard operable, still and accessible on a phone and in a 500px panel', async ({ page }) => {
  await mountStoop(page);
  const inspector = page.locator('[data-raptor-stoop-inspector]'), slider = page.getByRole('slider', { name: 'Inspect fall time', exact: true });
  const unchanged = await progress(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host);
    await slider.focus(); await page.keyboard.press('Home'); await expect(slider).toBeFocused();
    const first = await fallSample(page); expect(first.index).toBe(0);
    await page.keyboard.press('ArrowRight'); await expect(slider).toBeFocused();
    const second = await fallSample(page); expect(second.index).toBe(1); expect(second.time).toBeCloseTo(.05, 9);
    await page.keyboard.press('End');
    const last = await fallSample(page); expect(last.index).toBe(Number(await slider.getAttribute('max')));
    await contained(page, inspector); await contained(page, inspector.locator('.rh-stoop-drop-scene')); await contained(page, slider);
    if (layout.host <= 500) {
      const scene = await inspector.locator('.rh-stoop-drop-scene').boundingBox(), heading = await inspector.locator('h3').boundingBox();
      expect(heading!.y).toBeGreaterThanOrEqual(scene!.y + scene!.height);
    }
    expect(await inspector.locator('.rh-stoop-sample-values dd').evaluateAll(elements => elements.every(element => element.scrollWidth <= element.clientWidth + 1))).toBe(true);
    await audit(page, '[data-raptor-stoop-inspector]');
    if (layout.host !== 500) await inspector.screenshot({ path: resolve(captures, `raptor-stoop-inspector-${layout.viewport}.png`) });
    await page.waitForTimeout(150); expect(await fallSample(page)).toEqual(last);
    expect(await progress(page)).toEqual(unchanged);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
