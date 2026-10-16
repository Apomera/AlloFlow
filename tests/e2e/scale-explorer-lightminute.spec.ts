import {test,expect,type Page} from '@playwright/test';
import {GlHarness,looksBlank} from './helpers/stem_gl_harness';
import {showScaleExplorerTools} from './helpers/scale_explorer_workspace';
import {mkdirSync,writeFileSync,appendFileSync} from 'node:fs';import path from 'node:path';
test.describe.configure({mode:'serial',retries:0,timeout:360000});test.use({video:'off',trace:'off',hasTouch:true});
const out=path.resolve(process.env.SCALE_LIGHTMINUTE_REPORT_DIR||'reports/scale-explorer-lightminute'),cv=(p:Page)=>p.locator('[data-atlas-ready]'),panel=(p:Page)=>p.getByRole('region',{name:'Size silhouettes',exact:true});
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;window.__silRenderer=r;r.render=function(scene,camera){if(!r.getRenderTarget()){window.__silScene=scene;window.__silCamera=camera;}return render.apply(this,arguments);};return r;}});`});
test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page:Page,phone=false){const diagnostic=path.join(out,phone?'phone-diagnostics.txt':'desktop-diagnostics.txt');writeFileSync(diagnostic,'Mount '+new Date().toISOString()+'\n');page.on('console',m=>{if(m.type()==='error'||m.type()==='warning'||/context.*lost|WebGL/i.test(m.text()))appendFileSync(diagnostic,new Date().toISOString()+' '+m.type()+': '+m.text()+'\n');});page.on('pageerror',e=>appendFileSync(diagnostic,new Date().toISOString()+' pageerror: '+e.message+'\n'));const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;(HTMLCanvasElement.prototype as any).getContext=function(type:string,...args:any[]){return type==='webgl2'?null:original.apply(this,[type,...args] as any);};});await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:phone?360:1400,height:phone?900:1100});await harness.mount(page,{_scaleExplorer:{ambient:false,yourHeightCm:phone?220:null}},'!!document.querySelector("[data-atlas-ready]")');await showScaleExplorerTools(page);await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});return errors;}
async function settle(page:Page){await cv(page).scrollIntoViewIfNeeded();await expect.poll(()=>page.evaluate(async()=>{const c=(window as any).__silCamera,p=c.position.clone();await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));return p.distanceTo(c.position);})).toBeLessThan(.000001);}
async function fly(page:Page,id:string){await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);await expect(cv(page)).toHaveAttribute('data-atlas-objects',id);await settle(page);}
async function compare(page:Page,a:string,b:string){const box=page.locator('.sx-comparison-workbench');if(await box.getAttribute('open')===null)await box.locator(':scope > summary').click();await box.getByRole('combobox',{name:'First thing',exact:true}).selectOption(a);await box.getByRole('combobox',{name:'Second thing',exact:true}).selectOption(b);await box.getByRole('button',{name:'Compare them',exact:true}).click();await expect(cv(page)).toHaveAttribute('data-atlas-comparison',a+':'+b);await settle(page);}
async function capture(page:Page){return page.evaluate(()=>{const w=window as any,T=w.THREE,scene=w.__silScene,renderer=w.__silRenderer,camera=w.__silCamera,quad=scene.getObjectByName('scale-larger-silhouette'),data=quad?.userData.comparisonSilhouette;const roots:any={};scene.traverse((o:any)=>{if(o.userData.itemId&&o.visible)roots[o.userData.itemId]={scale:o.scale.x,position:o.position.toArray(),modelVisible:o.userData.model.visible,axis:o.userData.measureAxis,anchor:o.userData.measureAnchor?.toArray(),geometry:o.userData.model.children.filter((n:any)=>n.geometry).map((n:any)=>n.geometry.uuid)};});let mask:any=null;if(data?.stats.active){const bytes=new Uint8Array(data.target.width*data.target.height*4);renderer.readRenderTargetPixels(data.target,0,0,data.target.width,data.target.height,bytes);let occupied=0;for(let i=3;i<bytes.length;i+=4)if(bytes[i]>20)occupied++;mask={coverage:occupied/(bytes.length/4),width:data.target.width,height:data.target.height};}return{roots,stats:data?{...data.stats}:null,mask,identity:data?[data.target.texture.uuid,quad.geometry.uuid,quad.material.uuid]:null,quadVisible:quad?.visible||false,renderTarget:renderer.getRenderTarget()===null,projection:camera.type,canvasHeight:renderer.domElement.clientHeight,theme:scene.background?.getHexString(),type:w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()).type};});}
async function shot(page:Page,name:string){await settle(page);await page.locator('.sx-stage').screenshot({path:path.join(out,name+'.png')});}
async function clickModel(page:Page,id:string){const point=await page.evaluate(itemId=>{const w=window as any,T=w.THREE;let root:any;w.__silScene.traverse((o:any)=>{if(o.userData.itemId===itemId&&o.visible)root=o;});const p=root.userData.model.localToWorld(new T.Vector3(0,0,0)).project(w.__silCamera),r=w.__silRenderer.domElement.getBoundingClientRect();return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},id);await page.mouse.click(point.x,point.y);}

import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const minuteSource=readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8'),minuteHash=createHash('sha256').update(minuteSource).digest('hex');
const minuteSandbox:any={window:{StemLab:{registerTool(){}}},console:{log(){}}};
const minuteRegister="  window.StemLab.registerTool('scaleExplorer', {";
vm.runInNewContext(minuteSource.replace(minuteRegister,'  window.minuteTests={sites:LIGHT_MINUTE_SITES,point:lightMinutePoint,distance:LIGHT_MINUTE_M,earth:LIGHT_MINUTE_EARTH_M,moon:LIGHT_MINUTE_MOON_M,separation:LIGHT_MINUTE_MOON_DISTANCE_M};\n'+minuteRegister),minuteSandbox);
const minuteApi=minuteSandbox.window.minuteTests,minuteIds=['light-minute-overview','light-minute-pair','light-minute-earth','light-minute-moon','light-minute-ten','light-minute-end'];

async function minuteStats(page:Page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE;let root:any;w.__silScene.traverse((n:any)=>{if(n.userData.itemId==='light-minute'&&n.visible)root=n;});
 const g=root.userData.model,d=g.userData.lightMinute,geometry:any[]=[];let finite=true;
 g.updateMatrixWorld(true);const inverse=new T.Matrix4().copy(g.matrixWorld).invert();
 d.body.traverse((n:any)=>{const geo=n.geometry,p=geo?.attributes?.position;if(!p)return;let sum=0,weighted=0;for(let i=0;i<p.array.length;i++){const v=p.array[i];finite=finite&&Number.isFinite(v);sum+=v;weighted+=v*(i%101+1);}geometry.push({name:n.name,uuid:geo.uuid,count:p.count,version:p.version,sum,weighted,indexCount:geo.index?.count||0});});
 const sphere=(surface:any)=>{const matrix=new T.Matrix4().multiplyMatrices(inverse,surface.matrixWorld),center=new T.Vector3().applyMatrix4(matrix),p=surface.geometry.attributes.position,v=new T.Vector3();let min=Infinity,max=0;for(let i=0;i<p.count;i++){const radius=v.fromBufferAttribute(p,i).applyMatrix4(matrix).distanceTo(center);min=Math.min(min,radius);max=Math.max(max,radius);}return{diameter:max*2,radiusRange:[min,max],center:center.toArray()};};
 const transforms=[d.earth,d.moon].map((n:any)=>({position:n.position.toArray(),scale:n.scale.toArray(),quaternion:n.quaternion.toArray()}));
 return{finite,geometry,transforms,earth:sphere(d.earthSurface),moon:sphere(d.moonSurface),moonWorldDiameter:d.moonSurface.matrixWorld.getMaxScaleOnAxis(),moonBumpScale:d.moonSurface.material.bumpScale,body:d.body.visible,context:d.context.visible,detail:d.detail,comparison:d.comparison,seconds:d.seconds,fraction:d.fraction,zoom:d.zoom,dimensions:d.dimensions,stats:d.stats,bounds:d.bounds.getSize(new T.Vector3()).toArray(),boundsCenter:d.bounds.getCenter(new T.Vector3()).toArray(),expectedBounds:d.bounds.clone().applyMatrix4(g.matrixWorld).getSize(new T.Vector3()).toArray(),comparisonBounds:root.userData.comparisonBodyBounds?.getSize(new T.Vector3()).toArray(),scale:g.scale.toArray(),worldScale:root.scale.x,ruler:root.userData.ruler.visible,camera:{position:w.__silCamera.position.toArray(),near:w.__silCamera.near,far:w.__silCamera.far},programs:w.__silRenderer.info.programs.map((p:any)=>({runnable:p.diagnostics?.runnable!==false}))};
});}

function checkMinute(state:any,baseline:any){
 expect(state.finite).toBe(true);expect(state.body).toBe(true);
 expect(state.geometry).toEqual(baseline.geometry);expect(state.transforms).toEqual(baseline.transforms);expect(state.bounds).toEqual(baseline.bounds);expect(state.boundsCenter).toEqual(baseline.boundsCenter);expect(state.scale).toEqual(baseline.scale);
 expect(state.programs.every((p:any)=>p.runnable)).toBe(true);expect([...state.camera.position,state.camera.near,state.camera.far].every(Number.isFinite)).toBe(true);expect(state.camera.near).toBeGreaterThan(0);expect(state.camera.far).toBeGreaterThan(state.camera.near);
 // Read actual rendered geometry, independent of declared model metadata.
 expect(state.earth.diameter).toBeCloseTo(minuteApi.earth/minuteApi.distance,9);
 expect(state.moon.diameter).toBeCloseTo(minuteApi.moon/minuteApi.distance,9);
 for(const radius of state.earth.radiusRange)expect(radius).toBeCloseTo(minuteApi.earth/minuteApi.distance/2,9);
 for(const radius of state.moon.radiusRange)expect(radius).toBeCloseTo(minuteApi.moon/minuteApi.distance/2,9);
 expect(Math.hypot(...state.earth.center.map((v:number,i:number)=>v-state.moon.center[i]))*minuteApi.distance).toBeCloseTo(minuteApi.separation,4);
 expect(state.earth.center[0]).toBeCloseTo(-.5,11);
 // Bump mapping perturbs normals in rendered coordinates. A fixed bump value
 // would overwhelm this tiny Moon and change relief when comparisons rescale.
 expect(state.moonWorldDiameter).toBeGreaterThan(0);expect(Number.isFinite(state.moonBumpScale)).toBe(true);
 expect(state.moonBumpScale/state.moonWorldDiameter).toBeCloseTo(.0015,9);
 expect(state.dimensions.physicalRadii).toBe(true);expect(state.dimensions.adaptiveRescale).toBe(false);
}

async function minuteTime(page:Page,seconds:number){
 const slider=page.getByRole('slider',{name:'Elapsed light time',exact:true});await slider.focus();
 if(seconds===0){await slider.press('End');await slider.press('Home');}else{await slider.press('Home');if(seconds===60)await slider.press('End');else for(let i=0;i<Math.round(seconds*10);i++)await slider.press('ArrowRight');}
 await expect(slider).toHaveValue(String(seconds));await settle(page);const id='light-minute-time-'+Math.round(seconds*10);await expect(cv(page)).toHaveAttribute('data-atlas-detail',id);await expect(cv(page)).toHaveAttribute('data-atlas-zoom',minuteApi.point(id).zoom.toFixed(2));
 const state=await minuteStats(page);expect(state.seconds).toBeCloseTo(seconds,10);return state;
}

async function minuteDisposal(page:Page){
 await page.evaluate(()=>{const w=window as any,resources=new Set<any>();w.__silScene.traverse((n:any)=>{if(n.userData.itemId==='light-minute')for(const r of n.userData.resources||[])resources.add(r);});w.__minuteDisposal={resources:resources.size,disposed:0};for(const r of resources)r.addEventListener('dispose',()=>w.__minuteDisposal.disposed++);});
 await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);const state=await page.evaluate(()=>(window as any).__minuteDisposal);expect(state.resources).toBeGreaterThan(0);expect(state.disposed).toBe(state.resources);return state;
}

async function minuteImagery(page:Page){await expect.poll(()=>page.evaluate(()=>{const w=window as any;let d:any;w.__silScene.traverse((n:any)=>{if(n.userData.itemId==='light-minute'&&n.visible)d=n.userData.model.userData.lightMinute;});return d?.textureStatus;}),{timeout:45000}).toEqual({earth:'ready',night:'ready',moon:'ready',relief:'ready'});}

test('Light-minute observatory explores Earth and Moon with constant physical dimensions',async({page})=>{
 const errors=await mount(page);await fly(page,'light-minute');const study=page.getByRole('region',{name:'Light-minute observatory',exact:true}),buttons=study.getByRole('button');await expect(study).toBeVisible();expect(await buttons.count()).toBe(6);
 const slider=page.getByRole('slider',{name:'Elapsed light time',exact:true});await expect(slider).toHaveAttribute('min','0');await expect(slider).toHaveAttribute('max','60');await expect(slider).toHaveAttribute('step','0.1');
 await minuteImagery(page);const whole=await minuteStats(page);expect(whole.geometry.length).toBeGreaterThan(2);expect(whole.geometry.every((g:any)=>g.count>0)).toBe(true);checkMinute(whole,whole);await shot(page,'light-minute-whole');const views:any[]=[];
 for(let i=0;i<minuteIds.length;i++){
  const id=minuteIds[i],button=buttons.nth(i);await button.click();await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail',id);await expect(cv(page)).toHaveAttribute('data-atlas-zoom',minuteApi.point(id).zoom.toFixed(2));await expect(button).toHaveAttribute('aria-pressed','true');
  const state=await minuteStats(page);checkMinute(state,whole);views.push({id,...state});await shot(page,id);
 }
 const samples:any[]=[];for(const seconds of [0,1.3,60]){const state=await minuteTime(page,seconds);checkMinute(state,whole);samples.push({seconds,...state});}
 const middle=await minuteTime(page,1.3);await page.evaluate(()=>new Promise<void>(resolve=>{let frames=0;function next(){if(++frames>=12)resolve();else requestAnimationFrame(next);}requestAnimationFrame(next);}));const later=await minuteStats(page);expect(later.geometry).toEqual(middle.geometry);expect(later.camera.position).toEqual(middle.camera.position);
 await compare(page,'light-minute','earth');const compared=await minuteStats(page),comparison=await capture(page);checkMinute(compared,whole);expect(compared.context).toBe(false);expect(compared.comparisonBounds).toBeDefined();for(let i=0;i<3;i++)expect(compared.comparisonBounds![i]).toBeCloseTo(compared.expectedBounds[i],6);
 const ratio=compared.worldScale/comparison.roots.earth.scale;expect(ratio/(minuteApi.distance/12742000)).toBeCloseTo(1,10);await shot(page,'light-minute-earth-comparison');
 const pixels=await harness.glPixels(page);expect(pixels).not.toBeNull();expect(looksBlank(pixels!)).toBe(false);await fly(page,'light-minute');const returned=await minuteStats(page);checkMinute(returned,whole);expect(errors).toEqual([]);const disposal=await minuteDisposal(page);
 writeFileSync(path.join(out,'geometry.json'),JSON.stringify({sourceSha256:minuteHash,whole,views,samples,middle,later,compared,comparison,returned,disposal},null,2));
});

test('Light-minute phone navigation and notebook restore the sampled light time',async({page})=>{
 const errors=await mount(page,true);await fly(page,'light-minute');await minuteImagery(page);const whole=await minuteStats(page),study=page.getByRole('region',{name:'Light-minute observatory',exact:true}),buttons=study.getByRole('button'),views:any[]=[];expect(await buttons.count()).toBe(6);
 for(let i=0;i<minuteIds.length;i++){
  const id=minuteIds[i],button=buttons.nth(i);await expect(button).toBeVisible();const box=await button.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(360);expect(box!.height).toBeGreaterThanOrEqual(44);await button.focus();await button.press('Enter');await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail',id);await expect(button).toHaveAttribute('aria-pressed','true');const state=await minuteStats(page);checkMinute(state,whole);views.push({id,...state});await shot(page,id+'-phone');
 }
 const samples:any[]=[];for(const seconds of [0,1.3,60]){const state=await minuteTime(page,seconds);checkMinute(state,whole);samples.push({seconds,...state});}
 const middle=await minuteTime(page,1.3),book=page.getByRole('region',{name:'Field notebook',exact:true});
 await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('After 1.3 seconds, light has passed the representative Moon distance.');await book.getByRole('button',{name:'Save observation',exact:true}).click();await fly(page,'sun');await book.locator('[data-observation="light-minute:light-minute-time-13"]').getByRole('button',{name:/^Return to/}).click();await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-objects','light-minute');await expect(cv(page)).toHaveAttribute('data-atlas-detail','light-minute-time-13');await expect(cv(page)).toHaveAttribute('data-atlas-zoom',minuteApi.point('light-minute-time-13').zoom.toFixed(2));await expect(page.getByRole('slider',{name:'Elapsed light time',exact:true})).toHaveValue('1.3');
 const restored=await minuteStats(page);checkMinute(restored,whole);for(let i=0;i<3;i++)expect(restored.camera.position[i]).toBeCloseTo(middle.camera.position[i],8);await shot(page,'light-minute-phone-restored');await study.screenshot({path:path.join(out,'light-minute-phone-controls.png')});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);expect(errors).toEqual([]);const disposal=await minuteDisposal(page);
 writeFileSync(path.join(out,'phone-geometry.json'),JSON.stringify({sourceSha256:minuteHash,whole,views,samples,middle,restored,disposal},null,2));
});
