import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const source = readFileSync('dev-tools/check_pipeline_tests.cjs', 'utf8');

function runWith(result) {
  const output = [], calls = [];
  const stopped = {};
  let exitCode;
  try {
    runInNewContext(source, {
      __dirname: resolve('dev-tools'),
      process: { argv: ['node', 'check_pipeline_tests.cjs'], execPath: process.execPath,
        exit: code => { exitCode = code; throw stopped; } },
      console: { log: value => output.push(value), error: value => output.push(value) },
      require: name => name === 'child_process' ? {
        spawnSync: (...args) => { calls.push(args); return result; },
      } : name === 'fs' ? {
        readdirSync: () => Array.from({length: 40}, (_, i) => 'pipeline_fixture_' + i + '.test.js'),
        existsSync: () => true,
      } : require(name),
    });
  } catch (error) { if (error !== stopped) throw error; }
  return { exitCode, output: output.join('\n'), calls };
}

describe('pipeline checker failure diagnostics', () => {
  it('reports the actual failed assertion after noisy expected-error fixtures', () => {
    const run = runWith({status: 1, stdout: 'Error: expected fixture rejection\n'.repeat(100),
      stderr: '\u001b[31mFailed Tests 1\u001b[0m\n FAIL tests/export.test.js\nAssertionError: actual regression\nExpected: complete\nReceived: missing\n at export.test.js:42'});
    expect(run.exitCode).toBe(1);
    expect(run.output).toContain('actual regression');
    expect(run.output).toContain('Expected: complete\nReceived: missing');
    expect(run.output).toContain('export.test.js:42');
    expect(run.output).not.toContain('expected fixture rejection');
    expect(run.output).not.toContain('\u001b');
    expect(run.calls).toHaveLength(1);
    expect(run.calls[0][1].filter(arg => arg.startsWith('tests/'))).toHaveLength(40);
  });

  it('bounds huge diagnostics while retaining the first failure and final summary', () => {
    const run = runWith({status: 1, stdout: '',
      stderr: 'Failed Suites 2\nFIRST_FAILURE\n' + 'x'.repeat(40000) + '\nFINAL_FAILURE_SUMMARY'});
    expect(run.exitCode).toBe(1);
    expect(run.output).toContain('FIRST_FAILURE');
    expect(run.output).toContain('diagnostic output truncated');
    expect(run.output).toContain('FINAL_FAILURE_SUMMARY');
    expect(run.output.length).toBeLessThan(31000);
  });

  it('keeps a runner crash actionable even without a Vitest failure summary', () => {
    const run = runWith({status: 1, stdout: '', stderr: 'Fatal worker error: heap exhausted'});
    expect(run.exitCode).toBe(1);
    expect(run.output).toContain('Fatal worker error: heap exhausted');
  });
});
