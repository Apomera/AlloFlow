import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0 });
test.use({ video: 'off', trace: 'off', actionTimeout: 60_000 });
const report = 'reports/dinolab-beak-grain', phase = process.env.DINO_BEAK_GRAIN_PHASE || 'after';
const harness = new GlHarness({ toolFile: process.env.DINO_BEAK_GRAIN_SOURCE || 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1180, height: 960, layout: 'document', appStyles: true,
  probes: 'var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),draw=r.render.bind(r);r.render=function(s,c){window.__beakScene=s;window.__beakCamera=c;window.__beakRenderer=r;return draw(s,c);};return r;};' });
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
const canvas = (page: Page) => page.locator('canvas.dinolab-3d-canvas');
async function settle(page: Page) { await canvas(page).scrollIntoViewIfNeeded(); await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => r()))))); }
async function photo(page: Page, name: string) { await settle(page); await canvas(page).screenshot({ path: report + '/' + phase + '-' + name + '.png' }); }
async function mount(page: Page, species: string) {
  await page.setViewportSize({ width: 1180, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', selected: species, field3dSelected: species, field3dStage: 'studio', field3dReconstructionMode: 'evidence',
    field3dAutoRotate: false, field3dOrientationDismissed: true, field3dWorkflowStarted: false, field3dShowSkeleton: false, field3dLabelMode: 'off',
    field3dShowBody: true, field3dShowHuman: false, field3dShowEvidence: false, field3dBodyOpacity: 100 } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  await page.addStyleTag({ content: css.slice(start, css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start))) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__beakScene?.getObjectByName('dinolab-specimen')), { timeout: 120_000 }).toBe(true);
  await page.getByRole('button', { name: 'Study head details', exact: true }).click(); await settle(page);
}
async function audit(page: Page) {
  return page.evaluate(() => {
    const w = window as any, renderer = w.__beakRenderer, camera = w.__beakCamera, model = w.__beakScene.getObjectByName('dinolab-specimen');
    function hash(array: ArrayBufferView) { const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength); let h = 2166136261; for (const b of bytes) h = Math.imul(h ^ b, 16777619); return h >>> 0; }
    const meshes: any[] = [], beaks: any[] = [], materials = new Map();
    model.traverse((mesh: any) => {
      if (!mesh.isMesh) return;
      meshes.push({ mesh: mesh.uuid, geometry: mesh.geometry.uuid, attrs: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([key, attr]: [string, any]) => [key, hash(attr.array)])),
        index: mesh.geometry.index ? hash(mesh.geometry.index.array) : null, position: mesh.position.toArray(), quaternion: mesh.quaternion.toArray(), scale: mesh.scale.toArray(), visible: mesh.visible });
      for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.set(mat.uuid, { uuid: mat.uuid, colour: mat.color?.toArray(), opacity: mat.opacity,
        transparent: mat.transparent, depthWrite: mat.depthWrite, roughness: mat.roughness, map: mat.map?.uuid, key: mat.customProgramCacheKey() });
      if (mesh.userData.dinoFeature === 'keratin-beak' && mesh.geometry.userData.dinoBeakGrain?.plainBeak) beaks.push({ mesh: mesh.uuid, geometry: mesh.geometry.uuid,
        coordinates: hash(mesh.geometry.attributes.dinoKeratin.array), material: mesh.material.uuid, key: mesh.material.customProgramCacheKey(), colour: mesh.material.color.toArray(),
        opacity: mesh.material.opacity, transparent: mesh.material.transparent, depthWrite: mesh.material.depthWrite });
    });
    return { meshes, beaks, materials: [...materials.values()], camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), up: camera.up.toArray(), projection: camera.projectionMatrix.toArray(), near: camera.near, far: camera.far },
      state: w.__toolData.dinoLab, memory: { ...renderer.info.memory }, errors: w.__events.errors, lost: w.__glLive().lost,
      shaders: renderer.info.programs.filter((p: any) => p.diagnostics?.runnable === false).length, fits: document.documentElement.scrollWidth <= innerWidth };
  });
}
function healthy(row: Awaited<ReturnType<typeof audit>>, life = true) {
  expect(row.errors).toEqual([]); expect(row.lost).toBe(false); expect(row.shaders).toBe(0); expect(row.fits).toBe(true); expect(row.beaks).toHaveLength(life ? 1 : 0);
  for (const beak of row.beaks) expect(beak.key).toContain('|dinolab-keratin-grain-v2');
}
async function compare(page: Page, species: string, phong: boolean) {
  const initial = await audit(page); healthy(initial);
  await page.evaluate(({ phong }) => {
    const w = window as any, T = w.THREE, renderer = w.__beakRenderer, scene = w.__beakScene, camera = w.__beakCamera;
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const beaks: any[] = []; scene.getObjectByName('dinolab-specimen').traverse((p: any) => { if (p.isMesh && p.userData.dinoFeature === 'keratin-beak' && p.geometry.userData.dinoBeakGrain?.plainBeak) beaks.push(p); });
    const savedCamera = { position: camera.position.clone(), quaternion: camera.quaternion.clone(), up: camera.up.clone(), near: camera.near, far: camera.far };
    const bounds = new T.Box3().setFromObject(beaks[0]), center = bounds.getCenter(new T.Vector3()), radius = bounds.getSize(new T.Vector3()).length() * .5;
    // A matched diagnostic close-up resolves fine material grain at its actual scale.
    const direction = camera.position.clone().sub(center).normalize();
    camera.position.copy(center).addScaledVector(direction, radius * 4.5); camera.near = Math.max(.00001, radius * .01); camera.lookAt(center);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    const originals = new Map<any, any>(), references = new Map<any, any>(), materials = new Map<any, any>(), currents = new Map<any, any>();
    const gl = renderer.getContext(), width = gl.drawingBufferWidth, height = gl.drawingBufferHeight;
    const regions = beaks.map(mesh => {
      const points = [], pos = mesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) points.push(new T.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).project(camera));
      return { left: Math.floor(Math.min(...points.map(p => (p.x + 1) * width / 2))) - 3, right: Math.ceil(Math.max(...points.map(p => (p.x + 1) * width / 2))) + 3,
        top: Math.floor(Math.min(...points.map(p => (1 - p.y) * height / 2))) - 3, bottom: Math.ceil(Math.max(...points.map(p => (1 - p.y) * height / 2))) + 3 };
    });
    for (const mesh of beaks) {
      const original = mesh.geometry, material = mesh.material; originals.set(mesh, original); materials.set(mesh, material);
      const reference = original.clone(); reference.deleteAttribute('dinoKeratin'); references.set(mesh, reference); mesh.geometry = reference;
      let current = material;
      if (phong) {
        current = new T.MeshPhongMaterial({ color: material.color.clone(), shininess: 5 }); T.Material.prototype.copy.call(current, material);
        current.color.copy(material.color); current.extensions = { ...material.extensions }; current.defaultAttributeValues = { ...material.defaultAttributeValues };
        current.onBeforeCompile = material.onBeforeCompile; current.customProgramCacheKey = () => material.customProgramCacheKey() + '|native-phong';
      }
      currents.set(mesh, current); mesh.material = current;
    }
    function read() { renderer.render(scene, camera); const pixels = new Uint8Array(width * height * 4); gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels); return pixels; }
    function difference(a: Uint8Array, b: Uint8Array) {
      let changed = 0, outside = 0, delta = 0, alpha = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4, sy = height - y - .5;
        if (a[i + 3] !== b[i + 3]) alpha++;
        if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) <= 6) continue;
        if (regions.some(box => x >= box.left && x <= box.right && sy >= box.top && sy <= box.bottom)) { changed++; delta += b[i] + b[i + 1] + b[i + 2] - a[i] - a[i + 1] - a[i + 2]; } else outside++;
      }
      return { changed, outside, delta, alpha };
    }
    const first = read(), reference = read();
    w.__beakComparison = { originals, references, materials, currents, regions, read, difference, reference, savedCamera, noise: difference(first, reference), mode: phong ? 'Phong' : 'Standard' };
  }, { phong });
  await photo(page, species + '-before');
  const result = await page.evaluate(() => { const w = window as any, p = w.__beakComparison; for (const [mesh, geometry] of p.originals) mesh.geometry = geometry;
    const difference = p.difference(p.reference, p.read()); return { mode: p.mode, regions: p.regions, noise: p.noise, difference,
      shaderFailures: w.__beakRenderer.info.programs.filter((program: any) => program.diagnostics?.runnable === false).length }; });
  await photo(page, species + '-after');
  await page.evaluate(() => { const w = window as any, p = w.__beakComparison; for (const [mesh, material] of p.materials) mesh.material = material;
    for (const geometry of p.references.values()) geometry.dispose(); for (const [mesh, material] of p.currents) if (material !== p.materials.get(mesh)) material.dispose();
    const camera = w.__beakCamera; camera.position.copy(p.savedCamera.position); camera.quaternion.copy(p.savedCamera.quaternion); camera.up.copy(p.savedCamera.up); camera.near = p.savedCamera.near; camera.far = p.savedCamera.far;
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true); p.read(); delete w.__beakComparison; });
  const restored = await audit(page); healthy(restored); expect(restored).toEqual(initial); expect(result.shaderFailures).toBe(0);
  expect(result.difference.changed, 'Mapped grain is visible on the existing beak surface').toBeGreaterThan(result.noise.changed + 10);
  expect(result.difference.outside).toBeLessThanOrEqual(result.noise.outside + 3); expect(result.difference.alpha).toBe(0);
  return { initial, restored, ...result };
}

for (const [species, phong] of [['oviraptor', false], ['gallimimus', true], ['therizinosaurus', false]] as const) {
  test(species + ' refines the plain beak in ' + (phong ? 'Phong' : 'Standard') + ' without moving its surface', async ({ page }) => {
    await mount(page, species); const result = await compare(page, species, phong); await photo(page, species + '-head');
    if (species === 'oviraptor') {
      await page.setViewportSize({ width: 320, height: 844 }); await photo(page, species + '-phone'); healthy(await audit(page));
    } else if (species === 'gallimimus') {
      const presets = page.locator('.dinolab-surface-presets'); await presets.getByRole('button', { name: /Fossil anchors/ }).click(); await settle(page); healthy(await audit(page), false);
      await presets.getByRole('button', { name: /Life view/ }).click(); await settle(page); healthy(await audit(page));
    } else {
      const summary = page.locator('.dinolab-3d-controls-disclosure > summary'); if (!(await summary.evaluate(node => node.parentElement!.hasAttribute('open')))) await summary.click();
      const slider = page.getByRole('slider', { name: 'Body inference opacity', exact: true }); await slider.press('Home'); await settle(page); const ghost = await audit(page); healthy(ghost);
      expect(ghost.beaks.every(p => p.opacity < 1 && p.transparent && !p.depthWrite)).toBe(true);
      await slider.press('End'); await settle(page); const opaque = await audit(page); healthy(opaque); expect(opaque.meshes).toEqual(result.initial.meshes); expect(opaque.beaks).toEqual(result.initial.beaks);
      await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click(); await photo(page, species + '-whole'); healthy(await audit(page));
    }
    fs.writeFileSync(report + '/' + phase + '-' + species + '-audit.json', JSON.stringify(result, null, 2));
  });
}
