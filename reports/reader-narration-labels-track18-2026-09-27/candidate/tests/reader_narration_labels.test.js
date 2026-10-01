// Truthful local audio readiness: identity, lifecycle updates, and recovery.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
import { validAudioBase64 } from './lib/audio_fixtures.js';
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
  if(window.AlloModules.KaraokeAudioStore) window.AlloModules.KaraokeAudioStore.current=null;
  for (const key of ['__alloStoreRecordedSentenceAudio', '__alloRegenerateSentenceAudio', '__alloGetReadAloudAudioSummary', '__alloInspectReadAloudAudio', '__alloPrepareReadAloud', '__alloQuarantineReadAloudAudio', '__alloReadAloudProfileRevision', '__alloGetReadAloudReadiness']) delete window[key];
});
const TEXT = 'Plants need light. Roots take in water.';
function mount(extra = {}) {
  const noop = () => {};
  let props = { ComplexityGauge: () => null, t: k => k, generatedContent: { id: 'audio-1', type: 'simplified', data: TEXT, config: { language: 'English' }, instructionalText: { form: 'adapted', role: 'supplemental' } }, selectedVoice: 'Kore', voiceSpeed: 1, leveledTextLanguage: 'English', isTeacherMode: true, isZenMode: false, interactionMode: 'read', history: [], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleSpeak: vi.fn(), cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: x => x, formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text: m }) => m }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: x => x, latestGlossary: [], setFocusedParagraphIndex: noop, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop, handleToggleIsEditingLeveledText: noop, handleSimplifiedTextChange: noop, handleFormatText: noop, handleWordClick: noop, handleQuickAddGlossary: noop, handlePhonicsClick: noop, setSelectionMenu: noop, ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const render = next => { props = { ...props, ...next }; act(() => root.render(React.createElement(View, props))); };
  render({}); return { render, get props() { return props; } };
}
const manage=()=>host.querySelector('[data-manage-narration]');
const status=(index=0)=>host.querySelector(`[data-audio-sentence-index="${index}"] [role="group"] > span`);
const open=()=>act(()=>manage().click());
const refresh=()=>act(()=>window.dispatchEvent(new CustomEvent('alloflow:karaoke-audio-updated',{detail:{resourceId:'audio-1'}})));
let states;
function setStates(next){
 states=next;
 window.__alloInspectReadAloudAudio=sentence=>{const item=states[sentence==='Plants need light.'?0:1];return typeof item==='string'?{status:item,storedUrl:item==='ready'||item==='stale'?'blob:fixture':null,source:'ai'}:item;};
 window.__alloGetReadAloudAudioSummary=()=>{const result={total:2,ready:0,stale:0,corrupt:0,missing:0,unverified:0};states.forEach(s=>{const kind=typeof s==='string'?s:s.status;result[kind]++;if(kind==='stale'&&s.unverifiedProfileFields?.length)result.unverified++;});return result;};
}
beforeEach(()=>{
 setStates(['ready','ready']);
 window.__alloGetReadAloudReadiness=async()=>({state:'session-only',resourceId:'audio-1',scope:'device-audio',total:2,ready:2,remaining:0,durableReady:0,sessionOnly:2,nextActions:['retry-save']});
});
describe('truthful narration labels',()=>{
 it.each([['stale','stale',0],['ready','stale',1],['ready','corrupt',1],['missing','missing',0]])('reports current readiness for %s/%s', (first,second,count)=>{
  setStates([first,second]);mount();expect(manage().textContent).toContain(`${count}/2 ready for playback`);
 });
 it('does not call raw storage presence ready when the summary bridge is absent',()=>{
  delete window.__alloGetReadAloudAudioSummary;mount();expect(manage().textContent).toContain('Playback readiness not verified');expect(manage().textContent).not.toContain('2/2 ready');
 });
 it.each([
  ['stale','Stored audio · settings changed'],
  [{status:'stale',storedUrl:'blob:old',unverifiedProfileFields:['voice']},'Stored audio · readiness not verified'],
  ['corrupt','Audio needs repair']
 ])('describes %j without contradictory ready wording',(state,label)=>{
  setStates([state,'ready']);mount();open();expect(status().textContent).toBe(label);expect(status().textContent).not.toContain('ready for playback');
 });
 it('keeps legacy human preview available but does not certify readiness without inspection',()=>{
  delete window.__alloInspectReadAloudAudio;window.AlloModules.KaraokeAudioStore={current:{has:()=>true,get:()=> 'blob:legacy',sourceOf:()=> 'human-teacher'}};
  mount();open();expect(status().textContent).toBe('Stored audio · readiness not verified');expect(host.querySelector('[data-preview-sentence="simplified-0"]').disabled).toBe(false);
 });
 it('subtracts a local playback failure from the badge before the shared summary updates',async()=>{
  window.__alloQuarantineReadAloudAudio=vi.fn(async()=>true);
  vi.stubGlobal('Audio',class{constructor(){this.paused=true;}play(){return Promise.reject(Object.assign(new Error('Fixture decode failure'),{name:'NotSupportedError'}));}pause(){}});
  mount();open();await act(async()=>host.querySelector('[data-preview-sentence="simplified-0"]').click());
  expect(manage().textContent).toContain('1/2 ready for playback');expect(status().textContent).toBe('Audio needs repair');
 });
 it('distinguishes ready playback from session-only storage',async()=>{
  await act(async()=>mount());open();expect(manage().textContent).toContain('2/2 ready for playback');expect(status().textContent).toBe('ready for playback');
  expect(host.querySelector('[data-review-state="audio"]').textContent).toContain('Audio available for this session');expect(host.querySelector('[data-review-state="audio"]').textContent).toContain('0 of 2 clips saved');
 });
 it.each(['adapted','original','both'])('keeps accurate readiness reachable on %s without text Edit',kind=>{
  setStates(['ready','stale']);const item=kind==='original'?window.AlloModules.InstructionalContext.createSupportedReading(TEXT,{id:'original-1',config:{language:'English'}}):null;
  const change=vi.fn(),edit=vi.fn();mount({...(item?{generatedContent:item}:{}),isCompareMode:kind==='both',handleSimplifiedTextChange:change,handleToggleIsEditingLeveledText:edit});
  expect(host.querySelectorAll('[data-manage-narration]')).toHaveLength(1);expect(manage().textContent).toContain('1/2 ready for playback');open();expect(status(1).textContent).toBe('Stored audio · settings changed');expect(host.querySelector('textarea')).toBeNull();expect(change).not.toHaveBeenCalled();expect(edit).not.toHaveBeenCalled();
 });
 it('keeps focus when a background compatibility update changes the badge',()=>{
  mount();manage().focus();setStates(['ready','stale']);refresh();expect(manage().textContent).toContain('1/2 ready for playback');expect(document.activeElement).toBe(manage());
 });
 it('names the automatic capture setting and explains persistence without clearing clips',()=>{
  mount();const checkbox=host.querySelector('[data-narration-tools] input[type="checkbox"]');expect(checkbox.closest('label').textContent).toContain('Save TTS as it plays');
  expect(checkbox.getAttribute('aria-label')).toBeNull();const help=document.getElementById(checkbox.getAttribute('aria-describedby'));expect(help.textContent).toContain('Turning it off keeps existing clips');expect(help.textContent).toContain('device-save status');
  act(()=>checkbox.click());expect(checkbox.checked).toBe(false);expect(manage().textContent).toContain('2/2 ready for playback');
 });
});
