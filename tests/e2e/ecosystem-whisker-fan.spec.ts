import {test,expect,type Page} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GlHarness} from './helpers/stem_gl_harness';

const dir=process.env.ECOLOGY_REPORT_DIR||'reports/ecosystem-naturalism-next',baselineMode=process.env.ECOLOGY_CAPTURE_BASELINE==='1';
const hash=(value:any)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function firstDifference(actual:any,expected:any,where='record'):string|null{
  if(typeof actual!==typeof expected)return where+': actual type '+typeof actual+', expected '+typeof expected;
  if(typeof expected==='number')return actual===expected?null:where+': actual '+String(actual)+', expected '+String(expected);
  if(expected===null||typeof expected!=='object')return actual===expected?null:where+': actual '+String(actual)+', expected '+String(expected);
  if(actual===null)return where+': actual null, expected object';
  if(Array.isArray(actual)!==Array.isArray(expected))return where+': array/object type differs';
  if(Array.isArray(expected)&&actual.length!==expected.length)return where+': actual length '+actual.length+', expected '+expected.length;
  const keys=Object.keys(expected).sort(),actualKeys=Object.keys(actual).sort();
  if(keys.length!==actualKeys.length||keys.some((key,k)=>key!==actualKeys[k]))return where+': actual keys '+JSON.stringify(actualKeys)+', expected '+JSON.stringify(keys);
  for(const key of keys){const difference=firstDifference(actual[key],expected[key],where+(Array.isArray(expected)?'['+key+']':'.'+key));if(difference!==null)return difference;}
  return null;
}
function exact(actual:any,expected:any,where='record'){
  expect(firstDifference(actual,expected,where),'every recorded field remains exactly equal').toBeNull();
}
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true,
  probes:`THREE.WebGLRenderer=new Proxy(THREE.WebGLRenderer,{construct:function(target,args,newTarget){var r=Reflect.construct(target,args,newTarget),render=r.render;window.__whiskerRenderer=r;r.render=function(scene,camera){window.__whiskerCamera=camera;return render.apply(this,arguments);};return r;}});`});
test.describe.configure({timeout:300_000,retries:0});test.use({trace:'off',video:'off'});
test.beforeAll(async()=>{await mkdir(dir,{recursive:true});await harness.start();});
test.afterAll(async()=>harness.stop());
test.afterEach(async({page})=>{const errors=await page.evaluate(()=>(window as any).__events?.errors||[]);await harness.destroy(page);expect(errors).toEqual([]);});

async function choose(page:Page,sample:any){
  const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas');
  await meadow.getByRole('button',{name:sample.id==='foxes'?/Red foxes\s[\d.]/:/Rabbits\s[\d.]/}).click();
  if(!(await meadow.getByLabel('Representative animal',{exact:true}).count()))await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();
  await meadow.getByLabel('Meadow timeline',{exact:true}).fill(String(sample.step));
  await meadow.getByLabel('Representative animal',{exact:true}).selectOption(String(sample.index));
  await expect(canvas).toHaveAttribute('data-selected-species',sample.id);await expect(canvas).toHaveAttribute('data-representative-index',String(sample.index));await expect(canvas).toHaveAttribute('data-step',String(sample.step));
  if(await meadow.getByRole('button',{name:'Isolate specimen',exact:true}).getAttribute('aria-pressed')!=='true')await meadow.getByRole('button',{name:'Isolate specimen',exact:true}).click();
  await meadow.getByRole('button',{name:'Face detail',exact:true}).click();
  await meadow.getByLabel('Meadow camera distance',{exact:true}).fill('9');await expect(canvas).toHaveAttribute('data-specimen-framing','face');
}
async function angle(page:Page,view:string,yaw:number){
  const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas');
  await meadow.getByRole('button',{name:'Face view',exact:true}).click();
  if(view==='oblique')await meadow.getByRole('button',{name:'Rotate left',exact:true}).click();
  await expect.poll(async()=>Number(await canvas.getAttribute('data-camera-bearing'))).toBeCloseTo(yaw+Math.PI/2-(view==='oblique'?Math.PI/6:0),10);
  await expect.poll(()=>page.evaluate(()=>{const w=window as any,target=JSON.parse(document.querySelector('[data-efw-meadow] canvas')!.getAttribute('data-camera-target')!);return w.__whiskerCamera.position.distanceTo(new w.THREE.Vector3(...target));})).toBeCloseTo(9*.20*.66*Math.sqrt(1+.42*.42),10);
}
async function actual(page:Page,sample:any){
  const value=await page.evaluate(({id,index})=>{
    const w=window as any,T=w.THREE,api=w.StemLab.ecosystemFoodWeb,canvas=document.querySelector('[data-efw-meadow] canvas')!,scene=w.__glCanvas('[data-efw-meadow]').rec.scene,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const step=reduced?0:Number(canvas.getAttribute('data-step')),pose=w.__whiskerFrames[step][id][index],animals=scene.children.filter((node:any)=>node.userData.headSurface?.name==='eco-'+id+'-head-surface'),animal=animals[index],d=animal.userData,line=d.whiskers,position=line.geometry.getAttribute('position'),raw=api.mammalWhiskers(id,pose,reduced);
    const physical:any[]=[];const geometry:any[]=[];
    function bytesHash(array:any){const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);let value=2166136261;for(const byte of bytes)value=Math.imul(value^byte,16777619);return value>>>0;}
    function visit(node:any,nodePath:string){
      physical.push({path:nodePath,name:node.name,type:node.type,local:node.matrix.toArray(),world:node.matrixWorld.toArray(),position:node.position.toArray(),rotation:node.rotation.toArray(),scale:node.scale.toArray(),instances:node.isInstancedMesh?Array.from(node.instanceMatrix.array):null});
      if(node.geometry&&node!==line)geometry.push({path:nodePath,index:node.geometry.index?bytesHash(node.geometry.index.array):null,attributes:Object.fromEntries(Object.entries(node.geometry.attributes).map(([name,attr]:any)=>[name,{itemSize:attr.itemSize,count:attr.count,hash:bytesHash(attr.array)}]))});
      node.children.forEach((child:any,k:number)=>visit(child,nodePath+'/'+k));
    }
    visit(animal,'root');
    let bufferError=0,rootError=0;const projection={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]},tips:any[]=[],roots:any[]=[];
    for(let k=0;k<position.array.length;k++)bufferError=Math.max(bufferError,Math.abs(position.array[k]-raw.positions[k]));
    for(let k=0;k<position.count;k++){
      const point=new T.Vector3().fromBufferAttribute(position,k).applyMatrix4(line.matrixWorld).project(w.__whiskerCamera);
      for(let axis=0;axis<3;axis++){const number=axis===0?point.x:axis===1?point.y:point.z;projection.min[axis]=Math.min(projection.min[axis],number);projection.max[axis]=Math.max(projection.max[axis],number);}
    }
    raw.roots.forEach((vertex:number,strand:number)=>{const root=Array.from(position.array.slice(vertex*3,vertex*3+3));roots.push(root);tips.push(Array.from(position.array.slice((vertex+15)*3,(vertex+16)*3)));raw.rootPositions[strand].forEach((number:number,axis:number)=>{rootError=Math.max(rootError,Math.abs(number-position.array[vertex*3+axis]));});});
    let visible=true;for(let node=line;node;node=node.parent)if(!node.visible)visible=false;
    const m=line.material,limbs=id==='foxes'?d.legs:d.paws,feet=limbs.map((limb:any)=>{const paw=id==='foxes'?limb.userData.rig.paw:limb.userData.paw,sole=paw.isMesh?paw:paw.children.find((node:any)=>node.isMesh);return {paw:paw.matrixWorld.toArray(),sole:sole.matrixWorld.toArray(),footing:limb.userData.footing};});
    const bias=tips.slice(3).reduce((sum:number,p:any,k:number)=>sum+Math.abs(p[2])-Math.abs(tips[k][2]),0);
    return {physical:{nodes:physical,pose,articulation:d.mammalArticulation,feet},geometry,positions:Array.from(position.array),roots,tips,bias,projection,bufferError,rootError,
      drawn:{visible,lineSegments:line.isLineSegments,parentIsHead:line.parent===d.head,count:position.count,segments:raw.segments,strands:raw.strands,lines:w.__whiskerRenderer.info.render.lines,vertexBufferHasUpdated:position.version>0},
      sharing:{privateBuffers:new Set(animals.map((root:any)=>root.userData.whiskers.geometry.getAttribute('position').array)).size,materials:new Set(animals.map((root:any)=>root.userData.whiskers.material)).size},
      material:{type:m.type,color:m.color.getHex(),opacity:m.opacity,transparent:m.transparent,depthTest:m.depthTest,linewidth:m.linewidth},renderer:{geometries:w.__whiskerRenderer.info.memory.geometries,textures:w.__whiskerRenderer.info.memory.textures,calls:w.__whiskerRenderer.info.render.calls},camera:w.__whiskerCamera.matrixWorld.toArray(),chewing:api.mammalWhiskerPose?api.mammalWhiskerPose(id,pose,reduced):null};
  },sample);
  const {geometry,...rest}=value;return {...rest,geometrySha256:hash(geometry),positionsSha256:hash(value.positions)};
}
function valid(value:any){
  expect(value.drawn).toMatchObject({visible:true,lineSegments:true,parentIsHead:true,count:96,segments:8,strands:6,vertexBufferHasUpdated:true});expect(value.drawn.lines).toBeGreaterThanOrEqual(48);
  expect(value.sharing).toEqual({privateBuffers:16,materials:1});expect(value.bufferError).toBeLessThan(1e-7);expect(value.rootError).toBeLessThan(1e-7);
  for(const axis of [0,1]){expect(value.projection.min[axis]).toBeGreaterThan(-.98);expect(value.projection.max[axis]).toBeLessThan(.98);}expect(value.projection.min[2]).toBeGreaterThan(-1);expect(value.projection.max[2]).toBeLessThan(1);
  value.roots.forEach((root:any,strand:number)=>{const side=strand<3?-1:1;let previous=0;for(let k=0;k<16;k++){const index=(strand*16+k)*3,outward=side*(value.positions[index+2]-root[2]);expect(outward).toBeGreaterThanOrEqual(previous-1e-7);expect(value.positions[index]).toBeLessThanOrEqual(root[0]+1e-7);previous=outward;}});
}
function compare(value:any,before:any){
  exact(value.physical,before.physical);exact(value.camera,before.camera);expect(value.geometrySha256).toBe(before.geometrySha256);expect(value.roots).toEqual(before.roots);expect(value.material).toEqual(before.material);expect(value.sharing).toEqual(before.sharing);expect(value.renderer).toEqual(before.renderer);
  expect(value.positionsSha256).not.toBe(before.positionsSha256);let maximum=0;for(let k=0;k<96;k++)maximum=Math.max(maximum,Math.hypot(...[0,1,2].map(axis=>value.positions[k*3+axis]-before.positions[k*3+axis])));expect(maximum).toBeGreaterThan(.025);expect(maximum).toBeLessThan(.085);
}

test('varied fox and rabbit whisker fans draw through exact original rigs while opposing recorded rabbit chewing phases move only distal strands and reduced phone views freeze',async({page})=>{
  const substitution=(process.env.STEM_GL_SUBSTITUTE||'').split(';').find(value=>value.startsWith('stem_lab/stem_tool_ecosystem.js=')),file=substitution?substitution.slice(substitution.indexOf('=')+1):'stem_lab/stem_tool_ecosystem.js',sourceSha256=createHash('sha256').update(await readFile(file)).digest('hex');
  await page.setViewportSize({width:1140,height:1050});await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';});
  await page.getByRole('button',{name:'Rabbit neighbors',exact:true}).click();await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas');
  if(!(await meadow.isVisible()))await page.getByRole('button',{name:'Show 3D meadow',exact:true}).click();
  const ready=await page.waitForFunction(()=>{const hit=(window as any).__glCanvas?.('[data-efw-meadow]');return hit?.rec?.scene&&hit.rec.draws>0&&document.querySelector('[data-efw-meadow] canvas')?.hasAttribute('data-representative-index')?'ready':document.querySelector('[data-efw-meadow]')?.textContent?.includes('3D is unavailable on this device.')?'unavailable':false;},undefined,{timeout:60_000});expect(await ready.jsonValue()).toBe('ready');
  await meadow.getByLabel('Meadow scene data',{exact:true}).selectOption('baseline');
  const fixture=await page.evaluate(()=>{
    const w=window as any,api=w.StemLab.ecosystemFoodWeb,config=w.__toolData.ecosystem.foodWeb.run.config;w.__whiskerFrames=api.behaviorTimeline(config,api.compare(config).baseline);let best:any=null;
    for(let index=0;index<16;index++){
      let positive:any=null,negative:any=null;
      w.__whiskerFrames.forEach((frame:any,step:number)=>{const pose=frame.rabbits[index];if(!pose.active||pose.state!=='Grazing'||pose.rest>.1||pose.pounce>0||pose.stride>.1||pose.headRaise>.05||pose.neighborLook>.05||pose.altitude>.0250001)return;const art=api.mammalArticulation('rabbits',pose,false);if(art.flightLift>0||art.supportFeet!==4)return;const sample={id:'rabbits',index,step,yaw:pose.yaw,jawSide:art.jawSide};if(art.jawSide>(positive?.jawSide||.019))positive=sample;if(art.jawSide<(negative?.jawSide||-.019))negative=sample;});
      if(positive&&negative){const score=Math.min(positive.jawSide,-negative.jawSide);if(!best||score>best.score)best={positive,negative,score};}
    }
    return {config,samples:[{name:'fox-profile',id:'foxes',index:0,step:0,yaw:w.__whiskerFrames[0].foxes[0].yaw},best&&{name:'rabbit-right-chew',...best.positive},best&&{name:'rabbit-left-chew',...best.negative}]};
  });
  expect(fixture.samples.every(Boolean),'one real rabbit has both opposing grounded grazing jaw phases').toBe(true);
  const baseline=baselineMode?null:JSON.parse(await readFile(dir+'/whisker-fan-baseline.json','utf8'));if(baseline)exact(fixture,baseline.fixture);
  const records:any[]=[];
  for(const sample of fixture.samples){
    await choose(page,sample);const views:any[]=[];
    for(const view of ['front','oblique']){
      await angle(page,view,sample.yaw);const drawn=await actual(page,sample);valid(drawn);
      if(baseline){const before=baseline.records.find((row:any)=>row.name===sample.name).views.find((row:any)=>row.view===view).drawn;compare(drawn,before);if(sample.id==='rabbits'){if(sample.jawSide>0)expect(drawn.bias).toBeGreaterThan(.002);else expect(drawn.bias).toBeLessThan(-.002);}}
      await meadow.locator('.efw-meadow-stage').screenshot({path:dir+'/'+(baselineMode?'before':'after')+'-whisker-'+sample.name+'-'+view+'.jpg',type:'jpeg',quality:94});views.push({view,drawn});
    }
    await choose(page,{...sample,step:Math.min(240,sample.step+7)});await choose(page,sample);await angle(page,'front',sample.yaw);const rewind=await actual(page,sample);exact(rewind.physical,views[0].drawn.physical,'rewind.physical');expect(rewind.positions).toEqual(views[0].drawn.positions);
    records.push({name:sample.name,views});
  }
  // Population values still follow the cursor in reduced motion. Representative
  // zero remains present as abundance changes, so seeking cannot clamp identity.
  const sample={...fixture.samples[1],index:0};await choose(page,sample);await page.emulateMedia({reducedMotion:'reduce'});await expect(canvas).toHaveAttribute('data-behavior','Starting pose');
  const startingYaw=await page.evaluate(index=>(window as any).__whiskerFrames[0].rabbits[index].yaw,sample.index);await angle(page,'front',startingYaw);const frozen=await actual(page,sample);valid(frozen);if(!baselineMode)expect(frozen.chewing).toEqual({left:0,right:0});
  await meadow.getByLabel('Meadow timeline',{exact:true}).fill('180');await expect(canvas).toHaveAttribute('data-step','180');await expect(canvas).toHaveAttribute('data-representative-index','0');await expect(canvas).toHaveAttribute('data-behavior','Starting pose');const sought=await actual(page,sample);exact(sought.physical,frozen.physical,'reduced-seek.physical');expect(sought.positions).toEqual(frozen.positions);
  await page.setViewportSize({width:390,height:844});await expect(canvas).toHaveAttribute('data-specimen-framing','face');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const mobile=await actual(page,sample);exact(mobile.physical,frozen.physical,'mobile.physical');expect(mobile.positions).toEqual(frozen.positions);if(baseline){exact(frozen.physical,baseline.frozen.physical,'baseline.reduced-physical');expect(frozen.geometrySha256).toBe(baseline.frozen.geometrySha256);expect(frozen.positionsSha256).not.toBe(baseline.frozen.positionsSha256);}
  await meadow.locator('.efw-meadow-stage').screenshot({path:dir+'/'+(baselineMode?'before':'after')+'-whisker-reduced-mobile.jpg',type:'jpeg',quality:94});
  await writeFile(dir+'/'+(baselineMode?'whisker-fan-baseline.json':'whisker-fan-rendered.json'),JSON.stringify({sourceSha256,fixture,records,frozen,geometryRigPawsAndDrawCountsUnchanged:!baselineMode},null,2)+'\n');
});
