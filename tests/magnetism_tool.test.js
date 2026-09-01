import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { resetStemLab, loadTool, React } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const ReactDOMServer = require(resolve(MODULES_DIR, 'react-dom/server'));
const { act } = React;

// The root tool and its deploy mirror must stay byte-identical in behaviour.
const TOOL_PATHS = [
  'stem_lab/stem_tool_magnetism.js',
  'desktop/web-app/public/stem_lab/stem_tool_magnetism.js',
];

// Pure physics helpers come straight from module.exports (the guard lets the
// file be require()'d with no StemLab host present).
const physics = require(resolve(process.cwd(), 'stem_lab/stem_tool_magnetism.js'));

// jsdom shims: no rAF (the motor spin loop must never advance in tests).
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};

const noop = () => {};
function mountCtx(toolData, setToolData) {
  return {
    React, toolData, setToolData,
    addToast: noop, announceToSR: noop, awardXP: noop,
    callGemini: null, aiHintsEnabled: false, gradeLevel: '7th Grade',
    t: (k, f) => (f != null ? f : k),
  };
}

// Stateful mount mirroring the StemPluginBridge: the tool seeds its bucket on
// first render, then renders its real body. `seed` pre-positions state.
function mountWithSeed(cfg, seed) {
  function Harness() {
    const [toolData, setToolData] = React.useState(seed ? { magnetism: seed } : {});
    return cfg.render(mountCtx(toolData, setToolData));
  }
  // Seeded snapshot assertions do not need a live client root. Static rendering
  // avoids retaining detached React fibers across this large regression file;
  // mountLive remains the path for all interaction and state-transition tests.
  if (seed) {
    return ReactDOMServer.renderToStaticMarkup(React.createElement(Harness)).replace(/<!-- -->/g, '');
  }
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  try {
    act(() => { root.render(React.createElement(Harness)); });
    return host.innerHTML;
  } finally {
    try { act(() => root.unmount()); } catch (_) {}
    host.remove();
  }
}

function requiredAuditTarget(host, selector) {
  const target = host.querySelector(selector);
  if (!target) throw new Error('Expected an Axe audit target matching ' + selector + '.');
  return target;
}

function active3DAuditTarget(host) {
  const canvas = requiredAuditTarget(host, 'canvas[role="img"]');
  const region = canvas.closest('[role="region"]');
  if (!region) throw new Error('Expected the active 3D canvas to belong to a labeled region.');
  return region;
}

const AXE_OPTIONS = Object.freeze({
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
  rules: { 'color-contrast': { enabled: false } },
  resultTypes: ['violations'],
});

function mountLive(cfg, seed) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState(seed ? { magnetism: seed } : {});
    return cfg.render(mountCtx(toolData, setToolData));
  }
  act(() => { root.render(React.createElement(Harness)); });
  return {
    host,
    unmount() {
      try { act(() => root.unmount()); } catch (_) {}
      host.remove();
    },
  };
}

const BASE = {
  tab: 'field',
  magnets: [{ x: -70, y: 0, angle: 0, polarity: 1 }],
  compass: { x: 90, y: 90 }, filings: false, compassMoved: false,
  sawAttract: false, sawRepel: false,
  fieldView: '2d', fieldMapProbe: { x: 90, y: 0 }, fieldMapPath: 'axial', fieldMapStrength: 1, fieldMapNoise: 0, fieldMapSamples: [], fieldMapUsed: false,
  turns: 20, current: 2, currentDir: 1, windingDir: 1, core: false, coilTouched: false,
  motorCurrent: 3, motorField: 4, motorLoad: 0.35, motorLoadPrediction: 1, motorLoadSamples: [], motorLoadTrialStarted: false, motorCurrentDir: 1, motorFieldDir: 1, motorRunning: false, motorAngle: 90, motorRan: false, motorMode: 'forces',
  motorView: '2d', motor3dStatus: 'loading', motor3dAttempt: 0, motor3dUsed: false, motor3dForces: true, motor3dCurrent: true,
  forceLabCurrent: 3, forceLabField: 4, forceLabAngle: 45, forceLabLength: 5, forceLabSpeed: 300, forceLabCurrentDir: 1, forceLabFieldDir: 1, forceLabUsed: false,
  analyzerE: 6, analyzerSelectorB: 3, analyzerSpeed: 2, analyzerB: 4, analyzerSpecies: 'deuteron', analyzerShowAll: true, analyzerUsed: false,
  chargeSign: 1, chargeField: 1, chargeSpeed: 5, chargeB: 4, chargeView: '2d',
  chargeTilt: 45, chargeMass: 1, chargeFieldModel: 'uniform', chargeMirrorRatio: 3, charge3dStatus: 'loading', charge3dAttempt: 0, charge3dUsed: false, charge3dProgress: 0, charge3dRunning: false, charge3dTrail: true, charge3dReference: null,
  benchLoadOhms: 40, benchFriction: 3, benchTurns: 80, benchField: 4, benchUsed: false,
  benchView: 'steady', benchRunning: false, benchTime: 0, benchOmega: 0, benchTemperature: 22,
  benchTrace: [], benchTrials: [], benchTrialCount: 0, benchMissionStatus: 'ready', benchCompareTrialId: null,
  induceMode: 'hand', genAngle: 0, genTurns: 60, genField: 4, genRPM: 60,
  learningMode: 'guided', missionId: 'power_path', missionStarted: false, missionSeen: false, notebookOpen: false, notebookPrediction: '', notebookClaim: '', notebookTrials: [],
  earthSeen: false, declination: 12, earthSolarWind: 5,
  earthView: '2d', earth3dStatus: 'loading', earth3dAttempt: 0, earth3dUsed: false,
  earth3dFieldLines: true, earth3dBoundary: true, earth3dBelts: true, earth3dWind: true, earth3dReference: true, earth3dMotion: false,
  eddyMaterial: 'copper', eddyThickness: 4, eddySlit: false, eddySpeed: 6, eddyField: 6,
  quizIdx: 0, quizScore: 0, quizPicked: null, quizDone: false, quizBest: 0,
  factIdx: 0, askInput: '', askAnswer: '', askLoading: false,
};

describe('magnetism tool — registration + structure', () => {
  it('registers id "magnetism" with seventeen quest hooks and ten tabs', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain("window.StemLab.registerTool('magnetism'");
      expect(source).toContain('questHooks');
      ['field', 'electro', 'motor', 'induce', 'materials', 'crane', 'maze', 'transformer', 'earth', 'quiz'].forEach((tabId) => {
        expect(source).toContain("id: '" + tabId + "'");
      });
      ['mag_field', 'mag_pair', 'mag_force_bench', 'mag_electro', 'mag_direction', 'mag_motor', 'mag_motor_direction', 'mag_lorentz', 'mag_earth', 'mag_induce', 'mag_generator_phase', 'mag_materials', 'mag_crane', 'mag_domains', 'mag_maze', 'mag_investigator', 'mag_quiz'].forEach((q) => {
        expect(source).toContain("id: '" + q + "'");
      });
      // host-guarded registration (does not early-return the whole module)
      expect(source).toContain('if (_hasHost) window.StemLab.registerTool');
    });
  });

  it('the deploy mirror is byte-identical to the root tool', () => {
    const a = readFileSync(TOOL_PATHS[0]);
    const b = readFileSync(TOOL_PATHS[1]);
    expect(a.equals(b)).toBe(true);
  });
});

describe('magnetism tool — real physics', () => {
  it('solenoid field is linear in turns and current (B = μ₀·(N/L)·I)', () => {
    const b1 = physics.solenoidField(20, 2, 0.1, 1);
    expect(physics.solenoidField(40, 2, 0.1, 1) / b1).toBeCloseTo(2, 6); // 2× turns
    expect(physics.solenoidField(20, 4, 0.1, 1) / b1).toBeCloseTo(2, 6); // 2× current
    expect(physics.solenoidField(20, 0, 0.1, 1)).toBe(0);                // no current → no field
    // exact against the closed form
    expect(b1).toBeCloseTo(physics.MU0 * (20 / 0.1) * 2, 12);
  });

  it('an iron core multiplies the field by its permeability factor', () => {
    const air = physics.solenoidField(20, 2, 0.1, 1);
    const iron = physics.solenoidField(20, 2, 0.1, 600);
    expect(iron / air).toBeCloseTo(600, 6);
  });

  it('wire force obeys F = B·I·L', () => {
    expect(physics.wireForce(0.5, 3, 0.05)).toBeCloseTo(0.075, 9);
    expect(physics.wireForce(0, 3, 0.05)).toBe(0);
  });

  it('motor torque follows angle and reverses with either current or field', () => {
    expect(physics.motorTorqueFactor(3, 4, 0, 1, 1)).toBeCloseTo(0, 12);
    expect(physics.motorTorqueFactor(3, 4, 90, 1, 1)).toBeCloseTo(12, 12);
    expect(physics.motorTorqueFactor(3, 4, 90, -1, 1)).toBeCloseTo(-12, 12);
    expect(physics.motorTorqueFactor(3, 4, 90, 1, -1)).toBeCloseTo(-12, 12);
    expect(physics.motorTorqueFactor(3, 4, 90, -1, -1)).toBeCloseTo(12, 12);
  });

  it('reports magnetic torque margin against shaft load', () => {
    const maximum = physics.motorLoadState(3, 4, 90, 0.5);
    const edge = physics.motorLoadState(3, 4, 30, 0.5);
    const stalled = physics.motorLoadState(3, 4, 20, 0.5);
    const free = physics.motorLoadState(3, 4, 90, 0);
    expect(maximum.magneticTorque).toBeCloseTo(1, 9);
    expect(maximum.margin).toBeCloseTo(0.5, 9);
    expect(maximum.stalled).toBe(false);
    expect(edge.stalled).toBe(false);
    expect(stalled.stalled).toBe(true);
    expect(free.ratio).toBe(Infinity);
  });
  it('brackets a predicted stall threshold from passing and stalled samples', () => {
    const trial = physics.motorLoadTrialState([
      { load: 0.75, margin: 0.25, stalled: false },
      { load: 1.25, margin: -0.25, stalled: true },
    ], 1);
    expect(trial).toMatchObject({ count: 2, passingMax: 0.75, stalledMin: 1.25, bracketed: true });
    expect(trial.observed).toBeCloseTo(1, 9);
    expect(trial.delta).toBeCloseTo(0, 9);
  });
  it('couples generator load to shaft speed while conserving the energy ledger', () => {
    const heavy = physics.motorGeneratorBench(3, 4, 10, 3, 80, 4);
    const balanced = physics.motorGeneratorBench(3, 4, 40, 3, 80, 4);
    const light = physics.motorGeneratorBench(3, 4, 160, 3, 80, 4);
    expect(heavy.rpm).toBeLessThan(balanced.rpm);
    expect(balanced.rpm).toBeLessThan(light.rpm);
    [heavy, balanced, light].forEach((run) => {
      expect(run.inputPower).toBeCloseTo(run.outputPower + run.losses, 9);
      expect(run.outputPower).toBeGreaterThanOrEqual(0);
      expect(run.efficiency).toBeGreaterThanOrEqual(0);
      expect(run.efficiency).toBeLessThanOrEqual(1);
    });
  });

  it('motor-generator friction slows the shaft and zero current stops the system', () => {
    const lowFriction = physics.motorGeneratorBench(3, 4, 40, 0, 80, 4);
    const highFriction = physics.motorGeneratorBench(3, 4, 40, 10, 80, 4);
    const off = physics.motorGeneratorBench(0, 4, 40, 3, 80, 4);
    expect(highFriction.rpm).toBeLessThan(lowFriction.rpm);
    expect(off.rpm).toBe(0);
    expect(off.generatedVoltage).toBe(0);
    expect(off.outputPower).toBe(0);
    expect(off.losses).toBe(0);
  });
  it('models back EMF, inertia, heat, and instantaneous energy conservation', () => {
    const controls = { current: 3, motorField: 4, loadOhms: 40, friction: 3, turns: 80, generatorField: 4 };
    const start = physics.motorGeneratorTransientStep({ time: 0, omega: 0, temperature: 22 }, controls, 0.1);
    const fast = physics.motorGeneratorTransientStep({ time: 0, omega: 80, temperature: 22 }, controls, 0.1);
    expect(start.omega).toBeGreaterThan(0);
    expect(fast.backEMF).toBeGreaterThan(start.backEMF);
    expect(fast.inputCurrent).toBeLessThan(start.inputCurrent);
    expect(start.temperature).toBeGreaterThan(22);
    [start, fast].forEach((sample) => {
      expect(sample.inputPower).toBeCloseTo(sample.outputPower + sample.losses + sample.kineticPower, 9);
    });
  });

  it('turns the transient bench into a constrained design mission', () => {
    function run(loadOhms) {
      const controls = { current: 3, motorField: 4, loadOhms, friction: 3, turns: 80, generatorField: 4 };
      return physics.evaluateMotorGeneratorMission(physics.motorGeneratorSimulate(controls, 10, 0.1));
    }
    const heavy = run(10);
    const balanced = run(40);
    const light = run(160);
    expect(heavy.pass).toBe(false);
    expect(balanced.pass).toBe(true);
    expect(light.pass).toBe(false);
    expect(heavy.rpm).toBeLessThan(balanced.rpm);
    expect(light.voltage).toBeGreaterThan(balanced.voltage);
    expect(light.power).toBeLessThan(balanced.power);
    expect(balanced.checks).toEqual([true, true, true, true]);
  });

  it('keeps the 3D motor commutator, force pair, and torque direction physically linked', () => {
    const dead = physics.motorSpatialState(0, 3, 4, 1, 1);
    const maximum = physics.motorSpatialState(90, 3, 4, 1, 1);
    const commutated = physics.motorSpatialState(180, 3, 4, 1, 1);
    const reversed = physics.motorSpatialState(90, 3, 4, -1, 1);
    expect(dead).toMatchObject({ halfTurn: 1, commutatorPhase: 1, deadSpot: true, torquePercent: 0 });
    expect(maximum.deadSpot).toBe(false);
    expect(maximum.torquePercent).toBeCloseTo(25, 9);
    expect(maximum.force).toBeCloseTo(0.06, 9);
    expect(commutated).toMatchObject({ halfTurn: 2, commutatorPhase: -1, segmentDirection: -1, deadSpot: true });
    expect(maximum.torqueDirection).toBe(1);
    expect(reversed.torqueDirection).toBe(-1);
  });

  it('makes wire force vanish when parallel and peak when perpendicular', () => {
    const parallel = physics.wireForceVectorState(3, 4, 0, 5, 1, 1);
    const mid = physics.wireForceVectorState(3, 4, 30, 5, 1, 1);
    const maximum = physics.wireForceVectorState(3, 4, 90, 5, 1, 1);
    const reversedCurrent = physics.wireForceVectorState(3, 4, 90, 5, -1, 1);
    const reversedField = physics.wireForceVectorState(3, 4, 90, 5, 1, -1);
    expect(parallel).toMatchObject({ magnitude: 0, deadSpot: true, forceDirection: '+z' });
    expect(mid.magnitude).toBeCloseTo(maximum.magnitude * 0.5, 9);
    expect(maximum.magnitude).toBeCloseTo(3 * 4 * 5, 9);
    expect(maximum.perpendicularFraction).toBeCloseTo(1, 9);
    expect(maximum.parallelFraction).toBeCloseTo(0, 9);
    expect(reversedCurrent.signedForce).toBe(-maximum.signedForce);
    expect(reversedField.signedForce).toBe(-maximum.signedForce);
  });

  it('connects magnetic force to torque, speed, and mechanical power', () => {
    const stopped = physics.motorPowerBridgeState(3, 4, 45, 5, 0, 1, 1);
    const moving = physics.motorPowerBridgeState(3, 4, 45, 5, 300, 1, 1);
    const fast = physics.motorPowerBridgeState(3, 4, 45, 5, 600, 1, 1);
    const parallel = physics.motorPowerBridgeState(3, 4, 0, 5, 300, 1, 1);
    expect(stopped).toMatchObject({ speedRpm: 0, moving: false, mechanicalPower: 0, powerActive: false });
    expect(moving.torque).toBeCloseTo(moving.magnitude * moving.radius, 9);
    expect(moving.mechanicalPower).toBeCloseTo(moving.torque * moving.omega, 9);
    expect(fast.mechanicalPower).toBeCloseTo(moving.mechanicalPower * 2, 9);
    expect(parallel).toMatchObject({ magnitude: 0, torque: 0, mechanicalPower: 0, powerActive: false });
  });
  it('selects one beam speed and separates transmitted ions by mass-to-charge ratio', () => {
    const matched = physics.velocitySelectorState(6, 3, 2, 4, 2, 1);
    const fast = physics.velocitySelectorState(6, 3, 4, 4, 2, 1);
    expect(matched.selectedSpeed).toBeCloseTo(2, 9);
    expect(matched.passes).toBe(true);
    expect(matched.electricForce).toBeCloseTo(matched.magneticForce, 9);
    expect(matched.netUpwardForce).toBeCloseTo(0, 9);
    expect(fast.passes).toBe(false);
    expect(fast.netUpwardForce).toBeGreaterThan(0);
    expect(physics.velocitySelectorState(0, 3, 0, 4, 2, 1)).toMatchObject({ moving: false, passes: false, analyzerRadius: 0 });

    const proton = physics.velocitySelectorState(6, 3, 2, 4, 1, 1);
    const deuteron = physics.velocitySelectorState(6, 3, 2, 4, 2, 1);
    const helium = physics.velocitySelectorState(6, 3, 2, 4, 4, 2);
    expect(deuteron.analyzerRadius).toBeCloseTo(proton.analyzerRadius * 2, 9);
    expect(helium.massToCharge).toBeCloseTo(deuteron.massToCharge, 9);
    expect(helium.analyzerRadius).toBeCloseTo(deuteron.analyzerRadius, 9);
    expect(physics.velocitySelectorState(6, 3, 2, 8, 2, 1).analyzerRadius).toBeCloseTo(deuteron.analyzerRadius / 2, 9);
  });
  it('decomposes 3D charged-particle motion into straight, helical, and circular paths', () => {
    const straight = physics.chargedParticleHelix(1, 1, 6, 3, 0, 61);
    const helix = physics.chargedParticleHelix(1, 1, 6, 3, 45, 61);
    const circle = physics.chargedParticleHelix(1, 1, 6, 3, 90, 61);
    expect(straight).toMatchObject({ motionType: 'straight', radius: 0, force: 0 });
    expect(straight.points.every((point) => point.x === 0 && point.z === 0)).toBe(true);
    expect(helix.motionType).toBe('helical');
    expect(helix.parallelSpeed).toBeGreaterThan(0);
    expect(helix.perpendicularSpeed).toBeGreaterThan(0);
    expect(helix.radius).toBeCloseTo(helix.perpendicularSpeed / 3, 9);
    expect(helix.pitch).toBeGreaterThan(0);
    expect(circle.motionType).toBe('circular');
    expect(circle.parallelSpeed).toBeCloseTo(0, 9);
    expect(circle.pitch).toBeCloseTo(0, 9);

    const reversedCharge = physics.chargedParticleHelix(-1, 1, 6, 3, 45, 61);
    const reversedField = physics.chargedParticleHelix(1, -1, 6, 3, 45, 61);
    expect(reversedCharge.handedness).toBe(-helix.handedness);
    expect(reversedField.handedness).toBe(-helix.handedness);
    expect(Math.sign(reversedCharge.points[0].z)).toBe(-Math.sign(helix.points[0].z));
    expect(physics.chargedParticleHelix(1, 1, 6, 6, 45, 61).radius).toBeLessThan(helix.radius);
    expect(physics.chargedParticleHelix(1, 1, 6, 6, 45, 61).pitch).toBeLessThan(helix.pitch);
  });
  it('scales gyro radius and pitch with mass and identifies fair particle comparisons', () => {
    const reference = Object.assign(physics.chargedParticleHelix(1, 1, 6, 3, 45, 61, 1), {
      chargeSign: 1, fieldSign: 1, speed: 6, field: 3, tilt: 45, mass: 1,
    });
    const heavy = Object.assign(physics.chargedParticleHelix(1, 1, 6, 3, 45, 61, 4), {
      chargeSign: 1, fieldSign: 1, speed: 6, field: 3, tilt: 45, mass: 4,
    });
    expect(heavy.radius).toBeCloseTo(reference.radius * 4, 9);
    expect(heavy.pitch).toBeCloseTo(reference.pitch * 4, 9);
    expect(heavy.gyroPeriod).toBeCloseTo(reference.gyroPeriod * 4, 9);
    expect(physics.chargedParticleComparison(heavy, reference)).toMatchObject({
      keys: ['mass'], count: 1, fair: true, radiusRatio: 4, pitchRatio: 4,
      radiusDirection: 'larger', pitchDirection: 'larger', handednessChanged: false,
    });
    const confounded = Object.assign({}, heavy, { speed: 8, field: 5 });
    expect(physics.chargedParticleComparison(confounded, reference)).toMatchObject({
      keys: ['speed', 'field', 'mass'], count: 3, fair: false,
    });
  });
  it('compresses the dayside and extends the magnetotail as solar-wind pressure rises', () => {
    const quiet = physics.magnetosphereTeachingState(1);
    const active = physics.magnetosphereTeachingState(5);
    const storm = physics.magnetosphereTeachingState(10);
    expect(quiet).toMatchObject({ pressure: 1, activity: 'quiet', daysideRadiusRE: 9.8, bowShockRadiusRE: 12.2, tailReachRE: 15, auroralLatitude: 69, dipoleTilt: 11 });
    expect(active.activity).toBe('active');
    expect(storm).toMatchObject({ pressure: 10, activity: 'storm-level', tailReachRE: 30, auroralLatitude: 60, compressionPercent: 100 });
    expect(storm.daysideRadiusRE).toBeCloseTo(5.6, 9);
    expect(storm.bowShockRadiusRE).toBeCloseTo(8.2, 9);
    expect(storm.daysideRadiusRE).toBeLessThan(quiet.daysideRadiusRE);
    expect(storm.bowShockRadiusRE).toBeLessThan(quiet.bowShockRadiusRE);
    expect(storm.tailReachRE).toBeGreaterThan(quiet.tailReachRE);
    expect(storm.auroralLatitude).toBeLessThan(quiet.auroralLatitude);
  });

  it('predicts magnetic-mirror loss-cone escape and pitch-angle trapping', () => {
    const passing = physics.chargedParticleMirror(1, 1, 6, 3, 20, 121, 1, 4);
    const trapped = physics.chargedParticleMirror(1, 1, 6, 3, 60, 121, 1, 4);
    expect(passing).toMatchObject({ fieldModel: 'mirror', mirrorRatio: 4, trapped: false, confinement: 'passing', motionType: 'mirror-passing' });
    expect(passing.criticalAngle).toBeCloseTo(30, 9);
    expect(passing.points[0].y).toBeCloseTo(-3.15, 9);
    expect(passing.points[passing.points.length - 1].y).toBeCloseTo(3.15, 9);
    expect(trapped).toMatchObject({ trapped: true, confinement: 'trapped', motionType: 'mirror-trapped' });
    expect(trapped.turningPosition).toBeCloseTo(1, 9);
    expect(Math.max(...trapped.points.map((point) => Math.abs(point.y)))).toBeLessThanOrEqual(trapped.turningPosition + 1e-9);
    expect(Math.max(...trapped.points.map((point) => point.fieldRatio))).toBeGreaterThan(1);
    expect(Math.min(...trapped.points.map((point) => point.localRadius))).toBeLessThan(trapped.radius);
    const reversed = physics.chargedParticleMirror(-1, 1, 6, 3, 60, 121, 1, 4);
    expect(Math.sign(reversed.points[20].z)).toBe(-Math.sign(trapped.points[20].z));
  });
  it('identifies controlled and confounded motor-generator trial changes', () => {
    const baseline = { loadOhms: 40, turns: 80, field: 4, current: 3, motorField: 4, friction: 3 };
    const controlled = Object.assign({}, baseline, { loadOhms: 10 });
    const confounded = Object.assign({}, baseline, { loadOhms: 10, turns: 120 });
    expect(physics.describeMotorGeneratorTrialChange(controlled, baseline)).toMatchObject({
      count: 1, keys: ['loadOhms'], label: 'generator load only', fair: true,
    });
    expect(physics.describeMotorGeneratorTrialChange(confounded, baseline)).toMatchObject({
      count: 2, keys: ['loadOhms', 'turns'], fair: false,
    });
    expect(physics.describeMotorGeneratorTrialChange(baseline, baseline).label).toBe('repeat design');
  });
  it('a bar magnet dipole field points away from its north pole on-axis', () => {
    const f = physics.fieldAt(50, 0, [{ x: 0, y: 0, angle: 0, polarity: 1 }]);
    expect(f.x).toBeGreaterThan(0);
    expect(Math.abs(f.y)).toBeLessThan(1e-9);
    // reversing polarity flips the field
    const g = physics.fieldAt(50, 0, [{ x: 0, y: 0, angle: 0, polarity: -1 }]);
    expect(g.x).toBeLessThan(0);
  });

  it('field-line tracing produces a multi-point streamline', () => {
    const line = physics.traceLine(-54, 0, [{ x: -70, y: 0, angle: 0, polarity: 1 }], 1, { step: 6, maxSteps: 120, bound: 200 });
    expect(line.length).toBeGreaterThan(2);
    expect(line[0].length).toBe(2);
  });

  it('maps Hall-probe vectors and recovers the dipole inverse-cube distance law', () => {
    const magnet = { x: 0, y: 0, angle: 0, polarity: 1, strength: 1 };
    const near = physics.fieldProbeReading(60, 0, [magnet], 0);
    const far = physics.fieldProbeReading(120, 0, [magnet], 0);
    expect(near.magnitude / far.magnitude).toBeCloseTo(8, 9);
    expect(near.bx).toBeGreaterThan(0);
    expect(near.by).toBeCloseTo(0, 12);

    const axial = physics.fieldScanSeries([magnet], 'axial', [50, 65, 80, 100, 125, 150, 175], 0, 0);
    const equatorial = physics.fieldScanSeries([magnet], 'equatorial', [50, 65, 80, 100, 125, 150, 175], 0, 0);
    const axialFit = physics.fieldPowerLawFit(axial);
    const equatorialFit = physics.fieldPowerLawFit(equatorial);
    expect(axialFit.exponent).toBeCloseTo(-3, 9);
    expect(equatorialFit.exponent).toBeCloseTo(-3, 9);
    expect(axialFit.rSquared).toBeCloseTo(1, 9);

    const noisyA = physics.fieldProbeReading(90, 15, [magnet], 12);
    const noisyB = physics.fieldProbeReading(90, 15, [magnet], 12);
    expect(noisyA).toEqual(noisyB);
    expect(Math.abs(noisyA.measuredMagnitude - noisyA.magnitude)).toBeLessThanOrEqual(noisyA.uncertainty + 1e-12);
    expect(physics.fieldPowerLawFit([near])).toMatchObject({ count: 0, exponent: null });
  });
  it('the quiz bank is 22 questions with valid answer indices', () => {
    expect(physics.QUIZ.length).toBe(22);
    physics.QUIZ.forEach((q) => {
      expect(q.a.length).toBeGreaterThanOrEqual(2);
      expect(q.c).toBeGreaterThanOrEqual(0);
      expect(q.c).toBeLessThan(q.a.length);
      expect(typeof q.why).toBe('string');
    });
  });
});

describe('magnetism tool — expanded interactive simulation models', () => {
  it('the force bench preserves strength scaling and the axial 1/r⁴ falloff', () => {
    const base = physics.magnetPairForce(1, 1, 60);
    expect(base).toBeCloseTo(1, 12);
    expect(physics.magnetPairForce(2, 1, 60) / base).toBeCloseTo(2, 12);
    expect(physics.magnetPairForce(1, 3, 60) / base).toBeCloseTo(3, 12);
    expect(physics.magnetPairForce(1, 1, 120) / base).toBeCloseTo(1 / 16, 12);
    expect(Number.isFinite(physics.magnetPairForce(1, 1, 0))).toBe(true);
  });

  it('reversing charge or field reverses a Lorentz trajectory', () => {
    const plusOut = physics.chargedParticleTrajectory(1, 1, 5, 4, 36);
    const minusOut = physics.chargedParticleTrajectory(-1, 1, 5, 4, 36);
    const plusInto = physics.chargedParticleTrajectory(1, -1, 5, 4, 36);
    expect(plusOut.at(-1).y).toBeLessThan(0);
    expect(minusOut.at(-1).y).toBeGreaterThan(0);
    expect(plusInto.at(-1).y).toBeGreaterThan(0);
    plusOut.forEach((p) => {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    });
  });

  it('stronger fields bend the same particle more while faster particles bend less', () => {
    const weak = physics.chargedParticleTrajectory(1, 1, 5, 2, 36).at(-1);
    const strong = physics.chargedParticleTrajectory(1, 1, 5, 6, 36).at(-1);
    const fast = physics.chargedParticleTrajectory(1, 1, 8, 6, 36).at(-1);
    expect(Math.abs(strong.y)).toBeGreaterThan(Math.abs(weak.y));
    expect(Math.abs(fast.y)).toBeLessThan(Math.abs(strong.y));
  });

  it('rotating-coil flux and voltage stay a quarter-cycle apart', () => {
    expect(physics.rotatingFlux(0, 60, 4)).toBeCloseTo(240, 10);
    expect(physics.rotatingEMF(0, 60, 4)).toBeCloseTo(0, 10);
    expect(physics.rotatingFlux(90, 60, 4)).toBeCloseTo(0, 10);
    expect(physics.rotatingEMF(90, 60, 4)).toBeCloseTo(240, 10);
    expect(physics.rotatingFlux(180, 60, 4)).toBeCloseTo(-240, 10);
    expect(physics.rotatingEMF(90, 120, 4)).toBeCloseTo(480, 10);
    expect(physics.rotatingEMF(90, 60, 8)).toBeCloseTo(480, 10);
    expect(physics.rotatingEMF(90, 60, 4, 2)).toBeCloseTo(480, 10);
    expect(physics.rotatingEMF(90, 60, 4, 0)).toBeCloseTo(0, 10);
  });

  it('keeps the phase wheel normalized and quarter-cycle linked', () => {
    const fluxPeak = physics.rotatingPhaseState(0, 60, 4, 60);
    const voltagePeak = physics.rotatingPhaseState(90, 60, 4, 60);
    const fluxMinimum = physics.rotatingPhaseState(180, 60, 4, 60);
    const voltageMinimum = physics.rotatingPhaseState(270, 60, 4, 60);
    const stopped = physics.rotatingPhaseState(90, 60, 4, 0);
    expect(fluxPeak).toMatchObject({ fluxNorm: 1, emfNorm: 0, phaseGapDeg: 90, fluxPeak: true, emfPeak: false });
    expect(voltagePeak.emfNorm).toBeCloseTo(1, 10);
    expect(voltagePeak.fluxNorm).toBeCloseTo(0, 10);
    expect(voltagePeak).toMatchObject({ fluxPeak: false, emfPeak: true, frequencyHz: 1 });
    expect(fluxMinimum.fluxNorm).toBeCloseTo(-1, 10);
    expect(voltageMinimum.emfNorm).toBeCloseTo(-1, 10);
    expect(stopped).toMatchObject({ stopped: true, frequencyHz: 0, emf: 0, emfNorm: 0, emfPeak: false });
  });
  it('maps real quest evidence into cross-station mission progress', () => {
    const fresh = physics.missionProgressState('power_path', { magnetism: {} });
    expect(fresh).toMatchObject({ doneCount: 0, total: 4, nextStepIndex: 0, completed: false });
    expect(fresh.steps.map((step) => step.tab)).toEqual(['electro', 'induce', 'induce', 'field']);
    const partial = physics.missionProgressState('power_path', { magnetism: { coilTouched: true, peakEMF: 0.8 } });
    expect(partial).toMatchObject({ doneCount: 2, nextStepIndex: 2, completed: false });
    const complete = physics.missionProgressState('power_path', { magnetism: { coilTouched: true, peakEMF: 0.8, genSpeedSeen: true, genPhaseSeen: true, notebookUsed: true } });
    expect(complete).toMatchObject({ doneCount: 4, nextStepIndex: 3, completed: true });
    const motor = physics.missionProgressState('motor_path', { magnetism: { coilTouched: true, motorRan: true, motorDirectionSeen: true, lorentzUsed: true } });
    expect(motor.completed).toBe(true);
  });

  it('turns mission progress into concrete evidence and a defensible synthesis', () => {
    const review = physics.missionEvidenceReviewState('power_path', { magnetism: {
      coilTouched: true, current: 3, turns: 80, peakEMF: 0.8, genSpeedSeen: true, genPhaseSeen: true,
      genRPM: 120, genTurns: 60, notebookTrials: [{ station: 'Hand generator' }],
    } });
    expect(review.completed).toBe(false);
    expect(review.steps[0].evidence).toContain('Field test:');
    expect(review.steps[1].evidence).toContain('0.80 V');
    expect(review.steps[2].evidence).toContain('120 RPM');
    expect(review.steps[3].evidence).toContain('Pending · Write a claim');
    expect(review.synthesis).toContain('Changing flux becomes voltage');
    expect(review.claimStatus).toContain('Add a notebook claim');
    const claimed = physics.missionEvidenceReviewState('power_path', { magnetism: { notebookClaim: 'Changing flux creates voltage.' } });
    expect(claimed.claimStatus).toBe('Notebook claim recorded.');
  });
  it('builds a selectable replay timeline from notebook evidence', () => {
    const replay = physics.missionReplayState('power_path', { magnetism: {
      replaySelectedIndex: 0,
      notebookTrials: [
        { station: 'Electromagnet', setup: '20 turns', result: '4 mT', prediction: 'More turns should strengthen the field.' },
        { station: 'Hand generator', setup: '60 turns', result: '0.80 V', prediction: 'Faster motion should raise voltage.' },
      ],
    }});
    expect(replay.count).toBe(2);
    expect(replay.coverage).toContain('2 recorded trials');
    expect(replay.selected.ordinal).toBe(1);
    expect(replay.selected.station).toBe('Electromagnet');
    expect(replay.latest.result).toBe('0.80 V');
    const latestByDefault = physics.missionReplayState('power_path', { magnetism: { notebookTrials: replay.trials } });
    expect(latestByDefault.selected.ordinal).toBe(2);
    const clamped = physics.missionReplayState('power_path', { magnetism: { replaySelectedIndex: 99, notebookTrials: replay.trials } });
    expect(clamped.selected.ordinal).toBe(2);
  });
  it('captures structured station metrics for replay comparison', () => {
    const electro = physics.notebookMetricSnapshot({ magnetism: { tab: 'electro', turns: 200, current: 4, core: false } });
    expect(electro.map((metric) => metric.key)).toEqual(['field_mT', 'turns', 'current_A']);
    expect(electro[0].value).toBeGreaterThan(0);
    expect(electro[0].display).toContain('mT');
    const motor = physics.notebookMetricSnapshot({ magnetism: { tab: 'motor', motorMode: 'forces', motorCurrent: 3, motorField: 4, motorAngle: 90, motorLoad: 0.5 } });
    expect(motor.map((metric) => metric.key)).toEqual(['torque_rel', 'angle_deg', 'load_rel', 'load_margin']);
    expect(motor[2].value).toBeCloseTo(0.5, 9);
    expect(motor[3].value).toBeCloseTo(0.5, 9);
    const completed = physics.notebookMetricSnapshot({ magnetism: { tab: 'motor', motorMode: 'forces', motorCurrent: 3, motorField: 4, motorAngle: 90, motorLoad: 1.25, motorLoadPrediction: 1, motorLoadSamples: [{ load: 0.75, margin: 0.25, stalled: false }, { load: 1.25, margin: -0.25, stalled: true }] } });
    expect(completed.map((metric) => metric.key)).toEqual(['torque_rel', 'angle_deg', 'load_rel', 'load_margin', 'load_prediction', 'load_observed', 'load_offset']);
    expect(completed[5].value).toBeCloseTo(1, 9);
    expect(completed[6].value).toBeCloseTo(0, 9);
    const earth = physics.notebookMetricSnapshot({ magnetism: { tab: 'earth', earthSolarWind: 8 } });
    expect(earth.map((metric) => metric.key)).toEqual(['solar_wind', 'dayside_RE']);
    const replay = physics.missionReplayState('motor_path', { magnetism: {
      replaySelectedIndex: 0,
      notebookTrials: [{ station: 'Electromagnet', setup: '200 turns', result: 'field', prediction: 'More turns', metrics: electro }],
    } });
    expect(replay.selected.metrics[0]).toMatchObject({ key: 'field_mT', unit: 'mT' });
  });
  it('builds a portable mission report from claims, evidence, and metrics', () => {
    const report = physics.missionReportState('power_path', { magnetism: {
      coilTouched: true, peakEMF: 0.8, genSpeedSeen: true, genPhaseSeen: true, notebookUsed: true,
      notebookClaim: 'Changing flux creates voltage.',
      notebookTrials: [{ station: 'Hand generator', setup: '60 turns', result: '0.80 V', prediction: 'Faster motion raises voltage.', metrics: [{ key: 'peak_V', label: 'Peak voltage', value: 0.8, unit: 'V', digits: 2, display: '0.80 V' }] }],
    } });
    expect(report).toMatchObject({ missionId: 'power_path', title: 'Power a remote sensor', completed: true, trialCount: 1, metricCount: 1 });
    expect(report.claim).toContain('Changing flux');
    expect(report.steps.every((step) => step.done)).toBe(true);
    expect(report.trials[0].metrics[0]).toMatchObject({ key: 'peak_V', display: '0.80 V' });
  });
  it('tracks the CER checklist as evidence accumulates', () => {
    const fresh = physics.missionCERState('power_path', { magnetism: {} });
    expect(fresh).toMatchObject({ doneCount: 0, complete: false, next: { key: 'claim' } });
    const evidenceOnly = physics.missionCERState('power_path', { magnetism: { notebookTrials: [{ station: 'Field', setup: 'probe', result: 'reading', prediction: 'field' }] } });
    expect(evidenceOnly.items).toMatchObject([{ key: 'claim', done: false }, { key: 'evidence', done: true }, { key: 'reasoning', done: false }]);
    const complete = physics.missionCERState('power_path', { magnetism: { notebookClaim: 'Changing flux creates voltage.', notebookTrials: [{ station: 'Hand generator', setup: 'moving magnet', result: '0.80 V', prediction: 'faster' }] } });
    expect(complete).toMatchObject({ doneCount: 3, complete: true, next: null });
  });
});
describe('magnetism tool - advanced investigations', () => {
  it('exposes each field contribution and their exact vector sum', () => {
    const magnets = [
      { x: -40, y: 5, angle: 0, polarity: 1, strength: 1.5 },
      { x: 55, y: -10, angle: Math.PI / 3, polarity: -1, strength: 0.8 },
    ];
    const parts = physics.fieldComponentsAt(12, 24, magnets);
    const total = physics.fieldAt(12, 24, magnets);
    expect(parts).toHaveLength(2);
    expect(parts.reduce((sum, p) => sum + p.x, 0)).toBeCloseTo(total.x, 15);
    expect(parts.reduce((sum, p) => sum + p.y, 0)).toBeCloseTo(total.y, 15);
    parts.forEach((p) => expect(p.magnitude).toBeCloseTo(Math.hypot(p.x, p.y), 15));
  });

  it('models finite-solenoid geometry and approaches the ideal long-coil law', () => {
    const finite = physics.finiteSolenoidCenterField(200, 3, 1, 0.001, 'air');
    const ideal = physics.solenoidField(200, 3, 1, 1);
    expect(finite / ideal).toBeCloseTo(1, 5);
    expect(physics.finiteSolenoidCenterField(400, 3, 1, 0.001, 'air') / finite).toBeCloseTo(2, 10);
    expect(physics.finiteSolenoidCenterField(200, 6, 1, 0.001, 'air') / finite).toBeCloseTo(2, 10);
    expect(physics.finiteSolenoidCenterField(200, 0, 1, 0.001, 'air')).toBe(0);
  });

  it('keeps core response monotonic while exposing magnetic saturation', () => {
    const lowAir = 0.0001;
    const highAir = 0.02;
    const lowSoft = physics.coreAdjustedField(lowAir, 'soft');
    const highSoft = physics.coreAdjustedField(highAir, 'soft');
    expect(lowSoft).toBeGreaterThan(lowAir);
    expect(highSoft).toBeGreaterThan(lowSoft);
    expect(lowSoft / lowAir).toBeGreaterThan(highSoft / highAir);
    expect(highSoft).toBeLessThanOrEqual(highAir + physics.CORE_MATERIALS.soft.saturationT);
    expect(physics.coreAdjustedField(lowAir, 'soft')).toBeGreaterThan(physics.coreAdjustedField(lowAir, 'steel'));
  });

  it('connects solenoid wire length, heating, field direction, and 3D streamlines', () => {
    const length = physics.solenoidWireLength(100, 0.03, 0.12);
    expect(length).toBeGreaterThan(2 * Math.PI * 0.03 * 99);
    const heat = physics.solenoidHeatingIndex(100, 2, 0.03, 0.12);
    expect(physics.solenoidHeatingIndex(100, 4, 0.03, 0.12) / heat).toBeCloseTo(4, 12);
    const compactField = physics.finiteSolenoidCenterField(40, 4, 0.12, 0.03, 'air');
    const manyTurnsField = physics.finiteSolenoidCenterField(160, 1, 0.12, 0.03, 'air');
    expect(manyTurnsField).toBeCloseTo(compactField, 12);
    expect(physics.solenoidHeatingIndex(160, 1, 0.03, 0.12)).toBeLessThan(physics.solenoidHeatingIndex(40, 4, 0.03, 0.12));
    const coil = { turns: 100, current: 2, length: 2.8, radius: 1, lengthM: 0.12, radiusM: 0.03, material: 'air', currentDir: 1, windingDir: 1 };
    const forward = physics.solenoidFieldAt3D(0, 0, 0, coil);
    const reverse = physics.solenoidFieldAt3D(0, 0, 0, { ...coil, currentDir: -1 });
    expect(forward.x).toBeGreaterThan(0);
    expect(reverse.x).toBeCloseTo(-forward.x, 12);
    const line = physics.traceSolenoidLine3D({ x: 1.5, y: 0.35, z: 0 }, coil, 1, { maxSteps: 120, bound: 5 });
    expect(line.length).toBeGreaterThan(3);
    line.forEach((point) => expect(Number.isFinite(point.x + point.y + point.z)).toBe(true));
  });
  it('extends the dipole model into three dimensions with reversible orientation', () => {
    const magnet = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, polarity: 1, strength: 1 };
    const axial = physics.dipoleFieldAt3D(2, 0, 0, magnet);
    expect(axial.x).toBeGreaterThan(0);
    expect(Math.abs(axial.y)).toBeLessThan(1e-12);
    expect(Math.abs(axial.z)).toBeLessThan(1e-12);
    const reversed = physics.dipoleFieldAt3D(2, 0, 0, { ...magnet, polarity: -1 });
    expect(reversed.x).toBeCloseTo(-axial.x, 12);
    expect(reversed.y).toBeCloseTo(-axial.y, 12);
    expect(reversed.z).toBeCloseTo(-axial.z, 12);
    const tilted = physics.dipoleMoment3D({ ...magnet, yaw: Math.PI / 2, pitch: Math.PI / 6 });
    expect(tilted.y).toBeCloseTo(0.5, 12);
    expect(tilted.z).toBeCloseTo(Math.cos(Math.PI / 6), 12);
  });

  it('preserves exact vector superposition and finite bounded 3D streamlines', () => {
    const magnets = [
      { x: -1.2, y: 0, z: 0, yaw: 0, pitch: 0.15, polarity: 1, strength: 1.3 },
      { x: 1.5, y: 0.4, z: -0.3, yaw: 2.2, pitch: -0.2, polarity: 1, strength: 0.8 },
    ];
    const parts = physics.fieldComponentsAt3D(0.2, 1.1, 0.7, magnets);
    const total = physics.fieldAt3D(0.2, 1.1, 0.7, magnets);
    expect(parts.reduce((sum, p) => sum + p.x, 0)).toBeCloseTo(total.x, 15);
    expect(parts.reduce((sum, p) => sum + p.y, 0)).toBeCloseTo(total.y, 15);
    expect(parts.reduce((sum, p) => sum + p.z, 0)).toBeCloseTo(total.z, 15);
    const line = physics.traceLine3D({ x: -0.1, y: 0.8, z: 0.2 }, magnets, 1, { step: 0.1, maxSteps: 160, bound: 5 });
    expect(line.length).toBeGreaterThan(3);
    line.forEach((point) => {
      expect(Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z)).toBe(true);
      expect(Math.max(Math.abs(point.x), Math.abs(point.y), Math.abs(point.z))).toBeLessThanOrEqual(5);
    });
  });

  it('finds genuine 3D cancellation instead of merely choosing a distant weak field', () => {
    const opposing = [
      { x: -1.6, y: 0, z: 0, yaw: 0, pitch: 0, polarity: 1, strength: 1 },
      { x: 1.6, y: 0, z: 0, yaw: Math.PI, pitch: 0, polarity: 1, strength: 1 },
    ];
    const found = physics.findFieldNull3D(opposing, { bound: 3.7, steps: 13 });
    expect(found.cancellation).toBeLessThan(0.01);
    expect(Math.hypot(found.x, found.y, found.z)).toBeLessThan(0.1);
  });
  it('integrates magnetic flux through an oriented 3D coil surface', () => {
    const magnet = { x: -2.4, y: 0, z: 0, yaw: 0, pitch: 0, polarity: 1, strength: 1.4 };
    const coil = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, radius: 1.25 };
    const flux = physics.coilFlux3D(magnet, coil);
    expect(Number.isFinite(flux)).toBe(true);
    expect(flux).not.toBe(0);
    expect(physics.coilFlux3D({ ...magnet, polarity: -1 }, coil)).toBeCloseTo(-flux, 12);
    expect(physics.coilFlux3D(magnet, { ...coil, yaw: Math.PI })).toBeCloseTo(-flux, 10);
    const normal = physics.coilNormal3D({ yaw: Math.PI / 2, pitch: Math.PI / 6 });
    expect(Math.hypot(normal.x, normal.y, normal.z)).toBeCloseTo(1, 12);
  });

  it('applies Faraday law to 3D flux changes and controlled passage time', () => {
    expect(physics.inducedVoltage3D(80, 2, 2, 0.5, 0.02)).toBe(0);
    const base = physics.inducedVoltage3D(80, 1, 1.5, 1, 0.02);
    expect(physics.inducedVoltage3D(160, 1, 1.5, 1, 0.02)).toBeCloseTo(base * 2, 12);
    expect(physics.inducedVoltage3D(80, 1, 1.5, 0.25, 0.02)).toBeCloseTo(base * 4, 12);

    const magnet = { x: -3.4, y: 0, z: 0, yaw: 0, pitch: 0, polarity: 1, strength: 1.4 };
    const coil = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, radius: 1.25 };
    const slow = physics.inductionPass3D(magnet, coil, 80, 2, 49, 1, 0.0002);
    const fast = physics.inductionPass3D(magnet, coil, 80, 0.5, 49, 1, 0.0002);
    const slowPeak = Math.max(...slow.map((sample) => Math.abs(sample.emf)));
    const fastPeak = Math.max(...fast.map((sample) => Math.abs(sample.emf)));
    expect(fastPeak / slowPeak).toBeCloseTo(4, 8);
    expect(fast.some((sample) => sample.emf > 0)).toBe(true);
    expect(fast.some((sample) => sample.emf < 0)).toBe(true);
    fast.forEach((sample) => {
      expect(Number.isFinite(sample.flux)).toBe(true);
      expect(Number.isFinite(sample.emf)).toBe(true);
    });
  });
  it('models remanence and stronger coercivity for hard magnetic material', () => {
    const softRemanence = physics.hysteresisMagnetization(0, 1, 0.16, 0.30, 1);
    const hardRemanence = physics.hysteresisMagnetization(0, 1, 0.48, 0.18, 0.96);
    expect(softRemanence).toBeGreaterThan(0);
    expect(hardRemanence).toBeGreaterThan(softRemanence);
    expect(physics.hysteresisMagnetization(-0.30, 1, 0.16, 0.30, 1)).toBeLessThan(0);
    expect(physics.hysteresisMagnetization(-0.30, 1, 0.48, 0.18, 0.96)).toBeGreaterThan(0);
  });

  it('eddy braking grows with conducting wall strength and collapses when slit', () => {
    const copperThick = physics.eddyBrakeFactor(1, 6, false);
    const aluminumThin = physics.eddyBrakeFactor(0.62, 2, false);
    const slitCopper = physics.eddyBrakeFactor(1, 6, true);
    expect(copperThick).toBeGreaterThan(aluminumThin);
    expect(slitCopper).toBeLessThan(copperThick * 0.1);
    expect(physics.eddyBrakeFactor(0, 6, false)).toBe(0);
  });

  it('links eddy-current force to speed and field squared while slits lengthen the stop', () => {
    const fieldOff = physics.eddyBrakeState(1, 6, false, 6, 0);
    const fieldTwo = physics.eddyBrakeState(1, 6, false, 6, 2);
    const fieldFour = physics.eddyBrakeState(1, 6, false, 6, 4);
    const speedThree = physics.eddyBrakeState(1, 6, false, 3, 4);
    const slit = physics.eddyBrakeState(1, 6, true, 6, 4);
    expect(fieldOff).toMatchObject({ forcePercent: 0, heatShare: 0, loop: 'closed' });
    expect(fieldFour.forcePercent / fieldTwo.forcePercent).toBeCloseTo(4, 10);
    expect(fieldFour.forcePercent / speedThree.forcePercent).toBeCloseTo(2, 10);
    expect(fieldFour.stoppingDistance).toBeLessThan(fieldOff.stoppingDistance);
    expect(fieldFour.heatShare).toBeGreaterThan(fieldTwo.heatShare);
    expect(slit.loop).toBe('open');
    expect(slit.forcePercent).toBeLessThan(fieldFour.forcePercent * 0.1);
    expect(slit.stoppingDistance).toBeGreaterThan(fieldFour.stoppingDistance);
  });

  it('loaded transformer keeps the power ledger balanced', () => {
    const loaded = physics.transformerLoad(120, 100, 200, true, 120, 0.94);
    expect(loaded.vout).toBeCloseTo(240, 12);
    expect(loaded.iout).toBeCloseTo(2, 12);
    expect(loaded.pin).toBeCloseTo(loaded.pout + loaded.loss, 10);
    expect(loaded.loss).toBeGreaterThan(0);
    const dc = physics.transformerLoad(120, 100, 200, false, 120, 0.94);
    expect(dc.vout).toBe(0);
    expect(dc.pout).toBe(0);
  });

  it('includes direct manipulation, progressive journey guidance, and theme-aware instruments', () => {
    const source = readFileSync(TOOL_PATHS[0], 'utf8');
    expect(source).toContain('onPointerMove: function (e)');
    expect(source).toContain('Superposition at the compass');
    expect(source).toContain('window.StemLab.ensureThree');
    expect(source).toContain('function electro3DCard');
    expect(source).toContain('function initElectro3DCanvas');
    expect(source).toContain('new THREE.TubeGeometry');
    expect(source).toContain('finiteSolenoidCenterField');
    expect(source).toContain('function induction3DCard');
    expect(source).toContain('function initInduction3DCanvas');
    expect(source).toContain('buildCoil(liveState)');
    expect(source).toContain('function field3DCard');
    expect(source).toContain('buildSlice(liveState)');
    expect(source).toContain('Magnetic memory: domains and hysteresis');
    expect(source).toContain('Eddy-current engineering lab');
    expect(source).toContain('Load, lamp, and efficiency');
    expect(source).toContain("'data-magnetism-expedition': 'true'");
    expect(source).toContain("className: 'mag-expedition-quest'");
    expect(source).not.toContain("fill: '#0b1220'");
    expect(source).not.toContain('setTimeout(function () { upd({ earthSeen: true })');
  });
});
describe('magnetism tool — honesty + accessibility (source anchors)', () => {
  const source = readFileSync(TOOL_PATHS[0], 'utf8');
  it('discloses the schematic model and keeps the exact solenoid law', () => {
    expect(source).toContain('schematic dipole model');
    expect(source).toContain('B = μ₀ · (N / L) · I');
    expect(source).toContain('F = B·I·L');
  });
  it('keeps Earth science honest (geodynamo, magnetosphere shape, irregular reversal)', () => {
    expect(source).toContain('780,000 years ago');
    expect(source).toContain('geodynamo');
    expect(source).toContain('magnetotail');
    expect(source).toContain('alongside gravity and other processes');
  });
  it('gates AI traffic behind aiHintsEnabled', () => {
    expect(source).toContain('var aiOn = !!(ctx.aiHintsEnabled && typeof callGemini === \'function\')');
  });
  it('has reduced-motion + focus-visible + tablist a11y', () => {
    expect(source).toContain('prefers-reduced-motion');
    expect(source).toContain('focus-visible');
    expect(source).toContain("role: 'tablist'");
    expect(source).toContain("role: 'tabpanel'");
    expect(source).toContain('aria-controls');
    expect(source).toContain('aria-live');
  });

  it('scaffolds every station with a predict-test-explain learning cycle', () => {
    expect(source).toContain('var STATION_GUIDES = {');
    expect(source).toContain('1 · Predict');
    expect(source).toContain('2 · Test');
    expect(source).toContain('3 · Explain');
    ['field', 'electro', 'motor', 'induce', 'materials', 'crane', 'maze', 'transformer', 'earth', 'quiz'].forEach((tab) => {
      expect(source).toContain(tab + ': { phase:');
    });
  });

  it('renders field direction and true locally aligned iron filings', () => {
    expect(source).toContain("key: 'arrow' + i");
    expect(source).toContain('var fb = fieldAt(fx, fy, d.magnets)');
    expect(source).toContain("key: 'filing' + fx + ':' + fy");
    expect(source).toContain('short grains align like tiny compasses');
  });

  it('makes the remaining energy transformations visual and testable', () => {
    expect(source).toContain('Force on each active wire side');
    expect(source).toContain("function runInductionTrial(kind)");
    expect(source).toContain('same 40-unit move, same coil, different time');
    expect(source).toContain('ideal trade: voltage ×');
    expect(source).toContain('solar wind arrives from the left');
  });

  it('corrects the crane classification and models evidence accessibly', () => {
    expect(source).toContain('Recycle all 4 ferromagnetic items');
    expect(source).not.toContain('Only the steel will come');
    expect(source).toContain('Schematic field loops make the on/off distinction visible beyond color');
    expect(source).toContain("function mazeBearingAt(gx, gy)");
    expect(source).toContain("key: 'trailLine'");
  });

  it('uses a signed domain vector model and evidence-oriented quiz feedback', () => {
    expect(source).toContain('hysteresisMagnetization');
    expect(source).toContain('signed net magnetization');
    expect(source).toContain('vector sum');
    expect(source).toContain("h('progress'");
    expect(source).toContain('Revise the claim.');
  });
});

describe('magnetism tool — jsdom mount smoke', () => {
  let cfg;
  beforeAll(() => {
    resetStemLab();
    cfg = loadTool(TOOL_PATHS[0], 'magnetism');
  });

  it('seeds state from an empty bucket without crashing', () => {
    // The bridge flushes the seeding setToolData inside act(), so the first
    // paint lands on the real body (past the "Charging the coils" splash).
    const html = mountWithSeed(cfg, null);
    expect(html).toContain('Magnetism &amp; Electromagnetism');
    expect(html).toContain('role="tablist"');
  }, 30000);

  it('renders every tab under jsdom', () => {
    ['field', 'electro', 'motor', 'induce', 'materials', 'crane', 'maze', 'transformer', 'earth', 'quiz'].forEach((tab) => {
      const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab, labShellPanel: 'guide' }));
      expect(html.length).toBeGreaterThan(200);
    });
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'field' }))).toContain('north (N/red)');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'electro' }))).toContain('Turns of wire');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'motor' }))).toContain('commutator');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'crane' }))).toContain('♻️');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'induce' }))).toContain('Voltage scope');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'induce', induceMode: 'eddy' }))).toContain('eddy-current');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'materials' }))).toContain('magnetic domains');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'maze' }))).toContain('hidden magnet');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'transformer' }))).toContain('120 V →');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'earth' }))).toContain('magnetosphere');
  }, 60000);

  it('renders an accessible eddy-current brake bench with force, heat, geometry, and control evidence', async () => {
    const bench = physics.eddyBrakeState(1, 4, false, 6, 6);
    const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'induce', induceMode: 'eddy', notebookOpen: true, labShellPanel: 'evidence' }));
    expect(html).toContain('Sliding-plate brake bench');
    expect(html).toContain('Eddy-current sliding-plate brake bench');
    expect(html).toContain('Plate speed');
    expect(html).toContain('Magnet field strength');
    expect(html).toContain('Solid plate/tube: closed loop');
    expect(html).toContain('One white stripe marks the north pole and two mark the south pole');
    expect(html).toContain('F ∝ vB²');
    expect(html).toContain('Relative magnetic drag');
    expect(html).toContain(Math.round(bench.forcePercent) + '%');
    expect(html).toContain(bench.stoppingDistance.toFixed(1) + ' rel. m');
    expect(html).toContain(Math.round(bench.heatShare) + '%');
    expect(html).toContain('Copper, 4 mm wall, closed loop, speed 6, field 6');
    expect(html).toContain('Tube race · conducting wall versus plastic control');

    const slit = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'induce', induceMode: 'eddy', eddySlit: true, eddyField: 10 }));
    expect(slit).toContain('Slit plate/tube: open loop');
    expect(slit).toContain('open path · weak broken loops');
    expect(slit).toContain('The slit interrupts the large circulating paths');

    const auditHost = document.createElement('main');
    auditHost.innerHTML = html;
    document.body.appendChild(auditHost);
    try {
      const results = await runIsolatedAxe(auditHost.outerHTML, { options: AXE_OPTIONS });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    } finally {
      auditHost.remove();
    }
  }, 60000);

  it('renders the learning cycle and active tab panel for every station', () => {
    ['field', 'electro', 'motor', 'induce', 'materials', 'crane', 'maze', 'transformer', 'earth', 'quiz'].forEach((tab) => {
      const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab, labShellPanel: 'guide' }));
      expect(html).toContain('1 · Predict');
      expect(html).toContain('2 · Test');
      expect(html).toContain('3 · Explain');
      expect(html).toContain('role="tabpanel"');
      expect(html).toContain('id="mag-panel-' + tab + '"');
    });
  }, 30000);

  it('renders accessible cross-station Mission Control with live quest progress', async () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'field', missionPanelOpen: true, labShellPanel: 'mission' }));
    expect(html).toContain('Mission Control');
    expect(html).toContain('Choose a design target');
    expect(html).toContain('Power a remote sensor');
    expect(html).toContain('MISSION TIMELINE · COLLECT → CONNECT → DEFEND');
    expect(html).toContain('0/4 steps');
    expect(html).toContain('Start mission');
    expect(html).toContain('mag-mission-select');
    expect(html).toContain('Design review · what the evidence proves');
    expect(html).toContain('Evidence proves:');
    expect(html).toContain('Pending · Change turns or current.');

    const auditHost = document.createElement('main');
    auditHost.innerHTML = html;
    document.body.appendChild(auditHost);
    try {
      const missionControl = auditHost.querySelector('[role="region"][aria-label="Mission Control"]');
      expect(missionControl).not.toBeNull();
      const results = await runIsolatedAxe(missionControl.outerHTML, { options: AXE_OPTIONS });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    } finally {
      auditHost.remove();
    }

    const partial = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'field', coilTouched: true, peakEMF: 0.8, missionStarted: true, labShellPanel: 'mission' }));
    expect(partial).toContain('2/4 steps');
    expect(partial).toContain('Open next: Tune phase');
    expect(partial).toContain('Done · ');
    expect(partial).toContain('Build field:');
    expect(partial).toContain('Peak induced voltage: 0.80 V.');
    const complete = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'field', coilTouched: true, peakEMF: 0.8, genSpeedSeen: true, genPhaseSeen: true, notebookUsed: true, notebookClaim: 'Changing flux creates voltage.', missionStarted: true, labShellPanel: 'mission' }));
    expect(complete).toContain('Mission complete');
    expect(complete).toContain('Mission evidence complete');
    expect(complete).toContain('Notebook claim recorded.');    expect(complete).toContain('Lab report');
    expect(complete).toContain('Save JSON report');
    expect(complete).toContain('Save CSV data');
    expect(complete).toContain('Claim Evidence Reasoning checklist');
    expect(complete).toContain('Evidence chain');
    expect(complete).toContain('Claim:');
    expect(complete).toContain('Synthesis:');    const replay = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'field', missionStarted: true, replaySelectedIndex: 1, labShellPanel: 'mission',
      notebookTrials: [
        { station: 'Electromagnet', setup: '20 turns, 2 A', result: '4 mT interior field', prediction: 'More turns strengthen the field.' },
        { station: 'Hand generator', setup: '60 turns, magnet moving', result: '0.80 V induced', prediction: 'Faster motion raises voltage.' },
      ],
    }));
    expect(replay).toContain('Replay &amp; compare trials');
    expect(replay).toContain('Trial 2');
    expect(replay).toContain('Hand generator');
    expect(replay).toContain('Live comparison:');    const metricReplay = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'electro', turns: 200, current: 4, missionStarted: true, replaySelectedIndex: 1, labShellPanel: 'mission',
      notebookTrials: [
        { station: 'Electromagnet', setup: '100 turns, 2 A', result: 'field', prediction: 'More turns', metrics: [{ key: 'field_mT', label: 'Center field', value: 5, unit: 'mT', digits: 2, display: '5.00 mT' }] },
        { station: 'Electromagnet', setup: '200 turns, 4 A', result: 'field', prediction: 'More turns', metrics: [{ key: 'field_mT', label: 'Center field', value: 10, unit: 'mT', digits: 2, display: '10.00 mT' }] },
      ],
    }));
    expect(metricReplay).toContain('Quantitative comparison');
    expect(metricReplay).toContain('Recorded 10.00 mT');
    expect(metricReplay).toContain('Live 10.05 mT');

  }, 120000);
  it('makes electromagnet turn count visible and exposes the live setup to assistive tech', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'electro', turns: 200, current: 4 }));
    expect(html).toContain('14 visible loops represent 200 turns');
    expect(html).toContain('A wire coil with 200 turns and 4 amps');
    expect(html).toContain('Run a fair test');
  });

  it('connects motor inputs to paired forces and an energy chain', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'motor', motorCurrent: 5, motorField: 8 }));
    expect(html).toContain('Force on each active wire side ≈ 0.200 N');
    expect(html).toContain('Live torque telemetry');
    expect(html).toContain('Torque cycle phase');
    expect(html).toContain('Torque leverage');
    expect(html).toContain('Motor torque landmarks');
    expect(html).toContain('Motor angle probe');
    expect(html).toContain('Shaft load');
    expect(html).toContain('Load margin');
    expect(html).toContain('LOAD SWEEP');
    expect(html).toContain('Predicted stall load');
    expect(html).toContain('Start load sweep');
    expect(html).toContain('Record peak-torque sample');
    expect(html).toContain('Rotor angle');
    expect(html).toContain('dead spot');
    expect(html).toContain('commutator flip');
    expect(html).toContain('Half-turn 1');
    expect(html).toContain('opposite wire forces create torque');
    expect(html).toContain('battery → moving charges → opposite magnetic forces → rotation');
    expect(html).toContain('Record a torque trial');
    const compared = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'motor',
      notebookTrials: [{ station: 'Motor forces', setup: 'I 3 A · B 4', result: '1.00× torque', prediction: 'More current increases torque.', metrics: [
        { key: 'torque_rel', label: 'Relative torque', value: 1, unit: 'x', digits: 2, display: '1.00 x' },
        { key: 'angle_deg', label: 'Rotor angle', value: 45, unit: 'deg', digits: 0, display: '45 deg' },
      ] }],
    }));
    expect(compared).toContain('Previous trial comparison');
    expect(compared).toContain('Recorded setup: I 3 A · B 4.');
    expect(compared).toContain('· live 1.00× ·');
  });

  it('renders an accessible force-to-power bridge with linked speed and work controls', async () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'motor', motorMode: 'forces', forceLabCurrent: 3, forceLabField: 4, forceLabAngle: 45, forceLabLength: 5, forceLabSpeed: 300,
    }));
    expect(html).toContain('Force → torque → mechanical power');
    expect(html).toContain('MAGNETIC WORK BRIDGE · P = F·v');
    expect(html).toContain('Tangential speed');
    expect(html).toContain('Work per turn');
    expect(html).toContain('Shaft speed (RPM)');
    expect(html).toContain('0 RPM · stop');
    expect(html).toContain('300 RPM · steady');
    expect(html).toContain('P = F·v');
    expect(html).toContain('The moving wire carries the magnetic push through a distance');

    const stopped = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'motor', motorMode: 'forces', forceLabSpeed: 0 }));
    expect(stopped).toContain('Force is ready, but the shaft is stopped. Add motion to see power.');

    const auditHost = document.createElement('main');
    auditHost.innerHTML = html;
    document.body.appendChild(auditHost);
    try {
      const results = await runIsolatedAxe(requiredAuditTarget(auditHost, 'section[aria-label="Magnetic work and power bridge"]').outerHTML, { options: AXE_OPTIONS });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    } finally {
      auditHost.remove();
    }
  }, 60000);
  it('renders an accessible right-hand-rule force lab with linked vectors and curve', async () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'motor', motorMode: 'forces', forceLabCurrent: 3, forceLabField: 4, forceLabAngle: 45, forceLabLength: 5,
    }));
    expect(html).toContain('Right-hand-rule force lab');
    expect(html).toContain('F = I L × B');
    expect(html).toContain('FORCE CURVE · |F| ∝ sin θ');
    expect(html).toContain('Force magnitude');
    expect(html).toContain('Perpendicular fraction');
    expect(html).toContain('0° · parallel');
    expect(html).toContain('90° · maximum');
    expect(html).toContain('Current in wire (I)');
    expect(html).toContain('Wire angle from field (θ)');
    expect(html).toContain('Reverse current');
    expect(html).toContain('Reverse field');
    expect(html).toContain('Force is active.');

    const dead = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'motor', motorMode: 'forces', forceLabAngle: 0 }));
    expect(dead).toContain('No magnetic push at this angle.');

    const auditHost = document.createElement('main');
    auditHost.innerHTML = html;
    document.body.appendChild(auditHost);
    try {
      const results = await runIsolatedAxe(requiredAuditTarget(auditHost, 'section[aria-label="Right-hand-rule wire-force lab"]').outerHTML, { options: AXE_OPTIONS });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    } finally {
      auditHost.remove();
    }
  }, 60000);
  it('keeps Motor investigations visually focused in four persistent submodes', () => {
    const forces = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'motor', motorMode: 'forces' }));
    expect(forces).toContain('Motor forces');
    expect(forces).toContain('Energy systems');
    expect(forces).toContain('Particle beam');
    expect(forces).toContain('Mass analyzer');
    expect(forces).toContain('How a motor spins');
    expect(forces).not.toContain('Coupled motor–generator engineering bench');
    expect(forces).not.toContain('Charged-particle beam — Lorentz force');
    expect(forces).not.toContain('Velocity selector + mass analyzer');

    const energy = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'motor', motorMode: 'energy' }));
    expect(energy).toContain('Coupled motor–generator engineering bench');
    expect(energy).not.toContain('How a motor spins');
    expect(energy).not.toContain('Charged-particle beam — Lorentz force');
    expect(energy).not.toContain('Velocity selector + mass analyzer');

    const particle = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'motor', motorMode: 'particle' }));
    expect(particle).toContain('Charged-particle beam — Lorentz force');
    expect(particle).not.toContain('How a motor spins');
    expect(particle).not.toContain('Coupled motor–generator engineering bench');
    expect(particle).not.toContain('Velocity selector + mass analyzer');

    const analyzer = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'motor', motorMode: 'analyzer' }));
    expect(analyzer).toContain('Velocity selector + mass analyzer');
    expect(analyzer).not.toContain('How a motor spins');
    expect(analyzer).not.toContain('Coupled motor–generator engineering bench');
    expect(analyzer).not.toContain('Charged-particle beam — Lorentz force');
  });

  it('advances the 2D motor torque engine after Run motor is pressed', () => {
    const previousRAF = window.requestAnimationFrame;
    const previousCancel = window.cancelAnimationFrame;
    const frames = [];
    window.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
    window.cancelAnimationFrame = () => {};
    const live = mountLive(cfg, Object.assign({}, BASE, {
      tab: 'motor', motorMode: 'forces', motorView: '2d', motorRunning: false, motorAngle: 90,
    }));
    try {
      const run = Array.from(live.host.querySelectorAll('button')).find((button) => button.textContent.includes('Run motor'));
      expect(run).toBeTruthy();
      const motorSvg = () => Array.from(live.host.querySelectorAll('svg[role="img"]')).find((element) => (element.getAttribute('aria-label') || '').startsWith('Motor model'));
      const before = motorSvg().getAttribute('aria-label');
      act(() => { run.click(); });
      expect(live.host.textContent).toContain('Torque run active.');
      expect(run.textContent).toContain('Stop');
      expect(frames.length).toBeGreaterThan(0);
      const firstFrame = frames.shift();
      act(() => { firstFrame(0); });
      const secondFrame = frames.shift();
      expect(secondFrame).toBeTruthy();
      act(() => { secondFrame(16); });
      expect(motorSvg().getAttribute('aria-label')).not.toBe(before);
      act(() => { run.click(); });
      expect(live.host.textContent).toContain('Torque engine paused.');
    } finally {
      live.unmount();
      if (previousRAF) window.requestAnimationFrame = previousRAF;
      else delete window.requestAnimationFrame;
      if (previousCancel) window.cancelAnimationFrame = previousCancel;
      else delete window.cancelAnimationFrame;
    }
  });

  it('freezes the 2D motor at a landmark angle for inspection', () => {
    const live = mountLive(cfg, Object.assign({}, BASE, {
      tab: 'motor', motorMode: 'forces', motorView: '2d', motorRunning: false, motorAngle: 90,
    }));
    try {
      const landmark = () => Array.from(live.host.querySelectorAll('button')).find((button) => button.textContent.includes('180') && button.textContent.includes('commutator flip'));
      expect(landmark()).toBeTruthy();
      act(() => { landmark().click(); });
      const motorSvg = Array.from(live.host.querySelectorAll('svg[role="img"]')).find((element) => (element.getAttribute('aria-label') || '').startsWith('Motor model'));
      expect(motorSvg.getAttribute('aria-label')).toContain('rotated 180 degrees');
      expect(live.host.textContent).toContain('Half-turn 2');
      expect(landmark().getAttribute('aria-pressed')).toBe('true');
    } finally {
      live.unmount();
    }
  });

  it('completes a predicted-versus-observed load sweep', () => {
    const live = mountLive(cfg, Object.assign({}, BASE, {
      tab: 'motor', motorMode: 'forces', motorView: '2d', motorRunning: false, motorAngle: 45, motorLoad: 0.35,
    }));
    try {
      const button = (label) => Array.from(live.host.querySelectorAll('button')).find((candidate) => candidate.textContent.includes(label));
      const loadInput = () => Array.from(live.host.querySelectorAll('input[type="range"]')).find((input) => (input.getAttribute('aria-valuetext') || '').startsWith('Shaft load'));
      const setLoad = (value) => act(() => {
        const input = loadInput();
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, String(value));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      act(() => { button('Start load sweep').click(); });
      setLoad(0.75);
      act(() => { button('Record peak-torque sample').click(); });
      setLoad(1.25);
      act(() => { button('Record peak-torque sample').click(); });
      expect(live.host.textContent).toContain('Observed boundary');
      expect(live.host.textContent).toContain('Prediction offset: +0.00x.');
      expect(live.host.textContent).toContain('PASS 0.75x');
      expect(live.host.textContent).toContain('STALL 1.25x');
    } finally {
      live.unmount();
    }
  });
  it('scrubs the motor angle probe and pauses the engine', () => {
    const live = mountLive(cfg, Object.assign({}, BASE, {
      tab: 'motor', motorMode: 'forces', motorView: '2d', motorRunning: true, motorAngle: 90,
    }));
    try {
      const angleInput = () => Array.from(live.host.querySelectorAll('input[type="range"]')).find((input) => (input.getAttribute('aria-valuetext') || '').startsWith('Rotor angle'));
      expect(angleInput()).toBeTruthy();
      act(() => {
        const input = angleInput();
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, '135');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      const motorSvg = Array.from(live.host.querySelectorAll('svg[role="img"]')).find((element) => (element.getAttribute('aria-label') || '').startsWith('Motor model'));
      expect(motorSvg.getAttribute('aria-label')).toContain('rotated 135 degrees');
      expect(live.host.textContent).toContain('Torque engine paused.');
      expect(angleInput().getAttribute('aria-valuetext')).toContain('135');
    } finally {
      live.unmount();
    }
  });

  it('surfaces a stalled motor when shaft load exceeds peak torque', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'motor', motorMode: 'forces', motorView: '2d', motorRunning: true, motorAngle: 90, motorLoad: 2,
    }));
    expect(html).toContain('Torque run stalled.');
    expect(html).toContain('Load exceeds available magnetic torque.');
    expect(html).toContain('Stalled');
  });
  it('holds the rotor when load exceeds available torque', () => {
    const previousRAF = window.requestAnimationFrame;
    const previousCancel = window.cancelAnimationFrame;
    const frames = [];
    window.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
    window.cancelAnimationFrame = () => {};
    const live = mountLive(cfg, Object.assign({}, BASE, {
      tab: 'motor', motorMode: 'forces', motorView: '2d', motorRunning: false, motorAngle: 90, motorLoad: 2,
    }));
    try {
      const run = Array.from(live.host.querySelectorAll('button')).find((button) => button.textContent.includes('Run motor'));
      const motorSvg = () => Array.from(live.host.querySelectorAll('svg[role="img"]')).find((element) => (element.getAttribute('aria-label') || '').startsWith('Motor model'));
      act(() => { run.click(); });
      const before = motorSvg().getAttribute('aria-label');
      const firstFrame = frames.shift();
      act(() => { firstFrame(0); });
      const secondFrame = frames.shift();
      act(() => { secondFrame(16); });
      expect(motorSvg().getAttribute('aria-label')).toBe(before);
      expect(live.host.textContent).toContain('Torque run stalled.');
    } finally {
      live.unmount();
      if (previousRAF) window.requestAnimationFrame = previousRAF;
      else delete window.requestAnimationFrame;
      if (previousCancel) window.cancelAnimationFrame = previousCancel;
      else delete window.cancelAnimationFrame;
    }
  });
  it('treats the 360-degree wrap as the 0-degree dead spot', () => {
    const live = mountLive(cfg, Object.assign({}, BASE, {
      tab: 'motor', motorMode: 'forces', motorView: '2d', motorRunning: false, motorAngle: 359.8,
    }));
    try {
      const deadSpot = Array.from(live.host.querySelectorAll('button')).find((button) => button.textContent.includes('dead spot'));
      expect(deadSpot).toBeTruthy();
      expect(deadSpot.getAttribute('aria-pressed')).toBe('true');
    } finally {
      live.unmount();
    }
  });

  it('renders an accessible selector-and-analyzer investigation with notebook evidence', async () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'motor', motorMode: 'analyzer', notebookOpen: true, labShellPanel: 'evidence' }));
    expect(html).toContain('Velocity selector + mass analyzer');
    expect(html).toContain('v = E/B');
    expect(html).toContain('r = mv/(|q|B)');
    expect(html).toContain('Selected speed · E/B');
    expect(html).toContain('2.00');
    expect(html).toContain('PASS — forces cancel at the slit');
    expect(html).toContain('D⁺ and He²⁺ overlap');
    expect(html).toContain('Compare all ion paths: on');
    expect(html).toContain('passed selector');
    ['Electric field E', 'Selector magnetic field B', 'Incoming beam speed v', 'Analyzer magnetic field B'].forEach((label) => expect(html).toContain(label));

    const blocked = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'motor', motorMode: 'analyzer', analyzerSpeed: 5 }));
    expect(blocked).toContain('BLOCKED — beam misses the slit');
    expect(blocked).toContain('Beam blocked.');

    const auditHost = document.createElement('main');
    auditHost.innerHTML = html;
    document.body.appendChild(auditHost);
    try {
      const results = await runIsolatedAxe(requiredAuditTarget(auditHost, '[role="region"][aria-label="Velocity selector + mass analyzer"]').outerHTML, { options: AXE_OPTIONS });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    } finally {
      auditHost.remove();
    }
  }, 60000);
  it('renders an accessible 3D motor torque lab with linked vectors and concept landmarks', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'motor', motorMode: 'forces', motorView: '3d', motor3dStatus: 'ready', motorAngle: 180, notebookOpen: true, labShellPanel: 'evidence',
    }));
    expect(html).toContain('3D torque lab');
    expect(html).toContain('Interactive three-dimensional DC motor');
    expect(html).toContain('split-ring commutator');
    expect(html).toContain('Rotor angle');
    expect(html).toContain('Relative torque');
    expect(html).toContain('Commutator');
    expect(html).toContain('half 2');
    expect(html).toContain('Along field');
    expect(html).toContain('Along shaft');
    expect(html).toContain('Commutator close-up');
    expect(html).toContain('Force + torque vectors: on');
    expect(html).toContain('Current + moment vectors: on');
    expect(html).toContain('0° · dead spot');
    expect(html).toContain('90° · maximum torque');
    expect(html).toContain('180° · commutator flips');
    expect(html).toContain('The loop is at a torque dead spot');
    expect(html).toContain('commutator half 2');
    expect(html).toContain('0.060 N on each active side');

    const failed = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'motor', motorMode: 'forces', motorView: '3d', motor3dStatus: 'error',
    }));
    expect(failed).toContain('3D graphics did not load');
    expect(failed).toContain('complete 2D force diagram remains available');
    expect(failed).toContain('Retry 3D');
  });

  it('renders an accessible 3D particle helix lab with mass analysis, pinned comparison, and fallback', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'motor', motorMode: 'particle', chargeView: '3d', charge3dStatus: 'ready',
      chargeTilt: 45, chargeMass: 2, chargeSign: -1, chargeField: 1, notebookOpen: true, labShellPanel: 'evidence',
      charge3dReference: { chargeSign: -1, fieldSign: 1, speed: 5, field: 4, tilt: 45, mass: 1 },
    }));
    expect(html).toContain('3D helix lab');
    expect(html).toContain('Interactive three-dimensional charged-particle trajectory');
    expect(html).toContain('Gyro radius');
    expect(html).toContain('Pitch / turn');
    expect(html).toContain('helical');
    expect(html).toContain('B ↑ blue field arrows');
    expect(html).toContain('v → gold velocity arrow');
    expect(html).toContain('F → green force arrow');
    expect(html).toContain('− two-ring particle marker');
    expect(html).toContain('Along field');
    expect(html).toContain('Run particle');
    expect(html).toContain('Reset particle');
    expect(html).toContain('Particle position (%)');
    expect(html).toContain('0° · axial line');
    expect(html).toContain('45° · helix');
    expect(html).toContain('90° · circle');
    expect(html).toContain('Velocity tilt from field axis (°)');
    expect(html).toContain('Relative particle mass (m)');
    expect(html).toContain('dashed pale reference path');
    expect(html).toContain('Replace pinned path');
    expect(html).toContain('Clear comparison');
    expect(html).toContain('Fair comparison: only mass changed');
    expect(html).toContain('radius is 2.00× the reference');
    expect(html).toContain('relative mass 2.0');
    expect(html).toContain('fair comparison');
    expect(html).toContain('v∥');
    expect(html).toContain('v⊥');
    expect(html).toContain('tilt 45°');
    expect(html).toContain('helical path');

    const failed = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'motor', motorMode: 'particle', chargeView: '3d', charge3dStatus: 'error',
    }));
    expect(failed).toContain('3D graphics did not load');
    expect(failed).toContain('complete 2D Lorentz-force diagram remains available');
    expect(failed).toContain('Retry 3D');
  });
  it('renders an accessible 3D magnetic-mirror experiment with trapping and escape evidence', () => {
    const trapped = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'motor', motorMode: 'particle', chargeView: '3d', charge3dStatus: 'ready',
      chargeFieldModel: 'mirror', chargeMirrorRatio: 4, chargeTilt: 60, notebookOpen: true, labShellPanel: 'evidence',
    }));
    expect(trapped).toContain('Magnetic environment');
    expect(trapped).toContain('Uniform field');
    expect(trapped).toContain('Magnetic mirror');
    expect(trapped).toContain('Mirror ratio (B ends / B center)');
    expect(trapped).toContain('Critical angle');
    expect(trapped).toContain('30.0°');
    expect(trapped).toContain('trapped');
    expect(trapped).toContain('Magnetically trapped');
    expect(trapped).toContain('three-ring copper mirror coils');
    expect(trapped).toContain('loss-cone boundary');
    expect(trapped).toContain('reflect the particle near y = ±1.00');
    expect(trapped).toContain('turning near ±1.00');

    const passing = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'motor', motorMode: 'particle', chargeView: '3d', charge3dStatus: 'ready',
      chargeFieldModel: 'mirror', chargeMirrorRatio: 4, chargeTilt: 20,
    }));
    expect(passing).toContain('passing');
    expect(passing).toContain('Inside the loss cone');
    expect(passing).toContain('particle reaches an end');
  });
  it('renders an accessible 3D magnetosphere lab with pressure response, layers, evidence, and fallback', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'earth', earthView: '3d', earth3dStatus: 'ready', earthSolarWind: 10, notebookOpen: true, labShellPanel: 'evidence',
    }));
    expect(html).toContain('3D magnetosphere lab');
    expect(html).toContain('Interactive three-dimensional schematic magnetosphere');
    expect(html).toContain('Dayside boundary');
    expect(html).toContain('5.6 R⊕');
    expect(html).toContain('Tail reach');
    expect(html).toContain('30 R⊕');
    expect(html).toContain('Auroral oval');
    expect(html).toContain('60° latitude');
    expect(html).toContain('3D magnetosphere key');
    expect(html).toContain('Perspective');
    expect(html).toContain('Sun-facing');
    expect(html).toContain('Down the tail');
    expect(html).toContain('Polar view');
    expect(html).toContain('Dipole field: on');
    expect(html).toContain('Boundaries: on');
    expect(html).toContain('Belts + aurora: on');
    expect(html).toContain('Solar wind: on');
    expect(html).toContain('Quiet reference: on');
    expect(html).toContain('Animate flow: off');
    expect(html).toContain('Quiet · 2');
    expect(html).toContain('Active · 5');
    expect(html).toContain('Storm · 10');
    expect(html).toContain('blue arrowed curves field direction');
    expect(html).toContain('one/two white rings N/S poles');
    expect(html).toContain('white dashed quiet reference');
    expect(html).toContain('the dayside boundary is 4.2 R⊕ closer to Earth and the tail is 15.0 R⊕ longer');
    expect(html).toContain('storm-level solar wind');
    expect(html).toContain('not a space-weather forecast');
    expect(html).toContain('dayside boundary 5.6 R⊕, tail 30.0 R⊕, auroral oval 60° magnetic latitude');

    const animated = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'earth', earthView: '3d', earth3dStatus: 'ready', earth3dMotion: true,
    }));
    expect(animated).toContain('Animate flow: on');
    expect(animated).toContain('Flow animation is on.');

    const failed = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'earth', earthView: '3d', earth3dStatus: 'error',
    }));
    expect(failed).toContain('3D graphics did not load');
    expect(failed).toContain('complete 2D Earth-field model remains available');
    expect(failed).toContain('Retry 3D');
  });

  it('renders a coupled motor-generator bench with live load, loss, and speed feedback', () => {
    const heavyModel = physics.motorGeneratorBench(3, 4, 10, 3, 80, 4);
    const lightModel = physics.motorGeneratorBench(3, 4, 160, 3, 80, 4);
    const heavy = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'motor', motorMode: 'energy', benchLoadOhms: 10 }));
    const light = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'motor', motorMode: 'energy', benchLoadOhms: 160 }));
    expect(heavy).toContain('Coupled motor');
    expect(heavy).toContain('Motor generator energy bench');
    expect(heavy).toContain('Energy ledger');
    expect(heavy).toContain('Generator load');
    expect(heavy).toContain('Shaft friction');
    expect(heavy).toContain(Math.round(heavyModel.rpm) + ' RPM');
    expect(light).toContain(Math.round(lightModel.rpm) + ' RPM');
    expect(heavyModel.rpm).toBeLessThan(lightModel.rpm);
  });
  it('renders the transient design mission, projected graph, controls, and trial comparison', () => {
    const projected = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'motor', motorMode: 'energy', benchView: 'mission' }));
    expect(projected).toContain('Transient design mission');
    expect(projected).toContain('projected response');
    expect(projected).toContain('shaft speed');
    expect(projected).toContain('generated voltage');
    expect(projected).toContain('useful power');
    expect(projected).toContain('Run &amp; record 10 s trial');
    expect(projected).toContain('Advance 1 s');
    expect(projected).toContain('No completed trials yet');

    const completed = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'motor', motorMode: 'energy', benchView: 'mission', benchMissionStatus: 'passed', benchTime: 10,
      benchTrials: [{ id: 1, loadOhms: 40, turns: 80, field: 4, rpm: 562, voltage: 15.0, power: 5.7, temperature: 35.0, pass: true }],
    }));
    expect(completed).toContain('Motor-generator mission trial comparison');
    expect(completed).toContain('✓ Pass');
    expect(completed).toContain('80 × 4');
  });
  it('overlays a selected prior trial and explains whether the latest comparison is fair', () => {
    const priorTrace = [
      { time: 0, rpm: 0, generatedVoltage: 0, outputPower: 0 },
      { time: 10, rpm: 520, generatedVoltage: 14.5, outputPower: 5.2 },
    ];
    const currentTrace = [
      { time: 0, omega: 0, rpm: 0, generatedVoltage: 0, outputPower: 0, temperature: 22 },
      { time: 10, omega: 60, rpm: 573, generatedVoltage: 15.6, outputPower: 6.1, temperature: 34 },
    ];
    const common = { turns: 80, field: 4, current: 3, motorField: 4, friction: 3 };
    const html = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'motor', motorMode: 'energy', benchView: 'mission', benchMissionStatus: 'passed', benchTime: 10,
      benchTrace: currentTrace, benchCompareTrialId: 1, benchTrialCount: 2,
      benchTrials: [
        Object.assign({ id: 1, loadOhms: 40, rpm: 520, voltage: 14.5, power: 5.2, temperature: 33, pass: true, trace: priorTrace }, common),
        Object.assign({ id: 2, loadOhms: 10, rpm: 573, voltage: 15.6, power: 6.1, temperature: 34, pass: true, trace: currentTrace }, common),
      ],
    }));
    expect(html).toContain('trial #1 · dashed');
    expect(html).toContain('current trial · solid');
    expect(html).toContain('Dashed curves compare trial 1 with the solid current trial');
    expect(html).toContain('generator load only');
    expect(html).toContain('Fair comparison: only generator load changed.');
    expect(html).toContain('aria-pressed="true"');
  });

  it('passes axe WCAG A/AA rules for the coupled motor-generator bench', async () => {
    const auditHost = document.createElement('main');
    auditHost.innerHTML = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'motor', motorMode: 'energy', benchView: 'mission', benchLoadOhms: 40 }));
    document.body.appendChild(auditHost);
    try {
      const ranges = Array.from(auditHost.querySelectorAll('input[type="range"]'));
      expect(ranges.length).toBeGreaterThanOrEqual(4);
      ranges.forEach((range) => {
        expect(auditHost.querySelector('label[for="' + range.id + '"]')).not.toBeNull();
        expect(range.getAttribute('aria-valuetext')).toBeTruthy();
      });
      const results = await runIsolatedAxe(requiredAuditTarget(auditHost, '[role="region"][aria-label="Coupled motor–generator engineering bench"]').outerHTML, { options: AXE_OPTIONS });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    } finally {
      auditHost.remove();
    }
  }, 60000);
  it('makes electromagnet and motor direction experimentally reversible', () => {
    const electro = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'electro', currentDir: -1, windingDir: 1 }));
    expect(electro).toContain('right-hand rule: reverse current OR winding');
    expect(electro).toContain('field points left');
    expect(electro).toContain('Reverse winding');

    const motor = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'motor', motorAngle: 90, motorCurrentDir: -1, motorFieldDir: 1 }));
    expect(motor).toContain('torque τ ∝ I·B·sin θ');
    expect(motor).toContain('counter-clockwise');
    expect(motor).toContain('Reverse current');
    expect(motor).toContain('Flip field');
  });

  it('offers a controlled generator speed comparison with a still control', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'induce' }));
    expect(html).toContain('same 40-unit move, same coil, different time');
    expect(html).toContain('Slow · 1.00 s');
    expect(html).toContain('Fast · 0.25 s');
    expect(html).toContain('Hold still');
  });

  it('organizes generator phenomena into modes and links RPM to frequency and voltage', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'induce', induceMode: 'coil', genAngle: 90, genRPM: 120 }));
    expect(html).toContain('Hand generator · move a magnet');
    expect(html).toContain('Rotating coil · speed and phase');
    expect(html).toContain('Eddy currents · Lenz force');
    expect(html).toContain('120 RPM = 2.00 electrical cycles per second');
    expect(html).toContain('voltage amplitude ×2.00');
    expect(html).not.toContain('Make electricity — the generator');
  });

  it('renders a 3D electromagnet engineering lab with linked field and core models', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'electro', electroView: '3d' }));
    expect(html).toContain('3D Electromagnet Engineering Lab');
    expect(html).toContain('Interactive three-dimensional solenoid');
    expect(html).toContain('Right-hand rule');
    expect(html).toContain('Center field versus current graph');
    expect(html).toContain('Engineer the coil');
    expect(html).toContain('Measure around the coil');
    expect(html).toContain('Soft iron');
    expect(html).toContain('Steel');
    expect(html).toContain('relative heating index');
    expect(html).toContain('Equal ampere-turn engineering comparison');
    expect(html).toContain('Field lines: on');
  });
  it('renders an accessible quantitative field-mapping investigation with controlled data and notebook evidence', async () => {
    const magnet = { x: 0, y: 0, angle: 0, polarity: 1, strength: 1 };
    const scan = physics.fieldScanSeries([magnet], 'axial', [50, 65, 80, 100, 125, 150, 175], 0, 0)
      .map((row, index) => Object.assign({}, row, { id: index + 1, strength: 1 }));
    const html = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'field', fieldView: 'map', fieldMapSamples: scan, fieldMapUsed: true, notebookOpen: true, labShellPanel: 'evidence',
    }));
    expect(html).toContain('Quantitative Field Mapping Lab');
    expect(html).toContain('Measurement lab');
    expect(html).toContain('HALL-PROBE FIELD MAP');
    expect(html).toContain('FIELD VS DISTANCE');
    expect(html).toContain('B ∝ 1/r³');
    expect(html).toContain('Measured |B|');
    expect(html).toContain('Field components');
    expect(html).toContain('Bx ');
    expect(html).toContain('/ By ');
    expect(html).toContain('Power-law exponent');
    expect(html).toContain('-3.00');
    expect(html).toContain('Controlled scan.');
    expect(html).toContain('Run 7-point scan');
    expect(html).toContain('Record current probe');
    expect(html).toContain('Measurement table · 7 recorded readings');
    expect(html).toContain('aria-label="Hall-probe field measurements"');
    expect(html).toContain('Current setup:');
    expect(html).toContain('7 recorded points');
    expect(html).toContain('fitted exponent -3.00');
    expect(html).not.toContain('Trace the invisible field');
    expect(html).not.toContain('3D Magnetic Field Studio');

    const auditHost = document.createElement('main');
    auditHost.innerHTML = html;
    document.body.appendChild(auditHost);
    try {
      const results = await runIsolatedAxe(requiredAuditTarget(auditHost, '[role="region"][aria-label="Quantitative Field Mapping Lab"]').outerHTML, { options: AXE_OPTIONS });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    } finally {
      auditHost.remove();
    }
  }, 60000);
  it('renders an accessible 3D field studio with multiple linked visual layers', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'field', fieldView: '3d' }));
    expect(html).toContain('3D Magnetic Field Studio');
    expect(html).toContain('Interactive three-dimensional magnetic field');
    expect(html).toContain('Vector lattice: on');
    expect(html).toContain('Streamlines: on');
    expect(html).toContain('Heat slice');
    expect(html).toContain('Move and rotate a magnet');
    expect(html).toContain('Measure with the gold probe');
    expect(html).toContain('Find a cancellation point');
    expect(html).toContain('Bx ');
  });
  it('renders a linked 3D induction scene, measurement graph, and controlled trials', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'induce', induceMode: '3d' }));
    expect(html).toContain('3D Induction Lab');
    expect(html).toContain('Interactive three-dimensional induction scene');
    expect(html).toContain('flux through a coil');
    expect(html).toContain('Controlled passage trials');
    expect(html).toContain('Slow pass');
    expect(html).toContain('Fast pass');
    expect(html).toContain('Hold still');
    expect(html).toContain('Move and rotate the magnet');
    expect(html).toContain('Set the coil before a trial');
    expect(html).toContain('Linked magnetic flux and induced voltage graph');
    expect(html).toContain('A field alone is not enough');
  });
  it('renders three additional interactive visual simulation types', () => {
    const field = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'field', pairDistance: 120 }));
    expect(field).toContain('Force bench — distance changes everything');
    expect(field).toContain('Distance Detective · 60 → 120');
    expect(field).toContain('Make an ungraded estimate');
    expect(field).toContain('force ÷ ?');

    const motor = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'motor', motorMode: 'particle', chargeSign: -1, chargeField: 1 }));
    expect(motor).toContain('Charged-particle beam — Lorentz force');
    expect(motor).toContain('F = qv × B');
    expect(motor).toContain('curving down');

    const generator = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'induce', induceMode: 'coil', genAngle: 90 }));
    expect(generator).toContain('Rotating-coil generator — see the phase shift');
    expect(generator).toContain('flux Φ · cos θ');
    expect(generator).toContain('voltage ε · sin θ');
    expect(generator).toContain('Flux crosses zero while changing fastest');
  });

  it('shows the inverse transformer trade instead of voltage alone', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'transformer', xfmrN1: 100, xfmrN2: 400, xfmrAC: true }));
    expect(html).toContain('ideal trade: voltage ×4.00 · current ×0.25');
    expect(html).toContain('power does not multiply');
  });

  it('renders solar-wind compression, magnetotail, and signed declination', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'earth', declination: -17 }));
    expect(html).toContain('magnetotail');
    expect(html).toContain('declination -17°');
    expect(html).toContain('17° west of true north');
  });

  it('turns material results into a transferable classification rule', () => {
    const guesses = { nail: true, clip: true, nickel: true, cobalt: true, foil: false, penny: false, ruler: false, pencil: false };
    const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'materials', matGuesses: guesses, matRevealed: true, domainAlign: 1 }));
    expect(html).toContain('Pattern found');
    expect(html).toContain('“Metal” alone was not enough');
    expect(html).toContain('100% net');
    expect(html).toContain('vector sum');
  });

  it('names the crane target correctly and supplies object-level prediction context', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'crane', craneSlot: 1, cranePower: true }));
    expect(html).toContain('iron, steel, nickel, and cobalt');
    expect(html).toContain('Crane is over:');
    expect(html).toContain('Aluminum foil');
    expect(html).not.toContain('Only the steel will come');
  });

  it('provides a textual Field Walk bearing and a connected evidence trail', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'maze', mazeTrail: ['1,7', '2,7'] }));
    expect(html).toContain('Read the needle');
    expect(html).toContain('closest to the red needle direction');
    expect(html).toContain('<polyline');
    expect(html).toContain('connected trail');
  });

  it('supports guided and challenge investigations without giving away the challenge path', () => {
    const guided = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'maze', learningMode: 'guided', labShellPanel: 'guide' }));
    expect(guided).toContain('1 · Predict');
    expect(guided).toContain('gold-outlined step');

    const challenge = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'maze', learningMode: 'challenge', labShellPanel: 'guide' }));
    expect(challenge).toContain('Design your own fair test');
    expect(challenge).toContain('No path hint is shown');
    expect(challenge).not.toContain('gold-outlined step');
  });

  it('renders a cross-station claim-evidence-reasoning notebook with saved trials', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'field', notebookOpen: true, labShellPanel: 'evidence', notebookPrediction: 'A larger gap will weaken the force.',
      notebookClaim: 'Force falls rapidly with distance.',
      notebookTrials: [{ station: 'See the field', setup: 'gap 60', result: '1.000× relative pair force', prediction: 'Closer is stronger.' }],
    }));
    expect(html).toContain('Investigation notebook — claim, evidence, reasoning');
    expect(html).toContain('Prediction before this trial');
    expect(html).toContain('Recorded evidence trials');
    expect(html).toContain('gap 60 → 1.000× relative pair force');
    expect(html).toContain('Claim supported by your evidence');
  });

  it('adds topic-aware quiz progress and corrective reflection', () => {
    const fresh = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'quiz' }));
    expect(fresh).toContain('Topic · 🧭 Field Explorer');
    expect(fresh).toContain('<progress');
    const revised = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'quiz', quizIdx: 0, quizPicked: 2, quizScore: 0 }));
    expect(revised).toContain('Revise the claim');
    expect(revised).toContain('Evidence collected: 0 correct across 1 answered');
  });

  it('renders the quiz results view when done', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'quiz', quizDone: true, quizScore: 8 }));
    expect(html).toContain('8 / 22');
  });

  it('quest hooks fire on the right state', () => {
    const hooks = Object.fromEntries(cfg.questHooks.map((q) => [q.id, q.check]));
    expect(hooks.mag_field({ magnetism: { compassMoved: true } })).toBe(true);
    expect(hooks.mag_field({ magnetism: { field3dUsed: true } })).toBe(true);
    expect(hooks.mag_field({ magnetism: {} })).toBe(false);
    expect(hooks.mag_pair({ magnetism: { sawAttract: true, sawRepel: true } })).toBe(true);
    expect(hooks.mag_pair({ magnetism: { sawAttract: true } })).toBe(false);
    expect(hooks.mag_force_bench({ magnetism: { forceBenchUsed: true } })).toBe(true);
    expect(hooks.mag_force_bench({ magnetism: {} })).toBe(false);
    expect(hooks.mag_electro({ magnetism: { coilTouched: true } })).toBe(true);
    expect(hooks.mag_direction({ magnetism: { directionSeen: true } })).toBe(true);
    expect(hooks.mag_direction({ magnetism: {} })).toBe(false);
    expect(hooks.mag_motor({ magnetism: { motorRan: true } })).toBe(true);
    expect(hooks.mag_motor_direction({ magnetism: { motorDirectionSeen: true } })).toBe(true);
    expect(hooks.mag_lorentz({ magnetism: { lorentzUsed: true } })).toBe(true);
    expect(hooks.mag_earth({ magnetism: { earthSeen: true } })).toBe(true);
    expect(hooks.mag_induce({ magnetism: { peakEMF: 0.6 } })).toBe(true);
    expect(hooks.mag_induce({ magnetism: { ind3dUsed: true } })).toBe(true);
    expect(hooks.mag_induce({ magnetism: { peakEMF: 0.2 } })).toBe(false);
    expect(hooks.mag_generator_phase({ magnetism: { genSpeedSeen: true, genPhaseSeen: true } })).toBe(true);
    expect(hooks.mag_generator_phase({ magnetism: { genSpeedSeen: true } })).toBe(false);
    expect(hooks.mag_materials({ magnetism: { matPerfect: true } })).toBe(true);
    expect(hooks.mag_materials({ magnetism: {} })).toBe(false);
    expect(hooks.mag_crane({ magnetism: { craneDone: true } })).toBe(true);
    expect(hooks.mag_crane({ magnetism: {} })).toBe(false);
    expect(hooks.mag_domains({ magnetism: { domainsFull: true } })).toBe(true);
    expect(hooks.mag_domains({ magnetism: {} })).toBe(false);
    expect(hooks.mag_maze({ magnetism: { mazeWins: 1 } })).toBe(true);
    expect(hooks.mag_maze({ magnetism: {} })).toBe(false);
    expect(hooks.mag_investigator({ magnetism: { notebookUsed: true } })).toBe(true);
    expect(hooks.mag_investigator({ magnetism: {} })).toBe(false);
    expect(hooks.mag_quiz({ magnetism: { quizBest: 15 } })).toBe(true);
    expect(hooks.mag_quiz({ magnetism: { quizBest: 14 } })).toBe(false);
  });
});

describe('magnetism tool — induction (Faraday + Lenz)', () => {
  it('a still magnet induces exactly zero EMF', () => {
    expect(Math.abs(physics.induceEMF(50, -40, -40, 1, 40))).toBe(0);
  });

  it('EMF is linear in turns and larger when the flux gradient is steep', () => {
    const base = physics.induceEMF(50, -40, -20, 1, 40);
    expect(physics.induceEMF(100, -40, -20, 1, 40) / base).toBeCloseTo(2, 9); // 2× turns
    const far = physics.induceEMF(50, -100, -80, 1, 40);
    expect(Math.abs(base)).toBeGreaterThan(Math.abs(far)); // same step, nearer the coil → more EMF
  });

  it("Lenz's law: reversing the motion reverses the EMF sign", () => {
    const inward = physics.induceEMF(50, -40, -20, 1, 40);
    const outward = physics.induceEMF(50, -20, -40, 1, 40);
    expect(Math.sign(inward)).toBe(-Math.sign(outward));
  });

  it('flux peaks with the magnet centred in the coil and vanishes far away', () => {
    expect(physics.fluxAt(0, 40)).toBe(1);
    expect(physics.fluxAt(100, 40)).toBeLessThan(0.01);
    expect(physics.fluxAt(-30, 40)).toBeCloseTo(physics.fluxAt(30, 40), 12); // symmetric
  });
});

describe('magnetism tool — materials sorter', () => {
  it('exactly the ferromagnetic trio (+steel) are magnetic; 8 items total', () => {
    expect(physics.MATERIALS.length).toBe(8);
    const magnetic = physics.MATERIALS.filter((m) => m.magnetic).map((m) => m.id).sort();
    expect(magnetic).toEqual(['clip', 'cobalt', 'nail', 'nickel']);
    physics.MATERIALS.forEach((m) => {
      expect(typeof m.why).toBe('string');
      expect(m.why.length).toBeGreaterThan(10);
    });
  });

  it('the aluminum/copper misconception is addressed head-on', () => {
    const source = readFileSync(TOOL_PATHS[0], 'utf8');
    expect(source).toContain('NOT ferromagnetic');
    expect(source).toContain('iron, nickel, and cobalt');
  });
});

describe('magnetism tool — transformer (mutual induction)', () => {
  it('obeys the turns-ratio law V2/V1 = N2/N1 for AC', () => {
    expect(physics.transformerOut(120, 100, 200, true)).toBeCloseTo(240, 9);  // step-up
    expect(physics.transformerOut(120, 100, 50, true)).toBeCloseTo(60, 9);    // step-down
    expect(physics.transformerOut(120, 100, 100, true)).toBeCloseTo(120, 9);  // 1:1
  });

  it('DC input induces nothing — transformers are AC-only', () => {
    expect(physics.transformerOut(120, 100, 200, false)).toBe(0);
    expect(physics.transformerOut(500, 25, 400, false)).toBe(0);
  });

  it('the energy-conservation caveat is disclosed (no free energy)', () => {
    const source = readFileSync(TOOL_PATHS[0], 'utf8');
    expect(source).toContain('power stays conserved');
    expect(source).toContain('loss ∝ I²R');
  });
});

describe('magnetism tool — junkyard crane', () => {
  it('the lineup interleaves magnetic and non-magnetic items, bin one past the end', () => {
    expect(physics.CRANE_ORDER.length).toBe(8);
    expect(physics.BIN_SLOT).toBe(8);
    const pattern = physics.CRANE_ORDER
      .map((id) => physics.MATERIALS.find((m) => m.id === id).magnetic ? 'M' : '-')
      .join('');
    expect(pattern).toBe('M-M-M-M-');   // every move is a decision
  });

  it('every crane item exists in the MATERIALS bank', () => {
    const ids = new Set(physics.MATERIALS.map((m) => m.id));
    physics.CRANE_ORDER.forEach((id) => expect(ids.has(id)).toBe(true));
  });

  it('the crane teaches the off-switch superpower in its copy', () => {
    const source = readFileSync(TOOL_PATHS[0], 'utf8');
    expect(source).toContain('a magnet with an off switch');
    expect(source).toContain('is not ferromagnetic, so the field slides right past it');
  });
});

describe('magnetism tool — domains, scope, eddy (R4)', () => {
  it('domain angles are deterministic (hash, not Math.random) and scrambled at 0', () => {
    expect(physics.domainAngle(7, 0)).toBe(physics.domainAngle(7, 0));
    const angles = [...Array(40)].map((_, i) => physics.domainAngle(i, 0));
    expect(angles.some((a) => a > 0.5)).toBe(true);   // both signs present:
    expect(angles.some((a) => a < -0.5)).toBe(true);  // a genuine jumble
  });

  it('alignment interpolates linearly to zero (fully magnetized)', () => {
    const base = physics.domainAngle(7, 0);
    expect(physics.domainAngle(7, 0.5)).toBeCloseTo(base / 2, 12);
    expect(Math.abs(physics.domainAngle(7, 1))).toBe(0);   // ±0 both fine
    expect(Math.abs(physics.domainAngle(23, 1))).toBe(0);
    // clamped outside [0,1]
    expect(Math.abs(physics.domainAngle(7, 2))).toBe(0);
    expect(physics.domainAngle(7, -1)).toBeCloseTo(base, 12);
  });

  it('the EMF scope trace is rolling-capped and the AC discovery is student-earned', () => {
    const source = readFileSync(TOOL_PATHS[0], 'utf8');
    expect(source).toContain('if (trace.length > 72)');
    expect(source).toContain('You just generated AC');
    // the AC banner requires swings in BOTH directions, not one big pull
    expect(source).toContain('v > 0.4');
    expect(source).toContain('v < -0.4');
  });

  it('the eddy race respects reduced motion and stays honest about scale', () => {
    const source = readFileSync(TOOL_PATHS[0], 'utf8');
    expect(source).toContain('classroom-demo-scale timings');
    expect(source).toContain('_prefersReducedMotion) {');
    expect(source).toContain('eddy currents');
    expect(source).toContain('Curie');
  });
});

describe('magnetism tool — Field Walk + strength + cycles (R5)', () => {
  it('magnet strength scales the dipole field linearly (default 1)', () => {
    const f1 = physics.fieldAt(50, 0, [{ x: 0, y: 0, angle: 0, polarity: 1 }]);
    const f2 = physics.fieldAt(50, 0, [{ x: 0, y: 0, angle: 0, polarity: 1, strength: 2 }]);
    expect(f2.x / f1.x).toBeCloseTo(2, 12);
    const f3 = physics.fieldAt(50, 0, [{ x: 0, y: 0, angle: 0, polarity: 1, strength: 1 }]);
    expect(f3.x).toBeCloseTo(f1.x, 15); // explicit 1 === omitted
  });

  it('countCycles finds full alternations and ignores sub-threshold noise', () => {
    expect(physics.countCycles([])).toBe(0);
    expect(physics.countCycles([0.5, 0.8, 0.5])).toBe(0);           // one push, no cycle
    expect(physics.countCycles([0.5, -0.5, 0.6, -0.6])).toBe(1);    // one full wiggle
    expect(physics.countCycles([1, -1, 1, -1, 1])).toBe(2);         // two cycles
    expect(physics.countCycles([0.1, -0.1, 0.1, -0.1])).toBe(0);    // noise < threshold
  });

  it('every Field Walk round keeps the magnet on the board and the start far from the target', () => {
    physics.MAZE_ROUNDS.forEach((r, i) => {
      expect(Math.abs(r.x)).toBeLessThanOrEqual(110);
      expect(Math.abs(r.y)).toBeLessThanOrEqual(77);
      const poles = physics.mazePoles(i);
      const st = physics.mazeCellToField(r.start[0], r.start[1]);
      const dS = Math.hypot(st.x - poles.s.x, st.y - poles.s.y);
      expect(dS).toBeGreaterThan(22 * 3); // no instant wins
    });
  });

  it('every round is WINNABLE by following the needle (the game honors its own physics)', () => {
    // Walk downstream along the field from each start; must reach the S pole.
    physics.MAZE_ROUNDS.forEach((r, i) => {
      const mag = { x: r.x, y: r.y, angle: r.angle, polarity: r.polarity };
      const poles = physics.mazePoles(i);
      let p = physics.mazeCellToField(r.start[0], r.start[1]);
      let reached = false;
      for (let k = 0; k < 400; k++) {
        const b = physics.fieldAt(p.x, p.y, [mag]);
        const bm = Math.hypot(b.x, b.y);
        if (bm < 1e-15) break;
        p = { x: p.x + 6 * b.x / bm, y: p.y + 6 * b.y / bm };
        if (Math.hypot(p.x - poles.s.x, p.y - poles.s.y) < 22 * 1.2) { reached = true; break; }
      }
      expect(reached).toBe(true);
    });
  });

  it('the S-pole payoff and Earth naming-joke are in the win copy', () => {
    const source = readFileSync(TOOL_PATHS[0], 'utf8');
    expect(source).toContain('Field lines flow into south poles');
    expect(source).toContain('naming joke');
    expect(source).toContain('magnetometer surveys');
  });
});

describe('magnetism tool — journey strip + quiz study loop (R6)', () => {
  it('QUIZ_TABS maps every question to a real tab across at least 6 topics', () => {
    expect(physics.QUIZ_TABS.length).toBe(physics.QUIZ.length);
    const tabIds = ['field', 'electro', 'motor', 'induce', 'materials', 'crane', 'maze', 'transformer', 'earth', 'quiz'];
    physics.QUIZ_TABS.forEach((t) => expect(tabIds).toContain(t));
    expect(new Set(physics.QUIZ_TABS).size).toBeGreaterThanOrEqual(6); // broad coverage
  });

  it('the pass threshold is a single source of truth at ~70%', () => {
    expect(physics.QUIZ_PASS).toBe(15);
    const source = readFileSync(TOOL_PATHS[0], 'utf8');
    expect(source).toContain("label: 'Score 15+ on the magnetism quiz'");
    expect(source).toContain('>= QUIZ_PASS');
    expect(source).not.toContain('quizScore >= 9'); // no stale hardcoded threshold
  });

  it('every quest def carries a learning-path tab that exists', () => {
    const source = readFileSync(TOOL_PATHS[0], 'utf8');
    expect(source).toContain('var QUEST_DEFS = [');
    expect(source).toContain('questHooks: QUEST_DEFS');
    // every def declares a tab:
    const defBlock = source.slice(source.indexOf('var QUEST_DEFS'), source.indexOf('var EXPEDITION_CHAPTERS'));
    const tabCount = (defBlock.match(/tab: '/g) || []).length;
    expect(tabCount).toBe(21);
  });

  describe('mounted', () => {
    let cfg;
    beforeAll(() => {
      resetStemLab();
      cfg = loadTool(TOOL_PATHS[0], 'magnetism');
    });

    it('renders the expedition map with fresh-state progress 0/21', () => {
      const html = mountWithSeed(cfg, Object.assign({}, BASE, { labShellPanel: 'journey' }));
      expect(html).toContain('Journey 0/21');
    });

    it('journey chips light up as quests complete', () => {
      const html = mountWithSeed(cfg, Object.assign({}, BASE, { compassMoved: true, motorRan: true, earthSeen: true, labShellPanel: 'journey' }));
      expect(html).toContain('Journey 3/21');
    });

    it('a failed quiz offers Study buttons for exactly the missed topics', () => {
      const html = mountWithSeed(cfg, Object.assign({}, BASE, {
        tab: 'quiz', quizDone: true, quizScore: 8, quizMissed: [0, 3, 12],
      }));
      expect(html).toContain('missed questions came from');
      expect(html).toContain('Study: 🧭 Field Explorer');   // Q0 → field
      expect(html).toContain('Study: 🔌 Electromagnet');    // Q3 → electro
      expect(html).toContain('Study: 🔁 Transformer');      // Q12 → transformer
      expect(html).not.toContain('Study: 🌍');              // earth not missed
    });

    it('a perfect quiz shows no study section', () => {
      const html = mountWithSeed(cfg, Object.assign({}, BASE, {
        tab: 'quiz', quizDone: true, quizScore: 22, quizMissed: [],
      }));
      expect(html).not.toContain('missed questions came from');
      expect(html).toContain('Field mastery unlocked');
    });
  });
});

describe('magnetism tool — WCAG 2.2 interaction and alternate-state regression', () => {
  let cfg;
  beforeAll(() => {
    resetStemLab();
    cfg = loadTool(TOOL_PATHS[0], 'magnetism');
  });

  it('implements the complete keyboard tab pattern and explicit tab-panel names', () => {
    const source = readFileSync(TOOL_PATHS[0], 'utf8');
    expect(source).toContain("event.key === 'ArrowRight'");
    expect(source).toContain("event.key === 'ArrowLeft'");
    expect(source).toContain("event.key === 'Home'");
    expect(source).toContain("event.key === 'End'");
    expect(source).toContain("id: 'mag-tab-' + t.id");
    expect(source).toContain("tabIndex: on ? 0 : -1");
    const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'motor' }));
    expect(html).toContain('id="mag-tab-motor"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('id="mag-panel-motor"');
    expect(html).toContain('aria-labelledby="mag-tab-motor"');
  });

  it('associates every rendered range with a visible label and dynamic value text', () => {
    [
      Object.assign({}, BASE, { tab: 'field', fieldView: '3d' }),
      Object.assign({}, BASE, { tab: 'field', fieldView: 'map' }),
      Object.assign({}, BASE, { tab: 'electro', electroView: '3d' }),
      Object.assign({}, BASE, { tab: 'induce', induceMode: '3d' }),
      Object.assign({}, BASE, { tab: 'earth', earthView: '3d' }),
      Object.assign({}, BASE, { tab: 'motor', motorMode: 'forces', motorView: '3d' }),
      Object.assign({}, BASE, { tab: 'motor', motorMode: 'particle', chargeView: '3d' }),
      Object.assign({}, BASE, { tab: 'motor', motorMode: 'analyzer' }),
      Object.assign({}, BASE, { tab: 'motor', motorMode: 'particle', chargeView: '3d', chargeFieldModel: 'mirror', chargeMirrorRatio: 4, chargeTilt: 60 }),
      Object.assign({}, BASE, { tab: 'induce', induceMode: 'hand' }),
      Object.assign({}, BASE, { tab: 'induce', induceMode: 'eddy' }),
    ].forEach((seed) => {
      const html = mountWithSeed(cfg, seed);
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const ranges = Array.from(doc.querySelectorAll('input[type="range"]'));
      expect(ranges.length).toBeGreaterThan(0);
      ranges.forEach((range) => {
        expect(range.id).not.toBe('');
        expect(doc.querySelector('label[for="' + range.id + '"]')).not.toBeNull();
        expect(range.getAttribute('aria-valuetext')).toBeTruthy();
      });
    });
  }, 30000);

  it('gives every 3D canvas a live load state, non-color key, and resolvable text alternative', () => {
    [
      Object.assign({}, BASE, { tab: 'field', fieldView: '3d' }),
      Object.assign({}, BASE, { tab: 'electro', electroView: '3d' }),
      Object.assign({}, BASE, { tab: 'induce', induceMode: '3d' }),
      Object.assign({}, BASE, { tab: 'earth', earthView: '3d' }),
      Object.assign({}, BASE, { tab: 'motor', motorMode: 'forces', motorView: '3d' }),
      Object.assign({}, BASE, { tab: 'motor', motorMode: 'particle', chargeView: '3d' }),
      Object.assign({}, BASE, { tab: 'motor', motorMode: 'particle', chargeView: '3d', chargeFieldModel: 'mirror', chargeMirrorRatio: 4, chargeTilt: 60 }),
    ].forEach((seed) => {
      const html = mountWithSeed(cfg, seed);
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const canvas = doc.querySelector('canvas[role="img"]');
      expect(canvas).not.toBeNull();
      const describedBy = (canvas.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      expect(describedBy.length).toBeGreaterThanOrEqual(2);
      describedBy.forEach((id) => expect(doc.getElementById(id)).not.toBeNull());
      if (seed.earthView === '3d') {
        const earthKey = doc.querySelector('[aria-label="3D magnetosphere key"]');
        expect(earthKey).not.toBeNull();
        expect(earthKey.textContent).toContain('solar wind');
      } else if (seed.chargeView === '3d') {
        const vectorKey = doc.querySelector('[aria-label="3D vector key"]');
        expect(vectorKey).not.toBeNull();
        expect(vectorKey.textContent).toContain('velocity arrow');
      } else {
        expect(doc.querySelector('.mag-pole-key')).not.toBeNull();
        expect(doc.querySelector('.mag-pole-chip').textContent).toBe('N');
      }
      expect(doc.querySelector('details.mag-scene-text')).not.toBeNull();
      expect(doc.querySelector('[role="status"][aria-live="polite"][aria-atomic="true"]')).not.toBeNull();
    });
  }, 30000);

  [
    { label: 'field studio', seed: Object.assign({}, BASE, { tab: 'field', fieldView: '3d' }) },
    { label: 'electromagnet lab', seed: Object.assign({}, BASE, { tab: 'electro', electroView: '3d' }) },
    { label: 'induction studio', seed: Object.assign({}, BASE, { tab: 'induce', induceMode: '3d' }) },
    { label: 'magnetosphere lab', seed: Object.assign({}, BASE, { tab: 'earth', earthView: '3d' }) },
    { label: 'motor torque lab', seed: Object.assign({}, BASE, { tab: 'motor', motorMode: 'forces', motorView: '3d' }) },
    { label: 'particle helix lab', seed: Object.assign({}, BASE, { tab: 'motor', motorMode: 'particle', chargeView: '3d' }) },
    { label: 'magnetic mirror lab', seed: Object.assign({}, BASE, { tab: 'motor', motorMode: 'particle', chargeView: '3d', chargeFieldModel: 'mirror', chargeMirrorRatio: 4, chargeTilt: 60 }) },
  ].forEach(({ label, seed }) => {
    it('passes axe WCAG A/AA rules in the 3D ' + label, async () => {
      const auditHost = document.createElement('main');
      auditHost.innerHTML = mountWithSeed(cfg, seed);
      document.body.appendChild(auditHost);
      try {
        const results = await runIsolatedAxe(active3DAuditTarget(auditHost).outerHTML, { options: AXE_OPTIONS });
        expect(results.violations.map((violation) => violation.id)).toEqual([]);
      } finally {
        auditHost.remove();
      }
    }, 120000);
  });

  it('protects contrast, focus, targets, reduced motion, and forced-colors behavior', () => {
    const source = readFileSync(TOOL_PATHS[0], 'utf8');
    expect(source).toContain("var ACTIVE = '#be123c'");
    expect(source).not.toMatch(/background:\s*[^,\n]*\?\s*'#f43f5e'/);
    expect(source).toContain('min-height:36px');
    expect(source).toContain('outline:3px solid #fbbf24');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');
    expect(source).toContain('@media(forced-colors:active)');
    expect(source).toContain('Every pointer action has a labeled control below.');
    expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')");
    expect(source).toContain('window.requestAnimationFrame(animationStep)');
    expect(source).toContain('window.cancelAnimationFrame(animationFrame)');
  });
});
describe('magnetism tool — visual simulation instrumentation refinement', () => {
  let cfg;
  beforeAll(() => {
    resetStemLab();
    cfg = loadTool(TOOL_PATHS[0], 'magnetism');
  });

  it('places compact live instrumentation inside every 3D scene frame', () => {
    const cases = [
      { seed: Object.assign({}, BASE, { tab: 'field', fieldView: '3d' }), labels: ['Probe |B|', 'Net / sources', 'x · y · z'] },
      { seed: Object.assign({}, BASE, { tab: 'electro', electroView: '3d' }), labels: ['Center field', 'Ampere-turns', 'coil axis · x'] },
      { seed: Object.assign({}, BASE, { tab: 'induce', induceMode: '3d' }), labels: ['Magnetic flux', 'Induced voltage', '−dΦ / dt'] },
      { seed: Object.assign({}, BASE, { tab: 'earth', earthView: '3d' }), labels: ['Dayside boundary', 'Tail reach', 'Auroral oval', 'solar wind · +x'] },
      { seed: Object.assign({}, BASE, { tab: 'motor', motorMode: 'forces', motorView: '3d' }), labels: ['Rotor angle', 'Relative torque', 'Commutator', 'shaft · y'] },
      { seed: Object.assign({}, BASE, { tab: 'motor', motorMode: 'particle', chargeView: '3d' }), labels: ['Path', 'Gyro radius', 'Pitch / turn', 'B axis · y'] },
      { seed: Object.assign({}, BASE, { tab: 'motor', motorMode: 'particle', chargeView: '3d', chargeFieldModel: 'mirror', chargeMirrorRatio: 4, chargeTilt: 60 }), labels: ['Path', 'Gyro radius', 'Critical angle', 'B axis · y'] },
    ];
    cases.forEach(({ seed, labels }) => {
      const html = mountWithSeed(cfg, seed);
      expect(html).toContain('class="mag-scene-frame"');
      expect(html).toContain('class="mag-scene-hud"');
      labels.forEach((label) => expect(html).toContain(label));
    });
  });

  it('marks pole identity spatially with one-versus-two stripes or rings', () => {
    const source = readFileSync(TOOL_PATHS[0], 'utf8');
    expect((source.match(/poleStripe = stripeIndex === 0 \? 'north-one' : 'south-two'/g) || []).length).toBe(2);
    expect(source).toContain('var ringRadii = isNorth ? [0.34] : [0.25, 0.42]');
    expect(source).toContain('N or one bright stripe');
    expect(source).toContain('S or two bright stripes');
    expect(source).toContain('one bright ring');
    expect(source).toContain('two bright rings');
  });

  it('uses direct graph labels, current markers, and a segmented field meter', () => {
    const source = readFileSync(TOOL_PATHS[0], 'utf8');
    expect(source).toContain('air · linear');
    expect(source).toContain('flux Φ · solid');
    expect(source).toContain('voltage ε · dashed');
    expect(source).toContain("className: 'mag-strength-meter'");
    expect(source).toContain("className: bar <= level ? 'is-on' : ''");
    const field = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'field' }));
    expect(field).toContain('mag-strength-meter');
  });
});
describe('magnetism tool — energy and space-weather visual refinement', () => {
  let cfg;
  beforeAll(() => {
    resetStemLab();
    cfg = loadTool(TOOL_PATHS[0], 'magnetism');
  });

  it('makes motor torque direction and dead spots visually explicit', () => {
    const clockwise = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'motor', motorCurrent: 3, motorField: 4, motorCurrentDir: 1, motorFieldDir: 1,
    }));
    const counter = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'motor', motorCurrent: 3, motorField: 4, motorCurrentDir: -1, motorFieldDir: 1,
    }));
    expect(clockwise).toContain('clockwise torque');
    expect(counter).toContain('counter-clockwise torque');
    const source = readFileSync(TOOL_PATHS[0], 'utf8');
    expect(source).toContain("stroke: 'rgba(251,113,133,.28)'");
    expect(source).toContain('rotationArc');
  });

  it('renders an accessible rotating-generator phase wheel with signed readings', async () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'induce', induceMode: 'coil', genAngle: 90, genRPM: 120,
    }));
    expect(html).toContain('PHASE WHEEL · Φ = cos θ  /  ε = sin θ');
    expect(html).toContain('90° phase gap · voltage peaks when flux crosses zero');
    expect(html).toContain('Flux minimum · 180°');
    expect(html).toContain('Voltage minimum · 270°');
    expect(html).toContain('Phase wheel at 90 degrees');
    expect(html).toContain('Flux is 0.00 of its amplitude');
    expect(html).toContain('voltage is 1.00 of its amplitude');

    const auditHost = document.createElement('main');
    auditHost.innerHTML = html;
    document.body.appendChild(auditHost);
    try {
      const results = await runIsolatedAxe(requiredAuditTarget(auditHost, '[role="region"][aria-label="Rotating-coil generator — see the phase shift"]').outerHTML, { options: AXE_OPTIONS });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    } finally {
      auditHost.remove();
    }
  }, 60000);
  it('pairs rotating-generator phase curves with solid/dashed labels and distinct point shapes', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'induce', induceMode: 'coil', genAngle: 90, genRPM: 120,
    }));
    expect(html).toContain('rotation ω');
    expect(html).toContain('flux Φ · cos θ · solid');
    expect(html).toContain('voltage ε · sin θ · dashed');
    expect(html).toContain('Relative magnetic flux · solid curve');
    expect(html).toContain('Relative induced voltage · dashed curve');
  });

  it('shows transformer flux flow and pressure-driven magnetosphere states', () => {
    const ac = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'transformer', xfmrAC: true }));
    const dc = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'transformer', xfmrAC: false }));
    expect(ac).toContain('changing flux Φ');
    expect(dc).toContain('steady flux · no induction');

    const quiet = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'earth', earthSolarWind: 2 }));
    const storm = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'earth', earthSolarWind: 10 }));
    expect(quiet).toContain('pressure 2/10');
    expect(quiet).toContain('quiet solar wind at level 2 of 10');
    expect(quiet).toContain('Two-dimensional Earth magnetosphere comparison');
    expect(quiet).toContain('quiet reference');
    expect(quiet).toContain('current boundary');
    expect(quiet).toContain('dayside 9.3 R⊕');
    expect(quiet).toContain('tail 17 R⊕');
    expect(quiet).toContain('auroral oval ≈68°');
    expect(quiet).toContain('Field loops include direction arrowheads');
    expect(storm).toContain('pressure 10/10');
    expect(storm).toContain('storm-level solar wind at level 10 of 10');
    expect(storm).toContain('bow shock');
    expect(storm).toContain('auroral oval ≈60°');
    expect(storm).toContain('dayside 5.6 R⊕');
    expect(storm).toContain('tail 30 R⊕');
    expect(storm).toContain('A dashed outline preserves the quiet reference');
  });
});
