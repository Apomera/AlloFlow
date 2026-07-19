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
  it('registers id "magnetism" with six quest hooks and five tabs', () => {
    TOOL_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      expect(source).toContain("window.StemLab.registerTool('magnetism'");
      expect(source).toContain('questHooks');
      ['field', 'electro', 'motor', 'earth', 'quiz'].forEach((tabId) => {
        expect(source).toContain("id: '" + tabId + "'");
      });
      ['mag_field', 'mag_pair', 'mag_electro', 'mag_motor', 'mag_earth', 'mag_quiz'].forEach((q) => {
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
    expect(physics.QUIZ.length).toBe(10);
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
    ['field', 'electro', 'motor', 'earth', 'quiz'].forEach((tab) => {
      const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab }));
      expect(html.length).toBeGreaterThan(200);
    });
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'field' }))).toContain('north (red)');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'electro' }))).toContain('Turns of wire');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'motor' }))).toContain('commutator');
    expect(mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'earth' }))).toContain('magnetosphere');
  });

  it('renders the quiz results view when done', () => {
    const html = mountWithSeed(cfg, Object.assign({}, BASE, { tab: 'quiz', quizDone: true, quizScore: 8 }));
    expect(html).toContain('8 / 10');
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
    expect(hooks.mag_quiz({ magnetism: { quizBest: 7 } })).toBe(true);
    expect(hooks.mag_quiz({ magnetism: { quizBest: 6 } })).toBe(false);
  });
});
