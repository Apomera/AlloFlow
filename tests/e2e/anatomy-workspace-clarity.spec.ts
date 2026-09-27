import {test, expect} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';

const out = 'reports/anatomy-workspace-refinement-2026-09-27';
const harness = new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true});
test.use({video:'off',trace:'off'});
test.beforeAll(async()=>{await harness.start();await mkdir(out,{recursive:true});});
test.afterAll(async()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

test('Explore keeps primary controls visible, optional controls stable, and search usable across widths and themes',async({page})=>{
  test.setTimeout(180000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:1440,height:1000});
  await harness.mount(page,{anatomy:{_structureNotes:{skull:'Keep my study note'}}},undefined,{expectCanvas:false});
  await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}'});
  const nav=page.locator('[data-anatomy-explorer-nav]');
  const search=page.locator('#anatomy-global-search-input');
  const more=nav.getByRole('button',{name:'More controls',exact:true});
  await expect(search).toHaveCount(1);
  await expect(nav.getByLabel('Body system')).toBeVisible();
  await expect(nav.getByLabel('Learning level')).toBeVisible();
  await expect(search).toBeVisible();
  const model=page.locator('[data-anatomy-model-shell]');
  const initialModelTop=await model.evaluate(el=>el.getBoundingClientRect().top);
  expect(initialModelTop).toBeLessThan(450);
  await page.screenshot({path:out+'/desktop-first-screen.png'});

  const before=await more.boundingBox();
  await more.click();
  const fewer=nav.getByRole('button',{name:'Fewer controls',exact:true});
  const after=await fewer.boundingBox();
  expect(Math.abs(after!.y-before!.y)).toBeLessThan(2);
  for(const id of ['anatomy-study-mission','anatomy-study-mode-info','anatomy-study-display','anatomy-study-diagram-settings']) {
    await expect(page.locator('#'+id)).toBeVisible();
  }
  await expect(search).toHaveCount(1);
  // The optional controls follow their trigger in keyboard order.
  expect(await page.locator('#anatomy-study-mission').evaluate(el=>el.getBoundingClientRect().top)).toBeGreaterThan(after!.y+after!.height);
  await fewer.click();
  await expect(page.locator('#anatomy-study-diagram-settings')).toBeHidden();
  await expect(search).toBeVisible();

  await nav.getByLabel('Body system').selectOption('muscular');
  await search.fill('femur');
  await expect(page.getByRole('listbox',{name:'Anatomy search results'})).toBeVisible();
  await search.press('Escape');
  await expect(page.getByRole('listbox',{name:'Anatomy search results'})).toHaveCount(0);
  await expect(search).toBeFocused();
  await search.press('ArrowDown');
  await search.press('Enter');
  await expect(nav.getByLabel('Body system')).toHaveValue('skeletal');
  await expect(page.locator('[data-anatomy-structure-detail-heading]')).toHaveText('Femur');
  await expect(search).toHaveValue('');
  expect(await page.evaluate(()=>(window as any).__toolData.anatomy._structureNotes.skull)).toBe('Keep my study note');
  await page.locator('[data-anatomy-structure-detail]').screenshot({path:out+'/reading-card.png'});

  await search.fill('zzzz-no-structure');
  await expect(page.getByRole('status').filter({hasText:'No matching structures'})).toBeVisible();
  await nav.getByRole('button',{name:'Clear anatomy search',exact:true}).click();
  await expect(search).toHaveValue('');
  await expect(search).toBeFocused();
  await search.fill('heart');
  await expect(page.locator('[data-anatomy-structure-list]')).toContainText('No matches in this view');
  await search.press('Escape');
  await page.getByRole('button',{name:'View search results',exact:true}).click();
  await expect(search).toBeFocused();
  await expect(page.getByRole('listbox',{name:'Anatomy search results'})).toBeVisible();
  await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
  const scans:any[]=[],sizes:any[]=[];
  for(const width of [320,390,768,1024,1440]){
    await page.setViewportSize({width,height:900});
    await search.focus();
    await expect(page.getByRole('listbox',{name:'Anatomy search results'})).toBeVisible();
    const dimensions=await page.evaluate(()=>{
      const results=document.querySelector('#anatomy-global-search-results')!.getBoundingClientRect();
      return {width:innerWidth,scroll:document.documentElement.scrollWidth,resultsLeft:results.left,resultsRight:results.right};
    });
    sizes.push(dimensions);
    expect(dimensions.scroll).toBeLessThanOrEqual(width+2);
    expect(dimensions.resultsLeft).toBeGreaterThanOrEqual(0);
    expect(dimensions.resultsRight).toBeLessThanOrEqual(width);
  }
  for(const theme of ['light','dark','contrast']){
    await page.evaluate(theme=>document.body.className=theme==='light'?'':'theme-'+theme,theme);
    await search.focus();
    const violations=await page.evaluate(async()=>{
      const result=await (window as any).axe.run({include:[['[data-anatomy-explorer-nav]'],['.anatomy-topbar']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});
      return result.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}));
    });
    scans.push({theme,violations});
    await page.screenshot({path:out+'/search-'+theme+'.png'});
  }
  await page.evaluate(()=>document.body.className='');
  await nav.getByRole('button',{name:'Clear anatomy search',exact:true}).click();
  await page.getByRole('button',{name:'Larger text',exact:true}).click();
  await page.setViewportSize({width:320,height:900});
  const readingSize=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  expect(readingSize.scroll).toBeLessThanOrEqual(322);
  await page.screenshot({path:out+'/reading-mode-320.png'});
  await writeFile(out+'/workspace-validation.json',JSON.stringify({initialModelTop,scans,sizes,readingSize,errors},null,2));
  expect(scans.flatMap(s=>s.violations)).toEqual([]);
  expect(errors).toEqual([]);
});
