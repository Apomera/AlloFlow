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
const ENHANCEMENT_REPORT = join(ROOT, 'reports', 'bridgelab-enhancement-pass2-2026-09-27');

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
});
