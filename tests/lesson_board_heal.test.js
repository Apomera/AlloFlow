import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import * as e from '../lesson_board_engine.js';
import * as h from '../lesson_board_heal.js';
const require = createRequire(import.meta.url), { makeBoard, source } = require('../dev-tools/fixtures/lesson_board.cjs');
const ninth = () => ({ id: 'mist', name: 'Mist station', conceptId: 'cycle', kind: 'choice', icon: 'water', scene: 'A misty valley.', instruction: 'Which process returns water to the ground?', options: ['Precipitation', 'Evaporation', 'Collection'], answer: 0, explanation: 'Precipitation returns water to the ground.', sourceQuote: 'Precipitation returns water to the ground.', hints: ['Think about rain.', 'Read the lesson.'], reward: [1, 1] });
const nineBoard = () => { const b = makeBoard(); b.locations.push(ninth()); b.edges.push(['rain', 'mist']); return b; };

describe('Tolerant AI reply reading', () => {
  it('reads strict JSON without notes and malformed replies with notes', () => {
    expect(h.readBoardJson(JSON.stringify(makeBoard()))).toMatchObject({ value: makeBoard(), notes: [], truncated: false });
    const messy = "Here is your board!\n```json\n{title: 'Rain', // name\n \"mission\": \u201cGo\u201d, 'list': [1, 2, 3,], ok: True, none: None,}\n```\nEnjoy.";
    const read = h.readBoardJson(messy);
    expect(read.value).toEqual({ title: 'Rain', mission: 'Go', list: [1, 2, 3], ok: true, none: null });
    expect(read.notes).toEqual(expect.arrayContaining(['comments', 'quotes', 'keys', 'commas', 'literals']));
  });
  it('keeps unescaped inner quotes, raw newlines, apostrophes and missing commas', () => {
    const read = h.readBoardJson('{"instruction": "Read "the text" carefully", "scene": "Line one\nLine two"\n"note": \'It\'s here\'}');
    expect(read.value).toEqual({ instruction: 'Read "the text" carefully', scene: 'Line one\nLine two', note: "It's here" });
  });
  it('recovers the complete part of a reply that was cut off', () => {
    const text = JSON.stringify(makeBoard()), cut = text.slice(0, text.indexOf('"id":"cooler"') + 20), read = h.readBoardJson(cut);
    expect(read.truncated).toBe(true);
    expect(read.value.title).toBe(makeBoard().title);
    expect(read.value.locations.slice(0, 6)).toEqual(makeBoard().locations.slice(0, 6));
  });
  it('unwraps boards nested in an object or array', () => {
    expect(h.readBoardJson(JSON.stringify({ board: makeBoard() })).value).toEqual(makeBoard());
    expect(h.readBoardJson(JSON.stringify([makeBoard()])).value).toEqual(makeBoard());
    expect(h.readBoardJson('Board list [draft]: ' + JSON.stringify(makeBoard())).value.title).toBe(makeBoard().title);
  });
  it('refuses replies without an object and never pollutes prototypes', () => {
    for (const text of ['', 'Sorry, I cannot help.', '42']) expect(() => h.readBoardJson(text)).toThrow('could not be read');
    const read = h.readBoardJson('{"__proto__": {"polluted": true}, constructor: 1, "title": "x",}');
    expect({}.polluted).toBeUndefined();
    expect(Object.keys(read.value)).toEqual(['title']);
  });
});

describe('Deterministic board repair', () => {
  it('leaves a valid board unchanged and reports nothing', () => {
    const result = h.healBoard(makeBoard(), source);
    expect(result.fixes).toEqual([]);
    expect(e.prepareBoard(result.board, source)).toEqual(e.prepareBoard(makeBoard(), source));
    const again = h.healBoard(e.prepareBoard({ ...makeBoard(), chance: true }, source), source);
    expect(again.fixes).toEqual([]);
    expect(again.board.chance).toBe(true);
  });
  it('matches paraphrased or restyled quotes to the exact lesson wording, and only then', () => {
    expect(h.groundQuote('\u201cwater vapor condenses when cooled\u201d', source)).toBe('Water vapor condenses when cooled');
    expect(h.groundQuote('When water is heated, it evaporates', source)).toBe('Water evaporates when heated.');
    expect(h.groundQuote('Photosynthesis happens in green leaves.', source)).toBe('');
    const b = makeBoard(); b.locations[0].sourceQuote = 'When water is heated, it evaporates'; b.locations[1].sourceQuote = 'Plants make food from light.';
    const result = h.healBoard(b, source);
    expect(result.fixes).toContain('quotes');
    expect(result.board.locations[0].sourceQuote).toBe('Water evaporates when heated.');
    expect(e.validateBoard(result.board, source)).toEqual(['Quote must match the lesson: cloud']);
  });
  it('repairs ids, references, kinds, answers, hints, rewards, icons and theme', () => {
    const b = makeBoard();
    b.locations[0] = { ...b.locations[0], id: 'Heating Station!', kind: 'multiple-choice', answer: 'Evaporation', hints: 'Think about heat.', reward: [5, -1], icon: 'volcano' };
    b.starts = ['Heating Station!', 'cloud']; b.edges = b.edges.map(edge => edge.map(id => id === 'heater' ? 'Heating Station!' : id));
    b.locations[2] = { ...b.locations[2], answer: 'A' }; b.locations[5] = { ...b.locations[5], order: [3, 4, 1, 2] }; b.theme = 'underwater kingdom';
    const result = h.healBoard(b, source), heater = result.board.locations[0];
    expect(e.validateBoard(result.board, source)).toEqual([]);
    expect(heater).toMatchObject({ id: 'heating-station', kind: 'choice', answer: 1, reward: [3, 0], icon: 'water' });
    expect(heater.hints).toEqual(['Think about heat.', source]);
    expect(result.board.locations[2].answer).toBe(0);
    expect(result.board.locations[5].order).toEqual([2, 3, 0, 1]);
    expect(result.board.starts).toContain('heating-station');
    expect(result.board.theme).toBe('river');
    expect(result.fixes).toEqual(expect.arrayContaining(['ids', 'kinds', 'answers', 'hints', 'rewards', 'icons', 'theme']));
  });
  it('never invents an ordering answer key', () => {
    const b = makeBoard(); delete b.locations[5].order;
    expect(e.validateBoard(h.healBoard(b, source).board, source)).toContain('Invalid ordering activity: sequence');
  });
  it('reconnects stranded places, drops broken or duplicate paths and caps path count', () => {
    const b = makeBoard(); b.edges = [['heater', 'cloud'], ['cloud', 'heater'], ['heater', 'heater'], ['heater', 'ghost'], ['river', 'lake']];
    const result = h.healBoard(b, source);
    expect(e.validateBoard(result.board, source)).toEqual([]);
    expect(result.fixes).toContain('paths');
    const dense = makeBoard(), ids = dense.locations.map(n => n.id); dense.edges = ids.flatMap((a, i) => ids.slice(i + 1).map(c => [a, c]));
    const trimmed = h.healBoard(dense, source).board;
    expect(trimmed.edges.length).toBe(24);
    expect(e.validateBoard(trimmed, source)).toEqual([]);
  });
  it('retargets start shortcuts and rebalances unaffordable projects', () => {
    const b = makeBoard(); b.projects[0].effect.targetId = 'heater'; b.projects.forEach(p => { p.cost = [6, 6]; });
    const result = h.healBoard(b, source);
    expect(e.validateBoard(result.board, source)).toEqual([]);
    expect(result.board.starts).not.toContain(result.board.projects[0].effect.targetId);
    expect(result.fixes).toEqual(expect.arrayContaining(['shortcut', 'balance']));
    const architect = h.healBoard({ ...makeBoard(), goal: 'architect' }, source, { goal: 'architect' });
    expect(e.validateBoard(architect.board, source)).toEqual([]);
  });
  it('keeps grounded discovery cards and drops invented ones', () => {
    const b = { ...makeBoard(), discoveries: [{ id: 'Rain Fact', title: 'Rain returns', text: 'Rain brings water back down.', sourceQuote: 'precipitation returns water to the ground', reward: [4, 0] }, { title: 'Made up', text: 'Clouds are cotton.', sourceQuote: 'Clouds are made of cotton.', reward: [1, 0] }] };
    const result = h.healBoard(b, source);
    expect(result.board.discoveries).toEqual([{ id: 'rain-fact', title: 'Rain returns', text: 'Rain brings water back down.', sourceQuote: 'Precipitation returns water to the ground', reward: [2, 0] }]);
    expect(e.validateBoard(result.board, source)).toEqual([]);
  });
  it('maps field synonyms and near-miss spellings, but never over a real field', () => {
    const b = makeBoard(), heater = b.locations[0];
    b.locations[0] = { id: 'heater', title: heater.name, description: heater.scene, question: heater.instruction, choices: heater.options, correctAnswer: 'Evaporation', why: heater.explanation, evidence: heater.sourceQuote, concept: 'temperature', icon: 'flask', kind: 'choice', clues: heater.hints, rewards: heater.reward };
    b.locations[1] = { ...b.locations[1], instructon: 'Wrong spelling', scen: 'Also misspelled' };
    const result = h.healBoard(b, source);
    expect(e.validateBoard(result.board, source)).toEqual([]);
    expect(result.board.locations[0]).toMatchObject({ name: heater.name, scene: heater.scene, instruction: heater.instruction, options: heater.options, answer: 1, sourceQuote: heater.sourceQuote, conceptId: 'temperature' });
    expect(result.board.locations[1].instruction).toBe(makeBoard().locations[1].instruction);
    expect(result.fixes).toContain('fields');
    const renamed = { ...makeBoard() }; renamed.stops = renamed.locations; delete renamed.locations;
    expect(e.validateBoard(h.healBoard(renamed, source).board, source)).toEqual([]);
  });
  it('matches a damaged concept id only when exactly one concept fits', () => {
    const b = makeBoard(); b.locations[0].conceptId = 'tempera[ture'; b.locations[2].conceptId = 'cyc1e'; b.locations[3].conceptId = 'weather';
    const result = h.healBoard(b, source);
    expect(result.board.locations.map(n => n.conceptId).slice(0, 4)).toEqual(['temperature', 'temperature', 'cycle', 'weather']);
    const ambiguous = makeBoard(); ambiguous.locations[4].conceptId = 'temperature-cycle';
    expect(h.healBoard(ambiguous, source).board.locations[4].conceptId).toBe('temperature-cycle');
  });
  it('recovers stops stranded by a stray bracket and a missing outer brace', () => {
    const text = JSON.stringify(makeBoard()), broken = text.replace(',{"id":"rain"', '],{"id":"rain"');
    const read = h.readBoardJson(broken), healed = h.healBoard(read.value, source);
    expect(read.notes).toContain('orphans');
    expect(healed.fixes).toContain('recovered');
    expect(e.validateBoard(healed.board, source)).toEqual([]);
    const braceless = h.readBoardJson(text.slice(1));
    expect(braceless.value.locations).toHaveLength(8);
    expect(braceless.notes).toContain('braces');
  });
  it('is idempotent', () => {
    const b = makeBoard(); b.locations[3].id = 'Rain Observatory'; b.edges.push(['heater', 'nowhere']); b.projects[1].cost = [9, 9];
    const once = h.healBoard(b, source), twice = h.healBoard(once.board, source);
    expect(twice.fixes).toEqual([]);
    expect(twice.board).toEqual(once.board);
  });
  it('salvages a board by removing a failing location only when enough places remain', () => {
    const nine = nineBoard(); nine.locations[8].sourceQuote = 'Mist is made by dragons.';
    const saved = h.salvageBoard(nine, source);
    expect(saved.removed).toEqual(['Mist station']);
    expect(e.validateBoard(saved.board, source)).toEqual([]);
    const eight = makeBoard(); eight.locations[7].sourceQuote = 'Mist is made by dragons.';
    expect(h.salvageBoard(eight, source)).toBeNull();
  });
  it('opens only drafts that every setup screen can render', () => {
    expect(h.editableDraft(h.healBoard(makeBoard(), source).board)).toBe(true);
    expect(h.editableDraft(h.healBoard({ title: 'x' }, source).board)).toBe(false);
    const b = makeBoard(); b.locations[1].controls = 'Cool';
    expect(h.editableDraft(b)).toBe(false);
  });
});

describe('Resilient generation and refinement', () => {
  it('self-heals malformed JSON and paraphrased quotes without a second AI call', async () => {
    const b = makeBoard(); b.locations[0].sourceQuote = 'water evaporates when HEATED';
    const reply = 'Sure!\n```json\n' + JSON.stringify(b, null, 1).replace(/\n\s*"version"/, '\n "version"').replace(/}\s*]\s*,\s*"projects"/, '},],"projects"') + '\n```', provider = vi.fn().mockResolvedValue(reply);
    const result = await e.createBoard(provider, source, { seed: 'x' });
    expect(provider).toHaveBeenCalledTimes(1);
    expect(result.fixes).toEqual(expect.arrayContaining(['json', 'quotes']));
    expect(result.board.locations[0].sourceQuote).toBe('Water evaporates when heated');
    expect(result.board.chance).toBe(true);
  });
  it('asks for a concise board after a cut-off reply', async () => {
    const text = JSON.stringify(makeBoard()), provider = vi.fn().mockResolvedValueOnce(text.slice(0, text.indexOf('"id":"cooler"'))).mockResolvedValueOnce(text), stage = vi.fn();
    const result = await e.createBoard(provider, source, {}, stage);
    expect(provider).toHaveBeenCalledTimes(2);
    expect(provider.mock.calls[1][0]).toContain('cut off');
    expect(provider.mock.calls[1][0]).toContain('Validation errors');
    expect(result.fixes).not.toContain('truncated');
    expect(stage.mock.calls.flat()).toEqual(['generating', 'repairing']);
  });
  it('makes at most three calls and hands back an editable draft with its remaining problems', async () => {
    const b = makeBoard(); b.locations[0].sourceQuote = 'Invented fact about volcanoes.';
    const provider = vi.fn().mockResolvedValue(JSON.stringify(b));
    const error = await e.createBoard(provider, source).catch(failure => failure);
    expect(provider).toHaveBeenCalledTimes(3);
    expect(error.message).toContain('could not be validated');
    expect(error.errors).toEqual(['Quote must match the lesson: heater']);
    expect(h.editableDraft(error.draft)).toBe(true);
  });
  it('keeps the best draft when the repair request itself fails', async () => {
    const b = makeBoard(); b.locations[0].sourceQuote = 'Invented fact about volcanoes.';
    const provider = vi.fn().mockResolvedValueOnce(JSON.stringify(b)).mockRejectedValueOnce(Error('offline'));
    const error = await e.createBoard(provider, source).catch(failure => failure);
    expect(error.draft.title).toBe(b.title);
    expect(provider).toHaveBeenCalledTimes(2);
  });
  it('salvages the last attempt by dropping a location that stays invented', async () => {
    const nine = nineBoard(); nine.locations[8].sourceQuote = 'Mist is made by dragons.';
    const result = await e.createBoard(vi.fn().mockResolvedValue(JSON.stringify(nine)), source);
    expect(result.removed).toEqual(['Mist station']);
    expect(result.board.locations).toHaveLength(8);
  });
  it('refines a whole board from a teacher request and keeps picture keywords', async () => {
    const board = e.prepareBoard({ ...makeBoard(), chance: true, locations: makeBoard().locations.map(n => ({ ...n, symbol: 'water' })) }, source);
    const revised = makeBoard(); revised.title = 'The Easier Waterworks';
    const provider = vi.fn().mockResolvedValue(JSON.stringify(revised)), stage = vi.fn();
    const result = await e.refineBoard(provider, board, source, 'Make it easier for grade 3', { language: 'English' }, stage);
    expect(provider.mock.calls[0][0]).toContain('Make it easier for grade 3');
    expect(provider.mock.calls[0][0]).toContain('"id":"heater"');
    expect(result.board.title).toBe('The Easier Waterworks');
    expect(result.board.locations.every(n => n.symbol === 'water')).toBe(true);
    expect(result.board.chance).toBe(true);
    expect(stage.mock.calls.flat()).toEqual(['refining']);
    await expect(e.refineBoard(provider, board, source, '  ')).rejects.toThrow('Describe what should change');
  });
  it('refines one location, repairs it once, and never blames it for older problems', async () => {
    const board = e.prepareBoard(makeBoard(), source), next = { ...board.locations[0], name: 'Steam vent', options: ['Condensation', 'Evaporation', 'Collection'], answer: 1 };
    const provider = vi.fn().mockResolvedValueOnce('{"name": "Steam vent", "kind": "choice"}').mockResolvedValueOnce(JSON.stringify({ location: next }));
    const result = await e.refineLocation(provider, board, source, 'heater', 'Use a steam vent setting');
    expect(provider).toHaveBeenCalledTimes(2);
    expect(provider.mock.calls[1][0]).toContain('Validation errors');
    expect(result.board.locations[0].name).toBe('Steam vent');
    expect(result.board.locations.slice(1)).toEqual(board.locations.slice(1));
    const broken = { ...board, locations: board.locations.map(n => n.id === 'river' ? { ...n, sourceQuote: 'Invented.' } : n) };
    const kept = await e.refineLocation(vi.fn().mockResolvedValue(JSON.stringify(next)), broken, source, 'heater', 'Rename it');
    expect(kept.board.locations[0].name).toBe('Steam vent');
    expect(e.validateBoard(kept.board, source)).toEqual(['Quote must match the lesson: river']);
    await expect(e.refineLocation(vi.fn().mockResolvedValue('{"kind":"choice"}'), board, source, 'heater', 'Break it')).rejects.toThrow('board is unchanged');
  });
});
