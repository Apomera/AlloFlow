import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_solarsystem.js', 'utf8');

describe('solar system rocky rover dynamics', () => {
  it('integrates drive velocity with a clamped animation delta', () => {
    expect(source).toContain('function animate3dV2(frameMs)');
    expect(source).toContain('Math.max(0, Math.min(0.05, (safeFrameMs - droneLastFrameMs) / 1000))');
    expect(source).toContain('roverDrive.speed = approachRoverValue(roverDrive.speed, targetSpeed, driveRate * droneFrameDt);');
    expect(source).toContain('playerPos.addScaledVector(roverDrive.velocity, droneFrameDt);');
  });

  it('times the deployment cinematic by elapsed seconds rather than rendered frames', () => {
    expect(source).toContain('var _descentDurationSec = 3;');
    expect(source).toContain('(safeFrameMs - _descentStartedAtMs) / 1000');
    expect(source).not.toContain('var _descentDuration = 180;');
  });

  it('keeps fluid movement separate from the rocky traction model', () => {
    expect(source).toContain('Preserve the established six-axis probe/submersible controls.');
    expect(source).toContain('var targetSpeed = throttleInput > 0 ? roverDrive.maxForward');
    expect(source).toContain('Math.sign(roverDrive.speed) !== Math.sign(targetSpeed) ? roverDrive.brake : roverDrive.acceleration;');
    expect(source).toContain('yaw += roverDrive.steering * roverDrive.turnRate * pivotAuthority * droneFrameDt;');
  });

  it('articulates all six rocky wheels from local terrain samples', () => {
    const positions = source.match(/var wheelPositions = \[([\s\S]*?)\n\s*\];/);
    expect(positions).toBeTruthy();
    expect(positions[1].match(/\[[-\d.]+,\s*[-\d.]+,\s*[-\d.]+\]/g)).toHaveLength(6);
    expect(source).toContain('rockyWheelRigs.push({');
    expect(source).toContain('var wheelGround = _terrainHeightAt(wheelWorldX, wheelWorldZ);');
    expect(source).toContain('wheelRigData.spin += roverDrive.speed * droneFrameDt / 0.15;');
  });

  it('aligns the local negative-Z nose and wheel contacts with drive heading', () => {
    expect(source).toContain('var targetRoverYaw = yaw;');
    expect(source).toContain('var vehicleRotY = yaw;');
    expect(source).toContain('var targetRoverPitch = Math.max(-0.22, Math.min(0.22, (frontH - backH) * 0.10));');
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
  });

  it('couples dust and telemetry to actual speed rather than held keys', () => {
    expect(source).toContain('var roverMotionRatio = Math.min(1, Math.abs(roverDrive.speed) / roverDrive.maxForward);');
    expect(source).toContain('dustTrailLife[dti2] - droneFrameDt * 0.9');
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
    expect(source).toContain('roverTrackDistanceCarry += Math.abs(roverDrive.speed) * droneFrameDt;');
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
