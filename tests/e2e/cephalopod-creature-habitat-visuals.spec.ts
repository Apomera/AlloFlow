import {test, expect, Page, TestInfo} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
import {useCephalopodAudioFallback} from './helpers/cephalopod_audio';
import {clickCephalopodControl} from './helpers/cephalopod_controls';

const source=(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js').replace(/\\/g,'/');
const expectSurfaceRelief=process.env.CEPHALOPOD_EXPECT_SURFACE_RELIEF==='1';
const harness=new GlHarness({toolFile:source,toolId:'cephalopodLab',width:1280,height:1000,layout:'document'});
const failures=new WeakMap<Page,string[]>();
const profiles=[
  {id:'common-octopus',species:'commonOcto',width:1280,height:900,touch:false,quality:'balanced',orbit:true},
  {id:'giant-pacific',species:'giantPacific',width:1280,height:900,touch:false,quality:'balanced',orbit:true},
  {id:'cuttlefish-reference',species:'cuttlefish',width:1280,height:900,touch:false,quality:'balanced',orbit:false},
  {id:'mobile-390',species:'commonOcto',width:390,height:844,touch:true,quality:'low',orbit:false},
  {id:'mobile-320',species:'commonOcto',width:320,height:568,touch:true,quality:'low',orbit:false},
] as const;
type Profile=typeof profiles[number];

test.describe.configure({timeout:180000,retries:0});
test.use({trace:'off',video:'off'});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.beforeEach(async({page})=>{
  const errors:string[]=[];failures.set(page,errors);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&/WebGL|THREE|shader|program/i.test(message.text()))errors.push(message.text());});
  await useCephalopodAudioFallback(page);
});
test.afterEach(async({page},info)=>{
  try{
    await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);
    const disposal=await page.evaluate(()=>((window as any).__creatureVisualProbe?.resources||[]).map((row:any)=>({uuid:row.resource.uuid,type:row.resource.type||'Texture',name:row.resource.name,disposed:row.disposed})));
    expect(disposal.length).toBeGreaterThan(0);
    // Existing scene teardown disposes each object's references. Shared skin
    // materials emit several events; the lifetime requirement is release of
    // every owned resource, with no release while the scene is still mounted.
    await info.attach('resource-disposal-counts',{body:JSON.stringify(disposal,null,2),contentType:'application/json'});
    expect(disposal.filter((row:any)=>row.disposed<1)).toEqual([]);
  }finally{await harness.destroy(page);}
  expect(failures.get(page)).toEqual([]);
});

async function frames(page:Page,count=3){
  await page.evaluate(async count=>{for(let i=0;i<count;i++)await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));},count);
}

async function mount(page:Page,profile:Profile){
  await page.goto(harness.url+'/__harness');
  await page.waitForFunction(()=>typeof (window as any).__mount==='function'&&!!(window as any).StemLab?._registry?.cephalopodLab);
  await page.evaluate(({species,quality})=>{
    let meta=document.querySelector('meta[name="viewport"]') as HTMLMetaElement|null;
    if(!meta){meta=document.createElement('meta');meta.name='viewport';document.head.appendChild(meta);}
    meta.content='width=device-width, initial-scale=1';
    document.getElementById('wrap')!.style.width='100%';
    const w=window as any,Original=w.THREE.WebGLRenderer;
    // Observe the actual renderer and camera. Do not replace the clock, camera,
    // scene, animals, materials, or any rendered effect for these screenshots.
    w.THREE.WebGLRenderer=new Proxy(Original,{construct(target,args,newTarget){
      const renderer=Reflect.construct(target,args,newTarget),render=renderer.render;
      renderer.render=function(scene:any,camera:any){
        if(scene?.getObjectByName('cl-player')){w.__creatureVisualRenderer=renderer;w.__creatureVisualCamera=camera;}
        return render.apply(this,arguments);
      };
      return renderer;
    }});
    w.__mount({cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:species,huntMode:'observe',huntSeed:2741,huntQuality:quality,_threeLoaded:true}});
  },profile);
  await page.waitForFunction(()=>(window as any).__glRecorder.records.some((r:any)=>r.createdBy==='page'&&r.canvas.isConnected&&r.scene?.getObjectByName('cl-player')&&r.draws>0&&!r.ctx.isContextLost()),undefined,{timeout:90000});
  await page.evaluate(()=>window.dispatchEvent(new Event('resize')));
  await page.locator('.cl-hunt-stage').scrollIntoViewIfNeeded();await frames(page);
  await page.evaluate(()=>{
    const w=window as any,record=w.__glRecorder.records.filter((r:any)=>r.scene&&r.canvas.isConnected).at(-1),player=record.scene.getObjectByName('cl-player');
    const meshes:any[]=[],resources=new Set<any>();
    record.scene.traverse((object:any)=>{
      let ancestor=object,inPlayer=false;while(ancestor){if(ancestor===player){inPlayer=true;break;}ancestor=ancestor.parent;}
      if(!object.isMesh||!(inPlayer||['cl-seafloor','cl-kelp','cl-seagrass','cl-coral-colony'].includes(object.name)||object.userData.substrate==='rock'))return;
      const materials=Array.isArray(object.material)?object.material:[object.material];
      resources.add(object.geometry);materials.forEach((material:any)=>{resources.add(material);Object.values(material).forEach((value:any)=>{if(value?.isTexture)resources.add(value);});});
      meshes.push({object,geometry:object.geometry,material:object.material,index:object.geometry.index,attributes:Object.entries(object.geometry.attributes).map(([name,attribute]:[string,any])=>({name,attribute,array:attribute.array}))});
    });
    w.__creatureVisualProbe={record,player,meshes,resources:[...resources].map(resource=>{const row={resource,disposed:0};resource.addEventListener('dispose',()=>row.disposed++);return row;}),frozen:null,submitted:{mantle:null,web:null,rock:null}};
    function watch(object:any,kind:'mantle'|'web'|'rock'){
      const previous=object.onAfterRender;
      object.onAfterRender=function(renderer:any,scene:any,camera:any,geometry:any,material:any,group:any){
        previous.call(this,renderer,scene,camera,geometry,material,group);
        if(w.__creatureVisualProbe.submitted[kind])return;
        // Read the program immediately after a real submitted draw of this
        // material, rather than accepting a marker from another scene object.
        const gl=renderer.getContext(),program=gl.getParameter(gl.CURRENT_PROGRAM),shaders=gl.getAttachedShaders(program)||[];
        const fragment=shaders.filter((shader:any)=>gl.getShaderParameter(shader,gl.SHADER_TYPE)===gl.FRAGMENT_SHADER).map((shader:any)=>gl.getShaderSource(shader)).join('\n');
        w.__creatureVisualProbe.submitted[kind]={object:object.name,material:material.name,key:material.customProgramCacheKey(),doubleSide:material.side===w.THREE.DoubleSide,linked:gl.getProgramParameter(program,gl.LINK_STATUS),compiled:shaders.map((shader:any)=>gl.getShaderParameter(shader,gl.COMPILE_STATUS)),octopusRelief:fragment.includes('clOctoSlopeLimit')&&fragment.includes('clOctoGradient'),rockMinerals:fragment.includes('clRockBedPhase')&&fragment.includes('clRockCrustWeight')};
      };
    }
    watch(player.getObjectByName('cl-mantle'),'mantle');
    const web=player.getObjectByName('cl-webbing');if(web)watch(web,'web');
    meshes.filter(row=>row.object.userData.substrate==='rock').forEach(row=>watch(row.object,'rock'));
  });
}

async function probe(page:Page){
  return page.evaluate(()=>{
    const w=window as any,p=w.__creatureVisualProbe,renderer=w.__creatureVisualRenderer,gl=p.record.ctx,stage=document.querySelector('.cl-hunt-stage')!,canvas=stage.querySelector('canvas[role=application]')!,box=stage.getBoundingClientRect();
    const programs=renderer.info.programs.map((row:any)=>({linked:gl.getProgramParameter(row.program,gl.LINK_STATUS),shaders:(gl.getAttachedShaders(row.program)||[]).map((shader:any)=>({compiled:gl.getShaderParameter(shader,gl.COMPILE_STATUS)}))}));
    return {
      species:p.player.userData.species,draws:p.record.draws,createdBy:p.record.createdBy,contextLost:gl.isContextLost(),forcedEffects:!!w.__alloForceFX,
      retained:p.meshes.every((row:any)=>row.object.geometry===row.geometry&&row.object.material===row.material&&row.geometry.index===row.index&&row.attributes.every((a:any)=>row.geometry.attributes[a.name]===a.attribute&&a.attribute.array===a.array)),
      finite:p.meshes.every((row:any)=>row.object.matrixWorld.elements.every(Number.isFinite)&&Object.values(row.geometry.attributes).every((a:any)=>Array.from(a.array).every(Number.isFinite))),
      resources:p.resources.length,disposed:p.resources.filter((row:any)=>row.disposed!==0).length,programs,submitted:p.submitted,
      geometryNames:[...new Set(p.meshes.map((row:any)=>row.object.name))],
      viewport:{width:innerWidth,height:innerHeight},stage:{left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:box.width,height:box.height},canvas:{width:(canvas as HTMLCanvasElement).width,height:(canvas as HTMLCanvasElement).height},
      horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,compact:stage.classList.contains('cl-hunt-touch-enabled'),
      camera:w.__creatureVisualCamera.position.toArray(),player:p.player.position.toArray(),time:stage.querySelector('[data-hud=time]')?.textContent,
    };
  });
}

async function freezeSnapshot(page:Page){
  await page.evaluate(()=>{
    const p=(window as any).__creatureVisualProbe,parts:any[]=[];
    p.player.traverse((object:any)=>parts.push({object,position:object.position.toArray(),quaternion:object.quaternion.toArray(),scale:object.scale.toArray(),vertices:object.geometry?.attributes.position?Array.from(object.geometry.attributes.position.array):null}));
    p.frozen={parts,time:document.querySelector('.cl-hunt-stage [data-hud=time]')?.textContent};
  });
}

async function expectFrozen(page:Page){
  const result=await page.evaluate(()=>{
    const p=(window as any).__creatureVisualProbe,saved=p.frozen;
    const same=(values:number[],current:ArrayLike<number>)=>values.length===current.length&&values.every((value,index)=>value===current[index]);
    return {parts:saved.parts.every((row:any)=>same(row.position,row.object.position.toArray())&&same(row.quaternion,row.object.quaternion.toArray())&&same(row.scale,row.object.scale.toArray())&&(!row.vertices||same(row.vertices,row.object.geometry.attributes.position.array))),time:saved.time===document.querySelector('.cl-hunt-stage [data-hud=time]')?.textContent};
  });
  expect(result).toEqual({parts:true,time:true});
}

function expectHealthy(state:Awaited<ReturnType<typeof probe>>,profile:Profile,resources?:number){
  expect(state.species).toBe(profile.species);expect(state.createdBy).toBe('page');expect(state.draws).toBeGreaterThan(0);
  expect(state.contextLost||state.forcedEffects||state.horizontalOverflow).toBe(false);expect(state.retained&&state.finite).toBe(true);expect(state.disposed).toBe(0);
  expect(state.resources).toBeGreaterThan(20);if(resources!==undefined)expect(state.resources).toBe(resources);
  expect(state.programs.length).toBeGreaterThan(0);for(const program of state.programs){expect(program.linked).toBe(true);expect(program.shaders).toHaveLength(2);expect(program.shaders.every((shader:any)=>shader.compiled)).toBe(true);}
  expect(state.geometryNames).toContain('cl-mantle');expect(state.geometryNames).toContain('cl-seafloor');
  expect(state.viewport.width).toBe(profile.width);expect(state.canvas.width).toBeGreaterThan(0);expect(state.canvas.height).toBeGreaterThan(0);
  if(profile.touch){expect(state.compact).toBe(true);expect(state.stage.left).toBeGreaterThanOrEqual(-1);expect(state.stage.right).toBeLessThanOrEqual(profile.width+1);expect(state.stage.top).toBeGreaterThanOrEqual(-1);expect(state.stage.bottom).toBeLessThanOrEqual(profile.height+1);}
}

async function photo(page:Page,info:TestInfo,label:string){
  const path=info.outputPath(label+'.png');await page.locator('.cl-hunt-stage').screenshot({path});await info.attach(label,{path,contentType:'image/png'});
}

for(const profile of profiles)test.describe(profile.id,()=>{
  test.use({viewport:{width:profile.width,height:profile.height},hasTouch:profile.touch,isMobile:profile.touch,deviceScaleFactor:1});
  test('native creature and habitat views retain healthy graphics through pause and inspection',async({page},info)=>{
    await mount(page,profile);await frames(page);const playing=await probe(page);expectHealthy(playing,profile);
    await photo(page,info,'live-'+profile.id);
    await page.getByRole('button',{name:'Pause',exact:true}).click();await expect(page.locator('.cl-hunt-stage [data-hud=burn]')).toHaveText('Paused');await frames(page);
    await freezeSnapshot(page);const paused=await probe(page);expectHealthy(paused,profile,playing.resources);
    await clickCephalopodControl(page,'Inspect');await expect(page.getByRole('region',{name:'Specimen inspection',exact:true})).toBeVisible();await frames(page);
    // Use the user's inspection controls to reveal the surface. The original
    // creature pose and the running world's camera remain entirely native.
    await page.getByRole('button',{name:'Anatomy labels',exact:true}).click();
    if(!profile.touch)await page.getByRole('button',{name:'Closer',exact:true}).click();
    await frames(page,5);await expectFrozen(page);
    const inspected=await probe(page);expectHealthy(inspected,profile,playing.resources);await photo(page,info,'inspection-'+profile.id);
    let orbited=null;
    if(profile.orbit){
      await page.getByRole('button',{name:'Orbit right',exact:true}).click();await page.getByRole('button',{name:'Orbit right',exact:true}).click();await frames(page,5);
      await expectFrozen(page);orbited=await probe(page);expectHealthy(orbited,profile,playing.resources);expect(orbited.camera).not.toEqual(inspected.camera);await photo(page,info,'orbit-'+profile.id);
    }
    await page.getByRole('button',{name:'Return to dive',exact:true}).click();await expect(page.getByRole('region',{name:'Specimen inspection',exact:true})).toBeHidden();
    await expect(page.locator('.cl-hunt-stage [data-hud=burn]')).toHaveText('Paused');await frames(page);await expectFrozen(page);
    const returned=await probe(page);expectHealthy(returned,profile,playing.resources);
    await page.getByRole('button',{name:'Resume',exact:true}).click();await frames(page,4);const resumed=await probe(page);expectHealthy(resumed,profile,playing.resources);expect(resumed.draws).toBeGreaterThan(returned.draws);
    await info.attach('native-creature-habitat-evidence',{body:JSON.stringify({source,expectSurfaceRelief,profile,playing,paused,inspected,orbited,returned,resumed},null,2),contentType:'application/json'});
    if(expectSurfaceRelief){
      expect(resumed.submitted.mantle,'native mantle draw').not.toBeNull();expect(resumed.submitted.rock,'native reef rock draw').not.toBeNull();
      for(const draw of [resumed.submitted.mantle,resumed.submitted.rock]){expect(draw.linked).toBe(true);expect(draw.compiled).toEqual([true,true]);}
      expect(resumed.submitted.rock.rockMinerals).toBe(true);expect(resumed.submitted.rock.key).toBe('cl-rock-minerals-v2');
      const octopus=profile.species!=='cuttlefish';expect(resumed.submitted.mantle.octopusRelief).toBe(octopus);
      if(octopus){
        expect(resumed.submitted.mantle.key).toBe('cl-octopus-surface-v70-relief-v1');
        expect(resumed.submitted.web,'native double-sided octopus web draw').not.toBeNull();
        expect(resumed.submitted.web.object).toBe('cl-webbing');expect(resumed.submitted.web.doubleSide).toBe(true);
        expect(resumed.submitted.web.linked).toBe(true);expect(resumed.submitted.web.compiled).toEqual([true,true]);
        expect(resumed.submitted.web.octopusRelief).toBe(true);expect(resumed.submitted.web.key).toBe('cl-octopus-surface-v70-relief-v1');
      }
    }
  });
});
