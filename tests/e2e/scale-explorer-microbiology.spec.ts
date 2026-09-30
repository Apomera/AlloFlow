import { test, expect } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({mode:'serial',retries:0,timeout:180000});
test.use({video:'off',trace:'off'});
const out=path.resolve('reports/scale-explorer-microbiology');
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js'],probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__cellCamera=c;return render.apply(this,arguments);};return r;}});`});
test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});
async function mount(page:any,reduced=true){
  await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});await page.setViewportSize({width:1400,height:1100});
  await harness.mount(page,{},'!!document.querySelector("[data-atlas-ready]")');
  await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
}
async function fly(page:any,id:string){
  await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);
  const canvas=page.locator('[data-atlas-ready]');await expect(canvas).toHaveAttribute('data-atlas-objects',id);
  await expect.poll(()=>canvas.evaluate((c:HTMLElement)=>Math.abs(Number(c.dataset.atlasExponent)-Number(c.dataset.atlasTarget)))).toBeLessThan(.002);
}
async function cell(page:any,id:string){return page.evaluate(id=>{
  const w=window as any,T=w.THREE,scene=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()).scene;let root:any;
  scene.traverse((o:any)=>{if(o.userData.itemId===id)root=o;});
  const g=root.userData.model,body=g.children[0].geometry;body.computeBoundingBox();
  const camera=w.__cellCamera,aim=new T.Vector3().fromArray(document.querySelector('[data-atlas-ready]')!.getAttribute('data-atlas-aim')!.split(',').map(Number));
  const measuredLength=g.localToWorld(new T.Vector3(.5,0,0)).distanceTo(g.localToWorld(new T.Vector3(-.5,0,0)));
  return {scale:root.scale.x,length:body.boundingBox.max.x-body.boundingBox.min.x,measuredLength,covered:g.userData.outerMembrane.visible,inside:g.userData.innerStructures.visible,
    cilia:g.userData.ciliaMaterial?.uniforms.uTime.value,coatOpen:g.userData.coatMaterial.uniforms.uOpen.value,
    vacuoles:g.userData.vacuoles?.map((v:any)=>v.scale.toArray()),flagella:g.userData.flagella?.map((f:any)=>f.rotation.x),
    aligned:camera.getWorldDirection(new T.Vector3()).dot(aim.sub(camera.position).normalize())};
},id);}

test('distinct cell anatomy, cutaways and all landmarks preserve measured body lengths',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await mount(page);const canvas=page.locator('[data-atlas-ready]');
  for(const id of ['paramecium','ecoli']){
    await fly(page,id);const before=await cell(page,id);expect(before.length).toBeCloseTo(1,6);expect(before.measuredLength).toBeCloseTo(before.scale,8);
    const toggle=page.getByRole('button',{name:'Open cutaway',exact:true});
    if((await toggle.getAttribute('aria-pressed'))==='false')await toggle.click();
    await expect.poll(async()=>(await cell(page,id)).inside).toBe(true);expect((await cell(page,id)).covered).toBe(false);
    expect(looksBlank(await harness.glPixels(page))).toBe(false);
    await page.locator('.sx-stage').screenshot({path:path.join(out,id+'-cutaway.png')});
    await toggle.click();await expect.poll(async()=>(await cell(page,id)).covered).toBe(true);expect((await cell(page,id)).inside).toBe(false);
    expect((await cell(page,id)).coatOpen).toBe(0);
    await page.locator('.sx-stage').screenshot({path:path.join(out,id+'-closed.png')});
    for(const choice of await page.locator('.sx-detail-choices button').all()){
      await choice.click();
      const selected=page.locator('.sx-marker[aria-pressed="true"]');
      await expect(canvas).toHaveAttribute('data-atlas-detail',(await selected.getAttribute('data-scale-marker'))!);
      const current=await cell(page,id);expect(current.scale).toBe(before.scale);expect(current.length).toBe(before.length);expect(current.measuredLength).toBeCloseTo(before.measuredLength,8);expect(current.aligned).toBeGreaterThan(.99999);
      await expect(selected).toHaveAttribute('data-offset','true');
      // Read both bounds in one layout snapshot: scrolling can move the page between awaits.
      const offsetError=await page.evaluate(()=>{const m=document.querySelector('.sx-marker[aria-pressed="true"]')!.getBoundingClientRect(),c=document.querySelector('[data-atlas-ready]')!.getBoundingClientRect();return Math.abs(m.y+m.height/2-(c.y+c.height/2)-44);});
      expect(offsetError).toBeLessThan(2);
      await expect(page.locator('.sx-details').getByRole('link',{name:'Read the science source',exact:true})).toHaveAttribute('href',/^https:\/\//);
    }
    await page.locator('.sx-stage').screenshot({path:path.join(out,id+'-feature.png')});
  }
  const panel=page.locator('.sx-comparison-workbench');await panel.locator(':scope > summary').click();
  await panel.getByRole('combobox',{name:'First thing',exact:true}).selectOption('paramecium');
  await panel.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('ecoli');
  await panel.getByRole('button',{name:'Compare them',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-comparison','paramecium:ecoli');
  expect((await cell(page,'paramecium')).measuredLength/(await cell(page,'ecoli')).measuredLength).toBeCloseTo(100,8);
  await page.locator('.sx-stage').screenshot({path:path.join(out,'cells-at-shared-scale.png')});expect(errors).toEqual([]);
});

test('cilia, vacuoles and flagella move, pause, and honor reduced motion',async({page})=>{
  await mount(page,false);await fly(page,'paramecium');const before=await cell(page,'paramecium');
  await expect.poll(async()=>(await cell(page,'paramecium')).cilia).toBeGreaterThan(before.cilia+.3);
  expect((await cell(page,'paramecium')).vacuoles).not.toEqual(before.vacuoles);
  await page.getByRole('button',{name:'Pause ambience',exact:true}).click();const paused=await cell(page,'paramecium');
  await page.waitForTimeout(200);expect((await cell(page,'paramecium')).cilia).toBe(paused.cilia);expect((await cell(page,'paramecium')).vacuoles).toEqual(paused.vacuoles);
  await fly(page,'ecoli');const still=await cell(page,'ecoli');
  await page.getByRole('button',{name:'Resume ambience',exact:true}).click();
  await expect.poll(async()=>(await cell(page,'ecoli')).flagella[0]).toBeGreaterThan(still.flagella[0]+.2);
  expect((await cell(page,'ecoli')).scale).toBe(still.scale);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(page.getByRole('button',{name:'Reduced motion',exact:true})).toBeDisabled();
  const reduced=await cell(page,'ecoli');await page.waitForTimeout(200);expect((await cell(page,'ecoli')).flagella).toEqual(reduced.flagella);
});

test('phone keyboard exploration and saved notes restore the correct interior',async({page})=>{
  await mount(page);await page.setViewportSize({width:320,height:780});await fly(page,'paramecium');
  const choice=page.locator('.sx-details').getByRole('button',{name:'Contractile vacuoles',exact:true});await choice.focus();await choice.press('Enter');
  const canvas=page.locator('[data-atlas-ready]');await expect(canvas).toHaveAttribute('data-atlas-detail','contractile-vacuole');
  await expect(canvas).toBeInViewport();expect((await cell(page,'paramecium')).inside).toBe(true);
  await page.locator('.sx-stage').screenshot({path:path.join(out,'phone-vacuole.png')});
  const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox').fill('The canals join a central reservoir.');
  await book.getByRole('button',{name:'Save observation',exact:true}).click();
  await fly(page,'ecoli');await page.locator('.sx-details').getByRole('button',{name:'Cell envelope & pili',exact:true}).click();
  expect((await cell(page,'ecoli')).inside).toBe(false);
  await book.locator('[data-observation="paramecium:contractile-vacuole"]').getByRole('button',{name:/^Return to/}).click();
  await expect(canvas).toHaveAttribute('data-atlas-detail','contractile-vacuole');expect((await cell(page,'paramecium')).inside).toBe(true);
  await expect(book.getByRole('textbox')).toHaveValue('The canals join a central reservoir.');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
