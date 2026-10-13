import {test,expect,type Page} from '@playwright/test';
import {GlHarness,looksBlank} from './helpers/stem_gl_harness';
import {showScaleExplorerTools} from './helpers/scale_explorer_workspace';
import {mkdirSync,writeFileSync,appendFileSync} from 'node:fs';import path from 'node:path';
test.describe.configure({mode:'serial',retries:0,timeout:360000});test.use({video:'off',trace:'off',hasTouch:true});
const out=path.resolve(process.env.SCALE_COMA_REPORT_DIR||'reports/scale-explorer-coma'),cv=(p:Page)=>p.locator('[data-atlas-ready]'),panel=(p:Page)=>p.getByRole('region',{name:'Size silhouettes',exact:true});
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

const comaSource=readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8'),comaHash=createHash('sha256').update(comaSource).digest('hex');
const comaSandbox:any={window:{StemLab:{registerTool(){}}},console:{log(){}}};
const comaRegister="  window.StemLab.registerTool('scaleExplorer', {";
vm.runInNewContext(comaSource.replace(comaRegister,'  window.comaTests={sites:COMA_SITES,point:comaPoint,distance:COMA_DISTANCE_M};\n'+comaRegister),comaSandbox);
const comaApi=comaSandbox.window.comaTests,comaIds=['coma-overview','coma-home','coma-halfway','coma-cluster','coma-core','coma-ngc4874','coma-ngc4889','coma-outskirts'];

async function comaStats(page:Page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE;let root:any;w.__silScene.traverse((n:any)=>{if(n.userData.itemId==='coma-dist'&&n.visible)root=n;});
 const g=root.userData.model,d=g.userData.coma,geometry:any[]=[];let finite=true;
 g.traverse((n:any)=>{const geo=n.geometry,p=geo?.attributes?.position;if(!p)return;let sum=0,weighted=0;for(let i=0;i<p.array.length;i++){const v=p.array[i];finite=finite&&Number.isFinite(v);sum+=v;weighted+=v*(i%101+1);}geometry.push({name:n.name,uuid:geo.uuid,count:p.count,version:p.version,sum,weighted,indexCount:geo.index?.count||0});});
 return{finite,geometry,body:d.body.visible,context:d.context.visible,detail:d.detail,comparison:d.comparison,fraction:d.fraction,zoom:d.zoom,bounds:d.bounds.getSize(new T.Vector3()).toArray(),boundsCenter:d.bounds.getCenter(new T.Vector3()).toArray(),expectedBounds:d.bounds.clone().applyMatrix4(g.matrixWorld).getSize(new T.Vector3()).toArray(),comparisonBounds:root.userData.comparisonBodyBounds?.getSize(new T.Vector3()).toArray(),scale:g.scale.toArray(),worldScale:root.scale.x,ruler:root.userData.ruler.visible,camera:{position:w.__silCamera.position.toArray(),near:w.__silCamera.near,far:w.__silCamera.far},programs:w.__silRenderer.info.programs.map((p:any)=>({runnable:p.diagnostics?.runnable!==false}))};
});}

function checkComa(state:any,baseline:any){
 expect(state.finite).toBe(true);expect(state.body).toBe(true);expect(state.context).toBe(!state.comparison&&state.zoom<=20);
 expect(state.geometry).toEqual(baseline.geometry);expect(state.bounds).toEqual(baseline.bounds);expect(state.boundsCenter).toEqual(baseline.boundsCenter);expect(state.scale).toEqual(baseline.scale);
 expect(state.programs.every((p:any)=>p.runnable)).toBe(true);expect([...state.camera.position,state.camera.near,state.camera.far].every(Number.isFinite)).toBe(true);expect(state.camera.near).toBeGreaterThan(0);expect(state.camera.far).toBeGreaterThan(state.camera.near);
}

async function comaPassage(page:Page,percent:number){
 const slider=page.getByRole('slider',{name:'Position along the crossing',exact:true});await slider.focus();
 if(percent===0){await slider.press('End');await slider.press('Home');}else{await slider.press('Home');if(percent===100)await slider.press('End');else for(let i=0;i<percent;i++)await slider.press('ArrowRight');}
 await expect(slider).toHaveValue(String(percent));await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail','coma-passage-'+percent);await expect(cv(page)).toHaveAttribute('data-atlas-zoom',comaApi.point('coma-passage-'+percent).zoom.toFixed(2));
 return comaStats(page);
}

async function comaDisposal(page:Page){
 await page.evaluate(()=>{const w=window as any,resources=new Set<any>();w.__silScene.traverse((n:any)=>{if(n.userData.itemId==='coma-dist')for(const r of n.userData.resources||[])resources.add(r);});w.__comaDisposal={resources:resources.size,disposed:0};for(const r of resources)r.addEventListener('dispose',()=>w.__comaDisposal.disposed++);});
 await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);const state=await page.evaluate(()=>(window as any).__comaDisposal);expect(state.resources).toBeGreaterThan(0);expect(state.disposed).toBe(state.resources);return state;
}

test('Coma atlas explores the cluster and route with stable geometry and physical comparison',async({page})=>{
 const errors=await mount(page);await fly(page,'coma-dist');const study=page.getByRole('region',{name:'Coma Cluster atlas',exact:true}),buttons=study.getByRole('button');await expect(study).toBeVisible();expect(await buttons.count()).toBe(8);
 const whole=await comaStats(page);expect(whole.geometry.length).toBeGreaterThan(3);expect(whole.geometry.every((g:any)=>g.count>0)).toBe(true);checkComa(whole,whole);await shot(page,'coma-whole');const views:any[]=[];
 for(let i=0;i<comaIds.length;i++){
  const id=comaIds[i],button=buttons.nth(i);await button.click();await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail',id);await expect(cv(page)).toHaveAttribute('data-atlas-zoom',comaApi.point(id).zoom.toFixed(2));await expect(button).toHaveAttribute('aria-pressed','true');
  const state=await comaStats(page);checkComa(state,whole);views.push({id,...state});await shot(page,id);
 }
 const samples:any[]=[];for(const percent of [0,50,100]){const state=await comaPassage(page,percent);checkComa(state,whole);samples.push({percent,...state});}
 const middle=await comaPassage(page,50);await page.evaluate(()=>new Promise<void>(resolve=>{let frames=0;function next(){if(++frames>=12)resolve();else requestAnimationFrame(next);}requestAnimationFrame(next);}));const later=await comaStats(page);expect(later.geometry).toEqual(middle.geometry);expect(later.camera.position).toEqual(middle.camera.position);
 await compare(page,'coma-dist','sun');const compared=await comaStats(page),comparison=await capture(page);expect(compared.body).toBe(true);expect(compared.context).toBe(false);expect(compared.geometry).toEqual(whole.geometry);expect(compared.comparisonBounds).toBeDefined();for(let i=0;i<3;i++)expect(compared.comparisonBounds![i]).toBeCloseTo(compared.expectedBounds[i],6);
 const ratio=compared.worldScale/comparison.roots.sun.scale;expect(ratio/(comaApi.distance/1.392e9)).toBeCloseTo(1,10);await shot(page,'coma-sun-comparison');
 const pixels=await harness.glPixels(page);expect(pixels).not.toBeNull();expect(looksBlank(pixels!)).toBe(false);await fly(page,'coma-dist');const returned=await comaStats(page);checkComa(returned,whole);expect(errors).toEqual([]);const disposal=await comaDisposal(page);
 writeFileSync(path.join(out,'geometry.json'),JSON.stringify({sourceSha256:comaHash,whole,views,samples,middle,later,compared,comparison,returned,disposal},null,2));
});

test('Coma phone controls and notebook restore a saved crossing position',async({page})=>{
 const errors=await mount(page,true);await fly(page,'coma-dist');const whole=await comaStats(page),study=page.getByRole('region',{name:'Coma Cluster atlas',exact:true}),buttons=study.getByRole('button'),views:any[]=[];expect(await buttons.count()).toBe(8);
 for(let i=0;i<comaIds.length;i++){
  const id=comaIds[i],button=buttons.nth(i);await expect(button).toBeVisible();const box=await button.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(360);expect(box!.height).toBeGreaterThanOrEqual(44);await button.focus();await button.press('Enter');await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail',id);await expect(button).toHaveAttribute('aria-pressed','true');const state=await comaStats(page);checkComa(state,whole);views.push({id,...state});await shot(page,id+'-phone');
 }
 const samples:any[]=[];for(const percent of [0,50,100]){const state=await comaPassage(page,percent);checkComa(state,whole);samples.push({percent,...state});}
 const middle=await comaPassage(page,50),book=page.getByRole('region',{name:'Field notebook',exact:true});
 await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('Halfway across the Coma crossing, the cluster remains a small destination.');await book.getByRole('button',{name:'Save observation',exact:true}).click();await fly(page,'sun');await book.locator('[data-observation="coma-dist:coma-passage-50"]').getByRole('button',{name:/^Return to/}).click();await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-objects','coma-dist');await expect(cv(page)).toHaveAttribute('data-atlas-detail','coma-passage-50');await expect(cv(page)).toHaveAttribute('data-atlas-zoom',comaApi.point('coma-passage-50').zoom.toFixed(2));await expect(page.getByRole('slider',{name:'Position along the crossing',exact:true})).toHaveValue('50');
 const restored=await comaStats(page);checkComa(restored,whole);for(let i=0;i<3;i++)expect(restored.camera.position[i]).toBeCloseTo(middle.camera.position[i],8);await shot(page,'coma-phone-restored');await study.screenshot({path:path.join(out,'coma-phone-controls.png')});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);expect(errors).toEqual([]);const disposal=await comaDisposal(page);
 writeFileSync(path.join(out,'phone-geometry.json'),JSON.stringify({sourceSha256:comaHash,whole,views,samples,middle,restored,disposal},null,2));
});
