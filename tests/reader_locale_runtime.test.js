import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { setupReader, mountReader, disposeReader, click, act, fixtures, View } from './helpers/reader_locale_harness.js';
beforeAll(setupReader);
// Bookmarks save only with cross-tab locks (the store refuses an unsafe
// localStorage read/modify/write); jsdom has none, so provide the browser's.
beforeEach(() => {
  localStorage.clear();
  let queue = Promise.resolve();
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request(_key, callback) { const next = queue.then(callback); queue = next.catch(() => {}); return next; } } });
});
afterEach(() => { disposeReader(); vi.restoreAllMocks(); delete navigator.locks; });
describe('named reader language fixtures', () => {
  for (const fixture of fixtures) {
    it(fixture.id + ': translated review, bookmarks, prompts and student preview', async () => {
      window.__alloGetReadAloudAudioSummary = texts => ({ ready: texts.length, stale: 0 });
      const { host, t } = mountReader(fixture);
      expect(host.querySelector('[data-review-state="text"]').textContent).toContain(t('simplified.review_text_unchanged'));
      expect(host.querySelector('[data-review-state="audio"]').textContent).not.toMatch(/\{(?:saved|total)\}/);
      const paragraph = host.querySelector('[data-reading-paragraph="1"]');
      expect(paragraph.lang).toBe(fixture.tag); expect(paragraph.dir).toBe(fixture.dir);
      act(() => { paragraph.setAttribute('tabindex', '-1'); paragraph.focus(); });
      await click(host.querySelector('[data-reading-outline-toggle]'));
      await click(host.querySelector('[data-reading-bookmark]'));
      const notice = host.querySelector('[data-reading-place-notice]').textContent;
      expect(notice).toContain(t('simplified.place_bookmark_saved', { snippet: '' }).trim());
      expect(notice).not.toMatch(/\{snippet\}|simplified\./);
      await click(host.querySelector('[data-section-prompts-toggle]'));
      expect(host.querySelector('[data-section-prompts]').textContent).toContain(t('simplified.prompt_main_idea'));
      expect(host.querySelector('[data-section-prompts]').textContent).toContain(t('simplified.prompt_confusing'));
      const before = JSON.stringify(localStorage);
      await click(host.querySelector('[data-student-preview-open]'));
      const preview = host.querySelector('[data-student-preview]');
      // 37bdb2883 renamed the dialog to a reading-layout preview with its limits stated.
      expect(preview.textContent).toContain(t('simplified.layout_preview_note'));
      expect(preview.textContent).toContain(t('simplified.layout_preview_limits'));
      expect(preview.querySelector('[data-reading-paragraph="1"]').lang).toBe(fixture.tag);
      await click(preview.querySelector('[data-reading-outline-toggle]'));
      await click(preview.querySelector('[data-reading-bookmark]'));
      expect(JSON.stringify(localStorage)).toBe(before);
      await click(preview.querySelector('[data-student-preview-close]'));
      expect(host.querySelector('[data-student-preview]')).toBeNull();
      expect(host.textContent).not.toMatch(/simplified\.(?:review|place|prompt|preview|adapt)_|\{(?:snippet|saved|total)\}/);
    });
    it(fixture.id + ': translated adaptation options, preview and discard', async () => {
      const preview = { status: 'preview', resourceId: fixture.id, baseData: fixture.passage, data: fixture.passage + '\n\n' + fixture.snippet, config: { language: fixture.language } };
      const handleComplexityAdjustment = vi.fn(async () => preview);
      const { host, t } = mountReader(fixture, { handleComplexityAdjustment });
      // c4c8d6f8b replaced the short hint with the exact parser rules (adapt_exact_terms_hint).
      expect(host.querySelector('[data-adaptation-controls]').textContent).toContain(t('simplified.adapt_exact_terms_hint'));
      await click(host.querySelector('[data-adapt-option="shorterSentences"]'));
      await click(host.querySelector('[data-apply-complexity]'));
      expect(host.querySelector('[data-adaptation-preview]').textContent).toContain(t('simplified.adapt_preview_hint'));
      await click(host.querySelector('[data-adaptation-discard]'));
      expect(host.querySelector('[data-adaptation-notice]').textContent).toBe(t('simplified.adapt_discarded'));
      expect(handleComplexityAdjustment).toHaveBeenCalledTimes(1);
    });
  }
  it('Arabic arrows follow passage direction even in an English interface', () => {
    const arabic = { ...fixtures.find(f => f.locale === 'arabic'), locale: 'English' };
    const { host } = mountReader(arabic, { interactionMode: 'define', isTeacherMode: false });
    const words = [...host.querySelectorAll('[data-reading-paragraph="1"] [data-reading-word]')];
    expect(words.length).toBeGreaterThan(2);
    act(() => { words[0].focus(); words[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })); });
    expect(document.activeElement).toBe(words[1]);
    act(() => words[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    expect(document.activeElement).toBe(words[0]);
  });
  it.each(fixtures.filter(f => ['chinese_simplified', 'thai'].includes(f.locale)))('$id: retains unspaced text with and without Intl.Segmenter', fixture => {
    const sample = fixture.snippet;
    expect(View.wordSegments(sample, fixture.language).map(p => p.text).join('')).toBe(sample);
    expect(View.wordSegments(sample, fixture.language).filter(p => p.word).length).toBeGreaterThan(1);
    const segmenter = Intl.Segmenter;
    try {
      Intl.Segmenter = undefined;
      expect(View.wordSegments(sample, fixture.language).map(p => p.text).join('')).toBe(sample);
    } finally { Intl.Segmenter = segmenter; }
  });
});

describe('scoped fallback honesty', () => {
  it.each(['missing', 'echoed'])('%s translator keeps focused labels readable in English', kind => {
    const { host } = mountReader(fixtures[0], { t: kind === 'echoed' ? key => key : () => undefined });
    expect(host.querySelector('[data-teacher-review-summary]').textContent).toContain('Before you share');
    expect(host.querySelector('[data-adaptation-controls]').textContent).toContain('Preserve these essential terms');
    expect(host.querySelector('[data-teacher-review-summary]').textContent).not.toContain('simplified.');
    expect(host.querySelector('[data-adaptation-controls]').textContent).not.toContain('simplified.');
  });
});
