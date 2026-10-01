import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import * as e from '../lesson_board_engine.js';
import * as h from '../lesson_board_heal.js';
import * as s from '../lesson_board_support.js';
import * as q from '../lesson_board_quality.js';
import * as m from '../lesson_board_symbols.js';
const require = createRequire(import.meta.url), { makeBoard, source } = require('../dev-tools/fixtures/lesson_board.cjs');
const url = word => 'https://globalsymbols.com/symbols/' + word + '.svg';
const png = 'data:image/png;base64,' + 'A'.repeat(4000);

describe('Picture symbols', () => {
  it('searches the English keyword first, then the longest words of the place name', () => {
    expect(m.symbolQueries({ name: 'Heating station', symbol: 'Fire' }, 'Spanish')).toEqual([{ query: 'fire', language: 'English' }, { query: 'heating', language: 'Spanish' }]);
    expect(m.symbolQueries({ name: 'Estaci\u00f3n de lluvia' }, 'Spanish')).toEqual([{ query: 'estaci\u00f3n', language: 'Spanish' }, { query: 'lluvia', language: 'Spanish' }]);
  });
  it('finds one symbol per place, skips unsafe links and reports network failures', async () => {
    const board = e.prepareBoard(makeBoard(), source);
    const search = vi.fn(async query => ({ symbols: query === 'cloud' ? [] : [{ svgUrl: 'javascript:alert(1)' }, { svgUrl: url(query), label: query }], error: '' }));
    const found = await m.findBoardSymbols(board, search, { language: 'English' });
    expect(Object.keys(found.picks)).toHaveLength(10);
    expect(found.missing).toEqual(['cloud']);
    expect(found.picks.heater).toEqual({ src: url('heating'), label: 'heating' });
    await expect(m.findBoardSymbols(board, async () => ({ symbols: [], error: 'network' }))).rejects.toMatchObject({ code: 'symbol-network' });
  });
  it('stores symbols as links keyed by place, with a credit, and removes them cleanly', () => {
    const board = e.prepareBoard(makeBoard(), source), picks = Object.fromEntries([...board.locations, ...board.projects].map(item => [item.id, { src: url(item.id) }]));
    const support = m.withSymbols(s.emptySupport(), board, picks, 'Mulberry credit');
    expect(Object.keys(support.art.symbols)).toHaveLength(11);
    expect(m.symbolOf(support, 'heater')).toBe(url('heater'));
    expect(support.art.symbolCredit).toBe('Mulberry credit');
    expect(s.hasSupport(support)).toBe(true);
    const fewer = m.withoutSymbols(support, board, ['heater']);
    expect(m.symbolOf(fewer, 'heater')).toBe('');
    expect(Object.keys(fewer.assets)).toHaveLength(10);
    expect(m.withoutSymbols(support, board).art.symbols).toBeUndefined();
    expect(Object.keys(m.withoutSymbols(support, board).assets)).toHaveLength(0);
  });
  it('allows many linked symbols but still caps embedded pictures', () => {
    const board = e.prepareBoard(makeBoard(), source), raw = { ...s.emptySupport(), assets: {}, art: { projects: {}, symbols: {} } };
    [...board.locations, ...board.projects].forEach(item => { raw.assets['symbol_' + item.id] = url(item.id); raw.art.symbols[item.id] = 'symbol_' + item.id; });
    expect(Object.keys(s.prepareSupport(raw, board).assets)).toHaveLength(11);
    const terms = Array.from({ length: 12 }, (_, i) => ({ id: 'term_' + i, term: 'Term ' + i, def: 'Meaning ' + i, imageId: 'img_' + i })), assets = Object.fromEntries(terms.map((term, i) => [term.imageId, png + i]));
    const heavy = { ...s.emptySupport(), terms, assets: { ...assets, a: png + 'a', b: png + 'b', c: png + 'c', d: png + 'd', e: png + 'e' }, art: { projects: { bridge: 'a', research: 'b', network: 'c' }, world: 'd' } };
    expect(() => s.prepareSupport(heavy, board)).not.toThrow();
    expect(() => s.prepareSupport({ ...heavy, art: { ...heavy.art, symbols: { heater: 'e' } } }, board)).toThrow('board-support-invalid');
  });
  it('sends linked symbols to a live session unchanged and budgets only embedded pictures', async () => {
    const board = e.prepareBoard(makeBoard(), source), picks = Object.fromEntries(board.locations.map(item => [item.id, { src: url(item.id) }]));
    const withArt = s.addSupportImage(m.withSymbols(s.emptySupport(), board, picks), 'data:image/png;base64,QUJD', 'world', board);
    const resize = vi.fn(async (value, budget) => { expect(budget).toBeGreaterThan(20000); return value; });
    const live = await s.liveSupport(withArt, board, resize);
    expect(resize).toHaveBeenCalledTimes(1);
    expect(m.symbolOf(live.support, 'cloud')).toBe(url('cloud'));
    expect(live.omitted).toBe(0);
  });
});

describe('Vocabulary symbols and repair progress', () => {
  const terms = () => ({ ...s.emptySupport(), terms: [{ id: 'vapor', term: 'Water vapor', def: 'Water as a gas.', locations: ['heater'] }, { id: 'rain', term: 'Rain', def: 'Falling water.', locations: [], imageId: 'png', alt: '' }], assets: { png: 'data:image/png;base64,QUJD' } });
  it('searches the whole term first, then its words, then English', async () => {
    expect(m.termQueries('Water vapor', 'Spanish')).toEqual([{ query: 'water vapor', language: 'Spanish' }, { query: 'water', language: 'Spanish' }, { query: 'vapor', language: 'Spanish' }, { query: 'water vapor', language: 'English' }]);
    const search = vi.fn(async (query, options) => ({ symbols: options.language === 'English' ? [{ svgUrl: url(query.replace(' ', '-')), label: query }] : [], error: '' }));
    expect((await m.searchTerm('Water vapor', search, { language: 'Spanish' })).symbols[0].svgUrl).toBe(url('water-vapor'));
    expect(search).toHaveBeenCalledTimes(4);
  });
  it('gives words without pictures a credited symbol and drops the credit when replaced', async () => {
    const board = e.prepareBoard(makeBoard(), source), search = vi.fn(async query => ({ symbols: [{ svgUrl: url(query.replace(' ', '-')) }], error: '' }));
    const found = await m.findTermSymbols(terms(), search, { language: 'English' });
    expect(found).toEqual({ picks: { vapor: { src: url('water-vapor'), label: 'Water vapor' } }, missing: [] });
    const next = m.withTermSymbol(s.prepareSupport(terms(), board), board, 'vapor', found.picks.vapor, 'Mulberry credit');
    expect(next.terms[0]).toMatchObject({ symbol: true, alt: 'Water vapor' });
    expect(next.assets[next.terms[0].imageId]).toBe(url('water-vapor'));
    expect(m.hasSymbols(next)).toBe(true);
    expect(next.art.symbolCredit).toBe('Mulberry credit');
    const replaced = s.addSupportImage(next, 'data:image/png;base64,REVG', 'term:vapor', board);
    expect(replaced.terms[0].symbol).toBeUndefined();
    expect(m.hasSymbols(replaced)).toBe(false);
    expect(replaced.art.symbolCredit).toBeUndefined();
    expect(() => m.withTermSymbol(next, board, 'missing', found.picks.vapor)).toThrow('board-image-target');
  });
  it('reports each repair attempt with the problems left', async () => {
    const bad = makeBoard(); bad.locations[0].sourceQuote = 'Invented volcano fact.';
    const progress = vi.fn(), provider = vi.fn().mockResolvedValueOnce('no json here').mockResolvedValueOnce(JSON.stringify(bad)).mockResolvedValueOnce(JSON.stringify(makeBoard()));
    await e.createBoard(provider, source, { onProgress: progress });
    expect(progress.mock.calls.map(call => call[0])).toEqual([{ attempt: 2, attempts: 3, problems: 0, unreadable: true }, { attempt: 3, attempts: 3, problems: 1, truncated: false }]);
  });
});

describe('Teacher review tools', () => {
  it('keeps a valid excerpt that spans a line break exactly as written', () => {
    const b = makeBoard(); b.locations[0].sourceQuote = 'Water evaporates\nwhen heated.';
    const healed = h.healBoard(b, source);
    expect(healed.fixes).toEqual([]);
    expect(healed.board.locations[0].sourceQuote).toBe('Water evaporates\nwhen heated.');
  });
  it('flags answer-position patterns and spreads them without changing any answer', () => {
    const board = e.prepareBoard(makeBoard(), source);
    expect(q.boardQuality(board, source).map(item => item.code)).toEqual(['position']);
    const spread = q.balanceAnswerPositions(board);
    expect(e.validateBoard(spread, source)).toEqual([]);
    for (const node of board.locations.filter(item => item.kind === 'choice')) {
      const next = spread.locations.find(item => item.id === node.id);
      expect(next.options[next.answer]).toBe(node.options[node.answer]);
      expect([...next.options].sort()).toEqual([...node.options].sort());
    }
    expect(q.boardQuality(spread, source).map(item => item.code)).toEqual([]);
    expect(q.balanceAnswerPositions(spread)).toEqual(q.balanceAnswerPositions(spread));
  });
  it('flags length cues, repeated instructions, heavy reading and validation problems by stop', () => {
    const b = makeBoard();
    for (const node of b.locations.filter(item => item.kind === 'choice')) node.options = node.options.map((option, index) => index === node.answer ? option + ' because of the lesson evidence' : option);
    b.locations[1].instruction = b.locations[0].instruction; b.locations[2].scene = 'x'.repeat(420); b.locations[2].instruction = 'y'.repeat(300); b.locations[3].sourceQuote = 'Invented.';
    const codes = q.boardQuality(b, source);
    expect(codes.map(item => item.code)).toEqual(expect.arrayContaining(['validation', 'length', 'repeat', 'reading']));
    expect(codes.find(item => item.code === 'validation').stopId).toBe('rain');
  });
  it('summarizes what a refinement changed', () => {
    const before = makeBoard(), after = makeBoard(); after.locations[0].name = 'Steam vent'; after.locations.pop(); after.title = 'New';
    expect(q.boardChanges(before, after)).toEqual({ changed: ['Steam vent'], added: [], removed: ['Weather laboratory'], projects: false, story: true });
    expect(q.fixGroups(['json', 'quotes', 'balance', 'unknown'])).toEqual(['reply', 'quotes', 'economy']);
  });
});
