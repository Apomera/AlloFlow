import { test, expect } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({mode:'serial',retries:0,timeout:180000});
test.use({video:'off',trace:'off'});
const out=path.resolve('reports/scale-explorer-refinement');
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js'],probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){if(window.__featureFrames&&window.__featureFrames.length<240){let n;s.traverse(o=>{if(o.userData.nebula)n=o.userData.nebula;});if(n)window.__featureFrames.push(n.reveal.value);}return render.apply(this,arguments);};return r;}});`});
test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});
async function mount(page:any,reduced=true){
  await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
  await page.setViewportSize({width:1400,height:1100});
  await harness.mount(page,{},'!!document.querySelector("[data-atlas-ready]")');
  await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
}
async function fly(page:any,id:string){
  await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);
  const canvas=page.locator('[data-atlas-ready]');await expect(canvas).toHaveAttribute('data-atlas-objects',id);
  await expect.poll(()=>canvas.evaluate((c:HTMLElement)=>Math.abs(Number(c.dataset.atlasExponent)-Number(c.dataset.atlasTarget)))).toBeLessThan(.002);
}
const nav=(page:any)=>page.getByRole('navigation',{name:'Landmark navigator',exact:true});

test('landmark navigation cycles features, reads sources and returns to the whole specimen without scale travel',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await mount(page);await fly(page,'orion-nebula');const canvas=page.locator('[data-atlas-ready]'),panel=nav(page),exponent=await canvas.getAttribute('data-atlas-exponent');
  await panel.getByRole('button',{name:'Explore landmarks',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-atlas-detail','trapezium');await expect(panel).toContainText('Landmark 1 of 4');
  await panel.getByRole('button',{name:'About Trapezium stars',exact:true}).click();
  await expect(panel.getByRole('region',{name:'About this landmark'})).toBeVisible();
  await expect(panel.getByRole('link',{name:'Science reference'})).toHaveAttribute('href',/^https:\/\/science.nasa.gov/);
  const next=panel.getByRole('button',{name:'Next landmark',exact:true});await next.focus();await next.press('ArrowRight');
  await expect(canvas).toHaveAttribute('data-atlas-detail','stellar-cavity');await expect(next).toBeFocused();
  await expect(panel.getByRole('region')).toContainText('bowl-like cavity');
  await next.press('ArrowLeft');await expect(canvas).toHaveAttribute('data-atlas-detail','trapezium');
  await panel.getByRole('button',{name:'Previous landmark',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-detail','dust-ridge');
  await expect(panel).toContainText('Landmark 4 of 4');
  await page.locator('.sx-stage').screenshot({path:path.join(out,'orion-notes.png')});
  await panel.getByRole('button',{name:'Previous landmark',exact:true}).press('Escape');await expect(panel.getByRole('region')).toHaveCount(0);
  const title=panel.getByRole('button',{name:'About Dark dust ridge',exact:true});await expect(title).toBeFocused();
  await title.press('Escape');await expect(canvas).toHaveAttribute('data-atlas-detail','');await expect(panel.getByRole('button',{name:'Explore landmarks',exact:true})).toBeFocused();
  await expect(canvas).toHaveAttribute('data-atlas-exponent',exponent!);await expect(canvas).toHaveAttribute('data-atlas-zoom','1.00');
  expect(looksBlank(await harness.glPixels(page))).toBe(false);expect(errors).toEqual([]);
});

test('phone controls stay separate from the model, and fullscreen and chart switching remain usable',async({page})=>{
  await mount(page);await page.setViewportSize({width:320,height:780});await fly(page,'orion-nebula');
  const panel=nav(page),canvas=page.locator('[data-atlas-ready]');
  const start=panel.getByRole('button',{name:'Explore landmarks',exact:true});await start.focus();await start.press('Enter');
  await expect(canvas).toHaveAttribute('data-atlas-detail','trapezium');
  const bounds=await page.evaluate(()=>{const canvas=document.querySelector('[data-atlas-ready]')!.getBoundingClientRect(),nav=document.querySelector('.sx-feature-nav')!.getBoundingClientRect();return{canvasBottom:canvas.bottom,navTop:nav.top,navRight:nav.right,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1};});
  expect(bounds.navTop).toBeGreaterThanOrEqual(bounds.canvasBottom-1);expect(bounds.navRight).toBeLessThanOrEqual(bounds.width);expect(bounds.overflow).toBe(false);
  await page.locator('.sx-stage').screenshot({path:path.join(out,'phone-exploration.png')});
  await panel.getByRole('button',{name:'About Trapezium stars',exact:true}).click();await page.locator('.sx-stage').screenshot({path:path.join(out,'phone-notes.png')});
  await panel.getByRole('button',{name:'Return to whole view',exact:true}).focus();await page.keyboard.press('Tab');
  await expect(panel.getByRole('region',{name:'About this landmark'})).toBeFocused();await page.keyboard.press('Tab');
  await expect(panel.getByRole('link',{name:'Science reference'})).toBeFocused();await expect(panel.getByRole('link',{name:'Science reference'})).toBeInViewport();
  await panel.getByRole('button',{name:'Return to whole view',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-detail','');
  await page.setViewportSize({width:1366,height:900});await page.getByRole('button',{name:'View the scale explorer full screen',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
  await panel.getByRole('button',{name:'Next landmark',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-detail','trapezium');
  await expect(panel).toBeInViewport();await page.locator('.sx-stage').screenshot({path:path.join(out,'fullscreen-exploration.png')});
  await page.evaluate(()=>document.exitFullscreen());await page.getByRole('button',{name:'Scale chart',exact:true}).click();await expect(panel).toHaveCount(0);
  await page.getByRole('button',{name:'Immersive 3D',exact:true}).click();await expect(panel).toBeVisible();await expect(panel.getByRole('region')).toHaveCount(0);
});

test('dust fades smoothly with ambience paused, settles without an idle render loop, and snaps for reduced motion',async({page})=>{
  await mount(page,false);await fly(page,'orion-nebula');await page.getByRole('button',{name:'Pause ambience',exact:true}).click();
  const reveal=page.getByRole('button',{name:'Reveal embedded stars',exact:true});
  await page.evaluate(()=>{(window as any).__featureFrames=[];});await reveal.click();
  await expect.poll(()=>page.evaluate(()=>{const frames=(window as any).__featureFrames;return frames[frames.length-1];})).toBe(.16);
  const frames=await page.evaluate(()=>(window as any).__featureFrames as number[]);
  expect(frames.filter(v=>v>.16&&v<1).length).toBeGreaterThan(3);
  for(let i=1;i<frames.length;i++)expect(frames[i]).toBeLessThanOrEqual(frames[i-1]);
  const count=frames.length;await page.waitForTimeout(250);expect(await page.evaluate(()=>(window as any).__featureFrames.length)).toBe(count);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(page.getByRole('button',{name:'Reduced motion',exact:true})).toBeVisible();
  await page.evaluate(()=>{(window as any).__featureFrames=[];});await reveal.click();
  await expect.poll(()=>page.evaluate(()=>{const frames=(window as any).__featureFrames;return frames[frames.length-1];})).toBe(1);
  expect((await page.evaluate(()=>(window as any).__featureFrames as number[])).every(v=>v===1||v===.16)).toBe(true);
});

test('unavailable planetary textures cannot be entered through the navigator',async({page})=>{
  await page.route('**/stem_lab/assets/astronomy/*',route=>route.abort());await mount(page);await fly(page,'earth');
  await expect(page.locator('.sx-details')).toContainText('Surface imagery is unavailable');
  await expect(nav(page).getByRole('button',{name:'Explore landmarks',exact:true})).toBeDisabled();
  await expect(nav(page).getByRole('button',{name:'Next landmark',exact:true})).toBeDisabled();
  await fly(page,'paramecium');await nav(page).getByRole('button',{name:'Explore landmarks',exact:true}).click();
  await expect(page.locator('[data-atlas-ready]')).not.toHaveAttribute('data-atlas-detail','');
});
