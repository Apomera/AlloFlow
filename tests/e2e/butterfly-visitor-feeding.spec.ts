import {test,expect,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:960,height:720});
test.describe.configure({timeout:180000});
test.use({viewport:{width:960,height:720},reducedMotion:'no-preference'});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

async function snapshot(page:Page){
 return page.evaluate(()=>{
  const w=window as any,scene=w.__visitorScene,stage=document.querySelector('.bf-stage') as HTMLElement;
  return {
   clock:stage.dataset.bfMeadowClock,position:stage.dataset.position,flightClock:stage.dataset.clock,
   learnerData:JSON.stringify(w.__toolData),
   visitors:[0,1,2,3].map(index=>{
    const root=scene.getObjectByName('visitor-monarch-'+index),tube=root.getObjectByName('visitor-proboscis');
    return {phase:root.userData.behavior,matrix:root.matrixWorld.toArray(),flower:root.userData.flower,
     tube:tube.morphTargetInfluences[0],wings:['monarch-wing-left','monarch-wing-right'].map(name=>root.getObjectByName(name).matrixWorld.toArray())};
   })
  };
 });
}

test('idle visitors sip on swaying blossoms, take off, and freeze with the whole meadow',async({page})=>{
 const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error'&&/shader|webglprogram|validate_status|three\./i.test(message.text()))errors.push(message.text());});
 await page.goto(harness.url+'/__harness');
 await page.evaluate(()=>{
  const w=window as any,original=w.THREE.Scene.prototype.onAfterRender;
  w.__visitorPhases={};w.__visitorFeedingSamples=[];
  // Observe actual tool renders, including the first staggered flower visit.
  // The test does not advance the tool's clock or construct its own GL scene.
  w.THREE.Scene.prototype.onAfterRender=function(renderer:any,scene:any,camera:any){
   const visitor=this.getObjectByName('visitor-monarch-3');
   if(visitor){
    w.__visitorScene=this;
    const phase=visitor.userData.behavior,flower=visitor.userData.flower,tube=visitor.getObjectByName('visitor-proboscis');
    w.__visitorPhases[phase]=true;
    if(phase==='feeding'&&tube.morphTargetInfluences[0]>.5&&w.__visitorFeedingSamples.length<100){
     w.__visitorFeedingSamples.push({position:visitor.position.toArray(),flower:{...flower},tube:tube.morphTargetInfluences[0],visible:visitor.visible});
    }
   }
   return original.call(this,renderer,scene,camera);
  };
  w.__mount({butterfly:{}});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 });
 const stage=page.locator('.bf-stage');
 await expect(stage).toHaveAttribute('data-bf-renderer','three');
 await expect(stage).toHaveAttribute('data-bf-paused','true');
 await expect(stage).toHaveAttribute('data-bf-motion-paused','false');
 await expect.poll(()=>page.evaluate(()=>(window as any).__visitorFeedingSamples.length),{timeout:60000}).toBeGreaterThan(1);
 const initial=await snapshot(page);
 expect(initial.visitors).toHaveLength(4);
 // A flower contact moves with the same breeze while the tiny butterfly's
 // feet remain at a fixed height and offset, instead of sliding or hovering.
 await expect.poll(()=>page.evaluate(()=>{
  const samples=(window as any).__visitorFeedingSamples,first=samples[0];
  return !!first&&samples.some((sample:any)=>Math.hypot(sample.flower.x-first.flower.x,sample.flower.z-first.flower.z)>.0001);
 }),{timeout:30000}).toBe(true);
 const feeding=await page.evaluate(()=>(window as any).__visitorFeedingSamples);
 for(const sample of feeding){
  expect(sample.visible).toBe(true);
  expect(sample.position[1]-sample.flower.y).toBeCloseTo(.11,6);
  expect(Math.hypot(sample.position[0]-sample.flower.x,sample.position[2]-sample.flower.z)).toBeCloseTo(.1,6);
  expect(sample.tube).toBeGreaterThan(.5);
 }
 await page.getByRole('button',{name:'Pause all motion',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
 const paused=await snapshot(page);
 await page.waitForTimeout(350);
 expect(await snapshot(page)).toEqual(paused);
 mkdirSync('scratch/butterfly-visitors',{recursive:true});
 await stage.screenshot({path:'scratch/butterfly-visitors/paused-meadow.png'});
 await page.getByRole('button',{name:'Resume motion',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-motion-paused','false');
 await expect.poll(()=>stage.getAttribute('data-bf-meadow-clock')).not.toBe(paused.clock);
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__visitorPhases.departing),{timeout:60000}).toBe(true);
 const departed=await snapshot(page);
 expect(departed.position).toBe(initial.position);
 expect(departed.flightClock).toBe(initial.flightClock);
 expect(departed.learnerData).toBe(initial.learnerData);
 await expect(stage).toHaveAttribute('data-bf-paused','true');
 expect((await harness.glScene(page))?.draws).toBeGreaterThan(0);
 expect(errors).toEqual([]);
});
