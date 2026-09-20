# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cell-comparison-visuals.spec.ts >> comparison identity and readable evidence at 1200
- Location: tests\e2e\cell-comparison-visuals.spec.ts:7:39

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 346.53125
Received:    183.53125
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import {GlHarness} from './helpers/stem_gl_harness';
  3  | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cell.js',toolId:'cell',width:1200,height:1000,appStyles:true});
  4  | test.beforeAll(()=>harness.start());
  5  | test.afterAll(()=>harness.stop());
  6  | test.afterEach(async({page})=>harness.destroy(page));
  7  | for(const width of [280,640,1200])test('comparison identity and readable evidence at '+width,async({page})=>{
  8  |  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  9  |  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width,height:1000});
  10 |  await harness.mount(page,{cell:{mode:'compare',_cellPicked:true,_cellCategory:'browse'}},undefined,{expectCanvas:false});
  11 |  await page.addStyleTag({content:'body{background:#f8fafc}#wrap{width:100%;max-width:1200px;display:block}'});
  12 |  const lab=page.locator('[data-cell-comparison-lab]'),pair=lab.locator('[data-cell-compare-pair]');
  13 |  const a=lab.getByLabel('Organism A',{exact:true}),b=lab.getByLabel('Organism B',{exact:true});
  14 |  const row=lab.locator('[data-cell-comparison-property="movement"]');
  15 |  await expect(a).toHaveValue('0');await expect(b).toHaveValue('1');
  16 |  await expect(row.locator('[data-cell-compare-value=a]')).toContainText('Amoeba');
  17 |  await expect(row.locator('[data-cell-compare-value=b]')).toContainText('Paramecium');
  18 |  await expect(lab.locator('[data-cell-compare-result-status]')).toHaveText('Showing 7 of 7 properties.');
  19 |  const boxes=await pair.locator('[data-cell-compare-identity]').evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
  20 |  if(width===280){expect(boxes[1].y).toBeGreaterThanOrEqual(boxes[0].y+boxes[0].h);}
  21 |  else {expect(boxes[1].y).toBeCloseTo(boxes[0].y,0);expect(boxes[1].x).toBeGreaterThan(boxes[0].x);}
  22 |  await lab.getByRole('button',{name:'Swap organisms',exact:true}).click();
  23 |  await expect(a).toHaveValue('1');await expect(b).toHaveValue('0');
  24 |  await expect(row.locator('[data-cell-compare-value=a]')).toContainText('Paramecium');
  25 |  await expect(row.locator('[data-cell-compare-value=b]')).toContainText('Amoeba');
  26 |  await lab.getByRole('button',{name:'Shared descriptions',exact:true}).click();
  27 |  await expect(lab.locator('[data-cell-compare-result-status]')).toHaveText('Showing 2 of 7 properties with matching descriptions.');
  28 |  await expect(lab.locator('[data-cell-comparison-property]')).toHaveCount(2);
  29 |  await expect(lab.getByRole('button',{name:'Shared descriptions',exact:true})).toHaveAttribute('aria-pressed','true');
  30 |  await b.selectOption('1');await lab.getByRole('button',{name:'Differences',exact:true}).click();
  31 |  await expect(lab.locator('[data-cell-compare-result-status]')).toHaveText('Showing 0 of 7 properties with different descriptions.');
  32 |  const reset=lab.getByRole('button',{name:'Show all properties',exact:true});await reset.focus();await page.keyboard.press('Enter');
  33 |  await expect(lab.getByRole('button',{name:'All properties',exact:true})).toBeFocused();
  34 |  await expect(lab.locator('[data-cell-comparison-property]')).toHaveCount(7);
  35 |  await b.selectOption('0');
  36 |  await pair.screenshot({path:'reports/cell-comparison-visuals/pair-'+width+'.png',scale:'css'});
  37 |  await row.screenshot({path:'reports/cell-comparison-visuals/movement-'+width+'.png',scale:'css'});
  38 |  await lab.locator('[data-cell-compare-tools]').screenshot({path:'reports/cell-comparison-visuals/filters-'+width+'.png',scale:'css'});
  39 |  const targets=await lab.locator('button,select,input').evaluateAll(items=>items.filter(el=>el.getBoundingClientRect().width>0).map(el=>el.getBoundingClientRect().height));
  40 |  for(const height of targets)expect(height).toBeGreaterThanOrEqual(44);
  41 |  expect(await lab.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  42 |  if(width===280){
  43 |   await page.addStyleTag({content:'[data-cell-comparison-lab]{font-size:20px}[data-cell-compare-value-text]{font-size:20px!important;line-height:1.6!important}'});
  44 |   await expect(row.locator('[data-cell-compare-value-text]').first()).toHaveCSS('font-size','20px');
  45 |   expect(await row.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  46 |   const cells=await row.locator('[data-cell-compare-value]').evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom};}));
  47 |   expect(cells[1].top).toBeGreaterThanOrEqual(cells[0].bottom);
  48 |   await row.screenshot({path:'reports/cell-comparison-visuals/movement-enlarged-280.png',scale:'css'});
  49 |  }
  50 |  if(width===1200){
  51 |   await lab.screenshot({path:'reports/cell-comparison-visuals/workspace-1200.png',scale:'css'});
  52 |   await page.addStyleTag({content:'[data-cell-comparison-lab]{width:400px!important}'});
  53 |   const cards=await pair.locator('[data-cell-compare-identity]').evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom};}));
> 54 |   expect(cards[1].top).toBeGreaterThanOrEqual(cards[0].bottom);
     |                        ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  55 |   expect(await lab.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  56 |  }
  57 |  expect(errors).toEqual([]);
  58 | });
  59 | 
```