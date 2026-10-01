// Recording ownership, cancellation, and visible completion through route changes.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, root, host, pure, phase;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule('view_simplified_module.js');
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView;
});
beforeEach(() => { localStorage.clear(); });
afterEach(() => {
  if (root) act(() => root.unmount()); host?.remove(); root = null; host = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  for (const key of ['__alloRegenerateSentenceAudio', '__alloStoreRecordedSentenceAudio', '__alloRemoveSentenceAudio', '__alloGetReadAloudAudioSummary', '__alloInspectReadAloudAudio', '__alloPrepareReadAloud', '__alloQuarantineReadAloudAudio', '__alloReadAloudProfileRevision']) delete window[key];
  if (window.AlloModules.KaraokeAudioStore) window.AlloModules.KaraokeAudioStore.current = null;
});
const TEXT = 'Plants need light. Roots take in water.';
function mount(extra = {}) {
  const noop = () => {};
  let props = { ComplexityGauge: () => null, t: k => k, generatedContent: { id: 'audio-1', type: 'simplified', data: TEXT, config: { language: 'English' }, instructionalText: { form: 'adapted', role: 'supplemental' } }, selectedVoice: 'Kore', voiceSpeed: 1, leveledTextLanguage: 'English', isTeacherMode: true, isZenMode: false, interactionMode: 'read', history: [], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleSpeak: vi.fn(), cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: x => x, formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text: m }) => m }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: x => x, latestGlossary: [], setFocusedParagraphIndex: noop, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop, handleToggleIsEditingLeveledText: noop, handleSimplifiedTextChange: noop, handleFormatText: noop, handleWordClick: noop, handleQuickAddGlossary: noop, handlePhonicsClick: noop, setSelectionMenu: noop, ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const render = next => { props = { ...props, ...next }; act(() => root.render(React.createElement(View, props))); };
  render({}); return { render, get props() { return props; } };
}
let saved;
const toggle=()=>host.querySelector('[data-manage-narration]');
const open=()=>act(()=>toggle().click());
const buttons=(index=0)=>host.querySelector('[data-audio-sentence-index="'+index+'"]').querySelectorAll('button');
const generate=(index=0)=>buttons(index)[1];
const remove=(index=0)=>buttons(index)[3];
const notice=()=>host.querySelector('[data-edit-audio-status]');
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const refresh=()=>act(()=>window.dispatchEvent(new CustomEvent('alloflow:karaoke-audio-updated',{detail:{resourceId:'audio-1'}})));
beforeEach(()=>{
 saved=true;
 window.__alloInspectReadAloudAudio=()=>({status:saved?'ready':'missing',url:saved?'blob:fixture':null});
 window.__alloGetReadAloudAudioSummary=()=>({ready:saved?2:0,missing:saved?0:2,total:2});
});
describe('sentence audio action ownership and focus',()=>{
 it.each(['generate','remove'])('guards rapid duplicate %s activation',async kind=>{
  const pending=deferred(),api=vi.fn(()=>pending.promise);
  window[kind==='generate'?'__alloRegenerateSentenceAudio':'__alloRemoveSentenceAudio']=api;
  mount();open();const button=kind==='generate'?generate():remove();button.focus();
  await act(async()=>{button.click();button.click();});expect(api).toHaveBeenCalledOnce();
  expect(document.activeElement).toBe(button);expect(button.getAttribute('aria-busy')).toBe('true');
  await act(async()=>pending.resolve(kind==='generate'?'blob:result':false));
 });
 it('prevents generation and recording from racing an active removal',async()=>{
  const pending=deferred();window.__alloRemoveSentenceAudio=vi.fn(()=>pending.promise);
  window.__alloRegenerateSentenceAudio=vi.fn();window.__alloStoreRecordedSentenceAudio=vi.fn();
  mount();open();await act(async()=>{remove().click();generate(1).click();buttons()[2].click();});
  expect(window.__alloRegenerateSentenceAudio).not.toHaveBeenCalled();expect(window.__alloStoreRecordedSentenceAudio).not.toHaveBeenCalled();
  expect(generate(1).disabled).toBe(true);await act(async()=>pending.resolve(false));
 });
 it.each(['generate','remove'])('isolates late %s results from the next reading',async kind=>{
  const old=deferred(),current=deferred(),api=vi.fn().mockImplementationOnce(()=>old.promise).mockImplementationOnce(()=>current.promise);
  window[kind==='generate'?'__alloRegenerateSentenceAudio':'__alloRemoveSentenceAudio']=api;
  const view=mount();open();await act(async()=>(kind==='generate'?generate():remove()).click());
  const signal=api.mock.calls[0][1]?.signal;expect(signal).toBeDefined();
  view.render({generatedContent:{...view.props.generatedContent,id:'audio-2'}});open();
  expect(signal.aborted).toBe(true);await act(async()=>(kind==='generate'?generate():remove()).click());expect(api).toHaveBeenCalledTimes(2);
  await act(async()=>old.reject(new Error('Old operation failed')));
  expect((kind==='generate'?generate():remove()).getAttribute('aria-busy')).toBe('true');expect(notice().textContent).not.toContain('Could not');
  await act(async()=>current.resolve(kind==='generate'?'blob:new':true));
 });
 it.each(['text','language','voice','speed','provider'])('invalidates generation after changing %s',async changed=>{
  const pending=deferred(),api=window.__alloRegenerateSentenceAudio=vi.fn(()=>pending.promise);
  const view=mount();open();await act(async()=>generate().click());const signal=api.mock.calls[0][1]?.signal;expect(signal).toBeDefined();
  if(changed==='text')view.render({generatedContent:{...view.props.generatedContent,data:'Changed text.'}});
  if(changed==='language')view.render({generatedContent:{...view.props.generatedContent,config:{language:'Spanish'}}});
  if(changed==='voice')view.render({selectedVoice:'Puck'});
  if(changed==='speed')view.render({voiceSpeed:1.25});
  if(changed==='provider'){window.__alloReadAloudProfileRevision='different-provider';view.render({});}
  expect(signal.aborted).toBe(true);await act(async()=>pending.resolve('blob:old'));
  expect(notice().textContent).not.toContain('Audio ready');expect(generate().getAttribute('aria-busy')).toBe('false');
 });
 it.each(['generate','remove'])('aborts %s on loss of teacher eligibility',async kind=>{
  const pending=deferred(),api=vi.fn(()=>pending.promise);window[kind==='generate'?'__alloRegenerateSentenceAudio':'__alloRemoveSentenceAudio']=api;
  const view=mount();open();await act(async()=>(kind==='generate'?generate():remove()).click());const signal=api.mock.calls[0][1]?.signal;expect(signal).toBeDefined();
  view.render({isTeacherMode:false});expect(signal.aborted).toBe(true);await act(async()=>pending.resolve(true));expect(host.querySelector('[data-narration-tools]')).toBeNull();
 });
 it('preserves removal when only the AI voice changes',async()=>{
  const pending=deferred(),api=window.__alloRemoveSentenceAudio=vi.fn(()=>pending.promise);
  const view=mount();open();await act(async()=>remove().click());const signal=api.mock.calls[0][1]?.signal;expect(signal).toBeDefined();
  view.render({selectedVoice:'Puck'});expect(signal.aborted).toBe(false);expect(remove().getAttribute('aria-busy')).toBe('true');await act(async()=>pending.resolve(true));
 });
 it('does not report confirmed removal for an empty return',async()=>{
  window.__alloRemoveSentenceAudio=vi.fn(async()=>undefined);mount();open();await act(async()=>remove().click());
  expect(notice().textContent).toContain('Could not confirm audio removal');
 });
 it('keeps the busy Remove control until settlement and moves focus to Generate when it disappears',async()=>{
  const pending=deferred();window.__alloRemoveSentenceAudio=vi.fn(()=>pending.promise);mount();open();const origin=remove();origin.focus();await act(async()=>origin.click());
  saved=false;refresh();expect(remove()).toBe(origin);expect(document.activeElement).toBe(origin);
  await act(async()=>pending.resolve(true));expect(remove()).toBeUndefined();expect(document.activeElement).toBe(generate());
  expect(notice().textContent).toContain('Check device save status');
 });
 it('keeps Remove and its focus when failure leaves the clip present',async()=>{
  window.__alloRemoveSentenceAudio=vi.fn(async()=>false);mount();open();const origin=remove();origin.focus();await act(async()=>origin.click());
  expect(remove()).toBe(origin);expect(document.activeElement).toBe(origin);expect(origin.getAttribute('aria-disabled')).toBe('false');
 });
 it('preserves moved focus after a removal finishes',async()=>{
  const pending=deferred();window.__alloRemoveSentenceAudio=vi.fn(()=>pending.promise);mount();open();remove().focus();await act(async()=>remove().click());
  const close=host.querySelector('[data-close-narration]');close.focus();saved=false;refresh();await act(async()=>pending.resolve(true));expect(document.activeElement).toBe(close);
 });
 it.each(['generate','remove'])('aborts %s on unmount',async kind=>{
  const pending=deferred(),api=vi.fn(()=>pending.promise);window[kind==='generate'?'__alloRegenerateSentenceAudio':'__alloRemoveSentenceAudio']=api;
  mount();open();await act(async()=>(kind==='generate'?generate():remove()).click());const signal=api.mock.calls[0][1]?.signal;expect(signal).toBeDefined();
  act(()=>root.unmount());root=null;expect(signal.aborted).toBe(true);await act(async()=>pending.resolve(true));
 });
});
