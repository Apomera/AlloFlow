import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

/**
 * Night Sky & Astronomy, moon tab — REAL WebGL smoke.
 *
 * The tab drew the Moon's disc AS SEEN FROM EARTH and nothing else, while its
 * own prose claimed three things only the geometry can show: that phases come
 * from the Moon orbiting Earth, that tidal locking keeps one face toward us,
 * and that the far side is "NOT the dark side" and gets just as much sunlight.
 * The tool's own quiz lists "Earth's shadow on the Moon" as the wrong answer
 * for what causes phases — the exact misconception a disc-only view leaves in
 * place, since the student never sees where the shadow actually is.
 *
 * These tests pin the geometry, not the picture: the Moon is half lit at every
 * phase including New, and Earth's shadow misses it unless the line of nodes
 * points at the Sun.
 */

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>astronomy harness</title>
<style>html,body{margin:0;height:100%;background:#0f172a}#wrap{width:900px}</style></head>
<body><div id="wrap"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/vendor/three-r128/three.min.js"></script>
<script src="/stem_lab/stem_lab_module.js"></script>
<script>
  window.__events = { errors: [] };
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });
  window.StemLab.ensureThree = function () { return Promise.resolve(window.THREE); };
  window.StemLab.loadScriptResilient = function () { return new Promise(function () {}); };
</script>
<script src="/stem_lab/stem_tool_astronomy.js"></script>
<script>
  var e = React.createElement;
  window.__mount = function (bucket) {
    var cfg = window.StemLab._registry.astronomy;
    window.__toolData = { astronomy: Object.assign({ tab: 'moon' }, bucket || {}) };
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
      gradeLevel: '8th Grade', toolSnapshots: [], props: {},
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
  window.__gl = function () { return window.__alloAstroMoonGL ? window.__alloAstroMoonGL.debug() : null; };
  window.__set = function (patch) {
    window.__toolData = Object.assign({}, window.__toolData);
    window.__toolData.astronomy = Object.assign({}, window.__toolData.astronomy, patch);
    window.__bump && window.__bump();
  };
  window.__bucket = function () { return window.__toolData.astronomy; };
  window.__canvasCount = function () { return document.querySelectorAll('canvas[data-astro-moon-gl]').length; };
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

const SYNODIC = 29.53059;
const NEW = 0;
const FIRST_Q = SYNODIC / 4;
const FULL = SYNODIC / 2;

async function mount(page: Pg, bucket: Record<string, unknown> = {}) {
  await page.goto(`${base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.astronomy);
  await page.evaluate((b) => (window as any).__mount(b), Object.assign({ tab: 'moon' }, bucket));
  await page.waitForSelector('canvas[data-astro-moon-gl="true"]', { timeout: 30000 });
  await page.waitForFunction(() => (window as any).__gl()?.state === 'ready', null, { timeout: 30000 });
  await page.waitForTimeout(400);
}

type CanvasLightMetrics = {
  leftMean: number;
  rightMean: number;
  outerBrightPixels: number;
  outerPixels: number;
};

async function moonCanvasLightMetrics(page: Pg): Promise<CanvasLightMetrics> {
  return page.evaluate(() => new Promise<CanvasLightMetrics>((resolve, reject) => {
    requestAnimationFrame(() => {
      const source = document.querySelector('canvas[data-astro-moon-gl="true"]') as HTMLCanvasElement | null;
      if (!source) { reject(new Error('Moon WebGL canvas is missing')); return; }
      const probe = document.createElement('canvas');
      probe.width = source.width;
      probe.height = source.height;
      const context = probe.getContext('2d', { willReadFrequently: true });
      if (!context) { reject(new Error('2D canvas context is unavailable')); return; }
      context.drawImage(source, 0, 0);
      const { data, width, height } = context.getImageData(0, 0, probe.width, probe.height);
      const luma = (x: number, y: number) => {
        const i = (y * width + x) * 4;
        return data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
      };
      const mean = (x0: number, x1: number, y0: number, y1: number) => {
        let sum = 0;
        let count = 0;
        for (let y = Math.floor(height * y0); y < Math.floor(height * y1); y += 2) {
          for (let x = Math.floor(width * x0); x < Math.floor(width * x1); x += 2) {
            sum += luma(x, y);
            count++;
          }
        }
        return count ? sum / count : 0;
      };
      let outerBrightPixels = 0;
      let outerPixels = 0;
      for (let y = Math.floor(height * 0.12); y < Math.floor(height * 0.88); y++) {
        for (let x = Math.floor(width * 0.82); x < Math.floor(width * 0.98); x++) {
          outerPixels++;
          if (luma(x, y) > 55) outerBrightPixels++;
        }
      }
      resolve({
        leftMean: mean(0.32, 0.48, 0.23, 0.77),
        rightMean: mean(0.52, 0.68, 0.23, 0.77),
        outerBrightPixels,
        outerPixels,
      });
    });
  }));
}

type Rgba = { r: number; g: number; b: number; a: number };

function parseCssColor(value: string): Rgba {
  const parts = value.match(/[\d.]+/g)?.map(Number) || [];
  if (parts.length < 3) throw new Error('Unsupported CSS color: ' + value);
  return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
}

function relativeLuminance(color: Rgba) {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return channel(color.r) * 0.2126 + channel(color.g) * 0.7152 + channel(color.b) * 0.0722;
}

function contrastOverBrightScene(foreground: string, overlay: string) {
  const fg = parseCssColor(foreground);
  const bg = parseCssColor(overlay);
  // A bright lunar surface is the hardest backdrop for these translucent dark HUDs.
  const composed: Rgba = {
    r: bg.r * bg.a + 255 * (1 - bg.a),
    g: bg.g * bg.a + 255 * (1 - bg.a),
    b: bg.b * bg.a + 255 * (1 - bg.a),
    a: 1,
  };
  const lighter = Math.max(relativeLuminance(fg), relativeLuminance(composed));
  const darker = Math.min(relativeLuminance(fg), relativeLuminance(composed));
  return (lighter + 0.05) / (darker + 0.05);
}

test.describe.configure({ timeout: 180_000 });

test.describe('Astronomy moon geometry — real WebGL', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => { try { (window as any).__destroy(); } catch { /* gone */ } }).catch(() => {});
  });

  test('mounts the Sun-Earth-Moon geometry', async ({ page }) => {
    await mount(page, { moonAgeDays: FIRST_Q });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.state).toBe('ready');
    expect(gl.contextLost).toBe(false);
    expect(gl.nearFaceLocked).toBe(true);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('★ New Moon puts the Moon between Earth and Sun, not in shadow', async ({ page }) => {
    // The misconception the quiz names: students think New Moon is Earth's
    // shadow. It is not — the Moon is on the SUNWARD side, nowhere near it.
    await mount(page, { moonAgeDays: NEW });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.moonPos.x).toBeGreaterThan(6);   // sunward (+X), between us and the Sun
    expect(gl.inShadow).toBe(false);
    // And essentially none of the lit half faces us.
    expect(gl.litFractionSeen).toBeLessThan(0.02);
  });

  test('★ Full Moon is opposite the Sun and still misses the shadow', async ({ page }) => {
    // Why there is not a lunar eclipse every month. With the nodes tilted away
    // the Moon rides clear of the umbra even at Full.
    await mount(page, { moonAgeDays: FULL, moonNodeDeg: 72 });
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.moonPos.x).toBeLessThan(-6);     // anti-sunward
    expect(gl.litFractionSeen).toBeGreaterThan(0.98);
    expect(gl.inShadow).toBe(false);
    expect(Math.abs(gl.moonY)).toBeGreaterThan(0.1);   // genuinely off the ecliptic
  });

  test('★ pointing the nodes at the Sun produces the eclipse', async ({ page }) => {
    await mount(page, { moonAgeDays: FULL, moonNodeDeg: 72 });
    expect(await page.evaluate(() => (window as any).__gl().inShadow)).toBe(false);
    await page.evaluate(() => (window as any).__set({ moonNodeDeg: 0 }));
    await page.waitForTimeout(450);
    const gl = await page.evaluate(() => (window as any).__gl());
    expect(gl.inShadow).toBe(true);
    expect(Math.abs(gl.moonY)).toBeLessThan(0.01);     // on the node, in the ecliptic
    // And the test is against the cone's width WHERE THE MOON IS, not Earth's
    // radius at the near end — the umbra converges.
    expect(gl.shadowMissRadii).toBeLessThan(gl.umbraRadiusAtMoon);
    expect(gl.umbraRadiusAtMoon).toBeGreaterThan(0.2);
    expect(gl.umbraRadiusAtMoon).toBeLessThan(0.5);
    expect(gl.umbraTapersAwayFromEarth).toBe(true);
    expect(gl.umbraBaseX).toBeCloseTo(0, 5);
    expect(gl.umbraTipX).toBeLessThan(-10);
    expect(gl.umbraTipX).toBeLessThan(gl.umbraBaseX);
  });

  test('★ eclipses happen in a SEASON, not only at one exact angle', async ({ page }) => {
    // The node line sweeps slowly; eclipses are possible for a window of
    // alignments, not a single instant. A model that only ever eclipsed at
    // exactly 0 would teach that wrong.
    await mount(page, { moonAgeDays: FULL, moonNodeDeg: 20 });
    expect(await page.evaluate(() => (window as any).__gl().inShadow)).toBe(true);
    await page.evaluate(() => (window as any).__set({ moonNodeDeg: 60 }));
    await page.waitForTimeout(450);
    expect(await page.evaluate(() => (window as any).__gl().inShadow)).toBe(false);
  });

  test('★ the lit fraction follows the geometry, not a lookup table', async ({ page }) => {
    // First Quarter must be half lit as SEEN, by the elongation relation, with
    // no phase painted by hand anywhere.
    await mount(page, { moonAgeDays: FIRST_Q });
    const q = await page.evaluate(() => (window as any).__gl().litFractionSeen);
    expect(q).toBeGreaterThan(0.45);
    expect(q).toBeLessThan(0.55);
  });

  test('First Quarter Telescope view is right-lit, uncluttered, and keeps the dark side subtle', async ({ page }) => {
    await mount(page, {
      moonAgeDays: FIRST_Q,
      moonViewMode: 'telescope',
      moonNorthUp: true,
    });
    await page.waitForFunction(() => {
      const gl = (window as any).__gl();
      return gl?.surfaceTextureReady && gl?.reliefTextureReady;
    }, null, { timeout: 30_000 });
    await page.waitForTimeout(180);

    const gl = await page.evaluate(() => (window as any).__gl());
    const light = await moonCanvasLightMetrics(page);

    expect(gl.mode).toBe('telescope');
    expect(gl.starsVisible).toBe(false);
    expect(gl.ambientIntensity).toBeLessThanOrEqual(0.003);
    expect(gl.earthshineIntensity).toBeLessThanOrEqual(0.026);
    // With north up, a waxing First Quarter Moon is illuminated on the right.
    expect(light.rightMean).toBeGreaterThan(light.leftMean * 2.2);
    expect(light.leftMean).toBeLessThan(light.rightMean * 0.45);
    // The far-right sky is outside the lunar disc: no decorative stars in telescope mode.
    expect(light.outerBrightPixels / light.outerPixels).toBeLessThan(0.0002);
  });

  test('Telescope HUD labels retain readable contrast over the bright lunar surface', async ({ page }) => {
    await mount(page, { moonAgeDays: FIRST_Q, moonViewMode: 'telescope', moonNorthUp: true });
    const styles = await page.evaluate(() => {
      const exact = (text: string) => Array.from(document.querySelectorAll<HTMLElement>('div'))
        .find((el) => el.textContent?.trim() === text);
      const observer = exact('Earth observer');
      const north = exact('N' + String.fromCharCode(0x2191) + 'NASA LRO surface');
      const hint = exact('Scroll to magnify - same physical sunlight');
      if (!observer?.parentElement || !north || !hint) throw new Error('Moon HUD labels are missing');
      return [
        { fg: getComputedStyle(observer).color, bg: getComputedStyle(observer.parentElement).backgroundColor },
        { fg: getComputedStyle(north).color, bg: getComputedStyle(north).backgroundColor },
        { fg: getComputedStyle(hint).color, bg: getComputedStyle(hint).backgroundColor },
      ];
    });

    for (const style of styles) {
      expect(parseCssColor(style.bg).a).toBeGreaterThanOrEqual(0.75);
      expect(contrastOverBrightScene(style.fg, style.bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('the orbit really is inclined, so most months are not eclipse months', async ({ page }) => {
    await mount(page, { moonAgeDays: FULL, moonNodeDeg: 90 });
    const gl = await page.evaluate(() => (window as any).__gl());
    // 7.2 * sin(5.145 deg) = 0.646 Earth radii off the ecliptic at maximum.
    expect(Math.abs(gl.moonY)).toBeGreaterThan(0.6);
    expect(gl.inShadow).toBe(false);
  });

  test('the phase disc survives as the guaranteed floor', async ({ page }) => {
    await mount(page, { moonAgeDays: FIRST_Q });
    expect(await page.evaluate(() => document.querySelectorAll('svg').length)).toBeGreaterThan(0);
  });

  test('the loading overlay actually goes away', async ({ page }) => {
    await mount(page, { moonAgeDays: FIRST_Q });
    expect(await page.evaluate(() => (window as any).__text())).not.toContain('Loading 3D view');
  });

  test('drag orbits the camera', async ({ page }) => {
    await mount(page, { moonAgeDays: FIRST_Q, moonViewMode: 'orbit' });
    const before = await page.evaluate(() => (window as any).__bucket().moonRot);
    await page.evaluate(() => {
      const c = document.querySelector('canvas[data-astro-moon-gl="true"]') as HTMLCanvasElement;
      const host = c.parentElement as HTMLElement;
      const r = host.getBoundingClientRect();
      const mk = (t: string, x: number, y: number) =>
        new PointerEvent(t, { clientX: x, clientY: y, bubbles: true, cancelable: true, pointerId: 1 });
      host.dispatchEvent(mk('pointerdown', r.left + r.width / 2, r.top + r.height / 2));
      host.dispatchEvent(mk('pointermove', r.left + r.width / 2 + 90, r.top + r.height / 2));
      host.dispatchEvent(mk('pointerup', r.left + r.width / 2 + 90, r.top + r.height / 2));
    });
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => (window as any).__bucket().moonRot);
    expect(after.rotY).toBeGreaterThan((before?.rotY ?? 18) + 10);
  });

  test('continuous scrubbing updates phase without remounting or leaking WebGL resources', async ({ page }) => {
    await mount(page, { moonAgeDays: NEW, moonViewMode: 'orbit' });
    await page.waitForFunction(() => {
      const gl = (window as any).__gl();
      return gl?.surfaceTextureReady && gl?.reliefTextureReady;
    }, null, { timeout: 30_000 });

    const baseline = await page.evaluate(() => {
      (window as any).__moonCanvas = document.querySelector('canvas[data-astro-moon-gl="true"]');
      return (window as any).__gl();
    });

    const ages = Array.from({ length: 33 }, (_, i) => (SYNODIC * i) / 32);
    for (const age of ages) {
      await page.evaluate((v) => (window as any).__set({ moonAgeDays: v }), age);
      await page.waitForTimeout(35);
    }
    await page.waitForFunction(
      (age) => Math.abs((window as any).__gl().ageDays - age) < 0.002,
      SYNODIC
    );
    await page.waitForTimeout(160);

    const after = await page.evaluate(() => ({
      gl: (window as any).__gl(),
      sameCanvas: (window as any).__moonCanvas
        === document.querySelector('canvas[data-astro-moon-gl="true"]'),
      canvasCount: (window as any).__canvasCount(),
      errors: (window as any).__events.errors,
    }));
    expect(after.sameCanvas).toBe(true);
    expect(after.canvasCount).toBe(1);
    expect(after.gl.state).toBe('ready');
    expect(after.gl.ageDays).toBeCloseTo(SYNODIC, 3);
    expect(after.gl.litFractionSeen).toBeLessThan(0.02);
    expect(after.gl.modelChildren).toBe(baseline.modelChildren);
    expect(after.gl.rendererMemory.geometries)
      .toBeLessThanOrEqual(baseline.rendererMemory.geometries + 1);
    expect(after.gl.rendererMemory.textures)
      .toBeLessThanOrEqual(baseline.rendererMemory.textures + 1);
    expect(after.errors).toEqual([]);
  });

  test('switches Telescope and Orbit views on one NASA-textured canvas', async ({ page }) => {
    await mount(page, { moonAgeDays: FIRST_Q, moonViewMode: 'orbit' });
    await page.waitForFunction(() => {
      const gl = (window as any).__gl();
      return gl?.surfaceTextureReady && gl?.reliefTextureReady;
    }, null, { timeout: 30_000 });
    await page.evaluate(() => {
      (window as any).__moonCanvas = document.querySelector('canvas[data-astro-moon-gl="true"]');
    });

    const viewGroup = page.getByRole('group', { name: 'Moon visualizer view' });
    await viewGroup.getByRole('button', { name: /Telescope view/ }).click();
    await page.waitForFunction(() => (window as any).__gl()?.mode === 'telescope');
    const telescope = await page.evaluate(() => ({
      gl: (window as any).__gl(),
      bucket: (window as any).__bucket(),
      sameCanvas: (window as any).__moonCanvas
        === document.querySelector('canvas[data-astro-moon-gl="true"]'),
    }));
    expect(telescope.sameCanvas).toBe(true);
    expect(telescope.bucket.moonViewMode).toBe('telescope');
    expect(telescope.gl.earthVisible).toBe(false);
    expect(telescope.gl.surfaceTextureReady).toBe(true);
    expect(telescope.gl.reliefTextureReady).toBe(true);
    await expect(page.getByRole('img', {
      name: /Telescope view of the NASA LRO-textured Moon/,
    })).toBeVisible();

    await viewGroup.getByRole('button', { name: /Orbit view/ }).click();
    await page.waitForFunction(() => (window as any).__gl()?.mode === 'orbit');
    const orbit = await page.evaluate(() => ({
      gl: (window as any).__gl(),
      bucket: (window as any).__bucket(),
      sameCanvas: (window as any).__moonCanvas
        === document.querySelector('canvas[data-astro-moon-gl="true"]'),
    }));
    expect(orbit.sameCanvas).toBe(true);
    expect(orbit.bucket.moonViewMode).toBe('orbit');
    expect(orbit.bucket.moonAgeDays).toBeCloseTo(FIRST_Q, 3);
    expect(orbit.gl.earthVisible).toBe(true);


    expect(await page.evaluate(() => (window as any).__canvasCount())).toBe(1);
  });

  test('overlay and true-scale controls agree with debug state and keep resources bounded', async ({ page }) => {
    await mount(page, {
      moonAgeDays: FIRST_Q,
      moonViewMode: 'orbit',
      moonScaleMode: 'teaching',
    });
    await page.waitForFunction(() => {
      const gl = (window as any).__gl();
      return gl?.surfaceTextureReady && gl?.reliefTextureReady;
    }, null, { timeout: 30_000 });
    const baseline = await page.evaluate(() => (window as any).__gl());

    const overlays = page.getByRole('group', { name: 'Diagram overlays' });
    for (const name of ['Orbit path', 'Sunlight', "Earth's shadow", 'Labels', 'Tidal-lock marker']) {
      await overlays.getByRole('button', { name }).click();
    }
    await page.waitForFunction(() => {
      const o = (window as any).__gl()?.overlays;
      return o && !o.orbit && !o.sunlight && !o.shadow && !o.labels && !o.tidalLock;
    });
    const overlayState = await page.evaluate(() => ({
      gl: (window as any).__gl(),
      bucket: (window as any).__bucket(),
    }));
    expect(overlayState.bucket.moonOverlays).toEqual({
      orbit: false,
      sunlight: false,
      shadow: false,
      labels: false,
      tidalLock: false,
    });
    expect(overlayState.gl.modelChildren).toBe(baseline.modelChildren);

    await page.getByRole('group', { name: 'Moon diagram scale' })
      .getByRole('button', { name: 'True scale' }).click();
    await page.waitForFunction(() => (window as any).__gl()?.scaleMode === 'true');
    await page.waitForTimeout(220);
    const scaled = await page.evaluate(() => ({
      gl: (window as any).__gl(),
      bucket: (window as any).__bucket(),
      canvasCount: (window as any).__canvasCount(),
    }));
    const radius = Math.hypot(
      scaled.gl.moonPos.x,
      scaled.gl.moonPos.y,
      scaled.gl.moonPos.z
    );
    expect(scaled.bucket.moonScaleMode).toBe('true');
    expect(radius).toBeGreaterThan(59);
    expect(radius).toBeLessThan(61);
    expect(scaled.canvasCount).toBe(1);
    expect(scaled.gl.rendererMemory.geometries)
      .toBeLessThanOrEqual(baseline.rendererMemory.geometries + 2);
    expect(scaled.gl.rendererMemory.textures)
      .toBeLessThanOrEqual(baseline.rendererMemory.textures + 1);
  });

  test('tears the renderer down on unmount', async ({ page }) => {
    await mount(page, { moonAgeDays: FIRST_Q });
    await page.evaluate(() => (window as any).__destroy());
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).__gl().state)).toBe('idle');
  });
});
