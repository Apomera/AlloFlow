// Canvas text contrast, measured against the pixels actually behind each label.
//
//   node dev-tools/canvas_contrast_probe.mjs <toolId> [tab,tab,...] [--light]
//   node dev-tools/canvas_contrast_probe.mjs migration vformation,wind,routes,aero,navigate
//   node dev-tools/canvas_contrast_probe.mjs migration routes --light --json
//
// Why this exists: every contrast check in this repo is blind to canvas text.
// axe treats a <canvas> as one opaque element. Grepping fillStyle out of the
// source gives you the ink but not the ground, and on a STEM Lab canvas the
// ground is a gradient sky, a landmass, an ocean or a data line depending on
// where the label happens to land. A theme-blind literal that reads fine on the
// dark canvas can sit at 1.7:1 on the light one, and nothing will tell you.
//
// Method: patch fillText, and sample the canvas at DRAW time -- right before
// the glyphs land, the pixels under them are exactly the ground they will land
// on, including any halo the same call is about to stroke.
//
// Two traps this probe had to learn the hard way, both of which produced
// confident wrong answers:
//
//   1. A "paint one frame with the text suppressed, then sample" approach
//      depends on the tool's own rAF loop repainting inside the window you
//      wait. When it does not, you sample the PREVIOUS frame -- halo and all --
//      and report fixed, high-contrast labels as broken.
//   2. fillText coordinates are in the CURRENT TRANSFORM space. These canvases
//      translate for letterboxing and scale for both the map fit and
//      devicePixelRatio. Multiplying by dpr alone samples the wrong pixel
//      entirely: opaque chips came back reading as open ocean.
//
// It reports WCAG 1.4.3 (4.5:1, or 3:1 for large text). Purely decorative
// glyphs drawn with fillText are held to the same bar here; judge those by eye.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const positional = args.filter((a) => !a.startsWith('--'));
const TOOL_ID = positional[0];
if (!TOOL_ID) {
  console.error('usage: node dev-tools/canvas_contrast_probe.mjs <toolId> [tab,tab,...] [--light] [--json]');
  process.exit(2);
}
const TABS = positional[1] ? positional[1].split(',') : [null];
const DARK = !flags.has('--light');
const ROOT = process.cwd();
const toolPath = resolve(ROOT, 'stem_lab/stem_tool_' + TOOL_ID + '.js');
if (!existsSync(toolPath)) { console.error('no such tool: ' + toolPath); process.exit(2); }

const browser = await chromium.launch();
const rows = [];

for (const tab of TABS) {
  const ctxb = await browser.newContext({ viewport: { width: 900, height: 1000 } });
  const page = await ctxb.newPage();
  page.on('pageerror', (e) => console.error('[pageerror ' + tab + '] ' + String(e).slice(0, 200)));

  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body{margin:0;padding:16px;background:${DARK ? '#0f172a' : '#fff'};color:${DARK ? '#e2e8f0' : '#0f172a'};font-family:system-ui,sans-serif}
  .space-y-3>*+*{margin-top:.75rem}.space-y-2>*+*{margin-top:.5rem}.space-y-4>*+*{margin-top:1rem}</style>
  </head><body><div id="root"></div></body></html>`, { waitUntil: 'domcontentloaded' });

  await page.evaluate(() => {
    const P = CanvasRenderingContext2D.prototype;
    const realFill = P.fillText;
    const realStroke = P.strokeText;
    window.__recs = [];
    P.strokeText = function (txt, x, y, mw) {
      this.__lastHalo = String(this.strokeStyle);
      return mw === undefined ? realStroke.call(this, txt, x, y) : realStroke.call(this, txt, x, y, mw);
    };
    P.fillText = function (txt, x, y, mw) {
      const s = txt == null ? '' : String(txt);
      if (s.trim() && window.__recs.length < 4000) {
        const size = parseFloat((String(this.font).match(/(\d+(?:\.\d+)?)px/) || [0, 10])[1]);
        const w = this.measureText(s).width;
        const m = this.getTransform();
        const dx = this.textAlign === 'center' ? -w / 2 : this.textAlign === 'right' ? -w : 0;
        const dy = this.textBaseline === 'middle' ? -size * 0.36
                 : this.textBaseline === 'top' ? size * 0.28 : -size * 0.36;
        const grounds = [];
        try {
          for (const fx of [0.18, 0.5, 0.82]) {
            const ux = x + dx + w * fx, uy = y + dy;
            const px = Math.round(m.a * ux + m.c * uy + m.e);
            const py = Math.round(m.b * ux + m.d * uy + m.f);
            if (px < 0 || py < 0 || px >= this.canvas.width || py >= this.canvas.height) continue;
            const d = this.getImageData(px, py, 1, 1).data;
            grounds.push([d[0], d[1], d[2]]);
          }
        } catch (e) { /* tainted or zero-size */ }
        if (grounds.length) {
          window.__recs.push({ text: s, ink: String(this.fillStyle), font: String(this.font), alpha: this.globalAlpha, size, grounds });
        }
        this.__lastHalo = null;
      }
      return mw === undefined ? realFill.call(this, txt, x, y) : realFill.call(this, txt, x, y, mw);
    };
    window.AlloIcons = new Proxy({}, {
      get: () => function Icon() { return window.React.createElement('span', { 'aria-hidden': 'true' }, '▪'); },
      has: () => true
    });
  });

  await page.addScriptTag({ path: resolve(ROOT, 'desktop/web-app/node_modules/react/umd/react.development.js') });
  await page.addScriptTag({ path: resolve(ROOT, 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js') });
  await page.addScriptTag({ path: toolPath });

  const started = await page.evaluate(({ toolId, tab, isDark }) => {
    // The id a tool registers under is not always its file name:
    // stem_tool_watercycle.js registers 'waterCycle'. Resolve it case-
    // insensitively, and fall back to the only registered tool if there is one.
    const reg = (window.StemLab && window.StemLab._registry) || {};
    const ids = Object.keys(reg);
    let id = reg[toolId] ? toolId
      : ids.find((k) => k.toLowerCase() === String(toolId).toLowerCase())
      || (ids.length === 1 ? ids[0] : null);
    const tool = id && reg[id];
    if (!tool) return 'tool did not register (registry has: ' + (ids.join(', ') || 'nothing') + ')';
    toolId = id;
    let store = { [toolId]: tab ? { tab } : {} };
    let setTick = null;
    const ctx = {
      React: window.React,
      get toolData() { return store; },
      update: (t, k, v) => { store = { ...store, [t]: { ...store[t], [k]: v } }; setTick && setTick((n) => n + 1); },
      updateMulti: (t, o) => { store = { ...store, [t]: { ...store[t], ...o } }; setTick && setTick((n) => n + 1); },
      addToast: () => {}, announceToSR: () => {}, t: (k, fb) => (fb == null ? k : fb),
      isDark, setStemLabTool: () => {}, awardXP: () => {}, beep: () => {}, icons: window.AlloIcons
    };
    function Host() { const [, tick] = window.React.useState(0); setTick = tick; return tool.render(ctx); }
    try { window.ReactDOM.render(window.React.createElement(Host), document.getElementById('root')); }
    catch (e) { return 'render threw: ' + String(e).slice(0, 160); }
    return 'ok';
  }, { toolId: TOOL_ID, tab, isDark: DARK });
  if (started !== 'ok') { console.error('[' + (tab || 'default') + '] ' + started); await ctxb.close(); continue; }

  await page.waitForTimeout(1500);
  const found = await page.evaluate(() => {
    const seen = new Map();
    for (const r of window.__recs) {
      const k = r.text + '|' + r.ink + '|' + Math.round(r.size);
      const prev = seen.get(k);
      // Keep every ground a moving label passed over: it is only as readable
      // as its unluckiest position.
      if (!prev) seen.set(k, r); else prev.grounds = prev.grounds.concat(r.grounds);
    }
    return Array.from(seen.values());
  });
  for (const r of found) rows.push({ tab: tab || 'default', ...r });
  await ctxb.close();
}
await browser.close();

function parseInk(ink) {
  if (typeof ink !== 'string') return null;
  let m = ink.match(/^#([0-9a-f]{6})$/i);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat([1]);
  m = ink.match(/^#([0-9a-f]{3})$/i);
  if (m) return [0, 1, 2].map((i) => parseInt(m[1][i] + m[1][i], 16)).concat([1]);
  m = ink.match(/rgba?\(([^)]+)\)/i);
  if (m) { const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
  return null;
}
const srgb = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = (r, g, b) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const ratio = (a, b) => { const la = lum(...a), lb = lum(...b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };

const out = [];
for (const r of rows) {
  const ink = parseInk(r.ink);
  if (!ink) continue;
  const a = (ink[3] == null ? 1 : ink[3]) * (r.alpha == null ? 1 : r.alpha);
  let worst = Infinity, worstBg = null;
  for (const bg of r.grounds) {
    // Composite the ink over this ground at its real alpha first: a translucent
    // ink is not the colour it names.
    const eff = [0, 1, 2].map((i) => ink[i] * a + bg[i] * (1 - a));
    const c = ratio(eff, bg);
    if (c < worst) { worst = c; worstBg = bg; }
  }
  const large = r.size >= 24 || (/bold/i.test(r.font) && r.size >= 18.66);
  out.push({ tab: r.tab, text: r.text, ink: r.ink, size: r.size, worst, need: large ? 3 : 4.5, worstBg });
}
out.sort((x, y) => x.worst - y.worst);
const fails = out.filter((r) => r.worst < r.need);

if (flags.has('--json')) {
  console.log(JSON.stringify({ tool: TOOL_ID, theme: DARK ? 'dark' : 'light', measured: out.length, failing: fails.length, fails }, null, 2));
} else {
  console.log(TOOL_ID + ' - ' + (DARK ? 'DARK' : 'LIGHT') + ' theme, canvas text vs the pixels behind it');
  console.log('measured ' + out.length + ' labels, ' + fails.length + ' below their WCAG threshold\n');
  for (const r of fails.slice(0, 40)) {
    const bg = r.worstBg ? '#' + r.worstBg.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('') : '?';
    console.log('  ' + r.worst.toFixed(2).padStart(5) + ':1 (need ' + r.need + ')  ' + r.tab.padEnd(11) +
      String(Math.round(r.size)).padStart(2) + 'px  ink ' + r.ink.slice(0, 22).padEnd(23) + 'on ' + bg + '  ' + JSON.stringify(r.text).slice(0, 40));
  }
  if (fails.length > 40) console.log('  ... and ' + (fails.length - 40) + ' more');
}
if (!out.length) {
  console.error([
    '',
    'NO LABELS MEASURED. This is not a pass: the tool never rendered, drew no',
    'canvas text, or the tab names are wrong. Pass the tab ids as the second',
    'argument, e.g. `... migration vformation,wind,routes`.'
  ].join('\n'));
  process.exit(2);
}
process.exit(fails.length ? 1 : 0);
