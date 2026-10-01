import {afterEach,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {loadAlloModule} from './setup.js';
const require=createRequire(import.meta.url); let React,act,createRoot,host,root,FAQ,Overlay;
const noop=()=>{}, t=k=>k, split=text=>String(text||'').match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(x=>x.trim())||[];
const faqProps=overrides=>({t,generatedContent:{id:'one',type:'faq',data:[{question:'Again.',answer:'Again.'}]},isTeacherMode:true,isEditingFaq:false,isPlaying:false,voiceSpeed:1,selectedVoice:'Kore',effectiveLanguage:'English',playbackState:{currentIdx:-1},audioRef:{current:null},playbackSessionRef:{current:null},setVoiceSpeed:noop,setIsPlaying:noop,setPlayingContentId:noop,handleToggleIsEditingFaq:noop,handleFaqChange:noop,handleSpeak:noop,getRows:()=>1,splitTextToSentences:split,formatInteractiveText:x=>x,...overrides});
const overlayProps=overrides=>({text:'Again.',sentenceList:['Again.'],resourceId:'one',audioSaveContext:'voice-one',language:'English',isOpen:true,isTeacher:true,captureOn:false,onClose:noop,getAudioUrl:async()=>null,...overrides});
const defer=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
beforeAll(()=>{
 React=require(resolve('desktop/web-app/node_modules/react'));({act}=require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));({createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client')));
 global.React=window.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;window.AlloLanguageContext=React.createContext({t});window.matchMedia=()=>({matches:true});global.requestAnimationFrame=window.requestAnimationFrame=()=>0;global.cancelAnimationFrame=window.cancelAnimationFrame=noop;
 loadAlloModule('resource_read_aloud_module.js');loadAlloModule('view_faq_module.js');loadAlloModule('immersive_reader_module.js');FAQ=window.AlloModules.FaqView;Overlay=window.AlloModules.KaraokeReaderOverlay;
});
beforeEach(()=>{window.__alloInspectReadAloudAudio=vi.fn(entry=>({status:'missing',segment:{resourceId:'one',segmentId:entry.segmentId,spokenText:entry.text}}));window.__alloGetReadAloudReadiness=vi.fn(async texts=>({resourceId:'one',scope:'device-audio',total:texts.length,ready:texts.length,durableReady:0,verifiedAt:'2026-09-27T00:00:00Z'}));window.__alloRetryReadAloudPersistence=vi.fn(async()=>true);window.__alloPrepareReadAloud=vi.fn(async()=>({ok:true,remaining:0}));});
afterEach(async()=>{if(root)await act(async()=>root.unmount());root=null;host?.remove();host=null;for(const name of ['__alloGetReadAloudReadiness','__alloRetryReadAloudPersistence','__alloPrepareReadAloud','__alloRegenerateSentenceAudio','__alloCaptureKaraokeAudio','__alloInspectReadAloudAudio'])delete window[name];delete window.AlloModules.KaraokeAudioStore;vi.unstubAllGlobals();});
async function render(Component,props){if(!root){host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);}await act(async()=>root.render(React.createElement(Component,props)));}
const button=text=>[...host.querySelectorAll('button')].find(el=>el.textContent.includes(text));
const click=async el=>act(async()=>el.click());
describe('FAQ/overlay device-save boundaries',()=>{
 it('FAQ preparation success does not claim durable storage',async()=>{await render(FAQ,faqProps());await click(button('Save TTS'));expect(host.textContent).not.toContain('Audio is saved for all FAQ sentences');expect(host.textContent).toContain('Audio prepared. Check device save');expect(host.textContent).toContain('0/2 saved on this device');});
 it('FAQ regeneration success stays distinct from persistence',async()=>{window.__alloRegenerateSentenceAudio=vi.fn(async()=> 'blob:clip');await render(FAQ,faqProps({isEditingFaq:true}));await click(host.querySelector('button[aria-label*="Regenerate audio"]'));expect(host.textContent).not.toContain('Sentence audio saved.');expect(host.textContent).toContain('Sentence audio ready.');});
 it('FAQ readiness includes duplicate occurrences and full requested voice speed',async()=>{await render(FAQ,faqProps({voiceSpeed:1.3}));expect(window.__alloGetReadAloudReadiness).toHaveBeenLastCalledWith(['Again.','Again.'],'reference',expect.objectContaining({entries:[expect.objectContaining({text:'Again.',occurrence:0,language:'English',segmentId:'faq/0/question/0'}),expect.objectContaining({text:'Again.',occurrence:1,language:'English',segmentId:'faq/0/answer/0'})],profile:expect.objectContaining({speed:1.3,synthesisRate:1.3})}));});
 it('FAQ invalidates preparation when synthesis speed changes',async()=>{const pending=defer();window.__alloPrepareReadAloud.mockReturnValue(pending.promise);await render(FAQ,faqProps());await click(button('Save TTS'));const signal=window.__alloPrepareReadAloud.mock.calls[0][2].signal;await render(FAQ,faqProps({voiceSpeed:1.5}));expect(signal.aborted).toBe(true);await act(async()=>pending.resolve({ok:true}));expect(host.textContent).not.toContain('Audio prepared.');});
 it.each([false,undefined])('FAQ gives feedback for unconfirmed prepare %j',async answer=>{window.__alloPrepareReadAloud.mockResolvedValue(answer);await render(FAQ,faqProps());await click(button('Save TTS'));expect(host.textContent).toContain('Audio preparation was not confirmed');});
 it('overlay preparation success does not turn its button into Saved',async()=>{await render(Overlay,overlayProps());await click(button('Prepare read-aloud'));expect(host.textContent).not.toMatch(/✓\s*Saved/);expect(host.textContent).toContain('Audio prepared. Check device save');expect(host.textContent).toContain('0/1 saved on this device');});
 it.each([false,undefined,{ok:false,failed:1}])('overlay handles failed/empty prepare %j',async answer=>{window.__alloPrepareReadAloud.mockResolvedValue(answer);await render(Overlay,overlayProps());await click(button('Prepare read-aloud'));expect(host.textContent).not.toMatch(/✓\s*Saved/);expect(host.textContent).toContain('Audio preparation incomplete');});
 it('overlay ignores late prepare after closing and reopening',async()=>{const pending=defer();window.__alloPrepareReadAloud.mockReturnValue(pending.promise);const input=overlayProps();await render(Overlay,input);await click(button('Prepare read-aloud'));const signal=window.__alloPrepareReadAloud.mock.calls[0][2].signal;await render(Overlay,{...input,isOpen:false});expect(signal.aborted).toBe(true);await render(Overlay,input);await act(async()=>pending.resolve({ok:true}));expect(host.textContent).not.toContain('Audio prepared.');});
 it('overlay cannot clear capture errors with raw store presence',async()=>{
   class FakeAudio {constructor(src){this.src=src;this.duration=1;this.currentTime=0;}play(){return Promise.resolve();}pause(){}addEventListener(){}}
   vi.stubGlobal('Audio',FakeAudio);window.AlloModules.KaraokeAudioStore={current:{has:()=>true}};window.__alloCaptureKaraokeAudio=vi.fn(async()=>false);window.__alloInspectReadAloudAudio=vi.fn(()=>({status:'stale'}));
   const input=overlayProps({captureOn:true,getAudioUrl:async()=> 'blob:played'});await render(Overlay,input);await click(host.querySelector('button[aria-label="Play"]'));
   expect(button('Retry adding played audio') || button('Retry failed saves')).toBeTruthy();expect(window.__alloInspectReadAloudAudio).toHaveBeenCalledWith('Again.','reference',{occurrence:0});
 });
 it('overlay ignores a capture finishing after close and reopen',async()=>{
   class FakeAudio {constructor(src){this.src=src;this.duration=1;this.currentTime=0;}play(){return Promise.resolve();}pause(){}addEventListener(){}}
   vi.stubGlobal('Audio',FakeAudio);const pending=defer();window.__alloCaptureKaraokeAudio=vi.fn(()=>pending.promise);
   const input=overlayProps({captureOn:true,getAudioUrl:async()=> 'blob:played'});await render(Overlay,input);await click(host.querySelector('button[aria-label="Play"]'));
   await render(Overlay,{...input,isOpen:false});await render(Overlay,input);await act(async()=>pending.resolve(false));expect(button('Retry adding played audio')||button('Retry failed saves')).toBeFalsy();
 });
 it('overlay cancels an in-flight capture retry before changing resource',async()=>{
   class FakeAudio {constructor(src){this.src=src;this.duration=1;this.currentTime=0;}play(){return Promise.resolve();}pause(){}addEventListener(){}}
   vi.stubGlobal('Audio',FakeAudio);const pending=defer();const resolver=vi.fn().mockResolvedValueOnce('blob:first').mockReturnValue(pending.promise);window.__alloCaptureKaraokeAudio=vi.fn(async()=>false);
   const input=overlayProps({captureOn:true,getAudioUrl:resolver});await render(Overlay,input);await click(host.querySelector('button[aria-label="Play"]'));await click(host.querySelector('button[aria-label="Pause"]'));
   const retryButton=button('Retry adding played audio')||button('Retry failed saves');await act(async()=>{retryButton.click();retryButton.click();});expect(resolver).toHaveBeenCalledTimes(2);
   const signal=resolver.mock.calls[1][1].signal;await render(Overlay,{...input,resourceId:'two'});expect(signal.aborted).toBe(true);await act(async()=>pending.resolve('blob:late'));expect(window.__alloCaptureKaraokeAudio).toHaveBeenCalledTimes(1);
 });
 it('comparison playback-only overlay exposes no save or retry actions',async()=>{await render(Overlay,overlayProps({playbackOnly:true}));expect(host.querySelector('[data-device-audio-status]')).toBe(null);expect(button('Prepare read-aloud')).toBeFalsy();expect(window.__alloGetReadAloudReadiness).not.toHaveBeenCalled();});
});
