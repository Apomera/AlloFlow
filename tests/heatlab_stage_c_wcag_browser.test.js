import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMServer, loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { extractReactSsrStyles, prepareStemBrowserRender } from './helpers/stem_widgets_smoke_harness.js';

// Stage C panels (the investigations with rows picked and writing in place,
// the cooler challenge after a test with a saved design, the convection
// driver, the sun-against-infrared table, the vacuum flask builder, and the
// heating / cooling curve over time with its lens and bubbles callout) audited
// with axe at 320 px in light, dark and high contrast, as stages A and B are.
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
  { kind: 'mixing', at: 1700000000000, sub1: 'water', m1_kg: 0.5, sub2: 'iron', m2_kg: 0.5, Tf_C: 26.78, dT1_K: 6.78 },
  { kind: 'mixing', at: 1700000060000, sub1: 'water', m1_kg: 0.5, sub2: 'iron', m2_kg: 1, Tf_C: 32.4, dT1_K: 12.4 },
  { kind: 'cooler', at: 1700000120000, shell: 'plastic', liner: 'eps', liner_mm: 25, seal: 'foam', foil: false, cost_usd: 6, outer_cm: 15.4, G_WK: 0.12, melt_h: 5.59, meetsBrief: true },
];
const BARE = { shell: 'plastic', liner: 'none', mm: 0, seal: 'none', foil: false };
const EPS = { shell: 'plastic', liner: 'eps', mm: 25, seal: 'foam', foil: false };
const STATE = {
  _heatLab: { htAll: true,
    log: LOG, cerOpen: 'massmaterial',
    cer: { massmaterial: {
      picks: [{ at: LOG[0].at, kind: 'mixing', text: 'Calorimetry: m2_kg 0.5' }, { at: LOG[1].at, kind: 'mixing', text: 'Calorimetry: m2_kg 1' }, { at: 5, kind: 'mixing', text: 'Calorimetry: deleted row' }],
      claim: 'Changing the material mattered more.', evidence: 'Tf went from 26.8 to 32.4 °C.', reasoning: 'Heat capacity m × c decides it.', checks: { claim: true, rows: true },
    } },
    clLiner: 'eps', clMm: 25, clSeal: 'foam', clTouched: true, clBadge: true,
    clTest: { design: EPS, meltH: 5.59, cost: 6, outerCm: 15.4, meets: true, at: 1 },
    clSaved: [{ design: BARE, meltH: 1.69, cost: 3, outerCm: 10.4, meets: false }, { design: EPS, meltH: 5.59, cost: 6, outerCm: 15.4, meets: true }],
    clWhy: 'Design B: 5.6 h for $6.',
    cvFluid: 'oil', cvPowerExp: 1,
    radSurf: 'silver', flVacuum: true, flSilver: true,
    hcSub: 'water', hcMode: 'cool', hcSuper: 5, hcCursor: 40, lens: { time: true },
  },
};
// Second state: boiling (both bubbles callouts), heat from above beyond the
// model's range, the two-experiment investigation, a 700 °C radiator.
const STATE_2 = {
  _heatLab: { htAll: true,
    energyIn: 1900, hcSub: 'ethanol', hcMode: 'heat', hcCursor: 60, cvFrom: 'above', cvFluid: 'air', cvPowerExp: 2,
    cerOpen: 'coldtohot', mode: 'radiation', radT: 700, radSurf: 'black', flStopper: true,
  },
};

const THEMES = [
  { name: 'light', overrides: { theme: 'light', isDark: false, isContrast: false }, cls: 'theme-default' },
  { name: 'dark', overrides: { theme: 'dark', isDark: true, isContrast: false }, cls: 'theme-dark' },
  { name: 'contrast', overrides: { theme: 'contrast', isDark: false, isContrast: true }, cls: 'theme-contrast' },
];
const CASES = THEMES.map((th) => ({ name: th.name, theme: th, state: STATE }))
  .concat([{ name: 'light, boiling and heated from above', theme: THEMES[0], state: STATE_2 }, { name: 'contrast, boiling and heated from above', theme: THEMES[2], state: STATE_2 }]);

describe('Heat Lab stage C panels in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const c of CASES) {
    it(c.name + ': WCAG A/AA and 320 px reflow with the stage C panels open', async () => {
      resetStemLab();
      document.head.querySelectorAll('style').forEach((style) => style.remove());
      loadTool('stem_lab/stem_tool_heatlab.js', 'heatLab');
      const rendered = prepareStemBrowserRender(renderTool('heatLab', c.state, c.theme.overrides));
      ['data-ht-cer=', 'data-ht-convection-model', 'data-ht-sun-panel', 'data-ht-flask', 'data-ht-phase-time', 'data-ht-cooler-brief', 'data-ht-cooler-model']
        .forEach((mark) => expect(rendered.html, mark).toContain(mark));
      if (c.state === STATE) {
        ['data-ht-cooler-result="pass"', 'data-ht-cooler-compare', 'data-ht-cooler-limits', 'data-ht-cooler-badge', 'data-ht-cer-row', 'data-ht-lens="ht-lens-time"']
          .forEach((mark) => expect(rendered.html, mark).toContain(mark));
      } else {
        expect(rendered.html).toContain('data-ht-bubbles="energy"');
        expect(rendered.html).toContain('data-ht-bubbles="time"');
        expect(rendered.html).toContain('data-ht-cer-norows');
      }
      expect(rendered.html).not.toMatch(/undefined|NaN|\[object Object\]|\{[a-z0-9]+\}/);

      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
        '<body><main id="tool-root" class="' + c.theme.cls + '">' + rendered.html + '</main></body></html>', { waitUntil: 'domcontentloaded' });
      await page.addStyleTag({ content: appCss });
      for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
      await page.addStyleTag({ content: stemThemeCss });
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      // open the model disclosure so its contents are audited too
      await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
      await page.addScriptTag({ content: axeSource });
      const audit = await page.evaluate(async () => axe.run('#tool-root', {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      }));
      const reflow = await page.evaluate(() => {
        const cw = document.documentElement.clientWidth;
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
    }, 60000);
  }
});
