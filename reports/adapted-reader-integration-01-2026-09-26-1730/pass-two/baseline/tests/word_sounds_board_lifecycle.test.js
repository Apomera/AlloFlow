import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require=createRequire(import.meta.url),modules=resolve('desktop/web-app/node_modules');
const source=readFileSync('word_sounds_module.js','utf8');
let React,client,act;const mounts=[];
beforeAll(()=>{React=require(resolve(modules,'react'));client=require(resolve(modules,'react-dom/client'));({act}=require(resolve(modules,'react-dom/test-utils')));});
beforeEach(()=>{vi.useFakeTimers({toFake:['setTimeout','clearTimeout']});globalThis.IS_REACT_ACT_ENVIRONMENT=true;});
afterEach(()=>{for(const m of mounts.splice(0)){act(()=>m.root.unmount());m.host.remove();}vi.clearAllTimers();vi.useRealTimers();delete globalThis.IS_REACT_ACT_ENVIRONMENT;});
function mount(extra={}){
 const start=source.indexOf('const WordFamiliesView = React.useMemo('),end=source.indexOf('const ts = React.useCallback(',start);
 const audioRunIdRef={current:0};
 const View=new Function('React','t','ts','isMountedRef','audioRunIdRef','isPlayingAudioRef','currentActiveAudio','fisherYatesShuffle','Volume2','Check','X',source.slice(start,end)+';return WordFamiliesView;')(
  {...React,useMemo:fn=>fn()},key=>key,()=>'',{current:true},audioRunIdRef,{current:false},{current:null},a=>a,()=>null,()=>null,()=>null);
 const props={data:{family:'at',targetWord:'cat',options:['hat','bat'],distractors:['dog','sun']},onPlayAudio:vi.fn(async()=>{}),onCheckAnswer:vi.fn(),soundOnlyMode:false,...extra};
 const host=document.createElement('div');document.body.appendChild(host);const root=client.createRoot(host);const m={host,root,props,audioRunIdRef};mounts.push(m);
 m.render=patch=>{Object.assign(props,patch);act(()=>root.render(React.createElement(View,props)));};m.render({});
 m.button=text=>[...host.querySelectorAll('button')].find(b=>b.textContent.trim()===text);
 m.hear=()=>host.querySelector('[aria-label="common.hear_all_words"]');
 return m;
}
async function tick(ms){await act(async()=>vi.advanceTimersByTimeAsync(ms));}
describe('Sound Sort and Word Families board lifecycle',()=>{
 it('retains distinct selections batched before React rerenders',async()=>{
  const m=mount();const hat=m.button('hat'),bat=m.button('bat');act(()=>{hat.click();bat.click();});await tick(1200);
  expect(m.props.onCheckAnswer).toHaveBeenCalledExactlyOnceWith('correct');
 });
 it('does not submit twice when the final tile is tapped rapidly',async()=>{
  const m=mount({data:{family:'at',options:['hat'],distractors:['dog']}});const hat=m.button('hat');act(()=>{hat.click();hat.click();});await tick(1200);
  expect(m.props.onCheckAnswer).toHaveBeenCalledExactlyOnceWith('correct');
 });
 it('cancels delayed completion when the board unmounts while the player stays open',async()=>{
  const m=mount({data:{family:'at',options:['hat'],distractors:['dog']}});act(()=>m.button('hat').click());act(()=>m.root.render(null));await tick(1600);
  expect(m.props.onCheckAnswer).not.toHaveBeenCalled();
 });
 it('cancels old completion and resets progress when board content changes',async()=>{
  const m=mount({data:{family:'at',options:['hat'],distractors:['dog']}});act(()=>m.button('hat').click());
  m.render({data:{family:'un',options:['sun'],distractors:['dog']}});await tick(1600);expect(m.props.onCheckAnswer).not.toHaveBeenCalled();
  act(()=>m.button('sun').click());await tick(1200);expect(m.props.onCheckAnswer).toHaveBeenCalledExactlyOnceWith('correct');
 });
 it('stops manual option playback when its board is removed',async()=>{
  const m=mount();act(()=>m.hear().click());await tick(1);expect(m.props.onPlayAudio).toHaveBeenCalledTimes(1);
  act(()=>m.root.render(null));await tick(1800);expect(m.props.onPlayAudio).toHaveBeenCalledTimes(1);
 });
 it('a new replay replaces the previous loop and pending automatic playback',async()=>{
  const m=mount();act(()=>m.hear().click());await tick(1);act(()=>m.hear().click());await tick(1600);
  expect(m.props.onPlayAudio.mock.calls.map(c=>c[0])).toEqual(['hat','hat','bat','dog','sun']);
  await tick(12000);expect(m.props.onPlayAudio).toHaveBeenCalledTimes(5);
 });
 it('single-word listening stops the remaining automatic sequence',async()=>{
  const m=mount();act(()=>window.dispatchEvent(new Event('wordSoundsInstructionDone')));await tick(260);
  const hearDog=m.host.querySelector('[aria-label="Hear dog"]');expect(hearDog).toBeTruthy();act(()=>hearDog.click());await tick(1000);
  expect(m.props.onPlayAudio.mock.calls.map(c=>c[0])).toEqual(['hat','dog']);
 });
});


describe('board access and recovery',()=>{
 it('names each sound-only choice and listening button without exposing words',()=>{
  const m=mount({soundOnlyMode:true});
  for(let i=1;i<=4;i++){
   expect(m.host.querySelector('[aria-label="Option '+i+'"]')).toBeTruthy();
   expect(m.host.querySelector('[aria-label="Hear option '+i+'"]')).toBeTruthy();
  }
  expect([...m.host.querySelectorAll('button')].some(b=>b.textContent.trim()==='hat')).toBe(false);
  act(()=>m.host.querySelector('[aria-label="Option 1"]').click());
  expect(m.host.querySelector('[aria-label="Option 2"]')).toBeTruthy();
 });
 it('resets even when a new target uses the same options',()=>{
  const m=mount();act(()=>m.button('hat').click());
  m.render({data:{...m.props.data,targetWord:'mat'}});expect(m.button('hat')).toBeTruthy();
 });
 it('does not erase the newer wrong-answer feedback with an older timer',async()=>{
  const m=mount();act(()=>m.button('dog').click());await tick(1000);act(()=>m.button('sun').click());await tick(600);
  expect(m.host.textContent).toContain('"sun"');await tick(900);expect(m.host.textContent).not.toContain('"sun"');
 });
 it('stops an in-flight replay when the global audio sequence is cancelled',async()=>{
  const m=mount();act(()=>m.hear().click());await tick(1);m.audioRunIdRef.current++;await tick(1500);
  expect(m.props.onPlayAudio).toHaveBeenCalledTimes(1);
 });
 it('does not start automatic options while the board is being edited',async()=>{
  const m=mount({isEditing:true});await tick(13000);expect(m.props.onPlayAudio).not.toHaveBeenCalled();
 });
});
