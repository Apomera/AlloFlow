// Students who arrive by QR or link (docs/product_review_2026-11-09.md, A1-A6) and a Guided Mode error (B2):
// - "Change codename" opened the lesson-file dialog; closing the codename picker dropped a student onto the role picker.
// - A failed homework load left "Loading your homework" on screen for good; waiting live students saw homework text.
// - An ended session blamed the connection; messages claimed work was saved "on this device" where autosave is off.
// - A Guided Mode key/permission error offered "Review settings", which opens grade and language, not AI setup.
// STUDENT_DEAD_ENDS_ANTI / _BANNER point at other copies for the fail-first check.
import { describe, expect, it, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';

const anti = readFileSync(process.env.STUDENT_DEAD_ENDS_ANTI || 'AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
const banner = readFileSync(process.env.STUDENT_DEAD_ENDS_BANNER || 'view_guided_mode_banner_source.jsx', 'utf8').replace(/\r\n/g, '\n');
const between = (text, a, b) => { const i = text.indexOf(a); const j = text.indexOf(b, i + a.length); if (i < 0 || j < 0) throw new Error('anchor missing: ' + a); return text.slice(i, j); };
afterEach(() => { vi.restoreAllMocks(); });

describe('the codename picker', () => {
  it('"Change codename" opens the codename picker', () => {
    expect(anti).toContain('changeCodename: () => setShowStudentEntry(true)');
    expect(anti).not.toContain('changeCodename: () => setShowStudentWelcome(true)');
  });

  it('closing it keeps a QR or link student in the student view; anyone else returns to the role choice', () => {
    const body = between(anti, '  const handleCloseStudentEntry = useCallback(', '  const handleCloseWordScramble');
    const make = (viaLink) => {
      const calls = { entry: [], role: [], join: [] };
      const fn = new Function('useCallback', '_alloHasAnyStudentEntry', 'setShowStudentEntry', 'setHasSelectedRole', 'setPendingJoinCode', 'setHasSelectedMode', 'studentHubAfterEntryRef', 'studentEntryFromPadRef',
        body + '\nreturn handleCloseStudentEntry;')((f) => f, () => viaLink, (v) => calls.entry.push(v), (v) => calls.role.push(v), (v) => calls.join.push(v), () => {}, { current: false }, { current: false });
      fn(); return calls;
    };
    expect(make(true)).toEqual({ entry: [false], role: [], join: [] });
    expect(make(false)).toEqual({ entry: [false], role: [false], join: [null] });
  });
});

describe('the student waiting screen', () => {
  const getBlock = () => between(anti, "_alloStudentExploring\n                    ? (t('input.empty_student_explore_heading')", "{_alloStudentExploring && (");
  const pick = (state) => {
    const heading = between(getBlock(), '', '}</h2>');
    const run = new Function('s', 't', 'with (s) { return (' + heading + '); }');
    return run({ _alloStudentExploring: false, isTeacherMode: false, isIndependentMode: false, isParentMode: false, ...state }, () => '');
  };
  it('says "Waiting for your class" in a live session, even on a link entry', () => {
    expect(pick({ isStudentLinkMode: true, activeSessionCode: 'AB123', studentHomeworkLoadFailed: false })).toBe('Waiting for your class');
  });
  it('says the homework is loading, then that it did not load', () => {
    expect(pick({ isStudentLinkMode: true, activeSessionCode: null, studentHomeworkLoadFailed: false })).toBe('Loading your homework');
    expect(pick({ isStudentLinkMode: true, activeSessionCode: null, studentHomeworkLoadFailed: true })).toBe('This homework did not load');
  });
  it('offers "Try again" after a failed load, and the load records success and failure', () => {
    const block = getBlock();
    expect(block).toContain("data-student-homework-retry onClick={() => window.location.reload()}");
    expect(block).toContain('Check your connection, then try again.');
    // On a phone the message is on the Preview tab; students land on Tools, so the failure switches tabs.
    expect(anti).toContain("if (isCurrentEntry()) { setStudentHomeworkLoadFailed(true); setWorkspacePane('preview'); addToast('Could not load this homework");
    expect(anti).toMatch(/setStudentHomeworkLoadFailed\(false\);\s+addToast\('Homework loaded: '/);
  });
});

describe('a student on a phone (one tab at a time)', () => {
  it('every QR or link entry opens the Preview tab, where the waiting/loading message is', () => {
    const entries = anti.match(/setIsStudentLinkMode\(true\);\n\s+setShowStudentEntry\(true\);\n\s+setWorkspacePane\('preview'\);/g) || [];
    expect(entries.length, 'live join, assignment, #allo_pack, mailbox live, mailbox homework').toBe(5);
    expect(anti).not.toMatch(/setIsStudentLinkMode\(true\);\n\s+setShowStudentEntry\(true\);\n(?!\s+setWorkspacePane\('preview'\))/);
  });
  it('the tab names are translated', () => {
    expect(anti).not.toContain("{isTeacherMode ? 'Create' : 'Tools'}");
    expect(anti).toContain("{isTeacherMode ? (t('sidebar.create_tab') || 'Create') : (t('glossary.tools_toggle') || 'Tools')}");
    expect(anti).toContain("{t('blueprint.preview_step_short') || 'Preview'}");
  });
  it('a loading or failed homework screen does not say "Connected"', () => {
    const cond = between(anti, "{(_alloStudentExploring || isTeacherMode", ") && <p className=\"text-xs font-bold uppercase").slice(1) + ')';
    const shows = (s) => !!new Function('s', 'with (s) { return (' + cond + '); }')({ _alloStudentExploring: false, isTeacherMode: false, isIndependentMode: false, isStudentLinkMode: false, activeSessionCode: null, ...s });
    expect(shows({ isStudentLinkMode: true })).toBe(false);
    expect(shows({ isStudentLinkMode: true, activeSessionCode: 'AB123' })).toBe(true);
    expect(shows({ isTeacherMode: true })).toBe(true);
    expect(shows({ isStudentLinkMode: true, _alloStudentExploring: true })).toBe(true);
  });
  it('the header buttons wrap instead of spilling off the left edge (Join Class sat at x = -42 at 390 px)', () => {
    for (const f of ['view_header_source.jsx', 'view_header_module.js', 'desktop/web-app/public/view_header_module.js']) {
      expect(readFileSync(f, 'utf8'), f).toContain('ml-auto min-w-0 flex flex-wrap items-center justify-end gap-1.5 sm:gap-2');
    }
  });
});

describe('student messages say what is true', () => {
  it('an ended or closed session does not blame the connection', () => {
    const src = between(anti, 'const joinMessage = oldScript', 'setMbJoinStatus(joinMessage);');
    const message = (oldScript, sessionGone) => new Function('oldScript', 'sessionGone', src + '\nreturn joinMessage;')(oldScript, sessionGone);
    expect(message(false, true)).toBe('This class session has ended or is not open to this device. Ask your teacher for a new QR code.');
    expect(message(false, false)).toContain('Check the connection');
    expect(message(true, false)).toContain('update the Class Mailbox script');
  });
  it('does not claim work is saved on the device where autosave is off', () => {
    expect(anti).not.toMatch(/Your work (remains|stays) on this device/);
    expect(anti).toContain('Your work stays open in this tab until you close or reload it.');
    expect(anti).toContain("t('live_connection.host_stale_tab')");
  });
});

describe('Guided Mode error buttons', () => {
  const getSignal = () => between(banner, 'const guidedErrorNeedsAiSetup = ', ';\n').replace('const guidedErrorNeedsAiSetup = ', '');
  const needs = (signal, hasSetup = true) => { const prev = window.__alloOpenAiSetup; if (hasSetup) window.__alloOpenAiSetup = () => {}; else delete window.__alloOpenAiSetup;
    try { return new Function('guidedErrorSignal', 'return ' + getSignal())(signal); } finally { if (prev) window.__alloOpenAiSetup = prev; else delete window.__alloOpenAiSetup; } };
  it('key, permission and allowance errors open AI setup', () => {
    for (const s of ['403 permission denied', ' invalid api key', 'quota exceeded', ' billing not enabled']) expect(needs(s), s).toBe(true);
    for (const s of ['429 rate limit', ' network timeout', ' something else']) expect(needs(s), s).toBe(false);
    expect(needs('403', false), 'older host without AI setup keeps Review settings').toBe(false);
  });
  it('the AI button calls AI setup and Review settings stays for other errors', () => {
    expect(banner).toContain("data-guided-open-ai-setup onClick={() => window.__alloOpenAiSetup()}");
    expect(banner).toContain("{t('guided.error_open_ai') || 'Open AI settings'}");
    expect(banner).toContain("onClick={openUniversalSettings}");
  });
});
