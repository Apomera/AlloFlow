import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resetStemLab, loadTool, makeCtx } from './helpers/stem_widgets_smoke_harness.js';

const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
function walk(node, attr, value, out = []) {
  if (Array.isArray(node)) node.forEach(n => walk(n, attr, value, out));
  else if (node && typeof node === 'object' && node.props) {
    if (node.props[attr] !== undefined && (value === undefined || node.props[attr] === value)) out.push(node);
    walk(node.props.children, attr, value, out);
  }
  return out;
}
function session(extra = {}) {
  let data = { rocks: { mode: 'rocks', selectedRock: 'granite', ...extra }, other: { keep: true } };
  const tree = () => window.StemLab._registry.rocks.render(makeCtx({ toolData: data,
    setToolData: fn => { data = typeof fn === 'function' ? fn(data) : fn; },
    t: (key, fallback) => key.split('.').reduce((o, k) => o && o[k], strings) || fallback }));
  const all = (attr, value) => walk(tree(), attr, value);
  const find = (attr, value) => all(attr, value)[0];
  return { all, find, get state() { return data.rocks; }, get data() { return data; },
    step: direction => find('data-rk-detail-step', direction).props.onClick(),
    ids: () => all(data.rocks.mode === 'rocks' ? 'data-rk-grid-tile' : 'data-rk-mineral-tile').map(n => n.props[data.rocks.mode === 'rocks' ? 'data-rk-grid-tile' : 'data-rk-mineral-tile']) };
}
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_rocks.js', 'rocks'); vi.useFakeTimers(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('specimen detail navigation', () => {
  it('follows displayed catalogue order and never wraps at either endpoint', () => {
    const s = session();
    expect(s.find('data-rk-detail-step', 'previous').props.disabled).toBe(true);
    s.step('previous'); expect(s.state.selectedRock).toBe('granite');
    s.step('next'); expect(s.state.selectedRock).toBe('basalt');
    s.step('previous'); expect(s.state.selectedRock).toBe('granite');
    const ids = s.ids(); for (let i = 1; i < ids.length; i++) { s.step('next'); expect(s.state.selectedRock).toBe(ids[i]); }
    expect(s.find('data-rk-detail-step', 'next').props.disabled).toBe(true);
    s.step('next'); expect(s.state.selectedRock).toBe(ids.at(-1));
  });
  it.each(['name', 'hardness', 'density'])('follows mineral %s ordering', sort => {
    const s = session({ mode: 'minerals', selectedMineral: 'quartz', selectedRock: null, catalogue: { minerals: { sort } } });
    const ids = s.ids(), index = ids.indexOf('quartz');
    s.step('next'); expect(s.state.selectedMineral).toBe(ids[index + 1]);
    s.step('previous'); expect(s.state.selectedMineral).toBe('quartz');
    expect(s.state.catalogue.minerals.sort).toBe(sort);
  });
  it('combines family, name sort, search and saved-only filters without changing them', () => {
    const catalogue = { rocks: { query: 'coarse', sort: 'name', savedOnly: true }, minerals: { query: 'quartz', sort: 'density' } };
    const s = session({ selectedType: 'igneous', catalogue, specimenNotes: {
      'rocks:granite': { note: '', question: '', bookmarked: true },
      'rocks:diorite': { note: '', question: 'Coarse crystals?', bookmarked: false },
      'rocks:gabbro': { note: 'Coarse crystals', question: '', bookmarked: false },
      'rocks:marble': { note: 'Coarse crystals', question: '', bookmarked: false } } });
    expect(s.ids()).toEqual(['diorite', 'gabbro', 'granite']);
    s.step('previous'); expect(s.state.selectedRock).toBe('gabbro');
    s.step('previous'); expect(s.state.selectedRock).toBe('diorite');
    expect(s.find('data-rk-detail-step', 'previous').props.disabled).toBe(true);
    expect(s.state.catalogue).toEqual(catalogue); expect(s.state.selectedType).toBe('igneous');
  });
  it('recovers an excluded selection through the first matching result without resetting filters', () => {
    const s = session({ catalogue: { rocks: { query: 'basalt', sort: 'name' } } });
    expect(s.ids()).not.toContain('granite');
    expect(s.find('data-rk-detail-position').props.children).toBe('Outside current filters');
    expect(s.find('data-rk-detail-step', 'next').props.disabled).toBe(true);
    expect(s.find('data-rk-detail-step', 'previous').props.disabled).toBe(true);
    const first = s.ids()[0]; s.find('data-rk-detail-first').props.onClick();
    expect(s.state.selectedRock).toBe(first); expect(s.state.catalogue.rocks.query).toBe('basalt');
  });
  it('handles zero and one matching results with no invalid position or destination', () => {
    const s = session({ catalogue: { rocks: { query: 'unmatchedzz' } } });
    expect(s.find('data-rk-detail-first')).toBeUndefined();
    expect(s.find('data-rk-detail-position').props.children).not.toContain('0 of');
    s.state.catalogue.rocks.query = 'granite'; s.state.catalogue.rocks.savedOnly = true;
    s.state.specimenNotes = { 'rocks:granite': { note: '', question: '', bookmarked: true } };
    expect(s.ids()).toEqual(['granite']);
    expect(s.find('data-rk-detail-position').props.children).toContain('1 of 1');
    expect(s.all('data-rk-detail-step').every(n => n.props.disabled)).toBe(true);
  });
  it('keeps the open study editor when removing its last saved work excludes it', () => {
    const s = session({ catalogue: { rocks: { savedOnly: true } }, specimenNotes: { 'rocks:granite': { note: '', question: '', bookmarked: true } } });
    s.find('data-rk-study-bookmark').props.onClick();
    expect(s.ids()).toEqual([]); expect(s.state.selectedRock).toBe('granite');
    expect(s.find('data-rk-study-note')).toBeTruthy();
    expect(s.find('data-rk-detail-position').props.children).toBe('Outside current filters');
  });
  it('preserves learning work and specimen ownership of existing lab results', () => {
    const s = session({ labFor: 'r:granite', fizzResult: 'saved', specimenNotes: { 'rocks:granite': { note: 'Visible grains', question: '', bookmarked: false } }, quizPractice: { active: true, queue: [2] }, quizScore: 7 });
    const before = structuredClone(s.state); s.step('next');
    expect(s.state).toEqual({ ...before, selectedRock: 'basalt', selectedMineral: null });
    expect(s.data.other).toEqual({ keep: true });
    s.step('previous'); expect(s.find('data-rk-study-note').props.value).toBe('Visible grains');
  });
  it('provides a named landmark, focus destination and visible-name-compatible button names', () => {
    const s = session();
    expect(s.find('data-rk-detail-nav').type).toBe('nav');
    expect(s.find('data-rk-detail-nav').props['aria-label']).toBe('Specimen navigation');
    expect(s.find('id', 'rk-specimen-title').props.tabIndex).toBe(-1);
    expect(s.find('data-rk-detail-step', 'next').props['aria-label']).toBe('Next specimen: Basalt');
    expect(s.find('data-rk-back-to-catalogue', 'rocks')).toBeTruthy();
  });
});
