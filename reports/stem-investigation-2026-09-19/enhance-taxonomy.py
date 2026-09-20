
from pathlib import Path
p=Path('stem_lab/stem_tool_organismid.js');s=p.read_text(encoding='utf-8')
def rep(a,b):
 global s
 assert a in s,a[:100]
 s=s.replace(a,b,1)
helpers=r'''
  function observationExampleId(row) {
    var examples=OBSERVATION_EXAMPLES;
    if(examples.some(function(e){return e.id===row.exampleId;}))return row.exampleId;
    // A field note may have the same title as a lesson card. Its claim takes precedence over a title.
    if(row.claim==='Unclassified field observation')return 'field';
    var match=examples.find(function(e){return e.id!=='field'&&e.name===row.subject;});
    return match?match.id:'field';
  }
  function observationEvidenceReview(exampleId, answers) {
    var expected={bird:['yes'],insect:['no','yes','yes'],arachnid:['no','yes','no','yes'],fern:['no','no','yes'],fungus:['no','no','no','yes'],moss:['no','no','no','no','yes']};
    if(!Object.prototype.hasOwnProperty.call(expected,exampleId))return {status:'field',detail:'Field notes are not checked against the teaching key. Record what you can observe and what evidence you still need.'};
    var route=observationRoute(answers),target=expected[exampleId];
    for(var i=0;i<route.path.length;i++){
      if(route.path[i].answer==='unsure')return {status:'uncertain',decision:i,detail:'You marked decision '+(i+1)+' as uncertain. Reread the example and record which feature would resolve this question.'};
      if(route.path[i].answer!==target[i])return {status:'revisit',decision:i,detail:'Revisit decision '+(i+1)+': '+route.path[i].question+' Compare your answer with the description. This checks what the card describes, not whether an unmentioned feature is absent in nature.'};
    }
    if(!route.result)return {status:'incomplete',detail:'The decisions so far match the example. Continue the key or record what is uncertain.'};
    return {status:'supported',detail:'Your key decisions match the teaching example. Cite the observable feature that supports your group claim; the key does not establish a species identification.'};
  }
'''
rep('  function observationJournal(value) {',helpers+'\n  function observationJournal(value) {')
rep("return {id:String(r.id||'').slice(0,100),previousId:", "return {exampleId:observationExampleId(r),nextEvidence:String(r.nextEvidence||'').slice(0,700),context:String(r.context||'').slice(0,300),reviewed:r.reviewed===true,id:String(r.id||'').slice(0,100),previousId:")
rep("+'\\n\\nKey evidence:\\n'+r.path.map", "+'\\n\\nObservation context: '+(r.context||'Not recorded.')+'\\n\\nNext evidence to seek: '+(r.nextEvidence||'Not recorded.')+'\\n\\nEvidence review: '+(r.reviewed?observationEvidenceReview(r.exampleId,r.path.map(function(step){return step.answer;})).detail:'Not requested.')+'\\n\\nKey evidence:\\n'+r.path.map")
rep("      var box={background:C.panel,", "      var reviewKey=JSON.stringify([example.id,route.path.map(function(step){return step.answer;})]);\n      var reviewVisible=d.observationReviewKey===reviewKey;\n      var evidenceReview=observationEvidenceReview(example.id,route.path.map(function(step){return step.answer;}));\n      var box={background:C.panel,")
rep("var row={id:now+'-'+journal.length,date:now,subject:", "var row={exampleId:example.id,context:d.observationContext||'',nextEvidence:d.observationNextEvidence||'',reviewed:reviewVisible,id:now+'-'+Math.random().toString(36).slice(2,9),date:now,subject:")
rep("observationReason:'',observationNote:'',observationNotice:'Observation saved", "observationReason:'',observationNote:'',observationNextEvidence:'',observationNotice:'Observation saved")
rep("observationExample:e.target.value,observationAnswers:[],observationNote:'',observationPreviousId:'',observationReason:'',observationNotice:''",
    "observationExample:e.target.value,observationAnswers:[],observationNote:'',observationPreviousId:'',observationReason:'',observationNotice:'',observationContext:'',observationNextEvidence:'',observationReviewKey:null")
rep("          action('Restart key',function(){patchState({observationAnswers:[]});}),",r'''
          action('Restart key',function(){patchState({observationAnswers:[],observationReviewKey:null});}),
          example.id!=='field' ? action('Review my evidence',function(){patchState({observationReviewKey:reviewKey},evidenceReview.detail);},!route.path.length) : null,
          reviewVisible && example.id!=='field' ? h('section',{'data-observation-evidence-review':evidenceReview.status,style:box},
            h('h3',null,'Evidence check'),
            h('p',{role:'status'},evidenceReview.detail),
            typeof evidenceReview.decision==='number' ? action('Return to this decision',function(){
              patchState({observationAnswers:(d.observationAnswers||[]).slice(0,evidenceReview.decision),observationReviewKey:null},'Returned to decision '+(evidenceReview.decision+1)+'.');
            }) : null
          ) : null,
          h('label',{htmlFor:'oid-observation-context'},'Observation context (optional: habitat, conditions, or lesson setting)'),
          h('input',{id:'oid-observation-context',type:'text',maxLength:300,value:d.observationContext||'',style:inputStyle,onChange:function(e){patchState({observationContext:e.target.value});}}),
''')
rep("          d.observationPreviousId?h('label',null,'What changed in this revision?'",r'''
          h('label',{htmlFor:'oid-next-evidence'},'What evidence would you look for next?'),
          h('textarea',{id:'oid-next-evidence',rows:2,maxLength:700,value:d.observationNextEvidence||'',style:inputStyle,onChange:function(e){patchState({observationNextEvidence:e.target.value});}}),
          d.observationPreviousId?h('label',null,'What changed in this revision?' ''')
# trim introduced space before comma harmless but exact grammar quote verified by node.
rep("h('p',null,'Claim: '+row.claim),","h('p',null,'Claim: '+row.claim),\n              row.context?h('p',null,'Context: '+row.context):null,\n              row.nextEvidence?h('p',null,'Next evidence: '+row.nextEvidence):null,\n              row.reviewed?h('p',null,'Evidence check at save: '+observationEvidenceReview(row.exampleId,row.path.map(function(step){return step.answer;})).detail):null,")
rep("var ex=OBSERVATION_EXAMPLES.find(function(e){return e.name===row.subject;})||OBSERVATION_EXAMPLES[0];patchState({observationExample:ex.id,",
    "var ex=OBSERVATION_EXAMPLES.find(function(e){return e.id===row.exampleId;})||OBSERVATION_EXAMPLES[0];patchState({observationContext:row.context,observationNextEvidence:row.nextEvidence,observationReviewKey:null,observationExample:ex.id,")
rep("      observationRoute: observationRoute,", "      observationEvidenceReview:observationEvidenceReview, observationExampleId:observationExampleId,\n      observationRoute: observationRoute,")
p.write_text(s,encoding='utf-8',newline='\n')
print('Taxonomy evidence coaching and observation context added.')

