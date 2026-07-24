import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const evidenceGraph = require('../research_evidence_graph.js');

function portfolioFixture() {
  return {
    questionTitle: 'How does authority change across evidence and interpretation?',
    activeMethodPack: 'humanistic_interpretation',
    activeInquiryEpisodeId: 'episode-1',
    claims: [{ id: 'claim-1', text: 'The measured pattern supports a bounded scientific claim.' }],
    humanitiesPosition: {
      id: 'position-1',
      text: 'The narrator complicates institutional authority.',
      whatThisClaimDoesNotSpeakTo: 'This position does not establish the author’s private intention.',
    },
    designClaims: [{ id: 'design-1', text: 'The revised prototype meets the stated threshold.', claimEvidenceRunIds: ['run-1'] }],
    sources: [
      {
        id: 'source-1',
        title: 'A public-domain narrative',
        creator: 'A Writer',
        citation: 'A Writer, A public-domain narrative, 1892.',
        url: 'https://example.org/source',
        notes: 'The passage qualifies its description of authority.',
        humanitiesContext: { inquiryRelationship: 'complicates', historicalContext: 'Published in 1892.' },
      },
    ],
    evidenceCards: [
      { id: 'evidence-1', text: 'A bounded observation supports only one part of the claim.', tag: 'observation' },
      { id: 'evidence-tool', text: 'A tool-derived observation.', toolArtifactId: 'artifact-1' },
    ],
    claimEvidenceLinks: [
      {
        id: 'link-1',
        claimId: 'claim-1',
        evidenceIds: ['evidence-1'],
        warrant: 'The observation measures the variable named in the claim.',
        qualifier: 'Within this bounded sample.',
      },
    ],
    testRun: [{ id: 'run-1', criterionId: 'criterion-1', measured: 4.2, unit: 'N', passed: true, observationText: 'The test met the threshold.' }],
    capturedArtifacts: [
      {
        id: 'artifact-1',
        title: 'Text pattern inquiry',
        summary: 'A bounded result.',
        learnerNote: 'The passage provides evidence for my reading.',
        sourceToolId: 'text_inquiry_studio',
        sourceToolName: 'Text Inquiry Studio',
        sourceToolVersion: '2026.07',
        sourceRecordId: 'source-record-1',
        sourceUrl: 'https://example.org/source',
        reproducibilityReceipt: { status: 'complete', softwareVersion: '2026.07' },
        integrationContract: {
          supportedMethodPacks: ['humanistic_interpretation'],
          citation: { text: 'Cite the analyzed edition.', url: 'https://example.org/source' },
        },
        data: {
          annotations: {
            sourceRecordId: 'source-record-1',
            queryTerm: 'authority',
            annotations: [
              {
                id: 'annotation-1',
                stance: 'complicates',
                note: 'The guarded phrasing complicates a simple account of authority.',
                target: {
                  sourceRecordId: 'source-record-1',
                  queryTerm: 'authority',
                  sentenceIndex: 3,
                  excerpt: 'The speaker shifts from certainty to a guarded question.',
                  stableUrl: 'https://example.org/source',
                },
              },
            ],
          },
        },
      },
    ],
  };
}

describe('AlloFlow Research Evidence Graph', () => {
  it('keeps disciplinary node types distinct while creating explicit reasoning links', () => {
    const graph = evidenceGraph.buildEvidenceGraph(portfolioFixture());
    expect(graph.schemaVersion).toBe(1);
    expect(graph.nodes.map((node) => node.type)).toEqual(expect.arrayContaining([
      'question', 'claim', 'humanities_position', 'design_claim', 'source',
      'evidence', 'test_result', 'tool_artifact', 'annotation',
    ]));
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: 'evidence:evidence-1', type: 'supports', to: 'claim:claim-1' }),
      expect.objectContaining({ from: 'source:source-1', type: 'complicates', to: 'position:position-1' }),
      expect.objectContaining({ from: 'test-result:run-1', type: 'supports', to: 'design-claim:design-1' }),
      expect.objectContaining({ from: 'annotation:annotation-1', type: 'derivedFrom', to: 'artifact:artifact-1' }),
    ]));
    expect(graph.claimViews.find((view) => view.claim.id === 'claim:claim-1').relationships[0].edge.warrant).toContain('measures the variable');
  });

  it('reports missing warrants, unsupported claims, absent counterevidence, and unlinked evidence', () => {
    const graph = evidenceGraph.buildEvidenceGraph({
      questionTitle: 'What does this result mean?',
      claims: [{ id: 'claim-1', text: 'A claim without support.' }],
      evidenceCards: [{ id: 'evidence-1', text: 'An observation that is not connected.' }],
    });
    expect(graph.status).toBe('action_needed');
    expect(graph.diagnostics.map((item) => item.code)).toEqual(expect.arrayContaining([
      'unsupported_graph_claim', 'graph_without_counterevidence', 'unlinked_graph_evidence',
    ]));
  });

  it('exports bounded W3C annotations, CSL records, and RO-Crate 1.3 metadata', () => {
    const journal = portfolioFixture();
    const graph = evidenceGraph.buildEvidenceGraph(journal);
    const annotations = evidenceGraph.toW3CWebAnnotations(journal, graph);
    expect(annotations['@context']).toBe('http://www.w3.org/ns/anno.jsonld');
    expect(annotations.items[0]).toMatchObject({
      type: 'Annotation',
      motivation: 'commenting',
      target: {
        source: 'https://example.org/source',
        selector: { type: 'TextQuoteSelector', exact: 'The speaker shifts from certainty to a guarded question.' },
      },
    });
    expect(annotations.items[0].body).toContainEqual(expect.objectContaining({ value: 'stance:complicates', purpose: 'tagging' }));

    const citations = evidenceGraph.toCslJson(journal);
    expect(citations).toContainEqual(expect.objectContaining({ id: 'source-1', type: 'document', URL: 'https://example.org/source' }));

    const crate = evidenceGraph.toRoCrate(journal, graph);
    expect(crate['@context']).toBe('https://w3id.org/ro/crate/1.3/context');
    expect(crate['@graph']).toContainEqual(expect.objectContaining({
      '@id': 'ro-crate-metadata.json',
      conformsTo: { '@id': 'https://w3id.org/ro/crate/1.3' },
    }));
  });

  it('produces stable graph identifiers and omits raw audio and direct identifiers', () => {
    const journal = portfolioFixture();
    journal.evidenceCards[0].text = 'Contact learner@example.org about the bounded observation.';
    journal.evidenceCards[0].audioBase64 = `data:audio/webm;base64,${'A'.repeat(2000)}`;
    const first = evidenceGraph.buildEvidenceGraph(journal);
    const second = evidenceGraph.buildEvidenceGraph(journal);
    expect(first.nodes.map((node) => node.id)).toEqual(second.nodes.map((node) => node.id));
    const serialized = JSON.stringify(evidenceGraph.buildInteroperabilityBundle(journal));
    expect(serialized).toContain('[email omitted]');
    expect(serialized).not.toContain('learner@example.org');
    expect(serialized).not.toContain('data:audio/webm');
  });
});
