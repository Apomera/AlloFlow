import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0 });
test.use({ video: 'off', trace: 'off', actionTimeout: 60_000 });
const report = 'reports/dinolab-feather-vane-depth', phase = process.env.DINO_FEATHER_VANE_DEPTH_PHASE || 'after';
const harness = new GlHarness({ toolFile: process.env.DINO_FEATHER_VANE_DEPTH_SOURCE || 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1180, height: 960, layout: 'document', appStyles: true,
  probes: 'var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),draw=r.render.bind(r);r.render=function(s,c){window.__vaneScene=s;window.__vaneCamera=c;window.__vaneRenderer=r;return draw(s,c);};return r;};' });
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
const canvas = (page: Page) => page.locator('canvas.dinolab-3d-canvas');
async function settle(page: Page) {
  await canvas(page).scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));
}
async function photo(page: Page, name: string) { await settle(page); await canvas(page).screenshot({ path: report + '/' + phase + '-' + name + '.png' }); }
async function mount(page: Page, species: string, region: string) {
  await page.setViewportSize({ width: 1180, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', selected: species, field3dSelected: species, field3dStage: 'studio', field3dReconstructionMode: 'evidence',
    field3dAutoRotate: false, field3dOrientationDismissed: true, field3dWorkflowStarted: false, field3dShowSkeleton: false, field3dLabelMode: 'off',
    field3dShowBody: true, field3dShowHuman: false, field3dShowEvidence: false, field3dBodyOpacity: 100 } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  await page.addStyleTag({ content: css.slice(start, css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start))) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__vaneScene?.getObjectByName('dinolab-specimen')), { timeout: 120_000 }).toBe(true);
  await page.getByRole('button', { name: 'Study ' + region + ' details', exact: true }).click(); await settle(page);
}
async function audit(page: Page) {
  return page.evaluate(() => {
    const w = window as any, renderer = w.__vaneRenderer, camera = w.__vaneCamera, model = w.__vaneScene.getObjectByName('dinolab-specimen');
    function hash(array: ArrayBufferView) { const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength); let h = 2166136261; for (const b of bytes) h = Math.imul(h ^ b, 16777619); return h >>> 0; }
    const meshes: any[] = [], vanes: any[] = [], materials = new Map();
    model.traverse((mesh: any) => {
      if (!mesh.isMesh) return;
      meshes.push({ mesh: mesh.uuid, geometry: mesh.geometry.uuid, attrs: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([key, attr]: [string, any]) => [key, hash(attr.array)])),
        index: mesh.geometry.index ? hash(mesh.geometry.index.array) : null, position: mesh.position.toArray(), quaternion: mesh.quaternion.toArray(), scale: mesh.scale.toArray(), visible: mesh.visible });
      for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.set(mat.uuid, { uuid: mat.uuid, colour: mat.color?.toArray(), opacity: mat.opacity,
        transparent: mat.transparent, depthWrite: mat.depthWrite, roughness: mat.roughness, key: mat.customProgramCacheKey() });
      if (mesh.userData.dinoFeature === 'feather') vanes.push({ feature: mesh.userData.dinoFeature, mesh: mesh.uuid, geometry: mesh.geometry.uuid,
        coordinates: hash(mesh.geometry.attributes.uv.array), material: mesh.material.uuid, key: mesh.material.customProgramCacheKey(), colour: mesh.material.color.toArray(),
        opacity: mesh.material.opacity, transparent: mesh.material.transparent, depthWrite: mesh.material.depthWrite });
    });
    return { meshes, vanes, materials: [...materials.values()], camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), projection: camera.projectionMatrix.toArray() },
      state: w.__toolData.dinoLab, memory: { ...renderer.info.memory }, errors: w.__events.errors, lost: w.__glLive().lost,
      shaders: renderer.info.programs.filter((p: any) => p.diagnostics?.runnable === false).length, fits: document.documentElement.scrollWidth <= innerWidth };
  });
}
function healthy(row: Awaited<ReturnType<typeof audit>>, life = true) {
  expect(row.errors).toEqual([]); expect(row.lost).toBe(false); expect(row.shaders).toBe(0); expect(row.fits).toBe(true);
  if (life) expect(row.vanes.length).toBeGreaterThan(0); else expect(row.vanes).toHaveLength(0);
  for (const vane of row.vanes) expect(vane.key).toContain('|dinolab-feather-vane-depth-v1');
}
async function compare(page: Page, species: string, phong: boolean) {
  const initial = await audit(page); healthy(initial);
  await page.evaluate(({ phong }) => {
    const w = window as any, T = w.THREE, renderer = w.__vaneRenderer, scene = w.__vaneScene, camera = w.__vaneCamera;
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const vanes: any[] = []; scene.getObjectByName('dinolab-specimen').traverse((p: any) => { if (p.isMesh && p.userData.dinoFeature === 'feather') vanes.push(p); });
    const originals = new Map<any, any>(), currents = new Map<any, any>(), references = new Map<any, any>();
    const gl = renderer.getContext(), width = gl.drawingBufferWidth, height = gl.drawingBufferHeight;
    const regions = vanes.map(mesh => {
      const points = [], pos = mesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) points.push(new T.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).project(camera));
      return { left: Math.floor(Math.min(...points.map(p => (p.x + 1) * width / 2))) - 3, right: Math.ceil(Math.max(...points.map(p => (p.x + 1) * width / 2))) + 3,
        top: Math.floor(Math.min(...points.map(p => (1 - p.y) * height / 2))) - 3, bottom: Math.ceil(Math.max(...points.map(p => (1 - p.y) * height / 2))) + 3 };
    });
    for (const mesh of vanes) {
      const original = mesh.material; originals.set(mesh, original);
      if (!currents.has(original)) {
        let current = original;
        if (phong) {
          current = new T.MeshPhongMaterial({ color: original.color.clone(), map: original.map, shininess: original.userData.dinoFeatherIridescence ? 18 : 3 }); T.Material.prototype.copy.call(current, original);
          current.color.copy(original.color); current.extensions = { ...original.extensions }; current.defaultAttributeValues = { ...original.defaultAttributeValues };
          current.onBeforeCompile = original.onBeforeCompile; current.customProgramCacheKey = () => original.customProgramCacheKey() + '|native-phong';
        }
        currents.set(original, current);
        const reference = current.clone(), compile = current.onBeforeCompile;
        reference.extensions = { ...current.extensions }; reference.defaultAttributeValues = { ...current.defaultAttributeValues };
        reference.onBeforeCompile = function (shader: any, r: any) {
          compile.call(this, shader, r);
          shader.vertexShader = shader.vertexShader.replace('varying vec2 vDinoVaneUv;\n', '').replace('\nvDinoVaneUv = uv;', '');
          shader.fragmentShader = shader.fragmentShader.replace('varying vec2 vDinoVaneUv;\n', '').replace(/\nfloat vaneAcross[\s\S]*?diffuseColor\.rgb \*= 1\.0 - [0-9.]+ \* vaneShaftShade;/, '');
        };
        reference.customProgramCacheKey = () => current.customProgramCacheKey() + '|without-vane-depth'; references.set(original, reference);
      }
      mesh.material = references.get(original);
    }
    function read() { renderer.render(scene, camera); const pixels = new Uint8Array(width * height * 4); gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels); return pixels; }
    function difference(a: Uint8Array, b: Uint8Array) {
      let changed = 0, outside = 0, brighter = 0, delta = 0, alpha = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4, sy = height - y - .5;
        if (a[i + 3] !== b[i + 3]) alpha++;
        if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) <= 6) continue;
        const amount = b[i] + b[i + 1] + b[i + 2] - a[i] - a[i + 1] - a[i + 2];
        if (regions.some(box => x >= box.left && x <= box.right && sy >= box.top && sy <= box.bottom)) { changed++; delta += amount; if (amount > 6) brighter++; } else outside++;
      }
      return { changed, outside, brighter, delta, alpha };
    }
    const first = read(), reference = read();
    w.__vaneComparison = { originals, currents, references, regions, read, difference, reference, noise: difference(first, reference), mode: phong ? 'Phong' : 'Standard' };
  }, { phong });
  await photo(page, species + '-before');
  const result = await page.evaluate(() => { const w = window as any, p = w.__vaneComparison; for (const [mesh, original] of p.originals) mesh.material = p.currents.get(original);
    const difference = p.difference(p.reference, p.read());
    return { mode: p.mode, regions: p.regions, noise: p.noise, difference, shaderFailures: w.__vaneRenderer.info.programs.filter((program: any) => program.diagnostics?.runnable === false).length }; });
  await photo(page, species + '-after');
  await page.evaluate(() => { const w = window as any, p = w.__vaneComparison; for (const [mesh, original] of p.originals) mesh.material = original;
    for (const mat of p.references.values()) mat.dispose(); for (const [original, current] of p.currents) if (original !== current) current.dispose(); p.read(); delete w.__vaneComparison; });
  const restored = await audit(page); healthy(restored); expect(restored).toEqual(initial);
  expect(result.shaderFailures, 'Both native comparison shaders compile').toBe(0);
  expect(result.difference.changed, 'Shaft-side depth is visible on the actual feather vanes').toBeGreaterThan(result.noise.changed + 20);
  expect(result.difference.delta).toBeLessThan(0); expect(result.difference.brighter).toBeLessThanOrEqual(result.noise.brighter + 3);
  expect(result.difference.outside).toBeLessThanOrEqual(result.noise.outside + 3); expect(result.difference.alpha).toBe(0);
  return { initial, restored, ...result };
}

for (const [species, region, phong] of [['anchiornis', 'body', false], ['microraptor', 'body', true], ['archaeopteryx', 'tail', false]] as const) {
  test(species + ' refines vane depth in ' + (phong ? 'Phong' : 'Standard') + ' without changing anatomy', async ({ page }) => {
    await mount(page, species, region); const result = await compare(page, species, phong);
    if (species === 'anchiornis') {
      await page.setViewportSize({ width: 320, height: 844 }); await photo(page, species + '-phone'); healthy(await audit(page));
    } else if (species === 'microraptor') {
      const presets = page.locator('.dinolab-surface-presets'); await presets.getByRole('button', { name: /Fossil anchors/ }).click(); await settle(page); healthy(await audit(page), false);
      await presets.getByRole('button', { name: /Life view/ }).click(); await settle(page); healthy(await audit(page));
    } else {
      const summary = page.locator('.dinolab-3d-controls-disclosure > summary'); if (!(await summary.evaluate(node => node.parentElement!.hasAttribute('open')))) await summary.click();
      const slider = page.getByRole('slider', { name: 'Body inference opacity', exact: true }); await slider.press('Home'); await settle(page); const ghost = await audit(page); healthy(ghost);
      expect(ghost.vanes.every(p => p.opacity < 1 && p.transparent && !p.depthWrite)).toBe(true);
      await slider.press('End'); await settle(page); const opaque = await audit(page); healthy(opaque); expect(opaque.meshes).toEqual(result.initial.meshes); expect(opaque.vanes).toEqual(result.initial.vanes);
      await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click(); await photo(page, species + '-whole'); healthy(await audit(page));
    }
    fs.writeFileSync(report + '/' + phase + '-' + species + '-audit.json', JSON.stringify(result, null, 2));
  });
}
