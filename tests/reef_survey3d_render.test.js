import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Lane F2: renders the survey's 3D view in Chromium (real GPU when present,
// SwiftShader otherwise) and reads its pixels: the water has colour, pale sand
// is not blown out, and each bottom type looks different where the plumb line
// touches it. REEF3D_ENGINE_SOURCE / REEF3D_HABITAT_SOURCE / CORALREEF_SOURCE
// let a mutation check point the suite at scratch copies.
// Tests run from the repo root (like every 'stem_lab/...' path in this suite).
const REPO = process.cwd().split(String.fromCharCode(92)).join('/');
const req = createRequire(import.meta.url);
const { chromium } = req(REPO + '/node_modules/playwright');
const ENGINE = process.env.REEF3D_ENGINE_SOURCE || REPO + '/stem_lab/reef_3d_engine.js';
const HABITAT = process.env.REEF3D_HABITAT_SOURCE || REPO + '/stem_lab/reef_3d_habitat.js';
const TOOL = process.env.CORALREEF_SOURCE || REPO + '/stem_lab/stem_tool_coralreef.js';
const toolWindow = { StemLab: { isRegistered: () => false, registerTool: () => {} }, __RR_TEST_EXPORTS__: {} };
vm.runInNewContext(readFileSync(TOOL, 'utf8'), { window: toolWindow, Math, Object, JSON, Array, Number, String, Date, URL });
const X = toolWindow.__RR_TEST_EXPORTS__.coralReef;
const layoutOf = (id) => { const site = X.SITES.find((s) => s.id === id); return X.buildTransect(site, site.seed); };

let browser, page;
beforeAll(async () => {
  browser = await chromium.launch({ headless: true, args: process.platform === 'win32' ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  page = await browser.newPage({ viewport: { width: 680, height: 400 } });
  await page.setContent('<!doctype html><style>body{margin:0}canvas{display:block;width:640px;height:360px}</style><canvas id="c"></canvas>');
  await page.addScriptTag({ path: REPO + '/vendor/three-r128/three.min.js' });
  await page.addScriptTag({ content: readFileSync(HABITAT, 'utf8') });
  await page.addScriptTag({ content: readFileSync(ENGINE, 'utf8') });
}, 120000);
afterAll(async () => { if (browser) await browser.close(); }, 60000);

// Mounts one transect and returns, for each point, the mean colour in a small
// window where the plumb line touches (highlight hidden) and frame statistics.
async function shoot(layout, quality, points) {
  return page.evaluate(({ layout, quality, points }) => {
    let renderer = null, scene = null, camera = null;
    const T = Object.assign({}, THREE, { WebGLRenderer: function (o) { renderer = new THREE.WebGLRenderer(Object.assign({ preserveDrawingBuffer: true }, o)); const draw = renderer.render.bind(renderer); renderer.render = (s, c) => { scene = s; camera = c; draw(s, c); }; return renderer; } });
    // A fresh canvas per mount: dispose() releases the old one's context for good.
    const old = document.getElementById('c'), canvas = document.createElement('canvas');
    canvas.id = 'c'; old.replaceWith(canvas);
    const ctl = Reef3D.mount(canvas, { THREE: T, layout, seed: layout.seed, quality, reducedMotion: true });
    const gl = renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4), v = new THREE.Vector3(), out = [];
    for (const i of points) {
      ctl.goToPoint(i);
      const hl = scene.getObjectByName('reef-highlight'); hl.updateMatrixWorld(true);
      v.copy(hl.children[0].position); v.y -= 0.012; v.project(camera);
      hl.visible = false; renderer.render(scene, camera); hl.visible = true;
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const cx = Math.round((v.x * 0.5 + 0.5) * w), cy = Math.round((v.y * 0.5 + 0.5) * h), win = [0, 0, 0];
      let n = 0;
      for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) { const k = (y * w + x) * 4; win[0] += px[k]; win[1] += px[k + 1]; win[2] += px[k + 2]; n++; }
      let blown = 0, all = 0; const mean = [0, 0, 0];
      for (let k = 0; k < px.length; k += 4 * 7) { all++; mean[0] += px[k]; mean[1] += px[k + 1]; mean[2] += px[k + 2]; if (px[k] > 240 && px[k + 1] > 240 && px[k + 2] > 240) blown++; }
      out.push({ point: i, category: layout.points[i].category, at: win.map((c) => c / n), frame: mean.map((c) => c / all), blown: blown / all, inside: cx > 8 && cy > 8 && cx < w - 8 && cy < h - 8 });
    }
    ctl.dispose();
    return out;
  }, { layout, quality, points });
}
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('Survey 3D view, rendered', () => {
  // Heatwave transect: every bottom type at once (indices from buildTransect).
  const PICK = { hard_coral: 0, bleached_coral: 2, recently_dead_coral: 24, macroalgae: 21, rock: 12, rubble: 8, sand: 14 };
  for (const quality of ['high', 'low']) {
    it(`shows each bottom type differently at the plumb point, in blue-green water (${quality})`, async () => {
      const shots = await shoot(layoutOf('heatwave'), quality, Object.values(PICK));
      const at = {};
      if (process.env.F2_PRINT) console.log(quality, JSON.stringify(shots.map((s) => [s.category, s.at.map(Math.round), s.frame.map(Math.round), +s.blown.toFixed(4)])));
      shots.forEach((s) => {
        expect(s.inside, `point ${s.point + 1} is in view`).toBe(true);
        at[s.category] = s.at;
        // The water's colour: red is absorbed first, blue and green carry.
        expect(s.frame[2] - s.frame[0], `point ${s.point + 1} frame ${s.frame.map(Math.round)}`).toBeGreaterThan(15);
        expect(s.frame[1] - s.frame[0], `point ${s.point + 1} frame ${s.frame.map(Math.round)}`).toBeGreaterThan(20);
      });
      const cats = Object.keys(PICK);
      for (let a = 0; a < cats.length; a++) for (let b = a + 1; b < cats.length; b++) {
        expect(dist(at[cats[a]], at[cats[b]]), `${cats[a]} ${at[cats[a]].map(Math.round)} vs ${cats[b]} ${at[cats[b]].map(Math.round)}`).toBeGreaterThan(9);
      }
      // Bleached tissue is stark white beside pigmented living coral; a recently dead
      // skeleton carries a brown-olive turf film that bleached tissue does not.
      expect(lum(at.bleached_coral) - lum(at.hard_coral)).toBeGreaterThan(45);
      expect(at.bleached_coral[2] - at.recently_dead_coral[2]).toBeGreaterThan(20);
    }, 120000);
  }

  it('never blows out pale sand, on either tier', async () => {
    for (const quality of ['high', 'low']) for (const [site, point] of [['reserve', 4], ['rubble', 25], ['harbor', 15]]) {
      const [s] = await shoot(layoutOf(site), quality, [point]);
      expect(s.category).toBe('sand');
      expect(lum(s.at), `${site} point ${point + 1} ${quality} sand ${s.at.map(Math.round)}`).toBeLessThan(200);
      expect(Math.max(...s.at), `${site} point ${point + 1} ${quality}`).toBeLessThan(222);
      expect(s.blown, `${site} ${quality} blown-out share`).toBeLessThan(0.01);
    }
  }, 180000);
});
