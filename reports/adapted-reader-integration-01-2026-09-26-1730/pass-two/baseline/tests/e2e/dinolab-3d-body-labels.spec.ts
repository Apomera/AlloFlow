import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
test.describe.configure({timeout:240_000}); test.use({video:'off',trace:'off'});
const report='reports/dinolab-3d-anatomy-labels',baseline=!!process.env.DINO_ANATOMY_SOURCE;
const harness=new GlHarness({toolFile:process.env.DINO_ANATOMY_SOURCE||'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
 probes:"var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__anatomyScene=s;window.__anatomyCamera=c;window.__anatomyRenderer=r;return render(s,c);};return r;};"});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function settle(page){await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));}
async function mount(page,species){
 await page.setViewportSize({width:1180,height:920});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{dinoLab:{tab:'field3d',field3dSelected:species,field3dReconstructionMode:'evidence',field3dAutoRotate:false,field3dOrientationDismissed:true,field3dWorkflowStarted:false,
 field3dShowSkeleton:false,field3dShowBody:true,field3dShowHuman:false,field3dShowEvidence:false,field3dBodyOpacity:100}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {');await page.addStyleTag({content:css.slice(start,css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start)))});
 await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__anatomyScene)).toBe(true);await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();await settle(page);
}
async function inspect(page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,s=w.__anatomyScene,c=w.__anatomyCamera,r=w.__anatomyRenderer,m=s.getObjectByName('dinolab-specimen'),key=s.getObjectByName('dinolab-key-light');s.updateMatrixWorld(true);c.updateMatrixWorld(true);
 let invalid=0,outside=0,shadowOutside=0;const claws:any[]=[],anchors:any[]=[];
 m.traverse(p=>{if(p.userData.dinoBodyPart)anchors.push({id:p.userData.dinoBodyPart,point:p.getWorldPosition(new T.Vector3()).toArray(),owner:p.parent.userData.dinoRegion||'model'});if(!p.isMesh||!p.userData.dinoAnatomy)return;const pos=p.geometry.attributes.position;for(let i=0;i<pos.count;i++){const v=new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(p.matrixWorld),clip=v.clone().project(c);if(!Number.isFinite(v.length()))invalid++;if(Math.max(Math.abs(clip.x),Math.abs(clip.y),Math.abs(clip.z))>1.001)outside++;if(p.castShadow){v.project(key.shadow.camera);if(Math.max(Math.abs(v.x),Math.abs(v.y),Math.abs(v.z))>1.001)shadowOutside++;}}if(p.userData.dinoFeature==='keratin-claw'){const root=new T.Vector3().fromBufferAttribute(pos,pos.count-1).applyMatrix4(p.matrix);claws.push({root:root.toArray(),length:p.geometry.parameters.length,manual:p.userData.dinoManualAttachment||null});}});
 const overlay=document.querySelector('.dinolab-body-label-overlay') as HTMLElement,box=overlay?.getBoundingClientRect();
 const labels=overlay?Array.from(overlay.querySelectorAll('[data-dino-part-label]')).filter((e:any)=>e.style.display!=='none'&&overlay.style.display!=='none').map((e:any)=>{const b=e.getBoundingClientRect(),id=e.getAttribute('data-dino-part-label'),line=overlay.querySelector('[data-dino-part-line="'+id+'"] line')!;return {id,text:e.textContent,x:b.left-box!.left,y:b.top-box!.top,width:b.width,height:b.height,anchorX:+line.getAttribute('x1')!,anchorY:+line.getAttribute('y1')!};}):[];
 return {invalid,outside,shadowOutside,claws,anchors,labels,width:box?.width||0,height:box?.height||0,memory:{...r.info.memory},render:{...r.info.render},errors:w.__events.errors,lost:w.__glLive().lost,shaderFailures:r.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
});}
function check(p,whole=false){expect(p.invalid).toBe(0);expect(p.shadowOutside).toBe(0);expect(p.errors).toEqual([]);expect(p.lost).toBe(false);expect(p.shaderFailures).toBe(0);if(whole)expect(p.outside).toBe(0);}
function checkLabels(p,min=1){expect(p.labels.length).toBeGreaterThanOrEqual(min);for(const a of p.labels){expect(a.x).toBeGreaterThanOrEqual(7.9);expect(a.x+a.width).toBeLessThanOrEqual(p.width-7.9);expect(a.y).toBeGreaterThanOrEqual(64);expect(a.y+a.height).toBeLessThan(p.height-70);for(const b of p.labels)if(a!==b)expect(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y).toBe(true);}}
async function labelsOn(page){await page.getByRole('button',{name:'Body-part labels',exact:true}).click();await expect(page.getByRole('button',{name:'Body-part labels',exact:true})).toHaveAttribute('aria-pressed','true');await expect.poll(async()=>(await inspect(page)).labels.length).toBeGreaterThan(0);}
test('Therizinosaurus claws grow from the hands and have continuous forelimbs',async({page})=>{
 await mount(page,'therizinosaurus');await page.locator('.dinolab-3d-controls-disclosure > summary').click();await page.getByRole('button',{name:'Side camera view',exact:true}).click();await settle(page);const p=await inspect(page);check(p,true);
 await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/therizinosaurus'+(baseline?'-before':'-after')+'.png'});
 if(!baseline){expect(p.claws.length).toBe(14);const hands=p.claws.filter(c=>c.manual);expect(hands.length).toBe(6);for(const c of hands){expect(c.length).toBeGreaterThan(.95);expect(c.length).toBeLessThan(1.1);for(let i=0;i<3;i++)expect(c.root[i]).toBeCloseTo(c.manual.root[i],5);}expect(p.claws.filter(c=>c.length>.9).every(c=>c.manual)).toBe(true);await labelsOn(page);checkLabels(await inspect(page),5);await page.locator('.dinolab-3d-viewer').screenshot({path:report+'/therizinosaurus-labeled.png'});}
 fs.writeFileSync(report+'/therizinosaurus'+(baseline?'-before':'')+'.json',JSON.stringify(p,null,2));
});
for(const species of ['tyrannosaurus','triceratops','brachiosaurus','microraptor'])test(species+' labels follow camera and study views',async({page})=>{
 test.skip(baseline);await mount(page,species);await page.evaluate(()=>{const w=window as any;w.__ctx.updateMulti('dinoLab',{field3dScanLogged:{skull:true},field3dScanSpecies:w.__toolData.dinoLab.field3dSelected});});await settle(page);const before=await inspect(page),saved=await page.evaluate(()=>JSON.parse(JSON.stringify((window as any).__toolData.dinoLab)));await labelsOn(page);let p=await inspect(page);check(p,true);checkLabels(p,3);expect(p.memory).toEqual(before.memory);
 await page.locator('.dinolab-3d-controls-disclosure > summary').click();await page.getByRole('button',{name:'Side camera view',exact:true}).click();await settle(page);p=await inspect(page);checkLabels(p,4);await page.locator('.dinolab-3d-viewer').screenshot({path:report+'/'+species+'-labels.png'});
 await page.getByRole('button',{name:'Front camera view',exact:true}).click();await settle(page);checkLabels(await inspect(page),1);
 await page.getByRole('button',{name:'Study head details',exact:true}).click();await settle(page);p=await inspect(page);check(p);checkLabels(p);expect(p.labels.every(l=>['head','neck'].includes(l.id))).toBe(true);
 await page.getByRole('button',{name:'Study tail details',exact:true}).click();await settle(page);p=await inspect(page);check(p);checkLabels(p);expect(p.labels.map(l=>l.id)).toEqual(['tail']);
 await page.getByRole('button',{name:'Body-part labels',exact:true}).click();await settle(page);expect((await inspect(page)).labels).toEqual([]);const after=await page.evaluate(()=>JSON.parse(JSON.stringify((window as any).__toolData.dinoLab)));expect(after.field3dProgress.scanLogged).toEqual(saved.field3dScanLogged);expect(after.field3dProgress.hasProgress).toBe(true);delete after.field3dProgress;expect(after).toEqual({...saved,field3dLabelMode:'key'});
});
test('phone labels, key and fossil life round trip stay usable',async({page})=>{
 test.skip(baseline);await mount(page,'therizinosaurus');await page.setViewportSize({width:390,height:844});await labelsOn(page);let p=await inspect(page);check(p,true);checkLabels(p,2);expect(p.labels.length).toBeLessThanOrEqual(4);
 const button=page.getByRole('button',{name:'Body-part labels',exact:true});await button.focus();await page.keyboard.press('Space');await expect(button).toHaveAttribute('aria-pressed','false');await page.keyboard.press('Space');await expect(button).toHaveAttribute('aria-pressed','true');
 await page.locator('.dinolab-body-part-key > summary').click();await expect(page.locator('.dinolab-body-part-key dt')).toHaveCount(10);await expect(page.locator('.dinolab-body-part-key')).toContainText('distinct from the ankle');
 await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});const audit=await page.evaluate(async()=>{const a=await (window as any).axe.run(document.querySelector('.dinolab-body-label-controls'));return a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});expect(audit).toEqual([]);fs.writeFileSync(report+'/phone-accessibility.json',JSON.stringify({violations:audit},null,2));await page.locator('.dinolab-3d-shell').screenshot({path:report+'/phone-key.png'});
 await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();await settle(page);p=await inspect(page);check(p);checkLabels(p,2);expect(p.claws).toEqual([]);
 await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();await settle(page);p=await inspect(page);check(p);checkLabels(p,2);expect(p.claws.filter(c=>c.manual).length).toBe(6);
 await page.locator('#dino-scene-labels').selectOption('off');await settle(page);expect((await inspect(page)).labels).toEqual([]);await expect(button).toHaveAttribute('aria-pressed','false');
 await page.locator('#dino-scene-labels').selectOption('anatomy');await settle(page);checkLabels(await inspect(page),2);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 fs.writeFileSync(report+'/phone-layers.json',JSON.stringify(p,null,2));
});
test('body labels coexist with evidence layers and size measurements',async({page})=>{
 test.skip(baseline);await mount(page,'triceratops');await page.evaluate(()=>{(window as any).__ctx.updateMulti('dinoLab',{field3dShowEvidence:true,field3dShowHuman:true});});await settle(page);await labelsOn(page);const p=await inspect(page);check(p);checkLabels(p,2);
 const spriteLabels=()=>page.evaluate(()=>{const w=window as any,labels:string[]=[];w.__anatomyScene.traverse(o=>{if(o.isSprite&&o.userData.dinoLabel&&o.visible&&(!o.parent||o.parent.visible))labels.push(o.userData.dinoLabel);});return labels;});expect(await spriteLabels()).toEqual([]);
 await page.getByRole('button',{name:'Study size reference',exact:true}).click();await settle(page);expect((await inspect(page)).labels).toEqual([]);expect((await spriteLabels()).length).toBeGreaterThan(0);
 await page.getByRole('button',{name:'Study whole animal',exact:true}).click();await settle(page);checkLabels(await inspect(page),2);
});
test('Therizinosaurus bony claws stay inside their curved sheaths',async({page})=>{
 test.skip(baseline);await mount(page,'therizinosaurus');await page.evaluate(()=>{(window as any).__ctx.updateMulti('dinoLab',{field3dShowSkeleton:true,field3dBodyOpacity:40});});await settle(page);check(await inspect(page),true);
 const result=await page.evaluate(()=>{
  const w=window as any,T=w.THREE,m=w.__anatomyScene.getObjectByName('dinolab-specimen'),cores:any[]=[],shells:any[]=[];m.updateMatrixWorld(true);
  m.traverse(p=>{if(p.userData.dinoFeature==='manual-ungual')cores.push(p);if(p.userData.dinoFeature==='keratin-claw'&&p.userData.dinoManualAttachment)shells.push(p);});
  const material=new T.MeshBasicMaterial({side:T.DoubleSide}),direction=new T.Vector3(.31,.73,.61).normalize();let outside=0,samples=0;
  cores.forEach(core=>{const a=core.userData.dinoManualAttachment,shell=shells.find(s=>s.userData.dinoManualAttachment.side===a.side&&s.userData.dinoManualAttachment.digit===a.digit);if(!shell){outside++;return;}const probe=new T.Mesh(shell.geometry,material);probe.matrixWorld.copy(shell.matrixWorld);const p=core.geometry.attributes.position;const ids=[];for(let i=12;i<p.count-2;i+=17)ids.push(i);ids.push(p.count-2);ids.forEach(i=>{samples++;const origin=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(core.matrixWorld),hits=new T.Raycaster(origin,direction,0,100).intersectObject(probe,false);const distances=hits.map(h=>h.distance).filter((d,j,a)=>j===0||d-a[j-1]>1e-6);if(distances.length%2!==1)outside++;});});material.dispose();return {cores:cores.length,shells:shells.length,outside,samples};
 });expect(result.cores).toBe(6);expect(result.shells).toBe(6);expect(result.outside).toBe(0);expect(result.samples).toBeGreaterThan(40);
 await page.locator('.dinolab-3d-controls-disclosure > summary').click();await page.getByRole('button',{name:'Side camera view',exact:true}).click();await settle(page);await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/therizinosaurus-transparent.png'});
 fs.writeFileSync(report+'/claw-core-enclosure.json',JSON.stringify(result,null,2));
});
