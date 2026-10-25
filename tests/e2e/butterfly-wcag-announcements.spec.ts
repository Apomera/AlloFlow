import {test,expect,type Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:90000,retries:0});
test.use({viewport:{width:1280,height:1000},video:'off'});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:Page){
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(harness.url+'/__harness');
 await page.evaluate(()=>{
  const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated fallback'));
  w.__mount({butterfly:{observations:['milkweed']}});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 });
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');
}
async function watchAnnouncements(page:Page){
 await page.evaluate(()=>{
  const w=window as any;w.__announcementObserver?.disconnect();w.__announced=[];
  w.__announcementObserver=new MutationObserver(records=>{
   const regions=new Set<Element>();
   for(const record of records){
    const target=record.target.nodeType===Node.ELEMENT_NODE?record.target as Element:record.target.parentElement;
    const region=target?.closest('[role="status"],[role="alert"],[aria-live="polite"],[aria-live="assertive"]');
    if(region&&!region.closest('[aria-live="off"],[aria-hidden="true"]'))regions.add(region);
   }
   for(const region of regions)w.__announced.push({region:region.className,text:region.textContent?.trim()});
  });
  w.__announcementObserver.observe(document.querySelector('[data-butterfly-root]'),{subtree:true,childList:true,characterData:true});
 });
}
async function expectOneAnnouncement(page:Page,feedbackSelector:string){
 const feedback=page.locator(feedbackSelector);await expect(feedback).not.toBeEmpty();
 const result=(await feedback.textContent())!.trim();
 await expect(page.locator('.bf-status')).toHaveText(result);
 const regions=await page.evaluate(text=>Array.from(new Set((window as any).__announced.filter((entry:any)=>entry.text===text).map((entry:any)=>entry.region))),result);
 expect(regions).toEqual(['bf-status']);
}

test('laying eggs exposes its result through one live region while retaining local feedback',async({page})=>{
 await mount(page);
 await page.locator('#bf-egg-site').selectOption('milkweed');
 await page.locator('#bf-brood-guess').selectOption('complete');
 await watchAnnouncements(page);
 await page.getByRole('button',{name:'Lay eggs here',exact:true}).click();
 await expectOneAnnouncement(page,'.bf-cycle-feedback');
});

test('season results announce once and remain readable beside the controls',async({page})=>{
 await mount(page);
 await page.locator('#bf-season-site').selectOption('milkweed');
 await page.locator('#bf-season-guess').selectOption('complete');
 await watchAnnouncements(page);
 await page.getByRole('button',{name:'Run the season',exact:true}).click();
 await expectOneAnnouncement(page,'.bf-season-feedback');
 expect(await page.evaluate(async()=>{
  const result=await (window as any).axe.run(document.querySelector('[data-butterfly-root]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
  return result.violations.map((entry:any)=>({id:entry.id,impact:entry.impact,nodes:entry.nodes.map((node:any)=>node.failureSummary)}));
 })).toEqual([]);
});

test('repeating an examination makes the same result available to the live region again',async({page})=>{
 await mount(page);
 await page.getByRole('button',{name:'Visit without flying · Common milkweed',exact:true}).click();
 await page.getByRole('button',{name:'Land here',exact:true}).click();
 const examine=page.getByRole('button',{name:'Examine patch',exact:true});
 await examine.focus();await page.keyboard.press('Enter');
 const firstResult=(await page.locator('.bf-status').textContent())!.trim();
 await watchAnnouncements(page);await page.keyboard.press('Enter');
 await expect(examine).toBeFocused();await expect(page.locator('.bf-status')).toHaveText(firstResult);
 await expect.poll(()=>page.evaluate(text=>(window as any).__announced.filter((entry:any)=>entry.region==='bf-status'&&entry.text===text).length,firstResult)).toBe(1);
});
