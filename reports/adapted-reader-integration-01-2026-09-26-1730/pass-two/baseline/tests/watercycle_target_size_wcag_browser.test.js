import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMServer, loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { extractReactSsrStyles, prepareStemBrowserRender } from './helpers/stem_widgets_smoke_harness.js';
import { auditTargetSize } from './helpers/stem_wcag_browser_checks.js';

// Water Cycle — WCAG 2.2 Target Size (Minimum, 2.5.8) in a real browser.
//
// WHY THIS EXISTS
// Physical science has had a target-size suite; the largest tool in the lab has not. The Water
// Cycle is dense with small controls — grade chips, six stage tabs, four mode tabs, camera and
// speed buttons, the pilot's flight deck — and 2.5.8 asks that a pointer target be at least 24x24
// CSS pixels, or else spaced far enough from its neighbours to be as easy to hit. Nothing measured
// that here, and it is not something markup pins can answer: it needs layout, at a real width.
//
// The viewport is 320px deliberately. Targets are hardest to satisfy where the layout is tightest,
// so checking the roomy desktop case would be checking the easy one.
const stemThemeCss = `
  :root, .theme-default {
    --allo-stem-canvas: #ffffff;
    --allo-stem-panel: #f8fafc;
    --allo-stem-deeper: #e2e8f0;
    --allo-stem-text: #0f172a;
    --allo-stem-text-soft: #475569;
    --allo-stem-border: #cbd5e1;
    --allo-stem-button-bg: #f1f5f9;
    --allo-stem-button-text: #0f172a;
    --allo-stem-button-border: #cbd5e1;
  }
  .theme-dark {
    --allo-stem-canvas: #0f172a;
    --allo-stem-panel: #1e293b;
    --allo-stem-deeper: #020617;
    --allo-stem-text: #e2e8f0;
    --allo-stem-text-soft: #94a3b8;
    --allo-stem-border: #334155;
    --allo-stem-button-bg: #1e293b;
    --allo-stem-button-text: #e2e8f0;
    --allo-stem-button-border: #334155;
  }
  .theme-contrast {
    --allo-stem-canvas: #000000;
    --allo-stem-panel: #000000;
    --allo-stem-deeper: #000000;
    --allo-stem-text: #ffff00;
    --allo-stem-text-soft: #ffff00;
    --allo-stem-border: #ffff00;
    --allo-stem-button-bg: #000000;
    --allo-stem-button-text: #00ff00;
    --allo-stem-button-border: #00ff00;
  }
  #tool-root {
    background: var(--allo-stem-canvas);
    color: var(--allo-stem-text);
    min-height: 100vh;
  }
`;

const root = process.cwd();
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
if (!cssFile) throw new Error('Compiled application stylesheet was not found.');
const appCss = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');
const appStylesSource = fs.readFileSync(path.join(root, 'app_styles_module.js'), 'utf8');
if (!(window.AlloModules && window.AlloModules.AppStyles)) {
  Function('window', appStylesSource)(window);
}
const appStylesMarkup = ReactDOMServer.renderToStaticMarkup(
  React.createElement(window.AlloModules.AppStyles.AppStyles, null),
);
const runtimeAppCssSheets = extractReactSsrStyles(appStylesMarkup).cssSheets;

const TOOL = 'stem_lab/stem_tool_watercycle.js';
const CASES = [
  { name: 'explorer', file: TOOL, id: 'waterCycle', state: { waterCycle: {} } },
  { name: 'explorer dark theme', file: TOOL, id: 'waterCycle', state: { waterCycle: {} }, overrides: { isDark: true } },
  { name: 'droplet journey 3D', file: TOOL, id: 'waterCycle', state: { waterCycle: { journeyView: '3d', journeyActive: true, journeyState: 'evaporating' } } },
  { name: 'storm lab', file: TOOL, id: 'waterCycle', state: { waterCycle: { wcMode: 'precipHunt' } } },
  { name: 'storm lab 3D chamber', file: TOOL, id: 'waterCycle', state: { waterCycle: { wcMode: 'precipHunt', precipHunt: { viewMode: '3d', preset: 'summerStorm' } } } },
  { name: 'steward campaign', file: TOOL, id: 'waterCycle', state: { waterCycle: { wcMode: 'steward' } } },
  { name: 'be the water launch', file: TOOL, id: 'waterCycle', state: { waterCycle: { wcMode: 'pilot' } } },
  { name: 'be the water in flight', file: TOOL, id: 'waterCycle', state: { waterCycle: { wcMode: 'pilot', pilot: { onboardingComplete: true } } } },
];

function normalizedOverrides(testCase) {
  const requested = testCase.overrides || {};
  const theme = requested.isContrast || requested.theme === 'contrast'
    ? 'contrast'
    : (requested.isDark || requested.theme === 'dark' ? 'dark' : 'light');
  return { ...requested, theme, isDark: theme === 'dark', isContrast: theme === 'contrast' };
}

function themeClass(testCase) {
  const theme = normalizedOverrides(testCase).theme;
  return theme === 'contrast' ? 'theme-contrast' : (theme === 'dark' ? 'theme-dark' : 'theme-default');
}

function renderCase(testCase) {
  resetStemLab();
  document.head.querySelectorAll('style').forEach((style) => style.remove());
  loadTool(testCase.file, testCase.id);
  return prepareStemBrowserRender(renderTool(testCase.id, testCase.state, normalizedOverrides(testCase)));
}

describe('Water Cycle WCAG 2.2 target-size regression in a real browser', () => {
  let browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    if (browser) await browser.close();
  }, 30000);

  for (const testCase of CASES) {
    it(testCase.name + ' has conforming pointer target size or spacing', async () => {
      const rendered = renderCase(testCase);
      expect(rendered.html.length, testCase.name + ' rendered an unexpectedly small surface').toBeGreaterThan(500);

      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(
        // `dark` goes on the document element because that is what the app toggles; tools ship
        // their dark palettes behind `.dark .selector` and the wrapper class alone never triggers them.
        '<!doctype html><html lang="en" class="' + (normalizedOverrides(testCase).isDark ? 'dark' : '') + '"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
          '<body><main id="tool-root" class="' + themeClass(testCase) + '">' + rendered.html + '</main></body></html>',
        { waitUntil: 'domcontentloaded' },
      );
      await page.addStyleTag({ content: appCss });
      for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
      await page.addStyleTag({ content: stemThemeCss });
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      await page.evaluate(() => {
        for (const animation of document.getAnimations()) animation.cancel();
      });

      const targetSize = await auditTargetSize(page);
      expect.soft(targetSize.failures, JSON.stringify(targetSize, null, 2)).toEqual([]);
      // ★ A pass is meaningless if the surface offered nothing to measure, and "0 failures" can
      // mean either "everything is 24px" or "everything undersized was far enough from its
      // neighbours to earn 2.5.8's spacing exception". Both are conformant; they are not the same
      // fact. Measured on 2026-09-04, "be the water in flight" reports checked 52, undersized 2,
      // spacing exception 2 — so this tool does lean on that exception, and a future reader should
      // know that before assuming every control is comfortably large.
      expect(targetSize.checked, testCase.name + ' measured almost no pointer targets, so a pass proves nothing')
        .toBeGreaterThan(4);
      await page.close();
    }, 25000);
  }
});
