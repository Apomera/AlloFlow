import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1120,height:1600,appStyles:true});
test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());
test('Anatomy explorer responsive controls, structure browsing and accessible focus',async({page})=>{
 test.setTimeout(240000);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:1000});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await harness.mount(page,{anatomy:{_bodyView3d:false,_activeTab:'explore',system:'skeletal',view:'anterior',complexity:3,_structuresViewed:{skull:true},_structureNotes:{skull:'My skull note'},_structureConfidence:{skull:'practice'}}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'#wrap{height:auto;min-height:100%;max-width:100%;}'});await mkdir('reports/anatomy-explorer-visual',{recursive:true});
 const shell=page.locator('[data-anatomy-tool]');const nav=page.locator('[data-anatomy-explorer-nav]');
 await expect(nav).toBeVisible();await expect(page.locator('#anatomy-explorer-system')).toBeHidden();
 await page.screenshot({path:'reports/anatomy-explorer-visual/explorer-desktop.png'});
 const originalCanvasWidth=(await page.locator('.anatomy-canvas-frame').boundingBox())!.width;
 await page.locator('[data-anatomy-model-focus-toggle]').click();await expect(nav).toBeHidden();expect((await page.locator('.anatomy-canvas-frame').boundingBox())!.width).toBeGreaterThan(originalCanvasWidth+70);
 await page.locator('[data-anatomy-model-focus-toggle]').click();await expect(nav).toBeVisible();
 await nav.locator('[data-anatomy-jump=study]').click();await expect(page.locator('#anatomy-structure-list-title')).toBeFocused();
 await page.locator('[data-anatomy-structure-option=skull]').click();await expect(page.locator('[data-anatomy-browse=previous]')).toBeDisabled();
 await page.locator('[data-anatomy-browse=next]').click();await expect(page.locator('[data-anatomy-structure-detail-heading]')).toHaveText('Mandible');await expect(page.locator('[data-anatomy-structure-detail-heading]')).toBeFocused();
 await page.locator('[data-anatomy-browse=previous]').click();await expect(page.locator('[data-anatomy-structure-detail-heading]')).toContainText('Skull');
 const retained=await page.evaluate(()=>(window as any).__toolData.anatomy);expect(retained._structureNotes.skull).toBe('My skull note');expect(retained._structureConfidence.skull).toBe('practice');
 await expect.poll(async()=>{const a=await page.locator('.anatomy-detail-navigation').boundingBox();const b=await page.locator('.anatomy-tab-strip').boundingBox();return a!.y-(b!.y+b!.height);}).toBeGreaterThan(0);
 await page.setViewportSize({width:1280,height:1400});await page.locator('[data-anatomy-structure-detail]').screenshot({path:'reports/anatomy-explorer-visual/detail-desktop.png'});await page.setViewportSize({width:1280,height:1000});
 await page.getByRole('button',{name:'Show on atlas',exact:true}).click();await expect(page.locator('[data-anatomy-model-shell]')).toBeFocused();
 await nav.locator('[data-anatomy-jump=study]').click();await expect(page.locator('[data-anatomy-structure-detail-heading]')).toBeFocused();
 await page.getByRole('button',{name:/Back to structures from/}).click();await expect(page.locator('[data-anatomy-structure-option=skull]')).toBeFocused();
 const last=page.locator('[data-anatomy-structure-option]').last();await last.click();await expect(page.locator('[data-anatomy-browse=next]')).toBeDisabled();
 await page.setViewportSize({width:390,height:844});await page.addStyleTag({content:'#wrap{width:100%;}'});
 await expect(page.locator('#anatomy-explorer-system')).toBeVisible();await expect(page.locator('#anatomy-study-mode-info')).toBeHidden();await expect(page.locator('#anatomy-study-display')).toBeHidden();
 await expect(page.locator('#anatomy-global-search-input')).toBeVisible();
 const compactTop=await page.locator('[data-anatomy-model-shell]').evaluate(el=>el.getBoundingClientRect().top+window.scrollY);
 await nav.getByRole('button',{name:'More controls',exact:true}).click();await expect(page.locator('#anatomy-study-mode-info')).toBeVisible();await expect(page.locator('#anatomy-study-display')).toBeVisible();
 const expandedTop=await page.locator('[data-anatomy-model-shell]').evaluate(el=>el.getBoundingClientRect().top+window.scrollY);expect(expandedTop-compactTop).toBeGreaterThan(100);
 await nav.getByRole('button',{name:'Fewer controls',exact:true}).click();
 await page.locator('#anatomy-explorer-system').selectOption('muscular');expect(await page.evaluate(()=>(window as any).__toolData.anatomy.system)).toBe('muscular');
 await page.locator('#anatomy-explorer-system').selectOption('skeletal');
 await page.locator('#anatomy-global-search-input').fill('femur');await expect(page.locator('#anatomy-global-search-results')).toBeVisible();await page.locator('#anatomy-global-search-input').press('Enter');await expect(page.locator('[data-anatomy-structure-detail-heading]')).toHaveText('Femur');
 await page.locator('[data-anatomy-structure-detail]').screenshot({path:'reports/anatomy-explorer-visual/detail-phone.png'});
 await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});const scans:any[]=[];
 for(const theme of ['light','dark','contrast']){
  await page.evaluate(theme=>document.body.className=theme==='light'?'':'theme-'+theme,theme);
  const violations=await page.evaluate(async()=>{const r=await (window as any).axe.run({include:[['[data-anatomy-explorer-nav]'],['.anatomy-detail-navigation'],['.anatomy-structure-detail-header']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}));});scans.push({theme,violations});
  if(theme==='dark')await nav.screenshot({path:'reports/anatomy-explorer-visual/navigation-dark.png'});
 }
 await writeFile('reports/anatomy-explorer-visual/accessibility.json',JSON.stringify(scans,null,2));expect(scans.flatMap(s=>s.violations)).toEqual([]);
 await page.evaluate(()=>document.body.className='');
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:900});const sizes=await page.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:window.innerWidth}));expect(sizes.body,JSON.stringify(sizes)).toBeLessThanOrEqual(width+2);
 }
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:/Back to structures from/}).click();await shell.screenshot({path:'reports/anatomy-explorer-visual/explorer-phone.png'});
 await writeFile('reports/anatomy-explorer-visual/layout.json',JSON.stringify({compactTop,expandedTop,controlsHeightSaved:expandedTop-compactTop},null,2));expect(errors).toEqual([]);
 await harness.destroy(page);
});
