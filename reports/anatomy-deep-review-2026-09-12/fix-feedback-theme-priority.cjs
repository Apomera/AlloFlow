const fs=require('node:fs');let s=fs.readFileSync('stem_lab/stem_tool_anatomy.js','utf8');
const before='.theme-dark .anatomy-feedback-experiment select,.theme-dark .anatomy-feedback-experiment textarea{background:#1e293b;color:#e2e8f0;border-color:#94a3b8}';
const after='.theme-dark .anatomy-tool-shell .anatomy-feedback-experiment select,.theme-dark .anatomy-tool-shell .anatomy-feedback-experiment textarea{background:#1e293b!important;color:#e2e8f0!important;border-color:#94a3b8}';
if(!s.includes(before))throw Error('Missing dark field rule');s=s.replace(before,after);fs.writeFileSync('stem_lab/stem_tool_anatomy.js',s);fs.writeFileSync('desktop/web-app/public/stem_lab/stem_tool_anatomy.js',s);
