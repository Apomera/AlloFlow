// Calculus stage C (2026-11-03): dark mode in a real browser. The tool is CLIENT-rendered in
// Chromium (React UMD), inside a copy of stem_lab_module's dark shell (a themed backdrop with the
// tool on its white surface card), so the Visualize canvases really draw. Canvas text is checked
// against the pixels it is drawn on (4.5:1, 3:1 for large text), thick strokes against the canvas
// ground (3:1), and the DOM with axe WCAG A/AA. CALCULUS_DEEP_FILE points at another copy.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMServer, extractReactSsrStyles } from './helpers/stem_widgets_smoke_harness.js';

const root = process.cwd();
const FILE = process.env.CALCULUS_DEEP_FILE || 'stem_lab/stem_tool_calculus.js';
const toolSource = fs.readFileSync(path.join(root, FILE), 'utf8');
const MOD = path.join(root, 'desktop/web-app/node_modules');
const reactUmd = fs.readFileSync(path.join(MOD, 'react/umd/react.production.min.js'), 'utf8');
const reactDomUmd = fs.readFileSync(path.join(MOD, 'react-dom/umd/react-dom.production.min.js'), 'utf8');
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const appCss = fs.readFileSync(path.join(cssDirectory, fs.readdirSync(cssDirectory).find((f) => /^main\.[a-z0-9]+\.css$/i.test(f))), 'utf8');
const appStylesSource = fs.readFileSync(path.join(root, 'app_styles_module.js'), 'utf8');
if (!(window.AlloModules && window.AlloModules.AppStyles)) Function('window', appStylesSource)(window);
const runtimeAppCssSheets = extractReactSsrStyles(ReactDOMServer.renderToStaticMarkup(React.createElement(window.AlloModules.AppStyles.AppStyles, null))).cssSheets;
const stemThemeCss = `
  .theme-dark { --allo-stem-canvas: #0f172a; --allo-stem-text: #e2e8f0; }
  #tool-root { background: var(--allo-stem-canvas); color: var(--allo-stem-text); min-height: 100vh; }
`;
// The shell stem_lab_module.js wraps every tool in when ctx.theme is 'dark'.
const SHELL = '<main id="tool-root" class="theme-dark"><div data-stem-tool-shell="calculus" data-stem-theme="dark" style="background:var(--allo-stem-canvas,#0f172a);color:var(--allo-stem-text,#e2e8f0);border-radius:12px;padding:10px">'
  + '<div data-stem-tool-surface="calculus" style="background:#ffffff;color:#0f172a;color-scheme:light;border-radius:10px;padding:10px"><div id="app"></div></div></div></main>';

// Canvas probes: every fillText records its colour and the pixels underneath; thick strokes record their colour.
const CANVAS_PROBE = `(function(){
  var P = CanvasRenderingContext2D.prototype, rec = window.__canvasRec = { text: [], stroke: [] };
  function mode(ctx, x, y, w, h) {
    try {
      var cw = ctx.canvas.width, ch = ctx.canvas.height;
      x = Math.max(0, Math.floor(x)); y = Math.max(0, Math.floor(y));
      w = Math.min(cw - x, Math.ceil(w)); h = Math.min(ch - y, Math.ceil(h));
      if (w < 1 || h < 1) return null;
      var data = ctx.getImageData(x, y, w, h).data, counts = {}, best = null, bn = 0;
      for (var i = 0; i < data.length; i += 4) { var k = data[i] + ',' + data[i + 1] + ',' + data[i + 2]; counts[k] = (counts[k] || 0) + 1; if (counts[k] > bn) { bn = counts[k]; best = k; } }
      return best;
    } catch (e) { return null; }
  }
  var oft = P.fillText;
  P.fillText = function(text, x, y) {
    if (window.__recOn && typeof this.fillStyle === 'string') {
      var t = this.getTransform(), m = /(\\d+(?:\\.\\d+)?)px/.exec(this.font), fs = m ? parseFloat(m[1]) : 10;
      var w = this.measureText(String(text)).width, al = this.textAlign, bl = this.textBaseline;
      var lx = al === 'center' ? x - w / 2 : (al === 'right' || al === 'end') ? x - w : x;
      var ty = bl === 'middle' ? y - fs / 2 : (bl === 'top' || bl === 'hanging') ? y : (bl === 'bottom' || bl === 'ideographic') ? y - fs : y - fs * 0.8;
      rec.text.push({ text: String(text).slice(0, 40), fill: this.fillStyle, alpha: this.globalAlpha, bg: mode(this, t.a * lx + t.c * ty + t.e, t.b * lx + t.d * ty + t.f, w * t.a, fs * t.d), size: fs, bold: /bold|[6-9]00/.test(this.font) });
    }
    return oft.apply(this, arguments);
  };
  var ost = P.stroke;
  P.stroke = function() { if (window.__recOn && this.lineWidth >= 2 && typeof this.strokeStyle === 'string') rec.stroke.push({ stroke: this.strokeStyle, alpha: this.globalAlpha, lw: this.lineWidth }); return ost.apply(this, arguments); };
})();`;
const MOUNT = `window.StemLab = { _registry: {}, registerTool: function(id, cfg) { cfg.id = id; this._registry[id] = cfg; }, registerModule: function() {}, isRegistered: function(id) { return !!this._registry[id]; } };
window.__mount = function(state, extra) {
  var e = React.createElement;
  if (window.__root) { window.__root.unmount(); window.__root = null; }
  var icons = new Proxy({}, { get: function() { return function() { return e('span', { 'aria-hidden': 'true' }); }; } });
  function App() {
    var s = React.useState({ calculus: state });
    return window.StemLab._registry.calculus.render(Object.assign({ React: React, toolData: s[0], setToolData: s[1], setStemLabTool: function() {}, setToolSnapshots: function() {},
      addToast: function() {}, t: function(k, fb) { return fb || k; }, icons: icons, awardXP: function() {}, announceToSR: function() {}, beep: function() {}, celebrate: function() {},
      a11yClick: function(fn) { return { onClick: fn }; }, isDark: true, theme: 'dark', isContrast: false, gradeBand: 'g912', gradeLevel: '11th Grade' }, extra || {}));
  }
  window.__root = ReactDOM.createRoot(document.getElementById('app'));
  window.__root.render(e(App));
};`;

function rgb(c) {
  if (typeof c !== 'string') return null;
  let m = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (m) { const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255, 1]; }
  m = /^rgba?\(([^)]+)\)$/.exec(c.trim());
  if (m) { const p = m[1].split(',').map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
  m = /^(\d+),(\d+),(\d+)$/.exec(c.trim());
  if (m) return [+m[1], +m[2], +m[3], 1];
  return null;
}
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const over = (fg, a, bg) => [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));

const VIEWS =['zoom', 'tangent', 'motion', 'riemann', 'ftc', 'slope', 'chain', 'taylor', 'optim', 'related', 'vor', 'eps'];
const QUIZ = { mode: 'deriv', a: 2, b: 1, c: 3, x0: 1, answer: 5, band: 'ab', id: 'deriv-dark', opts: [{ id: '3', value: 3, mis: 'power_rule_bring_down' }, { id: '5', value: 5, mis: '' }, { id: '6', value: 6, mis: 'height_not_slope' }, { id: '8', value: 8, mis: 'constant_derivative' }] };
const PANELS = [
  ['learning path (pre, one done)', { tab: 'limits', calcBand: 'pre', missionXP: { 'lim:7': true } }, {}],
  ['learning path (bc) + series', { tab: 'series', calcBand: 'bc', serMode: 'practice', serSeed: 77, serBand: 'bc', serTries: 2, serLast: { conv: 'conv', test: 'ratio' }, serPred: { conv: 'conv', test: 'ratio' } }, {}],
  ['integral: improper convergent ln|x|', { tab: 'integral', fnMode: 'typed', fnText: 'ln|x|', xMin: -1, xMax: 1, mode: 'midpoint', n: 20 }, {}],
  ['integral: improper divergent 1/x', { tab: 'integral', fnMode: 'typed', fnText: '1/x', xMin: -1, xMax: 1, mode: 'midpoint', n: 20 }, {}],
  ['integral: over/under reveal offer', { tab: 'integral', mode: 'left', a: 1, b: 0, c: 0, xMin: 0, xMax: 3, n: 4, overUnderTries: 2, overUnderGuess: 'over', antiHintRung: 3 }, {}],
  ['challenge: hint ladder', { tab: 'challenge', calcChallengeMode: 'deriv', calcBand: 'ab', calcQuiz: Object.assign({ answered: false, attempts: 1, tried: ['6'], mis: 'height_not_slope' }, QUIZ), calcHintRung: 3 }, {}],
  ['challenge: reveal offer', { tab: 'challenge', calcChallengeMode: 'deriv', calcBand: 'ab', calcQuiz: Object.assign({ answered: true, attempts: 2, tried: ['6', '8'], mis: 'constant_derivative', correct: false, revealed: false }, QUIZ) }, {}],
  ['limits: reveal offer', { tab: 'limits', limitMode: 'practice', limitSeed: 5, limitTries: 2, limitLastPred: { kind: 'number', value: '12345' }, limitPred: { kind: 'number', value: '12345' } }, {}],
  ['free response: justification after a try', { tab: 'frq', frqKind: 'analysis', frqSeed: 5, frqInputs: { b2: { text: 'Because f prime is zero there.', picks: { test: 'fdt', cond: 'fpp_neg', concl: 'relmax' } } }, frqTries: { b2: 1 }, frqFeedback: { b2: { ok: false, mis: 'test_condition_mismatch', fin: false, elements: { test: true, cond: false, concl: true }, wrong: [] } } }, {}],
  ['free response: justification reveal offer + model', { tab: 'frq', calcBand: 'bc', frqKind: 'series', frqSeed: 5, frqTries: { b2: 2 }, frqFeedback: { b2: { ok: false, mis: 'terms_zero_converges', used: true, elements: { series: true, test: false, concl: false } } }, frqResults: { a: { ok: true, firstTry: true }, b: { ok: false, revealed: true, mis: 'terms_zero_converges' } } }, {}],
  ['derivative: match reveal offer + teacher panel', { tab: 'derivative', calcBand: 'ab', matchKind: 'deriv', matchQuiz: { seed: 424242, band: 'ab', kind: 'deriv', tried: ['A', 'B'], picked: 'B', answered: true, correct: false, lastMis: 'height_not_slope' }, calcMissed: [{ mode: 'deriv', question: 'Q', chosen: '6', answer: '5', mis: 'height_not_slope', at: 1 }] }, { isTeacherMode: true }],
];

describe('calculus stage C: dark mode in a real browser (client render, host dark shell)', () => {
  let browser, page;
  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 1024, height: 900 } });
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + SHELL + '</body></html>');
    await page.addStyleTag({ content: appCss });
    for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
    await page.addStyleTag({ content: stemThemeCss });
    await page.addScriptTag({ content: CANVAS_PROBE });
    await page.addScriptTag({ content: reactUmd });
    await page.addScriptTag({ content: reactDomUmd });
    await page.addScriptTag({ content: MOUNT });
    await page.addScriptTag({ content: toolSource });
    await page.addScriptTag({ content: axeSource });
  }, 60000);
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  async function mount(state, extra) {
    const errors = [];
    const onErr = (e) => errors.push(String(e && e.message || e));
    page.on('pageerror', onErr);
    await page.evaluate(([s, x]) => window.__mount(s, x), [state, extra || {}]);
    await page.waitForTimeout(250);
    page.off('pageerror', onErr);
    return errors;
  }
  async function axeDom() {
    const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
    return audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 4).map((n) => n.html.slice(0, 140) + (n.any && n.any[0] && n.any[0].data && n.any[0].data.contrastRatio ? ' ' + n.any[0].data.contrastRatio + ' ' + n.any[0].data.fgColor + '/' + n.any[0].data.bgColor : '')) }));
  }

  for (const view of VIEWS) {
    it('Visualize ' + view + ': canvas text, thick strokes and the panel meet contrast in dark mode', async () => {
      const state = Object.assign({ tab: 'visualize', vizView: view }, view === 'slope' ? { eulerOn: true, vizSlopeY: 1 } : {});
      const errors = await mount(state);
      expect(errors).toEqual([]);
      // Record two frames of drawing.
      await page.evaluate(() => new Promise((done) => { window.__canvasRec.text = []; window.__canvasRec.stroke = []; window.__recOn = true; requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => { window.__recOn = false; done(); }))); }));
      const out = await page.evaluate(() => {
        const cv = document.querySelector('#app canvas');
        let ground = null;
        if (cv) {
          const c = cv.getContext('2d'), d = c.getImageData(0, 0, cv.width, cv.height).data, counts = {};
          let bn = 0;
          for (let i = 0; i < d.length; i += 40) { const k = d[i] + ',' + d[i + 1] + ',' + d[i + 2]; counts[k] = (counts[k] || 0) + 1; if (counts[k] > bn) { bn = counts[k]; ground = k; } }
        }
        return { rec: window.__canvasRec, ground, hasCanvas: !!cv, width: cv ? cv.width : 0 };
      });
      expect(out.hasCanvas, 'the view draws on a canvas').toBe(true);
      expect(out.rec.text.length, 'canvas text was drawn and recorded').toBeGreaterThan(0);
      const ground = rgb(out.ground);
      const seen = new Set(), textFails = [], strokeFails = [];
      for (const r of out.rec.text) {
        const fg = rgb(r.fill), bg = rgb(r.bg) || ground;
        if (!fg || !bg || !r.text.trim()) continue;
        const eff = over(fg, (r.alpha == null ? 1 : r.alpha) * fg[3], bg), cr = ratio(eff, bg), need = r.size >= 24 || (r.bold && r.size >= 18.66) ? 3 : 4.5;
        const key = r.text + '|' + r.fill + '|' + r.bg;
        if (cr < need && !seen.has(key)) { seen.add(key); textFails.push(`${JSON.stringify(r.text)} ${r.fill}@${r.alpha} on ${r.bg} = ${cr.toFixed(2)} (need ${need})`); }
      }
      for (const s of out.rec.stroke) {
        const fg = rgb(s.stroke);
        if (!fg || !ground) continue;
        const cr = ratio(over(fg, (s.alpha == null ? 1 : s.alpha) * fg[3], ground), ground), key = s.stroke + '|' + s.alpha;
        // A stroke in the ground colour itself is a cut-out drawn ON a shape (a gear spoke, a dot
        // outline), not a mark on the ground; it is judged by the shape it sits on.
        if (cr < 1.2) continue;
        if (cr < 3 && !seen.has(key)) { seen.add(key); strokeFails.push(`${s.stroke}@${s.alpha} lw ${s.lw} on ${out.ground} = ${cr.toFixed(2)}`); }
      }
      expect.soft(textFails, view + ' canvas text').toEqual([]);
      expect.soft(strokeFails, view + ' canvas strokes').toEqual([]);
      expect.soft(await axeDom(), view + ' DOM').toEqual([]);
    }, 45000);
  }

  for (const [name, state, extra] of PANELS) {
    it(name + ': WCAG A/AA in dark mode', async () => {
      const errors = await mount(state, extra);
      expect(errors).toEqual([]);
      const html = await page.evaluate(() => document.getElementById('app').innerHTML);
      expect(html).toContain('data-calc-path');
      expect(html).not.toMatch(/NaN|>undefined<|\[object Object\]/);
      expect.soft(await axeDom(), name).toEqual([]);
    }, 45000);
  }
});
