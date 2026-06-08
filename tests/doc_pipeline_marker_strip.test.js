// ALLO_SECTION marker strip — pins the regex used in 3 sites to remove DOCX/PPTX
// augmentation markers from (a) diff-cleanup normalization, (b) integrity ratio
// denominator, (c) sourceText persistence. Markers are produced by the broader
// DOCX/PPTX extractors shipped 2026-06-07. If this regex drifts, all three
// downstream sites silently degrade — false-positive "low fidelity" banners on
// every DOCX/PPTX run, markers leaking into the user-visible Diff panel.
//
// MIRROR DISCIPLINE: the regex below is copied verbatim from
// doc_pipeline_source.jsx (search _ALLO_MARKER_RE). If you change the
// extractor's marker format, update both this mirror and the source regex.

import { describe, it, expect } from 'vitest';

// Mirror: doc_pipeline_source.jsx _ALLO_MARKER_RE
const _ALLO_MARKER_RE = /<<<ALLO_SECTION:[^>]+>>>\n?/g;

describe('_ALLO_MARKER_RE', () => {
  it('strips opening markers with kind only', () => {
    const s = 'before\n<<<ALLO_SECTION:FOOTNOTES>>>\nfootnote text';
    expect(s.replace(_ALLO_MARKER_RE, '')).toBe('before\nfootnote text');
  });

  it('strips opening markers with kind:id', () => {
    const s = 'before\n<<<ALLO_SECTION:HEADER:1>>>\nheader text';
    expect(s.replace(_ALLO_MARKER_RE, '')).toBe('before\nheader text');
  });

  it('strips closing markers', () => {
    const s = 'header text\n<<<ALLO_SECTION:END>>>\nafter';
    expect(s.replace(_ALLO_MARKER_RE, '')).toBe('header text\nafter');
  });

  it('strips multiple markers in one string', () => {
    const s = '<<<ALLO_SECTION:SLIDE:3>>>\nslide content\n[Teacher speaker notes for slide 3]\nnotes here\n<<<ALLO_SECTION:END>>>';
    const stripped = s.replace(_ALLO_MARKER_RE, '');
    expect(stripped).toContain('slide content');
    expect(stripped).toContain('notes here');
    expect(stripped).not.toContain('<<<ALLO_SECTION');
  });

  it('does NOT strip body text that mentions ALLO_SECTION literally without triple-angle', () => {
    const s = 'See section ALLO_SECTION for details';
    expect(s.replace(_ALLO_MARKER_RE, '')).toBe('See section ALLO_SECTION for details');
  });

  it('leaves a corrupted marker (extra > inside the kind) entirely intact', () => {
    // [^>]+ stops at the FIRST > so a corrupted marker like <<<ALLO_SECTION:K>extra>>>
    // matches `<<<ALLO_SECTION:K` followed by `>` (the `[^>]+` ate `K`), then needs
    // `>>>` to follow but sees `extra>>>` instead — regex fails, string unchanged.
    // This is desired conservative behavior: don't half-strip a malformed marker.
    const s = '<<<ALLO_SECTION:K>extra>>>after';
    const out = s.replace(_ALLO_MARKER_RE, '');
    expect(out).toBe('<<<ALLO_SECTION:K>extra>>>after');
  });

  it('handles globally — strips ALL marker pairs in a real PPTX-shaped sample', () => {
    const sample = [
      '<<<ALLO_SECTION:LAYOUT:1>>>',
      'recurring footer',
      '<<<ALLO_SECTION:END>>>',
      '',
      '<<<ALLO_SECTION:SLIDE:1>>>',
      '## Title slide',
      '[Teacher speaker notes for slide 1 — instructional context, not student-facing copy]',
      'open with a hook',
      '<<<ALLO_SECTION:END>>>',
    ].join('\n');
    const stripped = sample.replace(_ALLO_MARKER_RE, '');
    expect(stripped).not.toContain('<<<ALLO_SECTION');
    expect(stripped).toContain('recurring footer');
    expect(stripped).toContain('Title slide');
    expect(stripped).toContain('open with a hook');
  });
});
