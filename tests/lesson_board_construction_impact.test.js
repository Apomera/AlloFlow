import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
import {simulatePlan} from '../lesson_board_sandbox.js';
import {constructionImpact} from '../lesson_board_construction_impact.js';
const {makeBoard}=createRequire(import.meta.url)('../dev-tools/fixtures/lesson_board.cjs');
const board=options=>({...makeBoard(),playStyle:'tabletop',goal:'expedition',...options});
const planned=(b,entries)=>simulatePlan(b,engine.emptyRun(),entries).run;
const builtRun=b=>{
  let run=engine.emptyRun();
  for(const id of ['heater','cloud','heater','research'])run=finish(b,run,id);
  return engine.merge(run,engine.advance(b,run));
};
function answer(b,run,correct=true,dice=[1,1]) {
  const node=b.locations.find(item=>item.id===engine.stepOf(run).targetId);
  const value=correct?engine.solution(node):String((node.answer+1)%node.options.length);
  run=engine.merge(run,engine.processAction(b,run,{attemptId:'impact',turn:run.turn,requestId:engine.requestId(run),kind:'answer',targetId:node.id,value},'solo',{attemptId:'impact',active:true}));
  return engine.merge(run,engine.resolve(b,run,{solo:{}},{dice}));
}
const finish=(b,run,id)=>{
  if(engine.fieldOpportunity(b,run)?.pending)run=engine.merge(run,engine.chooseFieldOpportunity(b,run,'collect'));
  if(engine.stepOf(run).phase==='review')run=engine.merge(run,engine.advance(b,run));
  run=engine.merge(run,engine.begin(b,run,id));
  return engine.stepOf(run).phase==='answer'?answer(b,run):run;
};
describe('Construction impact on the tabletop',()=>{
  it('separates an unbuilt producer from actual income and keeps authored caches intact',()=>{
    const b=board(),run=engine.emptyRun(),before=JSON.stringify({b,run});
    const impact=constructionImpact(b,run).projects.research;
    expect(impact).toMatchObject({built:false,used:false,earned:null,builtTurn:null,potential:{resource:0,perInvestigation:1,maximum:8,requiresBuild:true}});
    expect(impact.potential.locationIds).toEqual(b.locations.map(node=>node.id));
    impact.potential.locationIds.pop();
    expect(JSON.stringify({b,run})).toBe(before);
    expect(constructionImpact(b,run).projects.research.potential.locationIds).toHaveLength(8);
  });
  it('counts only later successful fresh investigations, never travel or inspection',()=>{
    const b=board();let run=builtRun(b);
    expect(constructionImpact(b,run).projects.research).toMatchObject({built:true,builtTurn:4,earned:{resource:0,count:0},potential:{maximum:6,requiresBuild:false}});
    run=finish(b,run,'river');
    expect(constructionImpact(b,run).projects.research.earned.count).toBe(1);
    expect(constructionImpact(b,run).projects.research.potential.locationIds).not.toContain('river');
    run=finish(b,run,'heater');
    expect(constructionImpact(b,run).projects.research.earned.count).toBe(1);
    expect(constructionImpact(b,engine.restoreRun(b,run))).toEqual(constructionImpact(b,run));
  });
  it('waits through a failed answer and credits a successful retry once',()=>{
    const b=board();let run=engine.merge(builtRun(b),engine.begin(b,builtRun(b),'river'));
    expect(constructionImpact(b,run).projects.research.earned.count).toBe(0);
    run=answer(b,run,false);
    expect(constructionImpact(b,run).projects.research.earned.count).toBe(0);
    run=engine.merge(run,engine.retry(b,run));run=answer(b,run);
    expect(constructionImpact(b,run).projects.research.earned.count).toBe(1);
    expect(constructionImpact(b,engine.restoreRun(b,run)).projects.research.earned.count).toBe(1);
  });
  it('does not count contract rewards or fortune as producer income',()=>{
    const b=board({chance:true,contracts:[{id:'survey',title:'River survey',description:'Survey the river.',locations:['heater','river'],reward:[2,2]}]});
    let run=builtRun(b);run=engine.merge(run,engine.begin(b,run,'river'));run=answer(b,run,true,[20,20]);
    const progress=engine.derive(b,run);
    expect(progress.contractGains).toEqual([2,2]);expect(progress.fortune.some(Boolean)).toBe(true);
    expect(constructionImpact(b,run).projects.research.earned).toEqual({resource:0,count:1});
  });
  it('keeps the production ledgers of two producers independent',()=>{
    const b=board(),run=planned(b,['heater','cloud','river','heater','research','cloud','network','rain']);
    const impact=constructionImpact(b,run);
    expect(impact.projects.research.earned).toEqual({resource:0,count:1});
    expect(impact.projects.network.earned).toEqual({resource:1,count:1});
    expect(impact.projects.research.potential.locationIds).toEqual(impact.projects.network.potential.locationIds);
  });
  it('caps future income at the move limit and accounts for the construction move',()=>{
    const b=board(),base=builtRun(b),at=turn=>({...base,turn,steps:{...base.steps,['t'+turn]:engine.emptyStep()}});
    const final=constructionImpact(b,at(engine.MAX_TURNS-1));
    expect(final.projects.research.potential.maximum).toBe(1);
    expect(final.projects.network.potential).toMatchObject({maximum:0,locationIds:[]});
    const penultimate=constructionImpact(b,at(engine.MAX_TURNS-2));
    expect(penultimate.projects.network.potential.maximum).toBe(1);
    let current=engine.merge(at(engine.MAX_TURNS-1),engine.begin(b,at(engine.MAX_TURNS-1),'river'));
    current=answer(b,current,false);
    expect(constructionImpact(b,current).projects.research.potential.maximum).toBe(1);
    current=engine.merge(current,engine.retry(b,current));current=answer(b,current);
    expect(constructionImpact(b,current).projects.research.potential).toMatchObject({maximum:0,locationIds:[]});
  });
  it('labels projections separately and respects the visible history prefix',()=>{
    const b=board(),run=finish(b,builtRun(b),'river'),before=JSON.stringify({b,run});
    expect(constructionImpact(b,run,{projection:true})).toMatchObject({scope:'projected',projects:{research:{earned:{count:1}}}});
    expect(constructionImpact(b,{...run,turn:2}).projects.research.earned).toBeNull();
    expect(JSON.stringify({b,run})).toBe(before);
  });
  it('keeps earned income but removes future markers after a completed expedition',()=>{
    const b=board({goal:'mastery'});let run=builtRun(b);
    for(const id of ['river','cloud','rain','cloud','network','sequence','heater'])run=finish(b,run,id);
    expect(engine.derive(b,run).complete).toBe(true);
    const impact=constructionImpact(b,run);
    expect(impact.projects.research.earned.count).toBe(3);
    expect(impact.projects.network.earned.count).toBe(1);
    expect(impact.projects.research.potential).toMatchObject({maximum:0,locationIds:[]});
    expect(impact.projects.network.potential).toMatchObject({maximum:0,locationIds:[]});
  });
  it('tracks actual bridge connectivity and use without inventing crossings',()=>{
    const b=board(),built=planned(b,['heater','cloud','heater','bridge']),unused=constructionImpact(b,built).projects.bridge;
    expect(unused).toMatchObject({earned:null,connection:{from:engine.buildSite(b,'bridge'),to:'sequence',added:true,used:false}});
    const crossed=finish(b,built,'sequence');
    expect(constructionImpact(b,crossed).projects.bridge.connection.used).toBe(true);
    const duplicate=board();duplicate.edges.push([engine.buildSite(duplicate,'bridge'),'sequence']);
    const duplicateRun=planned(duplicate,['heater','cloud','heater','bridge']);
    expect(constructionImpact(duplicate,duplicateRun).projects.bridge.connection.added).toBe(false);
  });
  it('does not invent production for legacy boards or an invalid turn',()=>{
    expect(constructionImpact(makeBoard(),engine.emptyRun()).projects).toEqual({});
    expect(constructionImpact(board(),{turn:engine.MAX_TURNS,steps:{}}).projects).toEqual({});
  });
});
