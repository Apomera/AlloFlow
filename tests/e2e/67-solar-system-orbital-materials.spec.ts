import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const probes = `const add = THREE.Scene.prototype.add;
THREE.Scene.prototype.add = function(...objects) {
  if(objects.some(o => /^solar-world-/.test(o.name))) {
    window.__solarScene = this;
    this.onBeforeRender = function(renderer, scene, camera) { window.__solarRenderer=renderer; window.__solarCamera=camera; };
  }
  return add.apply(this, objects);
};`;
const harness = new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:1180,height:900,appStyles:true,probes});
const phone = new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:360,height:820,appStyles:true,probes});
test.beforeAll(async()=>{await harness.start();await phone.start();});
test.afterAll(async()=>{await harness.stop();await phone.stop();});
test.afterEach(async({page})=>harness.destroy(page));
test.describe.configure({timeout:300000});
test.use({video:'off',trace:'off'});

test('directional planet materials render and release their GPU textures', async({page},info)=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await harness.mount(page,{solarSystem:{tutorialDismissed:true,paused:true}});
  const canvas=page.locator('canvas.solar3d-canvas'); await canvas.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>!!(window as any).__solarRenderer);
  const state=await page.evaluate(()=>{
    const scene=(window as any).__solarScene;
    const earth=scene.getObjectByName('solar-world-Earth');
    const textures:any[]=[];
    scene.traverse((o:any)=>{const m=o.material;if(!m)return;
      if(m.roughnessMap)textures.push(m.roughnessMap);
      Object.values(m.uniforms||{}).forEach((u:any)=>{if(u.value?.isTexture)textures.push(u.value);});
    });
    const unique=[...new Set(textures)];
    (window as any).__disposedTextures=0;
    unique.forEach(t=>t.addEventListener('dispose',()=>{(window as any).__disposedTextures++;}));
    return {airless:!!scene.getObjectByName('solar-atmosphere-Mercury'), atmosphere:earth._atmosGlow.material.name,metalness:earth.material.metalness,mask:!!earth.material.roughnessMap,textures:unique.length};
  });
  expect(state.airless).toBe(false);expect(state.atmosphere).toBe('solar-directional-atmosphere');expect(state.metalness).toBe(0);expect(state.mask).toBe(true);
  for(const key of ['Earth','Saturn','Mercury']) {
    await page.getByRole('button',{name:'Select planet: stem.solar_sys.'+key.toLowerCase(),exact:true}).click();
    await page.getByRole('button',{name:'Sunlit view',exact:true}).click();
    await page.waitForFunction((key)=>{const scene=(window as any).__solarScene;const world=scene.getObjectByName('solar-world-'+key);return (window as any).__solarCamera.position.distanceTo(world.position)<Number(document.querySelector('canvas.solar3d-canvas')?.getAttribute('data-focus-distance'))+0.15;},key,{timeout:60000});
    await canvas.screenshot({path:info.outputPath(key.toLowerCase()+'-orbital-closeup.png'),timeout:60000});
  }
  await page.getByRole('button',{name:'Select planet: stem.solar_sys.earth',exact:true}).click();
  const position=await page.evaluate(()=>(window as any).__solarScene.getObjectByName('solar-world-Earth').position.toArray());
  await page.getByRole('button',{name:'Crescent view',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-observation-view','crescent');
  await canvas.screenshot({path:info.outputPath('earth-crescent.png'),timeout:60000});
  await page.getByRole('button',{name:'Above orbit',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-observation-view','polar');
  expect(await page.evaluate(()=>(window as any).__solarScene.getObjectByName('solar-world-Earth').position.toArray())).toEqual(position);
  const light=await page.evaluate(()=>{
    const scene=(window as any).__solarScene;const world=scene.getObjectByName('solar-world-Saturn');
    let band:any;world.traverse((o:any)=>{if(o.name==='solar-ring-band')band=o;});
    const expected=new (window as any).THREE.Vector3(0,0,0);band.worldToLocal(expected);
    return expected.distanceTo(band.material.uniforms.localSun.value);
  });
  expect(light).toBeLessThan(0.00001);
  expect((await page.evaluate(()=>(window as any).__events.errors)).filter((e:string)=>!/ResizeObserver loop/.test(e))).toEqual([]);
  await harness.destroy(page);
  expect(await page.evaluate(()=>(window as any).__disposedTextures)).toBe(state.textures);
});

test('phone orbital closeup retains keyboard camera and live materials',async({page},info)=>{
  await page.setViewportSize({width:360,height:820});
  await page.emulateMedia({reducedMotion:'reduce'});
  await phone.mount(page,{solarSystem:{tutorialDismissed:true,paused:true}});
  const canvas=page.locator('canvas.solar3d-canvas');await canvas.scrollIntoViewIfNeeded();
  await page.getByRole('button',{name:'Select planet: stem.solar_sys.saturn',exact:true}).click();
  await page.getByRole('button',{name:'Sunlit view',exact:true}).click();
  await page.waitForFunction(()=>{const scene=(window as any).__solarScene;return (window as any).__solarCamera.position.distanceTo(scene.getObjectByName('solar-world-Saturn').position)<Number(document.querySelector('canvas.solar3d-canvas')?.getAttribute('data-focus-distance'))+0.15;},null,{timeout:60000});
  const before=await canvas.getAttribute('data-camera');await canvas.press('ArrowRight');
  await expect(canvas).not.toHaveAttribute('data-camera',before!);
  const box=await canvas.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(361);
  const note=await page.locator('#solar3d-model-note').boundingBox();
  expect(note!.y).toBeGreaterThanOrEqual(box!.y+box!.height);
  const viewpoints=page.getByRole('group',{name:'Orbital observation viewpoints'});
  for(const button of await viewpoints.getByRole('button').all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await canvas.screenshot({path:info.outputPath('saturn-orbital-phone.png'),timeout:60000});
  expect(await page.evaluate(()=>(window as any).__toolData.solarSystem.paused)).toBe(true);
  expect((await page.evaluate(()=>(window as any).__events.errors)).filter((e:string)=>!/ResizeObserver loop/.test(e))).toEqual([]);
});
