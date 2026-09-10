import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:1000,appStyles:true});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
for(const [mode,width] of [['observe',1200],['observe',390],['play',320]] as const){
 test('illustrated gallery '+mode+' at '+width,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width,height:960});
  await harness.mount(page,{cell:{mode,paused:true,selectedOrganism:'amoeba',showPlayInstructions:false}},undefined,{expectCanvas:false});
  await page.addStyleTag({content:'body{background:#f8fafc}#wrap{width:100%;max-width:1200px;display:block}'});
  const chooser=page.locator('[data-cell-organism-chooser]');await chooser.scrollIntoViewIfNeeded();
  const previews=chooser.locator('[data-cell-specimen-portrait] canvas');await expect(previews).toHaveCount(11);
  const rendered=await previews.evaluateAll((cs:any[])=>cs.map(c=>({id:c._cellPortraitId,url:c.toDataURL(),width:c.width,colors:new Set(Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).filter((_:any,i)=>i%4===0)).size})));
  expect(rendered.every(x=>x.id&&x.width===360&&x.colors>40)).toBe(true);
  expect(new Set(rendered.map(x=>x.url)).size).toBe(11);
  await chooser.screenshot({scale:'css',path:'reports/cell-specimen-gallery/gallery-'+mode+'-'+width+'.png'});
  await chooser.locator('[data-cell-organism-option="paramecium"]').click();
  const detail=page.locator('[data-cell-selected-organism-card]');await expect(detail).toHaveAttribute('data-cell-selected-organism','paramecium');
  await expect(detail.locator('[data-cell-specimen-portrait]')).toHaveAttribute('data-cell-specimen-portrait','paramecium');
  const still=await chooser.locator('[data-cell-specimen-portrait="amoeba"] canvas').evaluate((c:HTMLCanvasElement)=>c.toDataURL());
  expect(still).toBe(rendered.find(x=>x.id==='amoeba')!.url);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await detail.screenshot({scale:'css',path:'reports/cell-specimen-gallery/detail-'+mode+'-'+width+'.png'});
  await detail.locator('[data-cell-back-to-organisms]').click();
  await expect(chooser.locator('[data-cell-organism-option="paramecium"]')).toBeFocused();
  expect(errors).toEqual([]);
 });
}
