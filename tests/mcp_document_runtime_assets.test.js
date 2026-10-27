import { afterAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { readDocumentRuntime } = require('../desktop/mcp/remediation_headless_driver.cjs');
const { getBundleSourceFiles } = require('../desktop/mcp/build_mcpb.cjs');
const scratch = mkdtempSync(join(tmpdir(), 'alloflow-document-runtime-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

function fixture(mutate = () => {}) {
  const root = mkdtempSync(join(scratch, 'fixture-'));
  const bytes = Buffer.from('globalThis.example = true;\n');
  const record = { kind: 'script', path: 'runtime_assets/document/example/main.js', bytes: bytes.length,
    sha384: createHash('sha384').update(bytes).digest('hex') };
  mkdirSync(join(root, 'runtime_assets/document/example'), { recursive: true });
  writeFileSync(join(root, record.path), bytes);
  const manifest = { schemaVersion: 1, assets: { example: record }, graphs: {} };
  mutate(manifest, root);
  writeFileSync(join(root, 'document_runtime_integrity.json'), JSON.stringify(manifest));
  for (const file of ['runtime_graph_delivery_policy.js', 'runtime_graph_host.js']) writeFileSync(join(root, file), '// fixture\n');
  return root;
}

describe('MCP document runtime uses a confined, byte-verified inventory', () => {
  it('maps the actual core preload names to reviewed document assets', () => {
    const source = readFileSync('desktop/mcp/remediation_headless_driver.cjs', 'utf8');
    const start = source.indexOf('  const assetNames = [];');
    const end = source.indexOf('  for (const name of [...new Set(assetNames)])', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const preloads = new Function('o', source.slice(start, end) + '\nreturn { assetNames, documentIds };')({ loadCore: true });
    const { manifest } = readDocumentRuntime(resolve(process.cwd()));
    expect(preloads.assetNames).toContain('pdfjs.min.js');
    for (const name of preloads.assetNames) {
      const record = manifest.assets[preloads.documentIds[name]];
      expect(record, name + ' must not fall back to the legacy vendor path').toMatchObject({ kind: 'script' });
    }
  });
  it('includes every reviewed runtime input in source verification for the emitted MCPB', () => {
    const runtime = readDocumentRuntime(resolve(process.cwd()));
    const bundle = getBundleSourceFiles({ includeRuntime: false });
    expect(runtime.files.size).toBe(Object.keys(runtime.manifest.assets).length);
    for (const relative of runtime.sourceFiles) expect(bundle['assets/' + relative]).toBe(resolve(relative));
  });
  it('rejects a changed executable even when its byte length is unchanged', () => {
    const root = fixture((manifest, dir) => writeFileSync(join(dir, manifest.assets.example.path), 'x'.repeat(manifest.assets.example.bytes)));
    expect(() => readDocumentRuntime(root)).toThrow(/hash mismatch/);
  });
  it.each(['../escape.js', '/absolute.js', 'runtime_assets/document/../escape.js', 'runtime_assets/document/a\\b.js'])('rejects unsafe path %s', unsafe => {
    const root = fixture(manifest => { manifest.assets.example.path = unsafe; });
    expect(() => readDocumentRuntime(root)).toThrow(/Invalid document runtime asset record|Unsafe document runtime path/);
  });
  it('rejects duplicate manifest paths', () => {
    const root = fixture(manifest => { manifest.assets.other = { ...manifest.assets.example }; });
    expect(() => readDocumentRuntime(root)).toThrow(/Invalid document runtime asset record/);
  });
  it('refuses a symlink before reading its target', () => {
    const root = fixture();
    const linked = join(root, 'runtime_assets/document/example');
    const original = fs.lstatSync;
    const stat = vi.spyOn(fs, 'lstatSync').mockImplementation(file => resolve(file) === linked
      ? { isSymbolicLink: () => true } : original(file));
    try { expect(() => readDocumentRuntime(root)).toThrow(/symlink/); }
    finally { stat.mockRestore(); }
  });
});
