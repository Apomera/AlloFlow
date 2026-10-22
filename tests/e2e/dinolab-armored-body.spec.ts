import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
const phase = process.env.DINO_ARMORED_PHASE === 'before' ? 'before' : 'after';
const report = path.resolve('reports/dinolab-armored-body');
const probes = 'var BodyRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new BodyRenderer(o),f=r.render.bind(r);r.render=function(s,c){window.__bodyScene=s;window.__bodyCamera=c;window.__bodyRenderer=r;return f(s,c)};return r};';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document', appStyles: true, probes });
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, species: string, overrides: any = {}) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', field3dSelected: species, field3dStage: 'studio', field3dOrientationDismissed: true,
    field3dAutoRotate: false, field3dReconstructionMode: 'evidence', field3dShowSkeleton: false, field3dShowBody: true,
    field3dBodyOpacity: 100, field3dShowHuman: false, field3dShowEvidence: false, field3dLabelMode: 'key', ...overrides } }, undefined, { expectCanvas: false });
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
async function view(page: Page, direction: 'Side' | 'Front' | 'Overhead') {
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
    let invalid = 0, invalidShellMetadata = 0, triangles = 0; const parts: any[] = [], armoredElements: any[] = [], nostrils: any[] = [];
    model.traverse((mesh: any) => {
      if (mesh.userData.dinoBodyPart) parts.push({ id: mesh.userData.dinoBodyPart, point: mesh.getWorldPosition(new w.THREE.Vector3()).toArray() });
      if (mesh.userData.dinoNostrilRole === 'opening') {
        const side = mesh.userData.dinoNostrilSide, frame = mesh.userData.dinoNostrilFrame;
        nostrils.push({ side, point: mesh.getWorldPosition(new w.THREE.Vector3()).toArray(), normal: frame ? new w.THREE.Vector3(0, 0, side).applyQuaternion(new w.THREE.Quaternion().fromArray(frame)).toArray() : null });
      }
      if (mesh.userData.dinoArmoredElement) armoredElements.push({ ...mesh.userData.dinoArmoredElement, attachment: mesh.userData.dinoArmoredAttachment });
      if (!mesh.geometry) return;
      const shell = mesh.geometry.userData.dinoDisplayShell;
      if (shell) for (const value of Object.values(shell)) if (typeof value === 'number' && !Number.isFinite(value)) invalidShellMetadata++;
      for (const attr of Object.values(mesh.geometry.attributes) as any[]) if (!Array.from(attr.array).every(Number.isFinite)) invalid++;
      triangles += (mesh.geometry.index?.count || 0) / 3;
    });
    return { nostrils, bodyVisible: !!model.getObjectByName('continuous-torso'), armoredElements, display: model.userData.dinoArmoredDisplay, anatomy: model.userData.dinoFullBodyAnatomy, cranium: model.userData.dinoArmoredCranium, invalid, invalidShellMetadata, triangles, parts, bounds: new w.THREE.Box3().setFromObject(model).getSize(new w.THREE.Vector3()).toArray(),
      shaderFailures: w.__bodyRenderer.info.programs.filter((program: any) => program.diagnostics?.runnable === false).length,
      errors: w.__events.errors, lost: w.__glLive().lost };
  });
}
function sound(record: any) {
  expect(record.invalid).toBe(0); expect(record.triangles).toBeGreaterThan(1000);
  expect(record.invalidShellMetadata).toBe(0);
  expect(record.shaderFailures).toBe(0); expect(record.errors).toEqual([]); expect(record.lost).toBe(false);
  expect(record.bounds.every((value: number) => Number.isFinite(value) && value > 0)).toBe(true);
}

test('four armored dinosaurs have grounded, shared bone and life body frames', async ({ page }) => {
  const records: any[] = [];
  for (const id of ['ankylosaurus','euoplocephalus','sauropelta','borealopelta']) {
    await mount(page, id); await view(page, 'Side');
    const life = await audit(page); sound(life); expect(life.bodyVisible).toBe(true);
    if (phase === 'after') {
      expect(life.anatomy.family).toBe('ankylosaurs'); expect(life.anatomy.limbs).toHaveLength(4);
      expect(life.cranium.head).toEqual(life.anatomy.anchors.head);
      expect(life.cranium.dimensionsAreInterpretive).toBe(true);
      expect(life.armoredElements.length).toBeGreaterThan(12);
      if (id === 'ankylosaurus' || id === 'borealopelta') {
        expect(life.nostrils).toHaveLength(2);
        for (const opening of life.nostrils) {
          expect(opening.normal[1]).toBeLessThan(0);
          expect(opening.normal[2] * opening.side).toBeGreaterThan(0.7);
        }
      }
      expect(life.parts.some((part: any) => part.id === 'armor')).toBe(true);
      expect(life.parts.some((part: any) => part.id === 'tailclub')).toBe(id === 'ankylosaurus' || id === 'euoplocephalus');
      expect(life.armoredElements.filter((element: any) => element.region === 'neck').every((element: any) => element.attachment === 'neck-skin-pivot')).toBe(true);
      if (id === 'ankylosaurus' || id === 'euoplocephalus') expect(life.armoredElements.filter((element: any) => element.region === 'tail').every((element: any) => element.attachment === 'tail-skin-pivot')).toBe(true);
    }
    await portrait(page, id + '-' + phase + '-life-side.png');
    await view(page, 'Front'); await portrait(page, id + '-' + phase + '-life-front.png');
    if (phase === 'after') { await view(page, 'Overhead'); await portrait(page, id + '-after-life-overhead.png'); }
    if (!await page.locator('#dinolab-part-picker').count()) await page.getByRole('button', { name: 'Explore anatomy', exact: true }).click();
    if (phase === 'after') {
      await page.locator('#dinolab-part-picker').selectOption('armor');
      await expect(page.locator('#dinolab-selected-part-guide')).toContainText('Osteoderms');
      await page.locator('#dinolab-part-picker').selectOption('head'); await view(page, 'Side');
      await portrait(page, id + '-after-life-head.png');
    }
    await page.locator('#dinolab-part-picker').selectOption('trunk');
    await page.locator('[data-dino-part-inspect=bone]').click();
    await expect.poll(() => page.evaluate(() => !!(window as any).__bodyScene?.getObjectByName('dinolab-specimen')?.getObjectByName('continuous-torso'))).toBe(false);
    await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click(); await view(page, 'Side');
    const bone = await audit(page); sound(bone); expect(bone.bodyVisible).toBe(false);
    if (phase === 'after') {
      expect(bone.anatomy.anchors).toEqual(life.anatomy.anchors); expect(bone.anatomy.limbs).toEqual(life.anatomy.limbs);
      expect(life.anatomy.sources.length).toBeGreaterThan(0);
      expect(bone.cranium).toEqual(life.cranium);
    }
    await portrait(page, id + '-' + phase + '-bone-side.png');
    records.push({species:id,life,bone}); await harness.destroy(page);
  }
  fs.writeFileSync(path.join(report,'armored-'+phase+'-audit.json'),JSON.stringify(records,null,2));
});
