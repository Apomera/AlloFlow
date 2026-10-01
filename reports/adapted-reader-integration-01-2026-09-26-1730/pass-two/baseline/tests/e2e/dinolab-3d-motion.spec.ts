import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
test.describe.configure({timeout:240_000});test.use({video:'off',trace:'off'});
const report='reports/dinolab-3d-motion';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
 probes:"var now=performance.now.bind(performance);window.__motionNow=10000;performance.now=function(){return window.__motionNow==null?now():window.__motionNow;};var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__motionScene=s;window.__motionCamera=c;window.__motionRenderer=r;window.__motionFrames=(window.__motionFrames||0)+1;return render(s,c);};return r;};"});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page,species='microraptor',reduced=false){
 await page.setViewportSize({width:1180,height:920});await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
 await harness.mount(page,{dinoLab:{tab:'field3d',field3dSelected:species,field3dReconstructionMode:'evidence',field3dAutoRotate:true,field3dOrientationDismissed:true,field3dWorkflowStarted:true,
 field3dShowSkeleton:false,field3dShowBody:true,field3dShowHuman:false,field3dShowEvidence:true,field3dBodyOpacity:100,field3dScanLogged:{skull:true},field3dScanSpecies:species}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {'),end=css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start));
 await page.addStyleTag({content:css.slice(start,end)});await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__motionScene)).toBe(true);
 await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();await tick(page,0);
}
async function tick(page,ms,steps=1){await page.evaluate(async({ms,steps})=>{
 for(let i=0;i<steps;i++){(window as any).__motionNow+=ms/steps;await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));}
},{ms,steps});}
async function pose(page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,s=w.__motionScene,m=s.getObjectByName('dinolab-specimen'),r=w.__motionRenderer;
 const meshes:any[]=[],feathers:any[]=[],eyes:any[]=[],pulses:any[]=[];let invalid=0,attachmentError=0;
 m.updateMatrixWorld(true);
 m.traverse(p=>{if(!p.isMesh)return;const values=[...p.position.toArray(),...p.quaternion.toArray(),...p.scale.toArray(),p.material?.opacity??1];
 if(!values.every(Number.isFinite))invalid++;meshes.push([p.uuid,...values]);
 if(['feather','filament','crest-feather'].includes(p.userData.dinoFeature))feathers.push(values);
 if(p.userData.dinoFeature==='eye')eyes.push(p.scale.toArray());
 if(p.geometry?.type==='TorusGeometry')pulses.push(values);
 const a=p.userData.dinoAttachment;if(a&&p.userData.dinoFeature==='feather')attachmentError=Math.max(attachmentError,p.getWorldPosition(new T.Vector3()).distanceTo(p.parent.localToWorld(new T.Vector3().fromArray(a.point)))/(p.userData.featherWidth||1));
 });
 const body=m.children.find(p=>p.userData.dinoRegion==='torso'),tail=m.children.find(p=>p.userData.dinoRegion==='tail');
 return {model:m.uuid,meshes,feathers,eyes,pulses,body:body?.scale.toArray(),tail:tail?.rotation.toArray().slice(0,3),yaw:m.rotation.y,camera:w.__motionCamera.position.toArray(),attachmentError,invalid,errors:w.__events.errors,lost:w.__glLive().lost,shaderFailures:r.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
});}
function check(p){expect(p.errors).toEqual([]);expect(p.invalid).toBe(0);expect(p.lost).toBe(false);expect(p.shaderFailures).toBe(0);expect(p.attachmentError).toBeLessThan(.04);}
function compact(p){return {model:p.model,body:p.body,tail:p.tail,yaw:p.yaw,eyes:p.eyes,featherCount:p.feathers.length,pulseCount:p.pulses.length,attachmentError:p.attachmentError};}
test('pauses every animated detail while keyboard camera controls remain usable',async({page})=>{
 await mount(page);await tick(page,4000);const a=await pose(page);await tick(page,400,8);const moving=await pose(page);check(moving);
 expect(moving.body).not.toEqual(a.body);expect(moving.tail).not.toEqual(a.tail);expect(moving.feathers).not.toEqual(a.feathers);expect(moving.pulses).not.toEqual(a.pulses);expect(moving.yaw).toBeGreaterThan(a.yaw);
 const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData));
 await page.getByRole('button',{name:'Pause motion',exact:true}).focus();await page.keyboard.press('Enter');await tick(page,0);const paused=await pose(page);
 await expect(page.getByRole('button',{name:'Resume motion',exact:true})).toHaveAttribute('aria-pressed','true');
 await tick(page,60000,5);const frozen=await pose(page);check(frozen);expect(frozen.meshes).toEqual(paused.meshes);expect(frozen.yaw).toBe(paused.yaw);expect(frozen.model).toBe(moving.model);
 const canvas=page.locator('.dinolab-3d-canvas');await canvas.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('PageUp');await tick(page,0);const rotated=await pose(page);
 expect(rotated.meshes).toEqual(paused.meshes);expect(rotated.yaw).not.toBe(paused.yaw);expect(rotated.camera).not.toEqual(paused.camera);
 await page.getByRole('button',{name:'Study head details',exact:true}).click();await tick(page,0);
 expect((await pose(page)).meshes).toEqual(paused.meshes);expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData))).toBe(saved);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('.dinolab-3d-shell').screenshot({path:report+'/paused-mobile-evidence.png'});
 await page.getByRole('button',{name:'Resume motion',exact:true}).click();await tick(page,0);expect((await pose(page)).meshes).toEqual(paused.meshes);
 await tick(page,50);const resumed=await pose(page);check(resumed);expect(resumed.body).not.toEqual(paused.body);
 expect(Math.abs(resumed.body[1]-paused.body[1])).toBeLessThan(.002);
 fs.writeFileSync(report+'/pause-resume.json',JSON.stringify({moving:compact(moving),paused:compact(paused),resumed:compact(resumed),allMeshTransformsFrozen:true,savedDataUnchanged:true},null,2));
 await page.getByRole('button',{name:'Pause motion',exact:true}).click();
 await page.evaluate(()=>(window as any).__ctx.update('dinoLab','field3dShowEvidence',false));await tick(page,0);
 await page.getByRole('button',{name:'Study head details',exact:true}).click();await tick(page,0);
 await expect(page.getByRole('button',{name:'Resume motion',exact:true})).toHaveAttribute('aria-pressed','true');
 const clean=await pose(page);await tick(page,5000);expect((await pose(page)).meshes).toEqual(clean.meshes);
 await page.locator('.dinolab-3d-shell').screenshot({path:report+'/paused-mobile.png'});
});
test('responds to reduced-motion changes without rebuilding and preserves the manual pause choice',async({page})=>{
 await mount(page,'anchiornis',true);await expect(page.getByRole('button',{name:'Motion reduced',exact:true})).toBeDisabled();
 const a=await pose(page);await tick(page,5000,5);const b=await pose(page);expect(b.meshes).toEqual(a.meshes);expect(b.yaw).toBe(a.yaw);
 await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.getByRole('button',{name:'Pause motion',exact:true})).toBeEnabled();await tick(page,0);await tick(page,200,4);const live=await pose(page);check(live);expect(live.body).not.toEqual(b.body);expect(live.model).toBe(a.model);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.getByRole('button',{name:'Motion reduced',exact:true})).toBeDisabled();await tick(page,0);const reduced=await pose(page);await tick(page,90000);expect((await pose(page)).meshes).toEqual(reduced.meshes);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.getByRole('button',{name:'Pause motion',exact:true}).click();
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.getByRole('button',{name:'Motion reduced',exact:true})).toBeDisabled();
 await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.getByRole('button',{name:'Resume motion',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Study head details',exact:true}).click();await page.locator('.dinolab-3d-shell').screenshot({path:report+'/reduced-motion.png'});
 fs.writeFileSync(report+'/reduced-motion.json',JSON.stringify({initial:compact(a),live:compact(live),reduced:compact(reduced),scenePreserved:true,manualPausePreserved:true},null,2));
});
test('keeps the pause across layer and species changes and preserves camera study controls',async({page})=>{
 await mount(page,'tyrannosaurus');await tick(page,300,6);await page.getByRole('button',{name:'Pause motion',exact:true}).click();await page.getByRole('button',{name:'Study head details',exact:true}).click();await tick(page,0);const a=await pose(page);
 await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();await tick(page,0);await expect(page.getByRole('button',{name:'Resume motion',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();await tick(page,0);const b=await pose(page);check(b);expect(b.body).toEqual(a.body);expect(b.tail).toEqual(a.tail);expect(b.eyes).toEqual(a.eyes);
 await expect(page.getByRole('button',{name:'Study head details',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('combobox',{name:/species|dinosaur/i}).first().selectOption('brachiosaurus');await tick(page,0);await expect(page.getByRole('button',{name:'Resume motion',exact:true})).toHaveAttribute('aria-pressed','true');
 const changed=await pose(page);await tick(page,10000);expect((await pose(page)).meshes).toEqual(changed.meshes);await page.locator('.dinolab-3d-canvas').focus();await page.keyboard.press('Home');await tick(page,0);
 await expect(page.getByRole('button',{name:'Study whole animal',exact:true})).toHaveAttribute('aria-pressed','true');await page.locator('.dinolab-3d-shell').screenshot({path:report+'/paused-brachiosaurus.png'});
});
test('resumes a hidden viewer without advancing its pose or orbit',async({page})=>{
 await mount(page);await tick(page,4000);await tick(page,200,4);const before=await pose(page);
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
 await tick(page,120000);expect((await pose(page)).meshes).toEqual(before.meshes);
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'});document.dispatchEvent(new Event('visibilitychange'));});await tick(page,0);const restored=await pose(page);check(restored);
 expect(restored.meshes).toEqual(before.meshes);expect(restored.yaw).toBe(before.yaw);await tick(page,50);expect((await pose(page)).body).not.toEqual(before.body);
 fs.writeFileSync(report+'/visibility.json',JSON.stringify({before:compact(before),restored:compact(restored),poseAndOrbitPreserved:true},null,2));
});
