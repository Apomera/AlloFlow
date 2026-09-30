import { test, expect } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({mode:'serial',retries:0,timeout:180000});
test.use({video:'off',trace:'off'});
const out=path.resolve('reports/scale-explorer-nebula');
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js'],probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__nebulaCamera=c;return render.apply(this,arguments);};return r;}});`});
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
async function nebula(page:any){return page.evaluate(()=>{
  const w=window as any,T=w.THREE,record=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()),camera=w.__nebulaCamera;let root:any;
  record.scene.traverse((o:any)=>{if(o.userData.itemId==='orion-nebula')root=o;});const g=root.userData.model,n=g.userData.nebula;
  const aim=new T.Vector3().fromArray(document.querySelector('[data-atlas-ready]')!.getAttribute('data-atlas-aim')!.split(',').map(Number));
  return {scale:root.scale.x,span:g.localToWorld(new T.Vector3(.5,0,0)).distanceTo(g.localToWorld(new T.Vector3(-.5,0,0))),
    positions:Array.from(n.stars.geometry.attributes.position.array),texture:n.cloud.material.uniforms.uVolume.value.uuid,
    cloud:n.reveal.value,eye:n.eye.value.toArray(),direction:n.direction.value.toArray(),orthographic:n.orthographic.value,
    aligned:camera.getWorldDirection(new T.Vector3()).dot(aim.sub(camera.position).normalize()),rotation:g.rotation.toArray(),context:record.type};
});}
async function pixels(page:any){const result=await harness.glPixels(page);expect(looksBlank(result)).toBe(false);return readPng(result!.png);}
function brightness(p:any){let sum=0,count=0;for(let y=Math.floor(p.height*.32);y<p.height*.72;y+=3)for(let x=Math.floor(p.width*.32);x<p.width*.68;x+=3){const c=p.at(x,y);sum+=(c[0]+c[1]+c[2])/3;count++;}return sum/count;}
function difference(a:any,b:any){let sum=0,count=0;for(let y=Math.floor(a.height*.3);y<a.height*.75;y+=3)for(let x=Math.floor(a.width*.3);x<a.width*.7;x+=3){const c=a.at(x,y),d=b.at(x,y);sum+=(Math.abs(c[0]-d[0])+Math.abs(c[1]-d[1])+Math.abs(c[2]-d[2]))/3;count++;}return sum/count;}

test('ray-marched gas changes with orbit and visibility without moving stars or measured bounds',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await mount(page);await fly(page,'orion-nebula');const canvas=page.locator('[data-atlas-ready]'),before=await nebula(page);
  expect(before.span).toBeCloseTo(3,8);expect(before.cloud).toBe(1);expect(before.orthographic).toBe(0);
  await expect(page.locator('.sx-hud')).toContainText('24 light years');
  const front=await pixels(page);await page.locator('.sx-stage').screenshot({path:path.join(out,'cloud-front.png')});
  const reveal=page.getByRole('button',{name:'Reveal embedded stars',exact:true});await reveal.click();await expect(canvas).toHaveAttribute('data-atlas-cloud','revealed');
  const clear=await nebula(page);expect(clear.span).toBe(before.span);expect(clear.positions).toEqual(before.positions);expect(clear.texture).toBe(before.texture);
  const through=await pixels(page);expect(brightness(through)).toBeLessThan(brightness(front)*.8);
  await page.locator('.sx-stage').screenshot({path:path.join(out,'stars-revealed.png')});
  await reveal.click();await expect(canvas).toHaveAttribute('data-atlas-cloud','natural');
  for(let i=0;i<6;i++)await page.getByRole('button',{name:'Orbit right',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-yaw','1.2000');
  const side=await nebula(page);expect(side.eye).not.toEqual(before.eye);expect(side.positions).toEqual(before.positions);expect(side.span).toBe(before.span);
  expect(difference(front,await pixels(page))).toBeGreaterThan(4);
  await page.locator('.sx-stage').screenshot({path:path.join(out,'cloud-side.png')});expect(errors).toEqual([]);
});

test('four landmarks and an orthographic comparison keep the nebula at its catalog scale',async({page})=>{
  await mount(page);await fly(page,'orion-nebula');const canvas=page.locator('[data-atlas-ready]'),before=await nebula(page),details=page.locator('.sx-details');
  for(const [id,label,revealed] of [['trapezium','Trapezium stars',true],['stellar-cavity','Sculpted stellar cavity',false],['ionization-front','Glowing cloud front',false],['dust-ridge','Dark dust ridge',false]] as const){
    await details.getByRole('button',{name:label,exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-detail',id);await expect(canvas).toHaveAttribute('data-atlas-cloud',revealed?'revealed':'natural');
    const current=await nebula(page);expect(current.span).toBe(before.span);expect(current.positions).toEqual(before.positions);expect(current.aligned).toBeGreaterThan(.99999);
    await expect(page.locator('.sx-marker[aria-pressed="true"]')).toBeVisible();
    await expect(details.getByRole('link',{name:'Read the science source',exact:true})).toHaveAttribute('href',/^https:/);
    await page.locator('.sx-stage').screenshot({path:path.join(out,id+'.png')});
  }
  const panel=page.locator('.sx-comparison-workbench');await panel.locator(':scope > summary').click();
  await panel.getByRole('combobox',{name:'First thing',exact:true}).selectOption('orion-nebula');await panel.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('solar-system');
  await panel.getByRole('button',{name:'Compare them',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-projection','orthographic');expect((await nebula(page)).orthographic).toBe(1);
  const ratio=await page.evaluate(()=>{const r=(window as any).__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()),roots:any={};r.scene.traverse((o:any)=>{if(o.userData.itemId)roots[o.userData.itemId]=o;});return roots['orion-nebula'].scale.x/roots['solar-system'].scale.x;});
  expect(ratio).toBeCloseTo(2.27e17/9e12,6);await pixels(page);await page.locator('.sx-stage').screenshot({path:path.join(out,'nebula-solar-system.png')});
});

test('phone keyboard exploration restores and exports cloud visibility in the notebook',async({page})=>{
  await mount(page);await page.setViewportSize({width:320,height:780});await fly(page,'orion-nebula');
  const target=page.locator('.sx-details').getByRole('button',{name:'Trapezium stars',exact:true});await target.focus();await target.press('Enter');
  const canvas=page.locator('[data-atlas-ready]');await expect(canvas).toHaveAttribute('data-atlas-detail','trapezium');await expect(canvas).toHaveAttribute('data-atlas-cloud','revealed');await expect(canvas).toBeInViewport();
  await page.locator('.sx-stage').screenshot({path:path.join(out,'phone-trapezium.png')});
  const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox').fill('Dust changes which stars I can see.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
  await page.locator('.sx-details').getByRole('button',{name:'Dark dust ridge',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-cloud','natural');
  await book.locator('[data-observation="orion-nebula:trapezium"]').getByRole('button',{name:/^Return to/}).click();await expect(canvas).toHaveAttribute('data-atlas-cloud','revealed');await expect(canvas).toHaveAttribute('data-atlas-detail','trapezium');
  await expect(book.getByRole('textbox')).toHaveValue('Dust changes which stars I can see.');
  const downloaded=page.waitForEvent('download');await book.getByRole('button',{name:'Download notes',exact:true}).click();const file=await downloaded;
  const text=readFileSync((await file.path())!,'utf8');expect(text).toContain('Cloud visibility: reduced to reveal embedded stars.');expect(text).toContain('Recorded size: 24 light years across');expect(text).toContain('2.3 × 10¹⁷ m');expect(text).toContain('Dust changes which stars I can see.');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('the cloud and its stars render with a WebGL 1 context',async({page})=>{
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;(HTMLCanvasElement.prototype as any).getContext=function(type:string,...args:any[]){if(type==='webgl2')return null;return original.apply(this,[type,...args] as any);};});
  const errors:string[]=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
  await mount(page);await fly(page,'orion-nebula');expect((await nebula(page)).context).toBe('webgl');await pixels(page);expect(errors).toEqual([]);
});
