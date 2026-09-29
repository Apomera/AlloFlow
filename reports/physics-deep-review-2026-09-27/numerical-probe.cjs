'use strict';

// Audit-only harness: uses the existing source functions without editing them.
// Run from the repository root: node reports/physics-deep-review-2026-09-27/numerical-probe.cjs
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sourcePath = path.resolve(__dirname, '../../stem_lab/stem_tool_physics.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const start = source.indexOf('  var PHYS_DT');
const end = source.indexOf('  try {', start);
if (start < 0 || end < 0) throw new Error('Cannot locate source integrator');
const P = new Function(source.slice(start, end) + '\nreturn { DT: PHYS_DT, step: physStep, simulate: physSimulate, solveVelocity: physSolveVelocity, solveAngle: physSolveAngle };')();

function launchState(angle, velocity, gravity, drag, mass = 1) {
  const theta = angle * Math.PI / 180;
  return { mX: 0, mY: 0, mVx: velocity * Math.cos(theta), mVy: velocity * Math.sin(theta), grav: gravity, drag: drag ? 0.004 : 0, mass, t: 0 };
}

// Matches the existing canvas step, terminal-sample capture, and ground interpolation.
// It excludes visual rendering, React lifecycle, target collisions, and RAF jitter.
function canvasFlight(angle, velocity, gravity, drag, dt, mass = 1) {
  const b = launchState(angle, velocity, gravity, drag, mass);
  let maxH = 0;
  for (let i = 0; i < 200000; i++) {
    const previousY = b.mY;
    if (dt > 0) P.step(b, dt);
    maxH = Math.max(maxH, b.mY);
    const terminalSample = { ...b };
    if (b.mY <= 0) {
      const fraction = previousY > 0 && previousY !== b.mY ? previousY / (previousY - b.mY) : 1;
      return {
        range: b.mX - b.mVx * dt * (1 - fraction),
        reportedTime: b.t,
        interpolatedTime: b.t - dt * (1 - fraction),
        maxH,
        terminalSample,
        energyAtUncorrectedEndpoint: 0.5 * mass * (b.mVx ** 2 + b.mVy ** 2) + mass * gravity * b.mY,
      };
    }
  }
  throw new Error('Canvas flight exceeded audit step limit');
}

// Independent fourth-order Runge-Kutta reference for the stated quadratic drag ODE.
function referenceFlight(angle, velocity, gravity, drag, mass = 1, dt = 0.0001) {
  const theta = angle * Math.PI / 180;
  let state = [0, 0, velocity * Math.cos(theta), velocity * Math.sin(theta)];
  let time = 0, maxH = 0;
  function derivative(s) {
    const k = (drag ? 0.004 : 0) * Math.hypot(s[2], s[3]) / mass;
    return [s[2], s[3], -k * s[2], -gravity - k * s[3]];
  }
  const sum = (s, d, k) => s.map((v, i) => v + k * d[i]);
  for (let i = 0; i < 2000000; i++) {
    const previous = state;
    const k1 = derivative(state), k2 = derivative(sum(state, k1, dt / 2));
    const k3 = derivative(sum(state, k2, dt / 2)), k4 = derivative(sum(state, k3, dt));
    state = state.map((v, j) => v + dt / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
    time += dt;
    maxH = Math.max(maxH, state[1]);
    if (state[1] <= 0) {
      const fraction = previous[1] / (previous[1] - state[1]);
      return { range: previous[0] + fraction * (state[0] - previous[0]), time: time - dt * (1 - fraction), maxH };
    }
  }
  throw new Error('Reference flight exceeded audit step limit');
}

const configurations = [
  [45, 25, 9.8, false],
  [5, 5, 25, false],
  [5, 5, 25, true],
  [45, 50, 9.8, true],
  [30, 25, 9.8, false],
  [60, 25, 9.8, false],
];
const cases = configurations.map(([angle, velocity, gravity, drag]) => ({
  settings: { angle, velocity, gravity, drag, mass: 1 },
  exactVacuum: {
    range: velocity ** 2 * Math.sin(2 * angle * Math.PI / 180) / gravity,
    time: 2 * velocity * Math.sin(angle * Math.PI / 180) / gravity,
    maxH: (velocity * Math.sin(angle * Math.PI / 180)) ** 2 / (2 * gravity),
  },
  reference: referenceFlight(angle, velocity, gravity, drag),
  sourcePrediction: P.simulate(angle, velocity, gravity, drag, 1),
  canvasEquivalent: Object.fromEntries([
    ['30fps', 1 / 30], ['60fps', 1 / 60], ['144fps', 1 / 144], ['quarterSpeedAt60fps', 1 / 240], ['manualStep', P.DT],
  ].map(([label, dt]) => [label, canvasFlight(angle, velocity, gravity, drag, dt)])),
}));
const output = {
  sourcePath,
  sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  scope: 'Actual source predictor and step functions; deterministic reproduction of canvas integration/landing formulas, not a browser test.',
  cases,
  pauseThenLaunch: canvasFlight(45, 25, 9.8, false, 0),
  acceptedSavedStateEdges: {
    zeroGravity: P.simulate(45, 25, 0, false, 1),
    veryLightFastProjectile: P.simulate(45, 1000, 9.8, true, 0.01),
  },
};
const destination = path.join(__dirname, 'numerical-results.json');
fs.writeFileSync(destination, JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ destination, sourceSha256: output.sourceSha256, cases: cases.map(c => ({ settings: c.settings, referenceRange: c.reference.range, sourceRange: c.sourcePrediction.range, fps60Range: c.canvasEquivalent['60fps'].range, fps144Range: c.canvasEquivalent['144fps'].range, quarterSpeedRange: c.canvasEquivalent.quarterSpeedAt60fps.range })), pauseThenLaunch: output.pauseThenLaunch }, null, 2));
