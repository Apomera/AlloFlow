import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

/**
 * Geometry World — REAL WebGL smoke.
 *
 * Everything else covering this tool runs in jsdom, which has no WebGL, so the
 * whole voxel engine — initEngine, the block meshes, the crosshair raycast, the
 * camera — has only ever been verified by hand. Headless Chromium rasterises
 * WebGL 2.0 through SwiftShader, so this drives the actual engine.
 *
 * It serves the WORKING TREE on an ephemeral port, so it tests the code as it is
 * right now. React and three.js are served from the tree too (React UMD out of
 * desktop/web-app/node_modules, three r128 out of vendor/), so the spec needs no
 * network at all.
 *
 * These pin the four things that were broken and could only be confirmed in a
 * browser:
 *   1. Starting a lesson left the viewport blank — an inline callback ref made
 *      React destroy and rebuild the engine on every re-render, and the dead
 *      canvas was never detached, so the fresh one stacked below the fold.
 *   2. The lesson that loaded was the DEFAULT one, not the lesson picked.
 *   3. Q / R (block shape and rotation) did nothing: the logging wrappers had
 *      redeclared a shorter signature over placeBlock and dropped both.
 *   4. A keyboard-only student could not build at all.
 *
 * Pattern (and the two traps — destroy every scene in afterEach, and raise the
 * timeout because SwiftShader readback is slow) follows
 * tests/e2e/17-memory-palace-gl.spec.ts.
 */

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>geometry world harness</title>
<style>html,body{margin:0;height:100%;background:#0f172a}
#wrap{width:900px;height:600px;position:relative;display:flex}</style></head>
<body><div id="wrap"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/vendor/three-r128/three.min.js"></script>
<script>
  window.__events = { toasts: [], errors: [] };
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });

  // Minimal StemLab registry — the tool IIFE returns early without it.
  window.StemLab = {
    _registry: {},
    registerTool: function (id, cfg) { cfg.id = id; this._registry[id] = cfg; },
    isRegistered: function (id) { return !!this._registry[id]; },
    loadScriptResilient: function () { return new Promise(function () {}); },
    ensureThree: function () { return Promise.resolve(window.THREE); },
    getRegisteredTools: function () { return Object.values(this._registry); }
  };
</script>
<script src="/stem_lab/stem_tool_geometryworld.js"></script>
<script>
  var e = React.createElement;

  // Stateful ctx mirroring the host bridge: update/updateMulti write into
  // toolData and re-render, which is exactly the loop the ref bug rode on.
  window.__mount = function (bucket) {
    var cfg = window.StemLab._registry.geometryWorld;
    if (!cfg) return false;
    var toolData = { _threeLoaded: true, geometryWorld: Object.assign({}, bucket || {}) };
    window.__toolData = toolData;
    var bump = null;
    var ctx = {
      React: React,
      toolData: toolData,
      update: function (b, k, v) {
        toolData[b] = Object.assign({}, toolData[b]); toolData[b][k] = v; if (bump) bump();
      },
      updateMulti: function (b, patch) {
        toolData[b] = Object.assign({}, toolData[b], patch); if (bump) bump();
      },
      setToolData: function () {}, setStemLabTool: function () {}, setStemLabTab: function () {},
      addToast: function (m, k) { window.__events.toasts.push({ message: String(m), kind: k }); },
      awardXP: function () {}, getXP: function () { return 0; },
      announceToSR: function () {}, celebrate: function () {}, beep: function () {},
      callGemini: null, callTTS: null, callImagen: null,
      gradeLevel: '5th Grade', toolSnapshots: [], props: {},
      t: function (k, fb) { return fb || k; },
      icons: new Proxy({}, { get: function () { return function () { return e('span'); }; } }),
      a11yClick: function (fn) { return { onClick: fn, role: 'button', tabIndex: 0 }; },
      srOnly: {},
      activeSessionCode: null, studentNickname: 'Tester', isTeacherMode: false
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

  // ── Probes ──
  window.__eng = function () { return window.__geoWorldEngine || null; };

  window.__glLive = function () {
    var cs = document.querySelectorAll('#geoworld-fs-wrap canvas');
    if (!cs.length) return null;
    var c = cs[cs.length - 1];
    var gl = c.getContext('webgl2') || c.getContext('webgl');
    return { canvasCount: cs.length, lost: gl ? gl.isContextLost() : null, w: c.clientWidth, h: c.clientHeight };
  };

  window.__worldState = function () {
    var en = window.__geoWorldEngine;
    if (!en) return null;
    var shapes = {};
    var studentBlocks = 0;
    Object.keys(en.blocks).forEach(function (k) {
      var u = en.blocks[k].userData || {};
      if (!u._lessonBlock) {
        studentBlocks++;
        var s = u.shape || 'cube';
        shapes[s] = (shapes[s] || 0) + 1;
      }
    });
    return {
      lessonTitle: en._currentLesson ? en._currentLesson.title : null,
      totalBlocks: Object.keys(en.blocks).length,
      studentBlocks: studentBlocks,
      studentShapes: shapes,
      npcCount: en.npcs.length,
      camera: { x: en.camera.position.x, y: en.camera.position.y, z: en.camera.position.z },
      yaw: en.camera.rotation.y
    };
  };

  // Aim the camera at a known block so the crosshair raycast has a target,
  // mirroring what a student does by walking up to a structure.
  window.__aimAt = function (x, y, z) {
    var en = window.__geoWorldEngine;
    if (!en) return false;
    en.camera.position.set(x + 0.5, y + 3.2, z + 3.5);
    en.camera.lookAt(x + 0.5, y + 0.5, z + 0.5);
    en.euler.setFromQuaternion(en.camera.quaternion);
    return true;
  };

  // World-space bounds of the mesh at a grid cell, so a test can assert the block
  // actually occupies the cell it was placed in.
  window.__blockBounds = function (x, y, z) {
    var en = window.__geoWorldEngine;
    var m = en && en.blocks[x + ',' + y + ',' + z];
    if (!m) return null;
    var box = new THREE.Box3().setFromObject(m);
    var r = function (v) { return Math.round(v * 1000) / 1000; };
    return { min: [r(box.min.x), r(box.min.y), r(box.min.z)], max: [r(box.max.x), r(box.max.y), r(box.max.z)],
             shape: m.userData.shape, rotation: m.userData.rotation };
  };

  window.__placeShaped = function (x, y, z, shape, rotation) {
    var en = window.__geoWorldEngine;
    if (!en) return false;
    en.placeBlock(x, y, z, 'stone', shape, rotation);
    return !!en.blocks[x + ',' + y + ',' + z];
  };

  // Enclosed volume of a placed block's mesh, by the divergence theorem
  // (sum of signed tetrahedron volumes over its triangles). This is what a slicer
  // would print, so it is the honest check that the model matches the lesson.
  window.__meshVolume = function (x, y, z) {
    var en = window.__geoWorldEngine;
    var m = en && en.blocks[x + ',' + y + ',' + z];
    if (!m) return null;
    m.updateMatrixWorld(true);
    var g = m.geometry, pos = g.attributes.position;
    var idx = g.index ? g.index.array : null;
    var count = idx ? idx.length : pos.count;
    var v = new THREE.Vector3();
    var get = function (i) { v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(m.matrixWorld); return v.clone(); };
    var vol = 0;
    for (var i = 0; i + 2 < count; i += 3) {
      var a = get(idx ? idx[i] : i), b = get(idx ? idx[i + 1] : i + 1), c = get(idx ? idx[i + 2] : i + 2);
      vol += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6;
    }
    return { volume: Math.abs(Math.round(vol * 10000) / 10000), shape: m.userData.shape, claimed: m.userData.volume };
  };

  window.__liveRegion = function () {
    var el = document.getElementById('allo-live-geometryworld');
    return el ? el.textContent : null;
  };

  window.__placeNpc = function (idx, x, y, z) {
    var en = window.__geoWorldEngine;
    if (!en || !en.npcs[idx]) return null;
    en.npcs[idx].body.position.set(x, y, z);
    return en.npcs[idx].data.name;
  };

  window.__camPos = function () {
    var en = window.__geoWorldEngine;
    return en ? { x: en.camera.position.x, y: en.camera.position.y, z: en.camera.position.z } : null;
  };

  window.__setCam = function (x, y, z) {
    var en = window.__geoWorldEngine;
    if (!en) return false;
    en.camera.position.set(x, y, z);
    en.velocity.set(0, 0, 0);
    return true;
  };

  window.__destroy = function () {
    try { if (window.__root) window.__root.unmount(); } catch (err) {}
    // Hand the GL context back explicitly — Chromium caps live contexts per PROCESS
    // and kills the oldest silently, so without this the earliest suite in a
    // multi-spec run starts failing for reasons unrelated to itself.
    try {
      var cs = document.querySelectorAll('canvas');
      for (var i = 0; i < cs.length; i++) {
        var g = null;
        try { g = cs[i].getContext('webgl2') || cs[i].getContext('webgl'); } catch (e) {}
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

/** Mount the tool and wait for initEngine (fired ~100ms after the ref attaches). */
async function mount(page: Pg, bucket: Record<string, unknown> = {}) {
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.geometryWorld);
  await page.evaluate((b) => (window as any).__mount(b), bucket);
  await page.waitForSelector('#geoworld-fs-wrap canvas', { timeout: 30000 });
  await page.waitForFunction(() => !!(window as any).__geoWorldEngine, null, { timeout: 30000 });
  await page.waitForTimeout(700);   // let the engine settle a few frames
}

/** Keyboard shortcuts go to <body> unless the world surface is focused first. */
async function focusWorld(page: Pg) {
  await page.evaluate(() => (document.getElementById('geoworld-fs-wrap') as HTMLElement).focus());
}

// SwiftShader is a software rasteriser and canvas.screenshot() triggers a slow
// pixel readback ("GPU stall due to ReadPixels"); a mount plus screenshots does
// not fit in the default 30s budget.
test.describe.configure({ timeout: 150_000 });

test.describe('Geometry World — real WebGL', () => {
  // Chromium caps live WebGL contexts per process and silently kills the oldest
  // past the limit; the symptom is not an error but the whole suite crawling.
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  test('mounts one live GL canvas and builds the default world', async ({ page }) => {
    await mount(page, { _introShownOnce: true });

    const gl = await page.evaluate(() => (window as any).__glLive());
    expect(gl).not.toBeNull();
    expect(gl.lost).toBe(false);
    expect(gl.w).toBeGreaterThan(800);
    expect(gl.h).toBeGreaterThan(400);

    const world = await page.evaluate(() => (window as any).__worldState());
    expect(world.totalBlocks).toBeGreaterThan(0);
    expect(world.npcCount).toBeGreaterThan(0);
    // 'ResizeObserver loop completed...' is a Chromium artifact that can surface
    // even for a well-behaved observer, so it is filtered here; the loop that used
    // to fire it 28x per mount is asserted separately below.
    const errs = (await page.evaluate(() => (window as any).__events.errors))
      .filter((m: string) => !/ResizeObserver loop/.test(m));
    expect(errs).toEqual([]);

    // renderer.setSize writes explicit pixels onto the canvas, which perturbs
    // layout and re-triggers the observer. Unguarded, it fed itself: 28 of these
    // on a single mount, reallocating renderer buffers each time and leaving the
    // layout never quite still (which also made Playwright's stability check for
    // a click on the intro time out).
    const roNoise = (await page.evaluate(() => (window as any).__events.errors))
      .filter((m: string) => /ResizeObserver loop/.test(m));
    expect(roNoise.length).toBeLessThan(3);
  });

  test('starting a lesson leaves ONE canvas and the picked lesson loaded', async ({ page }) => {
    // The reported bug. Start Lesson calls upd(), which re-rendered; the inline ref
    // tore the engine down and rebuilt it with the default world, and the disposed
    // canvas stayed in the container with the live one stacked below the fold.
    await mount(page, { _introShownOnce: true, showLessonIntro: true, activeLesson: 'geometryGarden' });

    const engineBefore = await page.evaluate(() => (window as any).__eng() && (window as any).__eng().sessionStart);

    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button'))
        .find((el) => /Start Lesson/i.test(el.textContent || ''));
      (b as HTMLButtonElement).click();
    });
    await page.waitForTimeout(1200);

    const gl = await page.evaluate(() => (window as any).__glLive());
    expect(gl.canvasCount).toBe(1);            // no stacked dead canvas
    expect(gl.lost).toBe(false);

    const world = await page.evaluate(() => (window as any).__worldState());
    expect(world.lessonTitle).toMatch(/Garden/i);   // the lesson PICKED, not the default
    expect(world.totalBlocks).toBeGreaterThan(0);

    // Same engine instance throughout — it was never torn down.
    const engineAfter = await page.evaluate(() => (window as any).__eng().sessionStart);
    expect(engineAfter).toBe(engineBefore);
  });

  test('survives repeated state updates without losing the world', async ({ page }) => {
    await mount(page, { _introShownOnce: true });
    const before = await page.evaluate(() => (window as any).__worldState());

    // Every upd() used to destroy and rebuild the engine.
    await page.evaluate(() => {
      for (let i = 0; i < 5; i += 1) (window as any).__toolData.geometryWorld.selectedBlock = i % 3;
    });
    await focusWorld(page);
    for (const key of ['Digit2', 'Digit3', 'KeyG', 'KeyG']) {
      await page.keyboard.press(key);
      await page.waitForTimeout(120);
    }

    const after = await page.evaluate(() => (window as any).__worldState());
    expect(after).not.toBeNull();
    expect(after.totalBlocks).toBe(before.totalBlocks);
    expect((await page.evaluate(() => (window as any).__glLive())).canvasCount).toBe(1);
  });

  test('B builds and X breaks with no mouse at all', async ({ page }) => {
    await mount(page, { _introShownOnce: true });
    await focusWorld(page);
    await page.evaluate(() => (window as any).__aimAt(2, 0, 2));
    await page.waitForTimeout(200);

    const before = await page.evaluate(() => (window as any).__worldState());

    await page.keyboard.press('KeyB');
    await page.waitForTimeout(300);
    const built = await page.evaluate(() => (window as any).__worldState());
    expect(built.studentBlocks).toBe(before.studentBlocks + 1);

    await page.keyboard.press('KeyX');
    await page.waitForTimeout(300);
    const broken = await page.evaluate(() => (window as any).__worldState());
    expect(broken.studentBlocks).toBe(before.studentBlocks);
  });

  test('Q actually changes the shape of the block that gets placed', async ({ page }) => {
    // The headline dead feature: the logging wrapper redeclared
    // placeBlock(x,y,z,type) over placeBlock(x,y,z,type,shape,rotation), so every
    // block placed as a cube no matter what Q was set to.
    await mount(page, { _introShownOnce: true });
    await focusWorld(page);
    await page.evaluate(() => (window as any).__aimAt(6, 0, 6));
    await page.waitForTimeout(200);

    await page.keyboard.press('KeyQ');          // cube -> next shape
    await page.waitForTimeout(200);
    await page.keyboard.press('KeyB');
    await page.waitForTimeout(300);

    const world = await page.evaluate(() => (window as any).__worldState());
    const shapes = Object.keys(world.studentShapes);
    expect(shapes.length).toBeGreaterThan(0);
    // At least one student block is NOT a plain cube.
    expect(shapes.some((s) => s !== 'cube')).toBe(true);
  });

  test('arrow keys turn the camera and the scene re-renders', async ({ page }) => {
    await mount(page, { _introShownOnce: true });
    await focusWorld(page);

    const canvas = page.locator('#geoworld-fs-wrap canvas').last();
    const before = await canvas.screenshot({ timeout: 60000 });
    const yawBefore = await page.evaluate(() => (window as any).__worldState().yaw);

    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(700);
    await page.keyboard.up('ArrowLeft');
    await page.waitForTimeout(400);

    const yawAfter = await page.evaluate(() => (window as any).__worldState().yaw);
    expect(yawAfter).not.toBe(yawBefore);

    // Two different camera angles must rasterise to different pixels — proves the
    // scene actually renders, not just that a number changed.
    const after = await canvas.screenshot({ timeout: 60000 });
    expect(Buffer.compare(before, after)).not.toBe(0);
  });

  test('W walks the player forward', async ({ page }) => {
    await mount(page, { _introShownOnce: true });
    await focusWorld(page);

    const before = await page.evaluate(() => (window as any).__worldState().camera);
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(700);
    await page.keyboard.up('KeyW');
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => (window as any).__worldState().camera);

    const moved = Math.hypot(after.x - before.x, after.z - before.z);
    expect(moved).toBeGreaterThan(0.3);
  });

  test('L says "right" for a character that is actually to the player\'s right', async ({ page }) => {
    // The pure helper's left/right convention is unit-tested, but that proves
    // nothing about the bearing the ENGINE computes. This ties the spoken word to
    // the physical meaning of right — the direction D actually strafes you — so it
    // cannot be circular. Telling a blind student "left" for something on their
    // right is worse than saying nothing.
    await mount(page, { _introShownOnce: true });
    await focusWorld(page);

    const start = await page.evaluate(() => (window as any).__camPos());

    // Measure which way "right" physically is, by strafing.
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyD');
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => (window as any).__camPos());

    const dx = after.x - start.x, dz = after.z - start.z;
    const len = Math.hypot(dx, dz);
    expect(len).toBeGreaterThan(0.2);            // it really did strafe

    // Put a character 6 units along that same physical direction, from where the
    // player started, and put the player back there.
    const npcName = await page.evaluate(([sx, sy, sz, ux, uz]) => {
      (window as any).__setCam(sx, sy, sz);
      return (window as any).__placeNpc(0, sx + ux * 6, sy - 1, sz + uz * 6);
    }, [start.x, start.y, start.z, dx / len, dz / len] as number[]);
    expect(npcName).toBeTruthy();

    await page.waitForTimeout(150);
    await page.keyboard.press('KeyL');
    await page.waitForTimeout(300);              // announceToSR swaps text on a 30ms tick

    const spoken = await page.evaluate(() => (window as any).__liveRegion());
    expect(spoken).toBeTruthy();
    expect(spoken).toContain(npcName);
    // The nearest character is the one we just placed, so the first bearing spoken
    // is its own.
    const firstClause = spoken.slice(spoken.indexOf(npcName));
    expect(firstClause).toMatch(/right/);
    expect(firstClause.slice(0, firstClause.indexOf('.'))).not.toMatch(/left/);
  });

  test('every block shape occupies the cell it was placed in', async ({ page }) => {
    // cube and halfB use BoxGeometry (origin-centred); halfA and quarter use custom
    // vertices authored 0..1. They share one placement position, so the un-centred
    // pair sat in [x+0.5, x+1.5] — half a block off-grid diagonally, with Y-rotation
    // pivoting about a corner. Invisible until the shape system was revived, because
    // nothing could place a non-cube block.
    await mount(page, { _introShownOnce: true });

    const cells = [
      { shape: 'cube', at: [14, 5, 14] },
      { shape: 'halfB', at: [16, 5, 14] },
      { shape: 'halfA', at: [18, 5, 14] },
      { shape: 'quarter', at: [20, 5, 14] },
    ];

    for (const c of cells) {
      const ok = await page.evaluate(([x, y, z, s]) => (window as any).__placeShaped(x, y, z, s, 0),
        [...c.at, c.shape] as [number, number, number, string]);
      expect(ok, c.shape + ' failed to place').toBe(true);

      const b = await page.evaluate(([x, y, z]) => (window as any).__blockBounds(x, y, z),
        c.at as [number, number, number]);
      const [x, y, z] = c.at;

      // Horizontal footprint must sit inside the cell, whatever the shape.
      expect(b.min[0], c.shape + ' minX').toBeGreaterThanOrEqual(x - 0.001);
      expect(b.max[0], c.shape + ' maxX').toBeLessThanOrEqual(x + 1.001);
      expect(b.min[2], c.shape + ' minZ').toBeGreaterThanOrEqual(z - 0.001);
      expect(b.max[2], c.shape + ' maxZ').toBeLessThanOrEqual(z + 1.001);
      // And it rests on the cell floor rather than floating or sinking.
      expect(b.min[1], c.shape + ' minY').toBeGreaterThanOrEqual(y - 0.001);
      expect(b.max[1], c.shape + ' maxY').toBeLessThanOrEqual(y + 1.001);
    }
  });

  test('rotating a wedge keeps it in its own cell', async ({ page }) => {
    // Y-rotation about an un-centred origin swings the shape out of its cell
    // entirely; about the centre it stays put.
    await mount(page, { _introShownOnce: true });

    for (const rot of [0, 1, 2, 3]) {
      const at: [number, number, number] = [10 + rot * 2, 6, 10];
      await page.evaluate(([x, y, z, r]) => (window as any).__placeShaped(x, y, z, 'halfA', r),
        [...at, rot] as [number, number, number, number]);
      const b = await page.evaluate(([x, y, z]) => (window as any).__blockBounds(x, y, z), at);
      const [x, , z] = at;
      expect(b.min[0], 'rot ' + rot + ' minX').toBeGreaterThanOrEqual(x - 0.001);
      expect(b.max[0], 'rot ' + rot + ' maxX').toBeLessThanOrEqual(x + 1.001);
      expect(b.min[2], 'rot ' + rot + ' minZ').toBeGreaterThanOrEqual(z - 0.001);
      expect(b.max[2], 'rot ' + rot + ' maxZ').toBeLessThanOrEqual(z + 1.001);
    }
  });

  test('a printed block encloses the volume the lesson teaches', async ({ page }) => {
    // The STL exporter now derives its triangles from these very meshes, so if the
    // mesh encloses the right volume the print does too. Before, every block exported
    // as a unit cube: a student could measure 12 cubic units on screen and hold 24 in
    // their hand — in a tool that exists to teach volume.
    await mount(page, { _introShownOnce: true });

    const expected = [
      { shape: 'cube', volume: 1 },
      { shape: 'halfB', volume: 0.5 },
      { shape: 'halfA', volume: 0.5 },
      { shape: 'quarter', volume: 0.25 },
    ];

    for (let i = 0; i < expected.length; i += 1) {
      const at: [number, number, number] = [24 + i * 2, 7, 24];
      const placed = await page.evaluate(([x, y, z, s]) => (window as any).__placeShaped(x, y, z, s, 0),
        [...at, expected[i].shape] as [number, number, number, string]);
      expect(placed, expected[i].shape).toBe(true);

      const r = await page.evaluate(([x, y, z]) => (window as any).__meshVolume(x, y, z), at);
      // The geometry must enclose what BLOCK_SHAPES claims, or the manipulative
      // contradicts the arithmetic the student just did.
      expect(r.claimed, expected[i].shape + ' metadata').toBeCloseTo(expected[i].volume, 6);
      expect(r.volume, expected[i].shape + ' actual enclosed volume').toBeCloseTo(expected[i].volume, 3);
    }
  });

  test('tears the engine down cleanly on unmount', async ({ page }) => {
    await mount(page, { _introShownOnce: true });
    expect(await page.evaluate(() => !!(window as any).__eng())).toBe(true);

    await page.evaluate(() => (window as any).__destroy());
    await page.waitForTimeout(400);

    // destroyEngine deletes the global AND detaches the canvas — the dead canvas
    // left behind was half of the blank-viewport bug.
    expect(await page.evaluate(() => !!(window as any).__eng())).toBe(false);
    expect(await page.evaluate(() => document.querySelectorAll('#geoworld-fs-wrap canvas').length)).toBe(0);
  });
});
