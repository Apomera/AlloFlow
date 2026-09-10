
from pathlib import Path
p=Path('stem_lab/stem_tool_openbim.js');s=p.read_text(encoding='utf-8')
def rep(a,b):
 global s
 assert a in s,a[:80]
 s=s.replace(a,b,1)
helpers=r'''
  function normalizeDesignStudy(value) {
    var raw = value || {}, defaults = { width: 8, depth: 6, workWidth: 6, workDepth: 4 }, out = {};
    Object.keys(defaults).forEach(function(key) { var n = Number(raw[key]); out[key] = isFinite(n) && n >= 1 && n <= 100 ? Math.round(n * 100) / 100 : defaults[key]; });
    return out;
  }
  function evaluateDesignStudy(value) {
    var d = normalizeDesignStudy(value);
    var area = Math.round(d.width*d.depth*10000)/10000, workArea = Math.round(d.workWidth*d.workDepth*10000)/10000;
    var fits = d.workWidth <= d.width && d.workDepth <= d.depth;
    return { dimensions: d, area: area, workArea: workArea, fits: fits, meetsBrief: fits && area <= 60 && workArea >= 24 };
  }
  function comparePlans(before, after) {
    if (!before || !after) return [];
    var changes = [], a = normalizeDesignStudy(before.designStudy), b = normalizeDesignStudy(after.designStudy);
    Object.keys(a).forEach(function(key) { if (a[key] !== b[key]) changes.push(key + ': ' + a[key] + ' m → ' + b[key] + ' m'); });
    function totals(plan) { var out = {}; (plan.elements || []).forEach(function(e) { var key = e.ifcClass + ' / ' + e.storey; out[key] = (out[key] || 0) + Number(e.count || 0); }); return out; }
    var oldTotals = totals(before), newTotals = totals(after);
    Array.from(new Set(Object.keys(oldTotals).concat(Object.keys(newTotals)))).forEach(function(key) {
      if ((oldTotals[key] || 0) !== (newTotals[key] || 0)) changes.push(key + ': ' + (oldTotals[key] || 0) + ' → ' + (newTotals[key] || 0));
    });
    if (JSON.stringify(before.storeys) !== JSON.stringify(after.storeys)) changes.push('Storey names, elevations, or planned spaces changed. Inspect the spatial plan.');
    if (JSON.stringify(before.architectureStudio) !== JSON.stringify(after.architectureStudio)) changes.push('Linked Architecture Studio proxy geometry changed.');
    if (before.brief !== after.brief) changes.push('The design brief changed.');
    return changes;
  }
'''
rep('  function normalizeImportedRecipe(raw) {',helpers+'\n  function normalizeImportedRecipe(raw) {')
rep("    normalized.architectureStudio = architecture;","    normalized.architectureStudio = architecture;\n    normalized.designStudy = normalizeDesignStudy(parsed.designStudy);")
rep("    recipe.status = 'approved-concept';","    recipe.status = 'approved-concept';\n    recipe.designStudy = normalizeDesignStudy(plan.designStudy);")
rep("    schema: RECIPE_SCHEMA,\n    version: RECIPE_VERSION,\n    allowedClasses:", "    normalizeDesignStudy: normalizeDesignStudy, evaluateDesignStudy: evaluateDesignStudy, comparePlans: comparePlans,\n    schema: RECIPE_SCHEMA,\n    version: RECIPE_VERSION,\n    allowedClasses:")
workbench=r'''
      function renderDesignWorkbench() {
        var plan = proposal || approved;
        if (!plan || (stage !== 'review' && stage !== 'export')) return null;
        var model = evaluateDesignStudy(plan.designStudy), dims = model.dimensions;
        var draft = state.designDraft || dims;
        var fields = [['width','Floor width'],['depth','Floor depth'],['workWidth','Work area width'],['workDepth','Work area depth']];
        var changes = state.comparisonBaseline ? comparePlans(state.comparisonBaseline, plan) : [];
        var scale = Math.min(300 / Math.max(dims.width,dims.workWidth), 170 / Math.max(dims.depth,dims.workDepth));
        function applyDimensions() {
          var valid = fields.every(function(f) { var n=Number(draft[f[0]]);return String(draft[f[0]]).trim()!=='' && isFinite(n) && n>=1 && n<=100; });
          if (!valid) { update({ designNotice: 'Enter dimensions from 1 to 100 metres in all four fields.' }); return; }
          var next = JSON.parse(JSON.stringify(plan)); next.designStudy = normalizeDesignStudy(draft);
          update({ proposal:next,approvedRecipe:null,stage:'review',designDraft:null,designNotice:'Study dimensions updated. Review the changed concept before exporting.' });
          announce('Design study updated.');
        }
        return el('section',{ 'data-openbim-workbench':true, style:{margin:'16px 0',padding:16,border:'1px solid '+colors.border,borderRadius:12,background:colors.panel} },
          el('h3',null,'Design workbench'),
          el('p',null,'Design challenge: fit a rectangular work area of at least 24 m² inside a floor of at most 60 m². These are classroom design targets.'),
          el('p',{style:{color:colors.soft,fontSize:12}},'This dimensioned study is separate from the building inventory. The rectangle shows an example floor footprint, not positioned IFC walls or a finished floor plan. Study dimensions travel in the JSON recipe; they do not create IFC geometry.'),
          el('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10}},fields.map(function(f){
            return el('label',{key:f[0],style:{display:'block'}},f[1]+' (m)',
              el('input',{type:'number',min:1,max:100,step:.01,value:draft[f[0]],'aria-label':f[1]+' in metres',onChange:function(e){var next=Object.assign({},draft);next[f[0]]=e.target.value;update({designDraft:next,designNotice:''});},style:{display:'block',width:'100%',padding:9,color:colors.ink,background:colors.surface,border:'1px solid '+colors.border}}));
          })),
          button('Apply study dimensions',applyDimensions),
          state.designNotice && el('p',{role:'status'},state.designNotice),
          el('svg',{viewBox:'0 0 390 245',role:'img','aria-label':'Dimensioned floor study. Floor '+dims.width+' by '+dims.depth+' metres; work area '+dims.workWidth+' by '+dims.workDepth+' metres. '+(model.fits?'Work area fits.':'Work area extends beyond the floor.'),style:{display:'block',width:'100%',maxWidth:600,color:colors.ink}},
            el('rect',{x:40,y:35,width:dims.width*scale,height:dims.depth*scale,fill:colors.surface,stroke:colors.ink,strokeWidth:2}),
            el('rect',{x:40,y:35,width:dims.workWidth*scale,height:dims.workDepth*scale,fill:colors.chipBg,stroke:colors.teal,strokeWidth:3,strokeDasharray:'8 4'}),
            el('text',{x:40,y:23,fill:colors.ink,fontSize:13},'Floor width: '+dims.width+' m'),
            el('text',{x:40,y:230,fill:colors.ink,fontSize:13},'Floor depth: '+dims.depth+' m; dashed outline = work area')),
          el('p',{role:'status','data-design-result':model.meetsBrief?'meets':'revise'},'Floor: '+model.area+' m². Work area: '+model.workArea+' m². '+(!model.fits?'The work area extends beyond the floor.':model.meetsBrief?'Both classroom targets are met. Explain your tradeoff.':'Revise dimensions to meet both classroom targets.')),
          el('details',null,el('summary',null,'Inspect storeys and planned spaces'),
            plan.storeys.map(function(st){return el('p',{key:st.id},st.name+' at '+st.elevationMetres+' m: '+st.spaces.join(', '));})),
          el('label',{style:{display:'block',marginTop:12}},'Design reasoning',
            el('textarea',{value:state.designReasoning||'',maxLength:1500,rows:3,onChange:function(e){update({designReasoning:e.target.value});},style:{display:'block',width:'100%',padding:10,color:colors.ink,background:colors.surface,border:'1px solid '+colors.border}})),
          el('div',{style:{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}},
            button(state.comparisonBaseline?'Replace comparison baseline':'Save comparison baseline',function(){update({comparisonBaseline:JSON.parse(JSON.stringify(plan)),designNotice:'Comparison baseline saved in this project.'});}),
            button('Import revised recipe',function(){update({stage:'brief',statusMessage:'Use Resume an exported recipe below. Your comparison baseline is retained.'});})),
          state.comparisonBaseline && el('div',{'data-openbim-comparison':true},
            el('h4',null,'Changes since saved baseline'),
            changes.length?el('ul',null,changes.map(function(change,i){return el('li',{key:i},change);})):el('p',null,'No dimension, inventory, spatial-plan, proxy-geometry, or brief changes.'),
            el('p',{style:{fontSize:12,color:colors.soft}},'Compare AlloFlow JSON recipes here. Native IFC files still open in Bonsai.'))
        );
      }
'''
rep("      return el('div', { className: 'openbim-root',",workbench+"\n      return el('div', { className: 'openbim-root',")
rep("          reviewStage,\n          exportStage,","          reviewStage,\n          renderDesignWorkbench(),\n          exportStage,")
# Imported plans replace the draft but keep a deliberately saved comparison baseline.
rep("            saveProposal(result.plan, message);","            update({ designDraft: null, designNotice: '' });\n            saveProposal(result.plan, message);")
p.write_text(s,encoding='utf-8',newline='\n')
print('OpenBIM design study and revision comparison added.')

