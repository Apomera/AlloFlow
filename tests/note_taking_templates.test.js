// Smoke test for the Note-Taking Templates Notebook helpers.
//
// Focus: the kind-discrimination + preview/title derivation logic that
// handles BOTH note-taking entries (Cornell / Lab / Reading) AND anchor-chart
// entries in the unified Notebook overlay. These helpers were extended
// recently to cover anchor charts, and the cross-type handling is the most
// likely regression site.

import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let H;

beforeAll(() => {
  window.React = window.React || {
    useState: () => [undefined, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useContext: () => null,
    memo: (c) => c,
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('note_taking_templates_module.js');
  H = window.AlloModules.NoteTakingTemplates && window.AlloModules.NoteTakingTemplates._testing;
  if (!H) throw new Error('NoteTakingTemplates._testing namespace not exposed');
});

describe('_entryKind — discriminates type + templateType', () => {
  it('returns null for null / wrong-type entries', () => {
    expect(H._entryKind(null)).toBeNull();
    expect(H._entryKind({ type: 'glossary' })).toBeNull();
    expect(H._entryKind({})).toBeNull();
  });

  it('returns the templateType for note-taking entries', () => {
    expect(H._entryKind({ type: 'note-taking', data: { templateType: 'cornell-notes' } })).toBe('cornell-notes');
    expect(H._entryKind({ type: 'note-taking', data: { templateType: 'lab-report' } })).toBe('lab-report');
    expect(H._entryKind({ type: 'note-taking', data: { templateType: 'reading-response' } })).toBe('reading-response');
  });

  it('defaults note-taking entries with missing templateType to cornell-notes', () => {
    expect(H._entryKind({ type: 'note-taking', data: {} })).toBe('cornell-notes');
    expect(H._entryKind({ type: 'note-taking' })).toBe('cornell-notes');
  });

  it('returns "anchor-chart" for anchor-chart entries (regardless of data)', () => {
    expect(H._entryKind({ type: 'anchor-chart', data: { sections: [] } })).toBe('anchor-chart');
    expect(H._entryKind({ type: 'anchor-chart' })).toBe('anchor-chart');
  });
});

describe('NOTEBOOK_TEMPLATE_META — kind metadata table', () => {
  it('has entries for all four kinds', () => {
    expect(H.NOTEBOOK_TEMPLATE_META).toHaveProperty('cornell-notes');
    expect(H.NOTEBOOK_TEMPLATE_META).toHaveProperty('lab-report');
    expect(H.NOTEBOOK_TEMPLATE_META).toHaveProperty('reading-response');
    expect(H.NOTEBOOK_TEMPLATE_META).toHaveProperty('anchor-chart');
  });

  it('each entry has label + accent + short + icon fields', () => {
    Object.values(H.NOTEBOOK_TEMPLATE_META).forEach((meta) => {
      expect(meta).toHaveProperty('label');
      expect(meta).toHaveProperty('accent');
      expect(meta).toHaveProperty('short');
      expect(meta).toHaveProperty('icon');
      expect(typeof meta.label).toBe('string');
    });
  });

  it('anchor-chart uses the amber accent (distinct from note-taking trio)', () => {
    expect(H.NOTEBOOK_TEMPLATE_META['anchor-chart'].accent).toBe('amber');
  });
});

describe('_entryPreview — derives a snippet per entry kind', () => {
  it('cornell-notes: returns the first non-empty notes entry', () => {
    const entry = {
      type: 'note-taking',
      data: {
        templateType: 'cornell-notes',
        notes: [{ text: '' }, { text: 'photosynthesis is...' }],
        cues: [{ text: 'key term' }],
      },
    };
    expect(H._entryPreview(entry)).toBe('photosynthesis is...');
  });

  it('cornell-notes: falls back to first non-empty cue when notes are empty', () => {
    const entry = {
      type: 'note-taking',
      data: {
        templateType: 'cornell-notes',
        notes: [{ text: '' }, { text: '' }],
        cues: [{ text: 'mitochondria' }],
      },
    };
    expect(H._entryPreview(entry)).toBe('mitochondria');
  });

  it('cornell-notes: falls back to summary if no notes/cues', () => {
    const entry = {
      type: 'note-taking',
      data: {
        templateType: 'cornell-notes',
        notes: [],
        cues: [],
        summary: 'today we covered cells',
      },
    };
    expect(H._entryPreview(entry)).toBe('today we covered cells');
  });

  it('lab-report: uses question > hypothesis > conclusion in priority order', () => {
    expect(H._entryPreview({
      type: 'note-taking',
      data: { templateType: 'lab-report', question: 'Q?', hypothesis: 'H', conclusion: 'C' },
    })).toBe('Q?');
    expect(H._entryPreview({
      type: 'note-taking',
      data: { templateType: 'lab-report', question: '', hypothesis: 'H', conclusion: 'C' },
    })).toBe('H');
    expect(H._entryPreview({
      type: 'note-taking',
      data: { templateType: 'lab-report', question: '', hypothesis: '', conclusion: 'C' },
    })).toBe('C');
  });

  it('reading-response: prefers thinkings, then favoriteLine, then connection.text', () => {
    expect(H._entryPreview({
      type: 'note-taking',
      data: { templateType: 'reading-response', thinkings: 'I noticed...' },
    })).toBe('I noticed...');
    expect(H._entryPreview({
      type: 'note-taking',
      data: { templateType: 'reading-response', favoriteLine: '"a quote"', connection: { text: 'connection' } },
    })).toBe('"a quote"');
    expect(H._entryPreview({
      type: 'note-taking',
      data: { templateType: 'reading-response', connection: { text: 'connection text' } },
    })).toBe('connection text');
  });

  it('anchor-chart: joins the first few section labels', () => {
    const entry = {
      type: 'anchor-chart',
      data: {
        sections: [
          { label: 'PLAN', bullets: [] },
          { label: 'DRAFT', bullets: [] },
          { label: 'REVISE', bullets: [] },
          { label: 'EDIT', bullets: [] },
          { label: 'PUBLISH', bullets: [] },
        ],
      },
    };
    const preview = H._entryPreview(entry);
    expect(preview).toContain('PLAN');
    expect(preview).toContain('DRAFT');
    // First-4-sections preview
    expect(preview).toContain('EDIT');
    // Should NOT include the 5th label
    expect(preview).not.toContain('PUBLISH');
  });

  it('anchor-chart: returns first bullet when no labels exist', () => {
    const entry = {
      type: 'anchor-chart',
      data: {
        sections: [{ label: '', bullets: ['first bullet text'] }],
      },
    };
    expect(H._entryPreview(entry)).toBe('first bullet text');
  });

  it('anchor-chart: returns empty string for sections-less entry', () => {
    expect(H._entryPreview({ type: 'anchor-chart', data: {} })).toBe('');
  });

  it('returns empty string for unrecognized types', () => {
    expect(H._entryPreview({ type: 'random', data: {} })).toBe('');
    expect(H._entryPreview(null)).toBe('');
  });
});

describe('_entryTitle — derives a display title', () => {
  it('uses data.title when present + non-empty', () => {
    expect(H._entryTitle({
      type: 'note-taking',
      data: { templateType: 'cornell-notes', title: 'Photosynthesis' },
    })).toBe('Photosynthesis');
  });

  it('trims whitespace-only titles back to the placeholder', () => {
    const entry = {
      type: 'note-taking',
      data: { templateType: 'cornell-notes', title: '   ' },
    };
    expect(H._entryTitle(entry)).toBe('Untitled Cornell Notes');
  });

  it('uses kind-specific "Untitled X" placeholder when no title', () => {
    expect(H._entryTitle({ type: 'note-taking', data: { templateType: 'cornell-notes' } })).toBe('Untitled Cornell Notes');
    expect(H._entryTitle({ type: 'note-taking', data: { templateType: 'lab-report' } })).toBe('Untitled Lab Report');
    expect(H._entryTitle({ type: 'note-taking', data: { templateType: 'reading-response' } })).toBe('Untitled Reading Response');
    expect(H._entryTitle({ type: 'anchor-chart', data: { sections: [] } })).toBe('Untitled Anchor Chart');
  });

  it('falls back to "Untitled entry" for unrecognized kinds', () => {
    expect(H._entryTitle({ type: 'unknown', data: {} })).toBe('Untitled entry');
    expect(H._entryTitle(null)).toBe('Untitled entry');
  });
});
