import {test,expect,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:90000});test.use({viewport:{width:1280,height:1000},reducedMotion:'reduce',video:'off'});
test.beforeAll(()=>{mkdirSync('scratch/butterfly-pilot-guidance',{recursive:true});return harness.start();});test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page:Page){await page.goto(harness.url+'/__harness');await page.evaluate(()=>{const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test map'));w.__mount({butterfly:{}});Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});});await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');}
async function height(page:Page){return page.locator('.bf-stage').evaluate(el=>Number((el.getAttribute('data-position')||'').split(',')[1]));}

test('gliding guidance matches continued flight after release and switches back with wingbeats',async({page})=>{
 await mount(page);await page.getByRole('button',{name:'Take flight',exact:true}).click();await page.getByRole('button',{name:'Glide',exact:true}).click();
 const pad=page.getByRole('button',{name:'Flight pad',exact:true}),stage=page.locator('.bf-stage');
 await expect(page.locator('.bf-pilot-hint')).toHaveText('Gliding continues on release');await expect(pad).toHaveAccessibleDescription(/Releasing the pad keeps you gliding/);
 await expect.poll(()=>stage.getAttribute('data-bf-speed')).not.toBe('0.00');const position=await stage.getAttribute('data-position');await page.waitForTimeout(250);expect(await stage.getAttribute('data-position')).not.toBe(position);
 await pad.focus();await page.keyboard.press('g');await expect(pad).toBeFocused();await expect(page.getByRole('button',{name:'Glide',exact:true})).toHaveAttribute('aria-pressed','false');await expect(page.locator('.bf-pilot-hint')).toHaveText('Release to hover');await expect(pad).toHaveAccessibleDescription(/Release to hover/);
 await expect.poll(async()=>Number(await stage.getAttribute('data-bf-speed'))).toBeLessThan(.02);
});

test('visible altitude words match accessible names and preserve assistive stepping',async({page})=>{
 await mount(page);await page.getByRole('button',{name:'Take flight',exact:true}).click();const pilot=page.getByRole('group',{name:'On-scene flight controls',exact:true});
 for(const [name,label,direction] of [['Rise while flying','Rise',1],['Lower while flying','Lower',-1]] as const){
  const control=pilot.getByRole('button',{name,exact:true});await expect(control.locator('.bf-altitude-label')).toHaveText(label);await expect(control).toHaveAccessibleName(name);
  await control.focus();const before=await height(page);await control.evaluate((el:HTMLButtonElement)=>el.click());await expect(control).toBeFocused();expect(((await height(page))-before)*direction).toBeGreaterThan(.1);
  await expect(page.locator('.bf-status')).toContainText(name+': one short step. Hovering.');
 }
});

test('pausing makes the scene description truthful without adding a second live announcement',async({page})=>{
 await mount(page);await page.getByRole('button',{name:'Take flight',exact:true}).click();await page.getByRole('button',{name:'Glide',exact:true}).click();await expect(page.getByRole('button',{name:'Glide',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.evaluate(()=>{const w=window as any;w.__pilotAnnouncements=[];w.__pilotObserver=new MutationObserver(records=>{const regions=new Set<Element>();for(const record of records){const target=record.target.nodeType===Node.ELEMENT_NODE?record.target as Element:record.target.parentElement,region=target?.closest('[role="status"],[role="alert"],[aria-live="polite"],[aria-live="assertive"]');if(region&&!region.closest('[aria-live="off"],[aria-hidden="true"]'))regions.add(region);}for(const region of regions)w.__pilotAnnouncements.push({className:region.className,text:region.textContent});});w.__pilotObserver.observe(document.querySelector('.bfl'),{subtree:true,childList:true,characterData:true});});
 const pad=page.getByRole('button',{name:'Flight pad',exact:true}),stage=page.locator('.bf-stage');await pad.focus();await page.keyboard.press('Space');await expect(stage).toBeFocused();await expect(stage).toHaveAttribute('data-bf-motion-paused','true');await expect(stage).toHaveAccessibleDescription(/All motion paused.*Exploring the meadow/);await expect(page.locator('.bf-pilot-hint')).toHaveText('Motion paused');
 const frozen=await stage.getAttribute('data-position');await page.waitForTimeout(220);expect(await stage.getAttribute('data-position')).toBe(frozen);
 const events=await page.evaluate(()=>(window as any).__pilotAnnouncements.filter((item:any)=>item.text.includes('All motion paused.')));expect(events).toHaveLength(1);expect(events[0].className).toBe('bf-status');
 await page.keyboard.press('Space');await expect(page.locator('.bf-scene-motion')).toHaveCount(0);await expect(page.locator('.bf-pilot-hint')).toHaveText('Gliding continues on release');await expect(stage).toHaveAttribute('data-bf-motion-paused','false');
});

test('map-direction help also describes gliding honestly',async({page})=>{
 await mount(page);await page.getByRole('button',{name:'Map directions',exact:true}).click();await page.getByRole('button',{name:'Take flight',exact:true}).click();await page.getByRole('button',{name:'Glide',exact:true}).click();
 const help=page.locator('.bf-help').filter({hasText:'Gliding continues forward and gently downward when you release the controls.'});await expect(help).toBeVisible();
 await page.getByRole('button',{name:'Glide',exact:true}).click();await expect(help).toHaveCount(0);await expect(page.locator('.bf-help').filter({hasText:'Hold a direction to accelerate; release to slow.'})).toBeVisible();
});

test('enlarged translated altitude labels remain readable and operable at 320 pixels',async({page})=>{
 await page.setViewportSize({width:320,height:1000});await mount(page);
 await page.evaluate(()=>{const w=window as any,words:Record<string,string>={'stem.butterfly.bar_hold_rise':'Höhersteigen','stem.butterfly.bar_hold_lower':'Tieferfliegen','stem.butterfly.pad_rise':'Höhersteigen während des Fluges','stem.butterfly.pad_lower':'Tieferfliegen während des Fluges','stem.butterfly.pad_glide_release':'Nach dem Loslassen weitergleiten','stem.butterfly.pad_glide_instructions':'Seitlich ziehen zum Wenden. Nach dem Loslassen gleitet der Schmetterling weiter. Mit G zum Flügelschlag wechseln.'};w.__ctx.t=(key:string,fallback:string)=>words[key]||fallback;w.__rerender();});
 await page.getByRole('button',{name:'Take flight',exact:true}).click();await page.getByRole('button',{name:'Glide',exact:true}).click();const pilot=page.getByRole('group',{name:'On-scene flight controls',exact:true});
 await expect(pilot).toContainText('Nach dem Loslassen weitergleiten');await expect(page.getByRole('button',{name:'Flight pad',exact:true})).toHaveAccessibleDescription(/Seitlich ziehen zum Wenden/);
 await page.locator('.bf-scene-dock').evaluate(root=>{const values=[root,...root.querySelectorAll('*')].map(el=>({el,size:parseFloat(getComputedStyle(el).fontSize)}));for(const {el,size} of values)(el as HTMLElement).style.fontSize=size*2+'px';});await page.addStyleTag({content:'.bf-scene-dock *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}'});
 const overflow=await pilot.evaluate(root=>Array.from(root.querySelectorAll('button,.bf-pilot-label,.bf-pilot-hint')).filter(el=>{const a=el.getBoundingClientRect(),b=root.getBoundingClientRect();return a.width>0&&(a.left<b.left-.5||a.right>b.right+.5||el.scrollWidth>el.clientWidth+1);}).map(el=>el.textContent));expect(overflow).toEqual([]);
 const rise=pilot.getByRole('button',{name:'Höhersteigen während des Fluges',exact:true});await rise.focus();const before=await height(page);await rise.evaluate((el:HTMLButtonElement)=>el.click());expect(await height(page)).toBeGreaterThan(before+.1);await expect(rise).toBeFocused();await page.locator('.bf-scene-dock').screenshot({path:'scratch/butterfly-pilot-guidance/translated-enlarged.png'});
});

test('pause indicator and larger control text retain contrast in every theme',async({page})=>{
 await page.setViewportSize({width:390,height:1000});await mount(page);await page.getByRole('button',{name:'Take flight',exact:true}).click();await page.getByRole('button',{name:'Pause all motion',exact:true}).click();
 for(const [dark,contrast,forced] of [[false,false,false],[true,false,false],[true,true,false],[true,true,true]]){
  await page.evaluate(({dark,contrast})=>{const w=window as any;w.__ctx.isDark=dark;w.__ctx.isContrast=contrast;w.__rerender();},{dark,contrast});await expect(page.locator('.bfl')).toHaveAttribute('data-dark',String(dark));await expect(page.locator('.bfl')).toHaveAttribute('data-contrast',String(contrast));await page.emulateMedia({forcedColors:forced?'active':'none',reducedMotion:'reduce'});
  const violations=await page.evaluate(async()=>{const r=await (window as any).axe.run(document.querySelector('.bf-scene-dock'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.failureSummary)}));});expect(violations).toEqual([]);
 }
 await page.locator('.bf-scene-dock').screenshot({path:'scratch/butterfly-pilot-guidance/paused-high-contrast.png'});
});
