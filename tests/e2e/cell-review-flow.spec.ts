import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:960,appStyles:true});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
for(const width of [1200,320])test(`review navigation and reversible status at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:960});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await harness.mount(page,{cell:{mode:'interior',interiorCellType:'animal',interiorSel:'nucleus',interiorSeen:['nucleus'],interiorReview:['nucleus','mitochondria'],interiorPickerReviewOnly:true,interiorPickerQuery:'nucleus',interiorStudyFocus:true,interiorPaused:true,interiorQuizAttempts:4,interiorQuizCorrect:3}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'body{background:#f8fafc}#wrap{width:100%;max-width:1200px;display:block}'});
 const inspector=page.locator('[data-cell-selected-structure]');const review=inspector.getByRole('region',{name:'Review list navigation'});
 await page.getByRole('region',{name:'Focused cell study'}).getByRole('button',{name:'Open review queue',exact:true}).click();
 await expect(page.locator('[data-cell-tool]')).toHaveAttribute('data-cell-study-focus','true');
 await expect(inspector).toBeFocused();
 await expect(page.getByRole('searchbox',{name:'Find a structure or function'})).toHaveValue('');

 await expect(review).toContainText('2 remaining');
 await inspector.getByRole('button',{name:'Mark mastered',exact:true}).click();
 await expect(inspector).toHaveAttribute('data-cell-selected-structure','nucleus');
 await expect(review).toContainText('1 remaining');
 await inspector.getByRole('button',{name:'Undo study status change for Nucleus',exact:true}).click();
 await expect(inspector).toBeFocused();await expect(review).toContainText('2 remaining');
 await inspector.getByRole('button',{name:'Mark mastered',exact:true}).click();
 await review.getByRole('button',{name:'Next review: Mitochondria',exact:true}).click();
 await expect(inspector).toBeFocused();await expect(inspector).toHaveAttribute('data-cell-selected-structure','mitochondria');
 await expect(page.getByRole('searchbox',{name:'Find a structure or function'})).toHaveValue('');
 await expect(review).toContainText('last structure');
 await inspector.getByRole('button',{name:'Mark mastered',exact:true}).click();
 await expect(review).toContainText('Review list clear');
 await inspector.getByRole('button',{name:'Reset study status',exact:true}).click();
 await expect(inspector.locator('[data-cell-status-feedback]')).toContainText('marked explored');
 await inspector.getByRole('button',{name:'Undo study status change for Mitochondria',exact:true}).click();
 await expect(inspector.getByRole('button',{name:'Mastered',exact:true})).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await inspector.screenshot({path:`reports/cell-review-flow/inspector-${width}.png`});
 await review.getByRole('button',{name:'Browse all structures',exact:true}).click();
 await expect(page.getByRole('searchbox',{name:'Find a structure or function'})).toBeFocused();
 expect(await page.evaluate(()=>{const c=(window as any).__toolData.cell;return [c.interiorQuizAttempts,c.interiorQuizCorrect];})).toEqual([4,3]);
 expect(errors).toEqual([]);
});

test('import and recall answers invalidate stale manual undo',async({page})=>{
 await harness.mount(page,{cell:{mode:'interior',interiorCellType:'animal',interiorSel:'nucleus',interiorPaused:true}},undefined,{expectCanvas:false});
 const inspector=page.locator('[data-cell-selected-structure]');
 await inspector.getByRole('button',{name:'Mark mastered',exact:true}).click();
 await expect(inspector.getByRole('button',{name:'Undo study status change for Nucleus',exact:true})).toBeVisible();
 const transfer=page.locator('[data-cell-progress-portability]');
 await transfer.getByText('Portable progress record',{exact:true}).click();
 await transfer.getByRole('button',{name:'Export progress',exact:true}).click();
 await transfer.getByRole('button',{name:'Import progress',exact:true}).click();
 await expect(inspector.getByRole('button',{name:'Undo study status change for Nucleus',exact:true})).toHaveCount(0);
 await inspector.getByRole('button',{name:'Needs review',exact:true}).click();
 await expect(inspector.getByRole('button',{name:'Undo study status change for Nucleus',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Practice recall',exact:true}).click();
 const quiz=page.getByRole('region',{name:'Adaptive organelle check',exact:true});
 await quiz.getByRole('button',{name:'Nucleus',exact:true}).click();
 await expect(inspector.getByRole('button',{name:'Undo study status change for Nucleus',exact:true})).toHaveCount(0);
 await expect(inspector.getByRole('button',{name:'Mastered',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('empty review queue stays in focus view and offers recovery',async({page})=>{
 await harness.mount(page,{cell:{mode:'interior',interiorCellType:'animal',interiorStudyFocus:true,interiorPickerQuery:'no match'}},undefined,{expectCanvas:false});
 await page.getByRole('region',{name:'Focused cell study'}).getByRole('button',{name:'Open review queue',exact:true}).click();
 await expect(page.locator('[data-cell-tool]')).toHaveAttribute('data-cell-study-focus','true');
 const search=page.getByRole('searchbox',{name:'Find a structure or function'});await expect(search).toBeFocused();await expect(search).toHaveValue('');
 const picker=page.getByRole('region',{name:'Explore cell structures',exact:true});await expect(picker).toContainText('Your review queue is empty');
 await picker.getByRole('button',{name:'Clear structure filters',exact:true}).click();await expect(picker.locator('[data-cell-structure-choice]')).toHaveCount(13);
});
