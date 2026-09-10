import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:1000,appStyles:true});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
for(const [width,id,name] of [[1200,'paramecium','Macronucleus'],[320,'plantcell','Endoplasmic Reticulum']] as const)test('anatomy explanation at '+width,async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height:960});
 await harness.mount(page,{cell:{mode:'observe',selectedOrganism:id,paused:true,zoom:3}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'body{background:#f8fafc}#wrap{width:100%;max-width:1200px;display:block}'});
 const stage=page.locator('[data-cell-stage]'),canvas=page.locator('[data-cell-sim-canvas]');
 const row=page.locator('[data-cell-anatomy-item]').filter({hasText:name}).first();await row.click();await expect(canvas).toBeFocused();
 const read=()=>canvas.evaluate((c:any)=>c._cellSimGetOrganelleTooltip());await expect.poll(async()=>!!(await read())?.layout).toBe(true);
 await expect.poll(()=>canvas.evaluate((c:any)=>{const t=c._cellSimGetOrganelleTooltip(),r=c.getBoundingClientRect(),h=c.closest('[data-cell-stage]').querySelector('[data-cell-stage-hud]').getBoundingClientRect();return !!t?.layout&&t.layout.bounds.top/t.layout.dpr>=h.bottom-r.top;})).toBe(true);
 const geometry=await canvas.evaluate((c:any)=>{const stage=c.closest('[data-cell-stage]');return {tt:c._cellSimGetOrganelleTooltip(),b:c.getBoundingClientRect().toJSON(),hud:stage.querySelector('[data-cell-stage-hud]').getBoundingClientRect().toJSON(),bottom:stage.querySelector('[data-cell-stage-utility=zoom]').getBoundingClientRect().toJSON()};});
 const {tt,b,hud,bottom}=geometry,scale=tt.layout.dpr;
 expect(tt.name).toBe(name);expect(tt.layout.bounds.left/scale).toBeGreaterThanOrEqual(0);expect(tt.layout.bounds.right/scale).toBeLessThanOrEqual(b!.width);
 expect(tt.layout.bounds.top/scale).toBeGreaterThanOrEqual(hud!.y+hud!.height-b!.y);
 expect(tt.layout.bounds.bottom/scale).toBeLessThanOrEqual(bottom!.y-b!.y);
 await page.mouse.click(b!.x+(tt.layout.bounds.left+tt.layout.bounds.right)/2/scale,b!.y+(tt.layout.bounds.top+tt.layout.bounds.bottom)/2/scale);
 expect((await read())?.name).toBe(name);
 await page.waitForTimeout(5400);expect((await read())?.name).toBe(name);
 await stage.screenshot({scale:'css',path:'reports/cell-explanation-refinement/explanation-'+width+'.png'});
 await canvas.press('Escape');await expect.poll(read).toBeNull();await expect(canvas).toBeFocused();
 await row.click();await expect.poll(async()=>!!(await read())?.layout).toBe(true);const reopened=await read(),cv=await canvas.boundingBox(),close=reopened.layout.closeBounds;
 expect((close.right-close.left)/scale).toBeCloseTo(44,5);expect((close.bottom-close.top)/scale).toBeCloseTo(44,5);
 await page.mouse.click(cv!.x+(close.left+close.right)/2/scale,cv!.y+(close.top+close.bottom)/2/scale);await expect.poll(read).toBeNull();expect(errors).toEqual([]);
});

test('play explanations retain their automatic dismissal', async ({page}) => {
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.setViewportSize({width:390,height:960});
 await harness.mount(page,{cell:{mode:'play',playAsOrganism:'plantcell',selectedOrganism:'plantcell',paused:true,showPlayInstructions:false,playMission:{organismId:'plantcell',startSuccess:0,predictionSkipped:true},_cellExt:{successByOrganism:{plantcell:0},tutorialsSeen:{plantcell:true}}}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'#wrap{width:100%;display:block}'});
 await page.locator('[data-cell-stage]').scrollIntoViewIfNeeded();
 const canvas=page.locator('[data-cell-sim-canvas]');
 const opened=await canvas.evaluate((c:any)=>{
  c._cellSimShowOrganelleTooltip('plantcell','Chloroplast');
  return c._cellSimGetOrganelleTooltip();
 });
 expect(opened.name).toBe('Chloroplast');
 expect(opened.layout.bounds.right/opened.layout.dpr).toBeLessThanOrEqual(390);
 expect(opened.layout.bounds.top).toBeGreaterThanOrEqual(opened.layout.legendBottom);
 await expect.poll(()=>canvas.evaluate((c:any)=>c._cellSimGetOrganelleTooltip()),{timeout:15000}).toBeNull();
});
