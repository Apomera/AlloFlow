import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-wcag-coverage');
const auditFile = process.env.WELDLAB_AUDIT_FILTER ? 'filtered-audit.json' : 'final-audit.json';
const fixtures = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-wcag-coverage-audit.json'), 'utf8'));
const harness = new GlHarness({ toolId: 'weldLab', toolFile: 'stem_lab/stem_tool_weldlab.js', preScripts: ['stem_lab/stem_lab_module.js', 'app_styles_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], appStyles: true, layout: 'document' });
test.describe.configure({ timeout: 1_200_000, retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('Full AA matrix at wide and narrow widths with actionable manual-review diagnostics', async ({ page }) => {
  const rows: any[] = [];
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const fixture of fixtures.filter((f: any) => !process.env.WELDLAB_AUDIT_FILTER || process.env.WELDLAB_AUDIT_FILTER.split(',').includes(f.name))) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await harness.mount(page, { weldLab: fixture.state }, undefined, { expectCanvas: false });
    await page.evaluate(() => {
      const host = document.createElement('div'); document.body.append(host);
      const w = window as any; w.ReactDOM.render(w.React.createElement(w.AlloModules.AppStyles.AppStyles), host);
    });
    await page.addStyleTag({ content: 'html,body{height:auto;background:#f8fafc}#wrap{width:100%;height:auto;display:block}' });
    await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.height = 'auto'; el.style.display = 'block'; });
    await page.waitForFunction(() => Math.abs(document.getElementById('wrap')!.getBoundingClientRect().width - innerWidth) < 1);
    if (fixture.name === 'ce-predicted') {
      await expect(page.getByRole('radiogroup', { name: 'Your CE band prediction' })).toHaveCount(0);
      await expect(page.locator('[data-weld-view]')).toContainText('You predicted');
    }
    for (const contrast of [false, true]) {
      if (contrast) await page.evaluate(() => {
        document.body.classList.add('theme-contrast');
        Object.assign((window as any).__ctx, { isContrast: true, theme: 'contrast' }); (window as any).__rerender();
      });
      await page.waitForTimeout(250);
      for (const width of [1280, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const result = await page.evaluate(async () => {
          const axe = (window as any).axe; axe.reset();
          const audit = await axe.run(document.getElementById('wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
          const detail = (v: any) => ({ id: v.id, impact: v.impact, help: v.help, tags: v.tags, nodes: v.nodes.map((n: any) => ({ target: n.target, html: n.html, summary: n.failureSummary, checks: [...n.any, ...n.all, ...n.none].map((c: any) => ({ id: c.id, message: c.message, data: c.data })) })) });
          return { violations: audit.violations.map(detail), incomplete: audit.incomplete.map(detail), passes: audit.passes.length, overflow: document.documentElement.scrollWidth - innerWidth };
        });
        rows.push({ name: fixture.name, state: fixture.state, contrast, width, ...result });
        writeFileSync(resolve(output, auditFile), JSON.stringify(rows, null, 2));
      }
    }
    console.log(fixture.name + ': ' + rows.slice(-4).map(r => r.violations.reduce((n: number, v: any) => n + v.nodes.length, 0) + ' findings/' + r.overflow + 'px overflow').join(', '));
  }
  const failures = rows.filter(r => r.violations.length || r.overflow > 1).map(r => ({ name: r.name, contrast: r.contrast, width: r.width, overflow: r.overflow, violations: r.violations }));
  expect(failures).toEqual([]);
});
