import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const { manifest, executeCalibration, main } = require('../dev-tools/mcp_calibration_validation.cjs');
const { validateManifest } = require('../dev-tools/remediation_validation.cjs');

const scratch = () => fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-calibration-validation-'));
function removeScratch(dir) {
  if (path.dirname(path.resolve(dir)) !== path.resolve(os.tmpdir()) || !path.basename(dir).startsWith('mcp-calibration-validation-')) throw new Error('Unsafe scratch path');
  fs.rmSync(dir, { recursive: true, force: true });
}
function writeReport(kind, selection, args, env, change = () => {}) {
  const report = kind === 'unit'
    ? { success: true, testResults: selection.unit.map(name => ({ name: path.resolve(name), status: 'passed', assertionResults: [{ status: 'passed', fullName: name }] })) }
    : { suites: [{ specs: selection.browser.map(file => ({ file, title: file, tests: [{ expectedStatus: 'passed', status: 'expected', results: [{ status: 'passed' }] }] })) }] };
  change(report);
  const file = kind === 'unit' ? args.find(arg => arg.startsWith('--outputFile=')).slice('--outputFile='.length) : env.PLAYWRIGHT_JSON_OUTPUT_FILE;
  fs.writeFileSync(file, JSON.stringify(report));
}

describe('MCP calibration selection and execution', () => {
  it('uses existing unit and migrated native suites from the public command', () => {
    expect(JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts['verify:mcp-calibration']).toBe('node dev-tools/mcp_calibration_validation.cjs');
    expect(() => validateManifest(manifest)).not.toThrow();
    expect(manifest.unit).toContain('tests/static_crop_cleanup.test.js');
    expect(manifest.unit).toContain('tests/mcp_agent_bridge_e2e.test.js');
    expect(manifest.unit).toContain('tests/mcp_calibration_validation.test.js');
    expect(manifest.unit).not.toContain('tests/doc_pipeline_focus_wrap_browser.test.js');
    expect(manifest.browser).toEqual(['tests/e2e/document_focus_wrap.spec.ts', 'tests/e2e/document_static_crop_cleanup.spec.ts']);
  });

  it('requires valid, existing selections before starting either runner', () => {
    const reportDir = scratch(); let calls = 0;
    try {
      for (const unit of [[], [manifest.unit[0], manifest.unit[0]], ['tests/doc_pipeline_focus_wrap_browser.test.js'], ['../tests/outside.test.js']]) {
        fs.writeFileSync(path.join(reportDir, 'summary.json'), JSON.stringify({ status: 'passed', testsPassed: 9999 }));
        expect(() => executeCalibration({ reportDir, selection: { ...manifest, unit }, run: () => { calls++; } })).toThrow();
        const summary = JSON.parse(fs.readFileSync(path.join(reportDir, 'summary.json'), 'utf8'));
        expect(summary.status).toBe('failed');
        expect(summary.testsPassed).toBeUndefined();
        expect(summary.phases.unit.status).toBe('not-started');
      }
      expect(calls).toBe(0);
    } finally { removeScratch(reportDir); }
  });

  it('runs both selections with strict flags and accepts complete passing reports', () => {
    const reportDir = scratch(), calls = [];
    try {
      const summary = executeCalibration({ reportDir, run: (cli, args, env, logFile) => {
        const kind = cli.includes('vitest') ? 'unit' : 'browser'; calls.push(kind);
        expect(args).toEqual(expect.arrayContaining(manifest[kind]));
        expect(args).toContain(kind === 'unit' ? '--allowOnly=false' : '--forbid-only');
        expect(args).toContain(kind === 'unit' ? '--retry=0' : '--retries=0');
        expect(args).toContain(kind === 'unit' ? '--maxWorkers=1' : '--workers=1');
        if (kind === 'unit') expect(args).toContain('--pool=threads');
        fs.writeFileSync(logFile, 'retained runner diagnostics');
        writeReport(kind, manifest, args, env);
        return { status: 0, signal: null };
      } });
      expect(calls).toEqual(['unit', 'browser']);
      expect(summary.status).toBe('passed');
      expect(summary.testsPassed).toBe(manifest.unit.length + manifest.browser.length);
      expect(summary.phases.browser.passed).toBe(manifest.browser.length);
      expect(fs.readFileSync(summary.phases.browser.logFile, 'utf8')).toBe('retained runner diagnostics');
      expect(fs.readdirSync(reportDir).some(file => file.endsWith('.tmp'))).toBe(false);
    } finally { removeScratch(reportDir); }
  });

  for (const mode of ['missing-unit-suite', 'missing-browser-suite', 'skipped-unit', 'skipped-browser', 'retried-browser', 'missing-report', 'malformed-report', 'failed-exit', 'unknown-exit', 'signaled-exit', 'spawn-error']) it('rejects incomplete or failed evidence: ' + mode, () => {
    const reportDir = scratch(), calls = [];
    try {
      // Old success reports must not rescue a run that produces no report.
      fs.writeFileSync(path.join(reportDir, 'unit.json'), JSON.stringify({ success: true }));
      fs.writeFileSync(path.join(reportDir, 'browser.log'), 'stale browser success');
      expect(() => executeCalibration({ reportDir, run: (cli, args, env, logFile) => {
        const kind = cli.includes('vitest') ? 'unit' : 'browser'; calls.push(kind);
        fs.writeFileSync(logFile, 'failure diagnostics');
        if (mode !== 'missing-report') writeReport(kind, manifest, args, env, report => {
          if (mode === 'missing-unit-suite') report.testResults.pop();
          if (kind === 'browser' && mode === 'missing-browser-suite') report.suites[0].specs.pop();
          if (mode === 'skipped-unit') report.testResults[0].assertionResults[0].status = 'pending';
          if (kind === 'browser' && mode === 'skipped-browser') report.suites[0].specs[0].tests[0].results[0].status = 'skipped';
          if (kind === 'browser' && mode === 'retried-browser') report.suites[0].specs[0].tests[0].results.push({ status: 'passed' });
        });
        if (mode === 'malformed-report') fs.writeFileSync(path.join(reportDir, 'unit.json'), '{bad json');
        return { status: mode === 'failed-exit' ? 1 : mode === 'unknown-exit' ? null : 0, signal: mode === 'signaled-exit' ? 'SIGTERM' : null, error: mode === 'spawn-error' ? new Error('injected spawn error') : null };
      } })).toThrow();
      const summary = JSON.parse(fs.readFileSync(path.join(reportDir, 'summary.json'), 'utf8'));
      const kind = mode.includes('browser') ? 'browser' : 'unit';
      expect(summary.status).toBe('failed');
      expect(summary.testsPassed).toBeUndefined();
      expect(summary.phases[kind].status).toBe('failed');
      expect(fs.readFileSync(summary.phases[kind].logFile, 'utf8')).toBe('failure diagnostics');
      if (kind === 'unit') {
        expect(calls).toEqual(['unit']);
        expect(summary.phases.browser.status).toBe('not-started');
        expect(fs.existsSync(path.join(reportDir, 'browser.log'))).toBe(false);
      } else expect(calls).toEqual(['unit', 'browser']);
    } finally { removeScratch(reportDir); }
  });

  it('rejects ambiguous command arguments', () => {
    expect(() => main(['--unit-only'])).toThrow(/Usage:/);
    expect(() => main(['--report-dir'])).toThrow(/Usage:/);
  });
});
