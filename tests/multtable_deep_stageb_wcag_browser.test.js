import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Multiplication Table stage B (2026-11-03): axe WCAG A/AA and 320px reflow in
// a real browser for the new tabs: factor rectangles, number detective, sieve,
// word problems, fact families and the fluency game.

const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const appCss = fs.readFileSync(path.join(cssDirectory, fs.readdirSync(cssDirectory).find((f) => /^main\.[a-z0-9]+\.css$/i.test(f))), 'utf8');
const FILE = process.env.MULTTABLE_DEEP_SRC || 'stem_lab/stem_tool_multtable.js';

const share = { type: 'groups_share', a: 4, b: 6, p: 24, vals: { p: 24, a: 4 }, steps: [{ l: 24, op: 'div', r: 4, v: 6 }], ops: ['div'], answer: 6, variant: 1, id: 'w', options: [['mul'], ['div'], ['add'], ['sub']] };
const two = { type: 'two_add_div', a: 4, b: 6, p: 24, vals: { x: 20, y: 4, a: 4 }, steps: [{ l: 20, op: 'add', r: 4, v: 24 }, { l: 24, op: 'div', r: 4, v: 6 }], ops: ['add', 'div'], answer: 6, variant: 0, id: 'w2', options: [['add', 'div'], ['add', 'mul'], ['mul', 'div'], ['add']] };
const fam = { a: 6, b: 8, p: 48, id: 'fam:6x8', cards: [{ id: 'm1', l: 6, op: 'mul', r: 8, v: 48, ok: true }, { id: 'x1', l: 6, op: 'div', r: 48, v: 8, ok: false, kind: 'divReverse' }, { id: 'm2', l: 8, op: 'mul', r: 6, v: 48, ok: true }, { id: 'd1', l: 48, op: 'div', r: 6, v: 8, ok: true }, { id: 'x2', l: 6, op: 'add', r: 8, v: 48, ok: false, kind: 'addFamily' }, { id: 'd2', l: 48, op: 'div', r: 8, v: 6, ok: true }] };
const flu = (extra) => ({ round: [{ a: 7, b: 8, mode: 'mult' }, { a: 6, b: 9, mode: 'div', divisor: 6 }], i: 0, results: [], tries: 0, phase: 'play', resolved: false, comeBack: [], ...extra });
const CASES = [
  { name: 'factor rectangles and detective', marker: 'data-mt-det-feedback', lab: { _multExt: { mtTab: 'factors', fx: { n: 24, pred: 'composite', found: [[1, 24], [2, 12], [4, 6]], tests: [{ w: 5, ok: false, q: 4, r: 4 }], checks: 1 }, det: { item: { type: 'prime', n: 21, id: 'p' }, tries: 2, wrong: ['prime'], resolved: true, ok: true, mistake: { kind: 'oddPrime', n: 21, s: 4 } } } } },
  { name: 'sieve mid-cross (100)', marker: 'data-sv="100"', lab: { _multExt: { mtTab: 'factors', sieve: { n: 100, crossed: { 1: true, 4: true }, primes: { 2: true }, phase: 'cross', p: 2, hits: 1, need: 49, done: false }, sieveFb: { kind: 'crossed', n: 4, p: 2, k: 2 } } } },
  { name: 'word problem, op mistake', marker: 'data-mt-wp-mistake', lab: { _multExt: { mtTab: 'words', wp: { item: share, phase: 'op', opTries: 1, opWrong: ['mul'], opMistake: { kind: 'multForDiv' }, step: 0, ansTries: 0, solved: [] } } } },
  { name: 'word problem, hint picture', marker: 'data-mt-wp-picture', lab: { _multExt: { mtTab: 'words', wp: { item: share, phase: 'solve', opTries: 1, opWrong: [], step: 0, ansTries: 2, lastWrong: 24, ansMistake: { kind: 'product', given: 24, d: 4, p: 24 }, solved: [] } } } },
  { name: 'two-step done', marker: 'data-mt-wp-done', lab: { _multExt: { mtTab: 'words', wp: { item: two, phase: 'done', opTries: 1, opWrong: [], step: 1, ansTries: 0, solved: [{ ok: true }, { ok: true }] } } } },
  { name: 'fact family', marker: 'data-mt-fam-card', lab: { _multExt: { mtTab: 'visual', fam: { fam, picked: { m1: true, x1: true }, tries: 1, resolved: false, diag: { wrong: ['divReverse'], wrongCards: [fam.cards[1]], missing: 3, found: 1 } } } } },
  { name: 'fluency retry with clock', marker: 'role="timer"', lab: { _multExt: { mtTab: 'fluency', teacher: { fluencyTimer: 180 }, flu: flu({ tries: 1, lastWrong: 15, mistake: { kind: 'added', given: 15, a: 7, b: 8 }, timer: { active: true, paused: true, endTime: 0, timeLeft: 100, limit: 180 } }) } } },
  { name: 'fluency done, dark', marker: 'data-mt-flu-done', lab: { _multExt: { mtTab: 'fluency', flu: flu({ phase: 'done', results: [{ a: 7, b: 8, mode: 'mult', first: false, ok: false }] }) } }, ctx: { isDark: true } },
];

describe('Multiplication Table stage-B states in a real browser', () => {
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
      expect(rendered.html.includes(testCase.marker), testCase.marker).toBe(true);
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
