import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
const mirrorSource = readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function bounded(text) {
  const a = text.indexOf('// DINO_VOXEL_SURVEY_UI_START'), b = text.indexOf('// DINO_VOXEL_SURVEY_UI_END', a);
  if (a < 0 || b <= a) throw new Error('Missing shipped Dino field survey helper');
  return text.slice(a, b);
}
const helperSource = bounded(source);
const renderSurvey = new Function(helperSource + '\nreturn renderDinoDigSurvey;')();
const english = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.dinolab;
const mirror = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8')).stem.dinolab;
const T = { panel: '#ffffff', deeper: '#eee7db', text: '#181511', soft: '#595044', border: '#b9ad9b' };
const React = { createElement(type, props, ...children) {
  return { type, props: props || {}, children: children.flat(Infinity).filter(child => child !== null && child !== undefined && child !== false) };
} };
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...tree.children.flatMap(nodes)];
}
function byId(tree, id) { return nodes(tree).find(node => node.props.id === id); }
function cells(tree) { return nodes(tree).filter(node => node.props['data-dig-survey-cell'] !== undefined); }
function radios(tree) { return nodes(tree).filter(node => node.type === 'input' && node.props.type === 'radio'); }
function visibleText(tree) {
  if (tree === null || tree === undefined || tree === false) return '';
  if (typeof tree !== 'object') return String(tree);
  if (tree.type === 'style' || tree.props.hidden || tree.props['aria-hidden'] === 'true') return '';
  return tree.children.map(visibleText).join(' ').replace(/\s+/g, ' ').trim();
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function translate(key, fallback) {
  expect(key.startsWith('stem.dinolab.survey_')).toBe(true);
  const value = english[key.slice('stem.dinolab.'.length)];
  expect(typeof value, key).toBe('string');
  expect(value, 'English fallback differs: ' + key).toBe(fallback);
  return value;
}
function column(index, status = 'covered') {
  const row = Math.floor(index / 6), col = index % 6;
  const removed = status === 'covered' ? 0 : status === 'cleared' ? 4 : status === 'partial' ? 1 : 2;
  return { index, row, col, coord: String.fromCharCode(65 + col) + (row + 1), removed, remaining: 4 - removed, status,
    shape: status === 'exposed' ? ['curved', 'elongate', 'compact'][index % 3] : null };
}
function model(focus = 0, status) {
  const states = ['covered', 'partial', 'contact', 'exposed', 'cleared'];
  const columns = Array.from({ length: 24 }, (_, index) => column(index, index === focus && status ? status : states[index] || 'covered'));
  return freeze({ seed: 71, focus, selected: columns[focus], columns });
}
function panel(survey = model(), extras = {}) {
  return renderSurvey(React, { survey, answers: {}, guides: true, onGuides() {}, onSelect() {}, onAnswer() {}, T, translate, ...extras });
}
function comparable(value, property = '') {
  if (typeof value === 'function') return '[function:' + property + ']';
  if (Array.isArray(value)) return value.map((child, index) => comparable(child, String(index)));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, comparable(child, key)]));
  return value;
}
function assertReadable(tree) {
  expect(visibleText(tree)).not.toMatch(/\\u(?:\{[0-9a-f]+\}|[0-9a-f]{4})/i);
  expect(visibleText(tree)).not.toMatch(/\{[a-zA-Z_]+\}/);
  const ids = nodes(tree).filter(node => node.props.id).map(node => node.props.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const node of nodes(tree)) {
    for (const attr of ['aria-labelledby', 'aria-describedby']) if (node.props[attr]) {
      for (const id of node.props[attr].split(' ')) expect(ids, 'missing ' + attr + ': ' + id).toContain(id);
    }
    if (node.props.htmlFor) expect(ids).toContain(node.props.htmlFor);
  }
}
function keyEvent(key, focusLog, prevented, ctrlKey = false) {
  return { key, ctrlKey, preventDefault() { prevented.push(key); }, currentTarget: { closest(selector) {
    expect(selector).toBe('.dinolab-survey-map');
    return { querySelector(target) { return { focus() { focusLog.push(target); } }; } };
  } } };
}

describe('shipped Dino field survey and evidence reasoning UI', () => {
  it('ships the same bounded helper and 46 registered readable fallback phrases in both mirrors', () => {
    expect(bounded(mirrorSource)).toBe(helperSource);
    const calls = [...helperSource.matchAll(/svt\('([^']+)', ('(?:\\.|[^'\\])*')/g)];
    const keys = [...new Set(calls.map(match => 'survey_' + match[1]))];
    expect(keys).toHaveLength(46);
    for (const key of keys) { expect(typeof english[key], key).toBe('string'); expect(mirror[key], key).toBe(english[key]); }
    for (const [, suffix, literal] of calls) expect(english['survey_' + suffix], suffix).toBe(new Function('return ' + literal + ';')());
  });

  it('renders all 24 safe native coordinate buttons with one selected tab stop and meaningful public descriptions', () => {
    const tree = panel(model(8)), map = cells(tree);
    expect(map).toHaveLength(24);
    expect(map.map(button => button.props['data-dig-survey-cell'])).toEqual(Array.from({ length: 24 }, (_, index) => index));
    expect(map.every(button => button.type === 'button' && button.props.type === 'button')).toBe(true);
    expect(map.filter(button => button.props.tabIndex === 0).map(button => button.props['data-dig-survey-cell'])).toEqual([8]);
    expect(map.filter(button => button.props['aria-pressed'] === true).map(button => button.props['data-dig-survey-cell'])).toEqual([8]);
    expect(map[0].props['aria-label']).toBe('A1: 0 of 4 layers removed; 4 remain. Covered; no find recorded. Select only.');
    expect(map[23].children[0].children).toEqual(['F4']);
    expect(map.map(button => button.props['data-dig-survey-status']).slice(0, 5)).toEqual(['covered', 'partial', 'contact', 'exposed', 'cleared']);
    assertReadable(tree);
  });

  it('sorts supplied public columns into coordinate order without modifying the model', () => {
    const original = model(8), survey = freeze({ ...original, columns: [...original.columns].reverse() }), before = JSON.stringify(survey);
    expect(cells(panel(survey)).map(button => button.props['data-dig-survey-cell'])).toEqual(Array.from({ length: 24 }, (_, index) => index));
    expect(JSON.stringify(survey)).toBe(before);
  });

  it('map activation only selects the chosen public coordinate and never forwards excavation or clue actions', () => {
    const selected = [], unrelated = [], survey = model(), before = JSON.stringify(survey);
    const tree = panel(survey, { onSelect: (...args) => selected.push(args), onExcavate: () => unrelated.push('dig'), onReveal: () => unrelated.push('reveal') });
    for (const button of cells(tree)) button.props.onClick();
    expect(selected).toEqual(Array.from({ length: 24 }, (_, index) => [index]));
    expect(unrelated).toEqual([]);
    expect(JSON.stringify(survey)).toBe(before);
  });

  it('moves map focus with clipped 2D arrows, row Home/End and whole-map Ctrl+Home/End', () => {
    const selections = [], focused = [], prevented = [], tree = panel(model(8), { onSelect: index => selections.push(index) });
    const cases = [[8, 'ArrowLeft', false, 7], [8, 'ArrowRight', false, 9], [8, 'ArrowUp', false, 2], [8, 'ArrowDown', false, 14],
      [8, 'Home', false, 6], [8, 'End', false, 11], [8, 'Home', true, 0], [8, 'End', true, 23]];
    for (const [index, key, ctrlKey, expected] of cases) {
      byId(tree, 'dino-survey-cell-' + index).props.onKeyDown(keyEvent(key, focused, prevented, ctrlKey));
      expect(selections.at(-1)).toBe(expected);
      expect(focused.at(-1)).toBe('[data-dig-survey-cell="' + expected + '"]');
    }
    const count = selections.length;
    for (const [index, key] of [[0, 'ArrowLeft'], [0, 'ArrowUp'], [11, 'ArrowRight'], [23, 'ArrowDown']]) {
      byId(tree, 'dino-survey-cell-' + index).props.onKeyDown(keyEvent(key, focused, prevented));
      expect(focused.at(-1)).toBe('[data-dig-survey-cell="' + index + '"]');
    }
    expect(selections).toHaveLength(count);
    expect(prevented).toHaveLength(12);
  });

  it('lets native Enter/Space activation work without custom digging handlers and ignores unrelated keys', () => {
    const selections = [], focused = [], prevented = [], tree = panel(undefined, { onSelect: index => selections.push(index) });
    const button = byId(tree, 'dino-survey-cell-0');
    for (const key of ['Enter', ' ', 'Tab', 'a']) button.props.onKeyDown(keyEvent(key, focused, prevented));
    expect(selections).toEqual([]); expect(focused).toEqual([]); expect(prevented).toEqual([]);
    button.props.onClick(); expect(selections).toEqual([0]);
  });

  it('marks only the current six-column slice in section mode while leaving every coordinate selectable', () => {
    const tree = panel(model(8), { inspect: true });
    expect(cells(tree).filter(button => button.props['data-dig-survey-row-selected'] === 'true').map(button => button.props['data-dig-survey-cell'])).toEqual([6, 7, 8, 9, 10, 11]);
    expect(cells(tree).filter(button => button.props.disabled)).toHaveLength(0);
    expect(cells(panel(model(8))).filter(button => button.props['data-dig-survey-row-selected'] === 'true')).toEqual([]);
  });

  it.each(['covered', 'partial', 'contact', 'exposed', 'cleared'])('selected %s record shows exactly four cover levels and truthful removed/remaining values', status => {
    const survey = model(8, status), tree = panel(survey), selected = survey.selected;
    const layers = nodes(tree).filter(node => node.props['data-dig-survey-layer'] !== undefined);
    expect(layers.map(node => node.props['data-dig-survey-layer'])).toEqual([3, 2, 1, 0]);
    expect(layers.filter(node => node.props['data-dig-survey-layer-removed'] === 'true')).toHaveLength(selected.removed);
    expect(nodes(tree).filter(node => node.type === 'dd').map(visibleText)).toEqual([selected.removed + ' of 4', selected.remaining + ' of 4']);
    expect(nodes(tree).find(node => node.props.className === 'dinolab-survey-stack').props['aria-label']).toContain(selected.removed + ' model layers removed; ' + selected.remaining + ' remain');
    const outlines = nodes(tree).filter(node => node.props['data-dig-survey-shape']);
    expect(outlines).toHaveLength(status === 'exposed' ? 1 : 0);
    assertReadable(tree);
  });

  it.each([[0, 'curved'], [1, 'elongate'], [2, 'compact']])('names and displays only the already exposed %s outline (%s)', (focus, shape) => {
    const tree = panel(model(focus, 'exposed'));
    expect(nodes(tree).find(node => node.props['data-dig-survey-shape']).props['data-dig-survey-shape']).toBe(shape);
    expect(visibleText(tree)).toContain('Exposed illustrative outline: ' + shape);
    expect(nodes(tree).find(node => node.props['data-dig-survey-claim'] === 'record').children[0].children).toEqual(['An illustrative ' + shape + ' outline is exposed at ' + String.fromCharCode(65 + focus) + '1.']);
  });

  it('gates the complete panel out of find mode and rejects malformed or stale public survey records', () => {
    expect(panel(undefined, { findMode: true })).toBeNull();
    const good = model();
    for (const survey of [null, {}, { ...good, focus: -1 }, { ...good, focus: '0' }, { ...good, selected: null }, { ...good, selected: { index: 23 } },
      { ...good, columns: good.columns.slice(1) }, { ...good, columns: [...good.columns, good.columns[0]] }]) {
      expect(renderSurvey(React, { survey, T })).toBeNull();
    }
    const badColumns = [{ ...good.columns[0], index: 24 }, { ...good.columns[0], row: 1 }, { ...good.columns[0], coord: 'F4' },
      { ...good.columns[0], removed: -1 }, { ...good.columns[0], remaining: '4' }, { ...good.columns[0], removed: 1 },
      { ...good.columns[0], status: 'secret' }, { ...good.columns[0], shape: 'curved' }, column(0, 'covered'), { ...column(0, 'contact'), remaining: 0, removed: 4 },
      { ...column(0, 'partial'), remaining: 4, removed: 0 }, { ...column(0, 'exposed'), shape: 'anatomy' }, { ...column(0, 'cleared'), removed: 1, remaining: 3 }];
    for (const bad of badColumns.filter((entry, index) => index !== 8)) {
      expect(panel({ ...good, columns: [bad, ...good.columns.slice(1)] })).toBeNull();
    }
    expect(panel({ ...good, columns: [good.columns[1], ...good.columns.slice(1)] })).toBeNull();
  });

  it('guide checkbox toggles only a boolean visual preference and preserves map, stack and teaching content', () => {
    const calls = [], checked = panel(undefined, { onGuides: (...args) => calls.push(args) }), unchecked = panel(undefined, { guides: false });
    const input = byId(checked, 'dino-survey-guides');
    expect(input.type).toBe('input'); expect(input.props.type).toBe('checkbox'); expect(input.props.checked).toBe(true);
    expect(visibleText(nodes(checked).find(node => node.props.htmlFor === input.props.id))).toBe('Show coordinates and surface datum in 3D');
    input.props.onChange({ target: { checked: false } }); input.props.onChange({ target: { checked: true, value: 'dig' } });
    expect(calls).toEqual([[false], [true]]);
    expect(comparable(cells(unchecked))).toEqual(comparable(cells(checked)));
    expect(comparable(byId(unchecked, 'dino-survey-reasoning'))).toEqual(comparable(byId(checked, 'dino-survey-reasoning')));
    expect(visibleText(byId(checked, 'dino-survey-guides-hint'))).toContain('a solid bracket shows cover remaining and a dashed bracket shows cover removed');
    assertReadable(unchecked);
  });

  it('starts with collapsed, unscored practice and exactly three native two-choice radio groups', () => {
    const tree = panel(), details = byId(tree, 'dino-survey-reasoning');
    expect(details.type).toBe('details'); expect(details.props.open).toBeUndefined();
    expect(details.children[0].type).toBe('summary'); expect(visibleText(details.children[0])).toBe('Observation or inference?');
    expect(nodes(tree).filter(node => node.props['data-dig-survey-claim']).map(node => node.props['data-dig-survey-claim'])).toEqual(['record', 'identity', 'association']);
    expect(radios(tree)).toHaveLength(6);
    expect(new Set(radios(tree).map(input => input.props.name)).size).toBe(3);
    expect(radios(tree).every(input => input.props.checked === false)).toBe(true);
    expect(nodes(tree).filter(node => node.props.className === 'dinolab-survey-feedback')).toHaveLength(0);
    expect(visibleText(tree)).toContain('it is not automatically wrong');
    expect(visibleText(tree)).toContain('This practice does not unlock clues or identify a species.');
  });

  it('forwards only fixed claim IDs and allowed checked answers without mutating the model or saved choices', () => {
    const calls = [], survey = model(), answers = freeze({ record: null, identity: null, association: null }), before = JSON.stringify({ survey, answers });
    const tree = panel(survey, { answers, onAnswer: (...args) => calls.push(args) });
    for (const input of radios(tree)) { input.props.onChange({ target: { checked: false, value: 'burial' } }); input.props.onChange({ target: { checked: true, value: 'burial' } }); }
    expect(calls).toEqual([['record', 'observation'], ['record', 'inference'], ['identity', 'observation'], ['identity', 'inference'], ['association', 'observation'], ['association', 'inference']]);
    expect(JSON.stringify({ survey, answers })).toBe(before);
  });

  it('provides explanatory, revisable feedback for both matching and mistaken choices', () => {
    const survey = model(3), good = panel(survey, { answers: { record: 'observation', identity: 'inference', association: 'inference' } });
    expect(radios(good).filter(input => input.props.checked).map(input => input.props['data-dig-survey-answer'])).toEqual(['record:observation', 'identity:inference', 'association:inference']);
    for (const id of ['record', 'identity', 'association']) {
      const feedback = byId(good, 'dino-survey-feedback-' + id);
      expect(feedback.props['data-dig-survey-answer-matches']).toBe('true'); expect(feedback.props.role).toBe('status');
      expect(feedback.props['aria-live']).toBe('polite');
    }
    expect(visibleText(byId(good, 'dino-survey-feedback-record'))).toContain('directly restates the layer or find status recorded at D1');
    expect(visibleText(byId(good, 'dino-survey-feedback-identity'))).toContain('An outline alone does not identify a species');
    expect(visibleText(byId(good, 'dino-survey-feedback-association'))).toContain('Nearby positions do not establish that association');
    const revised = panel(survey, { answers: { record: 'inference', identity: 'observation', association: 'observation' } });
    expect(visibleText(byId(revised, 'dino-survey-feedback-record'))).toContain('Reconsider: Direct observation');
    expect(visibleText(byId(revised, 'dino-survey-feedback-identity'))).toContain('Reconsider: Inference needing evidence');
    expect(radios(revised).every(input => !input.props.disabled)).toBe(true);
    assertReadable(good); assertReadable(revised);
  });

  it('uses status-specific contextual claims and explains absence separately from a fully cleared model', () => {
    const contact = panel(model(2), { answers: { identity: 'inference' } });
    expect(visibleText(contact)).toContain('A contact is recorded at C1; remaining model cover: 2 of 4 layers.');
    expect(visibleText(contact)).toContain('The contact at C1 identifies the dinosaur species.');
    expect(visibleText(byId(contact, 'dino-survey-feedback-identity'))).toContain('requiring careful exposure');
    const covered = panel(model(0), { answers: { identity: 'inference' } });
    expect(visibleText(covered)).toContain('At A1, all four model layers remain and no find is recorded.');
    expect(visibleText(byId(covered, 'dino-survey-feedback-identity'))).toContain('unopened sediment');
    const cleared = panel(model(4), { answers: { identity: 'inference' } });
    expect(visibleText(cleared)).toContain('All four model layers were removed at E1; no find is recorded.');
    expect(visibleText(byId(cleared, 'dino-survey-feedback-identity'))).toContain('It does not prove that a real deposit contains no fossils.');
  });

  it('ignores malformed answer values while keeping every choice available and readable', () => {
    const tree = panel(undefined, { answers: { record: 'dig', identity: 1, association: {}, hidden: 'observation' } });
    expect(radios(tree).filter(input => input.props.checked)).toEqual([]);
    expect(nodes(tree).filter(node => node.props.className === 'dinolab-survey-feedback')).toEqual([]);
    assertReadable(tree);
  });

  it('disables unavailable callbacks without inventing actions or hiding the observation record', () => {
    const tree = panel(undefined, { onSelect: undefined, onGuides: undefined, onAnswer: undefined });
    expect(cells(tree).every(button => button.props.disabled)).toBe(true);
    expect(radios(tree).every(input => input.props.disabled)).toBe(true);
    expect(byId(tree, 'dino-survey-guides').props.disabled).toBe(true);
    expect(() => { cells(tree)[0].props.onClick(); byId(tree, 'dino-survey-guides').props.onChange({ target: { checked: true } }); radios(tree)[0].props.onChange({ target: { checked: true } }); }).not.toThrow();
    expect(nodes(tree).filter(node => node.props['data-dig-survey-layer'] !== undefined)).toHaveLength(4);
  });

  it('does not read hidden fossil, catalog, clue, geometry, or association data', () => {
    const publicModel = JSON.parse(JSON.stringify(model(2)));
    for (const value of [publicModel, ...publicModel.columns]) for (const key of ['burial', 'hasBone', 'fossilY', 'species', 'anatomy', 'catalog', 'clues', 'boneCells', 'association']) {
      Object.defineProperty(value, key, { get() { throw new Error('Read hidden ' + key); } });
    }
    publicModel.selected = publicModel.columns[publicModel.focus];
    expect(() => panel(freeze(publicModel))).not.toThrow();
    expect(nodes(panel(publicModel)).filter(node => node.props['data-dig-survey-shape'])).toEqual([]);
  });

  it('renders identical readable fallback phrases and resolves every ID reference across observations and answers', () => {
    for (const status of ['covered', 'partial', 'contact', 'exposed', 'cleared']) {
      const survey = model(8, status), extras = { answers: { record: 'inference', identity: 'inference', association: 'observation' } };
      const translated = panel(survey, extras);
      expect(comparable(panel(survey, { ...extras, translate: undefined }))).toEqual(comparable(translated));
      expect(comparable(panel(survey, { ...extras, translate: () => null }))).toEqual(comparable(translated));
      assertReadable(translated);
    }
  });
});
