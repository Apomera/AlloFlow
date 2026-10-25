'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseAuditResult, runAudit } = require('../desktop/mcp/audit_bundle_dependencies.cjs');
function report(vulnerabilities = {}) {
  const counts = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 };
  for (const vulnerability of Object.values(vulnerabilities)) { counts[vulnerability.severity]++; counts.total++; }
  return { auditReportVersion: 2, vulnerabilities, metadata: { vulnerabilities: counts } };
}
const result = (audit, status = 0) => ({ status, signal: null, stdout: JSON.stringify(audit) });
const advisory = () => ({ name: 'dependency', severity: 'high', title: 'Synthetic advisory',
  url: 'https://github.com/advisories/GHSA-aaaa-bbbb-cccc' });
function vulnerableReport() {
  return report({ dependency: { name: 'dependency', severity: 'high', via: [advisory()] },
    app: { name: 'app', severity: 'high', via: ['dependency'] } });
}
test('accepts complete clean reports and normal npm vulnerability exit 1', () => {
  assert.deepEqual(parseAuditResult(result(report())), report());
  assert.deepEqual(parseAuditResult(result(vulnerableReport(), 1)), vulnerableReport());
});
test('registry and process failures cannot become clean audits', () => {
  for (const value of [result({ error: { code: 'E503' } }, 1), result({}), result(null), result([]),
    { ...result(report()), error: new Error('synthetic error') }, { ...result(report()), signal: 'SIGTERM' },
    result(report(), 2), { status: null, stdout: JSON.stringify(report()) },
    { status: 0, stdout: '{"auditReportVersion":2,' }, { status: 0, stdout: '' }]) {
    assert.throws(() => parseAuditResult(value));
  }
});
test('rejects unsupported schemas, inconsistent totals and incomplete advisory records', () => {
  const mutations = [audit => { audit.auditReportVersion = 1; }, audit => { delete audit.metadata; },
    audit => { audit.vulnerabilities = []; }, audit => { audit.metadata.vulnerabilities.total = 0; },
    audit => { audit.metadata.vulnerabilities.high = 0; },
    audit => { audit.vulnerabilities.dependency.severity = 'unknown'; },
    audit => { audit.vulnerabilities.dependency.via = []; },
    audit => { audit.vulnerabilities.dependency.via[0].url = 'https://example.com/unknown'; },
    audit => { delete audit.vulnerabilities.dependency.via[0].severity; },
    audit => { audit.vulnerabilities.app.via = ['missing']; },
    audit => { audit.vulnerabilities.app.via = ['toString']; }];
  for (const mutate of mutations) {
    const audit = vulnerableReport(); mutate(audit);
    assert.throws(() => parseAuditResult(result(audit, 1)));
  }
  assert.throws(() => parseAuditResult(result(report(), 1)));
});
test('cyclic transitive records require a reachable concrete advisory', () => {
  const audit = report({ one: { name: 'one', severity: 'high', via: ['two'] },
    two: { name: 'two', severity: 'high', via: ['one'] } });
  assert.throws(() => parseAuditResult(result(audit, 1)), /cycles/);
  audit.vulnerabilities.two.via.push(advisory());
  assert.deepEqual(parseAuditResult(result(audit, 1)), audit);
});
test('audit runner requests production dependencies and validates its result before returning', () => {
  const auditPrefix = 'synthetic directory & shell-metacharacters';
  const valid = runAudit({ auditPrefix, run(command, args, options) {
    const actualArgs = process.platform === 'win32' ? command.split(' ').slice(1) : args;
    assert.deepEqual(actualArgs, ['audit', '--omit=dev', '--json', '--package-lock-only', '--ignore-scripts']);
    assert.equal(options.cwd, auditPrefix);
    assert.ok(!command.includes(auditPrefix) && !args.includes(auditPrefix));
    assert.equal(options.windowsHide, true);
    assert.ok(options.timeout > 0);
    assert.equal(options.encoding, 'utf8');
    return result(report());
  } });
  assert.deepEqual(valid, report());
  assert.throws(() => runAudit({ run: () => result({ error: { code: 'E503' } }, 1) }));
});
