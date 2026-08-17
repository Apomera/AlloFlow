// Assessment Center's math probe: launch and writeback (2026-08-17).
//
// Before this, the math measure was connected at neither end.
//
//   Outbound: the "Start Math Probe" button set host state and a 120s timer for
//   an overlay that had been migrated out to math_fluency_module.js. Nothing
//   rendered. mathFluencyActive was declared once in AlloFlowANTI.txt and read
//   nowhere; submitMathFluencyAnswer had no callers. A teacher pressed Start and
//   the modal simply sat there while a timer ran behind it.
//
//   Inbound: the live panel that CAN administer a fixed form wrote its result to
//   the generic resource history only. saveProbeResult, the single writer of
//   'alloflow_probe_history', was called only from the word-sounds handler, so no
//   math score ever reached the store that feeds RTI tier, trend and the IEP
//   export.
//
// This pins both ends, plus the per-student scoping of the DCPM trend, which was
// reading an unscoped global from inside a named student's view.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

let anti;
let ac;
let panel;
let sidebar;

beforeAll(() => {
  anti = readFileSync('AlloFlowANTI.txt', 'utf8');
  ac = readFileSync('student_analytics_module.js', 'utf8');
  panel = readFileSync('math_fluency_module.js', 'utf8');
  sidebar = readFileSync('view_sidebar_panels_source.jsx', 'utf8');
});

describe('outbound: Assessment Center hands off instead of administering', () => {
  it('the button no longer drives the host engine', () => {
    // The whole point: none of these may reappear in the launcher.
    for (const dead of ['setMathFluencyActive(true)', 'setMathFluencyProblems(problems)',
      'mathFluencyTimerRef.current = setInterval', 'mathFluencyInputRef.current?.focus()']) {
      expect(ac, dead).not.toContain(dead);
    }
  });

  it('it closes the modal and calls the host launcher, like the reading probes', () => {
    const btn = ac.slice(ac.indexOf('"aria-label": "Start math probe"') - 1600, ac.indexOf('"aria-label": "Start math probe"'));
    expect(btn).toContain('setShowClassAnalytics(false)');
    expect(btn).toContain('onLaunchMathProbe(grade, form, mathProbeStudent || null)');
    // A missing host callback must say so, not fail silently as before.
    expect(btn).toContain("typeof onLaunchMathProbe !== 'function'");
  });

  it('the host launcher parks a validated config and navigates to the panel', () => {
    const fn = anti.slice(anti.indexOf('const handleLaunchMathProbe ='), anti.indexOf('const handleLaunchMathProbe =') + 1800);
    expect(fn).toContain("mode: 'benchmark'");
    expect(fn).toContain('window.__alloFluencyPendingConfig');
    expect(fn).toContain("new CustomEvent('alloflow:fluency-pending-config')");
    expect(fn).toContain("setMathMode('Fluency Probes')");
    expect(fn).toContain("setActiveView('math')");
    // Expanding the tool matters: the panel only mounts when 'math' is expanded,
    // so navigating without this lands on a collapsed panel.
    expect(fn).toContain('setExpandedTools');
    // Refuses rather than launching an administration with no items.
    expect(fn).toContain('!Array.isArray(bank.problems) || bank.problems.length === 0');
    expect(anti).toContain('onLaunchMathProbe={handleLaunchMathProbe}');
  });
});

describe('the panel accepts a standardized handoff', () => {
  it('consumes mode, form, grade and student, each validated', () => {
    const eff = panel.slice(panel.indexOf('function consumePending()'), panel.indexOf('consumePending();'));
    expect(eff).toContain("pending.mode === 'benchmark'");
    expect(eff).toContain('/^[ABC]$/.test(String(pending.form');
    expect(eff).toContain('normalizeGrade(pending.grade)');
    // Freshness guard survives: a forgotten slot must not configure a later run.
    expect(eff).toContain('> 120000) return');
  });

  it('a handoff may set benchmark mode but never clear it', () => {
    const eff = panel.slice(panel.indexOf('function consumePending()'), panel.indexOf('consumePending();'));
    expect(eff).toContain("if (isBenchmark) { setProbeMode('benchmark');");
    expect(eff).not.toContain("setProbeMode('practice')");
  });

  it('a later practice handoff clears the student a benchmark handoff set', () => {
    // Otherwise the next practice run would be written into that learner's record.
    const eff = panel.slice(panel.indexOf('function consumePending()'), panel.indexOf('consumePending();'));
    expect(eff).toContain('setProbeStudent(isBenchmark && student ? student : null)');
  });

  it('the handed-off grade drives BOTH the run and the readiness check', () => {
    // If these disagreed, the setup card would green-light a bank the run then
    // fails to find.
    expect(panel).toContain('var normalizedGrade = probeGradeOverride || normalizeGrade(gradeLevel);');
    expect(panel).toContain('var setupNormalizedGrade = probeGradeOverride || normalizeGrade(gradeLevel);');
  });

  it('shows the assessor who and what grade before Start', () => {
    expect(panel).toContain("tt('math_fluency.recording_for'");
    expect(panel).toContain('Recording for {student} at grade {grade}');
  });

  it('carries the student through the run into the result', () => {
    expect(panel).toContain('student: probeStudent || null,');
    expect(panel).toContain('student: config.student || null,');
  });
});

describe('inbound: a completed standardized probe reaches probe history', () => {
  it('the panel mount can write, and the host supplies the writer', () => {
    expect(sidebar).toContain('saveProbeResult');
    expect(anti).toMatch(/openMathCreate,\s*\n(\s*\/\/[^\n]*\n)*\s*saveProbeResult/);
  });

  it('only a valid benchmark run with a student is recorded', () => {
    const h = sidebar.slice(sidebar.indexOf('onProbeComplete={(entry) => {'), sidebar.indexOf('onProbeComplete={(entry) => {') + 4200);
    expect(h).toContain("r.mode !== 'benchmark' || !r.student");
    // Probe history carries no validity flag, so an interrupted or early run
    // would be read as a real CBM by the tier calculation.
    expect(h).toContain('r.validForComparison === false');
    expect(h).toContain("activity: 'math_dcpm'");
  });

  it('a rejected run is announced, not dropped silently', () => {
    const h = sidebar.slice(sidebar.indexOf('onProbeComplete={(entry) => {'), sidebar.indexOf('onProbeComplete={(entry) => {') + 4200);
    expect(h).toContain("t('math_fluency.probe_not_recorded')");
    expect(h).toContain("'warning'");
  });

  it('writes dcpm and itemsPerMin to the same number', () => {
    // Assessment Center reads itemsPerMin via _probeTypeAndScore and dcpm via the
    // AlloSheet score walker. If these diverged, two surfaces would report
    // different scores for one probe.
    const h = sidebar.slice(sidebar.indexOf('onProbeComplete={(entry) => {'), sidebar.indexOf('onProbeComplete={(entry) => {') + 4200);
    // Regex, not a newline-anchored substring: this tree is CRLF on disk.
    expect(h).toMatch(/\bdcpm,\s/);
    expect(h).toContain('itemsPerMin: dcpm,');
    // The raw value is validated before coercion; Number(null) is 0, which would
    // otherwise record a missing score as a genuine 0 DCPM.
    expect(h).toContain('rawDcpm');
    // And the activity string must be one _probeTypeAndScore actually maps.
    expect(ac).toContain("if (a === 'math' || a === 'math_dcpm' || a === 'math_fluency')");
  });
});

describe('the Math DCPM trend is scoped to the student it is shown under', () => {
  it('reads that student probe history, not a device-global array', () => {
    expect(ac).toContain('const mathDcpmData = ((probeHistory && probeHistory[selectedStudent.name]) || [])');
    expect(ac).toContain('renderSparkline(mathDcpmData, "#f59e0b")');
    expect(ac).toContain('mathDcpmData.length >= 2 &&');
  });

  it('mathFluencyHistory is no longer referenced as a free variable', () => {
    // It was used twice and declared nowhere in this module, so the student
    // research view threw ReferenceError into its ErrorBoundary for any student
    // with 2+ fluency assessments or 2+ game completions. Comments may mention
    // it; code may not.
    const code = ac.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(code).not.toContain('mathFluencyHistory');
  });

  it('and the free-variable gate agrees', () => {
    // Belt and braces: the scope-aware gate is the authority, and it is NOT part
    // of verify:gate, which is why this went unnoticed.
    let out = '';
    try {
      out = execFileSync('node', ['dev-tools/check_free_vars.cjs', 'student_analytics_module.js'],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      out = String((e && (e.stdout || '')) || '') + String((e && (e.stderr || '')) || '');
    }
    expect(out).not.toContain('mathFluencyHistory');
  });
});
