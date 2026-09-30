import { test, expect } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
test.describe.configure({mode:'serial',retries:0,timeout:180000});
test.use({video:'off',trace:'off'});
const out=path.resolve('reports/scale-explorer-galaxy');
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js']});
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
async function galaxy(page:any){return page.evaluate(()=>{
  const w=window as any,T=w.THREE,record=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;
  record.scene.traverse((o:any)=>{if(o.userData.itemId==='milkyway')root=o;});const g=root.userData.model,n=g.userData.galaxy;
  return {span:g.localToWorld(new T.Vector3(.5,0,0)).distanceTo(g.localToWorld(new T.Vector3(-.5,0,0))),
    positions:Array.from(n.stars.geometry.attributes.position.array),texture:n.cloud.material.uniforms.uVolume.value.uuid,
    direction:n.direction.value.toArray(),eye:n.eye.value.toArray(),orthographic:n.orthographic.value,rotation:g.rotation.toArray(),context:record.type};
});}
function difference(a:any,b:any){let sum=0,count=0;for(let y=Math.floor(a.height*.3);y<a.height*.8;y+=4)for(let x=Math.floor(a.width*.25);x<a.width*.75;x+=4){const c=a.at(x,y),d=b.at(x,y);sum+=(Math.abs(c[0]-d[0])+Math.abs(c[1]-d[1])+Math.abs(c[2]-d[2]))/3;count++;}return sum/count;}
async function pixels(page:any){const p=await harness.glPixels(page);expect(looksBlank(p)).toBe(false);return readPng(p!.png);}
test('a volumetric barred galaxy renders distinct face-on and edge-on views at one measured diameter',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await mount(page);await fly(page,'milkyway');const before=await galaxy(page),canvas=page.locator('[data-atlas-ready]');
  expect(before.span).toBeCloseTo(3,8);expect(before.positions.length).toBe(22001*3);
  const sun=before.positions.slice(-3) as number[];expect(Math.hypot(...sun)).toBeCloseTo(.26,3);
  await page.locator('.sx-stage').screenshot({path:path.join(out,'galaxy-overview.png')});await pixels(page);
  const views=page.getByRole('region',{name:'Galaxy viewpoint',exact:true});
  await views.getByRole('button',{name:'View from above',exact:true}).click();await expect.poll(async()=>(await galaxy(page)).direction[1]).toBeCloseTo(-1,6);const above=await galaxy(page);
  expect(above.direction[1]).toBeCloseTo(-1,6);await expect(canvas).toHaveAttribute('data-atlas-detail','spiral-arms');
  const face=await pixels(page);await page.locator('.sx-stage').screenshot({path:path.join(out,'galaxy-from-above.png')});
  await views.getByRole('button',{name:'View edge-on',exact:true}).click();await expect.poll(async()=>(await galaxy(page)).direction[2]).toBeCloseTo(-1,6);const edge=await galaxy(page);
  expect(edge.direction[2]).toBeCloseTo(-1,6);expect(edge.span).toBe(before.span);expect(edge.positions).toEqual(before.positions);expect(edge.texture).toBe(before.texture);
  expect(difference(face,await pixels(page))).toBeGreaterThan(2);await page.locator('.sx-stage').screenshot({path:path.join(out,'galaxy-edge-on.png')});
  await page.getByRole('button',{name:'Orbit right',exact:true}).click();await expect.poll(async()=>(await galaxy(page)).direction).not.toEqual(edge.direction);
  await views.getByRole('button',{name:'View edge-on',exact:true}).click();await expect.poll(async()=>(await galaxy(page)).direction[2]).toBeCloseTo(-1,6);
  for(const [id,label] of [['solar-neighbourhood','Our Sun’s neighbourhood'],['central-bar','Central bar & bulge']] as const){
    await page.locator('.sx-details').getByRole('button',{name:label,exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-detail',id);
    await expect(page.locator('.sx-marker[aria-pressed="true"]')).toBeVisible();expect((await galaxy(page)).span).toBe(before.span);
    await page.locator('.sx-stage').screenshot({path:path.join(out,id+'.png')});
  }
  expect(errors).toEqual([]);
});
test('galaxy and nebula comparisons retain the catalog ratio and both volume projections',async({page})=>{
  await mount(page);await fly(page,'milkyway');const panel=page.locator('.sx-comparison-workbench');
  await panel.locator(':scope > summary').click();await panel.getByRole('combobox',{name:'First thing',exact:true}).selectOption('milkyway');
  await panel.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('orion-nebula');await panel.getByRole('button',{name:'Compare them',exact:true}).click();
  await expect(page.locator('[data-atlas-ready]')).toHaveAttribute('data-atlas-projection','orthographic');expect((await galaxy(page)).orthographic).toBe(1);
  const pair=await page.evaluate(()=>{const r=(window as any).__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()),roots:any={};r.scene.traverse((o:any)=>{if(o.userData.itemId)roots[o.userData.itemId]=o;});return{ratio:roots.milkyway.scale.x/roots['orion-nebula'].scale.x,nebula:roots['orion-nebula'].userData.model.userData.nebula.orthographic.value};});
  expect(pair.ratio).toBeCloseTo(9.5e20/2.27e17,6);expect(pair.nebula).toBe(1);await pixels(page);await page.locator('.sx-stage').screenshot({path:path.join(out,'galaxy-nebula-comparison.png')});
});
test('phone keyboard landmarks save their viewpoint and lead into the Solar System',async({page})=>{
  await mount(page);await page.setViewportSize({width:320,height:780});await fly(page,'milkyway');const views=page.getByRole('region',{name:'Galaxy viewpoint',exact:true}),canvas=page.locator('[data-atlas-ready]');
  const edge=views.getByRole('button',{name:'View edge-on',exact:true});await edge.focus();await edge.press('Enter');await expect.poll(async()=>(await galaxy(page)).direction[2]).toBeCloseTo(-1,6);const before=await galaxy(page);
  await page.locator('.sx-stage').screenshot({path:path.join(out,'phone-edge-on.png')});
  const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox').fill('Dust hides the thin disc.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
  await views.getByRole('button',{name:'View from above',exact:true}).click();await book.locator('[data-observation="milkyway:galactic-disc"]').getByRole('button',{name:/^Return to/}).click();
  await expect(canvas).toHaveAttribute('data-atlas-detail','galactic-disc');await expect.poll(async()=>((await galaxy(page)).direction as number[]).reduce((sum,v,i)=>sum+v*before.direction[i],0)).toBeGreaterThan(.999999);
  await page.locator('.sx-details').getByRole('button',{name:'Our Sun’s neighbourhood',exact:true}).click();await page.locator('.sx-stage').screenshot({path:path.join(out,'phone-solar-neighbourhood.png')});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await views.getByRole('button',{name:'Visit the Solar System',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-objects','solar-system');
  await expect.poll(()=>canvas.evaluate((c:HTMLElement)=>Math.abs(Number(c.dataset.atlasExponent)-Math.log10(9e12)))).toBeLessThan(.002);
});
test('the galactic volume remains visible in WebGL 1 without shader errors',async({page})=>{
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;(HTMLCanvasElement.prototype as any).getContext=function(type:string,...args:any[]){if(type==='webgl2')return null;return original.apply(this,[type,...args] as any);};});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await mount(page);await fly(page,'milkyway');expect((await galaxy(page)).context).toBe('webgl');await pixels(page);
  await page.getByRole('button',{name:'View edge-on',exact:true}).click();await pixels(page);expect(errors).toEqual([]);
});
