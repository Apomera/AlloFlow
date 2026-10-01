import fs from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
const source = fs.readFileSync('dev-tools/check_staged_file_sizes.cjs', 'utf8');
const limit = 25 * 1024 * 1024;
function run(files, brokenBatch = false) {
  const calls = [], errors = [];
  let code = 0;
  const child = { execFileSync(_command, args, options) {
    calls.push(args);
    if (args[0] === 'diff') {
      const output = Object.keys(files).join('\0') + '\0';
      if (Buffer.byteLength(output) > (options.maxBuffer || 1024 * 1024)) throw new Error('ENOBUFS');
      return output;
    }
    if (args[1].startsWith('--batch-check')) {
      if (brokenBatch) throw new Error('Broken batch');
      return options.input.trimEnd().split('\n').map(name => 'blob ' + files[name.slice(1)]).join('\n') + '\n';
    }
    if (args[1] === '-s') return String(files[args[2].slice(1)]);
    throw new Error('Unexpected Git operation');
  } };
  try {
    vm.runInNewContext(source, {
      require() { return child; },
      process: { exit(value) { throw { hookExit: value }; } },
      console: { error(message) { errors.push(message); } }
    });
  } catch (error) {
    if (!('hookExit' in error)) throw error;
    code = error.hookExit;
  }
  return { code, calls, errors: errors.join('\n') };
}
describe('batched staged file size guard', () => {
  it('permits staged blobs below the deployment boundary', () => {
    expect(run({ 'asset.js': limit - 1 }).code).toBe(0);
  });
  it('still blocks an exact-limit staged blob', () => {
    const result = run({ 'asset.wasm': limit });
    expect(result.code).toBe(1); expect(result.errors).toContain('asset.wasm');
  });
  it('preserves spaces and uses safe individual queries for newline filenames', () => {
    const result = run({ 'reports/a file.png': limit, 'reports/a\nfile.png': limit });
    expect(result.code).toBe(1); expect(result.errors).toContain('reports/a file.png');
    expect(result.calls.some(args => args[1] === '-s' && args[2] === ':reports/a\nfile.png')).toBe(true);
  });
  it('checks a file list over one MiB with two Git processes', () => {
    const files = Object.fromEntries(Array.from({ length: 20000 }, (_, i) => ['reports/source-snapshots/long-path-to-the-validated-runtime-artifact-' + i + '.js', 100]));
    expect(Buffer.byteLength(Object.keys(files).join('\0'))).toBeGreaterThan(1024 * 1024);
    const result = run(files); expect(result.code).toBe(0); expect(result.calls).toHaveLength(2);
  });
  it('fails closed when Git cannot perform the batch query', () => {
    expect(() => run({ 'asset.js': 100 }, true)).toThrow('Broken batch');
  });
});
