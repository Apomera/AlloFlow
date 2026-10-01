import { test } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
test.describe('roster debug', () => {
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 1280, height: 900, appStyles: true });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test('what does roster render', async ({ page }) => {
    test.setTimeout(120_000);
    await harness.mount(page, { raptorHunt: { activeSection: 'hub' } }, undefined, { expectCanvas: false });
    await page.evaluate(() => { (window as any).__toolData.raptorHunt = { activeSection: 'roster' }; (window as any).__rerender(); });
    await page.waitForTimeout(700);
    const d = await page.evaluate(() => {
      const p = document.querySelector('[id="rh-panel-roster"]') as HTMLElement;
      if (!p) return { panel: null };
      return {
        panel: true,
        tables: p.querySelectorAll('table').length,
        tbodyRows: p.querySelectorAll('tbody tr').length,
        anyTr: p.querySelectorAll('tr').length,
        buttons: Array.from(p.querySelectorAll('button')).map(b => (b.textContent||'').trim()).slice(0, 10),
        firstRowCells: Array.from(p.querySelectorAll('tbody tr')).slice(0,1).map(tr => Array.from(tr.querySelectorAll('td')).map(td => (td.textContent||'').trim())),
      };
    });
    console.log('ROSTER ' + JSON.stringify(d));
  });
});
