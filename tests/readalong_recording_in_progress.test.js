import {beforeAll,beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {loadAlloModule} from './setup.js';
const require=createRequire(import.meta.url),base=resolve('desktop/web-app/node_modules');
let React,createRoot,act,M,root,host,recorder,props,stop;
const sentences=['First sentence.','First sentence.','Last sentence.'];
beforeAll(()=>{
 React=require(resolve(base,'react'));({createRoot}=require(resolve(base,'react-dom/client')));({act}=require(resolve(base,'react-dom/test-utils')));
 global.React=window.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;
 window.AlloLanguageContext=React.createContext({t:k=>k});
 loadAlloModule(resolve(process.env.CLASSROOM_CONTINUITY_CANDIDATES||'.','immersive_reader_module.js'));M=window.AlloModules;
});
beforeEach(()=>{
 localStorage.clear();vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn());
 window.HTMLElement.prototype.scrollIntoView=vi.fn();
 vi.stubGlobal('Audio',class extends EventTarget{constructor(){super();this.pause=vi.fn();}play(){return Promise.resolve();}});
 stop=vi.fn();Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:vi.fn(async()=>({getTracks:()=>[{stop}]}))}});
 vi.stubGlobal('MediaRecorder',class{constructor(){recorder=this;this.state='inactive';this.mimeType='audio/webm';}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['my take'])});this.onstop?.();}});
 props={sentenceList:sentences,isOpen:true,onClose:vi.fn(),getAudioUrl:null,captureOn:false};
 host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
});
afterEach(()=>{if(root)act(()=>root.unmount());host?.remove();vi.unstubAllGlobals();vi.restoreAllMocks();delete window.__alloStoreRecordedSentenceAudio;delete window.__alloStoreStudentSentenceAudio;});
const flush=async()=>act(async()=>{for(let i=0;i<10;i++)await Promise.resolve();});
function render(extra={}){props={...props,...extra};act(()=>root.render(React.createElement(M.KaraokeReaderOverlay,props)));}
const find=text=>[...host.querySelectorAll('button')].find(b=>b.textContent.includes(text));
const recordButton=()=>find(props.isTeacher?'Record my voice':'Record this sentence')||find('Record my reading');
const click=b=>{expect(b).toBeTruthy();act(()=>b.click());};
async function record(){act(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowRight',key:'ArrowRight',bubbles:true,cancelable:true})));await flush();click(recordButton());await flush();click(find('Stop recording'));await flush();}
const exitEvent=()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e;};

const key = code => act(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code,key:code,bubbles:true,cancelable:true})));
async function startTake(teacher=false){render({isTeacher:teacher});await flush();key('ArrowRight');await flush();click(recordButton());await flush();expect(recorder.state).toBe('recording');}
it.each([false,true])('stops and retains an active take when closing, teacher=%s',async teacher=>{
 const save=vi.fn(async()=>false);window[teacher?'__alloStoreRecordedSentenceAudio':'__alloStoreStudentSentenceAudio']=save;
 await startTake(teacher);expect(exitEvent().defaultPrevented).toBe(true);click(host.querySelector('button[aria-label="Close"]'));await flush();
 expect(props.onClose).not.toHaveBeenCalled();expect(stop).toHaveBeenCalledOnce();expect(save).toHaveBeenCalledOnce();expect(save.mock.calls[0].at(-1)).toEqual({occurrence:1});
 expect(host.textContent).toContain('Your take is still here');expect(host.textContent).toContain('Sentence 2 / 3');expect(exitEvent().defaultPrevented).toBe(true);
 save.mockResolvedValue(true);click(find('Retry saving'));await flush();expect(exitEvent().defaultPrevented).toBe(false);expect(props.onClose).toHaveBeenCalledOnce();
});
it.each(['ArrowRight','Home','Space','Escape'])('protects active recording from keyboard %s',async code=>{
 window.__alloStoreStudentSentenceAudio=vi.fn(async()=>false);await startTake();key(code);await flush();
 expect(stop).toHaveBeenCalledOnce();expect(props.onClose).not.toHaveBeenCalled();expect(host.textContent).toContain('Sentence 2 / 3');expect(host.textContent).toContain('Your take is still here');
});
it('keeps the session alive until asynchronous final microphone chunks arrive',async()=>{
 let finishSave;const save=vi.fn(()=>new Promise(r=>finishSave=r));window.__alloStoreStudentSentenceAudio=save;await startTake();
 let finalize;recorder.stop=vi.fn(()=>{recorder.state='inactive';finalize=()=>{recorder.ondataavailable({data:new Blob(['final microphone bytes'])});recorder.onstop();};});
 key('ArrowRight');key('ArrowRight');expect(recorder.stop).toHaveBeenCalledOnce();expect(save).not.toHaveBeenCalled();expect(host.textContent).toContain('Sentence 2 / 3');expect(exitEvent().defaultPrevented).toBe(true);
 act(()=>finalize());await flush();expect(save).toHaveBeenCalledOnce();expect(stop).toHaveBeenCalledOnce();finishSave(true);await flush();key('ArrowRight');await flush();expect(host.textContent).toContain('Sentence 3 / 3');
});
it('guards clicking the active sentence and restarting',async()=>{
 window.__alloStoreStudentSentenceAudio=vi.fn(async()=>false);await startTake();click(host.querySelector('[data-karaoke-sentence="1"]') || host.querySelector('[aria-current="true"][role="button"]'));await flush();expect(host.textContent).toContain('Your take is still here');
 click(find('Discard recording'));await flush();click(recordButton());await flush();click(host.querySelector('button[aria-label="Restart from beginning"]')||find('Restart'));await flush();expect(host.textContent).toContain('Sentence 2 / 3');expect(host.textContent).toContain('Your take is still here');
});
