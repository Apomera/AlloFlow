import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
const phase = process.env.DINO_LAMBEOSAUR_BODY_PHASE === 'before' ? 'before' : process.env.DINO_LAMBEOSAUR_BODY_PHASE === 'calibration' ? 'calibration' : 'after';
const report = path.resolve(process.env.DINO_LAMBEOSAUR_BODY_REPORT || 'reports/dinolab-lambeosaur-body');
const probes = 'var NextRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new NextRenderer(o),f=r.render.bind(r);r.render=function(s,c){window.__nextScene=s;window.__nextCamera=c;window.__nextRenderer=r;return f(s,c)};return r};';
const harness = new GlHarness({ toolFile: process.env.DINO_LAMBEOSAUR_NATIVE_SOURCE || 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document', appStyles: true, probes });

test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, species: string) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', field3dSelected: species, field3dStage: 'studio', field3dOrientationDismissed: true,
    field3dAutoRotate: false, field3dReconstructionMode: 'evidence', field3dShowSkeleton: false, field3dShowBody: true,
    field3dBodyOpacity: 100, field3dShowHuman: false, field3dShowEvidence: false, field3dLabelMode: 'key' } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  const end = css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start));
  await page.addStyleTag({ content: css.slice(start, end) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  try {
    await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => !!(window as any).__nextScene?.getObjectByName('dinolab-specimen'))).toBe(true);
  } catch (error) {
    fs.writeFileSync(path.join(report, 'mount-failure-debug.json'), JSON.stringify(await page.evaluate(() => ({
      errors: (window as any).__events?.errors, body: document.body.innerText,
      selected: (window as any).__toolData?.dinoLab, scene: !!(window as any).__nextScene,
      contexts: (window as any).__glContexts?.()
    })), null, 2));
    throw error;
  }
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
}
async function portrait(page: Page, file: string) {
  const clean = await page.addStyleTag({ content: '.dinolab-3d-readouts,.dinolab-3d-status,.dinolab-3d-camera-readout,.dinolab-viewer-actions,[data-dino-part-label],[data-dino-part-line]{visibility:hidden!important}' });
  await page.locator('canvas.dinolab-3d-canvas').screenshot({ path: path.join(report, file) });
  await clean.evaluate(el => el.remove());
}
async function view(page: Page, direction: 'Side' | 'Front' | 'Overhead') {
  if (!await page.locator('.dinolab-3d-controls-disclosure').count()) await page.getByRole('button', { name: 'Explore anatomy', exact: true }).click();
  const controls = page.locator('.dinolab-3d-controls-disclosure');
  if (!await controls.evaluate((node: HTMLDetailsElement) => node.open)) await controls.locator('summary').click();
  await controls.getByRole('button', { name: direction + ' camera view', exact: true }).click();
  await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
}
async function audit(page: Page) {
  return page.evaluate(() => {
    const w=window as any, model=w.__nextScene.getObjectByName('dinolab-specimen'),camera=w.__nextCamera;
    model.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    let invalid=0,triangles=0,vertices=0,inFrame=0;const regions:any={},elements:any[]=[];
    const visible=(object:any)=>{for(let p=object;p;p=p.parent){if(p.visible===false)return false;if(p===model)return true;}return false;};
    model.traverse((mesh:any)=>{
      if(!mesh.geometry)return;
      for(const attr of Object.values(mesh.geometry.attributes) as any[])if(!Array.from(attr.array).every(Number.isFinite))invalid++;
      triangles+=(mesh.geometry.index?.count||0)/3;
      const tag=mesh.userData.dinoLambeosaurBodyElement,p=mesh.geometry.attributes.position;
      if(!tag||!p||!visible(mesh))return;
      const key=tag.region+'|'+tag.layer;regions[key]=(regions[key]||0)+p.count;
      elements.push({name:mesh.name,...tag,vertices:p.count});
      for(let i=0;i<p.count;i++){
        vertices++;const world=new w.THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld),eye=world.clone().applyMatrix4(camera.matrixWorldInverse),clip=world.project(camera);
        if([clip.x,clip.y,clip.z].every(Number.isFinite)&&eye.z<0&&Math.max(Math.abs(clip.x),Math.abs(clip.y),Math.abs(clip.z))<=1.02)inFrame++;
      }
    });
    return {bodyVisible:!!model.getObjectByName('continuous-torso'),anatomy:model.userData.dinoFullBodyAnatomy,
      lambeosaur:model.userData.dinoLambeosaurBody,crest:model.userData.dinoLambeosaurCrest,regions,elements,vertices,inFrame,
      invalid,triangles,bounds:new w.THREE.Box3().setFromObject(model).getSize(new w.THREE.Vector3()).toArray(),
      shaderFailures:w.__nextRenderer.info.programs.filter((program:any)=>program.diagnostics?.runnable===false).length,
      errors:w.__events.errors,lost:w.__glLive().lost};
  });
}
function sound(record: any) {
  expect(record.invalid).toBe(0); expect(record.triangles).toBeGreaterThan(1000);
  expect(record.shaderFailures).toBe(0); expect(record.errors).toEqual([]); expect(record.lost).toBe(false);
  expect(record.bounds.every((value: number) => Number.isFinite(value) && value > 0)).toBe(true);
}


test('four lambeosaur body restorations retain coherent native bone and living views', async ({page}) => {
  const records:any[]=[];
  for(const id of (phase==='calibration'?['parasaurolophus']:['parasaurolophus','corythosaurus','lambeosaurus','olorotitan'])) {
    await mount(page,id);
    const layers:any={};
    for(const layer of ['life','bone']) {
      if(layer==='bone') {
        if(!await page.locator('#dinolab-part-picker').count()) await page.getByRole('button',{name:'Explore anatomy',exact:true}).click();
        await page.locator('#dinolab-part-picker').selectOption('trunk');
        await page.locator('[data-dino-part-inspect=bone]').click();
        await expect.poll(()=>page.evaluate(()=>!!(window as any).__nextScene.getObjectByName('dinolab-specimen').getObjectByName('continuous-torso'))).toBe(false);
        await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();
      }
      for(const direction of ['Side','Front','Overhead'] as const) {
        await view(page,direction); const record=await audit(page);sound(record);
        layers[layer+'-'+direction.toLowerCase()]=record;
        await portrait(page,id+'-'+phase+'-'+layer+'-'+direction.toLowerCase()+'.png');
      }
    }
    if(phase==='after') {
      const life=layers['life-side'],bone=layers['bone-side'];
      expect(life.anatomy.family).toBe('ornithopods');expect(life.anatomy.limbs).toHaveLength(4);
      expect(life.anatomy.anchors).toEqual(bone.anatomy.anchors);
      expect(life.anatomy.limbs).toEqual(bone.anatomy.limbs);
      expect(life.anatomy.sources.length).toBeGreaterThan(0);
      const prior=JSON.parse(fs.readFileSync(path.join(report,'native-before-audit.json'),'utf8')).find((r:any)=>r.species===id);
      expect(life.crest).toEqual(prior.layers['life-side'].crest);expect(bone.crest).toEqual(prior.layers['bone-side'].crest);
      for(const [key,row] of Object.entries(layers) as [string,any][]){
        expect(row.vertices).toBeGreaterThan(500);expect(row.inFrame).toBe(row.vertices);
        const layer=key.startsWith('life')?'life':'bone';
        for(const region of layer==='life'?['neck','trunk','tail','limbs']:['neck','trunk','tail','girdle','limbs'])expect(row.regions[region+'|'+layer],id+' '+key+' '+region).toBeGreaterThan(20);
        expect(row.elements.every((e:any)=>e.species===id)).toBe(true);
      }
      expect(life.anatomy.interpretive).toBe(true);
      expect(life.anatomy.anchors.hip[1]).toBeGreaterThan(life.anatomy.anchors.shoulder[1]);
    }
    records.push({species:id,layers});await harness.destroy(page);
  }
  fs.writeFileSync(path.join(report,'native-'+phase+'-audit.json'),JSON.stringify(records,null,2));
});
