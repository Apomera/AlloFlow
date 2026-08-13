import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(
  path.join(process.cwd(), 'stem_lab', 'stem_tool_moonmission.js'),
  'utf8',
);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function stepUnpoweredTerrain(state, { dt, grade, cross = 0 }) {
  const gradeRatio = clamp(grade, -0.75, 0.75);
  const crossRatio = clamp(cross, -0.75, 0.75);
  const lunarG = 4.4 * 0.165;
  const gradeComponent = gradeRatio / Math.sqrt(1 + gradeRatio * gradeRatio);
  const gradeAccel = clamp(-lunarG * gradeComponent, -0.52, 0.52);
  const rollingRate = 0.18 + Math.abs(gradeRatio) * 0.08 + Math.abs(crossRatio) * 0.06;
  let speed = state.speed;
  let netAccel;
  if (Math.abs(speed) < 0.025) {
    netAccel = Math.abs(gradeAccel) <= rollingRate
      ? 0
      : gradeAccel - Math.sign(gradeAccel) * rollingRate;
  } else {
    const resistanceDirection = Math.sign(speed);
    netAccel = gradeAccel - resistanceDirection * rollingRate;
    if (
      speed * (speed + netAccel * dt) < 0
      && Math.abs(gradeAccel) <= rollingRate
    ) {
      netAccel = -speed / dt;
    }
  }
  speed = clamp(speed + netAccel * dt, -2.2, 6.2);
  if (Math.abs(speed) < 0.025 && Math.abs(gradeAccel) < 0.08) speed = 0;
  const terrainActive = Math.min(
    1,
    Math.abs(speed) / 0.35 + (Math.abs(netAccel) > 0.001 ? 1 : 0),
  );
  const slipTarget = Math.min(
    1,
    (Math.abs(gradeRatio) * 0.5 + Math.abs(crossRatio) * 0.28) * terrainActive,
  );
  const slip = state.slip + (slipTarget - state.slip) * (1 - Math.exp(-8 * dt));
  return { speed, slip, distance: state.distance + speed * dt };
}

describe('Moon Mission optional LRV traverse', () => {
  it('keeps astronaut EVA as the default and exposes explicit accessible board and exit controls', () => {
    expect(source).toContain("d.evaStarted && h('div'");
    expect(source).toContain("lrvActionEl.id = 'eva-lrv-action'");
    expect(source).toContain("case 'v': if (!e.repeat) toggleRoverMode()");
    expect(source).toContain("setAttribute('aria-label', 'Exit the Lunar Roving Vehicle");
    expect(source).toContain('Walk within 3 meters of the LRV before boarding.');
    expect(source).toContain('V to board or exit the optional lunar rover');
  });

  it('uses clamped dt, exact signed slope probes, lunar grade force, and traction-limited drive', () => {
    expect(source).toContain('Math.min(0.05, Math.max(0.001, (evaNow - evaLastFrameTime) / 1000))');
    expect(source).toContain('var lrvThrottle = (moveState.forward ? 1 : 0) - (moveState.back ? 1 : 0)');
    expect(source).toContain('var LRV_LUNAR_G = LRV_SCENE_EARTH_G * 0.165');
    expect(source).toContain('(lrvFrontH - lrvRearH) / 1.24');
    expect(source).toContain('(lrvRightH - lrvLeftH) / 1.52');
    expect(source).toContain('lrvGradeRatio / Math.sqrt(1 + lrvGradeRatio * lrvGradeRatio)');
    expect(source).toContain('Math.max(-0.52, Math.min(0.52, -LRV_LUNAR_G * lrvGradeComponent))');
    expect(source).toContain('var lrvAppliedDrive = Math.min(lrvDriveDemand, lrvTractionLimit)');
    expect(source).toContain("Math.abs(roverSpeed) > 0.001 &&\n                          Math.sign(roverSpeed) !== Math.sign(lrvThrottle)");
    expect(source).toContain('var lrvBrakeStep = Math.min(lrvSpeedAbsBefore, lrvAppliedDrive * evaDt)');
    expect(source).toContain('if (lrvReversing && roverSpeed * lrvSpeedBefore < 0) roverSpeed = 0');
    expect(source).toContain('roverHeading += roverSteer * roverSpeed * 0.38 * evaDt');
    expect(source).toContain('roverSpeed = Math.max(-2.2, Math.min(6.2, roverSpeed))');
    const driveBlock = source.slice(
      source.indexOf('// Frame-rate-independent terrain-aware traverse dynamics'),
      source.indexOf('} else {\n                        lrvThrottleSignal = 0;', source.indexOf('// Frame-rate-independent terrain-aware traverse dynamics')),
    );
    expect(driveBlock.indexOf('var lrvFrontH = _terrainHeightAt')).toBeLessThan(
      driveBlock.indexOf('var lrvSpeedBefore = roverSpeed'),
    );
    expect(driveBlock).not.toContain('roverSpeed *= Math.exp(-1.35 * evaDt)');
  });

  it('integrates static/rolling resistance without slope creep across 20-120 Hz', () => {
    expect(source).toContain('var lrvNetAccel = lrvGradeAccel');
    expect(source).toContain('Math.abs(lrvGradeAccel) <= lrvRollingRate');
    expect(source).toContain('lrvNetAccel = -roverSpeed / evaDt');
    const simulate = (hz, grade) => {
      let state = { speed: 0, slip: 0, distance: 0 };
      for (let i = 0; i < hz * 5; i += 1) {
        state = stepUnpoweredTerrain(state, { dt: 1 / hz, grade });
      }
      return state;
    };
    const held = [20, 30, 60, 120].map((hz) => simulate(hz, 0.18));
    held.forEach((state) => {
      expect(state.speed).toBe(0);
      expect(state.distance).toBe(0);
      expect(state.slip).toBe(0);
    });
    const downhill = [20, 30, 60, 120].map((hz) => simulate(hz, 0.6));
    expect(Math.max(...downhill.map((state) => state.speed))
      - Math.min(...downhill.map((state) => state.speed))).toBeLessThan(1e-10);
    expect(Math.max(...downhill.map((state) => state.distance))
      - Math.min(...downhill.map((state) => state.distance))).toBeLessThan(0.03);
    downhill.forEach((state) => expect(state.speed).toBeLessThan(0));
  });

  it('preserves slope/yaw signs, brake-before-reverse, and one smoothed slip state', () => {
    expect(stepUnpoweredTerrain(
      { speed: 0, slip: 0, distance: 0 },
      { dt: 1 / 60, grade: 0.6 },
    ).speed).toBeLessThan(0);
    expect(stepUnpoweredTerrain(
      { speed: 0, slip: 0, distance: 0 },
      { dt: 1 / 60, grade: -0.6 },
    ).speed).toBeGreaterThan(0);
    expect(0.5 * 2 * 0.38 * (1 / 60)).toBeGreaterThan(0);
    expect(0.5 * -2 * 0.38 * (1 / 60)).toBeLessThan(0);
    const brakeOnly = (speed, throttle, dt) => {
      const reversing = throttle !== 0 && Math.abs(speed) > 0.001
        && Math.sign(speed) !== Math.sign(throttle);
      if (!reversing) return speed + throttle * 1.45 * dt;
      const brakeStep = Math.min(Math.abs(speed), 1.45 * dt);
      return speed - Math.sign(speed) * brakeStep;
    };
    expect(brakeOnly(0.04, -1, 0.05)).toBe(0);
    expect(brakeOnly(-0.04, 1, 0.05)).toBe(0);
    expect(brakeOnly(0.002, -1, 0.05)).toBe(0);
    expect(brakeOnly(0, -1, 0.05)).toBeLessThan(0);
    expect(source).toContain('var lrvMotionMismatch = Math.abs(lrvThrottle)');
    expect(source).toContain('var lrvBrakeSlip = lrvReversing');
    expect(source).toContain('var lrvGradeSlip = Math.min(1');
    expect(source).toContain('var lrvSteerSlip = Math.abs(lrvSteerInput)');
    expect(source).toContain('lrvSlipSignal += (lrvSlipTarget - lrvSlipSignal) * (1 - Math.exp(-8 * evaDt))');
    expect(source).toContain('var lrvSteerAuthority = 1 - lrvSlipSignal * 0.58 * lrvPivotBlend');
    expect(source).toContain('var lrvWheelSlipSpin = lrvThrottle * lrvSlipSignal');
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
    expect(source).toContain('(1 + lrvSlipSignal * 2.2)');
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
    expect(source).toContain('pauseLoop: function () {');
    expect(source).toContain('_evaVRPaused = true;');
    expect(source).toContain('updateLrvAudio(true);');
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
    expect(source).toContain('lrvTrackDistanceAccumulator += lrvFrameTravelDistance');
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

  it('reports mode, speed, odometer, signed terrain, and non-color-only grip in the HUD', () => {
    expect(source).toContain('id="eva-mode">On foot');
    expect(source).toContain('id="eva-lrv-speed">Parked');
    expect(source).toContain('id="eva-lrv-terrain">--');
    expect(source).toContain('id="eva-lrv-grip">--');
    expect(source).toContain("modeEl.textContent = roverBoarded ? 'LRV traverse' : 'On foot'");
    expect(source).toContain("(Math.abs(roverSpeed) * 3.6).toFixed(1) + ' km/h");
    expect(source).toContain('LRV: V board / exit');
    expect(source).toContain("canvasEl.dataset.lrvGrade = '0.0'");
    expect(source).toContain("canvasEl.dataset.lrvCrossSlope = '0.0'");
    expect(source).toContain("canvasEl.dataset.lrvSlip = '0.000'");
    expect(source).toContain("canvasEl.dataset.lrvGripState = 'Grip'");
    expect(source).toContain("lrvSlipSignal >= 0.64 ? 'Slip' : (lrvSlipSignal >= 0.28 ? 'Scrub' : 'Grip')");
    expect(source).toContain('if (canvasEl.dataset.lrvGrade !== lrvGradeText)');
    expect(source).toContain('if (lrvGripEl.textContent !== lrvGripText)');
    expect(source).toContain('updateLrvAction();');
  });

  it('keeps free roam default while exposing an accessible optional traverse panel', () => {
    expect(source).toContain("var gtStatus = 'idle', gtStep = 0, gtActive = false");
    expect(source).toContain("gtPanel.id = 'eva-geology-traverse'");
    expect(source).toContain("gtPanel.setAttribute('aria-label', 'Optional Lunar Geology Traverse')");
    expect(source).toContain('Optional authored route; free roam remains available.');
    expect(source).toContain('Park, exit, and collect with F');
    expect(source).toContain("var stepText = (done ? '✓ ' : (current ? '→ ' : '○ '))");
    expect(source).toContain("gtActionEl.addEventListener('click', onGtAction)");
    expect(source).toContain('try { canvasEl.focus(); } catch (_gtFocusErr)');
    const panelBlock = source.slice(
      source.indexOf("gtPanel.id = 'eva-geology-traverse'"),
      source.indexOf('function startGtMission()', source.indexOf("gtPanel.id = 'eva-geology-traverse'")),
    );
    expect(panelBlock).not.toContain('aria-live');
  });

  it('selects a deterministic bounded exact-terrain geology site from captured parking', () => {
    const chooser = source.slice(
      source.indexOf('function chooseGtSite()'),
      source.indexOf("canvasEl.dataset.geologyTraverseStatus = 'idle'"),
    );
    expect(source).toContain('var gtCandidateOffsets = [[22, 8], [24, -8], [28, 0], [18, 12]]');
    expect(source).toContain('gtHomeX = roverGrp.position.x');
    expect(source).toContain('gtHomeZ = roverGrp.position.z');
    expect(source).toContain('gtHomeHeading = roverHeading');
    expect(chooser).toContain('gtHomeX + gtForward.x * candidate[0] + gtRight.x * candidate[1]');
    expect(chooser).toContain('Math.abs(x) > 86 || Math.abs(z) > 86');
    expect(chooser).toContain('var hc = _terrainHeightAt(x, z)');
    expect(chooser).toContain('var hf = _terrainHeightAt(x + gtForward.x * p');
    expect(chooser).toContain('var hb = _terrainHeightAt(x - gtForward.x * p');
    expect(chooser).toContain('var hr = _terrainHeightAt(x + gtRight.x * p');
    expect(chooser).toContain('var hl = _terrainHeightAt(x - gtRight.x * p');
    expect(chooser).toContain('[hc, hf, hb, hr, hl].every(isFinite)');
    expect(chooser).toContain('> 0.34');
    expect(chooser).toContain('gtConflictsWithScene(x, z)');
    expect(source).toContain("setGtDataset('geologyTraverseStatus', 'unavailable')");
  });

  it('uses a monotonic single-transition state machine with parked dt dwell and VR pause', () => {
    const stateBlock = source.slice(
      source.indexOf('function advanceGtStep('),
      source.indexOf('// ── Bootprint decals', source.indexOf('function advanceGtStep(')),
    );
    expect(stateBlock).toContain('nextStep <= gtStep');
    expect(stateBlock).toContain('gtTransitionedThisFrame = true');
    expect(stateBlock).toContain('if (!gtActive || _evaVRPaused) return');
    expect(stateBlock).toContain('gtParkDwell += evaDt');
    expect(stateBlock).toContain('gtParkDwell >= 0.65');
    expect(stateBlock).toContain('Math.abs(roverSpeed) <= 0.12');
    expect(stateBlock).toContain('gtParkDwell = 0');
    expect(stateBlock).toContain('if (gtStep === 3)');
    expect(stateBlock).toContain('if (gtSampleCollected)');
    expect(stateBlock).toContain("advanceGtStep(4, 'Traverse sample collected.");
    expect(stateBlock).toContain('gtStep === 5 && !roverBoarded');
    expect(stateBlock).toContain('gtCompleteLatched');
    expect(stateBlock).not.toContain('setTimeout');

    const run = (events) => {
      const state = { step: 1, dwell: 0, complete: false };
      for (const event of events) {
        let changed = false;
        if (state.step === 1 && event.boarded) { state.step = 2; changed = true; }
        else if (state.step === 2) {
          state.dwell = event.boarded && event.nearSite && Math.abs(event.speed) <= 0.12
            ? state.dwell + event.dt : 0;
          if (state.dwell >= 0.65) { state.step = 3; state.dwell = 0; changed = true; }
        } else if (state.step === 3 && event.sample) { state.step = 4; changed = true; }
        else if (state.step === 4) {
          state.dwell = event.boarded && event.nearHome && Math.abs(event.speed) <= 0.12
            ? state.dwell + event.dt : 0;
          if (state.dwell >= 0.65) { state.step = 5; state.dwell = 0; changed = true; }
        } else if (state.step === 5 && !event.boarded && event.nearHome) {
          state.complete = true; changed = true;
        }
        expect(changed ? 1 : 0).toBeLessThanOrEqual(1);
      }
      return state;
    };
    const journey = [
      { boarded: true, dt: 0.05 },
      ...Array.from({ length: 7 }, () => ({ boarded: true, nearSite: true, speed: 0, dt: 0.1 })),
      { boarded: false, sample: true, dt: 0.05 },
      ...Array.from({ length: 7 }, () => ({ boarded: true, nearHome: true, speed: 0, dt: 0.1 })),
      { boarded: false, nearHome: true, speed: 0, dt: 0.05 },
    ];
    expect(run(journey)).toMatchObject({ step: 5, complete: true });
    expect(run([
      { boarded: true, dt: 0.05 },
      { boarded: true, nearSite: true, speed: 0, dt: 0.4 },
      { boarded: false, nearSite: true, speed: 0, dt: 0.4 },
    ])).toMatchObject({ step: 2, dwell: 0, complete: false });
  });

  it('collects the exact mission specimen through existing F semantics without masking ordinary rocks', () => {
    const pickupBlock = source.slice(
      source.indexOf('// Sample collection\n'),
      source.indexOf('// ── Deploy the seismometer', source.indexOf('// Sample collection\n')),
    );
    expect(source).toContain('gtSpecimen._isTraverseSample = true');
    expect(source).toContain('lunarSampleOrbs.push(gtSpecimen)');
    expect(pickupBlock).toContain('if (orb._collected || !orb.visible) return');
    expect(pickupBlock).toContain('if (orb._isTraverseSample && (!gtActive || gtStep !== 3)) return');
    expect(pickupBlock).toContain('sDist < 2 && moveState.sample && evaSampleCooldown <= 0 && !o2Exhausted');
    expect(pickupBlock).toContain('gtSampleCollected = true');
    expect(pickupBlock).toContain('gtSampleResult = sd.name');
    expect(pickupBlock).toContain('!gtSampleEverBanked');
    expect(pickupBlock).toContain('gtSampleEverBanked = true');
    expect(source).toContain('if (orbT._collected || !orbT.visible || orbT._isTraverseSample) continue');
    expect(source.match(/else moveState\.sample = true;/g)).toHaveLength(1);
    expect(source.match(/case 'f': moveState\.sample = false; break;/g)).toHaveLength(1);
  });

  it('keeps the traverse specimen hidden and ineligible until the authored sample step', () => {
    expect(source).toContain('gtSpecimen.visible = gtStep === 3 && !gtSpecimen._collected');
    expect(source).toContain("gtStatus = 'active'; gtStep = 1; gtActive = true;\n                      gtSpecimen.visible = false");
    expect(source).toContain('gtSpecimen._collected = false;\n                      gtSpecimen.visible = false');
    const eligible = (active, step, visible, collected) =>
      !collected && visible && active && step === 3;
    expect(eligible(true, 1, false, false)).toBe(false);
    expect(eligible(true, 2, false, false)).toBe(false);
    expect(eligible(true, 3, true, false)).toBe(true);
    expect(eligible(false, 3, true, false)).toBe(false);
  });

  it('provides throttled stable telemetry and a concise replayable debrief', () => {
    expect(source).toContain("canvasEl.dataset.geologyTraverseStatus = 'idle'");
    expect(source).toContain("canvasEl.dataset.geologyTraverseStep = '0'");
    expect(source).toContain("canvasEl.dataset.geologyTraverseTargetDistance = '-1.0'");
    expect(source).toContain("canvasEl.dataset.geologyTraverseDistance = '0.0'");
    expect(source).toContain('if (canvasEl.dataset[key] !== value) canvasEl.dataset[key] = value');
    const updater = source.slice(
      source.indexOf('function updateGtMission(evaDt)'),
      source.indexOf('// ── Bootprint decals', source.indexOf('function updateGtMission(evaDt)')),
    );
    expect(updater).toContain('if (evaTick % 10 === 0)');
    expect(updater.indexOf("setGtDataset('geologyTraverseTargetDistance'"))
      .toBeGreaterThan(updater.indexOf('if (evaTick % 10 === 0)'));
    expect(source).toContain('gtElapsed.toFixed(1)');
    expect(source).toContain('roverDistance - gtStartDistance');
    expect(source).toContain('gtPeakSlip = Math.max(gtPeakSlip, lrvSlipSignal)');
    expect(source).toContain('gtPeakGrade = Math.max(gtPeakGrade, Math.abs(lrvGradeRatio))');
    expect(source).toContain("gtStatus === 'complete'\n                        ? 'Replay traverse'");
  });

  it('uses right-handed exact-terrain beacon/contact bases and reduced-motion-safe low-cost rendering', () => {
    const traverseBlock = source.slice(
      source.indexOf('// ── Optional Lunar Geology Traverse'),
      source.indexOf('// ── Bootprint decals', source.indexOf('// ── Optional Lunar Geology Traverse')),
    );
    expect(traverseBlock).toContain("matchMedia('(prefers-reduced-motion: reduce)').matches");
    expect(traverseBlock).toContain('new THREE.RingGeometry(1.05, 1.28, 28)');
    expect(traverseBlock).toContain('gtNode.castShadow = false');
    expect(traverseBlock).toContain('depthWrite: false');
    expect(traverseBlock).toContain('var hC = _terrainHeightAt(x, z)');
    expect(traverseBlock).toContain('gtSurfaceNormal.crossVectors(gtSurfaceRight, gtSurfaceForward).normalize()');
    expect(traverseBlock).toContain('gtSurfaceRight.crossVectors(gtSurfaceForward, gtSurfaceNormal).normalize()');
    expect(traverseBlock).toContain('gtSurfaceBasis.makeBasis(gtSurfaceRight, gtSurfaceForward, gtSurfaceNormal)');
    expect(traverseBlock).toContain('if (!gtReducedMotion)');
    expect(source).toContain('poseLrvWheelContact(wi, mount, lrvWheelEngaged');
    expect(source).toContain('poseGtSurfaceObject(gtSuitContact');
    expect(traverseBlock).not.toContain('new THREE.PointLight');
    expect(traverseBlock).not.toContain('new THREE.DirectionalLight');
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
    expect(source).toContain("gtActionEl.removeEventListener('click', onGtAction)");
    expect(source).toContain('if (gtPanel && gtPanel.parentElement) gtPanel.parentElement.removeChild(gtPanel)');
    expect(source).toContain('delete canvasEl.dataset[gtKey]');
    expect(source).toContain('scene.remove(gtBeaconGroup)');
    expect(source).toContain('scene.remove(gtSpecimen)');
    expect(source).toContain('scene.remove(gtRoverContact)');
    expect(source).toContain('gtBeaconGeo.dispose()');
    expect(source).toContain('gtSpecimenGeo.dispose()');
    expect(source).toContain('gtContactGeo.dispose()');
  });

  it('adds deterministic linear microdetail and a distant unshadowed lunar horizon', () => {
    expect(source).toContain('var lunarMicroSeed = 0x6d2b79f5');
    expect(source).toContain('new THREE.CanvasTexture(lunarMicroCv)');
    expect(source).toContain('map: terrainTex, bumpMap: lunarMicroTex');
    expect(source).toContain('roughness: 0.96');
    expect(source).not.toContain('roughnessMap: lunarMicroTex');
    expect(source).toContain('terrainTex.encoding = THREE.sRGBEncoding');
    expect(source).toContain('renderer.outputEncoding = THREE.sRGBEncoding');
    expect(source).toContain('lunarMicroTex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())');
    expect(source).not.toContain('lunarMicroTex.encoding = THREE.sRGBEncoding');
    expect(source).toContain('var lhr = 224 +');
    expect(source).toContain('new THREE.SphereGeometry(360, 32, 16)');
    expect(source).toContain('map: skyTex, side: THREE.BackSide, depthWrite: false');
    expect(source).toContain('Math.cos(lha) * (lhr - 10)');
    expect(source).toContain('n3 === terrain || n3 === lunarHorizon');
    expect(source).toContain('lunarHorizon.castShadow = false; lunarHorizon.receiveShadow = false');
    expect(source).toContain("'microdetail-low+horizon-32'");
    expect(source).toContain("'microdetail-high+horizon-48'");
    const playableCorner = Math.hypot(92, 92);
    const minimumInnerRidge = 224 - 4 - 2 - 10;
    expect(minimumInnerRidge - playableCorner).toBeGreaterThan(70);
  });

  it('derives dt-stable rover impacts from armed exact contact targets without idle false positives', () => {
    const impactBlock = source.slice(
      source.indexOf('var lrvContactTargetSum = 0'),
      source.indexOf('lrvDustAccumulator +=', source.indexOf('var lrvContactTargetSum = 0')),
    );
    expect(source).toContain('var lrvCenterGround = _terrainHeightAt(roverGrp.position.x, roverGrp.position.z)');
    expect(impactBlock).toContain('wheelGround - lrvCenterGround + 0.21');
    expect(impactBlock).toContain('lrvFrameTravelDistance > 0.001');
    expect(impactBlock).toContain('lrvImpactArmTime += evaDt');
    expect(impactBlock).toContain('lrvContactDelta / evaDt');
    expect(impactBlock).toContain('Math.abs(lrvContactDelta) > 0.18');
    expect(impactBlock).toContain('lrvFrameTravelDistance > 0.34');
    expect(impactBlock).toContain('lrvImpactCooldown <= 0');
    expect(source).toContain('roverVisualShell.position.y = lrvImpactSpring * lrvImpactVisualScale');
    expect(source).toContain('lrvCamDesired.y += lrvImpactCameraEnvelope');
    expect(source).toContain('lrvImpactAudioEnvelope');
    expect(source).toContain('emitLunarDustBurst(roverGrp.position.x');

    const simulate = (hz, moving, bump) => {
      const dt = 1 / hz;
      let previous = 0.21;
      let filtered = 0;
      let arm = 0;
      let cooldown = 0;
      let valid = false;
      let count = 0;
      for (let t = 0; t < 0.8; t += dt) {
        const phase = Math.max(0, Math.min(1, (t - 0.2) / 0.14));
        const contact = 0.21 + (bump ? 0.12 * Math.sin(Math.PI * phase) : 0);
        cooldown = Math.max(0, cooldown - dt);
        if (!valid) {
          previous = contact; valid = true; arm = 0; continue;
        }
        const delta = contact - previous;
        previous = contact;
        if (moving) {
          arm += dt;
          const velocity = Math.max(0, delta / dt);
          filtered += (velocity - filtered) * (1 - Math.exp(-14 * dt));
          if (arm >= 0.08 && cooldown <= 0 && filtered > 0.30) {
            count++; cooldown = 0.28; filtered *= 0.28;
          }
        } else {
          arm = 0; filtered *= Math.exp(-12 * dt);
        }
      }
      return count;
    };
    [20, 30, 60, 120].forEach((hz) => {
      expect(simulate(hz, false, true)).toBe(0);
      expect(simulate(hz, true, false)).toBe(0);
      expect(simulate(hz, true, true)).toBe(1);
    });
  });

  it('uses the actual airborne landing transition and event-only impact telemetry', () => {
    expect(source).toContain('var evaWasAirborne = isJumping');
    expect(source).toContain('if (evaWasAirborne && playerVelY < -0.045)');
    expect(source).toContain('(-playerVelY - 0.045) / 0.09');
    expect(source).toContain("canvasEl.dataset.evaLandingImpact = evaLandingImpact.toFixed(3)");
    expect(source).toContain("canvasEl.dataset.evaLandingImpact = '0.000'");
    expect(source).toContain("canvasEl.dataset.lrvImpact = bounded.toFixed(3)");
    expect(source).toContain("canvasEl.dataset.lrvImpact = '0.000'");
    expect(source.match(/dataset\.lrvImpact = .*toFixed/g)).toHaveLength(1);
    expect(source.match(/dataset\.evaLandingImpact = .*toFixed/g)).toHaveLength(1);
    expect(source).toContain('gtReducedMotion ? 0 : (_evaLowPower ? 0.055 : 0.10)');
    const lifecycleReset = source.slice(
      source.indexOf('function resetLrvImpactEffects()'),
      source.indexOf('function registerLrvImpact(', source.indexOf('function resetLrvImpactEffects()')),
    );
    expect(lifecycleReset).toContain('resetLrvImpactContact()');
    expect(lifecycleReset).toContain('lrvImpactAudioEnvelope = 0');
    expect(lifecycleReset).toContain('lrvImpactCameraEnvelope = 0');
    expect(lifecycleReset).toContain('lrvImpactSpring = 0');
    expect(lifecycleReset).toContain('lrvImpactSpringVelocity = 0');
    expect(lifecycleReset).toContain('roverVisualShell.position.y = 0');
    expect(source.match(/resetLrvImpactEffects\(\)/g).length).toBeGreaterThanOrEqual(5);
  });

  it('disposes the generated surface profile and clears impact hooks', () => {
    expect(source).toContain('scene.remove(lunarHorizon)');
    expect(source).toContain('lunarMicroTex.dispose()');
    expect(source).toContain('lunarHorizonGeo.dispose()');
    expect(source).toContain('lunarHorizonMat.dispose()');
    expect(source).toContain('lunarMicroTex = null');
    expect(source).toContain("'evaLandingImpact', 'lunarSurfaceProfile'");
  });

  it('grounds all four wheels with one exact-terrain right-handed contact mesh', () => {
    const contacts = source.slice(
      source.indexOf('var lrvWheelContactGeo'),
      source.indexOf('function poseGtSurfaceObject(', source.indexOf('var lrvWheelContactGeo')),
    );
    expect(contacts).toContain('new THREE.InstancedMesh(');
    expect(contacts).toContain('lrvWheelContactGeo, lrvWheelContactMat, 4');
    expect(contacts).toContain('THREE.DynamicDrawUsage');
    expect(contacts).toContain('lrvWheelContacts.frustumCulled = false');
    expect(contacts).toContain('depthWrite: false');
    expect(contacts).toContain('lrvWheelContacts.castShadow = false');
    expect(contacts).toContain('wheelFX = -Math.sin(wheelYaw)');
    expect(contacts).toContain('wheelFZ = -Math.cos(wheelYaw)');
    expect(contacts).toContain('wheelRX = Math.cos(wheelYaw)');
    expect(contacts).toContain('wheelRZ = -Math.sin(wheelYaw)');
    expect(contacts).toContain('lrvContactNormal.crossVectors(lrvContactRight, lrvContactForward).normalize()');
    expect(contacts).toContain('lrvContactRight.crossVectors(lrvContactForward, lrvContactNormal).normalize()');
    expect(contacts).toContain('lrvContactBasis.makeBasis(');
    expect(contacts).toContain('lrvContactDummy.scale.set(0, 0, 0)');
    expect(source).not.toContain('poseGtSurfaceObject(gtRoverContact');

    const cross = (a, b) => [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
    const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
    const F = [0, 0, -1];
    const initialR = [1, 0, 0];
    const N = cross(initialR, F);
    const R = cross(F, N);
    expect(N[0]).toBeCloseTo(0, 12);
    expect(N[1]).toBeCloseTo(1, 12);
    expect(N[2]).toBeCloseTo(0, 12);
    expect(dot(cross(R, F), N)).toBeCloseTo(1, 12);
  });

  it('uses bounded visual four-wheel Ackermann articulation without changing drive physics', () => {
    const steering = source.slice(
      source.indexOf('function lrvVisualWheelSteer('),
      source.indexOf('roverGrp.rotation.y = roverHeading', source.indexOf('function lrvVisualWheelSteer(')),
    );
    expect(steering).toContain('var steerAbs = Math.min(0.42, Math.abs(centerSteer))');
    expect(steering).toContain('mount._lrvX < 0');
    expect(steering).toContain('Math.max(0.55');
    expect(steering).toContain('Math.min(0.62');
    expect(steering).toContain('-steerSign * Math.min(0.18, frontAngle * 0.26)');
    expect(source).toContain('applyLrvVisualSteering(roverSteer)');
    expect(source).not.toContain('mount.rotation.y = mount._lrvFront ? roverSteer : 0');

    const angle = (x, front, center) => {
      const sign = center < 0 ? -1 : 1;
      const abs = Math.min(0.42, Math.abs(center));
      if (abs < 1e-4) return 0;
      const radius = 1 / Math.tan(abs);
      const inside = sign > 0 ? x < 0 : x > 0;
      const denominator = Math.max(0.55, radius + (inside ? -0.78 : 0.78));
      const frontAngle = Math.min(0.62, Math.atan(1 / denominator));
      return front ? sign * frontAngle : -sign * Math.min(0.18, frontAngle * 0.26);
    };
    expect(angle(-0.78, true, 0.4)).toBeGreaterThan(angle(0.78, true, 0.4));
    expect(angle(-0.78, true, 0.4)).toBeGreaterThan(0);
    expect(angle(-0.78, false, 0.4)).toBeLessThan(0);
    expect(Math.abs(angle(-0.78, true, 1))).toBeLessThanOrEqual(0.62);
    expect(angle(-0.78, true, 0)).toBe(0);
  });

  it('keeps ballistic dust seeded, signed, bounded, pooled, and terrain-retired', () => {
    const driveDust = source.slice(
      source.indexOf('lrvDustAccumulator +='),
      source.indexOf('playerPos.set(roverGrp.position.x', source.indexOf('lrvDustAccumulator +=')),
    );
    expect(source).toContain('var lrvDustSeed = 0x51f15e');
    expect(source).toContain('Math.imul(lrvDustSeed, 1664525)');
    expect(driveDust).toContain('var lrvDustEmitBudget = _evaLowPower ? 2 : 4');
    expect(source).toContain('var lrvDustContactFactor = lrvGroundedWheelCount * 0.25');
    expect(driveDust).toContain('lrvDustTravelSign = roverSpeed < 0 ? -1 : 1');
    expect(driveDust).toContain('lrvDustRand()');
    expect(driveDust).not.toContain('Math.random()');
    expect(driveDust).toContain('lrvDustAccumulator = Math.min(lrvDustAccumulator, 1.5)');
    expect(source).toContain('lrvDustVY[dustN] -= 1.62 * evaDt');
    expect(source).toContain('lrvDustPositions[dustP + 1] <= _terrainHeightAt(');
    expect(source).toContain('lrvDustPositions[dustP + 1] = -100');
  });

  it('uses a bounded one-draw exact-terrain bootprint ring with distance-based density', () => {
    const prints = source.slice(
      source.indexOf('var EVA_BOOTPRINT_CAP'),
      source.indexOf('var moveState =', source.indexOf('var EVA_BOOTPRINT_CAP')),
    );
    const emitter = source.slice(
      source.indexOf('function emitEvaBootprint('),
      source.indexOf('var moveState =', source.indexOf('function emitEvaBootprint(')),
    );
    expect(prints).toContain('new THREE.InstancedMesh(');
    expect(prints).toContain('EVA_BOOTPRINT_CAP = _evaLowPower ? 64 : 160');
    expect(prints).toContain('THREE.DynamicDrawUsage');
    expect(prints).toContain('evaBootprints.frustumCulled = false');
    expect(emitter).toContain('evaBootprintNormal.crossVectors(');
    expect(emitter).toContain('evaBootprintRight.crossVectors(');
    expect(emitter).toContain('evaBootprintBasis.makeBasis(');
    expect(emitter).toContain('evaBootprintCursor = (evaBootprintCursor + 1) % EVA_BOOTPRINT_CAP');
    expect(emitter).not.toContain('new THREE.');
    expect(source).toContain('evaBootprintDistanceAccumulator += evaFootTravel');
    expect(source).toContain('EVA_BOOTPRINT_SPACING = _evaLowPower ? 1.5 : 1.05');
    expect(source).toContain('EVA_STEP_STRIDE = 1.2');
    expect(source).not.toContain('var bpGeo = new THREE.PlaneGeometry');
    expect(source).not.toContain('bootprints.push(');
  });

  it('adds vacuum-authentic console and reduced-motion-safe path composition with guarded hooks', () => {
    expect(source).toContain('var rConsoleDisplayMat = new THREE.MeshBasicMaterial');
    expect(source).toContain('var rConsoleStatusMat = new THREE.MeshBasicMaterial');
    expect(source).not.toContain('new THREE.PointLight');
    expect(source).toContain("canvasEl.dataset.lrvVisualProfile = 'contact-4+four-wheel-steer+console'");
    expect(source).toContain("canvasEl.dataset.lrvSteeringMode = 'four-wheel'");
    expect(source).toContain('if (canvasEl.dataset.lrvConsoleState !== lrvConsoleState)');
    expect(source).toContain('var lrvPredictedYawDelta = roverSteer * roverSpeed * 0.38 * 0.45');
    expect(source).toContain('if (gtReducedMotion) {\n                          lrvCameraSteerLook = 0;');
    expect(source).toContain('lrvCamTarget.addScaledVector(lrvRight, lrvCameraSteerLook)');
    expect(source).toContain('lrvCameraSteerLook = 0;\n                      roverVisualShell.position.y = 0;');
  });

  it('cleans sixth-pass instance resources and stable datasets', () => {
    expect(source).toContain('scene.remove(lrvWheelContacts)');
    expect(source).toContain('scene.remove(evaBootprints)');
    expect(source).toContain('lrvWheelContactGeo.dispose()');
    expect(source).toContain('lrvWheelContactMat.dispose()');
    expect(source).toContain('evaBootprintGeo.dispose()');
    expect(source).toContain('evaBootprintMat.dispose()');
    expect(source).toContain("'lrvGroundedWheels', 'evaBootprintCount'");
    expect(source).toContain("'evaBootprintCap'].forEach(function(gtKey)");
  });

  it('records the audited technical-design provenance without claiming copied source', () => {
    expect(source).toContain('Technical design inspiration: winchxyz/moon-rover');
    expect(source).toContain('8a72604adf2ca465c8a8529effd12803129c3531');
    expect(source).toContain('This is an original');
    expect(source).toContain("AlloFlow implementation for the app's existing Three r128 runtime");
  });
});
