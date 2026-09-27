import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
const output = 'reports/raptor-face-marks-2026-09-27';
const probes = `window.AlloPostFXEnabled=false;window.faceRenders=0;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);r.render=function(scene,camera){window.faceScene=scene;window.faceCamera=camera;if(window.faceSkipRender)return;window.faceRenders++;return render(scene,camera);};return r;};})();`;

test.describe('Raptor facial field marks', () => {
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
      (window as any).faceStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
    });
  });
  async function snapshot(page: any) { return page.locator('[data-raptor-canvas]').evaluate((c: any) => c._rhSnapshot()); }
  function frozen(a: any, b: any) {
    for (const key of ['motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'speedMps', 'stamina', 'gazeYaw', 'gazePitch']) expect(b[key], key).toEqual(a[key]);
  }
  async function imagePixels(page: any, save: boolean) {
    return page.locator('[data-raptor-canvas]').evaluate((canvas: any, save: boolean) => {
      const w = window as any, copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height;
      const ctx = copy.getContext('2d')!; ctx.drawImage(canvas, 0, 0); const pixels = ctx.getImageData(0, 0, copy.width, copy.height).data;
      if (save) { w.facePixels = pixels; return 0; }
      let changed = 0; for (let i = 0; i < pixels.length; i += 4) if (Math.abs(pixels[i] - w.facePixels[i]) + Math.abs(pixels[i + 1] - w.facePixels[i + 1]) + Math.abs(pixels[i + 2] - w.facePixels[i + 2]) > 15) changed++;
      return changed;
    }, save);
  }
  for (const model of [
    { species: 'peregrine', quality: 'low' }, { species: 'peregrine', quality: 'high' },
    { species: 'osprey', quality: 'low' }, { species: 'osprey', quality: 'high' }
  ]) {
    test(`renders attached field marks at multiple angles: ${model.species} ${model.quality}`, async ({ page }) => {
      const errors: string[] = [], label = model.species + '-' + model.quality;
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: 'open', selectedSpecies: model.species,
        flightSession: { speciesId: model.species, missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: model.quality
      } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
      await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
        c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 });
        for (let i = 0; i < 8; i++) (window as any).faceStep(25);
      });
      const structure = await page.evaluate(() => {
        const w = window as any, rig = w.faceScene.getObjectByName('raptor-head-rig'), head = rig.getObjectByName('raptor-head'), eye = rig.getObjectByName('left-eye');
        w.faceHead = head; w.faceMaterial = head.material;
        return { vertices: head.geometry.attributes.position.count, finite: [head.geometry.attributes.position, head.geometry.attributes.normal, head.geometry.attributes.uv].every(attr => Array.from(attr.array).every(Number.isFinite)),
          kind: head.material.userData.faceMarkingKind, compiled: !!head.material.userData.faceMarkingsCompiled,
          eye: eye.material.color.clone().convertLinearToSRGB().getHex(), eyeVertices: eye.geometry.attributes.position.count,
          surroundVertices: rig.getObjectByName('raptor-eye-surrounds').geometry.attributes.position.count,
          meshCount: rig.children.filter(part => part.isMesh).length, boxes: rig.children.filter(part => part.geometry?.type === 'BoxGeometry').length,
          positionVersion: head.geometry.attributes.position.version, texture: head.material.map.uuid };
      });
      expect(structure.finite).toBe(true); expect(structure.compiled).toBe(true);
      expect(structure.vertices).toBe(model.quality === 'low' ? 165 : 425);
      expect(structure.eyeVertices).toBe(193); expect(structure.surroundVertices).toBe(198);
      expect(structure.kind).toBe(model.species === 'peregrine' ? 'malar-stripe' : 'eye-stripe');
      expect(structure.meshCount).toBe(8); expect(structure.boxes).toBe(0);
      expect(structure.eye).toBe(model.species === 'peregrine' ? 0x38291f : 0xcb9229);
      const flying = await snapshot(page);
      await page.locator('[data-raptor-study-button]').click();
      await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('head');
      await expect(page.locator('.rh-study-panel h4')).toHaveText('Which markings help identify this bird?');
      await expect(page.locator('#rh-study-observation-copy')).toContainText(model.species === 'peregrine' ? 'moustache' : 'white head');
      await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-portrait.png' });
      frozen(flying, await snapshot(page));
      for (const view of ['front', 'side']) {
        await page.locator('[data-study-view=' + view + ']').click();
        await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-' + view + '.png' });
        await imagePixels(page, true);
        await page.evaluate(() => {
          const w = window as any, plain = w.faceMaterial.clone(); plain.onBeforeCompile = () => {}; plain.customProgramCacheKey = () => 'plain-face-control'; w.facePlain = plain; w.faceHead.material = plain;
        });
        await page.locator('[data-study-view=' + view + ']').click();
        expect(await imagePixels(page, false)).toBeGreaterThan(300);
        await page.evaluate(() => { const w = window as any; w.faceHead.material = w.faceMaterial; w.facePlain.dispose(); });
        await page.locator('[data-study-view=' + view + ']').click();
      }
      const renders = await page.evaluate(() => (window as any).faceRenders);
      await page.evaluate(() => (window as any).faceStep(60000));
      expect(await page.evaluate(() => (window as any).faceRenders)).toBe(renders); frozen(flying, await snapshot(page));
      await page.getByRole('button', { name: 'Keep moment', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Moment kept', exact: true })).toBeDisabled();
      const saved = await page.evaluate(() => (window as any).__toolData.raptorHunt.flightStudyMoments[0]);
      expect(saved.view.focus).toBe('head'); expect(saved.view.preset).toBe('side'); expect(saved.image).toMatch(/^data:image\/jpeg;base64,/);
      if (model.species === 'osprey' && model.quality === 'low') {
        await page.addStyleTag({ content: '#wrap{width:390px}' }); await page.setViewportSize({ width: 390, height: 1000 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('head');
        await expect.poll(() => page.locator('.rh-study-panel').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
        await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-phone.png' });
        expect(await page.locator('.rh-study-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      }
      await page.getByRole('button', { name: 'Close study', exact: true }).click();
      const restored = await snapshot(page); expect(restored.cameraPosition).toEqual(flying.cameraPosition);
      restored.cameraQuaternion.forEach((value: number, i: number) => expect(value).toBeCloseTo(flying.cameraQuaternion[i], 12));
      const current = await page.evaluate(() => { const w = window as any; return { version: w.faceHead.geometry.attributes.position.version, texture: w.faceHead.material.map.uuid, material: w.faceHead.material === w.faceMaterial }; });
      expect(current).toEqual({ version: structure.positionVersion, texture: structure.texture, material: true });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await expect.poll(async () => (await snapshot(page)).reducedMotion).toBe(false);
      const tracking = await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
        const w = window as any, T = w.THREE, rig = w.faceScene.getObjectByName('raptor-head-rig'), bird = rig.parent;
        const prey = w.faceScene.children.filter(o => o.children.some(child => child.name.startsWith('prey-')));
        const geometry = w.faceHead.geometry, originalVertices = Array.from(geometry.attributes.position.array), localEye = rig.getObjectByName('left-eye').position.toArray();
        function place(side: number) {
          bird.updateWorldMatrix(true, false);
          const origin = rig.position.clone().applyMatrix4(bird.matrixWorld), offset = new T.Vector3(side * 20, -12, 26).applyQuaternion(bird.quaternion);
          prey.forEach((p, i) => p.position.copy(i === 0 ? origin.clone().add(offset) : origin.clone().add(new T.Vector3(2000 + i * 20, 2000, 2000))));
        }
        c._rhCommand('pause'); c._rhCommand('assist'); w.faceSkipRender = true;
        for (let i = 0; i < 30; i++) { place(1); w.faceStep(25); } const right = c._rhSnapshot();
        place(-1); w.faceStep(25); const firstLeft = c._rhSnapshot();
        for (let i = 0; i < 30; i++) { place(-1); w.faceStep(25); }
        w.faceSkipRender = false; place(-1); w.faceStep(25); const left = c._rhSnapshot();
        return { right, firstLeft, left,
          verticesUnchanged: originalVertices.every((value, i) => value === geometry.attributes.position.array[i]),
          localEyeUnchanged: localEye.every((value, i) => value === rig.getObjectByName('left-eye').position.toArray()[i]),
          sameMaterial: w.faceHead.material === w.faceMaterial, attached: w.faceHead.parent === rig && rig.getObjectByName('left-eye').parent === rig };
      });
      expect(tracking.right.gazeTracking).toBe(true); expect(tracking.right.gazeYaw).toBeGreaterThan(0.3);
      expect(tracking.left.gazeYaw).toBeLessThan(-0.3); expect(Math.abs(tracking.firstLeft.gazeYaw - tracking.right.gazeYaw)).toBeLessThan(0.2);
      expect(tracking.verticesUnchanged).toBe(true); expect(tracking.localEyeUnchanged).toBe(true); expect(tracking.sameMaterial).toBe(true); expect(tracking.attached).toBe(true);
      expect(tracking.left.drawCalls).toBeLessThan(170);
      await page.locator('[data-raptor-study-button]').click();
      await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('head');
      await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-looking-left.png' });
      expect(errors).toEqual([]); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
    });
  }
});
