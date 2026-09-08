const fs=require('node:fs'),path=require('node:path');
const p=path.join(__dirname,'verify-enhancement.cjs');
let s=fs.readFileSync(p,'utf8').replace("assert(results.checks.design.includes('24 blocks'))","assert(results.checks.design.includes('10 × 15 × 20 mm'))");
const fd=fs.openSync(p,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);
try{console.log(require.resolve('sharp'));}catch{}
