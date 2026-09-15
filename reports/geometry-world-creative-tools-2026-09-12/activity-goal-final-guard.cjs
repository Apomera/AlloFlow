const fs=require('node:fs'),path=require('node:path');const file=path.resolve(__dirname,'../../stem_lab/stem_tool_geometryworld.js'),raw=fs.readFileSync(file,'utf8'),crlf=raw.includes('\r\n');let s=raw.replace(/\r\n/g,'\n');
const anchor="    if (value.unitCubesOnly !== undefined && typeof value.unitCubesOnly !== 'boolean') return null;";
if(s.indexOf(anchor)<0||s.indexOf(anchor)!==s.lastIndexOf(anchor))throw Error('Expected one build goal type guard');
s=s.replace(anchor,anchor+"\n    if (value.unitCubesOnly === true && value.comparator === 'eq' && Math.round(target) !== target) return null;");
new Function(s);if(crlf)s=s.replace(/\n/g,'\r\n');const fd=fs.openSync(file,'r+');try{fs.writeSync(fd,s,0,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(s));}finally{fs.closeSync(fd);}console.log('Rejected fractional numeric targets in tasks that require full cubes.');
