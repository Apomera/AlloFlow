import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(
  path.join(process.cwd(), 'stem_lab', 'stem_tool_moonmission.js'),
  'utf8',
);

describe('Moon Mission optional LRV traverse', () => {
  it('keeps astronaut EVA as the default and exposes explicit accessible board and exit controls', () => {
    expect(source).toContain("d.evaStarted && h('div'");
    expect(source).toContain("lrvActionEl.id = 'eva-lrv-action'");
    expect(source).toContain("case 'v': if (!e.repeat) toggleRoverMode()");
    expect(source).toContain("setAttribute('aria-label', 'Exit the Lunar Roving Vehicle");
    expect(source).toContain('Walk within 3 meters of the LRV before boarding.');
    expect(source).toContain('V to board or exit the optional lunar rover');
  });

  it('uses clamped delta time for acceleration, braking, steering, and rolling drag', () => {
    expect(source).toContain('Math.min(0.05, Math.max(0.001, (evaNow - evaLastFrameTime) / 1000))');
    expect(source).toContain('var lrvThrottle = (moveState.forward ? 1 : 0) - (moveState.back ? 1 : 0)');
    expect(source).toContain('roverSpeed += lrvThrottle * lrvAccel * evaDt');
    expect(source).toContain('roverSpeed *= Math.exp(-1.35 * evaDt)');
    expect(source).toContain('roverHeading += roverSteer * roverSpeed * 0.38 * evaDt');
    expect(source).toContain('roverSpeed = Math.max(-2.2, Math.min(6.2, roverSpeed))');
  });

  it('keeps local -Z forward, local +X right, exit side, and roll aligned with Three rotation', () => {
    expect(source.match(/lrvForward\.set\(-Math\.sin\(roverHeading\), 0, -Math\.cos\(roverHeading\)\)/g))
      .toHaveLength(2);
    expect(source.match(/lrvRight\.set\(Math\.cos\(roverHeading\), 0, -Math\.sin\(roverHeading\)\)/g))
      .toHaveLength(2);
    expect(source).toContain('var exitZ = roverGrp.position.z + Math.sin(roverHeading) * 1.45');
    expect(source).toContain('Math.atan2(lrvRightH - lrvLeftH, 1.52) - roverGrp.rotation.z');
    expect(source).not.toContain('lrvForward.set(Math.sin(roverHeading)');
    expect(source).not.toContain('lrvRight.set(Math.cos(roverHeading), 0, Math.sin(roverHeading))');
  });

  it('terrain-follows with independent wheel suspension and a damped chase camera', () => {
    expect(source).toContain('var lrvFrontH = _terrainHeightAt');
    expect(source).toContain('var lrvRightH = _terrainHeightAt');
    expect(source).toContain('mount.position.y += (suspensionY - mount.position.y) * lrvBodyEase');
    expect(source).toContain('roverWheelMeshes[wi].rotation.x = roverWheelSpin');
    expect(source).toContain('lrvCamDesired.copy(roverGrp.position)');
    expect(source).toContain('camera.position.lerp(lrvCamDesired');
    expect(source).toContain('_terrainHeightAt(lrvCamDesired.x, lrvCamDesired.z) + 0.65');
  });

  it('uses a shared analytic vertex generator and exact allocation-free mesh interpolation for hot probes', () => {
    expect(source).toContain('var _lunarTerrainHeightAt = function(worldX, worldZ)');
    expect(source).toContain('tPos[vi + 2] = _lunarTerrainHeightAt(px, -py)');
    expect(source).toContain('var _lunarTerrainGrid = new Float32Array(101 * 101)');
    expect(source).toContain('_lunarTerrainGrid[vi / 3] = tPos[vi + 2]');
    const runtimeSampler = source.match(
      /var _terrainHeightAt = function\(x, z\) \{[\s\S]*?\n\s*\};/,
    )?.[0];
    expect(runtimeSampler).toBeTruthy();
    expect(runtimeSampler).toContain("typeof x !== 'number' || typeof z !== 'number'");
    expect(runtimeSampler).toContain('!isFinite(x) || !isFinite(z)');
    expect(runtimeSampler).toContain('var gridX = (x + 100) * 0.5, gridZ = (z + 100) * 0.5');
    expect(runtimeSampler).toContain('var cellX = Math.min(99, Math.floor(gridX))');
    expect(runtimeSampler).toContain('var hA = _lunarTerrainGrid[row0]');
    expect(runtimeSampler).toContain('var hB = _lunarTerrainGrid[row1]');
    expect(runtimeSampler).toContain('var hC = _lunarTerrainGrid[row1 + 1]');
    expect(runtimeSampler).toContain('var hD = _lunarTerrainGrid[row0 + 1]');
    expect(runtimeSampler).toContain('if (u + v <= 1) return hA + v * (hB - hA) + u * (hD - hA)');
    expect(runtimeSampler).toContain('return hC + (1 - u) * (hB - hC) + (1 - v) * (hD - hC)');
    expect(runtimeSampler).not.toContain('return _lunarTerrainHeightAt(x, z)');
    expect(runtimeSampler).not.toContain('Raycaster');
    expect(runtimeSampler).not.toContain('new THREE.Vector3');
    expect(source).not.toContain('var _terrainRay = new THREE.Raycaster()');
    expect(source).toContain('[15, -20, 10], [-25, 15, 7], [40, 30, 12], [-10, -35, 5], [30, 40, 8]');
  });

  it('orbits the chase camera independently and does not let an occupied rover mask landmarks', () => {
    expect(source).toContain('var lrvCameraYawOffset = 0, lrvCameraPitchOffset = 0');
    expect(source).toContain('if (roverBoarded) {\n                        lrvCameraYawOffset = Math.max(-1.25');
    expect(source).toContain('-Math.sin(roverHeading + lrvCameraYawOffset)');
    expect(source).toContain('-Math.cos(roverHeading + lrvCameraYawOffset)');
    expect(source).toContain('.addScaledVector(lrvCameraForward, -lrvCameraDistance)');
    expect(source).toContain('Math.sin(lrvCameraPitchOffset) * lrvCameraDistance');
    expect(source).toContain('if (!roverBoarded && clickToMove && e.button === 0)');
    expect(source).toContain('_terrainHeightAt(camera.position.x, camera.position.z) + 0.75');
    expect(source).toContain('if (!roverBoarded) landmarks.push(');
  });

  it('adds bounded ballistic dust and keeps geology an on-foot activity', () => {
    expect(source).toContain('var LRV_DUST_COUNT = _evaLowPower ? 18 : 42');
    expect(source).toContain('var lrvDustLife = new Float32Array(LRV_DUST_COUNT)');
    expect(source).toContain('lrvDustVY[dustN] -= 1.62 * evaDt');
    expect(source).toContain('Samples are an on-foot EVA activity.');
    expect(source).toContain('if (!roverBoarded && dir.length() > 0.01');
  });

  it('keeps drive sonification opt-in, gesture-created, stateful, and honest about lunar vacuum', () => {
    const audioBlock = source.slice(
      source.indexOf('// ── Optional LRV drive sonification'),
      source.indexOf('function onEvaKeyDown', source.indexOf('// ── Optional LRV drive sonification')),
    );
    expect(audioBlock).toContain("lrvSoundEl.id = 'eva-lrv-sound'");
    expect(audioBlock).toContain("lrvSoundEl.setAttribute('aria-keyshortcuts', 'B')");
    expect(audioBlock).toContain("lrvSoundEl.setAttribute('aria-pressed', lrvAudioEnabled ? 'true' : 'false')");
    expect(audioBlock).toContain("canvasEl.dataset.lrvSound = 'off'");
    expect(audioBlock).toContain("canvasEl.dataset.lrvAudioLevel = '0.000'");
    expect(audioBlock).toContain('var ac = getMMAC(); // explicit gesture path only; never called by RAF');
    expect(audioBlock).toContain('Sonified speed and wheel slip; lunar vacuum carries no airborne sound.');
    expect(audioBlock).not.toContain('new AudioContext');
    expect(audioBlock).not.toContain('new window.AudioContext');
    expect(audioBlock).not.toContain('.close()');
    expect(audioBlock).not.toContain('.suspend()');
    expect(source).toContain("case 'b': if (!e.repeat) toggleLrvAudio()");
  });

  it('couples existing audio nodes to drive state and mutes only its master across gates', () => {
    const updateBlock = source.slice(
      source.indexOf('function updateLrvAudio(forceSilent)'),
      source.indexOf('function shutdownLrvAudio()', source.indexOf('function updateLrvAudio(forceSilent)')),
    );
    expect(updateBlock).toContain('Math.abs(roverSpeed) / 6.2');
    expect(updateBlock).toContain('Math.abs(lrvThrottleSignal)');
    expect(updateBlock).toContain('lrvSlipSignal');
    expect(updateBlock).toContain('roverBoarded');
    expect(updateBlock).toContain('!_evaVRPaused');
    expect(updateBlock).toContain('!document.hidden');
    expect(updateBlock).toContain('setLrvAudioParam(lrvAudioMotor.frequency');
    expect(updateBlock).toContain('setLrvAudioParam(lrvAudioTractionGain.gain');
    expect(updateBlock).toContain('setLrvAudioParam(lrvAudioMaster.gain, audible ? 0.045 : 0');
    expect(updateBlock).toContain('if (!audible) {');
    expect(updateBlock).toContain('if (lrvAudioMaster && lrvAudioOutputAudible)');
    expect(updateBlock).toContain("canvasEl.dataset.lrvAudioLevel !== '0.000'");
    expect(updateBlock).toContain('lrvAudioOutputAudible = false;\n                        return;');
    expect(updateBlock).not.toContain('createOscillator');
    expect(updateBlock).not.toContain('createBufferSource');
    expect(source).toContain('pauseLoop: function () { _evaVRPaused = true; updateLrvAudio(true); }');
    expect(source).toContain("document.addEventListener('visibilitychange', onLrvVisibilityChange)");
  });

  it('uses a bounded one-draw-call paired track ring with exact terrain and no emit allocation', () => {
    const trackBlock = source.slice(
      source.indexOf('// ── Bounded paired LRV wheel tracks'),
      source.indexOf('// ── Sample collection orbs', source.indexOf('// ── Bounded paired LRV wheel tracks')),
    );
    const emitBlock = trackBlock.match(
      /function emitLrvTrackPair\(\) \{[\s\S]*?\n\s*\}/,
    )?.[0] || '';
    expect(trackBlock).toContain('var LRV_TRACK_CAP = _evaLowPower ? 48 : 96');
    expect(trackBlock).toContain('new THREE.InstancedMesh(lrvTrackGeo, lrvTrackMat, LRV_TRACK_CAP)');
    expect(trackBlock).toContain('lrvTrackDummy.scale.set(0, 0, 0)');
    expect(trackBlock).toContain("canvasEl.dataset.lrvTrackCount = '0'");
    expect(trackBlock).toContain('canvasEl.dataset.lrvTrackCap = String(LRV_TRACK_CAP)');
    expect(trackBlock).toContain('depthWrite: false');
    expect(emitBlock).toContain('_terrainHeightAt(trackX, trackZ) + 0.018');
    expect(emitBlock).toContain('lrvTrackCursor = (lrvTrackCursor + 1) % LRV_TRACK_CAP');
    expect(emitBlock).not.toContain('new THREE.');
    expect(source).toContain('lrvTrackDistanceAccumulator += lrvTravelDistance');
    expect(source).toContain('while (lrvTrackDistanceAccumulator >= LRV_TRACK_SPACING)');
  });

  it('builds normalized, positive-determinant track bases with the rover forward/right signs', () => {
    expect(source).toContain('lrvTrackUp.crossVectors(lrvTrackRightAxis, lrvTrackTangent).normalize()');
    expect(source).toContain('lrvTrackRightAxis.crossVectors(lrvTrackTangent, lrvTrackUp).normalize()');
    expect(source).toContain('lrvTrackBasis.makeBasis(lrvTrackRightAxis, lrvTrackTangent, lrvTrackUp)');
    expect(source).toContain('lrvTrackQuaternion.setFromRotationMatrix(lrvTrackBasis).normalize()');
    const cross = (a, b) => [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    for (const heading of [-Math.PI, -1.2, 0, 0.7, Math.PI]) {
      const tangent = [-Math.sin(heading), 0, -Math.cos(heading)];
      const right = [Math.cos(heading), 0, -Math.sin(heading)];
      const up = cross(right, tangent);
      const determinant = dot(right, cross(tangent, up));
      expect(determinant).toBeCloseTo(1, 12);
      expect(Math.hypot(...up)).toBeCloseTo(1, 12);
    }
  });

  it('reports mode, speed, odometer, and controls in the HUD', () => {
    expect(source).toContain('id="eva-mode">On foot');
    expect(source).toContain('id="eva-lrv-speed">Parked');
    expect(source).toContain("modeEl.textContent = roverBoarded ? 'LRV traverse' : 'On foot'");
    expect(source).toContain("(Math.abs(roverSpeed) * 3.6).toFixed(1) + ' km/h");
    expect(source).toContain('LRV: V board / exit');
    expect(source).toContain('updateLrvAction();');
  });

  it('removes added DOM, input listeners, and GPU resources at EVA teardown', () => {
    expect(source).toContain('var evaAlive = true');
    expect(source).toContain('evaRaf = requestAnimationFrame(animateEva)');
    expect(source).toContain('if (!evaAlive) return');
    expect(source).toContain('if (evaRaf) { cancelAnimationFrame(evaRaf); evaRaf = 0; }');
    expect(source).toContain('canvasEl._evaCleanup = null');
    expect(source).toContain("canvasEl.removeEventListener('keydown', onEvaKeyDown)");
    expect(source).toContain("canvasEl.removeEventListener('keyup', onEvaKeyUp)");
    expect(source).toContain("canvasEl.removeEventListener('mousedown', onEvaMouseDown)");
    expect(source).toContain("lrvActionEl.removeEventListener('click', onLrvAction)");
    expect(source).toContain("lrvSoundEl.removeEventListener('click', onLrvSoundAction)");
    expect(source).toContain("document.removeEventListener('visibilitychange', onLrvVisibilityChange)");
    expect(source).toContain('shutdownLrvAudio()');
    expect(source).toContain('scene.remove(lrvTracks)');
    expect(source).toContain('lrvTrackGeo.dispose()');
    expect(source).toContain('lrvTrackMat.dispose()');
    expect(source).toContain('roverGrp.traverse(function(lrvNode)');
    expect(source).toContain('lrvNode.geometry.dispose()');
    expect(source).toContain('lrvMat.dispose()');
    expect(source).toContain('lrvDustGeo.dispose()');
    expect(source).toContain('lrvDustMat.dispose()');
  });

  it('records the audited technical-design provenance without claiming copied source', () => {
    expect(source).toContain('Technical design inspiration: winchxyz/moon-rover');
    expect(source).toContain('8a72604adf2ca465c8a8529effd12803129c3531');
    expect(source).toContain('This is an original');
    expect(source).toContain("AlloFlow implementation for the app's existing Three r128 runtime");
  });
});
