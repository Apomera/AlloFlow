import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0 });
test.use({ video: 'off', trace: 'off', actionTimeout: 60_000 });
const report = 'reports/dinolab-skin-depth';
const phase = process.env.DINO_SKIN_PHASE === 'before' ? 'before' : 'after';
const harness = new GlHarness({ toolFile: process.env.DINO_SKIN_SOURCE || 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document', appStyles: true,
  probes: 'var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),draw=r.render.bind(r);r.render=function(s,c){window.__skinScene=s;window.__skinCamera=c;window.__skinRenderer=r;return draw(s,c);};return r;};' });
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, species: string, mode = 'evidence') {
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', selected: species, field3dSelected: species, field3dStage: 'studio', field3dReconstructionMode: mode,
    field3dAutoRotate: false, field3dOrientationDismissed: true, field3dWorkflowStarted: false,
    field3dShowSkeleton: false, field3dShowBody: true, field3dShowHuman: false, field3dShowEvidence: false, field3dBodyOpacity: 100 } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  await page.addStyleTag({ content: css.slice(start, css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start))) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__skinScene?.getObjectByName('dinolab-specimen'))).toBe(true);
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
}
async function portrait(page: Page, name: string) {
  const clean = await page.addStyleTag({ content: '.dinolab-3d-readouts,.dinolab-3d-status,.dinolab-3d-camera-readout,.dinolab-viewer-actions,[data-dino-part-label],[data-dino-part-line]{visibility:hidden!important}' });
  await page.locator('canvas.dinolab-3d-canvas').screenshot({ path: report + '/' + phase + '-' + name + '.png' });
  await clean.evaluate(node => node.remove());
}
async function audit(page: Page) {
  return page.evaluate(() => {
    const w = window as any, r = w.__skinRenderer, m = w.__skinScene.getObjectByName('dinolab-specimen');
    const materials = new Map(), textures = new Map(); let geometry = 2166136261, normals = 2166136261, vertices = 0, rootedScales = 0, invalid = 0;
    function hash(data: ArrayLike<number>) { let h = 2166136261; for (let i = 0; i < data.length; i++) h = Math.imul(h ^ Math.round(data[i] * 1e6), 16777619); return h >>> 0; }
    m.traverse((mesh: any) => {
      if (!mesh.isMesh || !mesh.geometry || mesh.userData.dinoContour) return;
      const a = mesh.geometry.attributes;
      if (a.position) { geometry = Math.imul(geometry ^ hash(a.position.array), 16777619); vertices += a.position.count; }
      if (a.normal) normals = Math.imul(normals ^ hash(a.normal.array), 16777619);
      if (!mesh.material?.userData.dinoSkinMapping) return;
      if (mesh.userData.dinoFeature === 'surface-scale' && mesh.material.userData.dinoIllustratedPigment && mesh.userData.dinoSkinHostNormal) rootedScales++;
      for (const attr of ['dinoSkinPosition', 'dinoSkinNormal']) if (!a[attr] || !Array.from(a[attr].array).every(Number.isFinite)) invalid++;
      const mat = mesh.material, uniforms = r.properties.get(mat).uniforms;
      // Inspect uniforms uploaded by the renderer, not a synthetic shader call.
      if (uniforms) materials.set(mat.uuid, { key: mat.customProgramCacheKey(), illustrated: mat.userData.dinoIllustratedPigment,
        back: uniforms.dinoIllustratedBackTint?.value.toArray(), underside: uniforms.dinoIllustratedUndersideTint?.value.toArray(),
        shade: uniforms.dinoShadeStrength?.value });
      for (const key of ['map', 'bumpMap', 'roughnessMap']) {
        const t = mat[key]; if (!t?.image?.getContext || textures.has(t.uuid)) continue;
        const data = t.image.getContext('2d').getImageData(0, 0, t.image.width, t.image.height).data;
        textures.set(t.uuid, { channel: t.userData.channel, hash: hash(data), width: t.image.width, height: t.image.height });
      }
    });
    return { model: m.uuid, geometry: geometry >>> 0, normals: normals >>> 0, vertices, rootedScales, invalid,
      materials: [...materials.values()], textures: [...textures.values()].sort((a, b) => a.channel.localeCompare(b.channel)),
      memory: { ...r.info.memory }, errors: w.__events.errors, lost: w.__glLive().lost,
      shaders: r.info.programs.filter((p: any) => p.diagnostics?.runnable === false).length,
      fitsPage: document.documentElement.scrollWidth <= innerWidth };
  });
}
function sound(row: Awaited<ReturnType<typeof audit>>) {
  expect(row.errors).toEqual([]); expect(row.lost).toBe(false); expect(row.shaders).toBe(0); expect(row.invalid).toBe(0);
  expect(row.vertices).toBeGreaterThan(1000); expect(row.materials.length).toBeGreaterThan(0); expect(row.textures).toHaveLength(3); expect(row.fitsPage).toBe(true);
}

test('illustrated scaled skin remains continuous in whole, head and phone studies', async ({ page }) => {
  const records: any[] = [];
  for (const species of ['tyrannosaurus', 'parasaurolophus']) {
    await mount(page, species); await portrait(page, species + '-whole'); const whole = await audit(page); sound(whole);
    const illustrated = whole.materials.filter(mat => mat.illustrated); expect(illustrated.length).toBeGreaterThan(0);
    if (phase === 'after') {
      expect(whole.rootedScales).toBeGreaterThan(0);
      for (const mat of illustrated) { expect(mat.key).toBe('dinolab-specimen-skin-zones-v1'); expect(mat.back.every(v => v > 0 && v < 1)).toBe(true); expect(mat.underside.every(v => v >= 1 && v <= 3)).toBe(true); expect(mat.shade).toBe(0); }
    }
    await page.getByRole('button', { name: 'Study head details', exact: true }).click(); await portrait(page, species + '-head');
    const head = await audit(page); sound(head); expect(head.model).toBe(whole.model); expect(head.geometry).toBe(whole.geometry); expect(head.textures).toEqual(whole.textures);
    if (species === 'tyrannosaurus') {
      await page.setViewportSize({ width: 390, height: 844 }); await portrait(page, species + '-phone-head'); sound(await audit(page));
    }
    records.push({ species, whole, head }); await harness.destroy(page);
  }
  fs.writeFileSync(report + '/' + phase + '-illustrated.json', JSON.stringify(records, null, 2));
});

test('direct pigment and neutral study palettes retain their native shader and textures', async ({ page }) => {
  const records: any[] = [];
  for (const [species, mode] of [['psittacosaurus', 'evidence'], ['tyrannosaurus', 'conservative']]) {
    await mount(page, species, mode); await portrait(page, species + '-' + mode); const row = await audit(page); sound(row);
    // The baseline incorrectly passed the conservative hypothesis ID instead
    // of its neutral palette mode. Keep that capture to verify the correction.
    if (phase === 'after' || mode !== 'conservative') for (const mat of row.materials) { expect(mat.illustrated).toBe(false); expect(mat.back).toBeUndefined(); expect(mat.underside).toBeUndefined(); }
    records.push({ species, mode, ...row }); await harness.destroy(page);
  }
  fs.writeFileSync(report + '/' + phase + '-preserved.json', JSON.stringify(records, null, 2));
});

test('neutral study labels a simplified palette for a species with fossil pigment evidence', async ({ page }) => {
  await mount(page, 'psittacosaurus', 'conservative');
  const row = await audit(page); sound(row);
  for (const mat of row.materials) { expect(mat.illustrated).toBe(false); expect(mat.back).toBeUndefined(); }
  await expect(page.locator('.dinolab-3d-readouts')).toContainText(phase === 'after' ? 'Colour illustrated' : 'Colour from fossil pigment');
  await portrait(page, 'psittacosaurus-neutral');
  fs.writeFileSync(report + '/' + phase + '-neutral-pigment.json', JSON.stringify(row, null, 2));
});
