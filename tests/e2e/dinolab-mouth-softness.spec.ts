import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0 });
test.use({ video: 'off', trace: 'off', actionTimeout: 60_000 });
const report = 'reports/dinolab-mouth-softness', phase = process.env.DINO_MOUTH_PHASE || 'after';
const harness = new GlHarness({ toolFile: process.env.DINO_MOUTH_SOURCE || 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1180, height: 960, layout: 'document', appStyles: true,
  probes: 'var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),draw=r.render.bind(r);r.render=function(s,c){window.__mouthScene=s;window.__mouthCamera=c;window.__mouthRenderer=r;return draw(s,c);};return r;};' });
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
const canvas = (page: Page) => page.locator('canvas.dinolab-3d-canvas');
async function settle(page: Page) {
  await canvas(page).scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));
}
async function photo(page: Page, name: string) { await settle(page); await canvas(page).screenshot({ path: report + '/' + phase + '-' + name + '.png' }); }
async function mount(page: Page, species: string) {
  await page.setViewportSize({ width: 1180, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', selected: species, field3dSelected: species, field3dStage: 'studio', field3dReconstructionMode: 'evidence',
    field3dAutoRotate: false, field3dOrientationDismissed: true, field3dWorkflowStarted: false, field3dShowSkeleton: false, field3dLabelMode: 'off',
    field3dShowBody: true, field3dShowHuman: false, field3dShowEvidence: false, field3dBodyOpacity: 100 } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  await page.addStyleTag({ content: css.slice(start, css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start))) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__mouthScene?.getObjectByName('dinolab-specimen')), { timeout: 120_000 }).toBe(true);
  await page.getByRole('button', { name: 'Study head details', exact: true }).click(); await settle(page);
}
async function audit(page: Page) {
  return page.evaluate(() => {
    const w = window as any, renderer = w.__mouthRenderer, camera = w.__mouthCamera, model = w.__mouthScene.getObjectByName('dinolab-specimen');
    function hash(array: ArrayBufferView) {
      const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength); let h = 2166136261;
      for (const value of bytes) h = Math.imul(h ^ value, 16777619); return h >>> 0;
    }
    const meshes: any[] = [], creases: any[] = [];
    model.traverse((mesh: any) => {
      if (!mesh.isMesh) return;
      const attrs = Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([key, attr]: [string, any]) => [key, hash(attr.array)]));
      meshes.push({ mesh: mesh.uuid, geometry: mesh.geometry.uuid, attrs, index: mesh.geometry.index ? hash(mesh.geometry.index.array) : null,
        position: mesh.position.toArray(), quaternion: mesh.quaternion.toArray(), scale: mesh.scale.toArray(), visible: mesh.visible });
      if (mesh.userData.dinoFeature !== 'mouth-crease') return;
      const mat = mesh.material, rendered = new Set<number>(Array.from(mesh.geometry.index.array)), T = w.THREE;
      let unseated = 0;
      for (const i of rendered) {
        const position = new T.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i).applyMatrix4(mesh.matrixWorld);
        const root = new T.Vector3().fromBufferAttribute(mesh.geometry.attributes.dinoFaceRoot, i).applyMatrix4(mesh.matrixWorld);
        if (position.distanceTo(root) < mesh.geometry.parameters.offset * .90) unseated++;
      }
      creases.push({ name: mesh.name, material: mat.uuid, colour: mat.color.toArray(), opacity: mat.opacity, transparent: mat.transparent, depthWrite: mat.depthWrite,
        key: mat.customProgramCacheKey(), projected: mesh.geometry.parameters.projected, samples: mesh.geometry.parameters.samples, rendered: rendered.size, unseated });
    });
    return { meshes, creases, camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), projection: camera.projectionMatrix.toArray() },
      state: w.__toolData.dinoLab, memory: { ...renderer.info.memory }, errors: w.__events.errors, lost: w.__glLive().lost,
      shaders: renderer.info.programs.filter((program: any) => program.diagnostics?.runnable === false).length, fits: document.documentElement.scrollWidth <= innerWidth };
  });
}
function healthy(row: Awaited<ReturnType<typeof audit>>, life = true) {
  expect(row.errors).toEqual([]); expect(row.lost).toBe(false); expect(row.shaders).toBe(0); expect(row.fits).toBe(true);
  expect(row.creases).toHaveLength(life ? 2 : 0);
  for (const crease of row.creases) {
    expect(crease.rendered).toBeGreaterThan(0); expect(crease.rendered).toBeLessThanOrEqual(crease.projected); expect(crease.projected).toBeLessThanOrEqual(crease.samples);
    expect(crease.unseated).toBe(0); expect(crease.transparent).toBe(true); expect(crease.depthWrite).toBe(false);
    expect(crease.key).toContain('dinolab-mouth-crease-v1:');
  }
}
async function compare(page: Page, species: string) {
  const initial = await audit(page); healthy(initial);
  await page.evaluate(() => {
    const w = window as any, T = w.THREE, renderer = w.__mouthRenderer, scene = w.__mouthScene, camera = w.__mouthCamera;
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const creases: any[] = []; scene.getObjectByName('dinolab-specimen').traverse((p: any) => { if (p.userData.dinoFeature === 'mouth-crease') creases.push(p); });
    const originals = new Map<any, any>(), references = new Map<any, any>();
    const gl = renderer.getContext(), width = gl.drawingBufferWidth, height = gl.drawingBufferHeight;
    const regions = creases.map(mesh => {
      const points = [], pos = mesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) points.push(new T.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).project(camera));
      return { left: Math.floor(Math.min(...points.map(p => (p.x + 1) * width / 2))) - 3, right: Math.ceil(Math.max(...points.map(p => (p.x + 1) * width / 2))) + 3,
        top: Math.floor(Math.min(...points.map(p => (1 - p.y) * height / 2))) - 3, bottom: Math.ceil(Math.max(...points.map(p => (1 - p.y) * height / 2))) + 3 };
    });
    for (const mesh of creases) {
      const original = mesh.material; originals.set(mesh, original);
      if (!references.has(original)) {
        const reference = original.clone();
        // Isolate the fade against a hard-edged Basic decal on the same margin.
        reference.onBeforeCompile = T.Material.prototype.onBeforeCompile;
        reference.customProgramCacheKey = () => 'dinolab-mouth-reference'; reference.transparent = false; reference.depthWrite = true;
        references.set(original, reference);
      }
      mesh.material = references.get(original);
    }
    function read() { renderer.render(scene, camera); const pixels = new Uint8Array(width * height * 4); gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels); return pixels; }
    function difference(a: Uint8Array, b: Uint8Array, skin?: Uint8Array) {
      let changed = 0, outside = 0, blended = 0, retained = 0, delta = 0, alpha = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4, sy = height - y - .5, inside = regions.some(box => x >= box.left && x <= box.right && sy >= box.top && sy <= box.bottom);
        const distance = (p: Uint8Array, q: Uint8Array) => Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]);
        if (a[i + 3] !== b[i + 3]) alpha++;
        const diff = distance(a, b);
        if (diff > 6) { if (inside) { changed++; delta += b[i] + b[i + 1] + b[i + 2] - a[i] - a[i + 1] - a[i + 2]; } else outside++; }
        if (inside && skin) {
          const oldContrast = distance(a, skin), newContrast = distance(b, skin);
          if (oldContrast > 20 && newContrast > 12) retained++;
          if (oldContrast > 20 && newContrast > 6 && newContrast < oldContrast - 6 && diff > 6) blended++;
        }
      }
      return { changed, outside, blended, retained, delta, alpha };
    }
    const first = read(), reference = read();
    w.__mouthComparison = { originals, references, regions, read, difference, reference, noise: difference(first, reference) };
  });
  await photo(page, species + '-hard-edge-reference');
  const result = await page.evaluate(() => {
    const w = window as any, p = w.__mouthComparison;
    for (const [mesh, original] of p.originals) mesh.material = original;
    const current = p.read();
    for (const mesh of p.originals.keys()) mesh.visible = false;
    const skin = p.read();
    for (const mesh of p.originals.keys()) mesh.visible = true;
    p.read();
    return { regions: p.regions, noise: p.noise, difference: p.difference(p.reference, current, skin) };
  });
  await photo(page, species + '-after');
  await page.evaluate(() => { const w = window as any, p = w.__mouthComparison; for (const material of p.references.values()) material.dispose(); p.read(); delete w.__mouthComparison; });
  const restored = await audit(page); healthy(restored); expect(restored).toEqual(initial);
  expect(result.difference.blended, 'Mouth edges blend into the skin in native pixels').toBeGreaterThan(15);
  expect(result.difference.retained, 'The mouth crease remains visible').toBeGreaterThan(30);
  expect(result.difference.delta).toBeGreaterThan(0);
  expect(result.difference.outside).toBeLessThanOrEqual(result.noise.outside + 3);
  expect(result.difference.alpha).toBe(0);
  return { initial, restored, ...result };
}

for (const species of ['tyrannosaurus', 'parasaurolophus', 'brachiosaurus', 'microraptor']) {
  test(species + ' softens the seated mouth crease without moving the face', async ({ page }) => {
    await mount(page, species); const result = await compare(page, species);
    if (species === 'tyrannosaurus') {
      const summary = page.locator('.dinolab-3d-controls-disclosure > summary');
      if (!(await summary.evaluate(node => node.parentElement!.hasAttribute('open')))) await summary.click();
      const slider = page.getByRole('slider', { name: 'Body inference opacity', exact: true });
      await slider.press('Home'); await settle(page); const ghost = await audit(page); healthy(ghost);
      expect(ghost.creases.every(crease => crease.opacity === .22)).toBe(true);
      await slider.press('End'); await settle(page); const opaque = await audit(page); healthy(opaque);
      expect(opaque.creases).toEqual(result.initial.creases); expect(opaque.meshes).toEqual(result.initial.meshes); expect(opaque.camera).toEqual(result.initial.camera);
      await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click(); await photo(page, species + '-whole');
    } else if (species === 'parasaurolophus') {
      await page.locator('.dinolab-surface-presets').getByRole('button', { name: /Fossil anchors/ }).click(); await settle(page); healthy(await audit(page), false);
      await page.locator('.dinolab-surface-presets').getByRole('button', { name: /Life view/ }).click(); await settle(page); healthy(await audit(page));
    } else if (species === 'brachiosaurus') {
      await page.setViewportSize({ width: 320, height: 844 }); await photo(page, species + '-phone-head'); healthy(await audit(page));
      await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click(); await photo(page, species + '-phone-whole'); healthy(await audit(page));
    } else {
      const summary = page.locator('.dinolab-3d-controls-disclosure > summary');
      if (!(await summary.evaluate(node => node.parentElement!.hasAttribute('open')))) await summary.click();
      for (const name of ['Front camera view', 'Side camera view']) {
        await page.getByRole('button', { name, exact: true }).click(); await settle(page); const rotated = await audit(page); healthy(rotated);
        expect(rotated.meshes).toEqual(result.initial.meshes); expect(rotated.creases).toEqual(result.initial.creases);
      }
    }
    fs.writeFileSync(report + '/' + phase + '-' + species + '-audit.json', JSON.stringify(result, null, 2));
  });
}
