import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const SRC = fs.readFileSync(
  path.resolve(process.cwd(), 'stem_lab/stem_tool_pets.js'),
  'utf8'
);

function between(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end <= start) {
    throw new Error('Could not slice ' + startMarker + ' -> ' + endMarker);
  }
  return source.slice(start, end).trim();
}

function evidenceApi() {
  const schema = between(
    SRC,
    'var PETS_EVIDENCE_MODULE_LABELS =',
    'function petsPersistentSnapshot('
  );
  return vm.runInNewContext(
    '(function () { ' + schema + '; return { normalizeEvidenceRecords }; })()',
    {
      AI_SCENARIOS: [{ id: 'family-pick' }],
      isFinite,
    }
  );
}

describe('Pets mini-game evidence and completion policy', () => {
  it('allowlists only aggregate scored mini-game attempt evidence', () => {
    const { normalizeEvidenceRecords } = evidenceApi();
    const privateText = 'PRIVATE SELECTED ANSWER OR COACHING';
    const records = Array.from(normalizeEvidenceRecords([
      {
        moduleId: 'nutrition',
        kind: 'activity',
        recordedAt: '2026-08-26T12:00:00.000Z',
        details: {
          score: 9,
          total: 10,
          scorePct: 90,
          needsPractice: 1,
          criterionMet: true,
          responses: [{ id: 1, answer: privateText }],
          selectedAnswer: privateText,
          coaching: privateText,
        },
      },
      {
        moduleId: 'lifespan',
        kind: 'activity',
        recordedAt: '2026-08-26T12:01:00.000Z',
        details: {
          score: 7,
          total: 10,
          scorePct: 70,
          needsPractice: 3,
          criterionMet: false,
          shown: [0, 1, 2],
          picks: [privateText],
          rationale: privateText,
        },
      },
      {
        moduleId: 'zoonoses',
        kind: 'activity',
        recordedAt: '2026-08-26T12:02:00.000Z',
        details: {
          score: 3,
          total: 4,
          scorePct: 75,
          bestPct: 75,
          needsPractice: 1,
          criterionMet: true,
          answers: [1, 2, 0, 3],
          scenarioText: privateText,
        },
      },
    ]));

    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({
      moduleId: 'nutrition',
      kind: 'activity',
      details: {
        score: 9,
        total: 10,
        scorePct: 90,
        needsPractice: 1,
        criterionMet: true,
      },
    });
    expect(records[1]).toMatchObject({
      moduleId: 'lifespan',
      kind: 'activity',
      details: {
        score: 7,
        total: 10,
        scorePct: 70,
        needsPractice: 3,
        criterionMet: false,
      },
    });
    expect(records[2]).toMatchObject({
      moduleId: 'zoonoses',
      kind: 'activity',
      details: {
        score: 3,
        total: 4,
        scorePct: 75,
        bestPct: 75,
        needsPractice: 1,
        criterionMet: true,
      },
    });
    expect(Object.keys(records[0].details).sort()).toEqual([
      'criterionMet', 'needsPractice', 'score', 'scorePct', 'total',
    ]);
    expect(Object.keys(records[1].details).sort()).toEqual([
      'criterionMet', 'needsPractice', 'score', 'scorePct', 'total',
    ]);
    expect(Object.keys(records[2].details).sort()).toEqual([
      'bestPct', 'criterionMet', 'needsPractice', 'score', 'scorePct', 'total',
    ]);
    expect(JSON.stringify(records)).not.toContain(privateText);
  });

  it('records every scored mini-game boundary with complete aggregate metadata', () => {
    for (const moduleId of ['nutrition', 'zoonoses', 'lifespan']) {
      const marker = "completeModule('" + moduleId + "'";
      const start = SRC.indexOf(marker);
      expect(start, moduleId + ' completion call').toBeGreaterThan(-1);
      const end = SRC.indexOf('});', start);
      expect(end, moduleId + ' completion call end').toBeGreaterThan(start);
      const call = SRC.slice(start, end + 3);
      expect(call).toMatch(/score\s*:/);
      expect(call).toMatch(/total\s*:/);
      expect(call).toMatch(/scorePct\s*:/);
      expect(call).toMatch(/needsPractice\s*:/);
      expect(call).toMatch(/criterionMet\s*:/);
      expect(call).not.toMatch(/responses\s*:|selectedAnswer\s*:|coaching\s*:|rationale\s*:/);
    }
  });

  it('activity-gates Zoonoses alongside the other scored mini-games', () => {
    const gateSource = between(
      SRC,
      'var PETS_ACTIVITY_COMPLETION_MODULES =',
      'function recordEvidence('
    );
    const gate = vm.runInNewContext(
      `(function () { ${gateSource}; return {
        PETS_ACTIVITY_COMPLETION_MODULES,
        requiresActivityCompletion
      }; })()`
    );

    for (const moduleId of ['nutrition', 'zoonoses', 'lifespan']) {
      expect(gate.PETS_ACTIVITY_COMPLETION_MODULES[moduleId], moduleId).toBe(true);
      expect(gate.requiresActivityCompletion(moduleId), moduleId).toBe(true);
    }
    expect(gate.requiresActivityCompletion('dogs')).toBe(false);
  });
});
