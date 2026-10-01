import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
const probes = `const sceneAdd=THREE.Scene.prototype.add;
THREE.Scene.prototype.add=function(...objects){
 if(objects.some(o=>o.name==='exploration-vehicle')) window.__vehicleScene=this;
 return sceneAdd.apply(this,objects);
};`;
const wide=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:1180,height:900,appStyles:true,probes});
const phone=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:360,height:820,appStyles:true,probes});
test.beforeAll(async()=>{await wide.start();await phone.start();});
test.afterAll(async()=>{await wide.stop();await phone.stop();});
test.afterEach(async({page})=>wide.destroy(page));
test.describe.configure({timeout:300000});
test.use({video:'off',trace:'off'});
for(const mode of [
 {planet:'mars',kind:'surface-rover',phone:false,reduce:false},
 {planet:'earth',kind:'submersible',phone:false,reduce:false},
 {planet:'earth',kind:'submersible',phone:true,reduce:true},
 {planet:'jupiter',kind:'atmospheric-probe',phone:false,reduce:true}
]) test(mode.planet+(mode.phone?' phone':'')+' detailed vehicle renders, moves and releases resources',async({page},info)=>{
 await page.setViewportSize(mode.phone?{width:360,height:820}:{width:1180,height:900});
 await page.emulateMedia({reducedMotion:mode.reduce?'reduce':'no-preference'});
 const harness=mode.phone?phone:wide;
 await harness.mount(page,{solarSystem:{tutorialDismissed:true,selectedPlanet:'stem.solar_sys.'+mode.planet,viewTab:'drone',paused:true}},'document.querySelector("[data-drone-camera-bar]")');
 const canvas=page.locator('[data-drone-canvas]');await canvas.scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>!document.getElementById('descent-status'),null,{timeout:60000});
 if(mode.planet==='earth') {
  await page.waitForFunction(()=>typeof (window as any).THREE.UnrealBloomPass==='function',null,{timeout:60000});
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 }
 await expect(canvas).toHaveAttribute('data-drone-vehicle-detail',mode.kind);
 const initial=await page.evaluate(()=>{
  const w=window as any,T=w.THREE,v=w.__vehicleScene.getObjectByName('exploration-vehicle');
  const meshes:any[]=[],rotors:any[]=[],wheels:any[]=[];
  v.traverse((o:any)=>{if(o.isMesh&&o.name.startsWith('vehicle-detail-'))meshes.push(o);if(o.name==='vehicle-thruster-rotor')rotors.push(o);if(o.name.startsWith('vehicle-wheel-'))wheels.push(o);});
  w.__vehicleParts=meshes;w.__vehicleRotors=rotors;w.__vehicleWheels=wheels;w.__vehicleStart=v.position.clone();
  const resources=new Set<any>();meshes.forEach(m=>{resources.add(m.geometry);resources.add(m.material);});
  w.__vehicleDisposals=[];resources.forEach(r=>{const i=w.__vehicleDisposals.length;w.__vehicleDisposals.push(0);r.addEventListener('dispose',()=>w.__vehicleDisposals[i]++);});
  const shield=v.getObjectByName('vehicle-heat-shield');let shieldTop=null;
  if(shield){shield.updateMatrix();const box=new T.Box3().setFromBufferAttribute(shield.geometry.attributes.position).applyMatrix4(shield.matrix);shieldTop=box.max.y;}
  return {meshes:meshes.length,rotors:rotors.length,wheels:wheels.length,wheelChildren:wheels.map(o=>o.children.length),spin:wheels[0]?.rotation.y||0,rotor:rotors[0]?.rotation.z||0,shieldTop,versions:meshes.map(m=>m.geometry.attributes.position.version)};
 });
 expect(initial.meshes).toBeGreaterThan(3);expect(initial.meshes).toBeLessThanOrEqual(24);
 if(mode.planet==='mars'){expect(initial.wheels).toBe(6);expect(initial.wheelChildren.every(n=>n===2)).toBe(true);}
 if(mode.planet==='earth')expect(initial.rotors).toBe(4);
 if(mode.planet==='jupiter')expect(initial.shieldTop).toBeLessThan(0.000001);
 await page.getByRole('button',{name:'Scene focus',exact:true}).click();
 await page.locator('#drone-fullscreen-container').screenshot({path:info.outputPath(mode.planet+'-vehicle-follow.png'),timeout:60000});
 // Supplemental model inspection in a neutral studio; the screenshot above uses the actual scene and camera.
 const closeup=await page.evaluate(()=>{
  const w=window as any,T=w.THREE,v=w.__vehicleScene.getObjectByName('exploration-vehicle').clone(true);
  v.name='vehicle-studio-clone';v.position.set(0,0,0);v.rotation.set(0,0,0);v.visible=true;
  const scene=new T.Scene();scene.background=new T.Color(0x15202d);scene.add(v);
  scene.add(new T.HemisphereLight(0xe0efff,0x586574,1.3));
  const light=new T.DirectionalLight(0xffeed8,2);light.position.set(-2,4,-3);scene.add(light);
  const camera=new T.PerspectiveCamera(35,1.3,0.01,30);camera.position.set(2,1.8,-3.3);camera.lookAt(0,0.3,0);
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(650,500);renderer.outputEncoding=T.sRGBEncoding;
  renderer.render(scene,camera);const data=renderer.domElement.toDataURL('image/png');renderer.dispose();renderer.forceContextLoss();return data;
 });
 writeFileSync(info.outputPath(mode.planet+'-vehicle-studio.png'),Buffer.from(closeup.split(',')[1],'base64'));
 await canvas.focus();await page.keyboard.down('KeyW');
 try {await page.waitForFunction(()=>{const w=window as any;return w.__vehicleScene.getObjectByName('exploration-vehicle').position.distanceTo(w.__vehicleStart)>0.15;},null,{timeout:30000});}
 finally {await page.keyboard.up('KeyW');}
 const moved=await page.evaluate(()=>{const w=window as any;return {axes:w.__vehicleWheels.map((o:any)=>new w.THREE.Vector3(0,1,0).applyQuaternion(o.quaternion).toArray()),spin:w.__vehicleWheels[0]?.rotation.y||0,rotor:w.__vehicleRotors[0]?.rotation.z||0,versions:w.__vehicleParts.map((m:any)=>m.geometry.attributes.position.version)};});
 expect(moved.versions).toEqual(initial.versions);
 if(mode.planet==='mars'){expect(moved.spin).not.toBe(initial.spin);for(const axis of moved.axes){expect(axis[0]).toBeCloseTo(-1,6);expect(axis[1]).toBeCloseTo(0,6);expect(axis[2]).toBeCloseTo(0,6);}}
 if(mode.planet==='earth'){if(mode.reduce)expect(moved.rotor).toBe(initial.rotor);else expect(moved.rotor).not.toBe(initial.rotor);}
 await page.getByRole('button',{name:'Pilot camera',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).__vehicleScene.getObjectByName('exploration-vehicle').visible)).toBe(false);
 if(mode.phone){const bar=await page.locator('[data-drone-camera-bar]').boundingBox();expect(bar!.x).toBeGreaterThanOrEqual(0);expect(bar!.x+bar!.width).toBeLessThanOrEqual(361);}
 expect((await page.evaluate(()=>(window as any).__events.errors)).filter((e:string)=>!/ResizeObserver loop/.test(e))).toEqual([]);
 await harness.destroy(page);
 const disposals=await page.evaluate(()=>(window as any).__vehicleDisposals);
 expect(disposals.length).toBeGreaterThan(4);expect(disposals.every((n:number)=>n===1)).toBe(true);
});
