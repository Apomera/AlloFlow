// PD core logic — unit tests.
//
// Pins the genuinely-new logic behind community PD modules: the pd_module
// validator, the normalized per-activity result contract, the gate evaluator,
// and the (honestly-labelled) completion-record builder. Also validates the
// shipped seed module + manifest so a malformed seed can never reach the app.
//
// pd_core_module.js is a browser IIFE that registers on window.AlloModules.PdCore
// (and module.exports). We load it the proven render-smoke way — read the
// source, eval with a stubbed window — so this works regardless of ESM/CJS.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();

function loadPdCore() {
  const src = fs.readFileSync(path.join(ROOT, 'pd_core_module.js'), 'utf8');
  const win = {};
  const mod = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('window', 'module', src)(win, mod);
  return win.AlloModules.PdCore;
}

const PD = loadPdCore();

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

// A minimal valid module fixture for the logic tests.
function fixtureModule() {
  return {
    schema_version: 'pd-1.0',
    kind: 'pd_module',
    metadata: { id: 'fix', title: 'Fixture', topic: 'Test' },
    sections: [
      { title: 'S1', activities: [
        { id: 'r1', type: 'read', title: 'Read', content: { body: 'hi' }, gate: { kind: 'none' } },
        { id: 'q1', type: 'quiz', title: 'Quiz', gate: { kind: 'score', threshold: 0.75 }, content: { questions: [
          { prompt: 'a', options: ['x', 'y'], correctIndex: 0 },
          { prompt: 'b', options: ['x', 'y'], correctIndex: 1 },
          { prompt: 'c', options: ['x', 'y'], correctIndex: 0 },
          { prompt: 'd', options: ['x', 'y'], correctIndex: 1 }
        ] } },
        { id: 'f1', type: 'reflect', title: 'Reflect', content: { prompt: 'why?' }, gate: { kind: 'none' } }
      ] }
    ]
  };
}

describe('validatePdModule', () => {
  it('accepts a well-formed module', () => {
    const v = PD.validatePdModule(fixtureModule());
    expect(v.ok).toBe(true);
    expect(v.stats).toEqual({ sections: 1, activities: 3, gated: 1 });
  });

  it('accepts a JSON string too', () => {
    expect(PD.validatePdModule(JSON.stringify(fixtureModule())).ok).toBe(true);
  });

  it('rejects wrong kind', () => {
    const m = fixtureModule(); m.kind = 'lesson';
    expect(PD.validatePdModule(m).ok).toBe(false);
  });

  it('requires the exact supported schema version and a stable module id', () => {
    const wrongVersion = fixtureModule(); wrongVersion.schema_version = 'pd-2.0';
    expect(PD.validatePdModule(wrongVersion).error).toMatch(/unsupported schema_version/i);

    const missingId = fixtureModule(); delete missingId.metadata.id;
    expect(PD.validatePdModule(missingId).error).toMatch(/metadata\.id/);

    const unstableId = fixtureModule(); unstableId.metadata.id = 'spaces are not stable';
    expect(PD.validatePdModule(unstableId).error).toMatch(/metadata\.id/);
  });

  it('validates required activity content and rejects executable URLs', () => {
    const missingReadBody = fixtureModule(); missingReadBody.sections[0].activities[0].content.body = '  ';
    expect(PD.validatePdModule(missingReadBody).error).toMatch(/content\.body/);

    const missingReflectPrompt = fixtureModule(); delete missingReflectPrompt.sections[0].activities[2].content.prompt;
    expect(PD.validatePdModule(missingReflectPrompt).error).toMatch(/content\.prompt/);

    const unsafeLink = fixtureModule();
    unsafeLink.sections[0].activities[0].content.links = [{ label: 'Run', url: 'javascript:alert(1)' }];
    expect(PD.validatePdModule(unsafeLink).error).toMatch(/safe URL/i);
  });

  it('rejects a quiz with no answer key (uncompletable)', () => {
    const m = fixtureModule();
    delete m.sections[0].activities[1].content.questions[0].correctIndex;
    const v = PD.validatePdModule(m);
    expect(v.ok).toBe(false);
    expect(v.error).toMatch(/correctIndex/);
  });

  it('rejects a score gate on a non-scorable (read) activity', () => {
    const m = fixtureModule();
    m.sections[0].activities[0].gate = { kind: 'score', threshold: 0.8 };
    const v = PD.validatePdModule(m);
    expect(v.ok).toBe(false);
    expect(v.error).toMatch(/produces no score/);
  });

  it('rejects a score gate with an out-of-range threshold', () => {
    const m = fixtureModule();
    m.sections[0].activities[1].gate.threshold = 1.5;
    expect(PD.validatePdModule(m).ok).toBe(false);
  });

  it('rejects duplicate activity ids', () => {
    const m = fixtureModule();
    m.sections[0].activities[2].id = 'r1';
    expect(PD.validatePdModule(m).ok).toBe(false);
  });

  it('validates optional paste policy and requires an accessible restriction path', () => {
    const monitored = fixtureModule();
    monitored.assessmentPolicy = { paste: { mode: 'monitored' } };
    expect(PD.validatePdModule(monitored).ok).toBe(true);

    const restricted = fixtureModule();
    restricted.sections[0].activities[2].assessmentPolicy = { paste: { mode: 'restricted' } };
    expect(PD.validatePdModule(restricted).error).toMatch(/accessibleAlternative or accommodationContact/);
    restricted.sections[0].activities[2].assessmentPolicy.paste.accessibleAlternative = 'Learner may submit an audio response.';
    expect(PD.validatePdModule(restricted).ok).toBe(true);

    const invalid = fixtureModule(); invalid.assessmentPolicy = { paste: { mode: 'blocked' } };
    expect(PD.validatePdModule(invalid).error).toMatch(/allowed, monitored, or restricted/);
  });
});

describe('normalizeResult', () => {
  const m = fixtureModule();
  const readAct = m.sections[0].activities[0];
  const quizAct = m.sections[0].activities[1];
  const reflectAct = m.sections[0].activities[2];

  it('read is complete only when acknowledged', () => {
    expect(PD.normalizeResult(readAct, {}).completed).toBe(false);
    expect(PD.normalizeResult(readAct, { acknowledged: true }).completed).toBe(true);
  });

  it('quiz scores answers but requires explicit submission to complete and pass', () => {
    const all = PD.normalizeResult(quizAct, { answers: [0, 1, 0, 1] });
    expect(all.score).toBe(1);
    expect(all.completed).toBe(false);
    expect(PD.evaluateGate(quizAct, all)).toMatchObject({ passed: false, reason: 'incomplete' });

    const submitted = PD.normalizeResult(quizAct, { answers: [0, 1, 0, 1], submitted: true });
    expect(submitted.completed).toBe(true);
    expect(PD.evaluateGate(quizAct, submitted).passed).toBe(true);

    const half = PD.normalizeResult(quizAct, { answers: [0, 0, 0, 1], submitted: true });
    expect(half.score).toBe(0.75);
    const partial = PD.normalizeResult(quizAct, { answers: [0, 1], submitted: true });
    expect(partial.completed).toBe(false);
  });

  it('reflect is complete only with non-empty text', () => {
    expect(PD.normalizeResult(reflectAct, { text: '   ' }).completed).toBe(false);
    expect(PD.normalizeResult(reflectAct, { text: 'I will add a diagram.' }).completed).toBe(true);
  });
});

describe('evaluateGate', () => {
  const m = fixtureModule();
  const quizAct = m.sections[0].activities[1];
  const readAct = m.sections[0].activities[0];

  it('incomplete never passes', () => {
    expect(PD.evaluateGate(quizAct, { completed: false, score: 1 }).passed).toBe(false);
  });

  it('none-gate passes when completed', () => {
    expect(PD.evaluateGate(readAct, { completed: true, score: null }).passed).toBe(true);
  });

  it('score gate passes at/above threshold, fails below', () => {
    expect(PD.evaluateGate(quizAct, { completed: true, score: 0.75, raw: { submitted: true } }).passed).toBe(true);
    expect(PD.evaluateGate(quizAct, { completed: true, score: 0.5, raw: { submitted: true } }).passed).toBe(false);
  });

  it('defensively rejects a hand-constructed quiz result without submission evidence', () => {
    expect(PD.evaluateGate(quizAct, { completed: true, score: 1 }).reason).toBe('unsubmitted');
  });

  it('score gate with no score fails', () => {
    expect(PD.evaluateGate(quizAct, { completed: true, score: null, raw: { submitted: true } }).passed).toBe(false);
  });
});

describe('evaluateModule + buildCompletionRecord', () => {
  const m = fixtureModule();

  function results(quizScore, reflectDone, readDone) {
    return {
      r1: { completed: readDone, score: null },
      q1: { completed: true, score: quizScore, raw: { submitted: true } },
      f1: { completed: reflectDone, score: null }
    };
  }

  it('is complete only when every activity passes', () => {
    const good = PD.evaluateModule(m, results(1, true, true));
    expect(good.complete).toBe(true);
    expect(good.passed).toBe(3);
    expect(good.gatedTotal).toBe(1);

    const failQuiz = PD.evaluateModule(m, results(0.5, true, true));
    expect(failQuiz.complete).toBe(false);

    const skipReflect = PD.evaluateModule(m, results(1, false, true));
    expect(skipReflect.complete).toBe(false);
  });

  it('builds an honestly-labelled, deterministic completion record', () => {
    const rec = PD.buildCompletionRecord(m, results(1, true, true), { name: ' Pat ', email: 'do-not-export@example.test', secret: { id: 7 } }, '2026-06-19T00:00:00.000Z');
    expect(rec.schema_version).toBe('pd-completion-1.0');
    expect(rec.moduleVersion).toBe(null);
    expect(rec.contentDigest).toBe(PD.moduleContentDigest(m));
    expect(rec.contentDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(rec.complete).toBe(true);
    expect(rec.completedAt).toBe('2026-06-19T00:00:00.000Z');
    expect(rec.issuer.kind).toBe('self-paced');
    expect(rec.issuer.verified).toBe(false);
    expect(rec.issuer.note).toMatch(/not an accredited credential/i);
    expect(rec.learner).toEqual({ name: 'Pat' });
    expect(rec.perActivity).toHaveLength(3);
  });

  it('captures learner responses (reflection / commitments / sim) as a portfolio', () => {
    const mod = {
      schema_version: 'pd-1.0', kind: 'pd_module', metadata: { id: 'm', title: 'M' },
      sections: [{ title: 'S', activities: [
        { id: 'r', type: 'reflect', title: 'Reflect', content: { prompt: '?' }, gate: { kind: 'none' } },
        { id: 'c', type: 'checklist', title: 'Commit', content: { items: ['A', 'B', 'C'] }, gate: { kind: 'none' } },
        { id: 's', type: 'sim', title: 'Scenario', content: { scenario: 'x' }, gate: { kind: 'none' } },
      ] }],
    };
    const r = {
      r: PD.normalizeResult(mod.sections[0].activities[0], { text: 'my reflection' }),
      c: PD.normalizeResult(mod.sections[0].activities[1], { checked: [true, false, true] }),
      s: PD.normalizeResult(mod.sections[0].activities[2], { response: 'my response', masteryScore: 70, feedback: 'good', qualitativeAnalysis: { strengths: ['Uses evidence'], growthAreas: ['Add a follow-up'], criterionEvidence: [{ criterion: 'Empathy', assessment: 'developing', evidence: 'Listens first', feedback: 'Check understanding' }], unknown: 'discard me' } }),
    };
    const rec = PD.buildCompletionRecord(mod, r, { name: 'Pat' }, '2026-06-20T00:00:00.000Z');
    const byType = {}; rec.responses.forEach((x) => { byType[x.type] = x; });
    expect(byType.reflect.response).toBe('my reflection');
    expect(byType.checklist.response).toEqual(['A', 'C']);   // only checked items
    expect(byType.sim.response).toBe('my response');
    expect(byType.sim.masteryScore).toBe(70);
    expect(byType.sim.qualitativeAnalysis).toEqual({
      strengths: ['Uses evidence'],
      growthAreas: ['Add a follow-up'],
      criterionEvidence: [{ criterion: 'Empathy', assessment: 'developing', evidence: 'Listens first', feedback: 'Check understanding' }],
    });
    expect(JSON.stringify(byType.sim)).not.toContain('discard me');
  });

  it('bounds and allow-lists AI-assisted qualitative analysis', () => {
    const criterionItems = [{
      criterion: ' Alignment ',
      assessment: 'unsupported-value',
      evidence: 'e'.repeat(1200),
      feedback: 'f'.repeat(1200),
      extra: 'secret',
    }].concat(Array.from({ length: 14 }, (_, i) => ({
      criterion: 'Criterion ' + i,
      assessment: 'met',
      evidence: 'evidence',
      feedback: 'feedback',
    })));
    const analysis = PD.sanitizeQualitativeAnalysis({
      strengths: [' Specific evidence '].concat(Array.from({ length: 10 }, (_, i) => 'Strength ' + i)),
      growthAreas: [null, ' Next step '],
      criterionEvidence: criterionItems,
      injected: 'discard',
    });
    expect(analysis.strengths).toHaveLength(8);
    expect(analysis.strengths[0]).toBe('Specific evidence');
    expect(analysis.growthAreas).toEqual(['Next step']);
    expect(analysis.criterionEvidence).toHaveLength(12);
    expect(analysis.criterionEvidence[0]).toEqual({
      criterion: 'Alignment', assessment: 'not-assessed',
      evidence: 'e'.repeat(1000), feedback: 'f'.repeat(1000),
    });
    expect(JSON.stringify(analysis)).not.toMatch(/secret|discard/);
    expect(PD.sanitizeQualitativeAnalysis({ injected: 'only unknown data' })).toBeNull();
  });

  it('keeps integrity event metadata but never copies pasted text', () => {
    const mod = fixtureModule();
    mod.assessmentPolicy = { paste: { mode: 'monitored' } };
    const raw = {
      text: 'My reflection',
      integrityEvents: [{
        type: 'paste', timestamp: '2026-07-16T12:00:00Z', charCount: 120,
        wordCount: 20, blocked: false, fieldId: 'reflection-1',
        pastedText: 'NEVER STORE THIS', clipboardText: 'NEVER STORE THIS'
      }]
    };
    const r = { f1: PD.normalizeResult(mod.sections[0].activities[2], raw) };
    const rec = PD.buildCompletionRecord(mod, r, { name: 'Pat' }, '2026-07-16T12:01:00Z');
    expect(rec.integrityEvents).toEqual([{
      activityId: 'f1', eventType: 'paste', policyMode: 'monitored',
      occurredAt: '2026-07-16T12:00:00Z', characterCount: 120,
      wordCount: 20, blocked: false, fieldId: 'reflection-1'
    }]);
    expect(JSON.stringify(rec.integrityEvents)).not.toContain('NEVER STORE THIS');
  });
});

describe('pd-review-candidate-1.0 evidence packages', () => {
  const NOW = '2026-07-16T18:00:00Z';

  function reviewModule() {
    return {
      schema_version: 'pd-1.0',
      kind: 'pd_module',
      metadata: { id: 'review-fixture', version: '1.2.0', language: 'en-US', title: 'Review fixture', topic: 'Practice' },
      assessmentPolicy: { paste: { mode: 'monitored' } },
      sections: [{ title: 'Apply', activities: [
        { id: 'read-one', type: 'read', title: 'Read', content: { body: 'Read this.' }, gate: { kind: 'none' } },
        { id: 'reflect-one', type: 'reflect', title: 'Reflect', content: { prompt: 'What changed?' }, gate: { kind: 'none' } },
        { id: 'commit-one', type: 'checklist', title: 'Commit', content: { items: ['Try captions', 'Offer a transcript'] }, gate: { kind: 'none' } },
        { id: 'sim-one', type: 'sim', title: 'Scenario', content: { scenario: 'Respond to a learner.', rubric: 'Name an accessible next step.' }, gate: { kind: 'none' } },
      ] }],
    };
  }

  function reviewResults(mod, overrides = {}) {
    const acts = Object.fromEntries(mod.sections[0].activities.map((act) => [act.id, act]));
    const raw = {
      'read-one': { acknowledged: true },
      'reflect-one': {
        text: 'I will offer equivalent ways to engage.',
        integrityEvents: [{
          type: 'paste', timestamp: '2026-07-16T17:59:00Z', charCount: 18, wordCount: 4,
          blocked: false, fieldId: 'reflect-one-reflect', clipboardText: 'NEVER EXPORT THIS',
        }],
      },
      'commit-one': { checked: [true, false] },
      'sim-one': {
        response: 'I would ask which accessible format works.',
        masteryScore: 84,
        feedback: 'Specific and practical.',
        qualitativeAnalysis: {
          strengths: ['Names an accessible option'],
          growthAreas: ['Add a follow-up'],
          criterionEvidence: [{ criterion: 'Access', assessment: 'met', evidence: 'Offers a format choice.', feedback: 'Keep checking access.' }],
        },
      },
      ...overrides,
    };
    return Object.fromEntries(Object.keys(acts).map((id) => [id, PD.normalizeResult(acts[id], raw[id] || {})]));
  }

  function build(options = {}) {
    const mod = reviewModule();
    const results = reviewResults(mod);
    return {
      mod,
      result: PD.buildReviewCandidatePackage(mod, results, {
        consent: { granted: true, grantedAt: NOW },
        includeAiAnalysis: true,
        includeIntegritySummary: true,
        learner: { name: 'Pat', email: 'never@example.test' },
        ...options,
      }, NOW),
    };
  }

  function rehashPackage(pkg) {
    pkg.package_digest = PD.reviewCandidateDigest(pkg);
    return pkg;
  }

  function rehashArtifactAndPackage(pkg, artifact) {
    artifact.digest = PD.reviewArtifactDigest(artifact);
    return rehashPackage(pkg);
  }

  it('builds deterministic, exact-bound, unverified evidence with explicit source labels', () => {
    const first = build();
    const second = build();
    expect(first.result.ok).toBe(true);
    expect(second.result).toEqual(first.result);

    const pkg = first.result.package;
    expect(pkg).toMatchObject({
      schema_version: 'pd-review-candidate-1.0',
      kind: 'pd_review_candidate',
      trust_model: 'learner-device-unverified',
      purpose: 'human-review-candidate',
      module: {
        id: 'review-fixture', version: '1.2.0', language: 'en-US',
        content_digest: PD.moduleContentDigest(first.mod),
        activity_ids: ['read-one', 'reflect-one', 'commit-one', 'sim-one'],
      },
      consent: {
        notice_version: 'pd-review-candidate-consent-1.0',
        notice_locale: 'en-US',
        notice_payload: PD.reviewConsentNotice('en-US'),
      },
      privacy_manifest: {
        structured_identity_fields_included: false,
        raw_clipboard_events_included: false,
        raw_clipboard_content_included: false,
        free_text_may_contain_personal_data: true,
        learner_response_text_included: true,
        exact_event_times_included: false,
        field_identifiers_included: false,
        ai_advisory_analysis_included: true,
        integrity_summary_included: true,
      },
    });
    expect(pkg.package_digest).toBe(PD.reviewCandidateDigest(pkg));
    expect(PD.validateReviewCandidatePackage(pkg)).toEqual({ ok: true });
    expect(Object.prototype.hasOwnProperty.call(pkg, 'learner')).toBe(false);

    const learnerArtifact = pkg.artifacts.find((a) => a.kind === 'learner-response');
    expect(learnerArtifact).toMatchObject({
      source: 'learner-provided-unverified',
      provenance: { capture: 'learner-device', verified: false },
    });
    const checklistArtifact = pkg.artifacts.find((a) => a.kind === 'learner-selection-of-module-authored-options');
    expect(checklistArtifact).toMatchObject({
      source: 'learner-provided-unverified', value: ['Try captions'],
      provenance: { capture: 'learner-device', verified: false },
    });
    const aiArtifact = pkg.artifacts.find((a) => a.kind === 'ai-advisory-analysis');
    expect(aiArtifact).toMatchObject({
      source: 'ai-assisted-advisory',
      provenance: { advisory: true, provider: 'not-recorded', model: 'not-recorded', human_review_required: true },
    });

    expect(pkg.integrity_summary.activities).toEqual([{
      activity_id: 'reflect-one', policy_mode: 'monitored', event_count: 1,
      blocked_event_count: 0, character_count: 18, word_count: 4,
    }]);
    expect(JSON.stringify(pkg.integrity_summary)).not.toMatch(/timestamp|fieldId|clipboard/i);
    const serialized = JSON.stringify(pkg);
    expect(serialized).not.toContain('NEVER EXPORT THIS');
    expect(serialized).not.toContain('never@example.test');
    expect(serialized).not.toMatch(/"satisfied"|credential/i);
  });

  it('keeps AI analysis and integrity summaries off unless each optional scope is explicitly selected', () => {
    const mod = reviewModule();
    const result = PD.buildReviewCandidatePackage(mod, reviewResults(mod), {
      consent: { granted: true, grantedAt: NOW },
    }, NOW);
    expect(result.ok).toBe(true);
    const pkg = result.package;
    expect(pkg.consent.scopes).toEqual(['learner-response-evidence']);
    expect(pkg.artifacts.some((a) => a.kind === 'ai-advisory-analysis')).toBe(false);
    expect(pkg.integrity_summary).toBeNull();
    expect(pkg.privacy_manifest).toMatchObject({
      ai_advisory_analysis_included: false, integrity_summary_included: false,
    });
    expect(PD.validateReviewCandidatePackage(pkg)).toEqual({ ok: true });
  });

  it('rejects hidden AI advisory properties instead of silently sanitizing them', () => {
    const mod = reviewModule();
    let results = reviewResults(mod, {
      'sim-one': {
        response: 'answer', masteryScore: 80, feedback: 'advisory',
        qualitativeAnalysis: { strengths: ['Specific'], hiddenPrivateField: 'do not accept' },
      },
    });
    expect(PD.buildReviewCandidatePackage(mod, results, {
      consent: { granted: true, grantedAt: NOW }, includeAiAnalysis: true,
    }, NOW)).toMatchObject({ ok: false, code: 'invalid_ai_analysis' });

    results = reviewResults(mod, {
      'sim-one': {
        response: 'answer', masteryScore: 80, feedback: 'advisory',
        qualitativeAnalysis: {
          criterionEvidence: [{ criterion: 'Access', assessment: 'met', hiddenPrivateField: 'do not accept' }],
        },
      },
    });
    expect(PD.buildReviewCandidatePackage(mod, results, {
      consent: { granted: true, grantedAt: NOW }, includeAiAnalysis: true,
    }, NOW)).toMatchObject({ ok: false, code: 'oversized_ai_analysis' });
  });

  it('fails closed without consent, completion, version, or language binding', () => {
    const mod = reviewModule();
    const results = reviewResults(mod);
    expect(PD.buildReviewCandidatePackage(mod, results, { consent: { granted: false, grantedAt: NOW } }, NOW))
      .toMatchObject({ ok: false, code: 'explicit_consent_required' });

    expect(PD.buildReviewCandidatePackage(mod, results, {
      consent: { granted: true, grantedAt: '2026-07-16T18:00:01Z' },
    }, NOW)).toMatchObject({ ok: false, code: 'invalid_consent_time' });

    mod.metadata.language = 'en--US';
    expect(PD.buildReviewCandidatePackage(mod, results, { consent: { granted: true, grantedAt: NOW } }, NOW))
      .toMatchObject({ ok: false, code: 'module_language_required' });
    mod.metadata.language = 'en-US';

    const incomplete = reviewResults(mod, { 'reflect-one': { text: '' } });
    expect(PD.buildReviewCandidatePackage(mod, incomplete, { consent: { granted: true, grantedAt: NOW } }, NOW))
      .toMatchObject({ ok: false, code: 'incomplete_module' });

    delete mod.metadata.version;
    expect(PD.buildReviewCandidatePackage(mod, results, { consent: { granted: true, grantedAt: NOW } }, NOW))
      .toMatchObject({ ok: false, code: 'module_version_required' });
    mod.metadata.version = '1.2.0';
    delete mod.metadata.language;
    expect(PD.buildReviewCandidatePackage(mod, results, { consent: { granted: true, grantedAt: NOW } }, NOW))
      .toMatchObject({ ok: false, code: 'module_language_required' });
  });

  it('hard-rejects oversized response, AI, and integrity data', () => {
    const mod = reviewModule();
    let results = reviewResults(mod, { 'reflect-one': { text: 'x'.repeat(20001) } });
    expect(PD.buildReviewCandidatePackage(mod, results, { consent: { granted: true, grantedAt: NOW } }, NOW))
      .toMatchObject({ ok: false, code: 'response_too_large' });

    results = reviewResults(mod, { 'sim-one': { response: 'answer', masteryScore: 80, feedback: 'x'.repeat(2001) } });
    expect(PD.buildReviewCandidatePackage(mod, results, { consent: { granted: true, grantedAt: NOW }, includeAiAnalysis: true }, NOW))
      .toMatchObject({ ok: false, code: 'oversized_ai_analysis' });

    const many = Array.from({ length: PD.MAX_COMPLETION_INTEGRITY_EVENTS + 1 }, () => ({ type: 'paste', charCount: 1, wordCount: 1 }));
    results = reviewResults(mod, { 'reflect-one': { text: 'answer', integrityEvents: many } });
    expect(PD.buildReviewCandidatePackage(mod, results, {
      consent: { granted: true, grantedAt: NOW }, includeIntegritySummary: true,
    }, NOW)).toMatchObject({ ok: false, code: 'integrity_event_limit' });

    results = reviewResults(mod, {
      'reflect-one': { text: 'answer', integrityEvents: [{ type: 'paste', charCount: PD.REVIEW_MAX_INTEGRITY_CHARS_PER_EVENT + 1 }] },
    });
    expect(PD.buildReviewCandidatePackage(mod, results, {
      consent: { granted: true, grantedAt: NOW }, includeIntegritySummary: true,
    }, NOW)).toMatchObject({ ok: false, code: 'invalid_integrity_count' });

    const aggregateTooLarge = Array.from({ length: 6 }, () => ({ type: 'paste', charCount: 90000, wordCount: 1 }));
    results = reviewResults(mod, { 'reflect-one': { text: 'answer', integrityEvents: aggregateTooLarge } });
    expect(PD.buildReviewCandidatePackage(mod, results, {
      consent: { granted: true, grantedAt: NOW }, includeIntegritySummary: true,
    }, NOW)).toMatchObject({ ok: false, code: 'integrity_count_limit' });
  });

  it('detects artifact and package tampering', () => {
    const pkg = build().result.package;
    const tampered = JSON.parse(JSON.stringify(pkg));
    tampered.artifacts.find((a) => a.kind === 'learner-response').value = 'changed';
    expect(PD.validateReviewCandidatePackage(tampered)).toMatchObject({ ok: false, code: 'invalid_artifact' });
    expect(PD.reviewCandidateDigest(tampered)).not.toBe(pkg.package_digest);
  });

  it('rejects rehashed activity/artifact semantic tampering rather than relying only on stale digests', () => {
    let pkg = JSON.parse(JSON.stringify(build().result.package));
    const reflectActivity = pkg.activities.find((a) => a.activity_id === 'reflect-one');
    reflectActivity.type = 'quiz';
    reflectActivity.client_observation.score = 0.5;
    reflectActivity.client_observation.score_interpretation = 'module-answer-key';
    rehashPackage(pkg);
    expect(PD.validateReviewCandidatePackage(pkg)).toMatchObject({ ok: false, code: 'invalid_artifact' });

    pkg = JSON.parse(JSON.stringify(build().result.package));
    const moved = pkg.artifacts.find((a) => a.kind === 'learner-response' && a.activity_id === 'reflect-one');
    pkg.activities.find((a) => a.activity_id === 'reflect-one').artifact_refs = [];
    pkg.activities.find((a) => a.activity_id === 'read-one').artifact_refs = [moved.artifact_id];
    moved.activity_id = 'read-one';
    rehashArtifactAndPackage(pkg, moved);
    expect(PD.validateReviewCandidatePackage(pkg)).toMatchObject({ ok: false, code: 'invalid_artifact' });
  });

  it('requires the expected learner evidence even after a package digest is recomputed', () => {
    const pkg = JSON.parse(JSON.stringify(build().result.package));
    const reflectArtifact = pkg.artifacts.find((a) => a.kind === 'learner-response' && a.activity_id === 'reflect-one');
    pkg.artifacts = pkg.artifacts.filter((a) => a.artifact_id !== reflectArtifact.artifact_id);
    const reflectActivity = pkg.activities.find((a) => a.activity_id === 'reflect-one');
    reflectActivity.artifact_refs = reflectActivity.artifact_refs.filter((id) => id !== reflectArtifact.artifact_id);
    rehashPackage(pkg);
    expect(PD.validateReviewCandidatePackage(pkg)).toMatchObject({ ok: false, code: 'required_evidence_missing' });
  });

  it('binds consent text/locale and language syntax even when an attacker recomputes the package digest', () => {
    let pkg = JSON.parse(JSON.stringify(build().result.package));
    pkg.consent.notice_payload.privacy += ' changed';
    rehashPackage(pkg);
    expect(PD.validateReviewCandidatePackage(pkg)).toMatchObject({ ok: false, code: 'invalid_consent' });

    pkg = JSON.parse(JSON.stringify(build().result.package));
    pkg.module.language = 'en--US';
    rehashPackage(pkg);
    expect(PD.validateReviewCandidatePackage(pkg)).toMatchObject({ ok: false, code: 'invalid_module_binding' });
  });

  it('rejects duplicate and oversized rehashed integrity summaries', () => {
    let pkg = JSON.parse(JSON.stringify(build().result.package));
    pkg.integrity_summary.activities.push({ ...pkg.integrity_summary.activities[0] });
    rehashPackage(pkg);
    expect(PD.validateReviewCandidatePackage(pkg)).toMatchObject({ ok: false, code: 'invalid_integrity_summary' });

    pkg = JSON.parse(JSON.stringify(build().result.package));
    const row = pkg.integrity_summary.activities[0];
    row.event_count = 6;
    row.character_count = PD.REVIEW_MAX_INTEGRITY_TOTAL_CHARS + 1;
    rehashPackage(pkg);
    expect(PD.validateReviewCandidatePackage(pkg)).toMatchObject({ ok: false, code: 'integrity_event_limit' });
  });

  it('rejects hidden AI fields after both artifact and package digests are recomputed', () => {
    const pkg = JSON.parse(JSON.stringify(build().result.package));
    const artifact = pkg.artifacts.find((a) => a.kind === 'ai-advisory-analysis');
    artifact.value.qualitativeAnalysis.hiddenPrivateField = 'must not pass validation';
    rehashArtifactAndPackage(pkg, artifact);
    expect(PD.validateReviewCandidatePackage(pkg)).toMatchObject({ ok: false, code: 'invalid_ai_analysis' });
  });

  it('caps completion-record integrity events even for a non-UI caller', () => {
    const mod = reviewModule();
    const events = Array.from({ length: PD.MAX_COMPLETION_INTEGRITY_EVENTS + 25 }, () => ({ type: 'paste', charCount: 1e9, wordCount: 1e9 }));
    const results = reviewResults(mod, { 'reflect-one': { text: 'answer', integrityEvents: events } });
    const rec = PD.buildCompletionRecord(mod, results, { name: 'Pat' }, NOW);
    expect(rec.integrityEvents).toHaveLength(PD.MAX_COMPLETION_INTEGRITY_EVENTS);
    expect(rec.integrityEvents[0].characterCount).toBe(PD.REVIEW_MAX_INTEGRITY_CHARS_PER_EVENT);
    expect(rec.integrityEvents[0].wordCount).toBe(PD.REVIEW_MAX_INTEGRITY_WORDS_PER_EVENT);
  });
});

describe('shipped PD catalog', () => {
  it('the manifest references real files that all validate', () => {
    const manifest = readJson('catalog/pd/index.json');
    expect(manifest.kind).toBe('pd_catalog');
    expect(Array.isArray(manifest.entries)).toBe(true);
    expect(manifest.entries.length).toBeGreaterThan(0);
    for (const e of manifest.entries) {
      const v = PD.validatePdModule(readJson(e.path));
      expect(v.ok, `${e.path}: ${v.error || ''}`).toBe(true);
    }
  });

  it('manifest learning paths reference real, published module slugs', () => {
    const manifest = readJson('catalog/pd/index.json');
    const slugs = {};
    (manifest.entries || []).forEach((e) => { slugs[e.slug] = true; });
    (manifest.paths || []).forEach((p) => {
      expect(Array.isArray(p.moduleSlugs)).toBe(true);
      expect(p.moduleSlugs.length).toBeGreaterThan(0);
      p.moduleSlugs.forEach((s) => { expect(slugs[s], `${p.slug} -> ${s}`).toBe(true); });
    });
  });

  it('the seed UDL module is gated and completable end-to-end', () => {
    const seed = readJson('catalog/pd/approved/udl-representation-quickstart.json');
    const v = PD.validatePdModule(seed);
    expect(v.ok).toBe(true);
    expect(v.stats.gated).toBe(1);

    // A learner who passes the quiz and reflects completes the module.
    const quiz = seed.sections[1].activities[0];
    const allCorrect = quiz.content.questions.map(q => q.correctIndex);
    const resultsById = {
      'read-representation': PD.normalizeResult(seed.sections[0].activities[0], { acknowledged: true }),
      'quiz-representation': PD.normalizeResult(quiz, { answers: allCorrect, submitted: true }),
      'reflect-representation': PD.normalizeResult(seed.sections[2].activities[0], { text: 'Add a diagram and a transcript.' })
    };
    expect(PD.evaluateModule(seed, resultsById).complete).toBe(true);
  });
});

describe('video + checklist activity types', () => {
  function videoAct() { return { id: 'v', type: 'video', title: 'Watch', content: { url: 'https://example.org/v', body: 'desc' }, gate: { kind: 'none' } }; }
  function checklistAct() { return { id: 'c', type: 'checklist', title: 'Commit', content: { items: ['Try A', 'Try B', 'Try C'] }, gate: { kind: 'none' } }; }

  function moduleWith(act) {
    return { schema_version: 'pd-1.0', kind: 'pd_module', metadata: { id: 'activity-fixture', title: 'T' }, sections: [{ title: 'S', activities: [act] }] };
  }

  it('validates a video activity and rejects one without a url', () => {
    expect(PD.validatePdModule(moduleWith(videoAct())).ok).toBe(true);
    const bad = moduleWith(videoAct()); delete bad.sections[0].activities[0].content.url;
    const v = PD.validatePdModule(bad);
    expect(v.ok).toBe(false);
    expect(v.error).toMatch(/content\.url/);
    const unsafe = moduleWith(videoAct()); unsafe.sections[0].activities[0].content.url = 'data:text/html,bad';
    expect(PD.validatePdModule(unsafe).error).toMatch(/safe content\.url/);
  });

  it('validates a checklist activity and rejects one without items', () => {
    expect(PD.validatePdModule(moduleWith(checklistAct())).ok).toBe(true);
    const bad = moduleWith(checklistAct()); bad.sections[0].activities[0].content.items = [];
    expect(PD.validatePdModule(bad).ok).toBe(false);
  });

  it('rejects a score gate on video/checklist (non-scorable)', () => {
    const m = moduleWith(videoAct()); m.sections[0].activities[0].gate = { kind: 'score', threshold: 0.8 };
    expect(PD.validatePdModule(m).ok).toBe(false);
  });

  it('video completes only when watched; gate then passes', () => {
    const a = videoAct();
    expect(PD.normalizeResult(a, {}).completed).toBe(false);
    const done = PD.normalizeResult(a, { watched: true });
    expect(done.completed).toBe(true);
    expect(PD.evaluateGate(a, done).passed).toBe(true);
  });

  it('checklist completes when at least one item is checked', () => {
    const a = checklistAct();
    expect(PD.normalizeResult(a, { checked: [false, false, false] }).completed).toBe(false);
    expect(PD.normalizeResult(a, { checked: [false, true, false] }).completed).toBe(true);
  });
});

describe('sim activity type (AI-assessed scenario)', () => {
  function simAct(gate) { return { id: 's', type: 'sim', title: 'Scenario', content: { scenario: 'A student is upset.', rubric: 'empathy' }, gate: gate || { kind: 'none' } }; }
  function moduleWith(act) { return { schema_version: 'pd-1.0', kind: 'pd_module', metadata: { id: 'sim-fixture', title: 'T' }, sections: [{ title: 'S', activities: [act] }] }; }

  it('validates a sim with a scenario and rejects one without', () => {
    expect(PD.validatePdModule(moduleWith(simAct())).ok).toBe(true);
    const bad = moduleWith(simAct()); delete bad.sections[0].activities[0].content.scenario;
    const v = PD.validatePdModule(bad);
    expect(v.ok).toBe(false);
    expect(v.error).toMatch(/scenario/);
    const noRubric = moduleWith(simAct()); delete noRubric.sections[0].activities[0].content.rubric;
    expect(PD.validatePdModule(noRubric).error).toMatch(/rubric/);
  });

  it('rejects a score gate on sim (formative-only — never gates advancement)', () => {
    const v = PD.validatePdModule(moduleWith(simAct({ kind: 'score', threshold: 0.7 })));
    expect(v.ok).toBe(false);
    expect(v.error).toMatch(/produces no score/i);
  });

  it('normalizes masteryScore (0..100) to a 0..1 score and completes', () => {
    const r = PD.normalizeResult(simAct(), { masteryScore: 80, response: 'x' });
    expect(r.completed).toBe(true);
    expect(r.score).toBeCloseTo(0.8, 5);
  });

  it('completes on a written response when AI score is absent (offline-safe)', () => {
    expect(PD.normalizeResult(simAct(), { response: 'my answer' }).completed).toBe(true);
    expect(PD.normalizeResult(simAct(), {}).completed).toBe(false);
  });
});

describe('credential canonicalization + payload (Tier-2)', () => {
  it('canonicalize sorts keys deterministically and is order-independent', () => {
    expect(PD.canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(PD.canonicalize({ a: 2, b: 1 })).toBe(PD.canonicalize({ b: 1, a: 2 }));
    expect(PD.canonicalize({ z: [3, { y: 1, x: 2 }], a: 'hi' })).toBe('{"a":"hi","z":[3,{"x":2,"y":1}]}');
  });

  it('canonicalize rejects non-finite numbers', () => {
    expect(() => PD.canonicalize({ n: Infinity })).toThrow();
    expect(() => PD.canonicalize(NaN)).toThrow();
  });

  it('buildCredentialPayload borrows VC field names + keeps honest framing', () => {
    const rec = { moduleId: 'm', moduleVersion: '2026.1', contentDigest: 'sha256:abc', moduleTitle: 'M', topic: 'T', complete: true, completedAt: '2026-06-20', learner: { name: 'Pat' }, perActivity: [{ passed: true }, { passed: true }, { passed: false }] };
    const p = PD.buildCredentialPayload(rec, 'AlloFlow PD', '2026-06-22T00:00:00Z');
    expect(p.type).toBe('PdCompletionAttestation');
    expect(p.issuer.name).toBe('AlloFlow PD');
    expect(p.issuanceDate).toBe('2026-06-22T00:00:00Z');
    expect(p.credentialSubject.moduleId).toBe('m');
    expect(p.credentialSubject.moduleVersion).toBe('2026.1');
    expect(p.credentialSubject.contentDigest).toBe('sha256:abc');
    expect(p.credentialSubject.achievement.contentDigest).toBe('sha256:abc');
    expect(p.credentialSubject.name).toBe('Pat');
    expect(p.credentialSubject.achievement.activitiesPassed).toBe(2);
    expect(p.credentialSubject.achievement.activitiesTotal).toBe(3);
    expect(p.attestation_note).toMatch(/NOT proctored, accredited/i);
  });

  it('canonical form of a payload is stable across key-order / round-trip', () => {
    const p = PD.buildCredentialPayload({ moduleId: 'm', complete: true }, 'X', 'T');
    expect(PD.canonicalize(p)).toBe(PD.canonicalize(JSON.parse(JSON.stringify(p))));
  });
});

describe('accessibility authoring readiness', () => {
  it('is ready for rendered audit only after static authoring checks pass', () => {
    const mod = fixtureModule(); mod.metadata.language = 'en';
    const audit = PD.auditAccessibilityReadiness(mod);
    expect(audit.status).toBe('ready-for-render-audit');
    expect(audit.conformanceClaim).toBe(false);
    expect(audit.standardTarget).toBe('WCAG 2.2 AA');
    expect(audit.warnings.map((x) => x.code)).toContain('render-audit-required');
  });

  it('returns structured review findings without making legacy modules invalid', () => {
    const mod = fixtureModule();
    mod.sections[0].title = ' ';
    mod.sections[0].activities[0].content.body = '';
    mod.sections[0].activities[0].content.links = [{ label: '', url: 'javascript:bad' }];
    mod.sections[0].activities[2].content.prompt = '';
    mod.sections.push({ title: 'Media', activities: [{
      id: 'v1', type: 'video', title: 'Watch', content: { url: 'https://example.org/video' }, gate: { kind: 'none' }
    }] });
    const audit = PD.auditAccessibilityReadiness(mod);
    const codes = audit.issues.map((x) => x.code);
    expect(audit.status).toBe('review-required');
    expect(codes).toEqual(expect.arrayContaining([
      'metadata-language-missing', 'section-title-missing', 'read-body-empty',
      'link-label-missing', 'link-url-unsafe', 'reflect-prompt-empty',
      'video-captions-missing', 'video-alternative-missing'
    ]));
    expect(PD.validatePdModule(readJson('catalog/pd/approved/udl-representation-quickstart.json')).ok).toBe(true);
  });
});

describe('module content digest', () => {
  it('matches SHA-256 of canonical content and is key-order independent', () => {
    const mod = fixtureModule();
    const expected = createHash('sha256').update(PD.canonicalize(mod), 'utf8').digest('hex');
    expect(PD.moduleContentDigest(mod)).toBe('sha256:' + expected);
    const reordered = { sections: mod.sections, metadata: mod.metadata, kind: mod.kind, schema_version: mod.schema_version };
    expect(PD.moduleContentDigest(reordered)).toBe('sha256:' + expected);
  });

  it('changes when material learning or assessment content changes', () => {
    const baseline = fixtureModule();
    const digest = PD.moduleContentDigest(baseline);
    const mutations = [
      (m) => { m.metadata.title = 'Different title'; },
      (m) => { m.sections[0].activities[0].content.body = 'Different reading'; },
      (m) => { m.sections[0].activities[1].content.questions[0].prompt = 'Different prompt'; },
      (m) => { m.sections[0].activities[1].content.questions[0].options[0] = 'Different option'; },
      (m) => { m.sections[0].activities[1].content.questions[0].correctIndex = 1; },
      (m) => { m.sections[0].activities[1].gate.threshold = 1; },
      (m) => { m.sections[0].activities[2].content.prompt = 'Different reflection'; },
    ];
    for (const mutate of mutations) {
      const changed = JSON.parse(JSON.stringify(baseline));
      mutate(changed);
      expect(PD.moduleContentDigest(changed)).not.toBe(digest);
    }
  });

  it('propagates an explicit publisher version into the completion binding', () => {
    const mod = fixtureModule(); mod.metadata.version = '2026.1';
    const r = {
      r1: PD.normalizeResult(mod.sections[0].activities[0], { acknowledged: true }),
      q1: PD.normalizeResult(mod.sections[0].activities[1], { answers: [0, 1, 0, 1], submitted: true }),
      f1: PD.normalizeResult(mod.sections[0].activities[2], { text: 'Apply it.' }),
    };
    const record = PD.buildCompletionRecord(mod, r, { name: 'Pat' }, '2026-07-16T00:00:00Z');
    expect(record.moduleVersion).toBe('2026.1');
    expect(record.contentDigest).toBe(PD.moduleContentDigest(mod));
    expect(record.complete).toBe(true);
  });
});

describe('collectResponses branches (portfolio edge cases)', () => {
  function modWith(act) { return { schema_version: 'pd-1.0', kind: 'pd_module', metadata: { id: 'm', title: 'M' }, sections: [{ title: 'S', activities: [act] }] }; }
  function recFor(act, raw) { var r = {}; r[act.id] = PD.normalizeResult(act, raw); return PD.buildCompletionRecord(modWith(act), r, { name: 'x' }, 'T'); }

  it('checklist with no items checked is omitted from responses', () => {
    const act = { id: 'c', type: 'checklist', title: 'C', content: { items: ['A', 'B'] }, gate: { kind: 'none' } };
    expect(recFor(act, { checked: [false, false] }).responses).toEqual([]);
  });

  it('sim with only an AI score (no written response) is still captured', () => {
    const act = { id: 's', type: 'sim', title: 'S', content: { scenario: 'x' }, gate: { kind: 'none' } };
    const r = recFor(act, { masteryScore: 60, feedback: 'fb' }).responses;
    expect(r).toHaveLength(1);
    expect(r[0].type).toBe('sim');
    expect(r[0].masteryScore).toBe(60);
    expect(r[0].response).toBe('');
  });

  it('reflect with whitespace-only text is omitted', () => {
    const act = { id: 'r', type: 'reflect', title: 'R', content: { prompt: '?' }, gate: { kind: 'none' } };
    expect(recFor(act, { text: '   ' }).responses).toEqual([]);
  });
});
