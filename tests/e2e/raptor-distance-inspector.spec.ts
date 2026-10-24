import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng, type Pixels } from './helpers/png_pixels';

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 180000, retries: 0 });
const output = resolve(process.env.RAPTOR_DISTANCE_ROUND4_REPORT || 'reports/raptor-distance-round4-20261022');
const harness = new GlHarness({
  toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1120, height: 900,
  appStyles: true, layout: 'document',
  probes: 'window.StemLab.loadScriptResilient=window.inspectorNativeLoader;window.AlloPostFXEnabled=false;'
});
const ui = {
  root: '[data-raptor-distance-study]', launch: '[data-raptor-distance-launch]', close: '[data-raptor-distance-close]',
  inspector: '[data-distance-inspector]', summary: '[data-distance-inspector] > summary',
  frame: '[data-distance-inspector-frame]', images: 'img[data-distance-inspector-image]',
  range: '[data-distance-inspector-range]', condition: '[data-distance-inspector-condition]',
  unavailable: '[data-distance-inspector-unavailable]',
  current: '[data-distance-inspector-source="current"]', pinned: '[data-distance-inspector-source="pinned"]'
};

async function setup(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const nativeFrame = window.requestAnimationFrame.bind(window), nativePng = HTMLCanvasElement.prototype.toDataURL;
    (window as any).inspectorActivityRafs = 0;
    (window as any).inspectorActivityCaptures = 0;
    window.requestAnimationFrame = callback => {
      if (/raptor_distance_(study|scene)\.js/.test(String(new Error().stack))) (window as any).inspectorActivityRafs++;
      return nativeFrame(callback);
    };
    HTMLCanvasElement.prototype.toDataURL = function (...args: any[]) {
      if (this.hasAttribute('data-distance-canvas') && /raptor_distance_study\.js/.test(String(new Error().stack))) (window as any).inspectorActivityCaptures++;
      return nativePng.apply(this, args as any);
    };
  });
  await page.route('**/stem_lab/stem_lab_module.js*', route => route.fulfill({
    contentType: 'text/javascript', body: readFileSync('stem_lab/stem_lab_module.js', 'utf8') + '\nwindow.inspectorNativeLoader=window.StemLab.loadScriptResilient;'
  }));
  await harness.mount(page, { raptorHunt: {
    activeSection: 'acuity', selectedSpecies: 'coopersHawk', activeMission: 'open',
    flightSession: { speciesId: 'coopersHawk', missionId: 'open' },
    huntTutorialDismissed: true, graphicsQuality: 'low', xp: 97,
    huntStats: { attempts: 4, captures: 2 },
    acuity: { version: 2, distance: 18, span: 50, opacity: 75, target: 'plaque', guides: false }
  } }, undefined, { expectCanvas: false });
  await expect(page.locator(ui.launch)).toBeVisible();
  expect(await harness.glContexts(page)).toEqual([]);
  const siblings = await page.evaluate(() => ({ ...(window as any).__toolData.raptorHunt }));
  return { errors, siblings };
}

async function activate(page: Page, selector: string, keyboard = false) {
  const control = page.locator(selector);
  if (keyboard) { await control.focus(); await page.keyboard.press('Enter'); }
  else await control.click();
}

async function openActivity(page: Page, keyboard = false) {
  await activate(page, ui.launch, keyboard);
  await expect(page.locator(ui.root)).toHaveAttribute('data-render-ready', 'true', { timeout: 60000 });
  await expect(page.locator(ui.inspector)).not.toHaveAttribute('open', '');
}

async function reveal(page: Page, keyboard = false) {
  await activate(page, '[data-distance-prediction="eagle"]', keyboard);
  await activate(page, '[data-distance-reveal]', keyboard);
  await expect(page.locator('[data-distance-result]')).toBeVisible();
}

async function setRange(page: Page, name: string, value: number) {
  await page.locator('#rh-distance-' + name).evaluate((input: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(next));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-distance-' + name)).toHaveValue(String(value));
}

async function unavailable(page: Page) {
  await expect(page.locator(ui.unavailable)).toBeVisible();
  await expect(page.locator(ui.frame)).toHaveCount(0);
  await expect(page.locator(ui.images)).toHaveCount(0);
  await expect(page.locator(ui.range)).toBeDisabled();
  await expect(page.locator('[data-distance-inspector-preset="human"]')).toBeDisabled();
}

async function imageEvidence(page: Page, source: 'current' | 'pinned') {
  await expect(page.locator(ui.frame)).toBeVisible();
  await expect(page.locator(ui.images)).toHaveCount(2);
  await expect.poll(() => page.locator(ui.images).evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth === 1024))).toBe(true);
  const data = await page.locator(ui.root).evaluate((root: HTMLElement, source) => {
    const frame = root.querySelector('[data-distance-inspector-frame]') as HTMLElement;
    const f = frame.getBoundingClientRect();
    return { frame: { x: f.x, y: f.y + window.scrollY, width: f.width, height: f.height, label: frame.getAttribute('aria-label') },
      images: ['reference', 'eagle'].map(name => {
        const image = root.querySelector('img[data-distance-inspector-image="' + name + '"]') as HTMLImageElement;
        const expected = source === 'current'
          ? (root.querySelector('canvas[data-distance-canvas="' + name + '"]') as HTMLCanvasElement).toDataURL('image/png')
          : (root.querySelector('img[data-distance-pinned-image="' + name + '"]') as HTMLImageElement).src;
        const r = image.getBoundingClientRect(), css = getComputedStyle(image);
        const pinned = root.querySelector('img[data-distance-pinned-image="' + name + '"]') as HTMLImageElement | null;
        return { name, samePixels: image.src === expected, pngLength: image.src.length,
          matchesPinned: pinned ? image.src === pinned.src : null,
          x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height, naturalWidth: image.naturalWidth,
          clipPath: css.clipPath, transform: css.transform, opacity: css.opacity,
          hiddenFromAT: image.getAttribute('aria-hidden') === 'true' };
      }) };
  }, source);
  if (data.images.some(image => Math.abs(image.width - data.frame.width) > 3)) {
    const transient = await page.locator(ui.frame).evaluate(async (frame: HTMLElement) => {
      function sample() { return [frame, ...Array.from(frame.querySelectorAll('img'))].map(node => {
        const r = node.getBoundingClientRect(), css = getComputedStyle(node);
        return { width: r.width, height: r.height, x: r.x, padding: css.padding, border: css.borderWidth, transition: css.transition, grid: css.gridTemplateColumns, animations: node.getAnimations().map(a => ({ playState: a.playState, timing: a.effect?.getComputedTiming() })) };
      }); }
      const immediate = sample(); await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done())));
      return { immediate, afterFrames: sample() };
    });
    writeFileSync(resolve(output, 'inspector-layout-diagnostic.json'), JSON.stringify({ initial: data, transient }, null, 2));
  }
  expect(data.frame.label).toMatch(new RegExp(source, 'i'));
  for (const image of data.images) {
    expect(image.samePixels).toBe(true);
    expect(image.hiddenFromAT).toBe(true);
    expect(image.naturalWidth).toBe(1024);
    expect(image.width / image.height).toBeCloseTo(2, 2);
    expect(Math.abs(image.width - data.frame.width)).toBeLessThanOrEqual(3);
    expect(image.opacity).toBe('1');
  }
  expect(data.images[0].x).toBeCloseTo(data.images[1].x, 2);
  expect(data.images[0].y).toBeCloseTo(data.images[1].y, 2);
  expect(data.images[0].width).toBeCloseTo(data.images[1].width, 2);
  expect(data.images[0].height).toBeCloseTo(data.images[1].height, 2);
  return data;
}

async function work(page: Page) {
  return page.locator(ui.root).evaluate((root: any) => ({
    lifecycle: root._distanceScene.getDiagnostics().lifecycle,
    captures: (window as any).inspectorActivityCaptures,
    rafs: (window as any).inspectorActivityRafs,
    persisted: (window as any).__toolData.raptorHunt.distantDetailStudy
  }));
}

async function unchangedWork(page: Page, before: Awaited<ReturnType<typeof work>>) {
  await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  const after = await work(page);
  expect(after.lifecycle.renderCount).toBe(before.lifecycle.renderCount);
  expect(after.lifecycle.allocationCount).toBe(before.lifecycle.allocationCount);
  expect(after.captures).toBe(before.captures);
  expect(after.rafs).toBe(0);
  expect(after.persisted).toEqual(before.persisted);
  expect((await harness.glContexts(page)).filter(context => !context.lost)).toHaveLength(1);
  return after;
}

async function close(page: Page, siblings: unknown) {
  const finalSiblings = await page.evaluate(() => {
    const value = { ...(window as any).__toolData.raptorHunt }; delete value.distantDetailStudy; return value;
  });
  expect(finalSiblings).toEqual(siblings);
  await page.locator(ui.root).evaluate((root: any) => { (window as any).inspectorClosedScene = root._distanceScene; });
  await activate(page, ui.close);
  await expect(page.locator(ui.root)).toHaveCount(0);
  await expect(page.locator(ui.launch)).toBeFocused();
  const disposed = await page.evaluate(() => (window as any).inspectorClosedScene.getDiagnostics().lifecycle);
  expect(disposed).toMatchObject({ disposed: true, liveContexts: 0, rendererDisposed: true, birdDisposed: true, ownedResourceCount: 0 });
  expect((await harness.glContexts(page)).every(context => context.lost && context.lostBy === 'page')).toBe(true);
  return disposed;
}

function meanDifference(a: Pixels, b: Pixels, left: number, right: number) {
  expect([a.width, a.height]).toEqual([b.width, b.height]);
  let sum = 0, count = 0;
  for (let y = Math.ceil(a.height * .22); y < a.height * .8; y += 2) {
    for (let x = Math.ceil(a.width * left); x < a.width * right; x += 2) {
      const aa = a.at(x, y), bb = b.at(x, y);
      for (let c = 0; c < 3; c++) { sum += Math.abs(aa[c] - bb[c]); count++; }
    }
  }
  return sum / count;
}

test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('wipes between real same-condition images without rescaling, recapturing, or rerendering the scene', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  const initial = await setup(page);
  await openActivity(page);
  await activate(page, ui.summary);
  await unavailable(page);
  await expect(page.locator(ui.current)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(ui.pinned)).toBeDisabled();
  await reveal(page);
  await expect(page.locator(ui.condition)).toContainText('120 m');
  const before = await work(page), geometry: any[] = [];

  await activate(page, '[data-distance-inspector-preset="human"]');
  await expect(page.locator(ui.range)).toHaveValue('100');
  geometry.push(await imageEvidence(page, 'current'));
  const human = readPng(await page.locator(ui.frame).screenshot());
  await activate(page, '[data-distance-inspector-preset="eagle"]');
  await expect(page.locator(ui.range)).toHaveValue('0');
  geometry.push(await imageEvidence(page, 'current'));
  const eagle = readPng(await page.locator(ui.frame).screenshot());
  await activate(page, '[data-distance-inspector-preset="split"]');
  await expect(page.locator(ui.range)).toHaveValue('50');
  geometry.push(await imageEvidence(page, 'current'));
  const split = readPng(await page.locator(ui.frame).screenshot());
  const pixels = {
    leftMatchesHuman: meanDifference(split, human, .35, .48),
    leftDiffersFromEagle: meanDifference(split, eagle, .35, .48),
    rightMatchesEagle: meanDifference(split, eagle, .52, .85),
    rightDiffersFromHuman: meanDifference(split, human, .52, .85)
  };
  expect(pixels.leftMatchesHuman).toBeLessThan(1);
  expect(pixels.rightMatchesEagle).toBeLessThan(1);
  expect(pixels.leftDiffersFromEagle).toBeGreaterThan(pixels.leftMatchesHuman + .1);
  expect(pixels.rightDiffersFromHuman).toBeGreaterThan(pixels.rightMatchesEagle + .1);
  expect(geometry[0].images.map((image: any) => [image.x, image.y, image.width, image.height])).toEqual(geometry[1].images.map((image: any) => [image.x, image.y, image.width, image.height]));
  expect(geometry[1].images.map((image: any) => [image.x, image.y, image.width, image.height])).toEqual(geometry[2].images.map((image: any) => [image.x, image.y, image.width, image.height]));
  const afterControls = await unchangedWork(page, before);
  await page.locator(ui.inspector).screenshot({ path: resolve(output, 'inspector-desktop.jpg'), type: 'jpeg', quality: 90 });

  await activate(page, '[data-distance-pin]');
  await setRange(page, 'distance', 160);
  await unavailable(page);
  await expect(page.locator(ui.current)).toHaveAttribute('aria-pressed', 'true');
  const beforeSources = await work(page);
  await activate(page, ui.pinned);
  await expect(page.locator(ui.condition)).toContainText(/pinned/i);
  await expect(page.locator(ui.condition)).toContainText('120 m');
  const pinned = await imageEvidence(page, 'pinned');
  await activate(page, ui.current);
  await unavailable(page);
  await expect(page.locator(ui.condition)).toContainText('160 m');
  await activate(page, ui.pinned);
  await unchangedWork(page, beforeSources);
  await reveal(page);
  // New current evidence does not silently replace the selected pin.
  await expect(page.locator(ui.pinned)).toHaveAttribute('aria-pressed', 'true');
  await imageEvidence(page, 'pinned');
  await activate(page, ui.current);
  const updated = await imageEvidence(page, 'current');
  await expect(page.locator(ui.condition)).toContainText('160 m');
  expect(updated.images.some(image => image.matchesPinned === false)).toBe(true);
  const disposed = await close(page, initial.siblings);
  expect(initial.errors).toEqual([]);
  writeFileSync(resolve(output, 'inspector-desktop.json'), JSON.stringify({ geometry, pixels, afterControls, pinned, updated, disposed, errors: initial.errors }, null, 2));
});

test('supports mobile keyboard inspection, explicit source selection, and local-state cleanup', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const initial = await setup(page);
  await page.locator('#wrap').evaluate((wrap: HTMLElement) => { wrap.style.width = '100%'; });
  await openActivity(page, true);
  await activate(page, ui.summary, true);
  await unavailable(page);
  await reveal(page, true);
  await page.locator('[data-distance-note]').fill('The divider changes visible image area while the same scene and conditions remain fixed.');
  const before = await work(page);
  await expect(page.locator(ui.range)).toHaveAccessibleName('Human model share of comparison');
  await page.locator(ui.range).focus();
  await page.keyboard.press('Home');
  await expect(page.locator(ui.range)).toHaveValue('0');
  await page.keyboard.press('End');
  await expect(page.locator(ui.range)).toHaveValue('100');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator(ui.range)).toHaveValue('99');
  await expect(page.locator(ui.range)).toHaveAttribute('aria-valuetext', /99% human.*1% eagle/i);
  await activate(page, '[data-distance-inspector-preset="split"]', true);
  const geometry = await imageEvidence(page, 'current');
  expect(geometry.frame.x + geometry.frame.width).toBeLessThanOrEqual(390);
  expect(geometry.frame.width).toBeGreaterThan(200);
  const layout = await page.locator(ui.inspector).evaluate((root: HTMLElement) => ({ overflow: root.scrollWidth > root.clientWidth + 1 }));
  expect(layout.overflow).toBe(false);
  await expect(page.locator('[data-distance-draft-stale]')).toHaveCount(0);
  await expect(page.locator('[data-distance-save]')).toBeEnabled();
  await unchangedWork(page, before);
  await page.locator(ui.inspector).screenshot({ path: resolve(output, 'inspector-mobile.jpg'), type: 'jpeg', quality: 90 });
  await activate(page, '[data-distance-save]', true);
  const saved = await page.evaluate(() => (window as any).__toolData.raptorHunt.distantDetailStudy);
  expect(saved.records).toHaveLength(1);
  expect(JSON.stringify(saved)).not.toMatch(/inspector|data:image/);

  await activate(page, '[data-distance-pin]', true);
  await activate(page, ui.pinned, true);
  await setRange(page, 'contrast', 25);
  await imageEvidence(page, 'pinned');
  await activate(page, '[data-distance-clear-pin]', true);
  await expect(page.locator(ui.pinned)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(ui.pinned)).toBeDisabled();
  await unavailable(page);
  await reveal(page, true);
  // Even a newly revealed current condition does not silently switch sources.
  await unavailable(page);
  await activate(page, ui.current, true);
  await imageEvidence(page, 'current');
  await page.locator(ui.range).focus(); await page.keyboard.press('End');
  const disposed = await close(page, initial.siblings);
  await openActivity(page, true);
  await activate(page, ui.summary, true);
  await expect(page.locator(ui.current)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(ui.pinned)).toBeDisabled();
  await expect(page.locator(ui.range)).toHaveValue('50');
  await unavailable(page);
  expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.distantDetailStudy.records)).toEqual(saved.records);
  expect(initial.errors).toEqual([]);
  writeFileSync(resolve(output, 'inspector-mobile.json'), JSON.stringify({ geometry, layout, saved, disposed, errors: initial.errors }, null, 2));
});

test('keeps current evidence gated after capture failure while allowing an explicitly selected valid pin', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  const initial = await setup(page);
  await openActivity(page);
  await reveal(page);
  await activate(page, '[data-distance-pin]');
  await activate(page, ui.summary);
  await setRange(page, 'distance', 160);
  await unavailable(page);
  const canvases = page.locator('canvas[data-distance-canvas="reference"], canvas[data-distance-canvas="eagle"]');
  await canvases.evaluateAll(nodes => nodes.forEach(node => {
    const canvas = node as any; canvas._inspectorToDataURL = canvas.toDataURL;
    canvas.toDataURL = function () { throw new Error('Injected inspector current-copy failure'); };
  }));
  let fallback: any;
  try {
    await reveal(page);
    await expect(page.locator('[data-distance-snapshot-error]')).toBeVisible();
    await unavailable(page);
    await expect(page.locator('canvas[data-distance-canvas="reference"]')).toBeVisible();
    await expect(page.locator('canvas[data-distance-canvas="eagle"]')).toBeVisible();
    const before = await work(page);
    await activate(page, ui.pinned);
    fallback = await imageEvidence(page, 'pinned');
    await activate(page, '[data-distance-inspector-preset="human"]');
    await activate(page, '[data-distance-inspector-preset="eagle"]');
    await activate(page, ui.current);
    await unavailable(page);
    await unchangedWork(page, before);
  } finally {
    await canvases.evaluateAll(nodes => nodes.forEach(node => {
      const canvas = node as any; canvas.toDataURL = canvas._inspectorToDataURL; delete canvas._inspectorToDataURL;
    }));
  }
  await reveal(page);
  await expect(page.locator('[data-distance-snapshot-error]')).toHaveCount(0);
  const recovered = await imageEvidence(page, 'current');
  await expect(page.locator(ui.condition)).toContainText('160 m');
  await expect(page.locator(ui.current)).toHaveAttribute('aria-pressed', 'true');
  const disposed = await close(page, initial.siblings);
  expect(initial.errors).toEqual([]);
  writeFileSync(resolve(output, 'inspector-copy-failure.json'), JSON.stringify({ fallback, recovered, disposed, errors: initial.errors }, null, 2));
});
