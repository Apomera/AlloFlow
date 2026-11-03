import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({toolFile:'stem_lab/stem_tool_magnetism.js',toolId:'magnetism',width:1080,height:1000,layout:'document',appStyles:true});
const artifacts=join(process.cwd(),'tmp','magnetism-crane-visual-20261031');
const before=process.env.MAG_CRANE_STAGE==='before';
test.describe.configure({mode:'serial',timeout:120000,retries:0});
test.beforeAll(async()=>{await harness.start();await mkdir(artifacts,{recursive:true});});
test.afterAll(async()=>await harness.stop());
test.afterEach(async({page})=>await harness.destroy(page));
for(const profile of [{name:'desktop',width:1080,theme:'dark'},{name:'phone',width:390,theme:'dark'},{name:'light',width:1080,theme:'light'},{name:'forced-colors',width:320,theme:'contrast'}]){
 test('crane visual workbench and prediction cycle · '+profile.name,async({page})=>{
  if(before&&profile.theme!=='dark')return;
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:profile.width,height:1000});
  await page.emulateMedia({reducedMotion:'reduce',forcedColors:profile.theme==='contrast'?'active':'none'});
  await harness.mount(page,{magnetism:{tab:'crane',craneSlot:0,cranePower:false,craneHolding:null,cranePredictions:{},craneTests:{},craneDeposited:{},craneDone:false,craneMsg:'',craneItems:{0:'nail',1:'foil',2:'clip',3:'penny',4:'nickel',5:'ruler',6:'cobalt',7:'pencil'},labShellPanel:'',notebookOpen:false,notebookTrials:[],learningMode:'guided'}},undefined,{expectCanvas:false});
  await page.locator('#wrap').evaluate((element,width)=>(element as HTMLElement).style.width=width+'px',profile.width);
  if(profile.theme!=='dark')await page.evaluate(theme=>{
   const palette=theme==='light'?{panel:'#f8fafc',deeper:'#e2e8f0',text:'#0f172a','text-soft':'#475569',border:'#cbd5e1'}:{panel:'#000000',deeper:'#000000',text:'#ffff00','text-soft':'#ffff00',border:'#ffff00'};
   const wrap=document.getElementById('wrap')!;wrap.setAttribute('data-stem-tool-shell','magnetism');document.body.classList.add('theme-'+theme);for(const [key,value]of Object.entries(palette))wrap.style.setProperty('--allo-stem-'+key,value);
  },profile.theme);
  const card=page.getByRole('region',{name:'Junkyard challenge: recycle the steel',exact:true});
  await expect(card).toBeVisible();
  await card.evaluate(element=>window.scrollTo(0,element.getBoundingClientRect().top+scrollY-180));
  await page.screenshot({path:join(artifacts,(before?'before':'initial')+'-'+profile.name+'.png')});
  if(before)return;
  const workbench=card.locator('.mag-crane-workbench');await expect(workbench).toBeVisible();
  const state=()=>page.evaluate(()=>(window as any).__toolData.magnetism);
  const on=()=>workbench.getByRole('button',{name:'⚡ Power ON',exact:true});const off=()=>workbench.getByRole('button',{name:'⚡ Power OFF',exact:true});
  const left=workbench.getByRole('button',{name:'Move crane left',exact:true});const right=workbench.getByRole('button',{name:'Move crane right',exact:true});
  await expect(on()).toBeDisabled();await expect(left).toBeDisabled();
  await expect(workbench.locator('[data-crane-live]')).toContainText('Field off');
  await workbench.getByRole('button',{name:'— No pull',exact:true}).click();await expect(on()).toBeEnabled();await on().click();
  expect((await state()).craneHolding).toBe('nail');await expect(workbench.locator('[data-crane-live]')).toContainText('Carrying');
  await expect(workbench.locator('[data-crane-held]')).toHaveCount(1);await expect(workbench.locator('.mag-crane-field-line')).toHaveCount(3);
  for(let n=0;n<8;n++)await right.click();expect((await state()).craneSlot).toBe(8);await expect(right).toBeDisabled();
  await off().click();expect((await state()).craneDeposited.nail).toBeTruthy();await expect(workbench.locator('[data-crane-bin-count]')).toHaveText('1 / 4');
  for(let n=0;n<7;n++)await left.click();expect((await state()).craneSlot).toBe(1);
  await workbench.getByRole('button',{name:'🧲 Will lift',exact:true}).click();await on().click();expect((await state()).craneHolding).toBeNull();await expect(right).toBeDisabled();await expect(left).toBeDisabled();await expect(workbench.locator('[data-crane-live]')).toContainText('No pull');
  await off().click();expect((await state()).craneTests.foil.lifted).toBe(false);await expect(card.locator('.mag-crane-tile[data-state="revised"]')).toHaveCount(1);await expect(card.locator('.mag-crane-tile[data-state="recycled"]')).toContainText('prediction revised');
  await right.focus();await page.keyboard.press('Enter');expect((await state()).craneSlot).toBe(2);
  for(const [slot,id,lift]of [[2,'clip',true],[3,'penny',false],[4,'nickel',true],[5,'ruler',false],[7,'pencil',false],[6,'cobalt',true]] as const){
   while((await state()).craneSlot>slot)await left.click();while((await state()).craneSlot<slot)await right.click();
   await workbench.getByRole('button',{name:lift?'🧲 Will lift':'— No pull',exact:true}).click();await on().click();
   expect((await state()).craneTests[id].lifted).toBe(lift);
   if(lift)while((await state()).craneSlot<8)await right.click();await off().click();
  }
  expect((await state()).craneDone).toBe(true);expect(Object.keys((await state()).craneDeposited)).toHaveLength(4);
  await expect(workbench.getByRole('button',{name:'↻ Reset yard & evidence',exact:true})).toBeVisible();
  await workbench.getByRole('button',{name:'↻ Reset yard & evidence',exact:true}).click();expect((await state()).craneTests).toEqual({});expect((await state()).craneSlot).toBe(0);expect((await state()).craneDone).toBe(false);await expect(on()).toBeDisabled();
  const layout=await workbench.evaluate(element=>{const s=element.children[0].getBoundingClientRect(),c=element.children[1].getBoundingClientRect();return{viewport:innerWidth,document:document.documentElement.scrollWidth,scene:{left:s.left,top:s.top,width:s.width},controls:{left:c.left,top:c.top}};});
  expect(layout.document).toBeLessThanOrEqual(layout.viewport+1);if(profile.width>760)expect(layout.controls.left).toBeGreaterThan(layout.scene.left);else expect(layout.controls.top).toBeGreaterThan(layout.scene.top);
  if(profile.name==='desktop'){
   await page.addScriptTag({path:join(process.cwd(),'desktop/web-app/node_modules/axe-core/axe.min.js')});const violations=await workbench.evaluate(async element=>(await(window as any).axe.run(element,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map((v:any)=>({id:v.id,targets:v.nodes.map((n:any)=>n.target)})));await writeFile(join(artifacts,'axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);
   await workbench.evaluate(element=>window.scrollTo(0,element.getBoundingClientRect().top+scrollY-180));await workbench.screenshot({path:join(artifacts,'crane-workbench.png')});
  }
  await page.screenshot({path:join(artifacts,'final-'+profile.name+'.png'),fullPage:true});await writeFile(join(artifacts,profile.name+'-layout.json'),JSON.stringify(layout,null,2));expect(errors).toEqual([]);
 });
}
