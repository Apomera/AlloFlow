import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const builder = require('../dev-tools/build_browser_delivery_manifest.cjs');
const { postbuild, normalizeShellHtml, assertReleaseDigests } = require('../desktop/web-app/postbuild.js');
const { patchDesktopHtml } = require('../desktop/scripts/build-desktop-web.cjs');
const policySource = fs.readFileSync(path.resolve('browser_delivery_policy.js'), 'utf8');
const created = [];
const COMMIT = '1'.repeat(40);
const DIGEST = 'sha384-' + Buffer.alloc(48, 7).toString('base64');

afterEach(() => {
  while (created.length) fs.rmSync(created.pop(), { recursive: true, force: true });
});

function factory() {
  const context = vm.createContext({ URL });
  vm.runInContext(policySource, context);
  return context._alloCreateBrowserDeliveryPolicy;
}

function manifest(overrides = {}) {
  return {
    schemaVersion: 1,
    releaseId: 'a'.repeat(64),
    assets: {
      'host_module.js': { integrity: DIGEST, bytes: 100 },
      'stem_lab/stem_tool_test.js': { integrity: DIGEST, bytes: 200 },
    },
    fallbackCommit: null,
    allowDesktopRemoteFallback: false,
    ...overrides,
  };
}

function policy(input = manifest(), settings = {}) {
  return factory()(input, { baseUrl: 'https://alloflow.example/app/index.html', ...settings });
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-delivery-'));
  created.push(root);
  const publicRoot = path.join(root, 'desktop', 'web-app', 'public');
  const assets = ['host_module.js', 'stem_lab/stem_tool_test.js'];
  for (const name of assets) {
    for (const base of [root, publicRoot]) {
      const target = path.join(base, name);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, `window.__deliverySentinel = ${JSON.stringify(name)};\n`);
    }
  }
  return { root, publicRoot, assets };
}

function deliveryFixture() {
  const input = fixture();
  input.assets.push(...builder.EXTRA_BOOT_ASSETS);
  for (const name of builder.EXTRA_BOOT_ASSETS) {
    for (const base of [input.root, input.publicRoot]) {
      fs.mkdirSync(path.dirname(path.join(base, name)), { recursive: true });
      fs.writeFileSync(path.join(base, name), 'window.__fixtureBoot = true;\n');
    }
  }
  fs.writeFileSync(path.join(input.root, 'build.js'), "const MODULES = [\n {name:'Host',filename:'host_module.js'},\n];\nconst PLUGIN_FILES = [\n 'stem_lab/stem_tool_test.js',\n];\nconst COMPANION_ASSET_DIRS = [\n 'stem_lab',\n];\n");
  input.buildDir = path.join(input.root, 'compiled');
  fs.mkdirSync(input.buildDir);
  for (const name of input.assets) {
    const target = path.join(input.buildDir, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(input.root, name), target);
  }
  input.hostFile = 'desktop/web-app/src/App.jsx';
  fs.mkdirSync(path.join(input.root, 'desktop/web-app/src'), { recursive: true });
  const refresh = () => {
    const approved = builder.buildManifest({ root: input.root });
    fs.writeFileSync(path.join(input.root, input.hostFile), builder.buildHostBlock(approved) + '\nconst App = null;\n');
    fs.mkdirSync(path.join(input.buildDir, 'static/js'), { recursive: true });
    fs.mkdirSync(path.join(input.buildDir, 'static/css'), { recursive: true });
    fs.writeFileSync(path.join(input.buildDir, 'static/js/main.1234abcd.js'), 'window.__deliveryRelease = ' + JSON.stringify(approved.releaseId) + ';\n');
    fs.writeFileSync(path.join(input.buildDir, 'static/css/main.1234abcd.css'), 'body{color:black}\n');
    fs.writeFileSync(path.join(input.buildDir, 'index.html'), '<html><head><link rel="stylesheet" href="/static/css/main.1234abcd.css"><script>navigator.serviceWorker.register("/sw.js", {updateViaCache:"none"});</script><script src="/static/js/main.1234abcd.js"></script></head><body></body></html>');
    return approved;
  };
  input.refresh = refresh;
  input.manifest = refresh();
  return input;
}

describe('trusted first-party script delivery policy', () => {
  it('sets browser-enforced SRI and CORS before assigning the executable URL', () => {
    const script = {};
    const snapshots = [];
    Object.defineProperty(script, 'src', { set(value) { snapshots.push({ value, integrity: this.integrity, crossOrigin: this.crossOrigin, referrerPolicy: this.referrerPolicy }); } });
    expect(policy().configureScript(script, 'https://alloflow-cdn.pages.dev/host_module.js?v=release&retry=1')).toBe(script);
    expect(snapshots).toEqual([{ value: 'https://alloflow-cdn.pages.dev/host_module.js?v=release&retry=1', integrity: DIGEST, crossOrigin: 'anonymous', referrerPolicy: 'no-referrer' }]);
  });

  it.each([
    ['http://127.0.0.1:8123/app/index.html', true, './host_module.js?v=1', 'http://127.0.0.1:8123/app/host_module.js?v=1'],
    ['http://localhost:3000/', false, './stem_lab/stem_tool_test.js', 'http://localhost:3000/stem_lab/stem_tool_test.js'],
    ['https://alloflow.example/app/', false, './host_module.js', 'https://alloflow.example/app/host_module.js'],
  ])('preserves bundled, development, and hosted relative paths at %s', (baseUrl, isDesktopBundledApp, url, expected) => {
    const script = {};
    policy(manifest(), { baseUrl, isDesktopBundledApp, usesLocalModuleAssets: true }).configureScript(script, url);
    expect(script.src).toBe(expected);
    expect(script.integrity).toBe(DIGEST);
  });

  it.each([
    'https://evil.example/host_module.js',
    'https://alloflow-cdn.pages.dev.evil.example/host_module.js',
    'https://alloflow-cdn.pages.dev:444/host_module.js',
    'http://alloflow-cdn.pages.dev/host_module.js',
    'https://user@alloflow-cdn.pages.dev/host_module.js',
    'https://raw.githubusercontent.com/Apomera/AlloFlow/main/host_module.js',
    'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@latest/host_module.js',
    'https://cdn.jsdelivr.net/gh/Other/AlloFlow@' + COMMIT + '/host_module.js',
    'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@' + '2'.repeat(40) + '/host_module.js',
    'https://alloflow-cdn.pages.dev/unknown_module.js',
    './stem_lab/../host_module.js',
    './stem_lab/%2e%2e/host_module.js',
    './stem_lab//stem_tool_test.js',
    './host_module.js#fragment',
    './host_module.js\n',
    '//alloflow-cdn.pages.dev/host_module.js',
    'javascript:window.__deliverySentinel=1',
    'data:text/javascript,window.__deliverySentinel=1',
  ])('rejects unapproved URL before assigning src: %s', (url) => {
    let assignments = 0;
    const script = {};
    Object.defineProperty(script, 'src', { set() { assignments += 1; } });
    expect(() => policy(manifest({ fallbackCommit: COMMIT })).configureScript(script, url)).toThrow(/Browser delivery policy/);
    expect(assignments).toBe(0);
    expect(script.integrity).toBeUndefined();
  });

  it('only creates fallbacks at the reviewed full commit and for the same asset', () => {
    const configured = policy(manifest({ fallbackCommit: COMMIT }));
    const fallback = configured.fallbackUrl('https://alloflow-cdn.pages.dev/stem_lab/stem_tool_test.js?v=old');
    expect(fallback).toBe(`https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@${COMMIT}/stem_lab/stem_tool_test.js`);
    const script = {};
    configured.configureScript(script, fallback);
    expect(script.integrity).toBe(DIGEST);
    expect(configured.fallbackUrl(fallback)).toBeNull();
    expect(configured.fallbackUrl('https://evil.example/host_module.js')).toBeNull();
    expect(policy().fallbackUrl('./host_module.js')).toBeNull();
    configured.configureScript({}, `https://raw.githubusercontent.com/Apomera/AlloFlow/${COMMIT}/host_module.js`);
  });

  it('keeps desktop fully local even with a valid reviewed fallback commit', () => {
    const configured = policy(manifest({ fallbackCommit: COMMIT }), { baseUrl: 'http://127.0.0.1:8181/app/', isDesktopBundledApp: true, usesLocalModuleAssets: true });
    configured.configureScript({}, './host_module.js');
    expect(configured.fallbackUrl('./host_module.js')).toBeNull();
    expect(() => configured.configureScript({}, 'https://alloflow-cdn.pages.dev/host_module.js')).toThrow(/desktop remote/);
    expect(() => configured.configureScript({}, `https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@${COMMIT}/host_module.js`)).toThrow(/desktop remote/);
    expect(() => policy(manifest(), { isDesktopBundledApp: true, usesLocalModuleAssets: true })).toThrow(/local bundled base/);
  });

  it('cannot use a mutable GitHub/CDN base to bypass immutable ref restrictions', () => {
    for (const baseUrl of ['https://raw.githubusercontent.com/Apomera/AlloFlow/main/', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@main/']) {
      const configured = policy(manifest({ fallbackCommit: COMMIT }), { baseUrl });
      expect(() => configured.configureScript({}, './host_module.js')).toThrow(/reviewed manifest/);
    }
  });

  it('snapshots caller data and settings and exposes no mutable relaxation switch', () => {
    const input = manifest({ fallbackCommit: COMMIT });
    const options = { baseUrl: 'http://localhost:3000/', usesLocalModuleAssets: true };
    const configured = policy(input, options);
    input.assets.host_module = { integrity: 'bad', bytes: 1 };
    input.assets['host_module.js'].integrity = 'sha384-' + 'A'.repeat(64);
    input.assets['unknown_module.js'] = { integrity: DIGEST, bytes: 1 };
    input.fallbackCommit = '2'.repeat(40);
    options.baseUrl = 'https://evil.example/';
    const script = {};
    configured.configureScript(script, './host_module.js');
    expect(script.integrity).toBe(DIGEST);
    expect(script.src).toBe('http://localhost:3000/host_module.js');
    expect(configured.fallbackUrl('./host_module.js')).toContain(COMMIT);
    expect(Object.isFrozen(configured)).toBe(true);
    expect(() => configured.configureScript({}, './unknown_module.js')).toThrow(/reviewed manifest/);
  });

  it.each([
    null,
    manifest({ schemaVersion: 2 }),
    manifest({ releaseId: 'short' }),
    manifest({ fallbackCommit: 'main' }),
    manifest({ allowDesktopRemoteFallback: true }),
    manifest({ assets: {} }),
    manifest({ assets: { '../host_module.js': { integrity: DIGEST, bytes: 1 } } }),
    manifest({ assets: { 'host_module.js': { integrity: 'sha256-unreviewed', bytes: 1 } } }),
    manifest({ assets: { 'host_module.js': { integrity: DIGEST, bytes: 0 } } }),
    manifest({ assets: { 'host_module.js': { integrity: DIGEST, bytes: 64 * 1024 * 1024 + 1 } } }),
    manifest({ assets: { 'host_module.js': { integrity: DIGEST, bytes: 1, url: 'https://evil.example' } } }),
  ])('fails closed for a missing or invalid manifest', (input) => {
    expect(() => policy(input)).toThrow(/Browser delivery policy/);
  });

  it('rejects manifest accessors rather than reading mutable getters', () => {
    const input = manifest();
    Object.defineProperty(input.assets['host_module.js'], 'integrity', { get() { throw new Error('getter executed'); }, enumerable: true });
    expect(() => policy(input)).toThrow(/must not contain accessors/);
  });
});

describe('deterministic delivery manifest builder', () => {
  it('hashes exact approved root/public bytes and produces deterministic embedded frozen data', () => {
    const input = fixture();
    const first = builder.buildManifest(input);
    const second = builder.buildManifest({ ...input, assets: [...input.assets].reverse() });
    expect(first).toEqual(second);
    expect(first.fallbackCommit).toBeNull();
    expect(first.allowDesktopRemoteFallback).toBe(false);
    const source = fs.readFileSync(path.join(input.root, 'host_module.js'));
    expect(first.assets['host_module.js']).toEqual({ integrity: 'sha384-' + createHash('sha384').update(source).digest('base64'), bytes: source.length });
    const block = builder.buildHostBlock(first);
    const context = vm.createContext({ URL });
    vm.runInContext(block + '\nthis.embedded = _alloBrowserDeliveryManifest; this.policy = _alloCreateBrowserDeliveryPolicy(_alloBrowserDeliveryManifest, {baseUrl:"https://alloflow.example/"});', context);
    expect(Object.isFrozen(context.embedded)).toBe(true);
    expect(Object.isFrozen(context.embedded.assets)).toBe(true);
    expect(Object.isFrozen(context.embedded.assets['host_module.js'])).toBe(true);
    const script = {};
    context.policy.configureScript(script, './host_module.js');
    expect(script.integrity).toBe(first.assets['host_module.js'].integrity);
    expect(block).toContain(builder.BEGIN_MARKER);
    expect(block).not.toMatch(/\beval\s*\(|new Function|Date\.now|fetch\s*\(/);
  });

  it('rejects mirror drift and changes the release identity when approved bytes change', () => {
    const input = fixture();
    const before = builder.buildManifest(input);
    const replacement = 'window.__deliverySentinel = "changed";\n';
    fs.writeFileSync(path.join(input.root, input.assets[0]), replacement);
    expect(() => builder.buildManifest(input)).toThrow(/Root\/public asset bytes differ/);
    fs.writeFileSync(path.join(input.publicRoot, input.assets[0]), replacement);
    expect(builder.buildManifest(input).releaseId).not.toBe(before.releaseId);
    fs.rmSync(path.join(input.publicRoot, input.assets[0]));
    expect(() => builder.buildManifest(input)).toThrow();
  });

  it('enables a fallback only after byte-exact git object proof, including dirty worktree and newline mismatches', () => {
    const input = fixture();
    const git = (...args) => execFileSync('git', args, { cwd: input.root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    git('init', '-q');
    fs.writeFileSync(path.join(input.root, '.gitattributes'), '* text=auto eol=lf\n');
    git('add', '.');
    git('-c', 'user.name=AlloFlow Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture');
    const commit = git('rev-parse', 'HEAD');
    expect(builder.buildManifest({ ...input, fallbackCommit: commit }).fallbackCommit).toBe(commit);
    for (const base of [input.root, input.publicRoot]) fs.writeFileSync(path.join(base, input.assets[0]), 'window.__deliverySentinel = "dirty";\r\n');
    expect(() => builder.buildManifest({ ...input, fallbackCommit: commit })).toThrow(/Fallback commit bytes differ/);
    expect(() => builder.buildManifest({ ...input, fallbackCommit: commit.slice(0, 8) })).toThrow(/explicit full/);
    expect(() => builder.buildManifest({ ...input, fallbackCommit: 'f'.repeat(40) })).toThrow(/not available/);
  }, 60000);

  it('rejects stale or forged manifest identities and replaces exactly one host block', () => {
    const approved = builder.buildManifest(fixture());
    const block = builder.buildHostBlock(approved);
    expect(() => builder.buildHostBlock({ ...approved, releaseId: '0'.repeat(64) })).toThrow(/releaseId/);
    const host = `before\n${builder.BEGIN_MARKER}\nstale\n${builder.END_MARKER}\nafter`;
    expect(builder.replaceHostBlock(host, block)).toBe(`before\n${block}\nafter`);
    expect(builder.replaceHostBlock('before\nconst ALLO_MB_SCRIPT_VERSION = 25;\nafter', block)).toBe(`before\n${block}\n\nconst ALLO_MB_SCRIPT_VERSION = 25;\nafter`);
    expect(() => builder.replaceHostBlock('unmarked host', block)).toThrow(/exactly one/);
    expect(() => builder.replaceHostBlock(host + '\n' + builder.END_MARKER, block)).toThrow(/exactly one/);
  });

  it('discovers static build plugins, root modules/loaders and mirrored companion scripts without executing build.js', () => {
    const input = fixture();
    fs.writeFileSync(path.join(input.root, 'build.js'), "throw new Error('must never execute');\nconst MODULES = [\n { name: 'Host', filename: 'host_module.js' },\n { name: 'Required', filename: 'required_module.js' },\n];\nconst PLUGIN_FILES = [\n 'stem_lab/stem_tool_test.js', // actual first-party plugin\n 'ignored.json',\n];\nconst COMPANION_ASSET_DIRS = [\n 'stem_lab',\n];\n");
    fs.writeFileSync(path.join(input.root, 'piper_tts_loader.js'), 'loader');
    fs.writeFileSync(path.join(input.root, 'test_source.js'), 'source');
    fs.writeFileSync(path.join(input.root, 'unshipped_module.js'), 'unshipped');
    fs.mkdirSync(input.publicRoot, { recursive: true });
    fs.writeFileSync(path.join(input.publicRoot, 'piper_tts_loader.js'), 'loader');
    for (const name of ['companion.js', 'root_only.js']) fs.writeFileSync(path.join(input.root, 'stem_lab', name), name);
    fs.writeFileSync(path.join(input.publicRoot, 'stem_lab', 'companion.js'), 'companion.js');
    const selected = builder.discoverAssets(input.root);
    expect(selected).toEqual(expect.arrayContaining([...input.assets, 'piper_tts_loader.js', 'stem_lab/companion.js', 'qrcode.js', 'ui_strings.js', 'concept_quest_engine.js']));
    expect(selected).not.toContain('test_source.js');
    expect(selected).not.toContain('unshipped_module.js');
    expect(selected).toContain('required_module.js');
    expect(selected).not.toContain('stem_lab/root_only.js');
    expect(selected).not.toContain('ignored.json');
  });
});

describe('final built application delivery gate', () => {
  it('accepts matching trusted source, public mirrors, compiled identity and delivered asset bytes', () => {
    const input = deliveryFixture();
    expect(builder.assertHostCurrent(input).releaseId).toBe(input.manifest.releaseId);
    expect(builder.assertBuiltDelivery(input)).toEqual({ releaseId: input.manifest.releaseId, assetCount: input.assets.length });
  });

  it('rejects same-size built-module tampering and omitted copied modules', () => {
    const input = deliveryFixture();
    const file = path.join(input.buildDir, 'host_module.js');
    const original = fs.readFileSync(file);
    const changed = Buffer.from(original);
    changed[0] ^= 1;
    fs.writeFileSync(file, changed);
    expect(() => builder.assertBuiltDelivery(input)).toThrow(/Built asset bytes differ.*host_module/);
    fs.writeFileSync(file, original);
    fs.rmSync(path.join(input.buildDir, 'stem_lab/stem_tool_test.js'));
    expect(() => builder.assertBuiltDelivery(input)).toThrow(/Missing built delivery asset/);
  }, 30000);

  it('rejects stale embedded pins after newline conversion and accepts only a fresh checkout-byte regeneration', () => {
    const input = deliveryFixture();
    for (const base of [input.root, input.publicRoot, input.buildDir]) {
      const file = path.join(base, 'host_module.js');
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\n/g, '\r\n'));
    }
    input.refresh();
    const crlfIdentity = builder.assertBuiltDelivery(input).releaseId;
    for (const base of [input.root, input.publicRoot, input.buildDir]) {
      const file = path.join(base, 'host_module.js');
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
    }
    expect(() => builder.assertBuiltDelivery(input)).toThrow(/manifest is stale.*root\/public bytes/);
    const lf = input.refresh();
    expect(lf.releaseId).not.toBe(crlfIdentity);
    expect(builder.assertBuiltDelivery(input).releaseId).toBe(lf.releaseId);
  });

  it('rejects stale or duplicated compiled main scripts even when dynamic copies are current', () => {
    const input = deliveryFixture();
    const file = path.join(input.buildDir, 'static/js/main.1234abcd.js');
    fs.writeFileSync(file, 'window.__deliveryRelease = "old compiled policy";');
    expect(() => builder.assertBuiltDelivery(input)).toThrow(/main script does not contain.*identity/);
    input.refresh();
    fs.appendFileSync(path.join(input.buildDir, 'index.html'), '<script src="./static/js/main.1234abcd.js"></script>');
    expect(() => builder.assertBuiltDelivery(input)).toThrow(/exactly one.*main script/);
  });

  it('rejects modified host policy code and manifest expressions without executing them', () => {
    const input = deliveryFixture();
    const file = path.join(input.root, input.hostFile);
    const host = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, host.replace("script.crossOrigin = 'anonymous';", "script.crossOrigin = 'use-credentials';"));
    expect(() => builder.assertBuiltDelivery(input)).toThrow(/block is stale or modified/);
    const expression = host.replace(/  const manifest = [^\n]+;/, '  const manifest = (() => { throw new Error("executed untrusted expression"); })();');
    expect(() => builder.readEmbeddedManifest(expression)).toThrow(/manifest is not JSON/);
  });

  it('stamps a validated fixture only after relative scoped normalization and keeps staging idempotent', () => {
    const input = deliveryFixture();
    fs.writeFileSync(path.join(input.publicRoot, 'sw.js'), fs.readFileSync('desktop/web-app/public/sw.js'));
    fs.writeFileSync(path.join(input.publicRoot, 'alloflow_desktop_bridge.js'), 'window.__fixtureBridge=true;');
    fs.writeFileSync(path.join(input.publicRoot, 'alloflow_update.js'), 'window.__fixtureUpdate=true;');
    const result = postbuild({ buildDir: input.buildDir, templateDir: input.publicRoot, deliveryRoot: input.root, deliveryHostFile: input.hostFile, now: () => 1234 });
    expect(result.deliveryValidated).toBe(true);
    expect(result.deliveryReleaseId).toBe(input.manifest.releaseId);
    const htmlFile = path.join(input.buildDir, 'index.html');
    const html = fs.readFileSync(htmlFile, 'utf8');
    expect(html).toContain("navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })");
    expect(normalizeShellHtml(html)).toBe(html);
    patchDesktopHtml(input.buildDir, { assertUnchanged: true });
    expect(fs.readFileSync(htmlFile, 'utf8')).toBe(html);
    expect(() => assertReleaseDigests(input.buildDir)).not.toThrow();
    fs.writeFileSync(htmlFile, html.replace("scope: './'", "scope: '/'"));
    expect(() => patchDesktopHtml(input.buildDir, { assertUnchanged: true })).toThrow(/unsupported shell options/);
    expect(() => assertReleaseDigests(input.buildDir)).toThrow();
  });

  it('does not stamp or rewrite an artifact after a delivery mismatch', () => {
    const input = deliveryFixture();
    const before = fs.readFileSync(path.join(input.buildDir, 'index.html'));
    fs.writeFileSync(path.join(input.buildDir, 'host_module.js'), 'unreviewed');
    expect(() => postbuild({ buildDir: input.buildDir, templateDir: input.publicRoot, deliveryRoot: input.root, deliveryHostFile: input.hostFile })).toThrow(/Built asset bytes differ/);
    expect(fs.readFileSync(path.join(input.buildDir, 'index.html'))).toEqual(before);
    expect(fs.existsSync(path.join(input.buildDir, 'sw.js'))).toBe(false);
  });

  it('enforces delivery validation on the real default CLI path even for an isolated BUILD_PATH', () => {
    const source = fs.readFileSync('desktop/web-app/postbuild.js', 'utf8');
    const module = { exports: {} };
    let seen;
    const cliRequire = (name) => name === '../../dev-tools/build_browser_delivery_manifest.cjs'
      ? { assertBuiltDelivery(input) { seen = input; throw new Error('required default delivery gate'); } }
      : require(name);
    cliRequire.main = module;
    expect(() => vm.runInNewContext(source, {
      require: cliRequire, module, __dirname: path.resolve('desktop/web-app'), console,
      process: { env: { BUILD_PATH: 'isolated-fixture-build', ALLOFLOW_SKIP_DELIVERY_CHECK: '1' } },
    })).toThrow(/required default delivery gate/);
    expect(seen.buildDir).toBe(path.resolve('desktop/web-app/isolated-fixture-build'));
    expect(seen.hostFile).toBe('desktop/web-app/src/App.jsx');
  });
});
