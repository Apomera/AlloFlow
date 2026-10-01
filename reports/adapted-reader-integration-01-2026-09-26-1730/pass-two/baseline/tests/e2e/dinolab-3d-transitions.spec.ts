import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
test.describe.configure({timeout:240_000});test.use({video:'off',trace:'off'});
const report='reports/dinolab-3d-transitions',baseline=!!process.env.DINO_TRANSITION_SOURCE;
const harness=new GlHarness({toolFile:process.env.DINO_TRANSITION_SOURCE||'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
 probes:"var now=performance.now.bind(performance);performance.now=function(){return window.__transitionClock==null?now():window.__transitionClock;};var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__transitionScene=s;window.__transitionCamera=c;window.__transitionRenderer=r;window.__transitionRenderedClock=window.__transitionClock;return render(s,c);};return r;};"});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function settle(page){await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));}
async function mount(page,species,motion=false){
 await page.setViewportSize({width:1180,height:920});await page.emulateMedia({reducedMotion:motion?'no-preference':'reduce'});
 await harness.mount(page,{dinoLab:{tab:'field3d',field3dSelected:species,field3dReconstructionMode:'evidence',field3dAutoRotate:false,field3dOrientationDismissed:true,field3dWorkflowStarted:false,
 field3dShowSkeleton:false,field3dShowBody:true,field3dShowHuman:false,field3dShowEvidence:false,field3dBodyOpacity:100}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {');await page.addStyleTag({content:css.slice(start,css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start)))});
 await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__transitionScene)).toBe(true);await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();await settle(page);
}
async function inspect(page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,s=w.__transitionScene,c=w.__transitionCamera,r=w.__transitionRenderer,m=s.getObjectByName('dinolab-specimen');
 s.updateMatrixWorld(true);c.updateMatrixWorld(true);const body=m.children.find(p=>p.userData.dinoRegion==='torso'),tail=m.children.find(p=>p.userData.dinoRegion==='tail'),key=s.getObjectByName('dinolab-key-light');
 let invalid=0,outside=0,shadowOutside=0,surfaces=0,smooth=0,rootGap=0,rootCover=Infinity;const meshes:any[]=[];
 m.traverse(p=>{
  if(!p.isMesh||!p.userData.dinoAnatomy)return;
  if(p.userData.dinoSurface==='continuous'){surfaces++;if(p.geometry.userData.dinoSmoothProfile)smooth++;}
  const pos=p.geometry.attributes.position;
  for(let i=0;i<pos.count;i++){
   const v=new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(p.matrixWorld),clip=v.clone().project(c);
   if(!Number.isFinite(v.length()))invalid++;if(Math.max(Math.abs(clip.x),Math.abs(clip.y),Math.abs(clip.z))>1.001)outside++;
   if(p.castShadow){v.project(key.shadow.camera);if(Math.max(Math.abs(v.x),Math.abs(v.y),Math.abs(v.z))>1.001)shadowOutside++;}
  }
  if(p.userData.dinoAttachment&&['feather','filament','crest-feather'].includes(p.userData.dinoFeature)){
   const a=p.userData.dinoAttachment,span=p.userData.featherWidth||p.geometry.parameters.radius;
   rootGap=Math.max(rootGap,p.getWorldPosition(new T.Vector3()).distanceTo(p.parent.localToWorld(new T.Vector3().fromArray(a.point)))/span);
  }
  meshes.push({id:p.uuid,position:p.position.toArray(),rotation:p.rotation.toArray(),scale:p.scale.toArray()});
 });
 if(tail&&body){
  const p=tail.geometry.attributes.position,center=new T.Vector3().fromBufferAttribute(p,p.count-2).applyMatrix4(tail.matrixWorld),reach=new T.Box3().setFromObject(body).getSize(new T.Vector3()).length()*2;
  for(let i=0;i<25;i++){
   const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(tail.matrixWorld),radial=v.clone().sub(center),length=radial.length();radial.normalize();
   const hit=new T.Raycaster(center.clone().addScaledVector(radial,reach),radial.clone().negate(),0,reach*2).intersectObject(body,false)[0];
   rootCover=Math.min(rootCover,hit?(reach-hit.distance-length)/reach:-1);
  }
 }
 const skin=tail?{position:tail.position.toArray(),rotation:tail.rotation.toArray(),vertices:tail.geometry.attributes.position.count,coordinates:Array.from(tail.geometry.attributes.dinoSkinRegion.array)}:null;
 return {invalid,outside,shadowOutside,surfaces,smooth,rootGap,rootCover:rootCover===Infinity?null:rootCover,tail:skin,meshes,memory:{...r.info.memory},render:{...r.info.render},errors:w.__events.errors,lost:w.__glLive().lost,shaderFailures:r.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
});}
function check(p,whole=false){expect(p.invalid).toBe(0);expect(p.shadowOutside).toBe(0);expect(p.rootGap).toBeLessThan(.21);expect(p.errors).toEqual([]);expect(p.lost).toBe(false);expect(p.shaderFailures).toBe(0);if(whole)expect(p.outside).toBe(0);if(!baseline&&p.tail){expect(p.smooth).toBe(p.surfaces);expect(p.rootCover).toBeGreaterThan(0);expect(p.tail.vertices).toBe(1227);}}
function compact(p){return {surfaces:p.surfaces,smooth:p.smooth,rootCover:p.rootCover,rootGap:p.rootGap,tailPivot:p.tail?.position,memory:p.memory,render:p.render};}
for(const species of ['sinosauropteryx','tyrannosaurus','brachiosaurus','triceratops','microraptor','spinosaurus'])test(species+' has a seated tapered tail transition',async({page})=>{
 await mount(page,species);const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData)),first=await inspect(page);check(first,true);
 await page.locator('.dinolab-3d-controls-disclosure > summary').click();await page.getByRole('button',{name:'Study tail details',exact:true}).click();await page.getByRole('button',{name:'Side camera view',exact:true}).click();await settle(page);check(await inspect(page));
 await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+(baseline?'-before':'-tail')+'.png'});
 if(!baseline){await page.getByRole('button',{name:'Study body details',exact:true}).click();await page.getByRole('button',{name:'Surface detail studio lighting',exact:true}).click();await settle(page);check(await inspect(page));await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-body.png'});}
 expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData))).toBe(saved);fs.writeFileSync(report+'/'+species+(baseline?'-before':'')+'.json',JSON.stringify(compact(first),null,2));
});
test('transition stays covered during motion and through phone fossil studies',async({page})=>{
 await mount(page,'sinosauropteryx',true);
 async function tick(amount,steps=1){for(let i=0;i<steps;i++){await page.evaluate(n=>{const w=window as any;w.__transitionClock=(w.__transitionClock??performance.now())+n;},amount);await expect.poll(()=>page.evaluate(()=>{const w=window as any;return w.__transitionClock===w.__transitionRenderedClock;})).toBe(true);}}
 await tick(0);const first=await inspect(page);await tick(60,8);const moving=await inspect(page);check(moving,true);expect(moving.tail.rotation).not.toEqual(first.tail.rotation);expect(moving.tail.position).toEqual(first.tail.position);expect(moving.tail.coordinates).toEqual(first.tail.coordinates);
 await page.getByRole('button',{name:'Pause motion',exact:true}).click();await tick(0);const paused=await inspect(page);await tick(5000,3);const frozen=await inspect(page);check(frozen);expect(frozen.meshes).toEqual(paused.meshes);
 await page.getByRole('button',{name:'Study tail details',exact:true}).click();await page.setViewportSize({width:390,height:844});await settle(page);check(await inspect(page));await page.locator('.dinolab-3d-shell').screenshot({path:report+'/sinosauropteryx-mobile.png'});
 await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();await settle(page);const fossil=await inspect(page);check(fossil);expect(fossil.tail).toBeNull();
 await expect(page.getByRole('button',{name:'Study tail details',exact:true})).toHaveAttribute('aria-pressed','true');await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();await settle(page);const back=await inspect(page);check(back);expect(back.tail.coordinates).toEqual(first.tail.coordinates);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.getByRole('button',{name:'Resume motion',exact:true})).toHaveAttribute('aria-pressed','true');
 fs.writeFileSync(report+'/motion-layers.json',JSON.stringify({first:compact(first),moving:compact(moving),back:compact(back),coordinatesStable:true,pausedTransformsFrozen:true},null,2));
});
