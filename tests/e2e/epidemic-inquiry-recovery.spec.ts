import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

test.describe.configure({ retries: 0 });
test.use({ video: 'off' });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_epidemic.js', toolId: 'epidemicSim', width: 900, height: 800, layout: 'document', appStyles: true });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
for (const width of [1280, 320]) {
  test(`Inquiry preserves evidence and keyboard recovery at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const log = Array.from({ length: 8 }, (_, n) => ({ c: n, i: 30, t: 2.5, rE: n / 100, reg: 'declining' }));
    const sourceResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/stem_lab/stem_tool_epidemic.js');
    await harness.mount(page, { epidemicSim: { tab: 'inquiry', tabsViewed: { inquiry: true }, inquiry: { contact: 50, intervention: 30, transmissibility: 2.5, hypothesis: 'Working explanation', explanation: 'Saved evidence explanation', understood: true, log } } }, undefined, { expectCanvas: false });
    const served = await (await sourceResponse).body();
    expect(served.equals(readFileSync('stem_lab/stem_tool_epidemic.js'))).toBe(true);
    const servedSha256 = createHash('sha256').update(served).digest('hex');
    expect(servedSha256).toBe('545559511b0a7c301df6b1b4905d83a3abaabb3f75319a20d571b8d804f35079');
    await testInfo.attach('served-epidemic-source', { body: JSON.stringify({ servedSha256 }), contentType: 'application/json' });
    await page.addStyleTag({ content: '#wrap{width:100%;max-width:900px;box-sizing:border-box}' });
    const logButton = page.getByRole('button', { name: /Log observation/ });
    await logButton.focus(); await page.keyboard.press('Enter');
    await expect(page.locator('[data-epidemic-inquiry-recovery]')).toContainText('Nothing was removed');
    expect(await page.evaluate(() => (window as any).__toolData.epidemicSim.inquiry.log)).toEqual(log);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const remove = page.getByRole('button', { name: 'Remove observation 3', exact: true });
    const tableScroller = page.locator('div.overflow-x-auto').filter({ has: remove });
    if (width === 320) {
      expect(await tableScroller.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
      await tableScroller.evaluate(el => { el.scrollLeft = 0; });
    }
    await remove.focus();
    await expect(remove).toBeFocused(); await expect(remove).toHaveAccessibleName('Remove observation 3');
    if (width === 320) expect(await tableScroller.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Undo last observation removal' })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.keyboard.press('Enter'); await expect(logButton).toBeFocused();
    expect(await page.evaluate(() => (window as any).__toolData.epidemicSim.inquiry.log)).toEqual(log);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('button', { name: /Reset/, exact: false }).last().focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Restore previous investigation' })).toBeFocused();
    await logButton.click();
    await page.getByRole('button', { name: 'Restore previous investigation' }).click();
    await expect(page.locator('#ep-hypo')).toHaveValue('Working explanation');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.evaluate(() => (window as any).__toolData.epidemicSim.inquiry.log)).toEqual(log);
    await page.getByRole('button', { name: 'Restore previous investigation' }).click();
    expect(await page.evaluate(() => (window as any).__toolData.epidemicSim.inquiry.log.length)).toBe(1);
    await expect(page.locator('#ep-hypo')).toHaveValue('');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Discard previous investigation and its drafts' }).focus(); await page.keyboard.press('Enter');
    await expect(page.locator('#ep-inquiry-reset')).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.evaluate(() => (window as any).__toolData.epidemicSim.inquiry.log.length)).toBe(1);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Restore previous investigation' })).toBeFocused();
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (window as any).__toolData.epidemicSim.inquiry.log.length)).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
