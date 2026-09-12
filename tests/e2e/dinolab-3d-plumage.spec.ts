import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
test.describe.configure({timeout:240_000});
test.use({video:'off',trace:'off'});
const report='reports/dinolab-3d-plumage';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
  probes:"var realNow=performance.now.bind(performance);performance.now=function(){return window.__plumeClock==null?realNow():window.__plumeClock;};var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__plumeRenderedClock=window.__plumeClock;window.__plumeScene=s;window.__plumeCamera=c;window.__plumeRenderer=r;if(window.__plumeStudy){c.position.copy(window.__plumeStudy.position);c.lookAt(window.__plumeStudy.target);c.near=0.001;c.updateProjectionMatrix();}return render(s,c);};return r;};"});
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
  await expect.poll(()=>page.evaluate(()=>!!(window as any).__plumeScene)).toBe(true);
  await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();
}
async function inspect(page){
  return page.evaluate(()=>{
    const w=window as any,T=w.THREE,scene=w.__plumeScene,camera=w.__plumeCamera,model=scene.getObjectByName('dinolab-specimen');
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    const tracts:any={},owners:any={},materials:any[]=[];let invalid=0,outside=0,rootGap=0,wingArea=0;
    const featherMaps=new Set(),wingSides:any={};
    model.traverse(p=>{
      if(!p.isMesh||!p.userData.dinoAnatomy)return;
      const pos=p.geometry.attributes.position;
      for(let i=0;i<pos.count;i++){
        const v=new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(p.matrixWorld).project(camera);
        if(!Number.isFinite(v.x+v.y+v.z))invalid++;
        if(Math.abs(v.x)>1||Math.abs(v.y)>1||Math.abs(v.z)>1)outside++;
      }
      if(p.userData.dinoFeature!=='feather')return;
      const tract=p.userData.featherTract;tracts[tract]=(tracts[tract]||0)+1;
      const owner=p.parent.userData.dinoRegion;owners[owner]=(owners[owner]||0)+1;
      if(!p.userData.dinoAttachment||p.userData.dinoAttachment.surface!==owner)invalid++;
      else {
        const anchor=p.parent.localToWorld(new T.Vector3().fromArray(p.userData.dinoAttachment.point));
        rootGap=Math.max(rootGap,anchor.distanceTo(p.getWorldPosition(new T.Vector3()))/p.userData.featherWidth);
      }
      if(!p.material.map)invalid++;else featherMaps.add(p.material.map.uuid);
      if(!materials.some(m=>m.uuid===p.material.uuid))materials.push({uuid:p.material.uuid,color:p.material.color.toArray(),opacity:p.material.opacity,transparent:p.material.transparent,depthWrite:p.material.depthWrite});
      if(tract==='forewing'){
        wingSides[owner]=(wingSides[owner]||0)+1;
        const indices=p.geometry.index;
        for(let i=0;i<indices.count;i+=3){
          const vertices=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(pos,indices.getX(i+j)).applyMatrix4(p.matrixWorld).project(camera));
          const [a,b,c]=vertices;wingArea+=Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))*0.5;
        }
      }
    });
    return {tracts,owners,rootGap,wingArea,wingSides,materials,featherMaps:featherMaps.size,invalid,outside,errors:w.__events.errors,
      lost:w.__glLive().lost,shaderFailures:w.__plumeRenderer.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
  });
}
function check(result){
  expect(result.errors).toEqual([]);expect(result.invalid).toBe(0);expect(result.outside).toBe(0);
  expect(result.lost).toBe(false);expect(result.shaderFailures).toBe(0);expect(result.rootGap).toBeLessThan(0.04);
}
for(const species of ['microraptor','archaeopteryx','caudipteryx','anchiornis','sinosauropteryx','tyrannosaurus']){
  test(species+' plumage has connected broad surfaces',async({page})=>{
    const shaderErrors:string[]=[];page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL|GL_INVALID/i.test(m.text()))shaderErrors.push(m.text());});
    await mount(page,species);let result=await inspect(page);check(result);
    if(['sinosauropteryx','tyrannosaurus'].includes(species))expect(result.tracts).toEqual({});
    else{
      expect(result.tracts.forewing).toBe(20);expect(result.tracts['forewing-coverts']).toBe(20);
      expect(result.wingSides).toEqual({'forearm--1':10,'forearm-1':10});expect(result.wingArea).toBeGreaterThan(0.002);
      expect(result.featherMaps).toBe(1);expect(result.materials).toHaveLength(1);
      if(species==='microraptor')for(const channel of result.materials[0].color)expect(channel).toBeLessThan(0.025);
      if(species==='anchiornis'){
        const color=result.materials[0].color;
        expect(Math.max(...color)-Math.min(...color)).toBeLessThan(0.04);
        expect(Math.min(...color)).toBeGreaterThan(0.5);
      }
      expect(result.materials[0].opacity).toBe(1);expect(result.materials[0].transparent).toBe(false);expect(result.materials[0].depthWrite).toBe(true);
      if(['microraptor','anchiornis'].includes(species)){expect(result.tracts['hind-wing']).toBe(16);expect(result.tracts['hind-wing-coverts']).toBe(16);}
      else expect(result.tracts['hind-wing']||0).toBe(0);
      if(species==='caudipteryx')expect(result.tracts['tail-fan']).toBe(9);
      if(species==='archaeopteryx')expect(result.tracts['tail-frond']).toBe(16);
    }
    await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-life.png'});
    fs.writeFileSync(report+'/'+species+'-metrics.json',JSON.stringify(result,null,2));
    if(species==='microraptor'){
      await page.evaluate(()=>{
        const w=window as any,T=w.THREE,model=w.__plumeScene.getObjectByName('dinolab-specimen'),box=new T.Box3();
        const arm=model.children.find(p=>p.userData.dinoRegion==='forearm-1');
        arm.traverse(p=>{if(p.userData.dinoFeature==='feather')box.expandByObject(p);});
        const target=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()).length();
        w.__plumeStudy={target,position:target.clone().add(new T.Vector3(-size*0.15,size*0.4,size*1.8))};
        w.__plumeRenderer.render(w.__plumeScene,w.__plumeCamera);
      });
      await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/microraptor-wing-study.png'});
      await page.evaluate(()=>{(window as any).__plumeStudy=null;});
      await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();
    }
    if(species==='microraptor'||species==='caudipteryx'){
      await page.locator('.dinolab-3d-controls-disclosure > summary').click();
      for(const view of ['Side','Overhead']){
        await page.getByRole('button',{name:view+' camera view',exact:true}).click();result=await inspect(page);check(result);
        await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-'+view.toLowerCase()+'.png'});
      }
      await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();
      result=await inspect(page);check(result);expect(result.tracts).toEqual({});
      await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();
      await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();
      result=await inspect(page);check(result);expect(result.tracts.forewing).toBe(20);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-mobile.png'});
    }
    expect(shaderErrors).toEqual([]);
  });
}
test('tail fans remain rooted during live motion',async({page})=>{
  await mount(page,'caudipteryx',true);
  async function pose(time){
    await page.evaluate(t=>{(window as any).__plumeClock=t;},time);
    await expect.poll(()=>page.evaluate(()=>(window as any).__plumeRenderedClock)).toBe(time);
    const result=await inspect(page);check(result);expect(result.tracts['tail-fan']).toBe(9);
    return page.evaluate(()=>{
      const w=window as any,T=w.THREE,model=w.__plumeScene.getObjectByName('dinolab-specimen');
      const tail=model.children.find(p=>p.userData.dinoRegion==='tail'),fan=tail.children.find(p=>p.userData.featherTract==='tail-fan');
      return {tail:tail.rotation.toArray().slice(0,3),root:fan.getWorldPosition(new T.Vector3()).toArray(),local:fan.position.toArray()};
    });
  }
  const a=await pose(10000),b=await pose(12400);
  expect(a.tail).not.toEqual(b.tail);expect(a.root).not.toEqual(b.root);expect(a.local).toEqual(b.local);
  fs.writeFileSync(report+'/motion-metrics.json',JSON.stringify({a,b,inspection:await inspect(page)},null,2));
});
