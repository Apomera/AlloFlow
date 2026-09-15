const fs=require('node:fs'),assert=require('node:assert/strict'),file='stem_lab/stem_tool_geometryworld_builder.js';
const raw=fs.readFileSync(file,'utf8'),eol=raw.includes('\r\n')?'\r\n':'\n';let source=raw.replace(/\r\n/g,'\n');
const before='.gwe-stamp-card:hover{filter:brightness(1.025)}',after='.theme-contrast .gwe-stamp-selection,[data-stem-theme=contrast] .gwe-stamp-selection{background:#000;color:#fff;border-color:#ff0}.gwe-stamp-card:hover{filter:brightness(1.025)}';
assert.equal(source.split(before).length,2);source=source.replace(before,after);new Function(source);
const bytes=Buffer.from(source.replace(/\n/g,eol)),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,bytes);fs.ftruncateSync(fd,bytes.length);}finally{fs.closeSync(fd);}
console.log('High-contrast stamp choice labels now use an opaque dark background.');
