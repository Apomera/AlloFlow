import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

/**
 * Architecture Studio — REAL WebGL smoke.
 *
 * The tool stores every block as (x, y, z) with a shape, material and
 * rotation — a genuinely 3D model — and then showed it only as a stack of
 * flat floor plans, one grid per storey. A student placed blocks in space
 * and never saw the building.
 *
 * Serves the WORKING TREE with React UMD and three r128 from vendor/.
 */

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>archstudio harness</title>
<style>html,body{margin:0;height:100%;background:#0f172a}
#wrap{width:100vw;height:620px;overflow:hidden}</style></head>
<body><div id="wrap"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/vendor/three-r128/three.min.js"></script>
<script src="/stem_lab/stem_lab_module.js"></script>
<script>
  window.__events = { errors: [], sr: [] };
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });
  window.__failThree = false;
  window.StemLab.ensureThree = function () {
    return window.__failThree ? Promise.reject(new Error('test WebGL failure')) : Promise.resolve(window.THREE);
  };
  window.StemLab.loadScriptResilient = function () { return new Promise(function () {}); };
</script>
<script src="/stem_lab/stem_tool_archstudio.js"></script>
<script>
  var e = React.createElement;
  window.__mount = function (bucket) {
    var cfg = window.StemLab._registry.archStudio || window.StemLab._registry.archstudio;
    window.__toolData = { archStudio: Object.assign({}, bucket || {}) };
    var bump = null;
    var ctx = {
      React: React,
      get toolData() { return window.__toolData; },
      update: function (b, k, v) {
        window.__toolData = Object.assign({}, window.__toolData);
        window.__toolData[b] = Object.assign({}, window.__toolData[b]);
        window.__toolData[b][k] = v;
        if (bump) bump();
      },
      updateMulti: function (b, patch) {
        window.__toolData = Object.assign({}, window.__toolData);
        window.__toolData[b] = Object.assign({}, window.__toolData[b], patch);
        if (bump) bump();
      },
      setToolData: function (updater) {
        window.__toolData = typeof updater === 'function' ? updater(window.__toolData) : updater;
        if (bump) bump();
      }, setStemLabTool: function () {}, setStemLabTab: function () {},
      addToast: function () {}, awardXP: function () {}, getXP: function () { return 0; },
      announceToSR: function (m) { window.__events.sr.push(String(m)); },
      celebrate: function () {}, beep: function () {},
      callGemini: null, gradeLevel: '5th Grade', toolSnapshots: [], props: {},
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
    return !!cfg;
  };
  window.__destroy = function () { if (window.__root) { window.__root.unmount(); window.__root = null; } };
  window.__gl = function () { return window.__alloArchGL ? window.__alloArchGL.debug() : null; };
  window.__bucket = function () { return window.__toolData.archStudio; };
  window.__click = function (sel) { var b = document.querySelector(sel); if (!b) return false; b.click(); return true; };
  window.__clickLabel = function (re) {
    var b = Array.from(document.querySelectorAll('button'))
      .find(function (el) { return new RegExp(re, 'i').test(el.getAttribute('aria-label') || ''); });
    if (!b) return false; b.click(); return true;
  };
  window.__planCount = function () { return document.querySelectorAll('canvas[data-arch-gl]').length; };
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

/** A 3-storey 2x2 tower plus a wing, in mixed materials. */
function tower() {
  const blocks: Array<Record<string, unknown>> = [];
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 2; x++) {
      for (let z = 0; z < 2; z++) {
        blocks.push({ x, y, z, shape: 'block', material: y === 0 ? 'stone' : 'brick' });
      }
    }
  }
  blocks.push({ x: 3, y: 0, z: 0, shape: 'block', material: 'wood' });
  return blocks;
}

async function mount3d(page: Pg, bucket: Record<string, unknown> = {}) {
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
  await page.evaluate((b) => (window as any).__mount(b), Object.assign({ show3d: true }, bucket));
  await page.waitForSelector('canvas[data-arch-gl="true"]', { timeout: 30000 });
  await page.waitForFunction(() => (window as any).__gl()?.state === 'ready', null, { timeout: 30000 });
  await page.waitForTimeout(400);
}

test.describe.configure({ timeout: 150_000 });

test.describe('Architecture Studio — real WebGL', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  test('renders one solid per placed block', async ({ page }) => {
    await mount3d(page, { blocks: tower() });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
    expect(gl.blockCount).toBe(13);      // 12 tower + 1 wing
    expect(gl.outlineCount).toBe(13);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('the model spans the full extent of the build, including height', async ({ page }) => {
    // The floor plans show one storey at a time, so height was the dimension
    // a student could never see. It has to survive into the scene.
    await mount3d(page, { blocks: tower() });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.extent.h).toBe(3);        // three storeys
    expect(gl.extent.w).toBe(4);        // x spans 0..3 with the wing
    expect(gl.extent.d).toBe(2);
  });

  test('survives materials whose palette colour is a CSS variable', async ({ page }) => {
    // stone, marble and metal are defined as "var(--allo-stem-text, #f1f5f9)"
    // for theming. THREE.Color cannot parse that and throws, which would take
    // the frame loop down, so the 3D layer keeps its own hex table.
    await mount3d(page, {
      blocks: [
        { x: 0, y: 0, z: 0, material: 'stone' },
        { x: 1, y: 0, z: 0, material: 'marble' },
        { x: 2, y: 0, z: 0, material: 'metal' },
        { x: 3, y: 0, z: 0, material: 'glass' }
      ]
    });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.blockCount).toBe(4);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('an empty build does not crash the view', async ({ page }) => {
    await mount3d(page, { blocks: [] });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.blockCount).toBe(0);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('clicking the 3D ground places the selected object', async ({ page }) => {
    await mount3d(page, { blocks: [] });
    const canvas = page.locator('canvas[data-arch-gl="true"]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks?.length)).toBe(1);
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.blockCount)).toBe(1);
    expect(await page.evaluate(() => (window as any).__bucket().blocks[0])).toMatchObject({
      y: 0, shape: 'block', material: 'stone'
    });
  });

  test('shows a placement grid and a live shape preview before committing', async ({ page }) => {
    await mount3d(page, { blocks: [], activeShape: 'column', activeMaterial: 'wood' });
    expect(await page.evaluate(() => (window as any).__gl())).toMatchObject({ previewVisible: false });
    expect((await page.evaluate(() => (window as any).__gl())).gridLineCount).toBeGreaterThanOrEqual(20);

    const canvas = page.locator('canvas[data-arch-gl="true"]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.previewVisible)).toBe(true);

    await page.mouse.move(1, 1);
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.previewVisible)).toBe(false);
    expect(await page.evaluate(() => (window as any).__bucket().blocks?.length || 0)).toBe(0);
  });

  test('camera buttons and arrow keys orbit, tilt, zoom, and reset the view', async ({ page }) => {
    await mount3d(page, { blocks: tower() });
    await page.getByRole('button', { name: 'Rotate view left' }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().rot3d?.rotY)).toBe(-53);

    const canvas = page.locator('canvas[data-arch-gl="true"]');
    await canvas.focus();
    await canvas.press('ArrowUp');
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().rot3d?.rotX)).toBe(-34);
    await canvas.press('+');
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().rot3d?.scale)).toBe(1.15);

    await page.getByRole('button', { name: 'Reset three-dimensional view' }).click();
    expect(await page.evaluate(() => (window as any).__bucket().rot3d)).toMatchObject({ rotX: -24, rotY: -38, scale: 1 });
  });

  test('the floor grid can place, paint, and erase a selected object', async ({ page }) => {
    await page.goto(`${base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(() => (window as any).__mount({ editorView: 'grid', blocks: [] }));
    const cell = page.locator('button[data-arch-cell="0,0,0"]');
    await expect(cell).toBeVisible();

    await cell.click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks?.length)).toBe(1);
    expect(await page.evaluate(() => (window as any).__bucket().blocks[0])).toMatchObject({
      x: 0, y: 0, z: 0, shape: 'block', material: 'stone'
    });

    const glass = page.locator('button').filter({ hasText: /Glass/ }).first();
    await glass.scrollIntoViewIfNeeded();
    await glass.click();
    await page.getByRole('button', { name: /Paint/ }).first().click();
    await cell.click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks[0]?.material)).toBe('glass');

    await page.getByRole('button', { name: /Erase/ }).first().click();
    await cell.click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks?.length)).toBe(0);
  });

  test('Pick copies every block property without editing, then Page Up builds on the next floor', async ({ page }) => {
    await page.goto(`${base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(() => (window as any).__mount({
      editorView: 'grid', undoStack: [], blocks: [
        { x: 0, y: 0, z: 0, shape: 'ramp', material: 'wood', color: '#123456', rotation: 270 },
      ],
    }));

    const region = page.locator('#arch-studio-region');
    await region.focus();
    await region.press('i');
    await expect(page.getByRole('button', { name: 'Pick mode' })).toHaveAttribute('aria-pressed', 'true');
    await page.locator('button[data-arch-cell="0,0,0"]').click();

    await expect.poll(() => page.evaluate(() => (window as any).__bucket().mode)).toBe('place');
    expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({
      activeShape: 'ramp', activeMaterial: 'wood', activeColor: '#123456', activeRotation: 270,
    });
    expect(await page.evaluate(() => (window as any).__bucket().blocks)).toHaveLength(1);
    expect(await page.evaluate(() => (window as any).__bucket().undoStack)).toEqual([]);

    await region.focus();
    await region.press('PageUp');
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().editLayer)).toBe(1);
    await page.locator('button[data-arch-cell="1,1,0"]').click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks?.length)).toBe(2);
    expect(await page.evaluate(() => (window as any).__bucket().blocks[1])).toMatchObject({
      x: 1, y: 1, z: 0, shape: 'ramp', material: 'wood', color: '#123456', rotation: 270,
    });
  });

  test('the selected-block inspector highlights, moves, duplicates, replaces, and deletes in 3D', async ({ page }) => {
    await mount3d(page, {
      blocks: [{ x: 0, y: 0, z: 0, shape: 'ramp', material: 'wood', color: '#123456', rotation: 270 }],
      selectedBlockKey: '0,0,0', undoStack: [],
    });

    await expect(page.locator('[data-arch-inspector="true"]')).toBeVisible();
    await expect(page.locator('[data-arch-selection-chip="true"]')).toContainText('Selected X 0');
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.selectedCount)).toBe(1);
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.selectionOutlineVisible)).toBe(true);
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.renderHexes?.[0])).toBe(0x123456);

    await page.getByRole('button', { name: 'Move selected block right along X' }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().selectedBlockKey)).toBe('1,0,0');
    expect(await page.evaluate(() => (window as any).__bucket().blocks[0])).toMatchObject({ x: 1, y: 0, z: 0 });

    await page.getByRole('button', { name: 'Duplicate selected block above' }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(2);
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().selectedBlockKey)).toBe('1,1,0');

    await page.getByRole('button', { name: 'Door shape' }).click();
    await page.getByRole('button', { name: 'Use Glass material' }).click();
    await page.getByRole('button', { name: 'Use 90\u00B0 rotation' }).click();
    await page.getByRole('button', { name: 'Apply current properties to selected block' }).click();
    expect(await page.evaluate(() => (window as any).__bucket().blocks.find((b: any) => `${b.x},${b.y},${b.z}` === (window as any).__bucket().selectedBlockKey))).toMatchObject({
      shape: 'door', material: 'glass', color: '#38bdf8', rotation: 90,
    });
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.renderHexes?.find((hex: number) => hex === 0x38bdf8))).toBe(0x38bdf8);

    const deleteSelected = page.getByRole('button', { name: 'Delete selected block' });
    await deleteSelected.focus();
    await deleteSelected.click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(1);
    await expect(page.locator('[data-arch-inspector="true"]')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.selectedCount)).toBe(0);
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.selectionOutlineVisible)).toBe(false);
    await expect(page.locator('#arch-studio-region')).toBeFocused();
  });

  test('keeps replay read-only in the floor grid and settles elevated imports to ground', async ({ page }) => {
    await page.goto(`${base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    const elevated = [
      { x: 0, y: 5, z: 0, shape: 'block', material: 'stone' },
      { x: 0, y: 7, z: 0, shape: 'roof', material: 'wood' },
    ];
    await page.evaluate((blocks) => (window as any).__mount({
      editorView: 'grid', blocks, showReplay: true, replayStep: 0,
      undoStack: [[{ x: -1, y: 0, z: 0, shape: 'column', material: 'stone', color: '#94a3b8' }]],
    }), elevated);

    await expect(page.getByRole('grid', { name: /Architecture build grid/ })).toHaveAttribute('aria-readonly', 'true');
    await expect(page.locator('button[data-arch-cell="-1,0,0"]')).toHaveAccessibleName(/stone column.*read-only construction replay/i);
    await page.locator('button[data-arch-cell="1,0,0"]').click();
    expect(await page.evaluate(() => (window as any).__bucket().blocks)).toHaveLength(2);
    expect(await page.evaluate(() => (window as any).__events.sr)).toContain('Exit construction replay before editing.');
    await expect(page.getByTitle('Exit construction replay to clear the build')).toBeDisabled();
    await expect(page.getByTitle('Exit construction replay to apply gravity')).toBeDisabled();
    await expect(page.getByTitle('Exit construction replay to mirror the build').first()).toBeDisabled();

    await page.getByRole('button', { name: /Replay/ }).first().click();
    await page.getByTitle('Apply gravity (drop floating blocks)').click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks.map((b: any) => b.y))).toEqual([0, 1]);
  });

  test('renders the selected shape and preserves its material and rotation', async ({ page }) => {
    await mount3d(page, {
      blocks: [], activeShape: 'ramp', activeMaterial: 'brick',
      activeColor: '#b45309', activeRotation: 90,
    });
    const canvas = page.locator('canvas[data-arch-gl="true"]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks?.length)).toBe(1);
    expect(await page.evaluate(() => (window as any).__bucket().blocks[0])).toMatchObject({
      shape: 'ramp', material: 'brick', color: '#b45309', rotation: 90,
    });
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.customShapeCount)).toBe(1);
    expect(await page.evaluate(() => (window as any).__gl()?.shapeCounts)).toMatchObject({ ramp: 1 });
  });

  test('renders every advertised shape across all materials without a WebGL error', async ({ page }) => {
    const shapes = ['block', 'slab', 'ramp', 'column', 'arch', 'roof', 'pyramid', 'dome', 'cylinder', 'lbeam', 'window', 'door'];
    const materials = ['stone', 'brick', 'wood', 'glass', 'marble', 'metal'];
    const colors = ['#94a3b8', '#b45309', '#92400e', '#38bdf8', '#f1f5f9', '#cbd5e1'];
    const blocks = shapes.map((shape, i) => ({
      x: i % 4, y: 0, z: Math.floor(i / 4), shape,
      material: materials[i % materials.length], color: colors[i % colors.length],
      rotation: (i % 4) * 90,
    }));
    await mount3d(page, { blocks });

    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.blockCount).toBe(shapes.length);
    expect(gl.customShapeCount).toBe(shapes.length - 1);
    for (const shape of shapes) expect(gl.shapeCounts[shape]).toBe(1);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('layer, negative-Z slice, material filter, and replay change the rendered model', async ({ page }) => {
    const blocks = [
      { x: 0, y: 0, z: -1, shape: 'block', material: 'stone' },
      { x: 0, y: 1, z: -1, shape: 'column', material: 'wood' },
      { x: 1, y: 0, z: 1, shape: 'ramp', material: 'stone' },
      { x: 1, y: 1, z: 1, shape: 'roof', material: 'wood' },
    ];

    await mount3d(page, { blocks, viewLayer: 1 });
    expect((await page.evaluate(() => (window as any).__gl())).blockCount).toBe(2);

    await mount3d(page, { blocks, showSlice: true, sliceZ: -1, sliceZSelected: true });
    expect((await page.evaluate(() => (window as any).__gl())).blockCount).toBe(2);

    await mount3d(page, { blocks, filterMaterial: 'wood' });
    expect((await page.evaluate(() => (window as any).__gl())).blockCount).toBe(2);

    await mount3d(page, { blocks, showReplay: true, replayStep: 0, undoStack: [[blocks[0]]] });
    expect((await page.evaluate(() => (window as any).__gl())).blockCount).toBe(1);
  });

  test('heatmap, Brick Builder, and Blueprint visibly reach the renderer', async ({ page }) => {
    const stack = [
      { x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8' },
      { x: 0, y: 1, z: 0, shape: 'block', material: 'stone', color: '#94a3b8' },
      { x: 0, y: 2, z: 0, shape: 'block', material: 'stone', color: '#94a3b8' },
    ];

    await mount3d(page, { blocks: stack, showHeatmap: true });
    const heat = await page.evaluate(() => (window as any).__gl());
    expect(new Set(heat.renderHexes).size).toBe(3);

    await mount3d(page, { blocks: [stack[0]], styleMode: 'bricks' });
    const bricks = await page.evaluate(() => (window as any).__gl());
    expect(bricks.styleMode).toBe('bricks');
    expect(bricks.renderHexes[0]).toBe(0xef4444);

    await mount3d(page, { blocks: stack, blueprintView: true });
    expect((await page.evaluate(() => (window as any).__gl())).viewMode).toBe('blueprint');
  });

  test('downloads real PNG and STL exports from the active renderer', async ({ page }) => {
    await mount3d(page, {
      blocks: [
        { x: 0, y: 0, z: 0, shape: 'block', material: 'stone' },
        { x: 1, y: 0, z: 0, shape: 'ramp', material: 'brick', rotation: 90 },
      ],
    });

    const pngEvent = page.waitForEvent('download');
    await page.getByTitle('Screenshot').click();
    const png = await pngEvent;
    expect(png.suggestedFilename()).toMatch(/^archstudio_screenshot_.*\.png$/);
    const pngPath = await png.path();
    expect(pngPath).not.toBeNull();
    expect((await stat(pngPath!)).size).toBeGreaterThan(100);

    const stlEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: /STL/ }).click();
    const stl = await stlEvent;
    expect(stl.suggestedFilename()).toMatch(/^architecture_studio_.*\.stl$/);
    const stlPath = await stl.path();
    expect(stlPath).not.toBeNull();
    expect((await stat(stlPath!)).size).toBeGreaterThan(84);
  });

  test('paints and erases a block directly in the 3D viewport', async ({ page }) => {
    await mount3d(page, {
      blocks: [{ x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8' }],
      activeMaterial: 'glass', activeColor: '#38bdf8',
    });
    const canvas = page.locator('canvas[data-arch-gl="true"]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    await page.getByRole('button', { name: /Paint/ }).first().click();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks[0]?.material)).toBe('glass');

    await page.getByRole('button', { name: /Erase/ }).first().click();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks?.length)).toBe(0);
  });

  test('symmetry, keyboard rotation, multi-floor editing, undo, and redo work together', async ({ page }) => {
    await page.goto(`${base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(() => (window as any).__mount({ editorView: 'grid', blocks: [] }));

    const region = page.locator('#arch-studio-region');
    await region.focus();
    await region.press('r');
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().activeRotation)).toBe(90);
    await page.getByRole('button', { name: 'Next floor' }).click();
    await page.getByRole('button', { name: /Symmetry: mirror edits/ }).click();
    await page.locator('button[data-arch-cell="2,1,0"]').click();

    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks?.length)).toBe(2);
    const placed = await page.evaluate(() => (window as any).__bucket().blocks);
    expect(placed.map((b: any) => b.x).sort((a: number, b: number) => a - b)).toEqual([-2, 2]);
    expect(placed.every((b: any) => b.y === 1 && b.rotation === 90)).toBe(true);

    await page.getByRole('button', { name: /Undo/ }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks?.length)).toBe(0);
    await page.getByRole('button', { name: /Redo/ }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks?.length)).toBe(2);
  });

  test('keeps a far imported build inside the editable grid window', async ({ page }) => {
    await page.goto(`${base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(() => (window as any).__mount({
      editorView: 'grid', blocks: [{ x: 64, y: 0, z: 64, shape: 'column', material: 'stone' }],
    }));
    await expect(page.locator('button[data-arch-cell="64,0,64"]')).toBeVisible();
  });

  test('falls back to a fully editable floor grid when WebGL fails', async ({ page }) => {
    await page.goto(`${base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(() => {
      (window as any).__failThree = true;
      (window as any).__mount({ blocks: [] });
    });
    await expect(page.getByText('3D is unavailable, but the floor grid is fully editable.')).toBeVisible();
    const cell = page.locator('button[data-arch-cell="0,0,0"]');
    await cell.click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks?.length)).toBe(1);
  });

  test('moves focus from the 3D canvas into one arrow-key navigable grid cell', async ({ page }) => {
    await mount3d(page, { blocks: [] });
    const canvas = page.locator('canvas[data-arch-gl="true"]');
    await canvas.focus();
    await canvas.press('Enter');

    const grid = page.getByRole('grid', { name: /Architecture build grid/ });
    await expect(grid).toBeVisible();
    await expect(grid.locator('[role="gridcell"][tabindex="0"]')).toHaveCount(1);
    await expect(page.locator('button[data-arch-cell="0,0,0"]')).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(page.locator('button[data-arch-cell="1,0,0"]')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    const destination = page.locator('button[data-arch-cell="1,0,1"]');
    await expect(destination).toBeFocused();
    await page.keyboard.press('Enter');

    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks?.length)).toBe(1);
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks?.[0])).toMatchObject({ x: 1, y: 0, z: 1 });
  });

  test('stacks the controls and keeps the build surface usable on a narrow screen', async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 700 });
    await page.goto(`${base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(() => (window as any).__mount({ editorView: 'grid', blocks: [] }));

    expect(await page.locator('.arch-studio-main').evaluate((el) => getComputedStyle(el).flexDirection)).toBe('column');
    expect(await page.locator('.arch-studio-header').evaluate((el) => getComputedStyle(el).overflowX)).toBe('auto');
    const cell = page.locator('button[data-arch-cell="0,0,0"]');
    await cell.scrollIntoViewIfNeeded();
    await expect(cell).toBeVisible();
    await cell.click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks?.length)).toBe(1);
  });

  test('occupies the main viewport, with no spinner left behind', async ({ page }) => {
    // The viewport used to render a spinner gated on a host flag this tool
    // never set, behind which sat a canvas with no ref and no renderer. Both
    // branches were dead, so the primary panel showed nothing, ever.
    await mount3d(page, { blocks: tower() });
    expect(await page.evaluate(() => (window as any).__planCount())).toBe(1);
    expect(await page.evaluate(() => document.body.innerText)).not.toContain('Loading 3D engine');
    // It really is the main viewport, not a thumbnail: the sidebar column this
    // first landed in was 185px, which a building is not readable in.
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.canvas.w).toBeGreaterThan(400);
  });

  test('drag orbits the camera, which the overlay has always claimed', async ({ page }) => {
    await mount3d(page, { blocks: tower() });
    const before = await page.evaluate(() => (window as any).__bucket().rot3d);

    await page.evaluate(() => {
      const c = document.querySelector('canvas[data-arch-gl="true"]') as HTMLCanvasElement;
      const r = c.getBoundingClientRect();
      const mk = (t: string, x: number, y: number) =>
        new PointerEvent(t, { clientX: x, clientY: y, bubbles: true, cancelable: true, pointerId: 1 });
      c.dispatchEvent(mk('pointerdown', r.left + r.width / 2, r.top + r.height / 2));
      c.dispatchEvent(mk('pointermove', r.left + r.width / 2 + 80, r.top + r.height / 2));
      c.dispatchEvent(mk('pointerup', r.left + r.width / 2 + 80, r.top + r.height / 2));
    });
    await page.waitForTimeout(400);

    const after = await page.evaluate(() => (window as any).__bucket().rot3d);
    expect(after.rotY).toBeGreaterThan((before?.rotY ?? -38) + 10);
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
  });

  test('adding blocks does not remount the canvas', async ({ page }) => {
    await mount3d(page, { blocks: tower() });
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const c = document.querySelector('canvas[data-arch-gl="true"]') as HTMLCanvasElement;
        c.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true }));
      });
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as any).__planCount())).toBe(1);
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
  });

  test('recovers and redraws after a WebGL context loss', async ({ page }) => {
    await mount3d(page, { blocks: tower() });
    const supportsLoss = await page.evaluate(() => {
      const canvas = document.querySelector('canvas[data-arch-gl="true"]') as HTMLCanvasElement;
      const gl = canvas?.getContext('webgl') || canvas?.getContext('experimental-webgl');
      return !!gl?.getExtension('WEBGL_lose_context');
    });
    test.skip(!supportsLoss, 'WEBGL_lose_context is unavailable in this browser');

    await page.evaluate(() => {
      const canvas = document.querySelector('canvas[data-arch-gl="true"]') as HTMLCanvasElement;
      const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext;
      const ext = gl.getExtension('WEBGL_lose_context')!;
      ext.loseContext();
      setTimeout(() => ext.restoreContext(), 120);
    });

    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.state), { timeout: 5_000 }).toBe('ready');
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.blockCount), { timeout: 5_000 }).toBe(tower().length);
    expect((await page.evaluate(() => (window as any).__gl())).contextLost).toBe(false);
  });

  test('tears the renderer down on unmount', async ({ page }) => {
    await mount3d(page, { blocks: tower() });
    await page.evaluate(() => (window as any).__destroy());
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).__gl().state)).toBe('idle');
  });
});
