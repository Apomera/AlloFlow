import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_glossary_source.jsx', 'utf8');

describe('Glossary flashcard read-aloud headings', () => {
  it('preserves heading semantics and uses nested native speech buttons', () => {
    expect(source.match(/<h[23][^>]*><button type="button"/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source).not.toContain('tabIndex={0} role="button" aria-label={`Read term:');
    expect(source).not.toContain('tabIndex={0} role="button" aria-label={`Read ${flashcardLang} term`}');
    expect(source).toContain('</button></h2>');
    expect(source).toContain('</button></h3>');
  });

  it('relies on native keyboard activation instead of duplicate key handlers', () => {
    expect(source.match(/handleSpeak\(generatedContent\?\.data\[flashcardIndex\]\.term, 'fc-front'\);/g)).toHaveLength(1);
    expect(source.match(/handleSpeak\(term, `fc-front-\$\{standardDeckLang\}`\);/g)).toHaveLength(1);
    expect(source.match(/handleSpeak\(generatedContent\?\.data\[flashcardIndex\]\.term, 'fc-front-term'\);/g)).toHaveLength(1);
    expect(source.match(/handleSpeak\(transTerm, 'fc-back-term'\);/g)).toHaveLength(1);
  });

  it('provides large visible-focus targets and suppresses empty translated actions', () => {
    expect(source.match(/min-h-11 max-w-full inline-flex items-center justify-center/g)?.length)
      .toBeGreaterThanOrEqual(4);
    expect(source.match(/focus-visible:ring-indigo-700/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('focus-visible:ring-yellow-300 focus-visible:ring-offset-indigo-700');
    expect(source).toContain('disabled={!((generatedContent?.data[flashcardIndex].translations?.[standardDeckLang] || "").includes(":")');
  });

  it('keeps root and deployed generated modules synchronized', () => {
    expect(readFileSync('desktop/web-app/public/view_glossary_module.js', 'utf8'))
      .toBe(readFileSync('view_glossary_module.js', 'utf8'));
  });
});
