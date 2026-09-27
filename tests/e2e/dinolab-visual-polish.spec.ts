import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
const dir = 'reports/dinolab-visual-polish-2026-09-27';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1180, height: 920, appStyles: true });
test.beforeAll(async () => { fs.mkdirSync(dir, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('visual polish remains readable across themes, narrow screens, and forced colors', async ({ page }) => {
  test.setTimeout(300000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await harness.mount(page, { dinoLab: { tab: 'anatomy' } }, undefined, { expectCanvas: false });
  const styles = fs.readFileSync('app_styles_module.js', 'utf8');
  const start = styles.indexOf(':root, .theme-default {');
  const end = styles.indexOf('/* ─', styles.indexOf('--allo-stem-button-border:#00ff00', start));
  await page.addStyleTag({ content: styles.slice(start, end) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect(page.locator('.dinolab-evidence-cases svg[aria-hidden=true]')).toHaveCount(2);
  await expect(page.locator('.dinolab-evidence-reference svg[role=img]')).toHaveCount(1);
  await page.locator('[data-bench-citation=fossil]').check();
  await expect(page.locator('.dinolab-evidence-citation.is-cited')).toHaveCount(1);
  await page.locator('.dinolab-evidence-cases button').first().focus();
  await expect(page.locator('.dinolab-evidence-cases button').first()).toBeFocused();
  const transition = await page.locator('.dinolab-evidence-cases button').first().evaluate(el => getComputedStyle(el).transitionDuration);
  expect(transition).toBe('0s');
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audits: any[] = [];
  for (const theme of ['theme-default', 'theme-dark', 'theme-contrast']) {
    await page.evaluate(theme => { document.body.className = theme; (window as any).__rerender(); }, theme);
    for (const tab of ['anatomy', 'explore']) {
      await page.getByLabel('Jump to a lab section', { exact: true }).selectOption(tab);
      await page.evaluate(() => window.scrollTo(0, 0));
      const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('.dinolab-root'), { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
      audits.push({ theme, tab, violations });
      await page.screenshot({ path: dir + '/' + tab + '-' + theme + '.png', fullPage: tab === 'anatomy' });
    }
  }
  fs.writeFileSync(dir + '/visual-accessibility.json', JSON.stringify(audits, null, 2));
  expect(audits.filter(a => a.violations.length)).toEqual([]);
  await page.evaluate(() => { document.body.className = 'theme-default'; (window as any).__rerender(); });
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const tab of ['anatomy', 'explore']) {
      await page.getByLabel('Jump to a lab section', { exact: true }).selectOption(tab);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (tab === 'anatomy') {
        // Labels stay within each card and the source stays in normal flow on small screens.
        for (const card of await page.locator('.dinolab-evidence-cases button').all()) expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
        if (width <= 390) expect(await page.locator('.dinolab-evidence-reference').evaluate(el => getComputedStyle(el).position)).toBe('static');
        await page.locator('.dinolab-evidence-cases button').nth(1).click();
        await expect(page.locator('[data-evidence-workbench=scales]')).toBeVisible();
      }
      if (width === 390) { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: dir + '/' + tab + '-phone.png', fullPage: tab === 'anatomy' }); }
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel('Jump to a lab section', { exact: true }).selectOption('anatomy');
  await page.emulateMedia({ forcedColors: 'active' });
  await page.screenshot({ path: dir + '/anatomy-forced-colors.png', fullPage: true });
  await expect(page.locator('.dinolab-evidence-reference svg[role=img]')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
