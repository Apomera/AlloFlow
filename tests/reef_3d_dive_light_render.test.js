import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';

// Lane G1: the dive light, rendered for real (headless Chromium, WebGL). With the
// light on, the red channel of what lies close in the beam rises (more than the
// blue: the colour the depth took comes back), while the far reef is unchanged.
// GL=swiftshader forces software rendering where no GPU is available.
vi.setConfig({ testTimeout: 180000, hookTimeout: 120000 });
// Tests run from the repo root (like every 'stem_lab/...' path in this suite).
const REPO = process.cwd().split(String.fromCharCode(92)).join('/');
const { chromium } = createRequire(import.meta.url)(path.join(REPO, 'node_modules', 'playwright'));
const EXPLORE = process.env.REEF3D_EXPLORE_SOURCE || path.join(REPO, 'stem_lab/reef_3d_explore.js');
const SPECIES = process.env.REEF3D_SPECIES_SOURCE || path.join(REPO, 'stem_lab/reef_3d_species.js');
const ARGS = process.env.GL === 'swiftshader' || process.platform !== 'win32' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'];

let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true, args: ARGS }); });
afterAll(async () => { if (browser) await browser.close(); });

async function measure(quality) {
  const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.setContent('<!doctype html><style>body{margin:0}canvas{display:block;width:640px;height:400px}</style><canvas></canvas>');
    await page.addScriptTag({ path: path.join(REPO, 'vendor/three-r128/three.min.js') });
    await page.addScriptTag({ path: SPECIES });
    await page.addScriptTag({ path: EXPLORE });
    return await page.evaluate(async (quality) => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      let grab = null, renderer = null, scene = null, camera = null;
      const T = Object.assign({}, THREE, { WebGLRenderer: function (o) {
        renderer = new THREE.WebGLRenderer(o);
        const render = renderer.render.bind(renderer);
        // Read the frame back in the same task that drew it.
        renderer.render = (sc, cam) => { scene = sc; camera = cam; render(sc, cam); if (grab) { const gl = renderer.getContext(); const px = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4); gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, px); grab({ px, w: gl.drawingBufferWidth, h: gl.drawingBufferHeight }); grab = null; } };
        return renderer;
      } });
      const site = { seed: 4401, depthM: 8, health: { coralCover: 0.55, bleaching: 0, algae: 0.05 }, restoration: null,
        population: [{ id: 'sea_fan', count: 3 }, { id: 'barrel_sponge', count: 2 }, { id: 'soft_coral', count: 3 }, { id: 'anthias', count: 1 }] };
      const c = Reef3DExplore.mount(document.querySelector('canvas'), { THREE: T, quality, view: 'first', site, reducedMotion: true });
      await wait(600);
      // Swim up to the nearest sea fan, so something red stands a metre or two away.
      let uid = null, best = Infinity;
      for (let k = 1; k < 400; k++) { if (!c.focus('r' + k)) continue; const f = c.getState().focused; if (f.speciesId === 'sea_fan' && f.distanceM < best) { best = f.distanceM; uid = f.uid; } }
      // Wait until the swim has arrived (the distance stops shrinking), not a fixed time:
      // software rendering draws far fewer frames per second, so a fixed wait can fall short.
      c.swimTo(uid);
      let last = Infinity, still = 0;
      for (let t = 0; t < 120000 && still < 6; t += 250) {
        await wait(250);
        const n = (c.getState().nearby || []).filter((e) => e.uid === uid)[0];
        const dNow = n ? n.distanceM : Infinity;
        still = t > 1000 && Math.abs(dNow - last) < 0.05 ? still + 1 : 0;
        last = dNow;
      }
      c.clearFocus(); await wait(300);
      const frame = () => new Promise((res) => { grab = res; });
      let p = frame(); c.setPaused(true); const off = await p;
      p = frame(); c.setLight(true); const on = await p;
      // Classify pixels by the distance from the light to what they show.
      const floor = scene.getObjectByName('reef-explore-floor');
      const u = renderer.properties.get(floor.material).uniforms, torch = u.reefTorchPos.value, axis = u.reefTorchDir.value;
      const targets = [];
      scene.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && o.visible && o.material && o.material.isMeshStandardMaterial && o.name !== 'reef-explore-diver') targets.push(o); });
      const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), near = [], far = [];
      for (let y = 6; y < off.h - 6; y += 16) for (let x = 6; x < off.w - 6; x += 16) {
        ndc.set(x / off.w * 2 - 1, y / off.h * 2 - 1); ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(targets, false)[0]; if (!hit) continue;
        const toHit = hit.point.clone().sub(torch), d = toHit.length(), cos = toHit.normalize().dot(axis);
        if (d < 2.6 && cos > Math.cos(14 * Math.PI / 180)) near.push([x, y]);
        else if (hit.distance > 8) far.push([x, y]);
      }
      // Mean colour of 3x3 blocks (readPixels rows run bottom up, as NDC y does).
      const mean = (img, pts) => { const s = [0, 0, 0]; let n = 0; for (const [x, y] of pts) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const i = ((y + dy) * img.w + x + dx) * 4; s[0] += img.px[i]; s[1] += img.px[i + 1]; s[2] += img.px[i + 2]; n++; } return s.map((v) => v / Math.max(1, n)); };
      const out = { near: near.length, far: far.length, offNear: mean(off, near), onNear: mean(on, near), offFar: mean(off, far), onFar: mean(on, far), state: c.getState().light };
      c.dispose();
      return out;
    }, quality);
  } finally {
    expect(errors, 'no page errors').toEqual([]);
    await page.close();
  }
}

describe('dive light, rendered', () => {
  for (const quality of ['low', 'high']) {
    it(quality + ': close to the diver the red returns, while the far reef stays as it was', async () => {
      const r = await measure(quality);
      if (process.env.G1_LOG) (await import('node:fs')).appendFileSync(process.env.G1_LOG, quality + ' ' + JSON.stringify(r) + String.fromCharCode(10));
      expect(r.state).toBe(true);
      expect(r.near, 'enough lit, close pixels').toBeGreaterThan(20);
      expect(r.far, 'enough far pixels').toBeGreaterThan(20);
      const dNear = r.onNear.map((v, i) => v - r.offNear[i]), dFar = r.onFar.map((v, i) => v - r.offFar[i]);
      expect(dNear[0], 'red near the diver rises: ' + JSON.stringify(r)).toBeGreaterThan(20);
      expect(dNear[0], 'more red than blue comes back').toBeGreaterThan(dNear[2] * 1.3);
      expect(r.onNear[0] / Math.max(1, r.onNear[2]), 'warmer than before').toBeGreaterThan(r.offNear[0] / Math.max(1, r.offNear[2]));
      for (let i = 0; i < 3; i++) expect(Math.abs(dFar[i]), 'the far reef is untouched, channel ' + i + ': ' + JSON.stringify(r)).toBeLessThan(1.5);
    });
  }
});
