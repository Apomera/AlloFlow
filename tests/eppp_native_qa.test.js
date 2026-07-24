import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let eppp, report;

beforeAll(() => {
  window.React = window.React || {
    useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('test_prep_hub_module.js');
  eppp = window.AlloModules.TestPrepHub.listPacks().find((pack) => pack.id === 'eppp-part-one');
  report = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_native_qa.json'), 'utf8'));
});

describe('EPPP native content QA gate', () => {
  it('requires every current native item to pass every named QA check', () => {
    expect(report.summary).toMatchObject({ totalItems: 1500, passedItems: 1500, reviewRequiredItems: 0, status: 'pass' });
    expect(report.items).toHaveLength(1500);
    expect(report.items.every((item) => item.qaStatus === 'pass')).toBe(true);
    expect(report.items.every((item) => item.checks.every((check) => check.status === 'pass'))).toBe(true);
    expect(report.standard.checks).toEqual([
      'authoritative-source',
      'one-best-answer',
      'distractor-quality',
      'natural-language-quality',
      'text-encoding',
      'clue-resistance',
      'rationale-quality',
      'template-completeness',
      'option-specific-feedback',
      'domain-and-accessibility-review',
      'provenance',
      'qa-declaration',
    ]);
  });

  it('preserves an honest boundary between content QA and expert validation', () => {
    expect(report.standard.meaning).toContain('cited answer support');
    expect(report.standard.limitation).toContain('not psychometric calibration');
    expect(report.standard.limitation).toContain('independent licensed-psychologist validation');
    expect(eppp.contentReview).toContain('1,500 source-reviewed practice items');
    expect(eppp.contentReview).toContain('independent expert review pending');
    expect(eppp.items.every((item) => item.qaStatus === 'qa-passed')).toBe(true);
    expect(eppp.items.every((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.qaReviewedAt))).toBe(true);
  });

  it('enforces the complete v2 template across every added question', () => {
    const added = eppp.items.filter((item) => item.expansionBatch === 'native-501-1000');
    expect(added).toHaveLength(500);
    expect(added.every((item) => item.templateVersion === 2 && item.choiceRationales.length === 4)).toBe(true);
    expect(added.every((item) => item.sourceDetails.length === item.references.length && item.sourceDetails.every((source) => source.title && source.credibility))).toBe(true);
    expect(added.every((item) => item.domainAlignmentStatus === 'editorial-pass' && item.biasAccessibilityStatus === 'editorial-pass')).toBe(true);
  });

  it('requires complete answer-choice feedback across all 1,500 questions', () => {
    expect(report.schemaVersion).toBe(5);
    expect(report.summary.completeOptionFeedbackItems).toBe(1500);
    expect(eppp.items.every((item) => item.choiceRationales.length === 4 && item.choiceRationales.every((entry) => entry.trim().length >= 20))).toBe(true);
    const canonical = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_native_items.json'), 'utf8'));
    const completedBacklog = canonical.filter((item) => item.optionFeedbackReviewWave === 'eppp-option-feedback-wave-01');
    expect(completedBacklog).toHaveLength(476);
    expect(completedBacklog.every((item) => item.choiceRationales[item.answerIndex] === item.rationale)).toBe(true);
    const bonferroni = completedBacklog.find((item) => item.id === 'eppp-b009-research-2');
    expect(bonferroni.choiceRationales[bonferroni.answerIndex]).toContain('.05 / 10 = .005');
    expect(bonferroni.choiceRationales[0]).toMatch(/multiplying \.05 by ten.*inflate/i);
    expect(bonferroni.choiceRationales[1]).toMatch(/no Bonferroni adjustment/i);
    expect(bonferroni.choiceRationales[3]).toMatch(/divides.*number of comparisons/i);
  });

  it('keeps the QA artifact reproducible and deployment-identical', () => {
    const source = fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_native_qa.json'), 'utf8');
    const deployed = fs.readFileSync(resolve(process.cwd(), 'prismflow-deploy/public/test_prep/eppp_native_qa.json'), 'utf8');
    const builder = fs.readFileSync(resolve(process.cwd(), '_build_test_prep_hub_module.js'), 'utf8');

    expect(deployed).toBe(source);
    expect(fs.existsSync(resolve(process.cwd(), 'test_prep/eppp_native_qa.md'))).toBe(true);
    expect(builder).toContain('qa_eppp_native_pack.cjs');
    expect(eppp.nativeQaUrl).toBe('https://alloflow-cdn.pages.dev/test_prep/eppp_native_qa.json');
  });
});
