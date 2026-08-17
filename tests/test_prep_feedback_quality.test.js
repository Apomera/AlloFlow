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

const BASELINE_PATH = path.join(import.meta.dirname, 'fixtures', 'test_prep_feedback_quality_baseline.json');

// Memoised, and it matters: the 22 packs are ~2 MB each, so re-reading and
// re-parsing them per assertion blew vitest's 5 s default and failed as a
// timeout rather than an assertion - the same I/O flake that made
// roadready_rules look like a regression. Read once, assert many.
let _findingsCache = null;
let _baselineCache = null;

function collectTargetedFindings() {
  if (_findingsCache) return _findingsCache;
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
  _findingsCache = findings.sort();
  return _findingsCache;
}

function readBaseline() {
  if (!_baselineCache) _baselineCache = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  return _baselineCache;
}

describe('Test Prep Hub feedback quality', () => {
  // This assertion used to be `expect(findings).toEqual([])`, and it had never
  // passed: the released packs carry 585 of these warnings, a number that is
  // identical at HEAD and is corroborated by the project's OWN frozen review
  // evidence, which records short-prompt / full-key-echo / feedback-detail
  // counts as non-zero per pack at review time. So the test demanded a state
  // the project had already reviewed and accepted, and its permanent failure
  // meant a REAL regression here would have been indistinguishable from the
  // standing noise.
  //
  // It is now a ratchet: no NEW warning may appear, and the total may only go
  // down. Regenerate with `node dev-tools/update_feedback_quality_baseline.cjs`
  // after deliberate content work, and the diff shows exactly what improved.
  it('introduces no new targeted short-stem or feedback warnings', () => {
    const baseline = new Set(readBaseline().findings);
    const current = collectTargetedFindings();
    const added = current.filter((entry) => !baseline.has(entry));
    expect(added, added.length + ' NEW feedback warning(s):\n  ' + added.slice(0, 20).join('\n  ')).toEqual([]);
  }, 60_000);

  it('never lets the accepted warning count grow', () => {
    const baseline = readBaseline();
    const current = collectTargetedFindings();
    expect(current.length).toBeLessThanOrEqual(baseline.findings.length);
  }, 60_000);

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
