import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 150_000, retries: 0 });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  width: 1100, height: 780,
  preScripts: ['stem_lab/stem_lab_module.js'],
  probes: 'window.__testHooks = {};',
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('rendered roundabout arrows, yield signs, and learner start agree with right-hand traffic', async ({ page }) => {
  await harness.mount(page, { roadReady: {
    view: 'scenarioBriefing', pendingScenario: 'roundabout', scenario: 'roundabout',
    vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('roundabout', 'sedan'));
  await page.waitForFunction(() => {
    const scene = (window as any).__testHooks?.roadReady?.threeRef.current?.scene;
    return !!scene?.getObjectByName('roundabout-flow-arrow-7') &&
      !!scene.getObjectByName('roundabout-yield-inner-3');
  });

  const rendered = await page.evaluate(() => {
    const hook = (window as any).__testHooks.roadReady;
    const scene = hook.threeRef.current.scene;
    scene.updateMatrixWorld(true);
    const vector = (mesh: any, x: number, y: number, z: number) =>
      mesh.position.clone().set(x, y, z).transformDirection(mesh.matrixWorld);
    const arrows = Array.from({ length: 8 }, (_, index) => {
      const mesh = scene.getObjectByName('roundabout-flow-arrow-' + index);
      const position = mesh.getWorldPosition(mesh.position.clone());
      // ShapeGeometry's arrow tip lies along local +Y before being laid flat.
      const tipDirection = vector(mesh, 0, 1, 0);
      const angle = Math.atan2(position.z, position.x);
      return {
        visible: mesh.visible,
        radius: Math.hypot(position.x, position.z),
        counterclockwiseDot: tipDirection.x * Math.sin(angle) - tipDirection.z * Math.cos(angle),
        radialDot: tipDirection.x * Math.cos(angle) + tipDirection.z * Math.sin(angle),
        vertical: tipDirection.y,
      };
    });
    const signs = Array.from({ length: 4 }, (_, index) => {
      const outer = scene.getObjectByName('roundabout-yield-outer-' + index);
      const inner = scene.getObjectByName('roundabout-yield-inner-' + index);
      const position = outer.getWorldPosition(outer.position.clone());
      const faceNormal = vector(outer, 0, 0, 1);
      const panelOffset = inner.getWorldPosition(inner.position.clone()).sub(position);
      const offsetAlongNormal = panelOffset.dot(faceNormal);
      return {
        x: position.x, y: position.y, z: position.z,
        normal: { x: faceNormal.x, y: faceNormal.y, z: faceNormal.z },
        offsetAlongNormal,
        sidewaysPanelOffset: panelOffset.clone().sub(faceNormal.clone().multiplyScalar(offsetAlongNormal)).length(),
      };
    });
    const car = hook.carRef.current;
    return { arrows, signs, car: { x: car.x, y: car.y, heading: car.heading, speed: car.speed } };
  });

  for (const arrow of rendered.arrows) {
    expect(arrow.visible).toBe(true);
    expect(arrow.radius).toBeCloseTo(8, 6);
    expect(arrow.counterclockwiseDot).toBeGreaterThan(0.999);
    expect(Math.abs(arrow.radialDot)).toBeLessThan(1e-6);
    expect(Math.abs(arrow.vertical)).toBeLessThan(1e-6);
  }

  // N, S, E, W signs belong outside the right edge of each inbound lane.
  const expectedSigns = [
    { x: -3.8, z: -11, nx: 0, nz: -1 },
    { x: 3.8, z: 11, nx: 0, nz: 1 },
    { x: 11, z: -3.8, nx: 1, nz: 0 },
    { x: -11, z: 3.8, nx: -1, nz: 0 },
  ];
  rendered.signs.forEach((sign, index) => {
    const expected = expectedSigns[index];
    expect(sign.x).toBeCloseTo(expected.x, 6);
    expect(sign.z).toBeCloseTo(expected.z, 6);
    expect(sign.normal.x * expected.nx + sign.normal.z * expected.nz).toBeGreaterThan(0.999);
    expect(Math.abs(sign.normal.y)).toBeLessThan(1e-6);
    expect(sign.offsetAlongNormal).toBeCloseTo(0.01, 6);
    expect(sign.sidewaysPanelOffset).toBeLessThan(1e-6);
  });

  // The learner starts on the south arm, travelling north in its right lane.
  expect(rendered.car.x - 48).toBeGreaterThan(1.6);
  expect(rendered.car.x - 48).toBeLessThan(1.8);
  expect(rendered.car.y).toBeGreaterThan(60);
  expect(Math.sin(rendered.car.heading)).toBeLessThan(-0.999);
  expect(rendered.car.speed).toBe(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await page.screenshot({ path: 'tmp/roadready-accuracy/roundabout-markings.png' });
});

test('live roundabout grading accepts normal circulation and the legal east and west inbound lanes', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await harness.mount(page, { roadReady: {
    view: 'scenarioBriefing', pendingScenario: 'roundabout', scenario: 'roundabout',
    vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('roundabout', 'sedan'));
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2);
  await page.evaluate(() => {
    const w = window as any;
    const hook = w.__testHooks.roadReady;
    const RR = w.__RR_TEST_EXPORTS__.roadReady;
    hook.gearRef.current = 'D';
    hook.trafficRef.current = [];
    hook.pedsRef.current = [];
    hook.cyclistsRef.current = [];
    hook.wildlifeRef.current = [];
    hook.signalsRef.current = [];
    w.__roundaboutLaneDepartureWarning = false;
    w.__roundaboutLaneObserver = new MutationObserver(() => {
      if (document.body.textContent?.includes('Lane Departure')) w.__roundaboutLaneDepartureWarning = true;
    });
    w.__roundaboutLaneObserver.observe(document.body, { childList: true, characterData: true, subtree: true });
    w.__roundaboutLaneFixture = { kind: 'circle', startedAt: hook.timeRef.current };
    const pose = () => {
      const fixture = w.__roundaboutLaneFixture;
      if (fixture.kind === 'east') return { x: 68, y: 46.25, heading: Math.PI };
      if (fixture.kind === 'west') return { x: 28, y: 49.75, heading: 0 };
      return RR.roundaboutPose(1.4 - (hook.timeRef.current - fixture.startedAt) * 9 / 8);
    };
    // Supply a known legal trajectory while the real animation loop runs all
    // grading. A circular lane must not be graded as a series of X-axis lane
    // changes, and the east/west arms must use their own centerline direction.
    for (const key of ['x', 'y', 'heading'] as const) {
      Object.defineProperty(hook.carRef.current, key, {
        configurable: true, get: () => pose()[key], set: () => {},
      });
    }
    Object.defineProperty(hook.carRef.current, 'speed', {
      configurable: true, get: () => 9, set: () => {},
    });
  });

  for (const segment of [{ kind: 'circle', duration: 12 }, { kind: 'east', duration: 3 }, { kind: 'west', duration: 3 }]) {
    await page.evaluate((kind) => {
      const w = window as any;
      w.__roundaboutLaneFixture = { kind, startedAt: w.__testHooks.roadReady.timeRef.current };
    }, segment.kind);
    await page.waitForFunction((duration) => {
      const w = window as any;
      return w.__testHooks.roadReady.timeRef.current - w.__roundaboutLaneFixture.startedAt >= duration;
    }, segment.duration);
    const grade = await page.evaluate(() => {
      const stats = (window as any).__testHooks.roadReady.statsRef.current;
      return {
        wrongSideViolations: stats.wrongSideViolations || 0,
        wrongSideEvents: stats.wrongSideEvents || 0,
        laneChanges: stats.laneChanges || 0,
        unsignaledLaneChanges: stats.unsignaledLaneChanges || 0,
        wrongWay: stats.driveEvents.filter((event: any) => event.type === 'roundabout_wrong_way').length,
      };
    });
    expect(grade, segment.kind).toEqual({
      wrongSideViolations: 0, wrongSideEvents: 0, laneChanges: 0,
      unsignaledLaneChanges: 0, wrongWay: 0,
    });
  }
  expect(await page.evaluate(() => {
    const w = window as any;
    w.__roundaboutLaneObserver.disconnect();
    return w.__roundaboutLaneDepartureWarning;
  })).toBe(false);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
