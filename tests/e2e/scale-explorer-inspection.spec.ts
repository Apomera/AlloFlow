import { test, expect } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 180000 });
test.use({ video: 'off', trace: 'off', hasTouch: true });
const out = path.resolve('reports/scale-explorer-inspection');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer', width: 1360, height: 900, layout: 'document', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'],
  probes: `(function(){var Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct:function(target,args,newTarget){var renderer=Reflect.construct(target,args,newTarget),render=renderer.render;renderer.render=function(scene,camera){if(scene.isScene)window.__scaleInspectionCamera=camera;return render.apply(this,arguments);};return renderer;}});})();`
});
test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]); });

async function mount(page: any) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1400, height: 1100 });
  await harness.mount(page, {}, '!!document.querySelector("[data-atlas-ready]")');
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select{font-family:inherit}' });
}
async function fly(page: any, id: string) {
  await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).selectOption(id);
  await expect(page.locator('[data-atlas-ready]')).toHaveAttribute('data-atlas-objects', id);
  await expect.poll(async () => page.locator('[data-atlas-ready]').evaluate((c: HTMLElement) => Math.abs(Number(c.dataset.atlasExponent) - Number(c.dataset.atlasTarget)))).toBeLessThan(.002);
}
async function sceneState(page: any, id: string) {
  return page.evaluate(id => {
    const r=(window as any).__glRecorder.records.find((r: any)=>!r.ctx.isContextLost());
    let specimen:any;
    r.scene.traverse((o:any)=>{if(o.userData.itemId===id)specimen=o;});
    return { scale: specimen.scale.toArray(), cameraDistance: (window as any).__scaleInspectionCamera.position.distanceTo(new (window as any).THREE.Vector3(0,.2,0)), covered: specimen.userData.model.userData.outerMembrane?.visible };
  }, id);
}

test('distinct specimens and inspection preserve measured scale', async ({ page }) => {
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await mount(page);
  for(const id of ['honeybee','ladybird','trex','giraffe','dust-mite']) {
    await fly(page,id);
    expect(looksBlank(await harness.glPixels(page)),id).toBe(false);
    await page.locator('.sx-stage').screenshot({path:path.join(out,id+'.png')});
  }
  await fly(page,'honeybee');
  const before=await sceneState(page,'honeybee');
  const exponent=await page.locator('[data-atlas-ready]').getAttribute('data-atlas-exponent');
  const zoom=page.getByRole('slider',{name:'Inspection magnification',exact:true});
  await zoom.focus();await zoom.press('End');
  await expect(page.locator('[data-atlas-ready]')).toHaveAttribute('data-atlas-zoom','2.50');
  const after=await sceneState(page,'honeybee');
  expect(after.scale).toEqual(before.scale);
  expect(before.cameraDistance/after.cameraDistance).toBeCloseTo(2.5,3);
  await expect(page.locator('[data-atlas-ready]')).toHaveAttribute('data-atlas-exponent',exponent!);
  await page.locator('.sx-stage').screenshot({path:path.join(out,'bee-close-up.png')});
  await page.getByRole('button',{name:'Fit object',exact:true}).click();
  await expect(page.locator('[data-atlas-ready]')).toHaveAttribute('data-atlas-zoom','1.00');
  await fly(page,'mitochondrion');
  const mitoBefore=await sceneState(page,'mitochondrion');
  expect(mitoBefore.covered).toBe(false);
  await page.getByRole('button',{name:'Open cutaway',exact:true}).click();
  await expect.poll(async()=>(await sceneState(page,'mitochondrion')).covered).toBe(true);
  expect((await sceneState(page,'mitochondrion')).scale).toEqual(mitoBefore.scale);
  await page.locator('.sx-stage').screenshot({path:path.join(out,'mitochondrion-closed.png')});
  await page.getByRole('button',{name:'Open cutaway',exact:true}).click();
  await expect.poll(async()=>(await sceneState(page,'mitochondrion')).covered).toBe(false);
  await page.locator('.sx-stage').screenshot({path:path.join(out,'mitochondrion-open.png')});
  expect(errors).toEqual([]);
});

test('two-finger inspection on a phone does not travel to another scale', async ({ page }) => {
  await mount(page);
  await page.setViewportSize({width:390,height:844});
  await fly(page,'honeybee');
  const canvas=page.locator('[data-atlas-ready]');
  await canvas.scrollIntoViewIfNeeded();
  const box=(await canvas.boundingBox())!,cx=box.x+box.width/2,cy=box.y+box.height*.6;
  const exponent=await canvas.getAttribute('data-atlas-exponent');
  const before=await sceneState(page,'honeybee');
  const cdp=await page.context().newCDPSession(page);
  const contacts=(d:number)=>[{id:1,x:cx-d,y:cy,radiusX:4,radiusY:4,force:1},{id:2,x:cx+d,y:cy,radiusX:4,radiusY:4,force:1}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:contacts(35)});
  for(const d of [45,55,65])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:contacts(d)});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(canvas).toHaveAttribute('data-atlas-zoom','1.90');
  await expect(page.getByRole('slider',{name:'Inspection magnification',exact:true})).toHaveValue('1.9');
  await expect(canvas).toHaveAttribute('data-atlas-exponent',exponent!);
  expect((await sceneState(page,'honeybee')).scale).toEqual(before.scale);
  await page.locator('.sx-stage').screenshot({path:path.join(out,'phone-inspection.png')});
  await page.getByRole('button',{name:'Reset camera',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-atlas-zoom','1.00');
  await expect(page.getByRole('slider',{name:'Inspection magnification',exact:true})).toHaveValue('1');
  await page.getByRole('slider',{name:'Inspection magnification',exact:true}).press('End');
  await fly(page,'rbc');
  await expect(canvas).toHaveAttribute('data-atlas-zoom','1.00');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await cdp.detach();
});
