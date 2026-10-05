import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

/**
 * Bridge Engineering Lab — REAL WebGL smoke.
 *
 * The lab runs a method-of-joints solver and an Euler buckling check, then drew
 * the result as a single-plane side elevation. When the buckling margin got
 * thin it told the student to "add lateral bracing" and "shorten the unbraced
 * length" — about the one axis the elevation has no room for, and with no
 * control that could do either. These tests pin both halves of the fix: the
 * second truss plane and its bracing are really drawn, and the bracing really
 * feeds the buckling calculation.
 *
 * Serves the WORKING TREE with React UMD and three r128 from vendor/.
 */

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>bridgelab harness</title>
<style>html,body{margin:0;height:100%;background:#0f172a}
#wrap{width:900px;height:1400px;overflow:hidden}</style></head>
<body><div id="wrap"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/vendor/three-r128/three.min.js"></script>
<script src="/stem_lab/stem_lab_module.js"></script>
<script>
  window.__events = { errors: [], sr: [] };
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });
  window.StemLab.ensureThree = function () { return Promise.resolve(window.THREE); };
  window.StemLab.loadScriptResilient = function () { return new Promise(function () {}); };
</script>
<script src="/stem_lab/stem_tool_bridgelab.js"></script>
<script>
  var e = React.createElement;
  window.__mount = function (bucket) {
    var cfg = window.StemLab._registry.bridgeLab;
    window.__toolData = { bridgeLab: Object.assign({}, bucket || {}) };
    var bump = null;
    var ctx = {
      React: React,
      get toolData() { return window.__toolData; },
      setToolData: function (fn) {
        window.__toolData = typeof fn === 'function' ? fn(window.__toolData) : fn;
        if (bump) bump();
      },
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
      setStemLabTool: function () {}, setStemLabTab: function () {},
      addToast: function () {}, awardXP: function () {}, getXP: function () { return 0; },
      announceToSR: function (m) { window.__events.sr.push(String(m)); },
      celebrate: function () {}, beep: function () {},
      callGemini: null, gradeLevel: '8th Grade', toolSnapshots: [], props: {},
      t: function (k, fb) { return fb || k; },
      icons: new Proxy({}, { get: function () { return function () { return e('span'); }; } }),
      a11yClick: function (fn) { return { onClick: fn, role: 'button', tabIndex: 0 }; },
      srOnly: {}
    };
    function Comp() {
      var st = React.useState(0);
      bump = function () { st[1](function (n) { return n + 1; }); };
      window.__bump = bump;
      return cfg.render(ctx);
    }
    window.__root = ReactDOM.createRoot(document.getElementById('wrap'));
    window.__root.render(e(Comp));
    return !!cfg;
  };
  window.__destroy = function () { if (window.__root) { window.__root.unmount(); window.__root = null; } };
  window.__gl = function () { return window.__alloBridgeGL ? window.__alloBridgeGL.debug() : null; };
  window.__bucket = function () { return window.__toolData.bridgeLab; };
  window.__set = function (patch) {
    window.__toolData = Object.assign({}, window.__toolData);
    window.__toolData.bridgeLab = Object.assign({}, window.__toolData.bridgeLab, patch);
    window.__render();
  };
  window.__render = function () { window.__bump && window.__bump(); };
  window.__canvasCount = function () { return document.querySelectorAll('canvas[data-bridge-gl]').length; };
  window.__svgCount = function () { return document.querySelectorAll('svg').length; };
  window.__text = function () { return document.body.innerText; };
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
const ENHANCEMENT_REPORT = process.env.BRIDGE_REPORT_DIR || join(ROOT, 'reports', 'bridgelab-immersive-earthquake-2026-09-28');
const IMMERSIVE_REPORT = ENHANCEMENT_REPORT;
const INVESTIGATION_REPORT = process.env.BRIDGE_REPORT_DIR || join(ROOT, 'reports', 'bridgelab-investigation-2026-09-29');
const REPLAY_REPORT = process.env.BRIDGE_REPORT_DIR || join(ROOT, 'reports', 'bridgelab-replay-2026-09-29');
const COMPARISON_REPORT = process.env.BRIDGE_REPORT_DIR || join(ROOT, 'reports', 'bridgelab-comparison-2026-09-29');
const FREQUENCY_REPORT = process.env.BRIDGE_REPORT_DIR || join(ROOT, 'reports', 'bridgelab-frequency-2026-09-29');

async function mount(page: Pg, bucket: Record<string, unknown> = {}) {
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.bridgeLab);
  await page.evaluate((b) => (window as any).__mount(b), Object.assign({ tab: 'build' }, bucket));
  await page.waitForSelector('canvas[data-bridge-gl="true"]', { timeout: 30000 });
  // The viewer deliberately suspends repainting offscreen. Exercise changes
  // with the stage visible, as a learner would, instead of sampling stale GL state.
  await page.locator('canvas[data-bridge-gl="true"]').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => (window as any).__gl()?.state === 'ready', null, { timeout: 30000 });
  await page.waitForTimeout(400);
}

async function mountWorkflow(page: Pg, width: number, bucket: Record<string, unknown> = {}) {
  await page.setViewportSize({ width, height: 900 });
  await mount(page, Object.assign({ introDismissed: true }, bucket));
  // Match the app shell's box sizing and viewport-bound desktop panel. At phone
  // widths the tool's responsive rule deliberately switches to document flow.
  await page.addStyleTag({ content: `
    *,*::before,*::after{box-sizing:border-box}
    body{font-family:system-ui,sans-serif}
    #wrap{width:100%;max-width:1100px;height:${width <= 640 ? 'auto' : '100vh'};margin:0 auto;overflow:${width <= 640 ? 'visible' : 'hidden'}}
  ` });
  await mkdir(ENHANCEMENT_REPORT, { recursive: true });
}

async function checkWorkflowHealth(page: Pg) {
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  const extent = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth
  }));
  expect(extent.document, 'document horizontal overflow').toBeLessThanOrEqual(extent.viewport + 1);
  expect(extent.body, 'body horizontal overflow').toBeLessThanOrEqual(extent.viewport + 1);
}

async function checkBridgeCanvasFillsStage(page: Pg) {
  await expect.poll(() => page.locator('canvas[data-bridge-gl]').evaluate(canvas => {
    const stage = canvas.closest('[data-allo-fs-stage]') as HTMLElement;
    const element = canvas as HTMLCanvasElement;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    return Math.max(Math.abs(element.clientHeight - stage.clientHeight),
      Math.abs(element.clientWidth - stage.clientWidth),
      Math.abs(element.height / ratio - stage.clientHeight),
      Math.abs(element.width / ratio - stage.clientWidth));
  }), { message: 'the CSS canvas and drawing buffer fill the whole stage' }).toBeLessThanOrEqual(1);
}

async function captureRegion(page: Pg, region: import('@playwright/test').Locator, name: string) {
  const viewport = page.viewportSize();
  // A locator image cannot see through the desktop panel's scroll clipping.
  // Give the real panel enough height for this region while retaining its width.
  // Restore the normal viewport before the next interaction/overflow assertion.
  if (viewport && viewport.width > 640) {
    const height = await region.evaluate((element) => element.getBoundingClientRect().height);
    await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, Math.ceil(height) + 1000) });
  }
  await region.screenshot({ path: join(ENHANCEMENT_REPORT, name) });
  if (viewport) await page.setViewportSize(viewport);
}

async function captureImmersiveRegion(page: Pg, region: import('@playwright/test').Locator, name: string, folder = IMMERSIVE_REPORT) {
  const viewport = page.viewportSize();
  if (viewport && viewport.width > 640) {
    const height = await region.evaluate(element => element.getBoundingClientRect().height);
    await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, Math.ceil(height) + 1500) });
  }
  await region.scrollIntoViewIfNeeded();
  await region.screenshot({ path: join(folder, name) });
  if (viewport) await page.setViewportSize(viewport);
}

test.describe.configure({ timeout: 180_000 });

test.describe('Bridge Lab — real WebGL', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  test('draws BOTH truss planes, not the one the elevation showed', async ({ page }) => {
    await mount(page, { span: 30, height: 6, nBays: 4, trussStyle: 'warren' });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
    expect(gl.trussPlanes).toBe(2);
    // Warren, 4 bays: 4 bottom chord + 3 top chord + 8 diagonals = 15 members,
    // doubled across the two planes.
    expect(gl.memberCount).toBe(30);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('has a deck and spans the real width of the bridge', async ({ page }) => {
    await mount(page, { span: 30, height: 6, nBays: 4 });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.deckPresent).toBe(true);
    expect(gl.extent.w).toBe(30);
    expect(gl.extent.h).toBe(6);
    expect(gl.extent.d).toBeGreaterThan(4);   // two planes, a walkable deck between
  });

  test('bracing slider changes how much bracing is drawn', async ({ page }) => {
    await mount(page, { span: 40, height: 5, nBays: 6, lateralBraceEvery: 1 });
    const tight = await page.evaluate(() => (window as any).__gl().braceCount);
    await page.evaluate(() => (window as any).__set({ lateralBraceEvery: 3 }));
    await page.waitForTimeout(500);
    const loose = await page.evaluate(() => (window as any).__gl().braceCount);
    expect(tight).toBeGreaterThan(loose);
    expect(loose).toBeGreaterThan(0);
  });

  test('★ removing bracing really fails the buckling check', async ({ page }) => {
    // This is the point of the whole change. The tool told students to "add
    // lateral bracing"; until now nothing in the model could hear them.
    await mount(page, { span: 36, height: 6, nBays: 6, crossSectionMm2: 14000, lateralBraceEvery: 1 });
    const braced = await page.evaluate(() => (window as any).__text());

    await page.evaluate(() => (window as any).__set({ lateralBraceEvery: 6 }));
    await page.waitForTimeout(500);
    const unbraced = await page.evaluate(() => (window as any).__text());

    expect(braced).not.toContain('BUCKLING FAILURE');
    expect(unbraced).toContain('BUCKLING FAILURE');
    // And it must say WHICH way it is buckling — the sideways mode is the one
    // the elevation could never show.
    expect(unbraced).toContain('buckling SIDEWAYS');
  });

  test('★ the default braces every panel, preserving the previous numbers', async ({ page }) => {
    // Back-compat. With bracing at every joint the out-of-plane length equals
    // the in-plane length, so the Euler check is arithmetically unchanged from
    // before this feature existed and a saved design cannot silently start
    // failing. The tell is the "SIDEWAYS" wording: it appears only when the
    // governing length came from brace spacing rather than the member itself.
    //
    // Note this design DOES buckle, and did before this change too — the stock
    // 30 m / 5000 mm² starting point is deliberately under-built so students
    // have something to fix. What must not change is WHY it buckles.
    // Mounted with NO lateralBraceEvery key at all — the back-compat case, a
    // design saved before this feature existed.
    await mount(page, { span: 30, height: 6, nBays: 4, crossSectionMm2: 5000 });
    expect(await page.evaluate(() => (window as any).__bucket().lateralBraceEvery)).toBeUndefined();
    const txt = await page.evaluate(() => (window as any).__text());
    expect(txt).not.toContain('buckling SIDEWAYS');
    // It buckles, but in-plane — i.e. governed by the member's own length, which
    // is exactly what the pre-change code computed.
    expect(await page.evaluate(() => (window as any).__gl().bowedAxis)).toBe('in-plane');
  });

  test('the failed member is drawn bowed, and only when it fails', async ({ page }) => {
    await mount(page, { span: 36, height: 6, nBays: 6, crossSectionMm2: 14000, lateralBraceEvery: 1 });
    expect(await page.evaluate(() => (window as any).__gl().bowedMember)).toBeNull();
    await page.evaluate(() => (window as any).__set({ lateralBraceEvery: 6 }));
    await page.waitForTimeout(500);
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.bowedMember).toBeTruthy();
    expect(String(gl.bowedMember)).toMatch(/^TC/);   // a top chord, as the physics says
    // And it bows the way it actually failed, not just some way.
    expect(gl.bowedAxis).toBe('out-of-plane');
    expect(gl.bowedInterval).toEqual({ startM: 3, endM: 33 });
    expect(gl.bowedMembers).toEqual(['TC0', 'TC1', 'TC2', 'TC3', 'TC4']);
    await expect(page.locator('[aria-describedby="bridge-gl-description"]')).toHaveAttribute('aria-label', /deformation is exaggerated/);
    await mkdir(ENHANCEMENT_REPORT, { recursive: true });
    await captureRegion(page, page.locator('[data-allo-fs-stage]'), 'bridge-buckled-interval.png');
  });

  test('the elevation survives underneath as the guaranteed floor', async ({ page }) => {
    await mount(page, { span: 30, height: 6, nBays: 4 });
    // Hidden with visibility, never removed — exports and DOM queries still work.
    expect(await page.evaluate(() => (window as any).__svgCount())).toBeGreaterThan(0);
  });

  test('the loading overlay actually goes away', async ({ page }) => {
    // The viewer status flips asynchronously, long after the render that mounted
    // it. Nothing in React was watching, so the overlay sat on top of a working
    // canvas — a dead overlay that every other test in this file would pass
    // straight through, because the scene underneath was genuinely fine.
    await mount(page, { span: 30, height: 6, nBays: 4 });
    expect(await page.evaluate(() => (window as any).__text())).not.toContain('Loading 3D view');
    // And the affordance it replaces is really offered.
    expect(await page.evaluate(() => (window as any).__text())).toContain('Drag');
  });

  test('every truss style builds without throwing', async ({ page }) => {
    await mount(page, { span: 36, height: 6, nBays: 6, trussStyle: 'warren' });
    for (const style of ['pratt', 'howe', 'ktruss', 'warren']) {
      await page.evaluate((s) => (window as any).__set({ trussStyle: s }), style);
      await page.waitForTimeout(350);
      const gl = await page.evaluate(() => (window as any).__gl());
      expect(gl.state, `style ${style}`).toBe('ready');
      expect(gl.contextLost, `style ${style}`).toBe(false);
      if (style === 'ktruss') {
        const description = await page.locator('[aria-describedby="bridge-gl-description"]').getAttribute('aria-label');
        expect(description).toContain('forces are not solved');
        expect(description).not.toContain('drawn bowed');
      }
    }
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('drag orbits the camera, which the overlay claims', async ({ page }) => {
    await mount(page, { span: 30, height: 6, nBays: 4 });
    const before = await page.evaluate(() => (window as any).__bucket().rot3d);
    await page.evaluate(() => {
      const c = document.querySelector('canvas[data-bridge-gl="true"]') as HTMLCanvasElement;
      const host = c.parentElement as HTMLElement;
      const r = host.getBoundingClientRect();
      const mk = (t: string, x: number, y: number) =>
        new PointerEvent(t, { clientX: x, clientY: y, bubbles: true, cancelable: true, pointerId: 1 });
      host.dispatchEvent(mk('pointerdown', r.left + r.width / 2, r.top + r.height / 2));
      host.dispatchEvent(mk('pointermove', r.left + r.width / 2 + 90, r.top + r.height / 2));
      host.dispatchEvent(mk('pointerup', r.left + r.width / 2 + 90, r.top + r.height / 2));
    });
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => (window as any).__bucket().rot3d);
    expect(after.rotY).toBeGreaterThan((before?.rotY ?? 26) + 10);
  });

  test('changing the span does not remount the canvas', async ({ page }) => {
    await mount(page, { span: 30, height: 6, nBays: 4 });
    for (const span of [36, 44, 52]) {
      await page.evaluate((s) => (window as any).__set({ span: s }), span);
      await page.waitForTimeout(200);
    }
    expect(await page.evaluate(() => (window as any).__canvasCount())).toBe(1);
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.extent.w).toBe(52);
  });

  test('tears the renderer down on unmount', async ({ page }) => {
    await mount(page, { span: 30, height: 6, nBays: 4 });
    await page.evaluate(() => (window as any).__destroy());
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).__gl().state)).toBe('idle');
  });

  for (const width of [1000, 390, 320]) {
    test(`enhanced workflow: inspect, sweep, compare and restore at ${width}px`, async ({ page }) => {
      await mountWorkflow(page, width, {
        span: 36, height: 6, nBays: 6, crossSectionMm2: 14000,
        lateralBraceEvery: 1, loadMode: 'vehicle', vehiclePos: 0.2,
        designName: 'Baseline bridge', designNotes: 'Compare one change at a time.'
      });
      const canvas = page.locator('canvas[data-bridge-gl="true"]');
      await expect(canvas).toBeVisible();
      await page.screenshot({ path: join(ENHANCEMENT_REPORT, `bridge-${width}-overview.png`) });

      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Labelled 2D view', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('img', { name: /^Warren truss diagram/ })).toBeVisible();
      await page.getByLabel('Inspect member', { exact: true }).selectOption('BC0');
      await expect(page.locator('[data-bridge-inspector] [role="status"]')).toContainText('BC0');
      await expect(page.locator('[data-bridge-member="BC0"] text')).toHaveText('BC0');
      await page.locator('[data-bridge-inspector] summary').click();
      await expect(page.getByRole('region', { name: 'Member force table', exact: true })).toBeVisible();
      await captureRegion(page, page.locator('[data-bridge-inspector]'), `bridge-${width}-inspector.png`);
      await captureRegion(page, page.getByRole('img', { name: /^Warren truss diagram/ }), `bridge-${width}-elevation.png`);

      await page.getByRole('button', { name: 'Test all positions', exact: true }).click();
      await expect(page.locator('[data-bridge-sweep]')).toContainText('Lowest safety factor across the crossing:');
      const sweep = await page.evaluate(() => (window as any).__bucket().vehicleSweep);
      expect(sweep.samples.length).toBeGreaterThanOrEqual(51);
      expect(sweep.worst.sf).toBeGreaterThan(0);
      await page.getByRole('button', { name: 'Inspect worst position', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().vehiclePos)).toBe(sweep.worst.position);
      await captureRegion(page, page.locator('[data-bridge-sweep]'), `bridge-${width}-sweep.png`);

      await page.getByRole('button', { name: 'Save current design', exact: true }).click();
      await expect(page.locator('[data-bridge-notebook] article')).toHaveCount(1);
      const baseline = await page.evaluate(() => (window as any).__bucket().designTrials[0].inputs);
      const area = page.getByRole('slider', { name: 'Member cross-section (mm²)', exact: true });
      await area.focus();
      await area.press('ArrowRight');
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().crossSectionMm2)).toBe(14500);
      await expect(page.locator('[data-bridge-sweep]')).toContainText('The design changed. Run the crossing test again');
      await expect(page.getByRole('button', { name: 'Inspect worst position', exact: true })).toHaveCount(0);
      await page.getByRole('textbox', { name: 'Bridge design name', exact: true }).fill('Thicker section');
      await page.getByRole('button', { name: 'Save current design', exact: true }).click();
      await expect(page.locator('[data-bridge-notebook] article')).toHaveCount(2);
      await page.getByRole('button', { name: 'Restore Baseline bridge', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().crossSectionMm2)).toBe(baseline.crossSectionMm2);
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().vehiclePos)).toBe(baseline.vehiclePos);
      await expect(page.getByRole('textbox', { name: 'Bridge design notes', exact: true })).toHaveValue('Compare one change at a time.');
      await captureRegion(page, page.locator('[data-bridge-notebook]'), `bridge-${width}-notebook.png`);
      await checkWorkflowHealth(page);
    });
  }

  test('enhanced workflow: auto-drive visibly updates the vehicle and pauses on manual input', async ({ page }) => {
    await mountWorkflow(page, 1000, { loadMode: 'vehicle', vehiclePos: 0, introDismissed: true });
    await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
    const elevation = page.getByRole('img', { name: /^Warren truss diagram/ });
    const before = await elevation.textContent();
    await page.getByRole('button', { name: 'Auto-Drive Vehicle Across Bridge' }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().vehiclePos)).toBeGreaterThan(0.1);
    await expect(page.getByRole('button', { name: 'Stop Drive' })).toHaveAttribute('aria-pressed', 'true');
    expect(await elevation.textContent()).not.toBe(before);
    const position = page.getByRole('slider', { name: 'Vehicle position (0=left, 1=right)', exact: true });
    await position.focus();
    await position.press('End');
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().autoDriving)).toBe(false);
    const stopped = await page.evaluate(() => (window as any).__bucket().vehiclePos);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as any).__bucket().vehiclePos)).toBe(stopped);
    await checkWorkflowHealth(page);
  });

  for (const width of [1000, 390, 320]) {
    test(`crossing evidence: optimize, inspect with keyboard and print a saved trial at ${width}px`, async ({ page }) => {
      await mountWorkflow(page, width, {
        span: 36, height: 6, nBays: 6, crossSectionMm2: 14000,
        lateralBraceEvery: 1, loadMode: 'vehicle', vehiclePos: 0, vehicleLoad: 120
      });
      const optimizer = page.locator('[data-bridge-optimizer]');
      await expect(page.getByRole('combobox', { name: 'Positions to optimize', exact: true })).toHaveValue('crossing');
      await expect(optimizer).not.toContainText('An unloaded design cannot establish');
      await page.getByRole('button', { name: 'Apply this design to my bridge', exact: true }).click();
      const applied = await page.evaluate(() => (window as any).__bucket());
      expect(applied.vehiclePos).toBe(0);
      const sweep = applied.vehicleSweep;
      expect(sweep.worst.sf).toBeGreaterThanOrEqual(applied.optTargetSF || 2);
      expect(sweep.samples.some((sample: any) => sample.position > 0 && sample.position < 1 && sample.sf !== null)).toBe(true);
      expect(sweep.memberExtremes.length).toBe(23);
      await captureRegion(page, optimizer, `bridge-${width}-optimizer.png`);

      const worst = page.getByRole('button', { name: 'Inspect worst position', exact: true });
      await worst.focus();
      await worst.press('Enter');
      const member = page.getByLabel('Inspect member', { exact: true });
      await expect(member).toBeFocused();
      await expect(member).toHaveValue(sweep.worst.member);
      await expect(page.getByRole('button', { name: 'Labelled 2D view', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().vehiclePos)).toBe(sweep.worst.position);

      const reversed = sweep.memberExtremes.find((item: any) => item.tensionKN > 0.001 && item.compressionKN > 0.001);
      expect(reversed, 'A Warren diagonal reverses action during this crossing').toBeTruthy();
      await member.selectOption(reversed.id);
      const extremes = page.locator('[data-bridge-member-crossing]');
      await expect(extremes).toContainText('Force reversal');
      await expect(extremes).toContainText(`Maximum tension: ${reversed.tensionKN.toFixed(2)} kN`);
      await expect(extremes).toContainText(`Maximum compression: ${reversed.compressionKN.toFixed(2)} kN`);
      await extremes.getByRole('button', { name: `Inspect position ${(reversed.compressionPosition * 100).toFixed(1)}%`, exact: true }).click();
      await expect(member).toBeFocused();
      await expect(page.locator('[data-bridge-inspector] [role="status"]')).toContainText('Compression');
      await captureRegion(page, page.locator('[data-bridge-inspector]'), `bridge-${width}-member-extremes.png`);

      const resultsToggle = page.locator('[data-bridge-sweep] summary');
      await resultsToggle.focus();
      await resultsToggle.press('Enter');
      const results = page.getByRole('region', { name: 'Crossing results table', exact: true });
      await results.focus();
      await expect(results).toBeFocused();
      await expect(results.getByRole('row')).toHaveCount(sweep.samples.length + 1);
      const tested = sweep.samples.find((sample: any) => sample.position > 0.3 && sample.position < 0.4);
      const positionButton = results.getByRole('button', { name: `Inspect position ${(tested.position * 100).toFixed(1)}%`, exact: true });
      await positionButton.focus();
      await positionButton.press('Enter');
      await expect(member).toBeFocused();
      await expect(member).toHaveValue(tested.member);
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().vehiclePos)).toBe(tested.position);
      const position = page.getByRole('slider', { name: /^Inspect vehicle position/ });
      await position.focus();
      await position.press('Home');
      await position.press('ArrowRight');
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().vehiclePos)).toBe(0.01);
      await expect(position).toHaveAttribute('aria-valuetext', /^1\.0%; SF /);
      await resultsToggle.press('Enter');
      await captureRegion(page, page.locator('[data-bridge-sweep]'), `bridge-${width}-crossing-controls.png`);

      const prediction = 'I predict that a thicker section will improve the buckling margin because bending stiffness increases.';
      const observation = 'The whole crossing met the target. A diagonal changed from tension to compression as the vehicle moved.';
      await page.getByRole('textbox', { name: 'Bridge design name', exact: true }).fill('Crossing investigation');
      await page.getByRole('textbox', { name: 'Design prediction', exact: true }).fill(prediction);
      await page.getByRole('textbox', { name: 'Design observation', exact: true }).fill(observation);
      await page.getByRole('button', { name: 'Save current design', exact: true }).click();
      const trial = page.locator('[data-bridge-notebook] article');
      await expect(trial).toHaveCount(1);
      await expect(trial).toContainText(prediction);
      await expect(trial).toContainText(observation);
      await expect(trial).toContainText('Saved crossing: SF');
      await captureRegion(page, page.locator('[data-bridge-notebook]'), `bridge-${width}-evidence-notebook.png`);
      await checkWorkflowHealth(page);

      await page.getByRole('button', { name: 'Open design report', exact: true }).click();
      await expect(page.locator('#bridge-print-region')).toBeVisible();
      const printedTrial = page.locator('[data-bridge-print-trial]');
      await expect(printedTrial).toContainText(prediction);
      await expect(printedTrial).toContainText(observation);
      await expect(printedTrial).toContainText('Saved crossing evidence');
      await expect(printedTrial).not.toContainText('No matching crossing test');
      await expect(page.locator('[data-bridge-print-crossing]')).toContainText('Current design crossing test');
      await captureRegion(page, page.locator('#bridge-print-region'), `bridge-${width}-portfolio.png`);
      await checkWorkflowHealth(page);
      if (width === 1000) {
        await page.emulateMedia({ media: 'print' });
        await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
        await page.pdf({ path: join(ENHANCEMENT_REPORT, 'bridge-evidence-portfolio.pdf'), format: 'A4', printBackground: true,
          margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' } });
      }
    });
  }

  test('view recovery: WebGL loss moves focused controls to a persistent labelled 2D fallback', async ({ page }) => {
    await mountWorkflow(page, 1000, { loadMode: 'vehicle', vehiclePos: 0.3 });
    const viewer = page.locator('[aria-describedby="bridge-gl-description"]');
    await viewer.focus();
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
      const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const extension = context?.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('Chromium did not expose WEBGL_lose_context');
      (window as any).__bridgeRestoreContext = extension;
      extension.loseContext();
    });
    const fallback = page.locator('[data-bridge-elevation]');
    await expect(page.locator('[data-bridge-view-status]')).toBeVisible();
    await expect(page.locator('[data-bridge-view-status]')).toContainText('3D is unavailable');
    await expect(fallback).toBeFocused();
    await expect(page.getByRole('button', { name: '3D structure', exact: true })).toBeDisabled();
    await expect(page.getByRole('img', { name: /^Warren truss diagram/ })).toBeVisible();
    await page.evaluate(() => (window as any).__bridgeRestoreContext.restoreContext());
    await expect.poll(() => page.evaluate(() => (window as any).__gl().state)).toBe('ready');
    await expect(page.locator('[data-bridge-view-status]')).toContainText('3D is available again');
    await expect(fallback).toBeFocused();
    await expect(page.getByRole('button', { name: 'Labelled 2D view', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: '3D structure', exact: true }).click();
    await expect(viewer).toBeVisible();
    await expect(page.locator('[data-bridge-view-status]')).toHaveCount(0);
    await checkWorkflowHealth(page);
  });

  test('view recovery: failed 3D startup keeps the explanation and 2D controls available', async ({ page }) => {
    await page.goto(`${base}/__harness`);
    await page.evaluate(() => {
      (window as any).StemLab.ensureThree = () => Promise.reject(new Error('Test WebGL unavailable'));
      (window as any).__mount({ tab: 'build', introDismissed: true });
    });
    await expect(page.locator('[data-bridge-view-status]')).toBeVisible();
    await expect(page.locator('[data-bridge-view-status]')).toContainText('all analysis controls remain available');
    await expect(page.getByRole('img', { name: /^Warren truss diagram/ })).toBeVisible();
    await expect(page.getByRole('button', { name: '3D structure', exact: true })).toBeDisabled();
    await page.getByLabel('Inspect member', { exact: true }).selectOption('BC0');
    await expect(page.locator('[data-bridge-inspector] [role="status"]')).toContainText('BC0');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('view recovery: keyboard orbit and view switching preserve explicit 2D selection', async ({ page }) => {
    await mountWorkflow(page, 1000);
    const viewer = page.locator('[aria-describedby="bridge-gl-description"]');
    await viewer.focus();
    await viewer.press('ArrowRight');
    await viewer.press('ArrowUp');
    await viewer.press('+');
    const rotated = await page.evaluate(() => (window as any).__bucket());
    expect(rotated.rot3d).toEqual({ rotY: 34, rotX: 20 });
    expect(rotated.zoom3d).toBeGreaterThan(1);
    const twoDimensional = page.getByRole('button', { name: 'Labelled 2D view', exact: true });
    await twoDimensional.focus();
    await twoDimensional.press('Enter');
    await expect(twoDimensional).toBeFocused();
    await expect(viewer).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('[data-allo-fs-stage]')).toHaveAttribute('aria-hidden', 'true');
    await page.evaluate(() => (window as any).__set({ span: 40 }));
    await expect(twoDimensional).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('img', { name: /^Warren truss diagram/ })).toBeVisible();
    await checkWorkflowHealth(page);
  });

  for (const width of [1000, 320]) {
    test('bridge landscape: lighting, river views and bounded resources at ' + width + 'px', async ({ page }) => {
      const warnings: string[] = [];
      page.on('console', message => {
        const text = message.text();
        // Screenshot readback can emit this documented SwiftShader diagnostic.
        // Keep application warnings and all shader/context errors actionable.
        if (message.type() === 'warning' && text.includes('GL Driver Message (OpenGL, Performance,')
          && /GPU stall due to ReadPixels(?: \(this message will no longer repeat\))?$/.test(text)) return;
        if (message.type() === 'warning' || message.type() === 'error') warnings.push(text);
      });
      await mountWorkflow(page, width, { crossSectionMm2: 14500, span: 30 });
      const stage = page.locator('[data-allo-fs-stage]');
      await stage.scrollIntoViewIfNeeded();
      const initial = await page.evaluate(() => (window as any).__gl());
      expect(initial.shadowsEnabled).toBe(true);
      expect(initial.landscape).toMatchObject({ trees: 48, ridges: 4, shadowMapSize: 1024 });
      expect(initial.resources.textures).toBeGreaterThan(0);
      expect(initial.drawCalls).toBeLessThan(650);
      expect(initial.triangles).toBeLessThan(40000);
      await captureImmersiveRegion(page, stage, 'bridge-' + width + '-landscape-orbit.png');
      for (const span of [10, 80, 30, 60, 30]) {
        const previousBuild = await page.evaluate(() => (window as any).__gl().sceneBuilds);
        await page.evaluate(value => (window as any).__set({ span: value }), span);
        await expect.poll(() => page.evaluate(() => (window as any).__gl().sceneBuilds)).toBeGreaterThan(previousBuild);
        const resized = await page.evaluate(() => (window as any).__gl());
        expect(resized.resources.textures).toBe(initial.resources.textures);
        expect(resized.drawCalls).toBeLessThan(650);
        expect(resized.triangles).toBeLessThan(40000);
      }
      // The initial desktop-sized mount can upload objects that the narrower
      // phone camera later culls. Returning to the same span must not grow GPU use.
      expect(await page.evaluate(() => (window as any).__gl().resources.geometries)).toBeLessThanOrEqual(initial.resources.geometries);
      await page.getByRole('button', { name: 'On the bridge', exact: true }).click();
      await stage.scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('deck');
      const built = await page.evaluate(() => (window as any).__gl().sceneBuilds);
      const hint = stage.getByText('Deck view · Drag to look · ↑/↓ walk · Home reset', { exact: true });
      expect(await hint.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      await captureImmersiveRegion(page, stage, 'bridge-' + width + '-landscape-walkway.png');
      await page.evaluate(() => (window as any).__set({ bridgeWalkPos: 0.5, bridgeLookYaw: 90, bridgeLookPitch: -8 }));
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraDirection[2])).toBeGreaterThan(0.9);
      expect(await page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(built);
      await captureImmersiveRegion(page, stage, 'bridge-' + width + '-landscape-river.png');
      expect(warnings).toEqual([]);
      await checkWorkflowHealth(page);
    });
  }

  for (const width of [1000, 390]) {
    test(`immersive earthquake: walk, inspect energy and preserve static analysis at ${width}px`, async ({ page }) => {
      await mountWorkflow(page, width, { loadMode: 'vehicle', vehiclePos: 0.35, crossSectionMm2: 14500 });
      await mkdir(IMMERSIVE_REPORT, { recursive: true });
      const stage = page.locator('[data-allo-fs-stage]');
      const inspector = page.locator('[data-bridge-inspector]');
      const staticBefore = await inspector.textContent();
      await page.getByRole('button', { name: 'On the bridge', exact: true }).click();
      await stage.scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('deck');
      const onDeck = await page.evaluate(() => (window as any).__gl());
      expect(onDeck.roadwayPresent).toBe(true);
      expect(onDeck.railingsPresent).toBe(true);
      expect(onDeck.deckEyeHeightM).toBe(1.65);
      expect(onDeck.cameraDirection[0]).toBeGreaterThan(0.99);
      const viewer = page.locator('[aria-describedby="bridge-gl-description"]');
      await viewer.focus();
      await viewer.press('ArrowUp');
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().bridgeWalkPos)).toBeCloseTo(0.145);
      await viewer.press('PageUp');
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().bridgeLookPitch)).toBeGreaterThan(0);
      await viewer.press('Home');
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().bridgeWalkPos)).toBe(0.12);
      const position = page.getByRole('slider', { name: 'Position on bridge (%)', exact: true });
      await position.focus();
      await position.press('ArrowRight');
      await stage.scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraPosition.x)).toBeGreaterThan(onDeck.cameraPosition.x);
      const look = page.getByRole('slider', { name: 'Look left or right (°)', exact: true });
      await look.focus();
      await look.press('ArrowRight');
      await stage.scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraDirection[2])).toBeGreaterThan(0);
      await captureImmersiveRegion(page, stage, `bridge-${width}-on-deck.png`);

      await page.getByRole('checkbox', { name: 'Earthquake experiment', exact: true }).check();
      const time = page.getByRole('slider', { name: 'Experiment time (s)', exact: true });
      await time.focus();
      await time.press('Home');
      await time.press('PageUp');
      await time.press('PageUp');
      await time.press('PageUp');
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBeGreaterThan(0);
      const energy = page.locator('[data-bridge-energy]');
      await expect(energy).toContainText('J/kg');
      await expect(energy).not.toContainText(/NaN|Infinity|undefined/);
      await expect(page.locator('[data-bridge-seismic-comparison] tbody tr')).toHaveCount(3);
      await expect.poll(() => inspector.textContent()).toBe(staticBefore);
      await stage.scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => Math.abs((window as any).__gl().relativeOffsetM))).toBeGreaterThan(0);
      const quake = await page.evaluate(() => (window as any).__gl());
      expect(quake.sceneBuilds).toBe(onDeck.sceneBuilds);
      expect(quake.deckOffsetM - quake.groundOffsetM).toBeCloseTo(quake.relativeOffsetM, 10);
      expect(quake.deckOffsetVisualM).toBeCloseTo(quake.deckOffsetM * quake.motionScale, 10);
      expect(quake.supportEndpoints.length).toBeGreaterThan(0);
      for (const support of quake.supportEndpoints) {
        expect(support.top.z - support.base.z).toBeCloseTo(quake.deckOffsetVisualM - quake.groundOffsetVisualM, 8);
      }
      expect(await page.evaluate(() => (window as any).__canvasCount())).toBe(1);
      await captureImmersiveRegion(page, stage, `bridge-${width}-on-deck-earthquake.png`);
      await captureImmersiveRegion(page, energy, `bridge-${width}-energy.png`);

      await page.getByRole('button', { name: '3D structure', exact: true }).click();
      await stage.scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('orbit');
      await captureImmersiveRegion(page, stage, `bridge-${width}-orbit-earthquake.png`);
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      await expect(page.getByRole('img', { name: /^Warren truss diagram/ })).toBeVisible();
      await expect.poll(() => inspector.textContent()).toBe(staticBefore);
      await checkWorkflowHealth(page);
    });
  }

  for (const width of [1000, 320]) {
    test('earthquake investigation: inspect, save, compare, restore and print at ' + width + 'px', async ({ page }) => {
      await mkdir(INVESTIGATION_REPORT, { recursive: true });
      await mountWorkflow(page, width, { seismicEnabled: true, seismicDampingRatio: 0.05 });
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      await page.getByRole('button', { name: 'Inspect peak motion', exact: true }).click();
      const recordedTime = await page.evaluate(() => (window as any).__bucket().seismicTime);
      expect(recordedTime).toBeGreaterThan(0);
      expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
      const mechanism = page.locator('[data-bridge-seismic-mechanism]');
      await expect(mechanism).toContainText('N/kg');
      const offsets = await mechanism.evaluate(element => ({
        deck: Number(element.querySelector('[data-seismic-deck-x]')?.getAttribute('data-seismic-deck-x')),
        ground: Number(element.querySelector('[data-seismic-ground-x]')?.getAttribute('data-seismic-ground-x'))
      }));
      expect(Math.abs(offsets.deck - offsets.ground)).toBeGreaterThan(20);
      await captureImmersiveRegion(page, mechanism, 'bridge-' + width + '-mechanism.png', INVESTIGATION_REPORT);
      await page.getByRole('textbox', { name: 'Earthquake trial name', exact: true }).fill('Near resonance');
      await page.getByRole('textbox', { name: 'Earthquake prediction', exact: true }).fill('More damping will reduce the peak motion.');
      await page.getByRole('textbox', { name: 'Earthquake observation and explanation', exact: true }).fill('The deck continues to move when ground shaking stops.');
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      await expect(page.locator('[data-seismic-trial]')).toHaveCount(1);
      await page.locator('[data-bridge-seismic] summary').click();
      await page.getByRole('button', { name: 'Try 20% damping', exact: true }).click();
      const comparison = page.locator('[data-seismic-trial-comparison]');
      await expect(comparison).toContainText('Changed settings: Damping ratio (%)');
      const cells = await comparison.locator('tbody tr').first().locator('[data-seismic-cell-value]').allTextContents();
      expect(parseFloat(cells[1])).toBeLessThan(parseFloat(cells[0]));
      await page.getByRole('textbox', { name: 'Earthquake trial name', exact: true }).fill('Added damping');
      await page.getByRole('textbox', { name: 'Earthquake observation and explanation', exact: true }).fill('Peak relative motion is smaller with the same shaking.');
      await page.getByRole('button', { name: 'Inspect end of shaking', exact: true }).click();
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      await expect(page.locator('[data-seismic-trial]')).toHaveCount(2);
      await captureImmersiveRegion(page, page.locator('[data-bridge-seismic-notebook]'), 'bridge-' + width + '-notebook.png', INVESTIGATION_REPORT);
      await checkWorkflowHealth(page);
      await page.getByRole('button', { name: 'Restore earthquake trial 1: Near resonance', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(recordedTime);
      expect(await page.evaluate(() => (window as any).__bucket().seismicDampingRatio)).toBe(0.05);
      expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
      await expect(page.getByRole('textbox', { name: 'Earthquake observation and explanation', exact: true })).toHaveValue('The deck continues to move when ground shaking stops.');
      await page.getByRole('button', { name: 'Open earthquake evidence report', exact: true }).click();
      const report = page.locator('[data-bridge-print-seismic]');
      await expect(report.locator('[data-seismic-trial]')).toHaveCount(2);
      await expect(report).toContainText('Near resonance');
      await expect(report).toContainText('Added damping');
      await expect(report).toContainText('Energy at the inspected time (J/kg)');
      await expect(report.locator('input,textarea,button')).toHaveCount(0);
      await captureImmersiveRegion(page, report, 'bridge-' + width + '-earthquake-report.png', INVESTIGATION_REPORT);
      await checkWorkflowHealth(page);
    });
  }

  for (const width of [1000, 320]) {
    test('earthquake comparison: choose a reference, inspect shared curves and print at ' + width + 'px', async ({ page }) => {
      await mkdir(COMPARISON_REPORT, { recursive: true });
      await mountWorkflow(page, width, { seismicEnabled: true });
      await page.getByRole('button', { name: 'Inspect peak motion', exact: true }).click();
      await page.getByRole('textbox', { name: 'Earthquake trial name', exact: true }).fill('Reference: 5% damping');
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      await page.locator('[data-bridge-seismic] summary').click();
      await page.getByRole('button', { name: 'Try 20% damping', exact: true }).click();
      const comparison = page.locator('[data-seismic-trial-comparison]');
      await expect(comparison).toContainText('Both trials use the same ground motion');
      const cells = await comparison.locator('tbody tr').first().locator('[data-seismic-cell-value]').allTextContents();
      expect(parseFloat(cells[1])).toBeLessThan(parseFloat(cells[0]));
      expect(parseFloat(cells[2])).toBeLessThan(0);
      await page.getByRole('button', { name: 'Compare on timeline', exact: true }).click();
      const chart = page.getByRole('slider', { name: 'Inspect earthquake timeline (s)', exact: true });
      await expect(chart).toBeFocused();
      await chart.press('Home');
      for (let i = 0; i < 8; i++) await chart.press('PageUp');
      await expect(page.locator('[data-seismic-compare-frame]')).toHaveAttribute('data-seismic-compare-frame', '8');
      const timeline = page.locator('[data-bridge-seismic-timeline]');
      await expect(timeline).toHaveAttribute('data-bridge-seismic-timeline', 'comparison');
      await expect(timeline.locator('[data-seismic-comparison-curves] polyline')).toHaveCount(2);
      await captureImmersiveRegion(page, timeline, 'bridge-' + width + '-comparison-motion.png', COMPARISON_REPORT);
      await page.getByRole('combobox', { name: 'Comparison measure', exact: true }).selectOption('acceleration');
      await expect(page.locator('[data-seismic-comparison-curves]')).toHaveAttribute('data-seismic-comparison-curves', 'acceleration');
      await expect(page.locator('[data-seismic-compare-frame]')).toContainText(' g');
      await page.getByRole('combobox', { name: 'Comparison measure', exact: true }).selectOption('stored');
      await expect(page.locator('[data-seismic-compare-frame]')).toContainText('J/kg');
      await captureImmersiveRegion(page, timeline, 'bridge-' + width + '-comparison-energy.png', COMPARISON_REPORT);
      await page.getByRole('textbox', { name: 'Earthquake trial name', exact: true }).fill('Added damping: 20%');
      await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
      await page.getByRole('combobox', { name: 'Earthquake reference trial', exact: true }).selectOption('1');
      await expect(page.getByRole('combobox', { name: 'Timeline reference trial', exact: true })).toHaveValue('1');
      const identical = await timeline.locator('[data-seismic-comparison-curves] polyline').evaluateAll(lines => lines.map(line => line.getAttribute('points')));
      expect(identical[0]).toBe(identical[1]);
      await page.getByRole('button', { name: 'Restore earthquake trial 1: Reference: 5% damping', exact: true }).click();
      const frequency = page.getByRole('slider', { name: 'Ground shaking frequency (Hz)', exact: true });
      await frequency.press('End');
      await expect(comparison).toContainText('The ground motion differs');
      await page.getByRole('button', { name: 'Use reference shaking', exact: true }).click();
      await expect(comparison).toContainText('Changed settings: Damping ratio (%)');
      await expect(comparison).toContainText('Both trials use the same ground motion');
      await captureImmersiveRegion(page, comparison, 'bridge-' + width + '-comparison-table.png', COMPARISON_REPORT);
      if (width === 320) {
        const tableRegion = page.getByRole('region', { name: 'Saved earthquake trial comparison table', exact: true });
        await expect(tableRegion.locator('[data-seismic-cell-label]').first()).toBeVisible();
        expect(await tableRegion.evaluate(element => {
          const bounds = element.getBoundingClientRect();
          return [...element.querySelectorAll('[data-seismic-cell-value]')].every(value => {
            const box = value.getBoundingClientRect();
            return box.left >= bounds.left && box.right <= bounds.right;
          });
        })).toBe(true);
      }
      await checkWorkflowHealth(page);
      const expectedRows = await comparison.locator('tbody').textContent();
      await page.getByRole('button', { name: 'Open earthquake evidence report', exact: true }).click();
      const printed = page.locator('[data-bridge-print-seismic]');
      await expect(printed.locator('[data-seismic-trial-comparison]')).toContainText('Reference: Added damping: 20%');
      expect(await printed.locator('[data-seismic-trial-comparison] tbody').textContent()).toBe(expectedRows);
      await expect(printed.locator('button,input,select,textarea')).toHaveCount(0);
      await captureImmersiveRegion(page, printed, 'bridge-' + width + '-comparison-report.png', COMPARISON_REPORT);
      await checkWorkflowHealth(page);
    });
  }

  test.describe('earthquake frequency investigation', () => {
    test.use({ hasTouch: true });
    for (const width of [1000, 320]) {
      test('scan, select, inspect and compare damping at ' + width + 'px', async ({ page }) => {
        await mkdir(FREQUENCY_REPORT, { recursive: true });
        await mountWorkflow(page, width, { bridgeView: 'immersive', seismicEnabled: true,
          seismicTime: 6, seismicFrequencyHz: 2, seismicDampingRatio: 0.05 });
        const stage = page.locator('[data-allo-fs-stage]');
        const before = await page.evaluate(() => (window as any).__gl());
        const scan = page.locator('[data-bridge-seismic-scan]');
        await scan.locator('summary').click();
        await expect(scan.locator('[data-seismic-scan-status]')).toHaveAttribute('data-seismic-scan-status', 'idle');
        await page.getByRole('button', { name: 'Run frequency scan', exact: true }).click();
        await expect(scan.locator('[data-seismic-scan-status]')).toHaveAttribute('data-seismic-scan-status', 'complete', { timeout: 60000 });
        const points = (await scan.locator('[data-seismic-scan-curve]').getAttribute('points'))!.split(' ');
        expect(points.length).toBe(57);
        expect(points.join(' ')).not.toMatch(/NaN|Infinity/);
        expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(6);
        const slider = page.getByRole('slider', { name: 'Select scanned frequency (Hz)', exact: true });
        await slider.scrollIntoViewIfNeeded();
        const box = await slider.boundingBox();
        if (!box) throw new Error('Frequency curve is not visible');
        if (width === 320) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        else {
          await page.mouse.move(box.x + box.width / 4, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
          await page.mouse.up();
        }
        await expect(slider).toHaveAttribute('aria-valuenow', '1.6');
        await expect(slider).toBeFocused();
        await slider.press('Home');
        await expect(page.getByRole('button', { name: 'Previous frequency', exact: true })).toBeDisabled();
        await slider.press('PageUp');
        await expect(slider).toHaveAttribute('aria-valuenow', '0.45');
        await slider.press('End');
        await expect(page.getByRole('button', { name: 'Next frequency', exact: true })).toBeDisabled();
        await page.getByRole('button', { name: 'Select largest response', exact: true }).click();
        const selected = Number(await slider.getAttribute('aria-valuenow'));
        expect(selected).toBeGreaterThanOrEqual(1);
        expect(selected).toBeLessThanOrEqual(1.2);
        expect(await page.evaluate(() => (window as any).__bucket().seismicFrequencyHz)).toBe(2);
        const baselinePeak = await scan.locator('[data-seismic-scan-selected]').evaluate(element => parseFloat(element.children[1].textContent!.split(': ')[1]));
        await captureImmersiveRegion(page, scan, 'bridge-' + width + '-frequency-motion.png', FREQUENCY_REPORT);
        await page.getByRole('button', { name: 'Inspect this frequency', exact: true }).click();
        await expect(page.locator('[aria-describedby="bridge-gl-description"]')).toBeFocused();
        await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicFrequencyHz)).toBe(selected);
        expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
        await stage.scrollIntoViewIfNeeded();
        await expect.poll(() => page.evaluate(() => (window as any).__gl().relativeOffsetM)).not.toBe(before.relativeOffsetM);
        expect(await page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
        await captureImmersiveRegion(page, stage, 'bridge-' + width + '-frequency-inspection.png', FREQUENCY_REPORT);
        await page.getByRole('textbox', { name: 'Earthquake trial name', exact: true }).fill('Largest scanned motion: 5% damping');
        await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
        expect(await page.evaluate(() => (window as any).__bucket().seismicTrials[0].inputs.groundFrequencyHz)).toBe(selected);
        await page.locator('[data-bridge-seismic] summary').click();
        await page.getByRole('button', { name: 'Try 20% damping', exact: true }).click();
        await expect(scan.locator('[data-seismic-scan-status]')).toHaveAttribute('data-seismic-scan-status', 'stale');
        await expect(scan.locator('[data-seismic-scan-results]')).toHaveCount(0);
        await page.getByRole('button', { name: 'Run frequency scan', exact: true }).click();
        await expect(scan.locator('[data-seismic-scan-status]')).toHaveAttribute('data-seismic-scan-status', 'complete', { timeout: 60000 });
        await page.getByRole('button', { name: 'Select largest response', exact: true }).click();
        const dampedPeak = await scan.locator('[data-seismic-scan-selected]').evaluate(element => parseFloat(element.children[1].textContent!.split(': ')[1]));
        expect(dampedPeak).toBeLessThan(baselinePeak);
        await page.getByRole('combobox', { name: 'Frequency scan measure', exact: true }).selectOption('acceleration');
        await expect(slider).toHaveAttribute('aria-valuetext', / g$/);
        await page.getByRole('button', { name: 'Select largest response', exact: true }).click();
        await captureImmersiveRegion(page, scan, 'bridge-' + width + '-frequency-acceleration.png', FREQUENCY_REPORT);
        await page.getByRole('button', { name: 'Inspect this frequency', exact: true }).click();
        expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
        await checkWorkflowHealth(page);
      });
    }
    test('zero-input scan remains usable in reduced-motion 2D mode', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mountWorkflow(page, 320, { seismicEnabled: true, seismicIntensityG: 0 });
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      const scan = page.locator('[data-bridge-seismic-scan]');
      await scan.locator('summary').click();
      await page.getByRole('button', { name: 'Run frequency scan', exact: true }).click();
      await expect(scan.locator('[data-seismic-scan-status]')).toHaveAttribute('data-seismic-scan-status', 'complete', { timeout: 60000 });
      await expect(scan).toContainText('All responses are zero');
      await expect(page.getByRole('button', { name: 'Select largest response', exact: true })).toBeDisabled();
      await page.getByRole('button', { name: 'Next frequency', exact: true }).click();
      await page.getByRole('button', { name: 'Inspect this frequency', exact: true }).click();
      await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
      expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(0);
      expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
      await checkWorkflowHealth(page);
    });
  });

  for (const width of [1000, 320]) {
    test('bridge viewpoints: deliberate camera presets and energy inside the scene at ' + width + 'px', async ({ page }) => {
      await mountWorkflow(page, width, { bridgeView: 'immersive', seismicEnabled: true, seismicTime: 7.2,
        seismicObservation: 'Watch energy transfer after the shaking ends.' });
      const stage = page.locator('[data-allo-fs-stage]');
      const viewer = page.locator('[aria-describedby="bridge-gl-description"]');
      const readout = page.getByRole('group', { name: 'Earthquake scene readout', exact: true });
      const summary = page.locator('[data-bridge-scene-energy] summary');
      const frame = page.locator('[data-bridge-scene-energy-frame]');
      const before = await page.evaluate(() => (window as any).__gl());
      await expect(frame).toHaveCount(0);
      await expect(readout).toHaveAttribute('aria-live', 'off');
      await expect(page.getByRole('button', { name: 'Along the deck', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await captureImmersiveRegion(page, page.getByRole('group', { name: 'Bridge viewpoints', exact: true }), `bridge-${width}-viewpoints.png`);

      await page.getByRole('button', { name: 'River overlook', exact: true }).click();
      await expect(viewer).toBeFocused();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraDirection[2])).toBeGreaterThan(0.9);
      await expect(page.getByRole('button', { name: 'River overlook', exact: true })).toHaveAttribute('aria-pressed', 'true');
      const riverDirection = await page.evaluate(() => (window as any).__gl().cameraDirection);
      await summary.press('Enter');
      await expect(frame).toHaveAttribute('data-bridge-scene-energy-frame', '7.2');
      await expect(page.locator('[data-bridge-scene-phase]')).toHaveText('Shaking phase');
      expect(await page.evaluate(() => (window as any).__gl().cameraDirection)).toEqual(riverDirection);
      const limit = Number(await frame.getAttribute('data-energy-limit'));
      const segments = await frame.locator('[data-scene-energy-part]').evaluateAll(elements => elements.map(element => ({
        value: Number(element.getAttribute('data-energy-value')), width: parseFloat((element as HTMLElement).style.width)
      })));
      expect(segments).toHaveLength(3);
      for (const segment of segments) expect(segment.width).toBeCloseTo(segment.value / limit * 100, 4);
      await captureImmersiveRegion(page, stage, `bridge-${width}-river-energy.png`);

      await page.getByRole('button', { name: 'Look back toward entrance', exact: true }).click();
      await expect(viewer).toBeFocused();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraDirection[0])).toBeLessThan(-0.99);
      expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(7.2);
      await captureImmersiveRegion(page, stage, `bridge-${width}-entrance-energy.png`);
      await page.getByRole('button', { name: 'Along the deck', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraDirection[0])).toBeGreaterThan(0.99);
      await page.getByRole('button', { name: 'Inspect end of shaking', exact: true }).click();
      await expect(frame).toHaveAttribute('data-bridge-scene-energy-frame', '16');
      await expect(page.locator('[data-bridge-scene-phase]')).toHaveText('Free vibration');
      expect(Number(await frame.getAttribute('data-energy-limit'))).toBe(limit);

      async function checkSceneBounds() {
        await stage.scrollIntoViewIfNeeded();
        expect(await readout.evaluate(element => {
          const box = element.getBoundingClientRect();
          const replay = document.querySelector('[data-bridge-scene-replay]')!.getBoundingClientRect();
          const summary = element.querySelector('summary')!;
          return { gap: replay.top - box.bottom, overflow: element.scrollWidth - element.clientWidth,
            summaryOverflow: summary.scrollWidth - summary.clientWidth };
        })).toMatchObject({ overflow: 0, summaryOverflow: 0 });
        const gap = await readout.evaluate(element => document.querySelector('[data-bridge-scene-replay]')!.getBoundingClientRect().top - element.getBoundingClientRect().bottom);
        expect(gap, 'readout leaves the replay controls uncovered').toBeGreaterThanOrEqual(4);
      }
      await checkSceneBounds();
      await captureImmersiveRegion(page, stage, `bridge-${width}-walkway-energy.png`);
      if (width === 320) await stage.evaluate(element => {
        Object.defineProperty(element, 'requestFullscreen', { configurable: true,
          value: () => Promise.reject(new Error('Exercise fill-frame canvas sizing')) });
      });
      await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
      const exit = page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true });
      await expect(exit).toBeVisible();
      await checkBridgeCanvasFillsStage(page);
      await checkSceneBounds();
      await expect(summary).toBeVisible();
      await stage.screenshot({ path: join(ENHANCEMENT_REPORT, `bridge-${width}-fullscreen-energy.png`) });
      await summary.press('Enter');
      await expect(frame).toHaveCount(0);
      await summary.press('Enter');
      await expect(frame).toHaveCount(1);
      await page.getByRole('slider', { name: 'Scene replay time (s)', exact: true }).press('End');
      await expect(frame).toHaveAttribute('data-bridge-scene-energy-frame', '24');
      expect(Number(await frame.getAttribute('data-energy-limit'))).toBe(limit);
      await exit.click();
      await checkBridgeCanvasFillsStage(page);

      await page.getByRole('button', { name: '3D structure', exact: true }).click();
      await checkSceneBounds();
      await captureImmersiveRegion(page, stage, `bridge-${width}-orbit-energy.png`);
      await page.getByRole('button', { name: 'On the bridge', exact: true }).click();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.getByRole('button', { name: 'River overlook', exact: true }).click();
      await expect(viewer).toBeFocused();
      await expect(page.getByRole('button', { name: 'Replay scene', exact: true })).toBeDisabled();
      expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(24);
      expect(await page.evaluate(() => (window as any).__bucket().seismicObservation)).toBe('Watch energy transfer after the shaking ends.');
      await expect.poll(() => page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
      await checkWorkflowHealth(page);
    });
  }

  for (const width of [1000, 320]) {
    test('guided damping: predict, compare scenes, preserve evidence and print at ' + width + 'px', async ({ page }) => {
      await mountWorkflow(page, width, { bridgeView: 'immersive', seismicEnabled: true, seismicTime: 7.2,
        seismicPrediction: 'Keep my notebook prediction.', seismicObservation: 'Keep my notebook evidence.' });
      await page.locator('[data-bridge-guide-disclosure] summary').press('Enter');
      const guide = page.locator('[data-bridge-damping-guide="interactive"]');
      await page.getByLabel('Damping investigation prediction', { exact: true }).fill('At 20% damping, less motion and stored energy will remain after shaking stops.');
      await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      await expect(guide.locator('[data-guide-feedback]')).toContainText('Damping is the only input');
      expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
      const chart = page.getByRole('slider', { name: 'Inspect earthquake timeline (s)', exact: true });
      await chart.press('Home');
      for (let i = 0; i < 8; i++) await chart.press('PageUp');
      await page.getByRole('button', { name: 'Compare damping scenes', exact: true }).click();
      await expect(page.locator('[aria-describedby="bridge-gl-description"]')).toBeFocused();
      const stage = page.locator('[data-allo-fs-stage]');
      const before = await page.evaluate(() => (window as any).__gl());
      await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
      await checkBridgeCanvasFillsStage(page);
      await page.locator('[data-bridge-scene-energy] summary').press('Enter');
      const scale = await page.locator('[data-bridge-scene-energy-frame]').getAttribute('data-energy-limit');
      await stage.screenshot({ path: join(ENHANCEMENT_REPORT, `bridge-${width}-damping-b.png`) });
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      await expect(page.locator('[data-bridge-scene-readout]')).toHaveAttribute('data-scene-trial', 'reference');
      await expect.poll(() => page.evaluate(() => (window as any).__gl().relativeOffsetM)).not.toBe(before.relativeOffsetM);
      expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(8);
      await expect(page.locator('[data-bridge-scene-energy-frame]')).toHaveAttribute('data-energy-limit', scale!);
      expect(await page.evaluate(() => (window as any).__gl().cameraDirection)).toEqual(before.cameraDirection);
      expect(await page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
      await stage.screenshot({ path: join(ENHANCEMENT_REPORT, `bridge-${width}-damping-a.png`) });
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().relativeOffsetM)).toBeCloseTo(before.relativeOffsetM, 9);
      const separation = await page.locator('[data-bridge-scene-readout]').evaluate(element =>
        document.querySelector('[data-bridge-scene-replay]')!.getBoundingClientRect().top - element.getBoundingClientRect().bottom);
      expect(separation).toBeGreaterThan(4);
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      await page.getByRole('button', { name: 'Replay scene', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBeGreaterThan(8);
      await page.getByRole('button', { name: 'Pause scene replay', exact: true }).click();
      const sharedTime = await page.evaluate(() => (window as any).__bucket().seismicTime);
      expect(Number(await page.locator('[data-bridge-scene-energy-frame]').getAttribute('data-bridge-scene-energy-frame'))).toBeCloseTo(sharedTime, 8);
      expect(Number(await guide.locator('[data-guide-readings="current"]').getAttribute('data-guide-time'))).toBeCloseTo(sharedTime, 8);
      await expect(page.locator('[data-bridge-scene-readout]')).toHaveAttribute('data-scene-trial', 'reference');
      await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
      await page.getByRole('button', { name: 'Inspect both at 16 s', exact: true }).click();
      await page.getByRole('button', { name: 'Record paired evidence', exact: true }).click();
      await expect(guide.locator('[data-guide-evidence]')).toHaveAttribute('data-guide-evidence', 'matching');
      await expect(guide.locator('[data-guide-readings="recorded"]')).toHaveAttribute('data-guide-time', '16');
      await expect(guide.locator('[data-guide-readings="recorded"] [data-guide-measure="3"] [data-guide-value="b"]')).toContainText('<0.001 J/kg');
      await page.getByLabel('Claim from the damping comparison', { exact: true }).fill('B has less relative motion in this experiment.');
      await page.getByLabel('Evidence and energy explanation', { exact: true }).fill('I compared the peak motion and the energy still stored at 16 seconds. Damping removes mechanical energy.');
      const recorded = await guide.locator('[data-guide-readings="recorded"]').textContent();
      await captureImmersiveRegion(page, guide.locator('[data-guide-readings="recorded"]'), `bridge-${width}-paired-evidence.png`);
      await page.locator('[data-bridge-seismic] summary').click();
      await page.getByRole('slider', { name: 'Ground shaking frequency (Hz)', exact: true }).press('End');
      await expect(guide.locator('[data-guide-feedback]')).toContainText('Response mode or ground motion differs');
      await expect(guide.locator('[data-guide-evidence]')).toHaveAttribute('data-guide-evidence', 'earlier');
      expect(await guide.locator('[data-guide-readings="recorded"]').textContent()).toBe(recorded);
      expect(await page.evaluate(() => (window as any).__bucket().seismicPrediction)).toBe('Keep my notebook prediction.');
      expect(await page.evaluate(() => (window as any).__bucket().seismicObservation)).toBe('Keep my notebook evidence.');
      await page.getByRole('button', { name: 'Open investigation report', exact: true }).click();
      const report = page.locator('[data-bridge-damping-guide="print"]');
      expect(await report.locator('[data-guide-readings="recorded"]').textContent()).toBe(recorded);
      await expect(report).toContainText('Damping removes mechanical energy.');
      await expect(report.locator('button,input,textarea')).toHaveCount(0);
      await captureImmersiveRegion(page, report, `bridge-${width}-guided-report.png`);
      await checkWorkflowHealth(page);
    });

    test('guided damping: qualitative case-study steps and reduced motion at ' + width + 'px', async ({ page }) => {
      await mountWorkflow(page, width);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const selectedCase of ['tacoma', 'millennium']) {
        await page.evaluate(selected => (window as any).__set({ tab: 'cases', selectedCase: selected }), selectedCase);
        const illustration = page.locator('[data-bridge-dynamics]');
        await expect(illustration).toContainText('do not predict wind speed, crowd limits');
        const steps = illustration.getByRole('group', { name: 'Illustration steps', exact: true }).getByRole('button');
        await steps.nth(2).press('Enter');
        await expect(illustration.locator('[data-dynamics-step]')).toHaveAttribute('data-dynamics-step', '2');
        await expect(steps.nth(2)).toHaveAttribute('aria-pressed', 'true');
        await expect(illustration.locator('input[type="range"]')).toHaveCount(0);
        await captureImmersiveRegion(page, illustration, `bridge-${width}-${selectedCase}-mechanism.png`);
        await checkWorkflowHealth(page);
      }
      await page.getByRole('button', { name: 'Investigate damping and energy', exact: true }).click();
      await expect(page.locator('[data-bridge-damping-guide="interactive"]')).toBeVisible();
      await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Run earthquake', exact: true })).toBeDisabled();
      await page.getByRole('button', { name: 'Inspect both at 24 s', exact: true }).click();
      await expect(page.locator('[data-guide-readings="current"]')).toHaveAttribute('data-guide-time', '24');
      expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
      await checkWorkflowHealth(page);
    });
  }

  for (const width of [1000, 320]) {
    test('motion guide: fixed references, A/B scale, fullscreen and fallback at ' + width + 'px', async ({ page }) => {
      await mountWorkflow(page, width, { bridgeView: 'immersive', seismicEnabled: true, seismicTime: 7.2,
        seismicGuideOpen: true, crossSectionMm2: 30000, lateralBraceEvery: 1 });
      const stage = page.locator('[data-allo-fs-stage]');
      const guide = page.locator('[data-bridge-motion-guide="scene"]');
      const summary = guide.locator('summary');
      const frame = page.locator('[data-motion-frame]');
      await expect(frame).toHaveCount(0);
      await summary.press('Enter');
      await expect(frame).toHaveAttribute('data-motion-frame', '7.2');
      await expect.poll(() => page.evaluate(() => (window as any).__gl().motionReferenceVisible)).toBe(true);
      const before = await page.evaluate(() => (window as any).__gl());
      expect(before.motionReferencePosition).toEqual([0, 0, 0]);
      async function checkReadings() {
        await stage.scrollIntoViewIfNeeded();
        const values = await frame.locator('[data-motion-reading]').evaluateAll(nodes =>
          Object.fromEntries(nodes.map(node => [node.getAttribute('data-motion-reading'), Number(node.getAttribute('data-motion-value-m'))])));
        await expect.poll(() => page.evaluate(() => (window as any).__gl().deckOffsetM)).toBeCloseTo(values.deck, 9);
        await expect.poll(() => page.evaluate(() => (window as any).__gl().groundOffsetM)).toBeCloseTo(values.ground, 9);
        expect(values.deck - values.ground).toBeCloseTo(values.relative, 9);
        expect(await frame.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
      }
      await checkReadings();
      const lastReading = frame.locator('[data-motion-reading="relative"]');
      expect(await lastReading.evaluate(element => element.getBoundingClientRect().bottom
        - element.closest('[data-bridge-scene-readout]')!.getBoundingClientRect().bottom),
        'all three measurements fit the compact scene panel').toBeLessThanOrEqual(-2);
      await captureImmersiveRegion(page, stage, 'bridge-' + width + '-motion-guide.png');
      await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      await page.getByRole('button', { name: 'Inspect both at 16 s', exact: true }).click();
      await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
      await checkBridgeCanvasFillsStage(page);
      await page.evaluate(() => (window as any).__set({ seismicTime: 8 }));
      // The outline, two trails and shared marker first upload when comparison is visible.
      // Measure that initial allocation separately from repeated replay and toggles.
      await expect.poll(() => page.evaluate(() => (window as any).__gl().resources.geometries)).toBe(before.resources.geometries + 4);
      const comparisonResources = await page.evaluate(() => (window as any).__gl().resources);
      expect(comparisonResources.textures).toBe(before.resources.textures);
      const range = await frame.getAttribute('data-motion-range-m');
      await checkReadings();
      const b = await frame.locator('[data-motion-reading="deck"]').getAttribute('data-motion-value-m');
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      await expect(frame).toHaveAttribute('data-motion-trial', 'reference');
      await expect(frame).toHaveAttribute('data-motion-range-m', range!);
      expect(await frame.locator('[data-motion-reading="deck"]').getAttribute('data-motion-value-m')).not.toBe(b);
      await checkReadings();
      await stage.screenshot({ path: join(ENHANCEMENT_REPORT, 'bridge-' + width + '-motion-a-fullscreen.png') });
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      await expect(frame).toHaveAttribute('data-motion-range-m', range!);
      await expect(frame.locator('[data-motion-reading="deck"]')).toHaveAttribute('data-motion-value-m', b!);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.getByRole('slider', { name: 'Scene replay time (s)', exact: true }).press('End');
      await expect(frame).toHaveAttribute('data-motion-frame', '24');
      await expect(frame).toHaveAttribute('data-motion-range-m', range!);
      await expect(page.getByRole('button', { name: 'Replay scene', exact: true })).toBeDisabled();
      await summary.press('Enter');
      await expect(frame).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => (window as any).__gl().motionReferenceVisible)).toBe(false);
      await summary.press('Enter');
      await expect.poll(() => page.evaluate(() => (window as any).__gl().motionReferenceVisible)).toBe(true);
      expect(await page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
      expect(await page.evaluate(() => (window as any).__gl().resources)).toEqual(comparisonResources);
      await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
      await page.getByRole('button', { name: '3D structure', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicSceneCompare: false, seismicTime: 7.2 }));
      await stage.scrollIntoViewIfNeeded();
      await checkReadings();
      await captureImmersiveRegion(page, stage, 'bridge-' + width + '-motion-orbit.png');
      await page.evaluate(() => (window as any).__set({ bridgeView: '2d', seismicIntensityG: 0 }));
      await expect(page.locator('[data-bridge-motion-guide="fallback"]')).toBeVisible();
      await expect(frame).toHaveAttribute('data-motion-trial', 'current');
      await expect(frame.locator('[data-motion-reading]')).toHaveText(['Ground from rest0.00 cm', 'Deck from rest0.00 cm', 'Deck relative to ground0.00 cm']);
      await expect(frame).toContainText('Current experiment');
      await page.getByRole('button', { name: 'Step forward 0.5 s', exact: true }).click();
      await expect(frame).toHaveAttribute('data-motion-frame', '7.7');
      await captureImmersiveRegion(page, page.locator('[data-bridge-motion-guide="fallback"]'), 'bridge-' + width + '-motion-fallback.png');
      await page.getByLabel('Earthquake experiment', { exact: true }).uncheck();
      await expect(page.locator('[data-bridge-motion-guide]')).toHaveCount(0);
      await checkWorkflowHealth(page);
    });
  }

  for (const width of [1000, 320]) {
    test('key moments: selected trial peaks, compact controls and fullscreen at ' + width + 'px', async ({ page }) => {
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicGuideOpen: true, seismicTime: 7, crossSectionMm2: 30000, lateralBraceEvery: 1,
        seismicObservation: 'Keep this comparison.' });
      const stage = page.locator('[data-allo-fs-stage]');
      const select = page.getByRole('combobox', { name: 'Scene key moments', exact: true });
      const readout = page.locator('[data-bridge-scene-readout]');
      const replay = page.locator('[data-bridge-scene-replay]');
      async function checkOverlayFit() {
        const panel = await replay.boundingBox(), measurements = await readout.boundingBox();
        if (!panel || !measurements) throw new Error('Scene controls missing');
        expect(measurements.y + measurements.height).toBeLessThanOrEqual(panel.y - 4);
        expect(await replay.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
        const containers = await stage.boundingBox();
        if (!containers) throw new Error('Stage missing');
        expect(panel.x).toBeGreaterThan(containers.x);
        expect(panel.x + panel.width).toBeLessThan(containers.x + containers.width);
      }
      await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      await stage.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => (window as any).__gl());
      const bTime = Number(await select.locator('option[value="motion"]').getAttribute('data-moment-time'));
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      const aTime = Number(await select.locator('option[value="motion"]').getAttribute('data-moment-time'));
      expect(aTime).not.toBe(bTime);
      await select.selectOption('motion');
      expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(aTime);
      expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
      await expect(page.locator('[data-bridge-moment-insight="motion"]')).toHaveAttribute('data-moment-trial', 'reference');
      await page.getByRole('button', { name: 'B · current', exact: true }).click();
      expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(aTime);
      await expect(select).toHaveValue('');
      await page.getByRole('button', { name: 'Replay scene', exact: true }).click();
      await select.selectOption('motion');
      expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(bTime);
      expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
      await checkOverlayFit();
      await captureImmersiveRegion(page, stage, 'bridge-' + width + '-key-moments-inline.png');
      await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
      await checkBridgeCanvasFillsStage(page);
      await checkOverlayFit();
      await page.locator('[data-bridge-scene-energy] > summary').press('Enter');
      await stage.screenshot({ path: join(ENHANCEMENT_REPORT, 'bridge-' + width + '-key-moments-fullscreen.png') });
      await readout.locator(':scope > summary').press('Enter');
      await select.selectOption('free');
      await expect(readout).toContainText('16.00 s');
      await expect(select).not.toHaveAttribute('aria-describedby');
      await readout.locator(':scope > summary').press('Enter');
      await expect(page.locator('[data-bridge-moment-insight="free"]')).toContainText('Ground motion has ended');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await select.focus();
      await select.press('End');
      await select.press('Tab');
      await expect(select).toHaveValue('end');
      await expect(page.locator('[data-bridge-moment-insight="end"]')).toContainText('does not mean the deck has settled');
      await expect(page.getByRole('button', { name: 'Replay scene', exact: true })).toBeDisabled();
      await checkOverlayFit();
      expect(await page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
      expect(await page.evaluate(() => (window as any).__bucket().bridgeObserver)).toBe('bank');
      expect(await page.evaluate(() => (window as any).__bucket().seismicObservation)).toBe('Keep this comparison.');
      await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
      await checkWorkflowHealth(page);
    });
  }

  test('key moments: zero-input boundaries and precise manual time remain usable', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mountWorkflow(page, 320, { bridgeView: 'immersive', seismicEnabled: true, seismicIntensityG: 0, seismicTime: 5 });
    const select = page.getByRole('combobox', { name: 'Scene key moments', exact: true });
    await expect(select.locator('option[value="motion"]')).toBeDisabled();
    await expect(select.locator('option[value="acceleration"]')).toBeDisabled();
    await select.selectOption('free');
    await expect(page.locator('[data-bridge-moment-insight]')).toContainText('No ground motion was applied');
    await expect(page.locator('[data-bridge-moment-insight]')).toContainText('0.000 J/kg');
    await page.getByRole('slider', { name: 'Scene replay time (s)', exact: true }).press('ArrowRight');
    await expect(select).toHaveValue('');
    await expect(page.locator('[data-bridge-moment-insight]')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(16.05);
    await select.selectOption('end');
    expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(24);
    await checkWorkflowHealth(page);
  });


  for (const width of [1000,320]) {
    test('claim interval: follow the question, choose signed evidence and print at '+width+'px',async({page})=>{
      await page.emulateMedia({reducedMotion:'reduce'});
      await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicEnergyInterval:true,seismicTime:12.319,seismicIntervalPinS:7.217,seismicTrialName:'Energy reference',seismicPrediction:'Keep my prediction',seismicObservation:'Keep my explanation'});
      await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();
      await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();
      await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2}));
      const disclosure=page.locator('[data-claim-evidence-disclosure]'),summary=disclosure.locator(':scope > summary'),card=disclosure.locator('[data-claim-window="interval"]'),select=card.getByRole('combobox',{name:'Interval evidence quantity',exact:true});
      await summary.focus();await summary.press('Enter');await expect(disclosure).toHaveAttribute('open','');
      await expect(select).toHaveValue('question');await expect(card).toHaveAttribute('data-claim-interval-measure','damping');await expect(card.locator('[data-claim-interval-scope]')).toContainText('B · current · Custom interval');
      const fields={input:'input',damping:'damping',stored:'stored',kinetic:'kinetic',elastic:'elastic'};
      async function checkValues(key:keyof typeof fields) {
        await expect(card).toHaveAttribute('data-claim-interval-measure',key);
        for(const trial of ['reference','current']) {
          const expected=await page.locator('[data-investigation-evidence="comparison"] [data-evidence-row="'+fields[key]+'"] [data-evidence-trial="'+trial+'"]').getAttribute('data-evidence-value');
          await expect(card.locator('[data-claim-trial="'+trial+'"]')).toHaveAttribute('data-claim-value',expected!);
        }
      }
      await page.getByRole('button',{name:'Ground removes energy',exact:true}).click();await checkValues('input');await expect(card.locator('[data-claim-interval-question]')).toHaveAttribute('data-claim-interval-question','returning');expect(Number(await card.locator('[data-claim-trial="current"]').getAttribute('data-claim-value'))).toBeLessThan(0);await expect(card.locator('[data-claim-sentence-frame]')).toContainText('net ground input work');
      await captureImmersiveRegion(page,disclosure,'bridge-'+width+'-claim-return.png',ENHANCEMENT_REPORT);
      await page.evaluate(()=>(window as any).__set({seismicPlaying:true,autoDriving:true}));await select.focus();await select.press('End');await expect(select).toHaveValue('elastic');await checkValues('elastic');await expect(select).toBeFocused();expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicPlaying:false,autoDriving:false});
      for(const key of Object.keys(fields) as (keyof typeof fields)[]) {await select.selectOption(key);await checkValues(key);await expect(card).toHaveAttribute('data-claim-measure-source','manual');}
      const before=await card.locator('[data-claim-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-claim-value')));await page.getByRole('button',{name:'Swap moments',exact:true}).click();expect(await card.locator('[data-claim-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-claim-value')))).toEqual(before);
      await select.selectOption('input');await page.getByRole('button',{name:'After shaking',exact:true}).click();await checkValues('input');await expect(card).toHaveAttribute('data-claim-measure-source','manual');await expect(card.locator('[data-claim-interval-question]')).toHaveAttribute('data-claim-interval-question','settling');expect(Number(await card.locator('[data-claim-trial="current"]').getAttribute('data-claim-value'))).toBe(0);
      await select.selectOption('question');await checkValues('damping');await page.getByRole('button',{name:'Elastic → kinetic',exact:true}).click();await checkValues('kinetic');await expect(card.locator('[data-claim-interval-help]')).toContainText('different points in their cycles');await expect(card.locator('[data-claim-sentence-frame]')).toContainText('kinetic energy changed');await captureImmersiveRegion(page,disclosure,'bridge-'+width+'-claim-exchange.png',ENHANCEMENT_REPORT);
      await page.evaluate(()=>(window as any).__set({seismicIntensityG:0.000001}));await page.getByRole('button',{name:'Ground removes energy',exact:true}).click();await checkValues('input');await expect(card.locator('[data-claim-trial="current"]')).toContainText('e-');await expect(disclosure.locator('[data-claim-scientific-help]')).toBeVisible();await captureImmersiveRegion(page,disclosure,'bridge-'+width+'-claim-small.png',ENHANCEMENT_REPORT);
      await page.getByRole('button',{name:'Pin this frame',exact:true}).click();await expect(card).toHaveAttribute('data-claim-interval-measure','damping');await expect(card.locator('[data-claim-interval-question]')).toHaveCount(0);expect(await card.locator('[data-claim-value]').evaluateAll(nodes=>nodes.every(n=>Number(n.getAttribute('data-claim-value'))===0))).toBe(true);
      await page.evaluate(()=>(window as any).__set({seismicTime:12.319,seismicIntervalPinS:7.217}));await select.selectOption('stored');await checkValues('stored');const printedValues=await disclosure.locator('[data-claim-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-claim-value')));
      await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();const print=page.locator('[data-claim-evidence="print"]');await expect(print.locator('[data-claim-window="interval"]')).toHaveAttribute('data-claim-interval-measure','stored');expect(await print.locator('[data-claim-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-claim-value')))).toEqual(printedValues);await expect(print.locator('select,button,input,textarea')).toHaveCount(0);await page.emulateMedia({media:'print'});await captureImmersiveRegion(page,print,'bridge-'+width+'-claim-selected-print.png',ENHANCEMENT_REPORT);await page.emulateMedia({media:'screen'});
      expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicPrediction:'Keep my prediction',seismicObservation:'Keep my explanation',seismicTime:12.319,seismicIntervalPinS:7.217});await checkWorkflowHealth(page);
    });
  }
  test('claim interval: manual quantity and notebook provenance survive scene graphics loss',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicEnergyInterval:true,seismicTime:7.217,seismicIntervalPinS:12.319,seismicTrialName:'Notebook reference',seismicObservation:'Keep notebook explanation',seismicSceneNote:'Keep scene note'});
    await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicGuideOpen:true}));await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicTime:7.217,seismicIntervalPinS:12.319}));await page.getByRole('button',{name:'A · reference',exact:true}).click();
    const disclosure=page.locator('[data-claim-evidence-disclosure]'),card=disclosure.locator('[data-claim-window="interval"]'),select=card.getByRole('combobox',{name:'Interval evidence quantity',exact:true});await disclosure.locator('summary').click();await select.selectOption('kinetic');const before=await card.textContent(),values=await card.locator('[data-claim-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-claim-value')));await expect(card.locator('[data-claim-interval-scope]')).toContainText('B · current');await captureImmersiveRegion(page,disclosure,'bridge-844-claim-scene.png',ENHANCEMENT_REPORT);
    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement,gl=canvas.getContext('webgl2')||canvas.getContext('webgl'),loss=gl?.getExtension('WEBGL_lose_context');if(!loss)throw Error('No graphics loss extension');(window as any).__claimIntervalLoss=loss;loss.loseContext();});await expect(page.locator('[data-bridge-elevation]')).toBeVisible();await expect(select).toHaveValue('kinetic');expect(await card.textContent()).toBe(before);expect(await card.locator('[data-claim-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-claim-value')))).toEqual(values);await captureImmersiveRegion(page,disclosure,'bridge-844-claim-fallback.png',ENHANCEMENT_REPORT);await page.evaluate(()=>(window as any).__claimIntervalLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');await expect(select).toHaveValue('kinetic');expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',seismicSceneSource:'guide',seismicSceneTrial:'reference',seismicObservation:'Keep notebook explanation',seismicSceneNote:'Keep scene note',seismicTime:7.217,seismicIntervalPinS:12.319});await checkWorkflowHealth(page);
  });
  test('claim interval: recorded guide conditions and tiny values persist in the report',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,320,{bridgeView:'3d',seismicEnabled:true,seismicGuideOpen:true,seismicIntensityG:0.000001,seismicGuidePrediction:'Keep guide prediction',seismicGuideClaim:'Keep my claim',seismicGuideReasoning:'Keep my reasoning'});await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicFrequencyHz:0.65,seismicTime:7.217}));
    const guide=page.locator('[data-bridge-damping-guide="interactive"]'),current=guide.locator('[data-guide-readings="current"]');await expect(current.locator('[data-guide-comparison-context]')).toHaveAttribute('data-guide-comparison-context','confounded');await page.getByRole('button',{name:'Record paired evidence',exact:true}).click();const recorded=guide.locator('[data-guide-readings="recorded"]');await expect(recorded.locator('[data-guide-comparison-context]')).toContainText('cannot isolate the effect of damping');await expect(recorded).toContainText('1.00e-6 g');expect(await recorded.locator('[data-guide-number]').evaluateAll(nodes=>nodes.some(n=>Number(n.getAttribute('data-guide-number'))!==0&&/e-\d/.test(n.textContent||'')))).toBe(true);
    await page.evaluate(()=>(window as any).__set({seismicFrequencyHz:1.1}));await expect(current.locator('[data-guide-comparison-context]')).toHaveAttribute('data-guide-comparison-context','controlled');await expect(recorded.locator('[data-guide-comparison-context]')).toHaveAttribute('data-guide-comparison-context','confounded');const readings=await recorded.locator('[data-guide-number]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-guide-number')));await captureImmersiveRegion(page,recorded,'bridge-320-guide-recorded-context.png',ENHANCEMENT_REPORT);
    await page.getByRole('button',{name:'Open investigation report',exact:true}).click();const print=page.locator('[data-bridge-damping-guide="print"] [data-guide-readings="recorded"]');await expect(print.locator('[data-guide-comparison-context]')).toHaveAttribute('data-guide-comparison-context','confounded');expect(await print.locator('[data-guide-number]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-guide-number')))).toEqual(readings);await expect(page.locator('[data-bridge-damping-guide="print"]').locator('select,button,input,textarea')).toHaveCount(0);await page.emulateMedia({media:'print'});await captureImmersiveRegion(page,print,'bridge-320-guide-recorded-print.png',ENHANCEMENT_REPORT);await page.emulateMedia({media:'screen'});expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicGuidePrediction:'Keep guide prediction',seismicGuideClaim:'Keep my claim',seismicGuideReasoning:'Keep my reasoning'});await checkWorkflowHealth(page);
  });

  for(const width of [1000,320]){
    test('rate history: signed power shading, fractional endpoints and keyboard inspection at '+width+'px',async({page})=>{
      await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicEnergyInterval:true,seismicTime:12.319,seismicIntervalPinS:7.217,seismicObservation:'Keep my explanation',seismicSceneNote:'Keep scene note'});await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();const detail=page.locator('[data-rate-history-disclosure="fallback"]');await expect(detail).not.toHaveAttribute('open');await detail.locator(':scope > summary').focus();await detail.locator(':scope > summary').press('Enter');await expect(detail).toHaveAttribute('open','');const frame=detail.locator('[data-rate-history]');await expect(frame).toHaveAttribute('data-rate-history-start','7.217');await expect(frame).toHaveAttribute('data-rate-history-end','12.319');await expect(frame.locator('[data-rate-curve]')).toHaveCount(2);await expect(frame.locator('[data-rate-history-provenance]')).toContainText('accumulated model work and loss');
      await expect(frame.locator('[data-rate-pattern="input"]')).toContainText('positive and negative parts');await expect(frame.locator('[data-rate-pattern="input"]')).toBeVisible();await expect(frame.locator('[data-rate-view-help]')).not.toContainText('A and B');await expect(frame).toHaveAttribute('data-rate-history-view','interval');const detailLines=await frame.locator('[data-rate-line]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('points')));await frame.getByRole('button',{name:'Full event',exact:true}).focus();await frame.getByRole('button',{name:'Full event',exact:true}).press('Enter');await expect(frame).toHaveAttribute('data-rate-history-view','event');expect(await frame.locator('[data-rate-line]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('points')))).not.toEqual(detailLines);await captureImmersiveRegion(page,detail,'bridge-'+width+'-rate-overview.png',ENHANCEMENT_REPORT);await frame.getByRole('button',{name:'Interval detail',exact:true}).click();await expect(frame).toHaveAttribute('data-rate-history-view','interval');const before=await frame.locator('[data-rate-area] path:first-child').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d'))),values=await frame.locator('[data-rate-total]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-rate-total-value')));await page.getByRole('button',{name:'Swap moments',exact:true}).click();expect(await frame.locator('[data-rate-area] path:first-child').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')))).toEqual(before);expect(await frame.locator('[data-rate-total]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-rate-total-value')))).toEqual(values);await expect(frame.locator('[data-rate-history-markers]')).toContainText('Circle: pinned moment · 12.319 s');expect(await frame.locator('[data-rate-marker]').evaluateAll(nodes=>nodes.every(n=>(n as HTMLElement).offsetWidth===16&&(n as HTMLElement).offsetHeight===16))).toBe(true);await captureImmersiveRegion(page,detail,'bridge-'+width+'-rate-transfer.png',ENHANCEMENT_REPORT);
      await page.getByRole('button',{name:'Ground removes energy',exact:true}).click();expect(Number(await frame.locator('[data-rate-total="input"]').getAttribute('data-rate-total-value'))).toBeLessThan(0);await expect(frame.locator('[data-rate-area="negative"]')).not.toHaveCount(0);expect(await frame.locator('[data-rate-curve="input"] [data-rate-marker]').evaluateAll(nodes=>{const boxes=nodes.map(n=>n.getBoundingClientRect());return Math.abs(boxes[0].x-boxes[1].x);})).toBeGreaterThan(150);await captureImmersiveRegion(page,detail,'bridge-'+width+'-rate-removal.png',ENHANCEMENT_REPORT);
      await page.getByRole('button',{name:'Pin this frame',exact:true}).click();await expect(frame.locator('[data-rate-area]')).toHaveCount(0);await expect(frame.locator('[data-rate-history-coincident]')).toContainText('instantaneous rates can still be nonzero');await expect(frame.locator('[data-rate-pattern]')).toHaveCount(0);await expect(frame.getByRole('button',{name:'Interval detail',exact:true})).toBeDisabled();await expect(frame).toHaveAttribute('data-rate-history-view','event');await page.evaluate(()=>(window as any).__set({seismicIntensityG:0.000001,seismicIntervalPinS:16,seismicTime:24}));await expect(frame.locator('[data-rate-history-scientific-help]')).toBeVisible();expect(Number(await frame.locator('[data-rate-total="damping"]').getAttribute('data-rate-total-value'))).toBeGreaterThan(0);await captureImmersiveRegion(page,detail,'bridge-'+width+'-rate-settling.png',ENHANCEMENT_REPORT);
      await page.evaluate(()=>(window as any).__set({seismicIntensityG:0}));await expect(frame.locator('[data-rate-history-zero]')).toContainText('curves stay at zero');await expect(frame.locator('[data-rate-pattern="input"]')).toContainText('stays at zero');await expect(frame.locator('[data-rate-pattern="damping"]')).toContainText('stays at zero');await expect(frame.locator('[data-rate-area]')).toHaveCount(0);await captureImmersiveRegion(page,detail,'bridge-'+width+'-rate-zero.png',ENHANCEMENT_REPORT);expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicObservation:'Keep my explanation',seismicSceneNote:'Keep scene note'});await checkWorkflowHealth(page);
    });
  }
  test('rate history: shared A/B scale, phone drawer scrolling and current graphics fallback',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,320,{bridgeView:'immersive',bridgeObserver:'bank',bridgeBankYaw:18,seismicEnabled:true,seismicEnergyInterval:true,seismicGuideOpen:true,seismicSceneNote:'Keep my note'});await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicIntervalPinS:7.217,seismicTime:12.319}));await page.setViewportSize({width:320,height:568});const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();await page.getByRole('button',{name:'Focus scene',exact:true}).click();await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();const drawer=page.locator('[data-bridge-scene-drawer]');await drawer.locator(':scope > summary').press('Enter');let detail=page.locator('[data-rate-history-disclosure="scene"]');await detail.locator(':scope > summary').press('Enter');let frame=detail.locator('[data-rate-history]');const current=await frame.locator('[data-rate-total]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-rate-total-value'))),range=await frame.getAttribute('data-rate-history-range');await frame.locator('[data-rate-curve="input"]').scrollIntoViewIfNeeded();await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-320-rate-scene.png')});await frame.locator('[data-rate-history-provenance]').scrollIntoViewIfNeeded();await expect(frame.locator('[data-rate-history-provenance]')).toBeVisible();await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-320-rate-scene-notes.png')});
    await page.getByRole('button',{name:'A · reference',exact:true}).click();await expect(frame).toHaveAttribute('data-rate-history-trial','reference');await expect(frame).toHaveAttribute('data-rate-history-range',range!);expect(await frame.locator('[data-rate-total]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-rate-total-value')))).not.toEqual(current);await frame.locator('[data-rate-curve="input"]').scrollIntoViewIfNeeded();await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-320-rate-reference.png')});expect(await drawer.evaluate(n=>n.scrollWidth-n.clientWidth)).toBeLessThanOrEqual(1);
    await stage.scrollIntoViewIfNeeded();await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement,gl=canvas.getContext('webgl2')||canvas.getContext('webgl'),loss=gl?.getExtension('WEBGL_lose_context');if(!loss)throw Error('No graphics loss extension');(window as any).__rateLoss=loss;loss.loseContext();});detail=page.locator('[data-rate-history-disclosure="fallback"]');await expect(detail).toHaveAttribute('open','');frame=detail.locator('[data-rate-history]');await expect(frame).toHaveAttribute('data-rate-history-trial','current');expect(await frame.locator('[data-rate-total]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-rate-total-value')))).toEqual(current);await captureImmersiveRegion(page,detail,'bridge-320-rate-fallback.png',ENHANCEMENT_REPORT);await page.evaluate(()=>(window as any).__rateLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',bridgeBankYaw:18,seismicSceneTrial:'reference',seismicTime:12.319,seismicIntervalPinS:7.217,seismicSceneNote:'Keep my note'});await checkWorkflowHealth(page);
  });

  for(const width of [1000,320]){
    test('force motion: cycle causality, small signed values and zero damping at '+width+'px',async({page})=>{
      await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicForceLens:true,seismicEnergyOrbit:true,seismicTime:16.01,seismicSceneNote:'Keep explanation',seismicEnergyInterval:true,seismicIntervalPinS:12.319});await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();const block=page.locator('[data-force-motion="fallback"]'),mechanism=page.locator('[data-force-motion="mechanism"]');
      await page.getByRole('button',{name:'Next turning point',exact:true}).click();await expect(block).toHaveAttribute('data-force-motion-kind','stationary');await expect(block.locator('[data-force-motion-direction]')).toHaveAttribute('data-force-motion-direction','0');await expect(mechanism).toHaveAttribute('data-force-motion-kind','stationary');const time=await block.getAttribute('data-force-motion-time');await expect(block.locator('[data-force-motion-caption]')).toContainText(Number(time).toFixed(3)+' s');await captureImmersiveRegion(page,block,'bridge-'+width+'-force-turning.png',ENHANCEMENT_REPORT);
      await page.getByRole('button',{name:'Next center crossing',exact:true}).click();await expect(block).toHaveAttribute('data-force-motion-kind','centered');await expect(block.locator('[data-force-motion-direction]')).not.toHaveAttribute('data-force-motion-direction','0');await expect(block.locator('[data-force-motion-insight]')).toContainText('relative motion can continue');await captureImmersiveRegion(page,page.locator('[data-bridge-seismic-mechanism]'),'bridge-'+width+'-force-center.png',ENHANCEMENT_REPORT);
      const disclosure=block.locator('[data-force-motion-rate-details]'),summary=disclosure.locator('summary');await summary.focus();await summary.press('Enter');await expect(disclosure).toHaveAttribute('open','');await expect(disclosure).toContainText('recomputed from displayed motion');await summary.press('Enter');await expect(disclosure).not.toHaveAttribute('open');
      await page.evaluate(()=>(window as any).__set({seismicIntensityG:0.000001,seismicTime:7.217}));await expect(block.locator('[data-force-motion-scientific-help]')).toContainText('2.5e-6 means 0.0000025');await expect(block.locator('[data-force-relative-speed]')).toContainText('e-');expect(await page.locator('[data-force-reading]').evaluateAll(nodes=>nodes.every(n=>/e-\d/.test(n.textContent||'')))).toBe(true);expect(await block.locator('[data-force-motion-direction]').evaluate(node=>{const box=node.getBoundingClientRect();return [box.width,box.height];})).toEqual([80,24]);await captureImmersiveRegion(page,page.locator('[data-bridge-force-lens="fallback"]'),'bridge-'+width+'-force-small.png',ENHANCEMENT_REPORT);
      await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0}));await expect(block.locator('[data-force-motion-damping]')).toHaveAttribute('data-force-motion-damping','absent');await expect(block.locator('[data-force-motion-contribution="damping"]')).toHaveAttribute('data-force-motion-power','0');await page.evaluate(()=>(window as any).__set({seismicIntensityG:0}));await expect(block).toHaveAttribute('data-force-motion-kind','rest');await expect(block.locator('[data-force-motion-direction]')).toHaveAttribute('data-force-motion-direction','0');await expect(block.locator('[data-force-motion-scientific-help]')).toHaveCount(0);await captureImmersiveRegion(page,block,'bridge-'+width+'-force-rest.png',ENHANCEMENT_REPORT);expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicTime:7.217,seismicSceneNote:'Keep explanation',seismicIntervalPinS:12.319});await checkWorkflowHealth(page);
    });
  }
  test('force motion: selected scene reference stays attributed through a cycle inspection and graphics recovery',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',bridgeBankYaw:18,seismicEnabled:true,seismicForceLens:true,seismicEnergyOrbit:true,seismicTime:16.01,seismicTrialName:'Force reference',seismicSceneNote:'Keep scene note',seismicEnergyInterval:true,seismicIntervalPinS:12.319});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2,seismicSceneCompare:true,seismicSceneSource:'saved',seismicSceneTrial:'reference'}));let block=page.locator('[data-force-motion="scene"]');await page.getByRole('button',{name:'Next turning point',exact:true}).click();await expect(block).toHaveAttribute('data-force-motion-kind','stationary');await expect(block.locator('[data-force-motion-caption]')).toContainText('A · reference');await expect(page.locator('[data-force-motion="mechanism"] [data-force-motion-caption]')).toContainText('Current experiment');const time=await block.getAttribute('data-force-motion-time');await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement,gl=canvas.getContext('webgl2')||canvas.getContext('webgl'),extension=gl?.getExtension('WEBGL_lose_context');if(!extension)throw Error('WebGL loss extension unavailable');(window as any).__forceMotionLoss=extension;extension.loseContext();});await expect(page.locator('[data-bridge-elevation]')).toBeVisible();block=page.locator('[data-force-motion="fallback"]');await expect(block).toHaveAttribute('data-force-motion-trial','current');await expect(block).toHaveAttribute('data-force-motion-time',time!);await expect(block.locator('[data-force-motion-caption]')).toContainText('Current experiment');const current=await block.textContent();await captureImmersiveRegion(page,block,'bridge-844-force-fallback.png',ENHANCEMENT_REPORT);await page.evaluate(()=>(window as any).__forceMotionLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');expect(await block.textContent()).toBe(current);expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',bridgeBankYaw:18,seismicSceneTrial:'reference',seismicSceneNote:'Keep scene note',seismicIntervalPinS:12.319});await checkWorkflowHealth(page);
  });

  for(const width of [1000,320]){
    test('motion coherence: readable fixed markers, precise values and unequal scene trials at '+width+'px',async({page})=>{
      await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,width,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicMotionGuide:true,seismicTime:7.217,seismicTrialName:'Large reference',seismicSceneNote:'Keep scene writing',seismicEnergyInterval:true,seismicIntervalPinS:12.319});
      const guide=page.locator('[data-bridge-motion-guide]'),frame=page.locator('[data-motion-frame]');
      const checkMarkers=async()=>{const boxes=await frame.locator('[data-motion-marker]').evaluateAll(nodes=>nodes.map(node=>{const box=node.getBoundingClientRect(),rail=node.parentElement!.getBoundingClientRect();return {width:box.width,height:box.height,left:box.left,right:box.right,railLeft:rail.left,railRight:rail.right};}));expect(boxes).toHaveLength(4);for(const box of boxes){expect(box.width).toBeCloseTo(16,5);expect(box.height).toBeCloseTo(16,5);expect(box.left).toBeGreaterThanOrEqual(box.railLeft-1);expect(box.right).toBeLessThanOrEqual(box.railRight+1);}};
      await expect(frame.locator('[data-motion-caption]')).toContainText('Current experiment · 7.217 s');await checkMarkers();await captureImmersiveRegion(page,page.locator('[data-allo-fs-stage]'),'bridge-'+width+'-motion-scene.png',ENHANCEMENT_REPORT);
      await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicIntensityG:0.000001,seismicDampingRatio:0.2,seismicSceneCompare:true,seismicSceneSource:'saved',seismicSceneTrial:'current'}));const range=await frame.getAttribute('data-motion-range-m'),b=await frame.locator('[data-motion-reading="deck"]').getAttribute('data-motion-value-m');await expect(frame.locator('[data-motion-caption]')).toContainText('B · current');await expect(frame.locator('[data-motion-scientific-help]')).toContainText('2.5e-6 means 0.0000025');
      await page.getByRole('button',{name:'A · reference',exact:true}).click();await expect(frame.locator('[data-motion-caption]')).toContainText('A · reference · 7.217 s');await expect(frame).toHaveAttribute('data-motion-range-m',range!);expect(await frame.locator('[data-motion-reading="deck"]').getAttribute('data-motion-value-m')).not.toBe(b);await checkMarkers();await captureImmersiveRegion(page,guide,'bridge-'+width+'-motion-reference.png',ENHANCEMENT_REPORT);
      await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();await expect(frame).toHaveAttribute('data-motion-trial','current');await expect(frame).toHaveAttribute('data-motion-source','current');await expect(frame.locator('[data-motion-reading="deck"]')).toHaveAttribute('data-motion-value-m',b!);expect(Number(await frame.getAttribute('data-motion-range-m'))).toBeLessThan(Number(range));await expect(frame.locator('[data-motion-range-caption]')).toContainText('e-');await expect(frame.locator('[data-motion-reading="deck"] strong')).toContainText('e-');await checkMarkers();await captureImmersiveRegion(page,guide,'bridge-'+width+'-motion-small.png',ENHANCEMENT_REPORT);
      await page.evaluate(()=>(window as any).__set({seismicIntensityG:0}));await expect(frame.locator('[data-motion-zero]')).toContainText('stay at rest');await expect(frame.locator('[data-motion-range-caption]')).toHaveCount(0);await expect(frame.locator('[data-motion-scientific-help]')).toHaveCount(0);await checkMarkers();await captureImmersiveRegion(page,guide,'bridge-'+width+'-motion-zero.png',ENHANCEMENT_REPORT);expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicSceneNote:'Keep scene writing',seismicTime:7.217,seismicIntervalPinS:12.319,seismicSceneTrial:'reference'});await checkWorkflowHealth(page);
    });
  }
  test('motion coherence: selected scene A falls back to current motion and recovers without changing the investigation',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',bridgeBankYaw:18,seismicEnabled:true,seismicMotionGuide:true,seismicTime:7.217,seismicTrialName:'Notebook motion reference',seismicSceneNote:'Keep explanation',seismicEnergyInterval:true,seismicIntervalPinS:12.319});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2,seismicSceneCompare:true,seismicSceneSource:'saved',seismicSceneTrial:'reference'}));const frame=page.locator('[data-motion-frame]');await expect(frame).toHaveAttribute('data-motion-trial','reference');const a=await frame.locator('[data-motion-reading="deck"]').getAttribute('data-motion-value-m');await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement,gl=canvas.getContext('webgl2')||canvas.getContext('webgl'),extension=gl?.getExtension('WEBGL_lose_context');if(!extension)throw Error('WebGL loss extension unavailable');(window as any).__motionLoss=extension;extension.loseContext();});await expect(page.locator('[data-bridge-elevation]')).toBeVisible();await expect(frame).toHaveAttribute('data-motion-trial','current');expect(await frame.locator('[data-motion-reading="deck"]').getAttribute('data-motion-value-m')).not.toBe(a);const current=await frame.textContent();await captureImmersiveRegion(page,page.locator('[data-bridge-motion-guide="fallback"]'),'bridge-844-motion-fallback.png',ENHANCEMENT_REPORT);await page.evaluate(()=>(window as any).__motionLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');expect(await frame.textContent()).toBe(current);expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',seismicSceneTrial:'reference',bridgeBankYaw:18,seismicTime:7.217,seismicSceneNote:'Keep explanation',seismicIntervalPinS:12.319});await checkWorkflowHealth(page);
  });

  for(const width of [1000,320]){
    test('recorded maxima: shared peak inspection, signed markers and small curves at '+width+'px',async({page})=>{
      await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicTime:2,seismicTrialName:'First notebook reference',seismicPrediction:'Keep prediction',seismicObservation:'Keep explanation',seismicEnergyInterval:true,seismicIntervalPinS:12.319});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2,seismicTrialName:'Second notebook reference'}));await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.1}));await page.getByRole('button',{name:'Compare on timeline',exact:true}).click();const timeline=page.locator('[data-bridge-seismic-timeline]'),guide=timeline.locator('[data-seismic-recorded-peak-guide]'),slider=timeline.locator('[data-seismic-chart-slider]');await expect(guide).toContainText('First notebook reference');
      const checkPeakLabels=async()=>{
        const boxes=await timeline.locator('[data-recorded-peak-marker] > span').evaluateAll(nodes=>nodes.map(node=>{const box=node.getBoundingClientRect();return {left:box.left,right:box.right,top:box.top,bottom:box.bottom};}));
        expect(boxes).toHaveLength(2);const [a,b]=boxes;
        expect(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top).toBe(true);
      };
      for(const measure of ['relative','acceleration','stored']){await page.getByRole('combobox',{name:'Comparison measure',exact:true}).selectOption(measure);await expect(guide).toHaveAttribute('data-seismic-recorded-peak-guide',measure);await checkPeakLabels();const before=await timeline.locator('[data-recorded-peak-marker]').evaluateAll(nodes=>nodes.map(n=>n.outerHTML));await page.evaluate(()=>(window as any).__set({seismicTime:21.217}));expect(await timeline.locator('[data-recorded-peak-marker]').evaluateAll(nodes=>nodes.map(n=>n.outerHTML))).toEqual(before);for(const id of ['reference','current']){const peak=guide.locator('[data-recorded-peak-trial="'+id+'"]'),time=Number(await peak.getAttribute('data-recorded-peak-time')),magnitude=Number(await peak.getAttribute('data-recorded-peak-magnitude'));await peak.getByRole('button').click();await expect(slider).toBeFocused();expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBe(time);expect(Math.abs(Number(await timeline.locator('[data-seismic-compare-value="'+id+'"]').getAttribute('data-comparison-frame-value')))).toBeCloseTo(magnitude,14);await expect(slider).toHaveAttribute('aria-valuetext',new RegExp(time.toFixed(3)+' s'));}if(measure==='relative')await captureImmersiveRegion(page,timeline,'bridge-'+width+'-recorded-maxima.png',ENHANCEMENT_REPORT);}
      await page.getByRole('combobox',{name:'Timeline reference trial',exact:true}).selectOption('1');await expect(guide).toContainText('Second notebook reference');await page.getByRole('combobox',{name:'Comparison measure',exact:true}).selectOption('relative');await checkPeakLabels();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2}));await checkPeakLabels();await page.evaluate(()=>(window as any).__set({seismicIntensityG:0.000001,seismicTrials:[],seismicTrialName:'Tiny reference',seismicDampingRatio:0.05}));await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2}));await page.getByRole('button',{name:'Compare on timeline',exact:true}).click();await guide.locator('[data-recorded-peak-shortcut="current"]').click();await expect(guide.locator('[data-recorded-peak-scientific-help]')).toContainText('2.5e-6 means 0.0000025');await expect(timeline.locator('[data-seismic-compare-value="current"]')).toContainText('e-');await expect(timeline).toContainText('1.00e-6 g');const tinyCurves=await timeline.locator('[data-seismic-comparison-curves] polyline').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('points')));expect(tinyCurves.every(points=>points!==null&&!/NaN|Infinity/.test(points))).toBe(true);await checkPeakLabels();await captureImmersiveRegion(page,timeline,'bridge-'+width+'-small-recorded-maxima.png',ENHANCEMENT_REPORT);
      await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicPrediction:'Keep prediction',seismicObservation:'Keep explanation',seismicIntervalPinS:12.319,seismicPlaying:false,autoDriving:false});await page.evaluate(()=>(window as any).__set({seismicIntensityG:0,seismicTrials:[],seismicTrialName:'Zero reference'}));await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.getByRole('button',{name:'Compare on timeline',exact:true}).click();await expect(guide.locator('[data-recorded-peak-zero]')).toHaveCount(2);await expect(guide.locator('[data-recorded-peak-shortcut="reference"]')).toBeDisabled();await expect(guide.locator('[data-recorded-peak-shortcut="current"]')).toBeDisabled();await expect(timeline.locator('[data-recorded-peak-marker]')).toHaveCount(0);await checkWorkflowHealth(page);
    });
  }
  test('recorded maxima: guided scene A stays selected through peak inspection and graphics recovery',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',bridgeBankYaw:18,seismicEnabled:true,seismicDampingRatio:0.1,seismicTime:2,seismicTrialName:'Notebook reference',seismicGuideOpen:true,seismicEnergyInterval:true,seismicIntervalPinS:12.319,seismicSceneNote:'Keep scene writing'});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();await page.getByRole('button',{name:'A · reference',exact:true}).click();await page.getByRole('button',{name:'Compare on timeline',exact:true}).click();const timeline=page.locator('[data-bridge-seismic-timeline]'),guide=timeline.locator('[data-seismic-recorded-peak-guide]');await guide.locator('[data-recorded-peak-shortcut="reference"]').click();const time=await page.evaluate(()=>(window as any).__bucket().seismicTime),before=await guide.textContent();expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicSceneSource:'guide',seismicSceneTrial:'reference',bridgeObserver:'bank',bridgeBankYaw:18,seismicSceneNote:'Keep scene writing'});
    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const extension=gl?.getExtension('WEBGL_lose_context');if(!extension)throw Error('WebGL loss extension unavailable');(window as any).__peakLoss=extension;extension.loseContext();});await expect(page.locator('[data-bridge-elevation]')).toBeVisible();expect(await guide.textContent()).toBe(before);expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBe(time);await captureImmersiveRegion(page,timeline,'bridge-844-fallback-recorded-maxima.png',ENHANCEMENT_REPORT);await page.evaluate(()=>(window as any).__peakLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');await guide.locator('[data-recorded-peak-shortcut="current"]').click();await expect(timeline.locator('[data-seismic-chart-slider]')).toBeFocused();expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',seismicSceneSource:'guide',seismicSceneTrial:'reference',seismicIntervalPinS:12.319,seismicSceneNote:'Keep scene writing'});await checkWorkflowHealth(page);
  });

  for(const width of [1000,320]){
    test('claim evidence: time windows, keyboard disclosure, reference and printed draft at '+width+'px',async({page})=>{
      await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicTime:2,seismicTrialName:'First notebook reference',seismicPrediction:'Keep my prediction',seismicObservation:'Keep my explanation'});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2,seismicTime:5,seismicTrialName:'Second notebook reference'}));await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.1,seismicEnergyInterval:true,seismicIntervalPinS:12.319,seismicTime:7.217}));
      const disclosure=page.locator('[data-claim-evidence-disclosure]'),guide=disclosure.locator('[data-claim-evidence]'),summary=disclosure.locator('summary');await expect(disclosure).not.toHaveAttribute('open');await summary.focus();await summary.press('Enter');await expect(disclosure).toHaveAttribute('open','');await expect(guide.locator('[data-claim-window]')).toHaveCount(3);await expect(guide.locator('[data-claim-reference]')).toContainText('First notebook reference');await expect(guide.locator('[data-claim-window="moment"] [data-claim-window-time]')).toHaveText('7.217 s');await expect(guide.locator('[data-claim-window="interval"] [data-claim-window-time]')).toHaveText('7.217–12.319 s');const b=await guide.locator('[data-claim-window="moment"] [data-claim-trial="current"]').getAttribute('data-claim-value');await page.getByRole('combobox',{name:'Earthquake reference trial',exact:true}).selectOption('1');await expect(guide.locator('[data-claim-reference]')).toContainText('Second notebook reference');await expect(guide.locator('[data-claim-window="moment"] [data-claim-trial="current"]')).toHaveAttribute('data-claim-value',b!);
      const layout=await guide.locator('[data-claim-window]').evaluateAll(nodes=>nodes.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y})));if(width===320){expect(layout[1].y).toBeGreaterThan(layout[0].y);expect(layout[2].y).toBeGreaterThan(layout[1].y);}else{expect(layout[1].x).toBeGreaterThan(layout[0].x);expect(layout[2].x).toBeGreaterThan(layout[1].x);}await captureImmersiveRegion(page,disclosure,'bridge-'+width+'-claim-evidence.png',ENHANCEMENT_REPORT);
      const fixed=await guide.locator('[data-claim-window="event"] [data-claim-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-claim-value')));await page.evaluate(()=>(window as any).__set({seismicTime:16}));expect(await guide.locator('[data-claim-window="event"] [data-claim-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-claim-value')))).toEqual(fixed);await page.evaluate(()=>(window as any).__set({seismicTime:7.217,seismicIntervalPinS:7.217}));await expect(guide).toContainText('The two moments coincide');expect(await guide.locator('[data-claim-window="interval"] [data-claim-value]').evaluateAll(nodes=>nodes.every(n=>Number(n.getAttribute('data-claim-value'))===0))).toBe(true);
      await page.evaluate(()=>(window as any).__set({seismicIntervalPinS:12.319,seismicIntensityG:0.000001}));await expect(guide.locator('[data-claim-scientific-help]')).toContainText('2.5e-6 means 0.0000025');await expect(guide.locator('[data-claim-window="event"] [data-claim-trial="current"]')).toContainText('e-');await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();const values=await guide.locator('[data-claim-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-claim-value')));await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();const printed=page.locator('[data-claim-evidence="print"]');expect(await printed.locator('[data-claim-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-claim-value')))).toEqual(values);await expect(printed.locator('details,button,input,textarea,select')).toHaveCount(0);await page.emulateMedia({media:'print'});await captureImmersiveRegion(page,printed,'bridge-'+width+'-print-claim-evidence.png',ENHANCEMENT_REPORT);await page.emulateMedia({media:'screen'});expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicPrediction:'Keep my prediction',seismicObservation:'Keep my explanation',seismicReferenceIndex:1,seismicTime:7.217,seismicIntervalPinS:12.319});await checkWorkflowHealth(page);
    });
  }
  test('claim evidence: notebook provenance and current readings survive graphics fallback with scene A selected',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicTrialName:'Notebook energy reference',seismicTime:2});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicGuideOpen:true,seismicEnergyInterval:true}));await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicTime:7.217,seismicIntervalPinS:12.319}));await page.getByRole('button',{name:'A · reference',exact:true}).click();const guide=page.locator('[data-claim-evidence]');await page.locator('[data-claim-evidence-disclosure] summary').click();await expect(guide.locator('[data-claim-reference]')).toContainText('Notebook energy reference');const before=await guide.textContent();
    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const extension=gl?.getExtension('WEBGL_lose_context');if(!extension)throw Error('WebGL loss extension unavailable');(window as any).__claimLoss=extension;extension.loseContext();});await expect(page.locator('[data-bridge-elevation]')).toBeVisible();expect(await guide.textContent()).toBe(before);await captureImmersiveRegion(page,page.locator('[data-claim-evidence-disclosure]'),'bridge-844-fallback-claim-evidence.png',ENHANCEMENT_REPORT);await page.evaluate(()=>(window as any).__claimLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');expect(await guide.textContent()).toBe(before);expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',seismicSceneSource:'guide',seismicSceneTrial:'reference',seismicTime:7.217,seismicIntervalPinS:12.319});await checkWorkflowHealth(page);
  });

  for (const width of [1000,320]) {
    test('energy accounting: shared event scale, empty and small readings at '+width+'px', async ({page}) => {
      await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicTime:7.217,seismicIntervalPinS:12.319,seismicPrediction:'Keep my prediction',seismicObservation:'Keep my explanation'});
      const map=page.locator('[data-seismic-energy-map]'),ledger=map.locator('[data-seismic-energy-accounting]');await expect(ledger).toHaveAttribute('data-energy-accounting-time','7.217');const scale=await ledger.getAttribute('data-energy-balance-scale');
      const reading=async(id:string)=>Number(await ledger.locator('[data-energy-balance-total="'+id+'"]').getAttribute('data-energy-value'));expect(await reading('input')).toBeCloseTo(await reading('accounted'),7);await expect(ledger.locator('[data-energy-balance-equation]')).toContainText('≈');await captureImmersiveRegion(page,map,'bridge-'+width+'-energy-accounting.png',ENHANCEMENT_REPORT);
      const why=ledger.locator('summary');await why.focus();await why.press('Enter');await expect(ledger.locator('[data-energy-balance-details]')).toHaveAttribute('open','');await expect(ledger.locator('[data-energy-balance-residual]')).toBeVisible();await expect(ledger.locator('[data-energy-balance-details]')).toContainText('small time steps');
      await page.evaluate(()=>(window as any).__set({seismicTime:16}));const input=await reading('input'),stored=Number(await map.locator('[data-energy-map-amount="stored"]').getAttribute('data-energy-value')),loss=Number(await map.locator('[data-energy-map-amount="damping"]').getAttribute('data-energy-value'));await page.evaluate(()=>(window as any).__set({seismicTime:24}));await expect(ledger).toHaveAttribute('data-energy-balance-scale',scale!);expect(await reading('input')).toBe(input);expect(Number(await map.locator('[data-energy-map-amount="stored"]').getAttribute('data-energy-value'))).toBeLessThan(stored);expect(Number(await map.locator('[data-energy-map-amount="damping"]').getAttribute('data-energy-value'))).toBeGreaterThan(loss);
      await page.evaluate(()=>(window as any).__set({seismicIntensityG:0,seismicTime:7.217}));await expect(ledger).toHaveAttribute('data-energy-balance-maximum','0');expect(await ledger.locator('[data-energy-balance-bar]').evaluateAll(nodes=>nodes.every(n=>(n as HTMLElement).style.width==='0%'))).toBe(true);await expect(map.locator('[data-energy-map-scientific-help]')).toHaveCount(0);await expect(ledger).toContainText('All bars are empty');
      await page.evaluate(()=>(window as any).__set({seismicIntensityG:0.000001}));expect(Number(await ledger.getAttribute('data-energy-balance-scale'))).toBeGreaterThan(0);expect(Number(await ledger.getAttribute('data-energy-balance-scale'))).toBeLessThan(0.001);await expect(map.locator('[data-energy-map-scientific-help]')).toContainText('2.5e-6 means 0.0000025');expect((await map.textContent())!.match(/Scientific notation:/g)).toHaveLength(1);await expect(ledger.locator('[data-energy-balance-total="input"]')).toContainText('e-');await why.press('Enter');await captureImmersiveRegion(page,map,'bridge-'+width+'-small-energy-accounting.png',ENHANCEMENT_REPORT);
      await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();await expect(ledger).toBeVisible();expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicTime:7.217,seismicIntervalPinS:12.319,seismicPrediction:'Keep my prediction',seismicObservation:'Keep my explanation'});await checkWorkflowHealth(page);
    });
  }
  test('energy accounting: selected scene A and graphics recovery preserve current balance', async ({page}) => {
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicTime:7.217});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2,seismicSceneCompare:true,seismicSceneSource:'saved',seismicSceneTrial:'reference'}));const map=page.locator('[data-seismic-energy-map]'),ledger=map.locator('[data-seismic-energy-accounting]'),before=await ledger.textContent();await expect(map.locator('[data-energy-map-caption]')).toContainText('Current experiment · 7.217 s');
    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const extension=gl?.getExtension('WEBGL_lose_context');if(!extension)throw Error('WebGL loss extension unavailable');(window as any).__accountingLoss=extension;extension.loseContext();});await expect(page.locator('[data-bridge-elevation]')).toBeVisible();expect(await ledger.textContent()).toBe(before);await captureImmersiveRegion(page,map,'bridge-844-fallback-energy-accounting.png',ENHANCEMENT_REPORT);await page.evaluate(()=>(window as any).__accountingLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',seismicSceneTrial:'reference',seismicTime:7.217});expect(await ledger.textContent()).toBe(before);await checkWorkflowHealth(page);
  });

  for (const width of [1000,320]) {
    test('learning route: coherent energy map and notebook navigation at '+width+'px', async ({page}) => {
      await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicTime:7.217,seismicIntervalPinS:12.319,seismicEnergyInterval:true,seismicScenePrediction:'Separate scene writing'});
      const route=page.locator('[data-investigation-route]'),map=page.locator('[data-seismic-energy-map]');await expect(route.getByRole('button')).toHaveCount(4);await expect(map.locator('[data-energy-map-caption]')).toHaveText('Current experiment · 7.217 s · Shaking phase');
      await captureImmersiveRegion(page,route,'bridge-'+width+'-investigation-route.png',ENHANCEMENT_REPORT);await captureImmersiveRegion(page,map,'bridge-'+width+'-energy-map.png',ENHANCEMENT_REPORT);
      const layout=await map.locator('[data-energy-map-node]').evaluateAll(nodes=>nodes.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y})));if(width<=640){expect(layout[1].y).toBeGreaterThan(layout[0].y);expect(layout[2].y).toBeGreaterThan(layout[1].y);}else{expect(layout[1].x).toBeGreaterThan(layout[0].x);expect(layout[2].x).toBeGreaterThan(layout[1].x);}
      await page.getByRole('button',{name:'Predict · Go to earthquake prediction',exact:true}).click();const prediction=page.getByRole('textbox',{name:'Earthquake prediction',exact:true});await expect(prediction).toBeFocused();await prediction.fill('More damping will change the response.');
      await page.getByRole('button',{name:'Inspect · Go to earthquake timeline',exact:true}).click();const timeline=page.locator('[data-seismic-chart-slider]');await expect(timeline).toBeFocused();expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicTime:7.217,seismicIntervalPinS:12.319,seismicPlaying:false,autoDriving:false});
      await page.getByRole('button',{name:'Compare · Go to save earthquake trial',exact:true}).click();const save=page.getByRole('button',{name:'Save earthquake trial',exact:true});await expect(save).toBeFocused();expect(await page.evaluate(()=>(window as any).__bucket().seismicTrials)).toBeUndefined();await save.press('Enter');const record=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);
      await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2}));await page.getByRole('button',{name:'Compare · Go to saved-trial comparison',exact:true}).click();await expect(page.locator('[data-seismic-trial-comparison]')).toBeFocused();expect(await page.evaluate(()=>(window as any).__bucket().seismicTrials[0])).toEqual(record);
      await page.getByRole('button',{name:'Explain · Go to earthquake explanation',exact:true}).click();const explanation=page.getByRole('textbox',{name:'Earthquake observation and explanation',exact:true});await expect(explanation).toBeFocused();await explanation.fill('At 7.217 s the readings show energy stored and dissipated.');expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicTime:7.217,seismicIntervalPinS:12.319,seismicDampingRatio:0.2,seismicPrediction:'More damping will change the response.',seismicScenePrediction:'Separate scene writing',seismicPlaying:false,autoDriving:false});
      await page.evaluate(()=>(window as any).__set({seismicIntensityG:0.000001}));await expect(map.locator('[data-energy-map-amount="stored"]')).toContainText('e-');await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();await expect(map).toBeVisible();await page.getByRole('button',{name:'Inspect · Go to earthquake timeline',exact:true}).click();await expect(timeline).toBeFocused();await checkWorkflowHealth(page);
    });
  }
  test('learning route: current energy and navigation survive graphics loss with scene A selected', async ({page}) => {
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicTime:16,seismicTrialName:'Original scene reference'});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2,seismicSceneCompare:true,seismicSceneSource:'saved',seismicSceneTrial:'reference'}));const map=page.locator('[data-seismic-energy-map]'),before=await map.textContent();await expect(map.locator('[data-energy-map-caption]')).toHaveText('Current experiment · 16.000 s · Free vibration');await expect(map.locator('[data-energy-map-connector="input"]')).toContainText('No input transfer now');expect(Number(await map.locator('[data-energy-map-amount="stored"]').getAttribute('data-energy-value'))).toBeGreaterThan(0);
    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const extension=gl?.getExtension('WEBGL_lose_context');if(!extension)throw Error('WebGL loss extension unavailable');(window as any).__routeLoss=extension;extension.loseContext();});await expect(page.locator('[data-bridge-elevation]')).toBeVisible();expect(await map.textContent()).toBe(before);await page.getByRole('button',{name:'Compare · Go to saved-trial comparison',exact:true}).click();await expect(page.locator('[data-seismic-trial-comparison]')).toBeFocused();await captureImmersiveRegion(page,map,'bridge-844-fallback-energy-map.png',ENHANCEMENT_REPORT);
    await page.evaluate(()=>(window as any).__routeLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',seismicSceneTrial:'reference',seismicTime:16});await page.getByRole('button',{name:'Explain · Go to earthquake explanation',exact:true}).click();await expect(page.getByRole('textbox',{name:'Earthquake observation and explanation',exact:true})).toBeFocused();await page.evaluate(()=>(window as any).__set({seismicTime:24}));await expect(map.locator('[data-energy-map-caption]')).toHaveText('Current experiment · 24.000 s · Observation ends');await checkWorkflowHealth(page);
  });

  test('paired intervals: notebook reference survives graphics loss while scene A stays selected',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicTrialName:'Saved energy reference',seismicEnergyInterval:true,seismicGuideOpen:true});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();await page.getByRole('button',{name:'A · reference',exact:true}).click();await page.getByRole('button',{name:'After shaking',exact:true}).click();const pair=page.locator('[data-seismic-interval-comparison]'),evidence=pair.locator('[data-investigation-evidence="comparison"]');await expect(pair).toContainText('Saved energy reference');await expect(evidence).not.toHaveAttribute('data-evidence-selected');await expect(evidence.locator('[data-evidence-question]')).toContainText('B · current');const values=await evidence.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')));
    await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const extension=gl?.getExtension('WEBGL_lose_context');if(!extension)throw Error('WebGL loss extension unavailable');(window as any).__pairedLoss=extension;extension.loseContext();});await expect(page.locator('[data-bridge-elevation]')).toBeVisible();expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',seismicSceneTrial:'reference',seismicTime:24,seismicIntervalPinS:16});expect(await evidence.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')))).toEqual(values);await captureImmersiveRegion(page,pair,'bridge-844-fallback-paired-interval.png',ENHANCEMENT_REPORT);await page.evaluate(()=>(window as any).__pairedLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');expect(await page.evaluate(()=>(window as any).__bucket().bridgeView)).toBe('2d');expect(await evidence.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')))).toEqual(values);await checkWorkflowHealth(page);
  });
  for(const width of [1000,320]){
    test('paired intervals: shared 2D energy evidence, reference selection and print at '+width+'px',async({page})=>{
      await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicTrialName:'First energy reference'});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2,seismicTrialName:'Second energy reference'}));await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.1,seismicEnergyInterval:true,seismicIntervalPinS:12.319,seismicTime:7.217}));const pair=page.locator('[data-seismic-interval-comparison]'),evidence=pair.locator('[data-investigation-evidence="comparison"]');await expect(evidence).toHaveAttribute('data-evidence-start','7.217');await expect(evidence).toHaveAttribute('data-evidence-end','12.319');await expect(evidence.locator('[data-evidence-column]')).toHaveCount(2);const before=await evidence.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')));await page.getByRole('combobox',{name:'Earthquake reference trial',exact:true}).selectOption('1');await expect(pair).toContainText('Second energy reference');const changed=await evidence.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')));expect(changed).not.toEqual(before);await captureImmersiveRegion(page,pair,'bridge-'+width+'-2d-paired-interval.png',ENHANCEMENT_REPORT);expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',seismicTime:7.217,seismicIntervalPinS:12.319});await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();const printed=page.locator('[data-bridge-print-seismic] [data-seismic-interval-comparison]');expect(await printed.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')))).toEqual(changed);await expect(printed.locator('button,input,textarea,select')).toHaveCount(0);await checkWorkflowHealth(page);
    });
  }
  for(const width of [1000,320]){
    test('comparison clarity: tiny changes, retained focus and print at '+width+'px',async({page})=>{
      await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicIntensityG:0.000001});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicArchetype:'stiff',seismicDampingRatio:0.2}));const comparison=page.locator('[data-seismic-trial-comparison]'),action=page.getByRole('button',{name:'Isolate damping change',exact:true});await action.focus();await action.press('Enter');await expect(comparison).toBeFocused();await expect(comparison.locator('[data-controlled-comparison]')).toHaveCount(0);await page.keyboard.press('Tab');await expect(page.getByRole('combobox',{name:'Earthquake reference trial',exact:true})).toBeFocused();const table=comparison.locator('[data-seismic-trial-table]');await expect(table.locator('[data-comparison-change]').first()).toContainText('e-');const values=await table.locator('[data-comparison-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-comparison-value')));expect(await comparison.locator('[data-response-reading]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-response-value')))).toEqual(values);await captureImmersiveRegion(page,table,'bridge-'+width+'-precise-comparison-table.png',ENHANCEMENT_REPORT);await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();const print=page.locator('[data-bridge-print-seismic] [data-seismic-trial-comparison]');expect(await print.locator('[data-comparison-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-comparison-value')))).toEqual(values);await expect(print.locator('[data-comparison-precision-help]')).toBeVisible();await checkWorkflowHealth(page);
    });
  }
  for(const width of [1000,320]){
    test('comparison bars: shared scales, stable replay and print at '+width+'px',async({page})=>{
      await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicTrialName:'Visual reference'});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();await page.evaluate(()=>(window as any).__set({seismicDampingRatio:0.2}));const visual=page.locator('[data-seismic-comparison-visual]');await expect(visual.locator('[data-response-pair]')).toHaveCount(4);const readings=await visual.locator('[data-response-pair]').evaluateAll(nodes=>nodes.map(n=>({scale:n.getAttribute('data-response-scale'),values:[...n.querySelectorAll('[data-response-reading]')].map(v=>v.getAttribute('data-response-value')),widths:[...n.querySelectorAll('[data-response-bar]')].map(v=>(v as HTMLElement).style.width)})));for(const pair of readings){expect(Number(pair.scale)).toBe(Math.max(...pair.values.map(Number)) || 1);expect(Math.max(...pair.widths.map(parseFloat))).toBe(100);}await captureImmersiveRegion(page,visual,'bridge-'+width+'-paired-response-bars.png',ENHANCEMENT_REPORT);await page.evaluate(()=>(window as any).__set({seismicTime:21.217}));expect(await visual.locator('[data-response-reading]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-response-value')))).toEqual(readings.flatMap(pair=>pair.values));await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();const print=page.locator('[data-bridge-print-seismic] [data-seismic-comparison-visual]');await expect(print).toContainText('different measures use different scales');expect(await print.locator('[data-response-reading]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-response-value')))).toEqual(readings.flatMap(pair=>pair.values));await expect(print.locator('button,input,textarea,select')).toHaveCount(0);await checkWorkflowHealth(page);
    });
  }
  for(const width of [1000,320]){
    test('controlled comparison: isolate damping and response mode at '+width+'px',async({page})=>{
      await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicTrialName:'Controlled reference'});await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();const ref=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);await page.evaluate(()=>(window as any).__set({seismicArchetype:'stiff',seismicDampingRatio:0.2,seismicFrequencyHz:2.3,seismicIntensityG:0.3,seismicTime:7.217,seismicIntervalPinS:12.319,seismicEnergyInterval:true,seismicPrediction:'Keep my prediction'}));const comparison=page.locator('[data-seismic-trial-comparison]');await captureImmersiveRegion(page,comparison.locator('[data-controlled-comparison]'),'bridge-'+width+'-controlled-comparison.png',ENHANCEMENT_REPORT);const damping=page.getByRole('button',{name:'Isolate damping change',exact:true});await damping.focus();await damping.press('Enter');expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicArchetype:ref.inputs.archetype,seismicFrequencyHz:ref.inputs.groundFrequencyHz,seismicIntensityG:ref.inputs.intensityG,seismicDampingRatio:0.2,seismicTime:7.217,seismicIntervalPinS:12.319,seismicPrediction:'Keep my prediction',seismicPlaying:false});await expect(comparison).toContainText('Changed settings: Damping ratio (%)');await expect(comparison.locator('[data-controlled-comparison]')).toHaveCount(0);
      await page.evaluate(()=>(window as any).__set({seismicArchetype:'stiff',seismicDampingRatio:0.2}));await page.getByRole('button',{name:'Isolate response mode change',exact:true}).click();expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicArchetype:'stiff',seismicDampingRatio:ref.inputs.dampingRatio,seismicTime:7.217,seismicIntervalPinS:12.319});await expect(comparison).toContainText('Changed settings: Response mode');await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();await expect(page.locator('[data-bridge-print-seismic]')).toContainText('Changed settings: Response mode');await expect(page.locator('[data-bridge-print-seismic] [data-controlled-comparison]')).toHaveCount(0);await checkWorkflowHealth(page);
    });
  }
  for(const width of [1000,320]){
    test('small readouts: late-stage energy and signed power in saved print at '+width+'px',async({page})=>{
      await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicSceneRecording:true,seismicDampingRatio:0.2,seismicTime:21.217});await page.getByRole('button',{name:'Save scene observation',exact:true}).click();const article=page.locator('[data-seismic-trial]').first();const energy=await article.locator('[data-seismic-saved-energy]').textContent(),power=await article.locator('[data-seismic-scene-power]').textContent();expect(energy).toMatch(/e-\d/);expect(power).toMatch(/-\d\.\d{2}e-\d/);await expect(article.locator('[data-seismic-scientific-help]')).toContainText('2.5e-6 means 0.0000025');
      await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();const saved=page.locator('[data-bridge-print-seismic] [data-seismic-trial]').first();await expect(saved.locator('[data-seismic-saved-energy]')).toHaveText(energy!);await expect(saved.locator('[data-seismic-scene-power]')).toHaveText(power!);await expect(saved.locator('button,input,textarea,select')).toHaveCount(0);await captureImmersiveRegion(page,saved,'bridge-'+width+'-small-saved-readouts.png',ENHANCEMENT_REPORT);await checkWorkflowHealth(page);
    });
  }
  for(const width of [1000,320]){
    test('interval controls: exact times, keyboard swap and stable paired evidence at '+width+'px',async({page})=>{
      await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,width,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicEnergyInterval:true,seismicGuideOpen:true});await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();await page.getByRole('button',{name:'A · reference',exact:true}).click();await page.getByRole('button',{name:'After shaking',exact:true}).click();
      const interval=page.locator('[data-bridge-energy-interval="scene"]'),evidence=page.locator('[data-investigation-evidence="scene"]');const values=await evidence.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')));const swap=interval.getByRole('button',{name:'Swap moments',exact:true});await swap.focus();await swap.press('Enter');await expect(interval.locator('[data-interval-window]')).toHaveAttribute('data-interval-start','16');await expect(interval.locator('[data-interval-window]')).toHaveAttribute('data-interval-end','24');expect(await evidence.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')))).toEqual(values);expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicTime:16,seismicIntervalPinS:24,seismicSceneTrial:'reference',seismicPlaying:false});
      await interval.getByRole('spinbutton',{name:'Inspected time (s)',exact:true}).fill('17.137');await expect(interval.locator('[data-interval-window]')).toHaveAttribute('data-interval-start','17.137');await expect(interval.getByRole('button',{name:'After shaking',exact:true})).toHaveAttribute('aria-pressed','false');await captureImmersiveRegion(page,interval.locator('[data-interval-time-controls]'),'bridge-'+width+'-exact-time-controls.png',ENHANCEMENT_REPORT);await checkWorkflowHealth(page);
      await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();const fallback=page.locator('[data-bridge-energy-interval="fallback"]');await expect(fallback.getByRole('spinbutton',{name:'Inspected time (s)',exact:true})).toHaveValue('17.137');await fallback.getByRole('spinbutton',{name:'Pinned time (s)',exact:true}).fill('17.137');await expect(fallback.getByRole('button',{name:'Swap moments',exact:true})).toBeDisabled();await checkWorkflowHealth(page);
    });
  }
  for(const width of [1000,320]){
    test('draft report: unsaved interval evidence and notes at '+width+'px',async({page})=>{
      await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicEnergyInterval:true,seismicIntervalPinS:12.319,seismicTime:7.217});await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();
      await page.getByRole('textbox',{name:'Earthquake prediction',exact:true}).fill('Energy can return to the ground.');await page.getByRole('textbox',{name:'Earthquake observation and explanation',exact:true}).fill('Use the exact interval to support this explanation.');
      const values=await page.locator('[data-bridge-seismic-notebook] [data-investigation-evidence="draft"] [data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')));
      await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();const draft=page.locator('[data-notebook-print-draft]'),evidence=draft.locator('[data-investigation-evidence="draft"]');await expect(evidence).toHaveAttribute('data-evidence-start','7.217');await expect(evidence).toHaveAttribute('data-evidence-end','12.319');expect(await evidence.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')))).toEqual(values);
      await expect(draft).toContainText('Inspected time: 7.217 s');await expect(draft).toContainText('Energy can return to the ground.');await expect(draft).toContainText('Current draft evidence');await expect(draft.locator('button,input,textarea,select')).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__bucket().seismicTrials || [])).toHaveLength(0);
      await captureImmersiveRegion(page,draft,'bridge-'+width+'-unsaved-draft-report.png',ENHANCEMENT_REPORT);await checkWorkflowHealth(page);
    });
  }
  for(const width of [1000,320]){
    test('notebook intervals: save and restore labelled 2D evidence and print at '+width+'px',async({page})=>{
      await mountWorkflow(page,width,{bridgeView:'3d',seismicEnabled:true,seismicEnergyInterval:true,seismicScenePrediction:'Keep my scene draft'});
      await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();await page.getByRole('button',{name:'After shaking',exact:true}).click();
      const notebook=page.locator('[data-bridge-seismic-notebook]'),draft=notebook.locator('[data-investigation-evidence="draft"]');
      await page.getByRole('textbox',{name:'Earthquake trial name',exact:true}).fill('After shaking in 2D');await page.getByRole('textbox',{name:'Earthquake prediction',exact:true}).fill('The remaining energy should become damping loss.');await page.getByRole('textbox',{name:'Earthquake observation and explanation',exact:true}).fill('Input work is zero after ground motion ends.');
      await expect(draft).toHaveAttribute('data-evidence-start','16');await expect(draft).toHaveAttribute('data-evidence-end','24');await expect(draft.locator('[data-evidence-question]')).toHaveAttribute('data-evidence-question','settling');
      const values=await draft.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')));await captureImmersiveRegion(page,draft,'bridge-'+width+'-2d-notebook-evidence.png',ENHANCEMENT_REPORT);
      await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();const record=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);expect(record.investigation).toEqual({version:'bridge-energy-investigation-v1',pinTimeS:16});expect(record.scene).toBeUndefined();
      await page.evaluate(()=>(window as any).__set({seismicEnergyInterval:false,seismicIntervalPinS:3.1,seismicTime:7.217,seismicDampingRatio:0.4,seismicPrediction:'Changed prediction',seismicObservation:'Changed observation'}));
      await page.getByRole('button',{name:'Restore earthquake trial 1: After shaking in 2D',exact:true}).click();expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',seismicTime:24,seismicIntervalPinS:16,seismicEnergyInterval:true,seismicSceneTrial:'current',seismicSceneCompare:false,seismicScenePrediction:'Keep my scene draft'});
      await expect(page.getByRole('textbox',{name:'Earthquake prediction',exact:true})).toHaveValue(record.prediction);expect(await draft.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')))).toEqual(values);
      await page.getByRole('spinbutton',{name:'Pinned time (s)',exact:true}).fill('17.137');await expect(draft).toHaveAttribute('data-evidence-start','17.137');await expect(draft.locator('[data-evidence-question]')).toHaveCount(0);
      await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();const article=page.locator('[data-bridge-print-seismic] [data-seismic-trial]').first(),saved=article.locator('[data-investigation-evidence="saved"]');
      await expect(article.locator('[data-seismic-investigation-question]')).toHaveAttribute('data-seismic-investigation-question','settling');await expect(saved).toHaveAttribute('data-evidence-start','16');await expect(saved).toHaveAttribute('data-evidence-end','24');expect(await saved.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')))).toEqual(values);
      await expect(article).toContainText(record.prediction);await expect(article).toContainText(record.observation);await expect(article.locator('[data-seismic-scene-context]')).toHaveCount(0);await expect(article.locator('button,input,textarea,select')).toHaveCount(0);
      await captureImmersiveRegion(page,saved,'bridge-'+width+'-2d-notebook-print.png',ENHANCEMENT_REPORT);await checkWorkflowHealth(page);
    });
  }
  test('notebook intervals: graphics loss preserves current-experiment writing and inspection through recovery',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicEnergyInterval:true,seismicGuideOpen:true});
    await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();await page.getByRole('button',{name:'A · reference',exact:true}).click();await page.getByRole('button',{name:'After shaking',exact:true}).click();
    const draft=page.locator('[data-bridge-seismic-notebook] [data-investigation-evidence="draft"]'),values=await draft.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')));
    await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const extension=gl?.getExtension('WEBGL_lose_context');if(!extension)throw Error('WebGL loss extension unavailable');(window as any).__notebookLoss=extension;extension.loseContext();});
    await expect(page.locator('[data-bridge-elevation]')).toBeVisible();await expect(draft).toContainText('Current experiment');expect(await draft.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')))).toEqual(values);
    await page.getByRole('textbox',{name:'Earthquake trial name',exact:true}).fill('Fallback interval');await page.getByRole('textbox',{name:'Earthquake prediction',exact:true}).fill('The interval can be inspected in 2D.');await page.getByRole('textbox',{name:'Earthquake observation and explanation',exact:true}).fill('The notebook keeps current-experiment evidence.');await page.getByRole('button',{name:'Save earthquake trial',exact:true}).click();
    const record=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);expect(record.inputs.dampingRatio).toBe(0.2);expect(record.investigation.pinTimeS).toBe(16);expect(record.scene).toBeUndefined();
    await page.evaluate(()=>(window as any).__set({seismicEnergyInterval:false,seismicTime:3.1,seismicIntervalPinS:0}));await page.getByRole('button',{name:'Restore earthquake trial 1: Fallback interval',exact:true}).click();expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',seismicEnergyInterval:true,seismicIntervalPinS:16,seismicTime:24,seismicSceneCompare:false,seismicSceneTrial:'current',seismicPlaying:false});
    await captureImmersiveRegion(page,draft,'bridge-844-graphics-fallback-notebook.png',ENHANCEMENT_REPORT);await page.evaluate(()=>(window as any).__notebookLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');expect(await page.evaluate(()=>(window as any).__bucket().bridgeView)).toBe('2d');
    await page.getByRole('button',{name:'From the riverbank',exact:true}).click();await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();await expect(page.locator('[data-bridge-scene-readout]')).toHaveAttribute('data-scene-trial','current');await checkWorkflowHealth(page);
  });

  for(const size of [{width:1000,height:800},{width:320,height:568}]){
    test('writing evidence: scene prediction, A/B interval and printed explanation at '+size.width+'px',async({page})=>{
      await mountWorkflow(page,size.width,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicEnergyInterval:true,seismicSceneRecording:true,seismicGuideOpen:true,crossSectionMm2:30000,lateralBraceEvery:1});
      await page.setViewportSize(size);await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
      const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();await page.getByRole('button',{name:'Focus scene',exact:true}).click();await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
      const drawer=page.locator('[data-bridge-scene-drawer]');await drawer.locator('summary').first().press('Enter');
      const recorder=page.locator('[data-bridge-scene-recorder]'),prediction=page.getByRole('textbox',{name:'Scene prediction',exact:true});
      await prediction.fill('More damping should dissipate more of the remaining energy.');await page.getByRole('button',{name:'After shaking',exact:true}).click();
      const evidence=recorder.locator('[data-investigation-evidence="scene"]');await expect(evidence).toHaveAttribute('data-evidence-start','16');await expect(evidence).toHaveAttribute('data-evidence-end','24');
      const values=()=>evidence.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value'))),before=await values();await page.getByRole('button',{name:'A · reference',exact:true}).click();await expect(evidence).toHaveAttribute('data-evidence-selected','reference');expect(await values()).toEqual(before);
      await expect(prediction).toHaveValue('More damping should dissipate more of the remaining energy.');
      await evidence.evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));
      expect(await evidence.evaluate(node=>node.scrollWidth-node.clientWidth)).toBeLessThanOrEqual(1);const table=evidence.locator('table');
      const tableBox=await table.boundingBox(),heading=await drawer.locator('summary').first().boundingBox(),drawerBox=await drawer.boundingBox();expect(tableBox!.y).toBeGreaterThanOrEqual(heading!.y+heading!.height);expect(tableBox!.y+tableBox!.height).toBeLessThanOrEqual(drawerBox!.y+drawerBox!.height-4);
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'-writing-evidence.png')});
      const note='After shaking, net input work is zero and stored energy decreases as damping dissipates it.';await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill(note);await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
      const record=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);expect(record.prediction).toBe('More damping should dissipate more of the remaining energy.');expect(record.observation).toBe(note);await expect(prediction).toHaveValue('');
      await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();await page.getByRole('button',{name:'Revisit scene observation 1: '+record.name,exact:true}).click();await expect(prediction).toHaveValue(record.prediction);await expect(page.getByRole('textbox',{name:'Scene observation note',exact:true})).toHaveValue(note);
      const fullscreen=page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true});if(await fullscreen.count())await fullscreen.click();
      await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();const article=page.locator('[data-bridge-print-seismic] [data-seismic-trial]').first();
      await expect(article).toContainText(record.prediction);await expect(article).toContainText(note);const saved=article.locator('[data-investigation-evidence="saved"]');expect(await saved.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-evidence-value')))).toEqual(before);
      await expect(saved.locator('[data-evidence-column]')).toHaveCount(2);await expect(article.locator('button,input,select,textarea')).toHaveCount(0);
      await captureImmersiveRegion(page,saved,'bridge-'+size.width+'-printed-evidence.png',ENHANCEMENT_REPORT);await checkWorkflowHealth(page);
    });
  }
  test('writing evidence: zero input, exact manual endpoints and negative work with reduced motion',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicEnergyInterval:true,seismicSceneRecording:true,seismicIntensityG:0});
    const recorder=page.locator('[data-bridge-scene-recorder]'),evidence=recorder.locator('[data-investigation-evidence="scene"]');await page.getByRole('button',{name:'After shaking',exact:true}).click();
    expect(await evidence.locator('[data-evidence-value]').evaluateAll(nodes=>nodes.every(n=>Number(n.getAttribute('data-evidence-value'))===0))).toBe(true);
    await page.getByRole('spinbutton',{name:'Pinned time (s)',exact:true}).fill('17.137');await expect(evidence).toHaveAttribute('data-evidence-start','17.137');await expect(evidence.locator('[data-evidence-question]')).toHaveCount(0);
    await page.getByRole('textbox',{name:'Scene prediction',exact:true}).fill('With no shaking, all transfers stay zero.');
    await page.evaluate(()=>(window as any).__set({seismicIntensityG:0.12}));await page.getByRole('button',{name:'Ground removes energy',exact:true}).click();
    const work=evidence.locator('[data-evidence-row="input"] td');expect(Number(await work.getAttribute('data-evidence-value'))).toBeLessThan(0);await expect(work).toHaveText(/^−/);await expect(work).not.toContainText('<0.001');
    await expect(page.getByRole('textbox',{name:'Scene prediction',exact:true})).toHaveValue('With no shaking, all transfers stay zero.');expect(await page.evaluate(()=>(window as any).__bucket().seismicPlaying)).toBe(false);
    await captureImmersiveRegion(page,evidence,'bridge-844-signed-writing-evidence.png',ENHANCEMENT_REPORT);await checkWorkflowHealth(page);
  });

  for(const size of [{width:1000,height:800},{width:320,height:568}]){
    test('energy interval: paired work budget, pinned orbit and saved evidence at '+size.width+'px',async({page})=>{
      await mountWorkflow(page,size.width,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicEnergyInterval:true,seismicIntervalPinS:16.137,seismicEnergyOrbit:true,seismicGuideOpen:true,crossSectionMm2:30000,lateralBraceEvery:1});
      await page.setViewportSize(size);await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
      await page.evaluate(()=>(window as any).__set({seismicTime:21.217}));
      const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
      await page.getByRole('button',{name:'Focus scene',exact:true}).click();await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
      const drawer=page.locator('[data-bridge-scene-drawer]');await drawer.locator('summary').first().press('Enter');
      const interval=page.locator('[data-bridge-energy-interval="scene"]');await interval.scrollIntoViewIfNeeded();
      const values=()=>interval.locator('[data-interval-term]').evaluateAll(nodes=>nodes.map(node=>Number(node.getAttribute('data-interval-value'))));
      const b=await values(),scale=await interval.locator('[data-interval-frame]').getAttribute('data-interval-scale');
      expect(b[0]).toBe(0);expect(b[1]).toBeGreaterThan(0);expect(b[4]).toBeLessThan(0);expect(Math.abs(b[0]-b[1]-b[4])).toBeLessThan(1e-8);
      await expect(interval.locator('[data-interval-window]')).toContainText('16.137–21.217 s');
      await page.getByRole('button',{name:'A · reference',exact:true}).click();expect(await values()).not.toEqual(b);
      await expect(interval.locator('[data-interval-frame]')).toHaveAttribute('data-interval-scale',scale!);await expect(interval.locator('[data-interval-frame]')).toHaveAttribute('data-interval-trial','reference');
      await expect(page.locator('[data-orbit-pin]')).toHaveAttribute('data-orbit-pin-trial','reference');
      const field=page.getByRole('spinbutton',{name:'Pinned time (s)',exact:true});await field.fill('16');
      expect(await page.evaluate(()=>(window as any).__bucket().seismicIntervalPinS)).toBe(16);
      await interval.locator('[data-interval-bars]').evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));
      const bars=await interval.locator('[data-interval-bars]').boundingBox(),heading=await drawer.locator('summary').first().boundingBox();expect(bars!.y).toBeGreaterThanOrEqual(heading!.y+heading!.height);
      expect(await drawer.evaluate(node=>node.scrollWidth-node.clientWidth)).toBeLessThanOrEqual(1);
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'-energy-interval.png')});
      await page.evaluate(()=>(window as any).__set({seismicIntervalPinS:7.217,seismicTime:12.319}));
      await interval.locator('[data-interval-bars]').evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'-driven-interval.png')});
      await inspectWholeOrbit(page);await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'-pinned-orbit.png')});
      await page.evaluate(()=>(window as any).__set({seismicIntervalPinS:16,seismicTime:21.217}));
      await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill('After shaking, damping loss equals the decrease in stored energy.');
      await page.getByRole('button',{name:'Save scene observation',exact:true}).click();const saved=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);expect(saved.scene.display).toMatchObject({energyInterval:true,intervalPinS:16});
      await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
      const evidence=await page.locator('[data-seismic-scene-interval]').textContent();
      await page.evaluate(()=>(window as any).__set({seismicIntervalPinS:0,seismicEnergyInterval:false,seismicTime:0,seismicDampingRatio:0.4,bridgeView:'2d'}));
      await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
      expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicEnergyInterval:true,seismicIntervalPinS:16,seismicTime:21.217,seismicSceneTrial:'reference',seismicPlaying:false});
      await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();await expect(page.locator('[data-bridge-print-seismic] [data-seismic-scene-interval]')).toHaveText(evidence!);
      await expect(page.locator('[data-bridge-print-seismic]').locator('button,input,select,textarea')).toHaveCount(0);await checkWorkflowHealth(page);
    });
  }
  test('energy interval: chronological manual inspection and undamped exchange in labelled 2D',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,1000,{bridgeView:'3d',seismicEnabled:true,seismicTime:16.419,seismicIntervalPinS:16.137,seismicDampingRatio:0,seismicEnergyInterval:true,seismicEnergyOrbit:true});
    await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();const interval=page.locator('[data-bridge-energy-interval="fallback"]');
    await expect(interval.locator('[data-interval-insight]')).toContainText('stays constant');
    const terms=await interval.locator('[data-interval-term]').evaluateAll(nodes=>nodes.map(node=>Number(node.getAttribute('data-interval-value'))));expect(terms[0]).toBe(0);expect(terms[1]).toBe(0);expect(Math.abs(terms[2]+terms[3])).toBeLessThan(1e-6);
    await page.getByRole('spinbutton',{name:'Pinned time (s)',exact:true}).fill('20.137');await expect(interval.locator('[data-interval-window]')).toContainText('16.419–20.137 s');
    await page.getByRole('button',{name:'Pin this frame',exact:true}).click();await expect(interval.locator('[data-interval-insight]')).toContainText('Move replay time');
    await page.getByRole('button',{name:'Pin end of shaking',exact:true}).click();await expect(interval.locator('[data-interval-window]')).toContainText('16.000–16.419 s');
    await captureImmersiveRegion(page,interval,'bridge-1000-interval-2d.png',ENHANCEMENT_REPORT);await checkWorkflowHealth(page);
  });
  test('energy interval: landscape zero shaking, keyboard tools and graphics fallback',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'immersive',seismicEnabled:true,seismicTime:20,seismicIntervalPinS:16,seismicIntensityG:0,seismicEnergyInterval:true,seismicSceneFocus:true,seismicReadoutCollapsed:true});
    await page.setViewportSize({width:844,height:390});const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
    const drawer=page.locator('[data-bridge-scene-drawer]'),summary=drawer.locator('summary').first();await summary.press('Enter');const interval=page.locator('[data-bridge-energy-interval="scene"]');
    await expect(interval.locator('[data-interval-insight]')).toContainText('no energy transfer');expect(await interval.locator('[data-interval-term]').evaluateAll(nodes=>nodes.every(n=>Number(n.getAttribute('data-interval-value'))===0))).toBe(true);
    const pin=page.getByRole('spinbutton',{name:'Pinned time (s)',exact:true});await pin.focus();await pin.press('ArrowUp');expect(await page.evaluate(()=>(window as any).__bucket().seismicIntervalPinS)).toBe(16.001);
    await interval.locator('[data-interval-bars]').evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-844-interval-zero.png')});
    await pin.focus();await pin.press('Escape');await expect(drawer).not.toHaveAttribute('open');await expect(summary).toBeFocused();await summary.press('Enter');
    await pin.focus();await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const loss=gl?.getExtension('WEBGL_lose_context');if(!loss)throw Error('No graphics loss extension');loss.loseContext();});
    await expect(page.locator('[data-bridge-elevation]')).toBeFocused();const fallback=page.locator('[data-bridge-energy-interval="fallback"]');await expect(fallback).toHaveAttribute('open','');await expect(fallback.locator('[data-interval-frame]')).toHaveAttribute('data-interval-pin','16.001');await checkWorkflowHealth(page);
  });

  for(const size of [{width:1000,height:800},{width:320,height:568}]){
    test('energy questions: guided A/B investigations, conservation diagram and saved question at '+size.width+'px',async({page})=>{
      await mountWorkflow(page,size.width,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicEnergyInterval:true,seismicEnergyOrbit:true,seismicGuideOpen:true,crossSectionMm2:30000,lateralBraceEvery:1});
      await page.setViewportSize(size);await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
      const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();await page.getByRole('button',{name:'Focus scene',exact:true}).click();await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
      const drawer=page.locator('[data-bridge-scene-drawer]');await drawer.locator('summary').first().press('Enter');
      const interval=page.locator('[data-bridge-energy-interval="scene"]');
      await page.getByRole('button',{name:'During shaking',exact:true}).click();expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicIntervalPinS:0,seismicTime:16,seismicPlaying:false});
      await expect(interval.locator('[data-energy-question]')).toHaveAttribute('data-energy-question','shaking');
      await page.getByRole('button',{name:'After shaking',exact:true}).click();const scale=await interval.locator('[data-interval-budget]').getAttribute('data-budget-scale');
      await page.getByRole('button',{name:'A · reference',exact:true}).click();await expect(interval.locator('[data-interval-budget]')).toHaveAttribute('data-budget-scale',scale!);await expect(interval.locator('[data-energy-question]')).toHaveAttribute('data-energy-question','settling');
      await page.getByRole('button',{name:'Elastic → kinetic',exact:true}).click();await expect(interval.locator('[data-energy-question]')).toHaveAttribute('data-energy-question','exchange');
      const state=await page.evaluate(()=>(window as any).__bucket());expect(state.seismicIntervalPinS).toBeGreaterThanOrEqual(16);expect(state.seismicTime).toBeGreaterThan(state.seismicIntervalPinS);
      await expect(page.locator('[data-orbit-pin]')).toHaveAttribute('data-orbit-pin',String(state.seismicIntervalPinS));
      await page.getByRole('button',{name:'Ground removes energy',exact:true}).click();await expect(interval.locator('[data-energy-question]')).toHaveAttribute('data-energy-question','returning');
      const values=await interval.locator('[data-budget-part]').evaluateAll(nodes=>Object.fromEntries(nodes.map(n=>[n.getAttribute('data-budget-part'),Number(n.getAttribute('data-budget-value'))])));
      expect(values.returned).toBeGreaterThan(0);expect(values.added).toBe(0);expect(Math.abs(values.initial-values.remaining-values.damping-values.returned)).toBeLessThan(1e-7);
      const removed=interval.locator('[data-budget-legend="returned"]');await expect(removed).toContainText('Net removed by ground');await expect(removed).not.toContainText('<0.001');
      if(values.returned < 0.001) await expect(removed).toContainText(values.returned.toExponential(2));
      const budget=interval.locator('[data-interval-budget]');await budget.evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));
      const b=await budget.boundingBox(),heading=await drawer.locator('summary').first().boundingBox(),d=await drawer.boundingBox();expect(b!.y).toBeGreaterThanOrEqual(heading!.y+heading!.height);expect(b!.y+b!.height).toBeLessThanOrEqual(d!.y+d!.height-6);
      expect(await drawer.evaluate(node=>node.scrollWidth-node.clientWidth)).toBeLessThanOrEqual(1);await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'-ground-energy-budget.png')});
      await page.getByRole('button',{name:'Elastic → kinetic',exact:true}).click();await interval.locator('[data-energy-questions]').evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'-energy-questions.png')});
      await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
      await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
      await expect(page.locator('[data-seismic-scene-question]')).toHaveAttribute('data-seismic-scene-question','exchange');
      await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();await expect(page.locator('[data-bridge-print-seismic] [data-seismic-scene-question]')).toHaveAttribute('data-seismic-scene-question','exchange');
      await expect(page.locator('[data-bridge-print-seismic]').locator('button,input,select,textarea')).toHaveCount(0);await checkWorkflowHealth(page);
    });
  }
  test('energy questions: zero shaking and manual intervals in labelled 2D with reduced motion',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,844,{bridgeView:'3d',seismicEnabled:true,seismicEnergyInterval:true,seismicIntensityG:0});
    await page.setViewportSize({width:844,height:390});await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();
    const interval=page.locator('[data-bridge-energy-interval="fallback"]');await expect(page.getByRole('button',{name:'Elastic → kinetic',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Ground removes energy',exact:true})).toBeDisabled();
    await page.getByRole('button',{name:'After shaking',exact:true}).click();await expect(interval.locator('[data-energy-question]')).toHaveAttribute('data-energy-question','settling');
    expect(await interval.locator('[data-budget-part]').evaluateAll(nodes=>nodes.every(n=>Number(n.getAttribute('data-budget-value'))===0))).toBe(true);
    await page.getByRole('spinbutton',{name:'Pinned time (s)',exact:true}).fill('17.137');await expect(interval.locator('[data-energy-question]')).toHaveCount(0);
    expect(await interval.locator('[data-interval-budget]').innerHTML()).not.toMatch(/NaN|Infinity/);await captureImmersiveRegion(page,interval.locator('[data-interval-budget]'),'bridge-844-zero-energy-budget.png',ENHANCEMENT_REPORT);await checkWorkflowHealth(page);
  });

  async function inspectWholeOrbit(page: Page) {
    const plot=page.locator('[data-bridge-energy-orbit="scene"] [data-orbit-plot]');
    await plot.evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));
    const bounds=await plot.evaluate(node=>{
      const drawer=node.closest('[data-bridge-scene-drawer]')!;
      const summary=drawer.querySelector('summary')!;
      const p=node.getBoundingClientRect(),d=drawer.getBoundingClientRect(),s=summary.getBoundingClientRect();
      return {top:p.top,headerBottom:s.bottom,bottom:p.bottom,drawerBottom:d.bottom,height:p.height,width:p.width};
    });
    expect(bounds.top).toBeGreaterThanOrEqual(bounds.headerBottom);
    expect(bounds.bottom).toBeLessThanOrEqual(bounds.drawerBottom-6);
    expect(bounds.height).toBeGreaterThanOrEqual(160);
  }

  for (const size of [{width:1000,height:800},{width:320,height:568}]) {
    test('orbit replay: recent motion, time direction and energy split at '+size.width+'px', async ({page}) => {
      await mountWorkflow(page,size.width,{bridgeView:'immersive',bridgeObserver:size.width===320?'deck':'bank',
        seismicEnabled:true,seismicEnergyOrbit:true,seismicForceLens:true,seismicGuideOpen:true,crossSectionMm2:30000,lateralBraceEvery:1});
      await page.setViewportSize(size);
      await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
      await page.evaluate(()=>(window as any).__set({seismicTime:7.217}));
      const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
      await page.getByRole('button',{name:'Focus scene',exact:true}).click();
      await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
      await checkBridgeCanvasFillsStage(page);
      const drawer=page.locator('[data-bridge-scene-drawer]');await drawer.locator('summary').first().press('Enter');
      const orbit=page.locator('[data-bridge-energy-orbit="scene"]');
      const histories=await orbit.locator('[data-orbit-free]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('points')));
      const limit=await orbit.locator('[data-orbit-frame]').getAttribute('data-orbit-limit');
      const paths=await orbit.locator('[data-orbit-recent]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('points')));
      await expect(orbit.locator('[data-orbit-recent]')).toHaveCount(4);
      await expect(orbit.locator('[data-orbit-direction]')).toHaveAttribute('data-orbit-direction','current');
      await expect(orbit.locator('[data-orbit-split] [role="img"]')).toHaveAccessibleName(/Kinetic .*%, Elastic .*%/);
      const before=await page.evaluate(()=>(window as any).__gl());
      await page.getByRole('button',{name:'Replay scene',exact:true}).click();
      await expect.poll(()=>page.evaluate(()=>(window as any).__bucket().seismicTime)).toBeGreaterThan(7.217);
      await page.getByRole('button',{name:'Pause scene replay',exact:true}).click();
      const paused=await page.evaluate(()=>(window as any).__bucket().seismicTime);
      expect(Number(await orbit.locator('[data-orbit-recent]').first().getAttribute('data-orbit-recent-end'))).toBeCloseTo(paused,10);
      expect(await orbit.locator('[data-orbit-recent]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('points')))).not.toEqual(paths);
      expect(await orbit.locator('[data-orbit-free]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('points')))).toEqual(histories);
      await page.getByRole('button',{name:'A · reference',exact:true}).click();
      expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBe(paused);
      await expect(orbit.locator('[data-orbit-recent]').first()).toHaveAttribute('data-orbit-recent','reference');
      await expect(orbit.locator('[data-orbit-split]')).toHaveAttribute('data-orbit-split','reference');
      await expect(orbit.locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-limit',limit!);
      await inspectWholeOrbit(page);
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'-recent-orbit.png')});
      await page.getByRole('button',{name:'Next turning point',exact:true}).click();
      expect(Number(await orbit.locator('[data-orbit-part="kinetic"]').getAttribute('data-orbit-fraction'))).toBeCloseTo(0,10);
      expect(Number(await orbit.locator('[data-orbit-part="elastic"]').getAttribute('data-orbit-fraction'))).toBeCloseTo(1,10);
      await page.getByRole('button',{name:'Next center crossing',exact:true}).click();
      expect(Number(await orbit.locator('[data-orbit-part="kinetic"]').getAttribute('data-orbit-fraction'))).toBeCloseTo(1,10);
      expect(Number(await orbit.locator('[data-orbit-part="elastic"]').getAttribute('data-orbit-fraction'))).toBeCloseTo(0,10);
      expect((await page.evaluate(()=>(window as any).__gl())).sceneBuilds).toBe(before.sceneBuilds);
      expect(await drawer.evaluate(node=>node.scrollWidth-node.clientWidth)).toBeLessThanOrEqual(1);
      await checkWorkflowHealth(page);
    });
  }

  for(const size of [{width:1000,height:800},{width:320,height:568}]){
    test('energy orbit: paired cycles, fixed curves, saved evidence and fullscreen at '+size.width+'px',async ({page})=>{
      await mountWorkflow(page,size.width,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicGuideOpen:true,seismicEnergyOrbit:true,crossSectionMm2:30000,lateralBraceEvery:1});
      await page.setViewportSize(size);await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
      await page.evaluate(()=>(window as any).__set({seismicTime:7.217}));
      const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
      const before=await page.evaluate(()=>(window as any).__gl());
      await page.getByRole('button',{name:'Focus scene',exact:true}).click();await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();await checkBridgeCanvasFillsStage(page);
      const drawer=page.locator('[data-bridge-scene-drawer]'),summary=drawer.locator('summary').first();await summary.press('Enter');
      const orbit=page.locator('[data-bridge-energy-orbit="scene"]'),plot=orbit.locator('[data-orbit-plot]');
      await plot.scrollIntoViewIfNeeded();await expect(plot).toBeVisible();await expect(orbit.locator('[data-orbit-marker]')).toHaveCount(2);
      const range=await orbit.locator('[data-orbit-frame]').getAttribute('data-orbit-limit');
      const curves=await orbit.locator('[data-orbit-free]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('points')));
      expect(curves[0]).not.toBe(curves[1]);expect(curves.join(' ')).not.toMatch(/NaN|Infinity/);
      const next=page.getByRole('button',{name:'Next turning point',exact:true}),turn=Number(await next.getAttribute('data-orbit-next-time'));await next.click();
      expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBe(turn);
      await expect(orbit.locator('[data-orbit-insight]')).toHaveAttribute('data-orbit-insight','turning');
      expect(Number(await orbit.locator('[data-orbit-energy="kinetic"]').getAttribute('data-orbit-value'))).toBeLessThan(1e-20);
      await page.getByRole('button',{name:'Next center crossing',exact:true}).click();
      await expect(orbit.locator('[data-orbit-insight]')).toHaveAttribute('data-orbit-insight','crossing');
      expect(Number(await orbit.locator('[data-orbit-energy="elastic"]').getAttribute('data-orbit-value'))).toBeLessThan(1e-20);
      await page.getByRole('button',{name:'A · reference',exact:true}).click();
      await expect(orbit.locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-trial','reference');await expect(orbit.locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-limit',range!);
      await page.getByRole('button',{name:'Next turning point',exact:true}).click();
      const time=await page.evaluate(()=>(window as any).__bucket().seismicTime);
      expect(await orbit.locator('[data-orbit-free]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('points')))).toEqual(curves);
      await inspectWholeOrbit(page);await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'-energy-orbit.png')});
      expect(await drawer.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
      await next.focus();await next.press('Escape');await expect(drawer).not.toHaveAttribute('open');await expect(summary).toBeFocused();
      await expect(page.locator('[data-bridge-compact-orbit]')).toContainText('J/kg');
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'-orbit-scene.png')});
      await summary.press('Enter');await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');
      await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill('At a turning point the deck has no relative velocity.');await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
      const saved=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);expect(saved.scene.display.energyOrbit).toBe(true);expect(saved.timeS).toBe(time);
      await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
      await page.evaluate(()=>(window as any).__set({seismicEnergyOrbit:false,seismicTime:0,bridgeView:'2d',seismicDampingRatio:0.3}));
      await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
      expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicEnergyOrbit:true,seismicTime:time,seismicPlaying:false,seismicSceneTrial:'reference'});
      const evidence=await page.locator('[data-seismic-scene-orbit]').textContent();
      await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();
      await expect(page.locator('[data-bridge-print-seismic] [data-seismic-scene-orbit]')).toHaveText(evidence!);
      await expect(page.locator('[data-bridge-print-seismic]').locator('button,input,select,textarea')).toHaveCount(0);await checkWorkflowHealth(page);
    });
  }
  test('energy orbit: reduced-motion zero shaking, landscape tools and deliberate graphics recovery',async ({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicTime:16,seismicIntensityG:0,seismicEnergyOrbit:true,seismicSceneFocus:true,seismicReadoutCollapsed:true,crossSectionMm2:30000,lateralBraceEvery:1});
    await page.setViewportSize({width:844,height:390});const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
    await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();await checkBridgeCanvasFillsStage(page);
    const drawer=page.locator('[data-bridge-scene-drawer]');await drawer.locator('summary').first().press('Enter');
    const orbit=page.locator('[data-bridge-energy-orbit="scene"]');await inspectWholeOrbit(page);
    await expect(page.getByRole('button',{name:'Next turning point',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Next center crossing',exact:true})).toBeDisabled();
    await expect(orbit.locator('[data-orbit-insight]')).toContainText('No shaking');
    expect(await orbit.locator('[data-orbit-energy]').evaluateAll(rows=>rows.every(row=>Number(row.getAttribute('data-orbit-value'))===0))).toBe(true);
    await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-844-orbit-zero.png')});
    await page.getByRole('button',{name:'Next turning point',exact:true}).focus();
    await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;const context=canvas.getContext('webgl2')||canvas.getContext('webgl'),extension=context?.getExtension('WEBGL_lose_context');if(!extension)throw new Error('No context loss extension');(window as any).__orbitLoss=extension;extension.loseContext();});
    await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
    const fallback=page.locator('[data-bridge-energy-orbit="fallback"]');await expect(fallback).toHaveAttribute('open','');await expect(fallback.locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-trial','current');
    await page.evaluate(()=>(window as any).__orbitLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');
    expect(await page.evaluate(()=>(window as any).__bucket().bridgeView)).toBe('2d');await page.getByRole('button',{name:'From the riverbank',exact:true}).click();
    expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicEnergyOrbit:true,seismicPlaying:false,seismicTime:16});await checkWorkflowHealth(page);
  });
  test('energy orbit: undamped free-vibration inspection in the labelled 2D view',async ({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,1000,{bridgeView:'3d',seismicEnabled:true,seismicTime:16,seismicDampingRatio:0,seismicEnergyOrbit:true});
    await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();
    const orbit=page.locator('[data-bridge-energy-orbit="fallback"]');await expect(orbit.locator('[data-orbit-insight]')).toContainText('undamped');
    const before=Number(await orbit.locator('[data-orbit-energy="stored"]').getAttribute('data-orbit-value'));
    await page.getByRole('button',{name:'Next turning point',exact:true}).click();await expect(orbit.locator('[data-orbit-insight]')).toHaveAttribute('data-orbit-insight','turning');
    await page.getByRole('button',{name:'Next center crossing',exact:true}).click();const after=Number(await orbit.locator('[data-orbit-energy="stored"]').getAttribute('data-orbit-value'));
    await expect(orbit.locator('[data-orbit-insight]')).toContainText('If damping is present');
    expect(Math.abs(after-before)/before).toBeLessThan(0.01);expect(await page.evaluate(()=>(window as any).__bucket().seismicPlaying)).toBe(false);
    await captureImmersiveRegion(page,orbit,'bridge-1000-orbit-2d.png',ENHANCEMENT_REPORT);await checkWorkflowHealth(page);
  });

  test('force lens: selected A/B vectors, fixed scale and stable resources in the riverbank scene',async ({page})=>{
    await mountWorkflow(page,1000,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicGuideOpen:true,crossSectionMm2:30000,lateralBraceEvery:1});
    await page.setViewportSize({width:1000,height:800});
    await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
    await page.evaluate(()=>(window as any).__set({seismicTime:7.217}));
    const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
    const lens=page.locator('[data-bridge-force-lens="scene"]');
    await lens.locator(':scope > summary').press('Enter');
    await expect(lens).toHaveAttribute('open','');
    await stage.scrollIntoViewIfNeeded();
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceLensVisible)).toBe(true);
    const before=await page.evaluate(()=>(window as any).__gl());
    expect(before.forceTrial).toBe('current');expect(before.forceVectors).toHaveLength(3);
    const values=await lens.locator('[data-force-reading]').evaluateAll(rows=>rows.map(row=>Number(row.getAttribute('data-force-value'))));
    expect(values).toEqual(before.forceVectors.map((v:any)=>v.valueNPerKg));expect(values[0]+values[1]).toBeCloseTo(values[2],10);
    await page.getByRole('button',{name:'A · reference',exact:true}).click();await stage.scrollIntoViewIfNeeded();
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceTrial)).toBe('reference');
    const a=await page.evaluate(()=>(window as any).__gl());expect(a.forceLimitNPerKg).toBe(before.forceLimitNPerKg);
    expect(a.forceVectors.map((v:any)=>v.valueNPerKg)).not.toEqual(values);
    await expect(page.locator('[data-force-frame]')).toHaveAttribute('data-force-trial','reference');
    await page.getByRole('button',{name:'Focus scene',exact:true}).click();
    await expect(page.locator('[data-bridge-compact-forces]')).toContainText('N/kg');
    await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();await checkBridgeCanvasFillsStage(page);
    await page.getByRole('button',{name:'Step scene backward 0.5 s',exact:true}).click();await page.getByRole('button',{name:'Step scene forward 0.5 s',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceVectors[0].valueNPerKg)).toBeCloseTo(a.forceVectors[0].valueNPerKg,10);
    const warm=await page.evaluate(()=>(window as any).__gl());
    for(let cycle=0;cycle<3;cycle++){await page.getByRole('button',{name:'Step scene backward 0.5 s',exact:true}).click();await page.getByRole('button',{name:'Step scene forward 0.5 s',exact:true}).click();}
    expect(await page.evaluate(()=>(window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);expect(await page.evaluate(()=>(window as any).__gl().resources)).toEqual(warm.resources);
    await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-1000-force-bank.png')});
    await page.locator('[data-bridge-scene-drawer] > summary').press('Enter');await lens.locator('[data-force-reading="spring"]').scrollIntoViewIfNeeded();
    await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-1000-force-tools.png')});
    expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBe(7.217);expect(await page.evaluate(()=>(window as any).__bucket().seismicPlaying)).toBe(false);
    await checkWorkflowHealth(page);
  });

  test('force lens: phone walking, camera turns, keyboard tools and saved observation restoration',async ({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await mountWorkflow(page,320,{bridgeView:'immersive',bridgeObserver:'deck',bridgeWalkPos:0.45,seismicEnabled:true,seismicTime:7.217,seismicForceLens:true,crossSectionMm2:30000,lateralBraceEvery:1});
    await page.setViewportSize({width:320,height:568});
    const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
    await page.getByRole('button',{name:'Focus scene',exact:true}).click();await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();await checkBridgeCanvasFillsStage(page);
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceLensVisible)).toBe(true);
    const before=await page.evaluate(()=>(window as any).__gl());
    await page.getByRole('button',{name:'Walk toward far end',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceVectors[0].origin[0])).toBeCloseTo(before.forceVectors[0].origin[0]+1.5,8);
    const viewer=page.locator('[aria-describedby="bridge-gl-description"]');await viewer.focus();await viewer.press('ArrowRight');
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceVectors[0].origin[2])).not.toBe(before.forceVectors[0].origin[2]);
    expect(await page.evaluate(()=>(window as any).__gl().forceVectors.map((v:any)=>v.valueNPerKg))).toEqual(before.forceVectors.map((v:any)=>v.valueNPerKg));
    await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-320-force-walkway.png')});
    const drawer=page.locator('[data-bridge-scene-drawer]'),summary=drawer.locator('summary').first();await summary.press('Enter');
    const lens=page.locator('[data-bridge-force-lens="scene"]');await lens.locator(':scope > summary').scrollIntoViewIfNeeded();
    const causality=lens.locator('[data-force-motion="scene"]'),velocity=causality.locator('[data-force-relative-speed]');await velocity.scrollIntoViewIfNeeded();
    expect(await causality.locator('[data-force-motion-direction]').evaluate(node=>{const box=node.getBoundingClientRect();return [box.width,box.height];})).toEqual([80,24]);
    const cards=await causality.locator('[data-force-motion-contribution]').evaluateAll(nodes=>nodes.map(node=>{const box=node.getBoundingClientRect();return {left:box.left,top:box.top,bottom:box.bottom};}));expect(cards[0].left).toBeCloseTo(cards[1].left,1);expect(cards[1].top).toBeGreaterThanOrEqual(cards[0].bottom);
    await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-320-force-direction-tools.png')});
    const rates=causality.locator('[data-force-motion-rate-details]');await rates.locator('summary').press('Enter');await expect(rates).toHaveAttribute('open','');await rates.locator('p').scrollIntoViewIfNeeded();await expect(rates.locator('p')).toBeVisible();await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-320-force-exchange-tools.png')});await rates.locator('summary').press('Enter');await expect(rates).not.toHaveAttribute('open');
    expect(await drawer.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
    await lens.locator(':scope > summary').press('Escape');await expect(drawer).not.toHaveAttribute('open');await expect(summary).toBeFocused();
    await summary.press('Enter');await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');
    await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill('Spring and damping can point in different directions.');
    await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
    const saved=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);expect(saved.scene.display.forceLens).toBe(true);
    await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
    await page.evaluate(()=>(window as any).__set({seismicForceLens:false,seismicTime:0,bridgeView:'2d'}));
    await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
    expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicForceLens:true,seismicTime:7.217,seismicPlaying:false,bridgeWalkPos:0.5});
    await summary.press('Enter');await stage.scrollIntoViewIfNeeded();await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceLensVisible)).toBe(true);
    expect(await page.evaluate(()=>(window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
    await expect(page.locator('[data-seismic-scene-forces]')).toContainText('spring / damping / net');
    const evidence=await page.locator('[data-seismic-scene-forces]').textContent();
    await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();
    await expect(page.locator('[data-bridge-print-seismic] [data-seismic-scene-forces]')).toHaveText(evidence!);
    await expect(page.locator('[data-bridge-print-seismic]').locator('button,input,select,textarea')).toHaveCount(0);
    await checkWorkflowHealth(page);
  });

  test('force lens: zero shaking, graphics fallback and deliberate recovery in landscape',async ({page})=>{
    await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicTime:16,seismicIntensityG:0,seismicForceLens:true,seismicSceneFocus:true,seismicReadoutCollapsed:true,crossSectionMm2:30000,lateralBraceEvery:1});
    await page.setViewportSize({width:844,height:390});const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
    await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();await checkBridgeCanvasFillsStage(page);
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceLensVisible)).toBe(true);
    expect(await page.evaluate(()=>(window as any).__gl().forceVectors.every((v:any)=>v.direction===0&&v.valueNPerKg===0))).toBe(true);
    await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-844-force-zero.png')});
    await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
      const context=canvas.getContext('webgl2')||canvas.getContext('webgl'),extension=context?.getExtension('WEBGL_lose_context');
      if(!extension)throw new Error('WebGL loss extension unavailable');(window as any).__forceLoss=extension;extension.loseContext();});
    await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
    const fallback=page.locator('[data-bridge-force-lens="fallback"]');await expect(fallback).toHaveAttribute('open','');
    await expect(fallback.locator('[data-force-frame]')).toHaveAttribute('data-force-trial','current');
    expect(await fallback.locator('[data-force-reading]').evaluateAll(rows=>rows.every(row=>Number(row.getAttribute('data-force-value'))===0))).toBe(true);
    await page.evaluate(()=>(window as any).__forceLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');
    expect(await page.evaluate(()=>(window as any).__bucket().bridgeView)).toBe('2d');await page.getByRole('button',{name:'From the riverbank',exact:true}).click();await stage.scrollIntoViewIfNeeded();
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceLensVisible)).toBe(true);
    expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicForceLens:true,seismicTime:16,seismicPlaying:false});
    await checkWorkflowHealth(page);
  });

  for (const size of [{width:1000,height:800},{width:320,height:568},{width:844,height:390}]) {
    test('scene focus: paired drawer, compact replay and stable graphics at '+size.width+'x'+size.height,async ({page})=>{
      await mountWorkflow(page,size.width,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicGuideOpen:true,
        crossSectionMm2:30000,lateralBraceEvery:1,seismicObservation:'Keep the comparison.'});
      await page.setViewportSize(size);
      await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
      const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
      await page.getByRole('button',{name:'A · reference',exact:true}).click();
      await page.getByRole('combobox',{name:'Scene key moments',exact:true}).selectOption('motion');
      await page.getByRole('button',{name:'B · current',exact:true}).click();
      const time=await page.evaluate(()=>(window as any).__bucket().seismicTime);
      await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(true);
      const before=await page.evaluate(()=>(window as any).__gl());
      const focusBox=await page.getByRole('button',{name:'Focus scene',exact:true}).boundingBox();
      const initialPanel=await page.locator('[data-bridge-scene-readout]').boundingBox();
      if(!focusBox||!initialPanel)throw new Error('Scene controls missing');
      expect(focusBox.x).toBeGreaterThanOrEqual(initialPanel.x+initialPanel.width+3);
      await page.getByRole('button',{name:'Focus scene',exact:true}).click();
      await expect(stage).toHaveAttribute('data-bridge-scene-focus','true');
      const drawer=page.locator('[data-bridge-scene-drawer]');
      await expect(drawer).not.toHaveAttribute('open');
      await expect(page.locator('[data-bridge-compact-comparison]')).toHaveAttribute('data-bridge-compact-comparison',String(time));
      await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
      await checkBridgeCanvasFillsStage(page);
      const replay=page.locator('[data-bridge-focus-replay]');
      const a=await drawer.boundingBox(),b=await replay.boundingBox();
      if(!a||!b)throw new Error('Focus panels missing');expect(a.y+a.height).toBeLessThanOrEqual(b.y-4);
      expect(await replay.evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
      await expect(page.getByRole('combobox',{name:'Scene key moments',exact:true})).toHaveCount(0);
      await expect(page.getByRole('slider',{name:'Scene replay time (s)',exact:true})).toHaveCount(1);
      await page.getByRole('button',{name:'Step scene backward 0.5 s',exact:true}).click();
      expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBeCloseTo(time-0.5,9);
      await page.getByRole('button',{name:'Step scene forward 0.5 s',exact:true}).click();
      expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBeCloseTo(time,9);
      const warm=await page.evaluate(()=>(window as any).__gl());
      expect(warm.sceneBuilds).toBe(before.sceneBuilds);
      // A changed viewport or first inspected frame can bring previously culled
      // geometry into view. Verify repeated inspection after those first uploads.
      for(let cycle=0;cycle<3;cycle++){
        await page.getByRole('button',{name:'Step scene backward 0.5 s',exact:true}).click();
        await page.getByRole('button',{name:'Step scene forward 0.5 s',exact:true}).click();
      }
      expect(await page.evaluate(()=>(window as any).__gl().resources)).toEqual(warm.resources);
      expect(await page.evaluate(()=>(window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'x'+size.height+'-focus-scene.png')});
      const summary=drawer.locator('summary').first();
      await summary.press('Enter');await expect(drawer).toHaveAttribute('open','');
      await expect(page.getByRole('combobox',{name:'Scene key moments',exact:true})).toBeVisible();
      const expanded=await drawer.boundingBox(),replayBox=await replay.boundingBox();
      if(!expanded||!replayBox)throw new Error('Focus drawer missing');expect(expanded.y+expanded.height).toBeLessThanOrEqual(replayBox.y-4);
      expect(await drawer.evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
      expect(await page.evaluate(()=>(window as any).__bucket().seismicPlaying)).toBe(false);
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'x'+size.height+'-focus-tools.png')});
      await page.getByRole('combobox',{name:'Scene key moments',exact:true}).selectOption('end');
      expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBe(24);
      await summary.press('Enter');await expect(drawer).not.toHaveAttribute('open');
      await page.getByRole('button',{name:'Leave scene focus',exact:true}).click();
      await expect(stage).toHaveAttribute('data-bridge-scene-focus','false');
      await expect(page.getByRole('combobox',{name:'Scene key moments',exact:true})).toHaveCount(1);
      expect(await page.evaluate(()=>(window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
      expect(await page.evaluate(()=>(window as any).__bucket().seismicObservation)).toBe('Keep the comparison.');
      await checkWorkflowHealth(page);
    });
  }

  test('scene focus: fullscreen touch walking and complete observation restoration on a phone',async ({page})=>{
    await mountWorkflow(page,320,{bridgeView:'immersive',bridgeObserver:'deck',bridgeWalkPos:0.45,seismicEnabled:true,
      seismicGuideOpen:true,crossSectionMm2:30000,lateralBraceEvery:1,designName:'Walkway study'});
    await page.setViewportSize({width:320,height:568});
    await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
    await page.evaluate(()=>(window as any).__set({seismicTime:7.217}));
    const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
    await page.getByRole('button',{name:'Focus scene',exact:true}).click();
    await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
    await checkBridgeCanvasFillsStage(page);
    const before=await page.evaluate(()=>(window as any).__gl());
    const forward=page.getByRole('button',{name:'Walk toward far end',exact:true});
    await forward.click();expect(await page.evaluate(()=>(window as any).__bucket().bridgeWalkPos)).toBe(0.5);
    await forward.click();expect(await page.evaluate(()=>(window as any).__bucket().bridgeWalkPos)).toBe(0.55);
    const back=page.getByRole('button',{name:'Walk toward entrance',exact:true});await back.click();
    expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeWalkPos:0.5,seismicTime:7.217,seismicPlaying:false});
    expect(await forward.evaluate(element=>element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(44);
    expect(await back.evaluate(element=>element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(()=>(window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
    expect(await page.evaluate(()=>(window as any).__gl().resources)).toEqual(before.resources);
    await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-320-focus-walkway.png')});
    const drawer=page.locator('[data-bridge-scene-drawer]');await drawer.locator('summary').first().press('Enter');
    await expect(page.locator('[data-bridge-walk-controls]')).toHaveCount(0);
    await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');
    await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill('At the midpoint I can compare the railing with the dashed outline.');
    await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
    const saved=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);
    expect(saved.scene.display.focusMode).toBe(true);expect(saved.scene.walkPos).toBe(0.5);
    await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
    await page.evaluate(()=>(window as any).__set({seismicSceneFocus:false,bridgeView:'2d',bridgeWalkPos:0.12,span:20,
      seismicTime:18,seismicDampingRatio:0.3,seismicSceneCompare:false}));
    await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
    await expect(page.locator('[aria-describedby="bridge-gl-description"]')).toBeFocused();
    expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicSceneFocus:true,seismicReadoutCollapsed:false,
      bridgeView:'immersive',bridgeObserver:'deck',bridgeWalkPos:0.5,span:30,seismicTime:7.217,seismicDampingRatio:0.2,
      seismicSceneSource:'capture',seismicSceneCompare:true,seismicPlaying:false});
    await expect(page.getByRole('textbox',{name:'Scene observation note',exact:true})).toHaveValue(saved.observation);
    await drawer.locator('summary').first().press('Enter');
    await expect(page.locator('[data-bridge-walk-position]')).toHaveText('50%');
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(true);
    await checkWorkflowHealth(page);
  });

  test('scene focus: keyboard drawer, reduced-motion steps and fill-frame landscape',async ({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicTime:7.217});
    await page.setViewportSize({width:844,height:390});
    const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
    await page.evaluate(()=>{const stage=document.querySelector('[data-allo-fs-stage]') as any;
      stage.requestFullscreen=()=>Promise.reject(new Error('Use fill-frame for this keyboard workflow'));stage.webkitRequestFullscreen=undefined;});
    await page.getByRole('button',{name:'Focus scene',exact:true}).click();
    await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
    await checkBridgeCanvasFillsStage(page);
    await expect(page.getByRole('button',{name:'Replay scene',exact:true})).toBeDisabled();
    await page.getByRole('button',{name:'Step scene forward 0.5 s',exact:true}).click();
    expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBeCloseTo(7.717,9);
    const drawer=page.locator('[data-bridge-scene-drawer]'),summary=drawer.locator('summary').first();
    await summary.press('Enter');
    const moments=page.getByRole('combobox',{name:'Scene key moments',exact:true});await moments.focus();await moments.press('Escape');
    await expect(drawer).not.toHaveAttribute('open');await expect(summary).toBeFocused();
    await expect(page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true})).toHaveAttribute('aria-pressed','true');
    await summary.press('Enter');await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');
    const note=page.getByRole('textbox',{name:'Scene observation note',exact:true});await note.fill('Keyboard inspection remains available.');
    await note.press('Escape');await expect(drawer).not.toHaveAttribute('open');await expect(summary).toBeFocused();
    expect(await page.evaluate(()=>(window as any).__bucket().seismicSceneNote)).toBe('Keyboard inspection remains available.');
    await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
    await checkWorkflowHealth(page);
  });

  test('scene focus: graphics recovery preserves the layout and paused phone observation',async ({page})=>{
    await mountWorkflow(page,320,{bridgeView:'immersive',bridgeObserver:'deck',seismicEnabled:true,seismicTime:7.217,
      seismicSceneNote:'Keep my scene draft.',seismicSceneFocus:true,seismicReadoutCollapsed:true});
    await page.setViewportSize({width:320,height:568});const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
    await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
    await page.getByRole('button',{name:'Leave scene focus',exact:true}).focus();
    await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
      const context=canvas.getContext('webgl2')||canvas.getContext('webgl'),extension=context?.getExtension('WEBGL_lose_context');
      if(!extension)throw new Error('WebGL loss extension unavailable');(window as any).__focusLoss=extension;extension.loseContext();});
    await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
    expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeView:'2d',seismicSceneFocus:true,seismicTime:7.217,
      seismicPlaying:false,seismicSceneNote:'Keep my scene draft.'});
    await page.evaluate(()=>(window as any).__focusLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');
    expect(await page.evaluate(()=>(window as any).__bucket().bridgeView)).toBe('2d');
    await page.getByRole('button',{name:'On the bridge',exact:true}).click();await stage.scrollIntoViewIfNeeded();
    await expect(page.locator('[data-bridge-focus-replay]')).toBeVisible();
    await expect(page.getByRole('button',{name:'Walk toward far end',exact:true})).toBeVisible();
    expect(await page.evaluate(()=>(window as any).__bucket().seismicPlaying)).toBe(false);
    await checkWorkflowHealth(page);
  });

  for (const width of [1000,320]) {
    test('simultaneous responses: shared frame, stable resources and complete snapshot at '+width+'px',async ({page})=>{
      const design={span:40,height:8,nBays:6,trussStyle:'pratt',materialId:'steel',crossSectionMm2:30000,
        loadMode:'vehicle',loadPerJoint:73,vehicleLoad:220,vehiclePos:0.37,lateralBraceEvery:1};
      await mountWorkflow(page,width,{...design,bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicGuideOpen:true,
        designName:'Classroom crossing',designNotes:'Inspect the deck against the banks.'});
      await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
      const stage=page.locator('[data-allo-fs-stage]'); await stage.scrollIntoViewIfNeeded();
      await page.getByRole('button',{name:'A · reference',exact:true}).click();
      await page.getByRole('combobox',{name:'Scene key moments',exact:true}).selectOption('motion');
      const time=await page.evaluate(()=>(window as any).__bucket().seismicTime);
      await page.getByRole('button',{name:'B · current',exact:true}).click();
      const readings=page.locator('[data-bridge-overlay-readings]');
      await expect(readings).toHaveAttribute('data-bridge-overlay-readings',String(time));
      await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(true);
      await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOutlineTrial)).toBe('reference');
      const expected=await page.evaluate(()=>(window as any).__gl());
      expect(expected.comparisonReferenceM).not.toBe(expected.comparisonCurrentM);
      expect(expected.comparisonOutlinePosition[2]).toBeCloseTo(expected.comparisonReferenceM*10,8);
      expect(expected.deckOffsetM).toBeCloseTo(expected.comparisonCurrentM,12);
      expect(expected.comparisonTrailSamples).toBe(31);
      await page.getByRole('button',{name:'A · reference',exact:true}).click();
      await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOutlineTrial)).toBe('current');
      await page.getByRole('button',{name:'B · current',exact:true}).click();
      await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOutlineTrial)).toBe('reference');
      const warm=await page.evaluate(()=>(window as any).__gl());
      for(let i=0;i<8;i++){
        await page.getByRole('button',{name:'Show both responses',exact:true}).click();
        await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(i%2!==0);
        await page.evaluate(t=>(window as any).__set({seismicTime:t}),time+i*0.05);
      }
      await page.evaluate(t=>(window as any).__set({seismicTime:t}),time);
      await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonReferenceM)).toBeCloseTo(expected.comparisonReferenceM,12);
      const after=await page.evaluate(()=>(window as any).__gl());
      expect(after.sceneBuilds).toBe(warm.sceneBuilds); expect(after.resources).toEqual(warm.resources);
      await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
      await checkBridgeCanvasFillsStage(page);
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+width+'-simultaneous-responses.png')});
      const measurementToggle=page.locator('[data-bridge-scene-readout] > summary');
      await measurementToggle.press('Enter');
      await expect(page.locator('[data-bridge-compact-comparison]')).toHaveAttribute('data-bridge-compact-comparison',String(time));
      await expect(page.locator('[data-compact-response=reference]')).toContainText('outline');
      await expect(page.locator('[data-compact-response=current]')).toContainText('solid');
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+width+'-simultaneous-compact.png')});
      await measurementToggle.press('Enter');
      await expect(readings).toHaveAttribute('data-bridge-overlay-readings',String(time));
      const panel=await page.locator('[data-bridge-scene-readout]').boundingBox(),replay=await page.locator('[data-bridge-scene-replay]').boundingBox();
      if(!panel||!replay)throw new Error('Scene panels missing'); expect(panel.y+panel.height).toBeLessThanOrEqual(replay.y-4);
      await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');
      await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill('The reference moves farther under the same ground motion.');
      await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
      const saved=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);
      expect(saved.scene.design.inputs).toEqual(design);
      expect(saved.scene.comparison).toMatchObject({referenceInputs:{dampingRatio:0.05},currentInputs:{dampingRatio:0.2}});
      await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
      await page.evaluate(()=>(window as any).__set({span:20,height:3,nBays:4,materialId:'wood',trussStyle:'howe',crossSectionMm2:1000,
        loadMode:'uniform',loadPerJoint:1,vehicleLoad:40,vehiclePos:0.9,lateralBraceEvery:2,bridgeView:'2d',
        designName:'Changed',designNotes:'Changed',seismicTime:18,seismicDampingRatio:0.3,seismicFrequencyHz:2,
        seismicIntensityG:0.2,seismicSceneCompare:false,seismicSceneOverlay:false,seismicGuideBaseline:null}));
      await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
      await expect(page.locator('[aria-describedby="bridge-gl-description"]')).toBeFocused();
      const restored=await page.evaluate(()=>(window as any).__bucket());
      expect(restored).toMatchObject({...design,designName:'Classroom crossing',designNotes:'Inspect the deck against the banks.',
        seismicTime:time,seismicDampingRatio:0.2,seismicFrequencyHz:1.1,seismicIntensityG:0.12,
        seismicSceneCompare:true,seismicSceneSource:'capture',seismicSceneTrial:'current',seismicSceneOverlay:true,seismicPlaying:false});
      await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(true);
      const reproduced=await page.evaluate(()=>(window as any).__gl());
      expect(reproduced.extent).toEqual(expected.extent);
      expect(reproduced.comparisonReferenceM).toBeCloseTo(expected.comparisonReferenceM,12);
      expect(reproduced.comparisonCurrentM).toBeCloseTo(expected.comparisonCurrentM,12);
      const motion=await page.locator('[data-seismic-scene-pair-motion]').textContent();
      await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();
      const report=page.locator('[data-bridge-print-seismic]');
      await expect(report.locator('[data-seismic-scene-design]')).toContainText('40 m × 8 m');
      await expect(report).toContainText('Classroom crossing');
      await expect(report.locator('[data-seismic-scene-pair-motion]')).toHaveText(motion!);
      await expect(report.locator('button,input,textarea,select')).toHaveCount(0);
      await captureImmersiveRegion(page,report,'bridge-'+width+'-complete-scene-report.png',ENHANCEMENT_REPORT);
      await checkWorkflowHealth(page);
    });
  }

  test('simultaneous responses: matching motion, reduced-motion inspection and captured A/B graphics recovery',async ({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await mountWorkflow(page,1000,{span:40,bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicGuideOpen:true});
    await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
    const stage=page.locator('[data-allo-fs-stage]'); await stage.scrollIntoViewIfNeeded();
    await page.evaluate(()=>(window as any).__set({seismicTime:7.217,seismicFrequencyHz:1.4}));
    await expect(page.getByRole('button',{name:'Show both responses',exact:true})).toBeDisabled();
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(false);
    await page.evaluate(()=>(window as any).__set({seismicFrequencyHz:1.1}));
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(true);
    await expect(page.getByRole('button',{name:'Replay scene',exact:true})).toBeDisabled();
    await page.getByRole('button',{name:'A · reference',exact:true}).click();
    await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
    await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');
    await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill('A and B share the ground motion.');
    await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
    await page.evaluate(()=>{
      const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
      const context=canvas.getContext('webgl2')||canvas.getContext('webgl');const extension=context?.getExtension('WEBGL_lose_context');
      if(!extension)throw new Error('WebGL loss extension unavailable');(window as any).__pairLoss=extension;extension.loseContext();
    });
    await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
    await page.evaluate(()=>(window as any).__set({span:25,seismicTime:18,seismicDampingRatio:0.3}));
    await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
    await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
    expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({span:40,bridgeView:'2d',seismicTime:7.217,
      seismicDampingRatio:0.2,seismicSceneCompare:true,seismicSceneTrial:'reference',seismicSceneSource:'capture',seismicPlaying:false});
    await page.evaluate(()=>(window as any).__pairLoss.restoreContext());
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');
    expect(await page.evaluate(()=>(window as any).__bucket().bridgeView)).toBe('2d');
    await page.getByRole('button',{name:'From the riverbank',exact:true}).click();await stage.scrollIntoViewIfNeeded();
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(true);
    await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOutlineTrial)).toBe('current');
    await expect(page.getByRole('button',{name:'Replay scene',exact:true})).toBeDisabled();
    await checkWorkflowHealth(page);
  });

  for (const width of [1000, 320]) {
    test('scene observations: record reference A, revisit the bank and print at ' + width + 'px', async ({ page }) => {
      await mountWorkflow(page,width,{bridgeView:'immersive',bridgeObserver:'bank',bridgeBankYaw:18,bridgeBankPitch:-8,
        seismicEnabled:true,seismicGuideOpen:true,seismicPrediction:'B prediction stays here',seismicObservation:'B explanation stays here'});
      await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
      await page.evaluate(() => (window as any).__set({seismicTime:7.217}));
      const stage=page.locator('[data-allo-fs-stage]');
      await stage.scrollIntoViewIfNeeded();
      await page.getByRole('button',{name:'A · reference',exact:true}).click();
      await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
      await checkBridgeCanvasFillsStage(page);
      await page.getByRole('button',{name:'Replay scene',exact:true}).click();
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(true);
      const recorder=page.locator('[data-bridge-scene-recorder]');
      await recorder.locator('summary').press('Enter');
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
      await page.evaluate(() => (window as any).__set({seismicTime:7.217}));
      const note='From the bank, the deck moves relative to the ground.\nThe damper transfers stored energy into dissipated energy.';
      await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill(note);
      await expect(recorder.locator('[data-scene-record-context]')).toHaveText('A · reference · 7.217 s');
      await page.locator('[data-bridge-scene-readout]').evaluate(element => {element.scrollTop=0;});
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+width+'-scene-observation.png')});
      const panel=await page.locator('[data-bridge-scene-readout]').boundingBox();
      const replay=await page.locator('[data-bridge-scene-replay]').boundingBox();
      if(!panel||!replay)throw new Error('Scene controls missing');
      expect(panel.y+panel.height).toBeLessThanOrEqual(replay.y-4);
      await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
      await expect(recorder.locator('[data-scene-record-saved]')).toContainText('saved in the earthquake notebook');
      const bucket=await page.evaluate(() => (window as any).__bucket());
      expect(bucket).toMatchObject({seismicDampingRatio:0.2,seismicSceneTrial:'reference',seismicTime:7.217,
        seismicPlaying:false,seismicPrediction:'B prediction stays here',seismicObservation:'B explanation stays here'});
      const record=bucket.seismicTrials[0];
      expect(record).toMatchObject({timeS:7.217,prediction:'',observation:note,inputs:{dampingRatio:0.05},
        scene:{source:'reference',view:'immersive',observer:'bank',bankYaw:18,bankPitch:-8}});
      await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
      const card=page.locator('[data-seismic-trial="0"]');
      await expect(card).toContainText('Captured from the reference scene · Riverbank viewpoint');
      const power=await card.locator('[data-seismic-scene-power]').textContent();
      await page.evaluate(() => (window as any).__set({bridgeView:'2d',bridgeObserver:'deck',bridgeBankYaw:-30,bridgeBankPitch:20,
        seismicTime:18,seismicDampingRatio:0.3,seismicSceneCompare:true,seismicSceneTrial:'reference'}));
      await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
      const view=page.locator('[aria-describedby="bridge-gl-description"]');
      await expect(view).toBeFocused();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().observerAnchor)).toBe('ground');
      expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({bridgeView:'immersive',bridgeObserver:'bank',
        bridgeBankYaw:18,bridgeBankPitch:-8,seismicTime:7.217,seismicDampingRatio:0.2,seismicSceneCompare:true,
        seismicSceneSource:'capture',seismicSceneTrial:'reference',seismicSceneNote:note,seismicPlaying:false});
      await expect(page.getByRole('textbox',{name:'Scene observation note',exact:true})).toHaveValue(note);
      await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();
      const report=page.locator('[data-bridge-print-seismic]');
      await expect(report).toContainText('Inspected time: 7.217 s');
      await expect(report).toContainText(note.replaceAll('\n',' '));
      await expect(report.locator('[data-seismic-scene-power]')).toHaveText(power!);
      await expect(report.locator('button,input,textarea,select')).toHaveCount(0);
      await captureImmersiveRegion(page,report,'bridge-'+width+'-scene-observation-report.png',ENHANCEMENT_REPORT);
      await checkWorkflowHealth(page);
    });
  }

  test('scene observations: graphics loss preserves the saved pose and focused fallback until deliberate recovery', async ({page}) => {
    await mountWorkflow(page,1000,{bridgeView:'immersive',bridgeObserver:'bank',bridgeBankYaw:18,bridgeBankPitch:-8,
      seismicEnabled:true,seismicTime:7.217,seismicSceneRecording:true,seismicSceneNote:'Watch the ground and the deck.'});
    await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
    await page.evaluate(() => {
      const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
      const context=canvas.getContext('webgl2')||canvas.getContext('webgl');
      const extension=context?.getExtension('WEBGL_lose_context');
      if(!extension)throw new Error('WebGL loss extension unavailable');
      (window as any).__sceneRecordLoss=extension; extension.loseContext();
    });
    await expect(page.locator('[data-bridge-elevation]')).toBeVisible();
    await page.evaluate(() => (window as any).__set({seismicTime:18,bridgeBankYaw:-30}));
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
    await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
    expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({bridgeView:'2d',bridgeObserver:'bank',
      bridgeBankYaw:18,bridgeBankPitch:-8,seismicTime:7.217,seismicPlaying:false});
    await page.evaluate(() => (window as any).__sceneRecordLoss.restoreContext());
    await expect.poll(() => page.evaluate(() => (window as any).__gl().state)).toBe('ready');
    expect(await page.evaluate(() => (window as any).__bucket().bridgeView)).toBe('2d');
    await page.getByRole('button',{name:'From the riverbank',exact:true}).click();
    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => (window as any).__gl().observerAnchor)).toBe('ground');
    await expect(page.getByRole('button',{name:'Replay scene',exact:true})).toBeDisabled();
    await expect(page.getByRole('textbox',{name:'Scene observation note',exact:true})).toHaveValue('Watch the ground and the deck.');
    await checkWorkflowHealth(page);
  });

  for (const width of [1000, 320]) {
    test('energy transfer: signed arrows, A/B power and fullscreen at ' + width + 'px', async ({ page }) => {
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
        seismicGuideOpen: true, seismicTime: 7.283333333333333, crossSectionMm2: 30000, lateralBraceEvery: 1,
        seismicObservation: 'Trace the energy.' });
      const stage=page.locator('[data-allo-fs-stage]');
      const disclosure=page.locator('[data-bridge-energy-flow="scene"]');
      const frame=page.locator('[data-flow-frame]');
      await expect(frame).toHaveCount(0);
      await disclosure.locator('summary').press('Enter');
      await expect(frame).toHaveAttribute('data-flow-frame', '7.283333333333333');
      await expect(frame.locator('[data-flow-path="input"]')).toHaveAttribute('data-flow-direction', '-1');
      await expect(frame.locator('svg')).toHaveAttribute('aria-label', /Stored → Input work/);
      await expect(frame.locator('[data-flow-stored-rate]')).toContainText('Stored energy decreasing');
      const before=await page.evaluate(() => (window as any).__gl());
      async function rates() {
        return frame.locator('[data-flow-path]').evaluateAll(nodes => Object.fromEntries(nodes.map(n => [n.getAttribute('data-flow-path'), Number(n.getAttribute('data-flow-power'))])));
      }
      async function checkBalance() {
        const power=await rates();
        const stored=Number(await frame.locator('[data-flow-stored-rate]').getAttribute('data-flow-stored-rate'));
        expect(stored).toBeCloseTo(power.input-power.damping, 12);
        expect(power.damping).toBeGreaterThanOrEqual(0);
        const directions=await frame.locator('[data-flow-path]').evaluateAll(nodes => nodes.map(n => [Number(n.getAttribute('data-flow-power')), Number(n.getAttribute('data-flow-direction'))]));
        for(const [power,direction] of directions) expect(direction).toBe(Math.sign(power));
        expect(await frame.evaluate(el => el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
      }
      await checkBalance();
      await page.getByRole('button', { name:'Prepare 5% / 20% comparison', exact:true }).click();
      await page.evaluate(() => (window as any).__set({seismicTime:7.217}));
      await stage.scrollIntoViewIfNeeded();
      const b=await rates();
      await page.getByRole('button', { name:'A · reference', exact:true }).click();
      await expect(frame).toHaveAttribute('data-flow-trial','reference');
      await expect(frame).toHaveAttribute('data-flow-frame','7.217');
      expect(await rates()).not.toEqual(b);
      await checkBalance();
      await page.getByRole('button', { name:'B · current', exact:true }).click();
      expect(await rates()).toEqual(b);
      await page.getByRole('button', { name:'View the 3D bridge fullscreen', exact:true }).click();
      await checkBridgeCanvasFillsStage(page);
      await page.locator('[data-bridge-scene-readout]').evaluate(el => {el.scrollTop=0;});
      await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+width+'-energy-transfer.png')});
      const panel=await page.locator('[data-bridge-scene-readout]').boundingBox();
      const replay=await page.locator('[data-bridge-scene-replay]').boundingBox();
      if(!panel||!replay)throw new Error('Scene controls missing');
      expect(panel.y+panel.height).toBeLessThanOrEqual(replay.y-4);
      const values=await rates();
      await page.locator('[data-bridge-scene-readout] > summary').press('Enter');
      await expect(frame).toHaveCount(0);
      await page.locator('[data-bridge-scene-readout] > summary').press('Enter');
      expect(await rates()).toEqual(values);
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.getByRole('combobox',{name:'Scene key moments',exact:true}).selectOption('free');
      await expect(frame.locator('[data-flow-path="input"]')).toHaveAttribute('data-flow-direction','0');
      await checkBalance();
      await page.evaluate(() => (window as any).__set({seismicDampingRatio:0,seismicTime:18}));
      await expect(frame.locator('[data-flow-stored-rate]')).toHaveAttribute('data-flow-stored-rate','0');
      await expect(frame.locator('[data-flow-path="exchange"]')).not.toHaveAttribute('data-flow-direction','0');
      await page.evaluate(() => (window as any).__set({seismicIntensityG:0}));
      expect(Object.values(await rates())).toEqual([0,0,0]);
      await expect(frame.locator('svg')).toHaveAttribute('aria-label',/No transfer/);
      expect(await page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
      expect(await page.evaluate(() => (window as any).__bucket().seismicObservation)).toBe('Trace the energy.');
      await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
      await checkWorkflowHealth(page);
    });
  }

  test('energy transfer: graphics loss retains the current power diagram and deliberate recovery', async ({page}) => {
    await mountWorkflow(page,1000,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicTime:7.217,seismicEnergyFlow:true});
    const before=await page.locator('[data-flow-frame] svg').getAttribute('aria-label');
    await page.evaluate(() => {
      const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
      const context=canvas.getContext('webgl2')||canvas.getContext('webgl');
      const extension=context?.getExtension('WEBGL_lose_context');
      if(!extension)throw new Error('WebGL loss extension unavailable');
      (window as any).__flowLoss=extension; extension.loseContext();
    });
    await expect(page.locator('[data-bridge-energy-flow="fallback"]')).toBeVisible();
    await expect(page.locator('[data-flow-frame] svg')).toHaveAttribute('aria-label',before!);
    await page.getByRole('button',{name:'Step forward 0.5 s',exact:true}).click();
    await expect(page.locator('[data-flow-frame]')).toHaveAttribute('data-flow-frame','7.717');
    await page.evaluate(() => (window as any).__flowLoss.restoreContext());
    await page.getByRole('button',{name:'From the riverbank',exact:true}).click();
    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => (window as any).__gl().state)).toBe('ready');
    await expect(page.locator('[data-bridge-energy-flow="scene"]')).toBeVisible();
    await expect(page.locator('[data-flow-frame]')).toHaveAttribute('data-flow-frame','7.717');
    expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
    await checkWorkflowHealth(page);
  });

  test('motion guide: WebGL loss retains current measurements and recovery restores resting rails', async ({ page }) => {
    await mountWorkflow(page, 1000, { bridgeView: 'immersive', seismicEnabled: true, seismicTime: 7.2, seismicMotionGuide: true });
    const values = await page.locator('[data-motion-reading]').allTextContents();
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
      const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const extension = context?.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('WebGL loss extension unavailable');
      (window as any).__motionLoss = extension;
      extension.loseContext();
    });
    await expect(page.locator('[data-bridge-motion-guide="fallback"]')).toBeVisible();
    expect(await page.locator('[data-motion-reading]').allTextContents()).toEqual(values);
    await page.evaluate(() => (window as any).__motionLoss.restoreContext());
    await page.getByRole('button', { name: 'On the bridge', exact: true }).click();
    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => (window as any).__gl().state)).toBe('ready');
    await expect.poll(() => page.evaluate(() => (window as any).__gl().motionReferenceVisible)).toBe(true);
    await expect(page.locator('[data-bridge-motion-guide="scene"]')).toBeVisible();
    expect(await page.locator('[data-motion-reading]').allTextContents()).toEqual(values);
    await checkWorkflowHealth(page);
  });

  for (const width of [1000, 320]) {
    test('riverbank observer: same moment, independent poses and fullscreen A/B at ' + width + 'px', async ({ page }) => {
      await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeWalkPos: 0.62, bridgeLookYaw: 20,
        bridgeLookPitch: -6, seismicEnabled: true, seismicTime: 7.2, seismicMotionGuide: true, seismicGuideOpen: true,
        crossSectionMm2: 30000, lateralBraceEvery: 1, seismicObservation: 'Keep my observation.' });
      const stage = page.locator('[data-allo-fs-stage]');
      const viewer = page.locator('[aria-describedby="bridge-gl-description"]');
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      await stage.scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('bank');
      await expect(page.locator('[data-bridge-observer-hint]')).toContainText('moves with the ground');
      await expect(viewer).toHaveAttribute('aria-label', /Standing at an observation point on the riverbank/);
      await expect(page.getByRole('slider', { name: 'Position on bridge (%)', exact: true })).toHaveCount(0);
      const before = await page.evaluate(() => (window as any).__gl());
      await page.evaluate(() => (window as any).__set({ seismicTime: 8 }));
      await expect.poll(() => page.evaluate(() => (window as any).__gl().groundOffsetM)).not.toBe(before.groundOffsetM);
      const moved = await page.evaluate(() => (window as any).__gl());
      expect(moved.cameraPosition.z - before.cameraPosition.z).toBeCloseTo((moved.groundOffsetM - before.groundOffsetM) * 10, 8);
      moved.cameraDirection.forEach((value: number, axis: number) => expect(value).toBeCloseTo(before.cameraDirection[axis], 8));
      await viewer.press('ArrowRight');
      await viewer.press('ArrowUp');
      expect(await page.evaluate(() => (window as any).__bucket().bridgeBankYaw)).toBe(8);
      expect(await page.evaluate(() => (window as any).__bucket().bridgeBankPitch)).toBe(5);
      expect(await page.evaluate(() => (window as any).__bucket().bridgeWalkPos)).toBe(0.62);
      await page.getByRole('button', { name: 'Switch to deck viewpoint', exact: true }).click();
      await expect(viewer).toBeFocused();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('deck');
      expect(await page.evaluate(() => (window as any).__bucket().bridgeLookYaw)).toBe(20);
      await page.getByRole('button', { name: 'Switch to riverbank viewpoint', exact: true }).click();
      expect(await page.evaluate(() => (window as any).__bucket().bridgeBankYaw)).toBe(8);
      expect(await page.evaluate(() => (window as any).__bucket().bridgeBankPitch)).toBe(5);
      const viewerBox = await viewer.boundingBox();
      if (!viewerBox) throw new Error('Bank viewer is not visible');
      await page.mouse.move(viewerBox.x + viewerBox.width * 0.9, viewerBox.y + viewerBox.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(viewerBox.x + viewerBox.width * 0.9 - 12, viewerBox.y + viewerBox.height * 0.5 + 12, { steps: 3 });
      await page.mouse.up();
      expect(await page.evaluate(() => (window as any).__bucket().bridgeBankYaw)).not.toBe(8);
      expect(await page.evaluate(() => (window as any).__bucket().bridgeLookYaw)).toBe(20);
      await viewer.press('Home');
      await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
      await page.evaluate(() => (window as any).__set({ seismicTime: 8 }));
      await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
      await checkBridgeCanvasFillsStage(page);
      await expect.poll(() => page.evaluate(() => (window as any).__gl().observerAnchor)).toBe('ground');
      const bankB = await page.evaluate(() => (window as any).__gl());
      await page.getByRole('button', { name: 'A · reference', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().deckOffsetM)).not.toBe(bankB.deckOffsetM);
      const bankA = await page.evaluate(() => (window as any).__gl());
      expect(bankA.cameraPosition).toEqual(bankB.cameraPosition);
      expect(bankA.cameraDirection).toEqual(bankB.cameraDirection);
      const readings = await page.locator('[data-motion-reading]').allTextContents();
      await stage.screenshot({ path: join(ENHANCEMENT_REPORT, 'bridge-' + width + '-bank-a.png') });
      const measurementToggle = page.locator('[data-bridge-scene-readout] > summary');
      await measurementToggle.press('Enter');
      await expect(page.locator('[data-motion-frame]')).toHaveCount(0);
      await expect(page.locator('[data-bridge-scene-readout]')).toContainText('A · reference · 8.00 s');
      await expect.poll(() => page.evaluate(() => (window as any).__gl().motionReferenceVisible)).toBe(true);
      await stage.screenshot({ path: join(ENHANCEMENT_REPORT, 'bridge-' + width + '-bank-immersive.png') });
      await page.getByRole('button', { name: 'Switch to deck viewpoint', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().observerAnchor)).toBe('deck');
      await expect(page.locator('[data-motion-frame]')).toHaveCount(0);
      await measurementToggle.press('Enter');
      await expect(page.locator('[data-motion-reading]')).toHaveText(readings);
      expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(8);
      await stage.screenshot({ path: join(ENHANCEMENT_REPORT, 'bridge-' + width + '-deck-a.png') });
      await page.getByRole('button', { name: 'Switch to riverbank viewpoint', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraPosition)).toEqual(bankA.cameraPosition);
      await page.getByRole('button', { name: 'Replay scene', exact: true }).click();
      await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBeGreaterThan(8);
      await page.getByRole('button', { name: 'Switch to deck viewpoint', exact: true }).click();
      expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.getByRole('button', { name: 'Switch to riverbank viewpoint', exact: true }).click();
      await page.getByRole('slider', { name: 'Scene replay time (s)', exact: true }).press('End');
      await expect.poll(() => page.evaluate(() => (window as any).__gl().groundOffsetM)).toBe(0);
      await expect(page.getByRole('button', { name: 'Replay scene', exact: true })).toBeDisabled();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
      // A first visit can upload previously culled meshes. After both fixed
      // views have rendered, repeated switching must not grow GPU resources.
      let warmedResources;
      for (let cycle = 0; cycle < 3; cycle++) {
        await page.getByRole('button', { name: 'Switch to deck viewpoint', exact: true }).click();
        await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('deck');
        await page.getByRole('button', { name: 'Switch to riverbank viewpoint', exact: true }).click();
        await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('bank');
        const resources = await page.evaluate(() => (window as any).__gl().resources);
        if (cycle === 0) warmedResources = resources;
        else expect(resources).toEqual(warmedResources);
      }
      await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
      await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
      await expect(page.locator('[data-bridge-observer-switch]')).toHaveCount(0);
      await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
      await stage.scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('bank');
      expect(await page.evaluate(() => (window as any).__bucket().seismicObservation)).toBe('Keep my observation.');
      await checkWorkflowHealth(page);
    });
  }

  test('riverbank observer: WebGL recovery preserves the selected observer without resuming motion', async ({ page }) => {
    await mountWorkflow(page, 1000, { bridgeView: 'immersive', bridgeObserver: 'bank', bridgeBankYaw: 12,
      bridgeBankPitch: -5, seismicEnabled: true, seismicTime: 8, seismicMotionGuide: true });
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
      const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const extension = context?.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('WebGL loss extension unavailable');
      (window as any).__bankLoss = extension;
      extension.loseContext();
    });
    await expect(page.locator('[data-bridge-motion-guide="fallback"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'From the riverbank', exact: true })).toBeDisabled();
    await page.evaluate(() => (window as any).__bankLoss.restoreContext());
    await expect.poll(() => page.evaluate(() => (window as any).__gl().state)).toBe('ready');
    expect(await page.evaluate(() => (window as any).__bucket().bridgeView)).toBe('2d');
    await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
    await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => (window as any).__gl().observerAnchor)).toBe('ground');
    expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ bridgeBankYaw: 12, bridgeBankPitch: -5, seismicTime: 8, seismicPlaying: false });
    await checkWorkflowHealth(page);
  });

  test.describe('earthquake replay', () => {
    test.use({ hasTouch: true });
    for (const fallback of [false, true]) {
      test('WebGL loss exits ' + (fallback ? 'fill-frame' : 'native fullscreen') + ' and preserves a usable focused fallback', async ({ page }) => {
        await mountWorkflow(page, 1000, { bridgeView: 'immersive', seismicEnabled: true, seismicTime: 7.2 });
        const stage = page.locator('[data-allo-fs-stage]');
        if (fallback) await stage.evaluate(element => {
          Object.defineProperty(element, 'requestFullscreen', { configurable: true, value: () => Promise.reject(new Error('Exercise fill-frame fallback')) });
        });
        await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true })).toBeVisible();
        await expect.poll(() => stage.evaluate(element => (element as any).__alloFsOn === true || document.fullscreenElement === element)).toBe(true);
        await checkBridgeCanvasFillsStage(page);
        await page.getByRole('button', { name: 'Replay scene', exact: true }).click();
        await page.getByRole('button', { name: 'Pause scene replay', exact: true }).focus();
        await page.evaluate(() => {
          const canvas = document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
          const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
          const extension = context?.getExtension('WEBGL_lose_context');
          if (!extension) throw new Error('WebGL loss extension unavailable');
          extension.loseContext();
        });
        await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
        await expect(page.locator('[data-bridge-elevation]')).toBeVisible();
        await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
        expect(await stage.evaluate(element => !!(element as any).__alloFsOn)).toBe(false);
        expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
        const chart = page.getByRole('slider', { name: 'Inspect earthquake timeline (s)', exact: true });
        await chart.press('End');
        await expect(chart).toHaveAttribute('aria-valuenow', '24');
        if (fallback) expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
        await checkWorkflowHealth(page);
      });
    }
    for (const width of [1000, 320]) {
      test('scene controls, fullscreen and synchronized timeline at ' + width + 'px', async ({ page }) => {
        await mkdir(REPLAY_REPORT, { recursive: true });
        await mountWorkflow(page, width, { bridgeView: 'immersive', seismicEnabled: true, seismicTime: 7.2 });
        const stage = page.locator('[data-allo-fs-stage]');
        const scene = page.getByRole('group', { name: 'Earthquake scene replay', exact: true });
        await expect(scene).toBeVisible();
        await page.getByLabel('Scene replay speed', { exact: true }).selectOption('0.25');
        await expect(page.getByLabel('Replay speed', { exact: true })).toHaveValue('0.25');
        await stage.scrollIntoViewIfNeeded();
        const before = await page.evaluate(() => (window as any).__gl());
        await captureImmersiveRegion(page, stage, 'bridge-' + width + '-scene-replay.png', REPLAY_REPORT);
        await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true })).toBeVisible();
        await expect(scene).toBeVisible();
        await checkBridgeCanvasFillsStage(page);
        await page.getByRole('button', { name: 'Replay scene', exact: true }).click();
        await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBeGreaterThan(7.2);
        await page.getByRole('button', { name: 'Pause scene replay', exact: true }).click();
        const sceneTime = page.getByRole('slider', { name: 'Scene replay time (s)', exact: true });
        await sceneTime.press('Home');
        await sceneTime.press('ArrowRight');
        await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(0.05);
        expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
        await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();

        const timeline = page.locator('[data-bridge-seismic-timeline]');
        const chart = page.getByRole('slider', { name: 'Inspect earthquake timeline (s)', exact: true });
        await chart.scrollIntoViewIfNeeded();
        const box = await chart.boundingBox();
        if (!box) throw new Error('Timeline chart is not visible');
        if (width === 320) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        else {
          await page.mouse.move(box.x + box.width / 4, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
          await page.mouse.up();
        }
        await expect(chart).toHaveAttribute('aria-valuenow', '12');
        await expect(chart).toBeFocused();
        await chart.press('PageUp');
        await expect(chart).toHaveAttribute('aria-valuenow', '13');
        await expect(page.getByRole('slider', { name: 'Experiment time (s)', exact: true })).toHaveValue('13');
        await expect(sceneTime).toHaveValue('13');
        await expect(page.locator('[data-seismic-time-cursor]')).toHaveAttribute('data-seismic-time-cursor', '13');
        await expect(page.locator('[data-bridge-seismic-readout]')).toContainText('13.00 s');
        await expect(timeline.locator('[data-seismic-energy-area]')).toHaveCount(3);
        await captureImmersiveRegion(page, timeline, 'bridge-' + width + '-energy-timeline.png', REPLAY_REPORT);
        await page.getByRole('button', { name: 'Motion over time', exact: true }).click();
        await expect(chart).toHaveAttribute('aria-valuenow', '13');
        await expect(timeline.locator('polyline[stroke-dasharray]')).toHaveCount(1);
        await captureImmersiveRegion(page, timeline, 'bridge-' + width + '-motion-timeline.png', REPLAY_REPORT);
        await stage.scrollIntoViewIfNeeded();
        await expect.poll(() => page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
        await expect.poll(() => page.evaluate(() => (window as any).__gl().relativeOffsetM)).not.toBe(before.relativeOffsetM);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await expect(page.getByRole('button', { name: 'Replay scene', exact: true })).toBeDisabled();
        await chart.press('End');
        await expect(chart).toHaveAttribute('aria-valuetext', '24.00 s · Free vibration');
        expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
        await checkWorkflowHealth(page);
      });
    }
  });

  test('immersive earthquake: playback requires consent and reduced motion keeps deliberate stepping available', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mountWorkflow(page, 1000, { bridgeView: 'immersive', seismicEnabled: true, seismicPlaying: true, seismicTime: 6 });
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(6);
    const step = page.getByRole('button', { name: 'Step forward 0.5 s', exact: true });
    await step.focus();
    await step.press('Enter');
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(6.5);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.getByRole('button', { name: 'Run earthquake', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBeGreaterThan(6.5);
    await page.getByRole('button', { name: 'Pause earthquake', exact: true }).click();
    const paused = await page.evaluate(() => (window as any).__bucket().seismicTime);
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(paused);
    await page.getByRole('button', { name: 'Run earthquake', exact: true }).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
    await expect(step).toBeEnabled();
    await checkWorkflowHealth(page);
  });
});
