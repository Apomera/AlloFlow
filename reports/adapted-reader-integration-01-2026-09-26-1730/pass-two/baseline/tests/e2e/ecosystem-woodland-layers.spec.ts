import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true});
test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
test('layered woodland preserves viewing gaps, scenery stability and isolation across remounts',async({page})=>{
  await page.setViewportSize({width:1140,height:1050});await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  await page.evaluate(()=>{
    document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';
    const w=window as any,p=w.THREE.Object3D.prototype,update=p.updateMatrixWorld;w.__woodlandLayers=null;
    p.updateMatrixWorld=function(force:any){const result=update.call(this,force);if(this.isScene){w.__woodlandLayers=this.children.filter((o:any)=>o.userData.woodlandLayer).map((o:any)=>({kind:o.userData.woodlandLayer,count:o.count,visible:o.visible,sites:o.userData.sites||null,matrices:Array.from(o.instanceMatrix.array),colors:o.instanceColor?Array.from(o.instanceColor.array):null,vertices:o.geometry.attributes.position.count}));}return result;};
  });
  await page.getByRole('button',{name:'Habitat restoration',exact:true}).click();
  const meadow=page.locator('[data-efw-meadow]'),canvas=meadow.locator('canvas'),stage=meadow.locator('.efw-meadow-stage');
  await expect(canvas).toHaveAttribute('data-camera-mode','habitat');
  const initial=await page.evaluate(()=>(window as any).__woodlandLayers);expect(initial).toHaveLength(2);const stems=initial.find((o:any)=>o.kind==='stems'),leaves=initial.find((o:any)=>o.kind==='leaves'),sites=stems.sites;
  expect(sites.length).toBeGreaterThan(40);expect(sites.some((p:any)=>p.shrub)).toBe(true);expect(sites.some((p:any)=>!p.shrub)).toBe(true);expect(stems.count).toBe(sites.length*4);expect(leaves.count).toBe(sites.length*16);expect(leaves.vertices).toBe(16);expect(leaves.colors).toHaveLength(leaves.count*3);
  for(let i=0;i<sites.length;i++){const p=sites[i];expect(p.x*p.x/144+p.z*p.z/100).toBeGreaterThanOrEqual(1);expect(p.z>0&&p.z<25&&Math.abs(p.x)<13.8).toBe(false);expect(Math.hypot(p.x,p.z-9.2)).toBeGreaterThan(3.4);for(let j=0;j<i;j++)expect(Math.hypot(p.x-sites[j].x,p.z-sites[j].z)).toBeGreaterThanOrEqual(p.radius+sites[j].radius+.35-1e-10);}
  expect(initial.every((o:any)=>o.matrices.every(Number.isFinite))).toBe(true);
  await stage.screenshot({path:'reports/ecosystem-woodland-layers/clearing.jpg',type:'jpeg',quality:90});await meadow.getByRole('button',{name:'Forest overview',exact:true}).click();await stage.screenshot({path:'reports/ecosystem-woodland-layers/forest.jpg',type:'jpeg',quality:90});
  await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run));
  await meadow.getByLabel('Meadow timeline',{exact:true}).fill('80');await meadow.getByLabel('Woodland lighting',{exact:true}).selectOption('golden');expect(await page.evaluate(()=>(window as any).__woodlandLayers)).toEqual(initial);
  await meadow.getByRole('button',{name:/Red foxes\s/}).click();await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();await meadow.getByRole('button',{name:'Side view',exact:true}).click();await stage.screenshot({path:'reports/ecosystem-woodland-layers/fox-habitat.jpg',type:'jpeg',quality:90});
  await meadow.getByRole('button',{name:'Isolate specimen',exact:true}).click();expect((await page.evaluate(()=>(window as any).__woodlandLayers)).every((o:any)=>o.visible===false)).toBe(true);await meadow.getByRole('button',{name:'Isolate specimen',exact:true}).click();expect(await page.evaluate(()=>(window as any).__woodlandLayers)).toEqual(initial);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(canvas).toHaveAttribute('data-behavior','Starting pose');await meadow.getByRole('button',{name:'Reset camera',exact:true}).click();await page.setViewportSize({width:390,height:844});await stage.screenshot({path:'reports/ecosystem-woodland-layers/mobile.jpg',type:'jpeg',quality:90});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Hide 3D meadow',exact:true}).click();await expect(canvas).toHaveCount(0);await page.getByRole('button',{name:'Show 3D meadow',exact:true}).click();await expect(canvas).toHaveAttribute('data-camera-mode','habitat');expect(await page.evaluate(()=>(window as any).__woodlandLayers)).toEqual(initial);expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(saved);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
