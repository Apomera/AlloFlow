import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_hints_modal_source.jsx', 'utf8');

describe('Hints modal accessibility', () => {
  it('keeps its named dialog and non-interactive backdrop', () => {
    expect(source).toContain('role="presentation"');
    expect(source).toContain('ref={dialogRef} tabIndex={-1}');
    expect(source).toContain('role="dialog" aria-modal="true" aria-labelledby="hints-modal-title"');
    expect(source).toContain('id="hints-modal-title"');
  });

  it('manages initial focus, containment, Escape, and focus return', () => {
    expect(source).toContain('(getFocusable()[0] || dialog).focus()');
    expect(source).toContain('window.__alloFocusTrapStack');
    expect(source).toContain('if (!isTopTrap()) return');
    expect(source).toContain("document.addEventListener('keydown', onKeyDown)");
    expect(source).toContain("element.closest('[hidden], [inert], [aria-hidden=\"true\"]')");
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain('previousFocus.isConnected');
  });

  it('exposes hint history as a keyboard-reachable list', () => {
    expect(source).toContain('role="region"');
    expect(source).toContain("aria-label={t?.('hints.title') || 'Hints'}");
    expect(source).toContain('tabIndex={hintHistory.length > 0 ? 0 : undefined}');
    expect(source).toContain('<ul className="space-y-4">');
    expect(source).toContain('<li key={hint.id}');
    expect(source).toContain("hint.isExtension ? 'text-purple-700' : 'text-yellow-800'");
  });

  it('announces generation, preserves visible names, and reduces motion', () => {
    expect(source).toContain('const hintStatus = isGeneratingExtension');
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(source).not.toContain("aria-label={t('common.on_ideas')}");
    expect(source).not.toContain("aria-label={t('common.save')}");
    expect(source.match(/type="button"/g)).toHaveLength(4);
    expect(source.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source).toContain('min-w-11 min-h-11');
    expect(source.match(/focus-visible:ring-2/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source).toContain('aria-busy={isGeneratingExtension}');
    expect(source).toContain('animate-spin motion-reduce:animate-none');
    expect(source).toContain('duration-200 motion-reduce:animate-none');
    expect(source).not.toContain('relative focus:outline-none');
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('desktop/web-app/public/view_hints_modal_module.js', 'utf8')).toBe(fs.readFileSync('view_hints_modal_module.js', 'utf8'));
  });
});
