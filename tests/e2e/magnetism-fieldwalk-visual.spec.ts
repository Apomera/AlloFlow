import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile:'stem_lab/stem_tool_magnetism.js', toolId:'magnetism', width:1080, height:1000, layout:'document', appStyles:true });
const artifacts=join(process.cwd(),'tmp','magnetism-fieldwalk-visual-20261101');
const before=process.env.MAG_WALK_STAGE==='before';
test.describe.configure({mode:'serial',timeout:120000,retries:0});
test.beforeAll(async()=>{await harness.start();await mkdir(artifacts,{recursive:true});});
test.afterAll(async()=>await harness.stop());
test.afterEach(async({page})=>await harness.destroy(page));
const seed={tab:'maze',mazeRound:0,mazePx:0,mazePy:7,mazeSteps:0,mazeTrail:[],mazeWon:false,mazeWins:0,learningMode:'guided',labShellPanel:'',notebookOpen:false,notebookTrials:[]};
for(const profile of [{name:'desktop',width:1080,theme:'dark'},{name:'phone',width:390,theme:'dark'},{name:'light',width:1080,theme:'light'},{name:'forced-colors',width:320,theme:'contrast'}]){
 test('Field Walk survey and compass correspondence · '+profile.name,async({page})=>{
  if(before&&profile.theme!=='dark')return;
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:profile.width,height:1000});
  await page.emulateMedia({reducedMotion:'reduce',forcedColors:profile.theme==='contrast'?'active':'none'});
  await harness.mount(page,{magnetism:seed},undefined,{expectCanvas:false});
  await page.locator('#wrap').evaluate((el,width)=>(el as HTMLElement).style.width=width+'px',profile.width);
  if(profile.theme!=='dark')await page.evaluate(theme=>{
   const palette=theme==='light'?{panel:'#f8fafc',deeper:'#e2e8f0',text:'#0f172a','text-soft':'#475569',border:'#cbd5e1'}:{panel:'#000000',deeper:'#000000',text:'#ffff00','text-soft':'#ffff00',border:'#ffff00'};
   const wrap=document.getElementById('wrap')!;wrap.setAttribute('data-stem-tool-shell','magnetism');document.body.classList.add('theme-'+theme);for(const[key,value]of Object.entries(palette))wrap.style.setProperty('--allo-stem-'+key,value);
  },profile.theme);
  const card=page.getByRole('region',{name:'Find the hidden magnet',exact:true});await expect(card).toBeVisible();
  await card.evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY-180));await page.screenshot({path:join(artifacts,(before?'before':'initial')+'-'+profile.name+'.png')});if(before)return;
  const workbench=card.locator('.mag-walk-workbench');await expect(workbench).toBeVisible();
  const state=()=>page.evaluate(()=>(window as any).__toolData.magnetism);
  const move=(direction:string)=>workbench.getByRole('button',{name:new RegExp('^Walk '+direction)});
  async function expectNeedle(){
   const needles=await workbench.locator('[data-walk-needle-angle]').evaluateAll(nodes=>nodes.map(n=>({angle:n.getAttribute('data-walk-needle-angle'),transform:n.getAttribute('transform')})));expect(needles).toHaveLength(2);expect(needles[0].angle).toBe(needles[1].angle);for(const needle of needles)expect(Number(needle.transform!.match(/rotate\(([-0-9.]+)\)/)![1])).toBe(Number(needle.angle));
   const current=await state();await expect(workbench.locator('.mag-walk-position')).toHaveText('Column '+(current.mazePx+1)+' · Row '+(current.mazePy+1));
  }
  await expectNeedle();await expect(workbench.locator('[data-maze-revealed]')).toHaveCount(0);await expect(workbench.locator('[data-maze-grid-label]')).toHaveCount(19);
  await move('up').click();expect((await state()).mazePy).toBe(6);await expect(card).toContainText('Aligned with the field');await expectNeedle();
  await move('down').click();await expect(card).toContainText('Cross-field move');await expect(card).toContainText('1 revisit recorded');
  await move('right').focus();await page.keyboard.press('Enter');expect((await state()).mazePx).toBe(1);
  await card.getByRole('button',{name:'↻ Restart this route',exact:true}).click();expect((await state()).mazeTrail).toEqual([]);expect((await state()).mazeSteps).toBe(0);
  for(let round=0;round<4;round++){
   expect((await state()).mazeRound).toBe(round);await expect(workbench.locator('[data-maze-revealed]')).toHaveCount(0);
   let moves=0;
   while(!(await state()).mazeWon&&moves<40){
    await workbench.getByRole('button',{name:/closest to the red needle direction/}).click();moves++;await expectNeedle();
    if(round===0&&moves===6){
     await expect(workbench.locator('[data-maze-trail]')).toHaveCount(1);
     await workbench.evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY-180));
     await workbench.screenshot({path:join(artifacts,profile.name==='desktop'?'fieldwalk-workbench.png':'workbench-'+profile.name+'.png')});
    }
   }
   expect((await state()).mazeWon).toBe(true);expect(moves).toBe([11,12,10,11][round]);await expect(workbench.locator('[data-maze-revealed]')).toHaveCount(1);
   await card.getByRole('button',{name:'▶ Next round',exact:true}).click();
  }
  expect((await state()).mazeWins).toBe(4);
  await page.evaluate(s=>(window as any).__mount({magnetism:{...s,learningMode:'challenge'}}),seed);
  await expect(workbench.getByRole('button',{name:/closest to the red needle direction/})).toHaveCount(0);await expect(workbench.locator('[data-maze-revealed]')).toHaveCount(0);await expect(card).toContainText('No path hint is shown');await expectNeedle();
  await move('up').click();await expectNeedle();
  const layout=await workbench.evaluate(el=>{const s=el.children[0].getBoundingClientRect(),c=el.children[1].getBoundingClientRect();return{viewport:innerWidth,document:document.documentElement.scrollWidth,scene:{left:s.left,top:s.top},controls:{left:c.left,top:c.top}};});expect(layout.document).toBeLessThanOrEqual(layout.viewport+1);if(profile.width>760)expect(layout.controls.left).toBeGreaterThan(layout.scene.left);else expect(layout.controls.top).toBeGreaterThan(layout.scene.top);
  if(profile.name==='desktop'){
   await page.addScriptTag({path:join(process.cwd(),'desktop/web-app/node_modules/axe-core/axe.min.js')});
   const violations=await workbench.evaluate(async el=>(await(window as any).axe.run(el,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map((v:any)=>({id:v.id,targets:v.nodes.map((n:any)=>n.target)})));await writeFile(join(artifacts,'axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);
  }
  if(profile.name==='forced-colors'){
   const colors=await workbench.locator('.mag-walk-bearing>svg text').first().evaluate(el=>{const probe=document.createElement('span');probe.style.color='CanvasText';document.body.appendChild(probe);const result={label:getComputedStyle(el).fill,system:getComputedStyle(probe).color};probe.remove();return result;});expect(colors.label).toBe(colors.system);await writeFile(join(artifacts,'forced-colors-labels.json'),JSON.stringify(colors,null,2));
  }
  await writeFile(join(artifacts,profile.name+'-layout.json'),JSON.stringify(layout,null,2));await page.screenshot({path:join(artifacts,'challenge-'+profile.name+'.png')});expect(errors).toEqual([]);
 });
}
