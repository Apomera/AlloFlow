import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 180000, retries: 0 });
const output = resolve(process.env.RAPTOR_DISTANCE_ROUND5_REPORT || 'reports/raptor-distance-round5-20261022');
const harness = new GlHarness({
  toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1120, height: 900,
  appStyles: true, layout: 'document',
  probes: 'window.StemLab.loadScriptResilient=window.fieldworkNativeLoader;window.AlloPostFXEnabled=false;'
});
const ui = {
  root: '[data-raptor-distance-study]', launch: '[data-raptor-distance-launch]', close: '[data-raptor-distance-close]',
  panel: '[data-distance-fieldwork]', summary: '[data-distance-fieldwork] > summary',
  run: '[data-distance-fieldwork-run]', record: '[data-distance-fieldwork-record]', restore: '[data-distance-fieldwork-restore]',
  status: '[data-distance-fieldwork-status]', rows: '[data-distance-fieldwork-trial]',
  plot: '[data-distance-fieldwork-plot]', points: '[data-distance-fieldwork-point]',
  reveal: '[data-distance-reveal]', note: '[data-distance-note]', save: '[data-distance-save]',
  stale: '[data-distance-draft-stale]', adopt: '[data-distance-adopt-draft]'
};
const priorRecord = {
  version: 1, modelVersion: 1, distance: 120, cycles: 12, contrast: 95, widthM: .3,
  referenceLimit: 60, eagleLimit: 140, prediction: 'eagle', note: 'An earlier observation remains in my notebook.'
};

async function setup(page: Page, records: unknown[] = []) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const nativeFrame = window.requestAnimationFrame.bind(window), nativePng = HTMLCanvasElement.prototype.toDataURL;
    (window as any).fieldworkActivityRafs = 0;
    (window as any).fieldworkActivityCaptures = 0;
    window.requestAnimationFrame = callback => {
      if (/raptor_distance_(study|scene)\.js/.test(String(new Error().stack))) (window as any).fieldworkActivityRafs++;
      return nativeFrame(callback);
    };
    HTMLCanvasElement.prototype.toDataURL = function (...args: any[]) {
      if (this.hasAttribute('data-distance-canvas') && /raptor_distance_study\.js/.test(String(new Error().stack))) (window as any).fieldworkActivityCaptures++;
      return nativePng.apply(this, args as any);
    };
  });
  await page.route('**/stem_lab/stem_lab_module.js*', route => route.fulfill({
    contentType: 'text/javascript', body: readFileSync('stem_lab/stem_lab_module.js', 'utf8') + '\nwindow.fieldworkNativeLoader=window.StemLab.loadScriptResilient;'
  }));
  await harness.mount(page, { raptorHunt: {
    activeSection: 'acuity', selectedSpecies: 'coopersHawk', activeMission: 'open',
    flightSession: { speciesId: 'coopersHawk', missionId: 'open' },
    huntTutorialDismissed: true, graphicsQuality: 'low', xp: 97,
    huntStats: { attempts: 4, captures: 2 },
    acuity: { version: 2, distance: 18, span: 50, opacity: 75, target: 'plaque', guides: false },
    distantDetailStudy: { version: 1, distance: 120, cycles: 12, contrast: 95, records }
  } }, undefined, { expectCanvas: false });
  await expect(page.locator(ui.launch)).toBeVisible();
  expect(await harness.glContexts(page)).toEqual([]);
  return { errors, siblings: await siblings(page) };
}

async function siblings(page: Page) {
  return page.evaluate(() => {
    const result = { ...(window as any).__toolData.raptorHunt }; delete result.distantDetailStudy; return result;
  });
}

async function activate(page: Page, selector: string, keyboard = false) {
  const control = page.locator(selector);
  if (keyboard) { await control.focus(); await page.keyboard.press('Enter'); }
  else await control.click();
}

async function open(page: Page, keyboard = false) {
  await activate(page, ui.launch, keyboard);
  await expect(page.locator(ui.root)).toHaveAttribute('data-render-ready', 'true', { timeout: 60000 });
  await expect(page.locator(ui.panel)).not.toHaveAttribute('open', '');
  await expect(page.locator(ui.run)).toHaveCount(0);
  await activate(page, ui.summary, keyboard);
}

async function start(page: Page, reference: 'human' | 'eagle', keyboard = false) {
  await activate(page, '[data-distance-fieldwork-start="' + reference + '"]', keyboard);
  await expect(page.locator(ui.run)).toHaveAttribute('data-distance-fieldwork-run', reference);
  await conditions(page, 40, 12, 95);
  await expect(page.locator(ui.rows)).toHaveCount(0);
  await expect(page.locator(ui.points)).toHaveCount(0);
  await expect(page.locator(ui.reveal)).toBeDisabled();
  await expect(page.locator(ui.record)).toBeDisabled();
  await expect(page.locator(ui.status)).toHaveAttribute('data-complete', 'false');
}

async function conditions(page: Page, distance: number, cycles: number, contrast: number) {
  for (const [name, value] of Object.entries({ distance, cycles, contrast })) {
    await expect(page.locator('#rh-distance-' + name)).toHaveValue(String(value));
  }
}

async function setRange(page: Page, name: string, value: number) {
  await page.locator('#rh-distance-' + name).evaluate((input: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(next));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-distance-' + name)).toHaveValue(String(value));
}

async function reveal(page: Page, prediction: 'both' | 'eagle' | 'neither', keyboard = false) {
  await activate(page, '[data-distance-prediction="' + prediction + '"]', keyboard);
  await activate(page, ui.reveal, keyboard);
  await expect(page.locator('[data-distance-result]')).toBeVisible();
}

function frequency(distance: number) {
  // Independent geometry, rather than calling the activity's classification API.
  return 12 / (2 * Math.atan(.3 / (2 * distance)) * 180 / Math.PI);
}

function predictionAt(distance: number): 'both' | 'eagle' | 'neither' {
  const cpd = frequency(distance); return cpd <= 60 ? 'both' : cpd <= 140 ? 'eagle' : 'neither';
}

async function work(page: Page) {
  return page.locator(ui.root).evaluate((root: any) => ({
    lifecycle: root._distanceScene.getDiagnostics().lifecycle,
    captures: (window as any).fieldworkActivityCaptures, rafs: (window as any).fieldworkActivityRafs,
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
}

async function record(page: Page, distance: number, reference: 'human' | 'eagle', prediction = predictionAt(distance), keyboard = false) {
  await reveal(page, prediction, keyboard);
  await expect(page.locator(ui.record)).toBeEnabled();
  const before = await work(page);
  if (keyboard) await activate(page, '[data-distance-fieldwork] > summary', true);
  await activate(page, keyboard ? '[data-distance-fieldwork-record-inline]' : ui.record, keyboard);
  if (keyboard) { await expect(page.locator(ui.panel)).toHaveAttribute('open', ''); await expect(page.locator(ui.status)).toBeFocused(); }
  const row = page.locator(ui.rows + '[data-distance="' + distance + '"]');
  await expect(row).toBeVisible();
  const cells = await row.locator('th, td').allTextContents();
  expect(cells).toHaveLength(4);
  expect(Number.parseFloat(cells[0])).toBe(distance);
  expect(Math.abs(Number.parseFloat(cells[1]) - frequency(distance))).toBeLessThan(.006);
  expect(cells[2]).toMatch(frequency(distance) <= (reference === 'human' ? 60 : 140) ? /≤|within|at.{0,8}below/i : /above/i);
  expect(cells[3]).toMatch(prediction === 'both' ? /within both|^both/i : prediction === 'eagle' ? /above human.*within eagle|eagle only/i : /above both|neither/i);
  await expect(page.locator(ui.points + '[data-distance="' + distance + '"]')).toHaveCount(1);
  await unchangedWork(page, before);
  return { distance, frequency: frequency(distance), cells };
}

async function distances(page: Page) {
  return page.locator(ui.rows).evaluateAll(rows => rows.map(row => Number(row.getAttribute('data-distance'))).sort((a, b) => a - b));
}

async function close(page: Page, initialSiblings: unknown, keyboard = false) {
  expect(await siblings(page)).toEqual(initialSiblings);
  await page.locator(ui.root).evaluate((root: any) => { (window as any).fieldworkClosedScene = root._distanceScene; });
  await activate(page, ui.close, keyboard);
  await expect(page.locator(ui.root)).toHaveCount(0);
  await expect(page.locator(ui.launch)).toBeFocused();
  const lifecycle = await page.evaluate(() => (window as any).fieldworkClosedScene.getDiagnostics().lifecycle);
  expect(lifecycle).toMatchObject({ disposed: true, liveContexts: 0, rendererDisposed: true, birdDisposed: true, ownedResourceCount: 0 });
  expect((await harness.glContexts(page)).every(context => context.lost && context.lostBy === 'page')).toBe(true);
  return lifecycle;
}

test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('narrows the human reference crossing with measured samples and an accessible plot/table', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  const initial = await setup(page);
  await open(page);
  await start(page, 'human');
  await expect(page.locator(ui.plot)).toHaveCount(0);
  const samples = [await record(page, 40, 'human')];
  await expect(page.locator(ui.plot)).toHaveAttribute('role', 'img');
  await expect(page.locator(ui.plot)).toHaveAccessibleName(/distance|reference|sample|trial/i);
  await expect(page.locator(ui.status)).toHaveAttribute('role', 'status');
  await expect(page.locator(ui.status)).toHaveAttribute('data-complete', 'false');
  await setRange(page, 'distance', 300);
  await expect(page.locator(ui.record)).toBeDisabled();
  samples.push(await record(page, 300, 'human'));
  await expect(page.locator(ui.status)).toContainText(/40\s*[–-]\s*300\s*m/);
  await expect(page.locator(ui.status)).toHaveAttribute('data-complete', 'false');
  await setRange(page, 'distance', 85);
  // Preserve a student's wrong prediction separately from the measured band.
  samples.push(await record(page, 85, 'human', 'neither'));
  await expect(page.locator(ui.status)).toHaveAttribute('data-complete', 'false');
  await setRange(page, 'distance', 96);
  samples.push(await record(page, 96, 'human'));
  await expect(page.locator(ui.status)).toContainText(/85\s*[–-]\s*96\s*m/);
  await expect(page.locator(ui.status)).toHaveAttribute('data-complete', 'false');
  await setRange(page, 'distance', 95);
  samples.push(await record(page, 95, 'human'));
  await expect(page.locator(ui.status)).toContainText(/85\s*[–-]\s*95\s*m/);
  await expect(page.locator(ui.status)).toHaveAttribute('data-complete', 'true');
  await setRange(page, 'distance', 86);
  samples.push(await record(page, 86, 'human'));
  await expect(page.locator(ui.status)).toContainText(/85\s*[–-]\s*86\s*m/);
  await expect(page.locator(ui.status)).toContainText(/\b1\s*m/);
  await expect(page.locator(ui.status)).toHaveAttribute('data-complete', 'true');
  expect(await distances(page)).toEqual([40, 85, 86, 95, 96, 300]);
  await expect(page.locator(ui.points)).toHaveCount(6);
  const plotted = await page.locator(ui.points).evaluateAll(points => points.map(node => {
    const circle = node as SVGCircleElement;
    return { distance: Number(circle.getAttribute('data-distance')), x: circle.cx.baseVal.value, y: circle.cy.baseVal.value };
  }).sort((a, b) => a.distance - b.distance));
  for (let i = 0; i < plotted.length; i++) {
    expect(Number.isFinite(plotted[i].x) && Number.isFinite(plotted[i].y)).toBe(true);
    if (i) { expect(plotted[i].x).toBeGreaterThan(plotted[i - 1].x); expect(plotted[i].y).toBeLessThan(plotted[i - 1].y); }
  }
  const beforeDuplicate = await work(page);
  await activate(page, ui.record);
  await expect(page.locator(ui.rows)).toHaveCount(6);
  await unchangedWork(page, beforeDuplicate);
  await page.locator(ui.panel).screenshot({ path: resolve(output, 'fieldwork-human-desktop.jpg'), type: 'jpeg', quality: 86 });
  writeFileSync(resolve(output, 'fieldwork-human.json'), JSON.stringify({ samples, plotted, status: await page.locator(ui.status).innerText(), work: await work(page) }, null, 2));
  await close(page, initial.siblings);
  expect(initial.errors).toEqual([]);
});

test('keeps trials controlled and bounded while preserving notes and earlier activities', async ({ page }) => {
  const initial = await setup(page, [priorRecord]);
  await open(page);
  await activate(page, '[data-distance-inquiry="cycles"]');
  await reveal(page, 'both');
  await activate(page, '[data-distance-pin]');
  await expect(page.locator('img[data-distance-pinned-image]')).toHaveCount(2);
  const draft = 'My unfinished comparison should not silently become a crossing observation.';
  await page.locator(ui.note).fill(draft);
  await start(page, 'human');
  await expect(page.locator('[data-distance-guide]')).toHaveCount(0);
  await expect(page.locator('img[data-distance-pinned-image]')).toHaveCount(0);
  await expect(page.locator('img[data-distance-current-image]')).toHaveCount(0);
  await expect(page.locator(ui.note)).toHaveValue(draft);
  await expect(page.locator(ui.stale)).toBeVisible();
  await expect(page.locator('[data-distance-record]')).toHaveCount(1);
  expect((await work(page)).persisted.records).toEqual([priorRecord]);

  await setRange(page, 'distance', 65);
  await setRange(page, 'cycles', 14);
  await reveal(page, 'both');
  await expect(page.locator(ui.record)).toBeDisabled();
  await expect(page.locator(ui.restore)).toBeVisible();
  await setRange(page, 'contrast', 25);
  await reveal(page, 'both');
  await expect(page.locator(ui.record)).toBeDisabled();
  await activate(page, ui.restore);
  await conditions(page, 65, 12, 95);
  await expect(page.locator(ui.reveal)).toBeDisabled();
  await expect(page.locator(ui.record)).toBeDisabled();
  await record(page, 65, 'human');
  const allocations = (await work(page)).lifecycle.allocationCount;
  for (const distance of [75, 95, 115, 135, 155, 175, 195, 215]) {
    await setRange(page, 'distance', distance);
    await record(page, distance, 'human');
  }
  expect(await distances(page)).toEqual([75, 95, 115, 135, 155, 175, 195, 215]);
  await expect(page.locator(ui.points)).toHaveCount(8);
  expect((await work(page)).lifecycle.allocationCount).toBe(allocations);
  expect((await work(page)).persisted.records).toEqual([priorRecord]);
  await expect(page.locator(ui.note)).toHaveValue(draft);
  await expect(page.locator(ui.save)).toBeDisabled();
  await activate(page, ui.adopt);
  await expect(page.locator(ui.note)).toBeFocused();
  await expect(page.locator(ui.save)).toBeEnabled();
  await activate(page, ui.save);
  expect((await work(page)).persisted.records).toEqual([priorRecord, {
    version: 1, modelVersion: 1, distance: 215, cycles: 12, contrast: 95, widthM: .3,
    referenceLimit: 60, eagleLimit: 140, prediction: 'neither', note: draft
  }]);

  await start(page, 'human');
  await reveal(page, 'both');
  await page.locator(ui.note).fill('This draft belongs to the first 40 metre run.');
  await expect(page.locator(ui.save)).toBeEnabled();
  await start(page, 'human');
  await reveal(page, 'both');
  await expect(page.locator(ui.stale)).toBeVisible();
  await expect(page.locator(ui.save)).toBeDisabled();
  await activate(page, '[data-distance-inquiry="distance"]');
  await expect(page.locator(ui.run)).toHaveCount(0);
  await expect(page.locator('[data-distance-guide]')).toHaveAttribute('data-stage', 'starter');
  await conditions(page, 80, 8, 95);
  await expect(page.locator('[data-distance-record]')).toHaveCount(2);
  writeFileSync(resolve(output, 'fieldwork-state-protection.json'), JSON.stringify(await work(page), null, 2));
  await close(page, initial.siblings);
  expect(initial.errors).toEqual([]);
});

test('supports keyboard eagle sampling on a phone and releases local trials on close', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const initial = await setup(page);
  await page.locator('#wrap').evaluate((element: HTMLElement) => { element.style.width = '100%'; });
  await open(page, true);
  await start(page, 'eagle', true);
  await activate(page, '[data-distance-fieldwork-distance]', true);
  await expect(page.locator('#rh-distance-distance')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.locator('#rh-distance-distance')).toHaveValue('40');
  await record(page, 40, 'eagle', 'both', true);
  await setRange(page, 'distance', 200);
  await record(page, 200, 'eagle', 'eagle', true);
  await activate(page, '[data-distance-fieldwork-distance]', true);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#rh-distance-distance')).toHaveValue('201');
  await expect(page.locator(ui.record)).toBeDisabled();
  await record(page, 201, 'eagle', 'neither', true);
  await expect(page.locator(ui.status)).toHaveAttribute('data-complete', 'true');
  await expect(page.locator(ui.status)).toContainText(/200\s*[–-]\s*201\s*m/);
  expect(await distances(page)).toEqual([40, 200, 201]);
  await page.locator(ui.panel).scrollIntoViewIfNeeded();
  const layout = await page.locator(ui.panel).evaluate((panel: HTMLElement) => {
    const plot = panel.querySelector('[data-distance-fieldwork-plot]')!, table = panel.querySelector('table')!;
    const box = (node: Element) => { const rect = node.getBoundingClientRect(); return { x: rect.x, right: rect.right, width: rect.width, height: rect.height }; };
    return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, panel: box(panel), plot: box(plot), table: box(table), tableHeaders: Array.from(table.querySelectorAll('thead th')).map(node => node.textContent) };
  });
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport + 1);
  expect(layout.panel.x).toBeGreaterThanOrEqual(0);
  expect(layout.panel.right).toBeLessThanOrEqual(layout.viewport + 1);
  expect(layout.plot.width).toBeGreaterThan(200);
  expect(layout.plot.right).toBeLessThanOrEqual(layout.viewport + 1);
  expect(layout.tableHeaders).toHaveLength(4);
  await page.locator(ui.panel).screenshot({ path: resolve(output, 'fieldwork-eagle-mobile.jpg'), type: 'jpeg', quality: 86 });
  const before = await work(page);
  await activate(page, '[data-distance-fieldwork-exit]', true);
  await expect(page.locator(ui.run)).toHaveCount(0);
  await conditions(page, 201, 12, 95);
  await unchangedWork(page, before);
  await start(page, 'eagle', true);
  await record(page, 40, 'eagle', 'both', true);
  const disposed = await close(page, initial.siblings, true);
  await open(page, true);
  await expect(page.locator(ui.run)).toHaveCount(0);
  await expect(page.locator(ui.rows)).toHaveCount(0);
  await start(page, 'eagle', true);
  await expect(page.locator(ui.status)).toHaveAttribute('data-complete', 'false');
  await close(page, initial.siblings, true);
  writeFileSync(resolve(output, 'fieldwork-mobile.json'), JSON.stringify({ layout, disposed, finalContexts: await harness.glContexts(page) }, null, 2));
  expect(initial.errors).toEqual([]);
});
