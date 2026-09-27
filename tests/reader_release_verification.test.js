// Tooling-only fault injection. No application files, builders or Git writes.
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const crypto = require('node:crypto');
const { INPUTS, OUTPUTS, renderReaderModule } = require('../dev-tools/lib/reader_compiler.cjs');
const { HOSTS, PATHS, readerLoaders, verifyReaderRelease, parseArgs } = require('../dev-tools/check_reader_release.cjs');
const HEAD = '1'.repeat(40), NEXT_HEAD = '2'.repeat(40);
const ROOT = path.resolve('virtual-reader-release');
const sources = ['function createReadingPlaceStore() { return "place"; }', 'var supportDrafts = "drafts";', 'function SimplifiedView() { return <p>{createReadingPlaceStore() + supportDrafts}</p>; }'];
const digest = text => crypto.createHash('sha256').update(text).digest('hex');
const builder = readFileSync('_build_view_simplified_module.js', 'utf8');

function fixture() {
  const files = new Map(PATHS.map(file => [path.join(ROOT, file), Buffer.from('// fixture') ]));
  const put = (file, value) => files.set(path.join(ROOT, file), Buffer.from(value));
  INPUTS.forEach((file, i) => put(file, sources[i]));
  const output = renderReaderModule(sources);
  OUTPUTS.forEach(file => put(file, output));
  const url = 'https://alloflow-cdn.pages.dev/view_simplified_module.js?v=' + digest(output).slice(0, 8);
  const host = `// Historical mention: loadModule('ViewSimplifiedModule', 'stale');\nthrow Error('Never execute a host');\nloadModule('ViewSimplifiedModule', '${url}');\nconst App = () => <div/>;`;
  HOSTS.forEach(file => put(file, host));
  const read = file => { const value = files.get(file); if (!value) throw Object.assign(Error('Missing fixture file'), { code: 'ENOENT' }); return value; };
  const check = extra => verifyReaderRelease({ root: ROOT, read, readHead: () => HEAD, ...extra });
  return { files, put, read, check, output, host, url };
}
const codes = report => report.errors.map(error => error.code);

describe('read-only reader release verification', () => {
  it('accepts exact compiled outputs, real loader pins and a stable working snapshot without executing host code', () => {
    const f = fixture(), before = [...f.files].map(([key, value]) => [key, digest(value)]);
    const result = f.check({ expectedHead: HEAD });
    expect(result.ok).toBe(true); expect(result.expectedModuleSha256).toBe(digest(f.output));
    expect(result.mirrorsMatch).toBe(true); expect(result.hostsMatch).toBe(true);
    expect(result.pins[HOSTS[0]]).toEqual([{ line: 3, url: f.url }]);
    expect([...f.files].map(([key, value]) => [key, digest(value)])).toEqual(before);
  });
  it('rejects stale output even when both mirrors and all pins agree', () => {
    const f = fixture(); f.put(INPUTS[0], sources[0].replace('place', 'new place'));
    const result = f.check(); expect(result.mirrorsMatch).toBe(true);
    expect(result.errors.filter(e => e.code === 'stale-generated-output').map(e => e.file)).toEqual(OUTPUTS);
    expect(codes(result)).not.toContain('reader-pin-mismatch'); expect(result.ok).toBe(false);
  });
  it('rejects a same-length stale public mirror and a missing output without repairing either', () => {
    const f = fixture(); f.put(OUTPUTS[1], f.output.replace('place', 'PLACE'));
    expect(codes(f.check())).toContain('reader-mirror-drift');
    f.files.delete(path.join(ROOT, OUTPUTS[1]));
    expect(codes(f.check())).toContain('unreadable-file');
    expect(f.files.has(path.join(ROOT, OUTPUTS[1]))).toBe(false);
  });
  it('does not accept a pin that exists only in a comment or text literal', () => {
    const f = fixture(); HOSTS.forEach(file => f.put(file, `// loadModule('ViewSimplifiedModule', '${f.url}');\nconst example = "loadModule('ViewSimplifiedModule', '${f.url}')";`));
    expect(f.check().errors.filter(e => e.code === 'reader-loader-count')).toHaveLength(3);
  });
  it.each([
    ['stale', "loadModule('ViewSimplifiedModule', 'https://alloflow-cdn.pages.dev/view_simplified_module.js?v=00000000');"],
    ['dynamic', "loadModule('ViewSimplifiedModule', someUrl);"],
    ['missing version', "loadModule('ViewSimplifiedModule', 'https://alloflow-cdn.pages.dev/view_simplified_module.js');"]
  ])('rejects a %s loader URL', (_label, source) => {
    const f = fixture(); HOSTS.forEach(file => f.put(file, source));
    expect(f.check().errors.filter(e => e.code === 'reader-pin-mismatch')).toHaveLength(3);
  });
  it('rejects duplicate loader calls and divergent host copies', () => {
    const f = fixture(); f.put(HOSTS[1], f.host + `\nloadModule('ViewSimplifiedModule', '${f.url}');`);
    const result = f.check(); expect(codes(result)).toContain('reader-loader-count'); expect(codes(result)).toContain('host-mirror-drift');
  });
  it('reports JSX source and host syntax failures without executing or repairing files', () => {
    const f = fixture(); f.put(INPUTS[2], 'function broken( {'); f.put(HOSTS[0], 'const broken = ;');
    const result = f.check(); expect(codes(result)).toContain('compile-failed'); expect(codes(result)).toContain('host-parse-failed');
  });
  it('detects source edits during compilation and uses the original captured inputs', () => {
    const f = fixture();
    const result = f.check({ render(captured) { f.put(INPUTS[1], 'changed'); return renderReaderModule(captured); } });
    expect(result.expectedModuleSha256).toBe(digest(f.output));
    expect(result.changedDuringCheck).toEqual([INPUTS[1]]); expect(result.ok).toBe(false);
  });
  it('detects a host disappearing during the check', () => {
    const f = fixture(); const result = f.check({ render(captured) { f.files.delete(path.join(ROOT, HOSTS[2])); return renderReaderModule(captured); } });
    expect(result.changedDuringCheck).toEqual([HOSTS[2]]); expect(codes(result)).toContain('input-changed');
  });
  it('fails if HEAD changes, differs from the requested baseline or cannot be read', () => {
    const f = fixture(); let calls = 0;
    expect(codes(f.check({ readHead: () => calls++ ? NEXT_HEAD : HEAD }))).toContain('head-changed');
    expect(codes(f.check({ expectedHead: NEXT_HEAD }))).toContain('unexpected-head');
    expect(codes(f.check({ readHead() { throw Error('no repository'); } }))).toContain('git-unavailable');
  });
  it('rejects incomplete, repeated or unknown command options', () => {
    expect(parseArgs(['--json', '--expect-head', HEAD])).toEqual({ json: true, expectedHead: HEAD });
    for (const args of [['--apply'], ['--expect-head'], ['--expect-head', '1234'], ['--json', '--json']]) expect(() => parseArgs(args)).toThrow(/Usage/);
  });
  it('parses real loader calls across comments and formatting', () => {
    expect(readerLoaders("loadModule /* label */ ( 'ViewSimplifiedModule',\n 'url' );")).toEqual([{ line: 1, url: 'url' }]);
  });
});

function runBuilder(f, args = [], imported = false) {
  const writes = [], module = {}, process = { argv: ['node', '_build_view_simplified_module.js', ...args], pid: 9 };
  const filesystem = {
    readFileSync: file => f.read(file).toString('utf8'), existsSync: file => f.files.has(file),
    writeFileSync(file, value) { writes.push(file); f.files.set(file, Buffer.from(value)); },
    renameSync(from, to) { f.files.set(to, f.files.get(from)); f.files.delete(from); },
    unlinkSync: file => f.files.delete(file)
  };
  const req = name => name === 'node:fs' ? filesystem : name === 'node:path' ? path : name === './dev-tools/lib/reader_compiler.cjs' ? { INPUTS, OUTPUTS, renderReaderModule } : (() => { throw Error('Unexpected dependency'); })();
  req.main = imported ? {} : module;
  vm.runInNewContext(builder, { require: req, module, process, __dirname: ROOT, console: { log() {}, error() {} } });
  return { writes, exitCode: process.exitCode || 0 };
}
describe('reader builder compatibility and non-writing mode', () => {
  it('checks matching outputs without writes', () => { expect(runBuilder(fixture(), ['--check'])).toEqual({ writes: [], exitCode: 0 }); });
  it('reports stale or missing output without writing temporary files', () => {
    const f = fixture(); f.put(OUTPUTS[0], 'old'); f.files.delete(path.join(ROOT, OUTPUTS[1]));
    expect(runBuilder(f, ['--check'])).toEqual({ writes: [], exitCode: 1 });
    expect(f.read(path.join(ROOT, OUTPUTS[0])).toString()).toBe('old');
  });
  it.each([false, true])('preserves default atomic build behavior, imported=%s', imported => {
    const f = fixture(); OUTPUTS.forEach(file => f.put(file, 'old'));
    expect(runBuilder(f, [], imported).writes).toHaveLength(2);
    for (const file of OUTPUTS) expect(f.read(path.join(ROOT, file)).toString()).toBe(f.output);
    expect([...f.files.keys()].some(file => file.endsWith('.tmp'))).toBe(false);
  });
  it('rejects a misspelled check flag before any write', () => {
    const f = fixture(), before = [...f.files].map(([p, v]) => [p, digest(v)]);
    expect(() => runBuilder(f, ['--chek'])).toThrow(/Usage/);
    expect([...f.files].map(([p, v]) => [p, digest(v)])).toEqual(before);
  });
  it('does not require sources or outputs to show help', () => {
    const f = fixture(); f.files.clear(); expect(runBuilder(f, ['--help'])).toEqual({ writes: [], exitCode: 0 });
  });
});
