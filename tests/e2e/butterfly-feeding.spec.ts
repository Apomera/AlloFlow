import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,layout:'document',width:1280,height:1000});
const shots='scratch/butterfly-pollination';
test.describe.configure({timeout:180000});test.use({viewport:{width:1280,height:1000},reducedMotion:'no-preference',video:'off'});
test.beforeAll(async()=>{mkdirSync(shots,{recursive:true});await harness.start();});
test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:any,saved:any={}){
 await page.goto(harness.url+'/__harness');await page.evaluate((saved:any)=>{
  const w=window as any;w.__mount({butterfly:saved});Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 },saved);
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','three');
 await page.evaluate(()=>{const w=window as any,original=w.THREE.Scene.prototype.onAfterRender;w.THREE.Scene.prototype.onAfterRender=function(renderer:any,scene:any,camera:any){if(this.getObjectByName('feeding-observation')){w.__feedingScene=this;w.__feedingRenderer=renderer;w.__feedingCamera=camera;}return original.call(this,renderer,scene,camera);};});
 await page.getByRole('button',{name:'Map',exact:true}).click();await page.getByRole('button',{name:'Map',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__feedingScene)).toBe(true);
}
async function landAt(page:any,name:string){
 await page.getByRole('button',{name:'Visit without flying · '+name,exact:true}).click();await page.getByRole('button',{name:'Land here',exact:true}).click();
}
async function openFeeding(page:any){
 await page.getByRole('button',{name:'Watch feeding & pollination',exact:true}).click();await expect(page.getByRole('region',{name:'Feeding and pollination observation',exact:true})).toBeVisible();
}
async function still(page:any){
 // The bounded animation may finish while a slow software renderer scrolls the
 // control into view. A native click is harmless once this button is disabled.
 const button=page.getByRole('button',{name:'Show step still',exact:true});await expect(button).toBeVisible();await button.evaluate((button:HTMLButtonElement)=>button.click());
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-feeding-progress','1.000');
}
async function phase3d(page:any,phase:string){
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-feeding',phase);
 const view=await page.evaluate((phase:string)=>{
  const w=window as any,T=w.THREE,root=w.__feedingScene.getObjectByName('feeding-observation'),monarch=root.getObjectByName('feeding-monarch'),center=new T.Box3().setFromObject(monarch).getCenter(new T.Vector3()).project(w.__feedingCamera);
  const names=['feeding-proboscis','feeding-pollen-carried','feeding-pollen-deposited','feeding-nectar'];
  const pieces=Object.fromEntries(names.map(name=>{const o=root.getObjectByName(name);let visible=!!o;for(let p=o;p;p=p.parent)visible=visible&&p.visible;return [name,{exists:!!o,visible}];}));
  return {visible:root.visible&&monarch.visible,phase:root.userData.phase,center:center.toArray(),pieces};
 },phase);
 expect(view.visible).toBe(true);expect(view.phase).toBe(phase);expect(Math.abs(view.center[0])).toBeLessThan(1);expect(Math.abs(view.center[1])).toBeLessThan(1);expect(view.center[2]).toBeGreaterThan(-1);expect(view.center[2]).toBeLessThan(1);
 for(const piece of Object.values(view.pieces) as any[])expect(piece.exists).toBe(true);
 if(phase==='sip')expect(view.pieces['feeding-proboscis'].visible).toBe(true);
 if(phase==='carry')expect(view.pieces['feeding-pollen-carried'].visible).toBe(true);
 if(phase==='deposit')expect(view.pieces['feeding-pollen-deposited'].visible).toBe(true);
}
async function audit(page:any){expect(await page.evaluate(async()=>{
 const r=await (window as any).axe.run(document.querySelector('[data-butterfly-root]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
 return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.failureSummary)}));
})).toEqual([]);}
function errorsOn(page:any){const errors:string[]=[];page.on('pageerror',(e:Error)=>errors.push(e.message));page.on('console',(m:any)=>{if(m.type()==='error'&&/shader|webglprogram|validate_status|three\./i.test(m.text()))errors.push(m.text());});return errors;}

test('a monarch visibly sips, carries pollen and deposits it at another flower without automatic evidence',async({page})=>{
 const errors=errorsOn(page);await mount(page);await expect(page.getByRole('button',{name:'Watch feeding & pollination',exact:true})).toBeDisabled();const stage=page.locator('.bf-stage');
 // Spend a little energy first so an unintended refill cannot pass at 100%.
 await page.getByRole('button',{name:'Take flight',exact:true}).click();await stage.focus();await page.keyboard.down('ArrowUp');await expect.poll(async()=>Number(await page.locator('meter').getAttribute('value'))).toBeLessThan(100);await page.keyboard.up('ArrowUp');await page.keyboard.press('Space');
 await landAt(page,'Wild bergamot');const saved=await page.evaluate(()=>(window as any).__toolData.butterfly),position=await stage.getAttribute('data-position'),clock=await stage.getAttribute('data-clock'),energy=await page.locator('meter').getAttribute('value');expect(Number(energy)).toBeLessThan(100);
 await page.locator('.bf-gl').evaluate((canvas:any)=>canvas.__feedingIdentity=true);await openFeeding(page);await still(page);await phase3d(page,'sip');
 await expect(page.getByRole('region',{name:'Feeding and pollination observation',exact:true})).toContainText(/nectar/i);await expect(page.getByRole('button',{name:'Examine patch',exact:true})).toBeDisabled();await stage.screenshot({path:shots+'/nectar-sipping.png'});
 await page.getByRole('button',{name:'Replay feeding motion',exact:true}).click();await stage.focus();await page.keyboard.press('Space');
 await expect(page.getByRole('button',{name:'Pause feeding motion',exact:true})).toBeDisabled();const progress=await stage.getAttribute('data-bf-feeding-progress'),frame=await page.evaluate(()=>(window as any).__feedingRenderer.info.render.frame);
 await page.waitForTimeout(300);expect(await stage.getAttribute('data-bf-feeding-progress')).toBe(progress);expect(await page.evaluate(()=>(window as any).__feedingRenderer.info.render.frame)).toBe(frame);await still(page);
 await page.getByRole('button',{name:'Fly to next flower',exact:true}).click();await still(page);await phase3d(page,'carry');await stage.screenshot({path:shots+'/pollen-carried.png'});
 await page.getByRole('button',{name:'Transfer pollen',exact:true}).click();await still(page);await phase3d(page,'deposit');await stage.screenshot({path:shots+'/pollen-transfer.png'});
 expect(await stage.getAttribute('data-position')).toBe(position);expect(await stage.getAttribute('data-clock')).toBe(clock);expect(await page.locator('meter').getAttribute('value')).toBe(energy);
 expect(await page.evaluate(()=>(window as any).__toolData.butterfly)).toEqual(saved);await expect(page.getByRole('heading',{name:'0 of 3 patches investigated',exact:true})).toBeVisible();await expect(page.locator('.bf-gl')).toHaveJSProperty('__feedingIdentity',true);
 await page.getByRole('button',{name:'Restart flower visit',exact:true}).click();await still(page);await phase3d(page,'sip');expect(await page.evaluate(()=>(window as any).__toolData.butterfly)).toEqual(saved);
 await page.getByRole('button',{name:'Return to habitat view',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-feeding','');await expect(page.getByRole('button',{name:'Examine patch',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Examine patch',exact:true}).click();expect(await page.evaluate(()=>(window as any).__toolData.butterfly.observations)).toEqual(['bergamot']);await audit(page);expect(errors).toEqual([]);
});

test('milkweed packets, mixed-plot flowers and mown ground keep feeding tied to the current habitat',async({page})=>{
 const errors=errorsOn(page);await mount(page,{observations:['milkweed'],restoration:{design:'mixed',prediction:'both',trials:[]}});const stage=page.locator('.bf-stage');
 await landAt(page,'Common milkweed');await openFeeding(page);await still(page);await phase3d(page,'sip');await expect(page.getByRole('region',{name:'Feeding and pollination observation',exact:true})).toContainText(/packet|pollini/i);await stage.screenshot({path:shots+'/milkweed-feeding.png'});
 const cycle=page.getByRole('region',{name:'Life cycle investigation',exact:true});await cycle.getByRole('combobox',{name:/Choose where to lay eggs/}).selectOption('milkweed');await cycle.getByRole('combobox',{name:/Predict how far it gets/}).selectOption('complete');await cycle.getByRole('button',{name:'Lay eggs here',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-feeding','');await expect(stage).toHaveAttribute('data-bf-life-watch','true');await page.getByRole('button',{name:'Return to flight view',exact:true}).click();
 await landAt(page,'Restoration plot');const before=await page.evaluate(()=>(window as any).__toolData.butterfly);await openFeeding(page);await still(page);await phase3d(page,'sip');await expect(page.getByRole('region',{name:'Feeding and pollination observation',exact:true})).toContainText(/bergamot/i);
 await page.getByRole('button',{name:'Fly to next flower',exact:true}).click();await still(page);await page.getByRole('button',{name:'Transfer pollen',exact:true}).click();await still(page);await phase3d(page,'deposit');await stage.screenshot({path:shots+'/mixed-plot-pollination.png'});
 expect(await page.evaluate(()=>(window as any).__toolData.butterfly)).toEqual(before);await expect(page.locator('[data-design-record="mixed"]')).toContainText('Not examined');
 const design=page.getByRole('region',{name:'Habitat design activity',exact:true});await design.getByRole('button',{name:/^Keep it mown/}).click();await design.getByRole('combobox',{name:/Predict the resources/}).selectOption('neither');await design.getByRole('button',{name:'Apply habitat plan',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-feeding','');expect(await page.evaluate(()=>(window as any).__feedingScene.getObjectByName('feeding-observation').visible)).toBe(false);await page.getByRole('button',{name:'Land here',exact:true}).click();await expect(page.getByRole('button',{name:'Watch feeding & pollination',exact:true})).toBeDisabled();
 await landAt(page,'Mown lawn');await expect(page.getByRole('button',{name:'Watch feeding & pollination',exact:true})).toBeDisabled();
 await landAt(page,'Wild bergamot');await openFeeding(page);await still(page);await page.getByRole('button',{name:'Visit without flying · Mown lawn',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-feeding','');expect(await page.evaluate(()=>(window as any).__feedingScene.getObjectByName('feeding-observation').visible)).toBe(false);expect(errors).toEqual([]);
});

test('mobile reduced motion preserves each feeding step and its accessible diagram after context loss',async({page})=>{
 const errors=errorsOn(page);await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await mount(page);await landAt(page,'Wild bergamot');await openFeeding(page);
 const stage=page.locator('.bf-stage');await expect(stage).toHaveAttribute('data-bf-feeding-progress','1.000');await phase3d(page,'sip');await stage.screenshot({path:shots+'/mobile-nectar-sipping.png'});
 const frame=await page.evaluate(()=>(window as any).__feedingRenderer.info.render.frame),clock=await stage.getAttribute('data-clock');await page.waitForTimeout(300);expect(await page.evaluate(()=>(window as any).__feedingRenderer.info.render.frame)).toBe(frame);
 await page.locator('.bf-gl').evaluate((canvas:HTMLCanvasElement)=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await expect(stage).toHaveAttribute('data-bf-renderer','map');await expect(stage).toHaveAttribute('data-bf-feeding','sip');
 for(const label of await page.locator('.bf-feed-label').all())await expect(label).toBeHidden();
 await page.getByRole('button',{name:'Fly to next flower',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-feeding','carry');await expect(stage).toHaveAttribute('data-bf-feeding-progress','1.000');await stage.screenshot({path:shots+'/mobile-pollen-carry-map.png'});
 await page.getByRole('button',{name:'Transfer pollen',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-feeding','deposit');await expect(stage).toHaveAttribute('data-bf-feeding-progress','1.000');await stage.screenshot({path:shots+'/mobile-pollen-transfer-map.png'});
 expect(await stage.getAttribute('data-clock')).toBe(clock);await expect(page.getByRole('region',{name:'Feeding and pollination observation',exact:true})).toContainText(/pollen/i);await expect(page.getByRole('heading',{name:'0 of 3 patches investigated',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);await audit(page);
 await page.evaluate(()=>{const w=window as any;w.__ctx.isDark=true;w.__ctx.isContrast=true;w.__rerender();});await audit(page);expect(errors).toEqual([]);
});
