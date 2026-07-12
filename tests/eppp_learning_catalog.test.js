import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath) => JSON.parse(fs.readFileSync(resolve(process.cwd(), relativePath), 'utf8'));

describe('EPPP native learning-library catalog', () => {
  const catalog = read('test_prep/eppp_learning_library.json');
  const qa = read('test_prep/eppp_learning_library_qa.json');

  it('catalogs the complete preserved learning library with stable unique IDs', () => {
    expect(catalog.summary).toMatchObject({ chapters: 49, sections: 278, diagrams: 25, diagramPlacements: 50, knowledgeChecks: 90, flashcards: 415, memoryAids: 255 });
    expect(new Set(catalog.chapters.map((item) => item.id)).size).toBe(49);
    expect(new Set(catalog.flashcards.map((item) => item.id)).size).toBe(415);
    expect(new Set(catalog.memoryAids.map((item) => item.id)).size).toBe(255);
  });

  it('keeps unreviewed content gated while recording complete provenance and learner structure', () => {
    expect(catalog.chapters.every((chapter) => ['review-required', 'source-reviewed-editorial-pass'].includes(chapter.reviewStatus) && chapter.legacySource)).toBe(true);
    expect(catalog.chapters.filter((chapter) => chapter.reviewStatus === 'source-reviewed-editorial-pass').map((chapter) => chapter.id)).toEqual(['ch-5', 'ch-6', 'ch-7', 'ch-8', 'ch-9', 'ch-10', 'ch-11', 'ch-12', 'ch-13', 'ch-14', 'ch-15', 'ch-16', 'ch-17', 'ch-18', 'ch-19', 'ch-20', 'ch-21', 'ch-22', 'ch-47', 'ch-49']);
    expect(catalog.chapters.filter((chapter) => chapter.reviewStatus === 'review-required')).toHaveLength(29);
    expect(catalog.chapters.find((chapter) => chapter.id === 'ch-12')).toMatchObject({ diagramCount: 1, checks: { 'expert-review': 'pending-independent-review' } });
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
    expect(qa.summary).toMatchObject({ qaPassedChapters: 0, sourceReviewedChapters: 20, qaPassedFlashcards: 0, qaPassedMemoryAids: 0 });
  });

  it('keeps native catalog and QA deployment copies synchronized', () => {
    expect(read('prismflow-deploy/public/test_prep/eppp_learning_library.json')).toEqual(catalog);
    expect(read('prismflow-deploy/public/test_prep/eppp_learning_library_qa.json')).toEqual(qa);
  });
});
