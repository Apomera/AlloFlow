import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { predictionKeys, opticsConstant } from '../helpers/optics_prediction.js';

/**
 * Optics Lab, polarization tab — REAL WebGL smoke.
 *
 * A light wave's E field lives in the two-dimensional plane transverse to the
 * beam. The flat sim spends its horizontal axis on the beam, leaving one axis
 * for polarization, so it drew the transverse plane collapsed: a polarizer at
 * 30 degrees and one at 150 degrees were the same picture, and circular
 * polarization could not be drawn at all — even though the tool describes it in
 * its glossary, its phenomena database, and a lab-kit experiment whose entire
 * point is that circular light is not extinguished by a linear polarizer at any
 * angle.
 *
 * These tests pin the physics, not the pixels: linear light is flat in the
 * transverse plane, circular light is round, and the intensity after a linear
 * polarizer stops depending on angle exactly when the wave becomes circular.
 */

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>optics harness</title>
<style>html,body{margin:0;height:100%;background:#0f172a}#wrap{width:min(900px,100%)}</style></head>
<body><div id="wrap"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/vendor/three-r128/three.min.js"></script>
<script src="/stem_lab/stem_lab_module.js"></script>
<script>
  window.__events = { errors: [] };
  window.__bubbledKeys = [];
  document.addEventListener('keydown', function (e) { window.__bubbledKeys.push(e.key); });
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });
  window.StemLab.ensureThree = function () { return Promise.resolve(window.THREE); };
  window.StemLab.loadScriptResilient = function () { return new Promise(function () {}); };
</script>
<script src="/stem_lab/stem_tool_optics.js"></script>
<script>
  var e = React.createElement;
  window.__mount = function (bucket) {
    var cfg = window.StemLab._registry.opticsLab;
    window.__toolData = { opticsLab: Object.assign({ mode: 'polarization' }, bucket || {}) };
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
        window.__toolData[b] = Object.assign({}, window.__toolData[b]); window.__toolData[b][k] = v;
        if (bump) bump();
      },
      updateMulti: function (b, patch) {
        window.__toolData = Object.assign({}, window.__toolData);
        window.__toolData[b] = Object.assign({}, window.__toolData[b], patch); if (bump) bump();
      },
      setStemLabTool: function () {}, setStemLabTab: function () {}, addToast: function () {},
      awardXP: function () {}, getXP: function () { return 0; }, announceToSR: function () {},
      celebrate: function () {}, beep: function () {}, callGemini: null,
      isDark: !!window.__isDark, gradeLevel: '11th Grade', toolSnapshots: [], props: {},
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
  window.__gl = function () { return window.__alloOpticsGL ? window.__alloOpticsGL.debug() : null; };
  window.__win = function () { return window.__alloOpticsWindowGL ? window.__alloOpticsWindowGL.debug() : null; };
  window.__lens = function () { return window.__alloOpticsLensGL ? window.__alloOpticsLensGL.debug() : null; };
  window.__mirror = function () { return window.__alloOpticsMirrorGL ? window.__alloOpticsMirrorGL.debug() : null; };
  window.__refr = function () { return window.__alloOpticsRefractionGL ? window.__alloOpticsRefractionGL.debug() : null; };
  window.__set = function (patch) {
    window.__toolData = Object.assign({}, window.__toolData);
    window.__toolData.opticsLab = Object.assign({}, window.__toolData.opticsLab, patch);
    window.__bump && window.__bump();
  };
  window.__bucket = function () { return window.__toolData.opticsLab; };
  window.__canvasCount = function () { return document.querySelectorAll('canvas[data-optics-gl]').length; };
  window.__lensCanvasCount = function () { return document.querySelectorAll('canvas[data-optics-lens-gl]').length; };
  window.__mirrorCanvasCount = function () { return document.querySelectorAll('canvas[data-optics-mirror-gl]').length; };
  window.__refrCanvasCount = function () { return document.querySelectorAll('canvas[data-optics-refraction-gl]').length; };
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
    } catch { res.writeHead(404); res.end('not found'); }
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});

test.afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

type Pg = import('@playwright/test').Page;

// Model a student who saves a prediction at EVERY setup they try. The answer
// text these tests read (image type, I_out, the Fresnel split...) is held until
// a prediction exists for the current setup, and several tests sweep through
// setups with __set. So after each change this re-saves a prediction for the
// new setup, through the spec's own __set, keyed with the TOOL's list of which
// controls count (read from source by the shared helper). If the key ever
// disagreed with the tool, the text would stay held and these tests would fail
// loudly rather than pass on a stale copy.
async function autoPredict(page: Pg) {
  await page.evaluate((keys: Record<string, string[]>) => {
    const w = window as any;
    const stamp = () => {
      const b = (w.__toolData && w.__toolData.opticsLab) || {};
      const tab = b.mode;
      const cap: Record<string, unknown> = {};
      (keys[tab] || []).forEach((k) => { if (b[k] != null && typeof b[k] !== 'object') cap[k] = b[k]; });
      const key = Object.keys(cap).sort().map((k) => k + '=' + cap[k]).join('|');
      return {
        opPredictionNotes: Object.assign({}, b.opPredictionNotes, { [tab]: 'My prediction.' }),
        opPredictionSetups: Object.assign({}, b.opPredictionSetups, { [tab]: key }),
      };
    };
    const original = w.__set;
    w.__set = function (patch: Record<string, unknown>) { original(patch); original(stamp()); };
    original(stamp());
  }, predictionKeys());
  await page.waitForTimeout(250);
}

// A UI-driven change to a control that sets the answer (a slider, not __set)
// correctly makes the gate ask again. Model the student answering it: re-save a
// prediction for the CURRENT setup (autoPredict's __set wrapper does the stamp).
async function predictAgain(page: Pg) {
  await page.evaluate(() => (window as any).__set({}));
  await page.waitForTimeout(150);
}

async function mount(page: Pg, bucket: Record<string, unknown> = {}) {
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.opticsLab);
  await page.evaluate((b) => (window as any).__mount(b), Object.assign({ mode: 'polarization' }, bucket));
  await page.waitForSelector('canvas[data-optics-gl="true"]', { timeout: 30000 });
  await page.waitForFunction(() => (window as any).__gl()?.state === 'ready', null, { timeout: 30000 });
  await page.waitForTimeout(400);
}

async function mountUi(page: Pg, bucket: Record<string, unknown> = {}) {
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.opticsLab);
  await page.evaluate((b) => (window as any).__mount(b), Object.assign({ mode: 'home' }, bucket));
  await page.waitForSelector('[data-opticslab-tool="true"]');
}

test.describe.configure({ timeout: 180_000 });

test.describe('Optics Lab workflow and responsive navigation', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  test('returns from an expanded reference page to the core benches', async ({ page }) => {
    await mountUi(page, { mode: 'phenomena', showOpticsLibrary: false });
    const back = page.getByRole('button', { name: 'Return to core benches' });
    await expect(back).toBeVisible();
    await back.click();
    await expect(page.locator('#op-panel-home')).toBeVisible();
    const bucket = await page.evaluate(() => (window as any).__bucket());
    expect(bucket.mode).toBe('home');
    expect(bucket.showOpticsLibrary).toBe(false);
  });

  test('keeps navigation and the guided workflow compact on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mountUi(page, {
      mode: 'lenses', lensType: 'converging', lensFocal: 12, lensDo: 25,
      opPredictionNotes: { lenses: 'The real image will be inverted.' }
    });

    const strip = page.locator('[data-opticslab-tab-strip="true"]');
    const stripLayout = await strip.evaluate((node) => {
      const style = getComputedStyle(node);
      return { flexWrap: style.flexWrap, overflowX: style.overflowX, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth };
    });
    expect(stripLayout.flexWrap).toBe('nowrap');
    expect(['auto', 'scroll']).toContain(stripLayout.overflowX);
    expect(stripLayout.scrollWidth).toBeGreaterThan(stripLayout.clientWidth);

    await expect(page.locator('.opticslab-focus-panel--compact .opticslab-route-grid')).toBeHidden();
    const mobileColumns = await page.evaluate(() => ({
      flow: getComputedStyle(document.querySelector('.opticslab-flow')!).gridTemplateColumns,
      guided: getComputedStyle(document.querySelector('.opticslab-guided-grid')!).gridTemplateColumns
    }));
    expect(mobileColumns.flow.trim().split(/\s+/)).toHaveLength(3);
    expect(mobileColumns.guided.trim().split(/\s+/)).toHaveLength(1);
    await expect(page.getByText('Saved ✓', { exact: true })).toBeHidden();
    await expect(page.getByRole('button', { name: /Predict/ })).toContainText('✓');

    await page.getByRole('button', { name: /Explore/ }).click();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('op-explore-lenses');
  });

  test('keeps every slider readout inside its own row in a narrow column', async ({ page }) => {
    // On a desktop screen the explore column is ~400px wide, two 190px slider
    // rows side by side. A range input will not shrink below its intrinsic
    // width, so the value readout spilled across the NEXT row's label ("600"
    // over "d (mm):"). Measure the boxes; a style string cannot show this.
    for (const width of [1100, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const bucket of [{ mode: 'interference' }, { mode: 'diffraction', diffMode: 'grating' }]) {
        await mountUi(page, bucket);
        const rows = await page.evaluate(() => Array.from(document.querySelectorAll('.opticslab-control-grid label')).map((label) => {
          const lr = label.getBoundingClientRect();
          const value = label.querySelector(':scope > span')!.getBoundingClientRect();
          return { text: (label.textContent || '').trim(), l: lr.left, r: lr.right, t: lr.top, b: lr.bottom, vl: value.left, vr: value.right };
        }));
        expect(rows.length, `${width}px ${bucket.mode}: slider rows`).toBeGreaterThanOrEqual(4);
        for (const row of rows) {
          expect(row.vr, `${width}px ${row.text}: readout spills past its row`).toBeLessThanOrEqual(row.r + 0.5);
          expect(row.vl, `${width}px ${row.text}: readout starts before its row`).toBeGreaterThanOrEqual(row.l - 0.5);
        }
        for (const a of rows) for (const b of rows) {
          if (a === b) continue;
          const overlapX = Math.min(a.r, b.r) - Math.max(a.l, b.l);
          const overlapY = Math.min(a.b, b.b) - Math.max(a.t, b.t);
          expect(overlapX > 0.5 && overlapY > 0.5, `${width}px: "${a.text}" overlaps "${b.text}"`).toBe(false);
        }
        await page.evaluate(() => (window as any).__destroy());
      }
    }
  });

  test('builds single photons into the classical pattern of the slits on the bench', async ({ page }) => {
    // The photon demo drew a fixed cos² that ignored every slider: no
    // single-slit envelope, so "the SAME pattern as the continuous wave" was
    // false. Fire real photons and compare where they land with the intensity
    // of THIS bench (λ 600 nm, d 0.10 mm, a 50 μm, L 1.0 m: fringes 6 mm apart,
    // the envelope's first zero at 12 mm, so the ±12 mm orders are missing).
    await page.setViewportSize({ width: 1100, height: 1000 });
    await mountUi(page, { mode: 'interference', intLambda: 600, intSlitSep: 0.1, intSlitWidth: 50, intScreenL: 1.0 });
    const screen = page.locator('[data-op-quantum-screen="true"]');
    await screen.scrollIntoViewIfNeeded();
    await expect(page.locator('[data-op-quantum-envelope="true"]')).toHaveCount(1);
    await page.getByRole('button', { name: /Auto-fire/ }).click();
    await page.getByRole('button', { name: 'fast', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('[data-op-quantum-screen] circle[data-screen-mm]').length >= 1200, null, { timeout: 60000 });
    await page.getByRole('button', { name: '⏸ Pause', exact: true }).click();
    const ys: number[] = await page.evaluate(() => Array.from(document.querySelectorAll('[data-op-quantum-screen] circle[data-screen-mm]'))
      .map((c) => Number(c.getAttribute('data-screen-mm'))));

    const lam = 600e-9, d = 1e-4, a = 50e-6, L = 1;
    const I = (mm: number) => {
      const s = mm * 1e-3 / Math.hypot(mm * 1e-3, L);
      const b = Math.PI * a * s / lam;
      const env = Math.abs(b) < 1e-12 ? 1 : (Math.sin(b) / b) ** 2;
      return env * Math.cos(Math.PI * d * s / lam) ** 2;
    };
    const share = (lo: number, hi: number) => {
      let part = 0; let all = 0;
      for (let mm = -30; mm <= 30; mm += 0.01) { const v = I(mm); all += v; if (Math.abs(mm) >= lo && Math.abs(mm) < hi) part += v; }
      return part / all;
    };
    const seen = (lo: number, hi: number) => ys.filter((y) => Math.abs(y) >= lo && Math.abs(y) < hi).length / ys.length;
    // Central fringe, the first side fringes, and everything past the
    // envelope's first zero. A flat cos² puts ~60% past 12 mm; physics ~4%.
    for (const [lo, hi] of [[0, 3], [3, 9], [12, 30]] as const) {
      expect(Math.abs(seen(lo, hi) - share(lo, hi)), `|y| in [${lo}, ${hi}) mm: saw ${seen(lo, hi).toFixed(3)}, expected ${share(lo, hi).toFixed(3)}`).toBeLessThan(0.05);
    }

    // A run belongs to one setup: change d and the next run starts from zero.
    await page.evaluate(() => (window as any).__set({ intSlitSep: 0.2 }));
    await expect(screen).toContainText('0 photons');
    await expect(screen).toContainText('The setup above changed');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('completes and persists the predict-observe-explain notebook', async ({ page }) => {
    await mountUi(page, { mode: 'lenses', lensType: 'converging', lensFocal: 12, lensDo: 25 });

    await page.getByRole('button', { name: /Predict/ }).click();
    await page.getByLabel('Your prediction for the lenses experiment').fill('The image will become virtual and upright inside the focal point.');
    await page.getByRole('button', { name: 'Save prediction' }).click();
    await page.getByRole('button', { name: 'Magnifier', exact: true }).click();
    await page.getByLabel('Your observation for the lenses experiment').fill('The ray extensions met on the object side, and the calculation reported a virtual upright image.');
    await page.getByRole('button', { name: 'Save observation' }).click();
    await page.getByRole('button', { name: /Explain/ }).click();
    await page.locator('#op-ai-lenses').fill('Because the object is inside the focal length, the outgoing rays diverge and their backward extensions meet on the object side, so the observed image is virtual and upright.');
    await page.getByRole('button', { name: 'Check with offline rubric' }).click();

    await expect(page.getByText(/Local rubric estimate:/)).toBeVisible();
    await expect(page.getByLabel('Experiment results notebook').getByText('Observation saved ✓', { exact: true })).toBeVisible();
    const bucket = await page.evaluate(() => (window as any).__bucket());
    expect(bucket.opTopicTouched.lenses).toBe(true);
    expect(bucket.opTopicSnapshots.lenses.before.lensDo).toBe(25);
    expect(bucket.opTopicSnapshots.lenses.after.lensDo).toBe(7);
    expect(bucket.opObservationNotes.lenses).toContain('ray extensions');

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download lab note' }).click();
    expect((await download).suggestedFilename()).toBe('optics-lab-lenses-note.json');

    await page.waitForFunction(() => !!localStorage.getItem('opticsLab.state.v1'));
    await page.reload();
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.opticsLab);
    await page.evaluate(() => (window as any).__mount({ mode: 'lenses' }));
    await page.getByRole('button', { name: /Predict/ }).click();
    await expect(page.getByText(/Saved: The image will become virtual/)).toBeVisible();
    await expect(page.getByLabel('Experiment results notebook').getByText('Observation saved ✓', { exact: true })).toBeVisible();
  });

  test('filters grouped library tabs and remembers recent destinations', async ({ page }) => {
    await mountUi(page, { mode: 'home', showOpticsLibrary: true, opticsLibraryGroup: 'explore' });
    await page.getByRole('button', { name: 'People', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search library tabs' }).fill('career');
    await expect(page.locator('#op-tab-careers')).toBeVisible();
    await expect(page.locator('#op-tab-scientists')).toHaveCount(0);
    await page.locator('#op-tab-careers').click();
    const recent = await page.evaluate(() => (window as any).__bucket());
    expect(recent.opticsRecentModes[0]).toBe('careers');
  });

  test('does not create horizontal page overflow at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 760 });
    await mountUi(page, { mode: 'phenomena_db', showOpticsLibrary: true, opticsLibraryGroup: 'reference' });
    const size = await page.evaluate(() => ({
      body: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
      tool: document.querySelector('[data-opticslab-tool]')!.scrollWidth,
      toolClient: document.querySelector('[data-opticslab-tool]')!.clientWidth
    }));
    expect(size.body).toBeLessThanOrEqual(size.viewport + 1);
    expect(size.tool).toBeLessThanOrEqual(size.toolClient + 1);
  });

  test('directly manipulates the wave bench and explains the causal result', async ({ page }) => {
    await mountUi(page, {
      mode: 'interference', intLambda: 600, intSlitSep: 0.1, intScreenL: 1, intSlitWidth: 50,
    });
    await autoPredict(page);

    const slit = page.getByRole('slider', { name: 'Drag to change slit separation' });
    await slit.press('ArrowDown');
    await page.waitForFunction(() => (window as any).__bucket().intSlitSep === 0.09);
    // Slit separation sets the fringe spacing, so the gate asks again.
    await predictAgain(page);
    await expect(page.locator('[data-op-causal-insight="interference"]')).toHaveAttribute('data-isolated-variable', 'true');
    await expect(page.locator('[data-op-causal-insight="interference"]')).toContainText('Fringe spacing is inversely proportional');

    const detector = page.getByRole('slider', { name: 'Interference screen detector position' });
    await detector.press('ArrowUp');
    await page.waitForFunction(() => (window as any).__bucket().intScreenProbeMm === 0.5);
    await expect(page.locator('[data-op-screen-probe-readout="interference"]')).toContainText('y = +0.5 mm');
    await expect(page.locator('[data-op-screen-probe-readout="interference"]')).toContainText('I / I₀ =');
    await expect(page.locator('[data-op-causal-insight="interference"]')).toHaveAttribute('data-isolated-variable', 'true');
    await detector.press('0');
    await page.waitForFunction(() => (window as any).__bucket().intScreenProbeMm === 0);

    await page.locator('[data-op-detector-target="dark-half"]').click();
    await expect(page.locator('[data-op-screen-probe-readout="interference"]')).toContainText('dark fringe');
    await page.locator('[data-op-detector-target="center"]').click();
    await page.waitForFunction(() => (window as any).__bucket().intScreenProbeMm === 0);

    const screen = page.getByRole('slider', { name: 'Drag to change screen distance' });
    await screen.press('End');
    await page.waitForFunction(() => (window as any).__bucket().intScreenL === 3);
    await expect(page.locator('[data-op-causal-insight="interference"]')).toHaveAttribute('data-isolated-variable', 'false');
    await expect(page.locator('[data-op-causal-insight="interference"]')).toContainText('isolate one control');

    await page.getByRole('button', { name: 'Set current as baseline' }).click();
    await expect(page.locator('[data-op-causal-insight="interference"]')).toHaveCount(0);
    await screen.press('ArrowLeft');
    await page.waitForFunction(() => (window as any).__bucket().intScreenL === 2.9);
    await expect(page.locator('[data-op-causal-insight="interference"]')).toHaveAttribute('data-isolated-variable', 'true');
  });

  test('compares propagation regimes and carries real measurement settings into 2D, 3D, and CSV', async ({ page }) => {
    await mountUi(page, {
      mode: 'interference', intLambda: 600, intSlitSep: .1, intSlitWidth: 50,
      intScreenL: 1, intScreenProbeMm: 3, intShowWavefield3D: true,
    });

    const studio = page.locator('details[data-op-measurement-studio="interference"]');
    await studio.locator('summary').click();
    await expect(studio).toHaveAttribute('open', '');
    await expect(studio.locator('[data-op-optical-path="interference"]')).toBeVisible();
    await expect(studio.locator('[data-op-signal-stage]')).toHaveCount(4);
    await expect(studio.locator('[data-op-model-validity="interference"]')).toHaveAttribute('data-status', 'far');
    await expect(studio.locator('[data-op-regime-meter="interference"]')).toHaveAttribute('data-op-regime-status', 'far');
    await expect(studio.locator('[data-op-spectrum-tick]')).toHaveCount(6);
    await expect(studio.locator('[data-op-model-profile-line="fraunhofer"]')).toBeVisible();
    await expect(studio.locator('[data-op-model-profile-line="fresnel"]')).toBeVisible();
    await expect(studio.locator('[data-op-model-profile-gap-area="interference"]')).toBeVisible();
    await expect(studio.locator('[data-op-model-profile-x-tick]')).toHaveCount(3);

    await studio.locator('[data-op-load-transition="interference"]').click();
    await page.waitForFunction(() => {
      const bucket = (window as any).__bucket();
      return bucket.intPropagationModel === 'fresnel' && bucket.intScreenL === .2;
    });
    await expect(studio.locator('[data-op-model-validity="interference"]')).toHaveAttribute('data-status', 'near');
    await expect(studio.locator('[data-op-regime-meter="interference"]')).toHaveAttribute('data-op-regime-status', 'near');
    await expect(studio.getByRole('button', { name: 'Fresnel · near field' })).toHaveAttribute('aria-pressed', 'true');

    await studio.getByRole('slider', { name: 'interference source spectral bandwidth' }).fill('40');
    await studio.getByRole('slider', { name: 'interference detector aperture width' }).fill('2');
    await studio.getByRole('slider', { name: 'interference detector uncertainty' }).fill('1.5');
    await page.waitForFunction(() => {
      const bucket = (window as any).__bucket();
      return bucket.intBandwidthNm === 40 && bucket.intDetectorWidthMm === 2 && bucket.intNoisePct === 1.5;
    });
    await expect(studio.locator('[data-op-source-spectrum="interference"]')).toHaveAttribute('data-op-spectrum-start-nm', '580.0');
    await expect(studio.locator('[data-op-source-spectrum="interference"]')).toHaveAttribute('data-op-spectrum-end-nm', '620.0');
    await expect(studio.locator('[data-op-source-spectrum="interference"]')).toHaveAttribute('data-op-spectrum-mode', 'band');
    await expect(studio.locator('[data-op-spectrum-band="interference"]')).toHaveAttribute('data-op-spectrum-width-percent', '10.811');
    await expect(page.locator('[data-op-detector-aperture-readout="interference"]')).toContainText('2.0 mm aperture average');
    await expect(page.locator('[data-op-detector-aperture-readout="interference"]')).toContainText('±1.5% uncertainty');
    const comparison = studio.locator('[data-op-model-comparison="interference"]');
    expect(Number(await comparison.getAttribute('data-op-model-max-delta'))).toBeGreaterThan(1);
    await expect(comparison).toContainText('Max profile Δ');
    await expect(studio.locator('[data-op-model-profile-max-gap="interference"]')).toHaveCount(1);
    await expect(studio.locator('[data-op-model-profile-detector-point]')).toHaveCount(2);

    await page.getByRole('button', { name: 'Phase Re(E) / E₀' }).click();
    const wavefield = page.locator('[data-op-wavefield-3d="interference"]');
    const phaseReadout = page.locator('[data-op-wavefield-probe-readout="interference"]');
    await expect(wavefield).toHaveAttribute('data-op-wavefield-model', 'fresnel');
    await expect(wavefield).toHaveAttribute('data-op-wavefield-height', 'normalized-field-phase');
    await expect(phaseReadout).toHaveAttribute('data-op-probe-display', 'phase');
    await expect(phaseReadout).toHaveAttribute('data-op-probe-field', /^-?\d+\.\d{4}$/);
    await expect(phaseReadout).toHaveAttribute('data-op-probe-phase-rad', /^-?\d+\.\d{4}$/);
    await expect(phaseReadout).toContainText('Re(E) / E₀');
    await expect(phaseReadout).toContainText('φc');
    await expect(phaseReadout.locator('[data-op-probe-metric]')).toHaveCount(4);
    await expect(phaseReadout.locator('[data-op-probe-metric="field"]')).toBeVisible();
    await expect(phaseReadout.locator('[data-op-probe-metric="phase"]')).toBeVisible();
    await expect(page.locator('[data-op-wavefield-depth-scale="interference"]')).toBeVisible();
    await expect(page.locator('[data-op-wavefield-key="interference"]')).toContainText('positive field phase');
    await expect(page.locator('[data-op-wavefield-key="interference"]')).toContainText('opposite field phase');

    const downloadStarted = page.waitForEvent('download');
    await studio.locator('[data-op-wave-profile-export="interference"]').click();
    const download = await downloadStarted;
    expect(download.suggestedFilename()).toBe('optics-lab-interference-wave-profile.csv');
    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    const csv = await readFile(downloadPath!, 'utf8');
    expect(csv).toContain('"screen_profile"');
    expect(csv).toContain('"detector_depth_trail"');
    expect(csv).toContain('"normalized_field_re"');
    expect(csv).toContain('"wrapped_phase_rad"');
    expect(csv).toContain('"fresnel_number"');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('keeps reflected light in front of a plane mirror and construction lines behind it', async ({ page }) => {
    await mountUi(page, {
      mode: 'reflection', reflMirrorType: 'plane', reflDo: 25, reflObjH: 6,
    });

    const diagram = page.locator('svg[aria-label^="Mirror ray diagram"]');
    await expect(diagram).toBeVisible();
    await expect(diagram.locator('[data-op-mirror-angle]')).toHaveCount(2);
    await expect(diagram.locator('[data-op-mirror-normal="true"]')).toHaveCount(1);

    const geometry = await diagram.evaluate((svg) => {
      const n = (value: string | null) => Number(value);
      const mirror = svg.querySelector('[data-op-mirror-surface="true"]');
      const image = svg.querySelector('[data-op-mirror-image="virtual"]');
      const reflected = [...svg.querySelectorAll('[data-op-mirror-ray="reflected"]')];
      const extensions = [...svg.querySelectorAll('[data-op-mirror-ray="virtual-extension"]')];
      const mirrorX = n(mirror?.getAttribute('x1') || null);
      return {
        mirrorX,
        width: (svg as SVGSVGElement).viewBox.baseVal.width,
        imageX: n(image?.getAttribute('x1') || null),
        reflected: reflected.map((ray) => ({ x1: n(ray.getAttribute('x1')), x2: n(ray.getAttribute('x2')) })),
        extensions: extensions.map((ray) => ({ x1: n(ray.getAttribute('x1')), x2: n(ray.getAttribute('x2')) })),
      };
    });

    expect(geometry.reflected).toHaveLength(2);
    expect(geometry.extensions).toHaveLength(2);
    expect(geometry.reflected.every((ray) => ray.x1 === geometry.mirrorX && ray.x2 < geometry.mirrorX)).toBe(true);
    expect(geometry.extensions.every((ray) => ray.x1 === geometry.mirrorX && ray.x2 > geometry.mirrorX)).toBe(true);
    expect(geometry.imageX).toBeGreaterThan(geometry.mirrorX);
    expect(geometry.imageX).toBeLessThan(geometry.width);

    const summary = page.locator('[data-op-mirror-path-summary="plane"]');
    await expect(summary).toContainText('both 13.5 degrees');
    await page.evaluate(() => (window as any).__set({ reflDo: 10 }));
    await expect(summary).toContainText('both 31.0 degrees');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('makes lens virtual constructions and the focal-boundary transition explicit', async ({ page }) => {
    await mountUi(page, {
      mode: 'lenses', lensType: 'converging', lensFocal: 10, lensDo: 5, lensObjH: 5,
    });
    await autoPredict(page);

    const diagram = page.locator('#op-panel-lenses svg.opticslab-core-svg');
    const summary = page.locator('[data-op-lens-path-summary]');
    await expect(diagram).toBeVisible();
    await expect(summary).toHaveAttribute('data-op-lens-path-summary', 'virtual');
    await expect(summary).toContainText('no physical light travels along those dashed lines');
    await expect(diagram.locator('[data-op-lens-virtual-extension]')).toHaveCount(2);
    await expect(diagram.locator('[data-op-lens-image="virtual"]')).toHaveCount(1);

    const magnifierGeometry = await diagram.evaluate((svg) => {
      const n = (node: Element, name: string) => Number(node.getAttribute(name));
      const outputs = [...svg.querySelectorAll('[data-op-lens-ray="output"]')];
      const extensions = [...svg.querySelectorAll('[data-op-lens-virtual-extension]')];
      const image = svg.querySelector('[data-op-lens-image="virtual"]');
      const lensX = n(outputs[0], 'x1');
      return {
        lensX,
        imageX: image ? n(image, 'x1') : NaN,
        outputs: outputs.map((ray) => ({ x1: n(ray, 'x1'), x2: n(ray, 'x2') })),
        extensions: extensions.map((ray) => ({ x1: n(ray, 'x1'), x2: n(ray, 'x2') })),
      };
    });
    expect(magnifierGeometry.outputs.every((ray) => ray.x2 > ray.x1)).toBe(true);
    expect(magnifierGeometry.extensions.every((ray) => ray.x2 < ray.x1)).toBe(true);
    expect(magnifierGeometry.imageX).toBeLessThan(magnifierGeometry.lensX);

    await page.evaluate(() => (window as any).__set({ lensDo: 10.5 }));
    await expect(summary).toHaveAttribute('data-op-lens-path-summary', 'real');
    await expect(summary).toContainText('physically converge 210.0 cm');
    await expect(diagram.locator('[data-op-lens-image-offscale="real"]')).toContainText('dᵢ = +210.0 cm');
    await expect(diagram.locator('[data-op-lens-virtual-extension]')).toHaveCount(0);

    await page.evaluate(() => (window as any).__set({ lensDo: 10 }));
    await expect(summary).toHaveAttribute('data-op-lens-path-summary', 'infinity');
    const focalOutputs = diagram.locator('[data-lens-focal-ray="outgoing"]');
    await expect(focalOutputs).toHaveCount(3);
    const slopes = await focalOutputs.evaluateAll((rays) => rays.map((ray) => {
      const x1 = Number(ray.getAttribute('x1')); const y1 = Number(ray.getAttribute('y1'));
      const x2 = Number(ray.getAttribute('x2')); const y2 = Number(ray.getAttribute('y2'));
      return (y2 - y1) / (x2 - x1);
    }));
    expect(Math.max(...slopes) - Math.min(...slopes)).toBeLessThan(0.001);

    await page.evaluate(() => (window as any).__set({ lensType: 'diverging', lensDo: 20 }));
    await expect(summary).toHaveAttribute('data-op-lens-path-summary', 'virtual');
    await expect(diagram.locator('[data-op-lens-principal-ray="far-focus"]')).toHaveCount(2);
    await expect(diagram.locator('[data-op-lens-virtual-extension]')).toHaveCount(2);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('keeps grating aperture physics synchronized across 2D, detector, and 3D views', async ({ page }) => {
    await mountUi(page, {
      mode: 'diffraction', diffMode: 'grating', diffLambda: 600, diffGrating: 600,
      diffGratingDuty: 50, diffScreenL: 1, diffScreenProbeMm: 385, diffShowWavefield3D: true,
    });
    await autoPredict(page);

    const duty = page.getByRole('slider', { name: 'Grating open fraction' });
    const detector = page.getByRole('slider', { name: 'Diffraction screen detector position' });
    const aperture = page.locator('[data-op-wavefield-aperture="grating"]');
    const wavefieldDetector = page.locator('[data-op-wavefield-detector="diffraction"]');
    const wavefield = page.locator('[data-op-wavefield-3d="diffraction"]');
    const profile = page.locator('[data-op-intensity-profile="diffraction"]');
    const profileDetector = page.locator('[data-op-intensity-profile-detector="diffraction"]');
    const centerTarget = page.locator('[data-op-detector-target="center"]');
    const firstOrderTarget = page.locator('[data-op-detector-target="order-1"]');
    const detectorIntensity = async () => {
      const value = await detector.getAttribute('aria-valuetext');
      const match = value?.match(/relative intensity ([\d.]+) percent/);
      return Number(match?.[1]);
    };
    const openingSpan = () => aperture.locator('line').first().evaluate((line) => {
      const x1 = Number(line.getAttribute('x1'));
      const y1 = Number(line.getAttribute('y1'));
      const x2 = Number(line.getAttribute('x2'));
      const y2 = Number(line.getAttribute('y2'));
      return Math.hypot(x2 - x1, y2 - y1);
    });

    await expect(duty).toHaveValue('50');
    await expect(duty).toHaveAttribute('aria-valuetext', /opening width 0\.83 micrometers/);
    await expect(page.getByRole('slider', { name: 'Slit width' })).toHaveCount(0);
    await expect(page.locator('[data-op-grating-aperture="true"]')).toHaveAttribute('data-op-grating-duty', '50');
    await expect(page.locator('[data-op-grating-order="1"]')).toHaveCount(1);
    await expect(page.locator('[data-op-diffraction-order-ray="1"]')).toHaveCount(1);
    await expect(detector).toHaveAttribute('aria-valuetext', /resolved order m = \+1/);
    await expect(page.locator('[data-op-screen-probe-readout="diffraction"]')).toHaveAttribute('aria-live', 'polite');
    await expect(aperture).toHaveAttribute('data-op-grating-opening-count', '9');
    await expect(wavefield).toHaveAttribute('data-op-wavefield-height', 'relative-intensity');
    await expect(wavefieldDetector).toHaveAttribute('data-op-detector-mm', '385.000');
    await expect(wavefieldDetector).toHaveAttribute('data-op-detector-visible', 'true');
    await expect(profile).toBeVisible();
    await expect(profile.locator('[data-axis="x"]')).toContainText('screen position y (mm)');
    await expect(profile.locator('[data-axis="y"]')).toContainText('I / I₀');
    await expect(profileDetector).toHaveAttribute('data-op-detector-mm', '385.000');
    await expect(firstOrderTarget).toHaveAttribute('aria-pressed', 'true');
    const intensityAt50 = await detectorIntensity();
    const spanAt50 = await openingSpan();

    await centerTarget.click();
    await page.waitForFunction(() => (window as any).__bucket().diffScreenProbeMm === 0);
    await expect(centerTarget).toHaveAttribute('aria-pressed', 'true');
    await expect(detector).toHaveAttribute('aria-valuetext', /resolved order m = 0/);
    await expect(wavefieldDetector).toHaveAttribute('data-op-detector-mm', '0.000');
    await expect(profileDetector).toHaveAttribute('data-op-detector-mm', '0.000');

    await firstOrderTarget.click();
    await page.waitForFunction(() => {
      const value = (window as any).__bucket().diffScreenProbeMm;
      return value > 385 && value < 387;
    });
    await expect(firstOrderTarget).toHaveAttribute('aria-pressed', 'true');
    await expect(detector).toHaveAttribute('aria-valuetext', /resolved order m = \+1/);
    await expect(wavefieldDetector).toHaveAttribute('data-op-detector-mm', /^38[56]\./);
    await expect(profileDetector).toHaveAttribute('data-op-detector-mm', /^38[56]\./);
    const profileYAt50 = Number(await profileDetector.getAttribute('cy'));

    await duty.fill('25');
    await page.waitForFunction(() => (window as any).__bucket().diffGratingDuty === 25);
    await expect(duty).toHaveAttribute('aria-valuetext', /opening width 0\.42 micrometers/);
    await expect(page.locator('[data-op-grating-aperture="true"]')).toHaveAttribute('data-op-grating-duty', '25');
    await expect(page.locator('[data-op-causal-insight="diffraction"]')).toHaveAttribute('data-isolated-variable', 'true');
    await expect(page.locator('[data-op-causal-insight="diffraction"]')).toContainText('without moving the ideal order angles');
    await expect(page.locator('[data-op-grating-order="1"]')).toHaveCount(1);
    await expect(detector).toHaveAttribute('aria-valuetext', /resolved order m = \+1/);

    expect(await openingSpan()).toBeLessThan(spanAt50);
    expect(await detectorIntensity()).toBeGreaterThan(intensityAt50);
    expect(Number(await profileDetector.getAttribute('cy'))).toBeLessThan(profileYAt50);
  });

  test('probes the 3D wavefield without overflowing a narrow screen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 760 });
    await mountUi(page, {
      mode: 'interference', intShowWavefield3D: true, intWavefieldProbe: 0.4,
      intLambda: 600, intSlitSep: 0.1, intSlitWidth: 50, intScreenL: 1,
      intScreenProbeMm: 3,
    });

    const probe = page.getByRole('slider', { name: 'interference wavefield depth probe' });
    const scene = page.locator('[data-op-wavefield-3d="interference"]');
    const readout = page.locator('[data-op-wavefield-probe-readout="interference"]');
    const probeMeasurement = scene.locator('[data-op-wavefield-probe-measurement="interference"]');
    const screenMeasurement = scene.locator('[data-op-wavefield-detector="interference"]');
    const measurementTrail = scene.locator('[data-op-wavefield-measurement-trail="interference"]');
    await expect(probe).toHaveValue('0.4');
    await expect(probe).toHaveAttribute('aria-valuetext', /^0\.40 meters from the aperture, 40 percent/);
    await expect(readout).toHaveAttribute('aria-live', 'polite');
    await expect(readout).toHaveAttribute('data-op-probe-distance-m', '0.400');
    await expect(readout).toContainText('0.40 m · 40%');
    await expect(readout).toContainText('I / I₀');
    await expect(scene).toHaveAttribute('viewBox', '0 0 250 220');
    await expect(scene).toHaveAttribute('data-op-wavefield-direct', 'ridge-selection');
    await expect(page.locator('[data-op-wavefield-probe="true"]')).toHaveCount(1);
    await expect(scene.locator('[data-op-wavefield-slice-hit]')).toHaveCount(10);
    await expect(scene.locator('[data-op-wavefield-slice-hit="0.4"]')).toHaveAttribute('data-op-wavefield-slice-selected', 'true');
    await expect(scene.locator('[data-op-wavefield-slice-fill="probe"]')).toHaveCount(1);
    await expect(scene.locator('[data-op-wavefield-slice-fill="screen"]')).toHaveCount(1);
    await expect(page.locator('[data-op-wavefield-key="interference"]')).toContainText('Probe sample');
    await expect(page.locator('[data-op-wavefield-key="interference"]')).toContainText('Height = I / I₀');
    await expect(probeMeasurement).toHaveAttribute('data-op-probe-mm', '3.000');
    await expect(probeMeasurement).toHaveAttribute('data-op-probe-visible', 'true');
    await expect(measurementTrail).toHaveAttribute('data-op-trail-sample-count', '10');
    await expect(measurementTrail).toHaveAttribute('data-op-trail-lateral-mm', '3.000');
    await expect(measurementTrail).toHaveAttribute('data-op-trail-selected-depth', '0.4');
    await expect(measurementTrail.locator('[data-op-wavefield-trail-point]')).toHaveCount(10);
    await expect(measurementTrail.locator('[data-op-wavefield-trail-point="0.4"]')).toHaveAttribute('data-op-trail-selected', 'true');
    await expect(page.getByText('probe 40%', { exact: true })).toBeVisible();
    await expect(page.locator('[data-op-intensity-profile="interference"]')).toBeVisible();
    const clippedLabels = await scene.evaluate((svg) => {
      const frame = svg.getBoundingClientRect();
      return Array.from(svg.querySelectorAll('text')).filter((label) => {
        const box = label.getBoundingClientRect();
        return box.left < frame.left - 1 || box.right > frame.right + 1
          || box.top < frame.top - 1 || box.bottom > frame.bottom + 1;
      }).map((label) => label.textContent);
    });
    expect(clippedLabels).toEqual([]);

    const probeAt40 = Number(await probeMeasurement.getAttribute('data-op-probe-intensity'));
    const screenAt100 = Number(await screenMeasurement.getAttribute('data-op-detector-intensity'));
    expect(probeAt40).toBeGreaterThan(0.05);
    expect(screenAt100).toBeLessThan(0.001);
    expect(Number(await measurementTrail.locator('[data-op-wavefield-trail-point="0.4"]').getAttribute('data-op-trail-intensity'))).toBeCloseTo(probeAt40, 4);
    expect(Number(await measurementTrail.locator('[data-op-wavefield-trail-point="1.0"]').getAttribute('data-op-trail-intensity'))).toBeCloseTo(screenAt100, 4);
    await scene.locator('[data-op-wavefield-slice-hit="0.6"]').dispatchEvent('pointerdown', {
      pointerType: 'mouse', pointerId: 1, isPrimary: true, button: 0, buttons: 1,
    });
    await page.waitForFunction(() => (window as any).__bucket().intWavefieldProbe === 0.6);
    await expect(probe).toHaveValue('0.6');
    await expect(scene.locator('[data-op-wavefield-slice-hit="0.6"]')).toHaveAttribute('data-op-wavefield-slice-selected', 'true');
    await expect(measurementTrail).toHaveAttribute('data-op-trail-selected-depth', '0.6');
    await expect(measurementTrail.locator('[data-op-wavefield-trail-point="0.6"]')).toHaveAttribute('data-op-trail-selected', 'true');
    expect(Number(await probeMeasurement.getAttribute('data-op-probe-intensity'))).toBeGreaterThan(probeAt40);

    await probe.fill('1');
    await expect(readout).toHaveAttribute('data-op-probe-distance-m', '1.000');
    await expect(readout).toContainText('1.00 m · 100%');
    await expect(scene.locator('[data-op-wavefield-probe-at-screen="true"]')).toHaveCount(1);
    await expect(probeMeasurement).toHaveAttribute('data-op-probe-visible', 'false');
    await expect(probeMeasurement).toHaveAttribute('data-op-probe-at-screen', 'true');
    await expect(measurementTrail).toHaveAttribute('data-op-trail-selected-depth', '1.0');
    await expect(measurementTrail.locator('[data-op-wavefield-trail-point="1.0"]')).toHaveAttribute('data-op-trail-selected', 'true');
    expect(Number(await probeMeasurement.getAttribute('data-op-probe-intensity'))).toBeCloseTo(screenAt100, 4);
    const size = await page.evaluate(() => ({
      body: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
      tool: document.querySelector('[data-opticslab-tool]')!.scrollWidth,
      toolClient: document.querySelector('[data-opticslab-tool]')!.clientWidth,
    }));
    expect(size.body).toBeLessThanOrEqual(size.viewport + 1);
    expect(size.tool).toBeLessThanOrEqual(size.toolClient + 1);
  });
});

test.describe('Optics Lab polarization — real WebGL', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  test('mounts a 3D view of the polarizer chain', async ({ page }) => {
    await mount(page, { polTheta2: 30 });
    await autoPredict(page);
    const gl = await page.evaluate(() => (window as any).__gl());
    const outcome = page.locator('[data-op-polarization-3d-outcome]');
    const stageTrail = page.locator('[data-op-polarization-stage-trail="true"]');
    const projectionRule = page.locator('[data-op-polarization-rule="true"]');
    const throughput = page.locator('[data-op-polarization-throughput="true"]');
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
    expect(gl.mode).toBe('linear');
    expect(gl.finalIntensity).toBeCloseTo(0.375, 6);
    expect(gl.discs).toBe(2);            // P1 and P2
    expect(gl.segments).toBeGreaterThan(2);
    await expect(outcome).toHaveAttribute('data-op-polarization-3d-outcome', 'transmitting');
    await expect(outcome).toHaveAttribute('data-polarization-mode', 'linear');
    await expect(outcome).toHaveAttribute('data-final-intensity', '0.375000');
    await expect(outcome).toHaveAttribute('data-input-intensity', '1.000000');
    await expect(outcome).toHaveAttribute('data-after-p1', '0.500000');
    await expect(outcome).toHaveAttribute('data-after-qwp', 'none');
    await expect(outcome).toHaveAttribute('data-after-p2', '0.375000');
    await expect(outcome).toHaveAttribute('data-after-p3', 'none');
    await expect(outcome).toHaveAttribute('data-p2-relative-transmission', '0.750000');
    await expect(outcome).toHaveAttribute('data-p3-relative-transmission', 'none');
    await expect(outcome).toHaveAttribute('data-qwp-enabled', 'false');
    await expect(outcome).toHaveAttribute('data-p3-enabled', 'false');
    await expect(outcome).toContainText('Beam transmitting');
    await expect(outcome).toContainText('I_out = 37.5% I₀');
    await expect(stageTrail).toContainText('I₀ 100.0% → P₁ 50.0% → P₂ 37.5%');
    await expect(projectionRule).toContainText('P₂ keeps 75.0% of P₁ · cos²(30°)');
    await expect(throughput).toHaveAttribute('role', 'progressbar');
    await expect(throughput).toHaveAttribute('aria-valuenow', '37.5');
    await expect(throughput).toHaveAttribute('aria-valuetext', '37.5 percent of original intensity');

    await page.setViewportSize({ width: 320, height: 760 });
    await page.waitForTimeout(150);
    const fit = await page.evaluate(() => {
      const hud = document.querySelector('[data-op-polarization-3d-outcome]') as HTMLElement;
      const scene = hud.parentElement as HTMLElement;
      const h = hud.getBoundingClientRect();
      const s = scene.getBoundingClientRect();
      return {
        hudInside: h.left >= s.left - 1 && h.right <= s.right + 1
          && h.top >= s.top - 1 && h.bottom <= s.bottom + 1,
        page: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth
      };
    });
    expect(fit.hudInside).toBe(true);
    expect(fit.page).toBeLessThanOrEqual(fit.viewport + 1);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('holds the polarizer outcome until a prediction, then reveals it', async ({ page }) => {
    // The 3-D overlay only exists once a real WebGL scene is ready, so the unit
    // tests cannot reach it. Held first, then revealed on the SAME scene, so
    // neither half can pass on a view that simply never rendered.
    const MASK = opticsConstant('OPTICS_MASKED_VALUE');
    const SPOKEN = opticsConstant('OPTICS_MASKED_SPOKEN');
    await mount(page, { polTheta2: 30 });
    const outcome = page.locator('[data-op-polarization-3d-outcome]');
    const trail = page.locator('[data-op-polarization-stage-trail="true"]');
    const rule = page.locator('[data-op-polarization-rule="true"]');
    const bar = page.locator('[data-op-polarization-throughput="true"]');
    await expect(outcome).toContainText('Outcome ' + MASK);
    await expect(outcome).toContainText('I_out = ' + MASK);
    await expect(outcome).not.toContainText('Beam transmitting');
    await expect(outcome).not.toContainText('37.5');
    await expect(trail).toContainText('P₂ ' + MASK);
    await expect(rule).toContainText('cos²(30°) of what reaches it');
    await expect(rule).not.toContainText('75.0%');
    await expect(bar).not.toHaveAttribute('aria-valuenow', /.*/);
    await expect(bar).toHaveAttribute('aria-valuetext', SPOKEN);
    // Rose = extinguished, green = transmitting: the held label is neutral.
    expect(await outcome.locator('div').first().evaluate((el) => getComputedStyle(el).color)).toBe('rgb(203, 213, 225)');

    await autoPredict(page);
    await expect(outcome).toContainText('Beam transmitting');
    await expect(outcome).toContainText('I_out = 37.5% I₀');
    await expect(bar).toHaveAttribute('aria-valuenow', '37.5');
  });

  test('★ linear light is FLAT in the transverse plane', async ({ page }) => {
    // The physical claim of a linear polarizer: after it, the field oscillates
    // in ONE plane. All excursion along its own axis, none across it.
    await mount(page, { polTheta2: 30 });
    const s = await page.evaluate(() => (window as any).__gl().spreads);
    expect(s.p1.along).toBeGreaterThan(0.5);
    expect(s.p1.across).toBeLessThan(0.02);
    expect(s.p2.along).toBeGreaterThan(0.3);
    expect(s.p2.across).toBeLessThan(0.02);
  });

  test('★ circular light is ROUND — the thing the flat sim could not draw', async ({ page }) => {
    await mount(page, { polTheta2: 30, polQwp: true });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.mode).toBe('circular');
    const q = gl.spreads.qwp;
    expect(q).toBeTruthy();
    // Equal excursion on both transverse axes, to within sampling error.
    expect(q.along).toBeGreaterThan(0.5);
    expect(Math.abs(q.along - q.across)).toBeLessThan(0.05);
    // And the plate itself is drawn, as a third disc in the chain.
    expect(gl.discs).toBe(3);
  });

  test('★ circular light is not extinguished at ANY polarizer angle', async ({ page }) => {
    // This is the lab-kit experiment the tool has always described and never
    // been able to demonstrate. Crossed polarizers extinguish linear light;
    // circular light comes through at half, whatever the angle.
    await mount(page, { polTheta2: 90 });
    await autoPredict(page);
    const outcome = page.locator('[data-op-polarization-3d-outcome]');
    const calculator = page.locator('[data-op-polarization-calc-mode]');
    const stageTrail = page.locator('[data-op-polarization-stage-trail="true"]');
    const projectionRule = page.locator('[data-op-polarization-rule="true"]');
    const linearCrossed = await page.evaluate(() => (window as any).__text());
    expect(linearCrossed).toContain('0.0% I₀');      // 90 deg = extinction
    await expect(outcome).toHaveAttribute('data-op-polarization-3d-outcome', 'extinguished');
    await expect(outcome).toHaveAttribute('data-final-intensity', '0.000000');
    await expect(outcome).toHaveAttribute('data-p2-relative-transmission', '0.000000');
    await expect(outcome).toContainText('Beam extinguished');
    await expect(stageTrail).toContainText('I₀ 100.0% → P₁ 50.0% → P₂ 0.0%');
    await expect(projectionRule).toContainText('P₂ keeps 0.0% of P₁ · cos²(90°)');

    await page.evaluate(() => (window as any).__set({ polQwp: true }));
    await page.waitForTimeout(400);
    for (const angle of [0, 45, 90, 135]) {
      await page.evaluate((a) => (window as any).__set({ polTheta2: a }), angle);
      await page.waitForTimeout(250);
      const txt = await page.evaluate(() => (window as any).__text());
      expect(txt, `theta2=${angle}`).toContain('25.0% I₀');   // half of I0/2, always
      await expect(outcome).toHaveAttribute('data-op-polarization-3d-outcome', 'angle-independent');
      await expect(outcome).toHaveAttribute('data-polarization-mode', 'circular');
      await expect(outcome).toHaveAttribute('data-final-intensity', '0.250000');
      await expect(calculator).toHaveAttribute('data-op-polarization-calc-mode', 'circular');
      await expect(calculator).toHaveAttribute('data-final-intensity', '0.250000');
    }
    await expect(outcome).toHaveAttribute('data-after-qwp', '0.500000');
    await expect(outcome).toHaveAttribute('data-after-p2', '0.250000');
    await expect(outcome).toHaveAttribute('data-p2-relative-transmission', '0.500000');
    await expect(outcome).toHaveAttribute('data-qwp-enabled', 'true');
    await expect(outcome).toContainText('Axis-independent transmission');
    await expect(stageTrail).toContainText('I₀ 100.0% → P₁ 50.0% → QWP 50.0% → P₂ 25.0%');
    await expect(projectionRule).toContainText('P₂ keeps 50.0% of circular input · angle-independent');
  });

  test('the two transverse axes are really independent', async ({ page }) => {
    // 30 and 150 degrees are different orientations. Collapsed onto one screen
    // axis they drew identically, which is the bug this view exists to fix.
    await mount(page, { polTheta2: 30 });
    const a = await page.evaluate(() => (window as any).__gl().spreads.p2);
    await page.evaluate(() => (window as any).__set({ polTheta2: 150 }));
    await page.waitForTimeout(400);
    const b = await page.evaluate(() => (window as any).__gl().spreads.p2);
    // Same intensity (cos² is symmetric), so a collapsed view cannot tell them
    // apart. The 3D view must still place the field on a different axis.
    expect(a.along).toBeCloseTo(b.along, 2);
    const axes = await page.evaluate(() => {
      const g = (window as any).__gl();
      return g.spreads;
    });
    expect(axes.p2).toBeTruthy();
  });

  test('adding P3 extends the chain', async ({ page }) => {
    await mount(page, { polTheta2: 45 });
    await autoPredict(page);
    const before = await page.evaluate(() => (window as any).__gl().discs);
    await page.evaluate(() => (window as any).__set({ polUseP3: true, polTheta3: 90 }));
    await page.waitForTimeout(400);
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.discs).toBe(before + 1);
    expect(gl.spreads.p3).toBeTruthy();
    expect(gl.finalIntensity).toBeCloseTo(0.125, 6);
    const outcome = page.locator('[data-op-polarization-3d-outcome]');
    await expect(outcome).toHaveAttribute('data-op-polarization-3d-outcome', 'transmitting');
    await expect(outcome).toHaveAttribute('data-p3-axis', '90.0');
    await expect(outcome).toHaveAttribute('data-final-intensity', '0.125000');
    await expect(outcome).toHaveAttribute('data-after-p1', '0.500000');
    await expect(outcome).toHaveAttribute('data-after-p2', '0.250000');
    await expect(outcome).toHaveAttribute('data-after-p3', '0.125000');
    await expect(outcome).toHaveAttribute('data-p2-relative-transmission', '0.500000');
    await expect(outcome).toHaveAttribute('data-p3-relative-transmission', '0.500000');
    await expect(outcome).toHaveAttribute('data-p3-enabled', 'true');
    await expect(page.locator('[data-op-polarization-stage-trail="true"]'))
      .toContainText('I₀ 100.0% → P₁ 50.0% → P₂ 25.0% → P₃ 12.5%');
    await expect(page.locator('[data-op-polarization-rule="true"]'))
      .toContainText('P₃ keeps 50.0% of P₂ · cos²(45°)');
    // The three-polarizer surprise: 0/45/90 passes light where 0/90 passes none.
    expect(await page.evaluate(() => (window as any).__text())).toContain('12.5% I₀');
  });

  test('the flat diagram survives as the guaranteed floor', async ({ page }) => {
    await mount(page, { polTheta2: 30 });
    expect(await page.evaluate(() => document.querySelectorAll('svg').length)).toBeGreaterThan(0);
  });

  test('the loading overlay actually goes away', async ({ page }) => {
    await mount(page, { polTheta2: 30 });
    expect(await page.evaluate(() => (window as any).__text())).not.toContain('Loading 3D view');
  });

  test('drag orbits the camera', async ({ page }) => {
    await mount(page, { polTheta2: 30 });
    const before = await page.evaluate(() => (window as any).__bucket().polRot);
    await page.evaluate(() => {
      const c = document.querySelector('canvas[data-optics-gl="true"]') as HTMLCanvasElement;
      const host = c.parentElement as HTMLElement;
      const r = host.getBoundingClientRect();
      const mk = (t: string, x: number, y: number) =>
        new PointerEvent(t, { clientX: x, clientY: y, bubbles: true, cancelable: true, pointerId: 1 });
      host.dispatchEvent(mk('pointerdown', r.left + r.width / 2, r.top + r.height / 2));
      host.dispatchEvent(mk('pointermove', r.left + r.width / 2 + 80, r.top + r.height / 2));
      host.dispatchEvent(mk('pointerup', r.left + r.width / 2 + 80, r.top + r.height / 2));
    });
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => (window as any).__bucket().polRot);
    expect(after.rotY).toBeGreaterThan((before?.rotY ?? 34) + 10);
  });

  test('supports keyboard orbit and a deterministic camera reset', async ({ page }) => {
    await mount(page, { polTheta2: 30 });
    const host = page.locator('[data-op-polarization-3d-host="true"]');
    await expect(host).toHaveAttribute('aria-roledescription', 'interactive 3D model');
    await expect(host).toHaveAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown + - 0');
    await expect(host).toHaveAttribute('aria-label', /Press zero to reset the camera/);

    await host.press('ArrowRight');
    await page.waitForFunction(() => (window as any).__bucket().polRot?.rotY === 38);
    expect(await page.evaluate(() => (window as any).__bucket().polCamera)).toBe('custom');
    expect(await page.evaluate(() => (window as any).__bubbledKeys)).not.toContain('ArrowRight');

    await host.press('0');
    await page.waitForFunction(() => {
      const bucket = (window as any).__bucket();
      return bucket.polCamera === 'oblique' && bucket.polRot?.rotY === 34
        && bucket.polRot?.rotX === 23 && bucket.polZoom === 1;
    });
    expect(await page.evaluate(() => (window as any).__bubbledKeys)).not.toContain('0');
  });

  test('sliding P2 does not remount the canvas', async ({ page }) => {
    await mount(page, { polTheta2: 10 });
    for (const a of [30, 60, 120]) {
      await page.evaluate((v) => (window as any).__set({ polTheta2: v }), a);
      await page.waitForTimeout(180);
    }
    expect(await page.evaluate(() => (window as any).__canvasCount())).toBe(1);
    expect(await page.evaluate(() => (window as any).__gl().state)).toBe('ready');
  });

  test('tears the renderer down on unmount', async ({ page }) => {
    await mount(page, { polTheta2: 30 });
    await page.evaluate(() => (window as any).__destroy());
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).__gl().state)).toBe('idle');
  });
});

test.describe('Optics Lab evidence journal', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });
  test('captures and restores trials', async ({ page }) => {
    await page.goto(`${base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.opticsLab);
    await page.evaluate(() => (window as any).__mount({
      mode: 'lenses', lensType: 'converging', lensFocal: 12, lensDo: 25, lensObjH: 5, lensShow3D: false,
      opTopicTouched: { lenses: true }, opTrialRuns: {},
      opPredictionNotes: { lenses: 'A farther object should move the image closer to the focal plane.' }
    }));
    const capture = page.locator('[data-op-trial-capture="lenses"]');
    await capture.click();
    await page.waitForFunction(() => (window as any).__bucket().opTrialRuns?.lenses?.length === 1);
    await page.evaluate(() => (window as any).__set({ lensDo: 35 }));
    await capture.click();
    await page.waitForFunction(() => (window as any).__bucket().opTrialRuns?.lenses?.length === 2);
    await expect(page.locator('[data-op-trial-journal="lenses"]')).toContainText('2 / 20 trials');
    await expect(page.locator('[data-op-trial-journal="lenses"]')).toContainText('Latest comparison:');
    await expect(page.locator('.opticslab-trial-plot svg')).toHaveAttribute('aria-label', /2 finite trials/);
    await page.getByRole('button', { name: 'Restore trial 1 setup' }).click();
    await page.waitForFunction(() => (window as any).__bucket().lensDo === 25);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-op-trial-export="lenses"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('optics-lab-lenses-trials.csv');
    const csvPath = await download.path();
    const csv = csvPath ? await readFile(csvPath, 'utf8') : '';
    expect(csv).toContain('"captured_at","topic","series"');
    expect(csv.match(/"lenses"/g)).toHaveLength(2);
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('opticsLab.state.v1') || '{}').opTrialRuns?.lenses?.length === 2);
    await page.reload();
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.opticsLab);
    await page.evaluate(() => (window as any).__mount({ mode: 'lenses' }));
    await expect(page.locator('[data-op-trial-journal="lenses"]')).toContainText('2 / 20 trials');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
});

test.describe('Optics Lab refraction ray-space bench — real WebGL', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  async function mountRefraction(page: Pg, bucket: Record<string, unknown> = {}) {
    await page.goto(`${base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.opticsLab);
    await page.evaluate(
      (b) => (window as any).__mount(b),
      Object.assign({ mode: 'refraction', refrShow3D: true, refrN1: 1, refrN2: 1.52, refrTheta1: 30 }, bucket)
    );
    await page.waitForSelector('canvas[data-optics-refraction-gl="true"]', { timeout: 30000 });
    await page.waitForFunction(() => (window as any).__refr()?.state === 'ready', null, { timeout: 30000 });
    await page.waitForTimeout(400);
  }

  test('builds a spatial Snell ray fan with the calculated angle', async ({ page }) => {
    await mountRefraction(page);
    await autoPredict(page);
    const outcome = page.locator('[data-op-refraction-3d-outcome]');
    const gl = await page.evaluate(() => (window as any).__refr());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
    expect(gl.rays).toBe(3);
    expect(gl.theta1Deg).toBeCloseTo(30, 2);
    expect(gl.theta2Deg).toBeCloseTo(19.2, 1);
    expect(gl.tir).toBe(false);
    await expect(outcome).toHaveAttribute('data-op-refraction-3d-outcome', 'toward-normal');
    await expect(outcome).toHaveAttribute('data-theta1-deg', '30.000');
    await expect(outcome).toHaveAttribute('data-theta2-deg', /^19\.2/);
    await expect(outcome).toHaveAttribute('data-critical-angle-deg', 'none');
    await expect(outcome).toContainText('Bends toward normal');
    await expect(outcome).toContainText('No critical angle in this direction');

    // Pressing the visible +30-degree handle must preserve +30, not flip to -30.
    await page.evaluate(() => {
      const handle = document.querySelector('[data-op-direct-handle="incident-angle"]') as SVGGElement;
      const circle = handle.querySelector('circle') as SVGCircleElement;
      const rect = circle.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const send = (type: string) => handle.dispatchEvent(new PointerEvent(type, {
        clientX: x, clientY: y, bubbles: true, cancelable: true, pointerId: 37
      }));
      send('pointerdown');
      send('pointerup');
    });
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => (window as any).__bucket().refrTheta1)).toBe(30);

    await page.evaluate(() => {
      const handle = document.querySelector('[data-op-direct-handle="incident-angle"]') as SVGGElement;
      const circle = handle.querySelector('circle') as SVGCircleElement;
      const svg = handle.ownerSVGElement as SVGSVGElement;
      const rect = circle.getBoundingClientRect();
      const matrix = svg.getScreenCTM() as DOMMatrix;
      const target = svg.createSVGPoint();
      target.x = svg.viewBox.baseVal.width / 2 - 130 * Math.sin(Math.PI / 4);
      target.y = svg.viewBox.baseVal.height / 2 - 130 * Math.cos(Math.PI / 4);
      const screenTarget = target.matrixTransform(matrix);
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;
      const send = (type: string, x: number, y: number) => handle.dispatchEvent(new PointerEvent(type, {
        clientX: x, clientY: y, bubbles: true, cancelable: true, pointerId: 38
      }));
      send('pointerdown', startX, startY);
      send('pointermove', screenTarget.x, screenTarget.y);
      send('pointerup', screenTarget.x, screenTarget.y);
    });
    await page.waitForFunction(() => (window as any).__bucket().refrTheta1 === 45);
    await page.waitForFunction(() => Math.abs((window as any).__refr()?.theta1Deg - 45) < 0.01);
    await expect(outcome).toHaveAttribute('data-theta1-deg', '45.000');
    await page.setViewportSize({ width: 320, height: 720 });
    await expect(outcome).toBeVisible();
    const narrowBounds = await outcome.boundingBox();
    expect(narrowBounds).not.toBeNull();
    expect(narrowBounds!.x).toBeGreaterThanOrEqual(0);
    expect(narrowBounds!.x + narrowBounds!.width).toBeLessThanOrEqual(320.5);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('holds the refraction outcome until a prediction, then reveals it', async ({ page }) => {
    const MASK = opticsConstant('OPTICS_MASKED_VALUE');
    await mountRefraction(page);
    const outcome = page.locator('[data-op-refraction-3d-outcome]');
    await expect(outcome).toContainText('Outcome ' + MASK);
    await expect(outcome).not.toContainText('Bends');
    await expect(outcome).not.toContainText('19.2');
    // Pink = TIR, yellow = no bend, cyan = refracts: the held border is neutral.
    expect(await outcome.evaluate((el) => getComputedStyle(el).borderLeftColor)).toBe('rgb(148, 163, 184)');

    await autoPredict(page);
    await expect(outcome).toContainText('Bends toward normal');
    await expect(outcome).toContainText('19.2');
  });

  test('keeps the Fresnel power split synchronized across 2D, calculator, and 3D', async ({ page }) => {
    await mountRefraction(page, { refrN1: 1, refrN2: 1.5, refrTheta1: 0 });
    await autoPredict(page);
    const split = page.locator('[data-op-fresnel-split="refraction"]');
    const reflectedRay = page.locator('[data-op-refraction-ray="reflected"]');
    const transmittedRay = page.locator('[data-op-refraction-ray="transmitted"]');
    const outcome = page.locator('[data-op-refraction-3d-outcome]');

    await expect(split).toHaveAttribute('data-reflectance', '0.040000');
    await expect(split).toHaveAttribute('data-transmittance', '0.960000');
    await expect(reflectedRay).toHaveAttribute('data-power-fraction', '0.040000');
    await expect(transmittedRay).toHaveAttribute('data-power-fraction', '0.960000');
    await expect(outcome).toHaveAttribute('data-op-refraction-3d-outcome', 'no-bend');
    await expect(outcome).toHaveAttribute('data-theta1-deg', '0.000');
    await expect(outcome).toContainText('No directional bend');
    await expect(outcome).toContainText('No critical angle in this direction');
    await expect(page.locator('[data-op-refraction-3d-energy="true"]')).toContainText('R 4.0% · T 96.0%');
    let gl = await page.evaluate(() => (window as any).__refr());
    expect(gl.reflectance).toBeCloseTo(0.04, 6);
    expect(gl.transmittance).toBeCloseTo(0.96, 6);

    await page.evaluate(() => (window as any).__set({ refrN1: 1.5, refrN2: 1, refrTheta1: 40 }));
    await page.waitForFunction(() => Math.abs((window as any).__refr()?.reflectance - 0.2452912043) < 1e-6);
    const belowCritical = await page.evaluate(() => (window as any).__refr().reflectance);
    await expect(outcome).toHaveAttribute('data-op-refraction-3d-outcome', 'away-from-normal');
    await expect(outcome).toHaveAttribute('data-critical-angle-deg', '41.810');
    await expect(outcome).toHaveAttribute('data-critical-offset-deg', '-1.810');
    await expect(outcome).toContainText('Bends away from normal');
    await expect(outcome).toContainText('1.8° below critical');

    await page.evaluate(() => (window as any).__set({ refrTheta1: 41.7 }));
    await page.waitForFunction(() => (window as any).__refr()?.reflectance > 0.68);
    gl = await page.evaluate(() => (window as any).__refr());
    expect(gl.reflectance).toBeGreaterThan(belowCritical);
    expect(gl.reflectance + gl.transmittance).toBeCloseTo(1, 8);
    await expect(split).toHaveAttribute('data-reflectance', '0.689661');
    await expect(outcome).toHaveAttribute('data-critical-offset-deg', '-0.110');
    await expect(outcome).toContainText('0.1° below critical');
    await expect(page.locator('[data-op-refraction-3d-energy="true"]')).toContainText('R 69.0% · T 31.0%');

    await page.evaluate(() => (window as any).__set({ refrTheta1: 60 }));
    await page.waitForFunction(() => (window as any).__refr()?.tir === true && (window as any).__refr()?.reflectance === 1);
    await expect(split).toHaveAttribute('data-reflectance', '1.000000');
    await expect(split).toHaveAttribute('data-transmittance', '0.000000');
    await expect(split.locator('[data-op-fresnel-status="tir"]')).toContainText('100.0% reflected and 0.0% transmitted');
    await expect(page.locator('[data-op-refraction-ray="transmitted"]')).toHaveCount(0);
    await expect(outcome).toHaveAttribute('data-op-refraction-3d-outcome', 'tir');
    await expect(outcome).toHaveAttribute('data-theta2-deg', 'none');
    await expect(outcome).toHaveAttribute('data-critical-offset-deg', '18.190');
    await expect(outcome).toContainText('Total internal reflection');
    await expect(outcome).toContainText('18.2° above critical');
    gl = await page.evaluate(() => (window as any).__refr());
    expect(gl.transmittance).toBe(0);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('supports keyboard orbit and a deterministic camera reset', async ({ page }) => {
    await mountRefraction(page);
    const control = page.locator('[data-op-refraction-3d-control="true"]');
    await expect(control).toHaveAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown + - 0');
    await control.focus();
    await control.press('ArrowRight');
    await page.waitForFunction(() => (window as any).__bucket().refr3DRot?.rotY === 42);
    expect(await page.evaluate(() => (window as any).__bubbledKeys)).not.toContain('ArrowRight');
    await page.locator('[data-op-refraction-3d-reset="true"]').click();
    await page.waitForFunction(() => {
      const bucket = (window as any).__bucket();
      return bucket.refr3DRot?.rotY === 36 && bucket.refr3DRot?.rotX === 12 && bucket.refr3DZoom === 1;
    });
  });

  test('switches to total internal reflection and disposes when hidden', async ({ page }) => {
    await mountRefraction(page);
    await page.evaluate(() => (window as any).__set({ refrN1: 1.5, refrN2: 1, refrTheta1: 60 }));
    await page.waitForTimeout(450);
    const tir = await page.evaluate(() => (window as any).__refr());
    expect(tir.tir).toBe(true);
    expect(tir.theta2Deg).toBeNull();

    await page.evaluate(() => (window as any).__set({ refrShow3D: false }));
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).__refrCanvasCount())).toBe(0);
    expect((await page.evaluate(() => (window as any).__refr())).state).toBe('idle');
  });
});

/**
 * Snell's window — the refraction tab.
 *
 * The tool states twice that a fish sees the whole sky inside a 96-degree
 * circle, and lists `snellsWindow` as a related phenomenon for an entry that
 * exists nowhere in the file. It is a cone; the tab drew a side-on slice.
 */
test.describe("Optics Lab Snell's window — real WebGL", () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  async function mountWindow(page: Pg, bucket: Record<string, unknown> = {}) {
    await page.goto(`${base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.opticsLab);
    await page.evaluate(
      (b) => (window as any).__mount(b),
      Object.assign({ mode: 'refraction', refrShowWindow: true, refrN1: 1.333, refrN2: 1.0 }, bucket)
    );
    await page.waitForSelector('canvas[data-optics-window-gl="true"]', { timeout: 30000 });
    await page.waitForFunction(() => (window as any).__win()?.state === 'ready', null, { timeout: 30000 });
    await page.waitForTimeout(400);
  }

  test('★ builds the cone at the real critical angle for water', async ({ page }) => {
    await mountWindow(page);
    const gl = await page.evaluate(() => (window as any).__win());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
    // asin(1/1.333) = 48.61 degrees. The tool's own fun fact says 48.6.
    expect(gl.coneDeg).toBeGreaterThan(48.5);
    expect(gl.coneDeg).toBeLessThan(48.8);
    expect(gl.skyRays).toBeGreaterThan(40);
    expect(gl.tirRays).toBeGreaterThan(4);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('★ the whole sky really is compressed into the cone', async ({ page }) => {
    // The claim is that rays out to the horizon all land inside the cone. The
    // window radius at the surface is depth*tan(thetaC); if any ray escaped the
    // cone the radius would have to grow.
    await mountWindow(page);
    const gl = await page.evaluate(() => (window as any).__win());
    const expected = 6 * Math.tan((gl.coneDeg * Math.PI) / 180);
    expect(gl.windowRadius).toBeCloseTo(expected, 2);
  });

  test('explains live geometry and keeps keyboard camera controls local', async ({ page }) => {
    await mountWindow(page);
    const scene = page.locator('[data-op-snell-window-3d-scene]');
    const host = page.locator('[data-op-snell-window-3d-host]');
    const outcome = page.locator('[data-op-snell-window-3d-outcome=active]');

    await expect(host).toHaveAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown + - 0');
    await expect(host).toHaveAttribute('aria-label', /press 0 to reset the view/);
    await expect(outcome).toHaveAttribute('role', 'status');
    await expect(outcome).toHaveAttribute('aria-live', 'polite');
    await expect(outcome).toHaveAttribute('data-cone-half-angle-deg', '48.607');
    await expect(outcome).toHaveAttribute('data-window-diameter-deg', '97.213');
    await expect(outcome).toHaveAttribute('data-index-ratio', '0.750188');
    await expect(outcome).toHaveAttribute('data-window-radius-model', '6.807');
    await expect(outcome).toContainText('48.6');
    await expect(outcome).toContainText('97.2');
    await expect(outcome).toContainText('Sky inside cone');
    await expect(outcome).toContainText('mirror outside');

    await host.focus();
    await host.press('ArrowRight');
    await page.waitForFunction(() => {
      const bucket = (window as any).__bucket();
      return bucket.refrWinRot?.rotY === 34 && bucket.refrWinCamera === 'custom';
    });
    await host.press('0');
    await page.waitForFunction(() => {
      const bucket = (window as any).__bucket();
      return bucket.refrWinRot?.rotY === 28 && bucket.refrWinRot?.rotX === -18
        && bucket.refrWinZoom === 1 && bucket.refrWinCamera === 'oblique';
    });
    const bubbled = await page.evaluate(() => (window as any).__bubbledKeys);
    expect(bubbled).not.toContain('ArrowRight');
    expect(bubbled).not.toContain('0');

    await page.setViewportSize({ width: 320, height: 720 });
    const sceneBox = await scene.boundingBox();
    const outcomeBox = await outcome.boundingBox();
    const cueBox = await page.locator('[data-op-snell-window-3d-cue]').boundingBox();
    expect(sceneBox).not.toBeNull();
    expect(outcomeBox).not.toBeNull();
    expect(cueBox).not.toBeNull();
    expect(outcomeBox!.x).toBeGreaterThanOrEqual(sceneBox!.x);
    expect(outcomeBox!.x + outcomeBox!.width).toBeLessThanOrEqual(sceneBox!.x + sceneBox!.width + 0.5);
    expect(outcomeBox!.y + outcomeBox!.height).toBeLessThan(cueBox!.y);
  });

  test('a denser second medium narrows the window', async ({ page }) => {
    await mountWindow(page);
    const outcome = page.locator('[data-op-snell-window-3d-outcome=active]');
    const water = await page.evaluate(() => (window as any).__win().coneDeg);
    // Diamond to air: asin(1/2.417) = 24.4 degrees, a much tighter cone.
    await page.evaluate(() => (window as any).__set({ refrN1: 2.417, refrN2: 1.0 }));
    await page.waitForTimeout(500);
    const diamond = await page.evaluate(() => (window as any).__win().coneDeg);
    expect(diamond).toBeLessThan(water);
    expect(diamond).toBeGreaterThan(24.2);
    expect(diamond).toBeLessThan(24.6);
    const expectedDiamond = Math.asin(1 / 2.417) * 180 / Math.PI;
    await expect(outcome).toHaveAttribute('data-cone-half-angle-deg', expectedDiamond.toFixed(3));
    await expect(outcome).toHaveAttribute('data-window-diameter-deg', (expectedDiamond * 2).toFixed(3));
    await expect(outcome).toContainText(expectedDiamond.toFixed(1));
  });

  test('★ refuses to draw a window that cannot exist, and offers the fix', async ({ page }) => {
    // Looking INTO the denser medium there is no critical angle and no window.
    // Drawing one anyway would teach the misconception the tab exists to prevent.
    await page.goto(`${base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.opticsLab);
    await page.evaluate(() => (window as any).__mount({
      mode: 'refraction', refrShowWindow: true, refrN1: 1.0, refrN2: 1.333
    }));
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => document.querySelectorAll('canvas[data-optics-window-gl]').length)).toBe(0);
    const txt = await page.evaluate(() => (window as any).__text());
    expect(txt).toContain('There is no window here');
    expect(txt).toContain('Swap the media');

    // And the swap really fixes it, in one atomic update.
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button'))
        .find((el) => /Swap the media/.test(el.textContent || ''));
      (b as HTMLButtonElement).click();
    });
    await page.waitForSelector('canvas[data-optics-window-gl="true"]', { timeout: 30000 });
    await page.waitForFunction(() => (window as any).__win()?.state === 'ready', null, { timeout: 30000 });
    const b = await page.evaluate(() => (window as any).__bucket());
    expect(b.refrN1).toBeCloseTo(1.333, 3);
    expect(b.refrN2).toBeCloseTo(1.0, 3);
  });

  test('the window is opt-in and tears down when switched off', async ({ page }) => {
    await mountWindow(page);
    await page.evaluate(() => (window as any).__set({ refrShowWindow: false }));
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => document.querySelectorAll('canvas[data-optics-window-gl]').length)).toBe(0);
    expect(await page.evaluate(() => (window as any).__win().state)).toBe('idle');
  });
});

/**
 * Thin-lens ray-space bench. These checks pin the spatial model to the same
 * thin-lens outcomes as the 2D diagram and verify its opt-in lifecycle.
 */
test.describe('Optics Lab thin-lens bench - real WebGL', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  async function mountLens(page: Pg, bucket: Record<string, unknown> = {}) {
    await page.goto(`${base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.opticsLab);
    await page.evaluate(
      (b) => (window as any).__mount(b),
      Object.assign({
        mode: 'lenses', lensShow3D: true, lensType: 'converging',
        lensFocal: 12, lensDo: 25, lensObjH: 5
      }, bucket)
    );
    await page.waitForSelector('canvas[data-optics-lens-gl="true"]', { timeout: 30000 });
    await page.waitForFunction(() => (window as any).__lens()?.state === 'ready', null, { timeout: 30000 });
    await page.waitForTimeout(400);
  }

  test('builds a full aperture bundle that converges to a real image', async ({ page }) => {
    await mountLens(page);
    const host = page.locator('[data-op-lens-3d-host]');
    const rayKey = page.locator('[data-op-lens-3d-ray-key]');
    const gl = await page.evaluate(() => (window as any).__lens());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
    expect(gl.rayCount).toBe(9);
    expect(gl.imageVisible).toBe(true);
    expect(gl.fitHalf.x).toBeCloseTo(9.45, 2);
    expect(gl.fitHalf.y).toBeLessThan(3.1);
    expect(gl.fitHalf.z).toBeLessThan(3.1);
    expect(gl.cameraDistance).toBeLessThan(23);
    await expect(host).toHaveAttribute('role', 'group');
    await expect(rayKey).toContainText('input rays');
    await expect(rayKey).toContainText('physical rays');
    await expect(rayKey).not.toContainText('virtual extensions');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
    expect(await page.evaluate(() => (window as any).__lensCanvasCount())).toBe(1);
  });

  test('holds the lens image result until a prediction, then reveals it', async ({ page }) => {
    // Default bench: converging, f = 12, d_o = 25 -> d_i = 23.1 cm, real, inverted.
    const MASK = opticsConstant('OPTICS_MASKED_VALUE');
    await mountLens(page);
    const outcome = page.locator('[data-op-lens-3d-outcome]');
    await expect(outcome).toContainText('Image ' + MASK);
    await expect(outcome).toContainText('d_i = ' + MASK);
    await expect(outcome).not.toContainText('23.1');
    await expect(outcome).not.toContainText('inverted');
    // Second line is the outcome label; green = real, pink = virtual.
    expect(await outcome.locator('div').nth(1).evaluate((el) => getComputedStyle(el).color)).toBe('rgb(203, 213, 225)');

    await autoPredict(page);
    await expect(outcome).toContainText('real');
    await expect(outcome).toContainText('d_i = 23.1 cm');
  });

  test('moves a physical screen through focus and keeps 2D and 3D synchronized', async ({ page }) => {
    await mountLens(page, {
      lensFocal: 10, lensDo: 30, lensObjH: 5, lensScreenCm: 25
    });
    await autoPredict(page);
    const screenTest = page.locator('[data-op-lens-screen-test]');
    const screenRange = page.getByRole('slider', { name: 'Screen position' });
    const screenHandle = page.locator('[data-op-lens-screen-handle="true"]');
    const heightRange = page.getByRole('slider', { name: 'Lens object height', exact: true });
    const heightHandle = page.locator('[data-op-lens-height-handle="true"]');
    const liveFormula = page.locator('[data-op-formula-context]');
    const focusGuide = page.locator('[data-op-focus-guide="lens"]');
    const focusMarker = focusGuide.locator('[data-op-focus-marker="true"]');
    const lensOutcome = page.locator('[data-op-lens-3d-outcome]');
    const mission = page.locator('.opticslab-mission');

    await expect(mission).toContainText('Capture a sharp lens image');
    await expect(mission).toHaveAttribute('data-complete', 'false');
    await expect(screenTest).toHaveAttribute('data-op-lens-screen-test', 'blurred');
    await expect(screenTest).toHaveAttribute('data-screen-bundle-ratio', '0.666667');
    await expect(screenTest).toContainText('10.0 cm beyond the real image plane');
    await expect(focusGuide).toHaveAttribute('data-focus-state', 'blurred');
    await expect(focusGuide).toHaveAttribute('data-focus-offset-cm', '10.000000');
    await expect(focusGuide).toHaveAttribute('data-focus-relative', '0.666667');
    await expect(focusGuide).toContainText('Offset +10.0 cm | blur 66.7% aperture');
    await expect(focusMarker).toBeVisible();
    await heightRange.focus();
    await expect(liveFormula).toHaveAttribute('data-op-formula-context', 'lens-height');
    await expect(liveFormula).toContainText('h_i = m h_o');
    await heightHandle.focus();
    await heightHandle.press('ArrowUp');
    await page.waitForFunction(() => (window as any).__bucket().lensObjH === 5.5);
    await page.waitForFunction(() => Math.abs((window as any).__lens()?.imageHeight + 2.75) < 1e-8);
    await expect(lensOutcome).toHaveAttribute('data-op-lens-3d-outcome', 'real');
    await expect(lensOutcome).toHaveAttribute('data-image-side', 'far-side');
    await expect(lensOutcome).toHaveAttribute('data-image-orientation', 'inverted');
    await expect(lensOutcome).toHaveAttribute('data-image-scale', 'reduced');
    await expect(lensOutcome).toHaveAttribute('data-object-height', '5.500');
    await expect(lensOutcome).toHaveAttribute('data-image-height', '-2.750');
    await expect(lensOutcome).toHaveAttribute('role', 'status');
    await expect(lensOutcome).toHaveAttribute('aria-live', 'polite');
    await expect(lensOutcome).toHaveAttribute('data-image-distance-cm', '15.000');
    await expect(lensOutcome).toHaveAttribute('data-magnification', '-0.500000');
    await expect(lensOutcome).toHaveAttribute('data-screen-state', 'blurred');
    await expect(lensOutcome).toHaveAttribute('data-screen-distance-cm', '25.000');
    await expect(lensOutcome).toHaveAttribute('data-screen-offset-cm', '10.000');
    await expect(lensOutcome).toHaveAttribute('data-screen-bundle-ratio', '0.666667');
    await expect(lensOutcome).toContainText('real \u00b7 inverted \u00b7 reduced');
    await expect(lensOutcome).toContainText('h_i = -2.8 cm');
    await expect(lensOutcome).toContainText('screen 25.0 cm \u00b7 10.0 cm beyond focus \u00b7 blur 66.7%');
    let gl = await page.evaluate(() => (window as any).__lens());
    expect(gl.screenDistance).toBe(25);
    expect(gl.screenBundleRatio).toBeCloseTo(2 / 3, 6);
    expect(gl.screenFocused).toBe(false);
    expect(gl.screenCapturable).toBe(true);
    expect(gl.realRaysContinuePastFocus).toBe(true);

    await screenRange.fill('20');
    await page.waitForFunction(() => Math.abs((window as any).__lens()?.screenBundleRatio - (1 / 3)) < 1e-6);
    await expect(screenTest).toHaveAttribute('data-screen-bundle-ratio', '0.333333');
    await expect(focusGuide).toHaveAttribute('data-focus-offset-cm', '5.000000');
    await expect(liveFormula).toHaveAttribute('data-op-formula-context', 'lens-screen');
    await expect(liveFormula).toContainText('blur / aperture');
    await screenHandle.focus();
    await screenHandle.press('ArrowLeft');
    await page.waitForFunction(() => (window as any).__bucket().lensScreenCm === 19.5);

    await page.locator('[data-op-place-screen-at-image="true"]').click();
    await page.waitForFunction(() => (window as any).__lens()?.screenFocused === true);
    await expect(screenTest).toHaveAttribute('data-op-lens-screen-test', 'sharp');
    await expect(screenTest).toHaveAttribute('data-screen-distance', '15.000000');
    await expect(screenTest).toHaveAttribute('data-screen-bundle-ratio', '0.000000');
    await expect(focusGuide).toHaveAttribute('data-focus-state', 'sharp');
    await expect(focusGuide).toHaveAttribute('data-focus-offset-cm', '0.000000');
    await expect(focusGuide).toHaveAttribute('data-focus-relative', '0.000000');
    await expect(focusGuide).toContainText('Aligned at focus | blur 0.0% aperture');
    await expect(page.locator('[data-op-lens-3d-screen="true"]')).toHaveAttribute('data-screen-focused', 'true');
    await expect(lensOutcome).toHaveAttribute('data-screen-state', 'sharp');
    await expect(lensOutcome).toHaveAttribute('data-screen-distance-cm', '15.000');
    await expect(lensOutcome).toHaveAttribute('data-screen-offset-cm', '0.000');
    await expect(lensOutcome).toHaveAttribute('data-screen-bundle-ratio', '0.000000');
    await expect(page.locator('[data-op-lens-3d-screen="true"]')).toContainText('sharp focus');
    await expect(lensOutcome).toContainText('screen 15.0 cm \u00b7 sharp focus \u00b7 blur 0.0%');
    await expect(mission).toHaveAttribute('data-complete', 'true');
    await expect(mission.getByRole('button', { name: 'Next mission' })).toBeVisible();

    await page.evaluate(() => (window as any).__set({ lensDo: 5, lensScreenCm: 20 }));
    await page.waitForFunction(() => (window as any).__lens()?.screenCapturable === false);
    await expect(screenTest).toHaveAttribute('data-op-lens-screen-test', 'virtual');
    await expect(screenTest).toHaveAttribute('data-screen-bundle-ratio', '3.000000');
    await expect(focusGuide).toHaveAttribute('data-focus-state', 'virtual');
    await expect(focusGuide).toHaveAttribute('data-focus-capturable', 'false');
    await expect(focusMarker).toHaveCount(0);
    await expect(focusGuide.locator('[data-op-focus-no-target="true"]')).toBeVisible();
    await expect(page.locator('[data-op-place-screen-at-image="true"]')).toHaveCount(0);
    await expect(lensOutcome).toHaveAttribute('data-op-lens-3d-outcome', 'virtual');
    await expect(lensOutcome).toHaveAttribute('data-image-side', 'object-side');
    await expect(lensOutcome).toHaveAttribute('data-image-orientation', 'upright');
    await expect(lensOutcome).toHaveAttribute('data-image-scale', 'enlarged');
    await expect(lensOutcome).toHaveAttribute('data-image-height', '11.000');
    await expect(lensOutcome).toHaveAttribute('data-screen-state', 'virtual');
    await expect(lensOutcome).toHaveAttribute('data-screen-offset-cm', 'none');
    await expect(lensOutcome).toHaveAttribute('data-screen-bundle-ratio', '3.000000');
    await expect(lensOutcome).toContainText('virtual \u00b7 upright \u00b7 enlarged');
    await expect(lensOutcome).toContainText('screen 20.0 cm \u00b7 virtual image \u00b7 no screen focus');
    await expect(mission).toHaveAttribute('data-complete', 'false');

    await page.evaluate(() => (window as any).__set({ lensDo: 10 }));
    await page.waitForFunction(() => (window as any).__lens()?.screenBundleRatio === 1);
    await expect(screenTest).toHaveAttribute('data-op-lens-screen-test', 'infinity');
    await expect(screenTest).toContainText('No finite screen focus');
    await expect(focusGuide).toHaveAttribute('data-focus-state', 'infinity');
    await expect(focusGuide).toContainText('No finite focus target');
    await expect(lensOutcome).toHaveAttribute('data-op-lens-3d-outcome', 'infinity');
    await expect(lensOutcome).toHaveAttribute('data-image-side', 'at-infinity');
    await expect(lensOutcome).toHaveAttribute('data-image-height', 'infinity');
    await expect(lensOutcome).toHaveAttribute('data-screen-state', 'infinity');
    await expect(lensOutcome).toHaveAttribute('data-screen-offset-cm', 'none');
    await expect(lensOutcome).toContainText('image at infinity \u00b7 parallel output');
    await expect(lensOutcome).toContainText('screen 20.0 cm \u00b7 no finite focus \u00b7 parallel output');

    await page.setViewportSize({ width: 320, height: 760 });
    await page.waitForTimeout(150);
    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
      tool: document.querySelector('[data-opticslab-tool]')!.scrollWidth,
      toolClient: document.querySelector('[data-opticslab-tool]')!.clientWidth
    }));
    expect(widths.page).toBeLessThanOrEqual(widths.viewport + 1);
    expect(widths.tool).toBeLessThanOrEqual(widths.toolClient + 1);
    const lensOutcomeBounds = await lensOutcome.boundingBox();
    const lensCueBounds = await page.locator('[data-op-lens-3d-cue]').boundingBox();
    expect(lensOutcomeBounds).not.toBeNull();
    expect(lensCueBounds).not.toBeNull();
    expect(lensOutcomeBounds!.x).toBeGreaterThanOrEqual(0);
    expect(lensOutcomeBounds!.x + lensOutcomeBounds!.width).toBeLessThanOrEqual(320.5);
    expect(lensOutcomeBounds!.y + lensOutcomeBounds!.height).toBeLessThan(lensCueBounds!.y);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('draws virtual-image extensions and handles the focal-plane limit', async ({ page }) => {
    await mountLens(page, { lensType: 'diverging' });
    await autoPredict(page);
    expect(await page.evaluate(() => (window as any).__lens().rayCount)).toBe(9);
    const virtualFrame = await page.evaluate(() => (window as any).__lens().fitHalf);
    expect(virtualFrame.y).toBeGreaterThan(4.5);
    expect(virtualFrame.z).toBeGreaterThan(3.2);
    await expect(page.locator('[data-op-lens-3d-ray-key]')).toContainText('virtual extensions');
    expect(await page.evaluate(() => (window as any).__text())).toContain('Dashed pink lines are backward extensions');

    await page.evaluate(() => (window as any).__set({ lensType: 'converging', lensDo: 12, lensShowMath: true }));
    await page.waitForTimeout(450);
    const focal = await page.evaluate(() => (window as any).__lens());
    expect(focal.rayCount).toBe(9);
    expect(focal.imageVisible).toBe(false);
    const focalText = await page.evaluate(() => (window as any).__text());
    expect(focalText).toContain('image at infinity');
    expect(focalText).toContain('Parallel / collimated after lens');
    expect(focalText).toContain('1/d_i = 0');
    await expect(page.locator('svg[aria-label*="focal plane"]')).toHaveCount(1);
    const outgoingSlopes = await page.locator('line[data-lens-focal-ray="outgoing"]').evaluateAll((lines) =>
      lines.map((line) => {
        const x1 = Number(line.getAttribute('x1'));
        const y1 = Number(line.getAttribute('y1'));
        const x2 = Number(line.getAttribute('x2'));
        const y2 = Number(line.getAttribute('y2'));
        return (y2 - y1) / (x2 - x1);
      })
    );
    expect(outgoingSlopes).toHaveLength(3);
    expect(Math.max(...outgoingSlopes) - Math.min(...outgoingSlopes)).toBeLessThan(1e-9);

    const height = page.getByRole('slider', { name: 'Lens object height', exact: true });
    await height.fill('7');
    await expect(height).toHaveValue('7');
    await expect(height).toHaveAttribute('aria-valuetext', /Outgoing bundle angle/);
    expect(await page.evaluate(() => (window as any).__bucket().lensObjH)).toBe(7);
  });

  test('supports keyboard orbit and disposes when switched off', async ({ page }) => {
    await mountLens(page);
    const host = page.locator('[data-op-lens-3d-host="true"]');
    await expect(host).toHaveAttribute('aria-roledescription', 'interactive 3D model');
    await expect(host).toHaveAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown + - 0');
    await expect(host).toHaveAttribute('aria-label', /Press zero to reset the camera/);
    await host.press('ArrowRight');
    await page.waitForTimeout(300);
    const rotation = await page.evaluate(() => (window as any).__bucket().lensGlRot);
    expect(rotation.rotY).toBe(40);
    expect(await page.evaluate(() => (window as any).__bubbledKeys)).not.toContain('ArrowRight');

    await host.press('0');
    await page.waitForFunction(() => {
      const bucket = (window as any).__bucket();
      return bucket.lensGlCamera === 'oblique' && bucket.lensGlRot?.rotY === 34
        && bucket.lensGlRot?.rotX === 20 && bucket.lensGlZoom === 1;
    });
    expect(await page.evaluate(() => (window as any).__bubbledKeys)).not.toContain('0');

    await page.evaluate(() => (window as any).__set({ lensShow3D: false }));
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).__lensCanvasCount())).toBe(0);
    expect(await page.evaluate(() => (window as any).__lens().state)).toBe('idle');
  });
});

/**
 * Mirror ray-space bench. These checks enforce the mirror sign convention:
 * physical reflected light stays on the incident side, while only dashed
 * construction extensions pass behind the mirror for virtual images.
 */
test.describe('Optics Lab mirror ray-space bench - real WebGL', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  async function mountMirror(page: Pg, bucket: Record<string, unknown> = {}) {
    await page.goto(`${base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.opticsLab);
    await page.evaluate(
      (b) => (window as any).__mount(b),
      Object.assign({
        mode: 'reflection', reflShow3D: true, reflMirrorType: 'concave',
        reflFocal: 10, reflDo: 30, reflObjH: 5
      }, bucket)
    );
    await page.waitForSelector('canvas[data-optics-mirror-gl="true"]', { timeout: 30000 });
    await page.waitForFunction(() => (window as any).__mirror()?.state === 'ready', null, { timeout: 30000 });
    await page.waitForTimeout(400);
  }

  test('builds a real concave-mirror bundle that crosses focus and continues', async ({ page }) => {
    await mountMirror(page);
    await autoPredict(page);
    const host = page.locator('[data-op-mirror-3d-host]');
    const rayKey = page.locator('[data-op-mirror-3d-ray-key]');
    const mirrorOutcome = page.locator('[data-op-mirror-3d-outcome="real"]');
    const gl = await page.evaluate(() => (window as any).__mirror());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
    expect(gl.mirrorType).toBe('concave');
    expect(gl.rayCount).toBe(9);
    expect(gl.virtualExtensionCount).toBe(0);
    expect(gl.imageType).toBe('real');
    expect(gl.imageSide).toBe('incident');
    expect(gl.imageDistance).toBeCloseTo(15, 8);
    expect(gl.imageVisible).toBe(true);
    expect(gl.physicalRaysStayIncidentSide).toBe(true);
    expect(gl.realRaysContinuePastFocus).toBe(true);
    expect(gl.fitHalf.x).toBeCloseTo(9.45, 2);
    expect(gl.fitHalf.y).toBeLessThan(4.2);
    expect(gl.fitHalf.z).toBeLessThan(3.1);
    expect(gl.cameraDistance).toBeLessThan(24);
    await expect(host).toHaveAttribute('role', 'group');
    await expect(rayKey).toContainText('input rays');
    await expect(rayKey).toContainText('physical rays');
    await expect(rayKey).not.toContainText('virtual extensions');
    expect(await page.evaluate(() => (window as any).__mirrorCanvasCount())).toBe(1);
    await expect(mirrorOutcome).toHaveAttribute('data-image-side', 'incident');
    await expect(mirrorOutcome).toHaveAttribute('role', 'status');
    await expect(mirrorOutcome).toHaveAttribute('aria-live', 'polite');
    await expect(mirrorOutcome).toHaveAttribute('data-mirror-type', 'concave');
    await expect(mirrorOutcome).toHaveAttribute('data-object-height', '5.000');
    await expect(mirrorOutcome).toHaveAttribute('data-image-height', '-2.500');
    await expect(mirrorOutcome).toHaveAttribute('data-image-distance-cm', '15.000');
    await expect(mirrorOutcome).toHaveAttribute('data-magnification', '-0.500000');
    await expect(mirrorOutcome).toHaveAttribute('data-screen-state', 'sharp');
    await expect(mirrorOutcome).toHaveAttribute('data-screen-offset-cm', '0.000');
    await expect(mirrorOutcome).toHaveAttribute('data-screen-bundle-ratio', '0.000000');
    await expect(mirrorOutcome).toContainText('real · incident side · inverted');
    await expect(mirrorOutcome).toContainText('sample screen 15.0 cm · sharp focus · blur 0.0%');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('holds the mirror image result until a prediction, then reveals it', async ({ page }) => {
    // Default bench: concave, f = 10, d_o = 30 -> d_i = 15.0 cm, real, inverted.
    const MASK = opticsConstant('OPTICS_MASKED_VALUE');
    await mountMirror(page);
    const outcome = page.locator('[data-op-mirror-3d-outcome]');
    await expect(outcome).toContainText('Image ' + MASK);
    await expect(outcome).toContainText('d_i = ' + MASK);
    // Not a bare '15.0 cm': the sample-screen INSTRUMENT readout ("sample screen
    // 15.0 cm · sharp focus") is kept live by design, and this fixture's screen
    // happens to sit at the image plane.
    await expect(outcome).not.toContainText('d_i = 15.0');
    await expect(outcome).not.toContainText('incident side');
    expect(await outcome.locator('div').nth(1).evaluate((el) => getComputedStyle(el).color)).toBe('rgb(203, 213, 225)');

    await autoPredict(page);
    await expect(outcome).toContainText('real');
    await expect(outcome).toContainText('d_i = 15.0 cm');
  });

  test('moves a sampling screen through mirror focus and keeps 2D and 3D synchronized', async ({ page }) => {
    await mountMirror(page, {
      reflMirrorType: 'concave', reflFocal: 10, reflDo: 30,
      reflObjH: 5, reflScreenCm: 25
    });
    await autoPredict(page);
    const screenTest = page.locator('[data-op-mirror-screen-test]');
    const screenRange = page.getByRole('slider', { name: 'Mirror sampling screen position' });
    const screenHandle = page.locator('[data-op-mirror-screen-handle="true"]');
    const focusGuide = page.locator('[data-op-focus-guide="mirror"]');
    const focusMarker = focusGuide.locator('[data-op-focus-marker="true"]');
    const mirrorOutcome = page.locator('[data-op-mirror-3d-outcome]');

    await expect(screenTest).toHaveAttribute('data-op-mirror-screen-test', 'blurred');
    await expect(screenTest).toHaveAttribute('data-screen-bundle-ratio', '0.666667');
    await expect(screenTest).toContainText('10.0 cm beyond the real image plane');
    await expect(focusGuide).toHaveAttribute('data-focus-state', 'blurred');
    await expect(focusGuide).toHaveAttribute('data-focus-offset-cm', '10.000000');
    await expect(focusGuide).toHaveAttribute('data-focus-relative', '0.666667');
    await expect(focusGuide).toContainText('Offset +10.0 cm | blur 66.7% aperture');
    await expect(focusMarker).toBeVisible();
    let gl = await page.evaluate(() => (window as any).__mirror());
    expect(gl.screenDistance).toBe(25);
    expect(gl.screenBundleRatio).toBeCloseTo(2 / 3, 6);
    expect(gl.screenFocused).toBe(false);
    expect(gl.screenCapturable).toBe(true);
    await expect(mirrorOutcome).toHaveAttribute('data-screen-state', 'blurred');
    await expect(mirrorOutcome).toHaveAttribute('data-screen-distance-cm', '25.000');
    await expect(mirrorOutcome).toHaveAttribute('data-screen-offset-cm', '10.000');
    await expect(mirrorOutcome).toHaveAttribute('data-screen-bundle-ratio', '0.666667');
    await expect(mirrorOutcome).toContainText('sample screen 25.0 cm · 10.0 cm beyond focus · blur 66.7%');
    await expect(page.locator('[data-op-mirror-3d-screen="true"]')).toHaveAttribute('data-screen-focused', 'false');

    await screenRange.fill('20');
    await page.waitForFunction(() => Math.abs((window as any).__mirror()?.screenBundleRatio - (1 / 3)) < 1e-6);
    await expect(screenTest).toHaveAttribute('data-screen-bundle-ratio', '0.333333');
    await expect(focusGuide).toHaveAttribute('data-focus-offset-cm', '5.000000');
    await screenHandle.focus();
    await screenHandle.press('ArrowLeft');
    await page.waitForFunction(() => (window as any).__bucket().reflScreenCm === 20.5);

    await page.locator('[data-op-place-mirror-screen-at-image="true"]').click();
    await page.waitForFunction(() => (window as any).__mirror()?.screenFocused === true);
    await expect(screenTest).toHaveAttribute('data-op-mirror-screen-test', 'sharp');
    await expect(screenTest).toHaveAttribute('data-screen-distance', '15.000000');
    await expect(screenTest).toHaveAttribute('data-screen-bundle-ratio', '0.000000');
    await expect(focusGuide).toHaveAttribute('data-focus-state', 'sharp');
    await expect(focusGuide).toHaveAttribute('data-focus-offset-cm', '0.000000');
    await expect(focusGuide).toContainText('Aligned at focus | blur 0.0% aperture');
    await expect(page.locator('[data-op-mirror-3d-screen="true"]')).toHaveAttribute('data-screen-focused', 'true');
    await expect(mirrorOutcome).toHaveAttribute('data-screen-state', 'sharp');
    await expect(mirrorOutcome).toHaveAttribute('data-screen-distance-cm', '15.000');
    await expect(mirrorOutcome).toHaveAttribute('data-screen-offset-cm', '0.000');
    await expect(mirrorOutcome).toHaveAttribute('data-screen-bundle-ratio', '0.000000');
    await expect(page.locator('[data-op-mirror-3d-screen="true"]')).toContainText('sharp focus');
    await expect(mirrorOutcome).toContainText('sample screen 15.0 cm · sharp focus · blur 0.0%');

    await page.evaluate(() => (window as any).__set({ reflDo: 5, reflScreenCm: 20 }));
    await page.waitForFunction(() => (window as any).__mirror()?.screenCapturable === false);
    await expect(screenTest).toHaveAttribute('data-op-mirror-screen-test', 'virtual');
    await expect(screenTest).toHaveAttribute('data-screen-bundle-ratio', '3.000000');
    await expect(focusGuide).toHaveAttribute('data-focus-state', 'virtual');
    await expect(focusGuide).toHaveAttribute('data-focus-capturable', 'false');
    await expect(focusMarker).toHaveCount(0);
    await expect(page.locator('[data-op-place-mirror-screen-at-image="true"]')).toHaveCount(0);
    await expect(mirrorOutcome).toHaveAttribute('data-op-mirror-3d-outcome', 'virtual');
    await expect(mirrorOutcome).toHaveAttribute('data-image-distance-cm', '-10.000');
    await expect(mirrorOutcome).toHaveAttribute('data-screen-state', 'virtual');
    await expect(mirrorOutcome).toHaveAttribute('data-screen-offset-cm', 'none');
    await expect(mirrorOutcome).toHaveAttribute('data-screen-bundle-ratio', '3.000000');
    await expect(mirrorOutcome).toContainText('sample screen 20.0 cm · virtual image · no screen focus');

    await page.evaluate(() => (window as any).__set({ reflDo: 10 }));
    await page.waitForFunction(() => (window as any).__mirror()?.screenBundleRatio === 1);
    await expect(screenTest).toHaveAttribute('data-op-mirror-screen-test', 'infinity');
    await expect(screenTest).toContainText('No finite screen focus');
    await expect(focusGuide).toHaveAttribute('data-focus-state', 'infinity');
    await expect(focusGuide).toContainText('No finite focus target');
    await expect(mirrorOutcome).toHaveAttribute('data-op-mirror-3d-outcome', 'infinity');
    await expect(mirrorOutcome).toHaveAttribute('data-image-distance-cm', 'infinity');
    await expect(mirrorOutcome).toHaveAttribute('data-screen-state', 'infinity');
    await expect(mirrorOutcome).toHaveAttribute('data-screen-offset-cm', 'none');
    await expect(mirrorOutcome).toContainText('sample screen 20.0 cm · no finite focus · parallel output');

    await page.setViewportSize({ width: 320, height: 760 });
    await page.waitForTimeout(150);
    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
      tool: document.querySelector('[data-opticslab-tool]')!.scrollWidth,
      toolClient: document.querySelector('[data-opticslab-tool]')!.clientWidth
    }));
    expect(widths.page).toBeLessThanOrEqual(widths.viewport + 1);
    expect(widths.tool).toBeLessThanOrEqual(widths.toolClient + 1);
    const mirrorOutcomeBounds = await mirrorOutcome.boundingBox();
    const mirrorCueBounds = await page.locator('[data-op-mirror-3d-cue]').boundingBox();
    expect(mirrorOutcomeBounds).not.toBeNull();
    expect(mirrorCueBounds).not.toBeNull();
    expect(mirrorOutcomeBounds!.x).toBeGreaterThanOrEqual(0);
    expect(mirrorOutcomeBounds!.x + mirrorOutcomeBounds!.width).toBeLessThanOrEqual(320.5);
    expect(mirrorOutcomeBounds!.y + mirrorOutcomeBounds!.height).toBeLessThan(mirrorCueBounds!.y);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('scales mirror image height and teaches focus through formulas and missions', async ({ page }) => {
    await mountMirror(page, {
      reflMirrorType: 'concave', reflFocal: 10, reflDo: 30,
      reflObjH: 5, reflScreenCm: 25
    });
    await autoPredict(page);
    const heightRange = page.getByRole('slider', { name: 'Mirror object height', exact: true });
    const heightHandle = page.locator('[data-op-mirror-height-handle="true"]');
    const screenRange = page.getByRole('slider', { name: 'Mirror sampling screen position' });
    const liveFormula = page.locator('[data-op-formula-context]');
    const mission = page.locator('.opticslab-mission');

    await expect(mission).toContainText('Capture a sharp mirror image');
    await expect(mission).toHaveAttribute('data-complete', 'false');
    await heightRange.fill('8');
    await page.waitForFunction(() => (window as any).__mirror()?.objectHeight === 8);
    let gl = await page.evaluate(() => (window as any).__mirror());
    expect(gl.imageHeight).toBeCloseTo(-4, 8);
    await expect(liveFormula).toHaveAttribute('data-op-formula-context', 'mirror-height');
    await expect(liveFormula).toContainText('h_i = m h_o');

    await heightHandle.focus();
    await heightHandle.press('ArrowDown');
    await page.waitForFunction(() => (window as any).__bucket().reflObjH === 7.5);
    await page.waitForFunction(() => Math.abs((window as any).__mirror()?.imageHeight + 3.75) < 1e-8);

    await screenRange.fill('20');
    await expect(liveFormula).toHaveAttribute('data-op-formula-context', 'mirror-screen');
    await expect(liveFormula).toContainText('blur / aperture');
    await page.locator('[data-op-place-mirror-screen-at-image="true"]').click();
    await expect(mission).toHaveAttribute('data-complete', 'true');
    await expect(mission.getByRole('button', { name: 'Next mission' })).toBeVisible();

    await page.evaluate(() => (window as any).__set({ reflDo: 5, reflScreenCm: 20 }));
    await expect(mission).toHaveAttribute('data-complete', 'false');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('separates virtual construction lines, plane symmetry, and the focal limit', async ({ page }) => {
    await mountMirror(page, { reflMirrorType: 'convex', reflFocal: 10, reflDo: 20 });
    await autoPredict(page);
    let gl = await page.evaluate(() => (window as any).__mirror());
    expect(gl.mirrorType).toBe('convex');
    expect(gl.rayCount).toBe(9);
    expect(gl.virtualExtensionCount).toBe(9);
    expect(gl.imageType).toBe('virtual');
    expect(gl.imageSide).toBe('behind');
    expect(gl.imageDistance).toBeCloseTo(-20 / 3, 8);
    expect(gl.physicalRaysStayIncidentSide).toBe(true);
    expect(gl.virtualExtensionsBehindMirror).toBe(true);
    expect(gl.fitHalf.y).toBeGreaterThan(4.5);
    expect(gl.fitHalf.z).toBeGreaterThan(3.2);
    await expect(page.locator('[data-op-mirror-3d-ray-key]')).toContainText('virtual extensions');
    await expect(page.locator('[data-op-mirror-3d-outcome="virtual"]'))
      .toHaveAttribute('data-mirror-type', 'convex');
    expect(await page.evaluate(() => (window as any).__text())).toContain('Dashed pink lines are backward extensions behind the mirror');

    await page.evaluate(() => (window as any).__set({ reflMirrorType: 'plane', reflDo: 25 }));
    await page.waitForFunction(() => (window as any).__mirror()?.mirrorType === 'plane');
    gl = await page.evaluate(() => (window as any).__mirror());
    expect(gl.imageType).toBe('virtual');
    expect(gl.imageDistance).toBe(-25);
    expect(gl.virtualExtensionCount).toBe(9);
    expect(gl.physicalRaysStayIncidentSide).toBe(true);
    await expect(page.locator('[data-op-mirror-3d-host="true"]'))
      .toHaveAttribute('aria-label', /Equal spacing: object 25\.0 cm in front and image 25\.0 cm behind/);

    await page.evaluate(() => (window as any).__set({ reflMirrorType: 'concave', reflFocal: 10, reflDo: 10 }));
    await page.waitForFunction(() => (window as any).__mirror()?.imageType === 'infinity');
    gl = await page.evaluate(() => (window as any).__mirror());
    expect(gl.rayCount).toBe(9);
    expect(gl.virtualExtensionCount).toBe(0);
    expect(gl.imageSide).toBe('at-infinity');
    expect(gl.imageVisible).toBe(false);
    expect(gl.physicalRaysStayIncidentSide).toBe(true);
    await expect(page.locator('[data-op-mirror-3d-outcome="infinity"]')).toContainText('parallel reflected bundle');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('supports camera presets and keyboard orbit, then disposes when hidden', async ({ page }) => {
    await mountMirror(page);
    const host = page.locator('[data-op-mirror-3d-host="true"]');
    await expect(host).toHaveAttribute('aria-roledescription', 'interactive 3D model');
    await expect(host).toHaveAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown + - 0');
    await expect(host).toHaveAttribute('aria-label', /Press zero to reset the camera/);
    await host.press('ArrowRight');
    await page.waitForFunction(() => (window as any).__bucket().reflGlRot?.rotY === 40);
    expect(await page.evaluate(() => (window as any).__bubbledKeys)).not.toContain('ArrowRight');

    await page.getByRole('button', { name: 'Normal' }).click();
    await page.waitForFunction(() => (window as any).__bucket().reflGlCamera === 'normal');
    expect(await page.evaluate(() => (window as any).__bucket().reflGlRot)).toEqual({ rotY: -90, rotX: 0 });
    await host.press('0');
    await page.waitForFunction(() => (window as any).__bucket().reflGlCamera === 'oblique');
    expect(await page.evaluate(() => (window as any).__bucket().reflGlRot)).toEqual({ rotY: 34, rotX: 18 });
    expect(await page.evaluate(() => (window as any).__bubbledKeys)).not.toContain('0');

    await page.evaluate(() => (window as any).__set({ reflShow3D: false }));
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).__mirrorCanvasCount())).toBe(0);
    expect(await page.evaluate(() => (window as any).__mirror().state)).toBe('idle');
  });
});

test.describe('Optics 3D readouts never cover the scene', () => {
  // The readout floated over the top-left of a 460x280 scene and hid what sat
  // there: P1 on the polarizer bench, the object AND the virtual image on the
  // magnifier bench. Measured against the canvas, not the stage, because a
  // readout inside the stage but over the canvas is exactly the old bug.
  const VIEWS = [
    { name: 'polarization', bucket: { mode: 'polarization', polTheta2: 30 },
      canvas: 'canvas[data-optics-gl="true"]', ready: '__gl', hud: '[data-op-polarization-3d-outcome]', min: 260 },
    { name: 'refraction', bucket: { mode: 'refraction', refrShow3D: true, refrN1: 1, refrN2: 1.52, refrTheta1: 30 },
      canvas: 'canvas[data-optics-refraction-gl="true"]', ready: '__refr', hud: '[data-op-refraction-3d-outcome]', min: 280 },
    { name: "Snell's window", bucket: { mode: 'refraction', refrShowWindow: true, refrN1: 1.333, refrN2: 1.0 },
      canvas: 'canvas[data-optics-window-gl="true"]', ready: '__win', hud: '[data-op-snell-window-3d-outcome]', min: 280 },
    { name: 'lens (magnifier)', bucket: { mode: 'lenses', lensShow3D: true, lensType: 'converging', lensFocal: 12, lensDo: 7 },
      canvas: 'canvas[data-optics-lens-gl="true"]', ready: '__lens', hud: '[data-op-lens-3d-screen]', min: 280 },
    { name: 'mirror', bucket: { mode: 'reflection', reflShow3D: true, reflMirrorType: 'concave', reflFocal: 10, reflDo: 30 },
      canvas: 'canvas[data-optics-mirror-gl="true"]', ready: '__mirror', hud: '[data-op-mirror-3d-screen]', min: 280 },
  ];

  for (const v of VIEWS) {
    test(`${v.name}: the readout sits above a full-height viewport`, async ({ page }) => {
      for (const width of [1100, 360]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(`${base}/__harness`);
        await page.waitForFunction(() => !!(window as any).StemLab?._registry?.opticsLab);
        await page.evaluate((b) => (window as any).__mount(b), v.bucket);
        await page.waitForSelector(v.canvas, { timeout: 30000 });
        await page.waitForFunction((fn) => (window as any)[fn]()?.state === 'ready', v.ready, { timeout: 30000 });
        await expect(page.locator(v.hud)).toBeVisible();
        await page.waitForTimeout(300);
        const g = await page.evaluate(([canvasSel, hudSel]) => {
          const box = (el: Element) => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, h: r.height }; };
          return { c: box(document.querySelector(canvasSel)!), h: box(document.querySelector(hudSel)!) };
        }, [v.canvas, v.hud]);
        const overlapX = Math.min(g.c.r, g.h.r) - Math.max(g.c.l, g.h.l);
        const overlapY = Math.min(g.c.b, g.h.b) - Math.max(g.c.t, g.h.t);
        expect(overlapX > 0.5 && overlapY > 0.5, `${width}px: the readout covers the canvas (${overlapX.toFixed(0)}x${overlapY.toFixed(0)} px)`).toBe(false);
        expect(g.h.b, `${width}px: the readout is not above the scene`).toBeLessThanOrEqual(g.c.t + 0.5);
        expect(g.c.h, `${width}px: the viewport lost height to the readout`).toBeGreaterThanOrEqual(v.min - 1);
        expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
        await page.evaluate(() => (window as any).__destroy());
      }
    });
  }
});

test.describe('Optics 3D readouts stay readable in every theme', () => {
  // The readouts and cue chips are dark panels on the dark 3D canvas in every
  // theme, but the light-theme colour translations recoloured their text to
  // slate: about 1.1:1 in the DEFAULT theme, for all five 3D benches. The
  // harness set no theme class, so no test ever looked.
  //
  // The app defines the --allo-stem-* surfaces in app_styles_module.js; the
  // harness does not load it, so every var() fell back to dark. Inject the
  // real per-theme blocks, read from that file, so the stage behind each
  // readout is the one a student's theme actually paints.
  const APP_STYLES = readFileSync(join(ROOT, 'app_styles_module.js'), 'utf8');
  const THEME_VARS = [/:root, \.theme-default \{[^}]*\}/, /@media screen \{ \.theme-dark \{[^}]*\} \}/]
    .map((re) => { const m = APP_STYLES.match(re); if (!m) throw new Error('theme block not found: ' + re); return m[0]; })
    .join(' ');
  const VIEWS = [
    { name: 'polarization', bucket: { mode: 'polarization', polTheta2: 30 }, canvas: 'canvas[data-optics-gl="true"]', ready: '__gl',
      islands: ['[data-op-polarization-3d-outcome]', '[data-op-polarization-3d-cue]'] },
    { name: 'refraction', bucket: { mode: 'refraction', refrShow3D: true, refrN1: 1, refrN2: 1.52, refrTheta1: 30 }, canvas: 'canvas[data-optics-refraction-gl="true"]', ready: '__refr',
      islands: ['[data-op-refraction-3d-outcome]', '[data-op-refraction-3d-cue]'] },
    { name: "Snell's window", bucket: { mode: 'refraction', refrShowWindow: true, refrN1: 1.333, refrN2: 1.0 }, canvas: 'canvas[data-optics-window-gl="true"]', ready: '__win',
      islands: ['[data-op-snell-window-3d-outcome]', '[data-op-snell-window-3d-cue]'] },
    { name: 'lens', bucket: { mode: 'lenses', lensShow3D: true, lensType: 'converging', lensFocal: 12, lensDo: 7 }, canvas: 'canvas[data-optics-lens-gl="true"]', ready: '__lens',
      islands: ['[data-op-lens-3d-screen]', '[data-op-lens-3d-cue]'] },
    { name: 'mirror', bucket: { mode: 'reflection', reflShow3D: true, reflMirrorType: 'convex', reflFocal: 10, reflDo: 30 }, canvas: 'canvas[data-optics-mirror-gl="true"]', ready: '__mirror',
      islands: ['[data-op-mirror-3d-screen]', '[data-op-mirror-3d-cue]'] },
  ];

  for (const v of VIEWS) {
    test(`${v.name}: readout and cue text reach 4.5:1 in the default, light and dark themes`, async ({ page }) => {
      await page.setViewportSize({ width: 1100, height: 1000 });
      await page.goto(`${base}/__harness`);
      await page.waitForFunction(() => !!(window as any).StemLab?._registry?.opticsLab);
      for (const theme of ['theme-default', 'theme-light', 'theme-dark']) {
        await page.evaluate((t) => { document.body.className = t; }, theme);
        await page.addStyleTag({ content: THEME_VARS });
        await page.evaluate((b) => (window as any).__mount(b), v.bucket);
        await page.waitForSelector(v.canvas, { timeout: 30000 });
        await page.waitForFunction((fn) => (window as any)[fn]()?.state === 'ready', v.ready, { timeout: 30000 });
        await autoPredict(page);
        const report = await page.evaluate((sels) => {
          const parse = (c: string) => { const m = c.match(/[\d.]+/g)!.map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
          const over = (top: any, under: any) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
          const lum = (c: any) => { const f = (x: number) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
          const ratio = (a: any, b: any) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
          const canvasInk = { r: 8, g: 17, b: 31, a: 1 };   // the scenes' clear colour
          const out: Array<{ text: string; ratio: number }> = [];
          let checked = 0;
          for (const sel of sels) {
            const island = document.querySelector(sel) as HTMLElement | null;
            if (!island) { out.push({ text: `missing ${sel}`, ratio: 0 }); continue; }
            // A readout band sits on its stage's ground; a cue chip sits on the canvas.
            const stage = island.closest('.opticslab-gl-stage') as HTMLElement | null;
            const stageBg = stage && island.parentElement === stage ? over(parse(getComputedStyle(stage).backgroundColor), { r: 255, g: 255, b: 255, a: 1 }) : canvasInk;
            const bg = over(parse(getComputedStyle(island).backgroundColor), stageBg);
            for (const el of [island, ...Array.from(island.querySelectorAll('*'))] as HTMLElement[]) {
              const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent || '').trim());
              if (!own) continue;
              checked += 1;
              out.push({ text: (el.textContent || '').trim().slice(0, 40), ratio: ratio(over(parse(getComputedStyle(el).color), bg), bg) });
            }
          }
          return { checked, worst: out.sort((a, b) => a.ratio - b.ratio).slice(0, 3) };
        }, v.islands);
        expect(report.checked, `${theme}: no readout text found`).toBeGreaterThanOrEqual(4);
        for (const w of report.worst) {
          expect(w.ratio, `${theme}: "${w.text}" is ${w.ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
        }
        await page.evaluate(() => (window as any).__destroy());
      }
    });
  }
});

test.describe('Optics bench diagrams stay readable in the default and dark themes', () => {
  // Four bench diagrams (mirror, refraction, lens, polarizer) paint the theme's
  // surface, light in the default theme; two (interference, diffraction) paint
  // #000 in every theme. Labels were drawn in dark-canvas tints either way, so
  // on the light ground "screen 20.0 cm" measured 1.00:1 and "convex glass"
  // 1.08:1, while a translation meant for the light ground turned the black
  // benches' amber labels brown (2.96:1). The harness never loaded the app's
  // theme variables, so every diagram rendered dark and none of it showed.
  const APP_STYLES = readFileSync(join(ROOT, 'app_styles_module.js'), 'utf8');
  const THEME_VARS = [/:root, \.theme-default \{[^}]*\}/, /@media screen \{ \.theme-dark \{[^}]*\} \}/]
    .map((re) => { const m = APP_STYLES.match(re); if (!m) throw new Error('theme block not found: ' + re); return m[0]; })
    .join(' ');
  const BENCHES: Array<[string, Record<string, unknown>]> = [
    ['concave mirror', { mode: 'reflection' }], ['convex mirror', { mode: 'reflection', reflMirrorType: 'convex' }],
    ['refraction', { mode: 'refraction' }], ['total internal reflection', { mode: 'refraction', refrN1: 1.52, refrN2: 1, refrTheta1: 60 }],
    ['converging lens', { mode: 'lenses' }], ['diverging lens', { mode: 'lenses', lensType: 'diverging' }],
    ['double slit', { mode: 'interference' }], ['single slit', { mode: 'diffraction' }],
    ['grating', { mode: 'diffraction', diffMode: 'grating', diffLambda: 633, diffGrating: 600, diffScreenL: 1.0 }],
    ['polarizers', { mode: 'polarization', polTheta2: 30 }],
  ];

  for (const theme of ['theme-default', 'theme-dark']) {
    test(`every diagram label reaches 4.5:1 on its ground (${theme})`, async ({ page }) => {
      await page.setViewportSize({ width: 1100, height: 1400 });
      await page.goto(`${base}/__harness`);
      await page.waitForFunction(() => !!(window as any).StemLab?._registry?.opticsLab);
      await page.addStyleTag({ content: THEME_VARS });
      await page.evaluate((t) => { document.body.className = t; }, theme);
      const failures: string[] = [];
      let checked = 0;
      for (const [name, bucket] of BENCHES) {
        await page.evaluate((b) => (window as any).__mount(b), bucket);
        await page.waitForSelector('svg.opticslab-core-svg', { timeout: 30000 });
        await autoPredict(page);
        const result = await page.evaluate(() => {
          const parse = (c: string) => { const m = (c.match(/[\d.]+/g) || ['0', '0', '0', '0']).map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
          const over = (t: any, u: any) => ({ r: t.r * t.a + u.r * (1 - t.a), g: t.g * t.a + u.g * (1 - t.a), b: t.b * t.a + u.b * (1 - t.a), a: 1 });
          const lum = (c: any) => { const f = (x: number) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
          const ratio = (a: any, b: any) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
          const bad: string[] = [];
          let n = 0;
          for (const svg of Array.from(document.querySelectorAll('svg.opticslab-core-svg')) as SVGSVGElement[]) {
            const white = { r: 255, g: 255, b: 255, a: 1 };
            const ground = over(parse(getComputedStyle(svg).backgroundColor), white);
            for (const t of Array.from(svg.querySelectorAll('text')) as SVGTextElement[]) {
              const txt = (t.textContent || '').trim();
              const cs = getComputedStyle(t);
              if (!txt || cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
              n += 1;
              const fill = parse(cs.fill); fill.a *= Number(cs.opacity);
              const r = ratio(over(fill, ground), ground);
              if (r < 4.5) bad.push(`"${txt.slice(0, 30)}" ${r.toFixed(2)}:1 (${cs.fill} on ${getComputedStyle(svg).backgroundColor})`);
            }
          }
          return { n, bad };
        });
        checked += result.n;
        result.bad.forEach((b) => failures.push(`${name}: ${b}`));
        await page.evaluate(() => (window as any).__destroy());
      }
      expect(checked, 'no diagram labels found').toBeGreaterThanOrEqual(60);
      expect(failures, `${theme}: low-contrast diagram labels`).toEqual([]);
    });
  }
});

test('Optics step badges keep their numerals readable on every topic accent', async ({ page }) => {
  // The Predict / Explore / Explain badges drew white 11px numerals on each
  // topic's bright accent: 2.15:1 on amber, 2.43:1 on cyan, 3.95:1 on purple.
  // Colours are theme-independent, so one pass covers every theme.
  await page.setViewportSize({ width: 1100, height: 1000 });
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.opticsLab);
  const low: string[] = [];
  let checked = 0;
  for (const mode of ['reflection', 'refraction', 'lenses', 'interference', 'diffraction', 'polarization']) {
    await page.evaluate((m) => (window as any).__mount({ mode: m }), mode);
    await page.waitForSelector('.opticslab-flow-number', { timeout: 30000 });
    const rows = await page.evaluate(() => {
      const parse = (c: string) => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const lum = (c: number[]) => { const f = (x: number) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
      return Array.from(document.querySelectorAll('.opticslab-flow-number')).map((el) => {
        const cs = getComputedStyle(el);
        const a = lum(parse(cs.color)); const b = lum(parse(cs.backgroundColor));
        return { text: (el.textContent || '').trim(), bg: cs.backgroundColor, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
      });
    });
    for (const r of rows) {
      checked += 1;
      if (r.ratio < 4.5) low.push(`${mode} badge "${r.text}": ${r.ratio.toFixed(2)}:1 on ${r.bg}`);
    }
    await page.evaluate(() => (window as any).__destroy());
  }
  expect(checked, 'no step badges found').toBeGreaterThanOrEqual(18);
  expect(low).toEqual([]);
});

test('Optics eye: Auto-prescribe gives lenses that actually correct the eye', async ({ page }) => {
  // Glasses used 1/d′ = 1/d + P instead of − P, so the prescribed −3.5 D
  // lenses halved a myope's far point instead of sending it to infinity.
  await page.setViewportSize({ width: 1100, height: 1200 });
  for (const [condition, sign] of [['myopia', '−'], ['hyperopia', '+']] as const) {
    await mountUi(page, { mode: 'phenomena', phenoSub: 'eye', phenoEyeCondition: condition, phenoEyeGlasses: false });
    await page.getByRole('button', { name: /Auto-prescribe corrective lens/ }).click();
    const bucket = await page.evaluate(() => (window as any).__bucket());
    expect(bucket.phenoEyeGlasses).toBe(true);
    expect(Math.sign(bucket.phenoEyeGlassesD), `${condition} lens sign`).toBe(sign === '−' ? -1 : 1);
    const svgText = await page.locator('svg').filter({ hasText: 'Far point' }).first().textContent();
    expect(svgText, `${condition}: corrected far point`).toMatch(/Far point: ~∞/);
    const near = Number((svgText!.match(/Near point: ~([0-9]+) cm/) || [])[1]);
    expect(near, `${condition}: corrected near point`).toBeGreaterThan(5);
    expect(near).toBeLessThan(25);
    await page.evaluate(() => (window as any).__destroy());
  }
});

test.describe('Optics reference pages and calculators stay readable in every theme', () => {
  // The calculators, the visual lab and six reference pages were built on
  // translucent navy cards. In the default theme the light translations darkened
  // their text but not the cards: 3,205 of 3,802 text runs in the calculators and
  // visual lab alone measured under 4.5:1. They now render as dark panels there.
  // HTML text only: SVG labels sit on drawn shapes an ancestor walk cannot see.
  const APP_STYLES = readFileSync(join(ROOT, 'app_styles_module.js'), 'utf8');
  const THEME_VARS = [/:root, \.theme-default \{[^}]*\}/, /@media screen \{ \.theme-dark \{[^}]*\} \}/]
    .map((re) => { const m = APP_STYLES.match(re); if (!m) throw new Error('theme block not found: ' + re); return m[0]; })
    .join(' ');
  const SRC_TEXT = readFileSync(join(ROOT, 'stem_lab/stem_tool_optics.js'), 'utf8');
  const VIZ: Record<string, unknown> = { mode: 'viz' };
  [...new Set([...SRC_TEXT.matchAll(/upd[(]"(vizShow[A-Za-z0-9]+)"/g)].map((m) => m[1]))].forEach((k) => { VIZ[k] = true; });
  const PAGES: Array<[string, Record<string, unknown>]> = [
    ...['photon', 'em', 'brewster', 'tir', 'fiber', 'lensmaker', 'grating', 'arcoat', 'doppler', 'telescope', 'dof', 'color', 'eye', 'polartri']
      .map((s): [string, Record<string, unknown>] => ['calculator ' + s, { mode: 'calcs', calcSubTool: s }]),
    ['visual lab, every tool open', VIZ],
    ...['worked', 'reference', 'deep', 'scientists', 'instruments', 'careers', 'history', 'quiz']
      .map((m): [string, Record<string, unknown>] => [m, { mode: m }]),
  ];
  // Known exception: the colour mixer's pure-red preset chip IS the colour it
  // names; neither dark (4.46:1) nor white (4.00:1) ink reaches 4.5 on #ff0000.
  const ALLOWED = new Set(['Red@rgb(255, 0, 0)']);

  for (const theme of ['theme-default', 'theme-dark']) {
    test(`text reaches 4.5:1 on its card (${theme})`, async ({ page }) => {
      test.setTimeout(300_000);
      await page.setViewportSize({ width: 1100, height: 1400 });
      await page.goto(`${base}/__harness`);
      await page.waitForFunction(() => !!(window as any).StemLab?._registry?.opticsLab);
      await page.addStyleTag({ content: THEME_VARS });
      await page.evaluate((t) => {
        document.body.className = t;
        (window as any).__isDark = t === 'theme-dark';
        const bg = t === 'theme-dark' ? '#0f172a' : '#ffffff';
        document.body.style.background = bg; document.documentElement.style.background = bg;
      }, theme);
      const failures: string[] = [];
      let checked = 0;
      for (const [name, bucket] of PAGES) {
        await page.evaluate((b) => (window as any).__mount(b), bucket);
        await page.waitForSelector('[data-opticslab-tool="true"]');
        await page.waitForTimeout(150);
        const rows = await page.evaluate(() => {
          const cols = (s: string) => (s.match(/rgba?[(][^)]*[)]/g) || []).map((c) => { const m = (c.match(/[0-9.]+/g) || []).map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; });
          const parse = (c: string) => cols(c)[0] || { r: 0, g: 0, b: 0, a: 0 };
          const over = (t: any, u: any) => ({ r: t.r * t.a + u.r * (1 - t.a), g: t.g * t.a + u.g * (1 - t.a), b: t.b * t.a + u.b * (1 - t.a), a: 1 });
          const lum = (c: any) => { const f = (x: number) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
          const ratio = (a: any, b: any) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
          const page0 = parse(getComputedStyle(document.body).backgroundColor);
          const groundOf = (el: Element) => {
            const chain: Element[] = [];
            for (let e: Element | null = el; e; e = e.parentElement) chain.unshift(e);
            let g: any = { r: page0.r, g: page0.g, b: page0.b, a: 1 };
            for (const e of chain) {
              const cs = getComputedStyle(e);
              const c = parse(cs.backgroundColor);
              if (c.a > 0) g = over(c, g);
              const stops = cs.backgroundImage && cs.backgroundImage !== 'none' ? cols(cs.backgroundImage) : [];
              if (stops.length) { const avg = stops.reduce((acc, x) => { const o = over(x, g); return { r: acc.r + o.r / stops.length, g: acc.g + o.g / stops.length, b: acc.b + o.b / stops.length }; }, { r: 0, g: 0, b: 0 }); g = { ...avg, a: 1 }; }
            }
            return g;
          };
          const out: Array<{ text: string; ratio: number; fg: string; bg: string }> = [];
          for (const el of Array.from(document.querySelectorAll('[data-opticslab-tool="true"] *')) as Element[]) {
            if (el instanceof SVGElement) continue;
            const own = Array.from(el.childNodes).filter((c) => c.nodeType === 3).map((c) => c.textContent || '').join('').trim();
            if (!own || !/[A-Za-z0-9]/.test(own)) continue;
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') continue;
            const box = el.getBoundingClientRect(); if (box.width === 0 || box.height === 0) continue;
            let op = 1; for (let e: Element | null = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
            const fg = parse(cs.color); fg.a *= op;
            const g = groundOf(el);
            out.push({ text: own.slice(0, 40), ratio: ratio(over(fg, g), g), fg: cs.color, bg: 'rgb(' + [g.r, g.g, g.b].map(Math.round).join(', ') + ')' });
          }
          return out;
        });
        checked += rows.length;
        for (const r of rows) {
          if (r.ratio >= 4.5 || ALLOWED.has(r.text + '@' + r.bg)) continue;
          failures.push(`${name}: "${r.text}" ${r.ratio.toFixed(2)}:1 (${r.fg} on ${r.bg})`);
        }
        await page.evaluate(() => (window as any).__destroy());
      }
      expect(checked, 'text runs found').toBeGreaterThan(4000);
      expect(failures.slice(0, 40), `${theme}: ${failures.length} low-contrast text runs`).toEqual([]);
    });
  }

  test('the topic heading uses the topic ink on the light card', async ({ page }) => {
    await page.goto(`${base}/__harness`);
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.opticsLab);
    await page.addStyleTag({ content: THEME_VARS });
    await page.evaluate(() => { document.body.className = 'theme-default'; document.body.style.background = '#fff'; });
    for (const [mode, ink] of [['reflection', 'rgb(3, 105, 161)'], ['interference', 'rgb(146, 64, 14)'], ['polarization', 'rgb(4, 120, 87)']]) {
      await page.evaluate((m) => (window as any).__mount({ mode: m }), mode);
      await page.waitForSelector('.opticslab-topic-title');
      expect(await page.evaluate(() => getComputedStyle(document.querySelector('.opticslab-topic-title') as Element).color), mode).toBe(ink);
      await page.evaluate(() => (window as any).__destroy());
    }
  });
});

test('a disposed 3D renderer cannot throw into, or fail, the next scene', async ({ page }) => {
  // dispose() calls forceContextLoss(), and Chrome fires 'webglcontextlost' AFTER
  // the scene state is nulled: "Cannot set properties of null (setting
  // 'contextLost')" logged dozens of times per e2e run, and a remount that beat
  // the event had its NEW scene marked failed.
  await mount(page, { mode: 'polarization' });
  for (let i = 0; i < 3; i += 1) {
    await page.evaluate(() => (window as any).__destroy());
    await page.evaluate(() => (window as any).__mount({ mode: 'polarization' }));
    await page.waitForFunction(() => (window as any).__gl()?.state === 'ready', null, { timeout: 30000 });
  }
  await page.waitForTimeout(1500);
  const errors: string[] = await page.evaluate(() => (window as any).__events.errors);
  expect(errors.filter((e) => /contextLost/.test(e))).toEqual([]);
  expect(await page.evaluate(() => (window as any).__gl()?.state)).toBe('ready');
});
