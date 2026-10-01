// Read-only verification, apart from its own receipt in this report directory.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'integration.json'),'utf8'));
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const read=file=>fs.readFileSync(path.join(root,file));
const drift=Object.entries(manifest.after).filter(([file,expected])=>hash(read(file))!==expected).map(([file,expected])=>({file,expected,current:hash(read(file))}));
const hosts=['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx'];
const readerPins=hosts.map(file=>({file,pins:[...read(file).toString().matchAll(/https:\/\/alloflow-cdn\.pages\.dev\/view_simplified_module\.js\?v=([a-f0-9]{8})/g)].map(match=>match[1])}));
const readerPair=hash(read('view_simplified_module.js'))===hash(read('desktop/web-app/public/view_simplified_module.js'));
const indexHash=hash(execFileSync('git',['diff','--cached','--binary'],{cwd:root,maxBuffer:20*1024*1024}));
const report={time:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),drift,readerPins,readerPair,indexUnchanged:indexHash===manifest.indexBefore};
fs.writeFileSync(path.join(__dirname,'final-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
assert.deepEqual(drift,[],'Integrated/tested inputs changed after verification');
assert.ok(readerPair);
for(const host of readerPins)assert.deepEqual(host.pins,[manifest.pin]);
