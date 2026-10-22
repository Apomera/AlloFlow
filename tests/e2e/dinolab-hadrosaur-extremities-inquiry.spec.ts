import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 420_000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
const report = path.resolve('reports/dinolab-hadrosaur-extremities');
const probes = 'var HadInquiryRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new HadInquiryRenderer(o),f=r.render.bind(r);r.render=function(s,c){window.__hadInquiryScene=s;window.__hadInquiryCamera=c;window.__hadInquiryRenderer=r;return f(s,c)};return r};';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document', appStyles: true, probes });
const own = { version: 1, pairs: [{ key: 'corythosaurus|parasaurolophus', a: 'corythosaurus', b: 'parasaurolophus', step: 'explain', prediction: 'The covering may conceal separate finger bones.', evidence: ['traits'], explanation: 'My own observation of the hand.', limit: 'Complete soft tissue is reconstructed.' }] };
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
const data = (page: Page) => page.evaluate(() => (window as any).__toolData.dinoLab);

async function mount(page: Page) {
  await page.setViewportSize({ width: 1280, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', selected: 'parasaurolophus', field3dSelected: 'parasaurolophus', field3dStage: 'studio', field3dOrientationDismissed: true, field3dAutoRotate: false, field3dReconstructionMode: 'evidence', field3dShowSkeleton: true, field3dShowBody: false, field3dBodyOpacity: 28, field3dShowHuman: false, field3dShowEvidence: false, field3dLabelMode: 'anatomy', compareInquiry: own } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {'), end = css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start));
  await page.addStyleTag({ content: css.slice(start, end) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => !!(window as any).__hadInquiryScene?.getObjectByName('dinolab-specimen'))).toBe(true);
  const study = page.locator('.dinolab-shape-study'); if (!await study.evaluate((node: HTMLDetailsElement) => node.open)) await study.locator(':scope > summary').click();
  await page.locator('[data-dino-shape-family="lambeosaurs"]').click(); await page.locator('[data-dino-shape-lens="hands-feet"]').click();
}
async function ready(page: Page, species: string, kind: 'manus' | 'pes' | null, layer: 'bone' | 'life') {
  await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(({ species, kind, layer }) => {
    const w = window as any, model = w.__hadInquiryScene?.getObjectByName('dinolab-specimen'), guide = model?.userData.dinoHadrosaurDistalStudy, isolation = model?.userData.dinoHadrosaurDistalIsolation;
    return model?.userData.dinoHadrosaurExtremities?.species === species && model.userData.dinoShapeComparison?.species === species && model.userData.dinoShapeComparison?.lens === 'hands-feet' && guide?.active === true && guide.state === 'native-ready' && guide.kind === kind && guide.focused === !!kind && guide.layer === layer && isolation?.active === !!kind && isolation.kind === kind && (!kind || isolation.side === 1);
  }, { species, kind, layer })).toBe(true);
}
async function frame(page: Page) {
  return page.evaluate(() => { const w = window as any, model = w.__hadInquiryScene.getObjectByName('dinolab-specimen'), camera = w.__hadInquiryCamera; return { uuid: model.uuid, camera: camera.position.toArray(), direction: camera.getWorldDirection(new w.THREE.Vector3()).toArray(), rotation: model.rotation.y }; });
}
async function visibility(page: Page) {
  return page.evaluate(() => { const w = window as any, model = w.__hadInquiryScene.getObjectByName('dinolab-specimen'), records: any[] = []; model.traverse((object: any) => { if (object.isMesh || object.isLine || object.isPoints || object.isSprite) records.push({ uuid: object.uuid, visible: object.visible }); }); return { uuid: model.uuid, records }; });
}
async function audit(page: Page, front: boolean, layer: 'bone' | 'life') {
  return page.evaluate(({ front, layer }) => {
    const w = window as any, model = w.__hadInquiryScene.getObjectByName('dinolab-specimen'), camera = w.__hadInquiryCamera, species = model.userData.dinoHadrosaurExtremities.species;
    let vertices = 0, inFrame = 0, visibleVertices = 0, invalid = 0, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const elements: any[] = [], renderables: any[] = [], opposite: any[] = [], highlighted: any[] = [];
    model.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    function visible(object: any) { for (let ancestor = object; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return false; return true; }
    model.traverse((mesh: any) => {
      const tag = mesh.userData.dinoHadrosaurDistalElement, p = mesh.geometry?.attributes?.position, shown = visible(mesh);
      if ((mesh.isMesh || mesh.isLine || mesh.isPoints || mesh.isSprite) && shown) renderables.push({ name: mesh.name, allowed: !!(tag && tag.species === species && tag.front === front && tag.side === 1) });
      if (!tag || tag.species !== species || tag.front !== front || tag.layer !== layer || !p || mesh.userData.dinoContour) return;
      if (tag.side === -1) { opposite.push({ name: mesh.name, shown }); return; } if (tag.side !== 1) return;
      elements.push({ ...tag, vertices: p.count }); if (mesh.material?.emissive?.getHex() === new w.THREE.Color(0x995500).convertSRGBToLinear().getHex()) highlighted.push({ ...tag, uuid: mesh.uuid, linearColor: mesh.material?.color?.toArray() });
      for (let i = 0; i < p.count; i++) { vertices++; if (shown) visibleVertices++; const world = new w.THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld), eye = world.clone().applyMatrix4(camera.matrixWorldInverse), clip = world.project(camera); if (![clip.x, clip.y, clip.z].every(Number.isFinite)) { invalid++; continue; } minX = Math.min(minX, clip.x); maxX = Math.max(maxX, clip.x); minY = Math.min(minY, clip.y); maxY = Math.max(maxY, clip.y); if (eye.z < 0 && Math.max(Math.abs(clip.x), Math.abs(clip.y), Math.abs(clip.z)) <= 1) inFrame++; }
    });
    const labels = [...document.querySelectorAll('[data-dino-part-label]')].filter(node => { for (let ancestor: Element | null = node; ancestor; ancestor = ancestor.parentElement) { const style = getComputedStyle(ancestor); if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false; } return node.getClientRects().length > 0; }).map(node => node.getAttribute('data-dino-part-label'));
    return { metadata: model.userData.dinoHadrosaurExtremities, guide: model.userData.dinoHadrosaurDistalStudy, isolation: model.userData.dinoHadrosaurDistalIsolation, elements, renderables, opposite, highlighted, labels, vertices, visibleVertices, inFrame, invalid, span: Number.isFinite(minX) ? Math.max(maxX - minX, maxY - minY) / 2 : 0, errors: w.__events.errors, shaders: w.__hadInquiryRenderer.info.programs.filter((program: any) => program.diagnostics?.runnable === false).length, lost: w.__glLive()?.lost };
  }, { front, layer });
}
async function closeFrame(page: Page, kind: 'manus' | 'pes', layer: 'bone' | 'life') {
  await expect.poll(async () => { const value = await audit(page, kind === 'manus', layer); fs.writeFileSync(path.join(report, 'inquiry-close-frame-latest.json'), JSON.stringify({ kind, layer, vertices: value.vertices, visibleVertices: value.visibleVertices, inFrame: value.inFrame, span: value.span, guide: value.guide, isolation: value.isolation }, null, 2)); return value.vertices > 100 && value.visibleVertices === value.vertices && value.inFrame === value.vertices && value.span > .35; }).toBe(true);
  const value = await audit(page, kind === 'manus', layer);
  expect(value.guide).toMatchObject({ active: true, state: 'native-ready', kind, focused: true, side: 1, layer }); expect(value.isolation).toMatchObject({ active: true, kind, side: 1 });
  expect(value.vertices).toBeGreaterThan(100); expect(value.visibleVertices).toBe(value.vertices); expect(value.inFrame).toBe(value.vertices); expect(value.invalid).toBe(0); expect(value.span).toBeGreaterThan(.35);
  expect(value.renderables.length).toBeGreaterThan(0); expect(value.renderables.filter((entry: any) => !entry.allowed)).toEqual([]); expect(value.opposite.length).toBeGreaterThan(0); expect(value.opposite.filter((entry: any) => entry.shown)).toEqual([]);
  const limbs = value.metadata.limbs || value.metadata.sides; expect(limbs).toHaveLength(4); expect(limbs.map((limb: any) => limb.front + ':' + limb.side).sort()).toEqual(['false:-1', 'false:1', 'true:-1', 'true:1']);
  // Close ray study uses its native selection and readout. Generic anatomy
  // labels must not cover the actual digit shafts and hoof surfaces.
  expect(value.labels).toEqual([]);
  expect(value.errors).toEqual([]); expect(value.shaders).toBe(0); expect(value.lost).toBe(false); return value;
}
async function direction(page: Page, name: 'Side' | 'Overhead') {
  const controls = page.locator('details.dinolab-3d-controls-disclosure'); if (!await controls.count()) await page.getByRole('button', { name: 'Explore anatomy', exact: true }).click();
  if (!await controls.evaluate((node: HTMLDetailsElement) => node.open)) await controls.locator(':scope > summary').click(); await controls.getByRole('button', { name: name + ' camera view', exact: true }).click();
}

test('hadrosaur distal inquiry compares actual ray bundles and inferred covering while retaining learner reasoning', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page); await ready(page, 'parasaurolophus', null, 'bone');
  const panel = page.locator('.dinolab-hadrosaur-distal-control'), handButton = page.locator('[data-dino-hadrosaur-distal="manus"]'), footButton = page.locator('[data-dino-hadrosaur-distal="pes"]'), bodyButton = page.locator('[data-dino-hadrosaur-distal="body"]');
  await expect(panel).toContainText('Do visible tips tell you how many bony rays lie inside?'); const whole = await frame(page), originalVisibility = await visibility(page);
  await handButton.click(); await ready(page, 'parasaurolophus', 'manus', 'bone'); const hand = await closeFrame(page, 'manus', 'bone');
  expect((await frame(page)).uuid).toBe(whole.uuid); expect((await frame(page)).rotation).toBe(whole.rotation); (await frame(page)).direction.forEach((value: number, i: number) => expect(value).toBeCloseTo(whole.direction[i], 6));
  expect([...new Set(hand.elements.filter((entry: any) => entry.ray > 0).map((entry: any) => entry.ray))].sort()).toEqual([2, 3, 4, 5]); expect(hand.guide.inFrameRays).toEqual([2, 3, 4, 5]);
  await page.locator('[data-dino-hadrosaur-ray]').selectOption('5'); await expect.poll(() => audit(page, true, 'bone').then(value => value.highlighted.length)).toBeGreaterThan(0);
  expect((await audit(page, true, 'bone')).highlighted.every((entry: any) => entry.ray === 5 && entry.side === 1 && entry.front && entry.linearColor[0] > entry.linearColor[1] && entry.linearColor[1] > entry.linearColor[2] * 4 && entry.linearColor[2] < .1)).toBe(true);
  await bodyButton.click(); await ready(page, 'parasaurolophus', null, 'bone'); expect(await visibility(page)).toEqual(originalVisibility);
  await expect(page.locator('.dinolab-body-label-overlay')).toBeVisible();
  await expect.poll(() => page.locator('.dinolab-body-label-overlay [data-dino-part-label]:visible').count()).toBeGreaterThan(0);
  await handButton.click(); await ready(page, 'parasaurolophus', 'manus', 'bone'); await direction(page, 'Side'); await closeFrame(page, 'manus', 'bone');
  await panel.locator('details > summary').click(); await expect(page.locator('[data-dino-hadrosaur-readout="limit"]')).toContainText('no distal hindlimbs'); await expect(page.locator('[data-dino-hadrosaur-readout="covering"]')).toContainText('provisional'); await expect(page.locator('[data-dino-hadrosaur-source]:visible')).toHaveCount(4);
  const sourceUrls = await page.locator('[data-dino-hadrosaur-source]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))); expect(new Set(sourceUrls).size).toBe(4); expect(sourceUrls.every(url => url?.startsWith('https://'))).toBe(true);
  const views = page.locator('.dinolab-view-check'); if (!await views.evaluate((node: HTMLDetailsElement) => node.open)) await views.locator(':scope > summary').click();
  await page.locator('[data-dino-shape-keep-view="1"]').click(); await expect(page.locator('[data-dino-shape-view-caption="1"]')).toContainText('hand (manus) / selected ray V');
  await footButton.click(); await ready(page, 'parasaurolophus', 'pes', 'bone'); await direction(page, 'Overhead'); const foot = await closeFrame(page, 'pes', 'bone'); expect(foot.guide.inFrameRays).toEqual([2, 3, 4]);
  await page.locator('[data-dino-shape-keep-view="2"]').click(); await expect(page.locator('[data-dino-shape-view-caption="2"]')).toContainText('hind foot (pes) / selected ray III'); expect((await data(page)).compareInquiry).toEqual(own);
  await page.locator('[data-dino-shape-append-views]').click(); await expect(page.locator('#dinolab-shape-view-check-status')).toContainText('appended');
  const saved = (await data(page)).compareInquiry.pairs.find((entry: any) => entry.key === own.pairs[0].key); expect(saved.prediction).toBe(own.pairs[0].prediction); expect(saved.limit).toBe(own.pairs[0].limit); expect(saved.explanation).toContain(own.pairs[0].explanation); expect(saved.explanation).toContain('hand (manus)'); expect(saved.explanation).toContain('hind foot (pes)'); expect(saved.explanation).not.toContain('observation region: Trunk'); expect(saved.explanation.length).toBeLessThanOrEqual(1800); for (const url of sourceUrls) expect(saved.explanation).toContain(url);
  await page.locator('[data-dino-shape-append-views]').click(); expect((await data(page)).compareInquiry.pairs.find((entry: any) => entry.key === saved.key)).toEqual(saved);
  const boneFrame = await frame(page); await page.locator('[data-dino-shape-layer="life"]').click(); await ready(page, 'parasaurolophus', 'pes', 'life'); const lifeFoot = await closeFrame(page, 'pes', 'life'); expect((await frame(page)).camera).toEqual(boneFrame.camera);
  await page.locator('[data-dino-shape-replay-view="1"]').click(); await ready(page, 'parasaurolophus', 'manus', 'life'); const lifeHand = await closeFrame(page, 'manus', 'life'); expect((await data(page)).field3dShowBody).toBe(true);
  expect(lifeHand.guide.inFrameRays).toEqual([2, 3, 5]); await page.locator('[data-dino-hadrosaur-ray]').selectOption('4'); await expect(page.locator('[data-dino-hadrosaur-readout="view"]')).toContainText('Ray IV is enclosed'); expect((await audit(page, true, 'life')).highlighted).toEqual([]);
  await page.locator('[data-dino-shape-dock-side="b"]').click(); await ready(page, 'corythosaurus', 'manus', 'life'); const comparison = await closeFrame(page, 'manus', 'life'); await expect(page.locator('[data-dino-hadrosaur-displayed]')).toContainText('Corythosaurus'); await expect(page.locator('[data-dino-hadrosaur-readout="limit"]')).toContainText('Corythosaurus sp.');
  await page.locator('[data-dino-shape-replay-view="2"]').click(); await ready(page, 'corythosaurus', 'pes', 'life'); await closeFrame(page, 'pes', 'life');
  await page.locator('#dinolab-shape-study-species').selectOption('lambeosaurus'); await ready(page, 'lambeosaurus', 'pes', 'life'); await closeFrame(page, 'pes', 'life'); await expect(page.locator('[data-dino-shape-view-caption]')).toHaveCount(0); await expect(page.locator('[data-dino-hadrosaur-readout="limit"]')).toContainText('different species');
  await page.locator('#dinolab-shape-study-species').selectOption('olorotitan'); await ready(page, 'olorotitan', 'pes', 'life'); await closeFrame(page, 'pes', 'life'); await expect(page.locator('[data-dino-hadrosaur-readout="limit"]')).toContainText('lacks all hands and feet'); expect((await data(page)).compareInquiry.pairs.find((entry: any) => entry.key === saved.key)).toEqual(saved);
  await page.locator('[data-dino-shape-layer="bone"]').click(); await ready(page, 'olorotitan', 'pes', 'bone'); const finalBone = await closeFrame(page, 'pes', 'bone'); await page.locator('.dinolab-3d-viewer').screenshot({ path: path.join(report, 'hadrosaur-inquiry-desktop.png') });
  await page.setViewportSize({ width: 341, height: 920 }); await ready(page, 'olorotitan', 'pes', 'bone'); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const button of [handButton, footButton, bodyButton]) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const mobileWhole = await frame(page); await handButton.focus(); await handButton.press('Space'); await ready(page, 'olorotitan', 'manus', 'bone'); const mobileHand = await closeFrame(page, 'manus', 'bone');
  await footButton.focus(); await footButton.press('Enter'); await ready(page, 'olorotitan', 'pes', 'bone'); const mobileFoot = await closeFrame(page, 'pes', 'bone'); expect((await frame(page)).uuid).toBe(mobileWhole.uuid);
  await bodyButton.focus(); await bodyButton.press('Space'); await ready(page, 'olorotitan', null, 'bone'); const restore = await visibility(page); await handButton.click(); await ready(page, 'olorotitan', 'manus', 'bone'); await closeFrame(page, 'manus', 'bone'); await page.locator('.dinolab-3d-viewer').screenshot({ path: path.join(report, 'hadrosaur-inquiry-mobile.png') });
  await page.locator('[data-dino-shape-lens="allocation"]').click(); await expect(panel).toHaveCount(0); await expect(page.locator('.dinolab-lambeosaur-evidence')).toHaveCount(1); await expect.poll(() => page.evaluate(() => (window as any).__hadInquiryScene.getObjectByName('dinolab-specimen').userData.dinoHadrosaurDistalIsolation.active)).toBe(false); expect(await visibility(page)).toEqual(restore);
  await expect(page.locator('[data-dino-shape-view-caption]')).toHaveCount(0); expect((await data(page)).compareInquiry.pairs.find((entry: any) => entry.key === saved.key)).toEqual(saved); expect(errors).toEqual([]);
  fs.writeFileSync(path.join(report, 'hadrosaur-inquiry-audit.json'), JSON.stringify({ hand, foot, lifeFoot, lifeHand, comparison, finalBone, mobileHand, mobileFoot, saved, errors }, null, 2));
});
