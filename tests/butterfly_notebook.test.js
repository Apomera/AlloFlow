import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab,React,ReactDOMServer} from './helpers/stem_widgets_smoke_harness.js';

let BF;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');BF=window.__RR_TEST_EXPORTS__.butterfly;});
function examine(s,id){const p=BF.habitats(s).find(p=>p.id===id);Object.assign(s,{x:p.x,z:p.z});BF.land(s);BF.observe(s);}
function generation(s,id){expect(BF.layEggs(s,id,'complete').ok).toBe(true);while(BF.advanceStage(s).ok){}expect(BF.broodResult(s).ok).toBe(true);}
function compare(){const s=BF.freshState();examine(s,'milkweed');examine(s,'bergamot');generation(s,'milkweed');generation(s,'bergamot');return s;}

describe('Butterfly evidence notebook',()=>{
 it('restores earlier saves with an empty notebook, and preserves writing and citations independently',()=>{
   const s=compare();s.notebook={claim:'needs-both',interpretation:'supports',evidence:['brood:milkweed','brood:bergamot'],reasoning:'The milkweed patch carried the generation through. Bergamot alone did not.',question:'What changes when the same patch is cut?'};
   const saved=BF.save(s),restored=BF.freshState(JSON.parse(JSON.stringify(saved)));
   expect(saved.version).toBe(6);expect(restored.notebook).toEqual(s.notebook);expect(BF.notebookReady(restored)).toBe(true);
   saved.notebook.evidence.push('patch:lawn');expect(s.notebook.evidence).toHaveLength(2);
   expect(BF.freshState({version:4,observations:['milkweed']}).notebook.evidence).toEqual([]);
 });

 it('requires actual citations and writing, while allowing an uncertain interpretation',()=>{
   const s=compare();s.notebook={claim:'needs-both',interpretation:'unsure',evidence:['brood:milkweed'],reasoning:'I need another comparison.',question:''};
   expect(BF.notebookReady(s)).toBe(false);
   s.notebook.evidence.push('brood:bergamot');expect(BF.notebookReady(s)).toBe(true);
   s.notebook.reasoning='  \n ';expect(BF.notebookReady(s)).toBe(false);
 });

 it('marks citations from an earlier planting unavailable without deleting learner reasoning or historical records',()=>{
   const s=compare();BF.applyPlan(s,'mixed','both');examine(s,'restoration');
   s.notebook={claim:'needs-both',interpretation:'supports',evidence:['patch:milkweed','patch:restoration:mixed'],reasoning:'Both examined patches supplied host leaves.',question:''};
   expect(BF.notebookReady(s)).toBe(true);
   BF.applyPlan(s,'flowers','nectar');
   expect(BF.notebookEvidence(s).selected.map(x=>x.id)).toEqual(['patch:milkweed']);
   expect(BF.notebookEvidence(s).missing).toEqual(['patch:restoration:mixed']);expect(BF.notebookReady(s)).toBe(false);
   expect(BF.freshState(BF.save(s)).notebook.reasoning).toBe(s.notebook.reasoning);
   const report=BF.fieldReport(s);expect(report).toContain('Review needed: 1');expect(report).toContain('Milkweed + bergamot: nectar present');
   expect(report.split('MY CONCLUSION')[1]).not.toContain('Restoration plot [Milkweed + bergamot]');
 });

 it('exports learner notes separately from the generated record text, including unfinished writing',()=>{
   const s=BF.freshState();s.notebook.reasoning='My first question is which leaves caterpillars use.';
   expect(BF.reportIsEmpty(s)).toBe(false);
   const report=BF.fieldReport(s);expect(report).toContain('MY CONCLUSION — LEARNER NOTES');expect(report).toContain('Claim: not chosen yet');
   expect(report).toContain(s.notebook.reasoning);expect(report).toContain('not an automatically verified conclusion');
 });

 it('bounds malformed saved writing and treats unknown citations as unavailable, never as evidence',()=>{
   const s=BF.freshState({notebook:{claim:'__proto__',interpretation:{},evidence:['patch:milkweed','patch:milkweed',null,'<script>','patch:unknown'],reasoning:'a'.repeat(3000),question:7}});
   expect(s.notebook.claim).toBe('');expect(s.notebook.interpretation).toBe('');expect(s.notebook.reasoning).toHaveLength(1600);expect(s.notebook.question).toBe('');
   expect(s.notebook.evidence).toEqual(['patch:milkweed','patch:unknown']);expect(BF.notebookEvidence(s).selected).toEqual([]);
   const ctx={React,toolData:{butterfly:BF.save(s)},updateMulti(){}};
   const html=ReactDOMServer.renderToStaticMarkup(window.StemLab._registry.butterfly.render(ctx));
   expect(html).not.toContain('[object Object]');expect(html).toContain('Remove unavailable citations');
   const clean=BF.cleanNotebook({evidence:Array.from({length:40},(_,i)=>'patch:'+String.fromCharCode(97+i))});expect(clean.evidence.length).toBeLessThanOrEqual(8);
 });

 it('keeps a timing citation available when additional seasons are run or rerun',()=>{
   const s=compare();BF.runSeason(s,'milkweed','never','complete');BF.runSeason(s,'milkweed','early','stop');
   s.notebook={claim:'timing-irrelevant',interpretation:'challenges',evidence:['patch:milkweed','timing:milkweed:never:early'],reasoning:'The same plants gave different results when cut earlier.',question:''};
   expect(BF.notebookReady(s)).toBe(true);
   BF.runSeason(s,'milkweed','mid','stop');BF.runSeason(s,'milkweed','early','stop');
   expect(BF.notebookReady(s)).toBe(true);expect(BF.notebookEvidence(s).missing).toEqual([]);
   expect(BF.notebookEvidence(BF.freshState(BF.save(s))).selected.some(line=>line.id==='timing:milkweed:never:early')).toBe(true);
 });

 it('discards impossible saved outcomes using the recorded planting, while retaining valid historical results',()=>{
   const s=BF.freshState({restoration:{design:'flowers'},lifecycle:{broods:[
     {patch:'lawn',prediction:'complete',result:'complete'},
     {patch:'restoration',plan:'flowers',prediction:'complete',result:'complete'},
     {patch:'restoration',plan:'mixed',prediction:'complete',result:'complete'}]},season:{runs:[
     {patch:'milkweed',mowing:'early',prediction:'complete',result:'complete'},
     {patch:'restoration',plan:'flowers',mowing:'never',prediction:'complete',result:'complete'},
     {patch:'restoration',plan:'mixed',mowing:'never',prediction:'complete',result:'complete'}]}});
   expect(s.lifecycle.broods).toHaveLength(1);expect(s.lifecycle.broods[0].plan).toBe('mixed');
   expect(s.season.runs).toHaveLength(1);expect(s.season.runs[0].plan).toBe('mixed');
   expect(BF.notebookEvidence(s).available).toEqual([]);expect(BF.fieldReport(s)).toContain('this planting has since been replaced');
 });

 it('recovers a running generation with a missing prediction and never writes a crashing brood record',()=>{
   const s=BF.freshState({observations:['milkweed'],lifecycle:{patch:'milkweed',stage:'adult'}});
   expect(s.lifecycle.stage).toBeNull();expect(BF.broodResult(s).ok).toBe(false);expect(s.lifecycle.broods).toEqual([]);
   s.lifecycle.stage='adult';expect(BF.broodResult(s).ok).toBe(false);expect(s.lifecycle.broods).toEqual([]);
 });
});

describe('Butterfly investigation guide',()=>{
 it('never counts visits or an applied but unexamined plan as completed work',()=>{
   const s=BF.freshState();expect(BF.investigationSteps(s).next.id).toBe('explore');
   for(const p of BF.plants){Object.assign(s,{x:p.x,z:p.z});BF.land(s);}
   BF.applyPlan(s,'mixed','both');expect(BF.investigationSteps(s).completed).toBe(0);
   for(const p of BF.plants)examine(s,p.id);
   expect(BF.investigationSteps(s).next.id).toBe('design');
 });
 it('builds progress from contrasting experiments and a notebook, then reopens stale work after replanting',()=>{
   const s=compare();examine(s,'lawn');
   BF.applyPlan(s,'flowers','nectar');examine(s,'restoration');BF.applyPlan(s,'mixed','both');examine(s,'restoration');
   BF.runSeason(s,'milkweed','never','complete');BF.runSeason(s,'milkweed','early','stop');
   s.notebook={claim:'needs-both',interpretation:'supports',evidence:['patch:milkweed','patch:restoration:mixed'],reasoning:'I compared the recorded leaves and generation outcomes.',question:''};
   const guide=BF.investigationSteps(s);expect(guide.completed).toBe(5);expect(guide.next).toBeNull();
   BF.applyPlan(s,'lawn','neither');expect(BF.investigationSteps(s).completed).toBe(4);expect(BF.investigationSteps(s).next.id).toBe('notebook');
 });
});
