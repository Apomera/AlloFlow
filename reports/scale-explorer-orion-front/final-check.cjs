const fs=require('fs'),crypto=require('crypto'),vm=require('vm');
const dir='reports/scale-explorer-orion-front';
const files=['stem_lab/stem_tool_scaleexplorer.js','desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js',dir+'/candidate-source.js'];
const contents=files.map(p=>fs.readFileSync(p,'utf8'));
let replay=fs.readFileSync(dir+'/base-source.js','utf8');
const edits=JSON.parse(fs.readFileSync(dir+'/edits.json','utf8'));
for(const [before,after] of edits){if(!before||replay.split(before).length!==2)throw Error('Nonunique replay anchor');replay=replay.replace(before,after);}
if(contents.some(s=>s!==contents[0])||replay!==contents[0])throw Error('Source/candidate/mirror mismatch');
new vm.Script(contents[0]);
const delta=JSON.parse(fs.readFileSync(dir+'/ui-strings.delta.json','utf8'));
const a=JSON.parse(fs.readFileSync('ui_strings.js','utf8'));
const b=JSON.parse(fs.readFileSync('desktop/web-app/public/ui_strings.js','utf8'));
const strings=Object.keys(delta);
for(const key of strings){if(a.stem.scaleExplorer[key]!==delta[key]||b.stem.scaleExplorer[key]!==delta[key])throw Error('Localization mismatch '+key);}
const verification={sourceSha256:crypto.createHash('sha256').update(contents[0]).digest('hex'),edits:edits.length,mirrorsMatch:true,candidateMatch:true,syntaxValid:true,localizedKeys:strings.length};
fs.writeFileSync(dir+'/source-check.json',JSON.stringify(verification,null,2));
console.log(JSON.stringify(verification,null,2));
if(process.argv.includes('--css'))for(const term of ['.sx-stage{','.sx-viewport{','.sx-nebula-nav{','.sx-stage.sx-stage-space{','@container orion-stage']){const p=contents[0].indexOf(term);console.log(term+' '+p+' '+contents[0].slice(p,p+650));}
if(process.argv.includes('--preview'))(async()=>{
  const response=await fetch('http://127.0.0.1:54391/stem_lab/stem_tool_scaleexplorer.js',{signal:AbortSignal.timeout(8000)});
  const source=await response.text(),sha256=crypto.createHash('sha256').update(source).digest('hex');
  if(response.status!==200||sha256!==verification.sourceSha256)throw Error('Preview source mismatch');
  const page=await fetch('http://127.0.0.1:54391/?tool=scaleExplorer&focus=orion-nebula&v=bearing',{signal:AbortSignal.timeout(8000)});
  if(page.status!==200)throw Error('Preview page unavailable');
  const result={status:200,sourceSha256:sha256,sourceMatches:true,cacheControl:response.headers.get('cache-control'),url:page.url};
  fs.writeFileSync(dir+'/preview-check.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
