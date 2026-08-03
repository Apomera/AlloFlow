// Multi-snapshot registration on the standards provider.
//
// The registry used to be a single slot: loading a second snapshot module
// silently REPLACED the first. With three reviewed snapshots shipped and
// loadModule injecting async script tags, which standards existed depended on
// network timing. Now snapshots are keyed by snapshotId and the exposed
// provider is rebuilt over the union.
//
// Tested against the real shipped snapshots, in both load orders.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

const api = require(resolve(process.cwd(), 'standards_provider_module.js'));
const load = (p) => JSON.parse(readFileSync(resolve(process.cwd(), p), 'utf8'));
const math = load('standards_snapshots/ccss-math.json');
const ela = load('standards_snapshots/ccss-ela.json');
const ma = load('standards_snapshots/ma-science-grade-5.json');

const someStandard = (snap) => snap.standards.find((s) => s.resolvable !== false);

beforeEach(() => api.clearRegisteredProvider());
afterEach(() => api.clearRegisteredProvider());

describe('registry semantics', () => {
  it('a second registration ADDS instead of replacing', () => {
    api.registerLocalSnapshot(math);
    api.registerLocalSnapshot(ela);
    const p = api.getRegisteredProvider();
    // a math id and an ela id must BOTH resolve on the same provider
    expect(p.getStandardContext(someStandard(math).id), 'math standard lost').not.toBeNull();
    expect(p.getStandardContext(someStandard(ela).id), 'ela standard lost').not.toBeNull();
  });

  it('is order-independent', () => {
    api.registerLocalSnapshot(ela);
    api.registerLocalSnapshot(math);
    const p = api.getRegisteredProvider();
    expect(p.getStandardContext(someStandard(math).id)).not.toBeNull();
    expect(p.getStandardContext(someStandard(ela).id)).not.toBeNull();
  });

  it('re-registering the same snapshot is idempotent', () => {
    api.registerLocalSnapshot(math);
    api.registerLocalSnapshot(math);
    expect(api.getRegisteredSnapshotManifests().length).toBe(1);
  });

  it('a single snapshot behaves exactly as before', () => {
    api.registerLocalSnapshot(ma);
    const p = api.getRegisteredProvider();
    const manifest = p.getManifest();
    expect(manifest.snapshotId).toBe(ma.dataset.snapshotId);
    expect(manifest.snapshotId).not.toContain('combined:');
  });

  it('an invalid snapshot cannot poison an existing registration', () => {
    api.registerLocalSnapshot(math);
    expect(() => api.registerLocalSnapshot({ garbage: true })).toThrow();
    const p = api.getRegisteredProvider();
    expect(p, 'valid registration lost after a bad one').not.toBeNull();
    expect(p.getStandardContext(someStandard(math).id)).not.toBeNull();
    expect(api.getRegisteredSnapshotManifests().length).toBe(1);
  });

  it('clearRegisteredProvider empties the registry, not just the facade', () => {
    api.registerLocalSnapshot(math);
    api.clearRegisteredProvider();
    expect(api.getRegisteredProvider()).toBeNull();
    expect(api.getRegisteredSnapshotManifests()).toEqual([]);
  });
});

describe('the combined provider', () => {
  it('reports a combined manifest that names its parts', () => {
    api.registerLocalSnapshot(math);
    api.registerLocalSnapshot(ela);
    const m = api.getRegisteredProvider().getManifest();
    expect(m.snapshotId).toContain('combined:');
    expect(m.combinedFrom.map((c) => c.snapshotId)).toEqual(
      expect.arrayContaining([math.dataset.snapshotId, ela.dataset.snapshotId]));
    expect(m.attribution).toContain('Learning Commons');
  });

  it('progression lookups still work across the union', () => {
    api.registerLocalSnapshot(ela);
    api.registerLocalSnapshot(math);
    const p = api.getRegisteredProvider();
    const target = math.standards.find((s) => s.resolvable !== false &&
      math.relationships.some((r) => r.type === 'buildsTowards' && r.toId === s.id));
    const result = p.getPrerequisites(target.id);
    expect(result).not.toBeNull();
    expect(result.prerequisites.length).toBeGreaterThan(0);
  });

  it('getRegisteredSnapshotManifests lists each snapshot individually', () => {
    api.registerLocalSnapshot(math);
    api.registerLocalSnapshot(ela);
    api.registerLocalSnapshot(ma);
    const ids = api.getRegisteredSnapshotManifests().map((m) => m.snapshotId);
    expect(ids.sort()).toEqual([ma, math, ela].map((s) => s.dataset.snapshotId).sort());
  });
});

describe('the regenerated module template', () => {
  it('falls back to an ARRAY global, so load order cannot drop a snapshot', () => {
    for (const f of ['ma-science-grade-5', 'ccss-math', 'ccss-ela']) {
      const src = readFileSync(resolve(process.cwd(), `standards_snapshots/${f}.js`), 'utf8');
      expect(src, `${f}.js still uses the single-slot fallback`)
        .toContain('__ALLO_LOCAL_STANDARDS_SNAPSHOTS__.push(snapshot)');
      expect(src).toContain('LocalStandardsSnapshots');
    }
  });

  it('the provider drains the array fallback on load', () => {
    const src = readFileSync(resolve(process.cwd(), 'standards_provider_module.js'), 'utf8');
    expect(src).toContain('__ALLO_LOCAL_STANDARDS_SNAPSHOTS__');
    expect(src).toContain('drainInjectedSnapshots');
  });
});
