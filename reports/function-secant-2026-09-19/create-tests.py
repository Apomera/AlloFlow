from pathlib import Path
p=Path('stem_lab/stem_tool_funcgrapher.js');s=p.read_text(encoding='utf-8')
s=s.replace('No finite two-sided derivative at this point in the supported function model.','No finite derivative value is available from the supported function model. Check the domain, one-sided behavior, and numerical range.')
s=s.replace('The supported function model has no finite two-sided derivative at this point. Compare the one-sided evidence and check the domain.','No finite derivative value is available here. Compare the one-sided evidence and check the domain and numerical range.')
s=s.replace("'stem.funcgrapher.the_derivative_measures_the_rate_of_ch'", "'stem.funcgrapher.derivative_stationary_points_refined'",1)
p.write_text(s,encoding='utf-8');Path('desktop/web-app/public/stem_lab/'+p.name).write_bytes(p.read_bytes())
base=Path('tests/stem_investigation_refinement.test.js').read_text(encoding='utf-8').split("describe('design trial provenance'")[0]
body=r"""
const api=()=>{loadTool('stem_lab/stem_tool_funcgrapher.js','funcGrapher');return window.__alloSecantInvestigation;};
const initial={type:'quadratic',a:1,b:0,c:0,traceX:1};
describe('one-sided secant evidence',()=>{
 it('approaches the quadratic derivative from opposite sides',()=>{
  const result=api().study(x=>x*x,2,1,1);
  expect(result.rows[0]).toMatchObject({left:1,right:3,center:2});
  expect(result.rows[3].left).toBeCloseTo(1.999,9);expect(result.rows[3].right).toBeCloseTo(2.001,9);
 });
 it('exposes the absolute-value corner hidden by a zero centered estimate',()=>{
  const result=api().study(Math.abs,NaN,0,1);
  expect(result.rows.every(row=>row.left===-1&&row.right===1&&row.center===0)).toBe(true);
  expect(result.derivative).toBeNull();
 });
 it('supports a stationary cubic point that is not a turning point',()=>{
  const result=api().study(x=>x*x*x,0,0,1);
  expect(result.rows[0]).toMatchObject({left:1,right:1,center:1});
  expect(result.rows[3].left).toBeCloseTo(1e-6,12);expect(result.derivative).toBe(0);
 });
 it('shows the square-root boundary as one-sided and increasingly steep',()=>{
  const result=api().study(Math.sqrt,NaN,0,1);
  expect(result.rows.every(row=>row.left===null&&row.center===null)).toBe(true);
  expect(result.rows[0].right).toBe(1);expect(result.rows[3].right).toBeCloseTo(Math.sqrt(1000),10);
 });
 it('does not manufacture slopes when the base value is undefined',()=>{
  const result=api().study(x=>1/x,NaN,0,1);
  expect(result.value).toBeNull();expect(result.rows.every(row=>row.left===null&&row.right===null&&row.center===null)).toBe(true);
 });
 it('rejects invalid steps and base points',()=>{
  const helper=api();for(const step of [0,-1,NaN,Infinity])expect(helper.study(x=>x,1,0,step).ok).toBe(false);
  expect(helper.study(x=>x,1,Infinity,1).ok).toBe(false);
 });
 it('discloses coincident sample positions instead of dividing by zero',()=>{
  const result=api().study(x=>x,1,1e16,.1);
  expect(result.rows.every(row=>row.collapsed&&row.left===null&&row.right===null&&row.center===null)).toBe(true);
 });
 it('preserves unavailable slopes when subtraction overflows',()=>{
  const result=api().study(x=>x<=0?-1e308:1e308,NaN,0,1);
  expect(result.rows[0].left).toBe(0);expect(result.rows[0].right).toBeNull();expect(result.rows[0].center).toBeNull();
 });
 it('handles thrown domain errors and complex values',()=>{
  const helper=api();for(const fn of [()=>{throw new Error('domain');},()=>({re:1,im:2})])expect(helper.study(fn,NaN,0,1).value).toBeNull();
 });
 it('exports inputs and reflection without revealing an unchecked derivative',()=>{
  const helper=api(),result=helper.study(x=>x*x,2,1,1);result.context={type:'quadratic',equation:'x²',a:1,b:0,c:0,prediction:'same'};
  const hidden=helper.markdown(result,'The sides approach 2.',false),shown=helper.markdown(result,'The sides approach 2.',true);
  expect(hidden).toContain('Not revealed.');expect(shown).toContain('f′(x₀) = 2');
  expect(shown).toContain('a=1, b=0, c=0');expect(shown).toContain('The sides approach 2.');expect(shown).toContain('actual represented sample spacing');
 });
});
describe('secant investigation workflow',()=>{
 it('requires a prediction and supports derivative reveal and reflection',async()=>{
  const state=await mount('funcGrapher','funcgrapher',initial);
  await click('Compute secant slopes');expect(state().secantNotice).toContain('prediction');
  await input('[data-secant-investigation] select','same');await click('Compute secant slopes');
  expect(document.querySelectorAll('[data-secant-results] tbody tr')).toHaveLength(4);
  expect(document.querySelector('[data-secant-derivative]')).toBeNull();
  await click('Compare with the derivative');expect(document.querySelector('[data-secant-derivative]').textContent).toContain('= 2');
  await input('[data-secant-results] textarea','Both slopes approach 2.');expect(state().secantReflection).toContain('Both slopes');
 });
 it('keeps blank or negative steps from generating evidence',async()=>{
  const state=await mount('funcGrapher','funcgrapher',{...initial,secantPrediction:'same'});
  for(const value of ['', '-1']){await input('[data-secant-investigation] input',value);await click('Compute secant slopes');expect(state().secantResult).toBeUndefined();}
 });
 it('hides stale results and resets reflection and reveal for a fresh calculation',async()=>{
  const state=await mount('funcGrapher','funcgrapher',{...initial,secantPrediction:'same'});
  await click('Compute secant slopes');await click('Compare with the derivative');
  await input('[data-secant-results] textarea','Prior result');
  await input('[data-secant-investigation] input','.5');expect(document.querySelector('[data-secant-results]')).toBeNull();
  await click('Compute secant slopes');expect(state().secantReveal).toBe(false);expect(state().secantReflection).toBe('');
  expect(state().secantResult.firstStep).toBe(.5);
 });
 it('treats a corner differently from a flat derivative in the visible comparison',async()=>{
  await mount('funcGrapher','funcgrapher',{type:'absolute',a:1,b:0,c:0,traceX:0,secantPrediction:'different'});
  await click('Compute secant slopes');await click('Compare with the derivative');
  expect(document.querySelector('[data-secant-derivative]').textContent).toContain('No finite derivative value is available');
 });
});
"""
Path('tests/funcgrapher_secant_investigation.test.js').write_text(base+body,encoding='utf-8')
print('Added 14 numerical and interaction regression tests.')
