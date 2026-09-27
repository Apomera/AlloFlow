import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
const output = 'reports/raptor-feather-depth-2026-09-27';
const probes = `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);window.featherRenderer=r;r.render=function(scene,camera){window.featherScene=scene;if(window.featherSkipRender)return;return render(scene,camera);};return r;};})();`;

test.describe('Raptor layered feather depth', () => {
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
      (window as any).featherStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
    });
  });
  async function snapshot(page: any) { return page.locator('[data-raptor-canvas]').evaluate((c: any) => c._rhSnapshot()); }
  function frozen(a: any, b: any) {
    for (const key of ['motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'speedMps', 'stamina']) expect(b[key], key).toEqual(a[key]);
  }
  async function comparePixels(page: any, save: boolean) {
    return page.locator('[data-raptor-canvas]').evaluate((canvas: any, save: boolean) => {
      const w = window as any, copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height;
      const ctx = copy.getContext('2d')!; ctx.drawImage(canvas, 0, 0);
      const pixels = ctx.getImageData(0, 0, copy.width, copy.height).data;
      if (save) { w.featherPixels = pixels; return 0; }
      let changed = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const difference = Math.abs(pixels[i] - w.featherPixels[i]) + Math.abs(pixels[i + 1] - w.featherPixels[i + 1]) + Math.abs(pixels[i + 2] - w.featherPixels[i + 2]);
        if (difference > 12) changed++;
      }
      return changed;
    }, save);
  }

  for (const model of [{ species: 'peregrine', quality: 'low' }, { species: 'redTail', quality: 'high' }, { species: 'greatHorned', quality: 'low' }]) {
    test(`renders layered wings and folds them without extra draws: ${model.species}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: 'open', selectedSpecies: model.species,
        flightSession: { speciesId: model.species, missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: model.quality
      } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
      await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
        c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 });
        for (let i = 0; i < 8; i++) (window as any).featherStep(25);
      });
      const structure = await page.evaluate(() => {
        const w = window as any, bird = w.featherScene.getObjectByName('raptor-head-rig').parent;
        w.featherVanes = [-1, 1].map(side => bird.getObjectByName('layered-flight-feathers-' + side));
        const material = w.featherVanes[0].material, tail = bird.getObjectByName('fan-tail-silhouette');
        const primary = bird.getObjectByName('left-primary-0');
        w.featherDisposals = new Set();
        [material.normalMap, material.roughnessMap].forEach(texture => texture.addEventListener('dispose', () => w.featherDisposals.add(texture.uuid)));
        return { meshes: w.featherVanes.map(mesh => ({ vertices: mesh.geometry.attributes.position.count, coverts: mesh.geometry.userData.covertFeatherCount,
          finite: [mesh.geometry.attributes.position, mesh.geometry.attributes.normal, mesh.geometry.attributes.uv, mesh.geometry.morphAttributes.position[0], mesh.geometry.morphAttributes.normal[0]].every(attr => Array.from(attr.array).every(Number.isFinite)),
          morphVertices: mesh.geometry.morphAttributes.position[0].count, version: mesh.geometry.attributes.position.version })),
          normalName: material.normalMap.name, roughName: material.roughnessMap.name, linear: material.normalMap.encoding === w.THREE.LinearEncoding && material.roughnessMap.encoding === w.THREE.LinearEncoding,
          shared: tail.material.normalMap === material.normalMap && tail.material.roughnessMap === material.roughnessMap && (!primary || primary.material.normalMap === material.normalMap),
          repeat: material.normalMap.repeat.toArray(), mapSize: [material.normalMap.image.width, material.normalMap.image.height],
          wingMeshes: bird.getObjectByName('raptor-left-wing').children.length + bird.getObjectByName('raptor-right-wing').children.length };
      });
      expect(structure.normalName).toBe('raptor-vane-relief'); expect(structure.roughName).toBe('raptor-vane-roughness'); expect(structure.linear).toBe(true);
      expect(structure.shared).toBe(true); expect(structure.repeat).toEqual([1, 1]); expect(structure.mapSize).toEqual([256, 512]);
      structure.meshes.forEach(mesh => { expect(mesh.finite).toBe(true); expect(mesh.coverts).toBeGreaterThanOrEqual(28); expect(mesh.vertices).toBeLessThan(1700); expect(mesh.morphVertices).toBe(mesh.vertices); });
      const flying = await snapshot(page);
      expect(structure.wingMeshes).toBe(4 + flying.leftPrimaryFeatherCount + flying.rightPrimaryFeatherCount);
      await page.locator('[data-raptor-study-button]').click();
      await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('wing');
      await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + model.species + '-wing.png' });
      const enhanced = await snapshot(page); frozen(flying, enhanced);
      await comparePixels(page, true);
      // Draw the same frozen camera with just the pre-existing long feathers.
      await page.evaluate(() => (window as any).featherVanes.forEach(mesh => mesh.geometry.setDrawRange(0, mesh.geometry.userData.flightFeatherIndexCount)));
      await page.locator('[data-study-view=above]').click();
      const plain = await snapshot(page); frozen(enhanced, plain);
      expect(plain.drawCalls).toBe(enhanced.drawCalls); expect(await comparePixels(page, false)).toBeGreaterThan(500);
      await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + model.species + '-single-layer-control.png' });
      await page.evaluate(() => (window as any).featherVanes.forEach(mesh => mesh.geometry.setDrawRange(0, Infinity)));
      await page.locator('[data-study-view=above]').click();
      if (model.species === 'peregrine') {
        await comparePixels(page, true);
        await page.evaluate(() => (window as any).featherVanes[0].material.normalScale.set(0, 0));
        await page.locator('[data-study-view=above]').click();
        expect(await comparePixels(page, false)).toBeGreaterThan(40);
        await page.evaluate(() => (window as any).featherVanes[0].material.normalScale.set(0.65, 0.65));
      }
      await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('whole');
      await page.locator('[data-study-view=above]').click();
      await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + model.species + '-flight.png' });
      await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
      const folded = await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
        const w = window as any; c._rhCommand('perchPractice'); w.featherSkipRender = true;
        for (let i = 0; i < 45; i++) w.featherStep(25);
        w.featherSkipRender = false; w.featherStep(25);
        return { state: c._rhSnapshot(), meshes: w.featherVanes.map(mesh => ({ fold: mesh.morphTargetInfluences[0], version: mesh.geometry.attributes.position.version })) };
      });
      expect(folded.state.wingRestSpan).toBeLessThan(0.32); expect(folded.state.wingFold).toBeGreaterThan(0.999);
      folded.meshes.forEach((mesh, i) => { expect(mesh.fold).toBeGreaterThan(0.999); expect(mesh.version).toBe(structure.meshes[i].version); });
      await page.locator('[data-raptor-study-button]').click();
      await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('wing');
      if (model.species === 'greatHorned') {
        await page.addStyleTag({ content: '#wrap{width:390px}' }); await page.setViewportSize({ width: 390, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
        await expect.poll(() => page.locator('.rh-study-panel').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
        await page.locator('[data-study-view=side]').click();
      }
      await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + model.species + '-folded.png' });
      await page.getByRole('button', { name: 'Habitat', exact: true }).click();
      await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + model.species + '-habitat.png' });
      expect(errors).toEqual([]); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
      await page.getByRole('button', { name: 'Restart this flight', exact: true }).click();
      await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((c: any) => !!c._rhSnapshot)).toBe(true);
      expect(await page.evaluate(() => (window as any).featherDisposals.size)).toBe(2);
      expect(errors).toEqual([]);
    });
  }
});
