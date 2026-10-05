import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
const screenshotRoot = process.env.RAPTOR_STRIKE_SCREENSHOT_DIR || resolve(process.cwd(), 'scratch/raptor-flight-review');
const probes = `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.strikeScene=scene;window.strikeCamera=camera;return render(scene,camera);};return renderer;};})();`;
const canvas = (page: Page) => page.locator('[data-raptor-canvas]');
const renderingErrors = new WeakMap<Page, string[]>();

test.describe('Raptor strike presentation and caught animal lifecycle', () => {
  test.describe.configure({ mode: 'default', timeout: 300000 });
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 880, height: 620, appStyles: true, probes });
  test.beforeAll(async () => { mkdirSync(screenshotRoot, { recursive: true }); await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); expect(renderingErrors.get(page) || []).toEqual([]); });
  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    renderingErrors.set(page, errors);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && /shader|THREE\.WebGL|WebGLProgram|INVALID_OPERATION/i.test(message.text())) errors.push(message.text()); });
    await page.setViewportSize({ width: 960, height: 1100 });
    await page.addInitScript(() => {
      let time = 1000, id = 1, seed = 731;
      const frames = new Map<number, FrameRequestCallback>();
      Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      performance.now = () => time;
      window.requestAnimationFrame = cb => { const next = id++; frames.set(next, cb); return next; };
      window.cancelAnimationFrame = key => { frames.delete(key); };
      const w = window as any;
      w.stepStrike = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
      w.advanceStrike = (ms: number) => { while (ms > 0) { const dt = Math.min(ms, 50); w.stepStrike(dt); ms -= dt; } };
    });
  });

  async function mount(page: Page, species = 'peregrine') {
    await harness.mount(page, { raptorHunt: { activeSection: 'hunt', selectedSpecies: species, activeMission: 'open', flightSession: { speciesId: species, missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: 'low', focusSlowmo: false } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await canvas(page).evaluate((c: any) => {
      const w = window as any, T = w.THREE;
      c._rhCommand('environment', { windSpeed: 0 });
      w.realPrey = () => w.strikeScene.children.filter((o: any) => o.children.some((child: any) => child.name.startsWith('prey-')));
      w.placeStrikePrey = (distance: number, index = 0) => {
        const s = c._rhSnapshot(), p = s.raptorPosition, yaw = s.headingRadians, pitch = s.pitchRadians, prey = w.realPrey();
        const chosen = prey[index];
        prey.forEach((o: any, i: number) => o.position.set(o === chosen ? p.x + Math.sin(yaw) * Math.cos(pitch) * distance : 2000 + i * 20, o === chosen ? p.y + Math.sin(pitch) * distance : 2000, o === chosen ? p.z - Math.cos(yaw) * Math.cos(pitch) * distance : 2000));
        return chosen;
      };
      w.carryPose = () => {
        const root = w.strikeScene.getObjectByName('raptor-carried-prey');
        if (!root) return null;
        root.updateWorldMatrix(true, true);
        const inverse = root.parent.matrixWorld.clone().invert(), bounds = new T.Box3(), point = new T.Vector3();
        root.traverse((o: any) => {
          // Hidden beacon meshes should not affect the carried animal's visual bounds.
          if (!o.geometry || !o.visible) return;
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
          const b = o.geometry.boundingBox, matrix = new T.Matrix4().multiplyMatrices(inverse, o.matrixWorld);
          for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) bounds.expandByPoint(point.set(x, y, z).applyMatrix4(matrix));
        });
        const size = bounds.getSize(new T.Vector3());
        return { uuid: root.uuid, parent: root.parent.name, position: root.position.toArray(), rotation: root.rotation.toArray(), size: size.toArray(), top: bounds.max.y, beaconsHidden: root.children.slice(1).every((o: any) => !o.visible) };
      };
      w.carryMaterials = () => {
        const root = w.strikeScene.getObjectByName('raptor-carried-prey'), materials = new Set<any>();
        if (!root) return [];
        // Inspect the actual animal, excluding the hidden beacon materials.
        root.children[0].traverse((o: any) => {
          if (Array.isArray(o.material)) o.material.forEach((m: any) => materials.add(m));
          else if (o.material) materials.add(o.material);
        });
        return Array.from(materials, (m: any) => ({ uuid: m.uuid, opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite })).sort((a: any, b: any) => a.uuid.localeCompare(b.uuid));
      };
      w.watchCarry = () => {
        const root = w.strikeScene.getObjectByName('raptor-carried-prey'), resources = new Set<any>(), entries: any[] = [];
        root.traverse((o: any) => { if (o.geometry) resources.add(o.geometry); if (Array.isArray(o.material)) o.material.forEach((m: any) => resources.add(m)); else if (o.material) resources.add(o.material); });
        resources.forEach(resource => { const entry = { kind: resource.isMaterial ? 'material' : 'geometry', count: 0 }; resource.addEventListener('dispose', () => entry.count++); entries.push(entry); });
        const watch = { root, entries }; w.carryWatches = w.carryWatches || []; w.carryWatches.push(watch); return entries.length;
      };
      w.ringPositions = () => {
        const mesh = w.strikeScene.getObjectByName('raptor-strike-contact-pool'), matrix = new T.Matrix4();
        return Array.from({ length: mesh.count }, (_, i) => { mesh.getMatrixAt(i, matrix); return new T.Vector3().setFromMatrixPosition(matrix).toArray(); }).filter((p: number[]) => p[1] > -9999);
      };
    });
  }

  async function capture(page: Page, name: string) {
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: resolve(screenshotRoot, name + '.png'), timeout: 90000 });
  }

  test('shows an early strike window and a compact throw indicator without adding label height', async ({ page }) => {
    await mount(page);
    const idle = await canvas(page).evaluate((c: any) => c._rhSnapshot());
    expect(idle.carriedPreyLabel).toBeNull(); expect(idle.carriedPreyMs).toBe(0); expect(idle.talonThrowActive).toBe(false);
    const windowState = await canvas(page).evaluate((c: any) => {
      const w = window as any;
      // Immediate non-diving reach is 5 m. This is just outside it while still
      // reachable during the 450 ms throw at the fresh bird's 10 m/s speed.
      w.placeStrikePrey(5.1);
      // Assist toggles call the production target-feedback refresh. Pausing only
      // repaints the existing HUD, so refresh before rendering the relocated prey.
      c._rhCommand('assist'); c._rhCommand('assist');
      c._rhCommand('pause'); c._rhCommand('pause');
      return c._rhSnapshot();
    });
    expect(windowState.strikeWindowOpen).toBe(true); expect(windowState.targetCanStrike).toBe(false);
    const tracker = page.locator('.rh-target-tracker'), label = page.locator('.rh-target-label');
    await expect(tracker).toHaveAttribute('data-strike-stage', 'window'); await expect(label).toContainText('STRIKE WINDOW');
    await expect(page.locator('.rh-flight-mission-phase')).toContainText(/Strike window open/i);
    await expect(page.locator('.rh-flight-mission-focus')).toContainText(/Strike now|tap/i);
    await expect(page.locator('.rh-flight-key-guide')).toContainText(/Strike now/i);
    const layout = await label.evaluate(el => {
      const h = el.getBoundingClientRect().height, pseudo = getComputedStyle(el, '::after');
      return { height: h, progressHeight: pseudo.height, progressPosition: pseudo.position };
    });
    expect(layout.progressHeight).toBe('2px'); expect(layout.progressPosition).toBe('absolute');
    await capture(page, 'raptor-strike-approach');
    // A strike must publish its new stage without a frame or an assist toggle.
    const thrown = await canvas(page).evaluate((c: any) => { c._rhCommand('strike'); return c._rhSnapshot(); });
    expect(thrown.talonThrowActive).toBe(true); await expect(tracker).toHaveAttribute('data-strike-stage', 'throw'); await expect(label).toContainText('TALONS OUT');
    await expect(page.locator('.rh-flight-mission-phase')).toContainText(/Talons out/i);
    await expect(page.locator('.rh-flight-mission-focus')).toContainText(/Keep prey ahead/i);
    await expect(page.locator('.rh-flight-key-guide')).toContainText(/Hold.*line|Keep.*prey/i);
    expect(await label.evaluate(el => el.getBoundingClientRect().height)).toBe(layout.height);
    expect(await label.evaluate(el => Number((el as HTMLElement).style.getPropertyValue('--strike-progress')))).toBeGreaterThan(0);
    await capture(page, 'raptor-strike-talons-out');
    const recoveredMiss = await canvas(page).evaluate((c: any) => {
      const w = window as any;
      // The relocated ground animal returns to its normal altitude on the next
      // frame, so the pending throw expires. Recovery ends before feedback does.
      w.advanceStrike(450);
      w.advanceStrike(400);
      return c._rhSnapshot();
    });
    expect(recoveredMiss.strikeReady).toBe(true);
    expect(recoveredMiss.strikeFeedbackKind).toBe('miss');
    expect(recoveredMiss.strikeFeedbackAgeMs).toBe(400);
    const retried = await canvas(page).evaluate((c: any) => {
      const w = window as any; w.placeStrikePrey(5.1); c._rhCommand('strike'); return c._rhSnapshot();
    });
    expect(retried.talonThrowActive).toBe(true);
    // The active action takes precedence over the previous attempt's feedback.
    expect(retried.strikeFeedbackKind).toBe('miss');
    await expect(tracker).toHaveAttribute('data-strike-stage', 'throw');
    await expect(label).toContainText('TALONS OUT');
    await expect(page.locator('.rh-flight-mission-phase')).toContainText(/Talons out/i);
    await expect(page.locator('.rh-flight-mission-focus')).toContainText(/Keep prey ahead/i);
    await expect(page.locator('.rh-flight-key-guide')).toContainText(/Hold.*line|Keep.*prey/i);
    await capture(page, 'raptor-strike-rapid-retry');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('keeps the strike cue consistent with tailwind, headwind and crosswind', async ({ page }) => {
    await mount(page);
    const states=await canvas(page).evaluate((c: any) => {
      const w=window as any, heading=c._rhSnapshot().headingRadians;
      const sample=(distance: number,speed: number,direction: number) => {
        w.placeStrikePrey(distance);c._rhCommand('environment',{windSpeed:speed,windDir:direction});
        c._rhCommand('assist');c._rhCommand('assist');
        return {snapshot:c._rhSnapshot(),stage:document.querySelector('.rh-target-tracker')?.getAttribute('data-strike-stage')};
      };
      return {calm:sample(8,0,heading),cross:sample(8,20,heading+Math.PI/2),
        head:sample(8,20,heading+Math.PI),tail:sample(12,20,heading)};
    });
    expect(states.calm.snapshot.strikeWindowOpen).toBe(true);expect(states.calm.stage).toBe('window');
    expect(states.cross.snapshot.strikeWindowOpen).toBe(false);expect(states.cross.stage).toBe('approach');
    expect(states.head.snapshot.strikeWindowOpen).toBe(false);expect(states.head.stage).toBe('approach');
    expect(states.tail.snapshot.strikeWindowOpen).toBe(true);expect(states.tail.stage).toBe('window');
    await expect(page.locator('.rh-flight-mission-phase')).toContainText('Strike window open');
    const thrown=await canvas(page).evaluate((c: any) => {c._rhCommand('strike');return c._rhSnapshot();});
    expect(thrown.talonThrowActive).toBe(true);expect(thrown.strikeFeedbackKind).not.toBe('miss');
    await expect(page.locator('.rh-flight-key-guide')).toContainText('Hold your line');
  });

  test('shows a bounded motion arrow on moving prey with one stable guide buffer', async ({ page }) => {
    await mount(page, 'redTail');
    const live=await canvas(page).evaluate((c: any) => {
      const w=window as any,T=w.THREE;
      const terrain=w.strikeScene.children.find((o: any) => o.geometry?.parameters?.width===800 && o.geometry?.parameters?.height===800);
      terrain.updateWorldMatrix(true,false);
      const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0);
      const ground=(p: any) => {ray.set(new T.Vector3(p.x,1000,p.z),down);return ray.intersectObject(terrain,false)[0].point.y;};
      const index=w.realPrey().findIndex((o: any) => o.children.some((child: any) => child.name.includes('rodent')));
      const mouse=w.realPrey()[index],clearance=mouse.position.y-ground(mouse.position);
      // Descend with normal controls and put the animal on its actual surface.
      // A midair placement would snap back to terrain, outside the nearby cue range.
      c._rhCommand('hold',{key:'shift',pressed:true});
      for(let i=0;i<500&&c._rhSnapshot().terrainClearance>25;i++) w.stepStrike(50);
      c._rhCommand('hold',{key:'shift',pressed:false});
      w.placeStrikePrey(18,index);mouse.position.y=ground(mouse.position)+clearance;
      w.advanceStrike(100);
      c._rhCommand('assist');c._rhCommand('assist');
      const guide=w.strikeScene.getObjectByName('raptor-target-guide');
      w.readMotionArrow=() => ({snapshot:c._rhSnapshot(),uuid:guide.geometry.uuid,segments:guide.isLineSegments,
        count:guide.geometry.drawRange.count,opacity:guide.material.opacity,positions:Array.from(guide.geometry.attributes.position.array)});
      return w.readMotionArrow();
    });
    expect(live.snapshot.targetMotionArrowVisible).toBe(true);expect(live.segments).toBe(true);expect(live.count).toBe(8);
    expect(live.positions).toHaveLength(24);
    const p=live.positions as number[],length=Math.hypot(p[9]-p[6],p[10]-p[7],p[11]-p[8]);
    expect(length).toBeGreaterThan(0);expect(length).toBeLessThanOrEqual(4.00001);
    expect(live.opacity).toBeLessThanOrEqual(.42);
    await capture(page,'raptor-prey-motion-arrow');
    const paused=await canvas(page).evaluate((c: any) => {
      const w=window as any;c._rhCommand('pause');w.stepStrike(60000);return w.readMotionArrow();
    });
    expect(paused.positions).toEqual(live.positions);expect(paused.uuid).toBe(live.uuid);
    await canvas(page).evaluate((c: any) => c._rhCommand('assist'));
    expect(await canvas(page).evaluate((c: any) => c._rhSnapshot().targetMotionArrowVisible)).toBe(false);
    await canvas(page).evaluate((c: any) => c._rhCommand('assist'));
    expect(await canvas(page).evaluate((c: any) => c._rhSnapshot().targetMotionArrowVisible)).toBe(true);
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect.poll(() => canvas(page).evaluate((c: any) => c._rhSnapshot().reducedMotion)).toBe(true);
    expect(await canvas(page).evaluate((c: any) => c._rhSnapshot().targetMotionArrowVisible)).toBe(false);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await expect.poll(() => canvas(page).evaluate((c: any) => c._rhSnapshot().targetMotionArrowVisible)).toBe(true);
    const restored=await canvas(page).evaluate(() => (window as any).readMotionArrow());
    expect(restored.uuid).toBe(live.uuid);expect(restored.snapshot.motionTimeMs).toBe(live.snapshot.motionTimeMs);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('keeps held keyboard dive and steering through a pointer click on Strike', async ({ page }) => {
    await mount(page);
    await canvas(page).focus();
    await page.keyboard.down('Shift');
    await page.keyboard.down('a');
    const before = await canvas(page).evaluate((c: any) => {
      const w = window as any;
      w.stepStrike(50);
      // A miss isolates input continuity from the automatic pull-out after a catch.
      w.placeStrikePrey(30);
      return c._rhSnapshot();
    });
    expect(before.diveActive).toBe(true);
    expect(before.steeringTurn).toBeLessThan(-0.5);
    await page.locator('.rh-flight-btn-strike').click();
    await expect(canvas(page)).toBeFocused();
    const afterClick = await canvas(page).evaluate((c: any) => c._rhSnapshot());
    expect(afterClick.strikeFeedbackKind).toBe('miss');
    expect(afterClick.missionCatches).toBe(0);
    expect(afterClick.steeringTurn).toBeCloseTo(before.steeringTurn, 9);
    const continued = await canvas(page).evaluate((c: any) => { (window as any).stepStrike(25); return c._rhSnapshot(); });
    expect(continued.diveActive).toBe(true);
    expect(continued.steeringTurn).toBeLessThan(before.steeringTurn);
    expect(continued.headingRadians).toBeLessThan(before.headingRadians);
    await page.keyboard.up('a');
    await page.keyboard.up('Shift');
    const released = await canvas(page).evaluate((c: any) => { (window as any).stepStrike(25); return c._rhSnapshot(); });
    expect(released.diveActive).toBe(false);
    expect(Math.abs(released.steeringTurn)).toBeLessThan(Math.abs(continued.steeringTurn));
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('carries one recognizable animal, freezes with pause, replaces safely, and disposes after flight time or restart', async ({ page }) => {
    await mount(page);
    const immediate = await canvas(page).evaluate((c: any) => {
      const w = window as any; w.placeStrikePrey(3); c._rhCommand('strike'); c._rhCommand('pause');
      w.watchCarry(); return { snapshot: c._rhSnapshot(), pose: w.carryPose(), rings: w.ringPositions() };
    });
    expect(immediate.snapshot.missionCatches).toBe(1);
    expect(immediate.snapshot.carriedPreyMs).toBe(1100);
    // A caught animal and its contact effect must be visible without another frame.
    expect(immediate.rings).toHaveLength(1);
    expect(immediate.rings[0][1]).toBeGreaterThan(20);
    await expect(page.locator('.rh-flight-mission-progress')).toContainText('1 catch this flight');
    await expect(page.locator('[data-raptor-metric="mission"] .rh-flight-metric-value')).toHaveText('1 catch this flight');
    const immediateFrozen = await canvas(page).evaluate((c: any) => { (window as any).stepStrike(60000); return c._rhSnapshot(); });
    expect(immediateFrozen.missionCatches).toBe(1);
    expect(immediateFrozen.carriedPreyMs).toBe(1100);
    expect(immediateFrozen.motionTimeMs).toBe(immediate.snapshot.motionTimeMs);
    const catchState = await canvas(page).evaluate((c: any) => {
      const w = window as any; c._rhCommand('pause'); w.stepStrike(50); c._rhCommand('pause');
      return { snapshot: c._rhSnapshot(), pose: w.carryPose(), rings: w.ringPositions() };
    });
    expect(catchState.snapshot.missionCatches).toBe(1); expect(catchState.snapshot.carriedPreyMs).toBe(1050); expect(catchState.snapshot.carriedPreyLabel).toBeTruthy();
    expect(catchState.pose.parent).toBe('raptor-feet'); expect(catchState.pose.beaconsHidden).toBe(true); expect(Math.max(...catchState.pose.size)).toBeLessThanOrEqual(0.72); expect(catchState.pose.top).toBeLessThan(-0.29); expect(catchState.pose.top).toBeGreaterThan(-0.46);
    expect(catchState.rings.length).toBe(1); expect(catchState.rings[0][1]).toBeGreaterThan(20);
    await capture(page, 'raptor-strike-catch');
    const settledCatch = await canvas(page).evaluate((c: any) => {
      const w = window as any; c._rhCommand('pause'); w.advanceStrike(100); c._rhCommand('pause');
      return { snapshot: c._rhSnapshot(), pose: w.carryPose() };
    });
    expect(settledCatch.snapshot.carriedPreyMs).toBe(950);
    await capture(page, 'raptor-strike-catch-150ms');
    const frozen = await canvas(page).evaluate((c: any) => { const w = window as any; w.stepStrike(60000); return { snapshot: c._rhSnapshot(), pose: w.carryPose() }; });
    for (const key of ['carriedPreyLabel', 'carriedPreyMs', 'talonExtension', 'motionTimeMs']) expect(frozen.snapshot[key]).toEqual(settledCatch.snapshot[key]);
    expect(frozen.pose).toEqual(settledCatch.pose);
    await page.setViewportSize({ width: 380, height: 1000 }); await page.addStyleTag({ content: '#wrap{width:360px}' });
    await capture(page, 'raptor-strike-carry-narrow');
    const replaced = await canvas(page).evaluate((c: any) => {
      const w = window as any; c._rhCommand('pause'); w.advanceStrike(400); w.placeStrikePrey(3); c._rhCommand('strike'); w.stepStrike(25);
      const pose = w.carryPose(); w.watchCarry(); return { snapshot: c._rhSnapshot(), pose, oldDisposed: w.carryWatches[0].entries, oldParent: !!w.carryWatches[0].root.parent };
    });
    expect(replaced.snapshot.missionCatches).toBe(2); expect(replaced.pose.uuid).not.toBe(catchState.pose.uuid); expect(replaced.oldParent).toBe(false); expect(replaced.oldDisposed.every((r: any) => r.count === 1)).toBe(true);
    const expired = await canvas(page).evaluate((c: any) => { const w = window as any; w.advanceStrike(c._rhSnapshot().carriedPreyMs); return { snapshot: c._rhSnapshot(), pose: w.carryPose(), disposed: w.carryWatches[1].entries }; });
    expect(expired.snapshot.carriedPreyMs).toBe(0); expect(expired.snapshot.carriedPreyLabel).toBeNull(); expect(expired.pose).toBeNull(); expect(expired.disposed.every((r: any) => r.count === 1)).toBe(true);
    await canvas(page).evaluate((c: any) => { const w = window as any; w.placeStrikePrey(3); c._rhCommand('strike'); w.watchCarry(); c._rhCommand('pause'); w.oldStrikeCanvas = c; });
    await page.getByRole('button', { name: 'Restart this flight', exact: true }).click();
    await expect.poll(() => canvas(page).evaluate((c: any) => c._rhSnapshot?.().missionCatches)).toBe(0);
    expect(await page.evaluate(() => { const w = window as any, old = w.carryWatches[2]; return old.entries.every((r: any) => r.count === 1) && !old.root.parent && w.oldStrikeCanvas._rhSnapshot === null; })).toBe(true);
    expect(await canvas(page).evaluate((c: any) => c._rhSnapshot().carriedPreyMs)).toBe(0);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('keeps a static caught animal and supporting talons when reduced motion changes during pause', async ({ page }) => {
    await mount(page);
    await canvas(page).evaluate((c: any) => { const w = window as any; w.placeStrikePrey(3); c._rhCommand('strike'); w.stepStrike(25); c._rhCommand('pause'); });
    const before = await canvas(page).evaluate((c: any) => c._rhSnapshot());
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => canvas(page).evaluate((c: any) => c._rhSnapshot().reducedMotion)).toBe(true);
    const reduced = await canvas(page).evaluate((c: any) => { const w = window as any; return { snapshot: c._rhSnapshot(), pose: w.carryPose() }; });
    expect(reduced.snapshot.carriedPreyMs).toBe(before.carriedPreyMs); expect(reduced.snapshot.talonExtension).toBe(1); expect(reduced.pose.rotation.slice(0, 3)).toEqual([0, 0, 0]); expect(reduced.pose.top).toBeCloseTo(-0.33, 5);
    await capture(page, 'raptor-strike-carry-reduced-motion');
    const frozen = await canvas(page).evaluate((c: any) => { const w = window as any; w.stepStrike(60000); return { snapshot: c._rhSnapshot(), pose: w.carryPose() }; });
    expect(frozen.pose).toEqual(reduced.pose); expect(frozen.snapshot.motionTimeMs).toBe(before.motionTimeMs);
    const resumed = await canvas(page).evaluate((c: any) => { const w = window as any; c._rhCommand('pause'); w.advanceStrike(c._rhSnapshot().carriedPreyMs); return c._rhSnapshot(); });
    expect(resumed.carriedPreyMs).toBe(0); expect(resumed.carriedPreyLabel).toBeNull(); expect(resumed.missionCatches).toBe(1);
    // A fresh catch with reduced motion already active starts directly in its static pose.
    const next = await canvas(page).evaluate((c: any) => { const w = window as any; w.placeStrikePrey(3); c._rhCommand('strike'); return { snapshot: c._rhSnapshot(), pose: w.carryPose() }; });
    expect(next.snapshot.missionCatches).toBe(2); expect(next.snapshot.talonExtension).toBe(1); expect(next.pose.rotation.slice(0, 3)).toEqual([0, 0, 0]); expect(next.pose.top).toBeCloseTo(-0.33, 5);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('holds the recognizable catch, fades its existing materials, and freezes the fade during pause', async ({ page }) => {
    await mount(page, 'baldEagle');
    const initial = await canvas(page).evaluate((c: any) => {
      const w = window as any, prey = w.realPrey(), fishIndex = prey.findIndex((o: any) => !!o.getObjectByName('prey-fish-fish'));
      w.placeStrikePrey(3, fishIndex); c._rhCommand('strike'); w.watchCarry();
      return { snapshot: c._rhSnapshot(), materials: w.carryMaterials() };
    });
    expect(initial.snapshot.missionCatches).toBe(1); expect(initial.materials.length).toBeGreaterThan(0);
    expect(initial.materials.every((m: any) => m.opacity === 1)).toBe(true);
    await canvas(page).evaluate(() => (window as any).advanceStrike(250));
    await expect(page.locator('[data-raptor-metric="mission"] .rh-flight-metric-value')).toHaveText('1 catch this flight');
    await expect(page.locator('.rh-flight-key-guide')).not.toContainText('Glide through recovery');
    // Capture the live render after the particle burst settles, before the fade.
    await expect(page.locator('.rh-flight-pause')).toHaveAttribute('data-visible', 'false');
    await capture(page, 'raptor-strike-carry-settled-live');
    const held = await canvas(page).evaluate((c: any) => {
      const w = window as any; w.advanceStrike(650);
      return { snapshot: c._rhSnapshot(), materials: w.carryMaterials() };
    });
    expect(held.snapshot.carriedPreyMs).toBe(200);
    expect(held.materials.every((m: any) => m.opacity === 1)).toBe(true);
    const fading = await canvas(page).evaluate((c: any) => {
      const w = window as any; w.advanceStrike(100); c._rhCommand('pause');
      return { snapshot: c._rhSnapshot(), materials: w.carryMaterials(), pose: w.carryPose() };
    });
    expect(fading.snapshot.carriedPreyMs).toBe(100);
    for (const m of fading.materials) expect(m.opacity).toBeCloseTo(.5, 7);
    expect(fading.materials.map((m: any) => m.uuid)).toEqual(initial.materials.map((m: any) => m.uuid));
    const frozen = await canvas(page).evaluate((c: any) => {
      const w = window as any; w.stepStrike(60000);
      return { snapshot: c._rhSnapshot(), materials: w.carryMaterials(), pose: w.carryPose() };
    });
    expect(frozen.snapshot.motionTimeMs).toBe(fading.snapshot.motionTimeMs);
    expect(frozen.snapshot.carriedPreyMs).toBe(100); expect(frozen.materials).toEqual(fading.materials); expect(frozen.pose).toEqual(fading.pose);
    const late = await canvas(page).evaluate((c: any) => {
      const w = window as any; c._rhCommand('pause'); w.advanceStrike(50);
      return { snapshot: c._rhSnapshot(), materials: w.carryMaterials() };
    });
    expect(late.snapshot.carriedPreyMs).toBe(50);
    for (const m of late.materials) expect(m.opacity).toBeCloseTo(.15625, 7);
    expect(late.materials.map((m: any) => m.uuid)).toEqual(initial.materials.map((m: any) => m.uuid));
    const expired = await canvas(page).evaluate((c: any) => {
      const w = window as any; w.advanceStrike(50);
      return { snapshot: c._rhSnapshot(), materials: w.carryMaterials(), disposed: w.carryWatches[0].entries };
    });
    expect(expired.snapshot.carriedPreyMs).toBe(0); expect(expired.snapshot.carriedPreyLabel).toBeNull(); expect(expired.materials).toEqual([]);
    expect(expired.disposed.every((r: any) => r.count === 1)).toBe(true);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('restores each motion preference immediately during a paused carry fade', async ({ page }) => {
    await mount(page);
    const faded = await canvas(page).evaluate((c: any) => {
      const w = window as any; w.placeStrikePrey(3); c._rhCommand('strike'); w.advanceStrike(1000); c._rhCommand('pause');
      return { snapshot: c._rhSnapshot(), materials: w.carryMaterials() };
    });
    expect(faded.snapshot.carriedPreyMs).toBe(100);
    for (const m of faded.materials) expect(m.opacity).toBeCloseTo(.5, 7);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => canvas(page).evaluate((c: any) => c._rhSnapshot().reducedMotion)).toBe(true);
    const restored = await canvas(page).evaluate((c: any) => ({ snapshot: c._rhSnapshot(), materials: (window as any).carryMaterials(), pose: (window as any).carryPose() }));
    expect(restored.snapshot.motionTimeMs).toBe(faded.snapshot.motionTimeMs); expect(restored.snapshot.carriedPreyMs).toBe(100);
    expect(restored.materials.every((m: any) => m.opacity === 1)).toBe(true);
    expect(restored.materials.map((m: any) => m.uuid)).toEqual(faded.materials.map((m: any) => m.uuid));
    expect(restored.pose.rotation.slice(0, 3)).toEqual([0, 0, 0]);
    const frozen = await canvas(page).evaluate((c: any) => {
      const w = window as any; w.stepStrike(60000);
      return { snapshot: c._rhSnapshot(), materials: w.carryMaterials(), pose: w.carryPose() };
    });
    expect(frozen.snapshot.motionTimeMs).toBe(restored.snapshot.motionTimeMs); expect(frozen.materials).toEqual(restored.materials); expect(frozen.pose).toEqual(restored.pose);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect.poll(() => canvas(page).evaluate((c: any) => c._rhSnapshot().reducedMotion)).toBe(false);
    const normal = await canvas(page).evaluate((c: any) => ({ snapshot: c._rhSnapshot(), materials: (window as any).carryMaterials() }));
    expect(normal.snapshot.motionTimeMs).toBe(restored.snapshot.motionTimeMs); expect(normal.snapshot.carriedPreyMs).toBe(100);
    for (const m of normal.materials) expect(m.opacity).toBeCloseTo(.5, 7);
    expect(normal.materials.map((m: any) => m.uuid)).toEqual(faded.materials.map((m: any) => m.uuid));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => canvas(page).evaluate((c: any) => c._rhSnapshot().reducedMotion)).toBe(true);
    expect(await canvas(page).evaluate(() => (window as any).carryMaterials().every((m: any) => m.opacity === 1))).toBe(true);
    await canvas(page).evaluate((c: any) => { c._rhCommand('pause'); (window as any).advanceStrike(50); });
    expect(await canvas(page).evaluate((c: any) => c._rhSnapshot().carriedPreyMs)).toBe(50);
    expect(await canvas(page).evaluate(() => (window as any).carryMaterials().every((m: any) => m.opacity === 1))).toBe(true);
    await canvas(page).evaluate(() => (window as any).advanceStrike(50));
    expect(await canvas(page).evaluate((c: any) => c._rhSnapshot().carriedPreyLabel)).toBeNull();
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('labels the remapped pull-up action truthfully while recovering from a distant miss', async ({ page }) => {
    await mount(page);
    const miss = await canvas(page).evaluate((c: any) => {
      const w = window as any;
      c._rhCommand('controls', { scheme: 'custom', keys: { a: 'turnLeft', d: 'turnRight', j: 'pullUp', f: 'strike', p: 'pause' } });
      w.placeStrikePrey(30); c._rhCommand('strike');
      return c._rhSnapshot();
    });
    expect(miss.missionCatches).toBe(0); expect(miss.strikeFeedbackKind).toBe('miss'); expect(miss.strikeReady).toBe(false); expect(miss.strikeWindowOpen).toBe(false);
    const guide = page.locator('.rh-flight-key-guide');
    await expect(guide).toContainText('Hold your heading'); await expect(guide).toContainText('Pull up if needed'); await expect(guide).not.toContainText('Glide through recovery');
    const pullUp = guide.locator('.rh-flight-key').filter({ hasText: 'Pull up if needed' });
    await expect(pullUp.locator('kbd')).toHaveText('J');
    await expect(page.locator('.rh-flight-mission-phase')).toContainText('Reset your approach');
    await capture(page, 'raptor-strike-recovery-guide-live');
    const recovered = await canvas(page).evaluate((c: any) => { (window as any).advanceStrike(400); return c._rhSnapshot(); });
    expect(recovered.strikeReady).toBe(true); expect(recovered.missionCatches).toBe(0);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('credits a legal near-ground catch before a later impact in the same coarse frame', async ({ page }) => {
    await mount(page, 'redTail');
    const result = await canvas(page).evaluate((c: any) => {
      const w=window as any, T=w.THREE;
      const terrain=w.strikeScene.children.find((o: any) => o.geometry?.parameters?.width===800 && o.geometry?.parameters?.height===800);
      if(!terrain) throw Error('Missing rendered terrain');
      terrain.updateWorldMatrix(true,false);
      const ray=new T.Raycaster(), down=new T.Vector3(0,-1,0);
      const ground=(x: number,z: number) => {
        ray.set(new T.Vector3(x,1000,z),down);
        const hit=ray.intersectObject(terrain,false)[0];
        if(!hit) throw Error('Terrain sample outside mesh');
        return hit.point.y;
      };
      const animals=w.realPrey();
      const mouse=animals.find((o: any) => o.children.some((child: any) => child.name.includes('rodent')));
      if(!mouse) throw Error('Missing field mouse');
      const clearance=mouse.position.y-ground(mouse.position.x,mouse.position.z);
      // Use the game's ordinary dive control to reach the ground approach.
      c._rhCommand('hold',{key:'shift',pressed:true});
      for(let i=0;i<500&&c._rhSnapshot().terrainClearance>3.5;i++) w.stepStrike(50);
      for(let i=0;i<200&&c._rhSnapshot().terrainClearance>2.2;i++) w.stepStrike(1);
      const approach=c._rhSnapshot(), p=approach.raptorPosition;
      if(approach.landed||approach.crashed) throw Error('Dive reached ground before setup');
      animals.forEach((o: any,i: number) => o.position.set(2000+i*20,2000,2000));
      let horizontal=6.7;
      for(let i=0;i<12;i++) {
        const x=p.x+Math.sin(approach.headingRadians)*horizontal;
        const z=p.z-Math.cos(approach.headingRadians)*horizontal;
        const y=ground(x,z)+clearance;
        horizontal=Math.sqrt(Math.max(0,7.01*7.01-(y-p.y)*(y-p.y)));
      }
      const x=p.x+Math.sin(approach.headingRadians)*horizontal,z=p.z-Math.cos(approach.headingRadians)*horizontal;
      mouse.position.set(x,ground(x,z)+clearance,z);
      const before=c._rhSnapshot();
      c._rhCommand('strike');
      const pressed=c._rhSnapshot();
      w.stepStrike(50);
      return {before,pressed,after:c._rhSnapshot()};
    });
    const trace=JSON.stringify(Object.fromEntries(Object.entries(result).map(([key,s]: [string,any]) =>
      [key,{height:s.terrainClearance,speed:s.speedMps,pitch:s.pitchRadians,catches:s.missionCatches,landed:s.landed,crashed:s.crashed}])));
    expect(result.before.targetCanStrike,trace).toBe(false);
    expect(result.pressed.talonThrowActive,trace).toBe(true);
    expect(result.pressed.missionCatches).toBe(0);
    expect(result.after.missionCatches,trace).toBe(1);
    expect(result.after.landed || result.after.crashed,trace).toBe(true);
    expect(result.after.terrainClearance).toBeCloseTo(1.5,6);
    expect(result.after.strikeFeedbackKind).toBe('hit');
    expect(result.after.carriedPreyLabel).toBe('Field Mouse');
    await capture(page,'raptor-strike-near-ground-catch');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('places aerial contact rings at the catch and water contacts on the lake while removing the caught wake', async ({ page }) => {
    await mount(page, 'baldEagle');
    const aerial = await canvas(page).evaluate((c: any) => {
      const w = window as any, prey = w.realPrey(), fishIndex = prey.findIndex((o: any) => !!o.getObjectByName('prey-fish-fish'));
      const fish = w.placeStrikePrey(3, fishIndex), y = fish.position.y; c._rhCommand('strike'); w.stepStrike(25); return { y, snapshot: c._rhSnapshot(), rings: w.ringPositions() };
    });
    expect(aerial.snapshot.missionCatches).toBe(1); expect(aerial.rings.length).toBe(1); expect(aerial.rings[0][1]).toBeCloseTo(aerial.y, 4);
    await harness.destroy(page); await mount(page, 'baldEagle');
    // Bring the bird down using ordinary flight controls, then put a real fish in reach.
    const water = await canvas(page).evaluate((c: any) => {
      const w = window as any;
      // The start heading points away from the lake center. Turn toward it before
      // descending, so the lake-surface contact is tested over actual water.
      c._rhCommand('hold', { key: 'd', pressed: true });
      for (let i = 0; i < 100 && Math.cos(c._rhSnapshot().headingRadians) < 0.97; i++) w.stepStrike(50);
      c._rhCommand('hold', { key: 'd', pressed: false });
      c._rhCommand('hold', { key: 'q', pressed: true });
      for (let i = 0; i < 240 && c._rhSnapshot().raptorPosition.y > 1.0; i++) w.stepStrike(50);
      c._rhCommand('hold', { key: 'q', pressed: false });
      const s = c._rhSnapshot(), p = s.raptorPosition, prey = w.realPrey(), fish = prey.find((o: any) => !!o.getObjectByName('prey-fish-fish'));
      prey.forEach((o: any, i: number) => o.position.set(2000 + i * 20, 2000, 2000));
      fish.position.set(p.x + Math.sin(s.headingRadians) * 3, -1.55, p.z - Math.cos(s.headingRadians) * 3);
      const before = c._rhSnapshot(); c._rhCommand('strike'); w.stepStrike(25);
      return { before, after: c._rhSnapshot(), rings: w.ringPositions(), pose: w.carryPose() };
    });
    expect(water.before.raptorPosition.y).toBeLessThan(2); expect(water.after.missionCatches).toBe(1); expect(water.after.waterWakeCount).toBe(water.before.waterWakeCount - 1); expect(water.rings.length).toBe(1); expect(water.rings[0][1]).toBeCloseTo(-1.475, 4); expect(water.pose.beaconsHidden).toBe(true);
    await capture(page, 'raptor-strike-water-catch');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

});
