import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import * as e from '../lesson_board_engine.js';
const require = createRequire(import.meta.url), { makeBoard, source } = require('../dev-tools/fixtures/lesson_board.cjs'), React = require('../desktop/web-app/node_modules/react'), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
let UI, root, element;
const t = key => key, wait = ms => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
async function render(Component, props = {}) { if (!root) { element = document.createElement('div'); document.body.append(element); root = createRoot(element); } await act(async () => root.render(React.createElement(Component, { t, ...props }))); }
const $ = selector => element.querySelector(selector), named = text => [...element.querySelectorAll('button')].find(button => button.textContent.trim() === text);
const click = async target => { const node = typeof target === 'string' ? $(target) : target; expect(node).toBeTruthy(); await act(async () => { node.click(); await new Promise(resolve => setTimeout(resolve, 0)); }); };
const choose = async (selector, value) => act(async () => { const node = $(selector); expect(node).toBeTruthy(); node.value = value; node.dispatchEvent(new Event('change', { bubbles: true })); });
const type = async (selector, value) => act(async () => { const node = $(selector); expect(node).toBeTruthy(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); });
const setupProps = extra => ({ inputText: source, language: 'English', history: [], appId: 'preview', user: { uid: 'teacher' }, allowLive: false, onClose() {}, ...extra });
const card = { id: 'rain-card', title: 'Rain returns', text: 'Rain brings water back down.', sourceQuote: 'Precipitation returns water to the ground.', reward: [2, 0] };
beforeAll(() => {
  window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const bundle = require('node:child_process').execFileSync(process.execPath, ['-e', "process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {LessonBoardSetup,LessonBoardSolo} from './lesson_board_source.jsx';export {BoardView} from './lesson_board_ui.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'PreviewUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"], { encoding: 'utf8' });
  UI = new Function(bundle + ';return PreviewUI;')();
});
afterEach(async () => { if (root) await act(async () => root.unmount()); element?.remove(); element = root = null; localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks(); delete window.AlloModules?.AltText; delete window.matchMedia; });

describe('Resilient generation, teacher preview and refinement', () => {
  it('self-heals a malformed reply and reports the repair', async () => {
    const reply = 'Here is the board:\n```json\n' + JSON.stringify(makeBoard()).replace('"answer":1}', '"answer":1,}') + '\n```', callGemini = vi.fn(async () => reply);
    await render(UI.LessonBoardSetup, setupProps({ callGemini }));
    await click(named('Generate lesson board'));
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect($('[data-board-blueprint] h3').textContent).toBe(makeBoard().title);
    expect($('[data-generation-report]').textContent).toContain('Repaired the formatting of the AI reply');
    expect($('[data-board-chance]').checked).toBe(true);
    expect($('[data-board-versions]')).toBeNull();
  });
  it('previews every stop with an answer key, checks answers and spreads answer positions', async () => {
    await render(UI.LessonBoardSetup, setupProps({ callGemini: async () => JSON.stringify(makeBoard()) }));
    await click(named('Generate lesson board'));
    expect($('[data-preview-stop]').dataset.previewStop).toBe('heater');
    expect($('[data-preview-answer-key]')).toBeNull();
    await click('[data-preview-key-toggle]');
    expect($('[data-preview-answer-key]').textContent).toContain('Evaporation');
    await choose('[data-preview-stop] [data-board-choice]', '0');
    await click('[data-preview-check]');
    expect($('.lb-preview-check').dataset.result).toBe('incorrect');
    await choose('[data-preview-stop] [data-board-choice]', '1');
    await click('[data-preview-check]');
    expect($('.lb-preview-check').dataset.result).toBe('correct');
    await click('[data-preview-next]');
    expect($('[data-preview-stop]').dataset.previewStop).toBe('cloud');
    expect($('[data-quality="position"]')).toBeTruthy();
    await click('[data-balance-answers]');
    expect($('[data-quality="position"]')).toBeNull();
    expect($('[data-board-undo]').textContent).toContain('Before spreading answer positions');
    await click('[data-board-undo]');
    expect($('[data-quality="position"]')).toBeTruthy();
    expect($('[data-board-versions]')).toBeNull();
  });
  it('refines one stop and then the whole board with AI, each undoable', async () => {
    const callGemini = vi.fn().mockResolvedValueOnce(JSON.stringify(makeBoard())).mockResolvedValueOnce(JSON.stringify({ ...makeBoard().locations[0], name: 'Steam vent' })).mockResolvedValueOnce(JSON.stringify({ ...makeBoard(), title: 'Rainy Waterworks' }));
    await render(UI.LessonBoardSetup, setupProps({ callGemini }));
    await click(named('Generate lesson board'));
    await click('[data-refine-stop-preset="easier"]');
    expect(callGemini.mock.calls[1][0]).toContain('Rewrite ONE location');
    expect($('[data-preview-stop] h4').textContent).toBe('Stop 1: Steam vent');
    expect($('[data-board-undo]').textContent).toBe('Undo: Before revising Heating station: Easier');
    await click('[data-refine-board-preset="vivid"]');
    expect(callGemini.mock.calls[2][0]).toContain('TEACHER REQUEST');
    expect($('[data-board-blueprint] h3').textContent).toBe('Rainy Waterworks');
    expect($('[data-report-changes]').textContent).toContain('Title, mission or reflection changed.');
    await click('[data-board-undo]');
    expect($('[data-board-blueprint] h3').textContent).toBe(makeBoard().title);
    expect($('[data-preview-stop] h4').textContent).toBe('Stop 1: Steam vent');
    await click('[data-board-undo]');
    expect($('[data-preview-stop] h4').textContent).toBe('Stop 1: Heating station');
  });
  it('offers an unrepaired AI draft for hand fixing without replacing the current board', async () => {
    const bad = makeBoard(); bad.locations[0].sourceQuote = 'Invented volcano fact.';
    const callGemini = vi.fn(async () => JSON.stringify(bad));
    await render(UI.LessonBoardSetup, setupProps({ callGemini }));
    await click(named('Generate lesson board'));
    expect(callGemini).toHaveBeenCalledTimes(3);
    expect(element.textContent).toContain('could not be validated');
    expect($('[data-draft-recovery]').textContent).toContain('Quote must match the lesson: heater');
    expect($('[data-board-blueprint]')).toBeNull();
    await click('[data-open-draft]');
    await wait(5);
    expect($('[data-board-blueprint] h3').textContent).toBe(bad.title);
    expect($('[data-board-editor]').open).toBe(true);
    expect($('[data-board-validation]').textContent).toContain('Quote must match the lesson: heater');
    expect($('[data-quality="validation"]')).toBeTruthy();
  });
  it('adds Mulberry picture symbols with a licence credit and carries them into play', async () => {
    const search = vi.fn(async query => ({ symbols: [{ id: 'mulberry:' + query, label: query, svgUrl: 'https://globalsymbols.com/symbols/' + encodeURIComponent(query) + '.svg' }], error: '' }));
    window.AlloModules = { ...(window.AlloModules || {}), AltText: { searchMulberrySymbols: search, MULBERRY_CREDIT: {}, openImageCreditLine: () => 'Mulberry Symbols by Steve Lee, CC BY-SA 4.0, via Global Symbols' } };
    await render(UI.LessonBoardSetup, setupProps({ callGemini: async () => JSON.stringify(makeBoard()) }));
    await click(named('Generate lesson board'));
    await click('[data-find-symbols]');
    await wait(20);
    expect($('[data-symbol-status]').textContent).toBe('Found symbols for 11 of 11 places. Places without one keep their icon.');
    expect(search).toHaveBeenCalledWith('heating', expect.objectContaining({ language: 'English' }));
    expect($('[data-preview-stop] img.lb-symbol').getAttribute('src')).toBe('https://globalsymbols.com/symbols/heating.svg');
    expect($('[data-symbol-credit]').textContent).toContain('CC BY-SA 4.0');
    await click('[data-symbol-editor] button[type="submit"]');
    await wait(10);
    await click('[data-symbol-choice]');
    await click('[data-remove-symbols]');
    expect($('[data-preview-stop] img.lb-symbol')).toBeNull();
    await click('[data-find-symbols]');
    await wait(20);
    await click(named('Play solo'));
    expect($('[data-board-map] [data-location="heater"] img.lb-symbol')).toBeTruthy();
    expect($('[data-symbol-credit]')).toBeTruthy();
  });
  it('explains missing symbol search and network failures without blocking the board', async () => {
    await render(UI.LessonBoardSetup, setupProps({ callGemini: async () => JSON.stringify(makeBoard()) }));
    await click(named('Generate lesson board'));
    expect($('[data-symbols-unavailable]')).toBeTruthy();
    await act(async () => root.unmount()); root = null;
    window.AlloModules = { ...(window.AlloModules || {}), AltText: { searchMulberrySymbols: async () => ({ symbols: [], error: 'network' }) } };
    await render(UI.LessonBoardSetup, setupProps({ callGemini: async () => JSON.stringify(makeBoard()) }));
    await click(named('Generate lesson board'));
    await click('[data-find-symbols]');
    await wait(10);
    expect(element.textContent).toContain('Mulberry symbols could not be reached');
    expect(named('Play solo').disabled).toBe(false);
  });
  it('turns fortune dice off and on as an undoable board change', async () => {
    await render(UI.LessonBoardSetup, setupProps({ callGemini: async () => JSON.stringify(makeBoard()) }));
    await click(named('Generate lesson board'));
    await click('[data-board-chance]');
    expect($('[data-board-chance]').checked).toBe(false);
    await click(named('Try the board'));
    expect($('[data-board-luck]')).toBeNull();
    expect($('[data-board-path-roll]')).toBeNull();
  });
});

describe('Fortune dice in play', () => {
  it('lets the dice pick a path, rolls after a correct answer and reveals a discovery card', async () => {
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(buffer => { buffer[0] = 17; return buffer; });
    const board = e.prepareBoard({ ...makeBoard(), chance: true, discoveries: [card] }, source);
    await render(UI.LessonBoardSolo, { board, preview: true, user: { uid: 'u' }, appId: 'dice', onBack() {} });
    expect($('[data-board-luck]').textContent).toContain('Momentum: 0/2');
    await click('[data-path-roll]');
    expect($('[data-path-roll-result]').textContent).toBe('The die shows 2: Cloud laboratory. Explore it, or choose another move.');
    expect($('.lb-current h3').textContent).toBe('Cloud laboratory');
    await click('[data-ready-move="heater"]');
    await click('[data-board-move="heater"]');
    await choose('[data-board-choice]', '1');
    await click('[data-board-submit]');
    expect($('[data-board-fortune]')).toBeTruthy();
    await wait(300);
    expect($('[data-fortune-result]').textContent).toContain('You rolled 18! You revealed a discovery card.');
    expect($('[data-board-fortune] [data-discovery-card="rain-card"]')).toBeTruthy();
    expect($('[data-board-discoveries] summary').textContent).toBe('Discovery cards found: 1/1');
    expect($('[data-board-luck]').textContent).toContain('Momentum: 1/2');
  });
  it('animates the full roll when motion is allowed and settles on the rolled face', async () => {
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(buffer => { buffer[0] = 0; return buffer; });
    const board = e.prepareBoard({ ...makeBoard(), chance: true }, source);
    await render(UI.LessonBoardSolo, { board, preview: true, user: { uid: 'u' }, appId: 'dice-motion', onBack() {} });
    await click('[data-path-roll]');
    await wait(1000);
    expect($('[data-path-roll-result]').textContent).toContain('The die shows 1: Heating station.');
    await click('[data-board-move="heater"]');
    await choose('[data-board-choice]', '1');
    await click('[data-board-submit]');
    expect($('[data-board-fortune] [data-d20="1"]').dataset.still).toBe('false');
    expect($('[data-fortune-result]').textContent).toBe('');
    await wait(2100);
    expect($('[data-fortune-result]').textContent).toContain('You rolled 1. Steady progress');
    expect($('[data-board-fortune] .lb-d20-face[data-top=true]').textContent).toBe('1');
  });
  it('does not roll after an incorrect answer', async () => {
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    const board = e.prepareBoard({ ...makeBoard(), chance: true }, source);
    await render(UI.LessonBoardSolo, { board, preview: true, user: { uid: 'u' }, appId: 'dice', onBack() {} });
    await click('[data-board-move="heater"]');
    await choose('[data-board-choice]', '0');
    await click('[data-board-submit]');
    expect($('[data-board-recap]')).toBeTruthy();
    expect($('[data-board-fortune]')).toBeNull();
  });
});

describe('Round two: vocabulary symbols, highlights, progress and sound', () => {
  const { glossary } = require('../dev-tools/fixtures/lesson_board_support.cjs');
  const mulberry = () => { const search = vi.fn(async query => ({ symbols: [{ id: 'm:' + query, label: query, svgUrl: 'https://globalsymbols.com/symbols/' + encodeURIComponent(query) + '.svg' }], error: '' })); window.AlloModules = { ...(window.AlloModules || {}), AltText: { searchMulberrySymbols: search, MULBERRY_CREDIT: {}, openImageCreditLine: () => 'Mulberry Symbols by Steve Lee, CC BY-SA 4.0, via Global Symbols' } }; return search; };
  function finish(board) {
    let run = e.emptyRun();
    for (let guard = 0; guard < 47 && !e.derive(board, run).complete; guard++) {
      const options = e.targets(board, run), target = options.find(item => !item.cost) || options[0];
      run = e.merge(run, e.begin(board, run, target.id));
      if (!target.cost) { const node = board.locations.find(item => item.id === target.id); run = e.merge(run, e.processAction(board, run, { attemptId: 'solo', turn: run.turn, requestId: e.requestId(run, 'answer'), kind: 'answer', targetId: node.id, value: e.solution(node) }, 'solo', { attemptId: 'solo', active: true })); run = e.merge(run, e.resolve(board, run, { solo: {} }, { dice: [20, 20] })); }
      if (!e.derive(board, run).complete) run = e.merge(run, e.advance(board, run));
    }
    return run;
  }
  it('finds credited Mulberry symbols for vocabulary words, in bulk or one at a time', async () => {
    const search = mulberry(), words = { ...glossary(), data: glossary().data.map(({ image, ...entry }) => entry) };
    await render(UI.LessonBoardSetup, setupProps({ history: [words], callGemini: async () => JSON.stringify(makeBoard()) }));
    await click(named('Generate lesson board'));
    await wait(30);
    expect($('[data-board-vocabulary-linked]')).toBeTruthy();
    expect(element.querySelectorAll('[data-artwork-slot^="term:"] img')).toHaveLength(0);
    await click('[data-term-symbols-all]');
    await wait(50);
    const pictures = [...element.querySelectorAll('[data-artwork-slot^="term:"] img.lb-symbol-picture')].map(img => img.getAttribute('src'));
    expect(pictures).toEqual(['evaporation', 'condensation', 'collection'].map(word => 'https://globalsymbols.com/symbols/' + word + '.svg'));
    expect(search).toHaveBeenCalledWith('evaporation', expect.objectContaining({ language: 'English' }));
    expect($('[data-symbol-credit]').textContent).toContain('CC BY-SA 4.0');
    expect($('[data-term-symbols-all]')).toBeNull();
    await click('[data-find-term-symbol]');
    await wait(10);
    await type('[data-term-symbol-query]', 'water drop');
    await click('[data-term-symbol-results] button[type="submit"]');
    await wait(10);
    await click('[data-term-symbol-choice]');
    expect(element.querySelector('[data-artwork-slot^="term:"] img').getAttribute('src')).toBe('https://globalsymbols.com/symbols/water%20drop.svg');
  });
  it('celebrates a finished game with highlights and badges', async () => {
    const board = e.prepareBoard({ ...makeBoard(), goal: 'expedition', chance: true, discoveries: [card] }, source), run = finish(board);
    expect(e.derive(board, run).complete).toBe(true);
    await render(UI.BoardView, { board, run, role: 'solo', uid: 'solo', roster: { solo: { name: 'You' } }, onMove() {}, onAnswer() {}, onAdvance() {}, onRetry() {}, onWorkspaceChange() {} });
    const badges = [...element.querySelectorAll('[data-board-highlights] [data-badge]')].map(item => item.dataset.badge);
    expect(badges).toEqual(expect.arrayContaining(['natural20', 'collector', 'momentum', 'lucky', 'explorer']));
    expect($('[data-board-highlights]').textContent).toContain('Longest first-try streak8');
  });
  it('shows which repair attempt is running and how many problems are left', async () => {
    const bad = makeBoard(); bad.locations[0].sourceQuote = 'Invented volcano fact.';
    let release; const callGemini = vi.fn().mockResolvedValueOnce(JSON.stringify(bad)).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    await render(UI.LessonBoardSetup, setupProps({ callGemini }));
    await click(named('Generate lesson board'));
    expect(element.textContent).toContain('Problems left: 1. Try 2 of 3');
    await act(async () => { release(JSON.stringify(makeBoard())); });
    await wait(10);
    expect($('[data-board-blueprint] h3').textContent).toBe(makeBoard().title);
    expect(element.textContent).not.toContain('Problems left');
  });
  it('remembers the dice sound choice on this device', async () => {
    const board = e.prepareBoard({ ...makeBoard(), chance: true }, source);
    await render(UI.LessonBoardSolo, { board, preview: true, user: { uid: 'u' }, appId: 'sound', onBack() {} });
    expect($('[data-dice-sound]').checked).toBe(false);
    await click('[data-dice-sound]');
    expect(localStorage.getItem('allo-board-dice-sound')).toBe('on');
    await click('[data-dice-sound]');
    expect(localStorage.getItem('allo-board-dice-sound')).toBeNull();
  });
});
