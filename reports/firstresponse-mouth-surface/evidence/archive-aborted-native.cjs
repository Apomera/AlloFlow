const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const work=path.resolve(__dirname),from=path.resolve(work,'native-adult-head'),to=path.resolve(work,'native-adult-head-aborted');
for(const p of[from,to])if(!p.startsWith(work+path.sep))throw Error('Archive escapes private work');
if(fs.existsSync(to))throw Error('Archive already exists');const runner=JSON.parse(fs.readFileSync(path.join(from,'runner.json')));
try{process.kill(runner.pid,0);throw Error('Recorded native process still exists');}catch(error){if(error.code!=='ESRCH')throw error;}
if(fs.existsSync(path.join(from,'browser-run.json'))||fs.existsSync(path.join(from,'summary.json'))||fs.readdirSync(from).some(n=>n.endsWith('.png')))throw Error('Unexpected completed or visual evidence');
const inputs=JSON.parse(fs.readFileSync(path.join(from,'inputs.json')));for(const[file,h]of Object.entries(inputs.inputs))if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==h)throw Error('Recorded input changed: '+file);
const failure={error:'Tool execution aborted during a client refresh before browser output. Recorded child PID no longer exists; no browser results or PNG captures were produced.',kind:'interrupted-before-output',exitCode:null,recordedPid:runner.pid,inputsUnchanged:true};
fs.writeFileSync(path.join(from,'failure.json'),JSON.stringify(failure,null,2)+'\n');fs.renameSync(from,to);console.log(JSON.stringify({archived:to,...failure}));
