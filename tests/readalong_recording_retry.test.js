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
 loadAlloModule(resolve(process.env.CLASSROOM_RECOVERY_CANDIDATES||'.','immersive_reader_module.js'));M=window.AlloModules;
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
describe('Read Along retains and retries an unsaved microphone take',()=>{
 it.each([false,true])('retries the same bytes and duplicate-sentence occurrence, teacher=%s',async teacher=>{
  const save=vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  window[teacher?'__alloStoreRecordedSentenceAudio':'__alloStoreStudentSentenceAudio']=save;
  render({isTeacher:teacher});await flush();await record();
  expect(stop).toHaveBeenCalledOnce();expect(host.textContent).toContain('Your take is still here');expect(exitEvent().defaultPrevented).toBe(true);
  const first=save.mock.calls[0];expect(first[0]).toBe('First sentence.');expect(first.at(-1)).toEqual({occurrence:1});
  click(find('Retry saving'));await flush();expect(save).toHaveBeenCalledTimes(2);expect(save.mock.calls[1][1]).toBe(first[1]);expect(save.mock.calls[1]).toEqual(first);
  expect(host.textContent).toContain('Recording saved.');expect(exitEvent().defaultPrevented).toBe(false);expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledOnce();
 });
 it('handles thrown and unavailable saves without discarding the take',async()=>{
  render();await flush();await record();expect(host.textContent).toContain('Your take is still here');
  window.__alloStoreStudentSentenceAudio=vi.fn().mockRejectedValueOnce(Error('quota')).mockResolvedValueOnce(true);
  click(find('Retry saving'));await flush();expect(host.textContent).toContain('Your take is still here');
  click(find('Retry saving'));await flush();expect(host.textContent).toContain('Recording saved.');
 });
 it('blocks duplicate retries and a new recording while saving',async()=>{
  let finish;const save=vi.fn(()=>new Promise(r=>finish=r));window.__alloStoreStudentSentenceAudio=save;
  render();await flush();await record();expect(find('Retry saving').disabled).toBe(true);expect(recordButton().disabled).toBe(true);
  click(find('Retry saving'));expect(save).toHaveBeenCalledOnce();finish(false);await flush();expect(find('Retry saving').disabled).toBe(false);
 });
 it('keeps a failed take on close and sentence navigation until explicit discard',async()=>{
  window.__alloStoreStudentSentenceAudio=vi.fn(async()=>false);render();await flush();await record();
  click(host.querySelector('button[aria-label="Close"]'));expect(props.onClose).not.toHaveBeenCalled();expect(host.textContent).toContain('before closing Read Along');
  act(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowRight',key:'ArrowRight',bubbles:true,cancelable:true})));
  expect(host.textContent).toContain('Sentence 2 / 3');click(find('Discard recording'));expect(exitEvent().defaultPrevented).toBe(false);
  expect(props.onClose).toHaveBeenCalledOnce();
 });
 it('ignores a late save completion after the owning resource closes',async()=>{
  let finish;window.__alloStoreStudentSentenceAudio=vi.fn(()=>new Promise(r=>finish=r));render();await flush();await record();
  render({isOpen:false});finish(true);await flush();render({isOpen:true});await flush();expect(host.textContent).not.toContain('Recording saved.');expect(exitEvent().defaultPrevented).toBe(false);
 });
});
