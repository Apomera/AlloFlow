import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
const report = path.resolve('reports/dinolab-species-anatomy');
const probes = 'var DepthRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new DepthRenderer(o),f=r.render.bind(r);r.render=function(s,c){window.__depthScene=s;window.__depthCamera=c;window.__depthRenderer=r;return f(s,c)};return r};';
const options = { toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document' as const, appStyles: true, probes };
const harness = new GlHarness(options);
let baseline: GlHarness | undefined;
test.beforeAll(async () => {
  fs.mkdirSync(report, { recursive: true });
  if (process.env.DINO_SPECIES_BASELINE) {
    const previous = process.env.STEM_GL_SUBSTITUTE;
    process.env.STEM_GL_SUBSTITUTE = 'stem_lab/stem_tool_dinolab.js=' + path.resolve(process.env.DINO_SPECIES_BASELINE);
    baseline = new GlHarness(options); await baseline.start();
    if (previous === undefined) delete process.env.STEM_GL_SUBSTITUTE; else process.env.STEM_GL_SUBSTITUTE = previous;
  }
  await harness.start();
});
test.afterAll(async () => { await harness.stop(); await baseline?.stop(); });
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, species: string, owner = harness, overrides: Record<string, unknown> = {}) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await owner.mount(page, { dinoLab: { tab: 'field3d', field3dSelected: species, field3dStage: 'studio',
    field3dOrientationDismissed: true, field3dAutoRotate: false, field3dReconstructionMode: 'evidence',
    field3dShowSkeleton: false, field3dShowBody: true, field3dBodyOpacity: 100,
    field3dShowHuman: false, field3dShowEvidence: false, field3dLabelMode: 'key', ...overrides } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8');
  const start = css.indexOf(':root, .theme-default {');
  const end = css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start));
  await page.addStyleTag({ content: css.slice(start, end) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__depthScene?.getObjectByName('dinolab-specimen'))).toBe(true);
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
}
async function portrait(page: Page, file: string) {
  const clean = await page.addStyleTag({ content: '.dinolab-3d-readouts,.dinolab-3d-status,.dinolab-3d-camera-readout,.dinolab-viewer-actions,[data-dino-part-label],[data-dino-part-line]{visibility:hidden!important}' });
  await page.locator('canvas.dinolab-3d-canvas').screenshot({ path: path.join(report, file) });
  await clean.evaluate(el => el.remove());
}
async function audit(page: Page) {
  return page.evaluate(() => {
    const w = window as any, model = w.__depthScene.getObjectByName('dinolab-specimen');
    let invalid = 0; const coats: any[] = [];
    model.traverse((mesh: any) => {
      if (!mesh.geometry) return;
      for (const a of Object.values(mesh.geometry.attributes) as any[]) if (!Array.from(a.array).every(Number.isFinite)) invalid++;
      if (mesh.userData.dinoFeature === 'contour-plumage') coats.push({ region: mesh.userData.dinoRegion, ...mesh.geometry.parameters, vertices: mesh.geometry.attributes.position.count });
    });
    return { invalid, coats, longSnout: model.userData.dinoLongSnoutedTyrannosaur,
      shaderFailures: w.__depthRenderer.info.programs.filter((p: any) => p.diagnostics?.runnable === false).length,
      errors: w.__events.errors, lost: w.__glLive().lost };
  });
}

async function select(page: Page, part: string) {
  if (!await page.locator('#dinolab-part-picker').count()) await page.getByRole('button', { name: 'Explore anatomy', exact: true }).click();
  await page.locator('#dinolab-part-picker').selectOption(part);
}
async function viewpoint(page: Page, id: string) {
  const activity = page.locator('.dinolab-part-viewpoint');
  if (!await activity.evaluate((el: HTMLDetailsElement) => el.open)) await activity.locator('summary').click();
  await activity.locator('[data-dino-part-view=' + id + ']').click();
}
async function sound(page: Page) {
  const result = await audit(page);
  expect(result.invalid).toBe(0); expect(result.shaderFailures).toBe(0); expect(result.errors).toEqual([]); expect(result.lost).toBe(false);
}

test('four lambeosaur crests retain distinct rounded anatomy in bone and life views', async ({ page }) => {
  const records: any[] = [];
  const profiles: Record<string, string> = { parasaurolophus: 'parasaurolophus-tube', corythosaurus: 'corythosaurus-helmet',
    lambeosaurus: 'lambeosaurus-hatchet', olorotitan: 'olorotitan-fan' };
  const extra = async () => page.evaluate(() => {
    const w = window as any, model = w.__depthScene.getObjectByName('dinolab-specimen'), meshes: any[] = [];
    model.traverse((mesh: any) => { if (mesh.geometry && mesh.userData.dinoLambeosaurCrest) meshes.push({ ...mesh.userData.dinoLambeosaurCrest,
      name: mesh.name, vertices: mesh.geometry.attributes.position.count, bounds: [mesh.geometry.boundingBox.min.toArray(), mesh.geometry.boundingBox.max.toArray()] }); });
    return { profile: model.userData.dinoLambeosaurCrest, meshes, camera: w.__depthCamera.position.toArray() };
  });
  for (const species of Object.keys(profiles)) {
    if (baseline) {
      await mount(page, species, baseline); await select(page, 'crest'); await viewpoint(page, 'side');
      await portrait(page, species + '-crest-before.png'); await baseline.destroy(page);
    }
    await mount(page, species); await select(page, 'crest'); await viewpoint(page, 'side');
    await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
    const life = await extra(); expect(life.meshes).toHaveLength(1); expect(life.profile.profile).toBe(profiles[species]);
    expect(life.meshes[0].core).toBe(false); expect(life.meshes[0].lumenModeled).toBe(false);
    expect(life.meshes[0].wallThicknessMeasured).toBe(false); expect(life.meshes[0].dimensionsInterpretive).toBe(true);
    await sound(page); await portrait(page, species + '-crest-life-side.png');
    await viewpoint(page, 'front'); await portrait(page, species + '-crest-life-front.png');
    const camera = await page.evaluate(() => (window as any).__depthCamera.position.toArray());
    await page.locator('[data-dino-part-inspect=bone]').click();
    await expect(page.locator('[data-dino-part-inspect=bone]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
    const bone = await extra(); expect(bone.meshes).toHaveLength(1); expect(bone.meshes[0].core).toBe(true);
    expect(bone.profile.profile).toBe(profiles[species]);
    bone.camera.forEach((v: number, i: number) => expect(v).toBeCloseTo(camera[i], 5));
    await sound(page); await viewpoint(page, 'side'); await portrait(page, species + '-crest-bone-side.png');
    records.push({ species, life, bone }); await harness.destroy(page);
  }
  fs.writeFileSync(path.join(report, 'crest-audit.json'), JSON.stringify(records, null, 2));
});

test('three stegosaurs expose species-specific plates and posterior spines in bone and life', async ({ page }) => {
  const profiles: Record<string, string> = { kentrosaurus: 'small-plates-to-paired-spines', tuojiangosaurus: 'regional-pointed-plates', hesperosaurus: 'long-low-plates' };
  const records: any[] = [];
  const armor = () => page.evaluate(() => {
    const model = (window as any).__depthScene.getObjectByName('dinolab-specimen'), meshes: any[] = [];
    model.traverse((mesh: any) => { if (mesh.geometry && mesh.userData.dinoStegosaurArmor) meshes.push({ ...mesh.userData.dinoStegosaurArmor,
      region: mesh.userData.dinoRegion, feature: mesh.userData.dinoFeature, parts: mesh.userData.dinoPartIds, vertices: mesh.geometry.attributes.position.count }); });
    return { profile: model.userData.dinoStegosaurArmor, meshes };
  });
  for (const species of Object.keys(profiles)) {
    if (baseline) { await mount(page, species, baseline); await portrait(page, species + '-armor-before.png'); await baseline.destroy(page); }
    await mount(page, species); await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
    const life = await armor(); expect(life.profile.profile).toBe(profiles[species]);
    expect(life.profile.referenceIndependentOfSkin).toBe(true); expect(life.meshes.length).toBeGreaterThan(8);
    expect(life.meshes.every((mesh: any) => mesh.core === false && mesh.sampledArrangement && mesh.placementIsInterpretive)).toBe(true);
    if (species === 'kentrosaurus') {
      const posterior = life.meshes.filter((mesh: any) => mesh.feature === 'dorsal-spike');
      expect(posterior).toHaveLength(2); expect(posterior.every((mesh: any) => mesh.region === 'torso' && mesh.parts.includes('spikes') && !mesh.parts.includes('plates'))).toBe(true);
      expect(life.meshes.some((mesh: any) => mesh.feature === 'tail-spike')).toBe(true);
    }
    if (species === 'tuojiangosaurus') expect(new Set(life.meshes.map((mesh: any) => mesh.shape))).toEqual(new Set(['pear', 'triangle', 'lance', 'inferred-terminal']));
    await sound(page); await portrait(page, species + '-armor-life.png');
    await select(page, 'plates'); await page.locator('[data-dino-part-inspect=bone]').click();
    await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
    await expect.poll(async () => (await armor()).meshes.every((mesh: any) => mesh.core)).toBe(true);
    const bone = await armor(); expect(bone.meshes).toHaveLength(life.meshes.length);
    await sound(page); await portrait(page, species + '-armor-bone.png');
    records.push({ species, life, bone }); await harness.destroy(page);
  }
  fs.writeFileSync(path.join(report, 'armor-audit.json'), JSON.stringify(records, null, 2));
});

test('shape investigation preserves an actual 3D direction and the original progress while connecting to the notebook', async ({ page }) => {
  const prediction = 'The helmet should be rounder in side view and narrow from the front.';
  await mount(page, 'parasaurolophus', harness, {
    field3dAutoRotate: true, field3dWorkflowStarted: true,
    field3dScanSpecies: 'parasaurolophus', field3dScanLogged: { skull: true },
    field3dAssemblySpecies: 'parasaurolophus', field3dAssemblyPlaced: { skull: true },
    field3dClaimBoneSpecies: 'parasaurolophus', field3dClaimBone: 'skull',
    compareInquiry: { version: 1, pairs: [{ key: 'corythosaurus|parasaurolophus', a: 'parasaurolophus', b: 'corythosaurus',
      step: 'inspect', prediction, evidence: [], explanation: '', limit: '' }] }
  });
  const details = page.locator('.dinolab-shape-study');
  await details.locator('summary').click(); await details.locator('[data-dino-shape-family=crests]').click();
  await expect(details.locator('blockquote')).toContainText(prediction);
  const state = () => page.evaluate(() => (window as any).__toolData.dinoLab);
  const progress = (await state()).field3dProgress;
  const canvas = page.locator('canvas.dinolab-3d-canvas');
  const pose = async () => {
    await canvas.scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => (window as any).__depthScene.getObjectByName('dinolab-specimen').userData.dinoShapeComparison?.species)).toBe((await state()).field3dSelected);
    return page.evaluate(() => {
      const w = window as any, direction = new w.THREE.Vector3(); w.__depthCamera.getWorldDirection(direction);
      const model = w.__depthScene.getObjectByName('dinolab-specimen');
      return { ...model.userData.dinoShapeComparison, cameraDirection: direction.toArray(), modelRotation: [model.rotation.x, model.rotation.y, model.rotation.z] };
    });
  };
  await canvas.focus(); await canvas.press('ArrowRight'); await canvas.press('ArrowRight'); await canvas.press('ArrowUp'); await canvas.press('PageUp');
  const a = await pose(); expect(a.independentlyFitted).toBe(true); expect(a.region).toBe('head');
  await portrait(page, 'shape-comparison-a.png');
  await details.locator('[data-dino-shape-side=b]').click();
  const b = await pose();
  for (const field of ['yaw', 'pitch', 'zoom', 'hypothesis']) expect(b[field]).toBe(a[field]);
  b.cameraDirection.forEach((value: number, i: number) => expect(value).toBeCloseTo(a.cameraDirection[i], 6));
  b.modelRotation.forEach((value: number, i: number) => expect(value).toBeCloseTo(a.modelRotation[i], 6));
  expect((await state()).field3dScanLogged).toEqual({}); expect((await state()).field3dAssemblyPlaced).toEqual({});
  expect((await state()).field3dClaimBone).toBeNull(); expect((await state()).field3dProgress).toEqual(progress);
  await portrait(page, 'shape-comparison-b.png');
  await details.locator('[data-dino-shape-layer=life]').click(); await details.locator('[data-dino-shape-side=a]').click();
  const back = await pose(); for (const field of ['yaw', 'pitch', 'zoom']) expect(back[field]).toBe(a[field]);
  expect((await state()).field3dProgress).toEqual(progress); await sound(page);
  await details.locator('[data-dino-shape-notebook]').click();
  await expect(page.getByLabel('3D model observation (reconstruction)', { exact: true })).toBeVisible();
  await page.getByLabel('3D model observation (reconstruction)', { exact: true }).check();
  const notebook = await state(); expect(notebook.compareInquiry.pairs[0].prediction).toBe(prediction);
  expect(notebook.compareInquiry.pairs[0].evidence).toContain('model'); expect(notebook.field3dProgress).toEqual(progress);
  expect(notebook.field3dAutoRotate).toBe(true);
  await page.locator('[data-dino-shape-resume=crests]').click();
  await page.locator('[data-dino-shape-family=armor]').click(); await page.locator('[data-dino-shape-side=b]').click();
  await page.setViewportSize({ width: 390, height: 844 }); await pose();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('[data-dino-shape-side=a]').focus(); await page.keyboard.press('Enter');
  expect((await state()).field3dSelected).toBe('stegosaurus');
  await page.locator('.dinolab-shape-study').screenshot({ path: path.join(report, 'shape-comparison-mobile.png') });
  await page.locator('[data-dino-shape-exit]').click();
  expect((await state()).field3dShapeStudy).toBeNull(); expect((await state()).field3dAutoRotate).toBe(true);
  expect((await state()).field3dProgress).toEqual(progress); await sound(page);
  fs.writeFileSync(path.join(report, 'shape-comparison-audit.json'), JSON.stringify({ a, b, back, progress }, null, 2));
});


