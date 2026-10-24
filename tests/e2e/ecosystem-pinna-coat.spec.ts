import {test,expect,type Page} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GlHarness} from './helpers/stem_gl_harness';

const dir=process.env.ECOLOGY_REPORT_DIR||'reports/ecosystem-refinement-next';
const baselineMode=process.env.ECOLOGY_CAPTURE_BASELINE==='1';
const hash=(value:any)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Persisted JSON has one representation for zero. Compare every field exactly,
// using numerical equality for +0/-0 without introducing a tolerance.
function sameRecorded(actual:any,expected:any){
  if(typeof expected==='number'){expect(typeof actual).toBe('number');expect(actual===expected).toBe(true);}
  else if(Array.isArray(expected)){expect(Array.isArray(actual)).toBe(true);expect(actual.length).toBe(expected.length);expected.forEach((value:any,k:number)=>sameRecorded(actual[k],value));}
  else if(expected&&typeof expected==='object'){expect(actual).not.toBeNull();expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());for(const key of Object.keys(expected))sameRecorded(actual[key],expected[key]);}
  else expect(actual).toBe(expected);
}
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true,
  probes:`THREE.WebGLRenderer=new Proxy(THREE.WebGLRenderer,{construct:function(target,args,newTarget){var r=Reflect.construct(target,args,newTarget),render=r.render;window.__pinnaRenderer=r;r.render=function(scene,camera){window.__pinnaCamera=camera;return render.apply(this,arguments);};return r;}});`});
test.describe.configure({timeout:300_000,retries:0});test.use({trace:'off',video:'off'});
test.beforeAll(async()=>{await mkdir(dir,{recursive:true});await harness.start();});
test.afterAll(async()=>harness.stop());
test.afterEach(async({page})=>{const errors=await page.evaluate(()=>(window as any).__events?.errors||[]);await harness.destroy(page);expect(errors).toEqual([]);});

async function choose(page:Page,id:string,step:number,index:number){
  const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas');
  await meadow.getByRole('button',{name:id==='foxes'?/Red foxes\s[\d.]/:/Rabbits\s[\d.]/}).click();
  if(!(await meadow.getByLabel('Representative animal',{exact:true}).count()))await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();
  await meadow.getByLabel('Meadow timeline',{exact:true}).fill(String(step));
  await meadow.getByLabel('Representative animal',{exact:true}).selectOption(String(index));
  await expect(canvas).toHaveAttribute('data-step',String(step));await expect(canvas).toHaveAttribute('data-selected-species',id);await expect(canvas).toHaveAttribute('data-representative-index',String(index));
  if(await meadow.getByRole('button',{name:'Isolate specimen',exact:true}).getAttribute('aria-pressed')!=='true')await meadow.getByRole('button',{name:'Isolate specimen',exact:true}).click();
  await meadow.getByRole('button',{name:'Face detail',exact:true}).click();
  await meadow.getByLabel('Meadow camera distance',{exact:true}).fill('9');
  await expect(canvas).toHaveAttribute('data-specimen-framing','face');
}
async function angle(page:Page,name:string,yaw:number){
  const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas');
  if(name==='front')await meadow.getByRole('button',{name:'Face view',exact:true}).click();
  else await meadow.getByRole('button',{name:'Side view',exact:true}).click();
  if(name==='rear')for(let turn=0;turn<3;turn++){
    const prior=await canvas.getAttribute('data-camera-bearing');await meadow.getByRole('button',{name:'Rotate left',exact:true}).click();await expect(canvas).not.toHaveAttribute('data-camera-bearing',prior!);
  }
  const expected=yaw+(name==='front'?Math.PI/2:name==='rear'?-Math.PI/2:0);
  await expect.poll(async()=>Number(await canvas.getAttribute('data-camera-bearing'))).toBeCloseTo(expected,10);
  // Wait for the requested zoom to reach the actual camera, rather than only
  // observing the React range value before its synchronous draw completes.
  await expect.poll(()=>page.evaluate(()=>{
    const w=window as any,canvas=document.querySelector('[data-efw-meadow] canvas')!,target=JSON.parse(canvas.getAttribute('data-camera-target')!);
    return w.__pinnaCamera.position.distanceTo(new w.THREE.Vector3(...target));
  })).toBeCloseTo(9*.20*.66*Math.sqrt(1+.42*.42),10);
}
async function actual(page:Page,id:string,index:number,step:number){
  const result=await page.evaluate(({id,index,step})=>{
    const w=window as any,T=w.THREE,api=w.StemLab.ecosystemFoodWeb,scene=w.__glCanvas('[data-efw-meadow]').rec.scene;
    const animal=scene.children.filter((g:any)=>g.userData.headSurface?.name==='eco-'+id+'-head-surface')[index],d=animal.userData,raw=api.mammalSurface(id,'ear');
    const pinnae=d.ears.map((ear:any)=>ear.children.find((part:any)=>part.isMesh)),pinna= pinnae[0],geometry=pinna.geometry,color=geometry.getAttribute('color');
    function shown(part:any){for(let node=part;node;node=node.parent)if(!node.visible)return false;return true;}
    const projection={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
    const drawn=pinnae.map((part:any)=>{
      const batch=scene.children.find((node:any)=>node.isInstancedMesh&&node.userData.parts?.includes(part)),slot=batch?.userData.parts.filter(shown).indexOf(part),matrix=new T.Matrix4();
      if(batch&&slot>=0)batch.getMatrixAt(slot,matrix);
      const p=part.geometry.getAttribute('position');for(let vertex=0;vertex<p.count;vertex++){
        const point=new T.Vector3().fromBufferAttribute(p,vertex).applyMatrix4(part.matrixWorld).project(w.__pinnaCamera);
        for(let axis=0;axis<3;axis++){const value=axis===0?point.x:axis===1?point.y:point.z;projection.min[axis]=Math.min(projection.min[axis],value);projection.max[axis]=Math.max(projection.max[axis],value);}
      }
      return {sourceInBatch:!!batch&&slot>=0,geometryIsDrawn:batch?.geometry===part.geometry,colourIsDrawn:batch?.geometry.getAttribute('color')===part.geometry.getAttribute('color'),error:!batch||slot<0?null:Math.max(...matrix.elements.map((value:number,k:number)=>Math.abs(value-part.matrixWorld.elements[k])))};
    });
    function average(vertices:number[]){const rgb=[0,0,0];for(const vertex of vertices)for(let axis=0;axis<3;axis++)rgb[axis]+=color.array[vertex*3+axis]/vertices.length;return {rgb,luminance:rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};}
    const front=Array.from({length:raw.faceLayer},(_,k)=>k),back=front.map(k=>k+raw.faceLayer),cup=front.filter(k=>raw.tints[k]>.9),edgeSlots=raw.rim.map((vertex:number,k:number)=>({vertex,k})).filter(({vertex}:any)=>raw.uv[vertex*2+1]>.2&&raw.uv[vertex*2+1]<.8).map(({k}:any)=>k);
    const rim=raw.rimLayers.map((loop:number[])=>average(edgeSlots.map((slot:number)=>loop[slot])));
    const material=pinna.material,image=material.map.image,pixels=image.getContext('2d').getImageData(0,0,image.width,image.height).data;let textureHash=2166136261;
    for(let k=0;k<pixels.length;k+=16)textureHash=Math.imul(textureHash^pixels[k],16777619);
    const limbs=id==='foxes'?d.legs:d.paws;
    return {
      physical:{root:animal.matrixWorld.toArray(),body:d.body.matrixWorld.toArray(),head:d.head.matrixWorld.toArray(),ears:d.ears.map((ear:any)=>({position:ear.position.toArray(),rotation:ear.rotation.toArray(),world:ear.matrixWorld.toArray(),pinna:ear.children[0].matrixWorld.toArray()})),jaw:d.jaw.matrixWorld.toArray(),nose:d.nose.matrixWorld.toArray(),soles:limbs.map((limb:any)=>{const paw=id==='foxes'?limb.userData.rig.paw:limb.userData.paw,sole=paw.isMesh?paw:paw.children.find((part:any)=>part.isMesh);return {paw:paw.matrixWorld.toArray(),sole:sole.matrixWorld.toArray(),footing:limb.userData.footing};}),pose:w.__pinnaFrames[step][id][index],articulation:d.mammalArticulation},
      geometry:{positions:Array.from(geometry.getAttribute('position').array),normals:Array.from(geometry.getAttribute('normal').array),uv:Array.from(geometry.getAttribute('uv').array),indices:Array.from(geometry.index.array)},
      colours:{front:average(front),back:average(back),cup:average(cup),rim,frontValues:Array.from(color.array.slice(0,raw.faceLayer*3)),backValues:Array.from(color.array.slice(raw.faceLayer*3,raw.faceLayer*6))},
      material:{type:material.type,vertexColors:material.vertexColors,baseColour:material.color.getHex(),roughness:material.roughness,bumpScale:material.bumpScale,textureWidth:image.width,textureHeight:image.height,textureHash:textureHash>>>0,distinctRelief:material.bumpMap.image!==image},
      shared:{geometries:new Set(pinnae.map((part:any)=>part.geometry)).size,materials:new Set(pinnae.map((part:any)=>part.material)).size},drawn,projection,camera:w.__pinnaCamera.matrixWorld.toArray(),renderer:{geometries:w.__pinnaRenderer.info.memory.geometries,textures:w.__pinnaRenderer.info.memory.textures,calls:w.__pinnaRenderer.info.render.calls},
    };
  },{id,index,step});
  const {geometry,colours,...rest}=result;
  const {frontValues,backValues,...colourStats}=colours;
  return {...rest,geometrySha256:hash(geometry),colours:{...colourStats,frontSha256:hash(frontValues),backSha256:hash(backValues)}};
}
function validDrawn(value:any){
  expect(value.shared).toEqual({geometries:1,materials:1});expect(value.material.vertexColors).toBe(true);expect(value.material.distinctRelief).toBe(true);
  for(const part of value.drawn){expect(part.sourceInBatch).toBe(true);expect(part.geometryIsDrawn).toBe(true);expect(part.colourIsDrawn).toBe(true);expect(part.error).not.toBeNull();expect(part.error).toBeLessThan(2e-6);}
  for(const axis of [0,1]){expect(value.projection.min[axis]).toBeGreaterThan(-.98);expect(value.projection.max[axis]).toBeLessThan(.98);}
  expect(value.projection.min[2]).toBeGreaterThan(-1);expect(value.projection.max[2]).toBeLessThan(1);
}

test('fox dark ear backs and warm cups reach actual shared draws through unchanged recorded turns while both species retain geometry paws and front side rear framing',async({page})=>{
  const substitution=(process.env.STEM_GL_SUBSTITUTE||'').split(';').find(value=>value.startsWith('stem_lab/stem_tool_ecosystem.js=')),file=substitution?substitution.slice(substitution.indexOf('=')+1):'stem_lab/stem_tool_ecosystem.js';
  const sourceSha256=createHash('sha256').update(await readFile(file)).digest('hex');
  await page.setViewportSize({width:1140,height:1050});await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';});
  await page.getByRole('button',{name:'Rabbit neighbors',exact:true}).click();await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  const meadow=page.locator('[data-efw-meadow]');if(!(await meadow.isVisible()))await page.getByRole('button',{name:'Show 3D meadow',exact:true}).click();
  const readiness=await page.waitForFunction(()=>{const r=(window as any).__glCanvas?.('[data-efw-meadow]');return r?.rec?.scene&&r.rec.draws>0&&document.querySelector('[data-efw-meadow] canvas')?.hasAttribute('data-representative-index')?'ready':document.querySelector('[data-efw-meadow]')?.textContent?.includes('3D is unavailable on this device.')?'unavailable':false;},undefined,{timeout:60_000});expect(await readiness.jsonValue()).toBe('ready');
  await meadow.getByLabel('Meadow scene data',{exact:true}).selectOption('baseline');
  const fixture=await page.evaluate(()=>{
    const w=window as any,api=w.StemLab.ecosystemFoodWeb,config=w.__toolData.ecosystem.foodWeb.run.config;w.__pinnaFrames=api.behaviorTimeline(config,api.compare(config).baseline);
    const samples=['foxes','rabbits'].map(id=>{let best:any=null;for(let step=3;step<w.__pinnaFrames.length;step++)w.__pinnaFrames[step][id].forEach((pose:any,index:number)=>{
      const previous=w.__pinnaFrames[step-3][id][index];if(!pose.active||!previous?.active||pose.pounce>.01||pose.rest>.3)return;
      const current=api.mammalArticulation(id,pose,false),before=api.mammalArticulation(id,previous,false);if(current.headPitch<-.35||current.flightLift>.005)return;
      const score=Math.abs(current.headYaw-before.headYaw)+.1*Math.abs(current.earLeft-current.earRight);if(score>(best?.score||.01))best={id,step,index,priorStep:step-3,yaw:pose.yaw,score};
    });return best;});return {config,samples};
  });
  expect(fixture.samples.every(Boolean),'both unchanged recordings contain a genuine head/ear turn').toBe(true);
  const baseline=baselineMode?null:JSON.parse(await readFile(dir+'/pinna-coat-baseline.json','utf8'));if(baseline)expect(fixture).toEqual(baseline.fixture);
  const records:any[]=[];
  for(const sample of fixture.samples){
    await choose(page,sample.id,sample.priorStep,sample.index);const priorYaw=await page.evaluate(({id,index,step})=>(window as any).__pinnaFrames[step][id][index].yaw,{id:sample.id,index:sample.index,step:sample.priorStep});await angle(page,'front',priorYaw);const prior=await actual(page,sample.id,sample.index,sample.priorStep);validDrawn(prior);
    if(baseline){const original=baseline.records.find((row:any)=>row.id===sample.id);sameRecorded(prior.physical,original.prior.physical);expect(prior.geometrySha256).toBe(original.prior.geometrySha256);}
    await choose(page,sample.id,sample.step,sample.index);const views:any[]=[];
    for(const view of ['front','side','rear']){
      await angle(page,view,sample.yaw);const drawn=await actual(page,sample.id,sample.index,sample.step);validDrawn(drawn);
      expect(drawn.physical.head).not.toEqual(prior.physical.head);
      if(baseline){
        const before=baseline.records.find((row:any)=>row.id===sample.id).views.find((row:any)=>row.view===view).drawn;
        sameRecorded(drawn.physical,before.physical);expect(drawn.geometrySha256).toBe(before.geometrySha256);sameRecorded(drawn.camera,before.camera);expect(drawn.material).toEqual(before.material);expect(drawn.shared).toEqual(before.shared);
        expect(drawn.renderer.geometries).toBe(before.renderer.geometries);expect(drawn.renderer.textures).toBe(before.renderer.textures);expect(drawn.renderer.calls).toBeLessThanOrEqual(before.renderer.calls);
        expect(drawn.colours.backSha256).not.toBe(before.colours.backSha256);
        if(sample.id==='foxes'){
          expect(drawn.colours.back.luminance).toBeLessThan(before.colours.back.luminance*.4);expect(drawn.colours.cup.rgb[0]/drawn.colours.cup.rgb[1]).toBeGreaterThan(before.colours.cup.rgb[0]/before.colours.cup.rgb[1]+.05);
        }else{
          expect(drawn.colours.frontSha256).toBe(before.colours.frontSha256);expect(drawn.colours.back.luminance).toBeLessThan(before.colours.back.luminance);expect(drawn.colours.back.luminance).toBeGreaterThan(before.colours.back.luminance*.65);
        }
        for(let band=1;band<drawn.colours.rim.length;band++)expect(drawn.colours.rim[band].luminance).toBeLessThan(drawn.colours.rim[band-1].luminance);
      }
      await meadow.locator('.efw-meadow-stage').screenshot({path:dir+'/'+(baselineMode?'before':'after')+'-pinna-'+sample.id+'-'+view+'.jpg',type:'jpeg',quality:92});views.push({view,drawn});
    }
    // Exact rewind is checked after changing both sample and angle.
    await choose(page,sample.id,sample.priorStep,sample.index);await angle(page,'front',priorYaw);expect((await actual(page,sample.id,sample.index,sample.priorStep)).physical).toEqual(prior.physical);
    records.push({id:sample.id,prior,views});
  }
  await writeFile(dir+'/'+(baselineMode?'pinna-coat-baseline.json':'pinna-coat-rendered.json'),JSON.stringify({sourceSha256,fixture,records,geometryRigPawsAndDrawCountsUnchanged:!baselineMode},null,2)+'\n');
});
