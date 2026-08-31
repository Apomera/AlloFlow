import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const studyDir = resolve(root, 'mcp-testing', 'refinement-study');
const protocol = JSON.parse(readFileSync(resolve(studyDir, 'protocol-v1.json'), 'utf8'));
const pilot = JSON.parse(readFileSync(resolve(studyDir, 'development-pilot.json'), 'utf8'));

function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

describe('MCP refinement study protocol', () => {
  it('keeps the causal question narrower than MCP transport claims', () => {
    expect(protocol.question).toContain('evidence-gated refinement loop');
    expect(protocol.question).toContain('canonical primary pass');
    expect(protocol.unitOfAnalysis).toBe('source_document_sha256');
    expect(protocol.conditions['primary-one-shot']).toMatchObject({
      autoContinue: false,
      implementation: 'canonical-driver',
    });
    expect(protocol.conditions['gated-loop']).toMatchObject({
      autoContinue: true,
      autoContinueRounds: 3,
      implementation: 'canonical-driver',
    });
    expect(protocol.conditions['ungated-loop'].implementation).toBe('external-adapter-required');
    expect(protocol.conditions['deterministic-only'].implementation).toBe('external-adapter-required');
  });

  it('records the current uncontrolled provider sampling honestly', () => {
    expect(protocol.sampling).toMatchObject({
      modelGenerationConfigSentByCurrentMcpDriver: false,
      temperatureControlled: false,
      seedControlled: false,
      actualModelTraceComplete: false,
      replicatesPerAiCondition: 3,
    });
    expect(protocol.sampling.confirmatoryModelSubstitutionControl).toContain('equal');
    expect(protocol.sampling.confirmatoryModelSubstitutionControl).toContain('engineering/descriptive');
    expect(protocol.analysis.aggregateReplicatesWithinDocument).toBe(true);
    expect(protocol.analysis.automatedOutcomesAreSurrogates).toBe(true);
  });

  it('marks the six-document pilot as development-only', () => {
    expect(pilot.partition).toBe('development_pilot');
    expect(pilot.exposureStatus).toBe('development_exposed');
    expect(pilot.effectClaimEligible).toBe(false);
    expect(pilot.documents).toHaveLength(6);
    expect(pilot.documents.reduce((sum, document) => sum + document.pages, 0)).toBe(107);
    expect(pilot.conditions).toEqual(['primary-one-shot', 'gated-loop']);
    expect(pilot.documents.length * pilot.conditions.length * pilot.repetitions).toBe(36);
  });

  it('pins every pilot source by exact bytes and SHA-256', () => {
    const ids = new Set();
    const hashes = new Set();
    for (const document of pilot.documents) {
      expect(ids.has(document.documentId)).toBe(false);
      expect(hashes.has(document.sha256)).toBe(false);
      ids.add(document.documentId);
      hashes.add(document.sha256);
      const sourcePath = resolve(root, document.path);
      // The corpus PDFs are deliberately gitignored (local-only study
      // documents); byte-pinning runs only where the local corpus exists.
      if (!existsSync(sourcePath)) continue;
      expect(statSync(sourcePath).size).toBe(document.bytes);
      expect(sha256File(sourcePath)).toBe(document.sha256);
    }
  });

  it('fails closed on non-confirmatory observations and pseudoreplication', () => {
    expect(protocol.failClosedExclusions).toEqual(expect.arrayContaining([
      'scripted_or_synthetic_from_effect_estimate',
      'development_exposed_from_confirmatory_estimate',
      'missing_condition_pair',
      'engine_model_or_shared_option_drift',
      'missing_expert_adjudication',
      'duplicate_or_aliased_artifact_hash',
      'broken_source_output_or_evidence_binding',
    ]));
    expect(protocol.analysis.minimumProspectiveDocumentsForConfirmatoryEstimate).toBe(12);
    expect(protocol.primaryOutcome.source).toBe('blinded_specialist_adjudication');
  });
});
