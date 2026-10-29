import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMServer, resetStemLab, loadTool, makeCtx } from './helpers/stem_widgets_smoke_harness.js';

const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
function walk(node, attr, value, found = []) {
  if (Array.isArray(node)) node.forEach(child => walk(child, attr, value, found));
  else if (node && typeof node === 'object' && node.props) {
    if (node.props[attr] !== undefined && (value === undefined || node.props[attr] === value)) found.push(node);
    walk(node.props.children, attr, value, found);
  }
  return found;
}
function session(extra = {}) {
  let state = { rocks: { mode: 'rocks', selectedRock: 'granite', ...extra }, rockCycle: { selectedType: 'igneous' }, other: { keep: true } };
  const awardXP = vi.fn();
  const tree = () => window.StemLab._registry.rocks.render(makeCtx({
    toolData: state, setToolData: fn => { state = typeof fn === 'function' ? fn(state) : fn; }, awardXP,
    t: (key, fallback) => key.split('.').reduce((o, k) => o && o[k], strings) || fallback,
  }));
  const all = (attr, value) => walk(tree(), attr, value);
  const find = (attr, value) => { const node = all(attr, value)[0]; expect(node, attr + '=' + value).toBeTruthy(); return node; };
  return { tree, all, find, awardXP, get data() { return state; }, get state() { return state.rocks; },
    change: (attr, key, value) => find(attr, key).props.onChange({ target: { value } }),
    click: (attr, key) => find(attr, key).props.onClick(),
    markup: () => ReactDOMServer.renderToStaticMarkup(React.createElement(() => tree())),
  };
}
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_rocks.js', 'rocks'); vi.useFakeTimers(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('personal specimen journal', () => {
  it('starts with an empty, explicitly learner-authored journal', () => {
    const s = session();
    expect(s.find('data-rk-specimen-study', 'rocks:granite')).toBeTruthy();
    expect(s.find('data-rk-study-note').props.value).toBe('');
    expect(s.find('data-rk-study-question').props.value).toBe('');
    expect(s.markup()).toContain('not checked identifications');
    expect(s.state.specimenNotes).toBeUndefined();
  });
  it('keeps observations and questions independently for rocks and minerals', () => {
    const s = session();
    s.change('data-rk-study-note', 'rocks:granite', 'I notice several crystal colors.');
    s.change('data-rk-study-question', 'rocks:granite', 'Which grains are quartz?');
    s.state.mode = 'minerals'; s.state.selectedMineral = 'quartz';
    s.change('data-rk-study-note', 'minerals:quartz', 'Look for its curved fracture.');
    expect(s.state.specimenNotes['rocks:granite']).toEqual({ note: 'I notice several crystal colors.', question: 'Which grains are quartz?', bookmarked: false });
    expect(s.state.specimenNotes['minerals:quartz'].note).toBe('Look for its curved fracture.');
    s.state.mode = 'rocks';
    expect(s.find('data-rk-study-note').props.value).toBe('I notice several crystal colors.');
  });
  it('bookmarks without awarding identification credit and toggles against current state', () => {
    const s = session({ quizScore: 7, collection: { basalt: 'key' }, researchPoints: 20 });
    const toggle = s.find('data-rk-study-bookmark');
    toggle.props.onClick();
    expect(s.state.specimenNotes['rocks:granite'].bookmarked).toBe(true);
    expect(s.find('data-rk-study-bookmark').props['aria-pressed']).toBe(true);
    toggle.props.onClick();
    expect(s.state.specimenNotes).toEqual({});
    expect(s.state.collection).toEqual({ basalt: 'key' });
    expect(s.state.quizScore).toBe(7); expect(s.state.researchPoints).toBe(20);
    expect(s.awardXP).not.toHaveBeenCalled(); expect(s.data.other).toEqual({ keep: true });
  });
  it('keeps writing when a bookmark is removed and omits truly empty records', () => {
    const s = session();
    s.click('data-rk-study-bookmark'); s.change('data-rk-study-note', 'rocks:granite', 'Visible crystals');
    s.click('data-rk-study-bookmark');
    expect(s.state.specimenNotes['rocks:granite'].note).toBe('Visible crystals');
    s.change('data-rk-study-note', 'rocks:granite', '');
    expect(s.state.specimenNotes).toEqual({});
  });
  it('bounds writing and safely displays malformed restored values', () => {
    const s = session({ specimenNotes: { 'rocks:granite': { note: 42, question: [], bookmarked: 'yes' } } });
    expect(s.find('data-rk-study-note').props.value).toBe('');
    expect(s.find('data-rk-study-bookmark').props['aria-pressed']).toBe(false);
    s.change('data-rk-study-note', 'rocks:granite', 'n'.repeat(3001));
    s.change('data-rk-study-question', 'rocks:granite', 'q'.repeat(1001));
    expect(s.state.specimenNotes['rocks:granite'].note).toHaveLength(3000);
    expect(s.state.specimenNotes['rocks:granite'].question).toHaveLength(1000);
  });
  it('renders literal markup as text and associates visible field labels and counts', () => {
    const s = session();
    s.change('data-rk-study-note', 'rocks:granite', '<script>study()</script>');
    expect(s.markup()).not.toContain('<script>study()</script>');
    ['note', 'question'].forEach(field => {
      const input = s.find('data-rk-study-' + field);
      expect(s.find('htmlFor', input.props.id)).toBeTruthy();
      expect(s.find('id', input.props['aria-describedby'])).toBeTruthy();
    });
    expect(s.find('data-rk-study-status').props).toMatchObject({ role: 'status', 'aria-live': 'polite' });
  });
  it('filters journal specimens without treating identification collection entries as bookmarks', () => {
    const s = session({ collection: { basalt: 'key' }, specimenNotes: {
      'rocks:granite': { note: '', question: '', bookmarked: true },
      'rocks:marble': { note: '', question: 'Why sugary crystals?', bookmarked: false },
      'minerals:quartz': { note: 'See fracture', question: '', bookmarked: false },
    } });
    s.find('data-rk-catalogue-saved', 'rocks').props.onChange({ target: { checked: true } });
    expect(s.all('data-rk-grid-tile').map(n => n.props['data-rk-grid-tile'])).toEqual(['granite', 'marble']);
    s.change('data-rk-catalogue-search', 'rocks', 'sugary');
    expect(s.all('data-rk-grid-tile').map(n => n.props['data-rk-grid-tile'])).toEqual(['marble']);
    s.click('data-rk-catalogue-reset', 'rocks');
    expect(s.all('data-rk-grid-tile')).toHaveLength(24);
    expect(s.state.specimenNotes['rocks:granite'].bookmarked).toBe(true);
  });
  it('searches personal questions and keeps the selected editor available outside the filters', () => {
    const s = session({ specimenNotes: { 'rocks:basalt': { note: '', question: 'Try zephyr comparison', bookmarked: false } } });
    s.change('data-rk-catalogue-search', 'rocks', 'zephyr');
    expect(s.all('data-rk-grid-tile').map(n => n.props['data-rk-grid-tile'])).toEqual(['basalt']);
    expect(s.find('data-rk-specimen-study', 'rocks:granite')).toBeTruthy();
    expect(s.find('data-rk-catalogue-selected', 'rocks')).toBeTruthy();
  });
  it('opens the notebook without changing learning or catalogue state', () => {
    const s = session({ catalogue: { rocks: { query: 'quartz', sort: 'name', savedOnly: true } }, quizIdx: 4 });
    s.change('data-rk-study-note', 'rocks:granite', 'Compare crystals');
    s.click('data-rk-study-notebook');
    expect(s.state.mode).toBe('notebook'); expect(s.state.quizIdx).toBe(4);
    expect(s.state.catalogue.rocks).toEqual({ query: 'quartz', sort: 'name', savedOnly: true });
  });
});

describe('look-alike comparison handoffs', () => {
  it.each(['rocks', 'minerals'])('opens the chosen %s pair while preserving writing and source filters', kind => {
    const s = session({ mode: kind, selectedMineral: 'quartz', catalogue: { [kind]: { query: 'mine', sort: 'name', savedOnly: true } },
      compare: { notes: { 'rocks:basalt:granite': 'Keep this evidence.' }, exportText: 'Old pair report', message: 'Old message' } });
    const action = s.find('data-rk-look-compare'), pair = action.props['data-rk-look-compare'].split(':');
    action.props.onClick();
    expect(s.state.mode).toBe('compare');
    expect(s.state.compare).toMatchObject({ kind, left: pair[1], right: pair[2], exportText: '', message: '' });
    expect(s.state.compare.left).not.toBe(s.state.compare.right);
    expect(s.state.compare.notes['rocks:basalt:granite']).toBe('Keep this evidence.');
    expect(s.state.catalogue[kind]).toEqual({ query: 'mine', sort: 'name', savedOnly: true });
  });
});
