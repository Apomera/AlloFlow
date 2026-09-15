const fs=require('node:fs');let s=fs.readFileSync('stem_lab/stem_tool_anatomy.js','utf8');
const before="h('text', { x: 4, y: 30, fontSize: 11, fill: 'currentColor' }, '°C')";
if(!s.includes(before))throw Error('Unit anchor');s=s.replace(before,"h('text', { x: 4, y: 12, fontSize: 11, fill: 'currentColor' }, '°C')");
fs.writeFileSync('stem_lab/stem_tool_anatomy.js',s);fs.writeFileSync('desktop/web-app/public/stem_lab/stem_tool_anatomy.js',s);
