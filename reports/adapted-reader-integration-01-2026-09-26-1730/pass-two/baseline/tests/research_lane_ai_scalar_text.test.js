// Research lanes: every AI scalar rendered as a React child goes through aiScalarText (2026-09-15).
//
// enforceQuestionFormat only coerces arrays under keys containing "question". Six model-supplied
// SCALARS are rendered directly as children and were covered by nothing: the humanities
// analog-domain card (claim/warrant/qualifier shape), the engineering dominated-candidate id, and
// the two scientific concept-map questions. Their prompts declare `string`, but so did the
// Curriculum Audit field whose object value blanked the whole report on 2026-09-13 — React throws
// on an object child, and here that would take a student's lane down.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { internals, setupHub } from './helpers/research_hub_harness.js';
import { beforeAll } from 'vitest';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const hub = read('research_hub_source.jsx');
const humanities = read('research_lane_humanities_source.jsx');
const engineering = read('research_lane_engineering_source.jsx');
const scientific = read('research_lane_scientific_source.jsx');

beforeAll(() => setupHub());

describe('aiScalarText', () => {
  const text = (value) => internals().aiScalarText(value);

  it('passes strings through and stringifies numbers and booleans', () => {
    expect(text('A claim about rainfall.')).toBe('A claim about rainfall.');
    expect(text(42)).toBe('42');
    expect(text(false)).toBe('false');
  });

  it('flattens a single-text object to its text, trying the documented keys in order', () => {
    expect(text({ text: 'All X are Y.' })).toBe('All X are Y.');
    expect(text({ value: 'Because the soil is saturated.' })).toBe('Because the soil is saturated.');
    expect(text({ shape: 'If P then usually Q.' })).toBe('If P then usually Q.');
    expect(text({ label: 'candidate-3' })).toBe('candidate-3');
  });

  it('renders nothing rather than crashing for a shape it cannot read', () => {
    for (const value of [null, undefined, {}, { weight: 3 }, ['a'], { text: '   ' }]) {
      expect(text(value), JSON.stringify(value)).toBe('');
    }
  });
});

describe('the lanes render their AI scalars through it', () => {
  it('the hub defines it and hands it to every lane on the primitives bag', () => {
    expect(hub).toContain('function aiScalarText(value) {');
    expect(hub).toContain('aiScalarText: aiScalarText,');
  });

  it('each lane binds it with a safe fallback when the bag is missing it', () => {
    for (const [name, source] of [['humanities', humanities], ['engineering', engineering], ['scientific', scientific]]) {
      expect(source, name).toContain('var aiScalarText = primitives.aiScalarText || function (v)');
    }
  });

  it('covers all six render sites, and leaves no raw AI scalar child behind', () => {
    for (const field of ['example_claim_shape', 'example_warrant_shape', 'example_qualifier_shape']) {
      expect(humanities, field).toContain(`{aiScalarText(data.analog_domain_shape.${field})}`);
      expect(humanities, field).not.toContain(`</em> {data.analog_domain_shape.${field}}`);
    }
    expect(engineering).toContain('<code>{aiScalarText(data.dominated_candidate_id)}</code>');
    expect(engineering).not.toContain('<code>{data.dominated_candidate_id}</code>');
    for (const field of ['entities_question', 'relationships_question']) {
      expect(scientific, field).toContain(`{aiScalarText(data.${field})}`);
      expect(scientific, field).not.toMatch(new RegExp(`color: '#1e293b' \\}\\}>\\{data\\.${field}\\}`));
    }
  });
});
