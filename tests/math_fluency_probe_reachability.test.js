// Math fluency: two implementations, one of them dead (fleet 2026-08-16, C5).
//
//   1. LIVE — math_fluency_module.js exports MathFluencyPanel, self-contained,
//      owning its own probe state and taking only gradeLevel / t / addToast /
//      onProbeComplete / storageDB / handleScoreUpdate. It is mounted at
//      view_sidebar_panels_source.jsx:1824 under mathMode === 'Fluency Probes'.
//      This is reachable and works. (An earlier draft of this file claimed it
//      was unmounted; that was wrong, and the assertion is corrected below.)
//
//   2. DEAD — the host's own older implementation in AlloFlowANTI.txt:
//      mathFluency* state, startMathFluencyProbe / finishMathFluencyProbe. Its
//      probe overlay was removed and replaced by two placeholder comments, so
//      mathFluencyActive is now declared and never read. But the launcher is
//      still wired to one button in stem_lab_module.js, and the countdown it
//      starts still expires into finishMathFluencyProbe with nothing on screen.
//
// These tests pin which is which, and pin the guard that stops the dead path
// recording a curriculum-based measurement nobody sat.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

let anti;
let fluency;

beforeAll(() => {
  anti = readFileSync('AlloFlowANTI.txt', 'utf8');
  fluency = readFileSync('math_fluency_module.js', 'utf8');
});

describe('a probe nobody answered is never recorded as a score', () => {
  it('finishMathFluencyProbe bails before building a result', () => {
    const fn = anti.slice(
      anti.indexOf('const finishMathFluencyProbe = () => {'),
      anti.indexOf('const startMathFluencyProbe =')
    );
    expect(fn).toContain('if (attempted.length === 0) {');
    // the guard must come before the result object is assembled
    expect(fn.indexOf('if (attempted.length === 0) {')).toBeLessThan(fn.indexOf('const result = {'));
    // and before anything is pushed into history
    expect(fn.indexOf('if (attempted.length === 0) {')).toBeLessThan(fn.indexOf("type: 'math-fluency-probe'"));
  });

  it('still records a probe when the student actually attempted something', () => {
    const fn = anti.slice(
      anti.indexOf('const finishMathFluencyProbe = () => {'),
      anti.indexOf('const startMathFluencyProbe =')
    );
    expect(fn).toContain("type: 'math-fluency-probe'");
    expect(fn).toContain('setMathFluencyHistory(h => [...h, result]);');
  });
});

describe('the state of play, pinned so it is not re-argued from memory', () => {
  it('the live panel IS mounted, in the sidebar math panel', () => {
    const sidebar = readFileSync('view_sidebar_panels_source.jsx', 'utf8');
    expect(sidebar).toContain("mathMode === 'Fluency Probes' && (() => {");
    expect(sidebar).toContain('const MathFluencyComponent = window.AlloModules && window.AlloModules.MathFluency;');
    expect(fluency).toContain('window.AlloModules.MathFluency = MathFluencyPanel;');
  });

  it('the host overlay is the dead one: mathFluencyActive is declared and never read', () => {
    expect(anti).toContain('{/* Math Fluency probe overlay — handled by math_fluency_module.js */}');
    // Exactly one occurrence in the monolith: its own useState.
    expect(anti.match(/mathFluencyActive/g)).toHaveLength(1);
    expect(anti).toContain('const [mathFluencyActive, setMathFluencyActive] = useState(false);');
    // And no view source reads the host's probe state at all.
    ['view_sidebar_panels_source.jsx', 'view_math_source.jsx'].forEach((file) => {
      const src = readFileSync(file, 'utf8');
      expect(src).not.toContain('mathFluencyActive');
      expect(src).not.toContain('mathFluencyProblems');
    });
  });

  it('the dead launcher is still wired to the STEM Lab assessment builder', () => {
    const stem = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    expect(stem).toContain('startMathFluencyProbe(false);');
    // and startMathFluencyProbe does not set the mode the live panel needs,
    // so nothing renders when that button is pressed
    const start = anti.slice(anti.indexOf('const startMathFluencyProbe ='), anti.indexOf('const startMathFluencyProbe =') + 1600);
    expect(start).toContain("setActiveView('math');");
    expect(start).not.toContain("setMathMode('Fluency Probes')");
  });

  it('MathFluencyPanel is self-contained, so it needs six props, not the host state', () => {
    const panel = fluency.slice(fluency.indexOf('function MathFluencyPanel(props) {'), fluency.indexOf('function MathFluencyPanel(props) {') + 1200);
    ['gradeLevel', 't', 'addToast', 'onProbeComplete', 'storageDB', 'handleScoreUpdate']
      .forEach((prop) => expect(panel).toContain('props.' + prop));
    expect(panel).not.toContain('props.mathFluencyProblems');
    expect(panel).not.toContain('props.mathFluencyActive');
  });
});

describe('STEM Lab and the math tool share one state surface', () => {
  it('the StemLab prop bag carries the math manipulative state', () => {
    const bag = anti.slice(
      anti.indexOf('React.createElement(StemLab, {'),
      anti.indexOf('React.createElement(StemLab, {') + 6000
    );
    ['mathMode', 'mathSubject', 'numberLineMarkers', 'fractionPieces', 'multTableAnswer', 'startMathFluencyProbe']
      .forEach((prop) => expect(bag).toContain(prop));
  });

  it('STEM Lab is a top-level modal, not a mode inside the math view', () => {
    expect(anti).toContain('<CDNModuleGate moduleKey="StemLab" isOpen={showStemLab}');
    const mathView = readFileSync('view_math_source.jsx', 'utf8');
    expect(mathView).not.toContain('showStemLab');
  });
});
