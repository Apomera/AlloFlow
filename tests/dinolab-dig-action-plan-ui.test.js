import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function bounded(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  if (a < 0 || b <= a) throw new Error('Missing bounded action-plan renderer: ' + start);
  return text.slice(a, b);
}
const rendererSource = bounded(source, '// DINO_VOXEL_ACTION_PLAN_UI_START', '// DINO_VOXEL_ACTION_PLAN_UI_END');
const previewLegendSource = bounded(source, '// DINO_VOXEL_PREVIEW_LEGEND_START', '// DINO_VOXEL_PREVIEW_LEGEND_END');
const renderPlan = new Function(previewLegendSource + '\n' + rendererSource + '\nreturn renderDinoDigActionPlan;')();
const english = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.dinolab;
const mirror = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8')).stem.dinolab;
const requestedKeys = [
  'brush', 'trowel', 'column_blocked', 'column_contact', 'column_protected', 'column_cleared', 'column_brush', 'column_trowel',
  'map_text', 'zero_removals', 'one_removal', 'exact_removals', 'up_to_removals', 'blocked_cleared', 'blocked_protected',
  'brush_explanation', 'trowel_explanation', 'map_numbers', 'eyebrow', 'title', 'intro', 'hide_3d', 'show_3d', 'inspection',
  'map_title', 'map_caption', 'legend_footprint', 'legend_center', 'legend_contact', 'legend_protected', 'legend_cleared',
  'metric_reach', 'metric_eligible', 'metric_range', 'impact_label', 'impact_brush', 'impact_trowel', 'impact_contacts',
  'contact_brush', 'contact_trowel', 'impact_protected', 'impact_cleared', 'known_stops', 'limit'
].map(key => 'plan_' + key);
const unicodeToken = /\\u(?:\{[0-9a-f]+\}|[0-9a-f]{4})/i;
const placeholder = /\{[a-zA-Z_]+\}/;
const T = { panel: '#ffffff', deep: '#f4efe7', deeper: '#eee7db', text: '#181511', soft: '#595044', border: '#b9ad9b' };
const React = {
  createElement(type, props, ...children) {
    return { type, props: props || {}, children: children.flat(Infinity).filter(child => child !== null && child !== undefined && child !== false) };
  }
};
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...tree.children.flatMap(nodes)];
}
function byId(tree, id) { return nodes(tree).find(node => node.props.id === id); }
function visibleText(tree) {
  if (tree === null || tree === undefined || tree === false) return '';
  if (typeof tree !== 'object') return String(tree);
  if (tree.type === 'style' || tree.props.hidden) return '';
  return tree.children.map(visibleText).join(' ').replace(/\s+/g, ' ').trim();
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function translate(key, fallback) {
  expect(key.startsWith('stem.dinolab.plan_') || key.startsWith('stem.dinolab.preview_')).toBe(true);
  const registered = english[key.slice('stem.dinolab.'.length)];
  expect(typeof registered, 'unregistered English key: ' + key).toBe('string');
  expect(registered, 'English fallback differs: ' + key).toBe(fallback);
  return registered;
}
function coord(index) { return String.fromCharCode(65 + index % 6) + (Math.floor(index / 6) + 1); }

// Public-model fixtures deliberately contain no hidden burial, bone, or catalog data.
// The separately tested planning helper determines these bounds; the UI displays them.
function planFixture({ tool = 'brush', focus = 7, observations = {}, blocked = null } = {}) {
  const footprint = tool === 'brush' ? [focus] : Array.from({ length: 24 }, (_, index) => index).filter(index =>
    Math.abs(index % 6 - focus % 6) <= 1 && Math.abs(Math.floor(index / 6) - Math.floor(focus / 6)) <= 1);
  const observed = { ...observations, ...(blocked ? { [focus]: blocked } : {}) };
  const columns = footprint.map(index => {
    const observation = observed[index] || 'unknown';
    const contact = observation === 'contact';
    const status = observation === 'protected' || observation === 'cleared' ? observation : contact && tool === 'trowel' ? 'contact-stop' : 'candidate';
    const removed = observation === 'cleared' ? 4 : observation === 'protected' ? 3 : contact ? 2 : observation === 'partial' ? 1 : 0;
    const eligible = !blocked && status === 'candidate';
    return { index, row: Math.floor(index / 6), col: index % 6, coord: coord(index), removed, remaining: 4 - removed, contact, status,
      minRemoval: eligible && tool === 'brush' ? 1 : 0, maxRemoval: eligible ? 1 : 0 };
  });
  const eligibleCount = columns.filter(column => column.maxRemoval > 0).length;
  return { focus, coord: coord(focus), tool, blocked: !!blocked, blockReason: blocked, footprint, columns,
    minRemoval: columns.reduce((sum, column) => sum + column.minRemoval, 0),
    maxRemoval: columns.reduce((sum, column) => sum + column.maxRemoval, 0),
    maxAffected: eligibleCount, eligibleCount,
    protectedCount: columns.filter(column => column.status === 'protected').length,
    clearedCount: columns.filter(column => column.status === 'cleared').length,
    contactCount: columns.filter(column => column.contact).length,
    contactStopCount: columns.filter(column => column.status === 'contact-stop').length };
}
function render(model, extras = {}) { return renderPlan(React, { plan: model, T, translate, inspect: false, preview: false, ...extras }); }
function expectPublicPlan(tree, model) {
  const map = byId(tree, 'dino-action-plan-map');
  expect(map.type).toBe('svg');
  expect(map.props.role).toBe('img');
  expect(map.props.focusable).toBe('false');
  expect(map.props['aria-label']).toContain(model.coord);
  const cells = nodes(map).filter(node => node.props['data-dig-plan-cell'] !== undefined);
  expect(cells).toHaveLength(24);
  expect(cells.filter(node => node.props['data-dig-plan-footprint'] === 'true').map(node => node.props['data-dig-plan-cell'])).toEqual(model.footprint);
  expect(cells.filter(node => node.props['data-dig-plan-selected'] === 'true').map(node => node.props['data-dig-plan-cell'])).toEqual([model.focus]);
  expect(cells.every(node => node.type === 'g' && node.props.onClick === undefined && node.props.tabIndex === undefined)).toBe(true);
  const outcome = byId(tree, 'dino-action-plan-outcome');
  expect(outcome.props['data-dig-plan-min']).toBe(model.minRemoval);
  expect(outcome.props['data-dig-plan-max']).toBe(model.maxRemoval);
  expect(byId(tree, 'dino-action-plan').props['data-dig-plan-blocked']).toBe(String(model.blocked));
  expect(visibleText(tree)).not.toMatch(unicodeToken);
  expect(visibleText(tree)).not.toMatch(placeholder);
  for (const node of nodes(tree)) if (typeof node.props['aria-label'] === 'string') {
    expect(node.props['aria-label']).not.toMatch(unicodeToken);
    expect(node.props['aria-label']).not.toMatch(placeholder);
  }
}

describe('shipped Dino observable action-plan UI', () => {
  it('registers all 44 requested English keys identically in both shipped registries', () => {
    expect(requestedKeys).toHaveLength(44);
    const calls = [...rendererSource.matchAll(/pt\('([^']+)', ('(?:\\.|[^'\\])*')/g)];
    expect([...new Set(calls.map(match => 'plan_' + match[1]))].sort()).toEqual([...requestedKeys].sort());
    for (const key of requestedKeys) {
      expect(typeof english[key], key).toBe('string');
      expect(english[key].length, key).toBeGreaterThan(0);
      expect(mirror[key], key).toBe(english[key]);
      expect(english[key], key).not.toMatch(unicodeToken);
    }
    for (const [, key, literal] of calls) expect(english['plan_' + key], key).toBe(new Function('return ' + literal + ';')());
    expect(english.plan_metric_range).toContain('\u2013');
    expect(english.plan_impact_trowel).toContain('0\u20131');
  });

  it.each(['unknown', 'partial', 'contact'])('shows one brush removal at a %s column without predicting hidden contents', observation => {
    const model = freeze(planFixture({ observations: { 7: observation } }));
    const before = JSON.stringify(model), tree = render(model);
    expectPublicPlan(tree, model);
    expect(visibleText(byId(tree, 'dino-action-plan-outcome'))).toBe(english.plan_one_removal);
    expect(visibleText(byId(tree, 'dino-action-plan-summary'))).toBe(english.plan_brush_explanation);
    const contactRow = nodes(tree).find(node => node.type === 'li' && visibleText(node).includes(english.plan_impact_contacts));
    if (observation === 'contact') expect(visibleText(contactRow)).toContain(english.plan_contact_brush);
    else expect(contactRow).toBeUndefined();
    expect(JSON.stringify(model)).toBe(before);
  });

  it.each([[0, 4], [7, 9], [23, 4]])('shows a clipped trowel footprint at %i with an uncertain 0–%i bound', (focus, count) => {
    const model = freeze(planFixture({ tool: 'trowel', focus }));
    const before = JSON.stringify(model), tree = render(model);
    expectPublicPlan(tree, model);
    expect(model.footprint).toHaveLength(count);
    expect(visibleText(byId(tree, 'dino-action-plan-outcome'))).toBe(english.plan_up_to_removals.replace('{count}', String(count)));
    expect(visibleText(byId(tree, 'dino-action-plan-summary'))).toBe(english.plan_trowel_explanation);
    expect(byId(tree, 'dino-action-plan-map').props['aria-label']).toContain('0 or 1');
    expect(visibleText(tree)).toContain('0\u20131');
    expect(JSON.stringify(model)).toBe(before);
  });

  it('distinguishes known trowel stops, exposed protection, and cleared neighbors from unknown candidates', () => {
    const model = freeze(planFixture({ tool: 'trowel', observations: { 0: 'contact', 1: 'protected', 6: 'cleared' } }));
    const before = JSON.stringify(model), tree = render(model);
    expectPublicPlan(tree, model);
    expect(model.maxRemoval).toBe(6);
    const map = byId(tree, 'dino-action-plan-map');
    for (const [index, status] of [[0, 'contact-stop'], [1, 'protected'], [6, 'cleared']]) {
      const cell = nodes(map).find(node => node.props['data-dig-plan-cell'] === index);
      expect(cell.props['data-dig-plan-status']).toBe(status);
      expect(visibleText(cell)).toBe('0');
    }
    const impacts = nodes(tree).filter(node => node.type === 'li').map(visibleText);
    expect(impacts.some(text => text.includes(english.plan_impact_contacts) && text.includes('A1') && text.includes(english.plan_contact_trowel))).toBe(true);
    expect(impacts.some(text => text.includes(english.plan_impact_protected) && text.includes('B1'))).toBe(true);
    expect(impacts.some(text => text.includes(english.plan_impact_cleared) && text.includes('A2'))).toBe(true);
    expect(JSON.stringify(model)).toBe(before);
  });

  it.each(['protected', 'cleared'])('shows zero removals across the entire pass when the center is %s', blocked => {
    const model = freeze(planFixture({ tool: 'trowel', blocked, observations: { 0: 'contact' } }));
    const before = JSON.stringify(model), tree = render(model);
    expectPublicPlan(tree, model);
    expect(visibleText(byId(tree, 'dino-action-plan-outcome'))).toBe(english.plan_zero_removals);
    expect(visibleText(byId(tree, 'dino-action-plan-summary'))).toBe(english['plan_blocked_' + blocked]);
    expect(nodes(tree).filter(node => node.props['data-dig-plan-footprint'] === 'true').every(node => visibleText(node) === '0')).toBe(true);
    expect(visibleText(tree)).not.toContain(english.plan_contact_trowel);
    expect(visibleText(tree)).not.toContain(english.plan_known_stops.replace('{count}', '1'));
    expect(JSON.stringify(model)).toBe(before);
  });

  it('shows zero removals when every reached column is a recorded contact awaiting the brush', () => {
    const initial = planFixture({ tool: 'trowel' });
    const model = freeze(planFixture({ tool: 'trowel', observations: Object.fromEntries(initial.footprint.map(index => [index, 'contact'])) }));
    const tree = render(model);
    expectPublicPlan(tree, model);
    expect(visibleText(byId(tree, 'dino-action-plan-outcome'))).toBe(english.plan_zero_removals);
    expect(visibleText(tree)).toContain(english.plan_contact_trowel);
    expect(visibleText(tree)).toContain(english.plan_known_stops.replace('{count}', '9'));
  });

  it.each([false, true])('forwards only the next preview boolean from an enabled toggle (%s)', preview => {
    const model = freeze(planFixture({ tool: 'trowel' })), before = JSON.stringify(model), calls = [], otherActions = [];
    const tree = render(model, { preview, onPreview: (...args) => calls.push(args), onSelect: () => otherActions.push('select'), onExcavate: () => otherActions.push('excavate') });
    const buttons = nodes(tree).filter(node => node.type === 'button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].props.id).toBe('dino-footprint-toggle');
    expect(buttons[0].props.type).toBe('button');
    expect(buttons[0].props.disabled).toBe(false);
    expect(buttons[0].props['aria-pressed']).toBe(preview);
    buttons[0].props.onClick();
    expect(calls).toEqual([[!preview]]);
    expect(otherActions).toEqual([]);
    expect(JSON.stringify(model)).toBe(before);
  });

  it('keeps section inspection non-destructive with a disabled toggle and no new grid controls', () => {
    const model = freeze(planFixture({ tool: 'trowel', observations: { 0: 'contact' } })), before = JSON.stringify(model), calls = [];
    const tree = render(model, { inspect: true, preview: true, onPreview: (...args) => calls.push(args), onSelect: () => calls.push(['select']), onExcavate: () => calls.push(['excavate']) });
    expectPublicPlan(tree, model);
    expect(visibleText(byId(tree, 'dino-action-plan-inspection'))).toBe(english.plan_inspection);
    const toggle = byId(tree, 'dino-footprint-toggle');
    expect(toggle.props.disabled).toBe(true);
    // Native disabled buttons do not dispatch activation. Model that DOM behavior,
    // rather than calling the disabled button's callback directly.
    if (!toggle.props.disabled) toggle.props.onClick();
    expect(nodes(tree).filter(node => node.type === 'button')).toHaveLength(1);
    expect(nodes(byId(tree, 'dino-action-plan-map')).every(node => node.props.onClick === undefined)).toBe(true);
    expect(calls).toEqual([]);
    expect(JSON.stringify(model)).toBe(before);
  });

  it('supports a static plan without a toggle and declines missing public data', () => {
    expect(nodes(render(planFixture())).filter(node => node.type === 'button')).toEqual([]);
    expect(renderPlan(React, { plan: null, T })).toBeNull();
    expect(renderPlan(React, { plan: { columns: [] }, T })).toBeNull();
  });
});
