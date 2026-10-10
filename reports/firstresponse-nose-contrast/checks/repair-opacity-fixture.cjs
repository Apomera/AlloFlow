const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const work=__dirname,root='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',backup=path.join(work,'fixture-before-opacity-repair');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),changed=['firstresponse-face-preview.spec.ts','check-face-fixture.cjs','prepare-native.cjs'];
const saved=[...changed,'fixture-contract-check.json','browser-fixture-preparation.json'];
if(fs.existsSync(backup))throw Error('Backup exists; refusing overwrite');fs.mkdirSync(backup);
const before={};for(const file of saved){const bytes=fs.readFileSync(path.join(work,file));before[file]=sha(bytes);fs.writeFileSync(path.join(backup,file),bytes);if(!fs.readFileSync(path.join(backup,file)).equals(bytes))throw Error('Backup mismatch '+file);}
function once(s,a,b){if(s.split(a).length!==2)throw Error('Anchor '+a);return s.replace(a,b);}
for(const file of ['firstresponse-face-preview.spec.ts','prepare-native.cjs']){
 let source=fs.readFileSync(path.join(work,file),'utf8');
 source=once(source,"expect(nose.material.userData).toEqual({frNoseContourStrength:{value:1}});","expect(nose.material.userData).toEqual({...value.headMaterial.userData,frNoseContourStrength:{value:1}});");
 source=once(source,"delete clean.name;delete clean.userData;expect(clean).toEqual(value.headMaterial);","delete clean.name;delete clean.userData.frNoseContourStrength;if(!Object.keys(clean.userData).length)delete clean.userData;expect(clean).toEqual(value.headMaterial);");
 fs.writeFileSync(path.join(work,file),source);
}
let check=fs.readFileSync(path.join(work,'check-face-fixture.cjs'),'utf8');
check=once(check,'shininess:12};','shininess:12,userData:{_baseOpacity:1}};');
check=once(check,"contrastBefore.headMaterial={type:'MeshBasicMaterial',color:0xffffff};","contrastBefore.headMaterial={type:'MeshBasicMaterial',color:0xffffff,userData:{_baseOpacity:1}};");
check=once(check,'userData:{frNoseContourStrength:{value:1}}},hooks:','userData:{...contrastAfter.headMaterial.userData,frNoseContourStrength:{value:1}}},hooks:');
check=once(check,"rejected('changed nose diffuse',v=>v.noseMaterial.material.color=0x333333);", "rejected('changed nose diffuse',v=>v.noseMaterial.material.color=0x333333);\nrejected('inherited opacity metadata changed',v=>v.noseMaterial.material.userData._baseOpacity=.5);\nrejected('unrelated nose metadata added',v=>v.noseMaterial.material.userData.unexpected=true);");
fs.writeFileSync(path.join(work,'check-face-fixture.cjs'),check);
const unchangedFiles=['before.js','candidate.js','delta.json','run-face-browser.cjs','playwright-face.config.cjs','face-capture-png.cjs','face-mount-window.cjs'];
const inputs=JSON.parse(fs.readFileSync(path.join(work,'native-infant-contrast/inputs.json'),'utf8')).inputs;
const unchanged={};for(const file of unchangedFiles){const full=path.join(work,file),hash=sha(fs.readFileSync(full));const previous=inputs[full]||inputs[full.replaceAll('\\','/')];if(previous!==hash)throw Error('Unexpected input drift '+file);unchanged[file]=hash;}
for(const file of ['tests/e2e/helpers/stem_gl_harness.ts','vendor/three-r128/three.min.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_firstresponse.js']){const full=path.join(root,file),hash=sha(fs.readFileSync(full));const previous=inputs[full]||inputs[full.replaceAll('\\','/')];if(previous!==hash)throw Error('Unexpected shared input drift '+file);unchanged[file]=hash;}
const after=Object.fromEntries(changed.map(file=>[file,sha(fs.readFileSync(path.join(work,file)))]));
const record={reason:'The viewer adds _baseOpacity to all material userData; the candidate preserves it and adds only frNoseContourStrength.',sourceReference:'stem_lab_module.js:1671-1674',failedRun:'native-infant-contrast',backupDirectory:path.basename(backup),allowedChangedInputs:changed,before,after,unchanged,validationPending:true,browserLaunched:false};
fs.writeFileSync(path.join(work,'fixture-opacity-repair.json'),JSON.stringify(record,null,2));console.log(JSON.stringify(record));
