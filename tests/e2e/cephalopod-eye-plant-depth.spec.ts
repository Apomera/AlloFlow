import {test,expect,Page} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
import {useCephalopodAudioFallback} from './helpers/cephalopod_audio';
import {nativeProfiles,mountNativeVisuals,nativeVisualState,expectNativeHealthy,nativeFrames,nativeFrozen,nativePhoto,nativePause,nativeResume,nativeInspection,nativeReturnToDive,nativeBeginMove,nativeEndMove,nativePrograms,nativeTeardown,horizontalDistance,NativeProfile} from './helpers/cephalopod_native_visuals';

const source=(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js').replace(/\\/g,'/');
const harness=new GlHarness({toolFile:source,toolId:'cephalopodLab',width:1280,height:1000,layout:'document'});
const errors=new WeakMap<Page,string[]>();
test.describe.configure({timeout:240000,retries:0});
test.use({trace:'off',video:'off'});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());
test.beforeEach(async({page})=>{
  const list:string[]=[];errors.set(page,list);page.on('pageerror',error=>list.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&/WebGL|THREE|shader|program/i.test(message.text()))list.push(message.text());});
  await useCephalopodAudioFallback(page);
});
test.afterEach(async({page},info)=>{await nativeTeardown(page,harness,info);expect(errors.get(page)).toEqual([]);});

function expectSurfacePrograms(programs:any[],profile:NativeProfile){
  expect(programs.filter(p=>p.kind==='cl-iris')).toHaveLength(2);expect(programs.filter(p=>p.kind==='cl-pupil')).toHaveLength(2);
  expect(programs.filter(p=>p.kind==='kelp')).toHaveLength(1);expect(programs.filter(p=>p.kind==='grass')).toHaveLength(1);
  for(const program of programs){
    expect(program.linked,program.kind).toBe(true);expect(program.shaders).toHaveLength(2);expect(program.shaders.every((shader:any)=>shader.compiled)).toBe(true);
    const compiled=program.shaders.map((shader:any)=>shader.source).join('\n');
    if(program.kind==='kelp'||program.kind==='grass'){
      expect(program.cacheKey).toBe('cl-plant-flex-v58-rib-relief');
      for(const marker of ['clPlantMotion','clPlantOffset','clPlantSlope','clPlantRibField','clPlantRibPhase','clPlantRibAA','clPlantGradient','faceDirection'])expect(compiled,program.kind).toContain(marker);
      expect(program.ribbon).toEqual({enabled:true,size:1,bound:true});if(program.kind==='grass')expect(compiled).toContain('#define USE_INSTANCING');
    }else if(profile.species==='cuttlefish'){
      expect(compiled).not.toContain('clReefIris');if(program.kind==='cl-pupil')expect(program.cacheKey).toBe('cl-swimmer-pupil-water-v11');
    }else if(program.kind==='cl-iris'){
      expect(program.cacheKey).toBe('cl-reef-octopus-iris-depth-v1');
      for(const marker of ['clReefIrisCoord','clReefEyeScale','clReefIrisFilter','clReefIrisBroad','clReefIrisFine','clReefIrisGrain','clReefIrisTone','clReefIrisEdge','clReefIrisRoughness'])expect(compiled,program.kind).toContain(marker);
      expect(compiled).toContain('fwidth(clReefIrisCoord)');
    }else{
      expect(program.cacheKey).toBe('cl-reef-octopus-pupil-depth-v1');for(const marker of ['clOctoEyeN','clOctoEyeR','clOctoEyeBroad'])expect(compiled).toContain(marker);
      expect(compiled).toContain('vec3(-0.22,0.94,0.26)))),14.0)');expect(compiled).toContain('clOctoEyeBroad*0.24');
    }
  }
}

// Reuse accepted de540968 soft-forms images: these are the same native seed,
// viewport, inspection controls and follow-view movement thresholds.
for(const profile of nativeProfiles)test.describe(profile.id,()=>{
  test.use({viewport:{width:profile.width,height:profile.height},hasTouch:profile.touch,isMobile:profile.touch,deviceScaleFactor:1});
  test('iris and plant relief compile on actual native draws and retain motion',async({page},info)=>{
    const evidence:Record<string,any>={source,profile};
    try{
      await mountNativeVisuals(page,harness,profile);const idle=evidence.idle=await nativeVisualState(page,true);expectNativeHealthy(idle,profile);
      for(const kind of ['kelp','grass','cl-iris','cl-pupil'])expect(idle.samples.some((row:any)=>row.kind===kind&&row.epoch===idle.epoch),'native visible '+kind+' draw').toBe(true);
      expectSurfacePrograms(await nativePrograms(page),profile);
      await expect.poll(async()=>(await nativeVisualState(page)).signature,{timeout:15000}).not.toBe(idle.signature);
      const idleLater=evidence.idleLater=await nativeVisualState(page,true);expectNativeHealthy(idleLater,profile);expect(horizontalDistance(idle.player,idleLater.player)).toBeLessThan(1e-6);expect(idleLater.motion).not.toEqual(idle.motion);
      if(profile.motion)await nativePhoto(page,info,'idle-'+profile.id);await nativePause(page,profile);
      const paused=evidence.paused=await nativeVisualState(page,true);expectNativeHealthy(paused,profile);await nativeFrames(page,5);expect(nativeFrozen(await nativeVisualState(page))).toEqual(nativeFrozen(paused));
      await nativeInspection(page,profile);const inspected=evidence.inspected=await nativeVisualState(page,true);expectNativeHealthy(inspected,profile);expect(nativeFrozen(inspected)).toEqual(nativeFrozen(paused));await nativePhoto(page,info,'inspection-'+profile.id);
      expectSurfacePrograms(await nativePrograms(page),profile);
      if(profile.motion){
        for(let step=0;step<2;step++)await page.getByRole('button',{name:'Closer',exact:true}).click();await nativeFrames(page,4);
        const detail=evidence.eyeDetail=await nativeVisualState(page,true);expectNativeHealthy(detail,profile);expect(nativeFrozen(detail)).toEqual(nativeFrozen(paused));await nativePhoto(page,info,'inspection-eye-detail-'+profile.id);
        for(let step=0;step<2;step++)await page.getByRole('button',{name:'Farther',exact:true}).click();await nativeFrames(page,4);
        evidence.restoredInspection=await nativeVisualState(page,true);expect(nativeFrozen(evidence.restoredInspection)).toEqual(nativeFrozen(paused));
      }
      await nativeReturnToDive(page);expect(nativeFrozen(await nativeVisualState(page))).toEqual(nativeFrozen(paused));await nativeResume(page,profile);
      await expect.poll(async()=>(await nativeVisualState(page)).signature).not.toBe(paused.signature);
      if(profile.motion){
        const origin=await nativeVisualState(page);await nativeBeginMove(page,false);
        try{await expect.poll(async()=>horizontalDistance((await nativeVisualState(page)).player,origin.player),{timeout:15000}).toBeGreaterThan(.3);evidence.crawl=await nativeVisualState(page,true);expectNativeHealthy(evidence.crawl,profile);expect(evidence.crawl.signature).not.toBe(origin.signature);await nativePhoto(page,info,'crawl-'+profile.id);}finally{await nativeEndMove(page);}
        const beforeJet=await nativeVisualState(page);await nativeBeginMove(page,true);
        try{await expect.poll(async()=>Number(await page.locator('.cl-hunt-stage [data-hud=stamina]').textContent()),{timeout:20000}).toBeLessThan(beforeJet.stamina-12);evidence.jet=await nativeVisualState(page,true);expectNativeHealthy(evidence.jet,profile);expect(horizontalDistance(evidence.jet.player,beforeJet.player)).toBeGreaterThan(.1);expect(evidence.jet.signature).not.toBe(evidence.crawl.signature);await nativePhoto(page,info,'jet-'+profile.id);}finally{await nativeEndMove(page);}
        await nativePause(page,profile);const jetPaused=evidence.jetPaused=await nativeVisualState(page,true);expectNativeHealthy(jetPaused,profile);await nativeFrames(page,5);expect(nativeFrozen(await nativeVisualState(page))).toEqual(nativeFrozen(jetPaused));
      }
      if(profile.touch)expect((await nativeVisualState(page)).nativePointers.some((event:any)=>event.trusted&&event.type==='touch'&&event.name==='Pause')).toBe(true);
    }finally{
      evidence.programs=await nativePrograms(page).catch(()=>[]);const path=info.outputPath('poses-'+profile.id+'.json');writeFileSync(path,JSON.stringify(evidence,null,2));await info.attach('native-eye-plant-depth',{path,contentType:'application/json'});
    }
  });
});
