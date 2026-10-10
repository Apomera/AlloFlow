import { test, expect, type Page, type Locator } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { showScaleExplorerTools } from './helpers/scale_explorer_workspace';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';

test.describe.configure({mode:'serial',retries:0,timeout:270000});
test.use({video:'off',trace:'off',hasTouch:true});
const cases=[
  {id:'honeybee',meters:.013,axis:'x',reference:'body-length',ids:['head','antennae','wings','legs','abdomen'],pick:'head'},
  {id:'ladybird',meters:.006,axis:'x',reference:'body-length',ids:['antennae','pronotum','elytra','wings','legs'],pick:'elytra'},
  {id:'hair',meters:.00007,axis:'x',reference:'shaft-diameter',ids:['cuticle','cortex','medulla','cross-section','surface'],pick:'cuticle'}
];
const out=path.resolve(process.env.SCALE_INSECTS_REPORT_DIR||'reports/scale-explorer-insects');
const canvas=(page:Page)=>page.locator('[data-atlas-ready]');
const nav=(page:Page)=>page.getByRole('navigation',{name:'Landmark navigator',exact:true});
const replacement=(process.env.STEM_GL_SUBSTITUTE||'').split(';').find(value=>value.startsWith('stem_lab/stem_tool_scaleexplorer.js='));
const sourceFile=process.env.SCALE_INSECTS_SOURCE||(replacement?replacement.slice(replacement.indexOf('=')+1):'stem_lab/stem_tool_scaleexplorer.js');
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}} as any;
vm.runInNewContext(readFileSync(sourceFile,'utf8').replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.__specimenChecks={details:atlasDetails,point:specimenPoint};\n  window.StemLab.registerTool('scaleExplorer', {"),sandbox);
const checks=sandbox.window.__specimenChecks;
const metadata=JSON.parse(JSON.stringify(Object.fromEntries(cases.map(c=>[c.id,checks.details(c.id,(_:string,fallback:string)=>fallback)]))));
const harness=new GlHarness({
  toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,
  layout:'document',preScripts:['stem_lab/stem_lab_module.js'],
  probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const renderer=Reflect.construct(target,args),render=renderer.render;renderer.render=function(scene,camera){window.__specimenCamera=camera;return render.apply(this,arguments);};return renderer;}});`
});
function save(name:string,value:unknown){writeFileSync(path.join(out,name+'.json'),JSON.stringify(value,null,2)+'\n');}
async function mount(page:Page,phone=false){
  const errors:string[]=[],external:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.route('**/*',request=>{const url=request.request().url();if(/^https?:/.test(url)&&!/^http:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(url)){external.push(url);return request.abort();}return request.continue();});
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;(HTMLCanvasElement.prototype as any).getContext=function(type:string,...args:any[]){return type==='webgl2'?null:original.apply(this,[type,...args] as any);};});
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:phone?330:1400,height:phone?780:1100});
  await harness.mount(page,{_scaleExplorer:{ambient:false}},'!!document.querySelector("[data-atlas-ready]")');await showScaleExplorerTools(page);
  await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
  return {errors,external};
}
async function fly(page:Page,id:string){
  await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);await expect(canvas(page)).toHaveAttribute('data-atlas-objects',id);await canvas(page).scrollIntoViewIfNeeded();
  await expect.poll(()=>canvas(page).evaluate((element:HTMLElement)=>Math.abs(Number(element.dataset.atlasExponent)-Number(element.dataset.atlasTarget)))).toBeLessThan(.002);
  await settled(page);
}
async function settled(page:Page){
  await canvas(page).scrollIntoViewIfNeeded();
  await expect.poll(()=>page.evaluate(async()=>{const camera=(window as any).__specimenCamera,before=camera.position.clone();await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));return before.distanceTo(camera.position);})).toBeLessThan(.000001);
}
async function scene(page:Page,id:string){
  return page.evaluate(({metadata,id})=>{
    const w=window as any,T=w.THREE,record=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()),camera=w.__specimenCamera,element=document.querySelector('[data-atlas-ready]') as HTMLElement;
    const visible=(object:any)=>{for(let node=object;node;node=node.parent)if(!node.visible)return false;return true;};let root:any,other:any;
    record.scene.traverse((object:any)=>{if(object.userData.itemId===id&&visible(object))root=object;if(object.userData.itemId==='ladybird'&&id==='honeybee'&&visible(object))other=object;});
    const model=root.userData.model,data=model.userData.specimen,detail=element.dataset.atlasDetail||'',point=metadata[id].find((value:any)=>value.id===detail),aim=new T.Vector3().fromArray(element.dataset.atlasAim!.split(',').map(Number)),expected=point?model.localToWorld(new T.Vector3().fromArray(point.at)):null,direction=camera.getWorldDirection(new T.Vector3()),leaf=record.scene.getObjectByName('atlasLeafCanopy'),ground=record.scene.getObjectByName('atlasGround'),key=record.scene.getObjectByName('atlasSunlight');
    const start=new T.Vector3(),end=new T.Vector3();start[model.userData.dimension]=-.5;end[model.userData.dimension]=.5;model.localToWorld(start);model.localToWorld(end);const ruler=root.userData.ruler.children[0];ruler.geometry.computeBoundingBox();const rulerStart=ruler.localToWorld(new T.Vector3(0,ruler.geometry.boundingBox.min.y,0)),rulerEnd=ruler.localToWorld(new T.Vector3(0,ruler.geometry.boundingBox.max.y,0)),rulerReference=rulerStart.distanceTo(rulerEnd)/root.scale.x;rulerStart.applyMatrix4(root.matrixWorld.clone().invert());rulerEnd.applyMatrix4(root.matrixWorld.clone().invert());let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,visibleVertices=0,clippedVertices=0;
    const rulerBounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};root.userData.ruler.traverse((object:any)=>{if(!object.geometry)return;const position=object.geometry.attributes.position;for(let n=0;n<position.count;n++){const point=object.localToWorld(new T.Vector3().fromBufferAttribute(position,n)).project(camera);rulerBounds.minX=Math.min(rulerBounds.minX,point.x);rulerBounds.maxX=Math.max(rulerBounds.maxX,point.x);rulerBounds.minY=Math.min(rulerBounds.minY,point.y);rulerBounds.maxY=Math.max(rulerBounds.maxY,point.y);}});
    model.traverse((object:any)=>{if(!object.geometry||!visible(object))return;const position=object.geometry.attributes.position;if(!position)return;for(let n=0;n<position.count;n++){const point=object.localToWorld(new T.Vector3().fromBufferAttribute(position,n)).project(camera);if(point.z>=-1&&point.z<1)visibleVertices++;else clippedVertices++;minX=Math.min(minX,point.x);maxX=Math.max(maxX,point.x);minY=Math.min(minY,point.y);maxY=Math.max(maxY,point.y);}});
    return {type:record.type,kind:data.kind,stats:data.stats,scale:root.scale.x,declaredExtent:model.userData.extent,dimension:model.userData.dimension,measureCenter:model.userData.measureCenter,bodyReference:start.distanceTo(end)/root.scale.x,rulerReference,rulerEnds:[rulerStart[model.userData.dimension],rulerEnd[model.userData.dimension]],
      aligned:direction.dot(aim.clone().sub(camera.position).normalize()),targetError:expected?expected.distanceTo(aim):0,aim:aim.toArray(),yaw:Math.atan2(-direction.x,-direction.z),pitch:Math.asin(-direction.y),detail,near:camera.near,
      meshes:data.meshes.map((mesh:any)=>({geometry:mesh.geometry.uuid,material:Array.isArray(mesh.material)?mesh.material.map((value:any)=>value.uuid):mesh.material.uuid,detail:mesh.userData.specimenDetailId,vertices:mesh.geometry.attributes.position.count,indices:mesh.geometry.index?mesh.geometry.index.count:0})),
      bounds:{minX,maxX,minY,maxY,visibleVertices,clippedVertices},rulerBounds,comparisonRatio:other?root.scale.x/other.scale.x:null,habitat:{name:element.dataset.atlasHabitat,leaf:leaf?{visible:visible(leaf),y:leaf.position.y,scale:leaf.scale.x,meshes:leaf.children.filter((object:any)=>object.isMesh&&visible(object)).length}:null,ground:ground?{visible:visible(ground),y:ground.position.y}:null,floorTarget:root.position.y+root.userData.floor*root.scale.y-.008,key:key?{directional:!!key.isDirectionalLight,shadow:key.castShadow,intensity:key.intensity}:null},pose:id==='ladybird'?{amount:data.pose.amount,elytra:data.pose.elytra.map((group:any)=>group.rotation.toArray()),wings:data.pose.wings.map((group:any)=>group.visible)}:id==='hair'?{cutaway:data.pose.cutaway,full:data.pose.full.visible,section:data.pose.section.visible}:null,draws:record.draws,renders:record.renders};
  },{metadata,id});
}
async function detail(page:Page,id:string,part:string){
  await canvas(page).scrollIntoViewIfNeeded();await expect(canvas(page)).toHaveAttribute('data-atlas-detail',part);await expect.poll(async()=>(await scene(page,id)).aligned).toBeGreaterThan(.99999);await expect.poll(async()=>(await scene(page,id)).targetError).toBeLessThan(.0002);await settled(page);
}
function expectPose(view:any,id:string,part:string){
  if(id==='ladybird'){expect(view.pose.amount).toBe(part==='wings'?1:0);expect(view.pose.wings.every((visible:boolean)=>visible===(part==='wings'))).toBe(true);}
  if(id==='hair'){const section=['cortex','medulla','cross-section'].includes(part);expect(view.pose.cutaway).toBe(section);expect(view.pose.full).toBe(!section);expect(view.pose.section).toBe(section);}
}
function expectHabitat(view:any,c:typeof cases[number]){
  const insect=c.id!=='hair';expect(view.habitat.name).toBe(insect?'leaf-canopy':'specimen-studio');expect(view.habitat.leaf).not.toBeNull();expect(view.habitat.key).not.toBeNull();expect(view.habitat.ground).not.toBeNull();expect(view.habitat.leaf.visible).toBe(insect);expect(view.habitat.key.directional).toBe(true);expect(view.habitat.key.shadow).toBe(insect);
  if(insect){expect(view.habitat.leaf.meshes).toBeGreaterThan(0);expect(view.habitat.ground.visible).toBe(true);expect(view.habitat.ground.y).toBeCloseTo(view.habitat.floorTarget,8);expect(view.habitat.leaf.y).toBeCloseTo(view.habitat.ground.y,8);expect(view.habitat.leaf.scale/view.scale).toBeCloseTo(.01/c.meters,8);}
}
async function setRange(control:Locator,value:number){await control.evaluate((input:HTMLInputElement,value:number)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,String(value));input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));},value);}
async function capture(page:Page,name:string){await canvas(page).scrollIntoViewIfNeeded();await page.locator('.sx-stage').screenshot({path:path.join(out,name+'-stage.png')});const pixels=await harness.glPixels(page);expect(pixels).not.toBeNull();expect(looksBlank(pixels!)).toBe(false);writeFileSync(path.join(out,name+'-gl.png'),pixels!.png);}
async function pickActual(page:Page,id:string,wanted:string){
  await settled(page);const point=await page.evaluate(({id,wanted})=>{
    const w=window as any,T=w.THREE,record=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()),camera=w.__specimenCamera,ray=new T.Raycaster(),element=document.querySelector('[data-atlas-ready]')!,rect=element.getBoundingClientRect();let root:any;
    const visible=(object:any)=>{for(let node=object;node;node=node.parent)if(!node.visible)return false;return true;};record.scene.traverse((object:any)=>{if(object.userData.itemId===id&&visible(object))root=object;});
    const model=root.userData.model,hit=(x:number,y:number)=>{ray.setFromCamera(new T.Vector2((x-rect.x)/rect.width*2-1,1-(y-rect.y)/rect.height*2),camera);return ray.intersectObjects(model.children,true).find((value:any)=>value.object.isMesh&&visible(value.object));};
    const targets=model.userData.specimen.meshes.filter((mesh:any)=>mesh.isMesh&&mesh.userData.specimenDetailId===wanted&&visible(mesh));
    for(const mesh of targets){const position=mesh.geometry.attributes.position,index=mesh.geometry.index,count=index?index.count:position.count,step=Math.max(3,Math.floor(count/2200/3)*3);
      for(let n=0;n+2<count;n+=step){const center=new T.Vector3();for(let j=0;j<3;j++)center.add(new T.Vector3().fromBufferAttribute(position,index?index.getX(n+j):n+j));const projected=mesh.localToWorld(center.multiplyScalar(1/3)).project(camera);
        if(Math.abs(projected.x)>.88||Math.abs(projected.y)>.88||projected.z < -1||projected.z>=1)continue;const x=Math.round(rect.x+(projected.x+1)*rect.width/2),y=Math.round(rect.y+(1-projected.y)*rect.height/2);let margin=true;
        for(let dx=-1;dx<=1&&margin;dx++)for(let dy=-1;dy<=1;dy++){if(document.elementFromPoint(x+dx,y+dy)!==element||hit(x+dx,y+dy)?.object.userData.specimenDetailId!==wanted){margin=false;break;}}
        if(margin)return {x,y,id,wanted,marginPx:1,triangle:n/3};
      }
    }return null;
  },{id,wanted});
  expect(point,'visible native triangles with a one pixel click margin').not.toBeNull();await page.mouse.click(point!.x,point!.y);await detail(page,id,wanted);return point;
}

test.beforeAll(async()=>{mkdirSync(out,{recursive:true});const sha=(file:string)=>createHash('sha256').update(readFileSync(file)).digest('hex');save('specimen-browser-source',{checkedAt:new Date().toISOString(),source:sha('stem_lab/stem_tool_scaleexplorer.js'),desktop:sha('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js'),substitution:process.env.STEM_GL_SUBSTITUTE||null});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});

test('insect anatomy and a hair shaft expose fifteen native surfaces and camera landmarks without rebuilding',async({page})=>{
  const log=await mount(page),results=[];
  for(const c of cases){
    await fly(page,c.id);const initial=await scene(page,c.id);expect(initial.type).toBe('webgl');expect(initial.kind).toBe(c.id);expect(initial.declaredExtent).toBe(1);expect(initial.dimension).toBe(c.axis);expect(initial.measureCenter).toBe(0);expect(initial.bodyReference).toBeCloseTo(1,8);expect(initial.rulerReference).toBeCloseTo(1,8);expect(initial.rulerEnds[0]).toBeCloseTo(-.5,8);expect(initial.rulerEnds[1]).toBeCloseTo(.5,8);expect(initial.stats).toMatchObject({bodyReferenceMeters:c.meters,reference:c.reference});expectPose(initial,c.id,'');expectHabitat(initial,c);await capture(page,c.id+'-desktop-whole');
    const picked=await pickActual(page,c.id,c.pick);await capture(page,c.id+'-desktop-native');await nav(page).getByRole('button',{name:'Return to whole view',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','');
    await nav(page).getByRole('button',{name:'Explore landmarks',exact:true}).click();const views=[];
    for(const [n,id] of c.ids.entries()){if(n)await nav(page).getByRole('button',{name:'Next landmark',exact:true}).click();await detail(page,c.id,id);const nativePick=await pickActual(page,c.id,id),view=await scene(page,c.id);expect(view.scale).toBe(initial.scale);expect(view.meshes).toEqual(initial.meshes);expect(view.bodyReference).toBeCloseTo(1,8);expect(view.rulerReference).toBeCloseTo(1,8);expectPose(view,c.id,id);expectHabitat(view,c);views.push({...view,nativePick});}
    expect(new Set(views.map(view=>view.aim.join(','))).size).toBe(5);const title=nav(page).locator('.sx-feature-title');if(await title.getAttribute('aria-expanded')!=='true')await title.click();await expect(title).toHaveAttribute('aria-expanded','true');await expect(nav(page).getByRole('link',{name:'Science reference',exact:true})).toHaveAttribute('href',/^https:\/\//);
    await nav(page).getByRole('button',{name:'Return to whole view',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','1.00');await settled(page);expectPose(await scene(page,c.id),c.id,'');results.push({id:c.id,initial,picked,views});
  }
  save('specimen-desktop',{results,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});

test('330 pixel WebGL 1 views frame every appendage and offer touch, keyboard and Escape navigation',async({page})=>{
  const log=await mount(page,true),results=[];
  for(const c of cases){
    await fly(page,c.id);const initial=await scene(page,c.id);expect(initial.type).toBe('webgl');expect(initial.bounds.visibleVertices).toBeGreaterThan(1000);expect(initial.bounds.clippedVertices).toBe(0);
    save(c.id+'-phone-frame',initial);await capture(page,c.id+'-phone-whole');for(const [axis,value] of Object.entries({minX:initial.bounds.minX,maxX:initial.bounds.maxX,minY:initial.bounds.minY,maxY:initial.bounds.maxY}))expect(Math.abs(value),c.id+' '+axis+' appendage framing').toBeLessThan(.985);
    for(const [axis,value] of Object.entries(initial.rulerBounds))expect(Math.abs(value),c.id+' '+axis+' ruler framing').toBeLessThan(.985);
    const entry=nav(page).getByRole('button',{name:'Explore landmarks',exact:true});await entry.scrollIntoViewIfNeeded();const box=await entry.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.width).toBeGreaterThanOrEqual(44);await entry.tap();await detail(page,c.id,c.ids[0]);
    const next=nav(page).getByRole('button',{name:'Next landmark',exact:true});await next.tap();await detail(page,c.id,c.ids[1]);await next.focus();await next.press('ArrowRight');await detail(page,c.id,c.ids[2]);
    for(const label of ['Previous landmark','Next landmark','Return to whole view'])expect((await nav(page).getByRole('button',{name:label,exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await capture(page,c.id+'-phone-landmark');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await next.focus();await next.press('Escape');await expect(canvas(page)).toHaveAttribute('data-atlas-detail','');await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','1.00');await expect(nav(page).getByRole('button',{name:'Explore landmarks',exact:true})).toBeFocused();await settled(page);const restored=await scene(page,c.id);expect(restored.scale).toBe(initial.scale);expect(restored.bodyReference).toBeCloseTo(1,8);expectPose(restored,c.id,'');results.push({id:c.id,initial,restored});
  }
  save('specimen-phone',{results,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});

test('notebook restores precise native cameras and honeybee to ladybird comparison uses body lengths',async({page})=>{
  const log=await mount(page),book=page.getByRole('region',{name:'Field notebook',exact:true}),results=[];
  for(const c of cases){
    const part=c.id==='ladybird'?'wings':c.ids[1];await fly(page,c.id);await nav(page).getByRole('button',{name:'Explore landmarks',exact:true}).click();await detail(page,c.id,c.ids[0]);for(let n=1;n<=c.ids.indexOf(part);n++)await nav(page).getByRole('button',{name:'Next landmark',exact:true}).click();await detail(page,c.id,part);
    await setRange(page.getByRole('slider',{name:'Inspection magnification',exact:true}),7.1);await page.getByRole('button',{name:'Orbit left',exact:true}).click();await settled(page);
    const text='The '+part+' is a native anatomical surface.';await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill(text);await book.getByRole('button',{name:'Save observation',exact:true}).click();
    const saved=await page.evaluate(({id,part})=>(window as any).__toolData._scaleExplorer.observations.find((note:any)=>note.itemId===id&&note.detailId===part),{id:c.id,part});
    expect(saved).toMatchObject({itemId:c.id,detailId:part,size:c.meters,zoom:7.1,cutaway:false,note:text});await canvas(page).scrollIntoViewIfNeeded();await settled(page);const before=await scene(page,c.id);expectPose(before,c.id,part);
    await fly(page,'human');await book.locator('[data-observation="'+c.id+':'+part+'"]').getByRole('button',{name:/^Return to/}).click();await detail(page,c.id,part);const restored=await scene(page,c.id);expect(restored.yaw).toBeCloseTo(saved.yaw,4);expect(restored.pitch).toBeCloseTo(saved.pitch,4);expect(restored.meshes).toEqual(before.meshes);expectPose(restored,c.id,part);await expect(book.getByRole('textbox',{name:'What do you notice?',exact:true})).toHaveValue(text);
    await book.getByRole('button',{name:'Update observation',exact:true}).click();const recaptured=await page.evaluate(({id,part})=>(window as any).__toolData._scaleExplorer.observations.find((note:any)=>note.itemId===id&&note.detailId===part),{id:c.id,part});expect(recaptured.zoom).toBe(saved.zoom);expect(recaptured.yaw).toBeCloseTo(saved.yaw,12);expect(recaptured.pitch).toBeCloseTo(saved.pitch,12);results.push({id:c.id,saved,before,restored,recaptured});
  }
  const panel=page.locator('.sx-comparison-workbench');if(await panel.getAttribute('open')===null)await panel.locator(':scope > summary').click();await panel.getByRole('combobox',{name:'First thing',exact:true}).selectOption('honeybee');await panel.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('ladybird');await panel.getByRole('button',{name:'Compare them',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-comparison','honeybee:ladybird');await settled(page);await expect(nav(page)).toHaveCount(0);
  const compared=await scene(page,'honeybee'),partner=await scene(page,'ladybird');expect(compared.comparisonRatio).toBeCloseTo(13/6,8);expect(compared.dimension).toBe('x');expect(partner.dimension).toBe('x');expect(compared.declaredExtent).toBe(1);expect(compared.bodyReference).toBeCloseTo(1,8);expect(partner.bodyReference).toBeCloseTo(1,8);expect(compared.rulerReference/partner.rulerReference*compared.comparisonRatio).toBeCloseTo(13/6,8);expect(compared.stats.reference).toBe('body-length');expect(partner.stats.reference).toBe('body-length');expect(compared.meshes).toEqual(results[0].before.meshes);expect(partner.meshes).toEqual(results[1].before.meshes);expectPose(partner,'ladybird','');await capture(page,'honeybee-ladybird-comparison');save('specimen-notebook-comparison',{results,compared,partner,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});
