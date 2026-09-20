import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true});
test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
test('ground detours appear in the scene, explanation and trail and replay exactly',async({page})=>{
  page.setDefaultTimeout(120000);await page.setViewportSize({width:1140,height:1050});await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  await page.evaluate(()=>{
    document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';
    const w=window as any,p=w.THREE.Object3D.prototype,original=p.updateMatrixWorld;
    p.updateMatrixWorld=function(force:any){const result=original.call(this,force);if(this.isScene)w.__groundScene=this.children.filter((a:any)=>a.userData.ecoRepresentative&&a.userData.body).map((a:any)=>({species:a.userData.body.children.find((c:any)=>c.userData.species)?.userData.species,visible:a.visible,x:a.position.x,z:a.position.z}));return result;};
  });
  await page.getByRole('button',{name:'Habitat restoration',exact:true}).click();await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas'),stage=meadow.locator('.efw-meadow-stage'),timeline=meadow.getByLabel('Meadow timeline',{exact:true});
  const target=await page.evaluate(()=>{
    const w=window as any,a=w.StemLab.ecosystemFoodWeb,c=w.__toolData.ecosystem.foodWeb.run.config,pair=a.compare(c),frames=a.behaviorTimeline(c,pair.experiment);w.__navigationFrames={experiment:frames,baseline:a.behaviorTimeline(c,pair.baseline)};
    for(const id of ['foxes','rabbits'])for(let i=0;i<7;i++)for(let step=30;step<frames.length-4;step++){
      const p=frames[step][id][i],obstacle=p.navigation&&a.groundObstacles().find((o:any)=>o.id===p.navigation.id),old=frames[step-25][id][i],prior=frames[step-1][id][i];if(p.active&&p.moving>.01&&p.navigation&&!p.navigation.blocked&&Math.hypot(p.x-old.x,p.z-old.z)>.15&&Math.hypot(prior.x-obstacle.x,prior.z-obstacle.z)>obstacle.radius+a.groundRadius(id,i)&&[1,2].every(offset=>frames[step+offset][id][i].active&&frames[step+offset][id][i].navigation?.id===p.navigation.id))return {id,index:i,step,name:p.navigation.name,obstacle:p.navigation.id,run:JSON.stringify(w.__toolData.ecosystem.foodWeb.run)};
    }return null;
  });
  expect(target).toBeTruthy();const t=target!;await meadow.getByRole('button',{name:t.id==='foxes'?/Red foxes\s/:/Rabbits\s/}).click();await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();
  await timeline.fill(String(t.step));await meadow.getByLabel('Representative animal',{exact:true}).selectOption(String(t.index));await meadow.getByRole('button',{name:'View from above',exact:true}).click();await meadow.getByRole('button',{name:'Recent movement trail',exact:true}).click();
  let remembered:any;
  for(const step of [t.step,t.step+1,t.step+2]){
    await timeline.fill(String(step));await expect(canvas).toHaveAttribute('data-ground-navigation',t.obstacle);await expect(meadow.locator('[data-efw-navigation]')).toContainText(t.name);
    const record=await page.evaluate(({id,index,step})=>{const w=window as any;return {expected:w.__navigationFrames.experiment[step][id][index],actual:w.__groundScene.filter((p:any)=>p.species===id)[index]};},{id:t.id,index:t.index,step});
    expect(record.actual.visible).toBe(true);expect(record.actual.x).toBe(record.expected.x);expect(record.actual.z).toBe(record.expected.z);if(step===t.step+2)remembered=record.actual;
  }
  await stage.screenshot({path:'reports/ecosystem-ground-navigation/detour.jpg',type:'jpeg',quality:90});await expect(canvas).toHaveAttribute('data-movement-trail','true');
  await timeline.fill('0');await expect(meadow.locator('[data-efw-navigation]')).toHaveCount(0);await timeline.fill(String(t.step+2));expect(await page.evaluate(({id,index})=>(window as any).__groundScene.filter((p:any)=>p.species===id)[index],{id:t.id,index:t.index})).toEqual(remembered);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(canvas).toHaveAttribute('data-ground-navigation','');await expect(meadow.locator('[data-efw-navigation]')).toHaveCount(0);await page.emulateMedia({reducedMotion:'no-preference'});await expect(canvas).toHaveAttribute('data-ground-navigation',t.obstacle);
  await meadow.getByLabel('Meadow scene data',{exact:true}).selectOption('baseline');const expected=await page.evaluate(({id,index,step})=>(window as any).__navigationFrames.baseline[step][id][index],{id:t.id,index:t.index,step:t.step+2});await expect(canvas).toHaveAttribute('data-representative-position',expected.x.toFixed(4)+','+expected.z.toFixed(4));
  await page.setViewportSize({width:390,height:844});await stage.screenshot({path:'reports/ecosystem-ground-navigation/mobile.jpg',type:'jpeg',quality:90});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(t.run);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
