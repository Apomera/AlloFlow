import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');
const contentEngine = read('content_engine_source.jsx');
const simplifiedView = read('view_simplified_source.jsx');
const uiStrings = read('ui_strings.js');

describe('leveled-text definition source presentation', () => {
  it('prevents unsupported source attribution in both AI definition prompts', () => {
    const guard = 'Do not include URLs, citations, source names, or source attributions.';
    expect(contentEngine.split(guard)).toHaveLength(4);
    expect(contentEngine).not.toContain('Reference sources only by name.');
    expect(contentEngine).toContain('Do not say "according to" a dictionary');
  });

  it('labels the reading-level explanation as AI-generated', () => {
    expect(simplifiedView).toContain('function renderReadingLevelExplanation');
    expect(simplifiedView).toContain("t('glossary.popups.reading_level_explanation')");
    expect(simplifiedView).toContain("t('glossary.popups.ai_generated')");
    expect(uiStrings).toContain('"reading_level_explanation": "Reading-level explanation"');
    expect(uiStrings).toContain('"ai_generated": "AI-generated"');
  });

  it('shows the reading-level explanation before the sourced dictionary panel', () => {
    const popupStart = simplifiedView.indexOf('{definitionData && <div className={`fixed');
    expect(popupStart).toBeGreaterThan(-1);

    const popup = simplifiedView.slice(popupStart);
    const explanation = popup.indexOf(
      'renderReadingLevelExplanation(definitionData, t, renderFormattedText)'
    );
    const dictionary = popup.indexOf(
      'renderDictionaryPanel(definitionData.dictionary, t)'
    );

    expect(explanation).toBeGreaterThan(-1);
    expect(dictionary).toBeGreaterThan(-1);
    expect(explanation).toBeLessThan(dictionary);
  });

  it('keeps the linked dictionary-source presentation', () => {
  });
});
    expect(simplifiedView).toContain("href: sourceUrl");
    expect(simplifiedView).toContain("'Source: ' + (dict.source || 'Wiktionary')");
