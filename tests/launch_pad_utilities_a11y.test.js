import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_launch_pad_source.jsx', 'utf8');

describe('Launch-pad language and setup utility accessibility', () => {
  it('uses valid list and button semantics for language selection', () => {
    expect(source).toContain('aria-controls="launch-pad-language-list"');
    expect(source).toContain('<ul id="launch-pad-language-list" ref={langListRef} aria-label=');
    expect(source).toContain('aria-pressed={selected}');
    expect(source).not.toContain('role="listbox"');
    expect(source).not.toContain('role="option"');
  });

  it('moves focus into the language list and returns it on dismissal', () => {
    expect(source).toContain('ref={langTriggerRef}');
    expect(source).toContain("list.querySelector('button[aria-pressed=\"true\"]')");
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain('if (langTriggerRef.current) langTriggerRef.current.focus();');
    expect(source).toContain('document.removeEventListener');
  });

  it('keeps asynchronous setup controls operable and announces results', () => {
    expect(source).toContain("if (micPermissionStatus !== 'requesting') requestMicPermission();");
    expect(source).toContain("aria-disabled={micPermissionStatus === 'requesting'}");
    expect(source).toContain("aria-busy={micPermissionStatus === 'requesting'}");
    expect(source).toContain("'Requesting microphone access'");
    expect(source.match(/role="status" aria-live="polite" aria-atomic="true"/g)).toHaveLength(2);
    expect(source).toContain("linear-gradient(135deg, #4f46e5, #3730a3)");
  });

  it('provides explicit button behavior, targets, focus, and reduced motion', () => {
    expect(source).toContain('.lp-lang-trigger, .lp-lang-item, .lp-mic-actions button, .lp-ai-settings { min-height: 44px; }');
    expect(source).toContain('.lp-lang-trigger:focus-visible, .lp-lang-item:focus-visible, .lp-mic-actions button:focus-visible, .lp-ai-settings:focus-visible');
    expect(source).toContain('.lp-lang-item, .lp-lang-trigger, .lp-mic-actions button, .lp-ai-settings { animation: none !important;');
    expect(source).toContain('className="lp-ai-settings"');
    expect(source).toMatch(/<button\s+type="button"\s+onClick=\{\(e\) => \{ e\.stopPropagation\(\); setShowAIBackendModal\(true\); \}\}/);
  });

  it('keeps generated launch-pad modules synchronized', () => {
    const rootModule = fs.readFileSync('view_launch_pad_module.js', 'utf8');
    expect(fs.readFileSync('desktop/web-app/public/view_launch_pad_module.js', 'utf8')).toBe(rootModule);
    expect(rootModule).toContain('launch-pad-language-list');
    expect(rootModule).toContain('aria-pressed');
    expect(rootModule).toContain('Requesting microphone access');
    expect(rootModule).not.toContain('role: "listbox"');
    expect(rootModule).not.toContain('role: "option"');
  });
});
