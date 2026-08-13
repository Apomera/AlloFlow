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
    expect(source).toContain('var enableVoiceAccess = props.enableVoiceAccess;');
    expect(source).toContain('var voiceAccessActive = props.voiceAccessActive === true;');
    expect(source).toContain("if (typeof enableVoiceAccess === 'function')");
    expect(source).toContain('enableVoiceAccess();');
    expect(source).toContain("if (typeof requestMicPermission === 'function') requestMicPermission();");
    expect(source).toContain('disabled={voiceAccessActive || voiceAccessStarting}');
    expect(source).toContain('aria-busy={voiceAccessStarting}');
    expect(source).toContain("'Enable Voice Access'");
    expect(source).toContain("'Voice Access Active'");
    expect(source).toContain("'Starting Voice Access...'");
    expect(source).toContain("'Retry Voice Access'");
    expect(source).toContain('Microphone permission is ready, but Voice Access is not currently listening.');
    expect(source).toContain('browser or operating system may require microphone activation once');
    expect(source).toContain('Voice Access is optional; touch, pointer, and keyboard remain available.');
    expect(source.match(/role="status" aria-live="polite" aria-atomic="true"/g)).toHaveLength(2);
    expect(source).toContain("linear-gradient(135deg, #4f46e5, #3730a3)");
  });

  it('provides explicit button behavior, targets, focus, and reduced motion', () => {
    expect(source).toContain('.lp-lang-trigger, .lp-lang-item, .lp-mic-actions button, .lp-download-button, .lp-ai-settings { min-height: 44px; }');
    expect(source).toContain('.lp-lang-trigger:focus-visible, .lp-lang-item:focus-visible, .lp-mic-actions button:focus-visible, .lp-download-button:focus-visible, .lp-ai-settings:focus-visible');
    expect(source).toContain('.lp-lang-item, .lp-lang-trigger, .lp-mic-actions button, .lp-download-button, .lp-download-button:hover, .lp-ai-settings { animation: none !important;');
    expect(source).toContain('className="lp-ai-settings"');
    expect(source).toMatch(/<button\s+type="button"\s+onClick=\{\(e\) => \{ e\.stopPropagation\(\); setShowAIBackendModal\(true\); \}\}/);
  });

  it('offers accessible Whisper and Kokoro downloads below the four primary cards', () => {
    const gridEnd = source.indexOf('<section className="lp-voice-setup"');
    const fourthCard = source.indexOf('id="launch-pad-educator-title"');
    expect(gridEnd).toBeGreaterThan(fourthCard);
    expect(source).toContain('id="launch-pad-offline-voice-title"');
    expect(source).toContain("voice.preloadWhisper('tiny')");
    expect(source).toContain('window.__loadKokoroTTS');
    expect(source).toContain('Download Whisper');
    expect(source).toContain('Download Kokoro');
    expect(source.match(/aria-busy=\{voiceSetup\.(?:whisper|kokoro)\.phase === 'loading'\}/g)).toHaveLength(2);
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(source).toContain('.lp-download-button:focus-visible');
  });

  it('keeps generated launch-pad modules synchronized', () => {
    const rootModule = fs.readFileSync('view_launch_pad_module.js', 'utf8');
    expect(fs.readFileSync('desktop/web-app/public/view_launch_pad_module.js', 'utf8')).toBe(rootModule);
    expect(rootModule).toContain('launch-pad-language-list');
    expect(rootModule).toContain('aria-pressed');
    expect(rootModule).toContain('Starting Voice Access...');
    expect(rootModule).not.toContain('role: "listbox"');
    expect(rootModule).not.toContain('role: "option"');
  });
});
