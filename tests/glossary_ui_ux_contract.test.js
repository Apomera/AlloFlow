import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_glossary_source.jsx', 'utf8');
const built = readFileSync('view_glossary_module.js', 'utf8');
const deployed = readFileSync('desktop/web-app/public/view_glossary_module.js', 'utf8');
const uiStrings = readFileSync('ui_strings.js', 'utf8');
const deployedUiStrings = readFileSync('desktop/web-app/public/ui_strings.js', 'utf8');

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
    expect(source).toContain("role=\"group\" aria-label={t('glossary.title')}");
    expect(source).toContain("aria-pressed={glossaryFilter === 'all'}");
    expect(source).toContain("aria-pressed={glossaryFilter === 'academic'}");
    expect(source).toContain("aria-pressed={glossaryFilter === 'domain'}");
    expect(source).toContain('filteredGlossaryData.length === 0');
    // The single catch-all "No terms match this search or vocabulary filter."
    // was replaced (fleet L1/G6): it claimed a search even when none had been
    // typed, which is how Aaron hit "no words match your search" with an empty
    // search box. The empty state now names only the constraints actually in
    // effect. `clearGlossaryFilters` survives as the both-active recovery;
    // the single-constraint branches offer a targeted clear instead.
    // tests/glossary_empty_state_and_print.test.js covers the branching.
    expect(source).toContain('renderGlossaryEmptyState()');
    expect(source).toContain('onClick={clearGlossaryFilters}');
    expect(source).toContain('empty_show_all');
    expect(source).toContain('empty_clear_search');
    expect(source).not.toContain("aria-label={t('common.close')} data-help-key=\"glossary_filter_");
  });

  it('uses learner-readable tier labels and contextual select names', () => {
    expect(source).toContain('Academic vocabulary');
    expect(source).toContain('Subject vocabulary');
    expect(source).toContain("aria-label={t('common.target_language_selector')} data-help-key=\"glossary_puzzle_lang\" value={wordSearchLang}");
    expect(source).toContain("aria-label={t('flashcards.deck_standard')} value={standardDeckLang}");
    expect(source).toContain("aria-label={t('flashcards.deck_language')} value={flashcardLang}");
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
    expect(source).toContain("var glossaryAudioScopeState = React.useState('core')");
    expect(source).toContain("var includeDefinitions = glossaryAudioScope !== 'terms'");
    expect(source).toContain("var preparedLanguages = glossaryAudioScope === 'all'");
    expect(source).toContain("typeof prepare !== 'function'");
    expect(source).toContain("doneOrProgress && typeof doneOrProgress === 'object'");
    expect(source).toContain('<option value="core">{flashcardTermLabel} + {flashcardDefinitionLabel}');
    expect(source).toContain('<option value="terms">{flashcardTermLabel}');
    expect(source).toContain('<option value="all">{flashcardTermLabel} + {flashcardDefinitionLabel}');
    expect(source).toContain("var ready = Number(result && (result.ready ?? result.prepared ?? result.total))");
    expect(source).toContain('Saved with this resource/project.');
    expect(source).toContain('id="glossary-audio-prep-status" role="status" aria-live="polite"');
  });

  it('prefers saved glossary audio with a live fallback and selectable preparation scope', () => {
    expect(source).toContain('function handleGlossarySpeak(item, field, spokenText, contentId, language)');
    expect(source).toContain('window.__alloResolveGlossaryAudio');
    expect(source).toContain("reason: 'glossary-playback'");
    expect(source).toContain("handleGlossarySpeak(item, 'term', item.term");
    expect(source).toContain("handleGlossarySpeak(item, 'definition', item.def");
    expect(source).toContain("handleGlossarySpeak(item, 'translation', item.translations[lang]");
    expect(source).toContain("aria-label={t('common.download_audio')} value={glossaryAudioScope}");
    expect(source).toContain("includeDefinitions: includeDefinitions, languages: preparedLanguages");
    expect(source).toContain('window.__alloEnsureGlossaryEntryIds');
  });

  it('shows plain-language image editing and per-field audio review in edit mode', () => {
    expect(source).toContain('Image editing active');
    expect(source).not.toContain("t('visuals.nano_active_status')");
    expect(uiStrings).toContain('"refiner_title": "Image Editor"');
    expect(uiStrings).toContain('"nano_active_status": "Image editing active"');
    expect(uiStrings).not.toContain('Nano Banana');
    expect(deployedUiStrings).toBe(uiStrings);
    expect(source).toContain('id="glossary-edit-audio-review"');
    expect(source).toContain("role=\"group\" aria-label={audioReviewLabel + ': ' + fieldLabel");
    expect(source).toContain("renderGlossaryEditAudioTools(item, 'term'");
    expect(source).toContain("renderGlossaryEditAudioTools(item, 'definition'");
    expect(source).toContain("renderGlossaryEditAudioTools(item, 'translation'");
    expect(source).toContain('window.__alloRegenerateGlossaryAudio');
    expect(source).toContain("status === 'stale' || status === 'corrupt'");
  });

  it('keeps built and deployed artifacts synchronized', () => {
    expect(deployed).toBe(built);
  });
});
