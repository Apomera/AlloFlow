import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMServer, loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { extractReactSsrStyles, prepareStemBrowserRender } from './helpers/stem_widgets_smoke_harness.js';
import { auditTargetSize } from './helpers/stem_wcag_browser_checks.js';

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

const physicsBase = {
  angle: 45, velocity: 25, gravity: 9.8, mass: 1, airResist: false,
  showLearn: false, showFlightData: false, showEnergy: false, showVectors: false,
  challengeTier: 0, challengeActive: false, launchCount: 0, targetsHit: 0,
  showFormulas: false, predictedRange: '', showOverlay: false, simSpeed: 1,
  showGraphs: false, targetMode: false, targetRound: 0, targetScore: 0,
  targetAttempts: 0, targetList: null, targetConstraint: null,
};

const waveBase = {
  frequency: 2, amplitude: 50, waveType: 'sine', waveMode: 'free', waveSpeed: 343,
  showSecond: false, amplitude2: 30, frequency2: 3, phase2: 0, harmonic: 1,
  damping: false, dampingAlpha: 0.5, paused: true, tourStep: -1,
};

const CASES = [
  { name: 'physics projectile lab', file: 'stem_lab/stem_tool_physics.js', id: 'physics', state: { physics: physicsBase } },
  { name: 'physics target mission', file: 'stem_lab/stem_tool_physics.js', id: 'physics', state: { physics: { ...physicsBase, targetMode: true, targetRound: 1, targetList: [{ x: 80, y: 0, radius: 10, destroyed: false, id: 0 }], targetConstraint: { type: 'fixedAngle', value: 45 } } } },
  ...['free', 'standing', 'ripple', 'reflection', 'longitudinal', 'doppler', 'spectrum'].map((mode) => ({
    name: `wave ${mode} mode`, file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: mode } },
  })),
  ...['conduction', 'convection', 'radiation'].map((mode) => ({
    name: `heat ${mode} mode`, file: 'stem_lab/stem_tool_heatlab.js', id: 'heatLab', state: { _heatLab: { mode } }, overrides: { theme: 'light' },
  })),
  ...['field', 'electro', 'motor', 'induce', 'materials', 'crane', 'maze', 'transformer', 'earth', 'quiz'].map((tab) => ({
    name: `magnetism ${tab} tab`, file: 'stem_lab/stem_tool_magnetism.js', id: 'magnetism', state: { magnetism: { tab } },
  })),
  ...['home', 'reflection', 'refraction', 'lenses', 'interference', 'diffraction', 'polarization', 'quiz', 'mastery', 'inquiry'].map((mode) => ({
    name: `optics ${mode} mode`, file: 'stem_lab/stem_tool_optics.js', id: 'opticsLab', state: { opticsLab: { mode } },
  })),
  { name: 'physics high contrast', file: 'stem_lab/stem_tool_physics.js', id: 'physics', state: { physics: physicsBase }, overrides: { isContrast: true } },
  { name: 'wave dark theme', file: 'stem_lab/stem_tool_wave.js', id: 'wave', state: { wave: { ...waveBase, waveMode: 'standing' } }, overrides: { isDark: true } },
  { name: 'heat dark theme', file: 'stem_lab/stem_tool_heatlab.js', id: 'heatLab', state: { _heatLab: { mode: 'conduction' } }, overrides: { theme: 'dark' } },
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

describe('Physical science tools WCAG 2.2 target-size regression in a real browser', () => {
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
        '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
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
      await page.close();
    }, 20000);
  }
});
