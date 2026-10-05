
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),dir='reports/sky-lab-cosmic-distance-2026-10-01';
const source=fs.readFileSync('stem_lab/stem_tool_astronomy.js','utf8'),baseline=fs.readFileSync(dir+'/source-before.js','utf8');
let restored=source;
for(const name of ['model-insert.js','helper-insert.js','redshift-bridge-insert.js']){
 const insert=fs.readFileSync(dir+'/'+name,'utf8');if(!restored.includes(insert))throw Error('Missing owned insert '+name);restored=restored.replace(insert,'');
}
restored=restored.replace('cosmicDistanceModel: cosmicDistanceModel, blackHoleThermalModel: blackHoleThermalModel,','blackHoleThermalModel: blackHoleThermalModel,')
 .replace('          renderCosmicDistance(),\n','');
const correction=JSON.parse(fs.readFileSync(dir+'/topic-corrections.json'));
function literal(value){return "'"+value.replaceAll('\\','\\\\').replaceAll("'","\\'")+"'";}
const newTopic="__alloT('stem.astronomy."+correction.key+"', "+literal(correction.new)+")";
if(!restored.includes(newTopic))throw Error('Missing corrected topic');
restored=restored.replace(newTopic,"__alloT('stem.astronomy."+correction.key+"', "+literal(correction.old)+")");
if(restored!==baseline)throw Error('Unexpected source edit outside this pass');
if(source!==fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_astronomy.js','utf8'))throw Error('Mirror mismatch');
vm.runInNewContext('new Function('+JSON.stringify(source)+')');
const delta=JSON.parse(fs.readFileSync(dir+'/ui-strings.delta.json'));
for(const file of ['ui_strings.js','desktop/web-app/public/ui_strings.js']){
 const labels=JSON.parse(fs.readFileSync(file,'utf8')).stem.astronomy;
 for(const[key,value]of Object.entries(delta))if(labels[key]!==value)throw Error('Owned label mismatch '+file+' '+key);
}
const report={sourceScopeReconstruction:true,syntaxValid:true,mirrorEqual:true,englishLabelsAddedOrCorrected:Object.keys(delta).length,
 sourceSHA256:crypto.createHash('sha256').update(source).digest('hex')};
fs.writeFileSync(dir+'/build-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
