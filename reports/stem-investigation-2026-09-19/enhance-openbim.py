
from pathlib import Path
p=Path('stem_lab/stem_tool_openbim.js')
s=p.read_text(encoding='utf-8')
def rep(a,b):
 global s
 assert a in s,a[:90]
 s=s.replace(a,b,1)
helpers=r'''
  function normalizeDesignTrials(value) {
    return (Array.isArray(value) ? value : []).filter(function(row) {
      return row && row.dimensions && ['width','depth','workWidth','workDepth'].every(function(key) {
        var n = Number(row.dimensions[key]); return String(row.dimensions[key]).trim() !== '' && isFinite(n) && n >= 1 && n <= 100;
      });
    }).slice(-20).map(function(row, index) {
      return { id: plain(row.id, 100) || 'imported-trial-' + index, label: plain(row.label, 80) || 'Design trial',
        dimensions: normalizeDesignStudy(row.dimensions), reasoning: plain(row.reasoning, 1500), date: plain(row.date, 40) };
    });
  }
  function compareDesignTrials(before, after) {
    var a=evaluateDesignStudy(before),b=evaluateDesignStudy(after);
    return {floorChange:Math.round((b.area-a.area)*10000)/10000,workChange:Math.round((b.workArea-a.workArea)*10000)/10000,
      previousFits:a.fits,currentFits:b.fits,previousMeetsBrief:a.meetsBrief,currentMeetsBrief:b.meetsBrief};
  }
  function designTrialMarkdown(trials) {
    return ['# OpenBIM design trials','Classroom targets: work area at least 24 m², floor area at most 60 m², with the work rectangle fitting inside the floor.','These studies are not IFC geometry or accessibility clearance checks.']
      .concat(normalizeDesignTrials(trials).map(function(row) {
        var r=evaluateDesignStudy(row.dimensions),d=r.dimensions;
        return '## '+row.label+'\n'+row.date+'\n\nFloor: '+d.width+' × '+d.depth+' m = '+r.area+' m².\n\nWork area: '+d.workWidth+' × '+d.workDepth+' m = '+r.workArea+' m².\n\nFits: '+(r.fits?'yes':'no')+'. Classroom targets: '+(r.meetsBrief?'met':'not yet met')+'.\n\nReasoning: '+(row.reasoning||'Not recorded.');
      })).join('\n\n');
  }
'''
rep('  function comparePlans(before, after) {',helpers+'\n  function comparePlans(before, after) {')
rep("    normalized.designReasoning = plain(parsed.designReasoning,1500);","    normalized.designReasoning = plain(parsed.designReasoning,1500);\n    normalized.designTrials = normalizeDesignTrials(parsed.designTrials);")
rep("    recipe.designStudy = normalizeDesignStudy(plan.designStudy);","    recipe.designStudy = normalizeDesignStudy(plan.designStudy);\n    recipe.designTrials = normalizeDesignTrials(plan.designTrials);")
rep("    normalizeDesignStudy: normalizeDesignStudy,","    normalizeDesignTrials: normalizeDesignTrials, compareDesignTrials: compareDesignTrials, designTrialMarkdown: designTrialMarkdown,\n    normalizeDesignStudy: normalizeDesignStudy,")
rep("        var changes = state.comparisonBaseline ?", "        var trials = normalizeDesignTrials(plan.designTrials);\n        var selectedTrial = trials.find(function(row) { return row.id === state.selectedDesignTrial; }) || null;\n        var pendingDimensions = fields.some(function(f) { return String(draft[f[0]]).trim() === '' || Number(draft[f[0]]) !== dims[f[0]]; });\n        var changes = state.comparisonBaseline ?")
start="        return el('section',{ 'data-openbim-workbench':true,"
rep(start,r'''
        function saveTrial() {
          if (pendingDimensions) { update({ designNotice:'Apply the edited dimensions before saving a trial.' }); return; }
          if (trials.length >= 20) { update({ designNotice:'This notebook has 20 trials. Export it, then remove a trial before adding another.' }); return; }
          var id='design-'+Date.now()+'-'+trials.length;
          var row={id:id,label:plain(state.designTrialLabel,80)||'Trial '+(trials.length+1),date:new Date().toISOString(),dimensions:dims,reasoning:plan.designReasoning||''};
          var next=Object.assign({},plan,{designTrials:normalizeDesignTrials(trials.concat([row]))});
          update({proposal:next,approvedRecipe:null,stage:'review',selectedDesignTrial:id,designTrialLabel:'',designNotice:'Trial saved. Change one dimension and compare the effect.'});
          announce('Design trial saved.');
        }
        function restoreTrial() {
          if(!selectedTrial)return;
          var next=Object.assign({},plan,{designStudy:Object.assign({},selectedTrial.dimensions),designReasoning:selectedTrial.reasoning});
          update({proposal:next,approvedRecipe:null,stage:'review',designDraft:null,designNotice:'Saved dimensions and reasoning restored. Review before exporting.'});
          announce('Saved design trial restored.');
        }
        function trialNotebook() {
          var delta=selectedTrial?compareDesignTrials(selectedTrial.dimensions,dims):null;
          function signed(n){return (n>0?'+':'')+n;}
          return el('section',{'data-design-trials':true,style:{marginTop:16,padding:14,border:'1px solid '+colors.border,borderRadius:10}},
            el('h4',null,'Design trial notebook'),
            el('p',null,'Save a trial, change one dimension, and explain the tradeoff. Rotating the work rectangle preserves its area but can change whether it fits.'),
            el('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},
              button('Rotate work area 90°',function(){
                if(pendingDimensions){update({designNotice:'Apply the edited dimensions before rotating the work area.'});return;}
                var next=Object.assign({},plan,{designStudy:Object.assign({},dims,{workWidth:dims.workDepth,workDepth:dims.workWidth})});
                update({proposal:next,approvedRecipe:null,stage:'review',designDraft:null,designNotice:'Work area rotated. Its area stays the same; compare the fit.'});
                announce('Work area rotated.');
              }),
              button('Export design trials',function(){var ok=downloadText('openbim-design-trials.md',designTrialMarkdown(trials),'text/markdown;charset=utf-8');update({designNotice:ok?'Design trials exported.':'The browser could not download the notebook.'});},{disabled:!trials.length})),
            el('label',{style:{display:'block',marginTop:10}},'Trial name (optional)',
              el('input',{value:state.designTrialLabel||'',maxLength:80,onChange:function(e){update({designTrialLabel:e.target.value});},style:{display:'block',width:'100%',padding:10,color:colors.ink,background:colors.surface,border:'1px solid '+colors.border}})),
            button('Save design trial',saveTrial,{disabled:trials.length>=20}),
            el('p',null,trials.length+'/20 saved trials. Trials and reasoning travel with the exported AlloFlow recipe.'),
            trials.length ? el('div',null,
              el('label',null,'Compare with a saved trial',
                el('select',{value:selectedTrial?selectedTrial.id:'',onChange:function(e){update({selectedDesignTrial:e.target.value});},style:{display:'block',width:'100%',padding:10,color:colors.ink,background:colors.surface,border:'1px solid '+colors.border}},
                  el('option',{value:''},'Choose a trial'),trials.map(function(row,i){return el('option',{key:row.id,value:row.id},(i+1)+'. '+row.label);}))),
              selectedTrial && el('div',{'data-design-trial-comparison':true},
                el('p',{role:'status'},'Current compared with '+selectedTrial.label+': floor area '+signed(delta.floorChange)+' m²; work area '+signed(delta.workChange)+' m². Fit: '+(delta.previousFits?'fits':'does not fit')+' → '+(delta.currentFits?'fits':'does not fit')+'.'),
                el('p',null,'Saved reasoning: '+(selectedTrial.reasoning||'Not recorded.')),
                button('Restore selected trial',restoreTrial),
                button('Remove selected trial',function(){
                  var next=Object.assign({},plan,{designTrials:trials.filter(function(row){return row.id!==selectedTrial.id;})});
                  update({proposal:next,approvedRecipe:null,stage:'review',selectedDesignTrial:'',removedDesignTrial:selectedTrial,designNotice:'Trial removed. You can undo this removal.'});
                })),
              state.removedDesignTrial && button('Undo trial removal',function(){
                if(trials.length>=20){update({designNotice:'Remove a trial first; the notebook holds 20 trials.'});return;}
                var next=Object.assign({},plan,{designTrials:normalizeDesignTrials(trials.concat([state.removedDesignTrial]))});
                update({proposal:next,approvedRecipe:null,stage:'review',selectedDesignTrial:state.removedDesignTrial.id,removedDesignTrial:null,designNotice:'Trial restored to the notebook.'});
              })
            ) : state.removedDesignTrial ? button('Undo trial removal',function(){
              var next=Object.assign({},plan,{designTrials:normalizeDesignTrials([state.removedDesignTrial])});
              update({proposal:next,approvedRecipe:null,stage:'review',selectedDesignTrial:state.removedDesignTrial.id,removedDesignTrial:null,designNotice:'Trial restored to the notebook.'});
            }) : null,
            el('p',{style:{fontSize:12,color:colors.soft}},'Unused floor area is not a measurement of usable circulation or accessibility clearance.')
          );
        }
''' + start)
rep("          state.comparisonBaseline && el('div',{'data-openbim-comparison':true},","          trialNotebook(),\n          state.comparisonBaseline && el('div',{'data-openbim-comparison':true},")
# Reset pending notebook UI on a new/imported proposal so undo cannot leak between projects.
needle="      function saveProposal("
idx=s.index(needle);end=s.index('\n      }',idx)
chunk=s[idx:end]
# Insert an update in this function before its existing work.
brace=chunk.index('{')
chunk=chunk[:brace+1]+"\n        update({designDraft:null,selectedDesignTrial:'',removedDesignTrial:null,designTrialLabel:''});"+chunk[brace+1:]
s=s[:idx]+chunk+s[end:]
p.write_text(s,encoding='utf-8',newline='\n')
print('OpenBIM trial notebook added.')

