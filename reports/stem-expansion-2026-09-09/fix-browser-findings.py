
from pathlib import Path
p=Path('stem_lab/stem_tool_algebracas.js');s=p.read_text(encoding='utf-8')
s=s.replace("display: 'flex', alignItems: 'flex-start', gap: '6px', padding: '4px 0'","display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '6px', padding: '4px 0'",1)
s=s.replace("h('span', { style: { flex: '1' } }, ruleM","h('span', { style: { flex: '1 1 160px', minWidth: 0, overflowWrap: 'anywhere' } }, ruleM",1)
s=s.replace("whiteSpace: 'nowrap' } }, ruleM[1]","whiteSpace: 'normal', maxWidth: '100%', overflowWrap: 'anywhere', borderRadius: '8px' } }, ruleM[1]",1)
p.write_text(s,encoding='utf-8',newline='\n')
p=Path('stem_lab/stem_tool_funcgrapher.js');s=p.read_text(encoding='utf-8')
s=s.replace("rows.length?h('div',{style:{overflowX:'auto'}},h('table',{style:{width:'100%',fontSize:13,borderCollapse:'collapse'}}","rows.length?h('div',{tabIndex:0,role:'region','aria-label':'Endpoint trial table',style:{overflowX:'auto'}},h('table',{style:{width:'100%',fontSize:13,borderCollapse:'collapse',color:ink}}",1)
s=s.replace("h('caption',null,'Recent cutoff trials: area from ε to 1')","h('caption',{style:{color:ink}},'Recent cutoff trials: area from ε to 1')",1)
s=s.replace("style:{padding:8,textAlign:'left',borderBottom:'1px solid '+border}","style:{padding:8,textAlign:'left',borderBottom:'1px solid '+border,color:ink}",1)
s=s.replace("style:{padding:8,borderBottom:'1px solid '+border}","style:{padding:8,borderBottom:'1px solid '+border,color:ink}",1)
p.write_text(s,encoding='utf-8',newline='\n')
p=Path('stem_lab/stem_tool_graphcalc.js');s=p.read_text(encoding='utf-8')
a="    for(var j=1;j<samples.length;j++){"
s=s.replace(a,"    if(samples.every(function(sample){return sample.y===0;}))return {candidates:[],zeroThroughoutSamples:true,interval:[min,max],samples:count+1,step:step,tolerance:tolerance,invalidEvaluations:invalid};\n"+a,1)
s=s.replace("crossing.candidates.forEach(function(pt)","if(crossing.zeroThroughoutSamples){report.overlapComparisons=(report.overlapComparisons||[]).concat([i+1]);}\n                  crossing.candidates.forEach(function(pt)",1)
s=s.replace("d._analysis && d._analysis.intersectionWarning ? h('p'", "d._analysis && d._analysis.zeroThroughoutSamples ? h('p',{role:'status'},'The first function equals zero at every sampled point. A finite list of isolated roots would be misleading; inspect the expression and interval.') : null,\n                d._analysis && d._analysis.overlapComparisons ? h('p',{role:'status'},'The first function matches f'+d._analysis.overlapComparisons.join(', f')+' at every sampled point. This may be an overlap, not isolated intersections.') : null,\n                d._analysis && d._analysis.intersectionWarning ? h('p'",1)
p.write_text(s,encoding='utf-8',newline='\n')
p=Path('stem_lab/stem_tool_openbim.js');s=p.read_text(encoding='utf-8')
s=s.replace("normalized.designStudy = normalizeDesignStudy(parsed.designStudy);","normalized.designStudy = normalizeDesignStudy(parsed.designStudy);\n    normalized.designReasoning = plain(parsed.designReasoning,1500);",1)
s=s.replace("value:state.designReasoning||'',maxLength:1500,rows:3,onChange:function(e){update({designReasoning:e.target.value});}","value:plan.designReasoning||'',maxLength:1500,rows:3,onChange:function(e){var next=Object.assign({},plan,{designReasoning:e.target.value});update({proposal:next,approvedRecipe:null,stage:'review'});}",1)
p.write_text(s,encoding='utf-8',newline='\n')
for name in ['algebracas','openbim','organismid','graphcalc','funcgrapher']:
 src=Path('stem_lab/stem_tool_'+name+'.js')
 Path('desktop/web-app/public/stem_lab/stem_tool_'+name+'.js').write_bytes(src.read_bytes())
print('Phone wrapping, table contrast and keyboard scrolling corrected; zero-function analysis clarified.')

