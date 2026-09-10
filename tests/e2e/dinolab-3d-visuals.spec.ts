import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
test.describe.configure({ timeout: 180_000 });
const report = 'reports/dinolab-3d-visuals';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1180, height: 920, appStyles: true, probes: [
  'var OriginalRenderer = THREE.WebGLRenderer;',
  'THREE.WebGLRenderer = function(opts) { var r = new OriginalRenderer(opts), render = r.render.bind(r); r.render = function(scene, camera) { window.__dinoScene = scene; window.__dinoCamera = camera; return render(scene,camera); }; return r; };'
].join('\n') });
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
async function mount(page, species, width = 1180) {
  await page.setViewportSize({ width, height: 920 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: {
    tab: 'field3d', field3dSelected: species, field3dAutoRotate: false, field3dOrientationDismissed: true,
    field3dShowSkeleton: false, field3dShowBody: true, field3dShowHuman: false, field3dShowEvidence: false, field3dBodyOpacity: 100
  } }, undefined, { expectCanvas: false });
  const styles = fs.readFileSync('app_styles_module.js', 'utf8');
  const start = styles.indexOf(':root, .theme-default {');
  const end = styles.indexOf('/* ─', styles.indexOf('--allo-stem-button-border:#00ff00', start));
  await page.addStyleTag({ content: styles.slice(start, end) });
  await page.evaluate(() => {
    document.body.className = 'theme-default';
    document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block';
  });
  await expect.poll(() => page.evaluate(() => !!(window as any).__dinoScene)).toBe(true);
}
async function inspect(page) {
  return page.evaluate(() => {
    const w = window as any, THREE = w.THREE, scene = w.__dinoScene, camera = w.__dinoCamera;
    const model = scene.getObjectByName('dinolab-specimen');
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    let surfaces = 0, vertices = 0, outside = 0, invalid = 0;
    model.traverse(part => {
      if (!part.isMesh || !part.userData.dinoAnatomy) return;
      if (part.userData.dinoSurface === 'continuous') surfaces++;
      const pos = part.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const p = new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(part.matrixWorld).project(camera);
        vertices++; if (!Number.isFinite(p.x+p.y+p.z)) invalid++;
        if (Math.abs(p.x) > 1 || Math.abs(p.y) > 1 || Math.abs(p.z) > 1) outside++;
      }
    });
    let labels = 0; scene.traverse(p => { if (p.isSprite && p.visible && p.userData.dinoLabel) labels++; });
    return { surfaces, vertices, outside, invalid, labels, yaw: model.rotation.y, canvas: w.__glLive(), errors: w.__events.errors };
  });
}
for (const species of ['tyrannosaurus','triceratops','brachiosaurus','microraptor']) {
  test(species + ' life reconstruction fits the viewport', async ({ page }) => {
    await mount(page,species);
    await page.getByRole('button',{ name: 'Fit whole animal', exact: true }).click();
    const result = await inspect(page);
    fs.writeFileSync(report + '/' + species + '-metrics.json', JSON.stringify(result,null,2));
    expect(result.errors).toEqual([]); expect(result.invalid).toBe(0); expect(result.outside).toBe(0);
    expect(result.surfaces).toBeGreaterThanOrEqual(3); expect(result.canvas.lost).toBe(false);
    await page.locator('.dinolab-3d-canvas').screenshot({ path: report + '/' + species + '-studio.png' });
    if (species === 'tyrannosaurus') { await page.locator('.dinolab-surface-presets').scrollIntoViewIfNeeded(); await page.screenshot({ path:report+'/viewer-controls.png' }); }
  });
}
test('camera presets, labels, habitat, fossil view and mobile layout', async ({ page }) => {
  await mount(page,'stegosaurus',390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button',{ name: 'Fit whole animal', exact: true }).click();
  expect((await inspect(page)).outside).toBe(0);
  await page.locator('.dinolab-3d-canvas').screenshot({ path: report + '/stegosaurus-mobile.png' });
  await page.locator('.dinolab-surface-presets').scrollIntoViewIfNeeded(); await page.screenshot({path:report+'/viewer-controls-mobile.png'});
  await page.getByLabel('Model labels', {exact:true}).selectOption('off');
  expect((await inspect(page)).labels).toBe(0);
  await page.getByRole('button', { name: 'Habitat', exact:true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.dinoLab.field3dStage)).toBe('habitat');
  await page.locator('.dinolab-3d-canvas').screenshot({ path: report + '/stegosaurus-habitat.png' });
  await page.locator('.dinolab-surface-presets').getByRole('button',{ name: /Fossil anchors/ }).click();
  await page.locator('.dinolab-3d-canvas').screenshot({ path: report + '/stegosaurus-fossil.png' });

  await page.getByRole('button', { name: 'Studio', exact: true }).click();
  await page.locator('.dinolab-surface-presets').getByRole('button',{ name: /Life view/ }).click();
  await page.setViewportSize({ width:1180, height:920 });
  await page.locator('.dinolab-3d-controls-disclosure > summary').click();
  for (const [view,yaw] of [['Front',Math.PI/2],['Side',0],['Overhead',0]] as const) {
    await page.getByRole('button', {name:view+' camera view',exact:true}).click();
    await expect.poll(async () => Math.abs((await inspect(page)).yaw-yaw)).toBeLessThan(0.001);
    expect((await inspect(page)).outside,view).toBe(0);
    if (view === 'Overhead') {
      const elevation = await page.evaluate(() => {
        const w=window as any; const direction = w.__dinoCamera.getWorldDirection(new w.THREE.Vector3());
        return Math.asin(-direction.y)*180/Math.PI;
      });
      expect(elevation).toBeGreaterThan(80);
    }
  }
  await page.getByRole('button',{ name:'Fit whole animal', exact:true }).click();
  await page.getByLabel('Model labels',{ exact:true }).selectOption('all');
  await page.locator('.dinolab-surface-presets').getByRole('button',{ name:/Scale check/ }).click();
  const scaleHeight = await page.evaluate(() => {
    const w=window as any, human=w.__dinoScene.getObjectByName('human-scale-reference');
    return new w.THREE.Box3().setFromObject(human).getSize(new w.THREE.Vector3()).y;
  });
  expect(scaleHeight).toBeCloseTo(1.7,3);
  await page.locator('.dinolab-3d-canvas').screenshot({ path:report+'/scale-reference.png' });
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  const audits:any[]=[];
  for (const theme of ['theme-default','theme-dark','theme-contrast']) {
    await page.evaluate(theme=>{ document.body.className=theme; (window as any).__rerender(); },theme);
    const violations = await page.evaluate(async()=> (await (window as any).axe.run(document.querySelector('#dinopanel'), {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
    audits.push({theme,violations});
  }
  fs.writeFileSync(report+'/accessibility.json',JSON.stringify(audits,null,2));
  expect(audits.filter(a=>a.violations.length)).toEqual([]);
  await page.setViewportSize({width:320,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await inspect(page)).errors).toEqual([]);

});
