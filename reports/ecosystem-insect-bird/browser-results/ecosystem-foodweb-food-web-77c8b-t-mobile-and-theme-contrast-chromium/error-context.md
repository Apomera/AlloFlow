# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ecosystem-foodweb.spec.ts >> food-web discovery, interactions, paired data, export, mobile and theme contrast
- Location: tests\e2e\ecosystem-foodweb.spec.ts:9:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 0
+ Received  + 2

@@ -2,6 +2,8 @@
    "0.0",
    "0.0",
    "0.0",
    "0.0",
    "0.0",
+   "0.0",
+   "0.0",
  ]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import fs from 'node:fs';
  3  | import { GlHarness } from './helpers/stem_gl_harness';
  4  | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem', width: 1100, height: 900, appStyles: true });
  5  | test.beforeAll(async () => harness.start());
  6  | test.afterAll(async () => harness.stop());
  7  | test.afterEach(async ({ page }) => harness.destroy(page));
  8  | 
  9  | test('food-web discovery, interactions, paired data, export, mobile and theme contrast', async ({ page }) => {
  10 |   await page.setViewportSize({ width: 1140, height: 940 });
  11 |   await harness.mount(page, { ecosystem: { tab: 'sandbox', tutorialDismissed: true } }, undefined, { expectCanvas: false });
  12 |   await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block;padding:16px;background:white'; });
  13 |   const sandbox = page.getByRole('tab', { name: /Sandbox/ });
  14 |   await sandbox.focus(); await sandbox.press('ArrowRight');
  15 |   await expect(page.getByRole('tab', { name: /Food web/ })).toHaveAttribute('aria-selected', 'true');
  16 |   const lab = page.locator('[data-eco-foodweb]');
  17 |   await expect(lab).toBeVisible();
  18 |   await expect(lab.locator('.efw-node')).toHaveCount(5);
  19 |   await expect(page.locator('[data-eco-scenario-picker]')).toHaveCount(0);
  20 |   const owlNode = lab.getByRole('button', { name: /Inspect Barn owls/ });
  21 |   await owlNode.focus();
  22 |   await expect(owlNode).toHaveCSS('outline-color', 'rgb(253, 230, 138)');
  23 |   await owlNode.press('Enter');
  24 |   await expect(lab.locator('[data-efw-relationships]')).toContainText('Meadow voles → Barn owls');
  25 |   await lab.scrollIntoViewIfNeeded();
  26 |   await page.screenshot({ path: 'reports/ecosystem-foodweb-expansion/desktop-builder.png' });
  27 |   await page.getByLabel('Your prediction (optional)').fill('Removing foxes may increase prey and grazing pressure.');
  28 |   await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  29 |   const results = lab.locator('[data-efw-results]');
  30 |   await expect(results).toBeVisible();
  31 |   await expect(results).toContainText('Prediction before this run: Removing foxes');
  32 |   await page.getByLabel('Chart group', { exact: true }).selectOption('foxes');
  33 |   await expect(results.locator('tbody tr').filter({ hasText: 'Red foxes' }).locator('td').nth(1)).toHaveText('0.0');
  34 |   const points = await lab.locator('[data-efw-chart] polyline').evaluateAll(els => els.map(el => el.getAttribute('points')));
  35 |   expect(points.join(' ')).not.toMatch(/NaN|Infinity/);
  36 |   await expect(lab.locator('[data-efw-chart] polyline[stroke-dasharray]')).toHaveCount(1);
  37 |   const time = page.getByRole('slider', { name: 'Food-web comparison time' });
  38 |   await time.focus(); await time.press('Home');
  39 |   await expect(results.locator('caption')).toContainText('time 0.0');
> 40 |   expect(await results.locator('tbody tr td:last-child').allTextContents()).toEqual(['0.0', '0.0', '0.0', '0.0', '0.0']);
     |                                                                             ^ Error: expect(received).toEqual(expected) // deep equality
  41 |   await time.press('End');
  42 |   await page.getByLabel('Chart group', { exact: true }).selectOption('plants');
  43 |   await results.scrollIntoViewIfNeeded();
  44 |   await page.screenshot({ path: 'reports/ecosystem-foodweb-expansion/desktop-comparison.png' });
  45 |   const downloadPromise = page.waitForEvent('download');
  46 |   await page.getByRole('button', { name: 'Export comparison CSV' }).click();
  47 |   const download = await downloadPromise;
  48 |   const csvPath = 'reports/ecosystem-foodweb-expansion/comparison.csv';
  49 |   await download.saveAs(csvPath);
  50 |   expect(fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/)).toHaveLength(242);
  51 |   await page.getByLabel('Explain an indirect change', { exact: true }).fill('Plants changed through the herbivores.');
  52 |   await page.getByRole('tab', { name: /Quiz/ }).click();
  53 |   await page.getByRole('tab', { name: /Food web/ }).click();
  54 |   await expect(page.getByLabel('Explain an indirect change', { exact: true })).toHaveValue('Plants changed through the herbivores.');
  55 |   await expect(results).toBeVisible();
  56 |   for (const theme of ['default', 'dark', 'contrast']) {
  57 |     await page.evaluate(theme => {
  58 |       document.body.className = 'theme-' + theme + (theme === 'dark' ? ' dark' : '');
  59 |       const w = window as any; w.__ctx.theme = theme; w.__ctx.isDark = theme === 'dark'; w.__ctx.isContrast = theme === 'contrast'; w.__rerender();
  60 |     }, theme);
  61 |     const ratios = await lab.evaluate(el => {
  62 |       const css = getComputedStyle(el);
  63 |       const lum = (color: string) => { let hex = color.trim().replace('#', ''); if (hex.length === 3) hex = hex.split('').map(c => c + c).join(''); const v = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(n => n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4)); return v[0] * 0.2126 + v[1] * 0.7152 + v[2] * 0.0722; };
  64 |       const ratio = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  65 |       const panel = css.getPropertyValue('--fw-panel');
  66 |       return ['--fw-ink', '--fw-muted', '--fw-accent'].map(key => ratio(css.getPropertyValue(key), panel));
  67 |     });
  68 |     expect(Math.min(...ratios), theme + ' text palette').toBeGreaterThanOrEqual(4.5);
  69 |     await lab.locator('.efw-network').screenshot({ path: `reports/ecosystem-foodweb-expansion/network-${theme}.png` });
  70 |   }
  71 |   await page.setViewportSize({ width: 390, height: 844 });
  72 |   await page.evaluate(() => { document.body.className = 'theme-default'; const w = window as any; w.__ctx.theme = 'default'; w.__ctx.isDark = false; w.__ctx.isContrast = false; w.__rerender(); });
  73 |   await lab.locator('.efw-network').scrollIntoViewIfNeeded();
  74 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  75 |   await page.screenshot({ path: 'reports/ecosystem-foodweb-expansion/mobile-network.png' });
  76 |   await results.scrollIntoViewIfNeeded();
  77 |   await page.screenshot({ path: 'reports/ecosystem-foodweb-expansion/mobile-comparison.png' });
  78 |   await page.setViewportSize({ width: 320, height: 844 });
  79 |   await lab.locator('.efw-network').scrollIntoViewIfNeeded();
  80 |   expect(await lab.locator('.efw-network').evaluate(el => {
  81 |     const stage = el.getBoundingClientRect();
  82 |     return [...el.querySelectorAll('.efw-node')].every(node => { const r = node.getBoundingClientRect(); return r.left >= stage.left && r.right <= stage.right && r.top >= stage.top && r.bottom <= stage.bottom; });
  83 |   })).toBe(true);
  84 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  85 |   await page.screenshot({ path: 'reports/ecosystem-foodweb-expansion/mobile-320.png' });
  86 |   await page.getByRole('checkbox', { name: 'Include Meadow voles' }).uncheck();
  87 |   await expect(results).toHaveCount(0);
  88 |   await page.getByRole('checkbox', { name: 'Include Meadow voles' }).check();
  89 |   await expect(page.getByRole('spinbutton', { name: 'Meadow voles starting biomass index' })).toHaveValue('28');
  90 |   await page.getByRole('button', { name: 'Simple chain', exact: true }).click();
  91 |   await expect(page.getByRole('checkbox', { name: 'Include Barn owls' })).not.toBeChecked();
  92 |   await page.getByLabel('Disturbance', { exact: true }).selectOption('drought');
  93 |   await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  94 |   await expect(results).toContainText('Plant capacity halves');
  95 |   expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  96 | });
  97 | 
```