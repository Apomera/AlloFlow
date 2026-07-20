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
  turns: 20, current: 2, core: false, coilTouched: false,
  motorCurrent: 3, motorField: 4, motorRunning: false, motorAngle: 0, motorRan: false,
  earthSeen: false, declination: 12,
  quizIdx: 0, quizScore: 0, quizPicked: null, quizDone: false, quizBest: 0,
  factIdx: 0, askInput: '', askAnswer: '', askLoading: false,
};

describe('magnetism tool — registration + structure', () => {
  it('registers id "magnetism" with ten quest hooks and nine tabs', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain("window.StemLab.registerTool('magnetism'");
      expect(source).toContain('questHooks');
      ['field', 'electro', 'motor', 'induce', 'materials', 'crane', 'transformer', 'earth', 'quiz'].forEach((tabId) => {
        expect(source).toContain("id: '" + tabId + "'");
      });
      ['mag_field', 'mag_pair', 'mag_electro', 'mag_motor', 'mag_earth', 'mag_induce', 'mag_materials', 'mag_crane', 'mag_domains', 'mag_quiz'].forEach((q) => {
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

  it('the quiz bank is 10 questions with valid answer indices', () => {
    expect(physics.QUIZ.length).toBe(12);
    physics.QUIZ.forEach((q) => {
      expect(q.a.length).toBeGreaterThanOrEqual(2);
      expect(q.c).toBeGreaterThanOrEqual(0);
      expect(q.c).toBeLessThan(q.a.length);
      expect(typeof q.why).toBe('string');
    });
  });
});

describe('magnetism tool — honesty + accessibility (source anchors)', () => {
  const source = readFileSync(TOOL_PATHS[0], 'utf8');
  it('discloses the schematic model and keeps the exact solenoid law', () => {
    expect(source).toContain('schematic dipole model');
    expect(source).toContain('B = μ₀ · (N / L) · I');
    expect(source).toContain('F = B·I·L');
  });
  it('keeps Earth science honest (pole reversal, not exactly geographic)', () => {
    expect(source).toContain('780,000 years ago');
    expect(source).toContain('not the true geographic pole');
    expect(source).toContain('magnetosphere');
  });
  it('gates AI traffic behind aiHintsEnabled', () => {
    expect(source).toContain('var aiOn = !!(ctx.aiHintsEnabled && typeof callGemini === \'function\')');
  });
  it('has reduced-motion + focus-visible + tablist a11y', () => {
    expect(source).toContain('prefers-reduced-motion');
    expect(source).toContain('focus-visible');
    expect(source).toContain("role: 'tablist'");
    expect(source).toContain('aria-live');
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
    ['field', 'electro', 'motor', 'induce', 'materials', 'crane', 'transformer', 'earth', 'quiz'].forEach((tab) => {
      const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab }));
      expect(html.length).toBeGreaterThan(200);
    });
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'field' }))).toContain('north (red)');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'electro' }))).toContain('Turns of wire');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'motor' }))).toContain('commutator');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'crane' }))).toContain('♻️');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'induce' }))).toContain('Voltage scope');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'induce' }))).toContain('eddy-current');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'materials' }))).toContain('magnetic domains');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'transformer' }))).toContain('120 V →');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'earth' }))).toContain('magnetosphere');
  });

  it('renders the quiz results view when done', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'quiz', quizDone: true, quizScore: 8 }));
    expect(html).toContain('8 / 12');
  });

  it('quest hooks fire on the right state', () => {
    const hooks = Object.fromEntries(cfg.questHooks.map((q) => [q.id, q.check]));
    expect(hooks.mag_field({ magnetism: { compassMoved: true } })).toBe(true);
    expect(hooks.mag_field({ magnetism: {} })).toBe(false);
    expect(hooks.mag_pair({ magnetism: { sawAttract: true, sawRepel: true } })).toBe(true);
    expect(hooks.mag_pair({ magnetism: { sawAttract: true } })).toBe(false);
    expect(hooks.mag_electro({ magnetism: { coilTouched: true } })).toBe(true);
    expect(hooks.mag_motor({ magnetism: { motorRan: true } })).toBe(true);
    expect(hooks.mag_earth({ magnetism: { earthSeen: true } })).toBe(true);
    expect(hooks.mag_induce({ magnetism: { peakEMF: 0.6 } })).toBe(true);
    expect(hooks.mag_induce({ magnetism: { peakEMF: 0.2 } })).toBe(false);
    expect(hooks.mag_materials({ magnetism: { matPerfect: true } })).toBe(true);
    expect(hooks.mag_materials({ magnetism: {} })).toBe(false);
    expect(hooks.mag_crane({ magnetism: { craneDone: true } })).toBe(true);
    expect(hooks.mag_crane({ magnetism: {} })).toBe(false);
    expect(hooks.mag_domains({ magnetism: { domainsFull: true } })).toBe(true);
    expect(hooks.mag_domains({ magnetism: {} })).toBe(false);
    expect(hooks.mag_quiz({ magnetism: { quizBest: 9 } })).toBe(true);
    expect(hooks.mag_quiz({ magnetism: { quizBest: 8 } })).toBe(false);
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
