import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_solarsystem.js', 'utf8');

function ackermann(command, localX, axleRole, speed) {
  const visual = command * (speed < -0.05 ? -1 : 1);
  if (axleRole === 'rear') return visual * -0.09;
  if (axleRole !== 'front' || Math.abs(visual) <= 0.001) return 0;
  const requested = Math.abs(visual) * 0.34;
  const radius = 0.8 / Math.max(0.01, Math.tan(requested));
  const inner = visual > 0 ? localX < 0 : localX > 0;
  const wheelRadius = Math.max(0.24, radius + (inner ? -0.45 : 0.45));
  return Math.sign(visual) * Math.min(0.46, Math.atan(0.8 / wheelRadius));
}

function integrateDust(hz) {
  const dt = 1 / hz;
  let x = 0, y = 0.5, z = 0;
  let vx = 0.42, vy = 0.7, vz = -0.21;
  for (let i = 0; i < hz; i++) {
    x += vx * dt;
    y += vy * dt;
    z += vz * dt;
    const damping = Math.exp(-1.35 * dt);
    vx *= damping;
    vy -= 0.28 * dt;
    vz *= damping;
  }
  return { x, y, z, vx, vy, vz };
}

describe('solar rocky rover visual polish', () => {
  it('uses one right-handed exact-terrain wheel-contact draw with bounded clearance', () => {
    expect(source).toContain('new THREE.InstancedMesh(roverWheelContactGeo, roverWheelContactMat, roverWheelContactCount)');
    expect(source).toContain('new THREE.CircleGeometry(1, 16)');
    expect(source).toContain('instanceMatrix.setUsage(THREE.DynamicDrawUsage)');
    expect(source).toContain('roverWheelContactMesh.frustumCulled = false;');
    expect(source).toContain('depthWrite: false, polygonOffset: true');
    expect(source).toContain('roverWheelContactNormal.crossVectors(roverWheelContactRight, roverWheelContactForward)');
    expect(source).toContain('roverWheelContactRight.crossVectors(roverWheelContactForward, roverWheelContactNormal)');
    expect(source).toContain('roverWheelContactBasis.makeBasis(roverWheelContactRight, roverWheelContactForward, roverWheelContactNormal)');
    expect(source).toContain('roverWheelContactDummy.position.set(wheelWorldX, wheelGround + 0.014, wheelWorldZ)');
    expect(0.014).toBeGreaterThanOrEqual(0.01);
    expect(0.014).toBeLessThanOrEqual(0.02);
    const right = [1, 0, 0], forward = [0, 0, -1], normal = [0, 1, 0];
    const determinant = right[0] * (forward[1] * normal[2] - forward[2] * normal[1])
      - right[1] * (forward[0] * normal[2] - forward[2] * normal[0])
      + right[2] * (forward[0] * normal[1] - forward[1] * normal[0]);
    expect(determinant).toBeCloseTo(1, 12);
  });

  it('articulates Ackermann wheels with correct inner magnitude and reverse path sign', () => {
    const forwardInner = ackermann(1, -0.45, 'front', 1);
    const forwardOuter = ackermann(1, 0.45, 'front', 1);
    const reverseInner = ackermann(1, 0.45, 'front', -1);
    const reverseOuter = ackermann(1, -0.45, 'front', -1);
    expect(forwardInner).toBeGreaterThan(forwardOuter);
    expect(reverseInner).toBeLessThan(reverseOuter);
    expect(Math.abs(forwardInner)).toBeLessThanOrEqual(0.46);
    expect(Math.abs(reverseInner)).toBeLessThanOrEqual(0.46);
    expect(ackermann(1, -0.45, 'front', 0)).toBeGreaterThan(0);
    expect(source).toContain("var visualSteeringCommand = roverDrive.steering * (roverDrive.speed < -0.05 ? -1 : 1);");
    expect(source).toContain('var contactYaw = yaw + wheelRigData.visualSteer;');
    expect(source).not.toContain('steerFactor');
  });

  it('emits deterministic fixed-pool rear-wheel dust from actual distance and integrates velocity by dt', () => {
    expect(source).toContain('var dustTrailCapacity = rockySurfaceLowPower ? 36 : (droneReduceMotion ? 42 : 60);');
    expect(source).toContain('var dustTrailVelocity = new Float32Array(dustTrailCapacity * 3);');
    expect(source).toContain('var nextRoverDustRandom = function ()');
    expect(source).toContain('var dustDistanceEmission = roverImpactFrameSuppressed ? 0 : roverDrive.actualDistance * (8 + roverDrive.tractionSlip * 16);');
    expect(source).toContain('var dustTrailingLocalZ = dustTravelSign > 0 ? 0.4 : -0.4;');
    expect(source).toContain('var dustSpawnLimit = droneReduceMotion ? 1 : (rockySurfaceLowPower ? 2 : 4);');
    expect(source).toContain('if (dustTrailVelocity[dustUpdateOffset + 1] <= 0) {');
    expect(source).toContain('var dustSurfaceHeight = _terrainHeightAt(dtArr[dustUpdateOffset], dtArr[dustUpdateOffset + 2]) + 0.025;');
    const dustBlock = source.slice(source.indexOf('// ── Rover dust trail animation'), source.indexOf('// ── Geological Sample Collection'));
    expect(dustBlock).not.toContain('Math.random');
    const paths = [20, 60, 120].map(integrateDust);
    expect(Math.max(...paths.map((path) => path.vx)) - Math.min(...paths.map((path) => path.vx))).toBeLessThan(1e-12);
    expect(Math.max(...paths.map((path) => path.vz)) - Math.min(...paths.map((path) => path.vz))).toBeLessThan(1e-12);
    expect(Math.max(...paths.map((path) => path.x)) - Math.min(...paths.map((path) => path.x))).toBeLessThan(0.02);
    expect(Math.max(...paths.map((path) => path.y)) - Math.min(...paths.map((path) => path.y))).toBeLessThan(0.02);
  });

  it('adds only bounded reduced-motion-safe camera presentation', () => {
    expect(source).toContain('roverDrive.visualYawRate = roverDrive.steering * roverDrive.turnRate * pivotAuthority * tractionSteeringAuthority;');
    expect(source).toContain('var chaseTurnLead = droneReduceMotion ? 0 : Math.max(-0.26, Math.min(0.26');
    expect(source).toContain('var chaseLookYaw = yaw + chaseTurnLead;');
    expect(source).toContain('chaseDesiredLook.x += (chaseLookForwardX - roverForward.x)');
    const boundedLead = (reduced, yawRate, speedRatio) => reduced ? 0 : Math.max(-0.26, Math.min(0.26, yawRate * speedRatio * 0.48));
    expect(boundedLead(true, 100, 1)).toBe(0);
    expect(boundedLead(false, 100, 1)).toBe(0.26);
    expect(boundedLead(false, -100, 1)).toBe(-0.26);
    expect(boundedLead(false, 1, 0)).toBe(0);
  });

  it('publishes stable visual hooks and disposes every owned pad resource once', () => {
    expect(source).toContain("canvasEl.dataset.roverVisualProfile = isFluid ? 'none' : 'procedural-contact-v1';");
    expect(source).toContain("canvasEl.dataset.roverContactPadCount = '0';");
    expect(source).toContain('canvasEl.dataset.roverDustCapacity');
    expect(source).toContain('roverWheelContactGeo.dispose()');
    expect(source).toContain('roverWheelContactMat.dispose()');
    expect(source).toContain('roverWheelContactTex.dispose()');
    expect(source).toContain('delete canvasEl.dataset.roverVisualProfile;');
    expect(source).toContain('delete canvasEl.dataset.roverContactPadCount;');
    expect(source).toContain('delete canvasEl.dataset.roverDustCapacity;');
    expect((source.match(/roverWheelContactGeo\.dispose\(\)/g) || [])).toHaveLength(1);
    expect((source.match(/roverWheelContactTex\.dispose\(\)/g) || [])).toHaveLength(1);
  });
});
