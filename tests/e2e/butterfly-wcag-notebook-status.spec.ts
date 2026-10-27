import {test,expect,type Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:90000,retries:0});test.use({viewport:{width:1280,height:1000},video:'off'});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
const twoRecords={observations:['milkweed','bergamot'],notebook:{claim:'needs-both',interpretation:'supports',evidence:['patch:milkweed','patch:bergamot'],reasoning:'Compare the two patches.'}};
const manyRecords={observations:['milkweed','bergamot','lawn'],lifecycle:{broods:[{patch:'milkweed',prediction:'complete',result:'complete'},{patch:'bergamot',prediction:'complete',result:'stalls'}]},season:{runs:[{patch:'milkweed',mowing:'never',prediction:'complete',result:'complete'},{patch:'milkweed',mowing:'early',prediction:'stop',result:'stop'},{patch:'milkweed',mowing:'mid',prediction:'stop',result:'stop'}]}};
async function mount(page:Page,saved:Record<string,unknown>){await page.emulateMedia({reducedMotion:'reduce'});await page.goto(harness.url+'/__harness');await page.evaluate(saved=>{const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated view'));w.__mount({butterfly:saved});Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});},saved);await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');}
async function observeStatus(page:Page){await page.evaluate(()=>{const w=window as any,node=document.querySelector('.bf-notebook-status')!;w.__notebookStatusChanges=[];w.__notebookStatusObserver=new MutationObserver(()=>w.__notebookStatusChanges.push(node.textContent));w.__notebookStatusObserver.observe(node,{subtree:true,childList:true,characterData:true});});}
const evidenceGroup=(page:Page)=>page.getByRole('group',{name:'3. Cite records from your investigation',exact:true});

test('completion is a contextual polite status that changes once while ordinary writing stays quiet',async({page})=>{
 await mount(page,{...twoRecords,notebook:{...twoRecords.notebook,reasoning:''}});const status=page.locator('.bf-notebook-status'),field=page.locator('#bf-notebook-reasoning');
 await expect(status).toHaveAttribute('role','status',{timeout:2500});await expect(status).toHaveAttribute('aria-live','polite');await expect(status).toHaveAttribute('aria-atomic','true');await expect(status).toHaveText('Notebook: Work in progress');
 await observeStatus(page);await field.fill('The milkweed has host leaves.');await expect(status).toHaveText('Notebook: Conclusion assembled');await expect(field).toBeFocused();
 await page.keyboard.press('End');await page.keyboard.type(' Compare the flowers.');await field.evaluate((node:HTMLTextAreaElement)=>node.setSelectionRange(4,19,'backward'));
 await expect(status).toHaveText('Notebook: Conclusion assembled');expect(await field.evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd,node.selectionDirection])).toEqual([4,19,'backward']);
 await page.locator('#bf-notebook-question').fill('Would later mowing help?');expect(await page.evaluate(()=>(window as any).__notebookStatusChanges)).toEqual(['Notebook: Conclusion assembled']);
 await field.fill('  \n  ');await expect(status).toHaveText('Notebook: Work in progress');await expect(field).toBeFocused();
 expect(await page.evaluate(()=>(window as any).__notebookStatusChanges)).toEqual(['Notebook: Conclusion assembled','Notebook: Work in progress']);
});

test('citation and interpretation changes announce readiness transitions without moving focus',async({page})=>{
 await mount(page,twoRecords);const status=page.locator('.bf-notebook-status'),citation=page.locator('[data-bf-citation="patch:bergamot"]'),interpretation=page.locator('#bf-notebook-interpretation');
 await observeStatus(page);await citation.focus();await page.keyboard.press('Space');await expect(status).toHaveText('Notebook: Work in progress',{timeout:2500});await expect(citation).toBeFocused();
 await expect(evidenceGroup(page)).toHaveAccessibleDescription(/1 of 8 citations selected\.$/);
 await page.keyboard.press('Space');await expect(status).toHaveText('Notebook: Conclusion assembled');await expect(citation).toBeFocused();
 await interpretation.focus();await interpretation.selectOption('');await expect(status).toHaveText('Notebook: Work in progress');await expect(interpretation).toBeFocused();
 await interpretation.selectOption('unsure');await expect(status).toHaveText('Notebook: Conclusion assembled');await expect(interpretation).toBeFocused();
 expect(await page.evaluate(()=>(window as any).__notebookStatusChanges)).toEqual(['Notebook: Work in progress','Notebook: Conclusion assembled','Notebook: Work in progress','Notebook: Conclusion assembled']);
});

test('the eight-citation limit explains disabled choices and restores keyboard access when space is freed',async({page})=>{
 await mount(page,manyRecords);const group=evidenceGroup(page),choices=group.locator('input[type="checkbox"]');expect(await choices.count()).toBeGreaterThan(8);
 await expect(group).toHaveAccessibleDescription(/0 of 8 citations selected\.$/,{timeout:2500});
 for(let index=0;index<8;index++){await choices.nth(index).focus();await page.keyboard.press('Space');await expect(choices.nth(index)).toBeChecked();}
 await expect(group).toHaveAccessibleDescription(/8 of 8 citations selected\. Uncheck a citation to choose another\.$/);await expect(page.locator('#bf-citation-count')).toHaveText('8 of 8 citations selected. Uncheck a citation to choose another.');
 await expect(choices.nth(7)).toBeFocused();await expect(choices.nth(8)).toBeDisabled();await page.keyboard.press('Tab');await expect(page.locator('#bf-notebook-reasoning')).toBeFocused();
 await choices.nth(7).focus();await page.keyboard.press('Space');await expect(group).toHaveAccessibleDescription(/7 of 8 citations selected\.$/);await expect(choices.nth(8)).toBeEnabled();
 await page.keyboard.press('Tab');await expect(choices.nth(8)).toBeFocused();await page.keyboard.press('Space');await expect(choices.nth(8)).toBeChecked();await expect(choices.nth(8)).toBeFocused();await expect(choices.nth(7)).toBeDisabled();
 await expect(group).toHaveAccessibleDescription(/8 of 8 citations selected\. Uncheck a citation to choose another\.$/);
});

test('unavailable citations count toward the limit and removal explains the newly available space',async({page})=>{
 const evidence=['patch:milkweed','patch:bergamot','patch:lawn','brood:milkweed','brood:bergamot','season:milkweed:never','season:milkweed:early','patch:restoration:flowers'];
 await mount(page,{...manyRecords,restoration:{design:'mixed',trials:[{design:'flowers',prediction:'nectar'}]},notebook:{claim:'needs-both',interpretation:'supports',evidence,reasoning:'Compare the earlier planting with the current meadow.'}});
 const group=evidenceGroup(page),available=group.locator('input:not(:checked)').first();await expect(available).toBeDisabled();
 await expect(group).toHaveAccessibleDescription(/8 of 8 citations selected\. Remove unavailable citations or uncheck a citation to choose another\.$/,{timeout:2500});
 const remove=group.getByRole('button',{name:'Remove unavailable citations',exact:true});await remove.focus();await page.keyboard.press('Enter');await expect(group).toBeFocused();await expect(available).toBeEnabled();await expect(remove).toHaveCount(0);
 await expect(group).toHaveAccessibleDescription(/7 of 8 citations selected\.$/);await expect(page.locator('.bf-notebook-status')).toHaveText('Notebook: Conclusion assembled');
 await expect(page.locator('#bf-notebook-reasoning')).toHaveValue('Compare the earlier planting with the current meadow.');
});

test('localized notebook status and citation counts remain readable with narrow text spacing',async({page})=>{
 await page.setViewportSize({width:320,height:900});await mount(page,twoRecords);await page.evaluate(()=>{const w=window as any,translations:Record<string,string>={'stem.butterfly.nb_status_context':'Cuaderno: ','stem.butterfly.nb_status_conclusion_assembled':'Conclusión preparada','stem.butterfly.nb_status_work_in_progress':'En progreso','stem.butterfly.nb_citation_count':'{value1} de 8 citas seleccionadas.'};w.__ctx.t=(key:string,fallback:string)=>translations[key]||fallback;w.__rerender();});
 const status=page.locator('.bf-notebook-status');await expect(status).toHaveText('Cuaderno: Conclusión preparada',{timeout:2500});await expect(evidenceGroup(page)).toHaveAccessibleDescription(/2 de 8 citas seleccionadas\.$/);
 await page.addStyleTag({content:'.bfl *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.bfl p{margin-bottom:2em!important}'});
 for(const node of [status,page.locator('#bf-citation-count')]){const box=(await node.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(321);expect(await node.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);}
 await page.locator('#bf-notebook-reasoning').fill('');await expect(status).toHaveText('Cuaderno: En progreso');await expect(page.locator('#bf-notebook-reasoning')).toBeFocused();
 const violations=await page.evaluate(async()=>{const result=await (window as any).axe.run(document.querySelector('.bf-notebook'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return result.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}));});expect(violations).toEqual([]);
});


test('completed mission items stay legible when the contrast theme uses forced colors',async({page})=>{
 await page.setViewportSize({width:375,height:900});await mount(page,{...manyRecords,restoration:{design:'mixed',trials:[{design:'mixed',prediction:'both'}]}});
 await page.evaluate(()=>{const w=window as any;w.__ctx.isDark=true;w.__ctx.isContrast=true;w.__rerender();});await page.emulateMedia({forcedColors:'active'});
 const item=page.locator('.bf-mission-checks li[data-done="true"]').first();await expect(item).toBeVisible();
 await page.locator('.bf-mission').screenshot({path:'scratch/butterfly-notebook-mission-forced-colors.png'});
 const colors=await item.evaluate(node=>{const probe=document.createElement('span');probe.style.color='CanvasText';document.body.appendChild(probe);const system=getComputedStyle(probe).color;probe.remove();return {text:getComputedStyle(node).color,system,adjust:getComputedStyle(node).forcedColorAdjust};});
 expect(colors.text).toBe(colors.system);
 const violations=await page.evaluate(async()=>{const result=await (window as any).axe.run(document.querySelector('.bf-mission'),{runOnly:{type:'rule',values:['color-contrast']}});return result.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}));});expect(violations).toEqual([]);
});
