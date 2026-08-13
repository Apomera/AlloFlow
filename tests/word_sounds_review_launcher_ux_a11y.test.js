import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const reviewSource = readFileSync('misc_components_source.jsx', 'utf8');
const launcherSource = readFileSync('view_word_sounds_preview_source.jsx', 'utf8');

describe('Word Sounds review and launcher UX accessibility', () => {
  it('deletes review words from a keyboard-activated click and names the target word', () => {
    const marker = reviewSource.indexOf('data-word-delete-button="true"');
    const buttonStart = reviewSource.lastIndexOf('<button', marker);
    const buttonEnd = reviewSource.indexOf('</button>', marker);
    const deleteButton = reviewSource.slice(buttonStart, buttonEnd);

    expect(marker).toBeGreaterThan(0);
    expect(deleteButton).toContain('onClick={(event) => deleteReviewWord(event, word, idx)}');
    expect(deleteButton).not.toContain('onMouseDown');
    expect(deleteButton).toContain("t('common.delete_word')");
    expect(deleteButton).toContain('word.targetWord || word.word');
  });

  it('moves focus after deletion and offers an announced Undo action', () => {
    expect(reviewSource).toContain('focusReviewDeleteControl(index)');
    expect(reviewSource).toContain("querySelectorAll('[data-word-delete-button]')");
    expect(reviewSource).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(reviewSource).toContain('onClick={undoReviewWordDelete}');
  });

  it('opens the phonics counting guide with an operable disclosure button', () => {
    expect(reviewSource).toContain('aria-expanded={isCountingGuideOpen}');
    expect(reviewSource).toContain('aria-controls="word-sounds-counting-guide"');
    expect(reviewSource).toContain('onClick={() => setIsCountingGuideOpen((open) => !open)}');
    expect(reviewSource).not.toContain('group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity motion-reduce:transition-none z-50 pointer-events-none');
  });

  it('keeps footer accessible names aligned with their visible actions', () => {
    expect(reviewSource).toContain("aria-label={t('word_sounds.back_to_setup') || 'Back to Setup'}");
    expect(reviewSource).toContain("aria-label={t('word_sounds.start_activity') || 'Start Activity'}");
    expect(reviewSource).not.toContain("aria-label={t('common.previous')}");
    expect(reviewSource).not.toContain("aria-label={t('common.play')}\n                            onClick={onStartActivity}");
  });

  it('stacks review controls and clearly distinguishes teacher and student launch paths', () => {
    expect(reviewSource).toContain('flex flex-col-reverse sm:flex-row');
    expect(reviewSource).toContain('flex min-w-0 flex-1 flex-wrap');
    expect(launcherSource).toContain('Teacher: Review Words &amp; Audio');
    expect(launcherSource).toContain('Student: Start Practice');
    expect(launcherSource).toContain('setWordSoundsAutoReview(false)');
  });
});
