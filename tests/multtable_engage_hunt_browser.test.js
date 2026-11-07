// Multiplication Table hunt (2026-11-04) in Chromium, inside the REAL host wrapper: AppStyles, the
// StemLab.renderTool shell (the white surface card in dark), the theme class and the hub's own rules.
// axe cannot see these: the contrast theme forces td/th/span text yellow, so a pale inline fill is 1:1.
// Also real touch (hasTouch + CDP): a tap fires once, a swipe from a row scrolls the page.
// MULTTABLE_DEEP_SRC runs it against another copy of the tool.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const SRC = path.resolve(ROOT, process.env.MULTTABLE_DEEP_SRC || 'stem_lab/stem_tool_multtable.js');
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
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/app/static/css/${cssName}">
<style>html,body{margin:0;background:${bg}} #wrap{padding:12px;box-sizing:border-box;max-width:100%}${VARS}</style><style>${hub}</style></head>
<body class="${theme === 'dark' ? 'theme-dark' : theme === 'contrast' ? 'theme-contrast' : ''}"><div id="wrap" data-stem-lab="true"></div>
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
  await page.goto(`${base}/__mt/${theme}/${encodeURIComponent(grade)}`);
  await page.waitForFunction(() => window.AlloModules && window.AlloModules.AppStyles && window.StemLab && window.StemLab.renderTool && (window.StemLab._registry || {}).multtable, null, { timeout: 60000 });
  await page.evaluate(([s, c]) => window.__mount(s, c), [seed || {}, o.challenge || null]);
  await page.waitForSelector('[data-multtable-root]', { timeout: 60000 });
  await page.waitForTimeout(250);
  return { page, close: () => context.close() };
}
// Contrast of each element's text (or fill, in SVG) against what is really behind it.
const INK = (selectors) => {
  const parse = (c) => { const p = String(c).match(/[\d.]+/g).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] == null ? 1 : p[3] }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bgOf = (el) => { for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c.a > 0) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  return selectors.flatMap((sel) => [...document.querySelectorAll(sel)].map((el) => {
    const svg = !!el.closest('svg');
    const fg = parse(svg ? getComputedStyle(el).fill : getComputedStyle(el).color);
    const x = lum(fg); const y = lum(bgOf(el));
    return { sel, text: el.textContent.slice(0, 20), ratio: +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2) };
  }));
};
const low = (rows, need = 4.5) => rows.filter((r) => r.ratio < need);

describe('contrast theme: cells and boxes axe cannot judge', () => {
  it('the mastery heatmap symbols and its key can be read', async () => {
    const { page, close } = await open('contrast', '4th Grade', { _multExt: { mtTab: 'practice', showHeatmap: true, factScores: { '2x3': { attempts: 3, correct: 3 }, '2x4': { attempts: 3, correct: 2 }, '2x5': { attempts: 3, correct: 0 } } } });
    const rows = await page.evaluate(INK, ['[data-mt-grid="heat"] td', '[data-mt-heatmap] ul span']);
    expect(rows.length).toBeGreaterThan(144);
    expect(low(rows)).toEqual([]);
    await close();
  }, 90000);

  it('selecting a cell: the headers stay readable, and selected and twin cells are marked without a fill', async () => {
    const { page, close } = await open('contrast', '4th Grade', { _multExt: { mtTab: 'practice' } });
    await page.locator('details[data-full-fact-table]').evaluate((d) => { d.open = true; });
    await page.locator('[data-mt-grid="table"] td[data-r="3"][data-c="7"]').click();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(100);
    expect(low(await page.evaluate(INK, ['[data-mt-grid="table"] th', '[data-mt-grid="table"] td']))).toEqual([]);
    const marks = await page.evaluate(() => ['td[data-r="3"][data-c="7"]', 'td[data-r="7"][data-c="3"]', 'td[data-r="4"][data-c="4"]'].map((q) => {
      const s = getComputedStyle(document.querySelector('[data-mt-grid="table"] ' + q));
      return s.outlineStyle;
    }));
    expect(marks).toEqual(['double', 'dashed', 'none']);
    await close();
  }, 90000);

  it('the strategy array after a reveal keeps its dots, split line and labels on the black card', async () => {
    const { page, close } = await open('contrast', '4th Grade', { _multExt: { mtTab: 'practice' } });
    await page.getByRole('button', { name: 'Quick Quiz' }).click();
    await page.waitForTimeout(100);
    for (let i = 0; i < 3; i += 1) { if (await page.locator('#multtable-input').isDisabled()) break; await page.locator('#multtable-input').fill('0'); await page.keyboard.press('Enter'); await page.waitForTimeout(80); }
    await page.locator('[data-fact-strategy]').evaluate((d) => { d.open = true; });
    await page.waitForTimeout(60);
    const ink = await page.evaluate(() => {
      const lum = (c) => { const p = String(c).match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(p[0]) + 0.7152 * f(p[1]) + 0.0722 * f(p[2]); };
      const svg = document.querySelector('[data-fact-strategy-array]');
      const bg = lum(getComputedStyle(svg).backgroundColor);
      const cr = (c) => { const x = lum(c); return +((Math.max(x, bg) + 0.05) / (Math.min(x, bg) + 0.05)).toFixed(2); };
      return { text: [...svg.querySelectorAll('text')].map((t) => cr(getComputedStyle(t).fill)), dots: [...svg.querySelectorAll('circle')].map((c) => cr(getComputedStyle(c).fill)) };
    });
    for (const r of ink.text) expect(r).toBeGreaterThanOrEqual(4.5);
    for (const r of ink.dots) expect(r).toBeGreaterThanOrEqual(3);
    await close();
  }, 90000);

  it('a counted row is marked in every theme, not only by a fill the theme removes', async () => {
    for (const theme of ['light', 'dark', 'contrast']) {
      const { page, close } = await open(theme, '1st Grade', { _multExt: { visualA: 4, visualB: 5, visualPred: { key: '4x5', built: true, committed: null } } });
      await page.locator('[data-mt-skiprow="2"]').click();
      await page.waitForTimeout(80);
      const t = await page.evaluate(() => [...document.querySelectorAll('[data-mt-skip-total]')].map((n) => n.textContent));
      expect(t.map((x) => x.includes('✓')), theme).toEqual([true, true, false, false]);
      await close();
    }
  }, 120000);
});

describe('at 320 px the whole array is on screen', () => {
  for (const theme of ['light', 'dark', 'contrast']) {
    it('no dot is cut off or scrolled away, live or built, and dots stay round: ' + theme, async () => {
      for (const [a, b] of [[12, 12], [7, 8], [2, 10]]) {
        for (const built of [false, true]) {
          const seed = { _multExt: { mtTab: 'visual', visualA: a, visualB: b } };
          if (built) seed._multExt.visualPred = { key: a + 'x' + b, built: true, committed: null };
          const { page, close } = await open(theme, '1st Grade', seed, { w: 320, h: 800 });
          const r = await page.evaluate(() => {
            const box = document.querySelector('[data-mt-live-array],[data-mt-built]');
            const bb = box.getBoundingClientRect();
            const dots = [...document.querySelectorAll('.allo-mt-dot')].map((d) => d.getBoundingClientRect());
            const rows = [...document.querySelectorAll('[data-mt-skiprow]')].map((d) => d.getBoundingClientRect());
            return { page: document.documentElement.scrollWidth - document.documentElement.clientWidth, scroll: box.scrollWidth - box.clientWidth,
              left: Math.min(...dots.map((d) => d.left)) - bb.left, right: bb.right - Math.max(...dots.map((d) => d.right)), n: dots.length,
              minW: Math.min(...dots.map((d) => d.width)), round: Math.max(...dots.map((d) => Math.abs(d.width - d.height))), rowH: rows.length ? Math.min(...rows.map((x) => x.height)) : null,
              rowLeft: rows.length ? Math.min(...rows.map((x) => x.left)) - bb.left : 0 };
          });
          const tag = theme + ' ' + a + 'x' + b + (built ? ' built ' : ' live ') + JSON.stringify(r);
          expect(r.n, tag).toBe(a * b);
          expect(r.page, tag).toBeLessThanOrEqual(0);
          expect(r.scroll, tag).toBeLessThanOrEqual(0);
          expect(r.left, tag).toBeGreaterThanOrEqual(0);
          expect(r.rowLeft, tag).toBeGreaterThanOrEqual(0);
          expect(r.right, tag).toBeGreaterThanOrEqual(0);
          expect(r.minW, tag).toBeGreaterThanOrEqual(7);
          expect(r.round, tag).toBeLessThanOrEqual(1);
          if (built) expect(r.rowH, tag).toBeGreaterThanOrEqual(44);
          await close();
        }
      }
    }, 240000);
  }
});

describe('keyboard through a Speed Run', () => {
  it('focus is not dropped after an answer and comes back to the answer box for the next question; a learner who moved on stays put', async () => {
    const { page, close } = await open('light', '4th Grade', { _multExt: { mtTab: 'practice', quizMode: 'mult', difficulty: 'easy' } });
    await page.getByRole('button', { name: 'Speed Run (2min)' }).click();
    await page.waitForTimeout(120);
    const answer = async () => {
      const q = await page.locator('#multtable-q').textContent();
      const [a, b] = q.match(/\d+/g).map(Number);
      await page.locator('#multtable-input').fill(String(a * b));
      await page.keyboard.press('Enter');
    };
    const activeIs = () => page.evaluate(() => (document.activeElement.hasAttribute('data-mt-next') ? 'next' : document.activeElement.id || document.activeElement.getAttribute('aria-label') || document.activeElement.tagName));
    await answer();
    await page.waitForTimeout(120);
    expect(await activeIs()).toBe('next');
    await page.waitForTimeout(1400);
    expect(await activeIs()).toBe('multtable-input');
    await answer();
    await page.waitForTimeout(120);
    await page.getByRole('button', { name: 'Pause Speed Run' }).focus();
    await page.waitForTimeout(1400);
    expect(await activeIs()).toBe('Pause Speed Run');
    await close();
  }, 90000);
});

describe('real touch on skip-count rows', () => {
  it('a tap counts once, rapid taps stay one count and pay nothing, and a swipe from a row scrolls the page', async () => {
    const { page, close } = await open('light', '1st Grade', { _multExt: { visualA: 6, visualB: 5, visualSkipOn: false, visualPred: { key: '6x5', built: true, committed: null } } }, { touch: true, w: 390, h: 700 });
    await page.evaluate(() => { document.querySelector('[data-mt-skiprow="3"]').scrollIntoView({ block: 'center' }); window.__clicks = 0; document.addEventListener('click', () => { window.__clicks += 1; }, true); window.__sr.length = 0; });
    await page.waitForTimeout(80);
    const b = await page.locator('[data-mt-skiprow="3"]').boundingBox();
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__clicks)).toBe(1);
    expect(await page.evaluate(() => window.__sr)).toEqual(['3 rows of 5 make 15.']);
    expect(await page.locator('[data-mt-skip-said]').textContent()).toBe('Skip-count so far: 5, 10, 15');
    for (let i = 0; i < 8; i += 1) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__xp)).toEqual([]);
    expect(await page.locator('[data-mt-skip-said]').textContent()).toBe('Skip-count so far: 5, 10, 15');
    const before = await page.evaluate(() => { window.__sr.length = 0; return scrollY; });
    const r = await page.locator('[data-mt-skiprow="5"]').boundingBox();
    const cdp = await page.context().newCDPSession(page);
    const x = r.x + r.width / 2; const y = r.y + r.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 10; i += 1) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 18 }] }); await page.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(before + 40);
    expect(await page.evaluate(() => window.__sr)).toEqual([]);
    await close();
  }, 90000);
});
