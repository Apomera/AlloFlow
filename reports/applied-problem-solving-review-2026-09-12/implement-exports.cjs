const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'../..');
function edit(file,fn){const p=path.join(root,file);fs.writeFileSync(p,fn(fs.readFileSync(p,'utf8')))}
function once(s,a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,100));return s.replace(a,b)}
edit('applied_challenge_source.jsx',s=>{
 s=once(s,'function AcTextarea(props) {',fs.readFileSync(path.join(__dirname,'export-preset.js'),'utf8')+'\nfunction AcTextarea(props) {');
 s=s.replace('onPick={result =>','onLoaded={result =>');
 s=s.replace("setVisualEditor(result.dataUrl); }} onError", "setVisualEditor(result.dataUrl); }} onError");
 return s;
});
edit('_build_applied_challenge_module.js',s=>once(s,"'  exportModel: appliedChallengeExportModel,',","'  exportModel: appliedChallengeExportModel,',\n  '  renderPreset: renderAppliedChallengePreset,',"));
edit('doc_pipeline_source.jsx',s=>{
 const at=s.indexOf("} else if (item.type === 'applied-challenge') {");if(at<0)throw Error('branch');
 s=s.slice(0,at)+s.slice(at).replace("} else if (item.type === 'applied-challenge') {",` } else if (item.type === 'applied-challenge') {
          const appliedPreset = item.data?.appliedChallengeExportPreset;
          if (['task', 'response', 'teacher', 'paper'].includes(appliedPreset)) {
              const render = window.AlloModules?.AppliedChallenge?.renderPreset;
              return typeof render === 'function' ? render(item.data, appliedPreset, t) : '<section><p>Open this challenge in the app to prepare the copy.</p></section>';
          }`);
 s=once(s,'              + workspaceHtml + selfCheckHtml + ledgerHtml + stressHtml + cyclesHtml + feedbackHtml + teacherCommentHtml',`              + workspaceHtml
              + (m.artifactUrl || m.artifactDescription ? '<section class="ace-panel"><h3 class="ace-h3">' + esc(tx('applied_challenge.artifact.heading', 'Linked work and explanation')) + '</h3>' + (m.artifactUrl ? '<p><a href="' + esc(m.artifactUrl) + '" rel="noopener noreferrer">' + esc(m.artifactUrl) + '</a></p>' : '') + para('', m.artifactDescription) + '</section>' : '')
              + selfCheckHtml + ledgerHtml + stressHtml + cyclesHtml + feedbackHtml + teacherCommentHtml`);
 s=once(s,'              + para(L.reviewStatus, fb.statusLabel) + para(L.strength, fb.strength)',"              + para(L.reviewStatus, m.feedbackOutdated ? tx('applied_challenge.feedback.earlier', 'Feedback for an earlier draft or brief. Review before relying on it.') : fb.statusLabel) + para(L.strength, fb.strength)");
 const marker="      const _runtimeCopyCatalog = {";
 s=once(s,marker,`      if (historyItems.length && historyItems.every(item => item.type === 'applied-challenge' && ['task', 'response', 'teacher', 'paper'].includes(item.data?.appliedChallengeExportPreset))) {
          const render = window.AlloModules?.AppliedChallenge?.renderPreset;
          const body = typeof render === 'function' ? historyItems.map(item => render(item.data, item.data.appliedChallengeExportPreset, t)).join('') : '<p>Open this challenge in the app to prepare the copy.</p>';
          return '<!doctype html><html lang="' + _documentLanguage + '" dir="' + (typeof isRtlLang === 'function' && isRtlLang(leveledTextLanguage || currentUiLanguage) ? 'rtl' : 'ltr') + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Applied Problem Solving</title><style>@page{margin:' + _printPageMargin + '}body{margin:24px;background:white;color:#17212e;font-family:system-ui;font-size:' + Math.max(12, Math.min(28, Number(cfg.fontSize) || 16)) + 'px;line-height:1.5}h1,h2,h3{break-after:avoid}@media print{body{margin:0}}</style></head><body><main>' + body + '</main></body></html>';
      }
`+marker);
 return s;
});
console.log('Four print/export presets and linked-artifact export connected.');
