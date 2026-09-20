import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:1000,appStyles:true});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
for(const {width,ratio} of [{width:320,ratio:2},{width:1200,ratio:1}])test.describe('pointer zoom '+width,()=>{
 test.use({deviceScaleFactor:ratio});
 test('keeps the inspected organelle under the pointer',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width,height:1000});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await harness.mount(page,{cell:{mode:'observe',selectedOrganism:'plantcell',paused:true,zoom:3}},undefined,{expectCanvas:false});
  await page.addStyleTag({content:'body{background:#f8fafc}#wrap{width:100%;max-width:1200px;display:block}'});
  const stage=page.locator('[data-cell-stage]'),canvas=page.locator('[data-cell-sim-canvas]');
  await stage.scrollIntoViewIfNeeded();await stage.locator('[data-cell-observation-center]').click();
  await canvas.evaluate((c:any)=>c._cellSimShowOrganelleTooltip('plantcell','Nucleus'));
  const view=()=>canvas.evaluate((c:any)=>c._cellSimGetObservationView());
  const anchor=()=>canvas.evaluate((c:any)=>c._cellSimGetAnatomyLabels().find((a:any)=>a.name==='Nucleus'));
  const initial=await anchor(),rect=(await canvas.boundingBox())!;
  const point={clientX:rect.x+initial.anchorX,clientY:rect.y+initial.anchorY};
  await page.mouse.move(point.clientX,point.clientY);
  const selected=(await view()).selected;
  // Native wheel coordinates are quantized; the rendered point must stay within half a CSS pixel.
  for(const deltaY of [-120,-120,120]){
   const before=await view();await page.mouse.wheel(0,deltaY);
   await expect.poll(async()=>(await view()).camera.zoom).toBeCloseTo(before.camera.zoom*(deltaY>0?.9:1.1),8);
   const after=await anchor();expect(Math.abs(after.anchorX-initial.anchorX)).toBeLessThan(.5);expect(Math.abs(after.anchorY-initial.anchorY)).toBeLessThan(.5);
   expect(after.selected).toBe(true);expect((await view()).selected).toEqual(selected);
   await expect(stage.locator('[data-cell-control-value=zoom]')).toHaveText(Math.round(40*(await view()).camera.zoom)+'×');
  }
  await stage.screenshot({scale:'css',path:'reports/cell-pointer-zoom/close-up-'+width+'.png'});
  const beforeHorizontal=await view();await canvas.dispatchEvent('wheel',{...point,deltaX:100,deltaY:0});expect(await view()).toEqual(beforeHorizontal);
  for(const zoom of [.5,10]){
   await canvas.evaluate((c:any,z)=>c._cellSimSetZoom(z),zoom);const before=await view();
   await canvas.dispatchEvent('wheel',{...point,deltaY:zoom===10?-120:120});expect(await view()).toEqual(before);
  }
  await stage.locator('[data-cell-observation-center]').click();
  await stage.getByRole('button',{name:'Follow selected specimen',exact:true}).click();const followed=await view();
  await canvas.dispatchEvent('wheel',{...point,deltaY:-120});const afterFollow=await view();
  expect(afterFollow.following).toBe(true);expect(afterFollow.camera.x).toBeCloseTo(followed.camera.x,6);expect(afterFollow.camera.y).toBeCloseTo(followed.camera.y,6);
  expect(afterFollow.camera.zoom).toBeCloseTo(followed.camera.zoom*1.1,8);expect(errors).toEqual([]);
 });
});
test('play wheel zoom preserves specimen tracking and mission evidence',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:1000});
 await harness.mount(page,{cell:{mode:'play',playAsOrganism:'plantcell',selectedOrganism:'plantcell',paused:true,showPlayInstructions:false,playMission:{organismId:'plantcell',startSuccess:0,predictionSkipped:true},_cellExt:{successByOrganism:{plantcell:0},tutorialsSeen:{plantcell:true}}}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'#wrap{width:100%;display:block}'});
 const canvas=page.locator('[data-cell-sim-canvas]');await page.locator('[data-cell-stage]').scrollIntoViewIfNeeded();
 const before=await canvas.evaluate((c:any)=>({view:c._cellSimGetObservationView(),evidence:c._cellSimGetMissionEvidenceState()}));
 const rect=(await canvas.boundingBox())!;await canvas.dispatchEvent('wheel',{deltaY:-120,clientX:rect.x+rect.width*.75,clientY:rect.y+rect.height*.4});
 const after=await canvas.evaluate((c:any)=>({view:c._cellSimGetObservationView(),evidence:c._cellSimGetMissionEvidenceState()}));
 expect(after.view.camera.x).toBeCloseTo(before.view.camera.x,6);expect(after.view.camera.y).toBeCloseTo(before.view.camera.y,6);
 expect(after.view.camera.zoom).toBeCloseTo(before.view.camera.zoom*1.1,8);expect(after.evidence).toEqual(before.evidence);
});
