import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const gate = path.resolve('dev-tools/check_retired_paths.cjs');
const source = fs.readFileSync(gate, 'utf8');
const root = path.resolve('.');
function run(indexed, disk = indexed, changed = [], directoryExists = false) {
  const errors = [], reads = [];
  const relative = file => path.relative(root, file).split(path.sep).join('/');
  const fakeFs = {
    existsSync(file) { return relative(file) === 'prismflow-deploy' && directoryExists; },
    readFileSync(file) {
      const name = relative(file); reads.push(name);
      if (!(name in disk)) throw new Error('File not found');
      return disk[name];
    }
  };
  const child = { execFileSync(_command, args) {
    if (args[0] === 'ls-files') return Object.keys(indexed).join('\0') + '\0';
    if (args[0] === 'diff') return changed.join('\0') + '\0';
    if (args[0] === 'grep') {
      const matches = Object.keys(indexed).filter(name => indexed[name].includes('prismflow-deploy'));
      if (!matches.length) throw Object.assign(new Error('No matches'), { status: 1 });
      return matches.join('\0') + '\0';
    }
    throw new Error('Unexpected Git operation');
  } };
  let code;
  try {
    vm.runInNewContext(source, {
      __dirname: path.dirname(gate),
      require(name) { return name === 'fs' ? fakeFs : name === 'path' ? path : child; },
      process: { argv: ['node', gate, '--quiet'], exit(value) { throw { gateExit: value }; } },
      console: { log() {}, error(message) { errors.push(message); } }
    });
  } catch (error) {
    if (!('gateExit' in error)) throw error;
    code = error.gateExit;
  }
  return { code, errors: errors.join('\n'), reads };
}

describe('indexed retirement search preserves disk coverage', () => {
  it('avoids opening unrelated source snapshots', () => {
    const result = run({ 'reports/archive/large.json': '{"historical":"source"}', 'dev-tools/sync.cjs': 'copyCurrentFiles();' });
    expect(result.code).toBe(0); expect(result.reads).toEqual([]);
  });
  it('still rejects retired references in an active indexed script', () => {
    const result = run({ 'dev-tools/sync.cjs': 'copy("prismflow-deploy/public");' });
    expect(result.code).toBe(1); expect(result.errors).toContain('dev-tools/sync.cjs:1');
  });
  it('retains archived-script coverage instead of exempting reports', () => {
    const result = run({ 'reports/archive/old-sync.cjs': 'copy("prismflow-deploy/public");' });
    expect(result.code).toBe(1); expect(result.errors).toContain('reports/archive/old-sync.cjs:1');
  });
  it('catches an unstaged reference absent from the index', () => {
    const result = run({ 'dev-tools/sync.cjs': 'copyCurrentFiles();' }, { 'dev-tools/sync.cjs': 'copy("prismflow-deploy/public");' }, ['dev-tools/sync.cjs']);
    expect(result.code).toBe(1); expect(result.errors).toContain('dev-tools/sync.cjs:1');
  });
  it('honors a reference removed on disk after staging', () => {
    expect(run({ 'dev-tools/sync.cjs': 'copy("prismflow-deploy/public");' }, { 'dev-tools/sync.cjs': 'copyCurrentFiles();' }, ['dev-tools/sync.cjs']).code).toBe(0);
  });
  it('still rejects tracked files and a physical retired directory', () => {
    expect(run({ 'prismflow-deploy/public/app.js': 'app();' }).code).toBe(1);
    expect(run({}, {}, [], true).code).toBe(1);
  });
  it.each(['dev-tools/check_retired_paths.cjs', 'tests/retired_paths_index_search.test.js',
    'reports/adapted-reader-integration-01-2026-09-26-1730/pass-two/baseline/tests/desktop_web_shell_boundary.test.js'])('permits the retirement assertion in %s', name => {
    const result = run({ [name]: 'const RETIRED = "prismflow-deploy";' });
    expect(result.code).toBe(0); expect(result.reads).toEqual([]);
  });
});
