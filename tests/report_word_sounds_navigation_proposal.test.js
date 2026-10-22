import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const parser = require('@babel/parser');
const host = readFileSync('AlloFlowANTI.txt', 'utf8');
const setup = readFileSync('word_sounds_setup_source.jsx', 'utf8');
const ast = parser.parse(host, { sourceType: 'unambiguous', plugins: ['jsx'] });
const matches = [];
let dashboardClose;
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'VariableDeclarator' && node.id?.name === 'handleCloseDashboard') {
    dashboardClose = node.init?.arguments?.[0];
  }
  if (node.type === 'JSXOpeningElement' && node.name?.name === 'WordSoundsGenerator') {
    const attribute = node.attributes.find(item => item.name?.name === 'onClose');
    if (attribute?.value?.expression) matches.push(attribute.value.expression);
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key === 'comments' || key === 'tokens') continue;
    if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') walk(value);
  }
}
walk(ast);
if (matches.length !== 1) throw Error('Expected one actual WordSoundsGenerator close callback');
if (!dashboardClose) throw Error('Expected the current shared dashboard close callback');
const callbackSource = host.slice(matches[0].start, matches[0].end);
const dashboardSource = host.slice(dashboardClose.start, dashboardClose.end);
const createClose = new Function('setWsGeneratorMinimized', 'setActiveView',
  'const handleCloseDashboard = (' + dashboardSource + '); return (' + callbackSource + ');');
const between = (source, start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  if (a < 0 || b < a) throw Error('Missing production generation boundary: ' + start);
  return source.slice(a, b);
};
const ownership = between(setup, 'const startRunRef = React.useRef(false);', '// END WORD SOUNDS GENERATION OWNERSHIP');
const begin = between(setup, 'const generationEpoch = ++generationEpochRef.current;', 'const generationAbortError =');
let React, client, act;
let SetupPanel;
const mounted = [];
beforeAll(() => {
  const modules = resolve('desktop/web-app/node_modules');
  React = require(resolve(modules, 'react'));
  client = require(resolve(modules, 'react-dom/client'));
  ({ act } = require(resolve(modules, 'react-dom/test-utils')));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  // Exercise the real generation ownership hooks and unmount cleanup beneath
  // the actual host close callback. Full Studio rendering is covered by the
  // setup identity/close follow-up suite.
  SetupPanel = new Function('React', `return function SetupPanel({onClose,state}) {
    ${ownership}
    state.beginPreparation = () => {
      ${begin}
      startRunRef.current = true;
      return {signal,isActive:isGenerationActive};
    };
    return React.createElement('button',{type:'button','aria-label':'Close Word Sounds setup',onClick:onClose},'Close');
  };`)(React);
});
afterEach(() => {
  for (const m of mounted.splice(0)) { act(() => m.root.unmount()); m.host.remove(); }
});
function mount(initialView, minimized, closeFactory = createClose) {
  const resource = { id: 'sequence-pond', data: ['Plants', 'Insects', 'Frogs'] };
  const state = { resource };
  function View() {
    const [activeView, setActiveView] = React.useState(initialView);
    const [wsGeneratorMinimized, setWsGeneratorMinimized] = React.useState(minimized);
    Object.assign(state, { activeView, minimized: wsGeneratorMinimized });
    const onClose = closeFactory(setWsGeneratorMinimized, setActiveView);
    const shown = activeView === 'word-sounds-generator' || wsGeneratorMinimized;
    return React.createElement('div', null,
      React.createElement('div', { 'data-resource': resource.id }, activeView === 'input' ? 'Teacher Source Material' : resource.data.join(' → ')),
      shown && React.createElement(SetupPanel, { onClose, state }));
  }
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = client.createRoot(host); act(() => root.render(React.createElement(View)));
  const item = { host, root, state, resource }; mounted.push(item); return item;
}
describe('implemented Word Sounds host close and cancellation', () => {
  it.each(['output', 'sequence', 'notes'])('unmounts a minimized panel from %s without replacing its resource', view => {
    const m = mount(view, true);
    act(() => m.host.querySelector('button').click());
    expect(m.state.activeView).toBe('input'); expect(m.state.minimized).toBe(false);
    expect(m.host.querySelector('button')).toBeNull(); expect(m.host.textContent).toContain('Teacher Source Material');
    expect(m.resource.data).toEqual(['Plants', 'Insects', 'Frogs']);
    expect(m.state.resource).toBe(m.resource);
  });
  it('closes the expanded setup view and clears its retained minimized flag', () => {
    const m = mount('word-sounds-generator', true);
    act(() => m.host.querySelector('button').click());
    expect(m.state.activeView).toBe('input'); expect(m.state.minimized).toBe(false);
    expect(m.host.querySelector('button')).toBeNull(); expect(m.state.resource).toBe(m.resource);
  });
  it('makes repeated closes harmless after the current view changes', () => {
    let view = 'word-sounds-generator', minimized = true;
    const setView = vi.fn(update => { view = typeof update === 'function' ? update(view) : update; });
    const close = createClose(value => { minimized = value; }, setView);
    view = 'sequence'; close(); close();
    expect(view).toBe('input'); expect(minimized).toBe(false);
    expect(setView.mock.calls).toEqual([['input'], ['input']]);
  });
  it('aborts preparation and invalidates late generation when the minimized panel closes', () => {
    const m = mount('output', true);
    const pending = m.state.beginPreparation();
    expect(pending.signal.aborted).toBe(false); expect(pending.isActive()).toBe(true);
    act(() => m.host.querySelector('button').click());
    expect(m.state.activeView).toBe('input'); expect(m.state.minimized).toBe(false);
    expect(m.host.querySelector('button')).toBeNull(); expect(m.state.resource).toBe(m.resource);
    expect(pending.signal.aborted).toBe(true); expect(pending.isActive()).toBe(false);
  });
});
