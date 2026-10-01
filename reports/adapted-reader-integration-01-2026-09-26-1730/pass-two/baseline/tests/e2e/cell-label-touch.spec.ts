import {test, expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness = new GlHarness({toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:1000,appStyles:true});
test.use({hasTouch:true});
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({page}) => harness.destroy(page));
for (const width of [280, 320, 390, 1200]) test('readable touch labels at ' + width, async ({page}) => {
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.setViewportSize({width,height:960});
 await harness.mount(page,{cell:{mode:'observe',selectedOrganism:'plantcell',paused:true,zoom:3}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'body{background:#f8fafc}#wrap{width:100%;max-width:1200px;display:block}'});
 const stage=page.locator('[data-cell-stage]'), canvas=page.locator('[data-cell-sim-canvas]');
 await stage.scrollIntoViewIfNeeded();
 await stage.locator('[data-cell-observation-center]').click();
 const labels=()=>canvas.evaluate((c:any)=>c._cellSimGetAnatomyLabels());
 const tooltip=()=>canvas.evaluate((c:any)=>c._cellSimGetOrganelleTooltip());
 await expect.poll(async()=>(await labels()).length).toBeGreaterThan(2);
 for(const id of ['plantcell','paramecium','stentor']) {
  await canvas.evaluate((c:any,id)=>c._cellSimSelectOrganism(id,true),id);
  const boxes=await labels();
  expect(boxes.length).toBeGreaterThan(2);
  const rect=(await canvas.boundingBox())!;
  for(const [i,a] of boxes.entries()) {
   expect(a.height).toBeGreaterThanOrEqual(44);
   expect(a.width).toBeGreaterThanOrEqual(44);
   expect(a.lines.join(' ')).toBe(a.name);
   expect(a.x).toBeGreaterThanOrEqual(0);
   expect(a.x+a.width).toBeLessThanOrEqual(rect.width+1);
   for(const b of boxes.slice(i+1)) expect(a.x+a.width<=b.x || b.x+b.width<=a.x || a.y+a.height<=b.y || b.y+b.height<=a.y).toBe(true);
  }
  if(id==='plantcell' && width===280) expect(boxes.find((b:any)=>b.name==='Endoplasmic Reticulum').lines.length).toBeGreaterThan(1);
 }
 await canvas.evaluate((c:any)=>c._cellSimSelectOrganism('plantcell',true));
 await stage.screenshot({scale:'css',path:'reports/cell-label-touch/labels-'+width+'.png'});
 const original=await labels(), target=original.find((b:any)=>b.name==='Endoplasmic Reticulum');
 const rect=(await canvas.boundingBox())!;
 // Tap near a pill's lower edge, outside the previous 26px target.
 await page.touchscreen.tap(rect.x+target.x+target.width/2,rect.y+target.y+target.height-3);
 await expect.poll(async()=>(await tooltip())?.name).toBe(target.name);
 await canvas.press('Escape');
 await canvas.evaluate((c:any)=>c._cellSimSetFollowSpecimen(true));
 const before=await canvas.evaluate((c:any)=>c._cellSimGetObservationView());
 const fresh=(await labels())[0];
 const point={clientX:rect.x+fresh.x+fresh.width/2,clientY:rect.y+fresh.y+fresh.height/2,pointerId:77,pointerType:'touch',isPrimary:true,button:0};
 await canvas.dispatchEvent('pointerdown',point);
 await canvas.dispatchEvent('pointermove',{...point,clientX:point.clientX+6,clientY:point.clientY+2});
 await canvas.dispatchEvent('pointerup',{...point,clientX:point.clientX+6,clientY:point.clientY+2});
 expect((await tooltip())?.name).toBe(fresh.name);
 const after=await canvas.evaluate((c:any)=>c._cellSimGetObservationView());
 expect(after.following).toBe(true);
 expect(after.camera).toEqual(before.camera);
 await canvas.press('Escape');
 // A deliberate drag remains a drag even if the finger returns to its starting point.
 await canvas.dispatchEvent('pointerdown',point);
 await canvas.dispatchEvent('pointermove',{...point,clientX:point.clientX+45});
 await canvas.dispatchEvent('pointermove',point);
 await canvas.dispatchEvent('pointerup',point);
 expect(await tooltip()).toBeNull();
 expect((await canvas.evaluate((c:any)=>c._cellSimGetObservationView())).following).toBe(false);
 // A moved label keeps its press-time identity rather than choosing what is now underneath.
 const movingPoint={...point,clientX:rect.x+fresh.x+3};
 await canvas.dispatchEvent('pointerdown',movingPoint);
 await canvas.evaluate((c:any)=>c._cellSimSetZoom(0.5));
 const shifted=(await labels()).find((b:any)=>b.name===fresh.name);
 expect(movingPoint.clientX-rect.x).toBeLessThan(shifted.x);
 await canvas.dispatchEvent('pointerup',movingPoint);
 expect((await tooltip())?.name).toBe(fresh.name);
 await canvas.press('Escape');
 const shiftedPoint={...point,clientX:rect.x+shifted.x+shifted.width/2};
 await canvas.dispatchEvent('pointerdown',shiftedPoint);
 await canvas.dispatchEvent('pointercancel',shiftedPoint);
 await canvas.dispatchEvent('pointerup',shiftedPoint);
 expect(await tooltip()).toBeNull();
 // A second finger must not take over the first finger's tap.
 await canvas.dispatchEvent('pointerdown',shiftedPoint);
 await canvas.dispatchEvent('pointerdown',{...shiftedPoint,pointerId:88});
 await canvas.dispatchEvent('pointerup',{...shiftedPoint,pointerId:88});
 expect(await tooltip()).toBeNull();
 await canvas.dispatchEvent('pointerup',shiftedPoint);
 expect((await tooltip())?.name).toBe(fresh.name);
 await canvas.press('Escape');
 await canvas.dispatchEvent('pointerdown',shiftedPoint);
 await canvas.evaluate((c:any)=>c._cellSimSelectOrganism('paramecium',true));
 await canvas.dispatchEvent('pointerup',shiftedPoint);
 expect(await tooltip()).toBeNull();
});
