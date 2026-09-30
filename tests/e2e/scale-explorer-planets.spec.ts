import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({mode:'serial',retries:0,timeout:180000});
test.use({video:'off',trace:'off',hasTouch:true});
const out=path.resolve('reports/scale-explorer-planets');
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js'],probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__planetCamera=c;return render.apply(this,arguments);};return r;}});`});
test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});
async function mount(page:any){
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1400,height:1100});
  await harness.mount(page,{},'!!document.querySelector("[data-atlas-ready]")');
  await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
}
async function fly(page:any,id:string,ready=true){
  await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);
  await expect(page.locator('[data-atlas-ready]')).toHaveAttribute('data-atlas-objects',id);
  if(ready)await expect(page.locator('[data-atlas-ready]')).toHaveAttribute('data-atlas-imagery','ready');
}
async function geometry(page:any,id:string){return page.evaluate(id=>{
  const w=window as any,T=w.THREE,scene=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()).scene,camera=w.__planetCamera;
  let root:any;scene.traverse((o:any)=>{if(o.userData.itemId===id)root=o;});
  const center=root.userData.model.localToWorld(new T.Vector3()),light=scene.getObjectByName('atlasSunlight');
  const sun=light.position.clone().sub(light.target.position).normalize(),view=camera.position.clone().sub(center).normalize();
  const aim=new T.Vector3().fromArray(document.querySelector('[data-atlas-ready]')!.getAttribute('data-atlas-aim')!.split(',').map(Number));
  const direction=camera.getWorldDirection(new T.Vector3());
  return {scale:root.scale.toArray(),rotation:root.userData.model.rotation.toArray(),phase:Math.acos(Math.max(-1,Math.min(1,sun.dot(view))))*180/Math.PI,
    facing:aim.clone().sub(center).normalize().dot(camera.position.clone().sub(aim).normalize()),aligned:direction.dot(aim.sub(camera.position).normalize()),key:light.position.toArray()};
},id);}
async function brightness(page:any){
  const pixels=readPng(await page.locator('[data-atlas-ready]').screenshot());let total=0,count=0;
  for(let y=Math.floor(pixels.height*.38);y<pixels.height*.67;y+=3)for(let x=Math.floor(pixels.width*.4);x<pixels.width*.6;x+=3){const c=pixels.at(x,y);total+=(c[0]+c[1]+c[2])/3;count++;}
  return total/count;
}

test('sunlight renders real phases without changing dimensions and landmarks face the observer',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await mount(page);const canvas=page.locator('[data-atlas-ready]');
  for(const [id,label,detail] of [['earth','Sahara & continents','sahara'],['moon','Tycho crater','tycho'],['jupiter','Great Red Spot','red-spot']]){
    await fly(page,id);const original=await geometry(page,id);
    await page.getByRole('button',{name:'Full light',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-illuminated','100');
    const full=await brightness(page);expect((await geometry(page,id)).phase).toBeCloseTo(0,4);
    const slider=page.getByRole('slider',{name:'Sun–observer angle',exact:true});await slider.focus();await slider.press('End');
    await expect(canvas).toHaveAttribute('data-atlas-sun-angle','180');expect((await geometry(page,id)).phase).toBeCloseTo(180,4);
    expect(await brightness(page)).toBeLessThan(full*.5);
    await page.getByRole('button',{name:'Crescent',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-illuminated','15');
    expect((await geometry(page,id)).phase).toBeCloseTo(135,4);
    expect((await geometry(page,id)).scale).toEqual(original.scale);expect((await geometry(page,id)).rotation).toEqual(original.rotation);
    await page.locator('.sx-stage').screenshot({path:path.join(out,id+'-crescent.png')});
    await page.getByRole('button',{name:'Full light',exact:true}).click();
    await page.locator('.sx-details').getByRole('button',{name:label,exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-detail',detail);
    const feature=await geometry(page,id);expect(feature.facing).toBeGreaterThan(.99);expect(feature.aligned).toBeGreaterThan(.99999);expect(feature.scale).toEqual(original.scale);
    await expect(page.locator('[data-scale-marker="'+detail+'"]')).toBeVisible();
    await page.locator('.sx-stage').screenshot({path:path.join(out,id+'-landmark.png')});
    await page.getByRole('button',{name:'Orbit right',exact:true}).click();expect((await geometry(page,id)).aligned).toBeGreaterThan(.99999);
  }
  for(let i=0;i<16;i++)await page.getByRole('button',{name:'Orbit right',exact:true}).click();
  await expect(page.locator('[data-scale-marker="red-spot"]')).toBeHidden();
  const comparison=page.locator('.sx-comparison-workbench');await comparison.locator(':scope > summary').click();
  await comparison.getByRole('combobox',{name:'First thing',exact:true}).selectOption('earth');
  await comparison.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('moon');
  await comparison.getByRole('button',{name:'Compare them',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-atlas-projection','orthographic');
  expect((await geometry(page,'earth')).key).toEqual([-3.8,5.5,5]);await expect(page.locator('.sx-lighting')).toHaveCount(0);
  await fly(page,'honeybee',false);expect((await geometry(page,'honeybee')).key).toEqual([-3.8,5.5,5]);
  expect(errors).toEqual([]);
});

test('phone controls and notebook restore lighting, viewpoint and landmark together',async({page})=>{
  await mount(page);await page.setViewportSize({width:390,height:844});await fly(page,'earth');
  const choice=page.locator('.sx-details').getByRole('button',{name:'Greenland ice sheet',exact:true});await choice.focus();await choice.press('Enter');
  const canvas=page.locator('[data-atlas-ready]');await expect(canvas).toHaveAttribute('data-atlas-detail','greenland');
  await page.getByRole('button',{name:'Half light',exact:true}).tap();await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-atlas-sun-angle','90');
  await page.locator('.sx-stage').screenshot({path:path.join(out,'phone-greenland.png')});
  await page.locator('.sx-lighting').screenshot({path:path.join(out,'phone-lighting.png')});
  const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox').fill('Ice at the edge of daylight.');
  await book.getByRole('button',{name:'Save observation',exact:true}).click();
  await fly(page,'moon');await page.getByRole('button',{name:'Full light',exact:true}).click();
  await book.locator('[data-observation="earth:greenland"]').getByRole('button',{name:/^Return to/}).click();
  await expect(canvas).toHaveAttribute('data-atlas-detail','greenland');await expect(canvas).toHaveAttribute('data-atlas-sun-angle','90');
  await expect(canvas).toHaveAttribute('data-atlas-zoom','1.80');await expect(book.getByRole('textbox')).toHaveValue('Ice at the edge of daylight.');
  const download=page.waitForEvent('download');await book.getByRole('button',{name:'Download notes',exact:true}).click();
  const content=readFileSync((await(await download).path())!,'utf8');expect(content).toContain('90° Sun–observer angle');expect(content).toContain('50%');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('missing imagery keeps lighting usable and prevents misleading geographic markers',async({page})=>{
  await page.route('**/scale-earth-bluemarble-1k.png',route=>route.abort());await mount(page);await fly(page,'earth',false);
  const canvas=page.locator('[data-atlas-ready]');await expect(canvas).toHaveAttribute('data-atlas-imagery','failed');
  await expect(page.locator('.sx-details')).toContainText('Surface imagery is unavailable');
  for(const choice of await page.locator('.sx-detail-choices button').all())await expect(choice).toBeDisabled();
  await expect(page.locator('.sx-marker:visible')).toHaveCount(0);
  await page.getByRole('button',{name:'Half light',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-illuminated','50');
});
