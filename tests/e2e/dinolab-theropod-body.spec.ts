import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 360_000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
const phase = process.env.DINO_THEROPOD_PHASE === 'before' ? 'before' : 'after';
const report = path.resolve('reports/dinolab-theropod-body');
const ids = ['tyrannosaurus', 'allosaurus', 'coelophysis', 'dilophosaurus'];
const probes = 'var BodyRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new BodyRenderer(o),f=r.render.bind(r);r.render=function(s,c){window.__bodyScene=s;window.__bodyCamera=c;window.__bodyRenderer=r;return f(s,c)};return r};';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document', appStyles: true, probes });
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, id: string) {
  await page.setViewportSize({ width: 1280, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', selected: id, field3dSelected: id, field3dStage: 'studio', field3dOrientationDismissed: true,
    field3dAutoRotate: false, field3dReconstructionMode: 'evidence', field3dShowSkeleton: false, field3dShowBody: true,
    field3dBodyOpacity: 100, field3dShowHuman: false, field3dShowEvidence: false, field3dLabelMode: 'key' } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  const end = css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start));
  await page.addStyleTag({ content: css.slice(start, end) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
  try {
    await expect.poll(() => page.evaluate(() => !!(window as any).__bodyScene?.getObjectByName('dinolab-specimen'))).toBe(true);
  } catch (error) {
    fs.writeFileSync(path.join(report, id+'-'+phase+'-mount-failure.json'), JSON.stringify(await page.evaluate(() => ({ errors:(window as any).__events?.errors, body:document.body.innerText, contexts:(window as any).__glContexts?.() })), null, 2));
    throw error;
  }
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
}
async function view(page: Page, direction: 'Side' | 'Front' | 'Overhead') {
  if (!await page.locator('.dinolab-3d-controls-disclosure').count()) await page.getByRole('button', { name: 'Explore anatomy', exact: true }).click();
  const controls = page.locator('.dinolab-3d-controls-disclosure');
  if (!await controls.evaluate((node: HTMLDetailsElement) => node.open)) await controls.locator('summary').click();
  await controls.getByRole('button', { name: direction+' camera view', exact: true }).click();
  await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
}
async function portrait(page: Page, file: string) {
  const clean = await page.addStyleTag({ content: '.dinolab-3d-readouts,.dinolab-3d-status,.dinolab-3d-camera-readout,.dinolab-viewer-actions,[data-dino-part-label],[data-dino-part-line]{visibility:hidden!important}' });
  await page.locator('canvas.dinolab-3d-canvas').screenshot({ path: path.join(report, file) });
  await clean.evaluate(el => el.remove());
}
async function audit(page: Page) {
  return page.evaluate(() => {
    const w=window as any, model=w.__bodyScene.getObjectByName('dinolab-specimen');
    let invalid=0, triangles=0, manualBoneElements=0, manualLifeElements=0;
    model.traverse((mesh:any)=>{
      if(!mesh.geometry)return;
      for(const attr of Object.values(mesh.geometry.attributes) as any[])if(!Array.from(attr.array).every(Number.isFinite))invalid++;
      triangles+=(mesh.geometry.index?.count||0)/3;
      const tag=mesh.userData.dinoTheropodManualElement;
      if(tag?.layer==='bone')manualBoneElements++;
      if(tag?.layer==='life')manualLifeElements++;
    });
    return { anatomy:model.userData.dinoFullBodyAnatomy, manus:model.userData.dinoTheropodManus, manualBoneElements, manualLifeElements, bodyVisible:!!model.getObjectByName('continuous-torso'), invalid, triangles,
      bounds:new w.THREE.Box3().setFromObject(model).getSize(new w.THREE.Vector3()).toArray(),
      shaders:w.__bodyRenderer.info.programs.filter((p:any)=>p.diagnostics?.runnable===false).length,
      errors:w.__events.errors, lost:w.__glLive()?.lost };
  });
}
function sound(record:any){
  expect(record.invalid).toBe(0); expect(record.triangles).toBeGreaterThan(1000); expect(record.shaders).toBe(0);
  expect(record.errors).toEqual([]); expect(record.lost).toBe(false);
  expect(record.bounds.every((n:number)=>Number.isFinite(n)&&n>0)).toBe(true);
}

test('four theropods render sound native full-body anatomy in life and bone views', async ({page})=>{
  const records:any[]=[];
  for(const id of ids){
    await mount(page,id); await view(page,'Side'); const life=await audit(page); sound(life); expect(life.bodyVisible).toBe(true);
    await portrait(page,id+'-'+phase+'-life-side.png');
    await view(page,'Front'); await portrait(page,id+'-'+phase+'-life-front.png');
    await view(page,'Overhead'); await portrait(page,id+'-'+phase+'-life-overhead.png');
    if(!await page.locator('#dinolab-part-picker').count())await page.getByRole('button',{name:'Explore anatomy',exact:true}).click();
    await page.locator('#dinolab-part-picker').selectOption('head'); await view(page,'Side'); await portrait(page,id+'-'+phase+'-life-head.png');
    await page.locator('#dinolab-part-picker').selectOption('trunk'); await page.locator('[data-dino-part-inspect=bone]').click();
    await expect.poll(()=>page.evaluate(()=>!!(window as any).__bodyScene.getObjectByName('dinolab-specimen').getObjectByName('continuous-torso'))).toBe(false);
    await page.getByRole('button',{name:'Fit whole animal',exact:true}).click(); await view(page,'Side');
    const bone=await audit(page); sound(bone); expect(bone.bodyVisible).toBe(false);
    await portrait(page,id+'-'+phase+'-bone-side.png'); records.push({species:id,life,bone}); await harness.destroy(page);
    if(phase==='after'){
      for(const record of [life,bone]){
        expect(record.anatomy.family).toBe('theropods');expect(record.anatomy.limbs).toHaveLength(4);
        expect(record.anatomy.limbs.filter((l:any)=>l.front)).toHaveLength(2);
        expect(record.manus.species).toBe(id);expect(record.manus.arms).toHaveLength(2);
        expect(record.manus.manualRays).toHaveLength(({tyrannosaurus:3,allosaurus:3,coelophysis:5,dilophosaurus:4} as any)[id]);
        expect(record.manus.carpalSeriesComplete).toBe(false);
        expect(record.manus.sources.every((s:any)=>s.title&&s.url.startsWith('https://'))).toBe(true);
      }
      expect(life.manualBoneElements).toBe(0);expect(life.manualLifeElements).toBeGreaterThan(0);
      expect(bone.manualLifeElements).toBe(0);expect(bone.manualBoneElements).toBeGreaterThan(0);
      expect(bone.anatomy.anchors).toEqual(life.anatomy.anchors);
      expect(bone.manus).toEqual(life.manus);
    }
  }
  fs.writeFileSync(path.join(report,'anatomy-'+phase+'-audit.json'),JSON.stringify(records,null,2));
});
