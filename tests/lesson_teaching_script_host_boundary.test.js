import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
let core,host;
beforeAll(()=>{['resource_content_fingerprint_module.js','lesson_teaching_script_module.js','lesson_teaching_script_host_module.js'].forEach(loadAlloModule);core=window.AlloModules.LessonTeachingScript;host=window.AlloModules.LessonTeachingScriptHost;});
const material=()=>({id:'m',type:'simplified',title:'Fractions',data:'Four equal intervals from zero to one each have a length of one fourth.'});
const plan=()=>({id:'p',type:'lesson-plan',title:'Fractions lesson',config:{gradeLevel:'4th Grade',language:'English'},data:{directInstruction:'My original introduction',objectives:['Explain one fourth'],essentialQuestion:'What does one fourth mean?'}});
const settings=()=>({grade:'4th Grade',subject:'mathematics',topic:'Fractions on a number line',scope:'segment',durationMinutes:15,goal:'Represent fractions on a number line',standard:'4.NF.A.1',priorKnowledge:'Equal parts',language:'English',researchEnabled:false,materialIds:['m']});
const step=id=>({id,title:'Model one fourth',minutes:5,teacherSays:'I will mark the whole from zero to one. Now I divide that interval into four equal lengths. Each part measures one fourth, and all four parts together still form one whole.',studentDoes:'Draw and label the number line, then explain to a partner.',checkQuestion:'Where should we place one fourth, and how do you know?',possibleResponse:'One possible response is at the end of one equal interval.',ifStruggling:'A likely difficulty is counting marks instead of intervals; mark the whole interval first and count each equal section together.',ifReady:'Ask learners to explain why two fourths also represents one half.',resourceIds:['m'],recommendationIds:[]});
const raw=()=>({title:'Teaching one fourth',scope:'segment',durationMinutes:15,steps:[step('s1'),step('s2'),step('s3')]});
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};}
function setup(overrides={}){
  let state={history:[plan(),material()],isTeacherMode:true,isParentMode:false,isIndependentMode:false,canGenerate:true,actorKey:'teacher-1'};
  const statuses=[],writes=[];
  const deps={core,getState:()=>state,onStatus:s=>statuses.push(s),callText:vi.fn(async()=>JSON.stringify(raw())),updateResource:(id,updater)=>{const current=state.history.find(item=>item.id===id);if(!current)return false;const next=updater(current);if(!next||next===current)return false;writes.push(id);state={...state,history:state.history.map(item=>item.id===id?next:item)};return true;},...overrides};
  return {controller:host.createController(deps),deps,statuses,writes,get:()=>state,set:next=>{state=typeof next==='function'?next(state):next;}};
}
describe('teaching-script host boundaries with real core',()=>{
  it('saves to the captured plan after navigation without replacing the other active plan',async()=>{
    const wait=deferred(),h=setup({callText:vi.fn(()=>wait.promise)}),run=h.controller.generate('p',settings());
    h.set(s=>({...s,activePlanId:'other',history:s.history.concat({...plan(),id:'other',data:{directInstruction:'OTHER ORIGINAL'}})}));
    wait.resolve(JSON.stringify(raw()));expect((await run).ok).toBe(true);
    expect(h.writes).toEqual(['p']);expect(h.get().history.find(item=>item.id==='other').data).toEqual({directInstruction:'OTHER ORIGINAL'});
    expect(h.get().history.find(item=>item.id==='p').data.directInstruction).toBe('My original introduction');
  });
  it('generates for a non-mathematics lesson in another language with a nonnumeric age label',async()=>{
    const h=setup();
    h.set(s=>({...s,history:[{id:'p',type:'lesson-plan',title:'Plan de clase: la fotosíntesis',config:{gradeLevel:'Adult learners',language:'Spanish'},data:{objectives:['Explicar cómo las plantas almacenan energía'],directInstruction:'Modelar la ecuación'}},{id:'m',type:'simplified',title:'Lectura',data:'Las plantas usan la luz para producir azúcar a partir de dióxido de carbono y agua.'}]}));
    const result=await h.controller.generate('p',{...settings(),grade:'Adult learners',subject:'science',topic:'La fotosíntesis',goal:'Explicar cómo las plantas almacenan energía',language:'Spanish',standard:''});
    expect(result.ok).toBe(true);
    expect(h.deps.callText.mock.calls[0][0]).toContain('Subject: Science');
    expect(h.deps.callText.mock.calls[0][0]).toContain('Grade or age group: Adult learners');
    expect(h.deps.callText.mock.calls[0][0]).toContain('Language of the script: Spanish');
    expect(h.get().history[0].data.teachingScripts[0].inputSnapshot.settings).toMatchObject({grade:'Adult learners',subject:'science',language:'Spanish'});
  });
  it('passes the reviewed lesson context, never materials, to research and records source kinds',async()=>{
    const collect=vi.fn(async()=>({status:'retrieved',sources:[{id:'wwc-organizing-instruction-2007',url:'https://ies.ed.gov/ncee/wwc/PracticeGuide/1',title:'Organizing Instruction and Study to Improve Student Learning',evidenceKind:'general-practice',recommendations:[{id:'wwc-organizing-instruction-2007-r4',text:'Connect and integrate abstract and concrete representations of concepts.'}]}],warnings:['Only general instructional-practice guidance was found for this lesson.']}));
    const h=setup({research:{collect},read:vi.fn(),search:vi.fn(),callText:vi.fn(async()=>JSON.stringify({...raw(),steps:raw().steps.map(s=>({...s,recommendationIds:['wwc-organizing-instruction-2007-r4']}))}))});
    const result=await h.controller.generate('p',{...settings(),subject:'science',topic:'Energy in ecosystems',researchEnabled:true});
    expect(result.ok).toBe(true);
    expect(collect.mock.calls[0][0]).toMatchObject({grade:'4th Grade',subject:'science',topic:'Energy in ecosystems',goal:'Represent fractions on a number line',standard:'4.NF.A.1'});
    expect(JSON.stringify(collect.mock.calls[0][0])).not.toContain('Four equal intervals');
    expect(h.get().history[0].data.teachingScripts[0].warnings.join(' ')).toContain('general instructional guidance');
  });
  it('drops a late text result after cancellation',async()=>{
    const wait=deferred(),h=setup({callText:vi.fn(()=>wait.promise)}),run=h.controller.generate('p',settings());
    expect(h.controller.cancel('p')).toBe(true);wait.resolve(JSON.stringify(raw()));
    expect((await run).ok).toBe(false);expect(h.writes).toEqual([]);expect(h.statuses.at(-1).stage).toBe('cancelled');
  });
  it('drops late research after cancellation and never starts text generation',async()=>{
    const wait=deferred(),h=setup({research:{collect:vi.fn(()=>wait.promise)},read:vi.fn(),search:vi.fn()}),run=h.controller.generate('p',{...settings(),researchEnabled:true});
    h.controller.cancel('p');wait.resolve({status:'retrieved',sources:[{recommendations:[{id:'r'}]}],warnings:[]});
    expect((await run).ok).toBe(false);expect(h.deps.callText).not.toHaveBeenCalled();expect(h.writes).toEqual([]);
  });
  it('rejects in-flight edits to the plan or selected material without overwriting either',async()=>{
    for(const target of ['p','m']){
      const wait=deferred(),h=setup({callText:vi.fn(()=>wait.promise)}),run=h.controller.generate('p',settings());
      h.set(s=>({...s,history:s.history.map(item=>item.id===target?{...item,data:target==='p'?{...item.data,directInstruction:'New teacher edit'}:'Updated fraction example'}:item)}));
      wait.resolve(JSON.stringify(raw()));const result=await run;
      expect(result.ok).toBe(false);expect(result.error).toContain('changed during generation');expect(h.writes).toEqual([]);
    }
  });
  it('rejects deletion, role switch, and actor switch before late completion',async()=>{
    for(const change of [
      s=>({...s,history:s.history.filter(item=>item.id!=='p')}),
      s=>({...s,isTeacherMode:false,isIndependentMode:true}),
      s=>({...s,actorKey:'teacher-2'}),
    ]){
      const wait=deferred(),h=setup({callText:vi.fn(()=>wait.promise)}),run=h.controller.generate('p',settings());
      h.set(change);wait.resolve(JSON.stringify(raw()));expect((await run).ok).toBe(false);expect(h.writes).toEqual([]);
    }
  });
  it('does not require or load research for explicitly unresearched generation',async()=>{
    const ensureResearch=vi.fn(async()=>{throw new Error('Research loader unavailable');}),h=setup({ensureResearch});
    expect((await h.controller.generate('p',settings())).ok).toBe(true);
    expect(ensureResearch).not.toHaveBeenCalled();
  });
  it('stops before any AI call when an enabled research module cannot load',async()=>{
    const collect=vi.fn(),h=setup({ensureResearch:vi.fn(async()=>{throw new Error('Loading failed');}),research:{collect},read:vi.fn()});
    expect((await h.controller.generate('p',{...settings(),researchEnabled:true})).ok).toBe(false);
    expect(collect).not.toHaveBeenCalled();expect(h.deps.callText).not.toHaveBeenCalled();expect(h.writes).toEqual([]);
  });
  it('honors cancellation while the optional research module is loading',async()=>{
    const wait=deferred(),collect=vi.fn(),h=setup({ensureResearch:vi.fn(()=>wait.promise),research:{collect},read:vi.fn()});
    const run=h.controller.generate('p',{...settings(),researchEnabled:true});
    h.controller.cancel('p');wait.resolve();expect((await run).ok).toBe(false);
    expect(collect).not.toHaveBeenCalled();expect(h.deps.callText).not.toHaveBeenCalled();expect(h.writes).toEqual([]);
  });
  it('stops on unavailable requested research and explains the gap instead of silently generating',async()=>{
    const h=setup({research:{collect:vi.fn(async()=>({status:'unavailable',sources:[],warnings:['No catalogued public practice guide covers arts and music for Graduate Level.']}))},read:vi.fn(),search:vi.fn()});
    const result=await h.controller.generate('p',{...settings(),researchEnabled:true});
    expect(result.ok).toBe(false);expect(result.error).toContain('Applicable research could not be verified');expect(result.error).toContain('No catalogued public practice guide');expect(result.error).toContain('turn off research');
    expect(h.deps.callText).not.toHaveBeenCalled();expect(h.writes).toEqual([]);
  });
  it('uses exactly one corrective retry and never appends invalid output',async()=>{
    const callText=vi.fn().mockResolvedValue('{"title":"Too short"}'),h=setup({callText});
    expect((await h.controller.generate('p',settings())).ok).toBe(false);
    expect(callText).toHaveBeenCalledTimes(2);expect(callText.mock.calls[1][0]).toContain('failed validation');expect(h.writes).toEqual([]);
  });
  it('prevents overlapping runs and disposal prevents late writes',async()=>{
    const wait=deferred(),h=setup({callText:vi.fn(()=>wait.promise)}),run=h.controller.generate('p',settings());
    expect((await h.controller.generate('p',settings())).ok).toBe(false);expect(h.deps.callText).toHaveBeenCalledTimes(1);
    h.controller.dispose();wait.resolve(JSON.stringify(raw()));expect((await run).ok).toBe(false);expect(h.writes).toEqual([]);
  });
  it('preserves evidence and original lesson when saving validated version edits',async()=>{
    const h=setup();expect((await h.controller.generate('p',settings())).ok).toBe(true);
    const saved=h.get().history.find(item=>item.id==='p'),version=saved.data.teachingScripts[0],steps=structuredClone(version.steps);steps[0].teacherSays+=' Here is my new classroom example.';
    expect(h.controller.saveEdits('p',version.id,steps)).toEqual({ok:true});
    const updated=h.get().history.find(item=>item.id==='p');expect(updated.data.directInstruction).toBe(saved.data.directInstruction);
    expect(updated.data.teachingScripts[0].inputSnapshot).toEqual(version.inputSnapshot);expect(updated.data.teachingScripts[0].sources).toEqual(version.sources);
    steps[0].minutes=1;expect(h.controller.saveEdits('p',version.id,steps).ok).toBe(false);
  });
  it('rejects a whole-lesson request whose duration is outside the scope range before any AI call',async()=>{
    const h=setup();
    const result=await h.controller.generate('p',{...settings(),scope:'lesson',durationMinutes:10});
    expect(result.ok).toBe(false);expect(result.error).toContain('between 15 and 240');expect(h.deps.callText).not.toHaveBeenCalled();
  });
  it('uses stored sourceArtifactId and original source identity to exclude another source',()=>{
    const p={...plan(),config:{sourceArtifactId:'source-a'}};
    const source={id:'source-a',type:'analysis',data:{originalText:'Fractions source'}};
    const matching={...material(),config:{sourceArtifactId:'source-a'}};
    const conflicting={...material(),id:'different',config:{sourceArtifactId:'source-b'}};
    expect(host.availableMaterials(p,[source,matching,conflicting,material()]).map(item=>item.id)).toEqual(['source-a','m']);
  });
  it('rejects known conflicting lesson/source scope, duplicate and learner-owned materials',async()=>{
    const p={...plan(),config:{lessonId:'lesson-a',sourceFingerprint:'source-a'}},good={...material(),config:{lessonId:'lesson-a',sourceFingerprint:'source-a'}},bad={...material(),id:'bad',config:{lessonId:'lesson-b',sourceFingerprint:'source-b'}};
    expect(host.availableMaterials(p,[good,bad,{...good,id:'student',studentId:'learner'}]).map(item=>item.id)).toEqual(['m']);
    const h=setup();h.set(s=>({...s,history:[p,good,bad]}));expect((await h.controller.generate('p',{...settings(),materialIds:['bad']})).ok).toBe(false);expect(h.deps.callText).not.toHaveBeenCalled();
    h.set(s=>({...s,history:[plan(),material(),material()]}));expect((await h.controller.generate('p',settings())).ok).toBe(false);
  });
});
describe('teaching-script default settings come from the saved plan',()=>{
  it('reads grade, language, standard, subject and phases from the plan rather than the current workspace',()=>{
    const p={...plan(),config:{gradeLevel:'8',language:'French',standardsContext:{code:'8.EE.A.1',label:'Integer exponents'}},data:{...plan().data,hook:'A riddle',guidedPractice:'Pairs'}};
    const defaults=host.defaultSettings(p,{language:'English',standard:'AMBIENT STANDARD',grade:'2nd Grade'},[material()]);
    expect(defaults).toMatchObject({grade:'8th Grade',gradeSource:'plan',language:'French',languageSource:'plan',subject:'mathematics',subjectDetected:true,standardSource:'plan'});
    expect(defaults.standard).toContain('8.EE.A.1');
    expect(defaults.standard).not.toContain('AMBIENT');
    expect(defaults.phases).toEqual(['hook','directInstruction','guidedPractice']);
    expect(defaults.gradeOptions).toContain('Kindergarten');
    expect(defaults.subjectOptions.map(item=>item.id)).toContain('science');
    expect(defaults.scopes.lesson.maxMinutes).toBe(240);
  });
  it('leaves grade and standard empty for an older plan without them instead of borrowing ambient values',()=>{
    const defaults=host.defaultSettings({id:'old',type:'lesson-plan',title:'Old plan',data:{objectives:['Read a poem aloud']}},{language:'Spanish',standard:'AMBIENT',grade:'6th Grade'},[]);
    expect(defaults).toMatchObject({grade:'',gradeSource:'none',standard:'',language:'Spanish',languageSource:'workspace',subject:'reading'});
  });
});
