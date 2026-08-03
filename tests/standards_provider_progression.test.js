// Progression methods on the local standards provider, tested against the REAL
// shipped CCSS Math snapshot rather than a fixture — the point of these methods
// is the 757 buildsTowards / 284 relatesTo edges that snapshot carries.
//
// Direction semantics under test were established empirically before the
// implementation: across every buildsTowards edge in the snapshot, fromId is
// never a later grade than toId. So prerequisites(X) = sources of X's incoming
// buildsTowards edges, and a prerequisite's grade must never exceed the
// standard's own.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

let provider, snapshot;

const gradeNum = (g) => {
  if (g == null) return null;
  if (/^k/i.test(String(g))) return 0;
  const n = parseInt(g, 10);
  return Number.isNaN(n) ? null : n;
};

beforeAll(() => {
  const api = require(resolve(process.cwd(), 'standards_provider_module.js'));
  snapshot = JSON.parse(readFileSync(resolve(process.cwd(), 'standards_snapshots/ccss-math.json'), 'utf8'));
  provider = api.createLocalProvider(snapshot);
});

describe('contract surface', () => {
  it('exposes the full planned provider API', () => {
    for (const fn of ['resolveStandard', 'getStandardContext', 'getPrerequisites',
      'getRelatedStandards', 'getLearningComponents', 'getDatasetManifest', 'getNeighborhood']) {
      expect(typeof provider[fn], `provider.${fn}`).toBe('function');
    }
  });

  it('getDatasetManifest matches getManifest (alias, not a second path)', () => {
    expect(provider.getDatasetManifest()).toEqual(provider.getManifest());
  });
});

describe('getPrerequisites', () => {
  const withIncoming = () => {
    // a standard that genuinely has incoming buildsTowards edges
    const targets = new Set(snapshot.relationships
      .filter((r) => r.type === 'buildsTowards').map((r) => r.toId));
    return snapshot.standards.find((s) => s.resolvable !== false && targets.has(s.id));
  };

  it('returns real prerequisites for a standard that has them', () => {
    const s = withIncoming();
    expect(s, 'no standard with incoming buildsTowards found').toBeTruthy();
    const result = provider.getPrerequisites(s.id);
    expect(result).not.toBeNull();
    expect(result.prerequisites.length).toBeGreaterThan(0);
    expect(result.edgeSource).toBe('buildsTowards');
  });

  it('every prerequisite is an actual buildsTowards source in the snapshot', () => {
    const s = withIncoming();
    const result = provider.getPrerequisites(s.id);
    const incoming = new Set(snapshot.relationships
      .filter((r) => r.type === 'buildsTowards' && r.toId === s.id).map((r) => r.fromId));
    for (const p of result.prerequisites) {
      expect(incoming.has(p.id), `${p.code} is not a buildsTowards source of ${s.code}`).toBe(true);
    }
  });

  it('a prerequisite never has a LATER grade than the standard itself', () => {
    // The semantic the implementation depends on. If an upstream rev flips edge
    // direction, this fails before a teacher sees grade-5 work listed as a
    // prerequisite for grade-1.
    let checked = 0;
    for (const s of snapshot.standards) {
      if (s.resolvable === false) continue;
      const result = provider.getPrerequisites(s.id);
      if (!result || !result.prerequisites.length) continue;
      const own = gradeNum(s.grade);
      if (own == null) continue;
      for (const p of result.prerequisites) {
        const pg = gradeNum(p.grade);
        if (pg == null) continue;
        checked++;
        expect(pg, `${p.code} (grade ${p.grade}) listed as prerequisite of ${s.code} (grade ${s.grade})`)
          .toBeLessThanOrEqual(own);
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('returns null for structural nodes and unknown ids', () => {
    const structural = snapshot.standards.find((s) => s.resolvable === false);
    expect(provider.getPrerequisites(structural.id)).toBeNull();
    expect(provider.getPrerequisites('no-such-id')).toBeNull();
  });

  it('is bounded and carries the dataset manifest for attribution', () => {
    const s = withIncoming();
    const result = provider.getPrerequisites(s.id, { maxResults: 1 });
    expect(result.prerequisites.length).toBeLessThanOrEqual(1);
    expect(result.dataset.attribution).toContain('Learning Commons');
  });
});

describe('getRelatedStandards', () => {
  it('returns relatesTo neighbours symmetrically', () => {
    const rel = snapshot.relationships.find((r) => r.type === 'relatesTo');
    expect(rel, 'no relatesTo edge in the snapshot').toBeTruthy();
    const a = provider.getRelatedStandards(rel.fromId);
    const b = provider.getRelatedStandards(rel.toId);
    if (a) expect(a.related.some((x) => x.id === rel.toId)).toBe(true);
    if (b) expect(b.related.some((x) => x.id === rel.fromId)).toBe(true);
    expect(a || b, 'both endpoints structural — unexpected for relatesTo').toBeTruthy();
  });
});

describe('getLearningComponents', () => {
  it('returns direct hasChild children only, from source data', () => {
    const parentIds = new Set(snapshot.relationships
      .filter((r) => r.type === 'hasChild').map((r) => r.fromId));
    const parent = snapshot.standards.find((s) => parentIds.has(s.id));
    const result = provider.getLearningComponents(parent.id);
    expect(result).not.toBeNull();
    const direct = new Set(snapshot.relationships
      .filter((r) => r.type === 'hasChild' && r.fromId === parent.id).map((r) => r.toId));
    for (const c of result.components) {
      expect(direct.has(c.id), `${c.id} is not a direct child`).toBe(true);
    }
    expect(result.edgeSource).toBe('hasChild');
  });

  it('never synthesizes components a standard does not have', () => {
    const leafIds = new Set(snapshot.standards.map((s) => s.id));
    for (const r of snapshot.relationships) if (r.type === 'hasChild') leafIds.delete(r.fromId);
    const leaf = snapshot.standards.find((s) => s.resolvable !== false && leafIds.has(s.id));
    expect(leaf, 'no leaf standard found').toBeTruthy();
    const result = provider.getLearningComponents(leaf.id);
    expect(result.components).toEqual([]);
  });
});
