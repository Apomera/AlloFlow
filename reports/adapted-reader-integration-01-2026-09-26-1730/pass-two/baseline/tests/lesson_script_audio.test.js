import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
const clipB64 =  (label) => {
  const payload = Buffer.from(String(label || ''), 'utf8');
  const length = Math.max(192, 120 + payload.length);
  const buffer = Buffer.alloc(length);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(length - 8, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(8000, 24);
  buffer.writeUInt32LE(8000, 28);
  buffer.writeUInt16LE(1, 32);
  buffer.writeUInt16LE(8, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(length - 44, 40);
  buffer.set([0xff, 0xe3, 0x18, 0x00], 44);
  buffer.set([0xff, 0xe3, 0x18, 0x00], 116);
  payload.copy(buffer, 120);
  return buffer.toString('base64');
};


let core,KS,service;
beforeAll(()=>{loadAlloModule('karaoke_audio_store_module.js');loadAlloModule('read_aloud_audio_service_module.js');loadAlloModule('lesson_teaching_script_module.js');core=window.AlloModules.LessonTeachingScript;KS=window.AlloModules.KaraokeAudioStore;service=window.AlloModules.createReadAloudAudioService;});
beforeEach(()=>{Object.defineProperty(URL,'createObjectURL',{configurable:true,value:vi.fn(()=>'blob:clip')});Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:vi.fn()});});
const version=()=>({id:'v1',steps:[{id:'a',title:'First',teacherSays:'Explain your reasoning. [Wait 10 seconds] What do you notice?',checkQuestion:'What do you notice?',studentDoes:'TEACHER_ONLY',possibleResponse:'ANSWER_ONLY'},{id:'b',title:'Next',teacherSays:'Compare the intervals [0, 1] and [1, 2].',checkQuestion:'Are they equal?'}]});
function fixture(){let v=version(),payload=null,profile={voice:'Kore',language:'English',speed:1};const store=KS.createStore();const synthesize=vi.fn(async()=>({b64:clipB64('sample'),mime:'audio/wav'}));const persist=vi.fn(async event=>{payload=event.payload;});const make=(st=store)=>core.createAudioController({planId:'p1',store:st,createService:service,getVersion:()=>v,getProfile:()=>profile,synthesize,persist});return {make,store,synthesize,persist,get payload(){return payload;},setVersion:value=>v=value,setProfile:value=>profile=value};}
describe('lesson spoken projection and real shared audio storage',()=>{
 it('includes only speech, omits delivery cues, deduplicates questions, preserves mathematics',()=>{const v=version(),before=JSON.stringify(v),segments=core.spokenSegments(v);expect(segments).toHaveLength(3);expect(core.spokenText(v)).toContain('[0, 1]');expect(core.spokenText(v)).not.toMatch(/TEACHER_ONLY|ANSWER_ONLY|Wait/);expect(JSON.stringify(v)).toBe(before);});
 it('saves, reopens and skips existing clips through the real audio service',async()=>{const h=fixture(),c=h.make();await c.prepareAll();expect(c.summary().ready).toBe(3);expect(h.synthesize).toHaveBeenCalledTimes(3);const fresh=KS.createStore();fresh.hydrate(JSON.parse(JSON.stringify(h.payload)));const reopened=h.make(fresh);await reopened.prepareAll();expect(reopened.summary().ready).toBe(3);expect(h.synthesize).toHaveBeenCalledTimes(3);c.dispose();reopened.dispose();});
 it('invalidates changed wording and voice without treating old clips as current',async()=>{const h=fixture(),c=h.make();await c.prepareAll();const v=version();v.steps[1].teacherSays='A changed explanation.';h.setVersion(v);expect(c.summary().ready).toBe(2);await c.prepareAll();expect(h.synthesize).toHaveBeenCalledTimes(4);h.setProfile({voice:'Puck',language:'English',speed:1});expect(c.summary().ready).toBe(0);});
 it('rolls back clips when the lesson refuses persistence so retry really retries',async()=>{const h=fixture(),c=h.make();h.persist.mockRejectedValueOnce(new Error('Save failed'));const result=await c.prepareAll();expect(result.failed).toBe(1);expect(c.summary().ready).toBe(2);await c.prepareAll();expect(h.synthesize).toHaveBeenCalledTimes(4);expect(c.summary().ready).toBe(3);});
 it('does not save late synthesized audio after cancellation',async()=>{const h=fixture(),c=h.make();let done;h.synthesize.mockImplementation(()=>new Promise(resolve=>done=resolve));const abort=new AbortController(),pending=c.prepareAll({signal:abort.signal});await vi.waitFor(()=>expect(done).toBeTypeOf('function'));abort.abort();done({b64:clipB64('late'),mime:'audio/wav'});await expect(pending).rejects.toMatchObject({name:'AbortError'});expect(h.persist).not.toHaveBeenCalled();expect(c.summary().ready).toBe(0);});
});

function hostFixture(){
 const v=version();v.inputSnapshot={settings:{language:'French'}};
 const resource={id:'p1',type:'lesson-plan',data:{teachingScripts:[v]},title:'Keep this lesson title'};
 const state={current:{actorKey:'teacher-one',isTeacherMode:true,isParentMode:false,isIndependentMode:false,generatedContent:resource,history:[resource]}};
 const callTTS=vi.fn(async()=> 'blob:provider');
 const update=vi.fn((id,updater)=>{const before=state.current.history[0],next=updater(before);state.current.history=[next];state.current.generatedContent=next;return next!==before;});
 const source=readFileSync('host_handlers_source.jsx','utf8').replace(/__d\./g,'');const start=source.indexOf('const createTeachingScriptAudio =');const end=source.indexOf('const handleSavePrivatePersonaSession =',start);
 const create=new Function('window','teachingScriptStateRef','selectedVoice','voiceSpeed','_aiConfig','GEMINI_MODELS','callTTS','_encodeReadAloudBridgeAudio','onUpdateResource',source.slice(start,end)+';return createTeachingScriptAudio;')(window,state,'Kore',1,{backend:'gemini',ttsProvider:'gemini',models:{tts:'configured-tts'}},{tts:'default'},callTTS,async()=>({b64:clipB64('host'),mime:'audio/wav'}),update);
 return {state,callTTS,update,create};
}
describe('actual lesson audio host wiring',()=>{
 it('persists a version store while retaining lesson edits, then reopens saved audio',async()=>{const h=hostFixture(),c=h.create('p1','v1');await c.prepareAll();expect(h.state.current.history[0].title).toBe('Keep this lesson title');expect(h.state.current.history[0].lessonScriptAudio.v1).toBeTruthy();expect(h.callTTS.mock.calls[0][4]).toBe('French');const reopened=h.create('p1','v1');await reopened.prepareAll();expect(h.callTTS).toHaveBeenCalledTimes(3);expect(reopened.summary().ready).toBe(3);});
 it.each(['actor','wording','removed','role'])('rejects late synthesis after %s changes',async change=>{const h=hostFixture(),c=h.create('p1','v1');let resolve;h.callTTS.mockImplementation(()=>new Promise(done=>resolve=done));const pending=c.prepareAll();await vi.waitFor(()=>expect(resolve).toBeTypeOf('function'));if(change==='actor')h.state.current.actorKey='teacher-two';if(change==='role')h.state.current.isParentMode=true;if(change==='wording')h.state.current.history[0].data.teachingScripts[0].steps[0].teacherSays='Changed speech';if(change==='removed')h.state.current.history[0].data.teachingScripts=[];resolve('blob:late');await expect(pending).rejects.toThrow();expect(h.update).not.toHaveBeenCalled();});
 it('rejects duplicate saved plans before accessing audio',()=>{const h=hostFixture();h.state.current.history.push({...h.state.current.history[0]});expect(()=>h.create('p1','v1')).toThrow('Reopen');});
});
