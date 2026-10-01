const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),dir='reports/sky-lab-black-hole-thermal-2026-09-30';
const source=fs.readFileSync('stem_lab/stem_tool_astronomy.js','utf8'),baseline=fs.readFileSync(dir+'/source-before.js','utf8').replace(/\r\n/g,'\n');
let restored=source;
for(const name of ['model-insert.js','helper-insert.js']){
 const insert=fs.readFileSync(dir+'/'+name,'utf8');if(!restored.includes(insert))throw Error('Missing expected insert '+name);restored=restored.replace(insert,'');
}
restored=restored.replace('blackHoleThermalModel: blackHoleThermalModel, hrComparisonModel: hrComparisonModel,','hrComparisonModel: hrComparisonModel,')
 .replace('                renderBlackHoleThermal(),\n',fs.readFileSync(dir+'/figure-before.js','utf8'));
const corrections=JSON.parse(fs.readFileSync(dir+'/topic-corrections.json'));
function literal(value){return "'"+value.replaceAll('\\','\\\\').replaceAll("'","\\'")+"'";}
for(const [key,value]of Object.entries(corrections.new)){
 const newer="__alloT('stem.astronomy."+key+"', "+literal(value)+")",older="__alloT('stem.astronomy."+key+"', "+literal(corrections.old[key])+")";
 if(!restored.includes(newer))throw Error('Missing corrected topic '+key);restored=restored.replace(newer,older);
}
for(const change of corrections.caveats){if(!restored.includes(change.new))throw Error('Missing caveat');restored=restored.replace(change.new,change.old);}
if(restored!==baseline)throw Error('Unexpected source edit outside this pass');
if(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_astronomy.js','utf8')!==source)throw Error('Mirror differs');
vm.runInNewContext('new Function('+JSON.stringify(source)+')');
const delta=JSON.parse(fs.readFileSync(dir+'/ui-strings.delta.json'));
for(const file of ['ui_strings.js','desktop/web-app/public/ui_strings.js']){
 const registry=JSON.parse(fs.readFileSync(file,'utf8')).stem.astronomy;
 for(const [key,value]of Object.entries(delta))if(registry[key]!==value)throw Error('Label mismatch '+file+' '+key);
}
let test=fs.readFileSync('tests/astronomy_ui_resilience.test.js','utf8');
test=test.replace('id="astronomy-page-curve-diagram" viewBox="0 0 360 260" role="img"','id="astronomy-page-curve-diagram" viewBox="0 0 600 230" role="img"')
 .replace("expect(html).toContain('Thermal calculation: entropy rises');","expect(html).toContain('Hawking: keeps rising');")
 .replace("expect(html).toContain('entropy returns to zero');","expect(html).toContain('information recovered');");
if(test!==fs.readFileSync(dir+'/ui-resilience-before.js','utf8'))throw Error('Unexpected existing test edit');
const report={sourceScopeReconstruction:true,existingTestScope:true,syntaxValid:true,mirrorEqual:true,englishLabelsAddedOrCorrected:Object.keys(delta).length,sourceSHA256:crypto.createHash('sha256').update(source).digest('hex')};
fs.writeFileSync(dir+'/build-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));