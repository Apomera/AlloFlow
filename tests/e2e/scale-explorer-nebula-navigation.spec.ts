import { test, expect } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({mode:'serial',retries:0,timeout:180000});
test.use({video:'off',trace:'off'});
const out=path.resolve('reports/scale-explorer-orion-interior');
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js'],probes:'const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__insideCamera=c;return render.apply(this,arguments);};return r;}});'});
const canvas=(page:any)=>page.locator('[data-atlas-ready]');
const pose=async(page:any)=>JSON.parse((await canvas(page).getAttribute('data-atlas-nebula-position'))!);
test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});
async function mount(page:any,phone=false){
 const errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));page.on('console',(m:any)=>{if(m.type()==='error')errors.push(m.text());});
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:phone?320:1400,height:phone?780:1100});
 await harness.mount(page,{},'!!document.querySelector("[data-atlas-ready]")');
 const tools=page.getByRole('button',{name:'Show all tools',exact:true});if(await tools.count())await tools.click();
 await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
 await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption('orion-nebula');
 await expect(canvas(page)).toHaveAttribute('data-atlas-objects','orion-nebula');
 await page.getByRole('button',{name:'Enter the nebula',exact:true}).click();
 await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-inside','active');await canvas(page).scrollIntoViewIfNeeded();await canvas(page).focus();return errors;
}
async function scene(page:any){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,rec=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()),camera=w.__insideCamera;let root:any;
 rec.scene.traverse((n:any)=>{if(n.userData.itemId==='orion-nebula')root=n;});const model=root.userData.model,n=model.userData.nebula,p=model.worldToLocal(camera.position.clone()).multiplyScalar(24);
 return {position:p.toArray(),scale:root.scale.x,stars:Array.from(n.stars.geometry.attributes.position.array),texture:n.cloud.material.uniforms.uVolume.value.uuid,eye:n.eye.value.toArray(),direction:n.direction.value.toArray(),fov:camera.fov,near:camera.near,ruler:root.userData.ruler.visible,type:rec.type,renders:rec.renders};
});}
async function nonblank(page:any){const px=await harness.glPixels(page);expect(looksBlank(px)).toBe(false);}

test('inside camera translates at one scale, explores four cloud viewpoints and restores an exact notebook pose',async({page})=>{
 const errors=await mount(page),initial=await pose(page),before=await scene(page),exp=await canvas(page).getAttribute('data-atlas-exponent');
 expect(before.fov).toBe(62);expect(before.near).toBe(.002);expect(before.ruler).toBe(false);before.position.forEach((n:number,i:number)=>expect(n).toBeCloseTo([initial.x,initial.y,initial.z][i],8));
 expect(before.eye.every((n:number)=>Math.abs(n)<.5)).toBe(true);await nonblank(page);
 await canvas(page).focus();await expect(canvas(page)).toBeFocused();await page.keyboard.down('w');await expect.poll(async()=>(await pose(page)).travel).toBeGreaterThan(.08);await page.keyboard.press('Space');await page.keyboard.up('w');
 const stopped=await pose(page);await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-moving','false');await page.waitForTimeout(250);expect(await pose(page)).toEqual(stopped);await expect(canvas(page)).toHaveAttribute('data-atlas-exponent',exp!);
 const box=(await canvas(page).boundingBox())!;await page.mouse.move(box.x+box.width*.5,box.y+box.height*.6);await page.mouse.down();await page.mouse.move(box.x+box.width*.56,box.y+box.height*.65,{steps:5});await page.mouse.up();expect((await pose(page)).pitch).toBeLessThan(stopped.pitch);
 const console=page.getByRole('region',{name:'Nebula navigation',exact:true});
 for(const [id,label] of [['trapezium','Near the Trapezium'],['cavity','Inside the cavity'],['front','Along the glowing front'],['dust','Beside the dust ridge']]){
   const previous=await pose(page);await console.getByRole('button',{name:label,exact:true}).click();await expect(console.locator('[data-nebula-stop="'+id+'"]')).toHaveAttribute('aria-pressed','true');
   await expect.poll(async()=>JSON.stringify(await pose(page))).not.toBe(JSON.stringify(previous));const actual=await scene(page),current=await pose(page);actual.position.forEach((n:number,i:number)=>expect(n).toBeCloseTo([current.x,current.y,current.z][i],8));expect(actual.scale).toBe(before.scale);expect(actual.stars).toEqual(before.stars);expect(actual.texture).toBe(before.texture);await nonblank(page);
 }
 await page.locator('.sx-stage').screenshot({path:path.join(out,'orion-dust-interior.png')});
 await canvas(page).focus();await page.keyboard.press('r');await expect.poll(()=>pose(page)).toEqual(initial);await expect(console.locator('[aria-pressed="true"]')).toHaveCount(0);
 await console.getByRole('button',{name:'Near the Trapezium',exact:true}).click();
 await page.getByRole('slider',{name:'Camera travel rate',exact:true}).press('End');await expect(page.getByRole('slider',{name:'Camera travel rate',exact:true})).toHaveValue('2');
 const saved=await pose(page),book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox').fill('Looking out from the stellar cavity.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
 await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption('moon');await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-inside','active');
 await book.locator('[data-observation="orion-nebula:"]').getByRole('button',{name:/^Return to/}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-inside','active');await expect.poll(()=>pose(page)).toEqual(saved);await expect(page.getByRole('slider',{name:'Camera travel rate',exact:true})).toHaveValue('2');
 await page.locator('.sx-stage').screenshot({path:path.join(out,'orion-trapezium-interior.png')});
 const download=page.waitForEvent('download');await book.getByRole('button',{name:'Download notes',exact:true}).click();expect(readFileSync((await (await download).path())!,'utf8')).toContain('Interior camera:');
 await canvas(page).scrollIntoViewIfNeeded();await canvas(page).focus();const idle=await scene(page);await page.waitForTimeout(400);expect((await scene(page)).renders-idle.renders).toBeLessThanOrEqual(1);
 await page.keyboard.press('Escape');await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-inside','active');await expect(page.getByRole('button',{name:'Enter the nebula',exact:true})).toBeVisible();expect(errors).toEqual([]);
});

test('320px WebGL 1 navigation supports discrete steps, touch look and whole-cloud comparison exits',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;(HTMLCanvasElement.prototype as any).getContext=function(type:string,...args:any[]){if(type==='webgl2')return null;return original.apply(this,[type,...args] as any);};});
 const errors=await mount(page,true),before=await pose(page),console=page.getByRole('region',{name:'Nebula navigation',exact:true});expect((await scene(page)).type).toBe('webgl');
 await console.getByRole('button',{name:'Rise through cloud',exact:true}).press('Enter');await canvas(page).scrollIntoViewIfNeeded();await expect.poll(async()=>(await pose(page)).y).toBeCloseTo(before.y+.25,8);
 expect((await pose(page)).travel).toBeCloseTo(.25,8);await console.getByRole('button',{name:'Turn right',exact:true}).press('Enter');await canvas(page).scrollIntoViewIfNeeded();await expect.poll(async()=>(await pose(page)).heading).toBeCloseTo((before.heading+15)%360,8);await nonblank(page);
 const box=(await canvas(page).boundingBox())!;expect(box.height).toBeGreaterThan(320);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.locator('.sx-stage').screenshot({path:path.join(out,'orion-interior-phone.png')});
 await console.getByRole('button',{name:'Whole nebula',exact:true}).click();await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-inside','active');
 await page.getByRole('button',{name:'Enter the nebula',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-inside','active');
 const panel=page.locator('.sx-comparison-workbench');await panel.locator(':scope > summary').click();await panel.getByRole('combobox',{name:'First thing',exact:true}).selectOption('orion-nebula');await panel.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('solar-system');await panel.getByRole('button',{name:'Compare them',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-projection','orthographic');await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-inside','active');expect(errors).toEqual([]);
});
