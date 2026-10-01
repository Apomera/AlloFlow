import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true});
test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
test('mammal feet use recorded swing clearance, rewind and reduced-motion poses in the live scene',async({page})=>{
  await page.setViewportSize({width:1140,height:1050});await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  await page.evaluate(()=>{
    document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';
    const w=window as any,p=w.THREE.Object3D.prototype,update=p.updateMatrixWorld;w.__footScene=null;
    p.updateMatrixWorld=function(force:any){if(this.isScene)w.__footScene=this.children.filter((a:any)=>a.visible===true&&(a.userData.legs||a.userData.paws)).map((a:any)=>(a.userData.legs||a.userData.paws).map((foot:any)=>({angle:foot.rotation.z,height:foot.position.y-foot.userData.homeY-(a.userData.paws&&foot.userData.footing?foot.userData.footing.y:0),hind:foot.userData.hind,side:foot.userData.side,attached:foot.parent===a.userData.body})));return update.call(this,force);};
  });
  await page.getByRole('button',{name:'Insect food shortage',exact:true}).click();await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas'),timeline=meadow.getByLabel('Meadow timeline',{exact:true}),stage=meadow.locator('.efw-meadow-stage');
  await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();await meadow.getByRole('button',{name:'Isolate specimen',exact:true}).click();
  const data=await page.evaluate(()=>{
    const w=window as any,a=w.StemLab.ecosystemFoodWeb,c=w.__toolData.ecosystem.foodWeb.run.config,f=a.behaviorTimeline(c,a.compare(c).experiment),targets:any={};
    for(const id of ['foxes','rabbits','voles']){
      const step=f.reduce((best:number,frame:any,i:number)=>a.footPose(id,frame[id][0],true,-1).lift>a.footPose(id,f[best][id][0],true,-1).lift?i:best,0),pose=f[step][id][0];
      targets[id]={step,feet:[-1,1].flatMap(side=>[true,false].map(hind=>({...a.footPose(id,pose,hind,side),hind,side})))};
    }
    return {targets,run:JSON.stringify(w.__toolData.ecosystem.foodWeb.run)};
  });
  for(const [id,name] of [['foxes',/Red foxes\s/],['rabbits',/Rabbits\s/],['voles',/voles\s/i]] as const){
    const target=data.targets[id];expect(target.step).toBeGreaterThan(0);expect(Math.max(...target.feet.map((p:any)=>p.lift))).toBeGreaterThan(.01);
    await meadow.getByRole('button',{name}).click();await timeline.fill(String(target.step));await expect(canvas).toHaveAttribute('data-step',String(target.step));
    const actual=await page.evaluate(()=>(window as any).__footScene);expect(actual).toHaveLength(1);expect(actual[0]).toHaveLength(4);
    actual[0].forEach((foot:any,index:number)=>{const expected=target.feet[index];expect(foot.attached).toBe(true);expect(foot.hind).toBe(expected.hind);expect(foot.side).toBe(expected.side);expect(foot.angle).toBeCloseTo(expected.angle,10);expect(foot.height).toBeCloseTo(expected.height,10);});
    await stage.screenshot({path:`reports/ecosystem-foot-motion/${id}.jpg`,type:'jpeg',quality:90});
    await timeline.fill('0');await expect(canvas).toHaveAttribute('data-step','0');expect(await page.evaluate(()=>(window as any).__footScene[0].every((f:any)=>f.angle===0&&Math.abs(f.height)<1e-10))).toBe(true);
    await timeline.fill(String(target.step));await expect(canvas).toHaveAttribute('data-step',String(target.step));expect(await page.evaluate(()=>(window as any).__footScene)).toEqual(actual);
  }
  await page.setViewportSize({width:390,height:844});await stage.screenshot({path:'reports/ecosystem-foot-motion/mobile-vole.jpg',type:'jpeg',quality:90});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(canvas).toHaveAttribute('data-behavior','Starting pose');expect(await page.evaluate(()=>(window as any).__footScene[0].every((f:any)=>f.angle===0&&Math.abs(f.height)<1e-10))).toBe(true);
  await timeline.fill('180');await expect(canvas).toHaveAttribute('data-step','180');expect(await page.evaluate(()=>(window as any).__footScene[0].every((f:any)=>f.angle===0&&Math.abs(f.height)<1e-10))).toBe(true);
  expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(data.run);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
