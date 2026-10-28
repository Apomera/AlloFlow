import fs from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync('dev-tools/check_changed_tests.cjs', 'utf8');
const paths = count => Array.from({ length: count }, (_, i) => `tests/change-${i}.test.js`).join('\n');

function run({ dirty = false, staged = '', unstaged = '', committed = '', args = [], failRange = false } = {}) {
  const calls = [], output = [];
  let exitCode = 0;
  const isVitest = (argv) => /vitest\.mjs$/.test(String(argv[0]));
  const spawnSync = (command, argv, options) => {
    calls.push({ command, argv, options });
    if (isVitest(argv)) return { status: 0, stdout: 'Tests passed', stderr: '' };
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
