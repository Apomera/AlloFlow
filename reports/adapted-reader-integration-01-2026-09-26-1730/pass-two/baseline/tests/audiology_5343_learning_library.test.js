import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';
const read = (file) => fs.readFileSync(resolve(process.cwd(), file), 'utf8');
const library = JSON.parse(read('test_prep/audiology_5343_learning_library.json'));
const pack = JSON.parse(read('test_prep/audiology_5343_pack.json'));
const qa = JSON.parse(read('test_prep/audiology_5343_learning_library_qa.json'));

describe('Praxis Audiology 5343 native learning library', () => {
  it('ships the complete chapter, lesson, check, card, and memory-aid inventory', () => {
    expect(library).toMatchObject({ schemaVersion: 1, libraryId: 'praxis-audiology-5343-learning-library', packId: 'praxis-audiology-5343', simulation: { questionCount: 120, timeMinutes: 120 }, summary: { chapters: 12, sections: 48, knowledgeChecks: 60, flashcards: 75, memoryAids: 20, sourceReviewedChapters: 12, sourceReviewedFlashcards: 75, sourceReviewedMemoryAids: 20 } });
    expect(library.skills).toHaveLength(12);
    expect(library.chapters).toHaveLength(12);
    expect(library.flashcards).toHaveLength(75);
    expect(library.memoryAids).toHaveLength(20);
    expect(library.legalCaution).toContain('not a clinical evaluation, diagnosis, medical or vestibular decision, device fitting');
    expect(library.legalCaution).toContain('qualified individualized care');
    expect(library.frameworkCaution).toContain('ASHA standards, ethics, scope, school guidance, and Practice Portal materials can be revised');
    expect(library.frameworkCaution).toContain('future effective date');
  });

  it('gives every chapter four substantive lessons and five source-reviewed checks', () => {
    const allowedHosts = new Set(['praxis.ets.org', 'asha.org', 'www.asha.org', 'cdc.gov', 'www.cdc.gov', 'osha.gov', 'www.osha.gov', 'sites.ed.gov', 'studentprivacy.ed.gov', 'www.hhs.gov']);
    for (const chapter of library.chapters) {
      expect(chapter.sections).toHaveLength(4);
      expect(chapter.knowledgeChecks).toHaveLength(5);
      expect(chapter.objectives.length).toBeGreaterThanOrEqual(3);
      expect(chapter.reviewStatus).toBe('source-reviewed-editorial-pass');
      expect(chapter.reviewNote).toContain('independent licensed-audiologist validation remains pending');
      expect(chapter.sections.every((entry) => entry.content.length >= 300 && entry.keyTerms.length >= 3)).toBe(true);
      expect(chapter.knowledgeChecks.every((check) => check.choices.length === 4 && check.answerIndex >= 0 && check.answerIndex < 4 && check.rationale.length >= 80)).toBe(true);
      expect(chapter.references.every((url) => allowedHosts.has(new URL(url).hostname))).toBe(true);
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
    expect(pack).toMatchObject({ learningLibraryUrl: './test_prep/audiology_5343_learning_library.json', learningLibraryQaUrl: './test_prep/audiology_5343_learning_library_qa.json', simulationItemCount: 120, simulationTimeMinutes: 120 });
  });

  it('publishes passing QA and exact learning-library mirrors', () => {
    expect(qa.summary).toMatchObject({ chapters: 12, sections: 48, knowledgeChecks: 60, flashcards: 75, memoryAids: 20, findings: [], status: 'pass' });
    expect(qa.standard.limitation).toContain('not ETS or ASHA approval');
    for (const name of ['audiology_5343_learning_library.json', 'audiology_5343_learning_library_qa.json', 'audiology_5343_learning_library_qa.md']) expect(read('desktop/web-app/public/test_prep/' + name)).toBe(read('test_prep/' + name));
  });
});
