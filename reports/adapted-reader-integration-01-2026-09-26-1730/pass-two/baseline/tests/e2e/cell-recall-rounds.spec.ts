import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:900,appStyles:true });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({page}) => harness.destroy(page));
test('paused rounds survive cell switching and portable progress import', async ({page}) => {
  await harness.mount(page,{cell:{mode:'interior',interiorCellType:'animal',interiorPaused:true}},undefined,{expectCanvas:false});
  await page.getByRole('button',{name:'Practice recall',exact:true}).click();
  const quiz=page.getByRole('region',{name:'Adaptive organelle check',exact:true});
  await quiz.getByRole('button',{name:'Cell membrane',exact:true}).click();
  await quiz.getByRole('button',{name:'End check',exact:true}).click();
  const types=page.getByRole('group',{name:'Cell type',exact:true});
  await types.getByRole('button',{name:/Plant/}).click();
  await expect(page.getByRole('button',{name:'Practice recall',exact:true})).toBeVisible();
  await types.getByRole('button',{name:/Animal/}).click();
  await expect(page.getByRole('button',{name:'Resume recall',exact:true})).toBeVisible();
  const transfer=page.locator('[data-cell-progress-portability]');
  await transfer.getByText('Portable progress record',{exact:true}).click();
  await transfer.getByRole('button',{name:'Export progress',exact:true}).click();
  const saved=await page.getByRole('textbox',{name:'Portable cell progress JSON'}).inputValue();
  expect(JSON.parse(saved).progress.byCellType.animal.recallRound.answers).toHaveLength(1);
  await harness.destroy(page);
  await harness.mount(page,{cell:{mode:'interior',interiorCellType:'plant'}},undefined,{expectCanvas:false});
  await transfer.getByText('Portable progress record',{exact:true}).click();
  await page.getByRole('textbox',{name:'Portable cell progress JSON'}).fill(saved);
  await transfer.getByRole('button',{name:'Import progress',exact:true}).click();
  await page.getByRole('button',{name:'Resume recall',exact:true}).click();
  await expect(quiz).toContainText('Question 2 of 5');
  expect(await page.evaluate(()=>(window as any).__toolData.cell.interiorQuizAttempts)).toBe(1);
});
for (const width of [1200,320]) {
  test(`complete and review a recall round at ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height:900});
    const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
    await harness.mount(page,{cell:{mode:'interior',interiorCellType:'animal',interiorPaused:true}},undefined,{expectCanvas:false});
    await page.addStyleTag({content:'body{background:#f8fafc} #wrap{width:100%;max-width:1200px;display:block}'});
    await page.getByRole('button',{name:'Focus on cell',exact:true}).click();
    await page.getByRole('button',{name:'Practice recall',exact:true}).click();
    const quiz=page.getByRole('region',{name:'Adaptive organelle check',exact:true});
    const keys:string[]=[];
    for(let i=0;i<5;i++) {
      await expect(quiz).toContainText(`Question ${i+1} of 5`);
      const q=await page.evaluate(()=>{const w=window as any;const c=w.__toolData.cell;return {key:c.interiorQuizKey,name:w.__alloCellPure.CELL_ORGANELLES[c.interiorQuizKey].name};});
      keys.push(q.key);
      const choices=quiz.getByRole('group',{name:'Adaptive check answers'}).getByRole('button');
      if(i===0) {
        const names=await choices.allTextContents();
        await quiz.getByRole('button',{name:names.find(n=>n!==q.name)!,exact:true}).click();
      } else await quiz.getByRole('button',{name:q.name,exact:true}).click();
      await expect(quiz.getByRole('progressbar')).toHaveAttribute('aria-valuenow',String(i+1));
      if(i===0) {
        await quiz.getByRole('button',{name:'End check',exact:true}).click();
        await page.getByRole('button',{name:'Resume recall',exact:true}).click();
      } else await quiz.getByRole('button',{name:i===4?'See round results':'Next review item',exact:true}).click();
    }
    expect(new Set(keys).size).toBe(5);
    const summary=page.getByRole('region',{name:'Recall round results'});
    await expect(summary).toBeFocused();
    await expect(summary.locator('[data-cell-round-score]')).toContainText('4/5');
    await expect(summary.getByText('Needs review',{exact:true})).toHaveCount(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await summary.screenshot({path:`reports/cell-recall-rounds/results-${width}.png`});
    await summary.getByRole('button',{name:'Study missed structures'}).click();
    await expect(page.locator('[data-cell-selected-structure]')).toHaveAttribute('data-cell-selected-structure',keys[0]);
    await expect(page.locator('[data-cell-selected-structure]')).toBeFocused();
    await summary.getByRole('button',{name:'Start another round'}).click();
    await expect(quiz).toContainText('Question 1 of 5');
    expect(await page.evaluate(()=>(window as any).__toolData.cell.interiorQuizKey)).toBe(keys[0]);
    expect(errors).toEqual([]);
  });
}
