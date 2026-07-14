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

  it('names the Text, Voice, and Join popovers and handles Escape on their content', () => {
    expect(source).toContain('role="dialog" aria-label={t(\'settings.text.header\')}');
    expect(source).toContain('role="dialog" aria-label={t(\'settings.voice.label\')}');
    expect(source).toContain('role="dialog" aria-label={t(\'session.join\')}');
    expect(source).toContain("document.querySelector('[data-help-key=\"header_settings_text\"]')?.focus()");
    expect(source).toContain("document.querySelector('[data-help-key=\"header_settings_voice\"]')?.focus()");
    expect(source).toContain("document.querySelector('[data-help-key=\"header_session_join\"]')?.focus()");
  });

  it('keeps click-catcher backdrops out of keyboard and accessibility APIs', () => {
    expect(source.match(/<div aria-hidden="true" className="fixed inset-0 z-\[(?:90|10000)\]"/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source).not.toContain('<div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === \'Escape\') e.currentTarget.click(); }} className="fixed inset-0');
  });

  it('keeps generated Header modules synchronized', () => {
    expect(readFileSync('prismflow-deploy/public/view_header_module.js', 'utf8'))
      .toBe(readFileSync('view_header_module.js', 'utf8'));
  });
});
