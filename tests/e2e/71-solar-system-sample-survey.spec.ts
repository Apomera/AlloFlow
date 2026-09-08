import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const probes=`const originalAdd=THREE.Scene.prototype.add;
THREE.Scene.prototype.add=function(...objects){if(objects.some(o=>o.name==='drone-survey-pulse'))window.__surveyScene=this;return originalAdd.apply(this,objects);};`;
const wide=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:1180,height:900,appStyles:true,probes});
const phone=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:360,height:820,appStyles:true,probes});
test.beforeAll(async()=>{await wide.start();await phone.start();});
test.afterAll(async()=>{await wide.stop();await phone.stop();});
test.afterEach(async({page})=>wide.destroy(page));
test.describe.configure({timeout:300000});test.use({video:'off',trace:'off'});
for(const mode of [{planet:'mars',mobile:false},{planet:'jupiter',mobile:true}])test(mode.planet+' surveys, selects and collects the chosen contact',async({page},info)=>{
 await page.setViewportSize(mode.mobile?{width:360,height:820}:{width:1180,height:900});
 await page.emulateMedia({reducedMotion:mode.mobile?'reduce':'no-preference'});
 const harness=mode.mobile?phone:wide;
 await harness.mount(page,{solarSystem:{tutorialDismissed:true,selectedPlanet:'stem.solar_sys.'+mode.planet,viewTab:'drone',paused:true}},'document.querySelector("[data-drone-sample-survey]")');
 const canvas=page.locator('[data-drone-canvas]');await canvas.scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>!document.getElementById('descent-status'),null,{timeout:60000});
 const survey=page.getByRole('region',{name:'Sample survey',exact:true});
 const station=page.getByRole('region',{name:'Sampling station',exact:true});
 const sampleEntries=()=>page.evaluate(()=>((window as any).__toolData.solarSystem.journalEntries||[]).filter((e:any)=>e.kind==='Sample'));
 const names=await page.evaluate(()=>{
  const w=window as any,scene=w.__surveyScene,vehicle=scene.getObjectByName('exploration-vehicle');
  const orbs=scene.children.filter((o:any)=>o._sampleData&&!o._collected);w.__surveySamples=[orbs[0],orbs[2],orbs[4]];
  orbs.forEach((o:any,i:number)=>o.position.set(vehicle.position.x+90+i,vehicle.position.y+0.9,vehicle.position.z+90));
  w.__surveySamples.forEach((o:any,i:number)=>o.position.set(vehicle.position.x+[0.5,1.1,12][i],vehicle.position.y+0.9,vehicle.position.z-0.5));
  const pulse=scene.getObjectByName('drone-survey-pulse'),markers=scene.children.filter((o:any)=>o.name==='drone-survey-contact');
  const resources=new Set<any>([pulse.geometry,pulse.material]);markers.forEach((m:any)=>{resources.add(m.geometry);resources.add(m.material);});
  w.__surveyDisposals=[];resources.forEach(r=>{const i=w.__surveyDisposals.length;w.__surveyDisposals.push(0);r.addEventListener('dispose',()=>w.__surveyDisposals[i]++);});
  w.__surveyPositionBuffer=pulse.geometry.attributes.position.array;
  return w.__surveySamples.map((o:any)=>o._sampleData.name);
 });
 await page.getByRole('button',{name:'Scene focus',exact:true}).click();
 await survey.getByRole('button',{name:'Find samples',exact:true}).evaluate((button:HTMLButtonElement)=>{button.click();button.click();});
 await expect(survey).toHaveAttribute('data-survey-state','scanning');
 const geometry=await page.evaluate(()=>{
  const w=window as any,T=w.THREE,scene=w.__surveyScene,pulse=scene.getObjectByName('drone-survey-pulse'),positions=pulse.geometry.attributes.position.array;
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();let minArea=Infinity;
  for(let i=0;i<positions.length;i+=9){a.fromArray(positions,i);b.fromArray(positions,i+3);c.fromArray(positions,i+6);minArea=Math.min(minArea,b.sub(a).cross(c.sub(a)).length());}
  const ground=scene.getObjectByName('drone-geology-ground'),gaps:number[]=[];
  if(ground){scene.updateMatrixWorld(true);const ray=new T.Raycaster();for(const i of [0,Math.floor(positions.length/18)*9,positions.length-3]){ray.set(new T.Vector3(positions[i],1000,positions[i+2]),new T.Vector3(0,-1,0));gaps.push(Math.abs(positions[i+1]-ray.intersectObject(ground)[0].point.y-0.12));}}
  // Retain one actual generated sweep frame for visual inspection without extending production timing.
  const preview=pulse.clone();preview.geometry=pulse.geometry.clone();preview.name='survey-frame-preview';preview.visible=true;scene.add(preview);w.__surveyPreview=preview;
  return {minArea,gaps,count:positions.length,version:pulse.geometry.attributes.position.version};
 });
 expect(geometry.minArea).toBeGreaterThan(0.0001);if(geometry.gaps.length)expect(Math.max(...geometry.gaps)).toBeLessThan(0.0001);
 expect(geometry.count).toBe(96*6*3*(mode.mobile?3:1));
 await page.locator('#drone-fullscreen-container').screenshot({path:info.outputPath(mode.planet+'-survey-sweep.png'),timeout:60000});
 await page.evaluate(()=>{const w=window as any;w.__surveyScene.remove(w.__surveyPreview);w.__surveyPreview.geometry.dispose();});
 await expect(survey).toHaveAttribute('data-survey-state','tracking',{timeout:10000});
 await expect(survey.locator('[data-survey-summary]')).toContainText('3 contacts');
 await expect(survey.locator('[data-survey-guidance]')).toContainText(names[0]);
 expect(await sampleEntries()).toHaveLength(0);
 const active=await page.evaluate(()=>{const w=window as any,p=w.__surveyScene.getObjectByName('drone-survey-pulse');return {visible:w.__surveyScene.children.filter((o:any)=>o.name==='drone-survey-contact'&&o.visible).length,sameBuffer:w.__surveyPositionBuffer===p.geometry.attributes.position.array,version:p.geometry.attributes.position.version};});
 expect(active.visible).toBe(3);expect(active.sameBuffer).toBe(true);if(mode.mobile)expect(active.version).toBe(geometry.version);
 await survey.getByRole('button',{name:'Next contact',exact:true}).click();
 await expect(survey.locator('[data-survey-guidance]')).toContainText(names[1]);
 await expect(survey.locator('[data-survey-guidance]')).toContainText('Within reach');
 await page.locator('#drone-fullscreen-container').screenshot({path:info.outputPath(mode.planet+'-survey-tracking.png'),timeout:60000});
 const collect=station.getByRole('button',{name:'Collect sample',exact:true});
 await expect(page.locator('#hud-sample-prox')).toBeHidden();
 await page.evaluate(()=>{const w=window as any;w.__surveySamples[1].position.x+=12;});
 await collect.click();await expect(station).toContainText('Tracked specimen is out of reach');expect(await sampleEntries()).toHaveLength(0);
 const bringContactsWithinReach=()=>page.evaluate(()=>{const w=window as any,v=w.__surveyScene.getObjectByName('exploration-vehicle');w.__surveySamples[0].position.copy(v.position).add(new w.THREE.Vector3(0.25,0.6,-0.3));w.__surveySamples[1].position.copy(v.position).add(new w.THREE.Vector3(0.65,0.6,-0.4));});
 await bringContactsWithinReach();
 await collect.click();await expect(station).toHaveAttribute('data-drone-sampling','deploying');
 await station.getByRole('button',{name:'Cancel sampling',exact:true}).click();
 expect(await sampleEntries()).toHaveLength(0);
 await bringContactsWithinReach();await collect.click();await expect(station).toHaveAttribute('data-drone-sampling','sealed',{timeout:90000});
 await expect(survey).toHaveAttribute('data-survey-state','collected');
 const collected=await page.evaluate(()=>(window as any).__surveySamples.map((o:any)=>!!o._collected));expect(collected).toEqual([false,true,false]);
 expect(await sampleEntries()).toHaveLength(1);
 await survey.getByRole('button',{name:'Clear target',exact:true}).click();
 await expect(survey).toHaveAttribute('data-survey-state','idle');
 expect(await page.evaluate(()=>(window as any).__surveyScene.children.filter((o:any)=>o.name==='drone-survey-contact'&&o.visible).length)).toBe(0);
 // G uses the same cooldown and survey while preserving its existing evidence entry.
 await expect(survey.getByRole('button',{name:'Find samples',exact:true})).toBeEnabled({timeout:10000});
 await page.evaluate(()=>{const w=window as any,v=w.__surveyScene.getObjectByName('exploration-vehicle');w.__surveySamples.forEach((o:any,i:number)=>o.position.set(v.position.x+90+i,v.position.y,v.position.z+90));});
 await canvas.press('g');
 await expect(survey).toHaveAttribute('data-survey-state','empty',{timeout:10000});
 await expect.poll(()=>page.evaluate(()=>((window as any).__toolData.solarSystem.journalEntries||[]).filter((e:any)=>e.kind==='Scan').length)).toBe(1);
 if(mode.mobile){const box=await survey.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(361);}
 expect((await page.evaluate(()=>(window as any).__events.errors)).filter((e:string)=>!/ResizeObserver loop/.test(e))).toEqual([]);
 await harness.destroy(page);const disposals=await page.evaluate(()=>(window as any).__surveyDisposals);expect(disposals).toHaveLength(6);expect(disposals.every((n:number)=>n===1)).toBe(true);
});
