import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const probes=`const sceneAdd=THREE.Scene.prototype.add;
THREE.Scene.prototype.add=function(...objects){
  if(objects.some(o=>o.name==='drone-geology-ground'||o.name==='exploration-vehicle')) {
    window.__geologyScene=this;
    this.onBeforeRender=function(renderer,scene,camera){window.__geologyRenderer=renderer;};
  }
  return sceneAdd.apply(this,objects);
};`;
const wide=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:1180,height:900,appStyles:true,probes});
const phone=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:360,height:820,appStyles:true,probes});
test.beforeAll(async()=>{await wide.start();await phone.start();});
test.afterAll(async()=>{await wide.stop();await phone.stop();});
test.afterEach(async({page})=>wide.destroy(page));
test.describe.configure({timeout:300000});
test.use({video:'off',trace:'off'});
for(const mode of [
  {planet:'mars',profile:'aeolian-rippled',phone:false,low:false},
  {planet:'pluto',profile:'crevassed-ice',phone:true,low:false},
  {planet:'mercury',profile:'regolith-pitted',phone:false,low:true},
  {planet:'venus',profile:'fractured-basalt',phone:false,low:false}
]) test(mode.planet+' renders grounded geology detail and disposes its resources',async({page},info)=>{
  if(mode.low) await page.addInitScript(()=>Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>4}));
  await page.setViewportSize(mode.phone?{width:360,height:820}:{width:1180,height:900});
  await page.emulateMedia({reducedMotion:'reduce'});
  const harness=mode.phone?phone:wide;
  await harness.mount(page,{solarSystem:{tutorialDismissed:true,selectedPlanet:'stem.solar_sys.'+mode.planet,viewTab:'drone',paused:true}},'document.querySelector("[data-drone-camera-bar]")');
  const canvas=page.locator('[data-drone-canvas]');await canvas.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>!document.getElementById('descent-status'),null,{timeout:60000});
  await expect(canvas).toHaveAttribute('data-drone-geology',mode.profile);
  const count=Number(await canvas.getAttribute('data-drone-fragment-count'));
  expect(count).toBe(mode.low?320:720);
  await expect(page.locator('[data-drone-geology-caption]')).toContainText('appearance alone does not identify a mineral');
  const details=await page.evaluate(()=>{
    const w=window as any,T=w.THREE,scene=w.__geologyScene;
    const ground=scene.getObjectByName('drone-geology-ground'),fragments=scene.getObjectByName('drone-surface-fragments');
    scene.updateMatrixWorld(true);
    const ray=new T.Raycaster(),matrix=new T.Matrix4(),position=new T.Vector3(),rotation=new T.Quaternion(),scale=new T.Vector3();
    const gaps=[];
    for(const i of [0,Math.floor(fragments.count/2),fragments.count-1]){
      fragments.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);
      ray.set(new T.Vector3(position.x,1000,position.z),new T.Vector3(0,-1,0));
      const hit=ray.intersectObject(ground)[0];gaps.push(Math.abs(position.y-hit.point.y-scale.z*0.18));
    }
    const materials=new Set<any>();scene.traverse((o:any)=>{if(o.material?.userData?.geologyProfile)materials.add(o.material);});materials.add(fragments.material);
    w.__geologyDisposals=0;w.__fragmentGeometryDisposed=0;
    materials.forEach((m:any)=>m.addEventListener('dispose',()=>w.__geologyDisposals++));
    fragments.geometry.addEventListener('dispose',()=>w.__fragmentGeometryDisposed++);
    w.__fragmentReference=fragments;
    return {gaps,materials:materials.size,matrixVersion:fragments.instanceMatrix.version,groundVersion:ground.geometry.attributes.position.version,castsShadow:fragments.castShadow,colors:!!fragments.instanceColor,profile:ground.material.userData.geologyProfile};
  });
  expect(Math.max(...details.gaps)).toBeLessThan(0.0001);expect(details.castsShadow).toBe(false);expect(details.colors).toBe(true);expect(details.profile).toBe(mode.profile);
  await page.getByRole('button',{name:'Scene focus',exact:true}).click();
  await page.locator('#drone-fullscreen-container').screenshot({path:info.outputPath(mode.planet+'-geology-follow.png'),timeout:60000});
  await page.getByRole('button',{name:'Survey camera',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-drone-camera-view','survey');
  await page.locator('#drone-fullscreen-container').screenshot({path:info.outputPath(mode.planet+'-geology-survey.png'),timeout:60000});
  const after=await page.evaluate(()=>({matrix:(window as any).__fragmentReference.instanceMatrix.version,ground:(window as any).__geologyScene.getObjectByName('drone-geology-ground').geometry.attributes.position.version}));
  expect(after.matrix).toBe(details.matrixVersion);expect(after.ground).toBe(details.groundVersion);
  if(mode.phone){const bar=await page.locator('[data-drone-camera-bar]').boundingBox();expect(bar!.x).toBeGreaterThanOrEqual(0);expect(bar!.x+bar!.width).toBeLessThanOrEqual(361);}
  expect((await page.evaluate(()=>(window as any).__events.errors)).filter((e:string)=>!/ResizeObserver loop/.test(e))).toEqual([]);
  await harness.destroy(page);
  expect(await page.evaluate(()=>(window as any).__geologyDisposals)).toBe(details.materials);
  expect(await page.evaluate(()=>(window as any).__fragmentGeometryDisposed)).toBe(1);
});
