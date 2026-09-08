import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const probes=`const oceanAdd=THREE.Scene.prototype.add;
THREE.Scene.prototype.add=function(...objects){
 if(objects.some(o=>o.name==='ocean-seafloor')) {
  window.__oceanScene=this;window.__oceanFrames=0;
  this.onBeforeRender=function(){window.__oceanFrames++;};
 }
 return oceanAdd.apply(this,objects);
};`;
const wide=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:1180,height:900,appStyles:true,probes});
const phone=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:360,height:820,appStyles:true,probes});
test.beforeAll(async()=>{await wide.start();await phone.start();});
test.afterAll(async()=>{await wide.stop();await phone.stop();});
test.afterEach(async({page})=>wide.destroy(page));
test.describe.configure({timeout:300000});test.use({video:'off',trace:'off'});
for(const mobile of [false,true]) test((mobile?'phone reduced motion':'desktop')+' ocean scenery follows terrain and releases shared resources',async({page},info)=>{
 await page.setViewportSize(mobile?{width:360,height:820}:{width:1180,height:900});
 await page.emulateMedia({reducedMotion:mobile?'reduce':'no-preference'});
 if(mobile)await page.addInitScript(()=>Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>4}));
 const harness=mobile?phone:wide;
 await harness.mount(page,{solarSystem:{tutorialDismissed:true,selectedPlanet:'stem.solar_sys.earth',viewTab:'drone',paused:true}},'document.querySelector("[data-drone-camera-bar]")');
 const canvas=page.locator('[data-drone-canvas]');await canvas.scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>!document.getElementById('descent-status'),null,{timeout:60000});
 await page.waitForFunction(()=>typeof (window as any).THREE.UnrealBloomPass==='function',null,{timeout:60000});
 await expect(canvas).toHaveAttribute('data-drone-ocean-scenery','sediment-garden');
 await expect(page.locator('[data-drone-ocean-caption]')).toContainText('compressed depths and distances');
 const initial=await page.evaluate(()=>{
  const w=window as any,T=w.THREE,scene=w.__oceanScene,ground=scene.getObjectByName('ocean-seafloor');scene.updateMatrixWorld(true);
  const roots=scene.children.filter((o:any)=>o.name.startsWith('ocean-'));
  const kelp=roots.filter((o:any)=>o.name==='ocean-kelp-root'),batches=roots.filter((o:any)=>o.isInstancedMesh);
  const resources=new Set<any>(),ray=new T.Raycaster(),matrix=new T.Matrix4(),position=new T.Vector3(),rotation=new T.Quaternion(),scale=new T.Vector3();
  w.__oceanResources=resources;w.__oceanParts=roots;w.__oceanKelp=kelp;w.__oceanInstances=batches;
  const gaps:number[]=[];let nonFinite=0;
  roots.forEach((root:any)=>root.traverse((o:any)=>{
   if(o.geometry){resources.add(o.geometry);for(const n of o.geometry.attributes.position.array)if(!Number.isFinite(n))nonFinite++;}
   if(o.material){resources.add(o.material);for(const slot of ['map','bumpMap'])if(o.material[slot])resources.add(o.material[slot]);}
  }));
  for(const batch of batches)for(const i of [0,Math.floor(batch.count/2),batch.count-1]){
   batch.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);
   ray.set(new T.Vector3(position.x,50,position.z),new T.Vector3(0,-1,0));
   const hit=ray.intersectObject(ground)[0];gaps.push(Math.abs(position.y-hit.point.y+(batch.name==='ocean-seafloor-stones'?0.025:0.015)));
  }
  for(const root of kelp){ray.set(new T.Vector3(root.position.x,50,root.position.z),new T.Vector3(0,-1,0));gaps.push(Math.abs(root.position.y-ray.intersectObject(ground)[0].point.y));}
  w.__oceanDisposals=[];resources.forEach(r=>{const i=w.__oceanDisposals.length;w.__oceanDisposals.push(0);r.addEventListener('dispose',()=>w.__oceanDisposals[i]++);});
  const vehicle=scene.getObjectByName('exploration-vehicle');ray.set(new T.Vector3(vehicle.position.x,50,vehicle.position.z),new T.Vector3(0,-1,0));w.__oceanFloorY=ray.intersectObject(ground)[0].point.y;
  return {gaps,nonFinite,counts:batches.map((o:any)=>o.count),kelp:kelp.length,rootPositions:kelp.map((o:any)=>o.position.toArray()),sway:kelp[0].rotation.z,frame:w.__oceanFrames,versions:batches.map((o:any)=>o.instanceMatrix.version),textureVersion:ground.material.map.version,flat:ground.material.flatShading,srgb:ground.material.map.encoding===T.sRGBEncoding,linear:ground.material.bumpMap.encoding===T.LinearEncoding,oldOverlay:scene.children.some((o:any)=>o.geometry?.type==='PlaneGeometry'&&o.geometry.parameters.width===120)};
 });
 expect(Math.max(...initial.gaps)).toBeLessThan(0.0001);expect(initial.nonFinite).toBe(0);
 expect(initial.counts).toEqual(mobile?[10,10,10,180]:[18,18,18,420]);expect(initial.kelp).toBe(mobile?14:25);
 expect(initial.flat).toBe(false);expect(initial.srgb).toBe(true);expect(initial.linear).toBe(true);expect(initial.oldOverlay).toBe(false);
 await page.getByRole('button',{name:'Scene focus',exact:true}).click();
 await page.locator('#drone-fullscreen-container').screenshot({path:info.outputPath('ocean-scenery-follow.png'),timeout:60000});
 await page.waitForFunction(frame=>(window as any).__oceanFrames>frame+3,initial.frame);
 if(!mobile){
  await canvas.focus();await page.keyboard.down('KeyE');
  try {await page.waitForFunction(()=>{const w=window as any;return w.__oceanScene.getObjectByName('exploration-vehicle').position.y<w.__oceanFloorY+2;},null,{timeout:150000});}
  finally{await page.keyboard.up('KeyE');}
  await page.locator('#drone-fullscreen-container').screenshot({path:info.outputPath('ocean-scenery-seabed.png'),timeout:60000});
  expect(await page.evaluate(()=>{const w=window as any;return w.__oceanScene.getObjectByName('exploration-vehicle').position.y-w.__oceanFloorY;})).toBeGreaterThanOrEqual(0.49);
 }
 const after=await page.evaluate(()=>{const w=window as any;return {rootPositions:w.__oceanKelp.map((o:any)=>o.position.toArray()),sway:w.__oceanKelp[0].rotation.z,versions:w.__oceanInstances.map((o:any)=>o.instanceMatrix.version),textureVersion:w.__oceanScene.getObjectByName('ocean-seafloor').material.map.version};});
 expect(after.rootPositions).toEqual(initial.rootPositions);expect(after.versions).toEqual(initial.versions);expect(after.textureVersion).toBe(initial.textureVersion);
 if(mobile)expect(after.sway).toBe(0);else expect(after.sway).not.toBe(initial.sway);
 if(mobile){const bar=await page.locator('[data-drone-camera-bar]').boundingBox();expect(bar!.x).toBeGreaterThanOrEqual(0);expect(bar!.x+bar!.width).toBeLessThanOrEqual(361);}
 expect((await page.evaluate(()=>(window as any).__events.errors)).filter((e:string)=>!/ResizeObserver loop/.test(e))).toEqual([]);
 await harness.destroy(page);expect((await page.evaluate(()=>(window as any).__oceanDisposals)).every((n:number)=>n===1)).toBe(true);
});
