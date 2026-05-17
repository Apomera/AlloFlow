import { test, expect } from '@playwright/test';

/**
 * For each major upgraded STEM Lab tool, verify the tool's CDN script
 * loads, parses, and registers into window.StemLab._registry without throwing.
 *
 * This bypasses the deep UI navigation chain (which is slow + fragile) and
 * directly exercises the tool-loading contract.
 */
const FLAGSHIP_TOOLS = [
  { id: 'optics', url: 'https://alloflow-cdn.pages.dev/stem_lab/stem_tool_optics.js', expectKey: 'opticsLab' },
  { id: 'solar', url: 'https://alloflow-cdn.pages.dev/stem_lab/stem_tool_solarsystem.js', expectKey: 'solarSystem' },
  { id: 'plate', url: 'https://alloflow-cdn.pages.dev/stem_lab/stem_tool_platetectonics.js', expectKey: 'plateTectonics' },
  { id: 'cell', url: 'https://alloflow-cdn.pages.dev/stem_lab/stem_tool_cell.js', expectKey: 'cell' },
  { id: 'chembalance', url: 'https://alloflow-cdn.pages.dev/stem_lab/stem_tool_chembalance.js', expectKey: 'chemBalance' },
  { id: 'raptorhunt', url: 'https://alloflow-cdn.pages.dev/stem_lab/stem_tool_raptorhunt.js', expectKey: 'raptorHunt' },
  { id: 'nutrition', url: 'https://alloflow-cdn.pages.dev/stem_lab/stem_tool_nutritionlab.js', expectKey: 'nutritionLab' },
  { id: 'roadready', url: 'https://alloflow-cdn.pages.dev/stem_lab/stem_tool_roadready.js', expectKey: 'roadReady' },
  // Note: roadReady, nutritionLab, beehive — capitalization confirmed via grep on source
  { id: 'beehive', url: 'https://alloflow-cdn.pages.dev/stem_lab/stem_tool_beehive.js', expectKey: 'beehive' },
  { id: 'applab', url: 'https://alloflow-cdn.pages.dev/stem_lab/stem_tool_applab.js', expectKey: 'appLab' },
  { id: 'cephalopod', url: 'https://alloflow-cdn.pages.dev/stem_lab/stem_tool_cephalopodlab.js', expectKey: 'cephalopodLab' },
  { id: 'assessmentliteracy', url: 'https://alloflow-cdn.pages.dev/stem_lab/stem_tool_assessmentliteracy.js', expectKey: 'assessmentLiteracy' },
  { id: 'learninglab', url: 'https://alloflow-cdn.pages.dev/stem_lab/stem_tool_learning_lab.js', expectKey: 'learningLab' },
];

test.describe('Flagship STEM Lab tools — CDN load + registry contract', () => {
  for (const tool of FLAGSHIP_TOOLS) {
    test(`${tool.id}: CDN file loads OK`, async ({ request }) => {
      const resp = await request.get(tool.url);
      expect(resp.ok(), `Failed: ${tool.url} (${resp.status()})`).toBeTruthy();
      const body = await resp.text();
      expect(body.length, `${tool.id}: response body too small`).toBeGreaterThan(1000);
    });

    test(`${tool.id}: registers in window.StemLab._registry when loaded`, async ({ page }) => {
      // Set up StemLab namespace BEFORE loading the script
      await page.goto('/');
      await page.waitForTimeout(1500);

      await page.evaluate((url) => {
        return new Promise<void>((resolve, reject) => {
          const w = window as any;
          // Ensure StemLab namespace exists (mimics real loading order)
          if (!w.StemLab) {
            w.StemLab = { _registry: {}, _order: [], registerTool: function(id: string, c: any) { c.id = id; this._registry[id] = c; this._order.push(id); } };
          }
          const s = document.createElement('script');
          s.src = url;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('script load error'));
          document.head.appendChild(s);
        });
      }, tool.url);

      await page.waitForTimeout(500);

      const registered = await page.evaluate((expectKey) => {
        const sl = (window as any).StemLab;
        return sl && sl._registry && expectKey in sl._registry;
      }, tool.expectKey);

      expect(registered, `${tool.id}: ${tool.expectKey} not registered in StemLab._registry`).toBeTruthy();
    });
  }
});
