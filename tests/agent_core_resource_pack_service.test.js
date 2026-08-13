import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const service = require('../agent_core_resource_pack_module.js');

function request(history) {
  return {
    requestId: 'pack-test-1',
    title: 'Water cycle resource pack',
    sourceTopic: 'Water cycle',
    gradeLevel: '6th Grade',
    language: 'en',
    standards: 'NGSS MS-ESS2-4 (water cycles and weather)',
    learningGoal: 'Explain how water changes state in a repeating cycle.',
    privacy: { confirmNoStudentPii: true, confirmSourcePermission: true },
    history,
  };
}

const HISTORY = [
  { id: 'directions-1', type: 'directions', title: 'Directions', data: 'Read the source, identify two state changes, and explain them with evidence.', meta: 'Student directions' },
  { id: 'glossary-1', type: 'glossary', title: 'Key vocabulary', data: [
    { term: 'evaporation', def: 'Liquid water becomes vapor.', tier: 'Domain-Specific' },
    { term: 'condensation', def: 'Water vapor becomes liquid.', tier: 'Domain-Specific' },
    { term: 'cycle', def: 'A repeating process.', tier: 'Academic' },
    { term: 'evidence', def: 'Information that supports an explanation.', tier: 'Academic' },
  ], meta: 'Vocabulary support' },
  { id: 'quiz-1', type: 'quiz', title: 'Quick check', data: {
    questions: [
      { type: 'mcq', question: 'Which change turns liquid water into vapor?', options: ['Evaporation', 'Condensation', 'Freezing', 'Melting'], correctAnswer: 'Evaporation', conceptLabel: 'state change' },
      { type: 'shortAnswer', question: 'What repeats in the water cycle?', expectedAnswer: 'Water changes state and moves through a repeating cycle.', conceptLabel: 'cycle structure' },
      { type: 'shortAnswer', question: 'What should support an explanation?', expectedAnswer: 'Evidence from the source.', conceptLabel: 'source evidence' },
    ],
    reflections: [{ text: 'Which piece of evidence was most useful?' }],
  }, meta: 'Formative check' },
];

describe('Agent Core resource-pack service', () => {
  it('composes an agent-authored history into a normalized AlloPack', () => {
    const result = service.compose(request(HISTORY));
    expect(result.ok).toBe(true);
    expect(result.value.allopack.spec).toBe('0.1');
    expect(result.value.history.map((item) => item.type)).toEqual(['directions', 'glossary', 'quiz']);
    expect(result.value.provenance.provider).toBe('agent-context');
  });

  it('fails closed on missing privacy attestations and secret-like fields', () => {
    const bad = request(HISTORY);
    delete bad.privacy;
    bad.generatedApiKey = 'sentinel-secret';
    const result = service.compose(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.map((entry) => entry.code)).toEqual(expect.arrayContaining(['privacy-attestation-required', 'secret-like-field']));
    expect(JSON.stringify(result)).not.toContain('sentinel-secret');
  });

  it('validates renderer-critical shapes and rejects unsafe generated content', () => {
    const bad = request(structuredClone(HISTORY));
    bad.history[1].data[0].def = 'Contact student@example.org for records.';
    const result = service.compose(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.map((entry) => entry.code)).toContain('privacy-risk-detected');
  });

  it('returns a teacher review preview and deterministic JSON export', () => {
    const result = service.compose(request(HISTORY));
    const preview = service.previewPack(result.value);
    expect(preview).toMatchObject({ ok: true, studentSafe: true, title: 'Water cycle resource pack' });
    expect(preview.resources.map((item) => item.type)).toEqual(['directions', 'glossary', 'quiz']);
    const exported = service.exportPack(result.value);
    expect(exported.ok).toBe(true);
    expect(exported.filename).toBe('water-cycle-resource-pack.allopack.json');
    expect(JSON.parse(exported.json).history).toHaveLength(3);
  });

  it('supports provider injection without coupling the service to a network client', async () => {
    const generated = await service.generate({
      requestId: 'generated-1', sourceTopic: 'Water cycle', sourceText: 'Water changes state.', learningGoal: 'Explain the cycle.',
      resourcePlan: ['directions', 'glossary', 'quiz'], privacy: { confirmNoStudentPii: true, confirmSourcePermission: true }, providerPolicy: { allowMeteredUsage: true },
    }, {
      name: 'test-provider',
      generateText: async () => JSON.stringify({ history: structuredClone(HISTORY) }),
    });
    expect(generated.ok).toBe(true);
    expect(generated.value.provenance.provider).toBe('test-provider');
  });
});
