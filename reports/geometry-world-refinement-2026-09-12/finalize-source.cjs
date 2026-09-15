const fs=require('node:fs'),assert=require('node:assert/strict');
const file='stem_lab/stem_tool_geometryworld.js',raw=fs.readFileSync(file,'utf8'),eol=raw.includes('\r\n')?'\r\n':'\n';let s=raw.replace(/\r\n/g,'\n');
const a=s.indexOf('          function buildCoastalLandscape('),b=s.indexOf('          engine.disposeLandscape = disposeLandscape;',a);assert(a>0&&b>a);
s=s.slice(0,a)+s.slice(a,b).replace(/[ \t]+$/gm,'')+s.slice(b);
const data=Buffer.from(s.replace(/\n/g,eol)),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,data);fs.ftruncateSync(fd,data.length);}finally{fs.closeSync(fd);}
for(const name of ['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js']){
  const data=fs.readFileSync('stem_lab/'+name);new Function(data.toString());const target='desktop/web-app/public/stem_lab/'+name,fd=fs.openSync(target,'r+');try{fs.writeSync(fd,data);fs.ftruncateSync(fd,data.length);}finally{fs.closeSync(fd);}assert(data.equals(fs.readFileSync(target)));
}
console.log('Refinement source syntax and desktop parity verified.');
