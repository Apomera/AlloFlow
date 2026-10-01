import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:1000,appStyles:true});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
for(const [mode,width] of [['observe',1200],['play',390],['play',320]] as const){
 test('petri visuals '+mode+' at '+width,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width,height:960});
  const mission={selectedOrganism:'amoeba',playAsOrganism:'amoeba',showPlayInstructions:false,playMission:{organismId:'amoeba',startSuccess:9,predictionSkipped:true},_cellExt:{successByOrganism:{amoeba:9},organismsObserved:['amoeba'],tutorialsSeen:{amoeba:true}}};
  await harness.mount(page,{cell:{mode,...(mode==='play'?mission:{})}},undefined,{expectCanvas:false});
  await page.addStyleTag({content:'body{background:#f8fafc}#wrap{width:100%;max-width:1200px;display:block}'});
  const stage=page.locator('[data-cell-stage]');await stage.scrollIntoViewIfNeeded();
  const canvas=stage.locator('canvas').first();
  await expect.poll(()=>canvas.evaluate((c:any)=>!!c._cellSimAlive)).toBe(true);
  await page.waitForTimeout(1000);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(mode==='play'){
    const pad=page.locator('[data-cell-direction-pad]');
    const padBox=await pad.boundingBox();
    for(const utility of await page.locator('[data-cell-stage-utility]').all()){
      const box=await utility.boundingBox();expect(box!.y).toBeGreaterThan(padBox!.y+padBox!.height);
      const button=await utility.locator('button').boundingBox();expect(button!.width).toBeGreaterThanOrEqual(44);expect(button!.height).toBeGreaterThanOrEqual(44);
    }
    const zoom=await page.locator('[data-cell-stage-utility=zoom]').boundingBox();
    const speed=await page.locator('[data-cell-stage-utility=speed]').boundingBox();
    expect(zoom!.x+zoom!.width).toBeLessThan(speed!.x);
  }
  await page.getByRole('button',{name:'Pause simulation',exact:true}).click();
  await expect.poll(()=>canvas.evaluate((c:any)=>c._cellSimPaused)).toBe(true);
  await page.getByRole('button',{name:'Play simulation',exact:true}).click();
  await expect.poll(()=>canvas.evaluate((c:any)=>c._cellSimPaused)).toBe(false);
  await stage.screenshot({scale:'css',path:'reports/cell-petri-visuals/'+(process.env.CELL_VISUAL_BASELINE?'before-':'')+mode+'-'+width+'.png'});
  expect(errors).toEqual([]);
 });
}
