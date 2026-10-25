import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
const service = createRequire(import.meta.url)('../agent_core_resource_pack_module.js');

function compose(explanation, profile = 'text') {
  const item = { id: 'card-1', content: 'A proposal receives a question about its reason.', categoryId: 'reply' };
  if (explanation !== undefined) item.explanation = explanation;
  return service.compose({
    requestId: 'sort-feedback', title: 'Read a record', sourceTopic: 'Evidence of responding',
    learningGoal: 'Explain what a supplied record establishes.', profile,
    privacy: { confirmNoStudentPii: true, confirmSourcePermission: true },
    history: [{ id: 'sort', type: 'concept-sort', title: 'Read a record', meta: 'Original draft',
      data: { categories: [{ id: 'reply', label: 'Reply recorded', color: 'bg-blue-500' }, { id: 'neither', label: 'Neither recorded', color: 'bg-slate-500' }], items: [item, { id: 'card-2', content: 'One private preparation note.', categoryId: 'neither' }, { id: 'card-3', content: 'A reply clarifies a question.', categoryId: 'reply' }, { id: 'card-4', content: 'A list of equipment.', categoryId: 'neither' }] } }],
  });
}

describe('Authored concept-sort feedback through the resource-pack boundary', () => {
  for (const profile of ['text', 'illustrated']) {
    it(`preserves optional explanations without changing card content in ${profile} exports`, () => {
      const explanation = 'The question addresses the proposal’s reason.\nNo shared plan is recorded.';
      const result = compose(explanation, profile);
      expect(result.ok).toBe(true);
      const pack = result.value;
      pack.allopack.reviewNote = 'Keep existing metadata';
      const exported = service.exportPack(pack, { profile });
      expect(exported.ok).toBe(true);
      const restored = JSON.parse(exported.json);
      expect(restored).toEqual(pack);
      expect(restored.history[0].data.items[0].explanation).toBe(explanation);
      expect(restored.history[0].data.items[0].content).toBe('A proposal receives a question about its reason.');
      expect(restored.history[0].data.items[1]).not.toHaveProperty('explanation');
    });
  }
  it.each([undefined, '', ' ', 'x'.repeat(1500)])('accepts absent, blank or bounded feedback: case %#', explanation => {
    expect(compose(explanation).ok).toBe(true);
  });
  it.each([null, 42, false, ['reason'], { text: 'reason' }, 'x'.repeat(1501)])('rejects malformed or overlong feedback: case %#', explanation => {
    const result = compose(explanation);
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid-sort-explanation', path: 'pack.history[0].data.items[0].explanation' }),
    ]));
  });
  it('applies existing privacy safeguards to explanations', () => {
    const result = compose('Contact student@example.org to check the record.');
    expect(result.ok).toBe(false);
    expect(result.errors.map(error => error.code)).toContain('privacy-risk-detected');
  });
});
