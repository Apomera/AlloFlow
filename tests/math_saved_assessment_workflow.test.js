import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const { transformSync } = require('@babel/core');
let React, createRoot, act, root, host, renderSaved, helpers;
const source = readFileSync('host_handlers_source.jsx', 'utf8');
const method = (name, next, deps) => new Function('__d', source.slice(source.indexOf('const ' + name + ' ='), source.indexOf('const ' + next + ' =', source.indexOf('const ' + name + ' ='))) + '\nreturn ' + name)(deps);
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  ({ act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = globalThis.React = React;
  loadAlloModule('math_helpers_module.js');
  loadAlloModule('generation_helpers_module.js');
  helpers = window.AlloModules.MathHelpers;
  const anti = readFileSync('AlloFlowANTI.txt', 'utf8');
  const start = anti.indexOf("                {activeView === 'stem-assessment' && (() => {");
  const end = anti.indexOf("                {activeView === 'math' && window.AlloModules", start);
  expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
  const expression = anti.slice(start,end).trim().slice(1,-1);
  const compiled = transformSync('return (' + expression + ');', {plugins:['@babel/plugin-transform-react-jsx'],parserOpts:{allowReturnOutsideFunction:true},configFile:false,babelrc:false}).code;
  renderSaved = new Function('React','activeView','generatedContent','t','formatInlineText','isTeacherMode','setAssessmentBlocks','setMathSubject','setGradeLevel','setLeveledTextLanguage','setShowAssessmentBuilder','openMathCreate',compiled);
});
afterEach(() => { if(root) act(()=>root.unmount()); root=null; host?.remove(); });
const roundtrip = value => JSON.parse(JSON.stringify(value));
async function mountSaved(item, callbacks={}, teacher=true) {
  if(!root) { host=document.createElement('div');document.body.appendChild(host);root=createRoot(host); }
  await act(async()=>root.render(renderSaved(React,'stem-assessment',roundtrip(item),k=>k,s=>s,teacher,...['setAssessmentBlocks','setMathSubject','setGradeLevel','setLeveledTextLanguage','setShowAssessmentBuilder','openMathCreate'].map(k=>callbacks[k]||vi.fn()))));
}
const plan = {id:'plan-a',type:'stem-assessment',title:'Fractions plan',config:{grade:'3rd Grade',language:'Spanish'},data:{subject:'Fractions',blocks:[{id:'b',type:'computation',quantity:3,directive:'Add 1/2 + 1/3'}],results:null}};
describe('saved assessment rendering and recovery',()=>{
  it('reopens a JSON-saved plan with settings and edits a separate copy without generating',async()=>{
    const setAssessmentBlocks=vi.fn(),setMathSubject=vi.fn(),setGradeLevel=vi.fn(),setLeveledTextLanguage=vi.fn(),openMathCreate=vi.fn();
    await mountSaved(plan,{setAssessmentBlocks,setMathSubject,setGradeLevel,setLeveledTextLanguage,openMathCreate});
    expect(host.textContent).toContain('Assessment plan');
    expect(host.textContent).toContain('3 problems');expect(host.textContent).toContain('Add 1/2 + 1/3');
    expect(host.textContent).toContain('Generated questions are saved separately');
    await act(async()=>host.querySelector('button').click());
    expect(setAssessmentBlocks.mock.calls[0][0][0]).toEqual({...plan.data.blocks[0],id:'restored-block-0'});
    expect(setMathSubject).toHaveBeenCalledWith('Fractions');expect(setGradeLevel).toHaveBeenCalledWith('3rd Grade');expect(setLeveledTextLanguage).toHaveBeenCalledWith('Spanish');expect(openMathCreate).toHaveBeenCalledOnce();
    expect(plan.data.blocks[0].id).toBe('b');
  });
  it('reopens submitted answers without relying on an existing source and switches cleanly',async()=>{
    await mountSaved(plan);
    const result={id:'submission',type:'stem-assessment',title:'Completed fractions',data:{sourceId:'deleted-source',score:1,total:2,percentage:50,results:[{question:'1/2 + 1/3',response:'5/6',correct:true},{question:'2 + 3',response:'6',correct:false}]}};
    await mountSaved(result);
    expect(host.textContent).toContain('Submitted assessment results');expect(host.textContent).toContain('1 / 2 (50%)');expect(host.textContent).toContain('Your submitted answer: 5/6');expect(host.textContent).toContain('Incorrect');expect(host.textContent).not.toContain('Edit a copy');
    await mountSaved({type:'stem-assessment',data:{}});
    expect(host.textContent).toContain('no readable plan');expect(host.textContent).not.toContain('5/6');
  });
  it('does not expose plan editing to learners or interpret saved text as HTML',async()=>{
    const hostile=roundtrip(plan);hostile.data.blocks[0].directive='<img src=x onerror=alert(1)>';
    await mountSaved(hostile,{},false);
    expect(host.querySelector('button')).toBeNull();expect(host.querySelector('img')).toBeNull();expect(host.textContent).toContain('<img');
  });
});
function fixture(problem,teacher=true) {
  const artifact={id:'math-a',type:'math',data:{title:'Exact assessment',problems:[{id:'p',question:'Simplify x*x',answer:'x^2',steps:[{explanation:'Multiply equal factors',latex:'x^{2}'}],...problem}]}};
  const state={content:roundtrip(artifact),history:[roundtrip(artifact)],answers:{p:'x^{2}'}};
  const deps={get generatedContent(){return state.content},isTeacherMode:teacher,mathActiveResourceKeyRef:{current:'math-a'},getMathResourceStateKey:a=>a?.id,setStudentResponses:vi.fn(),setMathCheckResults:vi.fn(),setMathHintData:vi.fn(),setMathStudentAnswers:update=>{state.answers=typeof update==='function'?update(state.answers):update},setGeneratedContent:update=>{state.content=update(state.content)},setHistory:update=>{state.history=update(state.history)}};
  return {state,deps,edit:method('handleMathProblemEdit','submitMathSelfGrade',deps)};
}
describe('teacher review and persistence',()=>{
  it('stores a distinct teacher review and preserves questions, keys and steps on reopen',()=>{
    const {state,edit}=fixture({_verification:{verified:false,reviewRequired:true,reason:'unsupported_verification'}});
    edit(0,'teacher_reviewed',true,null,'p','math-a');
    expect(state.content.data.problems[0]._verification).toMatchObject({teacherReviewed:true,verified:false,reviewRequired:false,status:'teacher_reviewed'});
    expect(roundtrip(state.history[0])).toEqual(roundtrip(state.content));
    const reopened=roundtrip(state.history[0]);expect(reopened.data.problems[0]).toMatchObject({question:'Simplify x*x',answer:'x^2',steps:[{explanation:'Multiply equal factors',latex:'x^{2}'}]});
  });
  it.each(['answer_expression_conflict','question_expression_conflict','question_answer_conflict','invalid_answer','invalid_manipulative_activity','missing_answer','invalid_expression'])('does not let a teacher acknowledge %s',reason=>{
    const {state,edit}=fixture({_verification:{verified:false,reviewRequired:true,reason}});const before=roundtrip(state);
    edit(0,'teacher_reviewed',true,null,'p','math-a');expect(state).toEqual(before);
  });
  it('rejects learner and stale-resource acknowledgement',()=>{
    for(const teacher of [false,true]) {const {state,edit}=fixture({_verification:{reviewRequired:true,reason:'unsupported_verification'}},teacher);const before=roundtrip(state);edit(0,'teacher_reviewed',true,null,'p',teacher?'math-b':'math-a');expect(state).toEqual(before);}
  });
  it('rejects a stale problem key after reordering within the same resource',()=>{
    const {state,edit}=fixture({id:'replacement',_verification:{reviewRequired:true,reason:'unsupported_verification'}});
    const before=roundtrip(state);
    edit(0,'teacher_reviewed',true,null,'p','math-a');
    expect(state).toEqual(before);
  });
  it('invalidates review after an edit without mutating the earlier snapshot',()=>{
    const {state,edit}=fixture({_verification:{reviewRequired:true,reason:'unsupported_verification'}});
    edit(0,'teacher_reviewed',true,null,'p','math-a');const previous=state.content;
    edit(0,'answer','x^3',null,'p','math-a');
    expect(previous.data.problems[0]._verification.teacherReviewed).toBe(true);
    expect(state.content.data.problems[0]._verification).toMatchObject({verified:false,reviewRequired:true});
    expect(state.content.data.problems[0]._verification.teacherReviewed).not.toBe(true);
    expect(state.history[0].data.problems[0].answer).toBe('x^3');
  });
});
describe('submitted result persistence',()=>{
  function submission(problems) {
    let history=[];const deps={mathSelfGradeContextKey:'math-a',isCommittedMathAssessmentContext:id=>id==='math-a',generatedContent:{id:'math-a',type:'math',data:{title:'Exact assessment',problems}},mathStudentAnswers:{p:'5/6'},mathSelfGradeSubmissionRef:{current:''},setHistory:update=>{history=update(history)},setMathSelfGradeMode:vi.fn(),setMathStudentAnswers:vi.fn(),addToast:vi.fn(),t:k=>k};
    return {submit:method('submitMathSelfGrade','parseFlowChartData',deps),deps,get history(){return history}};
  }
  it('saves exact submitted answers once, survives JSON reload, and never saves keys',()=>{
    const run=submission([{id:'p',question:'1/2 + 1/3',answer:'5/6',_verification:{verified:true,reviewRequired:false}}]);
    run.submit('math-a');run.submit('math-a');expect(run.history).toHaveLength(1);
    const saved=roundtrip(run.history[0]);expect(saved.data).toMatchObject({resourceKind:'submission',sourceId:'math-a',score:1,total:1,answers:{p:'5/6'},results:[{problemId:'p',question:'1/2 + 1/3',response:'5/6',correct:true}]});
    expect(saved.data.results[0]).not.toHaveProperty('answer');expect(saved.data.results[0]).not.toHaveProperty('expected');
  });
  it('does not silently submit only the gradeable subset',()=>{
    const run=submission([{id:'p',question:'1/2 + 1/3',answer:'5/6'},{id:'q',question:'x*x',answer:'x^2',_verification:{reviewRequired:true}}]);
    run.submit('math-a');expect(run.history).toEqual([]);expect(run.deps.addToast).toHaveBeenCalledWith(expect.stringContaining('Review every flagged'),'error');
  });
});
