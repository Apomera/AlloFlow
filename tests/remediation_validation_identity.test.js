import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const { snapshotInputs, compareIdentity } = require('../dev-tools/remediation_validation_identity.cjs');

describe('validation identity', () => {
  it('detects same-length edits, deleted inputs, and newly added fixtures', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'remediation-identity-'));
    try {
      fs.mkdirSync(path.join(root, 'fixtures'));
      fs.writeFileSync(path.join(root, 'source.js'), 'before');
      fs.writeFileSync(path.join(root, 'fixtures/a.html'), '<p>source</p>');
      const before = { inputSha256: snapshotInputs(root, ['source.js', 'fixtures']), tools: { node: 'test' }, gitHead: 'abc' };
      expect(compareIdentity(before, { ...before, inputSha256: snapshotInputs(root, ['fixtures', 'source.js']) })).toEqual({ changedInputs: [], toolsChanged: false, gitHeadChanged: false, gitHeadVerified: true });
      fs.writeFileSync(path.join(root, 'source.js'), 'after!');
      fs.unlinkSync(path.join(root, 'fixtures/a.html'));
      fs.writeFileSync(path.join(root, 'fixtures/b.html'), '<p>new</p>');
      const after = { ...before, inputSha256: snapshotInputs(root, ['source.js', 'fixtures']) };
      expect(compareIdentity(before, after).changedInputs).toEqual(['fixtures/a.html', 'fixtures/b.html', 'source.js']);
      fs.unlinkSync(path.join(root, 'source.js'));
      expect(snapshotInputs(root, ['source.js'])['source.js']).toBeNull();
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
  it('retains tool and revision changes independently of file changes', () => {
    const before = { inputSha256: { 'source.js': 'abc' }, tools: { node: '1' }, gitHead: 'a' };
    expect(compareIdentity(before, { ...before, tools: { node: '2' }, gitHead: 'b' })).toEqual({ changedInputs: [], toolsChanged: true, gitHeadChanged: true, gitHeadVerified: true });
  });
  it('rejects input paths outside the chosen workspace', () => {
    expect(() => snapshotInputs(process.cwd(), ['../outside.txt'])).toThrow(/inside the workspace/);
  });
});

const { executeValidation, manifest } = require('../dev-tools/remediation_validation.cjs');
describe('validation run evidence', () => {
  for (const mode of ['stable', 'drift', 'runner-error', 'setup-error']) it('retains honest evidence for ' + mode, () => {
    const reportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'remediation-run-evidence-'));
    let captures = 0;
    const capture = () => {
      captures++;
      if (mode === 'setup-error' && captures === 1) throw new Error('Missing tool metadata');
      return { inputSha256: { 'source.js': mode === 'drift' && captures > 1 ? 'changed' : 'original' }, tools: { node: 'test' }, gitHead: 'test' };
    };
    const run = (cli, args, env) => {
      if (mode === 'runner-error') throw new Error('Injected runner failure');
      if (cli.includes('vitest')) {
        const report = { success: true, testResults: manifest.unit.map(file => ({ name: path.resolve(file), status: 'passed', assertionResults: [{ status: 'passed', fullName: file }] })) };
        fs.writeFileSync(args.find(arg => arg.startsWith('--outputFile=')).slice('--outputFile='.length), JSON.stringify(report));
      } else {
        fs.writeFileSync(env.PLAYWRIGHT_JSON_OUTPUT_FILE, JSON.stringify({ suites: [{ specs: manifest.browser.map(file => ({ file, title: file, tests: [{ expectedStatus: 'passed', status: 'expected', results: [{ status: 'passed' }] }] })) }] }));
      }
      return { exitCode: 0, signal: null };
    };
    try {
      fs.writeFileSync(path.join(reportDir, 'summary.json'), JSON.stringify({ status: 'passed', testsPassed: 999999 }));
      if (mode === 'stable') expect(executeValidation({ reportDir, capture, run }).status).toBe('passed');
      else expect(() => executeValidation({ reportDir, capture, run })).toThrow();
      const summary = JSON.parse(fs.readFileSync(path.join(reportDir, 'summary.json'), 'utf8'));
      expect(captures).toBe(2);
      expect(summary.runId).toBeTruthy();
      expect(summary.identity.after).toBeTruthy();
      expect(summary.status).toBe(mode === 'stable' ? 'passed' : 'failed');
      if (mode !== 'stable') expect(summary.testsPassed).toBeUndefined();
      if (mode === 'drift') expect(summary.identity.changedInputs).toEqual(['source.js']);
      if (mode === 'runner-error') expect(summary.error).toContain('Injected runner failure');
      if (mode === 'setup-error') expect(summary.error).toContain('Missing tool metadata');
    } finally {
      if (path.dirname(reportDir) !== path.resolve(os.tmpdir())) throw new Error('Unexpected scratch path');
      fs.rmSync(reportDir, { recursive: true, force: true });
    }
  });
});

it.each([[null, 'known'], ['known', null]])('unavailable revision metadata is not a revision change (%s -> %s)', (beforeHead, afterHead) => {
 const before = { inputSha256: { 'source.js': 'same' }, tools: { node: 'test' }, gitHead: beforeHead };
 expect(compareIdentity(before, {...before, gitHead: afterHead})).toEqual({ changedInputs: [], toolsChanged: false, gitHeadChanged: false, gitHeadVerified: false });
});


describe('failed validation phase diagnostics', () => {
  for (const mode of ['partial-success', 'hook-failure', 'unit-global-error', 'missing-report', 'malformed-report', 'invalid-report-shape', 'unknown-exit', 'browser-global-error', 'browser-missing-report']) it('retains collection and failure evidence: ' + mode, () => {
    const reportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'remediation-phase-evidence-'));
    const unit = () => ({ success: true, testResults: manifest.unit.map(name => ({ name: path.resolve(name), status: 'passed', message: '', assertionResults: [{ status: 'passed', fullName: name }] })) });
    let calls = 0;
    const run = (cli, args, env, logFile) => {
      calls++;
      const isUnit = cli.includes('vitest'), failBrowser = mode.startsWith('browser-');
      const failing = failBrowser ? !isUnit : true;
      const reportFile = isUnit ? args.find(arg => arg.startsWith('--outputFile=')).slice('--outputFile='.length) : env.PLAYWRIGHT_JSON_OUTPUT_FILE;
      fs.writeFileSync(logFile, failing ? 'Worker or teardown diagnostics retained' : 'phase passed');
      let report = isUnit ? unit() : { suites: [{ specs: manifest.browser.map(file => ({ file, title: file, tests: [{ expectedStatus: 'passed', status: 'expected', results: [{ status: 'passed' }] }] })) }] };
      if (mode === 'partial-success') report.testResults = report.testResults.slice(0, 1);
      if (mode === 'hook-failure') { report.testResults[0].status = 'failed'; report.testResults[0].message = 'Hook timed out while closing Chromium'; }
      if (failing && mode.endsWith('global-error')) report.errors = [{ message: 'Global teardown failed' }];
      if (!failing || !mode.endsWith('missing-report')) fs.writeFileSync(reportFile, failing && mode === 'malformed-report' ? '{broken' : failing && mode === 'invalid-report-shape' ? 'null' : JSON.stringify(report));
      if (failing && !['unit-global-error', 'unknown-exit'].includes(mode)) { const error = new Error('Injected process failure'); error.exitCode = 1; error.signal = null; throw error; }
      return { exitCode: mode === 'unknown-exit' ? null : 0, signal: null };
    };
    try {
      // A previous report must not supply evidence for a process that produces none.
      fs.writeFileSync(path.join(reportDir, 'unit.json'), JSON.stringify(unit()));
      fs.writeFileSync(path.join(reportDir, 'browser.log'), 'stale browser success');
      expect(() => executeValidation({ reportDir, run, capture: () => ({ inputSha256: { source: 'same' }, tools: {}, gitHead: 'same' }) })).toThrow();
      const summary = JSON.parse(fs.readFileSync(path.join(reportDir, 'summary.json'), 'utf8'));
      const phase = summary.phases[mode.startsWith('browser-') ? 'browser' : 'unit'];
      expect(summary.status).toBe('failed');
      expect(summary.testsPassed).toBeUndefined();
      expect(phase.status).toBe('failed');
      expect(fs.readFileSync(phase.logFile, 'utf8')).toContain('diagnostics retained');
      if (!mode.startsWith('browser-')) {
        expect(calls).toBe(1);
        expect(summary.phases.browser.status).toBe('not-started');
        expect(summary.unit).toBeUndefined();
        expect(fs.existsSync(path.join(reportDir, 'browser.log'))).toBe(false);
      } else {
        expect(calls).toBe(2);
        expect(summary.phases.unit.status).toBe('passed');
        expect(summary.unit.passed).toBe(manifest.unit.length);
      }
      if (mode === 'partial-success') {
        expect(phase.process.exitCode).toBe(1);
        expect(phase.diagnostics).toMatchObject({ reportedSuccess: true, collectedFiles: 1, assertionStatuses: { passed: 1 }, missingSuites: manifest.unit.slice(1) });
      }
      if (mode === 'hook-failure') {
        expect(phase.diagnostics.assertionStatuses.passed).toBe(manifest.unit.length);
        expect(phase.diagnostics.failures[0].message).toContain('Hook timed out');
      }
      if (mode.endsWith('global-error')) expect(phase.diagnostics.globalErrors).toEqual([{ message: 'Global teardown failed' }]);
      if (mode.endsWith('missing-report')) expect(phase.reportStatus).toBe('missing');
      if (mode === 'malformed-report') expect(phase.reportStatus).toBe('unreadable');
      if (mode === 'invalid-report-shape') expect(phase.diagnosticError).toBeTruthy();
      if (mode === 'unknown-exit') expect(phase.process.exitCode).toBeNull();
    } finally {
      if (path.dirname(reportDir) !== path.resolve(os.tmpdir())) throw new Error('Unexpected scratch path');
      fs.rmSync(reportDir, { recursive: true, force: true });
    }
  });
});
