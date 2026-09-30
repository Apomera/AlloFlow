import { test, expect } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({mode:'serial',retries:0,timeout:180000});
test.use({video:'off',trace:'off',hasTouch:true});
const out=path.resolve('reports/scale-explorer-landmarks');
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js'],probes:`(function(){var Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct:function(target,args,newTarget){var r=Reflect.construct(target,args,newTarget),render=r.render;r.render=function(s,c){window.__landmarkCamera=c;return render.apply(this,arguments);};return r;}});})();`});
test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});
async function mount(page:any,reduced=true){
  await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
  await page.setViewportSize({width:1400,height:1100});
  await harness.mount(page,{},'!!document.querySelector("[data-atlas-ready]")');
  await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select{font-family:inherit}'});
}
async function fly(page:any,id:string){
  await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);
  await expect(page.locator('[data-atlas-ready]')).toHaveAttribute('data-atlas-objects',id);
  await expect.poll(async()=>page.locator('[data-atlas-ready]').evaluate((el:HTMLElement)=>Math.abs(Number(el.dataset.atlasExponent)-Number(el.dataset.atlasTarget)))).toBeLessThan(.002);
}
async function specimen(page:any,id:string,point:number[]=[0,0,0]){
  return page.evaluate(({id,point})=>{
    const w=window as any,T=w.THREE,rec=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;
    rec.scene.traverse((o:any)=>{if(o.userData.itemId===id)root=o;});
    const at=root.userData.model.localToWorld(new T.Vector3().fromArray(point));
    const camera=w.__landmarkCamera,direction=camera.getWorldDirection(new T.Vector3()),toward=at.clone().sub(camera.position).normalize();
    return {scale:root.scale.toArray(),aligned:direction.dot(toward),covered:root.userData.model.userData.outerMembrane?.visible};
  },{id,point});
}

test('landmark cameras follow anatomy and retain physical dimensions',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await mount(page);await fly(page,'honeybee');
  const cv=page.locator('[data-atlas-ready]'),notes=page.locator('.sx-details');
  await expect(cv).toHaveAttribute('data-atlas-habitat','leaf');
  const scale=(await specimen(page,'honeybee')).scale,exp=await cv.getAttribute('data-atlas-exponent');
  const wing=page.locator('[data-scale-marker="wings"]');
  await expect(wing).toBeVisible();await wing.click();
  await expect(cv).toHaveAttribute('data-atlas-detail','wings');
  expect((await specimen(page,'honeybee',[-.05,.15,.36])).aligned).toBeGreaterThan(.99999);
  expect((await specimen(page,'honeybee')).scale).toEqual(scale);
  await expect(cv).toHaveAttribute('data-atlas-exponent',exp!);
  await expect(notes).toContainText('supporting veins');
  await page.locator('.sx-stage').screenshot({path:path.join(out,'bee-wing-focus.png')});
  await notes.screenshot({path:path.join(out,'feature-notes.png')});
  await page.getByRole('button',{name:'Orbit left',exact:true}).click();
  expect((await specimen(page,'honeybee',[-.05,.15,.36])).aligned).toBeGreaterThan(.99999);
  const markerBox=(await wing.boundingBox())!,canvasBox=(await cv.boundingBox())!;
  expect(Math.abs(markerBox.x+markerBox.width/2-(canvasBox.x+canvasBox.width/2))).toBeLessThan(2);
  await notes.getByRole('button',{name:'Landmarks',exact:true}).click();
  await expect(page.locator('.sx-marker:visible')).toHaveCount(0);
  await page.getByRole('button',{name:'Fit object',exact:true}).click();
  await expect(cv).toHaveAttribute('data-atlas-aim','0.0000,0.2000,0.0000');
  await expect(cv).toHaveAttribute('data-atlas-zoom','1.00');
  await fly(page,'mitochondrion');
  const mitoScale=(await specimen(page,'mitochondrion')).scale;
  await notes.getByRole('button',{name:'Outer membrane',exact:true}).click();
  await expect(cv).toHaveAttribute('data-atlas-detail','envelope');
  expect((await specimen(page,'mitochondrion')).covered).toBe(true);
  await notes.getByRole('button',{name:'Inner membrane folds',exact:true}).click();
  await expect(cv).toHaveAttribute('data-atlas-detail','cristae');
  expect((await specimen(page,'mitochondrion')).covered).toBe(false);
  expect((await specimen(page,'mitochondrion')).scale).toEqual(mitoScale);
  await page.locator('.sx-stage').screenshot({path:path.join(out,'cristae-focus.png')});
  for(const id of ['ladybird','trex','rbc','dna']){
    await fly(page,id);const initial=(await specimen(page,id)).scale;
    for(const choice of await page.locator('.sx-detail-choices button').all()){
      await choice.click();await expect(cv).not.toHaveAttribute('data-atlas-detail','');
      expect((await specimen(page,id)).scale).toEqual(initial);
      await expect(notes.getByRole('link',{name:'Read the science source',exact:true})).toHaveAttribute('href',/^https:\/\//);
      expect(looksBlank(await harness.glPixels(page))).toBe(false);
    }
    await page.locator('.sx-stage').screenshot({path:path.join(out,id+'-focus.png')});
  }
  await fly(page,'betelgeuse');await expect(page.locator('.sx-details')).toHaveCount(0);
  await expect(cv).toHaveAttribute('data-atlas-detail','');await expect(cv).toHaveAttribute('data-atlas-habitat','realm');
  expect(errors).toEqual([]);
});

test('phone keyboard selection frames the feature while ambience is paused',async({page})=>{
  await mount(page,false);await page.getByRole('button',{name:'Pause ambience',exact:true}).click();
  await page.setViewportSize({width:390,height:844});await fly(page,'honeybee');
  const choice=page.locator('.sx-details').getByRole('button',{name:'Veined wings',exact:true});
  await choice.focus();await choice.press('Enter');
  const cv=page.locator('[data-atlas-ready]');
  await expect(cv).toHaveAttribute('data-atlas-detail','wings');
  await expect.poll(async()=>(await specimen(page,'honeybee',[-.05,.15,.36])).aligned).toBeGreaterThan(.99999);
  await expect(cv).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.locator('.sx-stage').screenshot({path:path.join(out,'phone-feature.png')});
  await page.getByRole('button',{name:'Reset camera',exact:true}).click();
  await expect(cv).toHaveAttribute('data-atlas-detail','');
  await expect.poll(async()=>await cv.getAttribute('data-atlas-aim')).toBe('0.0000,0.2000,0.0000');
  await expect(cv).toHaveAttribute('data-atlas-zoom','1.00');
});
