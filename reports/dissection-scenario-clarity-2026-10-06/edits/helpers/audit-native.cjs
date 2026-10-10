const fs=require('fs'),path=require('path'),crypto=require('crypto');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',acorn=require(path.join(repo,'node_modules/acorn'));
const before=fs.readFileSync(path.join(__dirname,'renderer-baseline.js'),'utf8');
const candidate=process.argv[2]||path.join(__dirname,'source-work/renderer-next.js');const after=fs.readFileSync(candidate,'utf8');
function named(text){const nodes={};function visit(n){if(!n||typeof n!=='object')return;if(n.type==='FunctionDeclaration'&&n.id){const key=n.id.name;(nodes[key]||(nodes[key]=[])).push(text.slice(n.start,n.end));}for(const [k,v] of Object.entries(n))if(k!=='start'&&k!=='end'){if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')visit(v);}}visit(acorn.parse(text,{ecmaVersion:'latest'}));return nodes;}
const b=named(before),a=named(after),changed=[],added=[];
for(const name of Object.keys(b))if(JSON.stringify(a[name])!==JSON.stringify(b[name]))changed.push(name);
for(const name of Object.keys(a))if(!b[name])added.push(name);
const protectedFunctions=['procedureScenarioStatus','timedProcedureScenarioExpired','formatScenarioTime','formatAccessibleDuration','performNextProcedureStep','procedureScenarioGuidance'];
const checks=Object.fromEntries(protectedFunctions.map(name=>[name,{present:!!b[name],unchanged:JSON.stringify(a[name])===JSON.stringify(b[name])}]));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');const result={beforeSha256:sha(before),afterSha256:sha(after),changedFunctionDeclarations:changed,addedFunctionDeclarations:added,protectedFunctions:checks};
fs.writeFileSync(path.join(__dirname,'native-audit.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
