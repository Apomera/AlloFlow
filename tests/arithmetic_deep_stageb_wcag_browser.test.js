// Arithmetic Strategy Studio stage B (2026-11-03): the mental-math, bar-model
// and decimal states pass axe WCAG A/AA and reflow at 320 px in light, dark
// and high-contrast themes.
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

const STATES = [
  ['explore compensation', { tab: 'mental', mmMode: 'explore', mmStrategy: 'compensation' }],
  ['explore constant difference', { tab: 'mental', mmMode: 'explore', mmStrategy: 'constantDifference', mmRevealSig: 'constantDifference:subtract:73:28' }],
  ['explore halve and double', { tab: 'mental', mmMode: 'explore', mmStrategy: 'halveDouble' }],
  ['number talk solved', { tab: 'mental', mmMode: 'talk', genBand: 'g4', ntIndex: 0, ntFor: 'nt-g4-0', ntPick: 'breakApart', ntAnswer: '916', ntSolved: { 'nt-g4-0': true }, ntFeedback: 'correct' }],
  ['efficient revealed', { tab: 'mental', mmMode: 'efficient', genBand: 'g4', efIndex: 0, efFor: 'ef-g4-0', efFeedback: 'revealed', efTry: 2, efRevealed: { 'ef-g4-0': true } }],
  ['bar keyword trap', { tab: 'bars', genBand: 'g4', barIndex: 0, barFor: 'bar-g4-0', barModel: { model: 'compare', values: { larger: '7704', smaller: '7323', difference: '?' } }, barModelLocked: true, barModelFeedback: 'ok', barOp: 'add', barAnswer: '15027', barTry: 2, barFeedback: 'try', barKind: 'keyword_more' }],
  ['bar equal groups preview', { tab: 'bars', genBand: 'g4', barIndex: 6, barFor: 'bar-g4-6', barModel: { model: 'equalGroups', values: { groups: '?', size: '5', total: '340' } }, barModelTry: 2, barModelFeedback: 'try', barModelKind: 'bar_groups_size' }],
  ['decimal place chart', { tab: 'decimals', genBand: 'g5', decMode: 'addsub', decIndex: 0, decFor: 'dc-addsub-g5-0', decFeedback: 'try', decTry: 2, decKind: 'decimal_align', decAnswer: '14.37' }],
  ['decimal walk', { tab: 'decimals', genBand: 'g5', decMode: 'mulwhole', decIndex: 0, decFor: 'dc-mulwhole-g5-0', decFeedback: 'revealed', decStep: 1, decRevealed: { 'dc-mulwhole-g5-0': true } }],
  ['teacher decimals', { tab: 'decimals', teacher: { decMode: 'addsub', twoStep: false }, missLog: [{ src: 'efficient', id: 'ef-g4-0', op: 'add', a: 739, b: 699, given: 'nearDoubles', kind: 'strategy_choice', revealed: false }, { src: 'bar', id: 'bar-g4-0', op: 'subtract', prompt: 'Story', given: '+ 15027', kind: 'keyword_more', revealed: false }] }],
];
const THEMES = [['light', {}], ['dark', { isDark: true }], ['contrast', { isContrast: true }]];

describe('Arithmetic Strategy Studio stage-B states in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const [name, state] of STATES) {
    for (const [themeName, theme] of THEMES) {
      it(`${name} (${themeName}) passes WCAG A/AA and 320px reflow`, async () => {
        resetStemLab();
        document.head.querySelectorAll('style').forEach((style) => style.remove());
        loadTool('stem_lab/stem_tool_arithmetic.js', 'arithmeticStudio');
        const overrides = Object.assign({ isTeacherMode: name.startsWith('teacher') }, theme);
        const rendered = prepareStemBrowserRender(renderTool('arithmeticStudio', { _arithmeticStudio: state }, overrides));
        expect(rendered.html).toContain('id="arithmetic-studio-tab-' + state.tab + '" type="button" role="tab" aria-selected="true"');
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
