import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
test.describe.configure({ timeout: 360_000, retries: 0 }); test.use({ video: 'off', trace: 'off' });
const report = path.resolve('reports/dinolab-lambeosaur-body');
const probes = 'var LambeosaurInquiryRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new LambeosaurInquiryRenderer(o),f=r.render.bind(r);r.render=function(s,c){window.__lambeosaurInquiryScene=s;window.__lambeosaurInquiryCamera=c;window.__lambeosaurInquiryRenderer=r;return f(s,c)};return r};';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document', appStyles: true, probes });
const own = { version: 1, pairs: [{ key: 'corythosaurus|parasaurolophus', a: 'corythosaurus', b: 'parasaurolophus', step: 'explain', prediction: 'I expect the neck and trunk to differ.', evidence: ['traits'], explanation: 'My own first observation of these bodies.', limit: 'Missing parts make complete outlines uncertain.' }] };
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop()); test.afterEach(async ({ page }) => harness.destroy(page));
async function mount(page: Page) {
  await page.setViewportSize({ width: 1280, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', selected: 'parasaurolophus', field3dSelected: 'parasaurolophus', field3dStage: 'studio', field3dOrientationDismissed: true, field3dAutoRotate: false, field3dReconstructionMode: 'evidence', field3dShowSkeleton: true, field3dShowBody: false, field3dBodyOpacity: 28, field3dShowHuman: false, field3dShowEvidence: false, field3dLabelMode: 'anatomy', compareInquiry: own } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {'), end = css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start));
  await page.addStyleTag({ content: css.slice(start, end) }); await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded(); await expect.poll(() => page.evaluate(() => !!(window as any).__lambeosaurInquiryScene?.getObjectByName('dinolab-specimen'))).toBe(true);
  const study = page.locator('.dinolab-shape-study'); if (!await study.evaluate((node: HTMLDetailsElement) => node.open)) await study.locator(':scope > summary').click();
  await page.locator('[data-dino-shape-family="lambeosaurs"]').click();
}
const data = (page: Page) => page.evaluate(() => (window as any).__toolData.dinoLab);
async function ready(page: Page, species: string, region: string, life = false) {
  await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(({ species, region, life }) => {
    const w = window as any, model = w.__lambeosaurInquiryScene?.getObjectByName('dinolab-specimen'), study = model?.userData.dinoLambeosaurStudy, anatomy = model?.userData.dinoFullBodyAnatomy;
    return anatomy?.species === species && anatomy.family === 'ornithopods' && anatomy.limbs?.length === 4 && model.userData.dinoShapeComparison?.family === 'lambeosaurs' && study?.active && study.state === 'native-ready' && study.species === species && study.region === region && !!model.getObjectByName('continuous-torso') === life;
  }, { species, region, life })).toBe(true);
  await expect(page.locator('[data-dino-lambeosaur-displayed]')).toHaveAttribute('data-dino-lambeosaur-displayed', species);
  await expect(page.locator('.dinolab-3d-camera-readout')).toContainText('full model');
}
async function frame(page: Page) { return page.evaluate(() => { const w = window as any, model = w.__lambeosaurInquiryScene.getObjectByName('dinolab-specimen'); return { uuid: model.uuid, camera: w.__lambeosaurInquiryCamera.position.toArray(), direction: w.__lambeosaurInquiryCamera.getWorldDirection(new w.THREE.Vector3()).toArray(), rotation: model.rotation.y }; }); }
async function audit(page: Page) {
  return page.evaluate(() => {
    const w = window as any, model = w.__lambeosaurInquiryScene.getObjectByName('dinolab-specimen'), camera = w.__lambeosaurInquiryCamera, anatomy = model.userData.dinoFullBodyAnatomy;
    model.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    let vertices = 0, inFrame = 0, invalid = 0; const regions: Record<string, number> = {};
    model.traverse((mesh: any) => {
      const tag = mesh.userData.dinoLambeosaurBodyElement, p = mesh.geometry?.attributes?.position; if (!tag || !p || mesh.userData.dinoContour) return;
      for (let object = mesh; object; object = object.parent) if (!object.visible) return;
      regions[tag.region + '|' + tag.layer] = (regions[tag.region + '|' + tag.layer] || 0) + p.count;
      for (let i = 0; i < p.count; i++) { vertices++; const world = new w.THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld), eye = world.clone().applyMatrix4(camera.matrixWorldInverse), clip = world.project(camera); if (![clip.x, clip.y, clip.z].every(Number.isFinite)) { invalid++; continue; } if (eye.z < 0 && Math.max(Math.abs(clip.x), Math.abs(clip.y), Math.abs(clip.z)) <= 1.02) inFrame++; }
    });
    const trace = model.userData.dinoLimbJointTrace, nativeTrace = (trace?.chains || []).every((chain: any) => { const limb = anatomy.limbs.find((item: any) => item.front === (chain.id === 'fore') && item.side === chain.side); return limb && chain.joints.every((joint: any, index: number) => joint.anchor.every((value: number, axis: number) => Math.abs(value - limb[['top', 'knee', 'ankle', 'foot'][index]][axis]) < 1e-8)); });
    return { anatomy, study: model.userData.dinoLambeosaurStudy, crest: model.userData.dinoLambeosaurCrest, regions, vertices, inFrame, invalid, trace, nativeTrace, errors: w.__events.errors, shaderFailures: w.__lambeosaurInquiryRenderer.info.programs.filter((program: any) => program.diagnostics?.runnable === false).length, lost: w.__glLive()?.lost };
  });
}
function sound(view: any) { expect(view.vertices).toBeGreaterThan(500); expect(view.inFrame).toBe(view.vertices); expect(view.invalid).toBe(0); expect(view.errors).toEqual([]); expect(view.shaderFailures).toBe(0); expect(view.lost).toBe(false); expect(view.anatomy.sampledSeries).toBe(true); expect(view.anatomy.limbs).toHaveLength(4); }
async function viewDirection(page: Page, direction: 'Front' | 'Side') {
  if (!await page.locator('.dinolab-3d-controls-disclosure').count()) await page.getByRole('button', { name: 'Explore anatomy', exact: true }).click();
  const controls = page.locator('.dinolab-3d-controls-disclosure'); if (!await controls.evaluate((node: HTMLDetailsElement) => node.open)) await controls.locator(':scope > summary').click();
  await controls.getByRole('button', { name: direction + ' camera view', exact: true }).click();
}
test('lambeosaur regional inquiry compares actual whole bodies and source gaps while preserving student writing', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page); await ready(page, 'parasaurolophus', 'trunk');
  await expect(page.locator('.dinolab-3d-readouts')).toContainText('Fossils · mixed evidence'); await expect(page.locator('.dinolab-3d-readouts')).toContainText('Pose · reconstructed support');
  const before = await frame(page); await page.locator('[data-dino-lambeosaur-region="neck"]').click(); await ready(page, 'parasaurolophus', 'neck'); expect(await frame(page)).toEqual(before);
  await expect(page.locator('[data-dino-lambeosaur-evidence="fossil"]')).toContainText('pathological'); const neck = await audit(page); sound(neck);
  const details = page.locator('.dinolab-lambeosaur-evidence details'); await details.locator(':scope > summary').click();
  await expect(page.locator('[data-dino-lambeosaur-evidence="restored"]')).toContainText('sampled supports, not a fossil count');
  await expect(page.locator('[data-dino-lambeosaur-source]:visible')).toHaveCount(4); await expect(page.locator('[data-dino-lambeosaur-source]').first()).toHaveAttribute('href', 'https://doi.org/10.1111/joa.13363');
  const views = page.locator('.dinolab-view-check'); if (!await views.evaluate((node: HTMLDetailsElement) => node.open)) await views.locator(':scope > summary').click();
  await page.locator('[data-dino-shape-keep-view="1"]').click(); await expect(page.locator('[data-dino-shape-view-caption="1"]')).toContainText('observation region: Neck');
  await page.locator('[data-dino-lambeosaur-region="tail"]').click(); await ready(page, 'parasaurolophus', 'tail'); expect(await frame(page)).toEqual(before); await expect(page.locator('[data-dino-lambeosaur-evidence="fossil"]')).toContainText('six caudal');
  await viewDirection(page, 'Front'); await ready(page, 'parasaurolophus', 'tail'); const front = await audit(page); sound(front);
  await page.locator('[data-dino-shape-keep-view="2"]').click(); await expect(page.locator('[data-dino-shape-view-caption="2"]')).toContainText('observation region: Tail');
  expect((await data(page)).compareInquiry).toEqual(own); await page.locator('[data-dino-shape-append-views]').click(); await expect(page.locator('#dinolab-shape-view-check-status')).toContainText('appended');
  const saved = (await data(page)).compareInquiry.pairs.find((pair: any) => pair.key === own.pairs[0].key); expect(saved.prediction).toBe(own.pairs[0].prediction); expect(saved.limit).toBe(own.pairs[0].limit); expect(saved.explanation).toContain(own.pairs[0].explanation); expect(saved.explanation).toContain('observation region: Neck'); expect(saved.explanation).toContain('observation region: Tail'); expect(saved.explanation).toContain('https://doi.org/10.1111/joa.13363'); expect(saved.explanation.length).toBeLessThanOrEqual(1800);
  await page.locator('[data-dino-shape-append-views]').click(); expect((await data(page)).compareInquiry.pairs.find((pair: any) => pair.key === saved.key)).toEqual(saved);
  await page.locator('[data-dino-shape-replay-view="1"]').click(); await ready(page, 'parasaurolophus', 'neck');
  await page.locator('[data-dino-shape-layer="life"]').click(); await ready(page, 'parasaurolophus', 'neck', true); const life = await audit(page); sound(life); expect(life.anatomy).toEqual(neck.anatomy); expect(life.crest).toEqual(neck.crest);
  await page.locator('[data-dino-shape-dock-side="b"]').click(); await ready(page, 'corythosaurus', 'neck', true); await expect(page.locator('[data-dino-lambeosaur-evidence="fossil"]')).toContainText('AMNH 5240');
  await page.locator('[data-dino-lambeosaur-region="limbs"]').click(); await ready(page, 'corythosaurus', 'limbs', true); await expect(page.locator('[data-dino-joint-trace-toggle]')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await audit(page)).trace.chains.length).toBe(2); const cory = await audit(page); sound(cory); expect(cory.nativeTrace).toBe(true); await expect(page.locator('[data-dino-lambeosaur-evidence="fossil"]')).toContainText('Missing forelimb parts');
  await page.locator('[data-dino-lambeosaur-region="tail"]').click(); await ready(page, 'corythosaurus', 'tail', true); await viewDirection(page, 'Front'); await ready(page, 'corythosaurus', 'tail', true);
  const beforeNewPair = await frame(page); await page.locator('[data-dino-shape-keep-view="1"]').click(); await expect(page.locator('[data-dino-shape-view-caption="1"]')).toContainText('Corythosaurus');
  await page.locator('#dinolab-shape-study-species').selectOption('lambeosaurus'); await ready(page, 'lambeosaurus', 'tail', true);
  const afterNewPair = await frame(page); expect(afterNewPair.rotation).toBeCloseTo(beforeNewPair.rotation, 8); afterNewPair.direction.forEach((value: number, index: number) => expect(value).toBeCloseTo(beforeNewPair.direction[index], 6));
  expect((await data(page))).toMatchObject({ field3dShowSkeleton: false, field3dShowBody: true, field3dBodyOpacity: 100 }); await expect(page.locator('[data-dino-shape-view-caption]')).toHaveCount(0); expect((await data(page)).compareInquiry.pairs.find((pair: any) => pair.key === saved.key)).toEqual(saved);
  await page.locator('[data-dino-lambeosaur-region="limbs"]').click(); await ready(page, 'lambeosaurus', 'limbs', true); await expect(page.locator('[data-dino-lambeosaur-evidence="fossil"]')).toContainText('not transferred'); const lambe = await audit(page); sound(lambe);
  await page.locator('#dinolab-shape-study-species').selectOption('olorotitan'); await ready(page, 'olorotitan', 'limbs', true); await expect(page.locator('[data-dino-lambeosaur-evidence="fossil"]')).toContainText('Both hands and both feet are missing');
  await page.locator('[data-dino-lambeosaur-region="neck"]').click(); await ready(page, 'olorotitan', 'neck', true); await expect(page.locator('[data-dino-lambeosaur-evidence="fossil"]')).toContainText('18 cervical'); const olo = await audit(page); sound(olo);
  await page.locator('.dinolab-3d-viewer').screenshot({ path: path.join(report, 'lambeosaur-inquiry-desktop.png') });
  await page.setViewportSize({ width: 341, height: 920 }); await ready(page, 'olorotitan', 'neck', true); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const mobileBefore = await frame(page), tailButton = page.locator('[data-dino-lambeosaur-region="tail"]');
  for (const button of await page.locator('[data-dino-lambeosaur-region]').all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await tailButton.focus(); await tailButton.press('Space'); await ready(page, 'olorotitan', 'tail', true); expect(await frame(page)).toEqual(mobileBefore); await expect(page.locator('[data-dino-lambeosaur-evidence="fossil"]')).toContainText('age or pathology'); const mobile = await audit(page); sound(mobile);
  const trunkButton = page.locator('[data-dino-lambeosaur-region="trunk"]'); await trunkButton.focus(); await trunkButton.press('Enter'); await ready(page, 'olorotitan', 'trunk', true); await expect(page.locator('[data-dino-lambeosaur-evidence="fossil"]')).toContainText('pubes are absent');
  await page.locator('.dinolab-3d-viewer').screenshot({ path: path.join(report, 'lambeosaur-inquiry-mobile.png') });
  await page.locator('[data-dino-shape-family="crests"]').click(); await expect(page.locator('.dinolab-lambeosaur-evidence')).toHaveCount(0); expect((await data(page)).field3dShapeStudy.family).toBe('crests'); expect((await data(page)).compareInquiry.pairs.find((pair: any) => pair.key === saved.key)).toEqual(saved); expect(errors).toEqual([]);
  fs.writeFileSync(path.join(report, 'lambeosaur-inquiry-audit.json'), JSON.stringify({ neck, front, life, cory, lambe, olo, mobile, saved, errors }, null, 2));
});
