import {test,expect,Page} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
import {useCephalopodAudioFallback} from './helpers/cephalopod_audio';
import {nativeProfiles,mountNativeVisuals,nativeVisualState,expectNativeHealthy,nativeFrames,nativeFrozen,nativePhoto,nativePause,nativeResume,nativeInspection,nativeReturnToDive,nativeBeginMove,nativeEndMove,nativePrograms,nativeTeardown,horizontalDistance,NativeProfile} from './helpers/cephalopod_native_visuals';
import {installCuttleCoralProbe,cuttleCoralState,coralNavigationState} from './helpers/cephalopod_cuttle_coral_probe';

const source=(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js').replace(/\\/g,'/');
const candidate=process.env.CEPHALOPOD_EXPECT_CUTTLE_CORAL==='1';
const harness=new GlHarness({toolFile:source,toolId:'cephalopodLab',width:1280,height:1000,layout:'document'});
const errors=new WeakMap<Page,string[]>();
const profiles=[{...nativeProfiles[3],id:'cuttle-dorsal',motion:true},{...nativeProfiles[2],id:'cuttle-320',species:'cuttlefish'},{...nativeProfiles[0],id:'protected-common',motion:false},{...nativeProfiles[0],id:'coral-near',motion:false}] as unknown as NativeProfile[];
test.describe.configure({timeout:300000,retries:0});test.use({trace:'off',video:'off'});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());
test.beforeEach(async({page})=>{const list:string[]=[];errors.set(page,list);page.on('pageerror',e=>list.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/WebGL|THREE|shader|program/i.test(m.text()))list.push(m.text());});await useCephalopodAudioFallback(page);});
test.afterEach(async({page},info)=>{await nativeTeardown(page,harness,info);const disposal=await page.evaluate(()=>((window as any).__cuttleCoralProbe?.resources||[]).map((r:any)=>({type:r.resource.type,count:r.count})));await info.attach('cuttle-coral-disposal',{body:JSON.stringify(disposal),contentType:'application/json'});expect(disposal.length).toBeGreaterThan(0);expect(disposal.every(r=>r.count>0)).toBe(true);expect(errors.get(page)).toEqual([]);});

function assertPrograms(state:any,profile:NativeProfile){
  expect(state.meshes.every((m:any)=>m.retained&&m.static&&m.finite)).toBe(true);expect(state.resources.every((r:any)=>r.count===0)).toBe(true);
  const programs=state.programs;expect(programs.some((p:any)=>p.name==='cl-mantle')).toBe(true);expect(programs.some((p:any)=>p.name==='cl-coral-colony')).toBe(true);
  for(const p of programs){expect(p.linked,p.name).toBe(true);expect(p.shaders).toHaveLength(2);expect(p.shaders.every((s:any)=>s.compiled),p.name).toBe(true);const code=p.shaders.map((s:any)=>s.source).join('\n');
    if(p.name==='cl-coral-colony'){expect(p.key).toBe(candidate?'cl-coral-tissue-v15':'cl-coral-surface-v14');for(const token of ['clCoralCalyxPeriod','clCoralCalyx','clCoralTissue','clCoralLivingTone'])candidate?expect(code).toContain(token):expect(code).not.toContain(token);}
    else if(profile.species==='cuttlefish'){const fin=p.name.startsWith('cl-fin');expect(p.key).toBe(candidate&&!fin?'cl-cuttle-surface-v14-relief-v1':'cl-cuttle-surface-v14');for(const token of ['clCutReliefMask','clCutReliefSlopeLimit'])candidate&&!fin?expect(code).toContain(token):expect(code).not.toContain(token);}
    else expect(code).not.toContain('clCutReliefMask');
  }
  if(profile.species==='cuttlefish')expect(programs.filter((p:any)=>p.name.startsWith('cl-fin'))).toHaveLength(2);
  for(const name of profile.species==='cuttlefish'?['cl-mantle','cl-fin--1','cl-fin-1']:['cl-mantle'])expect(state.meshes.find((m:any)=>m.name===name)?.sample?.epoch,'current native draw '+name).toBe(state.epoch);
  for(const m of state.meshes.filter((m:any)=>m.sample?.epoch===state.epoch)){expect(m.sample.sameGeometry&&m.sample.enabled&&m.sample.retainedBuffer,m.name).toBe(true);expect(m.sample.normal).toHaveLength(9);expect(m.sample.normal.every(Number.isFinite)).toBe(true);expect(Math.abs(m.sample.determinant)).toBeGreaterThan(1e-8);}
}
function frozenSurfaces(state:any){return state.meshes.filter((m:any)=>m.name==='cl-mantle'||m.name.startsWith('cl-fin')).map((m:any)=>({name:m.name,attributes:m.attributes,transformHash:m.transformHash}));}
function surfaceMotion(state:any,name:string){const m=state.meshes.find((m:any)=>m.name===name);return name==='cl-mantle'?m.transformHash:m.attributes.filter((a:any)=>a.name==='position'||a.name==='normal');}

for(const profile of profiles)test.describe(profile.id,()=>{test.use({viewport:{width:profile.width,height:profile.height},hasTouch:profile.touch,isMobile:profile.touch,deviceScaleFactor:1});
test('native surface draws, framing, motion, and disposal',async({page},info)=>{
  const evidence:any={source,candidate,profile,navigation:[]};const save=()=>writeFileSync(info.outputPath('poses-'+profile.id+'.json'),JSON.stringify(evidence,null,2));
  if(profile.id==='coral-near'){evidence.warnings=[];evidence.nativeDive=[];page.on('console',m=>{if(m.type()==='warning')evidence.warnings.push(m.text());});}
  try{
    await mountNativeVisuals(page,harness,profile);await installCuttleCoralProbe(page);evidence.idle=await nativeVisualState(page,true);expectNativeHealthy(evidence.idle,profile);evidence.idleSurface=await cuttleCoralState(page);save();
    await expect.poll(async()=>(await nativeVisualState(page)).signature).not.toBe(evidence.idle.signature);
    if(profile.id==='coral-near'){
      const eligible=evidence.idleSurface.meshes.filter((m:any)=>m.name==='cl-coral-colony'&&m.visible&&m.placementValid&&m.directPathClear).sort((a:any,b:any)=>a.distance-b.distance);expect(eligible.length,'visible valid coral with clear observed rock path').toBeGreaterThan(0);const nearest=eligible[0];evidence.target=nearest;save();
      await page.locator('canvas[role=application]').focus();
      for(let step=0;step<90;step++){
        const dive=await page.evaluate(()=>{const w=window as any,p=w.__nativeVisual,d=w.__toolData.cephalopodLab,stage=document.querySelector('.cl-hunt-stage');return{connected:p.record.canvas.isConnected,active:d.hunt3DActive,threeError:d._threeError||false,lastRun:d.huntLastRun||null,contextLost:p.record.ctx.isContextLost(),draws:p.record.draws,hud:stage?Object.fromEntries(Array.from(stage.querySelectorAll('[data-hud]')).map((n:any)=>[n.dataset.hud,n.textContent])):null};});evidence.nativeDive.push(dive);if(!dive.connected||!dive.active)save();expect(dive.connected&&dive.active,'native coral dive remains active during travel').toBe(true);
        const nav=await coralNavigationState(page,nearest.id);evidence.navigation.push(nav);if(nav.distance<2.4)break;
        const key=Math.abs(nav.angle)>.16?(nav.angle>0?'KeyA':'KeyD'):'KeyW';await page.keyboard.down(key);try{await nativeFrames(page,key==='KeyW'?8:2);}finally{await page.keyboard.up(key);}if(step%10===0)save();
      }
      evidence.arrived=await coralNavigationState(page,nearest.id);save();expect(evidence.arrived.distance).toBeLessThan(3.3);
    }
    await nativePause(page,profile);const paused=evidence.paused=await nativeVisualState(page,true);expectNativeHealthy(paused,profile);evidence.pausedSurface=await cuttleCoralState(page);await nativeFrames(page,5);expect(nativeFrozen(await nativeVisualState(page))).toEqual(nativeFrozen(paused));expect(frozenSurfaces(await cuttleCoralState(page))).toEqual(frozenSurfaces(evidence.pausedSurface));
    await nativeInspection(page,profile);
    if(profile.species==='cuttlefish'){for(let i=0;i<2;i++)await page.getByRole('button',{name:'Higher',exact:true}).click();await nativeFrames(page,4);}
    if(profile.id==='coral-near'){
      // Baseline-01 observed a complete 289x299px colony at +4.2 radians.
      // Seven native left clicks reach -2.1 radians (the same side within .017 radians)
      // without the 21-view search that selected a clipped 777x1124px closeup.
      for(let i=0;i<7;i++)await page.getByRole('button',{name:'Orbit left',exact:true}).click();await nativeFrames(page,4);evidence.orbit={route:'seven-native-orbit-left',basis:'browser-before-01 observed orbit step 14'};save();
    }
    evidence.inspected=await nativeVisualState(page,true);expectNativeHealthy(evidence.inspected,profile);expect(nativeFrozen(evidence.inspected)).toEqual(nativeFrozen(paused));evidence.inspectedSurface=await cuttleCoralState(page);expect(frozenSurfaces(evidence.inspectedSurface)).toEqual(frozenSurfaces(evidence.pausedSurface));save();await nativePhoto(page,info,'inspection-'+profile.id);assertPrograms(evidence.inspectedSurface,profile);
    if(profile.id==='coral-near'){const target=evidence.inspectedSurface.meshes.find((m:any)=>m.id===evidence.target.id),b=target.bounds;expect(target.visible&&target.placementValid&&(b.centerRaySelf||b.visibleSurfaceRays>=3)).toBe(true);expect(target.sample.epoch).toBe(evidence.inspectedSurface.epoch);expect(b.widthPixels).toBeGreaterThanOrEqual(70);expect(b.heightPixels).toBeGreaterThanOrEqual(70);expect(b.widthPixels).toBeLessThanOrEqual(600);expect(b.heightPixels).toBeLessThanOrEqual(450);expect(b.left).toBeGreaterThan(-.85);expect(b.right).toBeLessThan(.85);expect(b.bottom).toBeGreaterThan(-.72);expect(b.top).toBeLessThan(.7);}
    await nativeReturnToDive(page);expect(nativeFrozen(await nativeVisualState(page))).toEqual(nativeFrozen(paused));await nativeResume(page,profile);await expect.poll(async()=>(await nativeVisualState(page)).signature).not.toBe(paused.signature);
    if(profile.species==='cuttlefish')for(const name of ['cl-mantle','cl-fin--1','cl-fin-1'])await expect.poll(async()=>surfaceMotion(await cuttleCoralState(page),name),'native resumed motion '+name).not.toEqual(surfaceMotion(evidence.pausedSurface,name));
    if(profile.motion){const origin=await nativeVisualState(page);await nativeBeginMove(page,false);try{await expect.poll(async()=>horizontalDistance((await nativeVisualState(page)).player,origin.player)).toBeGreaterThan(.3);}finally{await nativeEndMove(page);}evidence.crawl=await nativeVisualState(page,true);expectNativeHealthy(evidence.crawl,profile);await nativeBeginMove(page,true);try{await expect.poll(async()=>Number(await page.locator('.cl-hunt-stage [data-hud=stamina]').textContent())).toBeLessThan(evidence.crawl.stamina-12);}finally{await nativeEndMove(page);}evidence.jet=await nativeVisualState(page,true);expectNativeHealthy(evidence.jet,profile);await nativePhoto(page,info,'jet-'+profile.id);}
    if(profile.touch)expect((await nativeVisualState(page)).nativePointers.some((e:any)=>e.trusted&&e.type==='touch'&&e.name==='Pause')).toBe(true);
  }catch(error){evidence.failure=String(error);save();await nativePhoto(page,info,'failure-'+profile.id).catch(()=>{});throw error;
  }finally{evidence.finalSurface=await cuttleCoralState(page).catch(()=>null);evidence.protectedPrograms=await nativePrograms(page).catch(()=>[]);evidence.errors=errors.get(page);save();await info.attach('native-cuttle-coral',{path:info.outputPath('poses-'+profile.id+'.json'),contentType:'application/json'});}
});});
