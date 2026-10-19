import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ mode: 'default', timeout: 240_000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
const report = path.resolve('reports/dinolab-model-realism');
const probes = 'var ModelRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new ModelRenderer(o),f=r.render.bind(r);r.render=function(s,c){window.__modelScene=s;window.__modelCamera=c;window.__modelRenderer=r;return f(s,c)};return r};';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document', appStyles: true, probes });
let baseline: GlHarness | undefined;
test.beforeAll(async () => {
  fs.mkdirSync(report, { recursive: true });
  if (process.env.DINO_REALISM_BASELINE) {
    const original = process.env.STEM_GL_SUBSTITUTE;
    process.env.STEM_GL_SUBSTITUTE = 'stem_lab/stem_tool_dinolab.js=' + path.resolve(process.env.DINO_REALISM_BASELINE);
    baseline = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document', appStyles: true, probes });
    await baseline.start();
    if (original === undefined) delete process.env.STEM_GL_SUBSTITUTE; else process.env.STEM_GL_SUBSTITUTE = original;
  }
  await harness.start();
});
test.afterAll(async () => { await harness.stop(); await baseline?.stop(); });
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, species: string, source = harness) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await source.mount(page, { dinoLab: { tab: 'field3d', field3dStage: 'studio', field3dSelected: species,
    field3dOrientationDismissed: true, field3dAutoRotate: false, field3dReconstructionMode: 'evidence',
    field3dShowSkeleton: false, field3dShowBody: true, field3dBodyOpacity: 100,
    field3dShowEvidence: false, field3dShowHuman: false, field3dLabelMode: 'key' } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8');
  const start = css.indexOf(':root, .theme-default {');
  const end = css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start));
  await page.addStyleTag({ content: css.slice(start, end) });
  await page.evaluate(() => {
    document.body.className = 'theme-default';
    document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block';
  });
  await expect.poll(() => page.evaluate(() => !!(window as any).__modelScene?.getObjectByName('dinolab-specimen'))).toBe(true);
  await expect.poll(async () => (await source.glScene(page))?.draws || 0).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
}

async function portrait(page: Page, filename: string) {
  const clean = await page.addStyleTag({ content: '.dinolab-3d-readouts,.dinolab-3d-status,.dinolab-3d-camera-readout,.dinolab-fit-model,[data-dino-part-label]{visibility:hidden!important}' });
  await page.locator('canvas.dinolab-3d-canvas').screenshot({ path: path.join(report, filename) });
  await clean.evaluate(el => el.remove());
}

async function audit(page: Page) {
  return page.evaluate(() => {
    const w = window as any, model = w.__modelScene.getObjectByName('dinolab-specimen');
    let invalid = 0, vertices = 0, optics: any[] = [], curvedCervicals = 0;
    const opticalMaterials = new Set();
    model.traverse((mesh: any) => {
      if (!mesh.isMesh || !mesh.geometry) return;
      vertices += mesh.geometry.attributes.position?.count || 0;
      for (const a of Object.values(mesh.geometry.attributes) as any[]) if (!Array.from(a.array).every(Number.isFinite)) invalid++;
      if (![...mesh.position.toArray(), ...mesh.scale.toArray(), ...mesh.quaternion.toArray()].every(Number.isFinite)) invalid++;
      if (mesh.name === 'curved-cervical-centrum') curvedCervicals++;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material: any) => {
        if (opticalMaterials.has(material)) return;
        opticalMaterials.add(material);
        if (material?.userData?.dinoOpenVaneContour || material?.userData?.dinoFeatherIridescence)
          optics.push({ openVane: !!material.userData.dinoOpenVaneContour, iridescent: !!material.userData.dinoFeatherIridescence, roughness: material.roughness, key: material.customProgramCacheKey() });
      });
    });
    return { invalid, vertices, optics, curvedCervicals, pose: model.userData.dinoMatureTyrannosaurPose,
      neck: model.userData.dinoCervicalProfile, parts: model.userData.anatomyParts?.length || 0,
      shaderFailures: w.__modelRenderer.info.programs.filter((p: any) => p.diagnostics?.runnable === false).length,
      errors: w.__events.errors, lost: w.__glLive().lost };
  });
}

test('mature tyrannosaur silhouette and cervical bones remain coherent in the real renderer', async ({ page }) => {
  if (baseline) {
    await mount(page, 'tyrannosaurus', baseline); await portrait(page, 'tyrannosaurus-before.png'); await baseline.destroy(page);
  }
  await mount(page, 'tyrannosaurus');
  const life = await audit(page);
  expect(life.pose.inferred).toBe(true); expect(life.neck.points).toHaveLength(5);
  expect(life.invalid).toBe(0); expect(life.shaderFailures).toBe(0); expect(life.errors).toEqual([]); expect(life.lost).toBe(false);
  expect(life.parts).toBeGreaterThanOrEqual(31);
  await portrait(page, 'tyrannosaurus-after.png');
  await page.locator('[data-dino-model-lens=anchors]').click();
  await expect.poll(async () => (await audit(page)).curvedCervicals).toBeGreaterThan(5);
  const skeleton = await audit(page);
  expect(skeleton.invalid).toBe(0); expect(skeleton.shaderFailures).toBe(0); expect(skeleton.lost).toBe(false);
  fs.writeFileSync(path.join(report, 'tyrannosaurus-audit.json'), JSON.stringify({ life, skeleton }, null, 2));
});

test('fossil-supported feather surfaces compile for both closed and open vane profiles', async ({ page }) => {
  const results: any[] = [];
  for (const species of ['microraptor', 'anchiornis']) {
    if (baseline) {
      await mount(page, species, baseline);
      await page.getByRole('button', { name: 'Study body details', exact: true }).click();
      await portrait(page, species + '-before.png'); await baseline.destroy(page);
    }
    await mount(page, species);
    await page.getByRole('button', { name: 'Study body details', exact: true }).click();
    const result = await audit(page); results.push({ species, ...result });
    expect(result.invalid).toBe(0); expect(result.shaderFailures).toBe(0); expect(result.errors).toEqual([]); expect(result.lost).toBe(false);
    expect(result.optics.length).toBeGreaterThan(0);
    expect(result.optics.some(p => species === 'microraptor' ? p.iridescent : p.openVane)).toBe(true);
    await portrait(page, species + '-after.png');
    await harness.destroy(page);
  }
  fs.writeFileSync(path.join(report, 'feather-audit.json'), JSON.stringify(results, null, 2));
});

test('paired landmark inspection keeps the live camera and selected evidence context', async ({ page }) => {
  await mount(page, 'velociraptor');
  await page.getByRole('button', { name: 'Explore anatomy', exact: true }).click();
  await page.locator('#dinolab-part-picker').selectOption('teeth');
  await expect(page.locator('.dinolab-part-inspection')).toBeVisible();
  let before = await page.evaluate(() => {
    const w = window as any; w.__inspectionRenderer = w.__modelRenderer;
    return { position: w.__modelCamera.position.toArray(), quaternion: w.__modelCamera.quaternion.toArray() };
  });
  for (const mode of ['bone', 'life']) {
    await page.locator('[data-dino-part-inspect=' + mode + ']').click();
    await expect(page.locator('[data-dino-part-inspect=' + mode + ']')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#dinolab-part-picker')).toHaveValue('teeth');
    const after = await page.evaluate(() => {
      const w = window as any; return { position: w.__modelCamera.position.toArray(), quaternion: w.__modelCamera.quaternion.toArray(), sameRenderer: w.__modelRenderer === w.__inspectionRenderer };
    });
    expect(after.sameRenderer).toBe(true);
    after.position.forEach((value: number, i: number) => expect(value).toBeCloseTo(before.position[i], 5));
    after.quaternion.forEach((value: number, i: number) => expect(value).toBeCloseTo(before.quaternion[i], 5));
    const result = await audit(page); expect(result.invalid).toBe(0); expect(result.shaderFailures).toBe(0); expect(result.errors).toEqual([]);
  }
  // A student can continue orbiting/zooming and compare from the new viewpoint.
  const canvas = page.locator('canvas.dinolab-3d-canvas');
  await canvas.press('ArrowRight'); await canvas.press('PageUp');
  const moved = await page.evaluate(() => {
    const w = window as any; return { position: w.__modelCamera.position.toArray(), quaternion: w.__modelCamera.quaternion.toArray() };
  });
  expect(moved.position).not.toEqual(before.position);
  before = moved;
  await page.locator('[data-dino-part-inspect=bone]').click();
  await expect(page.locator('[data-dino-part-inspect=bone]')).toHaveAttribute('aria-pressed', 'true');
  const compared = await page.evaluate(() => {
    const w = window as any; return { position: w.__modelCamera.position.toArray(), quaternion: w.__modelCamera.quaternion.toArray() };
  });
  compared.position.forEach((value: number, i: number) => expect(value).toBeCloseTo(before.position[i], 5));
  compared.quaternion.forEach((value: number, i: number) => expect(value).toBeCloseTo(before.quaternion[i], 5));
  await page.locator('.dinolab-part-inspection').screenshot({ path: path.join(report, 'paired-evidence-inspection.png') });
});
