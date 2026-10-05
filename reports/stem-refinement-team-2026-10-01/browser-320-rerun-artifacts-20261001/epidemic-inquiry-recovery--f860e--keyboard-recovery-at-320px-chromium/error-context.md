# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: epidemic-inquiry-recovery.spec.ts >> Inquiry preserves evidence and keyboard recovery at 320px
- Location: tests\e2e\epidemic-inquiry-recovery.spec.ts:11:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { GlHarness } from './helpers/stem_gl_harness';
  3  | 
  4  | test.describe.configure({ retries: 0 });
  5  | test.use({ video: 'off' });
  6  | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_epidemic.js', toolId: 'epidemicSim', width: 900, height: 800, layout: 'document', appStyles: true });
  7  | test.beforeAll(async () => harness.start());
  8  | test.afterAll(async () => harness.stop());
  9  | test.afterEach(async ({ page }) => harness.destroy(page));
  10 | for (const width of [1280, 320]) {
  11 |   test(`Inquiry preserves evidence and keyboard recovery at ${width}px`, async ({ page }) => {
  12 |     await page.setViewportSize({ width, height: 900 });
  13 |     const log = Array.from({ length: 8 }, (_, n) => ({ c: n, i: 30, t: 2.5, rE: n / 100, reg: 'declining' }));
  14 |     await harness.mount(page, { epidemicSim: { tab: 'inquiry', tabsViewed: { inquiry: true }, inquiry: { contact: 50, intervention: 30, transmissibility: 2.5, hypothesis: 'Working explanation', explanation: 'Saved evidence explanation', understood: true, log } } }, undefined, { expectCanvas: false });
  15 |     await page.addStyleTag({ content: '#wrap{width:100%;max-width:900px;box-sizing:border-box}' });
  16 |     const logButton = page.getByRole('button', { name: /Log observation/ });
  17 |     await logButton.focus(); await page.keyboard.press('Enter');
  18 |     await expect(page.locator('[data-epidemic-inquiry-recovery]')).toContainText('Nothing was removed');
  19 |     expect(await page.evaluate(() => (window as any).__toolData.epidemicSim.inquiry.log)).toEqual(log);
> 20 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
     |                                                                                                  ^ Error: expect(received).toBe(expected) // Object.is equality
  21 |     await page.getByRole('button', { name: 'Remove observation 3', exact: true }).focus(); await page.keyboard.press('Enter');
  22 |     await expect(page.getByRole('button', { name: 'Undo last observation removal' })).toBeFocused();
  23 |     await page.keyboard.press('Enter'); await expect(logButton).toBeFocused();
  24 |     expect(await page.evaluate(() => (window as any).__toolData.epidemicSim.inquiry.log)).toEqual(log);
  25 |     await page.getByRole('button', { name: /Reset/, exact: false }).last().focus(); await page.keyboard.press('Enter');
  26 |     await expect(page.getByRole('button', { name: 'Restore previous investigation' })).toBeFocused();
  27 |     await logButton.click();
  28 |     await page.getByRole('button', { name: 'Restore previous investigation' }).click();
  29 |     await expect(page.locator('#ep-hypo')).toHaveValue('Working explanation');
  30 |     expect(await page.evaluate(() => (window as any).__toolData.epidemicSim.inquiry.log)).toEqual(log);
  31 |     await page.getByRole('button', { name: 'Restore previous investigation' }).click();
  32 |     expect(await page.evaluate(() => (window as any).__toolData.epidemicSim.inquiry.log.length)).toBe(1);
  33 |     await expect(page.locator('#ep-hypo')).toHaveValue('');
  34 |     await page.getByRole('button', { name: 'Discard previous investigation and its drafts' }).focus(); await page.keyboard.press('Enter');
  35 |     await expect(page.locator('#ep-inquiry-reset')).toBeFocused();
  36 |     expect(await page.evaluate(() => (window as any).__toolData.epidemicSim.inquiry.log.length)).toBe(1);
  37 |     await page.keyboard.press('Enter');
  38 |     await expect(page.getByRole('button', { name: 'Restore previous investigation' })).toBeFocused();
  39 |     await page.keyboard.press('Enter');
  40 |     expect(await page.evaluate(() => (window as any).__toolData.epidemicSim.inquiry.log.length)).toBe(1);
  41 |   });
  42 | }
  43 | 
```