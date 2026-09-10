
from pathlib import Path
p=Path('tests/stem_learning_expansion.test.js');s=p.read_text(encoding='utf-8-sig')
s=s.replace("let root;","let root;\nglobalThis.IS_REACT_ACT_ENVIRONMENT=true;")
s+=r'''
describe('improper integral cutoff reasoning',()=>{
  function api(){loadTool('stem_lab/stem_tool_funcgrapher.js','funcGrapher');return window.__alloImproperIntegral;}
  it('computes finite-interval areas for all three endpoint examples',()=>{
    const a=api();
    expect(a.truncate(.5,.01).area).toBeCloseTo(1.8,12);
    expect(a.truncate(1,.01).area).toBeCloseTo(Math.log(100),12);
    expect(a.truncate(2,.01).area).toBeCloseTo(99,12);
  });
  it('distinguishes the convergent limit from divergent limits',()=>{
    const a=api();
    expect(a.truncate(.5,1e-10)).toMatchObject({limit:'2'});
    expect(a.truncate(.5,1e-10).area).toBeLessThan(2);
    expect(a.truncate(1,1e-10).limit).toBe('unbounded');
    expect(a.truncate(2,1e-10).limit).toBe('unbounded');
  });
  it.each([0,-1,1,Infinity,NaN])('rejects invalid cutoff %s',value=>expect(api().truncate(1,value).ok).toBe(false));
});
'''
p.write_text(s,encoding='utf-8',newline='\n')
for name in ['algebracas','openbim','organismid','graphcalc','funcgrapher']:
 src=Path('stem_lab/stem_tool_'+name+'.js')
 dst=Path('desktop/web-app/public/stem_lab/stem_tool_'+name+'.js')
 dst.write_bytes(src.read_bytes())
print('Five public tool copies synchronized; integral tests added.')

