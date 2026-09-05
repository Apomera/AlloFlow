import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
test.describe.configure({ timeout: 180_000 });
const harness = new GlHarness({
  toolFile:'stem_lab/stem_tool_fisherlab.js',toolId:'fisherLab',width:1180,height:980,appStyles:true,
  extraScripts:['desktop/web-app/node_modules/axe-core/axe.min.js'],
  probes: `
    (function(){
      var Original = THREE.WebGLRenderer;
      THREE.WebGLRenderer = function(opts){
        var renderer = new Original(opts), render = renderer.render;
        renderer.render = function(scene,camera){
          if(scene && scene.getObjectByName && scene.getObjectByName('fisherlab-sea-surface')) window.__seaScene = scene;
          return render.apply(this,arguments);
        };
        return renderer;
      };
      THREE.WebGLRenderer.prototype = Original.prototype;
      window.__seaSnapshot = function(){
        var scene=window.__seaScene;
        if(!scene)return null;
        var boat=scene.getObjectByName('fisherlab-vessel'),water=scene.getObjectByName('fisherlab-sea-surface');
        var p=water.geometry.attributes.position,n=water.geometry.attributes.normal,c=water.geometry.attributes.color;
        var pennant=scene.getObjectByName('fisherlab-wind-pennant'),wind=scene.getObjectByName('fisherlab-dock-wind');
        var cloth=pennant.geometry.attributes.position;
        var foam=[];scene.traverse(function(o){if(o.name==='fisherlab-wake-foam'&&o.visible)foam.push({x:o.position.x,y:o.position.y,z:o.position.z,life:o.userData.life});});
        var i=Math.floor(p.count/2)+2;
        return {x:boat.position.x,y:boat.position.y,z:boat.position.z,rotationX:boat.rotation.x,rotationZ:boat.rotation.z,
          waveTime:water.userData.seaTime,waveScale:water.userData.waveScale,
          pennant:{wind:wind.userData.windKnots,time:wind.userData.sampleTime,tip:[cloth.getX(10),cloth.getY(10),cloth.getZ(10)]},foam:foam,
          reflection:water.material.userData.skyReflection===true,ripple:!!water.material.normalMap,rippleOffset:water.material.normalMap ? water.material.normalMap.offset.x : null,
          vertex:{x:p.getX(i),z:-p.getY(i),height:p.getZ(i),nx:n.getX(i),nz:-n.getY(i),ny:n.getZ(i)},
          color:[c.getX(i),c.getY(i),c.getZ(i)]};
      };
    })();
  `
});
test.beforeAll(async()=>{await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.destroy(page);});
async function launch(page:any){
  await harness.mount(page,{},undefined,{expectCanvas:false});
  await page.getByRole('tab',{name:/3D Sim/}).click();
  await page.getByRole('button',{name:/Start new Guided voyage/}).click();
  await page.waitForFunction(()=>!!(window as any).__seaSnapshot?.(),null,{timeout:30000});
  await page.getByRole('button',{name:/Pause \(P\)/}).click();
  await expect(page.getByRole('button',{name:/Resume \(P\)/})).toBeVisible();
}
test('wind changes the actual track and shared sea surface while pause and recovery preserve conditions',async({page})=>{
  await launch(page);
  const card=page.locator('[data-fisherlab-sea-card]'), sea=page.getByLabel('Sea conditions',{exact:true});
  const start=await page.evaluate(()=>(window as any).__seaSnapshot());
  expect(start.pennant.wind).toBe(0);expect(start.pennant.tip[0]).toBeCloseTo(0.18);
  await card.locator('summary').click();
  const prediction=card.locator('[data-sea-prediction-result]');
  await card.getByRole('button',{name:'Due north',exact:true}).click();
  await expect(prediction).toContainText('Your prediction balances');
  await expect(card).toHaveAttribute('data-fisherlab-sea-card','calm');
  await expect(card.locator('[data-sea-course]')).toContainText('stationary');
  await sea.selectOption('breeze');
  await expect(card).toHaveAttribute('data-fisherlab-sea-card','breeze');
  await expect(card).toContainText('Wind from W · 8 kt');
  await expect(prediction).toHaveText('Choose a direction to reveal the model preview.');
  await card.getByRole('button',{name:'Due north',exact:true}).click();
  await expect(prediction).toContainText('Follow the drift');
  await card.getByRole('button',{name:'A little west of north',exact:true}).click();
  await expect(prediction).toContainText('Your prediction balances');
  await expect(prediction).toContainText('track 0°');
  const windy=await page.evaluate(()=>(window as any).__seaSnapshot());
  expect(windy.pennant.wind).toBe(8);expect(windy.pennant.tip[0]).toBeGreaterThan(start.pennant.tip[0]);
  await card.locator('summary').click();
  await expect(card.locator('[data-sea-course]')).toHaveText('90°');
  await expect(card.locator('[data-sea-ground-speed]')).toHaveText('0.2 kt');
  await page.getByRole('button',{name:/Foggy/}).click();
  await expect(sea).toHaveValue('breeze');
  const paused=await page.evaluate(()=>(window as any).__seaSnapshot());
  expect(paused.x).toBe(start.x);expect(paused.z).toBe(start.z);
  await page.getByRole('button',{name:/Clear/}).click();
  await page.getByRole('button',{name:/Resume \(P\)/}).click();
  await page.waitForFunction(x=>(window as any).__seaSnapshot().x>x+0.05,start.x);
  await page.getByRole('button',{name:/Pause \(P\)/}).click();
  const moved=await page.evaluate(()=>(window as any).__seaSnapshot());
  expect(moved.pennant.time).toBeGreaterThan(paused.pennant.time);
  expect(moved.foam).toEqual([]); // Wind drift alone is not a powered wake.
  expect(moved.x).toBeGreaterThan(start.x);
  expect(moved.z).toBeCloseTo(start.z);
  await sea.selectOption('chop');
  await page.getByRole('button',{name:/Sunset/}).click();
  const match=await page.evaluate(()=>{
    const snapshot=(window as any).__seaSnapshot(), core=(window as any).__FisherLabCore;
    return {snapshot,point:core.sampleCoreSeaSurface(snapshot.vertex.x,snapshot.vertex.z,snapshot.waveTime,'chop')};
  });
  expect(match.snapshot.vertex.height).toBeCloseTo(match.point.height,5);
  const norm=Math.sqrt(1+match.point.slopeX**2+match.point.slopeZ**2);
  expect(match.snapshot.vertex.nx).toBeCloseTo(-match.point.slopeX/norm,5);
  expect(match.snapshot.vertex.nz).toBeCloseTo(-match.point.slopeZ/norm,5);
  expect(match.snapshot.color[0]).toBeLessThan(match.snapshot.color[2]);
  expect(match.snapshot.ripple).toBe(true);expect(match.snapshot.reflection).toBe(true);
  await expect(page.locator('[data-sea-helm]')).toContainText('Ground:');
  await card.screenshot({path:'scratch/fisherlab-sea-instruments-desktop.png'});
  await page.locator('.fl-sim-stage').screenshot({path:'scratch/fisherlab-sea-chop-sunset.png'});
  await page.getByRole('button',{name:/Drone/}).click();
  await page.getByRole('button',{name:/Day/,exact:false}).filter({hasText:'Day'}).click();
  await page.locator('.fl-sim-stage').screenshot({path:'scratch/fisherlab-sea-drone-day.png'});
  await page.getByRole('button',{name:/Leave sim/}).click();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('fisherLab.state.v1')!).coreVoyageCheckpoint.environment.seaState)).toBe('chop');
  await page.getByRole('button',{name:/Resume saved voyage/}).click();
  await expect(page.getByRole('button',{name:/Resume \(P\)/})).toBeVisible();
  await expect(sea).toHaveValue('chop');
  await expect(card).toContainText('Paused');
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
test('motion reduction keeps water still while wind handling and phone instruments remain accessible',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:390,height:900});
  await launch(page);
  await page.evaluate(()=>{document.getElementById('wrap')!.style.width='390px';});
  await page.getByRole('button',{name:'Large text',exact:true}).click();
  const sea=page.getByLabel('Sea conditions',{exact:true}),card=page.locator('[data-fisherlab-sea-card]');
  await sea.focus();await page.keyboard.press('End');await page.keyboard.press('Enter');
  await expect(sea).toHaveValue('chop');
  const before=await page.evaluate(()=>(window as any).__seaSnapshot());
  await page.getByRole('button',{name:/Resume \(P\)/}).click();
  await page.waitForFunction(x=>(window as any).__seaSnapshot().x>x+0.05,before.x);
  await page.getByRole('button',{name:/Pause \(P\)/}).click();
  const after=await page.evaluate(()=>(window as any).__seaSnapshot());
  expect(after.ripple).toBe(true);expect(after.reflection).toBe(true);expect(after.rippleOffset).toBe(before.rippleOffset);
  expect(after.pennant.wind).toBe(16);expect(after.pennant.time).toBe(0);expect(after.pennant.tip).toEqual(before.pennant.tip);
  expect(after.foam).toEqual([]);
  expect(after.waveTime).toBe(0);expect(after.vertex.height).toBe(before.vertex.height);
  expect(after.y).toBe(0);expect(after.rotationX).toBe(0);expect(after.rotationZ).toBe(0);
  await card.locator('summary').focus();await page.keyboard.press('Enter');
  await expect(card.getByText(/illustrative 3%/)).toBeVisible();
  const answer=card.getByRole('button',{name:'A little west of north',exact:true});
  await answer.focus();await page.keyboard.press('Enter');
  await expect(answer).toHaveAttribute('aria-pressed','true');
  await expect(card.locator('[data-sea-prediction-result]')).toContainText('track 0°');
  const metrics=await page.locator('[data-fisherlab-sea-card], .fl-sim-bar').evaluateAll(els=>els.map(el=>({client:el.clientWidth,scroll:el.scrollWidth,right:el.getBoundingClientRect().right})));
  for(const m of metrics){expect(m.scroll).toBeLessThanOrEqual(m.client+1);expect(m.right).toBeLessThanOrEqual(390);}
  const violations=await page.evaluate(async()=>(await(window as any).axe.run('[data-fisherlab-sea-card]',{runOnly:{type:'rule',values:['color-contrast','button-name','label','aria-valid-attr-value','aria-allowed-attr']}})).violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)})));
  expect(violations).toEqual([]);
  await card.screenshot({path:'scratch/fisherlab-sea-instruments-mobile.png'});
  await page.locator('.fl-sim-stage').screenshot({path:'scratch/fisherlab-sea-mobile.png'});
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});

 test('powered wake stays on the waves and freezes when paused',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8,configurable:true}));
  await launch(page);
  await page.getByLabel('Sea conditions',{exact:true}).selectOption('chop');
  await page.getByRole('button',{name:/Drone/}).click();
  await page.getByRole('button',{name:/Resume \(P\)/}).click();
  await page.locator('canvas.fl-sim-canvas').focus();
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(()=>(window as any).__seaSnapshot().foam.length>=3,null,{timeout:30000});
  await page.keyboard.up('ArrowUp');
  await page.keyboard.press('p');
  await expect(page.getByRole('button',{name:/Resume \(P\)/})).toBeVisible();
  const paused=await page.evaluate(()=>{
    const snap=(window as any).__seaSnapshot();
    return {snap,errors:snap.foam.map((f:any)=>f.y-(window as any).__FisherLabCore.sampleCoreSeaSurface(f.x,f.z,snap.waveTime,'chop').height-0.09)};
  });
  expect(paused.snap.foam.length).toBeGreaterThan(0);
  for(const error of paused.errors)expect(Math.abs(error)).toBeLessThan(0.00001);
  await page.waitForTimeout(200);
  expect((await page.evaluate(()=>(window as any).__seaSnapshot())).foam).toEqual(paused.snap.foam);
  await page.locator('.fl-sim-stage').screenshot({path:'scratch/fisherlab-surface-cues-drone.png'});
  await page.getByLabel('Sea conditions',{exact:true}).selectOption('calm');
  const changed=await page.evaluate(()=>{
    const snap=(window as any).__seaSnapshot();
    return {snap,errors:snap.foam.map((f:any)=>f.y-(window as any).__FisherLabCore.sampleCoreSeaSurface(f.x,f.z,snap.waveTime,'calm').height-0.09)};
  });
  expect(changed.snap.foam.length).toBe(paused.snap.foam.length);
  for(const error of changed.errors)expect(Math.abs(error)).toBeLessThan(0.00001);
  expect(changed.snap.x).toBe(paused.snap.x);expect(changed.snap.z).toBe(paused.snap.z);
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
