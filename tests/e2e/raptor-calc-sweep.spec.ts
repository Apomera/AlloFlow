import { test } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/** Read the opening headline numbers of every calculator section. */
test.describe('calc sweep', () => {
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 1280, height: 900, appStyles: true });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test('opening readouts', async ({ page }) => {
    test.setTimeout(300_000);
    await harness.mount(page, { raptorHunt: { activeSection: 'hub' } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap{width:100%;height:auto;display:block;padding:16px}' });
    for (const sec of ['spiral', 'acuity', 'predictor', 'wingformula', 'mathlab']) {
      await page.evaluate((s) => {
        (window as any).__toolData.raptorHunt = { activeSection: s };
        (window as any).__rerender();
      }, sec);
      await page.waitForTimeout(400);
      const d = await page.evaluate(() => {
        const p = document.querySelector('[id^="rh-panel-"]') as HTMLElement;
        if (!p) return null;
        const big = Array.from(p.querySelectorAll('.text-3xl, .text-2xl, .text-4xl'))
          .map((n) => (n.textContent || '').trim()).filter(Boolean).slice(0, 8);
        const ranges = Array.from(p.querySelectorAll('input[type=range]'))
          .map((r: any) => `${r.getAttribute('aria-label')}=${r.value} [${r.min}..${r.max}]`);
        return { big, ranges };
      });
      console.log(`CALC ${sec} ` + JSON.stringify(d));
    }
  });
});
