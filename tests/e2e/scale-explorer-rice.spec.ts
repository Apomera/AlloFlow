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
const out=path.resolve(process.env.SCALE_RICE_REPORT_DIR||'reports/scale-explorer-rice');
const source=readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8'),sourceSha256=createHash('sha256').update(source).digest('hex');
const sandbox:any={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {","  window.__riceSites=atlasDetails('rice',function(key,fallback){return fallback;});\n  window.StemLab.registerTool('scaleExplorer', {"),sandbox);
const views=JSON.parse(JSON.stringify(sandbox.window.__riceSites));
const cv=(p:Page)=>p.locator('[data-atlas-ready]');
const study=(p:Page)=>p.getByRole('region',{name:'Rice grain study',exact:true});
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1000,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],probes:`window.__riceDrawState=function(scene){let result=null;scene.traverse(function(n){if(n.visible&&n.userData.itemId==='rice'){const d=n.userData.model.userData.rice;result=[d.state.detail,d.state.stage,d.state.cutaway,d.state.comparison];}});return JSON.stringify(result);};const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;window.__riceRenderer=r;r.render=function(scene,camera){const result=render.apply(this,arguments);if(!r.getRenderTarget()){window.__riceScene=scene;window.__riceCamera=camera;window.__riceLastDraw={camera:camera.matrixWorld.elements.slice(),projection:camera.projectionMatrix.elements.slice(),width:r.domElement.width,height:r.domElement.height,detail:window.__riceDrawState(scene)};}return result;};return r;}});`});
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
 await expect.poll(()=>page.evaluate(async()=>{const c=(window as any).__riceCamera,p=c.position.clone(),q=c.quaternion.clone();await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));return Math.max(p.distanceTo(c.position),...q.toArray().map((v:number,i:number)=>Math.abs(v-c.quaternion.toArray()[i])));})).toBeLessThan(1e-8);
 await expect.poll(()=>page.evaluate(()=>{const w=window as any,c=w.__riceCamera,r=w.__riceRenderer,d=w.__riceLastDraw;return !!d&&d.width===r.domElement.width&&d.height===r.domElement.height&&d.detail===w.__riceDrawState(w.__riceScene)&&d.camera.every((x:number,i:number)=>Math.abs(x-c.matrixWorld.elements[i])<1e-8)&&d.projection.every((x:number,i:number)=>Math.abs(x-c.projectionMatrix.elements[i])<1e-8);})).toBe(true);
}
async function fly(page:Page,id:string){await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);await expect(cv(page)).toHaveAttribute('data-atlas-objects',id);await settle(page);}
async function chooseView(page:Page,id:string){const view=views.find((d:any)=>d.id===id),b=study(page).getByRole('button',{name:view.label,exact:true});await b.focus();await b.press('Enter');await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail',id);await expect(b).toHaveAttribute('aria-pressed','true');}
async function shot(page:Page,name:string){await settle(page);const clip=await cv(page).evaluate(el=>{const r=el.getBoundingClientRect(),x=Math.max(0,r.left),y=Math.max(0,r.top);return{x,y,width:Math.min(innerWidth,r.right)-x,height:Math.min(innerHeight,r.bottom)-y};});await page.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:74,clip});}
async function canvasPixels(page:Page){const clip=await cv(page).evaluate(el=>{const r=el.getBoundingClientRect(),x=Math.max(0,r.left),y=Math.max(0,r.top);return{x,y,width:Math.min(innerWidth,r.right)-x,height:Math.min(innerHeight,r.bottom)-y};});return readPng(await page.screenshot({clip,type:'png',style:'body *{visibility:hidden!important}[data-atlas-ready]{visibility:visible!important;background:#ff00ff!important;background-image:none!important}'}));}
function changedShare(a:ReturnType<typeof readPng>,b:ReturnType<typeof readPng>){expect([a.width,a.height]).toEqual([b.width,b.height]);let changed=0,total=0;for(let y=0;y<a.height;y+=3)for(let x=0;x<a.width;x+=3){const p=a.at(x,y),q=b.at(x,y);total++;if(Math.max(...p.map((v,i)=>Math.abs(v-q[i])))>12)changed++;}return changed/total;}
async function compare(page:Page,a:string,b:string){const box=page.locator('.sx-comparison-workbench');if(await box.getAttribute('open')===null)await box.locator(':scope > summary').click();await box.getByRole('combobox',{name:'First thing',exact:true}).selectOption(a);await box.getByRole('combobox',{name:'Second thing',exact:true}).selectOption(b);await box.getByRole('button',{name:'Compare them',exact:true}).click();await expect(cv(page)).toHaveAttribute('data-atlas-comparison',a+':'+b);await settle(page);}

async function stats(page:Page){return page.evaluate((views)=>{
 const w=window as any,T=w.THREE,scene=w.__riceScene,camera=w.__riceCamera,renderer=w.__riceRenderer;let root:any;
 scene.traverse((n:any)=>{if(n.userData.itemId==='rice'&&n.visible)root=n;});if(!root)throw new Error('Rice model is not visible');
 const g=root.userData.model,d=g.userData.rice,geometry:any[]=[],transforms:any[]=[];let finite=true,uniformsFinite=true;
 const finiteValue=(v:any):boolean=>typeof v==='number'?Number.isFinite(v):v?.isVector2||v?.isVector3||v?.isVector4||v?.isQuaternion?v.toArray().every(Number.isFinite):v?.isMatrix3||v?.isMatrix4?v.elements.every(Number.isFinite):Array.isArray(v)||ArrayBuffer.isView(v)?Array.from(v as any).every(x=>typeof x!=='number'||Number.isFinite(x)):true;
 g.traverse((n:any)=>{const geo=n.geometry,p=geo?.attributes?.position;if(p){let sum=0,weighted=0;for(let i=0;i<p.array.length;i++){const value=p.array[i];finite=finite&&Number.isFinite(value);sum+=value;weighted+=value*(i%101+1);}geometry.push({name:n.name,uuid:geo.uuid,count:p.count,version:p.version,sum,weighted,indexCount:geo.index?.count||0});}for(const m of Array.isArray(n.material)?n.material:n.material?[n.material]:[])for(const u of Object.values(m.uniforms||{}))uniformsFinite=uniformsFinite&&finiteValue((u as any).value);transforms.push({name:n.name,uuid:n.uuid,position:n.position.toArray(),quaternion:n.quaternion.toArray(),scale:n.scale.toArray()});});
 const rect=renderer.domElement.getBoundingClientRect(),detail=renderer.domElement.dataset.atlasDetail,selected=views.find((v:any)=>v.id===detail),selectedTarget=selected?g.localToWorld(new T.Vector3().fromArray(selected.at)).project(camera).toArray():null;
 const comparisonRoots:any={};scene.traverse((n:any)=>{if(n.userData.itemId&&n.visible)comparisonRoots[n.userData.itemId]=n.scale.x;});
 const points:any[]=[];for(const x of [d.bounds.min.x,d.bounds.max.x])for(const y of [d.bounds.min.y,d.bounds.max.y])for(const z of [d.bounds.min.z,d.bounds.max.z]){const p=g.localToWorld(new T.Vector3(x,y,z)).project(camera);points.push({x:(p.x+1)*rect.width/2,y:(1-p.y)*rect.height/2,z:p.z});}
 const bodyFrame={left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
 let targetSurface=null;if(detail==='rice-embryo'&&d.state.cutaway){const target=g.localToWorld(new T.Vector3().fromArray(selected.at)),ray=new T.Raycaster(camera.position,target.sub(camera.position).normalize()),hits=ray.intersectObject(g,true).filter((hit:any)=>{for(let n=hit.object;n;n=n.parent)if(!n.visible)return false;const key=hit.object.material?.customProgramCacheKey?.()||'';if(key.startsWith('rice-anatomy-')&&key.endsWith('-section')&&g.worldToLocal(hit.point.clone()).z>.00002)return false;return true;});targetSurface=hits[0]?.object.name||null;}
 return{finite,uniformsFinite,geometry,transforms,...d.state,canvasDetail:detail,selectedTarget,targetSurface,white:d.white.visible,brown:d.brown.visible,husk:d.husk.visible,interior:d.interior.visible,embryo:d.embryo.visible,
 bounds:d.bounds.getSize(new T.Vector3()).toArray(),boundsCenter:d.bounds.getCenter(new T.Vector3()).toArray(),dimensions:d.dimensions,bodyFrame,expectedComparisonBounds:d.bounds.clone().applyMatrix4(g.matrixWorld).getSize(new T.Vector3()).toArray(),comparisonBounds:root.userData.comparisonBodyBounds?.getSize(new T.Vector3()).toArray(),
 extent:g.userData.extent,dimension:g.userData.dimension,measureCenter:g.userData.measureCenter,scale:g.scale.toArray(),worldScale:root.scale.x,comparisonRoots,
 framing:{canvasHeight:rect.height,canvasWidth:rect.width},camera:{type:camera.type,position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),near:camera.near,far:camera.far},
 programs:renderer.info.programs.map((p:any)=>({runnable:p.diagnostics?.runnable!==false})),glError:renderer.getContext().getError()};
},views);}
const stageFor=(id:string)=>id==='rice-husk'?'paddy':['rice-bran','rice-section','rice-embryo'].includes(id)?'brown':'white';
function checkView(state:any,whole:any){
 expect(state.finite).toBe(true);expect(state.uniformsFinite).toBe(true);expect(state.comparison).toBe(false);expect(state.geometry).toEqual(whole.geometry);expect(state.transforms).toEqual(whole.transforms);expect(state.bounds).toEqual(whole.bounds);expect(state.bounds[1]).toBe(1);expect(state.boundsCenter[1]).toBe(0);expect(state.scale).toEqual([1,1,1]);expect(state.extent).toBe(1);expect(state.measureCenter).toBe(0);expect(state.dimension).toBe('y');
 expect(state.dimensions.lengthM).toBe(.007);expect(state.stage).toBe(stageFor(state.detail));expect(state.white).toBe(state.stage==='white');expect(state.brown).toBe(state.stage!=='white');expect(state.husk).toBe(state.stage==='paddy');expect(state.interior).toBe(state.cutaway);expect(state.embryo).toBe(state.cutaway&&state.stage!=='white');
 expect(state.programs.every((p:any)=>p.runnable)).toBe(true);expect(state.glError).toBe(0);expect([...state.camera.position,state.camera.near,state.camera.far].every(Number.isFinite)).toBe(true);expect(state.camera.near).toBeGreaterThan(0);
 if(state.selectedTarget){expect(Math.abs(state.selectedTarget[0])).toBeLessThan(.15);expect(Math.abs(state.selectedTarget[1])).toBeLessThan(.3);expect(state.selectedTarget[2]).toBeGreaterThan(-1);expect(state.selectedTarget[2]).toBeLessThan(1);}
 if(state.detail==='rice-embryo'&&state.cutaway)expect(state.targetSurface).toMatch(/^rice-(scutellum|embryo-axis)/);
 if(!state.detail||['rice-surface','rice-bran','rice-husk'].includes(state.detail)){expect(state.bodyFrame.left).toBeGreaterThanOrEqual(8);expect(state.bodyFrame.right).toBeLessThanOrEqual(state.framing.canvasWidth-8);}
}
async function disposal(page:Page){await page.evaluate(()=>{const w=window as any,resources=new Set<any>();w.__riceScene.traverse((n:any)=>{if(n.userData.itemId==='rice')for(const r of n.userData.resources||[])resources.add(r);});w.__riceDisposal={resources:resources.size,disposed:0};for(const resource of resources)resource.addEventListener('dispose',()=>w.__riceDisposal.disposed++);});await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);const result=await page.evaluate(()=>(window as any).__riceDisposal);expect(result.resources).toBeGreaterThan(10);expect(result.disposed).toBe(result.resources);return result;}
async function toggleCutaway(page:Page){const button=study(page).getByRole('button',{name:/^(Open|Close).*cutaway$/});await button.focus();await button.press('Enter');await settle(page);}

if(process.env.RICE_VISUAL_ONLY==='1')for(const phone of [false,true])test((phone?'phone':'desktop')+' preliminary framing',async({page})=>{
 const prefix=phone?'phone':'desktop',errors=await mount(page,phone);await fly(page,'rice');const states=[];
 for(const id of ['rice-surface','rice-husk','rice-section','rice-embryo']){await chooseView(page,id);await shot(page,prefix+'-'+id);states.push(await stats(page));}
 await study(page).screenshot({path:path.join(out,prefix+'-controls.jpg'),type:'jpeg',quality:74});save(prefix+'-preview',{states,errors});expect(errors).toEqual([]);
});
else for(const phone of [false,true])test((phone?'phone':'desktop')+' rice milling stages, section, saved views and physical comparison',async({page})=>{
 const prefix=phone?'phone':'desktop',errors=await mount(page,phone);await fly(page,'rice');await expect(study(page)).toBeVisible();
 await study(page).screenshot({path:path.join(out,prefix+'-controls.jpg'),type:'jpeg',quality:74});
 const whole=await stats(page),details:any[]=[];save(prefix+'-initial',{whole});checkView(whole,whole);
 for(const view of views){
  const b=study(page).getByRole('button',{name:view.label,exact:true}),rect=await b.boundingBox();expect(rect!.height).toBeGreaterThanOrEqual(44);if(phone){expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.x+rect!.width).toBeLessThanOrEqual(360);}
  await chooseView(page,view.id);const state=await stats(page);details.push(state);save(prefix+'-progress',{details});await shot(page,prefix+'-'+view.id);checkView(state,whole);expect(state.detail).toBe(view.id);expect(state.cutaway).toBe(view.cutaway);
 }
 await chooseView(page,'rice-embryo');const opened=await stats(page),toggled:any[]=[];
 for(const open of [false,true,false,true]){if((await stats(page)).cutaway!==open)await toggleCutaway(page);const state=await stats(page);checkView(state,whole);expect(state.cutaway).toBe(open);expect(state.detail).toBe(opened.detail);for(let i=0;i<3;i++)expect(state.camera.position[i]).toBeCloseTo(opened.camera.position[i],7);for(let i=0;i<4;i++)expect(state.camera.quaternion[i]).toBeCloseTo(opened.camera.quaternion[i],7);toggled.push(state);}
 await shot(page,prefix+'-embryo-cutaway');
 const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('The embryo lies beside the starchy endosperm near the kernel base.');await book.getByRole('button',{name:'Save observation',exact:true}).click();await settle(page);const saved=await stats(page);
 await fly(page,'basketball');await book.locator('[data-observation="rice:rice-embryo"]').getByRole('button',{name:/^Return to/}).click();await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail','rice-embryo');const restored=await stats(page);checkView(restored,whole);expect(restored.cutaway).toBe(saved.cutaway);for(let i=0;i<3;i++)expect(restored.camera.position[i]).toBeCloseTo(saved.camera.position[i],7);await shot(page,prefix+'-restored-embryo');
 await compare(page,'rice','basketball');const compared=await stats(page);expect(compared.comparison).toBe(true);expect(compared.stage).toBe('white');expect(compared.cutaway).toBe(false);expect(compared.interior).toBe(false);expect(compared.husk).toBe(false);expect(compared.brown).toBe(false);expect(compared.scale).toEqual([1,1,1]);expect(compared.geometry).toEqual(whole.geometry);expect(compared.worldScale/compared.comparisonRoots.basketball).toBeCloseTo(.007/.24,8);expect(compared.comparisonBounds).toBeDefined();for(let i=0;i<3;i++)expect(compared.comparisonBounds[i]).toBeCloseTo(compared.expectedComparisonBounds[i],6);expect(compared.glError).toBe(0);await shot(page,prefix+'-comparison');
 await fly(page,'rice');await chooseView(page,'rice-surface');const returned=await stats(page);checkView(returned,whole);const pixels=await harness.glPixels(page);expect(pixels).not.toBeNull();expect(looksBlank(pixels!)).toBe(false);expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);expect(errors).toEqual([]);const disposed=await disposal(page);save(prefix+'-geometry',{whole,details,toggled,saved,restored,compared,returned,disposed});
});
