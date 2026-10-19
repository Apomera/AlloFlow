import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
const phase = process.env.DINO_FULL_BODY_PHASE === 'before' ? 'before' : 'after';
const report = path.resolve('reports/dinolab-full-body');
const probes = 'var BodyRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new BodyRenderer(o),f=r.render.bind(r);r.render=function(s,c){window.__bodyScene=s;window.__bodyCamera=c;window.__bodyRenderer=r;return f(s,c)};return r};';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document', appStyles: true, probes });
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, species: string) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', field3dSelected: species, field3dStage: 'studio', field3dOrientationDismissed: true,
    field3dAutoRotate: false, field3dReconstructionMode: 'evidence', field3dShowSkeleton: false, field3dShowBody: true,
    field3dBodyOpacity: 100, field3dShowHuman: false, field3dShowEvidence: false, field3dLabelMode: 'key' } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  const end = css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start));
  await page.addStyleTag({ content: css.slice(start, end) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__bodyScene?.getObjectByName('dinolab-specimen'))).toBe(true);
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
}
async function portrait(page: Page, file: string) {
  const clean = await page.addStyleTag({ content: '.dinolab-3d-readouts,.dinolab-3d-status,.dinolab-3d-camera-readout,.dinolab-viewer-actions,[data-dino-part-label],[data-dino-part-line]{visibility:hidden!important}' });
  await page.locator('canvas.dinolab-3d-canvas').screenshot({ path: path.join(report, file) });
  await clean.evaluate(el => el.remove());
}
async function view(page: Page, direction: 'Side' | 'Front') {
  if (!await page.locator('.dinolab-3d-controls-disclosure').count()) await page.getByRole('button', { name: 'Explore anatomy', exact: true }).click();
  const controls = page.locator('.dinolab-3d-controls-disclosure');
  if (!await controls.evaluate((node: HTMLDetailsElement) => node.open)) await controls.locator('summary').click();
  await controls.getByRole('button', { name: direction + ' camera view', exact: true }).click();
  await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
}
async function audit(page: Page) {
  await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
  return page.evaluate(() => {
    const w = window as any, model = w.__bodyScene.getObjectByName('dinolab-specimen');
    let invalid = 0, triangles = 0; const parts: any[] = [];
    model.traverse((mesh: any) => {
      if (mesh.userData.dinoBodyPart) parts.push({ id: mesh.userData.dinoBodyPart, point: mesh.getWorldPosition(new w.THREE.Vector3()).toArray() });
      if (!mesh.geometry) return;
      for (const attr of Object.values(mesh.geometry.attributes) as any[]) if (!Array.from(attr.array).every(Number.isFinite)) invalid++;
      triangles += (mesh.geometry.index?.count || 0) / 3;
    });
    return { anatomy: model.userData.dinoFullBodyAnatomy, invalid, triangles, parts, bounds: new w.THREE.Box3().setFromObject(model).getSize(new w.THREE.Vector3()).toArray(),
      shaderFailures: w.__bodyRenderer.info.programs.filter((program: any) => program.diagnostics?.runnable === false).length,
      errors: w.__events.errors, lost: w.__glLive().lost };
  });
}
function sound(record: any) {
  expect(record.invalid).toBe(0); expect(record.triangles).toBeGreaterThan(1000);
  expect(record.shaderFailures).toBe(0); expect(record.errors).toEqual([]); expect(record.lost).toBe(false);
  expect(record.bounds.every((value: number) => Number.isFinite(value) && value > 0)).toBe(true);
}

for (const [family, species] of Object.entries({ sauropods: ['brachiosaurus', 'diplodocus', 'apatosaurus', 'camarasaurus'], ornithopods: ['iguanodon', 'edmontosaurus', 'maiasaura'] })) {
  test(family + ' share anatomically consistent full-body bone and life frames', async ({ page }) => {
    const records: any[] = [];
    for (const id of species) {
      await mount(page, id);
      const canvas = page.locator('canvas.dinolab-3d-canvas');
      await view(page, 'Side');
      const life = await audit(page); sound(life);
      if (phase === 'after') { expect(life.anatomy.family).toBe(family); expect(life.anatomy.limbs).toHaveLength(4); }
      await portrait(page, id + '-' + phase + '-life-side.png');
      await view(page, 'Front');
      await portrait(page, id + '-' + phase + '-life-front.png');
      if (!await page.locator('#dinolab-part-picker').count()) await page.getByRole('button', { name: 'Explore anatomy', exact: true }).click();
      await page.locator('#dinolab-part-picker').selectOption('trunk');
      await page.locator('[data-dino-part-inspect=bone]').click();
      await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
      await view(page, 'Side');
      const bone = await audit(page); sound(bone);
      if (phase === 'after') {
        expect(bone.anatomy.family).toBe(family); expect(bone.anatomy.limbs).toEqual(life.anatomy.limbs);
        expect(bone.anatomy.anchors).toEqual(life.anatomy.anchors);
      }
      await portrait(page, id + '-' + phase + '-bone-side.png');
      records.push({ species: id, life, bone }); await harness.destroy(page);
    }
    fs.writeFileSync(path.join(report, family + '-' + phase + '-audit.json'), JSON.stringify(records, null, 2));
  });
}

test('full-body investigation lenses update real labels without rebuilding or refitting the model', async ({ page }) => {
  test.skip(phase === 'before', 'New investigation is verified against the revised source.');
  await mount(page, 'brachiosaurus');
  const study = page.locator('.dinolab-shape-study');
  await study.locator('summary').click(); await study.locator('[data-dino-shape-family=sauropods]').click();
  const canvas = page.locator('canvas.dinolab-3d-canvas');
  const snapshot = async () => {
    await canvas.scrollIntoViewIfNeeded();
    return page.evaluate(() => {
      const w = window as any, model = w.__bodyScene.getObjectByName('dinolab-specimen'), geometry: string[] = [];
      model.traverse((mesh: any) => { if (mesh.geometry) geometry.push(mesh.geometry.uuid); });
      return { ...model.userData.dinoShapeComparison, uuid: model.uuid, geometry, camera: w.__bodyCamera.position.toArray(), rotation: model.rotation.toArray().slice(0, 3) };
    });
  };
  await expect.poll(async () => (await snapshot()).family).toBe('sauropods');
  const original = await snapshot();
  await study.locator('[data-dino-shape-lens=limbs]').click();
  await expect.poll(async () => (await snapshot()).visibleLandmarks?.slice().sort()).toEqual(['forelimb', 'thigh']);
  const limbs = await snapshot(); expect(limbs.lens).toBe('limbs'); expect(limbs.uuid).toBe(original.uuid);
  expect(limbs.geometry).toEqual(original.geometry); expect(limbs.camera).toEqual(original.camera);
  await page.screenshot({ path: path.join(report, 'limb-investigation-desktop.png') });
  await canvas.focus(); await canvas.press('ArrowRight'); await canvas.press('ArrowUp'); await canvas.press('PageUp');
  const a = await snapshot();
  await page.locator('[data-dino-shape-dock-side=b]').click();
  await expect.poll(async () => (await snapshot()).species).toBe('diplodocus');
  const b = await snapshot(); expect(b.lens).toBe('limbs');
  for (const key of ['yaw', 'pitch', 'zoom']) expect(b[key]).toBe(a[key]);
  b.rotation.forEach((value: number, index: number) => expect(value).toBeCloseTo(a.rotation[index], 6));
  await study.locator('[data-dino-shape-lens=allocation]').click();
  await expect.poll(async () => (await snapshot()).visibleLandmarks?.slice().sort()).toEqual(['neck', 'tail', 'trunk']);
  const allocation = await snapshot(); expect(allocation.uuid).toBe(b.uuid); expect(allocation.geometry).toEqual(b.geometry);
  expect(allocation.camera).toEqual(b.camera); sound(await audit(page));
  await study.locator('[data-dino-shape-notebook]').click();
  expect(await page.evaluate(() => (window as any).__toolData.dinoLab.compareA)).toBe('brachiosaurus');
  await page.locator('[data-dino-shape-resume=sauropods]').click();
  await page.locator('[data-dino-shape-family=ornithopods]').click();
  await expect.poll(async () => (await snapshot()).species).toBe('edmontosaurus');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-dino-shape-lens=limbs]').click();
  const dock = page.locator('.dinolab-shape-switch-dock');
  await dock.scrollIntoViewIfNeeded();
  await dock.locator('[data-dino-shape-dock-side=b]').focus(); await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot()).species).toBe('iguanodon');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await dock.screenshot({ path: path.join(report, 'full-body-switch-mobile.png') });
  await study.screenshot({ path: path.join(report, 'full-body-investigation-mobile.png') }); sound(await audit(page));
  fs.writeFileSync(path.join(report, 'exploration-audit.json'), JSON.stringify({ original, limbs, a, b, allocation }, null, 2));
});
