import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:1000,appStyles:true});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));
for(const [mode,width,id,name] of [
 ['observe',1200,'plantcell','Endoplasmic Reticulum'],
 ['observe',320,'plantcell','Endoplasmic Reticulum'],
 ['play',390,'paramecium','Cilia'],
] as const){
 test('specimen notes '+mode+' at '+width,async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width,height:960});
  await harness.mount(page,{cell:{mode,paused:true,selectedOrganism:id,showPlayInstructions:false}},undefined,{expectCanvas:false});
  await page.addStyleTag({content:'body{background:#f8fafc}#wrap{width:100%;max-width:1200px;display:block}'});
  const detail=page.locator('[data-cell-selected-organism-card]');
  await detail.scrollIntoViewIfNeeded();
  await expect(detail.locator('[data-cell-specimen-overview]')).toHaveCount(mode==='observe'?1:0);
  await expect(detail.locator('[data-cell-learning-link]')).toHaveCount(mode==='play'?1:0);
  const missionRows=detail.locator('[data-cell-mission-focus=true]');
  if(mode==='observe')await expect(missionRows).toHaveCount(0);
  else expect(await missionRows.count()).toBeGreaterThan(0);
  const rows=detail.locator('[data-cell-anatomy-item]');
  const layout=await rows.evaluateAll((items:Element[])=>items.map(item=>{
   const rect=item.getBoundingClientRect(),title=item.querySelector('[data-cell-anatomy-title]')!.getBoundingClientRect(),body=item.querySelector('[data-cell-anatomy-description]')!.getBoundingClientRect(),action=item.querySelector('[data-cell-anatomy-action]')!.getBoundingClientRect();
   return {left:rect.left,right:rect.right,height:rect.height,titleBottom:title.bottom,bodyTop:body.top,bodyBottom:body.bottom,actionTop:action.top};
  }));
  for(const row of layout){
   expect(row.left).toBeGreaterThanOrEqual(0);expect(row.right).toBeLessThanOrEqual(width);
   expect(row.height).toBeGreaterThanOrEqual(44);expect(row.bodyTop).toBeGreaterThanOrEqual(row.titleBottom);
   expect(row.actionTop).toBeGreaterThan(row.bodyBottom);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await detail.screenshot({scale:'css',path:'reports/cell-specimen-notes-refinement/notes-'+mode+'-'+width+'.png'});
  const row=rows.filter({hasText:name}).first();
  await row.focus();await page.keyboard.press('Enter');
  const canvas=page.locator('[data-cell-sim-canvas]');
  await expect(canvas).toBeFocused();
  await expect.poll(()=>canvas.evaluate((c:any)=>c._cellSimGetOrganelleTooltip()?.name)).toBe(name);
  expect(errors).toEqual([]);
 });
}
