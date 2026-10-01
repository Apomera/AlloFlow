import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const paths=['stem_lab/stem_tool_anatomy.js','desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
function find(node,predicate){if(!node||typeof node!=='object')return null;if(Array.isArray(node)){for(const child of node){const result=find(child,predicate);if(result)return result;}return null;}return predicate(node)?node:find(node.props?.children,predicate);}
function text(node){return node==null||typeof node==='boolean'?'':typeof node!=='object'?String(node):Array.isArray(node)?node.map(text).join(' '):text(node.props?.children);}
function session(file,extra={},grade='9'){
  resetStemLab();const tool=loadTool(file,'anatomy');let data={anatomy:{system:'skeletal',view:'anterior',complexity:3,_activeTab:'quiz',...extra}};
  const render=()=>tool.render(makeCtx({toolData:data,gradeLevel:grade,setToolData:updater=>{data=typeof updater==='function'?updater(data):updater;}}));
  const node=predicate=>{const result=find(render(),predicate);expect(result).not.toBeNull();return result;};
  return {data:()=>data.anatomy,node,
    html(){const root=document.createElement('div');root.innerHTML=renderTool('anatomy',data,{gradeLevel:grade});return root;},
    patch(patch){data={anatomy:{...data.anatomy,...patch}};},
    answer(id){node(n=>n.props?.['data-anatomy-quiz-option']===id).props.onClick();},
    click(label){node(n=>n.type==='button'&&(n.props['aria-label']===label||text(n).trim()===label)).props.onClick();},
    change(id,value){node(n=>n.props?.id===id).props.onChange({target:{value}});}
  };
}
beforeEach(resetStemLab);
for(const file of paths)describe('Anatomy science enhancements: '+file,()=>{
  for(const [quizIdx,name,valid,excluded] of [[18,'Thyroid','endocrine',[]],[90,'Thyroid','endocrine',[]],[14,'Pancreas','digestive',['endocrine']],[34,'Bladder','urinary',[]],[10,'Liver','digestive',[]]]){
    it(`grades ${name} using its scientific system, question ${quizIdx}`,()=>{
      const s=session(file,{system:'organs',quizIdx});const root=s.html();
      expect(root.querySelector('[data-anatomy-quiz-panel]').textContent.toLowerCase()).toContain(name.toLowerCase());
      const options=[...root.querySelectorAll('[data-anatomy-quiz-option]')].map(n=>n.dataset.anatomyQuizOption);
      expect(options).toContain(valid);expect(options).not.toContain('organs');for(const id of excluded)expect(options).not.toContain(id);
      s.answer(valid);expect(s.data().quizFeedback.correct).toBe(true);expect(s.data().quizScore).toBe(1);
      expect(s.html().querySelector('[data-anatomy-quiz-panel]').textContent).toContain('An organ can contribute to more than one system.');
      const restored=session(file,JSON.parse(JSON.stringify(s.data())));expect(restored.html().querySelectorAll('[data-anatomy-quiz-option]:disabled')).toHaveLength(4);
      expect(restored.data().quizScore).toBe(1);
    });
  }
  it('does not use the shared digestive role of the pharynx as an incorrect distractor',()=>{
    const s=session(file,{system:'respiratory',quizIdx:58});const root=s.html();
    expect(root.querySelector('[data-anatomy-quiz-panel]').textContent).toContain('Pharynx');
    expect(root.querySelector('[data-anatomy-quiz-option="digestive"]')).toBeNull();
    s.answer('respiratory');expect(s.data().quizFeedback.correct).toBe(true);
  });
  it('offers both posterior organ structures in system-identification questions',()=>{
    const seen=[];
    for(const index of [2,6]){const s=session(file,{system:'organs',view:'posterior',quizIdx:index});const options=[...s.html().querySelectorAll('[data-anatomy-quiz-option]')].map(n=>n.dataset.anatomyQuizOption);const answer=index===2?'urinary':'endocrine';expect(options).toContain(answer);s.answer(answer);expect(s.data().quizFeedback.correct).toBe(true);seen.push(s.data()._quizQuestion.poolIds[(index+Math.floor(index/4))%2]);}
    expect(new Set(seen).size).toBe(2);
  });
  it('discards legacy system feedback so incorrect organ-group grading does not remain locked',()=>{
    const s=session(file,{system:'organs',quizIdx:18,quizFeedback:{chosen:'organs',correct:true},_quizQuestion:{context:'organs|anterior|3|g912',index:18,poolIds:[]}});
    expect(s.html().querySelectorAll('[data-anatomy-quiz-option]:disabled')).toHaveLength(0);s.answer('endocrine');expect(s.data().quizFeedback.correct).toBe(true);
  });
  it('records one scored answer separately from confidence and preserves it across self-ratings',()=>{
    const s=session(file);const submit=s.node(n=>n.props?.['data-anatomy-quiz-option']==='skull').props.onClick;
    submit();submit();expect(s.data()._retrievalEvidence.skull).toEqual({attempts:1,correct:1});
    s.patch({_activeTab:'explore',quizMode:false,selectedStructure:'skull'});s.click('OK Got it');
    expect(s.data()._retrievalEvidence.skull).toEqual({attempts:1,correct:1});expect(s.data()._structureConfidence.skull).toBe('mastered');
    expect(s.html().querySelector('[data-anatomy-recall-evidence="skull"]').textContent).toContain('1 correct out of 1');
  });
  it('sanitizes malformed recall counts without inventing success evidence',()=>{
    const s=session(file,{_retrievalEvidence:{skull:{attempts:'99',correct:Infinity},forged:{attempts:10,correct:10}}});s.answer('skull');
    expect(s.data()._retrievalEvidence).toEqual({skull:{attempts:1,correct:1}});
  });
  it('makes an explicit K–5 choice control text and clinical feedback despite a grade 9 profile',()=>{
    const s=session(file,{_activeTab:'explore',selectedStructure:'skull',complexity:1});
    expect(s.html().querySelector('[data-anatomy-structure-detail]').textContent).toContain('Most meet at strong seams called sutures');
    s.patch({_activeTab:'quiz',quizMode:true,quizIdx:0});s.answer('skull');
    expect(s.html().querySelector('[data-anatomy-quiz-panel]').textContent).not.toContain('epidural');
    s.change('anatomy-study-level','3');s.patch({_activeTab:'explore',quizMode:false,selectedStructure:'skull'});
    expect(s.html().querySelector('[data-anatomy-structure-detail]').textContent).toContain('8 cranial bones');
  });
  for(const grade of ['K','Kindergarten','Pre-K'])it(`defaults ${grade} to the youngest learning level`,()=>{
    const s=session(file,{complexity:undefined,_activeTab:'explore',selectedStructure:'skull'},grade);
    expect(s.html().querySelector('#anatomy-study-level').value).toBe('1');expect(s.html().querySelector('[data-anatomy-structure-detail]').textContent).toContain('like a helmet');
  });
  it('links the fibula correction and displays real organ membership on the relationship card',()=>{
    const s=session(file,{_activeTab:'explore',selectedStructure:'fibula'});const sources=s.html().querySelector('[data-anatomy-science-sources="fibula"]');
    expect(sources.querySelector('a[href*="6705357"]')).not.toBeNull();expect(s.html().querySelector('[data-anatomy-structure-detail]').textContent).toContain('smaller share of load');
    s.patch({system:'organs',selectedStructure:'thyroid'});expect(s.html().querySelector('.anatomy-relation-node[data-kind="system"]').textContent).toContain('Endocrine');
  });
  it('places recall before round settings and changes modes through the native activity control',()=>{
    const s=session(file,{_activeTab:'flashcards'});const root=s.html();
    const card=root.querySelector('[data-anatomy-recall-card]'),settings=root.querySelector('.anatomy-flashcard-deck-controls');
    expect(card.compareDocumentPosition(settings)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    s.change('anatomy-mobile-activity','homeoHunt');expect(s.data()._activeTab).toBe('homeoHunt');expect(s.html().querySelector('[data-anatomy-feedback-experiment]')).not.toBeNull();
  });
  for(const direction of ['warm','cool'])it(`compares bounded ${direction} feedback only after a prediction, and resets on disturbance change`,()=>{
    const s=session(file,{_activeTab:'homeoHunt',_feedbackExperiment:{direction}});
    expect(s.html().querySelector('[data-anatomy-run-feedback]').disabled).toBe(true);expect(s.html().querySelector('[data-anatomy-feedback-results]')).toBeNull();
    s.node(n=>n.type==='input'&&n.props.name==='anatomy-feedback-prediction'&&n.props.value==='active').props.onChange();
    s.node(n=>n.props?.['data-anatomy-run-feedback']==='true').props.onClick();const root=s.html();
    const finalActive=Number(root.querySelector('[data-anatomy-feedback-active="40"]').textContent),finalOff=Number(root.querySelector('[data-anatomy-feedback-disabled="40"]').textContent);
    expect(Math.abs(finalActive-37)).toBeLessThan(.01);expect(Math.abs(finalOff-37)).toBeCloseTo(.32,3);
    expect(root.querySelector('[data-anatomy-feedback-results] svg').getAttribute('aria-describedby')).toBeTruthy();
    s.change('anatomy-feedback-explanation','The difference from the target gets smaller.');
    expect(session(file,s.data()).html().querySelector('#anatomy-feedback-explanation').value).toContain('difference');
    s.change('anatomy-feedback-disturbance',direction==='warm'?'cool':'warm');expect(s.html().querySelector('[data-anatomy-feedback-results]')).toBeNull();expect(s.data()._feedbackExperiment.prediction).toBe('');
  });
});
it('ships identical canonical and desktop anatomy sources',()=>expect(fs.readFileSync(paths[0],'utf8')).toBe(fs.readFileSync(paths[1],'utf8')));
