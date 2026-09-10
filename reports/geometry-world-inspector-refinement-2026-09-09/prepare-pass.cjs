const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const source=path.join(__dirname,'../geometry-world-building-tools-2026-09-09/after-source'),target=path.join(__dirname,'before-source');fs.mkdirSync(target,{recursive:true});const hashes={};
for(const name of ['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js']){const bytes=fs.readFileSync(path.join(source,name)),file=path.join(target,name);if(fs.existsSync(file)&&!fs.readFileSync(file).equals(bytes))throw Error('Baseline differs');fs.writeFileSync(file,bytes);hashes[name]=crypto.createHash('sha256').update(bytes).digest('hex');}
fs.writeFileSync(path.join(__dirname,'before-hashes.json'),JSON.stringify(hashes,null,2));console.log(JSON.stringify(hashes));
