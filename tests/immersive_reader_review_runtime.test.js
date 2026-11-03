import {beforeAll,beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {loadAlloModule} from './setup.js';
const require=createRequire(import.meta.url),base=resolve('desktop/web-app/node_modules');
let React,createRoot,act,M,root,host,audios,utterances;
beforeAll(()=>{
 React=require(resolve(base,'react'));({createRoot}=require(resolve(base,'react-dom/client')));({act}=require(resolve(base,'react-dom/test-utils')));
 global.React=window.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;
 window.AlloLanguageContext=React.createContext({t:k=>k});
 loadAlloModule('immersive_reader_module.js');M=window.AlloModules;
});
beforeEach(()=>{
 vi.useFakeTimers({toFake:['setTimeout','clearTimeout']});
 audios=[];utterances=[];
 vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn());
 vi.stubGlobal('Audio',class extends EventTarget{
  constructor(src){super();this.src=src;this.paused=true;this.duration=5;this.currentTime=0;this.ended=false;this.pause=vi.fn(()=>{this.paused=true;this.dispatchEvent(new Event('pause'));});audios.push(this);}
  play(){this.paused=false;this.dispatchEvent(new Event('playing'));return Promise.resolve();}
 });
 vi.stubGlobal('SpeechSynthesisUtterance',class {constructor(text){this.text=text;}});
 Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak:vi.fn(u=>utterances.push(u)),cancel:vi.fn()}});
 window.HTMLElement.prototype.scrollIntoView=vi.fn();
 localStorage.clear();
});
afterEach(()=>{
 if(root){act(()=>root.unmount());root=null;}host?.remove();host=null;
 vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();
 delete window.__alloStoreRecordedSentenceAudio;delete window.__alloStoreStudentSentenceAudio;
});
function render(name,props={},strict=false){
 if(!host){host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);}
 const el=React.createElement(M[name],{isOpen:true,onClose:()=>{},...props});
 act(()=>root.render(strict?React.createElement(React.StrictMode,null,el):el));return host;
}
async function flush(){await act(async()=>{for(let i=0;i<8;i++)await Promise.resolve();});}
async function tick(ms){await act(async()=>{vi.advanceTimersByTime(ms);for(let i=0;i<8;i++)await Promise.resolve();});}
function click(el){expect(el).toBeTruthy();act(()=>el.click());}
function key(target,code,extra={}){const ev=new KeyboardEvent('keydown',{key:code==='Space'?' ':code,code,bubbles:true,cancelable:true,...extra});act(()=>target.dispatchEvent(ev));return ev;}
const passage='One two three four';
const sentences=['First sentence.','Second sentence.','Third sentence.'];
function karaoke(extra={}){render('KaraokeReaderOverlay',{sentenceList:sentences,captureOn:false,getAudioUrl:async text=>'blob:'+text,...extra});}
function button(label){return host.querySelector('button[aria-label="'+label+'"]');}
function surface(){return host.querySelector('[role="button"][aria-pressed]');}
function progress(){return Number(host.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'));}
async function startFocus(){click(surface());await tick(650);await tick(650);await tick(650);}
describe('Focus Reader lifecycle and text',()=>{
 it('Space on the reading surface toggles once and advances once in StrictMode',async()=>{
  render('FocusReaderOverlay',{text:passage},true);key(surface(),'Space');expect(surface().getAttribute('aria-pressed')).toBe('true');
  await tick(650);await tick(650);await tick(650);await tick(200);expect(progress()).toBe(50);
  await tick(200);expect(progress()).toBe(75);
 });
 it('closing cancels countdown and playback; reopening is paused at the same word',async()=>{
  const props={text:passage};render('FocusReaderOverlay',props);await startFocus();await tick(200);
  render('FocusReaderOverlay',{...props,isOpen:false});await tick(5000);render('FocusReaderOverlay',props);
  expect(progress()).toBe(50);expect(surface().getAttribute('aria-pressed')).toBe('false');await tick(2000);expect(progress()).toBe(50);
 });
 it('replacing text with an empty passage clears old words and cannot start playback',async()=>{
  render('FocusReaderOverlay',{text:passage});await startFocus();render('FocusReaderOverlay',{text:''});
  expect(host.textContent).toContain('No text to read');expect(progress()).toBe(0);click(surface());key(document,'ArrowRight');
  expect(surface().getAttribute('aria-pressed')).toBe('false');expect(host.textContent).toContain('0 / 0');
 });
 it('keeps grapheme clusters intact in the highlighted character',()=>{
  render('FocusReaderOverlay',{text:'A👩🏽‍🔬B'});const glyphs=host.querySelector('.font-mono.font-bold > div');
  expect([...glyphs.children].map(el=>el.textContent)).toEqual(['A','👩🏽‍🔬','B']);
 });
 it('separates HTML blocks and preserves mathematical comparison text',()=>{
  render('FocusReaderOverlay',{text:'<p>One</p><p>two</p> 2 < 3 and 5 > 4'});
  expect(host.textContent).toContain('1 / 9');
 });
 it('replays from the beginning after the last word',async()=>{
  render('FocusReaderOverlay',{text:'One two'});await startFocus();await tick(200);await tick(200);
  expect(surface().getAttribute('aria-pressed')).toBe('false');click(surface());expect(progress()).toBe(50);expect(surface().getAttribute('aria-pressed')).toBe('true');
 });
 it('keeps native controls and modified shortcuts independent',()=>{
  render('FocusReaderOverlay',{text:passage});key(host.querySelector('input'),'ArrowRight');expect(progress()).toBe(25);
  key(document,'ArrowRight',{ctrlKey:true});expect(progress()).toBe(25);
 });
});
describe('Karaoke asynchronous playback ownership',()=>{
 it('keeps one passage tab stop and moves focus before Space starts or pauses the selected sentence',async()=>{
  const getAudioUrl=vi.fn(async()=> 'blob:reader');
  karaoke({getAudioUrl});await flush();
  const rows=()=>[...host.querySelectorAll('[data-karaoke-sentence]')];
  expect(rows().map(row=>row.tabIndex)).toEqual([0,-1,-1]);
  rows()[0].focus();
  key(document.activeElement,'ArrowRight');
  expect(document.activeElement).toBe(rows()[1]);
  expect(rows()[1].getAttribute('aria-current')).toBe('true');
  key(document.activeElement,'Space');await flush();
  expect(getAudioUrl.mock.calls.some(([text])=>text===sentences[1])).toBe(true);
  expect(document.activeElement).toBe(rows()[1]);
  key(document.activeElement,'Space');await flush();
  expect(button('Resume')).toBeTruthy();
  key(document.activeElement,'End');
  expect(document.activeElement).toBe(rows()[2]);
  key(document.activeElement,'Home');
  expect(document.activeElement).toBe(rows()[0]);
  const play=button('Play');play.focus();
  key(play,'ArrowRight');
  expect(document.activeElement).toBe(play);
  expect(rows()[0].getAttribute('aria-current')).toBe('true');
 });

 it.each(['generated','device'])('keeps a continued %s reading paused and clears its place only after the last sentence ends',async(kind)=>{
  let saved=2;
  const listeningPlace={key:'reader-version',read:()=>saved,write:vi.fn(value=>{saved=value;})};
  const resolver=kind==='generated'?vi.fn(async()=> 'blob:last'):null;
  karaoke({listeningPlace,getAudioUrl:resolver});await flush();
  const choice=[...host.querySelectorAll('button')].find(b=>b.textContent==='Continue at sentence 3');
  expect(choice).toBeTruthy();expect(audios).toHaveLength(0);expect(utterances).toHaveLength(0);
  if(resolver)expect(resolver).not.toHaveBeenCalled();
  click(choice);await flush();expect(host.textContent).toContain('Sentence 3 / 3');
  expect(button('Play')).toBeTruthy();expect(audios).toHaveLength(0);expect(utterances).toHaveLength(0);
  click(button('Play'));await flush();expect(saved).toBe(2);
  act(()=>kind==='generated'?audios[0].dispatchEvent(new Event('ended')):utterances[0].onend());await flush();
  expect(saved).toBeNull();
  karaoke({listeningPlace,getAudioUrl:resolver,isOpen:false});karaoke({listeningPlace,getAudioUrl:resolver});await flush();
  expect(host.textContent).toContain('Sentence 1 / 3');expect(host.textContent).not.toContain('Your listening place');
 });
 it('shows and plays only the take for the selected occurrence of a repeated line',async()=>{
  const phrase='We can.', list=[phrase,phrase];
  const previous=M.KaraokeAudioStore;
  const takes=new Map([['student:0','blob:student-first'],['reference:0','blob:teacher-first']]);
  const inspect=vi.fn((sentence,lane,{occurrence})=>{
   const url=takes.get(lane+':'+occurrence);
   return {status:url?'ready':'missing',url:url||null,source:url?(lane==='student'?'human-student':'human-teacher'):null};
  });
  const raw={get:vi.fn(()=> 'blob:first-only'),has:()=>true,sourceOf:()=> 'human-teacher'};
  const hear=()=>[...host.querySelectorAll('button')].find(b=>b.textContent.includes('Hear my reading'));
  try {
   window.__alloInspectReadAloudAudio=inspect;M.KaraokeAudioStore={current:raw,studentCurrent:raw};
   karaoke({sentenceList:list,getAudioUrl:null});await flush();
   expect(host.textContent).toContain('Teacher recording');click(hear());await flush();
   expect(audios.at(-1).src).toBe('blob:student-first');
   key(document,'ArrowRight');await flush();
   expect(host.textContent).toContain('Sentence 2 / 2');
   expect(host.textContent).not.toContain('Teacher recording');
   expect(host.textContent).toContain('Record this sentence');expect(hear()).toBeUndefined();
   takes.set('student:1','blob:student-second');
   key(document,'ArrowLeft');key(document,'ArrowRight');await flush();
   click(hear());expect(audios.at(-1).src).toBe('blob:student-second');
   expect(raw.get).not.toHaveBeenCalled();
  } finally { M.KaraokeAudioStore=previous;delete window.__alloInspectReadAloudAudio; }
 });
 it('regenerates the selected occurrence of a repeated sentence',async()=>{
  window.__alloRegenerateSentenceAudio=vi.fn(async()=> 'blob:fresh');
  karaoke({sentenceList:['Repeated sentence.','Other sentence.','Repeated sentence.'],isTeacher:true});
  key(document,'ArrowRight');key(document,'ArrowRight');await flush();
  click([...host.querySelectorAll('button')].find(el=>el.textContent.includes('Regenerate this sentence')));await flush();
  expect(window.__alloRegenerateSentenceAudio).toHaveBeenCalledWith('Repeated sentence.',{occurrence:1});
  delete window.__alloRegenerateSentenceAudio;
 });
 it('keeps playback stopped and reports failure when regeneration saves no clip',async()=>{
  window.__alloRegenerateSentenceAudio=vi.fn(async()=>null);
  karaoke({isTeacher:true});
  click([...host.querySelectorAll('button')].find(el=>el.textContent.includes('Regenerate this sentence')));await flush();
  expect(host.textContent).toContain('Could not regenerate audio');expect(button('Play')).not.toBeNull();expect(audios).toHaveLength(0);
  delete window.__alloRegenerateSentenceAudio;
 });

 it('keyboard pause keeps the playhead and highlighted word and Resume uses the same generated clip',async()=>{
  const resolve = vi.fn(async text => 'blob:'+text);
  karaoke({getAudioUrl:resolve}); await flush(); click(button('Play')); await flush();
  const original = audios[0]; original.currentTime = 2.5;
  key(document,'Space'); await flush();
  expect(original.paused).toBe(true); expect(button('Resume')).not.toBeNull();
  expect(progress()).toBe(17); // halfway through the first of three sentences
  act(()=>original.dispatchEvent(new Event('ended'))); await tick(1000);
  expect(progress()).toBe(17); expect(host.textContent).toContain('Sentence 1 / 3');
  const faster = [...host.querySelectorAll('button')].find(b=>b.textContent.trim()==='1.5×');
  click(faster); expect(original.playbackRate).toBe(1.5);
  click(button('Resume')); await flush();
  expect(audios).toEqual([original]); expect(original.currentTime).toBe(2.5);
  expect(original.paused).toBe(false); expect(progress()).toBe(17);
  expect(resolve.mock.calls.filter(([text])=>text===sentences[0])).toHaveLength(1);
 });
 it('ignores ended and error events from a previous generated clip',async()=>{
  karaoke();click(button('Play'));await flush();const old=audios[0];key(document,'ArrowRight');await flush();
  expect(audios).toHaveLength(2);act(()=>{old.dispatchEvent(new Event('ended'));old.dispatchEvent(new Event('error'));});await tick(250);
  expect(audios).toHaveLength(2);expect(audios[1].paused).toBe(false);expect(button('Pause')).not.toBeNull();
 });
 it('invalidates a queued advance when playback stops',async()=>{
  karaoke();click(button('Play'));await flush();act(()=>audios[0].dispatchEvent(new Event('ended')));
  key(document,'Space');await tick(250);expect(audios).toHaveLength(1);expect(button('Play')).not.toBeNull();
 });
 it('ignores cancelled device-voice callbacks after changing sentences',async()=>{
  karaoke({getAudioUrl:null});click(button('Play'));await flush();const old=utterances[0];expect(old).toBeTruthy();
  key(document,'ArrowRight');await flush();act(()=>{utterances[1].onstart();old.onend();old.onerror();});await tick(250);
  expect(utterances).toHaveLength(2);expect(button('Pause')).not.toBeNull();
 });
 it('cancels playback when text is replaced',async()=>{
  karaoke();click(button('Play'));await flush();karaoke({sentenceList:[],text:''});await flush();
  expect(audios[0].paused).toBe(true);expect(button('Play').disabled).toBe(true);expect(host.textContent).toContain('No text to read');
 });
 it('does not silently mark text read when no audio route is available',async()=>{
  vi.stubGlobal('SpeechSynthesisUtterance',undefined);karaoke({getAudioUrl:null});click(button('Play'));await flush();await tick(2000);
  expect(host.textContent).toContain('Audio is unavailable');expect(progress()).toBe(0);expect(button('Play')).not.toBeNull();
 });
 it('releases a late microphone grant after unmount without starting a recorder',async()=>{
  let grant;const stop=vi.fn();Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:vi.fn(()=>new Promise(r=>grant=r))}});
  const constructor=vi.fn();vi.stubGlobal('MediaRecorder',constructor);karaoke();
  click([...host.querySelectorAll('button')].find(b=>b.textContent.includes('Record this sentence')));
  act(()=>root.unmount());root=null;grant({getTracks:()=>[{stop}]});await flush();
  expect(stop).toHaveBeenCalledOnce();expect(constructor).not.toHaveBeenCalled();
 });
 it('releases an active recording on unmount without saving a cancelled take',async()=>{
  const stop=vi.fn(),save=vi.fn();window.__alloStoreStudentSentenceAudio=save;
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop}]})}});
  let recorder;vi.stubGlobal('MediaRecorder',class{constructor(){recorder=this;this.state='inactive';this.mimeType='audio/webm';}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['voice'])});this.onstop?.();}});
  karaoke();click([...host.querySelectorAll('button')].find(b=>b.textContent.includes('Record this sentence')));await flush();expect(recorder.state).toBe('recording');
  act(()=>root.unmount());root=null;await flush();expect(stop).toHaveBeenCalled();expect(recorder.state).toBe('inactive');expect(save).not.toHaveBeenCalled();
 });
});
const settings={textSize:20,bgColor:'#fdfbf7',fontColor:'#1e293b'};
function ToolbarHarness(){const [value,setValue]=React.useState(settings);return React.createElement(M.ImmersiveToolbar,{settings:value,setSettings:setValue,onClose:()=>{},playbackRate:1,lineHeight:1.5,letterSpacing:0,setPlaybackRate:()=>{},setLineHeight:()=>{},setLetterSpacing:()=>{}});}
describe('Reader controls and word accessibility',()=>{
 it('keeps the focused toggle node after a setting changes and announces its state',()=>{
  M.ToolbarHarness=ToolbarHarness;render('ToolbarHarness');const wide=host.querySelector('[data-help-key="immersive_wide_text"]');wide.focus();click(wide);
  expect(document.activeElement).toBe(wide);expect(wide.isConnected).toBe(true);expect(wide.getAttribute('aria-pressed')).toBe('true');
 });
 it('shows the selected colour preset and supports collapsing settings',()=>{
  M.ToolbarHarness=ToolbarHarness;render('ToolbarHarness');const select=host.querySelector('select[aria-label="Color preset"]');expect(select.value).toBe('warm');
  act(()=>{select.value='dark';select.dispatchEvent(new Event('change',{bubbles:true}));});expect(select.value).toBe('dark');
  const toggle=host.querySelector('[aria-controls="immersive-reader-settings"]');click(toggle);expect(toggle.getAttribute('aria-expanded')).toBe('false');expect(host.querySelector('#immersive-reader-settings').hidden).toBe(true);
 });
 it('lets keyboard users activate words and preserves custom heading colour',()=>{
  const onClick=vi.fn();render('ImmersiveWord',{wordData:{text:'Heading',pos:'header2'},settings,onClick});
  const word=host.querySelector('[role="button"]');expect(word.tabIndex).toBe(0);key(word,'Enter');key(word,'Space');expect(onClick).toHaveBeenCalledTimes(2);expect(word.className).not.toContain('text-slate-800');
 });
 it('wraps Tab into the reader from its dialog container and skips hidden controls',async()=>{
  render('FocusReaderOverlay',{text:passage});await tick(0);const dialog=host.querySelector('[role="dialog"]');const first=dialog.querySelector('button');first.hidden=true;dialog.focus();key(dialog,'Tab');
  expect(document.activeElement).toBe(dialog.querySelector('input'));
 });
});


it('does not add blank whitespace or punctuation to the word tab order',()=>{render('ImmersiveWord',{wordData:{text:' ',pos:'none'},settings,onClick:vi.fn()});expect(host.querySelector('[tabindex]')).toBeNull();render('ImmersiveWord',{wordData:{text:'.',pos:'none'},settings,onClick:vi.fn()});expect(host.querySelector('[tabindex]')).toBeNull();});

it('starts Crawl without animation for reduced-motion users and toggles once on Space',()=>{vi.stubGlobal('matchMedia',()=>({matches:true}));render('PerspectiveCrawlOverlay',{text:passage});const panel=host.querySelector('[role=button]');expect(panel.getAttribute('aria-pressed')).toBe('false');expect(panel.className).toContain('overflow-auto');key(panel,'Space');expect(panel.getAttribute('aria-pressed')).toBe('true');});

it('changing capture and auto-advance settings does not restart the current audio',async()=>{karaoke();click(button('Play'));await flush();karaoke({captureOn:true});await flush();expect(audios).toHaveLength(1);const auto=[...host.querySelectorAll('input[type=checkbox]')].find(el=>el.parentElement.textContent.includes('Auto-advance'));click(auto);await flush();expect(audios).toHaveLength(1);expect(audios[0].paused).toBe(false);});

it('keeps arrow navigation available on the keyboard-focused reading surface',()=>{render('FocusReaderOverlay',{text:passage});surface().focus();key(surface(),'ArrowRight');expect(progress()).toBe(50);key(surface(),'ArrowLeft');expect(progress()).toBe(25);});

describe('reader playback and diagnostics cleanup',()=>{
 it.each(['generated','device'])('cancels queued %s advancement on unmount immediately',async route=>{
  // jsdom may already own a zero-delay task; reader teardown must add none.
  const initialTimers=vi.getTimerCount();
  karaoke(route==='device'?{getAudioUrl:null}:{});click(button('Play'));await flush();
  act(()=>route==='device'?utterances[0].onend():audios[0].dispatchEvent(new Event('ended')));
  expect(vi.getTimerCount()).toBeGreaterThan(initialTimers);act(()=>root.unmount());root=null;await flush();expect(vi.getTimerCount()).toBe(initialTimers);
 });
 it('settles a hung audio watchdog on close and ignores a late result',async()=>{
  let resolve;const getAudioUrl=()=>new Promise(done=>{resolve=done;});karaoke({getAudioUrl});click(button('Play'));await flush();
  expect(vi.getTimerCount()).toBeGreaterThan(0);karaoke({getAudioUrl,isOpen:false});await flush();expect(vi.getTimerCount()).toBe(0);
  resolve('blob:late');await flush();expect(audios).toHaveLength(0);expect(utterances).toHaveLength(0);
 });
 it('does not schedule diagnostics feedback after a late clipboard completion',async()=>{
  let done;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise(resolve=>{done=resolve;})}});
  karaoke();click([...host.querySelectorAll('button')].find(el=>el.textContent.includes('Diagnostics')));
  act(()=>root.unmount());root=null;done();await flush();expect(vi.getTimerCount()).toBe(0);
 });
 it('cancels diagnostics feedback when closed',async()=>{
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{}}});karaoke();
  click([...host.querySelectorAll('button')].find(el=>el.textContent.includes('Diagnostics')));await flush();
  expect(host.textContent).toContain('Copied');act(()=>root.unmount());root=null;await flush();expect(vi.getTimerCount()).toBe(0);
 });
});
it('clears copied feedback when the narration scope changes',async()=>{
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{}}});karaoke();click([...host.querySelectorAll('button')].find(el=>el.textContent.includes('Diagnostics')));await flush();expect(host.textContent).toContain('Copied');
 karaoke({sentenceList:['Replacement sentence.']});await flush();expect(host.textContent).not.toContain('Copied');
});
it('removes the temporary diagnostics field even when fallback copying throws',async()=>{
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied');}}});
 const original=document.execCommand;document.execCommand=()=>{throw Error('unavailable');};
 try{karaoke();click([...host.querySelectorAll('button')].find(el=>el.textContent.includes('Diagnostics')));await flush();expect(document.querySelectorAll('textarea')).toHaveLength(0);}finally{document.execCommand=original;}
});

it('does not fall back to legacy copying after a late clipboard rejection on close',async()=>{
 let rejectClipboard;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise((_resolve,reject)=>{rejectClipboard=reject;})}});
 const original=document.execCommand;const legacyCopy=vi.fn(()=>true);document.execCommand=legacyCopy;
 try{karaoke();click([...host.querySelectorAll('button')].find(el=>el.textContent.includes('Diagnostics')));karaoke({isOpen:false});rejectClipboard(Error('clipboard denied'));await flush();expect(legacyCopy).not.toHaveBeenCalled();expect(document.querySelectorAll('textarea')).toHaveLength(0);expect(vi.getTimerCount()).toBe(0);}finally{document.execCommand=original;}
});

describe('Crawl text preparation',()=>{
 function crawlProbe(texts){
  vi.stubGlobal('matchMedia',()=>({matches:false}));
  const frames=new Map(),scans=new Map(texts.map(text=>[text,0]));let serial=0;
  vi.stubGlobal('requestAnimationFrame',vi.fn(callback=>{const id=++serial;frames.set(id,callback);return id;}));
  vi.stubGlobal('cancelAnimationFrame',vi.fn(id=>frames.delete(id)));
  const replace=String.prototype.replace;
  vi.spyOn(String.prototype,'replace').mockImplementation(function(...args){
   const text=String(this);if(scans.has(text))scans.set(text,scans.get(text)+1);
   return replace.apply(this,args);
  });
  return {frames,scans,frame:time=>act(()=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(callback=>callback(time));})};
 }
 it.each([false,true])('Space restarts a completed crawl from the beginning (StrictMode=%s)',strict=>{
  const text='A short reading.';
  const probe=crawlProbe([text]);localStorage.setItem('allo_crawl_speed','140');
  render('PerspectiveCrawlOverlay',{text},strict);
  const panel=surface(),slab=panel.querySelector('p').parentElement;
  Object.defineProperty(panel,'clientHeight',{configurable:true,value:30});
  Object.defineProperty(slab,'clientHeight',{configurable:true,value:20});
  for(let time=0;time<=400;time+=100)probe.frame(time);
  expect(host.textContent).toContain('THE END');expect(probe.frames.size).toBe(0);
  expect(key(document,'Space').defaultPrevented).toBe(true);
  expect(host.textContent).not.toContain('THE END');expect(slab.style.transform).toContain('translateY(0px)');
  expect(panel.getAttribute('aria-pressed')).toBe('true');expect(probe.frames.size).toBe(1);
  probe.frame(1000);probe.frame(1016);
  expect(panel.getAttribute('aria-pressed')).toBe('true');expect(slab.style.transform).not.toContain('translateY(0px)');
  key(document,'Space');expect(panel.getAttribute('aria-pressed')).toBe('false');expect(probe.frames.size).toBe(0);
  const paused=slab.style.transform;
  key(document,'Space',{ctrlKey:true});key(host.querySelector('input'),'Space');
  expect(panel.getAttribute('aria-pressed')).toBe('false');expect(slab.style.transform).toBe(paused);
 });
 it.each([false,true])('reuses prepared text during animation and refreshes a changed passage (StrictMode=%s)',strict=>{
  const text=Array.from({length:300},(_,i)=>'<p>Paragraph '+i+' stays current.</p>').join('\n\n');
  const changed='<p>Replacement passage.</p>\n\nA different ending.';
  const probe=crawlProbe([text,changed]);
  render('PerspectiveCrawlOverlay',{text},strict);const initial=probe.scans.get(text);
  expect(initial).toBeGreaterThan(0);expect(probe.frames.size).toBe(1);
  const initialView=host.querySelector('[role=button]').innerHTML;
  for(let i=0;i<25;i++)probe.frame(i*16);
  expect(host.querySelector('[role=button]').innerHTML).not.toBe(initialView);
  expect(probe.scans.get(text)).toBe(initial);expect(host.textContent).toContain('Paragraph 299 stays current.');
  render('PerspectiveCrawlOverlay',{text:changed},strict);
  expect(probe.scans.get(changed)).toBeGreaterThan(0);
  expect(host.textContent).toContain('A different ending.');expect(host.textContent).not.toContain('Paragraph 0 stays current.');
  act(()=>root.unmount());root=null;expect(probe.frames.size).toBe(0);
 });
 it.each([false,true])('keeps hidden text unprepared and releases preparation on close (StrictMode=%s)',strict=>{
  const text='<p>Original hidden passage.</p>',changed='<p>Latest hidden passage.</p>';
  const probe=crawlProbe([text,changed]);
  render('PerspectiveCrawlOverlay',{text,isOpen:false},strict);
  render('PerspectiveCrawlOverlay',{text:changed,isOpen:false},strict);
  expect(probe.scans.get(text)).toBe(0);expect(probe.scans.get(changed)).toBe(0);expect(probe.frames.size).toBe(0);
  render('PerspectiveCrawlOverlay',{text:changed},strict);const prepared=probe.scans.get(changed);
  expect(prepared).toBeGreaterThan(0);expect(host.textContent).toContain('Latest hidden passage.');
  render('PerspectiveCrawlOverlay',{text:changed,isOpen:false},strict);
  expect(host.textContent).toBe('');expect(probe.frames.size).toBe(0);expect(probe.scans.get(changed)).toBe(prepared);
  render('PerspectiveCrawlOverlay',{text:changed},strict);
  expect(probe.scans.get(changed)).toBeGreaterThan(prepared);expect(host.textContent).toContain('Latest hidden passage.');
  act(()=>root.unmount());root=null;expect(probe.frames.size).toBe(0);
 });
});


it('leaves Kokoro playback paused and retryable without switching to the device voice', async () => {
  karaoke({ requestedVoice: 'af_bella', getAudioUrl: async () => null });
  click(button('Play')); await flush();
  expect(utterances).toHaveLength(0);
  expect(host.textContent).toContain('The selected Kokoro voice could not read this sentence');
  expect(button('Play')).not.toBeNull();
  karaoke({ requestedVoice: 'af_bella', getAudioUrl: async () => 'blob:kokoro-ready' });
  click(button('Play')); await flush();
  expect(audios.some(audio => audio.src === 'blob:kokoro-ready')).toBe(true);
  expect(utterances).toHaveLength(0);
});


it('identifies the explicit device speech provider before reading through it', async () => {
  localStorage.setItem('alloflow_ai_config', JSON.stringify({ ttsProvider: 'browser' }));
  try {
    karaoke({ requestedVoice: 'af_bella', getAudioUrl: async () => null });
    click(button('Play')); await flush();
    expect(utterances).toHaveLength(1);
    expect(host.textContent).toContain('The speech provider is set to Device voice');
  } finally { localStorage.removeItem('alloflow_ai_config'); }
});


describe('retrying a broken Read Along clip', () => {
  afterEach(() => { delete window.__alloInvalidateTtsUrl; delete window.__alloQuarantineReadAloudAudio; });

  it.each(['media error', 'play rejection'])('re-resolves the same sentence after %s without using the device voice', async failure => {
    const first = sentences[0];
    const outcomes = ['blob:bad-warm', 'blob:bad-warm', null, 'blob:recovered'];
    const resolver = vi.fn(async text => text === first ? outcomes.shift() : 'blob:next');
    const invalidate = window.__alloInvalidateTtsUrl = vi.fn();
    const quarantine = window.__alloQuarantineReadAloudAudio = vi.fn(async () => true);
    if (failure === 'play rejection') {
      const RegularAudio = window.Audio;
      vi.stubGlobal('Audio', class extends RegularAudio {
        play() { return this.src === 'blob:bad-warm' ? Promise.reject(new DOMException('Cannot decode clip', 'NotSupportedError')) : super.play(); }
      });
    }
    karaoke({ getAudioUrl: resolver, requestedVoice: 'Kore' }); await flush();
    const attempts = () => resolver.mock.calls.filter(([text]) => text === first);
    expect(attempts()).toHaveLength(1);
    click(button('Play')); await flush();
    if (failure === 'media error') { act(() => audios[0].dispatchEvent(new Event('error'))); await flush(); }
    expect(button('Retry this sentence')).not.toBeNull();
    expect(host.textContent).toContain('Sentence 1 / 3');
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(quarantine).toHaveBeenCalledWith(first, expect.anything(), expect.objectContaining({occurrence:0}));
    expect(attempts()).toHaveLength(1); // A failed clip waits for a deliberate retry.
    click(button('Retry this sentence')); await flush();
    expect(attempts()).toHaveLength(2);
    expect(attempts()[1][1]).toEqual(expect.objectContaining({reason:'karaoke-retry',force:true}));
    expect(button('Retry this sentence')).not.toBeNull();
    expect(utterances).toHaveLength(0);
    click(button('Retry this sentence')); await flush();
    expect(attempts()).toHaveLength(3);
    expect(button('Retry this sentence')).not.toBeNull();
    expect(audios.map(audio => audio.src)).toEqual(['blob:bad-warm']);
    click(button('Retry this sentence')); await flush();
    expect(attempts()).toHaveLength(4);
    expect(audios.map(audio => audio.src)).toEqual(['blob:bad-warm','blob:recovered']);
    expect(button('Pause')).not.toBeNull();
    act(() => { audios[0].dispatchEvent(new Event('error')); audios[0].dispatchEvent(new Event('ended')); });
    await tick(300);
    expect(button('Pause')).not.toBeNull(); expect(host.textContent).toContain('Sentence 1 / 3');
    expect(invalidate).toHaveBeenCalledTimes(1); expect(utterances).toHaveLength(0);
  });

  it('re-resolves a browser-blocked recording without quarantining valid teacher audio', async () => {
    const AudioBase = window.Audio;
    let blocked = true;
    vi.stubGlobal('Audio', class extends AudioBase {
      play() { if (blocked) { blocked = false; return Promise.reject(new DOMException('Playback blocked', 'NotAllowedError')); } return super.play(); }
    });
    const resolver = vi.fn(async () => 'blob:teacher-take');
    const quarantine = window.__alloQuarantineReadAloudAudio = vi.fn();
    karaoke({ sentenceList:[sentences[0]], getAudioUrl:resolver }); await flush();
    click(button('Play')); await flush(); click(button('Retry this sentence')); await flush();
    expect(resolver).toHaveBeenCalledTimes(2);
    expect(resolver.mock.calls[1][1].force).not.toBe(true);
    expect(quarantine).not.toHaveBeenCalled(); expect(button('Pause')).not.toBeNull();
    expect(utterances).toHaveLength(0);
  });

  it('ignores stale audio when a retry is stopped before a fresh clip resolves', async () => {
    let release;
    const resolver = vi.fn((text, options) => options.reason === 'karaoke-retry' ? new Promise(resolve => { release = resolve; }) : Promise.resolve('blob:'+text));
    karaoke({ getAudioUrl:resolver }); await flush(); click(button('Play')); await flush();
    act(() => audios[0].dispatchEvent(new Event('error'))); await flush();
    click(button('Retry this sentence')); await flush();
    expect(typeof release).toBe('function');
    click(button('Stop loading audio')); await flush();
    release('blob:stale-retry'); await flush();
    expect(audios.map(audio => audio.src)).not.toContain('blob:stale-retry');
    expect(button('Retry this sentence')).not.toBeNull(); expect(utterances).toHaveLength(0);
  });
});


describe('Read Along paused sentence ownership', () => {
  function nativeControls() {
    const synth = window.speechSynthesis;
    synth.paused = false;
    synth.pause = vi.fn(() => { synth.paused = true; });
    synth.resume = vi.fn(() => { synth.paused = false; });
    return synth;
  }
  async function startDevice() {
    karaoke({ getAudioUrl:null }); click(button('Play')); await flush();
    const utterance = utterances[0]; act(() => utterance.onstart()); await flush();
    return utterance;
  }
  it('holds the owned device utterance, ignores paused boundary updates, and releases the device pause on close', async () => {
    const synth = nativeControls();
    const before = window.AlloModules.WordTiming;
    window.AlloModules.WordTiming = { weightPctAtCharIndex: (_text, i) => i * 10 };
    try {
      const utterance = await startDevice();
      act(() => utterance.onboundary({ name:'word', charIndex:3 })); await flush();
      expect(progress()).toBe(10);
      click(button('Pause')); await flush();
      expect(synth.pause).toHaveBeenCalledTimes(1); expect(button('Resume')).not.toBeNull();
      act(() => utterance.onboundary({ name:'word', charIndex:7 })); await tick(4000);
      expect(progress()).toBe(10); expect(utterances).toHaveLength(1);
      key(document, 'Space'); await flush();
      expect(synth.resume).toHaveBeenCalledTimes(1); expect(button('Pause')).not.toBeNull();
      act(() => utterance.onboundary({ name:'word', charIndex:6 })); await flush();
      expect(progress()).toBe(20); expect(utterances).toEqual([utterance]);
      key(document,'Space'); await flush();
      karaoke({ isOpen:false, getAudioUrl:null }); await flush();
      expect(synth.paused).toBe(false); expect(synth.cancel).toHaveBeenCalled();
      act(() => utterance.onend()); await tick(500);
      expect(utterances).toHaveLength(1);
    } finally { window.AlloModules.WordTiming = before; }
  });
  it.each(['unsupported','unconfirmed','device ends while paused'])('explains restarting without advancing when pause is %s', async kind => {
    if (kind === 'device ends while paused') nativeControls();
    if (kind === 'unconfirmed') { window.speechSynthesis.pause = vi.fn(); window.speechSynthesis.resume = vi.fn(); }
    const utterance = await startDevice(); click(button('Pause')); await flush();
    if (kind === 'device ends while paused') { act(() => utterance.onend()); await flush(); }
    expect(host.textContent).toContain('Play starts this sentence again'); expect(button('Play')).not.toBeNull();
    await tick(300); expect(host.textContent).toContain('Sentence 1 / 3');
    click(button('Play')); await flush(); expect(utterances[1].text).toBe(sentences[0]);
  });
  it('excludes paused wall time from the device highlight even with no native word boundaries', async () => {
    nativeControls(); let now=100, frame;
    vi.spyOn(performance,'now').mockImplementation(()=>now);
    vi.stubGlobal('requestAnimationFrame', callback => { frame=callback; return 1; });
    await startDevice(); now=400; act(()=>frame(now)); await flush();
    const held = progress(); expect(held).toBeGreaterThan(0);
    click(button('Pause')); await flush(); now=4000; act(()=>frame(now)); await flush();
    expect(progress()).toBe(held);
    click(button('Resume')); await flush(); act(()=>frame(now)); await flush();
    expect(progress()).toBe(held); expect(utterances).toHaveLength(1);
    now+=250; act(()=>frame(now)); await flush(); expect(progress()).toBeGreaterThan(held);
  });
  it('explains a native resume that leaves the device engine paused', async () => {
    const synth=nativeControls(); synth.resume=vi.fn();
    await startDevice(); click(button('Pause')); await flush(); click(button('Resume')); await flush();
    await tick(500);
    expect(button('Play')).not.toBeNull(); expect(host.textContent).toContain('Play starts this sentence again');
    expect(host.textContent).toContain('Sentence 1 / 3'); expect(utterances).toHaveLength(1);
  });
  it('keeps accessible progress at the actual paused position in reduced-motion mode', async () => {
    vi.stubGlobal('matchMedia',()=>({matches:true}));
    karaoke(); click(button('Play')); await flush(); audios[0].currentTime=2.5;
    click(button('Pause')); await flush(); expect(progress()).toBe(17);
    expect(button('Resume')).not.toBeNull();
  });
  it('discards a paused device utterance when its native speaking rate changes', async () => {
    const synth = nativeControls(); const old = await startDevice(); click(button('Pause')); await flush();
    click([...host.querySelectorAll('button')].find(b=>b.textContent.trim()==='1.5×')); await flush();
    expect(synth.paused).toBe(false); expect(host.textContent).toContain('new device speech speed');
    expect(button('Resume')).toBeNull(); click(button('Play')); await flush();
    expect(utterances[1]).not.toBe(old); expect(utterances[1].rate).toBeCloseTo(1.425);
  });
  it('releases a paused clip instead of resuming it after navigation, voice/profile changes, text replacement or closing', async () => {
    const first = vi.fn(async t=>'blob:old-'+t), next=vi.fn(async t=>'blob:new-'+t);
    karaoke({ getAudioUrl:first, requestedVoice:'Kore' }); await flush(); click(button('Play')); await flush();
    click(button('Pause')); await flush(); key(document,'ArrowRight'); await flush();
    expect(button('Resume')).toBeNull(); expect(host.textContent).toContain('Sentence 2 / 3');
    click(button('Play')); await flush(); expect(audios.at(-1).src).toBe('blob:old-'+sentences[1]);
    click(button('Pause')); await flush();
    karaoke({getAudioUrl:next, requestedVoice:'Puck'}); await flush();
    expect(button('Resume')).toBeNull(); click(button('Play')); await flush();
    expect(audios.at(-1).src).toBe('blob:new-'+sentences[1]);
    click(button('Pause')); await flush();
    const changed = { getAudioUrl:next, requestedVoice:'Puck', sentenceList:['A different passage.'] };
    karaoke(changed); await flush(); expect(button('Resume')).toBeNull();
    click(button('Play')); await flush(); expect(audios.at(-1).src).toBe('blob:new-A different passage.');
    click(button('Pause')); await flush(); karaoke({...changed,isOpen:false}); karaoke(changed); await flush();
    expect(button('Resume')).toBeNull(); expect(button('Play')).not.toBeNull();
  });
});

describe('Read Along preparation outcomes', () => {
 const prepareButton = () => [...host.querySelectorAll('button')].find(b => /Prepare read-aloud|Retry preparation|Continue preparation|^✓ Saved|^… \d+\//.test(b.textContent));
 afterEach(() => { delete window.__alloPrepareReadAloud; });
 it.each([null, {ok:false, total:0, remaining:0}, {ok:false, remaining:1, failed:1}])('does not call an unavailable or failed result saved: %s', async result => {
   window.__alloPrepareReadAloud=vi.fn().mockResolvedValueOnce(result).mockResolvedValueOnce({ok:true,total:3,generated:3,remaining:0});
   karaoke({isTeacher:true});click(prepareButton());await flush();
   expect(host.textContent).toContain('Audio preparation did not finish.');expect(prepareButton().textContent).toContain('Retry preparation');
   click(prepareButton());await flush();expect(prepareButton().textContent).toContain('Saved');expect(host.textContent).toContain('Read-aloud audio is saved.');
 });
 it('reports thrown failures and distinguishes a deliberately stopped request',async()=>{
   let finish;window.__alloPrepareReadAloud=vi.fn().mockRejectedValueOnce(new Error('Storage unavailable')).mockImplementationOnce((list,progress,{signal})=>new Promise(resolve=>{finish=()=>resolve({ok:false,cancelled:signal.aborted,remaining:2,total:3,generated:1});}));
   karaoke({isTeacher:true});click(prepareButton());await flush();expect(prepareButton().textContent).toContain('Retry preparation');
   click(prepareButton());await flush();const signal=window.__alloPrepareReadAloud.mock.calls[1][2].signal;
   click(prepareButton());expect(signal.aborted).toBe(true);finish();await flush();
   expect(prepareButton().textContent).toContain('Continue preparation');expect(host.textContent).toContain('Preparation stopped.');
 });
 it('aborts on close and ignores a late success after reopening',async()=>{
   let finish;window.__alloPrepareReadAloud=vi.fn(()=>new Promise(resolve=>{finish=resolve;}));
   const props={isTeacher:true,getAudioUrl:null};karaoke(props);click(prepareButton());await flush();
   const signal=window.__alloPrepareReadAloud.mock.calls[0][2].signal;
   karaoke({...props,isOpen:false});expect(signal.aborted).toBe(true);karaoke(props);
   finish({ok:true,total:3,generated:3,remaining:0});await flush();
   expect(prepareButton().textContent).toContain('Prepare read-aloud');expect(host.textContent).not.toContain('Read-aloud audio is saved.');
 });
});
