import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');
function block(name) { const start = '// DINO_VOXEL_' + name + '_START', end = '// DINO_VOXEL_' + name + '_END', a = source.indexOf(start), b = source.indexOf(end, a); if (a < 0 || b < a || source.indexOf(start, a + start.length) >= 0) throw Error('Ambiguous pattern seam'); return source.slice(a, b); }
const modelSource = block('CHECKPOINT_MODEL') + block('PATTERN_MODEL');
const pattern = new Function(modelSource + ';return digVoxelSurveyPattern;')();
function survey(depths = Array(24).fill(0), focus = 0, seed = 1) {
  const columns = depths.map((removed, index) => ({ index, row: Math.floor(index / 6), col: index % 6, coord: String.fromCharCode(65 + index % 6) + (Math.floor(index / 6) + 1), removed, remaining: 4 - removed, status: removed === 0 ? 'covered' : removed === 4 ? 'cleared' : 'partial', shape: null }));
  return { seed, focus, columns, selected: columns[focus] };
}
describe('Dino current excavation pattern', () => {
  it('counts all covered coordinates in zero without inventing an excavation score', () => {
    const result = pattern(survey()); expect(result).toMatchObject({ coordinates: 24, removed: 0, remaining: 96, worked: 0, untouched: 24, selected: { index: 0, coord: 'A1', removed: 0, count: 24 } });
    expect(result.bins.map(b => b.count)).toEqual([24, 0, 0, 0, 0]);
  });
  it('handles every fully excavated coordinate with a conserved total of 96 model layers', () => {
    const result = pattern(survey(Array(24).fill(4), 23)); expect(result).toMatchObject({ removed: 96, remaining: 0, worked: 24, untouched: 0, selected: { coord: 'F4', count: 24, removed: 4 } }); expect(result.bins.map(b => b.count)).toEqual([0, 0, 0, 0, 24]);
  });
  it('conserves coordinate and layer totals across mixed deterministic surveys', () => {
    for (let seed = 1; seed <= 24; seed++) {
      const depths = Array.from({ length: 24 }, (_, i) => (i * 3 + seed) % 5), result = pattern(survey(depths, seed - 1, seed));
      expect(result.bins.reduce((n, b) => n + b.count, 0)).toBe(24); expect(result.bins.reduce((n, b) => n + b.removed * b.count, 0)).toBe(result.removed); expect(result.removed + result.remaining).toBe(96); expect(result.worked + result.untouched).toBe(24);
    }
  });
  it('distinguishes concentrated and distributed excavation with the same layer total', () => {
    const concentrated = pattern(survey(Array.from({ length: 24 }, (_, i) => i < 6 ? 4 : 0))), distributed = pattern(survey(Array(24).fill(1)));
    expect(concentrated.removed).toBe(24); expect(distributed.removed).toBe(24); expect(concentrated.worked).toBe(6); expect(distributed.worked).toBe(24); expect(concentrated.bins).not.toEqual(distributed.bins);
  });
  it('moves exactly one coordinate between bins after a brush and restores it after Undo', () => {
    const before = Array(24).fill(0), after = [...before]; after[7] = 1;
    expect(pattern(survey(after, 7)).bins.map(b => b.count)).toEqual([23, 1, 0, 0, 0]); expect(pattern(survey(before, 7)).bins.map(b => b.count)).toEqual([24, 0, 0, 0, 0]);
  });
  it('links selection to its bin without changing aggregate observations', () => {
    const depths = Array.from({ length: 24 }, (_, i) => i % 5), a = pattern(survey(depths, 0)), b = pattern(survey(depths, 7));
    expect(a.removed).toBe(b.removed); expect(a.bins.map(x => x.count)).toEqual(b.bins.map(x => x.count)); expect(b.bins.filter(x => x.selected).map(x => x.removed)).toEqual([2]); expect(b.selected.count).toBe(b.bins[2].count);
  });
  it('accepts shuffled public records and rejects incomplete, duplicate, mismatched or impossible observations', () => {
    const good = survey(); good.columns.reverse(); expect(pattern(good).coordinates).toBe(24);
    for (const mutate of [s => s.columns.pop(), s => s.columns[1] = s.columns[0], s => s.columns[0].removed = 5, s => s.columns[0].remaining = 0, s => s.selected = { ...s.selected, removed: 2 }, s => s.seed = '1', s => s.columns[0].coord = 'F4']) { const s = survey(); mutate(s); expect(pattern(s)).toBeNull(); }
  });
  it('does not read hidden site or anatomy fields and copies rather than retains mutable input records', () => {
    const s = survey(); for (const object of [s, ...s.columns]) { for (const key of ['burial', 'shape', 'species', 'hasBone']) Object.defineProperty(object, key, { get() { throw Error('Hidden data read'); } }); Object.freeze(object); } Object.freeze(s.columns);
    const result = pattern(s); result.selected.removed = 4; result.bins[0].count = 0; expect(s.columns[0].removed).toBe(0); expect(JSON.stringify(result)).not.toMatch(/burial|shape|species|hasBone/);
  });
});
const React = { createElement(type, props, ...children) { return { type, props: props || {}, children: children.flat(Infinity).filter(x => x != null && x !== false) }; } };
const helpers = new Function(modelSource + block('PATTERN_UI') + ';return {chart:renderDinoDigSurveyPattern,cell:renderDinoDigSurveyCellDepth};')();
const T = { text: '#142132', soft: '#475467', border: '#98a2b3', panel: '#fff', deeper: '#eef2f6' };
function nodes(t) { return t && typeof t === 'object' ? [t, ...t.children.flatMap(nodes)] : []; }
function textOf(t) { return t && typeof t === 'object' ? t.children.map(textOf).join(' ') : String(t ?? ''); }
function chart(s = survey()) { return helpers.chart(React, { survey: s, T }); }
describe('Dino depth tiles and fixed-scale distribution', () => {
  it('draws exactly four ordered depth blocks and a visible removal fraction without duplicating the button accessible name', () => {
    for (let removed = 0; removed <= 4; removed++) {
      const cell = helpers.cell(React, { removed }); expect(cell.props['aria-hidden']).toBe('true'); expect(textOf(cell)).toContain(removed + '/4');
      const blocks = nodes(cell).filter(n => n.props['data-dig-map-layer']); expect(blocks.map(n => n.props['data-dig-map-layer'])).toEqual([1, 2, 3, 4]); expect(blocks.filter(n => n.props['data-dig-map-layer-removed'] === 'true')).toHaveLength(removed);
    }
    for (const removed of [-1, 5, '1', NaN]) expect(helpers.cell(React, { removed })).toBeNull();
  });
  it('keeps the chart optional, explains the depth strip and identifies what the chart counts', () => {
    const tree = chart(), all = nodes(tree); expect(all.find(n => n.type === 'details').props.open).toBeUndefined(); expect(textOf(tree)).toContain('original top at left to bottom at right'); expect(textOf(tree)).toContain('chart counts coordinates, not fossils'); expect(textOf(tree)).toContain('Equal layer totals');
  });
  it('uses the same zero-to-24 coordinate scale for covered, distributed and mixed states including zero bins', () => {
    for (const s of [survey(), survey(Array(24).fill(1)), survey(Array.from({ length: 24 }, (_, i) => i % 5))]) {
      const tree = chart(s), bins = nodes(tree).filter(n => n.props['data-dig-pattern-bin'] != null); expect(bins).toHaveLength(5);
      for (const bin of bins) { const bar = bin.children.find(n => n.type === 'rect'); expect(bar.props.height).toBe(bin.props['data-dig-pattern-count'] * 5); expect(bar.props.y + bar.props.height).toBe(152); }
    }
  });
  it('links exactly one visual bin to the selected coordinate and supplies every count as text', () => {
    const s = survey(Array.from({ length: 24 }, (_, i) => i % 5), 7), tree = chart(s), all = nodes(tree);
    expect(all.filter(n => n.props['data-dig-pattern-selected'] === 'true').map(n => n.props['data-dig-pattern-bin'])).toEqual([2]); expect(textOf(tree)).toContain('Selected B2: 2/4');
    const image = all.find(n => n.type === 'svg'); expect(image.props.role).toBe('img'); for (const b of pattern(s).bins) expect(image.props['aria-label']).toContain(b.removed + ' layers removed: ' + b.count + ' coordinates');
  });
  it('omits invalid or Find-view charts and remains a read-only visualization', () => {
    expect(helpers.chart(React, { survey: null, T })).toBeNull(); expect(helpers.chart(React, { survey: survey(), T, findMode: true })).toBeNull(); expect(helpers.chart(React, { survey: survey() })).toBeNull(); expect(nodes(chart()).some(n => n.type === 'button' || n.type === 'input')).toBe(false);
  });
  it('registers all eight phrases in both English registries', () => {
    const phrases = [...block('PATTERN_UI').matchAll(/surveyPatternText\(props,'([^']+)','([^']+)'/g)]; expect(phrases).toHaveLength(8);
    for (const path of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) { const registry = JSON.parse(readFileSync(path, 'utf8')).stem.dinolab; for (const m of phrases) expect(registry['pattern_' + m[1]]).toBe(m[2]); }
  });
});
const renderSurvey = new Function(modelSource + block('PATTERN_UI') + block('SURVEY_UI') + ';return renderDinoDigSurvey;')();
describe('Dino survey map integration', () => {
  it('keeps all 24 native coordinate controls, full accessible names and one selected tab stop while adding 96 blocks', () => {
    const tree = renderSurvey(React, { survey: survey(), T, onSelect() {} }), all = nodes(tree), buttons = all.filter(n => n.props['data-dig-survey-cell'] != null);
    expect(buttons).toHaveLength(24); expect(buttons.filter(n => n.props.tabIndex === 0)).toHaveLength(1); expect(buttons.every(n => n.props['aria-label'].includes('Select only.'))).toBe(true); expect(all.filter(n => n.props['data-dig-map-layer'] != null)).toHaveLength(96);
    expect(all.find(n => n.props.className === 'dinolab-survey-map').props['aria-describedby']).toContain('dino-survey-depth-hint');
  });
  it('continues to select coordinates without changing excavation or adding a second answer/navigation state', () => {
    const s = survey(), before = JSON.stringify(s), selected = [], tree = renderSurvey(React, { survey: s, T, onSelect: value => selected.push(value) });
    nodes(tree).filter(n => n.props['data-dig-survey-cell'] != null).forEach(n => n.props.onClick()); expect(selected).toEqual(Array.from({ length: 24 }, (_, i) => i)); expect(JSON.stringify(s)).toBe(before);
  });
});
