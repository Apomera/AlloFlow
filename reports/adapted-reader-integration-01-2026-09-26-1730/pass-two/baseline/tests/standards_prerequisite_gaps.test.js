// Phase 3: missing-prerequisite detection in the audit.
//
// getPrerequisiteGaps is a deterministic SET DIFFERENCE over source-provided
// buildsTowards edges — resolve the audited standards, list their edge sources
// that are not themselves audited. No inference. Tested against the real CCSS
// Math snapshot using an actual edge pair, in both directions: audit the later
// standard alone -> its prerequisite is a gap; audit both -> the gap closes.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

let provider, snapshot, edgePair;

beforeAll(() => {
  const api = require(resolve(process.cwd(), 'standards_provider_module.js'));
  snapshot = JSON.parse(readFileSync(resolve(process.cwd(), 'standards_snapshots/ccss-math.json'), 'utf8'));
  provider = api.createLocalProvider(snapshot);
  const byId = new Map(snapshot.standards.map((s) => [s.id, s]));
  // a buildsTowards edge whose BOTH endpoints are resolvable and carry codes
  for (const r of snapshot.relationships) {
    if (r.type !== 'buildsTowards') continue;
    const from = byId.get(r.fromId);
    const to = byId.get(r.toId);
    if (from && to && from.resolvable !== false && to.resolvable !== false && from.code && to.code) {
      edgePair = { prereq: from, target: to };
      break;
    }
  }
});

describe('getPrerequisiteGaps', () => {
  it('found a usable edge pair in the shipped snapshot', () => {
    expect(edgePair, 'no resolvable buildsTowards pair — snapshot changed shape').toBeTruthy();
  });

  it('auditing only the later standard reports its prerequisite as missing', () => {
    const result = provider.getPrerequisiteGaps([edgePair.target.code]);
    expect(result.unresolved).toEqual([]);
    expect(result.missing.map((m) => m.id)).toContain(edgePair.prereq.id);
    const gap = result.missing.find((m) => m.id === edgePair.prereq.id);
    expect(gap.buildsToward).toContain(edgePair.target.code);
  });

  it('auditing prerequisite AND target closes the gap', () => {
    const result = provider.getPrerequisiteGaps([edgePair.target.code, edgePair.prereq.code]);
    expect(result.missing.map((m) => m.id)).not.toContain(edgePair.prereq.id);
  });

  it('unresolved queries are reported, never silently dropped', () => {
    // "No gaps" must never mean "we could not read your standards".
    const result = provider.getPrerequisiteGaps(['TOTALLY.FAKE.CODE', edgePair.target.code]);
    expect(result.unresolved.length).toBe(1);
    expect(result.unresolved[0].query).toBe('TOTALLY.FAKE.CODE');
    expect(result.evaluated.length).toBe(1);
  });

  it('every reported gap is a real edge in the snapshot', () => {
    const codes = snapshot.standards.filter((s) => s.resolvable !== false && s.code).slice(0, 40).map((s) => s.code);
    const result = provider.getPrerequisiteGaps(codes);
    const edgeSet = new Set(snapshot.relationships
      .filter((r) => r.type === 'buildsTowards').map((r) => `${r.fromId}|${r.toId}`));
    const byCode = new Map(snapshot.standards.map((s) => [s.code, s]));
    for (const gap of result.missing) {
      const hasEdge = gap.buildsToward.some((code) => {
        const target = byCode.get(code);
        return target && edgeSet.has(`${gap.id}|${target.id}`);
      });
      expect(hasEdge, `${gap.code} listed without a real edge`).toBe(true);
    }
    expect(result.edgeSource).toBe('buildsTowards');
    expect(result.dataset.attribution).toContain('Learning Commons');
  });
});

describe('the Alignment Map surfaces the gaps', () => {
  let source, module_;
  beforeAll(() => {
    source = readFileSync(resolve(process.cwd(), 'view_alignment_report_source.jsx'), 'utf8');
    module_ = readFileSync(resolve(process.cwd(), 'view_alignment_report_module.js'), 'utf8');
  });

  it('renders the gap panel with provenance and the judgment framing', () => {
    expect(source).toContain('Prerequisite gaps (knowledge graph)');
    expect(source).toContain('educator judgment, not certification');
  });

  it('reports unchecked standards instead of implying full coverage', () => {
    expect(source).toContain('not in the local snapshots were not checked');
  });

  it('a clean result still names its scope limits', () => {
    expect(source).toContain('no missing prerequisites among source buildsTowards edges');
  });

  it('degrades to nothing without a registered provider (no empty claims)', () => {
    expect(source).toMatch(/getPrerequisiteGaps !== 'function'\) return null/);
  });

  it('the built module carries all of it', () => {
    for (const needle of ['Prerequisite gaps (knowledge graph)', 'getPrerequisiteGaps',
      'not in the local snapshots were not checked']) {
      expect(module_, `module missing: ${needle}`).toContain(needle);
    }
  });
});
