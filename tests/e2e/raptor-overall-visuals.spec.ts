import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
const output = process.env.RAPTOR_VISUAL_SCREENSHOTS || resolve('scratch/raptor-flight-review');
const probes = `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.visualScene=scene;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor landscape and instrument finish', () => {
  test.describe.configure({ timeout: 240000 });
  const harness = new GlHarness({ toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:880,height:620,appStyles:true,probes });
  test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});
  test.afterAll(async()=>{await harness.stop();});
  test.afterEach(async({page})=>{await harness.destroy(page);});
  test.beforeEach(async({page})=>{
    await page.setViewportSize({width:960,height:1100});
    await page.addInitScript(()=>{
      let time=1000,id=1,seed=731;const frames=new Map<number,FrameRequestCallback>();
      Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
      performance.now=()=>time;window.requestAnimationFrame=cb=>{const next=id++;frames.set(next,cb);return next;};window.cancelAnimationFrame=key=>{frames.delete(key);};
      (window as any).visualStep=(ms:number)=>{time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
    });
  });
  for(const scene of [
    {id:'peregrine',quality:'balanced',phase:.44,label:'cliffs',width:880},
    {id:'redTail',quality:'low',phase:.44,label:'meadow',width:880},
    {id:'baldEagle',quality:'high',phase:.30,label:'lake',width:880},
    {id:'snowyOwl',quality:'low',phase:.44,label:'snow',width:880},
    {id:'greatHorned',quality:'low',phase:.93,label:'night-mobile',width:320}
  ]) test(`renders ${scene.label} with grounded trees and readable instruments`,async({page})=>{
    const errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',msg=>{if(msg.type()==='error' && /shader|WebGL|GL_INVALID/i.test(msg.text()))errors.push(msg.text());});
    if(scene.width===320){await page.setViewportSize({width:360,height:1000});await page.emulateMedia({reducedMotion:'reduce'});}
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:scene.id,activeMission:'open',flightSession:{speciesId:scene.id,missionId:'open'},huntTutorialDismissed:true,graphicsQuality:scene.quality}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    if(scene.width===320)await page.addStyleTag({content:'#wrap{width:320px}'});
    const canvas=page.locator('[data-raptor-canvas]'),stage=page.locator('[data-raptor-flight-stage]');
    await expect.poll(()=>canvas.evaluate((c:HTMLCanvasElement)=>Math.abs(c.clientWidth-c.parentElement!.clientWidth))).toBeLessThan(2);
    await expect.poll(()=>stage.evaluate(el=>el.getBoundingClientRect().width)).toBeLessThanOrEqual(scene.width);
    if(scene.width===320){
      const header=await page.locator('.rh-active-flight-bar').evaluate(el=>({height:el.getBoundingClientRect().height,copyWidth:el.querySelector('.rh-active-flight-copy')!.getBoundingClientRect().width,overflow:el.scrollWidth-el.clientWidth}));
      expect(header.height).toBeLessThan(170);expect(header.copyWidth).toBeGreaterThan(180);expect(header.overflow).toBeLessThanOrEqual(1);
    }
    await canvas.evaluate((c:any,phase)=>{c._rhCommand('environment',{dayPhase:phase,cloudCover:.18,windSpeed:0});for(let i=0;i<8;i++)(window as any).visualStep(25);},scene.phase);
    await stage.scrollIntoViewIfNeeded();
    await page.screenshot({clip:(await stage.boundingBox())!,path:resolve(output,scene.label+'-flight.png'),timeout:90000});
    const surface=await canvas.evaluate((c:any)=>{
      const w=window as any,T=w.THREE,scene=w.visualScene;
      const terrain=scene.children.find((o:any)=>o.geometry?.parameters?.width===800&&o.geometry?.parameters?.height===800);
      const map=terrain.material.aoMap;if(!map)return null;
      const ctx=map.image.getContext('2d'),pixels=ctx.getImageData(0,0,1024,1024).data;
      const trees=scene.getObjectByName('instanced-forest-trunks'),m=new T.Matrix4(),p=new T.Vector3();
      let trunkShade=0;
      for(let i=0;i<trees.count;i++){trees.getMatrixAt(i,m);p.setFromMatrixPosition(m);const x=Math.floor((p.x/800+.5)*1024),z=Math.floor((p.z/800+.5)*1024);trunkShade+=pixels[(z*1024+x)*4];}
      w.visualMap=map;w.visualMapDisposals=0;map.addEventListener('dispose',()=>w.visualMapDisposals++);
      return {uuid:map.uuid,version:map.version,width:map.image.width,uv2:terrain.geometry.attributes.uv2===terrain.geometry.attributes.uv,meanUnderTree:trunkShade/trees.count,corner:pixels[0],snapshot:c._rhSnapshot()};
    });
    expect(surface).not.toBeNull();
    expect(surface!.width).toBe(1024);expect(surface!.uv2).toBe(true);
    expect(surface!.meanUnderTree).toBeLessThan(180);expect(surface!.corner).toBe(255);
    expect(surface!.snapshot.drawCalls).toBeLessThan(150);
    const layout=await page.locator('.rh-flight-telemetry-strip').evaluate(el=>{
      const r=el.getBoundingClientRect(),host=el.parentElement!.getBoundingClientRect();
      return {left:r.left-host.left,right:host.right-r.right,overflow:el.scrollWidth-el.clientWidth,blur:getComputedStyle(el).backdropFilter};
    });
    expect(layout.left).toBeGreaterThanOrEqual(0);expect(layout.right).toBeGreaterThanOrEqual(0);expect(layout.overflow).toBeLessThanOrEqual(1);expect(layout.blur).toBe('none');
    if(scene.label==='cliffs'){
      const primary=page.locator('.rh-flight-key[data-primary="true"]').first();
      await expect(primary).toBeVisible();
      expect(await primary.evaluate(el=>getComputedStyle(el).borderTopColor)).toBe('rgb(251, 191, 36)');
      expect(await primary.locator('kbd').evaluate(el=>getComputedStyle(el).borderTopColor)).toBe('rgb(251, 191, 36)');
      await page.emulateMedia({forcedColors:'active'});
      expect(await page.locator('.rh-flight-telemetry-strip').evaluate(el=>getComputedStyle(el).backgroundImage)).toBe('none');
      await page.emulateMedia({forcedColors:'none'});
    }
    await page.getByRole('button',{name:'Scenic view',exact:true}).click();
    await expect(page.locator('.rh-flight-telemetry-strip')).toBeHidden();
    await stage.scrollIntoViewIfNeeded();
    await page.screenshot({clip:(await stage.boundingBox())!,path:resolve(output,scene.label+'-scenic.png'),timeout:90000});
    const paused=await canvas.evaluate((c:any)=>{const w=window as any;c._rhCommand('pause');const before=c._rhSnapshot();w.visualStep(60000);return {before,after:c._rhSnapshot(),version:w.visualMap.version,uuid:w.visualMap.uuid};});
    expect(paused.after.motionTimeMs).toBe(paused.before.motionTimeMs);expect(paused.after.raptorPosition).toEqual(paused.before.raptorPosition);
    expect(paused.version).toBe(surface!.version);expect(paused.uuid).toBe(surface!.uuid);
    expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
    await harness.destroy(page);
    expect(await page.evaluate(()=>(window as any).visualMapDisposals)).toBe(1);
  });
});
