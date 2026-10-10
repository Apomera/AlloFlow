const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-study-chooser-2026-10-05'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(fs.readFileSync(path.join(report,'edits/renderer-edits.json'))),candidate=fs.readFileSync(path.join(__dirname,'renderer-next.js'));
if(sha(candidate)!==receipt.afterSha256)throw Error('Candidate hash');new vm.Script(candidate.toString());
const files=['stem_lab/stem_tool_dissection.js','desktop/web-app/public/stem_lab/stem_tool_dissection.js'];for(const f of files)if(sha(fs.readFileSync(path.join(repo,f)))!==receipt.beforeSha256)throw Error('Source changed '+f);
for(const f of files)fs.writeFileSync(path.join(repo,f),candidate);
fs.copyFileSync(__filename,path.join(report,'edits/apply-study-source.cjs'));
fs.writeFileSync(path.join(report,'source-apply.json'),JSON.stringify({appliedAt:new Date().toISOString(),files:Object.fromEntries(files.map(f=>[f,sha(fs.readFileSync(path.join(repo,f)))])),syntax:'passed'},null,2));
console.log(JSON.stringify({sourceHash:sha(candidate),mirrorMatches:true}));
