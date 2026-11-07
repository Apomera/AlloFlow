// Arithmetic Strategy Studio deep pass (2026-11-03): the new states (estimate
// panels, named-error and reveal feedback, generated Error Detective cases,
// worked examples, algorithm bridges, teacher panel) pass axe WCAG A/AA and
// reflow at 320 px in light, dark and high-contrast themes.
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

const missLog = [
  { src: 'practice', id: 's1', op: 'subtract', a: 73, b: 28, given: '55', kind: 'smaller_from_larger', revealed: false },
  { src: 'errors', id: 'e1', op: 'add', prompt: 'A learner says 58 + 27 = 715.', given: 'place', kind: 'diagnosis', revealed: true },
];
const STATES = [
  ['learn multiply bridge', { tab: 'learn', operation: 'multiply', a: 345, b: 24, showSteps: true }],
  ['learn subtract invalid', { tab: 'learn', operation: 'subtract', a: 9, b: 27 }],
  ['learn divide prediction', { tab: 'learn', operation: 'divide', a: 157, b: 12, learnPrediction: '12', learnPredictionRemainder: '13', learnPredictionSig: 'divide:157:12', learnPredictionResult: 'try', learnPredictionKind: 'remainder_big' }],
  ['practice named error', { tab: 'practice', operation: 'subtract', level: 1, practiceProblemId: 's1', estimateInput: '40', estimateLocked: true, estimateStatus: 'ok', answerInput: '55', feedback: 'try', practiceTry: 1, practiceErrorKind: 'smaller_from_larger' }],
  ['practice revealed', { tab: 'practice', operation: 'subtract', level: 1, practiceProblemId: 's1', estimateInput: '40', estimateLocked: true, estimateStatus: 'ok', answerInput: '35', feedback: 'revealed', practiceTry: 2, practiceRevealedIds: { s1: true } }],
  ['practice estimate shown', { tab: 'practice', operation: 'multiply', genSkill: 'mulMulti', genSeed: 3, estimateInput: '99999', estimateTries: 2, estimateStatus: 'shown', estimateLocked: true }],
  ['practice generated divide', { tab: 'practice', operation: 'divide', genBand: 'g4' }],
  ['errors generated revealed', { tab: 'errors', errorIndex: 7, errorFeedback: 'revealed', errorTries: 2, errorTriesFor: 'ge-g5-7', errorChoice: 'wrong_operation' }],
  ['apply plan', { tab: 'apply', wordProblemId: 'w4', showWordPlan: true, wordOperation: 'divide' }],
  ['teacher panel', { tab: 'practice', operation: 'add', missLog, teacher: { ops: ['add', 'subtract'], band: 'g3', lockBand: true } }],
];
const THEMES = [['light', {}], ['dark', { isDark: true }], ['contrast', { isContrast: true }]];

describe('Arithmetic Strategy Studio deep states in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const [name, state] of STATES) {
    for (const [themeName, theme] of THEMES) {
      it(`${name} (${themeName}) passes WCAG A/AA and 320px reflow`, async () => {
        resetStemLab();
        document.head.querySelectorAll('style').forEach((style) => style.remove());
        loadTool('stem_lab/stem_tool_arithmetic.js', 'arithmeticStudio');
        const overrides = Object.assign({ isTeacherMode: name === 'teacher panel' }, theme);
        const rendered = prepareStemBrowserRender(renderTool('arithmeticStudio', { _arithmeticStudio: state }, overrides));
        const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + cssSource + '</style></head><body><main id="tool-root">' + rendered.html + '</main></body></html>', { waitUntil: 'domcontentloaded' });
        for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
        await page.evaluate(() => { document.querySelectorAll('details').forEach((el) => { el.open = true; }); });
        await page.addScriptTag({ content: axeSource });
        const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
        const reflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
        const violations = audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 3).map((n) => ({ target: n.target, data: n.any && n.any[0] && n.any[0].data })) }));
        await page.close();
        expect(violations).toEqual([]);
        expect(reflow.scrollWidth).toBeLessThanOrEqual(reflow.clientWidth);
      }, 20000);
    }
  }
});
