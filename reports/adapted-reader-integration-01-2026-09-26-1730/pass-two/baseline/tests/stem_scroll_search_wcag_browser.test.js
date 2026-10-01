import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMServer, extractReactSsrStyles, loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const root = process.cwd();
const cssDir = path.join(root, 'app/static/css');
const appCss = fs.readFileSync(path.join(cssDir, fs.readdirSync(cssDir).find(f => /^main\.[a-z0-9]+\.css$/i.test(f))), 'utf8');
Function('window', fs.readFileSync('app_styles_module.js', 'utf8'))(window);
const runtimeCss = extractReactSsrStyles(ReactDOMServer.renderToStaticMarkup(React.createElement(window.AlloModules.AppStyles.AppStyles))).cssSheets;
const evidence = [];
let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); }, 60000);
afterAll(async () => {
  await browser?.close();
  if (process.env.ALLO_WCAG_EVIDENCE_DIR) {
    fs.mkdirSync(process.env.ALLO_WCAG_EVIDENCE_DIR, { recursive: true });
    fs.writeFileSync(path.join(process.env.ALLO_WCAG_EVIDENCE_DIR, 'interaction-evidence.json'), JSON.stringify(evidence, null, 2));
  }
});
async function openTool(file, id, state, navigationOnly = false) {
  resetStemLab();
  document.head.querySelectorAll('style').forEach(s => s.remove());
  loadTool(file, id);
  const fixture = prepareStemBrowserRender(renderTool(id, state, { theme: 'light', isDark: false, isContrast: false, t: (key, fallback) => ['stem.archstudio.build_statistics', 'stem.circuit.schematic_scroll_region', 'stem.fireecology.scrollable_chart'].includes(key) ? undefined : (fallback || key) }));
  if (navigationOnly) {
    // These two ARIA rules concern the search navigation, not tool layout.
    // Preserve that complete subtree (input and controlled results) without
    // asking Chromium to lay out unrelated simulation panels for every query.
    const container = document.createElement('div');
    container.innerHTML = fixture.html;
    const navigation = container.querySelector('[data-raptor-nav]');
    if (!navigation) throw new Error('Raptor navigation did not render');
    fixture.html = navigation.outerHTML;
  }
  const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="tool-root" class="theme-default" style="height:100vh;background:var(--allo-stem-canvas);color:var(--allo-stem-text)">' + fixture.html + '</main></body></html>');
  for (const css of (navigationOnly ? [] : [appCss, ...runtimeCss, ...fixture.cssSheets])) await page.addStyleTag({ content: css });
  await page.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
  return page;
}

describe('STEM scroll regions and search relationships', () => {
  for (const [name, file, id, selector] of [
    ['Architecture statistics', 'stem_lab/stem_tool_archstudio.js', 'archStudio', '.arch-studio-stats'],
    ['Circuit schematic', 'stem_lab/stem_tool_circuit.js', 'circuit', '[role="region"][aria-label="Circuit schematic"]'],
    ['Fire stewardship chart', 'stem_lab/stem_tool_fireecology.js', 'fireEcology', '[data-fe-deeptime] [role="region"]'],
  ]) {
    it(name + ' receives sequential focus and scrolls with arrow keys', async () => {
      const page = await openTool(file, id, { [id]: {} });
      try {
        const region = page.locator(selector);
        expect(await region.count()).toBe(1);
        const metrics = await region.evaluate(e => ({ width: e.clientWidth, scrollWidth: e.scrollWidth, tabIndex: e.tabIndex, name: e.getAttribute('aria-label') }));
        expect(metrics.name).toBeTruthy();
        expect(metrics.tabIndex).toBe(0);
        expect(metrics.scrollWidth).toBeGreaterThan(metrics.width);
        await region.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        expect(await region.evaluate(e => e === document.activeElement)).toBe(true);
        const before = await region.evaluate(e => e.scrollLeft);
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction(selector => document.querySelector(selector).scrollLeft > 0, selector);
        const after = await region.evaluate(e => e.scrollLeft);
        expect(after).toBeGreaterThan(before);
        await page.keyboard.press('Tab');
        expect(await region.evaluate(e => e === document.activeElement)).toBe(false);
        const audit = await page.evaluate(async selector => axe.run(document.querySelector(selector), { runOnly: { type: 'rule', values: ['scrollable-region-focusable'] } }), selector);
        expect(audit.violations).toEqual([]);
        evidence.push({ name, ...metrics, before, after, sequentialFocus: true, exitsWithTab: true, violations: audit.violations });
        if (process.env.ALLO_WCAG_EVIDENCE_DIR) await page.screenshot({ path: path.join(process.env.ALLO_WCAG_EVIDENCE_DIR, id + '-keyboard.png') });
      } finally { await page.close(); }
    });
  }
  for (const query of ['', 'flight', 'zzzznoresult']) {
    it('Raptor search has valid relationships for query ' + JSON.stringify(query), async () => {
      const page = await openTool('stem_lab/stem_tool_raptorhunt.js', 'raptorHunt', { raptorHunt: { sectionSearch: query } }, true);
      try {
        const input = page.getByRole('searchbox', { name: 'Search sections' });
        expect(await input.inputValue()).toBe(query);
        const controlledId = await input.getAttribute('aria-controls');
        if (!query) expect(controlledId).toBeNull();
        else {
          expect(controlledId).toBe('rh-search-results');
          const results = page.getByRole('region', { name: 'Search results' });
          expect(await results.count()).toBe(1);
          if (query === 'flight') expect(await results.getByRole('button').count()).toBeGreaterThan(0);
          else expect(await results.innerText()).toContain('No sections match');
        }
        const audit = await page.evaluate(async () => axe.run('[data-raptor-nav]', { runOnly: { type: 'rule', values: ['aria-valid-attr-value', 'aria-prohibited-attr'] } }));
        expect(audit.violations).toEqual([]);
        evidence.push({ name: 'Raptor search', query, controlledId, violations: audit.violations });
      } finally { await page.close(); }
    });
  }
});
