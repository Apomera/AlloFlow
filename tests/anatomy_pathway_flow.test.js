import fs from 'node:fs';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {loadTool,makeCtx,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const files=['stem_lab/stem_tool_anatomy.js','desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const bank=JSON.parse(fs.readFileSync('reports/anatomy-pathway-refinements-2026-09-12/checks.json','utf8'));
const clone=value=>JSON.parse(JSON.stringify(value));
function find(node,predicate){if(!node||typeof node!=='object')return null;if(Array.isArray(node)){for(const child of node){const hit=find(child,predicate);if(hit)return hit;}return null;}return predicate(node)?node:find(node.props?.children,predicate);}
function text(node){return node==null||typeof node==='boolean'?'':typeof node!=='object'?String(node):Array.isArray(node)?node.map(text).join(' '):text(node.props?.children);}
function session(file,extra={}){
  resetStemLab();const tool=loadTool(file,'anatomy');
  let data={anatomy:{system:'circulatory',view:'anterior',complexity:3,_activeTab:'pathways',_activePathway:null,_pathwayStep:0,selectedStructure:'heart',_structureNotes:{heart:'Saved note'},...extra}},host,deferred=false,queue=[];
  const announce=vi.fn(),toast=vi.fn();
  const apply=updater=>{data=typeof updater==='function'?updater(data):updater;};
  const render=()=>tool.render(makeCtx({toolData:data,gradeLevel:'9',announceToSR:announce,addToast:toast,setToolData:updater=>{if(deferred)queue.push(updater);else apply(updater);}}));
  const node=predicate=>{const hit=find(render(),predicate);expect(hit).not.toBeNull();return hit;};
  const html=()=>{const root=document.createElement('div');root.innerHTML=renderTool('anatomy',data,{gradeLevel:'9'});return root;};
  const jump=index=>node(n=>n.props?.id==='anatomy-pathway-jump').props.onChange({target:{value:String(index)}});
  const choice=id=>node(n=>n.props?.['data-anatomy-pathway-choice']===id).props.onClick();
  const choose=id=>node(n=>n.props?.id==='anatomy-study-pathway').props.onChange({target:{value:id}});
  const answerHandler=(id,option)=>{const question=node(n=>n.props?.['data-anatomy-pathway-question']===id);const hit=find(question,n=>n.props?.['data-anatomy-pathway-option']===option);expect(hit).not.toBeNull();return hit.props.onClick;};
  return {
    data:()=>data.anatomy,node,html,choice,choose,jump,announce,toast,
    patch:patch=>{data={anatomy:{...data.anatomy,...patch}};},
    answerHandler,answer:(id,option)=>answerHandler(id,option)(),
    openChecks:()=>{jump(html().querySelector('#anatomy-pathway-jump').options.length-1);node(n=>n.props?.['data-anatomy-pathway-recap-open']).props.onClick();},
    review:step=>node(n=>n.props?.['data-anatomy-pathway-review']===String(step)).props.onClick(),
    back:()=>node(n=>n.props?.['data-anatomy-pathway-check-back']).props.onClick(),
    resume:()=>node(n=>n.props?.['data-anatomy-pathway-check-resume']).props.onClick(),
    restart:()=>node(n=>n.props?.['data-anatomy-pathway-check-restart']).props.onClick(),
    list:()=>node(n=>n.props?.['data-anatomy-pathway-list-back']).props.onClick(),
    finish:()=>node(n=>n.type==='button'&&text(n)==='Finish pathway').props.onClick(),
    skip:()=>node(n=>n.type==='button'&&text(n)==='Finish without completing checks').props.onClick(),
    mount:()=>{if(!host){host=document.createElement('div');document.body.appendChild(host);}host.innerHTML=renderTool('anatomy',data,{gradeLevel:'9'});return host;},
    defer:()=>{deferred=true;},flush:()=>{deferred=false;const updates=queue;queue=[];updates.forEach(apply);}
  };
}

let scrollDescriptor,audioDescriptor,sound;
beforeEach(()=>{
  resetStemLab();vi.useFakeTimers();document.body.innerHTML='';sound=vi.fn();
  scrollDescriptor=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'scrollIntoView');
  Object.defineProperty(HTMLElement.prototype,'scrollIntoView',{value:vi.fn(),configurable:true});
  audioDescriptor=Object.getOwnPropertyDescriptor(window,'AudioContext');
  Object.defineProperty(window,'AudioContext',{configurable:true,value:function(){
    this.currentTime=0;this.destination={};
    this.createOscillator=()=>({type:'sine',frequency:{value:0},connect:()=>{},start:sound,stop:()=>{}});
    this.createGain=()=>({gain:{setValueAtTime:()=>{},exponentialRampToValueAtTime:()=>{}},connect:()=>{}});
  }});
});
afterEach(()=>{
  vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();document.body.innerHTML='';
  if(scrollDescriptor)Object.defineProperty(HTMLElement.prototype,'scrollIntoView',scrollDescriptor);else delete HTMLElement.prototype.scrollIntoView;
  if(audioDescriptor)Object.defineProperty(window,'AudioContext',audioDescriptor);else delete window.AudioContext;
});

for(const file of files)describe('Pathway check continuity and focus: '+file,()=>{
  for(const [pathId,questions] of Object.entries(bank))it('keeps submitted process explanations through exact review and return: '+pathId,()=>{
    const confidence={heart:'practice'},evidence={heart:{attempts:3,correct:1}},s=session(file,{_structureConfidence:confidence,_retrievalEvidence:evidence});
    s.choice(pathId);s.openChecks();const question=questions[0],wrong=question.options.find(option=>option[0]!==question.correct)[0];
    s.answer(question.id,wrong);s.answer(questions[1].id,questions[1].correct);
    const answers=clone(s.data()._pathwayRecap.answers),token=s.data()._pathwayRecap.token,score=clone(s.data()._pathwayChecks[pathId]);
    s.review(question.step);
    expect(s.data()).toMatchObject({_pathwayStep:question.step,_pathwayRecap:{active:false,answers,token},_pathwayRecapReturn:{pathwayId:pathId,questionId:question.id,token}});
    expect(s.html().querySelector('[data-anatomy-recap]')).toBeNull();
    expect(s.html().querySelector('[data-anatomy-pathway-check-return]').textContent).toContain('Question 1');
    s.patch({_structureNotes:{heart:'Saved note',review:'My explanation from this step'}});s.resume();
    expect(s.data()._pathwayRecap).toMatchObject({active:true,answers,token,focusQuestionId:question.id});
    expect(s.data()._pathwayRecapReturn).toBeNull();expect(s.data()._pathwayChecks[pathId]).toEqual(score);
    expect(s.data()._structureNotes.review).toBe('My explanation from this step');
    expect(s.data()._structureConfidence).toEqual(confidence);expect(s.data()._retrievalEvidence).toEqual(evidence);
    const restored=s.html().querySelector('[data-anatomy-pathway-question="'+question.id+'"]');
    expect(restored.querySelectorAll('button:disabled')).toHaveLength(3);expect(restored.textContent).toContain('Your answer');expect(restored.textContent).toContain('Correct answer');
    s.answer(question.id,question.correct);expect(s.data()._pathwayRecap.answers).toEqual(answers);
  });

  it('pauses Back and step jumps at the latest answered concept and resumes the same attempt',()=>{
    const s=session(file);s.choice('path_blood');s.openChecks();s.answer('return','left');const token=s.data()._pathwayRecap.token;
    s.back();expect(s.data()._pathwayRecapReturn.questionId).toBe('return');s.jump(1);
    expect(s.data()).toMatchObject({_pathwayStep:1,_pathwayRecap:{active:false,token,answers:{return:'left'}}});
    s.resume();s.jump(3);expect(s.data()._pathwayRecapReturn.questionId).toBe('return');
    s.jump(s.html().querySelector('#anatomy-pathway-jump').options.length-1);s.node(n=>n.props?.['data-anatomy-pathway-recap-open']).props.onClick();
    expect(s.data()._pathwayRecap).toMatchObject({active:true,token,answers:{return:'left'}});
    expect(s.data()._pathwayChecks).toBeUndefined();
  });

  it('checkpoints partial checks on Back to pathways and restores active feedback after reload',()=>{
    const s=session(file);s.choice('path_blood');s.openChecks();s.answer('direction','away');
    const token=s.data()._pathwayRecap.token;s.list();
    expect(s.data()).toMatchObject({_activePathway:null,_pathwayRecap:null,_pathwayRecapReturn:null,_pathwaySessions:{version:1,routes:{path_blood:{recap:{active:true,token,answers:{direction:'away'}}}}}});
    const card=s.html().querySelector('[data-anatomy-pathway-choice="path_blood"]');expect(card.dataset.session).toBe('resumed');expect(card.textContent).toContain('1/2 checks answered');
    const restored=session(file,clone(s.data()));restored.choice('path_blood');
    expect(restored.data()._pathwayRecap).toMatchObject({active:true,token,answers:{direction:'away'},focusQuestionId:'direction'});
    expect(restored.data()._pathwaySessions.routes.path_blood).toBeUndefined();
    expect(restored.html().querySelector('[data-anatomy-pathway-question="direction"] [data-anatomy-pathway-feedback]')).not.toBeNull();
  });

  it('restores the paused teaching step and exact check through route switches and Back',()=>{
    const s=session(file);s.choice('path_food');s.openChecks();s.answer('exit','bladder');s.review(6);const recap=clone(s.data()._pathwayRecap),link=clone(s.data()._pathwayRecapReturn);
    s.choose('path_air');s.jump(2);s.choose('path_food');
    expect(s.data()).toMatchObject({_activePathway:'path_food',_pathwayStep:6,selectedStructure:'lg_intestine',_pathwayRecap:recap,_pathwayRecapReturn:link});
    expect(s.data()._pathwaySessions.routes.path_air.step).toBe(2);
    s.list();s.choice('path_food');s.resume();expect(s.data()._pathwayRecap.answers).toEqual({exit:'bladder'});expect(s.data()._pathwayRecap.token).toBe(recap.token);
    s.choose('path_air');expect(s.data()._pathwayStep).toBe(2);expect(s.data()._pathwayRecap).toBeNull();
  });

  it('saves only the four authored routes and consumes each opened checkpoint',()=>{
    const s=session(file);for(const id of Object.keys(bank)){s.choice(id);s.jump(1);s.list();}
    expect(Object.keys(s.data()._pathwaySessions.routes).sort()).toEqual(Object.keys(bank).sort());
    s.patch({_pathwaySessions:{...s.data()._pathwaySessions,routes:{...s.data()._pathwaySessions.routes,forged:{pathwayId:'forged',step:1,recap:null}}}});
    s.choice('path_air');expect(Object.keys(s.data()._pathwaySessions.routes)).toHaveLength(3);
    expect(s.data()._pathwaySessions.routes.forged).toBeUndefined();expect(s.data()._pathwaySessions.routes.path_air).toBeUndefined();expect(s.data()._pathwayStep).toBe(1);
  });

  it('restarts only current check answers and retains scores, other routes, notes and confidence',()=>{
    const score={version:2,answers:{direction:'away',return:'left'}},s=session(file,{_pathwayChecks:{path_blood:score},_pathwaysCompleted:{path_food:true},_structureConfidence:{heart:'practice'},_retrievalEvidence:{heart:{attempts:3,correct:1}}});
    s.choice('path_air');s.jump(2);s.choose('path_blood');s.openChecks();s.answer('direction','away');
    s.patch({_structureNotes:{heart:'New note'},quizScore:7,quizIdx:2});const before=clone(s.data()),answer=s.answerHandler('return','left');s.restart();
    expect(s.data()._pathwayRecap.answers).toEqual({});expect(s.data()._pathwayRecap.token).not.toBe(before._pathwayRecap.token);expect(s.data()._pathwayRecapReturn).toBeNull();
    for(const key of ['_pathwayChecks','_pathwaysCompleted','_pathwaySessions','_structureNotes','_structureConfidence','_retrievalEvidence','quizScore','quizIdx'])expect(s.data()[key]).toEqual(before[key]);
    const restarted=clone(s.data());answer();expect(s.data()).toEqual(restarted);
  });

  it('upgrades valid legacy version-2 answers when paused or checkpointed without creating new evidence',()=>{
    const old={active:true,version:2,pathwayId:'path_food',answers:{exit:'bladder',surface:'area'}};
    const s=session(file,{_activePathway:'path_food',_pathwayRecap:old});s.review(6);
    expect(s.data()._pathwayRecap.token).toEqual(expect.any(String));expect(s.data()._pathwayRecap.context).toEqual(expect.any(String));
    s.list();const restored=session(file,clone(s.data()));restored.choice('path_food');restored.resume();
    expect(restored.data()._pathwayRecap.answers).toEqual(old.answers);expect(restored.data()._retrievalEvidence).toBeUndefined();expect(restored.data()._pathwayChecks).toBeUndefined();
    const active=session(file,{_activePathway:'path_food',_pathwayRecap:old});active.list();active.choice('path_food');expect(active.data()._pathwayRecap.answers).toEqual(old.answers);expect(active.data()._pathwayRecap.token).toEqual(expect.any(String));
  });

  it('rejects malformed or outdated checkpoint contexts and never displays a forged resume control',()=>{
    const s=session(file);s.choice('path_food');s.openChecks();s.answer('exit','bladder');s.review(6);const paused=clone(s.data()),link=paused._pathwayRecapReturn;
    for(const patch of [
      {_pathwayRecapReturn:{...link,pathwayId:'path_air'}},{_pathwayRecapReturn:{...link,token:'other'}},
      {_pathwayRecapReturn:{...link,context:'old'}},{_pathwayRecapReturn:{...link,questionId:'forged'}},
      {_pathwayRecapReturn:[]},{_pathwayRecap:{...paused._pathwayRecap,context:'old'}}
    ])expect(session(file,{...paused,...patch}).html().querySelector('[data-anatomy-pathway-check-return]')).toBeNull();
    const saved=session(file,paused);saved.list();const snapshot=clone(saved.data()),entry=snapshot._pathwaySessions.routes.path_food;
    for(const changed of [{...entry,step:-1},{...entry,step:1.5},{...entry,step:100},{...entry,pathwayId:'path_air'},{...entry,recap:{...entry.recap,context:'old'}},{...entry,recap:{...entry.recap,token:[]}}]){
      const bad=session(file,{...snapshot,_pathwaySessions:{version:1,routes:{path_food:changed}}});
      expect(bad.html().querySelector('[data-anatomy-pathway-choice="path_food"]').dataset.session).toBe('new');bad.choice('path_food');expect(bad.data()).toMatchObject({_pathwayStep:0,_pathwayRecap:null});
    }
  });

  it('rejects stale answer, pause, restart, close and completion handlers without effects after leaving',()=>{
    const s=session(file);s.choice('path_blood');s.openChecks();s.answer('direction','away');
    const actions=[s.answerHandler('return','left'),s.node(n=>n.props?.['data-anatomy-pathway-check-back']).props.onClick,s.node(n=>n.props?.['data-anatomy-pathway-check-restart']).props.onClick,s.node(n=>n.props?.['data-anatomy-pathway-list-back']).props.onClick,s.node(n=>n.type==='button'&&text(n)==='Finish without completing checks').props.onClick];
    vi.advanceTimersByTime(300);s.patch({_activeTab:'explore'});s.mount();
    const outside=document.createElement('button');document.body.appendChild(outside);outside.focus();s.announce.mockClear();s.toast.mockClear();sound.mockClear();const before=clone(s.data());
    actions.forEach(action=>action());vi.advanceTimersByTime(300);
    expect(s.data()).toEqual(before);expect(s.announce).not.toHaveBeenCalled();expect(s.toast).not.toHaveBeenCalled();expect(sound).not.toHaveBeenCalled();expect(document.activeElement).toBe(outside);
  });

  it('rejects stale return and completion callbacks after restarting the same route',()=>{
    const s=session(file);s.choice('path_food');s.openChecks();s.answer('exit','bladder');s.review(6);const resume=s.node(n=>n.props?.['data-anatomy-pathway-check-resume']).props.onClick;
    s.resume();s.answer('surface','area');const finish=s.node(n=>n.type==='button'&&text(n)==='Finish pathway').props.onClick;s.restart();
    vi.advanceTimersByTime(300);s.mount();const outside=document.createElement('button');document.body.appendChild(outside);outside.focus();s.announce.mockClear();s.toast.mockClear();sound.mockClear();const before=clone(s.data());
    resume();finish();vi.advanceTimersByTime(300);
    expect(s.data()).toEqual(before);expect(s.announce).not.toHaveBeenCalled();expect(s.toast).not.toHaveBeenCalled();expect(sound).not.toHaveBeenCalled();expect(document.activeElement).toBe(outside);
  });

  it('does not reopen a check or switch a route from an older render after newer navigation',()=>{
    const s=session(file);s.choice('path_blood');s.jump(s.html().querySelector('#anatomy-pathway-jump').options.length-1);const open=s.node(n=>n.props?.['data-anatomy-pathway-recap-open']).props.onClick,choose=s.node(n=>n.props?.id==='anatomy-study-pathway').props.onChange;
    s.jump(2);vi.advanceTimersByTime(300);s.announce.mockClear();sound.mockClear();const before=clone(s.data());open();vi.advanceTimersByTime(300);expect(s.data()).toEqual(before);expect(s.announce).not.toHaveBeenCalled();expect(sound).not.toHaveBeenCalled();
    s.choose('path_air');vi.advanceTimersByTime(300);const switched=clone(s.data());s.announce.mockClear();sound.mockClear();choose({target:{value:'path_food'}});vi.advanceTimersByTime(300);expect(s.data()).toEqual(switched);expect(s.announce).not.toHaveBeenCalled();expect(sound).not.toHaveBeenCalled();
  });

  it('deduplicates answers and preserves a newer saved route score when another check completes',()=>{
    const s=session(file);s.choice('path_blood');s.openChecks();const answer=s.answerHandler('direction','away');answer();vi.advanceTimersByTime(300);s.announce.mockClear();sound.mockClear();answer();vi.advanceTimersByTime(300);
    expect(s.announce).not.toHaveBeenCalled();expect(sound).not.toHaveBeenCalled();
    const air={version:2,answers:{exchange:'gases',recoil:'relax'}};s.patch({_pathwayChecks:{path_air:air},_structureNotes:{heart:'Updated while answering'}});s.answer('return','left');
    expect(s.data()._pathwayChecks).toEqual({path_air:air,path_blood:{version:2,answers:{direction:'away',return:'left'}}});expect(s.data()._structureNotes.heart).toBe('Updated while answering');
  });

  it('completes from fresh progress and clears only this route checkpoint while preserving the score',()=>{
    const s=session(file);s.choice('path_air');s.jump(2);s.choose('path_blood');s.openChecks();s.answer('direction','away');s.answer('return','left');const finish=s.node(n=>n.type==='button'&&text(n)==='Finish pathway').props.onClick;
    const checkpoint=clone(s.data()._pathwaySessions.routes.path_air);s.patch({_pathwaysCompleted:{path_nerve:true},_structureNotes:{heart:'Latest completion note'}});finish();
    expect(s.data()._pathwaysCompleted).toEqual({path_nerve:true,path_blood:true});expect(s.data()._pathwaySessions.routes).toEqual({path_air:checkpoint});expect(s.data()).toMatchObject({_activePathway:null,_pathwayRecap:null,_pathwayRecapReturn:null,_structureNotes:{heart:'Latest completion note'}});
    expect(s.html().querySelector('[data-anatomy-pathway-choice="path_blood"]').dataset.session).toBe('new');expect(s.html().querySelector('[data-anatomy-pathway-score="path_blood"]').textContent).toContain('2/2');
  });

  it('waits for an accepted deferred update before focus, sound or announcements',()=>{
    const s=session(file,{_activePathway:'path_blood',_pathwayStep:9});s.mount();s.defer();s.node(n=>n.props?.['data-anatomy-pathway-recap-open']).props.onClick();
    expect(s.announce).not.toHaveBeenCalled();expect(sound).not.toHaveBeenCalled();s.flush();s.mount();vi.advanceTimersByTime(1);
    expect(s.announce).toHaveBeenCalledTimes(1);expect(sound).toHaveBeenCalled();expect(document.activeElement.id).toBe('anatomy-pathway-check-title');vi.advanceTimersByTime(300);
    const rejected=session(file,{_activePathway:'path_blood',_pathwayStep:9});rejected.mount();rejected.defer();rejected.node(n=>n.props?.['data-anatomy-pathway-recap-open']).props.onClick();rejected.patch({_activeTab:'explore'});sound.mockClear();rejected.flush();rejected.mount();vi.advanceTimersByTime(300);
    expect(rejected.data()._pathwayRecap).toBeUndefined();expect(rejected.announce).not.toHaveBeenCalled();expect(sound).not.toHaveBeenCalled();
  });

  it('focuses menu, teaching step, check heading, feedback, exact review and return, and menu Back',()=>{
    const s=session(file);s.mount();s.choice('path_food');s.mount();vi.advanceTimersByTime(0);expect(document.activeElement.getAttribute('data-anatomy-pathway-step')).toBe('0');
    s.openChecks();s.mount();vi.advanceTimersByTime(0);expect(document.activeElement.id).toBe('anatomy-pathway-check-title');
    s.answer('exit','bladder');s.mount();vi.advanceTimersByTime(0);expect(document.activeElement.getAttribute('data-anatomy-pathway-feedback')).toBe('incorrect');expect(document.activeElement.closest('[data-anatomy-pathway-question]').dataset.anatomyPathwayQuestion).toBe('exit');
    s.review(6);s.mount();vi.advanceTimersByTime(0);expect(document.activeElement.getAttribute('data-anatomy-pathway-step')).toBe('6');
    s.resume();s.mount();vi.advanceTimersByTime(0);expect(document.activeElement.closest('[data-anatomy-pathway-question]').dataset.anatomyPathwayQuestion).toBe('exit');
    s.node(n=>n.props?.['data-anatomy-pathway-return']).props.onClick();vi.advanceTimersByTime(0);expect(document.activeElement.closest('[data-anatomy-pathway-question]').dataset.anatomyPathwayQuestion).toBe('exit');
    s.list();s.mount();vi.advanceTimersByTime(0);expect(document.activeElement.id).toBe('anatomy-pathway-menu-title');
    s.choice('path_food');s.mount();vi.advanceTimersByTime(0);expect(document.activeElement.closest('[data-anatomy-pathway-question]').dataset.anatomyPathwayQuestion).toBe('exit');
  });

  it('focuses an unanswered returned fieldset and restores that question after changing activities',()=>{
    const s=session(file);s.choice('path_blood');s.openChecks();s.back();s.resume();s.mount();vi.advanceTimersByTime(0);
    expect(document.activeElement.dataset.anatomyPathwayQuestion).toBe('direction');
    s.node(n=>n.props?.id==='anatomy-mode-tab-explore').props.onClick();s.mount();vi.advanceTimersByTime(0);s.node(n=>n.props?.id==='anatomy-mode-tab-pathways').props.onClick();s.mount();vi.advanceTimersByTime(0);
    expect(document.activeElement.dataset.anatomyPathwayQuestion).toBe('direction');expect(s.data()._pathwayRecap.answers).toEqual({});
  });

  it('never lets deferred focus for an earlier route or attempt land in the current panel',()=>{
    const s=session(file);s.choice('path_food');s.openChecks();s.answer('exit','bladder');s.choose('path_air');s.mount();vi.advanceTimersByTime(0);
    expect(document.activeElement.closest('[data-anatomy-pathway-panel]').dataset.anatomyPathwayId).toBe('path_air');expect(document.activeElement.dataset.anatomyPathwayStep).toBe('0');
    s.openChecks();s.answer('exchange','gases');s.restart();s.mount();vi.advanceTimersByTime(0);expect(document.activeElement.id).toBe('anatomy-pathway-check-title');
  });

  it('uses the displayed bounded step for controls when legacy live positions are invalid',()=>{
    const high=session(file,{_activePathway:'path_blood',_pathwayStep:999});
    const finalIndex=high.html().querySelector('#anatomy-pathway-jump').options.length-1;
    expect(high.html().querySelector('[data-anatomy-pathway-step]').dataset.anatomyPathwayStep).toBe(String(finalIndex));
    high.node(n=>n.props?.['data-anatomy-pathway-recap-open']).props.onClick();
    expect(high.data()).toMatchObject({_pathwayStep:finalIndex,_pathwayRecap:{active:true,answers:{}}});
    for(const value of [-10,'invalid',1.5]){
      const restored=session(file,{_activePathway:'path_blood',_pathwayStep:value});
      const displayed=Number(restored.html().querySelector('[data-anatomy-pathway-step]').dataset.anatomyPathwayStep);
      restored.node(n=>n.type==='button'&&n.props?.['aria-label']==='Next pathway step').props.onClick();
      expect(restored.data()._pathwayStep).toBe(displayed+1);
      restored.list();expect(restored.data()._pathwaySessions.routes.path_blood.step).toBe(displayed+1);
    }
    const diagram=session(file,{_activePathway:'path_blood',_pathwayStep:'invalid',selectedStructure:'sup_vena'});
    diagram.node(n=>n.props?.['data-anatomy-pathway-diagram']).props.onClick();expect(diagram.data()).toMatchObject({_pathwayStep:0,selectedStructure:'heart'});
  });
});
