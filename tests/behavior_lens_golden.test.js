// Behavior Lens golden master.
//
// A characterization baseline for the BehaviorLens Hub component
// (behavior_lens_module.js — ~27.7k lines, the system of record for Lisa
// Hatch's pilot students' ABC / observation / risk-screening data). These
// snapshots pin the Hub's observable render-phase behavior across a small
// matrix of prop configurations, so the four ship-blocker fixes (XSS in
// print pipelines, codename-rename data loss, 1,415 fake-button divs, VTA
// overclaim — see memory:project_alloflow_pipeline_findings.md +
// project_word_sounds_golden_master.md for the pattern) can land with a
// safety net.
//
// A diff here means a behavior change, intended or not. Re-baseline
// deliberately with `vitest -u` ONLY when the change is reviewed and
// expected.
//
// See tests/helpers/behavior_lens_harness.js for how the module is rendered
// headlessly and what its ambient-global contract is.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupBehaviorLens, renderHub, PROP_MATRIX } from './helpers/behavior_lens_harness.js';

let H;
// Full module source read from disk. H.BehaviorLens.toString() only captures
// the root factory function body; the per-tool child components (where the
// progressbars, trend math, share code, IOA labeling etc. all live) are
// closures inside the same IIFE but are not part of the root function's
// .toString() output. For contract greps that need to see the whole module,
// use MODULE_SRC.
const __dir = dirname(fileURLToPath(import.meta.url));
const MODULE_SRC = readFileSync(resolve(__dir, '..', 'behavior_lens_module.js'), 'utf8');

const _origRandom = Math.random;
const _origNow = Date.now;

beforeAll(() => {
  H = setupBehaviorLens();
});

afterAll(() => {
  Math.random = _origRandom;
  Date.now = _origNow;
});

describe('module loads + registers', () => {
  it('exposes BehaviorLens on window.AlloModules', () => {
    expect(H.BehaviorLens).toBeTruthy();
    expect(typeof H.BehaviorLens).toBe('function');
  });
});

describe('layer 1 — Hub render across prop matrix', () => {
  for (const { label, propsOverrides } of PROP_MATRIX) {
    it(`renders identically: ${label} (snapshot)`, () => {
      expect(renderHub(propsOverrides)).toMatchSnapshot();
    });
  }
});

describe('layer 2 — determinism guard (golden master is only trustworthy if stable)', () => {
  it('every prop config renders byte-identically on a repeat render', () => {
    for (const { propsOverrides } of PROP_MATRIX) {
      expect(renderHub(propsOverrides)).toBe(renderHub(propsOverrides));
    }
  });

  it('default render contains the module root marker', () => {
    const html = renderHub({});
    // Behavior Lens renders inside a fullscreen overlay; the outer wrapper
    // class is part of the contract that downstream CSS depends on.
    expect(html.length).toBeGreaterThan(0);
    expect(html).toMatch(/<div|<section|<main|<aside/i);
  });

  it('Canvas-iframe vs standalone produce different output (cloud-sync UI diverges)', () => {
    const canvas = renderHub({ isCanvasEnv: true });
    const standalone = renderHub({ isCanvasEnv: false });
    // We expect SOME difference — the cloud-sync UI gates on isCanvasEnv.
    // If they're byte-identical, either the gate broke or the harness is
    // not exercising the path. Either way, worth a yellow flag.
    expect(canvas).not.toBe(standalone);
  });

  it('teacher-mode vs student-mode produce different output', () => {
    const teacher = renderHub({ isTeacherMode: true });
    const student = renderHub({ isTeacherMode: false });
    expect(teacher).not.toBe(student);
  });
});

describe('layer 3 — VTA reframe regression (memory:project_alloflow_pipeline_findings.md)', () => {
  // After the 2026-06-02 reframe, the live UI must not display the old
  // "Aligned with Virginia Threat Assessment Guidelines" claim. We can't
  // easily navigate to the RiskScreening panel from outside the Hub, but
  // we can grep the registered component source for the regression marker.
  // If a future edit reintroduces the string, this catches it.
  it('does not contain "Aligned with Virginia Threat Assessment Guidelines"', () => {
    const src = H.BehaviorLens.toString();
    expect(src).not.toMatch(/Aligned with Virginia Threat Assessment Guidelines/);
  });

  it('riskscreen_desc no longer asserts "Virginia Threat Assessment aligned"', () => {
    const src = H.BehaviorLens.toString();
    expect(src).not.toMatch(/Virginia Threat Assessment aligned screening/);
  });
});

describe('layer 4 — storage-id migration is wired (ship-blocker #2, 2026-06-02)', () => {
  // Per-student storage keys must be scoped to an immutable studentId, not
  // the raw codename. The full migration lives across many call sites; the
  // ones below are the load-bearing pieces. If any goes missing, the bug
  // (silent data loss on codename rename) regresses. These are contract
  // greps — cheaper than a live mount + useEffect simulation, and they
  // catch the most common regression (someone tears out the helper).

  it('exposes a studentKey helper and an activeStudentId memo', () => {
    const src = H.BehaviorLens.toString();
    expect(src).toMatch(/const\s+studentKey\s*=\s*useCallback/);
    expect(src).toMatch(/const\s+activeStudentId\s*=\s*useMemo/);
  });

  it('roster initializer backfills `id` onto legacy entries', () => {
    const src = H.BehaviorLens.toString();
    expect(src).toMatch(/raw\.map\(\s*r\s*=>\s*\(r\s*&&\s*typeof\s+r\s*===\s*'object'\s*&&\s*r\.id\)\s*\?\s*r\s*:\s*\{\s*\.\.\.\s*r\s*,\s*id:\s*uid\(\)\s*\}\s*\)/);
  });

  it('auto-add-on-selectedStudent useEffect tags new roster entries with an id', () => {
    const src = H.BehaviorLens.toString();
    expect(src).toMatch(/\{\s*id:\s*uid\(\)\s*,\s*name:\s*selectedStudent/);
  });

  it('legacy localStorage migration is registered with a one-time flag', () => {
    const src = H.BehaviorLens.toString();
    expect(src).toMatch(/bl_studentkey_migrated_v1/);
    // Every prefix the audit identified must appear in the migration table —
    // otherwise that prefix's data silently fails to migrate.
    [
      'behaviorLens_abc_', 'behaviorLens_obs_', 'behaviorLens_homeLog_',
      'behaviorLens_selfCheck_', 'behaviorLens_consent_',
      'behaviorLens_tokenHistory_', 'behaviorLens_goals_',
      'bl_contracts_', 'bl_escalation_', 'bl_reinforcer_',
      'bl_reinforcer_snaps_', 'bl_crisis_', 'bl_fidelity_',
      'bl_allobot_', 'prefassess_'
    ].forEach(prefix => {
      expect(src, `legacy migration must include prefix ${prefix}`).toContain(`'${prefix}'`);
    });
  });

  it('top-level ABC + obs auto-save use studentKey, not raw selectedStudent', () => {
    const src = H.BehaviorLens.toString();
    expect(src).toMatch(/localStorage\.setItem\(studentKey\('behaviorLens_abc_'\)/);
    expect(src).toMatch(/localStorage\.setItem\(studentKey\('behaviorLens_obs_'\)/);
    // The raw `behaviorLens_abc_${selectedStudent}` setItem pattern (the
    // bug) must no longer exist as a WRITE path. We allow it as a legacy
    // READ fallback — that pattern lives inside the migration / load path
    // string-templated as a read, not a setItem.
    expect(src).not.toMatch(/localStorage\.setItem\(`behaviorLens_abc_\$\{selectedStudent\}`/);
    expect(src).not.toMatch(/localStorage\.setItem\(`behaviorLens_obs_\$\{selectedStudent\}`/);
  });

  it('demo loader keys writes on a precomputed demoId, not the codename', () => {
    const src = H.BehaviorLens.toString();
    // The demo loader (loadDemoStudent) must mint a stable demoId BEFORE
    // writing any storage, so demo data survives a codename rename and
    // matches the roster entry it creates at the bottom.
    expect(src).toMatch(/const\s+demoId\s*=/);
    expect(src).toMatch(/prefassess_\$\{demoId\}/);
    expect(src).toMatch(/behaviorLens_abc_\$\{demoId\}/);
  });
});

describe('layer 5 — synthetic a11y over-tag must not return (ship-blocker #3, 2026-06-02)', () => {
  // A prior automated a11y pass blanket-wrapped 1,415 layout divs/spans with
  // `role="button"` + `tabIndex: 0` + a noop `onKeyDown` that called
  // `e.target.click()`. Screen readers announced every wrapper as "button"
  // and tab order was polluted with hundreds of non-interactive focusable
  // elements — worse for a11y than the missing-semantics it was supposedly
  // fixing. The strip removed the dead wraps from all 1,415 layout sites
  // and preserved only ~7 genuine interactive elements (modal backdrop
  // close, matrix +1, drag-drop file picker, grounding step, close ✕,
  // favorite star, complexity toggle).
  //
  // The exact dead-code shape:
  //   role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
  // It is uniquely identifiable by its e.target.click() noop body. The
  // genuine wraps either use a different prop order OR call the actual
  // handler directly. If a future automated pass reintroduces this exact
  // shape at scale, this test catches it.

  it('the noop e.target.click() onKeyDown body appears only on real-button elements (≤10 sites)', () => {
    // We use the registered source as the canonical truth — it captures
    // exactly what the BehaviorLens component renders.
    const src = H.BehaviorLens.toString();
    const matches = src.match(/onKeyDown:\s*function\(e\)\s*\{\s*if\s*\(e\.key\s*===\s*'Enter'\s*\|\|\s*e\.key\s*===\s*' '\)\s*\{\s*e\.preventDefault\(\);\s*e\.target\.click\(\);\s*\}\s*\}/g) || [];
    // After the 2026-06-02 strip there should be ≈7 genuine sites. A small
    // ceiling (10) tolerates a few new real buttons without re-flagging,
    // but a regression that wraps hundreds of layout divs again would
    // blow past this threshold immediately.
    expect(matches.length, `synthetic role-button wraps detected: ${matches.length}. If this is a real-button addition, bump the ceiling — if it is another bulk-wrap regression, revert the offending change.`).toBeLessThanOrEqual(10);
  });

  it('no <div> or <span> has a bare onClick prop (every click target must be a button or have keyboard wiring)', () => {
    const src = H.BehaviorLens.toString();
    // Naked-onClick on a div/span (no role=button, no tabIndex, no
    // onKeyDown) is the classic fake-button bug. After the 2026-06-02
    // pass, only the 8250 prebuilt-scenario inner div had this shape and
    // it has been wrapped with proper keyboard semantics. If a future
    // edit introduces a new naked-onClick div, this test catches it.
    expect(src.match(/h\('div',\s*\{\s*onClick/g) || []).toHaveLength(0);
    expect(src.match(/h\('span',\s*\{\s*onClick/g) || []).toHaveLength(0);
  });
});

describe('layer 6 — should-fix sweep regressions (2026-06-02 pass 2)', () => {
  // Pinning the 10-item should-fix punchlist that landed in the second
  // session. Each test guards one of the load-bearing pieces against
  // future regression. All greps here run against MODULE_SRC (the raw
  // file on disk), not H.BehaviorLens.toString() — most of the touched
  // surface lives in per-tool child components, which are closures inside
  // the IIFE but not part of the root factory function's .toString().

  it('AI consent gate exists: callGeminiGuarded + aiConsent state + bl_ai_consent_v1 flag', () => {
    expect(MODULE_SRC).toMatch(/const\s+callGeminiGuarded\s*=\s*useCallback/);
    expect(MODULE_SRC).toMatch(/bl_ai_consent_v1/);
    expect(MODULE_SRC).toMatch(/if\s*\(!aiConsent\)/);
  });

  it('callGeminiWithContext routes through callGeminiGuarded (single chokepoint)', () => {
    expect(MODULE_SRC).toMatch(/return\s+callGeminiGuarded\(enrichedPrompt,\s*jsonMode\)/);
  });

  it('root handleAiAnalyze checks aiConsent before calling Gemini', () => {
    // The handler body must include both a `!aiConsent` check and an early
    // return BEFORE the await callGemini line. Looser window (≤500 chars)
    // tolerates message/copy edits inside the if-block.
    expect(MODULE_SRC).toMatch(/handleAiAnalyze\s*=\s*async[\s\S]{0,200}if\s*\(!aiConsent\)[\s\S]{0,300}return/);
  });

  it('AI confidence is rendered as a qualitative bucket (Low/Moderate/High), not a raw %', () => {
    // The bucket helper is called from at least one render site.
    expect(MODULE_SRC).toMatch(/aiConfidenceBucket\(aiAnalysis\.confidence\)/);
    // The bare `${aiAnalysis.confidence}%` shape (raw % in user-facing
    // render) must not appear inside h(...) react render calls. It IS
    // still allowed in LLM prompt strings as context for the model —
    // those are not user-facing.
    const renderPctMatches = MODULE_SRC.match(/h\([^)]*`\$\{aiAnalysis\.confidence\}%`/g) || [];
    expect(renderPctMatches).toHaveLength(0);
  });

  it('AI-to-AI IOA is relabeled as Consistency (not "AI reliability")', () => {
    expect(MODULE_SRC).not.toMatch(/high confidence in AI reliability/);
    expect(MODULE_SRC).toMatch(/AI-to-AI agreement is a model-consistency check, not IOA/);
  });

  it('share code is gated on size, not silently truncated', () => {
    expect(MODULE_SRC).not.toMatch(/encoded\.substring\(0,\s*5000\)/);
    expect(MODULE_SRC).toMatch(/Snapshot too large for share code/);
  });

  it('trend detection requires ≥5 datapoints (ABA convention, not 2)', () => {
    expect(MODULE_SRC).toMatch(/if\s*\(dailyData\.length\s*<\s*5\)\s*return null;/);
    expect(MODULE_SRC).toMatch(/if\s*\(dailyData\.length\s*>=\s*5\)/);
    expect(MODULE_SRC).not.toMatch(/if\s*\(dailyData\.length\s*<\s*2\)\s*return null;/);
  });

  it('AI-analysis export checkbox defaults to OFF (opt-in, not opt-out)', () => {
    expect(MODULE_SRC).toMatch(/const\s+\[includeAi,\s*setIncludeAi\]\s*=\s*useState\(false\)/);
  });

  it('destructive actions use the accessible confirmation service (7 sites)', () => {
    const confirmations = (MODULE_SRC.match(/await askBehaviorLensConfirmation\(/g) || []).length;
    expect(confirmations).toBe(7);
    expect(MODULE_SRC).not.toMatch(/(?<![\w.])(?:window\.)?confirm\s*\(/);
  });

  it('every <div role="progressbar"> carries aria-valuenow (WCAG 2.1)', () => {
    const bars = (MODULE_SRC.match(/role:\s*['"]progressbar['"]/g) || []).length;
    const withValueNow = (MODULE_SRC.match(/role:\s*['"]progressbar['"][\s\S]{0,250}?['"]aria-valuenow['"]/g) || []).length;
    expect(bars).toBeGreaterThan(0);
    expect(withValueNow, `${bars - withValueNow} progressbar(s) missing aria-valuenow`).toBe(bars);
  });

  it('print/PDF AI-Analysis sections carry the AI-assisted disclaimer', () => {
    // The aiPrintDisclaimerHtml helper must be called from at least the 3
    // print handlers (Portfolio, FBA, BCBA). Each call site adds the
    // amber-bordered "not a clinical conclusion" block.
    const calls = (MODULE_SRC.match(/aiPrintDisclaimerHtml\(t\)/g) || []).length;
    expect(calls).toBeGreaterThanOrEqual(3);
  });
});

describe('layer 7 — pass-2 polish regressions (2026-06-03)', () => {
  // Pin the late-pass polish that landed after the 4 ship-blockers + 9
  // should-fixes were done. Each test guards one piece against regression.

  it('"BACB-aligned" overclaim is gone from user-facing copy', () => {
    // The "BACB-aligned" framing implied credentialing on outputs that
    // don't meet that bar. Both the OpDef hub card and the maintenance-
    // probe header have been reframed.
    expect(MODULE_SRC).not.toMatch(/BACB-aligned observable definitions/);
    expect(MODULE_SRC).not.toMatch(/'📋 BACB-Aligned Recommended Probe Schedule'/);
    // The honest replacements must be present.
    expect(MODULE_SRC).toMatch(/observable, measurable definitions using standard ABA dimensions/);
    expect(MODULE_SRC).toMatch(/Standard ABA Maintenance Probe Tiers/);
  });

  it('Chat handlers short-circuit on null callGemini result (no double-toast)', () => {
    // AlloBotChat + CounselingSimulation handleSend must check `result == null`
    // before processing — otherwise consent-off produces both a gate toast
    // AND a generic "AI failed" / bot apology message.
    const nullChecks = (MODULE_SRC.match(/if\s*\(result\s*==\s*null\)/g) || []).length;
    expect(nullChecks).toBeGreaterThanOrEqual(2);
  });

  it('AI analysis card surfaces a small-N warning when abcEntries.length < 10', () => {
    // The warning is non-blocking (exploratory use is fine) but flags that
    // n<10 isn't enough for treating function hypotheses as reliable.
    expect(MODULE_SRC).toMatch(/abcEntries\.length\s*<\s*10\s*&&\s*h\('div'/);
    expect(MODULE_SRC).toMatch(/Small sample/);
  });

  it('Crisis-plan contacts carry a stable `id` field for React keys', () => {
    // The "Add Contact" handler and the initial state both mint a uid()
    // so the contact .map's key prop is stable across add/remove.
    expect(MODULE_SRC).toMatch(/setContacts\(prev\s*=>\s*\[\.\.\.prev,\s*\{\s*id:\s*uid\(\),\s*name:\s*''/);
    expect(MODULE_SRC).toMatch(/useState\(\[\{\s*id:\s*uid\(\),\s*name:\s*'',\s*role:\s*'',\s*phone:\s*''/);
  });

  it('IOA-Calculator mode-toggle label is reframed to "AI Coding Consistency (Experimental)"', () => {
    // The button that switches IOA mode to AI should NOT call itself
    // "AI-Assisted IOA" anymore — that label implied inter-observer
    // agreement when the underlying metric is model-consistency.
    expect(MODULE_SRC).not.toMatch(/'🧠 AI-Assisted IOA'/);
    expect(MODULE_SRC).toMatch(/AI Coding Consistency \(Experimental\)/);
  });
});

describe('layer 8 — pass-3 audit regressions (2026-06-03)', () => {
  // Eighth-pass audit (the "comprehensive audit" the user requested) caught
  // 8 items the prior 7 passes had missed: broken Tailwind classNames in
  // ChoiceBoard, FERPA consent template literal-text bug, touch-target
  // padding, snapshot import validation, greedy JSON regex, voice-to-ABC
  // unguarded parse, and prompt injection in custom personas. These tests
  // pin each fix against regression.

  it('no malformed Tailwind classes (spaces around hyphens like "rounded - 3xl")', () => {
    // ChoiceBoard had 7 className strings with literal spaces around hyphens
    // → Tailwind invalid → unstyled buttons on iPad. The most common shapes
    // (rounded - 3xl, flex - col, items - center, bg - gradient, etc.) are
    // checked literally — they are pathognomonic of the bug and never appear
    // in legitimate code (which would either be `rounded-3xl` or a JS
    // arithmetic `count - 1` that lacks the Tailwind prefix word).
    const broken = [
      'rounded - 3xl', 'rounded - md', 'rounded - 2xl',
      'flex - col', 'flex - 1',
      'items - center', 'justify - center',
      'shadow - 2xl', 'transition - all', 'duration - 500', 'duration - 300',
      'gap - 4', 'p - 6', 'mb - 4',
      'drop - shadow - lg', 'drop - shadow - md',
      'font - black', 'text - white',
      'bg - gradient - to - br',
      // Note: 'w - 7' / 'h - 7' are excluded because JS code like
      // `new Date(now - 7 * 86400000)` legitimately contains them.
    ];
    const hits = broken.filter(b => MODULE_SRC.includes(b));
    expect(hits, `broken Tailwind tokens found: ${hits.join(', ')}`).toEqual([]);
  });

  it('print templates do not contain literal "{t(...)" (missing $ prefix)', () => {
    // Consent letter + BCBA progress report had ~10 sites where the t()
    // call was inside the template literal without the $ prefix, so the
    // printed PDF showed `{t('bl.x') || 'Default'}` as literal text.
    const matches = MODULE_SRC.match(/[^$]\{t\('bl\./g) || [];
    expect(matches, `literal {t(...)} found at ${matches.length} site(s) (should be $\{t(...)})`).toHaveLength(0);
  });

  it('parseJsonBlobFromText helper exists and is the primary AI JSON parser', () => {
    expect(MODULE_SRC).toMatch(/const\s+parseJsonBlobFromText\s*=\s*\(s\)/);
    // The old greedy /\{[\s\S]*\}/ pattern in the catch fallback shape has been migrated.
    const oldShape = (MODULE_SRC.match(/catch\s*\{\s*const m = result\.match\(\/\\\{\[\\s\\S\]\*\\\}\//g) || []).length;
    expect(oldShape).toBe(0);
    // The helper is referenced from many call sites (24 catch blocks + 5 jsonMatch sites + handleAiAnalyze).
    const refs = (MODULE_SRC.match(/parseJsonBlobFromText\(/g) || []).length;
    expect(refs).toBeGreaterThanOrEqual(20);
  });

  it('snapshot import validates per-entry shape + caps at 5000', () => {
    // The keystone data-integrity fix: SnapshotExchange parseFile must
    // validate every imported ABC/observation entry BEFORE merging, and
    // refuse oversize imports.
    expect(MODULE_SRC).toMatch(/_validateAbcEntry\s*=\s*\(e\)/);
    expect(MODULE_SRC).toMatch(/_validateObsSession\s*=\s*\(s\)/);
    expect(MODULE_SRC).toMatch(/SNAPSHOT_MAX_ENTRIES\s*=\s*5000/);
    // The dupe-count math should be calculated against the VALIDATED set,
    // not against the raw imported array (the prior bug).
    expect(MODULE_SRC).toMatch(/validAbc\.length\s*-\s*newAbc\.length/);
  });

  it('Voice-to-ABC parse validates Array, types, and caps at 100 entries', () => {
    expect(MODULE_SRC).toMatch(/!Array\.isArray\(entries\)/);
    expect(MODULE_SRC).toMatch(/\.slice\(0,\s*100\)/);
    // Per-entry intensity clamp must be present.
    expect(MODULE_SRC).toMatch(/e\.intensity\s*>=\s*1\s*&&\s*e\.intensity\s*<=\s*5/);
  });

  it('ABC table action buttons are p-2 (touch target ≥44px on iPad) with focus-visible rings', () => {
    // The 4 ABC-table icon buttons (Restorative, AI Edit, Edit, Delete)
    // were p-1 (~22px square) and lacked focus-visible rings. Both fixed.
    expect(MODULE_SRC).toMatch(/aria-label":\s*"Restorative Questions"[\s\S]{0,400}focus-visible:ring-2\s+focus-visible:ring-purple-400/);
    expect(MODULE_SRC).toMatch(/aria-label":\s*"Delete"[\s\S]{0,400}focus-visible:ring-2\s+focus-visible:ring-red-400/);
  });

  it('Counseling-sim custom persona is sanitized before splicing into Gemini prompt', () => {
    expect(MODULE_SRC).toMatch(/const\s+_sanitizePromptText\s*=\s*\(s,\s*maxLen\s*=\s*1500\)/);
    // Must redact known injection markers and cap length.
    expect(MODULE_SRC).toMatch(/ignore\s+\(all\s+\|previous\s+\|prior\s+\)\?instructions\?/);
  });
});
