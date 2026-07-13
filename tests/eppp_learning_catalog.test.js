import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));
const readText = (relativePath) => fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('EPPP native learning-library catalog', () => {
  const catalog = read('test_prep/eppp_learning_library.json');
  const qa = read('test_prep/eppp_learning_library_qa.json');
  const reviewOverrides = read('test_prep/eppp_learning_review_overrides.json');

  it('catalogs the complete preserved learning library with stable unique IDs', () => {
    expect(catalog.summary).toMatchObject({ chapters: 49, sections: 278, diagrams: 25, diagramPlacements: 54, knowledgeChecks: 93, flashcards: 415, memoryAids: 255 });
    expect(new Set(catalog.chapters.map((item) => item.id)).size).toBe(49);
    expect(new Set(catalog.flashcards.map((item) => item.id)).size).toBe(415);
    expect(new Set(catalog.memoryAids.map((item) => item.id)).size).toBe(255);
  });

  it('keeps unreviewed content gated while recording complete provenance and learner structure', () => {
    expect(catalog.chapters.every((chapter) => ['review-required', 'source-reviewed-editorial-pass'].includes(chapter.reviewStatus) && chapter.legacySource)).toBe(true);
    expect(catalog.chapters.filter((chapter) => chapter.reviewStatus === 'source-reviewed-editorial-pass').map((chapter) => chapter.id)).toEqual(['ch-1', 'ch-2', 'ch-5', 'ch-6', 'ch-7', 'ch-8', 'ch-9', 'ch-10', 'ch-11', 'ch-12', 'ch-13', 'ch-14', 'ch-15', 'ch-16', 'ch-17', 'ch-18', 'ch-19', 'ch-20', 'ch-21', 'ch-22', 'ch-23', 'ch-24', 'ch-25', 'ch-26', 'ch-27', 'ch-28', 'ch-47', 'ch-49']);
    expect(catalog.chapters.filter((chapter) => chapter.reviewStatus === 'review-required')).toHaveLength(21);
    expect(catalog.chapters.find((chapter) => chapter.id === 'ch-12')).toMatchObject({ diagramCount: 1, checks: { 'expert-review': 'pending-independent-review' } });
    const psychometrics = catalog.chapters.find((chapter) => chapter.id === 'ch-1');
    expect(psychometrics).toMatchObject({
      reviewStatus: 'source-reviewed-editorial-pass',
      diagramCount: 2,
      checks: { 'expert-review': 'pending-independent-psychometrics-review' },
    });
    expect(reviewOverrides.chapters['ch-1'].references).toHaveLength(7);
    expect(psychometrics.sections.filter((section) => section.hasKnowledgeCheck)).toHaveLength(2);
    expect(catalog.chapters.flatMap((chapter) => chapter.sections)).toHaveLength(278);
    expect(catalog.flashcards.every((card) => card.front && card.back && ['review-required', 'source-reviewed-editorial-pass'].includes(card.reviewStatus))).toBe(true);
    expect(catalog.flashcards.filter((card) => card.reviewStatus === 'source-reviewed-editorial-pass')).toHaveLength(9);
    expect(catalog.flashcards.filter((card) => card.reviewStatus === 'review-required')).toHaveLength(406);
    expect(catalog.memoryAids.every((aid) => aid.title && aid.content && ['review-required', 'source-reviewed-editorial-pass', 'editorial-reviewed-source-pending'].includes(aid.reviewStatus))).toBe(true);
    expect(catalog.memoryAids.filter((aid) => aid.reviewStatus === 'source-reviewed-editorial-pass')).toHaveLength(8);
    expect(catalog.memoryAids.filter((aid) => aid.reviewStatus === 'editorial-reviewed-source-pending')).toHaveLength(2);
    expect(catalog.memoryAids.filter((aid) => aid.reviewStatus === 'review-required')).toHaveLength(245);
    expect(catalog.diagrams.every((diagram) => diagram.hasSvg && diagram.description)).toBe(true);
    expect(qa.status).toBe('review-in-progress');
    expect(qa.summary).toMatchObject({ qaPassedChapters: 0, sourceReviewedChapters: 28, qaPassedFlashcards: 0, qaPassedMemoryAids: 0 });
  });

  it('keeps Chapter 1 psychometric claims qualified and interaction metadata intact', () => {
    const chapter = readText('test_prep/eppp_legacy/js/textbook_ch5_1.js');
    const diagrams = readText('test_prep/eppp_legacy/js/textbook_diagrams.js');

    expect(chapter).toContain('current EPPP Part 1');
    expect(chapter).toContain('conditional SEM');
    expect(chapter).toContain('midpoint between the lower asymptote');
    expect(chapter).toContain('model fits and calibrations are placed on a common scale');
    expect(chapter).toContain('content, exposure, and stopping constraints');
    expect(chapter).toContain('|r<sub>xy</sub>|');
    expect(chapter).not.toContain('item parameters are sample-independent');
    expect(chapter).not.toContain('Restriction of range always');
    expect(diagrams).toContain('Validity is a unified argument for an intended score interpretation and use');
    expect(diagrams).toContain('Face credibility (not validity evidence)');
  });

  it('keeps Chapter 2 cognitive-assessment claims qualified and interaction metadata intact', () => {
    const chapter = readText('test_prep/eppp_legacy/js/textbook_ch5_2.js');
    const cognitiveAssessment = catalog.chapters.find((item) => item.id === 'ch-2');

    expect(cognitiveAssessment).toMatchObject({
      reviewStatus: 'source-reviewed-editorial-pass',
      diagramCount: 2,
      checks: { 'expert-review': 'pending-independent-cognitive-assessment-review' },
    });
    expect(cognitiveAssessment.sections.filter((section) => section.hasKnowledgeCheck)).toHaveLength(2);
    expect(reviewOverrides.chapters['ch-2'].references.length).toBeGreaterThanOrEqual(12);
    expect(chapter).toContain('validated version and interpret it with');
    expect(chapter).toContain('should not automatically be equated with malingering');
    expect(chapter).toContain('Do <em>not</em> mechanically subtract a fixed number of points');
    expect(chapter).toContain('currently operationalizes developmental onset as before age 22');
    expect(chapter).toContain('Lack of embodiment in software must not be equated with intellectual disability');
    expect(chapter).not.toContain('90% sensitivity vs. MMSE');
    expect(chapter).not.toContain('true score of 67');
    expect(chapter).not.toContain('Scores below expected range suggest insufficient effort or deliberate faking');
    expect(chapter).not.toContain('Profound intellectual disability in the practical domain');
  });

  it('keeps native catalog and QA deployment copies synchronized', () => {
    expect(read('prismflow-deploy/public/test_prep/eppp_learning_library.json')).toEqual(catalog);
    expect(read('prismflow-deploy/public/test_prep/eppp_learning_library_qa.json')).toEqual(qa);
  });
});
