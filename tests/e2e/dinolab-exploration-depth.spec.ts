import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
const report = path.resolve('reports/dinolab-exploration-depth');
const probes = 'var DepthRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new DepthRenderer(o),f=r.render.bind(r);r.render=function(s,c){window.__depthScene=s;window.__depthCamera=c;window.__depthRenderer=r;return f(s,c)};return r};';
const options = { toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document' as const, appStyles: true, probes };
const harness = new GlHarness(options);
let baseline: GlHarness | undefined;
test.beforeAll(async () => {
  fs.mkdirSync(report, { recursive: true });
  if (process.env.DINO_EXPLORATION_BASELINE) {
    const previous = process.env.STEM_GL_SUBSTITUTE;
    process.env.STEM_GL_SUBSTITUTE = 'stem_lab/stem_tool_dinolab.js=' + path.resolve(process.env.DINO_EXPLORATION_BASELINE);
    baseline = new GlHarness(options); await baseline.start();
    if (previous === undefined) delete process.env.STEM_GL_SUBSTITUTE; else process.env.STEM_GL_SUBSTITUTE = previous;
  }
  await harness.start();
});
test.afterAll(async () => { await harness.stop(); await baseline?.stop(); });
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, species: string, owner = harness) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await owner.mount(page, { dinoLab: { tab: 'field3d', field3dSelected: species, field3dStage: 'studio',
    field3dOrientationDismissed: true, field3dAutoRotate: false, field3dReconstructionMode: 'evidence',
    field3dShowSkeleton: false, field3dShowBody: true, field3dBodyOpacity: 100,
    field3dShowHuman: false, field3dShowEvidence: false, field3dLabelMode: 'key' } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8');
  const start = css.indexOf(':root, .theme-default {');
  const end = css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start));
  await page.addStyleTag({ content: css.slice(start, end) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__depthScene?.getObjectByName('dinolab-specimen'))).toBe(true);
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
}
async function portrait(page: Page, file: string) {
  const clean = await page.addStyleTag({ content: '.dinolab-3d-readouts,.dinolab-3d-status,.dinolab-3d-camera-readout,.dinolab-viewer-actions,[data-dino-part-label]{visibility:hidden!important}' });
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

async function extra(page: Page) {
  return page.evaluate(() => {
    const w = window as any, model = w.__depthScene.getObjectByName('dinolab-specimen');
    const nasal: any[] = [], feathers: any[] = []; let deepTail: any, neural = 0, chevrons = 0;
    model.traverse((mesh: any) => {
      if (mesh.userData.dinoNasalRugosity) nasal.push({ ...mesh.userData.dinoNasalRugosity, vertices: mesh.geometry.attributes.position.count });
      if (mesh.userData.dinoFeatherVaneProfile) feathers.push({ ...mesh.userData.dinoFeatherVaneProfile, tract: mesh.userData.dinoFeatherTract });
      if (mesh.userData.dinoDeepTail) deepTail = mesh.userData.dinoDeepTail;
      if (mesh.name === 'spinosaurus-caudal-neural-spine') neural++;
      if (mesh.name === 'spinosaurus-elongate-chevron') chevrons++;
    });
    return { nasal, feathers, deepTail, neural, chevrons };
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
test('nasal ornaments stay surface seated and explorable in both reconstruction layers', async ({ page }) => {
  const records: any[] = [];
  for (const species of ['alioramus', 'qianzhousaurus']) {
    if (baseline) {
      await mount(page, species, baseline); await page.getByRole('button', { name: 'Study head details', exact: true }).click();
      await portrait(page, species + '-before.png'); await baseline.destroy(page);
    }
    await mount(page, species); await select(page, 'nasal-rugosities'); await viewpoint(page, 'side');
    const life = await extra(page), count = species === 'alioramus' ? 3 : 4;
    expect(life.nasal).toHaveLength(count); expect(life.nasal.every(p => !p.core && p.surfaceSeated && p.count === count)).toBe(true);
    await sound(page); await portrait(page, species + '-life-side.png'); await viewpoint(page, 'overhead');
    await portrait(page, species + '-life-overhead.png');
    const camera = await page.evaluate(() => (window as any).__depthCamera.position.toArray());
    await page.locator('[data-dino-part-inspect=bone]').click();
    await expect(page.locator('#dinolab-part-picker')).toHaveValue('nasal-rugosities');
    const bone = await extra(page); expect(bone.nasal).toHaveLength(count); expect(bone.nasal.every(p => p.core)).toBe(true);
    const after = await page.evaluate(() => (window as any).__depthCamera.position.toArray());
    after.forEach((v: number, i: number) => expect(v).toBeCloseTo(camera[i], 5));
    await sound(page); await viewpoint(page, 'side'); await portrait(page, species + '-bone-side.png');
    records.push({ species, life, bone }); await harness.destroy(page);
  }
  fs.writeFileSync(path.join(report, 'nasal-audit.json'), JSON.stringify(records, null, 2));
});
test('deep Spinosaurus tail reveals different side and overhead outlines with matching bone supports', async ({ page }) => {
  if (baseline) {
    await mount(page, 'spinosaurus', baseline); await page.getByRole('button', { name: 'Study tail details', exact: true }).click();
    await portrait(page, 'spinosaurus-tail-before.png'); await baseline.destroy(page);
  }
  await mount(page, 'spinosaurus'); await select(page, 'tail'); await viewpoint(page, 'side');
  const life = await extra(page); expect(life.deepTail.stations).toBe(8); await sound(page);
  await portrait(page, 'spinosaurus-tail-side.png'); await viewpoint(page, 'overhead'); await portrait(page, 'spinosaurus-tail-overhead.png');
  await expect(page.locator('.dinolab-part-viewpoint')).toContainText('Shape alone does not establish habitual swimming');
  const before = await page.evaluate(() => {
    const w = window as any; w.__tailRenderer = w.__depthRenderer;
    return { position: w.__depthCamera.position.toArray(), quaternion: w.__depthCamera.quaternion.toArray() };
  });
  await page.locator('[data-dino-part-inspect=bone]').click();
  const bone = await extra(page); expect(bone.neural).toBe(13); expect(bone.chevrons).toBe(12);
  const after = await page.evaluate(() => {
    const w = window as any; return { sameRenderer: w.__tailRenderer === w.__depthRenderer, position: w.__depthCamera.position.toArray(), quaternion: w.__depthCamera.quaternion.toArray() };
  });
  expect(after.sameRenderer).toBe(true);
  after.position.forEach((v: number, i: number) => expect(v).toBeCloseTo(before.position[i], 5));
  after.quaternion.forEach((v: number, i: number) => expect(v).toBeCloseTo(before.quaternion[i], 5));
  await expect(page.locator('#dinolab-part-picker')).toHaveValue('tail'); await sound(page);
  await viewpoint(page, 'side'); await portrait(page, 'spinosaurus-tail-bones.png');
  await page.setViewportSize({ width: 390, height: 844 });
  const activity = page.locator('.dinolab-part-viewpoint');
  expect(await activity.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await activity.screenshot({ path: path.join(report, 'viewpoint-task-mobile.png') });
  fs.writeFileSync(path.join(report, 'tail-audit.json'), JSON.stringify({ life, bone }, null, 2));
});
test('reviewed feather vanes render with species and tract evidence attached', async ({ page }) => {
  const records: any[] = [];
  for (const species of ['anchiornis', 'caudipteryx', 'microraptor']) {
    await mount(page, species); await page.getByRole('button', { name: 'Study body details', exact: true }).click();
    const result = await extra(page); await sound(page);
    if (species === 'microraptor') expect(result.feathers).toHaveLength(0);
    else { expect(result.feathers.length).toBeGreaterThan(0); expect(result.feathers.every(p => p.leftScale === p.rightScale)).toBe(true); }
    await portrait(page, species + '-feather-vanes.png'); records.push({ species, ...result }); await harness.destroy(page);
  }
  fs.writeFileSync(path.join(report, 'vane-audit.json'), JSON.stringify(records, null, 2));
});
