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
  // Until 2026-08-17 this was enforced by a zero-attempt guard inside the host's
  // finishMathFluencyProbe. That whole engine has since been deleted: it had no
  // UI (its overlay was migrated to math_fluency_module.js) and no callers, so
  // the guard was protecting a path that could only ever be entered by accident.
  // The protection now lives where probes are actually recorded.
  it('the host engine that needed the guard is gone', () => {
    expect(anti).not.toContain('const finishMathFluencyProbe =');
    expect(anti).not.toContain('const startMathFluencyProbe =');
    expect(anti).not.toContain('const submitMathFluencyAnswer =');
  });

  it('the recording path refuses a run that is not a valid score', () => {
    const sidebar = readFileSync('view_sidebar_panels_source.jsx', 'utf8');
    const h = sidebar.slice(sidebar.indexOf('onProbeComplete={(entry) => {'), sidebar.indexOf('onProbeComplete={(entry) => {') + 4200);
    // Interrupted or ended early: the panel marks it, and we decline to write.
    expect(h).toContain('r.validForComparison === false');
    // A missing score must not be coerced: Number(null) is 0, and a 0 DCPM in a
    // student's record is exactly the fabricated CBM this guard class prevents.
    expect(h).toContain('rawDcpm !== null && rawDcpm !== undefined');
    // And the refusal is announced rather than silent.
    expect(h).toContain("t('math_fluency.probe_not_recorded')");
  });
});

describe('the state of play, pinned so it is not re-argued from memory', () => {
  it('the live panel IS mounted, in the sidebar math panel', () => {
    const sidebar = readFileSync('view_sidebar_panels_source.jsx', 'utf8');
    expect(sidebar).toContain("mathMode === 'Fluency Probes' && (() => {");
    expect(sidebar).toContain('const MathFluencyComponent = window.AlloModules && window.AlloModules.MathFluency;');
    expect(fluency).toContain('window.AlloModules.MathFluency = MathFluencyPanel;');
  });

  it('the dead host probe state is deleted, not merely unread', () => {
    expect(anti).toContain('{/* Math Fluency probe overlay — handled by math_fluency_module.js */}');
    // These were write-only: set by Assessment Center, rendered by nothing.
    // The removal comment left behind names them, so match code only.
    const antiCode = anti.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    for (const dead of ['mathFluencyActive', 'mathFluencyProblems', 'mathFluencyCurrentIndex',
      'mathFluencyStudentInput', 'mathFluencyResults', 'mathFluencyTimer', 'mathFluencyProblemCount',
      'mathFluencyInputRef', 'mathFluencyTimerRef']) {
      expect(antiCode.match(new RegExp(dead, 'g')), dead + ' should be gone').toBeNull();
    }
    // 2026-08-23 (Aaron's call): mathFluencyHistory itself is retired. Its two
    // readers — Report Writer's math section and the fluency panel's AlloSheet
    // envelope — take per-student math probes from probe history via ONE host
    // derivation, mathProbesFor(). The device-global array, which nothing
    // wrote and which would have leaked one student's probes into another's
    // report if repopulated, is gone. Pinned in
    // tests/assessment_center_decisions_2026-08-23.test.js as well.
    expect(anti).not.toContain('const [mathFluencyHistory, setMathFluencyHistory]');
    expect(anti).not.toContain('setMathFluencyHistory(');
    expect(anti).toContain('const mathProbesFor = (name) =>');
    // And no view source reads the host's probe state at all.
    ['view_sidebar_panels_source.jsx', 'view_math_source.jsx'].forEach((file) => {
      const src = readFileSync(file, 'utf8');
      expect(src).not.toContain('mathFluencyActive');
      expect(src).not.toContain('mathFluencyProblems');
    });
  });

  it('the assessment builder routes to the LIVE panel, not the dead host path', () => {
    // Fixed 2026-08-16: the all-fluency branch used to call
    // startMathFluencyProbe(false), the host's dead implementation — a toast,
    // an empty screen, and (before the finishMathFluencyProbe guard) a
    // fabricated 0-attempt CBM record when its timer expired. It now opens the
    // live panel: mathMode 'Fluency Probes' plus the sidebar math accordion.
    const stem = readFileSync('math_create_module.js', 'utf8');
    const branch = stem.slice(
      stem.indexOf("const fluencyBlocks = assessmentBlocks.filter(b => b.type === 'fluency');"),
      stem.indexOf("const nonFluencyBlocks = assessmentBlocks.filter(b => b.type !== 'fluency');")
    );
    expect(branch).toContain("setMathMode('Fluency Probes')");
    expect(branch).toContain("'math'");
    expect(branch).not.toContain('startMathFluencyProbe(false);');
    // No other live call site remains anywhere in the module (the destructured
    // prop and an explanatory comment are allowed).
    expect(stem).not.toContain('startMathFluencyProbe(false);');
    // The branch lives in Math Studio now; its public mirror carries it, and
    // the STEM Lab module no longer contains the branch at all.
    expect(readFileSync('desktop/web-app/public/math_create_module.js', 'utf8')).toBe(stem);
    expect(readFileSync('stem_lab/stem_lab_module.js', 'utf8')).not.toContain("assessmentBlocks.filter(b => b.type === 'fluency')");
  });

  it('the Create tab has a visible Fluency Probe launcher, not only the buried builder path', () => {
    // Before 2026-08-17 the Create tab's only route to fluency was: open the
    // Assessment Builder, add blocks, set EVERY one to "fluency", press
    // Generate. This pins the direct button beside Build Assessment.
    const stem = readFileSync('math_create_module.js', 'utf8');
    const launcher = stem.slice(
      stem.indexOf("t('stem.fluency.probe_button_aria')"),
      stem.indexOf('"aria-label": "Open assessment builder"')
    );
    expect(launcher.length).toBeGreaterThan(0);
    expect(launcher).toContain("setMathMode('Fluency Probes')");
    expect(launcher).toContain("'math'");
    expect(launcher).toContain("t('stem.fluency.panel_opened')");
  });

  it('every fallback-first string in the fluency paths has a real ui_strings key', () => {
    const ui = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
    const fluency = ui.stem && ui.stem.fluency;
    for (const key of ['probe_button', 'probe_button_aria', 'panel_opened', 'mixed_blocks_note']) {
      expect(fluency && typeof fluency[key], 'stem.fluency.' + key).toBe('string');
    }
    // and the mirror carries them
    const pub = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8'));
    for (const key of ['probe_button', 'panel_opened']) {
      expect(pub.stem.fluency[key]).toBe(fluency[key]);
    }
  });

  it('the builder handoff carries the blocks\' quantity instead of discarding it', () => {
    // Migration plan enhancement #2, closed 2026-08-17. Producer: Math Studio's
    // all-fluency branch parks {problemCount, at} in a window slot and fires an
    // event. Consumer: MathFluencyPanel consumes once (mount OR event, for the
    // already-mounted case), rejects stale slots, snaps the count to its own
    // fixed options, and never parses free-text directives into settings.
    const studio = readFileSync('math_create_module.js', 'utf8');
    expect(studio).toContain('window.__alloFluencyPendingConfig = {');
    expect(studio).toContain('fluencyBlocks.reduce((s, b) => s + (Math.floor(Number(b.quantity)) || 0), 0)');
    expect(studio).toContain("window.dispatchEvent(new CustomEvent('alloflow:fluency-pending-config'));");
    expect(studio).not.toContain('directive'.toUpperCase()); // no directive parsing sneaks in

    expect(fluency).toContain('function consumePending()');
    expect(fluency).toContain('delete window.__alloFluencyPendingConfig;');
    expect(fluency).toContain('> 120000) return;'); // stale-slot rejection
    expect(fluency).toContain('var options = [20, 40, 60, 80, 120, 150];'); // snap to real options
    expect(fluency).toContain("window.addEventListener('alloflow:fluency-pending-config', consumePending);");
    expect(fluency).toContain("window.removeEventListener('alloflow:fluency-pending-config', consumePending);");
    // and the snap logic actually snaps
    const snap = (wanted) => [20, 40, 60, 80, 120, 150].reduce((best, opt) => Math.abs(opt - wanted) < Math.abs(best - wanted) ? opt : best, 20);
    expect(snap(25)).toBe(20);
    expect(snap(35)).toBe(40);
    expect(snap(100)).toBe(80);
    expect(snap(500)).toBe(150);
  });

  it('a mixed assessment names its dropped fluency blocks instead of silently omitting them', () => {
    const stem = readFileSync('math_create_module.js', 'utf8');
    expect(stem).toContain('if (fluencyBlocks.length > 0) {');
    expect(stem).toContain("t('stem.fluency.mixed_blocks_note')");
  });

  it('the host launcher is now the live one, and lands on a panel that mounts', () => {
    // The old startMathFluencyProbe set activeView and nothing else, so even if
    // an overlay had existed the sidebar accordion would still have been shut.
    const fn = anti.slice(anti.indexOf('const handleLaunchMathProbe ='), anti.indexOf('const handleLaunchMathProbe =') + 1800);
    expect(fn).toContain("setActiveView('math');");
    expect(fn).toContain("setMathMode('Fluency Probes');");
    expect(fn).toContain('setExpandedTools');
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
    ['mathMode', 'mathSubject', 'numberLineMarkers', 'fractionPieces', 'multTableAnswer']
      .forEach((prop) => expect(bag).toContain(prop));
    // startMathFluencyProbe was in this bag and destructured by the Lab, but it
    // had no call site anywhere; it went with the rest of the dead engine.
    expect(bag).not.toContain('startMathFluencyProbe');
    expect(readFileSync('stem_lab/stem_lab_module.js', 'utf8')).not.toContain('startMathFluencyProbe');
  });

  it('STEM Lab is a top-level modal, not a mode inside the math view', () => {
    expect(anti).toContain('<CDNModuleGate moduleKey="StemLab" isOpen={showStemLab}');
    const mathView = readFileSync('view_math_source.jsx', 'utf8');
    expect(mathView).not.toContain('showStemLab');
  });
});
