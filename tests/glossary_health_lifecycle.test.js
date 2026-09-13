import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';

const host = readFileSync('AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
const start = host.indexOf('  const glossaryHealthCheckIdRef =');
const middle = host.indexOf('  const fetchReplacementSuggestion =', start);
const effect = host.indexOf('  useEffect(() => {\n      const resource = glossaryLiveRef.current.resource;', middle);
const end = host.indexOf('  const resilientJsonParse =', effect);
const useHealth = new Function('React', 'scope', 'with (scope) { ' + host.slice(start, middle) + host.slice(effect, end) + '; return runGlossaryHealthCheck; }');
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
let cleanup;
beforeEach(() => { vi.useFakeTimers(); window.React = React; loadAlloModule('glossary_helpers_module.js'); });
afterEach(() => { cleanup?.(); cleanup = null; vi.useRealTimers(); vi.restoreAllMocks(); });
function mount() {
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
  it('keeps the scheduled check through image/history updates and reads the latest source', async () => {
    const view = mount(); await advance(2000);
    view.render({ ...view.resource(), data: view.resource().data.map(item => ({ ...item, image: 'new-image' })) }, 'Latest source');
    await advance(1000);
    expect(view.run).toHaveBeenCalledOnce(); expect(view.run.mock.calls[0][1]).toBe('Latest source');
    await finish(view.requests[0]);
    expect(view.scope.setGlossaryHealthCheck).toHaveBeenLastCalledWith(expect.objectContaining({ summary: 'Clear definitions.' }));
  });
  it('cancels the old timer before a different resource opens', async () => {
    const view = mount(); await advance(2000); view.render({ id: 'reader', type: 'simplified', data: 'Text' });
    await advance(5000); expect(view.run).not.toHaveBeenCalled();
  });
  it.each(['resource switch', 'definition edit'])('ignores a late report after a %s', async change => {
    const view = mount(); await advance(3000);
    view.render(change === 'resource switch' ? { id: 'reader', type: 'simplified', data: 'Text' }
      : { ...view.resource(), data: [{ ...view.resource().data[0], def: 'Edited definition.' }] });
    view.scope.setGlossaryHealthCheck.mockClear(); view.scope.setShowHealthCheckPanel.mockClear();
    await finish(view.requests[0]);
    expect(view.scope.setGlossaryHealthCheck).not.toHaveBeenCalled(); expect(view.scope.setShowHealthCheckPanel).not.toHaveBeenCalled();
  });
  it('cancels a spoken follow-up after opening History with the same resource loaded', async () => {
    const view = mount(); await advance(3000); await finish(view.requests[0]);
    view.render(view.resource(), 'Original source', 'history'); await advance(6000);
    expect(view.speak).not.toHaveBeenCalled();
  });
  it('cancels the delayed spoken follow-up when the user leaves', async () => {
    const view = mount(); await advance(3000); await finish(view.requests[0]);
    view.render({ id: 'reader', type: 'simplified', data: 'Text' }); await advance(6000);
    expect(view.speak).not.toHaveBeenCalled();
  });
  it('a manual replacement check supersedes a running automatic check', async () => {
    const view = mount(); await advance(3000);
    let manual; act(() => { manual = view.check(); });
    view.scope.setGlossaryHealthCheck.mockClear(); await finish(view.requests[0]);
    expect(view.scope.setGlossaryHealthCheck).not.toHaveBeenCalled();
    await finish(view.requests[1]); await manual;
    expect(view.scope.setGlossaryHealthCheck).toHaveBeenCalledOnce();
  });
});
