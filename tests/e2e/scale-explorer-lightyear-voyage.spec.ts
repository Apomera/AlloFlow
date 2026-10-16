import {test,expect,type Page} from '@playwright/test';
import {GlHarness,looksBlank} from './helpers/stem_gl_harness';
import {showScaleExplorerTools} from './helpers/scale_explorer_workspace';
import {mkdirSync,readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';

test.describe.configure({mode:'serial',retries:0,timeout:420000});
test.use({video:'off',trace:'off',hasTouch:true});
const out=path.resolve(process.env.SCALE_LIGHTYEAR_VOYAGE_REPORT_DIR||'reports/scale-explorer-lightyear-voyage');
const cv=(page:Page)=>page.locator('[data-atlas-ready]');
const study=(page:Page)=>page.getByRole('region',{name:'Light-year voyage',exact:true});
const ids=['lightyear-overview','lightyear-solar','lightyear-day','lightyear-month','lightyear-ride','lightyear-arrival'];
const labels=['Whole journey','Sun & planets','One day out','Thirty days','Ride the signal','Arrival'];
const source=readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8'),sourceSha256=createHash('sha256').update(source).digest('hex');
const sandbox:any={window:{StemLab:{registerTool(){}}},console:{log(){}}};
const marker="  window.StemLab.registerTool('scaleExplorer', {";
vm.runInNewContext(source.replace(marker,'  window.lightYearTests={point:lightYearPoint,distance:LIGHTYEAR_M,c:LIGHTYEAR_C,au:LIGHTYEAR_AU_M,days:LIGHTYEAR_DAYS,items:ITEMS};\n'+marker),sandbox);
const api=sandbox.window.lightYearTests;
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],probes:`
const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;window.__lightYearRenderer=r;r.render=function(scene,camera){if(!r.getRenderTarget()){window.__lightYearScene=scene;window.__lightYearCamera=camera;}return render.apply(this,arguments);};return r;}});
window.__lightYearDisposed={};[THREE.BufferGeometry,THREE.Material,THREE.Texture].forEach(function(Type){const dispose=Type.prototype.dispose;Type.prototype.dispose=function(){window.__lightYearDisposed[this.uuid]=(window.__lightYearDisposed[this.uuid]||0)+1;return dispose.apply(this,arguments);};});
`});

test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
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
async function settle(page:Page){await cv(page).scrollIntoViewIfNeeded();await expect.poll(()=>page.evaluate(async()=>{const c=(window as any).__lightYearCamera,p=c.position.clone();await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));return p.distanceTo(c.position);})).toBeLessThan(.000001);}
async function fly(page:Page,id:string){await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);await expect(cv(page)).toHaveAttribute('data-atlas-objects',id);await settle(page);}
async function shot(page:Page,name:string){await settle(page);await page.locator('.sx-stage').screenshot({path:path.join(out,name+'.png')});}
async function stats(page:Page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,scene=w.__lightYearScene;let root:any,other:any;
 scene.traverse((n:any)=>{if(n.userData.itemId==='lightyear'&&n.visible)root=n;if(n.userData.itemId==='light-month'&&n.visible)other=n;});
 const g=root.userData.model,d=g.userData.lightYear,geometry:any[]=[];let finite=true;g.updateMatrixWorld(true);
 d.body.traverse((n:any)=>{const geo=n.geometry,p=geo?.attributes?.position;if(!p)return;let sum=0,weighted=0;
  for(let i=0;i<p.array.length;i++){const value=p.array[i];finite=finite&&Number.isFinite(value);sum+=value;weighted+=value*(i%101+1);}
  geometry.push({name:n.name,uuid:geo.uuid,count:p.count,indexCount:geo.index?.count||0,version:p.version,sum,weighted,position:n.position.toArray(),quaternion:n.quaternion.toArray(),scale:n.scale.toArray()});
 });
 const pathPoints=Array.from(d.path.geometry.attributes.position.array);
 const radii=(line:any)=>{const p=line.geometry.attributes.position;let min=Infinity,max=0;for(let i=0;i<p.count;i++){const radius=Math.hypot(p.getX(i)+.5,p.getY(i),p.getZ(i));min=Math.min(min,radius);max=Math.max(max,radius);}return{min,max};};
 const actualOrbits=d.orbitLines.map((line:any)=>({au:line.userData.au,...radii(line)}));
 const actualHeliopause=radii(d.heliopause),tickPositions=Array.from(d.ticks.geometry.attributes.position.array);
 return{finite,geometry,pathPoints,actualOrbits,actualHeliopause,tickPositions,body:d.body.visible,context:d.context.visible,visibility:{ticks:d.ticks.visible,reticle:d.reticle.visible,heliopause:d.heliopause.visible,pulse:d.pulse.visible,trail:d.trail.visible,wavefront:d.wavefront.visible,stars:d.stars.visible},state:{...d.state},pulsePosition:d.pulse.position.toArray(),trailFraction:d.trailMaterial.uniforms.uFraction.value,dimensions:d.dimensions,bounds:d.bounds.getSize(new T.Vector3()).toArray(),boundsCenter:d.bounds.getCenter(new T.Vector3()).toArray(),expectedBounds:d.bounds.clone().applyMatrix4(g.matrixWorld).getSize(new T.Vector3()).toArray(),comparisonBounds:root.userData.comparisonBodyBounds?.getSize(new T.Vector3()).toArray(),scale:g.scale.toArray(),worldScale:root.scale.x,otherScale:other?.scale.x,measurementAxis:root.userData.measureAxis,measurementCenter:g.userData.measureCenter,ruler:root.userData.ruler.visible,camera:{position:w.__lightYearCamera.position.toArray(),near:w.__lightYearCamera.near,far:w.__lightYearCamera.far},programs:w.__lightYearRenderer.info.programs.map((p:any)=>({runnable:p.diagnostics?.runnable!==false})),webglType:w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()).type};
 });}
function check(state:any,baseline:any){
 expect(state.finite).toBe(true);expect(state.body).toBe(true);expect(state.geometry.length).toBeGreaterThan(0);expect(state.geometry).toEqual(baseline.geometry);expect(state.bounds).toEqual(baseline.bounds);expect(state.boundsCenter).toEqual(baseline.boundsCenter);expect(state.scale).toEqual(baseline.scale);
 expect(state.pathPoints).toEqual([-.5,0,0,.5,0,0]);expect(state.bounds).toEqual([1,0,0]);expect(state.boundsCenter).toEqual([0,0,0]);expect(state.measurementCenter).toBe(0);
 expect(state.state.fraction).toBeGreaterThanOrEqual(0);expect(state.state.fraction).toBeLessThanOrEqual(1);
 expect(state.pulsePosition[0]).toBeCloseTo(-.5+state.state.fraction,12);expect(state.pulsePosition.slice(1)).toEqual([0,0]);expect(state.trailFraction).toBeCloseTo(state.state.fraction,12);expect(state.state.days).toBeCloseTo(state.state.fraction*api.distance/api.c/86400,10);
 expect(state.dimensions.referenceM).toBe(api.distance);expect(state.dimensions.lightSpeedMPS).toBe(api.c);expect(state.dimensions.days).toBeCloseTo(api.days,10);
 for(const orbit of state.dimensions.solarOrbits)expect(orbit.radius).toBeCloseTo(orbit.au*api.au/api.distance,12);
 // Read the GPU geometry, not just model metadata. Float32 x coordinates are
 // close to -.5, so tolerate its half-ulp while testing these very small orbits.
 expect(state.actualOrbits).toEqual(baseline.actualOrbits);expect(state.actualOrbits.map((o:any)=>o.au)).toEqual([1,5.2,9.58,19.2,30.07]);
 for(const orbit of state.actualOrbits)for(const radius of [orbit.min,orbit.max])expect(Math.abs(radius-orbit.au*api.au/api.distance)).toBeLessThan(3.1e-8);
 expect(state.actualHeliopause).toEqual(baseline.actualHeliopause);for(const radius of [state.actualHeliopause.min,state.actualHeliopause.max])expect(Math.abs(radius-122*api.au/api.distance)).toBeLessThan(3.1e-8);
 expect(state.tickPositions).toEqual(baseline.tickPositions);expect(state.tickPositions).toHaveLength(14*6);
 for(let i=0;i<14;i++){const day=i<13?i*30:api.days;expect(state.tickPositions[i*6]).toBeCloseTo(-.5+day/api.days,7);expect(state.tickPositions[i*6+3]).toBeCloseTo(-.5+day/api.days,7);}
 expect(state.webglType).toBe('webgl');expect(state.programs.every((p:any)=>p.runnable)).toBe(true);expect([...state.camera.position,state.camera.near,state.camera.far].every(Number.isFinite)).toBe(true);expect(state.camera.near).toBeGreaterThan(0);expect(state.camera.far).toBeGreaterThan(state.camera.near);
}
async function progress(page:Page,n:number){
 const slider=page.getByRole('slider',{name:'Journey progress',exact:true});await slider.focus();await slider.press('End');await slider.press('Home');
 if(n===1000)await slider.press('End');else{for(let i=0;i<Math.floor(n/100);i++)await slider.press('PageUp');for(let i=0;i<n%100;i++)await slider.press('ArrowRight');}
 await expect(slider).toHaveValue(String(n));await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail','lightyear-time-'+n);const state=await stats(page);expect(state.state.fraction).toBe(n/1000);return state;
}
async function compare(page:Page){const box=page.locator('.sx-comparison-workbench');if(await box.getAttribute('open')===null)await box.locator(':scope > summary').click();await box.getByRole('combobox',{name:'First thing',exact:true}).selectOption('lightyear');await box.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('light-month');await box.getByRole('button',{name:'Compare them',exact:true}).click();await expect(cv(page)).toHaveAttribute('data-atlas-comparison','lightyear:light-month');await settle(page);}
async function disposal(page:Page){
 const ids=await page.evaluate(()=>{const w=window as any,resources=new Set<any>();w.__lightYearScene.traverse((n:any)=>{if(n.userData.itemId==='lightyear')for(const r of n.userData.resources||[])resources.add(r);});return [...resources].map((r:any)=>r.uuid);});
 await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);const counts=await page.evaluate(ids=>ids.map(id=>(window as any).__lightYearDisposed[id]||0),ids);expect(ids.length).toBeGreaterThan(0);expect(counts).toEqual(ids.map(()=>1));return{resources:ids.length,disposed:counts.filter(c=>c===1).length};
}

// The same camera must show a changed signal and trail on the GPU. Calibrate
// with two identical renders because software WebGL has small pixel noise.
async function signalPixels(page:Page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,renderer=w.__lightYearRenderer,scene=w.__lightYearScene,camera=w.__lightYearCamera;let d:any;
 scene.traverse((n:any)=>{if(n.userData.itemId==='lightyear'&&n.visible)d=n.userData.model.userData.lightYear;});
 const old={...d.state},oldTarget=renderer.getRenderTarget(),target=new T.WebGLRenderTarget(320,240);
 const render=(id:string)=>{d.update(id,false,true,1);renderer.setRenderTarget(target);renderer.render(scene,camera);const data=new Uint8Array(320*240*4);renderer.readRenderTargetPixels(target,0,0,320,240,data);return data;};
 try{
  const a=render('lightyear-time-200'),b=render('lightyear-time-200'),c=render('lightyear-time-800');let noise=0,signal=0,changed=0;
  for(let i=0;i<a.length;i+=4){let delta=0;for(let j=0;j<3;j++){noise+=Math.abs(a[i+j]-b[i+j]);const difference=Math.abs(b[i+j]-c[i+j]);signal+=difference;delta+=difference;}if(delta>6)changed++;}
  const channels=320*240*3;return{noise:noise/channels,difference:signal/channels,changedFraction:changed/(320*240)};
 }finally{d.update(old.detail,old.comparison,old.measure,old.zoom);renderer.setRenderTarget(oldTarget);target.dispose();}
 });}

test('Light-year viewpoints and signal travel preserve one physical distance',async({page})=>{
 const errors=await mount(page);await fly(page,'lightyear');await expect(study(page)).toBeVisible();const whole=await stats(page);check(whole,whole);expect(whole.context).toBe(true);await shot(page,'lightyear-whole');
 const views:any[]=[];for(let i=0;i<ids.length;i++){
  const button=study(page).getByRole('button',{name:labels[i],exact:true});await button.click();await settle(page);await expect(button).toHaveAttribute('aria-pressed','true');await expect(cv(page)).toHaveAttribute('data-atlas-detail',ids[i]);await expect(cv(page)).toHaveAttribute('data-atlas-zoom',api.point(ids[i]).zoom.toFixed(2));
  const state=await stats(page);check(state,whole);expect(state.state.fraction).toBe(api.point(ids[i]).fraction);views.push({id:ids[i],...state});await shot(page,ids[i]);
 }
 await study(page).getByRole('button',{name:'Whole journey',exact:true}).click();await settle(page);
 const measurement=page.getByRole('button',{name:'Measurement',exact:true});await measurement.click();await expect(measurement).toHaveAttribute('aria-pressed','false');await settle(page);const unmeasured=await stats(page);check(unmeasured,whole);expect(unmeasured.context).toBe(true);expect(unmeasured.visibility).toEqual({ticks:false,reticle:false,heliopause:false,pulse:true,trail:true,wavefront:true,stars:true});await shot(page,'lightyear-without-guides');await measurement.click();await expect(measurement).toHaveAttribute('aria-pressed','true');await settle(page);
 const pixels=await signalPixels(page);expect(pixels.difference).toBeGreaterThan(pixels.noise*4+.03);expect(pixels.changedFraction).toBeGreaterThan(.001);
 const slider=page.getByRole('slider',{name:'Journey progress',exact:true});await expect(slider).toHaveAttribute('min','0');await expect(slider).toHaveAttribute('max','1000');await expect(slider).toHaveAttribute('step','1');const samples:any[]=[];
 for(const n of [0,500,1000]){const state=await progress(page,n);check(state,whole);samples.push({n,...state});await shot(page,'lightyear-progress-'+n);}
 await progress(page,800);await compare(page);const compared=await stats(page);check(compared,whole);expect(compared.context).toBe(false);expect(compared.state.comparison).toBe(true);expect(compared.state.fraction).toBe(.5);expect(compared.comparisonBounds).toBeDefined();for(let i=0;i<3;i++)expect(compared.comparisonBounds[i]).toBeCloseTo(compared.expectedBounds[i],6);expect(compared.worldScale/compared.otherScale).toBeCloseTo(api.distance/api.items.find((item:any)=>item.id==='light-month').size,9);await shot(page,'lightyear-month-comparison');
 await fly(page,'lightyear');const returned=await stats(page);check(returned,whole);expect(returned.context).toBe(true);const gl=await harness.glPixels(page);const {png,...glStats}=gl||{};save('pixels',{gl:glStats,signalPixels:pixels});expect(gl).not.toBeNull();expect(looksBlank(gl!)).toBe(false);expect(errors).toEqual([]);const disposed=await disposal(page);save('geometry',{whole,views,samples,unmeasured,signalPixels:pixels,compared,returned,disposal:disposed});
});

test('Light-year phone controls preserve their position and restore the saved signal',async({page})=>{
 const errors=await mount(page,true);await fly(page,'lightyear');const whole=await stats(page);check(whole,whole);const views:any[]=[];
 for(let i=0;i<ids.length;i++){
  const button=study(page).getByRole('button',{name:labels[i],exact:true}),box=await button.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(360);expect(box!.height).toBeGreaterThanOrEqual(44);await button.focus();await button.press('Enter');await settle(page);await expect(button).toHaveAttribute('aria-pressed','true');await expect(cv(page)).toHaveAttribute('data-atlas-detail',ids[i]);const state=await stats(page);check(state,whole);views.push({id:ids[i],...state});await shot(page,ids[i]+'-phone');
 }
 const restart=study(page).getByRole('button',{name:'Return to departure',exact:true});await restart.focus();const beforeRestart={scrollY:await page.evaluate(()=>scrollY),box:await restart.boundingBox()};await restart.press('Enter');await expect(page.getByRole('slider',{name:'Journey progress',exact:true})).toHaveValue('0');const afterRestart={scrollY:await page.evaluate(()=>scrollY),box:await restart.boundingBox()};save('phone-restart-position',{beforeRestart,afterRestart});expect(Math.abs(afterRestart.box!.y-beforeRestart.box!.y)).toBeLessThanOrEqual(2);
 const slider=page.getByRole('slider',{name:'Journey progress',exact:true});await expect(slider).toHaveValue('0');await expect(slider).toHaveAttribute('aria-valuetext',/0.0% of the route; 0.00 days/);await slider.focus();const beforeSlide={scrollY:await page.evaluate(()=>scrollY),box:await slider.boundingBox()};await slider.press('ArrowRight');await expect(slider).toHaveValue('1');await expect(slider).toHaveAttribute('aria-valuetext',/0.1% of the route/);const afterSlide={scrollY:await page.evaluate(()=>scrollY),box:await slider.boundingBox()};save('phone-slider-position',{beforeSlide,afterSlide});expect(Math.abs(afterSlide.box!.y-beforeSlide.box!.y)).toBeLessThanOrEqual(2);await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail','lightyear-time-1');
 const selected=await progress(page,731);check(selected,whole);await study(page).screenshot({path:path.join(out,'lightyear-phone-controls.png')});
 const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('The signal has crossed 73.1% of the light-year route.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
 await fly(page,'sun');await book.locator('[data-observation="lightyear:lightyear-time-731"]').getByRole('button',{name:/^Return to/}).click();await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-objects','lightyear');await expect(cv(page)).toHaveAttribute('data-atlas-detail','lightyear-time-731');await expect(page.getByRole('slider',{name:'Journey progress',exact:true})).toHaveValue('731');const restored=await stats(page);check(restored,whole);expect(restored.state.fraction).toBe(.731);for(let i=0;i<3;i++)expect(restored.camera.position[i]).toBeCloseTo(selected.camera.position[i],8);await shot(page,'lightyear-phone-restored');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);expect(errors).toEqual([]);const disposed=await disposal(page);save('phone-geometry',{whole,views,selected,restored,disposal:disposed});
});
