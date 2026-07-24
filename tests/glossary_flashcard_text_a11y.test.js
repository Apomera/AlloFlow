import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_glossary_source.jsx', 'utf8');

describe('Glossary flashcard definition read-aloud controls', () => {
  it('preserves paragraph semantics and uses nested native speech buttons', () => {
    expect(source.match(/<p[^>]*><button type="button"/g)?.length).toBeGreaterThanOrEqual(5);
    expect(source).not.toContain('tabIndex={0} role="button"');
    expect(source.match(/<\/button><\/p>/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it('relies on native keyboard activation instead of duplicate key handlers', () => {
    expect(source.match(/handleSpeak\(generatedContent\?\.data\[flashcardIndex\]\.def, 'fc-front-def'\);/g)).toHaveLength(1);
    expect(source.match(/handleSpeak\(generatedContent\?\.data\[flashcardIndex\]\.def, 'fc-back-def'\);/g)).toHaveLength(1);
    expect(source.match(/handleSpeak\(def, `fc-back-def-\$\{standardDeckLang\}`\);/g)).toHaveLength(1);
    expect(source.match(/handleSpeak\(generatedContent\.data\[flashcardIndex\]\.etymology, 'fc-back-etym'\);/g)).toHaveLength(1);
    expect(source.match(/handleSpeak\(transDef, 'fc-back-def'\);/g)).toHaveLength(1);
  });

  it('provides contextual names, large targets, and high-contrast focus', () => {
    expect(source).toContain("${t('common.click_read_aloud')}: ${generatedContent?.data[flashcardIndex].term} definition");
    expect(source).toContain("${t('common.read_translated_definition')}: ${standardDeckLang}");
    expect(source).toContain("${t('common.read_translated_definition')}: ${flashcardLang}");
    expect(source.match(/min-h-11 max-w-full inline-flex items-center justify-center/g)?.length)
      .toBeGreaterThanOrEqual(9);
    expect(source).toContain('focus-visible:ring-yellow-300 focus-visible:ring-offset-blue-600');
    expect(source).toContain('focus-visible:ring-yellow-300 focus-visible:ring-offset-indigo-700');
  });

  it('keeps root and deployed generated modules synchronized', () => {
    expect(readFileSync('desktop/web-app/public/view_glossary_module.js', 'utf8'))
      .toBe(readFileSync('view_glossary_module.js', 'utf8'));
  });
});
