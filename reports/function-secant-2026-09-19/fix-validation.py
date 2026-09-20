from pathlib import Path
p=Path('stem_lab/stem_tool_funcgrapher.js');s=p.read_text(encoding='utf-8');start=s.index("'data-secant-investigation'");end=s.index('// A separate endpoint investigation',start)
block=s[start:end].replace("textAlign:'left',borderBottom:'1px solid '+border}","textAlign:'left',borderBottom:'1px solid '+border,color:ink}").replace("style:{padding:8,borderBottom:'1px solid '+border}","style:{padding:8,borderBottom:'1px solid '+border,color:ink}")
s=s[:start]+block+s[end:];p.write_text(s,encoding='utf-8');Path('desktop/web-app/public/stem_lab/'+p.name).write_bytes(p.read_bytes())
p=Path('tests/funcgrapher_secant_investigation.test.js');s=p.read_text(encoding='utf-8');anchor='const api=()=>';s=s.replace(anchor,"beforeEach(()=>{vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(new Proxy({measureText:()=>({width:20})},{get:(target,key)=>key==='then'?undefined:target[key]||(()=>{})}));});\n"+anchor,1);p.write_text(s,encoding='utf-8')
