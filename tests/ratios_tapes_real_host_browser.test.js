// Ratio Lab's tapes in the REAL host wrapper at 320 px (2026-11-05): a bare mount had 244 px to draw in, the modal leaves
// 188 (light) and 148 (dark), so last round's "9 px" read 7.95 and 6.26. Also the problem line at 1280: its 360-unit drawing
// filled a 1,170 px box, 3.25x, 715 px tall with 55 px digits. Sizes come from the browser.
// RATIOS_DEEP_FILE points at another copy (fail-first checks).
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const FILE = process.env.RATIOS_DEEP_FILE || 'stem_lab/stem_tool_ratios.js';
const toolSource = fs.readFileSync(path.resolve(root, FILE), 'utf8');
const MOD = path.join(root, 'desktop/web-app/node_modules');
const reactUmd = fs.readFileSync(path.join(MOD, 'react/umd/react.production.min.js'), 'utf8');
const reactDomUmd = fs.readFileSync(path.join(MOD, 'react-dom/umd/react-dom.production.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const appCss = fs.readFileSync(path.join(cssDirectory, fs.readdirSync(cssDirectory).find((f) => /^main\.[a-z0-9]+\.css$/i.test(f))), 'utf8');
const moduleSrc = fs.readFileSync(path.join(root, 'stem_lab/stem_lab_module.js'), 'utf8');
const a0 = moduleSrc.indexOf('window.AlloModules.StemLab = function StemLabModal(props) {');
const setters = [...new Set([...moduleSrc.slice(a0, moduleSrc.indexOf('} = props;', a0)).matchAll(/^\s+(set\w+),?$/gm)].map((m) => m[1]))];

const MIX = { labView: 'missions', showGrade6Missions: true, missionTab: 'mixture' };
const TAPES = [
  ['the explorer tape', { mode: 'ratioTable', ratioA: 12, ratioB: 18, ratioFactor: 2 }, '[data-ratio-tape="ratio-tape-explorer"] svg', '7th Grade'],
  ['the explorer tape, 24 units a bar', { mode: 'ratioTable', ratioA: 24, ratioB: 23, ratioFactor: 1 }, '[data-ratio-tape="ratio-tape-explorer"] svg', '7th Grade'],
  ['the tape a student builds', {}, '[data-ratio-tape-builder] [data-ratio-tape] svg', '5th Grade'],
  ['the mixture tapes', { ...MIX, missions: { mixture: { seed: 5 } } }, '[data-ratio-mix-tapes] svg', '7th Grade'],
  ['the mixture shares', { ...MIX, missions: { mixture: { seed: 5, solved: { compare: true } } } }, '[data-ratio-mix-tapes] svg', '7th Grade'],
  ['the percent tape', { mode: 'percent' }, '[data-percent-tape] svg', '7th Grade'],
];

let browser;
async function openHost(state, theme, width, height, grade) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 640, isMobile: width < 640, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><main class="theme-' + theme + '" style="display:none"></main><div id="app"></div></body></html>');
  await page.addStyleTag({ content: appCss });
  await page.addScriptTag({ content: reactUmd });
  await page.addScriptTag({ content: reactDomUmd });
  await page.evaluate(() => { window.__alloConfigureTrustedScript = (s, u) => { s.src = u; return s; }; });
  await page.addScriptTag({ path: path.join(root, 'app_styles_module.js') });
  await page.addScriptTag({ path: path.join(root, 'stem_lab/stem_lab_module.js') });
  await page.evaluate(() => { window.__alloEnsureStemPluginLoaded = () => true; window.__alloGetStemPluginState = () => ({ status: 'loaded' }); });
  await page.addScriptTag({ content: toolSource });
  await page.evaluate(([s, th, names, gr]) => {
    const e = React.createElement, noop = () => {};
    const Icon = () => e('svg', { width: 16, height: 16, 'aria-hidden': 'true' });
    const S = {}; names.forEach((n) => { S[n] = noop; });
    function Host() {
      const tool = React.useState('ratioLab'), tab = React.useState('explore'), lab = React.useState({ _ratioLab: s }), snap = React.useState([]);
      const props = Object.assign({}, S, { ArrowLeft: Icon, Calculator: Icon, GripVertical: Icon, Sparkles: Icon, X: Icon, addToast: noop, t: () => undefined, theme: th, showStemLab: true, stemLabTab: tab[0], setStemLabTab: tab[1], stemLabTool: tool[0], setStemLabTool: tool[1], labToolData: lab[0], setLabToolData: lab[1], toolSnapshots: snap[0], setToolSnapshots: snap[1], gradeLevel: gr, isTeacherMode: false, isIndependentMode: false, isParentMode: false, inputText: '', sourceTopic: '' });
      return e('div', { className: 'min-h-screen flex flex-col theme-' + th }, e(window.AlloModules.AppStyles.AppStyles, {}), e(window.AlloModules.StemLab, props));
    }
    ReactDOM.createRoot(document.getElementById('app')).render(e(Host));
  }, [state, theme, setters, grade]);
  await page.waitForTimeout(1800);
  return { context, page };
}
// A closed <details> keeps laying out but its observers never fire, so open what a student would open, and let it settle.
const openFolds = async (page, sel) => {
  const n = await page.evaluate((s) => { const svg = document.querySelector(s); let k = 0; for (let e = svg && svg.parentElement; e; e = e.parentElement) if (e.tagName === 'DETAILS' && !e.open) { e.open = true; k++; } return k; }, sel);
  await page.waitForTimeout(n ? 500 : 150);
  return n;
};
const measure = async (page, sel) => { await openFolds(page, sel); return page.evaluate((s) => {
  const svg = document.querySelector(s);
  if (!svg) return { missing: true };
  const scale = svg.getScreenCTM().a, box = svg.getBoundingClientRect();
  const nodes = [...svg.querySelectorAll('text')].filter((t) => t.textContent.trim());
  const list = nodes.map((t) => {
    const r = t.getBoundingClientRect();
    return { s: t.textContent, label: t.hasAttribute('data-tape-label'), px: parseFloat(getComputedStyle(t).fontSize) * scale, l: r.left, r: r.right, t: r.top, b: r.bottom };
  });
  const overlaps = [];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5) overlaps.push(a.s + ' / ' + b.s);
  }
  const parent = svg.parentElement;
  return {
    width: Math.round(box.width), height: Math.round(box.height), rects: svg.querySelectorAll('rect').length,
    smallest: list.length ? +Math.min(...list.map((x) => x.px)).toFixed(2) : 0, largest: list.length ? +Math.max(...list.map((x) => x.px)).toFixed(2) : 0,
    values: list.filter((x) => !x.label).map((x) => x.s), overlaps,
    outside: list.filter((x) => x.l < box.left - 0.5 || x.r > box.right + 0.5).map((x) => x.s),
    sideways: parent.scrollWidth > parent.clientWidth + 1, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
    boxWidth: Math.round(parent.getBoundingClientRect().width), visible: box.width > 0 && !!svg.checkVisibility && svg.checkVisibility(),
  };
}, sel); };

beforeAll(async () => { browser = await chromium.launch(); }, 60000);
afterAll(async () => { if (browser) await browser.close(); }, 60000);

describe('tapes in the real host at 320 px', () => {
  for (const theme of ['default', 'dark', 'contrast']) {
    for (const [name, state, sel, grade] of TAPES) {
      it(theme + ', ' + name + ': 12 px or more, nothing overlaps, nothing is cut off', async () => {
        const { context, page } = await openHost(state, theme, 320, 640, grade);
        const m = await measure(page, sel);
        console.log('ratios tape ' + theme + ' ' + name + ': ' + JSON.stringify({ w: m.width, box: m.boxWidth, h: m.height, smallest: m.smallest, overlaps: m.overlaps, outside: m.outside, sideways: m.sideways }));
        expect(m.missing).toBeUndefined();
        expect(m.visible, 'measured while on screen, not inside a closed fold').toBe(true);
        expect(Math.abs(m.width - m.boxWidth), 'the drawing fills its box once it is open').toBeLessThanOrEqual(30);
        expect(m.smallest).toBeGreaterThanOrEqual(12);
        expect(m.overlaps).toEqual([]);
        expect(m.outside).toEqual([]);
        expect(m.sideways).toBe(false);
        expect(m.sw).toBeLessThanOrEqual(m.cw);
        await context.close();
      }, 120000);
    }
  }

  it('the tape a student builds shows no value on a phone that the wide tape keeps hidden', async () => {
    const [name, state, sel, grade] = TAPES[2];
    const wide = await openHost(state, 'default', 1280, 800, grade);
    const w = await measure(wide.page, sel);
    await wide.context.close();
    const phone = await openHost(state, 'default', 320, 640, grade);
    const p = await measure(phone.page, sel);
    await phone.context.close();
    expect(w.values.length, name).toBeGreaterThan(0);
    expect(w.values).toContain('?');
    expect(p.values).toContain('?');
    for (const v of p.values) expect(w.values, v).toContain(v);
  }, 180000);

  it('a bar still has one rect per unit: the drawing tells the same story', async () => {
    const [, state, sel, grade] = TAPES[1];
    const wide = await openHost(state, 'default', 1280, 800, grade);
    const w = await measure(wide.page, sel);
    await wide.context.close();
    const phone = await openHost(state, 'default', 320, 640, grade);
    const p = await measure(phone.page, sel);
    await phone.context.close();
    expect(p.rects).toBe(w.rects);
  }, 180000);
});

describe('the problem line at 1280 px', () => {
  const STATE = { mode: 'numberLine', modelBuild: { 'line-tickets': { rows: [['5', '15'], ['1', '3']], find: '8', touched: true } } };
  it('is drawn at a sensible size, and stays legible', async () => {
    const { context, page } = await openHost(STATE, 'default', 1280, 800, '7th Grade');
    const m = await measure(page, '[data-linked-ratio-line]');
    console.log('ratios line 1280: ' + JSON.stringify({ w: m.width, h: m.height, smallest: m.smallest, largest: m.largest }));
    expect(m.height).toBeLessThanOrEqual(400);
    expect(m.largest).toBeLessThanOrEqual(30);
    expect(m.smallest).toBeGreaterThanOrEqual(12);
    expect(m.overlaps).toEqual([]);
    expect(m.sideways).toBe(false);
    await context.close();
  }, 120000);
  it('the tape beside it keeps its size', async () => {
    const { context, page } = await openHost(TAPES[0][1], 'default', 1280, 800, '7th Grade');
    const vb = await page.locator(TAPES[0][2]).getAttribute('viewBox');
    expect(vb.startsWith('0 0 500 ')).toBe(true);
    await context.close();
  }, 120000);
});
