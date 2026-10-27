// Night Sky accessibility audit (2026-10-25). Run from the repo root:
//   node dev-tools/astronomy_a11y_audit.cjs <tabs|all> <outfile.json> [--axe] [--noclick] [--max=16] [--themes=night,contrast] [--state='{"tab":{...}}']
// Why it exists: axe reports colour-contrast for this tool as "incomplete" (SVG text over shapes, gradients,
// translucent layers) and never fails it. This resolves every text run against what is really painted behind it,
// and clicks every picker so the states axe never reaches are measured too.
// Per tab/theme: default state + one state per pressable picker button. Checks:
//   contrast (HTML + SVG-aware), 320px reflow, 1.4.12 text spacing clipping, 2.5.8 target size, axe (optional; colour-contrast rule off because the probe replaces it).
// Not checked here: 1.4.11 non-text contrast of graphics, forced-colors rendering, screen-reader output.
const { createRequire } = require('node:module');
const ROOT = process.cwd().split('\\').join('/');
const req = createRequire(ROOT + '/package.json');
const { chromium } = req('playwright');
const http = require('node:http'); const fs = require('node:fs'); const path = require('node:path');
const args = process.argv.slice(2);
const flag = n => args.some(a => a === '--' + n);
const opt = (n, d) => { const a = args.find(x => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const pos = args.filter(a => !a.startsWith('--'));
const spec = fs.readFileSync(ROOT + '/tests/e2e/astronomy-observatory-3d.spec.ts', 'utf8');
const HARNESS = spec.split('const HARNESS = `')[1].split('`;')[0]
  .replace("gradeLevel: '8th Grade',", "gradeLevel: '8th Grade', isContrast: window.__contrast === true, theme: window.__contrast ? 'contrast' : 'dark',");
// The desktop copy of axe is newer and enforces rules the root copy predates (e.g. landmark nesting); prefer it.
const AXE_FILE = [ROOT + '/desktop/web-app/node_modules/axe-core/axe.min.js', ROOT + '/node_modules/axe-core/axe.min.js'].find(f => fs.existsSync(f));
const AXE = fs.readFileSync(AXE_FILE, 'utf8');
const ALL = ['tonight','skymap','constellations','meteors','observatory','moon','planets','exoplanets','seasons','stars','galaxies','eclipses','indigenous','history','observe','quiz','print','hrDiagram'];
const TABS = pos[0] && pos[0] !== 'all' ? pos[0].split(',') : ALL;
const OUT = pos[1] || (process.cwd() + '/astronomy_a11y_audit.json');
const THEMES = opt('themes', 'night,contrast').split(',');
const EXTRA = opt('state') ? JSON.parse(opt('state')) : {};
const MIME = { '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css' };

const PROBE = () => {
  function parse(c) { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
  function over(top, bot) { const a = top.a + bot.a * (1 - top.a); if (!a) return { r: 0, g: 0, b: 0, a: 0 }; return { r: (top.r * top.a + bot.r * bot.a * (1 - top.a)) / a, g: (top.g * top.a + bot.g * bot.a * (1 - top.a)) / a, b: (top.b * top.a + bot.b * bot.a * (1 - top.a)) / a, a }; }
  function lum(c) { const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
  function ratio(a, b) { const A = lum(a), B = lum(b); return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05); }
  function hex(c) { return '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join(''); }
  function bgStack(el) {
    const layers = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (n !== el && ['CANVAS', 'VIDEO', 'IMG'].includes(n.tagName)) return { unresolved: 'media' };
      const bi = cs.backgroundImage, bc = parse(cs.backgroundColor);
      if (bi && bi !== 'none') { const stops = (bi.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean); if (!stops.length) return { unresolved: 'image' }; layers.push({ stops }); }
      if (bc && bc.a > 0) layers.push({ solid: bc });
      if (layers.some(l => l.solid && l.solid.a === 1)) break;
    }
    let cands = [{ r: 255, g: 255, b: 255, a: 1 }];
    for (let i = layers.length - 1; i >= 0; i--) { const l = layers[i]; cands = l.solid ? cands.map(c => over(l.solid, c)) : l.stops.flatMap(s => cands.map(c => over(s, c))); }
    return { cands };
  }
  function opacityChain(el, stopAt) { let o = 1; for (let n = el; n && n.nodeType === 1 && n !== stopAt; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; }
  function gradStops(fill, svg) { const id = /url\(["']?#([^"')]+)/.exec(fill); if (!id) return null; const g = svg.ownerDocument.getElementById(id[1]); if (!g) return null; return [...g.querySelectorAll('stop')].map(s => { const cs = getComputedStyle(s); const c = parse(cs.stopColor); if (c) c.a *= parseFloat(cs.stopOpacity); return c; }).filter(Boolean); }
  function svgBg(t) {
    const svg = t.ownerSVGElement; const base = bgStack(svg); if (base.unresolved) return base; let cands = base.cands;
    const bb = t.getBoundingClientRect(); const sx = bb.left + bb.width / 2, sy = bb.top + bb.height / 2;
    const shapes = [...svg.querySelectorAll('circle,rect,ellipse,path,polygon,polyline')].filter(s => (s.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING) && !s.closest('defs,clipPath,mask,marker,pattern,symbol'));
    for (const s of shapes) {
      const cs = getComputedStyle(s); if (cs.visibility === 'hidden' || cs.display === 'none' || !cs.fill || cs.fill === 'none') continue;
      const m = s.getScreenCTM(); if (!m) continue; const pt = svg.createSVGPoint(); pt.x = sx; pt.y = sy; const lp = pt.matrixTransform(m.inverse());
      let inside = false; try { inside = s.isPointInFill(lp); } catch (e) {} if (!inside) continue;
      const op = parseFloat(cs.fillOpacity) * opacityChain(s, svg.parentElement);
      const stops = cs.fill.startsWith('url(') ? gradStops(cs.fill, svg) : [parse(cs.fill)];
      if (!stops || !stops.length) return { unresolved: 'svg-paint' };
      cands = stops.flatMap(st => cands.map(c => over({ ...st, a: st.a * op }, c)));
    }
    return { cands };
  }
  const out = [];
  const root = document.getElementById('wrap');
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const seen = new Set();
  while (walker.nextNode()) {
    const tn = walker.currentNode; const txt = tn.nodeValue.replace(/\s+/g, ' ').trim(); if (!txt) continue;
    const el = tn.parentElement; if (!el || seen.has(el)) continue;
    if (['SCRIPT', 'STYLE', 'OPTION', 'TITLE', 'DESC'].includes(el.tagName.toUpperCase())) continue;
    const isSvg = !!el.closest('svg'); const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('.astr-sr-only')) continue;
    seen.add(el);
    const opacity = opacityChain(el, root);
    const fgRaw = parse(isSvg ? cs.fill : cs.color); if (!fgRaw) continue;
    let bs = isSvg ? svgBg(el) : bgStack(el);
    // A halo painted under the glyphs (paint-order: stroke, >= 2 units) is the text's real background.
    const halo = isSvg && /^stroke/.test(cs.paintOrder || '') && parseFloat(cs.strokeWidth) >= 2 ? parse(cs.stroke) : null;
    if (halo && bs.cands) bs = { cands: bs.cands.map(c => over({ ...halo, a: halo.a * opacity }, c)) };
    let size = parseFloat(cs.fontSize); if (isSvg) { const m = el.getScreenCTM(); if (m) size *= Math.sqrt(m.a * m.a + m.b * m.b); }
    const weight = parseInt(cs.fontWeight) || 400; const large = size >= 24 || (size >= 18.66 && weight >= 700); const need = large ? 3 : 4.5;
    const dis = !!(el.closest('button,input,select,textarea') && el.closest('button,input,select,textarea').disabled) || el.closest('[aria-disabled=true]') !== null;
    const label = (el.closest('button,a,label,[role=button],[role=tab]') ? 'ctl ' : '') + (isSvg ? 'svg ' : '') + txt.slice(0, 50);
    if (bs.unresolved) { out.push({ kind: 'unresolved:' + bs.unresolved, text: label }); continue; }
    let worst = 99, worstBg = null;
    for (const bg of bs.cands) { const fg = (fgRaw.a < 1 || opacity < 1) ? over({ ...fgRaw, a: fgRaw.a * opacity }, bg) : fgRaw; const rr = ratio(fg, bg); if (rr < worst) { worst = rr; worstBg = bg; } }
    if (worst < need && !dis) out.push({ kind: 'fail', ratio: +worst.toFixed(2), need, fg: hex(fgRaw), bg: worstBg ? hex(worstBg) : '?', size: +size.toFixed(1), text: label, svg: isSvg });
  }
  return out;
};

const LAYOUT = () => {
  const root = document.getElementById('wrap'); const res = { overflow: [], targets: [], borders: [] };
  const vw = document.documentElement.clientWidth;
  // reflow: elements whose right edge exceeds the viewport and are not inside a scroll container
  const scrolls = n => { for (let p = n.parentElement; p && p !== root.parentElement; p = p.parentElement) { const o = getComputedStyle(p); if (/(auto|scroll)/.test(o.overflowX) && p.scrollWidth > p.clientWidth) return true; } return false; };
  for (const n of root.querySelectorAll('*')) {
    const r = n.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(n); if (cs.position === 'fixed' || cs.visibility === 'hidden') continue;
    if (n.closest('svg') && n.tagName.toLowerCase() !== 'svg') continue; if (n.closest('.astr-sr-only')) continue;
    if (r.right > vw + 2 && !scrolls(n)) res.overflow.push({ tag: n.tagName.toLowerCase(), id: n.id, cls: String(n.className && n.className.baseVal !== undefined ? n.className.baseVal : n.className).slice(0, 40), right: Math.round(r.right), w: Math.round(r.width), text: (n.textContent || '').trim().slice(0, 40) });
  }
  res.docScroll = document.documentElement.scrollWidth - vw;
  // target size (2.5.8): interactive controls under 24x24 CSS px (inline-in-sentence links exempt)
  for (const n of root.querySelectorAll('button,input:not([type=hidden]),select,textarea,[role=button],[role=tab],[role=slider],[role=radio],[role=checkbox],summary,a[href]')) {
    const r = n.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue; if (n.closest('.astr-sr-only')) continue;
    const cs = getComputedStyle(n); if (cs.visibility === 'hidden') continue;
    if (n.tagName === 'A' && cs.display === 'inline') continue;
    if (r.width < 24 || r.height < 24) res.targets.push({ tag: n.tagName.toLowerCase(), type: n.type || '', w: Math.round(r.width), h: Math.round(r.height), text: (n.getAttribute('aria-label') || n.textContent || '').trim().slice(0, 40) });
  }
  return res;
};

const CLIP = () => {
  const root = document.getElementById('wrap'); const hits = [];
  for (const n of root.querySelectorAll('*')) {
    if (n.closest('svg') || n.closest('.astr-sr-only')) continue;
    const cs = getComputedStyle(n); if (!/(hidden|clip)/.test(cs.overflowY + cs.overflowX)) continue;
    if (!(n.textContent || '').trim()) continue;
    if (n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1) hits.push({ tag: n.tagName.toLowerCase(), id: n.id, cls: String(n.className).slice(0, 40), sh: n.scrollHeight, ch: n.clientHeight, sw: n.scrollWidth, cw: n.clientWidth, text: (n.textContent || '').trim().slice(0, 40) });
  }
  return hits;
};

(async () => {
  const server = http.createServer((rq, rs) => {
    const u = decodeURIComponent((rq.url || '/').split('?')[0]);
    if (u === '/__harness') { rs.setHeader('content-type', 'text/html'); rs.end(HARNESS); return; }
    const f = path.resolve(ROOT, '.' + u); if (!f.startsWith(path.resolve(ROOT))) { rs.writeHead(403); rs.end(); return; }
    fs.readFile(f, (err, buf) => { if (err) { rs.writeHead(404); rs.end(); return; } rs.setHeader('content-type', MIME[path.extname(f)] || 'text/plain'); rs.end(buf); });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = { contrast: {}, overflow: {}, targets: {}, clip: {}, axe: {}, states: {} };
  const addUniq = (bucket, key, item, keyFn) => { const b = bucket[key] = bucket[key] || {}; const k = keyFn(item); if (!b[k]) b[k] = { ...item, n: 0, states: [] }; b[k].n++; };

  for (const theme of THEMES) {
    const contrast = theme === 'contrast';
    for (const tab of TABS) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 980 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage(); const errs = [];
      page.on('pageerror', e => errs.push(e.message));
      await page.goto(base + '/__harness');
      const st0 = Object.assign({ tab, observingList: [], obsSettingsOpen: true }, EXTRA[tab] || {});
      const mount = async () => { await page.evaluate(({ st, contrast }) => { window.__destroy && window.__destroy(); window.__contrast = contrast; window.__mount(st); }, { st: st0, contrast }); await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' }); await page.waitForTimeout(tab === 'observatory' || tab === 'meteors' ? 2200 : 350); };
      await mount();
      // enumerate pressable pickers once
      const pickers = flag('noclick') ? [] : await page.evaluate(() => {
        const main = document.getElementById('astronomy-main') || document.getElementById('wrap'); const out = [];
        [...main.querySelectorAll('button')].forEach((b, i) => { if (b.disabled) return; const pr = b.getAttribute('aria-pressed'); const ex = b.getAttribute('aria-expanded'); const sel = b.getAttribute('aria-selected'); const chk = b.getAttribute('aria-checked'); if (pr === 'false' || ex === 'false' || sel === 'false' || chk === 'false') out.push({ i, label: (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 40) }); });
        return out;
      });
      const stateList = [{ name: 'default', idx: null }].concat(pickers.slice(0, Number(opt('max', '18'))).map(p => ({ name: 'click:' + p.label, idx: p.i })));
      let stateCount = 0;
      for (const s of stateList) {
        try {
          if (s.idx !== null) {
            await mount();
            const ok = await page.evaluate(i => { const main = document.getElementById('astronomy-main') || document.getElementById('wrap'); const b = main.querySelectorAll('button')[i]; if (!b || b.disabled) return false; b.click(); return true; }, s.idx);
            if (!ok) continue; await page.waitForTimeout(700);
          }
          stateCount++;
          const key = tab + ':' + theme;
          const rows = await page.evaluate(PROBE);
          rows.filter(r => r.kind === 'fail').forEach(r => addUniq(results.contrast, key, { ...r, state: s.name }, x => x.fg + '/' + x.bg + '|' + x.text));
          rows.filter(r => r.kind !== 'fail').forEach(r => addUniq(results.contrast, key + ':unresolved', { ...r }, x => x.kind + '|' + x.text));
          Object.values(results.contrast[key] || {}).forEach(x => { if (!x.states.includes(s.name) && x.states.length < 3) x.states.push(s.name); });
          const clip0 = await page.evaluate(CLIP);
          // text spacing (WCAG 1.4.12)
          await page.addStyleTag({ content: '#wrap *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important} #wrap p{margin-bottom:2em!important}' }).then(h => h);
          const clip1 = await page.evaluate(CLIP);
          const before = new Set(clip0.map(c => c.tag + c.id + c.cls + c.text));
          clip1.filter(c => !before.has(c.tag + c.id + c.cls + c.text)).forEach(c => addUniq(results.clip, key, { ...c, state: s.name }, x => x.tag + x.id + x.cls + '|' + x.text));
          await page.evaluate(() => { document.querySelectorAll('style').forEach(st => { if (st.textContent.startsWith('#wrap *{line-height')) st.remove(); }); });
          // targets @1280
          const lay = await page.evaluate(LAYOUT);
          lay.targets.forEach(t => addUniq(results.targets, key, { ...t, state: s.name }, x => x.tag + x.type + '|' + x.text));
          if (flag('axe')) {
            await page.addScriptTag({ content: AXE }).catch(() => {});
            const ax = await page.evaluate(async () => { const r = await window.axe.run(document.getElementById('wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }, rules: { 'color-contrast': { enabled: false } }, resultTypes: ['violations'] }); return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, t: v.nodes.slice(0, 2).map(n => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n').slice(1, 3).join(' ').slice(0, 160)) })); });
            ax.forEach(v => addUniq(results.axe, key, { ...v, state: s.name }, x => x.id + '|' + x.t[0]));
          }
        } catch (e) { (results.states[tab + ':' + theme] = results.states[tab + ':' + theme] || []).push({ state: s.name, error: String(e).slice(0, 200) }); }
      }
      // 320px reflow (night only to save time; layout is theme-independent)
      if (!contrast || THEMES.length === 1) {
        await page.setViewportSize({ width: 320, height: 800 }); await page.waitForTimeout(200);
        for (const s of stateList.slice(0, 1)) {
          const lay = await page.evaluate(LAYOUT);
          lay.overflow.slice(0, 60).forEach(o => addUniq(results.overflow, tab, { ...o, docScroll: lay.docScroll }, x => x.tag + x.id + x.cls + '|' + x.text));
          if (lay.docScroll > 2) results.overflow[tab + ':DOCSCROLL'] = lay.docScroll;
        }
      }
      console.log((tab + ':' + theme).padEnd(24), 'states', stateCount, '| contrast', Object.keys(results.contrast[tab + ':' + theme] || {}).length, '| clip', Object.keys(results.clip[tab + ':' + theme] || {}).length, '| small targets', Object.keys(results.targets[tab + ':' + theme] || {}).length, '| overflow', Object.keys(results.overflow[tab] || {}).length, flag('axe') ? '| axe ' + Object.keys(results.axe[tab + ':' + theme] || {}).length : '', '| pageerrors', errs.length);
      await ctx.close();
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
  await browser.close(); server.close(); console.log('written', OUT);
})();
