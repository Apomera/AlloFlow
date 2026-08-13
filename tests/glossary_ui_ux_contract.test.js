import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_glossary_source.jsx', 'utf8');
const built = readFileSync('view_glossary_module.js', 'utf8');
const deployed = readFileSync('desktop/web-app/public/view_glossary_module.js', 'utf8');

describe('Glossary focused UI and UX contract', () => {
  it('groups study, games, and teacher actions without removing capabilities', () => {
    expect(source).toContain('id="glossary-study-tools-title"');
    expect(source).toContain('id="glossary-games-tools"');
    expect(source).toContain('id="glossary-teacher-tools"');
    expect(source).toContain('aria-controls="glossary-games-tools"');
    expect(source).toContain('aria-controls="glossary-teacher-tools"');
    for (const helpKey of [
      'glossary_standard_flashcards', 'glossary_language_flashcards',
      'glossary_word_search', 'glossary_memory_game', 'glossary_crossword',
      'glossary_matching', 'glossary_bingo', 'glossary_play_bingo',
      'glossary_scramble', 'glossary_export_standard', 'glossary_edit'
    ]) expect(source).toContain('data-help-key="' + helpKey + '"');
  });

  it('exposes filter state and a recoverable filtered-empty state', () => {
    expect(source).toContain('role="group" aria-label="Vocabulary type"');
    expect(source).toContain("aria-pressed={glossaryFilter === 'all'}");
    expect(source).toContain("aria-pressed={glossaryFilter === 'academic'}");
    expect(source).toContain("aria-pressed={glossaryFilter === 'domain'}");
    expect(source).toContain('filteredGlossaryData.length === 0');
    expect(source).toContain('No terms match this search or vocabulary filter.');
    expect(source).toContain('onClick={clearGlossaryFilters}');
    expect(source).not.toContain("aria-label={t('common.close')} data-help-key=\"glossary_filter_");
  });

  it('uses learner-readable tier labels and contextual select names', () => {
    expect(source).toContain('Academic vocabulary');
    expect(source).toContain('Subject vocabulary');
    expect(source).toContain('aria-label="Word search language"');
    expect(source).toContain('aria-label="Standard flashcard language"');
    expect(source).toContain('aria-label="Language flashcard deck"');
  });

  it('uses stable entry identities for rows and flashcard review state', () => {
    expect(source).toContain('function getGlossaryEntryKey(item, idx)');
    expect(source).toContain("return 'entry:' + String(item.entryId)");
    expect(source).toContain("return 'id:' + String(item.id)");
    expect(source).toContain('return getGlossaryEntryKey(item, idx)');
    expect(source).toContain('key={getGlossaryEntryKey(item, idx)}');
  });

  it('uses one complete reset path for desktop and mobile quiz toggles', () => {
    expect(source).toContain('function handleToggleFlashcardQuizMode()');
    expect(source.match(/onClick={handleToggleFlashcardQuizMode}/g)).toHaveLength(2);
    expect(source).toContain('setFlashcardScore(0)');
    expect(source).toContain('setFlashcardIndex(0)');
    expect(source).toContain('setIsFlashcardFlipped(false)');
    expect(source).toContain('setFlashcardOptions([])');
    expect(source).toContain('setFlashcardFeedback(null)');
  });

  it('keeps common row actions visible and touch-sized', () => {
    expect(source).toContain('sm:group-focus-within/image:opacity-100');
    expect(source).not.toContain('opacity-50 group-hover/row:opacity-100');
    expect(source.match(/min-h-11 min-w-11/g)?.length).toBeGreaterThanOrEqual(10);
  });

  it('guards resource-scoped glossary audio preparation and reports progress', () => {
    expect(source).toContain('window.__alloPrepareGlossaryAudio');
    expect(source).toContain('{ includeTerms: true, includeDefinitions: false, languages: [] }');
    expect(source).toContain("typeof prepare !== 'function'");
    expect(source).toContain("doneOrProgress && typeof doneOrProgress === 'object'");
    expect(source).toContain('Saved with this resource/project.');
    expect(source).toContain('id="glossary-audio-prep-status" role="status" aria-live="polite"');
  });

  it('keeps built and deployed artifacts synchronized', () => {
    expect(deployed).toBe(built);
  });
});
