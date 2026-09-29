import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {loadTool,makeCtx,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const paths=['stem_lab/stem_tool_anatomy.js','desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
function find(node,predicate){if(!node||typeof node!=='object')return null;if(Array.isArray(node)){for(const child of node){const hit=find(child,predicate);if(hit)return hit;}return null;}return predicate(node)?node:find(node.props?.children,predicate);}
function text(node){return node==null||typeof node==='boolean'?'':typeof node!=='object'?String(node):Array.isArray(node)?node.map(text).join(' '):text(node.props?.children);}
function session(file,extra={}){
  resetStemLab();const tool=loadTool(file,'anatomy');
  let data={anatomy:{system:'skeletal',view:'anterior',complexity:3,_activeTab:'tour',_tourActive:true,_tourSystem:'skeletal',_tourStepIdx:4,selectedStructure:'pelvis',_structureNotes:{skull:'Saved note'},...extra}};
  let host;
  const render=()=>tool.render(makeCtx({toolData:data,gradeLevel:'9',setToolData:updater=>{data=typeof updater==='function'?updater(data):updater;}}));
  const node=predicate=>{const hit=find(render(),predicate);expect(hit).not.toBeNull();return hit;};
  const html=()=>{const root=document.createElement('div');root.innerHTML=renderTool('anatomy',data,{gradeLevel:'9'});return root;};
  return {
    data:()=>data.anatomy,
    patch:patch=>{data={anatomy:{...data.anatomy,...patch}};},
    node,html,
    open:()=>node(n=>n.props?.['data-anatomy-tour-recap-open']==='true').props.onClick(),
    answer:(structureId,optionId)=>{const question=node(n=>n.props?.['data-anatomy-recap-question']===structureId);return find(question,n=>n.props?.['data-anatomy-tour-option']===optionId).props.onClick();},
    review:stepIndex=>node(n=>n.props?.['data-anatomy-tour-review']===stepIndex).props.onClick(),
    resume:()=>node(n=>n.props?.['data-anatomy-tour-recap-resume']).props.onClick(),
    restart:()=>node(n=>n.props?.['data-anatomy-tour-recap-restart']).props.onClick(),
    back:()=>node(n=>n.type==='button'&&text(n).includes('Back to the tour')).props.onClick(),
    jump:index=>node(n=>n.props?.id==='anatomy-tour-step-select').props.onChange({target:{value:String(index)}}),
    choose:systemId=>node(n=>n.props?.id==='anatomy-tour-system-select').props.onChange({target:{value:systemId}}),
    mount:()=>{if(!host){host=document.createElement('div');document.body.appendChild(host);}host.innerHTML=renderTool('anatomy',data,{gradeLevel:'9'});return host;}
  };
}

let originalScrollDescriptor;
beforeEach(()=>{
  resetStemLab();vi.useFakeTimers();document.body.innerHTML='';
  originalScrollDescriptor=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'scrollIntoView');
  Object.defineProperty(HTMLElement.prototype,'scrollIntoView',{value:vi.fn(),configurable:true});
});
afterEach(()=>{
  vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();document.body.innerHTML='';
  if(originalScrollDescriptor)Object.defineProperty(HTMLElement.prototype,'scrollIntoView',originalScrollDescriptor);
  else delete HTMLElement.prototype.scrollIntoView;
});

for(const file of paths)describe('Guided-tour recap continuity: '+file,()=>{
  it('keeps all submitted clues and newer notes while reviewing a missed structure',()=>{
    const s=session(file);s.open();s.answer('skull','skull');s.answer('pelvis','skull');
    const answers={...s.data()._tourRecap.answers},evidence=JSON.parse(JSON.stringify(s.data()._retrievalEvidence)),token=s.data()._tourRecap.token;
    s.review(4);
    expect(s.data()).toMatchObject({_tourStepIdx:4,selectedStructure:'pelvis',_tourRecap:{active:false,answers,token},_tourRecapReturn:{questionIndex:3,token}});
    expect(s.html().querySelector('[data-anatomy-recap]')).toBeNull();
    expect(s.html().querySelector('[data-anatomy-tour-recap-return]').textContent).toContain('Clue 4');
    s.patch({_structureNotes:{skull:'Saved note',pelvis:'My explanation from the review'}});s.resume();
    expect(s.data()._tourRecap).toMatchObject({active:true,answers,token});
    expect(s.data()._tourRecapReturn).toBeNull();
    expect(s.data()._retrievalEvidence).toEqual(evidence);
    expect(s.data()._structureNotes.pelvis).toBe('My explanation from the review');
    expect(s.html().querySelectorAll('[data-anatomy-tour-feedback]')).toHaveLength(2);
    expect(s.html().querySelector('[data-anatomy-recap-question="pelvis"]').querySelectorAll('[disabled]')).toHaveLength(4);
    s.answer('pelvis','pelvis');expect(s.data()._retrievalEvidence).toEqual(evidence);
  });

  it('pauses Back to the tour at the most recently answered clue and resumes instead of starting over',()=>{
    const s=session(file);s.open();s.answer('vertebral','vertebral');s.back();
    expect(s.data()._tourRecap).toMatchObject({active:false,answers:{1:'vertebral'}});
    expect(s.data()._tourRecapReturn.questionIndex).toBe(1);
    const token=s.data()._tourRecap.token;s.open();
    expect(s.data()._tourRecap).toMatchObject({active:true,token,answers:{1:'vertebral'}});
    expect(s.data()._retrievalEvidence.vertebral.attempts).toBe(1);
  });

  it('preserves a paused recap when the learner changes teaching stops or leaves and reopens Tour',()=>{
    const s=session(file);s.open();s.answer('skull','pelvis');s.review(0);
    const saved=JSON.parse(JSON.stringify(s.data()._tourRecap));
    s.jump(2);expect(s.data().selectedStructure).toBe('ribs');
    expect(s.data()._tourRecap).toEqual(saved);expect(s.data()._tourRecapReturn.questionIndex).toBe(0);
    s.node(n=>n.props?.id==='anatomy-mode-tab-explore').props.onClick();
    expect(s.html().querySelector('[data-anatomy-tour-recap-return]')).toBeNull();
    s.node(n=>n.props?.id==='anatomy-mode-tab-tour').props.onClick();
    expect(s.html().querySelector('[data-anatomy-tour-recap-return]')).not.toBeNull();
    s.resume();expect(s.data()._tourRecap.answers).toEqual(saved.answers);
  });

  it('pauses a visible recap without dropping answers when Go to step is used',()=>{
    const s=session(file);s.open();s.answer('ribs','ribs');s.jump(1);
    expect(s.data()).toMatchObject({_tourStepIdx:1,selectedStructure:'vertebral',_tourRecap:{active:false,answers:{2:'ribs'}},_tourRecapReturn:{questionIndex:2}});
    s.resume();expect(s.data()._tourRecap.answers).toEqual({2:'ribs'});
  });

  it('restores an existing version-2 recap without requiring a token in old saved sessions',()=>{
    const s=session(file,{_tourRecap:{active:true,version:2,systemId:'skeletal',answers:{0:'skull',3:'skull'}}});
    s.review(4);expect(s.data()._tourRecap.token).toEqual(expect.any(String));
    const paused=JSON.parse(JSON.stringify(s.data()));
    const restored=session(file,paused);expect(restored.html().querySelector('[data-anatomy-tour-recap-resume]')).not.toBeNull();
    restored.resume();expect(restored.data()._tourRecap.answers).toEqual({0:'skull',3:'skull'});
    expect(restored.data()._retrievalEvidence).toBeUndefined();
  });

  it('binds saved return controls to the tour, recap context, attempt token, and valid clue',()=>{
    const s=session(file);s.open();s.answer('skull','pelvis');s.review(0);
    const saved=JSON.parse(JSON.stringify(s.data())),link=saved._tourRecapReturn;
    for(const patch of [
      {_tourRecapReturn:{...link,systemId:'muscular'}},
      {_tourRecapReturn:{...link,context:'outdated'}},
      {_tourRecapReturn:{...link,token:'another-attempt'}},
      {_tourRecapReturn:{...link,questionIndex:99}},
      {_tourRecapReturn:{...link,questionIndex:'0'}},
      {_tourRecapReturn:[]},
      {_tourRecap:{...saved._tourRecap,context:'outdated'}},
      {_tourRecap:{...saved._tourRecap,active:true}},
      {_tourSystem:'muscular'},
      {_tourActive:false}
    ]){
      const invalid=session(file,{...saved,...patch});
      expect(invalid.html().querySelector('[data-anatomy-tour-recap-return]')).toBeNull();
    }
  });

  it('starts a fresh attempt deliberately and rejects old answer and return handlers',()=>{
    const s=session(file);s.open();
    const oldAnswer=s.node(n=>n.props?.['data-anatomy-recap-question']==='vertebral');
    const answer=find(oldAnswer,n=>n.props?.['data-anatomy-tour-option']==='vertebral').props.onClick;
    s.answer('skull','pelvis');s.review(0);
    const oldReturn=s.node(n=>n.props?.['data-anatomy-tour-recap-resume']).props.onClick,token=s.data()._tourRecap.token;
    s.resume();s.restart();
    expect(s.data()._tourRecap.answers).toEqual({});expect(s.data()._tourRecap.token).not.toBe(token);
    expect(s.data()._tourRecapReturn).toBeNull();
    const afterRestart=JSON.parse(JSON.stringify(s.data()));oldReturn();answer();
    expect(s.data()).toEqual(afterRestart);expect(s.data()._retrievalEvidence).toEqual({skull:{attempts:1,correct:0}});
  });

  it('clears paused return state when another tour is selected or the same tour restarts',()=>{
    for(const systemId of ['muscular','skeletal']){
      const s=session(file);s.open();s.answer('skull','pelvis');s.review(0);
      const stale=s.node(n=>n.props?.['data-anatomy-tour-recap-resume']).props.onClick;
      s.choose(systemId);const changed=JSON.parse(JSON.stringify(s.data()));stale();
      expect(s.data()).toEqual(changed);
      expect(s.data()).toMatchObject({_tourSystem:systemId,_tourStepIdx:0,_tourRecap:null,_tourRecapReturn:null});
      expect(s.html().querySelector('[data-anatomy-tour-recap-return]')).toBeNull();
      expect(s.data()._retrievalEvidence.skull.attempts).toBe(1);
    }
  });

  it('does not accept late answers or reviews after leaving the mode',()=>{
    const s=session(file);s.open();s.answer('skull','pelvis');
    const review=s.node(n=>n.props?.['data-anatomy-tour-review']===0).props.onClick;
    const question=s.node(n=>n.props?.['data-anatomy-recap-question']==='vertebral');
    const answer=find(question,n=>n.props?.['data-anatomy-tour-option']==='vertebral').props.onClick;
    s.patch({_activeTab:'explore'});const before=JSON.parse(JSON.stringify(s.data()));answer();review();
    expect(s.data()).toEqual(before);
  });

  it('keeps an endocrine recap attached to its tour when reviewing a structure in the organs collection',()=>{
    const s=session(file,{system:'organs',_tourSystem:'endocrine',_tourStepIdx:1,selectedStructure:'thyroid',_tourRecap:{active:true,version:2,systemId:'endocrine',answers:{}}});
    const question=s.node(n=>n.props?.['data-anatomy-recap-question']==='thyroid');
    const wrong=find(question,n=>n.props?.['data-anatomy-tour-option']&&n.props['data-anatomy-tour-option']!=='thyroid');
    wrong.props.onClick();s.review(1);
    expect(s.data()).toMatchObject({system:'organs',_tourSystem:'endocrine',selectedStructure:'thyroid',_tourRecapReturn:{systemId:'endocrine'}});
    const answers={...s.data()._tourRecap.answers};s.resume();expect(s.data()._tourRecap.answers).toEqual(answers);
    expect(s.html().querySelector('[data-anatomy-recap-question="thyroid"] [data-anatomy-tour-feedback]')).not.toBeNull();
  });

  it('focuses the recap heading, submitted feedback, reviewed step, and exact returned clue',()=>{
    const s=session(file);s.mount();s.open();s.mount();vi.advanceTimersByTime(0);
    expect(document.activeElement.getAttribute('data-anatomy-recap-heading')).toBe('tour');
    s.answer('pelvis','skull');s.mount();vi.advanceTimersByTime(0);
    expect(document.activeElement.getAttribute('data-anatomy-tour-feedback')).toBe('incorrect');
    expect(document.activeElement.closest('[data-anatomy-recap-question]').getAttribute('data-anatomy-recap-question')).toBe('pelvis');
    s.review(4);s.mount();vi.advanceTimersByTime(0);
    expect(document.activeElement.getAttribute('data-anatomy-tour-step')).toBe('4');
    s.resume();s.mount();vi.advanceTimersByTime(0);
    expect(document.activeElement.closest('[data-anatomy-recap-question]').getAttribute('data-anatomy-recap-question')).toBe('pelvis');
    s.back();s.mount();vi.advanceTimersByTime(0);
    expect(document.activeElement.getAttribute('data-anatomy-tour-step')).toBe('4');
  });

  it('does not move focus into another tour when an earlier deferred focus callback finishes',()=>{
    const outside=document.createElement('button');outside.textContent='Outside control';document.body.appendChild(outside);
    const s=session(file);s.mount();outside.focus();s.open();s.choose('muscular');s.mount();
    vi.advanceTimersByTime(0);
    expect(document.activeElement.getAttribute('data-anatomy-tour-step')).toBe('0');
    expect(document.activeElement.closest('[data-anatomy-tour-panel]').getAttribute('data-anatomy-tour-system')).toBe('muscular');
  });
});
