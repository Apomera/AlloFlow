import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const read =(file) => readFileSync(resolve(process.cwd(), file), 'utf8');
const contentEngine = read('content_engine_source.jsx');
const simplifiedView = read('view_simplified_source.jsx');
const uiStrings = read('ui_strings.js');

describe('leveled-text definition source presentation', () => {
  it('prevents unsupported source attribution in both AI definition prompts', () => {
    const guard = 'Do not include URLs, citations, source names, or source attributions.';
    // 14a2d9cfa (2026-09-26) merged the separate word and phrase lookup prompts into one
    // builder, so the two AI definition prompts are that builder and the phrase explanation.
    expect(contentEngine.split(guard)).toHaveLength(3);
    expect(contentEngine).not.toContain('Reference sources only by name.');
    expect(contentEngine).toContain('Do not say "according to" a dictionary');
    const lookup = sliceBetween(contentEngine, "const prompt = kind === 'definition' ? [", null, { file: 'content_engine_source.jsx', label: 'lookup prompt builder' });
    expect(lookup.slice(0, 1200)).toContain(guard + ' Do not imply you consulted a dictionary.');
  });

  it('labels the reading-level explanation as AI-generated', () => {
    expect(simplifiedView).toContain('function renderReadingLevelExplanation');
    expect(simplifiedView).toContain("t('glossary.popups.reading_level_explanation')");
    expect(simplifiedView).toContain("t('glossary.popups.ai_generated')");
    expect(uiStrings).toContain('"reading_level_explanation": "Reading-level explanation"');
    expect(uiStrings).toContain('"ai_generated": "AI-generated"');
  });

  it('shows the reading-level explanation before the sourced dictionary panel', () => {
    const popupStart = simplifiedView.indexOf('{definitionData && <div ref={definitionDialogRef}');
    expect(popupStart).toBeGreaterThan(-1);

    const popup = simplifiedView.slice(popupStart);
    const explanation = popup.indexOf(
      'renderReadingLevelExplanation(definitionData, t, renderFormattedText)'
    );
    // The panel also takes the help-audio renderer and lookup data now (b4d7ed714, 2026-09-13).
    const dictionary = popup.indexOf(
      'renderDictionaryPanel(definitionData.dictionary, t, renderHelpAudioButton, definitionData)'
    );

    expect(explanation).toBeGreaterThan(-1);
    expect(dictionary).toBeGreaterThan(-1);
    expect(explanation).toBeLessThan(dictionary);
  });

  it('keeps the linked dictionary-source presentation', () => {
    // The panel is JSX since b4d7ed714 (2026-09-13); the source link and its label are unchanged in substance.
    const panel = sliceBetween(simplifiedView, 'function renderDictionaryPanel(dict, t, renderRecording, lookupData) {',
      'function renderReadingLevelExplanation(', { file: 'view_simplified_source.jsx', label: 'dictionary panel' });
    expect(panel).toContain("var sourceUrl = dict.sourceUrl || (dict.word ? 'https://en.wiktionary.org/wiki/' + encodeURIComponent(dict.word) : '');");
    expect(panel).toContain('<a href={sourceUrl} target="_blank" rel="noopener noreferrer"');
    expect(panel).toContain("lookupDictionaryText(t, 'common.resource', 'Source') + ': ' + (dict.source || 'Dictionary')");
  });
});