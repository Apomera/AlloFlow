// Screenshot waterCycle's live 3D journey scene. Re-runnable: pass an output tag.
// Run from the repo root: node dev-tools/watercycle_3d_shots.mjs before
//   SHOTDIR=/tmp ONLY=journey,started SETTLE=30000 node dev-tools/watercycle_3d_shots.mjs after
import { chromium } from 'playwright';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const TAG = process.argv[2] || 'shot';
// THEME=dark|light|contrast -- contrast is the one that hides 3D scenes behind
// blackened bg-* overlays, and only a screenshot catches it.
const THEME = process.env.THEME || 'dark';
const OUTDIR = process.env.SHOTDIR || '.';
const ROOT = process.cwd();
const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/__harness') {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#0b1220">' +
      '<div id="wrap" style="width:1200px"></div></body></html>');
    return;
  }
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('nope'); return;
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = 'http://127.0.0.1:' + server.address().port;

const SHELL = `
window.__mount = function () {
  const React = window.React;
  const cfg = window.StemLab._registry.waterCycle;
  const Icons = new Proxy({}, { get: () => () => React.createElement('span') });
  function Host() {
    const [data, setData] = React.useState({ _threeLoaded: !!(window.THREE && window.THREE.OrbitControls) });
    const ctx = {
      React, toolData: data, setToolData: setData, labToolData: data, setLabToolData: setData,
      theme: window.__THEME, isDark: window.__THEME === 'dark', isContrast: window.__THEME === 'contrast',
      gradeBand: 'g68', gradeLevel: '7th Grade',
      setStemLabTool() {}, setStemLabTab() {}, setToolSnapshots() {}, addToast() {},
      announceToSR() {}, awardXP() {}, beep() {}, celebrate() {}, canvasNarrate() {},
      canvasA11yDesc() {}, callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null,
      stemLabTab: 'explore', stemLabTool: 'waterCycle', toolSnapshots: [], props: {}, srOnly: {},
      icons: Icons, a11yClick: (f) => ({ onClick: f }), getXP: () => 0,
      t: (k, fb) => (fb != null ? fb : k),
      update(tool, key, val) { setData((p) => Object.assign({}, p, { [key]: val })); },
      updateMulti(tool, patch) { setData((p) => Object.assign({}, p, patch)); },
    };
    let rendered;
    try { rendered = cfg.render(ctx); }
    catch (e) { return React.createElement('pre', null, 'threw: ' + e.message); }
    // The host's own stylesheet must be present or a theme sweep measures
    // nothing: the contrast rules live in AppStyles, not in the tool.
    // The module registers a NAMESPACE object, not the component itself:
    // window.AlloModules.AppStyles = { AppStyles: React.memo(AppStyles) }.
    const ns = window.AlloModules && window.AlloModules.AppStyles;
    const AppStyles = ns && (ns.AppStyles || ns);
    return AppStyles
      ? React.createElement(React.Fragment, null, React.createElement(AppStyles, null), rendered)
      : rendered;
  }
  window.ReactDOM.render(React.createElement(Host), document.getElementById('wrap'));
};
window.__clickText = function (re) {
  const rx = new RegExp(re, 'i');
  const b = Array.from(document.querySelectorAll('#wrap button')).find((x) => rx.test((x.textContent || '').trim()));
  if (!b) return false;
  b.click(); return true;
};
// Report which journey state the shot actually caught -- the guided journey
// advances on its own, so a screenshot is only meaningful with its state.
// No regex escapes here on purpose: this whole block lives inside a template
// literal, where a backslash-n would become a real newline and silently break
// window.__mount for the entire run.
window.__state = function () {
  const t = (document.querySelector('#wrap') || {}).innerText || '';
  const after = function (marker) {
    const i = t.indexOf(marker);
    if (i < 0) return '?';
    const rest = t.slice(i + marker.length).split(String.fromCharCode(10));
    for (let k = 0; k < rest.length; k++) {
      const line = rest[k].trim();
      if (line) return line;
    }
    return '?';
  };
  const c = document.querySelector('#wrap canvas[data-gl-under-test]');
  return {
    parcel: after('CURRENT PARCEL STATE'),
    phase: after('IMMERSIVE DROPLET JOURNEY'),
    lens: after('SCENE LENS'),
    canvasPhase: c && c.dataset ? c.dataset.parcelPhase : '?',
  };
};
// tag the GL canvas so the screenshot cannot photograph a 2D overlay instead
window.__tagGl = function () {
  let n = 0;
  document.querySelectorAll('#wrap canvas').forEach((c) => {
    let gl = null;
    try { gl = c.getContext('webgl2') || c.getContext('webgl'); } catch (e) {}
    if (gl && !gl.isContextLost()) { c.setAttribute('data-gl-under-test', String(n++)); }
  });
  return n;
};`;

async function shot(label, clicks, outfile) {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 140)));
  await page.goto(base + '/__harness');
  for (const s of [
    '/desktop/web-app/node_modules/react/umd/react.production.min.js',
    '/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js',
    '/vendor/three-r128/three.min.js',
    '/vendor/three-r128/OrbitControls.js',
    '/app_styles_module.js',
    '/stem_lab/stem_lab_module.js',
    '/stem_lab/stem_tool_watercycle.js',
  ]) await page.addScriptTag({ url: s });
  await page.addScriptTag({ content: SHELL });
  await page.evaluate((theme) => {
    window.__THEME = theme;
    // The host carries the theme class on an ancestor, not on <html>.
    document.body.className = theme === 'contrast' ? 'theme-contrast' : (theme === 'dark' ? 'dark' : '');
    const wrap = document.getElementById('wrap');
    if (wrap) wrap.className = theme === 'contrast' ? 'theme-contrast' : '';
  }, THEME);
  await page.evaluate(() => window.__mount());
  await page.waitForTimeout(1800);
  for (const c of clicks) {
    // 'wait:12000' pauses instead of clicking -- the guided journey only offers
    // the land-decision routes about 95 s in, so some scenes must sit and wait.
    if (c.startsWith('wait:')) { await page.waitForTimeout(Number(c.slice(5))); continue; }
    const ok = await page.evaluate((re) => window.__clickText(re), c);
    if (!ok) console.log('  [' + label + '] no button matched /' + c + '/');
    await page.waitForTimeout(2200);
  }
  await page.waitForTimeout(Number(process.env.SETTLE || 3500)); // settle / let the journey run
  const n = await page.evaluate(() => window.__tagGl());
  if (!n) { console.log('  [' + label + '] NO live GL canvas'); await browser.close(); return; }
  const el = page.locator('[data-gl-under-test="0"]');
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await el.screenshot({ path: outfile });
  const st = await page.evaluate(() => window.__state());
  const size = fs.statSync(outfile).size;
  console.log('  [' + label + '] state: phase=' + st.phase + ' parcel=' + st.parcel +
    ' canvasPhase=' + st.canvasPhase + ' lens=' + st.lens);
  console.log('  [' + label + '] theme=' + THEME);
  console.log('  [' + label + '] wrote ' + path.basename(outfile) + '  ' + Math.round(size / 1024) + ' KB' +
    (size < 20000 ? '   *** SUSPICIOUSLY SMALL - possibly blank' : ''));
  if (errs.length) console.log('  [' + label + '] page errors: ' + errs.slice(0, 3).join(' | '));
  await browser.close();
}

const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const SCENES = {
  // the journey scene as it first appears (preview / free orbit)
  journey: ['Droplet Journey'],
  // "Be the Water" mounts its own GL surface: wc-pilot-canvas. It opens on an
  // onboarding overlay ("Become one parcel of water") with the scene dimmed
  // behind it, so a shot without the Begin click photographs the overlay.
  pilot: ['Be the Water'],
  piloting: ['Be the Water', 'Begin - see your parcel'],
  started: ['Droplet Journey', 'Begin as a droplet'],
  // the land decision appears ~95 s in; choosing Underground reaches the
  // aquifer / subsurface visuals, which nothing else in this file gets to.
  underground: ['Droplet Journey', 'Begin as a droplet', 'wait:98000', 'Underground'],
  runoff: ['Droplet Journey', 'Begin as a droplet', 'wait:98000', 'River Runoff'],
  plant: ['Droplet Journey', 'Begin as a droplet', 'wait:98000', 'Enter Plant'],
  // NOTE: there is no clickable lens control. The Sky / Surface / Subsurface
  // chips in the SCENE LENS panel are `.wc-scene-lens-axis span` STATUS
  // indicators (`is-active`) showing which band the camera is in -- they have no
  // button ancestor and a real mouse click on them does nothing. Scenes that
  // "clicked" them silently produced the overview shot and looked like coverage.
  // To reach later states (infiltration, aquifer) let the guided journey RUN:
  //   SETTLE=30000 ONLY=started node dev-tools/watercycle_3d_shots.mjs t30
  zoom: ['Droplet Journey', 'Begin as a droplet', '^\\+$', '^\\+$', '^\\+$'],
};
for (const [name, clicks] of Object.entries(SCENES)) {
  if (ONLY && !ONLY.includes(name)) continue;
  await shot(name, clicks, path.join(OUTDIR, 'wc_' + name + '_' + TAG + '.png'));
}
server.close();
