import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 360_000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
const report = path.resolve('reports/dinolab-sauropod-extremities');
const probes = 'var DistalInquiryRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new DistalInquiryRenderer(o),f=r.render.bind(r);r.render=function(s,c){window.__distalInquiryScene=s;window.__distalInquiryCamera=c;window.__distalInquiryRenderer=r;return f(s,c)};return r};';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document', appStyles: true, probes });
const sources = ['https://doi.org/10.26879/559', 'https://doi.org/10.1671/A1108', 'https://doi.org/10.1126/sciadv.abm8280', 'https://doi.org/10.1080/03115518.2026.2697810'];
const own = { version: 1, pairs: [{ key: 'brachiosaurus|diplodocus', a: 'brachiosaurus', b: 'diplodocus', step: 'explain', prediction: 'I expect a tighter arch in the front foot.', evidence: ['traits'], explanation: 'My own first observation of the hand and foot.', limit: 'The living sole is reconstructed.' }] };

test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', selected: 'brachiosaurus', field3dSelected: 'brachiosaurus', field3dStage: 'studio', field3dOrientationDismissed: true, field3dAutoRotate: false, field3dReconstructionMode: 'evidence', field3dShowSkeleton: true, field3dShowBody: false, field3dBodyOpacity: 28, field3dShowHuman: false, field3dShowEvidence: false, field3dLabelMode: 'anatomy', compareInquiry: own } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {'), end = css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start));
  await page.addStyleTag({ content: css.slice(start, end) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => !!(window as any).__distalInquiryScene?.getObjectByName('dinolab-specimen'))).toBe(true);
  const study = page.locator('.dinolab-shape-study');
  if (!await study.evaluate((node: HTMLDetailsElement) => node.open)) await study.locator(':scope > summary').click();
  await page.locator('[data-dino-shape-family="sauropods"]').click();
  await page.locator('[data-dino-shape-lens="feet-hands"]').click();
}

async function ready(page: Page, species: string, kind: 'manus' | 'pes' | null, layer: 'bone' | 'life') {
  await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(({ species, kind, layer }) => {
    const w = window as any, model = w.__distalInquiryScene?.getObjectByName('dinolab-specimen'), guide = model?.userData.dinoSauropodDistalStudy, isolation = model?.userData.dinoSauropodDistalIsolation;
    return model?.userData.dinoSauropodExtremities?.species === species && model.userData.dinoShapeComparison?.species === species && model.userData.dinoShapeComparison?.family === 'sauropods' && guide?.active === true && guide.state === 'reviewed' && guide.kind === kind && guide.focused === !!kind && guide.layer === layer && isolation?.active === !!kind && isolation.kind === kind && (!kind || isolation.side === 1);
  }, { species, kind, layer })).toBe(true);
  await expect(page.locator('.dinolab-3d-camera-readout')).toContainText(kind ? 'Body study' : 'full model');
}

const data = (page: Page) => page.evaluate(() => (window as any).__toolData.dinoLab);
async function frame(page: Page) {
  return page.evaluate(() => {
    const w = window as any, model = w.__distalInquiryScene.getObjectByName('dinolab-specimen'), camera = w.__distalInquiryCamera;
    return { uuid: model.uuid, camera: camera.position.toArray(), direction: camera.getWorldDirection(new w.THREE.Vector3()).toArray(), rotation: model.rotation.y };
  });
}

async function visibility(page: Page) {
  return page.evaluate(() => {
    const w = window as any, model = w.__distalInquiryScene.getObjectByName('dinolab-specimen'), renderables: any[] = [];
    model.traverse((object: any) => { if (object.isMesh || object.isLine || object.isPoints || object.isSprite) renderables.push({ uuid: object.uuid, visible: object.visible }); });
    return { uuid: model.uuid, renderables };
  });
}

// Audit native, tagged mesh vertices in the currently selected layer. A label
// or an unrelated full-body fit cannot satisfy the close-frame assertions.
async function audit(page: Page, front: boolean, layer: 'bone' | 'life') {
  return page.evaluate(({ front, layer }) => {
    const w = window as any, model = w.__distalInquiryScene.getObjectByName('dinolab-specimen'), camera = w.__distalInquiryCamera;
    let vertices = 0, visibleVertices = 0, inFrame = 0, invalid = 0, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, visibleMinX = Infinity, visibleMaxX = -Infinity, visibleMinY = Infinity, visibleMaxY = -Infinity;
    const elements: any[] = [], visibleRenderables: any[] = [], oppositeFoot: any[] = [];
    model.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    function effectivelyVisible(object: any) { for (let ancestor = object; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return false; return true; }
    model.traverse((mesh: any) => {
      const tag = mesh.userData.dinoSauropodDistalElement, context = mesh.userData.dinoSauropodDistalContext, position = mesh.geometry?.attributes?.position, visible = effectivelyVisible(mesh);
      if ((mesh.isMesh || mesh.isLine || mesh.isPoints || mesh.isSprite) && visible) {
        const belongs = (record: any) => record?.species === model.userData.dinoSauropodExtremities.species && record.front === front && record.side === 1;
        visibleRenderables.push({ name: mesh.name, uuid: mesh.uuid, allowed: belongs(tag) || belongs(context) && context.lowerLegOnly === true, tag: tag || null, context: context || null });
      }
      if (!tag || tag.front !== front || tag.layer !== layer || tag.species !== model.userData.dinoSauropodExtremities.species || !position || mesh.userData.dinoContour) return;
      if (tag.side === -1) { oppositeFoot.push({ name: mesh.name, uuid: mesh.uuid, visible }); return; }
      if (tag.side !== 1) return;
      elements.push({ ...tag, vertices: position.count });
      for (let i = 0; i < position.count; i++) {
        vertices++; if (visible) visibleVertices++;
        const world = new w.THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld), eye = world.clone().applyMatrix4(camera.matrixWorldInverse), clip = world.project(camera);
        if (![clip.x, clip.y, clip.z].every(Number.isFinite)) { invalid++; continue; }
        minX = Math.min(minX, clip.x); maxX = Math.max(maxX, clip.x); minY = Math.min(minY, clip.y); maxY = Math.max(maxY, clip.y);
        if (visible) { visibleMinX = Math.min(visibleMinX, clip.x); visibleMaxX = Math.max(visibleMaxX, clip.x); visibleMinY = Math.min(visibleMinY, clip.y); visibleMaxY = Math.max(visibleMaxY, clip.y); }
        if (eye.z < 0 && Math.max(Math.abs(clip.x), Math.abs(clip.y), Math.abs(clip.z)) <= 1) inFrame++;
      }
    });
    const labels = [...document.querySelectorAll('[data-dino-part-label]')].filter(node => {
      for (let ancestor: Element | null = node; ancestor; ancestor = ancestor.parentElement) { const style = getComputedStyle(ancestor); if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false; }
      return node.getClientRects().length > 0;
    }).map(node => node.getAttribute('data-dino-part-label'));
    return { metadata: model.userData.dinoSauropodExtremities, guide: model.userData.dinoSauropodDistalStudy, isolation: model.userData.dinoSauropodDistalIsolation, elements, visibleRenderables, oppositeFoot, labels, vertices, visibleVertices, inFrame, invalid, span: Number.isFinite(minX) ? Math.max(maxX - minX, maxY - minY) / 2 : 0, visibleSpan: Number.isFinite(visibleMinX) ? Math.max(visibleMaxX - visibleMinX, visibleMaxY - visibleMinY) / 2 : 0, errors: w.__events.errors, shaders: w.__distalInquiryRenderer.info.programs.filter((program: any) => program.diagnostics?.runnable === false).length, lost: w.__glLive()?.lost };
  }, { front, layer });
}
function sound(view: any, kind: 'manus' | 'pes') {
  expect(view.guide).toMatchObject({ active: true, state: 'reviewed', kind, focused: true });
  expect(view.isolation).toMatchObject({ active: true, kind, side: 1 });
  expect(view.vertices).toBeGreaterThan(100); expect(view.visibleVertices).toBe(view.vertices); expect(view.inFrame).toBe(view.vertices); expect(view.invalid).toBe(0); expect(view.span).toBeGreaterThan(.2);
  expect(view.visibleSpan).toBeGreaterThan(.35);
  expect(view.visibleRenderables.length).toBeGreaterThan(0); expect(view.visibleRenderables.filter((object: any) => !object.allowed)).toEqual([]);
  expect([...new Set(view.elements.map((element: any) => element.side))].sort()).toEqual([1]);
  expect(view.oppositeFoot.length).toBeGreaterThan(0); expect(view.oppositeFoot.filter((object: any) => object.visible)).toEqual([]);
  expect(view.metadata.limbs).toHaveLength(4); expect(view.metadata.limbs.map((limb: any) => limb.front + ':' + limb.side).sort()).toEqual(['false:-1', 'false:1', 'true:-1', 'true:1']);
  const allowedLabels = kind === 'manus' ? ['hand', 'fingers', 'wrist', 'claws'] : ['foot', 'toes', 'ankle', 'claws'];
  expect(view.labels.filter((id: string) => !allowedLabels.includes(id))).toEqual([]);
  expect(view.errors).toEqual([]); expect(view.shaders).toBe(0); expect(view.lost).toBe(false);
}
async function closeFrame(page: Page, kind: 'manus' | 'pes', layer: 'bone' | 'life') {
  await expect.poll(async () => {
    const view = await audit(page, kind === 'manus', layer);
    fs.writeFileSync(path.join(report, 'inquiry-close-frame-latest.json'), JSON.stringify({ kind, layer, vertices: view.vertices, inFrame: view.inFrame, visibleVertices: view.visibleVertices, span: view.span, visibleSpan: view.visibleSpan, isolation: view.isolation, guide: view.guide }, null, 2));
    return view.vertices > 100 && view.vertices === view.inFrame && view.span > .2 && view.visibleSpan > .35;
  }).toBe(true);
  const view = await audit(page, kind === 'manus', layer); sound(view, kind); return view;
}
async function direction(page: Page, name: 'Side' | 'Overhead') {
  const controls = page.locator('details.dinolab-3d-controls-disclosure');
  if (!await controls.count()) await page.getByRole('button', { name: 'Explore anatomy', exact: true }).click();
  if (!await controls.evaluate((node: HTMLDetailsElement) => node.open)) await controls.locator(':scope > summary').click();
  await controls.getByRole('button', { name: name + ' camera view', exact: true }).click();
}

test('sauropod foot inquiry explores actual hand and hindfoot frames while preserving learner reasoning', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await ready(page, 'brachiosaurus', null, 'bone');
  await expect(page.locator('.dinolab-sauropod-distal-control')).toContainText('Close study isolates one restored foot of the selected type. Return to whole body to see its position on the animal.');
  const manusButton = page.locator('[data-dino-sauropod-distal="manus"]'), pesButton = page.locator('[data-dino-sauropod-distal="pes"]'), bodyButton = page.locator('[data-dino-sauropod-distal="body"]');
  const whole = await frame(page), wholeVisibility = await visibility(page); await manusButton.click(); await ready(page, 'brachiosaurus', 'manus', 'bone');
  const handFrame = await frame(page); expect(handFrame.uuid).toBe(whole.uuid); expect(handFrame.rotation).toBe(whole.rotation);
  handFrame.direction.forEach((value: number, index: number) => expect(value).toBeCloseTo(whole.direction[index], 6));
  const hand = await closeFrame(page, 'manus', 'bone');
  expect([...new Set(hand.elements.filter((element: any) => element.ray > 0).map((element: any) => element.ray))].sort()).toEqual([1, 2, 3, 4, 5]);
  await bodyButton.click(); await ready(page, 'brachiosaurus', null, 'bone'); expect(await visibility(page)).toEqual(wholeVisibility);
  await manusButton.click(); await ready(page, 'brachiosaurus', 'manus', 'bone'); await closeFrame(page, 'manus', 'bone');

  await page.locator('#dinolab-sauropod-distal-readouts > summary').click();
  await expect(page.locator('[data-dino-sauropod-distal-readout="evidence"]')).toContainText('upright metacarpals');
  await expect(page.locator('[data-dino-sauropod-distal-readout="limit"]')).toContainText('trackmaker');
  await expect(page.locator('[data-dino-sauropod-distal-source]:visible')).toHaveCount(4);
  for (const url of sources) await expect(page.locator('[data-dino-sauropod-distal-source][href="' + url + '"]')).toBeVisible();
  const views = page.locator('.dinolab-view-check'); if (!await views.evaluate((node: HTMLDetailsElement) => node.open)) await views.locator(':scope > summary').click();
  await page.locator('[data-dino-shape-keep-view="1"]').click();
  await expect(page.locator('[data-dino-shape-view-caption="1"]')).toContainText('front foot (manus)');
  await pesButton.click(); await ready(page, 'brachiosaurus', 'pes', 'bone'); const foot = await closeFrame(page, 'pes', 'bone');
  expect((await frame(page)).uuid).toBe(handFrame.uuid); expect((await frame(page)).camera).not.toEqual(handFrame.camera);
  await direction(page, 'Overhead'); await ready(page, 'brachiosaurus', 'pes', 'bone'); const overhead = await closeFrame(page, 'pes', 'bone');
  await expect(page.locator('.dinolab-part-inspection')).toContainText('Close study isolates one restored foot of the selected type.');
  await page.locator('[data-dino-shape-keep-view="2"]').click(); await expect(page.locator('[data-dino-shape-view-caption="2"]')).toContainText('hind foot (pes)');
  expect((await data(page)).compareInquiry).toEqual(own);
  await page.locator('[data-dino-shape-append-views]').click(); await expect(page.locator('#dinolab-shape-view-check-status')).toContainText('appended');
  const saved = (await data(page)).compareInquiry.pairs.find((pair: any) => pair.key === own.pairs[0].key);
  expect(saved.prediction).toBe(own.pairs[0].prediction); expect(saved.limit).toBe(own.pairs[0].limit); expect(saved.explanation).toContain(own.pairs[0].explanation); expect(saved.explanation).toContain('front foot (manus)'); expect(saved.explanation).toContain('hind foot (pes)'); expect(saved.explanation).toContain('not fossil proof');
  for (const url of sources) expect(saved.explanation).toContain(url); expect(saved.explanation.length).toBeLessThanOrEqual(1800);
  await page.locator('[data-dino-shape-append-views]').click(); expect((await data(page)).compareInquiry.pairs.find((pair: any) => pair.key === saved.key)).toEqual(saved);

  const boneFrame = await frame(page); await page.locator('[data-dino-shape-layer="life"]').click(); await ready(page, 'brachiosaurus', 'pes', 'life');
  const life = await closeFrame(page, 'pes', 'life'); expect(life.metadata).toEqual(foot.metadata); expect((await frame(page)).camera).toEqual(boneFrame.camera);
  await page.locator('[data-dino-shape-replay-view="1"]').click(); await ready(page, 'brachiosaurus', 'manus', 'life'); const replayedHand = await closeFrame(page, 'manus', 'life');
  expect((await data(page)).field3dShowSkeleton).toBe(false); expect((await data(page)).field3dShowBody).toBe(true);
  await page.locator('[data-dino-shape-dock-side="b"]').click(); await ready(page, 'diplodocus', 'manus', 'life'); const comparisonHand = await closeFrame(page, 'manus', 'life');
  await page.locator('[data-dino-shape-replay-view="2"]').click(); await ready(page, 'diplodocus', 'pes', 'life'); const comparisonFoot = await closeFrame(page, 'pes', 'life');
  expect((await data(page)).field3dSelected).toBe('diplodocus'); expect((await data(page)).field3dShowBody).toBe(true);
  await page.locator('[data-dino-shape-layer="bone"]').click(); await ready(page, 'diplodocus', 'pes', 'bone'); const comparisonBone = await closeFrame(page, 'pes', 'bone');
  expect(comparisonBone.metadata).toEqual(comparisonFoot.metadata); await page.locator('.dinolab-3d-viewer').screenshot({ path: path.join(report, 'extremities-inquiry-desktop.png') });

  await page.setViewportSize({ width: 341, height: 920 }); await ready(page, 'diplodocus', 'pes', 'bone');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const button of [manusButton, pesButton, bodyButton]) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const mobileFrame = await frame(page); await manusButton.focus(); await manusButton.press('Space'); await ready(page, 'diplodocus', 'manus', 'bone'); const mobileHand = await closeFrame(page, 'manus', 'bone');
  await pesButton.focus(); await pesButton.press('Enter'); await ready(page, 'diplodocus', 'pes', 'bone'); const mobileFoot = await closeFrame(page, 'pes', 'bone');
  expect((await frame(page)).uuid).toBe(mobileFrame.uuid);
  await bodyButton.focus(); await bodyButton.press('Space'); await ready(page, 'diplodocus', null, 'bone');
  expect((await frame(page)).uuid).toBe(mobileFrame.uuid); await expect(bodyButton).toBeDisabled(); const beforeFinalFocus = await visibility(page);
  await manusButton.focus(); await manusButton.press('Enter'); await ready(page, 'diplodocus', 'manus', 'bone'); await closeFrame(page, 'manus', 'bone');
  await page.locator('.dinolab-3d-viewer').screenshot({ path: path.join(report, 'extremities-inquiry-mobile.png') });
  await page.locator('[data-dino-shape-lens="outline"]').click(); await expect(page.locator('.dinolab-sauropod-distal-control')).toHaveCount(0); await expect(page.locator('[data-dino-shape-view-caption]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as any).__distalInquiryScene.getObjectByName('dinolab-specimen').userData.dinoSauropodDistalStudy.active)).toBe(false);
  await expect.poll(() => page.evaluate(() => (window as any).__distalInquiryScene.getObjectByName('dinolab-specimen').userData.dinoSauropodDistalIsolation.active)).toBe(false);
  expect(await visibility(page)).toEqual(beforeFinalFocus);
  expect((await data(page)).compareInquiry.pairs.find((pair: any) => pair.key === saved.key)).toEqual(saved); expect(errors).toEqual([]);
  fs.writeFileSync(path.join(report, 'extremities-inquiry-audit.json'), JSON.stringify({ hand, foot, overhead, life, replayedHand, comparisonHand, comparisonFoot, comparisonBone, mobileHand, mobileFoot, saved, errors }, null, 2));
});
