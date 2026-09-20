from pathlib import Path
p=Path('tests/graphcalc_candidate_evidence.test.js');s=p.read_text(encoding='utf-8')
old="beforeEach(()=>vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(new Proxy({measureText:()=>({width:20})},{get:(target,key)=>target[key]||(()=>{})})));"
new="beforeEach(()=>{vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(new Proxy({measureText:()=>({width:20})},{get:(target,key)=>key==='then'?undefined:target[key]||(()=>{})}));});"
assert old in s;s=s.replace(old,new,1);p.write_text(s,encoding='utf-8')
