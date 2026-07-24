import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const nodeRequire = createRequire(import.meta.url);
const { findResponseFormIssue } = nodeRequire('../dev-tools/speech_language_pathology_5331/semantic_response_form_gate.cjs');
const read = (file) => fs.readFileSync(resolve(process.cwd(), file), 'utf8');
const library = JSON.parse(read('test_prep/speech_language_pathology_5331_learning_library.json'));
const pack = JSON.parse(read('test_prep/speech_language_pathology_5331_pack.json'));
const qa = JSON.parse(read('test_prep/speech_language_pathology_5331_learning_library_qa.json'));

describe('Praxis Speech-Language Pathology 5331 native learning library', () => {
  it('ships the complete chapter, lesson, check, card, and memory-aid inventory', () => {
    expect(library).toMatchObject({ schemaVersion: 1, libraryId: 'praxis-speech-language-pathology-5331-learning-library', packId: 'praxis-speech-language-pathology-5331', simulation: { questionCount: 132, timeMinutes: 150 }, summary: { chapters: 12, sections: 48, knowledgeChecks: 60, flashcards: 75, memoryAids: 20, sourceReviewedChapters: 12, sourceReviewedFlashcards: 75, sourceReviewedMemoryAids: 20 } });
    expect(library.skills).toHaveLength(12);
    expect(library.chapters).toHaveLength(12);
    expect(library.flashcards).toHaveLength(75);
    expect(library.memoryAids).toHaveLength(20);
    expect(library.legalCaution).toContain('not a clinical evaluation, diagnosis, medical or swallowing-safety decision');
    expect(library.legalCaution).toContain('qualified individualized care');
    expect(library.frameworkCaution).toContain('ASHA standards, ethics, scope, and Practice Portal materials can be revised');
  });

  it('gives every chapter four substantive lessons and five source-reviewed checks', () => {
    const allowedHosts = new Set(['praxis.ets.org', 'asha.org', 'www.asha.org', 'sites.ed.gov', 'studentprivacy.ed.gov', 'www.hhs.gov']);
    for (const chapter of library.chapters) {
      expect(chapter.sections).toHaveLength(4);
      expect(chapter.knowledgeChecks).toHaveLength(5);
      expect(chapter.objectives.length).toBeGreaterThanOrEqual(3);
      expect(chapter.reviewStatus).toBe('source-reviewed-editorial-pass');
      expect(chapter.reviewNote).toContain('independent licensed-SLP validation remains pending');
      expect(chapter.sections.every((entry) => entry.content.length >= 300 && entry.keyTerms.length >= 3)).toBe(true);
      expect(chapter.knowledgeChecks.every((check) => check.choices.length === 4 && check.answerIndex >= 0 && check.answerIndex < 4 && check.rationale.length >= 80)).toBe(true);
      expect(chapter.references.every((url) => allowedHosts.has(new URL(url).hostname))).toBe(true);
    }
  });

  it('keeps the four source-propagated swallowing checks semantically responsive', () => {
    const sourceIdByCheck = new Map([
      ['slp5331-ch-08-check-02', 'slp5331-b1-061'],
      ['slp5331-ch-08-check-03', 'slp5331-b1-062'],
      ['slp5331-ch-08-check-05', 'slp5331-b1-064'],
      ['slp5331-ch-12-check-02', 'slp5331-b1-094'],
    ]);
    const checks = library.chapters.flatMap((chapter) => chapter.knowledgeChecks);
    for (const [checkId, sourceId] of sourceIdByCheck) {
      const check = checks.find((entry) => entry.id === checkId);
      expect(check).toBeTruthy();
      expect(findResponseFormIssue({ ...check, id: sourceId })).toBe('');
    }
  });
  it('links all 200 questions to exactly one category-compatible skill and chapter', () => {
    const skillById = Object.fromEntries(library.skills.map((skill) => [skill.id, skill]));
    const chapterById = Object.fromEntries(library.chapters.map((chapter) => [chapter.id, chapter]));
    for (const item of pack.items) {
      const skill = skillById[item.skillIds[0]]; const chapter = chapterById[item.chapterIds[0]];
      expect(item.skillIds).toHaveLength(1); expect(item.chapterIds).toHaveLength(1);
      expect(skill).toBeTruthy(); expect(chapter).toBeTruthy(); expect(skill.domainId).toBe(item.domainId); expect(skill.chapterId).toBe(chapter.id); expect(chapter.skillId).toBe(skill.id);
    }
    expect(pack).toMatchObject({ learningLibraryUrl: './test_prep/speech_language_pathology_5331_learning_library.json', learningLibraryQaUrl: './test_prep/speech_language_pathology_5331_learning_library_qa.json', simulationItemCount: 132, simulationTimeMinutes: 150 });
  });

  it('publishes passing QA and exact learning-library mirrors', () => {
    expect(qa.summary).toMatchObject({ chapters: 12, sections: 48, knowledgeChecks: 60, flashcards: 75, memoryAids: 20, findings: [], status: 'pass' });
    expect(qa.standard.limitation).toContain('not ETS or ASHA approval');
    for (const name of ['speech_language_pathology_5331_learning_library.json', 'speech_language_pathology_5331_learning_library_qa.json', 'speech_language_pathology_5331_learning_library_qa.md']) expect(read('desktop/web-app/public/test_prep/' + name)).toBe(read('test_prep/' + name));
  });
});
