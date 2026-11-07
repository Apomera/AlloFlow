import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Lane hb13: rendered in Chromium (as tests/reef_survey3d_render.test.js does).
// A recently dead colony carries a thin turf film: beside the tape, on the
// point's own colony, it reads warmer and duller than bleached tissue, which is
// clean white over its skeleton. The habitat and engine copies sit beside the
// tool copy (stem_lab/ at install); REEF3D_*_SOURCE override them.
const REPO = process.cwd().split(String.fromCharCode(92)).join('/');
const req = createRequire(import.meta.url);
const { chromium } = req(REPO + '/node_modules/playwright');
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const DIR = path.dirname(TOOL).split(String.fromCharCode(92)).join('/');
const HABITAT = process.env.REEF3D_HABITAT_SOURCE || DIR + '/reef_3d_habitat.js';
const ENGINE = process.env.REEF3D_ENGINE_SOURCE || DIR + '/reef_3d_engine.js';
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

// Mean colour of a small window on the point's own colony, 7 cm off the tape
// toward the diver (the tape itself covers the plumb spot), highlight hidden.
async function shoot(layout, points) {
  return page.evaluate(({ layout, points }) => {
    let renderer = null, scene = null, camera = null;
    const T = Object.assign({}, THREE, { WebGLRenderer: function (o) { renderer = new THREE.WebGLRenderer(Object.assign({ preserveDrawingBuffer: true }, o)); const draw = renderer.render.bind(renderer); renderer.render = (s, c) => { scene = s; camera = c; draw(s, c); }; return renderer; } });
    const old = document.getElementById('c'), canvas = document.createElement('canvas');
    canvas.id = 'c'; old.replaceWith(canvas);
    const ctl = Reef3D.mount(canvas, { THREE: T, layout, seed: layout.seed, quality: 'high', reducedMotion: true });
    const gl = renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4), v = new THREE.Vector3(), out = [];
    for (const i of points) {
      ctl.goToPoint(i);
      const hl = scene.getObjectByName('reef-highlight'); hl.updateMatrixWorld(true);
      v.copy(hl.children[0].position); v.y -= 0.012; v.z += 0.07; v.project(camera);
      hl.visible = false; renderer.render(scene, camera); hl.visible = true;
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const cx = Math.round((v.x * 0.5 + 0.5) * w), cy = Math.round((v.y * 0.5 + 0.5) * h), win = [0, 0, 0];
      let n = 0;
      for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) { const k = (y * w + x) * 4; win[0] += px[k]; win[1] += px[k + 1]; win[2] += px[k + 2]; n++; }
      out.push({ point: i, category: layout.points[i].category, at: win.map((c) => c / n) });
    }
    ctl.dispose();
    return out;
  }, { layout, points });
}
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const mean = (list, f) => list.reduce((s, x) => s + f(x), 0) / list.length;

describe('hb13 survey 3D, rendered: dead coral wears a turf film', () => {
  it('shows recently dead colonies duller and warmer than bleached tissue, beside the tape', async () => {
    // Solid colonies only (plates, a massive colony, an encrusting sheet), so the window lies on the colony.
    const bleached = await shoot(layoutOf('heatwave'), [20, 22]);
    const dead = (await shoot(layoutOf('heatwave'), [39])).concat(await shoot(layoutOf('harbor'), [36, 37]), await shoot(layoutOf('rubble'), [18]));
    bleached.forEach((s) => expect(s.category).toBe('bleached_coral'));
    dead.forEach((s) => expect(s.category).toBe('recently_dead_coral'));
    const cool = (s) => s.at[2] - s.at[0], text = JSON.stringify({ bleached: bleached.map((s) => s.at.map(Math.round)), dead: dead.map((s) => s.at.map(Math.round)) });
    if (process.env.HB13_PRINT) writeFileSync(process.env.HB13_PRINT, text);
    // Bleached tissue stays bright white, bluer under water; the film pulls dead skeleton toward olive.
    expect(mean(dead, cool), text).toBeLessThan(mean(bleached, cool) - 26);
    expect(mean(dead, (s) => lum(s.at)), text).toBeLessThan(0.7 * mean(bleached, (s) => lum(s.at)));
    dead.forEach((s) => expect(lum(s.at), text).toBeLessThan(Math.min(...bleached.map((b) => lum(b.at)))));
  }, 180000);
});
