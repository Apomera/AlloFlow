import { test, expect, type Page, type Locator } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { showScaleExplorerTools } from './helpers/scale_explorer_workspace';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 270000 });
test.use({ video: 'off', trace: 'off', hasTouch: true });
const out=path.resolve(process.env.SCALE_LIBERTY_REPORT_DIR||'reports/scale-explorer-liberty');
const canvas=(page:Page)=>page.locator('[data-atlas-ready]');
const route=(page:Page)=>page.locator('.sx-liberty-nav');
const study=(page:Page)=>page.locator('.sx-liberty-study');
const slider=(page:Page)=>route(page).getByRole('slider',{name:'Liberty landmark',exact:true});
const ids=['foundation','pedestal','terrace','feet','robe','tablet','face','crown','torch','flame'];
const replacement=(process.env.STEM_GL_SUBSTITUTE||'').split(';').find(value=>value.startsWith('stem_lab/stem_tool_scaleexplorer.js='));
const sourceFile=process.env.SCALE_LIBERTY_SOURCE||(replacement?replacement.slice(replacement.indexOf('=')+1):'stem_lab/stem_tool_scaleexplorer.js');
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}} as any;
vm.runInNewContext(readFileSync(sourceFile,'utf8').replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.__libertyChecks={details:atlasDetails,point:libertyPoint};\n  window.StemLab.registerTool('scaleExplorer', {"),sandbox);
const checks=sandbox.window.__libertyChecks;
const metadata=JSON.parse(JSON.stringify({details:checks.details('liberty',(_:string,fallback:string)=>fallback),points:ids.map(id=>checks.point(id))}));
const harness=new GlHarness({
  toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,
  layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js'],
  probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const renderer=Reflect.construct(target,args),render=renderer.render;renderer.render=function(scene,camera){window.__libertyCamera=camera;return render.apply(this,arguments);};return renderer;}});`
});
function save(name:string,value:unknown){writeFileSync(path.join(out,name+'.json'),JSON.stringify(value,null,2)+'\n');}

async function mount(page:Page,phone=false,delayAsset=false){
  const errors:string[]=[],external:string[]=[],assetRequests:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('request',request=>{if(request.url().includes('/liberty-sculpture.glb'))assetRequests.push(request.url());});
  await page.route('**/*',request=>{const url=request.request().url();if(/^https?:/.test(url)&&!/^http:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(url)){external.push(url);return request.abort();}return request.continue();});
  let release=()=>{};
  if(delayAsset){const gate=new Promise<void>(resolve=>{release=resolve;});await page.route('**/liberty-sculpture.glb',async request=>{await gate;await request.continue();});}
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;(HTMLCanvasElement.prototype as any).getContext=function(type:string,...args:any[]){return type==='webgl2'?null:original.apply(this,[type,...args] as any);};});
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:phone?320:1400,height:phone?780:1100});
  await harness.mount(page,{_scaleExplorer:{ambient:false}},'!!document.querySelector("[data-atlas-ready]")');await showScaleExplorerTools(page);
  await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
  await fly(page,'liberty');if(!delayAsset)await ready(page);
  return {errors,external,assetRequests,release};
}
async function fly(page:Page,id:string){
  await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);await expect(canvas(page)).toHaveAttribute('data-atlas-objects',id);
  await expect.poll(()=>canvas(page).evaluate((element:HTMLElement)=>Math.abs(Number(element.dataset.atlasExponent)-Number(element.dataset.atlasTarget)))).toBeLessThan(.002);
}
async function ready(page:Page){await canvas(page).scrollIntoViewIfNeeded();await expect(canvas(page)).toHaveAttribute('data-atlas-liberty-status','ready');}
async function scene(page:Page){
  return page.evaluate(metadata=>{
    const w=window as any,T=w.THREE,record=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any,human:any;
    const visible=(object:any)=>{if(!object)return false;for(let node=object;node;node=node.parent)if(!node.visible)return false;return true;};const harbor:any[]=[];
    record.scene.traverse((object:any)=>{if(object.userData.itemId==='liberty')root=object;if(object.userData.itemId==='human'&&visible(object))human=object;if(object.userData.libertyHarbor)harbor.push({name:object.name,visible:visible(object)});});
    const model=root.userData.model,liberty=model.userData.liberty,camera=w.__libertyCamera,element=document.querySelector('[data-atlas-ready]') as HTMLElement;
    const detail=element.dataset.atlasDetail||'',point=element.dataset.atlasObjects==='liberty'?metadata.details.find((value:any)=>value.id===detail):null;
    const aim=new T.Vector3().fromArray(element.dataset.atlasAim!.split(',').map(Number)),expected=point?model.localToWorld(new T.Vector3().fromArray(point.at)):null,direction=camera.getWorldDirection(new T.Vector3());
    const bottom=model.localToWorld(new T.Vector3(0,-.5,0)),top=model.localToWorld(new T.Vector3(0,.5,0));
    return {type:record.type,scale:root.scale.x,declaredExtent:model.userData.extent,dimension:model.userData.dimension,measureCenter:model.userData.measureCenter,referenceHeight:top.distanceTo(bottom)/root.scale.x,
      aligned:direction.dot(aim.clone().sub(camera.position).normalize()),targetError:expected?expected.distanceTo(aim):0,aim:aim.toArray(),yaw:Math.atan2(-direction.x,-direction.z),pitch:Math.asin(-direction.y),near:camera.near,
      status:liberty.status,detail:liberty.detailId,fallbackVisible:visible(liberty.fallback),sculptureVisible:visible(liberty.sculpture),scanMeshes:(liberty.scannedMeshes||[]).length,harbor,
      meshes:liberty.meshes.map((mesh:any)=>({geometry:mesh.geometry.uuid,material:Array.isArray(mesh.material)?mesh.material.map((value:any)=>value.uuid):mesh.material.uuid,detail:mesh.userData.libertyDetailId,vertices:mesh.geometry.attributes.position.count,indices:mesh.geometry.index?mesh.geometry.index.count:0})),
      comparisonRatio:human?root.scale.x/human.scale.x:null,draws:record.draws,renders:record.renders};
  },metadata);
}
async function site(page:Page,id:string){
  await canvas(page).scrollIntoViewIfNeeded();await expect(canvas(page)).toHaveAttribute('data-atlas-liberty-site',id);await expect(canvas(page)).toHaveAttribute('data-atlas-detail',id);await expect(slider(page)).toHaveValue(String(ids.indexOf(id)+1));
  await expect.poll(async()=>(await scene(page)).aligned).toBeGreaterThan(.99999);await expect.poll(async()=>(await scene(page)).targetError).toBeLessThan(.0002);
}
async function setRange(control:Locator,value:number){await control.evaluate((input:HTMLInputElement,value:number)=>{const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;set.call(input,String(value));input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));},value);}
async function landmark(page:Page,n:number){await setRange(slider(page),n);await site(page,ids[n-1]);}
async function capture(page:Page,name:string){await canvas(page).scrollIntoViewIfNeeded();await page.locator('.sx-stage').screenshot({path:path.join(out,name+'-stage.png')});const pixels=await harness.glPixels(page);expect(pixels).not.toBeNull();expect(looksBlank(pixels!)).toBe(false);writeFileSync(path.join(out,name+'-gl.png'),pixels!.png);}

async function pickActual(page:Page,wanted:string){
  await canvas(page).scrollIntoViewIfNeeded();await expect.poll(()=>page.evaluate(async()=>{const camera=(window as any).__libertyCamera,before=camera.position.clone();await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));return before.distanceTo(camera.position);})).toBeLessThan(.000001);
  const point=await page.evaluate(wanted=>{
    const w=window as any,T=w.THREE,record=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;record.scene.traverse((object:any)=>{if(object.userData.itemId==='liberty')root=object;});
    const model=root.userData.model,camera=w.__libertyCamera,ray=new T.Raycaster(),element=document.querySelector('[data-atlas-ready]')!,rect=element.getBoundingClientRect();
    const visible=(object:any)=>{for(let node=object;node;node=node.parent)if(!node.visible)return false;return true;};
    const hit=(x:number,y:number)=>{ray.setFromCamera(new T.Vector2((x-rect.x)/rect.width*2-1,1-(y-rect.y)/rect.height*2),camera);return ray.intersectObjects(model.children,true).find((value:any)=>value.object.isMesh&&visible(value.object));};
    const targets=model.userData.liberty.meshes.filter((mesh:any)=>mesh.isMesh&&mesh.userData.libertyDetailId===wanted&&visible(mesh));
    for(const mesh of targets){const positions=mesh.geometry.attributes.position,index=mesh.geometry.index,count=index?index.count:positions.count,step=Math.max(3,Math.floor(count/1800/3)*3);
      for(let i=0;i+2<count;i+=step){const centroid=new T.Vector3();for(let j=0;j<3;j++)centroid.add(new T.Vector3().fromBufferAttribute(positions,index?index.getX(i+j):i+j));const projected=mesh.localToWorld(centroid.multiplyScalar(1/3)).project(camera);
        if(Math.abs(projected.x)>.86||Math.abs(projected.y)>.88||projected.z < -1||projected.z>=1)continue;const x=Math.round(rect.x+(projected.x+1)*rect.width/2),y=Math.round(rect.y+(1-projected.y)*rect.height/2);let margin=true;
        for(let dx=-1;dx<=1&&margin;dx++)for(let dy=-1;dy<=1;dy++){if(document.elementFromPoint(x+dx,y+dy)!==element||hit(x+dx,y+dy)?.object.userData.libertyDetailId!==wanted){margin=false;break;}}
        if(margin)return {x,y,wanted,marginPx:1,triangle:i/3};
      }
    }return null;
  },wanted);
  expect(point,'a selectable visible triangle of the actual sculpture').not.toBeNull();await page.mouse.click(point!.x,point!.y);return point;
}

test.beforeAll(async()=>{mkdirSync(out,{recursive:true});const sha=(file:string)=>createHash('sha256').update(readFileSync(file)).digest('hex');save('liberty-browser-source',{checkedAt:new Date().toISOString(),source:sha('stem_lab/stem_tool_scaleexplorer.js'),desktop:sha('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js'),substitution:process.env.STEM_GL_SUBSTITUTE||null});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});

test('local scanned face, tablet and flame are selectable while ten landmarks retain the 93 metre reference',async({page})=>{
  const log=await mount(page,false,true),loading=await scene(page);expect(loading.type).toBe('webgl');expect(loading.status).toBe('loading');expect(loading.fallbackVisible).toBe(true);expect(loading.declaredExtent).toBe(1);expect(loading.dimension).toBe('y');expect(loading.measureCenter).toBe(0);expect(loading.referenceHeight).toBeCloseTo(1,8);
  await expect(study(page).locator('[data-liberty-status]')).toHaveAttribute('data-liberty-status','loading');await capture(page,'liberty-desktop-loading');log.release();await ready(page);
  const initial=await scene(page);expect(initial.status).toBe('ready');expect(initial.fallbackVisible).toBe(false);expect(initial.scanMeshes).toBeGreaterThanOrEqual(7);expect(initial.referenceHeight).toBeCloseTo(1,8);expect(initial.harbor.length).toBeGreaterThan(0);expect(initial.harbor.some((value:any)=>value.visible)).toBe(true);expect(log.assetRequests).toHaveLength(1);
  await expect(study(page).locator('[data-liberty-status]')).toHaveAttribute('data-liberty-status','ready');await capture(page,'liberty-desktop-whole');
  const facePick=await pickActual(page,'face');await site(page,'face');await capture(page,'liberty-desktop-face');
  await route(page).getByRole('button',{name:'Whole monument',exact:true}).click();await expect(route(page)).toHaveCount(0);await expect(canvas(page)).toHaveAttribute('data-atlas-detail','');
  const tabletPick=await pickActual(page,'tablet');await site(page,'tablet');await capture(page,'liberty-desktop-tablet');await landmark(page,9);await setRange(page.getByRole('slider',{name:'Inspection magnification',exact:true}),3);await site(page,'torch');
  const flamePick=await pickActual(page,'flame');await site(page,'flame');await capture(page,'liberty-desktop-flame');
  const views=[];for(let n=1;n<=ids.length;n++){await landmark(page,n);const view=await scene(page);expect(view.scale).toBe(initial.scale);expect(view.meshes).toEqual(initial.meshes);expect(view.referenceHeight).toBeCloseTo(1,8);expect(view.status).toBe('ready');views.push(view);}
  expect(new Set(views.map(view=>view.aim.join(','))).size).toBe(10);await landmark(page,8);await capture(page,'liberty-desktop-crown');
  await route(page).getByRole('button',{name:'Whole monument',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','1.00');expect(log.assetRequests).toHaveLength(1);
  save('liberty-desktop',{loading,initial,facePick,tabletPick,flamePick,views,...log,release:undefined});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});

test('320 pixel WebGL 1 sculpture study supports touch, keyboard bounds and Escape',async({page})=>{
  const log=await mount(page,true),initial=await scene(page);expect(initial.type).toBe('webgl');await capture(page,'liberty-phone-whole');
  const begin=page.locator('.sx-liberty-entry').getByRole('button',{name:'Explore the sculpture',exact:true});await begin.scrollIntoViewIfNeeded();const box=await begin.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.width).toBeGreaterThanOrEqual(44);await begin.tap();await site(page,'face');
  await expect(slider(page)).toHaveAttribute('min','1');await expect(slider(page)).toHaveAttribute('max','10');await expect(slider(page)).toHaveAttribute('step','1');await slider(page).focus();await slider(page).press('ArrowRight');await site(page,'crown');await capture(page,'liberty-phone-crown');
  await slider(page).press('End');await site(page,'flame');await expect(route(page).getByRole('button',{name:'Next Liberty landmark',exact:true})).toBeDisabled();await slider(page).press('Home');await site(page,'foundation');await expect(route(page).getByRole('button',{name:'Previous Liberty landmark',exact:true})).toBeDisabled();
  await route(page).getByRole('button',{name:'Next Liberty landmark',exact:true}).tap();await site(page,'pedestal');for(const label of ['Previous Liberty landmark','Next Liberty landmark','Whole monument'])expect((await route(page).getByRole('button',{name:label,exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);expect((await slider(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await study(page).getByRole('button',{name:'Visit the crown',exact:true}).tap();await site(page,'crown');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await slider(page).focus();await slider(page).press('Escape');await expect(route(page)).toHaveCount(0);await expect(study(page).getByRole('button',{name:'Explore the sculpture',exact:true})).toBeFocused();await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','1.00');
  await study(page).getByRole('button',{name:'Trace from the foundation',exact:true}).tap();await site(page,'foundation');await canvas(page).focus();await canvas(page).press('Escape');await expect(route(page)).toHaveCount(0);await expect(canvas(page)).toHaveAttribute('data-atlas-detail','');await expect(study(page).getByRole('button',{name:'Explore the sculpture',exact:true})).toBeFocused();
  await canvas(page).scrollIntoViewIfNeeded();const restored=await scene(page);expect(restored.scale).toBe(initial.scale);expect(restored.referenceHeight).toBeCloseTo(1,8);expect(restored.status).toBe('ready');save('liberty-phone',{initial,restored,...log,release:undefined});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});

test('notebook restores close sculpture cameras and comparison hides the harbor without reallocating the scan',async({page})=>{
  const log=await mount(page),book=page.getByRole('region',{name:'Field notebook',exact:true});await study(page).getByRole('button',{name:'Explore the sculpture',exact:true}).click();await site(page,'face');await setRange(page.getByRole('slider',{name:'Inspection magnification',exact:true}),17.5);await page.getByRole('button',{name:'Orbit left',exact:true}).click();
  await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('Sculpted eyelids and wind-swept drapery.');await book.getByRole('button',{name:'Save observation',exact:true}).click();const saved=await page.evaluate(()=>(window as any).__toolData._scaleExplorer.observations.find((note:any)=>note.itemId==='liberty'&&note.detailId==='face'));
  expect(saved).toMatchObject({itemId:'liberty',detailId:'face',size:93,zoom:17.5,cutaway:false,note:'Sculpted eyelids and wind-swept drapery.'});await canvas(page).scrollIntoViewIfNeeded();await expect.poll(async()=>(await scene(page)).yaw).toBeCloseTo(saved.yaw,4);const viewpoint=await scene(page);
  await fly(page,'sequoia');await book.locator('[data-observation="liberty:face"]').getByRole('button',{name:/^Return to/}).click();await canvas(page).scrollIntoViewIfNeeded();await ready(page);await site(page,'face');await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','17.50');const returned=await scene(page);expect(returned.yaw).toBeCloseTo(saved.yaw,4);expect(returned.pitch).toBeCloseTo(saved.pitch,4);expect(returned.meshes).toEqual(viewpoint.meshes);await expect(book.getByRole('textbox')).toHaveValue('Sculpted eyelids and wind-swept drapery.');
  await landmark(page,10);await setRange(page.getByRole('slider',{name:'Inspection magnification',exact:true}),10.2);await page.getByRole('button',{name:'Orbit right',exact:true}).click();await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('The gold flame is separate from the copper torch.');await book.getByRole('button',{name:'Save observation',exact:true}).click();const flame=await page.evaluate(()=>(window as any).__toolData._scaleExplorer.observations.find((note:any)=>note.itemId==='liberty'&&note.detailId==='flame'));expect(flame).toMatchObject({itemId:'liberty',detailId:'flame',size:93,zoom:10.2,cutaway:false});
  await fly(page,'blue-whale');await book.locator('[data-observation="liberty:flame"]').getByRole('button',{name:/^Return to/}).click();await canvas(page).scrollIntoViewIfNeeded();await site(page,'flame');await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','10.20');const returnedFlame=await scene(page);expect(returnedFlame.yaw).toBeCloseTo(flame.yaw,4);expect(returnedFlame.pitch).toBeCloseTo(flame.pitch,4);await expect(page.locator('.sx-details').getByRole('link',{name:'Read the science source',exact:true})).toHaveAttribute('href',/^https:\/\//);
  const panel=page.locator('.sx-comparison-workbench');if(await panel.getAttribute('open')===null)await panel.locator(':scope > summary').click();await panel.getByRole('combobox',{name:'First thing',exact:true}).selectOption('liberty');await panel.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('human');await panel.getByRole('button',{name:'Compare them',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-comparison','liberty:human');await canvas(page).scrollIntoViewIfNeeded();await expect(route(page)).toHaveCount(0);await expect(study(page)).toHaveCount(0);const compared=await scene(page);expect(compared.harbor.length).toBeGreaterThan(0);expect(compared.harbor.every((value:any)=>!value.visible)).toBe(true);expect(compared.detail).toBe('');expect(compared.referenceHeight).toBeCloseTo(1,8);expect(compared.comparisonRatio).toBeCloseTo(93/1.7,8);expect(compared.meshes).toEqual(viewpoint.meshes);await capture(page,'liberty-human-comparison');
  save('liberty-notebook',{saved,viewpoint,returned,flame,returnedFlame,compared,...log,release:undefined});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});
