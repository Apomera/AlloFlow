
from pathlib import Path
p=Path('tests/stem_graphcalc_engine.test.js');s=p.read_text(encoding='utf-8')
s=s.replace("    src.slice(start, end) + '\\nrunAnalysis();'", "    src.slice(src.indexOf('function gcScanRoots('), src.indexOf('window.__alloGraphAnalysis')) + '\\nvar analysisKey=\"test\"; var announceToSR=null;\\n' + src.slice(start, end) + '\\nrunAnalysis();'")
s=s.replace("toBeLessThan(0.5)","toBeLessThanOrEqual(1e-8)")
p.write_text(s,encoding='utf-8',newline='\n')
p=Path('stem_lab/stem_tool_organismid.js');s=p.read_text(encoding='utf-8')
s=s.replace("    {id:'bird',name:'Feathered visitor'","    {id:'field',name:'My own field observation',evidence:'Observe from a distance and describe visible features. This entry is a field note, with no identification from the teaching key.',group:'Unclassified field observation'},\n    {id:'bird',name:'Feathered visitor'",1)
# Retain the bird as the default; the new field option is explicitly selected.
s=s.replace("})||OBSERVATION_EXAMPLES[0];\n      var route=observationRoute", "})||OBSERVATION_EXAMPLES[1];\n      var route=observationRoute",1)
s=s.replace("var route=observationRoute(d.observationAnswers),journal=", "var route=example.id==='field'?{path:[],result:'Unclassified field observation',question:null}:observationRoute(d.observationAnswers),journal=",1)
s=s.replace("subject:example.name,note:String(d.observationNote).trim()", "subject:example.id==='field'?String(d.observationSubject||'Field observation').slice(0,100):example.name,note:String(d.observationNote).trim()",1)
s=s.replace("h('p',{'data-example-evidence':true},example.evidence),",r"""h('p',{'data-example-evidence':true},example.evidence),
          example.id==='field'?h('label',null,'Observation title',h('input',{type:'text',maxLength:100,value:d.observationSubject||'',style:inputStyle,onChange:function(e){patchState({observationSubject:e.target.value});}})):null,""",1)
s=s.replace("observationExample:ex.id,observationAnswers:row.path.map", "observationExample:ex.id,observationSubject:ex.id==='field'?row.subject:'',observationAnswers:row.path.map",1)
s=s.replace("(Array.isArray(r.path)?r.path:[]).slice(0,7).map", "(Array.isArray(r.path)?r.path:[]).filter(function(step){return step&&typeof step==='object';}).slice(0,7).map",1)
p.write_text(s,encoding='utf-8',newline='\n')
p=Path('stem_lab/stem_tool_algebracas.js');s=p.read_text(encoding='utf-8')
s=s.replace("trial ? 'x=' + answer + ': LHS=' + trial.left + ', RHS=' + trial.right", "trial && trial.ok ? 'x=' + answer + ': LHS=' + trial.left + ', RHS=' + trial.right",1)
s=s.replace("upd('expression', value);","updMulti({ expression: value, result: null, verify: null, stepCheck: null });",1)
s=s.replace("updMulti({ expression: eq, tab: 'solve' });","updMulti({ expression: eq, tab: 'solve', result: null, verify: null, stepCheck: null });",1)
s=s.replace("This expression or mode needs the AI provider.', verify: null","This expression or mode needs the AI provider.', verify: { unavailable: true }",1)
s=s.replace("verify && verify.exact ? 'Exact local solution and algebraic steps. ' + verify.detail :","verify && verify.unavailable ? 'No AI provider is connected. The local linear solver and local practice are available.' : verify && verify.exact ? 'Exact local solution and algebraic steps. ' + verify.detail :",1)
p.write_text(s,encoding='utf-8',newline='\n')
print('Updated isolated analysis test seam and field-journal support.')

