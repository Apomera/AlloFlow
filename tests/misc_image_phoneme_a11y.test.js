import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('misc_components_source.jsx', 'utf8');

describe('shared image and phoneme control accessibility', () => {
  it('removes invalid roles and duplicate accessible names', () => {
    expect(source).not.toContain('<div role="button" tabIndex={0} onKeyDown');
    expect(source).not.toContain('role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}');
    expect(source.match(/aria-label=\{t\('common.regenerate_image'\)\}/g)?.length || 0).toBe(0);
  });

  it('uses focus-visible 24 pixel image and remove actions', () => {
    expect(source).toContain('w-6 h-6 bg-white rounded-full');
    expect(source).toContain('group-focus-within/img:opacity-100 focus:opacity-100');
    expect(source).toContain('w-6 h-6 flex items-center justify-center rounded-full bg-red-100');
  });

  it('provides named non-drag phoneme reorder controls', () => {
    expect(source).toContain('handlePhonemeReorder(idx, i, i - 1)');
    expect(source).toContain('handlePhonemeReorder(idx, i, i + 1)');
    expect(source).toContain("aria-label={`Move ${typeof p === 'string' ? p : 'phoneme'} earlier`}");
    expect(source).toContain('role="group" aria-label={`${typeof p');
  });
});
