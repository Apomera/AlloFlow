const fs=require('fs'),file='stem_lab/stem_tool_anatomy.js';let s=fs.readFileSync(file,'utf8');
s=s.replace('Print uses these filters; text and JSON downloads include all saved work.','Print uses these filters. Copied text and downloads include all saved work.');
s=s.replace('These reminders follow the rating dates above; they do not mean an answer was wrong.','These reminders follow your saved rating dates; they do not mean an answer was wrong.');
s=s.replace(".anatomy-study-sheet-name { text-align:start; }", "#anatomy-study-sheet .anatomy-study-sheet-name { text-align:start; }");
s=s.replace(".anatomy-study-sheet-stale { white-space:normal; }", "#anatomy-study-sheet .anatomy-study-sheet-stale { white-space:normal; }");
// Keep the scope of totals visible on screen and in filtered printouts.
const hint="h('p',null,t('stem.anatomy.study_ref_counts_help','Totals cover all saved work. Each anatomical structure counts once, even when it appears in more than one collection. Notes are counted per catalog entry.'))";
if(!s.includes(hint))throw Error('Missing counts help');s=s.replace('              '+hint+',','');
s=s.replace("            h('div', { className: 'anatomy-study-sheet-stats', role: 'list' },", "            "+hint.replace("h('p',null,","h('p',{className:'anatomy-study-sheet-next','data-anatomy-study-counts-help':true},")+",\n            h('div', { className: 'anatomy-study-sheet-stats', role: 'list' },");
fs.writeFileSync(file,s);fs.writeFileSync('desktop/web-app/public/'+file,s);
// Reuse the validated localization extractor, with this pass's prefix and manifest.
let localize=fs.readFileSync('reports/anatomy-breathing-refinements-2026-09-19/localize.cjs','utf8').replaceAll('breath_ref_','study_ref_').replace('handtl_anatomy_breathing_20260919','handtl_anatomy_study_clarity_20260919');
new Function('require','__dirname',localize)(require,__dirname);
