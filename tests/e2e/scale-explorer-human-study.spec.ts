import {test,expect,type Page,type Locator} from '@playwright/test';
import {GlHarness,looksBlank} from './helpers/stem_gl_harness';
import {showScaleExplorerTools} from './helpers/scale_explorer_workspace';
import {mkdirSync,readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';

test.describe.configure({mode:'serial',retries:0,timeout:420000});
test.use({video:'off',trace:'off',hasTouch:true});
const out=path.resolve(process.env.SCALE_HUMAN_STUDY_REPORT_DIR||'reports/scale-explorer-human-study');
const cv=(page:Page)=>page.locator('[data-atlas-ready]');
const study=(page:Page)=>page.getByRole('region',{name:'Human stature study',exact:true});
const ids=['human-whole','human-head','human-shoulders','human-hand','human-knee','human-foot'];
const labels=['Whole figure','Head','Shoulders','Hand','Knee','Foot'];
const assetPattern='**/anatomy/body-surface/makehuman-body-surface.glb';
const source=readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8'),sourceSha256=createHash('sha256').update(source).digest('hex');
const sandbox:any={window:{StemLab:{registerTool(){}}},console:{log(){}}};
const marker="  window.StemLab.registerTool('scaleExplorer', {";
vm.runInNewContext(source.replace(marker,'  window.humanStudyTests={point:humanStudyPoint};\n'+marker),sandbox);
const api=sandbox.window.humanStudyTests;
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js'],probes:`
const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;window.__humanRenderer=r;r.render=function(scene,camera){if(!r.getRenderTarget()){window.__humanScene=scene;window.__humanCamera=camera;}return render.apply(this,arguments);};return r;}});
window.__humanDisposed={};window.__humanAssets=[];
[THREE.BufferGeometry,THREE.Material,THREE.Texture].forEach(function(Type){const dispose=Type.prototype.dispose;Type.prototype.dispose=function(){window.__humanDisposed[this.uuid]=(window.__humanDisposed[this.uuid]||0)+1;return dispose.apply(this,arguments);};});
const load=THREE.GLTFLoader.prototype.load;THREE.GLTFLoader.prototype.load=function(url,onLoad,onProgress,onError){return load.call(this,url,function(asset){const resources=new Set();asset.scene.traverse(function(n){if(n.geometry)resources.add(n.geometry);if(n.material)(Array.isArray(n.material)?n.material:[n.material]).forEach(function(m){resources.add(m);Object.values(m).forEach(function(v){if(v&&v.isTexture)resources.add(v);});});});const info={url,resources:Array.from(resources).map(function(r){return r.uuid;}),completed:false};window.__humanAssets.push(info);onLoad(asset);info.completed=true;},onProgress,onError);};
`});
test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
test.afterAll(async()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));
function save(name:string,value:any){writeFileSync(path.join(out,name+'.json'),JSON.stringify({sourceSha256,...value},null,2));}

async function mount(page:Page,phone=false,tag='desktop'){
 const diagnostic=path.join(out,tag+'-diagnostics.txt');writeFileSync(diagnostic,'Mount '+new Date().toISOString()+'\n');
 const errors:string[]=[];page.on('pageerror',e=>{errors.push(e.message);appendFileSync(diagnostic,'pageerror: '+e.message+'\n');});page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='error'||m.type()==='warning')appendFileSync(diagnostic,m.type()+': '+m.text()+'\n');});
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;(HTMLCanvasElement.prototype as any).getContext=function(type:string,...args:any[]){return type==='webgl2'?null:original.apply(this,[type,...args] as any);};});
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:phone?360:1400,height:phone?900:1100});
 await harness.mount(page,{_scaleExplorer:{ambient:false,yourHeightCm:phone?220:170}},'!!document.querySelector("[data-atlas-ready]")');await showScaleExplorerTools(page);
 await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});return errors;
}
async function settle(page:Page){await cv(page).scrollIntoViewIfNeeded();await expect.poll(()=>page.evaluate(async()=>{const c=(window as any).__humanCamera,p=c.position.clone();await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));return p.distanceTo(c.position);})).toBeLessThan(.000001);}
async function fly(page:Page,id:string){await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);await expect(cv(page)).toHaveAttribute('data-atlas-objects',id);await settle(page);}
async function shot(page:Page,name:string){await settle(page);await page.locator('.sx-stage').screenshot({path:path.join(out,name+'.png')});}
async function ready(page:Page){await expect.poll(async()=>(await stats(page)).status,{timeout:45000}).toBe('ready');await settle(page);}
async function stats(page:Page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,scene=w.__humanScene;let root:any,door:any;
 scene.traverse((n:any)=>{if(n.userData.itemId==='human'&&n.visible)root=n;if(n.userData.itemId==='door'&&n.visible)door=n;});
 const g=root.userData.model,d=g.userData.humanStudy,geometry:any[]=[];let finite=true,vertices=0;g.updateMatrixWorld(true);const inverse=new T.Matrix4().copy(g.matrixWorld).invert(),bounds=new T.Box3();
 d.body.traverse((n:any)=>{const geo=n.geometry,p=geo?.attributes?.position;if(!p)return;let sum=0,weighted=0;const matrix=new T.Matrix4().multiplyMatrices(inverse,n.matrixWorld),v=new T.Vector3();
  for(let i=0;i<p.array.length;i++){const value=p.array[i];finite=finite&&Number.isFinite(value);sum+=value;weighted+=value*(i%101+1);}for(let i=0;i<p.count;i++)bounds.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(matrix));vertices+=p.count;
  geometry.push({name:n.name,uuid:geo.uuid,count:p.count,indexCount:geo.index?.count||0,version:p.version,sum,weighted,position:n.position.toArray(),quaternion:n.quaternion.toArray(),scale:n.scale.toArray()});
 });
 const input=document.querySelector('input[aria-label="Your height in centimetres"]') as HTMLInputElement|null;
 const tickAttribute=d.ticks.geometry.attributes.position,tickValues=[];for(let i=0;i<d.ticks.geometry.drawRange.count;i+=2)tickValues.push(tickAttribute.getY(i));
 return{finite,vertices,geometry,status:d.status,body:d.body.visible,context:d.context.visible,contextId:d.context.uuid,guide:d.guide.visible,heightGuide:d.heightGuide.visible,tickValues,selectedGuideY:d.guide.position.y,state:{...d.state},dimensions:{...d.dimensions},bounds:d.bounds.getSize(new T.Vector3()).toArray(),boundsCenter:d.bounds.getCenter(new T.Vector3()).toArray(),renderedBounds:{min:bounds.min.toArray(),max:bounds.max.toArray(),size:bounds.getSize(new T.Vector3()).toArray()},expectedBounds:d.bounds.clone().applyMatrix4(g.matrixWorld).getSize(new T.Vector3()).toArray(),comparisonBounds:root.userData.comparisonBodyBounds?.getSize(new T.Vector3()).toArray(),scale:g.scale.toArray(),worldScale:root.scale.x,doorScale:door?.scale.x,measurementAxis:root.userData.measureAxis,measurementCenter:g.userData.measureCenter,ruler:root.userData.ruler.visible,yourCm:w.__toolData._scaleExplorer.yourHeightCm,input:input?.value||input?.placeholder,camera:{position:w.__humanCamera.position.toArray(),near:w.__humanCamera.near,far:w.__humanCamera.far},programs:w.__humanRenderer.info.programs.map((p:any)=>({runnable:p.diagnostics?.runnable!==false})),assetDisposal:w.__humanAssets.map((a:any)=>({...a,counts:a.resources.map((id:string)=>w.__humanDisposed[id]||0)}))};
 });}
function check(state:any,baseline:any,heightM=1.7){
 expect(state.finite).toBe(true);expect(state.body).toBe(true);expect(state.vertices).toBeGreaterThan(0);expect(state.geometry).toEqual(baseline.geometry);expect(state.bounds).toEqual(baseline.bounds);expect(state.boundsCenter).toEqual(baseline.boundsCenter);expect(state.scale).toEqual(baseline.scale);
 expect(state.renderedBounds.min[1]).toBeCloseTo(-.5,6);expect(state.renderedBounds.max[1]).toBeCloseTo(.5,6);expect(state.renderedBounds.size[1]).toBeCloseTo(1,6);
 expect(state.state.heightM).toBeCloseTo(heightM,10);expect(state.state.fraction).toBeGreaterThanOrEqual(0);expect(state.state.fraction).toBeLessThanOrEqual(1);expect(state.state.selectedY).toBeCloseTo(state.state.fraction-.5,10);
 expect(state.selectedGuideY).toBeCloseTo(state.state.fraction-.5,10);expect(state.state.selectedHeightM).toBeCloseTo(state.state.fraction*heightM,10);expect(state.tickValues.length).toBe(Math.floor(heightM*100+.000001)+1);state.tickValues.forEach((y:number,i:number)=>expect((y+.5)*heightM).toBeCloseTo(i/100,6));
 expect(state.programs.every((p:any)=>p.runnable)).toBe(true);expect([...state.camera.position,state.camera.near,state.camera.far].every(Number.isFinite)).toBe(true);expect(state.camera.near).toBeGreaterThan(0);expect(state.camera.far).toBeGreaterThan(state.camera.near);
}
async function sample(page:Page,percent:number){const slider=page.getByRole('slider',{name:'Height above the ground',exact:true});await slider.focus();if(percent===0){await slider.press('End');await slider.press('Home');}else{await slider.press('Home');if(percent===100)await slider.press('End');else for(let i=0;i<percent;i++)await slider.press('ArrowRight');}await expect(slider).toHaveValue(String(percent));await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail','human-height-'+percent);const state=await stats(page);expect(state.state.fraction).toBeCloseTo(percent/100,10);return state;}
async function setHeight(page:Page,cm:number){await page.getByRole('spinbutton',{name:'Your height in centimetres',exact:true}).fill(String(cm));await page.getByRole('button',{name:'Use my height',exact:true}).click();await settle(page);await expect.poll(()=>page.evaluate(()=>(window as any).__toolData._scaleExplorer.yourHeightCm)).toBe(cm);}
async function compare(page:Page){const box=page.locator('.sx-comparison-workbench');if(await box.getAttribute('open')===null)await box.locator(':scope > summary').click();await box.getByRole('combobox',{name:'First thing',exact:true}).selectOption('human');await box.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('door');await box.getByRole('button',{name:'Compare them',exact:true}).click();await expect(cv(page)).toHaveAttribute('data-atlas-comparison','human:door');await settle(page);}
async function disposal(page:Page){
 const ids=await page.evaluate(()=>{const w=window as any,resources=new Set<any>();w.__humanScene.traverse((n:any)=>{if(n.userData.itemId==='human')for(const r of n.userData.resources||[])resources.add(r);});return [...resources].map((r:any)=>r.uuid);});
 await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);const counts=await page.evaluate(ids=>ids.map(id=>(window as any).__humanDisposed[id]||0),ids);expect(ids.length).toBeGreaterThan(0);expect(counts).toEqual(ids.map(()=>1));return{resources:ids.length,disposed:counts.filter(c=>c===1).length};
}

test('Human stature study retains its guides after the detailed surface arrives and uses fixed body dimensions',async({page})=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);let requested=false;
 await page.route(assetPattern,async route=>{requested=true;await gate;await route.continue();});
 const errors=await mount(page);await fly(page,'human');await expect(study(page)).toBeVisible();await expect.poll(()=>requested).toBe(true);
 const fallback=await stats(page);expect(['loading','fallback']).toContain(fallback.status);expect(fallback.context).toBe(true);check(fallback,fallback);
 release();await ready(page);const whole=await stats(page);expect(whole.contextId).toBe(fallback.contextId);expect(whole.context).toBe(true);expect(whole.vertices).toBeGreaterThan(10000);check(whole,whole);expect(whole.assetDisposal.length).toBeGreaterThan(0);expect(whole.assetDisposal.every((a:any)=>a.completed&&a.counts.every((n:number)=>n===1))).toBe(true);await shot(page,'human-whole');
 const views:any[]=[];for(let i=0;i<ids.length;i++){const button=study(page).getByRole('button',{name:labels[i],exact:true});await button.click();await settle(page);await expect(button).toHaveAttribute('aria-pressed','true');await expect(cv(page)).toHaveAttribute('data-atlas-detail',ids[i]);await expect(cv(page)).toHaveAttribute('data-atlas-zoom',api.point(ids[i]).zoom.toFixed(2));const state=await stats(page);check(state,whole);views.push({id:ids[i],...state});await shot(page,ids[i]);}
 const slider=page.getByRole('slider',{name:'Height above the ground',exact:true});await expect(slider).toHaveAttribute('min','0');await expect(slider).toHaveAttribute('max','100');await expect(slider).toHaveAttribute('step','1');const samples:any[]=[];for(const percent of [0,50,100]){const state=await sample(page,percent);check(state,whole);samples.push({percent,...state});}
 const measurement=page.getByRole('button',{name:'Measurement',exact:true});await measurement.click();await settle(page);await expect(measurement).toHaveAttribute('aria-pressed','false');const hidden=await stats(page);check(hidden,whole);expect(hidden.context).toBe(true);expect(hidden.heightGuide).toBe(false);expect(hidden.guide).toBe(false);expect(await page.evaluate(()=>{const w=window as any;return w.__humanScene.getObjectByName('human-studio-floor').visible;})).toBe(true);await measurement.click();await settle(page);const shown=await stats(page);expect(shown.heightGuide).toBe(true);expect(shown.guide).toBe(true);
 await compare(page);const compared=await stats(page);check(compared,whole);expect(compared.context).toBe(false);expect(compared.worldScale/compared.doorScale).toBeCloseTo(1.7/2,10);expect(compared.comparisonBounds).toBeDefined();for(let i=0;i<3;i++)expect(compared.comparisonBounds[i]).toBeCloseTo(compared.expectedBounds[i],6);await shot(page,'human-door-comparison');
 await fly(page,'human');const returned=await stats(page);check(returned,whole);expect(returned.context).toBe(true);const pixels=await harness.glPixels(page);expect(pixels).not.toBeNull();expect(looksBlank(pixels!)).toBe(false);expect(errors).toEqual([]);const disposed=await disposal(page);save('geometry',{fallback,whole,views,samples,compared,returned,disposal:disposed});
});

test('Human stature phone study respects personal height and restores it with a saved measurement',async({page})=>{
 const errors=await mount(page,true,'phone');await fly(page,'human');await ready(page);const whole=await stats(page);check(whole,whole,2.2);expect(whole.input).toBe('220');const views:any[]=[];
 for(let i=0;i<ids.length;i++){const button=study(page).getByRole('button',{name:labels[i],exact:true}),box=await button.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(360);expect(box!.height).toBeGreaterThanOrEqual(44);await button.focus();await button.press('Enter');await settle(page);await expect(button).toHaveAttribute('aria-pressed','true');await expect(cv(page)).toHaveAttribute('data-atlas-detail',ids[i]);const state=await stats(page);check(state,whole,2.2);views.push({id:ids[i],...state});await shot(page,ids[i]+'-phone');}
 const middle=await sample(page,50);check(middle,whole,2.2);expect(await study(page).innerText()).toMatch(/110[.,]0\s*cm/);await study(page).screenshot({path:path.join(out,'human-phone-controls.png')});
 const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('Halfway up a 2.2 metre figure is 1.1 metres above the ground.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
 await setHeight(page,170);const shorter=await stats(page);expect(shorter.state.heightM).toBe(1.7);await fly(page,'sun');await book.locator('[data-observation="human:human-height-50"]').getByRole('button',{name:/^Return to/}).click();await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-objects','human');await expect(cv(page)).toHaveAttribute('data-atlas-detail','human-height-50');await expect(page.getByRole('slider',{name:'Height above the ground',exact:true})).toHaveValue('50');const restored=await stats(page);check(restored,whole,2.2);expect(restored.yourCm).toBe(220);expect(restored.input).toBe('220');for(let i=0;i<3;i++)expect(restored.camera.position[i]).toBeCloseTo(middle.camera.position[i],8);await shot(page,'human-phone-restored');
 await compare(page);const compared=await stats(page);check(compared,whole,2.2);expect(compared.context).toBe(false);expect(compared.worldScale/compared.doorScale).toBeCloseTo(2.2/2,10);await fly(page,'human');expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);expect(errors).toEqual([]);const disposed=await disposal(page);save('phone-geometry',{whole,views,middle,shorter,restored,compared,disposal:disposed});
});

test('Human surface asset failure keeps the study usable and late arrivals release their resources',async({page})=>{
 await page.route(assetPattern,route=>route.fulfill({status:404,contentType:'text/plain',body:'Expected unavailable human surface for fallback test'}));
 const errors=await mount(page,false,'fallback');await fly(page,'human');await expect.poll(async()=>(await stats(page)).status).toBe('failed');await expect(study(page).getByText('Detailed surface unavailable. A simplified figure remains interactive.',{exact:true})).toBeVisible();const fallback=await stats(page);check(fallback,fallback);expect(fallback.context).toBe(true);
 await study(page).getByRole('button',{name:'Head',exact:true}).click();await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail','human-head');const head=await stats(page);check(head,fallback);const middle=await sample(page,50);check(middle,fallback);await shot(page,'human-fallback');expect(errors.filter(e=>!/404 \(Not Found\)|Failed to load resource/i.test(e))).toEqual([]);const disposed=await disposal(page);
 await page.unroute(assetPattern);let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);let requested=false;await page.route(assetPattern,async route=>{requested=true;await gate;await route.continue();});
 await harness.mount(page,{_scaleExplorer:{ambient:false,yourHeightCm:170}},'!!document.querySelector("[data-atlas-ready]")');await expect.poll(()=>requested).toBe(true);await harness.unmount(page);release();
 await expect.poll(()=>page.evaluate(()=>(window as any).__humanAssets.some((a:any)=>a.completed)),{timeout:45000}).toBe(true);
 const late=await page.evaluate(()=>{const w=window as any;return w.__humanAssets.map((a:any)=>({...a,counts:a.resources.map((id:string)=>w.__humanDisposed[id]||0)}));});expect(late.length).toBeGreaterThan(0);expect(late.every((a:any)=>a.completed&&a.counts.length>0&&a.counts.every((n:number)=>n===1))).toBe(true);expect(await harness.leakedAfterUnmount(page)).toEqual([]);save('fallback-geometry',{fallback,head,middle,disposal:disposed,late});
});
