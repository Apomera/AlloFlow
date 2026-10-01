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
      expect(await page.evaluate(() => (window as any).__gl().resources)).toEqual(before.resources);
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
        bridgeBankYaw:18,bridgeBankPitch:-8,seismicTime:7.217,seismicDampingRatio:0.05,seismicSceneCompare:false,
        seismicSceneTrial:'current',seismicSceneNote:note,seismicPlaying:false});
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
