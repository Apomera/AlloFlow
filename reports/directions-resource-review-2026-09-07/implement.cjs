const fs=require('fs');
const read=f=>fs.readFileSync(f,'utf8');
const write=(f,s)=>fs.writeFileSync(f,s);
const replace=(s,a,b)=>{if(!s.includes(a))throw Error('Missing anchor: '+a.slice(0,100));return s.replace(a,b);};
for(const file of ['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx']) {
 let s=read(file);
 s=replace(s,".filter(resource => resource.type !== 'directions' && validId(resource.id))\n        .slice(0, 12);", ".filter(resource => resource.type !== 'directions' && validId(resource.id));");
 s=replace(s,'        if (views.length >= 24) return views;\n','');
 s=replace(s,'label: clamp(goal.label, 240),',"label: String(goal.label || '').trim(),");
 s=replace(s,'const markdown = clamp(normalized.body, 20000);',"const markdown = String(normalized.body || '').trim();");
 s=replace(s,"bodyHtml: sanitizeHtml(String(parsedBody || '')).slice(0, 120000),","bodyHtml: sanitizeHtml(String(parsedBody || '')),");
 // Directions always use the same local formatter, including after document tools load.
 const seam=s.indexOf("activeView === 'directions' && generatedContent?.type === 'directions'");
 const part=s.slice(seam);s=s.slice(0,seam)+replace(part,'                        parseMarkdownToHTML,','                        parseMarkdownToHTML: _alloParsePreviewMarkdown,');
 s=replace(s,'mbDirectionsDraft={mbDirectionsDraft} directionsGoalEditorState=',"mbDirectionsDraft={mbDirectionsDraft} directionsPreviewHtml={sanitizeHtml(_alloParsePreviewMarkdown((mbDirectionsDraft?.due ? '**Due:** ' + mbDirectionsDraft.due + '\\n\\n' : '') + (mbDirectionsDraft?.body || '')))} directionsGoalEditorState=");
 write(file,s);
}
let view=read('view_directions_result_source.jsx');
view=replace(view,'    .slice(0, 12)\n','');view=replace(view,'    .slice(0, 24)\n','');
view=replace(view,"label: directionsResultText(goal.label, 'Goal', 240)","label: directionsResultText(goal.label, 'Goal', Infinity)");
view=view.replace(/(station\.id|goal\.id|recommendation\.nextId|sourceGoal\.resourceRef)\)\.slice\(0, 120\)/g,'$1).slice(0, 200)');
view=replace(view,'const mapWidth = Math.max(340, 100 + stations.length * 88);','const mapWidth = Math.max(340, 100 + stations.length * 88, goals.length ? 120 + (goals.length - 1) * 92 : 0);');
view=replace(view,'className="prose prose-sm max-w-none text-slate-700 mb-4"','className="prose prose-sm max-w-none text-slate-700 mb-4 break-words"');
write('view_directions_result_source.jsx',view);
let composer=read('view_directions_composer_source.jsx');
composer=replace(composer,'  mbDirectionsDraft,','  mbDirectionsDraft,\n  directionsPreviewHtml = \'\',');
composer=replace(composer,'className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-4"','className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-4 flex flex-col overflow-hidden" style={{ maxHeight: \'calc(100dvh - 2rem)\' }}');
composer=replace(composer,'<div className="space-y-2">','<div className="space-y-2 min-h-0 flex-1 overflow-y-auto pr-1" data-directions-scroll>');
const preview=`              <details className="rounded-lg border border-slate-200 bg-slate-50 p-2" data-directions-preview>
                <summary className="cursor-pointer text-xs font-bold text-indigo-800">{t('common.preview') || 'Preview'}</summary>
                {directionsPreviewHtml
                  ? <div className="mt-3 text-sm text-slate-800 break-words" dangerouslySetInnerHTML={{ __html: typeof window.sanitizeHtml === 'function' ? window.sanitizeHtml(directionsPreviewHtml) : '' }} />
                  : <p className="mt-2 text-xs text-slate-600">{t('directions.body_placeholder') || 'Write directions to preview them here.'}</p>}
              </details>
`;
composer=replace(composer,'              <div className="border-t border-indigo-100 pt-2">',preview+'              <div className="border-t border-indigo-100 pt-2">');
composer=replace(composer,'              <div className="flex gap-2">','            </div>\n            <div className="pt-3 shrink-0 bg-white">\n              <div className="flex gap-2">');
write('view_directions_composer_source.jsx',composer);
let doc=read('doc_pipeline_source.jsx');
const branch=`      if (item.type === 'directions') {
          const data = item.data && typeof item.data === 'object' && !Array.isArray(item.data) ? item.data : {};
          const body = typeof item.data === 'string' ? item.data : (typeof data.body === 'string' ? data.body : '');
          const label = (key, fallback) => { const value = t(key); return value && value !== key ? value : fallback; };
          const goals = (Array.isArray(data.objectives) ? data.objectives : []).filter(goal => goal && typeof goal.label === 'string' && goal.label.trim());
          const board = data.choiceBoard && data.choiceBoard.enabled === true ? data.choiceBoard : null;
          const choices = board && Array.isArray(board.choices) ? board.choices.filter(choice => choice && typeof choice.label === 'string' && choice.label.trim()) : [];
          const goalHtml = goals.length ? '<section><h3>' + _escTxt(label('directions.your_goals', 'Your goals')) + '</h3><ul style="list-style:none;padding-left:0;">' + goals.map(goal => '<li style="margin:8px 0;"><span aria-hidden="true">&#x2610; </span>' + _escTxt(goal.label) + '</li>').join('') + '</ul></section>' : '';
          const choiceHtml = choices.length ? '<section><h3>' + _escTxt(board.title || label('directions.choose_activity', 'Choose an activity')) + '</h3>' + (board.prompt ? '<p>' + _escTxt(board.prompt) + '</p>' : '') + '<ul>' + choices.map(choice => '<li style="margin:8px 0;"><strong>' + _escTxt(choice.label) + '</strong>' + (choice.description ? '<p>' + _escTxt(choice.description) + '</p>' : '') + '</li>').join('') + '</ul></section>' : '';
          return '<section class="section" id="' + _escTxt(item.id) + '" data-ka-readable style="border-left:4px solid #d97706;border-radius:12px;padding:16px;overflow-wrap:anywhere;"><h2 class="resource-header">' + _escTxt(title) + '</h2>' + _alloParsePreviewMarkdown(body) + goalHtml + choiceHtml + '</section>';
      }
`;
const anchor="      if (item.type === 'simplified') {\n          // Reading passage.";
doc=replace(doc,anchor,branch+anchor);write('doc_pipeline_source.jsx',doc);
const pkg=JSON.parse(read('package.json'));pkg.scripts['build:directions']='node dev-tools/build_directions.cjs';write('package.json',JSON.stringify(pkg,null,2)+'\n');
console.log('Applied directions display, editor, and export changes.');
