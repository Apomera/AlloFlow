import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMServer, resetStemLab, loadTool, makeCtx } from './helpers/stem_widgets_smoke_harness.js';

const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
function walk(node, predicate, found = []) {
  if (Array.isArray(node)) { node.forEach(n => walk(n, predicate, found)); return found; }
  if (!node || typeof node !== 'object') return found;
  if (predicate(node)) found.push(node);
  if (node.props) walk(node.props.children, predicate, found);
  return found;
}
function session(compare = {}, extra = {}) {
  let store = { rocks: { mode: 'compare', compare, ...extra }, rockCycle: {} };
  const render = () => window.StemLab._registry.rocks.render(makeCtx({
    toolData: store,
    setToolData: update => { store = typeof update === 'function' ? update(store) : update; },
    t: (key, fallback) => key.split('.').reduce((o, part) => o && o[part], strings) || fallback,
  }));
  return {
    get state() { return store.rocks; },
    node: render,
    find: (attr, value) => walk(render(), n => n.props && (value === undefined ? n.props[attr] !== undefined : n.props[attr] === value))[0],
    all: attr => walk(render(), n => n.props && n.props[attr] !== undefined),
    markup: () => ReactDOMServer.renderToStaticMarkup(React.createElement(() => render())),
  };
}

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_rocks.js', 'rocks'); vi.useFakeTimers(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('Rocks & Minerals comparison investigations', () => {
  it('opens distinct specimens and compares texture rather than assigning universal rock hardness', () => {
    const s = session();
    expect(s.find('data-rk-compare-select', 'left').props.value).toBe('granite');
    expect(s.find('data-rk-compare-select', 'right').props.value).toBe('basalt');
    expect(s.all('data-rk-compare-row').map(n => n.props['data-rk-compare-row'])).toContain('formation');
    expect(s.all('data-rk-compare-row').map(n => n.props['data-rk-compare-row'])).not.toContain('hardness');
    expect(s.markup()).not.toMatch(/undefined|NaN/);
  });

  it('swaps the opposite specimen while preserving pair notes and unrelated learning state', () => {
    const s = session({}, { quizScore: 7, fieldCases: { selected: 'roofing-sheets' } });
    s.find('id', 'rk-compare-note').props.onChange({ target: { value: 'Larger crystals suggest slower cooling.' } });
    s.find('data-rk-compare-select', 'left').props.onChange({ target: { value: 'basalt' } });
    expect(s.state.compare).toMatchObject({ left: 'basalt', right: 'granite' });
    expect(s.find('id', 'rk-compare-note').props.value).toBe('Larger crystals suggest slower cooling.');
    expect(s.state.quizScore).toBe(7);
    expect(s.state.fieldCases).toEqual({ selected: 'roofing-sheets' });
  });

  it('keeps independent explanations when learners switch between comparison pairs', () => {
    const s = session();
    s.find('id', 'rk-compare-note').props.onChange({ target: { value: 'First pair explanation.' } });
    s.find('data-rk-compare-preset', 'limestone:marble').props.onClick();
    expect(s.find('id', 'rk-compare-note').props.value).toBe('');
    s.find('id', 'rk-compare-note').props.onChange({ target: { value: 'Marble has recrystallized.' } });
    s.find('data-rk-compare-preset', 'granite:basalt').props.onClick();
    expect(s.find('id', 'rk-compare-note').props.value).toBe('First pair explanation.');
    s.find('data-rk-compare-preset', 'limestone:marble').props.onClick();
    expect(s.find('id', 'rk-compare-note').props.value).toBe('Marble has recrystallized.');
  });

  it('filters catalogue searches without replacing the comparison and recovers from no matches', () => {
    const s = session();
    s.find('id', 'rk-compare-search').props.onChange({ target: { value: '  GRANITE  ' } });
    expect(s.find('data-rk-compare-results').props['data-rk-compare-results']).toBeGreaterThan(0);
    s.find('id', 'rk-compare-search').props.onChange({ target: { value: 'nonexistent-specimen-12345' } });
    expect(s.find('data-rk-compare-results').props['data-rk-compare-results']).toBe(0);
    expect(s.find('data-rk-compare-select', 'left').props.value).toBe('granite');
    expect(s.markup()).toContain('No specimens match');
    s.find('id', 'rk-compare-search').props.onChange({ target: { value: '' } });
    expect(s.find('data-rk-compare-results').props['data-rk-compare-results']).toBe(24);
  });

  it('hides genuinely shared properties and retains diagnostic differences', () => {
    const s = session();
    expect(s.all('data-rk-compare-row').map(n => n.props['data-rk-compare-row'])).toContain('family');
    s.find('data-rk-compare-differences').props.onChange({ target: { checked: true } });
    const rows = s.all('data-rk-compare-row').map(n => n.props['data-rk-compare-row']);
    expect(rows).not.toContain('family');
    expect(rows).toContain('texture');
  });

  it('uses one scratch reference for both minerals and treats equal hardness as uncertain', () => {
    const s = session({ kind: 'minerals', left: 'quartz', right: 'calcite' });
    const results = () => s.all('data-rk-compare-scratch').map(n => n.props['data-rk-compare-scratch']);
    expect(results()).toContain('calcite:scratched');
    expect(results()).not.toContain('quartz:scratched');
    s.find('data-rk-compare-preset', 'pyrite:magnetite').props.onClick();
    s.find('id', 'rk-compare-reference').props.onChange({ target: { value: '6.5' } });
    expect(results()).toContain('pyrite:borderline');
    expect(s.markup()).toContain('retest with another reference');
    expect(s.markup()).not.toMatch(/undefined|NaN/);
  });

  it('uses the shared cleavage translation in the mineral comparison row', () => {
    const original = strings.stem.rocks.brk_kind_rhomb;
    const translated = 'Clivage rhomboédrique traduit';
    expect(typeof original).toBe('string');
    strings.stem.rocks.brk_kind_rhomb = translated;
    try {
      const s = session({ kind: 'minerals', left: 'quartz', right: 'calcite' });
      const row = s.find('data-rk-compare-row', 'cleavage');
      expect(row).toBeTruthy();
      const markup = ReactDOMServer.renderToStaticMarkup(row);
      expect(markup).toContain(translated);
      expect(markup).not.toContain(original);
    } finally {
      strings.stem.rocks.brk_kind_rhomb = original;
    }
  });

  it('switches specimen families with valid defaults while keeping explanations', () => {
    const s = session();
    s.find('id', 'rk-compare-note').props.onChange({ target: { value: 'Saved rock explanation.' } });
    s.find('data-rk-compare-kind', 'minerals').props.onClick();
    expect(s.find('data-rk-compare-select', 'left').props.value).toBe('quartz');
    expect(s.find('data-rk-compare-select', 'right').props.value).toBe('calcite');
    expect(s.all('data-rk-compare-row').map(n => n.props['data-rk-compare-row'])).toContain('cleavage');
    s.find('data-rk-compare-kind', 'rocks').props.onClick();
    expect(s.find('id', 'rk-compare-note').props.value).toBe('Saved rock explanation.');
  });

  it('exports complete reference facts even when differences-only is selected', () => {
    const s = session({ differencesOnly: true });
    const note = '<script>my observation</script> & uncertainty';
    s.find('id', 'rk-compare-note').props.onChange({ target: { value: note } });
    s.find('data-rk-compare-show-report').props.onClick();
    const report = s.find('aria-label', 'Comparison notebook text');
    expect(report.props.readOnly).toBe(true);
    expect(report.props.value).toContain('Rock family');
    expect(report.props.value).toContain('Reference facts (not observations from an unknown specimen)');
    expect(report.props.value).toContain(note);
    expect(s.markup()).not.toContain('<script>my observation</script>');
  });

  it('offers a selectable report when downloading is unavailable', () => {
    const before = URL.createObjectURL;
    URL.createObjectURL = vi.fn(() => { throw new Error('Downloads unavailable'); });
    try {
      const s = session();
      s.find('data-rk-compare-download').props.onClick();
      expect(s.find('aria-label', 'Comparison notebook text').props.value).toContain('Granite');
      expect(s.state.compare.message).toContain('Select and copy');
    } finally { URL.createObjectURL = before; }
  });

  it('recovers invalid restored IDs and opens the selected gallery without erasing notes', () => {
    const s = session({ left: 'missing', right: 'granite', notes: { 'rocks:basalt:granite': 'Keep this.' } });
    const left = s.find('data-rk-compare-select', 'left').props.value;
    const right = s.find('data-rk-compare-select', 'right').props.value;
    expect(left).not.toBe(right);
    expect(s.markup()).not.toMatch(/undefined|NaN/);
    s.find('data-rk-compare-open', left).props.onClick();
    expect(s.state.mode).toBe('rocks');
    expect(s.state.selectedRock).toBe(left);
    expect(s.state.compare.notes['rocks:basalt:granite']).toBe('Keep this.');
  });
});
