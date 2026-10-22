import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { setupWordSounds, baseProps, React } from './helpers/word_sounds_harness.js';
import { installCanvasStub, makePackItem } from './helpers/word_sounds_pack_fixture.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const syllableCore = new Function(readFileSync('word_sounds_core.js', 'utf8') + '\nreturn createWordSoundsCore;')()();
let Modal, root, host, state, currentOverrides, originalAudio, originalGlobalAudio, observedOrthography, observedPack;
const played = [];
const createElement = React.createElement;

class CompleteAudio {
  constructor(src = '') { this.src = src; this.paused = true; this.currentTime = 0; this.listeners = new Map(); queueMicrotask(()=>this.dispatch('canplaythrough')); }
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name,new Set()); this.listeners.get(name).add(fn); }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  dispatch(name) { this['on'+name]?.(); for(const fn of this.listeners.get(name)||[]) fn(); }
  canPlayType() { return 'probably'; }
  load() { queueMicrotask(()=>{ this.dispatch('loadedmetadata'); this.dispatch('canplaythrough'); this.dispatch('canplay'); }); }
  removeAttribute() {}
  play() { this.paused = false; played.push(this.src); setTimeout(()=>{ if(!this.paused) { this.paused=true;this.ended=true;this.dispatch('ended'); } },1);return Promise.resolve(); }
  pause() { this.paused=true; this.dispatch('pause'); }
}

beforeAll(()=>{ installCanvasStub(); ({WordSoundsModal:Modal}=setupWordSounds()); });
beforeEach(()=>{
  vi.useFakeTimers({now:1700000000000,toFake:['Date','setTimeout','clearTimeout','setInterval','clearInterval']});
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  originalAudio=window.Audio;originalGlobalAudio=globalThis.Audio;
  window.Audio=globalThis.Audio=CompleteAudio;played.length=0;
  observedOrthography = null;
  vi.spyOn(React, 'createElement').mockImplementation((type, props, ...children) => {
    if (props?.activity === 'orthography' && props.data?.correct) observedOrthography = props.data;
    return createElement(type, props, ...children);
  });
  window.__ALLO_ISOLATION_AUDIO={'1st':'data:audio/mp3;base64,FIRST','3rd':'data:audio/mp3;base64,THIRD'};
  window.__ALLO_INSTRUCTION_AUDIO={inst_counting:'data:audio/mp3;base64,COUNT'};
  window.__ALLO_PHONEME_AUDIO_BANK={cat:'data:audio/mp3;base64,CAT',dog:'data:audio/mp3;base64,DOG',k:'data:audio/mp3;base64,K',a:'data:audio/mp3;base64,A',t:'data:audio/mp3;base64,T',d:'data:audio/mp3;base64,D',o:'data:audio/mp3;base64,O',g:'data:audio/mp3;base64,G'};
});
afterEach(async()=>{
  if(root)await act(async()=>root.unmount());root=null;host?.remove();
  window.Audio=originalAudio;globalThis.Audio=originalGlobalAudio;
  delete window.__ALLO_ISOLATION_AUDIO;delete window.__ALLO_INSTRUCTION_AUDIO;delete window.__ALLO_PHONEME_AUDIO_BANK;
  vi.clearAllTimers();vi.useRealTimers();delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  vi.restoreAllMocks();
});

function pack(word,itemId,position=0) {
  const phonemes=word==='dog'?['d','o','g']:['k','a','t'];
  return {...makePackItem(),id:itemId,itemId,word,targetWord:word,displayWord:word,phonemes,
    activityItems:{counting:{answer:3,options:[1,2,3,4,5]},isolation:{position,correctSound:phonemes[position],options:[...phonemes]}}};
}
async function tick(ms) { await act(async()=>vi.advanceTimersByTimeAsync(ms)); }
async function render(overrides) {
  currentOverrides={...currentOverrides,...overrides};
  await act(async()=>root.render(React.createElement(currentOverrides.liftedWords ? PackPlayerHost : PlayerHost,currentOverrides)));
}
function PlayerHost(overrides) {
  const [activity,setActivity]=React.useState(overrides.activity||'isolation');
  const [word,setWord]=React.useState(null),[data,setData]=React.useState(null);
  const [score,setScore]=React.useState({correct:0,total:0,streak:0}),[history,setHistory]=React.useState([]);
  const [feedback,setFeedback]=React.useState(null);
  state={activity,word,data,score,history,feedback};
  return React.createElement(Modal,{...baseProps(activity),allowRuntimeAi:false,isTeacherMode:false,
    disableAnimations:true,sessionId:'session-a',wordSoundsSessionGoal:20,
    wsPreloadedWords:overrides.items,
    wordSoundsDifficulty:'easy',isProbeMode:true,
    sessionConfig:{fixedForm:true,probeItemCount:overrides.items.length},...overrides,
    wordSoundsActivity:activity,setWordSoundsActivity:setActivity,
    currentWordSoundsWord:word,setCurrentWordSoundsWord:setWord,
    wordSoundsPhonemes:data,setWordSoundsPhonemes:setData,
    wordSoundsScore:score,setWordSoundsScore:setScore,
    wordSoundsHistory:history,setWordSoundsHistory:setHistory,
    wordSoundsFeedback:feedback,setWordSoundsFeedback:setFeedback});
}
function PackPlayerHost(overrides) {
  const [items,setItems]=React.useState(overrides.items);observedPack=items;
  return React.createElement(PlayerHost,{...overrides,items,setWsPreloadedWords:setItems});
}
async function mount(overrides) {
  host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);currentOverrides={};
  await render(overrides);await tick(120);
}
async function clickNumber(n) {
  const target=host.querySelector(`[role="button"][aria-label="Number ${n}"]`);
  expect(target).toBeTruthy();await act(async()=>target.click());
}
async function clickSound(sound) {
  // Sound-only tiles are numbered for accessible access; their order follows
  // the authored prepared board and does not reveal printed phoneme labels.
  const index=state.data.activityItems.isolation.options.indexOf(sound);
  const target=host.querySelector(`button[aria-label="Choose Sound ${index+1}"]`);
  expect(target).toBeTruthy();await act(async()=>target.click());
}
async function spellWord(word) {
  const input=host.querySelector('input[aria-label="common.drag_letters_here"]');
  expect(input).toBeTruthy();
  await act(async()=>{
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input,word);
    input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await act(async()=>input.closest('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
}

describe('authored Word Sounds item advancement',()=>{
  it.each([' ', 'Enter'])('ignores a held count key %j and accepts a separate intentional retry',async(key)=>{
    await mount({activity:'counting',items:[pack('cat','cat')],isProbeMode:false,sessionConfig:{fixedForm:false,sessionGoal:20}});
    const wrong=host.querySelector('[role="button"][aria-label="Number 2"]');
    const press=async(target,repeat=false)=>act(async()=>target.dispatchEvent(new KeyboardEvent('keydown',{key,repeat,bubbles:true,cancelable:true})));
    await press(wrong);expect(state.history).toEqual([]);expect(state.feedback).toBeTruthy();
    await press(wrong,true);expect(state.history).toEqual([]);expect(state.score.total).toBe(0);
    wrong.dispatchEvent(new KeyboardEvent('keyup',{key,bubbles:true}));
    const correct=host.querySelector('[role="button"][aria-label="Number 3"]');await press(correct);
    expect(state.history).toHaveLength(1);expect(state.history[0]).toMatchObject({correct:true,attempts:2});
  });

  it.each([false,true])('restores removed answer focus on the next isolation item (fixed=%s)',async(fixed)=>{
    await mount({activity:'isolation',items:[pack('cat','cat'),pack('dog','dog')],isProbeMode:fixed,
      sessionConfig:{fixedForm:fixed,probeItemCount:2,sessionGoal:20}});
    const before=state.word;const choice=host.querySelector('button[aria-label="Choose Sound 1"]');choice.focus();
    await act(async()=>choice.click());await tick(fixed?801:2001);
    expect(state.word).not.toBe(before);expect(document.activeElement).not.toBe(document.body);
    expect(host.querySelector('[tabindex="-1"].animate-in')?.contains(document.activeElement)).toBe(true);
  });

  it('retains deliberate toolbar focus during ordinary feedback advancement',async()=>{
    await mount({activity:'isolation',items:[pack('cat','cat'),pack('dog','dog')],isProbeMode:false,
      sessionConfig:{fixedForm:false,sessionGoal:20}});
    await clickSound(state.data.activityItems.isolation.correctSound);
    const toolbar=[...host.querySelectorAll('button')].find(button=>!host.querySelector('[tabindex="-1"].animate-in')?.contains(button));
    expect(toolbar).toBeTruthy();toolbar.focus();await tick(2001);expect(document.activeElement).toBe(toolbar);
  });

  it('keeps unscored skips in their current fixed activity before changing sequence',async()=>{
    const first={...pack('food','food'),phonemes:['f','oo','d'],rhymeWord:'good',activityItems:{rhyming:{answer:'good',options:['good','cat','sun']}},_ttsAssets:{food:{mime:'audio/webm',base64:'AAAA'}}};
    const second={...pack('cat','cat'),rhymeWord:'hat',activityItems:{rhyming:{answer:'hat',options:['bed','hat','dog']}}};
    await mount({activity:'rhyming',items:[first,second],isProbeMode:false,
      initialActivitySequence:['rhyming','counting'],sessionConfig:{fixedForm:true,probeItemCount:2}});
    expect(state.word).toBe('food');expect(host.textContent).toContain('This item will not be scored');
    const skip=[...host.querySelectorAll('button')].find(button=>/Skip unscored/.test(button.textContent));expect(skip).toBeTruthy();
    await act(async()=>skip.click());await tick(120);
    expect(state.activity).toBe('rhyming');expect(state.word).toBe('cat');expect(state.history).toEqual([]);expect(state.score.total).toBe(0);
    expect(host.textContent).not.toContain('This item will not be scored');
    const correct=[...host.querySelectorAll('button')].find(button=>button.textContent.trim()==='Option 2');expect(correct).toBeTruthy();
    await act(async()=>correct.click());expect(state.history.at(-1)).toMatchObject({itemId:'cat',correct:true});
  });

  it('consumes one authored occurrence for a rapid double-click on an unscored item',async()=>{
    const food=id=>({...pack('food',id),phonemes:['f','oo','d'],rhymeWord:'good',activityItems:{rhyming:{answer:'good',options:['good','cat','sun']}},_ttsAssets:{food:{mime:'audio/webm',base64:'AAAA'}}});
    const cat={...pack('cat','cat'),rhymeWord:'hat',activityItems:{rhyming:{answer:'hat',options:['bed','hat','dog']}}};
    await mount({activity:'rhyming',items:[food('first'),food('second'),cat],isProbeMode:false,sessionConfig:{fixedForm:true,probeItemCount:3}});
    const skip=()=>[...host.querySelectorAll('button')].find(button=>/Skip unscored/.test(button.textContent));
    const initial=skip();expect(initial).toBeTruthy();
    await act(async()=>{initial.click();initial.click();});await tick(120);
    expect(state.word).toBe('food');expect(state.data.itemId).toBe('second');expect(state.history).toEqual([]);
    await act(async()=>skip().click());await tick(120);expect(state.word).toBe('cat');expect(state.data.itemId).toBe('cat');
  });

  it('plays native-language blending controls through exact IPA recordings while English bank clips are present',async()=>{
    const clip=index=>{const bytes=Buffer.alloc(80);bytes.write('RIFF');bytes.write('WAVE',8);bytes[60]=index;
      return {mime:'audio/wav',base64:bytes.toString('base64'),provenance:{language:'es'}};};
    const native=Object.fromEntries(['ɡ','a','t','o'].map((key,index)=>[key,clip(index+31)]));
    const item={...pack('gato','gato'),phonemes:[{ipa:'ɡ',grapheme:'g'},{ipa:'a',grapheme:'a'},{ipa:'t',grapheme:'t'},{ipa:'o',grapheme:'o'}],
      activityItems:{blending:{answer:'gato',options:['gato','casa','luna']}},
      _ttsAssets:{...native,g:clip(40),...Object.fromEntries(['gato','casa','luna'].map(word=>[word,clip(41)]))}};
    const bank={...window.__ALLO_PHONEME_AUDIO_BANK};
    await mount({activity:'blending',items:[item],wordSoundsLanguage:'es',selectedVoice:'native',isProbeMode:false,sessionConfig:{fixedForm:false,sessionGoal:20}});
    await tick(3000);played.length=0;
    const listen=host.querySelector('button[aria-label="word_sounds.play_word"]');expect(listen).toBeTruthy();
    await act(async()=>listen.click());await tick(2300);
    const nativeSources=Object.values(native).map(asset=>'data:'+asset.mime+';base64,'+asset.base64);
    expect(played.filter(source=>nativeSources.includes(source))).toEqual(nativeSources);
    expect(played.filter(source=>Object.values(bank).includes(source))).toEqual([]);
    expect(played).not.toContain('data:audio/wav;base64,'+item._ttsAssets.g.base64);
  });

  it('skips an unaligned mapping board to the next valid authored mapping item',async()=>{
    const first={...pack('box','box'),phonemes:['b','o','k','s'],graphemes:[],activityItems:{mapping:{supported:false,contentStatus:'teacher_review_required',graphemes:[],chipOrder:[]}},_ttsAssets:{box:{mime:'audio/webm',base64:'AAAA'}}};
    const second={...pack('cat','cat'),graphemes:['c','a','t'],activityItems:{mapping:{graphemes:['c','a','t'],chipOrder:[0,1,2]}}};
    await mount({activity:'mapping',items:[first,second],isProbeMode:false,initialActivitySequence:['mapping','counting'],sessionConfig:{fixedForm:true,probeItemCount:2}});
    const skip=[...host.querySelectorAll('button')].find(button=>/Skip unscored/.test(button.textContent));expect(skip).toBeTruthy();
    await act(async()=>skip.click());await tick(120);
    expect(state.activity).toBe('mapping');expect(state.word).toBe('cat');expect(state.history).toEqual([]);
    expect(state.data.activityItems.mapping).toEqual(second.activityItems.mapping);expect(host.textContent).not.toContain('This item will not be scored');
  });

  it.each([false,true])('terminates all-unscored queues without recycling or fabricating evidence (probe=%s)',async(probe)=>{
    const item={...pack('food','food'),phonemes:['f','oo','d'],rhymeWord:'good',activityItems:{rhyming:{answer:'good',options:['good','cat','sun']}},_ttsAssets:{food:{mime:'audio/webm',base64:'AAAA'}}};
    const completed=vi.fn();await mount({activity:'rhyming',items:[item],isProbeMode:probe,onProbeComplete:completed,
      initialActivitySequence:['rhyming','counting'],sessionConfig:{fixedForm:probe,probeItemCount:1,sessionGoal:20}});
    let skipped=0;
    for(;skipped<25;skipped++){
      const skip=[...host.querySelectorAll('button')].find(button=>/Skip unscored/.test(button.textContent));
      if(!skip)break;await act(async()=>skip.click());await tick(120);
    }
    expect(skipped).toBeLessThan(25);expect(state.history).toEqual([]);expect(state.score.total).toBe(0);
    if(probe){expect(state.activity).toBe('rhyming');expect(completed).toHaveBeenCalledOnce();expect(completed.mock.calls[0][0]).toMatchObject({total:0,correct:0});}
    else expect(state.activity).toBe('counting');
  });

  it('persists actual teacher rhyme controls to only the active authored occurrence',async()=>{
    const first={...pack('cat','first'),rhymeWord:'hat',rhymeDistractors:['bed','dog'],
      activityItems:{rhyming:{answer:'hat',options:['hat','bed','dog']}}};
    const second={...pack('cat','second'),rhymeWord:'bat',rhymeDistractors:['map','dog'],
      activityItems:{rhyming:{answer:'bat',options:['map','bat','dog']}}};
    await mount({activity:'rhyming',items:[first,second],liftedWords:true,isTeacherMode:true,isProbeMode:false,
      sessionConfig:{fixedForm:true,probeItemCount:2}});
    const edit=host.querySelector('button[aria-label="Edit"],button[aria-label="common.edit"]');expect(edit).toBeTruthy();
    await act(async()=>edit.click());
    const input=[...host.querySelectorAll('input[aria-label="common.enter_opt"]')].find(input=>input.value==='dog');
    expect(input).toBeTruthy();await act(async()=>input.parentElement.querySelector('button').click());
    expect(state.data.activityItems.rhyming).toMatchObject({targetWord:'cat',answer:'dog',teacherEdited:true,supported:true});
    const firstChoice=host.querySelector('input[aria-label="common.enter_opt"]');
    await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(firstChoice,'sun');
      firstChoice.dispatchEvent(new Event('input',{bubbles:true}));});
    expect(state.data.activityItems.rhyming.options).toEqual(['sun','bed','dog']);
    expect(observedPack[0].activityItems.rhyming).toMatchObject({answer:'dog',options:['sun','bed','dog'],teacherEdited:true,supported:true});
    expect(observedPack[0].itemId).toBe('first');expect(observedPack[1]).toBe(second);
    const done=host.querySelector('button[aria-label="Done"],button[aria-label="common.done"]');expect(done).toBeTruthy();
    await act(async()=>done.click());
    const choice=[...host.querySelectorAll('button')].find(button=>button.textContent.trim()==='Option 3');expect(choice).toBeTruthy();
    await act(async()=>choice.click());expect(state.history.at(-1)).toMatchObject({correct:true,itemId:'first'});
  });

  it('shows an unscored review route instead of an empty rejected rhyme board',async()=>{
    const food={...pack('food','food'),phonemes:['f','oo','d'],rhymeWord:'good',
      activityItems:{rhyming:{answer:'good',options:['good','cat','sun']}},
      _ttsAssets:{food:{mime:'audio/webm',base64:'AAAA'}}};
    const good={...pack('good','good'),phonemes:['g','uu','d'],
      _ttsAssets:{...makePackItem()._ttsAssets,good:{mime:'audio/webm',base64:'AAAA'}}};
    await mount({activity:'rhyming',items:[food,good],isProbeMode:false,sessionConfig:{fixedForm:true,probeItemCount:2}});
    expect(state.word).toBe('food');expect(host.textContent).toContain('This item will not be scored');
    expect(state.history).toEqual([]);
  });

  it('installs a non-English prepared rhyme using available peer pronunciations',async()=>{
    const board={answer:'col',options:['pan','col','mar']};
    const sol={...pack('sol','sol'),phonemes:['s','o','l'],rhymeWord:'col',activityItems:{rhyming:board},
      _ttsAssets:{sol:{mime:'audio/webm',base64:'AAAA'},col:{mime:'audio/webm',base64:'AAAA'},pan:{mime:'audio/webm',base64:'AAAA'},mar:{mime:'audio/webm',base64:'AAAA'}}};
    const col={...pack('col','col'),phonemes:['k','o','l']};
    await mount({activity:'rhyming',items:[sol,col],wordSoundsLanguage:'es',isProbeMode:false,sessionConfig:{fixedForm:true,probeItemCount:2}});
    expect(state.word).toBe('sol');expect(host.textContent).not.toContain('This item will not be scored');
    expect(host.querySelectorAll('button[aria-label="common.listen_to_this_option"]')).toHaveLength(board.options.length);
    expect(state.data.activityItems.rhyming).toEqual(board);
  });

  it('plays prepared IPA objects through their canonical phoneme clips in order',async()=>{
    const clip=index=>{const bytes=Buffer.alloc(80);bytes.write('RIFF');bytes.write('WAVE',8);bytes[60]=index;
      return 'data:audio/wav;base64,'+bytes.toString('base64');};
    const bank={r:clip(1),ay:clip(2),n:clip(3),ee:clip(4)};
    window.__ALLO_PHONEME_AUDIO_BANK=bank;
    window.__ALLO_INSTRUCTION_AUDIO.which_word_did_you_hear=clip(5);
    const item={...pack('rainy','rainy'),phonemes:[{ipa:'r',grapheme:'r'},{ipa:'eɪ',grapheme:'ai'},{ipa:'n',grapheme:'n'},{ipa:'i',grapheme:'y'}],
      activityItems:{blending:{answer:'rainy',options:['rainy','cat','dog']}},
      _ttsAssets:Object.fromEntries(['rainy','cat','dog'].map(word=>[word,{mime:'audio/wav',base64:clip(6).split(',')[1]}]))};
    await mount({activity:'blending',items:[item],isProbeMode:false,sessionConfig:{fixedForm:false,sessionGoal:20}});
    await tick(3000);played.length=0;
    const listen=host.querySelector('button[aria-label="word_sounds.play_word"]');expect(listen).toBeTruthy();
    await act(async()=>listen.click());await tick(2300);
    expect(played.filter(source=>Object.values(bank).includes(source))).toEqual(Object.values(bank));
    expect(played).toContain(clip(5));
    expect(state.data.phonemes).toEqual(item.phonemes);
  });

  it('gives every automatically selected activity its full configured practice goal',async()=>{
    await mount({activity:'counting',items:[pack('cat','cat')],isProbeMode:false,
      initialActivitySequence:['counting','isolation','blending'],
      sessionConfig:{fixedForm:false,sessionGoal:2},wordSoundsSessionGoal:2});
    for(let index=0;index<2;index++){await clickNumber(3);await tick(2001);}
    await tick(3001);expect(state.activity).toBe('isolation');expect(state.score).toMatchObject({correct:0,total:0});
    await clickSound('k');await tick(2001);expect(state.score).toMatchObject({correct:1,total:1});
    expect(host.querySelector('[aria-labelledby="word-sounds-session-complete-title"]')).toBeNull();
    await clickSound('k');await tick(2001);expect(state.history.filter(row=>row.activity==='isolation')).toHaveLength(2);
    await tick(3001);expect(state.activity).toBe('blending');expect(state.score.total).toBe(0);
    expect(state.history).toHaveLength(4);
  });

  it('skips unavailable sequence entries and wraps a manual transition through eligible activities',async()=>{
    const item=pack('cat','cat');item.activityItems.blending={answer:'cat',options:['bed','cat','sun']};
    await mount({activity:'counting',items:[item],isProbeMode:false,
      initialActivitySequence:['counting','isolation','blending'],
      sessionConfig:{fixedForm:false,sessionGoal:1,preparedActivities:['counting','blending']},wordSoundsSessionGoal:1});
    await clickNumber(3);await tick(2001);await tick(3001);
    expect(state.activity).toBe('blending');expect(state.score.total).toBe(0);
    const choices=host.querySelectorAll('button[data-ws-blend-choice]');expect(choices).toHaveLength(3);
    await act(async()=>choices[1].click());await tick(2001);await tick(3001);
    expect(state.activity).toBe('blending');
    const next=[...host.querySelectorAll('button')].find(button=>/Next Activity|session_next_activity/.test(button.textContent));
    expect(next).toBeTruthy();await act(async()=>next.click());await tick(120);
    expect(state.activity).toBe('counting');expect(state.score.total).toBe(0);
  });

  it('stops a sequence when no other prepared activity is available',async()=>{
    await mount({activity:'counting',items:[pack('cat','cat')],isProbeMode:false,
      initialActivitySequence:['counting','isolation'],
      sessionConfig:{fixedForm:false,sessionGoal:1,preparedActivities:['counting']},wordSoundsSessionGoal:1});
    await clickNumber(3);await tick(2001);await tick(3001);
    expect(state.activity).toBe('counting');expect(state.score.total).toBe(1);
    expect(host.querySelector('[aria-labelledby="word-sounds-session-complete-title"]')).toBeTruthy();
    expect([...host.querySelectorAll('button')].some(button=>/Next Activity|session_next_activity/.test(button.textContent))).toBe(false);
  });

  it('keeps probe completion on the assessed activity despite a later sequence entry',async()=>{
    const completed=vi.fn();await mount({activity:'counting',items:[pack('cat','cat')],onProbeComplete:completed,
      initialActivitySequence:['counting','isolation']});
    await clickNumber(3);await tick(801);
    // The host clears this live flag after banking the payload. The completed
    // run still owns a probe clock and must remain on its assessed activity.
    await render({isProbeMode:false});await tick(3001);
    expect(completed).toHaveBeenCalledOnce();expect(state.activity).toBe('counting');expect(state.score.total).toBe(1);
    expect([...host.querySelectorAll('button')].some(button=>/Next Activity|session_next_activity/.test(button.textContent))).toBe(false);
  });

  it('cancels an automatic transition owned by a reset session',async()=>{
    await mount({activity:'counting',items:[pack('cat','cat')],isProbeMode:false,
      initialActivitySequence:['counting','isolation'],sessionConfig:{fixedForm:false,sessionGoal:1},wordSoundsSessionGoal:1});
    await clickNumber(3);await tick(2001);await tick(200);
    await render({sessionId:'fresh-run'});await tick(3101);
    expect(state.activity).toBe('counting');expect(state.score.total).toBe(0);
  });

  it('retains reviewed syllable counts and packed audio without phonemes through practice advancement and refill',async()=>{
    const items=['quuxzz','zorpzz'].map((word,index)=>{
      const bytes=Buffer.alloc(80);bytes.write('RIFF');bytes.write('WAVE',8);bytes[60]=index+1;
      const asset={mime:'audio/wav',base64:bytes.toString('base64'),decoded:true,durationSeconds:0.4};
      const count=syllableCore.createReviewedSyllableCount({targetWord:word,language:'en',count:index+2,reviewed:true,revision:3,
        audioContext:syllableCore.createSyllableCountAudioContext({language:'en',asset})});
      return {...pack(word,word),word,targetWord:word,displayWord:word,term:word,phonemes:[],phonemeCount:0,syllables:[],
        _preparedActivities:['syllable_counting'],activityItems:{syllable_counting:count},_ttsAssets:{[word]:asset},_ttsManifest:{revision:7}};
    });
    await mount({activity:'syllable_counting',items,isProbeMode:false,
      sessionConfig:{fixedForm:false,sessionGoal:20},wordSoundsSessionGoal:20});
    const seen=[];
    for(let index=0;index<12;index++){
      await tick(1600);
      const prepared=items.find(item=>item.word===state.word);
      const expected=prepared.activityItems.syllable_counting.count;
      expect(state.data.phonemes.length).toBeGreaterThan(0);
      expect(state.data.activityItems).toEqual(prepared.activityItems);
      expect(state.data._ttsAssets).toEqual(prepared._ttsAssets);
      expect(state.data._ttsManifest).toEqual({revision:7});
      const listen=[...host.querySelectorAll('button')].find(button=>button.textContent.includes('Hear the word again'));
      expect(listen).toBeTruthy();expect(listen.disabled,host.textContent).toBe(false);await act(async()=>listen.click());await tick(1001);
      expect(played).toContain('data:audio/wav;base64,'+prepared._ttsAssets[state.word].base64);
      const tap=host.querySelector('button[aria-label="Tap to count syllables"]');expect(tap).toBeTruthy();
      for(let count=0;count<expected;count++)await act(async()=>tap.click());
      const submit=[...host.querySelectorAll('button')].find(button=>button.textContent.includes('Submit'));
      expect(submit?.disabled).toBe(false);await act(async()=>submit.click());
      expect(state.history.at(-1)).toMatchObject({correct:true,activity:'syllable_counting',expectedCount:expected,
        submittedCount:expected,deliveryMode:'recorded_audio'});
      expect(state.score.total).toBe(index+1);seen.push(state.word);await tick(2001);
    }
    expect(new Set(seen)).toEqual(new Set(items.map(item=>item.word)));
    expect(seen[1]).not.toBe(seen[0]);expect(items.every(item=>item.phonemes.length===0)).toBe(true);
  });

  it.each(['isolation','blending','orthography'])('retains the prepared %s board through ordinary advancement and refill',async activity=>{
    const items=['cat','dog'].map((word,index)=>{
      const item=pack(word,word,2);
      item.activityItems.blending={answer:word,options:['pig',word,'sun']};
      item.activityItems.orthography={answer:word,options:['AUTHOR_A',word,'AUTHOR_B']};
      item.blendingDistractors=['bed','map','hat'];
      item.orthographyDistractors=['LEGACY_A','LEGACY_B'];
      item._ttsAssets={...item._ttsAssets,...Object.fromEntries(['pig','sun'].map(option=>[option,{mime:'audio/webm',base64:Buffer.from(option).toString('base64')}]))};
      return item;
    });
    await mount({activity,items,isProbeMode:false,sessionConfig:{fixedForm:false,sessionGoal:20},wordSoundsSessionGoal:20});
    const first=state.word;
    for(let index=0;index<12;index++) {
      await tick(60);
      if(index===1)expect(state.word).not.toBe(first);
      const board=state.data.activityItems[activity];
      if(activity==='isolation'){
        expect(host.querySelector('h3')?.textContent).toContain('3rd');
        await clickSound(board.correctSound);
      }else if(activity==='blending'){
        const choices=host.querySelectorAll('button[data-ws-blend-choice]');expect(choices).toHaveLength(3);
        const listen=host.querySelector('button[aria-label="common.listen_to_this_option"]');
        await act(async()=>listen.click());await tick(2);
        expect(played).toContain(`data:audio/webm;base64,${Buffer.from('pig').toString('base64')}`);
        await act(async()=>choices[board.options.indexOf(state.word)].click());
      }else{
        expect(observedOrthography.options).toEqual(board.options);
        await spellWord(state.word);
      }
      expect(state.history.at(-1)).toMatchObject({correct:true,activity});
      expect(state.score.total).toBe(index+1);
      await tick(2001);
    }
  });

  it('allows a one-word ordinary practice queue to repeat with a fresh response',async()=>{
    await mount({activity:'counting',items:[pack('cat','cat')],isProbeMode:false,
      sessionConfig:{fixedForm:false,sessionGoal:3},wordSoundsSessionGoal:3});
    for(let index=0;index<3;index++){
      await clickNumber(3);expect(state.score.total).toBe(index+1);await tick(2001);
    }
    expect(state.history).toHaveLength(3);
    expect(host.querySelector('[aria-labelledby="word-sounds-session-complete-title"]')).toBeTruthy();
  });

  it('keeps manual Next Activity and the following automatic sequence transition synchronized',async()=>{
    await mount({activity:'counting',items:[pack('cat','cat')],isProbeMode:false,
      initialActivitySequence:['counting','isolation','blending'],
      sessionConfig:{fixedForm:false,sessionGoal:1},wordSoundsSessionGoal:1});
    await clickNumber(3);await tick(2001);
    const next=[...host.querySelectorAll('button')].find(button=>/Next Activity|session_next_activity/.test(button.textContent));
    expect(next).toBeTruthy();await act(async()=>next.click());await tick(120);
    expect(state.activity).toBe('isolation');await clickSound('k');await tick(2001);
    await tick(3001);expect(state.activity).toBe('blending');
  });

  it('keeps a pending lesson transition ahead of the ordinary next-item deadline',async()=>{
    await mount({activity:'counting',items:[pack('cat','cat'),pack('dog','dog')],isProbeMode:false,
      initialActivitySequence:['counting','isolation','blending'],
      lessonPlanConfig:{masteryThreshold:1,activities:[{id:'counting',count:1},{id:'isolation',count:1},{id:'blending',count:1}]},
      sessionConfig:{fixedForm:false,sessionGoal:20},wordSoundsSessionGoal:20});
    const initialWord=state.word;await clickNumber(3);await tick(2001);
    expect(state.activity).toBe('counting');expect(state.word).toBe(initialWord);
    await tick(501);expect(state.activity).toBe('isolation');
    expect(state.score).toMatchObject({correct:1,total:1});
  });

  it('preserves the exact prepared blending choices and order on the first and repeated target',async()=>{
    const items=[pack('cat','blend-first'),pack('cat','blend-second')];
    const options=[['bed','cat','sun'],['map','pig','cat']];
    const assets=Object.fromEntries(['bed','cat','sun','map','pig'].map(word=>[word,{mime:'audio/webm',base64:Buffer.from(word).toString('base64')}]));
    items.forEach((item,index)=>{
      item.activityItems.blending={answer:'cat',options:options[index]};
      item.blendingDistractors=index===0?['cot','cut','bat']:['dog','hat','bat'];
      item._ttsAssets={...item._ttsAssets,...assets};
    });
    await mount({activity:'blending',items});
    for(let index=0;index<2;index++) {
      await tick(60); // Let startActivity release its brief audio cancellation window.
      expect(state.data).toBe(items[index]);
      const choices=host.querySelectorAll('button[data-ws-blend-choice]');
      expect(choices).toHaveLength(3);
      // Named by what they show ("Option N" here, letters hidden), not "Volume".
      for(const choice of choices){expect(choice.getAttribute('aria-label')).toBeNull();expect(choice.textContent.trim()).toMatch(/^Option [1-3]$/);}
      const listen=host.querySelector('button[aria-label="common.listen_to_this_option"]');
      await act(async()=>listen.click());await tick(2);
      expect(played).toContain(`data:audio/webm;base64,${assets[options[index][0]].base64}`);
      await act(async()=>choices[options[index].indexOf('cat')].click());
      expect(state.history.at(-1)).toMatchObject({itemId:items[index].itemId,correct:true});
      await tick(801);
    }
    expect(state.score).toMatchObject({correct:2,total:2});
  });

  it('rebuilds isolation when a fixed form intentionally repeats the same object instance',async()=>{
    const item=pack('cat','shared');
    await mount({items:[item,item],sessionConfig:{fixedForm:true,probeItemCount:2,itemIds:['first','second']}});
    await clickSound('k');await tick(801);
    expect(state.data).toBe(item);
    expect(host.querySelector('button[aria-label="Choose Sound 1"]')).toBeTruthy();
    await clickSound('k');await tick(801);
    expect(state.history.map(row=>row.itemId)).toEqual(['first','second']);
    expect(state.score).toMatchObject({correct:2,total:2});
  });

  it('retains the continuation flag and exact item while prepared audio defers and retries its start',()=>{
    const source=readFileSync('word_sounds_module.js','utf8');
    const fromStart=sliceBetween(source,'const startActivity =',null,{file:'word_sounds_module.js'});
    const deferral=sliceBetween(fromStart,'if (studentPreparedAudioBlocked) {','waitingForPreparedAudioRef.current = null;',{file:'word_sounds_module.js',label:'prepared-audio deferral'});
    const ref={current:null},item={preparedItem:pack('cat','second'),itemId:'second',itemIndex:1};
    new Function('studentPreparedAudioBlocked','waitingForPreparedAudioRef','activityId','forceWord','excludeWord','recursionDepth','continuingForm',
      deferral)(true,ref,'isolation',item,null,0,true);
    const retry=source.match(/startActivity\(pending\.activityId, pending\.forceWord, pending\.excludeWord, pending\.recursionDepth[^;]*;/)?.[0];
    const resume=vi.fn();new Function('pending','startActivity',retry)(ref.current,resume);
    expect(resume).toHaveBeenCalledExactlyOnceWith('isolation',item,null,0,true);
  });

  it('delivers repeated targets in order with their own question, playback, history and completion identity',async()=>{
    const items=[pack('cat','cat-first',0),pack('cat','cat-last',2),pack('dog','dog-first',0)];
    const completed=vi.fn();await mount({items,onProbeComplete:completed});
    expect(state.data).toBe(items[0]);
    expect(host.textContent).toContain('Word 1 of 3');
    await tick(900);expect(played).toContain('data:audio/mp3;base64,FIRST');
    await clickSound('k');expect(state.history.at(-1)).toMatchObject({itemId:'cat-first',itemIndex:0,correct:true});
    await tick(801);expect(state.word).toBe('cat');expect(state.data).toBe(items[1]);
    await tick(900);expect(played).toContain('data:audio/mp3;base64,THIRD');
    await clickSound('t');expect(state.history.at(-1)).toMatchObject({itemId:'cat-last',itemIndex:1,correct:true});
    await tick(801);expect(state.word).toBe('dog');expect(state.data).toBe(items[2]);
    await clickSound('d');await tick(801);
    expect(state.history.map(row=>row.itemId)).toEqual(['cat-first','cat-last','dog-first']);
    expect(state.score).toMatchObject({correct:3,total:3});
    expect(completed).toHaveBeenCalledOnce();expect(completed.mock.calls[0][0].itemIds).toEqual(['cat-first','cat-last','dog-first']);
    // The response clock spans the form and stops at the final answer, before
    // its 800ms feedback transition.
    expect(completed.mock.calls[0][0].duration).toBeGreaterThan(3.5);
  });

  it('preserves authored order after an error and ends an untimed fixed form at its attempted-item goal',async()=>{
    const items=[pack('cat','cat-first',0),pack('cat','cat-last',2),pack('dog','dog-first',0)];
    await mount({items,isProbeMode:false,sessionConfig:{fixedForm:true,probeItemCount:3},wordSoundsSessionGoal:20});
    // Practice grants one retry, but a scored miss may not add another item
    // to the authored fixed form or rotate its repeated next target.
    await clickSound('t');await clickSound('t');expect(state.history[0].correct).toBe(false);
    await tick(3001);expect(state.data).toBe(items[1]);
    await clickSound('t');await tick(2001);expect(state.data).toBe(items[2]);
    await clickSound('d');await tick(2001);
    expect(state.history.map(row=>row.itemId)).toEqual(['cat-first','cat-last','dog-first']);
    expect(state.score).toMatchObject({correct:2,total:3});
    expect(host.querySelector('[aria-labelledby="word-sounds-session-complete-title"]')).toBeTruthy();
  });

  it('continues normal practice through different words without assessment-only item attribution',async()=>{
    await mount({activity:'counting',items:[pack('cat','cat'),pack('dog','dog')],isProbeMode:false,
      sessionConfig:{fixedForm:false,sessionGoal:20},wordSoundsDifficulty:'easy'});
    const first=state.word;await clickNumber(3);expect(state.score.total).toBe(1);
    await tick(2001);expect(state.word).not.toBe(first);expect(state.history[0].itemId).toBeUndefined();
    await clickNumber(3);expect(state.score.total).toBe(2);
  });

  it('keeps a new session response locked when an older answer timeout expires',async()=>{
    const items=[pack('cat','cat'),pack('dog','dog')];
    await mount({activity:'counting',items});await clickNumber(3);
    await tick(200);await render({sessionId:'session-b'});await tick(120);
    await clickNumber(3);expect(state.history).toHaveLength(2);expect(state.score.total).toBe(1);
    await tick(481); // The first session's 800ms callback has expired.
    await clickNumber(3);expect(state.history).toHaveLength(2);expect(state.score.total).toBe(1);
  });
});
