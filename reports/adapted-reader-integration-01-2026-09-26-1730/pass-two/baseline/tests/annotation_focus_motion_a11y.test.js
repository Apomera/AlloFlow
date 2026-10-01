import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('annotation_suite_source.jsx', 'utf8');

describe('Annotation Suite focus and motion accessibility', () => {
  it('keeps a visible keyboard focus indicator on editable notes', () => {
    expect(source).toContain('outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-600');
  });

  it('exposes recording state and elapsed progress without relying on animation', () => {
    expect(source).toContain('role="region"');
    expect(source).toContain('aria-label="Voice note recording in progress"');
    expect(source).toContain('animate-pulse motion-reduce:animate-none" aria-hidden="true"');
    expect(source).toContain('role="progressbar" aria-label="Voice note recording time"');
    expect(source).toContain('aria-valuemax={VOICE_MAX_SECONDS}');
    expect(source).toContain('aria-valuenow={Math.min(VOICE_MAX_SECONDS, Math.floor(elapsedSec || 0))}');
  });

  it('provides reduced-motion fallbacks for annotation motion effects', () => {
    expect(source).toContain('animate-[ping_0.4s_ease-out_reverse_forwards] motion-reduce:animate-none');
    expect(source.match(/animate-in motion-reduce:animate-none/g)).toHaveLength(4);
    expect(source.match(/transition-transform motion-reduce:transition-none motion-reduce:transform-none/g)).toHaveLength(10);
    expect(source.match(/transition-all motion-reduce:transition-none/g)).toHaveLength(6);
  });

  it('uses explicit button types throughout annotation controls', () => {
    expect(source.match(/<button\b(?![^>]*\btype=)[^>]*>/gs) || []).toEqual([]);
  });
});
