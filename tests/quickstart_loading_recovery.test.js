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
  if (start < 0 || end < 0) throw Error('Missing production section: ' + from);
  return source.slice(start, end);
}
const compiled = transformSync(
  section('// MODULE_GATE_WATCH_START', '// Thin host adapters') +
  section('const QuickStartWizard = React.memo', 'const FocusReaderOverlay ='),
  { configFile: false, babelrc: false, presets: [require.resolve(resolve('desktop/web-app/node_modules/@babel/preset-react'))] }
).code;
const Wizard = Function('React', compiled + '\nreturn QuickStartWizard;')(React);
let host, root;
const readyWizard = props => React.createElement('button', { onClick: props.onClose }, 'Setup ready: ' + props.marker);
function event() { window.dispatchEvent(new Event('alloflow:module-registry-changed')); }
function open(props = {}) { act(() => root.render(React.createElement(Wizard, { isOpen: true, marker: 'preserved props', ...props }))); }
function ready() { act(() => { window.AlloModules.QuickStartWizard = readyWizard; window.__alloModuleRegistry.QuickStartWizard = { status: 'loaded' }; event(); }); }
beforeEach(() => {
  vi.useFakeTimers(); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  document.body.innerHTML = ''; window.AlloModules = {}; window.__alloModuleRegistry = {};
  delete window.__alloLazyQuickStartWizard;
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
});
afterEach(() => {
  act(() => root.unmount()); host.remove();
  delete window.__alloLazyQuickStartWizard; delete document.hidden;
  vi.useRealTimers(); vi.restoreAllMocks();
});
describe('production Quick Start loading and recovery', () => {
  it('demand-loads once and replaces the loading screen on a registry event without a parent render', () => {
    window.__alloLazyQuickStartWizard = vi.fn(() => { window.__alloModuleRegistry.QuickStartWizard = { status: 'pending' }; event(); });
    const onClose = vi.fn(); open({ onClose, t: (key, values) => key === 'common.loading_module' ? 'Preparing ' + values.name : '' });
    expect(window.__alloLazyQuickStartWizard).toHaveBeenCalledOnce();
    expect(host.textContent).toContain('Preparing Setup Wizard');
    expect(host.firstElementChild.style.zIndex).toBe('300');
    act(() => vi.advanceTimersByTime(1000));
    expect(window.__alloLazyQuickStartWizard).toHaveBeenCalledOnce();
    ready(); expect(host.textContent).toBe('Setup ready: preserved props');
    act(() => host.querySelector('button').click()); expect(onClose).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('discovers a loader installed after the child effect without repeated requests', () => {
    open(); expect(host.textContent).toContain('Loading Setup Wizard');
    act(() => vi.advanceTimersByTime(300));
    window.__alloLazyQuickStartWizard = vi.fn();
    act(() => vi.advanceTimersByTime(100));
    expect(window.__alloLazyQuickStartWizard).toHaveBeenCalledOnce();
    act(() => vi.advanceTimersByTime(6000));
    expect(window.__alloLazyQuickStartWizard).toHaveBeenCalledOnce();
    ready(); expect(host.textContent).toContain('Setup ready');
  });
  it('offers a bounded missing-loader failure and can retry once the host callback is installed', () => {
    open(); act(() => vi.advanceTimersByTime(5000));
    expect(host.textContent).toContain('could not load');
    const loader = window.__alloLazyQuickStartWizard = vi.fn(() => { window.AlloModules.QuickStartWizard = readyWizard; event(); });
    act(() => Array.from(host.querySelectorAll('button')).find(b => b.textContent === 'Retry loading').click());
    expect(loader).toHaveBeenCalledOnce(); expect(host.textContent).toContain('Setup ready');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('announces a failed request and retries only the requested wizard', () => {
    const loader = window.__alloLazyQuickStartWizard = vi.fn(() => { window.__alloModuleRegistry.QuickStartWizard = { status: 'pending' }; event(); });
    open(); act(() => { window.__alloModuleRegistry.QuickStartWizard.status = 'failed'; event(); });
    expect(host.textContent).toContain('could not load');
    act(() => Array.from(host.querySelectorAll('button')).find(b => b.textContent === 'Retry loading').click());
    expect(loader).toHaveBeenCalledTimes(2); expect(host.textContent).toContain('Loading Setup Wizard');
    ready(); expect(host.textContent).toContain('Setup ready');
  });
  it('keeps synchronous loader exceptions recoverable', () => {
    window.__alloLazyQuickStartWizard = vi.fn(() => { throw Error('temporary loader failure'); });
    expect(() => open()).not.toThrow(); expect(host.textContent).toContain('Retry loading');
  });
  it('cancels discovery and polling when closed and discovers again when reopened', () => {
    open(); open({ isOpen: false }); expect(host.innerHTML).toBe(''); expect(vi.getTimerCount()).toBe(0);
    window.__alloLazyQuickStartWizard = vi.fn(); act(() => vi.advanceTimersByTime(6000));
    expect(window.__alloLazyQuickStartWizard).not.toHaveBeenCalled();
    open(); expect(window.__alloLazyQuickStartWizard).toHaveBeenCalledOnce();
  });
  it('does not request a closed or already available wizard', () => {
    window.__alloLazyQuickStartWizard = vi.fn(); open({ isOpen: false });
    expect(window.__alloLazyQuickStartWizard).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
    window.AlloModules.QuickStartWizard = readyWizard; open();
    expect(host.textContent).toContain('Setup ready'); expect(window.__alloLazyQuickStartWizard).not.toHaveBeenCalled();
  });
  it('detects legacy registration without an event and preserves loading close controls', () => {
    const onClose = vi.fn(); window.__alloLazyQuickStartWizard = vi.fn(); open({ onClose });
    act(() => host.querySelector('button').click()); expect(onClose).toHaveBeenCalledOnce();
    window.AlloModules.QuickStartWizard = readyWizard;
    act(() => vi.advanceTimersByTime(200)); expect(host.textContent).toContain('Setup ready');
  });
});
