const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const dir='reports/sky-lab-stellar-comparison-2026-09-30',file='stem_lab/stem_tool_astronomy.js',source=fs.readFileSync(file,'utf8');
const baseline=fs.readFileSync(dir+'/source-before.js','utf8').replace(/\r\n/g,'\n');
let reconstructed=source;
for(const name of ['model-insert.js','helpers-insert.js']){
 const insert=fs.readFileSync(dir+'/'+name,'utf8');
 if(!reconstructed.includes(insert))throw Error('Missing expected insert '+name);
 reconstructed=reconstructed.replace(insert,'');
}
const a=reconstructed.indexOf('        function renderHrExplorer() {');
const b=reconstructed.indexOf("        return h('div', { style: { padding: 16 } },",a);
reconstructed=reconstructed.slice(0,a)+fs.readFileSync(dir+'/explorer-before.js','utf8')+reconstructed.slice(b);
reconstructed=reconstructed
 .replace('hrComparisonModel: hrComparisonModel, hrStellarModel: hrStellarModel,','hrStellarModel: hrStellarModel,')
 .replace("            sizeScale: raw.sizeScale === 'true' ? 'true' : 'compressed',\n",'')
 .replace('        var comparison = hrComparisonModel(iq.tempK, iq.lumin, iq.mass, iq.sizeScale);\n        var stellar = comparison.star, category = stellar.category;','        var stellar = hrStellarModel(iq.tempK, iq.lumin), category = stellar.category;')
 .replace('val: iq.mass,   min: 0.1, max: 20, step: 0.001','val: iq.mass,   min: 0.1, max: 20, step: 0.1')
 .replace("setIQ({ sizeScale: 'compressed', mass: 1, tempK: 5800, lumin: 1, log: [],","setIQ({ mass: 1, tempK: 5800, lumin: 1, log: [],")
 .replace("__alloT('stem.astronomy.hr_explanation_prompt', 'Explain how temperature and luminosity determine the point, and how radius relates to total light output.')","__alloT('stem.astronomy.explain_how_mass_temperature_and_lumin', 'Explain how mass, temperature, and luminosity define a stellar category.')");
if(reconstructed!==baseline)throw Error('Unexpected source edits outside this pass');
if(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_astronomy.js','utf8')!==source)throw Error('Mirror differs');
vm.runInNewContext('new Function('+JSON.stringify(source)+')');
const delta=JSON.parse(fs.readFileSync(dir+'/ui-strings.delta.json'));
for(const registry of ['ui_strings.js','desktop/web-app/public/ui_strings.js']){
 const map=JSON.parse(fs.readFileSync(registry,'utf8')).stem.astronomy;
 for(const [key,value]of Object.entries(delta))if(map[key]!==value)throw Error('Label mismatch '+registry+' '+key);
}
const oldTest=fs.readFileSync('tests/e2e/astronomy-visual-simulators.spec.ts','utf8');
if(oldTest.replace('box.height * (186 / 440)','box.height * (186 / 408)')!==fs.readFileSync(dir+'/visual-browser-before.ts','utf8'))throw Error('Unexpected existing browser test edits');
const report={scopeReconstruction:true,existingBrowserTestScope:true,mirrorEqual:true,syntaxValid:true,englishLabels:Object.keys(delta).length,sourceSHA256:crypto.createHash('sha256').update(source).digest('hex')};
fs.writeFileSync(dir+'/build-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));