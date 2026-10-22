import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
const phase = process.env.DINO_BODY_NEXT_PHASE === 'before' ? 'before' : 'after';
const report = path.resolve('reports/dinolab-stegosaur-body');
const probes = 'var NextRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new NextRenderer(o),f=r.render.bind(r);r.render=function(s,c){window.__nextScene=s;window.__nextCamera=c;window.__nextRenderer=r;return f(s,c)};return r};';
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
  try {
    await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => !!(window as any).__nextScene?.getObjectByName('dinolab-specimen'))).toBe(true);
  } catch (error) {
    fs.writeFileSync(path.join(report, 'mount-failure-debug.json'), JSON.stringify(await page.evaluate(() => ({
      errors: (window as any).__events?.errors, body: document.body.innerText,
      selected: (window as any).__toolData?.dinoLab, scene: !!(window as any).__nextScene,
      contexts: (window as any).__glContexts?.()
    })), null, 2));
    throw error;
  }
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
    const w = window as any, model = w.__nextScene.getObjectByName('dinolab-specimen');
    let invalid = 0, triangles = 0;
    const parts: any[] = [], features: any[] = [], hornElements: any[] = [], dentition: any[] = [];
    model.traverse((mesh: any) => {
      if (mesh.userData.dinoBodyPart) parts.push({ id: mesh.userData.dinoBodyPart, point: mesh.getWorldPosition(new w.THREE.Vector3()).toArray() });
      if (mesh.userData.dinoCarnotaurusElement) features.push({ name: mesh.name, ...mesh.userData.dinoCarnotaurusElement });
      if (mesh.userData.dinoCarnotaurusHorn) hornElements.push({ name: mesh.name, ...mesh.userData.dinoCarnotaurusHorn });
      if (mesh.userData.dinoHuayangosaurusDentition) dentition.push({ ...mesh.userData.dinoHuayangosaurusDentition });
      if (!mesh.geometry) return;
      for (const attr of Object.values(mesh.geometry.attributes) as any[]) if (!Array.from(attr.array).every(Number.isFinite)) invalid++;
      triangles += (mesh.geometry.index?.count || 0) / 3;
    });
    return { bodyVisible: !!model.getObjectByName('continuous-torso'), anatomy: model.userData.dinoFullBodyAnatomy,
      cranium: model.userData.dinoStegosaurCranium || model.userData.dinoCarnotaurusCranium, manus: model.userData.dinoCarnotaurusManus,
      horns: model.userData.dinoCarnotaurusHorns, hornElements, dentition,
      invalid, triangles, parts, features, bounds: new w.THREE.Box3().setFromObject(model).getSize(new w.THREE.Vector3()).toArray(),
      shaderFailures: w.__nextRenderer.info.programs.filter((program: any) => program.diagnostics?.runnable === false).length,
      errors: w.__events.errors, lost: w.__glLive().lost };
  });
}
function sound(record: any) {
  expect(record.invalid).toBe(0); expect(record.triangles).toBeGreaterThan(1000);
  expect(record.shaderFailures).toBe(0); expect(record.errors).toEqual([]); expect(record.lost).toBe(false);
  expect(record.bounds.every((value: number) => Number.isFinite(value) && value > 0)).toBe(true);
}

test('four stegosaur body plans and the Carnotaurus skull and hands retain shared bone and life frames', async ({ page }) => {
  const records: any[] = [];
  for (const id of ['stegosaurus', 'kentrosaurus', 'huayangosaurus', 'tuojiangosaurus', 'carnotaurus']) {
    await mount(page, id); await view(page, 'Side');
    const life = await audit(page); sound(life); expect(life.bodyVisible).toBe(true);
    if (phase === 'after' && id !== 'carnotaurus') {
      expect(life.anatomy.family).toBe('stegosaurs'); expect(life.anatomy.limbs).toHaveLength(4);
      expect(life.anatomy.anchors.head[1]).toBeLessThan(life.anatomy.anchors.shoulder[1]);
      expect(life.anatomy.anchors.shoulder[1]).toBeLessThan(life.anatomy.anchors.hip[1]);
      expect(life.anatomy.sources.length).toBeGreaterThan(0);
      expect(life.cranium.head).toEqual(life.anatomy.anchors.head);
      expect(life.cranium.snout).toEqual(life.anatomy.anchors.snout);
      expect(life.cranium.dimensionsAreInterpretive).toBe(true);
      if (id === 'huayangosaurus') expect(life.dentition).toEqual([expect.objectContaining({ upperToothlessBeak: false, lowerPredentaryCovering: true })]);
    }
    if (phase === 'after' && id === 'carnotaurus') {
      expect(life.cranium.head).toHaveLength(3); expect(life.cranium.snout).toHaveLength(3);
      expect(life.manus).toBeTruthy();
      expect(life.horns.stations).toHaveLength(2);
      expect(life.hornElements.filter((f: any) => f.layer === 'covering')).toHaveLength(2);
      for (const side of [-1, 1]) expect(life.features.filter((f: any) => f.side === side && f.element === 'digital-envelope')).toHaveLength(4);
    }
    await portrait(page, id + '-' + phase + '-life-side.png');
    await view(page, 'Front'); await portrait(page, id + '-' + phase + '-life-front.png');
    await view(page, 'Overhead'); await portrait(page, id + '-' + phase + '-life-overhead.png');
    if (!await page.locator('#dinolab-part-picker').count()) await page.getByRole('button', { name: 'Explore anatomy', exact: true }).click();
    await page.locator('#dinolab-part-picker').selectOption('head'); await view(page, 'Side');
    await portrait(page, id + '-' + phase + '-life-head.png');
    if (id === 'carnotaurus') {
      await page.locator('#dinolab-part-picker').selectOption('hand'); await view(page, 'Side');
      if (phase === 'after') await expect(page.locator('#dinolab-selected-part-guide')).toContainText('Four metacarpals');
      await portrait(page, id + '-' + phase + '-life-hand.png');
      await page.locator('[data-dino-part-inspect=bone]').click();
      await expect.poll(() => page.evaluate(() => !!(window as any).__nextScene?.getObjectByName('dinolab-specimen')?.getObjectByName('continuous-torso'))).toBe(false);
      await portrait(page, id + '-' + phase + '-bone-hand.png');
    }
    await page.locator('#dinolab-part-picker').selectOption('trunk');
    await page.locator('[data-dino-part-inspect=bone]').click();
    await expect.poll(() => page.evaluate(() => !!(window as any).__nextScene?.getObjectByName('dinolab-specimen')?.getObjectByName('continuous-torso'))).toBe(false);
    await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click(); await view(page, 'Side');
    const bone = await audit(page); sound(bone); expect(bone.bodyVisible).toBe(false);
    if (phase === 'after' && id !== 'carnotaurus') {
      expect(bone.anatomy.anchors).toEqual(life.anatomy.anchors); expect(bone.anatomy.limbs).toEqual(life.anatomy.limbs);
      expect(bone.cranium).toEqual(life.cranium);
    }
    if (phase === 'after' && id === 'carnotaurus') {
      expect(bone.cranium).toEqual(life.cranium);
      expect(bone.horns).toEqual(life.horns);
      expect(bone.hornElements.filter((f: any) => f.layer === 'bone')).toHaveLength(2);
      for (const side of [-1, 1]) {
        expect(bone.features.filter((f: any) => f.side === side && f.element === 'metacarpal')).toHaveLength(4);
        expect(bone.features.filter((f: any) => f.side === side && f.digit === 4 && /phalanx|ungual/.test(f.element))).toHaveLength(0);
      }
    }
    await portrait(page, id + '-' + phase + '-bone-side.png');
    records.push({ species: id, life, bone }); await harness.destroy(page);
  }
  fs.writeFileSync(path.join(report, 'anatomy-' + phase + '-audit.json'), JSON.stringify(records, null, 2));
});

test('Carnotaurus hand detail uses native mesh bounds and preserves its frame across bone and life', async ({ page }) => {
  await mount(page, 'carnotaurus');
  if (!await page.locator('#dinolab-part-picker').count()) await page.getByRole('button', { name: 'Explore anatomy', exact: true }).click();
  await page.locator('#dinolab-part-picker').selectOption('hand'); await view(page, 'Side');
  async function detail() {
    return page.evaluate(() => {
      const w = window as any, model = w.__nextScene.getObjectByName('dinolab-specimen'), camera = w.__nextCamera;
      const box = model.userData.anatomyPartBounds.hand, full = model.userData.specimenBounds;
      const diagonal = (b: any) => new w.THREE.Vector3().fromArray(b.max).distanceTo(new w.THREE.Vector3().fromArray(b.min));
      const canvas = document.querySelector('canvas.dinolab-3d-canvas')!;
      const limits = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
      let vertices = 0;
      model.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      model.traverse((mesh: any) => {
        if (!mesh.geometry || !mesh.userData.dinoPartIds?.includes('hand')) return;
        const attribute = mesh.geometry.attributes.position;
        for (let i = 0; i < attribute.count; i++) {
          const p = new w.THREE.Vector3().fromBufferAttribute(attribute, i).applyMatrix4(mesh.matrixWorld).project(camera);
          limits.minX = Math.min(limits.minX, p.x); limits.maxX = Math.max(limits.maxX, p.x);
          limits.minY = Math.min(limits.minY, p.y); limits.maxY = Math.max(limits.maxY, p.y); vertices++;
        }
      });
      return { vertices, boundsFraction: diagonal(box) / diagonal(full), limits,
        pixelHeight: (limits.maxY-limits.minY)*canvas.clientHeight/2,
        camera: [...camera.position.toArray(), ...camera.quaternion.toArray(), camera.zoom] };
    });
  }
  await expect.poll(async () => (await detail()).pixelHeight).toBeGreaterThan(24);
  const life = await detail(); expect(life.vertices).toBeGreaterThan(100); expect(life.boundsFraction).toBeLessThan(.22);
  expect(Math.max(Math.abs(life.limits.minX), Math.abs(life.limits.maxX), Math.abs(life.limits.minY), Math.abs(life.limits.maxY))).toBeLessThan(1.05);
  await portrait(page, 'carnotaurus-after-life-hand.png');
  await page.locator('[data-dino-part-inspect=bone]').click();
  await expect.poll(() => page.evaluate(() => !!(window as any).__nextScene.getObjectByName('dinolab-specimen').getObjectByName('continuous-torso'))).toBe(false);
  const bone = await detail(); expect(bone.vertices).toBeGreaterThan(100); expect(bone.pixelHeight).toBeGreaterThan(24);
  expect(bone.camera).toEqual(life.camera);
  await portrait(page, 'carnotaurus-after-bone-hand.png');
  await page.locator('[data-dino-part-inspect=life]').click();
  await expect.poll(() => page.evaluate(() => !!(window as any).__nextScene.getObjectByName('dinolab-specimen').getObjectByName('continuous-torso'))).toBe(true);
  expect((await detail()).camera).toEqual(life.camera);
  fs.writeFileSync(path.join(report, 'carnotaurus-hand-focus-audit.json'), JSON.stringify({life,bone}, null, 2));
});
