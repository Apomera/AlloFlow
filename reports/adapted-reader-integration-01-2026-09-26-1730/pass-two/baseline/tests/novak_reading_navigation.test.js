import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('view_simplified_source.jsx', 'utf8');
const start = source.indexOf('  function getReadingNavigationSections(text) {');
const end = source.indexOf('  function findReadingGlossOccurrences(text, query)', start);
const { getReadingNavigationSections, findRelatedOriginalPassage } = new Function(source.slice(start, end) + '\nreturn { getReadingNavigationSections, findRelatedOriginalPassage };')();
const related = (original, adapted, options = {}) => findRelatedOriginalPassage(original, adapted, { sameLanguage: true, ...options });
const paragraphs = [
  'The coral reef shelters colorful fish. Parrotfish scrape algae from coral surfaces, keeping the reef healthy.',
  'Mangrove roots trap sediment along the coast. Young crabs hide among the tangled roots while birds hunt nearby.',
  'Seagrass meadows slow waves and store carbon. Green turtles graze on the long blades beneath clear water.'
];

describe('canonical navigation sections', () => {
  it('preserves exact CRLF, indentation, Unicode and UTF-16 offsets without splitting verse lines', () => {
    const text = '  😀 FIRST WITCH\r\nFair is foul.\r\n\r\n\tمرحبا بالعالم\r\n星が光る。\r\n\r\nFinal stanza.\r\n';
    const sections = getReadingNavigationSections(text);
    expect(sections).toHaveLength(3);
    expect(sections[0]).toEqual({ index: 0, start: 0, end: text.indexOf('\r\n\r\n'), text: '  😀 FIRST WITCH\r\nFair is foul.' });
    expect(sections[1].text).toBe('\tمرحبا بالعالم\r\n星が光る。');
    expect(sections[2].text).toBe('Final stanza.\r\n');
    for (const section of sections) expect(text.slice(section.start, section.end)).toBe(section.text);
  });
  it('handles mixed blank lines and Unicode paragraph separators without empty sections', () => {
    const text = '\r\n\r\nAlpha\n \t\n\nBeta\r\rGamma\u2029Delta';
    expect(getReadingNavigationSections(text).map(section => section.text)).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);
    expect(getReadingNavigationSections(' \r\n\t\r\n ')).toEqual([]);
    expect(getReadingNavigationSections(null)).toEqual([]);
  });
  it('keeps single LF, CR and CRLF line breaks inside a paragraph', () => {
    for (const lineBreak of ['\n', '\r', '\r\n']) expect(getReadingNavigationSections('First' + lineBreak + 'Second')).toHaveLength(1);
  });
});

describe('conservative related-passage evidence', () => {
  it('finds a paraphrased section by shared meaning-bearing wording rather than its index', () => {
    const original = paragraphs.join('\r\n\r\n');
    const result = related(original, 'Young crabs hide among mangrove roots that trap sediment along the coast.');
    expect(result.status).toBe('matched');
    expect(result.sectionIndexes).toEqual([1]);
    expect(result.start).toBe(original.indexOf(paragraphs[1]));
    expect(result.text).toBe(paragraphs[1]);
    expect(original.slice(result.start, result.end)).toBe(result.text);
    expect(result.evidence.sharedTerms).toEqual(expect.arrayContaining(['mangrove', 'roots', 'crabs', 'sediment']));
    expect(result.evidence.sharedPhrases.length).toBeGreaterThan(0);
    expect(['high', 'moderate']).toContain(result.confidence);
  });
  it('uses contiguous source sections when an adaptation merges paragraphs', () => {
    const original = paragraphs.join('\n\n');
    const adapted = 'Mangrove roots trap sediment along the coast. Seagrass meadows slow waves and store carbon.';
    const result = related(original, adapted);
    expect(result.status).toBe('matched');
    expect(result.sectionIndexes).toEqual([1, 2]);
    expect(result.text).toBe(paragraphs.slice(1).join('\n\n'));
  });
  it('prefers a precise paragraph over a larger range containing unrelated neighboring text', () => {
    const result = related(paragraphs.join('\n\n'), paragraphs[1]);
    expect(result.status).toBe('matched');
    expect(result.sectionIndexes).toEqual([1]);
  });
  it('rejects repeated plausible passages instead of choosing the first', () => {
    const repeated = paragraphs[1];
    const result = related([repeated, paragraphs[0], repeated].join('\n\n'), repeated);
    expect(result.status).toBe('ambiguous');
    expect(result.reason).toBe('multiple-related-passages');
    expect(result.candidates.map(candidate => candidate.sectionIndexes)).toEqual([[0], [2]]);
    expect(result.start).toBeUndefined();
  });
  it('does not let an arbitrary paragraph index or isolated name establish correspondence', () => {
    expect(related(paragraphs.join('\n\n'), 'This is important to everyone.').status).toBe('unavailable');
    expect(related('Macbeth follows the witches through the darkened landscape.', 'Macbeth is there.')).toMatchObject({ status: 'unavailable', reason: 'insufficient-content-evidence' });
    expect(related(paragraphs.join('\n\n'), 'Astronauts inspect lunar rocks and record crater measurements.').status).toBe('unavailable');
  });
  it('does not equate common function words with content evidence', () => {
    expect(related('They were there and they were with her before it was over.', 'They were there with her before it was over.').status).toBe('unavailable');
  });
  it('requires a verified same-language comparison and never guesses across translations', () => {
    expect(findRelatedOriginalPassage(paragraphs.join('\n\n'), paragraphs[1])).toMatchObject({ status: 'unavailable', reason: 'different-or-unknown-language' });
    expect(related(paragraphs.join('\n\n'), paragraphs[1], { sameLanguage: false })).toMatchObject({ status: 'unavailable', reason: 'different-or-unknown-language' });
  });
  it('normalizes comparison tokens without changing the highlighted source text', () => {
    const text = 'Préface sans rapport.\r\n\r\nLes récifs abritent des poissons colorés et protègent les petits crabes.\r\n';
    const result = related(text, 'LES RÉCIFS ABRITENT DES POISSONS COLORÉS.');
    expect(result.status).toBe('matched');
    expect(result.text).toBe(text.slice(result.start, result.end));
    expect(result.text).toContain('récifs');
    expect(result.text.endsWith('\r\n')).toBe(true);
  });
  it('does not invent a contiguous bridge across a section without matching content', () => {
    const original = 'Amber copper bronze silver.\n\nClouds gather beyond the mountains.\n\nMaple willow birch cedar.';
    const result = related(original, 'Amber copper bronze silver maple willow birch cedar.');
    expect(result.status).toBe('unavailable');
  });
});

describe('navigation work limits', () => {
  it('declines oversized sources and queries rather than truncating the search', () => {
    expect(related('x'.repeat(120001), paragraphs[0])).toMatchObject({ status: 'unavailable', reason: 'passage-too-long' });
    expect(related(paragraphs[0], 'x'.repeat(12001))).toMatchObject({ status: 'unavailable', reason: 'passage-too-long' });
  });
  it('declines excessive section counts and empty input', () => {
    expect(related(Array.from({ length: 301 }, (_, index) => 'Paragraph ' + index).join('\n\n'), paragraphs[0])).toMatchObject({ status: 'unavailable', reason: 'too-many-sections' });
    expect(related('', paragraphs[0])).toMatchObject({ status: 'unavailable', reason: 'empty-passage' });
  });
  it('searches the end of a bounded source rather than silently using an initial excerpt', () => {
    const padding = Array.from({ length: 60 }, (_, index) => 'Section ' + index + ': unrelated administrative headings and routine notes.');
    const original = [...padding, paragraphs[1]].join('\n\n');
    const result = related(original, 'Young crabs hide among mangrove roots that trap sediment along the coast.');
    expect(result.status).toBe('matched');
    expect(result.sectionIndexes).toEqual([60]);
  });
});

it('reports repeated refrains as ambiguous even when every source section repeats them', () => {
  const repeated = 'Silver lanterns illuminate the narrow stone bridge beside quiet waters.';
  const result = related(Array(4).fill(repeated).join('\n\n'), repeated);
  expect(result.status).toBe('ambiguous');
  expect(result.start).toBeUndefined();
});
