// Real-browser WCAG A/AA, 320 px reflow, text spacing and target-size checks
// for the stage-B Area & Perimeter Lab surfaces: Square Units, Circles,
// Irregular Shapes and Design Missions.
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

// States are built after the tool loads, from its own pure models.
function unitsDrill(P) {
  const p = P.generateConversion(2, 115);
  const lin = p.dir === 'down' ? p.value * p.linear : p.value / p.linear;
  return { mode: 'units', unitLevel: 2, unitPredictChecked: { m_cm: 100 }, drills: { units: { seed: 115, level: 2, sig: p.sig, answer: String(lin), attempts: 2, hintStep: 3, feedback: { sig: p.sig, kind: 'mistake', mistake: 'linear_factor', tries: 2 } } } };
}
function circlesDone() {
  return { mode: 'circles', circleClaim: 'same', circleObject: 'plate', circleRolled: { coin: true, lid: true, plate: true }, circleRecords: { coin: true, lid: true, plate: true }, circleClaimCheckedFor: 'same', circleFirstClaim: 'same', sectorCount: 16, sectorPredict: 'rectangle' };
}
function irregularDone(P) {
  const blob = P.generateBlob(3, 31);
  const marks = {};
  for (const c of blob.cells) if (c.cover >= 0.97) marks[c.key] = 'full'; else if (c.cover >= 0.4) marks[c.key] = 'half';
  const own = P.blobMarkCounts(blob, marks);
  return { mode: 'irregular', blobLevel: 3, blobSeed: 31, blobMarks: { sig: blob.sig, marks }, blobEstimate: { sig: blob.sig, text: String(own.estimate) }, blobCheck: { sig: blob.sig, value: own.estimate, done: true } };
}
function gardenResult(P) {
  const m = P.generateGardenMission(2, 41 + 22);
  const r = P.assessGarden(m, 3, 2, { perimeter: 10, area: 10, cost: 1 });
  return { mode: 'missions', missionLevel: 2, missions: { garden: { seed: m.seed, level: 2, sig: m.sig, L: 3, W: 2, attempts: 2, inputs: { perimeter: '10', area: '10', cost: '1' }, result: { sig: m.sig, solved: false, items: r.items, P: r.P, A: r.A, C: r.C, tries: 2 } } } };
}
function floorRevealed(P) {
  const m = P.generateFloorMission(3, 43 + 33);
  const r = P.assessFloor(m, { area: m.area, count: Math.floor(m.area / 9), cost: 5 });
  return { mode: 'missions', missionKind: 'floor', missionLevel: 3, missions: { floor: { seed: m.seed, level: 3, sig: m.sig, attempts: 2, revealed: true, inputs: { area: String(m.area), count: '3', cost: '5' }, result: { sig: m.sig, solved: false, items: r.items, tries: 2 } } } };
}

const CASES = [
  { name: 'square units before a prediction', state: () => ({ mode: 'units' }) },
  { name: 'square units picture and named drill mistake', state: unitsDrill },
  { name: 'square units dark', state: unitsDrill, overrides: { isDark: true } },
  { name: 'circles with evidence, claim and sectors', state: circlesDone },
  { name: 'circles contrast', state: circlesDone, overrides: { isContrast: true } },
  { name: 'circles level 3 drill dark', state: () => ({ mode: 'circles', circleLevel: 3 }), overrides: { isDark: true } },
  { name: 'irregular shape checked', state: irregularDone },
  { name: 'irregular shape dark', state: irregularDone, overrides: { isDark: true } },
  { name: 'garden mission with named feedback', state: gardenResult },
  { name: 'flooring mission revealed contrast', state: floorRevealed, overrides: { isContrast: true } },
  { name: 'teacher panel with level control', state: () => ({ mode: 'units', teacherLevel: 2, mistakeCounts: { linear_factor: 2, squared_diameter: 1 }, missedByType: { unit_convert: 1 } }), overrides: { isTeacherMode: true }, openDetails: true },
];

describe('Area & Perimeter Lab stage B in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const testCase of CASES) {
    it(testCase.name + ' passes WCAG A/AA, 320px reflow, text spacing and 24px targets', async () => {
      resetStemLab();
      document.head.querySelectorAll('style').forEach((style) => style.remove());
      loadTool(FILE, ID);
      const state = { _areaPerimeter: testCase.state(window.AreaPerimeterPure) };
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
      const small = await page.evaluate(() => [...document.querySelectorAll('#tool-root button, #tool-root input, #tool-root select, #tool-root [role="button"]')]
        .filter((el) => el.getClientRects().length > 0)
        .map((el) => { const b = el.getBoundingClientRect(); return { el: el.outerHTML.slice(0, 80), w: b.width, h: b.height }; })
        .filter((b) => b.w < 24 || b.h < 24));
      expect(small).toEqual([]);
      await page.close();
    }, 30000);
  }
});
