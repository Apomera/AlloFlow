import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {loadTool,makeCtx,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
function find(node,p){if(!node||typeof node!=='object')return null;if(Array.isArray(node)){for(const c of node){const hit=find(c,p);if(hit)return hit;}return null;}return p(node)?node:find(node.props?.children,p);}
const now=1800000000000;
const round={_spotterActive:true,_spotterTarget:'skull',_spotterOpts:['skull','mandible','clavicle','ribs'].map(id=>({id})),_spotterStartTime:now-2000,_spotterSerial:1};
function session(file,extra={}){
  resetStemLab();const tool=loadTool(file,'anatomy');let data={anatomy:{system:'skeletal',view:'anterior',complexity:3,_activeTab:'spotter',...extra}};const spoken=[],announced=[];
  const render=()=>tool.render(makeCtx({toolData:data,gradeLevel:'9',callTTS:text=>spoken.push(text),announceToSR:text=>announced.push(text),setToolData:u=>{data=typeof u==='function'?u(data):u;}}));
  const node=p=>{const found=find(render(),p);expect(found).not.toBeNull();return found;};
  return {data:()=>data.anatomy,spoken,announced,node,patch:p=>{data={anatomy:{...data.anatomy,...p}};},answer:id=>node(n=>n.props?.['data-anatomy-spotter-option']===id).props.onClick(),click:label=>node(n=>n.type==='button'&&n.props?.['aria-label']===label).props.onClick(),html(){const root=document.createElement('div');root.innerHTML=renderTool('anatomy',data,{gradeLevel:'9'});return root;}};
}
beforeEach(()=>{resetStemLab();vi.useFakeTimers();vi.setSystemTime(now);});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();});
for(const file of ['stem_lab/stem_tool_anatomy.js','desktop/web-app/public/stem_lab/stem_tool_anatomy.js'])describe('Spotter practice: '+file,()=>{
  it('defaults to untimed practice and does not import a legacy best time',()=>{
    const s=session(file,{_spotterBestTime:1.2});const root=s.html();expect(root.querySelector('[data-anatomy-spotter-timing]').checked).toBe(false);expect(root.textContent).toContain('Untimed practice');expect(root.textContent).not.toContain('Best timed response');
    s.click('Start Spotter Test');expect(s.data()._spotterRoundTimed).toBe(false);expect(s.data()._spotterOpts).toHaveLength(4);expect(s.data()._spotterOpts.every(o=>Object.keys(o).join(',')==='id')).toBe(true);
    s.answer(s.data()._spotterTarget);expect(s.data()._spotterElapsed).toBeNull();expect(s.data()._spotterTimedBestTime).toBeUndefined();expect(s.data()._spotterBestTime).toBe(1.2);expect(s.html().querySelector('[data-anatomy-spotter-time]')).toBeNull();
  });
  it('records timing only when chosen before a round and restores the preference',()=>{
    const s=session(file);s.node(n=>n.props?.['data-anatomy-spotter-timing']).props.onChange({target:{checked:true}});s.click('Start Spotter Test');vi.setSystemTime(now+4250);s.answer(s.data()._spotterTarget);
    expect(s.data()._spotterTimedBestTime).toBe(4.25);expect(s.html().querySelector('[data-anatomy-spotter-time]').textContent).toBe('Response time: 4.3 s');
    const saved=JSON.parse(JSON.stringify(s.data())),restored=session(file,saved);expect(restored.html().querySelector('[data-anatomy-spotter-time]').textContent).toBe('Response time: 4.3 s');
    restored.click('End Test');expect(restored.html().querySelector('[data-anatomy-spotter-timing]').checked).toBe(true);
  });
  it('accepts the first answer once across separate stale render callbacks',()=>{
    const s=session(file,round),correct=s.node(n=>n.props?.['data-anatomy-spotter-option']==='skull').props.onClick,wrong=s.node(n=>n.props?.['data-anatomy-spotter-option']==='ribs').props.onClick;
    correct();wrong();correct();expect(s.data()._spotterFeedback).toBe('skull');expect(s.data()._spotterTotal).toBe(1);expect(s.data()._spotterScore).toBe(1);expect(s.data()._retrievalEvidence.skull).toEqual({attempts:1,correct:1});
    vi.advanceTimersByTime(1);expect(s.announced.filter(x=>x.startsWith('Correct.'))).toHaveLength(1);
  });
  it('preserves fresh evidence, ratings, notes, and counters during an answer',()=>{
    const s=session(file,round),answer=s.node(n=>n.props?.['data-anatomy-spotter-option']==='skull').props.onClick;
    s.patch({_spotterScore:8,_spotterTotal:10,_retrievalEvidence:{skull:{attempts:2,correct:1},ribs:{attempts:3,correct:2}},_structureConfidence:{ribs:'mastered'},_structureNotes:{ribs:'My note'}});answer();
    expect(s.data()._spotterScore).toBe(9);expect(s.data()._spotterTotal).toBe(11);expect(s.data()._retrievalEvidence.skull).toEqual({attempts:3,correct:2});expect(s.data()._retrievalEvidence.ribs).toEqual({attempts:3,correct:2});expect(s.data()._structureConfidence.ribs).toBe('mastered');expect(s.data()._structureNotes.ribs).toBe('My note');
  });
  it.each([{_spotterSerial:2},{_activeTab:'explore'},{system:'muscular'},{_spotterActive:false}])('rejects an answer from a superseded context %j',patch=>{
    const s=session(file,round),answer=s.node(n=>n.props?.['data-anatomy-spotter-option']==='skull').props.onClick;s.patch(patch);const snapshot=JSON.stringify(s.data());answer();vi.advanceTimersByTime(1);expect(JSON.stringify(s.data())).toBe(snapshot);expect(s.announced).toEqual([]);
  });
  it('allows ending an unanswered or malformed round without credit',()=>{
    for(const extra of [round,{_spotterActive:true,_spotterOpts:{invalid:true}}]){const s=session(file,extra);s.click('End Test');expect(s.data()._spotterActive).toBe(false);expect(s.data()._spotterOpts).toEqual([]);expect(s.data()._spotterTotal).toBeUndefined();}
  });
  it('ignores old End and timing controls after a new question starts',()=>{
    const s=session(file),timing=s.node(n=>n.props?.['data-anatomy-spotter-timing']).props.onChange;s.click('Start Spotter Test');timing({target:{checked:true}});expect(s.data()._spotterTimed).not.toBe(true);
    const end=s.node(n=>n.props?.['data-anatomy-spotter-end']).props.onClick;s.answer(s.data()._spotterTarget);s.click('Next Structure');const snapshot=JSON.stringify(s.data());end();expect(JSON.stringify(s.data())).toBe(snapshot);
  });
  it('avoids consecutive targets and keeps four different options across rounds',()=>{
    vi.spyOn(Math,'random').mockReturnValue(0);const s=session(file);s.click('Start Spotter Test');let previous=null;
    for(let i=0;i<6;i++){const state=s.data();expect(state._spotterTarget).not.toBe(previous);expect(new Set(state._spotterOpts.map(o=>o.id)).size).toBe(4);previous=state._spotterTarget;s.answer(previous);s.click('Next Structure');}
    expect(s.data()._spotterTotal).toBe(6);expect(s.data()._spotterSerial).toBe(7);
  });
  it('reads only the unnamed position cue until the answer is submitted',()=>{
    const s=session(file,round);s.node(n=>n.props?.['aria-label']==='Read the spotter prompt aloud').props.onClick();expect(s.spoken[0]).toContain('The marker is');expect(s.spoken[0]).not.toContain('Skull');expect(s.html().querySelector('[data-anatomy-spotter-feedback]')).toBeNull();
    s.answer('ribs');s.node(n=>n.props?.['aria-label']==='Read the marked structure explanation aloud').props.onClick();expect(s.spoken[1]).toContain('Skull');const feedback=s.html().querySelector('[data-anatomy-spotter-feedback]').textContent;expect(feedback).not.toMatch(/\{[a-zA-Z]+\}/);expect(feedback).toContain(s.spoken[1].slice(s.spoken[1].indexOf(': ')+2));expect(s.html().querySelector('[data-anatomy-spotter-study="skull"]')).not.toBeNull();expect(s.data()._structureConfidence.skull).toBe('practice');
  });
  it('ignores modified, repeated, and editable-target number keys',()=>{
    const s=session(file,round),handler=s.node(n=>n.props?.['data-anatomy-spotter-panel']).props.onKeyDown,preventDefault=vi.fn();
    for(const extra of [{altKey:true},{ctrlKey:true},{metaKey:true},{shiftKey:true},{repeat:true},{target:{tagName:'INPUT'}},{target:{tagName:'DIV',isContentEditable:true}}])handler({key:'1',preventDefault,...extra});
    expect(s.data()._spotterFeedback).toBeUndefined();expect(preventDefault).not.toHaveBeenCalled();handler({key:'1',preventDefault,target:{tagName:'DIV'}});expect(s.data()._spotterFeedback).toBe('skull');
  });
  it('does not create a speed record from a wrong answer, future clock, or zero duration',()=>{
    for(const [start,answer]of [[now-1000,'ribs'],[now+1000,'skull'],[now,'skull']]){const s=session(file,{...round,_spotterTimed:true,_spotterRoundTimed:true,_spotterStartTime:start});s.answer(answer);expect(s.data()._spotterTimedBestTime).toBeUndefined();}
  });
});
