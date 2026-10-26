import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { Blob } from 'node:buffer';
import { webcrypto } from 'node:crypto';
import { TextDecoder } from 'node:util';
import { URL } from 'node:url';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const runtime = require(resolve('dev-tools/build_runtime_graph_delivery_policy.cjs'));
const { minify } = require(resolve('desktop/web-app/node_modules/terser'));
let compiled, expectedId;

beforeAll(async () => {
  const manifest = runtime.readManifest();
  expectedId = runtime.policyId(manifest);
  const result = await minify(runtime.buildBlock(manifest), {
    module: true, toplevel: true,
    compress: { dead_code: true, unused: true, passes: 2 },
    mangle: true, format: { comments: false },
  });
  if (!result.code) throw new Error('Terser did not produce a runtime block');
  compiled = result.code;
});

function documentFixture() {
  const attributes = new Map();
  const setAttribute = vi.fn((name, value) => attributes.set(name, value));
  return { document: { documentElement: { setAttribute } }, attributes, setAttribute };
}

function browserContext(document) {
  const window = {
    document, location: new URL('https://school.example/app/'),
    fetch: vi.fn(() => Promise.reject(new Error('Unexpected network request'))),
    crypto: webcrypto, Blob, URL, TextDecoder, AbortController,
    Worker: vi.fn(), setTimeout, clearTimeout,
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
  };
  return { window, context: vm.createContext({ window, document, URL, Blob, TextDecoder, AbortController }) };
}

describe('the generated runtime identity survives production optimization', () => {
  it('retains the reviewed ID and publishes it after real runtime initialization', () => {
    const doc = documentFixture();
    const { window, context } = browserContext(doc.document);
    expect(compiled).toContain(expectedId);
    vm.runInContext(compiled, context, { timeout: 20000 });
    expect(doc.setAttribute).toHaveBeenCalledTimes(1);
    expect(doc.setAttribute).toHaveBeenCalledWith('data-alloflow-runtime-graph-policy', expectedId);
    expect(doc.attributes.get('data-alloflow-runtime-graph-policy')).toBe(expectedId);
    expect(window.__alloLoadVerifiedRuntime).toBeTypeOf('function');
    expect(window.fetch).not.toHaveBeenCalled();
  });

  it('does not claim initialization when the browser host is absent', () => {
    const doc = documentFixture();
    const context = vm.createContext({ document: doc.document, URL });
    expect(() => vm.runInContext(compiled, context, { timeout: 20000 })).not.toThrow();
    expect(doc.setAttribute).not.toHaveBeenCalled();
  });

  it('also executes safely without a browser window or document', () => {
    const context = vm.createContext({ URL });
    expect(() => vm.runInContext(compiled, context, { timeout: 20000 })).not.toThrow();
  });

  it.each([null, {}, { documentElement: {} }])('tolerates a partial document: %j', document => {
    const { window, context } = browserContext(document);
    expect(() => vm.runInContext(compiled, context, { timeout: 20000 })).not.toThrow();
    expect(window.__alloLoadVerifiedRuntime).toBeTypeOf('function');
    expect(window.fetch).not.toHaveBeenCalled();
  });

  it('keeps executable authority in the lexical policy after the diagnostic value is changed', async () => {
    const doc = documentFixture();
    const { window, context } = browserContext(doc.document);
    vm.runInContext(compiled, context, { timeout: 20000 });
    doc.attributes.set('data-alloflow-runtime-graph-policy', 'forged-diagnostic');
    await expect(Promise.resolve().then(() => window.__alloFetchTrustedScriptText('https://unapproved.example/script.js', 'axe-core'))).rejects.toThrow();
    expect(window.fetch).not.toHaveBeenCalled();
    expect(doc.attributes.get('data-alloflow-runtime-graph-policy')).toBe('forged-diagnostic');
  });
});
