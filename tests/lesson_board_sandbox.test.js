import {describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as e from '../lesson_board_engine.js';
import {planningBase,planningKey,simulatePlan,PLAN_LIMIT} from '../lesson_board_sandbox.js';
const {makeBoard}=createRequire(import.meta.url)('../dev-tools/fixtures/lesson_board.cjs');
const board=goal=>({...makeBoard(),goal:goal||'expedition'});
function realMove(b,run,id,success=true){let next=e.merge(run,e.begin(b,run,id));const node=b.locations.find(n=>n.id===id);if(node){const value=success?e.solution(node):String((Number(node.answer)+1)%node.options.length);next.steps['t'+next.turn].answers={solo:{value,correct:success}};next=e.merge(next,e.resolve(b,next,{solo:{}}));}return next;}
function execute(b,ids,base=e.emptyRun()){let run=base;for(const id of ids){run=realMove(b,run,id);if(!e.derive(b,run).complete&&run.turn<47)run=e.merge(run,e.advance(b,run));}return run;}
function mechanical(progress){const {performance,...rest}=progress;return rest;}
describe('Board planning sandbox simulation',()=>{
 it.each(['core','expedition','architect'])('matches real successful moves for %s without mutating the game',goal=>{const b=board(goal),run=e.emptyRun(),original=JSON.stringify({b,run}),ids=['heater','cloud','research','river','bridge'],result=simulatePlan(b,run,ids);expect(result.steps).toHaveLength(ids.length);expect(mechanical(result.progress)).toEqual(mechanical(e.derive(b,execute(b,ids))));expect(JSON.stringify({b,run})).toBe(original);expect(result.progress.performance).toEqual({});expect(result.steps[3].change).toEqual([3,1]);});
 it('opens a constructed shortcut in the plan before connected locations are explored',()=>{const result=simulatePlan(board(),e.emptyRun(),['heater','cloud','bridge']);expect(result.available.map(n=>n.id)).toContain('sequence');expect(result.steps[2].newlyOpened).toContain('sequence');expect(result.available.map(n=>n.id)).not.toContain('weather');expect(simulatePlan(board(),e.emptyRun(),['heater','cloud','bridge','sequence']).progress.visited).toContain('sequence');});
 it('stops illegal, duplicate, unknown, and unaffordable moves without consuming them',()=>{for(const ids of [['sequence'],['research'],['missing'],['heater','heater'],['heater','research']]){const result=simulatePlan(board(),e.emptyRun(),ids);expect(result.status).toBe('invalid');expect(result.steps).toHaveLength(ids.length-1);expect(result.progress.balance.every(n=>n>=0)).toBe(true);}});
 it('does not advance or award resources for an unresolved real activity',()=>{const b=board(),run=e.merge(e.emptyRun(),e.begin(b,e.emptyRun(),'heater'));run.steps.t0.answers={student:{value:'1',correct:true}};const result=simulatePlan(b,run,['cloud']);expect(result.status).toBe('finish-move');expect(result.steps).toEqual([]);expect(result.progress.balance).toEqual([0,0]);expect(JSON.stringify(result)).not.toContain('student');});
 it('keeps failed real moves as zero reward when planning the next turn',()=>{const b=board();let run=realMove(b,e.emptyRun(),'heater',false);run=e.merge(run,e.advance(b,run));const result=simulatePlan(b,run,['heater','cloud']);expect(result.initial.balance).toEqual([0,0]);expect(result.progress.balance).toEqual([4,2]);expect(result.remaining).toBe(45);});
 it('strips roster identifiers, responses, proposals, retry history and grading from projected state',()=>{const b=board(),run=execute(b,['heater']);run.steps.t0.result.marks={privateLearner:true};run.steps.t0.result.attempts={privateLearner:{answered:1,correct:1}};run.steps.t1.votes={privateLearner:'cloud'};run.steps.t1.seen={privateLearner:{requestId:'secret'}};expect(JSON.stringify(planningBase(run))).not.toMatch(/privateLearner|secret|answers|votes|attempts/);expect(simulatePlan(b,run,['cloud']).progress.performance).toEqual({});});
 it('does not mark a plan stale because classroom proposals or pending responses change',()=>{const b=board(),run=e.emptyRun(),key=planningKey(b,run);run.steps.t0.votes={u:'heater'};expect(planningKey(b,run)).toBe(key);const started=e.merge(run,e.begin(b,run,'heater'));expect(planningKey(b,started)).not.toBe(key);const answerKey=planningKey(b,started);started.steps.t0.answers={u:{value:'1',correct:true}};expect(planningKey(b,started)).toBe(answerKey);});
 it('stops at mission completion and never executes the remaining route',()=>{const result=simulatePlan(board('core'),e.emptyRun(),['heater','cloud','research','river','bridge','rain']);expect(result.status).toBe('complete');expect(result.steps).toHaveLength(5);expect(result.available).toEqual([]);expect(result.progress.visited).not.toContain('rain');});
 it('permits the final move slot but cannot plan past it',()=>{const b=board(),run=e.emptyRun();run.turn=47;run.steps.t47=e.emptyStep();const result=simulatePlan(b,run,['heater','cloud']);expect(result.status).toBe('turn-limit');expect(result.steps).toHaveLength(1);expect(result.remaining).toBe(0);expect(result.available).toEqual([]);});
 it('bounds plan length and handles non-array requests',()=>{expect(PLAN_LIMIT).toBe(12);expect(simulatePlan(board(),e.emptyRun(),Array(100).fill('heater')).status).toBe('invalid');expect(simulatePlan(board(),e.emptyRun(),'heater').status).toBe('invalid');});
 it('stops a legal twelve-step preview at its own cap while the mission can continue',()=>{const b=board();for(let i=0;i<4;i++){b.locations.push({...b.locations[0],id:'extra'+i,name:'Extra '+i});b.edges.push(['heater','extra'+i]);}const ids=['heater','cloud','research','river','bridge','rain','lake','sequence','cooler','weather','extra0','extra1'],result=simulatePlan(b,e.emptyRun(),ids);expect(result.status).toBe('plan-limit');expect(result.steps).toHaveLength(12);expect(result.progress.complete).toBe(false);expect(result.available).toEqual([]);expect(result.remaining).toBe(36);});
 it('never reads challenge answers to project successful exploration',()=>{const b=board();for(const node of b.locations)for(const field of ['answer','order','controls','explanation'])Object.defineProperty(node,field,{get(){throw Error('Read a solution');}});expect(simulatePlan(b,e.emptyRun(),['heater','cloud','research']).progress.built).toEqual(['research']);});
 it('includes existing construction effects and compares different legal orders',()=>{const b=board(),run=execute(b,['heater','cloud']);const a=simulatePlan(b,run,['research','river','bridge']),other=simulatePlan(b,run,['bridge','river','research']);expect(a.progress.balance).toEqual([2,0]);expect(other.progress.balance).toEqual([1,0]);expect(a.progress.built).toEqual(['research','bridge']);expect(other.progress.built).toEqual(['bridge','research']);});
 it('preserves confirmed fortune and committed preparation around an exchanged construction without predicting new rolls',()=>{
  const b={...board(),playStyle:'tabletop',chance:true};b.locations.find(node=>node.id==='cloud').reward=[0,1];
  let run=e.emptyRun();
  for(const [id,die] of [['heater',6],['cloud',1]]){
   run=e.merge(run,e.begin(b,run,id));const node=b.locations.find(item=>item.id===id);
   run=e.merge(run,e.processAction(b,run,{attemptId:'test',turn:run.turn,requestId:'answer-'+id,kind:'answer',targetId:id,value:e.solution(node)},'solo',{attemptId:'test',active:true}));
   run=e.merge(run,e.resolve(b,run,{solo:{}},{dice:[die]}));
   if(e.fieldOpportunity(b,run)?.pending)run=e.merge(run,e.chooseFieldOpportunity(b,run,'prepare'));
   run=e.merge(run,e.advance(b,run));
  }
  expect(e.derive(b,run)).toMatchObject({balance:[3,2],fortune:[1,0]});
  run=e.merge(run,e.begin(b,run,'network','research'));run=e.merge(run,e.advance(b,run));
  const actual=e.derive(b,run);expect(actual).toMatchObject({balance:[0,0],built:['network'],bonus:[0,1]});
  const copy=planningBase(run);copy.steps.t0.result.dice[0]=20;expect(run.steps.t0.result.dice).toEqual([6]);
  const random=vi.spyOn(Math,'random');
  try{
   const result=simulatePlan(b,run,['rain']);
   expect(mechanical(result.initial)).toEqual(mechanical(actual));
   expect(result.initial.built).toEqual(['network']);expect(result.initial.balance).toEqual([0,0]);
   expect(result.steps[0].change).toEqual([4,2]);expect(result.progress.balance).toEqual([4,2]);
   expect(result.progress.fieldGains).toEqual([2,0]);expect(result.progress.fieldPreparation).toBeNull();
   expect(result.progress.fortune).toEqual(actual.fortune);expect(result.progress.luck).toEqual(actual.luck);
   expect(result.run.steps.t3.result).not.toHaveProperty('dice');expect(random).not.toHaveBeenCalled();
  }finally{random.mockRestore();}
 });
});

describe('Tabletop route planning and intentional payments',()=>{
 const tabletop=options=>({...board(),playStyle:'tabletop',...options});
 function actualPlan(b,entries){let run=e.emptyRun();for(const entry of entries){const id=typeof entry==='string'?entry:entry.id;run=e.merge(run,e.begin(b,run,id,typeof entry==='string'?undefined:entry.funding));if(e.stepOf(run).phase==='answer'){const location=b.locations.find(node=>node.id===id);run.steps['t'+run.turn].answers={solo:{value:e.solution(location),correct:true}};run=e.merge(run,e.resolve(b,run,{solo:{}}));}if(!e.derive(b,run).complete&&run.turn<e.MAX_TURNS-1)run=e.merge(run,e.advance(b,run));}return run;}
 it('matches physical travel, a built shortcut, construction use, contracts, kit bonus, and returning home',()=>{
  const b=tabletop({goal:'core',expeditionKit:'pathfinder',contracts:[{id:'riverroute',title:'River route',description:'Explore the river',locations:['heater','river'],reward:[0,2]}]}),entries=['heater','cloud','river','heater',{id:'research',funding:'standard'},{id:'bridge',funding:'standard'},'sequence','heater'];
  const result=simulatePlan(b,e.emptyRun(),entries),actual=e.derive(b,actualPlan(b,entries));
  expect(mechanical(result.progress)).toEqual(mechanical(actual));expect(result.status).toBe('complete');expect(result.progress).toMatchObject({position:'heater',returned:true,kitGains:[2,2]});
  expect(result.steps[3]).toMatchObject({kind:'travel',path:['river','heater'],change:[0,0],newConcepts:[]});
  expect(result.steps[6]).toMatchObject({kind:'explore',path:['heater','sequence'],kitGain:[2,2],usedProjects:['bridge','research']});
  expect(result.steps[7]).toMatchObject({kind:'travel',path:['sequence','heater'],change:[0,0]});expect(result.newContracts).toEqual(['riverroute']);
 });
 it('lets the same construction deliberately preserve different supplies',()=>{
  const b=tabletop(),base=simulatePlan(b,e.emptyRun(),['heater','cloud','river','heater']).run;
  const standard=simulatePlan(b,base,[{id:'research',funding:'standard'}]),exchange=simulatePlan(b,base,[{id:'research',funding:'research'}]);
  expect(standard.progress.balance).toEqual([3,2]);expect(exchange.progress.balance).toEqual([1,3]);expect(exchange.steps[0]).toMatchObject({funding:'research',payment:[5,0]});
  expect(exchange.run.steps['t'+base.turn].funding).toBe('research');expect(standard.newProjects).toEqual(exchange.newProjects);
 });
 it('keeps legacy automatic funding but never silently changes an explicit payment',()=>{
  const b=tabletop(),base=simulatePlan(b,e.emptyRun(),['heater','cloud']).run;
  expect(simulatePlan(b,base,['network']).steps[0].funding).toBe('research');
  expect(simulatePlan(b,base,[{id:'network',funding:'research'}]).progress.balance).toEqual([1,0]);
  for(const entry of [{id:'network'},{id:'network',funding:'standard'},{id:'network',funding:'build'}]){const result=simulatePlan(b,base,[entry]);expect(result.status).toBe('invalid');expect(result.steps).toEqual([]);expect(result.progress.balance).toEqual([4,2]);}
 });
 it('rejects malformed objects, location funding, and exchanges on classic boards',()=>{
  for(const entry of [null,[],{},42,Object.create({id:'heater'}),{id:'heater',funding:'standard'},{id:'heater',funding:'research'},{id:'heater',funding:undefined},{id:'heater',funding:null},{id:'heater',funding:'free'},{id:'heater',extra:true}])expect(simulatePlan(tabletop(),e.emptyRun(),[entry]).status).toBe('invalid');
  expect(simulatePlan(board(),e.emptyRun(),['heater','cloud',{id:'research',funding:'research'}]).status).toBe('invalid');
 });
 it('respects payment reserves and pays a Builder refund only after an affordable build',()=>{
  const b=tabletop({goal:'architect'});b.projects[0].cost=[4,1];b.projects[1].cost=[6,3];b.projects[2].cost=[6,4];const base=simulatePlan(b,e.emptyRun(),['heater','cloud','river','heater']).run;
  expect(simulatePlan(b,base,[{id:'bridge',funding:'research'}]).status).toBe('invalid');
  expect(simulatePlan(b,base,[]).opportunities.find(item=>item.id==='bridge').fundingOptions.find(option=>option.id==='research')).toMatchObject({affordable:true,legal:false,reason:'completion-reserve'});
  const builder=tabletop({expeditionKit:'builder'}),built=simulatePlan(builder,e.emptyRun(),['heater','cloud',{id:'network',funding:'research'}]);expect(built.progress.balance).toEqual([1,2]);expect(built.steps[2].kitGain).toEqual([0,2]);
  builder.locations.find(node=>node.id==='cloud').reward=[0,1];expect(simulatePlan(builder,e.emptyRun(),['heater','cloud',{id:'network',funding:'research'}]).status).toBe('invalid');
 });
 it('previews reachable opportunities with exact bonuses and no travel reward farming',()=>{
  const b=tabletop({expeditionKit:'surveyor',contracts:[{id:'riverroute',title:'River route',description:'Explore the river',locations:['heater','river'],reward:[0,2]}]}),result=simulatePlan(b,e.emptyRun(),['heater','cloud']);
  expect(result.opportunities.find(item=>item.id==='heater')).toMatchObject({kind:'travel',change:[0,0],path:['cloud','heater']});
  const opportunity=result.opportunities.find(item=>item.id==='river');expect(opportunity).toMatchObject({kind:'explore',change:[4,3],newContracts:['riverroute'],kitGain:[2,0]});
  expect(simulatePlan(b,result.run,['river']).steps[0]).toEqual(opportunity);
  const back=simulatePlan(b,result.run,['heater','cloud','heater']);expect(back.steps.every(step=>step.kind==='travel'&&step.change.every(value=>value===0))).toBe(true);
 });
 it('does not mutate frozen choices or read challenge keys, even when offering future moves',()=>{
  const b=tabletop(),base=e.emptyRun(),entries=Object.freeze(['heater','cloud',Object.freeze({id:'network',funding:'research'}),'rain']);
  for(const node of b.locations)for(const field of ['answer','order','controls','explanation'])Object.defineProperty(node,field,{get(){throw Error('Read a solution');}});
  const original=JSON.stringify(base),random=vi.spyOn(Math,'random');try{const result=simulatePlan(b,base,entries);expect(result.steps).toHaveLength(4);expect(result.opportunities.length).toBeGreaterThan(0);expect(result.progress.performance).toEqual({});expect(JSON.stringify(base)).toBe(original);expect(random).not.toHaveBeenCalled();}finally{random.mockRestore();}
 });
});
