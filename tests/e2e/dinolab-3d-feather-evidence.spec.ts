import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
test.describe.configure({timeout:240_000});test.use({video:'off',trace:'off'});
const report='reports/dinolab-3d-feather-evidence';
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
 const w=window as any,T=w.THREE,scene=w.__coatScene,cam=w.__coatCamera,model=scene.getObjectByName('dinolab-specimen');scene.updateMatrixWorld(true);cam.updateMatrixWorld(true);
 const coats:any[]=[];let invalid=0,outside=0;model.traverse(p=>{
  if(p.userData.dinoFeature!=='contour-plumage')return;
  const pos=p.geometry.attributes.position,roots=p.geometry.attributes.dinoCoatRoot;
  for(let i=0;i<pos.count;i++){const v=new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(p.matrixWorld).project(cam);if(!Number.isFinite(v.x+v.y+v.z))invalid++;if(Math.abs(v.x)>1||Math.abs(v.y)>1||Math.abs(v.z)>1)outside++;}
  if(p.parent.userData.dinoRegion!==p.userData.dinoRegion||pos.count!==roots.count||!p.geometry.attributes.dinoSkinRegion)invalid++;
  coats.push({region:p.userData.dinoRegion,roots:p.geometry.parameters.roots,pennaceous:p.geometry.parameters.pennaceous,dorsalOnly:p.geometry.parameters.dorsalOnly,vertices:pos.count,position:p.position.toArray(),opacity:p.material.opacity,transparent:p.material.transparent});
 });return {coats,invalid,outside,errors:w.__events.errors,lost:w.__glLive().lost,geometries:w.__coatRenderer.info.memory.geometries,textures:w.__coatRenderer.info.memory.textures,shaderFailures:w.__coatRenderer.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
});}
function check(r){expect(r.invalid).toBe(0);expect(r.outside).toBe(0);expect(r.errors).toEqual([]);expect(r.lost).toBe(false);expect(r.shaderFailures).toBe(0);}
for(const id of ['microraptor','anchiornis','yutyrannus','sinosauropteryx'])test(id+' shows rooted continuous plumage',async({page})=>{
 const consoleErrors:string[]=[];page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL|GL_INVALID/i.test(m.text()))consoleErrors.push(m.text());});
 await mount(page,id);const result=await inspect(page);check(result);expect(result.coats.map(p=>p.region).sort()).toEqual(['head','hindleg--1','hindleg-1','neck','tail','torso']);
 expect(result.coats.reduce((s,c)=>s+c.roots,0)).toBeGreaterThan(1400);
 expect(result.coats.every(p=>p.opacity===1&&!p.transparent)).toBe(true);
 expect(result.coats.every(p=>p.pennaceous===['microraptor','anchiornis'].includes(id))).toBe(true);
 await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+id+'-life.png'});
 await page.getByRole('button',{name:/^Compare coverings:/}).click();
 await page.getByText('Why this covering?',{exact:true}).click();await expect(page.locator('.dinolab-covering-evidence')).toContainText('Supported:');await expect(page.locator('.dinolab-covering-evidence a')).toHaveAttribute('href',/^https:\/\/doi.org\//);
 if(id==='microraptor'){
  const choice=page.getByRole('group',{name:'Reconstruction hypothesis',exact:true});
  await choice.getByRole('button',{name:/Historical classic/}).click();await expect.poll(async()=>(await inspect(page)).coats.length).toBe(0);
  await expect(choice.getByRole('button',{name:/Historical classic/})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.dinolab-3d-readouts')).toContainText('Historical comparison');
  await choice.getByRole('button',{name:/Conservative minimum/}).click();await expect.poll(async()=>(await inspect(page)).coats.length).toBe(6);check(await inspect(page));
  await choice.getByRole('button',{name:/Evidence-led reconstruction/}).click();await expect.poll(async()=>(await inspect(page)).coats[0]?.roots).toBe(result.coats[0].roots);
  await page.getByRole('button',{name:'Close field tools and return to the 3D model',exact:true}).click();
  await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();await expect.poll(async()=>(await inspect(page)).coats.length).toBe(0);
  await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();await expect.poll(async()=>(await inspect(page)).coats.length).toBe(6);
  await page.setViewportSize({width:320,height:844});await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();check(await inspect(page));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('.dinolab-3d-readouts').getByText('Life reconstruction · Evidence-led',{exact:true})).toBeVisible();
  await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/microraptor-phone.png'});
  await page.getByRole('button',{name:/^Compare coverings:/}).click();
  await page.locator('.dinolab-covering-evidence').screenshot({path:report+'/evidence-phone.png'});
  await choice.getByRole('button',{name:/Historical classic/}).click();
  await page.getByRole('button',{name:'Close field tools and return to the 3D model',exact:true}).click();
  await expect(page.locator('.dinolab-3d-readouts').getByText('Historical comparison',{exact:true})).toBeVisible();
  await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/historical-phone.png'});
  await page.getByRole('button',{name:/^Compare coverings:/}).click();await choice.getByRole('button',{name:/Evidence-led reconstruction/}).click();
  await expect.poll(async()=>(await inspect(page)).coats.length).toBe(6);
  const again=await inspect(page);expect(again.geometries).toBe(result.geometries);expect(again.textures).toBe(result.textures);
 }
 expect(consoleErrors).toEqual([]);fs.writeFileSync(report+'/'+id+'-metrics.json',JSON.stringify(result,null,2));
});
test('Tyrannosaurus alternative is restricted to a speculative dorsal tract',async({page})=>{
 await mount(page,'tyrannosaurus');expect((await inspect(page)).coats).toEqual([]);
 await page.getByRole('button',{name:/^Compare coverings:/}).click();
 await page.getByRole('button',{name:/Avian-informed hypothesis/}).click();await expect.poll(async()=>(await inspect(page)).coats.length).toBe(1);
 const r=await inspect(page);check(r);expect(r.coats[0].dorsalOnly).toBe(true);expect(r.coats[0].region).toBe('torso');
 await expect(page.getByRole('button',{name:/Avian-informed hypothesis/})).toContainText('Speculative');
 await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/tyrannosaurus-regional-hypothesis.png'});fs.writeFileSync(report+'/tyrannosaurus-metrics.json',JSON.stringify(r,null,2));
});
test('Psittacosaurus bristles never become an inferred full coat',async({page})=>{
 await mount(page,'psittacosaurus');await page.getByRole('button',{name:/^Compare coverings:/}).click();for(const name of [/Conservative minimum/,/Avian-informed hypothesis/]){await page.getByRole('button',{name}).click();await expect(page.getByRole('button',{name})).toHaveAttribute('aria-pressed','true');check(await inspect(page));expect((await inspect(page)).coats).toEqual([]);}
});

test('coat stays rooted during motion and follows opacity without rebuilding',async({page})=>{
 await mount(page,'microraptor');await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();
 const before=await inspect(page);
 const motion=await page.evaluate(async()=>{
  const w=window as any,T=w.THREE,model=w.__coatScene.getObjectByName('dinolab-specimen'),body=model.children.find(p=>p.userData.dinoRegion==='torso'),coat=body.children.find(p=>p.userData.dinoFeature==='contour-plumage');
  const root=new T.Vector3().fromBufferAttribute(coat.geometry.attributes.dinoCoatRoot,0),first=coat.localToWorld(root.clone()),scale=body.scale.toArray();let gap=0;
  for(let i=0;i<14;i++){await new Promise<void>(r=>requestAnimationFrame(()=>r()));model.updateMatrixWorld(true);gap=Math.max(gap,coat.localToWorld(root.clone()).distanceTo(body.localToWorld(root.clone())));}
  return {gap,travel:coat.localToWorld(root.clone()).distanceTo(first),scaleBefore:scale,scaleAfter:body.scale.toArray()};
 });expect(motion.gap).toBeLessThan(1e-8);expect(motion.travel).toBeGreaterThan(0);
 await page.locator('.dinolab-3d-controls-disclosure > summary').click();await page.getByRole('slider',{name:'Body inference opacity',exact:true}).press('Home');
 await expect.poll(async()=>(await inspect(page)).coats.every(c=>c.opacity===.10&&c.transparent)).toBe(true);
 await page.getByRole('slider',{name:'Body inference opacity',exact:true}).press('End');await expect.poll(async()=>(await inspect(page)).coats.every(c=>c.opacity===1&&!c.transparent)).toBe(true);
 const after=await inspect(page);check(after);expect(after.geometries).toBe(before.geometries);expect(after.textures).toBe(before.textures);
 await page.getByRole('button',{name:/^Compare coverings:/}).click();await page.getByText('Why this covering?',{exact:true}).click();
 await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});const violations=await page.evaluate(async()=>{const r=await (window as any).axe.run(document.querySelector('.dinolab-covering-evidence'));return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});expect(violations).toEqual([]);
 await page.getByRole('button',{name:'Close field tools and return to the 3D model',exact:true}).click();await expect(page.getByRole('button',{name:/^Compare coverings:/})).toBeFocused();
 fs.writeFileSync(report+'/motion-opacity-accessibility.json',JSON.stringify({motion,violations,before,after},null,2));
});
test('Velociraptor minimum keeps forearm feathers without claiming a preserved body coat',async({page})=>{
 await mount(page,'velociraptor');expect((await inspect(page)).coats).toHaveLength(6);
 await page.getByRole('button',{name:/^Compare coverings:/}).click();await page.getByRole('button',{name:/Conservative minimum/}).click();
 await expect.poll(async()=>(await inspect(page)).coats.length).toBe(0);
 const wings=await page.evaluate(()=>{let count=0;(window as any).__coatScene.traverse(p=>{if(p.userData.featherTract==='forewing')count++;});return count;});expect(wings).toBe(20);
 await expect(page.getByRole('note').filter({hasText:'Forearm feathers are retained.'})).toBeVisible();
});
