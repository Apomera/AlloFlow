import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let m;
beforeEach(() => { resetStemLab(); localStorage.clear(); loadTool('stem_lab/stem_tool_evolab.js', 'evoLab'); m = window.StemLab.evoArchipelagoModel; });
const rows = values => values.map((v,index) => ({ index, batch:index, diversityDifference:v, isolated:{ H:v===null?null:.25 }, connected:{ H:v===null?null:.25+v } }));
const draft = patch => ({ claim:'higher', matching:0, counterexample:1, conclusion:null, checked:false, ...patch });

describe('connection caseboards and bounded scientific conclusions', () => {
  it('classifies strict always claims using full precision differences, treating equality as an exception to higher or lower', () => {
    const r=rows([.000001,-.000001,0,null]);
    expect(m.connectionClaimEvidence(r,'higher')).toEqual({claim:'higher',total:4,defined:3,matching:[0],counterexamples:[1,2],undefinedRows:[3],status:'exception-observed'});
    expect(m.connectionClaimEvidence(r,'lower').matching).toEqual([1]); expect(m.connectionClaimEvidence(r,'same').matching).toEqual([2]); expect(m.connectionClaimEvidence(r,'same').counterexamples).toEqual([0,1]);
    expect(m.connectionClaimEvidence(r,'always better')).toBeNull(); expect(m.connectionClaimEvidence(null,'higher')).toBeNull(); expect(m.connectionClaimEvidence(rows(Array(25).fill(0)),'same')).toBeNull();
  });
  it('finds actual matching and counterexample rows without changing the expedition or its next random future', () => {
    const w=m.step(m.create(21)), before=JSON.stringify(w), next=m.step(w), plan=m.connectionStudyPlan(21,{firstBatch:0,trials:8,generation:3,species:'birds',boat:'large'}), r=Array.from({length:8},(_,i)=>m.connectionStudyTrial(plan,i)), e=m.connectionClaimEvidence(r,'higher');
    expect(e.matching).toEqual([1,3,6,7]); expect(e.counterexamples).toEqual([0,2,4,5]); expect(e.defined).toBe(8); for(const i of e.matching)expect(r[i].diversityDifference).toBeGreaterThan(0); for(const i of e.counterexamples)expect(r[i].diversityDifference).toBeLessThanOrEqual(0);
    expect(JSON.stringify(w)).toBe(before); expect(m.step(w)).toEqual(next);
  });
  it('accepts only bounded recipe metadata, ignores fabricated results and preserves legacy recipes without extra fields', () => {
    const plan=m.connectionStudyPlan(21,{trials:8,generation:3,species:'birds',boat:'large'}), raw={version:1,plan,complete:true,prediction:'lower',reflection:'Retained explanation'};
    expect(m.restoreConnectionStudy(raw)).toEqual(raw);
    const board=draft({conclusion:'bounded',checked:true,fabricatedCorrect:true,matching:99}); expect(m.restoreConnectionStudy({...raw,caseboard:board,rows:rows([999])}).caseboard).toEqual(draft({matching:null,conclusion:'bounded',checked:true}));
    expect(m.restoreConnectionCaseboard([],8)).toBeNull(); expect(m.restoreConnectionCaseboard(draft({claim:'genome-wide'}),8)).toBeNull(); expect(m.restoreConnectionCaseboard(draft(),25)).toBeNull(); expect(m.restoreConnectionCaseboard(draft({matching:'0',counterexample:-1,conclusion:'perfect',checked:'true'}),8)).toEqual(draft({matching:null,counterexample:null}));
  });
  it('revalidates pin roles from recomputed rows instead of trusting saved classifications', () => {
    const r=rows([.1,-.1,0]); let x=m.connectionCaseboardEvidence(r,draft({matching:1,counterexample:0,conclusion:'bounded',checked:true})); expect(x.board).toEqual(draft({matching:null,counterexample:null,conclusion:'bounded',checked:true})); expect(x.stepsComplete).toBe(1);
    x=m.connectionCaseboardEvidence(r,draft({claim:'lower',matching:0,counterexample:1})); expect(x.board.matching).toBeNull();expect(x.board.counterexample).toBeNull(); expect(m.connectionCaseboardEvidence(r,draft({claim:'same',matching:2,counterexample:0})).stepsComplete).toBe(2);
    expect(m.connectionCaseboardEvidence(rows([0]),draft())).toBeNull();
  });
  it('distinguishes observations in one batch from proof about all possible draws, including absent and undefined categories', () => {
    const observed=m.connectionCaseboardEvidence(rows([.1,.2]),draft({matching:0,counterexample:null,conclusion:'universal',checked:true})); expect(observed.evidence.status).toBe('observed-only'); expect(observed.conclusionCorrect).toBe(false); expect(observed.stepsComplete).toBe(2);
    const undefinedOnly=m.connectionCaseboardEvidence(rows([null,null]),draft({matching:null,counterexample:null,conclusion:'bounded',checked:true})); expect(undefinedOnly.evidence.status).toBe('undefined'); expect(undefinedOnly.evidence.defined).toBe(0); expect(undefinedOnly.stepsComplete).toBe(3);
    const noMatching=m.connectionCaseboardEvidence(rows([0,-.1]),draft({matching:0,counterexample:1})); expect(noMatching.board.matching).toBeNull(); expect(noMatching.evidence.matching).toEqual([]); expect(noMatching.stepsComplete).toBe(2);
  });
  it('checks conclusion scope only after an explicit check and never treats one exception as invalidating the mean', () => {
    const r=rows([.2,-.01,.1]), mean=m.connectionStudySummary(r).difference.mean;
    expect(mean).toBeGreaterThan(0); const exception=m.connectionCaseboardEvidence(r,draft({conclusion:'mean-invalid',checked:true})); expect(exception.evidence.status).toBe('exception-observed'); expect(exception.conclusionCorrect).toBe(false); expect(m.connectionStudySummary(r).difference.mean).toBe(mean);
    expect(m.connectionCaseboardEvidence(r,draft({conclusion:'bounded'})).conclusionCorrect).toBeNull(); expect(m.connectionCaseboardEvidence(r,draft({conclusion:null,checked:true})).board.checked).toBe(false); expect(m.connectionCaseboardEvidence(r,draft({conclusion:'bounded',checked:true})).stepsComplete).toBe(3);
  });
  it('deterministically rebuilds pin evidence from a saved scientific context, ignoring cached scores or outcomes', () => {
    const plan=m.connectionStudyPlan(21,{firstBatch:0,trials:8,generation:3,species:'birds',boat:'large'}), saved=m.restoreConnectionStudy({version:1,plan,complete:true,prediction:'lower',reflection:'Evidence notes',caseboard:draft({matching:1,counterexample:0,conclusion:'bounded',checked:true}),score:100,rows:rows([999])});
    const replay=()=>m.connectionCaseboardEvidence(Array.from({length:plan.trials},(_,i)=>m.connectionStudyTrial(saved.plan,i)),saved.caseboard); expect(replay()).toEqual(replay()); expect(replay()).toMatchObject({board:saved.caseboard,stepsComplete:3,conclusionCorrect:true});
  });
});
