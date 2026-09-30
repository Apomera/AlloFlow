import { test, expect } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({mode:'serial',retries:0,timeout:180000});
test.use({video:'off',trace:'off'});
const out=path.resolve('reports/scale-explorer-descent');
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js']});
test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await page.evaluate(()=>{delete (performance as any).now;});await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});
const canvas=(p:any)=>p.locator('[data-atlas-ready]');
async function mount(page:any,phone=false){
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize(phone?{width:320,height:780}:{width:1400,height:1100});
  await harness.mount(page,{},'!!document.querySelector("[data-atlas-ready]")');
  await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
  await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption('solar-system');
  await expect(canvas(page)).toHaveAttribute('data-atlas-objects','solar-system');
  await page.locator('.sx-details').getByRole('button',{name:phone?'Earth':'Jupiter',exact:true}).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-detail',phone?'earth-orbit':'jupiter-orbit');
  await canvas(page).scrollIntoViewIfNeeded();
}
async function animate(page:any){
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.getByRole('button',{name:'Pause ambience',exact:true}).click();
  // Freeze only the application's elapsed-time clock. WebGL, rAF, pointer events
  // and layout keep running, so screenshots and scene assertions use real renders.
  await page.evaluate(()=>{
    const start=performance.now();(window as any).__scaleTime=(ms:number)=>Object.defineProperty(performance,'now',{configurable:true,value:()=>start+ms});
    (window as any).__scaleTime(0);
  });
}
async function enter(page:any){await page.getByRole('region',{name:'Continue the journey',exact:true}).getByRole('button').click();}
async function advance(page:any,ms:number){await page.evaluate(ms=>(window as any).__scaleTime(ms),ms);}
async function settled(page:any,id:string){
  await expect(canvas(page)).toHaveAttribute('data-atlas-flight','');
  await expect(canvas(page)).toHaveAttribute('data-atlas-objects',id);
  await expect.poll(()=>canvas(page).evaluate((c:HTMLElement)=>Math.abs(Number(c.dataset.atlasExponent)-Number(c.dataset.atlasTarget)))).toBeLessThan(.002);
}

test('a centered descent changes measured scale, keeps rendering with ambience paused, and arrives cleanly',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await mount(page);await animate(page);await enter(page);
  await expect(canvas(page)).toHaveAttribute('aria-busy','true');
  await advance(page,200);await expect(canvas(page)).toHaveAttribute('data-atlas-flight','departure');
  await expect(canvas(page)).toHaveAttribute('data-atlas-objects','solar-system');
  await advance(page,1700);await expect(canvas(page)).toHaveAttribute('data-atlas-flight','descent');
  await expect(canvas(page)).toBeFocused();await expect(page.locator('[data-flight-locator]')).toBeVisible();
  await page.locator('.sx-stage').screenshot({path:path.join(out,'jupiter-position.png')});
  const before=await canvas(page).getAttribute('data-atlas-exponent');
  await advance(page,2480);await expect.poll(()=>canvas(page).getAttribute('data-atlas-exponent')).not.toBe(before);
  await expect(page.locator('[data-flight-locator]')).toBeHidden();
  const measured=await page.evaluate(()=>{
    const r=(window as any).__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any,rings:any;
    r.scene.traverse((o:any)=>{if(o.userData.itemId==='jupiter')root=o;if(o.name==='scaleMeasurementRings')rings=o;});
    return {scale:root.scale.x,position:root.position.toArray(),expected:3*Math.pow(10,Math.log10(1.43e8)-Number(r.canvas.dataset.atlasExponent)),rings:rings.children.map((l:any)=>l.scale.x)};
  });
  expect(measured.position).toEqual([0,0,0]);expect(measured.scale/measured.expected).toBeCloseTo(1,3);
  for(let i=1;i<measured.rings.length;i++)expect(measured.rings[i]/measured.rings[i-1]).toBeCloseTo(10,8);
  await expect(page.getByRole('region',{name:'Scale approach',exact:true})).toBeVisible();
  await page.locator('.sx-stage').screenshot({path:path.join(out,'jupiter-descent.png')});
  expect(looksBlank(await harness.glPixels(page))).toBe(false);
  const flightHeight=await canvas(page).evaluate((c:HTMLElement)=>c.clientHeight);
  await advance(page,5000);await settled(page,'jupiter');expect(await canvas(page).evaluate((c:HTMLElement)=>c.clientHeight)).toBe(flightHeight);await expect(canvas(page)).toHaveAttribute('aria-busy','false');
  await expect(page.getByRole('region',{name:'Scale approach',exact:true})).toHaveCount(0);await expect(page.locator('.sx-flight-labels')).toBeHidden();
  await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','1.00');
  await page.locator('.sx-stage').screenshot({path:path.join(out,'jupiter-arrival.png')});
  expect(errors).toEqual([]);
});

test('phone arrival controls fit and return keyboard focus while the route restores its origin',async({page})=>{
  await mount(page,true);const old=await canvas(page).evaluate((c:HTMLElement)=>({detail:c.dataset.atlasDetail,yaw:c.dataset.atlasYaw,zoom:c.dataset.atlasZoom,aim:c.dataset.atlasAim}));
  await animate(page);await enter(page);await advance(page,2710);await expect(canvas(page)).toHaveAttribute('data-atlas-flight','descent');
  await page.locator('.sx-stage').screenshot({path:path.join(out,'phone-earth-descent.png')});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const button=page.getByRole('button',{name:'Arrive now',exact:true}),bounds=await button.boundingBox();expect(bounds!.height).toBeGreaterThanOrEqual(44);
  await button.focus();await button.press('Enter');await settled(page,'earth');await expect(canvas(page)).toBeFocused();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'Return to The Solar System',exact:true}).click();
  await expect.poll(()=>canvas(page).evaluate((c:HTMLElement)=>({detail:c.dataset.atlasDetail,yaw:c.dataset.atlasYaw,zoom:c.dataset.atlasZoom,aim:c.dataset.atlasAim}))).toEqual(old);
});

test('Escape, a new destination and a change to reduced motion each settle an active approach',async({page})=>{
  await mount(page);await animate(page);await enter(page);await advance(page,1300);await expect(canvas(page)).toHaveAttribute('data-atlas-flight','descent');
  await canvas(page).focus();await canvas(page).press('Escape');await settled(page,'jupiter');
  await page.getByRole('button',{name:'Return to The Solar System',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','jupiter-orbit');
  await enter(page);await advance(page,1700);
  await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption('sun');
  await advance(page,6000);await settled(page,'sun');await expect(page.getByRole('navigation',{name:'Your exploration route'})).toHaveCount(0);
  await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption('solar-system');
  await page.locator('.sx-details').getByRole('button',{name:'Jupiter',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','jupiter-orbit');
  await page.emulateMedia({reducedMotion:'no-preference'});await enter(page);await advance(page,7200);await expect(canvas(page)).toHaveAttribute('data-atlas-flight','descent');
  await page.emulateMedia({reducedMotion:'reduce'});await settled(page,'jupiter');await expect(page.getByRole('button',{name:'Reduced motion',exact:true})).toBeVisible();
});

test('reduced motion bypasses the descent and changing to the chart releases its overlays',async({page})=>{
  await mount(page);await enter(page);await settled(page,'jupiter');await expect(page.getByRole('region',{name:'Scale approach',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Return to The Solar System',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','jupiter-orbit');
  await animate(page);await enter(page);await advance(page,1200);await expect(canvas(page)).toHaveAttribute('data-atlas-flight','descent');
  await page.getByRole('button',{name:'Scale chart',exact:true}).click();
  await expect(page.getByRole('region',{name:'Scale approach',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Immersive 3D',exact:true}).click();await settled(page,'jupiter');
});

test('continuing from a galaxy approach into the Sun preserves both return viewpoints',async({page})=>{
  await mount(page);
  await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption('milkyway');
  await page.locator('.sx-details').getByRole('button',{name:'Our Sun’s neighbourhood',exact:true}).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-detail','solar-neighbourhood');
  const galaxy=await canvas(page).evaluate((c:HTMLElement)=>({detail:c.dataset.atlasDetail,yaw:c.dataset.atlasYaw,zoom:c.dataset.atlasZoom,aim:c.dataset.atlasAim}));
  await animate(page);await enter(page);await advance(page,160);
  await expect(canvas(page)).toHaveAttribute('data-atlas-objects','milkyway');
  await page.locator('.sx-stage').screenshot({path:path.join(out,'galaxy-departure.png')});
  await advance(page,1300);await expect(canvas(page)).toHaveAttribute('data-atlas-flight','descent');
  await page.getByRole('region',{name:'Explore the planetary system',exact:true}).getByRole('button',{name:'Visit the Sun',exact:true}).click();
  await advance(page,1500);await expect(canvas(page)).toHaveAttribute('data-atlas-flight','departure');
  await expect(canvas(page)).toHaveAttribute('data-atlas-objects','solar-system');
  await advance(page,6000);await settled(page,'sun');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'Return to The Solar System',exact:true}).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-detail','');await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','1.00');await expect(canvas(page)).toHaveAttribute('data-atlas-yaw','0.0000');
  await page.getByRole('button',{name:'Return to The Milky Way galaxy',exact:true}).click();
  await expect.poll(()=>canvas(page).evaluate((c:HTMLElement)=>({detail:c.dataset.atlasDetail,yaw:c.dataset.atlasYaw,zoom:c.dataset.atlasZoom,aim:c.dataset.atlasAim}))).toEqual(galaxy);
});
