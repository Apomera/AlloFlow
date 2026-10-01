import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, act, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act || require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
  window.React = globalThis.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  for (const file of ['note_taking_templates_module.js', 'anchor_charts_module.js', 'applied_challenge_module.js', 'resource_content_fingerprint_module.js', 'view_alignment_report_module.js']) loadAlloModule(file);
});
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; host?.remove(); host = null;
  vi.restoreAllMocks(); sessionStorage.clear();
});
const pending = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
const t = key => ({'notes_feedback.dismiss_aria':'Dismiss feedback'})[key] || '';
function mount(name, initial) {
  let config = initial;
  host=document.createElement('div'); document.body.appendChild(host); root=createRoot(host);
  const render = patch => { config={...config,...patch}; act(() => root.render(React.createElement(window.AlloModules[name],config))); };
  render({});
  return render;
}
async function click(text) {
  const button=[...host.querySelectorAll('button')].find(node=>node.textContent.includes(text));
  expect(button,'button '+text).toBeTruthy(); expect(button.disabled).toBe(false);
  await act(async()=>button.click());
}
async function type(node,value) {
  await act(async()=>{
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set.call(node,value);
    node.dispatchEvent(new Event('input',{bubbles:true}));
  });
}
async function finish(deferred, value, reject=false) { await act(async()=>{ deferred[reject?'reject':'resolve'](value); await Promise.resolve(); }); }
const chart = id => ({id,type:'anchor-chart',data:{title:'Water cycle',interactive:{armed:false,rubric:'Existing teacher rubric'},sections:[{id:'s1',label:'Evaporation',bullets:['Water becomes vapor']}]}});
const chartProps = provider => ({generatedContent:chart('a'),isTeacherMode:true,allowRuntimeAi:true,callGemini:provider,callImagen:null,callGeminiImageEdit:null,handleNoteUpdate:vi.fn(),addToast:vi.fn(),t});
const rubricInput = () => host.querySelector('textarea[aria-label="Rubric or key concepts"]');
async function openRubric() { await act(async()=>host.querySelector('[aria-label="Arm interactive mode"]').click()); }

describe('Anchor Chart rubric request ownership',()=>{
  it('preserves a newer typed rubric when the AI suggestion finishes',async()=>{
    const deferred=pending(), config=chartProps(()=>deferred.promise); mount('AnchorChartView',config);
    await openRubric(); await click('Suggest Rubric with AI'); await type(rubricInput(),'My revised criteria');
    await finish(deferred,'Old generated criteria');
    expect(rubricInput().value).toBe('My revised criteria');
    expect(config.addToast).not.toHaveBeenCalledWith(expect.stringContaining('suggestion generated'));
  });
  it('applies a current suggestion without changing canonical content until the teacher arms it',async()=>{
    const deferred=pending(), config=chartProps(()=>deferred.promise); mount('AnchorChartView',config);
    await openRubric(); await click('Suggest Rubric with AI'); await finish(deferred,'New criteria');
    expect(rubricInput().value).toBe('New criteria'); expect(config.handleNoteUpdate).not.toHaveBeenCalled();
    await click('Arm for students');
    expect(config.handleNoteUpdate).toHaveBeenCalledWith('interactive',{armed:true,rubric:'New criteria'});
  });
  it('closes a rubric dialog on chart navigation and ignores the previous suggestion',async()=>{
    const deferred=pending(), config=chartProps(()=>deferred.promise), render=mount('AnchorChartView',config);
    await openRubric(); await click('Suggest Rubric with AI');
    render({generatedContent:chart('b')}); expect(rubricInput()).toBeNull();
    await openRubric(); await finish(deferred,'Rubric for chart a');
    expect(rubricInput().value).toBe('Existing teacher rubric');
  });
  it('does not inject an abandoned suggestion after closing and reopening the dialog',async()=>{
    const deferred=pending(); mount('AnchorChartView',chartProps(()=>deferred.promise));
    await openRubric(); await click('Suggest Rubric with AI'); await click('Cancel'); await openRubric();
    await finish(deferred,'Abandoned suggestion'); expect(rubricInput().value).toBe('Existing teacher rubric');
  });
  it.each(['permission','unmount'])('suppresses a late rubric error after %s',async(change)=>{
    const deferred=pending(), config=chartProps(()=>deferred.promise),render=mount('AnchorChartView',config);
    await openRubric(); await click('Suggest Rubric with AI');
    if(change==='unmount'){act(()=>root.unmount());root=null;} else render({allowRuntimeAi:false});
    await finish(deferred,new Error('Late failure'),true); expect(config.addToast).not.toHaveBeenCalled();
  });
});
const challenge = id => ({id,type:'applied-challenge',data:{title:'Water choice',family:'decide',scope:'standard',brief:{drivingQuestion:'Which option uses less water?',criteria:['Use evidence.'],lockedLessonFacts:['Water can evaporate.']},workspace:{workingQuestion:'Which option uses less water?',response:'I recommend testing both methods and comparing the measured water loss.'}}});
const requestKinds = [
  ['hint','Ask for one hint','Consider how you would measure water loss.'],
  ['stress-test','Stress-test my draft',JSON.stringify({challenge:'What if the weather changes?',whyItMatters:'Weather changes water loss.',question:'How would you compare fairly?'})],
  ['feedback','Get strengths-first AI feedback',JSON.stringify({strength:'You propose a comparison.',lessonConnectionCheck:'You use evaporation.',evidenceOrConstraintCheck:'You plan a measurement.',nextStep:'Name a control.',status:'developing'})]
];
describe('Applied Challenge request lifetime',()=>{
  for(const [kind,label,result] of requestKinds) {
    it.each(['unmount','permission','profile','preview','readOnly'])('drops '+kind+' after %s changes',async(change)=>{
      const deferred=pending(),write=vi.fn(),toast=vi.fn();
      const render=mount('AppliedChallengeView',{generatedContent:challenge('a'),activeProfileId:'student-a',isTeacherMode:false,callGemini:()=>deferred.promise,handleNoteUpdate:write,addToast:toast,t});
      await click(label);
      if(change==='unmount'){act(()=>root.unmount());root=null;}
      else if(change==='permission')render({allowRuntimeAi:false});
      else if(change==='profile')render({activeProfileId:'student-b'});
      else if(change==='preview')render({previewMode:true});
      else render({learnerReadOnly:true});
      await finish(deferred,result);
      expect(write).not.toHaveBeenCalled(); expect(toast).not.toHaveBeenCalled();
    });
    it('keeps the normal '+kind+' success path working',async()=>{
      const deferred=pending(),write=vi.fn();
      mount('AppliedChallengeView',{generatedContent:challenge('a'),callGemini:()=>deferred.promise,handleNoteUpdate:write,t});
      await click(label); await finish(deferred,result);
      expect(write).toHaveBeenCalledWith(kind==='hint'?'coachHint':kind==='stress-test'?'stressTest':'feedback',expect.anything());
    });
  }
  it('lets the next resource request finish without an old failure clearing its busy state',async()=>{
    const first=pending(),second=pending(),write=vi.fn(),toast=vi.fn(),provider=vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const render=mount('AppliedChallengeView',{generatedContent:challenge('a'),callGemini:provider,handleNoteUpdate:write,addToast:toast,t});
    await click('Ask for one hint'); render({generatedContent:challenge('b')}); await click('Ask for one hint');
    await finish(first,new Error('Old failure'),true); expect(toast).not.toHaveBeenCalled();
    expect([...host.querySelectorAll('button')].find(b=>b.textContent.includes('Thinking of one hint')).disabled).toBe(true);
    await finish(second,'Current hint'); expect(write).toHaveBeenCalledExactlyOnceWith('coachHint','Current hint');
  });
});
const notes = (id,feedback=null) => ({id,type:'note-taking',data:{templateType:'cornell-notes',title:'Water cycle',cues:[{text:'Heating'},{text:'Cooling'}],notes:[{text:'Water evaporates when it gains energy.'},{text:'Water vapor condenses as it cools.'}],feedback}});
const noteProps = provider => ({generatedContent:notes('a'),isTeacherMode:false,activeProfileId:'student-a',callGemini:provider,handleNoteUpdate:vi.fn(),handleScoreUpdate:vi.fn(),addToast:vi.fn(),t});
async function askNotes(){await act(async()=>host.querySelector('[data-help-key="notes_feedback_button"]').click());}
const validFeedback = {strength:'You describe both processes.',growthNudge:'Connect them in a cycle.',rubric:{completion:3,quality:10,alignment:4}};

describe('Notes feedback reliability',()=>{
  it('dismisses feedback through the current resource callback after a same-template switch',async()=>{
    const oldWrite=vi.fn(),newWrite=vi.fn(),config=noteProps(null);
    const render=mount('NoteTakingView',{...config,generatedContent:notes('a',validFeedback),handleNoteUpdate:oldWrite});
    render({generatedContent:notes('b',validFeedback),handleNoteUpdate:newWrite});
    await act(async()=>host.querySelector('[aria-label="Dismiss feedback"]').click());
    expect(oldWrite).not.toHaveBeenCalled();expect(newWrite).toHaveBeenCalledExactlyOnceWith('feedback',null);
  });
  it.each(['permission','profile','resource'])('ignores an old notes error after %s changes',async(change)=>{
    const deferred=pending(),provider=vi.fn(()=>deferred.promise),config=noteProps(provider),render=mount('NoteTakingView',config);
    await askNotes();expect(provider).toHaveBeenCalledOnce();config.addToast.mockClear();
    render(change==='permission'?{allowRuntimeAi:false}:change==='profile'?{activeProfileId:'student-b'}:{generatedContent:notes('b')});
    await finish(deferred,new Error('Obsolete request'),true);
    expect(config.addToast).not.toHaveBeenCalled(); expect(config.handleNoteUpdate).not.toHaveBeenCalled();
  });
  it.each([[null],[[]],[{strength:{text:'Nested output'},growthNudge:'Try again'}], [{rubric:{quality:15}}]])('rejects malformed feedback before persisting or awarding points: %j',async(payload)=>{
    const config=noteProps(async()=>JSON.stringify(payload)); mount('NoteTakingView',config);await askNotes();
    expect(config.handleNoteUpdate).not.toHaveBeenCalled(); expect(config.handleScoreUpdate).not.toHaveBeenCalled();
    expect(config.addToast).toHaveBeenCalledWith(expect.stringContaining('Could not generate feedback'),'error');
  });
  it('bounds usable feedback and treats invalid rubric values as zero instead of NaN',async()=>{
    const config=noteProps(async()=>JSON.stringify({...validFeedback,rubric:{completion:{value:3},quality:'high',alignment:999},sourceAlignment:{message:{text:'Nested'}}}));
    mount('NoteTakingView',config);await askNotes();
    const saved=config.handleNoteUpdate.mock.calls.find(c=>c[0]==='feedback')[1];
    expect(saved).toMatchObject({strength:validFeedback.strength,rubric:{completion:0,quality:0,alignment:5},sourceAlignment:{message:''}});
    expect(config.handleScoreUpdate).toHaveBeenCalledWith(10,'Cornell Notes Feedback','a');
  });
});


describe('Curriculum Audit missing-date recovery',()=>{
  const original = {id:'quiz',type:'quiz',title:'Water quiz',data:{questions:[{question:'What is evaporation?'}]}};
  const report = metadata => ({id:'audit',type:'alignment-report',data:{comprehensive:{auditMetadata:metadata,auditScope:{includedArtifactIds:['quiz'],artifactFingerprints:window.AlloModules.AuditResourceFreshness.snapshot([original])}}}});
  it('still detects edited content when a saved audit has no generation date',()=>{
    const result=window.AlloModules.AuditResourceFreshness.compute(report({}),[{...original,data:{questions:[{question:'What is condensation?'}]}}]);
    expect(result).toMatchObject({unknownDate:true,stale:true,modified:['Water quiz']});
  });
  it('still detects removed dependencies when the saved generation date is malformed',()=>{
    const result=window.AlloModules.AuditResourceFreshness.compute(report({generatedAt:'not-a-date'}),[]);
    expect(result).toMatchObject({unknownDate:true,stale:true,removed:1});
  });
  it('qualifies unknown dates even if known content versions are unchanged',()=>{
    const result=window.AlloModules.AuditResourceFreshness.compute(report({}),[original]);
    expect(result).toMatchObject({unknownDate:true,stale:false,unverified:0});
    mount('AlignmentReportView',{generatedContent:report({}),history:[original],t});
    expect(host.textContent).toContain('no reliable generation date');
    expect(host.textContent).toContain('Existing resource versions were checked where available.');
  });
  it('uses the saved resource timestamp when audit metadata has no usable date',()=>{
    const saved={...report({generatedAt:'bad'}),timestamp:'2026-09-01T12:00:00.000Z'};
    expect(window.AlloModules.AuditResourceFreshness.compute(saved,[original])).toMatchObject({unknownDate:false,stale:false});
  });
});
