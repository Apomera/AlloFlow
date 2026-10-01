import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Avoid emitting the 3.6 MB tool source for every legacy literal assertion.
export default class CompactRaptorReporter {
  tests = [];
  onTestCaseResult(test) {
    const result = test.result();
    this.tests.push({
      name: test.fullName, state: result.state,
      errors: (result.errors || []).map(error => String(error.message).split('\n')[0].slice(0, 400))
    });
  }
  onTestRunEnd(modules, errors, reason) {
    const report = { reason, total: this.tests.length,
      passed: this.tests.filter(test => test.state === 'passed').length,
      failed: this.tests.filter(test => test.state === 'failed').length,
      errors: errors.map(error => String(error.message).split('\n')[0]), tests: this.tests };
    const name = process.env.RAPTOR_REPORT_NAME || 'unit-current';
    writeFileSync(resolve('reports/raptor-engagement-2026-09-26', name + '.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ name, total: report.total, passed: report.passed, failed: report.failed, errors: report.errors }));
  }
}
