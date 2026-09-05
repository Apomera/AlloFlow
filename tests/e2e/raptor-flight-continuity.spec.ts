import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe('raptor flight continuity', () => {
  test.describe.configure({ mode: 'serial', timeout: 180000 });
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

  test('keeps perched birds stationary and takes off without an eight-meter teleport', async ({ page }) => {
    const result = await page.evaluate(() => {
      const canvas = document.querySelector('[data-raptor-canvas=true]') as any;
      const step = (window as any).advanceFlight;
      canvas._rhCommand('environment', { windSpeed: 8 });
      canvas._rhCommand('hold', { key: 'q', pressed: true });
      for (let i = 0; i < 200 && !canvas._rhSnapshot().landed; i++) step(50);
      canvas._rhCommand('hold', { key: 'q', pressed: false });
      const landed = canvas._rhSnapshot();
      for (let i = 0; i < 20; i++) step(50);
      const resting = canvas._rhSnapshot();
      canvas._rhCommand('hold', { key: ' ', pressed: true }); step(1000 / 60);
      const takeoff = canvas._rhSnapshot();
      step(1000 / 60);
      const climbing = canvas._rhSnapshot();
      return { landed, resting, takeoff, climbing };
    });
    expect(result.landed.landed).toBe(true);
    expect(result.resting.raptorPosition).toEqual(result.landed.raptorPosition);
    expect(result.takeoff.landed).toBe(false);
    expect(result.takeoff.raptorPosition.y - result.resting.raptorPosition.y).toBeCloseTo(0.08, 5);
    expect(result.climbing.raptorPosition.y).toBeGreaterThan(result.takeoff.raptorPosition.y);
  });

  test('retains a stable bird and working view controls with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
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
    expect(result.last.wingAngle).toBeCloseTo(result.first.wingAngle, 4);
    expect(result.fp.cameraMode).toBe('fp');
    expect(result.chase.cameraMode).toBe('chase');
    expect(result.chase.cameraPosition.every(Number.isFinite)).toBe(true);
  });
});

