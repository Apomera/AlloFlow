import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:1000,appStyles:true});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
for(const [id,mode,width] of [['amoeba','observe',1200],['amoeba','play',390],['plantcell','play',320]] as const){
 test('clear anatomy '+id+' '+mode+' at '+width,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width,height:960});
  await harness.mount(page,{cell:{mode,selectedOrganism:id,playAsOrganism:mode==='play'?id:undefined,zoom:3,showPlayInstructions:false,playMission:{organismId:id,startSuccess:0,predictionSkipped:true},_cellExt:{successByOrganism:{[id]:0},organismsObserved:[id],tutorialsSeen:{[id]:true}}}},undefined,{expectCanvas:false});
  await page.addStyleTag({content:'body{background:#f8fafc}#wrap{width:100%;max-width:1200px;display:block}'});
  const stage=page.locator('[data-cell-stage]');await stage.scrollIntoViewIfNeeded();const canvas=page.locator('[data-cell-sim-canvas]');
  await expect.poll(()=>canvas.evaluate((c:any)=>c._cellSimGetAnatomyLabels?.().length||0)).toBeGreaterThan(2);
  await page.getByRole('button',{name:'Pause simulation',exact:true}).click();
  const boxes=await canvas.evaluate((c:any)=>c._cellSimGetAnatomyLabels());
  const cb=await canvas.boundingBox();
  if(mode==='play'){
    const response=await canvas.evaluate((c:any)=>c._cellSimGetControlResponse());
    const guide=await canvas.evaluate((c:any)=>c._cellSimGetTargetGuide());
    const scale=await canvas.evaluate((c:HTMLCanvasElement)=>c.width/c.getBoundingClientRect().width);
    for(const box of boxes){expect(box.y).toBeGreaterThanOrEqual(response.tagBounds.bottom/scale);expect(box.y+box.height).toBeLessThanOrEqual(guide.safeRect.bottom/scale-30);}
  }
  for(let i=0;i<boxes.length;i++){const a=boxes[i];expect(a.x).toBeGreaterThanOrEqual(0);expect(a.x+a.width).toBeLessThanOrEqual(cb!.width+1);
   for(const b of boxes.slice(i+1))expect(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y).toBe(true);
  }
  await stage.screenshot({scale:'css',path:'reports/cell-annotation-refinement/'+mode+'-'+id+'-'+width+'.png'});
  const target=boxes[0];await page.mouse.click(cb!.x+target.x+target.width/2,cb!.y+target.y+target.height/2);
  await expect.poll(()=>canvas.evaluate((c:any)=>c._cellSimGetOrganelleTooltip?.()?.name)).toBe(target.name);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
 });
}
