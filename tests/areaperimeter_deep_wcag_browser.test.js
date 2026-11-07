// Real-browser WCAG A/AA, 320 px reflow, text spacing and target-size checks
// for the surfaces added in the 2026-11-03 Area & Perimeter Lab deep pass.
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

const fenceDone = { mode: 'fence', fenceP: 20, fenceW: 6, fenceClaims: { 20: 'same' }, fenceRecords: { 20: [1, 3, 6] }, fenceChecked: { 20: 'same' }, fenceCheckedFor: '20:same', fenceCut: 'middle', fenceCutW: 2, fenceCutD: 2, notchPredictions: { middle: 'down' } };
const CASES = [
  { name: 'fence lab with claim, evidence and notch result', state: fenceDone },
  { name: 'fence lab dark', state: fenceDone, overrides: { isDark: true } },
  { name: 'fence lab contrast', state: fenceDone, overrides: { isContrast: true } },
  { name: 'fence lab before a claim', state: { mode: 'fence' } },
  { name: 'explore prediction checked', state: { mode: 'explore', width: 5, height: 3, predictMeasurements: true, measurementsShown: true, predictResult: { w: 5, h: 3, area: 16, perimeter: 15 }, predictReflection: 'mixed' } },
  { name: 'explore predicting', state: { mode: 'explore', width: 5, height: 3, predictMeasurements: true, predictArea: '15' } },
  { name: 'grade 6 parallelogram rearranged with feedback', state: { mode: 'challenge', genGrade: 6, genType: 'parallelogram_area', genSeed: 21, showRearrange: true, attempts: 2, hintStep: 2, feedback: null } },
  { name: 'grade 5 fractions dark', state: { mode: 'challenge', genGrade: 5, genType: 'mixed_area', genSeed: 8 }, overrides: { isDark: true } },
  { name: 'grade 3 same perimeter contrast', state: { mode: 'challenge', genGrade: 3, genType: 'same_perimeter', genSeed: 4 }, overrides: { isContrast: true } },
  { name: 'teacher panel open', state: { mode: 'challenge', mistakeCounts: { gave_perimeter: 2 }, missedByType: { rect_area: 1 } }, overrides: { isTeacherMode: true }, openDetails: true },
];

describe('Area & Perimeter Lab deep pass in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const testCase of CASES) {
    it(testCase.name + ' passes WCAG A/AA, 320px reflow, text spacing and 24px targets', async () => {
      resetStemLab();
      document.head.querySelectorAll('style').forEach((style) => style.remove());
      loadTool(FILE, ID);
      const state = { _areaPerimeter: Object.assign({}, testCase.state) };
      if (state._areaPerimeter.genType) {
        const p = window.AreaPerimeterPure.generateProblem(state._areaPerimeter.genGrade, state._areaPerimeter.genType, state._areaPerimeter.genSeed);
        state._areaPerimeter.itemSig = p.sig;
        if (testCase.name.startsWith('grade 6')) state._areaPerimeter.feedback = { sig: p.sig, kind: 'mistake', mistake: 'used_slant', tries: 2 };
      }
      const rendered = prepareStemBrowserRender(renderTool(ID, state, testCase.overrides));
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
      const small = await page.evaluate(() => [...document.querySelectorAll('#tool-root button, #tool-root input, #tool-root select')]
        .filter((el) => el.offsetParent !== null)
        .map((el) => { const b = el.getBoundingClientRect(); return { el: el.outerHTML.slice(0, 80), w: b.width, h: b.height }; })
        .filter((b) => b.w < 24 || b.h < 24));
      expect(small).toEqual([]);
      await page.close();
    }, 30000);
  }
});
