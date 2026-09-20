from pathlib import Path
out=Path('reports/graphcalc-evidence-2026-09-19');out.mkdir(exist_ok=True)
p=Path('stem_lab/stem_tool_graphcalc.js');s=p.read_text(encoding='utf-8')
anchor='  window.__alloGraphAnalysis = { scan: gcScanRoots };'
new='''  function gcCandidateEvidence(evaluate, x, step, min, max, compare) {
    if(!Number.isFinite(x)||!Number.isFinite(step)||step<=0||!Number.isFinite(min)||!Number.isFinite(max)||x<min||x>max||min>=max)return {rows:[],error:'Choose a candidate within a finite search interval.'};
    var rows=[],seen=new Set();
    function value(fn,at){try{var y=fn(at);return typeof y==='number'&&Number.isFinite(y)?y:null;}catch(e){return null;}}
    [-1,-0.1,0,0.1,1].forEach(function(factor){
      var at=Math.max(min,Math.min(max,x+step*factor));if(!Number.isFinite(at)||seen.has(at))return;seen.add(at);
      var first=value(evaluate,at),second=compare?value(compare,at):null,difference=compare?(first!==null&&second!==null?first-second:null):first;
      if(!Number.isFinite(difference))difference=null;
      rows.push({x:at,first:first,second:second,difference:difference,position:at<x?'Left of candidate':at>x?'Right of candidate':'At candidate'});
    });
    return {rows:rows,step:step,complete:rows.length===5,finite:rows.every(function(row){return row.difference!==null;})};
  }
  function gcAnalysisContext(funcs, win, state) {
    var parameters={};['a','b','c'].forEach(function(name){var value=state['slider'+name.toUpperCase()];if(value!=null)parameters[name]=value;});
    return {expressions:funcs.map(function(fn){return fn.expr||'';}),parameters:parameters,interval:[win.xmin,win.xmax],created:new Date().toISOString()};
  }
  function gcAnalysisMarkdown(context, zeros, intersections, report, evidence) {
    function number(value){return typeof value==='number'&&Number.isFinite(value)?String(value):'Unavailable (non-finite or outside the real domain)';}
    context=context||{expressions:[],parameters:{},interval:[]};report=report||{};
    var lines=['# Graphing Calculator numerical evidence',context.created||'','## Inputs'];
    (context.expressions||[]).forEach(function(expr,i){if(String(expr).trim())lines.push('f'+(i+1)+'(x): '+expr);});
    lines.push('Parameters: '+(Object.keys(context.parameters||{}).map(function(key){return key+' = '+context.parameters[key];}).join(', ')||'None set.'));
    lines.push('Search interval: ['+(context.interval||[]).map(number).join(', ')+']');
    lines.push('Method: 501 grid samples, sign-change refinement, and local minima of |f|. Absolute residual threshold: 1e-8.');
    lines.push('Candidates and nearby values are numerical evidence, not proof of roots, intersections, continuity, or completeness.');
    if(report.error)lines.push('Analysis error: '+report.error);
    if(report.invalidEvaluations)lines.push('Non-finite or invalid evaluations for f1 during scanning: '+report.invalidEvaluations);
    if(report.zeroThroughoutSamples)lines.push('f1 equals zero at all sampled points; no isolated-root list is inferred.');
    if(report.overlapComparisons)lines.push('Sampled overlap with: '+report.overlapComparisons.map(function(n){return 'f'+n;}).join(', ')+'. This is not proof of identical functions.');
    if(report.intersectionWarning)lines.push(report.intersectionWarning);
    lines.push('## Zero candidates');
    (zeros||[]).forEach(function(row){lines.push('- x ≈ '+number(row.x)+'; |f1(x)| = '+number(row.residual)+'; method: '+row.method);});
    if(!(zeros||[]).length)lines.push('No isolated zero candidates recorded.');
    lines.push('## Intersection candidates');
    (intersections||[]).forEach(function(row){lines.push('- f1 and f'+(row.f2+1)+': x ≈ '+number(row.x)+', y ≈ '+number(row.y)+'; absolute difference = '+number(row.residual)+'; method: '+row.method);});
    if(!(intersections||[]).length)lines.push('No isolated intersection candidates recorded.');
    if(evidence){
      lines.push('## Nearby-value inspection',evidence.label,'Probe distance: '+number(evidence.step)+'; also sampled at one tenth of that distance. Values stay within the original search interval.');
      if(evidence.error)lines.push(evidence.error);
      if(evidence.complete===false)lines.push('Some probe positions coincide because of an interval boundary or floating-point precision.');
      (evidence.rows||[]).forEach(function(row){lines.push('- '+row.position+': x = '+number(row.x)+'; f1(x) = '+number(row.first)+(evidence.comparison?'; '+evidence.comparison+'(x) = '+number(row.second)+'; f1 − '+evidence.comparison+' = '+number(row.difference):''));});
    }
    return lines.join('\\n\\n');
  }
  window.__alloGraphAnalysis = { scan: gcScanRoots, inspect: gcCandidateEvidence, context: gcAnalysisContext, markdown: gcAnalysisMarkdown };'''
assert anchor in s;s=s.replace(anchor,new,1)
anchor='        function runAnalysis() {\n'
s=s.replace(anchor,anchor+"          var provenance=gcAnalysisContext(funcs,win,d);\n",1)
s=s.replace("updMulti({showAnalysis:true,_analysisKey:analysisKey,", "updMulti({showAnalysis:true,_analysisContext:provenance,_analysisSelection:'',_analysisKey:analysisKey,",1)
s=s.replace("updMulti({showAnalysis:true,_zeros:zeros,", "updMulti({showAnalysis:true,_analysisContext:provenance,_analysisSelection:'',_zeros:zeros,",1)
# A bounded five-point inspection uses the same expression cleanup and parameter scope as Analyze.
anchor='        /* ── AI Tutor ── */'
new='''        function candidateChoices() {
          return (d._zeros||[]).map(function(row,i){return {id:'zero-'+i,point:row,label:'Zero '+(i+1)+' at x ≈ '+Number(row.x.toPrecision(8))};}).concat((d._intersections||[]).map(function(row,i){return {id:'intersection-'+i,point:row,comparison:row.f2,label:'f1 and f'+(row.f2+1)+' at x ≈ '+Number(row.x.toPrecision(8))};}));
        }
        function selectedEvidence(choice) {
          if(!choice||!d._analysisContext||!window.math)return null;
          try{
            var source=d._analysisContext,first=math.compile(gcCleanExpr(source.expressions[0]));
            var other=choice.comparison!=null?math.compile(gcCleanExpr(source.expressions[choice.comparison])):null;
            function evaluate(compiled,x){return compiled.evaluate(Object.assign({},source.parameters,{x:x}));}
            var evidence=gcCandidateEvidence(function(x){return evaluate(first,x);},choice.point.x,d._analysis.step,source.interval[0],source.interval[1],other?function(x){return evaluate(other,x);}:null);
            evidence.label=choice.label;evidence.comparison=other?'f'+(choice.comparison+1):null;return evidence;
          }catch(e){return {label:choice.label,error:'Nearby values could not be evaluated. Check the expression and domain.',rows:[]};}
        }
        function renderCandidateInspector() {
          var choices=candidateChoices(),selected=choices.find(function(choice){return choice.id===d._analysisSelection;}),evidence=selectedEvidence(selected);
          var control={minHeight:44,width:'100%',marginTop:8,padding:8,borderRadius:6,border:'1px solid '+gcBorder,background:gcPanel,color:gcText,fontSize:12,whiteSpace:'normal'};
          function number(value){return typeof value==='number'&&Number.isFinite(value)?Number(value.toPrecision(10)).toString():'Unavailable';}
          return h('section',{'data-candidate-inspector':true,style:{marginTop:12,fontSize:12,lineHeight:1.6,overflowWrap:'anywhere'}},
            h('h3',{style:{fontSize:14,fontWeight:'bold'}},'Inspect numerical evidence'),
            h('p',null,'Compare nearby values at two distances. Opposite signs may suggest a crossing; matching signs can occur at a touching root. Neither pattern proves a root or continuity.'),
            choices.length?h('label',null,'Candidate to inspect',h('select',{value:selected?selected.id:'',onChange:function(e){upd('_analysisSelection',e.target.value);},style:control},h('option',{value:''},'Choose a candidate'),choices.map(function(choice){return h('option',{key:choice.id,value:choice.id},choice.label);}))) : h('p',null,'No isolated candidates to inspect. Try a different interval or function.'),
            evidence?h('div',{'data-candidate-values':true},
              h('p',null,'Probe distance: '+number(evidence.step)+'. Also checking one tenth of this distance.'),
              evidence.error?h('p',{role:'status'},evidence.error):null,
              evidence.complete===false?h('p',null,'Some probe positions coincide at the interval boundary or at machine precision.'):null,
              evidence.finite===false?h('p',null,'Some values are unavailable in the real domain. Inspect the domain before interpreting the sign pattern.'):null,
              h('ul',{style:{paddingLeft:16}},(evidence.rows||[]).map(function(row,i){return h('li',{key:i,style:{marginBottom:8}},h('strong',null,row.position+': x = '+number(row.x)),h('div',null,'f1(x) = '+number(row.first)),evidence.comparison?h('div',null,evidence.comparison+'(x) = '+number(row.second)+'; f1 − '+evidence.comparison+' = '+number(row.difference)):null);})),
              h('button',{type:'button',style:control,onClick:function(){updMulti({traceMode:true,traceX:selected.point.x});if(announceToSR)announceToSR('Trace moved to '+selected.label+'.');}},'Trace selected candidate')):null,
            h('button',{type:'button',style:control,disabled:!d._analysisContext,onClick:function(){
              var text=gcAnalysisMarkdown(d._analysisContext,d._zeros,d._intersections,d._analysis,evidence),url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'})),a=document.createElement('a');
              a.href=url;a.download='graphcalc-numerical-evidence.md';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
              if(announceToSR)announceToSR('Numerical evidence exported.');
            }},'Export numerical evidence'));
        }

'''
assert anchor in s;s=s.replace(anchor,new+anchor,1)
anchor="                d._analysis && d._analysis.zeroThroughoutSamples ?"
s=s.replace(anchor,"                d._analysis && d._analysis.invalidEvaluations ? h('p',{role:'status'},d._analysis.invalidEvaluations+' evaluations of f1 were non-finite or outside the real domain. Check the domain before interpreting gaps.') : null,\n"+anchor,1)
anchor="                )\n              ) : null\n            ),\n\n            // Center — Canvas"
assert anchor in s;s=s.replace(anchor,"                ),\n                renderCandidateInspector()\n              ) : null\n            ),\n\n            // Center — Canvas",1)
p.write_text(s,encoding='utf-8');Path('desktop/web-app/public/stem_lab/'+p.name).write_bytes(p.read_bytes())
print('Added candidate probes, trace selection, and reproducible analysis export.')
