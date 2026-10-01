import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let buildEnvelope;

beforeAll(() => {
  const ReactLib = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = ReactLib;
  loadAlloModule('research_hub_module.js');
  buildEnvelope = window.buildResearchHubAlloSheetEnvelope;
  if (typeof buildEnvelope !== 'function') throw new Error('Research Hub AlloSheet builder did not load');
});

const now = '2026-07-31T13:00:00.000Z';

function fixture() {
  return {
    journal: {
      activeLane: 'scientific',
      activeMethodPack: 'scientific_investigation',
      questionTitle: 'Private inquiry question must stay local',
      claims: [{ id: 'claim-1', text: 'Private learner claim text must stay local', ts: '2026-07-20T12:00:00.000Z', methodPackId: 'scientific_investigation', inquiryEpisodeId: 'episode-1' }],
      evidenceCards: [{ id: 'evidence-1', text: 'Private evidence text must stay local', tag: 'observation', ts: '2026-07-19T12:00:00.000Z' }],
      sources: [{ id: 'source-1', citation: 'Private citation must stay local', ts: '2026-07-18T12:00:00.000Z', sift: { tier: 'vetted' } }],
      capturedArtifacts: [{ id: 'tool-1', title: 'Private tool title', summary: 'Private tool summary', ts: '2026-07-17T12:00:00.000Z', provenance: { sourceRecordId: 'secret-source-record' }, reproducibilityReceipt: { status: 'complete' }, integrationHealth: { status: 'healthy' } }],
      inquiryEpisodes: [{ id: 'episode-1', methodPackId: 'scientific_investigation', laneId: 'scientific', startedAt: '2026-07-16T12:00:00.000Z' }],
      claimEvidenceLinks: [{ id: 'relationship-1', claimId: 'claim-1', evidenceIds: ['evidence-1'], relationship: 'supports', warrant: 'Private warrant text must stay local', ts: '2026-07-20T12:00:00.000Z' }],
      designClaims: [], modelSnapshots: [], testRun: [],
    },
    graph: { status: 'ready', diagnostics: [] },
    audit: { status: 'review_recommended', counts: { action: 0, review: 1 } },
    integrationHealth: { healthy: 1, needsReview: 0, actionNeeded: 0 },
  };
}

describe('Research Hub -> AlloSheet handoff', () => {
  it('exports evidence-graph metadata while excluding learner text, citations, notes, and stable IDs', () => {
    const artifact = buildEnvelope(fixture(), { createdAt: now, dateRange: 'all' });
    expect(artifact).toMatchObject({
      kind: 'alloflow.tabular.v1',
      source: { tool: 'research-hub' },
      privacy: { reducedData: true, identifierIncluded: false, notesIncluded: false },
      capabilities: { aiEnabled: false, writeBack: false, transferEnablesAI: false },
    });
    const serialized = JSON.stringify(artifact);
    expect(serialized).not.toContain('Private learner claim text');
    expect(serialized).not.toContain('Private evidence text');
    expect(serialized).not.toContain('Private citation');
    expect(serialized).not.toContain('Private warrant text');
    expect(serialized).not.toContain('secret-source-record');
    expect(serialized).not.toContain('\"claim-1\"');
    const claim = artifact.tables.find((table) => table.id === 'research-claim-summary');
    expect(claim.rows[0].values).toMatchObject({ claim_code: 'C001', claim_type: 'claim', evidence_link_count: 1, warrant_present: true, method_pack: 'scientific_investigation' });
    const evidence = artifact.tables.find((table) => table.id === 'research-evidence-summary');
    const evidenceCard = evidence.rows.find((row) => row.values?.evidence_type === 'evidence');
    expect(evidenceCard.values).toMatchObject({ evidence_code: 'E002', evidence_type: 'evidence', linked_claim_count: 1, approved_summary_present: true });
  });

  it('supports bounded date windows and dataset selection with transfer-local codes', () => {
    const data = fixture();
    data.journal.claims.push({ id: 'old-claim', text: 'Old private claim', ts: '2026-01-01T12:00:00.000Z' });
    const artifact = buildEnvelope(data, { createdAt: now, dateRange: '30d', datasets: { overview: true, claims: true, evidence: false, provenance: false } });
    expect(artifact.metadata.dateRange).toBe('30d');
    expect(artifact.tables.map((table) => table.id)).toEqual(['research-overview', 'research-claim-summary']);
    expect(artifact.tables.find((table) => table.id === 'research-claim-summary').rows).toHaveLength(1);
    expect(artifact.tables.find((table) => table.id === 'research-claim-summary').rows[0].id).toBe('research-claim-1');
    expect(artifact.metadata.excludedUndatedCount).toBe(0);
    expect(JSON.stringify(artifact)).not.toContain('old-claim');
  });
});
