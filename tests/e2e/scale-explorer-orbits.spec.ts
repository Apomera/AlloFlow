import { test, expect } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({mode:'serial',retries:0,timeout:180000});
test.use({video:'off',trace:'off'});
const out=path.resolve('reports/scale-explorer-orbits');
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js'],probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){const f=window.__orbitFrames;if(f&&f.length<300)f.push(Number(r.domElement.dataset.atlasZoom||1));return render.apply(this,arguments);};return r;}});`});
test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});
async function mount(page:any){
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1400,height:1100});
  await harness.mount(page,{},'!!document.querySelector("[data-atlas-ready]")');
  await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
}
async function fly(page:any,id:string){
  await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);
  const canvas=page.locator('[data-atlas-ready]');await expect(canvas).toHaveAttribute('data-atlas-objects',id);
  await expect.poll(()=>canvas.evaluate((c:HTMLElement)=>Math.abs(Number(c.dataset.atlasExponent)-Number(c.dataset.atlasTarget)))).toBeLessThan(.002);
}
async function system(page:any){return page.evaluate(()=>{
  const w=window as any,T=w.THREE,r=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;
  r.scene.traverse((o:any)=>{if(o.userData.itemId==='solar-system')root=o;});const g=root.userData.model,n=g.userData.solarSystem;
  return {span:g.localToWorld(new T.Vector3(.5,0,0)).distanceTo(g.localToWorld(new T.Vector3(-.5,0,0))),
    positions:n.bodies.map((b:any)=>({id:b.userData.planetId,p:b.position.toArray(),scale:b.scale.x})),
    paths:n.paths.map((l:any)=>({id:l.userData.planetId,au:l.userData.orbitAU,points:Array.from(l.geometry.attributes.position.array)})),
    belt:n.belt.geometry.attributes.position.count,rotation:g.rotation.toArray(),
    ray:n.measureLine.visible?Array.from(n.measureLine.geometry.attributes.position.array):null,context:r.type};
});}
async function shot(page:any,name:string){
  expect(looksBlank(await harness.glPixels(page))).toBe(false);
  await page.locator('.sx-stage').screenshot({path:path.join(out,name+'.png')});
}
test('eight orbital radii keep their measured ratios through deep inspection',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await mount(page);await fly(page,'solar-system');const before=await system(page),canvas=page.locator('[data-atlas-ready]');
  expect(before.span).toBeCloseTo(3,8);expect(before.paths).toHaveLength(8);expect(before.belt).toBe(1600);
  const earthRadius=Math.hypot(...before.positions[2].p);
  for(let i=0;i<8;i++){const p=before.positions[i],orbit=before.paths[i];expect(Math.hypot(...p.p)/earthRadius).toBeCloseTo(orbit.au/1.00000261,8);
    expect(Math.hypot(...orbit.points.slice(0,3) as number[])).toBeCloseTo(Math.hypot(...p.p),7);}
  expect(Math.hypot(...before.positions[7].p)).toBeCloseTo(.5,8);await shot(page,'system-overview');
  const controls=page.getByRole('region',{name:'Explore the planetary system',exact:true});
  await controls.getByRole('button',{name:'Explore inner planets',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-zoom','24.00');
  const inner=await system(page);expect(inner.paths).toEqual(before.paths);expect(inner.positions.map(p=>p.p)).toEqual(before.positions.map(p=>p.p));expect(inner.span).toBe(before.span);
  await expect(page.getByRole('slider',{name:'Inspection magnification',exact:true})).toHaveAttribute('max','32');
  await shot(page,'inner-planets');
  for(const [id,label] of [['earth-orbit','Earth'],['saturn-orbit','Saturn'],['asteroid-belt','The asteroid belt']] as const){
    await page.locator('.sx-details').getByRole('button',{name:label,exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-detail',id);
    if(id==='earth-orbit'){await expect(canvas).toHaveAttribute('data-atlas-zoom','32.00');const earth=await system(page);expect(earth.ray!.slice(3)).toEqual(earth.positions[2].p.map(Math.fround));}
    await shot(page,id);
  }
  await controls.getByRole('button',{name:'Whole system',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-zoom','1.00');expect((await system(page)).paths).toEqual(before.paths);expect(errors).toEqual([]);
});
test('phone keyboard exploration restores deep observations and enters a detailed world',async({page})=>{
  await mount(page);await page.setViewportSize({width:320,height:780});await fly(page,'solar-system');const canvas=page.locator('[data-atlas-ready]');
  const earth=page.locator('.sx-details').getByRole('button',{name:'Earth',exact:true});await earth.focus();await earth.press('Enter');
  await expect(canvas).toHaveAttribute('data-atlas-zoom','32.00');await shot(page,'phone-earth-orbit');
  const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox').fill('All the rocky planets fit near the Sun.');
  await book.getByRole('button',{name:'Save observation',exact:true}).click();
  const controls=page.getByRole('region',{name:'Explore the planetary system',exact:true});
  await controls.getByRole('button',{name:'Whole system',exact:true}).click();
  await book.locator('[data-observation="solar-system:earth-orbit"]').getByRole('button',{name:/^Return to/}).click();
  await expect(canvas).toHaveAttribute('data-atlas-detail','earth-orbit');await expect(canvas).toHaveAttribute('data-atlas-zoom','32.00');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await controls.getByRole('button',{name:'Explore Earth at its own scale',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-atlas-objects','earth');await expect(canvas).toHaveAttribute('data-atlas-zoom','1.00');
  await expect(page.getByRole('slider',{name:'Inspection magnification',exact:true})).toHaveAttribute('max','2.5');
  await fly(page,'solar-system');await controls.getByRole('button',{name:'Visit the Sun',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-objects','sun');
});
test('orbital system comparisons preserve physical dimensions after close inspection',async({page})=>{
  await mount(page);await fly(page,'solar-system');await page.getByRole('button',{name:'Explore inner planets',exact:true}).click();
  const panel=page.locator('.sx-comparison-workbench');await panel.locator(':scope > summary').click();
  await panel.getByRole('combobox',{name:'First thing',exact:true}).selectOption('solar-system');
  await panel.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('sun');await panel.getByRole('button',{name:'Compare them',exact:true}).click();
  const canvas=page.locator('[data-atlas-ready]');await expect(canvas).toHaveAttribute('data-atlas-projection','orthographic');
  const ratio=await page.evaluate(()=>{const r=(window as any).__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()),roots:any={};r.scene.traverse((o:any)=>{if(o.userData.itemId)roots[o.userData.itemId]=o;});return roots['solar-system'].scale.x/roots.sun.scale.x;});
  expect(ratio).toBeCloseTo(9e12/1.392e9,6);expect((await system(page)).ray).toBeNull();await shot(page,'system-sun-comparison');
});
test('the orbital scene works in WebGL 1 without shader errors',async({page})=>{
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;(HTMLCanvasElement.prototype as any).getContext=function(type:string,...args:any[]){if(type==='webgl2')return null;return original.apply(this,[type,...args] as any);};});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await mount(page);await fly(page,'solar-system');expect((await system(page)).context).toBe('webgl');
  await page.locator('.sx-details').getByRole('button',{name:'Saturn',exact:true}).click();await shot(page,'saturn-webgl1');expect(errors).toEqual([]);
});

test('deep approaches remain smooth with ambience paused and stop drawing when settled',async({page})=>{
  await mount(page);await fly(page,'solar-system');await page.emulateMedia({reducedMotion:'no-preference'});
  await page.getByRole('button',{name:'Pause ambience',exact:true}).click();const canvas=page.locator('[data-atlas-ready]');
  await page.evaluate(()=>{(window as any).__orbitFrames=[];});
  await page.getByRole('button',{name:'Explore inner planets',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-atlas-zoom','24.00');
  await expect.poll(()=>page.evaluate(()=>{const f=(window as any).__orbitFrames;return f.length;})).toBeGreaterThan(10);
  // The displayed zoom rounds to two decimals before the camera finishes settling.
  const renders=()=>page.evaluate(()=>(window as any).__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()).renders);
  await expect.poll(async()=>{const count=await renders();await page.waitForTimeout(250);return(await renders())===count;},{timeout:8000}).toBe(true);
  const frames=await page.evaluate(()=>(window as any).__orbitFrames as number[]);
  expect(frames.filter(v=>v>1&&v<23.99).length).toBeGreaterThan(8);
  for(let i=1;i<frames.length;i++)expect(frames[i]).toBeGreaterThanOrEqual(frames[i-1]);
  const count=await renders();await page.waitForTimeout(300);expect(await renders()).toBe(count);
  await page.getByRole('region',{name:'Explore the planetary system',exact:true}).getByRole('button',{name:'Whole system',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-atlas-zoom','1.00');
});
