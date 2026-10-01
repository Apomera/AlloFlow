import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, act, createRoot, host, root, Component;
const entries = [{ text: 'Again.', occurrence: 0, language: 'English' }, { text: 'Again.', occurrence: 1, language: 'English' }];
const props = overrides => ({ resourceId: 'one', contextKey: 'context', entries, profile: {voice:'Kore',speed:1,synthesisRate:1}, ...overrides });
const result = overrides => ({ resourceId:'one', scope:'device-audio', total:2, ready:2, durableReady:0, sessionOnly:2, verifiedAt:'2026-09-27T00:00:00Z', ...overrides });
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return {promise,resolve}; };
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({act} = require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));
  ({createRoot} = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('resource_read_aloud_module.js'); Component = window.AlloModules.ResourceReadAloud.DeviceSaveStatus;
});
beforeEach(() => {
  window.__alloGetReadAloudReadiness = vi.fn(async () => result());
  window.__alloRetryReadAloudPersistence = vi.fn(async () => true);
  window.__alloPrepareReadAloud = vi.fn(); window.__alloRegenerateSentenceAudio = vi.fn(); window.__alloCaptureKaraokeAudio = vi.fn();
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  delete window.AlloModules.KaraokeAudioStore;
  for (const key of ['__alloGetReadAloudReadiness','__alloRetryReadAloudPersistence','__alloPrepareReadAloud','__alloRegenerateSentenceAudio','__alloCaptureKaraokeAudio']) delete window[key];
  vi.useRealTimers();
});
async function render(input = props()) {
  if (!root) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); }
  await act(async () => root.render(React.createElement(Component,input)));
}
const status = () => host.querySelector('[data-device-audio-count]');
const retry = () => host.querySelector('[data-device-audio-retry]');
const check = () => host.querySelector('[data-device-audio-check]');
const click = async button => act(async () => button.click());
const dispatch = async (type,detail={}) => act(async () => window.dispatchEvent(new CustomEvent(type,{detail})));
describe('device readback and persistence-only retry', () => {
  it('keeps playable and saved counts separate with duplicate identities and synthesis settings', async () => {
    await render(); expect(status().textContent).toBe('2/2 clips ready to play. 0/2 saved on this device.');
    expect(window.__alloGetReadAloudReadiness).toHaveBeenCalledWith(['Again.','Again.'],'reference',{entries,profile:props().profile});
  });
  it('requires a verified readback timestamp before claiming any saved count', async () => {
    window.__alloGetReadAloudReadiness.mockResolvedValue(result({durableReady:2,verifiedAt:null})); await render();
    expect(status().textContent).toContain('Device save not verified.'); expect(status().textContent).not.toContain('saved on this device');
  });
  it.each([
    {resourceId:'other'}, {scope:'package'}, {total:3}, {ready:3}, {durableReady:3}, {durableReady:-1}
  ])('rejects a mismatched or invalid result %j', async invalid => {
    window.__alloGetReadAloudReadiness.mockResolvedValue(result(invalid)); await render();
    expect(status().textContent).toBe('Device save not verified.');
  });
  it('does not promote a successful write receipt when readback still lacks the clips', async () => {
    window.__alloRetryReadAloudPersistence.mockResolvedValue({status:'saved',verified:true}); await render(); await click(retry());
    expect(status().textContent).toContain('0/2 saved'); expect(window.__alloPrepareReadAloud).not.toHaveBeenCalled();
    expect(window.__alloRegenerateSentenceAudio).not.toHaveBeenCalled(); expect(window.__alloCaptureKaraokeAudio).not.toHaveBeenCalled();
  });
  it('updates verified counts after retry without removing the focused button', async () => {
    await render(); const button = retry(); button.focus();
    window.__alloGetReadAloudReadiness.mockResolvedValue(result({durableReady:2})); await click(button);
    expect(status().textContent).toContain('2/2 saved'); expect(retry()).toBe(button); expect(document.activeElement).toBe(button);
  });
  it('invokes the resource-scoped writer before a host navigation replaces it', async () => {
    await render(); const original=window.__alloRetryReadAloudPersistence, foreign=vi.fn(async()=>true);
    await act(async()=>{retry().click();window.__alloRetryReadAloudPersistence=foreign;});
    expect(original).toHaveBeenCalledTimes(1);expect(foreign).not.toHaveBeenCalled();
  });
  it.each([{status:'failed'}])('reports an unsuccessful write result %j', async answer => {
    await render(); window.__alloRetryReadAloudPersistence.mockResolvedValue(answer); await click(retry());
    expect(host.textContent).toContain('Device save could not be completed'); expect(retry().getAttribute('aria-busy')).toBe('false');
  });
  it('reports a rejected write and permits another retry', async () => {
    await render(); window.__alloRetryReadAloudPersistence.mockRejectedValue(new Error('quota')); await click(retry());
    expect(host.textContent).toContain('Device save could not be completed'); await click(retry()); expect(window.__alloRetryReadAloudPersistence).toHaveBeenCalledTimes(2);
  });
  it('guards duplicate activation synchronously and ignores a write finishing after resource change', async () => {
    const pending=deferred(); window.__alloRetryReadAloudPersistence.mockReturnValue(pending.promise); await render();
    await act(async()=>{retry().click();retry().click();}); expect(window.__alloRetryReadAloudPersistence).toHaveBeenCalledTimes(1);
    const signal=window.__alloRetryReadAloudPersistence.mock.calls[0][1].signal;
    window.__alloGetReadAloudReadiness.mockResolvedValue(result({resourceId:'two',ready:0,durableReady:0})); await render(props({resourceId:'two'}));
    expect(signal.aborted).toBe(true); await act(async()=>pending.resolve(true)); expect(status().textContent).toContain('0/2 clips ready');
    expect(retry().getAttribute('aria-busy')).toBe('false');
  });
  it('ignores out-of-order reads and foreign-resource events', async () => {
    const old=deferred(); window.__alloGetReadAloudReadiness.mockReturnValueOnce(old.promise); await render();
    await dispatch('alloflow:karaoke-audio-updated',{resourceId:'foreign'}); expect(window.__alloGetReadAloudReadiness).toHaveBeenCalledTimes(1);
    await click(check()); await act(async()=>old.resolve(result({durableReady:2})));
    expect(status().textContent).toContain('0/2 saved');
  });
  it('invalidates readback when audio bytes change while a check is pending', async () => {
    const pending=deferred(); window.__alloGetReadAloudReadiness.mockReturnValueOnce(pending.promise); await render(props({payload:{v:1}}));
    await render(props({payload:{v:2}})); await act(async()=>pending.resolve(result({durableReady:2}))); expect(status().textContent).toContain('0/2 saved');
  });
  it('rechecks store mutations and clears its subscription on unmount', async () => {
    let revision=0, listener; const unsubscribe=vi.fn(); window.AlloModules.KaraokeAudioStore={current:{getRevision:()=>revision,subscribe:fn=>{listener=fn;return unsubscribe;}}};
    await render(); window.__alloGetReadAloudReadiness.mockResolvedValue(result({durableReady:1})); await act(async()=>{revision++;listener();});
    expect(status().textContent).toContain('1/2 saved'); await act(async()=>root.unmount()); root=null; expect(unsubscribe).toHaveBeenCalled();
  });
  it('refreshes on return to the page and notices evicted persisted audio', async () => {
    window.__alloGetReadAloudReadiness.mockResolvedValue(result({durableReady:2})); await render();
    window.__alloGetReadAloudReadiness.mockResolvedValue(result()); await dispatch('pageshow'); expect(status().textContent).toContain('0/2 saved');
  });
  it('is explicit about missing APIs and recovers when the registry loads', async () => {
    delete window.__alloGetReadAloudReadiness; await render(); expect(status().textContent).toContain('not verified');
    window.__alloGetReadAloudReadiness=vi.fn(async()=>result()); await dispatch('alloflow:module-registry-changed'); expect(status().textContent).toContain('0/2 saved');
  });
  it('keeps routine status quiet during playback, but announces an explicit check', async () => {
    await render(props({activePlayback:true})); expect(status().getAttribute('aria-live')).toBe('off'); await click(check());
    expect(status().getAttribute('aria-live')).toBe('polite'); expect(status().getAttribute('aria-atomic')).toBe('true');
    expect(host.querySelector('p[role=status] button')).toBe(null);
  });
  it('bounds a hung read and a hung write, aborting the latter', async () => {
    vi.useFakeTimers(); window.__alloGetReadAloudReadiness.mockReturnValueOnce(new Promise(()=>{})); await render();
    await act(async()=>vi.advanceTimersByTimeAsync(15001)); expect(status().textContent).toBe('Device save not verified.');
    await click(check()); window.__alloRetryReadAloudPersistence.mockReturnValue(new Promise(()=>{})); await click(retry());
    const signal=window.__alloRetryReadAloudPersistence.mock.calls[0][1].signal; await act(async()=>vi.advanceTimersByTimeAsync(15001));
    expect(signal.aborted).toBe(true); expect(host.textContent).toContain('Device save could not be completed'); expect(retry().getAttribute('aria-busy')).toBe('false');
  });
});
