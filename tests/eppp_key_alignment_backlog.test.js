import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const items = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_native_items.json'), 'utf8'));
const expected = new Map([
  ['eppp-b007-intervention-1', 'Beginning with prolonged exposure to a highly feared stimulus rather than moving up a hierarchy gradually'],
  ['eppp-b013-cognitive-1', 'Selectively enhances processing within a limited spatial region'],
  ['eppp-b015-intervention-1', 'Help clients describe concrete signs that the preferred future has occurred'],
  ['eppp-b016-intervention-1', 'Adaptive information and action tendencies that can also become maladaptive'],
  ['eppp-b016-professional-1', 'Maintain impartiality and focus on the child’s psychological best interests'],
  ['eppp-b017-assessment-1', 'People with the condition who test positive'],
  ['eppp-b017-intervention-1', 'Thoughts, emotions, behavior, physiology, and context interact and can be changed'],
  ['eppp-b017-professional-1', 'Avoid or minimize reasonably foreseeable harm where possible'],
  ['eppp-b017-social-1', 'Lifelong self-reflection, power awareness, and accountable partnership'],
  ['eppp-b025-professional-1', 'Develop self-awareness, seek relevant knowledge, adapt responsively, and consult when needed'],
]);

describe('EPPP editorial-backlog answer-key alignment', () => {
  it('keys every repaired item to the choice supported by its rationale and source record', () => {
    for (const [id, supportedChoice] of expected) {
      const item = items.find((candidate) => candidate.id === id);
      expect(item, id).toBeTruthy();
      expect(item.choices[item.answerIndex], id).toBe(supportedChoice);
      expect(item.keyAlignmentReviewWave, id).toBe('eppp-key-alignment-wave-02');
      expect(item.keyAlignmentReviewedAt, id).toBe('2026-07-16');
    }
  });

  it('preserves complete, correctly indexed feedback after the repair wave', () => {
    for (const [id] of expected) {
      const item = items.find((candidate) => candidate.id === id);
      expect(item.choiceRationales, id).toHaveLength(item.choices.length);
      expect(item.choiceRationales[item.answerIndex], id).toBe(item.rationale);
      expect(item.choiceRationales.every((entry) => entry.trim().length >= 20), id).toBe(true);
    }
  });

  it('keeps key alignment ahead of feedback completion in full-bank regeneration', () => {
    const builder = fs.readFileSync(resolve(process.cwd(), 'dev-tools/build_eppp_1500_expansion.cjs'), 'utf8');
    const keyRepair = "require('./repair_eppp_key_alignment_backlog.cjs')";
    const feedbackCompletion = "require('./complete_eppp_option_feedback.cjs')";
    expect(builder).toContain(keyRepair);
    expect(builder).toContain(feedbackCompletion);
    expect(builder.indexOf(keyRepair)).toBeLessThan(builder.indexOf(feedbackCompletion));
  });
});
