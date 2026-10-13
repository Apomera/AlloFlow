import {test,expect,type Page} from '@playwright/test';
import {GlHarness,looksBlank} from './helpers/stem_gl_harness';
import {showScaleExplorerTools} from './helpers/scale_explorer_workspace';
import {mkdirSync,writeFileSync,appendFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';

test.describe.configure({mode:'serial',retries:0,timeout:420000});
test.use({video:'off',trace:'off',hasTouch:true});
const out=path.resolve(process.env.SCALE_CENTAURI_REPORT_DIR||'reports/scale-explorer-centauri');
const sourceSha256=createHash('sha256').update(readFileSync('stem_lab/stem_tool_scaleexplorer.js')).digest('hex');
const cv=(p:Page)=>p.locator('[data-atlas-ready]');
const study=(p:Page)=>p.getByRole('region',{name:'Alpha Centauri observatory',exact:true});
const views=[['cen-overview','Across interstellar space'],['cen-system','Three stellar neighbours'],['cen-binary','The A/B binary'],['cen-a','Alpha Centauri A'],['cen-b','Alpha Centauri B'],['cen-proxima','Proxima Centauri'],['cen-sun','Return to the Sun']] as const;
const referenceM=4.1e16,auM=149597870700,massA=1.1055,massB=.9373;
const diameters:any={sun:1.392e9,a:2*1.2234*695700000,b:2*.8632*695700000,proxima:2*.1542*695700000};
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;window.__cenRenderer=r;r.render=function(scene,camera){if(!r.getRenderTarget()){window.__cenScene=scene;window.__cenCamera=camera;}return render.apply(this,arguments);};return r;}});`});
test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();expect(createHash('sha256').update(readFileSync('stem_lab/stem_tool_scaleexplorer.js')).digest('hex')).toBe(sourceSha256);});
test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:Page,phone=false,regularMotion=false){
 const diagnostic=path.join(out,phone?'phone-diagnostics.txt':'desktop-diagnostics.txt'),errors:string[]=[];
 writeFileSync(diagnostic,'Mount '+new Date().toISOString()+'\n');
 page.on('console',m=>{if(m.type()==='error'||m.type()==='warning'||/context.*lost|WebGL/i.test(m.text()))appendFileSync(diagnostic,new Date().toISOString()+' '+m.type()+': '+m.text()+'\n');if(m.type()==='error')errors.push(m.text());});
 page.on('pageerror',e=>{appendFileSync(diagnostic,new Date().toISOString()+' pageerror: '+e.message+'\n');errors.push(e.message);});
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;(HTMLCanvasElement.prototype as any).getContext=function(type:string,...args:any[]){return type==='webgl2'?null:original.apply(this,[type,...args] as any);};});
 await page.emulateMedia({reducedMotion:regularMotion?'no-preference':'reduce'});await page.setViewportSize({width:phone?360:1400,height:phone?900:1100});
 await harness.mount(page,{_scaleExplorer:{ambient:false,yourHeightCm:phone?220:null}},'!!document.querySelector("[data-atlas-ready]")');
 await showScaleExplorerTools(page);await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});return errors;
}
async function settle(page:Page){await cv(page).scrollIntoViewIfNeeded();await expect.poll(()=>page.evaluate(async()=>{const c=(window as any).__cenCamera,p=c.position.clone(),q=c.quaternion.clone();await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));return Math.max(p.distanceTo(c.position),...q.toArray().map((v:number,i:number)=>Math.abs(v-c.quaternion.toArray()[i])));})).toBeLessThan(1e-9);}
async function fly(page:Page,id:string){await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);await expect(cv(page)).toHaveAttribute('data-atlas-objects',id);await settle(page);}
async function compare(page:Page,a:string,b:string){const box=page.locator('.sx-comparison-workbench');if(await box.getAttribute('open')===null)await box.locator(':scope > summary').click();await box.getByRole('combobox',{name:'First thing',exact:true}).selectOption(a);await box.getByRole('combobox',{name:'Second thing',exact:true}).selectOption(b);await box.getByRole('button',{name:'Compare them',exact:true}).click();await expect(cv(page)).toHaveAttribute('data-atlas-comparison',a+':'+b);await settle(page);}
async function shot(page:Page,name:string){await settle(page);await page.locator('.sx-stage').screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:82});}
async function chooseView(page:Page,id:string,label:string){const b=study(page).getByRole('button',{name:label,exact:true});await b.focus();await b.press('Enter');await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail',id);await expect(b).toHaveAttribute('aria-pressed','true');}
async function phaseByKeyboard(page:Page,phase:number){const slider=page.getByRole('slider',{name:'Binary orbital phase',exact:true});await slider.focus();await slider.press('Home');if(phase===100)await slider.press('End');else for(let i=0;i<phase;i++)await slider.press('ArrowRight');await expect(slider).toHaveValue(String(phase));await settle(page);expect((await stats(page)).phase).toBe(phase);}

async function stats(page:Page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,scene=w.__cenScene,camera=w.__cenCamera,renderer=w.__cenRenderer;let root:any;
 scene.traverse((n:any)=>{if(n.userData.itemId==='alpha-cen-dist'&&n.visible)root=n;});if(!root)throw new Error('Centauri model is not visible');
 const g=root.userData.model,d=g.userData.centauri,geometry:any[]=[];let finite=true,uniformsFinite=true;
 const finiteValue=(v:any):boolean=>typeof v==='number'?Number.isFinite(v):v?.isVector2||v?.isVector3||v?.isVector4||v?.isQuaternion?v.toArray().every(Number.isFinite):v?.isMatrix3||v?.isMatrix4?v.elements.every(Number.isFinite):Array.isArray(v)||ArrayBuffer.isView(v)?Array.from(v as any).every(x=>typeof x!=='number'||Number.isFinite(x)):true;
 g.traverse((n:any)=>{const geo=n.geometry,p=geo?.attributes?.position;if(p){let sum=0,weighted=0;for(let i=0;i<p.array.length;i++){const value=p.array[i];finite=finite&&Number.isFinite(value);sum+=value;weighted+=value*(i%101+1);}geometry.push({name:n.name,uuid:geo.uuid,count:p.count,version:p.version,sum,weighted,indexCount:geo.index?.count||0,material:Array.isArray(n.material)?n.material.map((m:any)=>m.uuid):n.material?.uuid});}for(const m of Array.isArray(n.material)?n.material:n.material?[n.material]:[])for(const u of Object.values(m.uniforms||{}))uniformsFinite=uniformsFinite&&finiteValue((u as any).value);});
 const canvasRect=renderer.domElement.getBoundingClientRect(),hud=document.querySelector('.sx-hud')?.getBoundingClientRect(),footer=document.querySelector('.sx-stage-note')?.getBoundingClientRect(),stars:any={};
 for(const id of ['sun','a','b','proxima']){const node=d.stars[id],surface=d.surfaces[id],world=node.getWorldPosition(new T.Vector3()),radius=surface.geometry.parameters.radius*node.getWorldScale(new T.Vector3()).x,distance=camera.position.distanceTo(world),projected=world.clone().project(camera),pixelRadius=radius/Math.sqrt(distance*distance-radius*radius)/Math.tan(camera.fov*Math.PI/360)*canvasRect.height/2,cy=(1-projected.y)*canvasRect.height/2;
  const cx=(projected.x+1)*canvasRect.width/2;stars[id]={scale:node.scale.toArray(),position:node.position.toArray(),world:world.toArray(),diameter:surface.geometry.parameters.radius*2*node.scale.x,radius,distance,nearSide:distance-radius,projected:projected.toArray(),frame:{top:cy-pixelRadius,bottom:cy+pixelRadius,left:cx-pixelRadius,right:cx+pixelRadius,center:cy,diameter:pixelRadius*2},visible:node.visible};}
 const pins=Array.from(document.querySelectorAll('[data-centauri-pin]')).filter((n:any)=>!n.hidden).map((n:any)=>{const r=n.getBoundingClientRect(),marker=d.markers[n.dataset.centauriPin],world=marker.getWorldPosition(new T.Vector3()),projected=world.clone().project(camera),radius=marker.geometry.parameters.radius*marker.getWorldScale(new T.Vector3()).x,distance=camera.position.distanceTo(world),pixelRadius=radius/Math.sqrt(distance*distance-radius*radius)/Math.tan(camera.fov*Math.PI/360)*canvasRect.height/2;return{id:n.dataset.centauriPin,left:r.left-canvasRect.left,top:r.top-canvasRect.top,right:r.right-canvasRect.left,bottom:r.bottom-canvasRect.top,marker:{x:(projected.x+1)*canvasRect.width/2,y:(1-projected.y)*canvasRect.height/2,radius:pixelRadius}};});
 const comparisonRoots:any={};scene.traverse((n:any)=>{if(n.userData.itemId&&n.visible)comparisonRoots[n.userData.itemId]=n.scale.x;});
 const markers:any={};for(const [id,n] of Object.entries(d.markers))markers[id]={visible:(n as any).visible,position:(n as any).position.toArray()};
 return{finite,uniformsFinite,geometry,pins,detail:d.detail,phase:d.phase,zoom:d.zoom,comparison:d.comparison,stars,markers,body:d.body.visible,context:d.context.visible,guides:d.guides.visible,orbits:d.orbits.visible,reference:d.reference.visible,time:d.time.value,motion:d.motion.value,
  bounds:d.bounds.getSize(new T.Vector3()).toArray(),boundsCenter:d.bounds.getCenter(new T.Vector3()).toArray(),expectedComparisonBounds:d.bounds.clone().applyMatrix4(g.matrixWorld).getSize(new T.Vector3()).toArray(),comparisonBounds:root.userData.comparisonBodyBounds?.getSize(new T.Vector3()).toArray(),
  scale:g.scale.toArray(),modelPosition:g.position.toArray(),worldScale:root.scale.x,ruler:root.userData.ruler.visible,comparisonRoots,
  framing:{canvasHeight:canvasRect.height,canvasWidth:canvasRect.width,hudBottom:hud?hud.bottom-canvasRect.top:null,footerTop:footer?footer.top-canvasRect.top:null},
  camera:{type:camera.type,viewOffsetEnabled:camera.view?.enabled===true,position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),near:camera.near,far:camera.far,fov:camera.fov},
  persisted:w.__toolData._scaleExplorer.atlasCentauriPhase??0,programs:renderer.info.programs.map((p:any)=>({runnable:p.diagnostics?.runnable!==false})),glError:renderer.getContext().getError()};
});}

function checkView(state:any,whole:any){
 expect(state.finite).toBe(true);expect(state.uniformsFinite).toBe(true);expect(state.comparison).toBe(false);expect(state.geometry).toEqual(whole.geometry);expect(state.bounds).toEqual(whole.bounds);expect(state.scale).toEqual([1,1,1]);for(const value of state.modelPosition)expect(value).toBeCloseTo(0,14);
 expect(state.stars.sun.position).toEqual([-.5,0,0]);expect(state.stars.proxima.position).toEqual(whole.stars.proxima.position);
 for(const id of ['sun','a','b','proxima']){expect(state.stars[id].scale).toEqual(whole.stars[id].scale);expect(state.stars[id].diameter).toBe(whole.stars[id].diameter);expect(state.stars[id].scale[0]).toBeCloseTo(diameters[id]/referenceM,20);expect(state.stars[id].diameter).toBeCloseTo(diameters[id]/referenceM,20);expect(state.stars[id].visible).toBe(true);expect(state.stars[id].distance).toBeGreaterThan(state.stars[id].radius);}
 expect(state.body).toBe(true);expect(state.motion).toBe(0);expect(state.context).toBe(state.zoom<1e6);expect(state.guides).toBe(state.zoom<5000);expect(state.orbits).toBe(state.zoom>=1000&&state.zoom<1e6);expect(state.reference).toBe(state.zoom<=20);
 const visibleMarkers=state.zoom>=1e6?[]:state.zoom<=20?['sun','ab','proxima']:state.zoom<5000?['ab','proxima']:['a','b'];for(const [id,marker] of Object.entries(state.markers))expect((marker as any).visible).toBe(visibleMarkers.includes(id));
 expect(state.programs.every((p:any)=>p.runnable)).toBe(true);expect(state.glError).toBe(0);expect([...state.camera.position,state.camera.near,state.camera.far].every(Number.isFinite)).toBe(true);expect(state.camera.near).toBeGreaterThan(0);expect(state.camera.near).toBeLessThanOrEqual(.05);expect(state.camera.viewOffsetEnabled).toBe(true);expect(state.persisted).toBe(state.phase);
 const a=state.stars.a.position,b=state.stars.b.position;for(let i=0;i<3;i++)expect((a[i]*massA+b[i]*massB)/(massA+massB)).toBeCloseTo(i===0?.5:0,14);
 const separation=Math.hypot(...a.map((v:number,i:number)=>v-b[i]))*referenceM/auM;expect(separation).toBeGreaterThanOrEqual(23.5448*(1-.5208)-1e-8);expect(separation).toBeLessThanOrEqual(23.5448*(1+.5208)+1e-8);
 for(const pin of state.pins){expect(pin.top).toBeGreaterThanOrEqual(state.framing.hudBottom+9.4);expect(pin.bottom).toBeLessThanOrEqual(state.framing.footerTop-9.4);expect(pin.left).toBeGreaterThanOrEqual(7.4);expect(pin.right).toBeLessThanOrEqual(state.framing.canvasWidth-7.4);const m=pin.marker,nearestX=Math.max(pin.left,Math.min(m.x,pin.right)),nearestY=Math.max(pin.top,Math.min(m.y,pin.bottom));expect(Math.hypot(m.x-nearestX,m.y-nearestY),pin.id+' guide dot stays clear of its label').toBeGreaterThan(m.radius);}
 for(let i=0;i<state.pins.length;i++)for(let j=i+1;j<state.pins.length;j++){const a=state.pins[i],b=state.pins[j];expect(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top).toBe(false);}
 const starId=state.detail.replace('cen-','');
 if(['a','b','proxima','sun'].includes(starId)){
  const star=state.stars[starId];expect(state.camera.near).toBeLessThan(star.nearSide);expect(star.frame.diameter/state.framing.canvasHeight).toBeGreaterThan(.1);expect(star.frame.diameter/state.framing.canvasHeight).toBeLessThan(.95);expect(Math.abs(star.projected[0])).toBeLessThan(.06);expect(star.projected[1]).toBeCloseTo(-.16,4);
  expect(state.framing.hudBottom).not.toBeNull();expect(state.framing.footerTop).not.toBeNull();expect(star.frame.top).toBeGreaterThanOrEqual(state.framing.hudBottom+8);expect(star.frame.bottom).toBeLessThanOrEqual(state.framing.footerTop-8);expect(star.frame.left).toBeGreaterThanOrEqual(8);expect(star.frame.right).toBeLessThanOrEqual(state.framing.canvasWidth-8);expect(state.context).toBe(false);
 }
}
async function disposal(page:Page){await page.evaluate(()=>{const w=window as any,resources=new Set<any>();w.__cenScene.traverse((n:any)=>{if(n.userData.itemId==='alpha-cen-dist')for(const r of n.userData.resources||[])resources.add(r);});w.__cenDisposal={resources:resources.size,disposed:0};for(const resource of resources)resource.addEventListener('dispose',()=>w.__cenDisposal.disposed++);});await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);const result=await page.evaluate(()=>(window as any).__cenDisposal);expect(result.resources).toBeGreaterThan(10);expect(result.disposed).toBe(result.resources);return result;}

for(const phone of [false,true])test((phone?'phone':'desktop')+' Centauri views, Kepler phase, stable geometry, saved state and comparison',async({page})=>{
 const errors=await mount(page,phone);await fly(page,'alpha-cen-dist');await expect(study(page)).toBeVisible();expect(await study(page).getByRole('button').count()).toBe(7);
 const whole=await stats(page),details:any[]=[];writeFileSync(path.join(out,phone?'phone-initial.json':'initial.json'),JSON.stringify({sourceSha256,whole},null,2));checkView(whole,whole);
 for(const phase of [0,25,50,100]){
  await phaseByKeyboard(page,phase);
  for(const [id,label] of views){
   const button=study(page).getByRole('button',{name:label,exact:true});await expect(button).toBeVisible();const rect=await button.boundingBox();expect(rect!.height).toBeGreaterThanOrEqual(44);if(phone){expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.x+rect!.width).toBeLessThanOrEqual(360);}
   await chooseView(page,id,label);const state=await stats(page);details.push({id,phase,...state});writeFileSync(path.join(out,phone?'phone-progress.json':'progress.json'),JSON.stringify({sourceSha256,details},null,2));await shot(page,(phone?'phone-':'desktop-')+id+'-phase-'+phase);checkView(state,whole);expect(state.phase).toBe(phase);
  }
 }
 await chooseView(page,'cen-a','Alpha Centauri A');await phaseByKeyboard(page,25);const phase25=await stats(page);checkView(phase25,whole);
 const still=await stats(page);await page.evaluate(()=>new Promise<void>(resolve=>{let frames=0;function next(){if(++frames>=12)resolve();else requestAnimationFrame(next);}requestAnimationFrame(next);}));const later=await stats(page);expect(later.time).toBe(still.time);expect(later.geometry).toEqual(still.geometry);expect(later.stars).toEqual(still.stars);
 const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('Alpha Centauri A at one quarter of the binary orbit retains its measured diameter.');await book.getByRole('button',{name:'Save observation',exact:true}).click();const savedA=await stats(page);
 await chooseView(page,'cen-proxima','Proxima Centauri');await phaseByKeyboard(page,50);await book.getByRole('textbox',{name:'What do you notice?',exact:true}).fill('Proxima remains separate from the A/B pair.');await book.getByRole('button',{name:'Save observation',exact:true}).click();const savedProxima=await stats(page);
 await phaseByKeyboard(page,100);await chooseView(page,'cen-overview','Across interstellar space');
 const restored:any[]=[];for(const [id,phase,saved] of [['cen-a',25,savedA],['cen-proxima',50,savedProxima]] as const){
  await book.locator('[data-observation="alpha-cen-dist:'+id+'"]').getByRole('button',{name:/^Return to/}).click();await settle(page);await expect(cv(page)).toHaveAttribute('data-atlas-detail',id);await expect(page.getByRole('slider',{name:'Binary orbital phase',exact:true})).toHaveValue(String(phase));const state=await stats(page);checkView(state,whole);expect(state.phase).toBe(phase);for(const starId of ['sun','a','b','proxima']){expect(state.stars[starId].position).toEqual(saved.stars[starId].position);expect(state.stars[starId].scale).toEqual(saved.stars[starId].scale);}for(let i=0;i<3;i++)expect(state.camera.position[i]).toBeCloseTo(saved.camera.position[i],12);restored.push(state);await shot(page,(phone?'phone-':'desktop-')+'restored-'+id);
 }
 await compare(page,'alpha-cen-dist','sun');const compared=await stats(page);expect(compared.comparison).toBe(true);expect(compared.context).toBe(false);expect(compared.guides).toBe(false);expect(compared.orbits).toBe(false);expect(compared.scale).toEqual([1,1,1]);expect(compared.geometry).toEqual(whole.geometry);expect(compared.worldScale/compared.comparisonRoots.sun).toBeCloseTo(referenceM/1.392e9,5);expect(compared.comparisonBounds).toBeDefined();for(let i=0;i<3;i++)expect(compared.comparisonBounds[i]).toBeCloseTo(compared.expectedComparisonBounds[i],6);expect(compared.glError).toBe(0);expect(compared.uniformsFinite).toBe(true);expect(compared.camera.viewOffsetEnabled).toBe(false);await shot(page,(phone?'phone-':'desktop-')+'comparison');
 await fly(page,'sun');const independentSunCamera=await page.evaluate(()=>{const c=(window as any).__cenCamera;return{type:c.type,viewOffsetEnabled:c.view?.enabled===true};});expect(independentSunCamera.type).toBe('PerspectiveCamera');expect(independentSunCamera.viewOffsetEnabled).toBe(false);
 await fly(page,'alpha-cen-dist');await chooseView(page,'cen-a','Alpha Centauri A');const returned=await stats(page);checkView(returned,whole);const pixels=await harness.glPixels(page);expect(pixels).not.toBeNull();expect(looksBlank(pixels!)).toBe(false);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);expect(errors).toEqual([]);const disposed=await disposal(page);
 writeFileSync(path.join(out,phone?'phone-geometry.json':'geometry.json'),JSON.stringify({sourceSha256,whole,details,phase25,still,later,savedA,savedProxima,restored,compared,independentSunCamera,returned,disposed},null,2));
});


test('regular-motion Centauri approach diagnostic',async({page})=>{
 const errors=await mount(page,false,true);await fly(page,'alpha-cen-dist');
 const approaches:any[]=[];
 for(const [id,label,starId] of [['cen-proxima','Proxima Centauri','proxima'],['cen-a','Alpha Centauri A','a']]){
  await chooseView(page,'cen-overview','Across interstellar space');
  await page.evaluate((starId)=>{
   const w=window as any;w.__approachSamples=[];w.__approachStart=performance.now();w.__approachStop=false;
   function sample(){const scene=w.__cenScene,c=w.__cenCamera,T=w.THREE;let model:any;scene.traverse((n:any)=>{if(n.userData.itemId==='alpha-cen-dist'&&n.visible)model=n.userData.model;});const d=model.userData.centauri,p=d.stars[starId].getWorldPosition(new T.Vector3()).project(c);w.__approachSamples.push({ms:performance.now()-w.__approachStart,detail:d.detail,zoom:d.zoom,projected:p.toArray(),cameraPosition:c.position.toArray()});if(!w.__approachStop)requestAnimationFrame(sample);}requestAnimationFrame(sample);
  },starId);
  const button=study(page).getByRole('button',{name:label,exact:true});await button.focus();await button.press('Enter');
  await cv(page).scrollIntoViewIfNeeded();
  await page.waitForTimeout(8000);
  const samples=await page.evaluate(()=>{const w=window as any;w.__approachStop=true;return w.__approachSamples;});
  await settle(page);const final=await stats(page);await shot(page,'regular-motion-'+id);
  const active=samples.filter((x:any)=>x.detail===id);const outside=active.filter((x:any)=>Math.abs(x.projected[0])>1||Math.abs(x.projected[1])>1||x.projected[2]<=-1||x.projected[2]>=1);
  approaches.push({id,starId,samples,activeFrames:active.length,outsideFrames:outside.length,firstOutside:outside[0],lastOutside:outside.at(-1),maxAbsoluteXY:Math.max(...active.flatMap((x:any)=>x.projected.slice(0,2).map(Math.abs))),final});
  writeFileSync(path.join(out,'regular-motion-approach.json'),JSON.stringify({sourceSha256,approaches},null,2));
 }
 for(const approach of approaches){expect(approach.activeFrames).toBeGreaterThan(30);expect(approach.outsideFrames,approach.id+' stays within the viewport during approach').toBe(0);}
 expect(errors).toEqual([]);
});
