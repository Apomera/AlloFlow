import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_header_source.jsx', 'utf8');

describe('Header popover semantics and dismissal', () => {
  it('exposes disclosure state for Text, Voice, Join, and Documents triggers', () => {
    expect(source).toContain('aria-expanded={showTextSettings}');
    expect(source).toContain('aria-expanded={showVoiceSettings}');
    expect(source).toContain('aria-expanded={isJoinPopoverOpen}');
    expect(source).toContain('aria-expanded={showExportMenu}');
    expect(source.match(/aria-haspopup="dialog"/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('makes all four header dialogs modal, named, trapped, and dismissible', () => {
    expect(source).toContain('_headerUseFocusTrap(_setupMenuRef, showSetupPathMenu');
    expect(source).toContain('_headerUseFocusTrap(_textSettingsRef, showTextSettings');
    expect(source).toContain('_headerUseFocusTrap(_voiceSettingsRef, showVoiceSettings');
    expect(source).toContain('_headerUseFocusTrap(_joinPopoverRef, isJoinPopoverOpen');
    expect(source).toContain('aria-labelledby="header-text-settings-title"');
    expect(source).toContain('aria-labelledby="header-voice-settings-title"');
    expect(source).toContain('aria-labelledby="header-join-session-title"');
    expect(source.match(/aria-modal="true"/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source.match(/min-w-6 min-h-6/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).not.toContain(`document.querySelector('[data-help-key="header_settings_text"]')`);
    expect(source).not.toContain(`document.querySelector('[data-help-key="header_settings_voice"]')`);
    expect(source).not.toContain(`document.querySelector('[data-help-key="header_session_join"]')`);
  });

  it('keeps click-catcher backdrops out of keyboard and accessibility APIs', () => {
    expect(source.match(/<div aria-hidden="true" className="fixed inset-0 z-\[(?:90|10000)\]"/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source).not.toContain('<div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === \'Escape\') e.currentTarget.click(); }} className="fixed inset-0');
  });

  it('hands compact Join focus to the connected expanded trigger for restoration', () => {
    expect(source).toContain('const _joinTriggerRef = React.useRef(null)');
    expect(source).toContain('const _joinOpenAfterExpandRef = React.useRef(false)');
    expect(source.match(/ref=\{_joinTriggerRef\}/g)?.length).toBe(2);
    expect(source).toContain('_joinOpenAfterExpandRef.current = true');
    expect(source).toContain('if (!_joinOpenAfterExpandRef.current || headerCollapsed) return');
    expect(source).toContain('_joinTriggerRef.current.focus()');
    expect(source).not.toContain('window.requestAnimationFrame(openExpandedJoin)');
    expect(source).toContain('id="header-join-code"\n                                                                    data-autofocus');
    expect(source).not.toContain('id="header-join-code"\n                                                                    autoFocus');
  });

  it('uses the visible Join labels as the input accessible names', () => {
    expect(source).toContain('htmlFor="header-join-host-id"');
    expect(source).toContain('id="header-join-host-id"');
    expect(source).toContain('htmlFor="header-join-code"');
    expect(source).toContain('id="header-join-code"');
    expect(source).not.toContain("input aria-label={t('common.session_default_placeholder')}");
    expect(source).not.toContain("input aria-label={t('common.enter_join_code_input')}");
  });

  it('escapes the header stacking context so the settings panels stay on top', () => {
    // Both panels are position:fixed at z-[10001], but they live inside
    // #tour-header-settings (relative z-[60]) inside <header> (relative z-50).
    // Nested stacking contexts meant that z-index was only ever compared with
    // siblings INSIDE the z-60 box — so #tour-header-utils at z-[100] painted
    // over them. On a phone that pill is w-full and wraps to its own row right
    // on top of the panel's `top-28`, eating every tap aimed at the controls.
    expect(source).toContain('{showTextSettings && _headerPortal(');
    expect(source).toContain('{showVoiceSettings && _headerPortal(');
    expect(source).toContain('window.ReactDOM.createPortal(node, document.body)');
    // The trap is real and still present, so the portal is load-bearing: if
    // either of these z-index values changes, revisit the escape above.
    expect(source).toContain('id="tour-header-utils" className={`relative z-[100]');
    expect(source).toContain('id="tour-header-settings" className={`relative z-[60]');
    // The click-outside backdrop has to travel with its panel, or it lands
    // behind the pill and the panel can no longer be dismissed by tapping away.
    const voice = source.slice(source.indexOf('{showVoiceSettings && _headerPortal('));
    expect(voice.slice(0, 400)).toContain('className="fixed inset-0 z-[10000]"');
  });

  it('keeps generated Header modules synchronized', () => {
    expect(readFileSync('desktop/web-app/public/view_header_module.js', 'utf8'))
      .toBe(readFileSync('view_header_module.js', 'utf8'));
  });
});
