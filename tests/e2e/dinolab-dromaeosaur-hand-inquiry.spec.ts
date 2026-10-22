import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';import {GlHarness} from './helpers/stem_gl_harness';
test.describe.configure({timeout:240_000,retries:0});test.use({video:'off',trace:'off'});
const report=path.resolve('reports/dinolab-dromaeosaur-forelimb');
const probes='var RaptorHandRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new RaptorHandRenderer(o),f=r.render.bind(r);r.render=function(s,c){window.__raptorHandScene=s;window.__raptorHandCamera=c;return f(s,c)};return r};';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1280,height:960,layout:'document',appStyles:true,probes});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
const writing={version:1,pairs:[{key:'deinonychus|velociraptor',a:'deinonychus',b:'velociraptor',step:'explain',prediction:'The finger proportions may differ.',evidence:['traits'],explanation:'My own first comparison.',limit:'The complete resting pose is reconstructed.'}]};
async function mount(page:Page){
  await page.setViewportSize({width:1280,height:960});await page.emulateMedia({reducedMotion:'reduce'});
  await harness.mount(page,{dinoLab:{tab:'field3d',selected:'velociraptor',field3dSelected:'velociraptor',field3dStage:'studio',field3dOrientationDismissed:true,field3dAutoRotate:false,field3dReconstructionMode:'evidence',field3dShowSkeleton:false,field3dShowBody:true,field3dBodyOpacity:100,field3dShowHuman:false,field3dShowEvidence:false,field3dLabelMode:'anatomy',compareInquiry:writing}},undefined,{expectCanvas:false});
  const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {'),end=css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start));await page.addStyleTag({content:css.slice(start,end)});
  await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
  await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();await expect.poll(()=>page.evaluate(()=>!!(window as any).__raptorHandScene?.getObjectByName('dinolab-specimen'))).toBe(true);
  const study=page.locator('.dinolab-shape-study');if(!await study.evaluate((node:HTMLDetailsElement)=>node.open))await study.locator(':scope > summary').click();
  await page.locator('[data-dino-shape-family="dromaeosaur-hands"]').click();
}
async function ready(page:Page,species:string,focused:boolean){
  await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
  await expect.poll(()=>page.evaluate(()=>{const w=window as any,m=w.__raptorHandScene.getObjectByName('dinolab-specimen');return m.userData.dinoShapeComparison?.species;})).toBe(species);
  await expect.poll(()=>page.evaluate(()=>{const w=window as any,m=w.__raptorHandScene.getObjectByName('dinolab-specimen'),g=m.userData.dinoHandEvidence;return g?.active&&g.ray===Number((document.querySelector('[data-dino-hand-ray]') as HTMLSelectElement)?.value)&&m.userData.dinoTheropodManus?.species===w.__toolData.dinoLab.field3dSelected;})).toBe(true);
  await expect.poll(()=>page.evaluate(()=>(window as any).__raptorHandScene.getObjectByName('dinolab-specimen').userData.dinoHandEvidence.focused)).toBe(focused);
  await expect.poll(()=>page.evaluate(()=>{const w=window as any,m=w.__raptorHandScene.getObjectByName('dinolab-specimen'),counts={bone:0,life:0};m.traverse((mesh:any)=>{const tag=mesh.userData.dinoTheropodManualElement;if(tag)counts[tag.layer as 'bone'|'life']++;});return(counts.bone>0)===(w.__toolData.dinoLab.field3dShowSkeleton!==false)&&(counts.life>0)===(w.__toolData.dinoLab.field3dShowBody!==false);})).toBe(true);
  await expect.poll(()=>page.evaluate(()=>{const c=document.querySelector('canvas.dinolab-3d-canvas')!;return Math.abs((window as any).__raptorHandCamera.aspect-c.clientWidth/c.clientHeight);})).toBeLessThan(1e-6);
}
const data=(page:Page)=>page.evaluate(()=>(window as any).__toolData.dinoLab);
async function frame(page:Page){return page.evaluate(()=>{const w=window as any,m=w.__raptorHandScene.getObjectByName('dinolab-specimen'),geometry:number[]=[];m.traverse((o:any)=>{if(o.geometry)geometry.push(o.geometry.id);});return{uuid:m.uuid,geometry,camera:w.__raptorHandCamera.position.toArray(),rotation:m.rotation.y};});}
async function audit(page:Page){
  return page.evaluate(()=>{
    const w=window as any,m=w.__raptorHandScene.getObjectByName('dinolab-specimen'),camera=w.__raptorHandCamera,guide=m.userData.dinoHandEvidence,canvas=document.querySelector('canvas.dinolab-3d-canvas')!,tagged:any[]=[],native:any[]=[];let handBoneVertices=0,inFrameVertices=0,handVertices=0,inFrameHandVertices=0;
    m.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    m.traverse((mesh:any)=>{const t=mesh.userData.dinoTheropodManualElement,p=mesh.geometry?.attributes?.position;if(!t||!p)return;
      tagged.push({ray:t.ray,side:t.side,layer:t.layer,element:t.element,phalange:t.phalange,vertices:p.count});
      for(let i=0;i<p.count;i++){
        const world=new w.THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld),view=world.clone().applyMatrix4(camera.matrixWorldInverse),clip=world.clone().project(camera);
        if(t.layer==='bone'&&Number.isInteger(t.ray)){handBoneVertices++;if(view.z<0&&[clip.x,clip.y,clip.z].every(Number.isFinite)&&Math.max(Math.abs(clip.x),Math.abs(clip.y),Math.abs(clip.z))<=1)inFrameVertices++;}
        if(Number.isInteger(t.ray)||t.element==='palm'||/carpal|wrist/.test(t.element)){handVertices++;if(view.z<0&&[clip.x,clip.y,clip.z].every(Number.isFinite)&&Math.max(Math.abs(clip.x),Math.abs(clip.y),Math.abs(clip.z))<=1)inFrameHandVertices++;}
        if(t.ray===guide.ray&&t.side===guide.side&&t.layer===guide.layer)native.push({element:t.element,x:(clip.x+1)*canvas.clientWidth*.5,y:(1-clip.y)*canvas.clientHeight*.5});
      }
    });
    const polygons=Array.from(document.querySelectorAll('[data-dino-hand-polygon]')).filter(node=>(node as HTMLElement).style.display==='block').map(node=>({points:(node.getAttribute('points')||'').split(' ').filter(Boolean).map(pair=>pair.split(',').map(Number)),element:node.getAttribute('data-dino-hand-element')}));
    const allOutlinePointsNative=polygons.every(polygon=>polygon.points.every(p=>native.some(n=>n.element===polygon.element&&Math.hypot(n.x-p[0],n.y-p[1])<.02)));
    return{species:m.userData.dinoTheropodManus.species,manus:m.userData.dinoTheropodManus,guide,tagged,polygons,allOutlinePointsNative,handBoneVertices,inFrameVertices,handVertices,inFrameHandVertices,readouts:document.querySelector('#dinolab-hand-evidence-readouts')?.textContent};
  });
}

test('dromaeosaur hand exploration compares shared rays across two views, covering and species while preserving student reasoning',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await mount(page);await ready(page,'velociraptor',false);await expect(page.locator('[data-dino-shape-lens="hands"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.dinolab-hand-evidence-control')).toContainText('Both species share rays I–III');await expect(page.locator('.dinolab-shape-study')).toContainText('maximum motion range');
  await page.locator('[data-dino-inspect-hand]').click();await ready(page,'velociraptor',true);expect((await data(page)).field3dShowSkeleton).toBe(true);expect((await data(page)).field3dShowBody).toBe(false);
  await expect.poll(()=>page.locator('[data-dino-hand-source]:visible').count()).toBeGreaterThanOrEqual(2);
  await page.locator('[data-dino-hand-ray]').selectOption('3');await ready(page,'velociraptor',true);
  await expect.poll(()=>page.evaluate(()=>(window as any).__raptorHandScene.getObjectByName('dinolab-specimen').userData.dinoHandEvidence.visiblePolygons)).toBeGreaterThan(0);
  const velo=await audit(page);expect(velo.guide.state).toBe('claw-bearing');expect(velo.manus.manualRays.map((row:any)=>row.phalanges)).toEqual([2,3,4]);expect(velo.allOutlinePointsNative).toBe(true);
  expect(velo.handBoneVertices).toBeGreaterThan(0);expect(velo.inFrameVertices).toBe(velo.handBoneVertices);for(const arm of velo.manus.arms)expect(arm.palmNormal).toEqual([0,0,-arm.side]);
  const savedFrame=await frame(page);await page.locator('[data-dino-hand-ray]').selectOption('4');await ready(page,'velociraptor',true);expect((await audit(page)).polygons).toEqual([]);await expect(page.locator('[data-dino-hand-readout="pattern"]')).toContainText('No ray represented');expect(await frame(page)).toEqual(savedFrame);
  await page.locator('[data-dino-hand-ray]').selectOption('3');await ready(page,'velociraptor',true);
  const views=page.locator('.dinolab-view-check');if(!await views.evaluate((node:HTMLDetailsElement)=>node.open))await views.locator(':scope > summary').click();
  await page.locator('[data-dino-shape-keep-view="1"]').click();await expect(page.locator('[data-dino-shape-view-caption="1"]')).toContainText('ray III / claw-bearing / hand focus');
  const canvas=page.locator('canvas.dinolab-3d-canvas');await canvas.focus();for(let i=0;i<6;i++)await canvas.press('ArrowRight');await ready(page,'velociraptor',true);
  await expect.poll(async()=>Math.abs((await frame(page)).rotation-savedFrame.rotation)).toBeGreaterThan(.4);
  await page.locator('[data-dino-shape-keep-view="2"]').click();await page.locator('[data-dino-shape-append-views]').click();await expect(page.locator('#dinolab-shape-view-check-status')).toContainText('appended');
  const saved=(await data(page)).compareInquiry.pairs.find((pair:any)=>pair.key==='deinonychus|velociraptor');expect(saved.prediction).toBe(writing.pairs[0].prediction);expect(saved.limit).toBe(writing.pairs[0].limit);expect(saved.explanation).toContain(writing.pairs[0].explanation);expect(saved.explanation).toContain('not fossil proof');
  await page.locator('[data-dino-shape-append-views]').click();expect((await data(page)).compareInquiry.pairs.find((pair:any)=>pair.key===saved.key)).toEqual(saved);
  await page.locator('[data-dino-shape-dock-side="b"]').click();await ready(page,'deinonychus',true);expect(await page.locator('[data-dino-hand-ray]').inputValue()).toBe('3');
  await expect.poll(()=>page.evaluate(()=>(window as any).__raptorHandScene.getObjectByName('dinolab-specimen').userData.dinoHandEvidence.visiblePolygons)).toBeGreaterThan(0);
  const deino=await audit(page);expect(deino.manus.manualRays.map((row:any)=>row.phalanges)).toEqual([2,3,4]);expect(deino.allOutlinePointsNative).toBe(true);expect(deino.inFrameVertices).toBe(deino.handBoneVertices);
  const beforeLife=await frame(page);await page.locator('[data-dino-shape-layer="life"]').click();await ready(page,'deinonychus',true);const life=await audit(page);expect(life.guide.state).toBe('claw-bearing');expect((await frame(page)).camera).toEqual(beforeLife.camera);
  expect(life.tagged.some((tag:any)=>tag.ray===3&&tag.layer==='life'&&tag.element==='ungual')).toBe(true);expect(life.handVertices).toBeGreaterThan(1000);expect(life.inFrameHandVertices).toBe(life.handVertices);await expect(page.locator('.dinolab-hand-evidence-control')).toContainText('keratin sheath');
  await page.locator('[data-dino-shape-replay-view="1"]').click();await ready(page,'deinonychus',true);expect((await data(page)).field3dSelected).toBe('deinonychus');expect((await data(page)).field3dShowSkeleton).toBe(false);expect((await data(page)).field3dShowBody).toBe(true);
  await page.locator('[data-dino-shape-layer="bone"]').click();await ready(page,'deinonychus',true);await page.locator('.dinolab-3d-viewer').screenshot({path:path.join(report,'hand-inquiry-desktop.png')});
  await page.setViewportSize({width:341,height:920});await ready(page,'deinonychus',true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const selector of ['[data-dino-hand-ray]','[data-dino-inspect-hand]','[data-dino-hand-whole-body]'])expect((await page.locator(selector).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.locator('[data-dino-hand-ray]').focus();await page.locator('[data-dino-hand-ray]').press('ArrowUp');await page.locator('[data-dino-hand-ray]').press('Enter');await ready(page,'deinonychus',true);
  const mobile=await audit(page);expect(mobile.guide.ray).toBe(2);expect(mobile.allOutlinePointsNative).toBe(true);expect(mobile.inFrameVertices).toBe(mobile.handBoneVertices);
  await page.locator('.dinolab-3d-viewer').screenshot({path:path.join(report,'hand-inquiry-mobile.png')});
  await page.locator('[data-dino-hand-whole-body]').click();await ready(page,'deinonychus',false);expect((await data(page)).field3dShapeStudy.family).toBe('dromaeosaur-hands');
  await page.locator('[data-dino-shape-lens="outline"]').click();await expect(page.locator('[data-dino-hand-ray]')).toHaveCount(0);expect((await data(page)).compareInquiry.pairs.find((pair:any)=>pair.key===saved.key)).toEqual(saved);expect(errors).toEqual([]);
  fs.writeFileSync(path.join(report,'hand-inquiry-audit.json'),JSON.stringify({velo,deino,life,mobile,saved,errors},null,2));
});
