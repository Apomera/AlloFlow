# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-investigation.spec.ts >> predicts, compares, keeps immutable evidence, restores state, and downloads full notebook
- Location: tests\e2e\microbiology-investigation.spec.ts:22:5

# Error details

```
TimeoutError: locator.fill: Timeout 30000ms exceeded.
Call log:
  - waiting for getByLabel('My reasoning before the run', { exact: true })

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { GlHarness } from './helpers/stem_gl_harness';
  3   | import { mkdirSync, readFileSync } from 'node:fs';
  4   | import path from 'node:path';
  5   | 
  6   | test.describe.configure({ mode: 'serial', retries: 0, timeout: 90000 });
  7   | const out = path.resolve('reports/micro-lab-enhancement-2026-09-27');
  8   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
  9   | test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
  10  | test.afterAll(async () => { await harness.stop(); });
  11  | test.afterEach(async ({ page }) => { await harness.unmount(page); });
  12  | 
  13  | async function mount(page: any, state = {}, width = 1280) {
  14  |   await page.setViewportSize({ width, height: 960 });
  15  |   await harness.mount(page, { microbiology: { tab: 'growthLab', ...state } }, undefined, { expectCanvas: false });
  16  |   await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  17  |   await expect(page.locator('[data-microbiology-tool]')).toBeVisible();
  18  | }
  19  | async function slider(page: any, id: string, key: string) { await page.locator(id).focus(); await page.keyboard.press(key); }
  20  | const notebook = (page: any) => page.evaluate(() => (window as any).__toolData.microbiology.growthInvestigation);
  21  | 
  22  | test('predicts, compares, keeps immutable evidence, restores state, and downloads full notebook', async ({ page }) => {
  23  |   const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  24  |   await mount(page, { growthLab: { hypothesis: 'My earlier hypothesis', explanation: 'My earlier explanation', log: [{ profile: 'E. coli', t: 30, p: 7, o: 50, state: 'Slow' }] } });
  25  |   await expect(page.getByRole('button', { name: 'Run comparison', exact: true })).toBeDisabled();
  26  |   await page.getByRole('button', { name: 'Does E. coli need oxygen?', exact: true }).click();
  27  |   await page.getByRole('radio', { name: 'Lower population', exact: true }).check();
> 28  |   await page.getByLabel('My reasoning before the run', { exact: true }).fill('Without oxygen, E. coli should grow more slowly.');
      |                                                                         ^ TimeoutError: locator.fill: Timeout 30000ms exceeded.
  29  |   await page.getByRole('button', { name: 'Run comparison', exact: true }).click();
  30  |   await expect(page.locator('[data-design=single]')).toContainText('Oxygen availability');
  31  |   await expect(page.locator('[data-micro-growth-result]')).toContainText('Your prediction matches this run');
  32  |   const first = (await notebook(page)).trials[0];
  33  |   expect(first.control.oxygen).toBe(100); expect(first.conditions.oxygen).toBe(0);
  34  |   await page.getByLabel('My evidence and explanation', { exact: true }).fill('Both populations grow. The no-oxygen curve grows more slowly, so oxygen helps but is not essential here.');
  35  |   await page.getByText('Open the accessible data table', { exact: true }).click();
  36  |   await expect(page.locator('.micro-growth-table-wrap tbody tr')).toHaveCount(25);
  37  |   await page.locator('[data-micro-growth-result]').screenshot({ path: path.join(out, 'growth-result-desktop.png') });
  38  |   await slider(page, '#gl-tempC', 'ArrowLeft');
  39  |   await page.getByRole('button', { name: 'Use current conditions as control', exact: true }).click();
  40  |   expect((await notebook(page)).trials[0].control).toEqual(first.control);
  41  |   await slider(page, '#gl-tempC', 'ArrowLeft');
  42  |   await slider(page, '#gl-oxygen', 'End');
  43  |   await page.getByRole('button', { name: 'Run comparison', exact: true }).click();
  44  |   await expect(page.locator('[data-design=confounded]')).toContainText('Multiple variables changed');
  45  |   await page.getByRole('button', { name: /^Trial 1/ }).click();
  46  |   await expect(page.getByLabel('My evidence and explanation', { exact: true })).toHaveValue(/Both populations grow/);
  47  |   await page.getByRole('tab', { name: 'Home', exact: true }).click();
  48  |   await expect(page.locator('[data-microbiology-focus]')).toBeVisible();
  49  |   await page.getByRole('tab', { name: 'Growth Lab', exact: true }).click();
  50  |   await expect(page.getByLabel('My evidence and explanation', { exact: true })).toHaveValue(/Both populations grow/);
  51  |   await page.getByText('Notes from the earlier Growth Lab', { exact: true }).click();
  52  |   await expect(page.getByText('My earlier hypothesis', { exact: true })).toBeVisible();
  53  |   const downloadPromise = page.waitForEvent('download');
  54  |   await page.getByRole('button', { name: 'Download notebook', exact: true }).click();
  55  |   const download = await downloadPromise;
  56  |   expect(download.suggestedFilename()).toBe('micro-lab-notebook.txt');
  57  |   await download.saveAs(path.join(out, 'sample-notebook.txt'));
  58  |   const exported = readFileSync(path.join(out, 'sample-notebook.txt'), 'utf8');
  59  |   expect(exported).toContain('Both populations grow'); expect(exported).toContain('Oxygen availability 100/100');
  60  |   expect(exported).toContain('Model hour\tControl\tTrial');
  61  |   const csvPromise = page.waitForEvent('download');
  62  |   await page.getByRole('button', { name: 'Download trial CSV', exact: true }).click();
  63  |   const csv = await csvPromise;
  64  |   expect(csv.suggestedFilename()).toBe('micro-lab-trials.csv');
  65  |   await csv.saveAs(path.join(out, 'sample-trials.csv'));
  66  |   expect(readFileSync(path.join(out, 'sample-trials.csv'), 'utf8')).toContain('control_oxygen_availability_0_100');
  67  |   const saved = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)));
  68  |   await harness.unmount(page);
  69  |   await page.evaluate(data => (window as any).__mount(data), saved);
  70  |   await expect(page.getByLabel('My evidence and explanation', { exact: true })).toHaveValue(/Both populations grow/);
  71  |   expect(errors).toEqual([]);
  72  | });
  73  | 
  74  | test('microscope scale and optical limits, then resistance extinction on a phone', async ({ page }) => {
  75  |   const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  76  |   await mount(page, { tab: 'microscope' });
  77  |   const scope = page.getByRole('region', { name: 'Virtual microscope investigation', exact: true });
  78  |   await scope.getByRole('button', { name: 'Use recommended setup', exact: true }).click();
  79  |   await scope.getByRole('button', { name: 'Focus assist', exact: true }).click();
  80  |   await expect(scope).toContainText('Slides observed: 1/5');
  81  |   await expect(scope).toContainText('Model field width: 9 µm');
  82  |   await scope.screenshot({ path: path.join(out, 'microscope-desktop.png') });
  83  |   await scope.getByRole('button', { name: 'T4 bacteriophage', exact: true }).click();
  84  |   await expect(scope).toContainText('Head and tail cannot be resolved');
  85  |   await scope.getByRole('button', { name: 'Use recommended setup', exact: true }).click();
  86  |   await scope.getByRole('button', { name: 'Focus assist', exact: true }).click();
  87  |   await expect(scope).toContainText('A head, tail, and tail fibers');
  88  |   await expect(scope).toContainText('Slides observed: 2/5');
  89  |   await page.setViewportSize({ width: 390, height: 844 });
  90  |   await scope.screenshot({ path: path.join(out, 'microscope-phone.png') });
  91  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  92  |   await page.getByRole('tab', { name: 'Resistance', exact: true }).click();
  93  |   await page.getByRole('slider', { name: 'Initial resistance', exact: true }).focus(); await page.keyboard.press('Home');
  94  |   await page.getByRole('slider', { name: 'Antibiotic exposure strength in the teaching model', exact: true }).focus(); await page.keyboard.press('End');
  95  |   await page.getByRole('radio', { name: 'No survivors to compare', exact: true }).check();
  96  |   await page.getByRole('button', { name: 'Step round', exact: true }).click();
  97  |   await expect(page.getByRole('button', { name: 'Step round', exact: true })).toBeDisabled();
  98  |   await expect(page.getByText('The population died out.', { exact: false })).toBeVisible();
  99  |   await page.getByRole('radio', { name: 'No cells survived, so the final resistant share is undefined.', exact: true }).check();
  100 |   await page.getByRole('button', { name: 'Submit explanation', exact: true }).click();
  101 |   await expect(page.getByText('Explanation confirmed.', { exact: false })).toBeVisible();
  102 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  103 |   await page.getByRole('button', { name: 'Step round', exact: true }).scrollIntoViewIfNeeded();
  104 |   await page.screenshot({ path: path.join(out, 'resistance-phone.png') });
  105 |   expect(errors).toEqual([]);
  106 | });
  107 | 
  108 | test('phone, keyboard tabs, no-growth meaning, and notebook capacity', async ({ page }) => {
  109 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  110 |   await mount(page, {}, 390);
  111 |   await page.getByRole('button', { name: 'When oxygen inhibits growth', exact: true }).click();
  112 |   await page.getByRole('radio', { name: 'Not sure yet', exact: true }).check();
  113 |   await page.getByRole('button', { name: 'Run comparison', exact: true }).click();
  114 |   await expect(page.locator('.micro-growth-metrics')).toContainText('5.0');
  115 |   await expect(page.locator('[data-micro-growth-result]')).toContainText('a flat curve does not mean the cells are dead');
  116 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  117 |   await page.screenshot({ path: path.join(out, 'growth-phone.png'), fullPage: true });
  118 |   await page.getByRole('tab', { name: 'Growth Lab', exact: true }).focus();
  119 |   await page.keyboard.press('Home');
  120 |   await expect(page.getByRole('tab', { name: 'Home', exact: true })).toBeFocused();
  121 |   await expect(page.getByRole('tab', { name: 'Home', exact: true })).toHaveAttribute('aria-selected', 'true');
  122 |   await page.keyboard.press('End');
  123 |   await expect(page.getByRole('tab', { name: 'Growth Lab', exact: true })).toBeFocused();
  124 |   await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'micro-tab-growthLab');
  125 |   for (let i = 1; i < 12; i++) await page.getByRole('button', { name: 'Run comparison', exact: true }).click();
  126 |   await expect(page.getByRole('button', { name: 'Run comparison', exact: true })).toBeDisabled();
  127 |   await page.getByRole('button', { name: 'Remove selected trial', exact: true }).click();
  128 |   await expect(page.getByRole('button', { name: 'Run comparison', exact: true })).toBeEnabled();
```