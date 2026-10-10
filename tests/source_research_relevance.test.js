import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('content_engine_source.jsx', 'utf8');
const start = source.indexOf('var SourceResearchReview =');
const end = source.indexOf('var createContentEngine =', start);
const R = new Function(source.slice(start, end) + '\nreturn SourceResearchReview;')();
const row = (passage, extra = {}) => ({ kind: 'web', url: 'https://science.example.edu/clouds', title: 'Clouds', evidenceType: 'Page excerpt', passage, ...extra });
const packet = (topic, rows) => { const p = R.packet(topic); R.merge(p, rows); return p; };
const offsetsAreExact = (body, passages) => passages.forEach(item => {
  const [, start, end] = item.locatorLabel.match(/^Characters (\d+)-(\d+)$/);
  expect(body.slice(Number(start) - 1, Number(end))).toBe(item.passage);
  expect(item.passage.length).toBeLessThanOrEqual(R.maxPassage);
});

describe('reviewed research lexical relevance', () => {
  it('matches whole words without confusing art with artificial or AI with rain', () => {
    const unrelated = 'Artificial flowers are described in a rainy weather report.';
    const art = 'Art includes painting and sculpture as forms of visual expression.';
    const ai = 'AI systems can classify images and make statistical predictions.';
    const body = [unrelated, art, ai].join('\n\n');
    expect(R.selectPassages(body, 'art').map(item => item.passage)).toEqual([art]);
    expect(R.selectPassages(body, 'AI').map(item => item.passage)).toEqual([ai]);
  });

  it('retains meaningful single-letter research topics', () => {
    const unrelated = 'Earth has rivers and forests with many different climates.';
    const relevant = 'R is a programming language commonly used for statistical analysis.';
    expect(R.selectPassages(unrelated + '\n\n' + relevant, 'R', 1)[0].passage).toBe(relevant);
  });

  it('does not let ordinary question words outweigh topical terms', () => {
    const body = 'How and why is this the place where you can find what to do?\n\nClouds form when humid air cools and water vapor condenses.';
    const found = R.selectPassages(body, 'Please tell me how and why clouds form', 1);
    expect(found[0].passage).toContain('water vapor');
    const group = R.groupSources(packet('Please tell me how and why clouds form', [row(found[0].passage)]))[0];
    expect(group.relevance.matchedTerms).toEqual(['clouds', 'form']);
    expect(group.relevance.totalTerms).toBe(2);
  });

  it('uses conservative plural and accent matching without altering evidence', () => {
    const body = 'Cloud formation is visible from the aircraft above.\n\nUn ni\u00f1o aprende mediante preguntas y observaciones cuidadosas.';
    const clouds = R.selectPassages(body, 'clouds', 1);
    const child = R.selectPassages(body, 'nino', 1);
    expect(clouds[0].passage).toContain('Cloud formation');
    expect(child[0].passage).toContain('ni\u00f1o');
    offsetsAreExact(body, [...clouds, ...child]);
  });

  it('retains CJK and combining-mark text with exact source offsets', () => {
    const facts = '\u96f2\u306e\u5f62\u6210\u306b\u306f\u6c34\u84b8\u6c17\u306e\u51b7\u5374\u3068\u51dd\u7e2e\u304c\u95a2\u308f\u308a\u307e\u3059\u3002\u5c0f\u3055\u306a\u6c34\u6ef4\u304c\u7a7a\u6c17\u4e2d\u306b\u6d6e\u304b\u3073\u307e\u3059\u3002';
    const body = 'Welcome to the navigation and contact page.\r\n\r\n  ' + facts + '\r\n\r\nCafe\u0301 study notes describe where coffee plants grow.';
    const selected = R.selectPassages(body, '\u96f2\u306e\u5f62\u6210', 3);
    expect(selected.map(item => item.passage)).toEqual([facts]);
    offsetsAreExact(body, [...selected, ...R.selectPassages(body, 'caf\u00e9', 1)]);
  });

  it('deduplicates superficial passage differences but preserves different factual words', () => {
    const first = 'Cloud formation begins when moist air cools. The humidity reaches 90 percent.';
    const duplicate = 'CLOUD formation begins when moist air cools! The humidity reaches 90 percent.';
    const changed = 'Cloud formation begins when moist air cools. The humidity reaches 95 percent.';
    const negated = 'Cloud formation does not begin when moist air warms. The humidity reaches 90 percent.';
    const body = [first, duplicate, changed, negated].join('\n\n');
    const selected = R.selectPassages(body, 'cloud formation', 4);
    expect(selected.map(item => item.passage)).toEqual([first, changed, negated]);
    offsetsAreExact(body, selected);
  });

  it('does not deduplicate decimal, range, negative or currency changes as punctuation', () => {
    const body = [
      'Cloud measurements are listed as 3.14 in the research notes.',
      'Cloud measurements are listed as 3-14 in the research notes.',
      'Cloud measurements are listed as -3.14 in the research notes.',
      'Cloud measurements are listed as $3.14 in the research notes.',
    ].join('\n\n');
    expect(R.selectPassages(body, 'cloud measurements', 4)).toHaveLength(4);
  });

  it('does not hide reversed factual relationships or meaningful accents among shared boilerplate', () => {
    const common = 'The study describes water in the air and a series of observations collected at regular intervals. '.repeat(5);
    const first = common + 'Cooling causes condensation.';
    const reversed = common + 'Condensation causes cooling.';
    const accented = common + 'El resultado se public\u00f3 en el informe.';
    const unaccented = common + 'El resultado se publico en el informe.';
    const body = [first, reversed, accented, unaccented].join('\n\n');
    expect(R.selectPassages(body, 'study', 4).map(item => item.passage)).toEqual([first, reversed, accented, unaccented]);
  });

  it('bounds long no-overlap fallback passages without splitting supplementary characters', () => {
    const body = 'x'.repeat(1199) + '\uD83C\uDF27' + 'y'.repeat(1200) + '\uD83C\uDF27' + 'z'.repeat(1800);
    const selected = R.selectPassages(body, 'unmatched topic', 4);
    expect(selected.length).toBeGreaterThan(0);
    expect(selected.length).toBeLessThanOrEqual(4);
    offsetsAreExact(body, selected);
    selected.forEach(item => {
      expect(/[\uD800-\uDBFF]$/.test(item.passage)).toBe(false);
      expect(/^[\uDC00-\uDFFF]/.test(item.passage)).toBe(false);
    });
    const boundedRow = R.row(row('x'.repeat(1199) + '\uD83C\uDF27'));
    expect(boundedRow.passage).toHaveLength(1199);
  });
});

describe('extractive source previews', () => {
  it('starts the synopsis with a relevant exact sentence instead of opening boilerplate', () => {
    const facts = 'Cloud formation begins as humid air cools. Water vapor condenses into droplets.';
    const p = packet('cloud formation', [row('Welcome to our learning resources and contact information. ' + facts)]);
    const group = R.groupSources(p)[0];
    expect(group.summary).toBe(facts);
    expect(group.summaryEvidenceIds).toEqual([p.items[0].id]);
    expect(group.claims[0].text).toBe('Cloud formation begins as humid air cools.');
    expect(group.claims.every(claim => p.items.some(item => claim.evidenceIds.includes(item.id) && item.passage.includes(claim.text)))).toBe(true);
  });

  it('prefers direct evidence to an equally relevant AI note and exposes only actual evidence IDs', () => {
    const p = packet('cloud formation', [
      row('Cloud formation seems to relate to cooling in this AI summary.', { evidenceType: 'Source-linked AI note' }),
      row('Cloud formation occurs as air cools and water vapor condenses.', { evidenceType: 'Page excerpt' }),
    ]);
    const group = R.groupSources(p)[0];
    expect(group.summaryEvidenceIds).toEqual([p.items[1].id]);
    expect(group.claims[0].evidenceIds).toEqual([p.items[1].id]);
    expect(group.evidenceTypes).toContain('Source-linked AI note');
  });

  it('does not put an individually excluded passage back into an included source preview', () => {
    const p = packet('cloud formation', [
      row('Cloud formation grows from private notes that were explicitly excluded.', { included: false }),
      row('Cloud formation is explained in the selected public source passage.'),
    ]);
    const before = JSON.stringify(p);
    const group = R.groupSources(p)[0];
    expect(group.summary).not.toContain('private notes');
    expect(group.claims.every(claim => !claim.evidenceIds.includes(p.items[0].id))).toBe(true);
    expect(JSON.stringify(p)).toBe(before);
  });

  it('deduplicates repeated highlights while leaving the collection and decisions intact', () => {
    const facts = 'Cloud formation begins when warm moist air rises and cools.';
    const p = packet('cloud formation', [row(facts, { evidenceType: 'Search snippet' }), row(facts + ' Water forms tiny droplets.'), row(facts.toUpperCase())]);
    const before = JSON.stringify(p);
    const group = R.groupSources(p)[0];
    expect(group.claims).toHaveLength(1);
    expect(group.claims[0].evidenceIds).toEqual([p.items[1].id]);
    expect(JSON.stringify(p)).toBe(before);
  });

  it('keeps decimal measurements in a single exact highlight', () => {
    const facts = 'Cloud droplets measured 3.14 micrometers in this example.';
    const p = packet('cloud droplets', [row(facts + ' Other observations were collected later.')]);
    expect(R.groupSources(p)[0].claims[0].text).toBe(facts);
  });

  it('ranks sources by topical matches and evidence ties, without mutating packet order', () => {
    const p = packet('cloud formation', [
      row('Cloud formation is described in the model-generated note.', { url: 'https://example.edu/ai', evidenceType: 'Source-linked AI note' }),
      row('Cloud formation follows water vapor cooling and condensation.', { url: 'https://example.edu/page' }),
      row('Clouds cover the sky, but this passage focuses on unrelated painting.', { url: 'https://example.edu/other' }),
    ]);
    const ids = p.items.map(item => item.id);
    const groups = R.groupSources(p);
    expect(groups.map(group => group.url)).toEqual(['https://example.edu/page', 'https://example.edu/ai', 'https://example.edu/other']);
    expect(p.items.map(item => item.id)).toEqual(ids);
    expect(R.groupSources({ ...p, items: [...p.items].reverse() }).map(group => group.sourceKey)).toEqual(groups.map(group => group.sourceKey));
  });

  it('provides a truthful exact fallback when there is no lexical topic overlap', () => {
    const passage = 'Sunlight provides energy that plants use to produce sugars.';
    const group = R.groupSources(packet('photosynthesis', [row(passage)]))[0];
    expect(group.summary).toBe(passage);
    expect(group.relevance.matchedTerms).toEqual([]);
    expect(group.relevance.score).toBe(0);
    expect(group.claims[0].text).toBe(passage);
  });
});
