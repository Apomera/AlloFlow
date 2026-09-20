import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:1000,appStyles:true});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));
for(const width of [280,640,1200])test('comparison identity and readable evidence at '+width,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width,height:1000});
 await harness.mount(page,{cell:{mode:'compare',_cellPicked:true,_cellCategory:'browse'}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'body{background:#f8fafc}#wrap{width:100%;max-width:1200px;display:block}'});
 const lab=page.locator('[data-cell-comparison-lab]'),pair=lab.locator('[data-cell-compare-pair]');
 const a=lab.getByLabel('Organism A',{exact:true}),b=lab.getByLabel('Organism B',{exact:true});
 const row=lab.locator('[data-cell-comparison-property="movement"]');
 await expect(a).toHaveValue('0');await expect(b).toHaveValue('1');
 await expect(row.locator('[data-cell-compare-value=a]')).toContainText('Amoeba');
 await expect(row.locator('[data-cell-compare-value=b]')).toContainText('Paramecium');
 await expect(lab.locator('[data-cell-compare-result-status]')).toHaveText('Showing 7 of 7 properties.');
 const boxes=await pair.locator('[data-cell-compare-identity]').evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
 if(width===280){expect(boxes[1].y).toBeGreaterThanOrEqual(boxes[0].y+boxes[0].h);}
 else {expect(boxes[1].y).toBeCloseTo(boxes[0].y,0);expect(boxes[1].x).toBeGreaterThan(boxes[0].x);}
 await lab.getByRole('button',{name:'Swap organisms',exact:true}).click();
 await expect(a).toHaveValue('1');await expect(b).toHaveValue('0');
 await expect(row.locator('[data-cell-compare-value=a]')).toContainText('Paramecium');
 await expect(row.locator('[data-cell-compare-value=b]')).toContainText('Amoeba');
 await lab.getByRole('button',{name:'Shared descriptions',exact:true}).click();
 await expect(lab.locator('[data-cell-compare-result-status]')).toHaveText('Showing 2 of 7 properties with matching descriptions.');
 await expect(lab.locator('[data-cell-comparison-property]')).toHaveCount(2);
 await expect(lab.getByRole('button',{name:'Shared descriptions',exact:true})).toHaveAttribute('aria-pressed','true');
 await b.selectOption('1');await lab.getByRole('button',{name:'Differences',exact:true}).click();
 await expect(lab.locator('[data-cell-compare-result-status]')).toHaveText('Showing 0 of 7 properties with different descriptions.');
 const reset=lab.getByRole('button',{name:'Show all properties',exact:true});await reset.focus();await page.keyboard.press('Enter');
 await expect(lab.getByRole('button',{name:'All properties',exact:true})).toBeFocused();
 await expect(lab.locator('[data-cell-comparison-property]')).toHaveCount(7);
 await b.selectOption('0');
 await pair.screenshot({path:'reports/cell-comparison-visuals/pair-'+width+'.png',scale:'css'});
 await row.screenshot({path:'reports/cell-comparison-visuals/movement-'+width+'.png',scale:'css'});
 await lab.locator('[data-cell-compare-tools]').screenshot({path:'reports/cell-comparison-visuals/filters-'+width+'.png',scale:'css'});
 const targets=await lab.locator('button,select,input').evaluateAll(items=>items.filter(el=>el.getBoundingClientRect().width>0).map(el=>el.getBoundingClientRect().height));
 for(const height of targets)expect(height).toBeGreaterThanOrEqual(44);
 expect(await lab.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 if(width===280){
  await page.addStyleTag({content:'[data-cell-comparison-lab]{font-size:20px}[data-cell-compare-value-text]{font-size:20px!important;line-height:1.6!important}'});
  await expect(row.locator('[data-cell-compare-value-text]').first()).toHaveCSS('font-size','20px');
  expect(await row.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  const cells=await row.locator('[data-cell-compare-value]').evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom};}));
  expect(cells[1].top).toBeGreaterThanOrEqual(cells[0].bottom);
  await row.screenshot({path:'reports/cell-comparison-visuals/movement-enlarged-280.png',scale:'css'});
 }
 if(width===1200){
  await lab.screenshot({path:'reports/cell-comparison-visuals/workspace-1200.png',scale:'css'});
  await page.addStyleTag({content:'[data-cell-comparison-lab]{width:400px!important}'});
  await expect(lab).toHaveCSS('width','400px');
  await expect.poll(()=>pair.locator('[data-cell-compare-identity]').evaluateAll(items=>{const a=items[0].getBoundingClientRect(),b=items[1].getBoundingClientRect();return b.top>=a.bottom;})).toBe(true);
  const cards=await pair.locator('[data-cell-compare-identity]').evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom};}));
  expect(cards[1].top).toBeGreaterThanOrEqual(cards[0].bottom);
  expect(await lab.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 }
 expect(errors).toEqual([]);
});
