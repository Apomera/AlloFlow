const fs=require('node:fs'),path=require('node:path');
function edit(file,from,to){let s=fs.readFileSync(file,'utf8');if(s.split(from).length!==2)throw Error('Expected one anchor: '+file);s=s.replace(from,to);const fd=fs.openSync(file,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}
const anchor='.theme-contrast .gwe-creation-summary[data-selected=';
const rule=String.raw`@media(max-width:420px){.gwe-creation-summary[data-selected=\"true\"]{padding:12px}}`;
for(const base of ['stem_lab','desktop/web-app/public/stem_lab'])edit(path.join(base,'stem_tool_geometryworld_builder.js'),anchor,rule+anchor);
edit(path.join(__dirname,'verify-control-polish.cjs'),'info.hero.top>=info.body.top&&info.scopeRect.bottom<=info.body.bottom','info.hero.top>=info.body.top&&info.hero.bottom<=info.body.bottom+.1&&info.scopeRect.bottom<=info.body.bottom');
console.log('Phone card padding tightened and full card visibility asserted.');
