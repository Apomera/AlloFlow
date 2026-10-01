import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const sources = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const questionTypes = ['mcq', 'multi-select', 'fill-blank', 'short-answer', 'self-explanation', 'sequence-sense', 'relation-mismatch', 'answer-evidence', 'numeric-response'];

function loadReview(sourceFile, questions) {
  const source = readFileSync(sourceFile, 'utf8');
  const start = source.indexOf('  const handleReviewTileClick = (question, points) => {');
  const end = source.indexOf('  const toggleTheme = () => {', start);
  if (start < 0 || end < 0) throw new Error('Missing Review Game handlers in ' + sourceFile);
  let state = { claimed: new Set(), activeQuestion: null, showAnswer: false };
  const playSound = vi.fn();
  const api = new Function('generatedContent', 't', 'setReviewGameState', 'playSound',
    source.slice(start, end) + '\nreturn { getReviewCategories, handleReviewTileClick, closeReviewModal };'
  )({ data: { questions } }, key => key, updater => { state = updater(state); }, playSound);
  return { ...api, state: () => state };
}

function items(categories) {
  return categories.flatMap(category => category.questions).sort((a, b) => a.originalIndex - b.originalIndex);
}

for (const sourceFile of sources) {
  describe('Review Game item coverage: ' + sourceFile, () => {
    it('includes every item in a mixed assessment instead of only its three MCQs', () => {
      const questions = [
        ...Array.from({ length: 3 }, (_, i) => ({ type: 'mcq', question: 'Choice ' + i, options: ['A', 'B'], correctAnswer: 'A' })),
        ...questionTypes.slice(1).map(type => ({ type, question: 'Prompt for ' + type, expectedAnswer: 'Reference answer' })),
      ];
      const before = structuredClone(questions);
      const categories = loadReview(sourceFile, questions).getReviewCategories();
      expect(categories.map(category => category.questions.length)).toEqual([4, 4, 3]);
      expect(items(categories).map(q => q.type)).toEqual(questions.map(q => q.type));
      expect(items(categories).map(q => q.originalIndex)).toEqual(questions.map((_, i) => i));
      expect(categories[0].questions.map(q => q.points)).toEqual([100, 200, 300, 400]);
      expect(questions).toEqual(before);
    });

    it('retains every question without a 100-item or fixed-board-size limit', () => {
      const questions = Array.from({ length: 503 }, (_, i) => ({ type: questionTypes[i % questionTypes.length], question: 'Item ' + i }));
      const result = items(loadReview(sourceFile, questions).getReviewCategories());
      expect(result).toHaveLength(503);
      expect(new Set(result.map(q => q.originalIndex)).size).toBe(503);
      expect(result.at(-1)).toMatchObject({ originalIndex: 502, question: 'Item 502', points: 16800 });
    });

    it('skips invalid entries while preserving source indexes for claiming tiles', () => {
      const questions = [null, { type: 'short-answer', question: 'Explain', expectedAnswer: 'Because' }, undefined, 'invalid', [], { type: 'numeric-response', question: 'Count', correctValue: 0 }];
      const review = loadReview(sourceFile, questions);
      const categories = review.getReviewCategories();
      expect(categories).toHaveLength(2);
      const result = items(categories);
      expect(result.map(q => q.originalIndex)).toEqual([1, 5]);
      expect(result.map(q => q.points)).toEqual([100, 100]);
      review.handleReviewTileClick(result[1], result[1].points);
      expect(review.state().activeQuestion).toMatchObject({ originalIndex: 5, correctValue: 0, points: 100 });
      review.closeReviewModal(false);
      expect(review.state().claimed.size).toBe(0);
      review.handleReviewTileClick(result[1], result[1].points);
      review.closeReviewModal(true);
      expect(Array.from(review.state().claimed)).toEqual([5]);
      expect(review.state().activeQuestion).toBeNull();
    });

    it.each([undefined, null, {}, 'invalid', [], [null]])('returns an empty board for absent or invalid question collections (%j)', questions => {
      expect(loadReview(sourceFile, questions).getReviewCategories()).toEqual([]);
    });
  });
}
