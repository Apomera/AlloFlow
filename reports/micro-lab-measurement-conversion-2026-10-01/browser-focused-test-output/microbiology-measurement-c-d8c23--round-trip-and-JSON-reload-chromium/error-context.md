# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-measurement-conversion.spec.ts >> explicit conversion preserves only the working magnitude and unit through a keyboard round trip and JSON reload
- Location: tests\e2e\microbiology-measurement-conversion.spec.ts:86:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#micro-measure-conversion-preview')
Expected pattern: /unscored unit conversion/i
Received string:  "Equivalent size: 2 µm = 2000 nm. This conversion is unscored."
Timeout: 15000ms

Call log:
  - Expect "toContainText" with timeout 15000ms
  - waiting for locator('#micro-measure-conversion-preview')
    31 × locator resolved to <p role="status" aria-live="polite" aria-atomic="true" id="micro-measure-conversion-preview">Equivalent size: 2 µm = 2000 nm. This conversion …</p>
       - unexpected value "Equivalent size: 2 µm = 2000 nm. This conversion is unscored."

```

```yaml
- status: "Equivalent size: 2 µm = 2000 nm. This conversion is unscored."
```

# Test source

```ts
  1   | import { test, expect, type Locator, type Page } from '@playwright/test';
  2   | import { GlHarness } from './helpers/stem_gl_harness';
  3   | import { mkdirSync, writeFileSync } from 'node:fs';
  4   | import path from 'node:path';
  5   | 
  6   | test.use({ video: 'off' });
  7   | test.describe.configure({ retries: 0, timeout: 90000 });
  8   | const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-measurement-conversion-2026-10-01');
  9   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
  10  | const context = { version: 1, specimen: 'ecoli', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 2 };
  11  | const literal = '<img src=x onerror="window.__conversionInjected=true"> & keep original notes';
  12  | const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
  13  | const state = (page: Page) => page.evaluate(() => (window as any).__toolData);
  14  | const estimate = (page: Page) => page.getByLabel('Your size estimate', { exact: true });
  15  | const units = (page: Page) => page.getByLabel('Estimate units', { exact: true });
  16  | const preview = (page: Page) => page.locator('#micro-measure-conversion-preview');
  17  | const convert = (page: Page) => page.locator('#micro-measure-convert');
  18  | const practice = (page: Page) => page.getByRole('region', { name: 'Scale-bar measurement practice', exact: true });
  19  | const xp = (page: Page) => page.evaluate(() => (window as any).__conversionXP);
  20  | let errors: string[];
  21  | 
  22  | test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
  23  | test.afterAll(async () => { await harness.stop(); });
  24  | test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
  25  | test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });
  26  | 
  27  | function seed(value = '2', unit = 'um', draftContext: Record<string, any> = context): Record<string, any> {
  28  |   return {
  29  |     tab: 'microscope', showMicroLibrary: false, scopeOrganism: 'ecoli', selectedScope: 'lightbright', magnification: 1000,
  30  |     microscopeZoom: 20, microscopeFocus: 50, microscopeTargetFocus: 50, microscopeLabels: false, microscopeSeenSlides: ['ecoli', 'strep'],
  31  |     microscopeMeasurements: {
  32  |       ecoli: {
  33  |         draft: { value, unit, context: { ...draftContext, rawCalibration: { keep: 'Original working calibration.' } }, notes: literal, rawDraft: ['Keep imported work.'] },
  34  |         result: { value: 1.9, unit: 'um', context: { ...context, rawCheckedContext: true }, notes: 'Original checked note.' },
  35  |         previousResult: { value: 2400, unit: 'nm', context: { ...context, mag: 400, zoom: 50, previousMarker: 'Original checked calibration.' } },
  36  |         importedMetadata: { original: true, nested: [literal] }
  37  |       },
  38  |       strep: { draft: { value: '900', unit: 'nm', context: { ...context, specimen: 'strep', referenceUm: 1 }, notes: 'Independent slide draft.' },
  39  |         result: { value: 1, unit: 'um', context: { ...context, specimen: 'strep', referenceUm: 1 } }, slideMetadata: { untouched: true } },
  40  |       unknownImportedSlide: { rawEntry: { keep: ['Unsupported imported data.', literal] } },
  41  |       rawBookMetadata: { keep: 'Unnormalized imported notebook data.' }
  42  |     },
  43  |     growthInvestigation: { trials: [], selectedId: null, nextId: 20, workingMetadata: literal },
  44  |     resistanceInvestigation: { notes: literal, history: [{ day: 0, sensitive: 72, resistant: 8 }], rawRun: { untouched: true } },
  45  |     externalMarker: { imported: literal, nested: [1, 2, 3] }
  46  |   };
  47  | }
  48  | 
  49  | async function instrument(page: Page) {
  50  |   await page.evaluate(() => { const w = window as any; w.__conversionXP = []; w.__ctx.awardXP = (...args: any[]) => w.__conversionXP.push(args); w.__rerender(); });
  51  | }
  52  | async function mount(page: Page, data = seed()) {
  53  |   await page.setViewportSize({ width: 1280, height: 960 });
  54  |   await harness.mount(page, { unrelatedNotebook: { notes: literal, rawMarker: true }, microbiology: data }, undefined, { expectCanvas: false });
  55  |   await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  56  |   await expect(estimate(page)).toBeVisible(); await expect(preview(page)).toBeVisible(); await instrument(page);
  57  | }
  58  | function converted(before: any, value: string, unit: string) {
  59  |   const expected = clone(before);
  60  |   expected.microbiology.microscopeMeasurements.ecoli.draft.value = value;
  61  |   expected.microbiology.microscopeMeasurements.ecoli.draft.unit = unit;
  62  |   return expected;
  63  | }
  64  | async function activate(page: Page) {
  65  |   await convert(page).focus(); await convert(page).press('Enter');
  66  | }
  67  | async function roundTrip(page: Page) {
  68  |   const saved = clone(await state(page)); await harness.unmount(page);
  69  |   await page.evaluate(data => (window as any).__mount(data), saved);
  70  |   await expect(estimate(page)).toBeVisible(); await expect(preview(page)).toBeVisible(); await instrument(page);
  71  |   expect(await state(page)).toEqual(saved); return saved;
  72  | }
  73  | async function open(details: Locator) {
  74  |   if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) await details.locator(':scope > summary').press('Enter');
  75  |   await expect(details).toHaveAttribute('open', '');
  76  | }
  77  | async function noOverflow(page: Page) {
  78  |   const viewport = await page.evaluate(() => ({ width: innerWidth, zoom: getComputedStyle(document.body).zoom, scroll: document.documentElement.scrollWidth }));
  79  |   expect(viewport.scroll <= viewport.width + 1, JSON.stringify(viewport)).toBe(true);
  80  |   for (const panel of [page.locator('[data-microbiology-tool]'), practice(page), preview(page)]) {
  81  |     const layout = await panel.evaluate(node => ({ id: node.id, client: node.clientWidth, scroll: node.scrollWidth }));
  82  |     expect(layout.scroll <= layout.client + 1, JSON.stringify({ viewport, layout })).toBe(true);
  83  |   }
  84  | }
  85  | 
  86  | test('explicit conversion preserves only the working magnitude and unit through a keyboard round trip and JSON reload', async ({ page }) => {
  87  |   await mount(page); const before = await state(page);
> 88  |   await expect(preview(page)).toContainText('2 µm = 2000 nm'); await expect(preview(page)).toContainText(/unscored unit conversion/i);
      |                                                                                            ^ Error: expect(locator).toContainText(expected) failed
  89  |   await expect(preview(page)).not.toContainText(/reference|difference|practice band/i);
  90  |   expect(await state(page)).toEqual(before);
  91  |   await activate(page);
  92  |   await expect(estimate(page)).toHaveValue('2000'); await expect(units(page)).toHaveValue('nm');
  93  |   await expect(convert(page)).toBeFocused();
  94  |   expect(await state(page)).toEqual(converted(before, '2000', 'nm')); expect(await xp(page)).toEqual([]);
  95  |   await practice(page).screenshot({ path: path.join(out, 'conversion-desktop.png') });
  96  |   const saved = await roundTrip(page); await expect(estimate(page)).toHaveValue('2000'); await expect(units(page)).toHaveValue('nm');
  97  |   writeFileSync(path.join(out, 'conversion-restored-state.json'), JSON.stringify(saved, null, 2) + '\n');
  98  |   await activate(page); await expect(estimate(page)).toHaveValue('2'); await expect(units(page)).toHaveValue('um');
  99  |   expect(await state(page)).toEqual(before); expect(await xp(page)).toEqual([]);
  100 | });
  101 | 
  102 | test('scientific notation converts the physical quantity without checking an estimate or changing evidence history', async ({ page }) => {
  103 |   await mount(page, seed('2e-3')); const before = await state(page);
  104 |   await expect(convert(page)).toBeEnabled(); await activate(page);
  105 |   await expect(estimate(page)).toHaveValue('2'); await expect(units(page)).toHaveValue('nm');
  106 |   expect(await state(page)).toEqual(converted(before, '2', 'nm'));
  107 |   await page.getByRole('button', { name: /^Open measurement notebook/ }).press('Enter');
  108 |   await open(page.locator('[data-measurement-history="ecoli"]'));
  109 |   await expect(page.locator('[data-measurement-version="current"] [data-measurement-field="estimate"]')).toContainText('1.9 µm');
  110 |   await expect(page.locator('[data-measurement-version="previous"] [data-measurement-field="estimate"]')).toContainText('2400 nm');
  111 |   expect(await state(page)).toEqual(converted(before, '2', 'nm')); expect(await xp(page)).toEqual([]);
  112 | });
  113 | 
  114 | test('manual unit selection keeps the typed number and the explicit conversion button then preserves its new quantity', async ({ page }) => {
  115 |   await mount(page, seed('2')); const before = await state(page);
  116 |   await units(page).selectOption('nm'); await expect(estimate(page)).toHaveValue('2'); await expect(units(page)).toHaveValue('nm');
  117 |   const manuallyChanged = await state(page);
  118 |   expect(manuallyChanged.microbiology.microscopeMeasurements.ecoli.draft.value).toBe('2');
  119 |   expect(manuallyChanged.microbiology.microscopeMeasurements.ecoli.draft.unit).toBe('nm');
  120 |   expect(manuallyChanged.microbiology.microscopeMeasurements.ecoli.result).toMatchObject({ value: before.microbiology.microscopeMeasurements.ecoli.result.value, unit: 'um' });
  121 |   await activate(page); await expect(estimate(page)).toHaveValue('0.002'); await expect(units(page)).toHaveValue('um');
  122 |   expect(await state(page)).toEqual(converted(manuallyChanged, '0.002', 'um')); expect(await xp(page)).toEqual([]);
  123 | });
  124 | 
  125 | test('invalid, empty, underflow, and target overflow estimates disable conversion while the exact inclusive bound remains usable', async ({ page }) => {
  126 |   for (const [value, unit] of [['', 'um'], ['0', 'um'], ['-2', 'um'], ['invalid', 'um'], ['1000000001', 'um'], ['1000001', 'um'], ['5e-324', 'nm'], ['2', 'bad'], ['2.' + '0'.repeat(31), 'um']]) {
  127 |     await mount(page, seed(value, unit)); const before = await state(page);
  128 |     await expect(convert(page)).toBeDisabled();
  129 |     await convert(page).evaluate(node => (node as HTMLButtonElement).click());
  130 |     expect(await state(page)).toEqual(before); expect(await xp(page)).toEqual([]); await harness.unmount(page);
  131 |   }
  132 |   await mount(page, seed('1000000')); const before = await state(page);
  133 |   await expect(convert(page)).toBeEnabled(); await activate(page);
  134 |   await expect(estimate(page)).toHaveValue('1000000000'); await expect(units(page)).toHaveValue('nm');
  135 |   expect(await state(page)).toEqual(converted(before, '1000000000', 'nm'));
  136 |   await expect(convert(page)).toBeEnabled(); await activate(page);
  137 |   expect(await state(page)).toEqual(before); expect(await xp(page)).toEqual([]);
  138 | });
  139 | 
  140 | test('a saved working view can change units while its stale calibration and blocked check remain intact', async ({ page }) => {
  141 |   const data = seed('2', 'um', { ...context, mag: 400, zoom: 50 }); data.microscopeFocus = 10;
  142 |   await mount(page, data); const before = await state(page);
  143 |   const check = page.getByRole('button', { name: 'Check and save estimate', exact: true });
  144 |   await expect(check).toBeDisabled(); await expect(practice(page)).toContainText('The view changed after this estimate was started.');
  145 |   await expect(convert(page)).toBeEnabled(); await activate(page);
  146 |   await expect(estimate(page)).toHaveValue('2000'); await expect(check).toBeDisabled();
  147 |   expect(await state(page)).toEqual(converted(before, '2000', 'nm'));
  148 |   const saved = await roundTrip(page); await expect(check).toBeDisabled();
  149 |   expect(saved.microbiology.microscopeMeasurements.ecoli.draft.context).toEqual(before.microbiology.microscopeMeasurements.ecoli.draft.context);
  150 |   expect(await xp(page)).toEqual([]);
  151 | });
  152 | 
  153 | test('conversion reads current state while guarding a replaced draft, changed tab, and changed slide', async ({ page }) => {
  154 |   for (const mode of ['unrelated', 'replace', 'tab', 'slide'] as const) {
  155 |     await mount(page); const before = await state(page);
  156 |     await page.evaluate(mode => {
  157 |       const w = window as any, ctx = w.__ctx, original = ctx.setToolData;
  158 |       w.__conversionBaseSetter = original; w.__conversionRaceConsumed = false;
  159 |       const intercept = (update: any) => {
  160 |         if (typeof update === 'function' && !w.__conversionRaceConsumed) {
  161 |           w.__conversionRaceConsumed = true;
  162 |           original((previous: any) => {
  163 |             const current = previous.microbiology, book = current.microscopeMeasurements;
  164 |             const entry = mode === 'replace' ? { ...book.ecoli, draft: { ...book.ecoli.draft, value: '4', replacementMetadata: true } } : book.ecoli;
  165 |             const next = { ...previous, unrelatedNotebook: { ...previous.unrelatedNotebook, concurrent: true },
  166 |               microbiology: { ...current, microscopeMeasurements: { ...book, ecoli: entry, strep: { ...book.strep, concurrentMetadata: true } },
  167 |                 externalMarker: { ...current.externalMarker, concurrent: true }, ...(mode === 'tab' ? { tab: 'quiz' } : {}),
  168 |                 ...(mode === 'slide' ? { scopeOrganism: 'strep' } : {}) } };
  169 |             w.__conversionRaceExpected = JSON.parse(JSON.stringify(next));
  170 |             if (mode === 'unrelated') { w.__conversionRaceExpected.microbiology.microscopeMeasurements.ecoli.draft.value = '2000'; w.__conversionRaceExpected.microbiology.microscopeMeasurements.ecoli.draft.unit = 'nm'; }
  171 |             return next;
  172 |           });
  173 |         }
  174 |         original(update);
  175 |       };
  176 |       ctx.setToolData = intercept; ctx.setLabToolData = intercept; w.__rerender();
  177 |     }, mode);
  178 |     await activate(page);
  179 |     expect(await page.evaluate(() => (window as any).__conversionRaceConsumed)).toBe(true);
  180 |     expect(await state(page)).toEqual(await page.evaluate(() => (window as any).__conversionRaceExpected));
  181 |     expect((await state(page)).microbiology.microscopeMeasurements.ecoli.result).toEqual(before.microbiology.microscopeMeasurements.ecoli.result);
  182 |     expect(await xp(page)).toEqual([]);
  183 |     await page.evaluate(() => { const w = window as any; w.__ctx.setToolData = w.__conversionBaseSetter; w.__ctx.setLabToolData = w.__conversionBaseSetter; w.__rerender(); });
  184 |     await harness.unmount(page);
  185 |   }
  186 | });
  187 | 
  188 | test('conversion stays keyboard usable at phone width and 200% and 400% zoom without interpreting imported notes', async ({ page }) => {
```