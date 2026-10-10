import { test, expect, type Page, type Locator } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { showScaleExplorerTools } from './helpers/scale_explorer_workspace';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';

test.describe.configure({mode:'serial',retries:0,timeout:180000});
test.use({video:'off',trace:'off',hasTouch:true});
const out=path.resolve(process.env.SCALE_EIFFEL_REPORT_DIR||'reports/scale-explorer-eiffel');
const canvas=(p:Page)=>p.locator('[data-atlas-ready]');
const route=(p:Page)=>p.getByRole('region',{name:'Tower navigation',exact:true});
const study=(p:Page)=>p.getByRole('region',{name:'Tower observatory',exact:true});
const slider=(p:Page)=>route(p).getByRole('slider',{name:'Height above the esplanade',exact:true});
const lighting=(p:Page)=>study(p).getByRole('group',{name:'Tower lighting',exact:true});
const ids=['foundations','arches','first-floor','lifts','second-floor','lattice','summit','antenna'];
const heights=[0,2,30,57,83,115,195,276,300,312,330];
const replacement=(process.env.STEM_GL_SUBSTITUTE||'').split(';').find(p=>p.startsWith('stem_lab/stem_tool_scaleexplorer.js='));
const sourceFile=replacement?replacement.slice(replacement.indexOf('=')+1):'stem_lab/stem_tool_scaleexplorer.js';
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}} as any;
vm.runInNewContext(readFileSync(sourceFile,'utf8').replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.__eiffelChecks={details:atlasDetails,point:eiffelPoint,rail:eiffelRailAt};\n  window.StemLab.registerTool('scaleExplorer', {"),sandbox);
const checks=sandbox.window.__eiffelChecks;
const metadata=JSON.parse(JSON.stringify({details:checks.details('eiffel',(_:string,fallback:string)=>fallback),points:ids.map(id=>checks.point(id)),rails:heights.map(meters=>({meters,at:checks.rail(meters)}))}));
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js'],
  probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__eiffelCamera=c;return render.apply(this,arguments);};return r;}});`
});
function save(name:string,value:unknown){writeFileSync(path.join(out,name+'.json'),JSON.stringify(value,null,2)+'\n');}
async function mount(page:Page,phone=false){
  const errors:string[]=[],external:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/*',request=>{const url=request.request().url();if(/^https?:/.test(url)&&!/^http:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(url)){external.push(url);return request.abort();}return request.continue();});
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;(HTMLCanvasElement.prototype as any).getContext=function(type:string,...args:any[]){return type==='webgl2'?null:original.apply(this,[type,...args] as any);};});
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:phone?320:1400,height:phone?780:1100});
  await harness.mount(page,{_scaleExplorer:{ambient:false}},'!!document.querySelector("[data-atlas-ready]")');await showScaleExplorerTools(page);
  await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});await fly(page,'eiffel');return {errors,external};
}
async function fly(page:Page,id:string){
  await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);await expect(canvas(page)).toHaveAttribute('data-atlas-objects',id);
  await expect.poll(()=>canvas(page).evaluate((c:HTMLElement)=>Math.abs(Number(c.dataset.atlasExponent)-Number(c.dataset.atlasTarget)))).toBeLessThan(.002);
}
async function scene(page:Page){return page.evaluate(metadata=>{
  const w=window as any,T=w.THREE,rec=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;
  const visible=(object:any)=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;},plaza:any[]=[];
  rec.scene.traverse((o:any)=>{if(o.userData.itemId==='eiffel')root=o;if(o.userData.eiffelPlaza||o.name==='tower plaza')plaza.push({name:o.name,visible:visible(o)});});
  const model=root.userData.model,tower=model.userData.eiffel,camera=w.__eiffelCamera,c=document.querySelector('[data-atlas-ready]') as HTMLElement;
  const detail=c.dataset.atlasDetail||'',point=metadata.details.find((d:any)=>d.id===detail),aim=new T.Vector3().fromArray(c.dataset.atlasAim!.split(',').map(Number)),expected=point?model.localToWorld(new T.Vector3().fromArray(point.at)):null;
  const bounds=new T.Box3().setFromObject(model),direction=camera.getWorldDirection(new T.Vector3());
  return {type:rec.type,scale:root.scale.x,declaredExtent:model.userData.extent,dimension:model.userData.dimension,measureCenter:model.userData.measureCenter,
    aligned:direction.dot(aim.clone().sub(camera.position).normalize()),targetError:expected?expected.distanceTo(aim):0,
    referenceHeight:model.localToWorld(new T.Vector3(0,.5,0)).distanceTo(model.localToWorld(new T.Vector3(0,-.5,0)))/root.scale.x,actualHeight:(bounds.max.y-bounds.min.y)/root.scale.x,
    aim:aim.toArray(),yaw:Math.atan2(-direction.x,-direction.z),pitch:Math.asin(-direction.y),near:camera.near,plaza,
    cabin:{visible:visible(tower.cabin),at:tower.cabin.position.toArray(),heightMeters:tower.cabin.userData.heightMeters},
    meshes:tower.meshes.map((m:any)=>({geometry:m.geometry.uuid,material:Array.isArray(m.material)?m.material.map((a:any)=>a.uuid):m.material.uuid,detail:m.userData.eiffelDetailId})),stats:tower.stats,detail:tower.detailId,draws:rec.draws,renders:rec.renders};
},metadata);}
async function site(page:Page,id:string){
  const point=metadata.points.find((p:any)=>p.id===id);await expect(canvas(page)).toHaveAttribute('data-atlas-eiffel-site',id);await expect(canvas(page)).toHaveAttribute('data-atlas-detail',id);
  await expect(slider(page)).toHaveValue(String(point?point.meters:Number(id.slice(6))));
  await expect.poll(async()=>(await scene(page)).aligned).toBeGreaterThan(.99999);await expect.poll(async()=>(await scene(page)).targetError).toBeLessThan(.0002);
}
async function setRange(control:Locator,value:number){await control.evaluate((input:HTMLInputElement,value:number)=>{const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;set.call(input,String(value));input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));},value);}
async function ascent(page:Page,meters:number){await setRange(slider(page),meters);await site(page,'tower-'+meters);await expect(canvas(page)).toHaveAttribute('data-atlas-eiffel-height',String(meters));}
async function light(page:Page,evening:boolean){await lighting(page).getByRole('button',{name:evening?'Evening light':'Daylight',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-eiffel-light',evening?'evening':'daylight');await expect(lighting(page).getByRole('button',{name:'Evening light',exact:true})).toHaveAttribute('aria-pressed',String(evening));await expect(lighting(page).getByRole('button',{name:'Daylight',exact:true})).toHaveAttribute('aria-pressed',String(!evening));}
async function capture(page:Page,name:string){await canvas(page).scrollIntoViewIfNeeded();await page.locator('.sx-stage').screenshot({path:path.join(out,name+'-stage.png')});const pixels=await harness.glPixels(page);expect(pixels).not.toBeNull();expect(looksBlank(pixels!)).toBe(false);writeFileSync(path.join(out,name+'-gl.png'),pixels!.png);}
async function pickActual(page:Page,wanted:string){
  await canvas(page).scrollIntoViewIfNeeded();const point=await page.evaluate(wanted=>{
    const w=window as any,T=w.THREE,rec=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;rec.scene.traverse((o:any)=>{if(o.userData.itemId==='eiffel')root=o;});
    const model=root.userData.model,camera=w.__eiffelCamera,ray=new T.Raycaster(),element=document.querySelector('[data-atlas-ready]')!,rect=element.getBoundingClientRect();
    const visible=(object:any)=>{for(let o=object;o;o=o.parent)if(!o.visible)return false;return true;};
    const hit=(x:number,y:number)=>{ray.setFromCamera(new T.Vector2((x-rect.x)/rect.width*2-1,1-(y-rect.y)/rect.height*2),camera);return ray.intersectObjects(model.children,true).find((h:any)=>h.object.isMesh&&visible(h.object));};
    const targets=model.userData.eiffel.meshes.filter((m:any)=>m.userData.eiffelDetailId===wanted&&visible(m));
    for(const mesh of targets){const a=mesh.geometry.attributes.position,index=mesh.geometry.index,count=index?index.count:a.count,step=Math.max(3,Math.floor(count/900/3)*3);
      for(let i=0;i+2<count;i+=step){const centroid=new T.Vector3();for(let j=0;j<3;j++)centroid.add(new T.Vector3().fromBufferAttribute(a,index?index.getX(i+j):i+j));const p=mesh.localToWorld(centroid.multiplyScalar(1/3)).project(camera);if(Math.abs(p.x)>.82||Math.abs(p.y)>.64||p.z>=1)continue;
        const x=Math.round(rect.x+(p.x+1)*rect.width/2),y=Math.round(rect.y+(1-p.y)*rect.height/2);let margin=true;
        for(let dx=-1;dx<=1&&margin;dx++)for(let dy=-1;dy<=1;dy++)if(document.elementFromPoint(x+dx,y+dy)!==element||hit(x+dx,y+dy)?.object.userData.eiffelDetailId!==wanted){margin=false;break;}
        if(margin)return {x,y,wanted,marginPx:1};
      }
    }return null;
  },wanted);expect(point,'an exposed face of the actual Eiffel Tower structure').not.toBeNull();await page.mouse.click(point!.x,point!.y);return point;
}
function plazaVisible(view:any){expect(view.plaza.length,'separate plaza environment is present').toBeGreaterThan(0);expect(view.plaza.some((p:any)=>p.visible)).toBe(true);}
function plazaHidden(view:any){expect(view.plaza.every((p:any)=>!p.visible)).toBe(true);}
test.beforeAll(async()=>{mkdirSync(out,{recursive:true});const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');save('eiffel-browser-source',{checkedAt:new Date().toISOString(),source:sha('stem_lab/stem_tool_scaleexplorer.js'),desktop:sha('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js'),substitution:process.env.STEM_GL_SUBSTITUTE||null});await harness.start();});
test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});

test('representative ascent heights and three native structure picks preserve the 330 metre reference',async({page})=>{
  const log=await mount(page),initial=await scene(page);expect(initial.type).toBe('webgl');expect(initial.declaredExtent).toBe(1);expect(initial.dimension).toBe('y');expect(initial.measureCenter).toBe(0);expect(initial.referenceHeight).toBeCloseTo(1,8);expect(initial.actualHeight).toBeCloseTo(1,4);plazaVisible(initial);await capture(page,'eiffel-desktop-whole');
  await study(page).getByRole('button',{name:'Begin the ascent',exact:true}).click();await site(page,'tower-2');const picks=[];
  for(const [meters,id] of [[2,'foundations'],[30,'arches'],[195,'lattice']] as const){await ascent(page,meters);picks.push(await pickActual(page,id));await site(page,id);}
  const nativeViews=[];for(const id of ids){const d=metadata.details.find((d:any)=>d.id===id);await study(page).getByRole('button',{name:d.label,exact:true}).click();await site(page,id);const view=await scene(page);expect(view.scale).toBe(initial.scale);expect(view.meshes).toEqual(initial.meshes);expect(view.referenceHeight).toBeCloseTo(1,8);nativeViews.push(view);if(['arches','first-floor','summit'].includes(id))await capture(page,'eiffel-desktop-'+id);}
  const views=[];for(const meters of heights){await ascent(page,meters);const view=await scene(page);expect(view.scale).toBe(initial.scale);expect(view.meshes).toEqual(initial.meshes);expect(view.referenceHeight).toBeCloseTo(1,8);expect(view.actualHeight).toBeCloseTo(1,4);plazaVisible(view);
    expect(view.cabin.visible).toBe(meters<=276);if(meters<=276)expect(view.cabin.at).toEqual(metadata.rails.find((r:any)=>r.meters===meters).at);views.push(view);}
  expect(new Set(views.map(v=>v.aim[1])).size).toBe(heights.length);await capture(page,'eiffel-desktop-antenna');
  await route(page).getByRole('button',{name:'Whole tower',exact:true}).click();await expect(route(page)).toHaveCount(0);await expect(canvas(page)).toHaveAttribute('data-atlas-detail','');await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','1.00');
  save('eiffel-desktop',{initial,picks,nativeViews,views,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});

test('daylight and evening presets preserve the inspected feature, camera and existing geometry',async({page})=>{
  const log=await mount(page);await study(page).getByRole('button',{name:'Begin the ascent',exact:true}).click();await site(page,'tower-2');await ascent(page,195);const initialOrbit=await scene(page);
  await setRange(page.getByRole('slider',{name:'Inspection magnification',exact:true}),11.5);await page.getByRole('button',{name:'Orbit left',exact:true}).click();await canvas(page).scrollIntoViewIfNeeded();await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','11.50');
  await expect.poll(async()=>(await scene(page)).yaw).toBeCloseTo(Math.atan2(Math.sin(initialOrbit.yaw-.2),Math.cos(initialOrbit.yaw-.2)),4);
  await capture(page,'eiffel-lattice-daylight');const day=await scene(page);await light(page,true);await canvas(page).scrollIntoViewIfNeeded();const evening=await scene(page);
  expect(evening.detail).toBe('tower-195');expect(evening.aim).toEqual(day.aim);expect(evening.yaw).toBeCloseTo(day.yaw,8);expect(evening.pitch).toBeCloseTo(day.pitch,8);expect(evening.meshes).toEqual(day.meshes);expect(evening.cabin).toEqual(day.cabin);await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','11.50');await capture(page,'eiffel-lattice-evening');
  await light(page,false);await canvas(page).scrollIntoViewIfNeeded();const restored=await scene(page);expect(restored.detail).toBe(day.detail);expect(restored.yaw).toBeCloseTo(day.yaw,8);expect(restored.pitch).toBeCloseTo(day.pitch,8);expect(restored.meshes).toEqual(day.meshes);
  save('eiffel-lighting',{day,evening,restored,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});

test('320 pixel WebGL 1 journey supports touch, metre keyboard bounds and navigation or canvas Escape',async({page})=>{
  const log=await mount(page,true),initial=await scene(page);expect(initial.type).toBe('webgl');await capture(page,'eiffel-phone-whole');
  const begin=page.getByRole('region',{name:'Enter the tower journey',exact:true}).getByRole('button',{name:'Begin the ascent',exact:true});await begin.scrollIntoViewIfNeeded();const box=await begin.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.width).toBeGreaterThanOrEqual(44);await begin.tap();await site(page,'tower-2');
  await expect(slider(page)).toHaveAttribute('min','0');await expect(slider(page)).toHaveAttribute('max','330');await expect(slider(page)).toHaveAttribute('step','1');
  await slider(page).focus();await slider(page).press('ArrowRight');await site(page,'tower-3');await slider(page).press('End');await site(page,'tower-330');expect((await scene(page)).cabin.visible).toBe(false);
  await expect(route(page).getByRole('button',{name:'Next landmark',exact:true})).toBeDisabled();await slider(page).press('Home');await site(page,'tower-0');await expect(route(page).getByRole('button',{name:'Previous landmark',exact:true})).toBeDisabled();
  await route(page).getByRole('button',{name:'Next landmark',exact:true}).tap();await site(page,'foundations');await ascent(page,276);expect((await scene(page)).cabin.visible).toBe(true);
  for(const label of ['Previous landmark','Next landmark','Whole tower'])expect((await route(page).getByRole('button',{name:label,exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);expect((await slider(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await lighting(page).getByRole('button',{name:'Evening light',exact:true}).tap();await expect(canvas(page)).toHaveAttribute('data-atlas-eiffel-light','evening');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await capture(page,'eiffel-phone-summit-evening');
  await slider(page).focus();await slider(page).press('Escape');await expect(route(page)).toHaveCount(0);await expect(study(page).getByRole('button',{name:'Begin the ascent',exact:true})).toBeFocused();await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','1.00');
  await study(page).getByRole('button',{name:'Visit the summit',exact:true}).tap();await site(page,'summit');await canvas(page).focus();await canvas(page).press('Escape');await expect(route(page)).toHaveCount(0);await expect(canvas(page)).toHaveAttribute('data-atlas-detail','');await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','1.00');await expect(study(page).getByRole('button',{name:'Begin the ascent',exact:true})).toBeFocused();
  const restored=await scene(page);expect(restored.scale).toBe(initial.scale);save('eiffel-phone',{initial,restored,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});

test('evening notebook views restore exact height, zoom and orientation while comparison excludes plaza and cabin',async({page})=>{
  const log=await mount(page),book=page.getByRole('region',{name:'Field notebook',exact:true});await study(page).getByRole('button',{name:'Begin the ascent',exact:true}).click();await site(page,'tower-2');await ascent(page,195);await light(page,true);
  await setRange(page.getByRole('slider',{name:'Inspection magnification',exact:true}),11.5);await page.getByRole('button',{name:'Orbit left',exact:true}).click();await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('The upper lattice in evening light.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
  const saved=await page.evaluate(()=>(window as any).__toolData._scaleExplorer.observations.find((n:any)=>n.detailId==='tower-195'));expect(saved).toMatchObject({itemId:'eiffel',detailId:'tower-195',size:330,zoom:11.5,sunAngle:160,note:'The upper lattice in evening light.'});
  await canvas(page).scrollIntoViewIfNeeded();await expect.poll(async()=>(await scene(page)).yaw).toBeCloseTo(saved.yaw,4);await expect.poll(async()=>(await scene(page)).pitch).toBeCloseTo(saved.pitch,4);const viewpoint=await scene(page);
  await fly(page,'sequoia');plazaHidden(await scene(page));await book.locator('[data-observation="eiffel:tower-195"]').getByRole('button',{name:/^Return to/}).click();await canvas(page).scrollIntoViewIfNeeded();await site(page,'tower-195');await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','11.50');await expect(canvas(page)).toHaveAttribute('data-atlas-eiffel-light','evening');
  await expect(lighting(page).getByRole('button',{name:'Evening light',exact:true})).toHaveAttribute('aria-pressed','true');const returned=await scene(page);expect(returned.yaw).toBeCloseTo(saved.yaw,4);expect(returned.pitch).toBeCloseTo(saved.pitch,4);plazaVisible(returned);await expect(book.getByRole('textbox')).toHaveValue('The upper lattice in evening light.');
  await study(page).getByRole('button',{name:'Inspect the arches',exact:true}).click();await site(page,'arches');await light(page,false);await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('The open arches span four legs.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
  const arches=await page.evaluate(()=>(window as any).__toolData._scaleExplorer.observations.find((n:any)=>n.detailId==='arches'));expect(arches).toMatchObject({itemId:'eiffel',detailId:'arches',size:330,sunAngle:45,note:'The open arches span four legs.'});
  await fly(page,'blue-whale');await book.locator('[data-observation="eiffel:arches"]').getByRole('button',{name:/^Return to/}).click();await canvas(page).scrollIntoViewIfNeeded();await site(page,'arches');await expect(canvas(page)).toHaveAttribute('data-atlas-eiffel-light','daylight');await expect(canvas(page)).toHaveAttribute('data-atlas-zoom',arches.zoom.toFixed(2));const returnedArches=await scene(page);expect(returnedArches.yaw).toBeCloseTo(arches.yaw,4);expect(returnedArches.pitch).toBeCloseTo(arches.pitch,4);
  await expect(page.locator('.sx-details').getByRole('link',{name:'Read the science source',exact:true})).toHaveAttribute('href',/^https:\/\//);
  const panel=page.locator('.sx-comparison-workbench');if(await panel.getAttribute('open')===null)await panel.locator(':scope > summary').click();await panel.getByRole('combobox',{name:'First thing',exact:true}).selectOption('eiffel');await panel.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('human');await panel.getByRole('button',{name:'Compare them',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-comparison','eiffel:human');
  const compared=await scene(page);plazaHidden(compared);expect(compared.cabin.visible).toBe(false);expect(compared.detail).toBe('');expect(compared.referenceHeight).toBeCloseTo(1,8);
  const ratio=await page.evaluate(()=>{const rec=(window as any).__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()),scales:any={};rec.scene.traverse((o:any)=>{if(o.userData.itemId&&o.visible)scales[o.userData.itemId]=o.scale.x;});return scales.eiffel/scales.human;});expect(ratio).toBeCloseTo(330/1.7,8);await capture(page,'eiffel-human-comparison');
  save('eiffel-notebook',{saved,viewpoint,returned,arches,returnedArches,compared,ratio,...log});expect(log.errors).toEqual([]);expect(log.external).toEqual([]);
});
