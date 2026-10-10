const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const file=path.join(__dirname,'verify-ear.cjs'),code=fs.readFileSync(file,'utf8');
global.__earCheckerSHA256=crypto.createHash('sha256').update(code).digest('hex');
const input={checkerSHA256:global.__earCheckerSHA256,mode:process.argv[2]||'full',launchedAt:new Date().toISOString(),candidateSHA256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'candidate.js'))).digest('hex')};
fs.writeFileSync(path.join(__dirname,'launch-'+input.mode+'.json'),JSON.stringify(input,null,2)+'\n');
console.log(JSON.stringify({launch:input}));
new Function('require','__dirname','__filename',code)(require,__dirname,file);
