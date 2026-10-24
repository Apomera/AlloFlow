import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const phase = process.env.AVIAN_ROUND4_PHASE || 'final';
const output = resolve('reports/avian-activities-round4-2026-10-18', phase);
test.use({ video: 'off' });

for (const tool of ['raptor', 'bird'] as const) {
  test.describe(`${tool} round 4 visual review`, () => {
    test.describe.configure({ timeout: 120_000, mode: 'serial', retries: 0 });
    const toolId = tool === 'raptor' ? 'raptorHunt' : 'birdLab';
    const views = tool === 'raptor' ? ['comparative', 'hunting', 'climate'] : ['confusing', 'thermo', 'dawnChorus'];
    const harness = new GlHarness({
      toolId, toolFile: `stem_lab/stem_tool_${tool === 'raptor' ? 'raptorhunt' : 'birdlab'}.js`,
      preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
      width: 1280, height: 960, appStyles: true, layout: 'document',
    });
    test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
    test.afterAll(async () => { await harness.stop(); });
    test.afterEach(async ({ page }) => { await harness.destroy(page); });
    for (const view of views) for (const width of [1280, 390]) {
      test(`${view} renders accessibly at ${width}px`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewportSize({ width, height: 960 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await harness.mount(page, tool === 'raptor' ? { raptorHunt: { activeSection: view } }
          : { birdLab: { view, blSceneMotion: false } }, undefined, { expectCanvas: false });
        await page.addStyleTag({ content: '#wrap{width:100%;height:auto;display:block}' });
        await page.screenshot({ path: resolve(output, `${tool}-${view}-${width}.png`), fullPage: true });
        if (phase !== 'baseline') {
          const selector = ({ comparative: '[data-raptor-comparative-workbench]', hunting: '[data-raptor-hunting-workbench]',
            climate: '[data-raptor-climate-workbench]', confusing: '[data-birdlab-pair-workbench]',
            thermo: '[data-birdlab-thermo-workbench]', dawnChorus: '[data-birdlab-dawn-workbench]' } as Record<string, string>)[view];
          await page.locator(selector).screenshot({ path: resolve(output, `${tool}-${view}-interactive-${width}.png`) });
        }
        const results: any[] = [];
        for (const contrast of [false, true]) {
          await page.evaluate(value => { const w = window as any; w.__ctx.isContrast = value; w.__rerender(); }, contrast);
          await page.waitForTimeout(100);
          const violations = await page.evaluate(async () => {
            const audit = await (window as any).axe.run(document.querySelector('#wrap'), {
              runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] },
            });
            return audit.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }));
          });
          results.push({ contrast, overflow: await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), violations });
        }
        writeFileSync(resolve(output, `${tool}-${view}-${width}.json`), JSON.stringify({ width, tool, view, results, errors }, null, 2));
        if (phase !== 'baseline') {
          for (const result of results) {
            expect(result.overflow, `document overflow; contrast=${result.contrast}`).toBeLessThanOrEqual(1);
            expect(result.violations, `accessibility; contrast=${result.contrast}`).toEqual([]);
          }
        }
        expect(errors).toEqual([]);
      });
    }
  });
}
