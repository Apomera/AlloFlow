import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  SOURCE_ITEM_IDS,
  ADDITIONAL_CORRECTED_SOURCE_ITEM_IDS,
  LIBRARY_CHECK_IDS,
  TARGET_FLASHCARD_CHAPTER_IDS,
  auditCredentialRoleIntegrity,
} = require('../dev-tools/teaching_reading_5205/credential_role_integrity.cjs');

const root = path.resolve(import.meta.dirname, '..');
const load = (name) => JSON.parse(fs.readFileSync(path.join(root, 'test_prep', name), 'utf8'));
const pack = load('teaching_reading_5205_pack.json');
const library = load('teaching_reading_5205_learning_library.json');
const sourceModuleText = fs.readFileSync(
  path.join(root, 'dev-tools', 'teaching_reading_5205', 'item_content.cjs'), 'utf8');
const standaloneBanks = JSON.parse(fs.readFileSync(
  path.join(root, 'dev-tools', 'teaching_reading_5205', 'standalone_item_content.json'), 'utf8'));

const forbiddenScope = /\b(?:reading specialist|literacy specialist|literacy coach|coach(?:es|ed|ing)?|adolescen\w*|older readers?|5302|secondary|recursive decoding)\b|grades?\s*(?:7|8|9|10|11|12)\b/i;
const malformedResponse = /\?use a strategy\?|intelligence\?achievement/i;
const encodingCorruption = /\u00e2(?:\u0080|\u20ac)|\u00c3[\u0080-\u00ff]|\ufffd|phoneme\?grapheme|\b(?:measure|student|task)\?s\b/i;
const itemText = (item) => [
  item?.prompt, ...(item?.choices || []), item?.rationale, ...(item?.choiceRationales || []),
].filter(Boolean).join('\n');

function audit(packValue = pack, libraryValue = library) {
  const findings = [];
  const summary = auditCredentialRoleIntegrity(packValue, libraryValue, (check, message, id) =>
    findings.push({ check, message, id }));
  return { summary, findings };
}

describe('Teaching Reading 5205 classroom-role integrity', () => {
  it('reviews all 200 items while enforcing the exact 26-item classroom-role recast', () => {
    expect(SOURCE_ITEM_IDS).toHaveLength(26);
    expect(SOURCE_ITEM_IDS[0]).toBe('tr5205-b1-070');
    expect(SOURCE_ITEM_IDS[12]).toBe('tr5205-b1-082');
    expect(SOURCE_ITEM_IDS[13]).toBe('tr5205-b2-070');
    expect(SOURCE_ITEM_IDS[25]).toBe('tr5205-b2-082');
    expect(ADDITIONAL_CORRECTED_SOURCE_ITEM_IDS).toEqual([
      'tr5205-b2-016', 'tr5205-b2-020', 'tr5205-b2-021', 'tr5205-b2-055',
      'tr5205-b2-061', 'tr5205-b1-034', 'tr5205-b2-034',
    ]);

    const { summary, findings } = audit();
    expect(findings).toEqual([]);
    expect(summary).toMatchObject({
      allSourceItemsReviewed: 200,
      fullLearningLibraryReviewed: true,
      targetSourceItemsReviewed: 26,
      additionalCorrectedSourceItemsReviewed: 7,
      libraryChecksReviewed: 10,
      sourceDerivedFlashcardsReviewed: 11,
      targetForeignRoleOccurrences: 0,
      classroomResponsibilityMisses: 0,
      suiteWideForeignScopeOccurrences: 0,
      malformedResponseFormOccurrences: 0,
      encodingCorruptionOccurrences: 0,
      negativeGates: 'pass',
    });
  });

  it('repairs the exact ten library checks and eleven source-derived flashcards', () => {
    expect(LIBRARY_CHECK_IDS).toEqual([
      'tr5205-ch-09-check-01', 'tr5205-ch-09-check-02', 'tr5205-ch-09-check-03',
      'tr5205-ch-09-check-04', 'tr5205-ch-09-check-05',
      'tr5205-ch-10-check-01', 'tr5205-ch-10-check-02', 'tr5205-ch-10-check-03',
      'tr5205-ch-10-check-04', 'tr5205-ch-10-check-05',
    ]);
    const checks = library.chapters.flatMap((chapter) => chapter.knowledgeChecks);
    const targetChecks = checks.filter((check) => LIBRARY_CHECK_IDS.includes(check.id));
    const targetCards = library.flashcards.filter((card) =>
      TARGET_FLASHCARD_CHAPTER_IDS.has(card.chapterId));
    expect(targetChecks).toHaveLength(10);
    expect(targetCards).toHaveLength(11);
    expect(JSON.stringify(library)).not.toMatch(encodingCorruption);

    const sourceById = Object.fromEntries(pack.items.map((item) => [item.id, item]));
    for (let index = 0; index < 5; index++) {
      const check09 = targetChecks.find((check) =>
        check.id === 'tr5205-ch-09-check-0' + (index + 1));
      const check10 = targetChecks.find((check) =>
        check.id === 'tr5205-ch-10-check-0' + (index + 1));
      expect(check09.prompt).toBe(sourceById['tr5205-b1-0' + (71 + index)].prompt);
      expect(check10.prompt).toBe(sourceById['tr5205-b1-0' + (78 + index)].prompt);
    }
    expect(targetCards.map((card) => card.front)).toEqual([
      ...Array.from({ length: 6 }, (_, index) =>
        sourceById['tr5205-b1-0' + (71 + index)].prompt),
      ...Array.from({ length: 5 }, (_, index) =>
        sourceById['tr5205-b1-0' + (78 + index)].prompt),
    ]);
  });

  it('uses a standalone 12-bank/100-kernel source with no 5302 dependency or scope leakage', () => {
    expect(sourceModuleText).toContain("require('./standalone_item_content.json')");
    expect(sourceModuleText).not.toMatch(/reading_specialist_5302/i);
    expect(standaloneBanks).toHaveLength(12);
    expect(standaloneBanks.flatMap((bank) => bank.questions)).toHaveLength(100);
    expect(JSON.stringify(standaloneBanks)).not.toMatch(forbiddenScope);
    expect(JSON.stringify(standaloneBanks)).not.toMatch(malformedResponse);
    expect(JSON.stringify(standaloneBanks)).not.toMatch(encodingCorruption);
  });

  it('keeps the identified second-batch and malformed-response corrections durable', () => {
    const byId = Object.fromEntries(pack.items.map((item) => [item.id, item]));
    for (const id of ADDITIONAL_CORRECTED_SOURCE_ITEM_IDS) {
      expect(byId[id], 'missing ' + id).toBeDefined();
      expect(itemText(byId[id])).not.toMatch(forbiddenScope);
      expect(itemText(byId[id])).not.toMatch(malformedResponse);
      expect(itemText(byId[id])).not.toMatch(encodingCorruption);
    }
    expect(byId['tr5205-b2-016'].prompt).toMatch(/elementary classroom teacher/i);
    expect(byId['tr5205-b2-020'].prompt).toMatch(/upper-elementary|fifth-grade/i);
    expect(byId['tr5205-b2-021'].prompt).toMatch(/upper-elementary/i);
    expect(byId['tr5205-b2-055'].prompt).toContain('\u201cuse a strategy\u201d');
    expect(byId['tr5205-b2-061'].prompt).toMatch(/classroom teacher/i);
    for (const id of ['tr5205-b1-034', 'tr5205-b2-034']) {
      expect(byId[id].choices.join('\n')).toContain('intelligence\u2013achievement');
      expect(byId[id].choices.join('\n')).not.toContain('intelligence?achievement');
    }
  });

  it('fails closed on credential, grade-band, and malformed-response regressions', () => {
    const mutatedPack = structuredClone(pack);
    mutatedPack.items.find((item) => item.id === 'tr5205-b1-071').prompt =
      'A reading specialist begins a coaching cycle with a teacher.';
    const sourceMutation = audit(mutatedPack, library);
    expect(sourceMutation.summary.negativeGates).toBe('fail');
    expect(sourceMutation.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ check: 'credential-role-contamination', id: 'tr5205-b1-071' }),
    ]));

    const mutatedLibrary = structuredClone(library);
    mutatedLibrary.chapters.find((chapter) => chapter.id === 'tr5205-ch-09')
      .knowledgeChecks[0].prompt = 'What should a literacy coach do?';
    const libraryMutation = audit(pack, mutatedLibrary);
    expect(libraryMutation.summary.negativeGates).toBe('fail');
    expect(libraryMutation.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ check: 'credential-role-contamination', id: 'tr5205-ch-09-check-01' }),
    ]));

    const gradeBandPack = structuredClone(pack);
    gradeBandPack.items.find((item) => item.id === 'tr5205-b2-020').prompt =
      'During recursive decoding instruction for adolescent readers, what should the teacher do?';
    const gradeBandMutation = audit(gradeBandPack, library);
    expect(gradeBandMutation.summary.negativeGates).toBe('fail');
    expect(gradeBandMutation.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ check: 'credential-grade-band-leakage', id: 'tr5205-b2-020' }),
    ]));

    const strategyPack = structuredClone(pack);
    strategyPack.items.find((item) => item.id === 'tr5205-b2-055').prompt =
      'The teacher says ?use a strategy? without modeling.';
    const strategyMutation = audit(strategyPack, library);
    expect(strategyMutation.summary.negativeGates).toBe('fail');
    expect(strategyMutation.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ check: 'response-form-text', id: 'tr5205-b2-055' }),
    ]));

    const encodingPack = structuredClone(pack);
    encodingPack.items.find((item) => item.id === 'tr5205-b1-001').prompt =
      'In a K\u00e2\u20ac\u201c2 literacy lesson, what should the teacher do?';
    const encodingMutation = audit(encodingPack, library);
    expect(encodingMutation.summary.negativeGates).toBe('fail');
    expect(encodingMutation.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ check: 'encoding-integrity', id: 'tr5205-b1-001' }),
    ]));

    const encodingLibrary = structuredClone(library);
    encodingLibrary.chapters.find((chapter) => chapter.id === 'tr5205-ch-04')
      .knowledgeChecks[1].choices[1] = 'Treat phoneme?grapheme mapping as optional.';
    const encodingLibraryMutation = audit(pack, encodingLibrary);
    expect(encodingLibraryMutation.summary.negativeGates).toBe('fail');
    expect(encodingLibraryMutation.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ check: 'encoding-integrity', id: library.libraryId }),
    ]));

    const achievementPack = structuredClone(pack);
    achievementPack.items.find((item) => item.id === 'tr5205-b1-034').choices[0] =
      'Use only the intelligence?achievement discrepancy.';
    const achievementMutation = audit(achievementPack, library);
    expect(achievementMutation.summary.negativeGates).toBe('fail');
    expect(achievementMutation.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ check: 'response-form-text', id: 'tr5205-b1-034' }),
    ]));
  });
});