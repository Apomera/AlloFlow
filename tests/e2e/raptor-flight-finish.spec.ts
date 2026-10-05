import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const output=process.env.RAPTOR_FINISH_SCREENSHOTS||resolve('scratch/raptor-flight-review');
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);window.finishRenderer=r;r.render=function(scene,camera){window.finishScene=scene;window.finishCamera=camera;return render(scene,camera);};return r;};})();`;
test.describe('Raptor clear flight and strike cues',()=>{
  test.describe.configure({timeout:240000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:880,height:620,appStyles:true,probes});
  test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});
  test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});
  test.beforeEach(async({page})=>{
    await page.addInitScript(()=>{
      let time=1000,id=1,seed=731;const frames=new Map<number,FrameRequestCallback>();
      Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;
      window.requestAnimationFrame=cb=>{const next=id++;frames.set(next,cb);return next;};window.cancelAnimationFrame=key=>{frames.delete(key);};
      (window as any).finishStep=(ms:number)=>{time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
    });
  });
  for(const model of [
    {species:'peregrine',quality:'high',width:880,phase:.44,label:'day-desktop'},
    {species:'greatHorned',quality:'low',width:320,phase:.93,label:'night-mobile'}
  ])test(`keeps ${model.label} airflow gentle and the strike cues consistent`,async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});
    await page.setViewportSize({width:model.width===320?360:960,height:1100});
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:model.species,activeMission:'open',flightSession:{speciesId:model.species,missionId:'open'},huntTutorialDismissed:true,graphicsQuality:model.quality}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    if(model.width===320)await page.addStyleTag({content:'#wrap{width:320px}'});
    const canvas=page.locator('[data-raptor-canvas]'),stage=page.locator('[data-raptor-flight-stage]'),aim=page.locator('.rh-flight-reticle');
    await expect.poll(()=>stage.evaluate(el=>el.getBoundingClientRect().width)).toBeLessThanOrEqual(model.width);
    await canvas.evaluate((c:any,phase)=>{
      const w=window as any;c._rhCommand('environment',{dayPhase:phase,windSpeed:0,cloudCover:.18});
      for(let i=0;i<6;i++)w.finishStep(25);
      w.finishFlow=w.finishScene.getObjectByName('raptor-airflow-lines');
      w.finishDisposals={geometry:0,material:0};
      w.finishFlow.geometry.addEventListener('dispose',()=>w.finishDisposals.geometry++);
      w.finishFlow.material.addEventListener('dispose',()=>w.finishDisposals.material++);
      w.readFinishFlow=()=>{const f=w.finishFlow;return {geometry:f.geometry.uuid,material:f.material.uuid,visible:f.visible,opacity:f.material.opacity,
        compiled:f.material.userData.strokeFadeCompiled,positions:Array.from(f.geometry.attributes.position.array),fades:Array.from(f.geometry.attributes.strokeFade.array),
        positionVersion:f.geometry.attributes.position.version,fadeVersion:f.geometry.attributes.strokeFade.version,snapshot:c._rhSnapshot()};};
      w.placeFinishPrey=(distance:number)=>{const s=c._rhSnapshot(),p=s.raptorPosition,yaw=s.headingRadians,pitch=s.pitchRadians;
        const prey=w.finishScene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-')));
        prey.forEach((o:any,i:number)=>o.position.set(i===0?p.x+Math.sin(yaw)*Math.cos(pitch)*distance:2000+i*20,i===0?p.y+Math.sin(pitch)*distance:2000,i===0?p.z-Math.cos(yaw)*Math.cos(pitch)*distance:2000));
        c._rhCommand('assist');c._rhCommand('assist');
        // Repaint the relocated animal in the same frozen frame as its HUD.
        w.finishRenderer.render(w.finishScene,w.finishCamera);};
    },model.phase);
    const first=await page.evaluate(()=>(window as any).readFinishFlow());
    expect(first.visible).toBe(true);expect(first.compiled).toBe(true);expect(first.opacity).toBeLessThan(.18);
    expect(first.positions.every(Number.isFinite)).toBe(true);expect(first.fades.length).toBe(model.quality==='high'?48:20);
    for(let i=0;i<first.fades.length;i+=2){expect(first.fades[i]).toBeGreaterThanOrEqual(0);expect(first.fades[i]).toBeLessThanOrEqual(Math.fround(.85));expect(first.fades[i+1]).toBe(0);}
    for(let i=0;i<first.positions.length;i+=6)expect(Math.hypot(first.positions[i+3]-first.positions[i],first.positions[i+4]-first.positions[i+1],first.positions[i+5]-first.positions[i+2])).toBeLessThan(2.5);
    await canvas.evaluate(()=>(window as any).finishStep(50));
    const second=await page.evaluate(()=>(window as any).readFinishFlow());
    expect(second.geometry).toBe(first.geometry);expect(second.material).toBe(first.material);expect(second.fades).not.toEqual(first.fades);
    await canvas.evaluate(()=>{(window as any).placeFinishPrey(35);});
    await stage.screenshot({path:resolve(output,model.label+'-cruise.png'),timeout:90000});
    const pixels=await canvas.evaluate((c:any)=>{
      const w=window as any,r=w.finishRenderer,f=w.finishFlow,opacity=f.material.opacity;
      const copy=document.createElement('canvas');copy.width=c.width;copy.height=c.height;const ctx=copy.getContext('2d')!;
      const capture=()=>{ctx.drawImage(c,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
      r.render(w.finishScene,w.finishCamera);const on=capture(),calls=r.info.render.calls,textures=r.info.memory.textures,geometries=r.info.memory.geometries;
      f.material.opacity=0;r.render(w.finishScene,w.finishCamera);const off=capture();let changed=0;
      for(let i=0;i<on.length;i+=4)if(Math.abs(on[i]-off[i])+Math.abs(on[i+1]-off[i+1])+Math.abs(on[i+2]-off[i+2])>3)changed++;
      const afterCalls=r.info.render.calls;f.material.opacity=opacity;r.render(w.finishScene,w.finishCamera);
      return {changed,calls,afterCalls,textures,afterTextures:r.info.memory.textures,geometries,afterGeometries:r.info.memory.geometries};
    });
    await testInfo.attach('airflow-render-comparison',{body:JSON.stringify(pixels),contentType:'application/json'});
    expect(pixels.changed).toBeGreaterThan(10);expect(pixels.changed).toBeLessThan(5000);
    expect(pixels.calls).toBe(pixels.afterCalls);expect(pixels.textures).toBe(pixels.afterTextures);expect(pixels.geometries).toBe(pixels.afterGeometries);
    await canvas.evaluate(()=>{(window as any).placeFinishPrey(5.1);});
    await expect(aim).toHaveAttribute('data-strike-stage','window');
    await expect(page.locator('.rh-target-tracker')).toHaveAttribute('data-strike-stage','window');
    const style=await aim.evaluate(el=>({width:el.getBoundingClientRect().width,color:getComputedStyle(el.querySelector('.rh-reticle-ring')!).borderTopColor,
      mask:getComputedStyle(el.querySelector('.rh-reticle-ring')!).maskImage}));
    expect(style.width).toBeLessThanOrEqual(60);expect(style.color).toBe('rgb(134, 239, 172)');expect(style.mask).not.toBe('none');
    await expect(page.locator('.rh-target-label')).toContainText('STRIKE WINDOW');
    const label=await page.locator('.rh-target-label').evaluate(el=>{const r=el.getBoundingClientRect(),host=el.closest('[data-raptor-flight-stage]')!.getBoundingClientRect();return {height:r.height,left:r.left-host.left,right:host.right-r.right};});
    expect(label.height).toBeLessThanOrEqual(44);expect(label.left).toBeGreaterThanOrEqual(0);expect(label.right).toBeGreaterThanOrEqual(0);
    await stage.screenshot({path:resolve(output,model.label+'-strike-window.png'),timeout:90000});
    await canvas.evaluate((c:any)=>c._rhCommand('strike'));
    await expect(aim).toHaveAttribute('data-strike-stage','throw');
    await expect(page.locator('.rh-target-tracker')).toHaveAttribute('data-strike-stage','throw');
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));
    const paused=await page.evaluate(()=>(window as any).readFinishFlow());
    const scenic=page.getByRole('button',{name:'Scenic view',exact:true});
    await scenic.click();
    expect((await page.evaluate(()=>(window as any).readFinishFlow())).visible).toBe(false);
    await scenic.click();
    await canvas.evaluate(()=>(window as any).finishStep(60000));
    const restored=await page.evaluate(()=>(window as any).readFinishFlow());
    expect(restored.positions).toEqual(paused.positions);expect(restored.fades).toEqual(paused.fades);expect(restored.positionVersion).toBe(paused.positionVersion);expect(restored.fadeVersion).toBe(paused.fadeVersion);
    for(const key of ['motionTimeMs','raptorPosition','stamina','calories','missionCatches'])expect(restored.snapshot[key]).toEqual(paused.snapshot[key]);
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect.poll(()=>page.evaluate(()=>(window as any).readFinishFlow().visible)).toBe(false);
    await page.emulateMedia({forcedColors:'active'});
    await expect.poll(()=>aim.locator('.rh-reticle-ring').evaluate(el=>getComputedStyle(el).maskImage)).toBe('none');
    await expect.poll(()=>aim.locator('.rh-reticle-ring').evaluate(el=>getComputedStyle(el).borderTopWidth)).toBe('2px');
    await expect.poll(()=>page.locator('.rh-target-label').evaluate(el=>getComputedStyle(el).backgroundImage)).toBe('none');
    expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
    await harness.destroy(page);expect(await page.evaluate(()=>(window as any).finishDisposals)).toEqual({geometry:1,material:1});
  });
});
