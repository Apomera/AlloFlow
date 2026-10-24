import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
const report = path.resolve('reports/dinolab-fullbody-next');
const probes = 'var PerspectiveRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new PerspectiveRenderer(o),f=r.render.bind(r);r.render=function(s,c){window.__perspectiveScene=s;window.__perspectiveCamera=c;return f(s,c)};return r};';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document', appStyles: true, probes });
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => harness.destroy(page));

const writing = { version: 1, pairs: [{ key: 'kentrosaurus|stegosaurus', a: 'kentrosaurus', b: 'stegosaurus', step: 'explain', prediction: 'I think perspective will change the apparent limb proportions.', evidence: ['traits'], explanation: 'My own initial explanation.', limit: 'The model pose is reconstructed.' }] };
async function mount(page: Page) {
  await page.setViewportSize({ width: 1280, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', selected: 'stegosaurus', field3dSelected: 'stegosaurus', field3dStage: 'studio', field3dOrientationDismissed: true,
    field3dAutoRotate: false, field3dReconstructionMode: 'evidence', field3dShowSkeleton: false, field3dShowBody: true,
    field3dBodyOpacity: 100, field3dShowHuman: false, field3dShowEvidence: false, field3dLabelMode: 'anatomy', compareInquiry: writing } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  const end = css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start));
  await page.addStyleTag({ content: css.slice(start, end) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__perspectiveScene?.getObjectByName('dinolab-specimen'))).toBe(true);
  const study = page.locator('.dinolab-shape-study');
  if (!await study.evaluate((node: HTMLDetailsElement) => node.open)) await study.locator(':scope > summary').click();
}
async function ready(page: Page, species: string, perspective = true) {
  await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => (window as any).__perspectiveScene.getObjectByName('dinolab-specimen').userData.dinoShapeComparison?.species)).toBe(species);
  await expect.poll(() => page.evaluate(() => {
    const w = window as any, model = w.__perspectiveScene.getObjectByName('dinolab-specimen');
    return !!model.getObjectByName('continuous-torso') === (w.__toolData.dinoLab.field3dShowBody !== false);
  })).toBe(true);
  await expect.poll(() => page.evaluate(() => {
    const canvas = document.querySelector('canvas.dinolab-3d-canvas')!;
    return Math.abs((window as any).__perspectiveCamera.aspect - canvas.clientWidth / canvas.clientHeight);
  })).toBeLessThan(1e-6);
  await expect.poll(() => page.evaluate(() => (window as any).__perspectiveScene.getObjectByName('dinolab-specimen').userData.dinoLimbJointTrace?.perspective?.active)).toBe(perspective);
}
async function frame(page: Page) {
  await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
  return page.evaluate(() => {
    const w = window as any, model = w.__perspectiveScene.getObjectByName('dinolab-specimen'), geometry: number[] = [];
    model.traverse((mesh: any) => { if (mesh.geometry) geometry.push(mesh.geometry.id); });
    return { uuid: model.uuid, geometry, rotation: model.rotation.y, camera: w.__perspectiveCamera.position.toArray(), canvas: [w.__perspectiveCamera.aspect, document.querySelector('canvas.dinolab-3d-canvas')!.clientHeight] };
  });
}
async function audit(page: Page) {
  await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
  return page.evaluate(() => {
    const w = window as any, model = w.__perspectiveScene.getObjectByName('dinolab-specimen'), trace = model.userData.dinoLimbJointTrace;
    const camera = w.__perspectiveCamera, canvas = document.querySelector('canvas.dinolab-3d-canvas')!;
    const rows = trace.perspective.rows.map((row: any) => {
      const chain = trace.chains.find((item: any) => item.id === row.id);
      if (!chain) return { id: row.id, status: row.status, modelPercent: row.modelPercent, viewPercent: row.viewPercent, modelError: null, viewError: null };
      const native = model.userData.dinoFullBodyAnatomy.limbs.find((limb: any) => limb.front === (row.id === 'fore') && limb.side === chain.side);
      const world = [native.top, native.knee, native.ankle].map(point => model.localToWorld(new w.THREE.Vector3().fromArray(point)));
      const clip = world.map(point => point.clone().project(camera));
      const screen = clip.map(point => new w.THREE.Vector2((point.x + 1) * canvas.clientWidth / 2, (1 - point.y) * canvas.clientHeight / 2));
      const modelExpected = Math.round(world[1].distanceTo(world[2]) / world[0].distanceTo(world[1]) * 100);
      const viewExpected = Math.round(screen[1].distanceTo(screen[2]) / screen[0].distanceTo(screen[1]) * 100);
      return { ...row, modelExpected, viewExpected, modelError: Math.abs(row.modelPercent - modelExpected), viewError: row.status === 'ready' ? Math.abs(row.viewPercent - viewExpected) : null };
    });
    return { species: model.userData.dinoShapeComparison.species, trace, rows, readouts: Array.from(document.querySelectorAll('[data-dino-perspective-row]')).map(node => node.textContent) };
  });
}
const data = (page: Page) => page.evaluate(() => (window as any).__toolData.dinoLab);

test('perspective checks use actual native joint centers, remain camera-only and preserve student explanations', async ({ page }) => {
  await mount(page); await page.locator('[data-dino-shape-family="stegosaurs"]').click(); await page.locator('[data-dino-shape-lens="limbs"]').click();
  await page.locator('[data-dino-shape-layer="life"]').click();
  await page.locator('[data-dino-joint-trace-toggle]').click(); await ready(page, 'stegosaurus', false);
  const beforeToggle = await frame(page);
  await page.locator('[data-dino-perspective-check-toggle]').click(); await ready(page, 'stegosaurus');
  expect(await frame(page)).toEqual(beforeToggle);
  const first = await audit(page); expect(first.rows).toHaveLength(2); expect(first.rows.every(row => row.status === 'ready')).toBe(true);
  expect(first.rows.every(row => row.modelError === 0 && row.viewError === 0)).toBe(true);
  await expect(page.locator('#dinolab-perspective-check-readouts')).toContainText('authored reconstruction');
  const viewCheck = page.locator('.dinolab-view-check');
  if (!await viewCheck.evaluate((node: HTMLDetailsElement) => node.open)) await viewCheck.locator(':scope > summary').click();
  await page.locator('[data-dino-shape-keep-view="1"]').click();
  await expect(page.locator('[data-dino-shape-view-caption="1"]')).toContainText('perspective check');
  const canvas = page.locator('canvas.dinolab-3d-canvas'); await canvas.focus();
  for (let i = 0; i < 4; i++) await canvas.press('ArrowRight');
  await expect.poll(async () => (await frame(page)).rotation).toBeCloseTo(beforeToggle.rotation + 4 * Math.PI / 12, 5);
  await expect.poll(async () => (await audit(page)).rows.map(row => row.viewPercent)).not.toEqual(first.rows.map(row => row.viewPercent));
  const turned = await audit(page), afterTurn = await frame(page);
  expect(turned.rows.map(row => row.modelPercent)).toEqual(first.rows.map(row => row.modelPercent));
  expect(turned.rows.every(row => row.modelError === 0 && (row.viewError === 0 || row.viewError === null))).toBe(true);
  expect(afterTurn.uuid).toBe(beforeToggle.uuid); expect(afterTurn.geometry).toEqual(beforeToggle.geometry);
  await page.locator('[data-dino-shape-keep-view="2"]').click();
  await expect(page.locator('[data-dino-shape-view-caption="2"]')).toContainText('perspective check');
  await page.locator('[data-dino-shape-dock-side="b"]').click(); await ready(page, 'kentrosaurus');
  const lifeB = await audit(page);
  await page.locator('[data-dino-shape-layer="bone"]').click(); await ready(page, 'kentrosaurus');
  const boneB = await audit(page); expect(boneB.rows.map(row => row.modelPercent)).toEqual(lifeB.rows.map(row => row.modelPercent));
  await page.locator('[data-dino-shape-replay-view="1"]').click(); await ready(page, 'kentrosaurus');
  expect((await data(page)).field3dSelected).toBe('kentrosaurus'); await expect(page.locator('[data-dino-perspective-check-toggle]')).toHaveAttribute('aria-pressed', 'true');
  await page.setViewportSize({ width: 341, height: 920 }); await ready(page, 'kentrosaurus');
  await expect(page.locator('[data-dino-perspective-row]')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const button = page.locator('[data-dino-perspective-check-toggle]'); expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.locator('.dinolab-perspective-check').screenshot({ path: path.join(report, 'perspective-check-mobile.png') });
  await canvas.screenshot({ path: path.join(report, 'perspective-joint-model-mobile.png') });
  await button.focus(); await button.press('Enter'); await ready(page, 'kentrosaurus', false);
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-dino-shape-keep-view="2"]').click();
  await expect(page.locator('[data-dino-shape-view-caption="2"]')).not.toContainText('perspective check');
  await page.locator('[data-dino-shape-append-views]').click(); await expect(page.locator('#dinolab-shape-view-check-status')).toContainText('appended');
  const saved = (await data(page)).compareInquiry.pairs.find((pair: any) => pair.key === 'kentrosaurus|stegosaurus');
  expect(saved.prediction).toBe(writing.pairs[0].prediction); expect(saved.limit).toBe(writing.pairs[0].limit); expect(saved.explanation).toContain(writing.pairs[0].explanation); expect(saved.explanation).toContain('perspective check'); expect(saved.explanation).toContain('not fossil proof');
  await page.locator('[data-dino-shape-append-views]').click(); expect((await data(page)).compareInquiry.pairs.find((pair: any) => pair.key === saved.key)).toEqual(saved);
  fs.writeFileSync(path.join(report, 'perspective-check-audit.json'), JSON.stringify({ first, turned, lifeB, boneB, saved }, null, 2));
});

test('legacy Back armor and Hesperosaurus retain explicit notebook context beside the new body study', async ({ page }) => {
  await mount(page); await page.locator('[data-dino-shape-family="armor"]').click();
  await expect(page.locator('[data-dino-shape-lens]')).toHaveCount(0);
  await page.locator('[data-dino-shape-notebook]').click();
  await expect(page.locator('[data-dino-shape-resume="armor"]')).toBeVisible();
  expect((await data(page)).compareShapeContext).toEqual({ family: 'armor', key: 'kentrosaurus|stegosaurus' });
  await page.locator('[data-dino-shape-resume="armor"]').click(); expect((await data(page)).field3dShapeStudy.family).toBe('armor');
  await page.locator('#dinolab-shape-study-species').selectOption('hesperosaurus');
  await page.locator('[data-dino-shape-notebook]').click(); await expect(page.locator('[data-dino-shape-resume="armor"]')).toBeVisible();
  await page.locator('[data-dino-shape-resume="armor"]').click(); expect((await data(page)).field3dShapeStudy).toMatchObject({ family: 'armor', b: 'hesperosaurus' });
  await page.locator('[data-dino-shape-family="stegosaurs"]').click(); await page.locator('[data-dino-shape-notebook]').click();
  await expect(page.locator('[data-dino-shape-resume="stegosaurs"]')).toBeVisible();
  await page.locator('[data-dino-shape-resume="stegosaurs"]').click(); expect((await data(page)).field3dShapeStudy.family).toBe('stegosaurs');
  expect((await data(page)).compareInquiry).toEqual(writing);
});
