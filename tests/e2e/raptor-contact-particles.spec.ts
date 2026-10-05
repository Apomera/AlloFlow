import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.use({video:'off'});
const output=process.env.RAPTOR_CONTACT_SCREENSHOTS||resolve('scratch/raptor-contact-review');
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);window.contactRenderer=r;r.render=function(scene,camera){window.contactScene=scene;window.contactCamera=camera;return render(scene,camera);};return r;};})();`;

test.describe('Raptor catch particles',()=>{
  test.describe.configure({timeout:300000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:880,height:620,appStyles:true,probes});
  test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});
  test.afterAll(async()=>{await harness.stop();});
  test.afterEach(async({page})=>{await harness.destroy(page);});
  test.beforeEach(async({page})=>{
    await page.addInitScript(()=>{
      let time=1000,id=1,seed=731;const frames=new Map<number,FrameRequestCallback>();
      Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;
      window.requestAnimationFrame=cb=>{const next=id++;frames.set(next,cb);return next;};window.cancelAnimationFrame=key=>{frames.delete(key);};
      const w=window as any;
      w.stepContact=(ms:number)=>{time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
      w.advanceContact=(ms:number)=>{while(ms>0){const dt=Math.min(ms,50);w.stepContact(dt);ms-=dt;}};
    });
  });
  for(const model of [
    {label:'bird-desktop',species:'peregrine',kind:'bird',width:880,quality:'high',phase:.44},
    {label:'dust-mobile',species:'redTail',kind:'rodent',width:320,quality:'low',phase:.44},
    {label:'water-night',species:'baldEagle',kind:'fish',width:880,quality:'low',phase:.93}
  ])test(`renders ${model.label} contact with independent fades and a stable particle pool`,async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error'&&/shader|WebGL|INVALID_OPERATION/i.test(message.text()))errors.push(message.text());});
    await page.setViewportSize({width:model.width===320?360:960,height:1100});
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:model.species,activeMission:'open',flightSession:{speciesId:model.species,missionId:'open'},huntTutorialDismissed:true,graphicsQuality:model.quality,focusSlowmo:false}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    if(model.width===320)await page.addStyleTag({content:'#wrap{width:320px}'});
    const canvas=page.locator('[data-raptor-canvas]'),stage=page.locator('[data-raptor-flight-stage]');
    await canvas.evaluate((c:any,phase)=>{
      const w=window as any;c._rhCommand('environment',{windSpeed:0,dayPhase:phase,cloudCover:.18});
      w.contactPool=w.contactScene.getObjectByName('raptor-strike-particle-pool');
      w.contactDisposals={geometry:0,material:0};
      w.contactPool.geometry.addEventListener('dispose',()=>w.contactDisposals.geometry++);
      w.contactPool.material.addEventListener('dispose',()=>w.contactDisposals.material++);
      w.contactPrey=()=>w.contactScene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-')));
      w.placeContactPrey=(kind:string,water:boolean)=>{
        const s=c._rhSnapshot(),p=s.raptorPosition,prey=w.contactPrey();
        const chosen=prey.find((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-'+kind+'-')));
        if(!chosen)throw Error('No real '+kind+' prey found');
        prey.forEach((o:any,i:number)=>o.position.set(2000+i*20,2000,2000));
        chosen.position.set(p.x+Math.sin(s.headingRadians)*Math.cos(s.pitchRadians)*3,water?-1.55:p.y+Math.sin(s.pitchRadians)*3,p.z-Math.cos(s.headingRadians)*Math.cos(s.pitchRadians)*3);
      };
      w.readContact=()=>{
        const f=w.contactPool,a=f.geometry.attributes;
        return {snapshot:c._rhSnapshot(),visible:f.visible,compiled:!!f.material.userData.catchStyleCompiled,geometry:f.geometry.uuid,material:f.material.uuid,
          positions:Array.from(a.position.array),styles:Array.from(a.catchStyle.array),colors:Array.from(a.color.array),colorVersion:a.color.version,styleVersion:a.catchStyle.version};
      };
    },model.phase);
    if(model.kind==='fish')await canvas.evaluate((c:any)=>{
      const w=window as any;
      // Reach the real lake using flight controls before catching a surface fish.
      c._rhCommand('hold',{key:'d',pressed:true});
      for(let i=0;i<100&&Math.cos(c._rhSnapshot().headingRadians)<.97;i++)w.stepContact(50);
      c._rhCommand('hold',{key:'d',pressed:false});c._rhCommand('hold',{key:'q',pressed:true});
      for(let i=0;i<240&&c._rhSnapshot().raptorPosition.y>1;i++)w.stepContact(50);
      c._rhCommand('hold',{key:'q',pressed:false});
    });
    const birth=await canvas.evaluate((c:any,kind)=>{
      const w=window as any;w.placeContactPrey(kind,kind==='fish');c._rhCommand('strike');return w.readContact();
    },model.kind);
    expect(birth.snapshot.missionCatches).toBe(1);
    expect(birth.styles.filter((_:number,i:number)=>i%4===0).every((n:number)=>n===0)).toBe(true);
    await canvas.evaluate((c:any)=>{(window as any).advanceContact(120);c._rhCommand('pause');});
    const early=await page.evaluate(()=>(window as any).readContact());
    expect(early.visible).toBe(true);expect(early.compiled).toBe(true);
    expect(early.styles.every(Number.isFinite)).toBe(true);expect(early.positions.every(Number.isFinite)).toBe(true);
    const active=early.styles.reduce((all:number[][],_:number,i:number,values:number[])=>{if(i%4===0&&values[i]>0)all.push(values.slice(i,i+4));return all;},[]);
    expect(active.length).toBeGreaterThanOrEqual(10);expect(active.length).toBeLessThanOrEqual(28);
    for(const [alpha,size,,width] of active){
      expect(alpha).toBeGreaterThan(.9);expect(alpha).toBeLessThanOrEqual(1);expect(size).toBeGreaterThan(0);expect(size).toBeLessThan(1.1);
      if(model.kind==='bird'){expect(width).toBeGreaterThan(.25);expect(width).toBeLessThan(.4);}
      else if(model.kind==='fish')expect(width).toBeCloseTo(.64,5);
      else expect(width).toBe(1);
    }
    await stage.screenshot({path:resolve(output,model.label+'-catch.png'),timeout:90000});
    const rendered=await canvas.evaluate((c:any)=>{
      const w=window as any,r=w.contactRenderer,f=w.contactPool,opacity=f.material.opacity;
      const copy=document.createElement('canvas');copy.width=c.width;copy.height=c.height;const ctx=copy.getContext('2d')!;
      const capture=()=>{ctx.drawImage(c,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
      r.render(w.contactScene,w.contactCamera);const on=capture(),calls=r.info.render.calls,textures=r.info.memory.textures,geometries=r.info.memory.geometries;
      f.material.opacity=0;r.render(w.contactScene,w.contactCamera);const off=capture();let changed=0;
      for(let i=0;i<on.length;i+=4)if(Math.abs(on[i]-off[i])+Math.abs(on[i+1]-off[i+1])+Math.abs(on[i+2]-off[i+2])>3)changed++;
      const afterCalls=r.info.render.calls;f.material.opacity=opacity;r.render(w.contactScene,w.contactCamera);
      return {changed,calls,afterCalls,textures,afterTextures:r.info.memory.textures,geometries,afterGeometries:r.info.memory.geometries};
    });
    await testInfo.attach('contact-render-comparison',{body:JSON.stringify(rendered),contentType:'application/json'});
    expect(rendered.changed).toBeGreaterThan(5);expect(rendered.changed).toBeLessThan(12000);
    expect(rendered.calls).toBe(rendered.afterCalls);expect(rendered.textures).toBe(rendered.afterTextures);expect(rendered.geometries).toBe(rendered.afterGeometries);
    await canvas.evaluate(()=>(window as any).stepContact(60000));
    const frozen=await page.evaluate(()=>(window as any).readContact());
    for(const key of ['positions','styles','colors','styleVersion','colorVersion'])expect(frozen[key]).toEqual(early[key]);
    expect(frozen.snapshot.motionTimeMs).toBe(early.snapshot.motionTimeMs);
    await canvas.evaluate((c:any)=>{c._rhCommand('pause');(window as any).advanceContact(580);c._rhCommand('pause');});
    const late=await page.evaluate(()=>(window as any).readContact());
    expect(late.geometry).toBe(early.geometry);expect(late.material).toBe(early.material);
    expect(late.colors).toEqual(early.colors);expect(late.colorVersion).toBe(early.colorVersion);
    expect(late.styleVersion).toBeGreaterThan(early.styleVersion);
    expect(late.styles[0]).toBeLessThan(early.styles[0]);
    const fades=late.styles.filter((_:number,i:number)=>i%4===0&&i<active.length*4);
    expect(new Set(fades).size).toBeGreaterThan(3);
    await stage.screenshot({path:resolve(output,model.label+'-settled.png'),timeout:90000});
    await canvas.evaluate((c:any)=>{c._rhCommand('pause');(window as any).advanceContact(550);c._rhCommand('pause');});
    const expired=await page.evaluate(()=>(window as any).readContact());
    expect(expired.visible).toBe(false);expect(expired.styles.filter((_:number,i:number)=>i%4===0).every((n:number)=>n===0)).toBe(true);
    expect(expired.snapshot.missionCatches).toBe(1);expect(expired.snapshot.carriedPreyMs).toBe(0);
    // A second real catch reuses the pool, and a paused motion preference change clears it immediately.
    await canvas.evaluate((c:any,kind)=>{const w=window as any;c._rhCommand('pause');w.placeContactPrey(kind,false);c._rhCommand('strike');w.advanceContact(100);c._rhCommand('pause');},model.kind);
    expect((await page.evaluate(()=>(window as any).readContact())).snapshot.missionCatches).toBe(2);
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect.poll(()=>page.evaluate(()=>(window as any).readContact().visible)).toBe(false);
    const reduced=await page.evaluate(()=>(window as any).readContact());
    expect(reduced.styles.filter((_:number,i:number)=>i%4===0).every((n:number)=>n===0)).toBe(true);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(false);
    expect((await page.evaluate(()=>(window as any).readContact())).visible).toBe(false);
    expect(errors).toEqual([]);
    expect(await page.evaluate(()=>(window as any).__events.errors.filter((e:any)=>!String(e).includes('favicon')))).toEqual([]);
    await harness.destroy(page);
    expect(await page.evaluate(()=>(window as any).contactDisposals)).toEqual({geometry:1,material:1});
  });
});
