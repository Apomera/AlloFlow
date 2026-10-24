import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 180000, retries: 0 });
const output = resolve(process.env.RAPTOR_DISTANCE_ROUND3_REPORT || 'reports/raptor-distance-round3-20261022');
const harness = new GlHarness({
  toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1120, height: 900,
  appStyles: true, layout: 'document',
  probes: 'window.StemLab.loadScriptResilient=window.guidedNativeLoader;window.AlloPostFXEnabled=false;'
});
const ui = {
  root: '[data-raptor-distance-study]', launch: '[data-raptor-distance-launch]',
  close: '[data-raptor-distance-close]', guide: '[data-distance-guide]',
  next: '[data-distance-guide-next]', exit: '[data-distance-guide-exit]',
  reveal: '[data-distance-reveal]', note: '[data-distance-note]', save: '[data-distance-save]',
  stale: '[data-distance-draft-stale]', adopt: '[data-distance-adopt-draft]',
  currentImages: 'img[data-distance-current-image]', pinnedImages: 'img[data-distance-pinned-image]',
  covers: '[data-distance-current-cover]', reflection: '[data-distance-reflection]',
  feedback: '[data-distance-reflection-feedback]'
};
const starter = { version: 1, distance: 80, cycles: 8, contrast: 95, widthM: .3, wideFov: 20, detailFov: .75 };

async function setup(page: Page, initialStudy?: unknown) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const native = window.requestAnimationFrame.bind(window);
    (window as any).guidedActivityRafs = 0;
    window.requestAnimationFrame = callback => {
      if (/raptor_distance_(study|scene)\.js/.test(String(new Error().stack))) (window as any).guidedActivityRafs++;
      return native(callback);
    };
  });
  await page.route('**/stem_lab/stem_lab_module.js*', route => route.fulfill({
    contentType: 'text/javascript', body: readFileSync('stem_lab/stem_lab_module.js', 'utf8') + '\nwindow.guidedNativeLoader=window.StemLab.loadScriptResilient;'
  }));
  await harness.mount(page, { raptorHunt: {
    activeSection: 'acuity', selectedSpecies: 'coopersHawk', activeMission: 'open',
    flightSession: { speciesId: 'coopersHawk', missionId: 'open' },
    huntTutorialDismissed: true, graphicsQuality: 'low', xp: 97,
    huntStats: { attempts: 4, captures: 2 },
    acuity: { version: 2, distance: 18, span: 50, opacity: 75, target: 'plaque', guides: false },
    ...(initialStudy === undefined ? {} : { distantDetailStudy: initialStudy })
  } }, undefined, { expectCanvas: false });
  await expect(page.locator(ui.launch)).toBeVisible();
  expect(await harness.glContexts(page)).toEqual([]);
  return { errors, siblings: await siblings(page) };
}

async function siblings(page: Page) {
  return page.evaluate(() => {
    const result = { ...(window as any).__toolData.raptorHunt };
    delete result.distantDetailStudy;
    return result;
  });
}

async function activate(page: Page, selector: string, keyboard = false) {
  const button = page.locator(selector);
  if (keyboard) { await button.focus(); await page.keyboard.press('Enter'); }
  else await button.click();
}

async function open(page: Page, keyboard = false) {
  await activate(page, ui.launch, keyboard);
  await expect(page.locator(ui.root)).toHaveAttribute('data-render-ready', 'true', { timeout: 60000 });
  return diagnostic(page);
}

async function diagnostic(page: Page) {
  return page.locator(ui.root).evaluate((root: any) => root._distanceScene.getDiagnostics());
}

async function state(page: Page) {
  return page.evaluate(() => (window as any).__toolData.raptorHunt.distantDetailStudy);
}

async function conditions(page: Page, distance: number, cycles: number, contrast: number) {
  await expect(page.locator('#rh-distance-distance')).toHaveValue(String(distance));
  await expect(page.locator('#rh-distance-cycles')).toHaveValue(String(cycles));
  await expect(page.locator('#rh-distance-contrast')).toHaveValue(String(contrast));
}

async function setRange(page: Page, name: string, value: number) {
  await page.locator('#rh-distance-' + name).evaluate((input: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-distance-' + name)).toHaveValue(String(value));
}

async function reveal(page: Page, prediction: string, keyboard = false) {
  await activate(page, '[data-distance-prediction="' + prediction + '"]', keyboard);
  await activate(page, ui.reveal, keyboard);
  await expect(page.locator('[data-distance-result]')).toBeVisible();
}

async function concealedCurrent(page: Page) {
  await expect(page.locator(ui.currentImages)).toHaveCount(0);
  await expect(page.locator(ui.covers)).toHaveCount(2);
  await expect(page.locator(ui.covers).nth(0)).toBeVisible();
  await expect(page.locator(ui.covers).nth(1)).toBeVisible();
}

async function pinnedPngs(page: Page) {
  return page.locator(ui.pinnedImages).evaluateAll(images => Object.fromEntries(images.map(image => [image.getAttribute('data-distance-pinned-image'), (image as HTMLImageElement).src])));
}

async function mirrorEvidence(page: Page) {
  await expect(page.locator(ui.currentImages)).toHaveCount(2);
  await expect(page.locator(ui.covers)).toHaveCount(0);
  await expect.poll(() => page.locator(ui.currentImages).evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth === 1024))).toBe(true);
  const evidence = await page.locator(ui.root).evaluate((root: HTMLElement) => ['reference', 'eagle'].map(name => {
    const row = root.querySelector('[data-distance-pair="' + name + '"]')!;
    const pinned = row.querySelector('img[data-distance-pinned-image="' + name + '"]') as HTMLImageElement;
    const current = row.querySelector('img[data-distance-current-image="' + name + '"]') as HTMLImageElement;
    const canvas = root.querySelector('canvas[data-distance-canvas="' + name + '"]') as HTMLCanvasElement;
    const p = pinned.getBoundingClientRect(), c = current.getBoundingClientRect();
    return { name, samePixels: current.src === canvas.toDataURL('image/png'),
      differentFromOtherFilter: current.src !== (root.querySelector('img[data-distance-current-image="' + (name === 'reference' ? 'eagle' : 'reference') + '"]') as HTMLImageElement).src,
      pinned: { width: p.width, height: p.height, x: p.x, y: p.y, alt: pinned.alt },
      current: { width: c.width, height: c.height, x: c.x, y: c.y, alt: current.alt } };
  }));
  for (const row of evidence) {
    expect(row.samePixels).toBe(true);
    expect(row.differentFromOtherFilter).toBe(true);
    expect(row.pinned.alt).toBeTruthy(); expect(row.current.alt).toBeTruthy();
    expect(row.pinned.width).toBeCloseTo(row.current.width, 1);
    expect(row.pinned.width / row.pinned.height).toBeCloseTo(2, 2);
    expect(row.current.width / row.current.height).toBeCloseTo(2, 2);
  }
  await expect(page.locator('canvas[data-distance-canvas="reference"]')).toBeHidden();
  await expect(page.locator('canvas[data-distance-canvas="eagle"]')).toBeHidden();
  await expect(page.locator('canvas[data-distance-canvas]')).toHaveCount(3);
  return evidence;
}

async function staticScene(page: Page, allocationCount: number) {
  await page.evaluate(() => new Promise<void>(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()))));
  const first = await diagnostic(page);
  await page.evaluate(() => new Promise<void>(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()))));
  const after = await diagnostic(page);
  expect(after.lifecycle.renderCount).toBe(first.lifecycle.renderCount);
  expect(after.lifecycle.allocationCount).toBe(allocationCount);
  expect((await harness.glContexts(page)).filter(context => !context.lost)).toHaveLength(1);
  expect(await page.evaluate(() => (window as any).guidedActivityRafs)).toBe(0);
  return after;
}

async function close(page: Page) {
  await page.locator(ui.root).evaluate((root: any) => { (window as any).guidedClosedScene = root._distanceScene; });
  await activate(page, ui.close);
  await expect(page.locator(ui.root)).toHaveCount(0);
  await expect(page.locator(ui.launch)).toBeFocused();
  const disposed = await page.evaluate(() => (window as any).guidedClosedScene.getDiagnostics());
  expect(disposed.lifecycle).toMatchObject({ disposed: true, liveContexts: 0, rendererDisposed: true, birdDisposed: true, ownedResourceCount: 0 });
  expect((await harness.glContexts(page)).every(context => context.lost && context.lostBy === 'page')).toBe(true);
  return disposed;
}

test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

for (const track of [
  { id: 'distance', distance: 160, cycles: 8, contrast: 95, prediction: 'eagle', answer: 'smaller-higher', wrong: 'same-same' },
  { id: 'cycles', distance: 80, cycles: 16, contrast: 95, prediction: 'eagle', answer: 'same-higher', wrong: 'smaller-higher' },
  { id: 'contrast', distance: 80, cycles: 8, contrast: 25, prediction: 'both', answer: 'same-same', wrong: 'same-higher' }
]) {
  test('guides a complete ' + track.id + ' investigation with correctly paired image evidence', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    const initial = await setup(page), scene = await open(page);
    await activate(page, '[data-distance-inquiry="' + track.id + '"]');
    await conditions(page, 80, 8, 95);
    await expect(page.locator(ui.guide)).toHaveAttribute('data-stage', 'starter');
    await expect(page.locator(ui.reveal)).toBeDisabled();
    await activate(page, ui.next);
    await expect(page.locator('[data-distance-prediction="both"]')).toBeFocused();
    await expect(page.locator(ui.reveal)).toBeDisabled();
    await reveal(page, 'both');
    await activate(page, ui.next);
    await expect(page.locator(ui.guide)).toHaveAttribute('data-stage', 'pinned');
    await expect(page.locator(ui.pinnedImages)).toHaveCount(2);
    const pinned = await pinnedPngs(page);
    await activate(page, ui.next);
    await conditions(page, track.distance, track.cycles, track.contrast);
    await expect(page.locator(ui.guide)).toHaveAttribute('data-stage', 'changed');
    await expect(page.locator(ui.reveal)).toBeDisabled();
    await concealedCurrent(page);
    expect(await pinnedPngs(page)).toEqual(pinned);
    await activate(page, ui.next);
    await expect(page.locator('[data-distance-prediction="both"]')).toBeFocused();

    if (track.id === 'contrast') {
      // Exercise only PNG-copy failure after a valid pin. The original scene
      // remains usable and prediction/reveal must still control its visibility.
      await page.locator('canvas[data-distance-canvas="reference"], canvas[data-distance-canvas="eagle"]').evaluateAll(canvases => canvases.forEach(node => {
        const canvas = node as any;
        canvas._guidedToDataURL = canvas.toDataURL;
        canvas.toDataURL = function () { throw new Error('Injected current-image capture failure'); };
      }));
      try {
        await reveal(page, track.prediction);
        await expect(page.locator(ui.currentImages)).toHaveCount(0);
        await expect(page.locator('[data-distance-snapshot-error]')).toBeVisible();
        await expect(page.locator('canvas[data-distance-canvas="reference"]')).toBeVisible();
        await expect(page.locator('canvas[data-distance-canvas="eagle"]')).toBeVisible();
        expect(await pinnedPngs(page)).toEqual(pinned);
      } finally {
        await page.locator('canvas[data-distance-canvas="reference"], canvas[data-distance-canvas="eagle"]').evaluateAll(canvases => canvases.forEach(node => {
          const canvas = node as any; canvas.toDataURL = canvas._guidedToDataURL; delete canvas._guidedToDataURL;
        }));
      }
    }
    await reveal(page, track.prediction);
    await expect(page.locator(ui.guide)).toHaveAttribute('data-stage', 'inspect');
    const imageEvidence = await mirrorEvidence(page);
    await expect(page.locator('[data-distance-snapshot-error]')).toHaveCount(0);
    for (const row of imageEvidence) expect(row.pinned.y).toBeCloseTo(row.current.y, 1);
    expect(await pinnedPngs(page)).toEqual(pinned);
    await expect(page.locator(ui.reflection)).toBeVisible();
    await activate(page, ui.next);
    await expect(page.locator('[data-distance-reflection-heading]')).toBeFocused();
    await activate(page, '[data-distance-reflection-answer="' + track.wrong + '"]');
    await expect(page.locator(ui.feedback)).toHaveAttribute('data-correct', 'false');
    await activate(page, '[data-distance-reflection-answer="' + track.answer + '"]');
    await expect(page.locator(ui.feedback)).toHaveAttribute('data-correct', 'true');
    await activate(page, ui.next);
    await expect(page.locator(ui.note)).toBeFocused();
    await page.locator(ui.note).fill('I changed only ' + track.id + ' and compared the same reference filter across the pinned and current views.');
    await activate(page, ui.save);
    const saved = await state(page);
    expect(saved.records).toHaveLength(1);
    expect(saved.records[0]).toMatchObject({ distance: track.distance, cycles: track.cycles, contrast: track.contrast,
      prediction: track.prediction, comparison: { version: 1, reference: starter } });
    expect(Object.keys(saved.records[0]).sort()).toEqual(['version', 'modelVersion', 'distance', 'cycles', 'contrast', 'widthM', 'referenceLimit', 'eagleLimit', 'prediction', 'note', 'comparison'].sort());
    expect(JSON.stringify(saved)).not.toMatch(/data:image|guideRun|guideId/);
    if (track.id === 'distance') await page.locator('[data-distance-pair="reference"]').screenshot({ path: resolve(output, 'guided-desktop-pair.jpg'), type: 'jpeg', quality: 90 });
    const idle = await staticScene(page, scene.lifecycle.allocationCount);

    await setRange(page, 'distance', track.distance + 1);
    await expect(page.locator(ui.guide)).toHaveAttribute('data-stage', 'diverged');
    await concealedCurrent(page);
    await expect(page.locator(ui.reflection)).toHaveCount(0);
    await expect(page.locator(ui.feedback)).toHaveCount(0);
    await activate(page, ui.next);
    await conditions(page, 80, 8, 95);
    await expect(page.locator(ui.guide)).toHaveAttribute('data-stage', 'starter');
    await expect(page.locator(ui.currentImages)).toHaveCount(0);
    await expect(page.locator(ui.pinnedImages)).toHaveCount(0);
    await expect(page.locator(ui.reveal)).toBeDisabled();
    expect((await state(page)).records).toEqual(saved.records);
    expect(await siblings(page)).toEqual(initial.siblings);
    const disposed = await close(page);
    expect(initial.errors).toEqual([]);
    writeFileSync(resolve(output, 'guided-' + track.id + '.json'), JSON.stringify({ scene, imageEvidence, saved, idle, disposed, errors: initial.errors }, null, 2));
  });
}

test('supports mobile keyboard guidance and preserves evidence when a same-valued starter is restarted', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const earlier = { version: 1, modelVersion: 1, distance: 120, cycles: 12, contrast: 95,
    widthM: .3, referenceLimit: 60, eagleLimit: 140, prediction: 'eagle', note: 'An earlier saved observation must remain intact.' };
  const initial = await setup(page, { ...starter, records: [earlier] });
  await page.locator('#wrap').evaluate((wrap: HTMLElement) => { wrap.style.width = '100%'; });
  const scene = await open(page, true);
  await activate(page, '[data-distance-inquiry="distance"]', true);
  await reveal(page, 'both', true);
  await page.locator(ui.note).fill('This unfinished note belongs to the first starter run.');
  await expect(page.locator(ui.save)).toBeEnabled();
  await activate(page, '[data-distance-inquiry="distance"]', true);
  await conditions(page, 80, 8, 95);
  await expect(page.locator(ui.guide)).toHaveAttribute('data-stage', 'starter');
  await expect(page.locator(ui.stale)).toBeVisible();
  await expect(page.locator(ui.note)).toHaveValue('This unfinished note belongs to the first starter run.');
  await expect(page.locator(ui.reveal)).toBeDisabled();
  await expect(page.locator(ui.currentImages)).toHaveCount(0);
  await expect(page.locator(ui.pinnedImages)).toHaveCount(0);
  expect((await state(page)).records).toEqual([earlier]);
  await reveal(page, 'both', true);
  await page.locator(ui.note).fill('Editing this draft still requires an explicit decision to use it in the new run.');
  await expect(page.locator(ui.stale)).toBeVisible();
  await expect(page.locator(ui.save)).toBeDisabled();
  await activate(page, ui.adopt, true);
  await expect(page.locator(ui.note)).toBeFocused();
  await activate(page, ui.save, true);
  const saved = await state(page);
  expect(saved.records).toHaveLength(2);
  expect(saved.records[0]).toEqual(earlier);
  await activate(page, ui.next, true);
  await expect(page.locator(ui.guide)).toHaveAttribute('data-stage', 'pinned');
  await mirrorEvidence(page);
  // Restarting at unchanged numeric conditions must also remove already
  // revealed comparison images, not rely on the numeric-settings effect.
  await activate(page, '[data-distance-inquiry="distance"]', true);
  await conditions(page, 80, 8, 95);
  await expect(page.locator(ui.currentImages)).toHaveCount(0);
  await expect(page.locator(ui.pinnedImages)).toHaveCount(0);
  await expect(page.locator(ui.reveal)).toBeDisabled();
  expect((await state(page)).records).toEqual(saved.records);
  await reveal(page, 'both', true);
  await activate(page, ui.next, true);
  await expect(page.locator(ui.guide)).toHaveAttribute('data-stage', 'pinned');
  await activate(page, ui.next, true);
  await expect(page.locator(ui.guide)).toHaveAttribute('data-stage', 'changed');
  await concealedCurrent(page);
  await reveal(page, 'eagle', true);
  const imageEvidence = await mirrorEvidence(page);
  for (const row of imageEvidence) {
    expect(row.pinned.width).toBeGreaterThan(150);
    expect(row.pinned.x).toBeCloseTo(row.current.x, 1);
    expect(row.current.y).toBeGreaterThan(row.pinned.y + row.pinned.height);
    expect(row.current.y - row.pinned.y - row.pinned.height).toBeLessThan(160);
    expect(row.current.x + row.current.width).toBeLessThanOrEqual(390);
  }
  const layout = await page.locator(ui.root).evaluate((root: HTMLElement) => ({ overflow: root.scrollWidth > root.clientWidth + 1 }));
  expect(layout.overflow).toBe(false);
  await page.locator('[data-distance-pair="reference"]').screenshot({ path: resolve(output, 'guided-mobile-pair.jpg'), type: 'jpeg', quality: 90 });
  const beforeExit = await state(page), pinBeforeExit = await pinnedPngs(page);
  await activate(page, ui.exit, true);
  await expect(page.locator(ui.guide)).toHaveCount(0);
  await expect(page.locator(ui.reflection)).toHaveCount(0);
  expect(await state(page)).toEqual(beforeExit);
  expect(await pinnedPngs(page)).toEqual(pinBeforeExit);
  await mirrorEvidence(page);
  const idle = await staticScene(page, scene.lifecycle.allocationCount);
  expect(await siblings(page)).toEqual(initial.siblings);
  const disposed = await close(page);
  await open(page, true);
  await expect(page.locator(ui.guide)).toHaveCount(0);
  await expect(page.locator(ui.pinnedImages)).toHaveCount(0);
  await expect(page.locator(ui.currentImages)).toHaveCount(0);
  expect((await state(page)).records).toEqual(saved.records);
  expect(initial.errors).toEqual([]);
  writeFileSync(resolve(output, 'guided-mobile.json'), JSON.stringify({ scene, imageEvidence, layout, saved, idle, disposed, errors: initial.errors }, null, 2));
});
