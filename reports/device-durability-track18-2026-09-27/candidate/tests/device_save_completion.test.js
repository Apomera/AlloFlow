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

describe('device save completion follows current readback',()=>{
 it('reports a delayed autosave failure and clears it only after verified recovery',async()=>{
  await render();window.__alloRetryReadAloudPersistence.mockResolvedValue(false);await click(retry());
  await dispatch('alloflow:offline-media-persistence',{status:'failed',verified:false});expect(host.textContent).toContain('could not be completed');
  await dispatch('alloflow:offline-media-persistence',{status:'saved',verified:true});expect(host.textContent).toContain('could not be completed');
  window.__alloGetReadAloudReadiness.mockResolvedValue(result({durableReady:2}));await dispatch('alloflow:offline-media-persistence',{status:'saved',verified:true});expect(host.textContent).not.toContain('could not be completed');
 });
 it('keeps save ownership when attachment replaces only the resource payload object',async()=>{
  const pending=deferred();await render(props({payload:{old:true}}));window.__alloRetryReadAloudPersistence.mockReturnValueOnce(pending.promise);await click(retry());
  const signal=window.__alloRetryReadAloudPersistence.mock.calls[0][1].signal;await render(props({payload:{attached:true}}));expect(signal.aborted).toBe(false);
  window.__alloGetReadAloudReadiness.mockResolvedValue(result({durableReady:2}));await act(async()=>pending.resolve(false));expect(host.textContent).toContain('All currently ready');
 });
 it.each([false,undefined,null,{status:'attached'},{status:'saved',verified:true}])('does not label an unconfirmed legacy result as failure: %j',async receipt=>{
  await render();window.__alloRetryReadAloudPersistence.mockResolvedValue(receipt);await click(retry());
  expect(host.textContent).toContain('not confirmed yet');expect(host.textContent).not.toContain('could not be completed');
  expect(status().textContent).toContain('0/2 saved');
 });
 it('announces delayed autosave completion without moving focus or generating speech',async()=>{
  await render(props({activePlayback:true}));const button=retry();button.focus();window.__alloRetryReadAloudPersistence.mockResolvedValue(false);await click(button);
  window.__alloGetReadAloudReadiness.mockResolvedValue(result({durableReady:2}));await dispatch('alloflow:offline-media-persistence',{status:'saved',verified:true});
  const notice=[...host.querySelectorAll('[role=status]')].find(el=>el.textContent.includes('All currently ready'));
  expect(notice?.getAttribute('aria-live')).toBe('polite');expect(notice?.getAttribute('aria-atomic')).toBe('true');
  expect(document.activeElement).toBe(button);expect(retry()).toBe(button);expect(host.textContent).not.toContain('could not be completed');
  for(const key of ['__alloPrepareReadAloud','__alloRegenerateSentenceAudio','__alloCaptureKaraokeAudio'])expect(window[key]).not.toHaveBeenCalled();
 });
 it('clears an actual failure once a later read verifies the selected bytes',async()=>{
  await render();window.__alloRetryReadAloudPersistence.mockRejectedValue(Error('denied'));await click(retry());expect(host.textContent).toContain('could not be completed');
  window.__alloGetReadAloudReadiness.mockResolvedValue(result({durableReady:2}));await dispatch('alloflow:offline-media-persistence');
  expect(host.textContent).not.toContain('could not be completed');expect(host.textContent).toContain('All currently ready');
 });
 it('gives current readback precedence over a failed write when the exact clips already exist',async()=>{
  window.__alloGetReadAloudReadiness.mockResolvedValue(result({durableReady:2}));await render();window.__alloRetryReadAloudPersistence.mockResolvedValue({status:'failed'});await click(retry());
  expect(host.textContent).not.toContain('could not be completed');expect(host.textContent).toContain('All currently ready');
 });
 it('keeps partial save feedback honest and notices later deletion',async()=>{
  await render();await click(retry());window.__alloGetReadAloudReadiness.mockResolvedValue(result({durableReady:1}));await dispatch('pageshow');
  expect(host.textContent).toContain('1/2 saved');expect(host.textContent).toContain('not confirmed yet');
  window.__alloGetReadAloudReadiness.mockResolvedValue(result({durableReady:2}));await dispatch('pageshow');expect(host.textContent).toContain('All currently ready');
  window.__alloGetReadAloudReadiness.mockResolvedValue(result());await dispatch('pageshow');expect(host.textContent).not.toContain('All currently ready');expect(host.textContent).toContain('0/2 saved');
 });
 it('does not imply every sentence is prepared when only the ready subset is saved',async()=>{
  window.__alloGetReadAloudReadiness.mockResolvedValue(result({ready:1,durableReady:1}));await render();await click(retry());
  expect(host.textContent).toContain('1/2 clips ready');expect(host.textContent).toContain('1/2 saved');expect(host.textContent).toContain('All currently ready');
 });
 it.each([{verifiedAt:null},{resourceId:'foreign'},{total:99}])('never announces verification for unverified or foreign results %j',async invalid=>{
  await render();window.__alloGetReadAloudReadiness.mockResolvedValue(result({durableReady:2,...invalid}));await click(retry());
  expect(host.textContent).not.toContain('All currently ready');expect(host.textContent).toContain('could not be verified');
 });
 it('settles a superseded hung read so retry becomes available again',async()=>{
  vi.useFakeTimers();await render();window.__alloGetReadAloudReadiness.mockReturnValueOnce(new Promise(()=>{}));await click(retry());expect(retry().getAttribute('aria-busy')).toBe('true');
  window.__alloGetReadAloudReadiness.mockResolvedValue(result({durableReady:2}));await dispatch('alloflow:offline-media-persistence');
  expect(retry().getAttribute('aria-busy')).toBe('false');expect(host.textContent).toContain('All currently ready');
  await act(async()=>vi.advanceTimersByTimeAsync(15001));expect(host.textContent).not.toContain('could not be completed');
 });
 it('drops late completion and aborts a save after a same-resource clip replacement',async()=>{
  let revision=0,listener;window.AlloModules.KaraokeAudioStore={current:{getRevision:()=>revision,subscribe:fn=>{listener=fn;return()=>{};}}};
  const pending=deferred();await render();window.__alloRetryReadAloudPersistence.mockReturnValueOnce(pending.promise);await click(retry());
  const signal=window.__alloRetryReadAloudPersistence.mock.calls[0][1].signal;await act(async()=>{revision++;listener();});
  expect(signal.aborted).toBe(true);expect(retry().getAttribute('aria-busy')).toBe('false');await act(async()=>pending.resolve(true));
  expect(host.textContent).not.toContain('All currently ready');expect(host.textContent).not.toContain('not confirmed yet');
 });
 it('clears old completion feedback when a new payload or store is selected',async()=>{
  window.__alloGetReadAloudReadiness.mockResolvedValue(result({durableReady:2}));await render();await click(retry());expect(host.textContent).toContain('All currently ready');
  window.__alloGetReadAloudReadiness.mockResolvedValue(result());await render(props({payload:{changed:true}}));expect(host.textContent).not.toContain('All currently ready');
 });
 it('reports read errors without claiming the write failed or enabling speech generation',async()=>{
  await render();window.__alloGetReadAloudReadiness.mockRejectedValue(Error('read denied'));await click(retry());
  expect(host.textContent).toContain('could not be verified');expect(host.textContent).not.toContain('could not be completed');
 });
});
