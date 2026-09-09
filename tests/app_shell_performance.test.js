import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const source = readFileSync('AlloFlowANTI.txt', 'utf8');
function section(from, to) {
  const start = source.indexOf(from), end = source.indexOf(to, start);
  if (start < 0 || end < 0) throw Error('Missing ' + from);
  return source.slice(start, end);
}
const useFocusTrap = Function('useRef', 'useEffect', section('const useFocusTrap =', 'window.__alloHooks =') + '\nreturn useFocusTrap;')(React.useRef, React.useEffect);
const watchCode = section('// MODULE_GATE_WATCH_START', '// MODULE_GATE_WATCH_END');
const watchModule = Function(watchCode + '\nreturn _alloWatchModuleChanges;')();
const gateJs = transformSync(watchCode + section('const CDNModuleGate =', '// Thin host adapters'), { configFile: false, babelrc: false, presets: [require.resolve(resolve('desktop/web-app/node_modules/@babel/preset-react'))] }).code;
const Gate = Function('React', gateJs + '\nreturn CDNModuleGate;')(React);
let roots;
function render(element) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host); roots.push(root);
  act(() => root.render(element)); return { root, host };
}
function FocusDialog({ children, escape = () => {} }) {
  const ref = React.useRef(); useFocusTrap(ref, true, escape);
  return React.createElement('div', { role: 'dialog', ref }, children);
}
const button = (name, props = {}) => React.createElement('button', { key: name, ...props }, name);
function key(name = 'Tab', shiftKey = false) {
  const event = new KeyboardEvent('keydown', { key: name, shiftKey, bubbles: true, cancelable: true });
  act(() => document.activeElement.dispatchEvent(event)); return event;
}
function registryEvent() { act(() => window.dispatchEvent(new Event('alloflow:module-registry-changed'))); }
beforeEach(() => {
  roots = []; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = ''; window.__alloFocusTrapStack = [];
  window.AlloModules = {}; window.__alloModuleRegistry = {};
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});
afterEach(() => {
  roots.forEach(root => act(() => root.unmount()));
  vi.restoreAllMocks(); vi.useRealTimers(); delete document.hidden;
  delete window.__testModuleLoader;
});
describe('shared modal focus traversal', () => {
  it('reads only the endpoints for a large unchanged form and preserves wrapping', () => {
    const { host } = render(React.createElement(FocusDialog, null, Array.from({ length: 600 }, (_, i) => button(String(i)))));
    const buttons = host.querySelectorAll('button'); buttons[300].focus();
    const style = vi.spyOn(window, 'getComputedStyle');
    expect(key().defaultPrevented).toBe(false);
    expect(style).toHaveBeenCalledTimes(2);
    buttons[599].focus(); expect(key().defaultPrevented).toBe(true); expect(document.activeElement).toBe(buttons[0]);
    expect(key('Tab', true).defaultPrevented).toBe(true); expect(document.activeElement).toBe(buttons[599]);
  });
  it('honors an interior autofocus target and restores the opener', () => {
    const opener = document.createElement('button'); document.body.appendChild(opener); opener.focus();
    const { root, host } = render(React.createElement(FocusDialog, null, [button('first'), button('input', { 'data-autofocus': true }), button('last')]));
    expect(document.activeElement.textContent).toBe('input');
    act(() => root.render(null)); expect(document.activeElement).toBe(opener); expect(host.children).toHaveLength(0);
  });
  it('uses the live DOM after controls are removed, disabled, inserted or hidden', () => {
    const { host } = render(React.createElement(FocusDialog, null, [button('first'), button('middle'), button('last')]));
    const dialog = host.firstChild;
    dialog.firstChild.remove(); dialog.lastChild.disabled = true;
    const hidden = document.createElement('button'); hidden.style.display = 'none'; dialog.prepend(hidden);
    const tail = document.createElement('button'); tail.textContent = 'tail'; dialog.appendChild(tail);
    tail.focus(); key(); expect(document.activeElement.textContent).toBe('middle');
    tail.setAttribute('aria-hidden', 'true'); key('Tab', true); expect(document.activeElement.textContent).toBe('middle');
  });
  it('excludes hidden/inert subtrees and falls back to the root when nothing is focusable', () => {
    const { host } = render(React.createElement(FocusDialog, null, React.createElement('div', { hidden: true }, button('hidden', { 'data-autofocus': true }))));
    expect(document.activeElement).toBe(host.firstChild);
    expect(key().defaultPrevented).toBe(true); expect(document.activeElement).toBe(host.firstChild);
  });
  it('only lets the top dialog handle Escape and uses the latest callback', () => {
    const parentEscape = vi.fn(), oldEscape = vi.fn(), newEscape = vi.fn();
    const parent = render(React.createElement(FocusDialog, { escape: parentEscape }, button('parent')));
    const child = render(React.createElement(FocusDialog, { escape: oldEscape }, button('child')));
    act(() => child.root.render(React.createElement(FocusDialog, { escape: newEscape }, button('child'))));
    key('Escape'); expect(newEscape).toHaveBeenCalledOnce(); expect(parentEscape).not.toHaveBeenCalled(); expect(oldEscape).not.toHaveBeenCalled();
    act(() => child.root.render(null)); expect(document.activeElement).toBe(parent.host.querySelector('button'));
    key('Escape'); expect(parentEscape).toHaveBeenCalledOnce();
  });
  it('redirects forward and backward focus that starts outside the dialog', () => {
    const { host } = render(React.createElement(FocusDialog, null, [button('first'), button('last')]));
    const outside = document.createElement('button'); document.body.appendChild(outside);
    outside.focus(); key(); expect(document.activeElement).toBe(host.querySelector('button'));
    outside.focus(); key('Tab', true); expect(document.activeElement.textContent).toBe('last');
  });
});
describe('module readiness notifications', () => {
  it('ignores unrelated events but publishes each relevant status and export change', () => {
    window.__alloModuleRegistry.Target = { status: 'pending' };
    const refresh = vi.fn(), watcher = watchModule(() => window.AlloModules.Target, 'Target', refresh);
    for (let i = 0; i < 100; i++) registryEvent(); expect(refresh).not.toHaveBeenCalled();
    for (const status of ['failed', 'pending', 'loaded']) { window.__alloModuleRegistry.Target.status = status; registryEvent(); }
    expect(refresh).toHaveBeenCalledTimes(3);
    window.AlloModules.Target = () => null; registryEvent(); expect(refresh).toHaveBeenCalledTimes(4);
    watcher.dispose(); window.AlloModules.Target = {}; registryEvent(); watcher.check(); expect(refresh).toHaveBeenCalledTimes(4);
  });
  it('handles dotted exports, visible retry and synchronous loader registration', () => {
    window.__alloModuleRegistry.Target = { status: 'failed' };
    window.__testModuleLoader = vi.fn();
    const { host } = render(React.createElement(Gate, { moduleKey: 'Target.View', loaderName: '__testModuleLoader', size: 'inline' }, View => React.createElement(View)));
    expect(host.textContent).toContain('could not load');
    window.__testModuleLoader = () => { window.AlloModules.Target = { View: () => React.createElement('p', null, 'ready') }; registryEvent(); };
    act(() => host.querySelector('button').click()); expect(host.textContent).toBe('ready');
  });
  it('uses events even without a loader and retains polling for silent legacy registration', () => {
    vi.useFakeTimers();
    const { host } = render(React.createElement(Gate, { moduleKey: 'Target', size: 'inline' }, View => React.createElement(View)));
    window.AlloModules.Target = () => React.createElement('p', null, 'legacy ready');
    act(() => vi.advanceTimersByTime(200)); expect(host.textContent).toBe('legacy ready'); expect(vi.getTimerCount()).toBe(0);
  });
  it('does not poll while hidden and checks for silent registration on return', () => {
    vi.useFakeTimers(); Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    const { host } = render(React.createElement(Gate, { moduleKey: 'Target', size: 'inline' }, View => React.createElement(View)));
    expect(vi.getTimerCount()).toBe(0);
    window.AlloModules.Target = () => React.createElement('p', null, 'visible ready');
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    act(() => document.dispatchEvent(new Event('visibilitychange'))); expect(host.textContent).toBe('visible ready');
  });
  it('removes polling/listeners when closed and responds immediately to event-only registration', () => {
    vi.useFakeTimers();
    const props = { moduleKey: 'Target', size: 'inline' };
    const { host, root } = render(React.createElement(Gate, props, View => React.createElement(View)));
    expect(vi.getTimerCount()).toBe(1);
    act(() => root.render(React.createElement(Gate, { ...props, isOpen: false })));
    expect(vi.getTimerCount()).toBe(0); expect(host.textContent).toBe('');
    act(() => root.render(React.createElement(Gate, props, View => React.createElement(View))));
    window.AlloModules.Target = () => React.createElement('p', null, 'event ready'); registryEvent();
    expect(host.textContent).toBe('event ready'); expect(vi.getTimerCount()).toBe(0);
  });
});
