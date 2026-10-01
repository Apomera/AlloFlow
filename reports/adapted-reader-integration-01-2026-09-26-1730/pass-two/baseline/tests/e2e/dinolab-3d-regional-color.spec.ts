import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
test.describe.configure({timeout:240_000});test.use({video:'off',trace:'off'});
const report=process.env.DINOLAB_REPORT_DIR || 'reports/dinolab-3d-regional-color';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
probes:"var realNow=performance.now.bind(performance);performance.now=function(){return window.__regionClock==null?realNow():window.__regionClock;};var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__regionRenderedClock=window.__regionClock;window.__regionScene=s;window.__regionCamera=c;window.__regionRenderer=r;if(window.__regionStudy){c.position.copy(window.__regionStudy.position);c.lookAt(window.__regionStudy.target);c.near=.001;c.updateProjectionMatrix();}return render(s,c);};return r;};"});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});
test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page,species,motion=false,mode='evidence'){
  await page.setViewportSize({width:1180,height:920});await page.emulateMedia({reducedMotion:motion?'no-preference':'reduce'});
  await harness.mount(page,{dinoLab:{tab:'field3d',field3dSelected:species,field3dReconstructionMode:mode,field3dAutoRotate:false,field3dOrientationDismissed:true,
    field3dShowSkeleton:false,field3dShowBody:true,field3dShowHuman:false,field3dShowEvidence:false,field3dBodyOpacity:100}},undefined,{expectCanvas:false});
  const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {'),end=css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start));
  await page.addStyleTag({content:css.slice(start,end)});
  await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
  await expect.poll(()=>page.evaluate(()=>!!(window as any).__regionScene)).toBe(true);
  await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();
}
async function inspect(page){
  return page.evaluate(()=>{
    const w=window as any,T=w.THREE,scene=w.__regionScene,camera=w.__regionCamera,model=scene.getObjectByName('dinolab-specimen');
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    let invalid=0,outside=0,mapped=0,tailVertices=0,crest=0,rootGap=0;const crestMaterials:any[]=[],eyes:any[]=[];
    model.traverse(p=>{
      if(!p.isMesh||!p.userData.dinoAnatomy)return;
      const pos=p.geometry.attributes.position;
      for(let i=0;i<pos.count;i++){
        const v=new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(p.matrixWorld).project(camera);
        if(!Number.isFinite(v.x+v.y+v.z))invalid++;if(Math.abs(v.x)>1||Math.abs(v.y)>1||Math.abs(v.z)>1)outside++;
      }
      if(p.material?.userData.dinoSkinMapping){
        mapped++;const region=p.geometry.attributes.dinoSkinRegion;
        if(!region||region.count!==pos.count)invalid++;
        else for(let i=0;i<region.count;i++){
          if(!Number.isFinite(region.getX(i)+region.getY(i)))invalid++;
          if(p.userData.dinoRegion==='tail'){tailVertices++;if(region.getY(i)!==1||region.getX(i)<0||region.getX(i)>1)invalid++;}
          else if(region.getX(i)!==0||region.getY(i)!==0)invalid++;
        }
      }
      if(p.userData.dinoFeature==='eye')eyes.push(p);
      if(p.userData.dinoFeature==='crest-feather'){
        crest++;const attachment=p.userData.dinoAttachment;
        if(!attachment||p.parent.userData.dinoRegion!=='head')invalid++;
        else rootGap=Math.max(rootGap,p.parent.localToWorld(new T.Vector3().fromArray(attachment.point)).distanceTo(p.getWorldPosition(new T.Vector3()))/p.userData.featherWidth);
        if(!crestMaterials.length)crestMaterials.push({color:p.material.color.toArray(),opacity:p.material.opacity,transparent:p.material.transparent,depthWrite:p.material.depthWrite});
      }
    });
    const body=model.children.find(p=>p.userData.dinoRegion==='torso');
    let bodyTextureDeviation=0,bandOpacity=0;
    if(body){
      const canvas=body.material.map.image,ctx=canvas.getContext('2d'),data=ctx.getImageData(0,Math.floor(canvas.height/2),canvas.width,1).data,values=[];
      for(let x=0;x<canvas.width;x+=4)values.push(data[x*4]);
      const mean=values.reduce((sum,value)=>sum+value,0)/values.length;
      bodyTextureDeviation=Math.sqrt(values.reduce((sum,value)=>sum+(value-mean)**2,0)/values.length);
      const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <map_fragment>'};
      body.material.onBeforeCompile(shader);bandOpacity=shader.uniforms.dinoTailBandTint.value.w;
    }
    const head=model.children.find(p=>p.userData.dinoRegion==='head');
    const clearances=eyes.map(eye=>{
      const radius=eye.geometry.parameters.radius,outward=new T.Vector3(0,0,Math.sign(eye.position.z)).transformDirection(model.matrixWorld);
      const origin=eye.getWorldPosition(new T.Vector3()).addScaledVector(outward,radius*4);
      const hit=new T.Raycaster(origin,outward.clone().negate(),0,radius*8).intersectObject(head,true)[0];
      return hit?(hit.distance-radius*(4-eye.scale.z))/radius:null;
    });
    return {invalid,outside,mapped,tailVertices,crest,rootGap,crestMaterials,bodyTextureDeviation,bandOpacity,clearances,errors:w.__events.errors,lost:w.__glLive().lost,
      shaderFailures:w.__regionRenderer.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
  });
}
function check(r){
  expect(r.invalid).toBe(0);expect(r.outside).toBe(0);expect(r.errors).toEqual([]);expect(r.lost).toBe(false);expect(r.shaderFailures).toBe(0);expect(r.rootGap).toBeLessThan(.04);
}
for(const species of ['anchiornis','sinosauropteryx','microraptor','psittacosaurus','tyrannosaurus','brachiosaurus']){
  test(species+' uses anatomical color regions',async({page})=>{
    const errors:string[]=[];page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL|GL_INVALID/i.test(m.text()))errors.push(m.text());});
    await mount(page,species);const r=await inspect(page);check(r);expect(r.mapped).toBeGreaterThan(8);expect(r.tailVertices).toBe(1227);
    expect(r.bandOpacity).toBe(species==='sinosauropteryx'?.9:0);
    expect(r.crest).toBe(species==='anchiornis'?13:0);
    if(['anchiornis','sinosauropteryx'].includes(species))expect(r.bodyTextureDeviation).toBeLessThan(5);
    for(const clearance of r.clearances){expect(clearance).not.toBeNull();expect(clearance).toBeGreaterThan(.04);}
    await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-life.png'});
    fs.writeFileSync(report+'/'+species+'-metrics.json',JSON.stringify(r,null,2));
    if(species==='anchiornis'){
      await page.evaluate(()=>{
        const w=window as any,T=w.THREE,model=w.__regionScene.getObjectByName('dinolab-specimen'),head=model.children.find(p=>p.userData.dinoRegion==='head');
        const box=new T.Box3().setFromObject(head),target=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()).length();
        w.__regionStudy={target,position:target.clone().add(new T.Vector3(-size*.10,size*.2,size*1.8))};w.__regionRenderer.render(w.__regionScene,w.__regionCamera);
      });
      await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/anchiornis-head.png'});
      await page.evaluate(()=>{(window as any).__regionStudy=null;});await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();
      await page.locator('.dinolab-3d-controls-disclosure > summary').click();
      const opacity=page.getByRole('slider',{name:'Body inference opacity'});
      await opacity.evaluate((node,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(node,String(value));node.dispatchEvent(new Event('input',{bubbles:true}));},45);await expect.poll(async()=>(await inspect(page)).crestMaterials[0].transparent).toBe(true);
      expect((await inspect(page)).crestMaterials[0].depthWrite).toBe(false);
      await opacity.evaluate((node,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(node,String(value));node.dispatchEvent(new Event('input',{bubbles:true}));},100);await expect.poll(async()=>(await inspect(page)).crestMaterials[0].opacity).toBe(1);
    }
    if(['anchiornis','sinosauropteryx'].includes(species)){
      await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();const fossil=await inspect(page);check(fossil);expect(fossil.mapped).toBe(0);expect(fossil.crest).toBe(0);
      await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();
      await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();check(await inspect(page));
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-mobile.png'});
    }
    expect(errors).toEqual([]);
  });
}
test('tail pattern stays fixed to its moving surface',async({page})=>{
  await mount(page,'sinosauropteryx',true);
  async function pose(time){
    await page.evaluate(t=>{(window as any).__regionClock=t;},time);await expect.poll(()=>page.evaluate(()=>(window as any).__regionRenderedClock)).toBe(time);
    check(await inspect(page));
    return page.evaluate(()=>{
      const w=window as any,T=w.THREE,model=w.__regionScene.getObjectByName('dinolab-specimen'),tail=model.children.find(p=>p.userData.dinoRegion==='tail');
      return {rotation:tail.rotation.toArray().slice(0,3),coordinates:Array.from(tail.geometry.attributes.dinoSkinRegion.array),tip:new T.Vector3().fromBufferAttribute(tail.geometry.attributes.position,1200).applyMatrix4(tail.matrixWorld).toArray()};
    });
  }
  const a=await pose(10000),b=await pose(12400);expect(a.coordinates).toEqual(b.coordinates);expect(a.rotation).not.toEqual(b.rotation);expect(a.tip).not.toEqual(b.tip);
  fs.writeFileSync(report+'/motion-metrics.json',JSON.stringify({a:{rotation:a.rotation,tip:a.tip},b:{rotation:b.rotation,tip:b.tip},coordinatesStable:true},null,2));
});

for(const species of ['anchiornis','sinosauropteryx']){
  test(species+' classic reconstruction omits evidence palette features',async({page})=>{
    await mount(page,species,false,'classic');const r=await inspect(page);check(r);
    expect(r.crest).toBe(0);expect(r.bandOpacity).toBe(0);expect(r.mapped).toBeGreaterThan(8);
    fs.writeFileSync(report+'/'+species+'-classic-metrics.json',JSON.stringify(r,null,2));
  });
}
