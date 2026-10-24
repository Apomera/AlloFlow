import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
const report = path.resolve('reports/dinolab-connected-anatomy');
const probes = 'var DepthRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new DepthRenderer(o),f=r.render.bind(r);r.render=function(s,c){window.__depthScene=s;window.__depthCamera=c;window.__depthRenderer=r;return f(s,c)};return r};';
const options = { toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document' as const, appStyles: true, probes };
const harness = new GlHarness(options);
let baseline: GlHarness | undefined;
test.beforeAll(async () => {
  fs.mkdirSync(report, { recursive: true });
  if (process.env.DINO_CONNECTED_BASELINE) {
    const previous = process.env.STEM_GL_SUBSTITUTE;
    process.env.STEM_GL_SUBSTITUTE = 'stem_lab/stem_tool_dinolab.js=' + path.resolve(process.env.DINO_CONNECTED_BASELINE);
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

test('Spinosaurus tail collar joins the pelvic shading without changing its framing', async ({ page }) => {
  let before: number[] | undefined;
  if (baseline) {
    await mount(page, 'spinosaurus', baseline); await select(page, 'tail'); await viewpoint(page, 'side');
    before = await page.evaluate(() => (window as any).__depthCamera.position.toArray());
    await portrait(page, 'spinosaurus-collar-before.png'); await baseline.destroy(page);
  }
  await mount(page, 'spinosaurus'); await select(page, 'tail'); await viewpoint(page, 'side');
  const result = await page.evaluate(() => {
    const w = window as any, model = w.__depthScene.getObjectByName('dinolab-specimen');
    let blend: any;
    model.traverse((part: any) => { if (part.userData.dinoTailNormalBlend) blend = part.userData.dinoTailNormalBlend; });
    return { blend, camera: w.__depthCamera.position.toArray() };
  });
  expect(result.blend.changed[0]).toBe(0); expect(result.blend.changed[1]).toBeGreaterThan(0);
  if (before) result.camera.forEach((v: number, i: number) => expect(v).toBeCloseTo(before![i], 6));
  await sound(page); await portrait(page, 'spinosaurus-collar-after.png');
  fs.writeFileSync(path.join(report, 'collar-audit.json'), JSON.stringify(result, null, 2));
});

test('students trace real joint landmarks and keep their frame across endpoints and layers', async ({ page }) => {
  await mount(page, 'tyrannosaurus'); await select(page, 'knee');
  const activity = page.locator('.dinolab-supporting-relation[data-dino-support-relation=knee-ankle]');
  await activity.locator('summary').click();
  await activity.locator('[data-dino-support-start]').click();
  await expect(activity.locator('[data-dino-support-endpoint=knee]')).toHaveAttribute('aria-pressed', 'true');
  await expect(activity.locator('[data-dino-support-endpoint=knee]')).toBeFocused();
  const frame = await page.evaluate(() => {
    const w = window as any; w.__traceRenderer = w.__depthRenderer;
    return { position: w.__depthCamera.position.toArray(), quaternion: w.__depthCamera.quaternion.toArray() };
  });
  const checkFrame = async () => {
    const next = await page.evaluate(() => {
      const w = window as any; return { sameRenderer: w.__traceRenderer === w.__depthRenderer,
        position: w.__depthCamera.position.toArray(), quaternion: w.__depthCamera.quaternion.toArray() };
    });
    expect(next.sameRenderer).toBe(true);
    next.position.forEach((v: number, i: number) => expect(v).toBeCloseTo(frame.position[i], 5));
    next.quaternion.forEach((v: number, i: number) => expect(v).toBeCloseTo(frame.quaternion[i], 5));
  };
  for (const endpoint of ['ankle', 'knee']) {
    await activity.locator('[data-dino-support-endpoint=' + endpoint + ']').click();
    await expect(page.locator('#dinolab-part-picker')).toHaveValue(endpoint); await checkFrame();
    // The study renderer pauses while its canvas is outside the viewport.
    await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => (window as any).__depthScene.getObjectByName('dinolab-specimen').userData.dinoSupportingTrace?.id)).toBe('knee-ankle');
    await expect(page.locator('[data-dino-part-label=knee]')).toContainText('A ·');
    await expect(page.locator('[data-dino-part-label=ankle]')).toContainText('B ·');
    fs.writeFileSync(path.join(report, 'trace-layout-audit.json'), JSON.stringify(await page.evaluate(() => {
      const w = window as any, canvas = document.querySelector('canvas.dinolab-3d-canvas') as HTMLElement;
      const readouts = canvas.parentElement!.querySelector('.dinolab-3d-readouts') as HTMLElement;
      const labels = Array.from(document.querySelectorAll('[data-dino-part-label]')).filter(el => ['knee', 'ankle'].includes(el.getAttribute('data-dino-part-label') || ''));
      const points: any[] = [];
      w.__depthScene.getObjectByName('dinolab-specimen').traverse((node: any) => {
        if (!['knee', 'ankle'].includes(node.userData.dinoBodyPart)) return;
        const p = node.getWorldPosition(new w.THREE.Vector3()).project(w.__depthCamera);
        points.push({ id: node.userData.dinoBodyPart, x: (p.x + 1) * canvas.clientWidth / 2, y: (1 - p.y) * canvas.clientHeight / 2, z: p.z });
      });
      return { points, canvas: [canvas.clientWidth, canvas.clientHeight], readouts: readouts && [readouts.offsetTop, readouts.offsetHeight],
        labels: labels.map(el => ({ id: el.getAttribute('data-dino-part-label'), style: el.getAttribute('style') })), trace: w.__depthScene.getObjectByName('dinolab-specimen').userData.dinoSupportingTrace };
    }), null, 2));
    await expect(page.locator('[data-dino-part-label=knee]')).toBeVisible();
    await expect(page.locator('[data-dino-part-label=ankle]')).toBeVisible();
  }
  await page.locator('[data-dino-part-inspect=bone]').click();
  await expect(page.locator('[data-dino-part-inspect=bone]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
  await checkFrame(); await sound(page);
  await page.locator('canvas.dinolab-3d-canvas').screenshot({ path: path.join(report, 'knee-ankle-bone-trace.png') });
  await page.locator('[data-dino-part-inspect=life]').click();
  await expect(page.locator('[data-dino-part-inspect=life]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
  await checkFrame(); await sound(page);
  await page.locator('canvas.dinolab-3d-canvas').screenshot({ path: path.join(report, 'knee-ankle-life-trace.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await activity.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await activity.screenshot({ path: path.join(report, 'connected-parts-mobile.png') });
  await activity.locator('[data-dino-support-end]').click();
  await expect(activity.locator('[data-dino-support-start]')).toBeVisible();
  await expect(activity.locator('[data-dino-support-start]')).toBeFocused();
  await expect(page.locator('#dinolab-part-picker')).toHaveValue('knee');
  await sound(page);
});

test('baryonychine skulls show matched expanded rostral ends and source-linked exploration', async ({ page }) => {
  const records: any[] = [];
  const inspect = async () => page.evaluate(() => {
    const w = window as any, model = w.__depthScene.getObjectByName('dinolab-specimen');
    const profile = model.userData.dinoBaryonychineRostrum;
    if (!profile) return { profile: null, parts: [], trace: model.userData.dinoSupportingTrace };
    const inverse = model.matrixWorld.clone().invert(), parts: any[] = [];
    model.traverse((mesh: any) => {
      const detail = mesh.userData.dinoBaryonychineRostrum;
      if (!detail || !mesh.geometry) return;
      const position = mesh.geometry.attributes.position, points: any[] = [];
      for (let i = 0; i < position.count; i++) {
        const point = new w.THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
        points.push({ t: (profile.head[0] - point.x) / (profile.head[0] - profile.tip[0]), z: Math.abs(point.z - profile.head[2]) });
      }
      const widthAt = (t: number) => Math.max(0, ...points.filter(p => Math.abs(p.t - t) < 0.025).map(p => p.z));
      parts.push({ ...detail, vertices: position.count, waistWidth: widthAt(0.76), tipWidth: widthAt(0.91) });
    });
    return { profile, parts, trace: model.userData.dinoSupportingTrace };
  });
  for (const species of ['baryonyx', 'suchomimus']) {
    if (baseline) {
      await mount(page, species, baseline); await select(page, 'snout'); await viewpoint(page, 'side');
      for (let step = 0; step < 16; step++) await page.locator('canvas.dinolab-3d-canvas').press('ArrowUp');
      await portrait(page, species + '-rostrum-before.png'); await baseline.destroy(page);
    }
    await mount(page, species); await select(page, 'snout'); await viewpoint(page, 'overhead');
    const life = await inspect(); expect(life.profile?.profile).toBe('baryonychine-rosette');
    for (const kind of ['upper', 'lower']) {
      const shell = life.parts.find(p => p.kind === kind); expect(shell).toBeTruthy();
      expect(shell.tipWidth).toBeGreaterThan(shell.waistWidth);
    }
    await expect(page.locator('.dinolab-part-inspection')).toContainText('expanded');
    await sound(page); await portrait(page, species + '-rostrum-life-overhead.png');
    await viewpoint(page, 'side'); await portrait(page, species + '-rostrum-life-side.png');
    const activity = page.locator('.dinolab-supporting-relation[data-dino-support-relation=snout-teeth]');
    await activity.locator('summary').click(); await activity.locator('[data-dino-support-start]').click();
    await viewpoint(page, 'overhead');
    const camera = await page.evaluate(() => (window as any).__depthCamera.position.toArray());
    await page.locator('[data-dino-part-inspect=bone]').click();
    await expect(page.locator('[data-dino-part-inspect=bone]')).toHaveAttribute('aria-pressed', 'true');
    const bone = await inspect();
    expect(bone.parts.some(p => p.kind === 'bone')).toBe(true);
    expect(bone.parts.some(p => p.kind === 'bone-tooth' && p.dentalCrownPreserved)).toBe(true);
    expect(bone.trace?.ids).toEqual(['snout', 'teeth']);
    const after = await page.evaluate(() => (window as any).__depthCamera.position.toArray());
    after.forEach((v: number, i: number) => expect(v).toBeCloseTo(camera[i], 5));
    await sound(page); await portrait(page, species + '-rostrum-bone-overhead.png');
    records.push({ species, life, bone }); await harness.destroy(page);
  }
  fs.writeFileSync(path.join(report, 'rostrum-audit.json'), JSON.stringify(records, null, 2));
});

