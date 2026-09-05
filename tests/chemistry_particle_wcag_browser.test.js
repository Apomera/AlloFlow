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

// These variables are normally injected by app_styles_module.js at runtime,
// rather than emitted into the compiled Tailwind stylesheet used by this
// isolated browser harness. Mirror the production theme contract so tools
// which consume --allo-stem-* variables are audited against their real colors.
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
  { name: 'chemistry lab hub', file: 'stem_lab/stem_tool_chembalance.js', id: 'chemBalance', state: { chemBalance: {} } },
  ...['balance', 'reactions', 'stoich', 'safety', 'periodic'].map((subtool) => ({
    name: `chemistry lab ${subtool}`, file: 'stem_lab/stem_tool_chembalance.js', id: 'chemBalance',
    state: { chemBalance: { subtool, _everPicked: true } },
  })),
  ...['viewer', 'creator', 'build', 'table', 'reactions'].map((moleculeMode) => ({
    name: `molecule lab ${moleculeMode}`, file: 'stem_lab/stem_tool_molecule.js', id: 'molecule',
    state: { molecule: { moleculeMode } },
  })),
  {
    name: 'molecule lab filtered periodic workspace',
    file: 'stem_lab/stem_tool_molecule.js',
    id: 'molecule',
    state: {
      molecule: {
        moleculeMode: 'table',
        tutorialDismissed: true,
        elementCategory: 'nonmetal',
        selectedElement: { name: 'Carbon', s: 'C', n: 6, cat: 'nonmetal', c: '#111827' },
      },
    },
  },
  {
    name: 'molecule lab reference browser',
    file: 'stem_lab/stem_tool_molecule.js',
    id: 'molecule',
    state: {
      molecule: {
        moleculeMode: 'table',
        tutorialDismissed: true,
        referenceLibraryOpen: true,
        referenceLibraryGroup: 'applications',
      },
    },
  },
  ...['titrate', 'challenge', 'incidents', 'equipment', 'molarity', 'buffers'].map((labTab) => ({
    name: `titration lab ${labTab}`, file: 'stem_lab/stem_tool_titration.js', id: 'titrationLab',
    state: { titrationLab: { labTab, titrationReduceMotion: true } },
  })),
  { name: 'nuclear lab overview', file: 'stem_lab/stem_tool_nuclearlab.js', id: 'nuclearLab', state: { _nuclearLab: {} } },
  { name: 'particle lab 3d overview', file: 'stem_lab/stem_tool_particlelab3d.js', id: 'particleLab3d', state: { particleLab3d: {} } },
  // The readouts dock and essential bar are new surfaces; audit them with the dock in each
  // placement and under the dark and high-contrast host themes as well as the default.
  { name: 'particle lab 3d readouts below', file: 'stem_lab/stem_tool_particlelab3d.js', id: 'particleLab3d', state: { particleLab3d: { readoutsPosition: 'bottom', trace: true, systemProbe: true, preset: 'osmosis' } } },
  { name: 'particle lab 3d dark theme', file: 'stem_lab/stem_tool_particlelab3d.js', id: 'particleLab3d', state: { particleLab3d: { readoutsPosition: 'left', trace: true } }, overrides: { isDark: true }, hostCard: true },
  { name: 'particle lab 3d high contrast', file: 'stem_lab/stem_tool_particlelab3d.js', id: 'particleLab3d', state: { particleLab3d: { trace: true, systemProbe: true } }, overrides: { isContrast: true } },
  { name: 'molecule lab dark theme', file: 'stem_lab/stem_tool_molecule.js', id: 'molecule', state: { molecule: { moleculeMode: 'viewer' } }, overrides: { isDark: true } },
  { name: 'titration lab high contrast', file: 'stem_lab/stem_tool_titration.js', id: 'titrationLab', state: { titrationLab: { labTab: 'titrate', titrationReduceMotion: true } }, overrides: { isContrast: true } },
];

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

// In the dark theme the STEM host (stem_lab_module.js, isDarkBackdrop) wraps every tool in a
// white card carrying data-stem-tool-surface, and the host's generic .theme-dark utility remaps
// are scoped with :not([data-stem-tool-surface] *). Rendering the tool bare under .theme-dark
// audits a cascade the product never shows (navy bg-white panels with slate-950 ink). Mirror the
// production substrate so dark-theme findings are real. Contrast keeps its pure-black surface.
// Opt-in per case (hostCard: true): under the faithful substrate the pre-existing molecule dark case
// reports slate-600 ink on the tool's own dark token panels at 1.93:1, a real finding for that
// tool's owner that this lane does not change.
function surfaceMarkup(testCase, html) {
  if (!testCase.hostCard || normalizedOverrides(testCase).theme !== 'dark') return html;
  return '<div data-stem-tool-surface="' + testCase.id + '" style="background:#ffffff;color:#0f172a;color-scheme:light;border-radius:10px;padding:10px">' + html + '</div>';
}

function themeClass(testCase) {
  const theme = normalizedOverrides(testCase).theme;
  return theme === 'contrast' ? 'theme-contrast' : (theme === 'dark' ? 'theme-dark' : 'theme-default');
}

function normalizedOverrides(testCase) {
  const requested = testCase.overrides || {};
  const theme = requested.isContrast || requested.theme === 'contrast'
    ? 'contrast'
    : (requested.isDark || requested.theme === 'dark' ? 'dark' : 'light');
  return { ...requested, theme, isDark: theme === 'dark', isContrast: theme === 'contrast' };
}

describe('Chemistry and particle tools WCAG regression in a real browser', () => {
  let browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  }, 60000); // a cold Chromium launch has exceeded vitest's 10 s hook default on this machine

  afterAll(async () => {
    if (browser) await browser.close();
  }, 30000);

  for (const testCase of CASES) {
    it(testCase.name + ' passes WCAG A/AA, 320px reflow, and text-spacing checks', async () => {
      const rendered = renderCase(testCase);
      expect(rendered.html.length, testCase.name + ' rendered an unexpectedly small surface').toBeGreaterThan(500);

      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(
        '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
          '<body><main id="tool-root" class="' + themeClass(testCase) + '">' + surfaceMarkup(testCase, rendered.html) + '</main></body></html>',
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
                  gridTemplateColumns: styles.gridTemplateColumns, flexWrap: styles.flexWrap,
                };
              })
              .filter((item) => item.right > clientWidth + 1 || item.left < -1 || item.width > clientWidth + 1 || item.scrollWidth > item.width + 1)
              .sort((a, b) => Math.max(b.right, b.scrollWidth) - Math.max(a.right, a.scrollWidth))
              .slice(0, 8)
          : [];
        return { scrollWidth, clientWidth, offenders };
      });

      const textSpacingReflow = await auditTextSpacingReflow(page);
      expect.soft(compactViolations(audit.violations)).toEqual([]);
      expect.soft(reflow.scrollWidth, JSON.stringify(reflow.offenders, null, 2)).toBeLessThanOrEqual(reflow.clientWidth);
      expect.soft(textSpacingReflow.scrollWidth, JSON.stringify(textSpacingReflow.offenders, null, 2)).toBeLessThanOrEqual(textSpacingReflow.clientWidth);
      await page.close();
    }, 60000); // axe + two reflow passes on a real browser; 20s tripped on OneDrive disk contention
  }
});
