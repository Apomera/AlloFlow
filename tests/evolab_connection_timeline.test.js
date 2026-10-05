import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let m;
beforeEach(()=>{resetStemLab();localStorage.clear();loadTool('stem_lab/stem_tool_evolab.js','evoLab');m=window.StemLab.evoArchipelagoModel;});
const options=patch=>({firstBatch:0,trials:8,generation:3,species:'birds',boat:'large',...patch});
describe('recorded connection trajectories and captured study endpoints',()=>{
  it('rebuilds recorded cohorts from matched worlds and keeps the endpoint identical to its repeated-study row',()=>{
    for(const boat of ['small','large'])for(const species of ['birds','plants']){
      const plan=m.connectionStudyPlan(21,options({boat,species,generation:5})),t=m.connectionStudyTimeline(plan,2),cases=m.founderConnections(21,2),row=m.connectionStudyTrial(plan,2);
      expect(t.series.map(f=>f.generation)).toEqual([0,1,2,3,4,5]);expect(t).toMatchObject({version:1,plan,index:2,batch:2});
      for(const f of t.series){const proof=m.founderConnectionComparison(cases,f.generation,species,boat);for(const key of ['isolated','connected']){const e=proof[key];expect(f[key]).toEqual({size:e.cohort.size,p:e.cohort.p,H:e.cohort.H,arrivals:e.arrivalCount,reproducingArrivals:e.reproducingArrivals,incomingCopies:e.incomingCopies,totalCopies:e.totalCopies});}expect(f.diversityDifference).toBe(proof.diversityDifference);expect(f.frequencyDifference).toBe(proof.frequencyDifference);}
      const {generation,...last}=t.series.at(-1),{index,batch,...endpoint}=row;expect(last).toEqual(endpoint);expect(generation).toBe(plan.generation);
    }
  });
  it('keeps G0 round observations undefined and distinguishes six or 24 founders from subsequent established cohorts',()=>{
    for(const boat of ['small','large']){const t=m.connectionStudyTimeline(m.connectionStudyPlan(21,options({boat})),0),g0=t.series[0];expect(g0.isolated).toEqual(g0.connected);expect(g0.isolated.size).toBe(boat==='small'?6:24);expect(g0.isolated.totalCopies).toBe(boat==='small'?12:48);expect(g0.isolated.arrivals).toBeNull();expect(g0.isolated.incomingCopies).toBeNull();expect(g0.diversityDifference).toBe(0);expect(g0.frequencyDifference).toBe(0);for(const f of t.series.slice(1)){expect(f.connected.size).toBe(24);expect(f.connected.totalCopies).toBe(48);expect(Number.isInteger(f.connected.incomingCopies)).toBe(true);expect(f.isolated.incomingCopies).toBe(0);}}
  });
  it('returns only the captured horizon while preserving the exact prefix of a longer matched history',()=>{
    const short=m.connectionStudyTimeline(m.connectionStudyPlan(21,options()),1),long=m.connectionStudyTimeline(m.connectionStudyPlan(21,options({generation:5})),1);expect(short.series).toEqual(long.series.slice(0,4));expect(short.plan.generation).toBe(3);expect(short.series.at(-1).generation).toBe(3);expect(short).toEqual(m.connectionStudyTimeline(JSON.parse(JSON.stringify(short.plan)),1));
  });
  it('contains real changing comparison directions and cases of equal H at different allele frequencies',()=>{
    const plan=m.connectionStudyPlan(21,options({generation:5,trials:24}));let reversal=false,equalHButDifferentP=false;
    for(let i=0;i<24&&!(reversal&&equalHButDifferentP);i++){const t=m.connectionStudyTimeline(plan,i),directions=t.series.filter(f=>Number.isFinite(f.diversityDifference)&&Math.abs(f.diversityDifference)>1e-12).map(f=>Math.sign(f.diversityDifference));reversal ||= directions.some((d,j)=>j>0&&d!==directions[j-1]);equalHButDifferentP ||= t.series.some(f=>Math.abs(f.diversityDifference)<=1e-12&&Math.abs(f.frequencyDifference)>1e-12);}
    expect(reversal).toBe(true);expect(equalHButDifferentP).toBe(true);
  });
  it('rejects invalid scientific contexts and view selections beyond the captured endpoint',()=>{
    const plan=m.connectionStudyPlan(21,options());for(const i of [-1,8,1.5,'0'])expect(m.connectionStudyTimeline(plan,i)).toBeNull();expect(m.connectionStudyTimeline({...plan,version:2},0)).toBeNull();expect(m.connectionStudyTimeline({...plan,generation:0},0)).toBeNull();expect(m.connectionStudyTimeline(null,0)).toBeNull();
    const view={index:1,generation:2,metric:'H'};for(const patch of [{index:-1},{index:8},{generation:-1},{generation:4},{generation:'2'},{metric:'trait'}])expect(m.restoreConnectionTimelineView({...view,...patch},plan)).toBeNull();expect(m.restoreConnectionTimelineView([],plan)).toBeNull();expect(m.restoreConnectionTimelineView(view,{...plan,version:2})).toBeNull();expect(m.restoreConnectionTimelineView({index:7,generation:0,metric:'p'},plan)).toEqual({index:7,generation:0,metric:'p'});
  });
  it('restores bounded view metadata without trusting cached timelines or changing legacy recipes',()=>{
    const plan=m.connectionStudyPlan(21,options()),raw={version:1,plan,complete:true,prediction:'lower',reflection:'Study explanation'};expect(m.restoreConnectionStudy(raw)).toEqual(raw);
    const view={index:2,generation:1,metric:'p'};expect(m.restoreConnectionStudy({...raw,timeline:{...view,series:[{H:999}],worlds:'fabricated'}})).toEqual({...raw,timeline:view});expect(m.restoreConnectionStudy({...raw,timeline:{...view,generation:5}})).toEqual(raw);
  });
  it('keeps the expedition, its next random future and the batch summary unchanged during timeline exploration',()=>{
    const w=m.step(m.create(21)),before=JSON.stringify(w),future=m.step(w),plan=m.connectionStudyPlan(21,options()),rows=Array.from({length:8},(_,i)=>m.connectionStudyTrial(plan,i)),summary=m.connectionStudySummary(rows);
    for(const g of [0,1,3,2]){const view=m.restoreConnectionTimelineView({index:0,generation:g,metric:g%2?'H':'p'},plan),t=m.connectionStudyTimeline(plan,view.index);expect(t.series[view.generation].generation).toBe(g);expect(m.connectionStudySummary(rows)).toEqual(summary);}
    expect(JSON.stringify(w)).toBe(before);expect(m.step(w)).toEqual(future);
  });
});
