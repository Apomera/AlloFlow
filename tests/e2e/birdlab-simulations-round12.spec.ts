import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
test.describe.configure({ mode: 'default', retries: 0, timeout: 180_000 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document' });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((element: HTMLElement, width) => {
    element.style.width = width + 'px'; element.style.maxWidth = '100%'; element.setAttribute('data-stem-tool-shell', 'true');
  }, host);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'vocalDeep', blXp: 0, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100);
  await expect(page.locator('[data-birdlab-sound-study]')).toBeVisible();
}
type Model = { fa: number; fb: number; aa: number; ab: number; phase: number };
const examples: { id: string; model: Model }[] = [
  { id: 'two', model: { fa: 400, fb: 600, aa: 70, ab: 70, phase: 0 } },
  { id: 'same', model: { fa: 500, fb: 500, aa: 70, ab: 70, phase: 0 } },
  { id: 'opposite', model: { fa: 500, fb: 500, aa: 70, ab: 70, phase: 180 } },
  { id: 'one', model: { fa: 400, fb: 600, aa: 70, ab: 0, phase: 0 } },
  { id: 'near', model: { fa: 400, fb: 420, aa: 70, ab: 70, phase: 0 } },
];
async function painted(page: Page) {
  return page.locator('[data-sound-traces="current"]').evaluate(element => {
    return [...element.querySelectorAll('[data-sound-wave]')].map(node => {
      const path = node as SVGPathElement, chart = path.ownerSVGElement!, cursor = chart.querySelector('[data-sound-cursor]') as SVGLineElement;
      const sample = chart.querySelector('[data-sound-sample]') as SVGCircleElement, box = path.getBBox();
      const numbers = path.getAttribute('d')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number), points: number[][] = [];
      for (let index = 0; index < numbers.length; index += 2) points.push([numbers[index], numbers[index + 1]]);
      const onStroke = points.filter((_, index) => index % 36 === 0).every(point => path.isPointInStroke(new DOMPoint(point[0], point[1])));
      return { key: path.getAttribute('data-sound-wave'), points, length: path.getTotalLength(), box: { x: box.x, y: box.y, width: box.width, height: box.height },
        onStroke, cursor: cursor.x1.baseVal.value, sample: [sample.cx.baseVal.value, sample.cy.baseVal.value] };
    });
  });
}
async function checkPaint(page: Page, model: Model, milliseconds: number) {
  const curves = await painted(page);
  for (const curve of curves) {
    expect(curve.points).toHaveLength(721); expect(curve.onStroke).toBe(true); expect(curve.length).toBeGreaterThanOrEqual(659.99);
    expect(curve.box.x).toBeCloseTo(40, 2); expect(curve.box.width).toBeCloseTo(660, 2);
    expect(curve.box.y).toBeGreaterThanOrEqual(20 - .01); expect(curve.box.y + curve.box.height).toBeLessThanOrEqual(140 + .01);
    for (let index = 0; index < curve.points.length; index++) {
      const seconds = index / 720 * .02;
      const a = model.aa / 100 * Math.sin(2 * Math.PI * model.fa * seconds);
      const b = model.ab / 100 * Math.sin(2 * Math.PI * model.fb * seconds + model.phase * Math.PI / 180);
      const expected = curve.key === 'a' ? a : curve.key === 'b' ? b : a + b;
      expect(curve.points[index][0]).toBeCloseTo(40 + 660 * index / 720, 2);
      expect(curve.points[index][1]).toBeCloseTo(80 - 30 * expected, 2);
    }
    const a = model.aa / 100 * Math.sin(2 * Math.PI * model.fa * milliseconds / 1000);
    const b = model.ab / 100 * Math.sin(2 * Math.PI * model.fb * milliseconds / 1000 + model.phase * Math.PI / 180);
    const expected = curve.key === 'a' ? a : curve.key === 'b' ? b : a + b;
    // SVGAnimatedLength values are stored as Float32 by Chromium. At this
    // 740-unit chart scale one ULP can exceed 0.00005; allow 0.0001 SVG units.
    expect(Math.abs(curve.cursor - (40 + 33 * milliseconds))).toBeLessThan(1e-4);
    expect(Math.abs(curve.sample[0] - curve.cursor)).toBeLessThan(1e-4);
    expect(Math.abs(curve.sample[1] - (80 - 30 * expected))).toBeLessThan(1e-4);
    await expect(page.locator('[data-sound-readings="current"] [data-sound-value="' + curve.key + '"]')).toHaveText(expected.toFixed(3));
  }
  const lines = await page.locator('[data-sound-spectrum="current"]').evaluate(element => [...element.querySelectorAll('[data-sound-spectral-line]')].map(node => {
    const line = node as SVGLineElement;
    return { x: line.x1.baseVal.value, endX: line.x2.baseVal.value, startY: line.y1.baseVal.value, endY: line.y2.baseVal.value };
  }));
  let expected: { frequency: number; amplitude: number }[];
  if (model.fa === model.fb) {
    const phi = model.phase * Math.PI / 180;
    const amplitude = Math.hypot(model.aa / 100 + model.ab / 100 * Math.cos(phi), model.ab / 100 * Math.sin(phi));
    expected = amplitude < 1e-8 ? [] : [{ frequency: model.fa, amplitude }];
  } else expected = [{ frequency: model.fa, amplitude: model.aa / 100 }, { frequency: model.fb, amplitude: model.ab / 100 }].filter(peak => peak.amplitude > 0).sort((a, b) => a.frequency - b.frequency);
  expect(lines).toHaveLength(expected.length);
  for (let index = 0; index < lines.length; index++) {
    expect(Math.abs(lines[index].x - (40 + (expected[index].frequency - 100) / 900 * 660))).toBeLessThan(1e-4);
    expect(lines[index].endX).toBe(lines[index].x); expect(lines[index].startY).toBe(170);
    expect(Math.abs(lines[index].endY - (170 - 60 * expected[index].amplitude))).toBeLessThan(1e-4);
  }
}

test('the painted component waves, sum, cursor and ideal spectral lines agree with independently evaluated signals', async ({ page }) => {
  await mount(page); const progress = await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab));
  for (const example of examples) {
    await page.locator('[data-sound-preset="' + example.id + '"]').click(); await page.locator('#birdlab-sound-time').fill('3.75');
    await checkPaint(page, example.model, 3.75);
  }
  const extremes = [{ fa: 100, fb: 1000, aa: 100, ab: 100, phase: 275 }, { fa: 1000, fb: 1000, aa: 0, ab: 0, phase: 360 }];
  for (const model of extremes) {
    for (const [key, value] of Object.entries(model)) await page.locator('#birdlab-sound-' + key).fill(String(value));
    await page.locator('#birdlab-sound-time').fill('20'); await checkPaint(page, model, 20);
  }
  await page.locator('[data-sound-answer="peaks"]').click(); await expect(page.locator('.birdlab-sound-feedback')).toContainText('do not by themselves establish');
  await page.locator('[data-sound-answer="airflow"]').click(); await expect(page.locator('.birdlab-sound-feedback')).toContainText('single side');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.birdLab))).toBe(progress);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('pinning, the bounded cursor clock and the exact native audio buffer preserve manual control and clean up', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => {
    const w = window as any; let now = 1000, id = 0; const frames = new Map<number, FrameRequestCallback>();
    requestAnimationFrame = callback => { frames.set(++id, callback); return id; }; cancelAnimationFrame = handle => { frames.delete(handle); };
    w.soundStep = (ms: number, count = 1) => { for (let index = 0; index < count; index++) { now += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now)); } };
    w.soundPending = () => frames.size; w.soundContexts = []; w.soundBuffers = []; w.soundSources = [];
    const Original = w.AudioContext;
    w.AudioContext = function () {
      const context = new Original(); w.soundContexts.push(context);
      const buffer = context.createBuffer.bind(context), source = context.createBufferSource.bind(context), resume = context.resume.bind(context);
      context.createBuffer = (...args: any[]) => { const result = buffer(...args); w.soundBuffers.push(result); return result; };
      context.createBufferSource = () => { const result = source(); w.soundSources.push(result); return result; };
      context.resume = () => w.soundDefer ? new Promise(resolve => { w.soundResume = resolve; }) : resume();
      return context;
    };
  });
  const root = page.locator('[data-birdlab-sound-study]'), step = (ms: number, count = 1) => page.evaluate(({ ms, count }) => (window as any).soundStep(ms, count), { ms, count });
  await expect(root).toHaveAttribute('data-playing', 'false'); await expect(root).toHaveAttribute('data-audio-state', 'idle');
  await page.locator('[data-sound-pin]').click(); const pinned = await page.locator('[data-sound-traces="Pinned"]').innerHTML();
  await page.locator('[data-sound-play]').click(); await step(1); await step(100); await expect(root).toHaveAttribute('data-sound-time', '5.500');
  await page.locator('[data-sound-play]').click(); await step(5000); await expect(root).toHaveAttribute('data-sound-time', '5.500');
  await page.locator('#birdlab-sound-time').fill('19.95'); await page.locator('[data-sound-play]').click(); await step(1); await step(100);
  await expect(root).toHaveAttribute('data-playing', 'false'); await expect(root).toHaveAttribute('data-sound-time', '20.000');
  await page.locator('[data-sound-play]').click(); await expect(root).toHaveAttribute('data-sound-time', '0.000');
  await page.locator('#birdlab-sound-phase').fill('75'); await expect(root).toHaveAttribute('data-playing', 'false');
  expect(await page.locator('[data-sound-traces="Pinned"]').innerHTML()).toBe(pinned);
  await page.locator('[data-sound-clear-pin]').click(); await expect(page.locator('[data-sound-comparison]')).toHaveCount(0);
  await page.locator('[data-sound-preset="two"]').click(); await page.locator('[data-sound-audio]').click();
  await expect(root).toHaveAttribute('data-audio-state', 'playing');
  const buffer = await page.evaluate(() => {
    const w = window as any, value = w.soundBuffers[0], channel = value.getChannelData(0);
    return { channels: value.numberOfChannels, rate: value.sampleRate, length: value.length,
      samples: Array.from({ length: 67 }, (_, index) => { const at = Math.floor((channel.length - 1) * index / 66); return [at, channel[at]]; }) };
  });
  expect(buffer.channels).toBe(1); expect(buffer.length).toBe(Math.round(buffer.rate * 1.2));
  for (const [index, actual] of buffer.samples) {
    const seconds = index / buffer.rate, fade = Math.max(0, Math.min(1, seconds / .02, (1.2 - seconds) / .04));
    expect(actual).toBeCloseTo(.07 * fade * .7 * (Math.sin(2 * Math.PI * 400 * seconds) + Math.sin(2 * Math.PI * 600 * seconds)), 6);
    expect(Math.abs(actual)).toBeLessThanOrEqual(.14 + 1e-7);
  }
  await expect(root).toHaveAttribute('data-audio-state', 'idle', { timeout: 5000 });
  await expect.poll(() => page.evaluate(() => (window as any).soundContexts.every((context: AudioContext) => context.state === 'closed'))).toBe(true);
  await page.locator('[data-sound-audio]').click(); await expect(root).toHaveAttribute('data-audio-state', 'playing');
  await page.locator('#birdlab-sound-fa').fill('800'); await expect(root).toHaveAttribute('data-audio-state', 'idle');
  await page.locator('[data-sound-play]').click(); await page.locator('[data-sound-audio]').click(); await expect(root).toHaveAttribute('data-playing', 'false');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(root).toHaveAttribute('data-audio-state', 'idle');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.locator('[data-sound-play]').click();
  await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(root).toHaveAttribute('data-playing', 'false');
  await page.evaluate(() => { (window as any).soundDefer = true; }); await page.locator('[data-sound-audio]').click(); await expect(root).toHaveAttribute('data-audio-state', 'starting');
  const before = await page.evaluate(() => (window as any).soundSources.length);
  await page.locator('[data-sound-preset="same"]').click(); await page.evaluate(() => (window as any).soundResume()); await expect(root).toHaveAttribute('data-audio-state', 'idle');
  expect(await page.evaluate(() => (window as any).soundSources.length)).toBe(before);
  await page.evaluate(() => { (window as any).soundDefer = false; }); await page.locator('[data-sound-audio]').click(); await expect(root).toHaveAttribute('data-audio-state', 'playing');
  await page.getByRole('button', { name: '← Menu', exact: true }).click(); await expect(root).toHaveCount(0); await step(5000);
  expect(await page.evaluate(() => (window as any).soundPending())).toBe(0);
  await expect.poll(() => page.evaluate(() => (window as any).soundContexts.every((context: AudioContext) => context.state === 'closed'))).toBe(true);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('native sound controls stay keyboard accessible and contained at desktop, phone and embedded widths', async ({ page }) => {
  await mount(page);
  for (const layout of [{ viewport: 1280, host: 1100 }, { viewport: 390, host: 390 }, { viewport: 1280, host: 500 }]) {
    await sizing(page, layout.viewport, layout.host);
    for (const key of ['fa', 'fb']) {
      const slider = page.locator('#birdlab-sound-' + key); await slider.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
      await expect(slider).toHaveValue('110'); await expect(slider).toBeFocused(); await page.keyboard.press('End'); await expect(slider).toHaveValue('1000');
    }
    for (const key of ['aa', 'ab', 'phase']) {
      const slider = page.locator('#birdlab-sound-' + key); await slider.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
      await expect(slider).toHaveValue('5'); await expect(slider).toBeFocused();
    }
    const cursor = page.locator('#birdlab-sound-time'); await cursor.focus(); await page.keyboard.press('End'); await expect(cursor).toHaveValue('20');
    await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(cursor).toHaveValue('0.05'); await expect(cursor).toBeFocused();
    const preset = page.locator('[data-sound-preset="near"]'); await preset.focus(); await page.keyboard.press('Enter'); await expect(preset).toBeFocused();
    await page.locator('[data-sound-pin]').click(); await page.locator('[data-sound-answer="airflow"]').click();
    const host = (await page.locator('#wrap').boundingBox())!;
    for (const selector of ['[data-birdlab-sound-study]', '[data-sound-traces="current"]', '[data-sound-spectrum]', '.birdlab-sound-controls', '[data-sound-comparison]', '.birdlab-sound-evidence', '.birdlab-sound-model']) {
      const node = page.locator(selector), box = (await node.boundingBox())!;
      expect(box.x, selector).toBeGreaterThanOrEqual(host.x - 1); expect(box.x + box.width, selector).toBeLessThanOrEqual(host.x + host.width + 1);
      expect(await node.evaluate(element => element.scrollWidth - element.clientWidth), selector).toBeLessThanOrEqual(1);
    }
    for (const selector of ['[data-sound-traces="current"]', '[data-sound-traces="Pinned"]']) {
      expect((await page.locator(selector).boundingBox())!.width, selector).toBeGreaterThan(280);
    }
    const violations = await page.evaluate(async () => {
      const report = await (window as any).axe.run(document.querySelector('[data-birdlab-sound-study]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } });
      return report.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) }));
    }); expect(violations).toEqual([]);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
