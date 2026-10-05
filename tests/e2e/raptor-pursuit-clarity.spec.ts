import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.use({video:'off'});
const output=process.env.RAPTOR_PURSUIT_SCREENSHOTS||resolve('scratch/raptor-pursuit-review');
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);window.clarityRenderer=r;r.render=function(scene,camera){window.clarityScene=scene;window.clarityCamera=camera;return render(scene,camera);};return r;};})();`;

test.describe('Raptor pursuit clarity',()=>{
  test.describe.configure({timeout:240000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:880,height:620,appStyles:true,probes});
  test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});
  test.afterAll(async()=>{await harness.stop();});
  test.afterEach(async({page})=>{await harness.destroy(page);});
  test.beforeEach(async({page})=>{
    await page.addInitScript(()=>{
      let time=1000,id=1,seed=731;const frames=new Map<number,FrameRequestCallback>();
      Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;
      window.requestAnimationFrame=cb=>{const next=id++;frames.set(next,cb);return next;};window.cancelAnimationFrame=key=>{frames.delete(key);};
      (window as any).stepClarity=(ms:number)=>{time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
    });
  });
  for(const model of [
    {label:'day-desktop',species:'peregrine',width:880,quality:'high',phase:.44},
    {label:'night-mobile',species:'greatHorned',width:320,quality:'low',phase:.93}
  ])test(`keeps ${model.label} prey clear and target captions stable`,async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|INVALID_OPERATION/i.test(m.text()))errors.push(m.text());});
    await page.setViewportSize({width:model.width===320?360:960,height:1100});
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:model.species,activeMission:'open',flightSession:{speciesId:model.species,missionId:'open'},huntTutorialDismissed:true,graphicsQuality:model.quality,focusSlowmo:false}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    if(model.width===320)await page.addStyleTag({content:'#wrap{width:320px}'});
    const canvas=page.locator('[data-raptor-canvas]'),stage=page.locator('[data-raptor-flight-stage]'),tracker=page.locator('.rh-target-tracker');
    await canvas.evaluate((c:any,phase)=>{
      const w=window as any;c._rhCommand('environment',{windSpeed:0,dayPhase:phase,cloudCover:.18});
      for(let i=0;i<6;i++)w.stepClarity(25);
      w.clarityPrey=w.clarityScene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-')));
      w.clarityChosen=w.clarityPrey[0];w.clarityHalo=w.clarityScene.getObjectByName('raptor-target-focus-halo');
      w.paintClarity=(render=true)=>{c._rhCommand('scenic',false);if(render)w.clarityRenderer.render(w.clarityScene,w.clarityCamera);};
      w.placeClarity=(distance:number,index=0)=>{
        const s=c._rhSnapshot(),p=s.raptorPosition,yaw=s.headingRadians,pitch=s.pitchRadians;
        w.clarityChosen=w.clarityPrey[index];
        w.clarityPrey.forEach((o:any,i:number)=>o.position.set(o===w.clarityChosen?p.x+Math.sin(yaw)*Math.cos(pitch)*distance:2000+i*20,o===w.clarityChosen?p.y+Math.sin(pitch)*distance:2000,o===w.clarityChosen?p.z-Math.cos(yaw)*Math.cos(pitch)*distance:2000));
        w.paintClarity();
      };
      w.readClarity=()=>{
        const root=w.clarityChosen,ring=root.children.find((o:any)=>o.geometry?.type==='TorusGeometry'),cap=root.children.find((o:any)=>o.geometry?.type==='SphereGeometry'),halo=w.clarityHalo;
        return {snapshot:c._rhSnapshot(),opacities:[ring.material.opacity,cap.material.opacity,halo.material.opacity],visible:[ring.visible,cap.visible,halo.visible],
          geometry:[ring.geometry.uuid,cap.geometry.uuid,halo.geometry.uuid],material:[ring.material.uuid,cap.material.uuid,halo.material.uuid],colors:[ring.material.color.getHexString(),cap.material.color.getHexString()]};
      };
      w.probeClarity=(y:number,z=0,x=0)=>{c._rhCommand('targetProbe',{ndcX:x,ndcY:1-2*y/c.clientHeight,ndcZ:z});w.paintClarity(false);
        const marker=document.querySelector('.rh-target-tracker') as HTMLElement,label=marker.querySelector('.rh-target-label')!,r=label.getBoundingClientRect(),host=marker.parentElement!.getBoundingClientRect();
        return {placement:marker.dataset.labelPlacement,left:r.left-host.left,top:r.top-host.top,right:host.right-r.right,bottom:host.bottom-r.bottom,height:r.height,offscreen:marker.dataset.offscreen};};
    },model.phase);
    const approach=await canvas.evaluate(()=>{
      const w=window as any;return [60,30,16,5.1].map(distance=>{w.placeClarity(distance);return w.readClarity();});
    });
    expect(approach[0].opacities[0]).toBeCloseTo(.72,6);expect(approach[0].opacities[1]).toBeCloseTo(.9,6);
    for(let i=1;i<approach.length;i++){
      expect(approach[i].opacities[0]).toBeLessThan(approach[i-1].opacities[0]);expect(approach[i].opacities[1]).toBeLessThan(approach[i-1].opacities[1]);
      expect(approach[i].geometry).toEqual(approach[0].geometry);expect(approach[i].material).toEqual(approach[0].material);
    }
    const near=approach.at(-1)!;
    expect(near.opacities[0]).toBeCloseTo(.26,6);expect(near.opacities[1]).toBeCloseTo(.18,6);expect(near.opacities[2]).toBeLessThanOrEqual(.21);
    expect(near.visible).toEqual([true,true,true]);expect(near.colors).toEqual(['22c55e','4ade80']);
    expect(near.snapshot.targetCanStrike).toBe(false);expect(near.snapshot.strikeWindowOpen).toBe(true);
    await expect(tracker).toHaveAttribute('data-strike-stage','window');
    await stage.screenshot({path:resolve(output,model.label+'-clear-approach.png'),timeout:90000});
    const rendering=await canvas.evaluate((c:any)=>{
      const w=window as any,r=w.clarityRenderer,root=w.clarityChosen;
      const materials=[root.children.find((o:any)=>o.geometry?.type==='TorusGeometry').material,root.children.find((o:any)=>o.geometry?.type==='SphereGeometry').material,w.clarityHalo.material];
      const saved=materials.map((m:any)=>m.opacity),copy=document.createElement('canvas');copy.width=c.width;copy.height=c.height;const ctx=copy.getContext('2d')!;
      const capture=()=>{ctx.drawImage(c,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
      r.render(w.clarityScene,w.clarityCamera);const on=capture(),calls=r.info.render.calls,textures=r.info.memory.textures,geometries=r.info.memory.geometries;
      materials.forEach((m:any)=>m.opacity=0);r.render(w.clarityScene,w.clarityCamera);const off=capture();let changed=0;
      for(let i=0;i<on.length;i+=4)if(Math.abs(on[i]-off[i])+Math.abs(on[i+1]-off[i+1])+Math.abs(on[i+2]-off[i+2])>3)changed++;
      const afterCalls=r.info.render.calls;materials.forEach((m:any,i:number)=>m.opacity=saved[i]);r.render(w.clarityScene,w.clarityCamera);
      return {changed,calls,afterCalls,textures,afterTextures:r.info.memory.textures,geometries,afterGeometries:r.info.memory.geometries};
    });
    await testInfo.attach('pursuit-render-comparison',{body:JSON.stringify(rendering),contentType:'application/json'});
    expect(rendering.changed).toBeGreaterThan(5);expect(rendering.calls).toBe(rendering.afterCalls);
    expect(rendering.textures).toBe(rendering.afterTextures);expect(rendering.geometries).toBe(rendering.afterGeometries);
    const stability=await canvas.evaluate((c:any)=>{
      const w=window as any,h=c.clientHeight;
      // Locate the actual layout boundary, including the current responsive controls.
      let boundary=0;
      for(let y=Math.round(h*.25);y<h*.89;y++)if(w.probeClarity(y).placement==='above'){boundary=y;break;}
      const samples=[];for(let i=0;i<16;i++)samples.push(w.probeClarity(boundary+(i%2?.5:-.5)));
      const held=w.probeClarity(boundary-8),released=w.probeClarity(boundary-30);
      w.probeClarity(boundary+1);const previous=w.probeClarity(boundary-8);
      w.probeClarity(boundary-8,2);const reacquired=w.probeClarity(boundary-8);
      w.probeClarity(boundary+1);w.probeClarity(boundary-8);w.placeClarity(5.1,1);const switched=w.probeClarity(boundary-8);
      return {boundary,samples,held,released,previous,reacquired,switched,snapshot:c._rhSnapshot()};
    });
    expect(stability.boundary).toBeGreaterThan(0);
    for(const sample of stability.samples){expect(sample.placement).toBe('above');for(const key of ['left','top','right','bottom'])expect(sample[key]).toBeGreaterThanOrEqual(0);expect(sample.height).toBeLessThanOrEqual(44);}
    const tops=stability.samples.map((s:any)=>s.top);expect(Math.max(...tops)-Math.min(...tops)).toBeLessThan(2);
    expect(stability.held.placement).toBe('above');expect(stability.released.placement).toBe('below');
    expect(stability.previous.placement).toBe('above');expect(stability.reacquired.placement).toBe('below');expect(stability.switched.placement).toBe('below');
    expect(stability.snapshot.motionTimeMs).toBe(near.snapshot.motionTimeMs);
    await testInfo.attach('caption-stability',{body:JSON.stringify(stability),contentType:'application/json'});
    await canvas.evaluate(()=>{const w=window as any;w.clarityRenderer.render(w.clarityScene,w.clarityCamera);});
    await stage.screenshot({path:resolve(output,model.label+'-stable-caption.png'),timeout:90000});
    await canvas.evaluate((c:any)=>{c._rhCommand('targetProbe',{clear:true});(window as any).placeClarity(5.1);c._rhCommand('pause');});
    const before=await page.evaluate(()=>(window as any).readClarity());
    await canvas.evaluate(()=>(window as any).stepClarity(60000));
    expect(await page.evaluate(()=>(window as any).readClarity().opacities)).toEqual(before.opacities);
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);
    const reduced=await page.evaluate(()=>(window as any).readClarity());expect(reduced.opacities).toEqual(before.opacities);expect(reduced.snapshot.motionTimeMs).toBe(before.snapshot.motionTimeMs);
    await canvas.evaluate((c:any)=>c._rhCommand('assist'));await expect(tracker).toBeHidden();
    expect((await page.evaluate(()=>(window as any).readClarity())).visible).toEqual([false,false,false]);
    await canvas.evaluate((c:any)=>c._rhCommand('assist'));await expect(tracker).toBeVisible();
    expect((await page.evaluate(()=>(window as any).readClarity())).opacities).toEqual(before.opacities);
    const caught=await canvas.evaluate((c:any)=>{const w=window as any;c._rhCommand('pause');w.placeClarity(3);const ready=c._rhSnapshot().targetCanStrike;c._rhCommand('strike');return {ready,snapshot:c._rhSnapshot()};});
    expect(caught.ready).toBe(true);expect(caught.snapshot.missionCatches).toBe(1);
    expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors.filter((e:any)=>!String(e).includes('favicon')))).toEqual([]);
  });
});
