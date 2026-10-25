import {test,expect,type Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:90000});
test.use({viewport:{width:1280,height:1000},reducedMotion:'reduce',video:'off'});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:Page,butterfly:Record<string,unknown>){
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(harness.url+'/__harness');
 await page.evaluate(data=>{
  const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated fallback'));
  w.__mount({butterfly:data});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 },butterfly);
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');
}

test('manual report copying preserves the text selection, focus, and next tab stop',async({page})=>{
 await mount(page,{observations:['milkweed']});
 // Reproduce the supported embedded-host fallback without changing browser permissions.
 await page.evaluate(()=>{(window as any).alloCopyText=()=>Promise.resolve(false);});
 const report=page.getByRole('region',{name:'Field report',exact:true});
 const copy=report.getByRole('button',{name:'Copy my field report',exact:true});
 await copy.focus();await page.keyboard.press('Enter');
 await expect(report).toHaveAttribute('data-bf-report-copied','fail');
 const manual=report.getByRole('textbox',{name:'Field report text to copy manually',exact:true});
 await expect(manual).toBeVisible();
 await page.keyboard.press('Tab');await expect(report.locator('pre')).toBeFocused();
 await page.keyboard.press('Tab');await expect(manual).toBeFocused();
 const text=await manual.inputValue();expect(text).toContain('Common milkweed');
 expect(await manual.evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd])).toEqual([0,text.length]);
 await page.keyboard.press('Control+c');
 await expect(report).toHaveAttribute('data-bf-report-copied','ok');
 await expect(manual).toBeFocused();await expect(manual).toBeInViewport();
 await expect(manual).toHaveValue(text);
 expect(await manual.evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd])).toEqual([0,text.length]);
 await expect(page.locator('.bf-status[role="status"]')).toContainText('Field report copied.');
 await expect(report.getByRole('button',{name:'✓ Report copied',exact:true})).toBeEnabled();
 await page.keyboard.press('Tab');
 await expect(report.getByRole('button',{name:'Back to investigation guide',exact:true})).toBeFocused();
});

for(const keepCurrentRecord of [true,false]){
 test('removing stale citations continues in the evidence group '+(keepCurrentRecord?'with a current record':'with no current records'),async({page})=>{
  // A saved notebook can cite an earlier restoration planting after the plot changes.
  await mount(page,{
   observations:keepCurrentRecord?['milkweed']:[],
   restoration:{design:'mixed',trials:[{design:'flowers',prediction:'nectar'}]},
   notebook:{evidence:keepCurrentRecord?['patch:milkweed','patch:restoration:flowers']:['patch:restoration:flowers']}
  });
  const notebook=page.getByRole('region',{name:'Investigation notebook',exact:true});
  const evidence=notebook.getByRole('group',{name:'3. Cite records from your investigation',exact:true});
  const remove=evidence.getByRole('button',{name:'Remove unavailable citations',exact:true});
  await expect(remove).toBeEnabled();await remove.focus();await expect(remove).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(remove).toHaveCount(0);await expect(evidence).toBeFocused();await expect(evidence).toBeInViewport();
  await expect(evidence).toHaveAttribute('tabindex','-1');
  await page.keyboard.press('Tab');
  if(keepCurrentRecord){
   const current=evidence.locator('[data-bf-citation="patch:milkweed"]');
   await expect(current).toBeFocused();await expect(current).toBeChecked();
   await page.keyboard.press('Tab');
  }
  await expect(notebook.getByRole('textbox',{name:'4. How does the evidence connect to your claim?',exact:true})).toBeFocused();
  // Cleaning a citation must retain the earlier model result in the exported record.
  await expect(page.locator('[data-bf-report="1"]')).toContainText('Bergamot only');
 });
}

for(const closeUp of [false,true]){
 test('terminal lifecycle actions retain keyboard focus in '+(closeUp?'the close-up':'the investigation'),async({page})=>{
  await mount(page,{observations:['milkweed']});
  const cycle=page.getByRole('region',{name:'Life cycle investigation',exact:true});
  await cycle.getByRole('combobox',{name:/Choose where to lay eggs/}).selectOption('milkweed');
  await cycle.getByRole('combobox',{name:/Predict how far it gets/}).selectOption('complete');
  await cycle.getByRole('button',{name:'Lay eggs here',exact:true}).click();
  const scope=closeUp?page.getByRole('region',{name:'Life cycle observation',exact:true}):cycle;
  const next=scope.getByRole('button',{name:closeUp?'Watch next stage':'Next stage',exact:true});
  const record=scope.getByRole('button',{name:closeUp?'Record this generation':'Record result',exact:true});
  await next.focus();
  for(let step=0;step<3;step++){
   await expect(next).toBeEnabled();await expect(next).toBeFocused();await page.keyboard.press('Enter');
   await expect(cycle).toHaveAttribute('data-bf-cycle-stage',['caterpillar','chrysalis','adult'][step]);
   if(step<2)await expect(next).toBeFocused();
  }
  await expect(next).toBeDisabled();await expect(record).toBeFocused();await expect(record).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(record).toBeDisabled();await expect(scope).toBeFocused();await expect(scope).toBeInViewport();
  await expect(cycle.locator('.bf-broods')).toContainText('Reaches the adult stage');
  await page.keyboard.press('Tab');
  await expect(scope.getByRole('button',{name:closeUp?'Plant context':'Watch on plant',exact:true})).toBeFocused();
 });
}

test('restarting a generation returns keyboard focus to its available setup controls',async({page})=>{
 await mount(page,{observations:['milkweed']});
 const cycle=page.getByRole('region',{name:'Life cycle investigation',exact:true});
 const site=cycle.getByRole('combobox',{name:/Choose where to lay eggs/});
 const prediction=cycle.getByRole('combobox',{name:/Predict how far it gets/});
 await site.selectOption('milkweed');await prediction.selectOption('complete');
 await cycle.getByRole('button',{name:'Lay eggs here',exact:true}).click();
 const restart=cycle.getByRole('button',{name:'Start over',exact:true});
 await restart.focus();await page.keyboard.press('Enter');
 await expect(restart).toBeDisabled();await expect(site).toBeEnabled();await expect(site).toBeFocused();await expect(site).toBeInViewport();
 await expect(site).toHaveValue('');await page.keyboard.press('Tab');await expect(prediction).toBeFocused();
 // A pointer action should not request this keyboard focus transfer.
 await site.selectOption('milkweed');await prediction.selectOption('complete');
 await cycle.getByRole('button',{name:'Lay eggs here',exact:true}).click();
 await restart.click();await expect(restart).toBeDisabled();await expect(site).not.toBeFocused();
});
