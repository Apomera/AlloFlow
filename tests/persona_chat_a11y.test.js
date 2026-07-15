import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_persona_chat_source.jsx', 'utf8');
const moduleSource = fs.readFileSync('view_persona_chat_module.js', 'utf8');
const publicModule = fs.readFileSync('prismflow-deploy/public/view_persona_chat_module.js', 'utf8');

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
    expect(source.match(/data-persona-reflection-dialog/g)).toHaveLength(3);
    expect(source.match(/aria-labelledby="persona-reflection-title"/g)).toHaveLength(2);
    expect(source.match(/id="persona-reflection-title"/g)).toHaveLength(4);
    expect(source).toContain("dialog.querySelector('[data-definition-initial-focus]')");
    expect(source).toContain('personaDefinitionReturnFocusRef.current');
    expect(source).toContain('handleSetPersonaDefinitionDataToNull();');
  });

  it('exposes toggle states, concise live logs, and progress values', () => {
    expect(source.match(/aria-pressed=/g)).toHaveLength(8);
    expect(source.match(/role="log"/g)).toHaveLength(2);
    expect(source.match(/aria-relevant="additions text"/g)).toHaveLength(2);
    expect(source).not.toContain('role="log" aria-live="polite" aria-atomic="true"');
    expect(source.match(/role="progressbar"/g)).toHaveLength(2);
    expect(source).toContain('aria-valuenow={personaState.selectedCharacter?.accumulatedXP || 0}');
  });

  it('uses explicit non-submit types for all native buttons', () => {
    const buttons = source.match(/<button\b[\s\S]*?>/g) || [];
    expect(buttons).toHaveLength(32);
    for (const button of buttons) expect(button).toContain('type="button"');
  });
});

describe('Persona Chat reduced motion and generated copies', () => {
  it('adds a local fallback to every animation and broad transition utility', () => {
    expect(source.match(/motion-reduce:animate-none/g)).toHaveLength(37);
    expect(source.match(/motion-reduce:transition-none/g)).toHaveLength(51);
  });

  it('keeps the generated root and public modules synchronized', () => {
    expect(moduleSource).toContain('persona-chat-title');
    expect(moduleSource).toContain('motion-reduce:animate-none');
    expect(moduleSource).toContain('data-persona-reflection-dialog');
    expect(publicModule).toBe(moduleSource);
  });
});
