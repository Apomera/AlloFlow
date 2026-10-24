import {test,expect,type Page} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';
const dir='reports/ecosystem-jaws-interactions-lab';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true,
 probes:`const OriginalRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(OriginalRenderer,{construct(target,args,newTarget){const r=Reflect.construct(target,args,newTarget),render=r.render;window.__jawRenderer=r;r.render=function(scene,camera){window.__jawCamera=camera;return render.call(this,scene,camera);};return r;}});`});
test.describe.configure({timeout:300_000,retries:0});
test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());
test.afterEach(async({page})=>{const errors=await page.evaluate(()=>(window as any).__events?.errors||[]);await harness.destroy(page);expect(errors).toEqual([]);});
async function mount(page:Page){
 await page.setViewportSize({width:1140,height:1050});await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
 await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';});
 await page.getByRole('button',{name:'Rabbit neighbors',exact:true}).click();await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
 const meadow=page.locator('[data-efw-meadow]');if(!(await meadow.isVisible()))await page.getByRole('button',{name:'Show 3D meadow',exact:true}).click();
 await page.waitForFunction(()=>{const hit=(window as any).__glCanvas?.('[data-efw-meadow]');return hit?.rec?.scene&&hit.rec.draws>0&&document.querySelector('[data-efw-meadow] canvas')?.hasAttribute('data-representative-index');},undefined,{timeout:60_000});
 await meadow.getByLabel('Meadow scene data',{exact:true}).selectOption('baseline');return meadow;
}
async function choose(page:Page,id:string,step:number,index:number){
 const meadow=page.locator('[data-efw-meadow]');await meadow.getByRole('button',{name:id==='foxes'?/Red foxes\s[\d.]/:/Rabbits\s[\d.]/}).click();
 if(!(await meadow.getByLabel('Representative animal',{exact:true}).count()))await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();
 await meadow.getByLabel('Meadow timeline',{exact:true}).fill(String(step));const selector=meadow.getByLabel('Representative animal',{exact:true});if(await selector.isEnabled())await selector.selectOption(String(index));
 await expect(meadow.locator('canvas')).toHaveAttribute('data-selected-species',id);await expect(meadow.locator('canvas')).toHaveAttribute('data-step',String(step));await expect(meadow.locator('canvas')).toHaveAttribute('data-representative-index',String(index));
}
async function anatomy(page:Page,id:string,index:number){return page.evaluate(({id,index})=>{
 const w=window as any,T=w.THREE,api=w.StemLab.ecosystemFoodWeb,scene=w.__glCanvas('[data-efw-meadow]').rec.scene,animals=scene.children.filter((g:any)=>g.userData.headSurface?.name==='eco-'+id+'-head-surface'),a=animals[index],d=a.userData;
 function shown(p:any){for(let n=p;n;n=n.parent)if(!n.visible)return false;return true;}
 function skin(mesh:any,data:any){const positions=mesh.geometry.getAttribute('position'),normals=mesh.geometry.getAttribute('normal');let error=0,normalError=0;for(let k=0;k<positions.array.length;k++)error=Math.max(error,Math.abs(positions.array[k]-data.positions[k]));for(let k=0;k<normals.count;k++)normalError=Math.max(normalError,Math.abs(Math.hypot(normals.getX(k),normals.getY(k),normals.getZ(k))-1));const batch=scene.children.find((n:any)=>n.isInstancedMesh&&n.userData.parts?.includes(mesh)),parts=batch?.userData.parts.filter(shown)||[],instance=parts.indexOf(mesh),matrix=new T.Matrix4();if(instance>=0)batch.getMatrixAt(instance,matrix);return {name:mesh.name,vertices:positions.count,triangles:mesh.geometry.index.count/3,error,normalError,shown:shown(mesh),layer:mesh.layers.mask,instance,matrixError:instance<0?Infinity:Math.max(...matrix.elements.map((v:number,k:number)=>Math.abs(v-mesh.matrixWorld.elements[k]))),sharedGeometry:animals.every((x:any)=>x.userData[mesh===d.jawSurface?'jawSurface':'mouthMargin'].geometry===mesh.geometry),sharedMaterial:animals.every((x:any)=>x.userData[mesh===d.jawSurface?'jawSurface':'mouthMargin'].material===mesh.material)};}
 return {head:d.head.matrix.toArray(),body:d.body.matrix.toArray(),nose:d.nose.matrix.toArray(),eyes:d.eyeGroups.map((e:any)=>e.matrix.toArray()),hinge:d.jaw.position.toArray(),jaw:d.jaw.rotation.toArray(),jawWorld:d.jawSurface.matrixWorld.toArray(),mouthWorld:d.mouthMargin.matrixWorld.toArray(),jawParent:d.jawSurface.parent===d.jaw,mouthParent:d.mouthMargin.parent===d.head,chin:skin(d.jawSurface,api.mammalJawSurface(id)),margin:skin(d.mouthMargin,api.mammalMouthSurface(id)),renderer:w.__jawRenderer.info.memory};
},{id,index});}
function sameNumbers(actual:any,expected:any){if(Array.isArray(expected)){expect(actual.length).toBe(expected.length);expected.forEach((v:any,k:number)=>sameNumbers(actual[k],v));}else if(typeof expected==='number')expect(Math.abs(actual-expected)).toBeLessThan(1e-12);else expect(actual).toEqual(expected);}

test('fitted chins and mouth margins draw through shared batches while original face mounts and recorded chewing remain exact',async({page})=>{
 const baseline=JSON.parse(await readFile(dir+'/jaw-baseline.json','utf8')),meadow=await mount(page),results:any[]=[];
 expect(await page.evaluate(()=>(window as any).__toolData.ecosystem.foodWeb.run.config)).toEqual(baseline.fixture.config);
 for(const sample of baseline.samples){
  await choose(page,sample.id,sample.step,sample.index);if(await meadow.getByRole('button',{name:'Isolate specimen',exact:true}).getAttribute('aria-pressed')!=='true')await meadow.getByRole('button',{name:'Isolate specimen',exact:true}).click();
  await meadow.getByRole('button',{name:'Face detail',exact:true}).click();await meadow.getByRole('button',{name:'Side view',exact:true}).click();
  const actual=await anatomy(page,sample.id,sample.index);for(const key of ['head','body','nose','eyes','hinge','jaw'])sameNumbers(actual[key],sample[key]);
  expect(actual.jawParent).toBe(true);expect(actual.mouthParent).toBe(true);
  for(const [key,vertices,triangles,suffix]of [['chin',629,1216,'jaw-surface'],['margin',260,256,'mouth-margin']] as any[]){const skin=actual[key];expect(skin).toMatchObject({name:'eco-'+sample.id+'-'+suffix,vertices,triangles,shown:true,sharedGeometry:true,sharedMaterial:true,layer:2});expect(skin.error).toBeLessThan(1e-7);expect(skin.normalError).toBeLessThan(1e-5);expect(skin.instance).toBeGreaterThanOrEqual(0);expect(skin.matrixError).toBeLessThan(2e-6);}
  await meadow.locator('.efw-meadow-stage').screenshot({path:dir+'/after-'+sample.name+'-profile.jpg',type:'jpeg',quality:90});await meadow.getByRole('button',{name:'Rotate right',exact:true}).click();await meadow.locator('.efw-meadow-stage').screenshot({path:dir+'/after-'+sample.name+'-oblique.jpg',type:'jpeg',quality:90});results.push({name:sample.name,...actual});
 }
 const open=results.find(s=>s.name==='rabbit-open'),closed=results.find(s=>s.name==='rabbit-closed');expect(open.jawWorld).not.toEqual(closed.jawWorld);expect(Math.abs(open.jaw[2])).toBeGreaterThan(Math.abs(closed.jaw[2]));
 await choose(page,'rabbits',227,1);const rewind=await anatomy(page,'rabbits',1);sameNumbers(rewind.jawWorld,open.jawWorld);sameNumbers(rewind.mouthWorld,open.mouthWorld);
 await choose(page,'rabbits',0,1);await page.emulateMedia({reducedMotion:'reduce'});await expect(meadow.locator('canvas')).toHaveAttribute('data-behavior','Starting pose');const still=await anatomy(page,'rabbits',1);await meadow.getByLabel('Meadow timeline',{exact:true}).fill('160');const later=await anatomy(page,'rabbits',1);sameNumbers(later.jawWorld,still.jawWorld);expect(Math.abs(later.jaw[1])).toBe(0);expect(Math.abs(later.jaw[2])).toBe(0);await expect(meadow.locator('canvas')).toHaveAttribute('data-behavior','Starting pose');
 await writeFile(dir+'/jaw-rendered.json',JSON.stringify({samples:results,reducedJaw:later.jaw,originalMountsUnchanged:true},null,2)+'\n');
});

test('alternate footfall views inspect one fixed original pose and return keyboard focus to the same coding cell',async({page})=>{
 const meadow=await mount(page),canvas=meadow.locator('canvas'),movement=meadow.locator('[data-efw-movement-study]');await choose(page,'rabbits',0,0);
 await movement.getByRole('button',{name:'Study a rabbit movement',exact:true}).click();
 for(let k=0;k<3;k++)await movement.getByLabel(['First','Middle','Last'][k]+' movement snapshot',{exact:true}).selectOption(String(k));await movement.getByRole('button',{name:'Check my sequence',exact:true}).click();
 const lab=movement.locator('[data-efw-footfall-lab]');await lab.locator('summary').press('Enter');
 await lab.getByLabel('Footfall support prediction',{exact:true}).selectOption('unsure');
 const fixture=await page.evaluate(()=>{const w=window as any,api=w.StemLab.ecosystemFoodWeb,c=w.__toolData.ecosystem.foodWeb.run.config,f=api.behaviorTimeline(c,api.compare(c).baseline),s=api.motionStudy(f,'rabbits',0);return {study:s,plan:api.footfallPlan(f,s)};});
 const results:any[]=[];
 for(let k=0;k<3;k++){
  const views:any[]=[];
  for(const angle of ['left','right','above']){
   await lab.getByRole('button',{name:'Observe checkpoint '+(k+1)+' from '+angle,exact:true}).press('Enter');
   await expect(canvas).toHaveAttribute('data-step',String(fixture.plan.samples[k].step));await expect(canvas).toHaveAttribute('data-selected-species','rabbits');await expect(canvas).toHaveAttribute('data-representative-index','0');
   const dock=meadow.locator('[data-efw-observation-dock]').getByRole('button',{name:'Code footfall checkpoint '+(k+1),exact:true});await expect(dock).toBeFocused();
   views.push(await page.evaluate(()=>{const w=window as any,scene=w.__glCanvas('[data-efw-meadow]').rec.scene,a=scene.children.filter((g:any)=>g.userData.headSurface?.name==='eco-rabbits-head-surface')[0],d=a.userData;return {root:a.matrixWorld.toArray(),body:d.body.matrix.toArray(),head:d.head.matrix.toArray(),paws:d.paws.map((p:any)=>p.userData.paw.matrixWorld.toArray()),camera:w.__jawCamera.matrixWorld.toArray(),branch:document.querySelector('[data-efw-meadow] canvas')?.getAttribute('data-branch')};}));
   if(k===0)await meadow.locator('.efw-meadow-stage').screenshot({path:dir+'/footfall-'+angle+'.jpg',type:'jpeg',quality:88});
   await dock.press('Enter');await expect(lab.getByLabel('Checkpoint '+(k+1)+' Left hind contact',{exact:true})).toBeFocused();
  }
  for(const v of views.slice(1))for(const key of ['root','body','head','paws','branch'])expect(v[key]).toEqual(views[0][key]);expect(views[1].camera).not.toEqual(views[0].camera);expect(views[2].camera).not.toEqual(views[0].camera);
  for(const paw of ['Left hind','Left fore','Right hind','Right fore'])await lab.getByLabel('Checkpoint '+(k+1)+' '+paw+' contact',{exact:true}).selectOption('uncertain');results.push({checkpoint:k+1,views});
 }
 await lab.getByRole('button',{name:'Check my footfall strip',exact:true}).press('Enter');await expect(lab.locator('[data-efw-footfall-feedback]')).toContainText('All 12 marks are uncertain');await expect(lab.locator('[data-efw-footfall-observation-bounds]')).toContainText('Your marks leave the support claim unresolved.');
 await lab.getByRole('button',{name:'Observe checkpoint 1 from right',exact:true}).press('Enter');await meadow.locator('[data-efw-observation-dock]').getByRole('button',{name:'Code footfall checkpoint 1',exact:true}).press('Enter');await lab.getByLabel('Checkpoint 1 Left hind contact',{exact:true}).selectOption(fixture.plan.samples[0].feet[0].planted?'contact':'clear');await lab.getByRole('button',{name:'Check revised footfall strip',exact:true}).press('Enter');await expect(lab.locator('[data-efw-footfall-feedback]')).toContainText('First submission: all 12 marks were uncertain.');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await lab.screenshot({path:dir+'/footfall-mobile.jpg',type:'jpeg',quality:86});
 await page.emulateMedia({reducedMotion:'reduce'});await expect(lab.getByRole('button',{name:'Observe checkpoint 1 from left',exact:true})).toBeDisabled();await expect(lab.locator('[data-efw-footfall-reduced]')).toContainText('Exact recorded paw descriptions');
 await writeFile(dir+'/footfall-rendered.json',JSON.stringify({fixedPoseViews:results,keyboardReturn:true,mobileNoOverflow:true,reducedViewsDisabled:true},null,2)+'\n');
});
