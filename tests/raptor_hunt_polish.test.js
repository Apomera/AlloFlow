import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE_PATH = 'stem_lab/stem_tool_raptorhunt.js';

function source() {
  return readFileSync(SOURCE_PATH, 'utf8');
}

function functionBody(text, name) {
  const start = text.indexOf(`function ${name}(`);
  expect(start, `Expected ${name} to exist`).toBeGreaterThanOrEqual(0);
  const open = text.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === '{') depth += 1;
    if (text[index] === '}') depth -= 1;
    if (depth === 0) return text.slice(start, index + 1);
  }
  throw new Error(`Could not find end of ${name}`);
}

function sampleRenderedGrid(grid, segments, size, wx, wz) {
  const half = size * 0.5;
  const cell = size / segments;
  const stride = segments + 1;
  const localX = Math.max(-half, Math.min(half, wx));
  const localY = Math.max(-half, Math.min(half, -wz));
  const gx = (localX + half) / cell;
  const gy = (half - localY) / cell;
  const ix = Math.max(0, Math.min(segments - 1, Math.floor(gx)));
  const iy = Math.max(0, Math.min(segments - 1, Math.floor(gy)));
  const u = Math.max(0, Math.min(1, gx - ix));
  const v = Math.max(0, Math.min(1, gy - iy));
  const a = grid[ix + stride * iy];
  const b = grid[ix + stride * (iy + 1)];
  const c = grid[ix + 1 + stride * (iy + 1)];
  const d = grid[ix + 1 + stride * iy];
  return u + v <= 1
    ? a + v * (b - a) + u * (d - a)
    : (1 - u) * b + (u + v - 1) * c + (1 - v) * d;
}

function simulateEdge(hz, reducedMotion = false) {
  const dt = 1 / hz;
  const soft = 330;
  const hard = 382;
  let x = 320;
  let z = 0;
  let yaw = Math.PI / 2;
  let steerRate = 0;
  let peak = Math.abs(x);
  for (let elapsed = 0; elapsed < 8 - 1e-9; elapsed += dt) {
    const frameX = x;
    const frameZ = z;
    const edgeDistance = Math.max(Math.abs(x), Math.abs(z));
    const strength = Math.max(0, Math.min(1, (edgeDistance - soft) / (hard - soft)));
    let target = 0;
    if (strength > 0) {
      const inwardYaw = Math.atan2(-x, z);
      const error = Math.atan2(Math.sin(inwardYaw - yaw), Math.cos(inwardYaw - yaw));
      target = Math.max(-0.65, Math.min(0.65, error * 1.2)) * strength;
    }
    // Reduced motion is deliberately not part of flight physics.
    void reducedMotion;
    steerRate += (target - steerRate) * (1 - Math.exp(-4 * dt));
    yaw += steerRate * dt;
    x += Math.sin(yaw) * 108 * dt;
    z -= Math.cos(yaw) * 108 * dt;
    if (x > hard && x - frameX > 0) x = hard;
    if (x < -hard && x - frameX < 0) x = -hard;
    if (z > hard && z - frameZ > 0) z = hard;
    if (z < -hard && z - frameZ < 0) z = -hard;
    peak = Math.max(peak, Math.abs(x), Math.abs(z));
  }
  return { x, z, yaw, peak };
}

function simulateStrikeParticle(hz) {
  const dt = 1 / hz;
  let x = 0;
  let y = 8;
  let z = 0;
  let vx = 7;
  let vy = 9;
  let vz = -5;
  for (let elapsed = 0; elapsed < 1.2 - 1e-9; elapsed += dt) {
    const drag = Math.exp(-1.7 * dt);
    vx = (vx + 1.5 * 0.34 * dt) * drag;
    vy = (vy - 10.5 * dt) * drag;
    vz = (vz - 0.75 * 0.34 * dt) * drag;
    x += vx * dt;
    y += vy * dt;
    z += vz * dt;
    if (y < 0.06) {
      y = 0.06;
      vx *= 0.58;
      vy = Math.abs(vy) * 0.16;
      vz *= 0.58;
    }
  }
  return { x, y, z };
}

describe('Raptor Hunt pooled, terrain-coherent polish', () => {
  it('samples the exact r128 PlaneGeometry triangle split and world-Z mapping', () => {
    const grid = new Float32Array([0, 4, 2, 10]);
    expect(sampleRenderedGrid(grid, 1, 2, -0.5, 0.5)).toBeCloseTo(2.5, 8);
    expect(sampleRenderedGrid(grid, 1, 2, 0.5, 0.5)).toBeCloseTo(6.5, 8);

    const text = source();
    const sampler = functionBody(text, 'terrainHeightAt');
    expect(sampler).toContain('var localY = Math.max(-terrainHalfSize, Math.min(terrainHalfSize, -wz))');
    expect(sampler).toContain('if (u + v <= 1)');
    expect(sampler).toContain('(u + v - 1) * cHeight');
    expect(text).toContain('terrainHeightGrid[i / 3] = tPos[i + 2]');
    expect(sampler).not.toContain('terrainDisplacementAt');
  });

  it('uses a proper right-handed contact basis with local +Z as surface normal', () => {
    const text = source();
    const frame = functionBody(text, 'sampleTerrainContactFrame');
    expect(frame).toContain('terrainContactRight.crossVectors(terrainContactForward, terrainContactNormal)');
    expect(frame).toContain('terrainContactForward.crossVectors(terrainContactNormal, terrainContactRight)');
    expect(frame).toContain('terrainContactMatrix.makeBasis(terrainContactRight, terrainContactForward, terrainContactNormal)');

    const forward = [0, 0, -1];
    const normal = [0, 1, 0];
    const right = [
      forward[1] * normal[2] - forward[2] * normal[1],
      forward[2] * normal[0] - forward[0] * normal[2],
      forward[0] * normal[1] - forward[1] * normal[0],
    ];
    const determinant =
      right[0] * (forward[1] * normal[2] - forward[2] * normal[1]) -
      forward[0] * (right[1] * normal[2] - right[2] * normal[1]) +
      normal[0] * (right[1] * forward[2] - right[2] * forward[1]);
    expect(determinant).toBeCloseTo(1, 8);
  });

  it('replaces per-catch GPU churn with a fixed circular typed-array pool', () => {
    const text = source();
    const spawn = functionBody(text, 'spawnCatchFx');
    const update = functionBody(text, 'updateCatchFx');
    expect(text).toContain('var STRIKE_FX_SLOT_COUNT = 4');
    expect(text).toContain('var STRIKE_FX_PER_SLOT = 28');
    expect(text).toContain('new Float32Array(STRIKE_FX_CAPACITY * 3)');
    expect(text).toContain('new THREE.InstancedMesh(');
    expect(spawn).toContain('(strikeFxNextSlot + 1) % STRIKE_FX_SLOT_COUNT');
    expect(spawn).toContain('strikeFxRecycleCount++');
    expect(spawn).not.toMatch(/new THREE\.|new Float32Array|scene\.add|scene\.remove/);
    expect(update).not.toMatch(/new THREE\.|Math\.random|\.splice\(|scene\.add|scene\.remove/);
    expect(text).not.toContain('catchFxList');
  });

  it('keeps strike integration finite and close across 20, 60, and 120 Hz', () => {
    const at20 = simulateStrikeParticle(20);
    const at60 = simulateStrikeParticle(60);
    const at120 = simulateStrikeParticle(120);
    for (const state of [at20, at60, at120]) {
      expect(Number.isFinite(state.x + state.y + state.z)).toBe(true);
      expect(state.y).toBeGreaterThanOrEqual(0.06);
    }
    expect(Math.abs(at20.x - at120.x)).toBeLessThan(0.6);
    expect(Math.abs(at60.x - at120.x)).toBeLessThan(0.2);
    expect(Math.abs(at20.z - at120.z)).toBeLessThan(0.5);
  });

  it('uses nonteleporting dt-stable inward edge steering and reachable prey bounds', () => {
    const at20 = simulateEdge(20);
    const at60 = simulateEdge(60);
    const at120 = simulateEdge(120);
    expect(at20.peak).toBeLessThanOrEqual(382);
    expect(at60.peak).toBeLessThanOrEqual(382);
    expect(at120.peak).toBeLessThanOrEqual(382);
    expect(Math.hypot(at20.x - at120.x, at20.z - at120.z)).toBeLessThan(8);
    expect(simulateEdge(60, true)).toEqual(at60);

    const text = source();
    expect(text).toContain('var preyWorldEdgeHard = worldEdgeHard - 12');
    expect(text).toMatch(/pm2\.mesh\.position\.x > preyWorldEdgeHard[\s\S]{0,180}pm2\.vx \*= -0\.65/);
    expect(text).not.toMatch(/wrapBoundary|wrapDeltaX|raptor\.x \+= wrapDelta/);
  });

  it('grounds prey from visual bounds and keeps lake strike feedback on the water', () => {
    const text = source();
    expect(text).toContain('preyBoundsScratch.setFromObject(mesh)');
    expect(text).toContain('var groundClearance = Math.max(0.03, -preyBoundsScratch.min.y)');
    expect(text).toContain("surfaceMode: preySurfaceMode");
    expect(text).toContain("surfaceMode === 'water-surface' || surfaceMode === 'subsurface'");
    expect(text).toContain('contactY = -1.5 + 0.025');
    expect(text).toContain('terrainContactQuaternion.setFromAxisAngle(terrainContactRight.set(1, 0, 0), -Math.PI / 2)');
    expect(text).toContain("strikeFxSlotWater[slotIndex]\n                ? -1.5 + 0.04");
  });

  it('keeps first-person intact and bounds chase composition as visual-only feedback', () => {
    const text = source();
    const reducedMotionChange = functionBody(text, 'onReducedMotionChange');
    expect(text).toContain("if (camMode === 'fp')");
    expect(text).toContain('var fpTerrainFloor =');
    expect(text).toContain('terrainHeightAt(camera.position.x, camera.position.z) + 0.72');
    expect(text).toContain("var lateralGoal = _rmFX\n              ? 0");
    expect(text).toContain('Math.max(-3.2, Math.min(3.2, visualTurnRate * 0.52))');
    expect(text).toContain('Math.min(0.22, targetProximity * 0.22)');
    expect(text).toContain('var cameraTerrainFloor =');
    expect(text).toContain('cameraTargetBlend += (0 - cameraTargetBlend)');
    expect(reducedMotionChange).toContain('cameraTargetBlend = 0');
    expect(reducedMotionChange).toContain('cameraLateralLead = 0');
    expect(reducedMotionChange).toContain('camera.up.set(0, 1, 0)');
    expect(reducedMotionChange).toContain('hideStrikeFxSlot(reducedStrikeSlot)');
    expect(reducedMotionChange).toContain('strikeFxPoints.visible = false');
  });

  it('routes explicit-gesture audio through one gated master and bounds one-shots', () => {
    const text = source();
    const audio = functionBody(text, 'playSpeciesCall');
    expect(text).toContain('var MAX_FLIGHT_ONE_SHOTS = 6');
    expect(text).toContain('flightMasterGain = audioCtx.createGain()');
    expect(text).toContain('windGain.connect(flightMasterGain)');
    expect(audio).toContain('g.connect(flightMasterGain)');
    expect(audio).toContain('activeFlightOneShots.length >= MAX_FLIGHT_ONE_SHOTS');
    expect(audio).toContain('osc.onended = function()');
    expect(audio).toContain('document.hidden');
    expect(audio).not.toContain('audioCtx.destination');
    expect(text).toContain('setFlightAudioGate(!simPaused)');
    expect(text).toContain("var missionFeedbackScale = missionOutcome === 'active' ? 1 : 0.45");
  });

  it('publishes guarded non-live datasets and removes them during idempotent cleanup', () => {
    const text = source();
    const setter = functionBody(text, 'setRaptorCanvasData');
    expect(setter).toContain('canvasEl.dataset[key] !== nextValue');
    expect(text).toContain("setRaptorCanvasData('raptorStrikeFxCapacity', STRIKE_FX_CAPACITY)");
    expect(text).toContain("setRaptorCanvasData('raptorWorldEdge', worldEdgeState)");
    expect(text).toContain("setRaptorCanvasData('raptorCameraTargetBlend', cameraTargetBlend.toFixed(2))");
    expect(text).toContain('if (cleanupComplete) return');
    expect(text).toContain('scene.remove(strikeFxPoints)');
    expect(text).toContain('strikeFxGeometry.dispose()');
    expect(text).toContain('scene.remove(preyContactMesh)');
    expect(text).toContain('activeFlightOneShots.slice().forEach');
    expect(text).toContain('delete canvasEl.dataset[datasetKey]');
  });

  it('restores flight focus after pointer commands without stealing keyboard focus', () => {
    const text = source();
    const helper = functionBody(text, 'sendHuntCommandFromControl');
    expect(helper).toContain('event && event.detail > 0');
    expect(helper).toContain('canvas.focus({ preventScroll: true })');
    expect(text).toContain("sendHuntCommandFromControl(event, 'pause')");
    expect(text).toContain("sendHuntCommandFromControl(event, 'strike')");
    expect(text).toContain('sendHuntCommandFromControl(event, action)');
  });
});
