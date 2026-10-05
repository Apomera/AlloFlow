import {test,expect} from '@playwright/test';
import {GlHarness,looksBlank} from './helpers/stem_gl_harness';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
test.describe.configure({mode:'serial',retries:0,timeout:180000});
test.use({video:'off',trace:'off',hasTouch:true});
const out=path.resolve('reports/scale-explorer-flight');
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],
 probes:"const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__airCamera=c;return render.apply(this,arguments);};return r;}});"});
test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});
const canvas=(page:any)=>page.locator('[data-atlas-ready]');
async function showScaleExplorerTools(page:any){const button=page.getByRole('button',{name:'Show all tools',exact:true});if(await button.count())await button.click();}
async function mount(page:any,phone=false){
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize(phone?{width:320,height:780}:{width:1400,height:1100});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error'&&message.text().includes('THREE.WebGLProgram'))errors.push(message.text());});
 await harness.mount(page,{},'!!document.querySelector("[data-atlas-ready]")'); await showScaleExplorerTools(page);
 await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
 await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption('everest');
 await expect(canvas(page)).toHaveAttribute('data-atlas-terrain','ready');
 await page.locator('.sx-details').getByRole('button',{name:'Fly through Everest',exact:true}).click();
 await expect(canvas(page)).toHaveAttribute('data-atlas-terrain-flight','active');
 await canvas(page).scrollIntoViewIfNeeded();await canvas(page).focus();return errors;
}
async function pose(page:any){return JSON.parse((await canvas(page).getAttribute('data-atlas-air-position'))!);}
async function renderedCamera(page:any){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,rec=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any,sky:any;
 rec.scene.traverse((n:any)=>{if(n.userData.itemId==='everest')root=n;if(n.name==='atlasAlpineSky')sky=n;});
 const p=root.userData.model.worldToLocal(w.__airCamera.position.clone()),direction=w.__airCamera.getWorldDirection(new T.Vector3());
 return {east:p.x*8849,north:-p.z*8849,altitude:p.y*8849,fov:w.__airCamera.fov,direction:direction.toArray(),ruler:root.userData.ruler.visible,sky:!!sky?.visible,renders:rec.renders};
});}
test('flight moves the rendered camera, brakes, looks independently and restores its notebook viewpoint',async({page})=>{
 const errors=await mount(page),initial=await pose(page),actual=await renderedCamera(page),exp=await canvas(page).getAttribute('data-atlas-exponent');
 expect(actual.east).toBeCloseTo(initial.east,5);expect(actual.north).toBeCloseTo(initial.north,5);expect(actual.altitude).toBeCloseTo(initial.altitude,5);expect(actual.fov).toBe(58);expect(actual.ruler).toBe(false);expect(actual.sky).toBe(true);
 await page.keyboard.down('w');await expect.poll(async()=>(await pose(page)).north).toBeGreaterThan(initial.north+45);
 await page.keyboard.press('Space');await expect(canvas(page)).toHaveAttribute('data-atlas-air-moving','false');
 const stopped=await pose(page);await page.waitForTimeout(300);expect(await pose(page)).toEqual(stopped);await page.keyboard.up('w');
 await expect(canvas(page)).toHaveAttribute('data-atlas-exponent',exp!);
 const bounds=(await canvas(page).boundingBox())!;await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.6);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.58,bounds.y+bounds.height*.63,{steps:6});await page.mouse.up();
 expect((await pose(page)).heading).toBeGreaterThan(stopped.heading+5);expect((await pose(page)).pitch).toBeLessThan(stopped.pitch);
 await page.getByRole('slider',{name:'Travel speed',exact:true}).press('End');await expect(page.getByRole('slider',{name:'Travel speed',exact:true})).toHaveValue('360');
 const beforeClimb=await pose(page);await page.getByRole('button',{name:'Climb',exact:true}).press('Enter');
 await expect.poll(async()=>(await pose(page)).altitude).toBeCloseTo(beforeClimb.altitude+100,5);
 const saved=await pose(page),book=page.getByRole('region',{name:'Field notebook',exact:true});
 await book.getByRole('textbox').fill('Flying above the valleys.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
 await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption('moon');
 await book.locator('[data-observation="everest:everest-flight"]').getByRole('button',{name:/^Return to/}).click();
 await expect(canvas(page)).toHaveAttribute('data-atlas-terrain-flight','active');
 await expect.poll(()=>pose(page)).toEqual(saved);await expect(page.getByRole('slider',{name:'Travel speed',exact:true})).toHaveValue('360');
 await expect(page.locator('[data-air-stat="heading"]')).not.toHaveText('—');
 await page.locator('.sx-stage').screenshot({path:path.join(out,'everest-flight-desktop.png')});
 expect(looksBlank(await harness.glPixels(page))).toBe(false);expect(errors).toEqual([]);
});
test('touch flight buttons support taps, captured holds and a readable phone cockpit',async({page})=>{
 const errors=await mount(page,true),controls=page.getByRole('region',{name:'Terrain flight controls',exact:true}),forward=controls.getByRole('button',{name:'Fly forward',exact:true});
 const start=await pose(page);await forward.tap();
 await expect.poll(async()=>{const p=await pose(page);return Math.hypot(p.east-start.east,p.north-start.north);}).toBeGreaterThanOrEqual(99);
 const tapped=await pose(page);expect(Math.hypot(tapped.east-start.east,tapped.north-start.north)).toBeGreaterThanOrEqual(99);
 const box=(await forward.boundingBox())!,touch=await page.context().newCDPSession(page);
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
 await expect.poll(async()=>(await pose(page)).north).toBeGreaterThan(tapped.north+30);
 await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:4,y:box.y-180}]});
 await expect.poll(async()=>(await pose(page)).north).toBeGreaterThan(tapped.north+60);
 await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(canvas(page)).toHaveAttribute('data-atlas-air-moving','false');
 const held=await pose(page);await page.waitForTimeout(250);expect(await pose(page)).toEqual(held);await touch.detach();
 await controls.getByRole('button',{name:'Descend',exact:true}).press('Enter');
 await expect.poll(async()=>(await pose(page)).altitude).toBeLessThan(held.altitude);
 expect((await pose(page)).altitude).toBeLessThan(held.altitude);expect(Number(await canvas(page).getAttribute('data-atlas-air-clearance'))).toBeGreaterThanOrEqual(150);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(await canvas(page).evaluate((c:HTMLElement)=>c.getBoundingClientRect().height)).toBeGreaterThan(320);
 await page.locator('.sx-stage').screenshot({path:path.join(out,'everest-flight-phone.png')});
 const final=await pose(page);await controls.getByRole('button',{name:'Return to map',exact:true}).click();
 await expect(canvas(page)).toHaveAttribute('data-atlas-detail','everest-explore');
 await expect(page.locator('.sx-terrain-position')).toHaveAttribute('data-terrain-east',String(Math.round(final.east)));
 await expect(page.locator('.sx-terrain-position')).toHaveAttribute('data-terrain-north',String(Math.round(final.north)));
 expect(errors).toEqual([]);
});
test('flight releases held inputs when the canvas leaves view and starts again without retained movement',async({page})=>{
 await page.addInitScript(()=>{
   const w=window as any,Original=window.IntersectionObserver;
   w.IntersectionObserver=new Proxy(Original,{construct(target,args){
     const observer=Reflect.construct(target,args),observe=observer.observe.bind(observer);
     observer.observe=function(element:HTMLElement){
       if(element.tagName==='CANVAS'&&element.getAttribute('aria-label')?.startsWith('Interactive scale atlas')){
         w.__airVisibility=(visible:boolean)=>args[0]([{target:element,isIntersecting:visible}],observer);
       }return observe(element);
     };return observer;
   }});
 });
 await mount(page);await page.keyboard.down('w');await expect(canvas(page)).toHaveAttribute('data-atlas-air-moving','true');
 const at=await pose(page);await page.evaluate(()=>(window as any).__airVisibility(false));await page.keyboard.up('w');
 await page.evaluate(()=>(window as any).__airVisibility(true));await expect(canvas(page)).toHaveAttribute('data-atlas-air-moving','false');
 const resumed=await pose(page);expect(Math.hypot(resumed.east-at.east,resumed.north-at.north)).toBeLessThan(30);
 const count=(await renderedCamera(page)).renders;await page.waitForTimeout(300);expect((await renderedCamera(page)).renders).toBe(count);
 await canvas(page).focus();await page.keyboard.down('e');await expect(canvas(page)).toHaveAttribute('data-atlas-air-moving','true');await page.keyboard.up('e');
 await page.keyboard.press('Escape');await expect(canvas(page)).toHaveAttribute('data-atlas-detail','everest-explore');
 await page.getByRole('group',{name:'Interactive terrain map',exact:true}).press('Home');
 await page.locator('.sx-details').getByRole('button',{name:'Fly through Everest',exact:true}).click();
 await expect(canvas(page)).toHaveAttribute('data-atlas-terrain-flight','active');expect((await pose(page)).east).toBe(-2300);
 const startAgain=await pose(page);await page.waitForTimeout(300);expect(await pose(page)).toEqual(startAgain);
});
