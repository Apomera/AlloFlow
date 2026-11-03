import {beforeAll,beforeEach,afterEach,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {loadAlloModule} from './setup.js';
const require=createRequire(import.meta.url),base=resolve('desktop/web-app/node_modules');
let React,createRoot,act,M,root,host,props,requests,recorders,audios,save;
const sentences=['First sentence.','Second sentence.','Third sentence.'];
beforeAll(()=>{
 React=require(resolve(base,'react'));({createRoot}=require(resolve(base,'react-dom/client')));({act}=require(resolve(base,'react-dom/test-utils')));
 global.React=window.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;
 window.AlloLanguageContext=React.createContext({t:key=>key});
 loadAlloModule(resolve(process.env.READALONG_PERMISSION_CANDIDATES||'.','immersive_reader_module.js'));M=window.AlloModules;
});
beforeEach(()=>{
 vi.useFakeTimers({toFake:['setTimeout','clearTimeout']});localStorage.clear();requests=[];recorders=[];audios=[];
 vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn());
 window.HTMLElement.prototype.scrollIntoView=vi.fn();
 vi.stubGlobal('Audio',class extends EventTarget{
  constructor(src){super();this.src=src;this.currentTime=0;this.duration=5;this.paused=true;this.pause=vi.fn(()=>{this.paused=true;});this.play=vi.fn(()=>{this.paused=false;return Promise.resolve();});audios.push(this);}
 });
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:vi.fn(()=>new Promise((resolve,reject)=>requests.push({resolve,reject,stop:vi.fn()})))}});
 vi.stubGlobal('MediaRecorder',class{
  constructor(stream){this.stream=stream;this.state='inactive';this.mimeType='audio/webm';this.start=vi.fn(()=>{this.state='recording';});recorders.push(this);}
  stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['synthetic reading'])});this.onstop?.();}
 });
 save=vi.fn(async()=>false);window.__alloStoreStudentSentenceAudio=save;window.__alloStoreRecordedSentenceAudio=save;
 props={sentenceList:sentences,isOpen:true,onClose:vi.fn(),isTeacher:false,captureOn:false,getAudioUrl:vi.fn(async()=> 'blob:reference')};
 host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
});
afterEach(()=>{
 if(root)act(()=>root.unmount());root=null;host?.remove();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();
 delete window.__alloStoreStudentSentenceAudio;delete window.__alloStoreRecordedSentenceAudio;
});
const flush=async()=>act(async()=>{for(let i=0;i<10;i++)await Promise.resolve();});
function render(extra={}){props={...props,...extra};act(()=>root.render(React.createElement(M.KaraokeReaderOverlay,props)));}
const find=text=>[...host.querySelectorAll('button')].find(button=>button.textContent.includes(text));
const recordButton=()=>find(props.isTeacher?'Record my voice':'Record this sentence')||find('Record my reading')||find('Stop recording');
const mainPlay=()=>host.querySelector('button[aria-busy][aria-pressed]');
const pending=()=>host.querySelector('[data-recording-permission-pending]');
const click=button=>{expect(button).toBeTruthy();act(()=>button.click());};
const key=code=>act(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code,key:code==='Space'?' ':code,bubbles:true,cancelable:true})));
async function begin(extra={}){render(extra);await flush();click(recordButton());await flush();}
async function grant(index){act(()=>requests[index].resolve({getTracks:()=>[{stop:requests[index].stop}]}));await flush();}
async function reject(index){act(()=>requests[index].reject(new DOMException('Synthetic permission refusal','NotAllowedError')));await flush();}
function expectSilent(){expect(audios.flatMap(audio=>audio.play.mock.calls)).toHaveLength(0);expect(props.getAudioUrl.mock.calls.filter(([,options])=>['karaoke-play','karaoke-retry'].includes(options?.reason))).toHaveLength(0);expect(mainPlay()?.getAttribute('aria-pressed')).toBe('false');}

it.each([false,true])('shows a cancellable request, then releases its late grant without recording, teacher=%s',async teacher=>{
 await begin({isTeacher:teacher});expect(pending()?.textContent).toContain('Waiting for microphone permission');expect(document.activeElement).toBe(pending());
 expect(recordButton().disabled).toBe(true);expect(mainPlay().disabled).toBe(true);expect(recorders).toHaveLength(0);
 click(find('Cancel microphone request'));await flush();expect(pending()).toBeNull();expect(recordButton().disabled).toBe(false);expect(document.activeElement).toBe(recordButton());
 await grant(0);expect(requests[0].stop).toHaveBeenCalledOnce();expect(recorders).toHaveLength(0);expect(save).not.toHaveBeenCalled();expectSilent();
});
it.each([false,true])('blocks pending playback and starts only the requested microphone take, teacher=%s',async teacher=>{
 await begin({isTeacher:teacher});key('Space');click(host.querySelector('[aria-current="true"][role="button"]'));click(mainPlay());await flush();expectSilent();
 await grant(0);expect(recorders).toHaveLength(1);expect(recorders[0].start).toHaveBeenCalledOnce();expect(recorders[0].state).toBe('recording');
 expect(pending()).toBeNull();expect(document.activeElement).toBe(find('Stop recording'));expect(requests[0].stop).not.toHaveBeenCalled();expectSilent();
});
it('reports a rejected request and allows a fresh attempt without autoplay',async()=>{
 await begin();await reject(0);expect(pending()).toBeNull();expect(host.textContent).toContain('Check microphone access');expect(recordButton().disabled).toBe(false);expect(mainPlay().disabled).toBe(false);
 click(recordButton());await flush();expect(requests).toHaveLength(2);expect(pending()).toBeTruthy();expect(host.textContent).not.toContain('Check microphone access');await grant(1);expect(recorders).toHaveLength(1);expectSilent();
});
it.each(['grant','reject'])('an old %s cannot clear a newer pending request or permit duplicates',async outcome=>{
 await begin();click(find('Cancel microphone request'));await flush();click(recordButton());await flush();
 if(outcome==='grant')await grant(0);else await reject(0);
 expect(pending()).toBeTruthy();expect(recordButton().disabled).toBe(true);click(recordButton());expect(requests).toHaveLength(2);expect(recorders).toHaveLength(0);expect(host.textContent).not.toContain('Check microphone access');
 await grant(1);expect(recorders).toHaveLength(1);expect(recorders[0].state).toBe('recording');expectSilent();
});
it.each(['grant','reject'])('an old %s cannot stop a newer active recording',async outcome=>{
 await begin();click(find('Cancel microphone request'));await flush();click(recordButton());await flush();await grant(1);const recorder=recorders[0];
 if(outcome==='grant')await grant(0);else await reject(0);
 expect(recorders).toHaveLength(1);expect(recorder.state).toBe('recording');expect(requests[1].stop).not.toHaveBeenCalled();expect(find('Stop recording')).toBeTruthy();expect(host.textContent).not.toContain('Check microphone access');expectSilent();
});
it('cancels before invoking Close, including a parent that has not unmounted yet',async()=>{
 await begin();click(host.querySelector('button[aria-label="Close"]'));await flush();expect(props.onClose).toHaveBeenCalledOnce();expect(pending()).toBeNull();
 await grant(0);expect(requests[0].stop).toHaveBeenCalledOnce();expect(recorders).toHaveLength(0);expect(save).not.toHaveBeenCalled();expectSilent();
});
it.each(['ArrowRight','Home','End','row','restart'])('cancels pending permission on %s navigation before a late grant',async action=>{
 await begin();if(action==='row')click([...host.querySelectorAll('[role="button"]')].find(node=>node.textContent==='Second sentence.'));else if(action==='restart')click(find('Restart'));else key(action);await flush();
 expect(pending()).toBeNull();if(action==='ArrowRight'||action==='row')expect(host.textContent).toContain('Sentence 2 / 3');
 await grant(0);expect(requests[0].stop).toHaveBeenCalledOnce();expect(recorders).toHaveLength(0);expect(save).not.toHaveBeenCalled();expectSilent();
});
it.each(['closed','text','sentences','role','unmount'])('invalidates permission on %s session changes',async action=>{
 await begin();if(action==='unmount'){act(()=>root.unmount());root=null;}else render(action==='closed'?{isOpen:false}:action==='text'?{text:'Replacement source'}:action==='sentences'?{sentenceList:['Replacement sentence.']}:{isTeacher:true});
 await grant(0);expect(requests[0].stop).toHaveBeenCalledOnce();expect(recorders).toHaveLength(0);expect(save).not.toHaveBeenCalled();expect(pending()).toBeNull();
});
it('recovers controls and releases microphone tracks when recorder startup throws',async()=>{
 await begin();vi.stubGlobal('MediaRecorder',class{start(){throw new Error('Synthetic recorder startup failure');}});await grant(0);
 expect(requests[0].stop).toHaveBeenCalled();expect(pending()).toBeNull();expect(recordButton().disabled).toBe(false);expect(host.textContent).toContain('Check microphone access');expect(save).not.toHaveBeenCalled();expectSilent();
});
