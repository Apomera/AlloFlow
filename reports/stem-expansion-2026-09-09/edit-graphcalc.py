
from pathlib import Path
p=Path('stem_lab/stem_tool_graphcalc.js');s=p.read_text(encoding='utf-8')
def rep(a,b):
 global s
 assert a in s,a[:80]
 s=s.replace(a,b,1)
helpers=r'''
  // Numerical candidates, with a substitution residual and the search interval attached.
  function gcScanRoots(evaluate, min, max) {
    var count=500,tolerance=1e-8,results=[],invalid=0;
    if(!Number.isFinite(min)||!Number.isFinite(max)||max<=min||!Number.isFinite(max-min))return {candidates:[],error:'Choose a finite increasing x interval.'};
    var step=(max-min)/count,xTolerance=Math.max(1e-10,step*1e-6),samples=[];
    function value(x){try{var y=evaluate(x);if(typeof y==='number'&&Number.isFinite(y))return y;}catch(e){}invalid++;return NaN;}
    function add(x,y,method,lo,hi){
      if(!Number.isFinite(y)||Math.abs(y)>tolerance)return;
      if(results.some(function(r){return Math.abs(r.x-x)<=xTolerance;}))return;
      results.push({x:x,residual:Math.abs(y),method:method,bracket:[lo,hi]});
    }
    for(var i=0;i<=count;i++){var x=min+(max-min)*(i/count),y=value(x);samples.push({x:x,y:y});if(y===0)add(x,y,'sample zero',x,x);}
    for(var j=1;j<samples.length;j++){
      var a=samples[j-1],b=samples[j];
      if(!Number.isFinite(a.y)||!Number.isFinite(b.y)||a.y===0||b.y===0||Math.sign(a.y)===Math.sign(b.y))continue;
      var lo=a.x,hi=b.x,yl=a.y,best=Math.abs(a.y)<Math.abs(b.y)?a:b;
      for(var k=0;k<64;k++){
        var mid=lo+(hi-lo)/2;if(mid===lo||mid===hi)break;
        var ym=value(mid);if(!Number.isFinite(ym)){best=null;break;}
        if(!best||Math.abs(ym)<Math.abs(best.y))best={x:mid,y:ym};
        if(ym===0){lo=hi=mid;break;}
        if(Math.sign(yl)!==Math.sign(ym))hi=mid;else{lo=mid;yl=ym;}
      }
      // A jump can change sign without approaching zero. Require substantial residual reduction.
      if(best&&Math.abs(best.y)<=Math.max(Math.abs(a.y),Math.abs(b.y))*1e-4)add(best.x,best.y,'sign change',lo,hi);
    }
    // A local minimum of |f| can reveal a touching root that a sign-change scan misses.
    for(var m=1;m<samples.length-1;m++){
      var left=samples[m-1],center=samples[m],right=samples[m+1];
      if(!Number.isFinite(left.y)||!Number.isFinite(center.y)||!Number.isFinite(right.y)||center.y===0||!(Math.abs(center.y)<Math.abs(left.y)&&Math.abs(center.y)<Math.abs(right.y)))continue;
      var l=left.x,r=right.x,ratio=(Math.sqrt(5)-1)/2,c=r-ratio*(r-l),e=l+ratio*(r-l),fc=value(c),fe=value(e);
      for(var n=0;n<48&&Number.isFinite(fc)&&Number.isFinite(fe);n++){
        if(Math.abs(fc)<Math.abs(fe)){r=e;e=c;fe=fc;c=r-ratio*(r-l);fc=value(c);}
        else{l=c;c=e;fc=fe;e=l+ratio*(r-l);fe=value(e);}
      }
      var cx=Math.abs(fc)<Math.abs(fe)?c:e,cy=Math.abs(fc)<Math.abs(fe)?fc:fe;
      if(Math.abs(cy)<=Math.max(Math.abs(left.y),Math.abs(right.y))*1e-4)add(cx,cy,'touching-root candidate',l,r);
    }
    results.sort(function(a,b){return a.x-b.x;});
    return {candidates:results,interval:[min,max],samples:count+1,step:step,tolerance:tolerance,invalidEvaluations:invalid};
  }
  window.__alloGraphAnalysis = { scan: gcScanRoots };
'''
rep("  'use strict';","  'use strict';\n"+helpers)
start=s.index('        function runAnalysis() {')
end=s.index('\n        /* ── AI Tutor',start)
s=s[:start]+r'''
        var analysisKey=JSON.stringify([funcs.map(function(f){return f.expr||'';}),win.xmin,win.xmax,d.sliderA,d.sliderB,d.sliderC]);
        var analysisCurrent=d._analysisKey===analysisKey;
        function runAnalysis() {
          if (!window.math) { updMulti({showAnalysis:true,_analysisKey:analysisKey,_analysis:{error:'The math engine is still loading. Try Analyze again.'},_zeros:[],_intersections:[]}); return; }
          SOUNDS.analyzeComplete();
          var zeros=[],inters=[],report={error:'Enter a function in the first row.'};
          var scope={};if(d.sliderA!=null)scope.a=d.sliderA;if(d.sliderB!=null)scope.b=d.sliderB;if(d.sliderC!=null)scope.c=d.sliderC;
          try {
            if(funcs[0]&&funcs[0].expr.trim()){
              var c1=math.compile(gcCleanExpr(funcs[0].expr));
              var f=function(x){return c1.evaluate(Object.assign({},scope,{x:x}));};
              report=gcScanRoots(f,win.xmin,win.xmax);zeros=report.candidates;
              for(var i=1;i<funcs.length;i++){
                if(!funcs[i]||!funcs[i].expr.trim())continue;
                try{
                  var c2=math.compile(gcCleanExpr(funcs[i].expr));
                  var crossing=gcScanRoots(function(x){return f(x)-c2.evaluate(Object.assign({},scope,{x:x}));},win.xmin,win.xmax);
                  crossing.candidates.forEach(function(pt){inters.push(Object.assign({},pt,{y:f(pt.x),f2:i}));});
                }catch(e){report.intersectionWarning='At least one comparison function could not be parsed.';}
              }
            }
          }catch(e){report={error:'The first function could not be parsed. Check its expression.'};}
          updMulti({showAnalysis:true,_zeros:zeros,_intersections:inters,_analysis:report,_analysisKey:analysisKey,_analyzed:true,_foundZero:!!d._foundZero||zeros.length>0,_foundIntersection:!!d._foundIntersection||inters.length>0});
          if(announceToSR)announceToSR('Numerical analysis complete. '+zeros.length+' zero candidates and '+inters.length+' intersection candidates.');
        }
''' + s[end:]
rep("if (d._intersections) d._intersections.forEach","if (analysisCurrent && d._intersections) d._intersections.forEach")
# Match the zero-marker guard independently.
s=s.replace("if (d._zeros) d._zeros.forEach","if (analysisCurrent && d._zeros) d._zeros.forEach")
rep("              d.showAnalysis ? h('div',", "              d.showAnalysis && !analysisCurrent ? h('p', { role:'status', style:{color:gcText,padding:12} }, 'Functions or search bounds changed. Run Analyze again to refresh the evidence.') : null,\n              d.showAnalysis && analysisCurrent ? h('div',")
rep("                h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },",r'''                h('p', { 'data-analysis-provenance':true, style:{fontSize:12,color:gcText,lineHeight:1.6} },
                  d._analysis && d._analysis.error ? d._analysis.error :
                  'Search interval ['+win.xmin+', '+win.xmax+']; 501 grid samples, sign-change refinement, and local minima of |f|. Absolute residual threshold: 1e-8. A candidate is numerical evidence, not proof of a root or a complete solution set.'),
                h('p', { style:{fontSize:12,color:gcMuted} }, 'Narrow or shift the window to check missed roots. Discontinuities and near-zero minima require further investigation. Zeros use the first function; intersections compare it with each other row.'),
                d._analysis && d._analysis.intersectionWarning ? h('p',{role:'status'},d._analysis.intersectionWarning) : null,
                h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },''')
rep("'x=' + Number(z.x.toPrecision(5))","'x≈' + Number(z.x.toPrecision(8)) + '; |f(x)|=' + Number(z.residual).toExponential(2) + '; ' + z.method")
rep("__alloT('stem.graphcalc.none', 'None')","'No zero candidates found in this interval'")
rep("'(' + Number(pt.x.toPrecision(4)) + ',' + Number(pt.y.toPrecision(4)) + ')'","'f1 & f' + (pt.f2 + 1) + ': (' + Number(pt.x.toPrecision(8)) + ', ' + Number(pt.y.toPrecision(8)) + '); |f1−f' + (pt.f2 + 1) + '|=' + Number(pt.residual).toExponential(2)")
rep("__alloT('stem.graphcalc.need_2_funcs', 'Need 2+ funcs')","funcs.filter(function(f){return f.expr && f.expr.trim();}).length < 2 ? 'Add a second function to compare' : 'No intersection candidates found in this interval'")
# Parenthesize the replacement expression as a createElement argument.
p.write_text(s,encoding='utf-8',newline='\n')
print('Graph analysis now reports refined numerical candidates and their residuals.')

