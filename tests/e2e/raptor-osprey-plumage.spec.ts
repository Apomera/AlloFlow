import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
const output = 'reports/raptor-osprey-plumage-2026-09-27';
const probes = `window.AlloPostFXEnabled=false;window.ospreyRenders=0;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);window.ospreyRenderer=r;r.render=function(scene,camera){window.ospreyScene=scene;window.ospreyCamera=camera;if(window.ospreySkipRender)return;window.ospreyRenders++;return render(scene,camera);};return r;};})();`;

test.describe('Osprey plumage surfaces', () => {
  test.describe.configure({ mode: 'serial', timeout: 240000 });
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 880, height: 680, appStyles: true, probes });
  test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
  test.afterEach(async ({ page }) => harness.destroy(page));
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 1100 });
    await page.addInitScript(() => {
      let time = 1000, id = 0, seed = 731; const frames = new Map<number, FrameRequestCallback>();
      Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      performance.now = () => time;
      window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; }; window.cancelAnimationFrame = key => frames.delete(key);
      (window as any).ospreyStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
    });
  });
  async function snapshot(page: any) { return page.locator('[data-raptor-canvas]').evaluate((c: any) => c._rhSnapshot()); }
  function frozen(a: any, b: any) {
    for (const key of ['motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'speedMps', 'stamina', 'gazeYaw', 'gazePitch']) expect(b[key], key).toEqual(a[key]);
  }
  for (const quality of ['low', 'high']) test(`keeps dorsal and ventral marks attached in flight and rest: ${quality}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: 'open', selectedSpecies: 'osprey',
      flightSession: { speciesId: 'osprey', missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: quality
    } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
      c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 });
      for (let i = 0; i < 8; i++) (window as any).ospreyStep(25);
    });
    const structure = await page.evaluate(() => {
      const w = window as any, bird = w.ospreyScene.getObjectByName('raptor-contour-body').parent, body = bird.getObjectByName('raptor-contour-body');
      w.ospreyBird = bird; w.ospreyWings = ['raptor-left-wing', 'raptor-right-wing'].map(name => bird.getObjectByName(name));
      w.ospreyMeshes = w.ospreyWings.flatMap(group => group.children); w.ospreyOriginalMaterials = w.ospreyMeshes.map(mesh => mesh.material);
      const c = body.geometry.attributes.color, p = body.geometry.attributes.position;
      let top = 0, bottom = 0; for (let i = 0; i < p.count; i++) { if (p.getY(i) > p.getY(top)) top = i; if (p.getY(i) < p.getY(bottom)) bottom = i; }
      return { torso: { top: c.getX(top), bottom: c.getX(bottom), vertices: p.count },
        meshes: w.ospreyMeshes.map(mesh => ({ vertices: mesh.geometry.attributes.position.count,
          finite: [mesh.geometry.attributes.position, mesh.geometry.attributes.normal, mesh.geometry.attributes.rhOspreyWing, mesh.geometry.morphAttributes.position[0], mesh.geometry.morphAttributes.normal[0]].every(attr => Array.from(attr.array).every(Number.isFinite)),
          coords: mesh.geometry.attributes.rhOspreyWing.count, compiled: !!mesh.material.userData.ospreyUnderwingCompiled,
          version: mesh.geometry.attributes.position.version, pigmentVersion: mesh.geometry.attributes.rhOspreyWing.version,
          texture: mesh.material.map.uuid, normal: mesh.material.normalMap?.uuid || '' })) };
    });
    expect(structure.torso.top).toBeLessThan(0.10); expect(structure.torso.bottom).toBeGreaterThan(0.9);
    expect(structure.torso.vertices).toBe(quality === 'low' ? 425 : 925);
    structure.meshes.forEach(mesh => { expect(mesh.finite).toBe(true); expect(mesh.compiled).toBe(true); expect(mesh.coords).toBe(mesh.vertices); });
    const flying = await snapshot(page);
    expect(structure.meshes.length).toBe(4 + flying.leftPrimaryFeatherCount + flying.rightPrimaryFeatherCount);
    await page.locator('[data-raptor-study-button]').click(); await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('wing');
    await expect(page.locator('#rh-study-observation-copy')).toContainText('dark wrist patch'); frozen(flying, await snapshot(page));
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + quality + '-underwing.png' });

    // Compare each actual wing from both sides under identical light. This catches
    // reversed triangle winding as well as hooks that never contribute pixels.
    const faces = await page.evaluate(() => {
      const w = window as any, T = w.THREE, renderer = w.ospreyRenderer, appScene = w.ospreyScene, appCamera = w.ospreyCamera;
      const gl = renderer.getContext(), width = renderer.domElement.width, height = renderer.domElement.height;
      const pixels = () => { const data = new Uint8Array(width * height * 4); gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data); return data; };
      const changed = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 15) n++; return n; };
      const results = [];
      for (const wing of w.ospreyWings) {
        const copy = wing.clone(true); copy.position.set(0, 0, 0); copy.quaternion.identity(); copy.scale.setScalar(1);
        copy.children.forEach(mesh => { mesh.morphTargetInfluences[0] = 0; mesh.castShadow = false; mesh.receiveShadow = false; });
        const scene = new T.Scene(); scene.background = new T.Color(0x102630); scene.add(new T.AmbientLight(0xffffff, 1)); scene.add(copy);
        const box = new T.Box3().setFromObject(copy), center = box.getCenter(new T.Vector3()), span = box.max.x - box.min.x;
        const camera = new T.OrthographicCamera(-span * .6, span * .6, span * .6 * height / width, -span * .6 * height / width, .01, 20);
        const originals = copy.children.map(mesh => mesh.material), controls = originals.map(material => { const plain = material.clone(); plain.onBeforeCompile = () => {}; plain.customProgramCacheKey = () => 'osprey-plain-control'; return plain; });
        const result = { name: wing.name, above: 0, below: 0, sameDraws: true };
        for (const side of [1, -1]) {
          camera.position.set(center.x, side * 5, center.z); camera.up.set(0, 0, -1); camera.lookAt(center); camera.updateMatrixWorld(true);
          copy.children.forEach((mesh, i) => mesh.material = originals[i]); renderer.render(scene, camera); const enhanced = pixels(), draws = renderer.info.render.calls;
          copy.children.forEach((mesh, i) => mesh.material = controls[i]); renderer.render(scene, camera); result[side > 0 ? 'above' : 'below'] = changed(enhanced, pixels());
          result.sameDraws = result.sameDraws && renderer.info.render.calls === draws;
        }
        controls.forEach(material => material.dispose()); results.push(result);
      }
      w.ospreyScene = appScene; w.ospreyCamera = appCamera;
      document.querySelector('.rh-study-inspect select').dispatchEvent(new Event('change', { bubbles: true }));
      return results;
    });
    faces.forEach(face => { expect(face.below, face.name).toBeGreaterThan(15000); expect(face.above, face.name).toBeLessThan(30); expect(face.sameDraws).toBe(true); });
    writeFileSync(output + '/' + quality + '-surface-checks.json', JSON.stringify({ structure, faces }, null, 2));
    await page.evaluate(() => {
      const w = window as any; w.ospreyControls = w.ospreyOriginalMaterials.map(material => { const plain = material.clone(); plain.onBeforeCompile = () => {}; plain.customProgramCacheKey = () => 'osprey-study-control'; return plain; });
      w.ospreyMeshes.forEach((mesh, i) => mesh.material = w.ospreyControls[i]);
    });
    await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('wing');
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + quality + '-underwing-control.png' });
    await page.evaluate(() => { const w = window as any; w.ospreyMeshes.forEach((mesh, i) => mesh.material = w.ospreyOriginalMaterials[i]); w.ospreyControls.forEach(material => material.dispose()); });
    await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('wing');
    await page.getByRole('button', { name: 'Keep moment', exact: true }).click();
    const saved = await page.evaluate(() => (window as any).__toolData.raptorHunt.flightStudyMoments[0]);
    expect(saved.view.focus).toBe('wing'); expect(saved.view.elevation).toBeLessThan(-0.5); expect(saved.image).toMatch(/^data:image\/jpeg;base64,/);
    await page.locator('[data-study-view=above]').click(); await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + quality + '-upperwing.png' });
    await page.getByRole('button', { name: 'Match saved view', exact: true }).click();
    await expect(page.locator('.rh-study-match')).toHaveAttribute('data-matched', 'true'); frozen(flying, await snapshot(page));
    const renders = await page.evaluate(() => (window as any).ospreyRenders); await page.evaluate(() => (window as any).ospreyStep(60000));
    expect(await page.evaluate(() => (window as any).ospreyRenders)).toBe(renders); frozen(flying, await snapshot(page));
    await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('body'); await expect(page.locator('#rh-study-observation-copy')).toContainText('brown back');
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + quality + '-breast.png' });
    await page.locator('[data-study-view=above]').click(); await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + quality + '-back.png' });
    if (quality === 'low') {
      await page.addStyleTag({ content: '#wrap{width:390px}' }); await page.setViewportSize({ width: 390, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('wing');
      await expect.poll(() => page.locator('.rh-study-panel').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
      await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/phone.png' });
      expect(await page.locator('.rh-study-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
      expect(await page.evaluate(async () => (await (window as any).axe.run({ include: ['.rh-study-header', '.rh-study-panel'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => v.id))).toEqual([]);
    }
    await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
    const restored = await snapshot(page); expect(restored.cameraPosition).toEqual(flying.cameraPosition);
    restored.cameraQuaternion.forEach((value: number, i: number) => expect(value).toBeCloseTo(flying.cameraQuaternion[i], 12));
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
      const w = window as any; w.ospreySkipRender = true; c._rhCommand('assist'); c._rhCommand('hold', { key: 'q', pressed: true });
      for (let i = 0; i < 400 && !c._rhSnapshot().landed; i++) w.ospreyStep(50); c._rhCommand('hold', { key: 'q', pressed: false });
      for (let i = 0; i < 45; i++) w.ospreyStep(25); w.ospreySkipRender = false; w.ospreyStep(25);
    });
    const resting = await snapshot(page); expect(resting.landed).toBe(true); expect(resting.wingFold).toBeGreaterThan(.999);
    await page.locator('[data-raptor-study-button]').click(); await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('wing');
    await expect(page.locator('#rh-study-observation-copy')).toContainText('folded wing');
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + quality + '-folded.png' }); frozen(resting, await snapshot(page));
    await page.getByRole('button', { name: 'Habitat', exact: true }).click(); await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + quality + '-habitat.png' });
    await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
      const w = window as any; w.ospreySkipRender = true; c._rhCommand('hold', { key: ' ', pressed: true });
      for (let i = 0; i < 35; i++) w.ospreyStep(25); c._rhCommand('hold', { key: ' ', pressed: false }); w.ospreySkipRender = false; w.ospreyStep(25);
    });
    const takeoff = await snapshot(page); expect(takeoff.landed).toBe(false); expect(takeoff.wingFold).toBeLessThan(.01);
    const after = await page.evaluate(() => (window as any).ospreyMeshes.map(mesh => ({ version: mesh.geometry.attributes.position.version, pigmentVersion: mesh.geometry.attributes.rhOspreyWing.version, texture: mesh.material.map.uuid, normal: mesh.material.normalMap?.uuid || '' })));
    after.forEach((mesh, i) => { for (const key of ['version', 'pigmentVersion', 'texture', 'normal']) expect(mesh[key]).toBe(structure.meshes[i][key]); });
    expect(errors).toEqual([]); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
    await page.evaluate(() => { const w = window as any; w.ospreyDisposed = 0; w.ospreyMeshes.forEach(mesh => mesh.geometry.addEventListener('dispose', () => w.ospreyDisposed++)); });
    await harness.destroy(page); expect(await page.evaluate(() => (window as any).ospreyDisposed)).toBe(structure.meshes.length);
  });
});
