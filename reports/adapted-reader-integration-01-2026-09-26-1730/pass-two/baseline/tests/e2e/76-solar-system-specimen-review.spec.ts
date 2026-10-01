import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
const probes="const specimenAdd=THREE.Scene.prototype.add;THREE.Scene.prototype.add=function(...objects){if(objects.some(o=>o._sampleData))window.__specimenScene=this;return specimenAdd.apply(this,objects);};";
const wide=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:1100,height:900,appStyles:true,probes});
const phone=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:320,height:820,appStyles:true,probes});
test.beforeAll(async()=>{await wide.start();await phone.start();});test.afterAll(async()=>{await wide.stop();await phone.stop();});test.afterEach(async({page})=>wide.destroy(page));
test.describe.configure({timeout:300000});test.use({video:'off',trace:'off'});
for(const mode of [{planet:'mars',kind:'surface',mobile:false},{planet:'jupiter',kind:'gas',mobile:true},{planet:'earth',kind:'ocean',mobile:true}])test(mode.planet+' collect, review and continue exploring',async({page},info)=>{
 await page.setViewportSize(mode.mobile?{width:320,height:820}:{width:1100,height:900});await page.emulateMedia({reducedMotion:mode.mobile?'reduce':'no-preference'});
 const harness=mode.mobile?phone:wide;
 await harness.mount(page,{solarSystem:{tutorialDismissed:true,selectedPlanet:'stem.solar_sys.'+mode.planet,viewTab:'drone',paused:true}},'document.querySelector("[data-drone-sampling]")');
 const canvas=page.locator('[data-drone-canvas]'),station=page.getByRole('region',{name:'Sampling station',exact:true}),bench=page.getByRole('region',{name:'Specimen review',exact:true});
 await expect(station.getByRole('button',{name:'Review specimen',exact:true})).toBeDisabled();await expect(bench).toBeHidden();
 await canvas.scrollIntoViewIfNeeded();await page.waitForFunction(()=>!document.getElementById('descent-status'),null,{timeout:60000});
 await page.evaluate(()=>{const w=window as any,scene=w.__specimenScene,v=scene.getObjectByName('exploration-vehicle'),orbs=scene.children.filter((o:any)=>o._sampleData&&!o._collected);orbs.forEach((o:any,i:number)=>o.position.set(v.position.x+90+i,v.position.y+0.6,v.position.z+90));orbs[0].position.copy(v.position).add(new w.THREE.Vector3(0.65,0.6,-0.4));w.__reviewOrb=orbs[0];const canvas=document.querySelector("[data-drone-canvas]") as any,cleanup=canvas._droneCleanup;w.__cleanupCalled=0;w.__cleanupError=null;canvas._droneCleanup=function(){w.__cleanupCalled++;try{return cleanup();}catch(e){w.__cleanupError=String(e.stack||e);throw e;}};const rack=scene.getObjectByName('drone-specimen-rack'),resources=new Set<any>();rack.traverse((o:any)=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});w.__rackDisposals=[];resources.forEach(r=>{const i=w.__rackDisposals.length;w.__rackDisposals.push(0);r.addEventListener('dispose',()=>w.__rackDisposals[i]++);});});
 const collect=station.getByRole('button',{name:'Collect sample',exact:true});
 await collect.click();await station.getByRole('button',{name:'Cancel sampling',exact:true}).click();await expect(bench).toBeHidden();
 expect(await page.evaluate(()=>(window as any).__specimenScene.getObjectByName('drone-specimen-rack').visible)).toBe(false);
 await collect.click();await expect(station).toHaveAttribute('data-drone-sampling','sealed',{timeout:90000});
 await station.getByRole('button',{name:'Review specimen',exact:true}).click();await expect(bench.getByRole('heading',{name:'Specimen review',exact:true})).toBeFocused();
 const entries=await page.evaluate(()=>(window as any).__toolData.solarSystem.journalEntries);expect(entries.filter((e:any)=>e.kind==='Sample')).toHaveLength(1);expect(entries[0].specimen.mode).toBe(mode.kind);
 await expect(bench).toContainText('Preset teaching data:');await expect(bench).toContainText('not a microscope image');
 const art=bench.locator('canvas'),before=await art.evaluate((c:HTMLCanvasElement)=>c.toDataURL());await page.getByLabel('Turn specimen illustration',{exact:true}).fill('90');
 expect(await art.evaluate((c:HTMLCanvasElement)=>c.toDataURL())).not.toBe(before);
 const save=bench.getByRole('button',{name:'Save specimen review',exact:true});await expect(save).toBeDisabled();
 const observation='I noticed the sample illustration has bright and shaded areas <script>example</script>.';
 const question='Could a comparison with another site test my explanation?';
 await page.getByLabel('Your observation:',{exact:false}).fill(observation);await expect(save).toBeDisabled();await page.getByLabel('What would you test or compare next?',{exact:true}).fill(question);
 await save.evaluate((b:HTMLButtonElement)=>{b.click();b.click();});await expect(bench).toHaveAttribute('data-review-state','saved');
 const saved=await page.evaluate(()=>(window as any).__toolData.solarSystem.journalEntries);expect(saved).toHaveLength(entries.length);expect(saved[0].review).toMatchObject({observation,question});
 await bench.screenshot({path:info.outputPath(mode.planet+'-specimen-bench.png')});
 const bounds=await bench.evaluate(el=>{const b=el.getBoundingClientRect();return {left:b.left,right:b.right,overflow:el.scrollWidth>el.clientWidth+1};});expect(bounds.left).toBeGreaterThanOrEqual(0);expect(bounds.right).toBeLessThanOrEqual(mode.mobile?320:1100);expect(bounds.overflow).toBe(false);
 await bench.getByRole('button',{name:'Continue exploring',exact:true}).click();await expect(canvas).toBeFocused();await expect(save).toBeHidden();
 await expect.poll(()=>page.evaluate(()=>(window as any).__specimenScene.getObjectByName('drone-specimen-rack').children[1].position.y)).toBe(0.18);
 const rack=await page.evaluate(()=>{const r=(window as any).__specimenScene.getObjectByName('drone-specimen-rack');return {visible:r.visible,count:r.userData.specimenCount};});expect(rack).toEqual({visible:true,count:1});
 // Neutral-lit close-up of the actual vehicle geometry for visual QA only.
 const vehicleImage=await page.evaluate(()=>{const w=window as any,T=w.THREE,vehicle=w.__specimenScene.getObjectByName('exploration-vehicle').clone(true);vehicle.position.set(0,0,0);vehicle.rotation.set(0,0,0);vehicle.visible=true;const scene=new T.Scene();scene.background=new T.Color(0x102131);scene.add(vehicle);scene.add(new T.HemisphereLight(0xe7f4ff,0x334455,1.1));const light=new T.DirectionalLight(0xffffff,1.1);light.position.set(3,5,4);scene.add(light);const camera=new T.PerspectiveCamera(35,1.4,0.01,100);camera.position.set(2.6,2.5,3.2);camera.lookAt(0,0.45,0);const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(700,500);renderer.outputEncoding=T.sRGBEncoding;renderer.render(scene,camera);const image=renderer.domElement.toDataURL();renderer.dispose();renderer.forceContextLoss();scene.clear();return image;});
 writeFileSync(info.outputPath(mode.planet+'-specimen-canisters.png'),Buffer.from(vehicleImage.split(',')[1],'base64'));

 await canvas.press('g');await expect.poll(()=>page.evaluate(()=>((window as any).__toolData.solarSystem.journalEntries||[]).filter((e:any)=>e.kind==='Scan').length)).toBe(1);
 expect(await page.evaluate(()=>(window as any).__toolData.solarSystem.journalEntries.find((e:any)=>e.kind==='Sample').review.observation)).toBe(observation);
 await station.getByRole('button',{name:'Review specimen',exact:true}).click();await expect(page.getByLabel('Your observation:',{exact:false})).toHaveValue(observation);

 if(!mode.mobile){
  await bench.getByRole('button',{name:'Continue exploring',exact:true}).click();
  await page.evaluate(()=>{const w=window as any,scene=w.__specimenScene,v=scene.getObjectByName('exploration-vehicle'),orb=scene.children.find((o:any)=>o._sampleData&&!o._collected);orb.position.copy(v.position).add(new w.THREE.Vector3(0.65,0.6,-0.4));});
  await collect.click();await expect(station).toHaveAttribute('data-drone-sampling','sealed',{timeout:90000});await station.getByRole('button',{name:'Review specimen',exact:true}).click();
  await page.getByLabel('Your observation:',{exact:false}).fill('Draft observation for the second specimen.');
  const labels=await page.getByLabel('Recent collected specimen',{exact:true}).locator('option').allTextContents();expect(new Set(labels).size).toBe(2);
  await page.getByLabel('Recent collected specimen',{exact:true}).selectOption('1');await expect(page.getByLabel('Your observation:',{exact:false})).toHaveValue(observation);
  await page.getByLabel('Recent collected specimen',{exact:true}).selectOption('0');await expect(page.getByLabel('Your observation:',{exact:false})).toHaveValue('Draft observation for the second specimen.');
  expect(await page.evaluate(()=>(window as any).__toolData.solarSystem.journalEntries.filter((e:any)=>e.kind==='Sample').length)).toBe(2);
 }
 const persisted=await page.evaluate(()=>(window as any).__toolData);await harness.destroy(page);await expect.poll(()=>page.evaluate(()=>(window as any).__rackDisposals)).toEqual(Array(7).fill(1));expect(await page.evaluate(()=>(window as any).__cleanupError)).toBeNull();
 await harness.mount(page,persisted,'document.querySelector("[data-drone-sampling]")');await station.getByRole('button',{name:'Review specimen',exact:true}).click();await page.getByLabel('Recent collected specimen',{exact:true}).selectOption(mode.mobile?'0':'1');await expect(page.getByLabel('Your observation:',{exact:false})).toHaveValue(observation);await expect(bench).toHaveAttribute('data-review-state','saved');
 expect((await page.evaluate(()=>(window as any).__events.errors)).filter((e:string)=>!/ResizeObserver loop/.test(e))).toEqual([]);
});
