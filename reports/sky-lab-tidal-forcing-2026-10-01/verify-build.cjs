const fs=require('fs'),crypto=require('crypto'),out='reports/sky-lab-tidal-forcing-2026-10-01';
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'),source=read('stem_lab/stem_tool_astronomy.js');
let restored=source;
for(const name of['model-insertion.js','helper-insertion.js','navigation-insertion.js']){
 const piece=read(out+'/'+name);if(restored.split(piece).length!==2)throw Error('Insertion absent or repeated: '+name);restored=restored.replace(piece,'');
}
restored=restored.replace('      tidalForcingModel: tidalForcingModel, habitableZoneModel: habitableZoneModel,','      habitableZoneModel: habitableZoneModel,').replace(read(out+'/legacy-after.js'),read(out+'/legacy-before.js'));
restored=restored.replace(read(out+'/moon-gl-after.js'),read(out+'/moon-gl-before.js'));
const base=read(out+'/source-before.js');if(restored!==base)throw Error('Source edits outside tidal-forcing scope');
if(source!==read('desktop/web-app/public/stem_lab/stem_tool_astronomy.js'))throw Error('Source mirror drift');
new Function(source);if(read('tests/astronomy_tables_a11y.test.js')!==read(out+'/table-tests-before.js'))throw Error('Existing table tests changed');
const delta=JSON.parse(read(out+'/english-labels.json'));
for(const[path,snapshot]of[['ui_strings.js','main-labels-before.json'],['desktop/web-app/public/ui_strings.js','mirror-labels-before.json']]){
 const current=JSON.parse(read(path)).stem.astronomy,before=JSON.parse(read(out+'/'+snapshot));
 for(const[k,v]of Object.entries(delta))if(current[k]!==v)throw Error('Owned label mismatch '+k);
 for(const[k,v]of Object.entries(before))if(!Object.hasOwn(delta,k)&&current[k]!==v)throw Error('Unrelated label changed '+k);
 for(const k of Object.keys(current))if(!Object.hasOwn(before,k)&&!Object.hasOwn(delta,k))throw Error('Unrelated label inserted '+k);
}
const result={sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),baselineSha256:crypto.createHash('sha256').update(base).digest('hex'),sourceMatchesMirror:true,scopeReconstructsBaseline:true,syntaxValid:true,ownedEnglishLabels:Object.keys(delta).length,unrelatedAstronomyLabelsPreserved:true,existingTableTestsPreserved:true,committed:false};
fs.writeFileSync(out+'/scope-verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
