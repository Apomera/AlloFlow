import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMServer, loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { extractReactSsrStyles, prepareStemBrowserRender } from './helpers/stem_widgets_smoke_harness.js';

// The what-if ghost note, the "Describe the ride" disclosure and the quickstart
// block, audited in the host wrappers at 320 px in light, dark and high contrast.
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

const BASE = {
  mode: 'halfpipe', viewMode: '2d', vehicle: 'skate', gravity: 9.81, surfaceId: 'standard', windId: 'calm',
  riderMassKg: 62, rampDepthM: 2.4, dropHeightM: 2.4, pumpTimingId: 'bottom', landingCompressionM: 0.45,
  bodyPositionId: 'neutral', airDrag: true, pumps: 3, rotationTarget: 180, spinRate: 210, speedMph: 17,
  angleDeg: 35, gapFt: 15, pushForceN: 200, cameraAzimuth: 38, showVectors: true, showTrail: true, showEnergy: true,
  estimateValue: '', stats: { runs: 1, successful: 1, withinTen: 0 }, _predictDefaultV: 2, estimateChallenge: true, experiments: [],
};

function revealedState(physics) {
  const sim = physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 210 });
  return {
    skatelab: {
      ...BASE,
      lastResult: sim,
      predictionResult: {
        signature: physics.simulationSignature(sim), promptId: 'hp_moon', choice: 'higher', correct: 'same',
        matched: false, misconception: 'low_gravity_higher', facts: { earthHeight: 3.32, moonHeight: 3.32, earthTime: 0.87, moonTime: 2.14 }, tryPatch: { gravity: 1.62 }, tryProgress: null,
      },
    },
  };
}

const THEMES = [
  { name: 'light', overrides: { theme: 'light', isDark: false, isContrast: false }, cls: 'theme-default' },
  { name: 'dark', overrides: { theme: 'dark', isDark: true, isContrast: false }, cls: 'theme-dark' },
  { name: 'contrast', overrides: { theme: 'contrast', isDark: false, isContrast: true }, cls: 'theme-contrast' },
];

describe('Skate Lab engagement panels in the host wrappers', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const theme of THEMES) {
    it(theme.name + ': the ghost note and disclosure pass WCAG A/AA at 320 px, and the canvas keeps its description', async () => {
      resetStemLab();
      document.head.querySelectorAll('style').forEach((style) => style.remove());
      loadTool('stem_lab/stem_tool_skatelab.js', 'skatelab');
      const physics = window.__alloSkatePhysicsPure;
      const rendered = prepareStemBrowserRender(renderTool('skatelab', revealedState(physics), { ...theme.overrides, gradeBand: 'g68', gradeLevel: '7th Grade' }));
      expect(rendered.html).toContain('data-skatelab-ghost="hp_moon"');
      expect(rendered.html).toContain('data-skatelab-describe');

      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
        '<body><main id="tool-root" class="' + theme.cls + '"><div data-stem-tool-surface="true" style="background:#fff">' + rendered.html + '</div></main></body></html>', { waitUntil: 'domcontentloaded' });
      await page.addStyleTag({ content: appCss });
      for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
      await page.addStyleTag({ content: stemThemeCss });
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      await page.waitForTimeout(300);

      // The accessibility tree, not the DOM: the closed disclosure must not silence the canvas.
      const cdp = await page.context().newCDPSession(page);
      const tree = await cdp.send('Accessibility.getFullAXTree');
      const canvas = tree.nodes.find((node) => node.role && node.role.value === 'image' && /Halfpipe physics simulation/.test((node.name || {}).value || ''));
      expect(canvas, 'canvas in the accessibility tree').toBeTruthy();
      expect(((canvas.description || {}).value || '').length).toBeGreaterThan(20);

      await page.evaluate(() => { document.querySelectorAll('#tool-root details').forEach((details) => { details.open = true; }); });
      await page.waitForTimeout(100);
      await page.addScriptTag({ content: axeSource });
      const audit = await page.evaluate(async () => axe.run('#tool-root', {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      }));
      const violations = audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 4).map((n) => ({ target: n.target, html: n.html.slice(0, 160), data: n.any && n.any[0] && n.any[0].data })) }));
      expect.soft(violations).toEqual([]);
      const sizes = await page.evaluate(() => {
        const summary = document.querySelector('.sk-describe summary').getBoundingClientRect();
        return { summaryHeight: summary.height, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth };
      });
      expect.soft(sizes.summaryHeight).toBeGreaterThanOrEqual(24);
      expect.soft(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth);
      await page.close();
    }, 60000);
  }
});
