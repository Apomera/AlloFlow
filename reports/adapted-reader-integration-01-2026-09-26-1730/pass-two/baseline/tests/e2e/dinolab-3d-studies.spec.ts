import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
test.describe.configure({timeout:240_000});test.use({video:'off',trace:'off'});
const report='reports/dinolab-3d-studies';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
probes:"var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__studyScene=s;window.__studyCamera=c;window.__studyRenderer=r;return render(s,c);};return r;};"});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page,species,state={}){
 await page.setViewportSize({width:1180,height:920});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{dinoLab:{tab:'field3d',field3dSelected:species,field3dReconstructionMode:'evidence',field3dAutoRotate:false,field3dOrientationDismissed:true,field3dWorkflowStarted:false,
 field3dShowSkeleton:false,field3dShowBody:true,field3dShowHuman:false,field3dShowEvidence:false,field3dBodyOpacity:100,...state}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {'),end=css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start));
 await page.addStyleTag({content:css.slice(start,end)});await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__studyScene)).toBe(true);
 await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();
}
async function inspect(page,region){
 return page.evaluate(region=>{
  const w=window as any,T=w.THREE,s=w.__studyScene,c=w.__studyCamera,m=s.getObjectByName('dinolab-specimen'),r=w.__studyRenderer;
  s.updateMatrixWorld(true);c.updateMatrixWorld(true);
  const b=region==='full'?m.userData.specimenBounds:m.userData.studyBounds[region],center=new T.Vector3().fromArray(b.min).add(new T.Vector3().fromArray(b.max)).multiplyScalar(.5).applyMatrix4(m.matrixWorld);
  let outside=0,invalid=0,maxProjection=0;
  for(const x of [b.min[0],b.max[0]])for(const y of [b.min[1],b.max[1]])for(const z of [b.min[2],b.max[2]]){
   const p=new T.Vector3(x,y,z).applyMatrix4(m.matrixWorld).project(c),max=Math.max(Math.abs(p.x),Math.abs(p.y),Math.abs(p.z));maxProjection=Math.max(maxProjection,max);
   if(!Number.isFinite(max))invalid++;if(max>1)outside++;
  }
  return {outside,invalid,maxProjection,distance:c.position.distanceTo(center),aspect:c.aspect,near:c.near,region,bounds:b,center:center.toArray(),camera:c.position.toArray(),errors:w.__events.errors,lost:w.__glLive().lost,shaderFailures:r.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
 },region);
}
function check(r){expect(r.outside).toBe(0);expect(r.invalid).toBe(0);expect(r.errors).toEqual([]);expect(r.lost).toBe(false);expect(r.shaderFailures).toBe(0);}
async function study(page,region){
 const button=page.getByRole('button',{name:'Study '+region+' details',exact:true});await button.click();await expect(button).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.dinolab-3d-camera-readout')).toContainText(region[0].toUpperCase()+region.slice(1)+' study');
 const r=await inspect(page,region);check(r);return r;
}
for(const species of ['anchiornis','sinosauropteryx','microraptor','tyrannosaurus','triceratops','brachiosaurus']){
 test(species+' offers framed anatomical studies',async({page})=>{
  await mount(page,species);const whole=await inspect(page,'full');check(whole);
  const head=await study(page,'head');expect(head.distance).toBeLessThan(whole.distance*.85);
  await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-head.png'});
  const body=await study(page,'body'),tail=await study(page,'tail');
  if(['sinosauropteryx','microraptor'].includes(species))await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-tail.png'});
  fs.writeFileSync(report+'/'+species+'-metrics.json',JSON.stringify({whole,head,body,tail},null,2));
  await page.getByRole('button',{name:'Study whole animal',exact:true}).click();check(await inspect(page,'full'));
  await expect(page.getByRole('button',{name:'Study whole animal',exact:true})).toHaveAttribute('aria-pressed','true');
  if(species==='anchiornis'){
   await study(page,'head');await page.locator('.dinolab-3d-controls-disclosure > summary').click();
   await page.getByRole('button',{name:'Side camera view',exact:true}).click();check(await inspect(page,'head'));
   await expect(page.getByRole('button',{name:'Study head details',exact:true})).toHaveAttribute('aria-pressed','true');
   await page.getByRole('button',{name:'Overhead camera view',exact:true}).click();check(await inspect(page,'head'));
   await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/anchiornis-head-overhead.png'});
   await page.getByRole('button',{name:'Side camera view',exact:true}).click();
   await page.setViewportSize({width:390,height:844});check(await inspect(page,'head'));
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const rowTops=await page.locator('.dinolab-study-controls button').evaluateAll(buttons=>buttons.map(b=>b.getBoundingClientRect().top));expect(new Set(rowTops).size).toBe(1);
   await page.locator('.dinolab-3d-shell').screenshot({path:report+'/anchiornis-mobile-studies.png'});
   await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();check(await inspect(page,'head'));
   await expect(page.getByRole('button',{name:'Study head details',exact:true})).toHaveAttribute('aria-pressed','true');
   await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/anchiornis-fossil-head.png'});
   await page.locator('.dinolab-3d-canvas').focus();await page.keyboard.press('Home');check(await inspect(page,'full'));
   await expect(page.getByRole('button',{name:'Study whole animal',exact:true})).toHaveAttribute('aria-pressed','true');
  }
 });
}
test('keyboard study selection resets on species change and keeps evidence data intact',async({page})=>{
 await mount(page,'tyrannosaurus');
 const before=await page.evaluate(()=>JSON.stringify((window as any).__toolData.dinoLab));
 const head=page.getByRole('button',{name:'Study head details',exact:true});await head.focus();await page.keyboard.press('Enter');check(await inspect(page,'head'));
 expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.dinoLab))).toBe(before);
 await page.getByRole('combobox',{name:/species|dinosaur/i}).first().selectOption('microraptor');
 await expect(page.getByRole('button',{name:'Study whole animal',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.dinolab-3d-camera-readout')).toContainText('full model');check(await inspect(page,'full'));
});

test('explicit scan target takes priority while layer changes preserve the study',async({page})=>{
 await mount(page,'tyrannosaurus',{field3dWorkflowStarted:true,field3dShowEvidence:true});
 await study(page,'head');
 await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();
 await expect(page.getByRole('button',{name:'Study head details',exact:true})).toHaveAttribute('aria-pressed','true');check(await inspect(page,'head'));
 await page.getByRole('button',{name:/Focus Shoulder evidence anchor/}).click();
 await expect(page.locator('.dinolab-3d-camera-readout')).toContainText('Shoulder anchor');
 await expect(page.getByRole('button',{name:'Study whole animal',exact:true})).toHaveAttribute('aria-pressed','false');
 await page.getByRole('button',{name:'Study whole animal',exact:true}).click();
 await expect(page.locator('.dinolab-3d-camera-readout')).toContainText('full model');check(await inspect(page,'full'));
});
