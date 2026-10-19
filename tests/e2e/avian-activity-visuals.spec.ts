import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

// Screenshots and independent accessibility checks for the deeper learning screens.
const phase = process.env.AVIAN_ACTIVITY_PHASE || 'final';
const output = resolve('reports/avian-activities-2026-10-18', phase);
test.use({ video: 'off' });

for (const tool of ['raptor', 'bird'] as const) {
  test.describe(`${tool} activity visual review`, () => {
    test.describe.configure({ timeout: 120_000, mode: 'serial', retries: 0 });
    const toolId = tool === 'raptor' ? 'raptorHunt' : 'birdLab';
    const harness = new GlHarness({
      toolId, toolFile: `stem_lab/stem_tool_${tool === 'raptor' ? 'raptorhunt' : 'birdlab'}.js`,
      preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
      width: 1280, height: 960, appStyles: true, layout: 'document',
    });
    test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
    test.afterAll(async () => { await harness.stop(); });
    test.afterEach(async ({ page }) => { await harness.destroy(page); });
    for (const width of [1280, 390]) {
      test(`interactive activity fits and remains accessible at ${width}px`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewportSize({ width, height: 960 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await harness.mount(page, tool === 'raptor' ? { raptorHunt: { activeSection: 'flight' } }
          : { birdLab: { view: 'fieldMarks', blSceneMotion: false } }, undefined, { expectCanvas: false });
        await page.addStyleTag({ content: '#wrap{width:100%;height:auto;display:block}' });
        const surface = tool === 'raptor' ? page.locator('.rh-lab-page-flight') : page.locator('#wrap');
        await surface.scrollIntoViewIfNeeded();
        await page.screenshot({ path: resolve(output, `${tool}-activity-${width}.png`), fullPage: true });
        if (phase !== 'baseline') {
          await page.locator(tool === 'raptor' ? '[data-raptor-wing-atlas]' : '.birdlab-fieldmarks-study')
            .screenshot({ path: resolve(output, `${tool}-interactive-${width}.png`) });
        }
        const results: any[] = [];
        const modes = tool === 'bird' && phase !== 'baseline' ? ['explore', 'practice'] : ['explore'];
        for (const mode of modes) {
          if (mode === 'practice') {
            await page.getByRole('button', { name: 'Match the clue', exact: true }).click();
            await page.locator('.birdlab-fieldmarks-study').screenshot({ path: resolve(output, `bird-practice-${width}.png`) });
          }
          for (const contrast of [false, true]) {
          await page.evaluate(value => { const w = window as any; w.__ctx.isContrast = value; w.__rerender(); }, contrast);
          await page.waitForTimeout(100);
          const violations = await page.evaluate(async () => {
            const audit = await (window as any).axe.run(document.querySelector('#wrap'), {
              runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'select-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] },
            });
            return audit.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }));
          });
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
          results.push({ mode, contrast, overflow, violations });
          }
        }
        writeFileSync(resolve(output, `${tool}-activity-${width}.json`), JSON.stringify({ width, tool, results, errors }, null, 2));
        if (phase !== 'baseline') {
          for (const result of results) {
            expect(result.overflow, `document overflow; contrast=${result.contrast}`).toBeLessThanOrEqual(1);
            expect(result.violations, `accessibility; mode=${result.mode}; contrast=${result.contrast}`).toEqual([]);
          }
        }
        expect(errors).toEqual([]);
      });
    }
  });
}
