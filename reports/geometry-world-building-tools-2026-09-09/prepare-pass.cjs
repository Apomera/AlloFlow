const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.join(__dirname,'before-source');fs.mkdirSync(dir,{recursive:true});
const names=['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js'];
const hashes={};for(const name of names){const b=fs.readFileSync('stem_lab/'+name);if(!fs.existsSync(path.join(dir,name)))fs.writeFileSync(path.join(dir,name),b);else if(!b.equals(fs.readFileSync(path.join(dir,name))))throw Error('Baseline already exists with different source');hashes[name]=crypto.createHash('sha256').update(b).digest('hex');}
fs.writeFileSync(path.join(__dirname,'before-hashes.json'),JSON.stringify(hashes,null,2));console.log(JSON.stringify(hashes));
