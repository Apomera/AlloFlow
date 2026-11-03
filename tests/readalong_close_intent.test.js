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
 loadAlloModule(resolve(process.env.READALONG_CLOSE_CANDIDATES||'.','immersive_reader_module.js'));M=window.AlloModules;
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

const closeReader=()=>click(host.querySelector('button[aria-label="Close"]'));
const keepOpen=()=>click(find('Keep Read Along open'));
const mainPlay=()=>host.querySelector('button[aria-busy][aria-pressed]');
async function start(teacher=false){render({isTeacher:teacher});await flush();act(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowRight',key:'ArrowRight',bubbles:true,cancelable:true})));await flush();click(recordButton());await flush();}
function store(teacher,save){window[teacher?'__alloStoreRecordedSentenceAudio':'__alloStoreStudentSentenceAudio']=save;}

it.each([false,true])('closes once after deferred final chunks are saved, teacher=%s',async teacher=>{
 let finish,finalize;const save=vi.fn(()=>new Promise(r=>finish=r));store(teacher,save);await start(teacher);
 recorder.stop=vi.fn(()=>{recorder.state='inactive';finalize=()=>{recorder.ondataavailable({data:new Blob(['final take'])});recorder.onstop();};});
 closeReader();closeReader();expect(recorder.stop).toHaveBeenCalledOnce();expect(props.onClose).not.toHaveBeenCalled();expect(save).not.toHaveBeenCalled();
 expect(host.textContent).not.toContain('try that action again');
 expect(find('Keep Read Along open')).toBeTruthy();
 act(()=>finalize());await flush();expect(save).toHaveBeenCalledOnce();expect(save.mock.calls[0].at(-1)).toEqual({occurrence:1});
 finish(true);await flush();expect(props.onClose).toHaveBeenCalledOnce();expect(mainPlay().getAttribute('aria-pressed')).toBe('false');expect(exitEvent().defaultPrevented).toBe(false);
});
it.each([false,true])('remembers a close requested after saving has already started, teacher=%s',async teacher=>{
 let finish;const save=vi.fn(()=>new Promise(r=>finish=r));store(teacher,save);render({isTeacher:teacher});await flush();await record();
 closeReader();expect(props.onClose).not.toHaveBeenCalled();finish(true);await flush();expect(props.onClose).toHaveBeenCalledOnce();expect(mainPlay().getAttribute('aria-pressed')).toBe('false');
});
it('keeps a failed take and closes only after retry saves the identical bytes',async()=>{
 const save=vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);store(false,save);render();await flush();await record();const first=save.mock.calls[0];
 closeReader();expect(props.onClose).not.toHaveBeenCalled();expect(exitEvent().defaultPrevented).toBe(true);click(find('Retry saving'));await flush();
 expect(save.mock.calls[1]).toEqual(first);expect(save.mock.calls[1][1]).toBe(first[1]);expect(props.onClose).toHaveBeenCalledOnce();
});
it.each([false,true])('discards a draft and closes only when close was requested, requested=%s',async requested=>{
 store(false,vi.fn(async()=>false));render();await flush();await record();if(requested)closeReader();click(find('Discard recording'));await flush();
 expect(props.onClose).toHaveBeenCalledTimes(requested?1:0);expect(exitEvent().defaultPrevented).toBe(false);
});
it.each([false,true])('cancels a requested close during a save without autoplay, teacher=%s',async teacher=>{
 let finish;store(teacher,vi.fn(()=>new Promise(r=>finish=r)));render({isTeacher:teacher});await flush();await record();closeReader();keepOpen();
 expect(document.activeElement).toBe(host.querySelector('[data-recording-save-state]'));expect(exitEvent().defaultPrevented).toBe(true);
 finish(true);await flush();expect(props.onClose).not.toHaveBeenCalled();expect(mainPlay().getAttribute('aria-pressed')).toBe('false');expect(find('Keep Read Along open')).toBeFalsy();
});
it('keeps a failed take protected when cancelling the close decision',async()=>{
 store(false,vi.fn(async()=>false));render();await flush();await record();closeReader();await flush();expect(document.activeElement).toBe(host.querySelector('[data-recording-save-state]'));keepOpen();
 expect(exitEvent().defaultPrevented).toBe(true);expect(find('Preview this take')).toBeTruthy();expect(document.activeElement.isConnected).toBe(true);
 click(find('Discard recording'));expect(props.onClose).not.toHaveBeenCalled();
});
it('does not carry an old close intent into a reopened session',async()=>{
 let finish;store(false,vi.fn(()=>new Promise(r=>finish=r)));render();await flush();await record();closeReader();render({isOpen:false});render({isOpen:true});finish(true);await flush();
 expect(props.onClose).not.toHaveBeenCalled();expect(find('Keep Read Along open')).toBeFalsy();expect(exitEvent().defaultPrevented).toBe(false);
});
it('uses the latest close callback when a retained save finishes',async()=>{
 let finish;store(false,vi.fn(()=>new Promise(r=>finish=r)));render();await flush();await record();const oldClose=props.onClose;closeReader();const nextClose=vi.fn();render({onClose:nextClose});finish(true);await flush();
 expect(oldClose).not.toHaveBeenCalled();expect(nextClose).toHaveBeenCalledOnce();
});
it('offers a connected keep-open action when recording stops without a usable take',async()=>{
 store(false,vi.fn(async()=>true));await start();recorder.stop=()=>{recorder.state='inactive';recorder.onstop();};closeReader();await flush();
 expect(props.onClose).not.toHaveBeenCalled();expect(host.textContent).toContain('No take was available to save');keepOpen();
 expect(document.activeElement).toBe(host.querySelector('button[aria-label="Close"]'));closeReader();expect(props.onClose).toHaveBeenCalledOnce();
});
it('keeps an actual recorder stop error visible while closing is pending',async()=>{
 store(false,vi.fn(async()=>true));await start();recorder.stop=()=>{throw new Error('synthetic recorder stop error');};closeReader();await flush();
 expect(props.onClose).not.toHaveBeenCalled();expect(host.textContent).toContain('The recording could not stop yet. Use Stop recording before leaving.');expect(host.textContent).not.toContain('try that action again');
});
