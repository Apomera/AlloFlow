import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
test.describe.configure({timeout:240_000});
test.use({video:'off',trace:'off'});
const report='reports/dinolab-3d-attachments';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
  probes:"var realNow=performance.now.bind(performance);performance.now=function(){return window.__attachmentClock==null?realNow():window.__attachmentClock;};var R=THREE.WebGLRenderer; THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__attachmentRenderedClock=window.__attachmentClock;window.__surfaceScene=s;window.__surfaceCamera=c;window.__surfaceRenderer=r;if(window.__surfaceCloseup){c.position.copy(window.__surfaceCloseup.position);c.lookAt(window.__surfaceCloseup.target);c.near=0.001;c.updateProjectionMatrix();}return render(s,c);};return r;};"});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});
test.afterAll(async()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));
async function mount(page,species,motion=false){
  await page.setViewportSize({width:1180,height:920});await page.emulateMedia({reducedMotion:motion?'no-preference':'reduce'});
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

    const attachmentCounts:any={};let rootError=0,scaleGap=0,neckOutside=0,neckRim=0;
    model.traverse(p=>{
      if(!p.userData.dinoAttachment)return;
      const anchor=p.userData.dinoAttachment, owner=p.parent;
      const expected=owner.localToWorld(new THREE.Vector3().fromArray(anchor.point));
      const actual=p.getWorldPosition(new THREE.Vector3());
      attachmentCounts[anchor.surface]=(attachmentCounts[anchor.surface]||0)+1;
      if(p.userData.dinoFeature==='surface-scale')scaleGap=Math.max(scaleGap,expected.distanceTo(actual)/p.scale.z);
      else if(p.userData.dinoFeature==='filament')rootError=Math.max(rootError,expected.distanceTo(actual)/p.geometry.parameters.radius);
      if(owner.userData.dinoRegion!==anchor.surface)invalid++;
    });
    const neck=model.children.find(p=>p.userData.dinoRegion==='neck'),head=model.children.find(p=>p.userData.dinoRegion==='head');
    if(neck&&head){
      const center=model.localToWorld(new THREE.Vector3().fromArray(neck.userData.dinoNeckTip));
      for(let j=0;j<24;j++){
        const vertex=new THREE.Vector3().fromBufferAttribute(neck.geometry.attributes.position,48*25+j).applyMatrix4(neck.matrixWorld);
        const delta=vertex.clone().sub(center),distance=delta.length();
        const origin=center.clone().addScaledVector(delta,8);
        const hit=new THREE.Raycaster(origin,delta.clone().normalize().negate()).intersectObject(head,false)[0];
        if(!hit||hit.point.distanceTo(center)<distance*0.97)neckOutside++;
        neckRim++;
      }
    }

    return {attachmentCounts,rootError,scaleGap,neckOutside,neckRim,mapped,coordinates,eyes,eyeClearances,invalid,outside,errors:w.__events.errors,lost:w.__glLive().lost,
      shaderFailures:w.__surfaceRenderer.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
  });
}
for(const species of ['sinosauropteryx','brachiosaurus','stegosaurus','microraptor','psittacosaurus','tyrannosaurus']){
  test(species+' neck and surface details remain connected',async({page})=>{
    const shaderErrors:string[]=[];
    page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL|GL_INVALID/i.test(m.text()))shaderErrors.push(m.text());});
    await mount(page,species);const result=await inspect(page);
    expect(result.errors).toEqual([]);expect(result.invalid).toBe(0);expect(result.outside).toBe(0);
    expect(result.lost).toBe(false);expect(result.shaderFailures).toBe(0);expect(result.mapped).toBeGreaterThan(12);
    expect(result.eyes).toHaveLength(2);for(const ratio of result.eyes)expect(ratio).toBeLessThanOrEqual(0.211);
    for(const clearance of result.eyeClearances){expect(clearance).not.toBeNull();expect(clearance).toBeGreaterThan(0.04);}
    expect(result.neckRim).toBe(24);expect(result.neckOutside).toBe(0);
    expect(Object.values(result.attachmentCounts).reduce((n:number,v:number)=>n+v,0)).toBeGreaterThan(10);
    expect(result.rootError).toBeLessThan(0.23);expect(result.scaleGap).toBeLessThan(0.32);
    fs.writeFileSync(report+'/'+species+'-metrics.json',JSON.stringify(result,null,2));
    await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-life.png'});
    if(['brachiosaurus','sinosauropteryx'].includes(species)){
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

test('surface details follow live breathing and tail motion without moving their roots',async({page})=>{
  await mount(page,'microraptor',true);
  async function pose(time:number){
    await page.evaluate(t=>{(window as any).__attachmentClock=t;},time);
    await expect.poll(()=>page.evaluate(()=>(window as any).__attachmentRenderedClock)).toBe(time);
    const inspected=await inspect(page);
    expect(inspected.invalid).toBe(0);expect(inspected.errors).toEqual([]);expect(inspected.neckOutside).toBe(0);
    expect(inspected.rootError).toBeLessThan(0.24);
    return page.evaluate(()=>{
      const w=window as any,m=w.__surfaceScene.getObjectByName('dinolab-specimen');
      return {body:m.children.find(p=>p.userData.dinoRegion==='torso').scale.toArray(),
        tail:m.children.find(p=>p.userData.dinoRegion==='tail').rotation.toArray().slice(0,3)};
    });
  }
  const a=await pose(10000),b=await pose(11200);
  expect(a.body).not.toEqual(b.body);expect(a.tail).not.toEqual(b.tail);
  await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/microraptor-motion.png'});
  fs.writeFileSync(report+'/motion-metrics.json',JSON.stringify({a,b,attachmentCheck:await inspect(page)},null,2));
});
