import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
const output = 'reports/raptor-talons-2026-09-27';
const probes = `window.AlloPostFXEnabled=false;window.talonRenders=0;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);r.render=function(scene,camera){window.talonScene=scene;window.talonCamera=camera;window.talonRenderer=r;if(window.talonSkipRender)return;window.talonRenders++;return render(scene,camera);};return r;};})();`;

test.describe('Raptor curved toes and talons', () => {
  test.describe.configure({ mode: 'serial', timeout: 240000 });
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 880, height: 680, appStyles: true, probes });
  test.beforeAll(async () => harness.start());
  test.afterAll(async () => harness.stop());
  test.afterEach(async ({ page }) => harness.destroy(page));
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 1100 });
    await page.addInitScript(() => {
      let time = 1000, id = 0, seed = 731;
      const frames = new Map<number, FrameRequestCallback>();
      Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      performance.now = () => time;
      window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
      window.cancelAnimationFrame = key => frames.delete(key);
      (window as any).talonStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
    });
  });
  async function snapshot(page: any) { return page.locator('[data-raptor-canvas]').evaluate((c: any) => c._rhSnapshot()); }
  function frozen(a: any, b: any) {
    for (const key of ['motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'speedMps', 'stamina', 'footExtension']) expect(b[key], key).toEqual(a[key]);
  }
  async function studyFeet(page: any) {
    await page.locator('[data-raptor-study-button]').click();
    await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('feet');
  }
  for (const model of [
    { species: 'peregrine', quality: 'low', forward: 3, prompt: 'rear toe, called the hallux' },
    { species: 'osprey', quality: 'high', forward: 2, prompt: 'outer toe can reverse' },
    { species: 'greatHorned', quality: 'low', forward: 2, prompt: 'outer toe can move' }
  ]) {
    test(`preserves curved, mirrored feet through perching and takeoff: ${model.species}`, async ({ page }) => {
      const errors: string[] = [], label = model.species + '-' + model.quality;
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: 'open', selectedSpecies: model.species,
        flightSession: { speciesId: model.species, missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: model.quality
      } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
      await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
        c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 });
        for (let i = 0; i < 8; i++) (window as any).talonStep(25);
      });
      const geometry = await page.evaluate(() => {
        const w = window as any, root = w.talonScene.getObjectByName('raptor-feet');
        const left = root.getObjectByName('left-raptor-foot'), right = root.getObjectByName('right-raptor-foot');
        let mirrorError = 0, minNormal = 1;
        for (const [p, q] of [[left.geometry.attributes.position, right.geometry.attributes.position], [left.geometry.morphAttributes.position[0], right.geometry.morphAttributes.position[0]], [left.geometry.attributes.normal, right.geometry.attributes.normal], [left.geometry.morphAttributes.normal[0], right.geometry.morphAttributes.normal[0]]]) {
          for (let i = 0; i < p.count; i++) mirrorError = Math.max(mirrorError, Math.abs(p.getX(i) + q.getX(i)), Math.abs(p.getY(i) - q.getY(i)), Math.abs(p.getZ(i) - q.getZ(i)));
        }
        for (const p of [right.geometry.attributes.normal, right.geometry.morphAttributes.normal[0]]) for (let i = 0; i < p.count; i++) minNormal = Math.min(minNormal, Math.hypot(p.getX(i), p.getY(i), p.getZ(i)));
        const surface = right.geometry.attributes.rhFootSurface;
        const vertices = right.geometry.attributes.position.count, sections = vertices === 738 ? 8 : 12, rings = vertices === 738 ? 10 : 13, stride = sections * rings + 2;
        const p = right.geometry.morphAttributes.position[0], centers: any[] = [], tipEnds: any[] = [];
        for (let part = 0; part < 9; part++) {
          const path: any[] = [];
          for (let ring = 0; ring < rings; ring++) {
            const center = new w.THREE.Vector3();
            for (let j = 0; j < sections; j++) center.add(new w.THREE.Vector3().fromBufferAttribute(p, part * stride + ring * sections + j));
            center.divideScalar(sections); path.push(center);
          }
          if (part > 0 && part % 2 === 0) { centers.push(path); tipEnds.push(path[path.length - 1].toArray()); }
        }
        let maxBend = 0;
        centers.forEach(path => { for (let i = 1; i < path.length - 1; i++) maxBend = Math.max(maxBend, path[i].clone().sub(path[i - 1]).angleTo(path[i + 1].clone().sub(path[i]))); });
        return { vertices, mirrorError, minNormal, maxBend, tipEnds,
          forward: tipEnds.filter(p => p[2] > 0.12).length, rear: tipEnds.filter(p => p[2] < 0.12).length,
          finite: [left, right].every(mesh => [mesh.geometry.attributes.position, mesh.geometry.attributes.normal, mesh.geometry.attributes.rhFootSurface, mesh.geometry.morphAttributes.position[0], mesh.geometry.morphAttributes.normal[0]].every(attr => Array.from(attr.array).every(Number.isFinite))),
          meshCount: root.children.length, sharedMaterial: left.material === right.material, compiled: !!right.material.userData.footDetailCompiled,
          surfaceKinds: [...new Set(Array.from({ length: surface.count }, (_, i) => surface.getZ(i)))],
          versions: [right.geometry.attributes.position.version, right.geometry.morphAttributes.position[0].version] };
      });
      expect(geometry.vertices).toBe(model.quality === 'low' ? 738 : 1422);
      expect(geometry.finite).toBe(true); expect(geometry.minNormal).toBeGreaterThan(0.999);
      expect(geometry.mirrorError).toBeLessThan(0.000001); expect(geometry.maxBend).toBeLessThan(0.7);
      expect(geometry.forward).toBe(model.forward); expect(geometry.rear).toBe(4 - model.forward);
      expect(geometry.meshCount).toBe(2); expect(geometry.sharedMaterial).toBe(true); expect(geometry.compiled).toBe(true);
      expect(geometry.surfaceKinds.sort()).toEqual(model.species === 'greatHorned' ? [-1, 2] : [0, 1, 2]);
      const flying = await snapshot(page); expect(flying.footExtension).toBeLessThan(0.01);
      await studyFeet(page); await expect(page.locator('#rh-study-observation-copy')).toContainText(model.prompt);
      await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-tucked.png' });
      frozen(flying, await snapshot(page));
      const renders = await page.evaluate(() => (window as any).talonRenders);
      await page.evaluate(() => (window as any).talonStep(60000));
      expect(await page.evaluate(() => (window as any).talonRenders)).toBe(renders);
      await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
      await page.locator('[data-raptor-canvas]').evaluate((c: any, species: string) => {
        const w = window as any; w.talonSkipRender = true;
        // Ospreys have no lookout practice profile. Use the real assisted landing
        // controls instead of assuming that every species exposes the same lesson.
        if (species === 'osprey') {
          c._rhCommand('assist'); c._rhCommand('hold', { key: 'q', pressed: true });
          for (let i = 0; i < 400 && !c._rhSnapshot().landed; i++) w.talonStep(50);
          c._rhCommand('hold', { key: 'q', pressed: false });
        } else c._rhCommand('perchPractice');
        for (let i = 0; i < 45; i++) w.talonStep(25); w.talonSkipRender = false; w.talonStep(25);
      }, model.species);
      const resting = await snapshot(page);
      expect(resting.landed).toBe(true); expect(resting.footExtension).toBeGreaterThan(0.999);
      expect(resting.footSurfaceClearance).toBeGreaterThanOrEqual(0); expect(resting.footSurfaceClearance).toBeLessThan(0.012);
      await studyFeet(page); await expect(page.locator('#rh-study-observation-copy')).toContainText(model.prompt);
      await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-extended.png' });
      frozen(resting, await snapshot(page));
      // A same-camera render with the original plain foot material must visibly
      // differ from the new surface: this catches shader hooks that never render.
      const pixels = await page.evaluate(() => {
        const w = window as any, renderer = w.talonRenderer, scene = w.talonScene, camera = w.talonCamera, feet = scene.getObjectByName('raptor-feet').children;
        const T = w.THREE, preview = new T.Scene(); preview.background = new T.Color(0x102630);
        preview.add(new T.HemisphereLight(0xdceeff, 0x4b4936, 1.1)); const key = new T.DirectionalLight(0xffe7bb, 1.6); key.position.set(1, 3, 3); preview.add(key);
        const copy = feet[1].clone(); copy.position.set(0, 0, 0); copy.scale.setScalar(1); copy.quaternion.identity(); preview.add(copy);
        const focus = new T.PerspectiveCamera(30, renderer.domElement.width / renderer.domElement.height, 0.01, 10);
        focus.position.set(0.38, 0.06, 0.60); focus.lookAt(0, -0.27, 0.15);
        const gl = renderer.getContext(), width = renderer.domElement.width, height = renderer.domElement.height;
        const a = new Uint8Array(width * height * 4), b = new Uint8Array(a.length);
        renderer.render(preview, focus); gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, a);
        const original = copy.material, plain = original.clone(); plain.onBeforeCompile = () => {}; plain.customProgramCacheKey = () => 'plain-foot-comparison'; copy.material = plain;
        renderer.render(preview, focus); gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, b); plain.dispose();
        let changed = 0; for (let i = 0; i < a.length; i += 4) if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > 2) changed++;
        // Return to the app's paused rendering path to restore the studio exactly.
        document.querySelector('.rh-study-inspect select').dispatchEvent(new Event('change', { bubbles: true }));
        return { changed, total: width * height };
      });
      expect(pixels.changed).toBeGreaterThan(pixels.total * 0.0002);
      if (model.species === 'greatHorned') {
        await page.addStyleTag({ content: '#wrap{width:390px}' }); await page.setViewportSize({ width: 390, height: 1000 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await expect.poll(() => page.locator('.rh-study-panel').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
        await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-phone.png' });
        expect(await page.locator('.rh-study-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      }
      await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
      const takeoff = await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
        const w = window as any; c._rhCommand('hold', { key: ' ', pressed: true }); w.talonSkipRender = true;
        for (let i = 0; i < 35; i++) w.talonStep(25); c._rhCommand('hold', { key: ' ', pressed: false }); w.talonSkipRender = false; w.talonStep(25);
        const foot = w.talonScene.getObjectByName('right-raptor-foot');
        return { state: c._rhSnapshot(), versions: [foot.geometry.attributes.position.version, foot.geometry.morphAttributes.position[0].version], vertices: foot.geometry.attributes.position.count };
      });
      expect(takeoff.state.landed).toBe(false); expect(takeoff.state.footExtension).toBeLessThan(0.003);
      expect(takeoff.versions).toEqual(geometry.versions); expect(takeoff.vertices).toBe(geometry.vertices);
      expect(takeoff.state.drawCalls).toBeLessThan(170); expect(errors).toEqual([]);
      expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
    });
  }
});
