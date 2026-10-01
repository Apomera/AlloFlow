import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {cases}=require('../dev-tools/it_coach_benchmark_cases.cjs');
const {production,validBox,iou,diagnostics,summarize,screenHtml}=require('../dev-tools/it_coach_benchmark_core.cjs');
const {reportHtml}=require('../dev-tools/it_coach_benchmark_report.cjs');
const {argumentsOf}=require('../dev-tools/benchmark_it_coach.cjs');
const box={x:.2,y:.2,w:.2,h:.1};
const advice={guidance:'Select captions.',target:box,done:false,kind:'navigation'};
describe('IT coach evaluation corpus',()=>{
  it('has distinct scenarios with resolvable targets and manual rubrics',()=>{
    expect(new Set(cases.map(c=>c.id)).size).toBe(cases.length);
    for(const c of cases){expect(c.expected.length).toBeGreaterThan(30);if(c.target)expect(c.controls.some(b=>b.id===c.target)).toBe(true);}
    expect(cases.some(c=>c.refuse)).toBe(true);expect(cases.some(c=>c.done)).toBe(true);expect(cases.some(c=>c.width===390)).toBe(true);
  });
  it('escapes fictional page content and keeps the rubric out of screenshot HTML',()=>{
    const html=screenHtml({...cases[0],detail:'<script>bad()</script>',expected:'SECRET_RUBRIC'});
    expect(html).not.toContain('<script>bad()');expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('SECRET_RUBRIC');
  });
  it('reuses the production prompt, parser and learner sanitizer without sending answer keys',()=>{
    const p=production();
    try {
      const prompt=p.prompt({...cases[0],expected:'SECRET_RUBRIC',gold:'SECRET_REFERENCE',context:'Tried: restart',history:'Previous step'});
      expect(prompt).toContain('Tried: restart');expect(prompt).toContain('Previous step');expect(prompt).toContain('THE USER IS A STUDENT');
      expect(prompt).not.toContain('SECRET_RUBRIC');expect(prompt).not.toContain('SECRET_REFERENCE');
      expect(p.parse('```json\n'+JSON.stringify(advice)+'\n```')).toEqual(advice);
      expect(p.sanitize({guidance:'The answer is 56.',kind:'content'},{posture:'learner'}).refused).toBe(true);
    } finally {p.close();}
  });
});
describe('objective metrics and honest reporting',()=>{
  it('scores perfect, partial and disjoint boxes independently',()=>{
    expect(iou(box,box)).toBe(1);expect(iou(box,{...box,x:.3})).toBeCloseTo(1/3);expect(iou(box,{...box,x:.8})).toBe(0);
  });
  it.each([null,{}, {x:'0',y:0,w:1,h:1},{x:0,y:0,w:0,h:1},{x:.9,y:0,w:.5,h:.1},{x:NaN,y:0,w:.2,h:.2}])('rejects invalid raw geometry %j',b=>expect(validBox(b)).toBe(false));
  it('does not reward a full-screen guess',()=>expect(diagnostics(advice,{...advice,target:{x:0,y:0,w:1,h:1},refused:false},box,{}).targetCheck).toBe(false));
  it('checks raw schema separately from a sanitizer-corrected target',()=>{
    const r=diagnostics({...advice,target:{...box,x:-1}},{...advice,refused:false},box,{});
    expect(r.schemaValid).toBe(false);expect(r.targetCheck).toBe(true);expect(r.humanReviewRequired).toBe(true);
  });
  it('requires absent highlights for clarification, completion and refusal cases',()=>{
    expect(diagnostics(advice,{...advice,refused:false},null,{}).targetCheck).toBe(false);
    expect(diagnostics({...advice,target:null},{...advice,target:null,refused:false},null,{}).targetCheck).toBe(true);
  });
  const result=(mode='live')=>({runId:'one',mode,cases:[{id:'a',checks:{schemaValid:true,targetCheck:true}},{id:'b',error:'timeout'},{id:'c',checks:null}]});
  it('keeps missing responses and errors in coverage instead of silently dropping them',()=>{
    expect(summarize(result())).toMatchObject({total:3,responses:1,errors:1,pending:1,reviewed:0,humanPassRate:null});
  });
  it('never treats authored reference responses as model accuracy',()=>{
    expect(summarize(result('self-test'),{runId:'one',cases:[{id:'a',verdict:'pass',notes:'Reference fixture'}]}).humanPassRate).toBeNull();
  });
  it('accepts human reviews of browser model replies with explicit coverage',()=>{
    expect(summarize(result('live-browser'),{runId:'one',cases:[{id:'a',verdict:'pass',notes:'Correct safe action'}]})).toMatchObject({humanPassRate:1,reviewed:1,total:3});
  });
  it.each([
    {runId:'wrong',cases:[]},
    {runId:'one',cases:[{id:'missing',verdict:'pass',notes:'x'}]},
    {runId:'one',cases:[{id:'a',verdict:'pass',notes:''}]},
    {runId:'one',cases:[{id:'a',verdict:'pass',notes:'x'},{id:'a',verdict:'fail',notes:'y'}]},
    {runId:'one',cases:[{id:'b',verdict:'pass',notes:'Cannot pass timeout'}]},
    {runId:'one',cases:[{id:'c',verdict:'pass',notes:'Cannot pass pending'}]}
  ])('rejects invalid or mismatched human reviews',r=>expect(()=>summarize(result(),r)).toThrow());
  it('renders model output as text, without executing it in the report',()=>{
    const r={...result('self-test'),model:'<script>bad()</script>',summary:{},cases:[{id:'a',title:'Scenario',rawResponse:'</pre><script>bad()</script>',image:'data:image/jpeg;base64,AA==',prompt:'test'}]};
    expect(reportHtml(r)).not.toContain('<script>bad()');expect(reportHtml(r)).toContain('&lt;script&gt;');
  });
});
describe('explicit benchmark run selection',()=>{
  it('requires a single mode',()=>{expect(()=>argumentsOf([])).toThrow();expect(()=>argumentsOf(['--prepare','--live'])).toThrow();});
  it('rejects missing values and duplicate or unknown switches',()=>{for(const args of [['--out'],['--prepare','--oops'],['--prepare','--prepare']])expect(()=>argumentsOf(args)).toThrow();});
  it('accepts a targeted run without reading credentials into command arguments',()=>expect(argumentsOf(['--live','--model','model-id','--key-env','BENCH_KEY','--case','captions'])).toMatchObject({live:true,model:'model-id','key-env':'BENCH_KEY',case:'captions'}));
});
