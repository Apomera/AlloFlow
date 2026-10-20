// Lane A1 (2026-10-20): the host's filteredGlossaryData memo, sliced out of
// AlloFlowANTI.txt and run with a React-like useMemo. Search folds case and
// accents and also reads translations; sort is a view setting that never
// reorders generatedContent.data.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sliceBetween } from './helpers/anchored_slice.js';

const DIR = process.env.LANE_DIR || '.';
const ANTI = readFileSync(DIR + '/AlloFlowANTI.txt', 'utf8');
const MEMO = sliceBetween(ANTI, '  const filteredGlossaryData = useMemo(', '  const getReadableContent = useCallback(', { label: 'filteredGlossaryData memo', file: 'AlloFlowANTI.txt' });
const build = new Function('useMemo', 'glossarySearchKeepRef', 'generatedContent', 'glossarySearchTerm', 'glossaryFilter', 'glossarySort', 'isEditingGlossary', MEMO + '\nreturn filteredGlossaryData;');

// One "component instance": a ref that survives renders and a useMemo that
// only recomputes when a dependency changes, as React's does.
function host() {
  const ref = { current: null };
  let last = null;
  const useMemo = (fn, deps) => {
    if (last && deps.length === last.deps.length && deps.every((d, i) => Object.is(d, last.deps[i]))) return last.value;
    last = { deps, value: fn() };
    return last.value;
  };
  return ({ data, term = '', filter = 'all', sort = 'lesson', editing = false, content }) =>
    build(useMemo, ref, content || { type: 'glossary', data }, term, filter, sort, editing);
}
const run = (options) => host()(options);
const terms = (rows) => rows.map((row) => row.term);

const WORDS = [
  { entryId: 'p', term: 'Photosynthesis', def: 'How plants make food.', tier: 'Domain-Specific', translations: { Spanish: 'fotosíntesis: cómo las plantas hacen comida', Arabic: 'التَّمْثِيل الضَّوْئِيّ', Chinese: '光合作用', Russian: 'Фотосинтез' } },
  { entryId: 'a', term: 'analyze', def: 'Look closely at the parts.', tier: 'Academic', translations: { Spanish: 'analizar', Hindi: 'कातिब', Japanese: 'がっこう' } },
  { entryId: 'l', term: 'Leaf', def: 'A plant part.', tier: 'Domain-Specific', translations: { Spanish: 'hoja', French: { nested: 'object value' } } },
  { entryId: 'c', term: 'Compare', def: 'Find what is alike.', tier: 'Academic', translations: {} },
  { entryId: 'x', term: 'Ecosystem', def: 'Living things and their place.' },
];

describe('glossary search (host)', () => {
  it('ignores case and accents, in the term and in translations', () => {
    expect(terms(run({ data: WORDS, term: 'fotosintesis' }))).toEqual(['Photosynthesis']);
    expect(terms(run({ data: WORDS, term: 'FOTOSÍNTESIS' }))).toEqual(['Photosynthesis']);
    expect(terms(run({ data: [{ term: 'fotosíntesis', def: '' }], term: 'Fotosintesis' }))).toEqual(['fotosíntesis']);
    expect(terms(run({ data: WORDS, term: 'ANALIZAR' }))).toEqual(['analyze']);
  });

  it('matches Arabic (with or without vowel marks), Chinese and Cyrillic translations', () => {
    expect(terms(run({ data: WORDS, term: 'التمثيل' }))).toEqual(['Photosynthesis']);
    expect(terms(run({ data: WORDS, term: '光合' }))).toEqual(['Photosynthesis']);
    expect(terms(run({ data: WORDS, term: 'фотосинтез' }))).toEqual(['Photosynthesis']);
    expect(terms(run({ data: WORDS, term: 'ФОТО' }))).toEqual(['Photosynthesis']);
  });

  it('keeps vowel signs that change the word in Hindi and Japanese', () => {
    expect(run({ data: WORDS, term: 'किताब' })).toEqual([]);
    expect(run({ data: WORDS, term: 'かっこう' })).toEqual([]);
    expect(terms(run({ data: WORDS, term: 'कातिब' }))).toEqual(['analyze']);
  });

  it('still matches definitions, ignores non-text values and surrounding spaces', () => {
    expect(terms(run({ data: WORDS, term: 'plant part' }))).toEqual(['Leaf']);
    expect(run({ data: WORDS, term: 'object' })).toEqual([]);
    expect(terms(run({ data: WORDS, term: '  leaf ' }))).toEqual(['Leaf']);
    expect(run({ data: WORDS, term: '   ' })).toHaveLength(WORDS.length);
  });

  it('keeps a row that matched when editing began, even after the edit stops it matching', () => {
    const render = host();
    expect(terms(render({ data: WORDS, term: 'leaf', editing: true }))).toEqual(['Leaf']);
    const edited = WORDS.map((w) => (w.entryId === 'l' ? { ...w, term: 'Lea', translations: {}, def: '' } : w));
    expect(terms(render({ data: edited, term: 'leaf', editing: true }))).toEqual(['Lea']);
    expect(render({ data: edited, term: 'leaf', editing: false })).toEqual([]);
  });

  it('applies the vocabulary filter after the search', () => {
    expect(terms(run({ data: WORDS, term: 'a', filter: 'academic' }))).toEqual(['analyze', 'Compare']);
    expect(terms(run({ data: WORDS, filter: 'domain' }))).toEqual(['Photosynthesis', 'Leaf']);
  });
});

describe('glossary sort (host)', () => {
  const SORTABLE = [
    { entryId: '1', term: 'Item 10', tier: 'Domain-Specific' },
    { entryId: '2', term: 'banana', tier: 'Academic' },
    { entryId: '3', term: 'Résumé' },
    { entryId: '4', term: '', tier: 'Academic' },
    { entryId: '5', term: 'Apple', tier: 'Domain-Specific' },
    { entryId: '6', term: 'resume', tier: 'Academic' },
    { entryId: '7', term: 'Item 2' },
  ];

  it('keeps lesson order by default and for unknown values', () => {
    expect(terms(run({ data: SORTABLE }))).toEqual(terms(SORTABLE));
    expect(terms(run({ data: SORTABLE, sort: 'bogus' }))).toEqual(terms(SORTABLE));
  });

  it('sorts A to Z with numbers in order, accents ignored, ties in lesson order and blanks last', () => {
    expect(terms(run({ data: SORTABLE, sort: 'az' }))).toEqual(['Apple', 'banana', 'Item 2', 'Item 10', 'Résumé', 'resume', '']);
  });

  it('sorts Z to A with ties still in lesson order and blanks last', () => {
    expect(terms(run({ data: SORTABLE, sort: 'za' }))).toEqual(['Résumé', 'resume', 'Item 10', 'Item 2', 'banana', 'Apple', '']);
  });

  it('sorts by tier: academic, then subject, then the rest, lesson order inside each', () => {
    expect(terms(run({ data: SORTABLE, sort: 'tier' }))).toEqual(['banana', '', 'resume', 'Item 10', 'Apple', 'Résumé', 'Item 2']);
  });

  it('keeps each row’s _originalIdx and never reorders generatedContent.data', () => {
    const data = SORTABLE.map((w) => ({ ...w }));
    const before = JSON.stringify(data);
    for (const sort of ['az', 'za', 'tier']) {
      const rows = run({ data, sort });
      for (const row of rows) expect(data[row._originalIdx].entryId).toBe(row.entryId);
    }
    expect(JSON.stringify(data)).toBe(before);
  });

  it('sorts after filtering', () => {
    expect(terms(run({ data: SORTABLE, sort: 'za', filter: 'academic' }))).toEqual(['resume', 'banana', '']);
  });

  it('recomputes when only the sort changes', () => {
    const render = host();
    const content = { type: 'glossary', data: SORTABLE };
    expect(terms(render({ content, sort: 'lesson' }))[0]).toBe('Item 10');
    expect(terms(render({ content, sort: 'az' }))[0]).toBe('Apple');
  });

  it('holds row positions while a sorted list is being edited, and re-sorts after', () => {
    const render = host();
    const data = [{ entryId: 'a', term: 'Apple' }, { entryId: 'b', term: 'Banana' }, { entryId: 'c', term: 'Cherry' }];
    expect(terms(render({ data, sort: 'az', editing: true }))).toEqual(['Apple', 'Banana', 'Cherry']);
    const renamed = [{ ...data[0], term: 'Zucchini' }, data[1], data[2], { entryId: 'd', term: 'Avocado' }];
    expect(terms(render({ data: renamed, sort: 'az', editing: true }))).toEqual(['Zucchini', 'Banana', 'Cherry', 'Avocado']);
    expect(terms(render({ data: renamed, sort: 'za', editing: true }))).toEqual(['Zucchini', 'Cherry', 'Banana', 'Avocado']);
    expect(terms(render({ data: renamed, sort: 'az', editing: false }))).toEqual(['Avocado', 'Banana', 'Cherry', 'Zucchini']);
  });
});

describe('host wiring', () => {
  it('owns glossarySort state and hands it to the glossary view', () => {
    expect(ANTI.includes("const [glossarySort, setGlossarySort] = useState('lesson');"), 'glossarySort state').toBe(true);
    const props = sliceBetween(ANTI, 'React.createElement(window.AlloModules.GlossaryView, {', 'WordScrambleGame: window.AlloModules', { label: 'GlossaryView props' });
    expect(props.includes('glossarySearchTerm, glossaryFilter, glossaryImageSize, glossaryRefinementInputs,\n                    glossarySort, setGlossarySort,\n'), 'props line').toBe(true);
  });
  it('returns nothing for a non-glossary resource', () => {
    expect(run({ data: WORDS, content: { type: 'quiz', data: WORDS } })).toEqual([]);
  });
});
