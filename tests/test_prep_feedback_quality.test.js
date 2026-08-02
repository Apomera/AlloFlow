import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import checks from '../dev-tools/non_eppp_warning_checks.cjs';
import quality from '../dev-tools/test_prep_feedback_quality_core.cjs';

const { warningCodes } = checks;
const { normalizeItem } = quality;
const sourceDir = path.join(import.meta.dirname, '..', 'test_prep');
const targetedWarnings = new Set([
  'short-prompt',
  'incorrect-option-feedback-detail',
  'incorrect-option-choice-restatement',
  'incorrect-option-full-key-echo',
]);

describe('Test Prep Hub feedback quality', () => {
  it('keeps targeted short-stem and feedback warnings out of released non-EPPP packs', () => {
    const files = fs.readdirSync(sourceDir)
      .filter((name) => name.endsWith('_pack.json') && !name.startsWith('eppp_')).sort();
    expect(files).toHaveLength(22);
    const findings = [];
    for (const file of files) {
      const pack = JSON.parse(fs.readFileSync(path.join(sourceDir, file), 'utf8'));
      for (const item of pack.items || []) {
        for (const code of warningCodes(item)) {
          if (targetedWarnings.has(code)) findings.push(`${file}:${item.id}:${code}`);
        }
      }
    }
    expect(findings).toEqual([]);
  });

  it('preserves keyed content while making a short prompt and echoed feedback explanatory', () => {
    const item = {
      id: 'feedback-quality-fixture',
      prompt: 'What is validity?',
      choices: [
        'The degree to which evidence supports the intended interpretation',
        'A random test result',
        'A score that is always high',
        'A test with many questions',
      ],
      answerIndex: 0,
      rationale: 'Validity concerns the evidence and reasoning that support the intended interpretation and use of scores.',
      choiceRationales: [
        'Correct. The evidence supports the intended interpretation.',
        'Not the best answer. "A random test result" is not validity.',
        'Not the best answer. "A score that is always high" is not validity.',
        'Not the best answer. "A test with many questions" is not validity.',
      ],
    };
    const normalized = normalizeItem(item);
    expect(normalized.answerIndex).toBe(item.answerIndex);
    expect(normalized.choices).toEqual(item.choices);
    expect(normalized.rationale).toBe(item.rationale);
    expect(normalized.prompt.length).toBeGreaterThanOrEqual(35);
    expect(normalized.feedbackQualityNormalizationVersion).toBe('feedback-quality-normalization-v1');
    expect(warningCodes(normalized).filter((code) => targetedWarnings.has(code))).toEqual([]);
  });
});
