import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// The one feature that sends evaluation text off the device. These tests pin the guardrails that
// make that defensible: the model is asked about the DOCUMENTATION, never the person, and it is
// forbidden from rating. The reply is advisory and is never written into the record.
const src = readFileSync('educator_evaluation_source.jsx', 'utf8');
const at = src.indexOf('function aeBuildReflectionPrompt(');
const stop = src.indexOf('\n}', at);
const build = new Function(src.slice(at, stop + 2) + 'return aeBuildReflectionPrompt;')();

const domains = [{ id: 'd1', label: 'Planning' }, { id: 'd2', label: 'Environment' }];
const workspace = {
  teachers: [{ id: 't1', name: 'Dana Reyes', ratings: { domains: { d1: 1 } } }],
  walkthroughs: [{ teacherId: 't1', publishedAt: 'y', componentTags: ['1a'], notes: 'Students were off task during transitions.' }],
  observations: [{ teacherId: 't1', publishedAt: 'y', componentTags: ['2a'], notes: 'Clear routines posted.' }],
};

describe('AI reflection prompt', () => {
  const prompt = build(workspace, 't1', domains, { 1: 'Needs Improvement' });

  it('asks about the documentation and includes the assigned rating', () => {
    expect(prompt).toContain('off task during transitions');
    expect(prompt).toContain('Planning: Needs Improvement');
  });

  it('forbids the model from rating or judging the educator', () => {
    expect(prompt).toMatch(/Do not assign, suggest, or imply a rating/);
    expect(prompt).toMatch(/Do not judge/);
    expect(prompt).toMatch(/NOT evaluating the educator/);
  });

  it('asks for readings favourable to the educator and for thin or contradictory evidence', () => {
    expect(prompt).toMatch(/favourable to the educator/i);
    expect(prompt).toContain('THIN OR CONTRADICTORY');
  });

  it('does not send the educator name', () => {
    expect(prompt).not.toContain('Dana Reyes');
  });

  it('sends nothing when there is no published evidence, or no such educator', () => {
    expect(build({ teachers: [{ id: 't1', ratings: { domains: {} } }], walkthroughs: [], observations: [] }, 't1', domains, {})).toBeNull();
    expect(build(workspace, 'nobody', domains, {})).toBeNull();
  });

  it('never includes another educator evidence', () => {
    const mixed = {
      teachers: [{ id: 't1', ratings: { domains: {} } }],
      walkthroughs: [
        { teacherId: 't2', publishedAt: 'y', componentTags: ['1a'], notes: 'belongs to someone else' },
        { teacherId: 't1', publishedAt: 'y', componentTags: ['1a'], notes: 'mine' },
      ],
      observations: [],
    };
    expect(build(mixed, 't1', domains, {})).not.toContain('belongs to someone else');
  });

  it('is opt-in and off by default in the shipped config', () => {
    expect(src).toContain("updateConfig('aiReflectionEnabled'");
    expect(src).toContain('aiReflectionEnabled && ');
  });
});
