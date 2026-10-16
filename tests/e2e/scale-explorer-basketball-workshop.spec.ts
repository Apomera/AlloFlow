import {test,expect,type Page} from '@playwright/test';
import {GlHarness,looksBlank} from './helpers/stem_gl_harness';
import {showScaleExplorerTools} from './helpers/scale_explorer_workspace';
import {mkdirSync,readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';

test.describe.configure({mode:'serial',retries:0,timeout:420000});
test.use({video:'off',trace:'off',hasTouch:true});
const out=path.resolve(process.env.SCALE_BASKETBALL_WORKSHOP_REPORT_DIR||'reports/scale-explorer-basketball-workshop');
const cv=(page:Page)=>page.locator('[data-atlas-ready]');
const study=(page:Page)=>page.getByRole('region',{name:'Basketball workshop',exact:true});
const ids=['basketball-whole','basketball-cover','basketball-channel','basketball-valve','basketball-inside','basketball-windings'];
const labels=['Whole ball','Pebbled cover','Panel channels','Inflation valve','Inside the ball','Thread windings'];
const source=readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8'),sourceSha256=createHash('sha256').update(source).digest('hex');
const sandbox:any={window:{StemLab:{registerTool(){}}},console:{log(){}}};
const marker="  window.StemLab.registerTool('scaleExplorer', {";
vm.runInNewContext(source.replace(marker,'  window.basketballTests={point:basketballStudyPoint,items:ITEMS};\n'+marker),sandbox);
const api=sandbox.window.basketballTests;
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],probes:`
const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;window.__basketballRenderer=r;r.render=function(scene,camera){if(!r.getRenderTarget()){window.__basketballScene=scene;window.__basketballCamera=camera;}return render.apply(this,arguments);};return r;}});
window.__basketballDisposed={};[THREE.BufferGeometry,THREE.Material,THREE.Texture].forEach(function(Type){const dispose=Type.prototype.dispose;Type.prototype.dispose=function(){window.__basketballDisposed[this.uuid]=(window.__basketballDisposed[this.uuid]||0)+1;return dispose.apply(this,arguments);};});
`});

test.beforeAll(async()=>{mkdirSync(out,{recursive:true});save('tested-source',{started:new Date().toISOString()});await harness.start();});
test.afterAll(async()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));
function save(name:string,value:any){writeFileSync(path.join(out,name+'.json'),JSON.stringify({sourceSha256,...value},null,2));}
async function mount(page:Page,phone=false){
 const diagnostic=path.join(out,(phone?'phone':'desktop')+'-diagnostics.txt');writeFileSync(diagnostic,'Mount '+new Date().toISOString()+'\n');
 const errors:string[]=[];page.on('pageerror',e=>{errors.push(e.message);appendFileSync(diagnostic,'pageerror: '+e.message+'\n');});page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='error'||m.type()==='warning')appendFileSync(diagnostic,m.type()+': '+m.text()+'\n');});
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;(HTMLCanvasElement.prototype as any).getContext=function(type:string,...args:any[]){return type==='webgl2'?null:original.apply(this,[type,...args] as any);};});
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:phone?360:1400,height:phone?900:1100});
 await harness.mount(page,{_scaleExplorer:{ambient:false}},'!!document.querySelector("[data-atlas-ready]")');await showScaleExplorerTools(page);
 await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});return errors;
}
async function settle(page:Page){await cv(page).scrollIntoViewIfNeeded();await expect.poll(()=>page.evaluate(async()=>{const c=(window as any).__basketballCamera,p=c.position.clone();await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));return p.distanceTo(c.position);})).toBeLessThan(.000001);}
async function fly(page:Page,id:string){await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);await expect(cv(page)).toHaveAttribute('data-atlas-objects',id);await settle(page);}
async function shot(page:Page,name:string){await settle(page);await page.locator('.sx-stage').screenshot({path:path.join(out,name+'.png')});}
async function stats(page:Page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,scene=w.__basketballScene;let root:any,other:any;
 scene.traverse((n:any)=>{if(n.userData.itemId==='basketball'&&n.visible)root=n;if(n.userData.itemId==='human'&&n.visible)other=n;});
 const g=root.userData.model,d=g.userData.basketball,geometry:any[]=[];let finite=true,maxBodyRadius=0;g.updateMatrixWorld(true);
 d.body.traverse((n:any)=>{const geo=n.geometry,p=geo?.attributes?.position;if(!p)return;let sum=0,weighted=0;
  for(let i=0;i<p.array.length;i++){const value=p.array[i];finite=finite&&Number.isFinite(value);sum+=value;weighted+=value*(i%101+1);}
  for(let i=0;i<p.count;i++)maxBodyRadius=Math.max(maxBodyRadius,Math.hypot(p.getX(i),p.getY(i),p.getZ(i)));
  geometry.push({name:n.name,uuid:geo.uuid,count:p.count,indexCount:geo.index?.count||0,version:p.version,sum,weighted,position:n.position.toArray(),quaternion:n.quaternion.toArray(),scale:n.scale.toArray()});
 });
 const shellGeometry=(object:any)=>{const p=object.geometry.attributes.position;let minRadius=Infinity,maxRadius=0,weighted=0;for(let i=0;i<p.count;i++){const r=Math.hypot(p.getX(i)*object.scale.x,p.getY(i)*object.scale.y,p.getZ(i)*object.scale.z);minRadius=Math.min(minRadius,r);maxRadius=Math.max(maxRadius,r);weighted+=(i%101+1)*(p.getX(i)+p.getY(i)*3+p.getZ(i)*7);}return{uuid:object.geometry.uuid,count:p.count,version:p.version,minRadius,maxRadius,weighted,scale:object.scale.toArray()};};
 const capGeometry=(object:any)=>{const value=shellGeometry(object),geometry=object.geometry,index=geometry.index;let finite=true,maxIndex=0;for(const attribute of [geometry.attributes.position,geometry.attributes.normal])for(const value of attribute.array)finite=finite&&Number.isFinite(value);for(const value of index.array)maxIndex=Math.max(maxIndex,value);return{...value,finite,indexCount:index.count,maxIndex};};
 const layers=d.layers.map((layer:any)=>({id:layer.id,outerRadius:layer.outerRadius,innerRadius:layer.innerRadius,angle:layer.angle.value,maxAngle:layer.maxAngle,outerGeometry:shellGeometry(layer.outer),innerGeometry:shellGeometry(layer.inner),outerVisible:layer.outer.visible,innerVisible:layer.inner.visible,caps:layer.caps.map((cap:any)=>({geometry:capGeometry(cap),visible:cap.visible,position:cap.position.toArray(),rotation:cap.rotation.toArray().slice(0,3),scale:cap.scale.toArray()}))}));
 return{finite,geometry,maxBodyRadius,body:d.body.visible,layerGroupVisible:d.layerGroup.visible,cavityVisible:d.cavity.visible&&d.layerGroup.visible,cavityBackSide:d.cavity.material.side===T.BackSide,resourceCount:root.userData.resources.length,state:{...d.state},layers,dimensions:d.dimensions,bounds:d.bounds.getSize(new T.Vector3()).toArray(),boundsCenter:d.bounds.getCenter(new T.Vector3()).toArray(),expectedBounds:new T.Vector3(1,1,1).multiplyScalar(g.matrixWorld.getMaxScaleOnAxis()).toArray(),comparisonBounds:root.userData.comparisonBodyBounds?.getSize(new T.Vector3()).toArray(),scale:g.scale.toArray(),worldScale:root.scale.x,otherScale:other?.scale.x,measurementAxis:root.userData.measureAxis,measurementCenter:g.userData.measureCenter,ruler:root.userData.ruler.visible,camera:{position:w.__basketballCamera.position.toArray(),near:w.__basketballCamera.near,far:w.__basketballCamera.far},programs:w.__basketballRenderer.info.programs.map((p:any)=>({runnable:p.diagnostics?.runnable!==false})),webglType:w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()).type};
 });}
function check(state:any,baseline:any){
 expect(state.finite).toBe(true);expect(state.body).toBe(true);expect(state.geometry.length).toBeGreaterThan(0);expect(state.geometry).toEqual(baseline.geometry);expect(state.bounds).toEqual(baseline.bounds);expect(state.boundsCenter).toEqual(baseline.boundsCenter);expect(state.scale).toEqual(baseline.scale);
 expect(state.maxBodyRadius).toBeCloseTo(.5,6);for(const extent of state.bounds){expect(extent).toBeGreaterThan(.98);expect(extent).toBeLessThanOrEqual(1.000001);}for(const center of state.boundsCenter)expect(Math.abs(center)).toBeLessThan(.0001);expect(state.measurementCenter).toBe(0);
 expect(state.state.opening).toBeGreaterThanOrEqual(0);expect(state.state.opening).toBeLessThanOrEqual(100);expect(Number.isInteger(state.state.opening)).toBe(true);expect(state.state.fraction).toBeCloseTo(state.state.opening/100,12);
 expect(state.layerGroupVisible).toBe(state.state.opening>0);expect(state.cavityVisible).toBe(state.state.opening>0);expect(state.cavityBackSide).toBe(true);expect(state.resourceCount).toBe(baseline.resourceCount);
 expect(state.layers.length).toBeGreaterThanOrEqual(3);for(let i=0;i<state.layers.length;i++){const layer=state.layers[i];expect(layer.outerRadius).toBe(baseline.layers[i].outerRadius);expect(layer.innerRadius).toBe(baseline.layers[i].innerRadius);expect(layer.outerRadius).toBeLessThanOrEqual(.5);expect(layer.innerRadius).toBeLessThan(layer.outerRadius);expect(layer.innerRadius).toBeGreaterThan(0);expect(layer.outerGeometry).toEqual(baseline.layers[i].outerGeometry);expect(layer.innerGeometry).toEqual(baseline.layers[i].innerGeometry);expect(layer.outerGeometry.maxRadius).toBeCloseTo(layer.outerRadius,6);expect(layer.innerGeometry.maxRadius).toBeCloseTo(layer.innerRadius,6);expect(layer.angle).toBeGreaterThanOrEqual(0);expect(Number.isFinite(layer.angle)).toBe(true);for(const cap of layer.caps){expect(cap.scale).toEqual([1,1,1]);expect(cap.geometry.finite).toBe(true);expect(cap.geometry.maxIndex).toBeLessThan(cap.geometry.count);expect(cap.geometry.indexCount).toBeGreaterThan(0);expect(cap.geometry.minRadius).toBeCloseTo(layer.innerRadius,6);expect(cap.geometry.maxRadius).toBeLessThanOrEqual(layer.outerRadius+.000001);}}
 expect(state.webglType).toBe('webgl');expect(state.programs.every((p:any)=>p.runnable)).toBe(true);expect([...state.camera.position,state.camera.near,state.camera.far].every(Number.isFinite)).toBe(true);expect(state.camera.near).toBeGreaterThan(0);expect(state.camera.far).toBeGreaterThan(state.camera.near);
}
async function opening(page:Page,n:number){
 const slider=page.getByRole('slider',{name:'Cutaway opening',exact:true});await slider.focus();await slider.press('End');await slider.press('Home');
 if(n===100)await slider.press('End');else{for(let i=0;i<Math.floor(n/10);i++)await slider.press('PageUp');for(let i=0;i<n%10;i++)await slider.press('ArrowRight');}
 await expect(slider).toHaveValue(String(n));await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail','basketball-open-'+n);const state=await stats(page);expect(state.state.opening).toBe(n);return state;
}
async function compare(page:Page){const box=page.locator('.sx-comparison-workbench');if(await box.getAttribute('open')===null)await box.locator(':scope > summary').click();await box.getByRole('combobox',{name:'First thing',exact:true}).selectOption('basketball');await box.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('human');await box.getByRole('button',{name:'Compare them',exact:true}).click();await expect(cv(page)).toHaveAttribute('data-atlas-comparison','basketball:human');await settle(page);}
async function disposal(page:Page){
 const ids=await page.evaluate(()=>{const w=window as any,resources=new Set<any>();w.__basketballScene.traverse((n:any)=>{if(n.userData.itemId==='basketball')for(const r of n.userData.resources||[])resources.add(r);});return [...resources].map((r:any)=>r.uuid);});
 await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);const counts=await page.evaluate(ids=>ids.map(id=>(window as any).__basketballDisposed[id]||0),ids);expect(ids.length).toBeGreaterThan(0);expect(counts).toEqual(ids.map(()=>1));return{resources:ids.length,disposed:counts.filter(c=>c===1).length};
}

// Render both physical states with one camera to test real WebGL clipping.
// The identical pair establishes the software renderer's pixel noise floor.
async function cutawayPixels(page:Page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,renderer=w.__basketballRenderer,scene=w.__basketballScene,camera=w.__basketballCamera;let d:any;
 scene.traverse((n:any)=>{if(n.userData.itemId==='basketball'&&n.visible)d=n.userData.model.userData.basketball;});
 const old={...d.state},oldTarget=renderer.getRenderTarget(),target=new T.WebGLRenderTarget(320,240);
 const render=(id:string)=>{d.update(id,false,true);renderer.setRenderTarget(target);renderer.render(scene,camera);const data=new Uint8Array(320*240*4);renderer.readRenderTargetPixels(target,0,0,320,240,data);return data;};
 try{
  const a=render('basketball-open-0'),b=render('basketball-open-0'),c=render('basketball-open-100');let noise=0,signal=0,changed=0;
  for(let i=0;i<a.length;i+=4){let delta=0;for(let j=0;j<3;j++){noise+=Math.abs(a[i+j]-b[i+j]);const difference=Math.abs(b[i+j]-c[i+j]);signal+=difference;delta+=difference;}if(delta>6)changed++;}
  const channels=320*240*3;return{noise:noise/channels,difference:signal/channels,changedFraction:changed/(320*240)};
 }finally{d.update(old.detail,old.comparison,old.measure);renderer.setRenderTarget(oldTarget);target.dispose();}
 });}

test('Basketball surface views and cutaway preserve its measured outside diameter',async({page})=>{
 const errors=await mount(page);await fly(page,'basketball');await expect(study(page)).toBeVisible();const whole=await stats(page);check(whole,whole);expect(whole.state.opening).toBe(0);await shot(page,'basketball-whole');
 const views:any[]=[];for(let i=0;i<ids.length;i++){
  const button=study(page).getByRole('button',{name:labels[i],exact:true});await button.click();await settle(page);await expect(button).toHaveAttribute('aria-pressed','true');await expect(cv(page)).toHaveAttribute('data-atlas-detail',ids[i]);await expect(cv(page)).toHaveAttribute('data-atlas-zoom',api.point(ids[i]).zoom.toFixed(2));
  const state=await stats(page);check(state,whole);expect(state.state.opening).toBe(api.point(ids[i]).opening);views.push({id:ids[i],...state});await shot(page,ids[i]);
 }
 await study(page).getByRole('button',{name:'Inside the ball',exact:true}).click();await settle(page);const pixels=await cutawayPixels(page);expect(pixels.difference).toBeGreaterThan(pixels.noise*4+.1);expect(pixels.changedFraction).toBeGreaterThan(.005);
 const slider=page.getByRole('slider',{name:'Cutaway opening',exact:true});await expect(slider).toHaveAttribute('min','0');await expect(slider).toHaveAttribute('max','100');await expect(slider).toHaveAttribute('step','1');const samples:any[]=[];
 for(const n of [0,50,100]){const state=await opening(page,n);check(state,whole);samples.push({n,...state});await shot(page,'basketball-opening-'+n);}
 await opening(page,80);await compare(page);const compared=await stats(page);check(compared,whole);expect(compared.state.comparison).toBe(true);expect(compared.state.opening).toBe(0);expect(compared.comparisonBounds).toBeDefined();for(let i=0;i<3;i++)expect(compared.comparisonBounds[i]).toBeCloseTo(compared.expectedBounds[i],6);expect(compared.worldScale/compared.otherScale).toBeCloseTo(.24/api.items.find((item:any)=>item.id==='human').size,9);await shot(page,'basketball-human-comparison');
 await fly(page,'basketball');const returned=await stats(page);check(returned,whole);expect(returned.state.comparison).toBe(false);const gl=await harness.glPixels(page);const {png,...glStats}=gl||{};save('pixels',{gl:glStats,cutawayPixels:pixels});expect(gl).not.toBeNull();expect(looksBlank(gl!)).toBe(false);expect(errors).toEqual([]);const disposed=await disposal(page);save('geometry',{whole,views,samples,cutawayPixels:pixels,compared,returned,disposal:disposed});
});

test('Basketball phone controls preserve their position and restore the saved cutaway',async({page})=>{
 const errors=await mount(page,true);await fly(page,'basketball');const whole=await stats(page);check(whole,whole);const views:any[]=[];
 for(let i=0;i<ids.length;i++){
  const button=study(page).getByRole('button',{name:labels[i],exact:true}),box=await button.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(360);expect(box!.height).toBeGreaterThanOrEqual(44);await button.focus();await button.press('Enter');await settle(page);await expect(button).toHaveAttribute('aria-pressed','true');await expect(cv(page)).toHaveAttribute('data-atlas-detail',ids[i]);const state=await stats(page);check(state,whole);views.push({id:ids[i],...state});await shot(page,ids[i]+'-phone');
 }
 const restart=study(page).getByRole('button',{name:'Close the cutaway',exact:true});await restart.focus();const beforeRestart={scrollY:await page.evaluate(()=>scrollY),box:await restart.boundingBox()};await restart.press('Enter');await expect(page.getByRole('slider',{name:'Cutaway opening',exact:true})).toHaveValue('0');const afterRestart={scrollY:await page.evaluate(()=>scrollY),box:await restart.boundingBox()};save('phone-restart-position',{beforeRestart,afterRestart});expect(Math.abs(afterRestart.box!.y-beforeRestart.box!.y)).toBeLessThanOrEqual(2);
 const slider=page.getByRole('slider',{name:'Cutaway opening',exact:true});await expect(slider).toHaveValue('0');await expect(slider).toHaveAttribute('aria-valuetext',/0%/);await slider.focus();const beforeSlide={scrollY:await page.evaluate(()=>scrollY),box:await slider.boundingBox()};await slider.press('ArrowRight');await expect(slider).toHaveValue('1');await expect(slider).toHaveAttribute('aria-valuetext',/1%/);const afterSlide={scrollY:await page.evaluate(()=>scrollY),box:await slider.boundingBox()};save('phone-slider-position',{beforeSlide,afterSlide});expect(Math.abs(afterSlide.box!.y-beforeSlide.box!.y)).toBeLessThanOrEqual(2);await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail','basketball-open-1');
 const selected=await opening(page,73);check(selected,whole);await study(page).screenshot({path:path.join(out,'basketball-phone-controls.png')});
 const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('The basketball cutaway is open to 73%.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
 await fly(page,'sun');await book.locator('[data-observation="basketball:basketball-open-73"]').getByRole('button',{name:/^Return to/}).click();await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-objects','basketball');await expect(cv(page)).toHaveAttribute('data-atlas-detail','basketball-open-73');await expect(page.getByRole('slider',{name:'Cutaway opening',exact:true})).toHaveValue('73');const restored=await stats(page);check(restored,whole);expect(restored.state.opening).toBe(73);for(let i=0;i<3;i++)expect(restored.camera.position[i]).toBeCloseTo(selected.camera.position[i],8);await shot(page,'basketball-phone-restored');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);expect(errors).toEqual([]);const disposed=await disposal(page);save('phone-geometry',{whole,views,selected,restored,disposal:disposed});
});
