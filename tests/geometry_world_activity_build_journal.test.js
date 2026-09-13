import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {React,ReactDOMClient,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8').replace(/\r\n/g,'\n');
const from=core.indexOf('  // ── Rich lesson generation helpers'),to=core.indexOf('  // ── End rich lesson generation helpers',from);
const generation=new Function(core.slice(from,to)+'\nreturn {normalizeGeometryBuildGoal,geometryLessonDepth,geometryGenerationBrief,geometryPlanIssues,geometryGeneratedLessonIssues};')();
const oldTest=readFileSync('tests/geometry_world_generation_depth.test.js','utf8');
const fixtures=new Function('api',oldTest.slice(oldTest.indexOf('function fixtures('),oldTest.indexOf('function requestSequence('))+'\nreturn fixtures;')(generation);
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let api,mounted;
const goal=(metric='occupiedVolume',target=2,comparator='eq',unitCubesOnly=false)=>({metric,target,comparator,unitCubesOnly});
const block=(x=0,y=1,z=0,shape='cube')=>({x,y,z,shape,type:'wood',rotation:0});
beforeEach(()=>{
  vi.useFakeTimers();const lab=resetStemLab();lab.geometryWorldLessonChecks={normalizeBuildGoal:generation.normalizeGeometryBuildGoal};
  lab.registerTool('geometryWorld',{aliases:[],render(ctx){return ctx.React.createElement('main',{id:'geoworld-fs-workspace'},ctx.React.createElement('div',{id:'geoworld-fs-wrap',tabIndex:0}));}});
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();api=window.StemLab.geometryWorldBuilderPure;
});
afterEach(()=>{if(mounted){React.act(()=>mounted.root.unmount());mounted.host.remove();mounted=null;}delete window.__geoWorldEngine;vi.restoreAllMocks();vi.clearAllTimers();vi.useRealTimers();});

describe('Explicit generated student build goals',()=>{
  it.each(['blockCount','occupiedVolume','footprintArea','width','depth','height'])('normalizes the supported %s metric',metric=>{expect(generation.normalizeGeometryBuildGoal({metric,comparator:'gte',target:4})).toEqual(goal(metric,4,'gte'));});
  it.each([null,{},goal('surfaceArea'),goal('constructor'),goal('occupiedVolume',NaN),goal('occupiedVolume',Infinity),goal('occupiedVolume',-1),goal('occupiedVolume','24'),goal('occupiedVolume',.3),goal('blockCount',1.5),goal('height',.25),goal('occupiedVolume',1.5,'eq',true),goal('height',2.5,'eq',true),goal('width',2,'approximately'),{...goal(),unitCubesOnly:'true'},{...goal(),code:'score()'}])('rejects unsupported or uncheckable schema %j',value=>{expect(generation.normalizeGeometryBuildGoal(value)).toBeNull();});
  it('rejects unsupported goals in plans and final lessons and preserves the approved numeric target',()=>{
    const {profile,plan,lesson}=fixtures(1);plan.activities[0].buildGoal=goal('occupiedVolume',12);lesson.activities[0].buildGoal=goal('occupiedVolume',12);
    expect(generation.geometryPlanIssues(plan,profile)).toEqual([]);expect(generation.geometryGeneratedLessonIssues(lesson,profile,plan)).toEqual([]);
    lesson.activities[0].buildGoal.target=10;expect(generation.geometryGeneratedLessonIssues(lesson,profile,plan).join(' ')).toContain('Preserve the planned buildGoal');
    plan.activities[0].buildGoal=goal('beauty');expect(generation.geometryPlanIssues(plan,profile).join(' ')).toContain('unsupported buildGoal');
    lesson.activities[0].buildGoal=goal('footprint-perimeter');expect(generation.geometryGeneratedLessonIssues(lesson,profile,plan).join(' ')).toContain('unsupported buildGoal');
  });
  it('tells every generation stage the exact selected scope and unsupported judgments',()=>{
    const brief=generation.geometryGenerationBrief({grade:'5',topic:'Volume'},generation.geometryLessonDepth(3));
    expect(brief).toContain('explicitly selected student geometry');expect(brief).toContain('optional buildGoal');expect(brief).toContain('cannot grade beauty');expect(brief).toContain('interior air volume');expect(brief).toContain('preserve it unchanged');
  });
  it('preserves the previous activity journal key when numerical guidance is added',()=>{
    const base={title:'Workshop',structures:[],activities:[{id:'build',title:'Build',challenge:'Build two cubes.'}]};
    const first=api.activityGuideModel(base),second=api.activityGuideModel({...base,activities:[{...base.activities[0],buildGoal:goal()}]});
    expect(first.key).toBe(second.key);expect(second.activities[0].buildGoal).toEqual(goal());
    const bad=api.activityGuideModel({...base,activities:[{...base.activities[0],buildGoal:goal('beauty')}]});expect(bad.activities[0].buildGoal).toBeNull();expect(bad.activities[0].buildGoalInvalid).toBe(true);
  });
});

describe('Build checks count occupied student geometry correctly',()=>{
  it('distinguishes fractional occupied volume, footprint union, and physical height',()=>{
    const facts=api.activityBuildFacts([block(0,1,0,'halfB'),block(0,2,0,'quarter'),block(1,1,0,'halfA')]);
    expect(facts).toEqual({blockCount:3,occupiedVolume:1.25,footprintArea:2,width:2,depth:1,height:1.5,unitCubesOnly:false});
    const emptyCenter=[block(0),block(2)];expect(api.activityBuildFacts(emptyCenter).footprintArea).toBe(2);expect(api.activityBuildFacts(emptyCenter).width).toBe(3);
  });
  it.each([['eq',2,'met'],['eq',3,'revise'],['gte',1,'met'],['gte',3,'revise'],['lte',3,'met'],['lte',1,'revise']])('compares %s %s without changing the creation',(comparator,target,status)=>{
    const blocks=[block(0),block(1)],saved=JSON.stringify(blocks),result=api.evaluateActivityBuildGoal(goal('occupiedVolume',target,comparator),blocks);
    expect(result.status).toBe(status);expect(result.actual).toBe(2);expect(result.message).toContain('Review the other design criteria yourself');expect(JSON.stringify(blocks)).toBe(saved);
  });
  it('does not pass a full-cube task merely because fractional pieces have the right count',()=>{const result=api.evaluateActivityBuildGoal(goal('blockCount',2,'eq',true),[block(0,1,0,'halfB'),block(1,1,0,'quarter')]);expect(result.actual).toBe(2);expect(result.status).toBe('revise');expect(result.message).toContain('fractional pieces');});
  it('refuses unknown geometry, duplicate cells, empty selections and arbitrary metrics',()=>{
    for(const blocks of [[],[block(),block()],[block(0,1,0,'unknown')],[block(.5)]])expect(api.activityBuildFacts(blocks)).toBeNull();
    expect(api.evaluateActivityBuildGoal(null,[block()]).status).toBe('unavailable');expect(api.evaluateActivityBuildGoal(goal(),[]).status).toBe('unavailable');
  });
});

function fixtureEngine(){
  const blocks=[block(0),block(1),block(8),block(0,0,0),block(3,1,0)];
  const engine={blocks:{},_currentLesson:{title:'Workshop',structures:[],activities:[{id:'task',title:'Revise a model',challenge:'Build two full cubes.',successCriteria:'Compare your dimensions and explain your choice.',reflection:'What changed?',buildGoal:goal('occupiedVolume',2,'eq',true)}]},_builderSelection:{blocks:[block(0),block(1)]},_undoStack:[{action:'place'}],_redoStack:[],releaseInput:vi.fn(),_popBlocks:[],incomplete:false};
  blocks.forEach(b=>{const protectedBlock=b.y===0 || b.x===3;engine.blocks[[b.x,b.y,b.z].join(',')]={userData:{gridPos:{x:b.x,y:b.y,z:b.z},shape:b.shape,rotation:b.rotation,blockType:b.y===0?'grass':'wood',volume:1,_lessonBlock:protectedBlock,_measurementLayer:b.y===0?'ground':protectedBlock?'lesson':'student'}};});
  engine.measureStructure=(x,y,z,retained)=>{const list=(retained || [block(x,y,z)]).filter(b=>engine.blocks[[b.x,b.y,b.z].join(',')]);return list.length?{blocks:list,count:list.length,isComplete:!engine.incomplete,L:list.length,W:1,H:1,totalVolume:list.length,shapeCounts:{cube:list.length}}:null;};
  engine.blockUnderCrosshair=()=>({object:engine.blocks['8,1,0']});return engine;
}
describe('Snapshot scope, bounds and persistence',()=>{
  it('captures only the explicit student selection and refreshes connected edits first',()=>{
    const engine=fixtureEngine(),before=JSON.stringify([engine.blocks,engine._undoStack]);
    const captured=api.captureActivityBuild(engine,'2026-09-12T12:00:00Z');expect(captured.ok).toBe(true);expect(captured.snapshot.blocks.map(b=>b.x)).toEqual([0,1]);expect(captured.snapshot.facts.occupiedVolume).toBe(2);expect(JSON.stringify([engine.blocks,engine._undoStack])).toBe(before);
    engine.blocks['2,1,0']={userData:{...engine.blocks['1,1,0'].userData,gridPos:{x:2,y:1,z:0}}};const original=engine.measureStructure;engine.measureStructure=(...args)=>{const m=original(...args);m.blocks=[...m.blocks,block(2)];return m;};
    expect(api.captureActivityBuild(engine).snapshot.facts.blockCount).toBe(3);
  });
  it('rejects empty, partial and protected selections without falling back to an aimed build',()=>{
    const engine=fixtureEngine();engine._builderSelection=null;expect(api.captureActivityBuild(engine).ok).toBe(false);
    engine._builderSelection={blocks:[block(0)]};engine.incomplete=true;expect(api.captureActivityBuild(engine).ok).toBe(false);
    engine.incomplete=false;engine._builderSelection={blocks:[block(3)]};expect(api.captureActivityBuild(engine).ok).toBe(false);
    engine._builderSelection={blocks:[block(0),block(3)]};expect(api.captureActivityBuild(engine).ok).toBe(false);
  });
  it('retains independent before/after snapshots through JSON persistence and keeps notes untouched',()=>{
    const engine=fixtureEngine(),before=api.captureActivityBuild(engine).snapshot,all={lesson:{notes:{task:'My reasoning'},reviewed:{task:true}}};
    let result=api.updateActivityEvidence(all,'lesson','task',{before});engine.blocks['1,1,0'].userData.shape='quarter';const after=api.captureActivityBuild(engine).snapshot;
    result=api.updateActivityEvidence(result.value,'lesson','task',{after});const restored=JSON.parse(JSON.stringify(result.value));
    expect(restored.lesson.evidence.task.before.facts.occupiedVolume).toBe(2);expect(restored.lesson.evidence.task.after.facts.occupiedVolume).toBe(1.25);expect(restored.lesson.notes.task).toBe('My reasoning');expect(restored.lesson.reviewed.task).toBe(true);expect(all.lesson.evidence).toBeUndefined();
  });
  it('rejects over-budget persistence atomically and clearing releases its capacity',()=>{
    const large={blocks:Array.from({length:1500},(_,x)=>block(x))};let all={lesson:{evidence:{a:{before:large,after:large},b:{before:large,after:large}},notes:{a:'Keep'}}};const saved=JSON.stringify(all);
    expect(api.updateActivityEvidence(all,'lesson','c',{before:{blocks:[block()]}}).ok).toBe(false);expect(JSON.stringify(all)).toBe(saved);
    const cleared=api.updateActivityEvidence(all,'lesson','a',{before:null,after:null});expect(cleared.ok).toBe(true);expect(cleared.value.lesson.notes.a).toBe('Keep');expect(api.updateActivityEvidence(cleared.value,'lesson','c',{before:large}).ok).toBe(true);
  });
  it('bounds journal count even when the current lesson was the oldest key',()=>{const all={current:{notes:{a:'Keep'}}};for(let i=0;i<30;i++)all['other-'+i]={};const result=api.updateActivityEvidence(all,'current','a',{check:null});expect(Object.keys(result.value)).toHaveLength(30);expect(result.value.current.notes.a).toBe('Keep');});
  it('preserves negative coordinates and shape rotations in the full saved geometry and sketch',()=>{
    const engine=fixtureEngine(),b=block(-7,1,-4,'halfA');b.rotation=1;engine.blocks['-7,1,-4']={userData:{gridPos:{x:-7,y:1,z:-4},shape:b.shape,rotation:1,blockType:'gold',_lessonBlock:false,_measurementLayer:'student'}};engine._builderSelection={blocks:[b]};
    const snapshot=api.captureActivityBuild(engine).snapshot;expect(snapshot.blocks[0]).toEqual({...b,type:'gold'});expect(snapshot.facts).toMatchObject({occupiedVolume:.5,footprintArea:1,width:1,depth:1,height:1});
    const rotated=api.activitySnapshotSvg(snapshot),straight=api.activitySnapshotSvg({...snapshot,blocks:[{...snapshot.blocks[0],rotation:0}]});expect(rotated).not.toBe(straight);expect(rotated).toContain('<polygon');expect(rotated).not.toContain('NaN');expect(rotated).not.toContain('Infinity');
  });
  it('produces an escaped offline portfolio with full geometry JSON and derived snapshot facts',()=>{
    const engine=fixtureEngine(),guide=api.activityGuideModel(engine._currentLesson),id=guide.activities[0].id,snapshot=api.captureActivityBuild(engine,'2026-09-12T12:00:00Z').snapshot;
    const journal={notes:{[id]:'<script>alert("hello")</script> & my reflection'},evidence:{[id]:{before:{...snapshot,facts:{blockCount:'<img onerror=x>'}}}}};
    const data=api.activityJournalExport(guide,journal);expect(data.schema).toBe('alloflow-geometry-journal/2');expect(data.activities[0].before.facts.blockCount).toBe(2);expect(data.activities[0].before.blocks).toHaveLength(2);
    const html=api.activityPortfolioHtml(guide,journal);expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script');expect(html).not.toContain('<img onerror');expect(html).toContain('<svg');expect(html).not.toMatch(/<script|https?:\/\/(?!www.w3.org)|fetch\(/);expect(html).toContain('No snapshot saved');
  });
});

function mount(){
  const engine=fixtureEngine();window.__geoWorldEngine=engine;const host=document.createElement('div');document.body.appendChild(host);let state,patch;const toast=vi.fn();
  function Host(){const [data,setData]=React.useState({geometryWorld:{activeLesson:'workshop',worldActive:true,objectivesOpen:true,score:3,answeredNpcs:{Ada:true}}});state=data.geometryWorld;patch=values=>setData(old=>({...old,geometryWorld:{...old.geometryWorld,...values}}));return window.StemLab._registry.geometryWorld.render({React,toolData:data,updateMulti:(tool,values)=>setData(old=>({...old,[tool]:{...old[tool],...values}})),addToast:toast,announceToSR:vi.fn()});}
  const root=ReactDOMClient.createRoot(host);React.act(()=>root.render(React.createElement(Host)));mounted={root,host};
  return {host,engine,state:()=>state,patch:values=>React.act(()=>patch(values)),button:label=>Array.from(host.querySelectorAll('button')).find(b=>b.textContent===label),click:button=>React.act(()=>button.click()),entry(){const guide=api.activityGuideModel(engine._currentLesson);return state.lessonActivityProgress?.[guide.key]?.evidence?.[guide.activities[0].id];}};
}
describe('Mounted exploration journal',()=>{
  it('checks the selected creation, saves geometry on demand and leaves scores, blocks and history untouched',()=>{
    const app=mount(),before=JSON.stringify([app.engine.blocks,app.engine._undoStack]);expect(app.state().lessonActivityProgress).toBeUndefined();
    app.click(app.button('Check my build'));expect(app.entry().check.status).toBe('met');expect(app.host.querySelector('[data-build-check=met]').textContent).toContain('Selected build: 2 cubic units');expect(app.state().score).toBe(3);expect(app.state().answeredNpcs).toEqual({Ada:true});
    app.click(app.button('Save before snapshot'));expect(app.entry().before.blocks).toHaveLength(2);expect(app.host.querySelector('[data-snapshot-stage=before] img').alt).toContain('2 units wide');expect(JSON.stringify([app.engine.blocks,app.engine._undoStack])).toBe(before);
    app.engine.blocks['1,1,0'].userData.shape='quarter';app.click(app.button('Save after snapshot'));expect(app.entry().after.facts.occupiedVolume).toBe(1.25);expect(app.entry().before.facts.occupiedVolume).toBe(2);
    app.click(app.button('Check my build'));expect(app.entry().check.status).toBe('revise');expect(app.host.textContent).toContain('fractional pieces');
  });
  it('requires deliberate aimed selection and does not silently use other world blocks',()=>{
    const app=mount();app.engine._builderSelection=null;app.click(app.button('Check my build'));expect(app.entry()).toBeUndefined();expect(app.host.textContent).toContain('Select your activity build first');
    app.click(app.button('Select aimed build'));expect(app.engine._builderSelection.blocks[0].x).toBe(8);app.click(app.button('Check my build'));expect(app.entry().check.actual).toBe(1);expect(app.entry().check.status).toBe('revise');
  });
  it('keeps saved evidence on reopening and after a JSON state roundtrip while resetting notices across worlds',()=>{
    const app=mount();app.click(app.button('Save before snapshot'));const progress=JSON.parse(JSON.stringify(app.state().lessonActivityProgress));app.click(app.button('Back to exploring'));expect(app.host.querySelector('.gwe-activity-guide')).toBeNull();
    app.patch({objectivesOpen:true,lessonActivityProgress:progress});expect(app.host.querySelector('[data-snapshot-stage=before] img')).toBeTruthy();
    app.engine._currentLesson={...app.engine._currentLesson,title:'Different world'};app.engine._builderSelection=null;app.patch({activeLesson:'different'});expect(app.host.querySelector('[data-snapshot-stage=before] img')).toBeNull();expect(app.host.querySelector('.gwe-journal-notice')).toBeNull();expect(Object.keys(app.state().lessonActivityProgress)).toHaveLength(1);
  });
  it('downloads the mounted before/after portfolio and geometry journal using only local Blob URLs',()=>{
    const app=mount(),downloads=[];const oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL;
    URL.createObjectURL=vi.fn(blob=>{downloads.push(blob);return 'blob:local-portfolio';});URL.revokeObjectURL=vi.fn();const linkClick=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
    try{app.click(app.button('Save before snapshot'));app.engine.blocks['1,1,0'].userData.shape='quarter';app.click(app.button('Save after snapshot'));app.click(app.button('Download portfolio'));app.click(app.button('Download journal'));
      expect(downloads).toHaveLength(2);expect(downloads[0].type).toBe('text/html;charset=utf-8');expect(downloads[1].type).toBe('application/json');expect(linkClick).toHaveBeenCalledTimes(2);expect(downloads.every(blob=>blob.size>100)).toBe(true);expect(app.entry().before.facts.occupiedVolume).toBe(2);expect(app.entry().after.facts.occupiedVolume).toBe(1.25);
    }finally{URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;}
  });
  it('presents open-ended activities without a fake grade and supports clearing only snapshots',()=>{
    const app=mount();app.click(app.button('Save before snapshot'));app.click(app.button('Check my build'));app.click(app.button('Clear this activity’s snapshots'));expect(app.entry().before).toBeNull();expect(app.entry().check.status).toBe('met');
    delete app.engine._currentLesson.activities[0].buildGoal;app.patch({revision:1});expect(app.button('Check my build')).toBeUndefined();expect(app.host.textContent).toContain('An open-ended task');expect(app.button('Download portfolio')).toBeTruthy();
  });
});
