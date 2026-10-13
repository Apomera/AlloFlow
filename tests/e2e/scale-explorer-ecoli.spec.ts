import {test,expect,type Page} from '@playwright/test';
import {GlHarness,looksBlank} from './helpers/stem_gl_harness';
import {showScaleExplorerTools} from './helpers/scale_explorer_workspace';
import {mkdirSync,writeFileSync,appendFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';

test.describe.configure({mode:'serial',retries:0,timeout:420000});
test.use({video:'off',trace:'off',hasTouch:true});
const out=path.resolve(process.env.SCALE_ECOLI_REPORT_DIR||'reports/scale-explorer-ecoli');
const source=readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8');
const sourceSha256=createHash('sha256').update(source).digest('hex');
const sandbox:any={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {","  window.__ecoliSites=atlasDetails('ecoli',function(key,fallback){return fallback;});\n  window.StemLab.registerTool('scaleExplorer', {"),sandbox);
const views=JSON.parse(JSON.stringify(sandbox.window.__ecoliSites));
const cv=(p:Page)=>p.locator('[data-atlas-ready]');
const study=(p:Page)=>p.getByRole('region',{name:'E. coli cell atlas',exact:true});
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;window.__ecoliRenderer=r;r.render=function(scene,camera){if(!r.getRenderTarget()){window.__ecoliScene=scene;window.__ecoliCamera=camera;}return render.apply(this,arguments);};return r;}});`});
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
 await page.emulateMedia({reducedMotion:regularMotion?'no-preference':'reduce'});await page.setViewportSize({width:phone?360:1400,height:phone?900:1100});
 await harness.mount(page,{_scaleExplorer:{ambient:false}},'!!document.querySelector("[data-atlas-ready]")');
 await showScaleExplorerTools(page);await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});return errors;
}
async function frames(page:Page,count=12){await page.evaluate(count=>new Promise<void>(resolve=>{let n=0;function next(){if(++n>=count)resolve();else requestAnimationFrame(next);}requestAnimationFrame(next);}),count);}
async function settle(page:Page){await cv(page).scrollIntoViewIfNeeded();await expect.poll(()=>page.evaluate(async()=>{const c=(window as any).__ecoliCamera,p=c.position.clone(),q=c.quaternion.clone();await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));return Math.max(p.distanceTo(c.position),...q.toArray().map((v:number,i:number)=>Math.abs(v-c.quaternion.toArray()[i])));})).toBeLessThan(1e-8);}
async function fly(page:Page,id:string){await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);await expect(cv(page)).toHaveAttribute('data-atlas-objects',id);await settle(page);}
async function chooseView(page:Page,id:string){const view=views.find((d:any)=>d.id===id),b=study(page).getByRole('button',{name:view.label,exact:true});await b.focus();await b.press('Enter');await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail',id);await expect(b).toHaveAttribute('aria-pressed','true');}
async function shot(page:Page,name:string){await settle(page);await page.locator('.sx-stage').screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:72});}
async function compare(page:Page,a:string,b:string){const box=page.locator('.sx-comparison-workbench');if(await box.getAttribute('open')===null)await box.locator(':scope > summary').click();await box.getByRole('combobox',{name:'First thing',exact:true}).selectOption(a);await box.getByRole('combobox',{name:'Second thing',exact:true}).selectOption(b);await box.getByRole('button',{name:'Compare them',exact:true}).click();await expect(cv(page)).toHaveAttribute('data-atlas-comparison',a+':'+b);await settle(page);}

async function stats(page:Page){return page.evaluate((views)=>{
 const w=window as any,T=w.THREE,scene=w.__ecoliScene,camera=w.__ecoliCamera,renderer=w.__ecoliRenderer;let root:any;
 scene.traverse((n:any)=>{if(n.userData.itemId==='ecoli'&&n.visible)root=n;});if(!root)throw new Error('E. coli model is not visible');
 const g=root.userData.model,d=g.userData.ecoli,geometry:any[]=[],transforms:any[]=[];let finite=true,uniformsFinite=true;
 const finiteValue=(v:any):boolean=>typeof v==='number'?Number.isFinite(v):v?.isVector2||v?.isVector3||v?.isVector4||v?.isQuaternion?v.toArray().every(Number.isFinite):v?.isMatrix3||v?.isMatrix4?v.elements.every(Number.isFinite):Array.isArray(v)||ArrayBuffer.isView(v)?Array.from(v as any).every(x=>typeof x!=='number'||Number.isFinite(x)):true;
 const isVisible=(n:any)=>{for(let p=n;p;p=p.parent)if(!p.visible)return false;return true;};
 g.traverse((n:any)=>{const geo=n.geometry,p=geo?.attributes?.position;if(p){let sum=0,weighted=0;for(let i=0;i<p.array.length;i++){const value=p.array[i];finite=finite&&Number.isFinite(value);sum+=value;weighted+=value*(i%101+1);}geometry.push({name:n.name,uuid:geo.uuid,count:p.count,version:p.version,sum,weighted,indexCount:geo.index?.count||0,material:Array.isArray(n.material)?n.material.map((m:any)=>m.uuid):n.material?.uuid});}for(const m of Array.isArray(n.material)?n.material:n.material?[n.material]:[])for(const u of Object.values(m.uniforms||{}))uniformsFinite=uniformsFinite&&finiteValue((u as any).value);transforms.push({name:n.name,uuid:n.uuid,position:n.position.toArray(),quaternion:n.quaternion.toArray(),scale:n.scale.toArray(),visible:n.visible});});
 const canvasRect=renderer.domElement.getBoundingClientRect(),hud=document.querySelector('.sx-hud')?.getBoundingClientRect(),footer=document.querySelector('.sx-stage-note')?.getBoundingClientRect(),detail=renderer.domElement.dataset.atlasDetail;
 const selected=views.find((v:any)=>v.id===detail),selectedTarget=selected?g.localToWorld(new T.Vector3().fromArray(selected.at)).project(camera).toArray():null;
 const projectedBounds=(box:any)=>{const points:any[]=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=g.localToWorld(new T.Vector3(x,y,z)).project(camera);points.push({x:(p.x+1)*canvasRect.width/2,y:(1-p.y)*canvasRect.height/2,z:p.z});}return{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y)),points};};
 const projectedParts=(nodes:any[],filter:any)=>{const points:any[]=[];for(const node of nodes)node.traverse((n:any)=>{const positions=n.geometry?.attributes?.position;if(positions)for(let i=0;i<positions.count;i++){const p=new T.Vector3().fromBufferAttribute(positions,i);if(!filter||filter(p)){p.applyMatrix4(n.matrixWorld).project(camera);points.push({x:(p.x+1)*canvasRect.width/2,y:(1-p.y)*canvasRect.height/2,z:p.z});}}});return{count:points.length,left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};};
 const motorFrame=projectedParts([d.motors,...d.appendages.children.filter((n:any)=>n.name==='ecoli-flexible-hooks')],(p:any)=>p.x>-.18&&p.x<-.13&&p.y>.16&&p.y<.25);
 const flagellaFrame=projectedParts([d.filaments],null);
 const shells:any={};for(const [id,shell]of Object.entries(d.shells||{}))shells[id]={rear:(shell as any).rear.visible,front:(shell as any).front.visible};
 const measuredBody=d.shells.outer.rear.geometry.boundingBox.clone().union(d.shells.outer.front.geometry.boundingBox).getSize(new T.Vector3()).toArray();
 const comparisonRoots:any={};scene.traverse((n:any)=>{if(n.userData.itemId&&n.visible)comparisonRoots[n.userData.itemId]=n.scale.x;});
 const filaments=Array.from(d.filaments?.children||d.filaments||[]).map((n:any)=>({position:n.position.toArray(),quaternion:n.quaternion.toArray(),visible:n.visible,shaderTime:n.material?.uniforms?.uTime?.value}));
 const featureMap:any={};for(const [id,feature]of Object.entries(d.features||{})){const n:any=feature;if(n?.getWorldPosition){const p=n.getWorldPosition(new T.Vector3()).project(camera);featureMap[id]={visible:isVisible(n),projected:p.toArray()};}else if(Array.isArray(n)&&n.length===3){const p=g.localToWorld(new T.Vector3().fromArray(n)).project(camera);featureMap[id]={projected:p.toArray()};}}
 return{finite,uniformsFinite,geometry,transforms,detail:d.detail,canvasDetail:detail,selectedTarget,cutaway:d.cutaway,comparison:d.comparison,shells,interior:d.interior.visible,cutEdges:d.cutEdges.visible,motorDetail:d.motorDetail.visible,body:d.body.visible,appendages:d.appendages.visible,
 time:d.time?.value??d.time,motion:typeof d.motion==='object'?d.motion.value:d.motion,filaments,featureMap,
 bounds:d.bounds.getSize(new T.Vector3()).toArray(),measuredBody,boundsCenter:d.bounds.getCenter(new T.Vector3()).toArray(),bodyFrame:projectedBounds(d.bounds),motorFrame,flagellaFrame,expectedComparisonBounds:d.bounds.clone().applyMatrix4(g.matrixWorld).getSize(new T.Vector3()).toArray(),comparisonBounds:root.userData.comparisonBodyBounds?.getSize(new T.Vector3()).toArray(),
 extent:g.userData.extent,dimension:g.userData.dimension,measureCenter:g.userData.measureCenter,scale:g.scale.toArray(),modelPosition:g.position.toArray(),worldScale:root.scale.x,ruler:root.userData.ruler.visible,comparisonRoots,
 framing:{canvasHeight:canvasRect.height,canvasWidth:canvasRect.width,hudBottom:hud?hud.bottom-canvasRect.top:null,footerTop:footer?footer.top-canvasRect.top:null},
 camera:{type:camera.type,position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),near:camera.near,far:camera.far,fov:camera.fov},
 programs:renderer.info.programs.map((p:any)=>({runnable:p.diagnostics?.runnable!==false})),glError:renderer.getContext().getError()};
},views);}

function checkView(state:any,whole:any){
 expect(state.finite).toBe(true);expect(state.uniformsFinite).toBe(true);expect(state.comparison).toBe(false);expect(state.geometry).toEqual(whole.geometry);expect(state.bounds).toEqual([1,.4,.4]);expect(state.boundsCenter).toEqual([0,0,0]);expect(state.scale).toEqual([1,1,1]);expect(state.extent).toBe(1);expect(state.measureCenter).toBe(0);expect(state.dimension).toBe('x');
 for(let i=0;i<3;i++)expect(state.measuredBody[i]).toBeCloseTo([1,.4,.4][i],6);
 expect(state.body).toBe(true);expect(state.interior).toBe(state.cutaway);expect(state.cutEdges).toBe(state.cutaway);expect(state.motion===false||state.motion===0).toBe(true);
 for(const shell of Object.values(state.shells)){expect((shell as any).rear).toBe(true);expect((shell as any).front).toBe(!state.cutaway);}
 expect(state.programs.every((p:any)=>p.runnable)).toBe(true);expect(state.glError).toBe(0);expect([...state.camera.position,state.camera.near,state.camera.far].every(Number.isFinite)).toBe(true);expect(state.camera.near).toBeGreaterThan(0);
 if(state.selectedTarget){expect(Math.abs(state.selectedTarget[0])).toBeLessThan(.1);expect(Math.abs(state.selectedTarget[1])).toBeLessThan(.3);expect(state.selectedTarget[2]).toBeGreaterThan(-1);expect(state.selectedTarget[2]).toBeLessThan(1);}
 if(!state.detail||state.detail==='ecoli-overview'){expect(state.bodyFrame.left).toBeGreaterThanOrEqual(8);expect(state.bodyFrame.right).toBeLessThanOrEqual(state.framing.canvasWidth-8);expect(state.bodyFrame.top).toBeGreaterThanOrEqual(state.framing.hudBottom+8);expect(state.bodyFrame.bottom).toBeLessThanOrEqual(state.framing.footerTop-8);}
 if(state.detail==='ecoli-motor'){expect(state.motorFrame.count).toBeGreaterThan(100);expect(state.motorFrame.top).toBeGreaterThanOrEqual(state.framing.hudBottom+8);expect(state.motorFrame.bottom).toBeLessThanOrEqual(state.framing.footerTop-8);expect(state.motorFrame.left).toBeGreaterThanOrEqual(8);expect(state.motorFrame.right).toBeLessThanOrEqual(state.framing.canvasWidth-8);}
 if(state.detail==='flagella'){expect(state.flagellaFrame.count).toBeGreaterThan(100);for(const frame of [state.flagellaFrame,state.bodyFrame]){expect(frame.top).toBeGreaterThanOrEqual(state.framing.hudBottom+8);expect(frame.bottom).toBeLessThanOrEqual(state.framing.footerTop-8);expect(frame.left).toBeGreaterThanOrEqual(8);expect(frame.right).toBeLessThanOrEqual(state.framing.canvasWidth-8);}}
}
async function disposal(page:Page){await page.evaluate(()=>{const w=window as any,resources=new Set<any>();w.__ecoliScene.traverse((n:any)=>{if(n.userData.itemId==='ecoli')for(const r of n.userData.resources||[])resources.add(r);});w.__ecoliDisposal={resources:resources.size,disposed:0};for(const resource of resources)resource.addEventListener('dispose',()=>w.__ecoliDisposal.disposed++);});await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);const result=await page.evaluate(()=>(window as any).__ecoliDisposal);expect(result.resources).toBeGreaterThan(10);expect(result.disposed).toBe(result.resources);return result;}

for(const phone of [false,true])test((phone?'phone':'desktop')+' E. coli anatomy, stable physical geometry, saved sections and comparison',async({page})=>{
 const prefix=phone?'phone':'desktop',errors=await mount(page,phone);await fly(page,'ecoli');await expect(study(page)).toBeVisible();
 await expect(study(page).locator('.sx-ecoli-key > span')).toHaveText(['Outer membrane','Peptidoglycan','Inner membrane','Chromosome','Ribosomes']);await study(page).screenshot({path:path.join(out,prefix+'-controls.jpg'),type:'jpeg',quality:72});
 const whole=await stats(page),details:any[]=[];save(prefix+'-initial',{whole});checkView(whole,whole);await shot(page,prefix+'-initial');
 for(const view of views){
  const b=study(page).getByRole('button',{name:view.label,exact:true});await expect(b).toBeVisible();const rect=await b.boundingBox();expect(rect!.height).toBeGreaterThanOrEqual(44);if(phone){expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.x+rect!.width).toBeLessThanOrEqual(360);}
  await chooseView(page,view.id);const state=await stats(page);details.push(state);save(prefix+'-progress',{details});await shot(page,prefix+'-'+view.id);checkView(state,whole);expect(state.detail).toBe(view.id);if(typeof view.cutaway==='boolean')expect(state.cutaway).toBe(view.cutaway);
 }
 await chooseView(page,'ecoli-overview');const toggled:any[]=[];for(const open of [true,false,true,false]){const state=await stats(page);if(state.cutaway!==open){await study(page).getByRole('button',{name:open?'Open cell cutaway':'Close cell cutaway',exact:true}).click();await settle(page);}const after=await stats(page);checkView(after,whole);expect(after.cutaway).toBe(open);expect(after.detail).toBe('ecoli-overview');toggled.push(after);}await shot(page,prefix+'-cutaway-closed');await study(page).getByRole('button',{name:'Open cell cutaway',exact:true}).click();await settle(page);await shot(page,prefix+'-cutaway-open');
 await chooseView(page,'nucleoid');const still=await stats(page);await frames(page);const later=await stats(page);expect(later.time).toBe(still.time);expect(later.transforms).toEqual(still.transforms);
 const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('The chromosome occupies the cell interior without a nucleus.');await book.getByRole('button',{name:'Save observation',exact:true}).click();const savedNucleoid=await stats(page);
 await chooseView(page,'cell-envelope');await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('The outer envelope encloses the same two micrometre body.');await book.getByRole('button',{name:'Save observation',exact:true}).click();const savedEnvelope=await stats(page);
 await fly(page,'paramecium');
 const restored:any[]=[];for(const [id,saved]of [['nucleoid',savedNucleoid],['cell-envelope',savedEnvelope]]as const){await book.locator('[data-observation="ecoli:'+id+'"]').getByRole('button',{name:/^Return to/}).click();await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail',id);const state=await stats(page);checkView(state,whole);expect(state.cutaway).toBe(saved.cutaway);for(let i=0;i<3;i++)expect(state.camera.position[i]).toBeCloseTo(saved.camera.position[i],7);restored.push(state);await shot(page,prefix+'-restored-'+id);}
 const visits:any[]=[];for(const [id,destination]of [['nucleoid','dna'],['ribosomes','ribosome']]){await chooseView(page,id);const origin=await stats(page);await page.getByRole('region',{name:'Continue the journey',exact:true}).getByRole('button').click();await expect(cv(page)).toHaveAttribute('data-atlas-objects',destination);await settle(page);await page.getByRole('navigation',{name:'Your exploration route',exact:true}).getByRole('button',{name:/^Return to/}).last().click();await expect(cv(page)).toHaveAttribute('data-atlas-objects','ecoli');await settle(page);const returned=await stats(page);expect(returned.detail).toBe(id);expect(returned.cutaway).toBe(origin.cutaway);for(let i=0;i<3;i++)expect(returned.camera.position[i]).toBeCloseTo(origin.camera.position[i],7);visits.push({id,destination,origin,returned});}
 await compare(page,'ecoli','ribosome');const compared=await stats(page);expect(compared.comparison).toBe(true);expect(compared.cutaway).toBe(false);expect(compared.interior).toBe(false);expect(compared.scale).toEqual([1,1,1]);expect(compared.geometry).toEqual(whole.geometry);expect(compared.worldScale/compared.comparisonRoots.ribosome).toBeCloseTo(80,8);expect(compared.comparisonBounds).toBeDefined();for(let i=0;i<3;i++)expect(compared.comparisonBounds[i]).toBeCloseTo(compared.expectedComparisonBounds[i],6);expect(compared.glError).toBe(0);await shot(page,prefix+'-comparison');
 await fly(page,'ecoli');await chooseView(page,'ecoli-overview');const returned=await stats(page);checkView(returned,whole);const pixels=await harness.glPixels(page);expect(pixels).not.toBeNull();expect(looksBlank(pixels!)).toBe(false);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);expect(errors).toEqual([]);const disposed=await disposal(page);save(prefix+'-geometry',{whole,details,toggled,still,later,savedNucleoid,savedEnvelope,restored,visits,compared,returned,disposed});
});

test('ordinary animation moves flagella, pauses in place and keeps cell dimensions fixed',async({page})=>{
 const errors=await mount(page,false,true);await fly(page,'ecoli');await chooseView(page,'flagella');const before=await stats(page);
 await page.getByRole('button',{name:'Resume ambience',exact:true}).click();await frames(page,30);const moving=await stats(page),movingPixels=await harness.glPixels(page);await frames(page,20);const movingLater=await stats(page),laterPixels=await harness.glPixels(page);
 expect(movingLater.time).toBeGreaterThan(moving.time);expect(movingLater.geometry).toEqual(before.geometry);expect(movingLater.bounds).toEqual(before.bounds);expect(movingLater.filaments).not.toEqual(moving.filaments);expect(createHash('sha256').update(movingPixels!.png).digest('hex')).not.toBe(createHash('sha256').update(laterPixels!.png).digest('hex'));expect(movingLater.filaments.every((f:any)=>f.shaderTime===movingLater.time)).toBe(true);
 await page.getByRole('button',{name:'Pause ambience',exact:true}).click();await frames(page,3);const paused=await stats(page);await frames(page,20);const pausedLater=await stats(page);expect(pausedLater.time).toBe(paused.time);expect(pausedLater.filaments).toEqual(paused.filaments);expect(pausedLater.geometry).toEqual(before.geometry);await shot(page,'ordinary-motion-paused');expect(errors).toEqual([]);const disposed=await disposal(page);save('motion',{before,moving,movingLater,paused,pausedLater,disposed});
});
