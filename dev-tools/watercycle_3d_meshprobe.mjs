// "What am I actually looking at?" for waterCycle's journey 3D scene.
//
//   SETTLE=45000 FILTER=sky node dev-tools/watercycle_3d_meshprobe.mjs
//
// Wraps THREE.Mesh BEFORE the tool module loads so every mesh is recorded, then
// mounts, drives the journey, and reports live material state (colour, emissive,
// opacity) plus world position. Source-reading repeatedly gave me the wrong
// answer about this scene -- this gives the real one in a single run. It is how
// the parcel's colour/emissive collision was found.
import { chromium } from 'playwright';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const ROOT = process.cwd();
const SETTLE = Number(process.env.SETTLE || 6000);
const FILTER = process.env.FILTER || 'all';
const MIME = { '.js': 'text/javascript', '.html': 'text/html' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/__harness') {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#0b1220"><div id="wrap" style="width:1200px"></div></body></html>');
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

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
page.on('pageerror', (e) => console.log('pageerror:', String(e).slice(0, 140)));
await page.goto(base + '/__harness');
for (const s of [
  '/desktop/web-app/node_modules/react/umd/react.production.min.js',
  '/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js',
  '/vendor/three-r128/three.min.js',
  '/vendor/three-r128/OrbitControls.js',
]) await page.addScriptTag({ url: s });

// Record every mesh the tool builds. Must run BEFORE the tool module.
await page.evaluate(() => {
  window.__meshes = [];
  const RealMesh = window.THREE.Mesh;
  function TracedMesh(geometry, material) {
    const m = new RealMesh(geometry, material);
    try { window.__meshes.push(m); } catch (e) {}
    return m;
  }
  TracedMesh.prototype = RealMesh.prototype;
  window.THREE.Mesh = TracedMesh;
});

for (const s of ['/stem_lab/stem_lab_module.js', '/stem_lab/stem_tool_watercycle.js']) {
  await page.addScriptTag({ url: s });
}
await page.addScriptTag({ content: `
window.__mount = function () {
  const React = window.React;
  const cfg = window.StemLab._registry.waterCycle;
  const Icons = new Proxy({}, { get: () => () => React.createElement('span') });
  function Host() {
    const [data, setData] = React.useState({ _threeLoaded: !!(window.THREE && window.THREE.OrbitControls) });
    const ctx = {
      React, toolData: data, setToolData: setData, labToolData: data, setLabToolData: setData,
      theme: 'dark', isDark: true, isContrast: false, gradeBand: 'g68', gradeLevel: '7th Grade',
      setStemLabTool() {}, setStemLabTab() {}, setToolSnapshots() {}, addToast() {},
      announceToSR() {}, awardXP() {}, beep() {}, celebrate() {}, canvasNarrate() {},
      canvasA11yDesc() {}, callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null,
      stemLabTab: 'explore', stemLabTool: 'waterCycle', toolSnapshots: [], props: {}, srOnly: {},
      icons: Icons, a11yClick: (f) => ({ onClick: f }), getXP: () => 0,
      t: (k, fb) => (fb != null ? fb : k),
      update(tool, key, val) { setData((p) => Object.assign({}, p, { [key]: val })); },
      updateMulti(tool, patch) { setData((p) => Object.assign({}, p, patch)); },
    };
    try { return cfg.render(ctx); } catch (e) { return React.createElement('pre', null, 'threw: ' + e.message); }
  }
  window.ReactDOM.render(React.createElement(Host), document.getElementById('wrap'));
};
window.__clickText = function (re) {
  const rx = new RegExp(re, 'i');
  const b = Array.from(document.querySelectorAll('#wrap button')).find((x) => rx.test((x.textContent || '').trim()));
  if (!b) return false;
  b.click(); return true;
};` });

await page.evaluate(() => window.__mount());
await page.waitForTimeout(1800);
// CLICKS lets a caller drive deeper states, e.g. the land decision:
//   CLICKS='Droplet Journey,Begin as a droplet,wait:98000,Underground'
const CLICKS = (process.env.CLICKS || 'Droplet Journey,Begin as a droplet').split(',');
for (const c of CLICKS) {
  if (c.startsWith('wait:')) { await page.waitForTimeout(Number(c.slice(5))); continue; }
  const ok = await page.evaluate((re) => window.__clickText(re), c);
  if (!ok) console.log('  no button matched /' + c + '/');
  await page.waitForTimeout(2500);
}
await page.waitForTimeout(SETTLE);

const out = await page.evaluate((filterMode) => {
  const THREE = window.THREE;
  const rows = [];
  const seen = new Set();
  for (const m of window.__meshes) {
    if (!m.parent || seen.has(m.uuid)) continue;
    let root = m; while (root.parent) root = root.parent;
    if (!root.isScene) continue;
    seen.add(m.uuid);
    let vis = m.visible;
    let hiddenBy = null;
    for (let p = m.parent; p; p = p.parent) {
      if (!p.visible) { hiddenBy = p.name || p.type; break; }
    }
    if (!m.visible) hiddenBy = 'self';
    // FILTER=hidden reports what is NOT drawn, and why -- an absent mesh and a
    // deliberately hidden one look identical in a screenshot.
    if (filterMode !== 'hidden' && (hiddenBy || !vis)) continue;
    if (filterMode === 'hidden' && !hiddenBy) continue;
    const pos = new THREE.Vector3();
    m.getWorldPosition(pos);
    const mat = Array.isArray(m.material) ? m.material[0] : m.material;
    if (!mat) continue;
    rows.push({
      geo: m.geometry && m.geometry.type,
      pos: [+pos.x.toFixed(2), +pos.y.toFixed(2), +pos.z.toFixed(2)],
      scale: +m.scale.x.toFixed(2),
      color: mat.color ? '#' + mat.color.getHexString() : null,
      emissive: mat.emissive ? '#' + mat.emissive.getHexString() : null,
      opacity: mat.opacity == null ? null : +mat.opacity.toFixed(2),
      blending: mat.blending === THREE.AdditiveBlending ? 'additive' : 'normal',
      mat: mat.type,
      hiddenBy: hiddenBy,
    });
  }
  if (filterMode === 'hidden') return rows.filter((r) => r.geo === 'LatheGeometry' || r.geo === 'SphereGeometry');
  if (filterMode === 'parcel') return rows.filter((r) => r.geo === 'LatheGeometry'
    || (r.color && ['#38bdf8', '#22d3ee', '#67e8f9', '#e0f2fe', '#ffffff'].indexOf(r.color) >= 0 && r.scale < 1.3));
  if (filterMode === 'sky') return rows.filter((r) => r.pos[1] > 0.8);
  if (filterMode === 'dark') {
    return rows.filter((r) => {
      if (!r.color) return false;
      const n = parseInt(r.color.slice(1), 16);
      const lum = ((n >> 16 & 255) * 0.299 + (n >> 8 & 255) * 0.587 + (n & 255) * 0.114) / 255;
      return lum < 0.45 && r.pos[1] > 0.5;
    });
  }
  return rows;
}, FILTER);

console.log('filter=' + FILTER + '  settle=' + SETTLE + 'ms  ->  ' + out.length + ' visible meshes');
const counts = {};
out.forEach((r) => { const k = r.geo + ' ' + r.color + ' ' + r.mat + ' op' + r.opacity + ' ' + r.blending; counts[k] = (counts[k] || 0) + 1; });
Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20)
  .forEach(([k, n]) => console.log('  ' + String(n).padStart(4) + 'x  ' + k));
console.log('\nsamples:');
out.slice(0, 12).forEach((r) => console.log('  ' + JSON.stringify(r)));
await browser.close();
server.close();
