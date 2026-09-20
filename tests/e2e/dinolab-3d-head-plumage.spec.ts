import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
test.describe.configure({timeout:240_000});test.use({video:'off',trace:'off'});
const report=process.env.DINOLAB_REPORT_DIR||'reports/dinolab-3d-head-plumage';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
 probes:"var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__coatScene=s;window.__coatCamera=c;window.__coatRenderer=r;return render(s,c);};return r;};"});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page,species,mode='evidence'){
 await page.setViewportSize({width:1180,height:920});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{dinoLab:{tab:'field3d',field3dSelected:species,field3dReconstructionMode:mode,field3dAutoRotate:false,field3dOrientationDismissed:true,field3dShowSkeleton:false,field3dShowBody:true,field3dShowHuman:false,field3dShowEvidence:false,field3dBodyOpacity:100}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {'),end=css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start));await page.addStyleTag({content:css.slice(start,end)});
 await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__coatScene)).toBe(true);await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();
}
async function inspect(page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,scene=w.__coatScene,cam=w.__coatCamera,m=scene.getObjectByName('dinolab-specimen');scene.updateMatrixWorld(true);cam.updateMatrixWorld(true);
 const inverse=new T.Matrix4().copy(m.matrixWorld).invert();let eyeMax=-Infinity,napeMin=Infinity,invalid=0,outside=0,headRoots=0,neckTaper=null;const fronts=[],backs=[];
 m.traverse(p=>{
  const eye=p.userData.dinoFeature==='eye',coat=p.userData.dinoFeature==='contour-plumage';if(!eye&&!coat)return;
  if(coat&&p.userData.dinoRegion==='neck')neckTaper=p.geometry.parameters.taper;
  const nape=coat&&p.userData.dinoRegion==='head';if(!eye&&!nape)return;
  const g=p.geometry,pos=g.attributes.position,roots=g.attributes.dinoCoatRoot,vane=g.attributes.dinoCoatVane;
  if(nape)headRoots=g.parameters.roots;
  for(let i=0;i<pos.count;i++){
   const world=new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(p.matrixWorld),local=world.clone().applyMatrix4(inverse),screen=world.clone().project(cam);
   if(!Number.isFinite(screen.x+screen.y+screen.z))invalid++;if(Math.abs(screen.x)>1||Math.abs(screen.y)>1||Math.abs(screen.z)>1)outside++;
   if(eye)eyeMax=Math.max(eyeMax,local.x);else{
    napeMin=Math.min(napeMin,local.x);
    if(vane.getY(i)===1){const root=new T.Vector3().fromBufferAttribute(roots,i),length=new T.Vector3().fromBufferAttribute(pos,i).distanceTo(root)/g.parameters.length,taper=g.parameters.taper.x;
     const t=(root.x-taper[0])/(taper[1]-taper[0]);if(t<.2)fronts.push(length);if(t>.9)backs.push(length);}
   }
  }
 });
 return {headRoots,eyeClearance:napeMin-eyeMax,frontCount:fronts.length,backCount:backs.length,frontMax:Math.max(...fronts),backMin:Math.min(...backs),neckTaper,invalid,outside,errors:w.__events.errors,lost:w.__glLive().lost,shaderFailures:w.__coatRenderer.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
});}
function check(r){expect(r.invalid).toBe(0);expect(r.outside).toBe(0);expect(r.errors).toEqual([]);expect(r.lost).toBe(false);expect(r.shaderFailures).toBe(0);}
for(const id of ['anchiornis','microraptor','sinosauropteryx','yutyrannus'])test(id+' has a tapered nape with clear eyes',async({page})=>{
 await mount(page,id);await page.getByRole('button',{name:'Study head details',exact:true}).click();const r=await inspect(page);check(r);
 expect(r.headRoots).toBeGreaterThan(80);expect(r.eyeClearance).toBeGreaterThan(0);expect(r.frontCount).toBeGreaterThan(0);expect(r.backCount).toBeGreaterThan(0);expect(r.frontMax).toBeLessThan(r.backMin*.6);expect(r.neckTaper.u[1]).toBeLessThan(.5);
 await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+id+'-head.png'});
 if(id==='anchiornis'){
  await page.locator('.dinolab-3d-controls-disclosure > summary').click();await page.getByRole('button',{name:'Side camera view',exact:true}).click();check(await inspect(page));
  await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/anchiornis-side.png'});
  await page.setViewportSize({width:320,height:844});check(await inspect(page));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/anchiornis-phone.png'});
 }
 fs.writeFileSync(report+'/'+id+'-metrics.json',JSON.stringify(r,null,2));
});
