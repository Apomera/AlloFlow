import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_roadready.js',toolId:'roadReady',width:1100,height:780,appStyles:true,preScripts:['stem_lab/stem_lab_module.js'],probes:"window.__testHooks={};document.documentElement.classList.add('theme-dark');"});
test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});
test('parking coach updates real clearances and readiness on desktop and phone',async({page})=>{
  await page.setViewportSize({width:1140,height:900});
  await harness.mount(page,{roadReady:{view:'parking',reducedMotion:true,badges:{park_master:true}}},undefined,{expectCanvas:false});
  const metrics=page.getByRole('region',{name:'Live parking measurements'});
  await expect(metrics).toContainText('Align first');
  await expect(page.getByRole('heading',{name:'Parallel parking',exact:true})).toBeVisible();
  await expect(metrics).toContainText('Front wheels · Straight');
  await page.keyboard.down('s'); await page.keyboard.down('d');
  await expect(metrics).toContainText('Reversing');
  await expect(metrics).toContainText('Front wheels · Right');
  await page.keyboard.up('s'); await page.keyboard.up('d');
  await page.keyboard.down(' ');
  await expect(metrics.getByLabel('Car response')).toContainText('Braking');
  await page.keyboard.up(' ');
  await page.getByRole('button',{name:'Reset practice',exact:true}).click();
  await expect(metrics).toContainText('Front wheels · Straight');
  await page.screenshot({path:'reports/roadready-review/parking-coach-desktop.png',scale:'css',fullPage:true});
  // The shorter practice view follows a car that backs beyond its initial frame.
  await page.evaluate(()=>Object.assign((window as any).__testHooks.parking.carRef.current,{x:254.3,y:420,heading:-Math.PI/2,speed:0,steering:0}));
  await expect.poll(()=>page.evaluate(()=>{
    const canvas=document.querySelector('.rr-parking-scene canvas') as HTMLCanvasElement;
    return Array.from(canvas.getContext('2d')!.getImageData(254,275,1,1).data).slice(0,3);
  })).toEqual([34,211,238]);
  await page.evaluate(()=>Object.assign((window as any).__testHooks.parking.carRef.current,{x:285,y:167.5,heading:-Math.PI/2,speed:0,steering:0}));
  await expect(metrics).toContainText('10.8 in');
  await expect(metrics).toContainText('3.8 ft');
  await expect(metrics.getByRole('status')).toContainText('Ready to secure');
  await page.getByRole('button',{name:'Park + parking brake',exact:true}).click();
  await expect(metrics.getByRole('status')).toContainText('Parking secured');
  await page.getByRole('button',{name:'Reset practice',exact:true}).click();
  await expect(metrics).toContainText('Align first');
  await expect(metrics.getByRole('status')).not.toContainText('Parking secured');
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({path:'reports/roadready-review/parking-coach-'+width+'.png',scale:'css',fullPage:true});
  }
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
