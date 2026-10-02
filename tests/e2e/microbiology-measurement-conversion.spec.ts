import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 90000 });
const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-measurement-conversion-2026-10-01');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
const context = { version: 1, specimen: 'ecoli', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 2 };
const literal = '<img src=x onerror="window.__conversionInjected=true"> & keep original notes';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const state = (page: Page) => page.evaluate(() => (window as any).__toolData);
const estimate = (page: Page) => page.getByLabel('Your size estimate', { exact: true });
const units = (page: Page) => page.getByLabel('Estimate units', { exact: true });
const preview = (page: Page) => page.locator('#micro-measure-conversion-preview');
const convert = (page: Page) => page.locator('#micro-measure-convert');
const practice = (page: Page) => page.getByRole('region', { name: 'Scale-bar measurement practice', exact: true });
const xp = (page: Page) => page.evaluate(() => (window as any).__conversionXP);
let errors: string[];

test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });

function seed(value = '2', unit = 'um', draftContext: Record<string, any> = context): Record<string, any> {
  return {
    tab: 'microscope', showMicroLibrary: false, scopeOrganism: 'ecoli', selectedScope: 'lightbright', magnification: 1000,
    microscopeZoom: 20, microscopeFocus: 50, microscopeTargetFocus: 50, microscopeLabels: false, microscopeSeenSlides: ['ecoli', 'strep'],
    microscopeMeasurements: {
      ecoli: {
        draft: { value, unit, context: { ...draftContext, rawCalibration: { keep: 'Original working calibration.' } }, notes: literal, rawDraft: ['Keep imported work.'] },
        result: { value: 1.9, unit: 'um', context: { ...context, rawCheckedContext: true }, notes: 'Original checked note.' },
        previousResult: { value: 2400, unit: 'nm', context: { ...context, mag: 400, zoom: 50, previousMarker: 'Original checked calibration.' } },
        importedMetadata: { original: true, nested: [literal] }
      },
      strep: { draft: { value: '900', unit: 'nm', context: { ...context, specimen: 'strep', referenceUm: 1 }, notes: 'Independent slide draft.' },
        result: { value: 1, unit: 'um', context: { ...context, specimen: 'strep', referenceUm: 1 } }, slideMetadata: { untouched: true } },
      unknownImportedSlide: { rawEntry: { keep: ['Unsupported imported data.', literal] } },
      rawBookMetadata: { keep: 'Unnormalized imported notebook data.' }
    },
    growthInvestigation: { trials: [], selectedId: null, nextId: 20, workingMetadata: literal },
    resistanceInvestigation: { notes: literal, history: [{ day: 0, sensitive: 72, resistant: 8 }], rawRun: { untouched: true } },
    externalMarker: { imported: literal, nested: [1, 2, 3] }
  };
}

async function instrument(page: Page) {
  await page.evaluate(() => { const w = window as any; w.__conversionXP = []; w.__ctx.awardXP = (...args: any[]) => w.__conversionXP.push(args); w.__rerender(); });
}
async function mount(page: Page, data = seed()) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { unrelatedNotebook: { notes: literal, rawMarker: true }, microbiology: data }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  await expect(estimate(page)).toBeVisible(); await expect(preview(page)).toBeVisible(); await instrument(page);
}
function converted(before: any, value: string, unit: string) {
  const expected = clone(before);
  expected.microbiology.microscopeMeasurements.ecoli.draft.value = value;
  expected.microbiology.microscopeMeasurements.ecoli.draft.unit = unit;
  return expected;
}
async function activate(page: Page) {
  await convert(page).focus(); await convert(page).press('Enter');
}
async function roundTrip(page: Page) {
  const saved = clone(await state(page)); await harness.unmount(page);
  await page.evaluate(data => (window as any).__mount(data), saved);
  await expect(estimate(page)).toBeVisible(); await expect(preview(page)).toBeVisible(); await instrument(page);
  expect(await state(page)).toEqual(saved); return saved;
}
async function open(details: Locator) {
  if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) await details.locator(':scope > summary').press('Enter');
  await expect(details).toHaveAttribute('open', '');
}
async function noOverflow(page: Page) {
  const viewport = await page.evaluate(() => ({ width: innerWidth, zoom: getComputedStyle(document.body).zoom, scroll: document.documentElement.scrollWidth }));
  expect(viewport.scroll <= viewport.width + 1, JSON.stringify(viewport)).toBe(true);
  for (const panel of [page.locator('[data-microbiology-tool]'), practice(page), preview(page)]) {
    const layout = await panel.evaluate(node => ({ id: node.id, client: node.clientWidth, scroll: node.scrollWidth }));
    expect(layout.scroll <= layout.client + 1, JSON.stringify({ viewport, layout })).toBe(true);
  }
}

test('explicit conversion preserves only the working magnitude and unit through a keyboard round trip and JSON reload', async ({ page }) => {
  await mount(page); const before = await state(page);
  await expect(preview(page)).toContainText('2 µm = 2000 nm'); await expect(preview(page)).toContainText(/conversion is unscored/i);
  await expect(preview(page)).not.toContainText(/reference|difference|practice band/i);
  expect(await state(page)).toEqual(before);
  await activate(page);
  await expect(estimate(page)).toHaveValue('2000'); await expect(units(page)).toHaveValue('nm');
  await expect(convert(page)).toBeFocused();
  expect(await state(page)).toEqual(converted(before, '2000', 'nm')); expect(await xp(page)).toEqual([]);
  await practice(page).screenshot({ path: path.join(out, 'conversion-desktop.png') });
  const saved = await roundTrip(page); await expect(estimate(page)).toHaveValue('2000'); await expect(units(page)).toHaveValue('nm');
  writeFileSync(path.join(out, 'conversion-restored-state.json'), JSON.stringify(saved, null, 2) + '\n');
  await activate(page); await expect(estimate(page)).toHaveValue('2'); await expect(units(page)).toHaveValue('um');
  expect(await state(page)).toEqual(before); expect(await xp(page)).toEqual([]);
});

test('scientific notation converts the physical quantity without checking an estimate or changing evidence history', async ({ page }) => {
  await mount(page, seed('2e-3')); const before = await state(page);
  await expect(convert(page)).toBeEnabled(); await activate(page);
  await expect(estimate(page)).toHaveValue('2'); await expect(units(page)).toHaveValue('nm');
  expect(await state(page)).toEqual(converted(before, '2', 'nm'));
  await page.getByRole('button', { name: /^Open measurement notebook/ }).press('Enter');
  await open(page.locator('[data-measurement-history="ecoli"]'));
  await expect(page.locator('[data-measurement-version="current"] [data-measurement-field="estimate"]')).toContainText('1.9 µm');
  await expect(page.locator('[data-measurement-version="previous"] [data-measurement-field="estimate"]')).toContainText('2400 nm');
  expect(await state(page)).toEqual(converted(before, '2', 'nm')); expect(await xp(page)).toEqual([]);
});

test('manual unit selection keeps the typed number and the explicit conversion button then preserves its new quantity', async ({ page }) => {
  await mount(page, seed('2')); const before = await state(page);
  await units(page).selectOption('nm'); await expect(estimate(page)).toHaveValue('2'); await expect(units(page)).toHaveValue('nm');
  const manuallyChanged = await state(page);
  expect(manuallyChanged.microbiology.microscopeMeasurements.ecoli.draft.value).toBe('2');
  expect(manuallyChanged.microbiology.microscopeMeasurements.ecoli.draft.unit).toBe('nm');
  expect(manuallyChanged.microbiology.microscopeMeasurements.ecoli.result).toMatchObject({ value: before.microbiology.microscopeMeasurements.ecoli.result.value, unit: 'um' });
  await activate(page); await expect(estimate(page)).toHaveValue('0.002'); await expect(units(page)).toHaveValue('um');
  expect(await state(page)).toEqual(converted(manuallyChanged, '0.002', 'um')); expect(await xp(page)).toEqual([]);
});

test('invalid, empty, underflow, and target overflow estimates disable conversion while the exact inclusive bound remains usable', async ({ page }) => {
  for (const [value, unit] of [['', 'um'], ['0', 'um'], ['-2', 'um'], ['invalid', 'um'], ['1000000001', 'um'], ['1000001', 'um'], ['5e-324', 'nm'], ['2', 'bad'], ['2.' + '0'.repeat(31), 'um']]) {
    await mount(page, seed(value, unit)); const before = await state(page);
    await expect(convert(page)).toBeDisabled();
    await convert(page).evaluate(node => (node as HTMLButtonElement).click());
    expect(await state(page)).toEqual(before); expect(await xp(page)).toEqual([]); await harness.unmount(page);
  }
  await mount(page, seed('1000000')); const before = await state(page);
  await expect(convert(page)).toBeEnabled(); await activate(page);
  await expect(estimate(page)).toHaveValue('1000000000'); await expect(units(page)).toHaveValue('nm');
  expect(await state(page)).toEqual(converted(before, '1000000000', 'nm'));
  await expect(convert(page)).toBeEnabled(); await activate(page);
  expect(await state(page)).toEqual(before); expect(await xp(page)).toEqual([]);
});

test('a saved working view can change units while its stale calibration and blocked check remain intact', async ({ page }) => {
  const data = seed('2', 'um', { ...context, mag: 400, zoom: 50 }); data.microscopeFocus = 10;
  await mount(page, data); const before = await state(page);
  const check = page.getByRole('button', { name: 'Check and save estimate', exact: true });
  await expect(check).toBeDisabled(); await expect(practice(page)).toContainText('The view changed after this estimate was started.');
  await expect(convert(page)).toBeEnabled(); await activate(page);
  await expect(estimate(page)).toHaveValue('2000'); await expect(check).toBeDisabled();
  expect(await state(page)).toEqual(converted(before, '2000', 'nm'));
  const saved = await roundTrip(page); await expect(check).toBeDisabled();
  expect(saved.microbiology.microscopeMeasurements.ecoli.draft.context).toEqual(before.microbiology.microscopeMeasurements.ecoli.draft.context);
  expect(await xp(page)).toEqual([]);
});

test('conversion reads current state while guarding a replaced draft, changed tab, and changed slide', async ({ page }) => {
  for (const mode of ['unrelated', 'replace', 'tab', 'slide'] as const) {
    await mount(page); const before = await state(page);
    await page.evaluate(mode => {
      const w = window as any, ctx = w.__ctx, original = ctx.setToolData;
      w.__conversionBaseSetter = original; w.__conversionRaceConsumed = false;
      const intercept = (update: any) => {
        if (typeof update === 'function' && !w.__conversionRaceConsumed) {
          w.__conversionRaceConsumed = true;
          original((previous: any) => {
            const current = previous.microbiology, book = current.microscopeMeasurements;
            const entry = mode === 'replace' ? { ...book.ecoli, draft: { ...book.ecoli.draft, value: '4', replacementMetadata: true } } : book.ecoli;
            const next = { ...previous, unrelatedNotebook: { ...previous.unrelatedNotebook, concurrent: true },
              microbiology: { ...current, microscopeMeasurements: { ...book, ecoli: entry, strep: { ...book.strep, concurrentMetadata: true } },
                externalMarker: { ...current.externalMarker, concurrent: true }, ...(mode === 'tab' ? { tab: 'quiz' } : {}),
                ...(mode === 'slide' ? { scopeOrganism: 'strep' } : {}) } };
            w.__conversionRaceExpected = JSON.parse(JSON.stringify(next));
            if (mode === 'unrelated') { w.__conversionRaceExpected.microbiology.microscopeMeasurements.ecoli.draft.value = '2000'; w.__conversionRaceExpected.microbiology.microscopeMeasurements.ecoli.draft.unit = 'nm'; }
            return next;
          });
        }
        original(update);
      };
      ctx.setToolData = intercept; ctx.setLabToolData = intercept; w.__rerender();
    }, mode);
    await activate(page);
    expect(await page.evaluate(() => (window as any).__conversionRaceConsumed)).toBe(true);
    expect(await state(page)).toEqual(await page.evaluate(() => (window as any).__conversionRaceExpected));
    expect((await state(page)).microbiology.microscopeMeasurements.ecoli.result).toEqual(before.microbiology.microscopeMeasurements.ecoli.result);
    expect(await xp(page)).toEqual([]);
    await page.evaluate(() => { const w = window as any; w.__ctx.setToolData = w.__conversionBaseSetter; w.__ctx.setLabToolData = w.__conversionBaseSetter; w.__rerender(); });
    await harness.unmount(page);
  }
});

test('conversion stays keyboard usable at phone width and 200% and 400% zoom without interpreting imported notes', async ({ page }) => {
  await mount(page); const before = await state(page);
  await page.setViewportSize({ width: 320, height: 844 }); await noOverflow(page);
  await convert(page).focus(); await convert(page).press('Enter'); await expect(estimate(page)).toHaveValue('2000');
  expect(await state(page)).toEqual(converted(before, '2000', 'nm')); await noOverflow(page);
  await practice(page).screenshot({ path: path.join(out, 'conversion-phone.png') });
  for (const zoom of [2, 4]) {
    await page.setViewportSize({ width: 1280, height: 960 });
    await page.evaluate(value => { document.body.style.zoom = String(value); }, zoom);
    await noOverflow(page); await expect(convert(page)).toBeVisible(); await activate(page); await noOverflow(page);
  }
  await practice(page).screenshot({ path: path.join(out, 'conversion-zoom.png') });
  expect(await state(page)).toEqual(converted(before, '2000', 'nm')); expect(await xp(page)).toEqual([]);
  expect(await page.evaluate(() => Boolean((window as any).__conversionInjected))).toBe(false);
  await expect(page.locator('[data-microbiology-tool] img[src="x"]')).toHaveCount(0);
  expect((await state(page)).microbiology.microscopeMeasurements.ecoli.draft.notes).toBe(literal);
});
