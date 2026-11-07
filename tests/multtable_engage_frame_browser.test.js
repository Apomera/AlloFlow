// Multiplication Table empty frame (approved 2026-11-05) in Chromium, inside the REAL host wrapper: AppStyles,
// the StemLab.renderTool shell (the white surface card in dark), the theme class and the hub's own rules.
// Set MT_FRAME_SHOTS to a folder to also save screenshots. MULTTABLE_DEEP_SRC runs it against another copy.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const SRC = path.resolve(ROOT, process.env.MULTTABLE_DEEP_SRC || 'stem_lab/stem_tool_multtable.js');
const SHOTS = process.env.MT_FRAME_SHOTS || '';
const axeSource = fs.readFileSync(path.join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssName = fs.readdirSync(path.join(ROOT, 'app/static/css')).find((n) => /^main\..*\.css$/.test(n));
const hubSrc = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_lab_module.js'), 'utf8');
function hubRules(startRe, endMarker) {
  const m = startRe.exec(hubSrc);
  const b = m ? hubSrc.indexOf(endMarker, m.index) : -1;
  if (!m || b < 0) throw new Error('hub theme block not found: ' + startRe);
  // eslint-disable-next-line no-new-func
  return new Function('return [' + hubSrc.slice(m.index + m[0].length, b) + '];')();
}
const HC_RULES = hubRules(/\} else if \(isContrast\) \{\s*s\.textContent = \[/, '].join(');
const DARK_RULES = hubRules(/if \(isDark\) \{\s*s\.textContent = \[/, '].map(function (rule) {').map((rule) => {
  const brace = rule.indexOf('{');
  return rule.slice(0, brace).split(',').map((sel) => sel.trim() + ':not([data-stem-tool-surface]:not([data-stem-dark-remap]) *)').join(', ') + ' ' + rule.slice(brace);
});
const VARS = ':root{--allo-stem-canvas:#f8fafc;--allo-stem-text:#0f172a}.theme-dark{--allo-stem-canvas:#0f172a;--allo-stem-text:#e2e8f0}.theme-contrast{--allo-stem-canvas:#000000;--allo-stem-text:#ffff00}';

function html(theme, grade) {
  const bg = theme === 'contrast' ? '#000' : theme === 'dark' ? '#0f172a' : '#f1f5f9';
  const hub = theme === 'dark' ? DARK_RULES.join('\n') : theme === 'contrast' ? HC_RULES.join('\n') : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t</title>
<link rel="stylesheet" href="/app/static/css/${cssName}">
<style>html,body{margin:0;background:${bg}} #wrap{padding:12px;box-sizing:border-box;max-width:100%}${VARS}</style><style>${hub}</style></head>
<body class="${theme === 'dark' ? 'theme-dark' : theme === 'contrast' ? 'theme-contrast' : ''}"><main id="wrap" data-stem-lab="true"></main>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/app_styles_module.js"></script>
<script>window.__sr=[];window.__xp=[];</script>
<script src="/stem_lab/stem_lab_module.js"></script>
<script>window.StemLab = window.StemLab || { _registry: {} };
  window.StemLab.loadScriptResilient = window.StemLab.loadScriptResilient || function () { return new Promise(function () {}); };</script>
<script src="/__tool.js"></script>
<script>
  var e = React.createElement;
  window.__mount = function (seed, ch0) {
    function Comp() {
      var S = React.useState;
      var lab = S(seed || {}), ans = S(''), ch = S(ch0 || null), fb = S(null), hid = S(false), rev = S(new Set()), hov = S(null), sc = S({ correct: 0, total: 0 });
      window.__lab = lab[0];
      var ctx = { React: React, toolData: {}, setToolData: function(){},
        labToolData: lab[0], setLabToolData: lab[1], multTableAnswer: ans[0], setMultTableAnswer: ans[1], multTableChallenge: ch[0], setMultTableChallenge: ch[1],
        multTableFeedback: fb[0], setMultTableFeedback: fb[1], multTableHidden: hid[0], setMultTableHidden: hid[1], multTableHover: hov[0], setMultTableHover: hov[1],
        multTableRevealed: rev[0], setMultTableRevealed: rev[1], exploreScore: sc[0], setExploreScore: sc[1],
        setStemLabTool: function(){}, addToast: function(){}, awardXP: function(){ window.__xp.push([].slice.call(arguments)); }, celebrate: function(){}, beep: function(){},
        announceToSR: function (m) { window.__sr.push(String(m)); }, icons: {}, aiHintsEnabled: false, callGemini: null, getHint: null,
        t: function (k, f) { return typeof f === 'string' ? f : k; }, gradeLevel: '${grade}',
        isDark: ${theme === 'dark'}, theme: '${theme}', isContrast: ${theme === 'contrast'}, isTeacherMode: false };
      return e(React.Fragment, null, e(window.AlloModules.AppStyles.AppStyles, {}), window.StemLab.renderTool('multtable', ctx));
    }
    ReactDOM.createRoot(document.getElementById('wrap')).render(e(Comp));
  };
</script></body></html>`;
}

let server; let base; let browser;
beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    const m = url.match(/^\/__mt\/(\w+)\/([\w %]+)$/);
    if (m) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html(m[1], m[2])); return; }
    const file = url === '/__tool.js' ? SRC : path.join(ROOT, path.normalize(url).replace(/^([/\\])+/, ''));
    const type = path.extname(file) === '.css' ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8';
    fs.readFile(file, (err, body) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': type }); res.end(body); });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ headless: true });
}, 60000);
afterAll(async () => { if (browser) await browser.close(); if (server) server.close(); }, 30000);

async function open(theme, grade, seed, o = {}) {
  const context = await browser.newContext(Object.assign({ viewport: { width: o.w || 1280, height: o.h || 900 }, reducedMotion: 'reduce' }, o.touch ? { hasTouch: true, isMobile: true } : {}));
  const page = await context.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${base}/__mt/${theme}/${encodeURIComponent(grade)}`);
  await page.waitForFunction(() => window.AlloModules && window.AlloModules.AppStyles && window.StemLab && window.StemLab.renderTool && (window.StemLab._registry || {}).multtable, null, { timeout: 60000 });
  await page.evaluate(([s, c]) => window.__mount(s, c), [seed || {}, o.challenge || null]);
  await page.waitForSelector('[data-multtable-root]', { timeout: 60000 });
  await page.waitForTimeout(250);
  return { page, errs, close: () => context.close() };
}
const VISUAL = (a, b) => ({ _multExt: { mtTab: 'visual', visualA: a, visualB: b } });
async function shot(page, name) {
  if (!SHOTS) return;
  const card = page.locator('[data-mt-predict]');
  await card.screenshot({ path: path.join(SHOTS, name + '.png') });
}
// What the frame's own marks measure against what is really behind them. Axe cannot read SVG.
const MEASURE = () => {
  const parse = (c) => { const p = String(c).match(/[\d.]+/g).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] == null ? 1 : p[3] }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (x, y) => { const a = lum(x), b = lum(y); return +((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2); };
  const bgOf = (el) => { for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c.a > 0) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  const frame = document.querySelector('[data-mt-frame]');
  const back = bgOf(frame);
  const svg = frame.querySelector('svg');
  const out = { marks: [], words: [], parts: [] };
  for (const el of svg.querySelectorAll('line, rect[fill="none"]')) out.marks.push(ratio(parse(getComputedStyle(el).stroke), back));
  const rects = [...svg.querySelectorAll('rect')].filter((r) => r.getAttribute('fill') !== 'none');
  [...svg.querySelectorAll('text')].forEach((t, i) => { const r = rects[i]; out.parts.push(ratio(parse(getComputedStyle(t).fill), r ? parse(getComputedStyle(r).fill) : back)); });
  for (const el of document.querySelectorAll('[data-mt-predict] p, [data-mt-frame-split] button')) out.words.push({ text: el.textContent.slice(0, 40), ratio: ratio(parse(getComputedStyle(el).color), bgOf(el)) });
  return out;
};

describe('the empty frame in the host wrapper', () => {
  for (const theme of ['light', 'dark', 'contrast']) {
    it(theme + ': axe is clean, marks and words can be seen, with and without a split', async () => {
      const { page, errs, close } = await open(theme, '5th Grade', VISUAL(7, 8));
      expect(await page.locator('[data-mt-frame]').count()).toBe(1);
      expect(await page.locator('.allo-mt-dot').count()).toBe(0);
      await shot(page, 'grade5_' + theme);
      await page.addScriptTag({ content: axeSource });
      const run = () => page.evaluate(async () => {
        const a = await axe.run('[data-mt-predict]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
        return a.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 3).map((n) => n.html.slice(0, 140)) }));
      });
      expect(await run()).toEqual([]);
      let m = await page.evaluate(MEASURE);
      expect(m.marks.length).toBe(7 + 8 + 1);
      expect(m.marks.filter((r) => r < 3), JSON.stringify(m.marks)).toEqual([]);
      expect(m.words.filter((w) => w.ratio < 4.5)).toEqual([]);
      await page.getByRole('button', { name: '5 + 2 rows' }).click();
      await page.waitForTimeout(100);
      await shot(page, 'grade5_split_' + theme);
      expect(await run()).toEqual([]);
      m = await page.evaluate(MEASURE);
      expect(m.parts.length).toBe(2);
      expect(m.parts.filter((r) => r < 4.5), JSON.stringify(m.parts)).toEqual([]);
      expect(m.marks.filter((r) => r < 3), JSON.stringify(m.marks)).toEqual([]);
      expect(m.words.filter((w) => w.ratio < 4.5)).toEqual([]);
      expect(errs).toEqual([]);
      await close();
    }, 120000);

    it(theme + ': a 12 x 12 frame and a split fit a 320 px phone, with 44 px targets', async () => {
      const { page, close } = await open(theme, '5th Grade', VISUAL(12, 12), { w: 320, h: 900 });
      const fit = () => page.evaluate(() => {
        const f = document.querySelector('[data-mt-frame]').getBoundingClientRect();
        const c = document.querySelector('[data-mt-predict]').getBoundingClientRect();
        return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, inCard: f.left >= c.left && f.right <= c.right, w: f.width, h: f.height, targets: [...document.querySelectorAll('[data-mt-frame-split] button')].map((b) => b.getBoundingClientRect().height) };
      });
      let r = await fit();
      expect(r.sw).toBeLessThanOrEqual(r.cw);
      expect(r.inCard).toBe(true);
      expect(r.w).toBeGreaterThan(120);
      for (const h of r.targets) expect(h).toBeGreaterThanOrEqual(44);
      await shot(page, 'phone_' + theme);
      await page.getByRole('button', { name: '6 + 6 rows' }).click();
      r = await fit();
      expect(r.sw).toBeLessThanOrEqual(r.cw);
      await close();
    }, 120000);
  }

  it('the keyboard reaches the split buttons, and focus stays on the one pressed', async () => {
    const { page, close } = await open('light', '5th Grade', VISUAL(7, 8));
    await page.locator('#mt-visual-b').focus();
    const seen = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const t = await page.evaluate(() => document.activeElement.textContent);
      seen.push(t);
      if (t === '5 + 2 rows') break;
    }
    expect(seen).toContain('5 + 2 rows');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(80);
    let st = await page.evaluate(() => ({ t: document.activeElement.textContent, p: document.activeElement.getAttribute('aria-pressed'), parts: document.querySelector('[data-mt-frame]').getAttribute('data-mt-frame-parts') }));
    expect(st).toEqual({ t: '✓ 5 + 2 rows', p: 'true', parts: '5,2' });
    await page.keyboard.press('Space');
    await page.waitForTimeout(80);
    st = await page.evaluate(() => ({ t: document.activeElement.textContent, p: document.activeElement.getAttribute('aria-pressed'), parts: document.querySelector('[data-mt-frame]').getAttribute('data-mt-frame-parts') }));
    expect(st).toEqual({ t: '5 + 2 rows', p: 'false', parts: '' });
    await close();
  }, 120000);

  it('a real finger: one tap makes one split, and the page still scrolls from the frame', async () => {
    const { page, close } = await open('light', '5th Grade', VISUAL(12, 8), { w: 390, h: 500, touch: true });
    const box = await page.getByRole('button', { name: '5 + 7 rows' }).boundingBox();
    await page.getByRole('button', { name: '5 + 7 rows' }).scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: '5 + 7 rows' }).tap();
    await page.waitForTimeout(150);
    expect(box).toBeTruthy();
    expect(await page.locator('[data-mt-frame]').getAttribute('data-mt-frame-parts')).toBe('5,7');
    expect((await page.evaluate(() => window.__sr)).filter((s) => s.startsWith('Split into')).length).toBe(1);
    await page.evaluate(() => { document.querySelector('[data-mt-frame]').scrollIntoView({ block: 'start' }); window.__sr.length = 0; });
    await page.waitForTimeout(80);
    const fb = await page.locator('[data-mt-frame]').boundingBox();
    const cdp = await page.context().newCDPSession(page);
    const before = await page.evaluate(() => window.scrollY);
    expect(before).toBeGreaterThan(100);
    const x = fb.x + fb.width / 2;
    const y = fb.y + 30;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 10; i += 1) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + i * 18 }] }); await page.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(before - 40);
    expect(await page.evaluate(() => window.__sr)).toEqual([]);
    await close();
  }, 120000);

  it('K-2 keep the dots: axe is clean and the total stays hidden', async () => {
    const { page, close } = await open('light', '2nd Grade', VISUAL(3, 5));
    expect(await page.locator('[data-mt-live-array] .allo-mt-dot').count()).toBe(15);
    expect(await page.locator('[data-mt-frame]').count()).toBe(0);
    await shot(page, 'grade2_light');
    await page.addScriptTag({ content: axeSource });
    const v = await page.evaluate(async () => (await axe.run('[data-mt-predict]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.map((x) => x.id));
    expect(v).toEqual([]);
    expect(await page.locator('[data-mt-predict]').textContent()).not.toMatch(/\b15\b/);
    await close();
  }, 120000);
});
