// Real-browser WCAG A/AA, 320 px reflow, text spacing and target-size checks
// for the stage-C Area & Perimeter Lab surfaces: the "Start here" path, the
// grade-range teacher panel, the ruler marker for the circle roll, the new
// unit pictures (hectare blocks, acre strip) and the new hint ladders.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { auditTextSpacingReflow } from './helpers/stem_wcag_browser_checks.js';

const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
const cssSource = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');
const FILE = 'stem_lab/stem_tool_areaperimeter.js';
const ID = 'areaPerimeter';

const measuring = () => ({ mode: 'circles', circleClaim: 'same', circleObject: 'cup', circleRolled: { cup: true }, circleRead: { cup: { marker: 12.5, typed: '9', tries: 2, verdict: 'read_diameter', hint: 3 } } });
function irregularRevealed(P) {
  const blob = P.generateBlob(2, 31);
  const marks = {};
  for (const c of blob.cells) if (c.cover >= 0.97) marks[c.key] = 'full'; else if (c.cover >= 0.03) marks[c.key] = 'half';
  const own = P.blobMarkCounts(blob, marks);
  return { mode: 'irregular', blobLevel: 2, blobSeed: 31, blobMarks: { sig: blob.sig, marks }, blobEstimate: { sig: blob.sig, text: String(own.estimate) }, blobCheck: { sig: blob.sig, value: own.estimate, done: true, revealed: true }, blobAttempt: { sig: blob.sig, tries: 2, hint: 3 } };
}
function haDrill(P) {
  let seed = 1;
  while (seed < 500 && P.generateConversion(2, seed).pair !== 'ha_m') seed += 1;
  const p = P.generateConversion(2, seed);
  return { mode: 'units', unitLevel: 2, unitPair: 'ha_m', unitPredictChecked: { ha_m: 100 }, drills: { units: { seed, level: 2, sig: p.sig, answer: '1', attempts: 1, hintStep: 3, feedback: { sig: p.sig, kind: 'mistake', mistake: 'linear_factor', tries: 1 } } } };
}

const CASES = [
  { name: 'grade 3 path and tabs', state: () => ({ mode: 'explore', revealedBest: 20 }), overrides: { gradeLevel: '3rd Grade' } },
  { name: 'grade 6-7 path dark', state: () => ({ mode: 'challenge', circleAwarded: { claim: true } }), overrides: { gradeLevel: '7th Grade', isDark: true } },
  { name: 'grade 4-5 path contrast', state: () => ({ mode: 'units' }), overrides: { isContrast: true } },
  { name: 'teacher panel with grade range and old level note', state: () => ({ mode: 'units', teacherLevel: 2, teacherRange: { min: 4, max: 7 }, mistakeCounts: { read_diameter: 1, two_sides: 2 } }), overrides: { isTeacherMode: true }, openDetails: true },
  { name: 'circle ruler marker with reading feedback and hints', state: measuring },
  { name: 'circle ruler marker dark', state: measuring, overrides: { isDark: true } },
  { name: 'circle ruler marker contrast', state: measuring, overrides: { isContrast: true } },
  { name: 'acre strip picture dark', state: () => ({ mode: 'units', unitPair: 'acre_ft', unitPredictChecked: { acre_ft: 726 } }), overrides: { isDark: true } },
  { name: 'hectare drill with picture and hints', state: haDrill },
  { name: 'irregular shape revealed with hints', state: irregularRevealed },
  { name: 'mission with hint ladder', state: () => ({ mode: 'missions', missionLevel: 2, missions: { garden: { seed: 63, level: 2, sig: 'x', hint: 3 } } }) },
];

describe('Area & Perimeter Lab stage C in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const testCase of CASES) {
    it(testCase.name + ' passes WCAG A/AA, 320px reflow, text spacing and 24px targets', async () => {
      resetStemLab();
      document.head.querySelectorAll('style').forEach((style) => style.remove());
      loadTool(FILE, ID);
      const P = window.AreaPerimeterPure;
      const raw = testCase.state(P);
      // The mission case needs its real signature to show the hints.
      if (raw.missions && raw.missions.garden && raw.missions.garden.sig === 'x') raw.missions.garden.sig = P.generateGardenMission(2, 63).sig;
      const rendered = prepareStemBrowserRender(renderTool(ID, { _areaPerimeter: raw }, testCase.overrides));
      expect(rendered.html).not.toMatch(/undefined|NaN|\[object Object\]/);
      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + cssSource +
        '</style></head><body><main id="tool-root">' + rendered.html + '</main></body></html>', { waitUntil: 'domcontentloaded' });
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      if (testCase.openDetails) await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
      await page.addScriptTag({ content: axeSource });
      const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
      expect(audit.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => ({ target: n.target, data: n.any && n.any[0] && n.any[0].data })) }))).toEqual([]);
      const reflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      expect(reflow.scrollWidth).toBeLessThanOrEqual(reflow.clientWidth);
      const spacing = await auditTextSpacingReflow(page);
      expect(spacing.scrollWidth, JSON.stringify(spacing.offenders)).toBeLessThanOrEqual(spacing.clientWidth);
      const small = await page.evaluate(() => [...document.querySelectorAll('#tool-root button, #tool-root input, #tool-root select, #tool-root [role="button"], #tool-root [role="slider"]')]
        .filter((el) => el.getClientRects().length > 0)
        .map((el) => { const b = el.getBoundingClientRect(); return { el: el.outerHTML.slice(0, 80), w: b.width, h: b.height }; })
        .filter((b) => b.w < 24 || b.h < 24));
      expect(small).toEqual([]);
      await page.close();
    }, 30000);
  }
});
