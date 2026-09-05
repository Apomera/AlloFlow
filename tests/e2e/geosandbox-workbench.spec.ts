import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
const root=process.cwd();
const original=readFileSync(resolve(root,'tests/e2e/19-geosandbox-gl.spec.ts'),'utf8');
let html=original.match(/const HARNESS = `([\s\S]*?)`;\r?\n/)![1];
html=html.replace('var ctx = {','var ctx = window.__ctx = {');
const css=readdirSync(resolve(root,'app/static/css')).find(x=>/^main\..*\.css$/.test(x));
html=html.replace('</head>','<link rel="stylesheet" href="/app/static/css/'+css+'"><style>#wrap{width:100%;height:auto;min-height:100vh;display:block}#allo-geo-sandbox{width:100%}</style></head>');
let server:ReturnType<typeof createServer>,base:string;
test.beforeAll(async()=>{server=createServer((req,res)=>{const url=new URL(req.url||'/','http://localhost');if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}const file=resolve(root,'.'+url.pathname);if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'} as any)[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404);res.end();}});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+(server.address() as any).port;});
test.afterAll(async()=>{await new Promise<void>(r=>server.close(()=>r()));});
const box=(size=[1,1,1])=>({shape:'box',size,position:[0,.5,0],rotation:[0,0,0],color:'#60a5fa'});
async function mount(page:any,state:any){await page.goto(base+'/');await page.evaluate((s:any)=>(window as any).__mount(s),state);await page.waitForFunction(()=>!!(window as any)._geoScene);}
async function select(page:any){await page.getByRole('button',{name:/Edit by hand/}).click();await page.getByRole('button',{name:'1 box',exact:true}).click();}
async function state(page:any){return page.evaluate(()=>(window as any).__toolData.geoSandbox);}
test('whole-object undo preserves earlier part edits and supports redo without AI',async({page})=>{await mount(page,{mode:'sculpt',sculptRecipe:{parts:[box()]}});await select(page);await page.getByRole('button',{name:'Move x positive',exact:true}).click();const x=(await state(page)).sculptRecipe.parts[0].position[0];await page.getByRole('button',{name:'🔍+ Bigger',exact:true}).click();await page.getByRole('button',{name:'↶ Undo',exact:true}).click();expect((await state(page)).sculptRecipe.parts[0].position[0]).toBe(x);expect((await state(page)).sculptRecipe.scale).toBe(1);await page.getByRole('button',{name:'Redo',exact:true}).click();expect((await state(page)).sculptRecipe.scale).toBe(1.25);});
test('a size-limited investigation does not display an imaginary growth ratio',async({page})=>{await mount(page,{mode:'sculpt',sculptRecipe:{parts:[box([4,4,4])]}});await select(page);const panel=page.locator('[data-geo-sculpt-investigation]');await panel.getByRole('button',{name:'Start',exact:true}).click();await panel.getByRole('button',{name:'Volume',exact:true}).click();await page.getByRole('button',{name:'Scale selected part ×1.25',exact:true}).click();await expect(panel).not.toContainText('1.953');await expect(page.locator('.geo-status')).toContainText('cannot grow');expect((await state(page)).sculptRecipe.parts[0].size).toEqual([4,4,4]);});
test('challenge isolation returns to the unmodified sculpture',async({page})=>{const recipe={name:'Keep me',parts:[box()]};await mount(page,{mode:'sculpt',sculptRecipe:recipe});await page.getByRole('button',{name:'Challenge',exact:true}).click();expect((await state(page)).mode).toBe('single');await page.getByRole('button',{name:'Exit',exact:true}).click();expect((await state(page)).mode).toBe('sculpt');expect((await state(page)).sculptRecipe).toEqual(recipe);});
test('identification questions conceal the answer across the workspace',async({page})=>{await mount(page,{mode:'single',challengeMode:true,challenge:{type:'identify',shapeId:'box',answer:'Rectangular Prism',shapeName:'Rectangular Prism',question:'What type of solid is this?',dimDesc:'W=3 H=3 D=3'}});await expect(page.locator('#allo-geo-sandbox')).not.toContainText('Rectangular Prism');await expect(page.locator('#geo-control-sidebar')).toHaveCount(0);});
test('a transient WebGL failure can recover through Retry',async({page})=>{await page.goto(base+'/');await page.evaluate(()=>{const w=window as any;w.__oldRenderer=w.THREE.WebGLRenderer;w.THREE.WebGLRenderer=function(){throw Error('Transient test failure');};w.__mount({mode:'single'});});await page.getByRole('button',{name:'Retry',exact:true}).waitFor();await page.evaluate(()=>{const w=window as any;w.THREE.WebGLRenderer=w.__oldRenderer;});await page.getByRole('button',{name:'Retry',exact:true}).click();await page.waitForFunction(()=>!!(window as any)._geoScene);await expect(page.locator('#geo-sandbox-canvas')).toBeVisible();});
test('mobile canvas tracks its parent and appears before editing controls',async({page})=>{await page.setViewportSize({width:390,height:844});await mount(page,{mode:'sculpt',sculptRecipe:{parts:[box()]}});const sizes=await page.evaluate(()=>{const a=document.getElementById('geo-viewport-shell')!.getBoundingClientRect(),b=document.getElementById('geo-sandbox-canvas')!.getBoundingClientRect(),c=document.getElementById('geo-control-sidebar')!.getBoundingClientRect();return{scene:a.y,controls:c.y,delta:Math.abs(a.width-b.width)};});expect(sizes.scene).toBeLessThan(sizes.controls);expect(sizes.delta).toBeLessThan(4);});
test('immersive refresh resumes its saved edit and modifier shortcuts leave geometry unchanged',async({page})=>{await page.goto(base+'/immersive_geometry/immersive_geometry.html?d=2&L=2.1&W=1.1&H=1.1&axis=0');await page.waitForFunction(()=>!!(document.querySelector('#figure') as any)?.components?.['stretch-lab']);await page.locator('#uiGrow').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('alloflow_stretch_lab_v1')||'{}').L===2.35);await page.reload();await page.waitForFunction(()=>!!(document.querySelector('#figure') as any)?.components?.['stretch-lab']);expect(await page.evaluate(()=>(document.querySelector('#figure') as any).components['stretch-lab'].L)).toBe(2.35);await page.locator('canvas').click({position:{x:700,y:400}});const axis=await page.evaluate(()=>(document.querySelector('#figure') as any).components['stretch-lab'].axis);await page.keyboard.press('Control+a');expect(await page.evaluate(()=>(document.querySelector('#figure') as any).components['stretch-lab'].axis)).toBe(axis);});
test('immersive mobile controls leave space for geometry and can collapse',async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto(base+'/immersive_geometry/immersive_geometry.html');await page.waitForFunction(()=>!!(document.querySelector('#figure') as any)?.components?.['stretch-lab']);expect(await page.locator('#hud').evaluate(e=>e.getBoundingClientRect().height)).toBeLessThan(422);await page.locator('#uiHudToggle').click();await expect(page.locator('#hudBody')).toBeHidden();expect(await page.locator('#hud').evaluate(e=>e.getBoundingClientRect().height)).toBeLessThan(80);});


test('group movement preserves spacing at the boundary and respects member locks', async ({page}) => {
  const left={...box(),group:'pair',position:[3.95,.5,0]};
  const right={...box(),group:'pair',position:[2,.5,0]};
  await mount(page,{mode:'sculpt',sculptRecipe:{parts:[left,right]},sculptMoveGroup:true});
  await select(page);
  await page.getByRole('button',{name:'Move x positive',exact:true}).click();
  let parts=(await state(page)).sculptRecipe.parts;
  expect(parts[0].position[0]).toBe(4);
  expect(parts[1].position[0]).toBeCloseTo(2.05,10);
  await page.getByRole('button',{name:'↶ Undo',exact:true}).click();
  parts=(await state(page)).sculptRecipe.parts;
  expect(parts[0].position[0]).toBe(3.95);
  expect(parts[1].position[0]).toBe(2);
  await mount(page,{mode:'sculpt',sculptRecipe:{parts:[left,{...right,locked:true}]},sculptMoveGroup:true});
  await select(page);
  await page.getByRole('button',{name:'Move x positive',exact:true}).click();
  expect((await state(page)).sculptRecipe.parts[0].position[0]).toBe(3.95);
  await expect(page.locator('.geo-status')).toContainText('Unlock');
});

test('one drag is one undo transaction and the next edit remains separate', async ({page}) => {
  await mount(page,{mode:'sculpt',sculptRecipe:{parts:[box()]}});
  await select(page);
  await page.evaluate(()=>(window as any)._geoBeginSculptDrag());
  await page.evaluate(()=>(window as any)._geoNudgeSculptPart('x',2));
  await page.evaluate(()=>(window as any)._geoNudgeSculptPart('x',2));
  await page.evaluate(()=>(window as any)._geoEndSculptDrag());
  expect((await state(page)).sculptRecipe.parts[0].position[0]*2.6).toBeCloseTo(2,10);
  await page.getByRole('button',{name:'↶ Undo',exact:true}).click();
  expect((await state(page)).sculptRecipe.parts[0].position[0]).toBe(0);
  await page.getByRole('button',{name:'Redo',exact:true}).click();
  await page.getByRole('button',{name:'Move x positive',exact:true}).click();
  await page.getByRole('button',{name:'↶ Undo',exact:true}).click();
  expect((await state(page)).sculptRecipe.parts[0].position[0]*2.6).toBeCloseTo(2,10);
});

test('move steps use display units at any whole-sculpt scale', async ({page}) => {
  await mount(page,{mode:'sculpt',sculptRecipe:{parts:[box()],scale:2},sculptStep:0.25});
  await select(page);
  await page.getByRole('button',{name:'Move x positive',exact:true}).click();
  expect((await state(page)).sculptRecipe.parts[0].position[0]*5.2).toBeCloseTo(0.25,10);
  await expect(page.locator('[data-geo-sculpt-math-overlay]')).toContainText('Moved X +0.25 u');
});


test('undoing an asynchronous AI result restores hand edits made while it was pending', async ({page}) => {
  await mount(page,{mode:'sculpt',sculptRecipe:{parts:[box()]}});
  await select(page);
  await page.evaluate(() => {
    const w=window as any;
    w.__ctx.callGemini=()=>new Promise(resolve=>{w.__finishAI=resolve;});
    w.__ctx.update('geoSandbox','sculptStep',0.5);
  });
  await page.getByRole('button',{name:'✨ Regenerate',exact:true}).click();
  await page.getByRole('button',{name:'Move x positive',exact:true}).click();
  const position=(await state(page)).sculptRecipe.parts[0].position[0];
  await page.evaluate(()=>(window as any).__finishAI(JSON.stringify({parts:[{shape:'sphere',size:[1],position:[0,1,0],color:'#60a5fa'}]})));
  await page.waitForFunction(()=>(window as any).__toolData.geoSandbox.sculptRecipe.parts[0].shape==='sphere');
  await page.getByRole('button',{name:'↶ Undo',exact:true}).click();
  expect((await state(page)).sculptRecipe.parts[0].shape).toBe('box');
  expect((await state(page)).sculptRecipe.parts[0].position[0]).toBe(position);
});
