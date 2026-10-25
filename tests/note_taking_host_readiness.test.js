import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
const babel = require('@babel/core');
const shell = readFileSync('AlloFlowANTI.txt', 'utf8');
function section(start, end) {
  const a = shell.indexOf(start), b = shell.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error('Missing actual note-taking readiness implementation');
  return shell.slice(a, b);
}
const compiled = babel.transformSync(
  section('// NOTE_TAKING_HOST_READINESS_START', '// NOTE_TAKING_HOST_READINESS_END') + '\n' +
  section('function _alloWatchModuleChanges(', '// MODULE_GATE_WATCH_END'),
  { plugins: ['@babel/plugin-transform-react-jsx'] },
).code;
const Panel = new Function('React', 'window', compiled + '\nreturn NoteTakingHostView;')(React, window);
const ensureSource = section('window.__alloEnsureLazyModule = function(', '// Shared word presentation loads on demand');
const installEnsure = () => new Function('window', 'var __alloLazyEnsurePromises = {};\n' + ensureSource)(window);
const notify = () => window.dispatchEvent(new Event('alloflow:module-registry-changed'));
let root, container, receivedProps;
const resource = { id: 'portfolio', type: 'note-taking', data: { notes: [{ text: '' }] } };
const responseChange = vi.fn();
const props = { generatedContent: resource, activeProfileId: 'learner', studentResponses: { portfolio: 'kept work' }, onResponseChange: responseChange, allowRuntimeAi: false, handleNoteUpdate: vi.fn(), t: key => key };
function registerNotes() {
  window.AlloModules.NoteTakingView = viewProps => React.createElement('div', { 'data-ready': 'true' }, viewProps.generatedContent.id);
  window.__alloModuleRegistry.NoteTakingTemplatesModule = { status: 'loaded' };
}
function registerBoundary() {
  window.AlloModules.StudioResponse = { Boundary: boundaryProps => { receivedProps = boundaryProps; return React.createElement(boundaryProps.View, boundaryProps); } };
  window.__alloModuleRegistry.StudioResponseModule = { status: 'loaded' };
}
async function mount() {
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  await act(async () => root.render(React.createElement(Panel, props)));
}
beforeEach(() => {
  vi.useFakeTimers(); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  receivedProps = null; window.AlloModules = {}; window.__alloModuleRegistry = {};
  installEnsure();
  window.__alloPromoteModule = vi.fn(name => { window.__alloModuleRegistry[name] = { status: 'pending' }; notify(); return true; });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; container?.remove();
  // Complete shared loader waits; these belong to the host, not the closed view.
  registerNotes(); registerBoundary(); await act(async () => notify());
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks();
  delete window.__alloEnsureLazyModule; delete window.__alloPromoteModule;
});
describe('actual note-taking host with the real shared lazy wait', () => {
  it('requests both cold dependencies immediately and shows an accessible loading state', async () => {
    await mount();
    expect(window.__alloPromoteModule.mock.calls.map(call => call[0])).toEqual(['NoteTakingTemplatesModule', 'StudioResponseModule']);
    expect(container.querySelector('[role="status"]')?.getAttribute('aria-busy')).toBe('true');
    expect(container.textContent).toContain('Loading your notes');
  });
  it('waits for both exports, then preserves the response boundary and every host prop', async () => {
    await mount(); await act(async () => { registerNotes(); notify(); });
    expect(container.querySelector('[data-ready]')).toBeNull();
    await act(async () => { registerBoundary(); notify(); });
    expect(container.querySelector('[data-ready]')?.textContent).toBe(resource.id);
    for (const [key, value] of Object.entries(props)) expect(receivedProps[key]).toBe(value);
    expect(receivedProps.View).toBe(window.AlloModules.NoteTakingView);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('promotes only the missing dependency and does not reload an already ready notebook', async () => {
    registerNotes(); await mount();
    expect(window.__alloPromoteModule.mock.calls.map(call => call[0])).toEqual(['StudioResponseModule']);
    await act(async () => { registerBoundary(); notify(); });
    await act(async () => root.unmount()); root = null; container.remove();
    window.__alloPromoteModule.mockClear(); await mount();
    expect(window.__alloPromoteModule).not.toHaveBeenCalled();
    expect(container.querySelector('[data-ready]')).not.toBeNull();
  });
  it('shows failure and retries only missing modules without changing learner work', async () => {
    registerNotes(); await mount();
    await act(async () => { window.__alloModuleRegistry.StudioResponseModule.status = 'failed'; notify(); });
    expect(container.textContent).toContain('could not load');
    window.__alloPromoteModule.mockImplementation(name => { expect(name).toBe('StudioResponseModule'); registerBoundary(); notify(); return true; });
    await act(async () => container.querySelector('button').click());
    expect(container.querySelector('[data-ready]')).not.toBeNull();
    expect(receivedProps.studentResponses).toBe(props.studentResponses);
    expect(responseChange).not.toHaveBeenCalled();
  });
  it('discovers loaders installed after mount and handles synchronous registration', async () => {
    delete window.__alloEnsureLazyModule; delete window.__alloPromoteModule;
    await mount(); installEnsure();
    window.__alloPromoteModule = vi.fn(name => { name === 'NoteTakingTemplatesModule' ? registerNotes() : registerBoundary(); notify(); return true; });
    await act(async () => vi.advanceTimersByTime(100));
    expect(window.__alloPromoteModule).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[data-ready]')).not.toBeNull(); expect(vi.getTimerCount()).toBe(0);
  });
  it('recognizes legacy registration without a registry event', async () => {
    await mount(); registerNotes(); registerBoundary();
    await act(async () => vi.advanceTimersByTime(100));
    expect(container.querySelector('[data-ready]')).not.toBeNull();
  });
  it('offers retry if no loader becomes available and recovers when it is installed', async () => {
    delete window.__alloEnsureLazyModule; await mount();
    await act(async () => vi.advanceTimersByTime(5000));
    expect(container.textContent).toContain('could not load'); expect(vi.getTimerCount()).toBe(0);
    installEnsure(); window.__alloPromoteModule.mockImplementation(name => { name === 'NoteTakingTemplatesModule' ? registerNotes() : registerBoundary(); notify(); return true; });
    await act(async () => container.querySelector('button').click());
    expect(container.querySelector('[data-ready]')).not.toBeNull();
  });
  it('cleans view listeners and polling on navigation and ignores late completion', async () => {
    const add = vi.spyOn(window, 'addEventListener'), remove = vi.spyOn(window, 'removeEventListener');
    delete window.__alloEnsureLazyModule; await mount();
    const callbacks = add.mock.calls.filter(([name]) => name === 'alloflow:module-registry-changed').map(([, fn]) => fn);
    expect(callbacks).toHaveLength(2);
    await act(async () => root.unmount()); root = null;
    callbacks.forEach(fn => expect(remove).toHaveBeenCalledWith('alloflow:module-registry-changed', fn));
    expect(vi.getTimerCount()).toBe(0);
    registerNotes(); registerBoundary(); await act(async () => notify());
    expect(container.childNodes).toHaveLength(0);
  });
  it('mounts the readiness wrapper from the actual note-taking host branch', () => {
    const branch = section("{activeView === 'note-taking'", "{activeView === 'anchor-chart'");
    expect(branch).toContain('React.createElement(NoteTakingHostView');
    expect(branch).not.toContain('&& window.AlloModules');
    expect(branch).toContain("key: generatedContent.id + ':' + selectedProfileId + ':' + isTeacherMode");
    expect(branch).toContain('onResponseChange: (id, response) => handleStudentInput(id, \'studio\', response)');
  });
});
