import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {loadTool,makeCtx,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const files=['stem_lab/stem_tool_anatomy.js','desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const clone=value=>JSON.parse(JSON.stringify(value));
function find(node,predicate){if(!node||typeof node!=='object')return null;if(Array.isArray(node)){for(const child of node){const hit=find(child,predicate);if(hit)return hit;}return null;}return predicate(node)?node:find(node.props?.children,predicate);}
function session(file,extra={}){
  resetStemLab();const tool=loadTool(file,'anatomy');let data={anatomy:{system:'organs',view:'anterior',complexity:3,_activeTab:'homeoHunt',_structureNotes:{heart:'Saved structure note'},...extra}},host,deferred=false,queue=[];
  const announce=vi.fn(),toast=vi.fn(),apply=update=>{data=typeof update==='function'?update(data):update;};
  const render=()=>tool.render(makeCtx({toolData:data,gradeLevel:'9',announceToSR:announce,addToast:toast,setToolData:update=>{if(deferred)queue.push(update);else apply(update);}}));
  const node=predicate=>{const hit=find(render(),predicate);expect(hit).not.toBeNull();return hit;};
  const click=hook=>node(n=>n.props?.[hook]).props.onClick();
  const change=(id,value)=>node(n=>n.props?.id===id).props.onChange({target:{value}});
  const answerHandler=(id,option)=>{const field=node(n=>n.props?.['data-anatomy-homeo-recap-question']===id),button=find(field,n=>n.props?.['data-anatomy-homeo-recap-option']===option);expect(button).not.toBeNull();return button.props.onClick;};
  return {data:()=>data.anatomy,node,click,change,announce,toast,answerHandler,
    patch:patch=>{data={anatomy:{...data.anatomy,...patch}};},
    html:()=>{const root=document.createElement('div');root.innerHTML=renderTool('anatomy',data,{gradeLevel:'9'});return root;},
    mount:()=>{if(!host){host=document.createElement('div');document.body.appendChild(host);}host.innerHTML=renderTool('anatomy',data,{gradeLevel:'9'});return host;},
    understand:checked=>node(n=>n.props?.['data-anatomy-homeo-understood']).props.onChange({target:{checked}}),
    answer:(id,option)=>answerHandler(id,option)(),
    log:()=>click('data-anatomy-homeo-log'),reset:()=>click('data-anatomy-homeo-reset-measurements'),clear:()=>click('data-anatomy-homeo-clear-observations'),restart:()=>click('data-anatomy-homeo-restart-checks'),
    predict:value=>node(n=>n.type==='input'&&n.props?.name==='anatomy-feedback-prediction'&&n.props.value===value).props.onChange(),
    run:()=>click('data-anatomy-run-feedback'),
    defer:()=>{deferred=true;},flush:()=>{deferred=false;const updates=queue;queue=[];updates.forEach(apply);}
  };
}

let scrollDescriptor,audioDescriptor,sound;
beforeEach(()=>{
  resetStemLab();vi.useFakeTimers();document.body.innerHTML='';sound=vi.fn();
  scrollDescriptor=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'scrollIntoView');Object.defineProperty(HTMLElement.prototype,'scrollIntoView',{configurable:true,value:vi.fn()});
  audioDescriptor=Object.getOwnPropertyDescriptor(window,'AudioContext');Object.defineProperty(window,'AudioContext',{configurable:true,value:function(){this.currentTime=0;this.destination={};this.createOscillator=()=>({frequency:{value:0},connect:()=>{},start:sound,stop:()=>{}});this.createGain=()=>({gain:{setValueAtTime:()=>{},exponentialRampToValueAtTime:()=>{}},connect:()=>{}});}});
});
afterEach(()=>{
  vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();document.body.innerHTML='';
  if(scrollDescriptor)Object.defineProperty(HTMLElement.prototype,'scrollIntoView',scrollDescriptor);else delete HTMLElement.prototype.scrollIntoView;
  if(audioDescriptor)Object.defineProperty(window,'AudioContext',audioDescriptor);else delete window.AudioContext;
});

for(const file of files)describe('Homeostasis saved work and check flow: '+file,()=>{
  it('keeps both named activities and stable slider names while providing explicit range status',()=>{
    const s=session(file),root=s.html();expect(root.querySelector('[data-anatomy-homeo-panel]')).not.toBeNull();expect(root.querySelector('[data-anatomy-feedback-experiment]')).not.toBeNull();expect(root.querySelector('[data-anatomy-homeo-ranges]')).not.toBeNull();
    for(const [id,name]of [['tempC','Body temp (°C)'],['pH','Blood pH'],['glucose','Fasting glucose (mg/dL)']]){
      expect(root.querySelector('#hh-'+id).getAttribute('aria-valuetext').startsWith(name+': ')).toBe(true);expect(root.querySelector('[data-anatomy-homeo-range-status="'+id+'"]').dataset.state).toBe('within');
    }
    s.change('hh-tempC','39');s.change('hh-pH','7.25');s.change('hh-glucose','130');const changed=s.html();
    expect(changed.querySelector('[data-anatomy-homeo-range-status="tempC"]').dataset.state).toBe('above');expect(changed.querySelector('[data-anatomy-homeo-range-status="pH"]').dataset.state).toBe('below');expect(changed.querySelector('[data-anatomy-homeo-range-status="glucose"]').dataset.state).toBe('above');expect(changed.textContent).toContain('3 variables outside reference');
  });

  it('uses inclusive teaching range boundaries without comparing units',()=>{
    for(const values of [{tempC:36.5,pH:7.35,glucose:70},{tempC:37.5,pH:7.45,glucose:99}]){
      const root=session(file,{homeoHunt:values}).html();expect(root.querySelectorAll('[data-anatomy-homeo-range-status][data-state="within"]')).toHaveLength(3);expect(root.textContent).toContain('Teaching range: 36.5–37.5 °C');expect(root.textContent).toContain('Teaching range: 70–99 mg/dL');
    }
  });

  it('merges independent older input callbacks into fresh state without losing newer writing',()=>{
    const s=session(file,{homeoHunt:{hypothesis:'My first hypothesis',explanation:'My original explanation',understood:true,recap:{temp:'above'}},_feedbackExperiment:{explanation:'Saved feedback explanation'}});
    const temperature=s.node(n=>n.props?.id==='hh-tempC').props.onChange,pH=s.node(n=>n.props?.id==='hh-pH').props.onChange;
    s.change('anatomy-homeo-hypothesis','My new hypothesis');temperature({target:{value:'39'}});pH({target:{value:'7.25'}});
    expect(s.data().homeoHunt).toMatchObject({tempC:39,pH:7.25,hypothesis:'My new hypothesis',explanation:'My original explanation',recap:{temp:'above'}});expect(s.data()._feedbackExperiment.explanation).toBe('Saved feedback explanation');
    const oldWriting=s.node(n=>n.props?.id==='anatomy-homeo-explanation').props.onChange;s.change('anatomy-homeo-explanation','My newer explanation');oldWriting({target:{value:'Late obsolete writing'}});expect(s.data().homeoHunt.explanation).toBe('My newer explanation');
  });

  it('resets only measurements and clears only observations, preserving all written work and checks',()=>{
    const record={version:2,answers:{temp:'above',ph:'acid',feedback:'restore'}},log=[{t:39,p:7.4,g:90,st:1}];
    const s=session(file,{homeoHunt:{tempC:39,pH:7.25,glucose:130,hypothesis:'Saved hypothesis',explanation:'Saved limit explanation',understood:true,stuckRevealed:true,recap:{temp:'above'},lastRecap:record,log},_feedbackExperiment:{direction:'cool',prediction:'active',revealed:true,explanation:'Saved mechanism'}});
    s.reset();expect(s.data().homeoHunt).toMatchObject({tempC:37,pH:7.4,glucose:90,hypothesis:'Saved hypothesis',explanation:'Saved limit explanation',understood:true,stuckRevealed:true,recap:{temp:'above'},lastRecap:record,log});expect(s.data()._feedbackExperiment.explanation).toBe('Saved mechanism');
    const before=clone(s.data().homeoHunt);s.clear();expect(s.data().homeoHunt).toEqual({...before,log:[]});expect(s.html().querySelector('[data-anatomy-homeo-recap]')).not.toBeNull();
  });

  it('retains unlocked checks after observation clearing and unchecking the writing disclosure',()=>{
    const s=session(file);s.log();s.log();s.log();const token=s.data().homeoHunt.recapToken;expect(token).toEqual(expect.any(String));s.clear();expect(s.html().querySelector('[data-anatomy-homeo-recap]')).not.toBeNull();
    s.understand(true);s.change('anatomy-homeo-explanation','This is a teaching range.');s.answer('temp','above');s.understand(false);
    expect(s.data().homeoHunt).toMatchObject({explanation:'This is a teaching range.',recap:{temp:'above'},recapToken:token});expect(s.html().querySelector('[data-anatomy-homeo-recap]')).not.toBeNull();
  });

  it('filters malformed observation cells and derives safe count text from valid readings',()=>{
    const s=session(file,{homeoHunt:{tempC:999,pH:'bad',glucose:false,log:[null,{},[],{t:{value:37},p:7.4,g:90},{t:37,p:NaN,g:90},{t:90,p:7.4,g:90},{t:37,p:7.4,g:90,st:{forged:true}}]}}),root=s.html();
    expect(root.querySelector('#hh-tempC').value).toBe('43');expect(root.querySelector('#hh-pH').value).toBe('7.4');expect(root.querySelector('#hh-glucose').value).toBe('90');
    expect(root.querySelector('.anatomy-homeo-observations tbody').rows).toHaveLength(1);expect(root.querySelector('.anatomy-homeo-observations tbody').textContent).toContain('0 of 3');expect(root.textContent).not.toContain('[object Object]');
    s.reset();expect(s.data().homeoHunt.log).toEqual([{t:37,p:7.4,g:90,st:0}]);
  });

  it('bounds observations to eight and rejects stale logging of different measurements',()=>{
    const s=session(file);for(let index=0;index<12;index++)s.log();expect(s.data().homeoHunt.log).toHaveLength(8);expect(s.html().querySelector('.anatomy-homeo-observations caption').textContent).toBe('Observations: 8 of 8 saved');
    const oldLog=s.node(n=>n.props?.['data-anatomy-homeo-log']).props.onClick;s.change('hh-tempC','39');const before=clone(s.data());s.announce.mockClear();oldLog();expect(s.data()).toEqual(before);expect(s.announce).not.toHaveBeenCalled();
  });

  it('validates restored choices and scores exactly three authored answers independently of confidence',()=>{
    const confidence={heart:'practice'},evidence={heart:{attempts:2,correct:1}},s=session(file,{homeoHunt:{understood:true,recap:{temp:'forged',ph:['acid'],feedback:{answer:'restore'},extra:'above'},lastRecap:{version:2,answers:{temp:'above',ph:'acid',feedback:'forged'}}},_structureConfidence:confidence,_retrievalEvidence:evidence});
    expect(s.html().querySelectorAll('[data-anatomy-homeo-recap-question]')).toHaveLength(3);expect(s.html().querySelectorAll('[data-anatomy-homeo-recap-option]:disabled')).toHaveLength(0);expect(s.html().querySelector('[data-anatomy-homeo-latest-score]')).toBeNull();
    s.answer('temp','within');s.answer('ph','acid');s.answer('feedback','restore');expect(s.data().homeoHunt.recap).toEqual({temp:'within',ph:'acid',feedback:'restore'});expect(s.data().homeoHunt.lastRecap).toEqual({version:2,answers:{temp:'within',ph:'acid',feedback:'restore'}});
    expect(s.html().querySelector('[data-anatomy-homeo-recap-state="done"]').textContent).toContain('2 / 3 right.');expect(s.data()._structureConfidence).toEqual(confidence);expect(s.data()._retrievalEvidence).toEqual(evidence);
  });

  it('accepts each concept once across stale handlers and keeps fresh notes on completion',()=>{
    const s=session(file,{homeoHunt:{understood:true,hypothesis:'Original'}}),first=s.answerHandler('temp','within');first();vi.advanceTimersByTime(300);s.announce.mockClear();sound.mockClear();first();s.answer('temp','above');vi.advanceTimersByTime(300);expect(s.data().homeoHunt.recap).toEqual({temp:'within'});expect(s.announce).not.toHaveBeenCalled();expect(sound).not.toHaveBeenCalled();
    s.answer('ph','acid');const finish=s.answerHandler('feedback','restore');s.change('anatomy-homeo-hypothesis','Latest writing before completion');s.patch({_structureNotes:{heart:'New structure note'}});finish();
    expect(s.data().homeoHunt.hypothesis).toBe('Latest writing before completion');expect(s.data()._structureNotes.heart).toBe('New structure note');expect(s.data().homeoHunt.lastRecap.answers).toEqual({temp:'within',ph:'acid',feedback:'restore'});
  });

  it('restarts only check answers, preserves the last complete score and rejects old answer callbacks',()=>{
    const s=session(file);s.understand(true);s.change('anatomy-homeo-hypothesis','Saved hypothesis');s.change('anatomy-homeo-explanation','Saved explanation');s.log();s.answer('temp','above');s.answer('ph','acid');s.answer('feedback','amplify');
    const oldAnswer=s.answerHandler('temp','within'),before=clone(s.data().homeoHunt);s.restart();
    expect(s.data().homeoHunt).toMatchObject({recap:{},lastRecap:before.lastRecap,hypothesis:before.hypothesis,explanation:before.explanation,log:before.log});expect(s.data().homeoHunt.recapToken).not.toBe(before.recapToken);
    expect(s.html().querySelector('[data-anatomy-homeo-latest-score]').textContent).toContain('2/3 correct');const restarted=clone(s.data());oldAnswer();expect(s.data()).toEqual(restarted);s.answer('temp','above');expect(s.data().homeoHunt.recap).toEqual({temp:'above'});
  });

  it('recovers valid legacy completed answers without inventing a new evidence record',()=>{
    const s=session(file,{homeoHunt:{understood:true,recap:{temp:'above',ph:'acid',feedback:'restore'},hypothesis:'Legacy writing'}});
    expect(s.html().querySelector('[data-anatomy-homeo-recap-state="done"]').textContent).toContain('3 / 3 right.');s.reset();expect(s.data().homeoHunt.recap).toEqual({temp:'above',ph:'acid',feedback:'restore'});expect(s.data().homeoHunt.lastRecap).toBeNull();expect(s.data()._retrievalEvidence).toBeUndefined();
    s.restart();expect(s.data().homeoHunt.recapToken).toEqual(expect.any(String));expect(s.data().homeoHunt.hypothesis).toBe('Legacy writing');expect(s.data().homeoHunt.lastRecap).toEqual({version:2,answers:{temp:'above',ph:'acid',feedback:'restore'}});
  });

  it('rejects late sliders, writing, logging, reset, restart and answers after leaving the mode',()=>{
    const s=session(file,{homeoHunt:{understood:true,log:[{t:37,p:7.4,g:90,st:0}]}}),answer=s.answerHandler('temp','above');
    const temperature=s.node(n=>n.props?.id==='hh-tempC').props.onChange,hypothesis=s.node(n=>n.props?.id==='anatomy-homeo-hypothesis').props.onChange;
    const log=s.node(n=>n.props?.['data-anatomy-homeo-log']).props.onClick,reset=s.node(n=>n.props?.['data-anatomy-homeo-reset-measurements']).props.onClick,clear=s.node(n=>n.props?.['data-anatomy-homeo-clear-observations']).props.onClick,restart=s.node(n=>n.props?.['data-anatomy-homeo-restart-checks']).props.onClick;
    s.patch({_activeTab:'explore'});s.mount();const outside=document.createElement('button');document.body.appendChild(outside);outside.focus();const before=clone(s.data());s.announce.mockClear();sound.mockClear();
    temperature({target:{value:'39'}});hypothesis({target:{value:'Late writing'}});log();reset();clear();restart();answer();vi.advanceTimersByTime(300);
    expect(s.data()).toEqual(before);expect(s.announce).not.toHaveBeenCalled();expect(sound).not.toHaveBeenCalled();expect(document.activeElement).toBe(outside);
  });

  for(const direction of ['warm','cool'])it('saves '+direction+' prediction and writing separately while switching disturbance contexts',()=>{
    const other=direction==='warm'?'cool':'warm',s=session(file,{_feedbackExperiment:{direction}});s.predict('active');s.run();s.change('anatomy-feedback-explanation',direction+' explanation');
    const oldRun=s.node(n=>n.props?.['data-anatomy-run-feedback']).props.onClick,oldNote=s.node(n=>n.props?.id==='anatomy-feedback-explanation').props.onChange;
    s.change('anatomy-feedback-disturbance',other);expect(s.data()._feedbackExperiment).toMatchObject({direction:other,prediction:'',revealed:false,explanation:'',sessions:{[direction]:{prediction:'active',revealed:true,explanation:direction+' explanation'}}});
    s.predict('disabled');s.run();s.change('anatomy-feedback-explanation',other+' explanation');const current=clone(s.data());oldRun();oldNote({target:{value:'Stale explanation'}});expect(s.data()).toEqual(current);
    s.change('anatomy-feedback-disturbance',direction);expect(s.data()._feedbackExperiment).toMatchObject({direction,prediction:'active',revealed:true,explanation:direction+' explanation'});expect(s.html().querySelector('#anatomy-feedback-explanation').value).toBe(direction+' explanation');
    const restored=session(file,clone(s.data()));restored.change('anatomy-feedback-disturbance',other);expect(restored.data()._feedbackExperiment.explanation).toBe(other+' explanation');expect(Object.keys(restored.data()._feedbackExperiment.sessions).sort()).toEqual(['cool','warm']);
  });

  it('keeps newer experiment writing and both range fields when older independent callbacks fire',()=>{
    const s=session(file,{_feedbackExperiment:{direction:'warm',prediction:'active',revealed:true,explanation:'Original'},homeoHunt:{hypothesis:'Range writing'}});
    const retry=s.node(n=>n.props?.['data-anatomy-run-feedback']).props.onClick,oldNote=s.node(n=>n.props?.id==='anatomy-feedback-explanation').props.onChange;
    s.change('anatomy-feedback-explanation','My newer mechanism');s.change('anatomy-homeo-hypothesis','My newer range hypothesis');oldNote({target:{value:'Late obsolete mechanism'}});retry();
    expect(s.data()._feedbackExperiment).toMatchObject({prediction:'',revealed:false,explanation:'My newer mechanism'});expect(s.data().homeoHunt.hypothesis).toBe('My newer range hypothesis');
    s.predict('active');s.run();expect(s.html().querySelector('#anatomy-feedback-explanation').value).toBe('My newer mechanism');
  });

  it('focuses each restored revealed comparison and its saved explanation with the current attempt token',()=>{
    const s=session(file);s.predict('active');s.run();s.change('anatomy-feedback-explanation','Saved warming explanation');
    s.change('anatomy-feedback-disturbance','cool');s.predict('disabled');s.run();s.change('anatomy-feedback-explanation','Saved cooling explanation');
    for(const [direction,explanation]of [['warm','Saved warming explanation'],['cool','Saved cooling explanation']]){
      const previousToken=s.data()._feedbackExperiment.token;s.change('anatomy-feedback-disturbance',direction);const current=s.data()._feedbackExperiment;
      expect(current.token).not.toBe(previousToken);expect(current).toMatchObject({direction,revealed:true,explanation});
      s.mount();vi.advanceTimersByTime(0);
      expect(document.activeElement.dataset.anatomyFeedbackResults).toBe(direction);
      expect(document.activeElement.closest('[data-anatomy-feedback-experiment]').dataset.anatomyFeedbackToken).toBe(current.token);
      expect(document.activeElement.querySelector('#anatomy-feedback-explanation').value).toBe(explanation);
      expect(s.html().querySelectorAll('[name="anatomy-feedback-prediction"]:disabled')).toHaveLength(3);
    }
  });

  it('rejects old warming callbacks when the same disturbance is revisited with a fresh token',()=>{
    const s=session(file);s.predict('active');const oldCompare=s.node(n=>n.props?.['data-anatomy-run-feedback']).props.onClick;s.run();s.change('anatomy-feedback-disturbance','cool');s.change('anatomy-feedback-disturbance','warm');
    const before=clone(s.data());s.announce.mockClear();sound.mockClear();oldCompare();vi.advanceTimersByTime(300);expect(s.data()).toEqual(before);expect(s.announce).not.toHaveBeenCalled();expect(sound).not.toHaveBeenCalled();
    const oldRetry=s.node(n=>n.props?.['data-anatomy-run-feedback']).props.onClick;s.run();const retried=clone(s.data());oldRetry();expect(s.data()).toEqual(retried);
  });

  it('rejects stale experiment controls after leaving and ignores malformed saved sessions',()=>{
    const s=session(file,{_feedbackExperiment:{direction:'cool',prediction:'active',revealed:true,explanation:'Current',sessions:{warm:{prediction:'forged',revealed:true,explanation:{}},forged:{prediction:'active',revealed:true,explanation:'Unknown'}}}}),run=s.node(n=>n.props?.['data-anatomy-run-feedback']).props.onClick,note=s.node(n=>n.props?.id==='anatomy-feedback-explanation').props.onChange,change=s.node(n=>n.props?.id==='anatomy-feedback-disturbance').props.onChange;
    s.change('anatomy-feedback-disturbance','warm');expect(s.data()._feedbackExperiment).toMatchObject({prediction:'',revealed:false,explanation:''});expect(s.data()._feedbackExperiment.sessions.forged).toBeUndefined();
    s.patch({_activeTab:'explore'});const before=clone(s.data());s.announce.mockClear();run();note({target:{value:'Late'}});change({target:{value:'cool'}});vi.advanceTimersByTime(300);expect(s.data()).toEqual(before);expect(s.announce).not.toHaveBeenCalled();
  });

  it('focuses each navigation heading, submitted feedback, restarted checks and experiment reveal/retry',()=>{
    const s=session(file);s.mount();s.node(n=>n.props?.['data-anatomy-homeo-jump']==='ranges').props.onClick();vi.advanceTimersByTime(0);expect(document.activeElement.id).toBe('anatomy-homeo-range-title');
    s.understand(true);s.answer('ph','alk');s.mount();vi.advanceTimersByTime(0);expect(document.activeElement.dataset.anatomyHomeoFeedback).toBe('incorrect');expect(document.activeElement.closest('[data-anatomy-homeo-recap-question]').dataset.anatomyHomeoRecapQuestion).toBe('ph');
    s.restart();s.mount();vi.advanceTimersByTime(0);expect(document.activeElement.id).toBe('anatomy-homeo-check-title');
    s.node(n=>n.props?.['data-anatomy-homeo-jump']==='experiment').props.onClick();vi.advanceTimersByTime(0);expect(document.activeElement.id).toBe('anatomy-feedback-title');
    s.predict('active');s.run();s.mount();vi.advanceTimersByTime(0);expect(document.activeElement.dataset.anatomyFeedbackResults).toBe('warm');s.run();s.mount();vi.advanceTimersByTime(0);expect(document.activeElement.dataset.anatomyFeedbackPrediction).toBe('true');
  });

  it('runs effects only after a deferred answer update is accepted and blocks rejected updates',()=>{
    const s=session(file,{homeoHunt:{understood:true}});s.mount();s.defer();s.answer('temp','above');expect(s.announce).not.toHaveBeenCalled();expect(sound).not.toHaveBeenCalled();s.flush();s.mount();vi.advanceTimersByTime(1);expect(s.announce).toHaveBeenCalledTimes(1);expect(sound).toHaveBeenCalled();expect(document.activeElement.dataset.anatomyHomeoFeedback).toBe('correct');vi.advanceTimersByTime(300);
    const rejected=session(file,{homeoHunt:{understood:true}});rejected.defer();rejected.answer('temp','above');rejected.patch({_activeTab:'explore'});sound.mockClear();rejected.flush();vi.advanceTimersByTime(300);expect(rejected.data().homeoHunt.recap).toBeUndefined();expect(rejected.announce).not.toHaveBeenCalled();expect(sound).not.toHaveBeenCalled();
  });

  it('keeps deferred feedback focus out of another disturbance and a restarted check attempt',()=>{
    const s=session(file);s.predict('active');s.run();s.change('anatomy-feedback-disturbance','cool');s.mount();vi.advanceTimersByTime(0);expect(document.activeElement.dataset.anatomyFeedbackPrediction).toBe('true');expect(document.activeElement.closest('[data-anatomy-feedback-experiment]').dataset.anatomyFeedbackDirection).toBe('cool');
    s.understand(true);s.answer('temp','within');s.restart();s.mount();vi.advanceTimersByTime(0);expect(document.activeElement.id).toBe('anatomy-homeo-check-title');
  });
});
