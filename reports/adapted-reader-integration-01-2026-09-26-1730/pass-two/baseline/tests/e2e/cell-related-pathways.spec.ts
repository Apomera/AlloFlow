import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:960,appStyles:true});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
for(const [width,type,key,id,label,position,total] of [[1200,'animal','golgi','secretory','Protein export',3,4],[320,'plant','peroxisome','energy','Energy and redox',2,3],[390,'bacterium','plasmid','bacterialInfo','Bacterial DNA to protein',2,3]] as const) {
 test(`enter a pathway from the selected ${type} structure at ${width}px`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height:960});
  await harness.mount(page,{cell:{mode:'interior',interiorCellType:type,interiorSel:key,interiorStudyFocus:true,interiorPaused:true,interiorMastered:[key],interiorQuizAttempts:2,interiorQuizCorrect:1}},undefined,{expectCanvas:false});
  await page.addStyleTag({content:'body{background:#f8fafc}#wrap{width:100%;max-width:1200px;display:block}'});
  const inspector=page.locator('[data-cell-selected-structure]');
  await inspector.getByText('Structure & connections',{exact:true}).click();
  const related=inspector.locator('[data-cell-related-pathways]');await expect(related).toBeVisible();
  await expect(related).toContainText(`Step ${position} of ${total}`);
  await related.screenshot({path:`reports/cell-related-pathways/related-${type}-${width}.png`});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const sizes=await related.getByRole('button').evaluateAll(buttons=>buttons.map(button=>button.getBoundingClientRect().height));expect(sizes.every(height=>height>=44)).toBe(true);
  await related.getByRole('button',{name:new RegExp('^Follow '+label+' at ')}).click();
  const guide=page.getByRole('region',{name:label+' guided pathway'});await expect(guide).toBeFocused();await expect(guide).toContainText(`Step ${position} of ${total}`);
  await expect(inspector).toHaveAttribute('data-cell-selected-structure',key);
  await expect(related.getByRole('button',{name:new RegExp('^Return to '+label+' at ')})).toBeVisible();
  const state=await page.evaluate(()=>(window as any).__toolData.cell);expect(state.interiorMastered).toEqual([key]);expect([state.interiorQuizAttempts,state.interiorQuizCorrect]).toEqual([2,1]);expect(state.interiorSeen).toEqual([key]);
  await guide.getByRole('button',{name:/^Next:/}).click();await expect(guide).toContainText('Last stop');
  await guide.getByRole('button',{name:'Back to exploring',exact:true}).click();await expect(inspector).toBeFocused();
  await related.getByRole('button',{name:new RegExp('^Follow '+label+' at ')}).click();await expect(guide).toContainText(`Step ${total} of ${total}`);
  const saved=await page.evaluate(()=>(window as any).__toolData.cellProgress);
  await harness.destroy(page);await harness.mount(page,{cell:{mode:'interior',interiorStudyFocus:true},cellProgress:saved},undefined,{expectCanvas:false});
  await expect(page.locator(`[data-cell-guided-pathway="${id}"]`)).toContainText(`Step ${total} of ${total}`);
  expect(errors).toEqual([]);
 });
}
