// Arithmetic Strategy Studio engagement build (2026-11-04): the student-made trades, the
// "See it with disks" hint, the K-2 ten frame and the compact path pass axe WCAG A/AA,
// reflow at 320 px, and keep 44 px move targets in light, dark and high-contrast themes.
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
  ['compact path g4', {}, { gradeBand: 'g35', gradeLevel: '4th Grade' }],
  ['learn add mid-walk', { tab: 'learn', operation: 'add', a: 58, b: 67, exchangeSignature: 'add:58:67', exchangeStep: 1 }, {}],
  ['learn subtract take-away', { tab: 'learn', operation: 'subtract', a: 102, b: 38, exchangeSignature: 'subtract:102:38', exchangeStep: 2 }, {}],
  ['practice see it with disks', { tab: 'practice', operation: 'add', level: 1, practiceSource: 'set', practiceProblemId: 'a1', practiceIndex: 0, estimateLocked: true, estimateStatus: 'ok', estimateInput: '60', answerInput: '52', feedback: 'try', practiceTry: 1, practiceErrorKind: 'KIND', practiceDisksFor: 'a1', practiceDiskSig: 'add:27:35', practiceDiskStep: 1 }, {}],
  ['k2 ten frame filling', { tab: 'mental', mmMode: 'talk', genBand: 'k2', ntIndex: 0, tfFor: 'nt-k2-0', tfMoved: 1 }, K2],
  ['k2 ten frame full', { tab: 'mental', mmMode: 'talk', genBand: 'k2', ntIndex: 0, tfFor: 'nt-k2-0', tfMoved: 9 }, K2],
];
const THEMES = [['light', {}], ['dark', { isDark: true }], ['contrast', { isContrast: true }]];

describe('Arithmetic engagement states in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const [name, baseState, ctx] of STATES) {
    for (const [themeName, theme] of THEMES) {
      it(`${name} (${themeName}) passes WCAG A/AA, 320px reflow and target sizes`, async () => {
        resetStemLab();
        document.head.querySelectorAll('style').forEach((style) => style.remove());
        loadTool('stem_lab/stem_tool_arithmetic.js', 'arithmeticStudio');
        const P = window.ArithmeticStrategyPure;
        const state = Object.assign({}, baseState);
        if (state.practiceErrorKind === 'KIND') state.practiceErrorKind = P.diagnoseAnswer('add', 27, 35, 52);
        const rendered = prepareStemBrowserRender(renderTool('arithmeticStudio', { _arithmeticStudio: state }, Object.assign({}, ctx, theme)));
        if (name.includes('walk') || name.includes('take-away') || name.includes('disks')) expect(rendered.html).toContain('data-walk-next');
        if (name.includes('disks')) expect(rendered.html).toContain('data-see-disks');
        if (name.includes('ten frame')) expect(rendered.html).toContain('data-ten-frame=');
        const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const wrap = themeName === 'dark' ? ' class="theme-dark"' : themeName === 'contrast' ? ' class="theme-contrast"' : '';
        await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + cssSource + '</style></head><body' + wrap + '><main id="tool-root"><div data-stem-tool-shell="arithmeticStudio">' + rendered.html + '</div></main></body></html>', { waitUntil: 'domcontentloaded' });
        for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
        await page.addScriptTag({ content: axeSource });
        const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
        const reflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
        const small = await page.evaluate(() => [...document.querySelectorAll('#tool-root button')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.height < 24 || r.width < 24); }).map((b) => b.textContent));
        // Primary move controls are 44 px.
        const moves = await page.evaluate(() => [...document.querySelectorAll('[data-walk-next], [data-ten-frame-counter], [data-path-go], [data-see-disks]')].map((b) => { const r = b.getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); }));
        const violations = audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 3).map((n) => ({ target: n.target, data: n.any && n.any[0] && n.any[0].data })) }));
        await page.close();
        expect(violations).toEqual([]);
        expect(reflow.scrollWidth).toBeLessThanOrEqual(reflow.clientWidth);
        expect(small).toEqual([]);
        expect(moves.every((px) => px >= 44), JSON.stringify(moves)).toBe(true);
      }, 20000);
    }
  }
});

// Follow-up (2026-11-04): on the Learn landing at 1280 x 800 the first trade is on the first
// screen, with the prediction card beside the disks; at 390 the card wraps below them.
// ARITH_ENGAGE_FILE points this block at an older copy to prove it fails there.
describe('Learn first screen layout in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);
  const FILE = process.env.ARITH_ENGAGE_FILE || 'stem_lab/stem_tool_arithmetic.js';

  async function layout(width, height) {
    resetStemLab();
    document.head.querySelectorAll('style').forEach((style) => style.remove());
    loadTool(FILE, 'arithmeticStudio');
    const rendered = prepareStemBrowserRender(renderTool('arithmeticStudio', { _arithmeticStudio: {} }, { gradeBand: 'g35', gradeLevel: '4th Grade' }));
    const page = await browser.newPage({ viewport: { width, height } });
    await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + cssSource + ' body{margin:0} #wrap{padding:12px}</style></head><body><main id="wrap"><div data-stem-tool-shell="arithmeticStudio">' + rendered.html + '</div></main></body></html>', { waitUntil: 'domcontentloaded' });
    for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
    const box = await page.evaluate(() => {
      const r = (sel) => { const n = document.querySelector(sel); if (!n) return null; const b = n.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) }; };
      return { move: r('[data-walk-next]'), model: r('[data-place-value-model]'), predict: r('[data-learn-predict]'), scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth };
    });
    await page.close();
    return box;
  }

  it('1280 x 800: the Trade button is inside the first screen and the prediction card sits beside the disks', async () => {
    const box = await layout(1280, 800);
    expect(box.move, 'Trade button').toBeTruthy();
    expect(box.move.bottom, JSON.stringify(box)).toBeLessThanOrEqual(800);
    expect(box.predict.left, JSON.stringify(box)).toBeGreaterThanOrEqual(box.model.right);
    expect(box.predict.top, JSON.stringify(box)).toBeLessThan(box.model.bottom);
  }, 20000);

  it('390 x 844: the prediction card wraps directly below the disks, with no sideways scroll', async () => {
    const box = await layout(390, 844);
    expect(box.predict.top, JSON.stringify(box)).toBeGreaterThanOrEqual(box.model.bottom);
    expect(box.move.top).toBeLessThan(box.predict.top);
    expect(box.scrollW).toBeLessThanOrEqual(box.clientW);
  }, 20000);
});
