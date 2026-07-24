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

  it('keeps generated Header modules synchronized', () => {
    expect(readFileSync('desktop/web-app/public/view_header_module.js', 'utf8'))
      .toBe(readFileSync('view_header_module.js', 'utf8'));
  });
});
