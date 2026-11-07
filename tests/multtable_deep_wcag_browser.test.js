import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Multiplication Table deep rebuild (2026-11-03): axe WCAG A/AA and 320px
// reflow in a real browser for the states the default-state suites never
// render: retry hints, revealed answer, results, heatmap, coach, teacher
// panel, the built array and pattern claims.

const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const appCss = fs.readFileSync(path.join(cssDirectory, fs.readdirSync(cssDirectory).find((f) => /^main\.[a-z0-9]+\.css$/i.test(f))), 'utf8');
const FILE = process.env.MULTTABLE_DEEP_SRC || 'stem_lab/stem_tool_multtable.js';

const scores = { '7x8': { attempts: 3, correct: 1 }, '2x2': { attempts: 3, correct: 3 }, '6x7': { attempts: 3, correct: 2 } };
const CASES = [
  { name: 'retry with hint picture', lab: {}, ctx: { multTableChallenge: { a: 7, b: 8, mode: 'mult', source: 'tool', id: 'x' }, multTableFeedback: { correct: false, retry: true, tries: 2, forKey: 'x', lastWrong: 15, mistake: { kind: 'added', given: 15, a: 7, b: 8 } } } },
  { name: 'revealed division with worked example', lab: { _multInputDisabled: true }, ctx: { multTableChallenge: { a: 7, b: 8, mode: 'div', divisor: 7, source: 'tool', id: 'y' }, multTableFeedback: { correct: false, resolved: true, revealed: true, tries: 3, forKey: 'y', lastWrong: 9, mistake: { kind: 'offByOne', given: 9, d: 7, p: 56 } } } },
  { name: 'results, badges, coach and heatmap', lab: { _multTimer: { active: false, score: 7, total: 10, timeLeft: 12, ended: true, endedEarly: true, missed: [{ a: 7, b: 8, answer: 56, mode: 'mult' }] }, _multExt: { showBadges: true, showCoach: true, showHeatmap: true, badges: { firstCorrect: true }, factScores: scores } } },
  { name: 'speed run and practice set', lab: { _multTimer: { active: true, paused: true, score: 1, total: 2, timeLeft: 90, endTime: 0, missed: [], drill: { active: true, items: [{ a: 7, b: 8, mode: 'mult' }], cleared: {} } } } },
  { name: 'teacher panel', lab: { _multExt: { visit: null } }, ctx: { isTeacherMode: true } },
  { name: 'built array', lab: { _multExt: { mtTab: 'visual', visualA: 7, visualB: 8, visualPred: { key: '7x8', built: true, committed: 54 } } } },
  { name: 'pattern and claims', lab: { _multExt: { mtTab: 'patterns', patternId: 'nines' } } },
  { name: 'early band, dark theme', lab: {}, ctx: { gradeLevel: '1st Grade', isDark: true } },
];

describe('Multiplication Table deep states in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const testCase of CASES) {
    it(testCase.name + ' passes WCAG A/AA and 320px reflow', async () => {
      resetStemLab();
      document.head.querySelectorAll('style').forEach((s) => s.remove());
      loadTool(FILE, 'multtable');
      const rendered = prepareStemBrowserRender(renderTool('multtable', {}, Object.assign({ labToolData: testCase.lab }, testCase.ctx || {})));
      expect(rendered.html.length).toBeGreaterThan(500);
      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + appCss +
        '</style></head><body><main id="tool-root"><div data-stem-tool-shell="multtable" data-stem-basic-math="true" style="background:#fff;color:#0f172a">' + rendered.html + '</div></main></body></html>', { waitUntil: 'domcontentloaded' });
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: axeSource });
      await page.evaluate(() => { for (const a of document.getAnimations()) a.cancel(); document.querySelectorAll('details').forEach((d) => { d.open = true; }); });
      const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
      const violations = audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 4).map((n) => ({ html: n.html.slice(0, 160), data: n.any && n.any[0] && n.any[0].data ? { fg: n.any[0].data.fgColor, bg: n.any[0].data.bgColor, ratio: n.any[0].data.contrastRatio } : undefined })) }));
      const reflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      await page.close();
      expect.soft(violations, JSON.stringify(violations, null, 2)).toEqual([]);
      expect.soft(reflow.sw).toBeLessThanOrEqual(reflow.cw);
    }, 30000);
  }
});
