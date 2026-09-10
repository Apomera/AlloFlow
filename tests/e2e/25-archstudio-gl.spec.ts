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

  test('offers a one-step recovery when filters hide the entire live build', async ({ page }) => {
    const blocks = tower();
    await mount3d(page, {
      blocks,
      viewLayer: 31,
      showSlice: true,
      sliceZSelected: true,
      sliceZ: 64,
      filterMaterial: 'glass',
      filterShape: 'dome',
    });

    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.blockCount)).toBe(0);
    await expect(page.locator('[data-arch-empty-state="true"]')).toContainText('Nothing matches this view');

    await page.getByRole('button', { name: 'Show Entire Build' }).click();

    await expect.poll(() => page.evaluate(() => (window as any).__bucket())).toMatchObject({
      viewLayer: -1,
      showSlice: false,
      sliceZSelected: false,
      filterMaterial: '',
      filterShape: '',
    });
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.blockCount)).toBe(blocks.length);
    await expect(page.locator('[data-arch-empty-state="true"]')).toHaveCount(0);
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

  test('replay heatmap derives support and load colors from the historical frame', async ({ page }) => {
    const foundation = [
      { x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8' },
      { x: 1, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8' },
    ];
    const liveBuild = foundation.concat([
      { x: 0, y: 1, z: 0, shape: 'block', material: 'stone', color: '#94a3b8' },
      { x: 0, y: 2, z: 0, shape: 'block', material: 'stone', color: '#94a3b8' },
    ]);

    await mount3d(page, {
      blocks: liveBuild, showReplay: true, replayStep: 0,
      undoStack: [foundation], showHeatmap: true,
    });
    const replay = await page.evaluate(() => (window as any).__gl());
    expect(replay.blockCount).toBe(2);
    expect(new Set(replay.renderHexes).size).toBe(1);
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

  test('reveals a replacement template instead of inheriting stale hidden-view filters', async ({ page }) => {
    await page.goto(`${base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(() => (window as any).__mount({
      editorView: 'grid', blocks: [{ x: 64, y: 31, z: 64, shape: 'dome', material: 'glass' }],
      editLayer: 31, viewLayer: 31, showSlice: true, sliceZSelected: true, sliceZ: 64,
      filterMaterial: 'glass', filterShape: 'dome', gridCursorX: 64, gridCursorZ: 64,
    }));

    await page.getByRole('button', { name: /Templates/ }).click();
    await page.getByLabel('Choose a template', { exact: true }).selectOption('cottage');
    await page.getByLabel('Template placement', { exact: true }).selectOption('replace');
    await page.getByRole('button', { name: 'Replace build with template', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket())).toMatchObject({
      viewLayer: -1,
      showSlice: false,
      sliceZSelected: false,
      filterMaterial: '',
      filterShape: '',
      editLayer: 3,
      gridCursorX: null,
      gridCursorZ: null,
    });
    await expect(page.locator('button[data-arch-cell="0,3,0"]')).toBeVisible();
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

  test('keeps camera below the build stage and selection inside it above sibling stats', async ({ page }) => {
    await mount3d(page, { blocks: tower(), selectedBlockKey: '0,0,0' });

    const stage = page.locator('[data-arch-stage="true"]');
    const camera = page.locator('.arch-studio-camera-controls');
    const selection = page.locator('[data-arch-selection-chip="true"]');
    const stats = page.locator('[data-arch-stats="true"]');

    await expect(stage.locator('.arch-studio-camera-controls')).toHaveCount(0);
    expect(await camera.evaluate(node => node.parentElement === document.querySelector('[data-arch-stage="true"]')?.parentElement)).toBe(true);
    await expect(stage.locator('[data-arch-selection-chip="true"]')).toHaveCount(1);
    expect(await page.evaluate(() => {
      const stageNode = document.querySelector('[data-arch-stage="true"]');
      const statsNode = document.querySelector('[data-arch-stats="true"]');
      return !!stageNode && !!statsNode && stageNode.parentElement === statsNode.parentElement;
    })).toBe(true);
    expect(await stage.evaluate((node) => !node.contains(document.querySelector('[data-arch-stats="true"]')))).toBe(true);

    const [stageBox, cameraBox, selectionBox, statsBox] = await Promise.all([
      stage.boundingBox(), camera.boundingBox(), selection.boundingBox(), stats.boundingBox(),
    ]);
    expect(stageBox).not.toBeNull();
    expect(cameraBox).not.toBeNull();
    expect(selectionBox).not.toBeNull();
    expect(statsBox).not.toBeNull();

    expect(cameraBox!.y).toBeGreaterThanOrEqual(stageBox!.y + stageBox!.height - 1);
    expect(cameraBox!.y + cameraBox!.height).toBeLessThanOrEqual(statsBox!.y + 1);
    for (const overlay of [selectionBox!]) {
      expect(overlay.x).toBeGreaterThanOrEqual(stageBox!.x - 1);
      expect(overlay.y).toBeGreaterThanOrEqual(stageBox!.y - 1);
      expect(overlay.x + overlay.width).toBeLessThanOrEqual(stageBox!.x + stageBox!.width + 1);
      expect(overlay.y + overlay.height).toBeLessThanOrEqual(stageBox!.y + stageBox!.height + 1);
      expect(overlay.y + overlay.height).toBeLessThanOrEqual(statsBox!.y + 1);
    }
    expect(stageBox!.y + stageBox!.height).toBeLessThanOrEqual(statsBox!.y + 1);
  });

  test('flows AI and Analysis cards below the stage without overlap on a narrow screen', async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 700 });
    await mount3d(page, {
      blocks: tower(),
      showAI: true,
      showAnalysis: true,
      aiAdvice: 'Use a wider foundation and repeat the strongest structural rhythm.',
    });

    const stage = page.locator('[data-arch-stage="true"]');
    const analysis = page.locator('.arch-studio-analysis-panel');
    const ai = page.locator('.arch-studio-ai-panel');
    await expect(analysis).toHaveCount(1);
    await expect(ai).toHaveCount(1);
    expect(await analysis.evaluate((node) => getComputedStyle(node).position)).toBe('relative');
    expect(await ai.evaluate((node) => getComputedStyle(node).position)).toBe('relative');

    const [stageBox, analysisBox, aiBox] = await Promise.all([
      stage.boundingBox(), analysis.boundingBox(), ai.boundingBox(),
    ]);
    expect(stageBox).not.toBeNull();
    expect(analysisBox).not.toBeNull();
    expect(aiBox).not.toBeNull();
    expect(stageBox!.y + stageBox!.height).toBeLessThanOrEqual(analysisBox!.y + 1);
    expect(analysisBox!.y + analysisBox!.height).toBeLessThanOrEqual(aiBox!.y + 1);
  });

  test('keeps primary actions exposed while the feature rail scrolls on a narrow screen', async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 700 });
    await page.goto(`${base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(() => (window as any).__mount({
      editorView: 'grid',
      blocks: [{ x: 0, y: 0, z: 0, shape: 'block', material: 'stone' }],
      undoStack: [[]],
    }));

    const titleRow = page.locator('.arch-studio-title-row');
    const featureStrip = page.locator('.arch-studio-feature-strip');
    const undo = titleRow.getByRole('button', { name: /Undo/ });
    const save = titleRow.getByRole('button', { name: /Save/ });

    const initiallyExposed = await titleRow.evaluate((row) => {
      const rowRect = row.getBoundingClientRect();
      const buttons = Array.from(row.querySelectorAll('button'));
      const visible = (pattern: RegExp) => {
        const button = buttons.find((candidate) => pattern.test(candidate.textContent || ''));
        if (!button) return false;
        const rect = button.getBoundingClientRect();
        return rect.left >= rowRect.left - 1 && rect.right <= rowRect.right + 1;
      };
      return { scrollLeft: row.scrollLeft, undo: visible(/Undo/), save: visible(/Save/) };
    });
    expect(initiallyExposed).toEqual({ scrollLeft: 0, undo: true, save: true });
    await expect(undo).toBeVisible();
    await expect(save).toBeVisible();

    const railBefore = await featureStrip.evaluate((rail) => ({
      clientWidth: rail.clientWidth,
      scrollWidth: rail.scrollWidth,
      scrollLeft: rail.scrollLeft,
    }));
    expect(railBefore.scrollWidth).toBeGreaterThan(railBefore.clientWidth);
    expect(railBefore.scrollLeft).toBe(0);
    await featureStrip.evaluate((rail) => { rail.scrollLeft = rail.scrollWidth; });
    await expect.poll(() => featureStrip.evaluate((rail) => rail.scrollLeft)).toBeGreaterThan(0);
  });

  test('keeps selected floor-grid cells border-box sized and separated', async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 700 });
    await page.goto(`${base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(() => (window as any).__mount({
      editorView: 'grid',
      selectedBlockKey: '0,0,0',
      blocks: [
        { x: 0, y: 0, z: 0, shape: 'block', material: 'stone' },
        { x: 1, y: 0, z: 0, shape: 'block', material: 'brick' },
      ],
    }));

    const selected = page.locator('button[data-arch-cell="0,0,0"]');
    const adjacent = page.locator('button[data-arch-cell="1,0,0"]');
    await expect(selected).toHaveAttribute('aria-selected', 'true');
    expect(await selected.evaluate((node) => getComputedStyle(node).boxSizing)).toBe('border-box');

    const [selectedBox, adjacentBox] = await Promise.all([selected.boundingBox(), adjacent.boundingBox()]);
    expect(selectedBox).not.toBeNull();
    expect(adjacentBox).not.toBeNull();
    expect(Math.abs(selectedBox!.width - adjacentBox!.width)).toBeLessThan(0.5);
    expect(Math.abs(selectedBox!.height - adjacentBox!.height)).toBeLessThan(0.5);
    expect(selectedBox!.x + selectedBox!.width).toBeLessThanOrEqual(adjacentBox!.x + 0.5);
  });

  test('keeps the Active View dock in normal flow and resets every visible restriction', async ({ page }) => {
    await mount3d(page, {
      blocks: tower(),
      viewLayer: 1,
      showSlice: true,
      sliceZSelected: true,
      sliceZ: 0,
      filterMaterial: 'brick',
      filterShape: 'block',
      showHeatmap: true,
      blueprintView: true,
    });

    const viewport = page.locator('.arch-studio-viewport');
    const stage = page.locator('[data-arch-stage="true"]');
    const hud = page.locator('[data-arch-view-hud="true"]');
    const stats = page.locator('[data-arch-stats="true"]');

    await expect(hud).toBeVisible();
    await expect(hud.locator('[data-arch-view-chip]')).toHaveCount(6);
    await expect(hud.locator('[data-arch-view-chip="layer"]')).toContainText('Layer Y=1');
    await expect(hud.locator('[data-arch-view-chip="slice"]')).toContainText('Slice Z=0');
    await expect(hud.locator('[data-arch-view-chip="material"]')).toContainText('Brick');
    expect(await hud.evaluate((node) => getComputedStyle(node).position)).toBe('static');
    expect(await viewport.evaluate((node) => {
      const stageNode = node.querySelector('[data-arch-stage="true"]');
      const hudNode = node.querySelector('[data-arch-view-hud="true"]');
      const statsNode = node.querySelector('[data-arch-stats="true"]');
      return !!stageNode && !!hudNode && !!statsNode
        && stageNode.nextElementSibling === hudNode
        && hudNode.nextElementSibling === statsNode;
    })).toBe(true);

    const [stageBox, hudBox, statsBox] = await Promise.all([
      stage.boundingBox(), hud.boundingBox(), stats.boundingBox(),
    ]);
    expect(stageBox).not.toBeNull();
    expect(hudBox).not.toBeNull();
    expect(statsBox).not.toBeNull();
    expect(stageBox!.y + stageBox!.height).toBeLessThanOrEqual(hudBox!.y + 1);
    expect(hudBox!.y + hudBox!.height).toBeLessThanOrEqual(statsBox!.y + 1);

    await hud.locator('[data-arch-reset-view="true"]').click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket())).toMatchObject({
      viewLayer: -1,
      showSlice: false,
      sliceZ: -1,
      sliceZSelected: false,
      filterMaterial: '',
      filterShape: '',
      showHeatmap: false,
      showReplay: false,
      replayStep: -1,
      blueprintView: false,
    });
    await expect(hud).toHaveCount(0);
  });

  test('keeps floating-panel close controls inside sticky headers', async ({ page }) => {
    await mount3d(page, {
      blocks: tower(),
      showAI: true,
      showAnalysis: true,
    });

    const ai = page.locator('.arch-studio-ai-panel');
    const analysis = page.locator('.arch-studio-analysis-panel');
    const aiHeader = ai.locator('.arch-studio-floating-header');
    const analysisHeader = analysis.locator('.arch-studio-floating-header');
    const closeAI = aiHeader.getByRole('button', { name: 'Close AI Architect' });
    const closeAnalysis = analysisHeader.getByRole('button', { name: 'Close structural analysis' });

    await expect(closeAI).toBeVisible();
    await expect(closeAnalysis).toBeVisible();
    expect(await aiHeader.evaluate((node) => getComputedStyle(node).position)).toBe('sticky');
    expect(await analysisHeader.evaluate((node) => getComputedStyle(node).position)).toBe('sticky');

    await closeAI.click();
    await expect(ai).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().showAI)).toBe(false);

    await closeAnalysis.click();
    await expect(analysis).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().showAnalysis)).toBe(false);
  });

  test('orders the stats rail by immediate building decisions', async ({ page }) => {
    await mount3d(page, {
      blocks: tower(),
      budgetEnabled: true,
      budget: 250,
    });

    const labels = await page
      .locator('[data-arch-stats="true"] .arch-studio-stat > div:first-child')
      .allTextContents();
    expect(labels).toHaveLength(8);
    expect(labels[0]).toContain('Blocks');
    expect(labels[1]).toContain('Stability');
    expect(labels[2]).toContain('Cost');
    expect(labels[3]).toContain('Size');
    expect(labels[4]).toContain('Footprint');
    expect(labels[5]).toContain('Volume');
    expect(labels[6]).toContain('Surface');
    expect(labels[7]).toContain('Challenges');
  });

  test('applies the compact layout hooks at the phone breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 720 });
    await mount3d(page, {
      blocks: tower(),
      selectedBlockKey: '0,0,0',
      viewLayer: 0,
    });

    const layout = await page.evaluate(() => {
      const main = document.querySelector('.arch-studio-main')!;
      const sidebar = document.querySelector('.arch-studio-sidebar')!;
      const viewport = document.querySelector('.arch-studio-viewport')!;
      const stage = document.querySelector('[data-arch-stage="true"]')!;
      const viewSwitch = document.querySelector('.arch-studio-view-switch')!;
      const selection = document.querySelector('[data-arch-selection-chip="true"]')!;
      const hud = document.querySelector('[data-arch-view-hud="true"]')!;
      const stats = document.querySelector('[data-arch-stats="true"]')!;
      return {
        mainDirection: getComputedStyle(main).flexDirection,
        mainOverflowY: getComputedStyle(main).overflowY,
        sidebarMaxHeight: getComputedStyle(sidebar).maxHeight,
        stageHeight: stage.getBoundingClientRect().height,
        viewSwitchRight: getComputedStyle(viewSwitch).right,
        viewSwitchTransform: getComputedStyle(viewSwitch).transform,
        selectionBottom: getComputedStyle(selection).bottom,
        hudPosition: getComputedStyle(hud).position,
        hudOverflowX: getComputedStyle(hud).overflowX,
        statsOverflowX: getComputedStyle(stats).overflowX,
        statsJustify: getComputedStyle(stats).justifyContent,
        hudInViewport: hud.closest('.arch-studio-viewport') === viewport,
        hudOutsideStage: !stage.contains(hud),
      };
    });

    expect(layout).toMatchObject({
      mainDirection: 'column',
      mainOverflowY: 'auto',
      sidebarMaxHeight: '210px',
      viewSwitchRight: 'auto',
      viewSwitchTransform: 'none',
      selectionBottom: '8px',
      hudPosition: 'static',
      hudOverflowX: 'auto',
      statsOverflowX: 'auto',
      statsJustify: 'flex-start',
      hudInViewport: true,
      hudOutsideStage: true,
    });
    expect(layout.stageHeight).toBeGreaterThanOrEqual(260);
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
    await mount3d(page, { blocks: tower(), showDesign: true, designTab: 'region' });
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.regionSelection)).toBe(true);
    const supportsLoss = await page.evaluate(() => {
      const canvas = document.querySelector('canvas[data-arch-gl="true"]') as HTMLCanvasElement;
      const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl') || canvas?.getContext('experimental-webgl');
      return !!gl?.getExtension('WEBGL_lose_context');
    });
    test.skip(!supportsLoss, 'WEBGL_lose_context is unavailable in this browser');

    await page.evaluate(() => {
      const canvas = document.querySelector('canvas[data-arch-gl="true"]') as HTMLCanvasElement;
      const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext;
      const ext = gl.getExtension('WEBGL_lose_context')!;
      ext.loseContext();
      setTimeout(() => ext.restoreContext(), 120);
    });

    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.state), { timeout: 5_000 }).toBe('ready');
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.blockCount), { timeout: 5_000 }).toBe(tower().length);
    expect((await page.evaluate(() => (window as any).__gl())).contextLost).toBe(false);
    expect((await page.evaluate(() => (window as any).__gl())).regionSelection).toBe(true);
  });

  test('tears the renderer down on unmount', async ({ page }) => {
    await mount3d(page, { blocks: tower(), showDesign: true, designTab: 'region' });
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.regionSelection)).toBe(true);
    await page.evaluate(() => (window as any).__destroy());
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).__gl().state)).toBe('idle');
  });

  test('design workbench builds a room, copies a region, and undoes whole operations', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await mount3d(page, { blocks: [], showDesign: true, soundEnabled: false });
    const panel = page.locator('[data-arch-design="true"]');
    await expect(panel.getByRole('img')).toBeVisible();
    await expect(panel).toContainText('84 blocks');
    await panel.getByLabel('Building material', { exact: true }).selectOption('brick');
    await panel.getByRole('button', { name: 'Add to build', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.blockCount)).toBe(84);
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().undoStack.length)).toBe(1);
    await expect(panel.locator('[data-arch-design-notice]')).toContainText('Added 84 blocks');
    await expect(panel.locator('[data-arch-design-warning]')).toContainText('Design added.');
    await expect(panel.locator('[data-arch-design-apply]')).toBeDisabled();
    await panel.getByRole('button', { name: 'Region edits', exact: true }).click();
    await expect(panel.locator('[data-arch-region-count]')).toHaveText('84 blocks selected');
    await panel.getByRole('button', { name: 'Copy region', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.blockCount)).toBe(168);
    const state = await page.evaluate(() => (window as any).__bucket());
    expect(state.designRegion.minX).toBe(7);
    expect(state.undoStack).toHaveLength(2);
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.regionSelection)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('design-workbench-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: /Undo/ }).first().click();
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.blockCount)).toBe(84);
    await expect(panel.locator('[data-arch-design-notice]')).toHaveCount(0);
    await page.getByRole('button', { name: /Undo/ }).first().click();
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.blockCount)).toBe(0);
    await page.getByRole('button', { name: /Redo/ }).first().click();
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.blockCount)).toBe(84);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('design workbench validates dimensions, collisions, and floor region editing', async ({ page }) => {
    await mount3d(page, { blocks: tower(), showDesign: true, designTab: 'region', soundEnabled: false });
    const panel = page.locator('[data-arch-design="true"]');
    await panel.getByRole('button', { name: 'Current floor', exact: true }).click();
    await expect(panel.locator('[data-arch-region-count]')).toHaveText('5 blocks selected');
    await panel.getByLabel('Operation', { exact: true }).selectOption('move');
    await panel.getByLabel('Offset X', { exact: true }).fill('0');
    await panel.getByLabel('Offset Y', { exact: true }).fill('-1');
    await expect(panel.locator('[data-arch-design-warning]')).toContainText('outside');
    await expect(panel.locator('[data-arch-design-apply]')).toBeDisabled();
    await panel.getByLabel('Operation', { exact: true }).selectOption('paint');
    await panel.getByLabel('Building material', { exact: true }).selectOption('wood');
    await panel.getByRole('button', { name: 'Paint region', exact: true }).click();
    const state = await page.evaluate(() => (window as any).__bucket());
    expect(state.blocks.filter((b: any) => b.y === 0).every((b: any) => b.material === 'wood')).toBe(true);
    expect(state.blocks.filter((b: any) => b.y > 0).every((b: any) => b.material === 'brick')).toBe(true);
    await panel.getByRole('button', { name: 'Builder', exact: true }).click();
    await panel.getByLabel('Width (X)', { exact: true }).fill('');
    await expect(panel.locator('[data-arch-design-apply]')).toBeDisabled();
    await panel.getByLabel('Width (X)', { exact: true }).fill('8');
    await expect(panel.locator('[data-arch-design-warning]')).toContainText('occupied cells');
    await panel.getByLabel('Origin X', { exact: true }).fill('-12');
    await expect(panel.locator('[data-arch-design-apply]')).toBeEnabled();
  });

  test('design workbench remains usable on a phone and returns focus on close', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mount3d(page, { blocks: [], showDesign: true, soundEnabled: false });
    const panel = page.locator('[data-arch-design="true"]');
    await panel.getByLabel('Width (X)', { exact: true }).fill('4');
    await panel.getByLabel('Depth (Z)', { exact: true }).fill('4');
    await panel.getByLabel('Building material', { exact: true }).selectOption('wood');
    await panel.getByRole('button', { name: 'Add to build', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.blockCount)).toBe(52);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('design-workbench-phone.png'), fullPage: true });
    await panel.getByRole('button', { name: 'Close design workbench', exact: true }).click();
    await expect(page.locator('#arch-design-toggle')).toBeFocused();
    await expect(panel).toHaveCount(0);
    await page.locator('#arch-design-toggle').press('Enter');
    await expect(panel).toBeVisible();
  });

  test('design workbench rechecks stale clicks and protects replay', async ({ page }) => {
    await mount3d(page, { blocks: [], showDesign: true, soundEnabled: false });
    await page.evaluate(() => {
      const w = window as any;
      w.__toolData.archStudio.blocks = [{ x: 0, y: 0, z: 0, shape: 'block', material: 'stone' }];
      (document.querySelector('[data-arch-design-apply]') as HTMLButtonElement).click();
    });
    await expect(page.locator('[data-arch-design-notice]')).toContainText('occupied cells');
    expect(await page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(1);
    expect(await page.evaluate(() => (window as any).__bucket().undoStack || [])).toEqual([]);
    await page.evaluate(() => {
      const w = window as any;
      w.__toolData.archStudio = Object.assign({}, w.__toolData.archStudio, { showReplay: true, undoStack: [[]] });
      (document.querySelector('#arch-design-toggle') as HTMLButtonElement).click();
    });
    await page.locator('#arch-design-toggle').click();
    await expect(page.locator('[data-arch-design-apply]')).toBeDisabled();
    await expect(page.locator('[data-arch-design-warning]')).toContainText('replay');
  });

  test('project workflow downloads, previews, opens, and undoes project details', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 850 });
    await mount3d(page, { blocks: tower(), showProject: true, projectName: 'Library 図書館', projectNotes: 'Original notes\nLight & air', soundEnabled: false });
    const panel = page.locator('[data-arch-project]');
    const downloaded = page.waitForEvent('download');
    await panel.getByRole('button', { name: 'Download project', exact: true }).click();
    const download = await downloaded;
    expect(download.suggestedFilename()).toBe('Library 図書館.archstudio.json');
    const downloadedPath = await download.path();
    expect(downloadedPath).toBeTruthy();
    const data = JSON.parse(await readFile(downloadedPath!, 'utf8'));
    expect(data.project).toEqual({ name: 'Library 図書館', notes: 'Original notes\nLight & air' });
    expect(data.blocks).toHaveLength(13);
    expect(Object.keys(data).sort()).toEqual(['blocks', 'format', 'project', 'version']);

    const incoming = { ...data, project: { name: 'Courtyard', notes: 'Leave a route through the middle.' }, blocks: data.blocks.slice(0, 2) };
    await panel.getByLabel('Preview a project file', { exact: true }).setInputFiles({
      name: 'courtyard.archstudio.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(incoming)),
    });
    await expect(panel.locator('[data-arch-project-import]')).toContainText('Courtyard');
    await expect(panel.locator('[data-arch-project-plan]')).toBeVisible();
    expect(await page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(13);
    await page.screenshot({ path: testInfo.outputPath('project-file-preview-desktop.png'), fullPage: true });
    await panel.getByRole('button', { name: 'Apply import', exact: true }).click();
    await expect(panel.getByLabel('Project name', { exact: true })).toHaveValue('Courtyard');
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.blockCount)).toBe(2);
    await page.getByRole('button', { name: /Undo/ }).first().click();
    await expect(panel.getByLabel('Project name', { exact: true })).toHaveValue('Library 図書館');
    await expect(panel.getByLabel('Design notes', { exact: true })).toHaveValue('Original notes\nLight & air');
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.blockCount)).toBe(13);
    await page.getByRole('button', { name: /Redo/ }).first().click();
    await expect(panel.getByLabel('Project name', { exact: true })).toHaveValue('Courtyard');
    await expect(panel.getByLabel('Design notes', { exact: true })).toHaveValue(incoming.project.notes);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('project workflow saves named revisions, merges components, compares, and restores', async ({ page }) => {
    await mount3d(page, { blocks: tower(), showProject: true, projectName: 'Campus', projectNotes: 'First version', soundEnabled: false });
    const panel = page.locator('[data-arch-project]');
    await panel.getByRole('button', { name: 'Save snapshot', exact: true }).click();
    await expect(panel.locator('[data-arch-project-save-status]')).toContainText('Matches');
    const firstId = await page.evaluate(() => (window as any).__bucket().projectSavedId);
    await panel.getByLabel('Design notes', { exact: true }).fill('Added a separate entrance');
    await expect(panel.locator('[data-arch-project-save-status]')).toContainText('not been saved');
    const component = { format: 'alloflow.architecture-studio', version: 1, project: { name: 'Entrance', notes: 'Do not replace the campus notes' },
      blocks: [{ x: 0, y: 0, z: 0, shape: 'door', material: 'wood', color: '#92400e', rotation: 90 }] };
    await panel.getByLabel('Preview a project file', { exact: true }).setInputFiles({ name: 'entrance.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(component)) });
    await expect(panel.locator('[data-arch-project-import]')).toBeVisible();
    await panel.getByLabel('Import action', { exact: true }).selectOption('merge');
    await expect(panel.locator('[data-arch-project-apply]')).toBeDisabled();
    await expect(panel.locator('[data-arch-project-import-warning]')).toContainText('overlap');
    await panel.getByLabel('Import offset X', { exact: true }).fill('8');
    await panel.getByRole('button', { name: 'Apply import', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.blockCount)).toBe(14);
    await expect(panel.getByLabel('Project name', { exact: true })).toHaveValue('Campus');
    await expect(panel.getByLabel('Design notes', { exact: true })).toHaveValue('Added a separate entrance');
    await expect(panel.locator('[data-arch-project-comparison]')).toContainText('Added: 1');
    await expect(panel.locator('[data-arch-project-comparison]')).toContainText('Unchanged: 13');
    await panel.getByRole('button', { name: 'Save snapshot', exact: true }).click();
    const secondId = await page.evaluate(() => (window as any).__bucket().projectSavedId);
    expect(secondId).not.toBe(firstId);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('alloflow_archstudio_builds') || '[]'));
    expect(saved).toHaveLength(2);
    expect(saved[0]).toMatchObject({ name: 'Campus', notes: 'First version', blockCount: 13 });
    expect(saved[1]).toMatchObject({ name: 'Campus', notes: 'Added a separate entrance', blockCount: 14 });
    await panel.getByLabel('Compare with saved revision', { exact: true }).selectOption(firstId);
    await panel.getByRole('button', { name: 'Restore this snapshot', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.blockCount)).toBe(13);
    await expect(panel.getByLabel('Design notes', { exact: true })).toHaveValue('First version');
    await page.getByRole('button', { name: /Undo/ }).first().click();
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.blockCount)).toBe(14);
    await expect(panel.getByLabel('Design notes', { exact: true })).toHaveValue('Added a separate entrance');
    await expect(panel.locator('[data-arch-project-save-status]')).toContainText('Matches');
  });

  test('project workflow rejects bad files and revalidates stale merge previews', async ({ page }) => {
    await mount3d(page, { blocks: [], showProject: true, soundEnabled: false });
    const panel = page.locator('[data-arch-project]');
    const input = panel.getByLabel('Preview a project file', { exact: true });
    await input.setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
    await expect(panel.getByRole('alert')).toContainText('not valid JSON');
    expect(await page.evaluate(() => (window as any).__bucket().blocks || [])).toEqual([]);
    const incoming = { format: 'alloflow.architecture-studio', version: 1, project: { name: '<script>not executable</script>', notes: 'Preview only' },
      blocks: [{ x: 2, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 }] };
    await input.setInputFiles({ name: 'valid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(incoming)) });
    await expect(panel.locator('[data-arch-project-import]')).toContainText('<script>not executable</script>');
    expect(await panel.locator('script').count()).toBe(0);
    await panel.getByLabel('Import action', { exact: true }).selectOption('merge');
    await expect(panel.locator('[data-arch-project-apply]')).toBeEnabled();
    await page.evaluate((blocks) => {
      (window as any).__toolData.archStudio.blocks = blocks;
      (document.querySelector('[data-arch-project-apply]') as HTMLButtonElement).click();
    }, incoming.blocks);
    await expect(panel.getByRole('alert')).toContainText('overlap');
    expect(await page.evaluate(() => (window as any).__bucket().undoStack || [])).toEqual([]);
    await input.setInputFiles({ name: 'too-large.json', mimeType: 'application/json', buffer: Buffer.alloc(2 * 1024 * 1024 + 1, ' ') });
    await expect(panel.getByRole('alert')).toContainText('smaller than 2 MB');
    await expect(panel.locator('[data-arch-project-import]')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(1);
  });

  test('project workflow stays accessible on a phone and protects replay frames', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const historical = [{ x: 0, y: 0, z: 0, shape: 'block', material: 'wood', color: '#92400e', rotation: 0 }];
    await mount3d(page, { blocks: tower(), showProject: true, showReplay: true, replayStep: 0, soundEnabled: false,
      projectName: 'Current project', projectNotes: 'Current notes', undoStack: [{ kind: 'arch-project-frame', blocks: historical, projectName: 'Earlier project', projectNotes: 'Earlier notes' }] });
    const panel = page.locator('[data-arch-project]');
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.blockCount)).toBe(1);
    await expect(panel.getByLabel('Project name', { exact: true })).toBeDisabled();
    await expect(panel.getByLabel('Preview a project file', { exact: true })).toBeDisabled();
    await page.locator('.arch-studio-feature-strip').getByRole('button', { name: /Replay/ }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.blockCount)).toBe(13);
    await panel.getByLabel('Project name', { exact: true }).fill('Phone project');
    await panel.getByLabel('Design notes', { exact: true }).fill('Designed on a small screen');
    await panel.getByRole('button', { name: 'Save snapshot', exact: true }).click();
    await expect(panel.locator('[data-arch-project-save-status]')).toContainText('Matches');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('project-revisions-phone.png'), fullPage: true });
    await panel.getByRole('button', { name: 'Close project panel', exact: true }).click();
    await expect(page.locator('#arch-project-toggle')).toBeFocused();
    await page.locator('#arch-project-toggle').press('Enter');
    await expect(panel).toBeVisible();
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
  test('project workflow cancels file reads and ignores out-of-order results', async ({ page }) => {
    await mount3d(page, { blocks: [], showProject: true, soundEnabled: false });
    await page.evaluate(() => {
      const w = window as any;
      w.__pendingProjectReads = [];
      w.FileReader = class {
        result: string | null = null;
        aborted = false;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        readAsText() { w.__pendingProjectReads.push(this); }
        abort() { this.aborted = true; }
      };
    });
    const panel = page.locator('[data-arch-project]');
    const input = panel.getByLabel('Preview a project file', { exact: true });
    const file = (name: string) => ({ name: name + '.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
    const project = (name: string) => JSON.stringify({
      format: 'alloflow.architecture-studio', version: 1, project: { name, notes: '' }, blocks: [],
    });
    await input.setInputFiles(file('First'));
    await expect(panel.getByRole('status', { name: '' }).filter({ hasText: 'Reading project file' })).toBeVisible();
    await input.setInputFiles(file('Second'));
    expect(await page.evaluate(() => (window as any).__pendingProjectReads[0].aborted)).toBe(true);
    await page.evaluate(({ first, second }) => {
      const reads = (window as any).__pendingProjectReads;
      reads[1].result = second; reads[1].onload();
      reads[0].result = first; reads[0].onload();
    }, { first: project('First'), second: project('Second') });
    await expect(panel.locator('[data-arch-project-import]')).toContainText('Second');
    expect(await page.evaluate(() => (window as any).__bucket().projectImport.project.name)).toBe('Second');

    await input.setInputFiles(file('Canceled'));
    await expect(panel.getByRole('status', { name: '' }).filter({ hasText: 'Reading project file' })).toBeVisible();
    await panel.getByRole('button', { name: 'Close project panel', exact: true }).click();
    expect(await page.evaluate(() => (window as any).__pendingProjectReads[2].aborted)).toBe(true);
    await page.evaluate((data) => {
      const canceled = (window as any).__pendingProjectReads[2];
      canceled.result = data; canceled.onload();
    }, project('Canceled'));
    await page.locator('#arch-project-toggle').click();
    await expect(panel).toBeVisible();
    await expect(panel.getByText('Reading project file…', { exact: true })).toHaveCount(0);
    await expect(panel.locator('[data-arch-project-import]')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__bucket().blocks)).toEqual([]);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('drawing desk shows floor slices, elevations, sections, and downloads a project sheet', async ({ page }, testInfo) => {
    const blocks = [
      { x: -2, y: 0, z: -1, shape: 'door', material: 'wood', color: '#92400e', rotation: 90 },
      { x: 0, y: 0, z: 1, shape: 'block', material: 'wood', color: '#92400e', rotation: 0 },
      { x: -2, y: 2, z: -1, shape: 'roof', material: 'stone', color: '#94a3b8', rotation: 0 },
      { x: 0, y: 2, z: 1, shape: 'roof', material: 'stone', color: '#94a3b8', rotation: 0 },
    ];
    await page.setViewportSize({ width: 1280, height: 900 });
    await mount3d(page, { blocks, projectName: 'Courtyard 図書館', projectNotes: 'Keep <doors> open & shaded.', soundEnabled: false });
    await page.locator('#arch-drawings-toggle').click();
    const desk = page.locator('[data-arch-drawings]');
    await expect(desk.getByRole('img', { name: 'Floor plan · Y=0', exact: true })).toBeVisible();
    await expect(desk.locator('[data-drawing-cell]')).toHaveCount(2);
    await expect(desk.locator('[data-block="-2,0,-1"]')).toHaveAttribute('fill', '#92400e');
    await desk.getByLabel('Plan floor (Y)', { exact: true }).selectOption('1');
    await expect(desk.getByRole('img')).toContainText('No blocks on this floor or section.');
    await desk.getByLabel('Plan floor (Y)', { exact: true }).selectOption('2');
    await expect(desk.locator('[data-block="-2,2,-1"]')).toHaveAttribute('fill', '#94a3b8');
    await desk.getByLabel('Drawing view', { exact: true }).selectOption('front');
    await expect(desk.locator('[data-drawing-cell]')).toHaveCount(4);
    await desk.getByLabel('Drawing view', { exact: true }).selectOption('right');
    await expect(desk.getByRole('img')).toHaveAttribute('aria-label', 'Right elevation');
    await desk.getByLabel('Drawing view', { exact: true }).selectOption('section');
    await desk.getByLabel('Section position (Z)', { exact: true }).fill('-1');
    await expect(desk.locator('[data-drawing-cell]')).toHaveCount(2);
    await expect(desk.getByRole('img')).toHaveAttribute('aria-label', 'Cut section · Z=-1');
    const drawingBox = await desk.getByRole('img').boundingBox();
    const deskBox = await desk.boundingBox();
    expect(drawingBox!.y + drawingBox!.height).toBeLessThanOrEqual(deskBox!.y + deskBox!.height);
    await page.screenshot({ path: testInfo.outputPath('drawing-desk-desktop.png'), fullPage: true });
    const downloadEvent = page.waitForEvent('download');
    await desk.getByRole('button', { name: 'Download drawing sheet', exact: true }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe('Courtyard 図書館.drawings.svg');
    const svg = await readFile((await download.path())!, 'utf8');
    expect(svg).toContain('Floor plan · Y=2');
    expect(svg).toContain('Cut section · Z=-1');
    expect(svg).toContain('Keep &lt;doors&gt; open &amp; shaded.');
    const summary = await page.evaluate((svg) => {
      const xml = new DOMParser().parseFromString(svg, 'image/svg+xml');
      return { views: xml.querySelectorAll('svg').length, invalid: xml.querySelectorAll('parsererror,script,foreignObject').length };
    }, svg);
    expect(summary).toEqual({ views: 5, invalid: 0 });
    expect(await page.evaluate(() => (window as any).__bucket().blocks)).toEqual(blocks);
    expect(await page.evaluate(() => (window as any).__bucket().undoStack || [])).toEqual([]);
    await desk.getByRole('button', { name: 'Return to build', exact: true }).click();
    await expect(page.locator('#arch-drawings-toggle')).toBeFocused();
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.state)).toBe('ready');
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.blockCount)).toBe(4);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('drawing desk measures with pointer and keyboard controls and validates inputs', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await mount3d(page, { blocks: [
      { x: 0, y: 0, z: 0, shape: 'block', material: 'wood' },
      { x: 3, y: 0, z: 4, shape: 'block', material: 'stone' },
    ], soundEnabled: false });
    await page.locator('#arch-drawings-toggle').click();
    const desk = page.locator('[data-arch-drawings]');
    await desk.getByLabel('Measure a span', { exact: true }).check();
    await desk.locator('[data-drawing-cell="0,0"]').click();
    await desk.locator('[data-drawing-cell="3,4"]').click();
    await expect(desk.getByLabel('Start X', { exact: true })).toHaveValue('0.5');
    await expect(desk.getByLabel('End Z', { exact: true })).toHaveValue('4.5');
    await expect(desk.locator('[data-arch-drawing-measure]')).toContainText('Distance: 5 grid units');
    await desk.getByLabel('Start X', { exact: true }).fill('0');
    await desk.getByLabel('Start Z', { exact: true }).fill('0');
    await desk.getByLabel('End X', { exact: true }).fill('3');
    await desk.getByLabel('End Z', { exact: true }).fill('4');
    await expect(desk.locator('[data-arch-drawing-measure]')).toContainText('X: 3 · Z: 4');
    await expect(desk.locator('[data-drawing-measurement]')).toHaveCount(1);
    await desk.getByLabel('End X', { exact: true }).fill('999');
    await expect(desk.getByRole('alert')).toContainText('inside the drawing extents');
    await expect(desk.getByRole('button', { name: 'Download drawing sheet', exact: true })).toBeDisabled();
    await expect(desk.locator('[data-drawing-measurement]')).toHaveCount(0);
    await desk.getByRole('button', { name: 'Reset measurement', exact: true }).click();
    await desk.getByLabel('Show dimensions', { exact: true }).uncheck();
    await expect(desk.locator('[data-drawing-dimensions]')).toHaveCount(0);
    await desk.getByLabel('Drawing view', { exact: true }).selectOption('front');
    await expect(desk.getByLabel('Measure a span', { exact: true })).not.toBeChecked();
    await desk.getByLabel('Section position (Z)', { exact: true }).fill('');
    await expect(desk.getByRole('alert')).toContainText('whole-number section');
    await expect(desk.getByRole('button', { name: 'Download drawing sheet', exact: true })).toBeDisabled();
    await desk.getByLabel('Section position (Z)', { exact: true }).fill('-1');
    await expect(desk.getByRole('button', { name: 'Download drawing sheet', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(2);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('drawing desk makes live-model scope explicit during filtered replay and preserves the view', async ({ page }) => {
    await mount3d(page, { blocks: tower(), showReplay: true, replayStep: 0,
      undoStack: [[{ x: 0, y: 0, z: 0, shape: 'block', material: 'wood' }]], filterMaterial: 'wood', viewLayer: 0 });
    const before = await page.evaluate(() => (window as any).__bucket());
    await page.locator('#arch-drawings-toggle').click();
    const desk = page.locator('[data-arch-drawings]');
    await expect(desk.getByRole('status').filter({ hasText: 'Replay is active' })).toContainText('Replay is active');
    await expect(desk.locator('[data-arch-drawing-summary]')).toContainText('13 blocks in the live model');
    await expect(desk.locator('[data-drawing-cell]')).toHaveCount(5);
    await desk.getByLabel('Drawing view', { exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(desk).toHaveCount(0);
    await expect(page.locator('#arch-drawings-toggle')).toBeFocused();
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.state)).toBe('ready');
    const after = await page.evaluate(() => (window as any).__bucket());
    expect(after.blocks).toEqual(before.blocks);
    expect(after.undoStack).toEqual(before.undoStack);
    expect(after.showReplay).toBe(true);
    expect(after.filterMaterial).toBe('wood');
    expect(after.viewLayer).toBe(0);
  });

  test('drawing desk works on a phone, handles empty builds, and refreshes after edits', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mount3d(page, { blocks: [], projectName: 'Phone drawing', soundEnabled: false });
    await page.locator('#arch-drawings-toggle').click();
    const desk = page.locator('[data-arch-drawings]');
    await expect(desk.getByRole('button', { name: 'Download drawing sheet', exact: true })).toBeDisabled();
    await expect(desk.getByRole('img')).toContainText('Add blocks to create drawings.');
    await page.locator('#arch-design-toggle').click();
    const design = page.locator('[data-arch-design]');
    await design.getByRole('button', { name: 'Add to build', exact: true }).click();
    await page.locator('#arch-drawings-toggle').click();
    await expect(desk.locator('[data-arch-drawing-summary]')).toContainText('84 blocks in the live model');
    await desk.getByLabel('Plan floor (Y)', { exact: true }).selectOption('1');
    await expect(desk.locator('[data-arch-drawing-summary]')).toContainText('18 visible cells');
    await desk.locator('[data-arch-drawing-preview]').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('drawing-desk-phone.png'), fullPage: true });
    await desk.getByRole('button', { name: 'Return to build', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.blockCount)).toBe(84);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('usability refinement keeps workspaces and history actions reachable on a small phone', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await mount3d(page, { blocks: tower(), showDesign: true, projectName: 'Phone studio', undoStack: [[]], soundEnabled: false });
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif}' });
    const nav = page.getByRole('navigation', { name: 'Studio workspaces', exact: true });
    const history = page.getByRole('group', { name: 'Build history and saving', exact: true });
    for (const button of [...await nav.getByRole('button').all(), ...await history.getByRole('button').all()]) {
      const box = await button.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await nav.locator('#arch-drawings-toggle').click();
    await expect(nav.locator('#arch-design-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(nav.locator('#arch-design-toggle')).not.toHaveAttribute('aria-controls');
    await expect(page.locator('.arch-studio-feature-strip')).toHaveCount(0);
    await nav.locator('#arch-project-toggle').click();
    await expect(page.locator('[data-arch-project]')).toBeVisible();
    await expect(page.getByLabel('Project name', { exact: true })).toHaveValue('Phone studio');
    await history.getByRole('button', { name: /Save/ }).click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('alloflow_archstudio_builds') || '[]').at(-1).name)).toBe('Phone studio');
    await history.getByRole('button', { name: /Undo/ }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(0);
    await history.getByRole('button', { name: /Redo/ }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(13);
    await page.screenshot({ path: testInfo.outputPath('studio-navigation-phone.png'), fullPage: true });
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('usability refinement zooms, pans, fits, and measures without changing geometry', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const blocks = [{ x: 0, y: 0, z: 0, shape: 'block', material: 'wood' }, { x: 3, y: 0, z: 4, shape: 'block', material: 'stone' }];
    await mount3d(page, { blocks, projectName: 'Drawing review', soundEnabled: false });
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif}' });
    await page.locator('#arch-drawings-toggle').click();
    const desk = page.locator('[data-arch-drawings]');
    const viewport = desk.getByRole('region', { name: 'Drawing viewport', exact: true });
    await expect(desk.locator('[data-arch-drawing-zoom]')).toHaveText('100% of fit');
    const fitted = await desk.getByRole('img').boundingBox();
    const container = await viewport.boundingBox();
    expect(fitted!.width).toBeLessThanOrEqual(container!.width);
    expect(fitted!.height).toBeLessThanOrEqual(container!.height);
    await viewport.focus();
    const outline = await viewport.evaluate(el => getComputedStyle(el).outlineWidth);
    expect(parseFloat(outline)).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < 6; i++) await viewport.press('+');
    await expect(desk.locator('[data-arch-drawing-zoom]')).toHaveText('400% of fit');
    await expect(desk.getByRole('button', { name: 'Zoom drawing in', exact: true })).toBeDisabled();
    const beforePan = await viewport.evaluate(el => ({ x: el.scrollLeft, y: el.scrollTop }));
    await viewport.press('ArrowRight');
    await viewport.press('ArrowDown');
    const afterPan = await viewport.evaluate(el => ({ x: el.scrollLeft, y: el.scrollTop }));
    expect(afterPan.x).toBeGreaterThan(beforePan.x);
    expect(afterPan.y).toBeGreaterThan(beforePan.y);
    await viewport.press('0');
    await expect(desk.locator('[data-arch-drawing-zoom]')).toHaveText('100% of fit');
    expect(await viewport.evaluate(el => [el.scrollLeft, el.scrollTop])).toEqual([0, 0]);
    await desk.getByLabel('Measure a span', { exact: true }).check();
    await desk.getByRole('button', { name: 'Zoom drawing in', exact: true }).click();
    await desk.getByRole('button', { name: 'Zoom drawing in', exact: true }).click();
    await desk.locator('[data-drawing-cell="0,0"]').click();
    await desk.locator('[data-drawing-cell="3,4"]').click();
    await expect(desk.locator('[data-arch-drawing-measure]')).toContainText('Distance: 5 grid units');
    await desk.getByRole('button', { name: 'Fit drawing', exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath('drawing-viewer-desktop.png'), fullPage: true });
    expect(await page.evaluate(() => (window as any).__bucket().blocks)).toEqual(blocks);
    expect(await page.evaluate(() => (window as any).__bucket().undoStack || [])).toEqual([]);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('usability refinement resets drawing zoom on view changes and releases observers', async ({ page }) => {
    await mount3d(page, { blocks: tower(), showProject: true, soundEnabled: false });
    await page.evaluate(() => {
      const w = window as any, Original = w.ResizeObserver;
      w.__drawingObservers = [];
      w.ResizeObserver = class extends Original {
        target: Element | null = null;
        disconnected = false;
        constructor(callback: ResizeObserverCallback) { super(callback); w.__drawingObservers.push(this); }
        observe(target: Element) { this.target = target; super.observe(target); }
        disconnect() { this.disconnected = true; super.disconnect(); }
      };
    });
    await page.locator('#arch-drawings-toggle').click();
    const desk = page.locator('[data-arch-drawings]');
    await desk.getByRole('button', { name: 'Zoom drawing in', exact: true }).click();
    await expect(desk.locator('[data-arch-drawing-zoom]')).toHaveText('150% of fit');
    await desk.getByLabel('Drawing view', { exact: true }).selectOption('front');
    await expect(desk.locator('[data-arch-drawing-zoom]')).toHaveText('100% of fit');
    await page.locator('#arch-project-toggle').click();
    await expect(page.locator('[data-arch-project]')).toBeVisible();
    const closed = await page.evaluate(() => (window as any).__drawingObservers
      .filter((item: any) => item.target?.hasAttribute('data-arch-drawing-viewport')).map((item: any) => item.disconnected));
    expect(closed.length).toBeGreaterThanOrEqual(2);
    expect(closed.every(Boolean)).toBe(true);
    await page.locator('#arch-drawings-toggle').click();
    await desk.getByRole('region', { name: 'Drawing viewport', exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(desk).toHaveCount(0);
    await expect(page.locator('#arch-drawings-toggle')).toBeFocused();
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.state)).toBe('ready');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('usability refinement passes accessibility checks in light, dark, and contrast appearances', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await mount3d(page, { blocks: tower(), soundEnabled: false });
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif}' });
    await page.addScriptTag({ path: join(ROOT, 'node_modules/axe-core/axe.min.js') });
    for (const workspace of ['build', 'drawings']) {
      if (workspace === 'drawings') await page.locator('#arch-drawings-toggle').click();
      for (const theme of ['theme-light', 'theme-dark', 'theme-contrast']) {
        await page.evaluate(theme => { document.documentElement.className = theme; }, theme);
        const violations = await page.evaluate(async () => {
          const result = await (window as any).axe.run(document.querySelector('#arch-studio-region'), {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
          });
          return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }));
        });
        expect(violations, workspace + ' / ' + theme).toEqual([]);
      }
    }
  });


  test('repeat layout adds a row in one undo step and keeps original project details', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 960 });
    const original = [
      { x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 },
      { x: 0, y: 1, z: 0, shape: 'ramp', material: 'wood', color: '#123456', rotation: 270 },
    ];
    await mount3d(page, { blocks: original, showDesign: true, designTab: 'region', projectName: 'Colonnade', projectNotes: 'Keep these notes', soundEnabled: false });
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:920px}' });
    const panel = page.locator('[data-arch-design]');
    await panel.getByLabel('Operation', { exact: true }).selectOption('repeat');
    await panel.getByRole('button', { name: 'Row along X', exact: true }).click();
    await expect(panel.getByLabel('Spacing X', { exact: true })).toHaveValue('2');
    await expect(panel.locator('[data-arch-repeat-summary]')).toContainText('3 new copies · 6 added blocks · 24 studio credits');
    await expect(panel.locator('[data-arch-repeat-copy]')).toHaveCount(4);
    await expect(panel.getByRole('img', { name: 'Repeat layout preview' })).toBeVisible();
    await panel.getByLabel('Preview view', { exact: true }).selectOption('front');
    await panel.locator('[data-arch-repeat-plan]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('repeat-layout-desktop.png'), fullPage: true });
    await panel.getByRole('button', { name: 'Add repeated copies', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.blockCount)).toBe(8);
    const state = await page.evaluate(() => (window as any).__bucket());
    expect(state.undoStack).toHaveLength(1);
    expect(state.projectName).toBe('Colonnade');
    expect(state.projectNotes).toBe('Keep these notes');
    expect(state.designRegion).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 1, minZ: 0, maxZ: 0 });
    expect(state.blocks.filter((b: any) => b.shape === 'ramp').map((b: any) => b.x)).toEqual([0, 2, 4, 6]);
    expect(state.blocks.filter((b: any) => b.shape === 'ramp').every((b: any) => b.rotation === 270 && b.color === '#123456')).toBe(true);
    await expect(panel.locator('[data-arch-design-notice]')).toContainText('Added 6 blocks');
    await expect(panel.locator('[data-arch-design-warning]')).toContainText('Copies added.');
    await expect(panel.getByRole('button', { name: 'Add repeated copies', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: /Undo/ }).first().click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks)).toEqual(original);
    await page.getByRole('button', { name: /Redo/ }).first().click();
    await expect.poll(() => page.evaluate(() => (window as any).__gl()?.blockCount)).toBe(8);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('repeat layout marks real collisions and revalidates late changes without partial insertion', async ({ page }) => {
    await mount3d(page, { blocks: [{ x: 0, y: 0, z: 0, material: 'stone' }, { x: 2, y: 0, z: 0, material: 'stone' }],
      showDesign: true, designTab: 'region', designOperation: 'repeat', soundEnabled: false });
    const panel = page.locator('[data-arch-design]');
    await panel.getByLabel('Spacing X', { exact: true }).fill('1');
    await expect(panel.locator('[data-arch-design-warning]')).toContainText('2 occupied cells');
    expect(await panel.locator('[data-arch-repeat-conflict]').count()).toBeGreaterThan(0);
    await expect(panel.getByRole('button', { name: 'Add repeated copies', exact: true })).toBeDisabled();
    expect(await page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(2);
    await panel.getByLabel('Spacing X', { exact: true }).fill('3');
    await expect(panel.locator('[data-arch-design-apply]')).toBeEnabled();
    await page.evaluate(() => {
      const state = (window as any).__toolData.archStudio;
      state.blocks = state.blocks.concat({ x: 9, y: 0, z: 0, shape: 'block', material: 'stone' });
      (document.querySelector('[data-arch-design-apply]') as HTMLButtonElement).click();
    });
    await expect(panel.locator('[data-arch-design-notice]')).toContainText('occupied cells');
    expect(await page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(3);
    expect(await page.evaluate(() => (window as any).__bucket().undoStack || [])).toEqual([]);
    await page.evaluate(() => {
      const w = window as any;
      w.__toolData.archStudio = { ...w.__toolData.archStudio, showReplay: true, undoStack: [[]] };
      (document.querySelector('#arch-design-toggle') as HTMLButtonElement).click();
    });
    await page.locator('#arch-design-toggle').click();
    await expect(panel.locator('[data-arch-design-warning]')).toContainText('replay');
    await expect(panel.locator('[data-arch-design-apply]')).toBeDisabled();
  });

  test('repeat layout stacks floors and keeps preview changes separate from geometry', async ({ page }) => {
    await mount3d(page, { blocks: [{ x: 0, y: 0, z: 0, shape: 'slab', material: 'stone' }, { x: 1, y: 0, z: 0, shape: 'slab', material: 'stone' }],
      showDesign: true, designTab: 'region', designOperation: 'repeat', soundEnabled: false });
    const panel = page.locator('[data-arch-design]');
    await panel.getByLabel('New copies', { exact: true }).fill('2');
    await panel.getByRole('button', { name: 'Stack above', exact: true }).click();
    await expect(panel.getByLabel('Spacing Y', { exact: true })).toHaveValue('1');
    await expect(panel.getByLabel('Preview view', { exact: true })).toHaveValue('front');
    await expect(panel.locator('[data-arch-repeat-summary]')).toContainText('2 wide × 1 deep × 3 high');
    await panel.getByLabel('Preview view', { exact: true }).selectOption('plan');
    await expect(panel.locator('[data-arch-repeat-conflict]')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(2);
    expect(await page.evaluate(() => (window as any).__bucket().undoStack || [])).toEqual([]);
    await panel.getByLabel('New copies', { exact: true }).fill('');
    await expect(panel.locator('[data-arch-design-warning]')).toContainText('whole number from 1 to 12');
    await expect(panel.locator('[data-arch-design-apply]')).toBeDisabled();
    await panel.getByLabel('New copies', { exact: true }).fill('2');
    await panel.getByLabel('Spacing Y', { exact: true }).fill('16');
    await expect(panel.locator('[data-arch-design-warning]')).toContainText('outside');
    await panel.getByRole('button', { name: 'Stack above', exact: true }).click();
    await panel.getByRole('button', { name: 'Add repeated copies', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks.map((b: any) => b.y))).toEqual([0, 0, 1, 1, 2, 2]);
    expect(await page.evaluate(() => (window as any).__bucket().undoStack.length)).toBe(1);
  });

  test('repeat layout supports phone keyboard use and accessible contrast themes', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await mount3d(page, { blocks: [{ x: 0, y: 0, z: 0, material: 'stone' }, { x: 0, y: 1, z: 0, material: 'wood' }],
      showDesign: true, designTab: 'region', designOperation: 'repeat', soundEnabled: false });
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:810px}' });
    const panel = page.locator('[data-arch-design]');
    const stack = panel.getByRole('button', { name: 'Stack above', exact: true });
    await stack.focus();
    await page.keyboard.press('Enter');
    await expect(panel.getByLabel('Spacing Y', { exact: true })).toHaveValue('2');
    await expect(stack).toBeFocused();
    expect(await stack.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
    await panel.getByLabel('New copies', { exact: true }).focus();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('2');
    await page.keyboard.press('Tab');
    await expect(panel.getByRole('button', { name: 'Row along X', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(panel.getByLabel('Spacing X', { exact: true })).toHaveValue('2');
    await panel.locator('[data-arch-repeat-plan]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('repeat-layout-phone.png'), fullPage: true });
    const bounds = await panel.locator('[data-arch-repeat] button, [data-arch-repeat] input, [data-arch-repeat] select').evaluateAll(els => els.map(el => {
      const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, height: r.height, width: r.width };
    }));
    expect(bounds.filter(b => b.left < 0 || b.right > 320 || b.height < 44 || b.width < 44)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.setViewportSize({ width: 1280, height: 960 });
    await page.addScriptTag({ path: join(ROOT, 'node_modules/axe-core/axe.min.js') });
    for (const theme of ['theme-light', 'theme-dark', 'theme-contrast']) {
      await page.evaluate(theme => { document.documentElement.className = theme; }, theme);
      const violations = await page.evaluate(async () => {
        const result = await (window as any).axe.run(document.querySelector('#arch-studio-region'), {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
        });
        return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }));
      });
      expect(violations, theme).toEqual([]);
    }
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });



  test('workbench UI keeps coordinate disclosure accessible and makes room for the preview', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 960 });
    await mount3d(page, { blocks: tower(), showDesign: true, designTab: 'region', soundEnabled: false });
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:920px}' });
    const panel = page.locator('[data-arch-design]'), details = panel.locator('.arch-selection-coordinates');
    await page.screenshot({ path: testInfo.outputPath('workbench-overview-desktop.png'), fullPage: true });
    await expect(panel.locator('.arch-selection-summary')).toContainText('13 blocks selected');
    await expect(panel.locator('.arch-selection-dimensions')).toContainText('Width4');
    expect((await page.locator('.arch-studio-workbench').boundingBox())!.width).toBeGreaterThanOrEqual(280);
    await expect(details).not.toHaveAttribute('open');
    const summary = details.locator('summary');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(details).toHaveAttribute('open', '');
    await page.keyboard.press('Tab');
    await expect(panel.getByLabel('From X', { exact: true })).toBeFocused();
    await panel.getByLabel('To X', { exact: true }).fill('0');
    await expect(panel.locator('[data-arch-region-count]')).toHaveText('6 blocks selected');
    await summary.focus();
    await page.keyboard.press('Space');
    await expect(details).not.toHaveAttribute('open');
    await panel.getByLabel('Operation', { exact: true }).selectOption('repeat');
    await panel.getByRole('button', { name: 'Row along X', exact: true }).click();
    await expect(panel.getByRole('button', { name: 'Row along X', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(panel.getByRole('button', { name: 'Stack above', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await panel.getByLabel('Spacing X', { exact: true }).fill('4');
    await expect(panel.getByRole('button', { name: 'Row along X', exact: true })).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(13);
    expect(await page.evaluate(() => (window as any).__bucket().undoStack || [])).toEqual([]);
    await page.setViewportSize({ width: 320, height: 850 });
    await page.addStyleTag({ content: '#wrap{height:810px}' });
    await panel.getByRole('heading', { name: 'Design workbench', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('workbench-overview-phone.png'), fullPage: true });
  });


  test('grid navigation reaches distant cells and floors without editing until activation', async ({ page }) => {
    await page.goto(base + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(blocks => (window as any).__mount({ editorView: 'grid', blocks, soundEnabled: false }), tower());
    const nav = page.locator('.arch-grid-navigation');
    await expect(nav.getByLabel('Editing floor', { exact: true }).locator('option')).toHaveCount(32);
    await expect(nav.getByLabel('Editing floor', { exact: true }).locator('option[value="0"]')).toHaveText('Y=0 · 5 blocks');
    await nav.getByLabel('Editing floor', { exact: true }).selectOption('31');
    await expect(page.getByRole('button', { name: 'Next floor', exact: true })).toBeDisabled();
    await nav.locator('summary').click();
    await nav.getByLabel('Grid X', { exact: true }).fill('64');
    await nav.getByLabel('Grid Z', { exact: true }).fill('-64');
    await nav.getByLabel('Grid Z', { exact: true }).press('Enter');
    const cell = page.locator('[data-arch-cell="64,31,-64"]');
    await expect(cell).toBeFocused();
    await expect(nav.locator('[data-arch-grid-cursor]')).toHaveText('Cursor: X 64 · Y 31 · Z -64');
    expect(await page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(13);
    expect(await page.evaluate(() => (window as any).__bucket().undoStack || [])).toEqual([]);
    await cell.press('Enter');
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(14);
    expect(await page.evaluate(() => (window as any).__bucket().blocks.at(-1))).toMatchObject({ x: 64, y: 31, z: -64 });
    await expect(nav.getByLabel('Editing floor').locator('option[value="31"]')).toHaveText('Y=31 · 1 blocks');
    await page.getByRole('button', { name: /Undo/ }).first().click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(13);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('grid navigation shows a below-floor reference without painting or erasing that floor', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 960 });
    await page.goto(base + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(() => (window as any).__mount({ editorView: 'grid', editLayer: 1, blocks: [
      { x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 },
      { x: 1, y: 0, z: 0, shape: 'block', material: 'wood', color: '#92400e', rotation: 0 },
      { x: 1, y: 1, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 },
    ], soundEnabled: false }));
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:920px}' });
    await page.getByLabel('Show floor below', { exact: true }).check();
    const empty = page.locator('[data-arch-cell="0,1,0"]'), occupied = page.locator('[data-arch-cell="1,1,0"]');
    await expect(empty.locator('[data-arch-underlay]')).toBeVisible();
    await expect(empty).toHaveAccessibleName(/Empty cell.*Reference below: stone block on floor Y=0/);
    await expect(occupied.locator('[data-arch-underlay]')).toHaveCount(0);
    await empty.focus(); await empty.press('e'); await empty.press('Enter');
    expect(await page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(3);
    await empty.press('a'); await empty.press('Enter');
    expect(await page.evaluate(() => (window as any).__bucket().undoStack || [])).toEqual([]);
    await empty.press('p'); await empty.press('Enter');
    await expect(empty.locator('[data-arch-underlay]')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(4);
    expect(await page.evaluate(() => (window as any).__bucket().blocks.filter((b: any) => b.y === 0))).toHaveLength(2);
    await page.getByRole('button', { name: /Undo/ }).first().click();
    await page.getByLabel('Editing floor', { exact: true }).selectOption('1');
    await expect(empty.locator('[data-arch-underlay]')).toBeVisible();
    await page.locator('.arch-grid-navigation').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('floor-grid-reference-desktop.png'), fullPage: true });
    await page.getByLabel('Editing floor', { exact: true }).selectOption('0');
    await expect(page.getByLabel('Show floor below', { exact: true })).toBeDisabled();
    await expect(page.locator('[data-arch-underlay]')).toHaveCount(0);
  });

  test('grid navigation keeps replay references accurate and rejects incomplete coordinates', async ({ page }) => {
    await page.goto(base + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(() => (window as any).__mount({ editorView: 'grid', editLayer: 1, gridShowBelow: true,
      blocks: [{ x: 0, y: 0, z: 0, shape: 'block', material: 'stone' }],
      showReplay: true, replayStep: 0, undoStack: [[{ x: 4, y: 0, z: 0, shape: 'block', material: 'wood' }]], soundEnabled: false }));
    const nav = page.locator('.arch-grid-navigation');
    await expect(page.locator('[data-arch-cell="4,1,0"] [data-arch-underlay]')).toBeVisible();
    await expect(page.locator('[data-arch-cell="0,1,0"] [data-arch-underlay]')).toHaveCount(0);
    await nav.locator('summary').click();
    await nav.getByLabel('Grid X', { exact: true }).fill('');
    await expect(nav.getByLabel('Grid X', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(nav.getByRole('button', { name: 'Go to cell', exact: true })).toBeDisabled();
    await expect(nav.locator('#arch-grid-jump-error')).toContainText('whole-number');
    await nav.getByLabel('Grid X', { exact: true }).fill('4');
    await nav.getByLabel('Grid Z', { exact: true }).fill('0');
    await nav.getByRole('button', { name: 'Go to cell', exact: true }).click();
    const reference = page.locator('[data-arch-cell="4,1,0"]');
    await expect(reference).toBeFocused(); await reference.press('Enter');
    expect(await page.evaluate(() => (window as any).__bucket().blocks)).toHaveLength(1);
    expect(await page.evaluate(() => (window as any).__bucket().undoStack)).toHaveLength(1);
    await expect(page.getByRole('grid')).toHaveAttribute('aria-readonly', 'true');
  });

  test('grid navigation fits phones and passes accessibility checks in three appearances', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await page.goto(base + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(() => (window as any).__mount({ editorView: 'grid', editLayer: 1, gridShowBelow: true,
      blocks: [{ x: 0, y: 0, z: 0, shape: 'block', material: 'stone' }], soundEnabled: false }));
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:810px}' });
    const nav = page.locator('.arch-grid-navigation'), summary = nav.locator('summary');
    await summary.focus(); await page.keyboard.press('Enter');
    await expect(nav.locator('details')).toHaveAttribute('open', '');
    await page.keyboard.press('Tab');
    await expect(nav.getByLabel('Grid X', { exact: true })).toBeFocused();
    await nav.getByLabel('Grid X', { exact: true }).fill('-2');
    await nav.getByLabel('Grid Z', { exact: true }).fill('2');
    await nav.getByRole('button', { name: 'Go to cell', exact: true }).click();
    await expect(page.locator('[data-arch-cell="-2,1,2"]')).toBeFocused();
    await summary.focus(); await page.keyboard.press('Enter');
    await expect(nav.locator('details')).not.toHaveAttribute('open');
    await page.screenshot({ path: testInfo.outputPath('floor-grid-navigation-phone.png'), fullPage: true });
    const sizes = await nav.locator('button, select, input[type=number], summary').evaluateAll(els => els.filter(el => el.getClientRects().length).map(el => {
      const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, height: r.height };
    }));
    expect(sizes.filter(b => b.left < 0 || b.right > 320 || b.height < 44)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.setViewportSize({ width: 1280, height: 960 });
    await page.addStyleTag({ content: '#wrap{height:920px}' });
    await page.addScriptTag({ path: join(ROOT, 'node_modules/axe-core/axe.min.js') });
    for (const theme of ['theme-light', 'theme-dark', 'theme-contrast']) {
      await page.evaluate(theme => { document.documentElement.className = theme; }, theme);
      const violations = await page.evaluate(async () => {
        const result = await (window as any).axe.run(document.querySelector('#arch-studio-region'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
        return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }));
      });
      expect(violations, theme).toEqual([]);
    }
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });


  test('materials schedule opens with focus and filters quantities without editing the build', async ({ page }, testInfo) => {
    await page.goto(base + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(blocks => (window as any).__mount({ blocks, editorView: 'grid', soundEnabled: false, filterMaterial: 'stone', viewLayer: 0 }), tower());
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:920px}' });
    await page.getByRole('button', { name: 'Materials schedule', exact: true }).click();
    const panel = page.locator('#arch-schedule-panel');
    await expect(panel.getByRole('heading', { name: 'Materials schedule', exact: true })).toBeFocused();
    await expect(panel.locator('[data-arch-schedule-total=blocks]')).toHaveText('13');
    await expect(panel.locator('[data-arch-schedule-total=credits]')).toHaveText('87');
    await panel.getByLabel('Schedule scope', { exact: true }).selectOption('floor');
    await panel.getByLabel('Schedule floor', { exact: true }).selectOption('1');
    await expect(panel.locator('[data-arch-schedule-total=blocks]')).toHaveText('4');
    await expect(panel.locator('[data-arch-schedule-total=credits]')).toHaveText('32');
    await panel.getByLabel('Group quantities by', { exact: true }).selectOption('shape');
    await expect(panel.locator('caption')).toHaveText('Shape quantities · Floor Y=1');
    expect(await page.evaluate(() => ({ blocks: (window as any).__bucket().blocks.length, history: (window as any).__bucket().undoStack || [], filter: (window as any).__bucket().filterMaterial, layer: (window as any).__bucket().viewLayer, floor: (window as any).__bucket().editLayer || 0 }))).toEqual({ blocks: 13, history: [], filter: 'stone', layer: 0, floor: 0 });
    await panel.getByLabel('Schedule scope', { exact: true }).selectOption('all');
    await panel.getByLabel('Group quantities by', { exact: true }).selectOption('material');
    await page.screenshot({ path: testInfo.outputPath('materials-schedule-desktop.png'), fullPage: true });
    await panel.getByRole('heading', { name: 'Materials schedule', exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Materials schedule', exact: true })).toBeFocused();
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('materials schedule exports the selected floor and refreshes after build edits and undo', async ({ page }) => {
    await page.goto(base + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(() => (window as any).__mount({ editorView: 'grid', showBOM: true, projectName: 'Studio review', soundEnabled: false, blocks: [
      { x: 0, y: 0, z: 0, material: 'stone', shape: 'block' },
      { x: 1, y: 0, z: 0, material: 'wood', shape: 'slab' },
      { x: 0, y: 1, z: 0, material: 'glass', shape: 'block' },
      { x: 1, y: 1, z: 0, material: 'wood', shape: 'slab' }
    ] }));
    const panel = page.locator('#arch-schedule-panel');
    await panel.getByLabel('Schedule scope', { exact: true }).selectOption('floor');
    await panel.getByLabel('Schedule floor', { exact: true }).selectOption('1');
    await panel.getByLabel('Group quantities by', { exact: true }).selectOption('shape');
    const downloadEvent = page.waitForEvent('download');
    await panel.getByRole('button', { name: 'Download schedule CSV', exact: true }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe('Studio review.schedule-shape-floor-1.csv');
    const csv = await readFile((await download.path())!, 'utf8');
    expect(csv).toContain('"floor","1","shape","Block","1","50","12"');
    expect(csv).toContain('"floor","1","shape","Slab","1","50","3"');
    await panel.getByLabel('Schedule floor', { exact: true }).selectOption('31');
    await expect(panel.getByRole('button', { name: 'Download schedule CSV', exact: true })).toBeDisabled();
    await expect(panel.locator('.arch-schedule-empty')).toContainText('No blocks in this scope.');
    await panel.getByLabel('Schedule scope', { exact: true }).selectOption('all');
    await page.locator('[data-arch-cell="2,0,0"]').click();
    await expect(panel.locator('[data-arch-schedule-total=blocks]')).toHaveText('5');
    await expect(panel.locator('[data-arch-schedule-total=credits]')).toHaveText('28');
    await page.getByRole('button', { name: /Undo/ }).first().click();
    await expect(panel.locator('[data-arch-schedule-total=blocks]')).toHaveText('4');
    await expect(panel.locator('[data-arch-schedule-total=credits]')).toHaveText('23');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('materials schedule is usable during replay and preserves workspace state', async ({ page }) => {
    await page.goto(base + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(blocks => (window as any).__mount({ blocks, editorView: 'grid', showBOM: true, soundEnabled: false, showReplay: true, replayStep: 0, undoStack: [[]] }), tower());
    const panel = page.locator('#arch-schedule-panel');
    await expect(panel.locator('[data-arch-schedule-total=blocks]')).toHaveText('13');
    await expect(panel.locator('.arch-schedule-replay')).toContainText('live build');
    await expect(panel.getByRole('button', { name: 'Download schedule CSV', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Drawing desk', exact: true }).click();
    await expect(panel).toHaveCount(0);
    await page.getByRole('button', { name: 'Return to build', exact: true }).click();
    await expect(panel).toBeVisible();
    await page.getByRole('button', { name: 'Design workbench', exact: true }).click();
    await expect(panel).toHaveCount(0);
    expect(await page.evaluate(() => ({ replay: (window as any).__bucket().showReplay, step: (window as any).__bucket().replayStep, blocks: (window as any).__bucket().blocks.length, undo: (window as any).__bucket().undoStack }))).toEqual({ replay: true, step: 0, blocks: 13, undo: [[]] });
  });

  test('materials schedule fits a phone and passes accessibility checks in three appearances', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(base + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(blocks => (window as any).__mount({ blocks, editorView: 'grid', showBOM: true, soundEnabled: false }), tower());
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:860px}' });
    const panel = page.locator('#arch-schedule-panel');
    await panel.getByLabel('Schedule scope', { exact: true }).selectOption('floor');
    await panel.getByLabel('Schedule floor', { exact: true }).selectOption('0');
    await panel.getByRole('heading', { name: 'Materials schedule', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(panel.getByRole('button', { name: 'Close schedule', exact: true })).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath('materials-schedule-phone.png'), fullPage: true });
    const sizes = await panel.locator('button,select').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, height: r.height }; }));
    expect(sizes.filter(r => r.left < 0 || r.right > 320 || r.height < 44)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await panel.getByRole('button', { name: 'Download schedule CSV', exact: true }).scrollIntoViewIfNeeded();
    await expect(panel.getByRole('button', { name: 'Download schedule CSV', exact: true })).toBeInViewport();
    await page.setViewportSize({ width: 1280, height: 960 });
    await page.addStyleTag({ content: '#wrap{height:920px}' });
    await page.addScriptTag({ path: join(ROOT, 'node_modules/axe-core/axe.min.js') });
    for (const theme of ['theme-light', 'theme-dark', 'theme-contrast']) {
      await page.evaluate(theme => { document.documentElement.className = theme; }, theme);
      const violations = await page.evaluate(async () => {
        const result = await (window as any).axe.run(document.querySelector('#arch-studio-region'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
        return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }));
      });
      expect(violations, theme).toEqual([]);
    }
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });



  test('template library previews without editing and adds beside the build in one undo step', async ({ page }, testInfo) => {
    await page.goto(base + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(blocks => (window as any).__mount({ blocks, editorView: 'grid', soundEnabled: false, projectName: 'Keep name', projectNotes: 'Keep notes', filterMaterial: 'glass' }), tower());
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:920px}' });
    await page.getByRole('button', { name: 'Templates', exact: true }).click();
    const panel = page.locator('#arch-template-library');
    await expect(panel.getByRole('heading', { name: 'Template library', exact: true })).toBeFocused();
    await panel.getByLabel('Choose a template', { exact: true }).selectOption('temple');
    await panel.getByRole('button', { name: 'Floor plan', exact: true }).click();
    await panel.getByLabel('Preview floor', { exact: true }).selectOption('3');
    await expect(panel.locator('.arch-template-preview svg')).toHaveAccessibleName('Floor plan · Y=3');
    expect(await page.evaluate(() => ({ count: (window as any).__bucket().blocks.length, undo: (window as any).__bucket().undoStack || [], filter: (window as any).__bucket().filterMaterial }))).toEqual({ count: 13, undo: [], filter: 'glass' });
    await panel.getByLabel('Choose a template', { exact: true }).selectOption('cottage');
    await panel.getByRole('button', { name: 'Front elevation', exact: true }).click();
    const count = Number(await panel.locator('[data-arch-template-count]').textContent());
    await panel.getByRole('heading', { name: 'Template library', exact: true }).focus();
    await page.screenshot({ path: testInfo.outputPath('template-library-desktop.png'), fullPage: true });
    await panel.getByRole('button', { name: 'Add template to build', exact: true }).click();
    await expect(panel.locator('[data-arch-template-notice]')).toContainText('Added ' + count);
    const state = await page.evaluate(() => (window as any).__bucket());
    expect(state.blocks).toHaveLength(13 + count);
    expect(state.blocks.slice(13).every((b: any) => b.x >= 5)).toBe(true);
    expect(state).toMatchObject({ projectName: 'Keep name', projectNotes: 'Keep notes', filterMaterial: '' });
    expect(state.undoStack).toHaveLength(1);
    await page.getByRole('button', { name: /Undo/ }).first().click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(13);
    await page.getByRole('button', { name: /Redo/ }).first().click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(13 + count);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('template library rejects changed preview positions and keeps replay browsing read-only', async ({ page }) => {
    await page.goto(base + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(() => (window as any).__mount({ blocks: [{ x: 0, y: 0, z: 0, shape: 'block', material: 'stone' }], editorView: 'grid', showTemplates: true, soundEnabled: false }));
    const panel = page.locator('#arch-template-library');
    await expect(panel.getByRole('button', { name: 'Add template to build', exact: true })).toBeEnabled();
    await page.evaluate(() => {
      const w = window as any;
      w.__toolData.archStudio.blocks.push({ x: 2, y: 0, z: 0, shape: 'block', material: 'stone' });
      (document.querySelector('[data-arch-template-apply]') as HTMLButtonElement).click();
    });
    await expect(panel.locator('[data-arch-template-notice]')).toContainText('previewed position is now occupied');
    expect(await page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(2);
    expect(await page.evaluate(() => (window as any).__bucket().undoStack || [])).toEqual([]);
    await page.evaluate(() => {
      const w = window as any;
      w.__toolData.archStudio = Object.assign({}, w.__toolData.archStudio, { showReplay: true, undoStack: [[]] });
      (document.querySelector('[data-arch-template-apply]') as HTMLButtonElement).click();
    });
    await expect(panel.locator('[data-arch-template-apply]')).toBeDisabled();
    await panel.getByLabel('Choose a template', { exact: true }).selectOption('bridge');
    await panel.getByRole('button', { name: 'Floor plan', exact: true }).click();
    await expect(panel.locator('#arch-template-warning')).toContainText('browse templates during replay');
    expect(await page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(2);
    expect(await page.evaluate(() => (window as any).__bucket().undoStack)).toEqual([[]]);
  });

  test('template library explains boundaries and replaces only after the explicit action', async ({ page }) => {
    await page.goto(base + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(() => (window as any).__mount({ blocks: [{ x: 64, y: 0, z: 0, shape: 'block', material: 'stone' }], editorView: 'grid', showTemplates: true, projectName: 'Boundary study', projectNotes: 'Retain', soundEnabled: false }));
    const panel = page.locator('#arch-template-library');
    await expect(panel.locator('[data-arch-template-apply]')).toBeDisabled();
    await expect(panel.locator('#arch-template-warning')).toContainText('build area');
    await panel.getByLabel('Template placement', { exact: true }).selectOption('left');
    await expect(panel.locator('[data-arch-template-apply]')).toBeEnabled();
    await panel.getByLabel('Template placement', { exact: true }).selectOption('replace');
    expect(await page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(1);
    await expect(panel.locator('#arch-template-placement-help')).toContainText('Replace the current 1 blocks');
    const count = Number(await panel.locator('[data-arch-template-count]').textContent());
    await panel.getByRole('button', { name: 'Replace build with template', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(count);
    await expect(panel.locator('[data-arch-template-apply]')).toBeDisabled();
    expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ projectName: 'Boundary study', projectNotes: 'Retain' });
    await page.getByRole('button', { name: /Undo/ }).first().click();
    expect(await page.evaluate(() => (window as any).__bucket().blocks)).toHaveLength(1);
  });

  test('template library supports phone keyboard navigation and three accessible appearances', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(base + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(() => (window as any).__mount({ blocks: [], showTemplates: true, editorView: 'grid', soundEnabled: false }));
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:860px}' });
    const panel = page.locator('#arch-template-library');
    await panel.getByLabel('Choose a template', { exact: true }).selectOption('tower');
    await panel.getByRole('heading', { name: 'Template library', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(panel.getByRole('button', { name: 'Close template library', exact: true })).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath('template-library-phone.png'), fullPage: true });
    const sizes = await panel.locator('button,select').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, height: r.height }; }));
    expect(sizes.filter(r => r.left < 0 || r.right > 320 || r.height < 44)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await panel.locator('[data-arch-template-apply]').scrollIntoViewIfNeeded();
    await expect(panel.locator('[data-arch-template-apply]')).toBeInViewport();
    await panel.getByRole('heading', { name: 'Template library', exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Templates', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(panel).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 960 });
    await page.addStyleTag({ content: '#wrap{height:920px}' });
    await page.addScriptTag({ path: join(ROOT, 'node_modules/axe-core/axe.min.js') });
    for (const theme of ['theme-light', 'theme-dark', 'theme-contrast']) {
      await page.evaluate(theme => { document.documentElement.className = theme; }, theme);
      const violations = await page.evaluate(async () => {
        const result = await (window as any).axe.run(document.querySelector('#arch-studio-region'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
        return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }));
      });
      expect(violations, theme).toEqual([]);
    }
    await page.getByRole('button', { name: 'Materials schedule', exact: true }).click();
    await expect(panel).toHaveCount(0);
    await expect(page.locator('#arch-schedule-panel')).toBeVisible();
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });



  test('tool browser searches and filters without changing the model or history', async ({ page }, testInfo) => {
    await page.goto(base + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(blocks => (window as any).__mount({ blocks, editorView: 'grid', soundEnabled: false, undoStack: [[]], projectName: 'Studio study', filterMaterial: 'stone' }), tower());
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:920px}' });
    const before = await page.evaluate(() => JSON.stringify((window as any).__bucket()));
    const toggle = page.getByRole('button', { name: 'All tools', exact: true });
    await toggle.click();
    const browser = page.locator('#arch-tool-browser'), search = browser.getByRole('searchbox', { name: 'Search tools', exact: true });
    await expect(search).toBeFocused();
    await expect(browser.locator('[data-arch-tool]')).toHaveCount(29);
    await browser.getByLabel('Tool category', { exact: true }).selectOption('share');
    await expect(browser.locator('[data-arch-tool]')).toHaveCount(7);
    await search.fill('3d print');
    await expect(browser.locator('[data-arch-tool]')).toHaveCount(2);
    await search.fill('not-a-tool');
    await expect(browser.getByRole('status')).toHaveText('0 tools');
    await expect(browser.locator('.arch-tool-empty')).toBeVisible();
    await browser.getByRole('button', { name: 'Reset filters', exact: true }).click();
    await expect(search).toBeFocused();
    await search.fill('BOM');
    await expect(browser.getByRole('button', { name: 'Materials schedule', exact: true })).toBeVisible();
    await expect(browser.locator('[data-arch-tool]')).toHaveCount(1);
    await browser.getByRole('button', { name: 'Reset filters', exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath('tool-browser-desktop.png'), fullPage: true });
    await search.press('Escape');
    await expect(browser).toHaveCount(0);
    await expect(toggle).toBeFocused();
    const after = await page.evaluate(() => {
      const state = { ...(window as any).__bucket() };
      delete state.toolBrowserOpen; delete state.toolBrowserQuery; delete state.toolBrowserGroup;
      return JSON.stringify(state);
    });
    expect(after).toBe(before);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('tool browser opens existing panels, restores focus, and preserves active controls', async ({ page }) => {
    await page.goto(base + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(blocks => (window as any).__mount({ blocks, editorView: 'grid', soundEnabled: false }), tower());
    const toggle = page.getByRole('button', { name: 'All tools', exact: true }), browser = page.locator('#arch-tool-browser');
    await toggle.focus();
    await page.keyboard.press('Enter');
    await browser.getByRole('searchbox').fill('templates');
    await browser.getByRole('button', { name: 'Templates', exact: true }).click();
    await expect(browser).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Template library', exact: true })).toBeFocused();
    await toggle.click();
    await expect(browser.locator('[data-arch-tool=templates]')).toHaveAttribute('aria-expanded', 'true');
    await browser.getByRole('searchbox').fill('BOM');
    await browser.getByRole('button', { name: 'Materials schedule', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Materials schedule', exact: true })).toBeFocused();
    await expect(page.locator('#arch-template-library')).toHaveCount(0);
    await toggle.click();
    await browser.getByRole('searchbox').fill('sound');
    await browser.getByRole('button', { name: 'Sound effects', exact: true }).click();
    await expect(page.locator('.arch-studio-feature-strip [data-arch-tool-id=sound]')).toBeFocused();
    await toggle.click();
    await expect(browser.locator('[data-arch-tool=sound]')).toHaveAttribute('aria-pressed', 'true');
    await expect(browser.locator('[data-arch-tool=sound]')).toHaveAttribute('data-active', 'true');
    await browser.getByRole('group', { name: 'Editor style', exact: true }).getByRole('button', { name: /Bricks/ }).click();
    await expect(page.locator('.arch-studio-feature-strip [data-arch-tool-id=style-1]')).toBeFocused();
    expect(await page.evaluate(() => (window as any).__bucket().styleMode)).toBe('bricks');
    expect(await page.evaluate(() => (window as any).__bucket().undoStack || [])).toEqual([]);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('tool browser preserves export and replay actions on the existing 3D renderer', async ({ page }) => {
    await mount3d(page, { blocks: tower(), soundEnabled: false, undoStack: [[]] });
    await page.evaluate(() => { (window as any).__browserCanvas = document.querySelector('canvas[data-arch-gl]'); });
    const toggle = page.getByRole('button', { name: 'All tools', exact: true }), browser = page.locator('#arch-tool-browser');
    await toggle.click();
    await browser.getByRole('searchbox').fill('top svg');
    const downloadEvent = page.waitForEvent('download');
    await browser.getByRole('button', { name: 'Top SVG', exact: true }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toMatch(/\.svg$/);
    expect(await readFile((await download.path())!, 'utf8')).toContain('<svg');
    await expect(page.locator('.arch-studio-feature-strip [data-arch-tool-id=topsvg]')).toBeFocused();
    await toggle.click();
    await browser.getByRole('searchbox').fill('construction replay');
    await browser.getByRole('button', { name: 'Construction replay', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().showReplay)).toBe(true);
    await toggle.click();
    await expect(browser.locator('[data-arch-tool=gravity]')).toBeDisabled();
    await expect(browser.locator('[data-arch-tool=gravity]')).toContainText('Exit replay');
    await expect(browser.locator('[data-arch-tool=replay]')).toHaveAttribute('aria-pressed', 'true');
    await browser.getByRole('button', { name: 'Construction replay', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().showReplay)).toBe(false);
    expect(await page.evaluate(() => document.querySelector('canvas[data-arch-gl]') === (window as any).__browserCanvas)).toBe(true);
    expect(await page.locator('canvas[data-arch-gl]').count()).toBe(1);
    expect(await page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(13);
    expect(await page.evaluate(() => (window as any).__bucket().undoStack)).toEqual([[]]);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('tool browser explains unavailable exports and follows workspace navigation', async ({ page }) => {
    await page.goto(base + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(() => (window as any).__mount({ blocks: [], editorView: 'grid', soundEnabled: false }));
    const toggle = page.getByRole('button', { name: 'All tools', exact: true }), browser = page.locator('#arch-tool-browser');
    await toggle.click();
    for (const id of ['gravity', 'topsvg', 'sidesvg', 'printlab', 'stl']) {
      await expect(browser.locator('[data-arch-tool=' + id + ']')).toBeDisabled();
      await expect(browser.locator('[data-arch-tool=' + id + ']')).toContainText('Add blocks');
    }
    await page.getByRole('button', { name: 'Drawing desk', exact: true }).click();
    await expect(browser).toHaveCount(0);
    await expect(toggle).toHaveCount(0);
    await page.getByRole('button', { name: 'Return to build', exact: true }).click();
    await expect(browser).toBeVisible();
    await browser.getByRole('button', { name: 'Close tool browser', exact: true }).click();
    await expect(toggle).toBeFocused();
    await page.locator('[data-arch-cell="0,0,0"]').click();
    await toggle.click();
    for (const id of ['gravity', 'topsvg', 'sidesvg', 'printlab', 'stl']) await expect(browser.locator('[data-arch-tool=' + id + ']')).toBeEnabled();
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('tool browser fits a phone with keyboard navigation and three accessible appearances', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(base + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(blocks => (window as any).__mount({ blocks, editorView: 'grid', soundEnabled: false }), tower());
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:860px}' });
    const toggle = page.getByRole('button', { name: 'All tools', exact: true }), browser = page.locator('#arch-tool-browser');
    await expect(toggle).toBeInViewport();
    await toggle.click();
    const search = browser.getByRole('searchbox', { name: 'Search tools', exact: true });
    await expect(search).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(browser.getByLabel('Tool category', { exact: true })).toBeFocused();
    await browser.getByLabel('Tool category', { exact: true }).selectOption('review');
    await page.screenshot({ path: testInfo.outputPath('tool-browser-phone.png'), fullPage: true });
    const sizes = await browser.locator('button,input,select').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, height: r.height }; }));
    expect(sizes.filter(r => r.left < 0 || r.right > 320 || r.height < 44)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await browser.getByRole('button', { name: 'Construction replay', exact: true }).scrollIntoViewIfNeeded();
    await expect(browser.getByRole('button', { name: 'Construction replay', exact: true })).toBeInViewport();
    await search.focus();
    await search.press('Escape');
    await expect(toggle).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(search).toBeFocused();
    await expect(browser.getByLabel('Tool category', { exact: true })).toHaveValue('all');
    await page.setViewportSize({ width: 1280, height: 960 });
    await page.addStyleTag({ content: '#wrap{height:920px}' });
    await page.addScriptTag({ path: join(ROOT, 'node_modules/axe-core/axe.min.js') });
    for (const theme of ['theme-light', 'theme-dark', 'theme-contrast']) {
      await page.evaluate(theme => { document.documentElement.className = theme; }, theme);
      const violations = await page.evaluate(async () => {
        const result = await (window as any).axe.run(document.querySelector('#arch-studio-region'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
        return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }));
      });
      expect(violations, theme).toEqual([]);
    }
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });



  test('workspace controls expand the model without remounting it or changing the build', async ({ page }, testInfo) => {
    await mount3d(page, { blocks: tower(), soundEnabled: false, selectedBlockKey: '0,0,0', undoStack: [[]], rot3d: { rotX: 25, rotY: -35, scale: 1.2 } });
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:920px}' });
    const sidebar = page.locator('#arch-studio-tools'), stage = page.locator('[data-arch-stage=true]');
    const before = await page.evaluate(() => {
      const w = window as any;
      w.__workspaceCanvas = document.querySelector('canvas[data-arch-gl]');
      w.__workspaceSidebar = document.getElementById('arch-studio-tools');
      return { blocks: w.__bucket().blocks, history: w.__bucket().undoStack, selected: w.__bucket().selectedBlockKey, camera: w.__bucket().rot3d };
    });
    const originalWidth = (await stage.boundingBox())!.width;
    await page.getByRole('button', { name: 'Hide tools', exact: true }).click();
    await expect(sidebar).toBeHidden();
    await expect(page.getByRole('button', { name: 'Show tools', exact: true })).toBeFocused();
    await expect.poll(async () => (await stage.boundingBox())!.width).toBeGreaterThan(originalWidth + 100);
    await page.screenshot({ path: testInfo.outputPath('workspace-model-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: 'Show tools', exact: true }).click();
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(sidebar.getByRole('button', { name: 'Place mode', exact: true })).toBeFocused();
    const after = await page.evaluate(() => {
      const w = window as any;
      return { blocks: w.__bucket().blocks, history: w.__bucket().undoStack, selected: w.__bucket().selectedBlockKey, camera: w.__bucket().rot3d };
    });
    expect(after).toEqual(before);
    expect(await page.evaluate(() => document.querySelector('canvas[data-arch-gl]') === (window as any).__workspaceCanvas && document.getElementById('arch-studio-tools') === (window as any).__workspaceSidebar)).toBe(true);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('workspace controls keep the palette summary current and camera controls outside the model', async ({ page }, testInfo) => {
    await mount3d(page, { blocks: tower(), soundEnabled: false });
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:920px}' });
    await page.getByRole('button', { name: 'Ramp shape', exact: true }).click();
    await page.getByRole('button', { name: 'Use Glass material', exact: true }).click();
    await page.getByRole('button', { name: 'Use 90° rotation', exact: true }).click();
    await page.getByRole('button', { name: 'Use custom color #06b6d4', exact: true }).click();
    const summary = page.getByRole('group', { name: 'Current building tool', exact: true });
    await expect(summary).toContainText('Ramp');
    await expect(summary).toContainText('Glass');
    await expect(summary).toContainText('Rotation 90°');
    await expect(summary).toContainText('Color #06B6D4');
    await page.getByRole('button', { name: 'Paint mode', exact: true }).click();
    await expect(summary).toContainText('Paint material and color.');
    await expect(summary).not.toContainText('Rotation');
    await expect(summary).not.toContainText('Ramp');
    await page.getByRole('button', { name: 'Erase mode', exact: true }).click();
    await expect(summary).toContainText('Remove the block you choose.');
    await page.getByRole('button', { name: 'Pick mode', exact: true }).click();
    await expect(summary).toContainText('Copy a block’s properties');
    await page.getByRole('button', { name: 'Place mode', exact: true }).click();
    await expect(summary).toContainText('Rotation 90°');
    await page.getByRole('button', { name: 'Hide tools', exact: true }).click();
    const bar = page.locator('.arch-workspace-bar'), stage = page.locator('[data-arch-stage=true]'), camera = page.locator('.arch-studio-camera-controls');
    const [barBox, stageBox, cameraBox] = await Promise.all([bar.boundingBox(), stage.boundingBox(), camera.boundingBox()]);
    expect(barBox!.y + barBox!.height).toBeLessThanOrEqual(stageBox!.y + 1);
    expect(cameraBox!.y).toBeGreaterThanOrEqual(stageBox!.y + stageBox!.height - 1);
    const initial = await page.evaluate(() => (window as any).__bucket().rot3d || {});
    await camera.getByRole('button', { name: 'Rotate view right', exact: true }).click();
    await camera.getByRole('button', { name: 'Zoom in', exact: true }).click();
    expect(await page.evaluate(() => (window as any).__bucket().rot3d)).not.toEqual(initial);
    await camera.getByRole('button', { name: 'Reset three-dimensional view', exact: true }).click();
    expect(await page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(13);
    expect(await page.evaluate(() => (window as any).__bucket().undoStack || [])).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('workspace-palette-desktop.png'), fullPage: true });
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('workspace controls reveal sidebar tools when opened from navigation or All tools', async ({ page }) => {
    await page.goto(base + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(blocks => (window as any).__mount({ blocks, editorView: 'grid', soundEnabled: false, sidebarCollapsed: true }), tower());
    const sidebar = page.locator('#arch-studio-tools');
    await page.getByRole('button', { name: 'Templates', exact: true }).click();
    await expect(sidebar).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Template library', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Hide tools', exact: true }).click();
    await page.getByRole('button', { name: 'All tools', exact: true }).click();
    await page.locator('#arch-tool-browser').getByRole('searchbox').fill('BOM');
    await page.locator('#arch-tool-browser').getByRole('button', { name: 'Materials schedule', exact: true }).click();
    await expect(sidebar).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Materials schedule', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Hide tools', exact: true }).click();
    await page.getByRole('button', { name: 'Design workbench', exact: true }).click();
    await expect(sidebar).toBeVisible();
    await expect(page.locator('#arch-design-panel')).toBeVisible();
    await page.getByRole('button', { name: 'Hide tools', exact: true }).click();
    await page.getByRole('button', { name: 'Project & revisions', exact: true }).click();
    await expect(sidebar).toBeVisible();
    await expect(page.locator('#arch-project-panel')).toBeVisible();
    await page.getByRole('button', { name: 'Hide tools', exact: true }).click();
    await page.locator('.arch-studio-feature-strip [data-arch-tool-id=gallery]').click();
    await expect(sidebar).toBeVisible();
    expect(await page.evaluate(() => (window as any).__bucket().showGallery)).toBe(true);
    expect(await page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(13);
    expect(await page.evaluate(() => (window as any).__bucket().undoStack || [])).toEqual([]);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('workspace controls preserve keyboard floor editing, undo, and replay guidance', async ({ page }) => {
    await page.goto(base + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.archStudio);
    await page.evaluate(() => (window as any).__mount({ blocks: [], editorView: 'grid', soundEnabled: false, sidebarCollapsed: true }));
    const cell = page.locator('[data-arch-cell="0,0,0"]');
    await cell.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(1);
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-arch-cell="1,0,0"]')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(2);
    await page.getByRole('button', { name: /Undo/ }).first().click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(1);
    await expect(page.locator('#arch-studio-tools')).toBeHidden();
    await page.locator('.arch-studio-feature-strip [data-arch-tool-id=replay]').click();
    await expect(page.getByRole('group', { name: 'Current building tool', exact: true })).toContainText('Read-only replay');
    await expect(page.getByRole('group', { name: 'Current building tool', exact: true })).not.toContainText('Place Mode');
    await expect(page.locator('#arch-studio-tools')).toBeVisible();
    await page.getByRole('button', { name: 'Drawing desk', exact: true }).click();
    await expect(page.locator('.arch-workspace-bar')).toHaveCount(0);
    await page.getByRole('button', { name: 'Return to build', exact: true }).click();
    await expect(page.locator('#arch-studio-tools')).toBeVisible();
    await expect(page.getByRole('group', { name: 'Current building tool', exact: true })).toContainText('Read-only replay');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('workspace controls fit a phone and pass accessible expanded and collapsed states', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await mount3d(page, { blocks: tower(), soundEnabled: false, activeShape: 'arch', activeMaterial: 'brick', activeColor: '#b45309' });
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:860px}' });
    await page.getByRole('button', { name: 'Hide tools', exact: true }).click();
    const camera = page.locator('.arch-studio-camera-controls');
    await camera.getByRole('button', { name: 'Reset three-dimensional view', exact: true }).scrollIntoViewIfNeeded();
    const sizes = await page.locator('.arch-workspace-bar button,.arch-studio-camera-controls button').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, height: r.height }; }));
    expect(sizes.filter(r => r.left < 0 || r.right > 320 || r.width < 44 || r.height < 44)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await camera.getByRole('button', { name: 'Rotate view left', exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath('workspace-model-phone.png'), fullPage: true });
    await page.getByRole('button', { name: 'Show tools', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#arch-studio-tools')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Place mode', exact: true })).toBeFocused();
    await page.setViewportSize({ width: 1280, height: 960 });
    await page.addStyleTag({ content: '#wrap{height:920px}' });
    await page.addScriptTag({ path: join(ROOT, 'node_modules/axe-core/axe.min.js') });
    for (const theme of ['theme-light', 'theme-dark', 'theme-contrast']) {
      await page.evaluate(theme => { document.documentElement.className = theme; }, theme);
      for (const collapsed of [true, false]) {
        await page.getByRole('button', { name: collapsed ? 'Hide tools' : 'Show tools', exact: true }).click();
        const violations = await page.evaluate(async () => {
          const result = await (window as any).axe.run(document.querySelector('#arch-studio-region'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
          return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }));
        });
        expect(violations, theme + ' collapsed=' + collapsed).toEqual([]);
      }
    }
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });



  test('workspace controls keep long review panels clear of the camera row', async ({ page }, testInfo) => {
    await mount3d(page, { blocks: tower(), sidebarCollapsed: true, soundEnabled: false, showAnalysis: true, showAI: true,
      aiAdvice: Array.from({ length: 16 }, (_, i) => 'Design observation ' + (i + 1) + ': use a continuous load path and inspect the supports beneath each floor.').join('\n\n') });
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:920px}' });
    await page.evaluate(() => {
      const w = window as any;
      w.__toolData.archStudio.aiAdviceBuildSignature = w.__alloArchBuildSignature(w.__bucket().blocks);
      (document.querySelector('[data-arch-camera="reset"]') as HTMLButtonElement).click();
    });
    const panels = page.locator('.arch-studio-floating-panel');
    await expect(panels).toHaveCount(2);
    await expect(panels.filter({ hasText: 'Design observation 16' })).toHaveCount(1);
    async function checkClearance() {
      const cameraBox = (await page.locator('.arch-studio-camera-controls').boundingBox())!;
      const boxes = await panels.evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { bottom: r.bottom, top: r.top }; }));
      for (const box of boxes) expect(box.bottom).toBeLessThanOrEqual(cameraBox.y + 1);
    }
    await checkClearance();
    await page.locator('.arch-studio-feature-strip [data-arch-tool-id=heatmap]').click();
    await expect(page.locator('[data-arch-view-hud]')).toBeVisible();
    await checkClearance();
    await page.locator('[data-arch-view-chip=heatmap]').click();
    await page.locator('.arch-studio-camera-controls').getByRole('button', { name: 'Zoom in', exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath('workspace-review-desktop.png'), fullPage: true });
    await page.addStyleTag({ content: '#wrap{height:620px}' });
    const viewportBox = (await page.locator('.arch-studio-viewport').boundingBox())!;
    const cameraBox = (await page.locator('.arch-studio-camera-controls').boundingBox())!;
    const statsBox = (await page.locator('[data-arch-stats]').boundingBox())!;
    expect(cameraBox.y + cameraBox.height).toBeLessThanOrEqual(viewportBox.y + viewportBox.height + 1);
    expect(statsBox.y + statsBox.height).toBeLessThanOrEqual(viewportBox.y + viewportBox.height + 1);
    await page.locator('.arch-studio-camera-controls').getByRole('button', { name: 'Reset three-dimensional view', exact: true }).click();
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });


  test('palette keeps material, custom color, and paint controls synchronized without editing the model', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await mount3d(page, { blocks: tower(), soundEnabled: false, customColor: '#ff0000', activeColor: '#94a3b8', showColorPicker: true, budgetEnabled: true });
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:960px}' });
    const before = await page.evaluate(() => ({ blocks: (window as any).__bucket().blocks, history: (window as any).__bucket().undoStack }));
    await page.evaluate(() => { (window as any).__paletteCanvas = document.querySelector('canvas[data-arch-gl]'); });
    const native = page.getByLabel('Custom color', { exact: true });
    await expect(native).toHaveValue('#94a3b8');
    await page.getByRole('button', { name: 'Use Wood material', exact: true }).click();
    await expect(native).toHaveValue('#92400e');
    await page.getByRole('button', { name: 'Use custom color #06b6d4', exact: true }).click();
    await expect(native).toHaveValue('#06b6d4');
    await native.fill('#123456');
    await expect(page.locator('[data-arch-palette-color]')).toHaveText('#123456');
    await page.getByRole('button', { name: 'Use material color', exact: true }).click();
    await expect(native).toHaveValue('#92400e');
    await page.getByRole('button', { name: 'Use Glass material', exact: true }).click();
    await expect(native).toHaveValue('#38bdf8');
    await page.getByRole('button', { name: 'Paint with this color', exact: true }).click();
    expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ mode: 'paint', activeMaterial: 'glass', activeColor: '#38bdf8' });
    expect(await page.evaluate(() => ({ blocks: (window as any).__bucket().blocks, history: (window as any).__bucket().undoStack }))).toEqual(before);
    expect(await page.evaluate(() => (window as any).__paletteCanvas === document.querySelector('canvas[data-arch-gl]'))).toBe(true);
    await page.getByRole('button', { name: 'Fewer colors', exact: true }).click();
    await expect(native).toBeHidden();
    await expect(page.locator('[data-arch-palette-color]')).toHaveText('#38BDF8');
    await page.getByRole('button', { name: 'More colors', exact: true }).click();
    await expect(native).toHaveValue('#38bdf8');
    await page.locator('.arch-material-choice').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('palette-materials-desktop.png'), fullPage: true });
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('palette choices place, paint, pick, and undo with the same properties', async ({ page }) => {
    await mount3d(page, { blocks: [], soundEnabled: false });
    await page.getByRole('button', { name: 'Ramp shape', exact: true }).click();
    await page.getByRole('button', { name: 'Use Wood material', exact: true }).click();
    await page.getByRole('button', { name: 'Use 90° rotation', exact: true }).click();
    await page.getByRole('button', { name: 'Use custom color #06b6d4', exact: true }).click();
    await page.getByRole('button', { name: 'Floor Grid', exact: true }).click();
    const cell = page.locator('button[data-arch-cell="0,0,0"]');
    await cell.focus(); await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().blocks)).toMatchObject([{ x: 0, y: 0, z: 0, shape: 'ramp', material: 'wood', color: '#06b6d4', rotation: 90 }]);
    await page.getByRole('button', { name: 'Use Glass material', exact: true }).click();
    await page.getByRole('button', { name: 'More colors', exact: true }).click();
    await page.getByRole('button', { name: 'Paint with this color', exact: true }).click();
    await cell.focus(); await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (window as any).__bucket().blocks[0])).toMatchObject({ shape: 'ramp', material: 'glass', color: '#38bdf8', rotation: 90 });
    await page.getByRole('button', { name: /Undo/ }).first().click();
    expect(await page.evaluate(() => (window as any).__bucket().blocks[0])).toMatchObject({ material: 'wood', color: '#06b6d4' });
    await page.getByRole('button', { name: 'Pick mode', exact: true }).click();
    await cell.focus(); await page.keyboard.press('Enter');
    await expect(page.getByLabel('Custom color', { exact: true })).toHaveValue('#06b6d4');
    expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ activeShape: 'ramp', activeMaterial: 'wood', activeColor: '#06b6d4', activeRotation: 90, mode: 'place' });
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('palette color navigation reveals the hidden sidebar and respects replay', async ({ page }) => {
    await mount3d(page, { blocks: tower(), soundEnabled: false, sidebarCollapsed: true, showReplay: true, undoStack: [[]], replayStep: 1 });
    await page.locator('.arch-studio-feature-strip [data-arch-tool-id=colors]').click();
    await expect(page.locator('#arch-studio-tools')).toBeVisible();
    await expect(page.locator('#arch-color-options')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Custom color', { exact: true })).toBeFocused();
    await page.getByLabel('Custom color', { exact: true }).fill('#123456');
    await expect(page.getByRole('button', { name: 'Paint with this color', exact: true })).toBeDisabled();
    expect(await page.evaluate(() => (window as any).__bucket().blocks)).toEqual(tower());
    await page.locator('#arch-color-toggle').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#arch-color-toggle')).toBeFocused();
    await expect(page.locator('#arch-color-options')).toBeHidden();
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('palette fits phone touch targets and remains accessible in three themes', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await mount3d(page, { blocks: tower(), soundEnabled: false, activeShape: 'arch', activeMaterial: 'wood', activeColor: '#ef4444', budgetEnabled: true });
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:860px}' });
    await page.getByRole('button', { name: 'Roof shape', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Roof shape', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: testInfo.outputPath('palette-shapes-phone.png'), fullPage: true });
    await page.getByRole('button', { name: 'More colors', exact: true }).click();
    await page.getByRole('button', { name: 'Use custom color #f8fafc', exact: true }).click();
    await page.getByRole('button', { name: 'Paint with this color', exact: true }).click();
    const sizes = await page.locator('.arch-shape-choice,.arch-material-choice,.arch-color-card button,.arch-color-native input,[aria-labelledby=arch-rotation-heading] button,[aria-labelledby=arch-mode-heading] button').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, height: r.height }; }));
    expect(sizes.filter(r => r.left < 0 || r.right > 320 || r.width < 44 || r.height < 44)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByLabel('Custom color', { exact: true }).scrollIntoViewIfNeeded();
    expect(await page.getByLabel('Custom color', { exact: true }).evaluate(el => { const r = el.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el; })).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('palette-colors-phone.png'), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 1100 });
    await page.addStyleTag({ content: '#wrap{height:1060px}' });
    await page.addScriptTag({ path: join(ROOT, 'node_modules/axe-core/axe.min.js') });
    for (const theme of ['theme-light', 'theme-dark', 'theme-contrast']) {
      await page.evaluate(theme => { document.documentElement.className = theme; }, theme);
      const violations = await page.evaluate(async () => {
        const result = await (window as any).axe.run(document.querySelector('#arch-studio-region'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
        return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }));
      });
      expect(violations, theme).toEqual([]);
    }
    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
    await page.getByRole('button', { name: 'Use custom color #ef4444', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Use custom color #ef4444', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('replay timeline compares retained steps without changing the live model or renderer', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 1050 });
    const a = { x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 };
    const b = { ...a, x: 1, material: 'wood', color: '#92400e' };
    const c = { ...a, x: 2, material: 'glass', color: '#38bdf8' };
    const live = [{ ...a, color: '#ef4444' }, c], history = [[], [a], { kind: 'arch-project-frame', blocks: [a, b], projectName: 'Before', projectNotes: 'Saved notes' }];
    await mount3d(page, { blocks: live, undoStack: history, redoStack: [[b]], projectName: 'Current', projectNotes: 'Live notes', sidebarCollapsed: true, soundEnabled: false });
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:1010px}' });
    const before = await page.evaluate(() => { const w = window as any; w.__replayCanvas = document.querySelector('canvas[data-arch-gl]'); return { blocks: w.__bucket().blocks, undo: w.__bucket().undoStack, redo: w.__bucket().redoStack, name: w.__bucket().projectName, notes: w.__bucket().projectNotes }; });
    await page.locator('.arch-studio-feature-strip [data-arch-tool-id=replay]').click();
    const panel = page.locator('#arch-replay-panel'), slider = panel.getByRole('slider');
    await expect(panel).toBeVisible();
    await expect(panel.locator('#arch-replay-heading')).toBeFocused();
    await expect(panel.locator('[data-arch-replay-position]')).toHaveText('Step 1 of 4');
    await expect(panel.locator('[data-arch-replay-count]')).toHaveText('0 blocks at this step');
    await expect(panel.getByRole('button', { name: 'Replay first construction step', exact: true })).toBeDisabled();
    await panel.getByRole('button', { name: 'Replay next construction step', exact: true }).click();
    await expect(panel.locator('[data-arch-replay-delta=added] dd')).toHaveText('1');
    await expect.poll(() => page.evaluate(() => (window as any).__gl().blockCount)).toBe(1);
    await slider.focus(); await page.keyboard.press('End');
    await expect(slider).toHaveAttribute('aria-valuetext', 'Step 4 of 4; 2 blocks; read-only');
    for (const key of ['added', 'removed', 'changed']) await expect(panel.locator('[data-arch-replay-delta=' + key + '] dd')).toHaveText('1');
    await expect(panel.locator('[data-arch-replay-note]')).toHaveText('Teaching credit change: +9');
    await expect(panel.getByRole('button', { name: 'Replay final construction step', exact: true })).toBeDisabled();
    await expect.poll(() => page.evaluate(() => (window as any).__gl().blockCount)).toBe(2);
    expect(await page.evaluate(() => { const w = window as any; return { blocks: w.__bucket().blocks, undo: w.__bucket().undoStack, redo: w.__bucket().redoStack, name: w.__bucket().projectName, notes: w.__bucket().projectNotes }; })).toEqual(before);
    expect(await page.evaluate(() => (window as any).__replayCanvas === document.querySelector('canvas[data-arch-gl]'))).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('replay-desktop.png'), fullPage: true });
    await panel.getByRole('button', { name: 'Return to live build', exact: true }).click();
    await expect(panel).toHaveCount(0);
    await expect(page.locator('.arch-studio-feature-strip [data-arch-tool-id=replay]')).toBeFocused();
    expect(await page.evaluate(() => (window as any).__bucket().showReplay)).toBe(false);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('replay timeline counts hidden cells and keeps grid editing read-only', async ({ page }) => {
    const blocks = [
      { x: 0, y: 0, z: -1, shape: 'block', material: 'wood', color: '#92400e', rotation: 0 },
      { x: 1, y: 1, z: -1, shape: 'ramp', material: 'stone', color: '#94a3b8', rotation: 90 }];
    await mount3d(page, { blocks, undoStack: [[], [blocks[0]]], showReplay: true, replayStep: 2, filterMaterial: 'glass', viewLayer: 31, soundEnabled: false });
    const panel = page.locator('#arch-replay-panel');
    await expect(panel.locator('[data-arch-replay-count]')).toHaveText('2 blocks at this step');
    await expect(panel.locator('[data-arch-replay-delta=added] dd')).toHaveText('1');
    await expect.poll(() => page.evaluate(() => (window as any).__gl().blockCount)).toBe(0);
    await panel.locator('summary').click();
    await expect(panel.locator('.arch-replay-scope')).toContainText('including those hidden by 3D filters');
    await page.getByRole('button', { name: 'Floor Grid', exact: true }).click();
    const cell = page.locator('[data-arch-cell="0,0,-1"]');
    await cell.focus(); await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (window as any).__bucket().blocks)).toEqual(blocks);
    await expect(page.getByRole('grid')).toHaveAttribute('aria-readonly', 'true');
    await panel.getByRole('slider').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
    await expect(panel.locator('[data-arch-replay-position]')).toHaveText('Step 2 of 3');
    await expect(panel.locator('[data-arch-replay-count]')).toHaveText('1 block at this step');
    expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ filterMaterial: 'glass', viewLayer: 31, editorView: 'grid', blocks });
    await panel.getByRole('slider').press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(page.getByRole('grid')).toHaveAttribute('aria-readonly', 'false');
    await expect(page.locator('.arch-studio-feature-strip [data-arch-tool-id=replay]')).toBeFocused();
    expect(await page.evaluate(() => (window as any).__bucket().blocks)).toEqual(blocks);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('replay timeline opens from All tools and preserves its state across workspaces', async ({ page }) => {
    await mount3d(page, { blocks: tower(), undoStack: [[], tower().slice(0, 3)], soundEnabled: false, sidebarCollapsed: true });
    await page.getByRole('button', { name: 'All tools', exact: true }).click();
    await page.locator('#arch-tool-browser').getByRole('searchbox').fill('construction replay');
    await page.locator('#arch-tool-browser').getByRole('button', { name: 'Construction replay', exact: true }).click();
    await expect(page.locator('#arch-replay-heading')).toBeFocused();
    const slider = page.locator('#arch-replay-panel').getByRole('slider');
    await slider.focus(); await page.keyboard.press('ArrowRight');
    await page.getByRole('button', { name: 'Drawing desk', exact: true }).click();
    await expect(page.locator('#arch-replay-panel')).toHaveCount(0);
    await page.getByRole('button', { name: 'Return to build', exact: true }).click();
    await expect(page.locator('[data-arch-replay-position]')).toHaveText('Step 2 of 3');
    await page.getByRole('button', { name: 'Hide tools', exact: true }).click();
    await expect(page.locator('#arch-replay-panel')).toBeHidden();
    await page.getByRole('button', { name: 'Show tools', exact: true }).click();
    await expect(page.locator('[data-arch-replay-position]')).toHaveText('Step 2 of 3');
    await slider.focus(); await page.keyboard.press('Escape');
    await expect(page.locator('#arch-replay-panel')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__bucket().undoStack)).toEqual([[], tower().slice(0, 3)]);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('replay timeline has reachable phone controls and accessible themes', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 960 });
    await mount3d(page, { blocks: tower(), undoStack: [[], tower().slice(0, 3), tower().slice(0, 7)], soundEnabled: false });
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:920px}' });
    await page.locator('.arch-studio-feature-strip [data-arch-tool-id=replay]').click();
    const panel = page.locator('#arch-replay-panel');
    const controls = panel.locator('button,input,summary');
    const dimensions = await controls.evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height, left: r.left, right: r.right }; }));
    expect(dimensions.filter(r => r.width < 44 || r.height < 44 || r.left < 0 || r.right > 320)).toEqual([]);
    await panel.getByRole('slider').focus(); await page.keyboard.press('End');
    await expect(panel.locator('[data-arch-replay-position]')).toHaveText('Step 4 of 4');
    await panel.getByRole('button', { name: 'Replay previous construction step', exact: true }).click();
    await expect(panel.locator('[data-arch-replay-position]')).toHaveText('Step 3 of 4');
    await panel.getByRole('button', { name: 'Return to live build', exact: true }).scrollIntoViewIfNeeded();
    expect(await panel.getByRole('button', { name: 'Return to live build', exact: true }).evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('replay-phone.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.setViewportSize({ width: 1280, height: 1100 });
    await page.addStyleTag({ content: '#wrap{height:1060px}' });
    await panel.locator('summary').click();
    await page.addScriptTag({ path: join(ROOT, 'node_modules/axe-core/axe.min.js') });
    for (const theme of ['theme-light', 'theme-dark', 'theme-contrast']) {
      await page.evaluate(theme => { document.documentElement.className = theme; }, theme);
      const violations = await page.evaluate(async () => {
        const result = await (window as any).axe.run(document.querySelector('#arch-studio-region'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
        return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }));
      });
      expect(violations, theme).toEqual([]);
    }
    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
    await panel.getByRole('slider').focus(); await page.keyboard.press('Home');
    await expect(panel.locator('[data-arch-replay-position]')).toHaveText('Step 1 of 4');
    await panel.getByRole('button', { name: 'Return to live build', exact: true }).click();
    await expect(page.locator('.arch-studio-feature-strip [data-arch-tool-id=replay]')).toBeFocused();
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('block filter panel reveals matching geometry and preserves authoring state', async ({ page }, testInfo) => {
    const blocks = [
      { x: 0, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 },
      { x: 1, y: 0, z: 0, shape: 'block', material: 'wood', color: '#92400e', rotation: 0 },
      { x: 2, y: 1, z: -1, shape: 'ramp', material: 'wood', color: '#92400e', rotation: 90 },
      { x: 3, y: 0, z: 0, shape: 'ramp', material: 'glass', color: '#38bdf8', rotation: 0 }];
    await page.setViewportSize({ width: 1280, height: 1100 });
    await mount3d(page, { blocks, undoStack: [[]], redoStack: [[blocks[0]]], projectName: 'Filter study', projectNotes: 'Keep notes', soundEnabled: false, sidebarCollapsed: true, viewLayer: 0 });
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:1060px}' });
    const before = await page.evaluate(() => { const w = window as any; w.__filterCanvas = document.querySelector('canvas[data-arch-gl]'); return { blocks: w.__bucket().blocks, undo: w.__bucket().undoStack, redo: w.__bucket().redoStack, name: w.__bucket().projectName, notes: w.__bucket().projectNotes }; });
    await page.locator('.arch-studio-feature-strip [data-arch-tool-id=filter]').click();
    const panel = page.locator('#arch-filter-panel');
    await expect(page.locator('#arch-filter-heading')).toBeFocused();
    await panel.getByRole('button', { name: 'Filter by Wood material', exact: true }).click();
    await expect(panel.locator('[data-arch-filter-result]')).toHaveText('2 of 4 blocks match');
    await expect(panel.locator('[data-arch-filter-visible]')).toHaveText('1 visible in 3D');
    await panel.getByRole('button', { name: 'Filter by Ramp shape', exact: true }).click();
    await expect(panel.locator('[data-arch-filter-result]')).toHaveText('1 matching block out of 4');
    await expect.poll(() => page.evaluate(() => (window as any).__gl().blockCount)).toBe(0);
    await panel.getByRole('button', { name: 'Reveal matches across floors and sections', exact: true }).click();
    await expect(page.locator('#arch-filter-heading')).toBeFocused();
    await expect.poll(() => page.evaluate(() => (window as any).__gl().blockCount)).toBe(1);
    expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ filterMaterial: 'wood', filterShape: 'ramp', viewLayer: -1, showSlice: false });
    await panel.getByRole('button', { name: 'Filter by Stone material', exact: true }).click();
    await expect(panel.locator('.arch-filter-empty')).toContainText('No blocks match.');
    await panel.getByRole('button', { name: 'Clear block filters', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__gl().blockCount)).toBe(4);
    await panel.getByRole('button', { name: 'Filter by Wood material', exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath('filters-desktop.png'), fullPage: true });
    await panel.getByRole('button', { name: 'Close block filters', exact: true }).click();
    await expect(page.locator('.arch-studio-feature-strip [data-arch-tool-id=filter]')).toBeFocused();
    expect(await page.evaluate(() => (window as any).__bucket().filterMaterial)).toBe('wood');
    expect(await page.evaluate(() => { const w = window as any; return { blocks: w.__bucket().blocks, undo: w.__bucket().undoStack, redo: w.__bucket().redoStack, name: w.__bucket().projectName, notes: w.__bucket().projectNotes }; })).toEqual(before);
    expect(await page.evaluate(() => (window as any).__filterCanvas === document.querySelector('canvas[data-arch-gl]'))).toBe(true);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('block filter panel opens from All tools and follows replay without altering the editing floor', async ({ page }) => {
    const blocks = tower(), history = [[], blocks.slice(0, 3)];
    await mount3d(page, { blocks, undoStack: history, soundEnabled: false, showReplay: true, replayStep: 1, sidebarCollapsed: true, filterMaterial: 'stone', viewLayer: 0 });
    await page.getByRole('button', { name: 'All tools', exact: true }).click();
    await page.locator('#arch-tool-browser').getByRole('searchbox').fill('material filter');
    await page.locator('#arch-tool-browser [data-arch-tool=filter]').click();
    const panel = page.locator('#arch-filter-panel');
    await expect(page.locator('#arch-filter-heading')).toBeFocused();
    await expect(panel.locator('.arch-filter-scope')).toHaveText('Replay step 2 of 3');
    await expect(panel.locator('[data-arch-filter-result]')).toHaveText('3 of 3 blocks match');
    await panel.locator('summary').click();
    await expect(panel.locator('.arch-filter-remove')).toBeDisabled();
    await page.locator('#arch-replay-panel').getByRole('slider').focus(); await page.keyboard.press('Home');
    await expect(panel.locator('.arch-filter-empty')).toContainText('This replay step has no blocks.');
    await page.keyboard.press('End');
    await expect(panel.locator('[data-arch-filter-result]')).toHaveText('4 of 13 blocks match');
    await page.getByRole('button', { name: 'Floor Grid', exact: true }).click();
    await panel.getByRole('button', { name: 'Filter by Glass material', exact: true }).click();
    await expect(panel.locator('.arch-filter-grid-note')).toContainText('full editing floor');
    await expect(page.locator('[data-arch-cell="0,0,0"]')).toHaveAttribute('aria-label', /stone/);
    await panel.getByRole('button', { name: 'Clear block filters', exact: true }).click();
    expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ viewLayer: 0, showReplay: true, replayStep: 2, blocks, undoStack: history });
    await panel.getByRole('button', { name: 'Show all materials', exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(page.locator('.arch-studio-feature-strip [data-arch-tool-id=filter]')).toBeFocused();
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('block filter panel bulk removal includes hidden floors and remains undoable', async ({ page }) => {
    const blocks = tower().map(b => ({ ...b, color: ({ stone: '#94a3b8', brick: '#b45309', wood: '#92400e' } as any)[b.material], rotation: 0 }));
    await mount3d(page, { blocks, undoStack: [], redoStack: [], showFilter: true, filterMaterial: 'brick', viewLayer: 0, soundEnabled: false });
    const panel = page.locator('#arch-filter-panel');
    await expect(panel.locator('[data-arch-filter-result]')).toHaveText('8 of 13 blocks match');
    await expect(panel.locator('[data-arch-filter-visible]')).toHaveText('0 visible in 3D');
    await panel.locator('summary').click();
    await expect(panel.locator('#arch-filter-remove-help')).toContainText('across all floors and sections');
    await panel.getByRole('button', { name: 'Remove 8 matching blocks', exact: true }).click();
    expect(await page.evaluate(() => (window as any).__bucket().blocks.length)).toBe(5);
    expect(await page.evaluate(() => (window as any).__bucket().undoStack)).toEqual([blocks]);
    await expect(panel.locator('.arch-filter-remove')).toBeDisabled();
    await page.getByRole('button', { name: /Undo/ }).first().click();
    expect(await page.evaluate(() => (window as any).__bucket().blocks)).toEqual(blocks);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('block filter panel has reachable phone targets and accessible themes', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 960 });
    await mount3d(page, { blocks: tower(), soundEnabled: false });
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:920px}' });
    await page.locator('.arch-studio-feature-strip [data-arch-tool-id=filter]').click();
    const panel = page.locator('#arch-filter-panel');
    await panel.getByRole('button', { name: 'Filter by Brick material', exact: true }).click();
    const sizes = await panel.locator('button,summary').evaluateAll(els => els.filter(el => el.getClientRects().length).map(el => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height, left: r.left, right: r.right }; }));
    expect(sizes.filter(r => r.width < 44 || r.height < 44 || r.left < 0 || r.right > 320)).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('filters-materials-phone.png'), fullPage: true });
    await panel.getByRole('button', { name: 'Filter by Door shape', exact: true }).scrollIntoViewIfNeeded();
    expect(await panel.getByRole('button', { name: 'Filter by Door shape', exact: true }).evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
    await panel.getByRole('button', { name: 'Filter by Door shape', exact: true }).click();
    await expect(panel.getByRole('button', { name: 'Filter by Door shape', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: testInfo.outputPath('filters-shapes-phone.png'), fullPage: true });
    await panel.getByRole('button', { name: 'Show all shapes', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__gl().blockCount)).toBe(8);
    await page.locator('[data-arch-stage]').scrollIntoViewIfNeeded();
    expect(await page.locator('canvas[data-arch-gl]').evaluate(el => { const r = el.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el; })).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('filters-model-phone.png'), fullPage: true });

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.setViewportSize({ width: 1280, height: 1100 });
    await page.addStyleTag({ content: '#wrap{height:1060px}' });
    await panel.locator('summary').click();
    await page.addScriptTag({ path: join(ROOT, 'node_modules/axe-core/axe.min.js') });
    for (const theme of ['theme-light', 'theme-dark', 'theme-contrast']) {
      await page.evaluate(theme => { document.documentElement.className = theme; }, theme);
      const violations = await page.evaluate(async () => {
        const result = await (window as any).axe.run(document.querySelector('#arch-studio-region'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
        return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }));
      });
      expect(violations, theme).toEqual([]);
    }
    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
    await panel.getByRole('button', { name: 'Show all shapes', exact: true }).focus(); await page.keyboard.press('Enter');
    await expect(panel.getByRole('button', { name: 'Show all shapes', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await expect(page.locator('.arch-studio-feature-strip [data-arch-tool-id=filter]')).toBeFocused();
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });


  test('section explorer navigates negative depths with a full preview and preserves the live build', async ({ page }, testInfo) => {
    const blocks = [
      { x: -1, y: 0, z: -2, shape: 'block', material: 'wood', color: '#92400e', rotation: 0 },
      { x: 0, y: 0, z: -1, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 },
      { x: 1, y: 1, z: -1, shape: 'ramp', material: 'wood', color: '#92400e', rotation: 90 },
      { x: 2, y: 0, z: 3, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 }];
    await page.setViewportSize({ width: 1280, height: 1100 });
    await mount3d(page, { blocks, undoStack: [[]], redoStack: [[blocks[0]]], projectName: 'Section study', projectNotes: 'Keep notes', filterMaterial: 'wood', viewLayer: 0, sidebarCollapsed: true, soundEnabled: false });
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:1060px}' });
    const before = await page.evaluate(() => { const w = window as any; w.__sectionCanvas = document.querySelector('canvas[data-arch-gl]'); return { blocks: w.__bucket().blocks, undo: w.__bucket().undoStack, redo: w.__bucket().redoStack, name: w.__bucket().projectName, notes: w.__bucket().projectNotes }; });
    await page.locator('.arch-studio-feature-strip [data-arch-tool-id=slice]').click();
    const panel = page.locator('#arch-section-panel'), depth = panel.getByLabel('Depth (Z)', { exact: true });
    await expect(page.locator('#arch-section-heading')).toBeFocused();
    await expect(depth).toHaveValue('all');
    await expect(panel.getByRole('img', { name: 'Front overview', exact: true })).toBeVisible();
    await panel.getByRole('button', { name: 'Next section', exact: true }).click();
    await expect(depth).toHaveValue('-2');
    await expect(panel.getByRole('button', { name: 'Previous section', exact: true })).toBeDisabled();
    await panel.getByRole('button', { name: 'Next section', exact: true }).click();
    await expect(depth).toHaveValue('-1');
    await expect(panel.locator('[data-arch-section-count]')).toHaveText('2 blocks in this section');
    await expect(panel.locator('[data-arch-section-visible]')).toHaveText('0 visible in 3D');
    await expect(panel.locator('[data-drawing-cell]')).toHaveCount(2);
    await expect.poll(() => page.evaluate(() => (window as any).__gl().blockCount)).toBe(0);
    await page.screenshot({ path: testInfo.outputPath('section-desktop.png'), fullPage: true });
    await panel.getByRole('button', { name: 'Next section', exact: true }).click();
    await expect(depth).toHaveValue('3');
    await expect(panel.getByRole('button', { name: 'Next section', exact: true })).toBeDisabled();
    await panel.getByRole('button', { name: 'Previous section', exact: true }).click();
    await panel.getByRole('button', { name: 'Show all Z cross-sections', exact: true }).click();
    await expect(depth).toHaveValue('all');
    await expect.poll(() => page.evaluate(() => (window as any).__gl().blockCount)).toBe(1);
    await depth.selectOption('-1');
    await panel.getByRole('button', { name: 'Close cross-section explorer', exact: true }).click();
    await expect(page.locator('.arch-studio-feature-strip [data-arch-tool-id=slice]')).toBeFocused();
    await expect.poll(() => page.evaluate(() => (window as any).__gl().blockCount)).toBe(1);
    await page.keyboard.press('Enter');
    await expect(depth).toHaveValue('-1');
    expect(await page.evaluate(() => { const w = window as any; return { blocks: w.__bucket().blocks, undo: w.__bucket().undoStack, redo: w.__bucket().redoStack, name: w.__bucket().projectName, notes: w.__bucket().projectNotes }; })).toEqual(before);
    expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ filterMaterial: 'wood', viewLayer: 0 });
    expect(await page.evaluate(() => (window as any).__sectionCanvas === document.querySelector('canvas[data-arch-gl]'))).toBe(true);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('section explorer follows replay and handles empty restored depths without changing the floor grid', async ({ page }) => {
    const live = [{ x: 0, y: 0, z: 1, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 }];
    const past = [{ ...live[0], z: -3, material: 'wood', color: '#92400e' }];
    await mount3d(page, { blocks: live, undoStack: [past], showReplay: true, replayStep: 0, sliceZ: 1, sliceZSelected: true, sidebarCollapsed: true, soundEnabled: false });
    await page.getByRole('button', { name: 'All tools', exact: true }).click();
    await page.locator('#arch-tool-browser').getByRole('searchbox').fill('section');
    await page.locator('#arch-tool-browser [data-arch-tool=slice]').click();
    const panel = page.locator('#arch-section-panel'), depth = panel.getByLabel('Depth (Z)', { exact: true });
    await expect(page.locator('#arch-section-heading')).toBeFocused();
    await expect(panel.locator('.arch-section-frame')).toHaveText('Replay step 1 of 2');
    await expect(depth).toHaveValue('1');
    await expect(panel.locator('.arch-section-empty')).toContainText('No blocks at this depth');
    await expect(depth.locator('option')).toHaveText(['All depths', 'Z=-3 · 1 block', 'Z=1 · 0 blocks']);
    await depth.focus(); await page.keyboard.press('Escape');
    await expect(panel).toBeVisible();
    await panel.getByRole('button', { name: 'Previous section', exact: true }).click();
    await expect(panel.locator('[data-block="0,0,-3"]')).toHaveCount(1);
    await page.locator('#arch-replay-panel').getByRole('slider').focus(); await page.keyboard.press('End');
    await expect(panel.locator('.arch-section-frame')).toHaveText('Replay step 2 of 2');
    await expect(panel.locator('[data-arch-section-count]')).toHaveText('0 blocks in this section');
    await page.getByRole('button', { name: 'Floor Grid', exact: true }).click();
    await expect(panel.locator('.arch-section-grid-note')).toContainText('full editing floor');
    await expect(page.locator('[data-arch-cell="0,0,1"]')).toHaveAttribute('aria-label', /stone/);
    await page.locator('[data-arch-cell="0,0,1"]').focus(); await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (window as any).__bucket().blocks)).toEqual(live);
    await panel.getByRole('button', { name: 'Next section', exact: true }).focus(); await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(page.locator('.arch-studio-feature-strip [data-arch-tool-id=slice]')).toBeFocused();
    expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ showReplay: true, replayStep: 1, blocks: live, undoStack: [past] });
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('section explorer pages readable coordinates and resets the page for another depth', async ({ page }) => {
    const blocks = Array.from({ length: 70 }, (_, i) => ({ x: i - 35, y: 0, z: 0, shape: 'block', material: 'stone', color: '#94a3b8', rotation: 0 }));
    blocks.push({ ...blocks[0], z: 2 });
    await mount3d(page, { blocks, showSlice: true, sliceZSelected: true, sliceZ: 0, soundEnabled: false });
    const panel = page.locator('#arch-section-panel');
    await expect(panel.locator('table')).toHaveCount(0);
    await panel.locator('summary').click();
    await expect(panel.locator('tbody tr')).toHaveCount(48);
    await panel.getByRole('button', { name: 'Next coordinate page', exact: true }).click();
    await expect(panel.locator('tbody tr')).toHaveCount(22);
    await expect(panel.locator('tbody tr').first().locator('td').first()).toHaveText('13');
    await expect(panel.getByRole('button', { name: 'Next coordinate page', exact: true })).toBeDisabled();
    await expect(panel.locator('#arch-section-page')).toBeFocused();
    await panel.getByLabel('Depth (Z)', { exact: true }).selectOption('2');
    await expect(panel.locator('tbody tr')).toHaveCount(1);
    await expect(panel.locator('tbody tr').first().locator('td').first()).toHaveText('-35');
    await panel.getByLabel('Depth (Z)', { exact: true }).selectOption('0');
    await expect(panel.locator('tbody tr')).toHaveCount(48);
    await expect(panel.locator('tbody tr').first().locator('td').first()).toHaveText('-35');
    await panel.locator('summary').click();
    await expect(panel.locator('table')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__bucket().blocks)).toEqual(blocks);
    expect(await page.evaluate(() => (window as any).__bucket().undoStack || [])).toEqual([]);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('section explorer has reachable phone controls and accessible drawing and table themes', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 960 });
    await mount3d(page, { blocks: tower(), soundEnabled: false });
    await page.addStyleTag({ content: '#wrap{font-family:Arial,Helvetica,sans-serif;height:920px}' });
    await page.locator('.arch-studio-feature-strip [data-arch-tool-id=slice]').click();
    const panel = page.locator('#arch-section-panel');
    await panel.getByRole('button', { name: 'Next section', exact: true }).click();
    const sizes = await panel.locator('button,select,summary').evaluateAll(els => els.filter(el => el.getClientRects().length).map(el => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height, left: r.left, right: r.right }; }));
    expect(sizes.filter(r => r.width < 44 || r.height < 44 || r.left < 0 || r.right > 320)).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('section-controls-phone.png'), fullPage: true });
    await panel.locator('.arch-section-figure').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('section-drawing-phone.png'), fullPage: true });
    await panel.locator('summary').click();
    await expect(panel.locator('tbody tr')).toHaveCount(7);
    expect(await panel.locator('summary').evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
    await panel.locator('summary').click();
    await page.locator('[data-arch-stage]').scrollIntoViewIfNeeded();
    expect(await page.locator('canvas[data-arch-gl]').evaluate(el => { const r = el.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el; })).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('section-model-phone.png'), fullPage: true });
    await panel.locator('summary').click();

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.setViewportSize({ width: 1280, height: 1100 });
    await page.addStyleTag({ content: '#wrap{height:1060px}' });
    await page.addScriptTag({ path: join(ROOT, 'node_modules/axe-core/axe.min.js') });
    for (const theme of ['theme-light', 'theme-dark', 'theme-contrast']) {
      await page.evaluate(theme => { document.documentElement.className = theme; }, theme);
      const violations = await page.evaluate(async () => {
        const result = await (window as any).axe.run(document.querySelector('#arch-studio-region'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
        return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }));
      });
      expect(violations, theme).toEqual([]);
    }
    await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
    await panel.getByRole('button', { name: 'Next section', exact: true }).focus(); await page.keyboard.press('Enter');
    await expect(panel.getByLabel('Depth (Z)', { exact: true })).toHaveValue('1');
    await expect(page.locator('#arch-section-heading')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('.arch-studio-feature-strip [data-arch-tool-id=slice]')).toBeFocused();
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });


});
