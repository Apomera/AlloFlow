const fs=require('fs'),crypto=require('crypto'),out='reports/sky-lab-brightness-2026-10-01';
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
const source=read('stem_lab/stem_tool_astronomy.js'),base=read(out+'/source-before.js');
let restored=source;
for(const name of['model-insertion.js','helper-insertion.js','navigation-insertion.js']){
 const piece=read(out+'/'+name);if(restored.split(piece).length!==2)throw Error('Insertion absent or repeated: '+name);restored=restored.replace(piece,'');
}
restored=restored.replace('      magnitudeModel: magnitudeModel, cosmicCalendarModel: cosmicCalendarModel,','      cosmicCalendarModel: cosmicCalendarModel,')
 .replace(read(out+'/magnitude-after.js'),read(out+'/magnitude-before.js'));
if(restored!==base)throw Error('Changes outside the magnitude scope');
if(source!==read('desktop/web-app/public/stem_lab/stem_tool_astronomy.js'))throw Error('Source mirror drift');
new Function(source);
if(read('tests/astronomy_tables_a11y.test.js')!==read(out+'/tables-a11y-before.js'))throw Error('Existing table tests were changed');
const delta=JSON.parse(read(out+'/english-labels.json'));
for(const path of['ui_strings.js','desktop/web-app/public/ui_strings.js']){
 const a=JSON.parse(read(path)).stem.astronomy;for(const[k,v]of Object.entries(delta))if(a[k]!==v)throw Error('Label drift '+k);
}
const result={sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),baselineSha256:crypto.createHash('sha256').update(base).digest('hex'),
 sourceMatchesMirror:true,scopeReconstructsBaseline:true,syntaxValid:true,ownedEnglishLabels:Object.keys(delta).length,existingTableTestsPreserved:true,committed:false};
fs.writeFileSync(out+'/scope-verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
