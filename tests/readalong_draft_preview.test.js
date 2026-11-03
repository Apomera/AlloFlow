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
 loadAlloModule(resolve(process.env.CLASSROOM_DRAFT_CANDIDATES||'.','immersive_reader_module.js'));M=window.AlloModules;
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


it.each([false,true])('previews the retained take, stops cleanly, and keeps unsaved protection teacher=%s',async teacher=>{const save=vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);window[teacher?'__alloStoreRecordedSentenceAudio':'__alloStoreStudentSentenceAudio']=save;const urls=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:preview'),revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});let audio;vi.stubGlobal('Audio',class{constructor(src){audio=this;this.src=src;this.pause=vi.fn();}play(){return Promise.resolve();}});render({isTeacher:teacher});await flush();await record();const blob=save.mock.calls[0][1];click(find('Preview this take'));await flush();expect(urls).toHaveBeenCalledWith(blob);expect(find('Stop preview').getAttribute('aria-pressed')).toBe('true');expect(exitEvent().defaultPrevented).toBe(true);expect(save).toHaveBeenCalledTimes(1);click(find('Stop preview'));expect(audio.pause).toHaveBeenCalledOnce();expect(revoke).toHaveBeenCalledWith('blob:preview');click(find('Preview this take'));await flush();click(find('Retry saving'));await flush();expect(revoke).toHaveBeenCalledTimes(2);expect(find('Preview this take')).toBeFalsy();expect(exitEvent().defaultPrevented).toBe(false);});
it('keeps the draft after playback rejection and permits preview retry',async()=>{window.__alloStoreStudentSentenceAudio=vi.fn(async()=>false);const revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:failed');let audio;const play=vi.fn().mockRejectedValueOnce(Error('blocked')).mockResolvedValue(undefined);vi.stubGlobal('Audio',class{constructor(){audio=this;}pause(){}play(){return play();}});render();await flush();await record();click(find('Preview this take'));await flush();expect(host.textContent).toContain('This take could not play');expect(exitEvent().defaultPrevented).toBe(true);expect(revoke).toHaveBeenCalledOnce();click(find('Preview this take'));await flush();expect(find('Stop preview')).toBeTruthy();act(()=>audio.onended());expect(find('Preview this take')).toBeTruthy();expect(revoke).toHaveBeenCalledTimes(2);});
it('releases preview audio on explicit discard and unmount',async()=>{window.__alloStoreStudentSentenceAudio=vi.fn(async()=>false);const revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:cleanup');render();await flush();await record();click(find('Preview this take'));await flush();click(find('Discard recording'));await flush();expect(revoke).toHaveBeenCalledTimes(1);await record();click(find('Preview this take'));await flush();act(()=>root.unmount());root=null;expect(revoke).toHaveBeenCalledTimes(2);});
