import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true});
test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
test('inspection angles align with the visible animal, retain framing and respect tracking, playback and reduced motion',async({page})=>{
  await page.setViewportSize({width:1140,height:1050});await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  await page.evaluate(()=>{
    document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';
    const w=window as any,p=w.THREE.PerspectiveCamera.prototype,update=p.updateMatrixWorld;w.__inspectionCamera=null;
    p.updateMatrixWorld=function(force:any){const result=update.call(this,force);w.__inspectionCamera=this.position.toArray();return result;};
  });
  await page.getByRole('button',{name:'Insect food shortage',exact:true}).click();await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas'),timeline=meadow.getByLabel('Meadow timeline',{exact:true}),stage=meadow.locator('.efw-meadow-stage'),tracking=meadow.getByLabel('Animal camera tracking',{exact:true}),angles=meadow.getByRole('group',{name:'Animal viewing angles',exact:true});
  await meadow.getByRole('button',{name:/Red foxes\s/}).click();await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();await meadow.getByRole('button',{name:'Isolate specimen',exact:true}).click();
  const data=await page.evaluate(()=>{
    const w=window as any,a=w.StemLab.ecosystemFoodWeb,c=w.__toolData.ecosystem.foodWeb.run.config,f=a.behaviorTimeline(c,a.compare(c).experiment);w.__angleFrames=f;
    const step=f.findIndex((frame:any)=>frame.foxes[0].active&&!frame.foxes[0].pounce&&frame.foxes[0].moving>.1&&Math.abs(frame.foxes[0].yaw-f[0].foxes[0].yaw)>.8);
    const short=a.behaviorMoments(f,'foxes',0).filter((m:any)=>m.active).sort((x:any,y:any)=>(x.end-x.start)-(y.end-y.start))[0];return {short,step,yaw:f[step].foxes[0].yaw,startYaw:f[0].foxes[0].yaw,run:JSON.stringify(w.__toolData.ecosystem.foodWeb.run)};
  });
  expect(data.step).toBeGreaterThan(0);await timeline.fill(String(data.step));
  async function camera(){const target=JSON.parse((await canvas.getAttribute('data-camera-target'))!),position=await page.evaluate(()=>(window as any).__inspectionCamera);expect(position).not.toBeNull();const d=position.map((v:number,i:number)=>v-target[i]),flat=Math.hypot(d[0],d[2]);return {d,flat,distance:Math.hypot(...d),tilt:d[1]/flat};}
  await angles.getByRole('button',{name:'Side view',exact:true}).focus();await page.keyboard.press('Enter');await expect(canvas).toHaveAttribute('data-camera-elevation','0.18');
  const side=await camera();expect(side.tilt).toBeCloseTo(.18,8);expect((side.d[0]*Math.cos(data.yaw)-side.d[2]*Math.sin(data.yaw))/side.flat).toBeCloseTo(0,8);
  await stage.screenshot({path:'reports/ecosystem-observation-angles/fox-side.jpg',type:'jpeg',quality:90});
  const steadyBearing=await canvas.getAttribute('data-camera-bearing');await timeline.fill('0');await expect(canvas).toHaveAttribute('data-camera-bearing',steadyBearing!);await timeline.fill(String(data.step));expect(await camera()).toEqual(side);
  await angles.getByRole('button',{name:'Face view',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-elevation','0.32');const face=await camera();expect(face.tilt).toBeCloseTo(.32,8);expect(face.distance).toBeCloseTo(side.distance,8);expect((face.d[0]*Math.cos(data.yaw)-face.d[2]*Math.sin(data.yaw))/face.flat).toBeCloseTo(1,8);
  await stage.screenshot({path:'reports/ecosystem-observation-angles/fox-face.jpg',type:'jpeg',quality:90});
  await angles.getByRole('button',{name:'View from above',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-elevation','1.5');const above=await camera();expect(above.tilt).toBeCloseTo(1.5,8);expect(above.distance).toBeCloseTo(side.distance,8);
  await stage.screenshot({path:'reports/ecosystem-observation-angles/fox-above.jpg',type:'jpeg',quality:90});
  await tracking.selectOption('heading');await angles.getByRole('button',{name:'Side view',exact:true}).click();await timeline.fill('0');const heading=await camera();expect((heading.d[0]*Math.cos(data.startYaw)-heading.d[2]*Math.sin(data.startYaw))/heading.flat).toBeCloseTo(0,8);await tracking.selectOption('steady');
  await timeline.fill(String(data.short.start));await meadow.getByRole('button',{name:'Replay this behavior',exact:true}).click();const replay=meadow.locator('[data-efw-replay-status]');await expect(replay).toHaveText('Replay finished at time '+(data.short.end/10).toFixed(1)+'.',{timeout:60000});
  await angles.getByRole('button',{name:'Face view',exact:true}).click();await expect(replay).toHaveText('Replay finished at time '+(data.short.end/10).toFixed(1)+'.');await expect(timeline).toHaveValue(String(data.short.end));
  await meadow.getByRole('button',{name:'Play meadow timeline',exact:true}).click();await angles.getByRole('button',{name:'Side view',exact:true}).click();await expect(meadow.getByRole('button',{name:'Play meadow timeline',exact:true})).toBeVisible();const stopped=await timeline.inputValue();await page.waitForTimeout(350);await expect(timeline).toHaveValue(stopped);
  await timeline.fill('0');const reason=meadow.locator('[data-efw-action-reason]');await reason.locator('summary').click();const interaction=reason.getByRole('button',{name:'Show behavior interaction',exact:true});await interaction.click();await expect(angles.getByRole('button',{name:'Side view',exact:true})).toBeDisabled();await expect(canvas).toHaveAttribute('data-camera-elevation','0.42');await interaction.click();await expect(canvas).toHaveAttribute('data-camera-elevation','0.18');
  await meadow.getByRole('button',{name:/Rabbits\s/}).click();await angles.getByRole('button',{name:'Face view',exact:true}).click();await page.setViewportSize({width:390,height:844});await stage.screenshot({path:'reports/ecosystem-observation-angles/mobile-rabbit.jpg',type:'jpeg',quality:90});await angles.screenshot({path:'reports/ecosystem-observation-angles/mobile-controls.jpg',type:'jpeg',quality:90});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(canvas).toHaveAttribute('data-behavior','Starting pose');await timeline.fill('180');await angles.getByRole('button',{name:'Side view',exact:true}).click();const frozen=await camera();await timeline.fill('0');expect(await camera()).toEqual(frozen);
  await meadow.getByRole('button',{name:'Reset camera',exact:true}).click();await expect(angles).toHaveCount(0);await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-elevation','0.42');await expect(tracking).toHaveValue('steady');
  expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(data.run);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
