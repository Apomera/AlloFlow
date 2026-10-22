import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
const report = path.resolve('reports/dinolab-armored-body');
const probes = 'var JointRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new JointRenderer(o),f=r.render.bind(r);r.render=function(s,c){window.__jointScene=s;window.__jointCamera=c;return f(s,c)};return r};';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document', appStyles: true, probes });
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, overrides: any = {}) {
  await page.setViewportSize({ width: 1280, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', field3dSelected: 'ankylosaurus', field3dStage: 'studio', field3dOrientationDismissed: true,
    field3dAutoRotate: false, field3dReconstructionMode: 'evidence', field3dShowSkeleton: false, field3dShowBody: true,
    field3dBodyOpacity: 100, field3dShowHuman: false, field3dShowEvidence: false, field3dLabelMode: 'anatomy', ...overrides } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  const end = css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start));
  await page.addStyleTag({ content: css.slice(start, end) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__jointScene?.getObjectByName('dinolab-specimen'))).toBe(true);
  const study = page.locator('.dinolab-shape-study');
  if (!await study.evaluate((node: HTMLDetailsElement) => node.open)) await study.locator(':scope > summary').click();
}
async function frame(page: Page) {
  await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
  return page.evaluate(() => {
    const w = window as any, model = w.__jointScene.getObjectByName('dinolab-specimen'), ids: number[] = [];
    model.traverse((mesh: any) => { if (mesh.geometry) ids.push(mesh.geometry.id); });
    return { uuid: model.uuid, geometry: ids, camera: w.__jointCamera.position.toArray(), rotation: model.rotation.y, canvas: [w.__jointCamera.aspect, document.querySelector('canvas.dinolab-3d-canvas')!.clientHeight] };
  });
}
async function ready(page: Page, species: string, active = true) {
  await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => (window as any).__jointScene.getObjectByName('dinolab-specimen').userData.dinoShapeComparison?.species)).toBe(species);
  await expect.poll(() => page.evaluate(() => {
    const w = window as any, model = w.__jointScene.getObjectByName('dinolab-specimen');
    return !!model.getObjectByName('continuous-torso') === (w.__toolData.dinoLab.field3dShowBody !== false);
  })).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as any).__jointScene.getObjectByName('dinolab-specimen').userData.dinoLimbJointTrace?.active)).toBe(active);
}
async function traceAudit(page: Page) {
  await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
  return page.evaluate(() => {
    const w = window as any, model = w.__jointScene.getObjectByName('dinolab-specimen'), camera = w.__jointCamera, canvas = document.querySelector('canvas.dinolab-3d-canvas')!, trace = model.userData.dinoLimbJointTrace;
    let anchorError = 0, worldError = 0, screenError = 0;
    for (const chain of trace.chains) {
      const native = model.userData.dinoFullBodyAnatomy.limbs.find((limb: any) => limb.front === (chain.id === 'fore') && limb.side === chain.side);
      const originals = [native.top, native.knee, native.ankle, native.foot];
      for (let i = 0; i < 4; i++) {
        const joint = chain.joints[i], expectedWorld = model.localToWorld(new w.THREE.Vector3().fromArray(originals[i])), clip = expectedWorld.clone().project(camera);
        anchorError = Math.max(anchorError, ...joint.anchor.map((value: number, axis: number) => Math.abs(value - originals[i][axis])));
        worldError = Math.max(worldError, expectedWorld.distanceTo(new w.THREE.Vector3().fromArray(joint.world)));
        screenError = Math.max(screenError, Math.abs(joint.screen[0] - (clip.x + 1) * canvas.clientWidth / 2), Math.abs(joint.screen[1] - (1 - clip.y) * canvas.clientHeight / 2));
      }
    }
    const visible = Array.from(document.querySelectorAll<SVGGElement>('[data-dino-joint-label]')).filter(node => node.style.display !== 'none' && node.parentElement!.style.display !== 'none').map(node => node.dataset.dinoJointLabel).sort();
    const paths = Array.from(document.querySelectorAll<SVGGElement>('[data-dino-joint-chain]')).filter(node => node.style.display !== 'none').map(node => ({ id: node.dataset.dinoJointChain, points: node.querySelector('polyline')!.getAttribute('points') }));
    return { trace, visible, paths, anchorError, worldError, screenError, family: model.userData.dinoFullBodyAnatomy.family };
  });
}

test('joint guides follow actual native limbs across all reviewed full-body families without rebuilding on toggle', async ({ page }) => {
  await mount(page);
  const audit: any[] = [];
  for (const family of [
    { id: 'ankylosaurs', a: 'ankylosaurus', b: 'euoplocephalus' },
    { id: 'sauropods', a: 'brachiosaurus', b: 'diplodocus' },
    { id: 'ornithopods', a: 'edmontosaurus', b: 'iguanodon' },
    { id: 'ceratopsids', a: 'triceratops', b: 'styracosaurus' }
  ]) {
    await page.locator('[data-dino-shape-family="' + family.id + '"]').click();
    await page.locator('[data-dino-shape-lens="limbs"]').click();
    await page.locator('[data-dino-shape-layer="life"]').click();
    await ready(page, family.a, false);
    const before = await frame(page);
    await page.locator('[data-dino-joint-trace-toggle]').click(); await ready(page, family.a);
    expect(await frame(page)).toEqual(before);
    const first = await traceAudit(page);
    expect(first.family).toBe(family.id); expect(first.trace.chains).toHaveLength(2);
    expect(first.anchorError).toBe(0); expect(first.worldError).toBeLessThan(1e-6); expect(first.screenError).toBeLessThan(1e-4);
    expect(first.visible).toEqual([...first.trace.visible].sort()); expect(first.visible.length).toBeGreaterThan(0);
    expect(first.paths).toHaveLength(2); expect(first.paths.every(item => !/NaN|Infinity/.test(item.points))).toBe(true);
    if (family.id === 'ankylosaurs') await page.locator('canvas.dinolab-3d-canvas').screenshot({ path: path.join(report, 'joint-trace-life-desktop.png') });
    await page.locator('[data-dino-shape-dock-side="b"]').click(); await ready(page, family.b);
    const second = await traceAudit(page); expect(second.trace.chains).toHaveLength(2);
    expect(second.anchorError).toBe(0); expect(second.worldError).toBeLessThan(1e-6); expect(second.screenError).toBeLessThan(1e-4);
    audit.push({ family: family.id, first, second });
    await page.locator('[data-dino-joint-trace-toggle]').click(); await ready(page, family.b, false);
  }
  fs.writeFileSync(path.join(report, 'joint-trace-native-audit.json'), JSON.stringify(audit, null, 2));
});

test('joint guide context survives orbit and bone/life comparisons and stays accessible on mobile', async ({ page }) => {
  const writing = { version: 1, pairs: [{ key: 'ankylosaurus|euoplocephalus', a: 'ankylosaurus', b: 'euoplocephalus', step: 'explain', prediction: 'The supporting forelimbs may differ.', evidence: ['traits'], explanation: 'My own starting explanation.', limit: 'The pose is reconstructed.' }] };
  await mount(page, { compareInquiry: writing });
  await page.locator('[data-dino-shape-family="ankylosaurs"]').click(); await page.locator('[data-dino-shape-lens="limbs"]').click();
  await page.locator('[data-dino-shape-layer="life"]').click();
  await page.locator('[data-dino-joint-trace-toggle]').click(); await ready(page, 'ankylosaurus');
  await page.locator('.dinolab-view-check > summary').click();
  await page.locator('[data-dino-shape-keep-view="1"]').click();
  await expect(page.locator('[data-dino-shape-view-caption="1"]')).toContainText('reconstructed joint guide on');
  const first = await traceAudit(page), beforeOrbit = await frame(page);
  const canvas = page.locator('canvas.dinolab-3d-canvas'); await canvas.focus();
  for (let i = 0; i < 4; i++) await canvas.press('ArrowRight');
  await expect.poll(async () => (await frame(page)).rotation).toBeCloseTo(beforeOrbit.rotation + 4 * Math.PI / 12, 5);
  await expect.poll(async () => JSON.stringify((await traceAudit(page)).trace.chains)).not.toBe(JSON.stringify(first.trace.chains));
  const afterOrbit = await frame(page); expect(afterOrbit.geometry).toEqual(beforeOrbit.geometry); expect(afterOrbit.uuid).toBe(beforeOrbit.uuid);
  const lifeAfterOrbit = await traceAudit(page);
  await page.locator('[data-dino-shape-layer="bone"]').click(); await ready(page, 'ankylosaurus');
  const bone = await traceAudit(page);
  expect(bone.trace.chains.map(chain => chain.joints.map(joint => joint.anchor))).toEqual(lifeAfterOrbit.trace.chains.map(chain => chain.joints.map(joint => joint.anchor)));
  await page.locator('[data-dino-shape-dock-side="b"]').click(); await ready(page, 'euoplocephalus');
  await page.locator('[data-dino-shape-keep-view="2"]').click();
  await expect(page.locator('[data-dino-shape-view-caption="2"]')).toContainText('Euoplocephalus · Bone structure');
  await expect(page.locator('[data-dino-shape-view-caption="2"]')).toContainText('reconstructed joint guide on');
  await page.locator('[data-dino-shape-replay-view="1"]').click(); await ready(page, 'euoplocephalus');
  await expect(page.locator('[data-dino-joint-trace-toggle]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-dino-shape-append-views]').click();
  await expect(page.locator('#dinolab-shape-view-check-status')).toContainText('appended');
  const readData = () => page.evaluate(() => (window as any).__toolData.dinoLab);
  const saved = (await readData()).compareInquiry.pairs[0];
  expect(saved.prediction).toBe(writing.pairs[0].prediction); expect(saved.limit).toBe(writing.pairs[0].limit); expect(saved.explanation).toContain(writing.pairs[0].explanation); expect(saved.explanation).toContain('reconstructed joint guide on'); expect(saved.explanation).toContain('not fossil proof');
  await page.setViewportSize({ width: 341, height: 920 }); await ready(page, 'euoplocephalus');
  await expect.poll(async () => (await traceAudit(page)).visible.length).toBeLessThanOrEqual(4);
  const mobile = await traceAudit(page); expect(mobile.visible.length).toBeLessThanOrEqual(4); expect(mobile.screenError).toBeLessThan(1e-4);
  const control = page.locator('[data-dino-joint-trace-toggle]'); await control.focus(); await control.press('Enter');
  await expect(control).toHaveAttribute('aria-pressed', 'false'); await control.press('Enter'); await ready(page, 'euoplocephalus');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const buttonBox = await control.boundingBox(); expect(buttonBox!.height).toBeGreaterThanOrEqual(44);
  await page.locator('.dinolab-joint-trace-control').screenshot({ path: path.join(report, 'joint-trace-mobile-controls.png') });
  await canvas.screenshot({ path: path.join(report, 'joint-trace-mobile-model.png') });
  await page.locator('[data-dino-shape-lens="allocation"]').click(); await expect(page.locator('[data-dino-joint-trace-toggle]')).toHaveCount(0);
  await page.locator('[data-dino-shape-lens="limbs"]').click(); await expect(page.locator('[data-dino-joint-trace-toggle]')).toHaveAttribute('aria-pressed', 'false');
  fs.writeFileSync(path.join(report, 'joint-trace-learning-audit.json'), JSON.stringify({ first, bone, mobile, saved }, null, 2));
});
