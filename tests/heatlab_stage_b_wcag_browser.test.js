import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMServer, loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { extractReactSsrStyles, prepareStemBrowserRender } from './helpers/stem_widgets_smoke_harness.js';

// Stage B panels (thermal camera on every view, all four particle lenses, the
// touch test with both blocks touched, the two-block simulator with the leak,
// and the lab notebook with a filter, a sort and a plot) audited at 320 px in
// light, dark and high contrast, the same way the stage A browser test does.
const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
const appCss = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');
const appStylesSource = fs.readFileSync(path.join(root, 'app_styles_module.js'), 'utf8');
if (!(window.AlloModules && window.AlloModules.AppStyles)) Function('window', appStylesSource)(window);
const runtimeAppCssSheets = extractReactSsrStyles(
  ReactDOMServer.renderToStaticMarkup(React.createElement(window.AlloModules.AppStyles.AppStyles, null)),
).cssSheets;
const stemThemeCss = `
  :root, .theme-default { --allo-stem-canvas: #ffffff; --allo-stem-text: #0f172a; }
  .theme-dark { --allo-stem-canvas: #0f172a; --allo-stem-text: #e2e8f0; }
  .theme-contrast { --allo-stem-canvas: #000000; --allo-stem-text: #ffff00; }
  #tool-root { background: var(--allo-stem-canvas); color: var(--allo-stem-text); min-height: 100vh; }
`;

const LOG = [
  { kind: 'mug', at: 1700000000000, material: 'wood', thickness_mm: 10, T60_C: 60.638, above65: false },
  { kind: 'mug', at: 1700000060000, material: 'fibre', thickness_mm: 6, T60_C: 65.4, above65: true },
  { kind: 'radiation', at: 1700000120000, surface_C: 33, emitted_W: 878.7, net_W: 140, peak_um: 9.47 },
  { kind: 'touch', at: 1700000180000, material: 'copper', contact_C: 20.5, fingertip_W: 1.06 },
];
const STATE = {
  _heatLab: { htAll: true,
    mode: 'conduction', raceOn: true, irOn: true, irCrossCm: 6,
    lens: { race: true, mug: true, mix: true, curve: true }, lensProbe: 0, mixLensP: 40, energyIn: 1500,
    insMatId: 'fibre', thickness: 10, mugMin: 20,
    touchSide: 'b', touchTried: ['copper', 'wood'],
    eqLeak: true, eqCursor: 40,
    poe: { touch: { pick: 'a', stage: 'explain', explained: true }, eqstop: { pick: 'b', stage: 'observe' } },
    log: LOG, nbKind: 'mug', nbSortCol: 'T60_C', nbSortDir: 'desc', nbX: 'thickness_mm', nbY: 'T60_C',
  },
};
// Second state: greyscale camera, convection mode, notebook showing all rows.
const STATE_GREY = {
  _heatLab: { htAll: true, mode: 'convection', irOn: true, irGrey: true, log: LOG, lens: { curve: true }, energyIn: 200 },
};

const THEMES = [
  { name: 'light', overrides: { theme: 'light', isDark: false, isContrast: false }, cls: 'theme-default' },
  { name: 'dark', overrides: { theme: 'dark', isDark: true, isContrast: false }, cls: 'theme-dark' },
  { name: 'contrast', overrides: { theme: 'contrast', isDark: false, isContrast: true }, cls: 'theme-contrast' },
];
const CASES = THEMES.map((th) => ({ name: th.name, theme: th, state: STATE }))
  .concat([{ name: 'light greyscale camera', theme: THEMES[0], state: STATE_GREY }]);

describe('Heat Lab stage B panels in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const c of CASES) {
    it(c.name + ': WCAG A/AA and 320 px reflow with the stage B panels open', async () => {
      resetStemLab();
      document.head.querySelectorAll('style').forEach((style) => style.remove());
      loadTool('stem_lab/stem_tool_heatlab.js', 'heatLab');
      const rendered = prepareStemBrowserRender(renderTool('heatLab', c.state, c.theme.overrides));
      expect(rendered.html).toContain('data-ht-notebook');
      expect(rendered.html).toContain('data-ht-lens');
      expect(rendered.html).toContain('data-ht-ir-controls');
      if (c.state === STATE) {
        expect(rendered.html).toContain('data-ht-ir-view="mug"');
        expect(rendered.html).toContain('data-ht-ir-view="wall"');
        expect(rendered.html).toContain('data-ht-touch-result');
        expect(rendered.html).toContain('data-ht-nb-plot');
        expect(rendered.html).toContain('aria-sort="descending"');
        expect((rendered.html.match(/data-ht-lens=/g) || []).length).toBe(4);
      }
      expect(rendered.html).not.toMatch(/undefined|NaN|\[object Object\]/);

      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
        '<body><main id="tool-root" class="' + c.theme.cls + '">' + rendered.html + '</main></body></html>', { waitUntil: 'domcontentloaded' });
      await page.addStyleTag({ content: appCss });
      for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
      await page.addStyleTag({ content: stemThemeCss });
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: axeSource });
      const audit = await page.evaluate(async () => axe.run('#tool-root', {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      }));
      const reflow = await page.evaluate(() => {
        const cw = document.documentElement.clientWidth;
        // Elements inside a sideways-scrolling region are reachable by scrolling it.
        const inScroller = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { if (p.getAttribute('role') === 'region' && /auto|scroll/.test(getComputedStyle(p).overflowX)) return true; } return false; };
        const offenders = [...document.querySelectorAll('#tool-root *')]
          .filter((el) => !inScroller(el))
          .map((el) => ({ el: el.tagName + '.' + String(el.className).slice(0, 60), right: Math.round(el.getBoundingClientRect().right) }))
          .filter((x) => x.right > cw + 1).slice(0, 6);
        return { scrollWidth: document.documentElement.scrollWidth, clientWidth: cw, offenders };
      });
      const violations = audit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.slice(0, 4).map((n) => ({ target: n.target, html: n.html.slice(0, 160), data: n.any && n.any[0] && n.any[0].data })),
      }));
      expect.soft(violations).toEqual([]);
      expect.soft(reflow.scrollWidth, JSON.stringify(reflow.offenders)).toBeLessThanOrEqual(reflow.clientWidth);
      expect.soft(reflow.offenders).toEqual([]);
      await page.close();
    }, 45000);
  }
});
