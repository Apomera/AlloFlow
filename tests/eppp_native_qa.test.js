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
    expect(report.summary).toMatchObject({ totalItems: 80, passedItems: 80, reviewRequiredItems: 0, status: 'pass' });
    expect(report.items).toHaveLength(80);
    expect(report.items.every((item) => item.qaStatus === 'pass')).toBe(true);
    expect(report.items.every((item) => item.checks.every((check) => check.status === 'pass'))).toBe(true);
    expect(report.standard.checks).toEqual([
      'authoritative-source',
      'one-best-answer',
      'distractor-quality',
      'clue-resistance',
      'rationale-quality',
      'provenance',
    ]);
  });

  it('preserves an honest boundary between content QA and expert validation', () => {
    expect(report.standard.meaning).toContain('cited answer support');
    expect(report.standard.limitation).toContain('not psychometric calibration');
    expect(report.standard.limitation).toContain('independent licensed-psychologist validation');
    expect(eppp.contentReview).toContain('80/80 native items passed content QA');
    expect(eppp.contentReview).toContain('expert validation pending');
    expect(eppp.items.every((item) => item.qaStatus === 'qa-passed')).toBe(true);
    expect(eppp.items.every((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.qaReviewedAt))).toBe(true);
  });

  it('keeps the QA artifact reproducible and deployment-identical', () => {
    const source = fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_native_qa.json'), 'utf8');
    const deployed = fs.readFileSync(resolve(process.cwd(), 'prismflow-deploy/public/test_prep/eppp_native_qa.json'), 'utf8');
    const builder = fs.readFileSync(resolve(process.cwd(), '_build_test_prep_hub_module.js'), 'utf8');

    expect(deployed).toBe(source);
    expect(fs.existsSync(resolve(process.cwd(), 'test_prep/eppp_native_qa.md'))).toBe(true);
    expect(builder).toContain('qa_eppp_native_pack.cjs');
    expect(eppp.nativeQaUrl).toBe('./test_prep/eppp_native_qa.json');
  });
});
