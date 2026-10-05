
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),dir='reports/sky-lab-rotation-curves-2026-10-01';
const source=fs.readFileSync('stem_lab/stem_tool_astronomy.js','utf8').replace(/\r\n/g,'\n'),baseline=fs.readFileSync(dir+'/source-before.js','utf8');let restored=source;
for(const file of ['model-insert.js','helper-insert.js']){const text=fs.readFileSync(dir+'/'+file,'utf8');if(!restored.includes(text))throw Error('Missing insert '+file);restored=restored.replace(text,'');}
restored=restored.replace('      galaxyRotationModel: galaxyRotationModel, inflationExpansionModel:','      inflationExpansionModel:').replace("                  sel === 'rotation' ? renderGalaxyRotation() : null,\n",'');
const c=JSON.parse(fs.readFileSync(dir+'/topic-corrections.json','utf8'));function literal(v){return "'"+v.replaceAll('\\','\\\\').replaceAll("'","\\'")+"'";}
for(const[k,v]of Object.entries(c.new)){const fresh="__alloT('stem.astronomy."+k+"', "+literal(v)+")";if(!restored.includes(fresh))throw Error('Missing topic '+k);restored=restored.replace(fresh,"__alloT('stem.astronomy."+k+"', "+literal(c.old[k])+")");}
restored=restored.replace(c.caveat.new,c.caveat.old).replace(c.bar.new,c.bar.old);
if(restored!==baseline){fs.writeFileSync(dir+'/scope-restored.js',restored);throw Error('Source scope mismatch');}
if(source!==fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_astronomy.js','utf8'))throw Error('Mirror mismatch');vm.runInNewContext('new Function('+JSON.stringify(source)+')');
const delta=JSON.parse(fs.readFileSync(dir+'/ui-strings.delta.json','utf8'));for(const file of ['ui_strings.js','desktop/web-app/public/ui_strings.js']){const labels=JSON.parse(fs.readFileSync(file,'utf8')).stem.astronomy;for(const[k,v]of Object.entries(delta))if(labels[k]!==v)throw Error('Label mismatch '+k);}
const report={sourceScopeReconstruction:true,syntaxValid:true,mirrorEqual:true,englishLabelsAddedOrCorrected:Object.keys(delta).length,sourceSHA256:crypto.createHash('sha256').update(source).digest('hex'),baselineSHA256:crypto.createHash('sha256').update(baseline).digest('hex')};fs.writeFileSync(dir+'/build-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
