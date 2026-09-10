import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1120,height:1800,appStyles:true});
test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());
test('Structure browser sorting, notes, density, frozen navigation and theme contrast',async({page})=>{
 test.setTimeout(240000);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:1400});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await harness.mount(page,{anatomy:{_bodyView3d:false,_activeTab:'explore',system:'skeletal',view:'anterior',complexity:3,_structuresViewed:{skull:true},_structureNotes:{skull:'Protection for the brain.',femur:'Supports the thigh.'},_structureConfidence:{skull:'mastered',ribs:'practice'},_confidenceAt:{skull:Date.now()}}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'#wrap{height:auto;min-height:100%;max-width:100%;}'});await mkdir('reports/anatomy-structure-browser',{recursive:true});
 const panel=page.locator('[data-anatomy-structure-list]');const rows=panel.locator('[data-anatomy-structure-option]');
 await panel.locator('#anatomy-browser-sort').selectOption('review');await expect(rows.first()).toHaveAttribute('data-anatomy-structure-option','ribs');
 await panel.locator('#anatomy-browser-sort').selectOption('name');const names=await rows.locator('.truncate').allTextContents();expect(names).toEqual([...names].sort((a,b)=>a.localeCompare(b)));
 await panel.getByRole('button',{name:'My notes',exact:true}).click();await expect(rows).toHaveCount(2);await expect(rows.first()).toHaveAttribute('data-anatomy-structure-option','femur');
 await expect(panel.locator('[data-anatomy-browser-filter=notes] .anatomy-browser-filter-count')).toHaveText('2');
 const comfortableHeight=(await rows.first().boundingBox())!.height;
 await panel.getByRole('button',{name:'Compact list',exact:true}).click();await expect(panel).toHaveAttribute('data-anatomy-list-density','compact');expect((await rows.first().boundingBox())!.height).toBeLessThan(comfortableHeight);
 await expect(rows.first().locator('.anatomy-browser-preview')).toBeHidden();await expect(rows.first().getByText('Note saved',{exact:true})).toBeVisible();
 await rows.first().focus();await page.keyboard.press('Enter');await expect(page.locator('[data-anatomy-structure-detail-heading]')).toHaveText('Femur');await expect(page.locator('.anatomy-detail-navigation')).toContainText('1 / 2');
 await page.locator('#anatomy-own-words-femur').fill('');await page.locator('[data-anatomy-browse=next]').click();await expect(page.locator('[data-anatomy-structure-detail-heading]')).toContainText('Skull');await expect(page.locator('[data-anatomy-browse=next]')).toBeDisabled();
 await page.getByRole('button',{name:/Back to structures from/}).click();await expect(panel).toHaveAttribute('data-anatomy-list-density','compact');await expect(rows).toHaveCount(1);await expect(panel.locator('#anatomy-browser-sort')).toHaveValue('name');
 await page.getByTitle('Increase text size and line spacing',{exact:true}).click();await expect(panel).toHaveAttribute('data-anatomy-list-density','comfortable');await expect(panel.getByRole('button',{name:'Compact list',exact:true})).toBeDisabled();
 await page.getByTitle('Use standard text size',{exact:true}).click();
 await panel.getByRole('button',{name:'All',exact:true}).click();await panel.getByRole('button',{name:'Compact list',exact:true}).click();await expect(panel).toHaveAttribute('data-anatomy-list-density','comfortable');
 await panel.screenshot({path:'reports/anatomy-structure-browser/browser-desktop.png'});
 await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});const scans:any[]=[];
 for(const theme of ['light','dark','contrast']){
  await page.evaluate(theme=>document.body.className=theme==='light'?'':'theme-'+theme,theme);
  const violations=await page.evaluate(async()=>{const r=await (window as any).axe.run(document.querySelector('[data-anatomy-structure-list]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}));});scans.push({theme,violations});
  if(theme==='dark')await panel.screenshot({path:'reports/anatomy-structure-browser/browser-dark.png'});
 }
 await writeFile('reports/anatomy-structure-browser/accessibility.json',JSON.stringify(scans,null,2));expect(scans.flatMap(s=>s.violations)).toEqual([]);
 await page.evaluate(()=>document.body.className='');await page.setViewportSize({width:390,height:844});await page.addStyleTag({content:'#wrap{width:100%;}'});
 await panel.screenshot({path:'reports/anatomy-structure-browser/browser-phone.png'});
 await panel.getByRole('button',{name:'My notes',exact:true}).click();await rows.first().click();await page.locator('#anatomy-own-words-skull').fill('');await page.getByRole('button',{name:/Back to structures from/}).click();await expect(panel).toContainText('No notes in this view yet.');
 await panel.getByRole('button',{name:'Show all structures',exact:true}).click();await expect(rows).toHaveCount(19);
 await page.setViewportSize({width:320,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(322);
 expect(errors).toEqual([]);await harness.destroy(page);
});
