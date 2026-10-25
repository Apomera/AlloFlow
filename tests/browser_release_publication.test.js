import { afterEach, describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { postbuild, assertReleaseDigests } = require('../desktop/web-app/postbuild.js');
const primary = require('../dev-tools/build_browser_delivery_manifest.cjs');
const optional = require('../dev-tools/build_optional_browser_delivery_policy.cjs');
const source = fs.readFileSync('build.js', 'utf8');
const start = source.indexOf('function publishStudentShell() {');
const end = source.indexOf('// ── CDN base', start);
const roots = [];

afterEach(() => {
  while (roots.length) {
    const root = roots.pop();
    if (!root.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(root).startsWith('alloflow-release-copy-')) throw new Error('Unexpected fixture path');
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-release-copy-'));
  roots.push(root);
  const build = path.join(root, 'build'), output = path.join(root, 'public/app'), cdn = path.join(root, 'app');
  const write = (relative, bytes) => { const file = path.join(build, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); };
  write('index.html', '<html><head><script>navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });</script><script defer src="/static/js/main.1234abcd.js"></script><link rel="stylesheet" href="/static/css/main.5678abcd.css"></head><body><div id="root"></div><!--' + 'fixture'.repeat(200) + '--></body></html>');
  write('static/js/main.1234abcd.js', 'window.__releaseFixture = true;');
  write('static/js/2.1234abcd.chunk.js', 'window.__lazyReleaseFixture = true;');
  write('static/css/main.5678abcd.css', 'body { color: #111; }');
  write('alloflow_desktop_bridge.js', 'window.__bridgeFixture = true;');
  write('alloflow_update.js', 'window.__updateFixture = true;');
  const fixtureBody = 'window.__dynamicFixture = true;\n';
  const assetNames = [...primary.EXTRA_BOOT_ASSETS, 'host_module.js', 'vendor/fixture.js'];
  for (const name of assetNames) for (const directory of [root, path.join(root, 'desktop/web-app/public'), build]) {
    const file = path.join(directory, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, fixtureBody);
  }
  fs.writeFileSync(path.join(root, 'build.js'), "const MODULES = [\n {name: 'Host', filename: 'host_module.js'},\n];\nconst PLUGIN_FILES = [\n];\nconst COMPANION_ASSET_DIRS = [\n];\n");
  const primaryManifest = primary.buildManifest({ root });
  const catalog = { schemaVersion: 1, libraries: { fixture: { asset: 'vendor/fixture.js', integrity: 'sha384-' + createHash('sha384').update(fixtureBody).digest('base64'), bytes: Buffer.byteLength(fixtureBody), mirrors: [] } } };
  fs.writeFileSync(path.join(root, 'browser_vendor_integrity.json'), JSON.stringify(catalog));
  const hostFile = path.join(root, 'desktop/web-app/src/App.jsx'); fs.mkdirSync(path.dirname(hostFile), { recursive: true });
  fs.writeFileSync(hostFile, 'import React from "react";\n' + primary.buildHostBlock(primaryManifest) + '\n' + optional.buildBlock(catalog));
  fs.appendFileSync(path.join(build, 'static/js/main.1234abcd.js'), '\nwindow.__primaryMarker=' + JSON.stringify(primaryManifest.releaseId) + ';window.__optionalMarker=' + JSON.stringify(optional.policyId(catalog)) + ';');
  postbuild({ buildDir: build, templateDir: path.resolve('desktop/web-app/public'), deliveryRoot: root, optionalDeliveryRoot: root, now: () => 1234 });
  const context = vm.createContext({
    fs, path, ROOT: root, console: { log() {} },
    require: name => { if (name !== './desktop/web-app/postbuild.js') throw new Error('Unexpected require'); return { assertReleaseDigests }; },
    assertBuiltDelivery: primary.assertBuiltDelivery, assertOptionalHost: optional.assertOptionalHost,
    // This legacy publication fixture has no runtime graphs. Actual graph
    // verification is covered separately; retain the required verifier calls.
    assertRuntimeHost: () => ({ records: [] }), assertRuntimeAssets: () => ({ records: [] }),
    STUDENT_SHELL_BUILD_DIR: build, STUDENT_SHELL_PUBLIC_DIR: output, STUDENT_SHELL_CDN_DIR: cdn,
    STUDENT_SHELL_ENTRIES: ['index.html', 'sw.js', 'static', 'alloflow_desktop_bridge.js', 'alloflow_update.js', 'vendor/fixture.js'],
    CLOUDFLARE_MAX_FILE_BYTES: 25 * 1024 * 1024, Buffer,
  });
  if (start < 0 || end < start) throw new Error('Actual publication function missing');
  vm.runInContext(source.slice(start, end) + '\nthis.publish = publishStudentShell;', context);
  return { root, build, output, cdn, publish: context.publish };
}

describe('final student release publication', () => {
  it('copies the approved HTML unchanged and preserves verified worker digests in both outputs', () => {
    const f = fixture();
    const original = fs.readFileSync(path.join(f.build, 'index.html'));
    f.publish();
    for (const directory of [f.output, f.cdn]) {
      expect(fs.readFileSync(path.join(directory, 'index.html')).equals(original)).toBe(true);
      expect(assertReleaseDigests(directory).checkedFiles).toBeGreaterThan(3);
      expect(fs.readFileSync(path.join(directory, 'sw.js'), 'utf8')).toContain("const CACHE_NAME = 'alloflow-student-shell-v");
    }
  });

  it('rejects an altered built script before replacing the existing public release', () => {
    const f = fixture();
    fs.mkdirSync(f.output, { recursive: true });
    fs.writeFileSync(path.join(f.output, 'previous-release.txt'), 'keep existing release');
    fs.appendFileSync(path.join(f.build, 'static/js/main.1234abcd.js'), 'window.__altered = true;');
    expect(f.publish).toThrow(/bytes differ|SRI does not match/);
    expect(fs.readFileSync(path.join(f.output, 'previous-release.txt'), 'utf8')).toBe('keep existing release');
  });

  it('rejects a source-module change after compilation before replacing the existing public release', () => {
    const f = fixture();
    fs.mkdirSync(f.output, { recursive: true }); fs.writeFileSync(path.join(f.output, 'previous-release.txt'), 'keep existing release');
    for (const directory of [f.root, path.join(f.root, 'desktop/web-app/public')]) fs.appendFileSync(path.join(directory, 'host_module.js'), 'window.__laterChange=true;');
    expect(f.publish).toThrow(/stale for current root\/public bytes/);
    expect(fs.readFileSync(path.join(f.output, 'previous-release.txt'), 'utf8')).toBe('keep existing release');
  });
});
