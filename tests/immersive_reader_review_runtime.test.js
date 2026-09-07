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

 it('keyboard pause stops generated audio immediately',async()=>{
  karaoke();click(button('Play'));await flush();expect(audios).toHaveLength(1);
  key(document,'Space');await flush();expect(audios[0].paused).toBe(true);expect(button('Play')).not.toBeNull();
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
  click([...host.querySelectorAll('button')].find(b=>b.textContent.includes('Record my reading')));
  act(()=>root.unmount());root=null;grant({getTracks:()=>[{stop}]});await flush();
  expect(stop).toHaveBeenCalledOnce();expect(constructor).not.toHaveBeenCalled();
 });
 it('releases an active recording on unmount without saving a cancelled take',async()=>{
  const stop=vi.fn(),save=vi.fn();window.__alloStoreStudentSentenceAudio=save;
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop}]})}});
  let recorder;vi.stubGlobal('MediaRecorder',class{constructor(){recorder=this;this.state='inactive';this.mimeType='audio/webm';}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['voice'])});this.onstop?.();}});
  karaoke();click([...host.querySelectorAll('button')].find(b=>b.textContent.includes('Record my reading')));await flush();expect(recorder.state).toBe('recording');
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
