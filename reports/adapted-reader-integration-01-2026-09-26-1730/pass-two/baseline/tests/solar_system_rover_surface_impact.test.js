import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_solarsystem.js', 'utf8');
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function makeImpactState() {
  return {
    envelope: 0,
    spring: 0,
    cooldown: 0,
    armed: false,
    triggerReady: true,
    count: 0,
    impact: 0,
  };
}

function stepImpact(state, { dt, risingRate, speed }) {
  state.cooldown = Math.max(0, state.cooldown - dt);
  state.envelope *= Math.exp(-8.5 * dt);
  state.spring += (state.envelope - state.spring) * (1 - Math.exp(-15 * dt));
  const motionRatio = Math.min(1, speed / 2.6);
  const demand = Math.max(0, risingRate - 0.55) * motionRatio * 0.75;
  if (demand <= 0.08) state.triggerReady = true;
  if (!state.armed) {
    state.armed = speed > 0.08;
  } else if (state.triggerReady && state.cooldown <= 0 && demand >= 0.18) {
    state.impact = clamp(demand, 0, 1);
    state.envelope = Math.max(state.envelope, state.impact);
    state.cooldown = 0.32;
    state.count += 1;
    state.triggerReady = false;
  }
  return demand;
}

function traverseSharpRim(hz) {
  const dt = 1 / hz;
  const speed = 2;
  const state = makeImpactState();
  let centerZ = 1.5;
  let previousTravel = 0;
  let contactReady = false;
  const heightAt = (z) => Math.max(0, 0.48 - Math.abs(z) * 1.6);
  for (let elapsed = 0; elapsed < 2; elapsed += dt) {
    centerZ -= speed * dt;
    const currentCenter = heightAt(centerZ);
    const frontContact = heightAt(centerZ - 0.58);
    const travel = clamp((frontContact - currentCenter) * 0.68, -0.11, 0.13);
    const risingRate = contactReady ? Math.max(0, travel - previousTravel) / dt : 0;
    previousTravel = travel;
    contactReady = true;
    stepImpact(state, { dt, risingRate, speed });
  }
  return state;
}

describe('solar rocky surface identity and impact feedback', () => {
  it('maps each rocky terrain to deterministic linear microdetail with a low-power POT gate', () => {
    expect(source).toContain("? 'regolith-pitted'");
    expect(source).toContain("? 'aeolian-rippled'");
    expect(source).toContain("? 'fractured-basalt'");
    expect(source).toContain("? 'crevassed-ice'");
    expect(source).toContain("var terrainMicroSize = rockySurfaceLowPower ? 128 : 256;");
    expect(source).toContain('terrainMicroContext.createImageData(terrainMicroSize, terrainMicroSize)');
    expect(source).toContain('terrainMicroContext.putImageData(terrainMicroImage, 0, 0);');
    expect(source).toContain('terrainMicroTex.wrapS = terrainMicroTex.wrapT = THREE.RepeatWrapping;');
    expect(source).toContain('terrainMicroTex.minFilter = THREE.LinearMipmapLinearFilter;');
    expect(source).toContain('Math.min(4, renderer.capabilities.getMaxAnisotropy())');
    expect(source).toContain('terrainTex.encoding = THREE.sRGBEncoding;');
    expect(source).toContain('map: terrainTex, bumpMap: terrainMicroTex, bumpScale: terrainBumpScale, roughness: 0.96');
    expect(source).not.toContain('roughnessMap: terrainMicroTex');
    expect(source).not.toContain('terrainMicroTex.encoding = THREE.sRGBEncoding');
  });

  it('uses one deterministic low-draw horizon outside every playable corner and inside the camera far range', () => {
    expect(source).toContain('var horizonSegments = rockySurfaceLowPower ? 64 : 96;');
    expect(source).toContain('var horizonInnerRadius = 234;');
    expect(source).toContain('var horizonOuterRadius = 262;');
    expect(source).toContain('new THREE.Mesh(rockyHorizonGeo, rockyHorizonMat)');
    expect(source).toContain('side: THREE.BackSide, depthWrite: false');
    const playableCornerRadius = Math.hypot(115, 115);
    expect(234 - playableCornerRadius).toBeGreaterThan(70);
    expect(262 + playableCornerRadius).toBeLessThan(500);
    const horizonBlock = source.slice(source.indexOf('var rockyHorizonMesh = null;'), source.indexOf('// Hide sun'));
    expect(horizonBlock.match(/new THREE\.Mesh\(/g)).toHaveLength(1);
    expect(horizonBlock).not.toContain('ConeGeometry');
  });

  it('arms on the first moving frame, ignores stationary compression, and uses cooldown plus hysteresis', () => {
    const parked = makeImpactState();
    for (let i = 0; i < 120; i++) stepImpact(parked, { dt: 1 / 60, risingRate: 20, speed: 0 });
    expect(parked.count).toBe(0);
    expect(parked.armed).toBe(false);

    const moving = makeImpactState();
    stepImpact(moving, { dt: 1 / 60, risingRate: 20, speed: 2 });
    expect(moving).toMatchObject({ armed: true, count: 0 });
    stepImpact(moving, { dt: 1 / 60, risingRate: 20, speed: 2 });
    expect(moving.count).toBe(1);
    for (let i = 0; i < 30; i++) stepImpact(moving, { dt: 1 / 60, risingRate: 20, speed: 2 });
    expect(moving.count).toBe(1);
    stepImpact(moving, { dt: 1 / 60, risingRate: 0, speed: 2 });
    stepImpact(moving, { dt: 1 / 60, risingRate: 20, speed: 2 });
    expect(moving.count).toBe(2);
    expect(moving.envelope).toBeGreaterThanOrEqual(0);
    expect(moving.envelope).toBeLessThanOrEqual(1);
  });

  it('detects a sharp terrain rim consistently at 20/60/120 Hz using same-time center/contact samples', () => {
    const outcomes = [20, 60, 120].map(traverseSharpRim);
    for (const outcome of outcomes) {
      expect(outcome.count).toBeGreaterThan(0);
      expect(outcome.count).toBeLessThanOrEqual(2);
      expect(Number.isFinite(outcome.spring)).toBe(true);
      expect(outcome.envelope).toBeGreaterThanOrEqual(0);
      expect(outcome.envelope).toBeLessThanOrEqual(1);
    }
    expect(Math.max(...outcomes.map((value) => value.count)) - Math.min(...outcomes.map((value) => value.count))).toBeLessThanOrEqual(1);
    expect(source).toContain('var currentRoverGround = _terrainHeightAt(playerPos.x, playerPos.z);');
    expect(source).toContain('var roverGround = isFinite(currentRoverGround) ? currentRoverGround : roverTerrainState.ground;');
    expect(source.indexOf('var currentRoverGround = _terrainHeightAt(playerPos.x, playerPos.z);'))
      .toBeLessThan(source.indexOf('var roverFrameCompressionRate = 0;'));
  });

  it('keeps impact state dt-based and reduced-motion independent while gating only camera presentation', () => {
    const decay = (hz) => {
      let value = 1;
      for (let i = 0; i < hz; i++) value *= Math.exp(-8.5 / hz);
      return value;
    };
    expect(decay(20)).toBeCloseTo(decay(60), 12);
    expect(decay(60)).toBeCloseTo(decay(120), 12);
    const impactBlock = source.slice(source.indexOf('function updateRoverImpactState'), source.indexOf('function updateRoverSoundButton'));
    expect(impactBlock).not.toContain('droneReduceMotion');
    expect(source).toContain('var roverImpactCameraJolt = droneReduceMotion ? 0 : roverDrive.impactEnvelope * 0.09;');
    expect(source.indexOf('camera.position.copy(chaseCameraPos);')).toBeLessThan(source.indexOf('camera.position.y += roverImpactCameraJolt;'));
  });

  it('couples one bounded state to suspension, dust, owned audio, and datasets without per-impact resources', () => {
    expect(source).toContain('roverGroup.position.y = roverVisualGround - roverDrive.impactSpring * 0.065;');
    expect(source).toContain('var impactWheelCompression = roverDrive.impactSpring');
    expect(source).toContain('roverDrive.dustCarry = Math.min(dustTrailCapacity, roverDrive.dustCarry + (dustDistanceEmission + roverDrive.impactDustBurst)');
    expect(source).toContain('var audioImpact = roverDrive.impactEnvelope;');
    expect(source).toContain('if (!roverSoundEnabled || !roverAudio) return;');
    expect(source).toContain('if (roverPageHidden) {');
    expect(source).toContain("canvasEl.dataset.roverImpact = '0.000';");
    expect(source).toContain("canvasEl.dataset.roverImpactCount = '0';");
    expect(source).toContain('if (!force && tick3d % 10 !== 0) return;');
    const impactBlock = source.slice(source.indexOf('function triggerRoverImpact'), source.indexOf('function updateRoverSoundButton'));
    expect(impactBlock).not.toMatch(/new THREE\.|createOscillator|createGain|createBuffer/);
  });

  it('suppresses discontinuities and explicitly disposes all fifth-pass resources and datasets', () => {
    expect(source).toContain('if (hitWorldEdge || roverDrive.actualDistance > 0.75)');
    expect(source).toContain('roverImpactFrameSuppressed = true;');
    expect(source).toContain('if (!roverImpactFrameSuppressed) updateRoverImpactState');
    expect(source).toContain('if (!isFluid && roverDrive.impactArmed) resetRoverImpactDetection();');
    expect(source).toContain('rockyHorizonGeo.dispose();');
    expect(source).toContain('rockyHorizonMat.dispose();');
    expect(source).toContain('terrainMicroTex.dispose();');
    expect(source).toContain('delete canvasEl.dataset.roverImpact;');
    expect(source).toContain('delete canvasEl.dataset.roverImpactCount;');
    expect(source).toContain('delete canvasEl.dataset.roverSurfaceProfile;');
    expect((source.match(/rockyHorizonGeo\.dispose\(\)/g) || [])).toHaveLength(1);
    expect((source.match(/terrainMicroTex\.dispose\(\)/g) || [])).toHaveLength(1);
  });
});
