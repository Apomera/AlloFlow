import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let BF;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');BF=window.__RR_TEST_EXPORTS__.butterfly;});
function land(s,id='bergamot'){
  const p=BF.habitats(s).find(p=>p.id===id);Object.assign(s,{x:p.x,z:p.z});expect(BF.land(s).ok).toBe(true);return s;
}
function record(s,contact){expect(BF.recordPollination(s,'deposit',1,contact).ok).toBe(true);}
function pair(s,id='bergamot'){land(s,id);record(s,true);record(s,false);return s;}

describe('Student-recorded model pollination visits',()=>{
  it('opens old and fresh saves with no phantom records, including after watching and scrubbing',()=>{
    for(const saved of [undefined,{version:5,observations:['milkweed']},{version:4,pollination:null}]){
      const s=BF.freshState(saved);expect(s.pollination).toEqual({visits:[]});land(s,'milkweed');
      const before=JSON.stringify(s),v=BF.feedingVisual(s);
      for(const phase of ['sip','carry','deposit'])for(const progress of [0,.5,1])for(const contact of [true,false]){
        BF.feedingMoment(phase,progress,true);BF.feedingOutcome(v,phase,progress,contact);BF.feedingCamera(v,phase,1,'pollen',progress,true,contact);
      }
      expect(JSON.stringify(s)).toBe(before);expect(BF.save(s).pollination).toEqual({visits:[]});
      expect(BF.evidenceFor(s).lines.filter(row=>row.kind==='pollination')).toEqual([]);
    }
    expect(BF.reportIsEmpty(BF.freshState())).toBe(true);
    expect(BF.fieldReport(BF.freshState())).not.toContain('POLLINATION VISITS RECORDED');
  });

  it('requires an exact completed final step, a boolean contact case and a landed nectar patch',()=>{
    const s=BF.freshState();expect(BF.recordPollination(s,'deposit',1,true).ok).toBe(false);land(s,'lawn');
    expect(BF.recordPollination(s,'deposit',1,true).ok).toBe(false);land(s);
    const before=JSON.stringify(s);
    for(const progress of [undefined,null,NaN,Infinity,-Infinity,-1,0,.75,.999999,1.01,2,'1'])expect(BF.recordPollination(s,'deposit',progress,true).ok).toBe(false);
    for(const phase of ['sip','carry','unknown',null])expect(BF.recordPollination(s,phase,1,true).ok).toBe(false);
    for(const contact of [undefined,null,0,1,'true',{}])expect(BF.recordPollination(s,'deposit',1,contact).ok).toBe(false);
    expect(JSON.stringify(s)).toBe(before);expect(BF.recordPollination(s,'deposit',1,false).ok).toBe(true);
  });

  it('records only pollination data, with no examine prerequisite or changes to energy, time and generations',()=>{
    const s=land(BF.freshState(),'milkweed');Object.assign(s,{clock:37,energy:43});
    const before=JSON.parse(JSON.stringify(s));record(s,true);
    expect(s.pollination.visits).toEqual([{patch:'milkweed',species:'milkweed',contact:true}]);
    expect({...s,pollination:before.pollination}).toEqual(before);expect(s.observations).toEqual([]);
    expect(s.restoration.trials).toEqual([]);expect(BF.reportIsEmpty(s)).toBe(false);
    expect(BF.investigationSteps(s).steps).toHaveLength(5);expect(BF.investigationSteps(s).completed).toBe(0);
  });

  it('rejects duplicate cases without inflating records or changing an earlier observation when playback changes',()=>{
    const s=land(BF.freshState());record(s,true);const before=JSON.stringify(s);
    const duplicate=BF.recordPollination(s,'deposit',1,true);expect(duplicate.ok).toBe(false);expect(duplicate.message).toMatch(/already recorded/);
    expect(JSON.stringify(s)).toBe(before);BF.feedingOutcome(BF.feedingVisual(s),'deposit',0,false);
    expect(s.pollination.visits[0].contact).toBe(true);record(s,false);expect(s.pollination.visits).toHaveLength(2);
    expect(BF.pollinationPairs(s)).toEqual([{patch:'bergamot',species:'bergamot',contact:s.pollination.visits[0],miss:s.pollination.visits[1]}]);
  });

  it('rejects malformed and impossible saved patch, planting, species and contact combinations',()=>{
    const good={patch:'restoration',plan:'mixed',species:'bergamot',contact:false};
    const cleaned=BF.cleanPollination({visits:[null,{},[],
      {patch:'__proto__',species:'bergamot',contact:true},
      {patch:'lawn',species:'bergamot',contact:true},
      {patch:'milkweed',plan:'mixed',species:'milkweed',contact:true},
      {patch:'milkweed',species:'bergamot',contact:true},
      {patch:'bergamot',species:'milkweed',contact:true},
      {patch:'bergamot',species:'bergamot',contact:'false'},
      {patch:'restoration',species:'bergamot',contact:true},
      {patch:'restoration',plan:'lawn',species:'bergamot',contact:true},
      {patch:'restoration',plan:'mixed',species:'milkweed',contact:true},
      {patch:'restoration',plan:'__proto__',species:'bergamot',contact:true},
      {...good,result:'seeds',received:999,progress:0,caption:'invented'},good]});
    expect(cleaned).toEqual({visits:[good]});
    expect(BF.cleanPollination({visits:'not an array'})).toEqual({visits:[]});
    expect(BF.pollinationIsCurrent(BF.freshState(),{patch:'unknown',contact:true})).toBe(false);
  });

  it('bounds repeated hostile saved records, strips extra claims and deep-copies valid save rows',()=>{
    const visits=[];
    for(let i=0;i<20;i++)for(const contact of [true,false])for(const [patch,plan,species] of [['milkweed',null,'milkweed'],['bergamot',null,'bergamot'],['restoration','flowers','bergamot'],['restoration','mixed','bergamot']]){
      visits.push({patch,plan,species,contact,seedCount:9000});
    }
    const s=BF.freshState({pollination:{visits},restoration:{design:'mixed'}});expect(s.pollination.visits).toHaveLength(8);
    expect(new Set(s.pollination.visits.map(row=>row.patch+':'+row.plan+':'+row.contact)).size).toBe(8);
    const saved=BF.save(s);expect(saved.version).toBe(6);expect(BF.freshState(saved).pollination).toEqual(s.pollination);
    saved.pollination.visits[0].contact=!saved.pollination.visits[0].contact;saved.pollination.visits.push({patch:'lawn'});
    expect(saved.pollination).not.toEqual(s.pollination);expect(s.pollination.visits).toHaveLength(8);expect(JSON.stringify(s.pollination)).not.toContain('seedCount');
  });

  it('tests the feeding claim only after both cases at the same current patch and planting',()=>{
    const s=land(BF.freshState(),'milkweed');record(s,true);land(s,'bergamot');record(s,false);
    expect(BF.judgeClaim(s,'feeding-always-pollinates').tested).toBe(false);
    expect(BF.judgeClaim(s,'feeding-always-pollinates').nextStep).toMatch(/same flowering patch/);
    record(s,true);const verdict=BF.judgeClaim(s,'feeding-always-pollinates');expect(verdict.tested).toBe(true);
    expect(verdict.claim.sound).toBe(false);expect(verdict.verdict).toBe('Your records do not support that claim.');expect(verdict.why).toContain('still sipped nectar');
    for(const id of ['nectar-enough','needs-both','green-enough','timing-irrelevant'])expect(BF.judgeClaim(s,id).tested).toBe(false);
    expect(BF.evidenceFor(s).broods).toBe(0);expect(BF.evidenceFor(s).seasons).toBe(0);
  });

  it('keeps restoration records tied to their planting and does not pair contacts across designs',()=>{
    const s=BF.freshState();BF.applyPlan(s,'flowers','nectar');land(s,'restoration');record(s,true);
    BF.applyPlan(s,'mixed','both');land(s,'restoration');record(s,false);
    expect(s.pollination.visits.every(row=>row.species==='bergamot')).toBe(true);expect(BF.pollinationPairs(s)).toEqual([]);
    expect(BF.currentPollinationVisits(s)).toEqual([{patch:'restoration',plan:'mixed',species:'bergamot',contact:false}]);
    record(s,true);expect(BF.pollinationPairs(s)).toHaveLength(1);expect(BF.pollinationPairs(s)[0].plan).toBe('mixed');
    BF.applyPlan(s,'lawn','neither');expect(BF.currentPollinationVisits(s)).toEqual([]);expect(BF.pollinationPairs(s)).toEqual([]);
    expect(BF.judgeClaim(s,'feeding-always-pollinates').tested).toBe(false);expect(s.pollination.visits).toHaveLength(3);
    expect(BF.fieldReport(s)).toContain('this planting has since been replaced');expect(BF.reportIsEmpty(s)).toBe(false);
  });

  it('uses stable citable evidence IDs and flags replaced planting citations without deleting learner notes',()=>{
    const s=BF.freshState();BF.applyPlan(s,'mixed','both');pair(s,'restoration');
    const ids=['pollination:restoration:mixed:contact','pollination:restoration:mixed:miss'];
    expect(BF.evidenceFor(s).lines.map(row=>row.id)).toEqual(ids);expect(BF.evidenceFor(s).lines.every(row=>row.kind==='pollination')).toBe(true);
    s.notebook=BF.cleanNotebook({claim:'feeding-always-pollinates',interpretation:'challenges',evidence:[...ids,ids[0]],reasoning:'Both visits fed the butterfly; only contact moved pollen.'});
    expect(s.notebook.evidence).toEqual(ids);expect(BF.notebookReady(s)).toBe(true);expect(BF.freshState(BF.save(s)).notebook).toEqual(s.notebook);
    BF.applyPlan(s,'flowers','nectar');expect(BF.notebookEvidence(s).selected).toEqual([]);expect(BF.notebookEvidence(s).missing).toEqual(ids);
    expect(BF.notebookReady(s)).toBe(false);expect(s.notebook.reasoning).toContain('Both visits');expect(s.pollination.visits).toHaveLength(2);
  });

  it('exports only explicitly recorded model cases with species, contact result and planting status',()=>{
    const s=pair(BF.freshState(),'milkweed'),report=BF.fieldReport(s);
    expect(report).toContain('POLLINATION VISITS RECORDED (2)');expect(report).toContain('Common milkweed');
    expect(report).toContain('Contact: nectar was sipped and pollen reached');expect(report).toContain('Missed contact: nectar was sipped');
    expect(report).toContain('not fertilization or guaranteed seed development');expect(report).toContain('PATCHES EXAMINED (0 of 3)');
    expect(BF.evidenceFor(s).lines.map(row=>row.id)).toEqual(['pollination:milkweed:contact','pollination:milkweed:miss']);
    expect(BF.evidenceFor(s).lines[1].text).toContain('stayed on the butterfly');
  });
});
