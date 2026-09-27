import {test, expect} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';

const out = 'reports/anatomy-ux-review-2026-09-27';
const harness = new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true,extraScripts:['vendor/three-r128/OrbitControls.js','vendor/three-r128/GLTFLoader.js'],probes:`
  THREE.WebGLRenderer = new Proxy(THREE.WebGLRenderer, {construct(Target, args) {
    var renderer = Reflect.construct(Target, args), render = renderer.render;
    renderer.render = function(scene, camera) { window.__reviewScene = scene; window.__reviewCamera = camera; return render.apply(this, arguments); };
    return renderer;
  }});
`});
test.use({video:'off',trace:'off'});
test.beforeAll(async()=>{await harness.start();await mkdir(out,{recursive:true});});
test.afterAll(async()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

test('Explore has one phone settings group, reachable search, and compact keyboard camera controls',async({page})=>{
  test.setTimeout(180000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:390,height:844});
  await harness.mount(page,{anatomy:{}},undefined,{expectCanvas:false});
  await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}'});
  const nav=page.locator('[data-anatomy-explorer-nav]');
  const search=page.locator('#anatomy-global-search-input');
  await expect(page.locator('#anatomy-study-system')).toHaveCount(0);
  await expect(page.locator('#anatomy-explorer-system')).toBeVisible();
  await expect(page.locator('#anatomy-explorer-level')).toBeVisible();
  await expect(search).toBeVisible();
  await expect(page.getByRole('button',{name:'More controls',exact:true})).toHaveCount(1);
  const positions=await page.evaluate(()=>({model:document.querySelector('[data-anatomy-model-shell]')!.getBoundingClientRect().top,figure:document.querySelector('[data-anatomy-canvas-frame]')!.getBoundingClientRect().top}));
  expect(positions.figure).toBeLessThan(844);
  await page.screenshot({path:out+'/phone-first-screen.png'});
  await nav.getByRole('button',{name:'More controls',exact:true}).click();
  await expect(page.locator('#anatomy-study-display')).toBeVisible();
  await expect(page.locator('#anatomy-study-mode-info')).toBeVisible();
  await nav.getByRole('button',{name:'Fewer controls',exact:true}).click();
  await expect(page.locator('#anatomy-study-display')).toBeHidden();
  await expect(search).toBeVisible();
  await page.locator('#anatomy-explorer-level').selectOption('3');
  expect(await page.evaluate(()=>(window as any).__toolData.anatomy.complexity)).toBe(3);
  await search.fill('femur');await search.press('Enter');
  await expect(page.locator('[data-anatomy-structure-detail-heading]')).toHaveText('Femur');
  await page.getByRole('button',{name:'Show on atlas',exact:true}).click();
  const canvas=page.locator('.anatomy-canvas-frame canvas');
  await canvas.evaluate(el=>(el as any).__entryIdentity='retained');
  const toolbar=page.locator('[data-anatomy-canvas-toolbar]');
  const summary=toolbar.locator(':scope > summary');
  await expect(toolbar).not.toHaveAttribute('open','');
  await summary.focus();await page.keyboard.press('Enter');
  await expect(page.locator('[data-anatomy-canvas-control=zoom-in]')).toBeVisible();
  await page.locator('[data-anatomy-canvas-control=zoom-in]').click();
  await expect(summary).not.toContainText('100%');
  await expect(page.locator('[data-anatomy-canvas-control=pan-left]')).toBeEnabled();
  await page.locator('[data-anatomy-canvas-control=reset]').click();
  await expect(summary).toContainText('100%');
  await expect(canvas).toHaveJSProperty('__entryIdentity','retained');
  await summary.focus();await page.keyboard.press('Enter');
  await expect(page.locator('[data-anatomy-canvas-control=zoom-in]')).toBeHidden();
  await page.locator('#anatomy-mobile-activity').selectOption('flashcards');
  await expect(page.locator('#anatomy-study-system')).toBeVisible();
  await expect(page.locator('#anatomy-explorer-system')).toHaveCount(0);
  await page.locator('#anatomy-mobile-activity').selectOption('explore');
  await expect(search).toBeVisible();
  const scans:any[]=[];
  await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
  for(const theme of ['light','dark','contrast']){
    await page.evaluate(theme=>document.body.className=theme==='light'?'':'theme-'+theme,theme);
    const violations=await page.evaluate(async()=>{const r=await (window as any).axe.run({include:[['[data-anatomy-explorer-nav]'],['[data-anatomy-canvas-toolbar]']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}));});
    scans.push({theme,violations});
  }
  await page.evaluate(()=>document.body.className='');
  const sizes:any[]=[];
  for(const width of [320,390,768,1280]){
    await page.setViewportSize({width,height:900});
    const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    sizes.push(size);expect(size.scroll).toBeLessThanOrEqual(width+2);
  }
  await writeFile(out+'/entry-validation.json',JSON.stringify({positions,scans,sizes,errors},null,2));
  expect(scans.flatMap(s=>s.violations)).toEqual([]);expect(errors).toEqual([]);
});

test('Blueprint, bundled Surface, and clinical heart remain usable',async({page})=>{
  test.setTimeout(240000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:1280,height:1000});
  await harness.mount(page,{anatomy:{_activeTab:'explore',system:'circulatory',complexity:3,_bodyView3d:true,_body3dStyle:'blueprint',_startHereDismissed:true}},undefined,{expectCanvas:false});
  await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}'});
  const canvas=page.locator('[data-anatomy-3d-canvas]');
  await expect(canvas).toHaveAttribute('data-anatomy-3d-state',/ready/,{timeout:90000});
  await page.locator('[data-anatomy-model-focus-toggle]').click();
  await canvas.screenshot({path:out+'/blueprint.png'});
  await page.locator('[data-anatomy-model-option=realistic]').click();
  await expect(canvas).toHaveAttribute('data-anatomy-3d-state','ready-model',{timeout:90000});
  await canvas.screenshot({path:out+'/surface.png'});
  await page.locator('[data-anatomy-camera-jump=head]').click();
  await expect(canvas).toHaveAttribute('data-anatomy-camera-preset','head');
  await page.locator('[data-anatomy-model-shell]').screenshot({path:out+'/surface-region.png'});
  await page.locator('[data-anatomy-model-option=clinical]').click();
  await expect(canvas).toHaveAttribute('data-anatomy-3d-state','ready-model',{timeout:90000});
  async function checkOrganFit() {
    const fit=await page.evaluate(()=>{
      const w=window as any, T=w.THREE;let organ:any;
      w.__reviewScene.traverse((object:any)=>{if(object.userData.anatomyModelKind==='clinical')organ=object;});
      if(!organ)return null;
      const bounds=new T.Box3().setFromObject(organ),points:any[]=[];
      for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])points.push(new T.Vector3(x,y,z).project(w.__reviewCamera));
      return {maxX:Math.max(...points.map(p=>Math.abs(p.x))),maxY:Math.max(...points.map(p=>Math.abs(p.y))),stage:(document.querySelector('[data-anatomy-3d-canvas]') as any)._anatomy3dCameraSnapshot().stageVisible};
    });
    expect(fit).not.toBeNull();expect(fit!.maxX).toBeLessThan(0.95);expect(fit!.maxY).toBeLessThan(0.95);expect(fit!.stage).toBe(false);return fit;
  }
  const heart=await checkOrganFit();
  await canvas.screenshot({path:out+'/clinical-heart.png'});
  await canvas.focus();await page.keyboard.press('ArrowRight');
  await checkOrganFit();
  await page.keyboard.press('Home');
  await checkOrganFit();
  await page.locator('[data-anatomy-clinical-pack-select]').selectOption('hra-kidney-female-left-v1.3');
  await expect(canvas).toHaveAttribute('data-anatomy-3d-state','ready-model',{timeout:90000});
  const kidney=await checkOrganFit();
  await canvas.screenshot({path:out+'/clinical-kidney.png'});
  await writeFile(out+'/clinical-framing.json',JSON.stringify({heart,kidney},null,2));
  await page.locator('[data-anatomy-view-dimension="2d"]').click();
  await expect(page.locator('[data-anatomy-canvas-toolbar] > summary')).toBeVisible();
  expect(errors).toEqual([]);
});
