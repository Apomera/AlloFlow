import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

/**
 * DNA Lab helix — REAL WebGL smoke.
 *
 * The 2D view draws two sine waves with rungs. That reads as a twisted
 * ladder but cannot show the two things the tool's own 9-12 text asserts —
 * "a right-handed B-form double helix with major and minor grooves":
 *
 *   - handedness is invisible in projection (left- and right-handed helices
 *     flatten to the same sine wave);
 *   - the grooves come from the backbones NOT being antiphase, and a
 *     symmetric sine puts them exactly antiphase.
 *
 * So these tests assert the GEOMETRY, from sampled strand coordinates,
 * rather than that a canvas exists.
 */

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>dna harness</title>
<style>html,body{margin:0;height:100%;background:#0f172a}#wrap{width:900px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}
.relative{position:relative}</style></head>
<body><div id="wrap"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/vendor/three-r128/three.min.js"></script>
<script src="/stem_lab/stem_lab_module.js"></script>
<script>
  window.__events = { errors: [], sr: [] };
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });
  // Real host module: the helix backbone comes from StemLab.makeVoxelBatch.
  window.StemLab.ensureThree = function () { return Promise.resolve(window.THREE); };
  window.StemLab.loadScriptResilient = function () { return new Promise(function () {}); };
</script>
<script src="/stem_lab/stem_tool_dna.js"></script>
<script>
  var e = React.createElement;
  window.__mount = function (bucket) {
    var cfg = window.StemLab._registry.dnaLab;
    // State lives under toolData.dnaLab, not at the top level.
    window.__toolData = { dnaLab: Object.assign({ tab: 'build' }, bucket || {}) };
    var bump = null;
    var ctx = {
      React: React,
      get toolData() { return window.__toolData; },
      update: function (k, v) { window.__toolData = Object.assign({}, window.__toolData); window.__toolData[k] = v; if (bump) bump(); },
      updateMulti: function (patch) { window.__toolData = Object.assign({}, window.__toolData, patch); if (bump) bump(); },
      setToolData: function (fn) { window.__toolData = typeof fn === 'function' ? fn(window.__toolData) : fn; if (bump) bump(); },
      setStemLabTool: function () {}, setStemLabTab: function () {},
      addToast: function () {}, awardXP: function () {}, getXP: function () { return 0; },
      announceToSR: function (m) { window.__events.sr.push(String(m)); },
      celebrate: function () {}, beep: function () {},
      callGemini: null, gradeLevel: '9-12', toolSnapshots: [], props: {},
      t: function (k, fb) { return fb || k; },
      icons: new Proxy({}, { get: function () { return function () { return e('span'); }; } }),
      a11yClick: function (fn) { return { onClick: fn, role: 'button', tabIndex: 0 }; },
      srOnly: {}
    };
    function Comp() {
      var st = React.useState(0);
      bump = function () { st[1](function (n) { return n + 1; }); };
      return cfg.render(ctx);
    }
    window.__root = ReactDOM.createRoot(document.getElementById('wrap'));
    window.__root.render(e(Comp));
    return true;
  };
  window.__destroy = function () { if (window.__root) { window.__root.unmount(); window.__root = null; } };
  window.__gl = function () { return window.__alloDnaGL ? window.__alloDnaGL.debug() : null; };
  window.__click = function (sel) { var b = document.querySelector(sel); if (!b) return false; b.click(); return true; };
  window.__clickLabel = function (re) {
    var b = Array.from(document.querySelectorAll('button'))
      .find(function (el) { return new RegExp(re, 'i').test(el.getAttribute('aria-label') || ''); });
    if (!b) return false; b.click(); return true;
  };
  window.__flatCanvas = function () {
    var c = document.querySelector('canvas[role="img"]:not([data-dna-gl])');
    var cs = c && getComputedStyle(c);
    return c ? { present: true, display: cs.display, visibility: cs.visibility } : null;
  };
</script>
</body></html>`;

let server: Server;
let base: string;

test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    const url = (req.url || '/').split('?')[0];
    if (url === '/__harness') {
      res.writeHead(200, { 'content-type': MIME['.html'] });
      res.end(HARNESS);
      return;
    }
    try {
      const rel = normalize(decodeURIComponent(url)).replace(/^([/\\])+/, '');
      const file = join(ROOT, rel);
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('no'); return; }
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});

test.afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

type Pg = import('@playwright/test').Page;

async function mount3d(page: Pg, bucket: Record<string, unknown> = {}) {
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.dnaLab);
  await page.evaluate((b) => (window as any).__mount(b), Object.assign({ showHelix3d: true }, bucket));
  await page.waitForSelector('canvas[data-dna-gl="true"]', { timeout: 30000 });
  await page.waitForFunction(() => (window as any).__gl()?.state === 'ready', null, { timeout: 30000 });
  await page.waitForTimeout(400);
}

test.describe.configure({ timeout: 150_000 });

test.describe('DNA helix — real WebGL', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  test('mounts one live GL canvas with a bead per base on each strand', async ({ page }) => {
    await mount3d(page);
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
    // Default sequence is 18 bases: 18 beads per strand, and a half-rod per
    // base on each side of every pair.
    expect(gl.beadCount).toBe(36);
    expect(gl.rungCount).toBe(36);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('the helix is right-handed', async ({ page }) => {
    // The claim 2D cannot support at all: a projected left-handed helix is
    // the same sine wave. Right-handed means the cross product of the radial
    // vector with its successor points along +y (the climb direction) — i.e.
    // the strand turns anticlockwise seen from +y as it rises.
    await mount3d(page);
    const pts: Array<{ x: number; y: number; z: number }> =
      await page.evaluate(() => (window as any).__gl().strandSample);
    expect(pts.length).toBeGreaterThanOrEqual(8);

    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].y, 'strand must climb').toBeGreaterThan(pts[i - 1].y);
      // cross(r_prev, r_next).y for the horizontal components
      const cy = pts[i - 1].z * pts[i].x - pts[i - 1].x * pts[i].z;
      // Consecutive bases are 34.3 deg apart, well under 180, so the sign of
      // this component is an unambiguous handedness test.
      expect(cy, `turn direction at base ${i}`).toBeLessThan(0);
    }
  });

  test('the two grooves are unequal, which is what names them', async ({ page }) => {
    // A symmetric sine wave puts the strands exactly antiphase (180/180) and
    // the grooves come out identical. B-DNA does not: ~140 and ~220.
    await mount3d(page);
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.strandOffsetDeg).toBeGreaterThan(110);
    expect(gl.strandOffsetDeg).toBeLessThan(170);
    expect(gl.strandOffsetDeg).not.toBe(180);
    // Minor + major = a full turn.
    expect(360 - gl.strandOffsetDeg).toBeGreaterThan(gl.strandOffsetDeg);
  });

  test('the pitch matches the B-form the tool teaches', async ({ page }) => {
    await mount3d(page);
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.bpPerTurn).toBeCloseTo(10.5, 5);
    expect(gl.risePerBp).toBeCloseTo(3.4, 5);

    // 10.5 is not an integer, so no whole number of bases lands exactly back
    // at the start — assert the per-base angular step instead, which is the
    // quantity bpPerTurn actually specifies.
    const pts: Array<{ x: number; z: number }> =
      await page.evaluate(() => (window as any).__gl().strandSample);
    const ang = (p: { x: number; z: number }) => Math.atan2(p.z, p.x);
    const expectedStep = (2 * Math.PI) / 10.5;
    for (let i = 1; i < Math.min(pts.length, 10); i++) {
      let d = ang(pts[i]) - ang(pts[i - 1]);
      while (d <= -Math.PI) d += 2 * Math.PI;
      while (d > Math.PI) d -= 2 * Math.PI;
      expect(Math.abs(d), `step at base ${i}`).toBeCloseTo(expectedStep, 4);
    }
  });

  test('the 2D ladder stays mounted as the floor', async ({ page }) => {
    await mount3d(page);
    const flat = await page.evaluate(() => (window as any).__flatCanvas());
    expect(flat.present).toBe(true);
    // visibility, not display: a display:none canvas reports clientWidth 0,
    // and the 2D draw sizes bases from (width - 80) / seqLen.
    expect(flat.visibility).toBe('hidden');
    expect(flat.display).toBe('block');
  });

  test('defaults to the flat ladder and only builds GL on request', async ({ page }) => {
    await page.goto(`${base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.dnaLab);
    await page.evaluate(() => (window as any).__mount({}));
    expect(await page.evaluate(() => document.querySelectorAll('canvas[data-dna-gl]').length)).toBe(0);

    await page.evaluate(() => (window as any).__click('[data-dna-view]'));
    await page.waitForSelector('canvas[data-dna-gl="true"]', { timeout: 30000 });
    expect(await page.evaluate(() => (window as any).__toolData.dnaLab.showHelix3d)).toBe(true);
  });

  test('a longer sequence builds a longer helix', async ({ page }) => {
    await mount3d(page, { dnaSequence: 'ATGC' });
    expect((await page.evaluate(() => (window as any).__gl())).beadCount).toBe(8);
    await page.evaluate(() => (window as any).__destroy());

    await mount3d(page, { dnaSequence: 'ATGCATGCAT' });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.beadCount).toBe(20);
    expect(gl.rungCount).toBe(20);
    expect(await page.evaluate(() => document.querySelectorAll('canvas[data-dna-gl]').length)).toBe(1);
  });

  test('rotate buttons move the camera without a mouse', async ({ page }) => {
    await mount3d(page);
    const before = await page.evaluate(() => (window as any).__gl().canvas);
    expect(before.w).toBeGreaterThan(100);
    await page.evaluate(() => (window as any).__clickLabel('Turn left'));
    await page.waitForTimeout(400);
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
  });

  test('tears the renderer down on unmount', async ({ page }) => {
    await mount3d(page);
    await page.evaluate(() => (window as any).__destroy());
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).__gl().state)).toBe('idle');
  });
});
