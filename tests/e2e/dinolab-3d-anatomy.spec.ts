import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
test.describe.configure({timeout:150_000});
const report='reports/dinolab-3d-anatomy';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
  probes:"var R=THREE.WebGLRenderer; THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__anatomyScene=s;window.__anatomyCamera=c;return render(s,c);};return r;};"});
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
  await expect.poll(()=>page.evaluate(()=>!!(window as any).__anatomyScene)).toBe(true);
  await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();
}
async function inspect(page){
  return page.evaluate(()=>{
    const w=window as any, THREE=w.THREE, scene=w.__anatomyScene,camera=w.__anatomyCamera,model=scene.getObjectByName('dinolab-specimen');
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    const features:any={}, rows:any={};let outside=0,invalid=0;
    model.traverse(p=>{
      if(p.userData.dinoFeature)features[p.userData.dinoFeature]=(features[p.userData.dinoFeature]||0)+1;
      if(p.userData.plateRow)rows[p.userData.plateRow]=(rows[p.userData.plateRow]||0)+1;
      if(!p.isMesh||!p.userData.dinoAnatomy)return;
      const vertices=p.geometry.attributes.position;
      for(let i=0;i<vertices.count;i++){const v=new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(p.matrixWorld).project(camera);
        if(!Number.isFinite(v.x+v.y+v.z))invalid++;if(Math.abs(v.x)>1||Math.abs(v.y)>1||Math.abs(v.z)>1)outside++;}
    });
    return {features,rows,outside,invalid,errors:w.__events.errors,lost:w.__glLive().lost};
  });
}
for(const species of ['stegosaurus','spinosaurus','baryonyx','triceratops','microraptor','tyrannosaurus','brachiosaurus']){
  test(species+' has coherent anatomical features and framing',async({page})=>{
    await mount(page,species);const result=await inspect(page);
    expect(result.errors).toEqual([]);expect(result.invalid).toBe(0);expect(result.outside).toBe(0);expect(result.lost).toBe(false);
    if(species==='stegosaurus'){expect(result.features['dorsal-plate']).toBe(17);expect(result.features['tail-spike']).toBe(4);expect(Object.keys(result.rows)).toHaveLength(2);}
    if(species==='spinosaurus')expect(result.features.sail).toBe(1);
    if(species==='baryonyx')expect(result.features.sail||0).toBe(0);
    if(species==='triceratops')expect(result.features.frill).toBe(1);
    if(species==='microraptor')expect(result.features.feather).toBeGreaterThanOrEqual(26);
    fs.writeFileSync(report+'/'+species+'-metrics.json',JSON.stringify(result,null,2));
    await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-life.png'});

    if(species==='spinosaurus'||species==='baryonyx'){
      await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();
      await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();
      const fossil=await inspect(page);
      expect(fossil.features['sail-support']||0).toBe(species==='spinosaurus'?8:0);
      expect(fossil.outside).toBe(0);expect(fossil.errors).toEqual([]);
      if(species==='spinosaurus')await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/spinosaurus-fossil.png'});
    }
    if(species==='triceratops'||species==='microraptor'){
      await page.locator('.dinolab-3d-controls-disclosure > summary').click();
      const view=species==='triceratops'?'Front':'Overhead';
      await page.getByRole('button',{name:view+' camera view',exact:true}).click();
      await expect.poll(async()=> (await inspect(page)).outside).toBe(0);
      await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-'+view.toLowerCase()+'.png'});
    }
    if(species==='stegosaurus'){
      await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();
      await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();
      expect((await inspect(page)).features['dorsal-plate']).toBe(17);
      await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/stegosaurus-fossil.png'});
      await page.setViewportSize({width:390,height:844});
      await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();
      await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();
      expect((await inspect(page)).outside).toBe(0);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/stegosaurus-mobile.png'});
    }
  });
}
