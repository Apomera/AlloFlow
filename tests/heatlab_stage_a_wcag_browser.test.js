import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMServer, loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { extractReactSsrStyles, prepareStemBrowserRender } from './helpers/stem_widgets_smoke_harness.js';

// Stage A states (race with thermometers and ledger, answered predict-check-
// explain cards, answered Spot cards, a judged engine) audited at 320 px in
// light, dark and high contrast, the same way physical_science_wcag_browser
// audits the default screens.
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

const STATE = {
  _heatLab: {
    mode: 'conduction', raceOn: true, matId: 'fibre', matBId: 'glass', timeScale: 1000,
    probes: [{ cm: 3, bar: 'a' }, { cm: 10, bar: 'b' }, { cm: 17, bar: 'a' }],
    poe: {
      coldflow: { pick: 'a', stage: 'explain', explained: true },
      insulatorrace: { pick: 'b', stage: 'observe' },
      touch: { pick: 'c', stage: 'explain', explained: true },
      fridge: { pick: 'b', stage: 'explain', explained: true },
    },
    everydayPick: 0, everydayAnswers: { 'Vacuum flask': 'convection', 'Wetsuit': 'conduction' },
    enginePick: 1, enginesJudged: { 'Coal power station': 'law' },
    log: [{ kind: 'conduction-race', at: 1 }],
    pick3d: 'plume',
  },
};

const THEMES = [
  { name: 'light', overrides: { theme: 'light', isDark: false, isContrast: false }, cls: 'theme-default' },
  { name: 'dark', overrides: { theme: 'dark', isDark: true, isContrast: false }, cls: 'theme-dark' },
  { name: 'contrast', overrides: { theme: 'contrast', isDark: false, isContrast: true }, cls: 'theme-contrast' },
];

describe('Heat Lab stage A states in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const theme of THEMES) {
    it(theme.name + ': WCAG A/AA and 320 px reflow with the new panels open', async () => {
      resetStemLab();
      document.head.querySelectorAll('style').forEach((style) => style.remove());
      loadTool('stem_lab/stem_tool_heatlab.js', 'heatLab');
      const rendered = prepareStemBrowserRender(renderTool('heatLab', STATE, theme.overrides));
      expect(rendered.html).toContain('data-ht-ledger');
      expect(rendered.html).toContain('The idea you used:');
      expect(rendered.html).not.toMatch(/undefined|NaN|\[object Object\]/);

      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
        '<body><main id="tool-root" class="' + theme.cls + '">' + rendered.html + '</main></body></html>', { waitUntil: 'domcontentloaded' });
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
        const offenders = [...document.querySelectorAll('#tool-root *')]
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
      await page.close();
    }, 30000);
  }
});
