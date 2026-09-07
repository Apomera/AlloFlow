import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { act, mountGame } from './helpers/games_live_harness.js';

const cleanups = [];
const mount = (name, props = {}) => { const game = mountGame(name, { onClose: vi.fn(), ...props }); cleanups.push(game.unmount); return game; };
const click = el => { expect(el).toBeTruthy(); act(() => el.click()); };
const control = (container, key) => container.querySelector('[data-help-key="' + key + '"]');
const input = (el, value) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
const advance = ms => act(() => vi.advanceTimersByTime(ms));
afterEach(() => { cleanups.splice(0).reverse().forEach(fn => fn()); vi.useRealTimers(); vi.restoreAllMocks(); delete window.__alloResolveGlossaryAudio; });

describe('Glossary game round regressions', () => {
  it('Word Scramble awards a correct answer once and disables skip/hint during the transition', () => {
    vi.useFakeTimers();
    const onGameComplete = vi.fn(), onScoreUpdate = vi.fn();
    const { container } = mount('WordScrambleGame', { data: [{ term: 'planet', def: 'A world' }], onGameComplete, onScoreUpdate });
    input(container.querySelector('input'), 'planet');
    const submit = container.querySelector('button[aria-label="common.check"]');
    click(submit); click(submit);
    expect(submit.disabled).toBe(true);
    expect(container.querySelector('button[aria-label="common.skip"]').disabled).toBe(true);
    expect(container.querySelector('button[aria-label="games.scramble.get_hint_aria"]').disabled).toBe(true);
    advance(1100);
    expect(onScoreUpdate).toHaveBeenCalledExactlyOnceWith(10, 'Word Scramble Complete');
    expect(onGameComplete).toHaveBeenCalledExactlyOnceWith('wordScramble', expect.objectContaining({ score: 10, correctCount: 1, totalItems: 1 }));
  });
  it('a previous incorrect timer cannot unlock a later correct answer', () => {
    vi.useFakeTimers();
    const { container } = mount('WordScrambleGame', { data: [{ term: 'planet', def: 'A world' }] });
    input(container.querySelector('input'), 'wrong');
    click(container.querySelector('button[aria-label="common.check"]'));
    advance(200);
    input(container.querySelector('input'), 'planet');
    click(container.querySelector('button[aria-label="common.check"]'));
    advance(650);
    expect(container.querySelector('input').disabled).toBe(true);
  });
  it('replacing Word Scramble data cancels the previous round completion', () => {
    vi.useFakeTimers();
    const onGameComplete = vi.fn();
    const game = mount('WordScrambleGame', { data: [{ term: 'planet', def: 'A world' }], onGameComplete });
    input(game.container.querySelector('input'), 'planet');
    click(game.container.querySelector('button[aria-label="common.check"]'));
    game.rerender({ data: [{ term: 'orbit', def: 'A path' }], onGameComplete, onClose: vi.fn() });
    advance(1200);
    expect(onGameComplete).not.toHaveBeenCalled();
    expect(game.container.querySelector('input').disabled).toBe(false);
    expect(game.container.textContent).toContain('A path');
  });
  it('restarting Memory while a pair resolves cannot match cards in the new deck', () => {
    vi.useFakeTimers();
    const onGameComplete = vi.fn();
    const { container } = mount('MemoryGame', { data: [{ term: 'planet', def: 'A world' }], onGameComplete });
    const cards = container.querySelectorAll('[role="group"] [role="button"]');
    click(cards[0]); click(cards[1]);
    click(control(container, 'memory_reset_btn') || container.querySelector('button[aria-label="common.reset"]'));
    advance(1600);
    expect(onGameComplete).not.toHaveBeenCalled();
    expect(container.querySelectorAll('[role="group"] [role="button"]')).toHaveLength(2);
  });
  it.each(['MemoryGame', 'MatchingGame', 'StudentBingoGame'])('%s handles absent and malformed glossary rows', name => {
    const game = mount(name, { data: [null, {}, { term: ' ' }] });
    expect(game.container.querySelector('[role="status"]')).toBeTruthy();
    game.rerender({ data: undefined, onClose: vi.fn() });
    expect(game.container.textContent).toContain('Add glossary terms');
  });
  it('Matching treats repeated term labels as distinct pairs', () => {
    const onGameComplete = vi.fn();
    const { container } = mount('MatchingGame', { data: [{ term: 'bank', def: 'River edge' }, { term: 'bank', def: 'A financial institution' }], onGameComplete });
    const terms = container.querySelectorAll('[data-help-key="matching_term_item"]');
    const defs = [...container.querySelectorAll('[data-help-key="matching_def_item"]')];
    click(terms[0]); click(defs.find(el => el.textContent === 'River edge'));
    click(terms[1]); click(defs.find(el => el.textContent === 'A financial institution'));
    click(control(container, 'matching_check_btn'));
    expect(onGameComplete).toHaveBeenCalledExactlyOnceWith('matching', expect.objectContaining({ score: 50, correctMatches: 2, isPerfect: true }));
  });
  it('Crossword clears a previous board when new data has no usable terms', () => {
    const game = mount('CrosswordGame', { data: [{ term: 'planet', def: 'A world' }] });
    expect(game.container.querySelectorAll('[id^="crossword-cell-"]').length).toBeGreaterThan(0);
    game.rerender({ data: [], onClose: vi.fn() });
    expect(game.container.querySelectorAll('[id^="crossword-cell-"]')).toHaveLength(0);
  });
  it('an empty Crossword cannot earn a completion bonus', () => {
    const onScoreUpdate = vi.fn(), onGameComplete = vi.fn();
    const { container } = mount('CrosswordGame', { data: [], onScoreUpdate, onGameComplete });
    [...container.querySelectorAll('button')].filter(el => /check/i.test(el.getAttribute('aria-label') || '')).forEach(click);
    expect(onScoreUpdate).not.toHaveBeenCalled(); expect(onGameComplete).not.toHaveBeenCalled();
  });
  it('Bingo removes the win banner when unmarking a line without awarding it twice', () => {
    const onGameComplete = vi.fn();
    const { container } = mount('StudentBingoGame', { data: [{ term: 'planet', def: 'A world' }], onGameComplete });
    const squares = container.querySelectorAll('[role="group"] button');
    for (let i=0;i<5;i++) click(squares[i]);
    expect(onGameComplete).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('bingo.win_header');
    click(squares[0]);
    expect(container.textContent).not.toContain('bingo.win_header');
    click(squares[0]);
    expect(container.textContent).toContain('bingo.win_header');
    expect(onGameComplete).toHaveBeenCalledTimes(1);
  });
  it('Bingo does not generate late audio after unmounting during saved-audio lookup', async () => {
    let resolveAudio;
    window.__alloResolveGlossaryAudio = () => new Promise(resolve => { resolveAudio = resolve; });
    const onGenerateAudio = vi.fn();
    const game = mount('BingoGame', { data: [{ term: 'planet', def: 'A world' }], settings: { cardCount: 1 }, bingoState: { cards: [] }, setSettings: vi.fn(), onGenerateAudio });
    click(control(game.container, 'bingo_launch_caller_btn'));
    click(control(game.container, 'bingo_next_clue'));
    cleanups.pop()();
    await act(async () => { resolveAudio(null); await Promise.resolve(); });
    expect(onGenerateAudio).not.toHaveBeenCalled();
  });
});

function solve(container, sentence) {
  for (const word of sentence.split(' ')) {
    click([...container.querySelectorAll('[data-help-key="syntax_pool_word"]')].find(el => el.textContent === word));
  }
  click(control(container, 'syntax_check'));
}
describe('Syntax Scramble gameplay', () => {
  it('shows an actionable empty state and a usable close control', () => {
    const { container } = mount('SyntaxScramble', { text: '' });
    expect(container.textContent).toContain('at least four words');
    expect(control(container, 'syntax_close')).toBeTruthy();
  });
  it.each(['élèves lisent des livres ensemble.', 'الطلاب يقرؤون الكتب في المدرسة.', 'мы читаем книги каждый день.', 'students read their books together'])('accepts a sentence without an ASCII-capital gate: %s', text => {
    const { container } = mount('SyntaxScramble', { text });
    expect(container.querySelectorAll('[data-help-key="syntax_pool_word"]').length).toBeGreaterThan(3);
  });
  it('segments Chinese text into word tiles', () => {
    const { container } = mount('SyntaxScramble', { text: '学生每天都在学校认真学习新的知识。' });
    expect(container.querySelectorAll('[data-help-key="syntax_pool_word"]').length).toBeGreaterThan(3);
  });
  it('awards 40 points per sentence and reports completion once across callback changes', () => {
    const text = 'The cat sat on the mat. Dogs like playing in the park.';
    const onScoreUpdate = vi.fn(), onGameComplete = vi.fn();
    const game = mount('SyntaxScramble', { text, onScoreUpdate, onGameComplete });
    solve(game.container, 'The cat sat on the mat.');
    click(control(game.container, 'syntax_next'));
    solve(game.container, 'Dogs like playing in the park.');
    click(control(game.container, 'syntax_next'));
    expect(onScoreUpdate.mock.calls.map(c => c[0])).toEqual([40, 40]);
    expect(onGameComplete).toHaveBeenCalledExactlyOnceWith('syntaxScramble', expect.objectContaining({ score: 80, sentencesCompleted: 2 }));
    game.rerender({ text, onScoreUpdate, onGameComplete, onClose: vi.fn(), playSound: vi.fn() });
    expect(onGameComplete).toHaveBeenCalledTimes(1);
  });
  it('starts shuffled, waits for all tiles, and gives visible recoverable error feedback', () => {
    const { container } = mount('SyntaxScramble', { text: 'The cat sat on the mat.' });
    const words = [...container.querySelectorAll('[data-help-key="syntax_pool_word"]')];
    expect(words.map(el => el.textContent).join(' ')).not.toBe('The cat sat on the mat.');
    expect(control(container, 'syntax_check').disabled).toBe(true);
    words.forEach(click);
    click(control(container, 'syntax_check'));
    expect(container.textContent).toContain('Try again.');
    click(control(container, 'syntax_dropped_word'));
    expect(container.querySelectorAll('[data-help-key="syntax_pool_word"]')).toHaveLength(1);
  });
  it('changing the sound callback does not erase a sentence in progress', () => {
    const text = 'The cat sat on the mat.';
    const game = mount('SyntaxScramble', { text, playSound: vi.fn() });
    click(control(game.container, 'syntax_pool_word'));
    game.rerender({ text, playSound: vi.fn(), onClose: vi.fn() });
    expect(game.container.querySelectorAll('[data-help-key="syntax_dropped_word"]')).toHaveLength(1);
  });
});
describe('Puzzle generation', () => {
  const search = (data, language = 'English') => {
    if (!window.AlloModules.TextUtilityHelpers) new Function(readFileSync('text_utility_helpers_module.js','utf8'))();
    const setGameData = vi.fn();
    const deps = { generatedContent: { type:'glossary', data }, setGameData, setGameMode:vi.fn(), setSelectedLetters:vi.fn(), setFoundWords:vi.fn(), setShowWordSearchAnswers:vi.fn(), setGeneratedContent:vi.fn(), setHistory:vi.fn(), addToast:vi.fn(), t:k=>k };
    window.AlloModules.TextUtilityHelpers.generateWordSearch(language,deps);
    return setGameData.mock.calls[0]?.[0];
  };
  it('word-search cells preserve Hindi vowel signs and supplementary-plane letters', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const chars=[...search([{term:'प्रकाश'}]).grid.flat(), ...search([{term:'𐐀𐐁𐐂'}]).grid.flat()];
    expect(chars).toContain('प्र');
    expect(chars).toContain('का');
    expect(chars).toContain('𐐀');
    expect(chars.every(c => !/^[\uD800-\uDFFF]$/.test(c))).toBe(true);
  });
  it('word search excludes untranslated terms when a target language is selected', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const data=search([{term:'sun',translations:{Spanish:'sol: estrella'}},{term:'moon'}], 'Spanish');
    expect(data.words).toEqual(['SOL']);
  });
  it('word search accepts short CJK words and records right-to-left layout', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(search([{term:'光线'}]).words).toEqual(['光线']);
    expect(search([{term:'الطاقة'}]).isRtl).toBe(true);
  });
  it('Bingo generation rejects missing or invalid term lists and filters bad rows', () => {
    const make = window.AlloModules.PureHelpers.generateBingoCards;
    const deps={addToast:vi.fn(),t:k=>k,fisherYatesShuffle:a=>a.slice()};
    expect(make(undefined,1,5,deps)).toBeNull();
    expect(make([null,{}, {term:' '}],1,5,deps)).toBeNull();
    const cards=make([null,{term:'sun',def:'A star'}],1,5,deps);
    expect(cards[0]).toHaveLength(25);
    expect(cards[0].every(cell => cell.type === 'free' || cell.term === 'sun')).toBe(true);
  });
});


describe('Compact Crossword navigation', () => {
  it('crops blank margins and still completes a non-square board with keyboard input', () => {
    const onGameComplete=vi.fn(), onScoreUpdate=vi.fn();
    const {container}=mount('CrosswordGame',{data:[{term:'planet',def:'A world'}],onGameComplete,onScoreUpdate});
    const grid=container.querySelector('[role="grid"]');
    expect(grid.getAttribute('aria-rowcount')).toBe('1');
    expect(grid.getAttribute('aria-colcount')).toBe('6');
    click(container.querySelector('#crossword-cell-0-0'));
    const key=key=>act(()=>grid.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true})));
    key('ArrowDown'); key('ArrowUp');
    for(const letter of 'planet') key(letter);
    key('ArrowRight'); key('ArrowDown');
    click([...container.querySelectorAll('button')].find(el=>el.textContent==='games.crossword.check'));
    expect(onScoreUpdate).toHaveBeenCalledExactlyOnceWith(112,'Crossword Challenge Complete');
    expect(onGameComplete).toHaveBeenCalledExactlyOnceWith('crossword',expect.objectContaining({wordsSolved:1,totalWords:1,score:112}));
  });
  it('Crossword reveal remains a zero-credit review on a cropped board', () => {
    const onGameComplete=vi.fn(), onScoreUpdate=vi.fn();
    const {container}=mount('CrosswordGame',{data:[{term:'planet',def:'A world'}],onGameComplete,onScoreUpdate});
    click([...container.querySelectorAll('button')].find(el=>el.textContent==='games.crossword.reveal'));
    expect(container.querySelectorAll('[id^="crossword-cell-"]')).toHaveLength(6);
    expect(onScoreUpdate).not.toHaveBeenCalled();expect(onGameComplete).not.toHaveBeenCalled();
  });
});


describe('Ambiguous matching labels', () => {
  it('accepts either valid definition for two identical visible term labels', () => {
    const onGameComplete=vi.fn();
    const {container}=mount('MatchingGame',{data:[{term:'bank',def:'River edge'},{term:'bank',def:'A financial institution'}],onGameComplete});
    const terms=container.querySelectorAll('[data-help-key="matching_term_item"]');
    const defs=[...container.querySelectorAll('[data-help-key="matching_def_item"]')];
    click(terms[0]);click(defs.find(el=>el.textContent==='A financial institution'));
    click(terms[1]);click(defs.find(el=>el.textContent==='River edge'));
    click(control(container,'matching_check_btn'));
    expect(onGameComplete).toHaveBeenCalledExactlyOnceWith('matching',expect.objectContaining({isPerfect:true,correctMatches:2}));
  });
});


describe('Word-search print orientation', () => {
  it.each(['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx'])('%s keeps the answer key in the same direction as the playable puzzle', path => {
    const source=readFileSync(path,'utf8');
    const start=source.indexOf('let teacherGridHtml =');
    expect(source.slice(start,start+150)).toContain("gameData.isRtl ? 'rtl' : 'ltr'");
  });
});

