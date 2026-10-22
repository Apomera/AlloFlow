import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 300000, retries: 0 });
const output=resolve(process.env.STEM_ASSET_REPORT || 'reports/shared-assets-pilot');
const baseline=process.env.STEM_ASSET_BASELINE_DIR;
// GlHarness normally disables loadScriptResilient. Restore the actual host
// implementation captured before that override so this tests real lazy loading.
const captureLoader="\nwindow.pilotNativeLoader=window.StemLab.loadScriptResilient;";
const probe="window.StemLab.loadScriptResilient=window.pilotNativeLoader;window.AlloPostFXEnabled=false;window.pilotDraw=null;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original(options),draw=r.render.bind(r);r.render=function(scene,camera){window.pilotDraw={scene,camera,renderer:r};return draw(scene,camera);};return r;};})();";
for(const tool of ['bird','raptor'] as const){
  const file=tool==='bird'?'stem_tool_birdlab.js':'stem_tool_raptorhunt.js';
  const harness=new GlHarness({toolId:tool==='bird'?'birdLab':'raptorHunt',toolFile:'stem_lab/'+file,preScripts:['stem_lab/stem_lab_module.js'],width:1100,height:900,appStyles:true,layout:'document',probes:probe});
  test.describe(tool+' catalog adoption',()=>{
    test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});
    test.afterAll(async()=>harness.stop());
    test('preserves native geometry, motion and observations with catalog and unavailable-catalog fallback',async({browser})=>{
      const records:any[]=[];
      for(const mode of ['before','catalog','unavailable']){
        const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage();
        const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
        await page.addInitScript(()=>{
          let time=1000,next=1,seed=731;const pending=new Map<number,FrameRequestCallback>();
          Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
          performance.now=()=>time;
          window.requestAnimationFrame=cb=>{const id=next++;pending.set(id,cb);return id;};window.cancelAnimationFrame=id=>{pending.delete(id);};
          (window as any).pilotStep=(ms:number)=>{time+=ms;const callbacks=[...pending.values()];pending.clear();callbacks.forEach(cb=>cb(time));};
        });
        await page.route('**/stem_lab/stem_lab_module.js*',route=>route.fulfill({contentType:'text/javascript',body:readFileSync(mode==='before'&&baseline?resolve(baseline,'stem_lab/stem_lab_module.js'):'stem_lab/stem_lab_module.js','utf8')+captureLoader}));
        if(mode==='before'&&baseline){
          for(const name of [file,'birdlab_3d_wildlife.js']){
            const path=resolve(baseline,'stem_lab',name);expect(existsSync(path)).toBe(true);
            await page.route('**/stem_lab/'+name+'*',route=>route.fulfill({contentType:'text/javascript',body:readFileSync(path,'utf8')}));
          }
        }
        if(mode==='unavailable'||(mode==='before'&&!baseline))await page.route('**/stem_lab/stem_sim_assets.js*',route=>route.abort());
        if(mode==='catalog')await page.route('**/stem_lab/stem_sim_assets.js*',route=>route.fulfill({contentType:'text/javascript',body:readFileSync('stem_lab/stem_sim_assets.js','utf8')+"\n(()=>{const a=window.StemSimAssets;window.pilotCatalogCalls=[];window.StemSimAssets=Object.freeze(Object.assign({},a,{create:function(T,id,v,o){window.pilotCatalogCalls.push({id,version:v,quality:o.quality});return a.create(T,id,v,o);}}));})();"}));
        try{
          const data=tool==='bird'?{birdLab:{view:'observatory3d',blXp:23,blBadges:{},blLifeList:{}}}:{raptorHunt:{activeSection:'hunt',selectedSpecies:'coopersHawk',activeMission:'open',flightSession:{speciesId:'coopersHawk',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:'low'}};
          await harness.mount(page,data,undefined,{expectCanvas:false});
          await page.waitForFunction(tool==='bird'?"!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d":"!!document.querySelector('[data-raptor-canvas]')?._rhSnapshot",null,{polling:50,timeout:60000});
          const states=await page.evaluate(tool=>{
            const w=window as any,node:any=document.querySelector(tool==='bird'?'[data-birdlab-3d-canvas]':'[data-raptor-canvas]');
            const snapshot=()=>tool==='bird'?node._birdlab3d.getState():node._rhSnapshot();
            const results:any[]=[];
            if(tool==='bird'){node._birdlab3d.setPaused(true);for(const t of [0,8.53,12.7,0]){node._birdlab3d.seek(t);w.pilotStep(16);results.push(snapshot());}}
            else {for(let i=0;i<30;i++)w.pilotStep(1000/60);results.push(snapshot());node._rhCommand('pause');w.pilotStep(1000);results.push(snapshot());}
            return results.map(s=>tool==='bird'?{time:s.time,paused:s.paused,position:s.position,orientation:s.orientation,wildlife:s.wildlife,sightings:s.sightings}:{position:s.raptorPosition,motionTimeMs:s.motionTimeMs,prey:s.preyVisualPoses,wingAngle:s.wingAngle,drawCalls:s.drawCalls});
          },tool);
          const geometry=await page.evaluate(tool=>{
            const w=window as any,p=w.pilotDraw; p.scene.updateMatrixWorld(true);
            const roots:any[]=[];p.scene.traverse((n:any)=>{if(n.name===(tool==='bird'?'woodland-mourningDove':'prey-bird-mourningDove'))roots.push(n);});
            const hash=(a:ArrayLike<number>)=>{let h=2166136261;const bytes=new Uint8Array(new Float64Array(Array.from(a)).buffer);for(const n of bytes)h=Math.imul(h^n,16777619);return(h>>>0).toString(16);};
            return {calls:w.pilotCatalogCalls||[],live:!p.renderer.getContext().isContextLost(),shaderErrors:p.renderer.info.programs.filter((x:any)=>x.diagnostics&&!x.diagnostics.runnable).length,
              roots:roots.map(root=>{const meshes:any[]=[];root.traverse((n:any)=>{if(!n.geometry)return;meshes.push({name:n.name,matrix:n.matrixWorld.toArray(),attributes:Object.fromEntries(Object.entries(n.geometry.attributes).map(([k,a]:any)=>[k,{count:a.count,hash:hash(a.array)}])),indices:n.geometry.index?hash(n.geometry.index.array):null,material:(Array.isArray(n.material)?n.material:[n.material]).map((m:any)=>({type:m.type,color:m.color?.getHex(),roughness:m.roughness,side:m.side,transparent:m.transparent}))});});return{matrix:root.matrixWorld.toArray(),meshes};})};
          },tool);
          expect(geometry.live).toBe(true);expect(geometry.shaderErrors).toBe(0);expect(geometry.roots.length).toBeGreaterThan(0);
          if(mode==='catalog')expect(geometry.calls.filter((c:any)=>c.id==='animal.mourning-dove').length).toBeGreaterThan(0);else expect(geometry.calls).toEqual([]);
          expect(errors).toEqual([]);
          if(mode==='catalog')await page.screenshot({path:resolve(output,tool+'-catalog.jpg'),type:'jpeg',quality:80});
          records.push({mode,states,geometry:{...geometry,calls:undefined},catalogCalls:geometry.calls});
          await harness.destroy(page);
        }finally{await context.close();}
      }
      expect(records[1].states).toEqual(records[0].states);expect(records[2].states).toEqual(records[0].states);
      expect(records[1].geometry).toEqual(records[0].geometry);expect(records[2].geometry).toEqual(records[0].geometry);
      writeFileSync(resolve(output,tool+'-parity.json'),JSON.stringify({baseline:baseline||'current native fallback',records},null,2));
    });
  });
}

test.describe('Raptor flight with the real optional catalog loader', () => {
  const harness = new GlHarness({
    toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
    preScripts: ['stem_lab/stem_lab_module.js'], width: 880, height: 620,
    appStyles: true, probes: probe
  });
  test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
  test.afterAll(async () => harness.stop());
  test.afterEach(async ({ page }) => harness.destroy(page));

  test('keeps chase framing, pause, wing continuity and reduced-motion view controls with live catalog prey', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 1100, height: 1100 });
    await page.addInitScript(() => {
      let clock = 1000, nextId = 1, seed = 731;
      const callbacks = new Map<number, FrameRequestCallback>();
      Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      performance.now = () => clock;
      window.requestAnimationFrame = callback => { const id = nextId++; callbacks.set(id, callback); return id; };
      window.cancelAnimationFrame = id => { callbacks.delete(id); };
      (window as any).advanceCatalogFlight = (ms: number) => {
        clock += ms;
        const pending = [...callbacks.values()]; callbacks.clear();
        pending.forEach(callback => callback(clock));
      };
    });
    await page.route('**/stem_lab/stem_lab_module.js*', route => route.fulfill({
      contentType: 'text/javascript', body: readFileSync('stem_lab/stem_lab_module.js', 'utf8') + captureLoader
    }));
    await page.route('**/stem_lab/stem_sim_assets.js*', route => route.fulfill({
      contentType: 'text/javascript', body: readFileSync('stem_lab/stem_sim_assets.js', 'utf8') +
        "\n(()=>{const a=window.StemSimAssets;window.pilotCatalogCalls=[];window.StemSimAssets=Object.freeze(Object.assign({},a,{create:function(T,id,v,o){window.pilotCatalogCalls.push({id,version:v,quality:o.quality});return a.create(T,id,v,o);}}));})();"
    }));
    // Cooper's hawk has mourning doves in its actual live prey pool. This makes
    // catalog adoption observable in the scene whose flight controls are tested.
    await harness.mount(page, { raptorHunt: {
      activeSection: 'hunt', selectedSpecies: 'coopersHawk', activeMission: 'open',
      flightSession: { speciesId: 'coopersHawk', missionId: 'open' },
      huntTutorialDismissed: true, graphicsQuality: 'low'
    } }, undefined, { expectCanvas: false });
    // RAF belongs to the deterministic simulation clock; readiness must poll
    // independently so it does not wait on the test's intentionally idle RAF.
    await page.waitForFunction("!!document.querySelector('[data-raptor-canvas]')?._rhSnapshot", null, { polling: 50, timeout: 60000 });
    const continuity = await page.evaluate(() => {
      const w = window as any, canvas = document.querySelector('[data-raptor-canvas]') as any;
      const step = w.advanceCatalogFlight;
      canvas._rhCommand('assist');
      canvas._rhCommand('environment', { windSpeed: 0, cloudCover: .15 });
      for (let i = 0; i < 40; i++) step(1000 / 60);
      const frames = [];
      for (let i = 0; i < 60; i++) { step([8, 17, 45, 12, 33][i % 5]); frames.push(canvas._rhSnapshot()); }
      const before = canvas._rhSnapshot();
      canvas._rhCommand('pause'); step(60000);
      const paused = canvas._rhSnapshot();
      canvas._rhCommand('pause'); step(1000 / 60);
      const resumed = canvas._rhSnapshot();
      canvas._rhCommand('hold', { key: 'shift', pressed: true }); step(1000 / 60);
      const dive = canvas._rhSnapshot();
      canvas._rhCommand('hold', { key: 'shift', pressed: false });
      const label = document.querySelector('.rh-flight-metric-label')!;
      const telemetry = document.querySelector('.rh-flight-telemetry-strip')!;
      return { frames, before, paused, resumed, dive, labelDisplay: getComputedStyle(label).display,
        telemetryFits: telemetry.scrollWidth <= telemetry.clientWidth + 1,
        telemetryClearance: document.querySelector('.rh-flight-state')!.getBoundingClientRect().top - telemetry.getBoundingClientRect().bottom,
        catalogCalls: w.pilotCatalogCalls || [], errors: w.__events.errors };
    });
    expect(continuity.catalogCalls.filter((call: any) => call.id === 'animal.mourning-dove' && call.version === '1.0.0').length).toBeGreaterThan(0);
    expect(continuity.before.preyVisualPoses.some((prey: any) => prey.id === 'mourningDove' && prey.sharedModel)).toBe(true);
    expect(continuity.errors).toEqual([]);
    expect(continuity.labelDisplay).toBe('block');
    expect(continuity.telemetryFits).toBe(true);
    expect(continuity.telemetryClearance).toBeGreaterThanOrEqual(0);
    const screenY = continuity.frames.map(frame => frame.raptorNdcY);
    expect(screenY.every(Number.isFinite)).toBe(true);
    expect(Math.max(...screenY) - Math.min(...screenY)).toBeLessThan(.001);
    expect(continuity.paused.motionTimeMs).toBe(continuity.before.motionTimeMs);
    expect(continuity.paused.wingAngle).toBe(continuity.before.wingAngle);
    expect(continuity.paused.raptorPosition).toEqual(continuity.before.raptorPosition);
    expect(continuity.paused.preyVisualPoses).toEqual(continuity.before.preyVisualPoses);
    expect(continuity.resumed.motionTimeMs - continuity.before.motionTimeMs).toBeCloseTo(1000 / 60, 5);
    expect(Math.abs(continuity.resumed.wingAngle - continuity.before.wingAngle)).toBeLessThan(.16);
    expect(Math.abs(continuity.dive.wingAngle - continuity.resumed.wingAngle)).toBeLessThan(.16);
    expect(continuity.dive.featherDetailCount).toBe(20);
    expect(continuity.dive.drawCalls).toBeLessThan(150);
    for (const frame of continuity.frames) expect(frame.cameraPosition.every(Number.isFinite)).toBe(true);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((canvas: any) => canvas._rhSnapshot().reducedMotion)).toBe(true);
    const reduced = await page.evaluate(() => {
      const w = window as any, canvas = document.querySelector('[data-raptor-canvas]') as any;
      const step = w.advanceCatalogFlight;
      for (let i = 0; i < 40; i++) step(25);
      const first = canvas._rhSnapshot();
      for (let i = 0; i < 10; i++) step(25);
      const last = canvas._rhSnapshot();
      canvas._rhCommand('view'); step(25); const fp = canvas._rhSnapshot();
      canvas._rhCommand('view'); step(25);
      const renderer = w.pilotDraw.renderer;
      return { first, last, fp, chase: canvas._rhSnapshot(),
        live: !renderer.getContext().isContextLost(),
        shaderErrors: renderer.info.programs.filter((program: any) => program.diagnostics && !program.diagnostics.runnable).length,
        errors: w.__events.errors };
    });
    expect(reduced.first.reducedMotion).toBe(true);
    expect(reduced.last.airflowOverlayVisible).toBe(false);
    expect(reduced.last.speedOverlayVisible).toBe(false);
    expect(reduced.last.wingAngle).toBeCloseTo(reduced.first.wingAngle, 4);
    expect(reduced.fp.cameraMode).toBe('fp');
    expect(reduced.chase.cameraMode).toBe('chase');
    expect(reduced.fp.cameraPosition.every(Number.isFinite)).toBe(true);
    expect(reduced.chase.cameraPosition.every(Number.isFinite)).toBe(true);
    expect(reduced.live).toBe(true); expect(reduced.shaderErrors).toBe(0);
    expect(reduced.errors).toEqual([]); expect(errors).toEqual([]);
    writeFileSync(resolve(output, 'raptor-flight-continuity.json'), JSON.stringify({ continuity, reduced, errors }, null, 2));
  });
});
