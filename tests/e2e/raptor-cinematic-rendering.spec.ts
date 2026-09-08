import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Explicit scene PNGs cover visual review without recording every software-rendered frame.
test.use({ video: 'off' });

test.describe('Raptor cinematic simulator rendering', () => {
  // Software WebGL and several full-resolution readbacks can exceed three minutes on this host.
  test.describe.configure({ mode: 'serial', timeout: 300000 });
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 1100, height: 760, appStyles: true, probes: 'window.AlloPostFXEnabled = false;' });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1140, height: 1000 });
    await page.addInitScript(() => {
      let clock = 1000, next = 1, seed = 731;
      const callbacks = new Map<number, FrameRequestCallback>();
      Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      performance.now = () => clock;
      window.requestAnimationFrame = cb => { const id = next++; callbacks.set(id, cb); return id; };
      window.cancelAnimationFrame = id => { callbacks.delete(id); };
      (window as any).advanceScenery = (ms: number) => { clock += ms; const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(cb => cb(clock)); };
    });
  });

  for (const scene of [
    { id: 'peregrine', quality: 'balanced', phase: 0.44, label: 'cliffs' },
    { id: 'baldEagle', quality: 'high', phase: 0.30, label: 'lake' },
    { id: 'greatHorned', quality: 'low', phase: 0.93, label: 'night-low' },
    { id: 'baldEagle', quality: 'low', phase: 0.30, label: 'lake-low' }
  ]) {
    test(`renders ${scene.label} with working scenic view and a pause-aware atmosphere`, async ({ page }) => {
      if ((scene.label === 'night-low' || scene.label === 'lake-low')) {
        await page.setViewportSize({ width: 420, height: 900 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
      }
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
      await harness.mount(page, { raptorHunt: { activeSection: 'hunt', selectedSpecies: scene.id, activeMission: 'freeFlight', flightSession: { speciesId: scene.id, missionId: 'freeFlight' }, huntTutorialDismissed: true, graphicsQuality: scene.quality } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
      if ((scene.label === 'night-low' || scene.label === 'lake-low')) await page.addStyleTag({ content: '#wrap{width:420px}' });
      await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((c: HTMLCanvasElement) => Math.abs(c.clientWidth - c.parentElement!.clientWidth))).toBeLessThan(2);
      await page.evaluate(({ phase, lake }) => {
        const canvas = document.querySelector('[data-raptor-canvas]') as any;
        const advance = (window as any).advanceScenery;
        canvas._rhCommand('assist');
        canvas._rhCommand('environment', { dayPhase: phase, cloudCover: 0.18, windSpeed: 0 });
        if (lake) {
          canvas._rhCommand('hold', { key: 'e', pressed: true });
          for (let i = 0; i < 30; i++) advance(40);
          canvas._rhCommand('hold', { key: 'e', pressed: false });
          canvas._rhCommand('hold', { key: 'd', pressed: true });
          for (let i = 0; i < 50; i++) advance(40);
          canvas._rhCommand('hold', { key: 'd', pressed: false });
        }
        for (let i = 0; i < 30; i++) advance(25);
      }, { phase: scene.phase, lake: scene.label.startsWith('lake') });
      const before = await page.locator('[data-raptor-canvas]').evaluate((c: any) => c._rhSnapshot());
      expect(before.cinematicSurfaces).toBe(true);
      expect(before.refinedFlightSurfaces).toBe(true);
      expect(before.curvedWingVertices).toBe(scene.quality==='low'?77:scene.quality==='high'?133:105);
      expect(Math.abs(before.raptorNdcX)).toBeLessThan(0.7);
      expect(Math.abs(before.raptorNdcY)).toBeLessThan(0.7);
      if ((scene.label === 'night-low' || scene.label === 'lake-low')) { expect(before.reducedMotion).toBe(true); expect(before.sceneryTime).toBe(0); }
      expect(before.softShadows).toBe(scene.quality !== 'low');
      expect(before.drawCalls).toBeLessThan(150);
      expect(before.forestTreeCount).toBeGreaterThan(50);
      expect(before.boughPanelVertices).toBe(52);
      expect(Math.hypot(before.vegetationWindX,before.vegetationWindZ)).toBeLessThan(0.005);
      expect(before.vegetationSurfacePrograms).toBeGreaterThan(1);
      if(scene.quality==='low')expect(before.vegetationShadowPrograms).toBe(0);else expect(before.vegetationShadowPrograms).toBeGreaterThan(0);
      expect(before.meadowClumpCount).toBeGreaterThan(200);
      expect(before.meadowBladeCount).toBe(scene.quality==='low'?7:scene.quality==='high'?13:10);
      expect(before.distantTerrainOffsetX + before.raptorPosition.x).toBeCloseTo(0, 5);
      expect(before.distantTerrainOffsetZ + before.raptorPosition.z).toBeCloseTo(0, 5);
      if (scene.label.startsWith('lake')) { if (!before.reducedMotion) expect(before.waterUpdates).toBeGreaterThan(0); else expect(before.waterUpdates).toBe(0); expect(before.lakeSurfaceVertices).toBeGreaterThan(300); expect(before.waterShaderPrograms).toBeGreaterThan(0); expect(before.waterPositionVersion).toBe(0); }
      await page.getByRole('button', { name: 'Scenic view', exact: true }).click();
      await expect(page.locator('[data-raptor-flight-stage]')).toHaveAttribute('data-raptor-scenic-view', 'true');
      await expect(page.locator('.rh-flight-telemetry-strip')).toBeHidden();
      await page.evaluate(() => { (window as any).advanceScenery(25); });
      await page.screenshot({ clip: (await page.locator('[data-raptor-flight-stage]').boundingBox())!, path: `scratch/raptor-flight-review/cinematic-${scene.label}.png`, timeout: 90000 });
      if(scene.label==='cliffs'){
        await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('hold',{key:'q',pressed:true});for(let i=0;i<120&&c._rhSnapshot().terrainClearance>12;i++)(window as any).advanceScenery(40);c._rhCommand('hold',{key:'q',pressed:false});(window as any).advanceScenery(25);});
        await page.screenshot({ clip: (await page.locator('[data-raptor-flight-stage]').boundingBox())!,path:'scratch/raptor-flight-review/cinematic-meadow.png',timeout:90000});
        const wind=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('environment',{windSpeed:12,windDir:Math.PI/2});(window as any).advanceScenery(40);const onset=c._rhSnapshot();for(let i=0;i<19;i++)(window as any).advanceScenery(40);return {onset,settled:c._rhSnapshot()};});
        expect(wind.onset.vegetationWindX).toBeGreaterThan(0);expect(wind.onset.vegetationWindX).toBeLessThan(0.13);
        expect(wind.settled.vegetationWindX).toBeGreaterThan(0.2);expect(wind.settled.vegetationWindX).toBeLessThanOrEqual(1);expect(Math.abs(wind.settled.vegetationWindZ)).toBeLessThan(0.00001);
        await page.screenshot({ clip: (await page.locator('[data-raptor-flight-stage]').boundingBox())!,path:'scratch/raptor-flight-review/cinematic-windy-meadow.png',timeout:90000});
      }
      if(scene.label==='lake'){
        const water=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('environment',{windSpeed:12,windDir:Math.PI/2});for(let i=0;i<20;i++)(window as any).advanceScenery(40);return c._rhSnapshot();});
        expect(water.vegetationWindX).toBeGreaterThan(0.2);expect(water.waterPositionVersion).toBe(0);expect(water.waterUpdates).toBeGreaterThan(before.waterUpdates);
        await page.screenshot({ clip: (await page.locator('[data-raptor-flight-stage]').boundingBox())!,path:'scratch/raptor-flight-review/cinematic-windy-lake.png',timeout:90000});
      }
      if(scene.label==='lake'){
        const flex=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{let peak=0;c._rhCommand('hold',{key:'e',pressed:true});for(let i=0;i<30;i++){(window as any).advanceScenery(40);peak=Math.max(peak,Math.abs(c._rhSnapshot().primaryFlex));}c._rhCommand('hold',{key:'e',pressed:false});return peak;});
        expect(flex).toBeGreaterThan(0.005);expect(flex).toBeLessThanOrEqual(0.16);
        await page.screenshot({clip:(await page.locator('[data-raptor-flight-stage]').boundingBox())!,path:'scratch/raptor-flight-review/cinematic-eagle-wingbeat.png',timeout:90000});
      }
      const paused = await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
        c._rhCommand('pause');
        const before = c._rhSnapshot();
        (window as any).advanceScenery(60000);
        return { before, after: c._rhSnapshot() };
      });
      expect(paused.after.sceneryTime).toBe(paused.before.sceneryTime);
      expect(paused.after.primaryFlex).toBe(paused.before.primaryFlex);
      expect(paused.after.waterUpdates).toBe(paused.before.waterUpdates); expect(paused.after.waterPositionVersion).toBe(paused.before.waterPositionVersion);
      expect(paused.after.vegetationWindX).toBe(paused.before.vegetationWindX);expect(paused.after.vegetationWindZ).toBe(paused.before.vegetationWindZ);
      expect(paused.after.raptorPosition).toEqual(paused.before.raptorPosition);
      await expect(page.locator('.rh-flight-pause')).toBeVisible();
      await page.locator('[data-raptor-canvas]').evaluate((c: any) => { c._rhCommand('pause'); (window as any).advanceScenery(25); });
      if(scene.label==='cliffs'||scene.label==='lake'){
        await page.emulateMedia({reducedMotion:'reduce'});
        const reduced=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{(window as any).advanceScenery(25);return c._rhSnapshot();});
        expect(reduced.vegetationWindX).toBe(0);expect(reduced.vegetationWindZ).toBe(0);expect(reduced.sceneryTime).toBe(0);expect(reduced.primaryFlex).toBe(0);
        await page.emulateMedia({reducedMotion:'no-preference'});
        const resumed=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{(window as any).advanceScenery(25);return c._rhSnapshot();});
        expect(resumed.vegetationWindX).toBeGreaterThan(0);expect(resumed.vegetationWindX).toBeLessThan(0.1);expect(resumed.drawCalls).toBeLessThan(150);
      }
      await page.getByRole('button', { name: 'Scenic view', exact: true }).click();
      await expect(page.locator('.rh-flight-telemetry-strip')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
});
