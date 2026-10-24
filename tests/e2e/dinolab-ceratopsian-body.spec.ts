import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
const phase = process.env.DINO_CERATOPSIAN_PHASE === 'before' ? 'before' : 'after';
const report = path.resolve('reports/dinolab-ceratopsian-body');
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
    let invalid = 0, invalidShellMetadata = 0, triangles = 0; const parts: any[] = [];
    model.traverse((mesh: any) => {
      if (mesh.userData.dinoBodyPart) parts.push({ id: mesh.userData.dinoBodyPart, point: mesh.getWorldPosition(new w.THREE.Vector3()).toArray() });
      if (!mesh.geometry) return;
      const shell = mesh.geometry.userData.dinoDisplayShell;
      if (shell) for (const value of Object.values(shell)) if (typeof value === 'number' && !Number.isFinite(value)) invalidShellMetadata++;
      for (const attr of Object.values(mesh.geometry.attributes) as any[]) if (!Array.from(attr.array).every(Number.isFinite)) invalid++;
      triangles += (mesh.geometry.index?.count || 0) / 3;
    });
    return { anatomy: model.userData.dinoFullBodyAnatomy, cranium: model.userData.dinoCeratopsidCranium, invalid, invalidShellMetadata, triangles, parts, bounds: new w.THREE.Box3().setFromObject(model).getSize(new w.THREE.Vector3()).toArray(),
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

test('four ceratopsids have grounded, shared bone and life body frames', async ({ page }) => {
  const records: any[] = [];
  for (const id of ['triceratops','styracosaurus','centrosaurus','chasmosaurus']) {
    await mount(page, id); await view(page, 'Side');
    const life = await audit(page); sound(life);
    if (phase === 'after') {
      expect(life.anatomy.family).toBe('ceratopsids'); expect(life.anatomy.limbs).toHaveLength(4);
      expect(life.cranium.head).toEqual(life.anatomy.anchors.head);
      expect(life.cranium.dimensionsAreInterpretive).toBe(true);
    }
    await portrait(page, id + '-' + phase + '-life-side.png');
    await view(page, 'Front'); await portrait(page, id + '-' + phase + '-life-front.png');
    if (!await page.locator('#dinolab-part-picker').count()) await page.getByRole('button', { name: 'Explore anatomy', exact: true }).click();
    if (phase === 'after') {
      await page.locator('#dinolab-part-picker').selectOption('head'); await view(page, 'Side');
      await portrait(page, id + '-after-life-head.png');
    }
    await page.locator('#dinolab-part-picker').selectOption('trunk');
    await page.locator('[data-dino-part-inspect=bone]').click();
    await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click(); await view(page, 'Side');
    const bone = await audit(page); sound(bone);
    if (phase === 'after') {
      expect(bone.anatomy.anchors).toEqual(life.anatomy.anchors); expect(bone.anatomy.limbs).toEqual(life.anatomy.limbs);
      expect(life.anatomy.sources.length).toBeGreaterThan(0);
      expect(bone.cranium).toEqual(life.cranium);
    }
    await portrait(page, id + '-' + phase + '-bone-side.png');
    records.push({species:id,life,bone}); await harness.destroy(page);
  }
  fs.writeFileSync(path.join(report,'ceratopsids-'+phase+'-audit.json'),JSON.stringify(records,null,2));
});

test('students keep and replay two real directions across species and layers, then append context to their own writing', async ({ page }) => {
  test.skip(phase === 'before', 'The two-direction activity is part of this revision.');
  const pair = { key: 'styracosaurus|triceratops', a: 'styracosaurus', b: 'triceratops', step: 'explain',
    prediction: 'I predict different forequarters.', evidence: [], explanation: 'My own explanation.', limit: 'Soft tissue is reconstructed.' };
  await mount(page, 'triceratops', { compareInquiry: { pairs: [pair] } });
  const study = page.locator('.dinolab-shape-study'), canvas = page.locator('canvas.dinolab-3d-canvas');
  await study.locator('summary').click(); await study.locator('[data-dino-shape-family=ceratopsids]').click();
  const snapshot = async () => {
    await canvas.scrollIntoViewIfNeeded();
    return page.evaluate(() => {
      const w = window as any, model = w.__bodyScene.getObjectByName('dinolab-specimen'), geometry: string[] = [];
      model.traverse((mesh: any) => { if (mesh.geometry) geometry.push(mesh.geometry.uuid); });
      return { ...model.userData.dinoShapeComparison, uuid: model.uuid, geometry, camera: w.__bodyCamera.position.toArray(),
        rotation: model.rotation.toArray().slice(0, 3), cranium: model.userData.dinoCeratopsidCranium };
    });
  };
  await expect.poll(async () => (await snapshot()).family).toBe('ceratopsids');
  await study.locator('[data-dino-shape-lens=limbs]').click();
  await study.locator('[data-dino-shape-layer=bone]').click(); await view(page, 'Side');
  const beforeOpen = await snapshot(), box = await canvas.boundingBox(), check = page.locator('.dinolab-view-check');
  await check.locator('summary').click();
  const afterOpen = await snapshot(), openBox = await canvas.boundingBox();
  expect(afterOpen.uuid).toBe(beforeOpen.uuid); expect(afterOpen.geometry).toEqual(beforeOpen.geometry);
  expect(afterOpen.camera).toEqual(beforeOpen.camera); expect(openBox!.width).toBe(box!.width); expect(openBox!.height).toBe(box!.height);
  const actionsBox = await page.locator('.dinolab-viewer-actions').boundingBox();
  expect(actionsBox!.y).toBeGreaterThanOrEqual(openBox!.y + openBox!.height - 1);
  await check.locator('[data-dino-shape-keep-view="1"]').click();
  await expect(check.locator('[data-dino-shape-view-caption="1"]')).toContainText('Triceratops · Bone structure');
  await expect(check.locator('[data-dino-shape-view-caption="1"]')).toContainText('Upper foreleg');
  const side = await snapshot();
  await view(page, 'Front');
  await check.locator('[data-dino-shape-keep-view="2"]').focus(); await page.keyboard.press('Enter');
  await expect(check.locator('[data-dino-shape-view-angle]')).toContainText('at least 25°');
  const front = await snapshot();
  expect(side.uuid).toBe(front.uuid); expect(side.geometry).toEqual(front.geometry);
  await page.locator('[data-dino-shape-dock-side=b]').click();
  await expect.poll(async () => (await snapshot()).species).toBe('styracosaurus');
  const b = await snapshot();
  for (const key of ['yaw', 'pitch', 'zoom']) expect(b[key]).toBe(front[key]);
  await study.locator('[data-dino-shape-layer=life]').click();
  await expect.poll(async () => (await snapshot()).uuid !== b.uuid).toBe(true);
  const life = await snapshot(); expect(life.camera).toEqual(b.camera); expect(life.cranium).toEqual(b.cranium);
  await check.locator('[data-dino-shape-replay-view="1"]').focus(); await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot()).yaw).toBe(side.yaw);
  expect(await study.locator('[data-dino-shape-layer=life]').getAttribute('aria-pressed')).toBe('true');
  await expect(check.locator('[data-dino-shape-view-caption="1"]')).toContainText('Triceratops · Bone structure');
  await check.locator('[data-dino-shape-append-views]').click();
  const inquiry = () => page.evaluate(() => (window as any).__toolData.dinoLab.compareInquiry.pairs.find((entry: any) => entry.key === 'styracosaurus|triceratops'));
  await expect.poll(async () => (await inquiry()).explanation).toContain('3D view context');
  const recorded = await inquiry(); expect(recorded.explanation).toContain(pair.explanation);
  expect(recorded.prediction).toBe(pair.prediction); expect(recorded.limit).toBe(pair.limit); expect(recorded.evidence).toContain('model');
  await check.locator('[data-dino-shape-append-views]').click(); expect((await inquiry()).explanation).toBe(recorded.explanation);
  await page.setViewportSize({ width: 390, height: 844 });
  await check.scrollIntoViewIfNeeded(); await check.locator('[data-dino-shape-replay-view="2"]').focus(); await page.keyboard.press('Enter');
  await expect.poll(async () => (await snapshot()).yaw).toBe(front.yaw);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await check.screenshot({ path: path.join(report, 'two-view-investigation-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 960 });
  await canvas.scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(report, 'two-view-investigation-desktop.png'), fullPage: true });
  await study.locator('[data-dino-shape-lens=allocation]').click();
  await expect(check.locator('[data-dino-shape-replay-view="1"]')).toBeDisabled(); sound(await audit(page));
  fs.writeFileSync(path.join(report, 'two-view-investigation-audit.json'), JSON.stringify({ side, front, b, life, recorded }, null, 2));
});
