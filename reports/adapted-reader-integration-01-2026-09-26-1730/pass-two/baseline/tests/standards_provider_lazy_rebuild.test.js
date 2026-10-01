/**
 * Boot-performance pins for the 2026-08-23 perf pass.
 *
 * Three 2-5 MB standards snapshots register during app boot. The provider
 * used to build a full throwaway search index per registration (validation)
 * plus an eager union rebuild per registration: ~1s of main-thread work at 1x
 * CPU, one of the largest boot long tasks. Registration now validates cheaply
 * and marks the union dirty; the expensive build runs once, lazily (idle
 * callback or first getRegisteredProvider call). These tests pin the lazy
 * contract functionally and the perf-critical source shapes textually, along
 * with the audio-bank deferral (ANTI) and the service worker's cache-first
 * handling of version-pinned module URLs.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require2 = createRequire(import.meta.url);
const ROOT = process.cwd();
const PROVIDER_PATH = resolve(ROOT, 'standards_provider_module.js');
const SNAPSHOT_PATH = resolve(ROOT, 'standards_snapshots', 'ma-science-grade-5.js');

function loadFreshSnapshotObject() {
  // Force the snapshot file down its no-provider path so we can capture the
  // raw snapshot object it pushes into the injection array.
  delete require2.cache[require2.resolve(SNAPSHOT_PATH)];
  const holder = globalThis;
  const savedModules = holder.AlloModules;
  const savedArray = holder.__ALLO_LOCAL_STANDARDS_SNAPSHOTS__;
  holder.AlloModules = {};
  holder.__ALLO_LOCAL_STANDARDS_SNAPSHOTS__ = [];
  require2(SNAPSHOT_PATH);
  const snapshot = holder.__ALLO_LOCAL_STANDARDS_SNAPSHOTS__[0];
  holder.AlloModules = savedModules;
  holder.__ALLO_LOCAL_STANDARDS_SNAPSHOTS__ = savedArray;
  return snapshot;
}

const sp = require2(PROVIDER_PATH);
const RAW_SNAPSHOT = loadFreshSnapshotObject();

describe('standards provider lazy union rebuild', () => {
  beforeEach(() => {
    sp.clearRegisteredProvider();
  });

  it('registration returns null and defers the union build to first use', () => {
    const returned = sp.registerLocalSnapshot(RAW_SNAPSHOT);
    expect(returned).toBeNull();
    expect(sp.getRegisteredSnapshotManifests()).toHaveLength(1);
    const provider = sp.getRegisteredProvider();
    expect(provider).toBeTruthy();
    const hits = provider.searchStandards(RAW_SNAPSHOT.standards[0].label);
    expect(hits.matches.length).toBeGreaterThan(0);
  });

  it('unions two snapshots on the lazy rebuild', () => {
    sp.registerLocalSnapshot(RAW_SNAPSHOT);
    const clone = JSON.parse(JSON.stringify(RAW_SNAPSHOT));
    clone.dataset.snapshotId = 'test-clone-snapshot';
    sp.registerLocalSnapshot(clone);
    const provider = sp.getRegisteredProvider();
    const manifest = provider.getManifest();
    expect(manifest.combinedFrom).toHaveLength(2);
    expect(manifest.snapshotId).toContain('combined:');
  });

  it('still rejects an invalid snapshot at registration time', () => {
    expect(() => sp.registerLocalSnapshot({ schemaVersion: 'wrong' })).toThrow();
    expect(sp.getRegisteredProvider()).toBeNull();
  });

  it('clearRegisteredProvider resets to a null provider', () => {
    sp.registerLocalSnapshot(RAW_SNAPSHOT);
    sp.clearRegisteredProvider();
    expect(sp.getRegisteredProvider()).toBeNull();
  });

  it('registration no longer builds a throwaway index for validation', () => {
    const source = readFileSync(PROVIDER_PATH, 'utf8');
    const registerBody = source.slice(source.indexOf('function registerLocalSnapshot'), source.indexOf('function getRegisteredProvider'));
    expect(registerBody).toContain('validateSnapshot(snapshot)');
    expect(registerBody).not.toContain('createLocalProvider(snapshot)');
    expect(registerBody).toContain('registeredProviderDirty = true');
  });
});

describe('boot work stays off the critical path', () => {
  it('ANTI schedules the audio banks after load instead of at evaluation time', () => {
    const anti = readFileSync(resolve(ROOT, 'AlloFlowANTI.txt'), 'utf8');
    expect(anti).not.toMatch(/^_initAudioBank\(\);/m);
    expect(anti).toContain('_scheduleAudioBankInit');
    expect(anti).toContain("window.addEventListener('load', _scheduleAudioBankInit");
    expect(anti).toContain('requestIdleCallback(kick');
  });

  it('service worker serves version-pinned module URLs cache-first, in source and deployed copy', () => {
    for (const path of ['desktop/web-app/public/sw.js', 'app/sw.js']) {
      const sw = readFileSync(resolve(ROOT, path), 'utf8');
      expect(sw, path).toContain("url.searchParams.has('v')");
      expect(sw, path).toContain('url.origin === self.location.origin');
    }
  });
});
