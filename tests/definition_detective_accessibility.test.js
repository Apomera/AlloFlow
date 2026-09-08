import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, mountGame } from './helpers/games_live_harness.js';
const data=[{term:'Planet',def:'A world orbiting a star.'},{term:'Orbit',def:'A path around another object.'},{term:'Star',def:'A sphere of hot gas.'}];
const cleanups=[];
const mount=(props={})=>{const g=mountGame('DefinitionDetectiveGame',{data,onClose:vi.fn(),...props});cleanups.push(g.unmount);return g;};
const click=el=>{expect(el).toBeTruthy();act(()=>el.click());};
const key=(c,k)=>c.querySelector('[data-help-key="detective_'+k+'"]');
const button=(c,label)=>[...c.querySelectorAll('button')].find(b=>b.textContent===label);
const answer=c=>{const d=c.querySelector('#detective-clue').textContent;const term=data.find(x=>x.def===d).term;click([...c.querySelectorAll('[data-help-key="detective_choice"]')].find(b=>b.textContent===term));};
const finish=c=>{for(let i=0;i<10&&key(c,'choice');i++){answer(c);click(key(c,'next'));}};
const player=()=>{
 let state={currentId:null,currentText:null,isPlaying:false,status:'idle'},sequence=0;
 const emit=next=>{state={...state,...next};window.dispatchEvent(new CustomEvent('allo-speech-state',{detail:state}));};
 const p={getCurrentId:()=>state.currentId,getState:()=>({...state}),speak:vi.fn(text=>{emit({currentId:++sequence,currentText:text,isPlaying:true,status:'generating'});return Promise.resolve(sequence);}),stop:vi.fn(()=>emit({currentId:null,currentText:null,isPlaying:false,status:'idle'})),emit};
 window.AlloSpeechPlayer=p;return p;
};
afterEach(()=>{cleanups.splice(0).reverse().forEach(fn=>fn());delete window.AlloSpeechPlayer;vi.restoreAllMocks();});
describe('Definition Detective access and learning support',()=>{
 it('focuses the first clue, feedback meaning, next clue, summary, and restarted first clue',()=>{
  const {container:c}=mount();expect(document.activeElement.id).toBe('detective-clue');
  answer(c);expect(document.activeElement.id).toBe('detective-feedback-title');
  expect(document.getElementById(document.activeElement.getAttribute('aria-describedby')).textContent).toContain('—');
  click(key(c,'next'));expect(document.activeElement.id).toBe('detective-clue');finish(c);
  expect(document.activeElement.id).toBe('detective-summary-title');click(key(c,'new_round'));expect(document.activeElement.id).toBe('detective-clue');
 });
 it('lets learners reveal a meaning and practise it without rewarding a guess',()=>{
  const score=vi.fn(),complete=vi.fn(),sound=vi.fn();const {container:c}=mount({onScoreUpdate:score,onGameComplete:complete,playSound:sound});
  click(key(c,'not_sure'));expect(c.textContent).toContain('Let’s learn this meaning');expect(sound).not.toHaveBeenCalled();
  expect(c.querySelector('progress').value).toBe(1);click(key(c,'next'));finish(c);
  expect(score).toHaveBeenCalledExactlyOnceWith(20,'Definition Detective Complete');
  click(key(c,'practice_missed'));expect(c.querySelector('progress').max).toBe(1);finish(c);expect(complete).toHaveBeenCalledTimes(1);
 });
 it('keeps larger text through feedback, practice, and new rounds without changing answers',()=>{
  const {container:c}=mount();const clue=c.querySelector('#detective-clue').textContent;const toggle=button(c,'Larger text');
  click(toggle);expect(toggle.getAttribute('aria-pressed')).toBe('true');expect(c.querySelector('.detective-large-text')).toBeTruthy();
  expect(c.querySelector('#detective-clue').textContent).toBe(clue);finish(c);click(key(c,'new_round'));expect(c.querySelector('.detective-large-text')).toBeTruthy();
 });
 it('restores the opener when the dialog unmounts',()=>{
  const opener=document.createElement('button');document.body.append(opener);opener.focus();
  const {unmount}=mount();cleanups.pop();unmount();expect(document.activeElement).toBe(opener);opener.remove();
 });
 it('uses the latest close callback for Escape',()=>{
  const g=mount(),close=vi.fn();g.rerender({data,onClose:close});
  act(()=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));expect(close).toHaveBeenCalledOnce();
 });
 it('reads the clue and every visible answer without answering or scoring',()=>{
  const p=player(),complete=vi.fn();const {container:c}=mount({onGameComplete:complete});
  click(key(c,'read_aloud'));const text=p.speak.mock.calls[0][0];
  expect(text).toContain(c.querySelector('#detective-clue').textContent);data.forEach(x=>expect(text).toContain(x.term));
  expect(p.speak.mock.calls[0][1]).toEqual({reason:'definition-detective'});
  expect(c.textContent).toContain('Preparing audio');expect(key(c,'read_aloud').textContent).toContain('Stop reading');
  expect(c.querySelector('progress').value).toBe(0);expect(complete).not.toHaveBeenCalled();
 });
 it('allows cancelling generated audio, and transitions to playback and idle',()=>{
  const p=player();const {container:c}=mount();click(key(c,'read_aloud'));
  act(()=>p.emit({status:'playing'}));expect(c.textContent).toContain('Reading aloud.');
  click(key(c,'read_aloud'));expect(p.stop).toHaveBeenCalledOnce();expect(key(c,'read_aloud').textContent).toContain('Read clue');
  click(key(c,'read_aloud'));act(()=>p.emit({currentId:null,currentText:null,status:'idle',isPlaying:false}));
  expect(key(c,'read_aloud').textContent).toContain('Read clue');
 });
 it.each(['answer','skip','change','unmount','close'])('cancels its pending audio on %s',action=>{
  const p=player();const g=mount();click(key(g.container,'read_aloud'));
  if(action==='answer')answer(g.container);
  if(action==='skip')click(key(g.container,'not_sure'));
  if(action==='change')g.rerender({data:[],onClose:vi.fn()});
  if(action==='unmount'){cleanups.pop();g.unmount();}
  if(action==='close')click(g.container.querySelector('[aria-label="Close"]'));
  expect(p.stop).toHaveBeenCalledOnce();
 });
 it('cancels feedback audio before moving to another clue',()=>{
  const p=player();const {container:c}=mount();answer(c);click(button(c,'Read feedback aloud'));
  expect(p.speak.mock.calls[0][0]).toContain(c.querySelector('#detective-clue').textContent);
  click(key(c,'next'));expect(p.stop).toHaveBeenCalledOnce();
 });
 it('does not stop a newer speech session belonging to another reader',()=>{
  const p=player();const {container:c}=mount();click(key(c,'read_aloud'));
  act(()=>p.emit({currentId:999,currentText:'Another reader',status:'playing'}));answer(c);expect(p.stop).not.toHaveBeenCalled();
 });
 it('reports missing speech support without blocking the game',()=>{
  const {container:c}=mount();click(key(c,'read_aloud'));expect(c.textContent).toContain('Audio is unavailable');
  answer(c);expect(c.querySelector('#detective-feedback-title')).toBeTruthy();expect(c.textContent).not.toContain('Audio is unavailable');
 });
 it('does not claim existing same-text audio when a muted request returns no session',()=>{
  const p=player();const {container:c}=mount();click(key(c,'read_aloud'));const text=p.speak.mock.calls[0][0];click(key(c,'read_aloud'));p.stop.mockClear();
  act(()=>p.emit({currentId:999,currentText:text,status:'playing',isPlaying:true}));
  p.speak.mockImplementation(()=>Promise.resolve(null));click(key(c,'read_aloud'));expect(c.textContent).toContain('Audio is unavailable');answer(c);expect(p.stop).not.toHaveBeenCalled();
 });
 it('announces asynchronous player errors and supports retry',()=>{
  const p=player();const {container:c}=mount();click(key(c,'read_aloud'));
  act(()=>p.emit({status:'error',isPlaying:false}));expect(c.textContent).toContain('Audio is unavailable');
  click(key(c,'read_aloud'));expect(p.speak).toHaveBeenCalledTimes(2);expect(c.textContent).not.toContain('Audio is unavailable');
 });
 it('handles rejected requests without unhandled rejections or stale errors after navigation',async()=>{
  const p=player();let reject;p.speak.mockImplementation(()=>new Promise((_,r)=>{reject=r;}));
  const {container:c}=mount();click(key(c,'read_aloud'));answer(c);
  await act(async()=>{reject(new Error('unavailable'));await Promise.resolve();});expect(c.textContent).not.toContain('Audio is unavailable');
 });
 it('can read missed meanings from the review without another completion',()=>{
  const p=player(),complete=vi.fn();const {container:c}=mount({onGameComplete:complete});click(key(c,'not_sure'));click(key(c,'next'));finish(c);
  click(button(c,'Read review aloud'));expect(p.speak).toHaveBeenCalledOnce();expect(complete).toHaveBeenCalledTimes(1);
  click(key(c,'new_round'));expect(p.stop).toHaveBeenCalledOnce();
 });
});

