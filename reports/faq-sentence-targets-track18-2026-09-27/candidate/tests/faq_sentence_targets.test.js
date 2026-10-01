import {afterEach,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {loadAlloModule} from './setup.js';
import {validAudioBase64} from './lib/audio_fixtures.js';
const require=createRequire(import.meta.url),noop=()=>{};
let React,createRoot,act,FAQ,KS,host,root,currentProps,store,bridge,synthesize,persist,inspect,regenerate,blobId=0;
const hostSource=readFileSync('AlloFlowANTI.txt','utf8');
const enumeration=hostSource.slice(hostSource.indexOf('  const _enumerateReadAloudResourceSegments ='),hostSource.indexOf('  const _encodeReadAloudBridgeAudio ='));
const hostEnumerator=new Function('window','splitTextToSentences','leveledTextLanguage','currentUiLanguage',enumeration+';return _enumerateReadAloudResourceSegments;');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
const resource=(data=[{question:'Echo.',answer:'Echo.'},{question:'Echo.',answer:'Other.'}],id='faq-one')=>({id,type:'faq',data});
const props=overrides=>({t:k=>k,generatedContent:resource(),isTeacherMode:true,isEditingFaq:true,isPlaying:false,voiceSpeed:1,selectedVoice:'Kore',effectiveLanguage:'English',leveledTextLanguage:'English',playbackState:{currentIdx:-1},audioRef:{current:null},playbackSessionRef:{current:null},setVoiceSpeed:noop,setIsPlaying:noop,setPlayingContentId:noop,handleToggleIsEditingFaq:noop,handleFaqChange:noop,handleSpeak:noop,getRows:()=>2,splitTextToSentences:x=>KS.splitSentences(x),formatInteractiveText:x=>x,...overrides});
const profile=()=>({voice:currentProps.selectedVoice||'Kore',language:currentProps.effectiveLanguage||'English',speed:currentProps.voiceSpeed||1,synthesisRate:currentProps.voiceSpeed||1,voiceResolverVersion:2,provider:'gemini'});
const enumerate=resource=>hostEnumerator(window,x=>KS.splitSentences(x),currentProps.effectiveLanguage,'English')(resource);
const entries=()=>enumerate(currentProps.generatedContent).map(entry=>({...entry,text:window.AlloModules.PhaseKHelpers.toSpokenText(entry.text)})).filter(entry=>entry.text);
const serialized=()=>Object.values(store.serialize()?.entries||{});
const click=async element=>act(async()=>element.click());
const actions=()=>[...host.querySelectorAll('button')].filter(el=>el.getAttribute('aria-label')?.includes('Regenerate audio.')||el.getAttribute('aria-label')?.includes('Replace recording with generated audio.'));
const button=index=>actions()[index];
beforeAll(()=>{
 React=require(resolve('desktop/web-app/node_modules/react'));({createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client')));({act}=require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));
 global.React=window.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;
 loadAlloModule('karaoke_audio_store_module.js');loadAlloModule('phase_k_helpers_module.js');loadAlloModule('read_aloud_audio_service_source.jsx');loadAlloModule('resource_read_aloud_module.js');loadAlloModule('view_faq_module.js');
 KS=window.AlloModules.KaraokeAudioStore;FAQ=window.AlloModules.FaqView;
 Object.defineProperty(URL,'createObjectURL',{configurable:true,value:()=> 'blob:test-'+(++blobId)});Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:noop});
});
beforeEach(()=>{
 currentProps=props();store=KS.createStore();KS.current=store;
 synthesize=vi.fn(async request=>({b64:validAudioBase64(256,65+synthesize.mock.calls.length),mime:'audio/wav'}));persist=vi.fn(async()=>({status:'attached'}));
 bridge=window.AlloModules.createReadAloudLegacyBridge({getResource:()=>currentProps.generatedContent,getStore:()=>store,getProfile:profile,enumerateResourceSegments:enumerate,normalize:window.AlloModules.PhaseKHelpers.toSpokenText,synthesize,persist});
 window.__alloInspectReadAloudAudio=inspect=vi.fn((...args)=>bridge.inspect(...args));window.__alloRegenerateSentenceAudio=regenerate=vi.fn((...args)=>bridge.regenerate(...args));
 window.__alloPrepareReadAloud=vi.fn((...args)=>bridge.prepare(...args));
 window.__alloGetReadAloudReadiness=vi.fn(async(texts,lane,options)=>({resourceId:currentProps.generatedContent.id,...bridge.readiness(texts,lane,options)}));
 window.__alloRetryReadAloudPersistence=vi.fn(async()=>true);
});
afterEach(async()=>{
 if(root)await act(async()=>root.unmount());root=null;host?.remove();host=null;store?.clear();KS.current=null;
 for(const name of ['__alloInspectReadAloudAudio','__alloRegenerateSentenceAudio','__alloPrepareReadAloud','__alloGetReadAloudReadiness','__alloRetryReadAloudPersistence','__alloReadAloudProfileRevision'])delete window[name];
 vi.restoreAllMocks();
});
async function render(input=currentProps){currentProps=input;if(!root){host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);}await act(async()=>root.render(React.createElement(FAQ,input)));}
async function seed(){await bridge.prepare(undefined,noop,{profile:profile()});synthesize.mockClear();persist.mockClear();}
describe('FAQ sentence targeting through the real bridge and store',()=>{
 it('regenerates the second FAQ question without changing its same-text peers',async()=>{
  await seed();const before=serialized();await render();await click(button(2));
  expect(synthesize).toHaveBeenCalledTimes(1);expect(synthesize.mock.calls[0][0].segment.segmentId).toBe('faq/1/question/0');
  const after=serialized();for(const entry of before){const next=after.find(value=>value.identity.segmentId===entry.identity.segmentId);expect(next.audio===entry.audio).toBe(entry.identity.segmentId!=='faq/1/question/0');}
  expect(regenerate.mock.calls[0][0]).toMatchObject({text:'Echo.',segmentId:'faq/1/question/0',scopeId:'main',occurrence:2});
 });
 it('assigns occurrences across questions and answers after spoken-text cleanup',async()=>{
  currentProps=props({generatedContent:resource([{question:'**Echo.**',answer:'[Echo.](https://example.test)'},{question:'Echo. Echo.',answer:'Different.'}])});await render();await click(button(3));
  expect(regenerate.mock.calls[0][0]).toMatchObject({segmentId:'faq/1/question/1',text:'Echo.',occurrence:3});
  expect(synthesize.mock.calls[0][0].segment.segmentId).toBe('faq/1/question/1');
 });
 it('uses the host splitter for audio even if the displayed-text splitter differs',async()=>{
  await render(props({generatedContent:resource([{question:'First. Second.',answer:'Third.'}]),splitTextToSentences:text=>[text]}));
  expect(actions()).toHaveLength(3);await click(button(1));expect(synthesize.mock.calls[0][0].segment.segmentId).toBe('faq/0/question/1');
 });
 it('keeps raw split indices when non-spoken citations are skipped',async()=>{
  const original=KS.splitSentences;vi.spyOn(KS,'splitSentences').mockImplementation(text=>text==='citation fixture'?['[Source 1]','Echo.']:original(text));
  await render(props({generatedContent:resource([{question:'citation fixture',answer:'Echo.'}])}));await click(button(0));
  expect(regenerate.mock.calls[0][0]).toMatchObject({segmentId:'faq/0/question/1',occurrence:0});expect(serialized()[0].identity.segmentId).toBe('faq/0/question/1');
 });
 it('does not expose audio actions for table fields excluded by the host',async()=>{
  await render(props({generatedContent:resource([{question:'| Header |',answer:'Narration.'}])}));expect(actions()).toHaveLength(1);await click(button(0));expect(synthesize.mock.calls[0][0].segment.segmentId).toBe('faq/0/answer/0');
 });
 it.each([{selectedVoice:'Puck'},{voiceSpeed:1.4},{effectiveLanguage:'Spanish'}])('rechecks readiness under changed synthesis settings %j',async change=>{
  await seed();await render();expect(button(0).getAttribute('data-audio-status')).toBe('ready');await render({...currentProps,...change});expect(button(0).getAttribute('data-audio-status')).toBe('stale');await click(button(0));
  expect(synthesize.mock.calls[0][0].profile).toMatchObject({voice:currentProps.selectedVoice,language:currentProps.effectiveLanguage,speed:currentProps.voiceSpeed,synthesisRate:currentProps.voiceSpeed,voiceResolverVersion:2});
 });
 it('marks edited spoken text stale at its canonical location and leaves other clips alone',async()=>{
  await seed();await render();await render({...currentProps,generatedContent:resource([{question:'Changed.',answer:'Echo.'},{question:'Echo.',answer:'Other.'}])});
  expect(button(0).getAttribute('data-audio-status')).toBe('stale');expect(button(1).getAttribute('data-audio-status')).toBe('ready');await click(button(0));expect(serialized().find(x=>x.identity.segmentId==='faq/0/question/0').identity.spokenText).toBe('Changed.');
 });
 it('keeps a human recording ready across voice changes and names explicit replacement',async()=>{
  await bridge.saveRecording(entries()[0],{b64:validAudioBase64(),mime:'audio/wav'},'human-teacher');await render({...currentProps,selectedVoice:'Puck',voiceSpeed:1.4});
  expect(button(0).getAttribute('data-audio-status')).toBe('ready');expect(button(0).getAttribute('aria-label')).toContain('Replace recording with generated audio');expect(synthesize).not.toHaveBeenCalled();
 });
 it('refreshes row status on real-store quarantine and removal notifications',async()=>{
  await seed();await render();await act(async()=>bridge.quarantine(entries()[0],{code:'decode-failed'}));expect(button(0).getAttribute('data-audio-status')).toBe('corrupt');
  await act(async()=>bridge.remove(entries()[1]));expect(button(1).getAttribute('data-audio-status')).toBe('missing');
 });
 it('passes the same complete descriptors and profile to whole-FAQ preparation and device checks',async()=>{
  await render({...currentProps,voiceSpeed:1.25});await click([...host.querySelectorAll('button')].find(el=>el.textContent==='Save TTS'));
  const [, ,options]=window.__alloPrepareReadAloud.mock.calls[0];expect(options.entries.map(x=>[x.segmentId,x.occurrence])).toEqual([['faq/0/question/0',0],['faq/0/answer/0',1],['faq/1/question/0',2],['faq/1/answer/0',0]]);expect(options.profile).toMatchObject({speed:1.25,synthesisRate:1.25});
  expect(window.__alloGetReadAloudReadiness.mock.calls.at(-1)[2]).toMatchObject({entries:options.entries,profile:options.profile});expect(host.textContent).not.toContain('4/4 saved on this device');
 });
 it('round-trips selected clips through serialization without collapsing duplicates',async()=>{
  await seed();const payload=JSON.parse(JSON.stringify(store.serialize()));store.clear();store=KS.createStore();store.hydrate(payload);KS.current=store;await render();
  expect(actions().every(el=>el.getAttribute('data-audio-status')==='ready')).toBe(true);await click(button(2));expect(serialized()).toHaveLength(4);expect(synthesize.mock.calls[0][0].segment.segmentId).toBe('faq/1/question/0');
 });
});
describe('FAQ request ownership and accessible controls',()=>{
 it('names the FAQ number, field and sentence distinctly for duplicate text',async()=>{await render();const names=actions().map(el=>el.getAttribute('aria-label'));expect(new Set(names).size).toBe(4);expect(names[2]).toContain('FAQ 2, question, sentence 1');expect(host.querySelectorAll('button button,button input,[role=status] button')).toHaveLength(0);});
 it('retains focus and guards duplicate activation while a generation is pending',async()=>{
  const pending=deferred();synthesize.mockReturnValue(pending.promise);await render();const action=button(2);action.focus();await act(async()=>{action.click();action.click();});expect(synthesize).toHaveBeenCalledTimes(1);expect(action.disabled).toBe(false);expect(action.getAttribute('aria-disabled')).toBe('true');expect(action.getAttribute('aria-busy')).toBe('true');
  await act(async()=>pending.resolve({b64:validAudioBase64(),mime:'audio/wav'}));expect(button(2)).toBe(action);expect(document.activeElement).toBe(action);expect(action.getAttribute('aria-busy')).toBe('false');
 });
 it.each(['resource','text','voice','speed','language','provider','leave-edit','leave-teacher','unmount'])('aborts pending generation on %s and ignores its late completion',async change=>{
  const pending=deferred();synthesize.mockReturnValue(pending.promise);await render();await click(button(2));const signal=synthesize.mock.calls[0][0].signal;
  let next={...currentProps};if(change==='resource')next.generatedContent={...next.generatedContent,id:'faq-two'};if(change==='text')next.generatedContent=resource([{question:'New.',answer:'Text.'}]);if(change==='voice')next.selectedVoice='Puck';if(change==='speed')next.voiceSpeed=1.5;if(change==='language')next.effectiveLanguage='Spanish';if(change==='provider')window.__alloReadAloudProfileRevision='new-provider';if(change==='leave-edit')next.isEditingFaq=false;if(change==='leave-teacher')next.isTeacherMode=false;
  if(change==='unmount'){await act(async()=>root.unmount());root=null;}else await render(next);
  expect(signal?.aborted).toBe(true);await act(async()=>pending.resolve({b64:validAudioBase64(),mime:'audio/wav'}));expect(persist).not.toHaveBeenCalled();expect(serialized()).toHaveLength(0);expect(host.textContent).not.toContain('Sentence audio ready.');
 });
 it('reports a failed request without removing the focused control and permits retry',async()=>{
  synthesize.mockRejectedValueOnce(new Error('provider unavailable'));await render();const action=button(0);action.focus();await click(action);expect(document.activeElement).toBe(action);expect(host.textContent).toContain('Sentence audio could not be generated');await click(action);expect(synthesize).toHaveBeenCalledTimes(2);
 });
 it('ignores foreign events and refreshes when a missing inspector becomes available',async()=>{
  delete window.__alloInspectReadAloudAudio;await render();expect(host.textContent).toContain('Playback readiness not verified');expect(button(0).getAttribute('aria-disabled')).toBe('true');await click(button(0));expect(regenerate).not.toHaveBeenCalled();
  window.__alloInspectReadAloudAudio=inspect;await act(async()=>window.dispatchEvent(new CustomEvent('alloflow:karaoke-audio-updated',{detail:{resourceId:'other'}})));expect(inspect).not.toHaveBeenCalled();
  await act(async()=>window.dispatchEvent(new Event('alloflow:module-registry-changed')));expect(button(0).getAttribute('data-audio-status')).toBe('missing');expect(button(0).getAttribute('aria-disabled')).toBe('false');
 });
 it.each(['foreign-resource','foreign-segment','wrong-text','missing-segment','invalid-status'])('rejects an inspector result for %s',async kind=>{
  inspect.mockImplementation(entry=>({status:kind==='invalid-status'?'saved':'ready',segment:kind==='missing-segment'?null:{resourceId:kind==='foreign-resource'?'other':'faq-one',segmentId:kind==='foreign-segment'?'wrong':entry.segmentId,spokenText:kind==='wrong-text'?'Wrong.':entry.text}}));
  await render();expect(button(0).getAttribute('data-audio-status')).toBe('unverified');await click(button(0));expect(regenerate).not.toHaveBeenCalled();
 });
 it('rechecks identity on activation if the host changed after the previous render',async()=>{
  await render();inspect.mockImplementation(entry=>({status:'missing',segment:{resourceId:'another-resource',segmentId:entry.segmentId,spokenText:entry.text}}));await click(button(0));expect(regenerate).not.toHaveBeenCalled();expect(host.textContent).toContain('Audio tools are still loading');
 });
 it('explains unavailable generation even when inspection is available',async()=>{
  delete window.__alloRegenerateSentenceAudio;await render();expect(button(0).getAttribute('aria-disabled')).toBe('true');expect(host.textContent).toContain('Sentence audio tools are not ready');await click(button(0));expect(synthesize).not.toHaveBeenCalled();
 });
});
