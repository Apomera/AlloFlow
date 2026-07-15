import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('anchor_charts_source.jsx', 'utf8');

describe('Anchor Charts keyboard reorder and focus accessibility', () => {
  it('provides named button alternatives for every drag reorder operation', () => {
    expect(source).toContain('data-keyboard-alternative="Use the adjacent Move section up and Move section down buttons"');
    expect(source).toContain('role="group" aria-label={`Reorder or remove section ${idx + 1}`}');
    expect(source).toContain('aria-label={`Move section ${idx + 1} up`}');
    expect(source).toContain('aria-label={`Move section ${idx + 1} down`}');
  });

  it('announces the resulting position after button or drag reordering', () => {
    expect(source).toContain('const newIndex = next.indexOf(movedSection)');
    expect(source).toContain('moved to position ${newIndex + 1} of ${next.length}.');
    expect(source).toContain("window.alloAnnounce(");
    expect(source).toContain("'polite'");
  });

  it('keeps visible focus rings on every outline-suppressed editor field', () => {
    expect(source.match(/outline-none/g)).toHaveLength(7);
    expect(source.match(/focus:ring-2/g)).toHaveLength(7);
    expect(source.match(/focus:ring-offset-1/g)).toHaveLength(7);
  });

  it('does not depend on animation for icon generation status', () => {
    expect(source).toContain('animate-pulse motion-reduce:animate-none" role="status"');
  });

  it('uses explicit button types throughout chart and dialog controls', () => {
    expect(source.match(/<button\b(?![^>]*\btype=)[^>]*>/gs) || []).toEqual([]);
  });
});
