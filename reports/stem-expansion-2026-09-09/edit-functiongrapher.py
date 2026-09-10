
from pathlib import Path
p=Path('stem_lab/stem_tool_funcgrapher.js');s=p.read_text(encoding='utf-8')
def rep(a,b):
 global s
 assert a in s,a[:80]
 s=s.replace(a,b,1)
helpers=r'''
  function fgTruncatedIntegral(power, epsilon) {
    power=Number(power);epsilon=Number(epsilon);
    if([.5,1,2].indexOf(power)===-1||!Number.isFinite(epsilon)||epsilon<=0||epsilon>=1)return {ok:false};
    var area=power===1?-Math.log(epsilon):(1-Math.pow(epsilon,1-power))/(1-power);
    return {ok:true,power:power,epsilon:epsilon,area:area,formula:power===.5?'2(1 − √ε)':power===1?'−ln(ε)':'1/ε − 1',limit:power===.5?'2':'unbounded'};
  }
  window.__alloImproperIntegral={truncate:fgTruncatedIntegral};
'''
rep('  // ═══ 📈 Function Grapher ═══',helpers+'\n  // ═══ 📈 Function Grapher ═══')
panel=r'''
            // A separate endpoint investigation: the selected family graph above is unchanged.
            (function(){
              var power=[.5,1,2].indexOf(Number(d.improperPower))!==-1?Number(d.improperPower):.5;
              var epsilon=d.improperEpsilon==null?'.1':String(d.improperEpsilon);
              var rows=(Array.isArray(d.improperRows)?d.improperRows:[]).filter(function(r){return r&&fgTruncatedIntegral(r.power,r.epsilon).ok;}).slice(-18);
              var sample=fgTruncatedIntegral(power,epsilon);
              var ink=ctx.isContrast?'#ffffff':ctx.isDark?'#e2e8f0':'#0f172a',surface=ctx.isContrast?'#000000':ctx.isDark?'#0f172a':'#ffffff',border=ctx.isContrast?'#facc15':'#64748b';
              var field={padding:10,border:'1px solid '+border,borderRadius:6,background:surface,color:ink,maxWidth:'100%',boxSizing:'border-box'};
              function set(patch){setLabToolData(function(prev){return Object.assign({},prev,{funcGrapher:Object.assign({},prev.funcGrapher,patch)});});}
              return h('details',{'data-improper-investigation':true,style:{marginTop:16,padding:14,border:'1px solid '+border,borderRadius:12,color:ink,background:surface}},
                h('summary',{style:{fontSize:16,fontWeight:700,cursor:'pointer'}},'Can an unbounded function have finite area?'),
                h('p',null,'Compare 1/√x, 1/x, and 1/x² from 0 to 1. All are undefined at zero. Start at a positive cutoff ε and move it toward zero to investigate the missing endpoint.'),
                h('div',{style:{display:'flex',gap:10,flexWrap:'wrap'}},
                  h('label',null,'Endpoint example',h('select',{'aria-label':'Endpoint example',value:power,style:field,onChange:function(e){set({improperPower:Number(e.target.value),improperReveal:false,improperNotice:''});}},
                    h('option',{value:.5},'1/√x'),h('option',{value:1},'1/x'),h('option',{value:2},'1/x²'))),
                  h('label',null,'Cutoff ε',h('input',{'aria-label':'Positive endpoint cutoff',type:'number',step:'any',min:.000001,max:.999999,value:epsilon,style:field,onChange:function(e){set({improperEpsilon:e.target.value,improperNotice:''});}}))),
                h('label',{style:{display:'block',marginTop:12}},'Predict what happens as ε approaches zero',
                  h('select',{value:d.improperPrediction||'',style:Object.assign({},field,{display:'block'}),onChange:function(e){upd('improperPrediction',e.target.value);}},
                    h('option',{value:''},'Choose a prediction'),h('option',{value:'finite'},'Area approaches a finite value'),h('option',{value:'unbounded'},'Area grows without bound'),h('option',{value:'unsure'},'I need more evidence'))),
                h('button',{type:'button',style:Object.assign({},field,{marginTop:10,minHeight:44}),onClick:function(){
                  if(!sample.ok){set({improperNotice:'Enter a positive cutoff less than 1.'});return;}
                  if(!d.improperPrediction){set({improperNotice:'Record a prediction before adding a trial.'});return;}
                  if(rows.some(function(r){return Number(r.power)===power&&Number(r.epsilon)===sample.epsilon;})){set({improperNotice:'That cutoff is already recorded for this example. Try a smaller value.'});return;}
                  set({improperRows:rows.concat([{power:power,epsilon:sample.epsilon,prediction:d.improperPrediction}]).slice(-18),improperNotice:'Trial recorded. Try ε / 10, then compare how much area was added.'});
                }},'Record cutoff trial'),
                d.improperNotice?h('p',{role:'status'},d.improperNotice):null,
                rows.length?h('div',{style:{overflowX:'auto'}},h('table',{style:{width:'100%',fontSize:13,borderCollapse:'collapse'}},
                  h('caption',null,'Recent cutoff trials: area from ε to 1'),
                  h('thead',null,h('tr',null,['Function','Cutoff ε','Area ≈','Prediction'].map(function(label){return h('th',{key:label,scope:'col',style:{padding:8,textAlign:'left',borderBottom:'1px solid '+border}},label);}))),
                  h('tbody',null,rows.map(function(row,i){var r=fgTruncatedIntegral(row.power,row.epsilon);return h('tr',{key:i},[r.power===.5?'1/√x':r.power===1?'1/x':'1/x²',r.epsilon,Number(r.area.toPrecision(7)),row.prediction].map(function(v,j){return h('td',{key:j,style:{padding:8,borderBottom:'1px solid '+border}},String(v));}));})))):null,
                h('p',null,'Each trial integrates over a finite interval. An increasing table alone does not show that the total is infinite; compare the antiderivative and its limit.'),
                h('button',{type:'button',disabled:!rows.some(function(r){return Number(r.power)===power;}),style:Object.assign({},field,{minHeight:44}),onClick:function(){upd('improperReveal',!d.improperReveal);}},d.improperReveal?'Hide limit explanation':'Compare with the limit'),
                d.improperReveal?h('p',{'data-improper-limit':true,role:'status'},power===.5?'Area = 2(1 − √ε). As ε approaches zero, √ε approaches zero, so the area approaches 2. The integrand is unbounded, but this improper integral converges.':power===1?'Area = −ln(ε). As ε approaches zero from above, this grows without bound. The improper integral diverges.':'Area = 1/ε − 1. As ε approaches zero from above, this grows without bound. The improper integral diverges.'):null,
                h('label',{style:{display:'block',marginTop:12}},'Explain how the trials support or change your prediction',
                  h('textarea',{rows:3,maxLength:1500,value:d.improperReflection||'',style:Object.assign({},field,{display:'block',width:'100%'}),onChange:function(e){upd('improperReflection',e.target.value);}})),
                h('p',{style:{fontSize:12}},'Trials use antiderivative formulas and rounded display values. The last 18 trials and your explanation are retained in this AlloFlow project.'))
            })(),

'''
rep('            // ── AI Explain Button ──',panel+'            // ── AI Explain Button ──')
# Remove an old misconception in challenge feedback.
rep('A root is where the curve CROSSES the x-axis — where f(x) = 0.','A root is where the curve meets the x-axis — where f(x) = 0. It may cross or just touch.')
p.write_text(s,encoding='utf-8',newline='\n')
print('Function Grapher endpoint investigation added.')

