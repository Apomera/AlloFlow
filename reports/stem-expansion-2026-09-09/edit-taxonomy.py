
from pathlib import Path
p=Path('stem_lab/stem_tool_organismid.js');s=p.read_text(encoding='utf-8')
def rep(a,b):
 global s
 assert a in s,a[:80]
 s=s.replace(a,b,1)
helpers=r'''
  // A closed teaching key. The outputs group the six examples; they are not species identification.
  var OBSERVATION_EXAMPLES = [
    {id:'bird',name:'Feathered visitor',evidence:'Feathers cover the body. Two wings and two legs are visible.',group:'Bird example'},
    {id:'insect',name:'Six-legged visitor',evidence:'Six jointed legs and two antennae are visible. The body has a head, thorax, and abdomen.',group:'Insect example'},
    {id:'arachnid',name:'Eight-legged visitor',evidence:'Eight jointed legs are visible. No antennae are visible.',group:'Arachnid example'},
    {id:'fern',name:'Frond-bearing plant',evidence:'Green fronds unfold from curled young growth. Small spore-bearing patches appear beneath a mature frond.',group:'Fern example'},
    {id:'fungus',name:'Cap-and-stalk growth',evidence:'A cap and stalk are visible. There are no green leaves. This lesson card describes a fungal fruiting body.',group:'Mushroom example'},
    {id:'moss',name:'Low green cushion',evidence:'Tiny leafy shoots form a cushion. Slender stalks with capsules rise above it. This lesson card describes moss.',group:'Moss example'}
  ];
  var OBSERVATION_KEY = {
    feathers:{question:'Are feathers described?',yes:'Bird example',no:'legs'},
    legs:{question:'Are jointed legs described?',yes:'six',no:'fronds'},
    six:{question:'Are six legs described?',yes:'Insect example',no:'eight'},
    eight:{question:'Are eight legs described?',yes:'Arachnid example',no:'Unresolved'},
    fronds:{question:'Are fronds and spore-bearing patches described?',yes:'Fern example',no:'cap'},
    cap:{question:'Is a cap-and-stalk fungal fruiting body described?',yes:'Mushroom example',no:'capsules'},
    capsules:{question:'Are leafy cushions and stalked capsules described?',yes:'Moss example',no:'Unresolved'}
  };
  function observationRoute(answers) {
    var key='feathers',path=[],input=Array.isArray(answers)?answers:[];
    for(var i=0;i<input.length && OBSERVATION_KEY[key] && i<7;i++){
      var choice=input[i];if(choice!=='yes'&&choice!=='no'&&choice!=='unsure')break;
      path.push({question:OBSERVATION_KEY[key].question,answer:choice});
      if(choice==='unsure')return {path:path,result:'Unresolved',question:null};
      key=OBSERVATION_KEY[key][choice];
    }
    return {path:path,result:OBSERVATION_KEY[key]?null:key,question:OBSERVATION_KEY[key]?OBSERVATION_KEY[key].question:null};
  }
  function observationJournal(value) {
    return (Array.isArray(value)?value:[]).filter(function(r){return r&&typeof r==='object'&&typeof r.note==='string';}).slice(-60).map(function(r){
      return {id:String(r.id||'').slice(0,100),previousId:String(r.previousId||'').slice(0,100),date:String(r.date||'').slice(0,40),subject:String(r.subject||'Observation').slice(0,100),note:r.note.slice(0,2000),reason:String(r.reason||'').slice(0,500),claim:String(r.claim||'Unresolved').slice(0,100),path:(Array.isArray(r.path)?r.path:[]).slice(0,7).map(function(step){return {question:String(step.question||'').slice(0,150),answer:String(step.answer||'').slice(0,10)};})};
    });
  }
  function observationMarkdown(rows) {
    return ['# Taxonomy observation journal','Teaching-key groups are not field identifications.',''].concat(observationJournal(rows).map(function(r){
      return '## '+r.subject+'\n'+r.date+'\n\nObservation: '+r.note+'\n\nTentative teaching group: '+r.claim+'\n\nKey evidence:\n'+r.path.map(function(step){return '- '+step.question+' '+step.answer;}).join('\n')+(r.previousId?'\n\nRevision of '+r.previousId+'. What changed: '+r.reason:'');
    })).join('\n\n');
  }
'''
rep('  // ── The tool ─',helpers+'\n  // ── The tool ─')
rep("    ['learn', '📖', 'Taxonomy 101'],","    ['learn', '📖', 'Taxonomy 101'],\n    ['observe', '🔎', 'Observe & Record'],")
render=r'''
    function renderObservationView() {
      var example=OBSERVATION_EXAMPLES.find(function(e){return e.id===d.observationExample;})||OBSERVATION_EXAMPLES[0];
      var route=observationRoute(d.observationAnswers),journal=observationJournal(d.observationJournal);
      var box={background:C.panel,color:C.text,border:'1px solid '+C.border,borderRadius:10,padding:14,marginBottom:12};
      var inputStyle={width:'100%',boxSizing:'border-box',display:'block',background:C.raised,color:C.text,border:'1px solid '+C.border,borderRadius:6,padding:10};
      function action(label,fn,disabled){return h('button',{type:'button',onClick:fn,disabled:!!disabled,style:{padding:'10px 14px',minHeight:44,margin:'4px 6px 4px 0',background:C.raised,color:C.text,border:'1px solid '+C.border,borderRadius:7}},label);}
      function saveObservation(){
        if(!String(d.observationNote||'').trim()){patchState({observationNotice:'Write an observation before saving.'});return;}
        if(d.observationPreviousId&&!String(d.observationReason||'').trim()){patchState({observationNotice:'Describe what changed before saving a revision.'});return;}
        var now=new Date().toISOString();
        var row={id:now+'-'+journal.length,date:now,subject:example.name,note:String(d.observationNote).trim(),claim:route.result||'Key unfinished',path:route.path,previousId:d.observationPreviousId||'',reason:d.observationReason||''};
        patchState({observationJournal:observationJournal(journal.concat([row])),observationPreviousId:'',observationReason:'',observationNote:'',observationNotice:'Observation saved in this project. Up to 60 recent entries are retained; export a copy for your field notebook.'},'Observation saved.');
      }
      return h('div',{'data-taxonomy-observation':true,style:{maxWidth:1000,margin:'auto',padding:16}},
        h('section',{style:box},
          h('h2',null,'Observe before naming'),
          h('p',null,'Practice a branching key on six teaching examples. Each answer must come from the description. The key groups these examples; it cannot identify a wild organism. Choose “Not sure” when evidence is missing.'),
          h('label',{htmlFor:'oid-observation-example'},'Teaching example'),
          h('select',{id:'oid-observation-example',value:example.id,style:inputStyle,onChange:function(e){patchState({observationExample:e.target.value,observationAnswers:[],observationNote:'',observationPreviousId:'',observationReason:'',observationNotice:''});}},
            OBSERVATION_EXAMPLES.map(function(e){return h('option',{key:e.id,value:e.id},e.name);})),
          h('p',{'data-example-evidence':true},example.evidence),
          h('ol',null,route.path.map(function(step,i){return h('li',{key:i},step.question+' '+(step.answer==='unsure'?'Not sure':step.answer));})),
          route.question?h('div',null,h('h3',null,route.question),['yes','no','unsure'].map(function(choice){
            return h('button',{key:choice,type:'button',style:{padding:12,minHeight:44,margin:4,background:C.raised,color:C.text,border:'1px solid '+C.border,borderRadius:7},onClick:function(){patchState({observationAnswers:(d.observationAnswers||[]).slice(0,route.path.length).concat([choice])});}},choice==='unsure'?'Not sure':choice==='yes'?'Yes':'No');
          })):h('p',{role:'status','data-key-result':true},'Tentative teaching group: '+route.result+'. '+(route.result==='Unresolved'?'Gather another observation; a missing feature is not evidence that it is absent.':'Check every decision against the example before saving your claim.')),
          action('Back one decision',function(){patchState({observationAnswers:(d.observationAnswers||[]).slice(0,-1)});},!route.path.length),
          action('Restart key',function(){patchState({observationAnswers:[]});}),
          h('label',{htmlFor:'oid-observation-note'},'What did you observe, and what is still uncertain?'),
          h('textarea',{id:'oid-observation-note',rows:4,maxLength:2000,value:d.observationNote||'',style:inputStyle,onChange:function(e){patchState({observationNote:e.target.value,observationNotice:''});}}),
          d.observationPreviousId?h('label',null,'What changed in this revision?',h('textarea',{rows:2,maxLength:500,value:d.observationReason||'',style:inputStyle,onChange:function(e){patchState({observationReason:e.target.value});}})):null,
          action(d.observationPreviousId?'Save observation revision':'Save observation',saveObservation,journal.length>=60&&!String(d.observationNote||'').trim()),
          d.observationNotice?h('p',{role:'status'},d.observationNotice):null),
        h('section',{style:box},h('h2',null,'Observation journal'),
          h('p',null,'Revisit an entry to refine your evidence. Earlier observations remain beside their revisions. Save the AlloFlow project to retain this journal between sessions.'),
          action('Export observation journal',function(){
            var url=URL.createObjectURL(new Blob([observationMarkdown(journal)],{type:'text/markdown;charset=utf-8'})),a=document.createElement('a');
            a.href=url;a.download='taxonomy-observations.md';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
          },!journal.length),
          journal.length?journal.slice().reverse().map(function(row){
            var previous=journal.find(function(r){return r.id===row.previousId;});
            return h('article',{key:row.id,style:box},h('h3',null,row.subject),h('p',null,row.date),h('p',null,row.note),h('p',null,'Claim: '+row.claim),
              previous?h('blockquote',null,'Earlier observation: '+previous.note):null,
              row.reason?h('p',null,'What changed: '+row.reason):null,
              action('Revisit '+row.subject,function(){var ex=OBSERVATION_EXAMPLES.find(function(e){return e.name===row.subject;})||OBSERVATION_EXAMPLES[0];patchState({observationExample:ex.id,observationAnswers:row.path.map(function(st){return st.answer;}),observationNote:row.note,observationPreviousId:row.id,observationReason:'',observationNotice:'Revise the evidence above, then explain what changed.'});document.getElementById('oid-observation-note').focus();}));
          }):h('p',null,'No observations yet. Save your first evidence note above.'))
      );
    }
'''
rep('    var body;\n',render+'\n    var body;\n')
rep("    if (activeView === 'groups') body = renderGroupsView();","    if (activeView === 'observe') body = renderObservationView();\n    else if (activeView === 'groups') body = renderGroupsView();")
rep('    testHooks: {\n','    testHooks: {\n      observationRoute: observationRoute, observationJournal: observationJournal, observationMarkdown: observationMarkdown,\n')
p.write_text(s,encoding='utf-8',newline='\n')
print('Taxonomy branching key and revisable observation journal added.')

