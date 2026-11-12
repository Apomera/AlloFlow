// @vitest-environment jsdom
// Road Ready, round 31 contrast pass (tag ct31).
//
// Every view is rendered and wrapped the way the STEAM Lab host wraps a tool in each theme, then every text node's
// ink is compared with the surface under it (WCAG AA: 4.5:1, or 3:1 at >= 24px / >= 18.66px bold).
//   light     .theme-default  > [data-stem-tool-shell] (canvas = white)
//   dark      .theme-dark     > shell (dark canvas) > [data-stem-tool-surface] WHITE card, with the DARK variables
//   contrast  .theme-contrast > shell (black); the app forces yellow ink on every text element
// The host palette is read from app_styles_source.jsx, the tool's own rules from the style sheets it installs.
//
// jsdom does not resolve var(), has no layout and drops what it cannot parse, so this file carries a small resolver
// (custom properties, inherited ink, nearest painted ancestor) instead of getComputedStyle. What it cannot see:
//   - color-mix() is computed here by hand (plain sRGB mix), not by a browser;
//   - see-through tints and gradient ends: the ground is the first opaque colour, as in the browser sweep;
//   - whether a node is actually on screen, text drawn on <canvas>, hover/focus states, and the real cascade order.
// The real-browser sweep (harness/c1_sweep.cjs, c2_drive.cjs in the lane folder) is the proof for those.
import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
let loadTool, resetStemLab, renderTool, SRC, HOST, SHEETS = [];

beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, renderTool } = mod);
  SRC = readFileSync(path.resolve(process.cwd(), TOOL), 'utf8');
  HOST = readFileSync(path.resolve(process.cwd(), 'app_styles_source.jsx'), 'utf8');
  resetStemLab();
  loadTool(TOOL, 'roadReady');
  ['allo-rr-accent-css', 'allo-rr-pairs-css', 'allo-rr-layout-css'].forEach((id) => { const el = document.getElementById(id); if (el) SHEETS.push(el.textContent); });
});

// ── colour maths ──
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1], transparent: [0, 0, 0, 0] };
function parseColour(s) {
  if (!s) return null; s = String(s).trim();
  if (NAMED[s]) return NAMED[s];
  let m = /^#([0-9a-fA-F]{3,8})$/.exec(s);
  if (m) { let h = m[1]; if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h.slice(0, 6), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255, h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1]; }
  m = /^rgba?\(([^)]+)\)$/.exec(s);
  if (m) { const a = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat); return [a[0], a[1], a[2], a.length > 3 ? a[3] : 1]; }
  return null;
}
// color-mix(in srgb, A p%, B): the tool uses it for one selected-chip fill and the keyboard-sheet group inks
function mixDown(s) {
  let out = String(s), n = 0;
  while (/color-mix\(/.test(out) && n++ < 6) {
    const a = out.lastIndexOf('color-mix('); let depth = 0, b = a + 9; for (; b < out.length; b++) { if (out[b] === '(') depth++; else if (out[b] === ')') { depth--; if (depth === 0) break; } }
    const parts = []; let cur = '', d2 = 0; for (const ch of out.slice(a + 10, b)) { if (ch === '(') d2++; if (ch === ')') d2--; if (ch === ',' && d2 === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch; } parts.push(cur.trim());
    const one = (p) => { const m = /^(.*?)(?:\s+([\d.]+)%)?$/.exec(p); return { c: parseColour(m[1].trim()), p: m[2] != null ? +m[2] / 100 : null }; };
    const A = one(parts[1] || ''), B = one(parts[2] || ''); if (!A.c || !B.c) return out;
    let pa = A.p, pb = B.p; if (pa == null && pb == null) { pa = 0.5; pb = 0.5; } else if (pa == null) pa = 1 - pb; else if (pb == null) pb = 1 - pa;
    const mix = [0, 1, 2].map((k) => Math.round((A.c[k] * pa + B.c[k] * pb) / (pa + pb)));
    out = out.slice(0, a) + 'rgb(' + mix.join(', ') + ')' + out.slice(b + 1);
  }
  return out;
}
const firstColour = (s) => { const m = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/.exec(String(s)); return m ? parseColour(m[0]) : null; };

// ── a very small cascade ──
const WANT = /^(color|background|background-color|background-image|font-size|font-weight|--[\w-]+)$/;
function parseDecls(text) {
  const out = []; let depth = 0, cur = '';
  for (const ch of text + ';') { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ';' && depth === 0) { const i = cur.indexOf(':'); if (i > 0) { const prop = cur.slice(0, i).trim().toLowerCase(); let value = cur.slice(i + 1).trim(); const important = /!important\s*$/.test(value); value = value.replace(/\s*!important\s*$/, ''); if (WANT.test(prop)) out.push({ prop, value, important }); } cur = ''; } else cur += ch; }
  return out;
}
function parseSheet(css, origin) {
  const rules = []; let i = 0; css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  while (i < css.length) {
    const open = css.indexOf('{', i); if (open < 0) break;
    let depth = 1, j = open + 1; for (; j < css.length && depth; j++) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; }
    const sel = css.slice(i, open).trim(), body = css.slice(open + 1, j - 1); i = j;
    if (/^@media\s+screen$/.test(sel)) { parseSheet(body, origin).forEach((r) => rules.push(r)); continue; } // on screen: applies
    if (sel[0] === '@') continue; // width / hover media, keyframes: layout and motion only
    const decls = parseDecls(body); if (!decls.length) continue;
    sel.split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => {
      if (/:(hover|focus|active|disabled|before|after|focus-visible|last-child)|::/.test(s)) return;
      const last = s.split(/[\s>+~]+/).pop();
      const cls = (/\.([\w-]+)/.exec(last) || [])[1] || null, tag = (/^([a-z][a-z0-9]*)/.exec(last) || [])[1] || null;
      const spec = (s.match(/#[\w-]+/g) || []).length * 10000 + (s.match(/\.[\w-]+|\[[^\]]+\]|:root/g) || []).length * 100 + (s.match(/(^|[\s>+~])[a-z][a-z0-9]*/g) || []).length;
      rules.push({ sel: s, cls, tag, spec, decls, origin });
    });
  }
  return rules;
}
function hostRules(theme) {
  const block = (re) => { const m = re.exec(HOST); if (!m) throw new Error('host palette block not found: ' + re); return (m[1].match(/--allo-stem-[a-z-]+:\s*#[0-9a-fA-F]+/g) || []).join(';'); };
  const light = block(/:root, \.theme-default \{([^}]*--allo-stem-canvas[^}]*)\}/);
  const dark = block(/\.theme-dark \{([^}]*--allo-stem-canvas[^}]*)\}/);
  const hc = block(/\.theme-contrast \{([^}]*--allo-stem-canvas[^}]*)\}/);
  let css = ':root,.theme-default{' + light + '}.theme-dark{' + dark + '}.theme-contrast{' + hc + '}';
  if (theme === 'contrast') {
    // The app's high-contrast rules that reach text inside a STEM tool (app_styles_source.jsx). Each is checked below.
    css += '.theme-contrast{background-color:#000000!important;color:#ffff00!important}'
      + ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div', 'li', 'label', 'summary', 'strong', 'em', 'small', 'td', 'th', 'dt', 'dd', 'kbd', 'code'].map((t) => '.theme-contrast ' + t).join(',') + '{color:#ffff00!important}'
      + '.theme-contrast button{background-color:#000000!important;background-image:none!important;color:#00ff00!important}';
  }
  return css;
}

function buildModel(html, theme) {
  const rules = [].concat(parseSheet(hostRules(theme), 'host'), ...SHEETS.map((s) => parseSheet(s, 'tool')));
  rules.forEach((r, k) => { r.order = k; });
  const shellStyle = 'background:var(--allo-stem-canvas, #0f172a);color:var(--allo-stem-text, #e2e8f0)';
  const inner = theme === 'dark' ? '<div data-stem-tool-surface="roadReady" style="background:#ffffff;color:#0f172a">' + html + '</div>' : html;
  document.body.innerHTML = '<div class="' + (theme === 'light' ? 'theme-default' : 'theme-' + theme) + '"><div data-stem-tool-shell="roadReady" data-stem-theme="' + theme + '" style="' + shellStyle + '">' + inner + '</div></div>';
  const root = document.body.firstChild; const cache = new Map();
  const cascade = (el) => {
    const hit = [];
    for (const r of rules) {
      if (r.cls && !(el.classList && el.classList.contains(r.cls))) continue;
      if (!r.cls && r.tag && el.localName !== r.tag) continue;
      let ok = false; try { ok = el.matches(r.sel); } catch (e) { ok = false; }
      if (ok) r.decls.forEach((d) => hit.push({ prop: d.prop, value: d.value, w: (d.important ? 1e9 : 0) + r.spec * 1000 + r.order }));
    }
    parseDecls(el.getAttribute('style') || '').forEach((d) => hit.push({ prop: d.prop, value: d.value, w: (d.important ? 2e9 : 5e8) }));
    hit.sort((a, b) => a.w - b.w);
    const out = {}, wt = {}; hit.forEach((d) => { out[d.prop] = d.value; wt[d.prop] = d.w; }); out.__w = wt; return out;
  };
  const info = (el) => {
    if (cache.has(el)) return cache.get(el);
    const parent = el.parentElement && el !== document.body ? info(el.parentElement) : { vars: {}, colour: [15, 23, 42, 1], colourRaw: '#0f172a', size: 16, weight: 400 };
    const own = cascade(el); const vars = Object.assign({}, parent.vars);
    Object.keys(own).forEach((k) => { if (k.indexOf('--') === 0) vars[k] = own[k]; });
    const resolve = (v) => mixDown(resolveVars(v));
    const resolveVars = (v) => {
      let s = String(v), n = 0;
      while (/var\(/.test(s) && n++ < 20) {
        const a = s.lastIndexOf('var('); let depth = 0, b = a + 3; for (; b < s.length; b++) { if (s[b] === '(') depth++; else if (s[b] === ')') { depth--; if (depth === 0) break; } }
        const innerText = s.slice(a + 4, b); const c = innerText.indexOf(','); const name = (c < 0 ? innerText : innerText.slice(0, c)).trim(); const fb = c < 0 ? '' : innerText.slice(c + 1).trim();
        s = s.slice(0, a) + (vars[name] != null ? vars[name] : fb) + s.slice(b + 1);
      }
      return s.trim();
    };
    let colour = parent.colour, colourRaw = parent.colourRaw, unresolved = parent.unresolved || false;
    if (own.color && own.color !== 'inherit') { const raw = resolve(own.color); if (raw === 'currentColor' || raw === 'currentcolor') { /* keep */ } else { const c = parseColour(raw); if (c) { colour = c; colourRaw = raw; unresolved = false; } else { unresolved = raw; } } }
    else if (el.localName === 'button' && !own.color) { /* UA button ink: buttons here always set their own or sit in a rule */ }
    // background shorthand against its longhands: the declaration with the higher weight paints (an !important
    // background-color / background-image from the host beats an inline `background`)
    let bg = null; const w = own.__w; const sh = own.background != null ? resolve(own.background) : null;
    const shImage = sh != null && /gradient\(/.test(sh) ? sh : (sh != null ? 'none' : null), shColour = sh != null && !/gradient\(/.test(sh) ? sh : (sh != null ? 'transparent' : null);
    const pick = (long, short) => { const lv = own[long] != null ? resolve(own[long]) : null; if (lv == null) return short; if (short == null) return lv; return (w[long] || 0) >= (w.background || 0) ? lv : short; };
    const image = pick('background-image', shImage), fill = pick('background-color', shColour);
    const bgRaw = image && image !== 'none' ? image : fill;
    if (bgRaw != null) { const c = /^(none|transparent)$/.test(bgRaw) ? null : firstColour(bgRaw); if (c && c[3] > 0.5) bg = c; }
    // the app's high-contrast sheet also blacks out inline white fills (the [style*="background: rgb(255, 255, 255"] rule)
    if (theme === 'contrast' && bg && bg[0] === 255 && bg[1] === 255 && bg[2] === 255 && /background:\s*(#fff(fff)?|white)\b/.test(el.getAttribute('style') || '')) bg = [0, 0, 0, 1];
    let size = parent.size, weight = parent.weight;
    const tagSize = { h1: 32, h2: 24, h3: 18.72, h4: 16 }[el.localName]; if (tagSize) { size = tagSize; weight = 700; }
    if (el.localName === 'strong' || el.localName === 'b' || el.localName === 'th') weight = 700;
    if (own['font-size']) { const r = resolve(own['font-size']); const m = /^([\d.]+)px$/.exec(r); if (m) size = +m[1]; else if (/^[\d.]+$/.test(r)) size = +r; else size = Math.min(size, 16); }
    if (own['font-weight']) { const r = resolve(own['font-weight']); weight = r === 'bold' ? 700 : (parseInt(r, 10) || weight); }
    const res = { vars, colour, colourRaw, unresolved, bg, size, weight, el };
    cache.set(el, res); return res;
  };
  return { root, info };
}

function audit(html, theme) {
  const { root, info } = buildModel(html, theme);
  const fails = [], unresolved = []; let total = 0;
  const walker = document.createTreeWalker(root, 4 /* SHOW_TEXT */); const seen = new Set();
  while (walker.nextNode()) {
    const t = walker.currentNode; const txt = t.nodeValue.trim(); if (txt.length < 2) continue;
    const el = t.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
    if (el.closest('style,script,title,desc,[hidden]')) continue;
    if (/clip:\s*rect\(0/.test(el.getAttribute('style') || '') || /display:\s*none/.test(el.getAttribute('style') || '')) continue;
    const me = info(el); total++;
    if (me.unresolved) { unresolved.push(txt.slice(0, 30) + ' <- ' + String(me.unresolved).slice(0, 40)); continue; }
    let g = null; for (let e = el; e && e !== document.body.parentElement; e = e.parentElement) { const x = info(e); if (x.bg) { g = x.bg; break; } }
    if (!g) g = [255, 255, 255, 1];
    const need = (me.size >= 24 || (me.size >= 18.66 && me.weight >= 700)) ? 3 : 4.5;
    const cr = ratio(me.colour, g);
    if (cr < need) fails.push(JSON.stringify(txt.slice(0, 32)) + ' ' + cr.toFixed(2) + ':1 (need ' + need + ') ink ' + me.colour.slice(0, 3).join(',') + ' on ' + g.slice(0, 3).join(','));
  }
  return { fails, unresolved, total };
}

// ── the views ──
// All 78 views the browser sweep opens, minus the ones other round-31 lanes own (permit test, flashcards).
const VIEWS = ['menu', 'cheatSheet', 'signsView', 'rightOfWay', 'scenarioSelect', 'scenarioBriefing', 'freeExploreSetup', 'lessonPath', 'roadTestIntro', 'parkingMenu', 'nightVisionIntro', 'parentRideCheck', 'defensiveList', 'mooseSafety', 'emergencyVehicle', 'schoolBus', 'railroadCrossing', 'winterDriving', 'constructionZone', 'roundaboutDrill', 'duiDrill', 'peerPressure', 'distractedLab', 'reactionTest', 'emergencyHandbook', 'postCrash', 'bikeAware', 'crashLab', 'stoppingLab', 'lessonSelect', 'hypermilingLab', 'vehicleCompare', 'seatSetup', 'preTrip', 'maintenanceGuide', 'maintenanceGame', 'maineWinter', 'roundaboutGuide', 'gdlTracker', 'teenGDL', 'insuranceCalc', 'logbook', 'analytics', 'achievementGallery', 'dailyChallenge', 'customize', 'driverPledge', 'rulesFoundations', 'hazardTest', 'emergencyDrill', 'blindSpotGuide', 'weatherCompare', 'nightVision', 'reactionTrainer', 'intersectionGuide', 'forceDiagram', 'speedCompare', 'fuelCalc', 'threePoint', 'backingDrill', 'roadTestRubric', 'dashLights', 'knowYourCar', 'keyboardCheatSheet', 'learningPath', 'roadTrip', 'carBuying', 'neurodivergentGuide', 'certificate', 'crashReplay', 'helpHub', 'parking', 'tightParallel', 'hillUphill', 'brakingHunt'];
// A few second states the default render never shows.
const STATES = {
  'reactionTrainer:ready': { view: 'reactionTrainer', rtState: { phase: 'ready', times: [] } },
  'reactionTrainer:go': { view: 'reactionTrainer', rtState: { phase: 'go', times: [] } },
  'reactionTrainer:result': { view: 'reactionTrainer', rtState: { phase: 'result', times: [312], bestTime: 312, lastTime: 312 } },
  'freeExploreSetup:rideshare+trip': { view: 'freeExploreSetup', rideshareMode: true, freeExploreTrip: 'lighthouse_loop' },
  'driverPledge:named': { view: 'driverPledge', driverName: 'Sam' },
  'driving:seatbelt prompt': { view: 'driving', scenario: 'residential', vehicle: 'sedan' },
  'signsView:quiz': { view: 'signsView', signsQuizMode: true, signsQuizReverse: false, signsQuizIdx: 0, signsQuizScore: 0, signsQuizAnswered: null, signsQuizQuestions: null },
  'rightOfWay:answered': { view: 'rightOfWay', rowIdx: 0, rowScore: 0, rowAnswered: 1 },
  'rightOfWay:finished': { view: 'rightOfWay', rowIdx: 99, rowScore: 15, rowAnswered: null },
  'peerPressure:answered': { view: 'peerPressure', ppIdx: 0, ppAnswered: 0, ppScore: 0 },
  'peerPressure:finished': { view: 'peerPressure', ppIdx: 99, ppScore: 7 },
  'lesson:drag': { view: 'lesson', lesson: 'drag' },
  'tour': { view: 'tour', tourCompleted: false },
  'logbook:one drive': { view: 'logbook', logbook: [{ startedAt: 1736900000000, endedAt: 1736900190000, durationSec: 190, scenario: 'Residential Street', vehicle: 'Compact Sedan', safetyScore: 88, entries: [] }] },
  'analytics:one drive': { view: 'analytics', logbook: [{ startedAt: 1736900000000, endedAt: 1736900190000, durationSec: 190, scenario: 'Residential Street', safetyScore: 88 }] },
  'roadTestResult:passed': { view: 'roadTestResult', lastRoadTest: { score: 92, passed: true, scenario: 'Suburban Arterial', durationSec: 240, endedAt: 1737000000000, deductions: [{ type: 'speed', pts: 1, t: 30, detail: '31 mph in 25 zone' }] } },
  'roadTestResult:failed': { view: 'roadTestResult', lastRoadTest: { score: 61, passed: false, scenario: 'Suburban Arterial', durationSec: 240, endedAt: 1737000000000, deductions: [{ type: 'speed', pts: 10, t: 30, detail: '41 mph in 25 zone' }] } },
  'parentReport': { view: 'parentReport', lastParentReport: { scenario: 'Residential Street', durationSec: 120, startedAt: 1000, endedAt: 121000, errors: [{ cat: 'speed', t: 30, speedMph: 31 }, { cat: 'stop', t: 60, speedMph: 8 }] } },
  'dailyChallenge:done': () => ({ view: 'dailyChallenge', dailyChallenge: { date: new Date().toDateString(), done: true, completed: true, lastDone: new Date().toDateString() } }),
  'preTrip:all checked': () => { const o = {}; for (let i = 0; i < 40; i++) o[i] = true; (viewBlock('preTrip').match(/id: '([a-z0-9_]+)'/g) || []).forEach((m) => { o[/'(.+)'/.exec(m)[1]] = true; }); return { view: 'preTrip', preTripChecks: o }; },
  'crashLab:picked': () => ({ view: 'crashLab', crashLabPicked: idsOf('crashLab')[0] }),
};
// The ten question drills keep { scenarioId: { answered, correct } }: show every card answered wrong, then right.
[['defensiveList', 'defensiveState'], ['mooseSafety', 'mooseState'], ['emergencyVehicle', 'emgState'], ['schoolBus', 'busState'], ['railroadCrossing', 'rrState'], ['winterDriving', 'winterState'], ['constructionZone', 'constrState'], ['teenGDL', 'gdlState'], ['roundaboutDrill', 'roundaboutState'], ['duiDrill', 'duiState']].forEach(([view, key]) => {
  [false, true].forEach((correct) => {
    STATES[view + (correct ? ':all right' : ':all wrong')] = () => { const st = {}; idsOf(view).forEach((id) => { st[id] = { answered: correct ? 1 : 0, correct }; }); const d = { view }; d[key] = st; return d; };
  });
});
function viewBlock(view) { const a = SRC.indexOf("if (view === '" + view + "')"); const b = SRC.indexOf("\n      if (view === '", a + 10); return a < 0 ? '' : SRC.slice(a, b < 0 ? a + 30000 : b); }
function idsOf(view) { return Array.from(new Set((viewBlock(view).match(/\{ id: '([a-z0-9_]+)'/g) || []).map((m) => /'(.+)'/.exec(m)[1]))); }
const render = (d) => renderTool('roadReady', { roadReady: Object.assign({ tourCompleted: true, pendingScenario: 'residential' }, d) });
const THEMES = ['light', 'dark', 'contrast'];

describe('ct31: the model reads the host the same way the app paints it', () => {
  it('the host rules this file models are still in app_styles_source.jsx', () => {
    expect(HOST).toContain('.theme-contrast { background-color: #000000 !important; color: #ffff00 !important; }');
    expect(HOST).toContain('.theme-contrast h1, .theme-contrast h2, .theme-contrast h3, .theme-contrast h4, .theme-contrast p, .theme-contrast span, .theme-contrast div,');
    expect(HOST).toContain('.theme-contrast button { background-color: #000000 !important; border: 2px solid #00ff00 !important; color: #00ff00 !important;');
    expect(HOST).toContain('.theme-contrast [data-stem-tool-shell] button[aria-pressed="true"] { border-color: #ffff00 !important; box-shadow: inset 0 0 0 4px #ffff00 !important; }');
    const hub = readFileSync(path.resolve(process.cwd(), 'stem_lab/stem_lab_module.js'), 'utf8');
    expect(hub).toContain("'data-stem-tool-surface': id,");
    expect(hub).toContain("background: '#ffffff',\n                    color: '#0f172a',");
  });
  it('resolves the three palettes to different inks', () => {
    const html = '<p style="color:var(--allo-stem-text, #e2e8f0)">sample text</p>';
    const ink = (theme) => { const m = buildModel(html, theme); return m.info(m.root.querySelector('p')).colour.slice(0, 3).join(','); };
    expect(ink('light')).toBe('15,23,42');
    expect(ink('dark')).toBe('226,232,240');
    expect(ink('contrast')).toBe('255,255,0');
  });
});

describe('ct31: every text node meets AA on the surface under it', () => {
  for (const theme of THEMES) {
    for (const view of VIEWS) {
      it(theme + ' / ' + view, () => {
        const r = audit(render({ view }), theme);
        expect(r.total, 'the view rendered text').toBeGreaterThan(0);
        expect(r.fails.join(' | '), theme + ' ' + view).toBe('');
      });
    }
    for (const name of Object.keys(STATES)) {
      it(theme + ' / ' + name, () => {
        const st = typeof STATES[name] === 'function' ? STATES[name]() : STATES[name];
        const html = render(st);
        expect(html, name + ' rendered its own screen').not.toMatch(/RoadReady Error|Loading RoadReady/);
        const r = audit(html, theme);
        expect(r.total).toBeGreaterThan(0);
        expect(r.fails.join(' | '), theme + ' ' + name).toBe('');
      });
    }
  }
  it('no ink is left unresolved by this model (var and color-mix both resolve)', () => {
    const odd = [];
    for (const view of VIEWS) { const r = audit(render({ view }), 'light'); if (r.unresolved.length) odd.push(view + ': ' + r.unresolved[0]); }
    expect(odd).toEqual([]);
  });
});

describe('ct31: the surface / ink pairs', () => {
  const pairs = () => { const el = document.getElementById('allo-rr-pairs-css'); return el ? el.textContent : ''; };
  const vars = (css, sel) => { const i = css.indexOf(sel + '{'); if (i < 0) return {}; const body = css.slice(i + sel.length + 1, css.indexOf('}', i)); const o = {}; parseDecls(body).forEach((d) => { o[d.prop] = d.value; }); return o; };
  const hex = (h) => parseColour(h).slice(0, 3);
  const hexL = (h) => lum(hex(h));

  it('the dark island keeps theme-following ink light and the light island keeps it dark', () => {
    const css = pairs();
    const dk = vars(css, '.rr-dk,.rr-drive-shell'), lt = vars(css, '.rr-lt');
    expect(dk['--allo-stem-text'], 'dark island defined (and it covers the drive shell)').toBeTruthy();
    expect(lt['--allo-stem-text'], 'light island defined').toBeTruthy();
    // dark island inks on its own panel colours
    ['--allo-stem-text', '--allo-stem-text-soft', '--rr-cyan', '--rr-violet', '--rr-amber', '--rr-blue', '--rr-green', '--rr-red', '--rr-orange', '--rr-pink'].forEach((k) => {
      ['--allo-stem-canvas', '--allo-stem-panel', '--allo-stem-deeper'].forEach((g) => {
        expect(ratio(hex(dk[k]), hex(dk[g])), 'dark ' + k + ' on ' + g).toBeGreaterThanOrEqual(4.5);
        expect(ratio(hex(lt[k]), hex(lt[g])), 'light ' + k + ' on ' + g).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  it('every surface marked rr-dk is dark enough for the island ink, every rr-lt surface light enough', () => {
    const css = pairs(); const dk = vars(css, '.rr-dk,.rr-drive-shell'), lt = vars(css, '.rr-lt');
    const bad = []; let nDk = 0, nLt = 0;
    SRC.split('\n').forEach((line, i) => {
      const m = /className: '(?:[\w -]*\s)?(rr-dk|rr-lt)'/.exec(line); if (!m) return;
      const bi = line.indexOf('background: '); if (bi < 0) return;
      // the background value only: read to the next comma outside quotes and brackets
      let end = bi + 12, depth = 0, q = null;
      for (; end < line.length; end++) { const c = line[end]; if (q) { if (c === q) q = null; continue; } if (c === "'") q = c; else if (c === '(') depth++; else if (c === ')') { if (!depth) break; depth--; } else if (c === '}' && !depth) break; else if (c === ',' && !depth) break; }
      const expr = line.slice(bi, end);
      const stops = (expr.replace(/var\(--[a-z-]+, [^)]*\)+/g, '').match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || []);
      stops.forEach((sHex) => {
        if (m[1] === 'rr-dk') { nDk++; if (ratio(hex(dk['--allo-stem-text']), hex(sHex)) < 4.5) bad.push((i + 1) + ': island text on ' + sHex); }
        else { nLt++; if (ratio(hex(lt['--allo-stem-text']), hex(sHex)) < 4.5) bad.push((i + 1) + ': paper text on ' + sHex); }
      });
    });
    expect(nDk, 'dark island surfaces found').toBeGreaterThan(100);
    expect(nLt, 'light island surfaces found').toBeGreaterThan(8);
    expect(bad).toEqual([]);
  });

  it('light-theme accents are dark enough for the page, the panel and the deeper panel', () => {
    const accent = document.getElementById('allo-rr-accent-css').textContent;
    const light = vars(accent.replace(':root, .theme-default', '.L'), '.L');
    const host = {}; (/:root, \.theme-default \{([^}]*)\}/.exec(HOST)[1].match(/--allo-stem-[a-z-]+:\s*#[0-9a-fA-F]+/g) || []).forEach((d) => { const p = d.split(':'); host[p[0].trim()] = p[1].trim(); });
    const low = [];
    ['--rr-cyan', '--rr-violet', '--rr-amber', '--rr-blue', '--rr-green', '--rr-red', '--rr-orange', '--rr-pink'].forEach((k) => {
      ['--allo-stem-canvas', '--allo-stem-panel', '--allo-stem-deeper'].forEach((g) => { const cr = ratio(hex(light[k]), hex(host[g])); if (cr < 4.5) low.push(k + ' ' + light[k] + ' on ' + g + ' ' + host[g] + ' = ' + cr.toFixed(2)); });
    });
    expect(low).toEqual([]);
  });

  it('high contrast: light paper and the speed-limit sign turn black under the forced yellow ink', () => {
    const css = pairs();
    expect(css).toContain('.theme-contrast .rr-lt,.theme-contrast .rr-limit-sign{background:#000000!important;background-image:none!important;');
    expect(css).toMatch(/\.theme-contrast \.rr-dk,\.theme-contrast \.rr-lt,\.theme-contrast \.rr-drive-shell\{[^}]*--allo-stem-text:#ffff00/);
  });

  it('views drawn straight on the host sheet paint the theme canvas (dark theme: white card under light ink)', () => {
    const css = pairs();
    expect(css).toMatch(/\.rr-lesson-shell,\.rr-parking-shell,\.rr-page\{background:var\(--allo-stem-canvas,#ffffff\);color:var\(--allo-stem-text,#0f172a\)/);
    for (const view of ['scenarioBriefing', 'parking', 'tightParallel', 'hillUphill', 'certificate']) {
      const m = buildModel(render({ view }), 'dark');
      const first = m.root.querySelector('[data-stem-tool-surface] > *');
      expect(m.info(first).bg, view + ' root paints a surface').toBeTruthy();
      expect(m.info(first).bg.slice(0, 3).join(','), view).toBe('15,23,42');
    }
  });
});

describe('ct31: a chosen option is not shown by colour alone', () => {
  it('Free Explore setup: each option group exposes exactly one pressed button', () => {
    const html = render({ view: 'freeExploreSetup' });
    document.body.innerHTML = html;
    const pressed = Array.from(document.querySelectorAll('button[aria-pressed="true"]')).map((b) => b.textContent.trim());
    // vehicle, road type, weather, time, traffic, trip ("No trip")
    expect(pressed.length).toBe(6);
    const all = Array.from(document.querySelectorAll('button[aria-pressed]'));
    expect(all.length).toBeGreaterThanOrEqual(6 + 5 + 4 + 3 + 2 + 2);
    all.forEach((b) => expect(/\brr-(dk|opt)\b/.test(b.className), b.textContent.trim().slice(0, 20) + ' carries the mark class').toBe(true));
  });
  it('the mark is a ring and an underline, not a colour', () => {
    const css = (document.getElementById('allo-rr-pairs-css') || { textContent: '' }).textContent;
    expect(css).toContain('button.rr-dk[aria-pressed="true"],button.rr-opt[aria-pressed="true"]{box-shadow:inset 0 0 0 2px currentColor;text-decoration:underline;');
  });
  it('every button whose style switches on a selection states it (aria-pressed / selected / current)', () => {
    const lines = SRC.split('\n'); const miss = []; let view = null, inRender = false, n = 0;
    const openDepth = (text) => { let dep = 1, q = null; for (let k = 0; k < text.length; k++) { const c = text[k]; if (q) { if (c === '\\') k++; else if (c === q) q = null; continue; } if (c === "'" || c === '"') q = c; else if (c === '{') dep++; else if (c === '}') dep--; } return dep; };
    lines.forEach((line, i) => {
      if (/registerTool\('roadReady'/.test(line)) inRender = true;
      const vm = /^ {6}if \((.*view === '[A-Za-z0-9_]+'.*)\) \{/.exec(line); if (inRender && vm) view = vm[1];
      if (!/style: \{/.test(line)) return;
      if (!/(?:background|border): (?:'[^']*' \+ )?\(?(?:sel|isActive) \? /.test(line)) return;
      if (/view === '(permitStart|permitCategory|permit|permitFlashcards|debrief|driveDebrief)'/.test(view || '')) return; // other lanes
      let start = i, tag = null;
      const before = line.slice(0, line.indexOf('style: {')); const hs = Array.from(before.matchAll(/h\('([a-z0-9]+)', \{/g));
      if (hs.length) tag = hs[hs.length - 1][1];
      else for (let j = i - 1; j >= i - 14 && j >= 0; j--) { const all = Array.from(lines[j].matchAll(/h\('([a-z0-9]+)', \{/g)); if (!all.length) continue; const om = all[all.length - 1]; if (openDepth(lines[j].slice(om.index + om[0].length) + '\n' + lines.slice(j + 1, i).join('\n')) === 1) { tag = om[1]; start = j; } break; }
      if (tag !== 'button') return; n++;
      if (!/aria-(pressed|checked|selected|current)/.test(lines.slice(start, i + 1).join('\n'))) miss.push(i + 1);
    });
    expect(n).toBeGreaterThan(15);
    expect(miss).toEqual([]);
  });
});
