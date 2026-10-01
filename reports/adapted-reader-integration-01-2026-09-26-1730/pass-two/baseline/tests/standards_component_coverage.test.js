// Phase 3, second half: component-level alignment by set membership.
//
// getComponentCoverage resolves the audited standards and, for each one with
// source-provided hasChild components, reports which components are themselves
// audited. Tested against the real CCSS Math snapshot with an actual
// parent/child pair, in both directions.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

let provider, snapshot, pair;

beforeAll(() => {
  const api = require(resolve(process.cwd(), 'standards_provider_module.js'));
  snapshot = JSON.parse(readFileSync(resolve(process.cwd(), 'standards_snapshots/ccss-math.json'), 'utf8'));
  provider = api.createLocalProvider(snapshot);
  const byId = new Map(snapshot.standards.map((s) => [s.id, s]));
  // a hasChild edge with BOTH endpoints resolvable and coded
  for (const r of snapshot.relationships) {
    if (r.type !== 'hasChild') continue;
    const parent = byId.get(r.fromId);
    const child = byId.get(r.toId);
    if (parent && child && parent.resolvable !== false && child.resolvable !== false && parent.code && child.code) {
      pair = { parent, child };
      break;
    }
  }
});

describe('getComponentCoverage', () => {
  it('found a resolvable parent/child pair in the snapshot', () => {
    expect(pair, 'no resolvable hasChild pair — snapshot changed shape').toBeTruthy();
  });

  it('auditing only the parent marks its components as not covered', () => {
    const result = provider.getComponentCoverage([pair.parent.code]);
    const entry = result.evaluated.find((e) => e.standard.id === pair.parent.id);
    expect(entry, 'parent not evaluated').toBeTruthy();
    const component = entry.components.find((c) => c.id === pair.child.id);
    expect(component, 'child not listed as a component').toBeTruthy();
    expect(component.covered).toBe(false);
  });

  it('auditing parent AND child marks that component covered', () => {
    const result = provider.getComponentCoverage([pair.parent.code, pair.child.code]);
    const entry = result.evaluated.find((e) => e.standard.id === pair.parent.id);
    const component = entry.components.find((c) => c.id === pair.child.id);
    expect(component.covered).toBe(true);
    expect(entry.coveredCount).toBeGreaterThan(0);
  });

  it('leaf standards are omitted, not reported as 0% covered', () => {
    const parents = new Set(snapshot.relationships.filter((r) => r.type === 'hasChild').map((r) => r.fromId));
    const leaf = snapshot.standards.find((s) => s.resolvable !== false && s.code && !parents.has(s.id));
    expect(leaf, 'no leaf found').toBeTruthy();
    const result = provider.getComponentCoverage([leaf.code]);
    expect(result.evaluated.find((e) => e.standard.id === leaf.id)).toBeUndefined();
  });

  it('every listed component is a real hasChild edge, and provenance rides along', () => {
    const result = provider.getComponentCoverage([pair.parent.code]);
    const direct = new Set(snapshot.relationships
      .filter((r) => r.type === 'hasChild' && r.fromId === pair.parent.id).map((r) => r.toId));
    for (const component of result.evaluated[0].components) {
      expect(direct.has(component.id), `${component.code} is not a direct child`).toBe(true);
    }
    expect(result.edgeSource).toBe('hasChild');
    expect(result.dataset.attribution).toContain('Learning Commons');
  });
});

describe('the Alignment Map surfaces it', () => {
  let source, module_;
  beforeAll(() => {
    source = readFileSync(resolve(process.cwd(), 'view_alignment_report_source.jsx'), 'utf8');
    module_ = readFileSync(resolve(process.cwd(), 'view_alignment_report_module.js'), 'utf8');
  });

  it('renders the coverage panel with the containment framing', () => {
    expect(source).toContain('Component coverage (knowledge graph)');
    expect(source).toContain('not a claim about lesson content');
  });

  it('degrades to nothing without a provider or without component data', () => {
    expect(source).toMatch(/getComponentCoverage !== 'function'\) return null/);
    expect(source).toContain('coverage.evaluated.length ? coverage : null');
  });

  it('the built module carries it', () => {
    expect(module_).toContain('Component coverage (knowledge graph)');
    expect(module_).toContain('getComponentCoverage');
  });
});
