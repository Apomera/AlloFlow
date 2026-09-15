const fs=require('node:fs');let s=fs.readFileSync('stem_lab/stem_tool_anatomy.js','utf8');
const a="h('svg', { viewBox: '0 0 360 180', role: 'img', 'aria-labelledby': 'anatomy-feedback-chart-title'";
if(!s.includes(a))throw Error('Chart anchor');s=s.replace(a,"h('svg', { viewBox: '0 0 360 180', direction: 'ltr', style: { direction: 'ltr' }, role: 'img', 'aria-labelledby': 'anatomy-feedback-chart-title'");
const anchor="      '.theme-dark .anatomy-tool-shell{color:";
if(!s.includes(anchor))throw Error('CSS anchor');s=s.replace(anchor,"      '.theme-dark .anatomy-feedback-experiment select,.theme-dark .anatomy-feedback-experiment textarea{background:#1e293b;color:#e2e8f0;border-color:#94a3b8}',\n"+anchor);
require('@babel/parser').parse(s,{sourceType:'script'});fs.writeFileSync('stem_lab/stem_tool_anatomy.js',s);fs.writeFileSync('desktop/web-app/public/stem_lab/stem_tool_anatomy.js',s);
console.log('Corrected dark field contrast and kept numeric chart axes left-to-right within RTL pages.');
