// Puzzle Challenge (escape_room_module.js): generation checks, the repair round,
// preview-first live launch, preview editing, and the teacher trial run.
// ESCAPE_ROOM_CANDIDATE=<path> runs these tests against a scratch copy (mutation checks).
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
const en = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8'));
const get = (pack, key) => key.split('.').reduce((o, k) => o?.[k], pack);
const t = (key, params = {}) => {
  let value = get(en, key);
  if (typeof value !== 'string') return value;
  for (const [name, replacement] of Object.entries(params)) value = value.replace('{' + name + '}', replacement);
  return value;
};

// A realistic bad model response: aliases, a string key, a missing order, an answer
// missing from its word bank, a shared object link, a duplicate pair, an unfixable puzzle.
const messyRoom = () => ({
  room: { theme: 'Greenhouse', description: 'Restore the plants.' },
  objects: Array.from({ length: 6 }, (_, i) => ({ id: 'obj' + (i + 1), emoji: 'x', name: 'Object ' + (i + 1) })),
  puzzles: [
    { id: 'p1', type: 'Multiple Choice', linkedObjectId: 'obj1', question: 'What do plants need?', options: ['Sunlight', 'Stone', 'Sunlight', ''], correctIndex: '0', hint: 'Look up.' },
    { id: 'p2', type: 'sequence', linkedObjectId: 'obj2', question: 'Order the stages from first to last.', items: ['Seed', 'Sprout', 'Flower'] },
    { id: 'p3', type: 'fill-in-the-blank', linkedObjectId: 'missing', question: 'Complete it', sentence: 'Plants make food by photosynthesis.', answer: 'photosynthesis', wordbank: ['respiration', 'digestion'] },
    { id: 'p4', type: 'riddle', linkedObjectId: 'obj4', question: 'Solve the riddle', riddle: 'I am green and I catch light.', answer: 'chlorophyll', wordbank: ['chlorophyll', 'water'], revealsClueFor: 'p7', revealedClue: 'gone' },
    { id: 'p5', type: 'scramble', linkedObjectId: 'obj4', question: 'Unscramble the plant part', answer: 'Leaf' },
    { id: 'p6', type: 'matching', linkedObjectId: 'obj6', question: 'Match each part', pairs: [{ left: 'Root', right: 'Water' }, { left: 'Leaf', right: 'Light' }, { left: 'Root', right: 'Soil' }] },
    { id: 'p7', type: 'mcq', linkedObjectId: 'obj5', question: 'Broken key', options: ['A', 'B'], correctIndex: 7 }
  ],
  finalDoor: { sentence: 'Plants turn light into _____.', answer: 'food', wordbank: ['water', 'air'] }
});
const cleanRoom = (count = 3) => ({
  room: { theme: 'Greenhouse', description: 'Restore the plants.' },
  objects: Array.from({ length: count }, (_, i) => ({ id: 'obj' + i, name: 'Object ' + i, emoji: 'x' })),
  puzzles: Array.from({ length: count }, (_, i) => ({ id: 'p' + i, linkedObjectId: 'obj' + i, type: 'mcq', question: 'Plant energy ' + i, options: ['sunlight', 'stone'], correctIndex: 0, hint: 'Think about the sky.' })),
  finalDoor: { sentence: 'Name the process.', answer: 'photosynthesis' }
});
const liveMix = () => {
  const types = ['mcq', 'mcq', 'sequence', 'sequence', 'matching', 'matching', 'fillin', 'fillin', 'cipher', 'scramble'];
  return {
    room: { theme: 'Lab', description: 'Race.' },
    objects: types.map((_, i) => ({ id: 'o' + i, name: 'Object ' + i, emoji: 'x' })),
    puzzles: types.map((type, i) => ({ id: 'p' + i, linkedObjectId: 'o' + i, type, question: 'Question ' + i, options: ['A', 'B', 'C'], correctIndex: 1, items: ['First', 'Second', 'Third'], correctOrder: [0, 1, 2],
      pairs: [{ left: 'L1', right: 'R1' }, { left: 'L2', right: 'R2' }, { left: 'L3', right: 'R3' }], sentence: 'Use _____ here.', encodedText: 'A riddle', answer: 'sunlight', wordbank: ['sunlight', 'rain', 'wind'], hint: 'Hint' }))
  };
};

function makeEngine(extra = {}, responses = null) {
  const state = { inputText: 'Plants use sunlight to make food by photosynthesis.', escapeTimeLeft: 300, isEscapeTimerRunning: false, leveledTextLanguage: 'English',
    escapeRoomState: { isActive: false, puzzleCount: 7, difficulty: 'normal', solvedPuzzles: new Set() }, activeSessionCode: null, activeSessionAppId: 'app', user: { uid: 'host' }, ...extra };
  const queue = responses ? responses.slice() : null;
  const callGemini = vi.fn(async () => { const next = queue ? queue.shift() : JSON.stringify(messyRoom()); if (next instanceof Error) throw next; return next; });
  const updateDoc = vi.fn(async () => {});
  const deps = { getState: () => state, callGemini, t, addToast: vi.fn(), playSound: vi.fn(), handleScoreUpdate: vi.fn(), setGlobalPoints: vi.fn(),
    setState: {
      setEscapeRoomState: value => { state.escapeRoomState = typeof value === 'function' ? value(state.escapeRoomState) : value; },
      setEscapeTimeLeft: value => { state.escapeTimeLeft = typeof value === 'function' ? value(state.escapeTimeLeft) : value; },
      setIsEscapeTimerRunning: value => { state.isEscapeTimerRunning = value; }
    },
    firebase: { db: {}, doc: vi.fn(() => 'session'), updateDoc } };
  return { engine: window.AlloModules.createEscapeRoomEngine(deps), state, ...deps, updateDoc };
}
const toasts = h => h.addToast.mock.calls.map(call => call[0]);
const play = h => { h.engine.confirmEscapeRoomPreview(); h.state.isEscapeTimerRunning = true; };
const solveEvery = h => {
  for (const p of h.state.escapeRoomState.puzzles) {
    if (p.type === 'mcq') h.engine.handleEscapeRoomAnswer(p.id, p.correctIndex);
    if (p.type === 'sequence') h.engine.handleSequenceAnswer(p.id, p.correctOrder);
    if (p.type === 'fillin' || p.type === 'cipher') {
      const word = (p.wordbank || []).find(w => w.toLowerCase() === p.answer.toLowerCase());
      expect(word, p.id + ' answer must be selectable').toBeTruthy();
      h.engine.handleCipherAnswer(p.id, word);
    }
    if (p.type === 'scramble') h.engine.handleScrambleAnswer(p.id, p.answer);
    if (p.type === 'matching') for (const pair of p.pairs) { h.engine.handleMatchingSelect(p.id, pair.left, 'left'); h.engine.handleMatchingSelect(p.id, pair.right, 'right'); }
  }
};

let root;
beforeAll(() => {
  window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const file = process.env.ESCAPE_ROOM_CANDIDATE || 'escape_room_module.js';
  new Function(fs.readFileSync(file, 'utf8'))();
});
afterEach(() => { if (root) act(() => root.unmount()); root = null; document.body.innerHTML = ''; });

describe('Puzzle Challenge room checks', () => {
  it('passes a valid room through unchanged so saved rooms keep their content and score ids', () => {
    const data = cleanRoom();
    const result = window.AlloModules.EscapeRoomData.prepare(data, { requireObjects: true });
    expect(result.ok).toBe(true);
    expect(result.problems).toEqual([]);
    result.puzzles.forEach((p, i) => expect(p).toBe(data.puzzles[i]));
    expect(result.finalDoor).toBe(data.finalDoor);
  });
  it('repairs what it can, removes what cannot be played, and reports both', () => {
    const result = window.AlloModules.EscapeRoomData.prepare(messyRoom(), { expectedCount: 7 });
    const byId = Object.fromEntries(result.puzzles.map(p => [p.id, p]));
    expect(Object.keys(byId)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
    expect(byId.p1).toMatchObject({ type: 'mcq', options: ['Sunlight', 'Stone'], correctIndex: 0 });
    expect(byId.p2.correctOrder).toEqual([0, 1, 2]);
    expect(byId.p3).toMatchObject({ type: 'fillin', sentence: 'Plants make food by _____.' });
    expect(byId.p3.wordbank).toContain('photosynthesis');
    expect(byId.p4).toMatchObject({ type: 'cipher', encodedText: 'I am green and I catch light.' });
    expect(byId.p4).not.toHaveProperty('revealsClueFor');
    expect(byId.p5).toMatchObject({ scrambledWord: 'Leaf' });
    expect(byId.p6.pairs).toEqual([{ left: 'Root', right: 'Water' }, { left: 'Leaf', right: 'Light' }]);
    expect(result.notes.byId).toMatchObject({ p1: ['options_cleaned'], p3: ['blank_added', 'answer_added'], p6: ['pairs_removed', 'few_pairs'] });
    expect(result.problems.join(' ')).toContain('Puzzle 7 ("p7") has no valid correct option.');
    expect(result.problems.join(' ')).toContain('Only 6 of the 7 requested puzzles can be played.');
    expect(result.finalDoor.wordbank).toContain('food');
  });
  it('gives every puzzle its own object and drops objects that hide nothing', () => {
    const result = window.AlloModules.EscapeRoomData.prepare(messyRoom());
    const links = result.puzzles.map(p => p.linkedObjectId);
    expect(new Set(links).size).toBe(links.length);
    expect(result.objects.map(o => o.id).sort()).toEqual(links.slice().sort());
    const short = window.AlloModules.EscapeRoomData.prepare({ ...cleanRoom(3), objects: [{ id: 'obj0', name: 'Only', emoji: 'x' }] });
    expect(short.puzzles).toHaveLength(3);
    expect(new Set(short.puzzles.map(p => p.linkedObjectId)).size).toBe(3);
  });
  it('reads a 1-based sequence order, and refuses ambiguous or impossible ones', () => {
    const one = { id: 's', type: 'sequence', question: 'Oldest first', items: ['A', 'B', 'C'] };
    const check = puzzle => window.AlloModules.EscapeRoomData.prepare({ room: {}, objects: [], puzzles: [puzzle] });
    expect(check({ ...one, correctOrder: [2, 3, 1] }).puzzles[0].correctOrder).toEqual([1, 2, 0]);
    expect(check({ ...one, correctOrder: [2, 3, 1] }).notes.byId.s).toContain('order_renumbered');
    expect(check({ ...one, correctOrder: ['1', '0', '2'] }).puzzles[0].correctOrder).toEqual([1, 0, 2]);
    expect(check({ ...one, correctOrder: [0, 0, 1] }).puzzles).toHaveLength(0);
    expect(check({ ...one, items: ['A', 'a', 'C'] }).puzzles).toHaveLength(0);
    expect(check({ ...one, question: '' }).puzzles).toHaveLength(0);
  });
  it('never opens a sequence already in its solved order', () => {
    for (let i = 0; i < 30; i++) {
      const [p] = window.AlloModules.EscapeRoomData.process([{ id: 's', type: 'sequence', items: ['A', 'B'], correctOrder: [1, 0] }], []);
      expect(p.shuffledItems).not.toEqual(p.correctOrder);
    }
  });
  it('parses JSON wrapped in prose or with trailing commas', () => {
    const parse = window.AlloModules.EscapeRoomData.parse;
    expect(parse('Here is your room:\n{"room":{"theme":"A"},"puzzles":[]}\nEnjoy!')).toEqual({ room: { theme: 'A' }, puzzles: [] });
    expect(parse('```json\n{"puzzles":[1,2,],}\n```')).toEqual({ puzzles: [1, 2] });
    expect(parse('not json')).toBeNull();
  });
});

describe('Puzzle Challenge generation', () => {
  it('repairs once with the specific problems, then every puzzle it keeps can be solved from its own key', async () => {
    const h = makeEngine();
    await h.engine.generateEscapeRoom();
    expect(h.callGemini).toHaveBeenCalledTimes(2);
    expect(h.callGemini.mock.calls[1][0]).toContain('REPAIR: Your previous JSON had these problems');
    expect(h.callGemini.mock.calls[1][0]).toContain('has no valid correct option');
    const room = h.state.escapeRoomState;
    expect(room).toMatchObject({ isPreview: true, isActive: false, isGenerating: false, previewTarget: 'solo', totalPuzzles: 6 });
    expect(room.previewNotes.room).toContainEqual({ code: 'count_short', count: 6, requested: 7 });
    expect(room.savedEscapeRoom.puzzles.every(p => !('linkedObject' in p) && !('shuffledItems' in p))).toBe(true);
    play(h);
    solveEvery(h);
    expect(h.state.escapeRoomState.solvedPuzzles.size).toBe(6);
    h.engine.handleFinalDoorAnswer('food');
    expect(h.state.escapeRoomState.isEscaped).toBe(true);
  });
  it('does not spend a repair call on a clean room or on JSON wrapped in prose', async () => {
    const h = makeEngine({}, ['Sure! ' + JSON.stringify(cleanRoom(7)) + ' Have fun.']);
    await h.engine.generateEscapeRoom();
    expect(h.callGemini).toHaveBeenCalledTimes(1);
    expect(h.state.escapeRoomState).toMatchObject({ isPreview: true, totalPuzzles: 7 });
  });
  it('treats an empty provider answer as an outage: no repair call and no room', async () => {
    const h = makeEngine({}, ['{}']);
    await h.engine.generateEscapeRoom();
    expect(h.callGemini).toHaveBeenCalledTimes(1);
    expect(h.state.escapeRoomState).toMatchObject({ isActive: false, isGenerating: false });
    expect(h.state.escapeRoomState.isPreview).toBeFalsy();
    expect(toasts(h)).toContain(t('errors.generation_failed'));
  });
  it('explains an unusable room instead of showing a generic failure', async () => {
    const broken = JSON.stringify({ room: {}, objects: [], puzzles: [{ id: 'x', type: 'mcq', question: 'Q', options: ['A'], correctIndex: 0 }] });
    const h = makeEngine({}, [broken, broken]);
    await h.engine.generateEscapeRoom();
    expect(h.callGemini).toHaveBeenCalledTimes(2);
    expect(toasts(h)).toContain(t('escape_room.generation_unusable'));
    expect(h.state.escapeRoomState.isPreview).toBeFalsy();
  });
  it('keeps the first result when the repair request fails', async () => {
    const h = makeEngine({}, [JSON.stringify(messyRoom()), new Error('offline')]);
    await h.engine.generateEscapeRoom();
    expect(h.state.escapeRoomState).toMatchObject({ isPreview: true, totalPuzzles: 6 });
  });
  it('ignores a result that arrives after the teacher closed the generator', async () => {
    let finish;
    const h = makeEngine();
    h.callGemini.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = h.engine.generateEscapeRoom();
    h.engine.resetEscapeRoom();
    finish(JSON.stringify(cleanRoom(7)));
    await pending;
    expect(h.state.escapeRoomState).toMatchObject({ isActive: false, room: null });
    expect(h.state.escapeRoomState.isPreview).toBeFalsy();
  });
  it('loads a room saved with a mismatched object link instead of calling it corrupted', () => {
    const h = makeEngine();
    const config = cleanRoom(2);
    config.puzzles[1].linkedObjectId = 'renamed';
    expect(h.engine.loadEscapeRoomFromConfig({ config, difficulty: 'normal' }, { silent: true })).toBe(true);
    expect(h.state.escapeRoomState.puzzles.map(p => p.linkedObject.id)).toEqual(['obj0', 'obj1']);
    expect(toasts(h)).not.toContain(t('escape_room.invalid_save'));
  });
});

describe('Puzzle Challenge live launch goes through the preview', () => {
  const live = (extra = {}, responses) => makeEngine({ activeSessionCode: 'LIVE', ...extra }, responses || [JSON.stringify(liveMix())]);
  it('opens the teacher preview and publishes only the reviewed room, without undefined fields', async () => {
    const h = live();
    await h.engine.launchCollaborativeEscapeRoom();
    expect(h.updateDoc).not.toHaveBeenCalled();
    expect(h.state.escapeRoomState).toMatchObject({ isPreview: true, isActive: false, previewTarget: 'live' });
    h.engine.updateEscapeRoomPuzzle(0, 'question', 'Teacher-edited question');
    expect(await h.engine.publishEscapeRoomLive()).toBe(true);
    const sent = h.updateDoc.mock.calls[0][1].escapeRoomState;
    expect(sent.puzzles[0].question).toBe('Teacher-edited question');
    expect(Object.keys(sent.teamProgress)).toEqual(['Red', 'Blue', 'Green', 'Yellow']);
    const walk = value => { if (value === undefined) throw new Error('undefined in Firestore payload'); if (value && typeof value === 'object') Object.values(value).forEach(walk); };
    expect(() => walk(sent)).not.toThrow();
    expect(h.state.escapeRoomState).toMatchObject({ isPreview: false, isActive: true, previewTarget: null });
  });
  it('asks for the balanced mix in a repair, and accepts a near miss with a note', async () => {
    const lopsided = liveMix();
    lopsided.puzzles[1] = { ...lopsided.puzzles[1], type: 'fillin' };
    const h = live({}, [JSON.stringify(lopsided), JSON.stringify(lopsided)]);
    await h.engine.launchCollaborativeEscapeRoom();
    expect(h.callGemini).toHaveBeenCalledTimes(2);
    expect(h.callGemini.mock.calls[1][0]).toContain('Unbalanced collaborative puzzle mix');
    expect(h.state.escapeRoomState.isPreview).toBe(true);
    expect(h.state.escapeRoomState.previewNotes.room).toContainEqual({ code: 'mix_relaxed' });
  });
  it('reopens a closed preview instead of generating over it', async () => {
    const h = live();
    await h.engine.launchCollaborativeEscapeRoom();
    h.engine.closeEscapeRoomPreview();
    await h.engine.launchCollaborativeEscapeRoom();
    expect(h.callGemini).toHaveBeenCalledTimes(1);
    expect(h.state.escapeRoomState.isPreview).toBe(true);
  });
  it('will not publish over another live activity', async () => {
    const h = live({ sessionData: { quizState: { isActive: true } } });
    await h.engine.launchCollaborativeEscapeRoom();
    expect(await h.engine.publishEscapeRoomLive()).toBe(false);
    expect(h.updateDoc).not.toHaveBeenCalled();
  });
  it('lets the teacher try the live room locally without writing to the session', async () => {
    const h = live({ sessionData: { escapeRoomState: { isActive: false } } });
    await h.engine.launchCollaborativeEscapeRoom();
    h.engine.startEscapeRoomTrial();
    expect(h.state.escapeRoomState).toMatchObject({ isTrial: true, isActive: true, isPreview: false });
    await h.engine.endCollaborativeEscapeRoom();
    expect(h.updateDoc).not.toHaveBeenCalled();
    expect(h.state.escapeRoomState).toMatchObject({ isTrial: false, isPreview: true, previewTarget: 'live' });
  });
});

describe('Puzzle Challenge preview editing and trial run', () => {
  const previewed = async () => { const h = makeEngine(); await h.engine.generateEscapeRoom(); return h; };
  const find = (h, id) => h.state.escapeRoomState.puzzles.findIndex(p => p.id === id);
  it('edits answer keys and keeps the saved copy and word banks consistent', async () => {
    const h = await previewed();
    const mcq = find(h, 'p1'), fill = find(h, 'p3'), seq = find(h, 'p2');
    h.engine.updateEscapeRoomPuzzle(mcq, 'correctIndex', 1);
    h.engine.updateEscapeRoomPuzzle(fill, 'answer', 'photosynthesis!');
    h.engine.updateEscapeRoomPuzzle(fill, 'wordbank', ['respiration']);
    h.engine.updateEscapeRoomPuzzle(seq, 'moveItem', { position: 2, delta: -1 });
    h.engine.updateEscapeRoomPuzzle(seq, 'item', { position: 0, text: 'Tiny seed' });
    const room = h.state.escapeRoomState;
    expect(room.puzzles[mcq].correctIndex).toBe(1);
    expect(room.puzzles[fill].wordbank).toContain('photosynthesis!');
    expect(room.puzzles[fill].wordbank).not.toContain('photosynthesis');
    expect(room.puzzles[seq].correctOrder).toEqual([0, 2, 1]);
    expect(room.puzzles[seq].items[0]).toBe('Tiny seed');
    const saved = room.savedEscapeRoom.puzzles;
    expect(saved[mcq].correctIndex).toBe(1);
    expect(saved[seq].correctOrder).toEqual([0, 2, 1]);
    play(h);
    solveEvery(h);
    expect(h.state.escapeRoomState.solvedPuzzles.size).toBe(room.puzzles.length);
  });
  it('removes a puzzle with its object, but never the last one', async () => {
    const h = await previewed();
    h.engine.removeEscapeRoomPuzzle(0);
    expect(h.state.escapeRoomState.totalPuzzles).toBe(5);
    expect(h.state.escapeRoomState.objects).toHaveLength(5);
    for (let i = 0; i < 10; i++) h.engine.removeEscapeRoomPuzzle(0);
    expect(h.state.escapeRoomState.puzzles).toHaveLength(1);
  });
  it('rewrites one puzzle, keeping its id and object, and keeps it when the rewrite is unusable', async () => {
    const h = await previewed();
    const at = find(h, 'p1');
    h.callGemini.mockResolvedValueOnce(JSON.stringify({ id: 'other', type: 'mcq', linkedObjectId: 'nope', question: 'New question?', options: ['Water', 'Rock'], correctIndex: 0, hint: 'Rain' }));
    expect(await h.engine.regenerateEscapeRoomPuzzle(at)).toBe(true);
    expect(h.state.escapeRoomState.puzzles[at]).toMatchObject({ id: 'p1', question: 'New question?', linkedObjectId: 'obj1' });
    expect(h.state.escapeRoomState.regeneratingPuzzleId).toBeNull();
    h.callGemini.mockResolvedValueOnce(JSON.stringify({ question: 'No key', options: ['A'], correctIndex: 4 }));
    expect(await h.engine.regenerateEscapeRoomPuzzle(at)).toBe(false);
    expect(h.state.escapeRoomState.puzzles[at].question).toBe('New question?');
    expect(toasts(h)).toContain(t('escape_room.regenerate_failed'));
  });
  it('runs a no-XP trial and returns to the preview with edits intact', async () => {
    const h = await previewed();
    h.engine.updateEscapeRoomPuzzle(find(h, 'p1'), 'question', 'Edited before the trial');
    h.engine.startEscapeRoomTrial();
    expect(h.state.escapeRoomState).toMatchObject({ isTrial: true, isActive: true, isPreview: false });
    h.state.isEscapeTimerRunning = true;
    solveEvery(h);
    expect(h.handleScoreUpdate).not.toHaveBeenCalled();
    h.engine.resetEscapeRoom();
    const room = h.state.escapeRoomState;
    expect(room).toMatchObject({ isTrial: false, isPreview: true, isActive: false });
    expect(room.puzzles.find(p => p.id === 'p1').question).toBe('Edited before the trial');
    expect(room.solvedPuzzles.size).toBe(0);
    expect(room.previewNotes.room).toContainEqual({ code: 'count_short', count: 6, requested: 7 });
  });
});

function mountPreview(h, props = {}) {
  let setReact;
  const setRoom = value => { h.setState.setEscapeRoomState(value); if (setReact) setReact(h.state.escapeRoomState); };
  const engine = window.AlloModules.createEscapeRoomEngine({ ...h, setState: { ...h.setState, setEscapeRoomState: setRoom } });
  function Harness() {
    const [room, set] = React.useState(h.state.escapeRoomState);
    setReact = set;
    return React.createElement(window.AlloModules.EscapeRoomDialogs, { escapeRoomState: room, setEscapeRoomState: setRoom, handlers: engine, t, hasSourceOrAnalysis: true, ...props });
  }
  const container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  act(() => root.render(React.createElement(Harness)));
  return engine;
}
const typeInto = (el, value) => act(() => {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
});
const buttonNamed = name => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === name);

describe('Puzzle Challenge preview dialog', () => {
  it('names every field for every puzzle type, and keeps the hint box while it is empty', async () => {
    const h = makeEngine({}, [JSON.stringify(liveMix())]);
    await h.engine.generateEscapeRoom();
    mountPreview(h);
    const fields = [...document.querySelectorAll('[role="dialog"] input, [role="dialog"] select, [role="dialog"] textarea')];
    expect(fields.length).toBeGreaterThan(40);
    expect(fields.every(el => el.getAttribute('aria-label') && !el.getAttribute('aria-label').includes('undefined'))).toBe(true);
    const hint = document.querySelector('[data-preview-puzzle="p0"] input[aria-label$="' + t('escape_room.hint') + '"]');
    typeInto(hint, '');
    const emptyHint = document.querySelector('[data-preview-puzzle="p0"] input[aria-label$="' + t('escape_room.hint') + '"]');
    expect(emptyHint).not.toBeNull();
    expect(emptyHint.closest('[hidden]')).toBeNull();
    typeInto(emptyHint, 'A new hint');
    expect(h.state.escapeRoomState.puzzles[0].hint).toBe('A new hint');
    typeInto(document.querySelector('[data-preview-puzzle="p0"] select'), '2');
    expect(h.state.escapeRoomState.puzzles[0].correctIndex).toBe(2);
  });
  it('asks before discarding, and closing keeps the room for later', async () => {
    const h = makeEngine({}, [JSON.stringify(cleanRoom(7))]);
    await h.engine.generateEscapeRoom();
    mountPreview(h);
    act(() => document.querySelector('[aria-label="' + t('common.discard_preview') + '"]').click());
    expect(document.querySelector('[data-escape-room-discard-confirm]')).not.toBeNull();
    expect(document.activeElement.textContent).toBe(t('escape_room.keep_editing'));
    act(() => document.activeElement.click());
    expect(h.state.escapeRoomState.room).not.toBeNull();
    act(() => document.querySelector('[aria-label="' + t('common.close') + '"]').click());
    expect(h.state.escapeRoomState).toMatchObject({ isPreview: false });
    expect(h.engine.hasEscapeRoomDraft()).toBe(true);
    h.engine.reopenEscapeRoomPreview();
    expect(h.state.escapeRoomState.isPreview).toBe(true);
    h.engine.discardEscapeRoomPreview();
    expect(h.state.escapeRoomState.room).toBeNull();
  });
  it('shows the correct order in the preview and the checks the room needed', async () => {
    const h = makeEngine();
    await h.engine.generateEscapeRoom();
    mountPreview(h);
    const items = [...document.querySelectorAll('[data-preview-puzzle="p2"] ol input')].map(el => el.value);
    expect(items).toEqual(['Seed', 'Sprout', 'Flower']);
    expect(document.querySelector('[data-puzzle-checks="p3"]').textContent).toContain(t('escape_room.check_answer_added'));
    expect(document.querySelector('[data-escape-room-checks]').textContent).toContain(t('escape_room.check_count_short', { count: 6, requested: 7 }));
  });
  it('offers Launch for class only in a live session, disabled while another activity runs', async () => {
    const h = makeEngine({ activeSessionCode: 'LIVE' }, [JSON.stringify(liveMix())]);
    await h.engine.launchCollaborativeEscapeRoom();
    mountPreview(h, { liveSession: true, liveBusy: true });
    const launch = document.querySelector('[data-escape-room-launch-live]');
    expect(launch.textContent).toContain(t('escape_room.launch_live'));
    expect(launch.disabled).toBe(true);
    expect(document.querySelector('[aria-label="' + t('common.confirm_and_launch_escape_room') + '"]')).toBeNull();
  });
});

describe('Host wiring', () => {
  const anti = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
  // Boolean checks: a failing toContain on this 2.8 MB file diffs the whole source and hangs.
  it('never auto-opens the answer-key preview outside teacher mode', () => {
    expect(/const embedded = generatedContent && generatedContent\.data && generatedContent\.data\.escapeRoomConfig;\s*\n\s*if \(!isTeacherMode \|\| !id \|\| !embedded\)/.test(anti), 'embedded room hydrates only in teacher mode').toBe(true);
    expect(anti.includes('{isTeacherMode && escapeRoomState.isPreview && window.AlloModules && window.AlloModules.EscapeRoomDialogs && ('), 'preview dialog mounts only in teacher mode').toBe(true);
  });
  it('passes the live-session state and every engine action to the dialogs', () => {
    expect(anti.includes('liveSession={!!(isTeacherMode && activeSessionCode)}'), 'liveSession prop').toBe(true);
    expect(anti.split('handlers={{...(_getEscapeRoomEngine() || {}),').length - 1).toBe(2);
  });
  it('keeps the public mirror identical', () => {
    expect(fs.readFileSync('desktop/web-app/public/escape_room_module.js', 'utf8') === fs.readFileSync('escape_room_module.js', 'utf8'), 'public mirror matches').toBe(true);
  });
});
