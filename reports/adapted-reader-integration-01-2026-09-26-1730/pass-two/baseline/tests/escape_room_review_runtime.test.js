import fs from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
const en = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8'));
const es = JSON.parse(fs.readFileSync('lang/spanish_latin_america.js', 'utf8'));
const get = (pack, key) => key.split('.').reduce((o, k) => o?.[k], pack);
const translator = (pack = en) => (key, params = {}) => {
  let value = get(pack, key) ?? get(en, key);
  if (typeof value !== 'string') return value;
  for (const [name, replacement] of Object.entries(params)) value = value.replace('{' + name + '}', replacement);
  return value;
};
const t = translator();
const object = { id: 'o1', name: 'Library book', description: 'A clue in a book', emoji: '📖' };
const basePuzzle = { id: 'p1', linkedObjectId: 'o1', linkedObject: object, type: 'fillin', question: 'Complete the sentence', sentence: 'Plants use _____ for energy.', answer: 'sunlight', hint: 'Think about the sun.' };
const initialRoom = (extra = {}) => ({ isActive: true, room: { theme: 'Library', description: 'Explore the library.' }, puzzles: [basePuzzle], objects: [object], totalPuzzles: 1, solvedPuzzles: new Set(), discoveredClues: {}, timeRemaining: 300, maxTime: 300, difficulty: 'normal', hintsRemaining: 3, textInput: '', ...extra });
const dataFixture = () => {
  const types = ['mcq', 'mcq', 'sequence', 'sequence', 'matching', 'matching', 'fillin', 'fillin', 'cipher', 'scramble'];
  const objects = types.map((type, i) => ({ id: 'o' + i, name: type }));
  return { room: { theme: 'Library', description: 'Explore.' }, objects, puzzles: types.map((type, i) => ({ id: 'p' + i, linkedObjectId: 'o' + i, type, question: 'Question', answer: type === 'scramble' ? 'कि🧠e\u0301' : 'sunlight', scrambledWord: 'WRONG', options: ['A','B','C','D'], correctIndex: 0, items: ['Later','Earlier'], correctOrder: [1,0], pairs: [{ left: 'Light', right: 'Sun' }], wordbank: ['sunlight','rain'], sentence: 'Use _____.' })) };
};
function makeEngine(extra = {}) {
  const state = { inputText: 'Plants use sunlight for energy.', escapeTimeLeft: 300, leveledTextLanguage: 'English', escapeRoomState: initialRoom(), activeSessionCode: 'TEST', activeSessionAppId: 'app', user: { uid: 'host' }, ...extra };
  const callGemini = vi.fn(async () => JSON.stringify(dataFixture()));
  const updateDoc = vi.fn(async () => {});
  const deps = { getState: () => state, setState: { setEscapeRoomState: value => { state.escapeRoomState = typeof value === 'function' ? value(state.escapeRoomState) : value; }, setEscapeTimeLeft: value => { state.escapeTimeLeft = typeof value === 'function' ? value(state.escapeTimeLeft) : value; }, setIsEscapeTimerRunning: value => { state.isEscapeTimerRunning = value; } }, callGemini, t, addToast: vi.fn(), playSound: vi.fn(), handleScoreUpdate: vi.fn(), setGlobalPoints: vi.fn(), firebase: { db: {}, doc: vi.fn(() => 'session'), updateDoc } };
  return { engine: window.AlloModules.createEscapeRoomEngine(deps), state, ...deps, updateDoc };
}
let root;
beforeAll(() => { window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true; loadAlloModule('escape_room_module.js'); });
afterEach(() => { if (root) act(() => root.unmount()); root = null; document.body.innerHTML = ''; vi.useRealTimers(); });

describe('Escape Room generation and answer behavior', () => {
  it('uses the current output language in both generation paths and preserves machine contracts', async () => {
    const h = makeEngine({ leveledTextLanguage: 'Spanish (Latin America)' });
    await h.engine.generateEscapeRoom();
    expect(h.callGemini.mock.calls[0][0]).toContain('Write ALL student-facing text in Spanish (Latin America)');
    expect(h.callGemini.mock.calls[0][0]).toContain('Keep JSON keys, ids, linkedObjectId, revealsClueFor, and puzzle type values in English');
    h.state.leveledTextLanguage = 'Arabic';
    await h.engine.launchCollaborativeEscapeRoom();
    expect(h.callGemini.mock.calls[1][0]).toContain('Write ALL student-facing text in Arabic');
    const live = h.updateDoc.mock.calls[0][1].escapeRoomState;
    expect(live.puzzles.find(p => p.type === 'sequence').correctOrder).toEqual([1, 0]);
    expect(live.puzzles.find(p => p.type === 'scramble').displayLetters.slice().sort()).toEqual(['कि', '🧠', 'é'].sort());
  });
  it('resolves multi-language and unset selections to one concrete room language', async () => {
    const h = makeEngine({ leveledTextLanguage: 'All Selected Languages', selectedLanguages: ['French', 'Arabic'] });
    await h.engine.generateEscapeRoom();
    expect(h.callGemini.mock.calls[0][0]).toContain('student-facing text in French');
    h.state.leveledTextLanguage = '';
    await h.engine.generateEscapeRoom();
    expect(h.callGemini.mock.calls[1][0]).toContain('student-facing text in English');
  });
  it('requires a complete final-door answer and awards completion only once', () => {
    const h = makeEngine({ escapeRoomState: initialRoom({ finalDoorUnlocked: true, finalDoorPuzzle: { answer: 'photosynthesis', acceptableAnswers: ['photo synthesis', ''] } }) });
    h.engine.handleFinalDoorAnswer('');
    h.engine.handleFinalDoorAnswer('photo');
    h.engine.handleFinalDoorAnswer('not photosynthesis');
    expect(h.state.escapeRoomState.isEscaped).not.toBe(true);
    expect(h.state.escapeRoomState.wrongAttempts).toBe(2);
    h.engine.handleFinalDoorAnswer('  PHOTO   SYNTHESIS ');
    expect(h.state.escapeRoomState.isEscaped).toBe(true);
    const calls = h.playSound.mock.calls.length;
    h.engine.handleFinalDoorAnswer('photosynthesis');
    expect(h.playSound).toHaveBeenCalledTimes(calls);
    expect(h.state.isEscapeTimerRunning).toBe(false);
  });
  it('does not bypass a locked final door or accept an accent as a different word', () => {
    vi.useFakeTimers();
    const h = makeEngine({ escapeRoomState: initialRoom({ finalDoorPuzzle: { answer: 'sunlight' }, puzzles: [{ ...basePuzzle, answer: 'café' }] }) });
    h.engine.handleFinalDoorAnswer('sunlight');
    expect(h.state.escapeRoomState.isEscaped).not.toBe(true);
    h.engine.handleFillinAnswer('p1', 'cafe');
    expect(h.state.escapeRoomState.solvedPuzzles.size).toBe(0);
    h.engine.handleFillinAnswer('p1', ' CAFE\u0301 ');
    expect(h.state.escapeRoomState.solvedPuzzles.has('p1')).toBe(true);
  });
});

function mountRoom(kind = 'puzzle', extra = {}, pack = en) {
  let update;
  function Harness() {
    const [state, setState] = React.useState(initialRoom(extra));
    update = setState;
    const handlers = new Proxy({}, { get: () => vi.fn() });
    const open = () => setState(prev => ({ ...prev, ...(kind === 'puzzle' ? { selectedObject: object } : kind === 'final' ? { showFinalDoor: true } : kind === 'settings' ? { showSettings: true } : { isPreview: true }) }));
    const Component = ['puzzle','final'].includes(kind) ? window.AlloModules.EscapeRoomGameplay : window.AlloModules.EscapeRoomDialogs;
    return React.createElement(React.Fragment, null,
      React.createElement('button', { id: 'trigger', onClick: open }, 'Open room'),
      React.createElement(Component, { escapeRoomState: state, setEscapeRoomState: setState, handlers, t: translator(pack), escapeTimeLeft: 300, isEscapeTimerRunning: true, soundEnabled: false, setSoundEnabled: () => {}, playSound: () => {}, hasSourceOrAnalysis: true })
    );
  }
  const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  act(() => root.render(React.createElement(Harness)));
  const trigger = document.getElementById('trigger'); trigger.focus(); act(() => trigger.click());
  return { trigger, update: value => act(() => update(value)) };
}

describe('Escape Room rendered accessibility', () => {
  it.each(['puzzle','final','settings','preview'])('%s dialog has a name, contains keyboard focus, closes with Escape, and returns focus', kind => {
    const { trigger } = mountRoom(kind, { finalDoorUnlocked: true, finalDoorPuzzle: { sentence: 'Name the source.', answer: 'sunlight', wordbank: ['sunlight', 'rain'] } });
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-label') || document.getElementById(dialog.getAttribute('aria-labelledby'))?.textContent).toBeTruthy();
    const controls = [...dialog.querySelectorAll('button,input,select,textarea,[tabindex]')].filter(el => !el.disabled && el.tabIndex >= 0);
    expect(document.activeElement).toBe(controls[0]);
    act(() => controls[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(controls.at(-1));
    act(() => controls.at(-1).dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(controls[0]);
    act(() => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
  it('keeps changing fill-in prose out of live regions and replaces the entire blank', () => {
    const h = mountRoom();
    const sentence = document.getElementById('fillin-sentence');
    expect(sentence.closest('[role="status"], [aria-live]')).toBeNull();
    h.update(prev => ({ ...prev, textInput: 'sunlight' }));
    expect(sentence.textContent).toBe('Plants use [sunlight] for energy.');
    expect(sentence.closest('[role="status"], [aria-live]')).toBeNull();
  });
  it('has only one live region for matched pairs', () => {
    mountRoom('puzzle', { puzzles: [{ ...basePuzzle, type: 'matching', pairs: [{ left: 'Light', right: 'Sun' }, { left: 'Water', right: 'Rain' }] }], matchingPairs: [['Light','Sun']] });
    const statuses = document.querySelectorAll('[role="status"]');
    expect(statuses).toHaveLength(1);
    expect(statuses[0].querySelector('[role="status"]')).toBeNull();
  });
  it('renders Spanish editor names from existing translations, including field and question number', () => {
    mountRoom('preview', { puzzles: [{ ...basePuzzle, type: 'mcq', sentence: undefined, options: ['A','B'], correctIndex: 0 }], finalDoorPuzzle: { sentence: 'Use _____.', answer: 'sunlight' } }, es);
    const names = [...document.querySelectorAll('[role="dialog"] input')].map(el => el.getAttribute('aria-label'));
    const tr = translator(es);
    expect(names).toContain(tr('share_collect.q_aria', { n: 1 }) + ': ' + tr('quiz.question_label'));
    expect(names).toContain(tr('share_collect.q_aria', { n: 1 }) + ': ' + tr('escape_room.option') + ' A');
    expect(names).toContain(tr('share_collect.q_aria', { n: 1 }) + ': ' + tr('escape_room.hint'));
    expect(names).toContain(tr('escape_room.final_door_title') + ': ' + tr('escape_room.sentence_with_blank'));
    expect(names.every(name => name && !name.includes('undefined'))).toBe(true);
  });
});

describe('Escape Room translation contracts', () => {
  const paths = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js', ...['lang','desktop/web-app/public/lang'].flatMap(dir => fs.readdirSync(dir).filter(f => f.endsWith('.js')).map(f => dir + '/' + f))];
  const fallback = new Set(['acholi','karen','chin_hakha','chin_falam','marshallese','lao','maay_maay']);
  it.each(paths)('%s preserves interpolation, symbols, editor labels, and exit-door translations', path => {
    const pack = JSON.parse(fs.readFileSync(path, 'utf8'));
    const failures = [];
    for (const [key, value] of Object.entries(pack.escape_room)) {
      if (/\{\{|\}\}/.test(value)) failures.push(key + ': double braces');
      const params = Object.fromEntries([...value.matchAll(/\{(\w+)\}/g)].map(m => [m[1], '7']));
      if (/\{\w+\}/.test(translator(pack)('escape_room.' + key, params))) failures.push(key + ': unresolved placeholder');
    }
    for (const key of ['time_up','game_over_time','thirty_seconds_warning','preview_confirmed']) if (/^\? /.test(pack.escape_room[key])) failures.push(key + ': damaged symbol');
    for (const key of ['share_collect.q_aria','quiz.question_label','escape_room.hint','escape_room.option']) if (!get(pack,key)) failures.push(key + ': missing editor label');
    const slug = path.split('/').at(-1).replace('.js','');
    if (slug !== 'ui_strings' && !fallback.has(slug)) for (const key of ['approach_door','unlock_door','final_door']) if (pack.escape_room[key] === en.escape_room[key]) failures.push(key + ': untranslated door');
    expect(failures).toEqual([]);
  }, 20000);
});
describe('Escape Room lifecycle enhancements', () => {
  const roomConfig = (count = 2, finalDoor = { sentence: 'Name the process.', answer: 'photosynthesis' }) => ({
    room: { theme: 'Greenhouse', description: 'Restore the plants.' },
    objects: Array.from({ length: count }, (_, i) => ({ id: 'obj' + i, name: 'Object ' + i, emoji: '🌱' })),
    puzzles: Array.from({ length: count }, (_, i) => ({ id: 'p' + i, linkedObjectId: 'obj' + i, type: 'mcq', question: 'Source of plant energy ' + i, options: ['sunlight','stone'], correctIndex: 0, hint: 'Think about the sky.' })),
    finalDoor
  });
  const withConfig = (count = 2, extra = {}) => {
    const config = roomConfig(count);
    const h = makeEngine({ isEscapeTimerRunning: true, ...extra, escapeRoomState: initialRoom({ ...config, finalDoorPuzzle: config.finalDoor, totalPuzzles: count, ...(extra.escapeRoomState || {}) }) });
    return h;
  };
  it('subtracts mistakes from the visible clock and ends the run when its time is exhausted', () => {
    const h = withConfig(2, { escapeTimeLeft: 7 });
    h.engine.handleWrongAnswer('p0');
    expect(h.state.escapeTimeLeft).toBe(0);
    expect(h.state.escapeRoomState.timeRemaining).toBe(0);
    expect(h.state.escapeRoomState.isActive).toBe(true);
    expect(h.state.escapeRoomState).toMatchObject({ isGameOver: true, gameOverReason: 'time', selectedObject: null, showFinalDoor: false });
    expect(h.state.isEscapeTimerRunning).toBe(false);
    h.engine.handleEscapeRoomAnswer('p0', 0);
    expect(h.handleScoreUpdate).not.toHaveBeenCalled();
  });
  it('enforces the life budget and keeps easy mode unlimited', () => {
    const h = withConfig(2, { escapeRoomState: { lives: 3, maxLives: 3 } });
    for (let i=0;i<3;i++) h.engine.handleWrongAnswer('p0');
    expect(h.state.escapeRoomState).toMatchObject({ lives: 0, isGameOver: true, gameOverReason: 'lives' });
    expect(h.state.escapeTimeLeft).toBe(270);
    const easy = withConfig(2, { escapeRoomState: { difficulty: 'easy', lives: 99, maxLives: 99 } });
    for (let i=0;i<4;i++) easy.engine.handleWrongAnswer('p0');
    expect(easy.state.escapeRoomState.lives).toBe(99);
    expect(easy.state.escapeRoomState.isGameOver).toBe(false);
  });
  it('does not mutate or score paused and terminal runs', () => {
    const h = withConfig();
    for (const mode of ['paused','gameover','escaped','inactive']) {
      h.state.isEscapeTimerRunning = mode !== 'paused';
      Object.assign(h.state.escapeRoomState, { isGameOver: mode === 'gameover', isEscaped: mode === 'escaped', isActive: mode !== 'inactive' });
      h.engine.handleEscapeRoomAnswer('p0', 0);
      h.engine.handleWrongAnswer('p0');
      h.engine.handleRevealHint('p0');
      h.engine.handleSelectObject(h.state.escapeRoomState.objects[0]);
    }
    expect(h.handleScoreUpdate).not.toHaveBeenCalled();
    expect(h.playSound).not.toHaveBeenCalled();
    expect(h.state.escapeTimeLeft).toBe(300);
  });
  it('unlocks the final door only after all puzzles, including short rooms', () => {
    for (const count of [1, 3, 5]) {
      const h = withConfig(count);
      for (let i=0;i<count;i++) {
        h.engine.handlePuzzleSolved('p'+i);
        expect(!!h.state.escapeRoomState.finalDoorUnlocked).toBe(i === count - 1);
      }
      const calls = h.handleScoreUpdate.mock.calls.length;
      h.engine.handlePuzzleSolved('p0');
      expect(h.handleScoreUpdate).toHaveBeenCalledTimes(calls);
    }
  });
  it('completes older rooms that have no final-door puzzle', () => {
    const h = withConfig(1, { escapeRoomState: { finalDoorPuzzle: null } });
    h.engine.handleEscapeRoomAnswer('p0', 0);
    expect(h.state.escapeRoomState.isEscaped).toBe(true);
    expect(h.state.isEscapeTimerRunning).toBe(false);
  });
  it('charges hints once and records exact awarded XP while preserving replay high scores', () => {
    const h = withConfig(2, { completedActivities: new Map(), escapeRoomState: { difficulty: 'hard', timerEnabled: false } });
    h.handleScoreUpdate.mockImplementation((points, _name, id) => h.state.completedActivities.set(id, Math.max(points, h.state.completedActivities.get(id) || 0)));
    const solve = () => { h.state.isEscapeTimerRunning = true; h.engine.handleRevealHint('p0'); h.engine.handleRevealHint('p0'); h.engine.handlePuzzleSolved('p0'); h.engine.handlePuzzleSolved('p1'); h.engine.handleFinalDoorAnswer('photosynthesis'); };
    solve();
    expect(h.state.escapeRoomState).toMatchObject({ xpEarned: 150, runScore: 150, totalHintsUsed: 1 });
    expect(h.setGlobalPoints).not.toHaveBeenCalled();
    expect(h.handleScoreUpdate.mock.calls.map(call => call[0])).toEqual([35,40,75]);
    h.engine.resetEscapeRoom({ replay: true });
    solve();
    expect(h.state.escapeRoomState).toMatchObject({ xpEarned: 0, runScore: 150, totalHintsUsed: 1 });
  });
  it('keeps scores from different room content separate', () => {
    const first = withConfig(); first.engine.handlePuzzleSolved('p0');
    const second = withConfig(); second.state.escapeRoomState.puzzles[0].question = 'Different content'; second.engine.handlePuzzleSolved('p0');
    expect(first.handleScoreUpdate.mock.calls[0][2]).not.toBe(second.handleScoreUpdate.mock.calls[0][2]);
  });
  it('replays the edited room without another generation call and clears every attempt field', () => {
    const h = withConfig(3);
    h.state.escapeRoomState.puzzles[0].question = 'Teacher-edited question';
    Object.assign(h.state.escapeRoomState, { isGameOver: true, selectedObject: h.state.escapeRoomState.objects[0], finalDoorUnlocked: true, showFinalDoor: true, currentStreak: 5, hintsUsed: { p0: true }, xpEarned: 99, puzzleDrafts: { p0: { textInput: 'stale' } }, textInput: 'stale' });
    h.engine.resetEscapeRoom({ replay: true });
    expect(h.state.escapeRoomState).toMatchObject({ isActive: true, isPreview: false, isGameOver: false, selectedObject: null, finalDoorUnlocked: false, showFinalDoor: false, currentStreak: 0, hintsUsed: {}, xpEarned: 0, puzzleDrafts: {}, textInput: '', lives: 3 });
    expect(h.state.escapeRoomState.puzzles[0].question).toBe('Teacher-edited question');
    expect(h.state.escapeTimeLeft).toBe(90);
    expect(h.state.isEscapeTimerRunning).toBe(false);
    expect(h.callGemini).not.toHaveBeenCalled();
  });
  it('hydrates valid saved sequences and rejects malformed saved rooms without replacing the current room', () => {
    const h = withConfig(); const config = roomConfig();
    config.puzzles[0] = { ...config.puzzles[0], type: 'sequence', items: ['Later','Earlier'], correctOrder: [1,0] };
    expect(h.engine.loadEscapeRoomFromConfig({ config, difficulty: 'normal' }, { silent: true })).toBe(true);
    expect(h.state.escapeRoomState.puzzles[0].correctOrder).toEqual([1,0]);
    expect(h.state.escapeRoomState.puzzles[0].shuffledItems.slice().sort()).toEqual([0,1]);
    const current = h.state.escapeRoomState;
    for (const invalid of [{}, { ...config, puzzles: {} }, { ...config, puzzles: [] }, { ...config, objects: [] }, { ...config, puzzles: [null] }]) {
      expect(h.engine.loadEscapeRoomFromConfig({ config: invalid }, { silent: true })).toBe(false);
      expect(h.state.escapeRoomState).toBe(current);
    }
  });
  it('preserves unfinished puzzle drafts without leaking them into another object', () => {
    const h = withConfig(); const [first, second] = h.state.escapeRoomState.objects;
    h.engine.handleSelectObject(first);
    Object.assign(h.state.escapeRoomState, { textInput: 'draft', sequenceOrder: [1,0], matchingPairs: [['Sun','Light']] });
    h.engine.handleSelectObject(second);
    expect(h.state.escapeRoomState).toMatchObject({ textInput: '', sequenceOrder: [], matchingPairs: [] });
    h.engine.handleSelectObject(first);
    expect(h.state.escapeRoomState).toMatchObject({ textInput: 'draft', sequenceOrder: [1,0], matchingPairs: [['Sun','Light']] });
    h.state.escapeRoomState.solvedPuzzles.add('p0'); h.state.escapeRoomState.selectedObject = null;
    h.engine.handleSelectObject(first);
    expect(h.state.escapeRoomState.selectedObject).toBeNull();
  });
  it('does not complete a matching puzzle by counting the same pair twice', () => {
    const h = withConfig(1);
    h.state.escapeRoomState.puzzles[0] = { ...h.state.escapeRoomState.puzzles[0], type: 'matching', pairs: [{left:'Sun',right:'Light'},{left:'Cloud',right:'Water'}] };
    h.engine.handleMatchingSelect('p0','Sun','left'); h.engine.handleMatchingSelect('p0','Light','right');
    h.engine.handleMatchingSelect('p0','Sun','left'); h.engine.handleMatchingSelect('p0','Light','right');
    expect(h.state.escapeRoomState.matchingPairs).toEqual([['Sun','Light']]);
    expect(h.state.escapeRoomState.solvedPuzzles.size).toBe(0);
  });
  it('catches up after delayed timer callbacks, announces thresholds once, and stops at zero', () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const h = withConfig(2, { escapeTimeLeft: 65 });
    const stop = window.AlloModules.startEscapeRoomClock({ ...h.state, ...h.setState, addToast: h.addToast, t });
    vi.advanceTimersByTime(5000); expect(h.state.escapeTimeLeft).toBe(60);
    vi.setSystemTime(35000); vi.advanceTimersByTime(250);
    expect(h.state.escapeTimeLeft).toBe(30);
    vi.advanceTimersByTime(30000);
    expect(h.state.escapeTimeLeft).toBe(0);
    expect(h.state.escapeRoomState).toMatchObject({ isActive: true, isGameOver: true, gameOverReason: 'time' });
    expect(h.state.isEscapeTimerRunning).toBe(false);
    expect(h.addToast.mock.calls.map(call => call[0])).toEqual([t('escape_room.one_minute_warning'),t('escape_room.thirty_seconds_warning'),t('escape_room.game_over_time')]);
    const count=h.addToast.mock.calls.length;vi.advanceTimersByTime(5000);expect(h.addToast).toHaveBeenCalledTimes(count);stop();
  });
  it('freezes the clock when paused and stops it on close/reset', () => {
    vi.useFakeTimers(); const h = withConfig();
    const stop=window.AlloModules.startEscapeRoomClock({ ...h.state, ...h.setState, addToast:h.addToast,t });
    vi.advanceTimersByTime(2000); stop(); h.state.isEscapeTimerRunning=false;
    const paused=h.state.escapeTimeLeft;vi.advanceTimersByTime(60000);expect(h.state.escapeTimeLeft).toBe(paused);
    expect(window.AlloModules.startEscapeRoomClock({ ...h.state, ...h.setState, addToast:h.addToast,t })).toBeUndefined();
    h.engine.resetEscapeRoom();expect(h.state.isEscapeTimerRunning).toBe(false);expect(h.state.escapeRoomState.isActive).toBe(false);
  });
  it('shows and focuses a retry screen instead of dismissing an exhausted room', () => {
    const h = withConfig(2, { escapeRoomState: { isGameOver: true, gameOverReason: 'time' } });
    const container=document.createElement('div');document.body.append(container);root=createRoot(container);
    act(()=>root.render(React.createElement(window.AlloModules.EscapeRoomGameplay,{escapeRoomState:h.state.escapeRoomState,setEscapeRoomState:h.setState.setEscapeRoomState,escapeTimeLeft:0,isEscapeTimerRunning:false,handlers:h.engine,t})));
    expect(document.activeElement.textContent).toBe(t('escape_room.game_over_time'));
    const retry=[...document.querySelectorAll('button')].find(el=>el.textContent===t('escape_room.play_again'));
    act(()=>retry.click());expect(h.state.escapeRoomState.isGameOver).toBe(false);expect(h.state.escapeRoomState.isActive).toBe(true);
  });
  it('connects both host copies to the tested clock and high-score state', () => {
    for (const file of ['AlloFlowANTI.txt','desktop/web-app/src/App.jsx']) {
      const source=fs.readFileSync(file,'utf8');
      expect(source).toContain('window.AlloModules.startEscapeRoomClock');
      expect(source).toContain('generatedContent, leveledTextLanguage, selectedLanguages, completedActivities })');
    }
  });
});