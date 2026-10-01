import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true});
test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
test('fox joints bend without detaching and reach the intended paw positions through walking, leaps and rewind',async({page})=>{
  await page.setViewportSize({width:1140,height:1050});await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  await page.evaluate(()=>{
    document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';
    const w=window as any,T=w.THREE,p=T.Object3D.prototype,update=p.updateMatrixWorld;w.__foxRig=null;
    p.updateMatrixWorld=function(force:any){const result=update.call(this,force);if(this.isScene)w.__foxRig=this.children.filter((a:any)=>a.visible===true&&a.userData.legs).map((a:any)=>a.userData.legs.map((leg:any)=>{
      const r=leg.userData.rig,inverse=leg.matrixWorld.clone().invert(),point=(o:any)=>new T.Vector3().setFromMatrixPosition(o.matrixWorld).applyMatrix4(inverse),hip=point(r.upper),knee=point(r.lower),paw=point(r.paw);
      return {paw:paw.toArray(),target:[.056+leg.userData.footing.x,-.38+leg.userData.footing.y,0],upper:hip.distanceTo(knee),lower:knee.distanceTo(paw),flex:r.lower.rotation.z,attached:r.upper.parent===leg&&r.lower.parent===r.upper&&r.paw.parent===r.lower};
    }));return result;};
  });
  await page.getByRole('button',{name:'Insect food shortage',exact:true}).click();await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas'),timeline=meadow.getByLabel('Meadow timeline',{exact:true}),stage=meadow.locator('.efw-meadow-stage');
  await meadow.getByRole('button',{name:/Red foxes\s/}).click();await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();await meadow.getByRole('button',{name:'Isolate specimen',exact:true}).click();
  const data=await page.evaluate(()=>{const w=window as any,a=w.StemLab.ecosystemFoodWeb,c=w.__toolData.ecosystem.foodWeb.run.config,f=a.behaviorTimeline(c,a.compare(c).experiment);let leap:any=null;for(let step=0;step<f.length&&!leap;step++)for(let i=0;i<16;i++)if(f[step].foxes[i].active&&f[step].foxes[i].pounce>.9){leap={step,index:i};break;}const swing=f.reduce((best:number,frame:any,i:number)=>a.footPose('foxes',frame.foxes[0],true,-1).lift>a.footPose('foxes',f[best].foxes[0],true,-1).lift?i:best,0);return {leap,swing,run:JSON.stringify(w.__toolData.ecosystem.foodWeb.run)};});
  expect(data.leap).toBeTruthy();expect(data.swing).toBeGreaterThan(0);
  const poses:any[]=[];
  for(const [name,step,index] of [['standing',0,0],['walking',data.swing,0],['leap',data.leap.step,data.leap.index]] as const){
    await timeline.fill(String(step));await meadow.getByLabel('Representative animal',{exact:true}).selectOption(String(index));await meadow.getByRole('button',{name:'Side view',exact:true}).click();await expect(canvas).toHaveAttribute('data-step',String(step));
    const actual=await page.evaluate(()=>(window as any).__foxRig);expect(actual).toHaveLength(1);expect(actual[0]).toHaveLength(4);
    for(const leg of actual[0]){expect(leg.attached).toBe(true);expect(leg.upper).toBeCloseTo(.21,9);expect(leg.lower).toBeCloseTo(.20,9);expect(leg.paw[0]).toBeCloseTo(leg.target[0],9);expect(leg.paw[1]).toBeCloseTo(leg.target[1],9);expect(leg.paw[2]).toBeCloseTo(0,9);}
    poses.push(actual[0]);await stage.screenshot({path:`reports/ecosystem-fox-anatomy/${name}.jpg`,type:'jpeg',quality:90});
  }
  expect(Math.max(...poses[1].map((leg:any,i:number)=>Math.abs(leg.flex-poses[0][i].flex)))).toBeGreaterThan(.3);
  await timeline.fill('0');await meadow.getByLabel('Representative animal',{exact:true}).selectOption('0');expect((await page.evaluate(()=>(window as any).__foxRig))[0].map((p:any)=>p.flex)).toEqual(poses[0].map((p:any)=>p.flex));
  await page.setViewportSize({width:390,height:844});await meadow.getByRole('button',{name:'Face view',exact:true}).click();await stage.screenshot({path:'reports/ecosystem-fox-anatomy/mobile-face.jpg',type:'jpeg',quality:90});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(canvas).toHaveAttribute('data-behavior','Starting pose');await timeline.fill('180');expect((await page.evaluate(()=>(window as any).__foxRig))[0].map((p:any)=>p.flex)).toEqual(poses[0].map((p:any)=>p.flex));
  expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(data.run);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
