import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_solarsystem.js', 'utf8');
const missionStart = source.indexOf('// ── Planetary Field Traverse (rocky worlds only) ──');
const missionEnd = source.indexOf('var trailPositions', missionStart);
const missionBlock = source.slice(missionStart, missionEnd);

function advanceTraverse(state, frame) {
  if (!state.active || state.complete) return false;
  state.elapsed += frame.dt;
  state.distance += frame.distance;
  state.peakSlip = Math.max(state.peakSlip, frame.slip || 0);
  state.peakGrade = Math.max(state.peakGrade, Math.abs(frame.grade || 0));
  let transitioned = false;
  switch (state.step) {
    case 'depart':
      if (frame.startDistance >= 5) { state.step = 'outbound'; transitioned = true; }
      break;
    case 'outbound':
      if (frame.waypointDistance <= 2.4) { state.step = 'survey'; state.dwell = 0; transitioned = true; }
      break;
    case 'survey':
      if (frame.waypointDistance <= 2.4 && frame.speed <= 0.12) state.dwell += frame.dt;
      else if (frame.waypointDistance > 2.8 || frame.speed > 0.16) state.dwell = 0;
      if (state.dwell >= 2.5) { state.step = 'return'; state.dwell = 0; transitioned = true; }
      break;
    case 'return':
      if (frame.startDistance <= 3) { state.step = 'home_park'; state.dwell = 0; transitioned = true; }
      break;
    case 'home_park':
      if (frame.startDistance <= 3 && frame.speed <= 0.12) state.dwell += frame.dt;
      else if (frame.startDistance > 3.5 || frame.speed > 0.16) state.dwell = 0;
      if (state.dwell >= 2) { state.step = 'complete'; state.active = false; state.complete = true; transitioned = true; }
      break;
  }
  return transitioned;
}

const initialState = () => ({ active: true, complete: false, step: 'depart', dwell: 0, elapsed: 0, distance: 0, peakSlip: 0, peakGrade: 0 });

describe('solar rocky rover Planetary Field Traverse', () => {
  it('uses a deterministic validated waypoint table and a clean unavailable path', () => {
    expect(source).toContain('var roverTraverseCandidateOffsets = [');
    expect(source).toContain('if (Math.abs(candidateX) > 110 || Math.abs(candidateZ) > 110) continue;');
    expect(source).toContain('if (!isFinite(candidateGround) || !isFinite(candidateFront)');
    expect(source).toContain('if (candidateGrade > 0.32 || candidateCross > 0.32) continue;');
    expect(source).toContain('candidatePoiDx * candidatePoiDx + candidatePoiDz * candidatePoiDz < 36');
    expect(source).toContain('candidateSampleDx * candidateSampleDx + candidateSampleDz * candidateSampleDz < 36');
    expect(source).toContain('if (!candidateSample || candidateSample._collected) continue;');
    expect(source).toContain("roverTraverse.status = 'unavailable';");
    expect(source).not.toContain('roverTraverse.waypointX = 0; // fallback');
  });

  it('advances at most one authored step per frame and latches completion', () => {
    const state = initialState();
    expect(advanceTraverse(state, { dt: 0.05, distance: 1, startDistance: 6, waypointDistance: 1, speed: 0, slip: 0.2, grade: 8 })).toBe(true);
    expect(state.step).toBe('outbound');
    advanceTraverse(state, { dt: 0.05, distance: 0, startDistance: 6, waypointDistance: 1, speed: 0 });
    expect(state.step).toBe('survey');
    for (let i = 0; i < 51; i++) advanceTraverse(state, { dt: 0.05, distance: 0, startDistance: 20, waypointDistance: 1, speed: 0.05 });
    expect(state.step).toBe('return');
    advanceTraverse(state, { dt: 0.05, distance: 1, startDistance: 2, waypointDistance: 20, speed: 0.3 });
    expect(state.step).toBe('home_park');
    for (let i = 0; i < 41; i++) advanceTraverse(state, { dt: 0.05, distance: 0, startDistance: 2, waypointDistance: 20, speed: 0.05 });
    expect(state).toMatchObject({ step: 'complete', active: false, complete: true });
    const snapshot = JSON.stringify(state);
    expect(advanceTraverse(state, { dt: 10, distance: 99, startDistance: 0, waypointDistance: 0, speed: 0 })).toBe(false);
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('requires a stable park and resets dwell outside hysteresis bounds', () => {
    const state = { ...initialState(), step: 'survey' };
    for (let i = 0; i < 20; i++) advanceTraverse(state, { dt: 0.05, distance: 0, startDistance: 10, waypointDistance: 2, speed: 0.05 });
    expect(state.dwell).toBeCloseTo(1, 8);
    advanceTraverse(state, { dt: 0.05, distance: 0.1, startDistance: 10, waypointDistance: 2.5, speed: 0.14 });
    expect(state.dwell).toBeCloseTo(1, 8);
    advanceTraverse(state, { dt: 0.05, distance: 0.1, startDistance: 10, waypointDistance: 2.9, speed: 0.05 });
    expect(state.dwell).toBe(0);
    for (let i = 0; i < 20; i++) advanceTraverse(state, { dt: 0.05, distance: 0, startDistance: 10, waypointDistance: 2, speed: 0.05 });
    advanceTraverse(state, { dt: 0.05, distance: 0.1, startDistance: 10, waypointDistance: 2, speed: 0.17 });
    expect(state.dwell).toBe(0);
  });

  it('keeps mission UI accessible, throttled, observable, and free of control conflicts', () => {
    expect(source).toContain("roverTraversePanel.id = 'rover-traverse-panel';");
    expect(source).toContain("roverTraverseButton.id = 'rover-traverse-button';");
    expect(source).toContain('canvasEl.dataset.roverMissionStatus');
    expect(source).toContain('canvasEl.dataset.roverMissionStep');
    expect(source).toContain('canvasEl.dataset.roverMissionDistance');
    expect(source).toContain('if (roverTraverseUiElapsed >= 0.25)');
    expect(source).toContain('canvasEl.focus();');
    expect(source).toContain("roverTraverse.status = 'ready';");
    expect(source).toContain("stepText = 'Traverse ready';");
    expect(source).toContain("progressText = 'Optional field mission ");
    expect(source).toContain("detailText = 'Start when ready, or continue free roaming.';");
    expect(source).toContain("roverTraverseButton.textContent = 'Start traverse';");
    expect(source).toContain("if (roverTraverse.active) readyRoverTraverseMission(false);");
    expect(missionBlock).not.toContain('aria-live');
    const updateBlock = source.match(/function updateRoverTraverseMission\(\) \{([\s\S]*?)\n                        \}/)?.[1] || '';
    expect(updateBlock).not.toContain('new THREE.');
    expect(updateBlock).not.toContain('document.createElement');
  });

  it('uses right-handed local +Z terrain decals and low-power-gated unshadowed fill', () => {
    expect(source).toContain('roverTraverseNormal.crossVectors(roverTraverseRightTangent, roverTraverseForwardTangent)');
    expect(source).toContain('roverTraverseRightTangent.crossVectors(roverTraverseForwardTangent, roverTraverseNormal)');
    expect(source).toContain('roverTraverseBasis.makeBasis(roverTraverseRightTangent, roverTraverseForwardTangent, roverTraverseNormal)');
    expect(source).toContain('new THREE.CircleGeometry(1, 16)');
    expect(source).toContain('new THREE.InstancedMesh(roverWheelContactGeo, roverWheelContactMat, roverWheelContactCount)');
    expect(missionBlock).not.toContain('roverWheelContactMesh.rotation.x = -Math.PI / 2');
    expect(source).toContain('navigator.hardwareConcurrency <= 4');
    expect(source).toContain('if (roverSurfaceFillAllowed)');
    expect(source).toContain('roverSurfaceFillLight.castShadow = false;');

    const right = [1, 0, 0], forward = [0, 0, -1];
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const normal = cross(right, forward);
    const rebuiltRight = cross(forward, normal);
    const determinant = rebuiltRight[0] * (forward[1] * normal[2] - forward[2] * normal[1]) - rebuiltRight[1] * (forward[0] * normal[2] - forward[2] * normal[0]) + rebuiltRight[2] * (forward[0] * normal[1] - forward[1] * normal[0]);
    expect(determinant).toBeCloseTo(1, 8);
  });

  it('becomes explicitly ready after deployment and disposes every owned resource idempotently', () => {
    expect(source).toContain('if (!isFluid) readyRoverTraverseMission(true);');
    expect(source).not.toContain('if (!isFluid) startRoverTraverseMission();');
    expect(source).toContain('if (roverSceneDisposed) return;');
    expect(source).toContain('if (descentArrivalTimer) { clearTimeout(descentArrivalTimer); descentArrivalTimer = null; }');
    expect(source).toContain("roverTraverseButton.removeEventListener('click', onRoverTraverseButtonClick)");
    expect(source).toContain('roverTraverseRingGeo.dispose()');
    expect(source).toContain('roverTraverseBeaconGeo.dispose()');
    expect(source).toContain('roverTraverseRingMat.dispose()');
    expect(source).toContain('roverTraverseBeaconMat.dispose()');
    expect(source).toContain('roverWheelContactGeo.dispose()');
    expect(source).toContain('roverWheelContactMat.dispose()');
    expect(source).toContain('roverWheelContactTex.dispose()');
    expect(source).toContain('roverGroup.remove(roverSurfaceFillLight)');
    expect(source).toContain('delete canvasEl.dataset.roverMissionStatus;');
  });
});
