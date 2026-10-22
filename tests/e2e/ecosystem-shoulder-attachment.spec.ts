import {test,expect,type Page} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GlHarness} from './helpers/stem_gl_harness';

const dir=process.env.ECOLOGY_REPORT_DIR||'reports/ecosystem-observation-next';
const baselineMode=process.env.ECOLOGY_CAPTURE_BASELINE==='1';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true,
  probes:`THREE.WebGLRenderer=new Proxy(THREE.WebGLRenderer,{construct:function(target,args,newTarget){var renderer=Reflect.construct(target,args,newTarget),render=renderer.render;window.__shoulderRenderer=renderer;renderer.render=function(scene,camera){window.__shoulderCamera=camera;return render.apply(this,arguments);};return renderer;}});`});
test.describe.configure({timeout:420_000,retries:0});
test.use({trace:'off',video:'off'});
test.beforeAll(async()=>{await mkdir(dir,{recursive:true});await harness.start();});
test.afterAll(async()=>harness.stop());
test.afterEach(async({page})=>{const errors=await page.evaluate(()=>(window as any).__events?.errors||[]);await harness.destroy(page);expect(errors).toEqual([]);});

function sameNumbers(actual:any,expected:any){
  if(Array.isArray(expected)){expect(actual.length).toBe(expected.length);expected.forEach((value:any,index:number)=>sameNumbers(actual[index],value));}
  else if(expected&&typeof expected==='object'){expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());for(const key of Object.keys(expected))sameNumbers(actual[key],expected[key]);}
  else if(typeof expected==='number')expect(Math.abs(actual-expected)).toBeLessThan(1e-12);
  else expect(actual).toEqual(expected);
}
async function choose(page:Page,id:string,step:number,index:number){
  const meadow=page.locator('[data-efw-meadow]');
  await meadow.getByRole('button',{name:id==='foxes'?/Red foxes\s[\d.]/:/Rabbits\s[\d.]/}).click();
  if(!(await meadow.getByLabel('Representative animal',{exact:true}).count()))await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();
  await meadow.getByLabel('Meadow timeline',{exact:true}).fill(String(step));
  await meadow.getByLabel('Representative animal',{exact:true}).selectOption(String(index));
  const canvas=meadow.locator('canvas');await expect(canvas).toHaveAttribute('data-step',String(step));await expect(canvas).toHaveAttribute('data-selected-species',id);await expect(canvas).toHaveAttribute('data-representative-index',String(index));
  if(await meadow.getByRole('button',{name:'Isolate specimen',exact:true}).getAttribute('aria-pressed')!=='true')await meadow.getByRole('button',{name:'Isolate specimen',exact:true}).click();
  await meadow.getByRole('button',{name:'Whole animal',exact:true}).click();
  await meadow.getByRole('button',{name:'Side view',exact:true}).click();
  await meadow.getByLabel('Meadow camera distance',{exact:true}).fill('11');
}
async function anatomy(page:Page,id:string,index:number,step:number){return page.evaluate(({id,index,step})=>{
  const w=window as any,api=w.StemLab.ecosystemFoodWeb,scene=w.__glCanvas('[data-efw-meadow]').rec.scene;
  const animal=scene.children.filter((g:any)=>g.userData.headSurface?.name==='eco-'+id+'-head-surface')[index],d=animal.userData,surface=d.limbSkin;
  const limbs=id==='foxes'?d.legs:d.paws,geometry=surface.geometry,positions=Array.from(geometry.getAttribute('position').array),normals=Array.from(geometry.getAttribute('normal').array);
  const joints=limbs.map((limb:any)=>id==='foxes'?limb.userData.skinJoints:limb.userData.joints);
  const rawTorsoMatrix=new w.THREE.Matrix4().multiplyMatrices(d.torso.parent.matrix,d.torso.matrix);
  // Torso source positions are absolute resting anatomy; the render mesh is rebased.
  const origin=id==='foxes'?[-.10,.49,0]:[-.12,.335,0];rawTorsoMatrix.multiply(new w.THREE.Matrix4().makeTranslation(-origin[0],-origin[1],-origin[2]));
  const physical={root:animal.matrixWorld.toArray(),body:d.body.matrix.toArray(),head:d.head.matrix.toArray(),nose:d.nose.matrix.toArray(),eyes:d.eyeGroups.map((e:any)=>e.matrix.toArray()),ears:d.ears.map((e:any)=>({matrix:e.matrix.toArray(),pinna:e.children[0].matrix.toArray()})),jaw:d.jaw.matrix.toArray(),joints,
    soles:limbs.map((limb:any)=>{const paw=id==='foxes'?limb.userData.rig.paw:limb.userData.paw,sole=paw.isMesh?paw:paw.children.find((node:any)=>node.isMesh);return {paw:paw.matrixWorld.toArray(),sole:sole.matrixWorld.toArray(),footing:limb.userData.footing};}),pose:w.__shoulderFrames[step][id][index]};
  const layout=geometry.userData.limbLayout;let fittedError:number|null=null;
  if(api.mammalLimbAttachment){const expected:number[]=[];for(const [slot,limb] of layout.entries()){api.mammalLimbFit(id,limb.hind,joints[slot],expected,limb.start*3);api.mammalLimbAttachment(id,limb.hind,joints[slot],rawTorsoMatrix.elements,expected,limb.start*3,limb.side);}fittedError=Math.max(...positions.map((value:any,k:number)=>Math.abs(value-expected[k])));}
  const localTorso=new w.THREE.Matrix4().multiplyMatrices(d.torso.parent.matrix,d.torso.matrix).invert(),torsoPositions=d.torso.geometry.getAttribute('position'),torsoIndices=d.torso.geometry.index.array;
  function margin(p:number[]){const q=new w.THREE.Vector3(...p).applyMatrix4(localTorso);let lo=Infinity,hi=-Infinity;for(let triangle=0;triangle<torsoIndices.length;triangle+=3){const a=torsoIndices[triangle],b=torsoIndices[triangle+1],c=torsoIndices[triangle+2],ax=torsoPositions.getX(a),ay=torsoPositions.getY(a),bx=torsoPositions.getX(b),by=torsoPositions.getY(b),cx=torsoPositions.getX(c),cy=torsoPositions.getY(c),den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(den)<1e-14)continue;const u=((by-cy)*(q.x-cx)+(cx-bx)*(q.y-cy))/den,v=((cy-ay)*(q.x-cx)+(ax-cx)*(q.y-cy))/den,z=1-u-v;if(u>=-1e-8&&v>=-1e-8&&z>=-1e-8){const depth=u*torsoPositions.getZ(a)+v*torsoPositions.getZ(b)+z*torsoPositions.getZ(c);lo=Math.min(lo,depth);hi=Math.max(hi,depth);}}return Math.min(q.z-lo,hi-q.z);}
  const capMargins=layout.map((limb:any)=>{const cap=positions.slice((limb.start+221)*3,(limb.start+222)*3) as number[];let gap=margin(cap);for(let side=0;side<12;side++)for(let a=0;a<=3;a++)for(let b=0;b<=3-a;b++){const weights=[a/3,b/3,1-a/3-b/3],first=positions.slice((limb.start+side)*3,(limb.start+side+1)*3) as number[],next=positions.slice((limb.start+side+1)*3,(limb.start+side+2)*3) as number[];gap=Math.min(gap,margin([0,1,2].map(axis=>weights[0]*cap[axis]+weights[1]*first[axis]+weights[2]*next[axis])));}return gap;});
  const cachedMatrix=surface.userData.shoulderMatrix,matrixError=cachedMatrix?Math.max(...rawTorsoMatrix.elements.map((value:number,k:number)=>Math.abs(value-cachedMatrix[k]))):null;
  return {physical,positions,normals,indices:Array.from(geometry.index.array),layout,rawTorsoMatrix:rawTorsoMatrix.toArray(),capMargins,matrixError,fittedError,fitCount:surface.userData.fitCount||0,camera:w.__shoulderCamera.matrixWorld.toArray(),renderer:{geometries:w.__shoulderRenderer.info.memory.geometries,textures:w.__shoulderRenderer.info.memory.textures,calls:w.__shoulderRenderer.info.render.calls}};
},{id,index,step});}

test('proximal limb skins meet the breathing torso while original joints soles and face mounts remain exact',async({page})=>{
  const substitution=(process.env.STEM_GL_SUBSTITUTE||'').split(';').find(value=>value.startsWith('stem_lab/stem_tool_ecosystem.js='));
  const sourceSha256=createHash('sha256').update(await readFile(substitution?substitution.slice(substitution.indexOf('=')+1):'stem_lab/stem_tool_ecosystem.js')).digest('hex');
  await page.setViewportSize({width:1140,height:1050});await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';});
  await page.getByRole('button',{name:'Rabbit neighbors',exact:true}).click();await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  const meadow=page.locator('[data-efw-meadow]');if(!(await meadow.isVisible()))await page.getByRole('button',{name:'Show 3D meadow',exact:true}).click();
  const ready=await page.waitForFunction(()=>{const r=(window as any).__glCanvas?.('[data-efw-meadow]');return r?.rec?.scene&&r.rec.draws>0&&document.querySelector('[data-efw-meadow] canvas')?.hasAttribute('data-representative-index')?'ready':document.querySelector('[data-efw-meadow]')?.textContent?.includes('3D is unavailable on this device.')?'unavailable':false;},undefined,{timeout:60_000});expect(await ready.jsonValue()).toBe('ready');
  await meadow.getByLabel('Meadow scene data',{exact:true}).selectOption('baseline');
  const fixture=await page.evaluate(()=>{const w=window as any,api=w.StemLab.ecosystemFoodWeb,config=w.__toolData.ecosystem.foodWeb.run.config;w.__shoulderFrames=api.behaviorTimeline(config,api.compare(config).baseline);const fox=api.motionStudy(w.__shoulderFrames,'foxes',0),rabbit=api.motionStudy(w.__shoulderFrames,'rabbits',0);return {config,samples:[{name:'fox-stride',id:'foxes',step:fox.samples[1].step,index:0},{name:'rabbit-stride',id:'rabbits',step:rabbit.samples[1].step,index:0},{name:'rabbit-grazing',id:'rabbits',step:227,index:1}]};});
  const baseline=baselineMode?null:JSON.parse(await readFile(dir+'/shoulder-baseline.json','utf8'));if(baseline)expect(fixture).toEqual(baseline.fixture);
  const samples:any[]=[];
  for(const sample of fixture.samples){
    await choose(page,sample.id,sample.step,sample.index);const views:any[]=[];
    for(const angle of ['profile','oblique']){
      if(angle==='oblique')await meadow.getByRole('button',{name:'Rotate right',exact:true}).click();
      const actual=await anatomy(page,sample.id,sample.index,sample.step),before=baseline?.samples.find((saved:any)=>saved.name===sample.name)?.views.find((saved:any)=>saved.angle===angle);
      if(before){sameNumbers(actual.physical,before.physical);sameNumbers(actual.camera,before.camera);expect(actual.indices).toEqual(before.indices);expect(actual.layout).toEqual(before.layout);expect(actual.renderer.geometries).toBe(before.renderer.geometries);expect(actual.renderer.textures).toBe(before.renderer.textures);expect(actual.renderer.calls).toBeLessThanOrEqual(before.renderer.calls);expect(actual.fittedError).not.toBeNull();expect(actual.fittedError!).toBeLessThan(1e-7);
        for(const limb of actual.layout)for(let row=5;row<=16;row++)for(let k=0;k<39;k++)expect(actual.positions[(limb.start+row*13)*3+k]).toBe(before.positions[(limb.start+row*13)*3+k]);
        const changed=actual.positions.reduce((max:number,value:any,k:number)=>Math.max(max,Math.abs(value-before.positions[k])),0);expect(changed).toBeGreaterThan(.015);expect(actual.matrixError).not.toBeNull();expect(actual.matrixError!).toBeLessThan(1e-12);for(const margin of actual.capMargins)expect(margin).toBeGreaterThan(.005);expect(actual.normals.some((value:any,k:number)=>Math.abs(value-before.normals[k])>1e-5)).toBe(true);
      }
      for(let vertex=0;vertex<actual.normals.length;vertex+=3)expect(Math.abs(Math.hypot(...actual.normals.slice(vertex,vertex+3) as number[])-1)).toBeLessThan(1e-5);
      await meadow.locator('.efw-meadow-stage').screenshot({path:dir+'/'+(baselineMode?'before':'after')+'-shoulder-'+sample.name+'-'+angle+'.jpg',type:'jpeg',quality:90});views.push({angle,...actual});
    }
    samples.push({...sample,views});
  }
  await writeFile(dir+'/'+(baselineMode?'shoulder-baseline.json':'shoulder-rendered.json'),JSON.stringify({sourceSha256,fixture,samples,originalRigAndMountsUnchanged:!baselineMode},null,2)+'\n');
});
