import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:180000});
test.use({viewport:{width:1280,height:1000},reducedMotion:'no-preference'});
const shots='scratch/butterfly-immersion';
test.beforeAll(async()=>{mkdirSync(shots,{recursive:true});await harness.start();});
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:any,fallback=false){
 await page.goto(harness.url+'/__harness');
 await page.evaluate((fallback:boolean)=>{
  const w=window as any;if(fallback)w.StemLab.ensureThree=()=>Promise.reject(new Error('Test fallback'));
  w.__mount({butterfly:{}});Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 },fallback);
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer',fallback?'map':'three');
 if(!fallback){
  await page.evaluate(()=>{
   const w=window as any,original=w.THREE.Scene.prototype.onAfterRender;
   w.THREE.Scene.prototype.onAfterRender=function(renderer:any,scene:any,camera:any){
    if(this.getObjectByName('player-monarch')){w.__immersiveScene=this;w.__immersiveRenderer=renderer;w.__immersiveCamera=camera;}
    return original.call(this,renderer,scene,camera);
   };
  });
  // Trigger a real tool render; the test never creates a GL context itself.
  await page.getByRole('button',{name:'Map',exact:true}).click();
  await page.getByRole('button',{name:'Map',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>!!(window as any).__immersiveScene)).toBe(true);
 }
}

async function visitWithoutFlight(page:any,name:string){
 await page.getByRole('button',{name:'Visit without flying · '+name,exact:true}).click();
 await page.getByRole('button',{name:'Land here',exact:true}).click();
}
async function audit(page:any){
 expect(await page.evaluate(async()=>{
  const r=await (window as any).axe.run(document.querySelector('[data-butterfly-root]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
  return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.failureSummary)}));
 })).toEqual([]);
}

async function meadowMotion(page:any){
 return page.evaluate(()=>{
  const w=window as any,scene=w.__immersiveScene;
  const visitors=scene.children.filter((object:any)=>object.name!=='player-monarch'&&object.children.some((part:any)=>part.name==='monarch-body'));
  return {frame:w.__immersiveRenderer.info.render.frame,visitors:visitors.map((visitor:any)=>({position:visitor.matrixWorld.toArray(),wings:['monarch-wing-left','monarch-wing-right'].map(name=>visitor.getObjectByName(name).matrixWorld.toArray())}))};
 });
}

test('the monarch is framed inside a live meadow and flight stops exactly when paused',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error'&&/shader|webglprogram|validate_status|three\./i.test(message.text()))errors.push(message.text());});await mount(page);
 const stage=page.locator('.bf-stage');
 const scene=await harness.glScene(page);expect(scene?.hasScene).toBe(true);expect(scene?.draws).toBeGreaterThan(0);
 const framing=await page.evaluate(()=>{
  const w=window as any,T=w.THREE,player=w.__immersiveScene.getObjectByName('player-monarch'),box=new T.Box3().setFromObject(player),center=box.getCenter(new T.Vector3()).project(w.__immersiveCamera);
  const names=['monarch-body','monarch-wing-left','monarch-wing-right','monarch-forewing-left','monarch-hindwing-right'];
  return {center:center.toArray(),parts:names.filter(name=>!!player.getObjectByName(name)),visible:player.visible,meadow:['meadow-sky','meadow-footpath','shared-meadow-grass'].filter(name=>!!w.__immersiveScene.getObjectByName(name))};
 });
 expect(framing.visible).toBe(true);expect(framing.parts).toHaveLength(5);
 expect(framing.meadow).toHaveLength(3);
 expect(Math.abs(framing.center[0])).toBeLessThan(.9);expect(Math.abs(framing.center[1])).toBeLessThan(.9);
 expect(framing.center[2]).toBeGreaterThan(-1);expect(framing.center[2]).toBeLessThan(1);
 // The meadow has its own clock: watching it must never start the player's flight.
 await expect(stage).toHaveAttribute('data-bf-paused','true');await expect(stage).toHaveAttribute('data-bf-motion-paused','false');
 const idlePosition=await stage.getAttribute('data-position'),idleFlightClock=await stage.getAttribute('data-clock'),idleMeadowClock=await stage.getAttribute('data-bf-meadow-clock'),idleMotion=await meadowMotion(page);
 expect(idleMotion.visitors).toHaveLength(4);
 await expect.poll(()=>stage.getAttribute('data-bf-meadow-clock')).not.toBe(idleMeadowClock);
 await expect.poll(async()=>JSON.stringify((await meadowMotion(page)).visitors)).not.toBe(JSON.stringify(idleMotion.visitors));
 expect(await stage.getAttribute('data-position')).toBe(idlePosition);expect(await stage.getAttribute('data-clock')).toBe(idleFlightClock);
 await page.getByRole('button',{name:'Pause all motion',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
 const idlePausedClock=await stage.getAttribute('data-bf-meadow-clock'),idlePausedMotion=await meadowMotion(page);
 await page.waitForTimeout(250);
 expect(await stage.getAttribute('data-bf-meadow-clock')).toBe(idlePausedClock);expect(await meadowMotion(page)).toEqual(idlePausedMotion);
 await page.getByRole('button',{name:'Resume motion',exact:true}).click();
 await expect(stage).toHaveAttribute('data-bf-motion-paused','false');await expect(stage).toHaveAttribute('data-bf-paused','true');
 await expect.poll(()=>stage.getAttribute('data-bf-meadow-clock')).not.toBe(idlePausedClock);
 expect(await stage.getAttribute('data-position')).toBe(idlePosition);expect(await stage.getAttribute('data-clock')).toBe(idleFlightClock);
 await stage.screenshot({path:shots+'/desktop-meadow.png'});
 await page.getByRole('button',{name:'Take flight',exact:true}).click();await stage.focus();
 await page.keyboard.down('ArrowUp');await expect.poll(async()=>Number(await stage.getAttribute('data-bf-speed'))).toBeGreaterThan(1);
 await page.keyboard.down('ArrowRight');await expect.poll(async()=>Math.abs(Number(await stage.getAttribute('data-bf-bank')))).toBeGreaterThan(.01);
 await page.keyboard.up('ArrowRight');await page.keyboard.up('ArrowUp');await page.keyboard.press('Space');
 await expect(stage).toHaveAttribute('data-bf-paused','true');await expect(stage).toHaveAttribute('data-bf-motion-paused','true');
 const snapshot=await stage.getAttribute('data-position'),clock=await stage.getAttribute('data-clock'),meadowClock=await stage.getAttribute('data-bf-meadow-clock'),pausedMeadow=await meadowMotion(page);
 const visual=await page.evaluate(()=>{const w=window as any;return {frame:w.__immersiveRenderer.info.render.frame,player:w.__immersiveScene.getObjectByName('player-monarch').matrixWorld.toArray(),camera:w.__immersiveCamera.matrixWorld.toArray()};});
 await page.waitForTimeout(400);
 expect(await stage.getAttribute('data-position')).toBe(snapshot);expect(await stage.getAttribute('data-clock')).toBe(clock);expect(await stage.getAttribute('data-bf-meadow-clock')).toBe(meadowClock);expect(await meadowMotion(page)).toEqual(pausedMeadow);
 expect(await page.evaluate(()=>{const w=window as any;return {frame:w.__immersiveRenderer.info.render.frame,player:w.__immersiveScene.getObjectByName('player-monarch').matrixWorld.toArray(),camera:w.__immersiveCamera.matrixWorld.toArray()};})).toEqual(visual);
 await audit(page);expect(errors).toEqual([]);
});

test('wing view and glide preserve keyboard access and return to still field inspection',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);
 const stage=page.locator('.bf-stage');
 await page.getByRole('button',{name:'Wing view',exact:true}).click();await expect(stage).toHaveAttribute('data-bf-view','wing');
 await page.getByRole('button',{name:'Take flight',exact:true}).click();await stage.focus();await page.keyboard.press('KeyG');
 const before=await stage.getAttribute('data-position');await expect.poll(()=>stage.getAttribute('data-position')).not.toBe(before);
 await expect(stage).toHaveAttribute('data-bf-flight-mode','gliding');
 await stage.screenshot({path:shots+'/wing-view.png'});
 await page.keyboard.press('Space');await expect(stage).toHaveAttribute('data-bf-paused','true');
 await visitWithoutFlight(page,'Common milkweed');
 const perch=await page.evaluate(()=>{
  const w=window as any,T=w.THREE,player=w.__immersiveScene.getObjectByName('player-monarch'),center=player.getWorldPosition(new T.Vector3()),matrix=new T.Matrix4(),point=new T.Vector3();
  let distance=Infinity,flowerY=0;
  w.__immersiveScene.traverseVisible((object:any)=>{
   if(!object.isInstancedMesh||object.geometry.name!=='milkweed-flower-umbel')return;
   for(let i=0;i<object.count;i++){object.getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix).applyMatrix4(object.matrixWorld);const gap=Math.hypot(point.x-center.x,point.z-center.z);if(gap<distance){distance=gap;flowerY=point.y;}}
  });
  return {distance,above:center.y-flowerY,lowest:new T.Box3().setFromObject(player).min.y-flowerY};
 });
 expect(perch.distance).toBeLessThan(1);expect(perch.above).toBeGreaterThan(0);expect(perch.above).toBeLessThan(2);expect(perch.lowest).toBeGreaterThanOrEqual(0);
 await expect(page.getByRole('heading',{name:'0 of 3 patches investigated'})).toBeVisible();
 await page.getByRole('button',{name:'Flowers',exact:true}).click();
 await expect(page.getByRole('region',{name:'Field lens reading'})).toContainText('Flowers for adult feeding');
 const position=await stage.getAttribute('data-position'),clock=await stage.getAttribute('data-clock');
 await stage.screenshot({path:shots+'/milkweed-flower-lens.png'});
 await page.getByRole('button',{name:'Leaves',exact:true}).click();await stage.screenshot({path:shots+'/milkweed-leaf-lens.png'});
 await page.getByRole('button',{name:'Examine patch',exact:true}).click();
 await expect(page.getByRole('heading',{name:'1 of 3 patches investigated'})).toBeVisible();
 await expect(stage).toHaveAttribute('data-bf-paused','true');expect(await stage.getAttribute('data-position')).toBe(position);expect(await stage.getAttribute('data-clock')).toBe(clock);
 await page.locator('.bf-gl').evaluate((canvas:HTMLCanvasElement)=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
 await expect(stage).toHaveAttribute('data-bf-renderer','map');
 await expect(page.getByRole('region',{name:'Field lens reading'})).toContainText('Leaves for monarch caterpillars');
 await audit(page);expect(errors).toEqual([]);
});

test('reduced-motion mobile fieldwork stays readable with the immersive scene',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await mount(page);
 const stage=page.locator('.bf-stage');await visitWithoutFlight(page,'Wild bergamot');
 await page.getByRole('button',{name:'Wide view',exact:true}).click();
 const frames=await page.evaluate(()=>(window as any).__immersiveRenderer.info.render.frame),meadowClock=await stage.getAttribute('data-bf-meadow-clock');await page.waitForTimeout(350);
 expect(await page.evaluate(()=>(window as any).__immersiveRenderer.info.render.frame)).toBe(frames);
 expect(await stage.getAttribute('data-bf-meadow-clock')).toBe(meadowClock);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 await stage.screenshot({path:shots+'/mobile-bergamot.png'});await audit(page);
 await page.getByRole('button',{name:'Examine patch',exact:true}).click();
 await page.evaluate(()=>{const w=window as any;w.__ctx.isDark=true;w.__ctx.isContrast=true;w.__rerender();});
 await expect(page.locator('.bfl')).toHaveCSS('color','rgb(255, 255, 255)');
 await expect(page.locator('.bfl')).toHaveCSS('background-color','rgb(0, 0, 0)');
 await audit(page);
});
