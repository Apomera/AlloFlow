from pathlib import Path
p=Path('stem_lab/stem_tool_openbim.js')
s=p.read_text(encoding='utf-8')
s=s.replace('  function normalizeDesignTrials(value) {\n    return', '  function normalizeDesignTrials(value) {\n    var usedIds = new Set();\n    return',1)
s=s.replace("      return { id: plain(row.id, 100) || 'imported-trial-' + index, label:", "      var baseId = plain(row.id, 80) || 'imported-trial-' + index, id = baseId, suffix = 1;\n      while (usedIds.has(id)) id = baseId + '-' + suffix++;\n      usedIds.add(id);\n      return { id: id, label:",1)
s=s.replace("          var id='design-'+Date.now()+'-'+trials.length;", "          var baseId='design-'+Date.now(),id=baseId,suffix=1;\n          while(trials.some(function(row){return row.id===id;}) || (state.removedDesignTrial && state.removedDesignTrial.id===id)) id=baseId+'-'+suffix++;")
p.write_text(s,encoding='utf-8')
p=Path('stem_lab/stem_tool_organismid.js');s=p.read_text(encoding='utf-8')
s=s.replace("concat([choice])});", "concat([choice]),observationReviewKey:null});",1)
s=s.replace("slice(0,-1)});},!route.path.length)", "slice(0,-1),observationReviewKey:null});},!route.path.length)",1)
p.write_text(s,encoding='utf-8')
p=Path('tests/stem_investigation_refinement.test.js');s=p.read_text(encoding='utf-8')
anchor=" it('preserves trials through export and import without trusting stored result claims'"
pos=s.index(anchor)
s=s[:pos]+""" it('keeps imported trials independently selectable when their IDs collide',()=>{
  const api=bim(),trial={id:'same',dimensions:{width:8,depth:6,workWidth:6,workDepth:4}};
  const rows=api.normalizeDesignTrials([trial,{...trial,label:'Second'},{...trial,id:'same-1'}]);
  expect(new Set(rows.map(row=>row.id)).size).toBe(3);
  expect(api.normalizeDesignTrials(rows)).toEqual(rows);
 });
"""+s[pos:]
anchor="  await input('#oid-observation-context','Classroom card');"
s=s.replace(anchor,"""  await click('Back one decision');await click('Yes');
  expect(document.querySelector('[data-observation-evidence-review]')).toBeNull();
  await click('Review my evidence');
"""+anchor,1)
p.write_text(s,encoding='utf-8')
for name in ['openbim','organismid']:
 src=Path('stem_lab/stem_tool_'+name+'.js')
 Path('desktop/web-app/public/stem_lab/'+src.name).write_bytes(src.read_bytes())
