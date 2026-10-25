import {test,expect,type Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:90000,retries:0});
test.use({viewport:{width:1280,height:1000},reducedMotion:'reduce',video:'off'});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:Page){
 await page.goto(harness.url+'/__harness');
 await page.evaluate(()=>{
  const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated fallback'));
  w.__mount({butterfly:{}});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 });
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');
}

test('a fresh egg-site field describes how to unlock its unavailable choices',async({page})=>{
 await mount(page);
 const field=page.getByRole('combobox',{name:'1. Choose where to lay eggs',exact:true});
 await field.focus();await expect(field).toBeFocused();
 await expect(field).toHaveAccessibleDescription('Only patches with recorded evidence are available. Examine a patch to unlock it.');
 await expect(field).toHaveValue('');
 expect(await field.locator('option:not([value=""])').evaluateAll(options=>options.length===4&&options.every(option=>(option as HTMLOptionElement).disabled))).toBe(true);
});

test('notebook fields expose current character limits without live keystroke announcements',async({page})=>{
 await mount(page);
 for(const item of [
  {id:'bf-notebook-reasoning',limit:1600},
  {id:'bf-notebook-question',limit:600}
 ]){
  const field=page.locator('#'+item.id),count=page.locator('#'+item.id+'-count');
  await expect(field).toHaveAttribute('maxlength',String(item.limit));
  await expect(field).toHaveAccessibleDescription(new RegExp('0 / '+item.limit+' characters'));
  if(item.id==='bf-notebook-reasoning')await expect(field).toHaveAccessibleDescription(/Try:.*When I compared/);
  await field.fill('x'.repeat(item.limit));await expect(field).toBeFocused();
  await expect(count).toHaveText(item.limit+' / '+item.limit+' characters');
  await expect(field).toHaveAccessibleDescription(new RegExp(item.limit+' / '+item.limit+' characters'));
  await page.keyboard.press('End');await page.keyboard.type('z');
  await expect(field).toHaveValue('x'.repeat(item.limit));await expect(field).toBeFocused();
  await page.keyboard.press('Backspace');
  await expect(field).toHaveValue('x'.repeat(item.limit-1));
  await expect(field).toHaveAccessibleDescription(new RegExp((item.limit-1)+' / '+item.limit+' characters'));
  expect(await count.evaluate(node=>node.closest('[aria-live="polite"],[aria-live="assertive"],[role="status"],[role="alert"]')!==null)).toBe(false);
 }
});
