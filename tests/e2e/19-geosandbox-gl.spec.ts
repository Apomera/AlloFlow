import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

/**
 * Geometry Sandbox — REAL WebGL smoke.
 *
 * Everything else covering the stretch builder runs in jsdom against a stubbed
 * THREE. That proves the geometry is right; it cannot prove a solid is on SCREEN,
 * which is the thing that was actually broken. Headless Chromium rasterises WebGL
 * through SwiftShader, so this drives the real renderer and READS PIXELS.
 *
 * ── What this DID and DID NOT establish, so nobody re-derives it ──
 * The first diagnosis of the reported "prism disappears and reappears" was the
 * invisible 40x40 ShadowMaterial catcher at y=0.001, which inherits depthWrite=true
 * while drawing nothing. Driving it here disproved that as the CAUSE: the catcher
 * is FrontSide, so from underneath it is back-face culled and writes no depth. The
 * hazard is nonetheless real and one property away — forcing it double-sided with
 * depthWrite on annihilates every solid above the floor (asserted below), so
 * depthWrite:false stays as hardening.
 * ── Do not trust ad-hoc colour buckets here. Three separate "signals" turned out
 * to be measurement artifacts:
 *   1. a 15x violet swing across an orbit — the retained blue rect masking the
 *      prism at some azimuths, identical with and without the sort fix;
 *   2. a 4x "blue" swing under sub-pixel camera nudges that looked exactly like
 *      z-fighting — it was the GRID (0x64748b, g-r = 16) drifting across a
 *      `g > r + 15` threshold as anti-aliasing changed;
 *   3. the below-the-grid vanish, which cannot happen at all (catcher is culled).
 * Assert on the live scene graph and material state, which are exact. Reach for
 * pixels only where nothing else can answer the question, and pick thresholds that
 * clear every colour in the scene furniture by a wide margin.
 *
 * SwiftShader is also a software rasteriser with its own depth precision, so it is
 * a poor instrument for z-fighting specifically — absence of a signal here is weak
 * evidence. Direct observation on real hardware outranks it.
 *
 * Pixel discriminator: the construction palette is violet/amber (r > g) while the
 * background, grid and shadow are all slate (g > r), so "r > g" isolates the solid
 * from the scene furniture without matching an exact blended colour. It then splits
 * on blue: violet body (b > 120) vs amber outline (b <= 120).
 * ── Careful: a SELECTED solid is drawn amber, so it lands in the outline bucket,
 * not the solid one. Tests that care about body pixels leave the solid unselected;
 * tests that just want "something was painted" sum the two.
 *
 * Serves the WORKING TREE on an ephemeral port; React and three r128 come from the
 * tree too, so no network. Pattern follows tests/e2e/18-geometry-world-gl.spec.ts.
 * NOTE: the vendored three.min.js has no OrbitControls, and the tool guards with
 * `if (THREE.OrbitControls)`, so controls stay null and a test can place the
 * camera directly without the controller fighting it back.
 */

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

// A prism standing clear of the floor: x -1.5..1.5, y 0.2..2.2, z -2..2.
// u x v points along +w, so the basis is right-handed exactly as stretchRect builds it.
const PRISM = { id: 1, type: 'prism', position: [-1.5, 0.2, -2], u: [3, 0, 0], v: [0, 2, 0], w: [0, 0, 4] };

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>geo sandbox harness</title>
<style>html,body{margin:0;height:100%;background:#0f172a}
#wrap{width:900px;height:600px;position:relative;display:flex}</style></head>
<body><div id="wrap"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/vendor/three-r128/three.min.js"></script>
<script src="/prim3d_module.js"></script>
<script>
  window.__events = { toasts: [], errors: [] };
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });

  window.StemLab = {
    _registry: {},
    registerTool: function (id, cfg) { cfg.id = id; this._registry[id] = cfg; },
    isRegistered: function (id) { return !!this._registry[id]; },
    loadScriptResilient: function () { return new Promise(function () {}); },
    ensureThree: function () { return Promise.resolve(window.THREE); },
    getRegisteredTools: function () { return Object.values(this._registry); }
  };
</script>
<script src="/stem_lab/stem_tool_geosandbox.js"></script>
<script>
  var e = React.createElement;

  window.__mount = function (bucket) {
    var cfg = window.StemLab._registry.geoSandbox;
    if (!cfg) return false;
    var toolData = { _threeLoaded: true, geoSandbox: Object.assign({ mode: 'stretch' }, bucket || {}) };
    window.__toolData = toolData;
    var bump = null;
    var ctx = {
      React: React,
      toolData: toolData,
      setToolData: function (fn) {
        if (typeof fn === 'function') {
          var next = fn(toolData);
          if (next) { toolData = next; window.__toolData = next; ctx.toolData = next; }
        }
        if (bump) bump();
      },
      update: function (b, k, v) { toolData[b] = Object.assign({}, toolData[b]); toolData[b][k] = v; if (bump) bump(); },
      updateMulti: function (b, patch) { toolData[b] = Object.assign({}, toolData[b], patch); if (bump) bump(); },
      setStemLabTool: function () {}, setStemLabTab: function () {},
      addToast: function (m, k) { window.__events.toasts.push({ message: String(m), kind: k }); },
      awardXP: function () {}, getXP: function () { return 0; },
      announceToSR: function (m) { window.__events.sr = String(m); },
      celebrate: function () {}, beep: function () {},
      callGemini: null, callTTS: null, callImagen: null,
      gradeLevel: '7th Grade', toolSnapshots: [], props: {},
      t: function (k, fb) { return fb || k; },
      icons: new Proxy({}, { get: function () { return function () { return e('span'); }; } }),
      a11yClick: function (fn) { return { onClick: fn, role: 'button', tabIndex: 0 }; },
      srOnly: {},
      activeSessionCode: null, studentNickname: 'Tester', isTeacherMode: false
    };
    function Comp() {
      var st = React.useState(0);
      bump = function () { st[1](function (n) { return n + 1; }); };
      ctx.toolData = toolData;
      return cfg.render(ctx);
    }
    window.__root = ReactDOM.createRoot(document.getElementById('wrap'));
    window.__root.render(e(Comp));
    return true;
  };

  window.__glLive = function () {
    var c = document.getElementById('geo-sandbox-canvas');
    if (!c) return null;
    var gl = c.getContext('webgl2') || c.getContext('webgl');
    return { lost: gl ? gl.isContextLost() : null, w: c.clientWidth, h: c.clientHeight,
             canvasCount: document.querySelectorAll('#geo-viewport-shell canvas').length };
  };

  // Point the camera at a spot from a given eye position. Controls are null here
  // (no OrbitControls in the vendored build), so nothing overwrites this.
  window.__look = function (eye, at) {
    var gs = window._geoScene;
    if (!gs) return false;
    if (gs.controls) { gs.controls.enabled = false; gs.controls.autoRotate = false; }
    gs.camera.position.set(eye[0], eye[1], eye[2]);
    gs.camera.lookAt(at[0], at[1], at[2]);
    gs.camera.updateMatrixWorld(true);
    return true;
  };

  // Force a fresh draw and count pixels belonging to the construction. Reading in
  // the SAME task as the render is what keeps the drawing buffer valid without
  // preserveDrawingBuffer.
  window.__renderAndCount = function () {
    var gs = window._geoScene;
    if (!gs) return null;
    var comp = gs.renderer._alloComposer;
    if (comp) { comp.render(); } else { gs.renderer.render(gs.scene, gs.camera); }
    var c = document.getElementById('geo-sandbox-canvas');
    var off = document.createElement('canvas');
    off.width = c.width; off.height = c.height;
    var g2 = off.getContext('2d');
    g2.drawImage(c, 0, 0);
    var d = g2.getImageData(0, 0, off.width, off.height).data;
    var solid = 0, outline = 0, total = off.width * off.height;
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i], g = d[i + 1], b = d[i + 2];
      if (r > g + 15) { if (b > 120) solid++; else outline++; }
    }
    return { solid: solid, outline: outline, total: total, w: off.width, h: off.height };
  };

  // Render the same scene from N azimuths around a target and report the violet
  // pixel count at each. A solid that is being wrongly depth-rejected shows up as a
  // collapse at some angles and a recovery at others — which is exactly what
  // "disappears and reappears" looks like from the student's chair.
  window.__orbitScan = function (steps, radius, height, at) {
    var gs = window._geoScene;
    if (!gs) return null;
    var out = [];
    for (var i = 0; i < steps; i++) {
      var a = (i / steps) * Math.PI * 2;
      gs.camera.position.set(at[0] + Math.cos(a) * radius, height, at[2] + Math.sin(a) * radius);
      gs.camera.lookAt(at[0], at[1], at[2]);
      gs.camera.updateMatrixWorld(true);
      gs.renderer.render(gs.scene, gs.camera);
      var c = document.getElementById('geo-sandbox-canvas');
      var off = document.createElement('canvas');
      off.width = c.width; off.height = c.height;
      var g2 = off.getContext('2d');
      g2.drawImage(c, 0, 0);
      var d = g2.getImageData(0, 0, off.width, off.height).data;
      var solid = 0;
      for (var j = 0; j < d.length; j += 4) if (d[j] > d[j + 1] + 15 && d[j + 2] > 120) solid++;
      out.push(solid);
    }
    return out;
  };

  // Per-object visibility: hide every construction child but one, render, count its
  // pixels. That isolates "is THIS object on screen", which a whole-scene colour
  // count cannot do once objects overlap or share a hue.
  window.__perObjectPixels = function () {
    var gs = window._geoScene;
    var cg = gs && gs.constructionGroup;
    if (!cg) return null;
    var kids = cg.children.filter(function (ch) { return ch.userData && ch.userData.objId != null && ch.type !== 'Sprite'; });
    var was = kids.map(function (k) { return k.visible; });
    var out = [];
    var count = function () {
      gs.renderer.render(gs.scene, gs.camera);
      var c = document.getElementById('geo-sandbox-canvas');
      var off = document.createElement('canvas');
      off.width = c.width; off.height = c.height;
      var g2 = off.getContext('2d');
      g2.drawImage(c, 0, 0);
      var d = g2.getImageData(0, 0, off.width, off.height).data;
      var n = 0;
      // Anything clearly off the slate background counts as "painted".
      for (var i = 0; i < d.length; i += 4) {
        var r = d[i], g = d[i + 1], b = d[i + 2];
        if (Math.abs(r - 15) + Math.abs(g - 23) + Math.abs(b - 42) > 60) n++;
      }
      return n;
    };
    for (var i = 0; i < kids.length; i++) {
      for (var j = 0; j < kids.length; j++) kids[j].visible = (i === j);
      out.push({ objId: kids[i].userData.objId, type: kids[i].userData.objType, painted: count() });
    }
    for (var k = 0; k < kids.length; k++) kids[k].visible = was[k];
    var all = count();
    return { perObject: out, allTogether: all };
  };

  window.__sceneGroups = function () {
    var gs = window._geoScene;
    if (!gs) return null;
    var cg = gs.constructionGroup;
    // The group also holds a measurement label sprite for the selected object, so
    // children.length is NOT the object count — split them by userData.objId.
    var objs = cg ? cg.children.filter(function (ch) { return ch.userData && ch.userData.objId != null && ch.type !== 'Sprite'; }) : [];
    return {
      hasConstruction: !!cg,
      childCount: cg ? cg.children.length : 0,
      objectCount: objs.length,
      labelCount: cg ? cg.children.filter(function (ch) { return ch.type === 'Sprite'; }).length : 0,
      positions: objs.map(function (ch) { return [ch.position.x, ch.position.y, ch.position.z]; }),
      hasGhost: !!gs.ghostGroup,
      ghostChildren: gs.ghostGroup ? gs.ghostGroup.children.length : 0,
      hasSlice: !!gs.sliceGroup
    };
  };

  // Materials of the first construction object, straight off the live scene graph.
  window.__firstObjectMaterials = function () {
    var gs = window._geoScene;
    var cg = gs && gs.constructionGroup;
    if (!cg || !cg.children.length) return null;
    var out = [];
    cg.children[0].traverse(function (o) {
      if (o.material) {
        out.push({ type: o.type, colour: o.material.color ? o.material.color.getHex() : null,
                   depthTest: o.material.depthTest, side: o.material.side, renderOrder: o.renderOrder });
      }
    });
    return out;
  };

  window.__destroy = function () {
    try { if (window.__root) window.__root.unmount(); } catch (err) {}
    try {
      var cs = document.querySelectorAll('canvas');
      for (var i = 0; i < cs.length; i++) {
        var g = null;
        try { g = cs[i].getContext('webgl2') || cs[i].getContext('webgl'); } catch (e2) {}
        if (!g || g.isContextLost()) continue;
        var ext = g.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      }
    } catch (err) {}
  };
</script></body></html>`;

let server: Server;
let base: string;

test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    const url = (req.url || '/').split('?')[0];
    // no-store everywhere: without it Chromium heuristically caches the tool file,
    // and a spec that edits source between runs silently measures the OLD build.
    if (url === '/__harness') {
      res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-store' });
      res.end(HARNESS);
      return;
    }
    try {
      const rel = normalize(decodeURIComponent(url)).replace(/^([/\\])+/, '');
      const file = join(ROOT, rel);
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('no'); return; }
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
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

async function mount(page: Pg, bucket: Record<string, unknown> = {}) {
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.geoSandbox);
  await page.evaluate((b) => (window as any).__mount(b), bucket);
  await page.waitForSelector('#geo-sandbox-canvas', { timeout: 30000 });
  // Wait for the renderer AND a laid-out canvas. Asserting on canvas size before
  // layout settles was the one source of flake here — the scene object appears a
  // tick before the element has a box.
  await page.waitForFunction(() => {
    const gs = (window as any)._geoScene;
    const c = document.getElementById('geo-sandbox-canvas') as HTMLCanvasElement | null;
    return !!(gs && gs.renderer && gs.camera && c && c.clientWidth > 0 && c.clientHeight > 0);
  }, null, { timeout: 30000 });
  await page.waitForTimeout(600);
}

const scene = (objects: unknown[], selection: unknown = null, extra: Record<string, unknown> = {}) =>
  Object.assign({ construction: { objects, selection } }, extra);

// SwiftShader is a software rasteriser and the pixel readback below is slow.
test.describe.configure({ timeout: 150_000 });

test.describe('Geometry Sandbox — real WebGL', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  test('mounts a single live GL canvas', async ({ page }) => {
    await mount(page, scene([PRISM], 1));
    const gl = await page.evaluate(() => (window as any).__glLive());
    expect(gl).not.toBeNull();
    expect(gl.lost).toBe(false);
    expect(gl.canvasCount).toBe(1);
    expect(gl.w).toBeGreaterThan(400);
  });

  test('clicking a sculpt primitive selects it and reveals its formulas in the viewport', async ({ page }) => {
    await mount(page, {
      mode: 'sculpt',
      sculptRecipe: { name: 'Math box', parts: [
        { shape: 'box', size: [1, 2, 3], position: [0, 1, 0], rotation: [0, 0, 0], color: '#60a5fa' },
        { shape: 'sphere', size: [0.7], position: [4, 1, 0], rotation: [0, 0, 0], color: '#f472b6' },
      ] },
    });
    await page.waitForFunction(() => !!(window as any)._geoScene?.sculptGroup?.children?.length);
    const clickPoint = await page.evaluate(() => {
      const gs = (window as any)._geoScene;
      const canvas = document.getElementById('geo-sandbox-canvas') as HTMLCanvasElement;
      const mesh = gs.sculptGroup.children.find((child: any) => child.userData?.prim3dPartIndex === 0);
      gs.camera.updateMatrixWorld(true);
      mesh.updateMatrixWorld(true);
      const projected = new (window as any).THREE.Vector3();
      mesh.getWorldPosition(projected);
      projected.project(gs.camera);
      const box = canvas.getBoundingClientRect();
      return { x: box.left + (projected.x + 1) * box.width / 2, y: box.top + (1 - projected.y) * box.height / 2 };
    });
    const hitCount = await page.evaluate(({ x, y }) => {
      const gs = (window as any)._geoScene;
      const canvas = document.getElementById('geo-sandbox-canvas') as HTMLCanvasElement;
      const box = canvas.getBoundingClientRect();
      const pointer = new (window as any).THREE.Vector2(((x - box.left) / box.width) * 2 - 1, -((y - box.top) / box.height) * 2 + 1);
      const ray = new (window as any).THREE.Raycaster();
      ray.setFromCamera(pointer, gs.camera);
      return ray.intersectObjects(gs.sculptGroup.children, true).length;
    }, clickPoint);
    expect(hitCount).toBeGreaterThan(0);
    await page.evaluate(({ x, y }) => {
      const canvas = document.getElementById('geo-sandbox-canvas') as HTMLCanvasElement;
      canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, button: 0 }));
      canvas.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x, clientY: y, button: 0 }));
    }, clickPoint);

    const overlay = page.locator('[data-geo-sculpt-math-overlay="true"]');
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('V = l × w × h');
    await expect(overlay).toContainText('SA = 2(lw + lh + wh)');
    await page.waitForFunction(() => !!(window as any)._geoScene?.sculptGroup?.children?.some((child: any) => child.userData?.geoSculptSelected));
    await expect(overlay).toContainText('Linked representation');
    await expect(overlay).toContainText('Cross-section: Rectangle');
    await expect(overlay).toContainText('Net: 6 rectangles');
    await expect(overlay.locator('svg[role="img"]')).toBeVisible();
    await expect(overlay.locator('svg title')).toHaveText('Box net and cross-section');

    // A compact navigator names the selection, moves predictably between parts,
    // and offers an explicit camera focus without coupling camera motion to selection.
    const partNavigator = page.locator('[data-geo-sculpt-part-navigator="true"]');
    await expect(partNavigator).toContainText('Part 1 of 2 · Rectangular Prism');
    const sphereMathButton = page.getByRole('button', { name: /^2\. Sphere/ });
    await sphereMathButton.focus();
    await page.waitForFunction(() => !!(window as any)._geoScene?.sculptGroup?.children?.some((child: any) => child.userData?.prim3dPartIndex === 1 && child.userData?.geoSculptPreview));
    await sphereMathButton.evaluate((button: HTMLElement) => button.blur());
    await page.waitForFunction(() => !(window as any)._geoScene?.sculptGroup?.children?.some((child: any) => child.userData?.geoSculptPreview));
    await partNavigator.getByRole('button', { name: 'Focus 3D' }).click();
    await page.waitForFunction(() => {
      const gs = (window as any)._geoScene;
      const mesh = gs?.sculptGroup?.children?.find((child: any) => child.userData?.prim3dPartIndex === 0);
      if (!mesh || !gs.camera || (window as any)._geoFocusAnim) return false;
      mesh.updateMatrixWorld(true);
      const THREE = (window as any).THREE;
      const center = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
      if (gs.controls?.target) return gs.controls.target.distanceTo(center) < 0.03 && gs.controls.autoRotate === false;
      const view = new THREE.Vector3(); gs.camera.getWorldDirection(view);
      const towardCenter = center.clone().sub(gs.camera.position).normalize();
      return view.dot(towardCenter) > 0.999;
    });
    await partNavigator.getByRole('button', { name: 'View all' }).click();
    await page.waitForFunction(() => {
      const gs = (window as any)._geoScene;
      if (!gs?.camera || (window as any)._geoFocusAnim) return false;
      const THREE = (window as any).THREE;
      const bounds = new THREE.Box3();
      gs.sculptGroup.children.forEach((child: any) => {
        if (child.userData?.prim3dPartIndex != null) { child.updateMatrixWorld(true); bounds.expandByObject(child); }
      });
      const center = bounds.getCenter(new THREE.Vector3());
      if (gs.controls?.target) return gs.controls.target.distanceTo(center) < 0.03;
      const view = new THREE.Vector3(); gs.camera.getWorldDirection(view);
      return view.dot(center.clone().sub(gs.camera.position).normalize()) > 0.999;
    });
    await partNavigator.getByRole('button', { name: 'Select next sculpt part' }).click();
    await expect(partNavigator).toContainText('Part 2 of 2 · Sphere');
    await expect(overlay).toContainText('V = ⁴⁄₃πr³');
    await partNavigator.getByRole('button', { name: 'Select previous sculpt part' }).click();
    await expect(partNavigator).toContainText('Part 1 of 2 · Rectangular Prism');
    await expect(overlay).toContainText('V = l × w × h');

    // The optional live section is spatially linked to the selected primitive,
    // reports the exact grid-scaled area, and never intercepts object picking.
    const sliceExplorer = page.locator('[data-geo-sculpt-cross-section="true"]');
    await expect(sliceExplorer).toBeVisible();
    await sliceExplorer.getByLabel('Show the section plane in the 3D sculpt').check();
    await page.waitForFunction(() => {
      let guide: any = null;
      (window as any)._geoScene?.sculptGroup?.traverse((node: any) => {
        if (node.userData?.isGeoSculptSliceGuide) guide = node;
      });
      return !!guide;
    });
    const sliceGuide = await page.evaluate(() => {
      let guide: any = null;
      (window as any)._geoScene.sculptGroup.traverse((node: any) => {
        if (node.userData?.isGeoSculptSliceGuide) guide = node;
      });
      return {
        y: guide.position.y,
        area: guide.userData.geoSculptSliceArea,
        depthWrite: guide.material.depthWrite,
        hasRaycastOverride: Object.prototype.hasOwnProperty.call(guide, 'raycast'),
      };
    });
    expect(sliceGuide.y).toBeCloseTo(0, 5);
    expect(sliceGuide.area).toBeCloseTo(3, 5);
    expect(sliceGuide.depthWrite).toBe(false);
    expect(sliceGuide.hasRaycastOverride).toBe(true);
    await expect(overlay).toContainText('Section 50%');
    await expect(overlay).toContainText('A = 20.28 u²');
    const areaProfile = sliceExplorer.locator('[data-geo-sculpt-slice-profile="true"]');
    await expect(areaProfile).toBeVisible();
    await expect(areaProfile.locator('title')).toHaveText('Cross-sectional area by height (local Y)');
    await expect(areaProfile).toHaveAttribute('aria-label', /32-slice volume estimate/);
    const sliceVolume = sliceExplorer.locator('[data-geo-sculpt-slice-volume="true"]');
    await expect(sliceVolume).toContainText('32 slices × Δh');
    await expect(sliceVolume).toContainText('Stack V ≈ 105.46 u³ · exact 105.46 u³');
    await expect(sliceVolume).toContainText('Below plane ≈ 52.73 u³');
    const sliceSlider = sliceExplorer.getByRole('slider', { name: 'Cross-section height' });
    await sliceSlider.fill('0.25');
    await page.waitForFunction(() => {
      let guide: any = null;
      (window as any)._geoScene?.sculptGroup?.traverse((node: any) => {
        if (node.userData?.isGeoSculptSliceGuide) guide = node;
      });
      return guide?.position?.y < -0.49;
    });
    await expect(sliceExplorer).toContainText('25%');

    // Hand-editing adds six directly pickable ±X/±Y/±Z handles around the part.
    await page.getByRole('button', { name: /Edit by hand/ }).click();
    await page.waitForFunction(() => {
      let count = 0;
      (window as any)._geoScene?.sculptGroup?.traverse((node: any) => { if (node.userData?.isGeoSculptHandle) count++; });
      return count === 6;
    });    const handleKinds = await page.evaluate(() => {
      let handles = 0, stems = 0, positiveSpheres = 0, negativeCubes = 0;
      (window as any)._geoScene.sculptGroup.traverse((node: any) => {
        if (node.userData?.isGeoSculptHandleStem) stems++;
        if (node.userData?.isGeoSculptHandle) {
          handles++;
          if (node.userData.geoSculptHandleSign === 'positive' && node.geometry?.type === 'SphereGeometry') positiveSpheres++;
          if (node.userData.geoSculptHandleSign === 'negative' && node.geometry?.type === 'BoxGeometry') negativeCubes++;
        }
      });
      return { handles, stems, positiveSpheres, negativeCubes };
    });
    expect(handleKinds).toEqual({ handles: 6, stems: 3, positiveSpheres: 3, negativeCubes: 3 });
    const handlePoint = await page.evaluate(() => {
      const gs = (window as any)._geoScene;
      const canvas = document.getElementById('geo-sandbox-canvas') as HTMLCanvasElement;
      let positive: any = null, negative: any = null;
      gs.sculptGroup.traverse((node: any) => {
        if (!(node.userData?.isGeoSculptHandle && node.userData.geoSculptHandleAxis === 'x')) return;
        if (node.userData.geoSculptHandleDir > 0) positive = node; else negative = node;
      });
      gs.camera.updateMatrixWorld(true); positive.updateMatrixWorld(true); negative.updateMatrixWorld(true);
      const pp = new (window as any).THREE.Vector3(), pn = new (window as any).THREE.Vector3();
      positive.getWorldPosition(pp); negative.getWorldPosition(pn); pp.project(gs.camera); pn.project(gs.camera);
      const box = canvas.getBoundingClientRect();
      const plus = { x: box.left + (pp.x + 1) * box.width / 2, y: box.top + (1 - pp.y) * box.height / 2 };
      const minus = { x: box.left + (pn.x + 1) * box.width / 2, y: box.top + (1 - pn.y) * box.height / 2 };
      const dx = plus.x - minus.x, dy = plus.y - minus.y, mag = Math.hypot(dx, dy);
      return { x: plus.x, y: plus.y, ux: dx / mag, uy: dy / mag };
    });
    await page.evaluate(({ x, y, ux, uy }) => {
      const canvas = document.getElementById('geo-sandbox-canvas') as HTMLCanvasElement;
      canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, button: 0, pointerId: 7 }));
      canvas.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x + ux * 42, clientY: y + uy * 42, button: 0, pointerId: 7 }));
      canvas.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x + ux * 42, clientY: y + uy * 42, button: 0, pointerId: 7 }));
    }, handlePoint);
    await page.waitForFunction(() => (window as any).__toolData.geoSandbox.sculptRecipe.parts[0].position[0] > 0);
    await expect(overlay).toContainText('Recent transformations');
    await expect(overlay).toContainText('Moved X +1.00 u');
    if (process.env.GEO_VISUAL_CAPTURE) await page.screenshot({ path: process.env.GEO_VISUAL_CAPTURE, fullPage: true });
  });

  test('the solid stays visible from below the grid, and the catcher cannot eat it', async ({ page }) => {
    await mount(page, scene([PRISM], null));

    // Control: from a normal angle above the floor, the prism is plainly on screen.
    await page.evaluate(() => (window as any).__look([0, 5, 11], [0, 1.2, 0]));
    const above = await page.evaluate(() => (window as any).__renderAndCount());
    expect(above.solid).toBeGreaterThan(2000);

    // The regression: camera under the floor looking up. The shadow catcher sits
    // between eye and solid here. With depthWrite on it wrote depth across the
    // whole 40x40 ground while drawing nothing, and the prism was depth-rejected.
    await page.evaluate(() => (window as any).__look([0, -5, 9], [0, 1.2, 0]));
    const below = await page.evaluate(() => (window as any).__renderAndCount());
    expect(below.solid).toBeGreaterThan(2000);

    // The shadow catcher is FrontSide, so from underneath it is back-face culled
    // and writes no depth — which is why this angle never actually reproduced the
    // vanish, contrary to the first diagnosis. The hazard is real all the same:
    // force the catcher double-sided with depthWrite back on and the solid is
    // annihilated. depthWrite:false is what keeps that a non-event.
    const hazard = await page.evaluate(() => {
      const gs = (window as any)._geoScene;
      let plane: any = null;
      gs.scene.traverse((o: any) => { if (o.material && o.material.type === 'ShadowMaterial') plane = o; });
      if (!plane) return null;
      const wasSide = plane.material.side;
      plane.material.side = (window as any).THREE.DoubleSide;
      plane.material.depthWrite = true;                    // the original defect
      const withDefect = (window as any).__renderAndCount().solid;
      plane.material.depthWrite = false;                   // the fix
      const withFix = (window as any).__renderAndCount().solid;
      plane.material.side = wasSide;
      return { withDefect, withFix };
    });
    expect(hazard.withDefect).toBe(0);                     // everything above the floor gone
    expect(hazard.withFix).toBeGreaterThan(2000);          // and back again

    // Both views show a comparable amount of solid — it is not a sliver surviving.
    expect(below.solid).toBeGreaterThan(above.solid * 0.4);
  });

  test('driving the real Stretch button builds the whole ladder, every rung on screen', async ({ page }) => {
    // Clicks the actual controls rather than hand-authoring state, so this covers
    // performStretch, commitNewObject, the selection hand-off and the scene rebuild
    // that fires on every construction change — the path a student is on.
    await mount(page, scene([], null));
    await page.evaluate(() => (window as any).__look([7, 5, 11], [1.5, 1, 1]));

    await page.getByRole('button', { name: 'Add a point at origin' }).click();
    await page.waitForTimeout(400);

    for (let i = 0; i < 3; i++) {
      await page.locator('button', { hasText: /^⤴ Stretch (point|segment|rectangle)/ }).first().click();
      await page.waitForTimeout(400);
    }

    const seen = await page.evaluate(() => (window as any).__perObjectPixels());
    expect(seen.perObject.map((o: any) => o.type)).toEqual(['point', 'segment', 'rect', 'prism']);

    // Each object rendered SOMETHING on its own — measured one at a time, since a
    // whole-scene count cannot tell a hidden object from an overlapped one.
    const floor = seen.perObject[0].painted;      // the point is a 0.18 sphere: scene furniture only
    expect(seen.perObject[2].painted).toBeGreaterThan(floor + 1000);   // rect
    expect(seen.perObject[3].painted).toBeGreaterThan(floor + 2000);   // prism
    // And with everything shown, the newest solid still dominates rather than being
    // swallowed by the source objects the tool deliberately keeps around.
    expect(seen.allTogether).toBeGreaterThanOrEqual(seen.perObject[3].painted);

    const errs: string[] = await page.evaluate(() => (window as any).__events.errors);
    expect(errs.filter((m) => !/ResizeObserver loop/.test(m))).toEqual([]);
  });

  test('a stretched-from rectangle cannot fight the solid for its own base face', async ({ page }) => {
    // stretchRect reuses the rectangle's position/u/v, so the prism's base face is
    // exactly the retained rectangle's plane. Coplanar translucent faces that both
    // write depth have no defined winner and shimmer as the camera moves. The
    // polygon offset settles it: whichever order they draw in, the solid wins.
    const rc = { id: 3, type: 'rect', position: [0, 0, 0], u: [2, 0, 0], v: [0, 2, 0] };
    const pr = { id: 4, type: 'prism', position: [0, 0, 0], u: [2, 0, 0], v: [0, 2, 0], w: [0, 0, 2] };
    await mount(page, scene([rc, pr], null));

    const mats = await page.evaluate(() => {
      const cg = (window as any)._geoScene.constructionGroup;
      const pick = (id: number) => {
        const node = cg.children.find((c: any) => c.userData && c.userData.objId === id);
        let m: any = null;
        node.traverse((o: any) => { if (o.material && o.type === 'Mesh') m = o.material; });
        return { polygonOffset: m.polygonOffset, factor: m.polygonOffsetFactor, depthWrite: m.depthWrite };
      };
      return { rect: pick(3), prism: pick(4) };
    });

    expect(mats.rect.polygonOffset).toBe(true);
    expect(mats.rect.factor).toBeGreaterThan(0);      // pushed away from the viewer
    expect(mats.prism.polygonOffset).toBe(false);     // the solid keeps true depth
  });

  test('a lone solid never drops out while the camera orbits it', async ({ page }) => {
    // The reported symptom was a prism that came and went as the view moved, so the
    // instrument is a full turn with a pixel count at each stop.
    //
    // Measured ALONE on purpose. With the rest of a stretch chain present the count
    // is confounded: the tool retains every source object, so the blue rect ends up
    // exactly coplanar with the prism's base and masks the violet body at the
    // azimuths facing that face. That produces a 15x swing in the violet count with
    // NOTHING wrong — verified by measuring it with and without the sort fix and
    // getting byte-identical numbers. A solid on its own has no such confound.
    await mount(page, scene([PRISM], null));

    const above = await page.evaluate(() => (window as any).__orbitScan(12, 11, 4, [0, 1.2, 0]));
    expect(Math.min(...above)).toBeGreaterThan(2000);

    // And from under the grid, where the shadow catcher lives.
    const below = await page.evaluate(() => (window as any).__orbitScan(8, 11, -4, [0, 1.2, 0]));
    expect(Math.min(...below)).toBeGreaterThan(2000);
  });

  test('two solids each get their own depth sort key in real three.js', async ({ page }) => {
    const far = Object.assign({}, PRISM, { id: 2, position: [6, 0.2, 4] });
    await mount(page, scene([PRISM, far], null));

    const groups = await page.evaluate(() => (window as any).__sceneGroups());
    expect(groups.hasConstruction).toBe(true);
    expect(groups.objectCount).toBe(2);
    // Both sat at the origin before the fix, so painter-sort fell back to creation
    // order and the later solid punched through the earlier one.
    expect(groups.positions[0]).not.toEqual([0, 0, 0]);
    expect(groups.positions[0]).not.toEqual(groups.positions[1]);

    // Both are actually rasterised, not one hiding the other.
    await page.evaluate(() => (window as any).__look([4, 6, 14], [3, 1.2, 2]));
    const px = await page.evaluate(() => (window as any).__renderAndCount());
    expect(px.solid).toBeGreaterThan(3000);
  });

  test('the selected solid is outlined, and the outline reads through', async ({ page }) => {
    await mount(page, scene([PRISM], 1));
    const mats = await page.evaluate(() => (window as any).__firstObjectMaterials());
    const outline = mats.find((m: any) => m.type === 'LineSegments');

    expect(outline).toBeTruthy();
    expect(outline.colour).toBe(0xfbbf24);
    expect(outline.depthTest).toBe(false);
    expect(outline.renderOrder).toBeGreaterThan(0);

    // And it is genuinely drawn: amber pixels appear that are not the violet solid.
    await page.evaluate(() => (window as any).__look([0, 5, 11], [0, 1.2, 0]));
    const px = await page.evaluate(() => (window as any).__renderAndCount());
    expect(px.outline).toBeGreaterThan(200);
  });

  test('the placement ghost appears only when the target needs explaining', async ({ page }) => {
    await mount(page, scene([PRISM], 1, { placeY: 0, placeArmed: false }));
    expect((await page.evaluate(() => (window as any).__sceneGroups())).hasGhost).toBe(false);

    await page.evaluate(() => (window as any).__destroy());
    await mount(page, scene([PRISM], 1, { placeY: 3, placeArmed: false }));
    const raised = await page.evaluate(() => (window as any).__sceneGroups());
    expect(raised.hasGhost).toBe(true);
    expect(raised.ghostChildren).toBe(3);   // ring + drop line + floor footprint
  });

  test('builds the whole 0D to 3D ladder without a page error', async ({ page }) => {
    const point = { id: 1, type: 'point', position: [0, 0, 0] };
    const seg = { id: 2, type: 'segment', position: [0, 0, 0], vector: [3, 0, 0] };
    const rect = { id: 3, type: 'rect', position: [0, 0, 0], u: [3, 0, 0], v: [0, 2, 0] };
    const solid = Object.assign({}, PRISM, { id: 4 });   // distinct id; the slice needs the PRISM selected
    await mount(page, scene([point, seg, rect, solid], 4, { sliceOn: true, sliceT: 0.5 }));

    const groups = await page.evaluate(() => (window as any).__sceneGroups());
    expect(groups.objectCount).toBe(4);
    expect(groups.labelCount).toBe(1);      // the selected object's measurement label
    expect(groups.hasSlice).toBe(true);     // cross-section overlay for the prism

    await page.evaluate(() => (window as any).__look([0, 5, 12], [0, 1.2, 0]));
    const px = await page.evaluate(() => (window as any).__renderAndCount());
    // The prism is SELECTED here, so its body renders amber and lands in the
    // outline bucket rather than the violet one — sum them for "was anything drawn".
    expect(px.solid + px.outline).toBeGreaterThan(1000);

    const errors: string[] = await page.evaluate(() => (window as any).__events.errors);
    expect(errors.filter((m) => !/ResizeObserver loop/.test(m))).toEqual([]);
  });
});
