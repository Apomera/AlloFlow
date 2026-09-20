from pathlib import Path
out=Path('reports/stem-revision-coaching-2026-09-19');out.mkdir(exist_ok=True)
p=Path('stem_lab/stem_tool_openbim.js');s=p.read_text(encoding='utf-8')
anchor='  function normalizeDesignTrials(value) {'
new='''  function designConstraintFeedback(value) {
    var result=evaluateDesignStudy(value),d=result.dimensions;
    function rounded(n){return Math.round(n*10000)/10000;}
    var floorExcess=rounded(Math.max(0,result.area-60)),workShortfall=rounded(Math.max(0,24-result.workArea));
    var widthOverflow=rounded(Math.max(0,d.workWidth-d.width)),depthOverflow=rounded(Math.max(0,d.workDepth-d.depth));
    return [
      {id:'floor',met:floorExcess===0,label:'Floor area: at most 60 m²',detail:floorExcess?'Over the target by '+floorExcess+' m².':result.area===60?'Exactly at the target.':rounded(60-result.area)+' m² below the maximum.'},
      {id:'work',met:workShortfall===0,label:'Work area: at least 24 m²',detail:workShortfall?'Needs '+workShortfall+' m² more work area.':result.workArea===24?'Exactly at the target.':rounded(result.workArea-24)+' m² above the minimum.'},
      {id:'fit',met:result.fits,label:'Work rectangle fits inside the floor',detail:result.fits?'Both work dimensions fit within the corresponding floor dimensions.':(widthOverflow?'Work width exceeds floor width by '+widthOverflow+' m. ':'')+(depthOverflow?'Work depth exceeds floor depth by '+depthOverflow+' m.':'')}
    ];
  }

'''
assert anchor in s;s=s.replace(anchor,new+anchor,1)
s=s.replace('normalizeDesignTrials: normalizeDesignTrials,','designConstraintFeedback: designConstraintFeedback, normalizeDesignTrials: normalizeDesignTrials,',1)
anchor="          el('details',null,el('summary',null,'Inspect storeys and planned spaces'),"
new="""          el('section',{'data-design-constraints':true,style:{margin:'12px 0',padding:14,border:'1px solid '+colors.border,borderRadius:10}},
            el('h4',null,'Check each design target'),
            pendingDimensions ? el('p',null,'These checks use the applied dimensions. Apply your edits to update them.') : null,
            el('ul',null,designConstraintFeedback(dims).map(function(check){return el('li',{key:check.id,'data-design-constraint':check.id,style:{marginBottom:10}},
              el('strong',null,(check.met?'Met: ':'Revise: ')+check.label),el('p',{style:{margin:'4px 0'}},check.detail));})),
            el('p',null,'Change one dimension and check all three targets again. Meeting an area target alone does not guarantee a fit.')),
"""
assert anchor in s;s=s.replace(anchor,new+anchor,1);p.write_text(s,encoding='utf-8')
p=Path('stem_lab/stem_tool_organismid.js');s=p.read_text(encoding='utf-8')
anchor='  function observationMarkdown(rows) {'
new='''  function compareObservations(before, after) {
    var pair=observationJournal([before,after]);
    if(pair.length!==2)return [];
    var a=pair[0],b=pair[1],changes=[];
    function add(label,oldValue,newValue){if(oldValue!==newValue)changes.push({label:label,before:oldValue||'Not recorded.',after:newValue||'Not recorded.'});}
    [['subject','Title'],['note','Observation'],['claim','Tentative group'],['context','Context'],['nextEvidence','Next evidence']].forEach(function(field){add(field[1],a[field[0]],b[field[0]]);});
    var questions=Array.from(new Set(a.path.concat(b.path).map(function(step){return step.question;})));
    function answer(row,question){var step=row.path.find(function(item){return item.question===question;});return !step?'Not asked':step.answer==='unsure'?'Not sure':step.answer==='yes'?'Yes':step.answer==='no'?'No':step.answer;}
    questions.forEach(function(question){add('Key decision: '+question,answer(a,question),answer(b,question));});
    function review(row){return row.reviewed?observationEvidenceReview(row.exampleId,row.path.map(function(step){return step.answer;})).detail:'Not requested.';}
    add('Evidence review',review(a),review(b));
    return changes;
  }
'''
assert anchor in s;s=s.replace(anchor,new+anchor,1)
s=s.replace("    return ['# Taxonomy observation journal','Teaching-key groups are not field identifications.',''].concat(observationJournal(rows).map(function(r){", "    var journal=observationJournal(rows);\n    return ['# Taxonomy observation journal','Teaching-key groups are not field identifications.',''].concat(journal.map(function(r){\n      var previous=journal.find(function(row){return row.id===r.previousId;}),changes=previous?compareObservations(previous,r):[];\n      var comparison=r.previousId?'\\n\\nRevision comparison:\\n'+(previous?(changes.length?changes.map(function(change){return '- '+change.label+': '+change.before+' → '+change.after;}).join('\\n'):'No recorded evidence fields or key decisions changed.'):'The earlier entry is not available in this journal.'):'';",1)
s=s.replace("return '## '+r.subject+'\\n'+r.date+'\\n\\nObservation: '","return '## '+r.subject+'\\n'+r.date+'\\n\\nEntry ID: '+r.id+'\\n\\nObservation: '",1)
s=s.replace("+'. What changed: '+r.reason:'');", "+'. What changed: '+r.reason:'')+comparison;",1)
# Export the comparison helper alongside existing hooks.
s=s.replace('observationJournal: observationJournal,','compareObservations: compareObservations, observationJournal: observationJournal,',1)
anchor="      function saveObservation(){\n"
s=s.replace(anchor,anchor+"        if(journal.length>=60){patchState({observationNotice:'The journal has 60 entries. Export a copy, then remove an entry before saving. Your draft is still here.'},'Journal full. Your draft has been kept.');return;}\n",1)
s=s.replace("Observation saved in this project. Up to 60 recent entries are retained; export a copy for your field notebook.","Observation saved in this project. Export a copy for your field notebook.",1)
s=s.replace("saveObservation,journal.length>=60&&!String(d.observationNote||'').trim())", "saveObservation)",1)
s=s.replace("h('section',{style:box},h('h2',null,'Observation journal'),", "h('section',{'data-observation-journal':true,style:box},h('h2',{id:'oid-journal-heading',tabIndex:-1},'Observation journal'),\n          h('p',{role:'status'},journal.length+'/60 entries. '+(journal.length>=60?'Journal full. Export a copy and remove an entry to make room.':'Saving a revision adds an entry and keeps the earlier observation.')),",1)
anchor="          journal.length?journal.slice().reverse().map(function(row){"
new="""          d.observationRemoved && action('Undo observation removal',function(){
            if(journal.length>=60){patchState({observationNotice:'The journal has 60 entries. Remove an entry before restoring this observation.'},'Journal full. The removed observation is still available to undo.');return;}
            var restored=journal.slice(),removed=d.observationRemoved;
            restored.splice(Math.max(0,Math.min(restored.length,removed.index)),0,removed.row);
            patchState({observationJournal:observationJournal(restored),observationRemoved:null,observationNotice:'Observation restored in its original journal position.'},'Observation restored.');
            document.getElementById('oid-journal-heading').focus();
          }),
"""
assert anchor in s;s=s.replace(anchor,new+anchor,1)
anchor="              previous?h('blockquote',null,'Earlier observation: '+previous.note):null,"
new="""              row.previousId ? h('details',{'data-observation-comparison':true},h('summary',null,'Compare with earlier observation'),
                previous ? (function(){var changes=compareObservations(previous,row);return changes.length?h('ul',null,changes.map(function(change,i){return h('li',{key:i,style:{marginBottom:12,overflowWrap:'anywhere'}},h('strong',null,change.label),h('p',null,'Before: '+change.before),h('p',null,'After: '+change.after));})):h('p',null,'No recorded evidence fields or key decisions changed.');})() : h('p',null,'The earlier entry is not available in this journal.')) : null,
"""
assert anchor in s;s=s.replace(anchor,new,1)
anchor="              action('Revisit '+row.subject,function()"
new="""              action('Remove '+row.subject,function(){
                var index=journal.indexOf(row);
                patchState({observationJournal:journal.filter(function(item,i){return i!==index;}),observationRemoved:{row:row,index:index},observationNotice:'Observation removed. Undo is available for the most recent removal.'},'Observation removed. Undo is available.');
                document.getElementById('oid-journal-heading').focus();
              }),
"""
assert anchor in s;s=s.replace(anchor,new+anchor,1)
p.write_text(s,encoding='utf-8')
for name in ['openbim','organismid']:
 src=Path('stem_lab/stem_tool_'+name+'.js');Path('desktop/web-app/public/stem_lab/'+src.name).write_bytes(src.read_bytes())
print('Updated OpenBIM constraint coaching and Taxonomy journal revisions.')
