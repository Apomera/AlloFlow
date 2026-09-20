import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { sliceBetween } from './helpers/anchored_slice.js';

const source = fs.readFileSync('view_misc_modals_source.jsx', 'utf8');
const strings = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8'));

// Only the UDL guide panel is under test. A whole-file regex would pass for
// free on a match inside one of the other three modals in this bundle.
const guide = sliceBetween(
  source,
  '// ── UDLGuideModal (UDL Guide Modal) — gate: showUDLGuide ──',
  '// ── PlatformDiagnosticsSection', { label: 'UDLGuideModal' });

describe('UDL guide modal — WCAG 2.2 AA', () => {
  it('slices the component it claims to test', () => {
    // Guards the gate itself: a renamed anchor must fail loudly rather than
    // silently widening to the whole file and passing everything below.
    expect(guide.length).toBeGreaterThan(20000);
    expect(guide.length).toBeLessThan(source.length * 0.75);
    expect(guide).toContain('function UDLGuideModal');
    expect(guide).not.toContain('function PlatformDiagnosticsSection');
  });

  // 4.1.2 Name, Role, Value + 2.4.6 Headings and Labels.
  it('names both panel states with a real heading', () => {
    expect(guide).toContain('role="dialog" aria-labelledby="udl-guide-title"');
    expect(guide).toContain('<h2 id="udl-guide-title"');
    expect(guide).toContain('role="dialog" aria-labelledby="udl-guide-title-collapsed"');
    expect(guide).toContain('<h2 id="udl-guide-title-collapsed"');
  });

  // 2.1.2 No Keyboard Trap + 2.4.3 Focus Order.
  it('closes on Escape and returns focus to the opener', () => {
    expect(guide).toContain("if (ev.key !== 'Escape') return");
    expect(guide).toContain('closeGuideRef.current()');
    expect(guide).toContain('previousFocus.focus()');
    // The effect must key off visibility only. Adding closeGuide (a new
    // identity every render) would re-run cleanup and steal focus mid-typing.
    expect(guide).toContain('}, [showUDLGuide]);');
    // One Escape closes one layer: the inner menu marks the press consumed.
    // Pinned as behaviour rather than one formatting of it — the handler grew
    // a focus-return line and a single-line pin would have broken on that.
    const menuEscape = sliceBetween(guide, 'const onKey = (ev) => {', 'const onDown', { label: 'menu Escape' });
    expect(menuEscape).toContain("if (ev.key === 'Escape')");
    expect(menuEscape).toContain('ev.preventDefault()');
    expect(menuEscape).toContain('setChatMenuOpen(false)');
    expect(guide).toContain('if (ev.defaultPrevented) return');
  });

  // 4.1.3 Status Messages — a reply arrives with no focus change.
  it('announces new turns without re-reading the thread', () => {
    expect(guide).toContain('role="log" aria-live="polite" aria-relevant="additions" aria-atomic="false"');
    // The collapsed bar's spinner is otherwise the only "still working" cue.
    expect(guide).toContain('<span className="sr-only" role="status">{t(\'bot.mood_thinking\')}</span>');
  });

  // 4.1.2 again: these eight controls carried auto-generated placeholder
  // names. The send button announced "Show"; the region input announced the
  // raw key string "standards.region_framework_placeholder".
  it('never labels a control with a generic placeholder string', () => {
    for (const dead of [
      "t('common.show')",
      "t('common.continue')",
      "t('common.selection')",
      "t('common.refresh')",
      "t('common.text_field')",
      "t('common.enter_udl_input')",
      "t('common.standards_region_framework_placeholder')",
      "t('common.toggle_blueprint_mode')",
    ]) {
      expect(guide).not.toContain(dead);
    }
  });

  it('gives each control a name that matches what it does', () => {
    expect(guide).toContain("tx('chat_guide.send_aria', 'Send message')");
    expect(guide).toContain("tx('chat_guide.send_showme_aria', 'Show me where this is on screen')");
    expect(guide).toContain("tx('chat_guide.input_aria', 'Ask the UDL guide a question')");
    expect(guide).toContain("tx('standards.framework_aria', 'Standards framework')");
    expect(guide).toContain("tx('standards.grade_aria', 'Grade level')");
    expect(guide).toContain("aria-label={t('standards.consult_btn_title')}");
    expect(guide).toContain("aria-label={t('standards.region_framework_placeholder')}");
  });

  // 2.5.3 Label in Name — an aria-label over visible text breaks voice control.
  it('lets visible text be the accessible name where one exists', () => {
    // Slice from the opening <button>, not from an attribute partway through
    // it: an aria-label added BEFORE data-help-key would sit outside a slice
    // anchored there, and this assertion would pass while the bug shipped.
    const autofill = sliceBetween(guide, '<input\n                type="checkbox"', '</label>', { label: 'autofill checkbox' });
    expect(autofill).not.toContain('aria-label');
    expect(autofill).toContain('id="udl-autofill-check"');
    expect(guide).toContain('<AllobotAdviceSave');
    const controls = fs.readFileSync('allobot_context_controls.jsx', 'utf8');
    const save = sliceBetween(controls, '<button type="button" onClick={saveAdvice}', '</button>', { label: 'save advice button' });
    expect(save).toContain('chat_guide.save_advice_history');
    expect(save).not.toContain('aria-label');
  });

  // 2.5.8 Target Size (Minimum), new in WCAG 2.2: 24x24 CSS px.
  it('gives every icon-only control a 24px minimum target', () => {
    const iconOnly = guide.match(/className="[^"]*\bp-1 rounded[^"]*"/g) || [];
    expect(iconOnly.length).toBeGreaterThan(0);
    for (const cls of iconOnly) {
      expect(cls).toContain('min-w-[24px]');
      expect(cls).toContain('min-h-[24px]');
    }
    // The two "×" delete buttons are text, not icons, but are just as small.
    const dels = guide.match(/className="[^"]*border-slate-300 text-slate-700[^"]*"/g) || [];
    expect(dels).toHaveLength(2);
    for (const cls of dels) expect(cls).toContain('min-h-[24px]');
  });

  // 2.3.3 Animation from Interactions.
  it('stops every animation under prefers-reduced-motion', () => {
    // Each bare animate-* would keep running for a user who asked it not to.
    expect(guide).not.toMatch(/(?<!motion-safe:)\banimate-(pulse|spin|in)\b/);
    expect(guide).toContain('motion-safe:animate-pulse');
    expect(guide).toContain('motion-safe:animate-spin');
    expect(guide).toContain('motion-safe:animate-in');
  });

  it('registers every new key so all 63 packs translate it', () => {
    for (const [ns, key] of [
      ['chat_guide', 'transcript_aria'], ['chat_guide', 'input_aria'],
      ['chat_guide', 'send_aria'], ['chat_guide', 'send_showme_aria'],
      ['standards', 'framework_aria'], ['standards', 'grade_aria'],
      ['standards', 'searching'], ['standards', 'results_count'],
      ['chat_guide', 'choices_group'], ['chat_guide', 'command_details'],
      ['common', 'required_marker'],
    ]) {
      expect(strings[ns][key], `${ns}.${key}`).toBeTruthy();
    }
  });

  // 2.4.11 Focus Not Obscured + 2.1.2: the preview overlay declares
  // aria-modal="true", so it must actually behave like one.
  it('enforces the modality the preview overlay claims', () => {
    expect(guide).toContain('aria-labelledby="bp-preview-title"');
    expect(guide).toContain('id="bp-preview-title"');
    expect(guide).toContain('ref={previewRef}');
    // Tab containment, Escape, and focus return.
    expect(guide).toContain("if (ev.key !== 'Tab') return");
    expect(guide).toContain('closePreviewRef.current()');
    expect(guide).toContain("document.addEventListener('keydown', onKey, true)");
    expect(guide).toContain('}, [blueprintPreview]);');
  });

  // 3.3.2 Labels or Instructions.
  it('marks required command fields in text, not colour alone', () => {
    const fields = sliceBetween(source, 'function AlloCommandFields', 'function UDLGuideModal', { label: 'AlloCommandFields' });
    expect(fields).toContain("aria-required={field.required ? 'true' : undefined}");
    expect(fields).toContain("tx('common.required_marker', '(required)')");
    expect(fields).toContain("aria-label={tx('chat_guide.command_details', 'Command details')}");
  });

  // 4.1.3 + 1.3.1 for the standards results.
  it('announces standards results and exposes them as a list', () => {
    expect(guide).toContain("tx('standards.searching', 'Searching for standards…')");
    expect(guide).toContain("t('standards.results_count', { count: suggestedStandards.length })");
    expect(guide).toContain('<ul className={`max-h-32');
    // The clamp truncates the visible text, so the name is spelled out.
    expect(guide).toContain("aria-label={`${std.code}${std.framework ? ' (' + std.framework + ')' : ''}: ${std.description}`}");
    // A <p> inside a <button> is invalid HTML and breaks the row's name.
    const rows = sliceBetween(guide, '{suggestedStandards.map((std, idx) => (', '</ul>', { label: 'standards rows' });
    expect(rows).not.toContain('<p className');
    expect(rows).toContain('<li key={idx}>');
  });

  // The dialog's name hangs on ONE key; a pack resolving it to empty would
  // leave the panel nameless, which a source scan for the attribute misses.
  it('never lets the dialog name collapse to an empty string', () => {
    expect(guide).toContain("tx('chat_guide.header', 'AI Guide & Assistant')");
    expect(guide).not.toContain("{t('chat_guide.header')}");
    // The reply pills are a group of choices, not a second copy of the title.
    expect(guide).toContain("tx('chat_guide.choices_group', 'Suggested replies')");
  });

  // The overflow menu promises menu semantics; tests/udl_guide_menu_keyboard
  // proves the behaviour, these pin the wiring it depends on.
  it('keeps the overflow menu operable by mouse and keyboard', () => {
    // Dismissal must ignore presses inside the menu, or an item is destroyed
    // by its own mousedown before its click can run.
    expect(guide).toContain('if (menu && ev.target && menu.contains(ev.target)) return;');
    expect(guide).toContain('ref={chatMenuRef}');
    expect(guide).toContain('ref={chatMenuTriggerRef}');
    expect(guide).toContain('chatMenuTriggerRef.current?.focus()');
    expect(guide).toContain("querySelector('[role^=\"menuitem\"]')");
    expect(guide).toContain("ev.key !== 'ArrowDown'");
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('desktop/web-app/public/view_misc_modals_module.js', 'utf8'))
      .toBe(fs.readFileSync('view_misc_modals_module.js', 'utf8'));
  });
});

describe('chat theme tokens — 1.4.3 Contrast (Minimum)', () => {
  // These four pairs shipped below 4.5:1; the dark secondary button was 1.93:1.
  // Graded here rather than by eye: a future token swap gets measured.
  const HEX = {
    'slate-300': '#cbd5e1', 'slate-400': '#94a3b8', 'slate-600': '#475569',
    'slate-800': '#1e293b', 'slate-950': '#020617', white: '#ffffff',
    'yellow-700': '#a16207', 'orange-700': '#c2410c',
  };
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(HEX[a]), lum(HEX[b])];
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const handlers = fs.readFileSync('export_handlers_module.js', 'utf8');
  const tokens = sliceBetween(handlers, 'const getChatThemeStyles = (deps)', 'runGlossaryHealthCheck', { label: 'chat theme' });

  it.each([
    ['dark secondary button text', 'slate-300', 'slate-800'],
    ['dark sub-text', 'slate-400', 'slate-950'],
    ['dark input placeholder', 'slate-400', 'slate-800'],
    ['yellow overlay bubble', 'white', 'yellow-700'],
    ['peach overlay bubble', 'white', 'orange-700'],
  ])('%s clears 4.5:1', (_name, fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the failing tokens out of the chat theme', () => {
    // Pin the WHOLE token string. Asserting only the replacement colour lets a
    // revert to text-slate-600 slip through on the surrounding text still
    // matching, which is exactly how this assertion first went vacuous.
    expect(tokens).toContain("secondaryButton: 'bg-slate-800 text-slate-300 border border-slate-600 hover:bg-slate-700'");
    expect(tokens).toContain("text: 'text-slate-200', subText: 'text-slate-400'");
    expect(tokens).toContain("text-slate-200 focus:border-indigo-500 placeholder:text-slate-400");
    // Scope the ban to the DARK branch. slate-600 is legitimate in the light
    // theme (7.58:1 on white) and as a border colour anywhere; only a
    // slate-600 foreground on a slate-800/950 ground is the 1.4.3 failure.
    const dark = sliceBetween(tokens, "if (theme === 'dark')", 'let bgTint', { label: 'dark theme' });
    expect(dark).toContain('bg-slate-950');
    expect(dark).not.toMatch(/(?:text|placeholder:text)-slate-600/);
    expect(tokens).not.toContain('bg-yellow-600');
    expect(tokens).not.toContain('bg-orange-600');
  });
});
