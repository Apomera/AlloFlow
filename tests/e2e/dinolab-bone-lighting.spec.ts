import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0 });
test.use({ video: 'off', trace: 'off', actionTimeout: 60_000 });
const report = 'reports/dinolab-bone-lighting';
const original = {
  balanced: [.30, .65, 1.25, .50, .95],
  detail: [.16, .42, 1.45, .22, .55],
  rim: [.18, .48, .78, .28, 1.85],
};
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1180, height: 920, layout: 'document', appStyles: true,
  probes: 'var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),draw=r.render.bind(r);r.render=function(s,c){window.__boneScene=s;window.__boneCamera=c;window.__boneRenderer=r;return draw(s,c);};return r;};' });
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
const canvas = (page: Page) => page.locator('canvas.dinolab-3d-canvas');
async function settle(page: Page) {
  await canvas(page).scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
async function mount(page: Page, species: string, width = 1180) {
  await page.setViewportSize({ width, height: width < 500 ? 844 : 920 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', selected: species, field3dSelected: species, field3dStage: 'studio', field3dReconstructionMode: 'evidence',
    field3dAutoRotate: false, field3dOrientationDismissed: true, field3dWorkflowStarted: false, field3dShowSkeleton: true, field3dShowBody: false,
    field3dShowHuman: false, field3dShowEvidence: false, field3dBodyOpacity: 28 } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  await page.addStyleTag({ content: css.slice(start, css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start))) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__boneScene?.getObjectByName('dinolab-specimen'))).toBe(true);
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click(); await settle(page);
}
async function controls(page: Page) {
  const summary = page.locator('.dinolab-3d-controls-disclosure > summary');
  if (!(await summary.evaluate(node => node.parentElement!.hasAttribute('open')))) await summary.click();
}
async function inspect(page: Page) {
  return page.evaluate(() => {
    const w = window as any, scene = w.__boneScene, camera = w.__boneCamera, renderer = w.__boneRenderer, model = scene.getObjectByName('dinolab-specimen');
    const geometries: string[] = [], materials = new Map(), anchors: any[] = [];
    model.traverse((part: any) => {
      if (part.isMesh) {
        geometries.push(part.geometry.uuid);
        for (const mat of (Array.isArray(part.material) ? part.material : [part.material])) materials.set(mat.uuid, { uuid: mat.uuid, color: mat.color?.toArray(), roughness: mat.roughness, key: mat.customProgramCacheKey(), map: mat.map?.uuid });
      } else if (part.userData.dinoBodyPart) anchors.push([part.userData.dinoBodyPart, part.position.toArray()]);
    });
    renderer.render(scene, camera);
    return { model: model.uuid, geometries, materials: [...materials.values()], anchors, camera: camera.position.toArray(), quaternion: camera.quaternion.toArray(), projection: camera.projectionMatrix.toArray(),
      lights: ['ambient', 'hemisphere', 'key', 'fill', 'rim'].map(name => { const light = scene.getObjectByName('dinolab-' + name + '-light'); return { name, intensity: light.intensity, position: light.position.toArray() }; }),
      mode: scene.userData.dinoStudioLighting, state: w.__toolData.dinoLab, memory: { ...renderer.info.memory }, errors: w.__events.errors, lost: w.__glLive().lost,
      shaderFailures: renderer.info.programs.filter((p: any) => p.diagnostics?.runnable === false).length, fits: document.documentElement.scrollWidth <= innerWidth };
  });
}
function healthy(row: Awaited<ReturnType<typeof inspect>>) {
  expect(row.errors).toEqual([]); expect(row.lost).toBe(false); expect(row.shaderFailures).toBe(0); expect(row.fits).toBe(true);
  expect(row.geometries.length).toBeGreaterThan(20); expect(row.camera.every(Number.isFinite)).toBe(true);
}
function checkLight(row: Awaited<ReturnType<typeof inspect>>, mode: keyof typeof original, bones: boolean) {
  healthy(row); expect(row.mode).toBe(mode);
  row.lights.forEach((light, i) => {
    if (bones) { expect(light.intensity).toBeGreaterThan(0); expect(light.intensity).toBeLessThanOrEqual(original[mode][i]); }
    else expect(light.intensity).toBe(original[mode][i]);
  });
  if (bones) for (const index of [0, 1, 3]) expect(row.lights[index].intensity).toBeLessThan(original[mode][index]);
}
async function photo(page: Page, name: string) { await settle(page); await canvas(page).screenshot({ path: report + '/' + name + '.png' }); }
async function comparison(page: Page, name: string) {
  const before = await inspect(page), levels = before.lights.map(light => light.intensity);
  // Photograph the former illumination on this exact scene, then restore the
  // application's lighting. No geometry, material, state or camera changes.
  async function setLights(values: number[]) {
    await page.evaluate(values => {
      const w = window as any;
      ['ambient', 'hemisphere', 'key', 'fill', 'rim'].forEach((name, i) => { w.__boneScene.getObjectByName('dinolab-' + name + '-light').intensity = values[i]; });
      w.__boneRenderer.render(w.__boneScene, w.__boneCamera);
    }, values);
  }
  await setLights(original[before.mode as keyof typeof original]); await photo(page, name + '-before');
  await setLights(levels); await photo(page, name + '-after'); const after = await inspect(page);
  expect(after).toEqual(before); return after;
}

test('bone studio shows skull and rib relief while preset changes retain model, landmarks and camera', async ({ page }) => {
  await mount(page, 'tyrannosaurus');
  await page.getByRole('button', { name: 'Study head details', exact: true }).click(); await settle(page);
  const initial = await comparison(page, 'tyrannosaurus-head'); checkLight(initial, 'balanced', true);
  await controls(page); const rows = [];
  for (const [mode, label] of [['detail', 'Surface detail'], ['rim', 'Rim light'], ['balanced', 'Balanced']] as const) {
    await page.getByRole('button', { name: label + ' studio lighting', exact: true }).click(); await settle(page);
    const row = await inspect(page); checkLight(row, mode, true);
    for (const field of ['model', 'geometries', 'materials', 'anchors', 'camera', 'quaternion', 'projection', 'state', 'memory'] as const) expect(row[field], field + ' retained').toEqual(initial[field]);
    if (mode === 'balanced') expect(row.lights).toEqual(initial.lights); else await photo(page, 'tyrannosaurus-head-' + mode);
    rows.push(row);
  }
  await page.getByRole('button', { name: 'Study body details', exact: true }).click(); await settle(page);
  const body = await comparison(page, 'tyrannosaurus-body'); checkLight(body, 'balanced', true);
  fs.writeFileSync(report + '/desktop-audit.json', JSON.stringify({ initial, rows, body }, null, 2));
});

test('small phone and large skeleton views keep illumination scoped to bare bones', async ({ page }) => {
  await mount(page, 'archaeopteryx', 320);
  const small = await comparison(page, 'archaeopteryx-320px'); checkLight(small, 'balanced', true);
  await controls(page);
  await page.getByRole('button', { name: 'Surface detail studio lighting', exact: true }).click(); await settle(page); checkLight(await inspect(page), 'detail', true);
  const presets = page.locator('.dinolab-surface-presets');
  await presets.getByRole('button', { name: /Body inference/ }).click(); await settle(page); const ghost = await inspect(page); checkLight(ghost, 'detail', false);
  expect(ghost.state.field3dShowBody).toBe(true); expect(ghost.state.field3dShowSkeleton).toBe(true);
  await presets.getByRole('button', { name: /Life view/ }).click(); await settle(page); const life = await inspect(page); checkLight(life, 'detail', false);
  expect(life.state.field3dShowSkeleton).toBe(false);
  await presets.getByRole('button', { name: /Fossil anchors/ }).click(); await settle(page); const bones = await inspect(page); checkLight(bones, 'detail', true);
  const lighting = page.getByRole('group', { name: 'Scene lighting', exact: true });
  await lighting.getByRole('button', { name: 'Habitat', exact: true }).click(); await settle(page); const habitat = await inspect(page); healthy(habitat); expect(habitat.mode).toBe('habitat');
  await lighting.getByRole('button', { name: 'Studio', exact: true }).click(); await settle(page); const returned = await inspect(page); checkLight(returned, 'detail', true);
  expect(returned.lights).toEqual(bones.lights);
  await page.getByRole('combobox', { name: /species|dinosaur/i }).first().selectOption('brachiosaurus');
  await page.setViewportSize({ width: 1180, height: 920 }); await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
  await page.getByRole('button', { name: 'Balanced studio lighting', exact: true }).click(); await settle(page);
  const large = await comparison(page, 'brachiosaurus-whole'); checkLight(large, 'balanced', true);
  fs.writeFileSync(report + '/layer-and-scale-audit.json', JSON.stringify({ small, ghost, life, bones, habitat, returned, large }, null, 2));
});
