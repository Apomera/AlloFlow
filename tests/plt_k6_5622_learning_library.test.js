import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const read = (file) => fs.readFileSync(resolve(process.cwd(), file), 'utf8');
const library = JSON.parse(read('test_prep/plt_k6_5622_learning_library.json'));
const pack = JSON.parse(read('test_prep/plt_k6_5622_pack.json'));
const qa = JSON.parse(read('test_prep/plt_k6_5622_learning_library_qa.json'));

describe('Praxis PLT K–6 5622 native learning library', () => {
  it('ships the complete chapter, card, aid, and case-analysis inventory', () => {
    expect(library).toMatchObject({
      schemaVersion: 1,
      libraryId: 'praxis-plt-k6-5622-learning-library',
      packId: 'praxis-plt-k6-5622',
      simulation: { questionCount: 70, timeMinutes: 70, officialTotalTimeMinutes: 120, officialConstructedResponseCount: 4 },
      summary: { chapters: 12, sections: 48, knowledgeChecks: 60, flashcards: 75, memoryAids: 20, constructedResponseWorkshops: 8, sourceReviewedChapters: 12, sourceReviewedFlashcards: 75, sourceReviewedMemoryAids: 20, sourceReviewedConstructedResponseWorkshops: 8 },
    });
    expect(library.skills).toHaveLength(12);
    expect(library.chapters).toHaveLength(12);
    expect(library.flashcards).toHaveLength(75);
    expect(library.memoryAids).toHaveLength(20);
    expect(library.constructedResponseWorkshops).toHaveLength(8);
    expect(library.legalCaution).toContain('not a diagnosis');
    expect(library.legalCaution).toContain('mandated-reporting determination');
    expect(library.simulation.note).toContain('does not score written responses');
  });

  it('gives every chapter four substantive lessons and five source-reviewed checks', () => {
    const allowedHosts = new Set(['ets.org', 'www.ets.org', 'ccsso.org', 'www.ccsso.org', 'ies.ed.gov', 'studentprivacy.ed.gov', 'sites.ed.gov', 'ed.gov', 'www.ed.gov']);
    for (const chapter of library.chapters) {
      expect(chapter.sections).toHaveLength(4);
      expect(chapter.knowledgeChecks).toHaveLength(5);
      expect(chapter.objectives.length).toBeGreaterThanOrEqual(3);
      expect(chapter.reviewStatus).toBe('source-reviewed-editorial-pass');
      expect(chapter.reviewNote).toContain('independent practicing K–6 educator and psychometric validation remain pending');
      expect(chapter.sections.every((entry) => entry.content.length >= 300 && entry.keyTerms.length >= 3)).toBe(true);
      expect(chapter.knowledgeChecks.every((check) => check.choices.length === 4 && check.answerIndex >= 0 && check.answerIndex < 4 && check.rationale.length >= 100)).toBe(true);
      expect(chapter.references.every((url) => allowedHosts.has(new URL(url).hostname))).toBe(true);
    }
  });

  it('covers every 5622 case-analysis category with transparent self-check scaffolds', () => {
    const types = library.constructedResponseWorkshops.reduce((counts, workshop) => { counts[workshop.taskType] = (counts[workshop.taskType] || 0) + 1; return counts; }, {});
    expect(types).toEqual({ 'Students as Learners': 1, 'Instructional Process': 2, Assessment: 2, 'Professional Development, Leadership, and Community': 3 });
    for (const workshop of library.constructedResponseWorkshops) {
      expect(workshop.prompt.length).toBeGreaterThanOrEqual(80);
      expect(workshop.stimulus.length).toBeGreaterThanOrEqual(300);
      expect(workshop.taskParts).toHaveLength(3);
      expect(workshop.planningFrame).toHaveLength(4);
      expect(workshop.successCriteria).toHaveLength(4);
      expect(workshop.commonPitfalls).toHaveLength(4);
      expect(workshop.sampleOutline).toHaveLength(3);
      expect(workshop.references.length).toBeGreaterThanOrEqual(2);
      expect(workshop.reviewStatus).toBe('source-reviewed-editorial-pass');
      expect(workshop.reviewNote).toContain('not an official ETS prompt, scoring guide, score, or prediction');
    }
  });

  it('links all 200 questions to exactly one compatible skill and chapter', () => {
    const skillById = Object.fromEntries(library.skills.map((skill) => [skill.id, skill]));
    const chapterById = Object.fromEntries(library.chapters.map((chapter) => [chapter.id, chapter]));
    for (const item of pack.items) {
      const skill = skillById[item.skillIds[0]];
      const chapter = chapterById[item.chapterIds[0]];
      expect(item.skillIds).toHaveLength(1);
      expect(item.chapterIds).toHaveLength(1);
      expect(skill).toBeTruthy();
      expect(chapter).toBeTruthy();
      expect(skill.domainId).toBe(item.domainId);
      expect(skill.chapterId).toBe(chapter.id);
      expect(chapter.skillId).toBe(skill.id);
    }
    expect(pack).toMatchObject({ learningLibraryUrl: './test_prep/plt_k6_5622_learning_library.json', learningLibraryQaUrl: './test_prep/plt_k6_5622_learning_library_qa.json', simulationItemCount: 70, simulationTimeMinutes: 70 });
  });

  it('publishes passing QA and exact learning-library mirrors', () => {
    expect(qa.summary).toMatchObject({ chapters: 12, sections: 48, knowledgeChecks: 60, flashcards: 75, memoryAids: 20, constructedResponseWorkshops: 8, findings: [], status: 'pass' });
    expect(qa.standard.limitation).toContain('not ETS or CCSSO approval');
    expect(qa.standard.limitation).toContain('official constructed-response scoring');
    for (const name of ['plt_k6_5622_learning_library.json', 'plt_k6_5622_learning_library_qa.json', 'plt_k6_5622_learning_library_qa.md']) expect(read('desktop/web-app/public/test_prep/' + name)).toBe(read('test_prep/' + name));
  });
});
