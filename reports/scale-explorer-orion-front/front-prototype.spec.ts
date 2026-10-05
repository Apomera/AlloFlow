import { test, expect } from '@playwright/test';
import { GlHarness, looksBlank } from '../../tests/e2e/helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const out=path.resolve('reports/scale-explorer-orion-front');
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js']});
const variants=[
 {id:'original',eye:[4.2,-1.9,2.25],aim:[4.56,-2.76,.84]},
 {id:'lower-approach',eye:[4.2,-6.4,4.8],aim:[4.56,-2.76,.84]},
 {id:'near-boundary',eye:[4.2,-4.9,4.25],aim:[4.56,-2.76,.84]},
 {id:'right-boundary',eye:[7,-4.5,3.5],aim:[4.56,-2.76,.84]},
 {id:'along-boundary',eye:[4.2,-4.9,4.25],aim:[-4.5,-4.1,.6]},
 {id:'right-along-front',eye:[7,-4.5,3.5],aim:[-3.2,-3.7,.84]}
];
test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});
test('inspect six front boundary poses within one unchanged Orion volume',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1400,height:1100});
 try { await harness.mount(page,{_scaleExplorer:{ambient:false}},'!!document.querySelector("[data-atlas-ready]")');
 } catch(error) {console.log('Front initialization diagnostic:',await page.evaluate(()=>({init:(window as any).__frontPrototypeInitError,events:(window as any).__events,gl:(window as any).__glContexts()})),errors);throw error;} 
 const tools=page.getByRole('button',{name:'Show all tools',exact:true});if(await tools.count())await tools.click();
 await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
 await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption('orion-nebula');
 const canvas=page.locator('[data-atlas-ready]');await expect(canvas).toHaveAttribute('data-atlas-objects','orion-nebula');
 await page.getByRole('button',{name:'Enter the nebula',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-nebula-inside','active');
 await canvas.scrollIntoViewIfNeeded();await canvas.focus();
 async function model(){return page.evaluate(()=>{const w=window as any,rec=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;rec.scene.traverse((n:any)=>{if(n.userData.itemId==='orion-nebula')root=n;});const g=root.userData.model,n=g.userData.nebula;return {scale:root.scale.x,stars:Array.from(n.stars.geometry.attributes.position.array),texture:n.cloud.material.uniforms.uVolume.value.uuid,model:g.uuid,cloud:n.cloud.uuid,span:g.localToWorld(new w.THREE.Vector3(.5,0,0)).distanceTo(g.localToWorld(new w.THREE.Vector3(-.5,0,0)))};});}
 const before=await model(),results:any[]=[];
 for(const variant of variants){
   await page.evaluate(v=>{(window as any).__nebulaFrontPrototype.front={eye:v.eye,aim:v.aim};},variant);
   await page.getByRole('region',{name:'Nebula navigation',exact:true}).getByRole('button',{name:'Along the glowing front',exact:true}).click();
   await expect(canvas).toHaveAttribute('data-atlas-nebula-course','arrived');
   await expect.poll(async()=>JSON.parse((await canvas.getAttribute('data-atlas-nebula-position'))!).y).toBeCloseTo(variant.eye[1],8);
   expect(await model()).toEqual(before);
   const pixels=await harness.glPixels(page);expect(pixels).not.toBeNull();expect(looksBlank(pixels!)).toBe(false);await canvas.focus();
   writeFileSync(path.join(out,'front-'+variant.id+'-gl.png'),pixels!.png);
   await page.locator('.sx-stage').screenshot({path:path.join(out,'front-'+variant.id+'.png')});
   const pose=JSON.parse((await canvas.getAttribute('data-atlas-nebula-position'))!);
   results.push({variant,pose,stats:{width:pixels!.width,height:pixels!.height,dominantShare:pixels!.dominantShare,significantColors:pixels!.significantColors}});
 }
 writeFileSync(path.join(out,'front-poses.json'),JSON.stringify({before:{scale:before.scale,texture:before.texture,model:before.model,cloud:before.cloud,span:before.span},results},null,2));
 expect(errors).toEqual([]);
});
