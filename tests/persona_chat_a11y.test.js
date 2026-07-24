import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_persona_chat_source.jsx', 'utf8');
const moduleSource = fs.readFileSync('view_persona_chat_module.js', 'utf8');
const publicModule = fs.readFileSync('desktop/web-app/public/view_persona_chat_module.js', 'utf8');

const countMatches = (pattern) => (source.match(pattern) || []).length;

describe('Persona Chat WCAG dialog behavior', () => {
  it('names the modal and manages entry, trapped, Escape, and restored focus', () => {
    expect(source).toContain('ref={personaDialogRef}');
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain('aria-labelledby="persona-chat-title"');
    expect(source).toContain("dialog.querySelector('[data-persona-initial-focus]')");
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return;");
    expect(source).toContain('personaPreviousFocusRef.current');
    expect(source).toContain('previous.isConnected');
  });

  it('contains reflection focus and restores definition-popover focus', () => {
    expect(countMatches(/data-persona-reflection-dialog/g)).toBeGreaterThanOrEqual(2);
    expect(countMatches(/aria-labelledby="persona-reflection-title"/g)).toBeGreaterThanOrEqual(2);
    expect(countMatches(/id="persona-reflection-title"/g)).toBeGreaterThanOrEqual(2);
    expect(source).toContain("dialog.querySelector('[data-definition-initial-focus]')");
    expect(source).toContain('data-persona-definition-dialog');
    expect(source).toContain("dialog.querySelector('[data-persona-summary-dialog]')");
    expect(source).toContain("dialog.querySelector('[data-persona-reflection-dialog]')");
    expect(source).toContain("dialog.querySelector('[data-persona-definition-dialog]')");
    expect(source).toContain('personaDefinitionReturnFocusRef.current');
    expect(source).toContain('handleSetPersonaDefinitionDataToNull();');
  });

  it('exposes toggle states, concise live logs, and progress values', () => {
    expect(countMatches(/aria-pressed=/g)).toBeGreaterThanOrEqual(8);
    expect(countMatches(/role="log"/g)).toBeGreaterThanOrEqual(2);
    expect(countMatches(/aria-relevant="additions text"/g)).toBeGreaterThanOrEqual(2);
    expect(source).not.toContain('role="log" aria-live="polite" aria-atomic="true"');
    expect(countMatches(/role="progressbar"/g)).toBeGreaterThanOrEqual(2);
    expect(source).toContain('aria-valuenow={rapport}');
    expect(source).toContain('aria-valuenow={xp}');
    expect(source).toContain('aria-valuemin={0} aria-valuemax={100}');
    expect(source).toContain('aria-valuenow={singleXp}');
  });

  it('uses purpose-specific names and described reflection limits', () => {
    expect(countMatches(/aria-label=\{personaAutoRead \?/g)).toBe(2);
    expect(countMatches(/aria-label=\{personaAutoSend \?/g)).toBe(2);
    expect(countMatches(/aria-describedby="persona-reflection-count"/g)).toBe(2);
    expect(countMatches(/maxLength=\{4000\}/g)).toBeGreaterThanOrEqual(2);
    expect(source).toContain("aria-label={t('persona.speak_translation')}");
    expect(source).not.toContain("aria-label={t('common.volume')}");
    expect(source).not.toContain("aria-label={t('common.show')}");
    expect(source).not.toContain("aria-label={t('common.refresh')}");
  });

  it('uses explicit non-submit types for all native buttons', () => {
    const buttons = source.match(/<button\b[\s\S]*?>/g) || [];
    expect(buttons.length).toBeGreaterThanOrEqual(34);
    for (const button of buttons) expect(button).toContain('type="button"');
  });

  it('does not dismiss nested dialogs while an IME composition is active', () => {
    expect(countMatches(/e\.isComposing \|\| \(e\.nativeEvent && e\.nativeEvent\.isComposing\) \|\| e\.keyCode === 229/g)).toBeGreaterThanOrEqual(4);
  });
});

describe('Persona Chat reduced motion and generated copies', () => {
  it('adds a local fallback to every animation and broad transition utility', () => {
    const lines = source.split(/\r?\n/);
    const animatedLines = lines.filter(line => /(?<!motion-reduce:)animate-(?:in|spin|pulse|bounce|ping)\b/.test(line));
    const transitionLines = lines.filter(line => /(?<!motion-reduce:)transition-(?:all|colors|transform)\b/.test(line));
    expect(animatedLines.length).toBeGreaterThanOrEqual(30);
    expect(transitionLines.length).toBeGreaterThanOrEqual(30);
    for (const line of animatedLines) expect(line).toContain('motion-reduce:animate-none');
    for (const line of transitionLines) expect(line).toContain('motion-reduce:transition-none');
  });

  it('keeps the generated root and public modules synchronized', () => {
    expect(moduleSource).toContain('persona-chat-title');
    expect(moduleSource).toContain('motion-reduce:animate-none');
    expect(moduleSource).toContain('data-persona-reflection-dialog');
    expect(publicModule).toBe(moduleSource);
  });
});
