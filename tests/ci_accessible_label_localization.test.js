import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { parse } from 'acorn';
import { sliceBetween } from './helpers/anchored_slice.js';

const read = file => fs.readFileSync(file, 'utf8');
const React = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) }),
  useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
  useRef: initial => ({ current: initial }), useEffect: () => {}, useMemo: compute => compute(),
};
function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null;
  if (predicate(tree)) return tree;
  for (const child of tree.children || []) { const match = find(child, predicate); if (match) return match; }
  return null;
}

describe('CI accessible label localization', () => {
  it('passes the Watercycle host translator through its lazy Water Worlds surface', () => {
    const source = read('stem_lab/stem_tool_watercycle.js');
    const slotSource = sliceBetween(source, '  function WaterWorldsSlot(props)', '  if(!window.StemLab', {
      file: 'stem_lab/stem_tool_watercycle.js', label: 'Water Worlds slot',
    });
    const host = { WaterWorldsView: function View() {} };
    const Slot = Function('window', 'loadWaterWorlds', slotSource + '; return WaterWorldsSlot;')(host, () => Promise.resolve());
    const translate = (key, fallback) => fallback;
    const tree = Slot({ ctx: { React, t: translate, setToolData: () => {} }, saved: {} });
    expect(tree.type).toBe(host.WaterWorldsView);
    expect(tree.props.t).toBe(translate);
  });

  it.each(['stem_lab/water_worlds_view.js', 'desktop/web-app/public/stem_lab/water_worlds_view.js'])('translates the valley and chart names in %s', (file) => {
    const host = {};
    Function('window', read('stem_lab/water_worlds_kernel.js'))(host);
    Function('window', read(file))(host);
    const saved = host.WaterWorldsKernel.begin(host.WaterWorldsKernel.initial(), false);
    const translate = key => 'Localized ' + key;
    const tree = host.WaterWorldsView({ React, saved, t: translate });
    const canvas = find(tree, node => node.type === 'canvas');
    const chart = find(tree, node => node.type === 'svg' && String(node.props['aria-label']).includes('outlet_flow'));
    expect(canvas.props['aria-label']).toMatch(/^Localized stem\.waterworlds\./);
    expect(chart).toBeTruthy();
    expect(chart.props['aria-label']).toMatch(/^Localized stem\.waterworlds\./);
    const fallbackTree = host.WaterWorldsView({ React, saved, t: key => key });
    expect(find(fallbackTree, node => node.type === 'canvas').props['aria-label']).toContain('Interactive valley.');
  });

  it('preserves readable Maine SLD fallbacks when translation is absent, missing or throws', () => {
    const source = read('maine_sld_practice_source.jsx');
    // End at the next top-level function: JSX record/worked-example components now sit
    // between this helper and MaineSldPracticePanel (91652c2fe), and Function() cannot parse JSX.
    const helperSource = sliceBetween(source, 'function msldAccessibleText(', '\nfunction ', {
      file: 'maine_sld_practice_source.jsx', label: 'Maine SLD accessible text helper',
    });
    const text = Function(helperSource + '; return msldAccessibleText;')();
    expect(text(() => 'Translated worksheet', 'key', 'Worksheet tools')).toBe('Translated worksheet');
    for (const translate of [null, key => key, () => undefined, () => { throw new Error('Unavailable language pack'); }]) {
      expect(text(translate, 'key', 'Worksheet tools')).toBe('Worksheet tools');
    }
    expect(source).toContain('t={props.t}');
  });

  it.each(['stem_lab/stem_tool_moonmission.js', 'desktop/web-app/public/stem_lab/stem_tool_moonmission.js'])('translates module-level Moon Mission energy names with safe fallbacks in %s', (file) => {
    const source = read(file);
    const normalize = sliceBetween(source, '  function mmAccessibleTranslator(', '  function mmDescentVectorsView(', {
      file, label: 'Moon Mission accessible translator',
    });
    const energy = sliceBetween(source, '  function mmDescentEnergyView(', '  function mmUpdateDescentEnergy(', {
      file, label: 'Moon Mission descent energy view',
    });
    const view = Function(normalize + energy + '; return mmDescentEnergyView;')();
    const locate = tree => find(tree, node => node.type === 'svg' && node.props['data-descent-energy-bars']);
    expect(locate(view(React.createElement, key => 'Localized ' + key)).props['aria-label']).toMatch(/^Localized stem\.moonmission\./);
    for (const translate of [undefined, key => key, () => null, () => '', () => { throw new Error('Language unavailable'); }]) {
      expect(locate(view(React.createElement, translate)).props['aria-label']).toBe('Energy components on the same energy per kilogram scale.');
    }
  });

  it('threads the host translator into every localized Moon Mission module helper call', () => {
    const names = new Set(['mmDescentEnergyView', 'mmRenderLunarEnvironmentCard', 'mmRenderDepartureCard',
      'mmRenderApproachCard', 'mmRenderTliCard', 'mmDockingInstrumentsView', 'mmEntryTrajectoryView', 'mmEntryDynamicsView', 'mmEntryThermalView']);
    const calls = new Set(), declarations = new Set();
    const stack = [parse(read('stem_lab/stem_tool_moonmission.js'), { ecmaVersion: 'latest' })];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node.type !== 'string') continue;
      if (node.type === 'FunctionDeclaration' && names.has(node.id.name)) {
        declarations.add(node.id.name);
        expect(node.params.at(-1).name).toBe('translate');
      }
      if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && names.has(node.callee.name)) {
        calls.add(node.callee.name);
        expect(node.arguments.at(-1)).toMatchObject({ type: 'Identifier', name: 't' });
      }
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) stack.push(...value);
        else if (value && typeof value.type === 'string') stack.push(value);
      }
    }
    expect(declarations).toEqual(names);
    expect(calls).toEqual(names);
  });

  it.each(['stem_lab/stem_tool_moonmission.js', 'desktop/web-app/public/stem_lab/stem_tool_moonmission.js'])('declares exactly one Moon Mission accessible translator in %s', (file) => {
    const declarations = [];
    const stack = [parse(read(file), { ecmaVersion: 'latest' })];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node.type !== 'string') continue;
      if (node.type === 'FunctionDeclaration' && node.id?.name === 'mmAccessibleTranslator') declarations.push(node);
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) stack.push(...value);
        else if (value && typeof value.type === 'string') stack.push(value);
      }
    }
    expect(declarations, file).toHaveLength(1);
  });

  it('keeps the canonical and served localized Moon Mission and BeeHive sources identical', () => {
    for (const tool of ['moonmission', 'beehive']) expect(read(`desktop/web-app/public/stem_lab/stem_tool_${tool}.js`)).toBe(read(`stem_lab/stem_tool_${tool}.js`));
  });

  it.each([['moonmission', 't'], ['beehive', '__alloT']])('keeps readable host-label fallbacks in %s', (tool, alias) => {
    const declaration = read(`stem_lab/stem_tool_${tool}.js`).split('\n').find(line => line.includes(`var ${alias} = function (k, fb)`));
    expect(declaration).toBeTruthy();
    const obtain = translate => Function('ctx', declaration + `; return ${alias};`)({ t: translate });
    expect(obtain(() => 'Translated label')('key', 'English label')).toBe('Translated label');
    for (const translate of [undefined, key => key, () => null, () => '', () => { throw new Error('Language unavailable'); }]) {
      expect(obtain(translate)('key', 'English label')).toBe('English label');
    }
    const context = { marker: 'Bound provider', t() { return this.marker; } };
    expect(Function('ctx', declaration + `; return ${alias};`)(context)('key', 'English label')).toBe('Bound provider');
  });
});
