// veraPDF check counts and the Java probe tell the truth (fleet G1, 2026-09-28).
//
// The 09-22 real-document scoreboard (runs/2026-09-22-real-corpus/scoreboard.md) found:
//   - the IRS 1040 instructions (126 pages) produce a COMPLETE veraPDF report with 2,164,395 passed
//     checks, and our parser's own 1,000,000 ceiling threw it away; the driver then swallowed the
//     reason in `catch (_)` and said only "incomplete or contradictory evidence". The same ceiling
//     silently reported a rule with more than a million failed checks as having 0.
//   - a 15 s `java -version` probe that timed out on a busy machine was reported as "Java runtime
//     not found", telling the user to install Java they already had.
// Now: real counts of any size are accepted; a job veraPDF ended early (timeout / cancelled) says the
// PDF was only partly checked, with the count, and never passes; the driver names the reason; a
// probe timeout is "Java did not respond in time", distinct from "not found", and is not cached.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const V = require('../desktop/mcp/remediation_verification.cjs');
const E = require('../desktop/mcp/remediation_epub_validation.cjs');
const Driver = require('../desktop/mcp/remediation_headless_driver.cjs');

const report = (validation) => ({ report: { jobs: [{ validationResult: [validation] }], buildInformation: { releaseDetails: [{ id: 'core', version: '1.30.2' }] } } });
const IRS = { compliant: false, details: { failedRules: 3, failedChecks: 12, passedRules: 103, passedChecks: 2164395,
  ruleSummaries: [{ ruleStatus: 'FAILED', specification: 'ISO 14289-1:2014', clause: '7.1', testNumber: 3, description: 'Content shall be marked', failedChecks: 1500000 }] } };

function fakeDriver(stdoutJson, exitCode) {
  return Driver.createDriver({
    log() {},
    spawnProcess() {
      const child = new EventEmitter(); child.stdout = new EventEmitter(); child.kill = () => true;
      process.nextTick(() => { child.stdout.emit('data', JSON.stringify(stdoutJson)); child.emit('close', exitCode); });
      return child;
    },
  });
}

let scratch;
let pdf;
beforeAll(() => {
  scratch = mkdtempSync(join(tmpdir(), 'g1-verapdf-'));
  pdf = join(scratch, 'fixture.pdf');
  writeFileSync(pdf, Buffer.from('%PDF-1.4\ncount fixture\n%%EOF\n', 'latin1'));
});
afterAll(() => { try { rmSync(scratch, { recursive: true, force: true }); } catch (_) {} });

describe('veraPDF counts: complete reports of any size are kept', () => {
  it('accepts the IRS 1040 instructions report (2,164,395 passed checks, noncompliant, exit 1)', () => {
    expect(V.parsePdfUaCliReport(report(IRS), 1).counts).toEqual({ failedRules: 3, failedChecks: 12, passedRules: 103, passedChecks: 2164395 });
  });
  it('accepts a passing report just over the old ceiling', () => {
    const pass = { compliant: true, details: { failedRules: 0, failedChecks: 0, passedRules: 106, passedChecks: 1000001 } };
    expect(V.parsePdfUaCliReport(report(pass), 0).counts.passedChecks).toBe(1000001);
  });
  it('still rejects counts that are not whole numbers, and says which one', () => {
    expect(() => V.parsePdfUaCliReport(report({ compliant: true, details: { failedRules: 0, failedChecks: 0, passedRules: 1, passedChecks: 2.5 } }), 0))
      .toThrow(/passedChecks is missing or is not a whole number/);
  });
});

describe('veraPDF ended early: the PDF was only partly checked, with the count, never a pass', () => {
  it('a cancelled job that claims compliant is refused and counted', () => {
    const cancelled = { compliant: true, jobEndStatus: 'cancelled', details: { failedRules: 0, failedChecks: 0, passedRules: 50, passedChecks: 1000000 } };
    let error;
    try { V.parsePdfUaCliReport(report(cancelled), 0); } catch (e) { error = e; }
    expect(error && error.code).toBe('ALLOFLOW_VERAPDF_PARTIAL');
    expect(error.message).toContain('veraPDF stopped before it finished checking this PDF (job end status: cancelled).');
    expect(error.message).toContain('The PDF was only partly checked: 1,000,000 checks ran (1,000,000 passed, 0 failed)');
    expect(error.message).toContain('no PDF/UA-1 result is given');
    expect(error).toMatchObject({ checkedChecks: 1000000, passedChecks: 1000000, failedChecks: 0, jobEndStatus: 'cancelled' });
  });
  it('a timed-out job with no counts says it cannot report how many ran', () => {
    expect(() => V.parsePdfUaCliReport(report({ compliant: false, jobEndStatus: 'timeout', details: {} }), 1))
      .toThrow(/only partly checked, and veraPDF did not report how many checks ran/);
  });
});

describe('the CLI driver reports what veraPDF said instead of swallowing it', () => {
  it('returns the full IRS counts and keeps a rule with 1,500,000 failed checks (was clamped to 0)', async () => {
    const driver = fakeDriver(report(IRS), 1);
    try {
      const result = await driver.validatePdfUaCli({ filePath: pdf, timeoutMs: 5000 });
      expect(result).toMatchObject({ status: 'noncompliant', passedChecks: 2164395, failedChecks: 12 });
      expect(result.failedRuleSummaries[0]).toMatchObject({ clause: '7.1', failedChecks: 1500000 });
    } finally { await driver.close(); }
  });
  it('a partial job reaches the caller as "only partly checked", with the count', async () => {
    const driver = fakeDriver(report({ compliant: false, jobEndStatus: 'cancelled', details: { failedRules: 1, failedChecks: 100, passedRules: 40, passedChecks: 999900 } }), 1);
    try {
      await expect(driver.validatePdfUaCli({ filePath: pdf, timeoutMs: 5000 }))
        .rejects.toThrow(/only partly checked: 1,000,000 checks ran \(999,900 passed, 100 failed\)/);
    } finally { await driver.close(); }
  });
  it('malformed evidence keeps the stable prefix and now names the reason', async () => {
    const driver = fakeDriver(report({ compliant: true, details: {} }), 0);
    try {
      await expect(driver.validatePdfUaCli({ filePath: pdf, timeoutMs: 5000 }))
        .rejects.toThrow(/^veraPDF CLI returned incomplete or contradictory validation evidence \(exit 0\): failedRules is missing or is not a whole number$/);
    } finally { await driver.close(); }
  });
});

describe('Java probe: "did not respond in time" is not "not found"', () => {
  const timeout = () => ({ error: Object.assign(new Error('spawnSync java ETIMEDOUT'), { code: 'ETIMEDOUT' }) });
  const missing = () => ({ error: Object.assign(new Error('spawnSync java ENOENT'), { code: 'ENOENT' }) });
  it('classifies a timeout and a missing binary differently, with a 60 s default wait', () => {
    const t = E.javaRuntime('java', { spawnSync: timeout });
    expect(t).toMatchObject({ present: false, timedOut: true, notFound: false, timeoutMs: 60000 });
    const m = E.javaRuntime('java', { spawnSync: missing });
    expect(m).toMatchObject({ present: false, timedOut: false, notFound: true });
    expect(E.javaUnavailableMessage(t, 'EPUBCheck')).toMatch(/^Java did not respond in time \(`java -version` took longer than 60 s\)\. Java may well be installed/);
    expect(E.javaUnavailableMessage(t, 'EPUBCheck')).not.toMatch(/not found|Install Java/);
    expect(E.javaUnavailableMessage(m, 'EPUBCheck')).toMatch(/^Java runtime not found/);
  });
  it('a real probe that times out is re-probed, not cached as absence', () => {
    const prev = process.env.ALLOFLOW_MCP_JAVA_PROBE_TIMEOUT_MS;
    process.env.ALLOFLOW_MCP_JAVA_PROBE_TIMEOUT_MS = '1';
    try {
      const first = E.javaRuntime(process.execPath);
      expect(first).toMatchObject({ present: false, timedOut: true, timeoutMs: 1 });
      const second = E.javaRuntime(process.execPath);
      expect(second).not.toBe(first); // a cached negative would be the same object
      expect(second.timedOut).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.ALLOFLOW_MCP_JAVA_PROBE_TIMEOUT_MS; else process.env.ALLOFLOW_MCP_JAVA_PROBE_TIMEOUT_MS = prev;
    }
  });
  it('the real CLI driver says "did not respond in time" for a slow probe and "not found" for a missing one', async () => {
    const jar = resolve('desktop/web-app/public/verapdf/verapdf-cli.jar');
    expect(existsSync(jar)).toBe(true);
    const keep = { bin: process.env.ALLOFLOW_MCP_JAVA_BIN, t: process.env.ALLOFLOW_MCP_JAVA_PROBE_TIMEOUT_MS, jar: process.env.ALLOFLOW_MCP_VERAPDF_CLI };
    process.env.ALLOFLOW_MCP_VERAPDF_CLI = jar;
    const driver = Driver.createDriver({ log() {} });
    try {
      process.env.ALLOFLOW_MCP_JAVA_BIN = process.execPath; // a real binary that cannot answer in 1 ms
      process.env.ALLOFLOW_MCP_JAVA_PROBE_TIMEOUT_MS = '1';
      const slow = await driver.validatePdfUaCli({ filePath: pdf, timeoutMs: 5000 }).then(() => null, (e) => e);
      expect(slow && slow.message).toMatch(/^Java did not respond in time: /);
      expect(slow.message).not.toMatch(/not found/);
      process.env.ALLOFLOW_MCP_JAVA_BIN = join(scratch, 'no-such-java-' + Date.now());
      process.env.ALLOFLOW_MCP_JAVA_PROBE_TIMEOUT_MS = '60000';
      await expect(driver.validatePdfUaCli({ filePath: pdf, timeoutMs: 5000 })).rejects.toThrow(/^Java runtime not found: /);
    } finally {
      await driver.close();
      for (const [k, v] of [['ALLOFLOW_MCP_JAVA_BIN', keep.bin], ['ALLOFLOW_MCP_JAVA_PROBE_TIMEOUT_MS', keep.t], ['ALLOFLOW_MCP_VERAPDF_CLI', keep.jar]]) {
        if (v === undefined) delete process.env[k]; else process.env[k] = v;
      }
    }
  });
  it('EPUB validation reports the same distinction instead of "Install Java"', async () => {
    const epub = join(scratch, 'book.epub');
    writeFileSync(epub, Buffer.from('PK fixture, never opened because Java does not answer', 'latin1'));
    const keep = { bin: process.env.ALLOFLOW_MCP_JAVA_BIN, t: process.env.ALLOFLOW_MCP_JAVA_PROBE_TIMEOUT_MS, jar: process.env.ALLOFLOW_MCP_EPUBCHECK_JAR };
    process.env.ALLOFLOW_MCP_JAVA_BIN = process.execPath;
    process.env.ALLOFLOW_MCP_JAVA_PROBE_TIMEOUT_MS = '1';
    process.env.ALLOFLOW_MCP_EPUBCHECK_JAR = epub; // any existing file: the Java probe comes first
    try {
      const result = await E.validate(epub, { stateDir: scratch, timeoutMs: 5000 });
      expect(result.checks.epubcheck.status).toBe('unavailable');
      expect(result.checks.epubcheck.error).toMatch(/^Java did not respond in time/);
      expect(result.checks.epubcheck.error).not.toMatch(/Install Java/);
      expect(result.reviewRequired).toBe(true);
    } finally {
      for (const [k, v] of [['ALLOFLOW_MCP_JAVA_BIN', keep.bin], ['ALLOFLOW_MCP_JAVA_PROBE_TIMEOUT_MS', keep.t], ['ALLOFLOW_MCP_EPUBCHECK_JAR', keep.jar]]) {
        if (v === undefined) delete process.env[k]; else process.env[k] = v;
      }
    }
  });
});
