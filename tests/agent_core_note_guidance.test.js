import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const service = require('../agent_core_resource_pack_module.js');

function compose(guidance, profile = 'text') {
  const cue = { id: 'cue-1', text: 'Check a reason' };
  if (guidance !== undefined) cue.guidance = guidance;
  return service.compose({
    requestId: 'guided-notes', title: 'Evidence notebook', sourceTopic: 'Reasoning',
    learningGoal: 'Explain a recommendation with evidence.', profile,
    privacy: { confirmNoStudentPii: true, confirmSourcePermission: true },
    history: [{ id: 'notes', type: 'note-taking', title: 'Evidence notebook', meta: 'Original draft',
      data: { templateType: 'cornell-notes', cues: [cue], notes: [{ id: 'note-1', text: '' }] } }],
  });
}

describe('Authored Cornell guidance through the resource-pack boundary', () => {
  for (const profile of ['text', 'illustrated']) {
    it(`round-trips guidance separately from blank responses in ${profile} packs`, () => {
      const guidance = 'Point to a case fact.\nExplain how it supports your recommendation.';
      const result = compose(guidance, profile);
      expect(result.ok).toBe(true);
      const pack = result.value;
      pack.allopack.reviewNote = 'Retain this existing metadata';
      const exported = service.exportPack(pack, { profile });
      expect(exported.ok).toBe(true);
      const restored = JSON.parse(exported.json);
      expect(restored).toEqual(pack);
      expect(restored.history[0].data.cues[0].guidance).toBe(guidance);
      expect(restored.history[0].data.notes).toEqual([{ id: 'note-1', text: '' }]);
    });
  }

  it.each([undefined, '', ' ', 'x'.repeat(1000)])('accepts absent, blank or bounded guidance: case %#', guidance => {
    expect(compose(guidance).ok).toBe(true);
  });

  it.each([null, 42, false, ['instruction'], { text: 'instruction' }, 'x'.repeat(1001)])('rejects malformed or overlong guidance: case %#', guidance => {
    const result = compose(guidance);
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid-note-guidance', path: 'pack.history[0].data.cues[0].guidance' }),
    ]));
  });

  it('applies existing privacy checks to guidance too', () => {
    const result = compose('Send the record to student@example.org.');
    expect(result.ok).toBe(false);
    expect(result.errors.map(error => error.code)).toContain('privacy-risk-detected');
  });
});
