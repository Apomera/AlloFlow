import { test, expect } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
test.describe.configure({mode:'serial',retries:0,timeout:180000});
test.use({video:'off',trace:'off'});
const out=path.resolve('reports/scale-explorer-landscape');
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js'],probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__terrainCamera=c;return render.apply(this,arguments);};return r;}});`});
test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});
const canvas=(p:any)=>p.locator('[data-atlas-ready]');
async function mount(page:any,phone=false){
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize(phone?{width:320,height:780}:{width:1400,height:1100});
  await harness.mount(page,{},'!!document.querySelector("[data-atlas-ready]")');
  await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
}
async function fly(page:any,id:string){await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);await expect(canvas(page)).toHaveAttribute('data-atlas-objects',id);}
async function terrain(page:any){return page.evaluate(()=>{
  const w=window as any,T=w.THREE,r=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;r.scene.traverse((n:any)=>{if(n.userData.itemId==='grand-canyon')root=n;});
  const c=root.userData.model.userData.canyon,geo=c.terrain.geometry,p=root.userData.ruler.children[0].geometry.attributes.position;
  let length=0;for(let i=1;i<p.count;i++)length+=new T.Vector3().fromBufferAttribute(p,i).distanceTo(new T.Vector3().fromBufferAttribute(p,i-1));
  return{scale:root.scale.x,normalization:root.userData.model.scale.x,relief:c.land.scale.y,vertices:geo.attributes.position.count,rulerLength:length*root.scale.x,
    point:[geo.attributes.position.getX(100),geo.attributes.position.getY(100),geo.attributes.position.getZ(100)],riverVertices:c.river.geometry.attributes.position.count};
});}
test('layered terrain retains river length when vertical relief and the camera change',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);await fly(page,'grand-canyon');
  await expect(canvas(page)).toHaveAttribute('data-atlas-habitat','canyon');await expect(canvas(page)).toHaveAttribute('data-atlas-relief','8');
  const original=await terrain(page);expect(original.vertices).toBeGreaterThan(30000);expect(original.riverVertices).toBe(1026);expect(original.rulerLength).toBeCloseTo(3,5);
  await page.locator('.sx-stage').screenshot({path:path.join(out,'canyon-overview.png')});expect(looksBlank(await harness.glPixels(page))).toBe(false);
  await page.getByRole('button',{name:'Approach the rim',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','canyon-rim');await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','3.50');
  await page.locator('.sx-stage').screenshot({path:path.join(out,'canyon-rim.png')});
  await page.getByRole('button',{name:'Follow the river',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','river-bend');
  await page.locator('.sx-stage').screenshot({path:path.join(out,'river-corridor.png')});
  await page.getByRole('button',{name:'Actual proportions',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-relief','1');
  const actual=await terrain(page);expect(actual.relief).toBe(1);expect(actual.rulerLength).toBeCloseTo(original.rulerLength,8);expect(actual.point).toEqual(original.point);expect(actual.scale).toBe(original.scale);
  await page.getByRole('button',{name:'Look from above',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','canyon-overview');
  await page.locator('.sx-stage').screenshot({path:path.join(out,'actual-proportions.png')});expect(errors).toEqual([]);
});
test('Earth leads into the canyon and returns to the same globe viewpoint on a phone',async({page})=>{
  await mount(page,true);await fly(page,'earth');await expect(canvas(page)).toHaveAttribute('data-atlas-imagery','ready');
  await page.locator('.sx-details').getByRole('button',{name:'Grand Canyon, Arizona',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','arizona-canyon');
  await page.getByRole('button',{name:'Half light',exact:true}).click();
  const earth=await canvas(page).evaluate((c:HTMLElement)=>({detail:c.dataset.atlasDetail,yaw:c.dataset.atlasYaw,zoom:c.dataset.atlasZoom,aim:c.dataset.atlasAim}));
  await page.locator('.sx-stage').screenshot({path:path.join(out,'earth-canyon-portal.png')});
  await page.getByRole('region',{name:'Continue the journey',exact:true}).getByRole('button').click();await expect(canvas(page)).toHaveAttribute('data-atlas-objects','grand-canyon');
  await page.getByRole('button',{name:'Approach the rim',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','canyon-rim');
  await page.locator('.sx-stage').screenshot({path:path.join(out,'phone-canyon.png')});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.getByRole('button',{name:'Return to The Earth',exact:true}).click();
  await expect.poll(()=>canvas(page).evaluate((c:HTMLElement)=>({detail:c.dataset.atlasDetail,yaw:c.dataset.atlasYaw,zoom:c.dataset.atlasZoom,aim:c.dataset.atlasAim}))).toEqual(earth);
  await expect(canvas(page)).toHaveAttribute('data-atlas-sun-angle','90');await expect(canvas(page)).toBeFocused();
});
test('notebook restores the relief and follows the repositioned landmark, while comparisons use actual proportions',async({page})=>{
  await mount(page);await fly(page,'grand-canyon');await page.getByRole('button',{name:'Approach the rim',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','canyon-rim');
  const relief=page.getByRole('slider',{name:'Vertical relief',exact:true});await relief.fill('7');await expect(canvas(page)).toHaveAttribute('data-atlas-relief','7');
  const saved=await canvas(page).evaluate((c:HTMLElement)=>({zoom:c.dataset.atlasZoom,aim:c.dataset.atlasAim,yaw:c.dataset.atlasYaw}));
  const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox').fill('Relief changes height, not the river length.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
  await relief.fill('20');await fly(page,'moon');await book.locator('[data-observation="grand-canyon:canyon-rim"]').getByRole('button',{name:/^Return to/}).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-relief','7');await expect.poll(()=>canvas(page).evaluate((c:HTMLElement)=>({zoom:c.dataset.atlasZoom,aim:c.dataset.atlasAim,yaw:c.dataset.atlasYaw}))).toEqual(saved);
  const download=page.waitForEvent('download');await book.getByRole('button',{name:'Download notes',exact:true}).click();expect(readFileSync((await(await download).path())!,'utf8')).toContain('Vertical relief: 7×');
  const compare=page.locator('.sx-comparison-workbench');await compare.locator(':scope > summary').click();await compare.getByRole('combobox',{name:'First thing',exact:true}).selectOption('grand-canyon');await compare.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('earth');await compare.getByRole('button',{name:'Compare them',exact:true}).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-projection','orthographic');const state=await terrain(page);expect(state.relief).toBe(1);expect(state.scale/3).toBeCloseTo(446000/12742000,8);
  await expect(page.getByRole('region',{name:'Explore the canyon landscape',exact:true})).toHaveCount(0);
});
test('terrain remains interactive in WebGL 1 and blocked Earth imagery cannot offer geographic entry',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|THREE.WebGLProgram/.test(m.text()))errors.push(m.text());});
  await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:any,...args:any[]){if(type==='webgl2')return null;return(get as any).call(this,type,...args);};});
  await page.route('**/scale-earth-bluemarble-1k.png',route=>route.abort());await mount(page);await fly(page,'grand-canyon');
  await page.getByRole('button',{name:'Follow the river',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','river-bend');
  expect(looksBlank(await harness.glPixels(page))).toBe(false);await fly(page,'earth');await expect(canvas(page)).toHaveAttribute('data-atlas-imagery','failed');
  await expect(page.locator('.sx-details').getByRole('button',{name:'Grand Canyon, Arizona',exact:true})).toBeDisabled();await expect(page.getByRole('region',{name:'Continue the journey',exact:true})).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('animated Earth entry and relief inspection settle while ambience is paused',async({page})=>{
  await mount(page);await fly(page,'earth');await expect(canvas(page)).toHaveAttribute('data-atlas-imagery','ready');
  await page.locator('.sx-details').getByRole('button',{name:'Grand Canyon, Arizona',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','arizona-canyon');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.getByRole('button',{name:'Pause ambience',exact:true}).click();
  await page.getByRole('region',{name:'Continue the journey',exact:true}).getByRole('button').click();
  await expect(canvas(page)).toHaveAttribute('aria-busy','true');await expect(canvas(page)).toHaveAttribute('aria-busy','false',{timeout:15000});
  await expect(canvas(page)).toHaveAttribute('data-atlas-objects','grand-canyon');await expect(canvas(page)).toHaveAttribute('data-atlas-relief','8');
  await page.getByRole('button',{name:'Approach the rim',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','3.50');
  const localAim=()=>page.evaluate(()=>{
    const w=window as any,T=w.THREE,r=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;r.scene.traverse((n:any)=>{if(n.userData.itemId==='grand-canyon')root=n;});
    return root.userData.model.worldToLocal(new T.Vector3().fromArray(r.canvas.dataset.atlasAim.split(',').map(Number))).toArray();
  });
  await expect.poll(async()=>Math.abs((await localAim())[0]+.06)).toBeLessThan(.0002);const before=await localAim();
  await page.getByRole('slider',{name:'Vertical relief',exact:true}).fill('4');await expect(canvas(page)).toHaveAttribute('data-atlas-relief','4');
  await expect.poll(async()=>Math.abs((await localAim())[1]-before[1]/2)).toBeLessThan(.0002);
  const counts=()=>page.evaluate(()=>(window as any).__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()).renders);
  await page.waitForTimeout(700);const stopped=await counts();await page.waitForTimeout(400);expect(await counts()).toBe(stopped);
});
