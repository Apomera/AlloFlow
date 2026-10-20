import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { sliceBetween } from './helpers/anchored_slice.js';

const paths = ['view_glossary_source.jsx', 'view_glossary_module.js', 'desktop/web-app/public/view_glossary_module.js'];
const files = paths.map(file => [file, fs.readFileSync(file, 'utf8')]);

describe('Word Search single-focus interaction', () => {
  it('uses one active-descendant grid instead of one button per cell', () => {
    const source = files[0][1];
    // The old raw slice's end anchor (isTeacherMode && …) no longer existed, so it ran to the end of the file.
    const component = sliceBetween(source, "{gameMode === 'wordsearch' && gameData && <div", '{canEditGlossary && <div data-help-key="glossary_add_term"', { file: 'view_glossary_source.jsx' });
    expect(component).toContain('id="word-search-grid" role="grid" tabIndex={0}');
    expect(component).toContain('aria-activedescendant={');
    expect(component).toContain('role="gridcell"');
    expect(component).not.toContain('return <button key={c}');
  });

  it.each(files)('%s keeps exact path validation, arrow navigation, and recoverable feedback', (_file, source) => {
    expect(source).toContain('wordSearchPathsMatch');
    expect(source).toContain('wordSearchPathBetween');
    expect(source).toContain("event.key === 'ArrowRight'");
    expect(source).toContain("event.key === 'Enter' || event.key === ' '");
    expect(source).toContain('That path is not one of the listed words.');
    expect(source).toContain('Word search complete.');
  });

  it('exposes progress and touch-sized surrounding controls', () => {
    const source = files[0][1];
    expect(source.includes("glossaryText('glossary.word_search_found_count', 'Found {found} of {total}', { found: wordSearchFoundWords.size, total: gameData.words.length })"), 'found-count progress').toBe(true);
    expect(source).toContain('Select the first and last letter of a word.');
    expect(source).toContain('min-h-11 min-w-11');
  });
});
