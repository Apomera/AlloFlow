import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_xp_modal_source.jsx', 'utf8');

describe('XP modal accessibility', () => {
  it('manages initial focus, containment, Escape, and focus return', () => {
    expect(source).toContain('ref={dialogRef} tabIndex={-1}');
    expect(source).toContain('(getFocusable()[0] || dialog).focus()');
    expect(source).toContain('window.__alloFocusTrapStack');
    expect(source).toContain('if (!isTopTrap()) return');
    expect(source).toContain("document.addEventListener('keydown', onKeyDown)");
    expect(source).toContain("element.closest('[hidden], [inert], [aria-hidden=\"true\"]')");
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain('previousFocus.isConnected');
  });

  it('exposes the visual XP meter as a named progressbar', () => {
    expect(source).toContain('const progressPercent = Math.max(0, Math.min(100');
    expect(source).toContain('role="progressbar"');
    expect(source).toContain("aria-label={t('common.progress')}");
    expect(source).toContain('aria-valuemin={0} aria-valuemax={100}');
    expect(source).toContain('aria-valuenow={progressPercent}');
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true"');
  });

  it('uses semantic, keyboard-reachable history with a logical heading level', () => {
    expect(source).toContain('<h3 id="xp-history-title"');
    expect(source).toContain('window.History !== browserHistoryConstructor');
    expect(source).toContain('<HistoryIcon size={12} aria-hidden="true"/>');
    expect(source).toContain('<ul className=');
    expect(source).toContain('aria-labelledby="xp-history-title"');
    expect(source).toContain('tabIndex={pointHistory.length > 0 ? 0 : undefined}');
    expect(source).toContain('<li key={entry.id}');
    expect(source).not.toContain('<h4');
  });

  it('preserves focus visibility, contrast, and reduced motion', () => {
    expect(source).not.toContain('zoom-in-95 focus:outline-none');
    expect(source).not.toContain('text-green-600');
    expect(source).toContain('text-green-700');
    expect(source).toContain('motion-reduce:animate-none');
    expect(source).toContain('motion-reduce:transition-none');
    expect(source).toContain('max-h-[calc(100vh-2rem)] overflow-y-auto');
    expect(source).toContain('type="button"');
    expect(source).toContain('min-w-11 min-h-11');
    expect(source).toContain('focus-visible:ring-2');
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('desktop/web-app/public/view_xp_modal_module.js', 'utf8')).toBe(fs.readFileSync('view_xp_modal_module.js', 'utf8'));
  });
});
