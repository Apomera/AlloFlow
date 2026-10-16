import {test,expect,type Page} from '@playwright/test';
import {GlHarness,looksBlank} from './helpers/stem_gl_harness';
import {showScaleExplorerTools} from './helpers/scale_explorer_workspace';
import {mkdirSync,readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';

test.describe.configure({mode:'serial',retries:0,timeout:420000});
test.use({video:'off',trace:'off',hasTouch:true});
const out=path.resolve(process.env.SCALE_MILKYWAY_STUDY_REPORT_DIR||'reports/scale-explorer-milkyway-study');
const cv=(page:Page)=>page.locator('[data-atlas-ready]');
const study=(page:Page)=>page.getByRole('region',{name:'Milky Way structure study',exact:true});
const ids=['galaxy-overview','spiral-arms','central-bar','solar-neighbourhood','galactic-disc','dust-window'];
const labels=['Whole galaxy','Spiral structure','Central bar','Our neighbourhood','Edge-on disc','Through the dust'];
const source=readFileSync('stem_lab/stem_tool_scaleexplorer.js','utf8'),sourceSha256=createHash('sha256').update(source).digest('hex');
const sandbox:any={window:{StemLab:{registerTool(){}}},console:{log(){}}};
const marker="  window.StemLab.registerTool('scaleExplorer', {";
vm.runInNewContext(source.replace(marker,'  window.milkyWayTests={point:milkyWayPoint,reference:MILKYWAY_REFERENCE_LY,items:ITEMS};\n'+marker),sandbox);
const api=sandbox.window.milkyWayTests;
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],probes:`
const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;window.__milkyWayRenderer=r;r.render=function(scene,camera){if(!r.getRenderTarget()){window.__milkyWayScene=scene;window.__milkyWayCamera=camera;}return render.apply(this,arguments);};return r;}});
window.__milkyWayDisposed={};[THREE.BufferGeometry,THREE.Material,THREE.Texture].forEach(function(Type){const dispose=Type.prototype.dispose;Type.prototype.dispose=function(){window.__milkyWayDisposed[this.uuid]=(window.__milkyWayDisposed[this.uuid]||0)+1;return dispose.apply(this,arguments);};});
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
async function settle(page:Page){await cv(page).scrollIntoViewIfNeeded();await expect.poll(()=>page.evaluate(async()=>{const c=(window as any).__milkyWayCamera,p=c.position.clone();await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));return p.distanceTo(c.position);})).toBeLessThan(.000001);}
async function fly(page:Page,id:string){await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);await expect(cv(page)).toHaveAttribute('data-atlas-objects',id);await settle(page);}
async function shot(page:Page,name:string){await settle(page);await page.locator('.sx-stage').screenshot({path:path.join(out,name+'.png')});}
async function stats(page:Page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,scene=w.__milkyWayScene;let root:any,other:any;
 scene.traverse((n:any)=>{if(n.userData.itemId==='milkyway'&&n.visible)root=n;if(n.userData.itemId==='andromeda-dist'&&n.visible)other=n;});
 const g=root.userData.model,d=g.userData.milkyWay,geometry:any[]=[];let finite=true,vertices=0;g.updateMatrixWorld(true);
 d.body.traverse((n:any)=>{const geo=n.geometry,p=geo?.attributes?.position;if(!p)return;let sum=0,weighted=0;
  for(let i=0;i<p.array.length;i++){const value=p.array[i];finite=finite&&Number.isFinite(value);sum+=value;weighted+=value*(i%101+1);}vertices+=p.count;
  geometry.push({name:n.name,uuid:geo.uuid,count:p.count,indexCount:geo.index?.count||0,version:p.version,sum,weighted,position:n.position.toArray(),quaternion:n.quaternion.toArray(),scale:n.scale.toArray()});
 });
 const uniforms=(m:any)=>({cut:m.uniforms.uCut.value,height:m.uniforms.uSliceHeight.value,dust:m.uniforms.uDust.value});
 d.volume.geometry.computeBoundingBox();
 return{finite,vertices,geometry,body:d.body.visible,context:d.context.visible,guide:d.guide.visible,guideY:d.guide.position.y,state:{...d.state},volume:uniforms(d.volume.material),stars:uniforms(d.stars.material),texture:{width:d.texture.image.width,height:d.texture.image.height,bytes:d.texture.image.data.length},volumeGeometryBounds:d.volume.geometry.boundingBox.getSize(new T.Vector3()).toArray(),bounds:d.bounds.getSize(new T.Vector3()).toArray(),boundsCenter:d.bounds.getCenter(new T.Vector3()).toArray(),expectedBounds:d.bounds.clone().applyMatrix4(g.matrixWorld).getSize(new T.Vector3()).toArray(),comparisonBounds:root.userData.comparisonBodyBounds?.getSize(new T.Vector3()).toArray(),scale:g.scale.toArray(),worldScale:root.scale.x,otherScale:other?.scale.x,measurementAxis:root.userData.measureAxis,measurementCenter:g.userData.measureCenter,ruler:root.userData.ruler.visible,camera:{position:w.__milkyWayCamera.position.toArray(),near:w.__milkyWayCamera.near,far:w.__milkyWayCamera.far},programs:w.__milkyWayRenderer.info.programs.map((p:any)=>({runnable:p.diagnostics?.runnable!==false})),webglType:w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()).type};
 });}
function check(state:any,baseline:any){
 expect(state.finite).toBe(true);expect(state.body).toBe(true);expect(state.vertices).toBeGreaterThan(10000);expect(state.geometry).toEqual(baseline.geometry);expect(state.bounds).toEqual(baseline.bounds);expect(state.boundsCenter).toEqual(baseline.boundsCenter);expect(state.scale).toEqual(baseline.scale);
 expect(state.bounds).toEqual([1,.16,1]);expect(state.boundsCenter).toEqual([0,0,0]);expect(state.measurementCenter).toBe(0);
 for(let i=0;i<3;i++)expect(state.volumeGeometryBounds[i]).toBeCloseTo(state.bounds[i],7);
 expect(state.texture).toEqual({width:1024,height:1024,bytes:1024*1024*4});
 expect(state.state.sliceHeight).toBeCloseTo(state.state.heightLy/api.reference,12);expect(state.volume).toEqual(state.stars);expect(state.volume.height).toBeCloseTo(state.state.sliceHeight,12);expect(state.volume.cut).toBe(state.state.cut?1:0);expect(state.volume.dust).toBe(state.state.dust);
 expect(state.guideY).toBeCloseTo(state.state.sliceHeight,12);
 expect(state.webglType).toBe('webgl');expect(state.programs.every((p:any)=>p.runnable)).toBe(true);expect([...state.camera.position,state.camera.near,state.camera.far].every(Number.isFinite)).toBe(true);expect(state.camera.near).toBeGreaterThan(0);expect(state.camera.far).toBeGreaterThan(state.camera.near);
}
async function sample(page:Page,height:number){
 const slider=page.getByRole('slider',{name:'Galactic layer height',exact:true});await slider.focus();
 if(height===-4000){await slider.press('End');await slider.press('Home');}else{await slider.press('Home');if(height===4000)await slider.press('End');else for(let i=0;i<(height+4000)/80;i++)await slider.press('ArrowRight');}
 await expect(slider).toHaveValue(String(height));await settle(page);const id='galaxy-slice-'+((height+4000)/80);await expect(cv(page)).toHaveAttribute('data-atlas-detail',id);const state=await stats(page);expect(state.state.heightLy).toBe(height);expect(state.state.cut).toBe(true);expect(state.state.dust).toBe(1);return state;
}
async function compare(page:Page){const box=page.locator('.sx-comparison-workbench');if(await box.getAttribute('open')===null)await box.locator(':scope > summary').click();await box.getByRole('combobox',{name:'First thing',exact:true}).selectOption('milkyway');await box.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('andromeda-dist');await box.getByRole('button',{name:'Compare them',exact:true}).click();await expect(cv(page)).toHaveAttribute('data-atlas-comparison','milkyway:andromeda-dist');await settle(page);}
async function disposal(page:Page){
 const ids=await page.evaluate(()=>{const w=window as any,resources=new Set<any>();w.__milkyWayScene.traverse((n:any)=>{if(n.userData.itemId==='milkyway')for(const r of n.userData.resources||[])resources.add(r);});return [...resources].map((r:any)=>r.uuid);});
 await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);const counts=await page.evaluate(ids=>ids.map(id=>(window as any).__milkyWayDisposed[id]||0),ids);expect(ids.length).toBeGreaterThan(0);expect(counts).toEqual(ids.map(()=>1));return{resources:ids.length,disposed:counts.filter(c=>c===1).length};
}

// Hold camera, geometry, viewport, and lighting fixed. The dust control must
// change actual GPU pixels, beyond same-input rendering noise.
async function dustPixels(page:Page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,renderer=w.__milkyWayRenderer,scene=w.__milkyWayScene,camera=w.__milkyWayCamera;let d:any;
 scene.traverse((n:any)=>{if(n.userData.itemId==='milkyway'&&n.visible)d=n.userData.model.userData.milkyWay;});
 const old={...d.state},oldTarget=renderer.getRenderTarget(),target=new T.WebGLRenderTarget(320,240),context=d.context.visible;
 const render=(id:string)=>{d.update(id,false,true);d.context.visible=false;renderer.setRenderTarget(target);renderer.render(scene,camera);const data=new Uint8Array(320*240*4);renderer.readRenderTargetPixels(target,0,0,320,240,data);return data;};
 try{
  const a=render('galactic-disc'),b=render('galactic-disc'),c=render('dust-window');let noise=0,signal=0,changed=0,normal=0,revealed=0;
  for(let i=0;i<a.length;i+=4){let delta=0;for(let j=0;j<3;j++){noise+=Math.abs(a[i+j]-b[i+j]);const difference=Math.abs(b[i+j]-c[i+j]);signal+=difference;delta+=difference;normal+=b[i+j];revealed+=c[i+j];}if(delta>6)changed++;}
  const low=render('galaxy-slice-0'),high=render('galaxy-slice-100');let layerSignal=0,lowLight=0,highLight=0;
  for(let i=0;i<low.length;i+=4)for(let j=0;j<3;j++){layerSignal+=Math.abs(low[i+j]-high[i+j]);lowLight+=low[i+j];highLight+=high[i+j];}
  const channels=320*240*3;return{noise:noise/channels,difference:signal/channels,changedFraction:changed/(320*240),normal:normal/channels,revealed:revealed/channels,layerDifference:layerSignal/channels,lowLayerLight:lowLight/channels,highLayerLight:highLight/channels};
 }finally{d.update(old.detail,old.comparison,old.measure);d.context.visible=context;renderer.setRenderTarget(oldTarget);target.dispose();}
 });}

test('Milky Way structure views clip and reveal the same galaxy without changing its physical reference',async({page})=>{
 const errors=await mount(page);await fly(page,'milkyway');await expect(study(page)).toBeVisible();const whole=await stats(page);check(whole,whole);expect(whole.context).toBe(true);await shot(page,'milkyway-whole');
 const views:any[]=[];for(let i=0;i<ids.length;i++){
  const button=study(page).getByRole('button',{name:labels[i],exact:true});await button.click();await settle(page);await expect(button).toHaveAttribute('aria-pressed','true');await expect(cv(page)).toHaveAttribute('data-atlas-detail',ids[i]);await expect(cv(page)).toHaveAttribute('data-atlas-zoom',api.point(ids[i]).zoom.toFixed(2));
  const state=await stats(page);check(state,whole);expect(state.state.cut).toBe(false);expect(state.state.dust).toBe(ids[i]==='dust-window'?.12:1);views.push({id:ids[i],...state});await shot(page,ids[i]);
 }
 await study(page).getByRole('button',{name:'Edge-on disc',exact:true}).click();await settle(page);const pixels=await dustPixels(page);expect(pixels.difference).toBeGreaterThan(pixels.noise*4+.1);expect(pixels.changedFraction).toBeGreaterThan(.002);expect(pixels.layerDifference).toBeGreaterThan(.1);expect(pixels.highLayerLight).toBeGreaterThan(pixels.lowLayerLight+.1);
 await study(page).getByRole('button',{name:'Cut at the galactic plane',exact:true}).click();await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail','galaxy-slice-50');const centralCut=await stats(page);check(centralCut,whole);expect(centralCut.state.cut).toBe(true);expect(centralCut.state.heightLy).toBe(0);
 const slider=page.getByRole('slider',{name:'Galactic layer height',exact:true});await expect(slider).toHaveAttribute('min','-4000');await expect(slider).toHaveAttribute('max','4000');await expect(slider).toHaveAttribute('step','80');const samples:any[]=[];
 for(const height of [-4000,0,4000]){const state=await sample(page,height);check(state,whole);samples.push({height,...state});await shot(page,'milkyway-layer-'+(height+4000));}
 await sample(page,0);await compare(page);const compared=await stats(page);check(compared,whole);expect(compared.context).toBe(false);expect(compared.state.cut).toBe(false);expect(compared.state.dust).toBe(1);expect(compared.state.heightLy).toBe(0);expect(compared.comparisonBounds).toBeDefined();for(let i=0;i<3;i++)expect(compared.comparisonBounds[i]).toBeCloseTo(compared.expectedBounds[i],6);expect(compared.worldScale/compared.otherScale).toBeCloseTo(9.5e20/api.items.find((item:any)=>item.id==='andromeda-dist').size,10);await shot(page,'milkyway-andromeda-comparison');
 await fly(page,'milkyway');const returned=await stats(page);check(returned,whole);expect(returned.context).toBe(true);const gl=await harness.glPixels(page);expect(gl).not.toBeNull();expect(looksBlank(gl!)).toBe(false);expect(errors).toEqual([]);const disposed=await disposal(page);save('geometry',{whole,views,samples,dustPixels:pixels,compared,returned,disposal:disposed});
});

test('Milky Way phone controls and notebook restore a measured galactic layer',async({page})=>{
 const errors=await mount(page,true);await fly(page,'milkyway');const whole=await stats(page);check(whole,whole);const views:any[]=[];
 for(let i=0;i<ids.length;i++){
  const button=study(page).getByRole('button',{name:labels[i],exact:true}),box=await button.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(360);expect(box!.height).toBeGreaterThanOrEqual(44);await button.focus();await button.press('Enter');await settle(page);await expect(button).toHaveAttribute('aria-pressed','true');await expect(cv(page)).toHaveAttribute('data-atlas-detail',ids[i]);const state=await stats(page);check(state,whole);views.push({id:ids[i],...state});await shot(page,ids[i]+'-phone');
 }
 const cut=study(page).getByRole('button',{name:'Cut at the galactic plane',exact:true});await cut.focus();const beforeCut={scrollY:await page.evaluate(()=>scrollY),box:await cut.boundingBox()};await cut.press('Enter');await expect(study(page).getByText('Layer cutaway',{exact:true})).toBeVisible();const afterCut={scrollY:await page.evaluate(()=>scrollY),box:await cut.boundingBox()};save('phone-cut-position',{beforeCut,afterCut});expect(Math.abs(afterCut.box!.y-beforeCut.box!.y)).toBeLessThanOrEqual(2);
 const slider=page.getByRole('slider',{name:'Galactic layer height',exact:true});await expect(slider).toHaveAttribute('aria-valuetext',/Cut at 0 light-years/);await slider.focus();const beforeSlide={scrollY:await page.evaluate(()=>scrollY),box:await slider.boundingBox()};await slider.press('ArrowRight');await expect(slider).toHaveValue('80');await expect(slider).toHaveAttribute('aria-valuetext',/Cut at \+80 light-years/);const afterSlide={scrollY:await page.evaluate(()=>scrollY),box:await slider.boundingBox()};save('phone-slider-position',{beforeSlide,afterSlide});expect(Math.abs(afterSlide.box!.y-beforeSlide.box!.y)).toBeLessThanOrEqual(2);await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail','galaxy-slice-51');
 const selected=await sample(page,800);check(selected,whole);await study(page).screenshot({path:path.join(out,'milkyway-phone-controls.png')});
 const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('A layer 800 light-years above the central plane reveals structure below it.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
 await fly(page,'sun');await book.locator('[data-observation="milkyway:galaxy-slice-60"]').getByRole('button',{name:/^Return to/}).click();await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-objects','milkyway');await expect(cv(page)).toHaveAttribute('data-atlas-detail','galaxy-slice-60');await expect(page.getByRole('slider',{name:'Galactic layer height',exact:true})).toHaveValue('800');const restored=await stats(page);check(restored,whole);expect(restored.state.heightLy).toBe(800);expect(restored.state.cut).toBe(true);for(let i=0;i<3;i++)expect(restored.camera.position[i]).toBeCloseTo(selected.camera.position[i],8);await shot(page,'milkyway-phone-restored');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);expect(errors).toEqual([]);const disposed=await disposal(page);save('phone-geometry',{whole,views,selected,restored,disposal:disposed});
});
