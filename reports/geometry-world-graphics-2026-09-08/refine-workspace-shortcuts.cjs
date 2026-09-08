const fs=require('node:fs');
const p='stem_lab/stem_tool_geometryworld.js';
let s=fs.readFileSync(p,'utf8');
for(const [count,index] of [[11,10],[12,11]]) {
  const a=`if (BLOCK_TYPES.length >= ${count}) upd('selectedBlock', ${index});`;
  if(!s.includes(a))throw Error('Shortcut anchor missing');
  s=s.replace(a,`if (!ev.ctrlKey && !ev.metaKey && !ev.altKey && BLOCK_TYPES.length >= ${count}) upd('selectedBlock', ${index});`);
}
s=s.replace('.gw-material-name{display:block;max-width:42px;font-size:9px;', '.gw-material-name{display:block;max-width:42px;font-size:10px;');
for(const f of [p,'desktop/web-app/public/'+p]){const fd=fs.openSync(f,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}
console.log('Browser zoom shortcuts preserved; palette labels refined.');
