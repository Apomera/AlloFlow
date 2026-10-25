import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,layout:'document',width:1100,height:850});
const shots='scratch/butterfly-pollinator-view';
test.describe.configure({timeout:240000,retries:0});
test.use({viewport:{width:1100,height:850},reducedMotion:'no-preference',video:'off'});
test.beforeAll(async()=>{mkdirSync(shots,{recursive:true});await harness.start();});
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:Page){
 const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error'&&/shader|webglprogram|validate_status|three\./i.test(message.text()))errors.push(message.text());});
 await page.goto(harness.url+'/__harness');
 await page.evaluate(()=>{
  const w=window as any,original=w.THREE.Scene.prototype.onAfterRender;
  w.__pollinatorPhases={};w.__pollinatorRanBeforePause=false;
  // Observe the tool's real rendered camera and scene; never create a context.
  w.THREE.Scene.prototype.onAfterRender=function(renderer:any,scene:any,camera:any){
   if(this.getObjectByName('visitor-monarch-0')){
    w.__pollinatorScene=this;w.__pollinatorRenderer=renderer;w.__pollinatorCamera=camera;
    const stage=document.querySelector('.bf-stage') as HTMLElement;
    if(stage?.dataset.bfView==='pollinators'){
     const subject=this.getObjectByName(stage.dataset.bfWatchingVisitor);
     if(subject)w.__pollinatorPhases[subject.userData.behavior]=true;
     if(stage.dataset.bfMotionPaused==='false')w.__pollinatorRanBeforePause=true;
    }
   }
   return original.call(this,renderer,scene,camera);
  };
  w.__mount({butterfly:{}});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 });
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','three');
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__pollinatorScene)).toBe(true);
 return errors;
}

async function sceneSnapshot(page:Page){
 return page.evaluate(()=>{
  const w=window as any,scene=w.__pollinatorScene,camera=w.__pollinatorCamera,T=w.THREE;
  const stage=document.querySelector('.bf-stage') as HTMLElement;
  const visitors=[0,1,2,3].map(index=>scene.getObjectByName('visitor-monarch-'+index));
  const watched=scene.getObjectByName(stage.dataset.bfWatchingVisitor),player=scene.getObjectByName('player-monarch');
  let flowersInFrame=0;const detailedFlowers:{geometry:string;count:number;matrix:number[];color:number[]|null}[]=[];
  scene.traverseVisible((object:any)=>{
   if(object.parent?.name==='watched-flower-detail'&&object.isInstancedMesh){
    detailedFlowers.push({geometry:object.geometry.name,count:object.count,matrix:Array.from(object.instanceMatrix.array),color:object.instanceColor?Array.from(object.instanceColor.array):null});
   }
   if(!/^(milkweed-flower-umbel|bergamot-tubular-flower-head)$/.test(object.geometry?.name||''))return;
   const point=new T.Vector3(),matrix=new T.Matrix4();
   const count=object.isInstancedMesh?object.count:1;
   for(let i=0;i<count;i++){
    if(object.isInstancedMesh){object.getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix).applyMatrix4(object.matrixWorld);}
    else object.getWorldPosition(point);
    point.project(camera);
    if(Math.abs(point.x)<1&&Math.abs(point.y)<1&&point.z>-1&&point.z<1)flowersInFrame++;
   }
  });
  return {
   clock:stage.dataset.bfMeadowClock,flightClock:stage.dataset.clock,position:stage.dataset.position,
   camera:camera.matrixWorld.toArray(),frame:w.__pollinatorRenderer.info.render.frame,
   visitors:visitors.map(visitor=>({matrix:visitor.matrixWorld.toArray(),phase:visitor.userData.behavior,legTuck:(visitor.getObjectByName('monarch-body')||visitor.getObjectByName('butterfly-body')).material.userData.visitorLegTuck.value,antennae:(visitor.getObjectByName('monarch-body')||visitor.getObjectByName('butterfly-body')).material.userData.visitorAntennaFlex.value.toArray(),flex:(visitor.getObjectByName('monarch-forewing-left')||visitor.getObjectByName('butterfly-forewing-left')).material.userData.visitorWingFlex.value.toArray(),wings:['left','right'].map(side=>(visitor.getObjectByName('monarch-wing-'+side)||visitor.getObjectByName('butterfly-wing-'+side)).matrixWorld.toArray())})),
   watched:watched?{name:watched.name,speciesId:watched.userData.speciesId,commonName:watched.userData.commonName,scientificName:watched.userData.scientificName,phase:watched.userData.behavior,distance:watched.position.distanceTo(camera.position),center:watched.position.clone().project(camera).toArray()}:null,
   playerSpecies:player.userData.species,playerScale:player.scale.toArray(),
   flowersInFrame,detailedFlowers,
   lights:scene.children.filter((object:any)=>object.isLight).map((light:any)=>({type:light.type,color:light.color.getHex(),intensity:light.intensity,position:light.position.toArray()})),
   energy:document.querySelector('meter')?.getAttribute('value'),
   evidence:JSON.stringify(w.__toolData)
  };
 });
}

async function audit(page:Page){
 expect(await page.evaluate(async()=>{
  const result=await (window as any).axe.run(document.querySelector('[data-butterfly-root]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
  return result.violations.map((violation:any)=>({id:violation.id,nodes:violation.nodes.map((node:any)=>node.failureSummary)}));
 })).toEqual([]);
}

async function coverageSample(page:Page){
 return page.evaluate(()=>{
  const w=window as any,renderer=w.__pollinatorRenderer;
  const record=w.__glRecorder.records.find((entry:any)=>entry.canvas===renderer.domElement);
  // Read the existing renderer's context. Creating a context here would hide
  // a failed tool renderer and could report unrelated antialiasing settings.
  const context=record.ctx;
  return {samples:context.getParameter(context.SAMPLES),antialias:context.getContextAttributes()?.antialias,
   width:renderer.domElement.width,height:renderer.domElement.height,devicePixelRatio:window.devicePixelRatio,
   triangles:renderer.info.render.triangles};
 });
}

function expectCloseVisitor(snapshot:Awaited<ReturnType<typeof sceneSnapshot>>){
 expect(snapshot.watched).not.toBeNull();
 expect(snapshot.watched!.distance).toBeLessThan(15);
 expect(Math.abs(snapshot.watched!.center[0])).toBeLessThan(.75);
 expect(Math.abs(snapshot.watched!.center[1])).toBeLessThan(.75);
 expect(snapshot.watched!.center[2]).toBeGreaterThan(-1);
 expect(snapshot.watched!.center[2]).toBeLessThan(1);
}

test('watching brings a real flower visitor close without flying, and pause freezes the whole view',async({page})=>{
 test.setTimeout(360000);
 const errors=await mount(page),stage=page.locator('.bf-stage'),before=await sceneSnapshot(page);
 await page.getByRole('button',{name:'Watch pollinators',exact:true}).click({timeout:60000});
 // Freeze early in the first visitor's real feeding window. A slow software
 // renderer may need over a minute to complete another full ambient cycle.
 await page.getByRole('button',{name:'Pause all motion',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-view','pollinators');
 await expect(stage).toHaveAttribute('data-bf-watch-patch','bergamot');
 await expect(stage).toHaveAttribute('data-bf-paused','true');
 await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
 expect(await page.evaluate(()=>(window as any).__pollinatorRanBeforePause)).toBe(true);
 expect(await page.evaluate(()=>!!(window as any).__pollinatorPhases.feeding)).toBe(true);
 const watching=page.getByRole('group',{name:'Pollinator watching',exact:true});
 await expect(watching.getByRole('button',{name:'Bergamot visitors',exact:true})).toHaveAttribute('aria-pressed','true');
 const close=await sceneSnapshot(page);expectCloseVisitor(close);
 expect(close.watched!.speciesId).toBe('monarch');
 for(const visitor of close.visitors)if(visitor.phase==='feeding')expect(visitor.legTuck).toBe(0);
 expect(close.playerSpecies).toBe('Danaus plexippus');expect(close.playerScale).toEqual(before.playerScale);
 expect(close.detailedFlowers).toHaveLength(1);
 expect(close.detailedFlowers[0].geometry).toBe('bergamot-tubular-flower-head-close-detail');
 expect(close.detailedFlowers.reduce((count,head)=>count+head.count,0)).toBe(3);
 expect(close.position).toBe(before.position);expect(close.flightClock).toBe(before.flightClock);
 expect(close.energy).toBe(before.energy);expect(close.evidence).toBe(before.evidence);
 const paused=await sceneSnapshot(page);expect(paused.flowersInFrame).toBeGreaterThan(0);await page.waitForTimeout(300);
 expect(await sceneSnapshot(page)).toEqual(paused);
 const lighting=page.getByRole('group',{name:'Meadow lighting',exact:true});
 await lighting.getByRole('button',{name:'Golden hour',exact:true}).click();
 await expect(lighting.getByRole('button',{name:'Golden hour',exact:true})).toHaveAttribute('aria-pressed','true');
 const golden=await sceneSnapshot(page);
 expect(golden.lights).not.toEqual(paused.lights);expect(golden.clock).toBe(paused.clock);
 expect(golden.visitors).toEqual(paused.visitors);expect(golden.position).toBe(before.position);
 expect(golden.energy).toBe(before.energy);expect(golden.evidence).toBe(before.evidence);
 await stage.screenshot({path:shots+'/golden-hour-visitor.png'});
 const goldenCoverage=await coverageSample(page);
 const bergamotHood=await page.evaluate(()=>{
  const w=window as any,T=w.THREE,scene=w.__pollinatorScene,renderer=w.__pollinatorRenderer,original=w.__pollinatorCamera;
  let flower:any;scene.traverseVisible((object:any)=>{if(!flower&&object.parent?.name==='watched-flower-detail'&&object.geometry?.name==='bergamot-tubular-flower-head-close-detail')flower=object;});
  if(!flower)throw new Error('No promoted bergamot flower to inspect');
  const matrix=new T.Matrix4();flower.getMatrixAt(0,matrix);matrix.premultiply(flower.matrixWorld);
  const box=new T.Box3().setFromBufferAttribute(flower.geometry.attributes.position).applyMatrix4(matrix),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),span=Math.max(size.x,size.y,size.z);
  const camera=new T.PerspectiveCamera(36,original.aspect,.01,600);
  camera.position.copy(center).add(new T.Vector3(.75,.45,1.1).multiplyScalar(span*1.8));camera.lookAt(center);camera.updateMatrixWorld(true);
  try{renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png').split(',')[1];}
  finally{renderer.render(scene,original);}
 });
 writeFileSync(shots+'/bergamot-hood-close-detail.png',Buffer.from(bergamotHood,'base64'));
 await watching.getByRole('button',{name:'Milkweed visitors',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-watch-patch','milkweed');
 const milkweed=await sceneSnapshot(page);expectCloseVisitor(milkweed);
 expect(milkweed.detailedFlowers).toHaveLength(1);
 expect(milkweed.detailedFlowers[0].geometry).toBe('milkweed-flower-umbel-close-detail');
 expect(milkweed.detailedFlowers.reduce((count,head)=>count+head.count,0)).toBe(3);
 await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
 await stage.screenshot({path:shots+'/golden-hour-milkweed.png'});
 const corona=await page.evaluate(()=>{
  const w=window as any,T=w.THREE,scene=w.__pollinatorScene,renderer=w.__pollinatorRenderer,original=w.__pollinatorCamera;
  let flower:any;scene.traverseVisible((object:any)=>{if(!flower&&object.parent?.name==='watched-flower-detail'&&object.geometry?.name==='milkweed-flower-umbel-close-detail')flower=object;});
  if(!flower)throw new Error('No promoted milkweed flower to inspect');
  const matrix=new T.Matrix4();flower.getMatrixAt(0,matrix);matrix.premultiply(flower.matrixWorld);
  const box=new T.Box3().setFromBufferAttribute(flower.geometry.attributes.position).applyMatrix4(matrix),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),span=Math.max(size.x,size.y,size.z);
  const camera=new T.PerspectiveCamera(36,original.aspect,.01,600);
  camera.position.copy(center).add(new T.Vector3(.75,.65,1.1).multiplyScalar(span*2.2));camera.lookAt(center);camera.updateMatrixWorld(true);
  renderer.render(scene,camera);const png=renderer.domElement.toDataURL('image/png').split(',')[1];renderer.render(scene,original);return png;
 });
 writeFileSync(shots+'/milkweed-corona-detail.png',Buffer.from(corona,'base64'));
 const speciesButtons=page.getByRole('group',{name:'Butterfly species',exact:true});
 const speciesCoverage:Record<string,Awaited<ReturnType<typeof coverageSample>>>={};
 for(const species of [
  {id:'monarch',name:'Monarch',latin:'Danaus plexippus'},
  {id:'tiger-swallowtail',name:'Eastern tiger swallowtail',latin:'Papilio glaucus'},
  {id:'painted-lady',name:'Painted lady',latin:'Vanessa cardui'},
  {id:'cabbage-white',name:'Cabbage white',latin:'Pieris rapae'}
 ]){
  const button=speciesButtons.getByRole('button',{name:species.name+' '+species.latin,exact:true});
  await button.click();await expect(button).toHaveAttribute('aria-pressed','true');
  await expect(stage).toHaveAttribute('data-bf-watching-species',species.id);
  const card=page.locator('[data-bf-species-card="'+species.id+'"]');
  await expect(card).toContainText(species.name);await expect(card).toContainText(species.latin);
  const specimen=await sceneSnapshot(page);expectCloseVisitor(specimen);
  expect(specimen.watched).toMatchObject({speciesId:species.id,commonName:species.name,scientificName:species.latin});
  expect(specimen.clock).toBe(paused.clock);expect(specimen.visitors).toEqual(paused.visitors);
  expect(specimen.position).toBe(before.position);expect(specimen.energy).toBe(before.energy);expect(specimen.evidence).toBe(before.evidence);
  expect(specimen.playerSpecies).toBe('Danaus plexippus');expect(specimen.playerScale).toEqual(before.playerScale);
  await page.waitForTimeout(150);expect(await sceneSnapshot(page)).toEqual(specimen);
  await stage.screenshot({path:shots+'/golden-hour-'+species.id+'.png'});
  speciesCoverage[species.id]=await coverageSample(page);
  if(species.id==='monarch'||species.id==='cabbage-white'){
   // Resolve both wing-shader families under each real lighting preset.
   await lighting.getByRole('button',{name:'Soft daylight',exact:true}).click();
   await expect(lighting.getByRole('button',{name:'Soft daylight',exact:true})).toHaveAttribute('aria-pressed','true');
   await stage.screenshot({path:shots+'/daylight-'+species.id+'.png'});
   await lighting.getByRole('button',{name:'Golden hour',exact:true}).click();
   await expect(lighting.getByRole('button',{name:'Golden hour',exact:true})).toHaveAttribute('aria-pressed','true');
  }
  if(species.id==='monarch'){
   // Resolve the existing adult surface closely for visual inspection, using
   // the active detailed specimen and renderer. Restore the product camera.
   const anatomy=await page.evaluate(()=>{
    const w=window as any,renderer=w.__pollinatorRenderer,scene=w.__pollinatorScene,original=w.__pollinatorCamera,camera=original.clone();
    camera.zoom=2.3;camera.updateProjectionMatrix();renderer.render(scene,camera);
    const png=renderer.domElement.toDataURL('image/png').split(',')[1];renderer.render(scene,original);return png;
   });
   writeFileSync(shots+'/butterfly-anatomy-detail.png',Buffer.from(anatomy,'base64'));
  }
 }
 await lighting.getByRole('button',{name:'Soft daylight',exact:true}).click();
 expect((await sceneSnapshot(page)).lights).toEqual(before.lights);
 await stage.focus();await stage.press('Space');
 await expect(stage).toHaveAttribute('data-bf-motion-paused','false');
 await expect.poll(()=>stage.getAttribute('data-bf-meadow-clock')).not.toBe(paused.clock);
 // Prove resume above, then freeze the close view before the expensive wide
 // captures. Pause and meadow time must survive both camera changes.
 await stage.press('Space');
 await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
 const stoppedClock=await stage.getAttribute('data-bf-meadow-clock');
 await page.getByRole('button',{name:'Follow view',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-view','follow');
 await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
 expect(await stage.getAttribute('data-bf-meadow-clock')).toBe(stoppedClock);
 await expect(watching).toHaveCount(0);
 expect((await sceneSnapshot(page)).detailedFlowers).toEqual([]);
 expect(await stage.getAttribute('data-position')).toBe(before.position);
 await page.getByRole('button',{name:'Meadow view',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-view','meadow');
 await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
 expect(await stage.getAttribute('data-bf-meadow-clock')).toBe(stoppedClock);
 await stage.screenshot({path:shots+'/daylight-wide-meadow.png'});
 expect(await page.evaluate(()=>{
  const w=window as any;return w.__pollinatorScene.fog.far<w.__pollinatorCamera.far;
 })).toBe(true);
 const coverage={goldenHour:goldenCoverage,species:speciesCoverage,daylightWide:await coverageSample(page)};
 writeFileSync(shots+'/webgl-sampling.json',JSON.stringify(coverage,null,2));
 await test.info().attach('webgl-sampling',{body:JSON.stringify(coverage,null,2),contentType:'application/json'});
 // Inspect the existing woodland shader at a useful scale without allocating
 // another WebGL context or changing any application/learner state.
 const captureWoodlandImage=(floor=false)=>page.evaluate((floor)=>{
  const w=window as any,T=w.THREE,scene=w.__pollinatorScene,renderer=w.__pollinatorRenderer,originalCamera=w.__pollinatorCamera;
  let crown:any;scene.traverseVisible((object:any)=>{if(!crown&&object.geometry?.name==='woodland-branch-leaf-sprays')crown=object;});
  if(!crown)throw new Error('No rendered woodland crown to inspect');
  const matrix=new T.Matrix4();
  if(crown.isInstancedMesh)crown.getMatrixAt(0,matrix);
  matrix.premultiply(crown.matrixWorld);
  const box=new T.Box3().setFromBufferAttribute(crown.geometry.attributes.position).applyMatrix4(matrix),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),span=Math.max(size.x,size.y,size.z);
  const camera=new T.PerspectiveCamera(36,originalCamera.aspect,.1,600);
  if(floor){
   const sun=scene.getObjectByName('meadow-sun'),target=new T.Vector3().setFromMatrixPosition(matrix);
   target.y=.04;target.x-=sun.position.x/sun.position.y*box.max.y*.38;target.z-=sun.position.z/sun.position.y*box.max.y*.38;
   camera.position.copy(target).add(new T.Vector3(span*.55,span*.9,span*.85));camera.lookAt(target);
  }else{camera.position.copy(center).add(new T.Vector3(span*.8,span*.12,span*1.25));camera.lookAt(center);}
  camera.updateMatrixWorld(true);
  renderer.render(scene,camera);
  // An off-center woodland view used to cut the sky at the far plane,
  // exposing the plain background as a large pale polygon above the trees.
  const sky=scene.getObjectByName('meadow-sky');sky.geometry.computeBoundingSphere();
  const skyBounds=sky.geometry.boundingSphere.clone().applyMatrix4(sky.matrixWorld);
  if(skyBounds.center.distanceTo(camera.position)+skyBounds.radius>=camera.far)throw new Error('Woodland view clips the sky dome');
  const png=renderer.domElement.toDataURL('image/png').split(',')[1];
  renderer.render(scene,originalCamera);
  return png;
 },floor);
 writeFileSync(shots+'/woodland-surface-detail.png',Buffer.from(await captureWoodlandImage(),'base64'));
 writeFileSync(shots+'/woodland-floor-daylight.png',Buffer.from(await captureWoodlandImage(true),'base64'));
 const captureTrunkContact=(sunlit=false)=>page.evaluate((sunlit)=>{
  const w=window as any,T=w.THREE,scene=w.__pollinatorScene,renderer=w.__pollinatorRenderer,original=w.__pollinatorCamera;
  const matrix=new T.Matrix4(),point=new T.Vector3(),reference=new T.Vector3(180,0,0);let chosenMatrix:any,nearest=Infinity;
  scene.traverseVisible((object:any)=>{
   if(object.geometry?.name!=='woodland-curved-trunk')return;
   for(let i=0;i<(object.isInstancedMesh?object.count:1);i++){
    if(object.isInstancedMesh)object.getMatrixAt(i,matrix);else matrix.identity();matrix.premultiply(object.matrixWorld);
    const distance=point.set(0,-.5,0).applyMatrix4(matrix).distanceToSquared(reference);
    if(distance<nearest){nearest=distance;chosenMatrix=matrix.clone();}
   }
  });
  if(!chosenMatrix)throw new Error('No rendered woodland trunk to inspect');
  const root=new T.Vector3(0,-.5,0).applyMatrix4(chosenMatrix),radius=new T.Vector3().setFromMatrixColumn(chosenMatrix,0).length()*1.3;
  const camera=new T.PerspectiveCamera(36,original.aspect,.01,600),target=root.clone().add(new T.Vector3(0,radius*.6,0));
  camera.position.copy(root).add(new T.Vector3(radius*3.1*(sunlit?-1:1),radius*1.5,radius*3.8*(sunlit?-1:1)));camera.lookAt(target);camera.updateMatrixWorld(true);
  renderer.render(scene,camera);const png=renderer.domElement.toDataURL('image/png').split(',')[1];renderer.render(scene,original);return png;
 },sunlit);
 writeFileSync(shots+'/woodland-trunk-contact-daylight.png',Buffer.from(await captureTrunkContact(),'base64'));
 writeFileSync(shots+'/woodland-trunk-sunlit-daylight.png',Buffer.from(await captureTrunkContact(true),'base64'));
 const captureDistantBirds=()=>page.evaluate(()=>{
  const w=window as any,T=w.THREE,scene=w.__pollinatorScene,renderer=w.__pollinatorRenderer,original=w.__pollinatorCamera;
  const air=scene.getObjectByName('meadow-atmosphere'),positions=air.geometry.attributes.position,records=air.geometry.attributes.bfParticle;
  let index=-1;for(let i=0;i<records.count;i++)if(records.getW(i)===2){index=i;break;}
  if(index<0)throw new Error('No distant meadow bird to inspect');
  const clock=air.material.uniforms.bfAirClock.value,phase=records.getX(index)*Math.PI*2,flight=phase+clock*records.getZ(index);
  const target=new T.Vector3(Math.cos(flight)*positions.getX(index),positions.getY(index)+2.3*Math.sin(clock*.105+phase),Math.sin(flight)*positions.getZ(index));
  const camera=new T.PerspectiveCamera(52,original.aspect,.1,600);camera.position.set(0,4,0);camera.lookAt(target);camera.updateMatrixWorld(true);
  renderer.render(scene,camera);const png=renderer.domElement.toDataURL('image/png').split(',')[1];renderer.render(scene,original);return png;
 });
 writeFileSync(shots+'/meadow-distant-birds-daylight.png',Buffer.from(await captureDistantBirds(),'base64'));
 const captureGrassLighting=()=>page.evaluate(()=>{
  const w=window as any,T=w.THREE,scene=w.__pollinatorScene,renderer=w.__pollinatorRenderer,original=w.__pollinatorCamera;
  const grass=scene.getObjectByName('shared-meadow-grass'),reference=new T.Vector3(-22,0,-4),matrix=new T.Matrix4(),point=new T.Vector3();
  let root:any,distance=Infinity;
  for(let i=0;i<grass.count;i++){
   grass.getMatrixAt(i,matrix);matrix.premultiply(grass.matrixWorld);
   if(new T.Vector3().setFromMatrixColumn(matrix,1).length()<1.25)continue;
   point.setFromMatrixPosition(matrix);const d=point.distanceToSquared(reference);if(d<distance){distance=d;root=point.clone();}
  }
  if(!root)throw new Error('No tall meadow grass to inspect');
  const camera=new T.PerspectiveCamera(42,original.aspect,.01,600);camera.position.copy(root).add(new T.Vector3(5.8,2,4.2));camera.lookAt(root.clone().add(new T.Vector3(0,.8,0)));camera.updateMatrixWorld(true);
  const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader,uniforms:{} as any};grass.material.onBeforeCompile(shader);
  const controls=[shader.uniforms.bfBreeze,shader.uniforms.bfWindStrength],saved=controls.map(control=>control.value);
  const stage=document.querySelector('.bf-stage') as HTMLElement,state=()=>JSON.stringify({clock:stage.dataset.bfMeadowClock,paused:stage.dataset.bfMotionPaused,evidence:w.__toolData}),before=state();
  let still:string,breeze:string;
  try{
   controls[0].value=4.5;controls[1].value=0;renderer.render(scene,camera);still=renderer.domElement.toDataURL('image/png').split(',')[1];
   controls[1].value=1;renderer.render(scene,camera);breeze=renderer.domElement.toDataURL('image/png').split(',')[1];
  }finally{controls.forEach((control,index)=>{control.value=saved[index];});renderer.render(scene,original);}
  if(state()!==before)throw new Error('Grass lighting capture changed paused meadow state');
  return {still,breeze};
 });
 const daylightGrass=await captureGrassLighting();
 writeFileSync(shots+'/meadow-grass-daylight-still.png',Buffer.from(daylightGrass.still,'base64'));
 writeFileSync(shots+'/meadow-grass-daylight-breeze.png',Buffer.from(daylightGrass.breeze,'base64'));
 const captureBeeImage=()=>page.evaluate(()=>{
  const w=window as any,T=w.THREE,scene=w.__pollinatorScene,renderer=w.__pollinatorRenderer,originalCamera=w.__pollinatorCamera;
  const bee=scene.getObjectByName('meadow-bumblebee');
  if(!bee?.visible)throw new Error('No meadow bee to inspect');
  const box=new T.Box3().setFromObject(bee),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),span=Math.max(size.x,size.y,size.z);
  const camera=new T.PerspectiveCamera(36,originalCamera.aspect,.01,600),offset=new T.Vector3(.65,.45,-.7).multiplyScalar(span*2.4).applyQuaternion(bee.getWorldQuaternion(new T.Quaternion()));
  camera.position.copy(center).add(offset);camera.lookAt(center);camera.updateMatrixWorld(true);
  renderer.render(scene,camera);
  const png=renderer.domElement.toDataURL('image/png').split(',')[1];renderer.render(scene,originalCamera);return png;
 });
 writeFileSync(shots+'/meadow-bee-daylight-detail.png',Buffer.from(await captureBeeImage(),'base64'));
 const seedhead=await page.evaluate(()=>{
  const w=window as any,T=w.THREE,scene=w.__pollinatorScene,renderer=w.__pollinatorRenderer,original=w.__pollinatorCamera;
  let seed:any;scene.traverseVisible((object:any)=>{if(!seed&&object.geometry?.name==='meadow-grass-seed-spike')seed=object;});
  if(!seed)throw new Error('No rendered meadow seed head to inspect');
  const matrix=new T.Matrix4();if(seed.isInstancedMesh)seed.getMatrixAt(0,matrix);matrix.premultiply(seed.matrixWorld);
  const box=new T.Box3().setFromBufferAttribute(seed.geometry.attributes.position).applyMatrix4(matrix),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),span=Math.max(size.x,size.y,size.z);
  const camera=new T.PerspectiveCamera(36,original.aspect,.01,600);
  camera.position.copy(center).add(new T.Vector3(1.,.35,1.1).multiplyScalar(span*2.4));camera.lookAt(center);camera.updateMatrixWorld(true);
  renderer.render(scene,camera);const png=renderer.domElement.toDataURL('image/png').split(',')[1];renderer.render(scene,original);return png;
 });
 writeFileSync(shots+'/meadow-seedhead-detail.png',Buffer.from(seedhead,'base64'));
 const corollas=await page.evaluate(()=>{
  const w=window as any,T=w.THREE,scene=w.__pollinatorScene,renderer=w.__pollinatorRenderer,original=w.__pollinatorCamera;
  let flower:any,matrix:any,distance=Infinity;const candidate=new T.Matrix4(),point=new T.Vector3();
  scene.traverseVisible((object:any)=>{
   if(object.geometry?.name!=='bergamot-tubular-flower-head')return;
   for(let i=0;i<(object.isInstancedMesh?object.count:1);i++){
    if(object.isInstancedMesh)object.getMatrixAt(i,candidate);else candidate.identity();candidate.premultiply(object.matrixWorld);
    if(candidate.elements[0]**2+candidate.elements[1]**2+candidate.elements[2]**2<.01)continue;
    const d=point.setFromMatrixPosition(candidate).distanceTo(original.position);if(d<distance){distance=d;flower=object;matrix=candidate.clone();}
   }
  });
  if(!flower)throw new Error('No rendered bergamot flower to inspect');
  const box=new T.Box3().setFromBufferAttribute(flower.geometry.attributes.position).applyMatrix4(matrix),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),span=Math.max(size.x,size.y,size.z);
  const camera=new T.PerspectiveCamera(36,original.aspect,.01,600);
  camera.position.copy(center).add(new T.Vector3(.75,.45,1.1).multiplyScalar(span*1.8));camera.lookAt(center);camera.updateMatrixWorld(true);
  renderer.render(scene,camera);const still=renderer.domElement.toDataURL('image/png').split(',')[1];
  // Borrow the real shared uniforms for one deterministic breeze frame.
  // Restore them synchronously so paused application and learner state stay exact.
  const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader,uniforms:{} as any};flower.material.onBeforeCompile(shader);
  const controls=[shader.uniforms.bfBreeze,shader.uniforms.bfWindStrength,shader.uniforms.bfPlantWind],saved=controls.map(control=>control.value);
  let breeze:string;
  try{
   controls.forEach((control,index)=>{control.value=index===0?4.5:1;});renderer.render(scene,camera);
   breeze=renderer.domElement.toDataURL('image/png').split(',')[1];
  }finally{controls.forEach((control,index)=>{control.value=saved[index];});renderer.render(scene,original);}
  return {still,breeze};
 });
 writeFileSync(shots+'/bergamot-tube-detail.png',Buffer.from(corollas.still,'base64'));
 writeFileSync(shots+'/bergamot-breeze-lighting.png',Buffer.from(corollas.breeze,'base64'));
 const leaf=await page.evaluate(()=>{
  const w=window as any,T=w.THREE,scene=w.__pollinatorScene,renderer=w.__pollinatorRenderer,original=w.__pollinatorCamera;
  let blade:any,matrix:any;const candidate=new T.Matrix4(),color=new T.Color();
  scene.traverseVisible((object:any)=>{
   if(blade||object.geometry?.name!=='habitat-leaf-blade'||!object.isInstancedMesh||!object.instanceColor)return;
   for(let i=0;i<object.count;i++){object.getColorAt(i,color);if(color.r>1.06){object.getMatrixAt(i,candidate);matrix=candidate.clone().premultiply(object.matrixWorld);blade=object;break;}}
  });
  if(!blade)throw new Error('No rendered mature lower leaf to inspect');
  const box=new T.Box3().setFromBufferAttribute(blade.geometry.attributes.position).applyMatrix4(matrix),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),span=Math.max(size.x,size.y,size.z);
  const camera=new T.PerspectiveCamera(36,original.aspect,.01,600),offset=new T.Vector3(.15,1.1,.95).transformDirection(matrix).multiplyScalar(span*2.);
  camera.position.copy(center).add(offset);camera.lookAt(center);camera.updateMatrixWorld(true);
  renderer.render(scene,camera);const png=renderer.domElement.toDataURL('image/png').split(',')[1];renderer.render(scene,original);return png;
 });
 writeFileSync(shots+'/meadow-leaf-detail.png',Buffer.from(leaf,'base64'));
 await lighting.getByRole('button',{name:'Golden hour',exact:true}).click();
 writeFileSync(shots+'/woodland-golden-hour-detail.png',Buffer.from(await captureWoodlandImage(),'base64'));
 writeFileSync(shots+'/woodland-floor-golden-hour.png',Buffer.from(await captureWoodlandImage(true),'base64'));
 writeFileSync(shots+'/woodland-trunk-contact-golden-hour.png',Buffer.from(await captureTrunkContact(),'base64'));
 writeFileSync(shots+'/woodland-trunk-sunlit-golden-hour.png',Buffer.from(await captureTrunkContact(true),'base64'));
 writeFileSync(shots+'/meadow-distant-birds-golden-hour.png',Buffer.from(await captureDistantBirds(),'base64'));
 const goldenGrass=await captureGrassLighting();
 writeFileSync(shots+'/meadow-grass-golden-hour-still.png',Buffer.from(goldenGrass.still,'base64'));
 writeFileSync(shots+'/meadow-grass-golden-hour-breeze.png',Buffer.from(goldenGrass.breeze,'base64'));
 writeFileSync(shots+'/meadow-bee-golden-hour-detail.png',Buffer.from(await captureBeeImage(),'base64'));
 await lighting.getByRole('button',{name:'Soft daylight',exact:true}).click();
 expect(errors).toEqual([]);
});

test('mobile pollinator watching is still with reduced motion and keeps controls readable',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 const errors=await mount(page),stage=page.locator('.bf-stage');
 await page.getByRole('button',{name:'Take flight',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-paused','false');
 await page.getByRole('button',{name:'Watch pollinators',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-paused','true');
 await expect(stage).toHaveAttribute('data-bf-view','pollinators');
 await expect(page.getByRole('group',{name:'Pollinator watching',exact:true})).toContainText('Fluttering between blossoms');
 const first=await sceneSnapshot(page);expectCloseVisitor(first);
 expect(first.visitors.every(visitor=>visitor.legTuck===0)).toBe(true);
 expect(first.detailedFlowers).toEqual([]);
 await page.waitForTimeout(300);expect(await sceneSnapshot(page)).toEqual(first);
 await stage.screenshot({path:shots+'/mobile-monarch-watch.png'});
 await page.getByRole('button',{name:'Milkweed visitors',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-watch-patch','milkweed');
 expectCloseVisitor(await sceneSnapshot(page));
 await page.getByRole('button',{name:'Golden hour',exact:true}).click();
 await expect(page.getByRole('button',{name:'Golden hour',exact:true})).toHaveAttribute('aria-pressed','true');
 const golden=await sceneSnapshot(page);await page.waitForTimeout(250);expect(await sceneSnapshot(page)).toEqual(golden);
 await page.getByRole('group',{name:'Butterfly species',exact:true}).getByRole('button',{name:'Cabbage white Pieris rapae',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-watching-species','cabbage-white');
 const white=await sceneSnapshot(page);expectCloseVisitor(white);expect(white.detailedFlowers).toEqual([]);
 expect(white.watched!.scientificName).toBe('Pieris rapae');expect(white.playerSpecies).toBe('Danaus plexippus');
 await page.waitForTimeout(250);expect(await sceneSnapshot(page)).toEqual(white);
 await stage.screenshot({path:shots+'/mobile-cabbage-white-watch.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 await page.getByRole('group',{name:'Pollinator watching',exact:true}).scrollIntoViewIfNeeded();
 await page.screenshot({path:shots+'/mobile-controls.png'});
 await audit(page);expect(errors).toEqual([]);
});
