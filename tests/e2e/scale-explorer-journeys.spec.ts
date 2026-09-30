import { test, expect } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
test.describe.configure({mode:'serial',retries:0,timeout:180000});
test.use({video:'off',trace:'off'});
const out=path.resolve('reports/scale-explorer-journeys');
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js'],probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__routeCamera=c;return render.apply(this,arguments);};return r;}});`});
test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});
async function mount(page:any){
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1400,height:1100});
  await harness.mount(page,{},'!!document.querySelector("[data-atlas-ready]")');
  await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
}
const canvas=(p:any)=>p.locator('[data-atlas-ready]');
async function fly(page:any,id:string){
  await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);
  await expect(canvas(page)).toHaveAttribute('data-atlas-objects',id);
  await expect.poll(()=>canvas(page).evaluate((c:HTMLElement)=>Math.abs(Number(c.dataset.atlasExponent)-Number(c.dataset.atlasTarget)))).toBeLessThan(.002);
}
async function point(page:any,id:string){return page.evaluate(id=>{
  const w=window as any,T=w.THREE,r=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;
  r.scene.traverse((o:any)=>{if(o.userData.itemId==='solar-system')root=o;});
  const n=root.userData.model.userData.solarSystem,b=id==='sun'?n.star:n.bodies.find((b:any)=>b.userData.planetId===id);
  const p=b.getWorldPosition(new T.Vector3()).project(w.__routeCamera),box=r.canvas.getBoundingClientRect();
  return{x:box.x+(p.x*.5+.5)*box.width,y:box.y+(-p.y*.5+.5)*box.height,localX:(p.x*.5+.5)*box.width,localY:(-p.y*.5+.5)*box.height};
},id);}
async function enter(page:any){await page.getByRole('region',{name:'Continue the journey',exact:true}).getByRole('button').click();}
async function cameraState(page:any){return canvas(page).evaluate((c:HTMLElement)=>({yaw:c.dataset.atlasYaw,zoom:c.dataset.atlasZoom,aim:c.dataset.atlasAim,detail:c.dataset.atlasDetail,exp:c.dataset.atlasExponent}));}

test('worlds respond to hover and direct selection, while dragging and empty space keep the view',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);await fly(page,'solar-system');await canvas(page).scrollIntoViewIfNeeded();
  let p=await point(page,'jupiter');await page.mouse.move(p.x,p.y);await expect(page.locator('.sx-orbit-hover')).toBeVisible();await expect(page.locator('.sx-orbit-hover')).toContainText('Jupiter · 5.20 AU');
  await page.locator('.sx-stage').screenshot({path:path.join(out,'hover-jupiter.png')});
  await page.mouse.click(p.x,p.y);await expect(canvas(page)).toHaveAttribute('data-atlas-detail','jupiter-orbit');await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','9.00');
  await expect(page.getByRole('region',{name:'Continue the journey'})).toContainText('4.8');
  await expect(page.locator('.sx-orbit-hover')).toBeHidden();expect(looksBlank(await harness.glPixels(page))).toBe(false);
  await page.locator('.sx-stage').screenshot({path:path.join(out,'jupiter-entry.png')});
  p=await point(page,'jupiter');const before=await cameraState(page);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+65,p.y+8,{steps:6});await page.mouse.up();
  await expect(canvas(page)).toHaveAttribute('data-atlas-detail','jupiter-orbit');await expect.poll(async()=>(await cameraState(page)).yaw).not.toBe(before.yaw);
  const box=(await canvas(page).boundingBox())!;await page.mouse.click(box.x+35,box.y+box.height-80);await expect(canvas(page)).toHaveAttribute('data-atlas-detail','jupiter-orbit');
  await page.mouse.move(box.x-5,box.y+box.height/2);await expect(page.locator('.sx-orbit-hover')).toBeHidden();expect(errors).toEqual([]);
});

test('nested journeys restore each camera and landmark without writing notebook observations',async({page})=>{
  await mount(page);await fly(page,'milkyway');
  await page.locator('.sx-details').getByRole('button',{name:'Our Sun’s neighbourhood',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','solar-neighbourhood');
  const previousYaw=await canvas(page).getAttribute('data-atlas-yaw');await page.getByRole('button',{name:'Orbit right',exact:true}).click();await expect.poll(()=>canvas(page).getAttribute('data-atlas-yaw')).not.toBe(previousYaw);
  const galaxy=await cameraState(page);await enter(page);await expect(canvas(page)).toHaveAttribute('data-atlas-objects','solar-system');
  await page.getByRole('button',{name:'Explore inner planets',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','24.00');await canvas(page).scrollIntoViewIfNeeded();
  const p=await point(page,'earth');await page.mouse.click(p.x,p.y);await expect(canvas(page)).toHaveAttribute('data-atlas-detail','earth-orbit');
  await page.getByRole('button',{name:'Orbit right',exact:true}).click();
  const zoom=page.getByRole('slider',{name:'Inspection magnification',exact:true});await zoom.fill('28');await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','28.00');const orbit=await cameraState(page);
  await enter(page);await expect(canvas(page)).toHaveAttribute('data-atlas-objects','earth');await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','1.00');
  const route=page.getByRole('navigation',{name:'Your exploration route',exact:true});await expect(route.getByRole('button')).toHaveCount(2);
  const surface=await page.evaluate(()=>{
    const w=window as any,T=w.THREE,r=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;
    r.scene.traverse((o:any)=>{if(o.userData.itemId==='earth')root=o;});
    const p=root.userData.model.localToWorld(new T.Vector3()).project(w.__routeCamera),box=r.canvas.getBoundingClientRect(),x=box.x+(p.x*.5+.5)*box.width,y=box.y+(-p.y*.5+.5)*box.height;
    for(const dx of [0,30,-30,60])for(const dy of [0,30,-30])if(document.elementFromPoint(x+dx,y+dy)===r.canvas)return{x:x+dx,y:y+dy};return null;
  });
  expect(surface).not.toBeNull();await page.mouse.click(surface!.x,surface!.y);await page.evaluate(()=>new Promise(requestAnimationFrame));
  await expect(route.getByRole('button')).toHaveCount(2);
  await page.locator('.sx-route').screenshot({path:path.join(out,'galaxy-system-earth-route.png')});
  await route.getByRole('button',{name:'Return to The Solar System',exact:true}).click();
  await expect.poll(()=>cameraState(page)).toEqual(orbit);await expect(canvas(page)).toBeFocused();await expect(route.getByRole('button')).toHaveCount(1);
  await route.getByRole('button',{name:'Return to The Milky Way galaxy',exact:true}).click();await expect.poll(()=>cameraState(page)).toEqual(galaxy);await expect(route).toHaveCount(0);
  expect(await page.evaluate(()=>((window as any).__toolData._scaleExplorer.observations||[]).length)).toBe(0);
});

test('phone touch targets and keyboard return preserve an orbital view through a detailed world',async({page})=>{
  await mount(page);await page.setViewportSize({width:320,height:780});await fly(page,'solar-system');
  await page.getByRole('button',{name:'Explore inner planets',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','24.00');await canvas(page).scrollIntoViewIfNeeded();
  const p=await point(page,'earth'),cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:p.x+14,y:p.y,radiusX:4,radiusY:4,force:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(canvas(page)).toHaveAttribute('data-atlas-detail','earth-orbit');
  await page.locator('.sx-stage').screenshot({path:path.join(out,'phone-earth-entry.png')});await enter(page);await expect(canvas(page)).toHaveAttribute('data-atlas-objects','earth');
  const route=page.getByRole('navigation',{name:'Your exploration route',exact:true}),back=route.getByRole('button');await back.focus();await back.press('Enter');
  await expect(canvas(page)).toHaveAttribute('data-atlas-detail','earth-orbit');await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','32.00');await expect(canvas(page)).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await cdp.detach();
});

test('pinch and cancelled touches never select a world, and explicit destinations clear the route',async({page})=>{
  await mount(page);await fly(page,'solar-system');await canvas(page).scrollIntoViewIfNeeded();const p=await point(page,'jupiter'),cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:p.x,y:p.y,radiusX:4,radiusY:4,force:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await expect(canvas(page)).toHaveAttribute('data-atlas-detail','');
  const box=(await canvas(page).boundingBox())!,cx=box.x+box.width/2,cy=box.y+box.height*.65,points=(d:number)=>[{id:1,x:cx-d,y:cy},{id:2,x:cx+d,y:cy}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(30)});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(70)});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(canvas(page)).toHaveAttribute('data-atlas-detail','');await expect(canvas(page)).toHaveAttribute('data-atlas-objects','solar-system');await cdp.detach();
  await page.getByRole('region',{name:'Explore the planetary system',exact:true}).getByRole('button',{name:'Visit the Sun',exact:true}).click();
  await expect(page.getByRole('navigation',{name:'Your exploration route'})).toBeVisible();await fly(page,'honeybee');await expect(page.getByRole('navigation',{name:'Your exploration route'})).toHaveCount(0);
});
