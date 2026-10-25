import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';

const host = readFileSync('AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
const start = host.indexOf('  const glossaryHealthTaskRef =');
const middle = host.indexOf('  const fetchReplacementSuggestion =', start);
const effect = host.indexOf('  useEffect(() => {', middle);
const end = host.indexOf('  const resilientJsonParse =', effect);
const useHealth = new Function('React', 'scope', 'with (scope) { ' + host.slice(start, middle) + host.slice(effect, end) + '; return runGlossaryHealthCheck; }');
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
let cleanup;
beforeEach(() => { vi.useFakeTimers(); window.React = React; loadAlloModule('glossary_helpers_module.js'); });
afterEach(() => { cleanup?.(); cleanup = null; vi.useRealTimers(); vi.restoreAllMocks(); });
function mount(options = {}) {
  let resource = { id: 'a', type: 'glossary', data: [{ entryId: 'leaf', term: 'Leaf', def: 'A part of a plant.' }] };
  const live = { current: {} }, registry = { current: new Map() }, speak = vi.fn();
  const requests = [], run = vi.fn(async (terms, source, deps) => {
    const request = deferred(); requests.push({ ...request, deps });
    deps.setIsRunningHealthCheck(true);
    const report = await request.promise;
    deps.setGlossaryHealthCheck(report); deps.setShowHealthCheckPanel(true); deps.setIsRunningHealthCheck(false);
    return report;
  });
  window.AlloModules.ExportHandlers = { runGlossaryHealthCheck: run };
  const scope = {
    useEffect: React.useEffect, glossaryLiveRef: live, glossaryTaskRegistryRef: registry,
    callGemini: vi.fn(), debugLog: vi.fn(), warnLog: vi.fn(),
    resolveAiCapability: () => ({ text: options.connected !== false }),
    t: key => key, addToast: vi.fn(),
    isTeacherMode: options.isTeacherMode !== false,
    setGlossaryHealthCheck: vi.fn(), setIsRunningHealthCheck: vi.fn(), setShowHealthCheckPanel: vi.fn(),
    alloBotRef: { current: { speak } },
  };
  let check, activeView = 'glossary';
  function Harness() { check = useHealth(React, { ...scope, generatedContent: resource, activeView }); return null; }
  const container = document.createElement('div'); document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  const render = (next = resource, inputText = 'Original source', view = 'glossary') => {
    activeView = view;
    resource = next; live.current = { resource, history: [], inputText, activeView };
    act(() => root.render(React.createElement(Harness)));
  };
  render(); cleanup = () => { act(() => root.unmount()); container.remove(); };
  return { scope, run, requests, speak, render, resource: () => resource, check: () => check(resource.data, 'Manual source') };
}
const advance = async ms => act(async () => vi.advanceTimersByTimeAsync(ms));
const finish = async request => act(async () => request.resolve({ summary: 'Clear definitions.', coverageGaps: [] }));

describe('glossary health-check lifecycle', () => {
  it.each([true, false])('opening and updating a prepared glossary makes no AI request (connected=%s)', async connected => {
    const view = mount({ connected }); await advance(4000);
    view.render({ ...view.resource(), data: view.resource().data.map(item => ({ ...item, image: 'new-image' })) });
    await advance(10000);
    expect(view.run).not.toHaveBeenCalled(); expect(view.speak).not.toHaveBeenCalled();
    expect(view.scope.addToast).not.toHaveBeenCalled();
  });
  it('runs an explicit connected teacher check and preserves it through image changes', async () => {
    const view = mount(); let pending; act(() => { pending = view.check(); });
    view.render({ ...view.resource(), data: view.resource().data.map(item => ({ ...item, image: 'new-image' })) });
    expect(view.run).toHaveBeenCalledOnce(); expect(view.run.mock.calls[0][1]).toBe('Manual source');
    await finish(view.requests[0]);
    await pending;
    expect(view.scope.setGlossaryHealthCheck).toHaveBeenLastCalledWith(expect.objectContaining({ summary: 'Clear definitions.' }));
  });
  it('explains a missing connection locally when an explicit request races with configuration changes', async () => {
    const view = mount({ connected: false });
    await act(async () => view.check());
    expect(view.run).not.toHaveBeenCalled(); expect(view.scope.callGemini).not.toHaveBeenCalled();
    expect(view.scope.addToast).toHaveBeenCalledWith(expect.stringContaining('AI Backend Settings'), 'info');
  });
  it('never schedules the check, or the spoken follow-up, for a student', async () => {
    const view = mount({ isTeacherMode: false }); await advance(10000);
    await act(async () => view.check());
    expect(view.run).not.toHaveBeenCalled(); expect(view.speak).not.toHaveBeenCalled();
  });
  it('cancels the old timer before a different resource opens', async () => {
    const view = mount(); await advance(2000); view.render({ id: 'reader', type: 'simplified', data: 'Text' });
    await advance(5000); expect(view.run).not.toHaveBeenCalled();
  });
  it.each(['resource switch', 'definition edit'])('ignores a late report after a %s', async change => {
    const view = mount(); act(() => { void view.check(); });
    view.render(change === 'resource switch' ? { id: 'reader', type: 'simplified', data: 'Text' }
      : { ...view.resource(), data: [{ ...view.resource().data[0], def: 'Edited definition.' }] });
    view.scope.setGlossaryHealthCheck.mockClear(); view.scope.setShowHealthCheckPanel.mockClear();
    await finish(view.requests[0]);
    expect(view.scope.setGlossaryHealthCheck).not.toHaveBeenCalled(); expect(view.scope.setShowHealthCheckPanel).not.toHaveBeenCalled();
  });
  it('cancels a spoken follow-up after opening History with the same resource loaded', async () => {
    const view = mount(); act(() => { void view.check(); }); await finish(view.requests[0]);
    view.render(view.resource(), 'Original source', 'history'); await advance(6000);
    expect(view.speak).not.toHaveBeenCalled();
  });
  it('cancels the delayed spoken follow-up when the user leaves', async () => {
    const view = mount(); act(() => { void view.check(); }); await finish(view.requests[0]);
    view.render({ id: 'reader', type: 'simplified', data: 'Text' }); await advance(6000);
    expect(view.speak).not.toHaveBeenCalled();
  });
  it('a new explicit check supersedes an earlier pending request', async () => {
    const view = mount(); act(() => { void view.check(); });
    let manual; act(() => { manual = view.check(); });
    view.scope.setGlossaryHealthCheck.mockClear(); await finish(view.requests[0]);
    expect(view.scope.setGlossaryHealthCheck).not.toHaveBeenCalled();
    await finish(view.requests[1]); await manual;
    expect(view.scope.setGlossaryHealthCheck).toHaveBeenCalledOnce();
  });
});
