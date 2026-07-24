import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const read = (file) => fs.readFileSync(resolve(process.cwd(), file), 'utf8');
const library = JSON.parse(read('test_prep/reading_specialist_5302_learning_library.json'));
const pack = JSON.parse(read('test_prep/reading_specialist_5302_pack.json'));
const qa = JSON.parse(read('test_prep/reading_specialist_5302_learning_library_qa.json'));

describe('Praxis Reading Specialist 5302 native learning library', () => {
  it('ships the complete chapter, card, aid, and response-workshop inventory', () => {
    expect(library).toMatchObject({
      schemaVersion: 1,
      libraryId: 'praxis-reading-specialist-5302-learning-library',
      packId: 'praxis-reading-specialist-5302',
      simulation: { questionCount: 95, timeMinutes: 150, officialConstructedResponseCount: 2 },
      summary: { chapters: 12, sections: 48, knowledgeChecks: 60, flashcards: 75, memoryAids: 20, constructedResponseWorkshops: 6, sourceReviewedChapters: 12, sourceReviewedFlashcards: 75, sourceReviewedMemoryAids: 20, sourceReviewedConstructedResponseWorkshops: 6 },
    });
    expect(library.skills).toHaveLength(12);
    expect(library.chapters).toHaveLength(12);
    expect(library.flashcards).toHaveLength(75);
    expect(library.memoryAids).toHaveLength(20);
    expect(library.constructedResponseWorkshops).toHaveLength(6);
    expect(library.legalCaution).toContain('not a diagnosis of dyslexia or disability');
    expect(library.legalCaution).toContain('special-education evaluation or eligibility decision');
    expect(library.simulation.note).toContain('does not score written responses');
  });

  it('gives every chapter four substantive lessons and five source-reviewed checks', () => {
    const allowedHosts = new Set(['praxis.ets.org', 'www.literacyworldwide.org', 'ies.ed.gov', 'dyslexiaida.org', 'intensiveintervention.org', 'wida.wisc.edu', 'sites.ed.gov', 'studentprivacy.ed.gov']);
    for (const chapter of library.chapters) {
      expect(chapter.sections).toHaveLength(4);
      expect(chapter.knowledgeChecks).toHaveLength(5);
      expect(chapter.objectives.length).toBeGreaterThanOrEqual(3);
      expect(chapter.reviewStatus).toBe('source-reviewed-editorial-pass');
      expect(chapter.reviewNote).toContain('independent reading-specialist validation remains pending');
      expect(chapter.sections.every((entry) => entry.content.length >= 300 && entry.keyTerms.length >= 3)).toBe(true);
      expect(chapter.knowledgeChecks.every((check) => check.choices.length === 4 && check.answerIndex >= 0 && check.answerIndex < 4 && check.rationale.length >= 80)).toBe(true);
      expect(chapter.references.every((url) => allowedHosts.has(new URL(url).hostname))).toBe(true);
    }
  });

  it('covers both official response types with transparent self-check scaffolds', () => {
    const types = library.constructedResponseWorkshops.reduce((counts, workshop) => { counts[workshop.taskType] = (counts[workshop.taskType] || 0) + 1; return counts; }, {});
    expect(types).toEqual({ 'Professional leadership': 3, 'Individual student case study': 3 });
    for (const workshop of library.constructedResponseWorkshops) {
      expect(workshop.prompt.length).toBeGreaterThanOrEqual(80);
      expect(workshop.stimulus.length).toBeGreaterThanOrEqual(180);
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
    expect(pack).toMatchObject({ learningLibraryUrl: './test_prep/reading_specialist_5302_learning_library.json', learningLibraryQaUrl: './test_prep/reading_specialist_5302_learning_library_qa.json', simulationItemCount: 95, simulationTimeMinutes: 150 });
  });

  it('publishes passing QA and exact learning-library mirrors', () => {
    expect(qa.summary).toMatchObject({ chapters: 12, sections: 48, knowledgeChecks: 60, flashcards: 75, memoryAids: 20, constructedResponseWorkshops: 6, findings: [], status: 'pass' });
    expect(qa.standard.limitation).toContain('not ETS or ILA approval');
    expect(qa.standard.limitation).toContain('official constructed-response scoring');
    for (const name of ['reading_specialist_5302_learning_library.json', 'reading_specialist_5302_learning_library_qa.json', 'reading_specialist_5302_learning_library_qa.md']) expect(read('desktop/web-app/public/test_prep/' + name)).toBe(read('test_prep/' + name));
  });
});
