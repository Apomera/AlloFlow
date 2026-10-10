const fs=require('fs'),path=require('path'),crypto=require('crypto'),file=path.join(__dirname,'dissection-scenario-clarity.spec.ts'),s=fs.readFileSync(file,'utf8');
require('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/esbuild').transformSync(s,{loader:'ts',format:'esm'});
console.log(JSON.stringify({file,sha256:crypto.createHash('sha256').update(s).digest('hex'),syntax:'passed',layoutTests:6,interactionTests:5,suitesRun:false,repositoryWrites:false}));
