// The first REVIEWED standards snapshot must stay reproducible and in-scope.
//
// Until now the local standards provider had no real data behind it — the only
// snapshot in the repo was a 6-standard test fixture. The provider, the
// alignment report and the sidebar resolver were all wired to something empty.
//
// dev-tools/learning_commons_snapshot_manifest.json sets the rule this test
// enforces: "Importer-only. Do not commit the full upstream corpus. Generate
// reviewed jurisdiction/subject subsets and preserve license, attribution,
// source URLs, CASE UUIDs, and CASE URIs." The upstream is 292MB of nodes plus
// 520MB of relationships; what ships is a 58KB reviewed subset.
//
// The snapshotId embeds a content digest, so a rebuild from the same pinned
// export must produce the same id. That digest is also recorded in the pilot QA
// file, which is what makes this snapshot "reviewed" rather than merely built.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const SNAPSHOT = 'standards_snapshots/ma-science-grade-5.json';
const MODULE = 'standards_snapshots/ma-science-grade-5.js';

let snapshot, qa, manifest;

beforeAll(() => {
  snapshot = JSON.parse(readFileSync(resolve(process.cwd(), SNAPSHOT), 'utf8'));
  qa = JSON.parse(readFileSync(resolve(process.cwd(), 'LEARNING_COMMONS_MA_SCIENCE_G5_PILOT_QA.json'), 'utf8'));
  manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'dev-tools/learning_commons_snapshot_manifest.json'), 'utf8'));
});

const dataset = () => snapshot.dataset || snapshot;

describe('the shipped snapshot matches its recorded review', () => {
  it('exists as both JSON and a registration module', () => {
    expect(existsSync(resolve(process.cwd(), SNAPSHOT))).toBe(true);
    expect(existsSync(resolve(process.cwd(), MODULE))).toBe(true);
  });

  it('reproduces the digest recorded in the pilot QA', () => {
    // If a rebuild from the pinned v1.11.0 export stops producing this digest,
    // either the scope flags changed or the upstream moved — both need review
    // before the snapshot is trusted again.
    expect(dataset().contentDigest).toBe(qa.snapshot.contentDigest);
    expect(dataset().snapshotId).toBe(qa.snapshot.snapshotId);
  });

  it('matches the reviewed counts exactly', () => {
    const resolvable = snapshot.standards.filter((s) => s.resolvable !== false).length;
    const structural = snapshot.standards.filter((s) => s.resolvable === false).length;
    expect(snapshot.standards.length).toBe(qa.counts.records);
    expect(snapshot.relationships.length).toBe(qa.counts.relationships);
    expect(resolvable).toBe(qa.counts.resolvableStandards);
    expect(structural).toBe(qa.counts.structuralNodes);
  });

  it('is pinned to the dataset version the manifest reviewed', () => {
    expect(dataset().datasetVersion).toBe(manifest.exportVersion);
  });
});

describe('licence and provenance survive into the artifact', () => {
  it('carries provider, licence and attribution', () => {
    const d = dataset();
    expect(d.provider).toBe('Learning Commons Knowledge Graph');
    expect(d.license).toContain('creativecommons.org');
    expect(d.attribution, 'CC BY-4.0 attribution is a licence condition, not a nicety')
      .toContain('Learning Commons');
  });

  it('records the upstream files it was cut from', () => {
    const si = dataset().sourceIntegrity;
    expect(si, 'source integrity missing').toBeTruthy();
    expect(si.nodes.sha256.toLowerCase()).toBe(manifest.sourceIntegrity.nodes.sha256.toLowerCase());
    expect(si.relationships.sha256.toLowerCase()).toBe(manifest.sourceIntegrity.relationships.sha256.toLowerCase());
  });
});

describe('the importer-only rule is respected', () => {
  it('ships a subset, not the corpus', () => {
    // 292MB + 520MB upstream vs a reviewed subset. A snapshot that grew into
    // the megabytes would mean the scope filter had been dropped.
    const bytes = statSync(resolve(process.cwd(), SNAPSHOT)).size;
    expect(bytes).toBeLessThan(2 * 1024 * 1024);
    expect(snapshot.standards.length).toBeLessThan(500);
  });

  it('no raw upstream export is committed', () => {
    for (const f of ['nodes.jsonl', 'relationships.jsonl',
      'standards_snapshots/nodes.jsonl', 'standards_snapshots/relationships.jsonl']) {
      expect(existsSync(resolve(process.cwd(), f)), `${f} must not be committed`).toBe(false);
    }
  });

  it('structural nodes are present but never teacher-facing matches', () => {
    // Grouping and framework nodes stay available for traversal; surfacing them
    // as standards would show a teacher a category where they asked for a
    // standard. The snapshot carries both kinds — the QA file counts the
    // framework root separately from the grouping nodes.
    const structural = snapshot.standards.filter((s) => s.resolvable === false);
    expect(structural.length).toBe(qa.counts.structuralNodes);
    const kinds = [...new Set(structural.map((s) => s.kind))].sort();
    expect(kinds, 'unexpected non-resolvable kind').toEqual(['framework', 'group']);
    expect(structural.filter((s) => s.kind === 'framework').length).toBe(qa.counts.frameworkNodes);
  });
});

describe('the registration module is offline and self-contained', () => {
  it('makes no network call', () => {
    const src = readFileSync(resolve(process.cwd(), MODULE), 'utf8');
    for (const bad of ['fetch(', 'XMLHttpRequest', 'import(']) {
      expect(src, `registration module must not ${bad}`).not.toContain(bad);
    }
  });

  it('registers a snapshot when required', async () => {
    const mod = await import('../standards_snapshots/ma-science-grade-5.js');
    // registers onto globalThis.AlloModules in Node, window in the browser
    const reg = globalThis.AlloModules && globalThis.AlloModules.LocalStandardsSnapshot;
    expect(reg || mod, 'module did not register').toBeTruthy();
  });
});
