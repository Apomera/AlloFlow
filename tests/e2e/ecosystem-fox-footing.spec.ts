import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true});
test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
test('fox soles follow uneven ground with swing clearance, retain airborne poses and rewind exactly',async({page})=>{
  await page.setViewportSize({width:1140,height:1050});await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  await page.evaluate(()=>{
    document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';
    const w=window as any,T=w.THREE,p=T.Object3D.prototype,update=p.updateMatrixWorld;w.__foxSoles=null;
    p.updateMatrixWorld=function(force:any){const result=update.call(this,force);if(this.isScene)w.__foxSoles=this.children.filter((a:any)=>a.visible===true&&a.userData.legs).map((a:any)=>a.userData.legs.map((leg:any)=>{
      const paw=leg.userData.rig.paw,point=new T.Vector3().setFromMatrixPosition(paw.matrixWorld),e=paw.matrixWorld.elements,radius=Math.hypot(.078*e[1],.042*e[5],.052*e[9]);
      return {position:point.toArray(),gap:point.y-radius-w.StemLab.ecosystemFoodWeb.groundHeight(point.x,point.z),weight:leg.userData.footing.weight};
    }));return result;};
  });
  await page.getByRole('button',{name:'Insect food shortage',exact:true}).click();await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas'),timeline=meadow.getByLabel('Meadow timeline',{exact:true}),stage=meadow.locator('.efw-meadow-stage');
  await meadow.getByRole('button',{name:/Red foxes\s/}).click();await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();await meadow.getByRole('button',{name:'Isolate specimen',exact:true}).click();
  const data=await page.evaluate(()=>{
    const w=window as any,a=w.StemLab.ecosystemFoodWeb,c=w.__toolData.ecosystem.foodWeb.run.config,f=a.behaviorTimeline(c,a.compare(c).experiment);let slope=0,swing=0,leap:any=null,largest=0,highest=0;
    for(let step=0;step<f.length;step++){const p=f[step].foxes[0];if(p.active&&!p.pounce){const offset=Math.max(...[-1,1].flatMap(side=>[true,false].map(hind=>Math.abs(a.foxFooting(p,0,hind,side).y))));if(offset>largest){largest=offset;slope=step;}const lift=a.footPose('foxes',p,true,-1).lift;if(lift>highest){highest=lift;swing=step;}}
      for(let index=0;index<16&&!leap;index++)if(f[step].foxes[index].active&&f[step].foxes[index].pounce>.9)leap={step,index};
    }
    const gaps=(step:number)=>[-1,1].flatMap(side=>[true,false].map(hind=>a.footPose('foxes',f[step].foxes[0],hind,side).lift*.94+.002));
    return {slope,swing,leap,gaps:{slope:gaps(slope),swing:gaps(swing)},largest,run:JSON.stringify(w.__toolData.ecosystem.foodWeb.run)};
  });
  expect(data.largest).toBeGreaterThan(.015);expect(data.leap).toBeTruthy();let remembered:any=null;
  for(const [name,step] of [['slope',data.slope],['swing',data.swing]] as const){
    await timeline.fill(String(step));await meadow.getByRole('button',{name:'Side view',exact:true}).click();await expect(canvas).toHaveAttribute('data-step',String(step));const actual=await page.evaluate(()=>(window as any).__foxSoles);expect(actual).toHaveLength(1);expect(actual[0]).toHaveLength(4);
    actual[0].forEach((paw:any,i:number)=>{expect(paw.gap).toBeCloseTo(data.gaps[name][i],7);expect(paw.weight).toBe(1);});if(name==='slope')remembered=actual;
    await stage.screenshot({path:`reports/ecosystem-fox-footing/${name}.jpg`,type:'jpeg',quality:90});
  }
  await timeline.fill(String(data.leap.step));await meadow.getByLabel('Representative animal',{exact:true}).selectOption(String(data.leap.index));await meadow.getByRole('button',{name:'Side view',exact:true}).click();const airborne=await page.evaluate(()=>(window as any).__foxSoles);expect(airborne[0].every((p:any)=>p.gap>.15&&p.weight<.01)).toBe(true);await stage.screenshot({path:'reports/ecosystem-fox-footing/leap.jpg',type:'jpeg',quality:90});
  await timeline.fill(String(data.slope));await meadow.getByLabel('Representative animal',{exact:true}).selectOption('0');expect(await page.evaluate(()=>(window as any).__foxSoles)).toEqual(remembered);
  await page.setViewportSize({width:390,height:844});await meadow.getByRole('button',{name:'Side view',exact:true}).click();await stage.screenshot({path:'reports/ecosystem-fox-footing/mobile.jpg',type:'jpeg',quality:90});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(canvas).toHaveAttribute('data-behavior','Starting pose');const frozen=await page.evaluate(()=>(window as any).__foxSoles);await timeline.fill('180');expect(await page.evaluate(()=>(window as any).__foxSoles)).toEqual(frozen);expect(frozen[0].every((p:any)=>Math.abs(p.gap-.002)<1e-7)).toBe(true);
  expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(data.run);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
