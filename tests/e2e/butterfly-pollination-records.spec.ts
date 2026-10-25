import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,layout:'document',width:1280,height:1000});
const shots='scratch/butterfly-pollination-records';
test.describe.configure({timeout:180000});
test.use({viewport:{width:1280,height:1000},reducedMotion:'no-preference',video:'off'});
test.beforeAll(async()=>{mkdirSync(shots,{recursive:true});await harness.start();});
test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:any,saved:any={}){
 await page.goto(harness.url+'/__harness');await page.evaluate((saved:any)=>{
  const w=window as any;w.__mount({butterfly:saved});Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 },saved);
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','three');
}
async function openAt(page:any,name:string){
 await page.getByRole('button',{name:'Visit without flying · '+name,exact:true}).click();await page.getByRole('button',{name:'Land here',exact:true}).click();
 await page.getByRole('button',{name:'Watch feeding & pollination',exact:true}).click();
 await expect(page.getByRole('region',{name:'Feeding and pollination observation',exact:true})).toBeVisible();
}
async function still(page:any){
 const button=page.getByRole('button',{name:'Show step still',exact:true});await expect(button).toBeVisible();
 await button.evaluate((element:HTMLButtonElement)=>element.click());await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-feeding-progress','1.000');
}
async function visits(page:any){return page.evaluate(()=>(window as any).__toolData.butterfly.pollination?.visits||[]);}
async function record(page:any){
 const button=page.getByRole('button',{name:'Record this flower visit',exact:true});await expect(button).toBeEnabled();await button.click();
 await expect(page.getByRole('button',{name:'Visit recorded',exact:true})).toBeDisabled();
}
async function citeComparison(page:any,species:string){
 await page.getByRole('button',{name:'Use pollination evidence',exact:true}).click();
 const notebook=page.getByRole('region',{name:'Investigation notebook',exact:true});await expect(notebook).toBeFocused();
 await expect(notebook.locator('#bf-notebook-claim')).toHaveValue('feeding-always-pollinates');
 // Choosing a claim does not choose the student's citations or interpretation.
 await expect(notebook.locator('input[type="checkbox"]:checked')).toHaveCount(0);
 for(const contact of ['contact','miss'])await notebook.locator('[data-bf-citation="pollination:'+species+':'+contact+'"]').check();
 await notebook.locator('#bf-notebook-interpretation').selectOption('challenges');
 await notebook.locator('#bf-notebook-reasoning').fill('Both visits included nectar feeding, but the missed-contact visit left the pollen on the butterfly. Feeding alone did not transfer pollen in this model.');
 await expect(notebook.locator('[data-bf-notebook-ready]')).toHaveAttribute('data-bf-notebook-ready','true');
 return notebook;
}
async function audit(page:any){expect(await page.evaluate(async()=>{
 const result=await (window as any).axe.run(document.querySelector('[data-butterfly-root]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
 return result.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.failureSummary)}));
})).toEqual([]);}
function errorsOn(page:any){const errors:string[]=[];page.on('pageerror',(e:Error)=>errors.push(e.message));page.on('console',(m:any)=>{if(m.type()==='error'&&/shader|webglprogram|validate_status|three\./i.test(m.text()))errors.push(m.text());});return errors;}

test('explicit completed flower visits become distinct comparison evidence that survives remount and reporting',async({page})=>{
 const errors=errorsOn(page);await mount(page);await openAt(page,'Wild bergamot');await still(page);
 const stage=page.locator('.bf-stage'),clock=await stage.getAttribute('data-clock'),energy=await page.locator('meter').getAttribute('value');
 expect(await visits(page)).toEqual([]);await expect(page.getByRole('button',{name:'Record this flower visit',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Fly to next flower',exact:true}).click();await still(page);expect(await visits(page)).toEqual([]);
 await page.getByRole('button',{name:'Transfer pollen',exact:true}).click();await still(page);
 const progress=page.getByRole('slider',{name:'Visit progress',exact:true});await progress.focus();await progress.press('Home');
 await expect(stage).toHaveAttribute('data-bf-feeding-progress','0.000');await expect(page.getByRole('button',{name:'Record this flower visit',exact:true})).toBeDisabled();
 await progress.press('End');await expect(stage).toHaveAttribute('data-bf-feeding-progress','1.000');expect(await visits(page)).toEqual([]);
 await record(page);expect(await visits(page)).toEqual([expect.objectContaining({patch:'bergamot',species:'bergamot',contact:true})]);
 const comparison=page.getByRole('region',{name:'Pollination comparison',exact:true});
 await expect(comparison.locator('[data-bf-pollination-case="contact"]')).toHaveAttribute('data-recorded','true');
 await expect(comparison.locator('[data-bf-pollination-case="miss"]')).toHaveAttribute('data-recorded','false');
 await page.getByRole('button',{name:'Misses receptive surface',exact:true}).click();await record(page);
 await expect(comparison.locator('[data-bf-pollination-case="miss"]')).toHaveAttribute('data-recorded','true');
 await expect(comparison).toContainText(/both visits.*nectar/i);await expect(comparison).toContainText(/only contact.*pollen/i);
 await comparison.screenshot({path:shots+'/bergamot-recorded-comparison.png'});
 await page.getByRole('button',{name:'Touches receptive surface',exact:true}).click();await expect(page.getByRole('button',{name:'Visit recorded',exact:true})).toBeDisabled();
 // A replay of an already recorded case must not add a second copy.
 await page.getByRole('button',{name:'Replay feeding motion',exact:true}).click();await still(page);expect(await visits(page)).toHaveLength(2);
 expect(await stage.getAttribute('data-clock')).toBe(clock);expect(await page.locator('meter').getAttribute('value')).toBe(energy);
 await expect(page.getByRole('heading',{name:'0 of 3 patches investigated',exact:true})).toBeVisible();
 const notes=page.getByRole('region',{name:'Pollination field notes',exact:true});await expect(notes).toContainText('Wild bergamot');await expect(notes.locator('[data-bf-pollination-record]')).toHaveCount(2);
 for(const contact of ['contact','miss'])await expect(notes.locator('[data-bf-pollination-record="bergamot:'+contact+'"]')).toHaveAttribute('data-current','true');
 const notebook=await citeComparison(page,'bergamot');await notebook.screenshot({path:shots+'/pollination-notebook-desktop.png'});
 const saved=await page.evaluate(()=>(window as any).__toolData.butterfly);expect(saved.pollination.visits).toHaveLength(2);expect(saved.notebook.evidence).toEqual(['pollination:bergamot:contact','pollination:bergamot:miss']);
 await notebook.getByRole('button',{name:'Review my field report',exact:true}).click();const report=page.getByRole('region',{name:'Field report',exact:true});
 const text=await report.locator('[data-bf-report]').innerText();expect(text).toMatch(/VISITS[^\n]*\(2\)/);expect(text).toContain('Wild bergamot');expect(text).toMatch(/Missed contact/i);expect(text).toMatch(/pollen stayed on the butterfly/i);expect(text).toMatch(/model/i);expect(text).toMatch(/not fertilization|not.*seed|does not.*seed/i);
 await page.evaluate(()=>{(window as any).alloCopyText=(text:string)=>{(window as any).__copiedReport=text;return true;};});
 await report.getByRole('button',{name:'Copy my field report',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).__copiedReport)).toBe(text);
 await harness.destroy(page);await mount(page,saved);
 expect(await visits(page)).toEqual(saved.pollination.visits);await expect(notebook.locator('#bf-notebook-claim')).toHaveValue('feeding-always-pollinates');
 await expect(notebook.locator('input[type="checkbox"]:checked')).toHaveCount(2);await expect(notebook.locator('#bf-notebook-reasoning')).toHaveValue(saved.notebook.reasoning);
 await expect(report.locator('[data-bf-report]')).toHaveText(text);await openAt(page,'Wild bergamot');await still(page);
 await page.getByRole('button',{name:'Fly to next flower',exact:true}).click();await still(page);await page.getByRole('button',{name:'Transfer pollen',exact:true}).click();await still(page);
 await expect(page.getByRole('button',{name:'Visit recorded',exact:true})).toBeDisabled();await expect(comparison.locator('[data-recorded="true"]')).toHaveCount(2);expect(errors).toEqual([]);
});

test('mobile students can record milkweed contact comparisons in reduced-motion illustrated mode and cite them accessibly',async({page})=>{
 const errors=errorsOn(page);await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await mount(page);await openAt(page,'Common milkweed');
 await page.getByRole('button',{name:'Fly to next flower',exact:true}).click();await page.getByRole('button',{name:'Transfer pollen',exact:true}).click();
 const stage=page.locator('.bf-stage');await expect(stage).toHaveAttribute('data-bf-feeding-progress','1.000');expect(await visits(page)).toEqual([]);
 await page.locator('.bf-gl').evaluate((canvas:HTMLCanvasElement)=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
 await expect(stage).toHaveAttribute('data-bf-renderer','map');await expect(stage).toHaveAttribute('data-bf-feeding','deposit');
 await record(page);await page.getByRole('button',{name:'Misses receptive surface',exact:true}).click();await record(page);
 expect(await visits(page)).toEqual([expect.objectContaining({patch:'milkweed',species:'milkweed',contact:true}),expect.objectContaining({patch:'milkweed',species:'milkweed',contact:false})]);
 const comparison=page.getByRole('region',{name:'Pollination comparison',exact:true});await expect(comparison.locator('[data-recorded="true"]')).toHaveCount(2);await expect(comparison).toContainText(/both visits.*nectar/i);
 await stage.screenshot({path:shots+'/milkweed-recorded-map-mobile.png'});await comparison.screenshot({path:shots+'/milkweed-comparison-mobile.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);await audit(page);
 const notebook=await citeComparison(page,'milkweed');await notebook.screenshot({path:shots+'/pollination-notebook-mobile.png'});
 await page.evaluate(()=>{const w=window as any;w.__ctx.isDark=true;w.__ctx.isContrast=true;w.__rerender();});await audit(page);
 await comparison.screenshot({path:shots+'/milkweed-comparison-mobile-contrast.png'});
 await expect(notebook.locator('input[type="checkbox"]:checked')).toHaveCount(2);expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 await notebook.screenshot({path:shots+'/pollination-notebook-mobile-contrast.png'});expect(errors).toEqual([]);
});
