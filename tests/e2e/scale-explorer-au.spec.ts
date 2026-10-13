import {test,expect,type Page} from '@playwright/test';
import {GlHarness,looksBlank} from './helpers/stem_gl_harness';
import {showScaleExplorerTools} from './helpers/scale_explorer_workspace';
import {mkdirSync,writeFileSync,appendFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';

test.describe.configure({mode:'serial',retries:0,timeout:360000});
test.use({video:'off',trace:'off',hasTouch:true});
const out=path.resolve(process.env.SCALE_AU_REPORT_DIR||'reports/scale-explorer-au');
const sourceSha256=createHash('sha256').update(readFileSync('stem_lab/stem_tool_scaleexplorer.js')).digest('hex');
const cv=(p:Page)=>p.locator('[data-atlas-ready]');
const study=(p:Page)=>p.getByRole('region',{name:'Earth–Sun crossing',exact:true});
const views=[['au-overview','The full astronomical unit'],['au-sun','Solar photosphere'],['au-midway','Halfway across'],['au-approach','Approach Earth'],['au-earth','Earth in sunlight'],['au-terminator','Across the terminator']] as const;
const referenceM=1.496e11,sunScale=1.392e9/referenceM,earthScale=1.2742e7/referenceM;
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;window.__auRenderer=r;r.render=function(scene,camera){if(!r.getRenderTarget()){window.__auScene=scene;window.__auCamera=camera;}return render.apply(this,arguments);};return r;}});`});

test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();expect(createHash('sha256').update(readFileSync('stem_lab/stem_tool_scaleexplorer.js')).digest('hex')).toBe(sourceSha256);});
test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:Page,phone=false){
 const diagnostic=path.join(out,phone?'phone-diagnostics.txt':'desktop-diagnostics.txt'),errors:string[]=[];
 writeFileSync(diagnostic,'Mount '+new Date().toISOString()+'\n');
 page.on('console',m=>{if(m.type()==='error'||m.type()==='warning'||/context.*lost|WebGL/i.test(m.text()))appendFileSync(diagnostic,new Date().toISOString()+' '+m.type()+': '+m.text()+'\n');if(m.type()==='error')errors.push(m.text());});
 page.on('pageerror',e=>{appendFileSync(diagnostic,new Date().toISOString()+' pageerror: '+e.message+'\n');errors.push(e.message);});
 // Serve the repository imagery explicitly so production URL construction does
 // not cause an external request or replace the real texture with a fixture.
 for(const file of ['earth-bluemarble-2k.png','earth-blackmarble-2016.jpg'])await page.route('**/'+file,route=>route.fulfill({path:path.resolve('stem_lab/assets/astronomy',file),contentType:file.endsWith('.png')?'image/png':'image/jpeg'}));
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;(HTMLCanvasElement.prototype as any).getContext=function(type:string,...args:any[]){return type==='webgl2'?null:original.apply(this,[type,...args] as any);};});
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:phone?360:1400,height:phone?900:1100});
 await harness.mount(page,{_scaleExplorer:{ambient:false,yourHeightCm:phone?220:null}},'!!document.querySelector("[data-atlas-ready]")');
 await showScaleExplorerTools(page);await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});return errors;
}

async function settle(page:Page){
 await cv(page).scrollIntoViewIfNeeded();
 await expect.poll(()=>page.evaluate(async()=>{const c=(window as any).__auCamera,p=c.position.clone(),q=c.quaternion.clone();await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));return Math.max(p.distanceTo(c.position),q.angleTo(c.quaternion));})).toBeLessThan(1e-7);
}
async function fly(page:Page,id:string){await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);await expect(cv(page)).toHaveAttribute('data-atlas-objects',id);await settle(page);}
async function compare(page:Page,a:string,b:string){const box=page.locator('.sx-comparison-workbench');if(await box.getAttribute('open')===null)await box.locator(':scope > summary').click();await box.getByRole('combobox',{name:'First thing',exact:true}).selectOption(a);await box.getByRole('combobox',{name:'Second thing',exact:true}).selectOption(b);await box.getByRole('button',{name:'Compare them',exact:true}).click();await expect(cv(page)).toHaveAttribute('data-atlas-comparison',a+':'+b);await settle(page);}
async function shot(page:Page,name:string){await settle(page);await page.locator('.sx-stage').screenshot({path:path.join(out,name+'.png')});}
async function chooseView(page:Page,id:string,label:string){const b=study(page).getByRole('button',{name:label,exact:true});await b.focus();await b.press('Enter');await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail',id);await expect(b).toHaveAttribute('aria-pressed','true');}

async function stats(page:Page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,scene=w.__auScene,camera=w.__auCamera,renderer=w.__auRenderer;let root:any;
 scene.traverse((n:any)=>{if(n.userData.itemId==='au'&&n.visible)root=n;});
 if(!root)throw new Error('AU model is not visible');
 const g=root.userData.model,d=g.userData.au,geometry:any[]=[];let finite=true,uniformsFinite=true;
 const finiteValue=(v:any):boolean=>typeof v==='number'?Number.isFinite(v):v?.isVector2||v?.isVector3||v?.isVector4||v?.isQuaternion?v.toArray().every(Number.isFinite):v?.isMatrix3||v?.isMatrix4?v.elements.every(Number.isFinite):Array.isArray(v)||ArrayBuffer.isView(v)?Array.from(v as any).every(x=>typeof x!=='number'||Number.isFinite(x)):true;
 g.traverse((n:any)=>{const geo=n.geometry,p=geo?.attributes?.position;if(p){let sum=0,weighted=0;for(let i=0;i<p.array.length;i++){const value=p.array[i];finite=finite&&Number.isFinite(value);sum+=value;weighted+=value*(i%101+1);}geometry.push({name:n.name,uuid:geo.uuid,count:p.count,version:p.version,sum,weighted,indexCount:geo.index?.count||0,material:Array.isArray(n.material)?n.material.map((m:any)=>m.uuid):n.material?.uuid});}for(const m of Array.isArray(n.material)?n.material:n.material?[n.material]:[])for(const u of Object.values(m.uniforms||{}))uniformsFinite=uniformsFinite&&finiteValue((u as any).value);});
 const earthWorld=d.earth.getWorldPosition(new T.Vector3()),sunWorld=d.sun.getWorldPosition(new T.Vector3()),earthEye=camera.position.clone().sub(earthWorld),earthRadius=d.globe.geometry.parameters.radius*d.earth.getWorldScale(new T.Vector3()).x;
 const projected=earthWorld.clone().project(camera),sunLocal=d.sunLocal.value.toArray(),lightWorld=d.sunLocal.value.clone().transformDirection(d.earth.matrixWorld).toArray();
 const earthImage=d.earthMaterial.uniforms.uDayMap.value.image,nightImage=d.earthMaterial.uniforms.uNightMap.value.image;
 const comparisonRoots:any={};scene.traverse((n:any)=>{if(n.userData.itemId&&n.visible)comparisonRoots[n.userData.itemId]=n.scale.x;});
 const nearSide=earthEye.length()-earthRadius;
 const canvasRect=renderer.domElement.getBoundingClientRect(),hud=document.querySelector('.sx-hud')?.getBoundingClientRect(),footer=document.querySelector('.sx-stage-note')?.getBoundingClientRect();
 const disc=(node:any,surface:any)=>{const center=node.getWorldPosition(new T.Vector3()),radius=surface.geometry.parameters.radius*node.getWorldScale(new T.Vector3()).x,distance=camera.position.distanceTo(center),position=center.project(camera),pixelRadius=radius/Math.sqrt(distance*distance-radius*radius)/Math.tan(camera.fov*Math.PI/360)*canvasRect.height/2,cy=(1-position.y)*canvasRect.height/2;return{top:cy-pixelRadius,bottom:cy+pixelRadius,center:cy,diameter:pixelRadius*2};};
 const framing=camera.isPerspectiveCamera?{canvasHeight:canvasRect.height,hudBottom:hud?hud.bottom-canvasRect.top:null,footerTop:footer?footer.top-canvasRect.top:null,sun:disc(d.sun,d.photosphere),earth:disc(d.earth,d.globe)}:null;
 return{finite,uniformsFinite,geometry,detail:d.detail,comparison:d.comparison,fraction:d.fraction,status:d.status,dayStatus:d.dayStatus,nightStatus:d.nightStatus,
  body:d.body.visible,context:d.context.visible,path:d.path.visible,ticks:d.ticks.visible,cursor:d.cursor.visible,cursorPosition:d.cursor.position.toArray(),
  sun:{scale:d.sun.scale.toArray(),position:d.sun.position.toArray(),diameter:d.photosphere.geometry.parameters.radius*2*d.sun.scale.x},earth:{scale:d.earth.scale.toArray(),position:d.earth.position.toArray(),diameter:d.globe.geometry.parameters.radius*2*d.earth.scale.x},
  sunLocal,lightWorld,time:d.time.value,motion:d.motion.value,daySize:[earthImage.width,earthImage.height],nightSize:[nightImage.width,nightImage.height],nightReady:d.earthMaterial.uniforms.uNightReady.value,
  bounds:d.bounds.getSize(new T.Vector3()).toArray(),boundsCenter:d.bounds.getCenter(new T.Vector3()).toArray(),expectedComparisonBounds:d.bounds.clone().applyMatrix4(g.matrixWorld).getSize(new T.Vector3()).toArray(),comparisonBounds:root.userData.comparisonBodyBounds?.getSize(new T.Vector3()).toArray(),
  scale:g.scale.toArray(),modelPosition:g.position.toArray(),worldScale:root.scale.x,ruler:root.userData.ruler.visible,comparisonRoots,
  framing,camera:{type:camera.type,viewOffsetEnabled:camera.view?.enabled===true,position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),near:camera.near,far:camera.far,fov:camera.fov,earthNearSide:nearSide,earthPosition:projected.toArray(),earthDiameterFraction:camera.isPerspectiveCamera?earthRadius/Math.sqrt(earthEye.lengthSq()-earthRadius*earthRadius)/Math.tan(camera.fov*Math.PI/360):null},
  programs:renderer.info.programs.map((p:any)=>({runnable:p.diagnostics?.runnable!==false})),glError:renderer.getContext().getError()};
});}

function checkView(state:any,whole:any){
 expect(state.finite).toBe(true);expect(state.uniformsFinite).toBe(true);expect(state.body).toBe(true);expect(state.comparison).toBe(false);
 expect(state.geometry).toEqual(whole.geometry);expect(state.bounds).toEqual(whole.bounds);expect(state.scale).toEqual([1,1,1]);for(const value of state.modelPosition)expect(value).toBeCloseTo(0,14);
 expect(state.sun.position).toEqual([-.5,0,0]);expect(state.earth.position).toEqual([.5,0,0]);
 for(const value of state.sun.scale)expect(value).toBeCloseTo(sunScale,13);for(const value of state.earth.scale)expect(value).toBeCloseTo(earthScale,13);
 expect(state.sun.diameter).toBeCloseTo(sunScale,13);expect(state.earth.diameter).toBeCloseTo(earthScale,13);
 expect(state.sun).toEqual(whole.sun);expect(state.earth).toEqual(whole.earth);expect(state.motion).toBe(0);expect(state.programs.every((p:any)=>p.runnable)).toBe(true);expect(state.glError).toBe(0);
 expect([...state.sunLocal,...state.lightWorld,...state.camera.position,state.camera.near,state.camera.far].every(Number.isFinite)).toBe(true);
 expect(Math.hypot(...state.sunLocal)).toBeCloseTo(1,10);expect(state.lightWorld[0]).toBeCloseTo(-1,10);expect(state.lightWorld[1]).toBeCloseTo(0,10);expect(state.lightWorld[2]).toBeCloseTo(0,10);
 expect(state.camera.near).toBeGreaterThan(0);expect(state.camera.near).toBeLessThanOrEqual(.05);
 expect(state.camera.viewOffsetEnabled).toBe(true);
 if(['au-earth','au-terminator'].includes(state.detail)){expect(state.camera.near).toBeLessThan(state.camera.earthNearSide);expect(state.camera.earthDiameterFraction).toBeGreaterThan(.15);expect(state.camera.earthDiameterFraction).toBeLessThan(1);expect(Math.abs(state.camera.earthPosition[0])).toBeLessThan(.05);expect(state.camera.earthPosition[1]).toBeCloseTo(-.16,6);expect(state.context).toBe(false);}
 if(['au-sun','au-earth','au-terminator'].includes(state.detail)){const disc=state.detail==='au-sun'?state.framing.sun:state.framing.earth;expect(state.framing.hudBottom).not.toBeNull();expect(state.framing.footerTop).not.toBeNull();expect(disc.top).toBeGreaterThanOrEqual(state.framing.hudBottom+8);expect(disc.bottom).toBeLessThanOrEqual(state.framing.footerTop-8);}
}

async function passageByKeyboard(page:Page,percent:number){
 const slider=page.getByRole('slider',{name:'Distance along the crossing',exact:true});await slider.focus();
 if(percent===0){await slider.press('End');await slider.press('Home');}else{await slider.press('Home');if(percent===100)await slider.press('End');else for(let i=0;i<percent;i++)await slider.press('ArrowRight');}
 await expect(slider).toHaveValue(String(percent));await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail','au-passage-'+percent);
 const state=await stats(page);expect(state.fraction).toBe(percent/100);expect(state.cursorPosition[0]).toBeCloseTo(-.5+percent/100,12);expect(state.cursorPosition.slice(1)).toEqual([0,0]);return state;
}

async function disposal(page:Page){
 await page.evaluate(()=>{const w=window as any,resources=new Set<any>();w.__auScene.traverse((n:any)=>{if(n.userData.itemId==='au')for(const r of n.userData.resources||[])resources.add(r);});w.__auDisposal={resources:resources.size,disposed:0};for(const resource of resources)resource.addEventListener('dispose',()=>w.__auDisposal.disposed++);});
 await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);const result=await page.evaluate(()=>(window as any).__auDisposal);expect(result.resources).toBeGreaterThan(10);expect(result.disposed).toBe(result.resources);return result;
}

test('AU six guided views retain physical scales, fixed illumination and measured comparison bounds',async({page})=>{
 const errors=await mount(page);await fly(page,'au');await expect(study(page)).toBeVisible();expect(await study(page).getByRole('button').count()).toBe(6);
 await expect.poll(async()=>(await stats(page)).status).toBe('ready');const whole=await stats(page);checkView(whole,whole);expect(whole.daySize).toEqual([2048,1024]);expect(whole.nightSize).toEqual([3600,1800]);expect(whole.nightReady).toBe(1);expect(whole.bounds[0]).toBeCloseTo(1+(sunScale+earthScale)/2,12);expect(whole.bounds[1]).toBeCloseTo(sunScale,12);expect(whole.bounds[2]).toBeCloseTo(sunScale,12);expect(whole.boundsCenter[0]).toBeCloseTo((earthScale-sunScale)/4,12);await shot(page,'au-whole');
 const details:any[]=[];for(const [id,label] of views){await chooseView(page,id,label);const state=await stats(page);checkView(state,whole);details.push({id,...state});await shot(page,id);}
 const beforeOrbit=await stats(page);await page.getByRole('button',{name:'Orbit right',exact:true}).click();await settle(page);const afterOrbit=await stats(page);expect(afterOrbit.camera.quaternion).not.toEqual(beforeOrbit.camera.quaternion);expect(afterOrbit.sunLocal).toEqual(beforeOrbit.sunLocal);expect(afterOrbit.lightWorld).toEqual(beforeOrbit.lightWorld);expect(afterOrbit.sun).toEqual(beforeOrbit.sun);expect(afterOrbit.earth).toEqual(beforeOrbit.earth);
 const samples:any[]=[];for(const value of [0,50,100]){const state=await passageByKeyboard(page,value);checkView(state,whole);samples.push({value,...state});}
 const still=await stats(page);await page.evaluate(()=>new Promise<void>(resolve=>{let frames=0;function next(){if(++frames>=12)resolve();else requestAnimationFrame(next);}requestAnimationFrame(next);}));const later=await stats(page);expect(later.motion).toBe(0);expect(later.time).toBe(still.time);expect(later.geometry).toEqual(still.geometry);
 await compare(page,'au','sun');const compared=await stats(page);expect(compared.comparison).toBe(true);expect(compared.context).toBe(false);expect(compared.cursor).toBe(false);expect(compared.body).toBe(true);expect(compared.motion).toBe(0);expect(compared.scale).toEqual([1,1,1]);expect(compared.geometry).toEqual(whole.geometry);expect(compared.worldScale/compared.comparisonRoots.sun).toBeCloseTo(referenceM/1.392e9,8);expect(compared.comparisonBounds).toBeDefined();for(let i=0;i<3;i++)expect(compared.comparisonBounds[i]).toBeCloseTo(compared.expectedComparisonBounds[i],6);expect(compared.glError).toBe(0);expect(compared.uniformsFinite).toBe(true);expect(compared.camera.viewOffsetEnabled).toBe(false);await shot(page,'au-comparison');
 await fly(page,'sun');const independentSunCamera=await page.evaluate(()=>{const c=(window as any).__auCamera;return{type:c.type,viewOffsetEnabled:c.view?.enabled===true};});expect(independentSunCamera.type).toBe('PerspectiveCamera');expect(independentSunCamera.viewOffsetEnabled).toBe(false);await shot(page,'sun-offset-regression');
 await fly(page,'au');const returned=await stats(page);checkView(returned,whole);await chooseView(page,'au-earth','Earth in sunlight');const pixels=await harness.glPixels(page);expect(pixels).not.toBeNull();expect(looksBlank(pixels!)).toBe(false);expect(errors).toEqual([]);const disposed=await disposal(page);
 writeFileSync(path.join(out,'geometry.json'),JSON.stringify({sourceSha256,whole,details,samples,beforeOrbit,afterOrbit,compared,independentSunCamera,returned,disposed},null,2));
});

test('phone guided views, keyboard crossing and notebook restore retain the selected camera',async({page})=>{
 const errors=await mount(page,true);await fly(page,'au');await expect.poll(async()=>(await stats(page)).status).toBe('ready');const whole=await stats(page),details:any[]=[];
 for(const [id,label] of views){const button=study(page).getByRole('button',{name:label,exact:true});await expect(button).toBeVisible();const rect=await button.boundingBox();expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.x+rect!.width).toBeLessThanOrEqual(360);expect(rect!.height).toBeGreaterThanOrEqual(44);await chooseView(page,id,label);const state=await stats(page);checkView(state,whole);details.push({id,...state});await shot(page,id.replace('au-','au-phone-'));}
 const samples:any[]=[];for(const value of [0,50,100]){const state=await passageByKeyboard(page,value);checkView(state,whole);samples.push({value,...state});}
 const middle=await passageByKeyboard(page,50),book=page.getByRole('region',{name:'Field notebook',exact:true});
 await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('At the halfway distance, Earth remains much smaller than the Sun and both retain their physical diameters.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
 await chooseView(page,'au-earth','Earth in sunlight');await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('Camera approach reveals the day side without enlarging Earth.');await book.getByRole('button',{name:'Save observation',exact:true}).click();const savedEarth=await stats(page);
 await chooseView(page,'au-overview','The full astronomical unit');await book.locator('[data-observation="au:au-passage-50"]').getByRole('button',{name:/^Return to/}).click();await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail','au-passage-50');await expect(page.getByRole('slider',{name:'Distance along the crossing',exact:true})).toHaveValue('50');const restored=await stats(page);checkView(restored,whole);expect(restored.fraction).toBe(middle.fraction);expect(restored.cursorPosition).toEqual(middle.cursorPosition);await shot(page,'au-phone-restored-route');
 await book.locator('[data-observation="au:au-earth"]').getByRole('button',{name:/^Return to/}).click();await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail','au-earth');const restoredEarth=await stats(page);checkView(restoredEarth,whole);for(let i=0;i<3;i++)expect(restoredEarth.camera.position[i]).toBeCloseTo(savedEarth.camera.position[i],9);await shot(page,'au-phone-restored-earth');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);expect(errors).toEqual([]);const disposed=await disposal(page);writeFileSync(path.join(out,'phone-geometry.json'),JSON.stringify({sourceSha256,whole,details,samples,middle,savedEarth,restored,restoredEarth,disposed},null,2));
});
