import { describe, expect, it } from 'vitest';
import {
  ANALYSIS_SCHEMA_ID,
  RESULT_SCHEMA_ID,
  StudyAnalysisError,
  analyzeRefinementStudy,
  bootstrapPairedMean,
  inspectStudyIntegrity,
  renderMarkdownReport,
  validateResultRecord,
} from '../mcp-testing/refinement-study/analysis.mjs';

const H = {
  protocol: '1'.repeat(64),
  build: '2'.repeat(64),
  annotationProtocol: '3'.repeat(64),
};

function documentHash(documentNumber) {
  return Number(documentNumber).toString(16).padStart(64, '0');
}

function artifactHash(documentNumber, condition, replicate, offset = 0) {
  const conditionOffset = condition === 'gated_loop' ? 1000 : 0;
  return (Number(documentNumber) * 10000 + conditionOffset + Number(replicate) * 10 + offset)
    .toString(16).padStart(64, '0');
}

function resultRecord({
  documentNumber = 1,
  condition = 'one_shot',
  replicate = 1,
  partition = 'prospective_held_out',
  providerClass = 'live',
  evidenceClass = partition === 'prospective_held_out' ? 'prospective_confirmatory' : 'development_descriptive',
  effectivenessEligible = providerClass === 'live' && evidenceClass === 'prospective_confirmatory',
  beforeScore = 60,
  afterScore = condition === 'gated_loop' ? 80 : 70,
  openIssueCount = condition === 'gated_loop' ? 2 : 4,
  introducedDefectCount = condition === 'gated_loop' ? 0 : 1,
  verificationComplete = condition === 'gated_loop',
  expert = 'complete',
  engineName = 'alloflow-remediation-headless',
  primaryModel = 'gemini-test',
  sharedOptions = {},
  extraConditionOptions = {},
  verificationBindingValid = true,
} = {}) {
  const finalSha256 = artifactHash(documentNumber, condition, replicate, 1);
  const joined = expert === 'complete';
  const rounds = condition === 'gated_loop'
    ? { attempted: 2, accepted: 1, reverted: 1 }
    : { attempted: 0, accepted: 0, reverted: 0 };
  return {
    schema: RESULT_SCHEMA_ID,
    observationId: `B-${documentNumber}-${condition}-${replicate}`,
    runId: `doc-${documentNumber}--${condition}--r${replicate}`,
    capturedAt: '2026-08-13T00:00:00.000Z',
    document: {
      documentId: `doc-${documentNumber}`,
      sourceSha256: documentHash(documentNumber),
      partition,
    },
    condition: { kind: condition, replicate },
    protocol: {
      protocolSha256: H.protocol,
      engine: { name: engineName, version: 'v1', buildSha256: H.build },
      provider: 'Gemini-compatible generateContent',
      model: {
        primary: primaryModel, fallback: primaryModel, endpoint: 'https://example.test/models',
        sampling: 'provider-default', temperatureControlled: false, seedControlled: false,
        fallbackEnabled: false, actualModelTraceComplete: false,
      },
      sharedOptions,
      conditionOptions: {
        targetScore: 95,
        fixPasses: 2,
        autoContinue: condition === 'gated_loop',
        ...extraConditionOptions,
      },
    },
    execution: { providerClass, evidenceClass, effectivenessEligible },
    artifacts: {
      finalSha256,
      verificationSha256: artifactHash(documentNumber, condition, replicate, 2),
      verificationSubjectSha256: artifactHash(documentNumber, condition, replicate, 3),
      verificationBindingValid,
      finalArtifactEvidenceBound: verificationBindingValid,
    },
    outcome: {
      status: 'complete',
      automated: {
        beforeScore, afterScore, openIssueCount, introducedDefectCount, verificationComplete,
        pdfUaStatus: null, pdfUaFailedRules: null, pdfUaFailedChecks: null, deliveryRefusal: null,
      },
      expertConfirmed: joined ? {
        annotationId: `A-${documentNumber}-${condition}-${replicate}`,
        annotationProtocolSha256: H.annotationProtocol,
        subjectSha256: finalSha256,
        blinded: true,
        reviewerCount: 2,
        baselineAdjudicationSha256: artifactHash(documentNumber, 'one_shot', 1, 9),
        baselineMaterialIssueCount: 10,
        materialDefectsIntroduced: condition === 'gated_loop' ? 0 : 2,
        criticalSeriousIssuesResolved: condition === 'gated_loop' ? 5 : 2,
        pass: condition === 'gated_loop',
      } : null,
    },
    rounds,
    usage: {
      latencyMs: condition === 'gated_loop' ? 2000 : 1000,
      modelCalls: condition === 'gated_loop' ? 8 : 4,
      inputTokens: 100,
      outputTokens: 50,
      costUsd: condition === 'gated_loop' ? 0.2 : 0.1,
    },
    expertAdjudication: {
      status: joined ? 'joined' : 'unassigned',
      annotationJoinKey: `B-${documentNumber}-${condition}-${replicate}`,
      expectedSubjectSha256: finalSha256,
      annotationFile: joined ? `annotations/A-${documentNumber}-${condition}-${replicate}.json` : null,
      annotationSha256: joined ? artifactHash(documentNumber, condition, replicate, 4) : null,
    },
  };
}

function pairedDocuments(documentCount, options = {}) {
  const records = [];
  for (let documentNumber = 1; documentNumber <= documentCount; documentNumber += 1) {
    const repetitions = options.repetitions || 1;
    for (let replicate = 1; replicate <= repetitions; replicate += 1) {
      records.push(resultRecord({ documentNumber, condition: 'one_shot', replicate, ...options }));
      records.push(resultRecord({ documentNumber, condition: 'gated_loop', replicate, ...options }));
    }
  }
  return records;
}

describe('MCP refinement result record schema', () => {
  it('accepts a complete hash-bound record and rejects unknown or cross-field-invalid content', () => {
    expect(validateResultRecord(resultRecord()).valid).toBe(true);

    const unknown = resultRecord();
    unknown.unreviewedClaim = true;
    const unknownValidation = validateResultRecord(unknown);
    expect(unknownValidation.valid).toBe(false);
    expect(unknownValidation.errors).toContainEqual(expect.objectContaining({
      path: '$.unreviewedClaim', code: 'unknown_property',
    }));

    const mismatchedCondition = resultRecord({ condition: 'gated_loop' });
    mismatchedCondition.protocol.conditionOptions.autoContinue = false;
    const mismatchValidation = validateResultRecord(mismatchedCondition);
    expect(mismatchValidation.valid).toBe(false);
    expect(mismatchValidation.errors).toContainEqual(expect.objectContaining({
      path: '$.protocol.conditionOptions.autoContinue', code: 'condition_contract',
    }));

    const scriptedEligible = resultRecord({ providerClass: 'scripted', evidenceClass: 'infrastructure_only' });
    scriptedEligible.execution.effectivenessEligible = true;
    expect(validateResultRecord(scriptedEligible).errors).toContainEqual(expect.objectContaining({ code: 'eligibility' }));
  });

  it('requires joined expert outcomes to be blinded and hash-bound for effectiveness, not merely present', () => {
    const wrongBinding = resultRecord();
    wrongBinding.outcome.expertConfirmed.subjectSha256 = 'f'.repeat(64);
    const validation = validateResultRecord(wrongBinding);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContainEqual(expect.objectContaining({ code: 'expert_binding' }));

    const records = pairedDocuments(2);
    records.forEach((record) => { record.outcome.expertConfirmed.blinded = false; });
    const analysis = analyzeRefinementStudy(records, { bootstrapIterations: 200 });
    expect(analysis.estimands.confirmatoryProspectiveHeldOut.expertConfirmed.status).toBe('no_eligible_documents');
    expect(analysis.estimands.confirmatoryProspectiveHeldOut.expertConfirmed.excludedByReason)
      .toMatchObject({ expert_review_not_blinded: 2 });
    expect(analysis.estimands.confirmatoryProspectiveHeldOut.automatedSurrogates.status).toBe('insufficient_documents');
  });
});

describe('MCP refinement study integrity and compatibility', () => {
  it('detects aliases, duplicate observations, and nested repetitions without inflating document n', () => {
    const repetitions = pairedDocuments(2, { repetitions: 3 });
    const integrity = inspectStudyIntegrity(repetitions);
    expect(integrity.recordCount).toBe(12);
    expect(integrity.uniqueDocumentCount).toBe(2);
    expect(integrity.pseudoreplication).toMatchObject({
      detectedNestedRepetitions: true,
      unitOfAnalysis: 'source_document_sha256',
      maximumReplicatesPerDocument: 3,
    });
    const analysis = analyzeRefinementStudy(repetitions, { bootstrapIterations: 200 });
    expect(analysis.estimands.confirmatoryProspectiveHeldOut.expertConfirmed.documentCount).toBe(2);
    expect(analysis.estimands.confirmatoryProspectiveHeldOut.expertConfirmed.eligiblePairedReplicateCount).toBe(6);
    expect(analysis.estimands.confirmatoryProspectiveHeldOut.expertConfirmed.metrics.passRateDifference.documentCount).toBe(2);

    const aliased = pairedDocuments(2);
    aliased[2].document.sourceSha256 = aliased[0].document.sourceSha256;
    expect(() => analyzeRefinementStudy(aliased, { bootstrapIterations: 200 }))
      .toThrowError(expect.objectContaining({ code: 'STUDY_INTEGRITY_VIOLATION' }));
  });

  it('refuses engine, model, shared-option, and non-loop condition-option drift', () => {
    const mutations = [
      (record) => { record.protocol.engine.name = 'different-engine'; },
      (record) => { record.protocol.model.primary = 'different-model'; record.protocol.model.fallback = 'different-model'; },
      (record) => { record.protocol.sharedOptions.site = 'different-site'; },
      (record) => { record.protocol.conditionOptions.targetScore = 99; },
    ];
    for (const mutate of mutations) {
      const records = pairedDocuments(2);
      mutate(records.at(-1));
      expect(() => analyzeRefinementStudy(records, { bootstrapIterations: 200 }))
        .toThrowError(expect.objectContaining({ code: 'INCOMPATIBLE_STUDY_RECORDS' }));
    }
  });
});

describe('paired document-level effectiveness analysis', () => {
  it('separates confirmatory expert outcomes from automated surrogates and reports telemetry', () => {
    const analysis = analyzeRefinementStudy(pairedDocuments(3), {
      bootstrapSeed: 42,
      bootstrapIterations: 500,
    });
    expect(analysis.schema).toBe(ANALYSIS_SCHEMA_ID);
    expect(analysis.estimands.confirmatoryProspectiveHeldOut.primaryEffectivenessStatus).toBe('insufficient_documents');
    expect(analysis.estimands.confirmatoryProspectiveHeldOut.expertConfirmed.outcomeRole).toBe('primary_effectiveness');
    expect(analysis.estimands.confirmatoryProspectiveHeldOut.automatedSurrogates.outcomeRole).toBe('automated_surrogate_only');
    expect(analysis.estimands.confirmatoryProspectiveHeldOut.expertConfirmed.metrics).toMatchObject({
      safeMaterialResolutionRateDifference: { estimate: 0.5, documentCount: 3 },
      materialDefectReduction: { estimate: 2, documentCount: 3 },
      criticalSeriousResolutionDifference: { estimate: 3, documentCount: 3 },
      passRateDifference: { estimate: 1, documentCount: 3 },
    });
    expect(analysis.estimands.confirmatoryProspectiveHeldOut.automatedSurrogates.metrics).toMatchObject({
      scoreChangeDifference: { estimate: 10, documentCount: 3 },
      finalScoreDifference: { estimate: 10, documentCount: 3 },
      openIssueReduction: { estimate: 2, documentCount: 3 },
      introducedDefectReduction: { estimate: 1, documentCount: 3 },
    });
    expect(analysis.engineeringValidation.conditions.gated_loop).toMatchObject({
      rounds: { attempted: 6, accepted: 3, reverted: 3 },
    });
    expect(analysis.engineeringValidation.conditions.gated_loop.usage.costUsd.total).toBeCloseTo(0.6);
    expect(analysis.limitations.join(' | ')).toContain('provider_default_sampling_uncontrolled');
  });

  it('summarizes scripted records as engineering evidence but excludes them from every effect estimate', () => {
    const scripted = pairedDocuments(2, {
      providerClass: 'scripted',
      evidenceClass: 'infrastructure_only',
      effectivenessEligible: false,
      partition: 'safety',
      expert: null,
    });
    const analysis = analyzeRefinementStudy(scripted, { bootstrapIterations: 200 });
    expect(analysis.engineeringValidation).toMatchObject({
      observationCount: 4,
      uniqueDocumentCount: 2,
      byProviderClass: { live: 0, scripted: 4, synthetic: 0 },
      causalEffectUsePermitted: false,
    });
    expect(analysis.estimands.confirmatoryProspectiveHeldOut.expertConfirmed.status).toBe('no_eligible_documents');
    expect(analysis.estimands.confirmatoryProspectiveHeldOut.automatedSurrogates.status).toBe('no_eligible_documents');
    expect(analysis.estimands.developmentDescriptive.automatedSurrogates.status).toBe('no_eligible_documents');
  });

  it('excludes live descriptive pairs when fallback substitution is possible but actual model use is untraced', () => {
    const records = pairedDocuments(2, {
      partition: 'development_pilot', evidenceClass: 'development_descriptive', effectivenessEligible: false,
    });
    for (const record of records) {
      record.protocol.model.fallback = 'different-fallback';
      record.protocol.model.fallbackEnabled = true;
    }
    const analysis = analyzeRefinementStudy(records, { bootstrapIterations: 200 });
    expect(analysis.estimands.developmentDescriptive.automatedSurrogates).toMatchObject({
      status: 'no_eligible_documents',
      excludedByReason: { actual_model_trace_incomplete: 2 },
    });
  });
  it('labels development data descriptive and never promotes it to held-out evidence', () => {
    const records = pairedDocuments(2, {
      partition: 'development_pilot',
      evidenceClass: 'development_descriptive',
      effectivenessEligible: false,
    });
    const analysis = analyzeRefinementStudy(records, { bootstrapIterations: 200 });
    expect(analysis.estimands.confirmatoryProspectiveHeldOut.expertConfirmed.status).toBe('no_eligible_documents');
    expect(analysis.estimands.developmentDescriptive.publicationRole).toBe('descriptive_internal_evidence_not_confirmatory');
    expect(analysis.estimands.developmentDescriptive.expertConfirmed.status).toBe('estimated');
  });

  it('returns explicit zero-result and insufficient-document states with no fabricated interval', () => {
    const empty = analyzeRefinementStudy([], { bootstrapIterations: 200 });
    expect(empty.compatibility.status).toBe('not_applicable');
    expect(empty.estimands.confirmatoryProspectiveHeldOut.expertConfirmed).toMatchObject({
      status: 'no_eligible_documents', documentCount: 0,
    });

    const oneDocument = analyzeRefinementStudy(pairedDocuments(1), { bootstrapIterations: 200 });
    const metric = oneDocument.estimands.confirmatoryProspectiveHeldOut.expertConfirmed.metrics.passRateDifference;
    expect(metric).toMatchObject({ status: 'insufficient_documents', documentCount: 1, estimate: 1 });
    expect(metric.confidenceInterval).toBeNull();
  });

  it('enforces the protocol-fixed 12-document confirmatory floor', () => {
    const eleven = analyzeRefinementStudy(pairedDocuments(11), { bootstrapIterations: 200 });
    const belowFloor = eleven.estimands.confirmatoryProspectiveHeldOut.expertConfirmed
      .metrics.safeMaterialResolutionRateDifference;
    expect(belowFloor).toMatchObject({ status: 'insufficient_documents', documentCount: 11 });
    expect(belowFloor.confidenceInterval).toBeNull();

    const twelve = analyzeRefinementStudy(pairedDocuments(12), { bootstrapIterations: 200 });
    expect(twelve.estimands.confirmatoryProspectiveHeldOut.expertConfirmed
      .metrics.safeMaterialResolutionRateDifference.status).toBe('estimated');
  });

  it('excludes expert pairs whose shared baseline denominator or adjudication hash disagrees', () => {
    const records = pairedDocuments(2);
    const gated = records.find((record) => record.document.documentId === 'doc-1'
      && record.condition.kind === 'gated_loop');
    gated.outcome.expertConfirmed.baselineMaterialIssueCount = 12;
    gated.outcome.expertConfirmed.baselineAdjudicationSha256 = 'e'.repeat(64);
    const analysis = analyzeRefinementStudy(records, { bootstrapIterations: 200 });
    expect(analysis.estimands.confirmatoryProspectiveHeldOut.expertConfirmed).toMatchObject({
      documentCount: 1,
      excludedByReason: { baseline_issue_denominator_mismatch: 1 },
    });
  });
  it('uses a reproducible statistical bootstrap seed and reports it as unrelated to model sampling', () => {
    const input = [1, -1, 4, 2];
    const first = bootstrapPairedMean(input, { seed: 99, iterations: 1000 });
    const second = bootstrapPairedMean(input, { seed: 99, iterations: 1000 });
    expect(second).toEqual(first);
    expect(first.status).toBe('estimated');

    const analysis = analyzeRefinementStudy(pairedDocuments(2), { bootstrapSeed: 99, bootstrapIterations: 200 });
    expect(analysis.parameters.bootstrapSeedRole).toBe('statistical_resampling_only_not_model_generation');
  });

  it('renders a report that keeps engineering, surrogate, and expert claims visibly distinct', () => {
    const markdown = renderMarkdownReport(analyzeRefinementStudy(pairedDocuments(2), { bootstrapIterations: 200 }));
    expect(markdown).toContain('Primary expert-confirmed effectiveness status');
    expect(markdown).toContain('Automated scores and validator counts are surrogate outcomes');
    expect(markdown).toContain('Scripted and synthetic runs are engineering evidence only');
    expect(markdown).toContain('Engineering telemetry by condition');
    expect(markdown).toContain('provider_default_sampling_uncontrolled');
  });
});
