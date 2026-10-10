import { showScaleExplorerTools } from './helpers/scale_explorer_workspace';
import { test, expect } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({mode:'serial',retries:0,timeout:180000});
test.use({video:'off',trace:'off',hasTouch:true});
const out=path.resolve('reports/scale-explorer-landmarks');
const beeSites=[
  {id:'head',label:'Compound eyes & three ocelli',at:[-.4332415816674078,.06824158166740779,.10483309047830858],zoom:4},
  {id:'antennae',label:'Elbowed, segmented antennae',at:[-.6085409339915123,.11661821027601427,.09654552569003583],zoom:5},
  {id:'wings',label:'Four membranes & branching veins',at:[-.070264131570409,.12350976330304708,.4347173685918193],zoom:2.5},
  {id:'legs',label:'Jointed legs & pollen baskets',at:[.13747362335731222,-.18525259912389985,.26284251095125155],zoom:5},
  {id:'abdomen',label:'Overlapping abdominal plates',at:[.2445309384759144,.04135828466570035,.06530938475914372],zoom:3}
];
const beeWing=beeSites.find(site=>site.id==='wings')!;
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js'],probes:`(function(){var Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct:function(target,args,newTarget){var r=Reflect.construct(target,args,newTarget),render=r.render;r.render=function(s,c){window.__landmarkCamera=c;return render.apply(this,arguments);};return r;}});})();`});
test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});
async function mount(page:any,reduced=true){
  await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
  await page.setViewportSize({width:1400,height:1100});
  await harness.mount(page,{},'!!document.querySelector("[data-atlas-ready]")'); await showScaleExplorerTools(page);
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
    const projected=at.clone().project(camera),rect=document.querySelector('[data-atlas-ready]')!.getBoundingClientRect(),model=root.userData.model;
    return {scale:root.scale.toArray(),aligned:direction.dot(toward),covered:model.userData.outerMembrane?.visible,screenOffset:[projected.x*rect.width/2,projected.y*rect.height/2],dimension:model.userData.dimension,extent:model.userData.extent,measureCenter:model.userData.measureCenter,reference:model.userData.specimen?.stats.reference,meshes:model.userData.specimen?.meshes.map((mesh:any)=>({geometry:mesh.geometry.uuid,material:mesh.material.uuid,detail:mesh.userData.specimenDetailId}))};
  },{id,point});
}

async function settled(page:any){
  await page.locator('[data-atlas-ready]').scrollIntoViewIfNeeded();
  await expect.poll(()=>page.evaluate(async()=>{const camera=(window as any).__landmarkCamera,before=camera.position.clone();await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));return before.distanceTo(camera.position);})).toBeLessThan(.000001);
}
async function pickNativeBee(page:any,wanted:string){
  await settled(page);const point=await page.evaluate((wanted:string)=>{
    const w=window as any,T=w.THREE,record=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()),camera=w.__landmarkCamera,ray=new T.Raycaster(),element=document.querySelector('[data-atlas-ready]')!,rect=element.getBoundingClientRect();let root:any;
    const visible=(object:any)=>{for(let node=object;node;node=node.parent)if(!node.visible)return false;return true;};record.scene.traverse((object:any)=>{if(object.userData.itemId==='honeybee'&&visible(object))root=object;});
    const model=root.userData.model,hit=(x:number,y:number)=>{ray.setFromCamera(new T.Vector2((x-rect.x)/rect.width*2-1,1-(y-rect.y)/rect.height*2),camera);return ray.intersectObjects(model.children,true).find((value:any)=>value.object.isMesh&&visible(value.object));};
    for(const mesh of model.userData.specimen.meshes.filter((mesh:any)=>mesh.isMesh&&mesh.userData.specimenDetailId===wanted&&visible(mesh))){
      const position=mesh.geometry.attributes.position,index=mesh.geometry.index,count=index?index.count:position.count,step=Math.max(3,Math.floor(count/2200/3)*3);
      for(let n=0;n+2<count;n+=step){const center=new T.Vector3();for(let j=0;j<3;j++)center.add(new T.Vector3().fromBufferAttribute(position,index?index.getX(n+j):n+j));const projected=mesh.localToWorld(center.multiplyScalar(1/3)).project(camera);
        if(Math.abs(projected.x)>.88||Math.abs(projected.y)>.88||projected.z < -1||projected.z>=1)continue;const x=Math.round(rect.x+(projected.x+1)*rect.width/2),y=Math.round(rect.y+(1-projected.y)*rect.height/2);let margin=true;
        for(let dx=-1;dx<=1&&margin;dx++)for(let dy=-1;dy<=1;dy++){if(document.elementFromPoint(x+dx,y+dy)!==element||hit(x+dx,y+dy)?.object.userData.specimenDetailId!==wanted){margin=false;break;}}
        if(margin)return {x,y};
      }
    }return null;
  },wanted);
  expect(point,'visible native '+wanted+' triangles with a one pixel click margin').not.toBeNull();await page.mouse.click(point!.x,point!.y);
  await expect(page.locator('[data-atlas-ready]')).toHaveAttribute('data-atlas-detail',wanted);
}

test('landmark cameras follow anatomy and retain physical dimensions',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await mount(page);await fly(page,'honeybee');
  const cv=page.locator('[data-atlas-ready]'),notes=page.locator('.sx-details');
  await expect(cv).toHaveAttribute('data-atlas-habitat','leaf-canopy');
  const beeInitial=await specimen(page,'honeybee'),scale=beeInitial.scale,exp=await cv.getAttribute('data-atlas-exponent');
  expect(beeInitial).toMatchObject({dimension:'x',extent:1,measureCenter:0,reference:'body-length'});
  await expect(notes.locator('.sx-detail-choices button')).toHaveCount(5);
  for(const site of beeSites){
    await notes.getByRole('button',{name:site.label,exact:true}).click();
    await expect(cv).toHaveAttribute('data-atlas-detail',site.id);await expect(cv).toHaveAttribute('data-atlas-zoom',site.zoom.toFixed(2));
    await expect.poll(async()=>(await specimen(page,'honeybee',site.at)).aligned).toBeGreaterThan(.99999);
    await pickNativeBee(page,site.id);const focused=await specimen(page,'honeybee',site.at);
    expect(focused.scale).toEqual(scale);expect(focused.meshes).toEqual(beeInitial.meshes);await expect(cv).toHaveAttribute('data-atlas-exponent',exp!);
  }
  const wing=notes.getByRole('button',{name:beeWing.label,exact:true});
  await wing.click();await settled(page);
  await expect(cv).toHaveAttribute('data-atlas-detail','wings');
  expect((await specimen(page,'honeybee',beeWing.at)).aligned).toBeGreaterThan(.99999);
  expect((await specimen(page,'honeybee')).scale).toEqual(scale);
  await expect(cv).toHaveAttribute('data-atlas-exponent',exp!);
  await expect(notes).toContainText('Fine veins support the thin membranes.');
  await page.locator('.sx-stage').screenshot({path:path.join(out,'bee-wing-focus.png')});
  await notes.screenshot({path:path.join(out,'feature-notes.png')});
  await page.getByRole('button',{name:'Orbit left',exact:true}).click();
  expect((await specimen(page,'honeybee',beeWing.at)).aligned).toBeGreaterThan(.99999);
  const centered=await specimen(page,'honeybee',beeWing.at);
  expect(Math.abs(centered.screenOffset[0])).toBeLessThan(2);expect(Math.abs(centered.screenOffset[1])).toBeLessThan(2);
  await notes.getByRole('button',{name:'Landmarks',exact:true}).click();
  await expect(page.locator('.sx-marker:visible')).toHaveCount(0);
  await page.getByRole('button',{name:'Fit object',exact:true}).click();
  await expect(cv).toHaveAttribute('data-atlas-aim','0.0000,0.0000,0.0000');
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
  const choice=page.locator('.sx-details').getByRole('button',{name:beeWing.label,exact:true});
  await choice.focus();await choice.press('Enter');
  const cv=page.locator('[data-atlas-ready]');
  await expect(cv).toHaveAttribute('data-atlas-detail','wings');
  await expect.poll(async()=>(await specimen(page,'honeybee',beeWing.at)).aligned).toBeGreaterThan(.99999);
  await expect(cv).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.locator('.sx-stage').screenshot({path:path.join(out,'phone-feature.png')});
  await page.getByRole('button',{name:'Reset camera',exact:true}).click();
  await expect(cv).toHaveAttribute('data-atlas-detail','');
  await expect.poll(async()=>await cv.getAttribute('data-atlas-aim')).toBe('0.0000,0.0000,0.0000');
  await expect(cv).toHaveAttribute('data-atlas-zoom','1.00');
});
