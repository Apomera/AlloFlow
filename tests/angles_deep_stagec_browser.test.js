// Angle Explorer stage C (2026-11-03) in a real browser (Chromium), inside the
// host's real theme wrappers: light; dark (the hub's dark desk with the tool on
// its white data-stem-tool-surface card); high contrast (the hub's black shell
// plus its contrast remap stylesheet, read from stem_lab_module.js).
// 1. Every SVG text label on every diagram meets 4.5:1 (3:1 when large)
//    against what is really painted under it, found with elementsFromPoint.
// 2. Every drawn line, ray and outline on a diagram panel meets 3:1.
// 3. axe WCAG 2.2 A/AA on the new surfaces (learning path, reveal row, AI
//    nudge, classify second try) in all three themes, plus 320px reflow.
// Same machinery as tests/angles_deep_stageb_browser.test.js.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.ANGLES_DEEP_SRC || 'stem_lab/stem_tool_angles.js';
const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
const appCss = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');

// The hub's high-contrast remap and its always-on shell rule, taken from the host source.
const mod = fs.readFileSync(path.join(root, 'stem_lab/stem_lab_module.js'), 'utf8');
function hostContrastCss() {
  const at = mod.indexOf('} else if (isContrast) {');
  const a = mod.indexOf('[', mod.indexOf('s.textContent = [', at));
  const end = mod.indexOf("].join('\\n');", a);
  // eslint-disable-next-line no-new-func
  const rules = new Function('return ' + mod.slice(a, end + 1))();
  const s0 = mod.indexOf('var DARK_TEXT_CLASSES');
  const s1 = mod.indexOf("s.textContent = inheritRule + '\\n' + lightBgRule;", s0);
  // eslint-disable-next-line no-new-func
  const shell = new Function('var s = {};\n' + mod.slice(s0, s1) + "s.textContent = inheritRule + '\\n' + lightBgRule; return s.textContent;")();
  expect(rules.length, 'contrast remap rules read from the host').toBeGreaterThan(10);
  expect(shell).toMatch(/color: inherit/);
  return rules.join('\n') + '\n' + shell;
}
const CONTRAST_CSS = hostContrastCss();

function wrap(theme, html) {
  if (theme === 'dark') {
    return '<div data-stem-lab class="theme-dark"><div data-stem-tool-shell="protractor" data-stem-theme="dark" style="background:#0f172a;color:#e2e8f0;padding:10px">' +
      '<div data-stem-tool-surface="protractor" style="background:#ffffff;color:#0f172a;color-scheme:light;padding:10px">' + html + '</div></div></div>';
  }
  if (theme === 'contrast') {
    return '<div data-stem-lab class="theme-contrast"><div data-stem-tool-shell="protractor" data-stem-theme="contrast" style="background:#000000;color:#ffffff">' + html + '</div></div>';
  }
  return '<div data-stem-lab><div data-stem-tool-shell="protractor" data-stem-theme="light" style="background:#ffffff;color:#0f172a">' + html + '</div></div>';
}
const OVERRIDES = { light: {}, dark: { isDark: true }, contrast: { isContrast: true } };

let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
afterAll(async () => { if (browser) await browser.close(); }, 30000);

async function openPage(state, theme, extra, width) {
  resetStemLab();
  document.head.querySelectorAll('style').forEach((style) => style.remove());
  loadTool(SOURCE, 'protractor');
  const rendered = prepareStemBrowserRender(renderTool('protractor', state, Object.assign({}, OVERRIDES[theme], extra || {})));
  const page = await browser.newPage({ viewport: { width: width || 700, height: 900 } });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + appCss + '</style>' +
    (theme === 'contrast' ? '<style>' + CONTRAST_CSS + '</style>' : '') + '</head><body style="margin:0"><main id="tool-root">' + wrap(theme, rendered.html) + '</main></body></html>', { waitUntil: 'domcontentloaded' });
  for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
  return page;
}

// Runs in the page: each SVG label against the colours really painted beneath it.
function auditSvgInk() {
  const parse = (c) => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const over = (top, bot) => { const a = top[3]; return [top[0] * a + bot[0] * (1 - a), top[1] * a + bot[1] * (1 - a), top[2] * a + bot[2] * (1 - a), 1]; };
  const alphaOf = (cs) => Number(cs.opacity || 1);
  // A mark smaller than the label (a vertex dot, a tick) is not what the label is read against.
  const below = (node, x, y) => {
    const nb = node.getBBox ? node.getBBox() : null;
    const layers = [];
    for (const el of document.elementsFromPoint(x, y)) {
      if (el === node || node.contains(el)) continue;
      const tag = el.tagName.toLowerCase();
      const ecs = getComputedStyle(el);
      let c = null;
      if (el instanceof SVGElement && tag !== 'svg') {
        if (['text', 'tspan', 'line', 'polyline', 'g'].includes(tag)) continue;
        if (nb && el.getBBox) { const b = el.getBBox(); if (b.width * b.height < nb.width * nb.height) continue; }
        if (/url\(/.test(ecs.fill)) return 'gradient';
        c = parse(ecs.fill);
        if (!c) continue;
        c[3] *= Number(ecs.fillOpacity || 1) * alphaOf(ecs);
      } else {
        if (ecs.backgroundImage && ecs.backgroundImage !== 'none') return 'gradient';
        c = parse(ecs.backgroundColor);
        if (!c || c[3] === 0) continue;
      }
      layers.push(c);
      if (c[3] >= 1) break;
    }
    let bg = [255, 255, 255, 1];
    for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg);
    return bg;
  };
  const texts = [], strokes = [], skipped = [];
  for (const tx of document.querySelectorAll('#tool-root svg text')) {
    const s = tx.textContent.trim();
    if (!s) continue;
    tx.scrollIntoView({ block: 'center' });
    const r = tx.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(tx);
    let fg = parse(cs.fill);
    if (!fg) { skipped.push(s + ' fill=' + cs.fill); continue; }
    fg[3] *= Number(cs.fillOpacity || 1) * alphaOf(cs);
    const bg = below(tx, r.left + r.width / 2, r.top + r.height / 2);
    if (bg === 'gradient') { skipped.push(s + ' on a gradient'); continue; }
    const ctm = tx.getScreenCTM();
    const px = parseFloat(cs.fontSize) * (ctm ? Math.abs(ctm.a) : 1);
    const large = px >= 24 || (Number(cs.fontWeight) >= 700 && px >= 18.66);
    const cr = ratio(over(fg, bg), bg);
    if (cr < (large ? 3 : 4.5)) texts.push({ text: s.slice(0, 24), ratio: Math.round(cr * 100) / 100, fill: cs.fill, bg: 'rgb(' + bg.slice(0, 3).map(Math.round).join(',') + ')', px: Math.round(px) });
  }
  // Lines, rays and outlines against the diagram's own panel (its first full-size rect).
  for (const svg of document.querySelectorAll('#tool-root svg[role="img"], #tool-root svg[role="group"]')) {
    const panel = svg.querySelector('rect');
    if (!panel) continue;
    const pc = parse(getComputedStyle(panel).fill);
    if (!pc || pc[3] < 1) continue;
    for (const el of svg.querySelectorAll('line, path, polyline, polygon, circle, ellipse')) {
      const cs = getComputedStyle(el);
      if (cs.stroke === 'none' || Number(cs.strokeWidth) === 0) continue;
      let sc = parse(cs.stroke);
      if (!sc) continue;
      sc[3] *= Number(cs.strokeOpacity || 1) * alphaOf(cs);
      // A halo in the panel colour is a deliberate knockout, not a line.
      if (sc[0] === pc[0] && sc[1] === pc[1] && sc[2] === pc[2]) continue;
      const cr = ratio(over(sc, pc), pc);
      if (cr < 3) strokes.push({ el: el.tagName + (el.getAttribute('stroke-dasharray') ? ' dashed' : ''), svg: svg.getAttribute('aria-label').slice(0, 40), ratio: Math.round(cr * 100) / 100, stroke: cs.stroke, panel: getComputedStyle(panel).fill });
    }
  }
  return { texts, strokes, skipped, count: document.querySelectorAll('#tool-root svg text').length };
}

const P = (patch, extra) => ({ state: { protractor: patch }, extra: extra || {} });
let A = null;
function puzzle(kind) { if (!A) { resetStemLab(); loadTool(SOURCE, 'protractor'); A = window.StemLab.anglesCore; } return A.makePuzzle(kind, A.seedRng(kind.length * 7 + 3), 'g8'); }
const read = { base: 40, open: 1, m: 62, vx: 210, vy: 175, tol: 1, start: { x: 130, y: 240, rot: 0 } };
const DIAGRAMS = {
  'protractor read, revealed': () => P({ activeTab: 'protractor', mMode: 'read', mTask: read, mPlace: { x: 210, y: 175, rot: 40 }, mTries: 2, mResult: { code: 'wrong_scale', revealed: true } }),
  'protractor draw': () => P({ activeTab: 'protractor', mMode: 'draw' }),
  'protractor compare': () => P({ activeTab: 'protractor', mMode: 'compare' }),
  'explore with bisector and second ray': () => P({ activeTab: 'explore', showBisector: true, showSecondRay: true, anglePins: [{ deg: 30 }] }, { angleValue: 130 }),
  'estimate, then shown': () => P({ activeTab: 'challenges', estimateActive: true, estimateTarget: 100, estimateBase: 30, estimateResult: { guess: 80, target: 100, diff: 20, ok: false, tol: 10, bench: 2, revealed: true } }, { angleValue: 100 }),
  'challenge create': () => P({ activeTab: 'challenges' }, { angleChallenge: { type: 'create', target: 105 }, angleValue: 60 }),
  'puzzles comp': () => P({ activeTab: 'puzzles', level: 'g8', pz: puzzle('comp'), pzKind: 'comp' }),
  'puzzles supp': () => P({ activeTab: 'puzzles', level: 'g8', pz: puzzle('supp'), pzKind: 'supp' }),
  'puzzles vert': () => P({ activeTab: 'puzzles', level: 'g8', pz: puzzle('vert'), pzKind: 'vert' }),
  'puzzles point': () => P({ activeTab: 'puzzles', level: 'g8', pz: puzzle('point'), pzKind: 'point' }),
  'puzzles tri': () => P({ activeTab: 'puzzles', level: 'g8', pz: puzzle('tri'), pzKind: 'tri' }),
  'puzzles trans': () => P({ activeTab: 'puzzles', level: 'g8', pz: puzzle('trans'), pzKind: 'trans' }),
  'puzzles rad': () => P({ activeTab: 'puzzles', level: 'g8', pz: puzzle('rad'), pzKind: 'rad' }),
  'polygons sum, angles shown': () => P({ activeTab: 'polygons', pgMode: 'sum', pgPred: { pick: 'p_add180', locked: true }, pgN: 6, pgSeed: 4, pgDiags: [[0, 2], [0, 3], [0, 4]], pgRow: { n: 6, code: 'ok', ok: true, tries: 1 }, pgRuns: { 6: { tri: 4, sum: 720 } } }),
  'polygons exterior walk': () => P({ activeTab: 'polygons', pgMode: 'ext', pgWalkPred: { pick: 'w_360', locked: true }, pgWalk: { n: 6, seed: 8, step: 4 } }),
  'polygons tiling': () => P({ activeTab: 'polygons', pgMode: 'tile', pgTilePred: { picks: { 3: true }, locked: true }, pgTileSel: 5 }),
  'polygons practice': () => P({ activeTab: 'polygons', pgMode: 'practice', level: 'g8' }),
  'circles inscribed, checked': () => P({ activeTab: 'circles', ciMode: 'inscribed', citT: { kind: 'inscribed', a: 0, b: 100, p: 230, m: 100, ask: 'insc', given: 100, answer: 50, id: 'i' }, citRes: { code: 'ok', ok: true }, citTries: 1 }),
  'circles semicircle': () => P({ activeTab: 'circles', ciMode: 'semi', level: 'g8' }),
  'circles cyclic': () => P({ activeTab: 'circles', ciMode: 'cyclic', level: 'g8' }),
  'unit circle explore': () => P({ activeTab: 'circles', ciMode: 'unit', ucDeg: 150 }),
  'unit circle task, solved': () => P({ activeTab: 'circles', ciMode: 'unit', ucView: 'practice', level: 'g8', uctT: { kind: 'coord', deg: 225, fn: 'sin', answer: '-√2/2', id: 'u' }, uctRes: { code: 'ok', ok: true }, uctTries: 1 }),
  'contexts clock, solved': () => P({ activeTab: 'contexts', cxMode: 'clock', cxtT: { kind: 'clock', h: 4, m: 20, answer: 10, id: 'c' }, cxtRes: { code: 'ok', ok: true }, cxtTries: 1 }),
  'contexts bearing': () => P({ activeTab: 'contexts', cxMode: 'bearing', level: 'g8', cxtT: { kind: 'bearing', v: 'back', b: 250, answer: 70, id: 'b' } }),
  'contexts roof, shown': () => P({ activeTab: 'contexts', cxMode: 'pitch', level: 'g8', cxtT: { kind: 'pitch', v: 'tan', rise: 6, run: 12, answer: 26.6, id: 'p' }, cxtRes: { code: 'pitch_used_sin', revealed: true }, cxtTries: 2 }),
  'construct bisect': () => P({ activeTab: 'construct', conKind: 'bisect', con: { kind: 'bisect', m: 80, base: 0, B: { x: 140, y: 200 }, lenBA: 150, lenBC: 150, id: 'con:bisect:80:0', steps: [{ tool: 'compass', centre: 'B', r: 50 }, { tool: 'compass', centre: 'D', r: 50 }] } }),
  'construct copy': () => P({ activeTab: 'construct', conKind: 'copy' }),
  'tools clock': () => P({ activeTab: 'tools' }),
};

const NO_TEXT = new Set(['polygons tiling', 'polygons practice']);
describe('every diagram label and line meets contrast in light, dark and high contrast', () => {
  for (const [name, make] of Object.entries(DIAGRAMS)) {
    it(name, async () => {
      const { state, extra } = make();
      for (const theme of ['light', 'dark', 'contrast']) {
        const page = await openPage(state, theme, extra);
        const res = await page.evaluate(auditSvgInk);
        if (!NO_TEXT.has(name)) expect.soft(res.count, theme + ': no labels found').toBeGreaterThan(0);
        expect.soft(res.texts, theme + ' labels').toEqual([]);
        expect.soft(res.strokes, theme + ' lines').toEqual([]);
        expect.soft(res.skipped, theme + ' unmeasured labels').toEqual([]);
        await page.close();
      }
    }, 60000);
  }
});

const NEW_SURFACES = {
  'learning path, grade 4, two done': P({ credited: { 'read:1': 1 }, estimateCount: 1 }, { gradeBand: 'g35' }),
  'learning path, grade 8+': P({ conSolved: { bisect: 1 } }, { gradeBand: 'g912' }),
  'reveal row and AI nudge on a task card': P({ activeTab: 'polygons', pgMode: 'practice', level: 'g57', pgpT: { kind: 'sum', n: 7, answer: 900, id: 'pg:sum:7' }, pgpTries: 2, pgpA: '1000', pgpRes: { code: 'n180' }, pgpHint: 1, pgpAi: { id: 'pg:sum:7', text: '💡 Count the triangles first. — AI hint, may be imperfect.' } }, { getHint: () => {} }),
  'estimate miss with reveal offered': P({ activeTab: 'challenges', estimateActive: true, estimateTarget: 100, estimateBase: 30, estimateTries: 2, estimateMiss: { guess: 160, high: true, benchOk: false } }),
  'classify second try': P({ activeTab: 'challenges' }, { angleChallenge: { type: 'classify', target: 120, picks: ['Acute', 'Reflex'], tries: 2 }, angleFeedback: { correct: false, msg: '❌ Not Reflex. Compare 120° with a right angle (90°) and a straight line (180°). Try again, or show the answer below.' } }),
  'puzzle reason with reveal offered': P({ activeTab: 'puzzles', level: 'g57', pz: { kind: 'vert', a: 70, ask: 'vertical', askPos: 2, answer: 70, rot: 0, id: 'vert:70:2' }, pzResult: { code: 'ok', ok: true }, pzTries: 1, pzReason: { ok: false, pick: 'linear', tries: 2 } }),
};

// Every tab, inside the real dark card and the real high-contrast shell.
for (const tab of ['protractor', 'explore', 'challenges', 'puzzles', 'polygons', 'circles', 'contexts', 'construct', 'tools']) {
  NEW_SURFACES['tab ' + tab] = P({ activeTab: tab, level: 'g8' }, { isTeacherMode: tab === 'polygons' });
}

describe('the new surfaces pass WCAG in every theme and reflow at 320px', () => {
  for (const [name, { state, extra }] of Object.entries(NEW_SURFACES)) {
    it(name, async () => {
      for (const theme of ['light', 'dark', 'contrast']) {
        const page = await openPage(state, theme, extra, 320);
        await page.addScriptTag({ content: axeSource });
        const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
        const violations = audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 4).map((n) => ({ target: n.target, html: n.html.slice(0, 140), data: n.any && n.any[0] && n.any[0].data && n.any[0].data.contrastRatio ? [n.any[0].data.fgColor, n.any[0].data.bgColor, n.any[0].data.contrastRatio] : undefined })) }));
        const reflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
        expect.soft(violations, theme).toEqual([]);
        expect.soft(reflow.scrollWidth, theme + ' reflow').toBeLessThanOrEqual(reflow.clientWidth);
        await page.close();
      }
    }, 60000);
  }
});

// Follow-up (2026-11-04): on a phone the tab row folds to the core tabs plus "More".
describe('the folded phone tab row passes WCAG in every theme', () => {
  for (const [name, { state, extra }] of Object.entries({
    'grade 4, protractor': P({}, { gradeBand: 'g35' }),
    'grade 6-8, a non-core tab open': P({ level: 'g57', activeTab: 'explore' }),
  })) {
    it(name, async () => {
      window.matchMedia = (q) => ({ matches: /max-width:\s*639px/.test(q), media: q, addEventListener() {}, removeEventListener() {} });
      try {
        for (const theme of ['light', 'dark', 'contrast']) {
          const page = await openPage(state, theme, extra, 320);
          expect(await page.locator('#tool-root [data-angles-tabs-more]').count(), 'More shown').toBe(1);
          expect(await page.locator('#tool-root [role="tab"]').count()).toBeLessThan(5);
          await page.addScriptTag({ content: axeSource });
          const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
          const violations = audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 4).map((n) => ({ target: n.target, html: n.html.slice(0, 140) })) }));
          const reflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
          expect.soft(violations, theme).toEqual([]);
          expect.soft(reflow.scrollWidth, theme + ' reflow').toBeLessThanOrEqual(reflow.clientWidth);
          await page.close();
        }
      } finally { delete window.matchMedia; }
    }, 60000);
  }
});
