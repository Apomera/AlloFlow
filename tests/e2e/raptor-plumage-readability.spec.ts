import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
test.use({video:'off'});
const output=process.env.RAPTOR_PLUMAGE_SCREENSHOTS||resolve('scratch/raptor-flight-review');
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);window.plumageRenderer=r;r.render=function(scene,camera){window.plumageScene=scene;window.plumageCamera=camera;const bird=scene.getObjectByName('raptor-head-rig')?.parent;const material=bird?.getObjectByName('layered-flight-feathers--1')?.material;window.plumageModeAtRender=material?.userData.plumageContrastUniform?.value.z;return render(scene,camera);};return r;};})();`;
test.describe('Raptor plumage visibility in habitat and studio',()=>{
  test.describe.configure({timeout:240000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:880,height:620,appStyles:true,probes});
  test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});
  test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});
  test.beforeEach(async({page})=>{
    await page.setViewportSize({width:960,height:1100});
    await page.addInitScript(()=>{
      let time=1000,id=1,seed=731;const frames=new Map<number,FrameRequestCallback>();
      Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;
      window.requestAnimationFrame=cb=>{const next=id++;frames.set(next,cb);return next;};window.cancelAnimationFrame=key=>{frames.delete(key);};
      (window as any).plumageStep=(ms:number)=>{time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
    });
  });
  for(const model of [
    {species:'greatHorned',phase:.93,label:'night-owl',quality:'low',sign:1},
    {species:'snowyOwl',phase:.44,label:'snowy-owl',quality:'balanced',sign:-1},
    {species:'peregrine',phase:.44,label:'day-falcon',quality:'low',sign:0}
  ])test(`keeps ${model.label} readable without changing the flight or studio`,async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(message.text()))errors.push(message.text());});
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:model.species,activeMission:'open',flightSession:{speciesId:model.species,missionId:'open'},huntTutorialDismissed:true,graphicsQuality:model.quality}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    const canvas=page.locator('[data-raptor-canvas]'),stage=page.locator('[data-raptor-flight-stage]');
    await canvas.evaluate((c:any,phase)=>{c._rhCommand('environment',{windSpeed:0,dayPhase:phase,cloudCover:.18});for(let i=0;i<12;i++)(window as any).plumageStep(25);},model.phase);
    await page.getByRole('button',{name:'Scenic view',exact:true}).click();
    await stage.screenshot({path:resolve(output,model.label+'-flight.png'),timeout:90000});
    const compared=await canvas.evaluate((c:any)=>{
      const w=window as any,bird=w.plumageScene.getObjectByName('raptor-head-rig').parent;
      const feather=bird.getObjectByName('layered-flight-feathers--1').material,uniform=feather.userData.plumageContrastUniform;
      const copy=document.createElement('canvas');copy.width=c.width;copy.height=c.height;const ctx=copy.getContext('2d')!;
      const pixels=()=>{ctx.drawImage(c,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
      // Compare identical direct draws after the frame's scheduled shadow update.
      w.plumageRenderer.render(w.plumageScene,w.plumageCamera);
      const snapshot=c._rhSnapshot(),on=pixels(),beforeCalls=w.plumageRenderer.info.render.calls;
      const textureCount=w.plumageRenderer.info.memory.textures,geometryCount=w.plumageRenderer.info.memory.geometries;
      uniform.value.z=0;w.plumageRenderer.render(w.plumageScene,w.plumageCamera);
      const off=pixels(),offImage=copy.toDataURL('image/png');let changed=0,delta=0;
      for(let i=0;i<on.length;i+=4){const difference=Math.abs(on[i]-off[i])+Math.abs(on[i+1]-off[i+1])+Math.abs(on[i+2]-off[i+2]);if(difference>6){changed++;delta+=(on[i]-off[i])*.2126+(on[i+1]-off[i+1])*.7152+(on[i+2]-off[i+2])*.0722;}}
      const calls=w.plumageRenderer.info.render.calls;uniform.value.z=1;w.plumageRenderer.render(w.plumageScene,w.plumageCamera);
      const materials=new Set<any>();bird.traverse((o:any)=>{if(o.material?.userData.plumageContrastUniform)materials.add(o.material);});
      w.plumageUniform=uniform;
      return {snapshot,after:c._rhSnapshot(),changed,delta:changed?delta/changed:0,offImage,beforeCalls,calls,textureCount,geometryCount,
        afterTextures:w.plumageRenderer.info.memory.textures,afterGeometries:w.plumageRenderer.info.memory.geometries,
        materials:materials.size,shared:[...materials].every(m=>m.userData.plumageContrastUniform===uniform)};
    });
    writeFileSync(resolve(output,model.label+'-contrast-off.png'),Buffer.from(compared.offImage.split(',')[1],'base64'));
    const {offImage,...metrics}=compared;
    await testInfo.attach('frozen-render-comparison',{body:JSON.stringify(metrics,null,2),contentType:'application/json'});
    expect(compared.shared).toBe(true);expect(compared.materials).toBeGreaterThanOrEqual(5);
    expect(compared.snapshot.plumageContrastPrograms).toBeGreaterThanOrEqual(5);
    expect(compared.calls).toBe(compared.beforeCalls);expect(compared.afterTextures).toBe(compared.textureCount);expect(compared.afterGeometries).toBe(compared.geometryCount);
    for(const key of ['motionTimeMs','raptorPosition','speedMps','pitchRadians','headingRadians','calories','stamina','missionCatches'])expect(compared.after[key],key).toEqual(compared.snapshot[key]);
    if(model.sign){expect(compared.changed).toBeGreaterThan(100);expect(compared.delta*model.sign).toBeGreaterThan(1);}
    else{expect(compared.snapshot.plumageShadowFill).toBeLessThan(.003);expect(compared.snapshot.plumageEdgeShade).toBe(0);}
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));const paused=await canvas.evaluate((c:any)=>c._rhSnapshot());
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);
    await canvas.evaluate(()=>(window as any).plumageStep(60000));
    const afterPause=await canvas.evaluate((c:any)=>c._rhSnapshot());
    expect(afterPause.motionTimeMs).toBe(paused.motionTimeMs);expect(afterPause.raptorPosition).toEqual(paused.raptorPosition);
    expect(afterPause.plumageShadowFill).toBe(paused.plumageShadowFill);expect(afterPause.plumageEdgeShade).toBe(paused.plumageEdgeShade);
    await canvas.evaluate((c:any)=>c._rhCommand('study'));
    await expect(page.getByRole('button',{name:'Studio',exact:true})).toHaveAttribute('aria-pressed','true');
    expect(await page.evaluate(()=>(window as any).plumageModeAtRender)).toBe(0);
    expect(await page.evaluate(()=>(window as any).plumageUniform.value.z)).toBe(1);
    await page.getByRole('combobox',{name:'Inspect',exact:true}).selectOption('wing');
    await stage.screenshot({path:resolve(output,model.label+'-studio.png'),timeout:90000});
    await page.getByRole('button',{name:'Habitat',exact:true}).click();
    expect(await page.evaluate(()=>(window as any).plumageModeAtRender)).toBe(1);
    await page.getByRole('button',{name:'Resume from this moment',exact:true}).click();
    expect((await canvas.evaluate((c:any)=>c._rhSnapshot())).motionTimeMs).toBe(paused.motionTimeMs);
    expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
