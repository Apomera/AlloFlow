// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];

// Exercise the real host's hooks, setter, setup callback and runtime prop.
// The surrounding application services are irrelevant to session ownership.
const makeHost = path => {
  const source = readFileSync(path, 'utf8');
  const start = source.indexOf('const wordSoundsSetupReviewEpoch =');
  const end = source.indexOf('const setWsActivitySequence =', start);
  const callbackStart = source.indexOf('onShowReview={');
  const callbackEnd = source.indexOf('\n              }}', callbackStart);
  const callback = source.slice(callbackStart + 'onShowReview={'.length, callbackEnd) + '\n}';
  const runtimeSetter = source.match(/setWsPreloadedWords: ([^\r\n]+),\r?\n(?:\s+reviewAuthoringSession: [^\r\n]+,\r?\n)?\s+wordSoundsActivity/);
  if ([start, end, callbackStart, callbackEnd].some(index => index < 0) || !runtimeSetter) throw new Error(`Missing host seam in ${path}`);
  return new Function('React', `
    const {useRef, useEffect} = React;
    const setTimeout = callback => callback();
    return function Host({initialWords, resourceId, capture}) {
      const [wsPreloadedWords, setWords] = React.useState(initialWords);
      const generatedContent = {id:resourceId}, isWordSoundsMode = true, wsActivitySequence = ['syllable_counting'];
      const wsDispatch = action => setWords(action.value);
      const setIsWordSoundsMode = () => {}, setWordSoundsActivity = () => {}, setWordSoundsAutoReview = () => {}, setActiveView = () => {};
      ${source.slice(start, end)}
      const onShowReview = ${callback};
      const runtimeUpdate = ${runtimeSetter[1]};
      capture({words:wsPreloadedWords, session:wordSoundsSetupReviewSession, externalUpdate:setWsPreloadedWords, onShowReview, runtimeUpdate});
      return null;
    };
  `)(React);
};

let root, container, state, props, Host;
const render = async next => {
  props = {...props, ...next};
  await act(async () => root.render(React.createElement(Host, props)));
};
const update = action => act(async () => action(state));
const seedPendingWork = session => {
  session.counts = {'en:fire':{count:1}, 'en-gb:apple':{count:2}};
  session.audio = {'en:fire':{base64:'custom-clip'}};
  session.recordings = {'["fire","en"]':{syllables:['fire']}};
  session.detached = {'en-gb:apple':{count:{count:2}}};
  session.selection = new Set(['apple', 'fire']);
};
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  props = {initialWords:[{word:'apple'},{word:'table'}],resourceId:'pack-a',capture:value=>{state=value;}};
});
afterEach(() => {
  act(() => root.unmount()); container.remove(); vi.unstubAllGlobals();
});

for (const path of hosts) describe(path, () => {
  beforeEach(() => { Host = makeHost(path); });

  it('retains custom approvals, other locales and selection during the authorized Review Words handoff', async () => {
    await render();
    const session = state.session; seedPendingWork(session);
    const approvedPack = state.words.map(word => ({...word, reviewed:true}));
    await update(state => state.onShowReview(approvedPack));
    expect(state.words).toBe(approvedPack);
    expect(state.session).toBe(session);
    expect(state.session.counts['en:fire'].count).toBe(1);
    expect(state.session.counts['en-gb:apple'].count).toBe(2);
    expect([...state.session.selection]).toEqual(['apple','fire']);
  });

  it('keeps untransferred work through runtime edits and reordering before Back to Setup', async () => {
    await render();
    const session = state.session; seedPendingWork(session);
    await update(state => state.onShowReview(state.words.map(word => ({...word, reviewed:true}))));
    await update(state => state.runtimeUpdate(words => words.map(word => word.word === 'apple' ? {...word,count:3} : word)));
    await update(state => state.runtimeUpdate(words => [...words].reverse()));
    await render();
    expect(state.session).toBe(session);
    expect(state.words.map(word=>word.word)).toEqual(['table','apple']);
    expect(state.words[1].count).toBe(3);
    expect(state.session.audio['en:fire'].base64).toBe('custom-clip');
    expect(state.session.recordings).toBe(session.recordings);
    expect(state.session.detached).toBe(session.detached);
  });

  it('resets for a direct runtime pack replacement even when its word list matches', async () => {
    await render();
    const session = state.session; seedPendingWork(session);
    await update(state => state.onShowReview(state.words.map(word => ({...word, reviewed:true}))));
    await update(state => state.runtimeUpdate(state.words.map(word => ({...word, fromOtherPack:true}))));
    expect(state.session).not.toBe(session);
    expect(state.session.counts).toBeUndefined();
    expect(state.session.selection).toBeUndefined();
  });

  it('does not treat unmarked external functional updates as an authorized handoff', async () => {
    await render();
    const session = state.session; seedPendingWork(session);
    await update(state => state.externalUpdate(words => words.map(word => ({...word, external:true}))));
    expect(state.session).not.toBe(session);
    expect(state.session.counts).toBeUndefined();
  });

  it('does not revive old approvals when a runtime handler retains an older setter closure', async () => {
    await render();
    const original = state.session; seedPendingWork(original);
    const heldRuntimeUpdate = state.runtimeUpdate;
    await update(state => state.externalUpdate([{word:'table'}]));
    const current = state.session;
    current.counts = {'en:currentcustom':{count:3}};
    await update(() => heldRuntimeUpdate(words => words.map(word => ({...word,edited:true}))));
    expect(state.session).toBe(current);
    expect(state.session).not.toBe(original);
    expect(state.session.counts['en:fire']).toBeUndefined();
    expect(state.session.counts['en:currentcustom'].count).toBe(3);
  });

  it('uses current resource ownership when an older runtime setter updates the new resource', async () => {
    await render();
    const heldRuntimeUpdate = state.runtimeUpdate;
    await render({resourceId:'pack-b'});
    const current = state.session; seedPendingWork(current);
    await update(() => heldRuntimeUpdate(words => words.map(word => ({...word,edited:true}))));
    expect(state.session).toBe(current);
    expect(state.session.counts['en:fire'].count).toBe(1);
  });

  it('does not revive old approvals when replacement and an older runtime callback share a render batch', async () => {
    await render();
    const original = state.session; seedPendingWork(original);
    const heldRuntimeUpdate = state.runtimeUpdate;
    await update(state => {
      state.externalUpdate([{word:'table'}]);
      heldRuntimeUpdate(words => words.map(word => ({...word,edited:true})));
    });
    expect(state.words).toEqual([{word:'table',edited:true}]);
    expect(state.session).not.toBe(original);
    expect(state.session.counts).toBeUndefined();
  });

  it('keeps current ownership through an external no-op followed by a local edit in one batch', async () => {
    await render();
    const current = state.session; seedPendingWork(current);
    await update(state => {
      state.externalUpdate(words => words);
      state.runtimeUpdate(words => words.map(word => ({...word,edited:true})));
    });
    expect(state.session).toBe(current);
    expect(state.session.counts['en:fire'].count).toBe(1);
  });

  it('clears retained ownership when changing resources and never revives it on returning', async () => {
    await render();
    const first = state.session; seedPendingWork(first);
    await update(state => state.onShowReview(state.words.map(word => ({...word, reviewed:true}))));
    await render({resourceId:'pack-b'});
    const second = state.session;
    expect(second).not.toBe(first);
    expect(second.counts).toBeUndefined();
    await render({resourceId:'pack-a'});
    expect(state.session).not.toBe(first);
    expect(state.session).not.toBe(second);
    expect(state.session.counts).toBeUndefined();
  });

  it('retains work through incidental rerenders but resets on external arrays with the same words', async () => {
    await render();
    const session = state.session; seedPendingWork(session);
    await render();
    expect(state.session).toBe(session);
    await update(state => state.externalUpdate(state.words.map(word => ({...word}))));
    expect(state.session).not.toBe(session);
    expect(state.session.audio).toBeUndefined();
  });
});
