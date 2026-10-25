import {test,expect,type Locator,type Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:180000,retries:0});
test.use({viewport:{width:1280,height:1000},reducedMotion:'reduce',video:'off'});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));
const species=[
 {id:'monarch',name:'Monarch',latin:'Danaus plexippus'},
 {id:'tiger-swallowtail',name:'Eastern tiger swallowtail',latin:'Papilio glaucus'},
 {id:'painted-lady',name:'Painted lady',latin:'Vanessa cardui'},
 {id:'cabbage-white',name:'Cabbage white',latin:'Pieris rapae'}
];
async function mount(page:Page){
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(harness.url+'/__harness');
 expect(await page.evaluate(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
 await page.evaluate(()=>{
  (window as any).__mount({butterfly:{}});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 });
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','three',{timeout:90000});
 await page.getByRole('button',{name:'Watch pollinators',exact:true}).click();
 await expect(page.getByRole('group',{name:'Pollinator watching',exact:true})).toBeVisible();
}
async function enter(page:Page,command:Locator){await command.focus();await page.keyboard.press('Enter');await expect(command).toBeFocused();}
async function watchAnnouncements(page:Page){
 await page.evaluate(()=>{
  const w=window as any;w.__speciesObserver?.disconnect();w.__speciesAnnouncements=[];
  w.__speciesObserver=new MutationObserver(records=>{
   const regions=new Set<Element>();
   for(const record of records){
    const target=record.target.nodeType===Node.ELEMENT_NODE?record.target as Element:record.target.parentElement;
    const region=target?.closest('[role="status"],[role="alert"],[aria-live="polite"],[aria-live="assertive"]');
    if(region&&!region.closest('[aria-live="off"],[aria-hidden="true"]'))regions.add(region);
   }
   for(const region of regions)w.__speciesAnnouncements.push({region:region.className,text:region.textContent?.trim()});
  });
  w.__speciesObserver.observe(document.querySelector('.bfl'),{subtree:true,childList:true,characterData:true});
 });
}

test('all species expose both visible names and a named field-note region through keyboard selection',async({page})=>{
 await mount(page);const picker=page.getByRole('group',{name:'Butterfly species',exact:true}),stage=page.locator('.bf-stage');
 const before=await page.evaluate(()=>JSON.stringify((window as any).__toolData));
 const clock=await stage.getAttribute('data-bf-meadow-clock');
 for(const item of species){
  const command=picker.getByRole('button').filter({hasText:item.latin});
  await expect(command).toHaveAccessibleName(item.name+' '+item.latin,{timeout:2500});
  await enter(page,command);await expect(command).toHaveAttribute('aria-pressed','true');
  await expect(stage).toHaveAttribute('data-bf-watching-species',item.id);
  const notes=page.getByRole('region',{name:item.name+' · '+item.latin,exact:true});
  await expect(notes).toBeVisible();await expect(notes).toHaveAttribute('data-bf-species-card',item.id);
  await expect(notes).toContainText('Caterpillar food:');await expect(notes.getByRole('link',{name:'Species field guide',exact:true})).toHaveAttribute('href',/^https:\/\//);
  expect(await stage.getAttribute('data-bf-meadow-clock')).toBe(clock);
 }
 await page.keyboard.press('Tab');
 await expect(page.getByRole('region',{name:'Cabbage white · Pieris rapae',exact:true}).getByRole('link',{name:'Species field guide',exact:true})).toBeFocused();
 expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData))).toBe(before);
 // Longer, complete button names must remain usable with enlarged text at 320px.
 await page.setViewportSize({width:320,height:900});
 await page.addStyleTag({content:'.bfl *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.bfl p{margin-bottom:2em!important}'});
 for(const command of await picker.getByRole('button').all()){
  await command.scrollIntoViewIfNeeded();const box=(await command.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(-.5);expect(box.x+box.width).toBeLessThanOrEqual(320.5);expect(box.height).toBeGreaterThanOrEqual(44);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('species and patch changes announce the actual watched visitor once without resuming a paused meadow',async({page})=>{
 await mount(page);await page.getByRole('button',{name:'Pause all motion',exact:true}).click();
 const stage=page.locator('.bf-stage'),clock=await stage.getAttribute('data-bf-meadow-clock');
 const picker=page.getByRole('group',{name:'Butterfly species',exact:true}),watcher=page.getByRole('group',{name:'Pollinator watching',exact:true});
 const actions=[
  {command:picker.getByRole('button').filter({hasText:'Pieris rapae'}),name:'Cabbage white',site:'Common milkweed',id:'cabbage-white',patch:'milkweed'},
  {command:watcher.getByRole('button',{name:'Bergamot visitors',exact:true}),name:'Monarch',site:'Wild bergamot',id:'monarch',patch:'bergamot'},
  {command:watcher.getByRole('button',{name:'Milkweed visitors',exact:true}),name:'Eastern tiger swallowtail',site:'Common milkweed',id:'tiger-swallowtail',patch:'milkweed'}
 ];
 for(const action of actions){
  await watchAnnouncements(page);await enter(page,action.command);
  const text='Watching '+action.name+' at '+action.site+'.';
  await expect(page.locator('.bf-status')).toHaveText(text,{timeout:2500});
  await expect(stage).toHaveAttribute('data-bf-watching-species',action.id);await expect(stage).toHaveAttribute('data-bf-watch-patch',action.patch);
  await expect(watcher.getByRole('button',{name:action.patch==='milkweed'?'Milkweed visitors':'Bergamot visitors',exact:true})).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>(window as any).__speciesAnnouncements)).toEqual([{region:'bf-status',text}]);
  await expect(stage).toHaveAttribute('data-bf-motion-paused','true');expect(await stage.getAttribute('data-bf-meadow-clock')).toBe(clock);
 }
 await page.waitForTimeout(150);
 expect(await page.evaluate(()=>(window as any).__speciesAnnouncements)).toHaveLength(1);
 const violations=await page.evaluate(async()=>{
  const result=await (window as any).axe.run(document.querySelector('.bf-watch-panel'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
  return result.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.failureSummary)}));
 });
 expect(violations).toEqual([]);
});
