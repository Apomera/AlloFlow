// Uses the shared jsdom setup; multipart operations use Node constructors.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const upload = require('../dev-tools/cf_worker_upload.cjs');
let NodeRequest;
const temporary = [];
const metadata = {
  main_module: 'index.js', compatibility_date: '2026-04-01',
  bindings: [
    { type: 'plain_text', name: 'PUBLIC_SETTING', text: 'preserved' },
    { type: 'kv_namespace', name: 'BUG_REPORTS', namespace_id: 'test-namespace-id' }
  ],
  keep_bindings: ['secret_text']
};

function fixture(files) {
  const directory = mkdtempSync(join(tmpdir(), 'alloflow-worker-upload-'));
  temporary.push(directory);
  for (const [name, content] of Object.entries(files)) {
    const filename = join(directory, name);
    mkdirSync(dirname(filename), { recursive: true });
    writeFileSync(filename, content);
  }
  return directory;
}

async function transmitted(form) {
  // Exercise the actual multipart serialization, including filename/type,
  // instead of checking only the helper's internal module inventory.
  return new NodeRequest('https://worker-upload.test/', { method: 'PUT', body: form }).formData();
}

beforeAll(() => {
  // setup.js requires a DOM, while jsdom's Blob lacks the Node upload APIs.
  // Undici is the existing locked jsdom dependency, not a new runtime package.
  vi.stubGlobal('Blob', NodeBlob);
  vi.stubGlobal('File', NodeFile);
  const undici = require('undici');
  NodeRequest = undici.Request;
  vi.stubGlobal('FormData', undici.FormData);
});

afterAll(() => { vi.unstubAllGlobals(); });

afterEach(() => {
  for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('Cloudflare local ESM multipart upload', () => {
  it('uploads the actual catalog Worker and bug inbox with unchanged metadata and source bytes', async () => {
    const sourceRoot = resolve('catalog/cloudflare-worker/src');
    const before = JSON.stringify(metadata);
    const form = await transmitted(upload.createWorkerUpload(join(sourceRoot, 'index.js'), metadata));
    expect([...form.keys()]).toEqual(['metadata', 'index.js', 'bug_inbox.js', 'bug_review.js']);
    expect(form.get('metadata').type).toBe('application/json');
    expect(JSON.parse(await form.get('metadata').text())).toEqual(metadata);
    for (const name of ['index.js', 'bug_inbox.js', 'bug_review.js']) {
      const part = form.get(name);
      expect(part.name).toBe(name);
      expect(part.type).toBe('application/javascript+module');
      expect(Buffer.from(await part.arrayBuffer())).toEqual(readFileSync(join(sourceRoot, name)));
    }
    expect(JSON.stringify(metadata)).toBe(before);
  });

  it('preserves the previous single-module payload', async () => {
    const source = 'export default { fetch() { return new Response("hello"); } };\r\n';
    const directory = fixture({ 'index.js': source });
    const form = await transmitted(upload.createWorkerUpload(join(directory, 'index.js'), metadata));
    expect([...form.keys()]).toEqual(['metadata', 'index.js']);
    expect(await form.get('index.js').text()).toBe(source);
    expect(JSON.parse(await form.get('metadata').text())).toEqual(metadata);
  });

  it('includes nested imports, re-exports and literal dynamic imports once, with safe cycles and deterministic names', async () => {
    const files = {
      'index.js': [
        "import './a/side.js';",
        "export { value } from './a/reexport.js';",
        "export * from './shared.mjs';",
        "export const later = () => import('./a/lazy.js');",
        '// import "./not-a-dependency.js";',
        'export const text = "import(\'./also-not-a-dependency.js\')";'
      ].join('\n'),
      'a/side.js': "import '../index.js'; import '../a/../shared.mjs';",
      'a/reexport.js': "export { value } from '../shared.mjs';",
      'a/lazy.js': "export { value as loaded } from '../shared.mjs';",
      'shared.mjs': 'export const value = "nested ✓";\r\n'
    };
    const directory = fixture(files);
    const entry = join(directory, 'index.js');
    const uploadForm = upload.createWorkerUpload(entry, metadata);
    const form = await transmitted(uploadForm);
    const expected = ['metadata', 'index.js', 'a/lazy.js', 'a/reexport.js', 'a/side.js', 'shared.mjs'];
    expect([...form.keys()]).toEqual(expected);
    expect([...upload.createWorkerUpload(entry, metadata).keys()]).toEqual(expected);
    for (const [name, source] of Object.entries(files)) {
      expect(uploadForm.get(name).name).toBe(name);
      expect(await form.get(name).text()).toBe(source);
    }
  });

  it.each([
    ["import './missing.js';", /Cannot read Worker module: missing\.js/],
    ["export * from './missing.js';", /Cannot read Worker module: missing\.js/],
    ["import './data.json';", /Unsupported Worker module type/],
    ["import 'some-package';", /Unsupported Worker import/],
    ["import 'https://example.test/module.js';", /Unsupported Worker import/],
    ["export const load = name => import(name);", /Unsupported computed Worker import/],
    ["import '../outside.js';", /leaves the entry directory/],
    ["import './module.js?raw';", /Unsupported Worker import/],
    ['export const broken = ;', /Cannot parse Worker ESM module index\.js/]
  ])('rejects an incomplete or unsupported graph: %s', (source, message) => {
    const directory = fixture({ 'index.js': source, 'data.json': '{}' });
    expect(() => upload.createWorkerUpload(join(directory, 'index.js'), metadata)).toThrow(message);
  });

  it('rejects metadata pointing at an absent entry part', () => {
    const directory = fixture({ 'index.js': 'export default {};' });
    expect(() => upload.createWorkerUpload(join(directory, 'index.js'), { ...metadata, main_module: 'other.js' })).toThrow(/metadata\.main_module must match/);
  });
});

describe('REST deploy dependency validation', () => {
  it.each(["import './missing.js';", 'export const load = name => import(name);'])('fails before reading credentials or calling fetch: %s', async source => {
    const directory = fixture({
      'catalog/cloudflare-worker/src/index.js': source,
      'catalog/cloudflare-worker/wrangler.toml': 'compatibility_date = "2026-04-01"\n'
    });
    let credentialReads = 0;
    const env = new Proxy({}, {
      get(target, key) {
        if (key === 'CLOUDFLARE_API_TOKEN') { credentialReads++; return 'test-token-only'; }
        return undefined;
      }
    });
    const fetch = vi.fn(() => { throw new Error('Network must not be reached'); });
    const exit = vi.fn();
    const errors = [];
    await runInNewContext(readFileSync('dev-tools/cf_worker.cjs', 'utf8'), {
      __dirname: join(directory, 'dev-tools'),
      require: name => name === './cf_worker_upload.cjs' ? upload : require(name),
      process: { argv: ['node', 'cf_worker.cjs', 'deploy', '--yes'], env, exit },
      console: { log: noop, error: message => errors.push(message) },
      Blob, FormData, fetch
    });
    expect(exit).toHaveBeenCalledWith(1);
    expect(errors.join('\n')).toMatch(/Cannot read Worker module|Unsupported computed Worker import/);
    expect(credentialReads).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });
});

function noop() {}
