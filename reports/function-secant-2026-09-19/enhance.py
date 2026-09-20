from pathlib import Path
out=Path('reports/function-secant-2026-09-19');out.mkdir(exist_ok=True)
p=Path('stem_lab/stem_tool_funcgrapher.js');s=p.read_text(encoding='utf-8')
anchor='  window.__alloImproperIntegral={truncate:fgTruncatedIntegral};'
new='''  function fgSecantStudy(evaluate, derivative, x, firstStep) {
    if(!Number.isFinite(x)||!Number.isFinite(firstStep)||firstStep<=0)return {ok:false,error:'Use a finite base point and a positive finite starting step.'};
    function value(at){if(!Number.isFinite(at))return null;try{var y=evaluate(at);return typeof y==='number'&&Number.isFinite(y)?y:null;}catch(e){return null;}}
    function slope(a,b,distance){if(a===null||b===null||!Number.isFinite(distance)||distance<=0)return null;var answer=(b-a)/distance;return Number.isFinite(answer)?answer:null;}
    var base=value(x),rows=[];
    for(var i=0;i<4;i++){
      var step=firstStep*Math.pow(10,-i),leftX=x-step,rightX=x+step,left=value(leftX),right=value(rightX);
      rows.push({step:step,leftX:leftX,rightX:rightX,left:slope(left,base,x-leftX),right:slope(base,right,rightX-x),center:base===null?null:slope(left,right,rightX-leftX),collapsed:step===0||leftX===x||rightX===x});
    }
    return {ok:true,x:x,firstStep:firstStep,value:base,derivative:typeof derivative==='number'&&Number.isFinite(derivative)?derivative:null,rows:rows};
  }
  function fgSecantMarkdown(study, reflection, revealed) {
    if(!study||!study.ok)return '# Secant-to-tangent investigation\\n\\nNo completed calculation.';
    function number(value){return typeof value==='number'&&Number.isFinite(value)?String(value):'Unavailable';}
    var context=study.context||{},lines=['# Secant-to-tangent investigation',context.created||'','Function: '+(context.equation||'Not recorded.'),'Family: '+(context.type||'Not recorded.'),'Parameters: a='+number(context.a)+', b='+number(context.b)+', c='+number(context.c),'Base point x₀ = '+number(study.x)+'; f(x₀) = '+number(study.value),'Starting step: '+number(study.firstStep),'Prediction: '+(context.prediction||'Not recorded.'),'Slopes use the actual represented sample spacing. The centered estimate alone does not establish a derivative.'];
    study.rows.forEach(function(row){lines.push('h = '+number(row.step)+'; left sample x = '+number(row.leftX)+'; right sample x = '+number(row.rightX)+'; left slope = '+number(row.left)+'; right slope = '+number(row.right)+'; centered estimate = '+number(row.center)+(row.collapsed?'; sample positions coincide at machine precision.':''));});
    lines.push('Analytic derivative comparison: '+(revealed?(study.derivative===null?'No finite two-sided derivative at this point in the supported function model.':'f′(x₀) = '+number(study.derivative)):'Not revealed.'));
    lines.push('Reflection: '+(String(reflection||'').trim()||'Not recorded.'));
    lines.push('Finite numerical samples cannot prove a limit. Domain boundaries, corners, and roundoff need separate attention.');
    return lines.join('\\n\\n');
  }
  window.__alloSecantInvestigation={study:fgSecantStudy,markdown:fgSecantMarkdown};
'''
assert anchor in s;s=s.replace(anchor,anchor+'\n\n'+new,1)
old='The derivative measures the rate of change. Toggle it on to see how the slope varies across the function. Where f\\u2032(x) = 0, the function has a local max or min.'
newtext='The derivative measures the rate of change. A zero derivative can mark a local maximum, a local minimum, or neither: x³ has derivative zero at 0 and keeps increasing. Compare behavior on both sides.'
assert old in s;s=s.replace(old,newtext,1)
anchor='            // A separate endpoint investigation: the selected family graph above is unchanged.'
new='''            (function(){
              var rawStep=d.secantStep==null?'1':String(d.secantStep),step=Number(rawStep);
              var key=JSON.stringify([d.type,d.a,d.b,d.c,traceX,rawStep,d.secantPrediction||'']);
              var current=d.secantResult&&d.secantResultKey===key,study=current?d.secantResult:null;
              var ink=ctx.isContrast?'#ffffff':ctx.isDark?'#e2e8f0':'#0f172a',surface=ctx.isContrast?'#000000':ctx.isDark?'#0f172a':'#ffffff',border=ctx.isContrast?'#facc15':'#64748b';
              var field={padding:10,minHeight:44,border:'1px solid '+border,borderRadius:6,background:surface,color:ink,maxWidth:'100%',boxSizing:'border-box'};
              function set(patch){setLabToolData(function(prev){return Object.assign({},prev,{funcGrapher:Object.assign({},prev.funcGrapher,patch)});});}
              function number(value){return typeof value==='number'&&Number.isFinite(value)?Number(value.toPrecision(9)).toString():'Unavailable';}
              return h('details',{'data-secant-investigation':true,style:{marginTop:16,padding:14,border:'1px solid '+border,borderRadius:12,color:ink,background:surface,overflowWrap:'anywhere'}},
                h('summary',{style:{fontSize:16,fontWeight:700,cursor:'pointer'}},'From secant slopes to a tangent'),
                h('p',null,'Use the current function and trace point. Move the trace slider above to investigate another point. Compare slopes on both sides as a positive step h shrinks.'),
                h('p',{'data-secant-base':true},'Base point x₀ = '+traceX+'; f(x₀) = '+number(traceY)+'.'),
                h('p',null,'Left: [f(x₀) − f(x₀ − h)] / h. Right: [f(x₀ + h) − f(x₀)] / h. The centered estimate uses the two outer samples; by itself it can hide a corner.'),
                h('label',{style:{display:'block'}},'Starting secant step h',h('input',{type:'number',step:'any',value:rawStep,style:Object.assign({},field,{display:'block',width:'100%'}),onChange:function(e){set({secantStep:e.target.value,secantNotice:''});}})),
                h('label',{style:{display:'block',marginTop:10}},'Predict the left and right slopes',h('select',{value:d.secantPrediction||'',style:Object.assign({},field,{display:'block',width:'100%'}),onChange:function(e){set({secantPrediction:e.target.value,secantNotice:''});}},
                  h('option',{value:''},'Choose a prediction'),h('option',{value:'same'},'They approach the same finite slope'),h('option',{value:'different'},'They approach different slopes'),h('option',{value:'unavailable'},'A finite two-sided slope is unavailable'),h('option',{value:'unsure'},'I need more evidence'))),
                h('button',{type:'button',style:Object.assign({},field,{marginTop:10}),onClick:function(){
                  var result=fgSecantStudy(evalF,traceSlope,traceX,step);
                  if(!result.ok){set({secantNotice:result.error});return;}
                  if(!d.secantPrediction){set({secantNotice:'Choose a prediction before calculating.'});return;}
                  result.context={equation:eqStr,type:d.type,a:d.a,b:d.b,c:d.c,prediction:d.secantPrediction,created:new Date().toISOString()};
                  set({secantResult:result,secantResultKey:key,secantReveal:false,secantReflection:'',secantNotice:'Four step sizes calculated. Compare the left and right slopes before revealing the derivative.'});
                  if(announceToSR)announceToSR('Secant slope investigation calculated.');
                }},'Compute secant slopes'),
                d.secantNotice?h('p',{role:'status'},d.secantNotice):null,
                d.secantResult&&!current?h('p',{role:'status'},'The function, trace point, step, or prediction changed. Compute again to refresh the investigation.'):null,
                study?h('div',{'data-secant-results':true},
                  study.value===null?h('p',null,'The function is undefined or non-finite at the base point, so a derivative there is unavailable.'):null,
                  study.rows.some(function(row){return row.collapsed;})?h('p',null,'Some sample positions coincide at machine precision. A smaller step cannot resolve a slope there.'):null,
                  h('div',{tabIndex:0,role:'region','aria-label':'Secant slope comparison table',style:{overflowX:'auto',marginTop:12}},h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:13}},
                    h('caption',{style:{color:ink,textAlign:'left'}},'Four shrinking steps at x₀ = '+study.x),
                    h('thead',null,h('tr',null,['Step h','Left slope ≈','Right slope ≈','Centered estimate ≈'].map(function(label){return h('th',{key:label,scope:'col',style:{padding:8,textAlign:'left',borderBottom:'1px solid '+border}},label);}))),
                    h('tbody',null,study.rows.map(function(row,i){return h('tr',{key:i},[row.step,row.left,row.right,row.center].map(function(value,j){return h('td',{key:j,style:{padding:8,borderBottom:'1px solid '+border}},number(value));}));})))),
                  h('p',null,'Unavailable values can reflect domain restrictions, overflow, or steps too small for the computer to distinguish. Very small steps can amplify roundoff; four rows do not prove a limit.'),
                  h('button',{type:'button',style:field,onClick:function(){upd('secantReveal',!d.secantReveal);}},d.secantReveal?'Hide derivative comparison':'Compare with the derivative'),
                  d.secantReveal?h('p',{'data-secant-derivative':true,role:'status'},study.derivative===null?'The supported function model has no finite two-sided derivative at this point. Compare the one-sided evidence and check the domain.':'Analytic derivative f′(x₀) = '+number(study.derivative)+'. Compare each side with this value; a zero derivative alone does not establish a turning point.'):null,
                  h('label',{style:{display:'block',marginTop:12}},'Explain what the two sides show',h('textarea',{rows:3,maxLength:1500,value:d.secantReflection||'',style:Object.assign({},field,{display:'block',width:'100%'}),onChange:function(e){upd('secantReflection',e.target.value);}})),
                  h('button',{type:'button',style:Object.assign({},field,{marginTop:10}),onClick:function(){
                    var url=URL.createObjectURL(new Blob([fgSecantMarkdown(study,d.secantReflection,!!d.secantReveal)],{type:'text/markdown;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='secant-to-tangent-investigation.md';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
                  }},'Export secant investigation')):null);
            })(),

'''
assert anchor in s;s=s.replace(anchor,new+anchor,1);p.write_text(s,encoding='utf-8');Path('desktop/web-app/public/stem_lab/'+p.name).write_bytes(p.read_bytes())
print('Added secant-to-tangent investigation and corrected stationary-point teaching copy.')
