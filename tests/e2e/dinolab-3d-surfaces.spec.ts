import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
test.describe.configure({timeout:240_000});
test.use({video:'off',trace:'off'});
const report='reports/dinolab-3d-surfaces';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
  probes:"var R=THREE.WebGLRenderer; THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__surfaceScene=s;window.__surfaceCamera=c;window.__surfaceRenderer=r;if(window.__surfaceCloseup){c.position.copy(window.__surfaceCloseup.position);c.lookAt(window.__surfaceCloseup.target);c.near=0.001;c.updateProjectionMatrix();}return render(s,c);};return r;};"});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});
test.afterAll(async()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));
async function mount(page,species){
  await page.setViewportSize({width:1180,height:920});await page.emulateMedia({reducedMotion:'reduce'});
  await harness.mount(page,{dinoLab:{tab:'field3d',field3dSelected:species,field3dAutoRotate:false,field3dOrientationDismissed:true,
    field3dShowSkeleton:false,field3dShowBody:true,field3dShowHuman:false,field3dShowEvidence:false,field3dBodyOpacity:100}},undefined,{expectCanvas:false});
  const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {'),end=css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start));
  await page.addStyleTag({content:css.slice(start,end)});
  await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
  await expect.poll(()=>page.evaluate(()=>!!(window as any).__surfaceScene)).toBe(true);
  await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();
}
async function inspect(page){
  return page.evaluate(()=>{
    const w=window as any, THREE=w.THREE, scene=w.__surfaceScene,camera=w.__surfaceCamera,model=scene.getObjectByName('dinolab-specimen');
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    let mapped=0,invalid=0,outside=0,coordinates=0;const eyes:number[]=[], eyeMeshes:any[]=[], skinMeshes:any[]=[];
    model.traverse(p=>{
      if(p.userData.dinoFeature==='eye'){eyes.push(p.geometry.parameters.radius/p.userData.headRadius);eyeMeshes.push(p);}
      if(!p.isMesh||!p.userData.dinoAnatomy)return;
      if(p.material.userData.dinoSkinMapping){
        mapped++;skinMeshes.push(p);
        for(const key of ['dinoSkinPosition','dinoSkinNormal']){
          const a=p.geometry.attributes[key];if(!a||a.count!==p.geometry.attributes.position.count)invalid++;
          else {coordinates+=a.count; for(const v of a.array)if(!Number.isFinite(v))invalid++;}
        }
      }
      const vertices=p.geometry.attributes.position;
      for(let i=0;i<vertices.count;i++){const v=new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(p.matrixWorld).project(camera);
        if(!Number.isFinite(v.x+v.y+v.z))invalid++;if(Math.abs(v.x)>1||Math.abs(v.y)>1||Math.abs(v.z)>1)outside++;}
    });
    const eyeClearances=eyeMeshes.map(eye=>{
      const radius=eye.geometry.parameters.radius;
      const outward=new THREE.Vector3(0,0,Math.sign(eye.position.z)).transformDirection(model.matrixWorld);
      const origin=eye.getWorldPosition(new THREE.Vector3()).addScaledVector(outward,radius*4);
      const hit=new THREE.Raycaster(origin,outward.clone().negate(),0,radius*8).intersectObjects(skinMeshes,false)[0];
      return hit?(hit.distance-radius*(4-eye.scale.z))/radius:null;
    });
    return {mapped,coordinates,eyes,eyeClearances,invalid,outside,errors:w.__events.errors,lost:w.__glLive().lost,
      shaderFailures:w.__surfaceRenderer.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
  });
}
for(const species of ['brachiosaurus','stegosaurus','tyrannosaurus','triceratops','microraptor','spinosaurus','psittacosaurus','sinosauropteryx']){
  test(species+' skin mapping and face proportions render correctly',async({page})=>{
    const shaderErrors:string[]=[];
    page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL|GL_INVALID/i.test(m.text()))shaderErrors.push(m.text());});
    await mount(page,species);const result=await inspect(page);
    expect(result.errors).toEqual([]);expect(result.invalid).toBe(0);expect(result.outside).toBe(0);
    expect(result.lost).toBe(false);expect(result.shaderFailures).toBe(0);expect(result.mapped).toBeGreaterThan(12);
    expect(result.eyes).toHaveLength(2);for(const ratio of result.eyes)expect(ratio).toBeLessThanOrEqual(0.211);
    for(const clearance of result.eyeClearances){expect(clearance).not.toBeNull();expect(clearance).toBeGreaterThan(0.04);}
    fs.writeFileSync(report+'/'+species+'-metrics.json',JSON.stringify(result,null,2));
    await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-life.png'});
    if(['brachiosaurus','stegosaurus','tyrannosaurus'].includes(species)){
      // A study camera exposes details too small to assess in the whole-animal view.
      await page.evaluate(()=>{
        const w=window as any,T=w.THREE,model=w.__surfaceScene.getObjectByName('dinolab-specimen'),eyes:any[]=[];
        model.traverse(p=>{if(p.userData.dinoFeature==='eye')eyes.push(p);});
        const a=eyes[0].getWorldPosition(new T.Vector3()),b=eyes[1].getWorldPosition(new T.Vector3()),r=eyes[0].userData.headRadius;
        const target=a.add(b).multiplyScalar(0.5).add(new T.Vector3(-r*0.8,-r*0.25,0));
        w.__surfaceCloseup={target,position:target.clone().add(new T.Vector3(-r*5,r*2,r*12))};
        w.__surfaceRenderer.render(w.__surfaceScene,w.__surfaceCamera);
      });
      await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-head.png'});
      await page.evaluate(()=>{(window as any).__surfaceCloseup=null;});
    }
    if(species==='brachiosaurus'){
      await page.locator('.dinolab-3d-controls-disclosure > summary').click();
      const coordinates=await page.evaluate(()=>{const m=(window as any).__surfaceScene.getObjectByName('dinolab-specimen');let a:any; m.traverse(p=>{if(!a&&p.geometry?.attributes.dinoSkinPosition)a=Array.from(p.geometry.attributes.dinoSkinPosition.array);});return a;});
      await page.getByRole('button',{name:'Front camera view',exact:true}).click();
      const rotated=await page.evaluate(()=>{const m=(window as any).__surfaceScene.getObjectByName('dinolab-specimen');let a:any; m.traverse(p=>{if(!a&&p.geometry?.attributes.dinoSkinPosition)a=Array.from(p.geometry.attributes.dinoSkinPosition.array);});return a;});
      expect(rotated).toEqual(coordinates);
      expect((await inspect(page)).outside).toBe(0);
      await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();
      expect((await inspect(page)).mapped).toBe(0);
      await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();
      expect((await inspect(page)).mapped).toBeGreaterThan(12);
      await page.setViewportSize({width:390,height:844});
      await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();
      expect((await inspect(page)).outside).toBe(0);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/brachiosaurus-mobile.png'});
    }
    expect(shaderErrors).toEqual([]);
  });
}
