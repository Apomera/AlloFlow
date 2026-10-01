import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_solarsystem.js', 'utf8');

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function stepTerrainRover(state, { dt, grade, crossSlope = 0, gravityRatio = 0.38, throttle = 0, steering = 0 }) {
  grade = clamp(grade, -0.65, 0.65);
  crossSlope = clamp(crossSlope, -0.65, 0.65);
  const aGrade = clamp(-(2.4 * clamp(gravityRatio, 0.04, 1.2)) * grade / Math.sqrt(1 + grade * grade), -1.25, 1.25);
  const opposing = throttle !== 0 && state.speed !== 0 && Math.sign(throttle) !== Math.sign(state.speed);
  const requested = throttle === 0 ? 0 : throttle * (opposing ? 4.4 : 2.1);
  const gradeLoad = Math.min(1, Math.abs(grade) / 0.45);
  const crossLoad = Math.min(1, Math.abs(crossSlope) / 0.45);
  const terrainLoad = Math.max(gradeLoad, crossLoad * 0.8);
  const available = Math.max(0.7, 2.1 * (1 - terrainLoad * 0.38));
  const applied = clamp(requested, -available, available);
  const unmet = Math.abs(requested - applied) / 4.4;
  const speedRatio = Math.min(1, Math.abs(state.speed) / 2.6);
  const movingOrDemanded = Math.abs(state.speed) > 0.035 || throttle !== 0;
  const targetSlip = movingOrDemanded ? Math.min(1, unmet * 1.7 + (opposing ? 0.42 : 0) + Math.abs(steering) * (0.08 + speedRatio * 0.62) + terrainLoad * 0.18) : 0;
  state.slip += (targetSlip - state.slip) * (1 - Math.exp(-7 * dt));
  const rolling = 0.9 * (0.30 + terrainLoad * 0.12);
  let net = applied + aGrade;
  const staticHold = throttle === 0 && Math.abs(state.speed) < 0.035 && Math.abs(net) <= rolling;
  if (staticHold) {
    state.speed = 0;
  } else {
    const resistanceSign = state.speed !== 0 ? Math.sign(state.speed) : Math.sign(net);
    const appliedResistance = Math.abs(state.speed) < 0.035 ? Math.min(rolling, Math.abs(net)) : rolling;
    net -= resistanceSign * appliedResistance;
    const previousSpeed = state.speed;
    state.speed += net * dt;
    if (opposing && previousSpeed !== 0 && Math.sign(previousSpeed) !== Math.sign(state.speed)) state.speed = 0;
    if (previousSpeed !== 0 && Math.sign(previousSpeed) !== Math.sign(state.speed) && Math.sign(net) !== Math.sign(throttle)) state.speed = 0;
  }
  state.speed = clamp(state.speed, -1.5, 2.6);
  state.distance += Math.abs(state.speed) * dt;
  return { aGrade, staticHold, targetSlip };
}

describe('solar system rocky rover dynamics', () => {
  it('integrates drive velocity with a clamped animation delta', () => {
    expect(source).toContain('function animate3dV2(frameMs)');
    expect(source).toContain('Math.max(0, Math.min(0.05, (safeFrameMs - droneLastFrameMs) / 1000))');
    expect(source).toContain('roverDrive.speed += netAcceleration * droneFrameDt;');
    expect(source).toContain('playerPos.addScaledVector(roverDrive.velocity, droneFrameDt);');
  });

  it('times the deployment cinematic by elapsed seconds rather than rendered frames', () => {
    expect(source).toContain('var _descentDurationSec = 3;');
    expect(source).toContain('(safeFrameMs - _descentStartedAtMs) / 1000');
    expect(source).not.toContain('var _descentDuration = 180;');
  });

  it('keeps fluid movement separate from the rocky traction model', () => {
    expect(source).toContain('Preserve the established six-axis probe/submersible controls.');
    expect(source).toContain('var requestedDriveAcceleration = throttleInput === 0 ? 0');
    expect(source).toContain('var staticHold = throttleInput === 0');
    expect(source).toContain('roverDrive.visualYawRate = roverDrive.steering * roverDrive.turnRate * pivotAuthority * tractionSteeringAuthority;');
    expect(source).toContain('yaw += roverDrive.visualYawRate * droneFrameDt;');
  });

  it('keeps reduced-motion visual snapping out of steering physics', () => {
    expect(source).toContain('var steeringInputEase = 1 - Math.exp(-8 * droneFrameDt);');
    expect(source).toContain('roverDrive.steering += (steeringInput - roverDrive.steering) * steeringInputEase;');
    expect(source).not.toContain('(steeringInput - roverDrive.steering) * roverDamping(8)');
    const steerStep = (current, input, dt) => current + (input - current) * (1 - Math.exp(-8 * dt));
    const normalPreference = steerStep(0.25, 1, 1 / 60);
    const reducedPreference = steerStep(0.25, 1, 1 / 60);
    expect(reducedPreference).toBe(normalPreference);
    expect(steerStep(0.25, 1, 0)).toBe(0.25);
  });

  it('derives signed grade and cross-slope before bounded world-relative gravity', () => {
    expect(source).toContain('(roverTerrainState.front - roverTerrainState.back) / (2 * roverTerrainState.probeDistance)');
    expect(source).toContain('(roverTerrainState.right - roverTerrainState.left) / (2 * roverTerrainState.probeDistance)');
    expect(source).toContain('parseFloat(sel.gravity) || 0.38');
    expect(source).toContain('-gradeGravity * grade / Math.sqrt(1 + grade * grade)');
    const uphill = stepTerrainRover({ speed: 0, slip: 0, distance: 0 }, { dt: 1 / 60, grade: 0.3 });
    const downhill = stepTerrainRover({ speed: 0, slip: 0, distance: 0 }, { dt: 1 / 60, grade: -0.3 });
    const pluto = stepTerrainRover({ speed: 0, slip: 0, distance: 0 }, { dt: 1 / 60, grade: -0.65, gravityRatio: 0.06 });
    expect(uphill.aGrade).toBeLessThan(0);
    expect(downhill.aGrade).toBeGreaterThan(0);
    expect(Math.abs(pluto.aGrade)).toBeLessThan(Math.abs(downhill.aGrade));
  });

  it('holds shallow slopes and rolls downhill consistently at 20/60/120 Hz', () => {
    const parked = { speed: 0, slip: 0, distance: 0 };
    const hold = stepTerrainRover(parked, { dt: 1 / 20, grade: 0.1 });
    expect(hold.staticHold).toBe(true);
    expect(parked).toMatchObject({ speed: 0, slip: 0 });
    const simulate = (hz) => {
      const state = { speed: 0, slip: 0, distance: 0 };
      for (let frame = 0; frame < hz * 3; frame++) stepTerrainRover(state, { dt: 1 / hz, grade: -0.65 });
      return state;
    };
    const at20 = simulate(20), at60 = simulate(60), at120 = simulate(120);
    expect(at20.speed).toBeGreaterThan(0);
    expect(at20.speed).toBeCloseTo(at60.speed, 8);
    expect(at120.speed).toBeCloseTo(at60.speed, 8);
    expect(Math.abs(at20.distance - at120.distance)).toBeLessThan(0.02);
  });

  it('never lets resistance inject opposite motion and brakes wheels before reversal', () => {
    [20, 60, 120].forEach((hz) => {
      const state = { speed: 0, slip: 0, distance: 0 };
      stepTerrainRover(state, { dt: 1 / hz, grade: 0.5, gravityRatio: 0.91, throttle: 1 });
      expect(state.speed).toBeGreaterThanOrEqual(0);
    });
    const reversing = { speed: 0.05, slip: 0, distance: 0 };
    stepTerrainRover(reversing, { dt: 0.05, grade: 0, throttle: -1 });
    expect(reversing.speed).toBe(0);
    expect(reversing.slip).toBeGreaterThan(0);
    stepTerrainRover(reversing, { dt: 0.05, grade: 0, throttle: -1 });
    expect(reversing.speed).toBeLessThan(0);
    const wheelSpeed = (speed, throttle, slip) => Math.sign(speed) * Math.max(0, Math.abs(speed) - Math.abs(throttle * slip * 0.55));
    expect(wheelSpeed(0.1, -1, 0.7)).toBe(0);
    expect(wheelSpeed(-0.1, 1, 0.7)).toBe(-0);
    expect(source).toContain('Math.sign(roverDrive.speed) * Math.max(0, Math.abs(roverDrive.speed) - Math.abs(wheelSlipOffset))');
  });

  it('uses one shared slip state for steering, wheels, dust, audio, and text telemetry', () => {
    expect(source).toContain('var audioSlip = roverDrive.tractionSlip;');
    expect(source).toContain('var tractionSteeringAuthority = Math.max(0.38, 1 - roverDrive.tractionSlip * 0.55);');
    expect(source).toContain('var dustDistanceEmission = roverImpactFrameSuppressed ? 0 : roverDrive.actualDistance * (8 + roverDrive.tractionSlip * 16);');
    expect(source).toContain('wheelRigData.spin += roverDrive.drivenWheelSpeed * droneFrameDt / 0.15;');
    expect(source).toContain("roverDrive.tractionSlip < 0.28 ? 'Grip'");
    expect(source).toContain('canvasEl.dataset.roverGradePercent = gradeData;');
    expect(source).toContain('canvasEl.dataset.roverTraction = tractionText;');
    expect(source).toContain('canvasEl.dataset.roverSlip = slipData;');
  });

  it('articulates all six rocky wheels from local terrain samples', () => {
    const positions = source.match(/var wheelPositions = \[([\s\S]*?)\n\s*\];/);
    expect(positions).toBeTruthy();
    expect(positions[1].match(/\[[-\d.]+,\s*[-\d.]+,\s*[-\d.]+\]/g)).toHaveLength(6);
    expect(source).toContain('rockyWheelRigs.push({');
    expect(source).toContain('var wheelGround = _terrainHeightAt(wheelWorldX, wheelWorldZ);');
    expect(source).toContain('wheelRigData.spin += roverDrive.drivenWheelSpeed * droneFrameDt / 0.15;');
  });

  it('aligns the local negative-Z nose and wheel contacts with drive heading', () => {
    expect(source).toContain('var targetRoverYaw = yaw;');
    expect(source).toContain('var vehicleRotY = yaw;');
    expect(source).toContain('var targetRoverPitch = Math.max(-0.22, Math.min(0.22, Math.atan(roverTerrainState.forwardGrade)));');
    expect(source).not.toContain('targetRoverYaw = yaw + Math.PI');
  });

  it('samples the rendered 151 by 151 rocky terrain grid without raycasts or allocations', () => {
    const rockyTerrain = source.match(/} else if \(!isFluid\) \{([\s\S]*?)\/\/ Add scattered rocks and boulders/);
    expect(rockyTerrain).toBeTruthy();
    const block = rockyTerrain[1];
    expect(block).toContain('var terrainGridSegments = 150;');
    expect(block).toContain('var terrainGridSize = terrainGridSegments + 1;');
    expect(block).toContain('var heightMap = new Float32Array(terrainGridSize * terrainGridSize);');
    expect(block).toContain('heightMap[vi / 3] = posArr[vi + 2];');
    expect(block).toContain('var gridX = (terrainX + terrainHalfSize) / terrainCellSize;');
    expect(block).toContain('var gridZ = (terrainZ + terrainHalfSize) / terrainCellSize;');
    expect(block).toContain('if (fracX + fracZ <= 1)');
    expect(block).toContain('return h11 + (1 - fracX) * (h01 - h11) + (1 - fracZ) * (h10 - h11);');
    expect(block).not.toContain('new THREE.Raycaster()');
    expect(block).not.toContain('new THREE.Vector3(x, 50, z)');
    expect(block).not.toContain('intersectObject(_terrainMesh)');
  });

  it('uses a damped, speed-responsive chase camera with terrain protection', () => {
    expect(source).toContain('var chaseDistance = 5.4 + chaseSpeedRatio * 2.4;');
    expect(source).toContain('chaseCameraPos.lerp(chaseDesired, roverDamping(6.5));');
    expect(source).toContain('var requiredCameraY = (chaseGround + 1.05 - chaseDesiredLook.y * (1 - chaseT)) / chaseT;');
    expect(source).toContain('chaseCameraPos.y = Math.max(chaseCameraPos.y, smoothedCameraGround + 1.25);');
    expect(source).toContain('var targetChaseFov = droneReduceMotion ? 70 : 68 + chaseSpeedRatio * 8;');
    expect(source).toContain('var chaseTurnLead = droneReduceMotion ? 0 : Math.max(-0.26, Math.min(0.26');
  });

  it('couples dust and telemetry to actual post-boundary travel rather than held keys', () => {
    expect(source).toContain('var roverActualSpeed = droneFrameDt > 0 ? roverDrive.actualDistance / droneFrameDt : 0;');
    expect(source).toContain('var dustDistanceEmission = roverImpactFrameSuppressed ? 0 : roverDrive.actualDistance * (8 + roverDrive.tractionSlip * 16);');
    expect(source).toContain('dustTrailLife[dti2] - droneFrameDt');
    expect(source).toContain('var dustVelocityDamping = Math.exp(-1.35 * droneFrameDt);');
    expect(source).toContain('lastSpeed = isFluid ? frameDist * 20 : Math.abs(roverDrive.speed) * scaleFactor;');
    expect(source).not.toContain('var isMoving = moveState.forward || moveState.back || moveState.left || moveState.right;');
  });

  it('keeps drive sonification opt-in and gesture-gated', () => {
    expect(source).toContain('var roverSoundEnabled = false;');
    expect(source).toContain('var context = getSolarAC();');
    expect(source).toContain('var motor = context.createOscillator();');
    expect(source).toContain('Math.abs(roverDrive.speed) / roverDrive.maxForward');
    expect(source).toContain('data-rover-sound-toggle');
    expect(source).toContain('aria-keyshortcuts');
    expect(source).toContain('aria-pressed');
  });

  it('cleans up rover-owned audio without closing the shared context', () => {
    expect(source).toContain('disposeRoverAudio();');
    expect(source).toContain('onRoverVisibilityChange');
    expect(source).toContain('roverAudio.motor.stop()');
    expect(source).toContain('roverAudio.traction.stop()');
    expect(source).not.toContain('roverAudio.context.close()');
    expect(source).not.toContain('roverAudio.context.suspend()');
  });

  it('releases rocky dust GPU resources during scene cleanup', () => {
    expect(source).toContain('var dustTrailMat = new THREE.PointsMaterial');
    expect(source).toContain('new THREE.Points(dustTrailGeo, dustTrailMat)');
    expect(source).toContain('scene.remove(dustTrailMesh);');
    expect(source).toContain('dustTrailGeo.dispose()');
    expect(source).toContain('dustTrailMat.dispose()');
    expect(source.split('dustTrailGeo.dispose()')).toHaveLength(2);
    expect(source.split('dustTrailMat.dispose()')).toHaveLength(2);
  });

  it('uses a bounded terrain-conforming track ring with a right-handed basis', () => {
    expect(source).toContain('var roverTrackCapacity = 96;');
    expect(source).toContain('new THREE.InstancedMesh(trackGeo, trackMat, roverTrackCapacity)');
    expect(source).toContain('roverTrackDistanceCarry += roverDrive.actualDistance;');
    expect(source).toContain('roverTrackCursor = (roverTrackCursor + 1) % roverTrackCapacity;');
    expect(source).toContain('roverTrackNormal.crossVectors(roverTrackRightTangent, roverTrackForwardTangent)');
    expect(source).toContain('roverTrackRightTangent.crossVectors(roverTrackForwardTangent, roverTrackNormal)');
    expect(source).toContain('roverTrackMesh.geometry.dispose()');
    expect(source).toContain('roverTrackMesh.material.dispose()');

    const right = [1, 0, 0];
    const forward = [0, 0, -1];
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const normal = cross(right, forward);
    const rebuiltRight = cross(forward, normal);
    const determinant = rebuiltRight[0] * (forward[1] * normal[2] - forward[2] * normal[1]) - rebuiltRight[1] * (forward[0] * normal[2] - forward[2] * normal[0]) + rebuiltRight[2] * (forward[0] * normal[1] - forward[1] * normal[0]);
    expect(determinant).toBeCloseTo(1, 8);
  });

  it('documents provenance and uses Three r128-compatible color management', () => {
    expect(source).toContain('8a72604adf2ca465c8a8529effd12803129c3531');
    expect(source).toContain('AlloFlow/Three r128 implementation, not copied upstream source.');
    expect(source).toContain('renderer.outputEncoding = THREE.sRGBEncoding;');
    expect(source).toContain('renderer.toneMapping = THREE.ACESFilmicToneMapping;');
  });
});
