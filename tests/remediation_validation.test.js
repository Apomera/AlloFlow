import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
const { manifest, validateManifest, summarizeUnit, summarizeBrowser } = require('../dev-tools/remediation_validation.cjs');

describe('maintained remediation validation', () => {
  it('selects existing suites and runs the same command from a blocking CI job', () => {
    expect(() => validateManifest()).not.toThrow();
    expect(manifest.unit).toContain('tests/doc_pipeline_build_parity.test.js');
    expect(manifest.unit).toContain('tests/remediation_form_context.test.js');
    expect(manifest.browser).toContain('tests/e2e/remediation_form_context.spec.ts');
    // Detect new relevant browser suites that were not added to the shared list.
    const browserFiles = fs.readdirSync('tests/e2e').filter(file => /^(document_export_|document_dependency_|rendered_|remediation_form_context)/.test(file) && file.endsWith('.spec.ts')).map(file => 'tests/e2e/' + file);
    expect(manifest.browser.slice().sort()).toEqual(browserFiles.sort());
    expect(JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts['verify:remediation']).toBe('node dev-tools/remediation_validation.cjs');
    const workflow = fs.readFileSync('.github/workflows/verify.yml', 'utf8');
    const job = workflow.match(/^  remediation-preservation:\r?\n([\s\S]*?)(?=^  [a-z][\w-]*:|$(?![\s\S]))/m)?.[1];
    expect(job).toBeTruthy();
    expect(job).toContain('run: npm run verify:remediation');
    expect(job).toContain('run: npx playwright install chromium');
    expect(job).not.toMatch(/continue-on-error:\s*true/);
    expect(job).toContain('if: always()');
  });
  const unit = () => ({ success: true, testResults: [{ name: path.resolve('tests/example.test.js'), status: 'passed', assertionResults: [{ fullName: 'case', status: 'passed' }] }] });
  const browser = () => ({ suites: [{ specs: [{ file: 'example.spec.ts', title: 'case', tests: [{ expectedStatus: 'passed', status: 'expected', results: [{ status: 'passed' }] }] }] }], stats: { expected: 1, skipped: 0, unexpected: 0, flaky: 0 } });
  it('requires every selected unit suite to produce passing assertions', () => {
    expect(summarizeUnit(unit(), ['tests/example.test.js'])).toEqual({ files: 1, passed: 1 });
    expect(() => summarizeUnit(unit(), ['tests/missing.test.js'])).toThrow(/not run/);
    const skipped = unit(); skipped.testResults[0].assertionResults[0].status = 'pending';
    expect(() => summarizeUnit(skipped, ['tests/example.test.js'])).toThrow(/incomplete/);
    const empty = unit(); empty.testResults[0].assertionResults = [];
    expect(() => summarizeUnit(empty, ['tests/example.test.js'])).toThrow(/incomplete/);
  });
  it('rejects skipped, expected-failure, retried, missing, or globally failed browser results', () => {
    expect(summarizeBrowser(browser(), ['tests/e2e/example.spec.ts'])).toEqual({ files: 1, passed: 1 });
    for (const change of [
      r => { r.suites[0].specs[0].tests[0].results[0].status = 'skipped'; },
      r => { r.suites[0].specs[0].tests[0].expectedStatus = 'failed'; },
      r => { r.suites[0].specs[0].tests[0].results.push({ status: 'passed' }); },
      r => { r.suites = []; },
      r => { r.errors = [{ message: 'global teardown failed' }]; },
    ]) {
      const report = browser(); change(report);
      expect(() => summarizeBrowser(report, ['tests/e2e/example.spec.ts'])).toThrow();
    }
  });
});
