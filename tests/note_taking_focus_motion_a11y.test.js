import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('note_taking_templates_source.jsx', 'utf8');

describe('Note-Taking Templates focus and motion accessibility', () => {
  it('provides visible focus indicators without suppressing the native outline', () => {
    expect(source).not.toMatch(/(?:focus(?:-visible)?:)?outline-none/);
    expect(source).toContain('focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 py-1');
    expect(source).toContain('focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 align-baseline');
  });

  it('keeps fallback dialog focus visible while trapping and restoring focus', () => {
    expect(source.match(/role="dialog" aria-modal="true"/g)).toHaveLength(2);
    expect(source.match(/focus:ring-4 focus:ring-inset focus:ring-indigo-500/g)).toHaveLength(2);
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return;");
    expect(source).toContain("element.getAttribute('aria-hidden') !== 'true'");
    expect(source).toContain("!element.closest('[inert]')");
    expect(source).toContain('element.getClientRects().length > 0');
    expect(source).toContain('document.activeElement === dialog');
    expect(source).toContain('previousFocus.focus()');
  });

  it('keeps contextual row actions visible and targetable from the keyboard', () => {
    expect(source.match(/sm:focus-visible:opacity-100/g)).toHaveLength(5);
    expect(source.match(/min-w-6 min-h-6 inline-flex items-center justify-center/g)).toHaveLength(5);
  });

  it('honors reduced-motion preferences for entry, loading, and control transitions', () => {
    expect(source).toContain('animate-in motion-reduce:animate-none slide-in-from-bottom-2');
    expect(source).toContain('animate-pulse motion-reduce:animate-none');
    expect(source.match(/transition-all motion-reduce:transition-none/g)).toHaveLength(2);
    expect(source).toContain('transition-colors motion-reduce:transition-none');
  });

  it('uses explicit button types throughout templates and notebook dialogs', () => {
    expect(source.match(/<button\b(?![^>]*\btype=)[^>]*>/gs) || []).toEqual([]);
  });
});
