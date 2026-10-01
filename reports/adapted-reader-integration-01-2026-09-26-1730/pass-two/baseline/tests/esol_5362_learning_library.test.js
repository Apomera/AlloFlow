import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const read = (file) => fs.readFileSync(resolve(process.cwd(), file), 'utf8');
const library = JSON.parse(read('test_prep/esol_5362_learning_library.json'));
const pack = JSON.parse(read('test_prep/esol_5362_pack.json'));
const qa = JSON.parse(read('test_prep/esol_5362_learning_library_qa.json'));

describe('Praxis ESOL 5362 native learning library', () => {
  it('ships the complete learning and applied-practice inventory', () => {
    expect(library).toMatchObject({ schemaVersion: 1, libraryId: 'praxis-esol-5362-learning-library', packId: 'praxis-esol-5362', workshopLabel: 'Audio and classroom-analysis workshops', simulation: { questionCount: 120, timeMinutes: 120, officialTotalTimeMinutes: 120 }, summary: { chapters: 12, sections: 48, knowledgeChecks: 60, flashcards: 75, memoryAids: 20, constructedResponseWorkshops: 8, sourceReviewedChapters: 12, sourceReviewedFlashcards: 75, sourceReviewedMemoryAids: 20, sourceReviewedConstructedResponseWorkshops: 8 } });
    expect(library.skills).toHaveLength(12);
    expect(library.chapters).toHaveLength(12);
    expect(library.flashcards).toHaveLength(75);
    expect(library.memoryAids).toHaveLength(20);
    expect(library.constructedResponseWorkshops).toHaveLength(8);
    expect(library.workshopPracticeNote).toContain('do not reproduce ETS recordings');
  });

  it('gives every chapter four substantive lessons and five checks', () => {
    const allowedHosts = new Set(['praxis.ets.org', 'tesol.org', 'www.tesol.org', 'wida.wisc.edu', 'ncela.ed.gov', 'ed.gov', 'www.ed.gov']);
    for (const chapter of library.chapters) {
      expect(chapter.sections).toHaveLength(4);
      expect(chapter.knowledgeChecks).toHaveLength(5);
      expect(chapter.objectives.length).toBeGreaterThanOrEqual(3);
      expect(chapter.reviewStatus).toBe('source-reviewed-editorial-pass');
      expect(chapter.reviewNote).toContain('independent TESOL-subject-matter, multilingual-learner, accessibility, and psychometric validation remain pending');
      expect(chapter.sections.every((entry) => entry.content.length >= 300 && entry.keyTerms.length >= 3)).toBe(true);
      expect(chapter.knowledgeChecks.every((entry) => entry.choices.length === 4 && entry.answerIndex >= 0 && entry.answerIndex < 4 && entry.rationale.length >= 100)).toBe(true);
      expect(chapter.references.every((url) => allowedHosts.has(new URL(url).hostname))).toBe(true);
    }
  });

  it('provides eight distinct applied workshops with transparent boundaries', () => {
    expect(new Set(library.constructedResponseWorkshops.map((entry) => entry.taskType)).size).toBe(8);
    expect(library.constructedResponseWorkshops.slice(0, 4).every((entry) => entry.taskType.startsWith('Transcript'))).toBe(true);
    for (const workshop of library.constructedResponseWorkshops) {
      expect(workshop.prompt.length).toBeGreaterThanOrEqual(100);
      expect(workshop.stimulus.length).toBeGreaterThanOrEqual(300);
      expect(workshop.taskParts).toHaveLength(3);
      expect(workshop.planningFrame).toHaveLength(4);
      expect(workshop.successCriteria).toHaveLength(4);
      expect(workshop.commonPitfalls).toHaveLength(4);
      expect(workshop.sampleOutline).toHaveLength(3);
      expect(workshop.reviewNote).toContain('not an official ETS recording, prompt, item, interface, score');
    }
  });

  it('links all 200 items to one compatible skill and chapter', () => {
    const skillById = Object.fromEntries(library.skills.map((entry) => [entry.id, entry]));
    const chapterById = Object.fromEntries(library.chapters.map((entry) => [entry.id, entry]));
    for (const item of pack.items) {
      const skill = skillById[item.skillIds[0]];
      const chapter = chapterById[item.chapterIds[0]];
      expect(skill.domainId).toBe(item.domainId);
      expect(skill.chapterId).toBe(chapter.id);
      expect(chapter.skillId).toBe(skill.id);
    }
    expect(pack).toMatchObject({ learningLibraryUrl: './test_prep/esol_5362_learning_library.json', learningLibraryQaUrl: './test_prep/esol_5362_learning_library_qa.json' });
  });

  it('publishes passing QA and exact learning-library mirrors', () => {
    expect(qa.summary).toMatchObject({ chapters: 12, sections: 48, knowledgeChecks: 60, flashcards: 75, memoryAids: 20, constructedResponseWorkshops: 8, findings: [], status: 'pass' });
    expect(qa.standard.limitation).toContain('official audio delivery or scoring');
    for (const name of ['esol_5362_learning_library.json', 'esol_5362_learning_library_qa.json', 'esol_5362_learning_library_qa.md']) expect(read('desktop/web-app/public/test_prep/' + name)).toBe(read('test_prep/' + name));
  });
});
