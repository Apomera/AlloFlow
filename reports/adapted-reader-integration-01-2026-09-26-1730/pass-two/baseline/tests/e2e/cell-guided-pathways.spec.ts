import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:960,appStyles:true});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
for(const [width,type,id,label] of [[1200,'animal','energy','Energy and redox'],[320,'plant','secretory','Protein export'],[390,'bacterium','bacterialInfo','Bacterial DNA to protein']] as const) {
  test(`guided pathway in focus view: ${type} at ${width}px`,async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setViewportSize({width,height:960});
    await harness.mount(page,{cell:{mode:'interior',interiorCellType:type,interiorPaused:true}},undefined,{expectCanvas:false});
    await page.addStyleTag({content:'body{background:#f8fafc}#wrap{width:100%;max-width:1200px;display:block}'});
    await page.getByRole('button',{name:'Focus on cell',exact:true}).click();
    const picker=page.locator('[data-cell-pathway-picker]');
    await picker.getByText('Guided pathways',{exact:true}).click();
    await picker.getByRole('button',{name:new RegExp(label)}).click();
    const guide=page.getByRole('region',{name:label+' guided pathway'});
    await expect(guide).toBeVisible();await expect(guide).toBeFocused();
    const steps=await page.evaluate(({id,type})=>(window as any).__alloCellPure.cellGuideForType(id,type).steps,{id,type});
    const selected=page.locator('[data-cell-selected-structure]');
    for(let index=0;index<steps.length;index++) {
      await expect(guide.locator('[data-cell-pathway-position]')).toHaveText(`Step ${index+1} of ${steps.length}`);
      await expect(selected).toHaveAttribute('data-cell-selected-structure',steps[index].key);
      await expect(guide.locator('[aria-current="step"]')).toHaveAttribute('aria-label',new RegExp('Step '+(index+1)));
      if(index<steps.length-1) await guide.getByRole('button',{name:/^Next:/}).click();
    }
    await expect(guide).toContainText('Last stop');
    await expect(guide).toBeFocused();
    await guide.getByRole('button',{name:/^Step 1:/}).click();
    await expect(selected).toHaveAttribute('data-cell-selected-structure',steps[0].key);
    await expect(guide.getByRole('button',{name:'Previous stop'})).toBeDisabled();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const sizes=await guide.getByRole('button').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height));
    expect(sizes.every(h=>h>=44)).toBe(true);
    await guide.screenshot({path:`reports/cell-guided-pathways/pathway-${type}-${width}.png`});
    await guide.getByRole('button',{name:'Back to exploring'}).click();
    await expect(guide).toHaveCount(0);await expect(selected).toBeFocused();
    await picker.getByRole('button',{name:new RegExp(label)}).click();
    await page.getByRole('button',{name:'Practice recall',exact:true}).click();
    await expect(guide).toHaveCount(0);
    await expect(page.locator('[data-cell-interior-workspace]')).toHaveAttribute('data-cell-recall-pending','true');
    expect(errors).toEqual([]);
  });
}

test('older animal energy progress restores a valid stop and stays independent of plant progress',async({page})=>{
  await harness.mount(page,{cell:{mode:'interior',interiorCellType:'animal'},cellProgress:{schemaVersion:1,currentType:'animal',byCellType:{animal:{guideId:'energy',guideStep:0,selected:'chloroplast'}}}},undefined,{expectCanvas:false});
  await page.getByRole('button',{name:'Focus on cell',exact:true}).click();
  const guide=page.getByRole('region',{name:'Energy and redox guided pathway'});
  await expect(guide).toContainText('Step 1 of 2');
  await expect(page.locator('[data-cell-selected-structure]')).toHaveAttribute('data-cell-selected-structure','peroxisome');
  await guide.getByRole('button',{name:'Next: Mitochondria',exact:true}).click();
  const types=page.getByRole('group',{name:'Cell type',exact:true});
  await types.getByRole('button',{name:/Plant/}).click();
  await expect(guide).toHaveCount(0);
  await types.getByRole('button',{name:/Animal/}).click();
  await expect(guide).toContainText('Step 2 of 2');
  await expect(page.locator('[data-cell-selected-structure]')).toHaveAttribute('data-cell-selected-structure','mitochondria');
  expect(await page.evaluate(()=>(window as any).__toolData.cell.interiorGuideStep)).toBe(2);
});
