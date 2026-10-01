import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:900,appStyles:true});
test.use({deviceScaleFactor:2});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

for (const width of [1200,320]) {
  test(`diagram controls and searchable structures at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:960});
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await harness.mount(page,{cell:{mode:'interior',interiorCellType:'animal',interiorPaused:true,interiorReview:['nucleus'],interiorSeen:['nucleus'],interiorStudyFocus:true}},undefined,{expectCanvas:false});
    await page.addStyleTag({content:'body{background:#f8fafc} #wrap{width:100%;max-width:1200px;display:block}'});
    const zoom=page.getByRole('slider',{name:'Cell diagram detail zoom'});
    await expect(zoom).toBeVisible();await zoom.fill('1.25');await expect(zoom).toHaveValue('1.25');
    await page.getByRole('button',{name:'Show study labels',exact:true}).click();
    await expect(page.getByRole('button',{name:'Hide study labels',exact:true})).toHaveAttribute('aria-pressed','true');
    await page.getByRole('button',{name:'High contrast',exact:true}).click();
    await page.getByRole('button',{name:'Show diagram annotations',exact:true}).click();
    await page.getByRole('button',{name:'Reset diagram',exact:true}).click();
    await expect(zoom).toHaveValue('1');
    await expect(page.getByRole('button',{name:'High contrast',exact:true})).toHaveAttribute('aria-pressed','false');
    await expect(page.getByRole('button',{name:'Show study labels',exact:true})).toHaveAttribute('aria-pressed','false');
    await expect(page.getByRole('button',{name:'Show diagram annotations',exact:true})).toHaveAttribute('aria-pressed','false');
    await expect(page.getByRole('button',{name:'Resume cell animation',exact:true})).toBeVisible();
    const picker=page.getByRole('region',{name:'Explore cell structures',exact:true});
    const search=picker.getByRole('searchbox',{name:'Find a structure or function'});
    await search.fill('Nucleus ');await expect(search).toHaveValue('Nucleus ');
    await picker.getByRole('button',{name:'Needs review (1)',exact:true}).click();
    await expect(picker.locator('[data-cell-structure-choice]')).toHaveCount(1);
    await picker.locator('[data-cell-structure-choice="nucleus"]').click();
    const inspector=page.locator('[data-cell-selected-structure]');
    await expect(inspector).toHaveAttribute('data-cell-selected-structure','nucleus');
    if(width===320)await expect(inspector).toBeFocused();
    await inspector.getByRole('button',{name:'Browse structures',exact:true}).click();await expect(search).toBeFocused();
    await search.fill('zzzz');await expect(picker).toContainText('No structures match');
    await picker.getByRole('button',{name:'Clear structure filters',exact:true}).click();await expect(search).toHaveValue('');await expect(search).toBeFocused();
    await expect(picker.locator('[data-cell-structure-choice]')).toHaveCount(13);
    await inspector.getByRole('button',{name:'Mark mastered',exact:true}).click();
    await expect(picker.locator('[data-cell-structure-choice="nucleus"]')).toContainText('Mastered');
    await picker.getByRole('button',{name:'Needs review (0)',exact:true}).click();await expect(picker).toContainText('Your review queue is empty');
    await picker.getByRole('button',{name:'Clear structure filters',exact:true}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator('[data-cell-interior-workspace]').scrollIntoViewIfNeeded();
    await page.screenshot({scale:'css',path:`reports/cell-workbench-controls/workbench-${width}.png`,fullPage:true});
    expect(errors).toEqual([]);
  });
}
