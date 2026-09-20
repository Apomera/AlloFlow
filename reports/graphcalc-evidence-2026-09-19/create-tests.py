from pathlib import Path
prefix=Path('tests/stem_investigation_refinement.test.js').read_text(encoding='utf-8').split("describe('design trial provenance'")[0]
body=r"""
const analysis=()=>{loadTool('stem_lab/stem_tool_graphcalc.js','graphCalc');return window.__alloGraphAnalysis;};
afterEach(()=>vi.unstubAllGlobals());
function mathEngine(){
 const expressions={'x^2-1':scope=>scope.x*scope.x-1,'0':()=>0,'a*x':scope=>scope.a*scope.x,'1':()=>1,'sqrt(x)':scope=>Math.sqrt(scope.x)};
 vi.stubGlobal('math',{compile:expression=>{if(!expressions[expression])throw new Error('Unknown fixture expression');return {evaluate:expressions[expression]};}});
}
describe('nearby numerical evidence',()=>{
 it('samples both sides at two distances and preserves signed values',()=>{
  const r=analysis().inspect(x=>x,0,.1,-1,1);
  expect(r.rows.map(row=>row.x)).toEqual([-.1,-.010000000000000002,0,.010000000000000002,.1]);
  expect(r.rows[0].difference).toBeLessThan(0);expect(r.rows[4].difference).toBeGreaterThan(0);
  expect(r.complete).toBe(true);expect(r.finite).toBe(true);
 });
 it('keeps same-sign evidence around a touching root without inferring a crossing',()=>{
  const r=analysis().inspect(x=>(x-.12345)**2,.12345,.01,-1,1);
  expect(r.rows[2].first).toBe(0);
  expect(r.rows.filter((row,i)=>i!==2).every(row=>row.first>0)).toBe(true);
 });
 it('evaluates both functions and their signed difference for an intersection',()=>{
  const r=analysis().inspect(x=>x*x,1,.01,0,2,()=>1);
  expect(r.rows[2]).toMatchObject({first:1,second:1,difference:0});
  expect(r.rows[0].difference).toBeLessThan(0);expect(r.rows[4].difference).toBeGreaterThan(0);
 });
 it('clips endpoint probes and reports coincident positions',()=>{
  const r=analysis().inspect(Math.sqrt,0,.1,0,4);
  expect(r.rows).toHaveLength(3);expect(r.rows[0].x).toBe(0);expect(r.complete).toBe(false);
  expect(r.rows.every(row=>row.x>=0&&row.x<=4)).toBe(true);
 });
 it('does not turn exceptions, complex values or infinities into zero',()=>{
  const api=analysis();
  for(const fn of [()=>{throw new Error('domain');},()=>({re:1,im:2}),()=>Infinity]){
   const r=api.inspect(fn,0,.1,-1,1);expect(r.rows.every(row=>row.first===null&&row.difference===null)).toBe(true);expect(r.finite).toBe(false);
  }
 });
 it('reports overflow in a difference even when each function value is finite',()=>{
  const r=analysis().inspect(()=>1e308,0,.1,-1,1,()=>-1e308);
  expect(r.rows[2]).toMatchObject({first:1e308,second:-1e308,difference:null});expect(r.finite).toBe(false);
 });
 it('deduplicates probes below machine precision',()=>{
  const r=analysis().inspect(x=>x,1e16,.1,1e16-4,1e16+4);
  expect(r.rows).toHaveLength(1);expect(r.complete).toBe(false);
 });
 it('rejects invalid or out-of-window candidate positions',()=>{
  const api=analysis();
  expect(api.inspect(x=>x,3,.1,-1,1).error).toBeTruthy();
  expect(api.inspect(x=>x,0,0,-1,1).error).toBeTruthy();
  expect(api.inspect(x=>x,NaN,.1,-1,1).rows).toEqual([]);
 });
 it('takes an independent snapshot of expressions, interval, and slider parameters',()=>{
  const api=analysis(),funcs=[{expr:'a*x'},{expr:'1'}],win={xmin:-2,xmax:2},state={sliderA:2,sliderB:0};
  const context=api.context(funcs,win,state);funcs[0].expr='x';win.xmin=-10;state.sliderA=3;
  expect(context).toMatchObject({expressions:['a*x','1'],interval:[-2,2],parameters:{a:2,b:0}});
 });
 it('exports reproducible inputs, methods, domain gaps, and selected probes',()=>{
  const api=analysis(),context=api.context([{expr:'sqrt(x)'}],{xmin:-1,xmax:1},{sliderA:0});
  const evidence={...api.inspect(Math.sqrt,0,.1,-1,1),label:'Zero 1'};
  const text=api.markdown(context,[{x:0,residual:0,method:'sample zero'}],[],{invalidEvaluations:250},evidence);
  expect(text).toContain('sqrt(x)');expect(text).toContain('a = 0');expect(text).toContain('[-1, 1]');
  expect(text).toContain('250');expect(text).toContain('Unavailable');expect(text).toContain('Nearby-value inspection');expect(text).toContain('not proof');
 });
 it('exports sampled overlap as a limitation rather than a finite intersection list',()=>{
  const text=analysis().markdown({expressions:['x','x'],interval:[-1,1]},[],[],{overlapComparisons:[2],zeroThroughoutSamples:true});
  expect(text).toContain('not proof of identical functions');expect(text).toContain('no isolated-root list is inferred');
 });
});
describe('candidate inspection controls',()=>{
 it('inspects a candidate and moves the trace without changing the evidence inputs',async()=>{
  mathEngine();const state=await mount('graphCalc','graphcalc',{funcs:[{expr:'x^2-1',color:'#2563eb'},{expr:'0',color:'#b91c1c'}]});
  const analyzeButton=[...document.querySelectorAll('button')].find(el=>el.textContent.includes('Analyze'));
  await React.act(()=>analyzeButton.click());
  await input('[data-candidate-inspector] select','zero-0');
  expect(document.querySelectorAll('[data-candidate-values] li')).toHaveLength(5);
  await click('Trace selected candidate');expect(state().traceMode).toBe(true);expect(state().traceX).toBeCloseTo(-1);
  expect(state()._analysisContext.expressions).toEqual(['x^2-1','0']);
 });
 it('hides inspection and export when parameters change and refreshes their provenance on Analyze',async()=>{
  mathEngine();let update;const tool=loadTool('stem_lab/stem_tool_graphcalc.js','graphCalc');
  function App(){const [state,setState]=React.useState({graphCalc:{funcs:[{expr:'a*x',color:'#2563eb'},{expr:'1',color:'#b91c1c'}],sliderA:2}});update=setState;return tool.render(makeCtx({toolData:state,setToolData:setState}));}
  root=ReactDOMClient.createRoot(document.getElementById('root'));await React.act(()=>root.render(React.createElement(App)));
  const run=async()=>{await React.act(()=>[...document.querySelectorAll('button')].find(el=>el.textContent.includes('Analyze')).click());};
  await run();await input('[data-candidate-inspector] select','intersection-0');
  expect(document.querySelector('[data-candidate-values]').textContent).toContain('f2(x)');
  await React.act(()=>update(prev=>({graphCalc:{...prev.graphCalc,sliderA:3}})));
  expect(document.querySelector('[data-candidate-inspector]')).toBeNull();
  await run();expect(document.querySelector('[data-candidate-inspector] select').value).toBe('');
 });
});
"""
Path('tests/graphcalc_candidate_evidence.test.js').write_text(prefix+body,encoding='utf-8')
print('Added candidate evidence helper and interaction tests.')
