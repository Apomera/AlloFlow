import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

// This is a physics ordering diagnostic. Full-size model rendering is covered
// separately; keep every real update/draw while reducing its pixel workload.
const toolFile = (process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js').replace(/\\/g, '/');
const source = readFileSync(toolFile, 'utf8').replace(/\r\n/g, '\n'), terrainStart = source.indexOf('function terrainHeight('), terrainEnd = source.indexOf('function distance3(', terrainStart);
if (terrainStart < 0 || terrainEnd <= terrainStart) throw new Error('The selected source must expose its actual terrainHeight function');
const terrainSource = source.slice(terrainStart, terrainEnd);
const harness = new GlHarness({ toolFile, toolId: 'cephalopodLab', width: 480, height: 600, layout: 'document' });
const failures = new WeakMap<Page, string[]>();

// Install before the tool constructs its clock/renderer. Idle renders stay
// genuinely paused: dt=0 alone still enters the existing live AI/RNG branch.
const countedClock = String.raw`
;(function(){
  ${terrainSource}
  var w=window,T=w.THREE,active=false,remaining=0,token=0,processed=-1,held=null,resolveBatch=null;
  w.__sgReady=false;w.__sgTicks=0;w.__sgTerrain=terrainHeight;
  function key(type,code){document.querySelector('canvas[role=application]').dispatchEvent(new KeyboardEvent(type,{code:code,key:code==='Escape'?'Escape':code.slice(3).toLowerCase(),bubbles:true,cancelable:true,repeat:false}));}
  T.Clock.prototype.getDelta=function(){token++;return active?.05:0;};
  var Original=T.WebGLRenderer;
  T.WebGLRenderer=new Proxy(Original,{construct:function(Target,args){
    var renderer=Reflect.construct(Target,args),render=renderer.render;
    renderer.render=function(scene,camera){
      if(!w.__sgScene&&scene.getObjectByName&&scene.getObjectByName('cl-player')){
        w.__sgScene=scene;w.__sgRenderer=renderer;
        var after=scene.onAfterRender;
        scene.onAfterRender=function(){
          if(after)after.apply(this,arguments);
          if(processed===token)return;processed=token;
          if(!w.__sgReady){key('keydown','Escape');w.__sgReady=true;return;}
          if(active){w.__sgTicks++;if(--remaining===0){active=false;if(held)key('keyup',held);held=null;key('keydown','Escape');var done=resolveBatch;resolveBatch=null;done();}}
        };
      }
      return render.apply(this,arguments);
    };
    return renderer;
  }});
  w.__sgRun=function(frames,code){
    if(active||!w.__sgReady||frames<1)throw new Error('Counted batches require a ready, paused scene');
    return new Promise(function(resolve){remaining=frames;held=code||null;resolveBatch=resolve;active=true;key('keydown','Escape');if(held)key('keydown',held);});
  };
})();`;

async function step(page: Page, frames: number, code?: string) {
  await page.evaluate(({ frames, code }) => (window as any).__sgRun(frames, code), { frames, code });
  await expect(page.locator('[data-hud=burn]')).toHaveText('Paused');
}
async function snapshot(page: Page) {
  return page.evaluate(() => {
    const w = window as any, p = w.__sgPlayer, s = w.__sgCoconut, predator = w.__sgPredator;
    w.__sgScene.updateMatrixWorld(true);
    const ray = new w.THREE.Raycaster(new w.THREE.Vector3(p.position.x, 30, p.position.z), new w.THREE.Vector3(0, -1, 0));
    const floor = ray.intersectObject(w.__sgScene.getObjectByName('cl-seafloor'))[0];
    if (!floor) throw new Error('The actual floor must be beneath this fixture');
    return { health: Number(document.querySelector('[data-hud=health]')!.textContent), status: document.querySelector('[data-hud=status]')!.textContent,
      player: p.position.toArray(), authoritativeTerrainY: w.__sgTerrain(p.position.x, p.position.z), renderedFloorY: floor.point.y, shelter: { uuid: s.uuid, y: s.position.y, state: s.userData.state, carried: s.parent === p, inScene: s.parent === w.__sgScene },
      predator: predator ? { uuid: predator.uuid, kind: predator.userData.kind, state: predator.userData.state, damage: predator.userData.damage, canBite: predator.userData.canBite, position: predator.position.toArray() } : null,
      dropY: w.__sgDropY ?? null, ticks: w.__sgTicks, maturityResolution: w.__sgMaturityResolution ?? null };
  });
}
async function biteFrame(page: Page, drop: boolean) {
  await page.evaluate(async drop => {
    const w = window as any, actor = w.__sgPredator, u = actor.userData;
    // Relocate one genuinely spawned barracuda without changing its biology.
    // Zero travel speed keeps the paired frames at the same valid bite contact.
    actor.position.copy(w.__sgPlayer.position).add(new w.THREE.Vector3(0, 0, .7));
    u.state = 'charging'; u.stateTimer = 0; u.speed = 0; u.cooldownUntil = 0; u.awareness = 1; u.lostFor = 0; u.lastSeen = w.__sgPlayer.position.clone();
    await w.__sgRun(1, drop ? 'KeyG' : undefined);
  }, drop);
  await expect(page.locator('[data-hud=burn]')).toHaveText('Paused');
}

test.describe.configure({ timeout: 360000, retries: 0 }); test.use({ video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.beforeEach(async ({ page }) => {
  const errors: string[] = []; failures.set(page, errors); page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/vendor/three-r128/three.min.js', async route => { const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()) + countedClock, contentType: 'text/javascript' }); });
});
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(failures.get(page)).toEqual([]); });

test('a same-frame coconut drop grounds before an actual early predator tests shelter', async ({ page }, testInfo) => {
  await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'commonOcto', huntMode: 'free', huntSeed: 2741, huntQuality: 'low', _threeLoaded: true } });
  await page.waitForFunction(() => (window as any).__sgReady);
  await expect(page.locator('[data-hud=burn]')).toHaveText('Paused');
  await page.evaluate(() => {
    const w = window as any; w.__sgPlayer = w.__sgScene.getObjectByName('cl-player'); w.__sgCoconut = w.__sgScene.children.find((o: any) => o.userData.shelterType === 'coconut');
    if (!w.__sgCoconut) throw new Error('A real free coconut is required');
    w.__sgScene.children.forEach((o: any) => { if ('cooldownUntil' in o.userData) o.userData.cooldownUntil = 1e9; if (o.userData.substrate === 'rock') { o.position.x = -45; o.position.z = -45; o.userData.substrateRadius = 0; } if (o.userData.shelterType || o.userData.landmarkType) { o.position.x = -40; o.position.z = -40; } });
    w.__sgPlayer.position.x = 0; w.__sgPlayer.position.z = 0; w.__sgCoconut.position.set(0, .12, .4);
    const position = w.__sgCoconut.position, original = position.set;
    position.set = function (x: number, y: number, z: number) {
      // Observe the placement write before later updateGround can conceal it.
      if (w.__sgCoconut.userData.state === 'carried' && w.__sgCoconut.parent === w.__sgScene) w.__sgDropY = y;
      return original.call(this, x, y, z);
    };
  });
  await step(page, 1, 'KeyG'); expect((await snapshot(page)).shelter.carried).toBe(true);
  // This real actor does not exist at dive start. Advance its unchanged 60s
  // spawn schedule; do not call a private spawn helper or fabricate a predator.
  await page.evaluate(() => { const w = window as any, renderer = w.__sgRenderer; w.__sgMaturityResolution = { initial: renderer.getSize(new w.THREE.Vector2()).toArray(), ticksBefore: w.__sgTicks }; renderer.setSize(64, 64, false); w.__sgMaturityResolution.during = renderer.getSize(new w.THREE.Vector2()).toArray(); });
  try { await step(page, 1202); }
  finally { await page.evaluate(() => { const w = window as any, r = w.__sgMaturityResolution; w.__sgRenderer.setSize(r.initial[0], r.initial[1], false); r.restored = w.__sgRenderer.getSize(new w.THREE.Vector2()).toArray(); r.ticksAfter = w.__sgTicks; }); }
  await page.evaluate(() => {
    const w = window as any; w.__sgPredator = w.__sgScene.children.find((o: any) => o.userData.kind === 'barracuda');
    if (!w.__sgPredator) throw new Error('The reef must naturally spawn its first barracuda');
    w.__sgPredator.userData.cooldownUntil = 1e9; w.__sgPlayer.position.x = 28; w.__sgPlayer.position.z = 0;
  });
  await step(page, 40, 'KeyZ'); const initial = await snapshot(page);
  // The coarse display mesh approximates the curved terrain. Physics uses the
  // exact selected source function, so do not use triangle interpolation as its oracle.
  expect(initial.renderedFloorY).toBeLessThan(-3); expect(initial.player[1] - initial.authoritativeTerrainY).toBeGreaterThan(.50); expect(initial.player[1] - initial.authoritativeTerrainY).toBeLessThan(.60);
  expect(initial.maturityResolution.during).toEqual([64, 64]); expect(initial.maturityResolution.restored).toEqual(initial.maturityResolution.initial); expect(initial.maturityResolution.ticksAfter - initial.maturityResolution.ticksBefore).toBe(1202);
  expect(initial.shelter.carried).toBe(true); expect(initial.status).not.toContain('IN DEN'); expect(initial.predator?.damage).toBe(35);
  await biteFrame(page, false); const control = await snapshot(page); expect(control.health).toBe(initial.health - 35); expect(control.predator?.canBite).toBe(true); expect(control.shelter.carried).toBe(true);
  await page.evaluate(() => { const w = window as any, actor = w.__sgPredator; actor.userData.state = 'patrol'; actor.userData.cooldownUntil = 1e9; actor.position.copy(w.__sgPlayer.position).add(new w.THREE.Vector3(8, 0, 8)); });
  await step(page, 20); const beforeDrop = await snapshot(page); await biteFrame(page, true); const defended = await snapshot(page);
  await testInfo.attach('actual-drop-before-early-predator', { body: JSON.stringify({ initial, control, beforeDrop, defended }, null, 2), contentType: 'application/json' });
  expect(defended.shelter.uuid).toBe(initial.shelter.uuid); expect(defended.shelter.state).toBe('dropped'); expect(defended.shelter.inScene).toBe(true); expect(defended.shelter.carried).toBe(false);
  expect(Math.abs(defended.shelter.y - (defended.authoritativeTerrainY + .12))).toBeLessThan(1e-9);
  expect.soft(Math.abs(defended.dropY! - defended.shelter.y), 'The original drop write must already equal the final grounded height').toBeLessThan(1e-9);
  expect.soft(defended.health, 'Accepted grounded cover must protect on its first frame').toBeGreaterThanOrEqual(beforeDrop.health);
  expect.soft(defended.predator?.canBite).toBe(false); expect.soft(defended.status).toContain('IN DEN');
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
});
