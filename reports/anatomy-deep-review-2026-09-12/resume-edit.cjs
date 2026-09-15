// Retry transient OneDrive sharing failures without replacing files or changing permissions.
const fs=require('node:fs');const path=require('node:path');
for(const method of ['writeFileSync','copyFileSync']){const original=fs[method].bind(fs);fs[method]=(...args)=>{for(let attempt=0;;attempt++){try{return original(...args);}catch(error){if(error.code!=='UNKNOWN'||attempt>=8)throw error;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,250);}}};}
const file=process.argv[2];let source=fs.readFileSync(file,'utf8');
source=source.replace("if(!s.includes(a))throw Error(file+': missing '+a);", "if(!s.includes(a)){if(s.includes(b))continue;throw Error(file+': missing '+a);}");
source=source.replace("fs.copyFileSync('stem_lab/stem_tool_anatomy.js','desktop/web-app/public/stem_lab/stem_tool_anatomy.js');", "fs.writeFileSync('desktop/web-app/public/stem_lab/stem_tool_anatomy.js',fs.readFileSync('stem_lab/stem_tool_anatomy.js','utf8'));");
new Function('require','__dirname',source)(require,path.dirname(path.resolve(file)));
