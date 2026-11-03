import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000, retries: 0 });
test.use({ trace: 'off', video: 'off' });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  width: 640, height: 480, preScripts: ['stem_lab/stem_lab_module.js'],
  probes: `window.__testHooks = {}; window.__stopFtPaint = {};
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, ...args) {
      if (/^\\d+ ft$/.test(String(text))) window.__stopFtPaint[String(text)] = true;
      return original.call(this, text, ...args);
    };`,
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('streamed STOP signs face their inbound lanes and the HUD reports physical road distance', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await harness.mount(page, { roadReady: { view: 'scenarioBriefing', pendingScenario: 'rural',
    scenario: 'rural', vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('rural', 'sedan'));
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  const fixture = await page.evaluate(() => {
    const w = window as any, hook = w.__testHooks.roadReady, RR = w.__RR_TEST_EXPORTS__.roadReady;
    const world = hook.infiniteWorldRef.current;
    // Pick the nearest authored rural intersection for which physical feet
    // differ visibly from the station delta. Integrate the lane independently
    // using 5 cm segments for the expected HUD label.
    let selected: any = null;
    const at = (s: number, lateral: number) => ({
      x: world.spline.centerAt(s) + lateral * Math.cos(world.spline.headingAt(s)),
      y: s - lateral * Math.sin(world.spline.headingAt(s)),
    });
    for (let radius = 0; radius <= 60 && !selected; radius += 6) {
      for (const index of radius ? [radius, -radius] : [0]) {
        const chunk = world.getChunk(index);
        if (!chunk.hasIntersection || chunk.signalType !== 'stop') continue;
        for (const direction of [-1, 1]) {
          const station = index * 32 + chunk.intersectionY;
          const bar = station - direction * 4.1, frontStation = bar - direction * 12;
          const lateral = -direction * 1.5, front = at(frontStation, lateral);
          let previous = front, distance = 0;
          for (let step = 1; step <= 240; step++) {
            const next = at(frontStation + direction * step / 20, lateral);
            distance += Math.hypot(next.x - previous.x, next.y - previous.y);
            previous = next;
          }
          const feet = Math.round(distance * 3.28084);
          if (Math.abs(feet - Math.round(12 * 3.28084)) < 2 || Math.abs(distance * 3.28084 - feet) > 0.35) continue;
          const heading = (direction > 0 ? Math.PI / 2 : -Math.PI / 2) - world.spline.headingAt(frontStation);
          selected = { index, station, direction, feet, distance, roadHalf: chunk.roadHalfWidth,
            centerX: world.spline.centerAt(station),
            carX: front.x - Math.cos(heading) * 2.25, carY: front.y - Math.sin(heading) * 2.25, heading };
          break;
        }
        if (selected) break;
      }
    }
    if (!selected) throw new Error('No curved rural STOP approach with a distinct rounded physical distance');
    hook.timeRef.current = Math.max(5, hook.timeRef.current);
    const car = hook.carRef.current;
    for (const [key, value] of Object.entries({ x: selected.carX, y: selected.carY, heading: selected.heading, speed: 0 })) {
      Object.defineProperty(car, key, { configurable: true, get: () => value, set: () => {} });
    }
    hook.gearRef.current = 'P';
    const signal = { type: 'stop', state: 'stop', x: selected.centerX, y: selected.station, _chunk: selected.index };
    Object.defineProperty(hook.signalsRef, 'current', { configurable: true, get: () => [signal], set: () => {} });
    w.__stopFtPaint = {}; w.__stopSceneFixture = selected;
    return selected;
  });
  await page.waitForFunction(() => {
    const w = window as any, scene = w.__testHooks.roadReady.threeRef.current?.scene;
    return w.__stopFtPaint[w.__stopSceneFixture.feet + ' ft'] && scene?.getObjectByName('intersection-stop-main-1-front');
  }, undefined, { timeout: 90_000 });
  const signs = await page.evaluate(() => {
    const w = window as any, fixture = w.__stopSceneFixture, scene = w.__testHooks.roadReady.threeRef.current.scene;
    scene.updateMatrixWorld(true);
    let junction: any = null;
    scene.traverse((node: any) => {
      if (node.name !== 'intersection-stop-main-1-front') return;
      const candidate = node.parent.parent;
      const center = candidate.getWorldPosition(candidate.position.clone());
      if (Math.hypot(center.x - fixture.centerX + 48, center.z - fixture.station + 48) < 0.1) junction = candidate;
    });
    if (!junction) throw new Error('Expected all sign meshes at the selected painted intersection');
    return ['main', 'cross'].flatMap(axis => [1, -1].map(direction => {
      const name = 'intersection-stop-' + axis + '-' + direction;
      const front = junction.getObjectByName(name + '-front'), back = junction.getObjectByName(name + '-back');
      const normal = front.position.clone().set(0, 0, 1).transformDirection(front.matrixWorld);
      const approach = front.position.clone().set(axis === 'cross' ? -direction : 0, 0, axis === 'main' ? -direction : 0)
        .transformDirection(junction.matrixWorld);
      const p = front.parent.position;
      return { axis, direction, x: p.x, z: p.z, facing: normal.dot(approach),
        frontSide: front.material.side, text: !!front.material.map, frontOpaque: !front.material.transparent,
        backSide: back.material.side, blank: !back.material.map, backOpaque: !back.material.transparent,
        reverseAtFace: back.position.distanceTo(front.position), octagonSides: front.geometry.parameters.segments };
    }));
  });
  for (const sign of signs) {
    expect(sign.facing).toBeGreaterThan(0.999);
    expect(sign.frontSide).toBe(0); expect(sign.text).toBe(true); expect(sign.frontOpaque).toBe(true);
    expect(sign.backSide).toBe(1); expect(sign.blank).toBe(true); expect(sign.backOpaque).toBe(true);
    expect(sign.reverseAtFace).toBeLessThan(0.001); expect(sign.octagonSides).toBe(8);
    if (sign.axis === 'main') {
      expect(-sign.direction * sign.x).toBeGreaterThan(fixture.roadHalf);
      expect(-sign.direction * sign.z).toBeGreaterThan(3.25);
    } else {
      expect(sign.direction * sign.z).toBeGreaterThan(3.25);
      expect(-sign.direction * sign.x).toBeGreaterThan(fixture.roadHalf);
    }
  }
  console.log('Curved STOP approach', fixture.distance.toFixed(2), 'm, HUD', fixture.feet, 'ft, 4 readable fronts and opaque backs');
  await page.locator('#wrap').screenshot({ path: 'tmp/roadready-stop-sign-pass/readable-stop-sign.png' });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
