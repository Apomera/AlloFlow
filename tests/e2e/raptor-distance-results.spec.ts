import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 180000, retries: 0 });
const output = resolve(process.env.RAPTOR_DISTANCE_ROUND6_REPORT || 'reports/raptor-distance-round6-20261022');
const harness = new GlHarness({
  toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1120, height: 900,
  appStyles: true, layout: 'document',
  probes: 'window.StemLab.loadScriptResilient=window.distanceResultsNativeLoader;window.AlloPostFXEnabled=false;'
});
type Reference = 'human' | 'eagle';
type Prediction = 'both' | 'eagle' | 'neither';
const ui = {
  root: '[data-raptor-distance-study]', launch: '[data-raptor-distance-launch]', close: '[data-raptor-distance-close]',
  panel: '[data-distance-fieldwork]', summary: '[data-distance-fieldwork] > summary', run: '[data-distance-fieldwork-run]',
  record: '[data-distance-fieldwork-record]', status: '[data-distance-fieldwork-status]',
  reveal: '[data-distance-reveal]', note: '[data-distance-note]', saveNote: '[data-distance-save]',
  saveResult: '[data-distance-results-save]', results: '[data-distance-results]', comparison: '[data-distance-results-comparison]',
  ratio: '[data-distance-results-ratio]', plot: '[data-distance-results-plot]', feedback: '[data-distance-results-feedback]'
};
const priorRecord = {
  version: 1, modelVersion: 1, distance: 120, cycles: 12, contrast: 95, widthM: .3,
  referenceLimit: 60, eagleLimit: 140, prediction: 'eagle', note: 'An earlier observation remains in my notebook.'
};

async function setup(page: Page, initialStudy: Record<string, unknown> = {}) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const nativeFrame = window.requestAnimationFrame.bind(window), nativePng = HTMLCanvasElement.prototype.toDataURL;
    (window as any).distanceResultsRafs = 0;
    (window as any).distanceResultsCaptures = 0;
    window.requestAnimationFrame = callback => {
      if (/raptor_distance_(study|scene)\.js/.test(String(new Error().stack))) (window as any).distanceResultsRafs++;
      return nativeFrame(callback);
    };
    HTMLCanvasElement.prototype.toDataURL = function (...args: any[]) {
      if (this.hasAttribute('data-distance-canvas') && /raptor_distance_study\.js/.test(String(new Error().stack))) (window as any).distanceResultsCaptures++;
      return nativePng.apply(this, args as any);
    };
  });
  await page.route('**/stem_lab/stem_lab_module.js*', route => route.fulfill({
    contentType: 'text/javascript', body: readFileSync('stem_lab/stem_lab_module.js', 'utf8') + '\nwindow.distanceResultsNativeLoader=window.StemLab.loadScriptResilient;'
  }));
  await harness.mount(page, { raptorHunt: {
    activeSection: 'acuity', selectedSpecies: 'coopersHawk', activeMission: 'open',
    flightSession: { speciesId: 'coopersHawk', missionId: 'open' },
    huntTutorialDismissed: true, graphicsQuality: 'low', xp: 97,
    huntStats: { attempts: 4, captures: 2 },
    acuity: { version: 2, distance: 18, span: 50, opacity: 75, target: 'plaque', guides: false },
    distantDetailStudy: { version: 1, distance: 120, cycles: 12, contrast: 95, records: [priorRecord], ...initialStudy }
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

async function setRange(page: Page, name: string, value: number) {
  await page.locator('#rh-distance-' + name).evaluate((input: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(next));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-distance-' + name)).toHaveValue(String(value));
}

async function reveal(page: Page, prediction: Prediction, keyboard = false) {
  await activate(page, '[data-distance-prediction="' + prediction + '"]', keyboard);
  await activate(page, ui.reveal, keyboard);
  await expect(page.locator('[data-distance-result]')).toBeVisible();
}

function frequency(distance: number) {
  return 12 / (2 * Math.atan(.3 / (2 * distance)) * 180 / Math.PI);
}

function predictionAt(distance: number): Prediction {
  const cpd = frequency(distance); return cpd <= 60 ? 'both' : cpd <= 140 ? 'eagle' : 'neither';
}

function result(reference: Reference, distances: number[], predictions = distances.map(predictionAt)) {
  return { version: 1, modelVersion: 1, reference, trials: distances.map((distance, index) => ({
    settings: { version: 1, distance, cycles: 12, contrast: 95, widthM: .3, wideFov: 20, detailFov: .75 },
    prediction: predictions[index]
  })) };
}

const cleanHuman = result('human', [85, 86]);
const cleanEagle = result('eagle', [200, 201]);
const cleanResults = { version: 1, human: cleanHuman, eagle: cleanEagle };

async function work(page: Page) {
  return page.locator(ui.root).evaluate((root: any) => ({
    lifecycle: root._distanceScene.getDiagnostics().lifecycle,
    captures: (window as any).distanceResultsCaptures, rafs: (window as any).distanceResultsRafs,
    persisted: (window as any).__toolData.raptorHunt.distantDetailStudy
  }));
}

async function noSceneWork(page: Page, before: Awaited<ReturnType<typeof work>>, unchangedPersistence = false) {
  await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  const after = await work(page);
  expect(after.lifecycle.renderCount).toBe(before.lifecycle.renderCount);
  expect(after.lifecycle.allocationCount).toBe(before.lifecycle.allocationCount);
  expect(after.captures).toBe(before.captures);
  expect(after.rafs).toBe(0);
  if (unchangedPersistence) expect(after.persisted).toEqual(before.persisted);
  expect((await harness.glContexts(page)).filter(context => !context.lost)).toHaveLength(1);
  return after;
}

async function start(page: Page, reference: Reference, keyboard = false) {
  await activate(page, '[data-distance-fieldwork-start="' + reference + '"]', keyboard);
  await expect(page.locator(ui.run)).toHaveAttribute('data-distance-fieldwork-run', reference);
  await expect(page.locator('#rh-distance-distance')).toHaveValue('40');
  await expect(page.locator('#rh-distance-cycles')).toHaveValue('12');
  await expect(page.locator('#rh-distance-contrast')).toHaveValue('95');
  await expect(page.locator('[data-distance-fieldwork-trial]')).toHaveCount(0);
  await expect(page.locator(ui.reveal)).toBeDisabled();
}

async function sample(page: Page, distance: number, prediction = predictionAt(distance), keyboard = false) {
  await setRange(page, 'distance', distance);
  await reveal(page, prediction, keyboard);
  const before = await work(page);
  await activate(page, ui.record, keyboard);
  await expect(page.locator('[data-distance-fieldwork-trial][data-distance="' + distance + '"]')).toBeVisible();
  await noSceneWork(page, before, true);
}

async function saveResult(page: Page, reference: Reference, expected: unknown, keyboard = false) {
  await expect(page.locator(ui.saveResult)).toBeEnabled();
  const before = await work(page);
  await activate(page, ui.saveResult, keyboard);
  await expect(page.locator('[data-distance-saved-result="' + reference + '"]')).toBeVisible();
  await expect.poll(async () => (await work(page)).persisted.fieldworkResults[reference]).toEqual(expected);
  const after = await noSceneWork(page, before);
  // Saving evidence must not overwrite the student's current experiment or note.
  for (const key of ['distance', 'cycles', 'contrast', 'records']) expect(after.persisted[key]).toEqual(before.persisted[key]);
  expect(after.persisted.fieldworkResults[reference]).toEqual(expected);
  return after;
}

async function comparison(page: Page, human = [85, 86], eagle = [200, 201]) {
  await expect(page.locator(ui.comparison)).toBeVisible();
  await expect(page.locator(ui.plot)).toHaveAttribute('role', 'img');
  await expect(page.locator(ui.plot)).toHaveAccessibleName(/saved|interval|bracket|reference/i);
  for (const [reference, endpoints] of [['human', human], ['eagle', eagle]] as const) {
    const range = page.locator('[data-distance-results-range="' + reference + '"]');
    await expect(range).toHaveAttribute('data-low', String(endpoints[0]));
    await expect(range).toHaveAttribute('data-high', String(endpoints[1]));
    await expect(range.locator('[data-distance-results-interval]')).toHaveCount(1);
  }
  const bars = await page.locator('[data-distance-results-range]').evaluateAll(groups => groups.map(group => {
    const base = group.querySelector('rect:not([data-distance-results-interval])') as SVGRectElement;
    const interval = group.querySelector('[data-distance-results-interval]') as SVGRectElement;
    return { reference: group.getAttribute('data-distance-results-range'),
      low: Number(group.getAttribute('data-low')), high: Number(group.getAttribute('data-high')),
      origin: base.x.baseVal.value, baseWidth: base.width.baseVal.value,
      intervalStart: interval.x.baseVal.value, intervalWidth: interval.width.baseVal.value };
  }));
  expect(bars).toHaveLength(2);
  for (const bar of bars) {
    expect(bar.baseWidth).toBeGreaterThan(0);
    expect(bar.intervalWidth).toBeGreaterThan(0);
    expect(bar.intervalStart).toBeCloseTo(bar.origin + bar.baseWidth, 4);
    expect(bar.intervalWidth / (bar.high - bar.low)).toBeCloseTo(bar.baseWidth / bar.low, 4);
  }
  expect(bars[0].origin).toBeCloseTo(bars[1].origin, 4);
  expect(bars[0].baseWidth / bars[0].low).toBeCloseTo(bars[1].baseWidth / bars[1].low, 4);
  const exact = [eagle[0] / human[1], eagle[1] / human[0]];
  const outward = [Math.floor(exact[0] * 100) / 100, Math.ceil(exact[1] * 100) / 100];
  const text = await page.locator(ui.ratio).innerText();
  const match = text.match(/(\d+\.\d+)\s*[–-]\s*(\d+\.\d+)\s*[×x]/);
  expect(match, 'Comparison should report both conservative bounds, not a point estimate').not.toBeNull();
  const displayed = [Number(match![1]), Number(match![2])];
  expect(displayed).toEqual(outward);
  expect(displayed[0]).toBeLessThanOrEqual(exact[0]);
  expect(displayed[1]).toBeGreaterThanOrEqual(exact[1]);
  expect(displayed[1] - displayed[0]).toBeLessThan(.12);
  return { human, eagle, exact, displayed, text, bars };
}

async function reflect(page: Page, correct: boolean, keyboard = false) {
  const before = await work(page);
  await activate(page, '[data-distance-results-answer="' + (correct ? 'frequency' : 'detection') + '"]', keyboard);
  await expect(page.locator(ui.feedback)).toHaveAttribute('data-correct', String(correct));
  await noSceneWork(page, before, true);
}

async function close(page: Page, initialSiblings: unknown, keyboard = false) {
  expect(await siblings(page)).toEqual(initialSiblings);
  await page.locator(ui.root).evaluate((root: any) => { (window as any).distanceResultsClosedScene = root._distanceScene; });
  await activate(page, ui.close, keyboard);
  await expect(page.locator(ui.root)).toHaveCount(0);
  await expect(page.locator(ui.launch)).toBeFocused();
  const lifecycle = await page.evaluate(() => (window as any).distanceResultsClosedScene.getDiagnostics().lifecycle);
  expect(lifecycle).toMatchObject({ disposed: true, liveContexts: 0, rendererDisposed: true, birdDisposed: true, ownedResourceCount: 0 });
  expect((await harness.glContexts(page)).every(context => context.lost && context.lostBy === 'page')).toBe(true);
  return lifecycle;
}

test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('keeps actual completed trials and compares conservative human/eagle distance intervals', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  const initial = await setup(page);
  await open(page);
  await expect(page.locator(ui.results)).toHaveCount(0);
  await start(page, 'human');
  await expect(page.locator(ui.saveResult)).toBeDisabled();
  await sample(page, 85, 'neither');
  await expect(page.locator(ui.saveResult)).toBeDisabled();
  await sample(page, 86);
  await expect(page.locator(ui.status)).toHaveAttribute('data-complete', 'true');
  const human = result('human', [85, 86], ['neither', 'eagle']);
  const note = 'I am comparing reference crossings while holding stripe count and contrast fixed.';
  await page.locator(ui.note).fill(note);
  await saveResult(page, 'human', human);
  await expect(page.locator(ui.note)).toHaveValue(note);
  await expect(page.locator(ui.comparison)).toHaveCount(0);
  await expect(page.locator('[data-distance-saved-result]')).toHaveCount(1);

  await start(page, 'eagle');
  await sample(page, 200);
  await sample(page, 201);
  await expect(page.locator(ui.status)).toHaveAttribute('data-complete', 'true');
  // The complete evidence remains valid even if the live experiment has diverged.
  await setRange(page, 'distance', 240);
  await setRange(page, 'cycles', 16);
  await setRange(page, 'contrast', 25);
  await expect(page.locator(ui.record)).toBeDisabled();
  await expect(page.locator(ui.reveal)).toBeDisabled();
  await saveResult(page, 'eagle', cleanEagle);
  expect((await work(page)).persisted.fieldworkResults).toEqual({ version: 1, human, eagle: cleanEagle });
  await expect(page.locator(ui.note)).toHaveValue(note);
  await expect(page.locator('[data-distance-saved-result]')).toHaveCount(2);
  const evidence = await comparison(page);
  await reflect(page, false);
  await reflect(page, true);
  expect((await work(page)).persisted.records).toEqual([priorRecord]);
  await page.locator(ui.results).screenshot({ path: resolve(output, 'saved-distance-comparison-desktop.jpg'), type: 'jpeg', quality: 86 });
  writeFileSync(resolve(output, 'saved-distance-comparison.json'), JSON.stringify({ evidence, state: (await work(page)).persisted }, null, 2));
  await close(page, initial.siblings);
  expect(initial.errors).toEqual([]);
});

test('preserves saved evidence through experiments and notebooks, then replaces and removes only its own slot', async ({ page }) => {
  const initial = await setup(page, { fieldworkResults: cleanResults });
  await open(page);
  await comparison(page);
  await reflect(page, true);
  await setRange(page, 'distance', 140);
  await setRange(page, 'cycles', 8);
  await setRange(page, 'contrast', 60);
  expect((await work(page)).persisted.fieldworkResults).toEqual(cleanResults);
  await expect(page.locator(ui.feedback)).toHaveAttribute('data-correct', 'true');
  await reveal(page, 'eagle');
  await page.locator(ui.note).fill('The saved brackets stay fixed while this new observation uses different settings.');
  const beforeNote = await work(page);
  await activate(page, ui.saveNote);
  await noSceneWork(page, beforeNote);
  expect((await work(page)).persisted.fieldworkResults).toEqual(cleanResults);
  expect((await work(page)).persisted.records).toHaveLength(2);

  await activate(page, '[data-distance-inquiry="cycles"]');
  await reveal(page, 'both');
  await activate(page, '[data-distance-pin]');
  await activate(page, '[data-distance-experiment="cycles"]');
  await reveal(page, 'eagle');
  await page.locator(ui.note).fill('Doubling stripe pairs changed spatial frequency at a fixed distance.');
  await activate(page, ui.saveNote);
  const saved = (await work(page)).persisted;
  expect(saved.fieldworkResults).toEqual(cleanResults);
  expect(saved.records).toHaveLength(3);
  expect(saved.records[2].comparison.reference).toMatchObject({ distance: 80, cycles: 8, contrast: 95 });
  await expect(page.locator(ui.feedback)).toHaveAttribute('data-correct', 'true');
  await close(page, initial.siblings);

  await open(page);
  expect((await work(page)).persisted).toEqual(saved);
  await expect(page.locator(ui.run)).toHaveCount(0);
  await expect(page.locator(ui.feedback)).toHaveCount(0);
  await comparison(page);
  await reflect(page, true);
  await start(page, 'human');
  await sample(page, 84);
  await sample(page, 86);
  const replacement = result('human', [84, 86]);
  await saveResult(page, 'human', replacement);
  await expect(page.locator(ui.feedback)).toHaveCount(0);
  expect((await work(page)).persisted.fieldworkResults).toEqual({ version: 1, human: replacement, eagle: cleanEagle });
  await comparison(page, [84, 86]);
  const beforeRemoval = await work(page);
  await activate(page, '[data-distance-results-remove="human"]');
  await noSceneWork(page, beforeRemoval);
  await expect(page.locator('[data-distance-saved-result="human"]')).toHaveCount(0);
  await expect(page.locator('[data-distance-saved-result="eagle"]')).toBeVisible();
  await expect(page.locator(ui.comparison)).toHaveCount(0);
  expect((await work(page)).persisted.fieldworkResults).toEqual({ version: 1, eagle: cleanEagle });
  expect((await work(page)).persisted.records).toEqual(saved.records);
  await close(page, initial.siblings);
  await open(page);
  await expect(page.locator('[data-distance-saved-result="human"]')).toHaveCount(0);
  await expect(page.locator('[data-distance-saved-result="eagle"]')).toBeVisible();
  expect((await work(page)).persisted.fieldworkResults).toEqual({ version: 1, eagle: cleanEagle });
  writeFileSync(resolve(output, 'saved-distance-persistence.json'), JSON.stringify((await work(page)).persisted, null, 2));
  await close(page, initial.siblings);
  expect(initial.errors).toEqual([]);
});

test('isolates malformed imported slots and supports keyboard result comparison on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const untrustedHuman = { ...cleanHuman, complete: false, width: 9999, low: 1, high: 9999,
    image: 'data:image/png;base64,NOT_SAVED_EVIDENCE', ratio: [999, 1000],
    trials: cleanHuman.trials.map(trial => ({ ...trial, frequency: 0, correct: false, band: 'neither' })) };
  const malformedEagle = { ...cleanEagle, complete: true,
    trials: cleanEagle.trials.map((trial, index) => index ? trial : { ...trial, settings: { ...trial.settings, contrast: 94 } }) };
  const initial = await setup(page, { fieldworkResults: { version: 1, human: untrustedHuman, eagle: malformedEagle } });
  await page.locator('#wrap').evaluate((element: HTMLElement) => { element.style.width = '100%'; });
  await open(page, true);
  await expect(page.locator('[data-distance-saved-result="human"]')).toBeVisible();
  await expect(page.locator('[data-distance-saved-result="human"]')).toContainText(/85\s*[–-]\s*86\s*m/);
  await expect(page.locator('[data-distance-saved-result="eagle"]')).toHaveCount(0);
  await expect(page.locator(ui.comparison)).toHaveCount(0);
  await expect(page.locator(ui.results)).not.toContainText('9999');
  await setRange(page, 'distance', 121);
  expect((await work(page)).persisted.fieldworkResults).toEqual({ version: 1, human: cleanHuman });

  await start(page, 'eagle', true);
  await sample(page, 200, 'eagle', true);
  await activate(page, '[data-distance-fieldwork-distance]', true);
  await expect(page.locator('#rh-distance-distance')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#rh-distance-distance')).toHaveValue('201');
  await sample(page, 201, 'neither', true);
  await saveResult(page, 'eagle', cleanEagle, true);
  const evidence = await comparison(page);
  await reflect(page, false, true);
  await reflect(page, true, true);
  for (const reference of ['human', 'eagle'] as Reference[]) {
    await activate(page, '[data-distance-results-trials="' + reference + '"] > summary', true);
    const rows = page.locator('[data-distance-results-trials="' + reference + '"] [data-distance-saved-trial]');
    await expect(rows).toHaveCount(2);
    const table = await rows.evaluateAll(nodes => nodes.map(node => ({
      distance: Number(node.getAttribute('data-distance')), cells: Array.from(node.querySelectorAll('th,td')).map(cell => cell.textContent || '')
    })));
    for (const row of table) {
      expect(row.cells).toHaveLength(3);
      expect(Math.abs(Number.parseFloat(row.cells[1]) - frequency(row.distance))).toBeLessThan(.006);
      expect(row.cells[2]).toMatch(predictionAt(row.distance) === 'both' ? /within both/i : predictionAt(row.distance) === 'eagle' ? /above human.*within eagle/i : /above both/i);
    }
  }
  const layout = await page.locator(ui.results).evaluate((element: HTMLElement) => {
    const r = element.getBoundingClientRect(), plot = element.querySelector('[data-distance-results-plot]')!.getBoundingClientRect();
    return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
      results: { x: r.x, right: r.right, width: r.width }, plot: { x: plot.x, right: plot.right, width: plot.width } };
  });
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport + 1);
  expect(layout.results.x).toBeGreaterThanOrEqual(0);
  expect(layout.results.right).toBeLessThanOrEqual(layout.viewport + 1);
  expect(layout.plot.width).toBeGreaterThan(200);
  expect(layout.plot.right).toBeLessThanOrEqual(layout.viewport + 1);
  expect((await work(page)).persisted.fieldworkResults).toEqual(cleanResults);
  await page.locator(ui.results).screenshot({ path: resolve(output, 'saved-distance-results-mobile.jpg'), type: 'jpeg', quality: 86 });
  const beforeDetails = await work(page);
  await activate(page, '[data-distance-results-trials="human"] > summary', true);
  await activate(page, '[data-distance-results-trials="eagle"] > summary', true);
  await noSceneWork(page, beforeDetails, true);
  writeFileSync(resolve(output, 'saved-distance-mobile.json'), JSON.stringify({ layout, evidence, state: (await work(page)).persisted }, null, 2));
  await close(page, initial.siblings, true);
  expect(initial.errors).toEqual([]);
});
