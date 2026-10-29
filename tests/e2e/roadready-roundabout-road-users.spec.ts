import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000, retries: 0 });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  width: 1100, height: 780,
  preScripts: ['stem_lab/stem_lab_module.js'],
  probes: 'window.__testHooks = {};',
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('all roundabout crossings are painted and live approach traffic yields to a walking pedestrian', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await harness.mount(page, { roadReady: {
    view: 'scenarioBriefing', pendingScenario: 'roundabout', scenario: 'roundabout',
    vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('roundabout', 'sedan'));
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => {
    const hook = (window as any).__testHooks?.roadReady;
    return hook?.timeRef.current >= 4.2 &&
      !!hook.threeRef.current?.scene?.getObjectByName('roundabout-crosswalk-landing-3-1');
  });

  const painted = await page.evaluate(() => {
    const scene = (window as any).__testHooks.roadReady.threeRef.current.scene;
    scene.updateMatrixWorld(true);
    const counts = { stripes: 0, landings: 0 };
    scene.traverse((object: any) => {
      if (/^roundabout-crosswalk-\d-\d$/.test(object.name)) counts.stripes++;
      if (/^roundabout-crosswalk-landing-\d--?1$/.test(object.name)) counts.landings++;
    });
    const meshData = (name: string) => {
      const mesh = scene.getObjectByName(name);
      if (!mesh) return null;
      const position = mesh.getWorldPosition(mesh.position.clone());
      const longAxis = mesh.position.clone().set(1, 0, 0).transformDirection(mesh.matrixWorld);
      return { isMesh: mesh.isMesh, visible: mesh.visible,
        x: position.x, y: position.y, z: position.z,
        axisX: longAxis.x, axisY: longAxis.y, axisZ: longAxis.z };
    };
    return { counts, arms: Array.from({ length: 4 }, (_, arm) => ({
      stripes: Array.from({ length: 9 }, (_, stripe) => meshData(`roundabout-crosswalk-${arm}-${stripe}`)),
      landings: [-1, 1].map(side => meshData(`roundabout-crosswalk-landing-${arm}-${side}`)),
    })) };
  });
  expect(painted.counts).toEqual({ stripes: 36, landings: 8 });
  // Verify the actual scene geometry against the four cardinal road arms,
  // independently of the route helper used by the pedestrians.
  const armAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
  painted.arms.forEach((arm, index) => {
    const angle = armAngles[index];
    const checkPosition = (mesh: any, lateral: number, height: number) => {
      expect(mesh).not.toBeNull();
      expect(mesh.isMesh).toBe(true);
      expect(mesh.visible).toBe(true);
      expect(mesh.x).toBeCloseTo(18 * Math.cos(angle) - lateral * Math.sin(angle), 6);
      expect(mesh.z).toBeCloseTo(18 * Math.sin(angle) + lateral * Math.cos(angle), 6);
      expect(mesh.y).toBeCloseTo(height, 6);
      expect(mesh.axisX * Math.cos(angle) + mesh.axisZ * Math.sin(angle)).toBeGreaterThan(0.999);
      expect(Math.abs(mesh.axisY)).toBeLessThan(1e-6);
    };
    arm.stripes.forEach((stripe, stripeIndex) => checkPosition(stripe, -3 + stripeIndex * 0.75, 0.035));
    arm.landings.forEach((landing, sideIndex) => checkPosition(landing, [-1, 1][sideIndex] * 4.25, 0.02));
  });

  await page.evaluate(() => {
    const w = window as any;
    const hook = w.__testHooks.roadReady;
    const RR = w.__RR_TEST_EXPORTS__.roadReady;
    const pedestrian = hook.pedsRef.current.find((person: any) => person._roundaboutArm === 1);
    if (!pedestrian) throw new Error('Roundabout did not spawn its east-arm pedestrian');
    // Reuse a real spawned pedestrian and start on the north sidewalk. The
    // live safe-entry check must wait for the approaching car to slow down.
    Object.assign(pedestrian, {
      x: 66, y: 43.5, homeX: 66, homeY: 43.5,
      vx: 0, vy: 0, crossing: false, crossDwell: 0,
      _roundaboutLateral: -4.5, _roundaboutCrossDirection: 1,
      _blockedByStoppedVehicle: false,
    });
    const approach = RR.spawnRoundaboutTraffic({ traffic: 'medium' })
      .find((actor: any) => actor._roundaboutState === 'approach');
    Object.assign(approach, { id: 'live_east_crosswalk_approach',
      x: 78, y: 46.25, heading: Math.PI, speed: 6 });
    Object.assign(hook.carRef.current, { x: 49.75, y: 81, heading: -Math.PI / 2, speed: 0 });
    hook.gearRef.current = 'P';
    hook.trafficRef.current = [approach];
    hook.pedsRef.current = [pedestrian];
    hook.cyclistsRef.current = [];
    hook.wildlifeRef.current = [];
    hook.signalsRef.current = [];

    const report = w.__roundaboutCrosswalkReport = {
      startedAt: hook.timeRef.current, firstMoveAt: null, finishedAt: null,
      frames: 0, walkingSamples: 0, stoppedSamples: 0,
      minWalkingSpeed: Infinity, maxWalkingSpeed: 0,
      minFrontClearance: Infinity, maxCrossingXDeviation: 0,
      heldX: null, overlap: false, blocked: false, resumed: false,
    };
    let previous = { time: hook.timeRef.current, x: pedestrian.x, y: pedestrian.y,
      crossing: false, lateral: -4.5 };
    const sample = () => {
      const live = w.__testHooks?.roadReady;
      if (!live) return;
      const time = live.timeRef.current;
      const actor = live.trafficRef.current[0];
      const person = live.pedsRef.current[0];
      if (time > previous.time && actor && person) {
        report.frames++;
        const travelled = Math.hypot(person.x - previous.x, person.y - previous.y);
        if (report.firstMoveAt === null && travelled > 1e-8) report.firstMoveAt = previous.time;
        report.overlap ||= RR.pointOverlapsVehicle(actor, RR.vehicleFootprint(actor.type), person, 0.28);
        report.overlap ||= RR.pointOverlapsVehicle(live.carRef.current, RR.vehicleFootprint('sedan'), person, 0.28);
        report.blocked ||= !!person._blockedByStoppedVehicle;
        if (person.crossing) {
          report.maxCrossingXDeviation = Math.max(report.maxCrossingXDeviation, Math.abs(person.x - 66));
          report.minFrontClearance = Math.min(report.minFrontClearance,
            actor.x - RR.vehicleFootprint(actor.type).length / 2 - 66);
          if (actor.speed < 0.1) {
            report.stoppedSamples++;
            report.heldX = actor.x;
          }
          // Measure displacement against the simulation clock, excluding
          // the partial steps at either sidewalk. The observer never moves
          // actors or calls an update helper.
          if (previous.crossing && previous.lateral > -4.4 && person._roundaboutLateral < 4.4) {
            const walkingSpeed = travelled / (time - previous.time);
            report.walkingSamples++;
            report.minWalkingSpeed = Math.min(report.minWalkingSpeed, walkingSpeed);
            report.maxWalkingSpeed = Math.max(report.maxWalkingSpeed, walkingSpeed);
          }
        }
        if (report.firstMoveAt !== null && !person.crossing && person._roundaboutLateral > 4.49 && report.finishedAt === null) {
          report.finishedAt = time;
        }
        if (report.finishedAt !== null && report.heldX !== null && actor.speed > 0.5 && actor.x < report.heldX - 0.5) {
          report.resumed = true;
        }
        previous = { time, x: person.x, y: person.y,
          crossing: person.crossing, lateral: person._roundaboutLateral };
      }
      w.__roundaboutCrosswalkMonitor = requestAnimationFrame(sample);
    };
    w.__roundaboutCrosswalkMonitor = requestAnimationFrame(sample);
  });

  await page.waitForFunction(() => {
    const w = window as any;
    const report = w.__roundaboutCrosswalkReport;
    return report.finishedAt !== null &&
      w.__testHooks.roadReady.timeRef.current - report.finishedAt >= 2.5;
  }, undefined, { timeout: 180_000 });
  const result = await page.evaluate(() => {
    const w = window as any;
    cancelAnimationFrame(w.__roundaboutCrosswalkMonitor);
    const hook = w.__testHooks.roadReady;
    const person = hook.pedsRef.current[0];
    return { ...w.__roundaboutCrosswalkReport,
      pedestrian: { x: person.x, y: person.y, crossing: person.crossing, lateral: person._roundaboutLateral },
      crashes: hook.statsRef.current.crashes,
    };
  });
  expect(result.frames).toBeGreaterThan(20);
  expect(result.stoppedSamples).toBeGreaterThan(2);
  expect(result.minFrontClearance).toBeGreaterThan(0.5);
  expect(result.walkingSamples).toBeGreaterThan(10);
  expect(result.minWalkingSpeed).toBeGreaterThan(1.18);
  expect(result.maxWalkingSpeed).toBeLessThan(1.22);
  expect(result.finishedAt - result.firstMoveAt).toBeGreaterThan(7.3);
  expect(result.finishedAt - result.firstMoveAt).toBeLessThan(7.8);
  expect(result.maxCrossingXDeviation).toBeLessThan(1e-6);
  expect(result.pedestrian).toEqual({ x: 66, y: 52.5, crossing: false, lateral: 4.5 });
  expect(result.blocked).toBe(false);
  expect(result.overlap).toBe(false);
  expect(result.crashes).toBe(0);
  expect(result.resumed).toBe(true);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await page.screenshot({ path: 'tmp/roadready-accuracy/roundabout-crosswalk.png' });
});
