import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('arcade_mode_modelun.js', 'utf8');

describe('Model UN authored form labels', () => {
  it('keeps the speech composer directly named', () => {
    expect(source).toContain("className: 'mun-form-control',\n        'aria-label': 'Compose your opening speech'");
  });

  it.each([
    ['mun_clause_text', 'Operative clause text'],
    ['mun_amendment_text', 'Text to remove'],
    ['mun_amendment_rationale', 'Diplomatic rationale (optional, one sentence)'],
    ['mun_backchannel_note', 'Private note to the selected delegation'],
    ['mun_private_notes', 'Private notes'],
  ])('associates %s with visible instructions', (id, labelText) => {
    expect(source).toContain("htmlFor: '" + id + "'");
    expect(source).toContain("id: '" + id + "'");
    expect(source).toContain(labelText);
  });

  it('provides dual-color focus for the remediated fields', () => {
    expect(source).toContain('.mun-form-control:focus-visible');
    expect(source).toContain('outline: 3px solid #fff');
    expect(source).toContain('outline-color: Highlight');
    expect(source.match(/className: 'mun-form-control'/g)?.length).toBeGreaterThanOrEqual(6);
  });
});
