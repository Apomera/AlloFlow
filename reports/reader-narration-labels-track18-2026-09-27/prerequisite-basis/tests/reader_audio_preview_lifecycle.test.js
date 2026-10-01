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
let players,url;
const toggle=()=>host.querySelector('[data-manage-narration]');
const open=()=>act(()=>toggle().click());
const play=()=>host.querySelector('[data-audio-sentence-index="0"] button');
const notice=()=>host.querySelector('[data-edit-audio-status]');
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const mediaError=(name='NotSupportedError')=>Object.assign(new Error('Fixture media failure'),{name});
const refresh=()=>act(()=>window.dispatchEvent(new CustomEvent('alloflow:karaoke-audio-updated',{detail:{resourceId:'audio-1'}})));
const paused=async()=>{const view=mount();open();await act(async()=>play().click());await act(async()=>play().click());expect(players[0].paused).toBe(true);return view;};
const resumeLater=async()=>{const pending=deferred(),audio=players[0];audio.play.mockImplementationOnce(()=>pending.promise);await act(async()=>play().click());return pending;};
beforeEach(()=>{
 players=[];url='blob:fixture';
 window.__alloInspectReadAloudAudio=()=>({status:url?'ready':'missing',storedUrl:url,url,source:'human-teacher'});
 window.__alloGetReadAloudAudioSummary=()=>({ready:url?2:0,missing:url?0:2,total:2});
 window.__alloQuarantineReadAloudAudio=vi.fn(async()=>true);
 vi.stubGlobal('Audio',class{
  constructor(src){this.src=src;this.paused=true;this.duration=5;this.currentTime=0;this.play=vi.fn(async()=>{this.paused=false;});this.pause=vi.fn(()=>{this.paused=true;});players.push(this);}
 });
});
describe('stored audio preview lifecycle',()=>{
 it.each(['resolve','reject'])('ignores delayed resume %s after Close',async outcome=>{
  await paused();const pending=await resumeLater();const audio=players[0];act(()=>host.querySelector('[data-close-narration]').click());const before=notice().textContent;expect(before).toContain('Audio preview stopped');
  await act(async()=>{if(outcome==='resolve'){audio.paused=false;pending.resolve();}else pending.reject(mediaError());});
  expect(audio.paused).toBe(true);expect(notice().textContent).toBe(before);expect(window.__alloQuarantineReadAloudAudio).not.toHaveBeenCalled();expect(document.activeElement).toBe(toggle());
 });
 it('ignores an old same-URL rejection after navigation and new playback',async()=>{
  const view=await paused(),pending=await resumeLater();view.render({generatedContent:{...view.props.generatedContent,id:'audio-2'}});open();await act(async()=>play().click());
  await act(async()=>pending.reject(mediaError()));expect(window.__alloQuarantineReadAloudAudio).not.toHaveBeenCalled();expect(players[1].paused).toBe(false);expect(play().getAttribute('aria-pressed')).toBe('true');expect(notice().textContent).toContain('Playing sentence');
 });
 it('guards duplicate initial Play before busy state renders',async()=>{
  const pending=deferred();const RealAudio=window.Audio;vi.stubGlobal('Audio',class extends RealAudio{constructor(src){super(src);this.play.mockImplementation(()=>pending.promise);}});
  mount();open();play().focus();await act(async()=>{play().click();play().click();});expect(players).toHaveLength(1);expect(players[0].play).toHaveBeenCalledOnce();expect(document.activeElement).toBe(play());
  await act(async()=>{players[0].paused=false;pending.resolve();});
 });
 it('guards duplicate resume and preserves its focused busy control',async()=>{
  await paused();const pending=deferred(),audio=players[0];audio.play.mockImplementation(()=>pending.promise);play().focus();await act(async()=>{play().click();play().click();});
  expect(audio.play).toHaveBeenCalledTimes(2);expect(play().getAttribute('aria-busy')).toBe('true');expect(document.activeElement).toBe(play());await act(async()=>{audio.paused=false;pending.resolve();});
 });
 it.each(['text','language'])('stops a preview when the same reading changes %s',async changed=>{
  const view=mount();open();await act(async()=>play().click());view.render({generatedContent:{...view.props.generatedContent,...(changed==='text'?{data:'Changed text.'}:{config:{language:'Spanish'}})}});
  expect(players[0].paused).toBe(true);expect(play().getAttribute('aria-pressed')).toBe('false');
 });
 it('keeps the stored-artifact preview when only AI voice changes',async()=>{
  const view=mount();open();await act(async()=>play().click());view.render({selectedVoice:'Puck'});expect(players[0].paused).toBe(false);expect(play().getAttribute('aria-pressed')).toBe('true');
 });
 it('reports one decoder failure when both error event and play rejection fire',async()=>{
  const pending=deferred();const RealAudio=window.Audio;vi.stubGlobal('Audio',class extends RealAudio{constructor(src){super(src);this.play.mockImplementation(()=>pending.promise);}});
  mount();open();await act(async()=>play().click());const audio=players[0];await act(async()=>{audio.error=mediaError();audio.onerror();pending.reject(mediaError());});
  expect(window.__alloQuarantineReadAloudAudio).toHaveBeenCalledOnce();expect(play().getAttribute('aria-pressed')).toBe('false');
 });
 it('does not report Playing if the clip ended before play settled',async()=>{
  await paused();const pending=await resumeLater(),audio=players[0];act(()=>audio.onended());await act(async()=>pending.resolve());expect(play().getAttribute('aria-pressed')).toBe('false');expect(notice().textContent).toContain('Finished');
 });
 it.each(['onended','onerror'])('ignores an obsolete %s callback on a reused element',async callback=>{
  mount();open();await act(async()=>play().click());const audio=players[0],old=audio[callback];await act(async()=>play().click());await act(async()=>play().click());
  await act(async()=>{audio.error=mediaError();old();});expect(audio.paused).toBe(false);expect(play().getAttribute('aria-pressed')).toBe('true');expect(window.__alloQuarantineReadAloudAudio).not.toHaveBeenCalled();
 });
 it.each(['playing','paused'])('stops a %s preview and moves focus to Generate when its clip disappears',async phase=>{
  mount();open();await act(async()=>play().click());if(phase==='paused')await act(async()=>play().click());play().focus();url=null;refresh();
  expect(players[0].paused).toBe(true);expect(document.activeElement).toBe(host.querySelector('[data-generate-sentence="simplified-0"]'));expect(notice().textContent).toContain('audio changed');
 });
 it('stops a replaced clip and loads its replacement on the next Play',async()=>{
  mount();open();await act(async()=>play().click());url='blob:replacement';refresh();expect(players[0].paused).toBe(true);await act(async()=>play().click());expect(players[1].src).toBe(url);
 });
 it.each(['NotAllowedError','AbortError'])('makes %s retryable without quarantine',async name=>{
  await paused();players[0].play.mockRejectedValueOnce(mediaError(name));play().focus();await act(async()=>play().click());
  expect(window.__alloQuarantineReadAloudAudio).not.toHaveBeenCalled();expect(notice().textContent).toContain('Press Play again');expect(play().getAttribute('aria-busy')).toBe('false');expect(document.activeElement).toBe(play());await act(async()=>play().click());expect(play().getAttribute('aria-pressed')).toBe('true');
 });
 it('stops a delayed resume after unmount without quarantining it',async()=>{
  await paused();const pending=await resumeLater(),audio=players[0];act(()=>root.unmount());root=null;await act(async()=>{audio.paused=false;pending.resolve();});expect(audio.paused).toBe(true);expect(window.__alloQuarantineReadAloudAudio).not.toHaveBeenCalled();
 });
 it('treats a native MEDIA_ERR_ABORTED event as interruption rather than damage',async()=>{
  mount();open();await act(async()=>play().click());await act(async()=>{players[0].error={code:1,message:'Aborted'};players[0].onerror();});expect(window.__alloQuarantineReadAloudAudio).not.toHaveBeenCalled();expect(notice().textContent).toContain('Press Play again');
 });
});
