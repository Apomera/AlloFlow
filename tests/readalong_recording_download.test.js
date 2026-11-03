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
 loadAlloModule(resolve(process.env.CLASSROOM_PRESERVE_CANDIDATES||'.','immersive_reader_module.js'));M=window.AlloModules;
});
beforeEach(()=>{
 localStorage.clear();if(!URL.createObjectURL)URL.createObjectURL=()=>'';if(!URL.revokeObjectURL)URL.revokeObjectURL=()=>{};vi.useFakeTimers();vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn());
 window.HTMLElement.prototype.scrollIntoView=vi.fn();
 vi.stubGlobal('Audio',class extends EventTarget{constructor(){super();this.pause=vi.fn();}play(){return Promise.resolve();}});
 stop=vi.fn();Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:vi.fn(async()=>({getTracks:()=>[{stop}]}))}});
 vi.stubGlobal('MediaRecorder',class{constructor(){recorder=this;this.state='inactive';this.mimeType='audio/webm';}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['my take'])});this.onstop?.();}});
 props={sentenceList:sentences,isOpen:true,onClose:vi.fn(),getAudioUrl:null,captureOn:false};
 host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
});
afterEach(()=>{if(root)act(()=>root.unmount());host?.remove();vi.runOnlyPendingTimers();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();delete window.__alloStoreRecordedSentenceAudio;delete window.__alloStoreStudentSentenceAudio;});
const flush=async()=>act(async()=>{for(let i=0;i<10;i++)await Promise.resolve();});
function render(extra={}){props={...props,...extra};act(()=>root.render(React.createElement(M.KaraokeReaderOverlay,props)));}
const find=text=>[...host.querySelectorAll('button')].find(b=>b.textContent.includes(text));
const recordButton=()=>find(props.isTeacher?'Record my voice':'Record this sentence')||find('Record my reading');
const click=b=>{expect(b).toBeTruthy();act(()=>b.click());};
async function record(){act(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowRight',key:'ArrowRight',bubbles:true,cancelable:true})));await flush();click(recordButton());await flush();click(find('Stop recording'));await flush();}
const exitEvent=()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e;};

describe('Read Along recording download recovery',()=>{
 it.each([false,true])('downloads the exact retained bytes and keeps save protection, teacher=%s',async teacher=>{
  const save=vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);window[teacher?'__alloStoreRecordedSentenceAudio':'__alloStoreStudentSentenceAudio']=save;
  const urls=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:take'),revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{}),clicked=[];
  vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(){clicked.push({name:this.download,url:this.href,connected:this.isConnected});});
  render({isTeacher:teacher});await flush();await record();const blob=save.mock.calls[0][1];click(find('Download this recording'));await flush();
  expect(urls).toHaveBeenCalledWith(blob);expect(clicked).toEqual([{name:'read-along-'+(teacher?'teacher':'my')+'-sentence-2.webm',url:'blob:take',connected:true}]);
  expect(host.textContent).toContain('Download started');expect(host.textContent).not.toContain('Recording saved.');expect(exitEvent().defaultPrevented).toBe(true);expect(revoke).not.toHaveBeenCalled();
  click(find('Retry saving'));await flush();expect(save.mock.calls[1][1]).toBe(blob);expect(host.textContent).toContain('Recording saved.');expect(exitEvent().defaultPrevented).toBe(false);
 });
 it('offers download while the storage promise is still pending',async()=>{
  let finish;const save=vi.fn(()=>new Promise(resolve=>finish=resolve));window.__alloStoreStudentSentenceAudio=save;
  vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:pending');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
  render();await flush();await record();expect(find('Retry saving').disabled).toBe(true);expect(find('Download this recording').disabled).toBe(false);click(find('Download this recording'));
  expect(exitEvent().defaultPrevented).toBe(true);expect(save).toHaveBeenCalledOnce();finish(false);await flush();expect(find('Retry saving').disabled).toBe(false);
 });
 it('keeps the take and warning if starting the download throws',async()=>{
  window.__alloStoreStudentSentenceAudio=vi.fn(async()=>false);vi.spyOn(URL,'createObjectURL').mockImplementation(()=>{throw Error('blocked');});
  render();await flush();await record();click(find('Download this recording'));expect(host.textContent).toContain('The download could not start');expect(exitEvent().defaultPrevented).toBe(true);
 });
});
