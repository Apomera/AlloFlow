from pathlib import Path
p=Path('stem_lab/stem_tool_organismid.js');s=p.read_text(encoding='utf-8')
anchor='      function saveObservation(){'
new='''      function exportObservations(rows,filename){
        var url=URL.createObjectURL(new Blob([observationMarkdown(rows)],{type:'text/markdown;charset=utf-8'})),a=document.createElement('a');
        a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
      }
'''
assert anchor in s;s=s.replace(anchor,new+anchor,1)
old="""          action('Export observation journal',function(){
            var url=URL.createObjectURL(new Blob([observationMarkdown(journal)],{type:'text/markdown;charset=utf-8'})),a=document.createElement('a');
            a.href=url;a.download='taxonomy-observations.md';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
          },!journal.length),"""
new="""          action('Export observation journal',function(){exportObservations(journal,'taxonomy-observations.md');},!journal.length),
          d.observationRemoved && action('Export removed observation',function(){exportObservations([d.observationRemoved.row],'taxonomy-removed-observation.md');}),"""
assert old in s;s=s.replace(old,new,1)
s=s.replace('The journal has 60 entries. Remove an entry before restoring this observation.','The journal has 60 entries. Export the removed observation to keep a separate copy; another removal will replace this undo.',1)
p.write_text(s,encoding='utf-8');Path('desktop/web-app/public/stem_lab/'+p.name).write_bytes(p.read_bytes())
p=Path('tests/stem_revision_coaching.test.js');s=p.read_text(encoding='utf-8').replace("toContain('before restoring')","toContain('Export the removed observation')");p.write_text(s,encoding='utf-8')
p=Path('reports/stem-revision-coaching-2026-09-19/browser-qa.cjs');s=p.read_text(encoding='utf-8')
anchor="   await button('Undo observation removal').click();"
new="""   const removedPending=page.waitForEvent('download');await button('Export removed observation').click();const removedDownload=await removedPending;
   await removedDownload.saveAs(path.join(OUT,'removed-observation-'+theme+'.md'));
   assert(read(path.join(OUT,'removed-observation-'+theme+'.md')).includes('Six jointed legs and antennae'));
"""
assert anchor in s;s=s.replace(anchor,new+anchor,1);p.write_text(s,encoding='utf-8')
