# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: epidemic-inquiry-recovery.spec.ts >> Inquiry preserves evidence and keyboard recovery at 320px
- Location: tests\e2e\epidemic-inquiry-recovery.spec.ts:13:7

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { GlHarness } from './helpers/stem_gl_harness';
  3  | import { readFileSync } from 'node:fs';
  4  | import { createHash } from 'node:crypto';
  5  | 
  6  | test.describe.configure({ retries: 0 });
  7  | test.use({ video: 'off' });
  8  | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_epidemic.js', toolId: 'epidemicSim', width: 900, height: 800, layout: 'document', appStyles: true });
  9  | test.beforeAll(async () => harness.start());
  10 | test.afterAll(async () => harness.stop());
  11 | test.afterEach(async ({ page }) => harness.destroy(page));
  12 | for (const width of [1280, 320]) {
  13 |   test(`Inquiry preserves evidence and keyboard recovery at ${width}px`, async ({ page }, testInfo) => {
  14 |     await page.setViewportSize({ width, height: 900 });
  15 |     const log = Array.from({ length: 8 }, (_, n) => ({ c: n, i: 30, t: 2.5, rE: n / 100, reg: 'declining' }));
  16 |     const sourceResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/stem_lab/stem_tool_epidemic.js');
  17 |     await harness.mount(page, { epidemicSim: { tab: 'inquiry', tabsViewed: { inquiry: true }, inquiry: { contact: 50, intervention: 30, transmissibility: 2.5, hypothesis: 'Working explanation', explanation: 'Saved evidence explanation', understood: true, log } } }, undefined, { expectCanvas: false });
  18 |     const served = await (await sourceResponse).body();
  19 |     expect(served.equals(readFileSync('stem_lab/stem_tool_epidemic.js'))).toBe(true);
  20 |     const servedSha256 = createHash('sha256').update(served).digest('hex');
  21 |     expect(servedSha256).toBe('545559511b0a7c301df6b1b4905d83a3abaabb3f75319a20d571b8d804f35079');
  22 |     await testInfo.attach('served-epidemic-source', { body: JSON.stringify({ servedSha256 }), contentType: 'application/json' });
  23 |     await page.addStyleTag({ content: '#wrap{width:100%;max-width:900px;box-sizing:border-box}' });
  24 |     const logButton = page.getByRole('button', { name: /Log observation/ });
  25 |     await logButton.focus(); await page.keyboard.press('Enter');
  26 |     await expect(page.locator('[data-epidemic-inquiry-recovery]')).toContainText('Nothing was removed');
  27 |     expect(await page.evaluate(() => (window as any).__toolData.epidemicSim.inquiry.log)).toEqual(log);
  28 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  29 |     const remove = page.getByRole('button', { name: 'Remove observation 3', exact: true });
  30 |     const tableScroller = page.locator('div.overflow-x-auto').filter({ has: remove });
  31 |     if (width === 320) {
  32 |       expect(await tableScroller.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  33 |       await tableScroller.evaluate(el => { el.scrollLeft = 0; });
  34 |     }
  35 |     await remove.focus();
  36 |     await expect(remove).toBeFocused(); await expect(remove).toHaveAccessibleName('Remove observation 3');
> 37 |     if (width === 320) expect(await tableScroller.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
     |                                                                                  ^ Error: expect(received).toBeGreaterThan(expected)
  38 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  39 |     await page.keyboard.press('Enter');
  40 |     await expect(page.getByRole('button', { name: 'Undo last observation removal' })).toBeFocused();
  41 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  42 |     await page.keyboard.press('Enter'); await expect(logButton).toBeFocused();
  43 |     expect(await page.evaluate(() => (window as any).__toolData.epidemicSim.inquiry.log)).toEqual(log);
  44 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  45 |     await page.getByRole('button', { name: /Reset/, exact: false }).last().focus(); await page.keyboard.press('Enter');
  46 |     await expect(page.getByRole('button', { name: 'Restore previous investigation' })).toBeFocused();
  47 |     await logButton.click();
  48 |     await page.getByRole('button', { name: 'Restore previous investigation' }).click();
  49 |     await expect(page.locator('#ep-hypo')).toHaveValue('Working explanation');
  50 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  51 |     expect(await page.evaluate(() => (window as any).__toolData.epidemicSim.inquiry.log)).toEqual(log);
  52 |     await page.getByRole('button', { name: 'Restore previous investigation' }).click();
  53 |     expect(await page.evaluate(() => (window as any).__toolData.epidemicSim.inquiry.log.length)).toBe(1);
  54 |     await expect(page.locator('#ep-hypo')).toHaveValue('');
  55 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  56 |     await page.getByRole('button', { name: 'Discard previous investigation and its drafts' }).focus(); await page.keyboard.press('Enter');
  57 |     await expect(page.locator('#ep-inquiry-reset')).toBeFocused();
  58 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  59 |     expect(await page.evaluate(() => (window as any).__toolData.epidemicSim.inquiry.log.length)).toBe(1);
  60 |     await page.keyboard.press('Enter');
  61 |     await expect(page.getByRole('button', { name: 'Restore previous investigation' })).toBeFocused();
  62 |     await page.keyboard.press('Enter');
  63 |     expect(await page.evaluate(() => (window as any).__toolData.epidemicSim.inquiry.log.length)).toBe(1);
  64 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  65 |   });
  66 | }
  67 | 
```