import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Ground-contact PNGs provide review captures without recording every rendered frame.
test.use({video:'off'});

test.describe('raptor flight continuity', () => {
  test.describe.configure({ mode: 'serial', timeout: 300000 });
  const harness = new GlHarness({
    toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt',
    width: 880, height: 620, appStyles: true, probes: 'window.AlloPostFXEnabled = false;'
  });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      let clock = 1000, nextId = 1, seed = 731;
      const callbacks = new Map<number, FrameRequestCallback>();
      Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      performance.now = () => clock;
      window.requestAnimationFrame = callback => { const id = nextId++; callbacks.set(id, callback); return id; };
      window.cancelAnimationFrame = id => { callbacks.delete(id); };
      (window as any).advanceFlight = (ms: number) => {
        clock += ms;
        const pending = Array.from(callbacks.values()); callbacks.clear();
        pending.forEach(callback => callback(clock));
      };
    });
    await harness.mount(page, { raptorHunt: {
      activeSection: 'hunt', selectedSpecies: 'peregrine', activeMission: 'freeFlight',
      flightSession: { speciesId: 'peregrine', missionId: 'freeFlight' },
      huntTutorialDismissed: true, graphicsQuality: 'low'
    } }, "document.querySelector('[data-raptor-canvas=true]')?._rhSnapshot");
  });

  test('holds chase framing steady through uneven frames and pauses without pose jumps', async ({ page }) => {
    const result = await page.evaluate(() => {
      const canvas = document.querySelector('[data-raptor-canvas=true]') as any;
      const step = (window as any).advanceFlight;
      canvas._rhCommand('assist');
      canvas._rhCommand('environment', { windSpeed: 0, cloudCover: 0.15 });
      for (let i = 0; i < 40; i++) step(1000 / 60);
      const frames = [];
      for (let i = 0; i < 60; i++) { step([8, 17, 45, 12, 33][i % 5]); frames.push(canvas._rhSnapshot()); }
      const before = canvas._rhSnapshot();
      canvas._rhCommand('pause'); step(60000);
      const paused = canvas._rhSnapshot();
      canvas._rhCommand('pause'); step(1000 / 60);
      const resumed = canvas._rhSnapshot();
      canvas._rhCommand('hold', { key: 'shift', pressed: true }); step(1000 / 60);
      const dive = canvas._rhSnapshot();
      const label = document.querySelector('.rh-flight-metric-label')!;
      const metric = document.querySelector('.rh-flight-metric')!;
      return { frames, before, paused, resumed, dive, labelDisplay: getComputedStyle(label).display,
        metricPadding: getComputedStyle(metric).paddingTop, errors: (window as any).__events.errors };
    });
    expect(result.errors).toEqual([]);
    expect(result.labelDisplay).toBe('block');
    expect(parseFloat(result.metricPadding)).toBeGreaterThanOrEqual(6);
    const screenY = result.frames.map(f => f.raptorNdcY);
    expect(Math.max(...screenY) - Math.min(...screenY)).toBeLessThan(0.001);
    expect(result.paused.motionTimeMs).toBe(result.before.motionTimeMs);
    expect(result.paused.wingAngle).toBe(result.before.wingAngle);
    expect(result.paused.raptorPosition).toEqual(result.before.raptorPosition);
    expect(result.resumed.motionTimeMs - result.before.motionTimeMs).toBeCloseTo(1000 / 60, 5);
    expect(Math.abs(result.resumed.wingAngle - result.before.wingAngle)).toBeLessThan(0.16);
    expect(Math.abs(result.dive.wingAngle - result.resumed.wingAngle)).toBeLessThan(0.16);
    expect(result.dive.featherDetailCount).toBe(20);
    expect(result.dive.drawCalls).toBeLessThan(150);
  });

  test('settles into a folded rest pose and takes off with pause-aware soft dust', async ({ page }) => {
    const result = await page.evaluate(() => {
      const canvas = document.querySelector('[data-raptor-canvas=true]') as any;
      const step = (window as any).advanceFlight;
      canvas._rhCommand('assist');
      canvas._rhCommand('environment', { windSpeed: 8 });
      canvas._rhCommand('hold', { key: 'q', pressed: true });
      for (let i = 0; i < 200 && !canvas._rhSnapshot().landed; i++) step(50);
      canvas._rhCommand('hold', { key: 'q', pressed: false });
      const landed = canvas._rhSnapshot();
      for (let i = 0; i < 20; i++) step(50);
      return {landed,resting:canvas._rhSnapshot()};
    });
    expect(result.landed.landed).toBe(true);
    expect(result.landed.touchdownActive).toBe(true);expect(result.landed.touchdownKind).toBe('land');
    expect(result.resting.raptorPosition).toEqual(result.landed.raptorPosition);
    expect(result.resting.wingFold).toBeGreaterThan(0.99);expect(result.resting.wingRestSpan).toBeLessThan(0.34);
    expect(result.resting.touchdownActive).toBe(false);
    expect(result.resting.visualGroundClearance).toBeCloseTo(result.resting.footSupportClearance,2);expect(result.resting.footSurfaceClearance).toBeGreaterThanOrEqual(0);expect(result.resting.footSurfaceClearance).toBeLessThan(0.012);
    expect(result.resting.airflowOverlayVisible).toBe(false);expect(result.resting.speedOverlayVisible).toBe(false);
    await page.getByRole('button',{name:'Scenic view',exact:true}).click();
    await page.evaluate(()=>(window as any).advanceFlight(0));
    await page.screenshot({clip:(await page.locator('[data-raptor-flight-stage]').boundingBox())!,path:'scratch/raptor-flight-review/cinematic-perched.png',timeout:90000});
    const launch=await page.evaluate(()=>{
      const c=document.querySelector('[data-raptor-canvas=true]') as any,step=(window as any).advanceFlight;
      c._rhCommand('hold',{key:' ',pressed:true});step(1000/60);const takeoff=c._rhSnapshot();step(1000/60);
      return {takeoff,climbing:c._rhSnapshot()};
    });
    expect(launch.takeoff.landed).toBe(false);
    expect(launch.takeoff.raptorPosition.y-result.resting.raptorPosition.y).toBeCloseTo(0.08,5);
    expect(launch.climbing.raptorPosition.y).toBeGreaterThan(launch.takeoff.raptorPosition.y);
    expect(launch.takeoff.wingFold).toBeGreaterThan(0.8);expect(launch.takeoff.wingFold).toBeLessThan(result.resting.wingFold);
    expect(launch.takeoff.touchdownKind).toBe('takeoff');expect(launch.takeoff.touchdownDustSoft).toBe(true);
    await page.evaluate(()=>{for(let i=0;i<6;i++)(window as any).advanceFlight(40);});
    await expect(page.getByText(/Rough landing\./)).toHaveCount(0);
    await page.screenshot({clip:(await page.locator('[data-raptor-flight-stage]').boundingBox())!,path:'scratch/raptor-flight-review/cinematic-takeoff.png',timeout:90000});
    const paused=await page.evaluate(()=>{
      const c=document.querySelector('[data-raptor-canvas=true]') as any,before=c._rhSnapshot();c._rhCommand('pause');(window as any).advanceFlight(60000);return {before,after:c._rhSnapshot()};
    });
    expect(paused.before.touchdownActive).toBe(true);expect(paused.before.touchdownDustOpacity).toBeGreaterThan(0);
    expect(paused.after.touchdownAge).toBe(paused.before.touchdownAge);expect(paused.after.wingFold).toBe(paused.before.wingFold);
    // Preference changes must clear the effect immediately, even while the flight clock is paused.
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect.poll(()=>page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot().touchdownActive)).toBe(false);
    expect(await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot().touchdownDustVisible)).toBe(false);
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('pause');(window as any).advanceFlight(25);});
  });

  test('retains a stable bird and working view controls with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((c: any) => c._rhSnapshot().reducedMotion)).toBe(true);
    const result = await page.evaluate(() => {
      const canvas = document.querySelector('[data-raptor-canvas=true]') as any;
      const step = (window as any).advanceFlight;
      for (let i = 0; i < 40; i++) step(25);
      const first = canvas._rhSnapshot();
      for (let i = 0; i < 10; i++) step(25);
      const last = canvas._rhSnapshot();
      canvas._rhCommand('view'); step(25);
      const fp = canvas._rhSnapshot();
      canvas._rhCommand('view'); step(25);
      return { first, last, fp, chase: canvas._rhSnapshot() };
    });
    expect(result.first.reducedMotion).toBe(true);
    expect(result.last.airflowOverlayVisible).toBe(false);expect(result.last.speedOverlayVisible).toBe(false);
    expect(result.last.wingAngle).toBeCloseTo(result.first.wingAngle, 4);
    expect(result.fp.cameraMode).toBe('fp');
    expect(result.chase.cameraMode).toBe('chase');
    expect(result.chase.cameraPosition.every(Number.isFinite)).toBe(true);
  });
});

