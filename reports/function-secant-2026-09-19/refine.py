from pathlib import Path
p=Path('stem_lab/stem_tool_funcgrapher.js');s=p.read_text(encoding='utf-8')
s=s.replace('center:base===null?null:slope(left,right,rightX-leftX)', 'center:base===null||leftX===x||rightX===x?null:slope(left,right,rightX-leftX)',1)
anchor='                  var result=fgSecantStudy(evalF,traceSlope,traceX,step);'
s=s.replace(anchor,"                  if(current){set({secantNotice:'These inputs are already calculated. Change the step, trace point, function, or prediction to investigate another case.'});return;}\n"+anchor,1)
p.write_text(s,encoding='utf-8');Path('desktop/web-app/public/stem_lab/'+p.name).write_bytes(p.read_bytes())
p=Path('tests/funcgrapher_secant_investigation.test.js');s=p.read_text(encoding='utf-8');anchor=" it('preserves unavailable slopes when subtraction overflows'"
pos=s.index(anchor);s=s[:pos]+""" it('does not label an asymmetrically collapsed probe as a centered slope',()=>{
  const row=api().study(x=>x,1,1,1e-16).rows[0];
  expect(row.left).toBe(1);expect(row.right).toBeNull();expect(row.center).toBeNull();expect(row.collapsed).toBe(true);
 });
"""+s[pos:]
anchor=" it('treats a corner differently from a flat derivative in the visible comparison'";pos=s.index(anchor);s=s[:pos]+""" it('keeps a reflection and derivative reveal when the same inputs are computed again',async()=>{
  const state=await mount('funcGrapher','funcgrapher',{...initial,secantPrediction:'same'});
  await click('Compute secant slopes');await click('Compare with the derivative');
  await input('[data-secant-results] textarea','Keep this reasoning.');await click('Compute secant slopes');
  expect(state().secantReflection).toBe('Keep this reasoning.');expect(state().secantReveal).toBe(true);
 });
"""+s[pos:];p.write_text(s,encoding='utf-8')
