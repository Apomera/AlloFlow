import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { resetStemLab, loadTool, React } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'prismflow-deploy/node_modules');
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

// The root tool and its deploy mirror must stay byte-identical in behaviour.
const TOOL_PATHS = [
  'stem_lab/stem_tool_magnetism.js',
  'prismflow-deploy/public/stem_lab/stem_tool_magnetism.js',
];

// Pure physics helpers come straight from module.exports (the guard lets the
// file be require()'d with no StemLab host present).
const physics = require(resolve(process.cwd(), 'stem_lab/stem_tool_magnetism.js'));

// jsdom shims: no rAF (the motor spin loop must never advance in tests).
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
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState(seed ? { magnetism: seed } : {});
    return cfg.render(mountCtx(toolData, setToolData));
  }
  try {
    act(() => { root.render(React.createElement(Harness)); });
    return host.innerHTML;
  } finally {
    try { act(() => root.unmount()); } catch (_) {}
    host.remove();
  }
}

const BASE = {
  tab: 'field',
  magnets: [{ x: -70, y: 0, angle: 0, polarity: 1 }],
  compass: { x: 90, y: 90 }, filings: false, compassMoved: false,
  sawAttract: false, sawRepel: false,
  turns: 20, current: 2, currentDir: 1, windingDir: 1, core: false, coilTouched: false,
  motorCurrent: 3, motorField: 4, motorCurrentDir: 1, motorFieldDir: 1, motorRunning: false, motorAngle: 90, motorRan: false,
  induceMode: 'hand', genAngle: 0, genTurns: 60, genField: 4, genRPM: 60,
  learningMode: 'guided', notebookOpen: false, notebookPrediction: '', notebookClaim: '', notebookTrials: [],
  earthSeen: false, declination: 12,
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
    expect(source).toContain('function induction3DCard');
    expect(source).toContain('function initInduction3DCanvas');
    expect(source).toContain('buildCoil(liveState)');
    expect(source).toContain('function field3DCard');
    expect(source).toContain('buildSlice(liveState)');
    expect(source).toContain('Magnetic memory: domains and hysteresis');
    expect(source).toContain('Eddy-current engineering lab');
    expect(source).toContain('Load, lamp, and efficiency');
    expect(source).toContain("'data-tooltip': q.label");
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
  beforeEach(() => {
    resetStemLab();
    cfg = loadTool(TOOL_PATHS[0], 'magnetism');
  });

  it('seeds state from an empty bucket without crashing', () => {
    // The bridge flushes the seeding setToolData inside act(), so the first
    // paint lands on the real body (past the "Charging the coils" splash).
    const html = mountWithSeed(cfg, null);
    expect(html).toContain('Magnetism &amp; Electromagnetism');
    expect(html).toContain('role="tablist"');
  });

  it('renders every tab under jsdom', () => {
    ['field', 'electro', 'motor', 'induce', 'materials', 'crane', 'maze', 'transformer', 'earth', 'quiz'].forEach((tab) => {
      const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab }));
      expect(html.length).toBeGreaterThan(200);
    });
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'field' }))).toContain('north (red)');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'electro' }))).toContain('Turns of wire');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'motor' }))).toContain('commutator');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'crane' }))).toContain('♻️');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'induce' }))).toContain('Voltage scope');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'induce', induceMode: 'eddy' }))).toContain('eddy-current');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'materials' }))).toContain('magnetic domains');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'maze' }))).toContain('hidden magnet');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'transformer' }))).toContain('120 V →');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'earth' }))).toContain('magnetosphere');
  });

  it('renders the learning cycle and active tab panel for every station', () => {
    ['field', 'electro', 'motor', 'induce', 'materials', 'crane', 'maze', 'transformer', 'earth', 'quiz'].forEach((tab) => {
      const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab }));
      expect(html).toContain('1 · Predict');
      expect(html).toContain('2 · Test');
      expect(html).toContain('3 · Explain');
      expect(html).toContain('role="tabpanel"');
      expect(html).toContain('id="mag-panel-' + tab + '"');
    });
  });

  it('makes electromagnet turn count visible and exposes the live setup to assistive tech', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'electro', turns: 200, current: 4 }));
    expect(html).toContain('14 visible loops represent 200 turns');
    expect(html).toContain('A wire coil with 200 turns and 4 amps');
    expect(html).toContain('Run a fair test');
  });

  it('connects motor inputs to paired forces and an energy chain', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'motor', motorCurrent: 5, motorField: 8 }));
    expect(html).toContain('Force on each active wire side ≈ 0.200 N');
    expect(html).toContain('opposite wire forces create torque');
    expect(html).toContain('battery → moving charges → opposite magnetic forces → rotation');
  });

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
    expect(field).toContain('fourth power of distance');
    expect(field).toContain('force-versus-distance curve falls steeply');

    const motor = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'motor', chargeSign: -1, chargeField: 1 }));
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
    const guided = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'maze', learningMode: 'guided' }));
    expect(guided).toContain('1 · Predict');
    expect(guided).toContain('gold-outlined step');

    const challenge = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'maze', learningMode: 'challenge' }));
    expect(challenge).toContain('Design your own fair test');
    expect(challenge).toContain('No path hint is shown');
    expect(challenge).not.toContain('gold-outlined step');
  });

  it('renders a cross-station claim-evidence-reasoning notebook with saved trials', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, {
      tab: 'field', notebookOpen: true, notebookPrediction: 'A larger gap will weaken the force.',
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
    const defBlock = source.slice(source.indexOf('var QUEST_DEFS'), source.indexOf('var FACTS'));
    const tabCount = (defBlock.match(/tab: '/g) || []).length;
    expect(tabCount).toBe(17);
  });

  describe('mounted', () => {
    let cfg;
    beforeEach(() => {
      resetStemLab();
      cfg = loadTool(TOOL_PATHS[0], 'magnetism');
    });

    it('renders the journey strip with fresh-state progress 0/17', () => {
      const html = mountWithSeed(cfg, Object.assign({}, BASE));
      expect(html).toContain('Journey 0/17');
    });

    it('journey chips light up as quests complete', () => {
      const html = mountWithSeed(cfg, Object.assign({}, BASE, { compassMoved: true, motorRan: true, earthSeen: true }));
      expect(html).toContain('Journey 3/17');
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
