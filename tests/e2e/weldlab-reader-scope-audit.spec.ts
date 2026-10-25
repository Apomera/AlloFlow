import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-reader-contrast');
const harness = new GlHarness({ toolId: 'weldLab', toolFile: 'stem_lab/stem_tool_weldlab.js', preScripts: ['stem_lab/stem_lab_module.js', 'app_styles_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], appStyles: true, layout: 'document' });
test.describe.configure({ timeout: 240_000, retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('Full AA checks cover code badges and every repaired groove shape', async ({ page }) => {
  const fixtures = [
    { name: 'codes', state: { view: 'codes', insp2_codesTab: 'read' }, preset: null },
    ...['v30', 'v375', 'bevel45'].map(preset => ({ name: 'joint-' + preset, state: { view: 'jointCatalog', jc_tab: 'butt' }, preset }))
  ];
  const rows: any[] = [];
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const fixture of fixtures) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await harness.mount(page, { weldLab: fixture.state }, undefined, { expectCanvas: false });
    await page.evaluate(() => { const host = document.createElement('div'); document.body.append(host); const w = window as any; w.ReactDOM.render(w.React.createElement(w.AlloModules.AppStyles.AppStyles), host); });
    await page.addStyleTag({ content: 'html,body{height:auto;background:#f8fafc}#wrap{width:100%;height:auto;display:block}' });
    await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.height = 'auto'; el.style.display = 'block'; });
    await page.waitForFunction(() => Math.abs(document.getElementById('wrap')!.getBoundingClientRect().width - innerWidth) < 1);
    if (fixture.preset) {
      await page.locator('[data-joint-position-pair-toggle]').click();
      await page.locator('[data-joint-angle-preset="' + fixture.preset + '"]').click();
      await expect(page.locator('[data-joint-angles]')).toHaveAttribute('data-joint-angles', fixture.preset);
    }
    for (const contrast of [false, true]) {
      if (contrast) await page.evaluate(() => { document.body.classList.add('theme-contrast'); Object.assign((window as any).__ctx, { isContrast: true, theme: 'contrast' }); (window as any).__rerender(); });
      await page.waitForTimeout(250);
      for (const width of [1280, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const audit = await page.evaluate(async () => {
          const axe = (window as any).axe; axe.reset();
          const result = await axe.run(document.getElementById('wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
          const detail = (v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, html: n.html, summary: n.failureSummary, checks: [...n.any, ...n.all, ...n.none].map((c: any) => ({ id: c.id, message: c.message, data: c.data })) })) });
          return { violations: result.violations.map(detail), incomplete: result.incomplete.map(detail), overflow: document.documentElement.scrollWidth - innerWidth };
        });
        rows.push({ name: fixture.name, contrast, width, ...audit });
        writeFileSync(resolve(output, 'scope-axe.json'), JSON.stringify(rows, null, 2));
      }
    }
  }
  expect(rows.filter(r => r.violations.length || r.overflow > 1)).toEqual([]);
});
