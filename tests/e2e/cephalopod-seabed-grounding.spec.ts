import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { useCephalopodAudioFallback } from './helpers/cephalopod_audio';

const model=(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js').replace(/\\/g,'/');
const harness=new GlHarness({toolFile:model,toolId:'cephalopodLab',width:900,height:1000,layout:'document'});
const canvas='canvas[role=application]',errors=new WeakMap<Page,string[]>();

async function waitFrames(page:Page,count:number){
  const target=await page.evaluate(count=>(window as any).__seabedAudit.draws+count,count);
  await page.waitForFunction(target=>(window as any).__seabedAudit.draws>=target,target,{timeout:90000,polling:'raf'});
}
async function read(page:Page){return page.evaluate(()=>(window as any).__seabedRead());}
async function mount(page:Page,phone:boolean){
  await harness.mount(page,{cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:'commonOcto',huntMode:'observe',huntSeed:2741,huntQuality:phone?'low':'balanced',_threeLoaded:true}});
  if(phone)await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';window.dispatchEvent(new Event('resize'));});
  await page.evaluate(()=>{
    const w=window as any,T=w.THREE,record=w.__glRecorder.records.filter((row:any)=>row.scene&&row.canvas.isConnected).at(-1);
    if(!record||record.createdBy!=='page')throw Error('Production-created WebGL scene required');
    const scene=record.scene,floor=scene.getObjectByName('cl-seafloor'),gl=record.ctx,player=scene.getObjectByName('cl-player');
    if(!floor?.isMesh)throw Error('Actual rendered seafloor required');
    // Read the live retained uniform through a detached template. The submitted
    // GPU program, bindings, and values are independently captured below.
    const shader={uniforms:{} as any,vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};
    floor.material.onBeforeCompile(shader);
    const field=shader.uniforms.clSandHabitat;
    if(field?.value?.length!==5)throw Error('Five retained habitat vectors required');
    const owned={geometry:floor.geometry,material:floor.material,map:floor.material.map,index:floor.geometry.index,indexArray:floor.geometry.index.array,
      attributes:Object.entries(floor.geometry.attributes).map(([name,a]:[string,any])=>({name,attribute:a,array:a.array})),array:field.value,vectors:field.value.slice()};
    const audit=w.__seabedAudit={draws:0,native:null as any,nativeBuffers:new Map(),buffersRetained:true,resources:[] as any[]};
    for(const resource of [owned.geometry,owned.material,owned.map]){const row={uuid:resource.uuid,disposed:0};resource.addEventListener('dispose',()=>row.disposed++);audit.resources.push(row);}
    let drawing=false,lastDraw:any=null;
    for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){
      const original=gl[name]?.bind(gl);if(!original)continue;
      gl[name]=function(...args:any[]){if(drawing)lastDraw={program:gl.getParameter(gl.CURRENT_PROGRAM),indexed:name.startsWith('drawElements'),count:name.startsWith('drawElements')?args[1]:args[2]};return original(...args);};
    }
    const before=floor.onBeforeRender,after=floor.onAfterRender;
    floor.onBeforeRender=function(...args:any[]){before.apply(this,args);drawing=true;lastDraw=null;};
    floor.onAfterRender=function(renderer:any,s:any,camera:any,geometry:any,material:any,group:any){
      after.call(this,renderer,s,camera,geometry,material,group);drawing=false;
      const program=gl.getParameter(gl.CURRENT_PROGRAM);if(!lastDraw||lastDraw.program!==program)return;
      const shaders=gl.getAttachedShaders(program),fragment=shaders.find((entry:any)=>gl.getShaderParameter(entry,gl.SHADER_TYPE)===gl.FRAGMENT_SHADER);
      const bindings=['position','normal','uv'].map(name=>{const location=gl.getAttribLocation(program,name),buffer=location<0?null:gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);
        if(audit.nativeBuffers.has(name))audit.buffersRetained&&=audit.nativeBuffers.get(name)===buffer;else audit.nativeBuffers.set(name,buffer);
        return {name,bound:!!buffer,enabled:location>=0&&!!gl.getVertexAttrib(location,gl.VERTEX_ATTRIB_ARRAY_ENABLED)};});
      const beds=Array.from({length:5},(_,index)=>{const location=gl.getUniformLocation(program,'clSandHabitat['+index+']');return location===null?null:Array.from(gl.getUniform(program,location));});
      audit.draws++;audit.native={linked:!!gl.getProgramParameter(program,gl.LINK_STATUS),compiled:shaders.every((entry:any)=>gl.getShaderParameter(entry,gl.COMPILE_STATUS)),
        fieldApplied:gl.getShaderSource(fragment).includes('clHabitatWeight')&&gl.getShaderSource(fragment).includes('clHabitatClearSand'),beds,bindings,indexed:lastDraw.indexed,count:lastDraw.count,
        material:material.type,opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite,receiveShadow:floor.receiveShadow,
        camera:camera.position.toArray(),cameraQuaternion:camera.quaternion.toArray(),fieldOfView:camera.fov};
    };
    w.__seabedRead=()=>{
      const rocks=scene.children.filter((mesh:any)=>mesh.userData.substrate==='rock');
      const plants=scene.children.filter((mesh:any)=>['cl-seagrass','cl-kelp'].includes(mesh.name));
      const anchors=Array.from({length:5},(_,index)=>{const plant=plants.find((mesh:any)=>mesh.userData.clHabitat?.grove===index&&mesh.userData.clHabitat?.valid),rock=plant&&rocks[plant.userData.clHabitat.anchorIndex];return rock?{position:rock.position.toArray(),footprint:{...rock.userData.reefFootprint}}:null;});
      return {draws:audit.draws,renders:record.renders,pageCreated:record.createdBy==='page',contextLost:gl.isContextLost(),native:audit.native,
        field:field.value.map((vector:any)=>vector.toArray()),anchors,player:player.position.toArray(),floorPosition:floor.position.toArray(),
        key:floor.material.customProgramCacheKey(),resources:audit.resources.map((row:any)=>({...row})),
        retained:floor.geometry===owned.geometry&&floor.material===owned.material&&floor.material.map===owned.map&&floor.geometry.index===owned.index&&floor.geometry.index.array===owned.indexArray&&owned.attributes.every(row=>floor.geometry.attributes[row.name]===row.attribute&&row.attribute.array===row.array)&&field.value===owned.array&&owned.vectors.every((vector:any,index:number)=>field.value[index]===vector),
        buffersRetained:audit.buffersRetained,sceneLights:scene.children.filter((object:any)=>object.isLight).length};
    };
  });
  await waitFrames(page,8);
}
function healthy(row:any){
  expect(row.pageCreated).toBe(true);expect(row.contextLost).toBe(false);expect(row.retained).toBe(true);expect(row.buffersRetained).toBe(true);
  expect(row.key).toBe('cl-shelf-geology-v61-habitat-v1');expect(row.field).toHaveLength(5);expect(row.anchors.every(Boolean)).toBe(true);
  expect(row.native).toMatchObject({linked:true,compiled:true,fieldApplied:true,indexed:true,material:'MeshStandardMaterial',opacity:1,transparent:false,depthWrite:true,receiveShadow:true});
  expect(row.native.count).toBeGreaterThan(0);expect(row.native.bindings.every((entry:any)=>entry.bound&&entry.enabled)).toBe(true);
  for(let index=0;index<5;index++){
    const field=row.field[index],gpu=row.native.beds[index],anchor=row.anchors[index];expect(gpu).toHaveLength(4);expect(field.every(Number.isFinite)).toBe(true);
    for(let component=0;component<4;component++)expect(gpu[component]).toBeCloseTo(Math.fround(field[component]),5);
    expect(field[0]).toBeCloseTo(anchor.position[0]+Math.cos(field[3]),10);expect(field[1]).toBeCloseTo(anchor.position[2]+Math.sin(field[3]),10);
    expect(field[2]).toBeGreaterThanOrEqual(6);expect(field[2]).toBeLessThanOrEqual(10);
  }
  expect(row.resources.every((entry:any)=>entry.disposed===0)).toBe(true);
}

test.describe.configure({timeout:240000,retries:0,mode:'default'});
test.use({trace:'off',video:'off'});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());
test.beforeEach(async({page})=>{const list:string[]=[];errors.set(page,list);page.on('pageerror',error=>list.push(error.message));page.on('console',message=>{if(message.type()==='error')list.push(message.text());});await useCephalopodAudioFallback(page);});
test.afterEach(async({page})=>{await harness.destroy(page);expect(errors.get(page)).toEqual([]);});

for(const phone of [false,true])test.describe(phone?'Narrow touch low quality':'Desktop balanced quality',()=>{
  if(phone)test.use({hasTouch:true,viewport:{width:390,height:844}});
  test('submits five habitat beds during ordinary play and retains floor resources through movement and pause',async({page},testInfo)=>{
    await mount(page,phone);await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeVisible();
    const initial=await read(page);healthy(initial);
    const initialImage=testInfo.outputPath('seabed-playing.png');await page.locator('.cl-hunt-stage').screenshot({path:initialImage});await testInfo.attach('ordinary-playing-seabed',{path:initialImage,contentType:'image/png'});
    await page.locator(canvas).focus();await page.keyboard.down('KeyW');
    try{await waitFrames(page,12);}finally{await page.keyboard.up('KeyW');}
    await waitFrames(page,8);const moving=await read(page);healthy(moving);expect(moving.player).not.toEqual(initial.player);expect(moving.field).toEqual(initial.field);expect(moving.resources).toEqual(initial.resources);expect(moving.sceneLights).toBe(initial.sceneLights);
    await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeVisible();
    const movingImage=testInfo.outputPath('seabed-playing-moved.png');await page.locator('.cl-hunt-stage').screenshot({path:movingImage});await testInfo.attach('ordinary-playing-after-native-movement',{path:movingImage,contentType:'image/png'});
    await page.getByRole('button',{name:'Pause',exact:true}).click();await waitFrames(page,3);const paused=await read(page);await waitFrames(page,8);const held=await read(page);healthy(held);expect(held.field).toEqual(paused.field);expect(held.player).toEqual(paused.player);expect(held.resources).toEqual(initial.resources);
    await page.locator(canvas).focus();await page.keyboard.press('Escape');await waitFrames(page,3);healthy(await read(page));
    await testInfo.attach('native-seabed-audit',{body:JSON.stringify({scope:'Production clock, camera, scene, and actor state remain unmodified. Screenshots are captured while playing; movement uses the ordinary W key. Only render callbacks and GL draw methods are wrapped for read-only audit.',initial,moving,paused,held},null,2),contentType:'application/json'});
    await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);
    expect(await page.evaluate(()=>(window as any).__seabedAudit.resources.map((entry:any)=>entry.disposed))).toEqual([1,1,1]);
  });
});
