import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMServer, loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { extractReactSsrStyles, prepareStemBrowserRender } from './helpers/stem_widgets_smoke_harness.js';

// Skate Lab stage C panels (mission board and banner, explanation level with
// plain summary and key words, extended maths, listening tools with
// step-through and shortcut help, teacher controls, assignment banner, hidden
// answers) audited at 320 px in light, dark and high contrast, the same way as
// skatelab_stage_b_wcag_browser. Every <details> is opened before the audit.
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
  estimateValue: '', stats: { runs: 4, successful: 2, withinTen: 0 }, _predictDefaultV: 2,
};

function studentState(physics) {
  const moon = physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 210, gravity: 1.62 });
  return {
    skatelab: {
      ...BASE,
      gravity: 1.62,
      estimateChallenge: true,
      lastResult: moon,
      stepMode: true,
      narrate: true,
      sonify: true,
      activeMission: 'moon_hang',
      missionGuess: { value: '2.1', signature: physics.simulationSignature(moon) },
      missions: { spin_540: { done: true, tries: 3, last: 540, reason: 'done' }, moon_hang: { done: false, tries: 1, last: 2.137, reason: 'guess_off', err: 24 } },
      predictionResult: {
        signature: physics.simulationSignature(moon), promptId: 'hp_moon', choice: 'higher', correct: 'same',
        matched: false, misconception: 'low_gravity_higher', facts: { earthHeight: 3.32, moonHeight: 3.32 }, tryPatch: { gravity: 9.81 }, tryProgress: null,
      },
      teacher: { locks: { vehicle: 'skate', gravity: 1.62 }, assign: { kind: 'mission', id: 'soft_landing' }, hideAnswers: true },
      experiments: [],
    },
  };
}

function teacherState(physics) {
  const gap = physics.simGapJump({});
  return {
    skatelab: {
      ...BASE,
      mode: 'gap',
      estimateChallenge: false,
      lastResult: gap,
      teacher: { locks: { airDrag: true }, assign: { kind: 'investigation', id: 'landing_design' }, hideAnswers: false },
      experiments: [],
    },
  };
}

function lockedState() {
  return { skatelab: { ...BASE, mode: 'flat', estimateChallenge: true, experiments: [] } };
}

const STATES = [
  ['student, Simple level, missions, step-through, hidden answers', studentState, { gradeBand: 'g68', gradeLevel: '7th Grade' }],
  ['teacher, Extended level, teacher controls', teacherState, { gradeBand: 'g912', gradeLevel: '12th Grade', isTeacherMode: true }],
  ['predict-first calm instruction', lockedState, { gradeBand: 'g912', gradeLevel: '9th Grade' }],
];

const THEMES = [
  { name: 'light', overrides: { theme: 'light', isDark: false, isContrast: false }, cls: 'theme-default' },
  { name: 'dark', overrides: { theme: 'dark', isDark: true, isContrast: false }, cls: 'theme-dark' },
  { name: 'contrast', overrides: { theme: 'contrast', isDark: false, isContrast: true }, cls: 'theme-contrast' },
];

describe('Skate Lab stage C panels in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const theme of THEMES) {
    for (const [stateName, makeState, ctxOverrides] of STATES) {
      it(theme.name + ' / ' + stateName + ': WCAG A/AA and 320 px reflow', async () => {
        resetStemLab();
        document.head.querySelectorAll('style').forEach((style) => style.remove());
        loadTool('stem_lab/stem_tool_skatelab.js', 'skatelab');
        const physics = window.__alloSkatePhysicsPure;
        const rendered = prepareStemBrowserRender(renderTool('skatelab', makeState(physics), { ...theme.overrides, ...ctxOverrides }));
        if (stateName.startsWith('student')) {
          expect(rendered.html).toContain('data-skatelab-missions');
          expect(rendered.html).toContain('data-skatelab-active-mission="moon_hang"');
          expect(rendered.html).toContain('data-skatelab-plain');
          expect(rendered.html).toContain('data-skatelab-maths');
          expect(rendered.html).toContain('class="sk-step-panel"');
          expect(rendered.html).toContain('data-skatelab-assignment="mission:soft_landing"');
          expect(rendered.html).toContain('data-skatelab-predict-feedback="hidden"');
          expect(rendered.html).toContain('Locked by your teacher.');
        } else if (stateName.startsWith('teacher')) {
          expect(rendered.html).toContain('data-skatelab-teacher');
          expect(rendered.html).toContain('data-skatelab-extended');
        } else {
          expect(rendered.html).toContain('id="sk-predict-needed"');
          expect(rendered.html).not.toContain('role="alert"');
        }
        expect(rendered.html).toContain('class="sk-shortcuts"');
        expect(rendered.html).not.toMatch(/undefined|NaN|\[object Object\]/);

        const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
          '<body><main id="tool-root" class="' + theme.cls + '">' + rendered.html + '</main></body></html>', { waitUntil: 'domcontentloaded' });
        await page.addStyleTag({ content: appCss });
        for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
        await page.addStyleTag({ content: stemThemeCss });
        for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
        await page.evaluate(() => {
          document.querySelectorAll('#tool-root details').forEach((details) => { details.open = true; });
          // Show one vocabulary definition so its box is audited too.
          const def = document.getElementById('sk-vocab-def');
          if (def) { def.hidden = false; def.innerHTML = '<p><strong>Kinetic energy (KE): </strong>Energy of motion.</p>'; }
        });
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
