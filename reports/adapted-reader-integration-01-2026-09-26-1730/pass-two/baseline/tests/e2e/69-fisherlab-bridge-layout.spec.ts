import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
test.describe.configure({timeout:180_000});
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_fisherlab.js',toolId:'fisherLab',width:1180,height:980,appStyles:true,extraScripts:['desktop/web-app/node_modules/axe-core/axe.min.js']});
test.beforeAll(async()=>harness.start());
test.afterAll(async()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));
async function launch(page:any){
  await harness.mount(page,{},undefined,{expectCanvas:false});
  await page.getByRole('tab',{name:/3D Sim/}).click();
  await page.getByRole('button',{name:/Start new Guided voyage/}).click();
  await page.waitForSelector('canvas.fl-sim-canvas');
  await page.getByRole('button',{name:/Pause \(P\)/}).click();
}
async function checkAreas(page:any,stacked:boolean){
  const boxes=await page.evaluate(()=>{
    const keys=['canvas','instruments','mission','touch','log'];
    return Object.fromEntries(keys.map(key=>{
      const el=document.querySelector('.fl-sim-'+key)!;
      const r=el.getBoundingClientRect();return [key,{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}];
    }));
  });
  for(const a of Object.keys(boxes))for(const b of Object.keys(boxes)){
    if(a>=b)continue;
    const x=Math.min(boxes[a].right,boxes[b].right)-Math.max(boxes[a].x,boxes[b].x);
    const y=Math.min(boxes[a].bottom,boxes[b].bottom)-Math.max(boxes[a].y,boxes[b].y);
    expect(x<=1||y<=1,a+' overlaps '+b).toBe(true);
  }
  expect(boxes.canvas.w).toBeGreaterThan(300);expect(boxes.canvas.h).toBeGreaterThanOrEqual(240);
  expect(boxes.touch.y).toBeGreaterThanOrEqual(boxes.canvas.bottom);
  if(stacked)expect(boxes.instruments.y).toBeGreaterThanOrEqual(boxes.touch.bottom);
  else {expect(boxes.instruments.right).toBeLessThanOrEqual(boxes.canvas.x);expect(boxes.mission.x).toBeGreaterThanOrEqual(boxes.canvas.right);}
  const targets=await page.locator('.fl-sim-touch button').evaluateAll(els=>els.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));
  for(const t of targets){expect(t.w).toBeGreaterThanOrEqual(44);expect(t.h).toBeGreaterThanOrEqual(44);}
}
test('keeps the scene and helm controls separate in wide, fullscreen, and theater layouts',async({page})=>{
  await launch(page);
  await checkAreas(page,false);
  await page.getByRole('button',{name:/Drone/}).click();
  await page.locator('.fl-sim-stage').screenshot({path:'scratch/fisherlab-bridge-desktop.png'});
  await page.getByRole('button',{name:/Full screen/,exact:false}).click();
  await expect(page.getByRole('button',{name:/Exit full screen/})).toBeVisible();
  await checkAreas(page,false);
  await page.getByRole('button',{name:/Exit full screen/}).click();
  await page.evaluate(()=>{HTMLElement.prototype.requestFullscreen=function(){return Promise.reject(new Error('Harness iframe restriction'));};});
  await page.getByRole('button',{name:/Full screen/,exact:false}).click();
  await expect(page.locator('.fl-sim-stage')).toHaveClass(/fl-theater/);
  await checkAreas(page,false);
  const box=await page.locator('.fl-sim-stage').boundingBox();
  expect(box!.x).toBeCloseTo(0);expect(box!.y).toBeCloseTo(0);
  await page.locator('.fl-sim-stage').screenshot({path:'scratch/fisherlab-bridge-theater.png'});
  await page.getByRole('button',{name:/Exit full screen/}).click();
  await page.getByRole('button',{name:/Resume \(P\)/}).click();
  const throttle=page.getByRole('button',{name:'Throttle forward',exact:true});
  await throttle.focus();await page.keyboard.down('Enter');
  await expect.poll(async()=>page.locator('.fl-helm-readings').innerText()).not.toContain('Speed: 0.0 kt');
  await page.keyboard.up('Enter');
  await page.getByRole('button',{name:/Pause \(P\)/}).click();
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
test('stacks narrow embedded and phone helms while keeping the vector explanation readable',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await launch(page);
  await page.evaluate(()=>{document.getElementById('wrap')!.style.width='820px';});
  await checkAreas(page,true);
  await page.setViewportSize({width:390,height:900});
  await page.evaluate(()=>{document.getElementById('wrap')!.style.width='390px';});
  await page.getByRole('button',{name:'Large text',exact:true}).click();
  expect(await page.locator('.fl-helm-readings').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
  await checkAreas(page,true);
  await page.locator('.fl-sim-stage').screenshot({path:'scratch/fisherlab-bridge-mobile.png'});
  await page.getByLabel('Sea conditions',{exact:true}).selectOption('chop');
  const card=page.locator('[data-fisherlab-sea-card]');
  await card.locator('summary').click();
  await card.getByRole('button',{name:'A little west of north',exact:true}).click();
  await expect(card.locator('[data-sea-vector-figure]')).toContainText('Wind adds 0.48 kt eastward');
  await expect(card.locator('[data-sea-prediction-result]')).toContainText('track 0°');
  await card.locator('[data-sea-experiment]').screenshot({path:'scratch/fisherlab-vector-mobile.png'});
  const overflow=await page.locator('.fl-sim-stage, [data-sea-experiment]').evaluateAll(els=>els.map(el=>el.scrollWidth-el.clientWidth));
  for(const px of overflow)expect(px).toBeLessThanOrEqual(1);
  const violations=await page.evaluate(async()=>(await(window as any).axe.run('[data-sea-experiment]',{runOnly:{type:'rule',values:['color-contrast','button-name','aria-valid-attr-value']}})).violations.map((v:any)=>v.id));
  expect(violations).toEqual([]);
  await page.evaluate(()=>{HTMLElement.prototype.requestFullscreen=function(){return Promise.reject(new Error('Harness iframe restriction'));};});
  await page.getByRole('button',{name:/Full screen/,exact:false}).click();
  await expect(page.locator('.fl-sim-stage')).toHaveClass(/fl-theater/);
  await checkAreas(page,true);
  await page.getByRole('button',{name:/Exit full screen/}).click();
  await page.getByRole('button',{name:/Leave sim/}).click();
  await expect(page.getByRole('button',{name:/Resume saved voyage/})).toBeVisible();
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
