import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const fallback = createRequire(import.meta.url)('../dev-tools/changed_tests_fallback.cjs');
const EMFILE = "Error: EMFILE: too many open files, open 'tests/tagged_pdf_release_gate.test.js'";

const source = fs.readFileSync('dev-tools/check_changed_tests.cjs', 'utf8');
const paths = count => Array.from({ length: count }, (_, i) => `tests/change-${i}.test.js`).join('\n');

function run({ dirty = false, staged = '', unstaged = '', committed = '', args = [], failRange = false, related = null, runs = [], tests = {} } = {}) {
  const calls = [], output = [];
  let exitCode = 0;
  const isVitest = (argv) => /vitest\.mjs$/.test(String(argv[0]));
  const spawnSync = (command, argv, options) => {
    calls.push({ command, argv, options });
    if (isVitest(argv)) {
      if (argv[1] === 'related') return related || { status: 0, stdout: 'Tests passed', stderr: '' };
      return runs.shift() || { status: 0, stdout: ' Tests  3 passed (3)', stderr: '' };
    }
    let stdout = '';
    if (argv[0] === 'status') stdout = dirty ? ' M example.js' : '';
    else if (argv.includes('--cached')) stdout = staged;
    else if (argv.length === 2) stdout = unstaged;
    else {
      if (failRange) return { status: 128, stderr: 'invalid revision' };
      stdout = committed;
    }
    if (Buffer.byteLength(stdout) > options.maxBuffer) return { status: null, error: new Error('ENOBUFS') };
    return { status: 0, stdout, stderr: '' };
  };
  try {
    vm.runInNewContext(source, {
      require(name) {
        if (name === 'child_process') return { spawnSync };
        if (name === './quarantine.cjs') return { ROOT: '.', readQuarantine: () => ['tests/known-failure.test.js'] };
        if (name === './changed_tests_fallback.cjs') return { ...fallback, listTestFiles: () => Object.keys(tests).sort() };
        if (name === 'fs') return { readFileSync: (file) => tests[file.replace(/^\.\//, '')] };
        if (name === 'path') return { join: (...parts) => parts.join('/') };
        throw new Error('Unexpected import: ' + name);
      },
      process: { argv: ['node', 'check_changed_tests.cjs', ...args], execPath: 'node', platform: 'win32', stdout: { write: value => output.push(value) }, exit(code) { throw { gateExit: code }; } },
      console: { log: value => output.push(value), error: value => output.push(value) }
    });
  } catch (error) {
    if (!('gateExit' in error)) throw error;
    exitCode = error.gateExit;
  }
  return { calls, exitCode, output: output.join('\n'), vitest: calls.filter(call => isVitest(call.argv)) };
}

describe('deployment test scope after a source commit', () => {
  it('defers a clean committed batch over 120 files to the full CI suite', () => {
    const result = run({ committed: paths(121) });
    expect(result.exitCode).toBe(0);
    expect(result.vitest).toHaveLength(0);
    expect(result.output).toContain('121 files changed');
    expect(result.output).toContain('8-shard unit job in CI');
  });

  it('still runs the selected tests at the exact 120-file boundary', () => {
    const result = run({ committed: paths(120) });
    expect(result.vitest).toHaveLength(1);
    expect(result.vitest[0].argv).toContain('tests/change-119.test.js');
    expect(result.vitest[0].argv).toContain('tests/known-failure.test.js');
    expect(result.calls.some(call => call.argv.join(' ') === 'diff --name-only HEAD~1 HEAD')).toBe(true);
  });

  it('preserves the size cap for staged work before a commit', () => {
    const result = run({ dirty: true, staged: paths(121) });
    expect(result.vitest).toHaveLength(0);
    expect(result.calls.some(call => call.argv.includes('HEAD'))).toBe(false);
  });

  it('counts the union of an explicit range and new work without double counting', () => {
    const result = run({ dirty: true, args: ['--base=release-base'], committed: paths(120), staged: 'tests/change-0.test.js\nextra-a.js', unstaged: 'extra-a.js\nextra-b.js' });
    expect(result.vitest).toHaveLength(0);
    expect(result.output).toContain('122 files changed');
    expect(result.calls.some(call => call.argv.join(' ') === 'diff --name-only release-base HEAD')).toBe(true);
  });

  it('runs small uncommitted changes as an explicit tracked-file list', () => {
    const result = run({ dirty: true, unstaged: paths(2) });
    expect(result.vitest).toHaveLength(1);
    expect(result.vitest[0].argv.slice(1, 4)).toEqual(['related', 'tests/change-0.test.js', 'tests/change-1.test.js']);
    expect(result.calls.some(call => call.argv.includes('HEAD~1'))).toBe(false);
  });

  // vitest --changed adds every untracked file; 72,878 scratch files made a
  // two-file commit run for hours (2026-10-28).
  it('never lets vitest discover changes itself, so untracked scratch cannot widen the run', () => {
    const result = run({ committed: 'view_dbq_module.js' });
    expect(result.vitest).toHaveLength(1);
    expect(result.vitest[0].argv).not.toContain('--changed');
    expect(result.vitest[0].argv).toContain('--run');
    expect(result.vitest[0].options.shell).toBeFalsy();
    expect(result.calls.some(call => call.argv.includes('ls-files'))).toBe(false);
  });

  it('skips the graph resolve when no changed file is importable by a test', () => {
    const result = run({ dirty: true, unstaged: 'a11y-audit/sel_hub_wcag_audit.md\nAlloFlowANTI.txt' });
    expect(result.exitCode).toBe(0);
    expect(result.vitest).toHaveLength(0);
    expect(result.output).toContain('none importable');
  });

  it('passes only importable files to vitest', () => {
    const result = run({ committed: 'docs/notes.md\nui_strings.js\ndata/bank.json\nstem_lab/tool.jsx' });
    expect(result.vitest[0].argv.slice(1, -3)).toEqual(['related', 'ui_strings.js', 'data/bank.json', 'stem_lab/tool.jsx', '--run']);
  });

  it('handles committed path lists larger than the default process buffer', () => {
    const committed = Array.from({ length: 20000 }, (_, i) => `reports/verification/source-snapshot-with-a-long-artifact-path-${i}.json`).join('\n');
    expect(Buffer.byteLength(committed)).toBeGreaterThan(1024 * 1024);
    expect(run({ committed }).vitest).toHaveLength(0);
  });

  it('fails closed when Git cannot resolve the committed test range', () => {
    expect(() => run({ failRange: true })).toThrow('Unable to determine test scope');
  });
});

// vitest related exhausted file handles mid-resolve on 2026-10-29 (a two-file
// personas commit) and the gate reported it as a red test.
describe('deployment test scope when vitest cannot resolve the import graph', () => {
  const tests = {
    'tests/personas_render.test.js': "fs.readFileSync('personas_module.js')",
    'tests/personas_source.test.js': "fs.readFileSync('personas_source.jsx')",
    'tests/known-failure.test.js': "fs.readFileSync('personas_module.js')",
    'tests/unrelated.test.js': "fs.readFileSync('view_quiz_module.js')",
  };
  const crash = { status: 1, stdout: '', stderr: EMFILE };

  it('runs the tests that name the changed file and reports the fallback', () => {
    const result = run({ committed: 'personas_module.js', related: crash, tests });
    expect(result.exitCode).toBe(0);
    expect(result.vitest).toHaveLength(2);
    expect(result.vitest[1].argv.slice(1)).toEqual(['run', 'tests/personas_render.test.js', 'tests/personas_source.test.js', '--maxWorkers=2']);
    expect(result.output).toContain('FALLBACK running 2 test file(s)');
    expect(result.output).toContain('OK (fallback)');
  });

  it('fails when a fallback test is red', () => {
    const result = run({ committed: 'personas_module.js', related: crash, tests, runs: [{ status: 1, stdout: ' Tests  1 failed | 2 passed (3)', stderr: '' }] });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('a test that names a changed file is red');
  });

  it('fails without a verdict when the fallback batch also runs out of handles', () => {
    const result = run({ committed: 'personas_module.js', related: crash, tests, runs: [crash] });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('no verdict is possible');
  });

  it('batches a large selection so no single run reopens the whole tree', () => {
    const many = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`tests/p${String(i).padStart(2, '0')}.test.js`, 'personas_module.js']));
    const result = run({ committed: 'personas_module.js', related: crash, tests: many });
    expect(result.exitCode).toBe(0);
    expect(result.vitest.slice(1).map(call => call.argv.length - 3)).toEqual([25, 5]);
  });

  it('keeps a real red test red when the output also mentions EMFILE', () => {
    const result = run({ committed: 'personas_module.js', related: { status: 1, stdout: EMFILE + '\n Tests  1 failed (1)', stderr: '' }, tests });
    expect(result.exitCode).toBe(1);
    expect(result.vitest).toHaveLength(1);
    expect(result.output).toContain('a test covering this change is red');
  });

  it('does not fall back on an ordinary failure', () => {
    const result = run({ committed: 'personas_module.js', related: { status: 1, stdout: ' Tests  1 failed (1)', stderr: '' }, tests });
    expect(result.exitCode).toBe(1);
    expect(result.vitest).toHaveLength(1);
  });
});

describe('changed-test fallback selection', () => {
  it('names both halves of a compiled pair', () => {
    expect(fallback.namesFor('desktop/web-app/public/personas_module.js').sort()).toEqual(['personas_module.js', 'personas_source.jsx']);
    expect(fallback.namesFor('stem_lab/stem_tool_spacestation.js')).toEqual(['stem_tool_spacestation.js']);
  });

  it('includes changed test files and skips quarantined ones', () => {
    const files = ['tests/a.test.js', 'tests/b.test.js', 'tests/q.test.js'];
    const text = { 'tests/a.test.js': 'nothing', 'tests/b.test.js': 'nothing', 'tests/q.test.js': 'x_module.js' };
    expect(fallback.selectTests(['tests/a.test.js', 'x_module.js'], files, f => text[f], ['tests/q.test.js'])).toEqual(['tests/a.test.js']);
  });

  it('recognises handle exhaustion only when no test summary was printed', () => {
    expect(fallback.isHandleExhaustion(EMFILE)).toBe(true);
    expect(fallback.isHandleExhaustion(EMFILE + '\n      Tests  2 passed (2)')).toBe(false);
    expect(fallback.isHandleExhaustion('Error: ENOENT')).toBe(false);
  });
});
