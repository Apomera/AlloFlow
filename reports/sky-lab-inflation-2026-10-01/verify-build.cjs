
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),dir='reports/sky-lab-inflation-2026-10-01';
const source=fs.readFileSync('stem_lab/stem_tool_astronomy.js','utf8').replace(/\r\n/g,'\n'),baseline=fs.readFileSync(dir+'/source-before.js','utf8').replace(/\r\n/g,'\n');
let restored=source;
for(const name of ['model-insert.js','helper-insert.js']){
 const insert=fs.readFileSync(dir+'/'+name,'utf8').replace(/\r\n/g,'\n');if(!restored.includes(insert))throw Error('Missing owned insert '+name);restored=restored.replace(insert,'');
}
restored=restored.replace('inflationExpansionModel: inflationExpansionModel, cosmicDistanceModel: cosmicDistanceModel,','cosmicDistanceModel: cosmicDistanceModel,');
const figure=fs.readFileSync(dir+'/figure-before.js','utf8').replace(/\r\n/g,'\n');
restored=restored.replace('                renderInflationExpansion(),\n',figure);
const correction=JSON.parse(fs.readFileSync(dir+'/topic-corrections.json'));
function literal(value){return "'"+value.replaceAll('\\','\\\\').replaceAll("'","\\'")+"'";}
for(const [key,value]of Object.entries(correction.new)){
 const replacement="__alloT('stem.astronomy."+key+"', "+literal(value)+")";
 if(!restored.includes(replacement))throw Error('Missing corrected topic '+key);
 restored=restored.replace(replacement,"__alloT('stem.astronomy."+key+"', "+literal(correction.old[key])+")");
}
for(const caveat of correction.caveats){if(!restored.includes(caveat.new))throw Error('Missing caveat');restored=restored.replace(caveat.new,caveat.old);}
restored=restored.replace(correction.epoch.new,correction.epoch.old);
if(restored!==baseline){fs.writeFileSync(dir+'/scope-restored.js',restored);throw Error('Unexpected source edit outside this pass');}
if(source!==fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_astronomy.js','utf8').replace(/\r\n/g,'\n'))throw Error('Mirror mismatch');
vm.runInNewContext('new Function('+JSON.stringify(source)+')');
const delta=JSON.parse(fs.readFileSync(dir+'/ui-strings.delta.json'));
for(const file of ['ui_strings.js','desktop/web-app/public/ui_strings.js']){
 const labels=JSON.parse(fs.readFileSync(file,'utf8')).stem.astronomy;
 for(const[key,value]of Object.entries(delta))if(labels[key]!==value)throw Error('Owned label mismatch '+file+' '+key);
}
let resilience=fs.readFileSync('tests/astronomy_ui_resilience.test.js','utf8').replace(/\r\n/g,'\n')
 .replace('viewBox="0 0 360 350"','viewBox="0 0 600 180"')
 .replace('Exponential expansion stretches an illustrative pattern','A tiny causally connected patch expands exponentially');
if(resilience!==fs.readFileSync(dir+'/ui-resilience-before.js','utf8').replace(/\r\n/g,'\n'))throw Error('Unexpected resilience test edit');
const report={sourceScopeReconstruction:true,syntaxValid:true,mirrorEqual:true,resilienceTestScope:true,englishLabelsAddedOrCorrected:Object.keys(delta).length,
 sourceSHA256:crypto.createHash('sha256').update(source).digest('hex'),baselineSHA256:crypto.createHash('sha256').update(baseline).digest('hex')};
fs.writeFileSync(dir+'/build-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
