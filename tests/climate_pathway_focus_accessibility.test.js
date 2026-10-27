import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const paths = ['stem_lab/stem_tool_climateExplorer.js', 'desktop/web-app/public/stem_lab/stem_tool_climateExplorer.js'];
const disposers = [];
let frames;

function mountTool(path, seed = {}, options = {}) {
  resetStemLab();
  const config = loadTool(path, 'climateExplorer');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), announce = vi.fn(), toast = vi.fn();
  let current, patch;
  function Host() {
    const [data, setData] = React.useState({ climateExplorer: { tab: 'pathways', heroMotionPaused: true, ...seed } });
    current = data.climateExplorer;
    patch = value => setData(previous => ({ ...previous, climateExplorer: { ...previous.climateExplorer, ...value } }));
    return config.render(makeCtx({ ...options, toolData:data,setToolData:setData,announceToSR:announce,addToast:toast }));
  }
  act(() => root.render(React.createElement(Host)));
  disposers.push(() => { act(() => root.unmount()); host.remove(); });
  return { host, announce, toast, state: () => current,
    patch: value => act(() => patch(value)),
    patchPath: value => act(() => patch({ pathway: { ...current.pathway, ...value } })),
    one: selector => host.querySelector(selector), all: selector => [...host.querySelectorAll(selector)] };
}
async function settle() {
  await act(async () => {
    await Promise.resolve(); vi.runOnlyPendingTimers();
    frames.splice(0).forEach(callback => callback(16)); await Promise.resolve();
  });
}
async function activate(button) {
  expect(button).toBeTruthy(); expect(button.disabled).toBe(false);
  button.focus(); act(() => button.click()); await settle();
}
function deferredReading() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
async function finishReading(reading, outcome, text = 'A completed classroom reading.') {
  await act(async () => {
    if (outcome === 'resolved') reading.resolve(text);
    else reading.reject(new Error('Local test reader unavailable'));
    await Promise.resolve(); await Promise.resolve();
  });
  await settle();
}
function expectFocusedRegion(view, id) {
  const region = view.one('#' + id);
  expect(region).toBeTruthy(); expect(region.tabIndex).toBe(-1);
  expect(region.getAttribute('role')).toBe('region');
  expect(region.hasAttribute('data-ce-focus')).toBe(true);
  expect(document.activeElement).toBe(region);
  const title = view.one('#' + region.getAttribute('aria-labelledby'));
  expect(title?.textContent.trim()).toBeTruthy(); expect(title.tagName).toBe('H3');
  const descriptions = region.getAttribute('aria-describedby').split(/\s+/).map(id => view.one('#' + id));
  expect(descriptions.every(node => node && node.textContent.trim())).toBe(true);
  return region;
}
async function reachPhase(view, phase) {
  if (phase === 'setup') return;
  await activate(view.one('#ce-pathway-start'));
  if (phase === 'year') return;
  view.patchPath({ maxYears: 1 }); await settle();
  await activate(view.one('#ce-pathway-end-period'));
  await activate(view.one('#ce-pathway-advance'));
}

beforeEach(() => {
  vi.useFakeTimers(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); frames = [];
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(async () => {
  disposers.splice(0).forEach(dispose => dispose()); await settle();
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe.each(paths)('Climate pathway accessibility: %s', path => {
  it('preserves focus on initial render, difficulty changes, and unrelated updates', async () => {
    const outside = document.createElement('button'); document.body.appendChild(outside); outside.focus();
    disposers.push(() => outside.remove());
    const view = mountTool(path); await settle();
    expect(document.activeElement).toBe(outside);
    const difficulty = view.all('#ce-pathway-setup button').find(button => button.textContent.includes('Optimistic Pathway'));
    await activate(difficulty);
    expect(document.activeElement).toBe(difficulty);
    expect(view.state().pathway.difficulty).toBe('optimist');
    view.patch({ exportedReport: 'Retained report' }); await settle();
    expect(document.activeElement).toBe(difficulty);
    expect(view.announce).not.toHaveBeenCalled();
  });

  it('focuses each real campaign phase through all eight periods, replay, and reset', async () => {
    const view = mountTool(path);
    await activate(view.one('#ce-pathway-start'));
    expectFocusedRegion(view, 'ce-pathway-year');
    expect(view.one('#ce-pathway-year-title').textContent).toContain('2025-2029');
    expect(view.one('#ce-pathway-year-difficulty').textContent).toBe('Realistic Pathway');
    const campaignSeed = view.state().pathway.seed;
    for (let period = 1; period <= 8; period++) {
      expect(view.state().pathway).toMatchObject({ phase: 'year', year: period });
      await activate(view.one('#ce-pathway-end-period'));
      expectFocusedRegion(view, 'ce-pathway-review');
      expect(view.state().pathway.yearLog).toHaveLength(period);
      expect(view.one('#ce-pathway-review-title').textContent).toContain(view.state().pathway.lastEvent.name);
      await activate(view.one('#ce-pathway-advance'));
      expectFocusedRegion(view, period === 8 ? 'ce-pathway-debrief' : 'ce-pathway-year');
    }
    expect(view.state().pathway.phase).toBe('debrief');
    const completed = view.state().pathway;
    await activate(view.one('#ce-pathway-replay'));
    expectFocusedRegion(view, 'ce-pathway-year');
    expect(view.state().pathway).toMatchObject({ phase: 'year', year: 1, seed: campaignSeed, difficulty: completed.difficulty, yearLog: [] });
    view.patch({ pathway: completed }); await settle();
    await activate(view.one('#ce-pathway-reset'));
    expectFocusedRegion(view, 'ce-pathway-setup');
    expect(view.state().pathway).toMatchObject({ phase: 'setup', year: 1, yearLog: [], deepDiveSector: null });
    expect(view.announce).not.toHaveBeenCalled();
    expect(view.toast).not.toHaveBeenCalled();
  }, 30000);

  it.each(['setup', 'year', 'debrief'])('names deep-dive controls and returns to the exact %s invoker', async phase => {
    const view = mountTool(path); await reachPhase(view, phase);
    const panel = view.one('#ce-pathway-deep-dive');
    expect(panel).toBeTruthy(); expect(panel.hidden).toBe(true);
    for (const [sector, name] of [['transportation', 'Transportation'], ['energyGrid', 'Energy Grid']]) {
      const trigger = view.one('#ce-pathway-deep-dive-' + phase + '-' + sector);
      expect(trigger.getAttribute('aria-label')).toBe('Sector deep-dive for ' + name);
      expect(trigger.getAttribute('aria-controls')).toBe('ce-pathway-deep-dive');
      expect(trigger.getAttribute('aria-expanded')).toBe('false'); expect(trigger.type).toBe('button');
      await activate(trigger);
      expectFocusedRegion(view, 'ce-pathway-deep-dive');
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(view.state().pathway.deepDiveTriggerId).toBe(trigger.id);
      const close = view.one('#ce-pathway-deep-dive-close');
      expect(close.getAttribute('aria-label')).toBe('Close deep-dive for ' + name);
      await activate(close);
      expect(document.activeElement).toBe(trigger);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(view.one('#ce-pathway-deep-dive').hidden).toBe(true);
    }
  });

  it('restores the corresponding invoker for saved deep-dives without taking focus on restore', async () => {
    const view = mountTool(path); await reachPhase(view, 'year');
    const outside = document.createElement('button'); outside.id = 'unrelated-control'; document.body.appendChild(outside); outside.focus();
    disposers.push(() => outside.remove());
    view.patchPath({ deepDiveSector: 'transportation', deepDiveTriggerId: outside.id }); await settle();
    expect(document.activeElement).toBe(outside);
    await activate(view.one('#ce-pathway-deep-dive-close'));
    expect(document.activeElement).toBe(view.one('#ce-pathway-deep-dive-year-transportation'));
    view.patchPath({ deepDiveSector: 'energyGrid', deepDiveTriggerId: null }); await settle();
    await activate(view.one('#ce-pathway-end-period'));
    expectFocusedRegion(view, 'ce-pathway-review');
    await activate(view.one('#ce-pathway-deep-dive-close'));
    expectFocusedRegion(view, 'ce-pathway-review');
  });

  it('keeps action focus stable and returns from a dismissed coaching tip', async () => {
    const view = mountTool(path); await reachPhase(view, 'year');
    await activate(view.one('#ce-pathway-year button[aria-label="Dismiss tip"]'));
    expectFocusedRegion(view, 'ce-pathway-year');
    expect(view.one('#ce-pathway-year button[aria-label="Dismiss tip"]')).toBeNull();
    const action = view.all('#ce-pathway-year button').find(button => button.textContent.includes('Utility-scale renewables'));
    await activate(action);
    expect(document.activeElement).toBe(action);
    expect(view.state().pathway.yearActions).toHaveLength(1);
    expect(view.announce).toHaveBeenCalledTimes(1);
    expect(view.announce.mock.calls[0][0]).toContain('hours left');
  });

  it.each([false, true])('restores a useful focus destination after dismissing an AI reading (AI available: %s)', async available => {
    const view = mountTool(path, {}, { callGemini:available?vi.fn():null });
    await reachPhase(view, 'year');
    view.patchPath({ aiReadResponse:'A retained classroom reading.' }); await settle();
    expect(view.one('#ce-pathway-ai-reread').disabled).toBe(!available);
    await activate(view.one('button[aria-label="Dismiss AI climate-policy reading"]'));
    expect(view.state().pathway.aiReadResponse).toBeNull();
    if (available) expect(document.activeElement).toBe(view.one('#ce-pathway-ai-read'));
    else expectFocusedRegion(view, 'ce-pathway-year');
  });

  it.each(['resolved', 'rejected'])('keeps focus usable while an AI re-reading is pending and %s', async outcome => {
    let finish, fail;
    const pending = new Promise((resolve, reject) => { finish = resolve; fail = reject; });
    const callGemini = vi.fn(() => pending);
    const view = mountTool(path, {}, { callGemini });
    await reachPhase(view, 'year');
    view.patchPath({ aiReadResponse:'A retained classroom reading.' }); await settle();
    await activate(view.one('#ce-pathway-ai-reread'));
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(view.state().pathway.aiReadLoading).toBe(true);
    expect(view.one('#ce-pathway-ai-reread')).toBeNull();
    expect(view.one('#ce-pathway-ai-read').disabled).toBe(true);
    expect(view.one('#ce-pathway-ai-status').getAttribute('role')).toBe('status');
    expectFocusedRegion(view, 'ce-pathway-year');

    const nextControl = view.one('#ce-pathway-end-period'); nextControl.focus();
    await act(async () => {
      if (outcome === 'resolved') finish('A new classroom reading.');
      else fail(new Error('Local test reader unavailable'));
      await Promise.resolve(); await Promise.resolve();
    });
    await settle();
    expect(view.state().pathway.aiReadLoading).toBe(false);
    expect(document.activeElement).toBe(nextControl);
    expect(view.one('#ce-pathway-ai-read').disabled).toBe(false);
    expect(view.one('#ce-pathway-ai-status')).toBeNull();
    const expectedText = outcome === 'resolved' ? 'A new classroom reading.' : 'The AI reader is offline right now. Try again in a moment.';
    expect(view.one('#ce-pathway-ai-reading').textContent).toContain(expectedText);
    expect(view.announce).toHaveBeenCalledTimes(1);
    expect(view.announce).toHaveBeenCalledWith(outcome === 'resolved' ? 'AI Climate Policy Reading complete.' : expectedText);
  });

  it.each(['resolved', 'rejected'])('preserves policy actions taken while an AI reading is pending and %s', async outcome => {
    const reading = deferredReading();
    const view = mountTool(path, {}, { callGemini:vi.fn(() => reading.promise) });
    await reachPhase(view, 'year');
    await activate(view.one('#ce-pathway-ai-read'));
    const action = view.all('#ce-pathway-year button').find(button => button.textContent.includes('Utility-scale renewables'));
    await activate(action);
    const changed = view.state().pathway;
    expect(changed.yearActions).toHaveLength(1);
    expect(changed.hoursLeft).toBeLessThan(changed.hoursPerYear);
    view.patch({ exportedReport:'Preserve this unrelated work.' }); await settle();
    view.announce.mockClear();
    await finishReading(reading, outcome);
    expect(view.state().pathway).toMatchObject({ sectors:changed.sectors,hoursLeft:changed.hoursLeft,yearActions:changed.yearActions,phase:'year',year:1,aiReadLoading:false });
    expect(view.state().exportedReport).toBe('Preserve this unrelated work.');
    expect(document.activeElement).toBe(action);
    expect(view.one('#ce-pathway-ai-reading')).not.toBeNull();
    expect(view.announce).toHaveBeenCalledTimes(1);
  });

  it.each(['resolved', 'rejected'])('ignores a late %s AI reading after the next period starts', async outcome => {
    const reading = deferredReading();
    const view = mountTool(path, {}, { callGemini:vi.fn(() => reading.promise) });
    await reachPhase(view, 'year');
    await activate(view.one('#ce-pathway-ai-read'));
    await activate(view.one('#ce-pathway-end-period'));
    await activate(view.one('#ce-pathway-advance'));
    const nextPeriod = view.state().pathway;
    expect(nextPeriod).toMatchObject({ phase:'year',year:2,aiReadLoading:false,aiReadRequestId:null });
    expect(nextPeriod.yearLog).toHaveLength(1);
    await finishReading(reading, outcome);
    expect(view.state().pathway).toEqual(nextPeriod);
    expectFocusedRegion(view, 'ce-pathway-year');
    expect(view.one('#ce-pathway-ai-reading')).toBeNull();
    expect(view.one('#ce-pathway-ai-read').disabled).toBe(false);
    expect(view.announce).not.toHaveBeenCalled();
  });

  it.each([
    ['reset', 'resolved'], ['reset', 'rejected'], ['replay', 'resolved'], ['replay', 'rejected']
  ])('keeps a new reading intact after %s when the earlier request is %s', async (restart, outcome) => {
    const oldReading = deferredReading(), newReading = deferredReading();
    const callGemini = vi.fn().mockReturnValueOnce(oldReading.promise).mockReturnValueOnce(newReading.promise);
    const view = mountTool(path, {}, { callGemini });
    await reachPhase(view, 'year');
    const originalSeed = view.state().pathway.seed;
    await activate(view.one('#ce-pathway-ai-read'));
    view.patchPath({ maxYears:1 }); await settle();
    await activate(view.one('#ce-pathway-end-period'));
    await activate(view.one('#ce-pathway-advance'));
    await activate(view.one('#ce-pathway-' + restart));
    if (restart === 'reset') await activate(view.one('#ce-pathway-start'));
    else expect(view.state().pathway.seed).toBe(originalSeed);
    await activate(view.one('#ce-pathway-ai-read'));
    const restarted = view.state().pathway;
    expect(callGemini).toHaveBeenCalledTimes(2);
    expect(restarted).toMatchObject({ phase:'year',year:1,aiReadLoading:true,yearActions:[],yearLog:[] });
    await finishReading(oldReading, outcome, 'This belongs to the old campaign.');
    expect(view.state().pathway).toEqual(restarted);
    expect(view.one('#ce-pathway-ai-status')).not.toBeNull();
    expect(view.one('#ce-pathway-ai-reading')).toBeNull();
    expect(view.announce).not.toHaveBeenCalled();
    await finishReading(newReading, 'resolved', 'This belongs to the current campaign.');
    expect(view.state().pathway).toMatchObject({ seed:restarted.seed,phase:'year',year:1,aiReadLoading:false,yearActions:[],yearLog:[] });
    expect(view.one('#ce-pathway-ai-reading').textContent).toContain('This belongs to the current campaign.');
    expect(view.announce).toHaveBeenCalledTimes(1);
    expectFocusedRegion(view, 'ce-pathway-year');
  });
});
