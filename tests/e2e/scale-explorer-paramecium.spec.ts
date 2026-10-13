import {test,expect,type Page} from '@playwright/test';
import {GlHarness,looksBlank} from './helpers/stem_gl_harness';
import {showScaleExplorerTools} from './helpers/scale_explorer_workspace';
import {readPng} from './helpers/png_pixels';
import {mkdirSync,writeFileSync,appendFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';

test.describe.configure({mode:'serial',retries:0,timeout:360000});
test.use({video:'off',trace:'off',hasTouch:true});
const out=path.resolve(process.env.SCALE_PARAMECIUM_REPORT_DIR||'reports/scale-explorer-paramecium');
const source=readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8'),sourceSha256=createHash('sha256').update(source).digest('hex');
const sandbox:any={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {","  window.__paraSites=atlasDetails('paramecium',function(key,fallback){return fallback;});\n  window.StemLab.registerTool('scaleExplorer', {"),sandbox);
const views=JSON.parse(JSON.stringify(sandbox.window.__paraSites));
const cv=(p:Page)=>p.locator('[data-atlas-ready]');
const study=(p:Page)=>p.getByRole('region',{name:'Paramecium microscope',exact:true});
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1000,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],probes:`window.__paraDrawState=function(scene){let result=null;scene.traverse(function(n){if(n.visible&&n.userData.itemId==='paramecium'){const d=n.userData.model.userData.paramecium;result=[d.detail,d.cutaway,d.comparison];}});return JSON.stringify(result);};const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;window.__paraRenderer=r;r.render=function(scene,camera){const result=render.apply(this,arguments);if(!r.getRenderTarget()){window.__paraScene=scene;window.__paraCamera=camera;window.__paraLastDraw={camera:camera.matrixWorld.elements.slice(),projection:camera.projectionMatrix.elements.slice(),width:r.domElement.width,height:r.domElement.height,detail:window.__paraDrawState(scene)};}return result;};return r;}});`});
test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();expect(createHash('sha256').update(readFileSync('stem_lab/stem_tool_scaleexplorer.js')).digest('hex')).toBe(sourceSha256);});
test.afterEach(async({page})=>harness.destroy(page));
const save=(name:string,value:any)=>writeFileSync(path.join(out,name+'.json'),JSON.stringify({sourceSha256,...value},null,2));

async function mount(page:Page,phone=false,regularMotion=false){
 const diagnostic=path.join(out,(regularMotion?'motion':phone?'phone':'desktop')+'-diagnostics.txt'),errors:string[]=[];
 writeFileSync(diagnostic,'Mount '+new Date().toISOString()+'\n');
 page.on('console',m=>{if(m.type()==='error'||m.type()==='warning'||/context.*lost|WebGL/i.test(m.text()))appendFileSync(diagnostic,new Date().toISOString()+' '+m.type()+': '+m.text()+'\n');if(m.type()==='error')errors.push(m.text());});
 page.on('pageerror',e=>{appendFileSync(diagnostic,new Date().toISOString()+' pageerror: '+e.message+'\n');errors.push(e.message);});
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;(HTMLCanvasElement.prototype as any).getContext=function(type:string,...args:any[]){return type==='webgl2'?null:original.apply(this,[type,...args] as any);};});
 await page.emulateMedia({reducedMotion:regularMotion?'no-preference':'reduce'});await page.setViewportSize({width:phone?360:1400,height:phone?900:1000});
 await harness.mount(page,{_scaleExplorer:{ambient:false}},'!!document.querySelector("[data-atlas-ready]")');
 await showScaleExplorerTools(page);await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});return errors;
}
async function frames(page:Page,count=12){await page.evaluate(count=>new Promise<void>(resolve=>{let n=0;function next(){if(++n>=count)resolve();else requestAnimationFrame(next);}requestAnimationFrame(next);}),count);}
async function settle(page:Page){
 await cv(page).evaluate(el=>el.scrollIntoView({block:'center'}));
 await expect.poll(()=>page.evaluate(async()=>{const c=(window as any).__paraCamera,p=c.position.clone(),q=c.quaternion.clone();await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));return Math.max(p.distanceTo(c.position),...q.toArray().map((v:number,i:number)=>Math.abs(v-c.quaternion.toArray()[i])));})).toBeLessThan(1e-8);
 await expect.poll(()=>page.evaluate(()=>{const w=window as any,c=w.__paraCamera,r=w.__paraRenderer,d=w.__paraLastDraw;return !!d&&d.width===r.domElement.width&&d.height===r.domElement.height&&d.detail===w.__paraDrawState(w.__paraScene)&&d.camera.every((x:number,i:number)=>Math.abs(x-c.matrixWorld.elements[i])<1e-8)&&d.projection.every((x:number,i:number)=>Math.abs(x-c.projectionMatrix.elements[i])<1e-8);})).toBe(true);
}
async function fly(page:Page,id:string){await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);await expect(cv(page)).toHaveAttribute('data-atlas-objects',id);await settle(page);}
async function chooseView(page:Page,id:string){const view=views.find((d:any)=>d.id===id),b=study(page).getByRole('button',{name:view.label,exact:true});await b.focus();await b.press('Enter');await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail',id);await expect(b).toHaveAttribute('aria-pressed','true');}
async function shot(page:Page,name:string){await settle(page);const clip=await cv(page).evaluate(el=>{const r=el.getBoundingClientRect(),x=Math.max(0,r.left),y=Math.max(0,r.top);return{x,y,width:Math.min(innerWidth,r.right)-x,height:Math.min(innerHeight,r.bottom)-y};});await page.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:74,clip});}
async function canvasPixels(page:Page){const clip=await cv(page).evaluate(el=>{const r=el.getBoundingClientRect(),x=Math.max(0,r.left),y=Math.max(0,r.top);return{x,y,width:Math.min(innerWidth,r.right)-x,height:Math.min(innerHeight,r.bottom)-y};});return readPng(await page.screenshot({clip,type:'png',style:'body *{visibility:hidden!important}[data-atlas-ready]{visibility:visible!important;background:#ff00ff!important;background-image:none!important}'}));}
function changedShare(a:ReturnType<typeof readPng>,b:ReturnType<typeof readPng>){expect([a.width,a.height]).toEqual([b.width,b.height]);let changed=0,total=0;for(let y=0;y<a.height;y+=3)for(let x=0;x<a.width;x+=3){const p=a.at(x,y),q=b.at(x,y);total++;if(Math.max(...p.map((v,i)=>Math.abs(v-q[i])))>12)changed++;}return changed/total;}
async function compare(page:Page,a:string,b:string){const box=page.locator('.sx-comparison-workbench');if(await box.getAttribute('open')===null)await box.locator(':scope > summary').click();await box.getByRole('combobox',{name:'First thing',exact:true}).selectOption(a);await box.getByRole('combobox',{name:'Second thing',exact:true}).selectOption(b);await box.getByRole('button',{name:'Compare them',exact:true}).click();await expect(cv(page)).toHaveAttribute('data-atlas-comparison',a+':'+b);await settle(page);}

async function stats(page:Page){return page.evaluate((views)=>{
 const w=window as any,T=w.THREE,scene=w.__paraScene,camera=w.__paraCamera,renderer=w.__paraRenderer;let root:any;
 scene.traverse((n:any)=>{if(n.userData.itemId==='paramecium'&&n.visible)root=n;});if(!root)throw new Error('Paramecium model is not visible');
 const g=root.userData.model,d=g.userData.paramecium,geometry:any[]=[],transforms:any[]=[];let finite=true,uniformsFinite=true;
 const finiteValue=(v:any):boolean=>typeof v==='number'?Number.isFinite(v):v?.isVector2||v?.isVector3||v?.isVector4||v?.isQuaternion?v.toArray().every(Number.isFinite):v?.isMatrix3||v?.isMatrix4?v.elements.every(Number.isFinite):Array.isArray(v)||ArrayBuffer.isView(v)?Array.from(v as any).every(x=>typeof x!=='number'||Number.isFinite(x)):true;
 g.traverse((n:any)=>{const geo=n.geometry,p=geo?.attributes?.position;if(p){let sum=0,weighted=0;for(let i=0;i<p.array.length;i++){const value=p.array[i];finite=finite&&Number.isFinite(value);sum+=value;weighted+=value*(i%101+1);}geometry.push({name:n.name,uuid:geo.uuid,count:p.count,version:p.version,sum,weighted,indexCount:geo.index?.count||0});}for(const m of Array.isArray(n.material)?n.material:n.material?[n.material]:[])for(const u of Object.values(m.uniforms||{}))uniformsFinite=uniformsFinite&&finiteValue((u as any).value);transforms.push({name:n.name,uuid:n.uuid,position:n.position.toArray(),quaternion:n.quaternion.toArray(),scale:n.scale.toArray(),visible:n.visible});});
 const canvasRect=renderer.domElement.getBoundingClientRect(),detail=renderer.domElement.dataset.atlasDetail,selected=views.find((v:any)=>v.id===detail),selectedTarget=selected?g.localToWorld(new T.Vector3().fromArray(selected.at)).project(camera).toArray():null;
 const comparisonRoots:any={};scene.traverse((n:any)=>{if(n.userData.itemId&&n.visible)comparisonRoots[n.userData.itemId]=n.scale.x;});
 const points:any[]=[];for(const x of [d.bounds.min.x,d.bounds.max.x])for(const y of [d.bounds.min.y,d.bounds.max.y])for(const z of [d.bounds.min.z,d.bounds.max.z]){const p=g.localToWorld(new T.Vector3(x,y,z)).project(camera);points.push({x:(p.x+1)*canvasRect.width/2,y:(1-p.y)*canvasRect.height/2,z:p.z});}
 const bodyFrame={left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
 const visibleFeatures:any={};for(const [id,feature]of Object.entries(d.features||{})){const n:any=feature;if(n?.getWorldPosition)visibleFeatures[id]=n.getWorldPosition(new T.Vector3()).project(camera).toArray();else if(Array.isArray(n)&&n.length===3)visibleFeatures[id]=g.localToWorld(new T.Vector3().fromArray(n)).project(camera).toArray();}
 let foodTargetSurface=null;if(detail==='food-vacuoles'){const target=g.localToWorld(new T.Vector3().fromArray(selected.at)),ray=new T.Raycaster(camera.position,target.sub(camera.position).normalize()),hits=ray.intersectObject(g,true).filter((hit:any)=>{for(let n=hit.object;n;n=n.parent)if(!n.visible)return false;return hit.object!==d.cilia;});foodTargetSurface=hits[0]?.object.name||null;}
 return{finite,uniformsFinite,geometry,transforms,detail:d.detail,canvasDetail:detail,selectedTarget,foodTargetSurface,cutaway:d.cutaway,comparison:d.comparison,cover:d.cover.visible,interior:d.interior.visible,cutEdges:d.cutEdges.visible,body:d.body.visible,
 time:d.time?.value??d.time,motion:typeof d.motion==='object'?d.motion.value:d.motion,ciliaShader:{time:d.cilia.material.uniforms.uTime.value,open:d.cilia.material.uniforms.uOpen.value},visibleFeatures,
 bounds:d.bounds.getSize(new T.Vector3()).toArray(),boundsCenter:d.bounds.getCenter(new T.Vector3()).toArray(),dimensions:d.dimensions,bodyFrame,expectedComparisonBounds:d.bounds.clone().applyMatrix4(g.matrixWorld).getSize(new T.Vector3()).toArray(),comparisonBounds:root.userData.comparisonBodyBounds?.getSize(new T.Vector3()).toArray(),
 extent:g.userData.extent,dimension:g.userData.dimension,measureCenter:g.userData.measureCenter,scale:g.scale.toArray(),worldScale:root.scale.x,comparisonRoots,
 framing:{canvasHeight:canvasRect.height,canvasWidth:canvasRect.width},camera:{type:camera.type,position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),near:camera.near,far:camera.far},
 programs:renderer.info.programs.map((p:any)=>({runnable:p.diagnostics?.runnable!==false})),glError:renderer.getContext().getError()};
},views);}
function checkView(state:any,whole:any){
 expect(state.finite).toBe(true);expect(state.uniformsFinite).toBe(true);expect(state.comparison).toBe(false);expect(state.geometry).toEqual(whole.geometry);expect(state.bounds).toEqual(whole.bounds);expect(state.bounds[0]).toBe(1);expect(state.boundsCenter[0]).toBe(0);expect(state.scale).toEqual([1,1,1]);expect(state.extent).toBe(1);expect(state.measureCenter).toBe(0);expect(state.dimension).toBe('x');
 expect(state.dimensions.lengthM).toBe(2e-4);expect(state.body).toBe(true);expect(state.interior).toBe(state.cutaway);expect(state.cutEdges).toBe(state.cutaway);expect(state.cover).toBe(!state.cutaway);
 expect(state.ciliaShader.time).toBe(state.time);expect(state.ciliaShader.open).toBe(state.cutaway?1:0);
 expect(state.programs.every((p:any)=>p.runnable)).toBe(true);expect(state.glError).toBe(0);expect([...state.camera.position,state.camera.near,state.camera.far].every(Number.isFinite)).toBe(true);expect(state.camera.near).toBeGreaterThan(0);
 if(state.selectedTarget){expect(Math.abs(state.selectedTarget[0])).toBeLessThan(.15);expect(Math.abs(state.selectedTarget[1])).toBeLessThan(.3);expect(state.selectedTarget[2]).toBeGreaterThan(-1);expect(state.selectedTarget[2]).toBeLessThan(1);}
 if(state.detail==='food-vacuoles')expect(state.foodTargetSurface).toBe('paramecium-digestive-vacuole-membranes');
 if(!state.detail||state.detail==='para-overview'){expect(state.bodyFrame.left).toBeGreaterThanOrEqual(8);expect(state.bodyFrame.right).toBeLessThanOrEqual(state.framing.canvasWidth-8);}
}
async function disposal(page:Page){await page.evaluate(()=>{const w=window as any,resources=new Set<any>();w.__paraScene.traverse((n:any)=>{if(n.userData.itemId==='paramecium')for(const r of n.userData.resources||[])resources.add(r);});w.__paraDisposal={resources:resources.size,disposed:0};for(const resource of resources)resource.addEventListener('dispose',()=>w.__paraDisposal.disposed++);});await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);const result=await page.evaluate(()=>(window as any).__paraDisposal);expect(result.resources).toBeGreaterThan(10);expect(result.disposed).toBe(result.resources);return result;}

for(const phone of [false,true])test((phone?'phone':'desktop')+' microscope destinations, cutaways, saved views and comparison',async({page})=>{
 const prefix=phone?'phone':'desktop',errors=await mount(page,phone);await fly(page,'paramecium');await expect(study(page)).toBeVisible();
 await study(page).screenshot({path:path.join(out,prefix+'-controls.jpg'),type:'jpeg',quality:74});
 const whole=await stats(page),details:any[]=[];save(prefix+'-initial',{whole});checkView(whole,whole);
 for(const view of views){
  const b=study(page).getByRole('button',{name:view.label,exact:true}),rect=await b.boundingBox();expect(rect!.height).toBeGreaterThanOrEqual(44);if(phone){expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.x+rect!.width).toBeLessThanOrEqual(360);}
  await chooseView(page,view.id);const state=await stats(page);details.push(state);save(prefix+'-progress',{details});await shot(page,prefix+'-'+view.id);checkView(state,whole);expect(state.detail).toBe(view.id);expect(state.cutaway).toBe(view.cutaway);
 }
 await chooseView(page,'para-overview');const toggled:any[]=[];for(const open of [true,false,true,false]){if((await stats(page)).cutaway!==open){await study(page).getByRole('button',{name:open?'Open cell cutaway':'Close cell cutaway',exact:true}).click();await settle(page);}const after=await stats(page);checkView(after,whole);expect(after.cutaway).toBe(open);toggled.push(after);}await study(page).getByRole('button',{name:'Open cell cutaway',exact:true}).click();await settle(page);await shot(page,prefix+'-cutaway');
 await chooseView(page,'nuclei');const still=await stats(page);await frames(page);const later=await stats(page);expect(later.time).toBe(still.time);expect(later.transforms).toEqual(still.transforms);
 const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('The large and small nuclei share one cell.');await book.getByRole('button',{name:'Save observation',exact:true}).click();await settle(page);const saved=await stats(page);
 await fly(page,'ecoli');await book.locator('[data-observation="paramecium:nuclei"]').getByRole('button',{name:/^Return to/}).click();await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail','nuclei');const restored=await stats(page);checkView(restored,whole);expect(restored.cutaway).toBe(saved.cutaway);for(let i=0;i<3;i++)expect(restored.camera.position[i]).toBeCloseTo(saved.camera.position[i],7);await shot(page,prefix+'-restored-nuclei');
 await compare(page,'paramecium','ecoli');const compared=await stats(page);expect(compared.comparison).toBe(true);expect(compared.cutaway).toBe(false);expect(compared.interior).toBe(false);expect(compared.scale).toEqual([1,1,1]);expect(compared.geometry).toEqual(whole.geometry);expect(compared.worldScale/compared.comparisonRoots.ecoli).toBeCloseTo(100,8);expect(compared.comparisonBounds).toBeDefined();for(let i=0;i<3;i++)expect(compared.comparisonBounds[i]).toBeCloseTo(compared.expectedComparisonBounds[i],6);expect(compared.glError).toBe(0);await shot(page,prefix+'-comparison');
 await fly(page,'paramecium');await chooseView(page,'para-overview');const returned=await stats(page);checkView(returned,whole);const pixels=await harness.glPixels(page);expect(pixels).not.toBeNull();expect(looksBlank(pixels!)).toBe(false);expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);expect(errors).toEqual([]);const disposed=await disposal(page);save(prefix+'-geometry',{whole,details,toggled,still,later,saved,restored,compared,returned,disposed});
});

test('cilia and vacuoles animate without changing scale, pause in place, and dispose',async({page})=>{
 const errors=await mount(page,false,true);await fly(page,'paramecium');await chooseView(page,'contractile-vacuole');const before=await stats(page);
 await page.getByRole('button',{name:'Resume ambience',exact:true}).click();await settle(page);await frames(page,20);const moving=await stats(page),movingPixels=await canvasPixels(page);await frames(page,20);const movingLater=await stats(page),movingLaterPixels=await canvasPixels(page);expect(movingLater.time).toBeGreaterThan(moving.time);expect(movingLater.geometry).toEqual(before.geometry);expect(movingLater.bounds).toEqual(before.bounds);
 await page.getByRole('button',{name:'Pause ambience',exact:true}).click();await settle(page);await frames(page,3);const paused=await stats(page),pausedPixels=await canvasPixels(page);await frames(page,20);const pausedLater=await stats(page),pausedLaterPixels=await canvasPixels(page);expect(pausedLater.time).toBe(paused.time);expect(pausedLater.transforms).toEqual(paused.transforms);expect(pausedLater.geometry).toEqual(before.geometry);const pixelChanges={moving:changedShare(movingPixels,movingLaterPixels),paused:changedShare(pausedPixels,pausedLaterPixels)};expect(pixelChanges.moving).toBeGreaterThan(pixelChanges.paused+.001);await shot(page,'ordinary-motion-paused');expect(errors).toEqual([]);const disposed=await disposal(page);save('motion',{before,moving,movingLater,paused,pausedLater,pixelChanges,disposed});
});
