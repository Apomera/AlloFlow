import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const read = (path) => fs.readFileSync(resolve(process.cwd(), path), 'utf8');
const library = JSON.parse(read('test_prep/parapro_learning_library.json'));
const pack = JSON.parse(read('test_prep/parapro_pack.json'));
const qa = JSON.parse(read('test_prep/parapro_learning_library_qa.json'));

describe('ParaPro native learning library', () => {
  it('ships the complete chapter, check, card, and memory-aid inventory', () => {
    expect(library).toMatchObject({
      schemaVersion: 1,
      libraryId: 'parapro-1755-learning-library',
      packId: 'parapro-1755-practice-1',
      simulation: { questionCount: 90, timeMinutes: 150 },
      summary: {
        chapters: 12,
        sections: 48,
        knowledgeChecks: 60,
        flashcards: 75,
        memoryAids: 20,
        sourceReviewedChapters: 12,
        sourceReviewedFlashcards: 75,
        sourceReviewedMemoryAids: 20,
      },
    });
    expect(library.skills).toHaveLength(12);
    expect(library.chapters).toHaveLength(12);
    expect(library.flashcards).toHaveLength(75);
    expect(library.memoryAids).toHaveLength(20);
    expect(new Set(library.skills.map((skill) => skill.id)).size).toBe(12);
    expect(new Set(library.chapters.map((chapter) => chapter.id)).size).toBe(12);
  });

  it('gives every chapter four substantive lessons and five one-best-answer checks', () => {
    const allowedHosts = new Set(['www.ets.org', 'ies.ed.gov', 'openstax.org']);
    for (const chapter of library.chapters) {
      expect(chapter.sections).toHaveLength(4);
      expect(chapter.knowledgeChecks).toHaveLength(5);
      expect(chapter.objectives.length).toBeGreaterThanOrEqual(3);
      expect(chapter.reviewStatus).toBe('source-reviewed-editorial-pass');
      expect(chapter.reviewNote).toContain('independent educator validation remains pending');
      expect(chapter.sections.every((section) => section.content.length >= 250)).toBe(true);
      expect(chapter.sections.every((section) => section.keyTerms.length >= 3)).toBe(true);
      expect(chapter.knowledgeChecks.every((check) => check.choices.length === 4)).toBe(true);
      expect(chapter.knowledgeChecks.every((check) => check.answerIndex >= 0 && check.answerIndex < 4)).toBe(true);
      expect(chapter.knowledgeChecks.every((check) => check.rationale.length >= 70)).toBe(true);
      expect(chapter.references.every((url) => allowedHosts.has(new URL(url).hostname))).toBe(true);
    }
  });

  it('links all 500 learning activities to exactly one compatible skill and chapter', () => {
    const skillById = Object.fromEntries(library.skills.map((skill) => [skill.id, skill]));
    const chapterById = Object.fromEntries(library.chapters.map((chapter) => [chapter.id, chapter]));
    expect(pack.items).toHaveLength(500);
    for (const item of pack.items) {
      expect(item.skillIds).toHaveLength(1);
      expect(item.chapterIds).toHaveLength(1);
      const skill = skillById[item.skillIds[0]];
      const chapter = chapterById[item.chapterIds[0]];
      expect(skill).toBeTruthy();
      expect(chapter).toBeTruthy();
      expect(skill.domainId).toBe(item.domainId);
      expect(skill.chapterId).toBe(chapter.id);
      expect(chapter.skillId).toBe(skill.id);
    }
    expect(pack).toMatchObject({
      version: '0.7.0',
      learningLibraryUrl: './test_prep/parapro_learning_library.json',
      learningLibraryQaUrl: './test_prep/parapro_learning_library_qa.json',
      simulationItemCount: 90,
      simulationTimeMinutes: 150,
    });
  });

  it('publishes a passing QA report and exact deployment mirrors', () => {
    expect(qa.summary).toMatchObject({
      chapters: 12,
      sections: 48,
      knowledgeChecks: 60,
      flashcards: 75,
      memoryAids: 20,
      findings: [],
      status: 'pass',
    });
    expect(qa.standard.limitation).toContain('not ETS approval');
    expect(read('desktop/web-app/public/test_prep/parapro_learning_library.json')).toBe(read('test_prep/parapro_learning_library.json'));
    expect(read('desktop/web-app/public/test_prep/parapro_learning_library_qa.json')).toBe(read('test_prep/parapro_learning_library_qa.json'));
    expect(read('desktop/web-app/public/test_prep/parapro_learning_library_qa.md')).toBe(read('test_prep/parapro_learning_library_qa.md'));
  });
});
