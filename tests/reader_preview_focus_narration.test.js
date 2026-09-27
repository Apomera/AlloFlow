import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {extractFocusEffect}=require('./helpers/reader_focus_effect.cjs');
const source=readFileSync('AlloFlowANTI.txt','utf8');
let cleanup,audioRef,speech,created,muted;
function install(){
 const effect=extractFocusEffect(source);
 new Function('useEffect','focusNarrationEnabled','focusNarrationAudioRef','isGlobalMuted','t','_helpLookup','selectedVoice','voiceSpeed','voiceVolume',effect)(fn=>{cleanup=fn();},true,audioRef,()=>muted,k=>k,()=>'', 'af_heart',1,0.8);
}
function button(text,parent=document.body){const node=document.createElement('button');node.textContent=text;parent.append(node);return node;}
function preview(owner='preview-a'){const modal=document.createElement('div');modal.dataset.studentPreview='';document.body.append(modal);window.dispatchEvent(new CustomEvent('alloflow:reading-preview',{detail:{owner,active:true}}));return modal;}
function close(modal,opener,owner='preview-a'){modal.remove();window.dispatchEvent(new CustomEvent('alloflow:reading-preview',{detail:{owner,active:false}}));opener?.focus();}
const tick=()=>vi.advanceTimersByTimeAsync(220);
function pendingTTS(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});const speakStreaming=vi.fn(()=>promise);window._kokoroTTS={ready:true,speakStreaming,stop:vi.fn()};return {resolve,reject,speakStreaming};}
beforeEach(()=>{vi.useFakeTimers();audioRef={current:null};created=[];muted=false;speech={cancel:vi.fn(),speak:vi.fn()};vi.stubGlobal('speechSynthesis',speech);vi.stubGlobal('SpeechSynthesisUtterance',class{constructor(text){this.text=text;}});vi.stubGlobal('Audio',class{constructor(url){this.src=url;this.play=vi.fn(()=>Promise.resolve());this.pause=vi.fn();created.push(this);}});install();});
afterEach(()=>{cleanup?.();cleanup=null;delete window._kokoroTTS;document.body.innerHTML='';vi.unstubAllGlobals();vi.restoreAllMocks();vi.useRealTimers();});
describe('preview focus narration boundary',()=>{
 it('does not cancel or start speech when preview controls receive focus',async()=>{
  const pending=pendingTTS(),playing={pause:vi.fn(),currentTime:14};audioRef.current=playing;
  const modal=preview();button('Refresh preview',modal).focus();await tick();
  expect(pending.speakStreaming).not.toHaveBeenCalled();expect(speech.cancel).not.toHaveBeenCalled();expect(speech.speak).not.toHaveBeenCalled();expect(created).toHaveLength(0);expect(playing.pause).not.toHaveBeenCalled();expect(playing.currentTime).toBe(14);expect(audioRef.current).toBe(playing);
 });
 it('discards an announcement queued before preview opens',async()=>{
  button('Main reader').focus();await vi.advanceTimersByTimeAsync(80);preview();await tick();expect(speech.speak).not.toHaveBeenCalled();expect(speech.cancel).not.toHaveBeenCalled();
 });
 it('discards in-flight TTS after opening preview without pausing current host audio',async()=>{
  const pending=pendingTTS();button('Main reader').focus();await tick();expect(pending.speakStreaming).toHaveBeenCalledTimes(1);
  const playing={pause:vi.fn(),currentTime:9};audioRef.current=playing;speech.cancel.mockClear();preview();expect(pending.speakStreaming.mock.calls[0][3].signal.aborted).toBe(true);expect(window._kokoroTTS.stop).not.toHaveBeenCalled();pending.resolve('blob:stale-announcement');await tick();
  expect(created).toHaveLength(0);expect(speech.speak).not.toHaveBeenCalled();expect(speech.cancel).not.toHaveBeenCalled();expect(playing.pause).not.toHaveBeenCalled();expect(audioRef.current).toBe(playing);
 });
 it('does not revive rejected TTS as browser speech after preview has closed',async()=>{
  const pending=pendingTTS(),opener=button('Open preview');opener.focus();await tick();const modal=preview();close(modal,opener);await Promise.resolve();speech.cancel.mockClear();pending.reject(Error('TTS unavailable'));await tick();
  expect(created).toHaveLength(0);expect(speech.speak).not.toHaveBeenCalled();expect(speech.cancel).not.toHaveBeenCalled();
 });
 it('suppresses automatic focus return but resumes narration for subsequent focus',async()=>{
  const opener=button('Open preview'),next=button('Next control'),modal=preview();button('Close preview',modal).focus();close(modal,opener);await tick();expect(speech.speak).not.toHaveBeenCalled();expect(speech.cancel).not.toHaveBeenCalled();
  next.focus();await tick();expect(speech.speak).toHaveBeenCalledTimes(1);expect(speech.speak.mock.calls[0][0].text).toBe('Button: Next control');
 });
 it('remains silent while another preview is still mounted',async()=>{
  const opener=button('Open preview'),first=preview(),second=preview('preview-b'),target=button('Second preview',second);close(first,opener);await Promise.resolve();target.focus();await tick();expect(speech.speak).not.toHaveBeenCalled();close(second,opener,'preview-b');await tick();expect(speech.speak).not.toHaveBeenCalled();
 });
 it('does not play a pending result after the narration effect is disposed',async()=>{
  const pending=pendingTTS();button('Main reader').focus();await tick();cleanup();cleanup=null;expect(pending.speakStreaming.mock.calls[0][3].signal.aborted).toBe(true);pending.resolve('blob:disposed');await tick();expect(created).toHaveLength(0);expect(speech.speak).not.toHaveBeenCalled();
 });
 it('still narrates ordinary host focus using the configured TTS',async()=>{
  const pending=pendingTTS();button('Main reader').focus();await tick();pending.resolve('blob:current');await tick();expect(created).toHaveLength(1);expect(created[0].src).toBe('blob:current');expect(created[0].play).toHaveBeenCalledTimes(1);expect(audioRef.current).toBe(created[0]);expect(speech.speak).not.toHaveBeenCalled();
 });
 it('does not abort a completed request or pause its audio when preview opens',async()=>{
  const pending=pendingTTS();button('Main reader').focus();await tick();pending.resolve('blob:already-playing');await tick();
  const signal=pending.speakStreaming.mock.calls[0][3].signal,audio=created[0];preview();button('Close preview',document.querySelector('[data-student-preview]')).focus();await tick();
  expect(signal.aborted).toBe(false);expect(audio.pause).not.toHaveBeenCalled();expect(window._kokoroTTS.stop).not.toHaveBeenCalled();expect(audioRef.current).toBe(audio);
 });
 it('keeps the latest focus announcement when older TTS completes later',async()=>{
  let resolveFirst,resolveSecond;window._kokoroTTS={ready:true,speakStreaming:vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{resolveFirst=resolve;})).mockImplementationOnce(()=>new Promise(resolve=>{resolveSecond=resolve;}))};
  button('First').focus();await tick();button('Second').focus();await tick();resolveSecond('blob:second');await tick();resolveFirst('blob:first');await tick();expect(created.map(audio=>audio.src)).toEqual(['blob:second']);
 });
 it('does not use a late TTS result while globally muted',async()=>{
  const pending=pendingTTS();button('Main reader').focus();await tick();muted=true;pending.resolve('blob:muted');await tick();expect(created).toHaveLength(0);expect(speech.speak).not.toHaveBeenCalled();
 });
});
