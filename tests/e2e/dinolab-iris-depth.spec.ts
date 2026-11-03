import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0 });
test.use({ video: 'off', trace: 'off', actionTimeout: 60_000 });
const report = 'reports/dinolab-iris-depth', phase = process.env.DINO_IRIS_PHASE || 'after';
const harness = new GlHarness({ toolFile: process.env.DINO_IRIS_SOURCE || 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1180, height: 960, layout: 'document', appStyles: true,
  probes: 'var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),draw=r.render.bind(r);r.render=function(s,c){window.__irisScene=s;window.__irisCamera=c;window.__irisRenderer=r;return draw(s,c);};return r;};' });
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
const canvas = (page: Page) => page.locator('canvas.dinolab-3d-canvas');
async function settle(page: Page) {
  await canvas(page).scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));
}
async function mount(page: Page, species: string) {
  await page.setViewportSize({ width: 1180, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', selected: species, field3dSelected: species, field3dStage: 'studio', field3dReconstructionMode: 'evidence',
    field3dAutoRotate: false, field3dOrientationDismissed: true, field3dWorkflowStarted: false, field3dShowSkeleton: false, field3dLabelMode: 'off',
    field3dShowBody: true, field3dShowHuman: false, field3dShowEvidence: false, field3dBodyOpacity: 100 } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  await page.addStyleTag({ content: css.slice(start, css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start))) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__irisScene?.getObjectByName('dinolab-specimen')), { timeout: 120_000 }).toBe(true);
  await page.getByRole('button', { name: 'Study head details', exact: true }).click(); await settle(page);
}
async function audit(page: Page) {
  return page.evaluate(() => {
    const w = window as any, renderer = w.__irisRenderer, camera = w.__irisCamera, model = w.__irisScene.getObjectByName('dinolab-specimen');
    function hash(array: ArrayBufferView | undefined) {
      if (!array) return null; const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength); let h = 2166136261;
      for (const value of bytes) h = Math.imul(h ^ value, 16777619); return h >>> 0;
    }
    const eyes: any[] = [], geometries = new Set<string>(), materials = new Set<string>();
    model.traverse((part: any) => {
      if (!part.isMesh) return; geometries.add(part.geometry.uuid); for (const mat of Array.isArray(part.material) ? part.material : [part.material]) materials.add(mat.uuid);
      if (!part.userData.dinoEyeRole) return;
      eyes.push({ role: part.userData.dinoEyeRole, side: part.userData.dinoEyeSide, mesh: part.uuid, geometry: part.geometry.uuid, material: part.material.uuid,
        position: part.position.toArray(), quaternion: part.quaternion.toArray(), scale: part.scale.toArray(), visible: part.visible,
        positions: hash(part.geometry.attributes.position?.array), normals: hash(part.geometry.attributes.normal?.array), iris: hash(part.geometry.attributes.dinoIris?.array),
        colour: part.material.color.toArray(), opacity: part.material.opacity, roughness: part.material.roughness, map: part.material.map?.uuid, key: part.material.customProgramCacheKey() });
    });
    return { model: model.uuid, eyes, geometries: [...geometries].sort(), materials: [...materials].sort(), camera: camera.position.toArray(), quaternion: camera.quaternion.toArray(), projection: camera.projectionMatrix.toArray(), up: camera.up.toArray(),
      state: w.__toolData.dinoLab, memory: { ...renderer.info.memory }, errors: w.__events.errors, lost: w.__glLive().lost,
      shaderFailures: renderer.info.programs.filter((p: any) => p.diagnostics?.runnable === false).length, fits: document.documentElement.scrollWidth <= innerWidth };
  });
}
function healthy(row: Awaited<ReturnType<typeof audit>>, eyes = true) {
  expect(row.errors).toEqual([]); expect(row.lost).toBe(false); expect(row.shaderFailures).toBe(0); expect(row.fits).toBe(true);
  if (eyes) {
    expect(row.eyes).toHaveLength(12);
    expect(row.eyes.filter(eye => eye.role === 'iris').map(eye => eye.key)).toEqual(['dinolab-iris-v3', 'dinolab-iris-v3']);
    for (const eye of row.eyes) expect([...eye.position, ...eye.scale, ...eye.quaternion].every(Number.isFinite)).toBe(true);
  }
}
async function photo(page: Page, name: string) { await canvas(page).screenshot({ path: report + '/' + phase + '-' + name + '.png' }); }

async function compareEye(page: Page, side: number, phong: boolean, name: string) {
  const initial = await audit(page); healthy(initial);
  await page.evaluate(({ side, phong }) => {
    const w = window as any, T = w.THREE, scene = w.__irisScene, camera = w.__irisCamera, renderer = w.__irisRenderer, model = scene.getObjectByName('dinolab-specimen');
    const eyes: any[] = []; model.traverse((part: any) => { if (part.userData.dinoEyeRole === 'iris') eyes.push(part); });
    const eye = eyes.find(part => part.userData.dinoEyeSide === side); if (!eye) throw Error('Actual authored eye missing');
    scene.updateMatrixWorld(true); const q = eye.getWorldQuaternion(new T.Quaternion()), center = eye.getWorldPosition(new T.Vector3());
    const radius = eye.geometry.parameters.radius * Math.abs(eye.getWorldScale(new T.Vector3()).x);
    const saved = { position: camera.position.clone(), quaternion: camera.quaternion.clone(), up: camera.up.clone(), near: camera.near, far: camera.far, fov: camera.fov };
    camera.position.copy(center).addScaledVector(new T.Vector3(0, 0, side).applyQuaternion(q), radius * 6.5);
    camera.up.copy(new T.Vector3(0, 1, 0).applyQuaternion(q)); camera.near = radius * .01; camera.far = Math.max(200, radius * 100); camera.lookAt(center);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    const originals = new Map<any, any>(), current = new Map<any, any>(), references = new Map<any, any>();
    for (const part of eyes) {
      const original = part.material; originals.set(part, original);
      if (!current.has(original)) {
        let active = original;
        if (phong) {
          active = new T.MeshPhongMaterial({ color: original.color.clone(), shininess: 24 });
          T.Material.prototype.copy.call(active, original); active.color.copy(original.color); active.extensions = { ...original.extensions };
          active.onBeforeCompile = original.onBeforeCompile; active.customProgramCacheKey = () => original.customProgramCacheKey() + '|native-phong';
        }
        current.set(original, active);
        const reference = active.clone(), compile = active.onBeforeCompile;
        reference.extensions = { ...active.extensions };
        // Remove only the new illustrated depth term from an otherwise identical
        // material. This preserves the original iris shader for matched images.
        reference.onBeforeCompile = function (shader: any, r: any) { compile.call(this, shader, r); shader.fragmentShader = shader.fragmentShader.split('\n').filter((line: string) => !line.includes('irisLidShade')).join('\n'); };
        reference.customProgramCacheKey = () => active.customProgramCacheKey() + '|without-lid-depth'; references.set(original, reference);
      }
      part.material = references.get(original);
    }
    const gl = renderer.getContext(), width = gl.drawingBufferWidth, height = gl.drawingBufferHeight;
    if (!eye.geometry.boundingBox) eye.geometry.computeBoundingBox();
    const points = [], box = eye.geometry.boundingBox;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) points.push(new T.Vector3(x, y, z).applyMatrix4(eye.matrixWorld).project(camera));
    const region = { left: Math.floor(Math.min(...points.map(p => (p.x + 1) * width / 2))) - 2, right: Math.ceil(Math.max(...points.map(p => (p.x + 1) * width / 2))) + 2,
      top: Math.floor(Math.min(...points.map(p => (1 - p.y) * height / 2))) - 2, bottom: Math.ceil(Math.max(...points.map(p => (1 - p.y) * height / 2))) + 2, centerY: (1 - center.clone().project(camera).y) * height / 2 };
    function read() { renderer.render(scene, camera); const pixels = new Uint8Array(width * height * 4); gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels); return pixels; }
    function diff(a: Uint8Array, b: Uint8Array) {
      let upper = 0, lower = 0, outside = 0, middle = 0, alpha = 0, upperDelta = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4, sy = height - y - .5;
        if (a[i + 3] !== b[i + 3]) alpha++;
        if (Math.abs(b[i] - a[i]) + Math.abs(b[i + 1] - a[i + 1]) + Math.abs(b[i + 2] - a[i + 2]) <= 6) continue;
        if (x < region.left || x > region.right || sy < region.top || sy > region.bottom) outside++;
        else if (sy < region.centerY - 3) { upper++; upperDelta += b[i] + b[i + 1] + b[i + 2] - a[i] - a[i + 1] - a[i + 2]; }
        else if (sy > region.centerY + 3) lower++; else middle++;
      }
      return { upper, lower, outside, middle, alpha, upperDelta };
    }
    const first = read(), reference = read();
    w.__irisComparison = { originals, current, references, saved, reference, diff, region, noise: diff(first, reference), mode: phong ? 'Phong' : 'Standard' };
  }, { side, phong });
  await photo(page, name + '-before');
  const comparison = await page.evaluate(() => {
    const w = window as any, p = w.__irisComparison, renderer = w.__irisRenderer;
    for (const [part, original] of p.originals) part.material = p.current.get(original);
    renderer.render(w.__irisScene, w.__irisCamera); const gl = renderer.getContext(), pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return { mode: p.mode, region: p.region, noise: p.noise, difference: p.diff(p.reference, pixels), shaderFailures: renderer.info.programs.filter((program: any) => program.diagnostics?.runnable === false).length };
  });
  await photo(page, name + '-after');
  await page.evaluate(() => {
    const w = window as any, p = w.__irisComparison, c = w.__irisCamera;
    for (const [part, original] of p.originals) part.material = original;
    for (const material of p.references.values()) material.dispose();
    for (const [original, current] of p.current) if (current !== original) current.dispose();
    c.position.copy(p.saved.position); c.quaternion.copy(p.saved.quaternion); c.up.copy(p.saved.up); c.near = p.saved.near; c.far = p.saved.far; c.fov = p.saved.fov;
    c.updateProjectionMatrix(); c.updateMatrixWorld(true); w.__irisRenderer.render(w.__irisScene, c); delete w.__irisComparison;
  });
  const restored = await audit(page); healthy(restored); expect(restored).toEqual(initial);
  expect(comparison.shaderFailures).toBe(0);
  expect(comparison.difference.upper, 'new upper-lid depth is visible on the actual iris').toBeGreaterThan(comparison.noise.upper + 40);
  expect(comparison.difference.upperDelta).toBeLessThan(0);
  expect(comparison.difference.lower).toBeLessThanOrEqual(comparison.noise.lower + 3);
  expect(comparison.difference.outside).toBeLessThanOrEqual(comparison.noise.outside + 3);
  expect(comparison.difference.alpha).toBe(0);
  return { initial, restored, comparison };
}

for (const [species, side, phong] of [['tyrannosaurus', 1, false], ['microraptor', -1, true], ['brachiosaurus', 1, false]] as const) {
  test(species + ' keeps the eye stack intact while adding iris depth in ' + (phong ? 'Phong' : 'Standard'), async ({ page }) => {
    await mount(page, species); const result = await compareEye(page, side, phong, species + '-eye');
    if (species === 'tyrannosaurus') {
      await page.locator('.dinolab-surface-presets').getByRole('button', { name: /Fossil anchors/ }).click(); await settle(page);
      const bones = await audit(page); healthy(bones, false); expect(bones.eyes).toHaveLength(0);
      await page.locator('.dinolab-surface-presets').getByRole('button', { name: /Life view/ }).click(); await settle(page); healthy(await audit(page));
    } else if (species === 'microraptor') {
      const summary = page.locator('.dinolab-3d-controls-disclosure > summary');
      if (!(await summary.evaluate(node => node.parentElement!.hasAttribute('open')))) await summary.click();
      for (const name of ['Surface detail', 'Rim light', 'Balanced']) {
        await page.getByRole('button', { name: name + ' studio lighting', exact: true }).click(); await settle(page);
        const row = await audit(page); healthy(row); expect(row.eyes).toEqual(result.initial.eyes); expect(row.camera).toEqual(result.initial.camera);
      }
    } else {
      await page.setViewportSize({ width: 320, height: 844 }); await settle(page); const phone = await audit(page); healthy(phone);
      expect(phone.eyes).toEqual(result.initial.eyes); await photo(page, species + '-phone-head');
    }
    fs.writeFileSync(report + '/' + phase + '-' + species + '-audit.json', JSON.stringify(result, null, 2));
  });
}
