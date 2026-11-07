// Arithmetic Strategy Studio stage C (2026-11-03): the "Start here" path,
// ruled-out choices and on-demand reveals pass axe WCAG A/AA and reflow at
// 320 px in light, dark and high-contrast themes.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
const cssSource = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');

const K2 = { gradeBand: 'k2', gradeLevel: '1st Grade' };
const STATES = [
  ['path k2 with ticks', { tab: 'learn', genSolved: { 'add20-1': true, 'add20-2': true, 'add20-3': true, 'sub20-1': true } }, K2],
  ['path g5 teacher locks', { tab: 'decimals', teacher: { ops: ['add', 'subtract'], decMode: 'addsub' } }, {}],
  ['practice two tries', { tab: 'practice', operation: 'subtract', level: 1, practiceSource: 'set', practiceProblemId: 's1', practiceIndex: 0, estimateLocked: true, estimateStatus: 'ok', estimateInput: '40', answerInput: '35', feedback: 'try', practiceTry: 2, practiceErrorKind: 'smaller_from_larger', showPracticeHint: true }, {}],
  ['errors ruled out', { tab: 'errors', errorIndex: 0, errorTriesFor: 'e1', errorTries: 2, errorWrong: ['place', 'operation'], errorFeedback: 'try', errorChoice: 'operation' }, {}],
  ['errors eliminated', { tab: 'errors', errorIndex: 0, errorTriesFor: 'e1', errorTries: 2, errorWrong: ['place', 'operation'], errorFeedback: 'eliminated', errorChoice: 'regroup', errorRevealed: { e1: true } }, {}],
  ['word revealed', { tab: 'apply', wordProblemId: 'w1', wordOperation: 'add', wordAnswer: '400', wordTry: 2, wordTryFor: 'w1', wordFeedback: 'revealed', wordRevealed: { w1: true } }, {}],
  ['number talk focus', { tab: 'mental', mmMode: 'talk', ntFocus: 'makeTen', ntIndex: 0 }, K2],
];
const THEMES = [['light', {}], ['dark', { isDark: true }], ['contrast', { isContrast: true }]];

describe('Arithmetic Strategy Studio stage-C states in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const [name, state, ctx] of STATES) {
    for (const [themeName, theme] of THEMES) {
      it(`${name} (${themeName}) passes WCAG A/AA and 320px reflow`, async () => {
        resetStemLab();
        document.head.querySelectorAll('style').forEach((style) => style.remove());
        loadTool('stem_lab/stem_tool_arithmetic.js', 'arithmeticStudio');
        const overrides = Object.assign({ isTeacherMode: name.includes('teacher') }, ctx, theme);
        const rendered = prepareStemBrowserRender(renderTool('arithmeticStudio', { _arithmeticStudio: state }, overrides));
        expect(rendered.html).toContain('data-arithmetic-path');
        const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + cssSource + '</style></head><body><main id="tool-root">' + rendered.html + '</main></body></html>', { waitUntil: 'domcontentloaded' });
        for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
        await page.addScriptTag({ content: axeSource });
        const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
        const reflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
        const small = await page.evaluate(() => [...document.querySelectorAll('#tool-root button')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.height < 24 || r.width < 24); }).map((b) => b.textContent));
        const violations = audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 3).map((n) => ({ target: n.target, data: n.any && n.any[0] && n.any[0].data })) }));
        await page.close();
        expect(violations).toEqual([]);
        expect(reflow.scrollWidth).toBeLessThanOrEqual(reflow.clientWidth);
        expect(small).toEqual([]);
      }, 20000);
    }
  }
});
