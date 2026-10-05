import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.use({video:'off'});
const output=process.env.RAPTOR_LANDSCAPE_SCREENSHOTS||resolve('scratch/raptor-landscape-review');
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);window.landscapeRenderer=r;r.render=function(scene,camera){window.landscapeScene=scene;window.landscapeCamera=camera;return render(scene,camera);};return r;};})();`;

test.describe('Raptor landscape atmosphere',()=>{
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
      (window as any).stepLandscape=(ms:number)=>{time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
    });
  });
  for(const model of [
    {label:'day-cliffs',species:'peregrine',width:880,quality:'high',phase:.44,cloud:.18},
    {label:'night-forest-mobile',species:'greatHorned',width:320,quality:'low',phase:.93,cloud:.18},
    {label:'snowy-tundra',species:'snowyOwl',width:880,quality:'balanced',phase:.44,cloud:.4},
    {label:'dusk-lake',species:'osprey',width:880,quality:'high',phase:.735,cloud:.6}
  ])test(`renders depth and restrained foliage light in ${model.label}`,async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|GL_INVALID|INVALID_OPERATION/i.test(m.text()))errors.push(m.text());});
    await page.setViewportSize({width:model.width===320?360:960,height:1100});
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:model.species,activeMission:'open',flightSession:{speciesId:model.species,missionId:'open'},huntTutorialDismissed:true,graphicsQuality:model.quality,focusSlowmo:false}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    if(model.width===320)await page.addStyleTag({content:'#wrap{width:320px}'});
    const canvas=page.locator('[data-raptor-canvas]'),stage=page.locator('[data-raptor-flight-stage]');
    // The frozen animation clock needs the asynchronous resize to finish before
    // the manual render; otherwise a later resize clears the captured canvas.
    await expect.poll(()=>canvas.evaluate((c:any)=>{
      const w=window as any,size=w.landscapeRenderer.getSize(new w.THREE.Vector2());
      return Math.abs(size.x-c.clientWidth)<2&&Math.abs(size.y-c.clientHeight)<2;
    })).toBe(true);
    const state=await canvas.evaluate((c:any,model)=>{
      const w=window as any;c._rhCommand('environment',{windSpeed:0,dayPhase:model.phase,cloudCover:model.cloud});
      for(let i=0;i<8;i++)w.stepLandscape(25);
      const scene=w.landscapeScene,r=w.landscapeRenderer,materials=new Set<any>();
      scene.traverse((o:any)=>{if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach((m:any)=>materials.add(m));});
      w.aerialMaterials=[...materials].filter(m=>m.userData.aerialStrength);
      w.leafMaterials=[...materials].filter(m=>m.userData.foliageTransmission);
      w.paintLandscape=()=>r.render(scene,w.landscapeCamera);
      w.setLandscape=(aerial:number,foliage:number)=>{w.aerialMaterials[0].userData.aerialStrength.value=aerial;w.leafMaterials[0].userData.foliageTransmission.value=foliage;w.paintLandscape();};
      const copy=document.createElement('canvas');copy.width=c.width;copy.height=c.height;const ctx=copy.getContext('2d')!;
      w.captureLandscape=()=>{ctx.drawImage(c,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
      w.diffLandscape=(a:Uint8Array,b:Uint8Array)=>{let changed=0,max=0;for(let i=0;i<a.length;i+=4){const delta=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);if(delta>3)changed++;max=Math.max(max,delta);}return {changed,max};};
      w.resourcesLandscape=()=>({calls:r.info.render.calls,textures:r.info.memory.textures,geometries:r.info.memory.geometries,programs:r.info.programs.length});
      w.paintLandscape();
      return {aerial:w.aerialMaterials.filter((m:any)=>m.userData.aerialCompiled).length,foliage:w.leafMaterials.filter((m:any)=>m.userData.transmissionCompiled).length,snapshot:c._rhSnapshot()};
    },model);
    expect(errors).toEqual([]);expect(state.aerial).toBeGreaterThan(5);expect(state.foliage).toBeGreaterThan(0);
    await stage.screenshot({path:resolve(output,model.label+'-play.png'),timeout:90000});
    const coverage=await canvas.evaluate(()=>{
      const pixels=(window as any).captureLandscape();let visible=0;
      for(let i=0;i<pixels.length;i+=4)if(pixels[i]+pixels[i+1]+pixels[i+2]>3)visible++;
      return visible/(pixels.length/4);
    });
    expect(coverage).toBeGreaterThan(.2);
    await canvas.evaluate((c:any)=>{c._rhCommand('scenic',true);(window as any).paintLandscape();});
    await stage.screenshot({path:resolve(output,model.label+'-after.png'),timeout:90000});
    const rendered=await canvas.evaluate((c:any)=>{
      const w=window as any,before=c._rhSnapshot(),on=w.captureLandscape(),resources=w.resourcesLandscape();
      w.setLandscape(0,1);const haze=w.diffLandscape(on,w.captureLandscape());
      w.setLandscape(1,0);const foliage=w.diffLandscape(on,w.captureLandscape());
      w.setLandscape(0,0);const combined=w.diffLandscape(on,w.captureLandscape());
      const bird=w.landscapeScene.getObjectByName('raptor-head-rig').parent;let birdAffected=false;
      bird.traverse((o:any)=>{if(o.material?.userData.aerialStrength||o.material?.userData.foliageTransmission)birdAffected=true;});
      return {haze,foliage,combined,resources,afterResources:w.resourcesLandscape(),birdAffected,before,after:c._rhSnapshot()};
    });
    await stage.screenshot({path:resolve(output,model.label+'-before.png'),timeout:90000});
    await canvas.evaluate(()=>{(window as any).setLandscape(1,1);});
    await testInfo.attach('landscape-render-comparison',{body:JSON.stringify(rendered),contentType:'application/json'});
    expect(rendered.haze.changed).toBeGreaterThan(100);
    if(model.phase>.8)expect(rendered.foliage.changed).toBe(0);
    else expect(rendered.foliage.changed).toBeGreaterThan(5);
    expect(rendered.resources).toEqual(rendered.afterResources);expect(rendered.birdAffected).toBe(false);
    expect(rendered.before.raptorPosition).toEqual(rendered.after.raptorPosition);
    expect(rendered.before.missionCatches).toBe(rendered.after.missionCatches);
    const paused=await canvas.evaluate((c:any)=>{
      const w=window as any;c._rhCommand('scenic',false);c._rhCommand('pause');w.stepLandscape(25);
      const before=c._rhSnapshot(),pixels=w.captureLandscape(),resources=w.resourcesLandscape();
      w.stepLandscape(60000);return {before,after:c._rhSnapshot(),pixels:w.diffLandscape(pixels,w.captureLandscape()),resources,afterResources:w.resourcesLandscape()};
    });
    expect(paused.before.motionTimeMs).toBe(paused.after.motionTimeMs);
    expect(paused.pixels.changed).toBe(0);expect(paused.resources).toEqual(paused.afterResources);
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);
    const weather=await canvas.evaluate((c:any)=>{
      const w=window as any,before=c._rhSnapshot(),color=w.aerialMaterials[0].userData.aerialZenith.value.toArray();
      c._rhCommand('environment',{dayPhase:.5,cloudCover:1});w.stepLandscape(25);
      const after=c._rhSnapshot();return {color,afterColor:w.aerialMaterials[0].userData.aerialZenith.value.toArray(),before,after};
    });
    expect(weather.afterColor).not.toEqual(weather.color);expect(weather.after.raptorPosition).toEqual(weather.before.raptorPosition);
    expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
