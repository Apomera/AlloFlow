import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// Cloze in adapted text was effectively broken in every non-English passage,
// in three independent ways. All three are pinned here because each one fails
// SILENTLY — no error, no console noise, just a feature that quietly does
// nothing or marks everything correct.
//
//   1. answer matching stripped all non-ASCII, so Russian/Arabic/Chinese/Thai
//      terms normalized to '' on BOTH sides and every answer scored correct;
//   2. \b is ASCII-only, so no blanks were created at all in those scripts;
//   3. the bank offered the translated word while the blank still checked the
//      English one, so dragging the correct chip was rejected.

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, createRoot, act, ClozeInteractionPanel;

const PANEL_SRC = fs.readFileSync(resolve(process.cwd(), 'view_cloze_interaction_panel_module.js'), 'utf8');
const MISC_SRC = fs.readFileSync(resolve(process.cwd(), 'misc_components_module.js'), 'utf8');
const TEXT_SRC = fs.readFileSync(resolve(process.cwd(), 'text_utility_helpers_module.js'), 'utf8');

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ({ createRoot } = require(resolve(modulesDir, 'react-dom/client')));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = React;
  window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const Stub = () => React.createElement('span');
  ['Globe', 'RefreshCw', 'X'].forEach((n) => { window[n] = Stub; });
  delete window.AlloModules;
  // eslint-disable-next-line no-eval
  (0, eval)(PANEL_SRC);
  ClozeInteractionPanel = window.AlloModules.ClozeInteractionPanel.ClozeInteractionPanel;
});

function renderPanel(props) {
  const c = document.createElement('div');
  document.body.appendChild(c);
  const root = createRoot(c);
  act(() => root.render(React.createElement(ClozeInteractionPanel, {
    activeView: 'simplified',
    interactionMode: 'cloze',
    handleBankMouseDown: () => {},
    handleSetInteractionModeToRead: () => {},
    playSound: () => {},
    setClozeCompletedSet: () => {},
    wordBankPosition: null,
    wordBankRef: { current: null },
    t: (k) => k,
    ...props,
  })));
  return { c, root };
}

const GLOSSARY = [
  { term: 'cell', translations: { Spanish: 'célula: la unidad básica' } },
  // No colon — the old code ignored this shape and fell back to English.
  { term: 'nucleus', translations: { Spanish: 'núcleo' } },
];

const chips = (c) => [...c.querySelectorAll('span[draggable="true"]')].map((s) => s.textContent);

describe('word bank language', () => {
  it('shows the passage language by default, including translations with no colon', () => {
    const { c, root } = renderPanel({ latestGlossary: GLOSSARY, leveledTextLanguage: 'Spanish' });
    expect(chips(c)).toEqual(['célula', 'núcleo']);
    act(() => root.unmount());
  });

  it('switches to English and to both', () => {
    const { c, root } = renderPanel({ latestGlossary: GLOSSARY, leveledTextLanguage: 'Spanish' });
    const btn = (label) => [...c.querySelectorAll('button')].find((b) => b.textContent === label);

    act(() => { btn('simplified.word_bank_english').click(); });
    expect(chips(c)).toEqual(['cell', 'nucleus']);

    act(() => { btn('simplified.word_bank_both').click(); });
    expect(chips(c)).toEqual(['célula / cell', 'núcleo / nucleus']);
    act(() => root.unmount());
  });

  it('hides the toggle entirely for an English passage', () => {
    const { c, root } = renderPanel({ latestGlossary: GLOSSARY, leveledTextLanguage: 'English' });
    const group = c.querySelector('[role="group"]');
    expect(group).toBeNull();
    expect(chips(c)).toEqual(['cell', 'nucleus']);
    act(() => root.unmount());
  });
});

describe('answer matching (the rubber-stamp bug)', () => {
  // Exercise the shipped normalizer/comparator straight out of the built module.
  const harness = () => {
    // Slice exactly the two pure helpers — stopping before acceptedList, which
    // closes over component props.
    const src = MISC_SRC.slice(MISC_SRC.indexOf('const normalize'), MISC_SRC.indexOf('const acceptedList'));
    // eslint-disable-next-line no-new-func
    return new Function(`${src}; return { normalize, answerMatches };`)();
  };

  it('no longer collapses non-Latin scripts to an empty string', () => {
    const { normalize } = harness();
    ['мозг', '细胞', 'خلية', 'เซลล์'].forEach((w) => {
      expect(normalize(w), `${w} must survive normalization`).not.toBe('');
    });
  });

  it('rejects a wrong answer in a non-Latin script', () => {
    const { answerMatches } = harness();
    // Previously BOTH sides normalized to '' and this scored correct.
    expect(answerMatches('печень', 'мозг')).toBe(false);
    expect(answerMatches('совершенно неправильно', 'мозг')).toBe(false);
    expect(answerMatches('细胞', 'мозг')).toBe(false);
    expect(answerMatches('мозг', 'мозг')).toBe(true);
  });

  it('stays lenient about diacritics and case for typed answers', () => {
    const { answerMatches } = harness();
    expect(answerMatches('eleve', 'élève')).toBe(true);
    expect(answerMatches('CÉLULA', 'célula')).toBe(true);
    expect(answerMatches('celula!', 'célula')).toBe(true);
    expect(answerMatches('nucleo', 'célula')).toBe(false);
  });

  it('never treats an empty answer as correct', () => {
    const { answerMatches } = harness();
    expect(answerMatches('', 'мозг')).toBe(false);
    expect(answerMatches('   ', 'cell')).toBe(false);
  });
});

describe('blank creation across scripts', () => {
  // The term-matching pattern out of the built helper.
  const buildPattern = (terms) => {
    const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const NO_WORD_BREAK = /[぀-ヿ㐀-䶿一-鿿豈-﫿฀-๿]/;
    const boundaried = [];
    const substringy = [];
    terms.forEach((t) => (NO_WORD_BREAK.test(t) ? substringy : boundaried).push(escapeRegExp(t)));
    const branches = [];
    if (boundaried.length) branches.push(`(?<![\\p{L}\\p{N}])(?:${boundaried.join('|')})(?![\\p{L}\\p{N}])`);
    if (substringy.length) branches.push(`(?:${substringy.join('|')})`);
    return new RegExp(`(${branches.join('|')})`, 'giu');
  };

  it('creates blanks in scripts where \\b silently failed', () => {
    const cases = [
      ['cell', 'The cell divides.'],
      ['célula', 'La célula se divide.'],
      ['мозг', 'Это мозг человека.'],
      ['خلية', 'هذه خلية.'],
      ['细胞', '这是细胞。'],
    ];
    for (const [term, text] of cases) {
      expect(text.split(buildPattern([term])).length, `${term} should be found in ${text}`).toBeGreaterThan(1);
    }
  });

  it('still refuses to match inside a longer word', () => {
    // "cell" must not blank the "cell" inside "cellular".
    expect('A cellular network.'.split(buildPattern(['cell'])).length).toBe(1);
  });

  it('escapes regex metacharacters in a glossary term', () => {
    // escapeRegExp used to be a no-op ('$&' is the match itself).
    expect(() => buildPattern(['C++'])).not.toThrow();
    expect('I know C++ well.'.split(buildPattern(['C++'])).length).toBeGreaterThan(1);
  });

  it('the shipped helper carries the fixed escape and Unicode pattern', () => {
    // '$&' alone is the matched text — the escape only works with the leading
    // backslash, which is the whole point of this assertion.
    expect(TEXT_SRC).toMatch(/escapeRegExp = .*replace\(.*, *["']\\\\\$&["']\)/);
    expect(TEXT_SRC).toContain('NO_WORD_BREAK');
    expect(TEXT_SRC).toContain('\\p{L}');
  });
});
