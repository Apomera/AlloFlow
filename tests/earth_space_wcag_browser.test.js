import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMServer, loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { extractReactSsrStyles, prepareStemBrowserRender } from './helpers/stem_widgets_smoke_harness.js';
import { auditTextSpacingReflow } from './helpers/stem_wcag_browser_checks.js';

const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
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

const CASES = [
  { name: 'astronomy overview', file: 'stem_lab/stem_tool_astronomy.js', id: 'astronomy', state: { astronomy: {} } },
  { name: 'galaxy overview', file: 'stem_lab/stem_tool_galaxy.js', id: 'galaxy', state: { galaxy: {} } },
  { name: 'geology explorer overview', file: 'stem_lab/stem_tool_geologyexplorer.js', id: 'geologyExplorer', state: { geologyExplorer: {} } },
  { name: 'moon mission overview', file: 'stem_lab/stem_tool_moonmission.js', id: 'moonMission', state: { moonMission: {} } },
  { name: 'plate tectonics overview', file: 'stem_lab/stem_tool_platetectonics.js', id: 'plateTectonics', state: { plateTectonics: {} } },
  { name: 'rocks overview', file: 'stem_lab/stem_tool_rocks.js', id: 'rocks', state: { rocks: {} } },
  { name: 'rock cycle overview', file: 'stem_lab/stem_tool_rocks.js', id: 'rockCycle', state: { rockCycle: {} } },
  { name: 'solar system overview', file: 'stem_lab/stem_tool_solarsystem.js', id: 'solarSystem', state: { solarSystem: {} } },
  { name: 'space station overview', file: 'stem_lab/stem_tool_spacestation.js', id: 'spaceStation', state: { spaceStation: {} } },
  { name: 'universe overview', file: 'stem_lab/stem_tool_universe.js', id: 'universe', state: { universe: {} } },
  { name: 'water cycle overview', file: 'stem_lab/stem_tool_watercycle.js', id: 'waterCycle', state: { waterCycle: {} } },
  { name: 'weather systems overview', file: 'stem_lab/stem_tool_weathersystems.js', id: 'weatherSystems', state: { weatherSystems: {} } },
  { name: 'astronomy dark theme', file: 'stem_lab/stem_tool_astronomy.js', id: 'astronomy', state: { astronomy: {} }, overrides: { isDark: true } },
  { name: 'rocks mineral workbench dark theme', file: 'stem_lab/stem_tool_rocks.js', id: 'rocks', state: { rocks: { mode: 'workbench', wb: {} } }, overrides: { isDark: true } },
  { name: 'water cycle dark theme', file: 'stem_lab/stem_tool_watercycle.js', id: 'waterCycle', state: { waterCycle: {} }, overrides: { isDark: true } },
  { name: 'water cycle night scene', file: 'stem_lab/stem_tool_watercycle.js', id: 'waterCycle', state: { waterCycle: { climSolar: 0.2, climateAdjusted: true } } },
  { name: 'water cycle storm lab', file: 'stem_lab/stem_tool_watercycle.js', id: 'waterCycle', state: { waterCycle: { wcMode: 'precipHunt' } } },
  { name: 'water cycle storm lab dark theme', file: 'stem_lab/stem_tool_watercycle.js', id: 'waterCycle', state: { waterCycle: { wcMode: 'precipHunt' } }, overrides: { isDark: true } },
  { name: 'water cycle steward campaign', file: 'stem_lab/stem_tool_watercycle.js', id: 'waterCycle', state: { waterCycle: { wcMode: 'steward' } } },
  { name: 'water cycle steward campaign dark theme', file: 'stem_lab/stem_tool_watercycle.js', id: 'waterCycle', state: { waterCycle: { wcMode: 'steward' } }, overrides: { isDark: true } },
  { name: 'water cycle night scene dark theme', file: 'stem_lab/stem_tool_watercycle.js', id: 'waterCycle', state: { waterCycle: { climSolar: 0.2, climateAdjusted: true } }, overrides: { isDark: true } },
  { name: 'water cycle droplet journey 3D dark theme', file: 'stem_lab/stem_tool_watercycle.js', id: 'waterCycle', state: { waterCycle: { journeyView: '3d', journeyActive: true, journeyState: 'evaporating' } }, overrides: { isDark: true } },
  { name: 'water cycle droplet journey 3D', file: 'stem_lab/stem_tool_watercycle.js', id: 'waterCycle', state: { waterCycle: { journeyView: '3d', journeyActive: true, journeyState: 'evaporating' } } },
  { name: 'water cycle be the water launch', file: 'stem_lab/stem_tool_watercycle.js', id: 'waterCycle', state: { waterCycle: { wcMode: 'pilot' } } },
  { name: 'water cycle be the water in flight', file: 'stem_lab/stem_tool_watercycle.js', id: 'waterCycle', state: { waterCycle: { wcMode: 'pilot', pilot: { onboardingComplete: true } } } },
  { name: 'water cycle be the water in flight dark theme', file: 'stem_lab/stem_tool_watercycle.js', id: 'waterCycle', state: { waterCycle: { wcMode: 'pilot', pilot: { onboardingComplete: true } } }, overrides: { isDark: true } },
  { name: 'plate tectonics high contrast', file: 'stem_lab/stem_tool_platetectonics.js', id: 'plateTectonics', state: { plateTectonics: {} }, overrides: { isContrast: true } },
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

function compactViolations(violations) {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.map((node) => ({
      target: node.target,
      html: node.html,
      contrast: node.any && node.any[0] && node.any[0].data
        ? {
            foreground: node.any[0].data.fgColor,
            background: node.any[0].data.bgColor,
            ratio: node.any[0].data.contrastRatio,
            expected: node.any[0].data.expectedContrastRatio,
          }
        : undefined,
    })),
  }));
}

describe('Earth and space tools WCAG regression in a real browser', () => {
  let browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    if (browser) await browser.close();
  }, 30000);

  for (const testCase of CASES) {
    it(testCase.name + ' passes WCAG A/AA, 320px reflow, and text-spacing checks', async () => {
      const rendered = renderCase(testCase);
      expect(rendered.html.length, testCase.name + ' rendered an unexpectedly small surface').toBeGreaterThan(500);

      // ★ Dark scenarios have to carry the class the APP sets, not just the wrapper label. The
      // host toggles `dark` on the document element (see dev-tools/wc_scene_shots.cjs, which does
      // `documentElement.classList.toggle('dark', ...)`), and tools ship their dark palettes behind
      // `.dark .selector` — the Water Cycle alone has 743 of them. With only `theme-dark` on the
      // wrapper every one of those rules missed, so each "dark theme" case here was auditing the
      // tool's LIGHT colours inside a dark-labelled box and reporting a pass for a combination no
      // student ever sees. Adding the class turned two Water Cycle dark failures back into passes
      // (its `.dark` overrides do the right thing) and broke nothing else in this suite.
      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(
        '<!doctype html><html lang="en" class="' + (normalizedOverrides(testCase).isDark ? 'dark' : '') + '"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
          '<body><main id="tool-root" class="' + themeClass(testCase) + '">' + rendered.html + '</main></body></html>',
        { waitUntil: 'domcontentloaded' },
      );
      await page.addStyleTag({ content: appCss });
      for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
      await page.addStyleTag({ content: stemThemeCss });
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: axeSource });
      await page.evaluate(() => {
        for (const animation of document.getAnimations()) animation.cancel();
      });

      const audit = await page.evaluate(async () => axe.run('#tool-root', {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      }));
      const reflow = await page.evaluate(() => {
        const clientWidth = document.documentElement.clientWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        const offenders = scrollWidth > clientWidth
          ? [...document.querySelectorAll('#tool-root, #tool-root *')]
              .map((element) => {
                const box = element.getBoundingClientRect();
                const styles = getComputedStyle(element);
                return {
                  element: element.tagName.toLowerCase() + (element.id ? '#' + element.id : '') +
                    (typeof element.className === 'string' && element.className ? '.' + element.className.trim().replace(/\s+/g, '.') : ''),
                  html: element.outerHTML.slice(0, 280),
                  left: Math.round(box.left), right: Math.round(box.right), width: Math.round(box.width),
                  scrollWidth: element.scrollWidth, display: styles.display,
                  overflowX: styles.overflowX, gridTemplateColumns: styles.gridTemplateColumns,
                  flexWrap: styles.flexWrap,
                };
              })
              .filter((item) => item.right > clientWidth + 1 || item.left < -1 || item.width > clientWidth + 1 || item.scrollWidth > item.width + 1)
              .sort((a, b) => Math.max(b.right, b.scrollWidth) - Math.max(a.right, a.scrollWidth))
              .slice(0, 10)
          : [];
        return { scrollWidth, clientWidth, offenders };
      });

      const textSpacingReflow = await auditTextSpacingReflow(page);
      expect.soft(compactViolations(audit.violations)).toEqual([]);
      expect.soft(reflow.scrollWidth, JSON.stringify(reflow.offenders, null, 2)).toBeLessThanOrEqual(reflow.clientWidth);
      expect.soft(textSpacingReflow.scrollWidth, JSON.stringify(textSpacingReflow.offenders, null, 2)).toBeLessThanOrEqual(textSpacingReflow.clientWidth);
      await page.close();
    }, 20000);
  }
});
