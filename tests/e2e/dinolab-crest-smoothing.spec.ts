import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0 });
test.use({ video: 'off', trace: 'off', actionTimeout: 60_000 });
const report = 'reports/dinolab-crest-smoothing', phase = process.env.DINO_CREST_SMOOTH_PHASE || 'after';
const harness = new GlHarness({ toolFile: process.env.DINO_CREST_SMOOTH_SOURCE || 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1180, height: 960, layout: 'document', appStyles: true,
  probes: 'var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),draw=r.render.bind(r);r.render=function(s,c){window.__crestScene=s;window.__crestCamera=c;window.__crestRenderer=r;return draw(s,c);};return r;};' });
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
  await expect.poll(() => page.evaluate(() => !!(window as any).__crestScene?.getObjectByName('dinolab-specimen')), { timeout: 120_000 }).toBe(true);
  await page.getByRole('button', { name: 'Study head details', exact: true }).click(); await settle(page);
}
async function audit(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, renderer = w.__crestRenderer, camera = w.__crestCamera, model = w.__crestScene.getObjectByName('dinolab-specimen');
    function hash(array: ArrayBufferView) { const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength); let h = 2166136261; for (const b of bytes) h = Math.imul(h ^ b, 16777619); return h >>> 0; }
    const meshes: any[] = [], crests: any[] = [], materials = new Map(); let outside = 0;
    model.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    model.traverse((mesh: any) => {
      if (!mesh.isMesh) return;
      meshes.push({ mesh: mesh.uuid, geometry: mesh.geometry.uuid, attrs: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([key, attr]: [string, any]) => [key, hash(attr.array)])),
        index: mesh.geometry.index ? hash(mesh.geometry.index.array) : null, position: mesh.position.toArray(), quaternion: mesh.quaternion.toArray(), scale: mesh.scale.toArray(), castShadow: mesh.castShadow, visible: mesh.visible });
      for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.set(mat.uuid, { uuid: mat.uuid, colour: mat.color?.toArray(), opacity: mat.opacity, transparent: mat.transparent, depthWrite: mat.depthWrite, map: mat.map?.uuid, key: mat.customProgramCacheKey() });
      if (mesh.userData.dinoFeature !== 'crest' || mesh.geometry.type !== 'ConeGeometry') return;
      const g = mesh.geometry, p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const v = new T.Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld).project(camera); if (Math.abs(v.x) > 1.001 || Math.abs(v.y) > 1.001 || Math.abs(v.z) > 1.001) outside++; }
      crests.push({ mesh: mesh.uuid, geometry: g.uuid, parameters: g.parameters, vertices: p.count, triangles: g.index.count / 3, position: mesh.position.toArray(), quaternion: mesh.quaternion.toArray(), scale: mesh.scale.toArray(), material: mesh.material.uuid, parts: mesh.userData.dinoPartIds });
    });
    return { meshes, crests, materials: [...materials.values()], outside, camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), projection: camera.projectionMatrix.toArray() },
      state: w.__toolData.dinoLab, memory: { ...renderer.info.memory }, errors: w.__events.errors, lost: w.__glLive().lost, shaders: renderer.info.programs.filter((p: any) => p.diagnostics?.runnable === false).length, fits: document.documentElement.scrollWidth <= innerWidth };
  });
}
function healthy(row: Awaited<ReturnType<typeof audit>>, segments = 40) {
  expect(row.errors).toEqual([]); expect(row.lost).toBe(false); expect(row.shaders).toBe(0); expect(row.fits).toBe(true); expect(row.outside).toBe(0);
  expect(row.crests).toHaveLength(1); expect(row.crests[0].parameters.radialSegments, segments === 40 ? 'Life crest retains denser sampling' : 'Bone proxy retains original sampling').toBe(segments);
}
async function compare(page: Page, species: string) {
  const initial = await audit(page); healthy(initial);
  await page.evaluate(() => {
    const w = window as any, T = w.THREE, renderer = w.__crestRenderer, scene = w.__crestScene, camera = w.__crestCamera;
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const targets: any[] = []; scene.getObjectByName('dinolab-specimen').traverse((p: any) => { if (p.isMesh && p.userData.dinoFeature === 'crest' && p.geometry.type === 'ConeGeometry') targets.push(p); });
    const originals = new Map<any, any>(), references: any[] = [], shadows = new Map<any, boolean>();
    const gl = renderer.getContext(), width = gl.drawingBufferWidth, height = gl.drawingBufferHeight;
    const regions = targets.map(mesh => {
      const points = [], pos = mesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) points.push(new T.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).project(camera));
      return { left: Math.floor(Math.min(...points.map(p => (p.x + 1) * width / 2))) - 3, right: Math.ceil(Math.max(...points.map(p => (p.x + 1) * width / 2))) + 3,
        top: Math.floor(Math.min(...points.map(p => (1 - p.y) * height / 2))) - 3, bottom: Math.ceil(Math.max(...points.map(p => (1 - p.y) * height / 2))) + 3 };
    });
    function key(g: any, i: number) { return ['position', 'normal', 'uv'].flatMap(name => Array.from(g.attributes[name].array.slice(i * g.attributes[name].itemSize, (i + 1) * g.attributes[name].itemSize))).join('|'); }
    for (const mesh of targets) {
      const original = mesh.geometry, p = original.parameters, reference = new T.ConeGeometry(p.radius, p.height, 10, p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength);
      // Every old angular station is retained exactly. Copy its original native
      // pigment coordinates rather than remapping or approximating the palette.
      const samples = new Map(); for (let i = 0; i < original.attributes.position.count; i++) samples.set(key(original, i), i);
      const matches = []; for (let i = 0; i < reference.attributes.position.count; i++) { const match = samples.get(key(reference, i)); if (match === undefined) throw Error('Legacy crest station missing'); matches.push(match); }
      for (const [name, attr] of Object.entries(original.attributes) as [string, any][]) {
        if (['position', 'normal', 'uv'].includes(name)) continue;
        const values = new Float32Array(matches.length * attr.itemSize);
        for (let i = 0; i < matches.length; i++) for (let j = 0; j < attr.itemSize; j++) values[i * attr.itemSize + j] = attr.array[matches[i] * attr.itemSize + j];
        reference.setAttribute(name, new T.BufferAttribute(values, attr.itemSize));
      }
      originals.set(mesh, original); references.push(reference); shadows.set(mesh, mesh.castShadow); mesh.geometry = reference;
      // Isolate crest facets in the pixel comparison; restore real shadows for
      // the production capture below, where the rounder outline casts its shadow.
      mesh.castShadow = false;
    }
    function read() { renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera); const pixels = new Uint8Array(width * height * 4); gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels); return pixels; }
    function difference(a: Uint8Array, b: Uint8Array) {
      let changed = 0, outside = 0, alpha = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4, sy = height - y - .5; if (a[i + 3] !== b[i + 3]) alpha++;
        if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) <= 6) continue;
        if (regions.some(box => x >= box.left && x <= box.right && sy >= box.top && sy <= box.bottom)) changed++; else outside++;
      }
      return { changed, outside, alpha };
    }
    const first = read(), reference = read(); w.__crestComparison = { originals, references, shadows, regions, read, difference, reference, noise: difference(first, reference) };
  });
  await photo(page, species + '-facets-before');
  const result = await page.evaluate(() => { const w = window as any, p = w.__crestComparison; for (const [mesh, geometry] of p.originals) mesh.geometry = geometry;
    const difference = p.difference(p.reference, p.read()); return { regions: p.regions, noise: p.noise, difference, shaderFailures: w.__crestRenderer.info.programs.filter((program: any) => program.diagnostics?.runnable === false).length }; });
  await photo(page, species + '-facets-after');
  await page.evaluate(() => { const w = window as any, p = w.__crestComparison; for (const [mesh, cast] of p.shadows) mesh.castShadow = cast; for (const g of p.references) g.dispose(); p.read(); delete w.__crestComparison; });
  const restored = await audit(page); healthy(restored); expect(restored).toEqual(initial); expect(result.shaderFailures).toBe(0);
  expect(result.difference.changed, 'The denser crest surface changes the native facet rendering').toBeGreaterThan(result.noise.changed + 30);
  expect(result.difference.outside).toBeLessThanOrEqual(result.noise.outside + 3); expect(result.difference.alpha).toBe(0);
  await photo(page, species + '-head'); return { initial, restored, ...result };
}

for (const species of ['oviraptor', 'citipati']) {
  test(species + ' smooths the Life crest while retaining the bone proxy and view controls', async ({ page }) => {
    await mount(page, species); const result = await compare(page, species);
    const presets = page.locator('.dinolab-surface-presets'); await presets.getByRole('button', { name: /Fossil anchors/ }).click(); await settle(page); const bone = await audit(page); healthy(bone, 10);
    await presets.getByRole('button', { name: /Life view/ }).click(); await settle(page); healthy(await audit(page));
    const summary = page.locator('.dinolab-3d-controls-disclosure > summary'); if (!(await summary.evaluate(node => node.parentElement!.hasAttribute('open')))) await summary.click();
    for (const name of ['Front camera view', 'Side camera view']) { await page.getByRole('button', { name, exact: true }).click(); await settle(page); healthy(await audit(page)); }
    await page.setViewportSize({ width: 320, height: 844 }); await photo(page, species + '-phone'); healthy(await audit(page));
    fs.writeFileSync(report + '/' + phase + '-' + species + '-audit.json', JSON.stringify({ ...result, bone }, null, 2));
  });
}
