// Research Suite extraction + header move (2026-08-23).
//
//  - The IRB study surface (the Assessment Center's third tab) is now a
//    first-class standalone tool: its own host state, its own Educator Hub
//    card (Extend and discover, hidden from family/independent mode), the
//    SAME panel in a researchSuiteOnly presentation — tab bar gone, research
//    view forced, title "Research Suite".
//  - The Assessment Center's persistent teacher entry moved to Educator Hub →
//    Teach and assess; the header slot renders for family/independent mode
//    always (F1) and for teachers only while a screening battery is live.
//  - The Administer tab gains a read-only study strip; the study-day number
//    has exactly ONE derivation (_acStudyDayInfo) shared with the research
//    banner — two hand-rolled copies of one fact is the OneVerdict bug class.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';

let anti;
let ac;
let hubSource;
let headerSource;
let headerModule;

beforeAll(() => {
  anti = readFileSync('AlloFlowANTI.txt', 'utf8');
  ac = readFileSync('student_analytics_module.js', 'utf8');
  hubSource = readFileSync('view_educator_hub_modal_source.jsx', 'utf8');
  headerSource = readFileSync('view_header_source.jsx', 'utf8');
  headerModule = readFileSync('view_header_module.js', 'utf8');
});

function braceBalanced(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(open, i + 1); }
  }
  throw new Error('unbalanced region');
}

describe('researchSuiteOnly presentation (module)', () => {
  it('the prop defaults false, so every existing host renders exactly as before', () => {
    expect(ac).toContain('researchSuiteOnly = false,');
  });

  it('every tab COMPARISON reads effectiveTab; none read the raw state', () => {
    expect(ac).toContain("const effectiveTab = researchSuiteOnly ? 'research' : assessmentCenterTab;");
    // The decl and setter calls remain; comparisons must not.
    expect(ac.match(/assessmentCenterTab === /g)).toBeNull();
  });

  it('research-only mode drops the tab bar and renames the dialog', () => {
    expect(ac).toContain('!isIndependentMode && !researchSuiteOnly && /*#__PURE__*/React.createElement("div", {\n      className: "flex border-b border-slate-200 bg-slate-50/50 px-4 shrink-0"');
    expect(ac).toContain("researchSuiteOnly ? '\\u{1F9EA} Research Suite' : ");
  });

  it('the family/independent research gate survives the rewrite', () => {
    expect(ac).toContain("!isIndependentMode && !isParentMode && effectiveTab === 'research'");
  });
});

describe('one derivation of the study day', () => {
  function loadDayInfo() {
    const at = ac.indexOf('function _acStudyDayInfo(mode)');
    expect(at).toBeGreaterThan(-1);
    const src = ac.slice(at, ac.indexOf('{', at)) + braceBalanced(ac, ac.indexOf('{', at)) + ';';
    // eslint-disable-next-line no-new-func
    return new Function(src + ' return _acStudyDayInfo;')();
  }

  it('day 1 at study start; days and weeks grow together', () => {
    const info = loadDayInfo();
    const today = info({ startDate: new Date().toISOString() });
    expect(today.days).toBe(1);
    expect(today.weeks).toBe(1);
    const eightDays = info({ startDate: new Date(Date.now() - 8 * 86400000).toISOString() });
    expect(eightDays.days).toBeGreaterThanOrEqual(7);
    expect(eightDays.days).toBeLessThanOrEqual(9);
    expect(info(null).days).toBe(1); // missing mode never throws
  });

  it('both consumers call the helper; the raw arithmetic exists exactly once', () => {
    expect(ac).toContain('const _sdi = _acStudyDayInfo(researchMode);');       // research banner
    expect(ac).toContain('_acStudyDayInfo(researchMode).days');               // Administer strip
    // Day arithmetic specifically (the RAN probe's elapsed-SECONDS timers are
    // a different fact and rightly keep their own derivations).
    expect(ac.match(/\/ \(24 \* 60 \* 60 \* 1000\)/g)).toHaveLength(1);       // only inside the helper
  });

  it('the strip is read-only context on the Administer tab, hidden in the suite itself', () => {
    expect(ac).toContain('!researchSuiteOnly && researchMode && researchMode.studyName && React.createElement');
    expect(ac).toContain("t('class_analytics.study_strip_prefix') || 'Study: '");
  });
});

describe('host wiring', () => {
  it('one panel, two doors: the Assessment Center wins if both are open', () => {
    expect(anti).toContain('isOpen={showClassAnalytics || isResearchSuiteOpen}');
    expect(anti).toContain('researchSuiteOnly={isResearchSuiteOpen && !showClassAnalytics}');
    expect(anti).toContain('const handleCloseClassAnalytics = useCallback(() => { setShowClassAnalytics(false); setIsResearchSuiteOpen(false); }, []);');
  });

  it('the palette can close it like any other panel', () => {
    expect(anti).toContain("if (isResearchSuiteOpen) { setIsResearchSuiteOpen(false); return 'Research Suite closed.'; }");
    expect(anti).toContain('researchSuite: () => setIsResearchSuiteOpen(false),');
  });

  it('the Educator Hub receives both openers (a prop nobody supplies is a dead gate)', () => {
    expect(anti).toContain('setShowClassAnalytics={setShowClassAnalytics} setIsResearchSuiteOpen={setIsResearchSuiteOpen}');
  });

  it('the module is loaded unconditionally, so a research-only open cannot hang on the gate', () => {
    expect(anti).toContain("loadModule('StudentAnalytics'");
  });
});

describe('Educator Hub cards', () => {
  it('the Assessment Center card is visible to every role (F1: kept for parents)', () => {
    const at = hubSource.indexOf('data-hub-id="assessment-center"');
    expect(at).toBeGreaterThan(-1);
    expect(hubSource.slice(Math.max(0, at - 300), at)).not.toContain('hideSchoolProfessional');
    expect(hubSource).toContain('educator_hub_assessment_center_card');
    const card = hubSource.slice(at, at + 2200);
    expect(card).toContain('setShowEducatorHub(false); setShowClassAnalytics(true);');
    expect(card).toContain('data-hub-section="teach"');
    expect(card).toContain("toggleHubFavorite('assessment-center')");
  });

  it('the Research Suite card is gated exactly like the other school-professional cards', () => {
    const at = hubSource.indexOf('data-hub-id="research-suite"');
    expect(at).toBeGreaterThan(-1);
    expect(hubSource.slice(Math.max(0, at - 300), at)).toContain('{!hideSchoolProfessional && (');
    const card = hubSource.slice(at, at + 2200);
    expect(card).toContain('setShowEducatorHub(false); setIsResearchSuiteOpen(true);');
    expect(card).toContain('data-hub-section="extend"');
  });

  it('both openers default to no-ops so an older host renders unchanged', () => {
    expect(hubSource).toContain('setShowClassAnalytics = (() => {}), setIsResearchSuiteOpen = (() => {}),');
  });
});

describe('header slot earns its place', () => {
  it('renders for family and independent mode always, for teachers only during a live battery', () => {
    expect(headerSource).toContain('{(isParentMode || isIndependentMode || screeningLiveActive) && (');
    expect(headerSource).toContain("const screeningLiveActive = Boolean(screenerSession && screenerSession.status !== 'complete' && !isParentMode && !isIndependentMode);");
  });

  it('the live label counts remaining subtests and tolerates a malformed session', () => {
    expect(headerSource).toContain('Math.max(0, ((screenerSession.subtests || []).length - (screenerSession.currentIndex || 0)))');
    expect(headerSource).toContain('{headerAnalyticsLabel}');
    expect(headerSource).not.toContain('<span className="hidden lg:inline">{parentProgressLabel}</span>');
  });

  it('the built module carries the change and the host passes screenerSession', () => {
    expect(headerModule).toContain('screeningLiveActive');
    expect(anti).toContain('screenerSession={screenerSession} startClassSession=');
  });
});
