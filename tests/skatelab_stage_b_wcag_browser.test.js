import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMServer, loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { extractReactSsrStyles, prepareStemBrowserRender } from './helpers/stem_widgets_smoke_harness.js';

// Skate Lab stage B panels (energy bars and graph, free-body diagram, motion
// graphs, predict card and feedback, experiment log with scatter plot, guided
// investigation with CER) audited at 320 px in light, dark and high contrast,
// the same way heatlab_stage_a_wcag_browser does it. Every <details> is opened
// before the audit so the hidden tables are checked too.
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
  estimateValue: '', stats: { runs: 4, successful: 2, withinTen: 0 },
};

function revealedState(physics) {
  const current = physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 210 });
  const previous = physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 210, gravity: 1.62 });
  const investigation = physics.investigations.find((item) => item.id === 'net_force');
  const experiments = investigation.steps.slice(0, 3).map((step, index) => ({
    id: 20 + index, n: index + 1, mode: 'flat', setup: step.patch.pushForceN + ' N push', measured: 3, unit: 'ft',
    errorPct: index === 0 ? 4.2 : null, runSuccessful: true, inv: 'net_force', step: index,
    values: physics.runValues(physics.runSimulation('flat', step.patch)),
  })).reverse();
  return {
    skatelab: {
      ...BASE,
      estimateChallenge: true,
      lastResult: current,
      lastSim: physics.simRecord(previous),
      experiments,
      logView: { x: 'netForce', y: 'pushAccel', group: 'none', sort: 'id', dir: 'desc' },
      predictionResult: {
        signature: physics.simulationSignature(current), promptId: 'hp_moon', choice: 'higher', correct: 'same',
        matched: false, misconception: 'low_gravity_higher',
        facts: { earthHeight: 3.32, moonHeight: 3.32, earthTime: 0.87, moonTime: 2.14 }, tryPatch: { gravity: 1.62 }, tryProgress: null,
      },
      predictionStats: { made: 3, matched: 1 },
      misconceptionTally: { low_gravity_higher: 1, heavier_higher: 1 },
      activeInvestigation: 'net_force',
      cer: { net_force: { claim: 'More net force gives more acceleration.', evidence: '', reasoning: '', checks: [true, false, false, false, false] } },
    },
  };
}

function predictState() {
  return { skatelab: { ...BASE, mode: 'gap', estimateChallenge: true, experiments: [] } };
}

const THEMES = [
  { name: 'light', overrides: { theme: 'light', isDark: false, isContrast: false }, cls: 'theme-default' },
  { name: 'dark', overrides: { theme: 'dark', isDark: true, isContrast: false }, cls: 'theme-dark' },
  { name: 'contrast', overrides: { theme: 'contrast', isDark: false, isContrast: true }, cls: 'theme-contrast' },
];

describe('Skate Lab stage B panels in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const theme of THEMES) {
    for (const [stateName, makeState] of [['revealed run, log and investigation', revealedState], ['predict-first card', predictState]]) {
      it(theme.name + ' / ' + stateName + ': WCAG A/AA and 320 px reflow', async () => {
        resetStemLab();
        document.head.querySelectorAll('style').forEach((style) => style.remove());
        loadTool('stem_lab/stem_tool_skatelab.js', 'skatelab');
        const physics = window.__alloSkatePhysicsPure;
        const rendered = prepareStemBrowserRender(renderTool('skatelab', makeState(physics), theme.overrides));
        if (stateName.startsWith('revealed')) {
          expect(rendered.html).toContain('data-skatelab-energy-panel');
          expect(rendered.html).toContain('class="sk-fbd"');
          expect(rendered.html).toContain('data-skatelab-predict-feedback="miss"');
          expect(rendered.html).toContain('class="sk-scatter"');
          expect(rendered.html).toContain('sk-cer-net_force-claim');
        } else {
          expect(rendered.html).toContain('data-skatelab-predict="true"');
        }
        expect(rendered.html).not.toMatch(/undefined|NaN|\[object Object\]/);

        const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
          '<body><main id="tool-root" class="' + theme.cls + '">' + rendered.html + '</main></body></html>', { waitUntil: 'domcontentloaded' });
        await page.addStyleTag({ content: appCss });
        for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
        await page.addStyleTag({ content: stemThemeCss });
        for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
        await page.evaluate(() => { document.querySelectorAll('#tool-root details').forEach((details) => { details.open = true; }); });
        // Let style recalculation settle (a cold first page sometimes reports
        // inherited colours as the UA black for a few frames), then finish any
        // running animation so axe measures final colours.
        await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
        await page.waitForTimeout(400);
        await page.evaluate(() => { document.getAnimations().forEach((animation) => { try { animation.finish(); } catch (err) {} }); });
        await page.addScriptTag({ content: axeSource });
        const audit = await page.evaluate(async () => axe.run('#tool-root', {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
        }));
        const reflow = await page.evaluate(() => {
          const cw = document.documentElement.clientWidth;
          const inScroller = (el) => !!el.closest('.sk-table-wrap');
          const offenders = [...document.querySelectorAll('#tool-root *')]
            .filter((el) => !inScroller(el))
            .map((el) => ({ el: el.tagName + '.' + String(el.className && el.className.baseVal != null ? el.className.baseVal : el.className).slice(0, 60), right: Math.round(el.getBoundingClientRect().right) }))
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
  }
});
