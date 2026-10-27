import {test,expect,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:120000});
test.use({viewport:{width:1280,height:1000},reducedMotion:'reduce',video:'off'});
test.beforeAll(()=>{mkdirSync('scratch/butterfly-wayfinding',{recursive:true});return harness.start();});
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));
async function mount(page:Page,fallback=true){
 await page.goto(harness.url+'/__harness');await page.evaluate((fallback)=>{const w=window as any;if(fallback)w.StemLab.ensureThree=()=>Promise.reject(new Error('Test map'));w.__mount({butterfly:{}});Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});},fallback);
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer',fallback?'map':'three');
}
test('the visible scene caption describes keyboard navigation and landing without a live distance ticker',async({page})=>{
 await mount(page);const stage=page.locator('.bf-stage'),land=page.getByRole('button',{name:'Land here',exact:true});
 await expect(stage).toHaveAccessibleDescription(/Ready when you are.*scene units away/);
 await page.getByRole('button',{name:'Visit without flying · Common milkweed',exact:true}).click();
 await expect(stage).toBeFocused();await expect(stage).toHaveAccessibleDescription(/Within landing range/);await expect(land).toHaveAccessibleDescription(/Within landing range/);
 await land.click();await expect(stage).toHaveAccessibleDescription(/Landed · Common milkweed.*Compare flowers and leaves/);
 await page.getByRole('button',{name:'Examine patch',exact:true}).click();await expect(stage).toHaveAccessibleDescription(/Evidence recorded/);
 const caption=page.locator('#bf-scene-caption');expect(await caption.evaluate(el=>!!el.closest('[aria-hidden="true"]'))).toBe(false);await expect(caption).toHaveAttribute('aria-live','off');
});

test('flight pad retains its instructions and offers a quiet, current location description',async({page})=>{
 await mount(page);await page.getByRole('button',{name:'Take flight',exact:true}).click();const pad=page.getByRole('button',{name:'Flight pad',exact:true});
 await expect(pad).toHaveAccessibleDescription(/Drag up to fly.*Space pauses.*Exploring the meadow.*scene units away/);
 const stage=page.locator('.bf-stage'),before=await stage.getAttribute('data-position');
 await page.evaluate(()=>{const w=window as any;w.__liveLocationChanges=0;w.__locationObserver=new MutationObserver(()=>w.__liveLocationChanges++);w.__locationObserver.observe(document.querySelector('.bf-status'),{subtree:true,childList:true,characterData:true});});
 await pad.focus();await page.keyboard.down('ArrowUp');await expect.poll(()=>stage.getAttribute('data-position')).not.toBe(before);await page.waitForTimeout(650);await page.keyboard.up('ArrowUp');
 await expect(pad).toBeFocused();await expect(pad).toHaveAccessibleDescription(/Drag up to fly.*scene units away/);
 expect(await page.evaluate(()=>(window as any).__liveLocationChanges)).toBe(0);
 await expect(page.locator('#bf-pad-instructions')).toBeHidden();await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await expect(page.locator('#bf-pad-instructions')).toBeHidden();await expect(pad).toHaveAccessibleDescription(/Drag up to fly.*scene units away/);await page.locator('.bf-stage').screenshot({path:'scratch/butterfly-wayfinding/flight-pad-help-hidden.png'});
});

test('automatic map fallback reports its selected state and numbers match the readable habitat key',async({page})=>{
 await mount(page);const map=page.getByRole('button',{name:'Map',exact:true});await expect(map).toHaveAttribute('aria-pressed','true');await expect(map).toHaveAttribute('aria-disabled','true');await expect(map).toHaveAccessibleDescription(/3D is unavailable/);
 await map.evaluate((el:HTMLButtonElement)=>el.click());await expect(map).toHaveAttribute('aria-pressed','true');
 const names=['Common milkweed','Wild bergamot','Mown lawn','Restoration plot'];
 for(const [i,id] of ['milkweed','bergamot','lawn','restoration'].entries()){
  const marker=page.locator('.bf-place-label[data-place="'+id+'"]');await expect(marker).toHaveAttribute('data-map','true');await expect(marker.locator('.bf-place-index')).toHaveText(String(i+1));await expect(marker.locator('.bf-place-name')).toBeHidden();
  const item=page.locator('[data-map-place="'+id+'"]');await expect(item.locator('strong')).toHaveText(names[i]);await expect(item.locator('.bf-map-number')).toHaveText(String(i+1));await expect(item).toContainText('not examined yet');
 }
 await page.getByRole('button',{name:'Visit without flying · Common milkweed',exact:true}).click();await page.getByRole('button',{name:'Land here',exact:true}).click();await page.getByRole('button',{name:'Examine patch',exact:true}).click();await expect(page.locator('[data-map-place="milkweed"]')).toContainText('✓ examined');
 await page.locator('.bf-stage').screenshot({path:'scratch/butterfly-wayfinding/numbered-map.png'});
});

test('translated map names reflow at 320 pixels with enlarged text and extra spacing',async({page})=>{
 await page.setViewportSize({width:320,height:1000});await mount(page);
 await page.evaluate(()=>{const w=window as any;const words:Record<string,string>={'stem.butterfly.data_plant_milkweed_name':'Algodoncillo común para las orugas de la mariposa monarca','stem.butterfly.data_plant_bergamot_name':'Bergamota silvestre de la pradera','stem.butterfly.data_plant_lawn_name':'Césped recién cortado sin flores','stem.butterfly.data_restoration_name':'Parcela de restauración del hábitat de las mariposas'};w.__ctx.t=(key:string,fallback:string)=>words[key]||fallback;w.__rerender();document.documentElement.style.fontSize='32px';});
 await page.addStyleTag({content:'.bf-map-key *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.bf-map-key p{margin-bottom:2em!important}'});
 const key=page.getByRole('region',{name:'Habitat map key',exact:true});await expect(key).toContainText('Algodoncillo común');
 const overflowing=await key.evaluate(root=>Array.from(root.querySelectorAll('*')).filter(el=>{const b=el.getBoundingClientRect(),r=root.getBoundingClientRect();return b.width>0&&(b.left<r.left||b.right>r.right||el.scrollWidth>el.clientWidth+1);}).map(el=>el.className));expect(overflowing).toEqual([]);
 expect(await key.locator('strong').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(30);
 await key.screenshot({path:'scratch/butterfly-wayfinding/enlarged-map-key.png'});
});

test('map markers and their key remain legible in forced colors',async({page})=>{
 await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await mount(page);const markers=page.locator('.bf-place-label[data-map="true"]');await expect(markers).toHaveCount(4);
 for(const marker of await markers.all()){
  const colors=await marker.evaluate(el=>{const s=getComputedStyle(el);return {foreground:s.color,background:s.backgroundColor,border:s.borderTopColor,outline:s.borderTopWidth};});
  expect(colors.foreground).not.toBe(colors.background);expect(colors.border).toBe(colors.foreground);expect(colors.outline).toBe('2px');
 }
 const violations=await page.evaluate(async()=>{const result=await (window as any).axe.run(document.querySelector('[data-butterfly-root]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return result.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.failureSummary)}));});expect(violations).toEqual([]);
 await page.locator('.bf-stage').screenshot({path:'scratch/butterfly-wayfinding/forced-colors-map.png'});
});

test('3D, map and flower close-ups keep their captions and habitat keys in the correct view',async({page})=>{
 await mount(page,false);const map=page.getByRole('button',{name:'Map',exact:true}),key=page.getByRole('region',{name:'Habitat map key',exact:true}),stage=page.locator('.bf-stage');
 await expect(map).toHaveAttribute('aria-pressed','false');await expect(key).toHaveCount(0);
 const position=await stage.getAttribute('data-position');await map.focus();await page.keyboard.press('Enter');await expect(map).toBeFocused();await expect(key).toBeVisible();await expect(map).toHaveAttribute('aria-pressed','true');expect(await stage.getAttribute('data-position')).toBe(position);
 await page.keyboard.press('Enter');await expect(key).toHaveCount(0);await expect(page.locator('.bf-place-label[data-map="true"]')).toHaveCount(0);await expect(map).toHaveAttribute('aria-pressed','false');
 await map.click();await page.getByRole('button',{name:'Visit without flying · Common milkweed',exact:true}).click();await page.getByRole('button',{name:'Land here',exact:true}).click();await page.getByRole('button',{name:'Watch feeding & pollination',exact:true}).click();
 await expect(key).toHaveCount(0);await expect(page.locator('.bf-place-label:visible')).toHaveCount(0);await expect(stage).toHaveAccessibleDescription(/Uncoil, reach, and sip.*Enlarged nectar and pollen cues/);
 await page.getByRole('button',{name:'Return to habitat view',exact:true}).click();await expect(key).toBeVisible();await expect(stage).toBeFocused();await expect(stage).toHaveAccessibleDescription(/Landed · Common milkweed/);
 await map.click();await map.focus();await page.locator('.bf-gl').dispatchEvent('webglcontextlost');await expect(stage).toHaveAttribute('data-bf-renderer','map');await expect(map).toBeFocused();await expect(map).toHaveAttribute('aria-pressed','true');await expect(map).toHaveAttribute('aria-disabled','true');await expect(key).toBeVisible();
});

test('life-cycle diagrams hide habitat markers and return to the same readable map',async({page})=>{
 await mount(page);await page.getByRole('button',{name:'Visit without flying · Common milkweed',exact:true}).click();await page.getByRole('button',{name:'Land here',exact:true}).click();await page.getByRole('button',{name:'Examine patch',exact:true}).click();
 await page.locator('#bf-egg-site').selectOption('milkweed');await page.locator('#bf-brood-guess').selectOption('complete');await page.getByRole('button',{name:'Lay eggs here',exact:true}).click();
 const key=page.getByRole('region',{name:'Habitat map key',exact:true});await expect(key).toHaveCount(0);await expect(page.locator('.bf-place-label:visible')).toHaveCount(0);await expect(page.locator('.bf-stage')).toHaveAccessibleDescription(/Egg/);
 await page.getByRole('button',{name:'Return to flight view',exact:true}).click();await expect(key).toBeVisible();await expect(page.locator('.bf-place-label:visible')).toHaveCount(4);
});

test('delayed 3D startup and retry keep the numbered map key and explanation available',async({page})=>{
 await page.goto(harness.url+'/__harness');await page.evaluate(()=>{const w=window as any;w.StemLab.ensureThree=()=>new Promise((resolve,reject)=>{w.__rejectMeadow=reject;});w.__mount({butterfly:{}});Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});});
 const key=page.getByRole('region',{name:'Habitat map key',exact:true}),map=page.getByRole('button',{name:'Map',exact:true});await expect(key).toBeVisible();await expect(page.locator('.bf-place-label[data-map="true"]')).toHaveCount(4);await expect(map).toHaveAttribute('aria-pressed','true');await expect(map).toHaveAccessibleDescription(/Preparing the 3D meadow/);
 await page.evaluate(()=>(window as any).__rejectMeadow(new Error('Delayed renderer unavailable')));await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');await expect(key).toBeVisible();
 const retry=page.getByRole('button',{name:'Retry 3D',exact:true});await retry.focus();await page.keyboard.press('Enter');await expect(page.locator('.bf-stage')).toBeFocused();await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','loading');await expect(key).toBeVisible();await expect(map).toHaveAccessibleDescription(/Preparing the 3D meadow/);
});
