import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { applyPatch } = require('diff');
const parser = require('@babel/parser');
const host = readFileSync('AlloFlowANTI.txt', 'utf8');
const patch = readFileSync('reports/report-fixes-2026-09-30/word-sounds-navigation-host-proposal.patch', 'utf8');
const candidate = applyPatch(host, patch);
if (candidate === false) throw Error('Review-only close proposal does not apply to current host');
const ast = parser.parse(candidate, { sourceType: 'unambiguous', plugins: ['jsx'] });
const matches = [];
function walk(node) {
  if (!node || typeof node !== 'object') return;
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
const callbackSource = candidate.slice(matches[0].start, matches[0].end);
const createClose = new Function('setWsGeneratorMinimized', 'setActiveView', 'return (' + callbackSource + ');');
let React, client, act;
const mounted = [];
beforeAll(() => {
  const modules = resolve('desktop/web-app/node_modules');
  React = require(resolve(modules, 'react'));
  client = require(resolve(modules, 'react-dom/client'));
  ({ act } = require(resolve(modules, 'react-dom/test-utils')));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
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
      shown && React.createElement('button', { type: 'button', 'aria-label': 'Close Word Sounds setup', onClick: onClose }, 'Close'));
  }
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = client.createRoot(host); act(() => root.render(React.createElement(View)));
  const item = { host, root, state, resource }; mounted.push(item); return item;
}
describe('Review-only Word Sounds host close proposal', () => {
  it.each(['output', 'sequence', 'notes'])('unmounts a minimized panel while preserving the current %s resource', view => {
    const m = mount(view, true);
    act(() => m.host.querySelector('button').click());
    expect(m.state.activeView).toBe(view); expect(m.state.minimized).toBe(false);
    expect(m.host.querySelector('button')).toBeNull(); expect(m.host.textContent).toContain('Plants → Insects → Frogs');
    expect(m.state.resource).toBe(m.resource);
  });
  it('closes the expanded setup view and clears its retained minimized flag', () => {
    const m = mount('word-sounds-generator', true);
    act(() => m.host.querySelector('button').click());
    expect(m.state.activeView).toBe('input'); expect(m.state.minimized).toBe(false);
    expect(m.host.querySelector('button')).toBeNull(); expect(m.state.resource).toBe(m.resource);
  });
  it('uses the latest current view and makes repeated close calls harmless', () => {
    let view = 'word-sounds-generator', minimized = true;
    const setView = vi.fn(update => { view = typeof update === 'function' ? update(view) : update; });
    const close = createClose(value => { minimized = value; }, setView);
    view = 'sequence'; close(); close();
    expect(view).toBe('sequence'); expect(minimized).toBe(false);
    expect(setView.mock.calls.every(([update]) => typeof update === 'function')).toBe(true);
  });
  it('reproduces the present shared callback defect without applying a host change', () => {
    const m = mount('output', true, (_setMinimized, setView) => () => setView('input'));
    act(() => m.host.querySelector('button').click());
    expect(m.state.activeView).toBe('input'); expect(m.state.minimized).toBe(true);
    expect(m.host.querySelector('button')).toBeTruthy(); expect(m.host.textContent).toContain('Teacher Source Material');
  });
});
