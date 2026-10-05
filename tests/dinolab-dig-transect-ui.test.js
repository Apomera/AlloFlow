import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
const mirrorSource = readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function bounded(text, marker) {
  const a = text.indexOf('// ' + marker + '_START'), b = text.indexOf('// ' + marker + '_END', a);
  if (a < 0 || b <= a) throw new Error('Missing shipped Dino transect helper: ' + marker);
  return text.slice(a, b);
}
const modelSource = bounded(source, 'DINO_VOXEL_DIG_TRANSECT');
const helperSource = bounded(source, 'DINO_VOXEL_TRANSECT_UI');
const coverColors = ['#9c7244', '#b0804f', '#76543b', '#514a40'];
const renderObservatory = new Function('DIG_VOXEL_COVER_COLORS', modelSource + '\n' + helperSource + '\nreturn renderDinoDigObservatory;')(coverColors);
const english = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.dinolab;
const mirror = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8')).stem.dinolab;
const T = { panel: '#ffffff', deeper: '#eee7db', text: '#181511', soft: '#595044', border: '#b9ad9b' };
const React = { createElement(type, props, ...children) { return { type, props: props || {}, children: children.flat(Infinity).filter(child => child !== null && child !== undefined && child !== false) }; } };
function nodes(tree) { return tree && typeof tree === 'object' ? [tree, ...tree.children.flatMap(nodes)] : []; }
function byId(tree, id) { return nodes(tree).find(node => node.props.id === id); }
function withAttr(tree, name) { return nodes(tree).filter(node => node.props[name] !== undefined); }
function text(tree) {
  if (tree === null || tree === undefined || tree === false) return '';
  if (typeof tree !== 'object') return String(tree);
  if (tree.type === 'style' || tree.props.hidden || tree.props['aria-hidden'] === 'true') return '';
  return tree.children.map(text).join(' ').replace(/\s+/g, ' ').trim();
}
function section(row = 1, focus = row * 6 + 2, depths = [0,1,2,3,4,1]) {
  const statuses = ['covered', 'partial', 'contact', 'exposed', 'cleared', 'partial'];
  const columns = depths.map((removed, col) => ({ index: row * 6 + col, coord: String.fromCharCode(65 + col) + (row + 1), removed, remaining: 4 - removed,
    status: removed === 0 ? 'covered' : removed === 4 ? 'cleared' : statuses[col] === 'contact' ? 'contact' : statuses[col] === 'exposed' && removed >= 2 ? 'exposed' : 'partial',
    layers: [1,2,3,4].map(level => ({ level, removed: level <= removed })) }));
  const finds = columns.filter(column => ['contact', 'exposed'].includes(column.status)).map(column => ({ index: column.index, coord: column.coord, row, col: column.index % 6, removed: column.removed, status: column.status, level: column.removed }));
  return { row, focus, coord: String.fromCharCode(65 + focus % 6) + (row + 1), columns, finds };
}
function translate(key, fallback) {
  expect(key.startsWith('stem.dinolab.section_')).toBe(true);
  expect(english[key.slice('stem.dinolab.'.length)], key).toBe(fallback);
  return fallback;
}
function panel(value = section(), extras = {}) { return renderObservatory(React, { section: value, focus: value?.focus, T, translate, onSelect() {}, ...extras }); }
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
function comparable(value) { if (typeof value === 'function') return '[function]'; if (Array.isArray(value)) return value.map(comparable); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, comparable(child)])); return value; }

describe('shipped Dino linked row-transect observatory', () => {
  it('gives the scrolling observed-find list a native keyboard focus target and accessible name', () => {
    const tree = panel(), list = nodes(tree).find(node => node.type === 'ul' && node.props.className === 'dinolab-section-find-list');
    expect(list.props.tabIndex).toBe(0);
    expect(list.props['aria-label']).toBe('Observed find context');
    expect(nodes(tree).find(node => node.type === 'style').children.join('')).toContain('.dinolab-section-find-list:focus-visible{outline:3px solid ' + T.text);
  });

  it('ships the same bounded helper and twelve exact registered fallback phrases in both mirrors', () => {
    expect(bounded(mirrorSource, 'DINO_VOXEL_TRANSECT_UI')).toBe(helperSource);
    const calls = [...helperSource.matchAll(/st\('(transect_[^']+)', ('(?:\\.|[^'\\])*')/g)];
    const keys = [...new Set(calls.map(match => 'section_' + match[1]))];
    expect(keys).toHaveLength(12);
    for (const [, suffix, literal] of calls) {
      const key = 'section_' + suffix;
      expect(english[key], key).toBe(new Function('return ' + literal + ';')());
      expect(mirror[key], key).toBe(english[key]);
    }
  });

  it('retains the selected-column accessible name and adds every row-wide numeric/status observation', () => {
    const tree = panel(), profile = byId(tree, 'dino-section-profile');
    expect(profile.props.role).toBe('img'); expect(profile.props.focusable).toBe('false');
    expect(profile.props['aria-label']).toMatch(/^C2: 2 of 4 simulation layers removed; 2 remain\. Contact recorded/);
    expect(profile.props['aria-label']).toContain('Row 2, A2 to F2, aligned at the original top.');
    const entries = withAttr(tree, 'data-dig-transect-summary');
    expect(entries).toHaveLength(6);
    for (let col = 0; col < 6; col++) {
      const column = section().columns[col];
      expect(text(entries[col])).toContain(`${column.coord}: ${column.removed}/4 removed; ${column.remaining} remain.`);
      expect(profile.props['aria-label']).toContain(text(entries[col]));
    }
  });

  it('renders precisely six aligned column groups and twenty-four original cover cells', () => {
    const tree = panel(), groups = withAttr(byId(tree, 'dino-section-profile'), 'data-dig-transect-column');
    expect(groups.map(node => node.props['data-dig-transect-column'])).toEqual([6,7,8,9,10,11]);
    expect(withAttr(tree, 'data-dig-transect-level')).toHaveLength(24);
    for (const group of groups) {
      const levels = withAttr(group, 'data-dig-transect-level');
      expect(levels.map(node => node.props['data-dig-transect-level'])).toEqual([1,2,3,4]);
      expect(levels.map(node => node.props.y)).toEqual([62,97,132,167]);
    }
  });

  it('uses dashed empty removed cells and solid opaque remaining cover in the existing top-to-bottom colors', () => {
    const tree = panel();
    for (const group of withAttr(tree, 'data-dig-transect-column')) {
      const removed = group.props['data-dig-transect-removed'];
      const levels = withAttr(group, 'data-dig-transect-level');
      expect(levels.filter(node => node.props['data-dig-transect-layer-removed'] === 'true')).toHaveLength(removed);
      levels.forEach((node, level) => {
        expect(node.props.fill).toBe(level < removed ? T.deeper : coverColors[level]);
        expect(node.props.strokeDasharray).toBe(level < removed ? '4 3' : undefined);
        expect(node.props.opacity).toBeUndefined();
      });
    }
  });

  it('aligns the dashed original datum and draws the exact stepped current surface from observed counts', () => {
    const tree = panel(), datum = withAttr(tree, 'data-dig-transect-datum')[0], surface = withAttr(tree, 'data-dig-transect-surface')[0];
    expect(datum.props.d).toBe('M28 62H325'); expect(datum.props.strokeDasharray).toBe('5 4');
    expect(surface.props.d).toBe('M32 62H75H77.5V97H80H123H125.5V132H128H171H173.5V167H176H219H221.5V202H224H267H269.5V97H272H315');
    expect(surface.props.strokeDasharray).toBeUndefined(); expect(surface.props.fill).toBe('none');
  });

  it('shows one selected-column outline and moves it without changing any observed cover count', () => {
    const value = freeze(section()), before = JSON.stringify(value);
    const left = panel(value, { focus: 6 }), right = panel(value, { focus: 11 });
    expect(withAttr(left, 'data-dig-transect-selected').map(node => node.props['data-dig-transect-selected'])).toEqual([6]);
    expect(withAttr(right, 'data-dig-transect-selected').map(node => node.props['data-dig-transect-selected'])).toEqual([11]);
    expect(withAttr(left, 'data-dig-transect-surface')[0].props.d).toBe(withAttr(right, 'data-dig-transect-surface')[0].props.d);
    expect(JSON.stringify(value)).toBe(before);
  });

  it('places only recorded contact/exposed markers at the current observed surface', () => {
    const markers = withAttr(panel(), 'data-dig-transect-marker');
    expect(markers.map(node => [node.props['data-dig-transect-marker-column'], node.props['data-dig-transect-marker']])).toEqual([[8,'contact'], [9,'exposed']]);
    expect(markers.map(node => node.children[0].props.transform)).toEqual(['translate(149.5 132) scale(0.8)', 'translate(197.5 167) scale(0.8)']);
    expect(withAttr(panel(section(0, 0, [0,0,0,0,0,0])), 'data-dig-transect-marker')).toEqual([]);
  });

  it('does not turn outside-row site finds into markers on this row profile', () => {
    const value = section();
    value.finds.push({ index: 23, coord: 'F4', row: 3, col: 5, removed: 4, status: 'exposed', level: 4 });
    const tree = panel(value);
    expect(withAttr(tree, 'data-dig-transect-marker').map(node => node.props['data-dig-transect-marker-column'])).toEqual([8,9]);
    expect(withAttr(tree, 'data-dig-observed-find').map(node => node.props['data-dig-observed-find'])).toContain(23);
  });

  it('does not use conflicting find offsets or levels to move the row markers', () => {
    const value = section(), initial = withAttr(panel(value), 'data-dig-transect-marker').map(node => node.children[0].props.transform);
    value.finds = value.finds.map(find => ({ ...find, level: -99, removed: 999 }));
    expect(withAttr(panel(value), 'data-dig-transect-marker').map(node => node.children[0].props.transform)).toEqual(initial);
  });

  it('highlights precisely the selected full row on the site plan for all four rows', () => {
    for (let row = 0; row < 4; row++) {
      const tree = panel(section(row)), locator = withAttr(byId(tree, 'dino-section-plan'), 'data-dig-transect-plan-row');
      expect(locator).toHaveLength(1); expect(locator[0].props['data-dig-transect-plan-row']).toBe(row);
      expect(locator[0].props.y).toBe(26 + row * 40); expect(locator[0].props.width).toBe(296); expect(locator[0].props.height).toBe(42);
      expect(locator[0].props.fill).toBe('none'); expect(locator[0].props.strokeDasharray).toBe('6 4');
    }
  });

  it('preserves six native row selectors that only select and never invoke excavation callbacks', () => {
    const selected = [], forbidden = [], value = freeze(section()), before = JSON.stringify(value);
    const tree = panel(value, { onSelect: index => selected.push(index), onExcavate: () => forbidden.push('dig'), onReveal: () => forbidden.push('reveal') });
    const buttons = withAttr(tree, 'data-dig-section-column');
    expect(buttons).toHaveLength(6); expect(buttons.every(button => button.type === 'button' && button.props.type === 'button')).toBe(true);
    expect(buttons.filter(button => button.props['aria-pressed']).map(button => button.props['data-dig-section-column'])).toEqual([8]);
    buttons.forEach(button => button.props.onClick());
    expect(selected).toEqual([6,7,8,9,10,11]); expect(forbidden).toEqual([]); expect(JSON.stringify(value)).toBe(before);
  });

  it('adds no new controls or saved-response flow to the existing observatory', () => {
    const tree = panel();
    expect(nodes(tree).filter(node => ['button','input','select','textarea'].includes(node.type))).toHaveLength(6);
    expect(nodes(tree).some(node => node.props.onChange || node.props.onInput)).toBe(false);
    expect(text(tree)).not.toMatch(/score|submit|unlock/i);
  });

  it('shows selected contact, exposed and cleared contextual summaries with the existing public contracts', () => {
    const value = section();
    expect(text(panel(value))).toContain('Contact recorded at C2 after 2 layer removals.');
    expect(text(panel(value, { focus: 9 }))).toContain('An illustrative fragment is exposed at D2, after 3 layer removals.');
    expect(text(panel(value, { focus: 10 }))).toContain('All four simulation layers have been removed at E2. No find is recorded');
  });

  it('explains surface differences as excavation and rejects automatic age or same-animal conclusions', () => {
    const value = text(panel());
    expect(value).toContain('Surface differences show excavation, not geological age.');
    expect(value).toContain('They do not establish relative geological age or whether fragments belong to the same animal.');
    expect(value).toContain('0 to 4 of 4 model layers removed');
    expect(value).toContain('no measured depth');
  });

  it('rejects incomplete or mismatched rows rather than drawing misleading section geometry', () => {
    expect(panel(null)).toBeNull();
    const short = section(); short.columns.pop(); expect(panel(short)).toBeNull();
    const wrong = section(); wrong.columns[0].coord = 'A4'; expect(panel(wrong)).toBeNull();
    const shuffled = section(); shuffled.columns.reverse(); expect(panel(shuffled)).toBeNull();
    const mismatch = section(); mismatch.columns[2].remaining = 3; expect(panel(mismatch)).toBeNull();
  });

  it('ignores hidden layout/association getters on observed columns and section metadata', () => {
    const value = section();
    for (const column of value.columns) for (const key of ['hasBone','burial','fossilY','coverRemaining','species','association']) Object.defineProperty(column, key, { enumerable: true, get() { throw new Error('Read hidden ' + key); } });
    for (const key of ['layout','burial','species','age']) Object.defineProperty(value, key, { enumerable: true, get() { throw new Error('Read hidden section ' + key); } });
    expect(() => panel(value)).not.toThrow();
  });

  it('keeps bounded fitting geometry, readable native summary text and established mobile fallback rules', () => {
    const tree = panel(), css = nodes(tree).find(node => node.type === 'style').children.join('');
    expect(byId(tree, 'dino-section-profile').props.viewBox).toBe('0 0 332 245');
    expect(css).toContain('.dinolab-section-card svg{display:block;width:100%;height:auto;max-width:360px');
    expect(css).toContain('.dinolab-transect-summary{'); expect(css).toContain('font-size:11px;line-height:1.6');
    expect(css).toContain('@container(max-width:430px)'); expect(css).toContain('@media(max-width:520px)');
    expect(css).not.toContain('overflow-x:auto');
  });

  it('keeps valid accessibility references, unique IDs and no unresolved or escaped visible text', () => {
    const tree = panel(), all = nodes(tree), ids = all.filter(node => node.props.id).map(node => node.props.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const node of all) for (const key of ['aria-labelledby','aria-describedby']) if (node.props[key]) for (const id of node.props[key].split(' ')) expect(ids, key + ': ' + id).toContain(id);
    expect(text(tree)).not.toMatch(/\{[a-zA-Z_]+\}/); expect(text(tree)).not.toMatch(/\\u(?:\{[0-9a-f]+\}|[0-9a-f]{4})/i);
  });

  it('renders deterministically and leaves a frozen observed section unchanged', () => {
    const value = freeze(section()), before = JSON.stringify(value);
    expect(comparable(panel(value))).toEqual(comparable(panel(value)));
    expect(JSON.stringify(value)).toBe(before);
  });
});
