const fs=require('node:fs');const p='reports/geometry-world-graphics-2026-09-08/gorgeous-core.cjs';let s=fs.readFileSync(p,'utf8');
s=s.replace("if(!s.includes(a))throw", "a=a.replaceAll('\\r\\n','\\n');s=s.replaceAll('\\r\\n','\\n');if(!s.includes(a))throw");
s=s.replace("fs.writeFileSync(path.join(__dirname,'before-gorgeous-source.js'),s);", "if(!fs.existsSync(path.join(__dirname,'before-gorgeous-source.js')))fs.writeFileSync(path.join(__dirname,'before-gorgeous-source.js'),s);");
s=s.replace("fs.writeFileSync(path.join(__dirname,'before-gorgeous-builder.js'),s);", "if(!fs.existsSync(path.join(__dirname,'before-gorgeous-builder.js')))fs.writeFileSync(path.join(__dirname,'before-gorgeous-builder.js'),s);");
const fd=fs.openSync(p,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);
