import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_gemini_bridge_source.jsx', 'utf8');
const moduleSource = fs.readFileSync('view_gemini_bridge_module.js', 'utf8');
const publicModule = fs.readFileSync('desktop/web-app/public/view_gemini_bridge_module.js', 'utf8');

describe('Gemini Bridge WCAG dialog behavior', () => {
  it('moves focus into both dialogs, contains Tab navigation, and restores focus', () => {
    expect(source).toContain('ref={bridgeSendDialogRef} tabIndex={-1}');
    expect(source).toContain('ref={bridgeMessageDialogRef} tabIndex={-1}');
    expect(source.match(/role="dialog" aria-modal="true"/g)).toHaveLength(2);
    expect(source).toContain("if (event.key !== 'Tab') return;");
    expect(source).toContain('dialog.addEventListener(\'keydown\', trapTab)');
    expect(source).toContain('returnTarget.isConnected');
    expect(source.match(/if \(e\.key === 'Escape'\)/g)).toHaveLength(2);
  });

  it('keeps native focus indicators available on every field', () => {
    expect(source).not.toMatch(/outline\s*:\s*['"]none['"]/);
    expect(source).toContain("node.style.display !== 'none'");
  });

  it('uses explicit non-submit types for every button', () => {
    const jsxButtons = source.match(/<button\b[\s\S]*?>/g) || [];
    expect(jsxButtons).toHaveLength(30);
    for (const button of jsxButtons) expect(button).toContain('type="button"');
    expect(source.match(/React\.createElement\('button', \{ type: 'button'/g)).toHaveLength(8);
  });

  it('announces generation and names both microphone toggles', () => {
    expect(source).toContain('<div role="status" aria-live="polite" aria-atomic="true"');
    expect(source.match(/aria-pressed=\{bridgeF2FListening===/g)).toHaveLength(2);
    expect(source).toContain("'Start listening for Person A'");
    expect(source).toContain("'Start listening for Person B'");
  });
});

describe('Gemini Bridge reduced motion and generated copies', () => {
  it('reacts to operating-system reduced-motion changes and stops persistent pulses', () => {
    expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')");
    expect(source).toContain("media.addEventListener('change', updatePreference)");
    expect(source.match(/bridgeReducedMotion \? 'none' :/g)).toHaveLength(3);
    expect(source.match(/!bridgeReducedMotion && bridgeF2FListening/g)).toHaveLength(2);
  });

  it('keeps the generated root and public modules synchronized', () => {
    expect(moduleSource).toContain('_useBridgeDialogFocus');
    expect(moduleSource).toContain('bridgeReducedMotion');
    expect(publicModule).toBe(moduleSource);
  });
});
