import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const { manifest, executeCalibration, main } = require('../dev-tools/mcp_calibration_validation.cjs');
const { validateManifest } = require('../dev-tools/remediation_validation.cjs');
const { captureIdentity, snapshotInputs } = require('../dev-tools/remediation_validation_identity.cjs');
const stableCapture = () => ({ inputSha256: { 'fixture.js': 'unchanged' }, tools: { node: 'fixture' }, gitHead: 'fixture-revision' });

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
        expect(() => executeCalibration({ reportDir, capture: stableCapture, selection: { ...manifest, unit }, run: () => { calls++; } })).toThrow();
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
      const summary = executeCalibration({ reportDir, capture: stableCapture, run: (cli, args, env, logFile) => {
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
      expect(summary.identity).toMatchObject({ changedInputs: [], toolsChanged: false, gitHeadChanged: false, gitHeadVerified: true });
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
      expect(() => executeCalibration({ reportDir, capture: stableCapture, run: (cli, args, env, logFile) => {
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


describe('MCP calibration identity evidence', () => {
  it('declares the implementation, harness, fixtures, tools and manifest actually exercised', () => {
    expect(manifest.identityInputs).toEqual(expect.arrayContaining([
      'dev-tools/mcp_calibration_validation.cjs', 'dev-tools/mcp_calibration_validation.json',
      'dev-tools/remediation_validation.cjs', 'dev-tools/remediation_validation_identity.cjs',
      'desktop/mcp/alloflow-remediation-mcp-stdio.cjs', 'desktop/mcp/remediation_headless_driver.cjs',
      'desktop/mcp/remediation_narration_plan.cjs', 'desktop/mcp/vendor',
      'doc_pipeline_source.jsx', 'doc_pipeline_module.js', 'doc_builder_renderer_source.jsx',
      'mcp-testing/refinement-study/protocol-v1.json', 'mcp-testing/refinement-study/study_runner.cjs',
      'tests/aifix_chunk_gates.test.js', 'tests/setup.js', 'tests/fixtures',
      'package-lock.json', 'vitest.config.js', 'playwright.config.ts',
    ]));
    const identity = captureIdentity(process.cwd(), [...manifest.unit, ...manifest.browser, ...manifest.identityInputs]);
    expect(Object.values(identity.inputSha256).every(value => /^[a-f0-9]{64}$/.test(value))).toBe(true);
    for (const file of [...manifest.unit, ...manifest.browser, 'dev-tools/mcp_calibration_validation.json'])
      expect(identity.inputSha256[file]).toMatch(/^[a-f0-9]{64}$/);
    expect(identity.tools).toMatchObject({ node: process.version, platform: process.platform, arch: process.arch });
  });

  for (const mode of ['stable', 'source-edit', 'suite-edit', 'manifest-edit', 'deleted-input', 'added-fixture', 'tool-change', 'revision-change']) it('binds passing reports to stable evidence: ' + mode, () => {
    const reportDir = scratch(), inputDir = path.join(reportDir, 'inputs');
    fs.mkdirSync(path.join(inputDir, 'fixtures'), { recursive: true });
    for (const file of ['source.js', 'suite.test.js', 'manifest.json']) fs.writeFileSync(path.join(inputDir, file), 'before');
    fs.writeFileSync(path.join(inputDir, 'fixtures/a.html'), '<p>source</p>');
    let changed = false, captures = 0;
    const capture = () => {
      captures++;
      return { inputSha256: snapshotInputs(inputDir, ['source.js', 'suite.test.js', 'manifest.json', 'fixtures']),
        tools: { node: changed && mode === 'tool-change' ? 'changed' : 'original' },
        gitHead: changed && mode === 'revision-change' ? 'changed' : 'original' };
    };
    const run = (cli, args, env) => {
      const kind = cli.includes('vitest') ? 'unit' : 'browser';
      writeReport(kind, manifest, args, env);
      if (kind === 'unit') {
        const edited = { 'source-edit': 'source.js', 'suite-edit': 'suite.test.js', 'manifest-edit': 'manifest.json' }[mode];
        if (edited) fs.writeFileSync(path.join(inputDir, edited), 'after!');
        if (mode === 'deleted-input') fs.unlinkSync(path.join(inputDir, 'source.js'));
        if (mode === 'added-fixture') fs.writeFileSync(path.join(inputDir, 'fixtures/new.html'), '<p>added</p>');
        changed = true;
      }
      return { status: 0, signal: null };
    };
    try {
      if (mode === 'stable') expect(executeCalibration({ reportDir, capture, run }).status).toBe('passed');
      else expect(() => executeCalibration({ reportDir, capture, run })).toThrow(/changed during the run/);
      const summary = JSON.parse(fs.readFileSync(path.join(reportDir, 'summary.json'), 'utf8'));
      expect(captures).toBe(2);
      expect(summary.identity.before.inputSha256['source.js']).toMatch(/^[a-f0-9]{64}$/);
      expect(summary.phases.unit.status).toBe('passed');
      expect(summary.phases.browser.status).toBe('passed');
      expect(summary.status).toBe(mode === 'stable' ? 'passed' : 'failed');
      if (mode !== 'stable') expect(summary.testsPassed).toBeUndefined();
      const changedFile = { 'source-edit': 'source.js', 'suite-edit': 'suite.test.js', 'manifest-edit': 'manifest.json', 'deleted-input': 'source.js', 'added-fixture': 'fixtures/new.html' }[mode];
      expect(summary.identity.changedInputs).toEqual(changedFile ? [changedFile] : []);
      expect(summary.identity.toolsChanged).toBe(mode === 'tool-change');
      expect(summary.identity.gitHeadChanged).toBe(mode === 'revision-change');
    } finally { removeScratch(reportDir); }
  });

  for (const mode of ['missing-input', 'initial-capture-error', 'final-capture-error', 'missing-initial-revision', 'missing-final-revision', 'runner-error']) it('retains failures without a stale success: ' + mode, () => {
    const reportDir = scratch(); let captures = 0, runners = 0;
    const capture = () => {
      captures++;
      if (captures === (mode === 'initial-capture-error' ? 1 : mode === 'final-capture-error' ? 2 : 0)) throw new Error('Injected identity capture failure');
      return { inputSha256: { 'source.js': mode === 'missing-input' ? null : 'same' }, tools: {},
        gitHead: captures === (mode === 'missing-initial-revision' ? 1 : mode === 'missing-final-revision' ? 2 : 0) ? null : 'known' };
    };
    try {
      fs.writeFileSync(path.join(reportDir, 'summary.json'), JSON.stringify({ status: 'passed', testsPassed: 9999 }));
      expect(() => executeCalibration({ reportDir, capture, run: (cli, args, env) => {
        runners++;
        if (mode === 'runner-error') throw new Error('Injected runner failure');
        writeReport(cli.includes('vitest') ? 'unit' : 'browser', manifest, args, env);
        return { status: 0, signal: null };
      } })).toThrow();
      const summary = JSON.parse(fs.readFileSync(path.join(reportDir, 'summary.json'), 'utf8'));
      expect(captures).toBe(2);
      expect(summary.status).toBe('failed');
      expect(summary.testsPassed).toBeUndefined();
      if (['missing-input', 'initial-capture-error', 'missing-initial-revision'].includes(mode)) {
        expect(runners).toBe(0);
        expect(summary.phases.unit.status).toBe('not-started');
      } else if (mode === 'runner-error') {
        expect(runners).toBe(1);
        expect(summary.phases.unit.status).toBe('failed');
        expect(summary.identity.after).toBeTruthy();
        expect(summary.error).toContain('Injected runner failure');
      } else {
        expect(runners).toBe(2);
        expect(summary.phases.browser.status).toBe('passed');
      }
      if (mode === 'missing-input') expect(summary.error).toContain('required calibration input is missing');
      if (mode.endsWith('revision')) expect(summary.error).toContain('Git revision could not be verified');
      if (mode === 'final-capture-error') expect(summary.error).toContain('Final identity capture failed');
    } finally { removeScratch(reportDir); }
  });

  it('rejects a loaded selection that no longer matches the manifest before running', () => {
    const reportDir = scratch(), original = manifest.unit;
    let calls = 0;
    try {
      manifest.unit = [...original, 'tests/remediation_validation.test.js'];
      expect(() => executeCalibration({ reportDir, capture: stableCapture, run: () => { calls++; } })).toThrow(/manifest changed before calibration/);
      expect(calls).toBe(0);
      expect(JSON.parse(fs.readFileSync(path.join(reportDir, 'summary.json'), 'utf8')).status).toBe('failed');
    } finally { manifest.unit = original; removeScratch(reportDir); }
  });

  it.each([undefined, [], ['source.js', 'source.js'], [null]])('requires declared identity inputs before running (%j)', identityInputs => {
    const reportDir = scratch(); let calls = 0;
    try {
      expect(() => executeCalibration({ reportDir, selection: { ...manifest, identityInputs }, capture: stableCapture, run: () => { calls++; } })).toThrow(/calibration identity inputs/);
      expect(calls).toBe(0);
    } finally { removeScratch(reportDir); }
  });
});
