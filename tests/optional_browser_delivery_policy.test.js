import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const builder = require('../dev-tools/build_optional_browser_delivery_policy.cjs');
const source = fs.readFileSync('optional_browser_delivery_policy.js', 'utf8');
const roots = [];
const body = Buffer.from('window.__optionalFixture=true;\n');
const sri = bytes => 'sha384-' + createHash('sha384').update(bytes).digest('base64');
const mirror = 'https://cdn.jsdelivr.net/npm/fixture@1.2.3/index.js';
const remoteOnly = 'https://cdn.jsdelivr.net/npm/fixture-fx@1.2.3/fx.js';
function catalog() { return { schemaVersion: 1, libraries: {
  fixture: { asset: 'vendor/fixture.js', integrity: sri(body), bytes: body.length, mirrors: [{ url: mirror, integrity: sri('different approved bytes'), bytes: 24 }] },
  fx: { asset: null, integrity: null, bytes: null, mirrors: [{ url: remoteOnly, integrity: sri(body), bytes: body.length }] },
} }; }
function factory() { const context = vm.createContext({ URL }); vm.runInContext(source, context); return context._alloCreateOptionalBrowserDeliveryPolicy; }
function policy(input = catalog(), desktop = false, base = 'https://school.example/app/') { return factory()(input, { baseUrl: base, isDesktopBundledApp: desktop }); }
function write(root, relative, data) { const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data); }
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-optional-proof-')); roots.push(root);
  const input = catalog();
  write(root, 'browser_vendor_integrity.json', JSON.stringify(input));
  write(root, 'vendor/fixture.js', body); write(root, 'desktop/web-app/public/vendor/fixture.js', body);
  write(root, 'desktop/web-app/src/App.jsx', 'import React from "react";\n' + builder.buildBlock(input) + '\n');
  const buildDir = path.join(root, 'build');
  write(buildDir, 'vendor/fixture.js', body);
  write(buildDir, 'index.html', '<script src="./static/js/main.1234abcd.js"></script>');
  write(buildDir, 'static/js/main.1234abcd.js', 'window.__optionalDelivery=' + JSON.stringify(builder.policyId(input)) + ';');
  return { root, buildDir };
}
afterEach(() => { while (roots.length) { const root = path.resolve(roots.pop()); if (!root.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(root).startsWith('alloflow-optional-proof-')) throw new Error('Unexpected fixture directory'); fs.rmSync(root, { recursive: true, force: true }); } });

describe('pinned optional browser policy', () => {
  it('sets all security attributes before src and canonicalizes local cache hints', () => {
    const seen = [], script = {};
    Object.defineProperty(script, 'src', { set(value) { seen.push({ value, integrity: this.integrity, crossOrigin: this.crossOrigin, referrerPolicy: this.referrerPolicy }); } });
    policy().configureScript(script, './vendor/fixture.js?v=old', 'fixture');
    expect(seen).toEqual([{ value: 'https://school.example/app/vendor/fixture.js', integrity: sri(body), crossOrigin: 'anonymous', referrerPolicy: 'no-referrer' }]);
  });
  it('retains the independently reviewed digest for each remote candidate', () => {
    const script = {}; policy().configureScript(script, mirror, 'fixture');
    expect(script.integrity).toBe(sri('different approved bytes'));
    expect(script.integrity).not.toBe(sri(body));
  });
  it.each(['https://evil.example/fixture.js', mirror + '?rewrite=1', mirror.replace('@1.2.3', '@latest'), '//cdn.jsdelivr.net/npm/fixture@1.2.3/index.js', './vendor/%66ixture.js', './vendor/../vendor/fixture.js', './vendor/unknown.js'])('denies unapproved URL before assigning src: %s', url => {
    const script = {}; expect(() => policy().configureScript(script, url)).toThrow(); expect(script.src).toBeUndefined();
  });
  it('denies an approved URL used under the wrong library key', () => { expect(() => policy().configureScript({}, mirror, 'fx')).toThrow(); });
  it('snapshots approval records so caller mutation cannot change a selected hash', () => {
    const data = catalog(), selected = policy(data); data.libraries.fixture.integrity = sri('changed'); data.libraries.fixture.mirrors[0].integrity = sri('changed');
    const local = {}, remote = {}; selected.configureScript(local, './vendor/fixture.js'); selected.configureScript(remote, mirror);
    expect(local.integrity).toBe(sri(body)); expect(remote.integrity).toBe(sri('different approved bytes'));
  });
  it.each(['http://127.0.0.1:8123/app/', 'http://[::1]:8123/app/'])('keeps Desktop local, including remote-only libraries: %s', base => {
    const selected = policy(catalog(), true, base);
    expect(selected.sourcesFor('fixture')).toEqual([new URL('vendor/fixture.js', base).href]); expect(selected.sourcesFor('fx')).toEqual([]);
    for (const url of [mirror, remoteOnly, 'https://alloflow-cdn.pages.dev/vendor/fixture.js']) expect(() => selected.configureScript({}, url)).toThrow();
  });
  it.each([
    data => { data.libraries.fixture.extra = true; },
    data => { data.libraries.fixture.integrity = ''; },
    data => { data.libraries.fixture.bytes = 0; },
    data => { data.libraries.fixture.mirrors[0].url = mirror.replace('@1.2.3', '@main'); },
    data => { data.libraries.fixture.mirrors.push(data.libraries.fixture.mirrors[0]); },
    data => { Object.defineProperty(data.libraries.fixture, 'bytes', { get() { throw new Error('getter must not run'); }, enumerable: true }); },
  ])('rejects malformed or mutable approval records', mutate => { const data = catalog(); mutate(data); expect(() => policy(data)).toThrow(); });
  it('checks every actual shipped catalog route and per-URL hash', () => {
    const data = builder.readCatalog(), selected = policy(data);
    for (const [key, library] of Object.entries(data.libraries)) for (const candidate of library.mirrors) { const script = {}; selected.configureScript(script, candidate.url, key); expect(script.integrity).toBe(candidate.integrity); }
    expect(builder.assertVendorAssets().records).toHaveLength(9);
    const unexpectedRevision = catalog(); unexpectedRevision.libraries.fixture.mirrors[0].url = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r129/three.min.js';
    expect(() => policy(unexpectedRevision)).toThrow(/mirror form/);
  });
});

describe('independent optional vendor build gate', () => {
  it('checks source/public/built bytes and the compiled optional policy marker', () => {
    const input = fixture(); expect(builder.assertOptionalHost(input).records).toHaveLength(1);
    write(input.buildDir, 'vendor/fixture.js', Buffer.from(body).fill(1)); expect(() => builder.assertOptionalHost(input)).toThrow(/Built vendor bytes differ/);
  }, 15000);
  it('rejects changed public bytes and stale compiled policy without updating pins', () => {
    const input = fixture(); write(input.buildDir, 'static/js/main.1234abcd.js', 'old compiled app'); expect(() => builder.assertOptionalHost(input)).toThrow(/Compiled optional/);
    write(input.root, 'desktop/web-app/public/vendor/fixture.js', 'changed'); expect(() => builder.assertVendorAssets(input)).toThrow(/Reviewed public vendor/);
  }, 15000);
  it('rejects a modified embedded factory and ambiguous marker pairs', () => {
    const input = fixture(), file = path.join(input.root, 'desktop/web-app/src/App.jsx');
    const original = fs.readFileSync(file, 'utf8'); fs.writeFileSync(file, original.replace('function _alloCreateOptionalBrowserDeliveryPolicy(', 'function _alloModifiedFactory('));
    expect(() => builder.assertOptionalHost(input)).toThrow(/host policy is stale/);
    fs.writeFileSync(file, original + '\n' + builder.END); expect(() => builder.assertOptionalHost(input)).toThrow(/Ambiguous/);
  });
  it('allows only the explicit historical public-only vendor files', () => {
    const input = fixture(); fs.rmSync(path.join(input.root, 'vendor/fixture.js')); expect(() => builder.assertVendorAssets(input)).toThrow();
  });
  it('rejects a directory junction even when its target contains matching approved bytes', () => {
    const input = fixture(), data = catalog(), publicRoot = path.join(input.root, 'desktop/web-app/public');
    fs.symlinkSync(path.join(publicRoot, 'vendor'), path.join(publicRoot, 'vendor-link'), 'junction');
    data.libraries.fixture.asset = 'vendor-link/fixture.js'; write(input.root, 'browser_vendor_integrity.json', JSON.stringify(data));
    expect(() => builder.assertVendorAssets(input)).toThrow(/symbolic link/);
  });
  it('runs the mandatory optional check on the real CLI despite an attempted environment skip', () => {
    const input = fixture(), preload = path.join(input.root, 'isolate-primary-check.cjs');
    // Isolate only the already-tested primary gate. The real optional checker
    // must still reject this incomplete build before postbuild writes anything.
    fs.writeFileSync(preload, 'const Module=require("node:module"),load=Module._load;Module._load=function(name,...args){if(name.endsWith("/build_browser_delivery_manifest.cjs"))return{assertBuiltDelivery(){return{releaseId:"fixture",assetCount:0}}};return load.call(this,name,...args)};');
    const html = fs.readFileSync(path.join(input.buildDir, 'index.html'));
    let failure;
    try { execFileSync(process.execPath, ['--require', preload, path.resolve('desktop/web-app/postbuild.js')], {
      env: { ...process.env, BUILD_PATH: input.buildDir, ALLOFLOW_SKIP_OPTIONAL_BROWSER_DELIVERY: '1' }, timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'],
    }); } catch (error) { failure = error; }
    expect(failure?.status).not.toBe(0); expect(failure?.stderr.toString()).toMatch(/vexflow-5\.0\.0|Reviewed public vendor|Optional vendor host policy/);
    expect(fs.readFileSync(path.join(input.buildDir, 'index.html')).equals(html)).toBe(true);
    expect(fs.existsSync(path.join(input.buildDir, 'sw.js'))).toBe(false);
  }, 30000);
});
