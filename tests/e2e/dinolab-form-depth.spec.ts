import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
const report = path.resolve('reports/dinolab-form-depth');
const probes = 'var DepthRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new DepthRenderer(o),f=r.render.bind(r);r.render=function(s,c){window.__depthScene=s;window.__depthCamera=c;window.__depthRenderer=r;return f(s,c)};return r};';
const options = { toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document' as const, appStyles: true, probes };
const harness = new GlHarness(options);
let baseline: GlHarness | undefined;
test.beforeAll(async () => {
  fs.mkdirSync(report, { recursive: true });
  if (process.env.DINO_FORM_BASELINE) {
    const previous = process.env.STEM_GL_SUBSTITUTE;
    process.env.STEM_GL_SUBSTITUTE = 'stem_lab/stem_tool_dinolab.js=' + path.resolve(process.env.DINO_FORM_BASELINE);
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
test('long-snouted tyrannosaurs retain coherent head geometry in both model layers', async ({ page }) => {
  const results: any[] = [];
  for (const species of ['qianzhousaurus', 'alioramus']) {
    if (baseline) {
      await mount(page, species, baseline); await page.getByRole('button', { name: 'Study head details', exact: true }).click();
      await portrait(page, species + '-before.png'); await baseline.destroy(page);
    }
    await mount(page, species); await page.getByRole('button', { name: 'Study head details', exact: true }).click();
    await portrait(page, species + '-after.png');
    let result = await audit(page); expect(result.longSnout.snoutScale).toBe(1.4);
    expect(result.invalid).toBe(0); expect(result.shaderFailures).toBe(0); expect(result.errors).toEqual([]); expect(result.lost).toBe(false);
    results.push({ species, life: result });
    await page.getByRole('button', { name: 'Explore anatomy', exact: true }).click();
    await page.locator('#dinolab-part-picker').selectOption('snout');
    await expect(page.locator('.dinolab-part-inspection')).toContainText('Find the eye socket');
    await expect(page.locator('.dinolab-part-inspection a')).toHaveAttribute('href', 'https://doi.org/10.1038/ncomms4788');
    await page.locator('[data-dino-model-lens=anchors]').click();
    result = await audit(page); expect(result.invalid).toBe(0); expect(result.shaderFailures).toBe(0); expect(result.errors).toEqual([]);
    await portrait(page, species + '-bone.png'); await harness.destroy(page);
  }
  fs.writeFileSync(path.join(report, 'head-audit.json'), JSON.stringify(results, null, 2));
});
test('streamlined contour coats stay within the former vertex budget in real WebGL', async ({ page }) => {
  const results: any[] = [];
  for (const species of ['microraptor', 'anchiornis']) {
    let old: any;
    if (baseline) {
      await mount(page, species, baseline); await page.getByRole('button', { name: 'Study body details', exact: true }).click();
      old = await audit(page); await portrait(page, species + '-before.png'); await baseline.destroy(page);
    }
    await mount(page, species); await page.getByRole('button', { name: 'Study body details', exact: true }).click();
    const result = await audit(page); results.push({ species, ...result });
    expect(result.coats.length).toBeGreaterThan(0);
    for (const coat of result.coats) {
      expect(coat.streamlined).toBe(true); expect(coat.openVane).toBe(species === 'anchiornis');
      const prior = old?.coats.find((p: any) => p.region === coat.region); if (prior) expect(coat.vertices).toBeLessThanOrEqual(prior.vertices);
    }
    expect(result.invalid).toBe(0); expect(result.shaderFailures).toBe(0); expect(result.errors).toEqual([]); expect(result.lost).toBe(false);
    await portrait(page, species + '-after.png'); await harness.destroy(page);
  }
  fs.writeFileSync(path.join(report, 'coat-audit.json'), JSON.stringify(results, null, 2));
});
test('student model observations persist through exploration and reach the notebook download', async ({ page }) => {
  await mount(page, 'velociraptor');
  await page.getByRole('button', { name: 'Explore anatomy', exact: true }).click();
  await page.locator('#dinolab-part-picker').selectOption('teeth');
  await page.locator('.dinolab-part-comparison summary').click();
  const record = page.locator('[data-dino-part-comparison-record]'); await expect(record).toBeDisabled();
  await page.locator('[data-dino-part-inspect=bone]').click();
  const before = await page.evaluate(() => { const w = window as any; w.__comparisonRenderer = w.__depthRenderer; return w.__depthCamera.position.toArray(); });
  await page.locator('#dinolab-part-comparison-bone').fill('I can follow the tooth row below the skull openings.');
  await expect(record).toBeDisabled();
  await page.locator('[data-dino-part-inspect=life]').click();
  await page.locator('#dinolab-part-comparison-life').fill('The reconstructed mouth edge covers the tooth row.');
  await page.locator('#dinolab-part-comparison-question').fill('Which tooth-wear evidence could test the covering?');
  await record.click(); await expect(record).toHaveText('Comparison recorded');
  const after = await page.evaluate(() => { const w = window as any; return { position: w.__depthCamera.position.toArray(), sameRenderer: w.__comparisonRenderer === w.__depthRenderer }; });
  expect(after.sameRenderer).toBe(true); after.position.forEach((v: number, i: number) => expect(v).toBeCloseTo(before[i], 5));
  await page.locator('#dinolab-part-comparison-life').fill('My revised description of the reconstructed mouth.');
  await expect(page.locator('#dinolab-part-comparison-status')).toContainText('unrecorded revision');
  await page.locator('#dinolab-part-picker').selectOption('eyes');
  await page.locator('#dinolab-part-picker').selectOption('teeth');
  await page.locator('.dinolab-part-comparison summary').click();
  await expect(page.locator('#dinolab-part-comparison-life')).toHaveValue('My revised description of the reconstructed mouth.');
  await page.getByRole('button', { name: 'Open comparison notebook', exact: true }).click();
  await expect(page.locator('#dino-model-comparisons-notebook')).toBeVisible();
  await page.locator('[data-dino-part-comparison-note] summary').click();
  await expect(page.locator('.dinolab-model-comparisons-notebook')).toContainText('The reconstructed mouth edge covers the tooth row.');
  await expect(page.locator('.dinolab-model-comparisons-notebook')).toContainText('My revised description');
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download notebook', exact: true }).click();
  const download = await pending, text = fs.readFileSync((await download.path())!, 'utf8');
  expect(text).toContain('MODEL LANDMARK COMPARISONS'); expect(text).toContain('Latest recorded comparison');
  expect(text).toContain('Current unrecorded draft'); expect(text).toContain('https://doi.org/10.1126/science.abo7877');
  await page.locator('.dinolab-model-comparisons-notebook').screenshot({ path: path.join(report, 'comparison-notebook.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.locator('.dinolab-model-comparisons-notebook').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.locator('.dinolab-model-comparisons-notebook').screenshot({ path: path.join(report, 'comparison-notebook-mobile.png') });
});
