# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-deeper-inquiry.spec.ts >> investigates an ambiguous specimen, records bounded reasoning, and exports drafts
- Location: tests\e2e\microbiology-deeper-inquiry.spec.ts:20:5

# Error details

```
Test timeout of 90000ms exceeded.
```

```
TimeoutError: locator.check: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('checkbox', { name: 'Cell structure and chemistry', exact: true })
    - locator resolved to <input type="checkbox" value="structure" name="micro-mystery-evidence"/>

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { GlHarness } from './helpers/stem_gl_harness';
  3   | import { mkdirSync, readFileSync } from 'node:fs';
  4   | import path from 'node:path';
  5   | 
  6   | test.describe.configure({ mode: 'serial', retries: 0, timeout: 90000 });
  7   | const out = path.resolve('reports/micro-lab-deeper-inquiry-2026-09-27');
  8   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
  9   | test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
  10  | test.afterAll(async () => { await harness.stop(); });
  11  | test.afterEach(async ({ page }) => { await harness.unmount(page); });
  12  | async function mount(page: any, tab: string, seed = {}) {
  13  |   await page.setViewportSize({ width: 1280, height: 960 });
  14  |   await harness.mount(page, { microbiology: { tab, ...seed } }, undefined, { expectCanvas: false });
  15  |   await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  16  | }
  17  | const state = (page: any) => page.evaluate(() => (window as any).__toolData.microbiology);
  18  | async function noOverflow(page: any) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); }
  19  | 
  20  | test('investigates an ambiguous specimen, records bounded reasoning, and exports drafts', async ({ page }) => {
  21  |   const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  22  |   await mount(page, 'mystery');
  23  |   await page.getByRole('button', { name: /F An honest unknown/ }).click();
  24  |   await page.getByRole('button', { name: 'Reveal: Size and shape', exact: true }).click();
  25  |   await page.getByRole('button', { name: 'Reveal: Cell structure and chemistry', exact: true }).click();
  26  |   await page.getByRole('button', { name: 'Reveal: Behavior and reproduction', exact: true }).click();
  27  |   await page.getByRole('radio', { name: 'Bacterium', exact: true }).check();
> 28  |   await page.getByRole('checkbox', { name: 'Cell structure and chemistry', exact: true }).check();
      |                                                                                           ^ TimeoutError: locator.check: Timeout 30000ms exceeded.
  29  |   await page.getByRole('checkbox', { name: 'Behavior and reproduction', exact: true }).check();
  30  |   await page.getByRole('radio', { name: /^The evidence supports a broad group/ }).check();
  31  |   await page.getByRole('textbox', { name: 'My evidence and reasoning', exact: true }).fill('The cells lack nuclei and divide independently. Both domains fit; membrane chemistry or DNA evidence could distinguish them.');
  32  |   await page.getByRole('button', { name: 'Check my evidence', exact: true }).click();
  33  |   await expect(page.locator('.micro-mystery-review')).toContainText('Reconsider the classification');
  34  |   await expect(page.getByRole('button', { name: 'Record specimen report', exact: true })).toBeDisabled();
  35  |   await page.getByRole('radio', { name: 'Not enough evidence to distinguish bacteria from archaea', exact: true }).check();
  36  |   await page.getByRole('button', { name: 'Check my evidence', exact: true }).click();
  37  |   await page.getByRole('button', { name: 'Record specimen report', exact: true }).click();
  38  |   await expect(page.locator('.micro-mystery-progress')).toHaveText('1/6 reports recorded');
  39  |   const original = (await state(page)).mysteryLab.cases.unresolved.record;
  40  |   await page.getByRole('textbox', { name: 'My evidence and reasoning', exact: true }).fill('My next question is which membrane lipids this cell contains.');
  41  |   expect((await state(page)).mysteryLab.cases.unresolved.record).toEqual(original);
  42  |   await page.locator('.micro-mystery-header').scrollIntoViewIfNeeded();
  43  |   await page.screenshot({ path: path.join(out, 'mystery-desktop.png') });
  44  |   await page.setViewportSize({ width: 390, height: 844 });
  45  |   await noOverflow(page);
  46  |   await page.screenshot({ path: path.join(out, 'mystery-phone.png') });
  47  |   await page.getByRole('button', { name: 'Practice with the microscope', exact: true }).click();
  48  |   await page.getByRole('tab', { name: 'Mystery specimens', exact: true }).click();
  49  |   await expect(page.getByRole('textbox', { name: 'My evidence and reasoning', exact: true })).toHaveValue(/next question/);
  50  |   const promise = page.waitForEvent('download');
  51  |   await page.getByRole('button', { name: 'Download specimen reports', exact: true }).click();
  52  |   const download = await promise; await download.saveAs(path.join(out, 'specimen-report.txt'));
  53  |   const text = readFileSync(path.join(out, 'specimen-report.txt'), 'utf8');
  54  |   expect(text).toContain('Both domains fit'); expect(text).toContain('My next question');
  55  |   expect(text).toContain('Current cited observations');
  56  |   expect(text).toContain('Current conclusion about limits');
  57  |   expect(text).not.toContain('Freshwater drifter');
  58  |   const saved = await state(page); await harness.unmount(page);
  59  |   await page.evaluate(data => (window as any).__mount({ microbiology: data }), saved);
  60  |   await expect(page.locator('.micro-mystery-record')).toContainText('Both domains fit');
  61  |   expect(errors).toEqual([]);
  62  | });
  63  | 
  64  | test('sweeps one variable and keeps saved responses fixed while preparing another trial', async ({ page }) => {
  65  |   const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  66  |   await mount(page, 'growthLab', { growthLab: { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 } });
  67  |   await page.getByRole('button', { name: 'Use current conditions as control', exact: true }).click();
  68  |   await page.getByText('Explore one variable across a range', { exact: true }).click();
  69  |   await page.getByRole('button', { name: 'Run variable sweep', exact: true }).click();
  70  |   const saved = (await state(page)).growthInvestigation.sweep;
  71  |   await expect(page.locator('.micro-growth-sweep-table tbody tr')).toHaveCount(10);
  72  |   const curve = await page.locator('.micro-growth-sweep-figure path').getAttribute('d');
  73  |   await page.locator('.micro-growth-sweep-figure').screenshot({ path: path.join(out, 'growth-sweep-desktop.png') });
  74  |   await page.locator('#gl-tempC').focus(); await page.keyboard.press('Home');
  75  |   await page.getByLabel('Variable to sweep', { exact: true }).selectOption('oxygen');
  76  |   expect((await state(page)).growthInvestigation.sweep).toEqual(saved);
  77  |   expect(await page.locator('.micro-growth-sweep-figure path').getAttribute('d')).toBe(curve);
  78  |   await page.getByRole('button', { name: 'Use this setting as the next trial: Temperature 30 °C', exact: true }).click();
  79  |   expect((await state(page)).growthLab.tempC).toBe(30);
  80  |   expect((await state(page)).growthInvestigation.control.tempC).toBe(37);
  81  |   await page.setViewportSize({ width: 390, height: 844 });
  82  |   await noOverflow(page);
  83  |   await page.locator('.micro-growth-sweep-figure').scrollIntoViewIfNeeded();
  84  |   await page.screenshot({ path: path.join(out, 'growth-sweep-phone.png') });
  85  |   const promise = page.waitForEvent('download');
  86  |   await page.getByRole('button', { name: 'Download notebook', exact: true }).click();
  87  |   const download = await promise; await download.saveAs(path.join(out, 'sweep-notebook.txt'));
  88  |   expect(readFileSync(path.join(out, 'sweep-notebook.txt'), 'utf8')).toContain('Variable to sweep: Temperature');
  89  |   expect(errors).toEqual([]);
  90  | });
  91  | 
  92  | test('measures with units and preserves measurement and resistance evidence across navigation', async ({ page }) => {
  93  |   const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  94  |   await mount(page, 'microscope');
  95  |   const scope = page.getByRole('region', { name: 'Virtual microscope investigation', exact: true });
  96  |   await scope.getByRole('button', { name: 'Use recommended setup', exact: true }).click();
  97  |   await scope.getByRole('button', { name: 'Focus assist', exact: true }).click();
  98  |   await scope.getByLabel('Your size estimate', { exact: true }).fill('2000');
  99  |   await scope.getByLabel('Estimate units', { exact: true }).selectOption('nm');
  100 |   await scope.getByRole('button', { name: 'Check and save estimate', exact: true }).click();
  101 |   await expect(scope).toContainText('Difference: 0%');
  102 |   const original = (await state(page)).microscopeMeasurements.ecoli.result;
  103 |   await scope.getByRole('button', { name: '400×', exact: true }).click();
  104 |   await expect(scope.getByRole('button', { name: 'Check and save estimate', exact: true })).toBeDisabled();
  105 |   await expect(scope).toContainText('This saved result belongs to the earlier view');
  106 |   expect((await state(page)).microscopeMeasurements.ecoli.result).toEqual(original);
  107 |   await page.setViewportSize({ width: 390, height: 844 });
  108 |   await noOverflow(page);
  109 |   await scope.getByRole('region', { name: 'Scale-bar measurement practice', exact: true }).scrollIntoViewIfNeeded();
  110 |   await page.screenshot({ path: path.join(out, 'measurement-phone.png') });
  111 |   await page.getByRole('tab', { name: 'Resistance', exact: true }).click();
  112 |   await page.getByRole('slider', { name: 'Antibiotic exposure strength in the teaching model', exact: true }).focus(); await page.keyboard.press('Home');
  113 |   await page.getByRole('radio', { name: 'Stay about the same', exact: true }).check();
  114 |   await page.getByRole('button', { name: 'Step round', exact: true }).click();
  115 |   const culture = (await state(page)).resistanceInvestigation;
  116 |   expect(culture.day).toBe(1);
  117 |   await page.getByRole('tab', { name: 'Home', exact: true }).click();
  118 |   await page.getByRole('tab', { name: 'Resistance', exact: true }).click();
  119 |   expect((await state(page)).resistanceInvestigation).toEqual(culture);
  120 |   await expect(page.getByRole('button', { name: '▶ Play', exact: true })).toBeEnabled();
  121 |   await page.getByRole('tab', { name: 'Microscope', exact: true }).click();
  122 |   expect((await state(page)).microscopeMeasurements.ecoli.result).toEqual(original);
  123 |   await expect(scope).toContainText('Measurement notebook · 1/5');
  124 |   expect(errors).toEqual([]);
  125 | });
  126 | 
  127 | test('explores outbreak evidence with a keyboard and preserves past markers after pump closure', async ({ page }) => {
  128 |   const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
```