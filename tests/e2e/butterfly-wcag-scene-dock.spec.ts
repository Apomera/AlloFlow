import {test,expect,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:120000});test.use({viewport:{width:320,height:1000},reducedMotion:'reduce',video:'off'});
test.beforeAll(()=>{mkdirSync('scratch/butterfly-scene-dock',{recursive:true});return harness.start();});test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page:Page,fallback=true){await page.goto(harness.url+'/__harness');await page.evaluate(fallback=>{const w=window as any;if(fallback)w.StemLab.ensureThree=()=>Promise.reject(new Error('Test map'));w.__mount({butterfly:{}});Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});},fallback);await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer',fallback?'map':'three');}
async function enlargeScene(page:Page){await page.locator('.bf-stage').evaluate(root=>{const nodes=[root,...root.querySelectorAll('*')].map(el=>({el,size:parseFloat(getComputedStyle(el).fontSize)}));nodes.forEach(({el,size})=>(el as HTMLElement).style.fontSize=size*2+'px');});await page.addStyleTag({content:'.bf-stage *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}'});}
async function clippedCaption(page:Page){return page.locator('#bf-scene-caption').evaluate(el=>{const stage=el.closest('.bf-stage')!.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(el);return Array.from(range.getClientRects()).filter(r=>r.width&&r.height&&(r.left<stage.left||r.right>stage.right||r.top<stage.top||r.bottom>stage.bottom)).map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}));});}

test('enlarged landing guidance fits without clipping or covering the flight pad',async({page})=>{
 await mount(page);await page.getByRole('button',{name:'Visit without flying · Common milkweed',exact:true}).click();await enlargeScene(page);
 await page.locator('.bf-stage').screenshot({path:'scratch/butterfly-scene-dock/enlarged-scene.png'});
 expect(await clippedCaption(page)).toEqual([]);
 const overlap=await page.evaluate(()=>{const a=document.querySelector('#bf-scene-caption')!.getBoundingClientRect(),b=document.querySelector('.bf-pilot')!.getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;});expect(overlap).toBe(false);
 await expect(page.locator('.bf-stage')).toHaveAccessibleDescription(/Within landing range/);
});

test('translated lens controls stay below the picture and retain focus with doubled text',async({page})=>{
 await mount(page);await page.getByRole('button',{name:'Visit without flying · Common milkweed',exact:true}).click();await page.getByRole('button',{name:'Land here',exact:true}).click();
 await page.evaluate(()=>{const w=window as any,words:Record<string,string>={'stem.butterfly.hud_badge_map':'MAPA DEL HÁBITAT · EXPLORA LAS FLORES Y LAS PLANTAS DE LA PRADERA','stem.butterfly.hud_lens_flowers':'Observar las flores de esta planta','stem.butterfly.hud_lens_leaves':'Observar las hojas de esta planta','stem.butterfly.hud_lens_wide':'Volver a la vista completa del hábitat'};w.__ctx.t=(key:string,fallback:string)=>words[key]||fallback;w.__rerender();});
 await expect(page.getByRole('button',{name:'Observar las hojas de esta planta',exact:true})).toBeVisible();await enlargeScene(page);
 const lens=page.getByRole('group',{name:'Field lens controls',exact:true}),leaves=lens.getByRole('button',{name:'Observar las hojas de esta planta',exact:true});await leaves.focus();await page.keyboard.press('Enter');await expect(leaves).toBeFocused();await expect(leaves).toHaveAttribute('aria-pressed','true');
 expect(await clippedCaption(page)).toEqual([]);
 expect(await lens.evaluate(el=>{const picture=document.querySelector('.bf-viewport')!.getBoundingClientRect();return el.getBoundingClientRect().top>=picture.bottom;})).toBe(true);
 const overflow=await lens.evaluate(el=>Array.from(el.querySelectorAll('button')).filter(button=>{const r=button.getBoundingClientRect(),host=el.getBoundingClientRect();return r.left<host.left||r.right>host.right+1||button.scrollWidth>button.clientWidth+1;}).map(el=>el.textContent));expect(overflow).toEqual([]);
 await page.locator('.bf-stage').screenshot({path:'scratch/butterfly-scene-dock/translated-lens.png'});
});

test('keyboard focus, saved notes and the camera picture survive responsive reflow',async({page})=>{
 await page.setViewportSize({width:1100,height:1000});await mount(page);await page.locator('#bf-notebook-reasoning').fill('Keep the same field observation while the controls reflow.');await page.getByRole('button',{name:'Take flight',exact:true}).click();
 const pad=page.getByRole('button',{name:'Flight pad',exact:true}),stage=page.locator('.bf-stage');await pad.focus();await page.setViewportSize({width:320,height:1000});await expect(pad).toBeFocused();
 const before=await stage.getAttribute('data-position');await page.keyboard.down('ArrowUp');await expect.poll(()=>stage.getAttribute('data-position')).not.toBe(before);await page.keyboard.up('ArrowUp');await page.keyboard.press('Space');await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
 await expect(page.locator('#bf-notebook-reasoning')).toHaveValue('Keep the same field observation while the controls reflow.');
 const height=await page.locator('.bf-viewport').evaluate(el=>el.clientHeight);await enlargeScene(page);expect(await page.locator('.bf-viewport').evaluate(el=>el.clientHeight)).toBe(height);expect(await clippedCaption(page)).toEqual([]);
});

test('the scene panel keeps readable text and controls in dark and forced-color themes',async({page})=>{
 await mount(page);await page.evaluate(()=>{const w=window as any;w.__ctx.isDark=true;w.__rerender();});await expect(page.locator('.bfl')).toHaveAttribute('data-dark','true');
 for(const forced of ['none','active'] as const){
  await page.emulateMedia({forcedColors:forced,reducedMotion:'reduce'});
  const violations=await page.evaluate(async()=>{const r=await (window as any).axe.run(document.querySelector('.bf-stage'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.failureSummary)}));});expect(violations).toEqual([]);
 }
 await page.getByRole('button',{name:'Take flight',exact:true}).click();await page.getByRole('button',{name:'Flight pad',exact:true}).focus();await expect(page.getByRole('button',{name:'Flight pad',exact:true})).toBeFocused();await page.locator('.bf-stage').screenshot({path:'scratch/butterfly-scene-dock/forced-colors.png'});
});

test('3D and fallback drawing dimensions follow the picture rather than the expanded control panel',async({page})=>{
 test.setTimeout(180000); // Software WebGL startup can be slow on shared hosts.
 await page.setViewportSize({width:1280,height:1000});await mount(page,false);
 const stage=page.locator('.bf-stage'),picture=page.locator('.bf-viewport'),initial=await stage.getAttribute('data-position');
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:1000});await expect.poll(()=>picture.evaluate(el=>el.clientHeight)).toBe(width===1280?560:410);
  await expect.poll(()=>page.locator('.bf-gl').evaluate(canvas=>{const el=canvas as HTMLCanvasElement,box=el.parentElement!;return Math.abs(el.width/el.height-box.clientWidth/box.clientHeight);})).toBeLessThan(.005);
  expect(await stage.evaluate(el=>el.clientHeight)).toBeGreaterThan(await picture.evaluate(el=>el.clientHeight));
 }
 expect(await stage.getAttribute('data-position')).toBe(initial);await enlargeScene(page);await expect(stage).toHaveAttribute('data-bf-renderer','three');expect(await clippedCaption(page)).toEqual([]);
 await page.locator('.bf-gl').dispatchEvent('webglcontextlost');await expect(stage).toHaveAttribute('data-bf-renderer','map');await expect(page.locator('.bf-place-label[data-map="true"]')).toHaveCount(4);
 await expect.poll(()=>page.locator('.bf-map').evaluate(canvas=>{const el=canvas as HTMLCanvasElement,box=el.parentElement!;return Math.abs(el.width/el.height-box.clientWidth/box.clientHeight);})).toBeLessThan(.005);
 await page.locator('.bf-stage').screenshot({path:'scratch/butterfly-scene-dock/recovered-map.png'});
});
