// docs/product_review_2026-11-09.md: the Help "?" and its first-run tip existed only in the expanded header, and the tip
// fired behind the Launch Pad and then marked itself seen. Independent learners saw the class "Student QR" share section.
// HEADER_HELP_SRC / HEADER_HELP_ANTI point at other copies for the fail-first check.
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const header = () => readFileSync(process.env.HEADER_HELP_SRC || 'view_header_source.jsx', 'utf8').replace(/\r\n/g, '\n');
const anti = () => readFileSync(process.env.HEADER_HELP_ANTI || 'AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');

describe('Help in the compact header bar', () => {
  it('has a labelled help toggle, shown only while the header is compact, placed before "Settings & more"', () => {
    const src = header();
    const at = src.indexOf('data-compact-help-toggle');
    expect(at).toBeGreaterThan(0);
    const block = src.slice(src.lastIndexOf('{headerCollapsed && (', at), src.indexOf("{t('header.more_settings') || 'Settings & more'}", at));
    expect(block).toContain('onClick={handleHelpButton} aria-pressed={isHelpMode}');
    expect(block).toContain('aria-label={helpButtonLabel}');
    expect(block).toContain('{helpMenu}');
    expect(block).toContain('data-compact-help-tip');
    expect(block).toContain('onClick={dismissHelpOnboarding}');
    expect(block).toContain('{guidedResumeChip}');
  });

  // 2026-11-10: the tour icon and the tips lightbulb were unlabelled icons in the
  // expanded header only. They are rows in the teacher's "?" menu now.
  it('teachers get a short Help menu; one click still leaves Help Mode, and students keep the plain switch', () => {
    const src = header();
    expect(src).toContain('const helpMenuAvailable = !!isTeacherMode;');
    expect(src).toContain('if (isHelpMode || !helpMenuAvailable) { setShowHelpMenu(false); handleToggleIsHelpMode(); return; }');
    expect(src).toContain("isHelpMode ? t('help_mode.deactivate') : (helpMenuAvailable ? helpMenuTitle : t('help_mode.activate'))");
    for (const row of ['data-help-menu-explain=""', 'data-help-menu-tour=""', 'data-help-menu-tips=""']) expect(src).toContain(row);
    expect(count(src, '{helpMenu}'), 'compact and expanded headers both open it').toBe(2);
    expect(count(src, 'data-help-menu-toggle=""')).toBe(2);
  });

  it('the moved icons are gone from the expanded header, and the dot rides on "?"', () => {
    const src = header();
    expect(src).not.toContain('onClick={handleSetShowHintsModalToTrue}');
    expect(src).not.toContain("onClick={() => { setRunTour(true); setTourStep(0); setSpotlightMessage(''); }}");
    expect(count(src, 'data-help-key="hints_recall"')).toBe(1);
    expect(count(src, '{helpDot}')).toBe(2);
    expect(src).toContain("(hintHistory || []).length > 0 || (toastHistoryCount || 0) > 0");
  });

  it('Start & setup stays in both headers and still lists the tour', () => {
    const src = header();
    expect(count(src, 'onClick={() => setShowSetupPathMenu(true)}')).toBe(2);
    expect(src).toContain('data-setup-tour-start=""');
  });

  it('the menu closes on Escape and on a click outside it', () => {
    const src = header();
    expect(src).toContain("if (event.key !== 'Escape') return;");
    expect(src).toContain("document.addEventListener('mousedown', outside);");
  });

  it('the first-run tip waits for a role and is not spent behind the Launch Pad', () => {
    const src = anti();
    const a = src.indexOf('  // First-run help tip: only once a role is chosen');
    expect(a).toBeGreaterThan(src.indexOf('const [hasSelectedRole, setHasSelectedRole] = useState(false);'));
    const body = src.slice(src.indexOf('useEffect(() => {', a), src.indexOf('}, [hasSelectedRole, isGateOpen]);', a) + '}, [hasSelectedRole, isGateOpen]);'.length);
    vi.useFakeTimers();
    const store = {}; const shown = [];
    const run = (hasSelectedRole) => { let cleanup; new Function('useEffect', 'hasSelectedRole', 'isGateOpen', 'safeGetItem', 'safeSetItem', 'setShowHelpOnboarding', body)(
      (fn) => { cleanup = fn(); }, hasSelectedRole, false, (k) => store[k], (k, v) => { store[k] = v; }, (v) => shown.push(v)); return cleanup; };
    run(false); vi.advanceTimersByTime(30000);
    expect(shown, 'no role yet: nothing shown, nothing marked seen').toEqual([]); expect(store.allo_help_onboarded).toBeUndefined();
    run(true); vi.advanceTimersByTime(4000); expect(shown).toEqual([true]);
    vi.advanceTimersByTime(20000); expect(shown).toEqual([true, false]); expect(store.allo_help_onboarded).toBe('true');
    // Seen once shown: someone who leaves after 5 s does not get the bouncing tip on every visit.
    for (const k of Object.keys(store)) delete store[k]; shown.length = 0;
    const cleanup = run(true); vi.advanceTimersByTime(5000); cleanup();
    expect(shown).toEqual([true]); expect(store.allo_help_onboarded).toBe('true');
    shown.length = 0; run(true); vi.advanceTimersByTime(30000); expect(shown, 'next visit: no tip').toEqual([]);
    vi.useRealTimers();
    expect(count(src, "safeGetItem('allo_help_onboarded') !== 'true'")).toBe(1);
  });

  it('the tip bounces three times, then holds still; help mode is a steady yellow, not a pulse', () => {
    for (const f of ['view_header_source.jsx', 'view_header_module.js', 'desktop/web-app/public/view_header_module.js']) {
      const src = readFileSync(f, 'utf8');
      expect(count(src, 'animationIterationCount: 3'), f + ': both tip copies').toBe(2);
      expect(src, f).not.toContain("bg-yellow-400 text-slate-900 shadow-md animate-pulse");
    }
  });
});
const count = (s, a) => s.split(a).length - 1;

describe('independent learners', () => {
  it('do not see the class Student QR section; teachers and families still do', () => {
    const src = header();
    const a = src.indexOf('{!isIndependentMode && (<>');
    const heading = src.indexOf("{t('export_menu.section_student_qr') || 'Student QR'}");
    const policy = src.indexOf("t('export_menu.share_policy_byok')");
    const close = src.indexOf('</>)}', policy);
    expect(a).toBeGreaterThan(0); expect(heading).toBeGreaterThan(a); expect(heading - a).toBeLessThan(200);
    expect(close).toBeGreaterThan(policy); expect(close - policy).toBeLessThan(900);
    expect(src.slice(a, close)).toContain("t('export_menu.homework_qr')");
    expect(src.slice(a, close)).not.toContain('isParentMode');
  });
});
