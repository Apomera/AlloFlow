const fs=require('fs');function edit(p,f){fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')));}
edit('applied_challenge_source.jsx',s=>{
 s=s.replace("revision: 'Revise one meaningful part in response to your test, feedback, or counterexample.'", "revision: 'Explain what you will change after checking, or why the evidence supports keeping your current direction.'");
 s=s.replace("artifactUrl: data.workspace.artifactUrl, artifactDescription: data.workspace.artifactDescription,", "artifactUrl: data.workspace.artifactUrl, artifactDescription: data.workspace.artifactDescription,\n    visual: data.visual.reviewed && data.visual.alt.trim() ? data.visual : null,");
 s=s.replace("{renderFeedback()}{field('revision')}","{renderFeedback()}<p className='text-sm text-slate-600'>{tx('applied_challenge.check.keep', 'A check may support your current direction. Explain what you changed or why keeping it makes sense.')}</p>{field('revision')}");
 s=s.replace("text(row.ratingLabel) + text(row.note) + '</article>'", "text(row.ratingLabel) + (row.needsReview ? text(tr('self_check.changed', 'This requirement changed. Review your earlier note before rating it again.')) : '') + text(row.note) + '</article>'");
 s=s.replace('.margin:auto;font-family:system-ui;', '.margin:auto;');
 s=s.replace('max-width:900px;margin:auto;font-family:system-ui;', 'max-width:900px;margin:auto;font-family:inherit;');
 return s;
});
edit('generate_dispatcher_source.jsx',s=>s.replace("revision: 'Revise one meaningful part after testing or feedback.'", "revision: 'Explain what you changed after checking, or why the evidence supports keeping your direction.'"));
edit('doc_pipeline_source.jsx',s=>{
 s=s.replace("+ (row ? '<dt>' + esc(L.status)","+ (row && row.sourceText ? '<dt>' + esc(tx('applied_challenge.export.source_fact', 'Linked lesson fact:')) + '</dt><dd>' + esc(row.sourceText) + '</dd>' : '')\n              + (row ? '<dt>' + esc(L.status)");
 s=s.replace("+ '<div class=\"ace-chips\">' + chips + '</div>'", "+ '<div class=\"ace-chips\">' + chips + '</div>'\n              + (m.visual?.image && m.visual?.alt ? '<figure><img src=\"' + esc(m.visual.image) + '\" alt=\"' + esc(m.visual.alt) + '\" style=\"max-width:100%;max-height:360px;object-fit:contain\"><figcaption>' + esc(m.visual.purpose) + '</figcaption></figure>' : '')");
 const anchor="<title>Applied Problem Solving</title><style>@page{margin:' + _printPageMargin + '}body{margin:24px;background:white;color:#17212e;font-family:system-ui;font-size:'";
 if(!s.includes(anchor))throw Error('Print settings anchor');
 s=s.replace(anchor,"<title>Applied Problem Solving</title><style>@page{size:' + (['letter','legal','a4'].includes(cfg.pageSize) ? cfg.pageSize : 'letter') + ' ' + (cfg.pageOrientation === 'landscape' ? 'landscape' : 'portrait') + ';margin:' + _printPageMargin + '}body{margin:24px;background:white;color:#17212e;font-family:' + exportFontFamily + ';font-size:'");
 return s;
});
edit('reports/applied-problem-solving-review-2026-09-12/implementation-browser.cjs',s=>s.replace("...(response?.fields||response?.data||{})", "...(response||{})"));
edit('reports/applied-problem-solving-review-2026-09-12/sync-strings.cjs',s=>s.replace("'panel.ai_role':'Who frames the problem?',",`'panel.ai_role':'Who frames the problem?',
 'supports.frameChoices':'Possible directions (one per line)','supports.coachPrompts':'Thinking prompts (one per line)',
 'organizer.investigate.column0':'Question or hypothesis','organizer.investigate.column1':'Evidence needed or collected','organizer.investigate.column2':'Method or limit',
 'organizer.design.column0':'Design option','organizer.design.column1':'Lesson connection','organizer.design.column2':'Constraint or failure point',
 'organizer.decide.column0':'Option','organizer.decide.column1':'Supporting evidence','organizer.decide.column2':'Tradeoff',
 'organizer.propose.column0':'Proposed action','organizer.propose.column1':'Reason or evidence','organizer.propose.column2':'Resource assumption',
 'organizer.explore.column0':'Position or interpretation','organizer.explore.column1':'Supporting reason','organizer.explore.column2':'Counterexample or uncertainty',`));
