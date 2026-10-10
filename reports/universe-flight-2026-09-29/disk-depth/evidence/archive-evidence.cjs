const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',stage=__dirname,report=path.join(repo,'reports/universe-flight-2026-09-29/disk-depth');
fs.mkdirSync(path.join(report,'evidence'),{recursive:true});
for(const name of fs.readdirSync(stage)){
 if(!/\.(cjs|mjs|js|json|txt)$/.test(name)||name.startsWith('stop-own-'))continue;
 fs.copyFileSync(path.join(stage,name),path.join(report,'evidence',name));
}
fs.cpSync(path.join(stage,'native-report'),path.join(report,'native'),{recursive:true});
fs.cpSync(path.join(stage,'native-beta-report'),path.join(report,'native-beta'),{recursive:true});
fs.cpSync(path.join(stage,'native-beta-visible-report'),path.join(report,'native-beta-visible'),{recursive:true});
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const entries=[];
function collect(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
 const full=path.join(dir,item.name);if(item.isDirectory())collect(full);else{const bytes=fs.readFileSync(full);entries.push({path:path.relative(report,full).replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)});}
}}
for(const sub of ['evidence','native','native-beta','native-beta-visible','browser','unit','previews','preimages'])collect(path.join(report,sub));
fs.writeFileSync(path.join(report,'evidence-manifest.json'),JSON.stringify({completed:true,files:entries},null,2)+'\n');
console.log(JSON.stringify({completed:true,files:entries.length,pngs:entries.filter(x=>x.path.endsWith('.png')).length}));
